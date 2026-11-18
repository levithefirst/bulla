# Bulla submission checklist

**Internal due date: Sunday 6 December 2026, 23:59 UTC** (one day before the official deadline of 7 Dec 2026, 23:59 UTC).
Owners: **Claude** (Claude Code, repo work), **Grok Bot** (research, testnet ops, gas tank), **Fluid** (the human: wallets, signatures, recording, submitting, anything public).

**Rule: nothing goes public without Fluid's OK.** That covers the form, the video, any X post, and any public link. Drafts stay in this repo until Fluid approves them.

Status values: `todo`, `in progress`, `done (date, by)`. Record the evidence (URL, tx, screenshot path) in the last column.

| # | Item | Owner | Due (UTC) | Depends on | Done looks like | Status / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Testnet judge deployment (`npm run deploy:judge`, which also deploys the TapeOut stand-ins) then the real-token testnet escrow v2 (`npm run deploy:testnet`, binds those stand-ins) | Grok Bot (testnet key) | 22 Nov | none | `xlayerTestnet.judge` and `xlayerTestnet.escrow` in `contracts/deployments.json`, committed | todo |
| 2 | Demo gas tank: dedicated throwaway testnet key, funded from https://web3.okx.com/xlayer/faucet (0.2 OKB/day cap) | Grok Bot | 22 Nov | none | Tank balance shown on the OKX testnet explorer; key never committed; rotation plan in HANDOFF | todo |
| 3 | Host the judge build (testnet, tank key at build time) on an HTTPS static host; set `VITE_JUDGE_URL` for the mainnet build | Fluid (host account), Claude (build) | 24 Nov | 1, 2 | Judge URL opens and one tap reaches Released on X Layer testnet | todo |
| 4 | `npm run e2e:testnet` green against 1952; record the measured time | Grok Bot | 24 Nov | 1, 2 | `[e2e:testnet] RESULT: PASS` and the printed timing pasted here | todo |
| 5 | Mainnet escrow **v2** deploy (USDC, official TapeOut opener and factory; ignore the superseded v1) | Fluid (signs) | 28 Nov | token gate (done) | `xlayerMainnet.escrow` committed; explorer shows the contract | todo |
| 6 | TapeOut circuit + **opened** container on X Layer mainnet (official UI, `open()` 0.08 OKB) | Fluid (signs) | 28 Nov | none | `npm run probe:tapeout` prints `opened true`, holder = Fluid's circuit wallet | todo |
| 7 | DeWEB publish of the mainnet build into the container; fill `web/src/deweb.json` | Fluid (signs), Claude (package) | 1 Dec | 5, 6 | TapeKit gateway URL opens the app; `/.tape/status` shows every file verified | todo |
| 8 | **Clean-browser live-link test, DeWEB:** fresh profile, no extensions, open the gateway URL, open a receipt, check no console errors, mobile too | Grok Bot (test), Fluid (OK) | 2 Dec | 7 | Screenshots of desktop + phone, notes pasted here | todo |
| 9 | **Clean-browser live-link test, HTTPS:** same for the HTTPS mirror and the judge URL (one tap to Released) | Grok Bot (test), Fluid (OK) | 2 Dec | 3, 7 | Same evidence as 8 | todo |
| 10 | README section "How Bulla uses X Layer" reflects what is live (update status column) | Claude | 3 Dec | 1 to 7 | Every row's status matches the live deployment; no unwired claim | todo (section written 14 Nov; statuses to refresh) |
| 11 | Submission text mapped to each of the **five** judging criteria (User Value and Commercial Potential, Innovation, Ecosystem Integration, Product Readiness and UX, Demo Video; source https://web3.okx.com/xlayer/build-x-series) in `docs/SUBMISSION-DRAFT.md` | Claude (draft), Fluid (OK) | 3 Dec | 10 | Every placeholder filled; `npm run release:check` passes | todo (mapping drafted 14 Nov) |
| 12 | Demo video, which is the fifth judging criterion (≤ 3:00 covering problem, core features, target users and business model, how it uses TapeOut; release visible before 0:10; container receiving USDC on the explorer) per `docs/DEMO.md` | Fluid (records), Claude (script) | 4 Dec | 3, 7 | Unlisted upload; link in the draft | todo |
| 13 | Promo drafts: X post and thread in `docs/promo/PROMO-DRAFTS.md` | Claude (draft), **Fluid (OK before anything is posted)** | 5 Dec | 3, 12 | Fluid has marked a version "OK to post" | draft, needs Fluid's OK |
| 14 | Final `npm run release:check`, then submit the Google Form (https://forms.gle/EoDNbxQ65dev1wFd9) | Fluid | **6 Dec, 23:59** | all above | Form confirmation saved; screenshot path here | todo |

Judging uses five criteria (https://web3.okx.com/xlayer/build-x-series): User Value and Commercial Potential, Innovation, Ecosystem Integration, Product Readiness and UX, and the Demo Video.

Hard rules for everyone: never commit a key; never move mainnet funds except Fluid's own signed deploy and demo; judge mode is testnet-only; never change repo visibility.
