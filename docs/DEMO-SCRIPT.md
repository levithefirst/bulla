# Bulla demo video brief (under 2:30)

For the demo video guy. Keep the cut under 3:00 (aim 2:20 to 2:30). Do not sign anything, do not connect a wallet, do not type a seed or key, and do not open DevTools or the browser's Application tab on camera. Captions on. Label the chain on screen at all times: "X Layer testnet" on the one-tap demo, "X Layer mainnet · real USDC" on usebulla and DeWEB. Never imply testnet is mainnet. DemoUSD has no value. TapeOut circuits in the testnet demo are labelled stand-ins because TapeOut has no testnet deployment. The only statistics allowed are the approved citations in `docs/SUBMISSION-DRAFT.md`. A longer second-by-second cut lives in `docs/DEMO.md`.

Nothing here has been recorded yet. Put the finished unlisted link in `docs/SUBMISSION-DRAFT.md` as `[VIDEO-URL]`.

## 1. The single most impressive 10-second hook

The climax is the green **Released** card on the one-tap testnet demo: "248.75 DemoUSD landed in the Freelancer's container" and the timer **Done in about 15 s**, with the live invoice badge stepping to Released. That is a full two-milestone escrow, funded, delivered and paid, as real X Layer testnet transactions, with no wallet.

A live run does not finish in 10 seconds. Measured live times are 12 to 16 s (15.4 s on 25 Nov 2026, Africa/Lagos; earlier Tester runs in the same band). If you tap **Run the escrow demo** at 0:00, Released lands around 0:15, which is honest but not a 10-second hook.

For the hook, do this:

1. Off camera, open https://try-usebulla.vercel.app/#/try and check the tank line still shows hundreds of runs left.
2. Click **Run the escrow demo** (or **Run it again** if a run just finished).
3. Start the hook as the last steps confirm (Client releases milestone 1, then 2). Within 10 seconds the badge hits Released, the green card appears, and the timer shows the real "Done in X.X s" number on screen. Say that number; never invent one.
4. Optional first line under the card: "Freelancers get paid late. This escrow just settled on X Layer."

Then cut back (or use a second take) to show the tap and the full loop for the body of the video.

## 2. Safe judge-demo flow (verified on the live UI, 25 Nov 2026, Africa/Lagos)

Use a fresh browser profile with no wallet extension. You do not need a wallet for the demo. Gas is paid by the testnet relayer.

**Recommended path**

