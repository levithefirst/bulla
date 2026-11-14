# TapeInvoice — phased Claude Code prompts (run 3)

Winner locked by run 3: **TapeInvoice** (re-judged 37/50). Distillation of the second fan-out (10 answers of 20 launched). Auto-distill (ovh/qwen3.5-397b) recommended gpt-oss-120b’s 7-phase spine plus gemini’s static-export notes, and to **drop any required backend**. Invented SDKs, chain IDs, token symbols, and CLI flags stay forbidden.

Architecture (every phase): funds and state live in a **companion X Layer contract**. A **TapeOut circuit container** is the escrow identity and the DeWEB home of the app. The chain is the source of truth. No custodial API. Not CoTape, not TapeFlow, not a token launch, not a miner desk.

Paste one PHASE prompt into Claude Code, starting from an empty repo. Do not start Phase N until that phase’s acceptance list is checked. Human-only work: `non-claude-tasks.md`. Phase 1 research must be signed off before any mainnet spend.

Deadline: 7 December 2026, 23:59 UTC (~23 days from 14 November 2026). Day counts total ~21, leaving slack.

---

## PHASE 1: Research spike and repo bootstrap (goal: verified facts + buildable monorepo, ~2 days)

PROMPT:
<<<
You are a senior Web3 engineer. Start TapeInvoice from an empty folder. TapeInvoice is a milestone invoice + escrow app for freelancers and small buyers on X Layer. Funds and invoice state live in a companion Solidity contract. A TapeOut circuit container is the escrow identity and the DeWEB home of the UI. The chain is the source of truth. No backend server in v1. No TapeSend. No bridges. No invented SDKs.

This is not CoTape (miner designer/funder escrow), not TapeFlow (generic payment suite), not a token launch, and not a miner desk. v1 is one invoice template, milestone or single-shot, and a public no-wallet receipt.

TODAY: official docs are the only authority. If a package, RPC, chain ID, token, factory, SiteRegistry address, or CLI command is not confirmed from a primary source you actually opened, write UNKNOWN in docs/research.md and use a clearly named placeholder. Never invent @xlayer/tapout-sdk, a token called XUSD, tapekit CLI flags, or a chain ID (including 195).

Create:
- contracts/   Foundry (preferred) or Hardhat — pick one and stick to it
- web/         Vite + React + TypeScript + viem/wagmi (static-export friendly; relative paths)
- scripts/     probe scripts
- docs/        research and decisions
- README.md, .gitignore, .env.example

Tasks:
1. Initialize workspaces and scripts: contracts compile/test, web dev/build, root README.
2. Write docs/research.md with source URLs opened this session:
   - X Layer mainnet and testnet chain IDs, official RPC(s), official explorer.
   - At least one ERC-20 a normal wallet can actually hold and transfer (prefer a widely used stablecoin if one exists). Symbol, decimals, address, explorer link. If none is clearly usable, say so and plan a testnet MockERC20 plus a mainnet token decision gate.
   - How to mint or reuse a TapeOut circuit on X Layer, open a container, and which official apps/docs apply. Commands or UI steps only if confirmed.
   - How to publish a static site to DeWEB / SiteRegistry and how a layperson opens it (TapeKit reader and any official HTTPS gateway). Publish steps only if confirmed.
   - Architecture: contract holds tokens + state; each invoice stores a circuit container id; UI is a static DeWEB app; control of a container follows the circuit holder — never “safe if the wallet is stolen.”
3. docs/SUBMISSION-DRAFT.md: product, users, revenue (fee on release), retention, and pain-point citations already approved — do not invent new stats:
   - Bonsai 2025, 100k+ freelancers, 29% of invoices paid at least one day late: https://www.hellobonsai.com/blog/late-freelance-payment
   - Remote: 85% paid late at least sometimes; 21% more than half the time: https://remote.com/blog/contractor-management/reversing-late-payment-culture
   - IPSE UK: about 32–35% had a client payment delay in the prior 12 months: ipse.co.uk prompt-payment campaign pages
4. scripts/probe-network.ts: given RPC from .env, print chain id and block number; if a token address is set, symbol/decimals/balance-of call. Fail loudly if env is missing.
5. scripts/probe-tapeout.ts: attempt only TapeOut read APIs documented in research.md. If unknown, print what is missing; do not call a guessed address.
6. Scaffold web/ so npm run dev shows a TapeInvoice shell, a network banner from config, and a visible disclaimer placeholder about circuit-holder control.
7. .env.example: X_LAYER_RPC, X_LAYER_CHAIN_ID, EXPLORER_URL, ESCROW_TOKEN (optional until confirmed), ESCROW_ADDRESS (empty until deploy). No real keys.

Acceptance you must run:
- [ ] Fresh install: contracts compile (empty or MockERC20 only), web builds.
- [ ] research.md cites primary URLs; unconfirmed items are UNKNOWN.
- [ ] No invented package names in package.json.
- [ ] README states the architecture, the non-clone vs TapeFlow/CoTape, and a draft of “which TapeOut features we use.”
>>>
ACCEPTANCE:
- [ ] Monorepo builds from a clean install.
- [ ] Human has signed off research.md (RPC, chain ID, token plan, TapeOut/DeWEB path) before Phase 2 uses any address.

