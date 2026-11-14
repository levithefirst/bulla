You are a brutal serial hackathon judge. You have judged previous X Layer and OKX Build X seasons and many web3 series (ETHGlobal and others). You have studied past winners. You have the current competition list in this prompt. You are not polite and you do not hedge. Weak ideas die in one sentence. Scores are integers. If evidence is missing, say so and cut the score; do not invent studies.

TODAY: Saturday 14 November 2026. DEADLINE: 7 December 2026, 23:59 UTC (~23 days). Official event: https://web3.okx.com/xlayer/build-x-series. Prize pool 100,000 USDT (1st 20k; five 2nd at 10k; five 3rd at 6k). Shortlisted teams attend an offline Demo Day. 18+. Official judges: X Layer and TapeOut teams. Community voting is separate and must not be confused with official ranking.

MUST build in the TapeOut ecosystem and either use TapeOut circuits, contracts, or on-chain data ON X LAYER, or run on X Layer DeWEB. Submission: Google Form; access link or processor contract address plus circuit ID; description of product, target users/reach, revenue model, why users pay and stay; optional demo video ≤3 min. Existing projects need substantial new work in-window.

TAPEOUT FACTS (from prior verified research; do not invent features): On-chain hardware manufacturing, not silicon. NAND computes, LATCH remembers; tape out a netlist as a circuit NFT. A Container is an account identity bound to the circuit NFT (not Docker); it can hold assets and host a DeWEB site. DeWEB site bytes live in a SiteRegistry; TapeKit verifies bytes across independent nodes. Fab X is the X Layer community miner ($FAB). TapeCode = guided DeWEB build/deploy (do not assume ITO is live). TapeSend on X Layer is UNCONFIRMED — do not depend on it in v1. FAQ: not all logic must run inside a circuit; you need not deploy your own processor; revenue need not exist yet. Do not invent contract addresses, bridges, or tokenomics. Container control follows the circuit holder — never claim “safe if the wallet is stolen.”

OFFICIAL SCORE AXES, each 0–10, total /50:
1) User value and commercial potential
2) Originality
3) Use of TapeOut (necessary, not decorative)
4) Completeness / product readiness and UX
5) Shippability solo with code+AI by 7 Dec 2026

THE IDEA BAR (fail any one and the idea is dead):
- REAL, WIDESPREAD pain: many people face it often, not a contrived few-instance problem. You must cite evidence of WHO suffers and HOW OFTEN (a named public source, or label the claim UNVERIFIED and treat it as weak). Vague “people need trust” is not evidence.
- The product eliminates a process or makes it nearly nonexistent — not a prettier wrapper around the same process.
- Novel versus the competition list below and versus obvious web2 clones.
- A live product a layperson can use (first useful action should be possible without a research paper; wallet optional for the first useful view if the product allows it). Not a localhost demo.
- Shippable solo by 7 Dec. If it needs issuer-network BD, manufacturer deals, telco, or unconfirmed TapeSend-on-X-Layer, it is not v1 or it is dead.

COMPETITION RULE: before you keep an idea, check it against EVERY named project in the competition list and against the crowded ecosystem classes. Kill it if it overlaps unless it is clearly superior on EVERY official axis (value, originality, TapeOut use, completeness, shippability). State the comparison and the reason. The official leaderboard has 32 entries but only 11–19 names were recoverable; do not assume a blank niche is empty.

RE-JUDGE THESE TWO PRIOR PICKS under this bar (survive or die, with scores and a one-paragraph verdict each, including overlap checks):
- Run 1 winner: SealReceipt — verifiable commercial receipt / proof-of-purchase bound to a TapeOut circuit, shareable audit page. Prior unofficial score 41/50.
- Run 2 winner: TapeInvoice — milestone invoice + escrow; companion X Layer contract holds funds/state; circuit container as escrow identity; DeWEB UI and no-wallet receipt. Prior unofficial score 41/50.
They may be killed. Do not protect them because a previous run liked them.

PROCESS (silent), then output only the final sections:
1) Generate at least 8 distinct candidates in different categories. Attack each. Kill against the bar and the competition list.
2) Re-judge SealReceipt and TapeInvoice.
3) Score survivors /50. Pick 1 winner and 2 runners-up most likely to deserve official 1st, not the flashiest.
4) List ideas killed specifically for overlap, with the overlapping incumbent and the reason.

OUTPUT FORMAT (plain text, no preamble):

REJUDGE SEALRECEIPT: SURVIVE or DIE. Scores: Value __/10, Originality __/10, TapeOut __/10, Completeness __/10, Shippability __/10, TOTAL __/50
Verdict: <overlap check + bar check, 4–7 sentences>

