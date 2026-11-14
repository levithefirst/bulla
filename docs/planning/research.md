# X Layer TapeOut Accelerate — research notes (run 2)

Researched: Saturday 14 November 2026, Africa/Lagos. Sources opened this turn only. Do not treat this as a protocol spec.

## Event (official)

- Page: https://web3.okx.com/xlayer/build-x-series
- Build X series current round: **X Layer TapeOut Accelerate**, 16 Oct 2026 – **7 Dec 2026, 23:59 UTC** (provisional; official page governs any change). Format: online, shortlisted teams attend an offline Demo Day.
- Pitch: build practical on-chain apps powered by the TapeOut protocol that solve real problems and deliver value. Official wording: TapeOut is “a protocol that provides the computing logic that an application can use.”
- Prize pool: **100,000 USDT** — 1st 20,000 (1 winner); 2nd 10,000 × 5; 3rd 6,000 × 5. Pool may grow via TapeOut founder/team/community. Paid in stages after eligibility checks, amounts before tax. Winners also get official X Layer PR support. Recipients need a self-custodial wallet.
- Community voting UI also exists at https://web3.okx.com/xlayer/hackathon-voting (hold eligible X Layer tokens → up to 10 votes). That page’s “3 winning teams” line conflicts with the 11 prize slots on the official Build X page; **trust the prize table on the official event page**. Official ranking is by the X Layer and TapeOut teams, not community votes alone.
- Eligibility: 18+ or age of majority (or legal entities). Restricted persons under X Layer ToS ineligible. Individuals and teams welcome. Existing projects allowed only with substantial new work during the event; only that new work is judged.
- Must build in the TapeOut ecosystem and either use TapeOut circuits, contracts, or on-chain data **on X Layer**, or run on X Layer DeWEB. Eligible directions include apps, games, online services, developer tools, circuit design, and PoD-mechanism projects. Building on existing ecosystem tools is welcome. Project must use X Layer for the TapeOut part; interfaces may be off-chain.
- Submission: Google Form by the deadline. Circuit projects: processor contract address + circuit ID. Websites/apps/tools: access link + which TapeOut features they use. Description must cover product, target users and how to reach them, revenue model, and why users would pay and stay.
- Optional demo video ≤ 3 minutes: problem, core features, target users and business model, how TapeOut/ecosystem tools are used.
- Official judging criteria:
  1. User Value and Commercial Potential
  2. Innovation (originality in circuit, product, or UX; new TapeOut use cases)
  3. Ecosystem Integration (TapeOut and/or DeWEB, FabX, TapeCode, TapeKit, TapeSend — no specific tool required)
  4. Product Readiness and User Experience
- FAQ (official): not all logic must run inside a circuit (explain what uses TapeOut). You need not deploy your own processor. Revenue need not exist yet. Deadline is provisional.

## What TapeOut / the stack is (public sources)

Verified from Fab X, Tape4Fun, TapeKit/TapeSend docs, and TapeOut news explainers — not an official whitepaper dump.