---

## PHASE 2: Escrow companion contract and tests (goal: full v1 state machine, ~4 days)

PROMPT:
<<<
You are the smart-contract lead for TapeInvoice. Implement the v1 escrow in /contracts using only the token, chain, and tooling confirmed in docs/research.md. If the live token is still UNKNOWN, implement against MockERC20 and keep the token address constructor-injected.

States: Draft → Funded → Submitted → Released or Refunded. Cancelled may be a distinct terminal state for mutual cancel of a funded invoice, or map to Refunded — pick one and document it.
Actions: seller createInvoice; buyer fundInvoice (ERC-20 into the contract); seller submitDelivery (delivery hash or artifact URI); buyer releaseFunds; timeout refund after dueTimestamp while Funded or Submitted; mutualCancel (both must consent; refund if funded).
Fee: constructor-set feeBps (default 50 = 0.5%) and feeRecipient; skim only on successful release. Configurable; not an official protocol fee. No multisig in v1.
Identity: each invoice stores a circuitContainerId (type from research.md). Do not implement a NAND VM. Seller and buyer EOAs must be able to act; do not require “only the circuit owner may call every function.”

Create TapeInvoiceEscrow.sol, events for every transition including fee paid, OpenZeppelin IERC20/SafeERC20/ReentrancyGuard, a narrow owner for feeRecipient only (cannot touch user funds), a full test file covering happy path, double-release, unauthorized calls, timeout too early and success, mutual cancel before and after fund, wrong token, fee math, reentrancy on release and refund, and a deploy script that writes contracts/deployments.json. Default to local/testnet; do not broadcast mainnet unless the human asks.

Acceptance you must run:
- [ ] compile + full test suite green, including the edge cases above.
- [ ] Local deploy writes deployments.json.
- [ ] docs/contracts.md explains states, callers, fee math, and that the circuit id is a binding, not a hidden VM.
>>>
ACCEPTANCE:
- [ ] Tests pass; token and fee recipient are injected, not hardcoded to an invented address.
- [ ] No unsolicited mainnet broadcast.

---

## PHASE 3: Circuit container binding (goal: a real or honestly documented TapeOut identity, ~2 days)

PROMPT:
<<<
You are integrating TapeOut, not inventing it. Using only methods confirmed in docs/research.md, add a repeatable way to obtain a circuit container on X Layer and bind its id onto a TapeInvoice invoice.

Tasks:
1. docs/tapeout-binding.md: step-by-step, with command or UI placeholders, for mint or reuse a circuit, open a container if required, and read the id the contract will store. If official tooling is UI-based, script what can be scripted and write a human checklist for the rest.
2. A small script showing how the id is passed into createInvoice. Do not call guessed factories.
3. If Phase 1 could not confirm a programmatic tape-out path, do not fake a compiler or npm package. Keep the id field, provide a fixture id for local tests, and document the official-UI fallback for the public demo.
4. Update “which TapeOut features we use”: container as escrow identity, later DeWEB hosting, companion contract for funds. Never say “safe if the wallet is stolen.”

Acceptance you must run:
- [ ] Local tests still pass with a fixture container id.
- [ ] Binding doc is accurate to Phase 1 sources; UNKNOWNs stay labeled.
- [ ] No new unverified dependencies.
>>>
ACCEPTANCE:
- [ ] createInvoice stores a container id and it appears in events/reads.
- [ ] Human knows what they must click or sign to produce a real X Layer container before the public demo.

---

## PHASE 4: No-wallet public invoice and receipt UI (goal: a layperson can open a link and understand the invoice, ~3 days)

PROMPT:
<<<
You are the frontend engineer for TapeInvoice. In /web, build the public, no-wallet invoice and receipt experience. On-chain data is the source of truth (viem public client, RPC from config). No backend.

Routes:
- / landing: short explanation, a form to open an invoice id, and a CTA to create (create may be a “connect in next phase” stub).
- /invoice/:id fully usable with no wallet: invoice id, parties, token and amount, due time, circuit container id, state timeline, delivery hash/link, fee line, explorer links from events when available, shareable/printable receipt (copy + print CSS).

Use ABI from Phase 2 artifacts. If RPC fails, show a clear error, not a fake success. Dev-only mock allowed behind a flag. Mobile-readable. Vite base config for relative paths / static export (no server-side image optimizer that breaks static hosting). Banner: “You can view this invoice without a wallet. Funding or releasing requires a wallet.”

Acceptance you must run:
- [ ] After a local test invoice exists, /invoice/:id renders correctly with the wallet disconnected.
- [ ] Timeline reflects each state.
- [ ] Receipt copies invoice id, amounts, state, delivery hash, and tx references (or an honest note if events are not indexed yet).
- [ ] npm run build succeeds with a static tree and relative paths.
>>>
ACCEPTANCE:
- [ ] No-wallet view works against local/testnet contract.
- [ ] Build is static and gateway-friendly.

---

## PHASE 5: Wallet-connected actions (goal: complete user journey, ~4 days)

