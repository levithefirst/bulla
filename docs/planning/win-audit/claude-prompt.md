# Claude Code prompt: Bulla v2 (circuit-bound escrow, milestones, arbiter)

Paste everything below the line into Claude Code, run in `/workspace/bulla` on branch `ccr-0289a6a3-a6gku1`.

---

You are working on Bulla, a milestone invoice plus USDC escrow on X Layer for the X Layer TapeOut Accelerate hackathon (deadline 7 Dec 2026, 23:59 UTC). Read `docs/planning/win-audit/WIN-AUDIT.md` first, then `README.md`, `docs/HANDOFF.md`, `docs/research.md`, `docs/contracts.md`, `docs/SUBMISSION-DRAFT.md`, `docs/DEMO.md`. Nothing is deployed yet, so the contract can change freely. Work fast without dropping quality. No em dashes in any file you write. Never invent facts: cite a URL or write UNKNOWN. Never commit a key, never touch mainnet, never change repo visibility.

## Goal

Make TapeOut do real work in Bulla, and make "milestone" true. The audit's main finding is that `circuitContainerId` is an unchecked `bytes32`, so the TapeOut binding is decorative. Fix that on chain.

## Tasks (in order; commit after each green step)

1. **Verify the TapeOut interfaces before coding.** From the official TapeKit repo (https://github.com/TapeOutProtocol/TapeKit: `SPEC.md` Appendix B, `kernel/src/config.js`), record in `docs/research.md` (append a new section, do not edit earlier sections):
   - `processor.ownerOf(uint256 tokenId)` (B.1)
   - `opener.accountOf(address circuits, uint256 tokenId)` and `isOpened(...)` (B.2)
   - the container's `token()` (B.4)
   - the X Layer mainnet opener and factory addresses from `config.js`
   - whether the container (ERC-6551 account) exposes a generic `execute` so a holder can move ERC-20 out. If you can't confirm `execute` from source, mark it UNKNOWN and make pay-to-container opt-in per invoice (default: pay the seller address).

2. **BullaEscrow v2** (`contracts/contracts/BullaEscrow.sol`):
   - **Circuit binding:** `createInvoice` takes `address processor, uint256 circuitId` instead of `bytes32 circuitContainerId`. Require `IProcessor(processor).ownerOf(circuitId) == msg.sender`. Store both, plus the `container` address from `opener.accountOf(processor, circuitId)` (the opener address is a constructor immutable). Emit them. In local and test builds, use mocks (`MockProcessor`, `MockOpener`).
   - **Payout target:** a per-invoice flag `payToContainer`. When true, releases pay the `container` address. When false, they pay the seller. At each release, re-check that the seller still holds the circuit. If the NFT moved, pay the current holder or their container. Document whichever rule you pick, and test it.
   - **Real milestones:** an invoice has 1 to 10 milestones (amount and label each). The buyer funds the whole invoice up front (keep the UX simple). The seller submits delivery per milestone. The buyer releases per milestone. The fee applies per release. Refund after due date covers unreleased milestones only. Mutual cancel refunds the unreleased remainder.
   - **Optional arbiter:** a seller-proposed address (or zero) that the buyer accepts by funding. The arbiter can release a submitted milestone to the seller, or refund it to the buyer. Arbiter cannot be buyer or seller. No arbiter fee in v2.
   - Keep: single allowed token, fee cap, nonReentrant, custom errors, no sweep.
   - Update the tests (keep or exceed coverage; the old count was 50) and re-run Slither notes in `docs/slither.md`.

3. **Web app:**
   - Create form: pick processor and circuit id. Read `ownerOf` live and show "You hold circuit #ID" or an error. Show the container address with an explorer link and a "Pay into my TapeOut container" toggle. Add a milestones editor and an optional arbiter field.
   - Receipt: milestones table, arbiter, payout target (container with explorer link), and a "Seller history" panel (released count and total for that circuit, from events, no backend).
   - Share kit on the receipt: copy link, QR, prefilled X and Telegram text.
   - **Judge mode:** a mock or test circuit on testnet. TapeOut has no testnet deployment (see `docs/research.md` §3), so deploy `MockProcessor` and `MockOpener` with `deploy:judge` and label them "testnet stand-in for TapeOut" in the UI. Show the payout landing in the container address in the steps. Add a per-run gas cap and a visible "demo tank balance" line. Keep under 10 s locally.
   - Mainnet build: the real X Layer opener address from step 1. Never a mock on 196 (add a build-time guard).

4. **Docs and copy:**
   - There are **five** official criteria. Add **Demo Video** (≤ 3 min: problem, core features, target users and business model, how it uses TapeOut; source https://web3.okx.com/xlayer/build-x-series) wherever four are listed: README "How Bulla uses X Layer", `docs/SUBMISSION-DRAFT.md`, `docs/SUBMISSION-CHECKLIST.md`.
   - Rewrite the `SUBMISSION-DRAFT.md` title, one-liner, first paragraph and section order per `WIN-AUDIT.md` §7. Keep only the approved citations. Add a "Built during the event (first commit 14 Nov 2026)" line and a "Limits" line.
   - Update `docs/DEMO.md` to the §6 timeline (first 30 seconds second by second, chain labelled on screen, explorer shot of the container receiving USDC).
   - Update `docs/HANDOFF.md`: the new constructor args (opener), the new deploy steps, and mock-vs-real per chain.
   - Update `docs/contracts.md` for the v2 state machine.

5. **Checks, then commit:** contract tests, `check:contrast`, the full E2E (including `judge-mode.spec`), build, `deweb:package` (no judge code or key), and grep checks for em dashes and secrets. Commit as `levithefirst <304593143+levithefirst@users.noreply.github.com>` in logical commits, then fetch, rebase and push to `ccr-0289a6a3-a6gku1`.

## Out of scope (do not build)

FabX or any token hooks, fiat ramps, email or push notifications, and TapeSend. Grok Bot is checking whether the X Layer TapeSend hub is live; leave a clean interface seam for a later prompt. No mainnet transactions. No repo visibility change.

## Report back

A table of what changed, test counts, judge-mode timing, the exact new deploy commands and constructor args per chain, anything marked UNKNOWN (especially container `execute`), and every human step that changed.
