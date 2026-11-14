# TapeOut Accelerate idea fan-out — verdict (run 3)

Date: Saturday 14 November 2026, Africa/Lagos.
Competition first: `/workspace/hackathon-ideas/xlayer-tapeout-v3/competition.md`.
Fan-out: `python3 /workspace/multimodel/ask.py` with `fanout-prompt.md` on stdin. No `--ping`. Raw: `fanout-raw.md`.

## Models answered vs launched

Ask.py: **10 ok / 35 launched** in 160.0s fan-out (185.2s total). Target 12. Breakdown: 10 ok, 3 timed out, 16 rate-limited, 6 error. OpenRouter and Cloudflare daily caps again produced mass 429s.

Usable shortlists: **8 of 10**. cohere/command-a-plus was reasoning-only (counted ok). gemini-3.5-flash and nvidia/nemotron-3-ultra were truncated after the SealReceipt (and partial TapeInvoice) re-judge.

Auto-distill via **gemini-3.5-flash (25.2s)** completed and is useful as a meta-report: it correctly flagged rule-breaking incumbent picks and fabricated stats, then recommended minimax’s framework with **low confidence**. This verdict is an independent judgment, not a copy of that distill and not an average of model scores.

## What went wrong in the panel

Several “ok” models **picked current competitors as the winner** (FabX Miner Desk, hardline, TapeSurge, TapeLaunch, TapeAI, CoTape, TapeExit). That violates the brief. Others invented studies (World Bank SME unpaid-invoice rate, EDPB 23%, UNICRI 68%, Upwork 18%, ChainDebrief 47%, “12k Fab X miners / 68% underutilized,” “TapeOut.link 72% verification survey”). Those claims are **rejected**.

New, non-incumbent concepts that actually appeared: **ClaimCheck** (minimax), **DataVaultTimer** (gpt-oss), **EventTicketChain** (gpt-oss, truncated), **FabX Rig Simulator / TapeExit Pro / CircuitBazaar** (reasoning) — the last three are overlap cousins of Miner Desk, TapeExit, and TapeOut Market and are killed below.

## Re-judge: SealReceipt — DIE, 27/50

Scores: Value 5/10, Originality 4/10, TapeOut 5/10, Completeness 6/10, Shippability 7/10, TOTAL 27/50.

A shareable circuit-bound receipt does not eliminate issuance, delivery, or checking; it wraps them. The panel’s invented fraud-rate citations are discarded; this turn did not independently verify a named frequency for receipt-fraud or “lost receipt” that would clear the bar. It sits in the same class as community concepts **TRUSTTAG** and **TapeLens**, and is not clearly superior on every axis. A NAND/LATCH netlist is not required to print a hash on a page; without a necessary circuit function it fails “use of TapeOut.” Prior 41/50 does not survive this bar. Majority of models: DIE.

## Re-judge: TapeInvoice — SURVIVE, 37/50 — and the run 3 winner

Scores: Value 8/10, Originality 6/10, TapeOut 8/10, Completeness 7/10, Shippability 8/10, TOTAL 37/50.