- **TapeOut**: described as an on-chain hardware-manufacturing protocol: NAND (compute) and LATCH (memory) gates, circuit netlists, circuit NFTs, and Proof of Design (PoD). Users design/wire a circuit (canvas or AI-assisted) and “tape out” / mint it as a circuit NFT. Fab X: “Everything is built from just two tokens: NAND computes, LATCH remembers.”
- **Circuit container**: community explainer (TapeOut news, “科普第七期”) — a Container is an **account identity bound to a circuit NFT**, not a Docker container. It can hold a DeWEB site and act as a message endpoint. A site still hosted only on a normal server is not fully on-chain even if a circuit exists.
- **DeWEB**: on-chain site files (SiteRegistry). Accessed as an on-chain site / via compatible readers. TapeKit is the open-source DeWEB browser kernel: reads site bytes from multiple independent nodes and verifies every byte before the browser shell renders.
- **Fab X** (https://fabx.tech/en/): first community miner for TapeOut **on X Layer**. Verified, efficient circuit designs become Proof-of-Design miners earning **$FAB**. Stated incentive: leaner design and more popular linked DeWEB → more $FAB. Steps they publish: collect NAND/LATCH transistors → design and tape out as circuit NFT → verify and mine. Built on X Layer; connects circuit design, on-chain tape-out, PoD mining, and real DeWEB usage.
- **TapeHub**: launchpad tying project creation, minting, mining emissions, and market graduation to a PoD economy (Tape4Fun).
- **TapeCode**: DeWEB development/deployment tool (tapecode path described on Tape4Fun): guided build + audit, create circuit container, deploy contract and frontend into the on-chain container, aim for a one-gas publish readable by TapeKit-compatible clients. “Permanent hosting” is a protocol claim to verify in practice. ITO was described as part of the product vision; do not assume it is live.
- **TapeSend**: encrypted container-to-container messaging (TapeKit send README, status dated **18 Sep 2026**): messages written to a small DeWEB hub contract, E2E encrypted, clients verify against chain. **Conflict — do not assume:** that README said it was live on BNB Smart Chain and that Base/X Layer were planned but not active, hub not independently audited, still upgradeable. Later ecosystem pages present TapeSend as a multi-chain DeWEB messaging layer. Treat X Layer TapeSend as **unconfirmed unless tested**.
- Do not invent contract addresses, tokenomics, chain-specific mining (e.g. which chain mints which token), or unstated APIs.

## Past / adjacent winners and showcased products

TapeOut Accelerate itself has **no published final winners** (deadline still 7 Dec 2026).

TapeOut-adjacent:

- **Fab X** — winner of the first **TapeOut Genesis Transistor Hackathon** (reported 19 Oct 2026 on tapeout.link). Circuit design + on-chain tape-out + PoD mining + DeWEB usage on X Layer.
- First **X Layer × TapeOut Live (Demo Day)** recap (KuCoin/insight reprint of an X post) highlighted three working integrations:
  - **Embers World** — 2.5D pixel action RPG on X Layer + DeWEB; also described as an Ignix hackathon award winner; in an X Layer accelerator; Pass card as access.
  - **TapeLaunch** — natural-language idea → AI-generated interactive DeWEB site in a TapeOut circuit container → one-click token issuance via Ignix (X Layer) or others, with transaction-tax revenue. Demo: meme site from a trending phrase + token launch.
  - **LaikaAI** — filtering/judgment layer for AI-generated content and easier token issuance (whitepaper praised in the recap; treat as showcase, not a confirmed hackathon placement).
- Community noise: a TapeOut news item (8 Nov 2026) mentions a decentralized short-video concept **TapeTok** and some participant confusion about prize amounts; not an official winner list.

Earlier **Build X** rounds on the same official page (winners are thinly documented; flag uncertainty):

- **OKX.AI Genesis** (2–27 Jul 2026, online). Secondary coverage (The TAO Daily, 13 Aug 2026; LinkedIn reprint) says **Leadpoet (SN71)** took Best Product / #1, **Bench3** #2 (repo/contract security scanning), **Clawby** #3 (real-time financial/trading infra for AI agents). A conflicting Oct 2026 recap claimed no public winners list had been found — treat the Leadpoet podium as reported, not official-page-confirmed. Pattern that won: live product, clear user, real workflow (sales intel / security / agent infra), not a protocol demo.
- **AI Season** (7–21 Aug 2026) and earlier Hook / X Cup / Hook x World Cup seasons: **no reliable public winner list found this turn.**

Implication for a new entry: judges have already seen miners, AI-to-DeWEB launchers, games on DeWEB, and generic launchpads. A winning idea should not be a thinner Fab X, TapeCode, or TapeLaunch clone. Prefer a live, layperson-usable product that uses TapeOut because the circuit/container/on-chain data is necessary, and that can be shipped solo by 7 Dec 2026.

## Source list

- https://web3.okx.com/xlayer/build-x-series (official rules, prizes, FAQ, terms)
- https://web3.okx.com/xlayer/hackathon-voting (community vote UI)
- https://fabx.tech/en/
- https://tape4fun.com/en/index.html and https://tape4fun.com/en/tapecode.html
- https://github.com/TapeOutProtocol/TapeKit/blob/main/send/README.md (TapeSend status 18 Sep 2026)
- https://tapeout.link/news/2112123691479994836 (Fab X Genesis hackathon win)
- https://tapeout.link/news/2113083679811809726 (container / SiteRegistry / TapeKit explainer)
- https://tapeout.link/news/2119107655621095926 (community prize chatter; TapeTok)
- https://www.kucoin.com/news/insight/X/6aef4c2dabae5e0007c55a2e (Demo Day showcase recap)
- https://taodaily.io/leadpoet-sn71-takes-1-at-okx-hackathon-beating-thousands-of-entries/ (OKX.AI Genesis podium, secondary)