1. Open https://try-usebulla.vercel.app
2. On the landing page, click **Try it now: one-tap escrow**. That goes to `#/try?run=1` and starts the loop automatically.
3. Or open https://try-usebulla.vercel.app/#/try (no `run=1`), confirm the tank line, and click **Run the escrow demo**.
4. Wait until the page says **Done in X.X s** and the green **Released** card is visible. Do not click anything else while it says **Running…** or **Finishing…**.
5. Click **See the public receipt** (or **Open public receipt #N**). The receipt is public; no wallet.
6. Back on the demo page, click a step's **Receipt** link (in-app `#/tx/<hash>`). That page reads `eth_getTransactionReceipt` from the X Layer testnet RPC and is the source of truth.

**Safe to press (no wallet, no signing)**

- **Try it now: one-tap escrow** (judge landing only)
- **Run the escrow demo** / **Run it again**
- Theme toggle (**Auto**)
- Brand **Bulla** (home)
- **See the public receipt** / **Open public receipt #N**
- Each step's **Receipt** (in-app RPC receipt) and the **Receipt (read from the RPC)** disclosure
- Copy buttons for a tx hash or a demo address
- **Freelancer** / **Client** tabs (read-only balances for the throwaway demo wallets)
- **New demo wallets** (safe, but skip it during a take; it only rotates local burners)
- **Try it now on X Layer testnet** on https://usebulla.vercel.app or https://1-2-397.tapekit.org/ (leaves the mainnet/DeWEB app and opens the judge demo)
- Typing an invoice id and opening a public receipt (read-only). Ready receipts: https://usebulla.vercel.app/#/invoice/1 and https://1-2-397.tapekit.org/#/invoice/1

**Do not press (can prompt a wallet or start a real write)**

- **Connect wallet** in the header (any of the three sites)
- **New invoice**, **Create an invoice**, or **Advanced: use my own wallet** (these go to `#/create` and expect a wallet; on mainnet and DeWEB that is real USDC)
- Do not paste or display a private key

**OKLink / OKX explorer links:** they are safe to click (read-only) but may show "not found" because the public X Layer indexes lag. The in-app **Receipt** page is what you should show. If you open OKLink, keep the on-screen label **OKLink (index lags)** and do not call the explorer broken or promise that it will load.

## 3. Is a live mainnet create/fund/release worth capturing?

The video maker should not sign and should not try this. Prefer screen-recording the invoices that already exist.

Our own mainnet tests (not outside users), both Completed, real USDC, paid into the opened TapeOut container:

- Invoice #1 (the one to show): https://usebulla.vercel.app/#/invoice/1 (also https://1-2-397.tapekit.org/#/invoice/1). 2 x 0.50 USDC, 0.995 USDC paid to the container, 0.005 USDC fee. Release txs (for context, show them via the in-app receipt timeline, not as a promised explorer preview): `0x910a5e2f8c2731339518f99b594bcf96935eefe0e2d696038b08a36726c3b15c` and `0x81a14d46c4dc0dd1a1d648fd46fe86b441cbbae91af5c3a55b9503421c2b993e`.
- Invoice #2 (optional, also our test): https://usebulla.vercel.app/#/invoice/2 (0.10 USDC, one milestone).

A new live mainnet invoice is optional only as a pre-record by someone who already controls the ops and buyer keys, not during the official take. Risks: RPC hiccups, the 100-block log window delaying timeline links, and tying up the ops wallet that still pays mainnet gas and DeWEB publishing.

Cost estimate if someone later pre-records a small new invoice, at the 25 Nov 2026 (Africa/Lagos) gas price of 0.02 gwei, using the measured gas from invoice #1:

- Invoice gas (create, approve, fund, two submits, two releases): about 0.000027 OKB.
- Sending USDC to the buyer first: about 0.000001 OKB, plus the USDC amount (1.00 USDC if we repeat invoice #1; 0.20 USDC if we use 2 x 0.10).
- After release, 99.5% of the USDC lands in the circuit container and 0.5% returns to the fee recipient (ops). Net USDC is almost conserved if we later withdraw; it is not spent as a fee beyond that 0.5%.
- Do not withdraw on camera. A container `execute` withdrawal costs `EXEC_FEE()` of 0.0013 OKB, which is material next to the ops wallet's 0.01596440 OKB (the last DeWEB republish cost 0.00235 OKB).

Balances checked 25 Nov 2026, 17:58 Africa/Lagos, no mainnet funds moved for this brief:

- Ops `0x00f9b7a48F4B3eCdcc8288C2295E59132143B3b0`: 0.01596440 OKB, 1.173679 USDC (enough USDC for a small invoice; keep the OKB for gas and publishing).
- Buyer `0x8888a1022F062158E563d32b4CCA1501B95Fe5fB`: 0.00057970 OKB, 0 USDC (enough gas; would need USDC sent from ops first).
- Container `0x52D7504EFDF73EcdCE91411B77e154CEe353241e`: 0.0995 USDC already on hand from earlier tests.

Recommendation: do not record a new live mainnet write. Invoice #1 already shows real USDC released into the real TapeOut container.

## 4. Shot list and voiceover (about 2:20)

| Time | Screen and action | Voice / caption |
| --- | --- | --- |
| 0:00 to 0:10 | Hook: last releases on https://try-usebulla.vercel.app/#/try, then the green Released card and the real "Done in X.X s" timer. Overlay: X Layer testnet. | "Freelancers get paid late. Watch this. Released. Paid. In about 15 seconds." Use the number on screen. |
| 0:10 to 0:25 | Click **Receipt** on "Client releases milestone 2" (in-app tx page, status Success). Then **See the public receipt**. Overlay: X Layer testnet · stand-in container. | "Every step is an X Layer transaction. The money lands in the freelancer's circuit container. Anyone can open the receipt. No wallet, no login." |
| 0:25 to 0:40 | Cut to a full start-to-finish take of the same demo (tap **Run the escrow demo**, steps tick green: circuit stand-in minted, funded, submitted, released). Overlay: X Layer testnet. | "One tap runs the whole loop on X Layer testnet. Two demo wallets, valueless DemoUSD, no wallet to install." |
| 0:40 to 0:55 | Landing "How it works", then the approved sources on screen. | "Late payment is routine. Bonsai's 2025 data on over 100,000 freelancers: 29% of invoices paid at least a day late. Remote: 85% of contractors are paid late at least sometimes." Show both URLs as captions. |
| 0:55 to 1:25 | Mainnet: https://usebulla.vercel.app, then the live invoice #1 receipt. Overlay: X Layer mainnet · real USDC. Optionally the create form (do not click Connect wallet or submit). | "Same flow on mainnet with real USDC and a real TapeOut circuit. The client funds every milestone up front. The freelancer delivers each one. The client releases each one. Only the circuit's holder can bill with it, checked on chain. An optional arbiter can settle a dispute and takes no fee." Say clearly that invoice #1 is our own test, not an outside customer. |
| 1:25 to 1:45 | Invoice #1 share kit and On-chain activity. | "Who it is for: crypto-paid freelancers and small studios, and their clients. Every receipt is a link the client can open and share. The circuit carries its on-chain activity: funded invoices and released volume. That is activity, not a reputation score." |
| 1:45 to 1:55 | Fee line on the receipt (0.5%, 0.005 USDC on invoice #1). | "Business model: 0.5% on each successful release. Refunds and cancels are free." |
| 1:55 to 2:15 | Receipt section **TapeOut binding and payout**, the withdraw note, then the DeWEB URL bar at https://1-2-397.tapekit.org/#/invoice/1 (same receipt, footer "Bulla v2" and "1.2.397.tape"). Overlay still mainnet. | "TapeOut does the work: ownerOf gates billing, the opener gives the container that receives payouts, and the app is served from the circuit's container on DeWEB." Mention TapeSend only as "next", never as shipped. |
| 2:15 to 2:25 | Landing, unaudited and circuit-holder warnings visible. | "Bulla is unaudited, and whoever holds the circuit controls its container, so keep that wallet safe." |

## Limits to say or caption honestly

- Without an arbiter, the client can refund every unreleased milestone after the due date, even ones already submitted.
- A release reverts if the payee cannot receive the token (for example a USDC-blacklisted address); the money stays in escrow and is still refundable to the client.
- "On-chain activity" counts funded invoices only and is not a reputation score.
- Users and revenue: none yet. Do not invent customers, counts, or income.
- Public explorers' X Layer indexes may lag; show the in-app RPC receipt.

## Before you hit record

- Zoom about 110%, 1280x800 or larger, notifications off.
- On the judge page, confirm the tank line (example from 25 Nov 2026, Africa/Lagos, after one smoke run: tank `0xbD49b0f5F46ccc8e54Fe774a4Ffa2fA9B3f5D748`, about 1336 runs left). If it ever says the tank is empty, stop and tell us; do not record that take.
- Record a backup take of the one-tap demo.
- Fallback if testnet is down: do not fake a live run. Use the already-settled mainnet invoice #1 and say so.

## Links for the video maker

- One-tap demo (start here): https://try-usebulla.vercel.app
- Judge page, no auto-run: https://try-usebulla.vercel.app/#/try
- App (mainnet, real USDC): https://usebulla.vercel.app
- Our mainnet test invoice #1 (show this): https://usebulla.vercel.app/#/invoice/1
- Our mainnet test invoice #2 (optional): https://usebulla.vercel.app/#/invoice/2
- DeWEB mirror of the app: https://1-2-397.tapekit.org/
- DeWEB mirror of invoice #1: https://1-2-397.tapekit.org/#/invoice/1
- In-app tx receipt pattern (after a demo step): https://try-usebulla.vercel.app/#/tx/<hash>
- Official criteria: https://web3.okx.com/xlayer/build-x-series
- Approved late-payment sources: https://www.hellobonsai.com/blog/late-freelance-payment and https://remote.com/blog/contractor-management/reversing-late-payment-culture
