# Bulla demo video (≤ 3:00)

The video opens on a live judge-mode escrow release within the first 10 seconds: no intro slides, no logo sting. A human (Fluid) records it; nothing here has been recorded. The only statistics allowed are the three approved citations in `docs/SUBMISSION-DRAFT.md`.

## Before recording

- **Judge build live on X Layer testnet** (HANDOFF step 3b): `xlayerTestnet.judge` deployed, gas tank funded by Grok Bot from the official faucet, judge site hosted. Open it once off camera and run the demo, so you know the tank has gas.
- **Fresh browser profile** for the take (no wallet extension needed for judge mode). Zoom 110%, 1280×800 or larger, notifications off.
- **Second tab:** the OKX explorer, ready to receive a tx link.
- **Third tab (for real mode):** a profile with OKX Wallet, a small OKB balance and a few USDC on X Layer mainnet, and one mainnet invoice already Released if the mainnet escrow is deployed. If it is not, say "real mode uses USDC on mainnet" and show the create form only.
- **Fallback with no testnet access:** `npm run node`, `npm run deploy:local`, and a localhost judge build (see README). Say on camera that it is a local chain.

## Script and exact clicks

| Time | Screen | Say | Click / do |
| --- | --- | --- | --- |
| 0:00 to 0:10 | Landing (judge build) → judge page | "This is Bulla, milestone escrow on X Layer. One tap." | Click **Try it now: one-tap escrow**. The loop starts immediately: steps tick green, the live invoice goes Draft → Funded → Submitted → **Released**. Stop talking for a beat on "Released". |
| 0:10 to 0:30 | Judge page | "That was a real escrow on X Layer testnet: two demo wallets created in this browser, money locked, delivery submitted, then released to the freelancer minus a 0.5% fee. Every step is an X Layer transaction." | Point at **Done in … s**, then click one step's **… on OKX Explorer** link; show the tx in the explorer tab for two seconds; come back. |
| 0:30 to 0:45 | Public receipt | "And here is the receipt anyone can open, no wallet." | Click **Open public receipt #N**. Scroll once: status Released, fee line, delivery hash, timeline with tx links, QR code. |
| 0:45 to 1:10 | Receipt, then landing | "Why: freelancers get paid late all the time. Bonsai's 2025 data on over 100,000 freelancers found 29% of invoices paid at least a day late, and Remote reports 85% of contractors are paid late at least sometimes. With Bulla the client funds first, and a due-date time-lock refunds them if nothing is released." | Calm scroll on the landing's **How it works**. |
| 1:10 to 1:40 | Landing → **Advanced: use my own wallet** | "Real mode is the same loop with your own wallet and native USDC on X Layer. OKX Wallet is the recommended option." | Click **Advanced: use my own wallet**, then **Connect wallet**: show **OKX Wallet · Recommended on X Layer** in the menu. Show the form's live summary (deposit, fee, you receive). |
| 1:40 to 2:05 | Create form / receipt | "Who it's for: freelancers and small studios paid in stablecoins, and their clients. Every invoice is a link the client must open, so each paid invoice brings Bulla to a new client. We earn 0.5% only when a release succeeds; refunds and cancels are free." | Point at the fee line. |
| 2:05 to 2:40 | Receipt **Escrow record** → footer | "TapeOut is the identity and the home. Each invoice is bound to the seller's TapeOut circuit container; on mainnet the receipt shows the seller's .tape name, and the app itself is published into that container on DeWEB, so receipts are served from X Layer, not from our server." | Point at **Circuit container id** (and **Seller TapeOut name** if live), then the footer's **DeWEB home**. If published, show the TapeKit gateway URL bar. |
| 2:40 to 3:00 | Judge page or landing | "Bulla: lock, deliver, release, on X Layer. v1 is unaudited, and whoever holds the circuit controls its container, so keep that wallet safe." | End on the Released badge. |

## After recording

- Trim to 3:00 or less; the release must be visible before 0:10. Export 1080p and upload unlisted. Put the link in `docs/SUBMISSION-DRAFT.md` (`VIDEO_URL` placeholder).
- Never show a seed phrase, a private key, the gas-tank key, or the browser's localStorage on screen.
