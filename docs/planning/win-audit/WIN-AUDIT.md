# Bulla: brutal win audit (X Layer TapeOut Accelerate)

Written: Wednesday 18 Nov 2026 (Africa/Lagos, UTC+1), by Grok Bot. Deadline: 7 Dec 2026, 23:59 UTC (00:59 WAT on 8 Dec). 19 days left.
Inputs: official event page (re-read today), web research below, an 11-model fan-out (`fanout-prompt.md`, raw answers and the machine distill in `fanout-raw.md`), and the repo on branch `ccr-0289a6a3-a6gku1`. Everything below the sources section is my own judgment after deduping the models and throwing out their invented facts (several models proposed a "mainnet judge mode" and "FAB mined per invoice"; both are wrong or unsourced and are not used).

Rule: every fact about past events, winners, prizes or rules has a URL. Anything without one is marked UNKNOWN.

## 0. Verdict in one paragraph

Bulla cannot win as it stands, because nothing is live and its TapeOut use is decorative: `circuitContainerId` is a free `bytes32` that the contract never checks, so any seller can claim any container. TapeFlow, which already won a TapeOut ecosystem award, already ships escrow with TapeOut container recipients. The good news is that the fix is small, verifiable on chain, and goes before the mainnet deploy that hasn't happened yet. Bind each invoice to a real circuit (`ownerOf` check through the processor contract), pay the release into the seller's ERC-6551 container (`opener.accountOf`), and add real milestones and an optional arbiter. That turns "escrow with a TapeOut label" into "your TapeOut circuit is your business account, and its receivables travel with it". Ship it live on mainnet and DeWEB with real invoices from real people, and Bulla is a credible 1st-place candidate. Without those steps it is at best a 3rd-place entry.

## 1. The winner pattern (sourced)

| Event | Winner(s) and what they built | Source |
| --- | --- | --- |
| TapeOut Genesis Transistor Hackathon (Ignix + X Layer, 22 Sep to 6 Oct 2026, 52 submissions; 1st $8,000, 2nd $4,000, 3rd $2,000; "ranking isn't based on volume or price, it's based on what you built") | 1st **FabX**: circuit design, on-chain tape-out, proof-of-design mining, and mining weight tied to real DeWEB traffic | https://tapeout.link/news/2109942899307614597 , https://tapeout.link/news/2112123691479994836 , prize and rule text: https://xitter.cf/Ignixbot/status/2102254346172051730 |
| Same event, Ecosystem Recognition award | **TapeFlow** (X Layer payments: transfers, QR collection, escrow, scheduled and conditional payments, TapeOut container recipients), **AlephTape**, **SonicMint** | https://tapeout.link/news/2108899991054086461 ; TapeFlow features: https://tapeflow.world/ and https://tape4fun.com/en/ecosystem.html |
| Build X Season 1 (agentic commerce, 100+ entries) | 1st **BondonCredit** (credit and reputation for agents). Special awards: Most Innovative, Best in Agentic Payments, Highest Real-World Adoption, Highest ecosystem integration potential, Community Favorite | https://topicdigg.com/x/XLayerOfficial/2041101165241516382 ; https://theagenttimes.com/articles/x-layer-s-build-x-hackathon-draws-100-entries-in-agentic-com-019e91d4 |
| Build X Season 2 (300+ submissions, 15 days) | X Layer Arena 1st **ASG Pay** (payment layer for AI agents); Skills Arena 1st **PreflightX**; 3rd includes **AgentEscrow** | https://moltbook.com/post/a62b2b73-590d-4c82-98d8-1fcfc25e1ab3 ; https://www.aicoin.com/en/news-flash/2851889 |
| OKX ETHCC Hackathon (DoraHacks) | Track winners incl. Yamata, AgenPay, Eolia Wallet (X Layer AA onboarding); special recognition **Escrowzy OKX** on X Layer | https://dorahacks.io/blog/events/okx-ethcc-recap/ |
| First X Layer x TapeOut Demo Day (this series) | Showcased **Embers World** (game), **LaikaAI**, **TapeLaunch** (AI DeWEB site builder + token) | https://tapeout.link/news/2119045725229380035 |

