// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title BullaEscrow
/// @notice Milestone invoice + ERC-20 escrow. UNAUDITED v1.
///
/// Flow: Draft -> Funded -> Submitted -> Released | Refunded, plus two-consent
/// mutual cancel (Cancelled, with a refund to the buyer if funds were held).
///
/// Each invoice stores a `circuitContainerId`: the TapeOut circuit container
/// (ERC-6551 account address, left-padded to bytes32) the seller binds the
/// invoice to. It is a binding and pointer only. This contract never calls
/// TapeOut and does not run any circuit logic.
///
/// The owner can change `feeRecipient` and nothing else. The owner can never
/// move user funds, change the fee rate, or change the token.
contract BullaEscrow is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    enum State {
        None, //       0: invoice does not exist
        Draft, //      1: created by seller, waiting for buyer funds
        Funded, //     2: buyer deposited totalAmount
        Submitted, //  3: seller submitted a delivery hash / URI
        Released, //   4: buyer released, seller paid (minus fee)
        Refunded, //   5: due time passed, buyer reclaimed funds
        Cancelled //   6: both parties consented, buyer refunded if funded
    }

    struct Invoice {
        uint256 id;
        address seller;
        address buyer;
        address token;
        uint256 totalAmount;
        bytes32 deliveryHash;
        string deliveryURI;
        uint64 dueTimestamp;
        uint64 createdAt;
        uint64 fundedAt;
        uint64 submittedAt;
        uint64 closedAt;
        State state;
        bytes32 circuitContainerId;
        bool sellerCancelConsent;
        bool buyerCancelConsent;
        string memo;
    }

    uint16 public constant MAX_FEE_BPS = 1000; // 10% hard cap
    uint16 public constant BPS_DENOMINATOR = 10_000;

    /// @notice The only ERC-20 this escrow accepts. Set once in the constructor.
    IERC20 public immutable token;
    /// @notice Fee in basis points, skimmed only on a successful release.
    uint16 public immutable feeBps;
    /// @notice Receives the release fee. Changeable by the owner.
    address public feeRecipient;

    uint256 public invoiceCount;
    mapping(uint256 => Invoice) private _invoices;

    event InvoiceCreated(
        uint256 indexed id,
        address indexed seller,
        address indexed buyer,
        address token,
        uint256 totalAmount,
        uint64 dueTimestamp,
        bytes32 circuitContainerId,
        bytes32 deliveryHash,
        string memo
    );
    event InvoiceFunded(uint256 indexed id, address indexed buyer, uint256 amount);
    event DeliverySubmitted(uint256 indexed id, address indexed seller, bytes32 deliveryHash, string deliveryURI);
    event FundsReleased(uint256 indexed id, address indexed seller, uint256 netToSeller, uint256 fee);
    event FeePaid(uint256 indexed id, address indexed feeRecipient, uint256 fee);
    event Refunded(uint256 indexed id, address indexed buyer, uint256 amount);
    event CancelConsentGiven(uint256 indexed id, address indexed party);
    event InvoiceCancelled(uint256 indexed id, uint256 refundedToBuyer);
    event FeeRecipientUpdated(address indexed previous, address indexed current);

    error ZeroAddress();
    error FeeTooHigh(uint16 feeBps);
    error UnsupportedToken(address token);
    error InvalidAmount();
    error InvalidBuyer();
    error DueInPast();
    error MissingContainerId();
    error MissingDeliveryHash();
    error InvoiceNotFound(uint256 id);
    error NotSeller();
    error NotBuyer();
    error NotParty();
    error WrongState(State current);
    error PastDue();
    error NotYetDue(uint64 dueTimestamp);
    error AlreadyConsented();

    constructor(address token_, address feeRecipient_, uint16 feeBps_, address initialOwner)
        Ownable(initialOwner)
    {
        if (token_ == address(0) || feeRecipient_ == address(0)) revert ZeroAddress();
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh(feeBps_);
        token = IERC20(token_);
        feeRecipient = feeRecipient_;
        feeBps = feeBps_;
    }

    // ------------------------------------------------------------------
    // Seller actions
    // ------------------------------------------------------------------

    /// @notice Seller creates an invoice in Draft.
    /// @param buyer The only address allowed to fund, release, and claim a refund.
    /// @param token_ Must equal `token()`; passed explicitly so a wrong token fails loudly.
    /// @param totalAmount Amount in token base units.
    /// @param dueTimestamp After this, a Funded/Submitted invoice can be refunded to the buyer.
    /// @param deliveryHash Optional pre-agreed hash (e.g. of the scope). Overwritten on submit.
    /// @param circuitContainerId TapeOut container binding (non-zero).
    /// @param memo Short human-readable description shown on the receipt.
    function createInvoice(
        address buyer,
        address token_,
        uint256 totalAmount,
        uint64 dueTimestamp,
        bytes32 deliveryHash,
        bytes32 circuitContainerId,
        string calldata memo
    ) external returns (uint256 id) {
        if (token_ != address(token)) revert UnsupportedToken(token_);
        if (buyer == address(0) || buyer == msg.sender) revert InvalidBuyer();
        if (totalAmount == 0) revert InvalidAmount();
        if (dueTimestamp <= block.timestamp) revert DueInPast();
        if (circuitContainerId == bytes32(0)) revert MissingContainerId();

        id = ++invoiceCount;
        Invoice storage inv = _invoices[id];
        inv.id = id;
        inv.seller = msg.sender;
        inv.buyer = buyer;
        inv.token = token_;
        inv.totalAmount = totalAmount;
        inv.deliveryHash = deliveryHash;
        inv.dueTimestamp = dueTimestamp;
        inv.createdAt = uint64(block.timestamp);
        inv.state = State.Draft;
        inv.circuitContainerId = circuitContainerId;
        inv.memo = memo;

        emit InvoiceCreated(id, msg.sender, buyer, token_, totalAmount, dueTimestamp, circuitContainerId, deliveryHash, memo);
    }

    /// @notice Seller records the delivery. Allowed while Funded, or again while Submitted (resubmit).
    function submitDelivery(uint256 id, bytes32 deliveryHash, string calldata deliveryURI) external {
        Invoice storage inv = _get(id);
        if (msg.sender != inv.seller) revert NotSeller();
        if (inv.state != State.Funded && inv.state != State.Submitted) revert WrongState(inv.state);
        if (block.timestamp >= inv.dueTimestamp) revert PastDue();
        if (deliveryHash == bytes32(0)) revert MissingDeliveryHash();

        inv.deliveryHash = deliveryHash;
        inv.deliveryURI = deliveryURI;
        inv.submittedAt = uint64(block.timestamp);
        inv.state = State.Submitted;

        emit DeliverySubmitted(id, msg.sender, deliveryHash, deliveryURI);
    }

    // ------------------------------------------------------------------
    // Buyer actions
    // ------------------------------------------------------------------

    /// @notice Buyer deposits `totalAmount` of `token`. Requires a prior `approve`.
    function fundInvoice(uint256 id) external nonReentrant {
        Invoice storage inv = _get(id);
        if (msg.sender != inv.buyer) revert NotBuyer();
        if (inv.state != State.Draft) revert WrongState(inv.state);
        if (block.timestamp >= inv.dueTimestamp) revert PastDue();

        inv.state = State.Funded;
        inv.fundedAt = uint64(block.timestamp);

        uint256 beforeBal = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), inv.totalAmount);
        // Reject fee-on-transfer / short-delivering tokens.
        if (token.balanceOf(address(this)) - beforeBal != inv.totalAmount) revert InvalidAmount();

        emit InvoiceFunded(id, msg.sender, inv.totalAmount);
    }

    /// @notice Buyer releases escrow to the seller, minus the fee. Allowed while Funded or Submitted.
    function releaseFunds(uint256 id) external nonReentrant {
        Invoice storage inv = _get(id);
        if (msg.sender != inv.buyer) revert NotBuyer();
        if (inv.state != State.Funded && inv.state != State.Submitted) revert WrongState(inv.state);

        (uint256 fee, uint256 net) = quoteRelease(inv.totalAmount);
        inv.state = State.Released;
        inv.closedAt = uint64(block.timestamp);
        address recipient = feeRecipient;

        token.safeTransfer(inv.seller, net);
        if (fee > 0) {
            token.safeTransfer(recipient, fee);
            emit FeePaid(id, recipient, fee);
        }
        emit FundsReleased(id, inv.seller, net, fee);
    }

    /// @notice After `dueTimestamp`, the buyer reclaims the full amount if not yet released.
    function claimRefund(uint256 id) external nonReentrant {
        Invoice storage inv = _get(id);
        if (msg.sender != inv.buyer) revert NotBuyer();
        if (inv.state != State.Funded && inv.state != State.Submitted) revert WrongState(inv.state);
        if (block.timestamp < inv.dueTimestamp) revert NotYetDue(inv.dueTimestamp);

        inv.state = State.Refunded;
        inv.closedAt = uint64(block.timestamp);
        token.safeTransfer(inv.buyer, inv.totalAmount);

        emit Refunded(id, inv.buyer, inv.totalAmount);
    }

    // ------------------------------------------------------------------
    // Either party
    // ------------------------------------------------------------------

    /// @notice Record this party's consent to cancel. When both seller and buyer have
    /// consented, the invoice is Cancelled and any held funds go back to the buyer (no fee).
    function mutualCancel(uint256 id) external nonReentrant {
        Invoice storage inv = _get(id);
        State s = inv.state;
        if (s != State.Draft && s != State.Funded && s != State.Submitted) revert WrongState(s);

        if (msg.sender == inv.seller) {
            if (inv.sellerCancelConsent) revert AlreadyConsented();
            inv.sellerCancelConsent = true;
        } else if (msg.sender == inv.buyer) {
            if (inv.buyerCancelConsent) revert AlreadyConsented();
            inv.buyerCancelConsent = true;
        } else {
            revert NotParty();
        }
        emit CancelConsentGiven(id, msg.sender);

        if (inv.sellerCancelConsent && inv.buyerCancelConsent) {
            uint256 refund = s == State.Draft ? 0 : inv.totalAmount;
            inv.state = State.Cancelled;
            inv.closedAt = uint64(block.timestamp);
            if (refund > 0) token.safeTransfer(inv.buyer, refund);
            emit InvoiceCancelled(id, refund);
        }
    }

    // ------------------------------------------------------------------
    // Owner (fee recipient only)
    // ------------------------------------------------------------------

    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        emit FeeRecipientUpdated(feeRecipient, newRecipient);
        feeRecipient = newRecipient;
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    function getInvoice(uint256 id) external view returns (Invoice memory) {
        if (_invoices[id].state == State.None) revert InvoiceNotFound(id);
        return _invoices[id];
    }

    /// @notice fee = amount * feeBps / 10000 (rounded down); net = amount - fee.
    function quoteRelease(uint256 amount) public view returns (uint256 fee, uint256 net) {
        fee = (amount * feeBps) / BPS_DENOMINATOR;
        net = amount - fee;
    }

    function _get(uint256 id) private view returns (Invoice storage inv) {
        inv = _invoices[id];
        if (inv.state == State.None) revert InvoiceNotFound(id);
    }
}
