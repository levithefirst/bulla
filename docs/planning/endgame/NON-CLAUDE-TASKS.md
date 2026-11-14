# Bulla — tasks Claude Code cannot do

Ordered from now (14 November 2026, Africa/Lagos) to submission (7 December 2026, 23:59 UTC). Claude Code may write checklists, scripts, and docs; it may not sign, fund from Fluid’s wallets, mint a circuit in a signed official UI, record the demo, or submit the form.

Grok Bot may use a browser, do web research, use faucets, do sign-ups only via memequant@mail.grokbot.com, and work with GitHub and docs. Grok Bot must never handle seeds or production private keys, must never use leviweb3x@gmail.com, and must never submit the official Google Form as Fluid.

If an official URL, faucet, or address is not yet confirmed, the done-criteria say “confirm from official docs” — do not invent one.

## Grok Bot can do

1. **Verify public chain facts.** When: as soon as Claude writes docs/research.md, and again if UNKNOWNs remain. Open official X Layer / OKX docs (not model memory) and confirm mainnet and testnet chain IDs, official RPC(s), and official explorer. Done: each item in docs/research.md has a primary URL, or is still marked UNKNOWN with the source that was tried.

2. **Confirm the escrow token plan.** When: with task 1, before any mainnet token is hardcoded. Identify an ERC-20 a normal wallet can actually hold and transfer on X Layer (prefer a widely used stablecoin if one exists): symbol, decimals, address, explorer link. If none is clearly usable, document that v1 stays on MockERC20 for testnet and that Fluid must pick a mainnet token later. Done: the token section of docs/research.md is sourced or explicitly UNKNOWN, and the contract still takes the token as a constructor argument.

3. **Source the TapeOut / DeWEB click path.** When: with task 1, before Fluid mints a circuit. From official TapeOut, Fab X, TapeCode, TapeKit, or SiteRegistry docs only, write or correct docs/tapeout-binding.md and the DeWEB publish checklist (no invented CLI flags or npm packages). Done: the doc is a step-by-step official-UI or confirmed-CLI path, or it says UNKNOWN and keeps the official-UI fallback.

4. **Confirm the official submission form URL (do not submit).** When: after SUBMISSION-DRAFT.md exists, well before 7 Dec. Take the Google Form link only from the official Build X / TapeOut Accelerate page. Done: the URL is recorded in docs/SUBMISSION-DRAFT.md or docs/HANDOFF.md as “official form, not submitted.”

5. **Testnet faucets.** When: after Fluid has designated test addresses (Fluid-only task 1) and before Fluid signs a testnet deploy if native gas is missing. Use official X Layer / OKX faucet pages confirmed from docs; request test gas to those addresses only. Never create or store Fluid’s seed. Done: faucet transaction or confirmation noted; the designated test addresses hold enough native test gas for deploy + one demo flow, or HANDOFF records that the official faucet failed / was not found.

6. **Needed sign-ups (non-wallet).** When: if official explorer verification, a static HTTPS fallback host, event Telegram, or similar requires an account and no wallet signature. Use only memequant@mail.grokbot.com. Done: the account can complete the non-signing step; credentials stay in the vault, not in the repo or chat.

7. **GitHub hygiene on the existing private remote.** When: ongoing. Keep levithefirst/bulla private; open issues for every remaining UNKNOWN in docs/HANDOFF.md; review diffs; never add secrets, never change visibility, never force-push. Done: repo is still private; one issue (or a short issue list) tracks each UNKNOWN and unsigned deploy.

8. **Docs QA.** When: after Claude writes SUBMISSION-DRAFT.md and DEMO.md. Check citations are only the three approved late-payment sources; tighten wording; no new invented stats. Done: both docs are consistent with the product lock and ready for Fluid to film and (later) paste into the form.

9. **Explorer verification that does not need the deployer wallet.** When: after a contract address exists on testnet or mainnet. If the official explorer can verify from source alone, do it. If it requires the deployer to sign, stop and list it as Fluid-only. Done: contract source is verified, or HANDOFF says a deployer signature is required.

10. **HTTPS static fallback host (no wallet).** When: after `web/` builds a static dist/ and a fallback is needed because DeWEB publish is UNKNOWN or pending Fluid’s signature. Deploy the static build to a boring HTTPS host already signed up under memequant, pointing at the same contract config. Done: a public HTTPS URL opens the app and reads the configured contract. This does not replace a DeWEB publish.

## Fluid only (by hand)

1. **Designate wallets.** When: before any faucet, deploy, or circuit mint (ideally immediately). Create or choose self-custodial seller, buyer, and fee-recipient wallets (test and, later, production). Never paste a production seed into chat, the repo, or a Grok Bot session. Done: addresses exist in a place Fluid controls; .env stays local and gitignored.

2. **Fund wallets.** When: testnet after addresses exist (if the faucet did not cover ERC-20 or enough gas); mainnet before mainnet deploy, container open, site publish, and the demo invoice. Done: balances cover deploy, container open, site publish, and one full demo invoice (fund + fee) on the target network. Grok may request faucets; moving Fluid’s own funds is Fluid only.

3. **Sign the testnet contract deploy.** When: after Claude’s testnet script exists, research for chain/RPC is confirmed or explicitly accepted as a documented test path, and the test wallet has gas. Run the script or wallet flow locally with Fluid’s key. Done: testnet escrow address is in contracts/deployments.json, on the official explorer, and in the UI config, all matching.

4. **Mint or reuse a TapeOut circuit and open its container.** When: after the official click path is in docs/tapeout-binding.md (even if parts are UNKNOWN, use the official UI). This is a signed official-UI (or confirmed-CLI) step. Done: a real X Layer circuit id and container id are recorded for createInvoice and for the submission draft.

5. **Sign the mainnet contract deploy.** When: after testnet flow is proven, token address is confirmed, and the production wallet is funded. Done: mainnet address is in deployments.json, on the official explorer (or “verification pending Fluid/Grok task 9”), and in the UI config, all matching. No assistant holds the key.

6. **Sign DeWEB / SiteRegistry publish** if official tooling requires a wallet. When: after the static build and publish checklist exist, and the container is open. Done: a layperson DeWEB or official-gateway URL opens Bulla and reads the deployed contract. If publish is unsigned-HTTPS-only, that fallback can be Grok task 10, but the form should still explain the TapeOut parts honestly.

7. **Record the demo video.** When: after DEMO.md is approved (Grok task 8) and a live or testnet happy path can be clicked. Length ≤ 3 minutes: problem, core flow, users and business model, TapeOut use. Done: a file or link ready to attach to the submission.

8. **Confirm eligibility and accept event terms.** When: before form submit. 18+ or age of majority / legal entity; not a restricted person under X Layer ToS. Done: Fluid is ready to submit in their own name.

9. **Submit the official Google Form.** When: after access link (DeWEB and/or HTTPS), contract address, circuit ID, and SUBMISSION-DRAFT copy are ready, and before 7 December 2026, 23:59 UTC. Done: Fluid has the form confirmation or submitted timestamp. Grok Bot and Claude must not submit as Fluid.

10. **Demo Day and prize wallet, if shortlisted.** When: if organizers invite Bulla. Attend the offline Demo Day. Provide a self-custodial prize wallet Fluid controls. Organizers will not ask for a seed; never give one. Done: attendance and receiving address provided as required.
