# BullaEscrow v2 contract

Source: `contracts/contracts/BullaEscrow.sol`. Tests: `contracts/test/*.test.ts` (`npm test`, 91 passing, including the shared web helpers). Toolchain: Hardhat 2.29, solc 0.8.24 (from the `solc` npm package, no compiler download), OpenZeppelin 5 (`IERC20`, `SafeERC20`, `ReentrancyGuard`, `Ownable`, `Math`).

**Unaudited.** Do not escrow amounts you cannot afford to lose. A superseded v1 escrow exists on X Layer mainnet (`docs/planning/mainnet-budget.md`); v2 replaces it and has a different ABI.

## Constructor

```solidity
constructor(address token, address opener, address factory, address feeRecipient, uint16 feeBps, address initialOwner)
```

| Arg | Meaning | X Layer mainnet (196) | Testnet (1952) / local |
| --- | --- | --- | --- |
| `token` | The only ERC-20 accepted (immutable) | Circle USDC `0xB6CEceAB302E2E4948951eE7843FC24E92933061` | testnet USDC `0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3`, or DemoUSD for judge mode |
| `opener` | TapeOut container opener (immutable) | `0x536adD8F30f03b69f6fbF29d425A816A0dC50106` (official, hard-coded in deploy scripts) | `MockOpener` stand-in |
| `factory` | TapeOut processor factory (immutable) | `0x1f09DAeFA827f02CBb40967cc91b259763760761` (official) | `MockTapeOutFactory` stand-in |
| `feeRecipient` | Receives release fees; the owner can change it | chosen at deploy | chosen at deploy |
| `feeBps` | Fee per release, immutable, at most 1000 | 50 (0.5%) | 50 |
| `initialOwner` | Can only call `setFeeRecipient` | deployer | deployer |

Addresses and sources: `docs/research.md` sections 8 and 9. Deploy scripts and `contracts/deployments.json` refuse any other opener or factory on chain 196, and the web build refuses stand-ins on 196.

## Circuit binding

`createInvoice` takes a TapeOut `processor` (circuit NFT contract) and `circuitId`. It requires:

