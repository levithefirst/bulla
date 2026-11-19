# Bulla demo video (2:30 to 2:50)

The Demo Video is the fifth official judging criterion (https://web3.okx.com/xlayer/build-x-series): up to 3 minutes covering the problem, core features, target users and business model, and how the project uses TapeOut. This script follows `docs/planning/win-audit/WIN-AUDIT.md` section 6: a live judge-mode release in the first 10 seconds, no intro slides. Fluid records it; nothing here has been recorded. Captions on. The only statistics allowed are the approved citations in `docs/SUBMISSION-DRAFT.md`.

**Label the chain on screen at all times.** Testnet footage carries the overlay "X Layer testnet"; mainnet footage carries "X Layer mainnet · real USDC". Never imply testnet is mainnet.

## Before recording

- **Judge build live on X Layer testnet** (HANDOFF step 3b): `deploy:judge` done (TapeOut stand-ins + DemoUSD + judge escrow), gas tank funded by Grok Bot, judge site hosted. Run it once off camera and check the "Demo gas tank" line shows several runs left. Record a backup take.
- **Mainnet:** escrow v2 deployed; Fluid's real TapeOut circuit with an **opened** container (official app, 0.08 OKB); one real invoice with a consenting counterparty, created with "Pay into my TapeOut container", with at least one milestone Released. Note the release tx hash and the container address.
- **Tabs ready:** the one-tap demo (testnet), no wallet, about 15 s (https://try-usebulla.vercel.app, fresh browser profile, no wallet extension), the OKX explorer, the App (mainnet, real USDC) receipt (https://usebulla.vercel.app/#/invoice/1), and the OKX explorer page for the mainnet release tx showing USDC arriving at the container.
- Zoom 110%, 1280×800 or larger, notifications off, cursor already on the button at 0:00.
- Fallback if testnet is down: a localhost judge build (README), labelled "local test chain" on screen.

## First 30 seconds, second by second

| Second | Screen | Overlay | Voice (or caption) | Exact action |
| --- | --- | --- | --- | --- |
| 0 to 2 | Landing, cursor on **Try it now: one-tap escrow** | X Layer testnet | "Freelancers get paid late. Watch this." | none |
| 2 to 3 | Tap. The judge page opens; two demo wallets appear | X Layer testnet | (silence, a click) | click **Try it now** |
| 3 to 7 | Steps tick green: circuit minted (labelled "testnet stand-in for TapeOut"), container opened, invoice billed with the circuit, funded. The live badge goes Draft → Funded → Submitted | X Layer testnet | "The client locks the money in escrow. The freelancer delivers." | none |
| 7 to 9 | Badge hits **Released**; timer shows "Done in X s"; "Container received 248.75 DemoUSD" | X Layer testnet | "Released. Paid. In seconds." | none (use the real measured number on screen; never say a number you did not measure) |
| 9 to 13 | Click the **Client releases milestone 2** step's "Explorer (may lag on testnet)" link; the tx shows DemoUSD going to the container address. If the testnet explorer says "not found", expand the step's **Receipt (read from the RPC)** instead (status Success, block, gas, from/to) | X Layer testnet · stand-in container | "Every step is an X Layer transaction, and the money lands in the freelancer's circuit container." | click the release step link |
| 13 to 18 | Back to the app: **Open public receipt**. Milestones table, payout target = container, timeline, QR | X Layer testnet | "Anyone can check the receipt. No wallet, no login." | click **Open public receipt** |
| 18 to 24 | Cut to the mainnet receipt (Released milestone, real USDC), then the explorer page of that release: **USDC transferred to the TapeOut container** | X Layer mainnet · real USDC | "Same flow on mainnet with real USDC, a real TapeOut circuit, and OKX Wallet." | switch tabs |
| 24 to 30 | Title card over the receipt: "Bulla: milestone escrow where your TapeOut circuit is your business account. 0.5% only when you get paid." | X Layer mainnet | "This is Bulla." | none |

## Rest of the video

| Time | Screen | Voice (or caption) |
| --- | --- | --- |
| 0:30 to 0:50 | Landing, "How it works" | "Late payment is routine. Bonsai's 2025 data on over 100,000 freelancers: 29% of invoices paid at least a day late. Remote: 85% of contractors are paid late at least sometimes." Show both sources on screen as captions with their URLs. |
| 0:50 to 1:30 | Real mode, mainnet: **Create a milestone invoice**. Enter processor and circuit #ID: "You hold circuit #ID" appears with the container and its opened status; add three milestones; toggle "Pay into my TapeOut container"; add an arbiter | "Real milestones: the client funds them all up front, you deliver each one, they release each one. Only the circuit's holder can bill with it, checked on chain. An optional arbiter, accepted by the client, settles disputes and takes no fee." |
| 1:30 to 1:55 | Receipt: share kit (QR, X, Telegram), the "On-chain activity" panel | "Who it is for: crypto-paid freelancers and small studios, and their clients. Every receipt is a link the client opens and can share, so each paid invoice brings a new client in. The circuit carries its on-chain activity: funded invoices and released volume." |
| 1:55 to 2:10 | Fee line on the receipt | "Business model: 0.5% on each successful release. Refunds and cancels are free." |
| 2:10 to 2:35 | Receipt **TapeOut binding and payout**; the "How to withdraw from your container" note; then the DeWEB gateway URL bar | "TapeOut does the work: ownerOf gates billing, the opener gives the container that receives payouts, the container withdraws with execute, and the app itself is served from the circuit's container on DeWEB." Mention TapeSend only as "next", never as shipped. |
| 2:35 to 2:45 | Landing | "Next 90 days: real invoices, an audit, TapeSend notes. Bulla is unaudited, and whoever holds the circuit controls its container, so keep that wallet safe." |

## Limits to say or caption honestly

- Without an arbiter, the client can refund every unreleased milestone after the due date, even ones already submitted. Show the create form's "No arbiter set" notice next to the arbiter field.
- A release reverts if the payee cannot receive the token (for example a USDC-blacklisted address); the money stays in escrow and is still refundable to the client.
- "On-chain activity" counts funded invoices only and is not a reputation score.

## Moments to get right, mistakes to avoid

- Must land: the Released badge before 0:10, the explorer showing the container receiving the payout, and one real mainnet invoice between two real people.
- Never: an empty gas tank on camera (check the tank line first; keep the backup take), a statistic without its source on screen, testnet and mainnet blurred, a seed phrase or private key or the browser's localStorage on screen.

## After recording

Trim to 2:50 or less, export 1080p with captions, upload unlisted, and put the link in `docs/SUBMISSION-DRAFT.md` (`VIDEO_URL` placeholder).