REJUDGE TAPEINVOICE: SURVIVE or DIE. ... same skeleton

WINNER: <name>
Pitch: <one sentence>
Pain-point evidence: <who, how often, named source or UNVERIFIED>
Why it wins: <4–7 sentences, including necessary TapeOut use on X Layer / DeWEB, and why it beats named overlaps>
Scores: Value __/10, Originality __/10, TapeOut __/10, Completeness __/10, Shippability __/10, TOTAL __/50
Users and reach: ...
Revenue and retention: ...
Must-build v1: ...
Cuts: ...
Demo-killing risks: ...

RUNNER-UP 1: <same skeleton as winner, no need to repeat killed list>
RUNNER-UP 2: <same>

KILLED FOR OVERLAP:
- <idea> overlaps <incumbent>: <reason>

KILLED ON THE BAR (not just overlap): <names and one-line reasons>

AGREEMENT NOTES: assumptions you refused to invent; evidence you could not verify.

===== COMPETITION LIST (embed; do not ignore) =====

# TapeOut Accelerate — competition inventory (run 3)

Collected: Saturday 14 November 2026, Africa/Lagos. This is a public-source inventory, not the official scored ranking. Official judging is by the X Layer and TapeOut teams; community votes are separate.

## Voting page / official list — NOT fully readable

- Official leaderboard UI: https://web3.okx.com/xlayer/hackathon-voting
- WebFetch and curl both return a JS shell (SSR chrome, empty “Community leaderboard,” no project names or counts in HTML). The app bundle is `xlayer-hackathon-voting/index.a4c11ac6.js`.
- The page calls signed Wallet APIs:
  - `GET /priapi/v1/wallet/onchainfun/activity/hackathon/xlayer_tapeout_2026/projects`
  - also `/…/xlayer_tapeout_2026`, `/…/votes`, `/…/my-vote-capacity`, `/…/vote-detail/xlayer_tapeout_2026`
- Unauthenticated curl to those endpoints returns HTTP 400 `{"msg":"incorrect request sign parameters","code":50113}`. The official 32-name list **could not be retrieved**.
- Community and official posts (12–13 Nov 2026) say **32 participating projects** are shown on the OKX Wallet campaign / voting page. Voting: hold BEM, FAB, or a TapeCode-Test NFT on X Layer; up to 10 votes per address; reported close 18 Dec 22:00 (timezone unstated in recaps). Official accounts promoted the page but did not publish the name list. The voting page line “3 winning teams” conflicts with the official 11 prize slots; trust the Build X prize table.
- DoraHacks / grants.watch / Hack123 list the event, not a submission roster. GitHub code search required auth and was not used.

Telegram: `https://t.me/s/okxannouncements` is publicly readable and repeats the 12 Nov leaderboard announcement (no names). `t.me/s/TapeOutWorld`, `t.me/s/XLayerOfficial`, `t.me/s/xlayerzh` did not yield a usable public message history in this pass (contact/view stubs).

**Implication:** treat the 32 as a real, incomplete field. Kill overlap against every *named* entry below and against the crowded ecosystem classes. Do not assume a niche is empty just because it is missing from this file.

## A. Confirmed or strongly evidenced Accelerate entries (named)

One-liner each. “Confirmed” means the project or a contemporaneous recap said it entered this Accelerate / is on the voting board. Sources abbreviated at the end of each line.

