# Bulla — Claude Code mega-prompt

Paste everything between the markers into Claude Code, run from a clone of the private repo:

```
gh repo clone levithefirst/bulla && cd bulla
```

Start from the current tree. Do not wipe existing docs, the logo, or git history.

<<<
You are a senior Web3 engineer working in the existing private repo levithefirst/bulla (local path may be /workspace/bulla or a clone). The product brand is **Bulla** (internal codename TapeInvoice — use "Bulla" in all user-facing UI, README, and docs; do not put "TapeInvoice" in the UI).

TODAY: Saturday 14 November 2026. DEADLINE: 7 December 2026, 23:59 UTC. Event: X Layer TapeOut Accelerate (https://web3.okx.com/xlayer/build-x-series). Submission is a Google Form: access link and/or processor contract address plus circuit ID; product, users/reach, revenue, why users pay and stay; optional demo video ≤ 3 minutes.

Run this entire brief autonomously, without stopping for a human between sections. If a fact is unconfirmed, write UNKNOWN and continue with a clearly named placeholder. At the end, write docs/HANDOFF.md listing exactly what you could not do.

## Current repo state (do not assume an empty folder)

Branch main, already bootstrapped. Present today (14 Nov 2026):
- README.md — product pitch, architecture one-liner, planning-doc index, unaudited / circuit-holder warning. Keep and then update when the monorepo exists.
- .gitignore — already ignores node_modules, .env, .env.*, out, cache, broadcast, dist; allows .env.example. Keep and extend if needed, never un-ignore secrets.
- assets/logo.png — keep and use in the UI/README.
- docs/planning/ — prior research, competition, verdict, phased prompts, non-Claude tasks, fanout transcripts. Keep all of it. Treat docs/planning/research.md as leads to re-verify, not as authority.
- docs/handoff/phase-1.md — a paste-ready Phase 1 prompt that has NOT been executed. The monorepo scaffold does not exist yet. There is no contracts/, web/, scripts/, or .env.example.

## Product (locked)

Milestone invoice + escrow on X Layer. Flow: Draft → Funded → Submitted → Released / Refunded (time-lock refund). Also mutual cancel: both parties consent; refund if funded.

Companion Solidity contract holds funds and state. A TapeOut circuit container is the escrow identity and the DeWEB home of the static app. Public no-wallet receipt link. No backend. No TapeSend. No bridges. Not CoTape (miner designer/funder escrow), not TapeFlow (generic payment suite), not a token launch, not a miner desk.

v1 contract actions: seller createInvoice; buyer fundInvoice (ERC-20 into the contract); seller submitDelivery (delivery hash or artifact URI); buyer releaseFunds; timeout refund after dueTimestamp while Funded or Submitted; mutualCancel. Fee: constructor-set feeBps default 50 (0.5%) and feeRecipient; skim only on successful release; not an official protocol fee. Each invoice stores a circuitContainerId. Seller and buyer EOAs act; do not require “only the circuit owner may call every function.” Do not implement a NAND VM. OpenZeppelin IERC20, SafeERC20, ReentrancyGuard. Owner may change feeRecipient only, never touch user funds. Foundry preferred (else Hardhat — pick one and stick to it). Token address is constructor-injected. If a live X Layer ERC-20 is unconfirmed, use MockERC20 for local/testnet and document a mainnet token decision gate.

UI: Vite + React + TypeScript + viem/wagmi, static-export, relative paths. Landing + /invoice/:id no-wallet receipt (timeline, amounts, fee, delivery hash, container id, explorer links, copy/print). Wallet-connect for writes (OKX Wallet + injected, e.g. MetaMask). Approve-then-fund two-step. Visible warnings: unaudited v1, and “whoever holds the circuit controls the container — this is not safe if that wallet is stolen.” Wrong-network banner names X Layer.

## Hard rules

- Official docs are the only authority for chain IDs, RPCs, explorers, token addresses, TapeOut factories, SiteRegistry, and CLIs. After opening a primary source, if still unconfirmed, write UNKNOWN in docs/research.md (a new verified file; do not overwrite docs/planning/research.md) and use a clearly named placeholder.
- Never invent @xlayer/tapout-sdk, a token called XUSD, tapekit flags, or a chain ID (including 195).
- Never commit keys, seeds, .env, or wallet files. Never print secrets.
- Commit as levithefirst <304593143+levithefirst@users.noreply.github.com>. Keep the repo private. You may commit locally in logical commits. Push only to the existing origin (levithefirst/bulla) if that remote is still configured and still private; never change visibility; never force-push; never add a new remote.
- Do not broadcast mainnet. You may write testnet and mainnet deploy scripts. Do not use a live private key. Do not ask the environment for a seed. A human will run signed deploys later.
- Use the Bulla logo at assets/logo.png.

Approved pain-point citations for docs/SUBMISSION-DRAFT.md — invent no new stats:
- Bonsai 2025, 100k+ freelancers, 29% of invoices paid at least one day late: https://www.hellobonsai.com/blog/late-freelance-payment
- Remote: 85% paid late at least sometimes; 21% more than half the time: https://remote.com/blog/contractor-management/reversing-late-payment-culture
- IPSE UK: about 32–35% had a client payment delay in the prior 12 months: ipse.co.uk prompt-payment campaign pages

## Work, in order (do not stop between these)

1) Research verification. Open official X Layer and TapeOut / DeWEB / TapeKit / Fab X docs. Write docs/research.md with source URLs for: mainnet and testnet chain IDs, official RPC(s), official explorer; at least one ERC-20 a normal wallet can hold and transfer (prefer a widely used stablecoin if one exists) — symbol, decimals, address, explorer link — or UNKNOWN plus a MockERC20 plan; how to mint or reuse a TapeOut circuit on X Layer, open a container, and which official apps/docs apply (commands or UI steps only if confirmed); how to publish a static site to DeWEB / SiteRegistry and how a layperson opens it (TapeKit reader and any official HTTPS gateway). Architecture paragraph: contract holds tokens + state; each invoice stores a circuit container id; UI is a static DeWEB app; control follows the circuit holder.

