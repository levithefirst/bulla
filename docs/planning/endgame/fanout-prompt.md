You are a ruthless shipping lead for Bulla, a private repo already in progress. Do not invent a new product. Do not write application code in your answer. Produce two artifacts only: (1) one self-contained mega-prompt that Claude Code will paste and run autonomously, and (2) a complete ordered list of everything Claude Code cannot do from now until hackathon submission, split by who can do it.

TODAY: Saturday 14 November 2026. DEADLINE: 7 December 2026, 23:59 UTC (~23 days). Event: X Layer TapeOut Accelerate, https://web3.okx.com/xlayer/build-x-series. Submission is a Google Form: access link and/or processor contract address plus circuit ID; product, target users/reach, revenue model, why users pay and stay; optional demo video ≤ 3 minutes.

PRODUCT (locked). Brand is **Bulla** in all user-facing UI, README, and docs. Internal codename was TapeInvoice; do not put “TapeInvoice” in the UI. Milestone invoice + escrow on X Layer. Flow: Draft → Funded → Submitted → Released / Refunded (time-lock refund). Also: mutual cancel (both parties consent; refund if funded). Companion Solidity contract holds funds and state. A TapeOut circuit container is the escrow identity and the DeWEB home of the static app. Public no-wallet receipt link. No backend. No TapeSend. No bridges. Not CoTape, not TapeFlow, not a token launch, not a miner desk.

v1 contract: seller createInvoice; buyer fundInvoice (ERC-20 into the contract); seller submitDelivery (delivery hash or artifact URI); buyer releaseFunds; timeout refund after dueTimestamp while Funded or Submitted; mutualCancel. Fee: constructor-set feeBps default 50 (0.5%) and feeRecipient; skim only on successful release; not an official protocol fee. Each invoice stores a circuitContainerId. Seller and buyer EOAs act; do not require “only the circuit owner may call every function.” Do not implement a NAND VM. OpenZeppelin IERC20/SafeERC20/ReentrancyGuard; owner may change feeRecipient only, never user funds. Foundry preferred (else Hardhat, pick one). Token address constructor-injected; if the live X Layer ERC-20 is unconfirmed, use MockERC20 for local/testnet and a mainnet token decision gate.

UI: Vite + React + TypeScript + viem/wagmi, static-export, relative paths. Landing + /invoice/:id no-wallet receipt (timeline, amounts, fee, delivery hash, container id, explorer links, copy/print). Wallet-connect for writes (OKX Wallet + injected, e.g. MetaMask). Approve-then-fund two-step. Visible warnings: unaudited v1, and “whoever holds the circuit controls the container — not safe if that wallet is stolen.” Wrong-network banner names X Layer.

HARD RULES for the mega-prompt (must appear inside it): Official docs are the only authority for chain IDs, RPCs, explorers, token addresses, TapeOut factories, SiteRegistry, and CLIs. If unconfirmed after opening a primary source, write UNKNOWN in docs/research.md and use a clearly named placeholder. Never invent @xlayer/tapout-sdk, a token called XUSD, tapekit flags, or a chain ID (including 195). Never commit keys, seeds, or .env. Commit as levithefirst <304593143+levithefirst@users.noreply.github.com>. Keep the repo private. Use “Bulla” in the UI. Existing docs/planning/ and docs/handoff/ stay; treat docs/planning/research.md as leads to re-verify, not authority. Do not broadcast mainnet. Testnet deploy scripts may be written; actually sending a signed testnet or mainnet tx is not Claude’s job unless a human later runs the script with their key (the prompt must not ask Claude to use a live private key). Finish by writing docs/HANDOFF.md listing exactly what Claude could not do, with placeholders.

APPROVED PAIN-POINT CITATIONS (use in SUBMISSION-DRAFT.md; invent no new stats):
- Bonsai 2025, 100k+ freelancers, 29% of invoices paid at least one day late: https://www.hellobonsai.com/blog/late-freelance-payment
- Remote: 85% paid late at least sometimes; 21% more than half the time: https://remote.com/blog/contractor-management/reversing-late-payment-culture
- IPSE UK: about 32–35% had a client payment delay in the prior 12 months: ipse.co.uk prompt-payment campaign pages

CURRENT REPO STATE (2026-11-14, Africa/Lagos). Path: /workspace/bulla. Remote: https://github.com/levithefirst/bulla.git, branch main, working tree clean, 4 commits: de78f30 Bootstrap Bulla: README and planning docs; 7896c08 Use v2 research notes; e1a3f85 Add Phase 1 Claude Code handoff; 6dafc36 Add Bulla logo. There is NO contracts/, web/, scripts/, or .env.example yet. Present files:
- README.md (product pitch, architecture one-liner, planning-doc index, unaudited / circuit-holder warning)
- .gitignore (node_modules, .env, out, cache, broadcast, dist; allows .env.example)
- assets/logo.png
- docs/planning/ (verdict.md, competition.md, research.md, claude-code-prompts.md, non-claude-tasks.md, fanout/)
- docs/handoff/phase-1.md (a paste-ready Phase 1 prompt that has NOT been executed — the monorepo scaffold does not exist)
Claude Code must start from this state, not from an empty folder, and must not wipe existing docs or the logo.

WHAT THE MEGA-PROMPT MUST COVER, in one run, without stopping for a human between phases: research verification (docs/research.md with sources and UNKNOWNs); monorepo scaffold; contracts + full tests + local deploy script writing deployments.json; testnet deploy scripts (no live key); circuit-container binding docs/scripts with official-UI fallback if programmatic tape-out is UNKNOWN; full UI (landing, receipt, all write actions); DeWEB/static build + publish checklist (no invented CLI); e2e tests (Playwright or equivalent) for create→fund→submit→release and timeout-refund on local/testnet; README; docs/SUBMISSION-DRAFT.md; docs/DEMO.md plus a ≤3 minute video script; docs/HANDOFF.md of everything it could not do. Include a single end-to-end acceptance checklist Claude must run before stopping.

(1) Output the mega-prompt as one copy-paste-ready block between <<< and >>>. It must be self-contained (do not tell Claude to go read the fan-out). It should sequence work internally but not ask the human to come back between phases.

(2) After the mega-prompt, output:

NON-CLAUDE TASKS (ordered, from now to submission):

GROK BOT CAN DO:
- <task>: when; exact done-criteria. These are things Claude Code cannot do but a Grok Bot assistant can: browser, web research, faucets, sign-ups via memequant@mail.grokbot.com, GitHub, docs. Grok Bot must never handle seeds or production private keys, and must never submit the official Google Form as Fluid.

FLUID ONLY (by hand):
- <task>: when; exact done-criteria. Only Fluid: wallet signing, funding from Fluid’s wallets, mainnet deploy signature, TapeOut circuit minting / container open if it requires a signed official UI, demo video recording, final Google Form submit, eligibility confirmation, Demo Day attendance.

Do not invent official addresses, faucet URLs, or form URLs; if unknown, say “confirm from official docs” in the done-criteria. No preamble outside these two sections.