1. **TapeLaunch** — Prompt-to-DeWEB AI site builder plus one-click token bound to the work (IGNIX on X Layer). Officially signed up; Dev Showcase slot at first X Layer TapeOut Live. Source: @TapeLaunch (signup + live), tapeout.link/news/2117647196229427616, web3lgx 4 Nov recap.
2. **On-chain Chinese social** (@wocean434191) — Identity, posts, and tips on-chain; claims gas-free signup/posting, tips to author wallet; “official version already playable.” Source: web3lgx 4 Nov recap (tapeout.link/news/2117885181030019262).
3. **Decentralized live-streaming** (@AwuIndahouse) — Hosts control channel look and video from a wallet; tips planned with no cut; still in development as of 4 Nov. Source: same web3lgx recap (full text recovered via secondary quote of the thread).
4. **TapeSurge** — Crowdfund PoD miners (~30-day boards); half of output by stake, half as prizes; BSC live, X Layer testnet repo. Source: web3lgx recap; GitHub lincwang123-bot/tapesurge-xlayer (explicit Accelerate program).
5. **TapeExit** — X Layer DeFi emergency frontend: read positions and preview exits if a normal UI is down; public release described as read-only, no wallet required. Source: web3lgx recap; Tape4Fun / v1 research.
6. **Café mini-game** (@web3xJQ) — TapeCode café game: cook, serve, earn coins; no wallet required. Source: web3lgx recap.
7. **CoTape** — Collaborative tape-out / “Behemoth line” matching of designers and funders; miner-contract escrow and on-chain revenue split. Officially announced it entered and asked for votes. Source: @CoTape_1, 12 Nov; tapeout.link/news/2120892216428167555.
8. **TapeUP** — Client-side cross-chain ledger: read/verify identity, pages, and messages on source chains; does not bridge assets. Announced it is in the hackathon and asked for votes; mid-Nov X Layer deploy planned. Source: @tapeupio, 12 Nov; tapeout.link news.
9. **TapeAI** — Agents using circuits/containers as identity; announced it is in the X Layer × TapeOut hackathon and asked for votes. Source: @TapeAIAgent, 12 Nov.
10. **FabX Miner Desk** — Read-only desk for Fab X miners: per-trade rig purchase price/seller/tx, FMM dividend lookup by address. Free; “competing in TapeOut Accelerate, still updating.” Source: @runes_leo, 14 Nov; tapeout.link news; GitHub runesleo/fabx-miner-desk.
11. **hardline** (@hardline_01, Tajudeen) — No-code rule builder that compiles a user rule into a real TapeOut chip and tests cases before mint; chip #2 live on X Layer (allow/deny). “Just submitted” to this Accelerate. Source: @Tajudeen, 13 Nov; tapeout.link news.

Named confirmed/strongly evidenced: **11**. Official field claimed: **32**. **~21 official leaderboard names remain unpublished** in any source opened this turn.

## B. GitHub repos that self-describe as this Accelerate (may or may not be among the 32)

Treat as competitors / overlap risks even if they never appear on the wallet leaderboard.

12. **Forge / tapeout-forge** (davieslennox0/tapeout-forge) — Compiler/optimizer/equivalence checker for TapeOut NAND/LATCH circuits; infrastructure for builders, not a consumer app. README: built for this Accelerate.
13. **tapeout-compiler** (Akixama/tapeout-compiler) — Auto-found cheaper/verified circuits for TapeOut mining. README: OKX Xccelerate (X Layer × TapeOut).
14. **ViperX** (ritesh59697/ViperX) — On-chain proof layer / ranking for AI trading agents on settled fills; “TapeOut Circuit Guardian”; X Layer testnet + DeWEB claims. README: TapeOut Accelerate.
15. **TapeOut Gate** (MSAbhishek22/tapeout-gate) — README: entry for OKX TapeOut Accelerate; live demo as homepage (not independently opened this turn).
16. **TapeLife** (Isaiah-54/tapelife-xlayer) — “Living on-chain organisms” powered by TapeOut circuits. README: this Accelerate.
17. **X Arena** (Goatleaf12/x-arena) — Cartoon 3D arena shooter on X Layer. README: this Accelerate.
18. **NullState** (0xward/NullState-XLayer) — Pixel-art dungeon crawler on X Layer. README: this Accelerate.
19. **Latchwork** (eshaanvgupta/latchwork) — Programmable API service agreements using TapeOut circuits; Policy Studio preview. README says “hackathon prototype” on X Layer — **weaker confirmation** that it is this specific event.

GitHub-described Accelerate/Xccelerate entries: **8** (7 explicit + Latchwork weaker). Some may duplicate section A (Miner Desk already counted in A). Unique named in A+B: **18–19**.

## C. Crowded ecosystem products (treat as overlap even if not proven to be on the 32)

From Tape4Fun, TapeOut.link, and v1 research (reused as a market map, 14 Nov 2026). Status of each as an official Accelerate entry is **unknown** unless also listed in A or B.

