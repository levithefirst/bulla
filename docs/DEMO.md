# Bulla demo (video ≤ 3 minutes)

The video is optional for the form but worth doing. A human records it; nothing here has been recorded. Stats used are only the approved citations in `docs/SUBMISSION-DRAFT.md`.

## Setup before recording

- Escrow deployed on X Layer (or testnet, said out loud on camera) and the published DeWEB build points at it.
- Two browser profiles: **Seller** (OKX Wallet with a small OKB balance for gas) and **Buyer** (OKX Wallet or MetaMask with OKB for gas and at least 25 USDC).
- The seller's TapeOut circuit container address copied (from `npm run probe:tapeout`).
- One invoice already released (for the receipt shot) and one Funded invoice whose due date is a few minutes away, or use the local stack below for the refund path.
- Screen at 1280×800 or larger, browser zoom 110%, notifications off.

Local fallback (no mainnet funds): `npm run node`, `npm run deploy:local`, `VITE_BULLA_NETWORK=localhost npm run dev`, and import two Hardhat dev accounts into MetaMask. Say on camera that it is a local chain.

## Script and exact clicks

| Time | Screen | Say | Click / do |
| --- | --- | --- | --- |
| 0:00–0:20 | Landing page | "Freelancers get paid late all the time. Bonsai's 2025 data on over 100,000 freelancers found 29% of invoices paid at least a day late, and Remote reports 85% of contractors are paid late at least sometimes. Bulla fixes the default: the client funds first." | Show the landing hero and the four-step flow. |
| 0:20–0:50 | Seller profile → **Create an invoice** | "I'm the freelancer. I enter my client's address, 25 USDC, a due date, and my TapeOut circuit container. That container is my on-chain identity and it hosts this very app on DeWEB." | Click **Connect wallet → OKX Wallet**, approve. Fill **Buyer address**, **Amount** `25`, **Due date** (+7 days), **Circuit container id** (paste), **Description** `Logo, milestone 1`. Point at the two warnings. Click **Create invoice**, sign. Land on `#/invoice/N`. |
| 0:50–1:05 | Receipt, then copy link | "This receipt is public. My client needs no account to see it." | Click **Copy receipt link**. Paste into a private window with no wallet: receipt renders, status **Draft**. |
| 1:05–1:35 | Buyer profile on the receipt | "As the client I approve USDC, then fund. Two clicks. The money now sits in the escrow contract." | **Connect wallet**. In **Fund this invoice**: click **1 · Approve 25 USDC**, sign; click **2 · Fund 25 USDC**, sign. Status → **Funded**; timeline shows the tx link. |
| 1:35–1:55 | Seller profile | "I deliver and record a hash of the file plus a link." | Reload. **Submit delivery…** → type `logo-final.zip` in **Delivery hash**, paste a link in **Artifact URI** → **Submit**, sign. Status → **Submitted**. |
| 1:55–2:15 | Buyer profile | "The client sees exactly what the seller gets: 24.875 USDC after a 0.5% fee. Release." | Reload. In **Release funds**, point at fee and net and both warnings. Click **Release … to seller…** → **Confirm release (irreversible)**, sign. Status → **Released**. |
| 2:15–2:30 | Second invoice (pre-made, past due) or local chain | "If the client never releases, nobody is stuck: after the due date the client can take a full refund." | Open the Funded, past-due invoice as buyer → **Claim refund**, sign → **Refunded**. |
| 2:30–2:50 | Receipt + footer, then gateway tab | "Business model: 0.5% only on successful release, nothing on refunds. TapeOut: each invoice is bound to the seller's circuit container, and the app is published into that container on DeWEB, opened here through the TapeKit gateway. No backend." | Show the **Circuit container id** row with explorer link, the footer's DeWEB name, the gateway URL bar. |
| 2:50–3:00 | Landing | "Bulla: milestone escrow invoices on X Layer. v1 is unaudited, and whoever holds the circuit controls its container, so keep that wallet safe." | End on the logo. |

## After recording

- Trim to ≤ 3:00, export 1080p, upload as unlisted, and put the link in `docs/SUBMISSION-DRAFT.md` (`<<VIDEO_URL>>`).
- Do not show seed phrases, private keys, or the wallet's full account list on screen.
