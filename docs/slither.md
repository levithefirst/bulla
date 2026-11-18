# Slither report: BullaEscrow

Run: 14 Nov 2026 (Africa/Lagos). Tool: `slither-analyzer` 0.11.6 (virtualenv), against the Hardhat project in `contracts/` (`BullaEscrow.sol`, Solidity 0.8.24, optimizer 200 runs, evm cancun). Dependencies and mocks were excluded (`--filter-paths "node_modules|mocks|test" --exclude-dependencies`).

Command:

```bash
cd contracts
slither . --filter-paths "node_modules|mocks|test" --exclude-dependencies
```

Human summary: 204 SLOC in source, 0 high, 1 medium, 5 low, 0 informational, 0 optimization. No code was changed from this run. None of the findings is clearly high severity.

## High

None.

## Medium

### `incorrect-equality` in `getInvoice` (confidence: high)

`BullaEscrow.getInvoice(uint256)` at `contracts/BullaEscrow.sol:276` uses a strict equality:

```solidity
if (_invoices[id].state == State.None) revert InvoiceNotFound(id);
```

Slither flags strict equality as dangerous when it is used on balances or Ether amounts that a caller can inflate with a forced send. This check is on an internal enum (`State.None` meaning "no invoice at this id"), not on a balance, so it is a false positive for that class of bug. Left as-is.

## Low

### `timestamp` (confidence: medium)

These functions compare `block.timestamp` with the invoice `dueTimestamp` (and, in one report, also include an unrelated balance check that Slither grouped under the same detector):

- `createInvoice`: `dueTimestamp <= block.timestamp` (reject a due date that is already in the past)
- `submitDelivery`: `block.timestamp >= inv.dueTimestamp` (too late to submit)
- `fundInvoice`: `block.timestamp >= inv.dueTimestamp` (too late to fund)
- `claimRefund`: `block.timestamp < inv.dueTimestamp` (timeout refund not yet available)
- `getInvoice`: mis-tagged; the only comparison is the enum check above, not a timestamp

This is the intended time-lock. Miners and sequencers can nudge `block.timestamp` by a small amount, which is acceptable for a freelance invoice timeout measured in days, not seconds. Left as-is.

The `fundInvoice` report also quotes `token.balanceOf(address(this)) - beforeBal != inv.totalAmount`. That is a fee-on-transfer / unexpected-credit guard, not a timestamp comparison.

## Notes

- A second-person review or a professional audit is still listed as nice-to-have in `docs/HANDOFF.md` before Demo Day. This run is not an audit.
- Foundry is still optional; Hardhat remains the chosen toolchain.

## Re-run after hardening (14 Nov 2026, Claude Code build sandbox)

Same tool version (`slither-analyzer` 0.11.6) and the same command, against the hardened contract (NatSpec, `TransferShortfall` error, `EscrowConfigured` event, `totalHeld` accounting, `Math.mulDiv` fee).

Change made for the medium finding: although the `incorrect-equality` hit on `getInvoice` was a false positive (enum, not a balance), the existence check no longer compares the enum. Invoice ids are sequential from 1, so `_get` now reverts with `InvoiceNotFound(id)` when `id == 0 || id > invoiceCount`, and `getInvoice` reuses `_get`. Behavior is identical (covered by the existing `InvoiceNotFound` tests and the fuzz walks, which also hit unknown ids).

Result: **0 high, 0 medium, 4 low, 0 informational** (24 contracts analyzed with 102 detectors). The 4 lows are the intended `block.timestamp` due-date comparisons in `createInvoice`, `submitDelivery`, `fundInvoice`, and `claimRefund` described above. The previous mis-tagged `getInvoice` timestamp entry is gone.

## v2 run (18 Nov 2026, Claude Code build sandbox): circuit-bound milestone escrow

Same tool (`slither-analyzer` 0.11.6) and command, against BullaEscrow v2 (circuit binding through the TapeOut processor, opener and factory; per-invoice payout target; 1 to 10 milestones; optional arbiter).

First pass: **0 high, 1 medium, 4 low, 1 informational**.

- **Medium, `uninitialized-local`:** `createInvoice` declared `uint256 total;` before summing milestone amounts. Solidity zero-initializes locals, so the value was always correct, but the declaration is now explicit (`uint256 total = 0;`), and loop counters were made explicit too. Behavior unchanged (55 tests pass).
- **Low, `timestamp` (4):** `createInvoice` (due date in the future), `submitMilestone` and `fundInvoice` (not after the due date), `claimRefund` (time-lock open). These are the intended time-lock rules, measured in days. Left as-is.
- **Informational, `cyclomatic-complexity`:** `createInvoice` scores 12 because it validates the buyer, arbiter, due date, milestone count, labels, amounts, TapeOut processor and circuit holder in one place. Left as-is; every branch is covered by tests.

Re-run after the fix: **0 high, 0 medium, 4 low, 1 informational** (32 contracts analyzed with 102 detectors).

External calls added in v2 are all `view` reads of TapeOut contracts (`factory.isCPU`, `processor.ownerOf`, `opener.accountOf`), compiled as `staticcall`, inside `nonReentrant` functions where funds move. A reverting `ownerOf` at release time cannot trap funds: the payout falls back to the original seller (tested). Not an audit.

Re-run after the opened-container fallback and the `circuitStats` counters (same day): **0 high, 0 medium, 4 low, 1 informational**, unchanged. The new `opener.isOpened` read is a `view` call wrapped in `try`/`catch`, so a reverting opener counts as "not opened" and the release falls back to the circuit holder.

### Re-run after the review fixes (18 Nov 2026)

Changes: `fundInvoice` clears both cancel consents, new `revokeCancelConsent`, `circuitStats` counts funded invoices only (`fundedInvoices`, incremented in `fundInvoice`). Same command, Slither 0.11.6: 32 contracts, 102 detectors, 5 results. 0 high, 0 medium, 4 low (`timestamp` in `createInvoice`, `submitMilestone`, `fundInvoice`, `claimRefund`; intended due-date checks), 1 informational (`createInvoice` cyclomatic complexity 12). Unchanged from the previous v2 run.
