# Bulla: milestone escrow where your TapeOut circuit is your business account

Submission draft for X Layer TapeOut Accelerate. Form: the Google Form linked from https://web3.okx.com/xlayer/build-x-series. Deadline 7 Dec 2026, 23:59 UTC (internal target 6 Dec, `docs/SUBMISSION-CHECKLIST.md`). A human (Fluid) submits; nothing here has been submitted.

**Links (list both everywhere, demo first):**

- **One-tap demo (testnet), no wallet, about 15 s:** https://try-usebulla.vercel.app
- **App (mainnet, real USDC):** https://usebulla.vercel.app ; receipt of mainnet demo invoice #1: https://usebulla.vercel.app/#/invoice/1
- **DeWEB (secondary mirror):** https://1-2-397.tapekit.org/ ; same receipt: https://1-2-397.tapekit.org/#/invoice/1

If the form has only one URL field, put https://usebulla.vercel.app there and lead the description with the demo link (https://try-usebulla.vercel.app).

Demo video: https://youtu.be/QOdteXYtDZk. Remaining placeholder for Fluid: `[REPO-LINK-OR-PRIVATE]`. `npm run release:check` flags only leftover double-angle-bracket placeholders. Never fill a number that was not measured or a user who is not real (Terms, item 10: fabricated functionality or data means disqualification).

**One-liner:** Freelancers send a milestone invoice, the client locks USDC on X Layer, and each release pays the freelancer's TapeOut circuit (its holder, or straight into the circuit's container if the freelancer opts in), with a public receipt anyone can open without a wallet.

Late payment is routine for freelancers: Bonsai's 2025 data on over 100,000 freelancers found 29% of invoices were paid at least a day late (https://www.hellobonsai.com/blog/late-freelance-payment). Bulla flips the default. The client funds every milestone up front into an escrow contract on X Layer, the freelancer submits proof of delivery for each milestone, and the client releases each one. Anything not released by the due date is refunded to the client. Every invoice is bound to the freelancer's TapeOut circuit and verified on chain (only the circuit's holder can bill with it), and payments go to that circuit's holder or into its container, so the freelancer's receivables and on-chain activity live with the circuit. The app is a static site built to be served from that container on DeWEB.

## 1. Try it in one tap

- One-tap demo (testnet), no wallet, about 15 s: `https://try-usebulla.vercel.app`
- What happens: two demo wallets are created in the browser; a stand-in circuit is minted (TapeOut has no testnet deployment, so it is labelled "testnet stand-in for TapeOut"); a two-milestone invoice is created, funded, delivered and released, and the DemoUSD lands in the circuit's container. Every step links to its receipt read straight from the X Layer RPC (public explorers' X Layer indexes were lagging during the build), with an OKLink link as a secondary. Demo gas is paid by a small testnet-only relayer, so no key ships to the browser.
- Measured: about 15 seconds on X Layer testnet (live one-tap runs: 12 to 16 s, including 15.4 s on 25 Nov 2026, Africa/Lagos). On a local node the same 12-transaction loop takes 0.7 s in-app (664 ms) and 1.0 s from the tap (982 ms) (`e2e/judge-mode.spec.ts`, 18 Nov 2026). Use only the measured testnet number in the form. Do not cite `npm run e2e:testnet` for this figure; that runner has not been updated for the gas relayer.

## 2. Live on mainnet