PROMPT:
<<<
You are a Web3 frontend specialist. Add wallet-connect (OKX Wallet and injected wallets such as MetaMask) using the X Layer chain config from docs/research.md, not a guessed chain id, and every v1 write action.

UI:
- Seller: CreateInvoiceForm (buyer, token from config, amount, due/timeout, optional delivery-hash, circuit container id). SubmitDeliveryModal when Funded.
- Buyer: FundInvoiceButton (ERC-20 approve then fund, two-step status). ReleaseFundsButton when Submitted, showing fee and net to seller before sign, plus a short unaudited-escrow warning and the circuit-holder control warning.
- Either party: ClaimRefundButton only when timeout has passed and state is Funded or Submitted. MutualCancelButton matching the contract’s two-consent flow.
- Toasts for pending hash, success, and parsed revert reasons.
- Buttons only for the allowed caller; everyone else still sees the public receipt.
- Wrong-network banner must name X Layer and offer a switch. Do not silently use a wrong chain preset.

Acceptance you must run on a local node or documented testnet with two accounts:
- [ ] Seller creates invoice; public page shows Draft.
- [ ] Buyer approves + funds; state Funded; tokens in the contract.
- [ ] Seller submits delivery; state Submitted; hash visible with no wallet.
- [ ] Buyer releases; seller received amount minus fee; feeRecipient received fee; state Released; receipt updates.
- [ ] A second invoice can be timeout-refunded after dueTimestamp.
- [ ] A third invoice can be mutual-cancelled and refunded if funded.
>>>
ACCEPTANCE:
- [ ] Happy path and refund/cancel paths work with two wallets.
- [ ] Warnings are visible on fund/release. Still no required backend.

---

## PHASE 6: DeWEB publish, gateway, and submission copy (goal: a layperson URL + honest TapeOut write-up, ~3 days)

PROMPT:
<<<
You are the deployment engineer. Make TapeInvoice reachable as a DeWEB site and via a normal HTTPS URL, using only publish methods confirmed in docs/research.md.

Tasks:
1. Static export of web/ (relative paths), ABI and addresses from deployments.json (testnet and mainnet slots). No private keys in the repo.
2. scripts/deweb-package packs dist/ and writes a SiteRegistry / TapeKit publish checklist. Wrap a CLI only if Phase 1 confirmed it. Otherwise document official UI steps. Do not invent tapekit flags.
3. A place in the app or docs to record the published site hash / registry id once known (human may paste it).
4. HTTPS gateway: if an official TapeKit gateway pattern is documented, configure it. Also provide a boring static HTTPS fallback that still points at the same contract, and explain that the DeWEB copy is the TapeOut-hosted one.
5. Finalize docs/SUBMISSION.md for the Google Form: product, target users and reach, revenue, why users pay and stay, the approved late-payment citations (no new invented stats), access link, contract address, circuit id, which TapeOut features we use, and how this differs from TapeFlow and CoTape. docs/DEMO.md outline for a ≤3 minute video: problem, core flow, users/business model, TapeOut use.
6. README: production env, how to verify the contract address, wallet-theft / circuit-holder limitation.

Acceptance you must run:
- [ ] npm run build produces a deployable static tree.
- [ ] Publish checklist is complete; no guessed CLIs.
- [ ] SUBMISSION.md and DEMO.md are filled except for final addresses/links after human deploy and publish.
>>>
ACCEPTANCE:
- [ ] Static build is ready to host.
- [ ] Human has a precise DeWEB + gateway-fallback checklist and form copy.

---

## PHASE 7: Polish, e2e, and demo dry-run (goal: a rehearsed live path, ~3 days)

PROMPT:
<<<
You are QA and demo producer for TapeInvoice (code and scripts only — you do not record video or submit the form).

Tasks:
1. Playwright or a tight click-through checklist: create → fund → submit → release, plus a timeout-refund path, against local or testnet. Print pass/fail.
2. Receipt polish: typography, QR of the public invoice URL, explorer links, fee line, container id.
3. Amount warning on the fund button (unaudited v1 escrow) and the circuit-holder warning.
4. Finish docs/DEMO.md with exact clicks for a 3-minute walkthrough and a one-sentence TapeOut explanation a judge can repeat.
5. Fix bugs found in the dry run. Do not add cut features.

Acceptance you must run:
- [ ] Happy path and refund path succeed on the target test environment.
- [ ] A fresh browser profile with no wallet can open the receipt link and explain the state.
- [ ] DEMO.md can be read aloud in under three minutes while clicking.
- [ ] Known issues are written down; no silent failures.
>>>
ACCEPTANCE:
- [ ] Demo rehearsed; repo ready for the human tasks in non-claude-tasks.md.

---

## Risks if a phase slips

- Phase 1 unsigned: later phases guess chain IDs or tokens — stop.
- Phase 2 late: all UI and demo work blocks.
- Phase 3/6 late: demo is a testnet HTTPS site only; still document the TapeOut parts honestly, but official completeness scores will suffer without a real container and DeWEB URL.
- Phase 7 skipped: unrehearsed demo fails on camera or Demo Day.
