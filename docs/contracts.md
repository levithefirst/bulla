# BullaEscrow contract

Source: `contracts/contracts/BullaEscrow.sol`. Tests: `contracts/test/BullaEscrow.test.ts` (`npm test`). Toolchain: Hardhat 2.29, solc 0.8.24 (from the `solc` npm package, so no compiler download is needed), OpenZeppelin 5 (`IERC20`, `SafeERC20`, `ReentrancyGuard`, `Ownable`).

**Unaudited v1.** Do not escrow amounts you cannot afford to lose.

## Constructor

```solidity
constructor(address token, address feeRecipient, uint16 feeBps, address initialOwner)
```

- `token`: the only ERC-20 this deployment accepts (immutable). Mainnet target is Circle USDC on X Layer, behind the decision gate in `docs/research.md`.
- `feeRecipient`: receives the release fee. The owner can change it (`setFeeRecipient`), and that is the owner's only power.
- `feeBps`: immutable, default 50 (0.5%), hard cap `MAX_FEE_BPS = 1000` (10%). This is Bulla's own fee, not an X Layer or TapeOut protocol fee.

## States

| # | State | Meaning |
| --- | --- | --- |
| 0 | None | id does not exist |
| 1 | Draft | seller created it; no funds held |
| 2 | Funded | buyer deposited `totalAmount` |
| 3 | Submitted | seller recorded a delivery hash (and optional URI) |
| 4 | Released | buyer released; seller got `totalAmount - fee`, fee recipient got `fee` |
| 5 | Refunded | due time passed; buyer reclaimed `totalAmount` |
| 6 | Cancelled | both parties consented; buyer got `totalAmount` back if it was funded |

```
Draft --fund(buyer)--> Funded --submit(seller)--> Submitted --release(buyer)--> Released
  |                      |  \--release(buyer)------------------------------------^
  |                      |--claimRefund(buyer, now >= due)--> Refunded <--claimRefund--Submitted
  \--mutualCancel x2-->  Cancelled <--mutualCancel x2-- Funded / Submitted (refund buyer)
```

## Functions and callers

| Function | Caller | Allowed states | Time rule | Effect |
| --- | --- | --- | --- | --- |
| `createInvoice(buyer, token, amount, due, deliveryHash, circuitContainerId, memo)` | anyone (becomes seller) | n/a | `due > now` | new Draft. `token` must equal `token()`; `buyer` not zero and not the seller; `amount > 0`; `circuitContainerId != 0`. `deliveryHash` is an optional pre-agreed hash (may be zero) and is overwritten on submit |
| `fundInvoice(id)` | buyer | Draft | `now < due` | pulls `totalAmount` with `transferFrom` (approve first). Rejects tokens that deliver less than requested |
| `submitDelivery(id, hash, uri)` | seller | Funded, Submitted | `now < due` | records non-zero `hash` and `uri`; can be repeated to update |
| `releaseFunds(id)` | buyer | Funded, Submitted | any | pays `net` to seller and `fee` to `feeRecipient` |
| `claimRefund(id)` | buyer | Funded, Submitted | `now >= due` | returns `totalAmount` to buyer, no fee |
| `mutualCancel(id)` | seller or buyer | Draft, Funded, Submitted | any | records this party's consent; when both have consented → Cancelled, refund buyer if funded, no fee |
| `setFeeRecipient(addr)` | owner | n/a | n/a | changes fee recipient only |
| `getInvoice(id)`, `quoteRelease(amount)`, `invoiceCount()`, `totalHeld()` | anyone | n/a | n/a | views |

Notes on the time-lock: the buyer can refund after `dueTimestamp` even if the seller already submitted. That is the v1 rule: the seller should pick a due date that leaves the buyer review time, and the buyer can release any time before or after the due date as long as they have not refunded. Funding and submitting are blocked at or after the due date so nobody starts work on an already-refundable invoice.

## Fee math

```
fee = totalAmount * feeBps / 10_000     (integer division, rounds down)
net = totalAmount - fee
```

`quoteRelease` uses OpenZeppelin `Math.mulDiv`, so it cannot overflow for any `uint256` amount.

