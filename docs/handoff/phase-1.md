> **Status (14 Nov 2026):** executed. The scaffold, contract, UI, e2e and docs now exist; remaining human work is in `docs/HANDOFF.md`.

# Phase 1 Claude Code prompt (Bulla)

Paste everything between the markers into Claude Code, run from a clone of the private repo:

```
gh repo clone levithefirst/bulla && cd bulla
```

<<<
Context: you are working in the existing private repo levithefirst/bulla. The product brand is **Bulla** (internal codename TapeInvoice; use "Bulla" in all user-facing UI, README, and docs). The repo already has README.md, .gitignore, assets/, and docs/planning/ (prior research, competition, and the full phased plan in docs/planning/claude-code-prompts.md). Read docs/planning/ first, keep it, and treat docs/planning/research.md as leads to re-verify, not as authority. Commit as levithefirst <304593143+levithefirst@users.noreply.github.com>. Never commit keys or seeds. Commit and push at the end of the phase.

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
>>>

When done, report back: the confirmed chain IDs, RPC, explorer, escrow token plan, the TapeOut/DeWEB path, and every item still UNKNOWN.