2) Monorepo scaffold. Create contracts/, web/, scripts/. Root and workspace package/foundry config so a fresh clone can install, compile contracts, and build the web app. Add .env.example with X_LAYER_RPC, X_LAYER_CHAIN_ID, EXPLORER_URL, ESCROW_TOKEN (optional until confirmed), ESCROW_ADDRESS (empty until deploy), and no real keys. scripts/probe-network.ts: given RPC from env, print chain id and block number; if a token address is set, symbol/decimals/a balance call; fail loudly if env is missing. scripts/probe-tapeout.ts: attempt only TapeOut read APIs documented in docs/research.md; if unknown, print what is missing and do not call a guessed address.

3) Contracts + tests. Implement contracts/src/BullaEscrow.sol (or the Foundry/Hardhat equivalent path). Invoice struct includes id, seller, buyer, token, totalAmount, deliveryHash, dueTimestamp, state, circuitContainerId, and whatever mutual-cancel consents need. Events for every transition, including fee paid. Full tests: happy path, double-release, unauthorized calls, timeout too early and success, mutual cancel before and after fund, wrong token, fee math, reentrancy on release and refund. docs/contracts.md explains states, callers, fee math, and that the circuit id is a binding, not a hidden VM.

4) Deploy scripts. Local/anvil script that writes contracts/deployments.json (network name, escrow, token, feeRecipient, feeBps). A testnet script and a mainnet script that read RPC and a key from env, with comments that a human must supply the key later. The scripts must refuse to run if a key is missing; they must never invent an address. Default dry-run or simulate when no key is present.

5) Circuit-container binding. docs/tapeout-binding.md: step-by-step, sourced from research, for mint or reuse a circuit, open a container if required, and read the id createInvoice will store. Script what can be scripted; if programmatic tape-out is UNKNOWN, do not fake a compiler or npm package — keep the id field, a fixture id for local tests, and a human checklist for the official UI. Update the draft of “which TapeOut features we use.”

6) Full UI in web/. Landing with short explanation, logo, open-invoice form, and create-invoice CTA. /invoice/:id works with no wallet. Write actions: CreateInvoiceForm (buyer, token from config, amount, due/timeout, optional delivery-hash, circuit container id); SubmitDeliveryModal; FundInvoiceButton (approve then fund); ReleaseFundsButton (show fee, net to seller, unaudited warning, circuit-holder warning); ClaimRefundButton only when timeout has passed and state is Funded or Submitted; MutualCancelButton matching the contract’s two-consent flow. Toasts for pending hash, success, and parsed revert reasons. Action buttons only for the allowed caller. Wrong-network banner names X Layer and offers a switch. If RPC fails, show a clear error, not a fake success. A dev-only mock is allowed behind a flag.

7) DeWEB / static build. Vite relative-path static export (no server-side image optimizer that breaks static hosting). scripts/deweb-package packs dist/ and writes a SiteRegistry / TapeKit publish checklist. Wrap a CLI only if research confirmed it; otherwise document official UI steps. Do not invent tapekit flags. Provide a boring HTTPS static-host fallback checklist that still points at the same contract, and explain that the DeWEB copy is the TapeOut-hosted one. A place in the app or docs to record the published site hash / registry id once known.

8) E2E tests. Playwright (or equivalent) against a local node or documented testnet, with two accounts from a local test key file that is gitignored (generate throwaway anvil keys; never use a human seed): create → fund → submit → release, and a timeout-refund path. Print pass/fail. Do not require a network faucet to make local e2e green.

9) Docs. Update README: how to install, test, run, build, env vars, architecture, non-clone vs TapeFlow/CoTape, which TapeOut features we use, unaudited and circuit-holder warnings, planning-doc index. docs/SUBMISSION-DRAFT.md: product, users and reach, revenue (fee on release), retention, the three approved citations, placeholders for access link, contract address, circuit id, and TapeOut features. docs/DEMO.md plus a ≤3 minute video script: problem, core flow, users and business model, TapeOut use, exact clicks. Invent no new stats.

10) docs/HANDOFF.md. Ordered list of everything you could not do (research still UNKNOWN, unsigned deploys, circuit mint, DeWEB publish, funding, video, form submit, etc.), with placeholders and what “done” looks like for a human or Grok Bot assistant. Do not claim those tasks are finished.

## Acceptance checklist (run all before you stop)

- [ ] Fresh clone path: install, contracts compile, full contract tests pass, web builds to a static tree with relative paths.
- [ ] docs/research.md cites primary URLs; every unconfirmed item is UNKNOWN; no invented package names in package.json.
- [ ] Local deploy script writes deployments.json without a human mainnet key.
- [ ] Testnet/mainnet scripts exist, refuse to run without a key, and were not used to broadcast mainnet.
- [ ] /invoice/:id renders a fixture or local invoice with the wallet disconnected.
- [ ] E2E happy path and timeout-refund path pass on a local node.
- [ ] SUBMISSION-DRAFT.md and DEMO.md exist; only the approved payment-delay citations are used as stats.
- [ ] Warnings (unaudited; circuit-holder control) are visible on fund/release and in the README.
- [ ] docs/HANDOFF.md lists remaining human/assistant work. No secrets in git.

When you commit, use the author above, exclude .env and keys, and mention in the last commit message that unsigned deploys and UNKNOWNs are in docs/HANDOFF.md.
>>>
