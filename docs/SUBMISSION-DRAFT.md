# Bulla: X Layer TapeOut Accelerate submission draft

Form: Google Form linked from https://web3.okx.com/xlayer/build-x-series. Deadline 7 Dec 2026, 23:59 UTC. A human submits; nothing here has been submitted.

Placeholders are UPPER_CASE names in double angle brackets. Replace every one before submitting; `npm run release:check` lists any that remain.

## Links and identifiers

| Field | Value |
| --- | --- |
| Access link (DeWEB, canonical) | `<<DEWEB_GATEWAY_URL>>` (TapeKit gateway URL for `<<CIRCUIT_ID>>.2.<<PROCESSOR_NUMBER>>.tape`) |
| HTTPS mirror (optional) | `<<HTTPS_MIRROR_URL>>` |
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

## Which TapeOut features we use

| Feature | Use in Bulla | Status at submission |
| --- | --- | --- |
| Circuit container | Each invoice stores the seller's container id (`circuitContainerId`); receipts link it | `<<DONE / PENDING>>` (contract and UI done) |
| DeWEB / SiteRegistry | The Bulla app is published into the container's on-chain site | `<<DONE / PENDING>>` |
| TapeKit gateway | Laypeople open the app and receipts via the gateway, no install | `<<DONE / PENDING>>` |
| TapeOut read APIs on X Layer | `probe:tapeout` derives and checks the container (factory, opener, SiteRegistry, DomainBinding) | implemented |

Not all logic runs in a circuit: escrow and state live in a companion Solidity contract; the circuit container is the identity and the hosting home. Not used: TapeSend, Fab X mining, TapeCode.

## Risks and honesty notes

- `BullaEscrow` is unaudited v1.
- Whoever holds the TapeOut circuit controls its container. This is not safe if that wallet is stolen. Funds are governed by the escrow rules, not by the circuit.
- The buyer can refund after the due date even after a delivery was submitted; sellers should set due dates with review time.