AI / DeWEB builders: **TapeCode**, **TapeLaunch** (in A), **TapeSite**. Miners / markets / DeFi / launch: **Fab X**, **Firsto**, **OwlGate**, **TapeOut Market**, **TapeLiquid**, **TapePool**, **TapeHub**, **TapeFoundry**, **CoTape** (in A), **TapeSurge** (in A). Social / chat / content: **SnapVault**, **TapeStry**, **TAPQQ**, the Chinese social app (in A), **TapeCircle**. Raffles: **BEM-DRAW**, **TapeXO**. Safety / emergency / desktop: **TapeExit** (in A), **TapeDeck**. Campaign-rule dry-runs: **TapeTrial** (pitched for this accelerator in a 4–12 Nov recap; not independently re-confirmed as filed). Cross-chain readers: **TapeUP** (in A). Explorers / directories: **TapeOut.link**, **TapeOutScan**, **TapeOut VIP**. Agents / verification: **TapeAI** (in A), **Zero / TapeZero**, **TapeAPI**, **TapeRover**, **SkillPass**. Payments: **TapeFlow**. Permissions: **TapeKey**. Games: **EmberWorld / Embers World**, **TapePlay** (10-game lobby in public beta, 12 Nov dailies — entry status unknown), **TapeBots**, **TapeMonkey**, **TapeRobot** (status uncertain), **TapeFly** (new “fruit-fly brain” game mentioned 14 Nov; not confirmed as an entry). Concepts / weak demos: **Tiny Things**, **TapeVeil** (simulation), **TapeDesk** (no public URL as of early Nov). Community concepts, not confirmed entries: **TapeTok** (short-video idea), **TRUSTTAG** (physical-goods passport), **AutoFi** (rental deposits), **VERICARB** (environmental evidence), **TapeLens** (signed content versions), developer-collaboration escrow proposal.

Also shown at the first X Layer × TapeOut Live / Demo Day (not the same as a filed Accelerate form): **Embers World**, **TapeLaunch**, **LaikaAI** (AI-content / issuance filter).

## D. Past X Layer / OKX Build X and adjacent TapeOut winners (secondary sources)

Official Build X page lists seasons, not winner names. Treat as unofficial unless re-confirmed.

- **TapeOut Genesis Transistor Hackathon:** **Fab X** reported winner (tapeout.link, 19 Oct 2026). Other GH entries for that earlier event (do not confuse with this Accelerate unless they re-filed): **Cerebr** (neural processor / on-chain neurons), **TapeID** (circuit-as-coin on IGNIX), **Ember** (pixel fighting game), **Remembrance Seal**, **TapeMKT**, **Likely2X**.
- **Build X Season 1** (agentic commerce, 100+ entries): 1st reported **BondonCredit** (agent credit/reputation); 2nd **ai2humanwork**, **soulink_love**. Source: The Agent Times / TopicDigg recaps.
- **Build X Season 2** (Moltbook recap, unofficial): X Layer Arena — 1st **ASG Pay**, 2nd **AlphaLoop**, 3rd Helios, TriMind Agent, X Layer Agent Nexus. Skills Arena — 1st **PreflightX**, 2nd Agent Governance Auditor and Fast Bridge X Layer, 3rd AgentEscrow, Guardian Protocol, X Layer Uniswap Intent Guard. Pattern: payments, credit, safety rails — complete products, not thin demos.
- **OKX.AI Genesis** (Jul 2026): secondary reports name **Leadpoet (SN71)** Best Product, **Bench3**, **Clawby**. A conflicting Oct recap said no public list was found. Unverified whether that map 1:1 to the Build X page season.
- **AI Season / Hook / X Cup:** winner names not found.

## E. Pattern from other major on-chain hackathons (brief)

ETHGlobal Lisbon 2026 write-ups (The Graph blog / ETHGlobal showcase) again favored complete, executable workflows over demos: e.g. **ArcBook** (executable pricing curves / settlement), **Noirwire** (private order book with stale-data rejection), **PayFlow** (configurable payroll execution). Same lesson as Build X: a layperson or professional can finish a real job in one sitting.

## Counts (this pass)

| Bucket | Count | Notes |
|---|---|---|
| Official leaderboard, announced | **32** | Names not on the public HTML; API is signed. |
| Named, confirmed/strong Accelerate entries | **11** | Section A. |
| Additional GitHub self-described Accelerate entries | **7–8** | Section B, excluding Miner Desk already in A. |
| Unique named possible field (A+B) | **18–19** | Still short of 32. |
| Crowded ecosystem products to avoid cloning | **40+** | Section C, including unconfirmed entry status. |

Sources used this turn: official voting page + JS + signed API error; https://web3.okx.com/xlayer/build-x-series (rules, reused via v1/v2 research); tapeout.link news (4 Nov recap, 10–13 Nov leaderboard, CoTape, hardline, Miner Desk); X search via the `x` public tools (XLayerOfficial, TapeOutWorld, OKXWallet_CN, Blonskr, TapeAI, TapeUP, CoTape, runes_leo, Tajudeen, community dailies); t.me/s/okxannouncements; GitHub Search API; v1 research.md market map (read-only). Not used: wallet-signed OKX API, DoraHacks roster (none found), GitHub code search (auth required).

===== END COMPETITION LIST =====