1. `factory.isCPU(processor)` (only real TapeOut processors; SPEC B.1),
2. `processor.ownerOf(circuitId) == msg.sender` (only the circuit's holder can bill with it; SPEC B.3),

and stores `container = opener.accountOf(processor, circuitId)` (the circuit's ERC-6551 account; SPEC B.2). The binding is emitted in `CircuitBound(id, processor, circuitId, container, payToContainer)`.

The contract only reads TapeOut (`view` calls, executed as `staticcall`). It runs no circuit logic.

## Payout rule (checked at every release)

| Invoice setting | Container opened? | Release pays |
| --- | --- | --- |
| `payToContainer = true` | yes (`opener.isOpened`) | the circuit's container |
| `payToContainer = true` | no | the current circuit holder (fallback) |
| `payToContainer = false` (default) | n/a | the current circuit holder |
| any | `ownerOf` reverts or returns 0 | the original seller |

- The circuit holder is normally the seller. If the circuit NFT moves, later releases pay its new holder: receivables follow the circuit.
- An opened X Layer container can send tokens out with ERC-6551 `execute(to, value, data, 0)` from the holder, with `EXEC_FEE()` attached as `msg.value` (0.0013 OKB when read on 18 Nov 2026; always read it live). Unopened containers revert `NotPaid()`, which is why the contract falls back until the container is opened (`docs/research.md` section 9).
- Seller actions (submit, cancel) stay with the address that created the invoice. Only the payout follows the circuit.
- `payoutTarget(id)` and `containerOpened(id)` return the live answers.

## States

Invoice:

| # | State | Meaning |
| --- | --- | --- |
| 0 | None | id does not exist |
| 1 | Draft | created; nothing funded |
| 2 | Funded | the buyer deposited the full amount; milestones in progress |
| 3 | Completed | every milestone resolved by release or arbiter refund |
| 4 | Refunded | after the due date the buyer reclaimed every unresolved milestone |
| 5 | Cancelled | both parties consented; the unresolved remainder (if funded) went back to the buyer |

Milestone: `Pending (0) -> Submitted (1) -> Released (2) | Refunded (3)`. Pending can also go straight to Released (early release) or Refunded (time-lock or cancel).

```
Draft --fund(buyer, accepts arbiter)--> Funded --(every milestone Released/Refunded)--> Completed
  |                                       |--claimRefund(buyer, now >= due)--> Refunded (unresolved only)
  \--mutualCancel x2--> Cancelled <--mutualCancel x2-- Funded (unresolved remainder to buyer)

per milestone (while Funded):  Pending --submitMilestone(seller)--> Submitted
  Pending|Submitted --releaseMilestone(buyer)--> Released (pay target, fee)
  Submitted --arbiterRelease--> Released     Submitted --arbiterRefund--> Refunded
```

The UI shows a refined status: Draft, Funded, Submitted (a delivery awaits release), Partly released, Released (all paid), Completed (settled with some arbiter refunds), Refunded, Cancelled.

## Functions and callers

| Function | Caller | When | Effect |
| --- | --- | --- | --- |
| `createInvoice(CreateParams)` | the circuit's holder (becomes seller) | `due > now` | Draft. 1 to 10 milestones (amount > 0, label at most 80 bytes); `token == token()`; buyer not zero or seller; arbiter zero or not buyer/seller; circuit checks above |
| `fundInvoice(id, acceptedArbiter)` | buyer | Draft, `now < due` | pulls the full amount (approve first); `acceptedArbiter` must equal the proposed arbiter; rejects short-delivering tokens (`TransferShortfall`) |
| `submitMilestone(id, i, hash, uri)` | seller | Funded, milestone Pending/Submitted, `now < due` | records a non-zero hash and optional URI; repeatable |
| `releaseMilestone(id, i)` | buyer | Funded, milestone Pending/Submitted | pays `net` to the payout target and `fee` to `feeRecipient` |
| `arbiterRelease(id, i)` | arbiter | Funded, milestone Submitted | as release (fee applies, arbiter gets nothing) |
| `arbiterRefund(id, i)` | arbiter | Funded, milestone Submitted | returns that milestone to the buyer, no fee |
| `claimRefund(id)` | buyer | Funded, `now >= due` | returns every unresolved milestone, no fee; state Refunded |
| `mutualCancel(id)` | seller or buyer | Draft or Funded | records consent; with both, Cancelled and the unresolved remainder returns to the buyer |
| `revokeCancelConsent(id)` | seller or buyer who consented | Draft or Funded | withdraws that party's consent (`NoConsentToRevoke` if none) |
| `setFeeRecipient(addr)` | owner | any | only owner power |
| `getInvoice`, `getMilestones`, `payoutTarget`, `containerOpened`, `circuitStats`, `quoteRelease`, `invoiceCount`, `totalHeld` | anyone | any | views |

The due date: funding and submitting stop at `dueTimestamp`; from then on the buyer can reclaim unreleased milestones even if they were submitted. Sellers should leave review time, or name an arbiter.

## Fee math

```
fee = mulDiv(milestoneAmount, feeBps, 10_000)   (rounds down, cannot overflow)
net = milestoneAmount - fee
```

At 50 bps: a 250.000000 milestone pays 1.250000 fee and 248.750000 net. Fees apply only to releases (buyer or arbiter); refunds and cancels are free.

## Accounting and on-chain history

- `totalHeld` = sum of unresolved milestone amounts over Funded invoices. `token.balanceOf(escrow) >= totalHeld`, equal unless someone sends tokens directly (those are stuck; no sweep function by design).
- `circuitStats(processor, circuitId)` counts **funded** invoices (`fundedInvoices`, incremented in `fundInvoice`; unfunded drafts are excluded), milestones released and refunded, and gross released volume per circuit. The receipt's "On-chain activity" panel reads it, because the public X Layer RPC rejects `eth_getLogs`. It is activity, not reputation: a seller can fund invoices from a wallet they control.

## Events

`EscrowConfigured`, `InvoiceCreated`, `CircuitBound`, `MilestoneDefined`, `ArbiterProposed`, `InvoiceFunded`, `MilestoneSubmitted`, `MilestoneReleased(id, index, paidTo, net, fee, by)`, `FeePaid`, `MilestoneRefunded(id, index, amount, by)`, `InvoiceCompleted`, `Refunded`, `CancelConsentGiven`, `CancelConsentRevoked`, `InvoiceCancelled`, `FeeRecipientUpdated`.

## Custom errors

`ZeroAddress`, `FeeTooHigh`, `UnsupportedToken`, `InvalidAmount`, `TransferShortfall`, `InvalidBuyer`, `InvalidArbiter`, `DueInPast`, `InvalidMilestones`, `LabelTooLong`, `NotTapeOutProcessor`, `NotCircuitHolder`, `MissingDeliveryHash`, `InvoiceNotFound`, `MilestoneNotFound`, `NotSeller`, `NotBuyer`, `NotArbiter`, `NotParty`, `ArbiterMismatch`, `WrongState`, `WrongMilestoneState`, `PastDue`, `NotYetDue`, `AlreadyConsented`, `NoConsentToRevoke`, plus OpenZeppelin's `OwnableUnauthorizedAccount`, `ReentrancyGuardReentrantCall` and SafeERC20 errors. The web app maps them to plain English.

## Safety properties (tested)

- Every function that moves tokens is `nonReentrant` and writes state before transferring. A token that re-enters `releaseMilestone` or `claimRefund` reverts the whole transaction.
- Each milestone pays out at most once; states only move forward.
- The owner cannot fund, release, refund, cancel, or move funds.
- Cancel consent cannot be carried from the draft into the funded invoice: `fundInvoice` clears both consents (emitting `CancelConsentRevoked`), so neither party can later cancel alone and claw back submitted milestones. Either party can withdraw its own consent with `revokeCancelConsent`.
- A release reverts if the payee (or fee recipient) cannot receive the token, e.g. a USDC-blacklisted address. Nothing moves; the milestone stays unresolved and remains refundable to the buyer after the due date.
- Without an arbiter, `claimRefund` after the due date returns submitted but unreleased milestones too.
- A reverting or burned circuit cannot trap funds at release (payout falls back to the seller), and the time-lock refund never calls TapeOut.

## Fuzz and invariant tests

`contracts/test/BullaEscrow.invariants.test.ts`: seeded random walks (6 runs x 140 steps by default) over creates (valid and invalid circuits, 1 to 4 milestones, container opt-in, optional arbiter), funding (with right and wrong arbiter acceptance), submits, buyer and arbiter releases, arbiter refunds, time-lock refunds, cancels, circuit transfers, container opens and time warps. After every step it checks: escrow balance == `totalHeld` == sum of unresolved milestones; no invoice or milestone state goes backwards; released + refunded never exceeds the total; `circuitStats` matches the invoices. Every successful release is checked for the exact fee and the right payee (container if opted in and opened, else the live holder). A final test asserts every invoice and milestone state was reached. Larger campaign: `FUZZ_RUNS=20 FUZZ_STEPS=300 FUZZ_SEED=20261118 npx hardhat test test/BullaEscrow.invariants.test.ts` (passed on 18 Nov 2026 after the opened-container change: 22 passing, 20 walks x 300 steps).

## Static analysis

Slither 0.11.6, `docs/slither.md`: v2 is 0 high, 0 medium, 4 low (intended due-date timestamp checks) and 1 informational (`createInvoice` complexity). Not an audit.
