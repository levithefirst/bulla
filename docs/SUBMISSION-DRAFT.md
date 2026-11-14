# Bulla: X Layer TapeOut Accelerate submission draft

Form: Google Form linked from https://web3.okx.com/xlayer/build-x-series. Deadline 7 Dec 2026, 23:59 UTC. A human submits; nothing here has been submitted.

Placeholders are UPPER_CASE names in double angle brackets. Replace every one before submitting; `npm run release:check` lists any that remain.

## Links and identifiers

| Field | Value |
| --- | --- |
| Access link (DeWEB, canonical) | `<<DEWEB_GATEWAY_URL>>` (TapeKit gateway URL for `<<CIRCUIT_ID>>.2.<<PROCESSOR_NUMBER>>.tape`) |
| HTTPS mirror (optional) | `<<HTTPS_MIRROR_URL>>` |
| Judge mode (testnet, one tap) | `<<JUDGE_URL>>` |
| Sample receipt | `<<DEWEB_GATEWAY_URL>>#/invoice/<<DEMO_INVOICE_ID>>` |
| BullaEscrow contract (X Layer, chain 196) | `<<ESCROW_ADDRESS_MAINNET>>` |
| Escrow token | USDC `0xB6CEceAB302E2E4948951eE7843FC24E92933061` (Circle's X Layer address; confirm with `npm run probe:network` before submitting) |
| Processor contract address | `<<TAPEOUT_PROCESSOR_ADDRESS>>` |
| Circuit ID | `<<CIRCUIT_ID>>` |
| Circuit container | `<<CONTAINER_ADDRESS>>` |
| DeWEB site manifest SHA-256 | `<<SITE_MANIFEST_SHA256>>` (from `deweb-out/manifest.json`) |
| Testnet escrow (optional) | `<<ESCROW_ADDRESS_TESTNET>>` |
| Demo video | `<<VIDEO_URL>>` |
| Code | private repository; access on request |

## One-liner

Bulla is a milestone invoice with on-chain escrow on X Layer: the client funds in USDC, the freelancer submits the delivery, the client releases, and a time-lock refunds the client if nothing is released. Every invoice has a public receipt anyone can open without a wallet, served from the seller's TapeOut circuit container on DeWEB.

## Product

- Seller (freelancer) creates an invoice: buyer address, amount, due date, optional agreed-deliverable hash, and the TapeOut circuit container the invoice is bound to.
- Buyer (client) approves and funds. Funds sit in the `BullaEscrow` contract, not with either party.
- Seller submits a delivery hash and optional link (IPFS, HTTPS, or a `tape://` site).
- Buyer releases: the seller receives the amount minus a 0.5% fee. If not released by the due date, the buyer reclaims the full amount. Both parties can agree to cancel at any point before close.
- The receipt page shows status, amounts, fee, timeline with explorer links, delivery hash, and the container id. It can be copied and printed.
- No backend and no accounts: the app is a static site; all state is on X Layer.

## The problem (approved citations only)

Late payment is routine for freelancers and contractors:

- Bonsai's 2025 data on 100k+ freelancers: 29% of invoices were paid at least one day late. https://www.hellobonsai.com/blog/late-freelance-payment
- Remote: 85% of contractors are paid late at least sometimes, and 21% more than half the time. https://remote.com/blog/contractor-management/reversing-late-payment-culture
- IPSE (UK): about 32–35% of the self-employed had a client payment delay in the prior 12 months. Source: ipse.co.uk prompt-payment campaign pages.

Escrow changes the default: the money is committed before work starts, and the release rule is public.

## Target users and how we reach them

- Primary: freelancers and small studios already paid in stablecoins (designers, developers, writers, community managers) who work with crypto-native clients.
- Secondary: their clients, who get a refund guarantee they can verify without trusting the freelancer.
- Reach: every invoice is a share link the client must open, so each paid invoice puts Bulla in front of a new client; X Layer and OKX Wallet communities; crypto freelancer groups and DAO contributor channels; the TapeOut ecosystem, where DeWEB site builders already sell work to each other.
- Current users: `<<USER_COUNT_OR_NONE_YET>>`. No usage numbers are claimed in this draft.

## Revenue

- 0.5% fee (50 bps, set at deploy) skimmed only when the buyer releases funds. No fee on refunds or cancels, no subscription.
- The fee is Bulla's own and goes to a fee-recipient address; it is not an X Layer or TapeOut protocol fee.
- Revenue to date: `<<REVENUE_TO_DATE_OR_NONE>>`.

## Why users pay and stay

- The fee is smaller than the cost of one late invoice, and it only applies when the deal completes.
- Clients get a hard refund date, so they are willing to fund up front.
- Repeat work: one invoice per milestone, so ongoing clients generate a stream of invoices.
- The receipt is a durable, public record of completed paid work that a freelancer can link in a portfolio.
- No account to lose and no server to go down: the app and records live on X Layer.

## How Bulla uses X Layer (mirror of the README section)

X Layer is the core loop: every lock, delivery and release is an X Layer transaction. Each row is wired in the code; before submitting, update "status" to what is live (`docs/HANDOFF.md`). Sources: `docs/research.md` §1 to §3 and §7.

| # | X Layer / OKX feature | What is wired | Where | Status |
| --- | --- | --- | --- | --- |
| 1 | **X Layer settlement** (mainnet 196, testnet 1952) | `BullaEscrow` holds funds and state on X Layer; the app reads every receipt straight from an X Layer RPC; the judge-mode loop runs on testnet 1952 | `contracts/`, `web/src/config.ts`, `web/src/judge/` | Code and deploy scripts done; testnet and mainnet deploys pending (human) |
| 2 | **OKX Wallet** as the first-class wallet | Listed first and marked "Recommended on X Layer"; adds or switches to the X Layer network; "Get OKX Wallet" link when not installed; any other injected wallet still works | `web/src/lib/wallet.tsx`, `web/src/components/Wallet.tsx` | Done (official provider-name doc not found; see research §7) |
| 3 | **OKX explorer deep links** on every tx | Toasts, the receipt timeline, every judge-mode step and every address link open the OKX X Layer explorer | `web/src/config.ts` (`explorerTx`, `explorerAddress`), `web/src/judge/JudgePage.tsx` | Done; mainnet `/tx/` path confirmed, testnet path to confirm on first click |
| 4 | **Native USDC on X Layer** for real mode | Real-token escrow is bound to Circle's X Layer USDC (`0xB6Ce…3061`, 6 decimals probed); judge mode uses valueless DemoUSD instead | `contracts/deployments.json`, `contracts/scripts/deploy-xlayer.ts` | Token confirmed; escrow deploy pending |
| 5 | **TapeOut circuit, container and DeWEB hosting** | Every invoice stores the seller's TapeOut container; mainnet receipts show the seller's `<#ID>.2.<cpu>.tape` name; the app is packaged for the container's SiteRegistry site | `contracts/contracts/BullaEscrow.sol`, `shared/tapeoutCore.ts`, `scripts/deweb-package.ts` | Wired; circuit mint and DeWEB publish pending (human) |

How this maps to the official judging criteria:

- **User value and commercial potential.** Late payment is a common freelancer problem (see "The problem" above). Settlement in native USDC on X Layer (rows 1, 4) means the client funds up front and the freelancer is paid on release; Bulla earns 0.5% only on successful releases.
- **Innovation.** The escrow's identity and its public receipt live in the seller's TapeOut container on DeWEB (row 5), not on a server; judge mode shows a full escrow loop with no wallet setup, in one tap (row 1).
- **Ecosystem integration.** Five X Layer and OKX pieces are used together: X Layer settlement, OKX Wallet, the OKX explorer, native USDC, and TapeOut container plus DeWEB (rows 1 to 5).
- **Product readiness and UX.** One tap from the landing page runs lock, deliver and release on X Layer testnet, with an OKX explorer link per step; the local acceptance test does it in under a second (limit 10 s). Receipts need no wallet; real mode uses OKX Wallet (rows 2, 3).

Judge-mode link for judges (testnet, one tap): `<<JUDGE_URL>>`.

Not all logic runs in a circuit: escrow and state live in a companion Solidity contract on X Layer; the TapeOut container is the identity and the hosting home. Not used: TapeSend, Fab X mining, TapeCode.

## Risks and honesty notes

- `BullaEscrow` is unaudited v1.
- Whoever holds the TapeOut circuit controls its container. This is not safe if that wallet is stolen. Funds are governed by the escrow rules, not by the circuit.
- The buyer can refund after the due date even after a delivery was submitted; sellers should set due dates with review time.