| Field | Value |
| --- | --- |
| BullaEscrow v2 (X Layer, chain 196) | `0x35a7862e64b60857aDd42a8B8621DB8d9b4B5E07` |
| One-tap demo (testnet), no wallet, about 15 s | https://try-usebulla.vercel.app |
| App (mainnet, real USDC) | https://usebulla.vercel.app |
| A real receipt | https://usebulla.vercel.app/#/invoice/1 (demo invoice #1: 2 x 0.50 USDC milestones, both released, 0.995 USDC paid into the circuit container, 0.005 USDC fee; DeWEB secondary mirror: https://1-2-397.tapekit.org/#/invoice/1) |
| DeWEB (secondary mirror) | https://1-2-397.tapekit.org/ (TapeKit gateway for `1.2.397.tape`) |
| Escrow token | USDC `0xB6CEceAB302E2E4948951eE7843FC24E92933061` (Circle's X Layer address; symbol and 6 decimals probed, `docs/research.md` §2) |
| TapeOut opener / factory the escrow is bound to | `0x536adD8F30f03b69f6fbF29d425A816A0dC50106` / `0x1f09DAeFA827f02CBb40967cc91b259763760761` (official X Layer, `docs/research.md` §8) |
| Processor contract address | `0x34fd3c870DEd61b264e3E7062163EA4539F79998` (processor #397, Tapee) |
| Circuit ID | `1` |
| Circuit container | `0x52D7504EFDF73EcdCE91411B77e154CEe353241e` (opened) |
| Real invoices settled (consented counterparties) | None yet from outside users. Our own mainnet tests only (not outside users): invoice #1 https://usebulla.vercel.app/#/invoice/1 (2 x 0.50 USDC, both released into the circuit container; 0.995 USDC paid, 0.005 USDC fee); invoice #2 https://usebulla.vercel.app/#/invoice/2 (0.10 USDC, one milestone, released; our own explorer-shot test). |
| DeWEB site manifest SHA-256 | `0xc84f1bd1971b61a014e3e682dce6b4147ea8a663c9795b9f4c63ab29c404bcc6` |
| Testnet escrow and judge escrow (optional) | `0xCb72D2798139C6Bb6e6c715E6F98c83D7DC39Ea6`, `0x6ed736ce42582a749e52fe4B95d17d95Ccc4e9b4` |
| Demo video | https://youtu.be/QOdteXYtDZk |
| Code | `[REPO-LINK-OR-PRIVATE]` (repo stays private for now; Fluid has not approved making it public or issuing an access link) |

A superseded v1 escrow exists on mainnet (`docs/planning/mainnet-budget.md`). Do not link it; v2 replaces it.

## 3. How Bulla uses TapeOut and X Layer

| Feature | What Bulla does with it | On chain |
| --- | --- | --- |
| TapeOut processor `ownerOf` (TapeKit SPEC B.3) | `createInvoice` requires the caller to hold the circuit; every release re-reads the holder, so receivables follow the circuit if it changes hands | processor `0x34fd3c870DEd61b264e3E7062163EA4539F79998` (processor #397, Tapee) |
| TapeOut factory `isCPU` (B.1) | Only real TapeOut processors can be used to bill | `0x1f09DAeFA827f02CBb40967cc91b259763760761` |
| TapeOut opener `accountOf` (B.2) | The circuit's ERC-6551 container is stored per invoice; the seller can opt in to receive releases there | `0x536adD8F30f03b69f6fbF29d425A816A0dC50106` |
| Container `token()` (B.4) + factory list | Receipts show the seller's `<#ID>.2.<cpu>.tape` name, checked both ways | read-only |
| DeWEB SiteRegistry + TapeKit gateway | The static app is packaged for the circuit's container and opened through the TapeKit gateway | https://1-2-397.tapekit.org/ (secondary mirror) |
| X Layer settlement (196; testnet 1952 for judge mode) | Escrow, milestones, fees and refunds are X Layer transactions | `0x35a7862e64b60857aDd42a8B8621DB8d9b4B5E07` |
| Native USDC on X Layer | The only token the mainnet escrow accepts | `0xB6CEceAB302E2E4948951eE7843FC24E92933061` |
| OKX Wallet + explorers | OKX Wallet is the recommended connector; every tx opens an in-app receipt read from the X Layer RPC, plus an OKLink link labelled as secondary because the public X Layer indexes may lag | n/a |

Not all logic runs in a circuit: escrow and state live in a companion Solidity contract on X Layer; TapeOut provides the identity (circuit), the payout account (container) and the hosting (DeWEB). Not used: Fab X mining, TapeCode, TapeSend. The X Layer TapeSend hub is live (proxy `0xe61A9C7213a6Aa616C246a2B569e555B417b25ee`, `docs/research.md` §9) but out of scope for v2; a clean seam exists in `web/src/lib/notify.ts`.

## 4. Users and how we reach them

- **Who:** crypto-paid freelancers and small studios (design, development, writing, community work) and their clients, who get a refund guarantee they can verify.
- **First channels:** OKX Wallet, X Layer and TapeOut communities, where builders already sell work to each other.
- **Growth loop:** every invoice is a link the client must open, and every receipt has a share kit (QR, X, Telegram), so each paid invoice brings Bulla to a new client.
- **Next:** freelancer and DAO-contributor Telegram groups.
- **Current users:** none yet. No usage numbers are claimed until they exist.

## 5. Revenue and retention

- **Revenue:** 0.5% (50 bps, fixed at deploy) on each successful milestone release. Refunds, arbiter refunds and cancels are free. No subscription. The fee is Bulla's own, not an X Layer or TapeOut protocol fee. Revenue to date: none.
- **Why they pay:** the fee is smaller than the cost of one late invoice and is charged only when the freelancer gets paid; clients fund up front because the refund date is enforced by the contract.
- **Why they stay:** the circuit carries public on-chain activity (funded invoices, released milestones and volume on every receipt; activity, not a reputation score), repeat clients reuse the same flow, and receivables move with the circuit.

## 6. Built during the event

First commit: 14 Nov 2026 (`git log`, commit `de78f30`). All code and docs are new work done during the event window (16 Oct to 7 Dec 2026).

## 7. Limits

Unaudited v2 (Slither: 0 high, 0 medium); paying into the container is opt-in and wallet payout is the default, because a container only works once opened (`open()`, 0.08 OKB) and withdrawing needs the holder to call `execute` with `EXEC_FEE()` attached (verified on chain, `docs/research.md` §9; a USDC withdrawal through `execute` has not been simulated end to end); releases to an unopened container fall back to the holder; judge-mode gas is paid by a rate-limited server relayer holding a testnet-only key (no key ships in the app); judge mode uses labelled testnet stand-ins because TapeOut has no testnet deployment. Without an arbiter, the buyer can refund every unreleased milestone after the due date, including milestones the seller already submitted, so the create form recommends an arbiter and a due date with review time. A release reverts if the payee cannot receive the token (for example a USDC-blacklisted address; the fee recipient too); the milestone then stays in escrow and is still refundable to the buyer after the due date. The on-chain activity counters (`circuitStats`) count funded invoices only, but a seller can fund invoices from a wallet they control, so they show activity, not reputation.

## The problem (approved citations only)

- Bonsai's 2025 data on 100k+ freelancers: 29% of invoices were paid at least one day late. https://www.hellobonsai.com/blog/late-freelance-payment
- Remote: 85% of contractors are paid late at least sometimes, and 21% more than half the time. https://remote.com/blog/contractor-management/reversing-late-payment-culture
- IPSE (UK): about 32 to 35% of the self-employed had a client payment delay in the prior 12 months. Source: ipse.co.uk prompt-payment campaign pages.

## Product details

- The seller bills 1 to 10 milestones (label and amount each) with a TapeOut circuit they hold, a due date, an optional scope hash and an optional arbiter.
- The buyer funds the whole invoice in one transaction and accepts the arbiter if one was proposed.
- The seller submits a delivery hash and optional link per milestone; the buyer releases each milestone (the 0.5% fee applies per release). The arbiter, if any, can release or refund a submitted milestone and takes no fee.
- After the due date the buyer can reclaim every unreleased milestone; a mutual cancel returns the unreleased remainder. Released milestones stay paid.
- Payout: the circuit's current holder by default, or the circuit's container if the seller opted in and the container is opened (otherwise the holder). The receipt explains how to withdraw from the container (`execute` with `EXEC_FEE()`, or the official tapeout.net UI).
- The receipt shows milestones, amounts and fees, payout target, circuit and container, arbiter, timeline with a tx link per step (in-app RPC receipt plus OKLink), the seller's history, a QR code and share links. No wallet, no backend, no account.

## Mapping to the five official judging criteria

Source: https://web3.okx.com/xlayer/build-x-series (five criteria, re-read 18 Nov 2026 per `docs/planning/win-audit/WIN-AUDIT.md` §2).

| Criterion | Where Bulla answers it |
| --- | --- |
| User Value and Commercial Potential | Cited late-payment pain; real multi-milestone escrow with an optional arbiter; 0.5% only on release; receipt share loop; no outside-user invoices yet (our own mainnet test receipts: https://usebulla.vercel.app/#/invoice/1 and https://usebulla.vercel.app/#/invoice/2, labelled as our tests) |
| Innovation | "Your TapeOut circuit is your business account": billing is gated by `ownerOf`, payouts follow the circuit or land in its container, and the circuit carries public on-chain activity |
| Ecosystem Integration | TapeOut processor, factory, opener and container reads on X Layer; DeWEB and the TapeKit gateway; native USDC; OKX Wallet; in-app RPC receipts, with OKLink as a secondary link (its X Layer index may lag) |
| Product Readiness and UX | One tap runs the full loop on X Layer testnet (about 15 s, live runs 12 to 16 s); live mainnet escrow and receipts; 91 Hardhat tests, 17 E2E tests, Slither notes |
| Demo Video (up to 3 minutes: problem, core features, target users and business model, how it uses TapeOut) | https://youtu.be/QOdteXYtDZk, script in `docs/DEMO-SCRIPT.md` (longer cut in `docs/DEMO.md`): the Released moment and measured ~15 s timer, in-app RPC receipt of the payout, our own mainnet invoice #1, the business model on screen |

## Risks and honesty notes

- `BullaEscrow` v2 is unaudited.
- Whoever holds the TapeOut circuit controls its container and receives future releases. This is not safe if that wallet is stolen.
- Seller actions (submit, cancel) stay with the address that created the invoice; only payouts follow the circuit.
- The buyer can refund unreleased milestones after the due date even if they were submitted; sellers should set due dates with review time, or name an arbiter.
- Cancel consent given on a draft is cleared when the buyer funds, and either party can withdraw its consent (`revokeCancelConsent`) while the invoice is open.
