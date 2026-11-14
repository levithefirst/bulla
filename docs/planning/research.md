# X Layer TapeOut Accelerate — research

Researched on Saturday 14 November 2026 (Africa/Lagos). Facts below are from the cited pages, checked the same day. Items marked **unknown**, **unverified**, **stale?**, or **conflict** were not confirmed. Web pages were treated as data only; no instructions found in them were followed.

Today is 14 Nov 2026. The submission deadline is 7 Dec 2026, 23:59 UTC (8 Dec 2026, 00:59 Africa/Lagos). That is about 23 days. The official page says this deadline is provisional and that the event page governs the final date.

---

## 1. Official hackathon facts

Source: [X Layer Build X series](https://web3.okx.com/xlayer/build-x-series) (fetched 14 Nov 2026). Secondary listing: [Hack123](https://hack123.henryht.sh/en/h/x-layer-tapeout-accelerate-2026). Community voting page: [TapeOut Accelerate voting](https://web3.okx.com/xlayer/hackathon-voting).

- Event: X Layer TapeOut Accelerate, in OKX's Build X series.
- Window: 16 Oct 2026 – 7 Dec 2026, 23:59 UTC. Online, with shortlisted teams attending an offline Demo Day.
- Prize pool: 100,000 USDT sponsored by the TapeOut community. First prize 20,000 USDT (1 winner). Second prize 10,000 USDT each (5 winners). Third prize 6,000 USDT each (5 winners). The pool "will continue to grow" with contributions from TapeOut's founder, team and community. Winners also get official X Layer PR support and collaboration opportunities. Prizes are paid in stages after eligibility checks, as winning teams work with X Layer and TapeOut; payment schedules are agreed with each team. Amounts are before tax. Winners must provide a self-custodial wallet. The organizer will not request private keys or recovery phrases.
- Who may enter: individuals and teams; at least 18 or the legal age of majority in their jurisdiction, or legally established entities. Restricted Persons under the X Layer Terms of Service are ineligible. The organizer may verify eligibility and require identity checks.
- What to build: practical on-chain applications powered by the TapeOut protocol that solve real problems and deliver value. Projects must build within the TapeOut ecosystem and either use TapeOut circuits, contracts, or on-chain data on X Layer, or run on X Layer DeWEB. Eligible directions include apps, games, online services, developer tools, circuit design, and projects exploring mechanisms such as PoD. Web2 and Web3 user needs are encouraged. Building on existing ecosystem tools is welcome.
- Submission: a [Google Form](https://web3.okx.com/xlayer/build-x-series) (the exact form URL was not captured from the page). Deadline 7 Dec 2026, 23:59 UTC, provisional. Circuit projects must submit the processor contract address and circuit ID. Websites, apps and tools must provide an access link and explain which TapeOut ecosystem projects or features they use. The description must cover the product or service, target users and how to reach them, the proposed revenue model, and why users would pay and keep using the product. Circuit, tool and mechanism projects may explain the use cases and commercial applications they support. Existing projects may enter but must include substantial new development completed during the event; only that new work is judged. A demo video is recommended, no more than three minutes, covering the problem, a demo of core features, target users and business model, and how the project uses TapeOut or related tools.
- FAQ (official):
  - Not all functionality must run inside a circuit. Interfaces and other computation may run outside. Explain which features use TapeOut.
  - You do not need to deploy your own processor. You may use existing processors, circuits and tools.
  - The project does not need to be generating revenue already, but must explain users, the problem, and a proposed revenue model.
  - The project must use X Layer: TapeOut circuits, contracts or on-chain data on X Layer, and provide the relevant addresses. Interfaces and other components do not need to be deployed on-chain.
- Judging: the official X Layer and TapeOut team jointly evaluate entries and determine final rankings on:
  1. **User Value and Commercial Potential** — real user needs and target markets, potential for long-term growth and sustainable operations.
  2. **Innovation** — originality in circuit design, product features, or user experience, and potential to expand TapeOut into new use cases.
  3. **Ecosystem Integration** — effective use of TapeOut or ecosystem capabilities such as DeWEB, FabX, TapeCode, TapeKit, and TapeSend. Use of any specific project or tool is not required.
  4. **Product Readiness and User Experience** — functional core features, a complete user journey, and a reduced technical barrier for users.
  5. **Demo Video** — recommended, ≤ 3 minutes, as above. This is a submission artifact, not an idea-selection criterion on its own.
- Support: event inquiries and technical support via a Telegram channel linked from the official page. Channel URL not captured here.
- Community voting (separate from official judging): the [leaderboard](https://web3.okx.com/xlayer/hackathon-voting) is live. A 12 Nov 2026 TapeOut.news recap of community posts said 32 participating projects were shown on the OKX Wallet campaign page; addresses holding BEM, FAB or a TapeCode-Test NFT can vote, max 10 votes per address; voting was said to close at 22:00 on 18 Dec (timezone not stated in the recap). @TapeOutCF was reported to add 1,500 BEM in developer grants. Official judging remains with the X Layer and TapeOut team. The public projects API (`/priapi/v1/wallet/onchainfun/activity/hackathon/xlayer_tapeout_2026/projects`) returned a signed-request error, so the full official list of 32 entries was **not retrieved**. The voting page also contains the line "3 winning teams, judged by X Layer and TapeOut," which **conflicts** with the 11 prize slots on the official event page. Treat the event page prize table as authoritative.
- **Unknown:** exact Google Form URL; Demo Day date, city and format; whether community votes affect official ranking; complete 32-project list; current size of any extra prize-pool contributions.

---

## 2. What TapeOut is

Primary sources: [tapeout.net](https://www.tapeout.net/), [whitepaper / canvas page](https://tapeout.net/whitepaper), [TapeOut.link beginner guide: what is TapeOut](https://tapeout.link/guide/what-is-tapeout), [circuits, containers and .tape addresses](https://tapeout.link/guide/roles-and-addresses), [DeWEB guide](https://tapeout.link/guide/deweb), [TapeCode guide](https://tapeout.link/guide/tapecode), [TapeAPI docs](https://tapeapi.fun/docs/en/), [TapeKit TapeSend README](https://github.com/TapeOutProtocol/TapeKit/blob/main/send/README.md), [Fab X](https://fabx.tech/en/), [Fab X stats](https://fabx.tech/en/stats), [Tape4Fun ecosystem index](https://tape4fun.com/en/index.html) and [project cards](https://tape4fun.com/en/ecosystem.html). Community beginner guide PDF extract: [ch. 4](https://github.com/chickdady-svg/tapeout-beginner-guide/blob/main/docs/08-chapter-04.md) (auto-converted; treat truncated addresses as incomplete).

### Protocol

TapeOut is an on-chain hardware-manufacturing protocol. It does not fabricate silicon. It turns two logic primitives into tokens, lets anyone wire them into a netlist on a web canvas, then "tapes out" the design: the component tokens are burned and a unique ERC-721 circuit NFT is minted, with the netlist frozen on-chain and publicly callable. Official framing: infrastructure so a blockchain can carry verifiable tools of production and verifiable computation, not only financial assets.

- **NAND** (ERC-1155): compute. Two boolean inputs; output is 0 only when both inputs are 1. About 7 bytes per gate.
- **LATCH** (ERC-1155): memory. Holds one bit of state and updates on each tick. Area weight is 6× a NAND.
- Wiring happens on the canvas at TapeOut.net, for free in the browser until tape-out. A finished circuit can be dropped onto a later canvas as a black box (REF).
- A **processor** is a "transistor factory" created from a factory contract, with its own component supply and its own circuit numbering. Components from different processors cannot be mixed.
- Each taped-out circuit can open an **ERC-6551 container**: an on-chain account bound to the circuit NFT, with no private key of its own. Control follows whoever holds the circuit. The container can hold assets, host a `tape://` DeWEB site, and act as a TapeSend endpoint. A container cannot hold another protocol circuit (no nesting). The beginner guide states containers are not suitable for irreversible lock-up or staking promises. Selling the circuit transfers the container and its contents.
- Container open fees reported in the beginner guide (as of late Sep 2026): 0.012 BNB on BNB Chain; **0.08 OKB on X Layer**. Later protocol fees on asset withdrawal go to a treasury, are swapped to BEM, and 80% is periodically burned (per the same guide / founder announcement). Confirm live wallet amounts before paying; docs and on-chain fees have disagreed before.
- **PoD (Proof of Design)** mines **$BEM** on **BNB Chain only**. Better / leaner designs earn more weight. BEM cap 21,000,000, launched 21 Aug 2026, first halving around 19 Aug 2030. The PodMining contract was sealed on 14 Sep 2026 (owner removed). X Layer does **not** produce BEM. Around 4 Oct 2026 a 1:1 lock-and-mint BEM bridge between BNB Chain and X Layer went live, with messages relayed by LayerZero (beginner guide).
- Naming: canonical form `<circuit#ID>.<processor>.tape`, e.g. `4246.0.tape`. Multi-chain area codes: BNB Chain has none; **X Layer is 2**; Base is 3 (Base still planned as of the DeWEB guide). Example: `1.2.344` is circuit #1 on processor 344 on X Layer.
- Standards (TAP, CC0, repo `TapeOutProtocol/TAPs`): TAP-01 process; TAP-02 netlist format and evaluation; TAP-10 DeWEB access and messaging; TAP-11 to TAP-13 application conventions for service listings, holder delegation, and sealed commitments / signed responses. TAP-10 was still being rewritten as of the TapeSend README dated 18 Sep 2026.
- Legal / status from tapeout.net: open-source non-custodial protocol; users interact with contracts from their own wallets. **Protocol v2.0 is still in development and not deployed**, so the factory remains upgradeable under a 3/5 multisig, stated as only for new versions and security fixes. Users must be of legal age, not sanctioned, and comply with local law.
- BNB Chain factory (whitepaper page): `0x68224F668083c29e9800Be2a646d42d18cedF7e2`. Genesis project (Circuits) `0x50A994E71615474b55559fF4F500928fbc339DD9`. Genesis transistors `0x1d23Bf70ec6bAAD95f396Ea38f8A8415119dFDE6`.
- X Layer contracts observed from Fab X stats (14 Nov 2026): CPU factory `0x1f09daefa827f02cbb40967cc91b259763760761`; "Transistor Beacon" `0x1059ad62cabb6a6925bb65aa617300556c60a51b`; "Circuit Beacon" `0xf70d1ed4f62cf3780157b0b421b7e2f45bd0991c`. The community beginner guide (Sep 2026 extract) gives truncated X Layer addresses: container-open / FEE contract `0x536a…0106`, SiteRegistry `0xd6ef…adb6`, DomainBinding `0x6880…66f9`. Full checksummed strings for those three were **not captured**. The same guide notes the official frontend on X Layer could, as of late September, only open and view containers, with transfer-out / withdraw not yet wired in that UI — **stale?**; re-check tools before building a site or moving assets.

### DeWEB, tools and SDKs

- **DeWEB**: websites whose bytes live in a SiteRegistry contract, addressed like `tape://4246.0.tape/`. Files are stored in 24,000-byte chunks, max 8.4 MB per file. A client derives the container from chain + processor + circuit ID, reads at a pinned block, and shows nothing unless length and SHA-256 match the on-chain record. Reads should agree across at least two independently operated nodes; mismatch is a reject, not a majority vote. Sites should be static files with relative paths. The "100% on-chain" mark requires no off-chain references in HTML/CSS. The tape:// spec was at v0.2 draft (13 Sep 2026). The guide still calls the stack early: storage cost, read speed and UX are unfinished; the kernel was not on npm as of that guide.
- **How to open a site:** official gateway pattern `https://4246-0.tapekit.org/`; Chrome search shortcut; browser extension; `web+tape://` links; a desktop app was still planned. Upload paths: HashPort hosted console, or direct `putFile` / `appendChunk` / `setFallback` / `removeFile`. Community "container factory" can mint a one-NAND circuit and open a container in one flow. Upload cost on BNB Chain was quoted as about 0.01–0.03 BNB per MB (gas only). DeWEB monthly activation fees in docs have **conflicted** with an on-chain `monthlyFee()` of 0; trust the wallet prompt.
- **TapeKit**: open-source DeWEB browser kernel. Reads from multiple nodes and verifies every byte. Official home also exists as an on-chain site (`tape://4246.0` and a copy bound to info.tapekit.org, per the beginner-guide app table).
- **TapeSend**: end-to-end encrypted messages between circuit containers, written to a DeWebHub contract on the sender's chain. No bridge or message server in the path. Content is encrypted (X25519 + XChaCha20-Poly1305); metadata (who, when, length) is public. **Conflict on X Layer status:** the [TapeSend README](https://github.com/TapeOutProtocol/TapeKit/blob/main/send/README.md) dated 18 Sep 2026 said it was live on BNB Smart Chain, with Base and X Layer planned but not active, and the hub still upgradeable and not independently audited. The DeWEB beginner guide and an X Layer Chinese-account announcement dated 19 Sep 2026 said the processor factory, circuit containers, site registry and TapeSend were already live on X Layer mainnet. **Do not assume TapeSend is usable on X Layer without a live test.** Hub address on BNB (and claimed same deterministic address on every chain): `0xe61A9C7213a6Aa616C246a2B569e555B417b25ee`.
- **TapeCode** ([tapecode.ai](https://tapecode.ai), released 10 Oct 2026): describe an app in text, generate frontend and contracts, built-in audit and one-click fixes, one-click circuit + container, deploy contract and frontend into the container. Visitors are described as needing no wallet, signature or gas. **ITO (Initial Tape-Out) is not live.** TapeTape is an in-product developer chat keyed by circuit ID. The guide warns the tool was very new, with no public data on contract quality or audit coverage, and that on-chain deploys are hard to reverse.
- **Fab X** ([fabx.tech](https://fabx.tech/en/)): community miner for TapeOut on X Layer. Users mint NAND/LATCH, design or AI-assist a circuit, tape it out, and mine $FAB by passing on-chain task checks. Leaner designs and more popular linked DeWEB sites are said to earn more weight; staking BEM and OKB is also described as a boost. This is not BEM PoD, which stays on BNB Chain.
- **TapeAPI** ([docs](https://tapeapi.fun/docs/en/)): service layer — a circuit container can be an API. Clients resolve a name such as `11.1013.tape`, call a method, and verify a signed envelope. Works in Node, browsers, DeWEB sites and Workers via `@tapeapi/sdk`. Multi-chain names use area codes (`1.2.230.tape` is circuit 1 of processor 230 on X Layer). **Payments are on BNB Chain only** (and were marked "not deployed" in the reference table). X Layer support in the docs is **read-only**: identity, resolution, receipts, MCP checks. Identity does not carry across chains. Public API: `https://api.tapeapi.fun`.
- **TapeHub**: launchpad connecting project creation, minting, mining emissions and market graduation (Tape4Fun description).
- **HashPort**: hosted DeWEB upload console.

---

## 3. Existing ecosystem and current accelerator entries

Third-party indexes are not official endorsements. Product status changes quickly; several cards describe demos or planned features.

### Named tools and apps (from Tape4Fun, TapeOut.link guides, project sites)

Crowded already: circuit marketplaces and trading terminals, PoD/FAB mining dashboards and miner crowdfunding, AI DeWEB site builders, meme/token launches, explorers and directories, chat/social apps, raffles.

Independent / ecosystem products described as of this research (one-line, from Tape4Fun unless noted):

- **BEM-DRAW** — X Layer raffle; member and BEM-paid public rounds; circuit-based number selection with browser replay.
- **CoTape** — BNB Chain collaboration: designers publish netlists, backers pool NAND, then fabricate and split mining rewards.
- **EmberWorld** — X Layer DeWEB action-adventure; circuit-controlled teammates planned; full game still in development.
- **Fab X** — X Layer community miner and canvas (see above).
- **Firsto TapeOut** — non-custodial trading/asset terminal for BEM, components and circuit NFTs.
- **OwlGate** — mining-rig trading terminal (BNB) and Rig Bridge vouchers (X Layer).
- **SnapVault** — X Layer creator content: encrypted images unlocked with OKB; DeWEB frontend, TapeCode updates, optional TapeSend.
- **TapeAI** — agents with circuits/containers as identity and authorization; many features not yet open.
- **TapeAPI** — signed API receipts (see above).
- **TapeBots** — browser robot-battle experiment; no TapeOut fabrication or PoD integration.
- **TapeCircle** — community circles / chat / NFT membership; preparing invites, no public URL in the Nov 6 intro.
- **TapeDeck** — desktop app to verify and publish DeWEB sites and explain signing risks before wallet actions.
- **TapeDesk** — experimental; demo "taking shape" as of 3 Nov 2026, no public demo URL in that announcement.
- **TapeExit** — X Layer DeFi emergency frontend: inspect positions and preview exits when a normal site is down; public release is read-only (Uniswap V3 positions and Spark USDC vault); cannot recover keys.
- **TapeFlow / TapeFlow X** — TapeOut payment UI on X Layer (OKB / tokens / container payments, QR, red packets, escrow, scheduled payments — confirm what is actually live).
- **TapeFoundry** — historical "design house" / arithmetic circuit series (also a named processor on the official marketplace).
- **TapeGang** — meme/cassette site built with TapeLaunch; token launch planned, not a production utility.
- **TapeKey** — grant and revoke temporary DeWEB publish permissions on a container without sharing the key, up to 30 days.
- **TapeLaunch** — AI app builder: prompt → preview → publish on DeWEB, and (in accelerator pitches) one-click token bound to the work.
- **TapeLiquid** — self-described first TapeOut DEX on X Layer (spot + perps, on-chain frontend); status not independently verified here.
- **TapeMonkey** — planned virtual-world / NFT collection; product completeness unverified.
- **TapeOut Community Foundation** — community funding for public goods; not a product entry by itself.
- **TapeOut Market** — marketplace for components, circuits, miners and BEM, plus design tools (community report: X Layer market with an online designer and open-source toolchain).
- **TapeOut VIP** — mining and market analytics dashboard.
- **TapeOut.link** — ecosystem directory, news, beginner guides, TapeKit-based browser.
- **TapeOutScan** — public explorer for circuits, tasks, fabrication, mining and transfers.
- **TapePool** — X Layer miner lending against expected BEM output (7- or 14-day terms); verify live risk before treating as shipping.
- **TapeRobot** — older BNB Chain circuit-NFT game description; current status uncertain.
- **TapeRover** — verifiable robotics safety-policy lab: rules compiled into NAND circuits, rover decisions are inspectable.
- **TapeSite** — another AI website builder that publishes to an existing container.
- **TapeStry / Tapestry** — on-chain social app (timeline, posts, replies) with a DeWEB frontend.
- **TapeSurge** — pool BEM to buy and hold PoD mining rigs and run prize draws (BNB Smart Chain design).
- **TapeUP** ([tapeup.io](https://tapeup.io/en)) — client-side cross-chain ledger: read and verify identity, pages and messages on source chains; does not bridge assets or execute on a destination chain.
- **TapeVeil** — privacy experiment; public demo is a simulation that resets on refresh.
- **TapeXO** — X/Twitter raffle on X Layer; lists hashed on-chain before the draw; no wallet needed to enter.
- **Tiny Things** — concept only (no-code micro-tools); no working app or public demo URL.
- **ToshX** — BNB Chain IGO launch/trading terminal for verified agents; not an X Layer TapeOut app per se.
- **Zero (TapeZero)** — agent that checks token contracts and TapeOut circuit NFTs against published gate-count/netlist criteria; identity verification, not price advice.
- Also named in the Sep 2026 on-chain-site scan / guide tables: TapePilot, Tapestar, GatePilot, UPay countdown page, TapeOut Cards, Circuit 283 / ncd2net, SkillPass Control Room on X Layer (`tape://1.2.223`), container factories, TAPQQ / on-chain chat, BEM burn dashboards, wNAND wrappers, BEMD container wallet. Many of these live on BNB Chain.

Beginner guide (as of 25 Sep 2026): 51 containers had written files; 39 community sites (36 BNB, 3 X Layer) plus 2 official. That count is **stale** relative to mid-November.

### Accelerator / leaderboard projects named in community recaps (not a complete official list)

From [4 Nov recap](https://tapeout.link/news/2117885181030019262), [10–12 Nov recaps](https://tapeout.link/news/2120076495263518945) and [12 Nov leaderboard note](https://tapeout.link/news/2120844009090515117):

- **TapeLaunch** — one-sentence idea → AI-generated DeWEB + optional bound token.
- **On-chain Chinese social** (@wocean434191) — identity, posts and tips on-chain; gas-free signup/posting claimed; "official version already playable."
- **Decentralized live-streaming channel** (named in the recap; details not captured).
- **TapeSurge** — crowdfund PoD miners.
- **TapeExit** — X Layer DeFi emergency exit (read-only public release).
- **Café mini-game**.
- **TapeTrial** — tool for projects to dry-run on-chain campaign rules (e.g. "swap ≥ 100 USDC") against test transactions before publishing, to reduce support disputes. Proposed / pitched for this accelerator.
- **TapeUP** — verifiable cross-chain ledger (see above).
- **TapePlay** — game lobby in public beta: 10 mini-games, points that cannot be cashed out; post-launch income said to buy BEM (half burn, half operations) — from a 12 Nov community daily, not verified live.
- Related, not necessarily an official entry: BruceBlue Cardputer demo running a NAND circuit locally as a simulated charging pile, with a ZK proof for a disputed 32-tick window and on-chain verification claimed to have worked.

**Unknown:** the other entries among the reported 32; live URLs and completeness of each; whether any already lock a particular "verifiable receipt / escrow / credentials" niche.

### Pain points the ecosystem itself has named

An OKX Wallet livestream recap ([TapeOut.news](https://tapeout.link/news/2118905464243261483)) summarized remaining gaps as onboarding friction, tool maturity, user education, and a missing commercial loop, while framing TapeOut as composable, verifiable on-chain components from NAND/LATCH to circuit NFTs to DeWEB apps, with TapeCode lowering the creation barrier. DeWEB itself is still early. Official X Layer UI/tooling for containers may lag the contracts. TapeSend on X Layer is unconfirmed by a live test in this research. Containers cannot safely hold irreversible lock-ups.

---

## 4. Past OKX Build X / X Layer hackathon winners

The official Build X page lists prior seasons but does not name winners. The following come from secondary sources and should be treated as **unofficial unless re-confirmed**:

- **Build X Season 1** (agentic commerce, 100+ entries): first prize reported as **BondonCredit** (agent credit / reputation infrastructure). Second prize reported as **ai2humanwork** and **soulink_love**. First prize was described as 2,000+ USDT plus OKX promotional support. Sources: [The Agent Times](https://theagenttimes.com/articles/x-layer-s-build-x-hackathon-draws-100-entries-in-agentic-com-019e91d4); [TopicDigg recap of an X Layer post](https://topicdigg.com/x/XLayerOfficial/2041101165241516382).
- **Build X Season 2** (from a [Moltbook S2 wrap](https://www.moltbook.com/post/a62b2b73-590d-4c82-98d8-1fcfc25e1ab3), not an official OKX page): X Layer Arena — 1st **ASG Pay** (banking layer for AI agents), 2nd **AlphaLoop**, 3rd Helios, TriMind Agent, X Layer Agent Nexus. Skills Arena — 1st **PreflightX**, 2nd Agent Governance Auditor and Fast Bridge X Layer, 3rd AgentEscrow, Guardian Protocol, X Layer Uniswap Intent Guard. Pattern: payments, credit, safety middleware, and complete agent-commerce rails won, not thin demos.
- **OKX.AI Genesis** (listed on the Build X page as 2–27 Jul, time zone UTC on the page; year not repeated in the heading). Secondary articles credit **Leadpoet (SN71)** with a top product prize at an "OKX AI Genesis Hackathon." It is **unverified** here whether that is the same Build X season or a different OKX event.
- **AI Season** (7–21 Aug 2026), **Hook x World Cup**, **X Cup season**, and **Hook season**: winner names **not found** in this pass.

Implication for this season: judges have historically rewarded complete, commercially framed products that remove a real friction (trust, payments, safety). This season explicitly requires genuine TapeOut / X Layer DeWEB use, not a generic X Layer app with a decorative circuit.

---

## 5. Constraints and flagged unknowns for idea selection

Hard constraints:

- Must use TapeOut circuits, contracts or on-chain data **on X Layer**, or run on **X Layer DeWEB**, and publish addresses or an access link.
- Must be a **live product a layperson can use**, shippable solo with code and AI before 7 Dec 2026 (~23 days), not a slide-deck or local demo.
- Need a real problem or a process removed entirely; a revenue model; a way to reach users; why they would pay and stay.
- Do not copy a direct competitor unless clearly stronger. Crowded: AI site builders (TapeCode, TapeLaunch, TapeSite), miner/marketplace/DEX/launchpad tools, generic social/chat, raffles, "emergency DeFi frontend" (TapeExit), campaign-rule testers (TapeTrial), cross-chain record readers (TapeUP).
- A circuit used only as a file host, with no verifiable logic, is a weak ecosystem story. Not all logic must be in a circuit, but the TapeOut part must be meaningful.
- Do not design around irreversible container lock-ups. Do not assume BEM mining on X Layer. Do not assume TapeSend or full official container-withdraw UI on X Layer without a test. Do not assume TapeAPI payments on X Layer.
- No public submission or announcement without Fluid's OK. Signups use memequant@mail.grokbot.com, never leviweb3x@gmail.com.

Key unknowns (do not invent answers):

- Full official list of the reported 32 leaderboard projects.
- Exact Google Form URL; Demo Day logistics; whether votes affect judging.
- Live status of TapeSend on X Layer; current official X Layer container-transfer UI; full X Layer SiteRegistry / DomainBinding / open-container addresses (only truncated forms captured for some).
- ITO not live. TapeCode contract quality unproven.
- Past-season winner lists not published on the official Build X page.
- Whether Fab X $FAB mining, OKB/BEM staking boosts, or specific third-party DEXs/lending products are safe or complete.

Sources used: URLs inline above, plus [Tape4Fun](https://tape4fun.com/en/ecosystem.html), [tapeout.net whitepaper](https://tapeout.net/whitepaper), [OKX Wallet livestream recap](https://tapeout.link/news/2118905464243261483), [X Layer market toolchain note](https://tapeout.link/news/2106567154913120761).
