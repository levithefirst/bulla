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