Example at 50 bps with a 6-decimal token: 250.000000 → fee 1.250000, net 248.750000. 1.000000 → fee 0.005000. Amounts below 200 base units pay zero fee. Fees are only taken on `releaseFunds`; refunds and cancels return the full amount.

## Events

`EscrowConfigured(token, feeRecipient, feeBps, owner)` (constructor), `InvoiceCreated`, `InvoiceFunded`, `DeliverySubmitted`, `FundsReleased(id, seller, net, fee)`, `FeePaid(id, feeRecipient, fee)` (only when fee > 0), `Refunded`, `CancelConsentGiven`, `InvoiceCancelled(id, refundedToBuyer)`, `FeeRecipientUpdated`.

## Custom errors

Every revert is a custom error: `ZeroAddress`, `FeeTooHigh(feeBps)`, `UnsupportedToken(token)`, `InvalidAmount` (zero amount), `TransferShortfall(expected, received)` (fee-on-transfer or rebasing token at funding), `InvalidBuyer`, `DueInPast`, `MissingContainerId`, `MissingDeliveryHash`, `InvoiceNotFound(id)`, `NotSeller`, `NotBuyer`, `NotParty`, `WrongState(current)`, `PastDue`, `NotYetDue(dueTimestamp)`, `AlreadyConsented`, plus OpenZeppelin's `OwnableUnauthorizedAccount`, `ReentrancyGuardReentrantCall`, and SafeERC20 errors. The web app maps each to a plain-English message.

## Accounting

`totalHeld` is the sum of `totalAmount` over invoices in Funded or Submitted. It rises on `fundInvoice` and falls on release, refund, and a funded cancel. `token.balanceOf(escrow) >= totalHeld` always; it is equal unless someone transfers tokens to the contract directly (those are stuck: there is deliberately no sweep function, so the owner can never move funds).

## Safety properties (tested)

- State is written before any token transfer (checks-effects-interactions), and every transfer path is `nonReentrant`. A malicious token that re-enters `releaseFunds` or `claimRefund` during a transfer makes the whole transaction revert (`ReentrancyGuardReentrantCall`), and balances are unchanged.
- Each invoice can pay out once: double release, release after refund, refund after release and double fund all revert with `WrongState`.
- Only the buyer can fund, release and refund; only the seller can submit; only the two parties can cancel. The owner cannot call any of these on someone else's behalf.
- Wrong token: `createInvoice` rejects any token other than the configured one (`UnsupportedToken`); fee-on-transfer tokens are rejected at funding (`TransferShortfall`).

## Fuzz and invariant tests

`contracts/test/BullaEscrow.invariants.test.ts` is a seeded, reproducible stateful random walk (Hardhat has no built-in invariant runner, so the harness is explicit). Each run deploys a fresh escrow with a fee in 0..1000 bps, two sellers, two buyers and a stranger, then takes random steps: create (sometimes invalid), fund, submit, release, refund, cancel, unknown ids, wrong callers, and time warps. After **every** step it checks:

1. `token.balanceOf(escrow) == totalHeld == sum(totalAmount of Funded/Submitted invoices)`
2. no invoice state goes backwards, and a closed state (Released, Refunded, Cancelled) never changes
3. every release pays `fee == floor(amount * feeBps / 10000)`, so `fee <= amount * feeBps / 10000`, and seller plus fee recipient receive exactly the escrowed amount
4. refunds and funded cancels return the full amount to the buyer with no fee

A final check asserts the walks reached every state. A separate fuzz test checks `quoteRelease` for random and extreme amounts (up to `2^256 - 1`) at several fee rates. Defaults: 6 runs × 120 steps (`npm test`). Larger campaign: `FUZZ_RUNS=20 FUZZ_STEPS=300 FUZZ_SEED=20261114 npx hardhat test test/BullaEscrow.invariants.test.ts`.

## Static analysis

Slither 0.11.6 reports are in `docs/slither.md`. The first run found 0 high, 1 medium (an `incorrect-equality` false positive on the enum existence check in `getInvoice`) and 5 low. The existence check is now a range check on the sequential id (`id == 0 || id > invoiceCount`), and a re-run reports 0 high, 0 medium and 4 low; the lows are the intended `block.timestamp` due-date comparisons. Slither is not an audit.
