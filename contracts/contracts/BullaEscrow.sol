// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @notice TapeOut processor (circuit NFT, ERC-721). TapeKit SPEC Appendix B.3.
interface ITapeOutProcessor {
    function ownerOf(uint256 tokenId) external view returns (address);
}

/// @notice TapeOut container opener. TapeKit SPEC Appendix B.2.
interface ITapeOutOpener {
    function accountOf(address circuits, uint256 tokenId) external view returns (address);
    function isOpened(address circuits, uint256 tokenId) external view returns (bool);
}

/// @notice TapeOut processor factory. TapeKit SPEC Appendix B.1.
interface ITapeOutFactory {
    function isCPU(address processor) external view returns (bool);
}

/// @title BullaEscrow v2
/// @author Bulla
/// @notice Milestone invoices with ERC-20 escrow, bound on chain to the seller's TapeOut circuit. UNAUDITED.
/// @dev Invoice states: Draft -> Funded -> Completed | Refunded | Cancelled (forward only).
/// Milestone states: Pending -> Submitted -> Released | Refunded (forward only; Pending -> Released and
/// Pending -> Refunded are allowed for early release, time-lock refund and cancel).
///
/// Circuit binding: the seller names a TapeOut processor and circuit id. `createInvoice` requires the
/// processor to be a TapeOut processor (`factory.isCPU`) and the caller to hold the circuit
/// (`processor.ownerOf`). The circuit's container (ERC-6551 account) is computed with
/// `opener.accountOf` and stored.
///
/// Payout rule (each release, re-checked live):
///  - `payToContainer == true` AND the container is opened (`opener.isOpened`): pay the circuit's container.
///    The container follows the circuit, so whoever holds the circuit controls the funds. An opened X Layer
///    container moves ERC-20 out with ERC-6551 `execute(to, value, data, 0)` plus `EXEC_FEE()` as msg.value
///    (docs/research.md section 9). An unopened container reverts `execute` with `NotPaid()`, so while the
///    container is not opened the release falls back to the rule below.
///  - otherwise: pay the current circuit holder (`ownerOf`). That is the seller unless the circuit NFT has
///    moved, in which case the receivable travels with the circuit to its new holder. If `ownerOf` reverts
///    or returns zero (burned circuit), pay the original seller.
///
/// Trust model: the owner can change `feeRecipient` and nothing else. Only the buyer funds, releases and
/// claims the time-lock refund; only the seller submits; the optional arbiter (proposed by the seller,
/// accepted by the buyer at funding) can release or refund a submitted milestone; only seller and buyer
/// cancel. The arbiter takes no fee. No sweep function.
///
/// Accounting invariant: `totalHeld` equals the sum of unresolved milestone amounts over Funded invoices,
/// and `token.balanceOf(this) >= totalHeld`.
contract BullaEscrow is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @notice Invoice lifecycle. Numeric order is the forward direction.
    enum State {
        None, //       0: invoice does not exist
        Draft, //      1: created by seller, waiting for buyer funds
        Funded, //     2: buyer deposited the full amount; milestones in progress
        Completed, //  3: every milestone resolved by release (or arbiter refund)
        Refunded, //   4: due time passed; buyer reclaimed every unresolved milestone
        Cancelled //   5: both parties consented; unresolved remainder refunded if funded
    }

    /// @notice Milestone lifecycle.
    enum MilestoneState {
        Pending, //   0: funded or not, awaiting delivery
        Submitted, // 1: seller recorded a delivery
        Released, //  2: paid out (minus fee)
        Refunded //   3: returned to the buyer (time-lock, cancel, or arbiter)
    }

    /// @notice One milestone of an invoice.
    struct Milestone {
        uint256 amount;
        MilestoneState state;
        bytes32 deliveryHash;
        string deliveryURI;
        string label;
        uint64 submittedAt;
        uint64 closedAt;
        address paidTo;
    }

    /// @notice One invoice. Milestones are read with `getMilestones`.
    struct Invoice {
        uint256 id;
        address seller;
        address buyer;
        address token;
        address arbiter;
        address processor;
        uint256 circuitId;
        address container;
        bool payToContainer;
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 refundedAmount;
        uint8 milestoneCount;
        uint64 dueTimestamp;
        uint64 createdAt;
        uint64 fundedAt;
        uint64 closedAt;
        State state;
        bool sellerCancelConsent;
        bool buyerCancelConsent;
        bytes32 termsHash;
        string memo;
    }

    /// @notice On-chain activity of one TapeOut circuit on this escrow (no event scan needed). Only funded
    /// invoices count: unfunded drafts are excluded. Not a reputation score: a seller can bill a wallet they control.
    struct CircuitStats {
        uint64 fundedInvoices;
        uint64 releasedMilestones;
        uint64 refundedMilestones;
        uint256 releasedAmount;
    }

    /// @notice Arguments for `createInvoice` (a struct keeps the call readable and the stack shallow).
    /// @param buyer The only address allowed to fund, release and claim the time-lock refund.
    /// @param token Must equal `token()`.
    /// @param amounts Milestone amounts (1 to 10, each > 0).
    /// @param labels Milestone labels (same length as `amounts`, each at most 80 bytes).
    /// @param dueTimestamp Funding and submitting stop here; the time-lock refund opens here.
    /// @param processor TapeOut processor (circuit NFT contract) holding the seller's circuit.
    /// @param circuitId The seller's circuit #ID on that processor.
    /// @param payToContainer True: releases pay the circuit's container once it is opened (until then, the
    /// circuit holder). False: the circuit holder.
    /// @param arbiter Optional arbiter (zero for none); may not be the buyer or the seller.
    /// @param termsHash Optional hash of the agreed scope.
    /// @param memo Short description shown on the public receipt.
    struct CreateParams {
        address buyer;
        address token;
        uint256[] amounts;
        string[] labels;
        uint64 dueTimestamp;
        address processor;
        uint256 circuitId;
        bool payToContainer;
        address arbiter;
        bytes32 termsHash;
        string memo;
    }

    /// @notice Hard cap on `feeBps` (10%).
    uint16 public constant MAX_FEE_BPS = 1000;
    /// @notice Basis-point denominator.
    uint16 public constant BPS_DENOMINATOR = 10_000;
    /// @notice Most milestones per invoice.
    uint8 public constant MAX_MILESTONES = 10;
    /// @notice Longest milestone label, in bytes.
    uint256 public constant MAX_LABEL_BYTES = 80;

    /// @notice The only ERC-20 this escrow accepts.
    IERC20 public immutable token;
    /// @notice TapeOut container opener (X Layer mainnet: 0x536adD8F30f03b69f6fbF29d425A816A0dC50106).
    ITapeOutOpener public immutable opener;
    /// @notice TapeOut processor factory (X Layer mainnet: 0x1f09DAeFA827f02CBb40967cc91b259763760761).
    ITapeOutFactory public immutable factory;
    /// @notice Fee in basis points, skimmed from each successful milestone release.
    uint16 public immutable feeBps;
    /// @notice Receives release fees. Changeable by the owner.
    address public feeRecipient;
    /// @notice Number of invoices created; also the latest id.
    uint256 public invoiceCount;
    /// @notice Sum of unresolved milestone amounts over Funded invoices.
    uint256 public totalHeld;

    mapping(uint256 => Invoice) private _invoices;
    mapping(uint256 => mapping(uint256 => Milestone)) private _milestones;
    mapping(address => mapping(uint256 => CircuitStats)) private _circuitStats;

    /// @notice Emitted once at deployment with the immutable configuration.
    event EscrowConfigured(address indexed token, address indexed opener, address indexed factory, address feeRecipient, uint16 feeBps, address owner);
    /// @notice A seller created an invoice (state Draft).
    event InvoiceCreated(uint256 indexed id, address indexed seller, address indexed buyer, address token, uint256 totalAmount, uint8 milestoneCount, uint64 dueTimestamp, bytes32 termsHash, string memo);
    /// @notice The invoice is bound to a TapeOut circuit and its container.
    event CircuitBound(uint256 indexed id, address indexed processor, uint256 indexed circuitId, address container, bool payToContainer);
    /// @notice One milestone definition.
    event MilestoneDefined(uint256 indexed id, uint256 indexed index, uint256 amount, string label);
    /// @notice The seller proposed an arbiter (zero = none).
    event ArbiterProposed(uint256 indexed id, address indexed arbiter);
    /// @notice The buyer funded the full amount and accepted `arbiter` (state Funded).
    event InvoiceFunded(uint256 indexed id, address indexed buyer, uint256 amount, address arbiter);
    /// @notice The seller recorded a delivery for a milestone. May repeat to update it.
    event MilestoneSubmitted(uint256 indexed id, uint256 indexed index, bytes32 deliveryHash, string deliveryURI);
    /// @notice A milestone was paid out to `paidTo` (container or circuit holder), net of `fee`.
    event MilestoneReleased(uint256 indexed id, uint256 indexed index, address indexed paidTo, uint256 net, uint256 fee, address by);
    /// @notice A release fee was paid. Only emitted when `fee > 0`.
    event FeePaid(uint256 indexed id, uint256 indexed index, address indexed feeRecipient, uint256 fee);
    /// @notice A milestone was returned to the buyer.
    event MilestoneRefunded(uint256 indexed id, uint256 indexed index, uint256 amount, address by);
    /// @notice Every milestone is resolved (state Completed).
    event InvoiceCompleted(uint256 indexed id, uint256 releasedAmount, uint256 refundedAmount);
    /// @notice After the due date the buyer reclaimed `amount` of unresolved milestones (state Refunded).
    event Refunded(uint256 indexed id, address indexed buyer, uint256 amount);
    /// @notice `party` consented to cancel.
    event CancelConsentGiven(uint256 indexed id, address indexed party);
    /// @notice `party`'s cancel consent was withdrawn: by that party, or cleared when the invoice was funded.
    event CancelConsentRevoked(uint256 indexed id, address indexed party);
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
    /// @notice A milestone amount was zero.
    error InvalidAmount();
    /// @notice The escrow received less than requested (fee-on-transfer or rebasing token).
    error TransferShortfall(uint256 expected, uint256 received);
    /// @notice Buyer was zero or equal to the seller.
    error InvalidBuyer();
    /// @notice Arbiter was the buyer or the seller.
    error InvalidArbiter();
    /// @notice Due timestamp not in the future.
    error DueInPast();
    /// @notice Milestone count outside 1..10 or labels length mismatch.
    error InvalidMilestones();
    /// @notice A milestone label is longer than `MAX_LABEL_BYTES`.
    error LabelTooLong(uint256 index);
    /// @notice The processor is not a TapeOut processor (`factory.isCPU` returned false).
    error NotTapeOutProcessor(address processor);
    /// @notice The caller does not hold the circuit.
    error NotCircuitHolder(address processor, uint256 circuitId, address holder);
    /// @notice Submitted delivery hash was zero.
    error MissingDeliveryHash();
    /// @notice No invoice with this id.
    error InvoiceNotFound(uint256 id);
    /// @notice No milestone with this index.
    error MilestoneNotFound(uint256 id, uint256 index);
    /// @notice Caller is not the invoice's seller.
    error NotSeller();
    /// @notice Caller is not the invoice's buyer.
    error NotBuyer();
    /// @notice Caller is not the invoice's arbiter.
    error NotArbiter();
    /// @notice Caller is neither seller nor buyer.
    error NotParty();
    /// @notice The buyer funded with a different arbiter than the one proposed.
    error ArbiterMismatch(address proposed, address accepted);
    /// @notice The invoice is not in a state that allows this action.
    error WrongState(State current);
    /// @notice The milestone is not in a state that allows this action.
    error WrongMilestoneState(MilestoneState current);
    /// @notice The due date has passed (fund / submit).
    error PastDue();
    /// @notice The refund time-lock has not passed yet.
    error NotYetDue(uint64 dueTimestamp);
    /// @notice This party already consented to cancel.
    error AlreadyConsented();
    /// @notice This party has no cancel consent to revoke.
    error NoConsentToRevoke();

    /// @param token_ The escrow ERC-20 (USDC on X Layer mainnet). Immutable.
    /// @param opener_ TapeOut container opener. Immutable.
    /// @param factory_ TapeOut processor factory. Immutable.
    /// @param feeRecipient_ Initial fee recipient.
    /// @param feeBps_ Fee in basis points, at most `MAX_FEE_BPS`. Immutable.
    /// @param initialOwner Owner, whose only power is `setFeeRecipient`.
    constructor(address token_, address opener_, address factory_, address feeRecipient_, uint16 feeBps_, address initialOwner) Ownable(initialOwner) {
        if (token_ == address(0) || opener_ == address(0) || factory_ == address(0) || feeRecipient_ == address(0)) revert ZeroAddress();
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh(feeBps_);
        token = IERC20(token_);
        opener = ITapeOutOpener(opener_);
        factory = ITapeOutFactory(factory_);
        feeRecipient = feeRecipient_;
        feeBps = feeBps_;
        emit EscrowConfigured(token_, opener_, factory_, feeRecipient_, feeBps_, initialOwner);
    }

    // ------------------------------------------------------------------
    // Seller
    // ------------------------------------------------------------------

    /// @notice Seller creates a milestone invoice bound to a TapeOut circuit they hold (state Draft).
    /// @param p See `CreateParams`.
    /// @return id The new invoice id.
    function createInvoice(CreateParams calldata p) external returns (uint256 id) {
        if (p.token != address(token)) revert UnsupportedToken(p.token);
        if (p.buyer == address(0) || p.buyer == msg.sender) revert InvalidBuyer();
        if (p.arbiter != address(0) && (p.arbiter == msg.sender || p.arbiter == p.buyer)) revert InvalidArbiter();
        if (p.dueTimestamp <= block.timestamp) revert DueInPast();
        uint256 n = p.amounts.length;
        if (n == 0 || n > MAX_MILESTONES || p.labels.length != n) revert InvalidMilestones();
        if (!factory.isCPU(p.processor)) revert NotTapeOutProcessor(p.processor);
        address holder = ITapeOutProcessor(p.processor).ownerOf(p.circuitId);
        if (holder != msg.sender) revert NotCircuitHolder(p.processor, p.circuitId, holder);
        address container = opener.accountOf(p.processor, p.circuitId);
        if (container == address(0)) revert ZeroAddress();

        id = ++invoiceCount;
        uint256 total = 0;
        for (uint256 i = 0; i < n; ++i) {
            uint256 a = p.amounts[i];
            if (a == 0) revert InvalidAmount();
            if (bytes(p.labels[i]).length > MAX_LABEL_BYTES) revert LabelTooLong(i);
            total += a;
            Milestone storage m = _milestones[id][i];
            m.amount = a;
            m.label = p.labels[i];
            emit MilestoneDefined(id, i, a, p.labels[i]);
        }

        Invoice storage inv = _invoices[id];
        inv.id = id;
        inv.seller = msg.sender;
        inv.buyer = p.buyer;
        inv.token = p.token;
        inv.arbiter = p.arbiter;
        inv.processor = p.processor;
        inv.circuitId = p.circuitId;
        inv.container = container;
        inv.payToContainer = p.payToContainer;
        inv.totalAmount = total;
        inv.milestoneCount = uint8(n);
        inv.dueTimestamp = p.dueTimestamp;
        inv.createdAt = uint64(block.timestamp);
        inv.state = State.Draft;
        inv.termsHash = p.termsHash;
        inv.memo = p.memo;

        emit InvoiceCreated(id, msg.sender, p.buyer, p.token, total, uint8(n), p.dueTimestamp, p.termsHash, p.memo);
        emit CircuitBound(id, p.processor, p.circuitId, container, p.payToContainer);
        emit ArbiterProposed(id, p.arbiter);
    }

    /// @notice Seller records the delivery for one milestone (Pending or Submitted, before the due date).
    /// @param id Invoice id.
    /// @param index Milestone index.
    /// @param deliveryHash Non-zero hash of the delivered work.
    /// @param deliveryURI Optional link (ipfs://, https://, tape://).
    function submitMilestone(uint256 id, uint256 index, bytes32 deliveryHash, string calldata deliveryURI) external {
        Invoice storage inv = _get(id);
        if (msg.sender != inv.seller) revert NotSeller();
        if (inv.state != State.Funded) revert WrongState(inv.state);
        if (block.timestamp >= inv.dueTimestamp) revert PastDue();
        if (deliveryHash == bytes32(0)) revert MissingDeliveryHash();
        Milestone storage m = _milestone(inv, index);
        if (m.state != MilestoneState.Pending && m.state != MilestoneState.Submitted) revert WrongMilestoneState(m.state);

        m.deliveryHash = deliveryHash;
        m.deliveryURI = deliveryURI;
        m.submittedAt = uint64(block.timestamp);
        m.state = MilestoneState.Submitted;
        emit MilestoneSubmitted(id, index, deliveryHash, deliveryURI);
    }

    // ------------------------------------------------------------------
    // Buyer
    // ------------------------------------------------------------------

    /// @notice Buyer deposits the full invoice amount and accepts the proposed arbiter. Requires `approve`.
    /// @param id Invoice id (Draft, before the due date).
    /// @param acceptedArbiter Must equal the proposed arbiter (zero if none): explicit acceptance.
    function fundInvoice(uint256 id, address acceptedArbiter) external nonReentrant {
        Invoice storage inv = _get(id);
        if (msg.sender != inv.buyer) revert NotBuyer();
        if (inv.state != State.Draft) revert WrongState(inv.state);
        if (block.timestamp >= inv.dueTimestamp) revert PastDue();
        if (acceptedArbiter != inv.arbiter) revert ArbiterMismatch(inv.arbiter, acceptedArbiter);

        uint256 amount = inv.totalAmount;
        inv.state = State.Funded;
        inv.fundedAt = uint64(block.timestamp);
        totalHeld += amount;
        _circuitStats[inv.processor][inv.circuitId].fundedInvoices += 1;
        // Consent given on the draft does not carry over to the funded invoice: otherwise one party could
        // later cancel alone and claw back delivered (submitted) milestones.
        if (inv.sellerCancelConsent) {
            inv.sellerCancelConsent = false;
            emit CancelConsentRevoked(id, inv.seller);
        }
        if (inv.buyerCancelConsent) {
            inv.buyerCancelConsent = false;
            emit CancelConsentRevoked(id, inv.buyer);
        }

        uint256 beforeBal = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = token.balanceOf(address(this)) - beforeBal;
        if (received != amount) revert TransferShortfall(amount, received);

        emit InvoiceFunded(id, msg.sender, amount, inv.arbiter);
    }

    /// @notice Buyer releases one milestone (Pending or Submitted) to the payout target, minus the fee.
    /// @param id Invoice id (Funded).
    /// @param index Milestone index.
    function releaseMilestone(uint256 id, uint256 index) external nonReentrant {
        Invoice storage inv = _get(id);
        if (msg.sender != inv.buyer) revert NotBuyer();
        if (inv.state != State.Funded) revert WrongState(inv.state);
        Milestone storage m = _milestone(inv, index);
        if (m.state != MilestoneState.Pending && m.state != MilestoneState.Submitted) revert WrongMilestoneState(m.state);
        _release(inv, m, index);
    }

    /// @notice After `dueTimestamp`, the buyer reclaims every unresolved milestone (state Refunded).
    /// @param id Invoice id (Funded).
    function claimRefund(uint256 id) external nonReentrant {
        Invoice storage inv = _get(id);
        if (msg.sender != inv.buyer) revert NotBuyer();
        if (inv.state != State.Funded) revert WrongState(inv.state);
        if (block.timestamp < inv.dueTimestamp) revert NotYetDue(inv.dueTimestamp);

        uint256 amount = _refundUnresolved(inv);
        inv.state = State.Refunded;
        inv.closedAt = uint64(block.timestamp);
        if (amount > 0) token.safeTransfer(inv.buyer, amount);
        emit Refunded(id, inv.buyer, amount);
    }

    // ------------------------------------------------------------------
    // Arbiter
    // ------------------------------------------------------------------

    /// @notice Arbiter releases a submitted milestone to the payout target (fee applies; no arbiter fee).
    /// @param id Invoice id (Funded).
    /// @param index Milestone index (Submitted).
    function arbiterRelease(uint256 id, uint256 index) external nonReentrant {
        Invoice storage inv = _get(id);
        if (inv.arbiter == address(0) || msg.sender != inv.arbiter) revert NotArbiter();
        if (inv.state != State.Funded) revert WrongState(inv.state);
        Milestone storage m = _milestone(inv, index);
        if (m.state != MilestoneState.Submitted) revert WrongMilestoneState(m.state);
        _release(inv, m, index);
    }

    /// @notice Arbiter refunds a submitted milestone to the buyer (no fee).
    /// @param id Invoice id (Funded).
    /// @param index Milestone index (Submitted).
    function arbiterRefund(uint256 id, uint256 index) external nonReentrant {
        Invoice storage inv = _get(id);
        if (inv.arbiter == address(0) || msg.sender != inv.arbiter) revert NotArbiter();
        if (inv.state != State.Funded) revert WrongState(inv.state);
        Milestone storage m = _milestone(inv, index);
        if (m.state != MilestoneState.Submitted) revert WrongMilestoneState(m.state);

        uint256 amount = m.amount;
        m.state = MilestoneState.Refunded;
        m.closedAt = uint64(block.timestamp);
        inv.refundedAmount += amount;
        totalHeld -= amount;
        _circuitStats[inv.processor][inv.circuitId].refundedMilestones += 1;
        _maybeComplete(inv);
        token.safeTransfer(inv.buyer, amount);
        emit MilestoneRefunded(id, index, amount, msg.sender);
    }

    // ------------------------------------------------------------------
    // Either party
    // ------------------------------------------------------------------

    /// @notice Record this party's consent to cancel. With both consents the invoice is Cancelled and any
    /// unresolved remainder goes back to the buyer (no fee). Released milestones stay paid.
    /// @param id Invoice id (Draft or Funded).
    function mutualCancel(uint256 id) external nonReentrant {
        Invoice storage inv = _get(id);
        State s = inv.state;
        if (s != State.Draft && s != State.Funded) revert WrongState(s);

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
            uint256 refund = s == State.Funded ? _refundUnresolved(inv) : 0;
            inv.state = State.Cancelled;
            inv.closedAt = uint64(block.timestamp);
            if (refund > 0) token.safeTransfer(inv.buyer, refund);
            emit InvoiceCancelled(id, refund);
        }
    }

    /// @notice Withdraw this party's cancel consent while the invoice is still open (Draft or Funded).
    /// @param id Invoice id.
    function revokeCancelConsent(uint256 id) external {
        Invoice storage inv = _get(id);
        State s = inv.state;
        if (s != State.Draft && s != State.Funded) revert WrongState(s);
        if (msg.sender == inv.seller) {
            if (!inv.sellerCancelConsent) revert NoConsentToRevoke();
            inv.sellerCancelConsent = false;
        } else if (msg.sender == inv.buyer) {
            if (!inv.buyerCancelConsent) revert NoConsentToRevoke();
            inv.buyerCancelConsent = false;
        } else {
            revert NotParty();
        }
        emit CancelConsentRevoked(id, msg.sender);
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

    /// @notice Full invoice record. Reverts with `InvoiceNotFound` for unknown ids.
    function getInvoice(uint256 id) external view returns (Invoice memory) {
        return _get(id);
    }

    /// @notice All milestones of an invoice, in order.
    function getMilestones(uint256 id) external view returns (Milestone[] memory ms) {
        Invoice storage inv = _get(id);
        ms = new Milestone[](inv.milestoneCount);
        for (uint256 i = 0; i < inv.milestoneCount; ++i) ms[i] = _milestones[id][i];
    }

    /// @notice Where the next release of this invoice would be paid (see the payout rule above).
    function payoutTarget(uint256 id) external view returns (address) {
        return _payee(_get(id));
    }

    /// @notice Whether this invoice's container is opened right now (false if the opener reverts).
    function containerOpened(uint256 id) external view returns (bool) {
        return _containerOpened(_get(id));
    }

    /// @notice On-chain activity of a TapeOut circuit on this escrow: funded invoices, milestones released and
    /// refunded, and gross amount released. Unfunded drafts are not counted. Not a reputation score.
    function circuitStats(address processor, uint256 circuitId) external view returns (CircuitStats memory) {
        return _circuitStats[processor][circuitId];
    }

    /// @notice Fee split: `fee = amount * feeBps / 10000` (rounded down via `Math.mulDiv`), `net = amount - fee`.
    function quoteRelease(uint256 amount) public view returns (uint256 fee, uint256 net) {
        fee = Math.mulDiv(amount, feeBps, BPS_DENOMINATOR);
        net = amount - fee;
    }

    // ------------------------------------------------------------------
    // Internal
    // ------------------------------------------------------------------

    function _release(Invoice storage inv, Milestone storage m, uint256 index) private {
        uint256 amount = m.amount;
        (uint256 fee, uint256 net) = quoteRelease(amount);
        address to = _payee(inv);
        m.state = MilestoneState.Released;
        m.closedAt = uint64(block.timestamp);
        m.paidTo = to;
        inv.releasedAmount += amount;
        totalHeld -= amount;
        CircuitStats storage cs = _circuitStats[inv.processor][inv.circuitId];
        cs.releasedMilestones += 1;
        cs.releasedAmount += amount;
        _maybeComplete(inv);
        address recipient = feeRecipient;

        token.safeTransfer(to, net);
        if (fee > 0) {
            token.safeTransfer(recipient, fee);
            emit FeePaid(inv.id, index, recipient, fee);
        }
        emit MilestoneReleased(inv.id, index, to, net, fee, msg.sender);
    }

    /// @dev Payout target. The container when opted in and opened; otherwise the live circuit holder, falling
    /// back to the seller if the processor reverts or reports no holder.
    function _payee(Invoice storage inv) private view returns (address) {
        if (inv.payToContainer && _containerOpened(inv)) return inv.container;
        try ITapeOutProcessor(inv.processor).ownerOf(inv.circuitId) returns (address holder) {
            return holder == address(0) ? inv.seller : holder;
        } catch {
            return inv.seller;
        }
    }

    /// @dev True if the opener reports the circuit's container as opened. A reverting opener counts as not opened.
    function _containerOpened(Invoice storage inv) private view returns (bool) {
        try opener.isOpened(inv.processor, inv.circuitId) returns (bool opened) {
            return opened;
        } catch {
            return false;
        }
    }

    /// @dev Marks every Pending/Submitted milestone Refunded; returns the total. Caller sets the state.
    function _refundUnresolved(Invoice storage inv) private returns (uint256 amount) {
        uint256 id = inv.id;
        uint64 count = 0;
        for (uint256 i = 0; i < inv.milestoneCount; ++i) {
            Milestone storage m = _milestones[id][i];
            if (m.state == MilestoneState.Pending || m.state == MilestoneState.Submitted) {
                m.state = MilestoneState.Refunded;
                m.closedAt = uint64(block.timestamp);
                amount += m.amount;
                count += 1;
                emit MilestoneRefunded(id, i, m.amount, msg.sender);
            }
        }
        _circuitStats[inv.processor][inv.circuitId].refundedMilestones += count;
        inv.refundedAmount += amount;
        totalHeld -= amount;
    }

    function _maybeComplete(Invoice storage inv) private {
        if (inv.releasedAmount + inv.refundedAmount == inv.totalAmount) {
            inv.state = State.Completed;
            inv.closedAt = uint64(block.timestamp);
            emit InvoiceCompleted(inv.id, inv.releasedAmount, inv.refundedAmount);
        }
    }

    function _milestone(Invoice storage inv, uint256 index) private view returns (Milestone storage) {
        if (index >= inv.milestoneCount) revert MilestoneNotFound(inv.id, index);
        return _milestones[inv.id][index];
    }

    /// @dev Ids are sequential from 1, so existence is a range check.
    function _get(uint256 id) private view returns (Invoice storage inv) {
        if (id == 0 || id > invoiceCount) revert InvoiceNotFound(id);
        inv = _invoices[id];
    }
}