**Pain-point evidence (verified this turn, not invented by the models):**
- Bonsai’s 2025 analysis of three years of invoicing data from 100,000+ freelancers: **29% of freelance invoices were paid at least one day late** (https://www.hellobonsai.com/blog/late-freelance-payment). Most late invoices still arrived within two weeks, but the delay is routine, not rare.
- Remote’s summary of freelancer surveys: **85% were paid late at least sometimes**, **21% more than half the time** (https://remote.com/blog/contractor-management/reversing-late-payment-culture).
- IPSE (UK): about **32–35% of freelancers** reported a client payment delay in the prior 12 months (2024 campaign material on ipse.co.uk).

Rejected as unverified/invented: “World Bank 2025 SME Financing Gap, 30% unpaid >30 days”; “Upwork/Freelancer.com 2025, 18% of projects contested.”

**Overlap check:** CoTape is designer/funder miner-contract escrow on the Behemoth line — not freelancer milestone invoices. TapeFlow is a general TapeOut payment UI (escrow listed among possibly un-live features). AutoFi is a community rental-deposit *proposal*, not a filed product. TapeInvoice is not clearly superior to a mature payments app on every axis, but it is not a clone of any *named confirmed entry*, and its job (milestone invoice + escrow + public no-wallet receipt on DeWEB) is narrower than “another payment dashboard.” Kill-for-overlap is not justified.

**Bar check:** It does not erase invoicing itself. It does attack the actual repeated process of “do the work, then chase payment / trust a platform’s opaque escrow.” That is a process reduction, not a process extinction; the score is not a 9 on value and not a 9 on originality. TapeOut is necessary only if the circuit container is the escrow identity and the receipt is a DeWEB-verifiable record — not if the circuit is a sticker on a normal contract. Container control follows the holder: **never market this as safe if the wallet is stolen.** Solo ship in ~23 days is tight but was already scoped in run 2. Prior 41 is cut to **37**.

### WINNER: TapeInvoice — 37/50

Pitch: A live milestone invoice and escrow for freelancers and small buyers: funds and state in a companion X Layer contract, a TapeOut circuit container as escrow identity, a DeWEB UI, and a no-wallet receipt link.

Pain-point evidence: see Bonsai 29% late invoices; Remote 85% / 21%; IPSE 32–35% (sources above). Widespread, frequent, not a few-instance story.

Why it wins this run: Under a harder bar, the only complete, non-incumbent product in the panel that still has *verified* frequent pain and a shippable v1 is this one. It is not a miner desk, not a site generator, not a game, and not a clone of the 11 confirmed Accelerate names. Differentiation from TapeFlow must stay sharp in the build: one invoice template, milestone or single-shot escrow, public receipt, no general wallet/payment suite. Official axes: commercial value is the strongest score; originality is middling because escrow is old; TapeOut use is real if the container and DeWEB receipt are load-bearing; completeness and shippability are honest sevens and eights, not nines.

Users and reach: Crypto-familiar freelancers and small buyers in OKX Wallet / X Layer / TapeOut channels first; then general freelancer groups. First 100: a public gateway link and a worked create→fund→submit→release example.

Revenue and retention: Small configurable fee on successful release. Users stay for a reusable, public payment history and a cheaper next invoice than a custodial platform.

Must-build v1 / cuts / risks: unchanged from the run 2 lock, plus an explicit TapeFlow/CoTape non-clone check and a wallet-holder risk warning on the fund button.

## RUNNER-UP 1: ClaimCheck — 32/50

Pitch: A no-wallet DeWEB desk: paste an order or shipment reference, get a plain-language “published claim / not published” read against a TapeOut-backed record.

Pain-point evidence (verified this turn; the model left this UNVERIFIED, correctly at the time): a 2021 MediaPost write-up of a consumer study found **96% of consumers track packages**, many daily (https://www.mediapost.com/publications/article/365002/study-almost-all-consumers-track-packages-and-ma.html). Locus’s 2026 US delivery-performance survey: **17%** report “sorry we missed you” notices and **21%** name missed windows as their biggest irritation. Retail Gazette (Mar 2026) quoted InPost’s UK CEO that first-attempt failure is systemic (**about one in three** parcels). Tracking and failed delivery are widespread. That does *not* prove people will switch from Amazon/UPS tracking to a new circuit desk.

Why it places, and why it is not the winner: It is a genuine new concept (minimax) aimed at buyer-side status, not another miner or AI site. v1 as specified is “pre-seeded” records — without merchant or carrier publish, it is a demo database with a circuit stamp and does not eliminate status-chasing. Issuer onboarding is a demo-killer for a *widespread* product by 7 Dec. Overlap risk with SealReceipt / TRUSTTAG / TapeLens if it becomes “pretty proof of an assertion.” TapeOut is necessary only if the published claim is what the circuit/container actually attests, not a JSON file on a server.

Scores: Value 7/10 (real pain, weak substitution), Originality 6/10, TapeOut 6/10, Completeness 5/10, Shippability 8/10, TOTAL 32/50.

## RUNNER-UP 2: DataVaultTimer — 28/50 (barely listed; bar is shaky)

Pitch: A personal vault that auto-expires encrypted files using a TapeOut latch-timer.

Pain-point evidence offered by gpt-oss (EDPB “fines up 23% in 2025,” UNICRI “68% worried about footprints”) is **flagged UNVERIFIED and treated as invented**. Residual privacy demand is real but was not evidenced to this bar in this pass.

Why it is only a weak runner: the latch-as-timer is one of the few *circuit-necessary* ideas in the panel. It is also protocol-risky: DeWEB/SiteRegistry is sold as durable on-chain hosting, so “delete the bytes” may be impossible; the write-up itself falls back to an **off-chain keeper**, which breaks the “hardware guarantee.” Container control still follows the holder. Completeness is low. Listed as runner-up only because the other “new” high scores were overlap clones.

Scores: Value 4/10, Originality 7/10, TapeOut 6/10, Completeness 4/10, Shippability 7/10, TOTAL 28/50.

## Killed for overlap

- FabX Miner Desk, FabX Rig Simulator, MinerProfitDash — incumbent or cousin of **FabX Miner Desk** (confirmed entry).
- hardline, TapeSurge, TapeLaunch, TapeAI, CoTape, TapeExit (as “new winners”) — **they are the competition**.
- TapeExit Pro — not superior on every axis to **TapeExit**.
- CircuitBazaar — **TapeOut Market** / circuit marketplace class; also near Forge/compiler tools.
- DeWebStream — **AwuIndahouse** live-streaming entry.
- CircuitGuard / agent-identity tools — **TapeAI** (and TapeUP / ViperX in the verification class).
- EventTicketChain — issuer BD plus a crowded NFT-ticket category; not shipped as a layperson product solo by 7 Dec.
- SealReceipt — TRUSTTAG / TapeLens class (see re-judge).

Killed on the bar (not only overlap): invented-stat miner/verifier dashboards; TapeTok-style “trust/social” with no frequency evidence; AutoFi/VERICARB-style concepts that need issuer or TapeSend; any escrow marketed as safe after wallet theft.

## Agreement with runs 1–2

**Agrees with run 2 on the named winner (TapeInvoice), at a lower score (37 vs 41), under a harder bar and a real competition list.** Disagrees with run 1: SealReceipt dies. Runners-up are new (ClaimCheck, DataVaultTimer), not TapeVault/RentChain by name, though they sit in the same “verifiable record” neighborhood. Confidence in the panel itself is low; confidence in the *re-judge + verified late-payment evidence* is medium.

AGREEMENT NOTES: Official 32-name list remains unread (signed API). TapeSend-on-X-Layer still unconfirmed. Liquid escrow token on X Layer still to be confirmed in build phase 1. DeWEB deletion semantics unverified — that is why DataVaultTimer is weak.
