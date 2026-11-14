// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title BullaEscrow
/// @author Bulla
/// @notice Milestone invoice with ERC-20 escrow. UNAUDITED v1.
/// @dev Flow: Draft -> Funded -> Submitted -> Released | Refunded, plus a two-consent mutual
/// cancel (Cancelled, refunding the buyer if funds were held). States only move forward.
///
/// Each invoice stores a `circuitContainerId`: the TapeOut circuit container (ERC-6551 account
/// address, left-padded to bytes32) the seller binds the invoice to. It is a binding and a
/// pointer only. This contract never calls TapeOut and does not run any circuit logic.
///
/// Trust model: the owner can change `feeRecipient` and nothing else. The owner can never move
/// user funds, change the fee rate, or change the token. Only the invoice's buyer can fund,
/// release, and refund; only its seller can submit; only those two can cancel.
///
/// Accounting invariant: `totalHeld` equals the sum of `totalAmount` over invoices in Funded or
/// Submitted, and `token.balanceOf(this) >= totalHeld` (equality unless someone sends tokens
/// directly to the contract, which are then stuck: there is no sweep function by design).
/// @custom:security-contact see docs/HANDOFF.md
contract BullaEscrow is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @notice Invoice lifecycle. Numeric order is the forward direction.
    enum State {
        None, //       0: invoice does not exist
        Draft, //      1: created by seller, waiting for buyer funds
        Funded, //     2: buyer deposited totalAmount
        Submitted, //  3: seller submitted a delivery hash / URI
        Released, //   4: buyer released, seller paid (minus fee)
        Refunded, //   5: due time passed, buyer reclaimed funds
        Cancelled //   6: both parties consented, buyer refunded if funded
    }

    /// @notice One milestone invoice.
    /// @param id Sequential id, starting at 1.
    /// @param seller Creator; receives the release; the only one who can submit.
    /// @param buyer The only one who can fund, release, and refund.
    /// @param token Escrow token (always equals `token()`).
    /// @param totalAmount Amount in token base units.
    /// @param deliveryHash Optional pre-agreed hash at creation; the delivery hash after submit.
    /// @param deliveryURI Optional link to the delivery, set on submit.
    /// @param dueTimestamp Funding and submitting stop here; refunds open here.
    /// @param createdAt Creation time.
    /// @param fundedAt Funding time (0 if never funded).
    /// @param submittedAt Latest submission time (0 if none).
    /// @param closedAt Release, refund, or cancel time (0 while open).
    /// @param state Current state.
    /// @param circuitContainerId TapeOut container binding (non-zero).
    /// @param sellerCancelConsent Seller asked to cancel.
    /// @param buyerCancelConsent Buyer asked to cancel.
    /// @param memo Short description shown on the public receipt.
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

    /// @notice Hard cap on `feeBps` (10%).
    uint16 public constant MAX_FEE_BPS = 1000;
    /// @notice Basis-point denominator.
    uint16 public constant BPS_DENOMINATOR = 10_000;

    /// @notice The only ERC-20 this escrow accepts. Set once in the constructor.
    IERC20 public immutable token;
    /// @notice Fee in basis points, skimmed only on a successful release.
    uint16 public immutable feeBps;
    /// @notice Receives the release fee. Changeable by the owner.
    address public feeRecipient;
    /// @notice Number of invoices created; also the latest id.
    uint256 public invoiceCount;
    /// @notice Sum of `totalAmount` over invoices currently Funded or Submitted.
    uint256 public totalHeld;

    mapping(uint256 => Invoice) private _invoices;

    /// @notice Emitted once at deployment with the immutable configuration.
    event EscrowConfigured(address indexed token, address indexed feeRecipient, uint16 feeBps, address indexed owner);
    /// @notice A seller created an invoice (state Draft).
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
    /// @notice The buyer deposited `amount` (state Funded).
    event InvoiceFunded(uint256 indexed id, address indexed buyer, uint256 amount);
    /// @notice The seller recorded a delivery (state Submitted). May repeat to update it.
    event DeliverySubmitted(uint256 indexed id, address indexed seller, bytes32 deliveryHash, string deliveryURI);
    /// @notice The buyer released; the seller received `netToSeller` (state Released).
    event FundsReleased(uint256 indexed id, address indexed seller, uint256 netToSeller, uint256 fee);
    /// @notice The release fee was paid. Only emitted when `fee > 0`.
    event FeePaid(uint256 indexed id, address indexed feeRecipient, uint256 fee);
    /// @notice The buyer reclaimed `amount` after the due date (state Refunded).
    event Refunded(uint256 indexed id, address indexed buyer, uint256 amount);
    /// @notice `party` consented to cancel. Cancels when both parties have.
    event CancelConsentGiven(uint256 indexed id, address indexed party);
    /// @notice Both parties consented; `refundedToBuyer` was returned (state Cancelled).
    event InvoiceCancelled(uint256 indexed id, uint256 refundedToBuyer);
    /// @notice The owner changed the fee recipient.
    event FeeRecipientUpdated(address indexed previous, address indexed current);

    /// @notice A required address was zero.
    error ZeroAddress();
    /// @notice Constructor fee above `MAX_FEE_BPS`.
    error FeeTooHigh(uint16 feeBps);
    /// @notice `createInvoice` was given a token other than `token()`.
    error UnsupportedToken(address token);
    /// @notice Invoice amount was zero.
    error InvalidAmount();
    /// @notice The escrow received less than requested (fee-on-transfer or rebasing token).
    error TransferShortfall(uint256 expected, uint256 received);
    /// @notice Buyer was zero or equal to the seller.
    error InvalidBuyer();
    /// @notice Due timestamp not in the future.
    error DueInPast();
    /// @notice `circuitContainerId` was zero.
    error MissingContainerId();
    /// @notice Submitted delivery hash was zero.
    error MissingDeliveryHash();
    /// @notice No invoice with this id.
    error InvoiceNotFound(uint256 id);
    /// @notice Caller is not the invoice's seller.
    error NotSeller();
    /// @notice Caller is not the invoice's buyer.
    error NotBuyer();
    /// @notice Caller is neither seller nor buyer.
    error NotParty();
    /// @notice The action is not allowed in the invoice's current state.
    error WrongState(State current);
    /// @notice The due date has passed (fund / submit).
    error PastDue();
    /// @notice The refund time-lock has not passed yet.
    error NotYetDue(uint64 dueTimestamp);
    /// @notice This party already consented to cancel.
    error AlreadyConsented();

    /// @param token_ The escrow ERC-20 (e.g. USDC on X Layer). Immutable.
    /// @param feeRecipient_ Initial fee recipient.
    /// @param feeBps_ Fee in basis points, at most `MAX_FEE_BPS`. Immutable.
    /// @param initialOwner Owner, whose only power is `setFeeRecipient`.
    constructor(address token_, address feeRecipient_, uint16 feeBps_, address initialOwner) Ownable(initialOwner) {
        if (token_ == address(0) || feeRecipient_ == address(0)) revert ZeroAddress();
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh(feeBps_);
        token = IERC20(token_);
        feeRecipient = feeRecipient_;
        feeBps = feeBps_;
        emit EscrowConfigured(token_, feeRecipient_, feeBps_, initialOwner);
    }

    // ------------------------------------------------------------------
    // Seller actions
    // ------------------------------------------------------------------

    /// @notice Seller creates an invoice in Draft.
    /// @param buyer The only address allowed to fund, release, and claim a refund.
    /// @param token_ Must equal `token()`; passed explicitly so a wrong token fails loudly.
    /// @param totalAmount Amount in token base units (> 0).
    /// @param dueTimestamp After this, a Funded/Submitted invoice can be refunded to the buyer.
    /// @param deliveryHash Optional pre-agreed hash (e.g. of the scope). Overwritten on submit.
    /// @param circuitContainerId TapeOut container binding (non-zero).
    /// @param memo Short human-readable description shown on the receipt.
    /// @return id The new invoice id.
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

    /// @notice Seller records the delivery. Allowed while Funded, or again while Submitted (update).
    /// @param id Invoice id.
    /// @param deliveryHash Non-zero hash of the delivered work.
    /// @param deliveryURI Optional link (ipfs://, https://, tape://).
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

    /// @notice Buyer deposits `totalAmount` of `token`. Requires a prior `approve` to this contract.
    /// @param id Invoice id (must be Draft and not past due).
    function fundInvoice(uint256 id) external nonReentrant {
        Invoice storage inv = _get(id);
        if (msg.sender != inv.buyer) revert NotBuyer();
        if (inv.state != State.Draft) revert WrongState(inv.state);
        if (block.timestamp >= inv.dueTimestamp) revert PastDue();

        uint256 amount = inv.totalAmount;
        inv.state = State.Funded;
        inv.fundedAt = uint64(block.timestamp);
        totalHeld += amount;

        uint256 beforeBal = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = token.balanceOf(address(this)) - beforeBal;
        if (received != amount) revert TransferShortfall(amount, received);

        emit InvoiceFunded(id, msg.sender, amount);
    }

    /// @notice Buyer releases escrow to the seller, minus the fee. Allowed while Funded or Submitted.
    /// @param id Invoice id.
    function releaseFunds(uint256 id) external nonReentrant {
        Invoice storage inv = _get(id);
        if (msg.sender != inv.buyer) revert NotBuyer();
        if (inv.state != State.Funded && inv.state != State.Submitted) revert WrongState(inv.state);

        uint256 amount = inv.totalAmount;
        (uint256 fee, uint256 net) = quoteRelease(amount);
        inv.state = State.Released;
        inv.closedAt = uint64(block.timestamp);
        totalHeld -= amount;
        address recipient = feeRecipient;

        token.safeTransfer(inv.seller, net);
        if (fee > 0) {
            token.safeTransfer(recipient, fee);
            emit FeePaid(id, recipient, fee);
        }
        emit FundsReleased(id, inv.seller, net, fee);
    }

    /// @notice After `dueTimestamp`, the buyer reclaims the full amount if not yet released.
    /// @param id Invoice id (Funded or Submitted).
    function claimRefund(uint256 id) external nonReentrant {
        Invoice storage inv = _get(id);
        if (msg.sender != inv.buyer) revert NotBuyer();
        if (inv.state != State.Funded && inv.state != State.Submitted) revert WrongState(inv.state);
        if (block.timestamp < inv.dueTimestamp) revert NotYetDue(inv.dueTimestamp);

        uint256 amount = inv.totalAmount;
        inv.state = State.Refunded;
        inv.closedAt = uint64(block.timestamp);
        totalHeld -= amount;
        token.safeTransfer(inv.buyer, amount);

        emit Refunded(id, inv.buyer, amount);
    }

    // ------------------------------------------------------------------
    // Either party
    // ------------------------------------------------------------------

    /// @notice Record this party's consent to cancel. When both seller and buyer have consented,
    /// the invoice is Cancelled and any held funds go back to the buyer (no fee).
    /// @param id Invoice id (Draft, Funded, or Submitted).
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
            if (refund > 0) {
                totalHeld -= refund;
                token.safeTransfer(inv.buyer, refund);
            }
            emit InvoiceCancelled(id, refund);
        }
    }

    // ------------------------------------------------------------------
    // Owner (fee recipient only)
    // ------------------------------------------------------------------

    /// @notice Change where release fees go. The owner's only power.
    /// @param newRecipient Non-zero address.
    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        emit FeeRecipientUpdated(feeRecipient, newRecipient);
        feeRecipient = newRecipient;
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    /// @notice Full invoice record.
    /// @param id Invoice id.
    /// @return The invoice. Reverts with `InvoiceNotFound` for unknown ids.
    function getInvoice(uint256 id) external view returns (Invoice memory) {
        return _get(id);
    }

    /// @notice Fee split for an amount: `fee = amount * feeBps / 10000` (rounded down), `net = amount - fee`.
    /// @dev Uses `Math.mulDiv`, so it cannot overflow for any uint256 amount; `fee <= amount * feeBps / 10000` always.
    /// @param amount Amount in token base units.
    /// @return fee Amount to the fee recipient.
    /// @return net Amount to the seller.
    function quoteRelease(uint256 amount) public view returns (uint256 fee, uint256 net) {
        fee = Math.mulDiv(amount, feeBps, BPS_DENOMINATOR);
        net = amount - fee;
    }

    /// @dev Ids are sequential from 1, so existence is a range check (no enum equality; see docs/slither.md).
    function _get(uint256 id) private view returns (Invoice storage inv) {
        if (id == 0 || id > invoiceCount) revert InvoiceNotFound(id);
        inv = _invoices[id];
    }
}