**Pattern, in order of weight:**
1. **Native to the host protocol, not just deployed on it.** FabX used the TapeOut primitives themselves (circuits, tape-out, DeWEB traffic) as the core mechanism. TapeFlow got recognised for treating containers as payment addresses. A product that only stores a TapeOut id loses to one where TapeOut does work.
2. **Money rails and trust infrastructure win at X Layer events.** Credit (BondonCredit), payments (ASG Pay, TapeFlow), escrow and guards (AgentEscrow, PreflightX). Bulla is in the right category, and so are its two closest rivals.
3. **Live and usable, with visible activity.** Season 1 had a "Highest Real-World Adoption" award. FabX had hundreds of minting addresses within days (https://tapeout.link/news/2109567898499092718). Judges reward live on-chain proof over local demos.
4. **Community signal counts beside the judges.** Every Build X season had a Community Favorite. This event has a separate leaderboard with token-holder voting and a livestream slot for the top ranks (https://tapeout.link/news/2120844009090515117).

**What Bulla lacks versus those winners:** live deployment, any TapeOut mechanism that the contract actually enforces, real users, presence on the 32-project leaderboard (UNKNOWN whether Bulla is listed; it is not among the 11 named entries in `docs/planning/competition.md`), and any community footprint.

## 2. Official rules that change the plan (re-read 18 Nov 2026)

Source for all rows: https://web3.okx.com/xlayer/build-x-series

- **There are five judging criteria, not four.** The fifth is the **Demo Video**: ≤ 3 min, and it must cover the problem, core features, **target users and business model**, and how the project uses TapeOut. `docs/research.md`, the README section and `SUBMISSION-DRAFT.md` list only four. Fix this in the copy.
- The description must cover **target users and how to reach them, the revenue model, and why users pay and keep using it**.
- **Only work done during the event (16 Oct to 7 Dec) is judged.** Bulla's first commit is 14 Nov 2026, so it is clean. Say so explicitly in the form.
- **Fabricated functionality or data means disqualification** (Terms, item 10).
- Shortlisted teams go to an **offline Demo Day**. Prizes are **paid in stages** as winners grow the project with X Layer and TapeOut (Terms, item 6), so a credible 90-day plan matters.
- The ecosystem tools named in the criteria are DeWEB, FabX, TapeCode, TapeKit and **TapeSend**. None is required.
- The page also says the reward pool "will continue to grow". Separately, the TapeOut foundation added 1,500 BEM to support about 10 teams through Demo Day and final selection (https://tapeout.link/news/2120844009090515117).
- Prizes: 1st 20,000 USDT (1), 2nd 10,000 USDT (5), 3rd 6,000 USDT (5).

## 3. Scores per criterion (current state) and exact fixes to reach 9+

The scores assume the current code gets deployed as is. If nothing goes live, Product Readiness and Demo Video both drop to about 2.

| Criterion | Now | Why | Exact fixes to reach 9+ |
| --- | --- | --- | --- |
| User Value and Commercial Potential | **6** | Real, cited pain (late payment). The fee is clear. But it is single-payment ("milestone" in name only), there are no users, "how to reach users" is vague, and there is no answer to why not just use TapeFlow escrow | (a) Real multi-milestone invoices: N milestones, each funded and released separately. (b) Optional mutually agreed arbiter address, so disputes have an answer beyond the time-lock. (c) 3 to 5 **real** mainnet invoices with real counterparties (Fluid's network, consented, small USDC) shown with explorer links. Never fabricate. (d) A go-to-market section: OKX Wallet / X Layer / TapeOut communities first, the receipt link as the viral loop (each invoice brings a new client in), then Telegram freelancer groups. (e) A retention hook: the seller's container becomes a public, verifiable payment history (count and volume of released invoices on the receipt page) |
| Innovation | **4** | Escrow is well-trodden, and TapeFlow already does escrow on X Layer. The container id is unverified, so "escrow identity" is a label, not a mechanism. Judge mode is a UX innovation, but a modest one | (a) **Circuit-bound invoices:** `createInvoice` takes `(processor, tokenId)`, requires `processor.ownerOf(tokenId) == msg.sender` (TapeKit SPEC Appendix B: https://github.com/TapeOutProtocol/TapeKit/blob/main/SPEC.md), and re-checks at release. (b) **Pay into the container:** release pays `opener.accountOf(processor, tokenId)`, the circuit's ERC-6551 container (same SPEC, B.2/B.4), so receivables follow the circuit NFT. "Your TapeOut circuit is your business account" is a new TapeOut use case, which the criterion explicitly rewards. (c) The receipt shows a "seller reputation from chain" panel: released count and volume for that container, computed from events |
| Ecosystem Integration | **4** | It uses X Layer, USDC, OKX Wallet and explorer, and DeWEB is planned. The TapeOut binding is cosmetic and nothing is published yet | (a) Do 3a and 3b from Innovation (real `ownerOf` and `accountOf` reads on X Layer). (b) Publish the app on DeWEB in the seller's container and use the TapeKit gateway URL as the canonical access link. (c) **TapeSend** encrypted "invoice ready / delivery submitted" notes to the counterparty's container, **only if** the X Layer hub is confirmed live (sources conflict: the official README dated 18 Sep says X Layer is "planned but not active", https://github.com/TapeOutProtocol/TapeKit/blob/main/send/README.md ; a guide says the founder announced an X Layer deploy on 19 Sep, https://tapeout.link/guide/tapesend ). Grok Bot verifies on chain first. (d) Name each tool plainly in the form: X Layer (settlement), TapeOut circuits and containers (identity and payout account), DeWEB and TapeKit (hosting), TapeSend (notifications, if live). Skip FabX: tying payments to a mining token invites "investment" framing for no user value |
| Product Readiness and UX | **6** | Code complete: 50 contract tests, 9 E2E, Slither, a one-tap judge path, a no-wallet receipt. Nothing is live, testnet timing is unmeasured, and the public gas tank can be drained by anyone | (a) Live testnet judge URL and live mainnet escrow plus DeWEB, all passing clean-browser tests (checklist rows 8 and 9). (b) Gas-tank hardening: per-run spend cap, a visible "tank balance" line, a Grok Bot routine that tops up and alerts below a threshold, and a recorded fallback. (c) A mobile pass on the receipt page. (d) Measured testnet time shown on the page ("Done in X s on X Layer testnet") |
| Demo Video | **6** (plan only) | The script is strong (release before 0:10, receipt, problem, real mode, business model, TapeOut), but nothing is recorded, and it predates the circuit-bound payout | Re-cut per section 6 below. Show the container receiving the USDC on the explorer (the TapeOut proof), one real mainnet invoice, and the business model on screen. 2:30 to 2:50 total. Captions on |

**Realistic target if the top 5 actions ship:** User Value 8, Innovation 8 or 9, Ecosystem 9, Readiness 9, Video 9. A 9 on User Value needs real external usage, which no amount of code buys. That's why action 6 matters.

## 4. Likely rivals and how Bulla beats each

| Rival type (named examples, from `docs/planning/competition.md` and sources there) | Threat | How Bulla beats it |
| --- | --- | --- |
| **TapeFlow** (payments + escrow + container recipients; award at Genesis) | Highest. Same category, already recognised. Entry status in Accelerate: UNKNOWN | TapeFlow is a general wallet-style payment app. Bulla is a **workflow**: milestone invoice, delivery proof, arbiter, public receipt, receivables owned by the circuit. Pitch "TapeFlow moves money; Bulla gets freelancers paid for work". Never disparage it by name in the submission |
| **CoTape** (designer/funder matching with escrowed miners and revenue split) | Medium. Escrow too, but for tape-out financing, not services | Different buyer. Bulla serves any freelancer, not just circuit designers. Mention CoTape-style deals as a future integration, not competition |
| **Latchwork** (API service agreements on TapeOut circuits) | Medium. "Agreements" overlap | Bulla is simpler and live, with a no-wallet receipt and a one-tap demo. Agreements without settlement in USDC are less useful |
| **hardline** (no-code rule builder compiled to a real chip) | Medium on Innovation | Hardline is circuit-native, but a tool. Bulla is a product with a payer. Concede circuit-design originality and win on user value and readiness |
| **TapeLaunch / TapeAI / AI builders** | Medium, already showcased at Demo Day | They are crowded and token-adjacent. Bulla has a cited real-world pain and a non-token revenue model |
| **Miner tools (FabX Miner Desk, TapeSurge, compilers)** | Low to medium | Ecosystem-internal users only. Bulla brings Web2 freelancers in, which is what "addressing real needs of Web2 and Web3 users" asks for |
| **Games (Embers World, X Arena, NullState)** | Low for 1st | Fun, but weak on commercial potential. Not the same scoring lane |
| **Unknown ~21 of 32 leaderboard entries** | UNKNOWN | Grok Bot pulls the list (action 8) and checks for any other invoice or escrow clone before submit |

**Where Bulla is most exposed:** "TapeOut is decorative" (fixed by action 2), "nothing live" (actions 1, 3, 5), "no users" (action 6), and "TapeFlow already does escrow" (positioning plus action 2).

## 5. Real-usefulness check

- **Who pays:** the freelancer (seller) pays 0.5% on successful release. That's a fair trade for being paid at all and on time. The client pays nothing extra and gets refund protection.
- **Why they would use it:** the money is committed before work starts, the release rule is public, and the receipt works for anyone with no wallet.
- **Why they would keep using it:** a public, verifiable payment history tied to their circuit (reputation), repeat clients, and receivables that are portable with the circuit.
- **Honest limits:** the market today is crypto-paid freelancers. Clients need USDC on X Layer and a wallet. There's no fiat ramp, no email or push notifications, and no audit (v1 is unaudited and must say so).
- **Missing features ranked by impact divided by effort:**
  1. Circuit-bound invoices and pay-to-container (high impact, ~4 h)
  2. Real multi-milestone invoices (high, ~5 h)
  3. Optional arbiter (high, ~3 h)
  4. Seller history panel on the receipt (medium, ~2 h)
  5. Share kit: copy link, QR, prefilled X and Telegram text (medium, ~1 h)
  6. TapeSend notes (medium, ~6 h, gated on the hub being live)
  7. Recurring invoices (medium, ~4 h, post-hackathon)
  8. Fiat on-ramp link to OKX (low effort, but no official widget is sourced: UNKNOWN, skip)

## 6. Demo video: the first 30 seconds, second by second

Recorded on the judge build (testnet), then cut to mainnet. Label the chain on screen at all times. Never imply testnet is mainnet.

| Second | Screen | Voice (or caption) |
| --- | --- | --- |
| 0 to 2 | Landing, cursor already on **Try it now: one-tap escrow**. Overlay: "X Layer testnet" | "Freelancers get paid late. Watch this." |
| 2 to 3 | Tap. Two demo wallets appear | (silence, a click sound) |
| 3 to 7 | Steps tick green: fund, lock, submit. The live badge goes Draft → Funded → Submitted | "The client locks USDC in escrow. The freelancer delivers." |
| 7 to 9 | Badge hits **Released**. Hold. Timer shows "Done in X s" | "Released. Paid. Under ten seconds." |
| 9 to 13 | Click a step's OKX Explorer link. The tx opens on the explorer, **showing the recipient is the seller's TapeOut container** | "Every step is an X Layer transaction, and the money lands in the freelancer's TapeOut circuit container." |
| 13 to 18 | Back to the app. Open **public receipt**: status, fee, timeline, QR | "Anyone can check the receipt. No wallet, no login." |
| 18 to 24 | Cut to mainnet: a real Released invoice in real USDC. Overlay: "X Layer mainnet · real USDC" | "Same flow on mainnet with real USDC and OKX Wallet." |
| 24 to 30 | Title card over the receipt: "Bulla: milestone escrow where your TapeOut circuit is your business account. 0.5% only when you get paid." | "This is Bulla." |

**Moments judges remember:** the Released badge at second 9, the container receiving USDC on the explorer, and a real mainnet invoice between two real people.
**Mistakes that sink it:** an empty gas tank on camera (fill it and record a backup take), any statistic without a source on screen, and blurring testnet and mainnet.
**Rest of the video (to about 2:45):** the problem with the two approved citations (0:30 to 0:50), milestones and arbiter in real mode (0:50 to 1:30), who it's for and how we reach them, with the receipt link as the growth loop (1:30 to 1:55), business model at 0.5% with refunds free (1:55 to 2:10), the TapeOut stack (circuit binding, container payout, DeWEB gateway URL, TapeSend if live) (2:10 to 2:35), and close with the 90-day plan and the "v1 unaudited" line (2:35 to 2:45).

## 7. Submission copy (paste-ready after deploy; no em dashes)

**Title:** Bulla: milestone escrow where your TapeOut circuit is your business account

**One-liner:** Freelancers send a milestone invoice, the client locks USDC on X Layer, and each release pays straight into the freelancer's TapeOut circuit container, with a public receipt anyone can open without a wallet.

**First paragraph:** Late payment is routine for freelancers: Bonsai's 2025 data on over 100,000 freelancers found 29% of invoices were paid at least a day late (https://www.hellobonsai.com/blog/late-freelance-payment). Bulla flips the default. The client funds each milestone up front into an escrow contract on X Layer, the freelancer submits proof of delivery, and the client releases. If nothing is released by the due date, the client is refunded automatically. Every invoice is bound to the freelancer's TapeOut circuit, verified on chain, and payments land in that circuit's container. The freelancer's payment history and receivables live with the circuit, and the app itself is served from that container on DeWEB.

**Sections judges read (in this order):**
1. **Try it in one tap:** the judge URL. "No wallet needed. It runs the full loop on X Layer testnet in under N seconds." Use the measured number.
2. **Live on mainnet:** the escrow address, a real receipt link, the DeWEB gateway URL.
3. **How Bulla uses TapeOut and X Layer:** a table of the TapeOut feature, what Bulla does with it and the on-chain address.
4. **Users and how we reach them:** crypto-paid freelancers and small studios, through OKX Wallet, X Layer and TapeOut communities, then freelancer Telegram groups. Each paid invoice brings a new client to Bulla.
5. **Revenue and retention:** 0.5% on successful release only, with refunds and cancels free. Users stay for the portable on-chain payment history and repeat clients.
6. **Built during the event:** first commit 14 Nov 2026, all work new.
7. **Limits, stated honestly:** unaudited v1; the judge mode gas key is a public testnet key by design.

## 8. Side prizes and ecosystem angles we're missing

- **Community leaderboard and livestream.** 32 projects are listed on the OKX Wallet campaign page, voting is open to BEM, FAB or TapeCode-Test NFT holders, it closes 18 Dec 22:00 (timezone unstated), and top ranks get an X Layer x TapeOut livestream slot (https://tapeout.link/news/2120844009090515117 , https://tapeout.link/news/2120076495263518945). **How a project gets listed is UNKNOWN.** Grok Bot asks in the official Telegram linked from the event page. If listing comes from a submitted form, submit early (with the form's resubmission policy confirmed first, UNKNOWN).
- **Demo Day shortlist and 1,500 BEM grants** for about 10 teams (same source). The application route is UNKNOWN; Grok Bot finds out.
- **Staged prize payouts** (official Terms, item 6): include a 90-day plan with measurable milestones (invoices settled, active sellers, TapeSend notes, audit), so judges see a team that can use staged money.
- **X Layer PR support** for winners (Terms, item 6): have a short case-study draft ready.
- **Ecosystem integration list for the form:** name TapeKit (SPEC reads), the container opener, DeWEB SiteRegistry, the TapeKit gateway, and TapeSend if live. The criteria text names these tools.
- **Promo posts:** drafts are in `docs/promo/`. Fluid must approve before anything is posted. Tag @XLayerOfficial and @TapeOutWorld only in posts Fluid OKs.
- Skip: FabX mining hooks, a token, and any "earn" framing.

## 9. Disqualification and kill list

| Item | Risk | Action |
| --- | --- | --- |
| Fabricated data (fake invoices, invented user counts, unsourced stats) | Disqualification (Terms, item 10) | Only real invoices, labelled as such. Keep only the 2 to 3 approved citations |
| Claiming TapeOut "identity" while the contract never checks it | "Fabricated functionality" exposure and an Innovation hit | Action 2, or reword to "label" until it ships |
| "Milestone" in the name with single-payment invoices | Credibility | Action 2 (multi-milestone), or rename |
| Testnet-only or local-only demo presented as live | Readiness score collapses | Mainnet escrow + DeWEB live before submitting. Label the chain on every screen |
| Judge gas tank drained by a stranger while judging | Broken first impression | Per-run cap, top-up routine, tank-empty fallback message, backup video |
| Public gas-tank key mistaken for a leak | Security finding | State in the form that it's a throwaway testnet key, by design |
| Private repo | Judges can't verify. "Code: private, access on request" weakens trust | **Fluid decides.** Making it public is the safer bet for judging. Grok Bot and Claude never change visibility |
| Broken links (DeWEB gateway, explorer testnet path unconfirmed) | Readiness | Clean-browser tests on desktop and phone (checklist rows 8 and 9) |
| Missing required fields (target users, reach, revenue, why pay, TapeOut features, addresses) | Incomplete entry | Use the section 7 structure. `npm run release:check` must pass |
| Unaudited contract holding mainnet funds | Liability | Small demo amounts, an "unaudited v1" notice, the existing Slither notes |
| Copy missing the 5th criterion (Demo Video) | Lost points | Fix the docs (part of the Claude prompt) |
| Late submission | Total loss | Submit by 6 Dec, 23:59 UTC, a day early (checklist row 14) |

## 10. Ranked top-10 actions

The order is by expected point gain divided by effort, with dependencies respected. Contract changes must land **before** the mainnet deploy.

| # | Action | Owner | Effort | Gain |
| --- | --- | --- | --- | --- |
| 1 | Fund the ops wallet (about 0.10 OKB plus 1 USDC on X Layer to `0x00f9b7a48F4B3eCdcc8288C2295E59132143B3b0`) and decide the fee and circuit owner wallet | Fluid | 15 min | Unblocks everything |
| 2 | Contract v2 + UI: circuit-bound invoices (`ownerOf`), pay-to-container (`accountOf`), real multi-milestones, optional arbiter, seller history panel, 5-criteria copy fix, gas-tank cap. See `claude-prompt.md` | Claude Code | 1 session, ~10 to 14 h | Innovation +4, Ecosystem +3, User Value +1 |
| 3 | Testnet: faucet-fund the deployer and tank, `deploy:judge`, host the judge build on Vercel, run `e2e:testnet`, click the testnet explorer link, set a tank top-up and alert routine | Grok Bot | 3 h after action 2 | Readiness +2 |
| 4 | Verify on chain: the X Layer processor and opener addresses, a real `accountOf` result, whether the container can send ERC-20 out (ERC-6551 `execute`), and whether the TapeSend hub is live on X Layer. Report the go/no-go for TapeSend | Grok Bot | 1.5 h, **before** action 2 finishes | De-risks action 2 |
| 5 | Mainnet: deploy escrow v2, mint the circuit and open its container (0.08 OKB), DeWEB publish, gateway URL, clean-browser tests | Grok Bot (ops wallet), Fluid (OK each step) | 3 h | Readiness +1, Ecosystem +1 |
| 6 | 3 to 5 real mainnet invoices with real counterparties (small USDC, consented), linked in the form | Fluid (finds people), Grok Bot (supports) | 2 h spread over a week | User Value +2 |
| 7 | Record the video per section 6 (2:30 to 2:50), with captions | Fluid (records), Claude Code (script refresh in the prompt) | 3 h | Video +3 |
| 8 | Find out how to get listed on the community leaderboard and apply for the Demo Day and BEM grants. Pull the 32-project list and check for clones | Grok Bot | 1.5 h | Side angles, livestream slot |
| 9 | Decide on repo visibility (public is recommended for verification) and approve the promo drafts | Fluid | 15 min | Trust, community signal |
| 10 | Final copy fill (section 7), `release:check`, and submit the form by 6 Dec, 23:59 UTC | Claude Code (fill), Fluid (submits) | 2 h | Required |

Stretch (only if 1 to 7 are done by 1 Dec): TapeSend notes (if the hub is live), and receipt JSON written into the seller's container as a DeWEB file.

## 11. Three biggest risks

1. **Time and sequencing.** The contract change has to finish and be re-tested before the mainnet deploy, and then DeWEB, the video and real invoices all chain off it. A slip past about 30 Nov squeezes the video and real usage. Mitigation: start action 2 and action 4 today, and keep the old contract deployable as a fallback.
2. **"TapeOut is decorative" and the TapeFlow overlap.** If container payout can't ship (for example, if the container can't send ERC-20 out), Bulla reads as escrow plus a label. Mitigation: action 4 verifies first. The fallback is `ownerOf` binding plus paying the NFT holder, which is still enforced on chain.
3. **The live demo failing in front of judges.** A drained public gas tank, an unconfirmed testnet explorer path, or a DeWEB gateway that doesn't resolve. Mitigation: the tank cap and routine, clean-browser tests, a backup video, and an HTTPS mirror.

## 12. Fan-out notes

11 of 20 models answered (`fanout-raw.md`; the distill was written by `or/nvidia/nemotron-3-ultra-550b-a55b:free`). The consensus matched this audit: TapeOut is decorative, nothing is live, there are no users, and TapeFlow and CoTape are the main rivals. One outlier (llama-3.3-70b) scored 7 to 8. I rejected these suggestions as invented or wrong: a "mainnet judge mode" (judge mode is testnet only by design), "FAB mined per invoice", "TapeCode credential", "OKX Pay fiat widget" (no source), a "circuit dispute vote", specific revenue projections, and a "TapeFlow 1% fee". The distill also marked the 1,500 BEM grant as unverified. It is sourced above.
