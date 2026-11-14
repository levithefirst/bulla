
=== cohere/command-a-plus ===
We need to output a series of phases with prompts for Claude Code. Also separate list of tasks Claude cannot do. Must not invent new product, not pick competitor from Accelerate list. Provide phased copy-paste-ready Claude Code prompts for the winner TapeInvoice, plus separate list of tasks Claude Code cannot do.

We need to include acceptance checklist per phase. Also include unknowns to verify first and risks if a phase slips.

We need to produce output only, as per instruction: "OUTPUT only: PHASE n: <name> (goal, ~days) PROMPT: ... ACCEPTANCE: ... NON-CLAUDE TASKS: ... UNKNOWNS TO VERIFY FIRST: ... RISKS IF A PHASE SLIPS: ..."

We need to produce multiple phases (6–8 phases) from research spike through demo dry-run. Provide sequential.

We need to include citations for pain-point: Bonsai 2025, 100k+ freelancers, 29% of invoices paid at least one day late; support with Remote (85% late at least sometimes) and IPSE UK (32–35% had a delay in 12 months). Must cite those sources; do not fabricate new ones.

We need to include differentiation notes.

We need to include hard cuts: no cross-chain, no photo/AI oracles, etc.

We need to include that Phase 1 must open primary docs and mark UNKNOWNs.

We need to produce prompts that are copy-paste-ready for Claude Code. That means we need to write a prompt that includes role, context, exact files/folders, steps, numbered acceptance checklist.

We need to produce each phase with a name, goal, ~days.

We need to produce a separate list of tasks Claude Code cannot do (like human arbitration marketplace, legal e-sign, etc.)

We need to include unknowns to verify first (like token choice, X Layer token details, network addresses, etc.)

We need to include risks if a phase slips.

We need to ensure we don't invent new product or competitor.

We need to include the locked v1 features.

We need to ensure the output format matches the instruction: "OUTPUT only:" then list phases, then separate list of non-Claude tasks, unknowns, risks.

Probably we need to output something like:

PHASE 1: Research Spike (goal, ~3 days)
PROMPT:
<<<
... (the prompt) ...
>>>
ACCEPTANCE:
- [ ] ...

PHASE 2: Architecture Blueprint (goal, ~4 days)
PROMPT:
<<<
...
>>>
...

...

NON-CLAUDE TASKS:
- Human arbitration marketplace: Claude cannot design legal marketplace; requires human legal work.
- ...

UNKNOWNS TO VERIFY FIRST:
- X Layer token contract address and decimals.
- ...

RISKS IF A PHASE SLIPS:
- ...

We need to ensure each prompt is copy-paste-ready for Claude Code. That means we need to include role, context, exact files/folders, steps, acceptance checklist.

We need to be concise but thorough.

We need to include the citations in the context of the prompt.

We need to ensure we don't mention any invented token names or chain IDs.

We need to avoid invented npm packages.

We need to keep everything within the constraints.

We need to produce output only, no extra commentary.

We need to produce 6–8 phases. Let's aim for 7 phases.

Phases:

1. Research Spike (3 days): Gather requirements, confirm X Layer token details, verify Bonsai, Remote, IPSE stats, open primary docs, mark unknowns.

2. Contract Design (4 days): Draft X Layer escrow contract (TapeOut circuit), define states, functions: deposit, fund, submit, release, refund, cancel, fee skim.

3. Frontend Scaffold (3 days): Set up DeWEB site static HTML, HTTPS gateway mock, invoice view page, shareable receipt UI.

4. Integration Skeleton (4 days): Connect frontend to escrow contract via ethers.js (or similar)

=== cohere/command-a ===
### **UNKNOWNS TO VERIFY FIRST:**
- Which X Layer stablecoin is readily usable for deposits (e.g., USDT, USDC, or native stablecoin)?  
- Exact X Layer chain ID and RPC endpoints for contract deployment.  
- Final fee structure (default 50 bps configurable or fixed).  
- Specific TapeOut circuit container specs for escrow identity.  
- DeWEB site hosting requirements and compatibility with HTTPS gateway.  

---

### **RISKS IF A PHASE SLIPS:**
- **Phase 1 (Research Spike):** Delayed X Layer integration decisions → Phase 2 contract development blocked.  
- **Phase 2 (Core Contract Development):** Missed escrow logic or fee mechanism → Phase 3 UI integration fails.  
- **Phase 4 (UI Integration)::** Incomplete DeWEB compatibility → Demo dry-run (Phase 6) lacks no-wallet path functionality.  
- **Phase 5 (Testing & Security):** Unresolved vulnerabilities → Deadline missed for audit fixes.  

---

### **PHASE 1: Research Spike (Goal: Confirm X Layer stablecoin, chain ID, and TapeOut specs; ~3 days)**  
**PROMPT:**  
<<<  
**Role:** Technical Researcher  
**Context:** TapeInvoice requires X Layer integration for escrow and payments. Confirm the following:  
1. Which stablecoin (e.g., USDT, USDC) is readily usable on X Layer for deposits?  
2. What is the current X Layer chain ID and public RPC endpoint?  
3. What are the exact specs for the TapeOut circuit container acting as escrow identity?  
4. Document UNKNOWNs if answers are unclear.  

**Files/Folders:**  
- `docs/xlayer-integration.md`  
- `docs/tapeout-specs.md`  

**Steps:**  
1. Research X Layer stablecoin options and compatibility.  
2. Verify X Layer chain ID and RPC endpoints from official docs.  
3. Contact TapeOut team for circuit container specs.  
4. Update `docs/xlayer-integration.md` and `docs/tapeout-specs.md` with findings.  

**ACCEPTANCE:**  
- [ ] Stablecoin confirmed and documented.  
- [ ] X Layer chain ID and RPC endpoint verified.  
- [ ] TapeOut circuit container specs clarified or marked UNKNOWN.  
- [ ] All findings recorded in designated files.  
>>>  

---

### **PHASE 2: Core Contract Development (Goal: Draft escrow contract with fee mechanism; ~5 days)**  
**PROMPT:**  
<<<  
**Role:** Solidity Developer  
**Context:** Develop the X Layer companion contract for TapeInvoice. Requirements:  
1. Handle states: Draft → Funded → Submitted → Released/Refunded.  
2. Accept deposits in the confirmed stablecoin.  
3. Implement time-lock refund and mutual cancel.  
4. Add configurable fee skim (default 50 bps) on release.  
5. No cross-chain functionality.  

**Files/Folders:**  
- `contracts/TapeInvoiceEscrow.sol`  
- `docs/contract-design.md`  

**Steps:**  
1. Draft `TapeInvoiceEscrow.sol` with state machine logic.  
2. Integrate stablecoin deposit and withdrawal functions.  
3. Add fee mechanism and configuration.  
4. Document design decisions in `docs/contract-design.md`.  

**ACCEPTANCE:**  
- [ ] Contract compiles without errors.  
- [ ] All states (Draft, Funded, Submitted, Released/Refunded) implemented.  
- [ ] Fee

=== ovh/gpt-oss-120b ===
**PROJECT : TapeInvoice – Milestone‑Invoice + Escrow for freelancers & small buyers**  
**Deadline : 7 Dec 2026 23:59 UTC**  
**Current date : 14 Nov 2026 (Saturday)**  

---  

## PHASE 1 – Research & Requirements Spike *(Goal: Validate market pain‑points & enumerate hard‑limits – ≈ 2 days)*  

**PROMPT**  
<<<  
You are a senior product‑research analyst.  
Your task is to create a concise requirement brief for “TapeInvoice” based ONLY on the information below. Do **not** add any new statistics, competitors, or features.  

**Context & Sources**  
- Bonsai 2025 report: 100 k+ freelancers; **29 %** of invoices paid ≥ 1 day late.  
- Remote 2025 survey: **85 %** of remote workers experience late payment “at least sometimes.”  
- IPSE UK 2025 study: **32‑35 %** of freelancers reported a payment delay in the past 12 months.  

**Hard limits (must NOT be violated)**  
- No cross‑chain bridging, no photo/AI oracles, no human‑arbitration marketplace, no legal e‑sign, no token launch, no miner‑desk, no off‑chain source‑of‑truth backend, no un‑released npm packages, no guessed chain‑IDs or token symbols.  
- v1 must support: amount, parties, due/timeout, optional delivery‑hash, buyer deposits X‑Layer token (stable‑coin preferred if available), seller posts delivery hash/link, buyer release, time‑lock refund, mutual cancel, 0.5 % fee on release only.  

**Deliverables (files)**  
- `research/requirements.md` – bullet‑point list of functional & non‑functional requirements, plus a “Known Unknowns” table.  
- `research/pain‑points.md` – copy‑ready paragraph for submission, citing the three sources above (full citations, no invented data).  

**Steps**  
1. Extract the exact pain‑point wording from each source.  
2. Summarize the differentiation constraints (what TapeInvoice is *not*).  
3. List all required UI & contract fields.  
4. Produce the two markdown files in the `research/` folder.  

**Acceptance Checklist**  
- [ ] `requirements.md` contains **all** mandatory fields & constraints, no extra features.  
- [ ] `pain‑points.md` includes the three citations with proper formatting.  
- [ ] All “hard cuts” are clearly flagged as “must‑not‑do”.  
- [ ] Unknowns (stable‑coin on X‑Layer, container identity spec) are listed in a table.  
<<<  

**ACCEPTANCE**  
- [ ] All deliverables present in the repository.  
- [ ] No invented statistics or competitors appear.  

---  

## PHASE 2 – Architecture Blueprint & Documentation Setup *(Goal: Define system layers, data flow & repo layout – ≈ 3 days)*  

**PROMPT**  
<<<  
You are an enterprise blockchain architect.  
Using the `research/` artifacts from Phase 1, produce a high‑level architecture diagram (ASCII or PlantUML) and a repository scaffolding plan for TapeInvoice.  

**Folder structure (to be created)**  
```
/docs                # Architecture, design decisions, risk register
/contracts           # X‑Layer smart‑contract source (Solidity‑like)
/frontend            # DeWEB site (React/Next) + HTTPS gateway
/scripts             # Build & deployment scripts
/tests               # Unit‑/integration‑test suites
```

**Deliverables**  
- `docs/architecture.puml` – PlantUML diagram showing: User → HTTPS gateway → DeWEB front‑end → X‑Layer contract (Escrow) → TapeOut container (escrow identity).  
- `docs/README-ARCHITECTURE.md` – narrative description of each component, data‑flow, trust boundaries, and where “no‑wallet” status view lives.  
- `docs/UNKNOWNS.md` – table of items still missing (e.g., which stable‑coin contract address on X‑Layer, exact TapeOut container spec).  

**Steps**  
1. Map each functional requirement to a component (UI, contract, container).  
2. Indicate external dependencies (X‑Layer SDK docs, DeWEB hosting).  
3. Explicitly mark any “UNKNOWN” that must be verified before coding.  

**Acceptance Checklist**  
- [ ] Architecture diagram compiled and renders without errors.  
- [ ] README explains every arrow & component, referencing Phase 1 requirements.  
- [ ] UNKNOWN table lists at least three items with “Source / Action needed”.  
<<<  

**ACCEPTANCE**  
- [ ] Architecture files committed under `docs/`.  
- [ ] No reference to nonexistent SDKs or token names.  

---  

## PHASE 3 – X‑Layer Escrow Contract Skeleton *(Goal: Write, compile & unit‑test the minimal escrow contract – ≈ 4 days)*  

**PROMPT**  
<<<  
You are a senior Solidity‑style smart‑contract developer (X‑Layer language compatible).  
Your job is to implement the *v1* escrow contract described in Phase 1, **without** using any external libraries that are not part of the official X‑Layer SDK (you may import `@xlayer/core` only if it exists in the official docs).  

**File to create**  
- `contracts/TapeInvoiceEscrow.sol`

**Contract requirements**  
1. **State machine**: Draft → Funded → Submitted → Released / Refunded.  
2. **Variables**: amount, buyer, seller, dueTimestamp, timeout (seconds), optional deliveryHash, feeBps (default 50).  
3. **Functions** (external/public, with appropriate modifiers):  
   - `deposit()` – payable, only buyer, moves state to Funded, enforces stable‑coin (use generic IERC20 interface; token address is a constructor param).  
   - `submitDelivery(string calldata hashOrLink)` – only seller, moves to Submitted, stores hash.  
   - `release()` – only buyer, after delivery submitted, transfers (amount ‑ fee) to seller, fee to contract owner.  
   - `refund()` – callable by buyer after `dueTimestamp + timeout`.  
   - `cancel()` – mutual cancel before funding, returns any deposited tokens.  
   - `viewStatus()` – view‑only returns current state & data (no‑wallet UI will call this via RPC).  
4. **Events**: Deposit, DeliverySubmitted, Released, Refunded, Cancelled.  
5. **Safety notes** in comments: “Container control follows the circuit holder – never a wallet‑theft safe‑guard.”  

**Testing**  
- Create a test file `tests/TapeInvoiceEscrow.t.sol` using the official X‑Layer test framework.  
- Cover all state transitions, fee calculation, timeout‑refund, and cancel flow.  

**Steps**  
1. Write the contract per spec, compile with the X‑Layer compiler (assume `xlayerc`).  
2. Write the unit tests, run them, achieve 100 % pass.  
3. Record the compiled bytecode hash in `docs/CONTRACT-METADATA.md`.  

**Acceptance Checklist**  
- [ ] Contract compiles with no warnings.  
- [ ] All required functions exist with correct visibility & access control.  
- [ ] Test suite passes on first run (`xlayer-test run`).  
- [ ] No external NFT, oracle, or off‑chain references.  
- [ ] Fee is exactly 50 bps by default, overridable only by contract owner.  
<<<  

**ACCEPTANCE**  
- [ ] Commit contains `contracts/` and `tests/` with passing CI.  

---  

## PHASE 4 – Front‑End Wireframes & DeWEB Integration *(Goal: Build a no‑wallet status page + invoice creation UI – ≈ 4 days)*  

**PROMPT**  
<<<  
You are a front‑end engineer experienced with React, Next.js, and DeWEB deployment.  
Using the contract ABI from Phase 3, create a minimal UI that satisfies v1 requirements.  

**Folder & files**  
- `frontend/pages/index.tsx` – Home page with “Create Invoice” form.  
- `frontend/pages/invoice/[id].tsx` – Public receipt page (no‑wallet) showing status, parties, amount, delivery hash, and a QR‑code link to the DeWEB URL.  
- `frontend/components/InvoiceForm.tsx` – Form fields: amount, buyer address, seller address, due date, timeout (days), optional delivery‑hash, fee (display only).  
- `frontend/lib/xlayer.ts` – thin wrapper using the official `@xlayer/web3` provider (if exists) to call `deposit`, `submitDelivery`, `release`, `refund`, `cancel`, `viewStatus`.  
- `frontend/public/manifest.json` – DeWEB manifest (no custom back‑end).  

**Functional steps**  
1. On form submit, generate a new TapeOut container ID (placeholder string `{{GENERATED_ID}}`) – this will be replaced later by the actual TapeOut service (unknown now).  
2. Call `deposit()` via MetaMask‑style injection **or** a “no‑wallet” backend‑less flow that uses the buyer’s X‑Layer address entered manually (the contract’s `deposit` function is payable, so the UI can just show the address for manual transfer).  
3. After deposit, display the invoice URL (`https://<your‑deweb‑site>.deweb.site/invoice/<id>`) that can be shared.  
4. Seller can click “Submit Delivery” – enter hash/link – triggers `submitDelivery`.  
5. Buyer can click “Release Funds” – triggers `release`.  
6. Include “Refund” button that appears only after timeout.  

**Styling** – Use plain CSS modules, no external UI libraries.  

**Acceptance Checklist**  
- [ ] All pages compile and run locally (`npm run dev`).  
- [ ] UI shows every required field; fee displayed as “0.5 %”.  
- [ ] Public receipt page is fully read‑only, loads contract state via `viewStatus`.  
- [ ] No wallet‑only flow is enforced; user can copy‑paste address & amount for manual transfer.  
- [ ] DeWEB manifest is present and references only built‑in assets.  
- [ ] No references to mobile SDKs, AI, or off‑chain databases.  
<<<  

**ACCEPTANCE**  
- [ ] `frontend/` builds without external dependencies beyond React/Next.  
- [ ] Demo video (optional) of creating an invoice and viewing the receipt.  

---  

## PHASE 5 – End‑to‑End Integration & Testing on X‑Layer Testnet *(Goal: Deploy contract, link UI, run full workflow – ≈ 5 days)*  

**PROMPT**  
<<<  
You are a DevOps engineer responsible for continuous integration & deployment on X‑Layer testnet.  

**Tasks**  
1. **Deploy** `TapeInvoiceEscrow.sol` to the X‑Layer testnet using the official CLI (`xlayer deploy`). Capture the contract address and store it in `docs/DEPLOYMENT.md`.  
2. **Configure** the front‑end’s `xlayer.ts` module to point to the deployed address and the testnet RPC endpoint (public node URL from X‑Layer docs).  
3. **Write** an end‑to‑end script `scripts/e2e-demo.sh` that:  
   - Creates an invoice via UI (or direct contract call).  
   - Simulates buyer sending the stable‑coin token (use the X‑Layer test token “USDC‑t”).  
   - Seller submits a delivery hash.  
   - Buyer releases funds.  
   - Verifies that the fee (0.5 %) goes to the contract owner address.  
4. **Run** the script, capture console logs, and assert final balances.  
5. **Document** any failures and fix them.  

**Acceptance Checklist**  
- [ ] Contract address recorded and matches the deployed bytecode hash.  
- [ ] Front‑end can read/write to the contract without errors.  
- [ ] `e2e-demo.sh` completes end‑to‑end flow successfully (exit code 0).  
- [ ] All transactions are confirmed on the testnet explorer (links in `DEPLOYMENT.md`).  
- [ ] No reliance on any off‑chain database – state is fully on‑chain.  
<<<  

**ACCEPTANCE**  
- [ ] Demo script produces a clean success report.  

---  

## PHASE 6 – Security Review & Auditing *(Goal: Verify escrow safety, fee correctness, and no‑wallet guarantees – ≈ 3 days)*  

**PROMPT**  
<<<  
You are a senior smart‑contract auditor.  

**Scope** – Review `contracts/TapeInvoiceEscrow.sol` for:  
- Re‑entrancy vulnerabilities.  
- Correct handling of ERC20 `transferFrom`/`transfer`.  
- Proper access control on each state‑changing function.  
- Fee calculation edge‑cases (e.g., zero amount, fee overflow).  
- “Container control follows the circuit holder” disclaimer enforcement (no hidden back‑door escape).  

**Deliverables**  
- `docs/AUDIT-REPORT.md` – executive summary, list of findings (if any), and recommended mitigations.  
- Updated contract source if changes are required (must keep the same external interface).  

**Steps**  
1. Run the official static analyzer (`xlayer-analyzer`) on the contract.  
2. Manually review the state‑transition logic.  
3. Provide a risk rating (Low/Medium/High) for each identified issue.  

**Acceptance Checklist**  
- [ ] No critical or high‑severity issues remain.  
- [ ] All findings are documented with line numbers.  
- [ ] If any changes are made, tests in Phase 3 are re‑run and pass.  
<<<  

**ACCEPTANCE**  
- [ ] Audit report signed off by a named reviewer.  

---  

## PHASE 7 – Demo Preparation & Dry‑Run for Submission *(Goal: Produce a polished, copy‑ready demo package – ≈ 2 days)*  

**PROMPT**  
<<<  
You are the presentation lead.  

**Create** a single‑page PDF demo deck (`demo/TapeInvoice_Demo.pdf`) containing:  
1. Title slide with product name, tagline, and deadline.  
2. Pain‑point slide (copy from `research/pain‑points.md` with citations).  
3. Architecture diagram (from Phase 2).  
4. Screenshot sequence:  
   - Invoice creation form (loading state).  
   - Public receipt page showing “Pending”.  
   - Delivery submitted view.  
   - Final released view with fee breakdown.  
5. End‑to‑end flow description (text + short bullet list).  
6. Risks & mitigation summary (use the “Risks if a phase slips” table below).  

**Additional deliverables**  
- `demo/demo‑video.mp4` – ≤ 90‑second screen capture walking through the full happy path (can be generated with a headless browser script).  
- `README.md` – clear instructions for the judges to run the demo locally (install, start dev server, run `scripts/e2e-demo.sh`).  

**Acceptance Checklist**  
- [ ] PDF includes all required sections and citations.  
- [ ] Video plays without audio glitches and completes the flow.  
- [ ] README reproduces the demo on a fresh machine (fresh `npm install`).  
- [ ] All assets are under `demo/`.  
<<<  

**ACCEPTANCE**  
- [ ] Deck and video are ready for submission by 06 Dec 2026 23:59 UTC.  

---  

# NON‑CLAUDE TASKS  

| Task | Why Claude cannot do it | When needed | “Done” looks like |
|------|--------------------------|------------|-------------------|
| **Legal compliance review** (e.g., AML/KYC for escrow) | Requires jurisdiction‑specific legal counsel, not code‑generable. | Before public launch (post‑demo). | Signed legal opinion confirming the contract does not constitute a regulated money‑service business. |
| **Stable‑coin selection & address acquisition on X‑Layer** | Must verify which stable‑coin is deployed on X‑Layer testnet/mainnet; requires on‑chain lookup or community inquiry. | Phase 1 (UNKNOWNs) → before contract deployment.

=== ovh/qwen3.5-397b ===
PHASE 1: Research Spike & Scaffold (Goal: Verify stack, init repo, mark UNKNOWNs, ~3 days)
PROMPT:
<<<
ROLE: Senior Blockchain Engineer & Architect
CONTEXT: TapeInvoice v1. Escrow on X Layer. Identity via TapeOut circuit container. UI via DeWEB + HTTPS. Deadline 7 Dec 2026.
TASK: Initialize repository and verify technical primitives. DO NOT GUESS chain IDs, SDK names, or token addresses.
FILES/FOLDERS: ./docs, ./contracts, ./src, ./README.md
STEPS:
1. Search official X Layer documentation for Chain ID, RPC endpoints, and supported stablecoins (USDT/USDC).
2. Search for official TapeOut SDK npm package name. If not found, mark as UNKNOWN in README.
3. Search for DeWEB hosting requirements and HTTPS gateway configuration.
4. Scaffold hardhat/foundry project in ./contracts.
5. Scaffold Next.js/React project in ./src.
6. Update README.md with a "UNKNOWNs" section listing any unverified tech (Chain ID, SDK, Token Address).
7. Create a .env.example file with placeholders for verified endpoints.
ACCEPTANCE:
- [ ] README.md exists with "UNKNOWNs" section clearly listing unverified primitives.
- [ ] ./contracts and ./src folders initialized with basic boilerplate.
- [ ] No hardcoded chain IDs or SDK imports in code yet.
- [ ] List of official docs links saved in ./docs/sources.md.
>>>
ACCEPTANCE:
- [ ] README.md exists with "UNKNOWNs" section clearly listing unverified primitives.
- [ ] ./contracts and ./src folders initialized with basic boilerplate.
- [ ] No hardcoded chain IDs or SDK imports in code yet.
- [ ] List of official docs links

=== ovh/mistral-small-3.2 ===
[error: timeout]

=== ovh/qwen2.5-vl-72b ===
PHASE 1: Research Spike (goal: gather necessary information, ~3 days)
PROMPT:
<<<
ROLE: Researcher
CONTEXT: You are researching the TapeInvoice project, which aims to create a live milestone invoice and escrow system for freelancers and small buyers using the X Layer contract. The project has a no-wallet path for viewing invoice status and a shareable receipt.
FILES/FOLDERS: - Research notes - Relevant articles and studies - Bonsai 2025 report - Remote and IPSE UK reports
STEPS: 1. Review the Bonsai 2025 report, focusing on the pain points faced by freelancers regarding late payments. 2. Analyze the Remote and IPSE UK reports to understand the extent of late payments in their respective contexts. 3. Summarize the findings and identify key statistics to be used in the submission copy. 4. Research the differentiation between TapeInvoice and other similar projects such as CoTape, TapeFlow, and others mentioned. 5. Document any unknowns or risks that need further investigation.
>>>
ACCEPTANCE:
- [ ] Research notes completed with relevant information gathered. - [ ] Key statistics identified for submission copy. - [ ] Differentiation between TapeInvoice and similar projects clearly documented. - [ ] Unknowns and risks identified and documented.
NON-CLAUDE TASKS:
- Legal review: why Claude cannot provide legal advice; when needed during the project; what done looks like: a legal expert reviews the project documentation and provides guidance on any potential legal issues.
UNKNOWNS TO VERIFY FIRST:
- Compatibility of the X Layer contract with the chosen stablecoin. - Availability of a suitable stablecoin for use in the project.
RISKS IF A PHASE SLIPS:
- Delay in gathering necessary information may impact the overall project timeline. - Incomplete understanding of the pain points and differentiation may result in a less effective solution.
PHASE 2: Project Planning (goal: create a detailed project plan, ~5 days)
PROMPT:
<<<
ROLE: Project Manager
CONTEXT: Based on the research conducted in Phase 1, you are now creating a detailed project plan for the development of TapeInvoice. The plan should include timelines, milestones, and resource allocation.
FILES/FOLDERS: - Project plan document - Milestone tracker - Resource allocation sheet
STEPS: 1. Review the research findings from Phase 1. 2. Create a detailed project plan, including timelines, milestones, and resource allocation. 3. Identify potential risks and develop mitigation strategies. 4. Break down the project into smaller tasks and assign them to team members. 5. Set up a milestone tracker to monitor progress throughout the project.
>>>
ACCEPTANCE:
- [ ] Detailed project plan created with timelines, milestones, and resource allocation. - [ ] Potential risks identified and mitigation strategies developed. - [ ] Tasks broken down and assigned to team members. - [ ] Milestone tracker set up for monitoring progress.
NON-CLAUDE TASKS:
- Team coordination: why Claude cannot manage human resources; when needed throughout the project; what done looks like: regular team meetings and check-ins ensure everyone is on track and any issues are addressed promptly.
UNKNOWNS TO VERIFY FIRST:
- Availability of skilled developers familiar with the X Layer contract and DeWEB sites. - Potential challenges in integrating the no-wallet path for viewing invoice status.
RISKS IF A PHASE SLIPS:
- Delays in project planning may impact the overall project timeline. - Inadequate resource allocation may result in missed deadlines and increased costs.

=== kilo/glyph-cluster ===
[error: empty or reasoning-only response]

=== gemini-3.5-flash ===
UNKNOWNS TO VERIFY FIRST:
- **X Layer Network Specs**: Exact Chain ID (testnet vs mainnet), RPC endpoints, and supported standard ERC-20 token addresses (e.g., USDT/USDC on X Layer).
- **TapeOut Circuit Interface**: Actual contract interfaces or event specs for TapeOut container ownership tracking on X Layer.
- **DeWEB Hosting Target**: DeWEB deployment mechanism (IPFS/Arweave CID formatting or specific static gateway constraints) for wallet-less public views.

---

PHASE 1: Environment Setup & Chain Specs Audit (~2 Days)
PROMPT:
<<<
You are a senior Web3 systems architect. You are setting up the foundation for TapeInvoice, a live milestone invoice and escrow application running on X Layer.

CONTEXT:
TapeInvoice allows freelancers to issue invoices and lock funds in escrow contracts on X Layer until work delivery is confirmed or time-lock triggers a refund. We do not invent SDK names, token symbols, or chain IDs. We must verify primary resources first.

FILES TO READ/MODIFY:
- README.md (Create)
- DOCS_AUDIT.md (Create)
- config/contracts.ts (Create)
- .env.example (Create)

STEPS:
1. Create a workspace structure: `/contracts`, `/frontend`, `/scripts`, `/config`.
2. Document all verified X Layer parameters in `DOCS_AUDIT.md`. Mark any unverified parameters as `[UNKNOWN: requires manual verification]`. Do NOT invent chain IDs (e.g., do not guess 195) or tokens (e.g., do not invent XUSD).
3. Set up a standard Hardhat TypeScript workspace inside `/contracts` using standard dependencies (`@nomicfoundation/hardhat-toolbox`, `ethers`, `dotenv`, `@openzeppelin/contracts`).
4. Create `.env.example` with placeholders for `XLAYER_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, and `PAYMENT_TOKEN_ADDRESS`.
5. Create `config/contracts.ts` defining network configurations dynamically read from environment variables.

ACCEPTANCE CHECKLIST:
1. [ ] Hardhat workspace compiles cleanly with `npx hardhat compile`.
2. [ ] `DOCS_AUDIT.md` explicitly lists RPC config requirements and explicitly flags UNKNOWNs for manual verification.
3. [ ] No invented npm packages (e.g. `@xlayer/tapout-sdk`) are present in `package.json`.
4. [ ] `.env.example` contains all required environment variable definitions.
>>>
ACCEPTANCE:
- [ ] Hardhat project initializes and compiles without errors.
- [ ] `DOCS_AUDIT.md` is populated with verified specs and zero fabricated parameters.
- [ ] Environment variable template is complete and committed.

---

PHASE 2: Escrow Smart Contract Development (~4 Days)
PROMPT:
<<<
You are a smart contract engineer. Build the core Solidity escrow contract for TapeInvoice on X Layer.

CONTEXT:
The contract `TapeInvoiceEscrow.sol` holds funds for single-shot or milestone invoices.
States: `Draft` (0), `Funded` (1), `Submitted` (2), `Released` (3), `Refunded` (4).
Rules:
- Buyer deposits liquid X Layer ERC-20 tokens (passed as parameter during contract creation or deposit).
- Invoice parameters: `buyer`, `seller`, `amount`, `timeoutTimestamp`, `deliveryHash` (bytes32 or string URL), `feeBps` (default 50 bps = 0.5%).
- Seller posts delivery hash/link.
- Buyer releases funds. Fee skim (50 bps) is sent to fee recipient on release only.
- Time-lock refund allowed for buyer if state is `Funded` and block.timestamp > `timeoutTimestamp`.
- Mutual cancel allowed if both buyer and seller execute cancel before delivery is released.

FILES TO READ/MODIFY:
- contracts/TapeInvoiceEscrow.sol (Create)
- contracts/TapeInvoiceFactory.sol (Create)
- test/TapeInvoiceEscrow.test.ts (Create)
- scripts/deploy.ts (Create)

STEPS:
1. Implement `TapeInvoiceEscrow.sol` using standard `@openzeppelin/contracts/token/ERC20/IERC20.sol` and standard `ReentrancyGuard.sol`.
2. Implement explicit events: `InvoiceFunded`, `DeliverySubmitted`, `InvoiceReleased`, `InvoiceRefunded`, `InvoiceCancelled`.
3. Implement `TapeInvoiceFactory.sol` to deploy individual escrow contracts or track deployed invoice instances by ID.
4. Write comprehensive Hardhat unit tests covering happy path (Fund -> Submit -> Release), time-lock refund, mutual cancel, and fee calculation.

ACCEPTANCE CHECKLIST:
1. [ ] `npx hardhat test` passes 100% of unit tests.
2. [ ] Fee calculation is verified at exactly 50 bps (0.5%) on release step only.
3. [ ] Non-funded or expired states strictly enforce access control and state transitions.
4. [ ] Deployment script `scripts/deploy.ts` successfully targets X Layer RPC via `.env` configuration.
>>>
ACCEPTANCE:
- [ ] `TapeInvoiceEscrow.sol` and factory contracts pass all unit tests.
- [ ] Zero arbitrary protocol tokens or unapproved fee logic present.
- [ ] Contract handles standard ERC-20 transfers safely via OpenZeppelin modules.

---

PHASE 3: Core UI & Web3 Wallet Integration (~4 Days)
PROMPT:
<<<
You are a Web3 frontend developer. Create the Web UI for TapeInvoice using Next.js (App Router), Tailwind CSS, and Viem/Wagmi.

CONTEXT:
Users must be able to create an invoice, fund it as a buyer, submit a delivery link/hash as a seller, or trigger a release/refund.
Disclaimer Requirement: The Fund button MUST display the disclosure text: "Disclaimer: Escrow container control follows the circuit holder address."

FILES TO READ/MODIFY:
- frontend/app/page.tsx (Create)
- frontend/app/create/page.tsx (Create)
- frontend/app/invoice/[id]/page.tsx (Create)
- frontend/components/InvoiceForm.tsx (Create)
- frontend/components/InvoiceActions.tsx (Create)
- frontend/components/DisclaimerBanner.tsx (Create)
- frontend/lib/wagmi.ts (Create)

STEPS:
1. Initialize a Next.js TypeScript app in `/frontend` with Tailwind CSS and Wagmi/Viem.
2. Configure network providers for X Layer in `frontend/lib/wagmi.ts` utilizing environment variables (`NEXT_PUBLIC_XLAYER_RPC_URL`, `NEXT_PUBLIC_FACTORY_ADDRESS`).
3. Build the Invoice Creation form (`/create`) taking buyer address, seller address, token address, amount, due duration, and milestone description.
4. Build the Invoice Detail/Action page (`/invoice/[id]`) showing live contract state (`Draft`, `Funded`, `Submitted`, `Released`, `Refunded`).
5. Wire contract write actions (`fund()`, `submitDelivery()`, `release()`, `claimRefund()`).
6. Put the explicit disclosure notice directly adjacent to the Fund button.

ACCEPTANCE CHECKLIST:
1. [ ] Frontend builds cleanly with `npm run build` without TypeScript or SSR errors.
2. [ ] Wallet connects to X Layer via Wagmi/Viem.
3. [ ] Form validation prevents submitting invalid addresses or zero amounts.
4. [ ] The text "Disclaimer: Escrow container control follows the circuit holder address." is clearly visible on the fund action UI.
>>>
ACCEPTANCE:
- [ ] Invoice creation and state viewing operational on frontend.
- [ ] Wallet transactions execute state changes on contract.
- [ ] Required container control disclaimer visible on funding workflow.

---

PHASE 4: Wallet-Less Public Receipt Page (~3 Days)
PROMPT:
<<<
You are a frontend UI/UX engineer. Build the no-wallet public receipt viewer for TapeInvoice.

CONTEXT:
Freelancers and small buyers need to share invoice receipts with external stakeholders who do not have Web3 wallets connected. Anyone with a receipt link should view the read-only live status of the invoice directly from the X Layer RPC client.

FILES TO READ/MODIFY:
- frontend/app/receipt/[id]/page.tsx (Create)
- frontend/components/ReceiptView.tsx (Create)
- frontend/lib/rpcClient.ts (Create)

STEPS:
1. Create a pure read-only Viem public client in `frontend/lib/rpcClient.ts` querying X Layer RPC without requiring `window.ethereum` or wallet connection.
2. Build `/receipt/[id]` route that fetches escrow parameters directly from the chain: state, buyer/seller addresses, deposited amount, due date, delivery hash, release transaction hash (if released).
3. Display a step-by-step visual milestone timeline (`Created` -> `Funded` -> `Submitted` -> `Settled`).
4. Include a "Share Receipt" copy-to-clipboard button generating the public `/receipt/[id]` URL.

ACCEPTANCE CHECKLIST:
1. [ ] Page loads and renders invoice data accurately with wallet disconnected or in an incognito window.
2. [ ] Visual timeline accurately reflects current contract enum state.
3. [ ] Copy link function places valid absolute receipt URL on user's clipboard.
4. [ ] No write actions or transaction triggers are accessible from the receipt view.
>>>
ACCEPTANCE:
- [ ] Read-only view functions independently of wallet injection.
- [ ] Live state fetched directly from X Layer public RPC.
- [ ] Clear step-by-step visual progress display.

---

PHASE 5: DeWEB Packaging & Static Gateway Build (~3 Days)
PROMPT:
<<<
You are a DevOps and Web3 deployment specialist. Configure TapeInvoice for static hosting compatibility with DeWEB gateways and standard HTTPS hosting.

CONTEXT:
TapeInvoice must operate without a centralized backend server. All state is derived from X Layer RPC. The frontend must compile to static assets exportable to decentralized storage gateways (e.g., DeWEB/IPFS).

FILES TO READ/MODIFY:
- frontend/next.config.js (Modify)
- scripts/build-deweb.sh (Create)
- frontend/lib/rpcClient.ts (Modify)

STEPS:
1. Configure `next.config.js` for static output export (`output: 'export'`, `images: { unoptimized: true }`).
2. Ensure routing for `/invoice/[id]` and `/receipt/[id]` uses client-side parameter parsing or hash-based routes if required by static gateways.
3. Write `scripts/build-deweb.sh` to trigger build, verify output directory (`frontend/out`), and check that no API routes or server-side functions exist.
4. Verify fallback public RPC endpoints so the client app operates resiliently even if primary RPC rate-limits.

ACCEPTANCE CHECKLIST:
1. [ ] `npm run build` generates a standalone static `/out` folder.
2. [ ] Zero server-side API routes (`/pages/api` or `app/api`) exist in the codebase.
3. [ ] Application functions entirely client-side when served via local HTTP server (`npx serve out`).
>>>
ACCEPTANCE:
- [ ] Static output verified and bundle verified free of server-side dependencies.
- [ ] Tested successfully via standalone local web server.

---

PHASE 6: End-to-End Integration & Edge Case Verification (~3 Days)
PROMPT:
<<<
You are a QA automation and smart contract test engineer. Execute full end-to-

=== nvidia/minimax-m3.1-flash ===
[error: empty or reasoning-only response]

=== nvidia/nemotron-3-ultra ===
[error: empty or reasoning-only response]

=== cohere/command-a-reasoning ===
**PHASE 1: Research & Requirements (Goal: Baseline Understanding, ~3 days)**  
PROMPT:  
<<<  
**Role:** Blockchain Solution Architect  
**Context:** Build TapeInvoice, an X Layer-based escrow system for freelancer invoices. Pain points: 29% late payments (Bonsai 2025), 85% Remote users experience delays. Differentiation: No wallets for buyers/viewers, single-invoice template, 50bps fee on release.  
**Files/Folders:**  
- `docs/x-layer-specs.pdf` (X Layer contract templates)  
- `docs/invoice-template.json` (v1 fields: amount, parties, due date, delivery hash)  
- `unknowns.md` (track unresolved questions)  
**Steps:**  
1. Analyze X Layer state machine requirements (Draft → Funded → Submitted → Released/Refunded).  
2. Map UI flows: "Fund" (buyer deposit), "Submit" (seller delivery), "Release/Refund".  
3. Identify dependencies: stablecoin compatibility, DeWEB UI constraints, timeout logic.  
4. Document assumptions in `unknowns.md` (e.g., "Is X Layer stablecoin XUSD available?").  
>>>  
ACCEPTANCE:  
- [ ] `requirements.md` with state diagrams and UI flowcharts  
- [ ] `unknowns.md` listing 5+ critical verification items  
- [ ] Initial folder structure: `contracts/`, `frontend/`, `backend/`  

**PHASE 2: Smart Contract Development (Goal: Escrow Core, ~5 days)**  
PROMPT:  
<<<  
**Role:** Senior Solidity Developer  
**Context:** Implement X Layer contract per locked v1 specs. No cross-chain, oracles, or tokens beyond stablecoin.  
**Files/Folders:**  
- `contracts/TapeInvoiceEscrow.sol`  
- `docs/state-transitions.png` (from Phase 1)  
**Steps:**  
1. Code state machine with modifiers for state checks.  
2. Implement:  
   - `fund()` (buyer deposits stablecoin)  
   - `submitDelivery()` (seller posts hash)  
   - `release()/refund()` (buyer/timeout triggers)  
   - `mutualCancel()`  
3. Add fee logic (50bps on release to `feeRecipient`).  
4. Include `containerCircuitHolder` as escrow identity.  
>>>  
ACCEPTANCE:  
- [ ] Compiled contract passes `npx hardhat test`  
- [ ] State transition matrix in `contracts/README.md`  
- [ ] Security notes: "No wallet recovery – circuit holder controls funds"  

**PHASE 3: Frontend & Backend Integration (Goal: Functional UI, ~4 days)**  
PROMPT:  
<<<  
**Role:** Full-Stack DeWEB Developer  
**Context:** Build no-wallet UI for invoice tracking. HTTPS gateway for non-crypto users.  
**Files/Folders:**  
- `frontend/src/components/InvoiceStatus.jsx`  
- `backend/routes/invoice.js`  
**Steps:**  
1. Create DeWEB pages:  
   - `/invoice/:id` (public status: Draft/Funded/Submitted)  
   - `/fund` (buyer deposit button with stablecoin warning)  
2. Backend API:  
   - `GET /api/invoice/:id` (returns state/hashes)  
   - `POST /api/submit` (seller delivery hash)  
3. Embed shareable receipt link (no auth required).  
>>>  
ACCEPTANCE:  
- [ ] UI renders all states with timeout countdown  
- [ ] Backend syncs with test contract via RPC  
- [ ] No wallet flows pass manual QA  

**PHASE 4: Testing & Edge Cases (Goal: Battle-Ready, ~5 days)**  
PROMPT:  
<<<  
**Role:** Blockchain QA Engineer  
**Context:** Test state transitions, timeouts, and fee logic.  
**Files/Folders:**  
- `test/escrow-scenarios.ts`  
- `docs/test-matrix.csv`  
**Steps:**  
1. Simulate:  
   - Buyer funds → seller submits → buyer releases (fee deducted)  
   - Timeout → auto-refund  
   - Mutual cancel pre-fund  
2. Validate delivery hash verification.  
3. Stress-test: 100+ concurrent invoices.  
>>>  
ACCEPTANCE:  
- [ ] 95%+ test coverage (npx hardhat coverage)  
- [ ] `test-matrix.csv` signed off by team lead  
- [ ] Bug tracker empty (critical/high issues)  

**PHASE 5: Security Audit Prep (Goal: Audit-Ready Code, ~3 days)**  
PROMPT:  
<<<  
**Role:** Smart Contract Auditor  
**Context:** Harden code for third-party audit. Focus on reentrancy, state consistency.  
**Files/Folders:**  
- `audit-prep/security-checklist.md`  
- `contracts/TapeInvoiceEscrow.sol` (annotated)  
**Steps:**  
1. Add reentrancy guards to `release()/refund()`.  
2. Validate all state transitions prevent invalid jumps.  
3. Document fee logic: "50bps skim on release only".  
>>>  
ACCEPTANCE:  
- [ ] `security-checklist.md` completed  
- [ ] Code comments cover all critical functions  
- [ ] Reentrancy tests added to `test/`  

**PHASE 6: Demo Dry-Run (Goal: Rehearsed Showcase, ~2 days)**  
PROMPT:  
<<<  
**Role:** Technical Demo Lead  
**Context:** Simulate end-to-end flow for stakeholders.  
**Files/Folders:**  
- `demo/script.md` (step-by-step narrative)  
- `demo/env-setup.sh`  
**Steps:**  
1. Deploy testnet instance with 3 sample invoices.  
2. Record UI flow: Fund → Submit → Release.  
3. Highlight disclosure: "Container control follows circuit holder".  
>>>  
ACCEPTANCE:  
- [ ] Dry-run video + script approved by product lead  
- [ ] Fallback plan for demo failures documented  

**PHASE 7: Documentation & Handoff (Goal: Ship-Ready, ~1 day)**  
PROMPT:  
<<<  
**Role:** Technical Writer  
**Context:** Finalize user/dev docs for launch.  
**Files/Folders:**  
- `docs/user-guide.md`  
- `docs/api-reference.md`  
**Steps:**  
1. Write buyer/seller workflows with screenshots.  
2. Document API endpoints and contract ABIs.  
3. Add disclaimers: "No wallet recovery" on all fund pages.  
>>>  
ACCEPTANCE:  
- [ ] Docs versioned and linked in UI footer  
- [ ] Team lead sign-off  

---

**NON-CLAUDE TASKS:**  
- **Task:** Deploy contracts to X Layer testnet/mainnet.  
  *Why Claude cannot:* Requires live blockchain transactions and private keys.  
  *When:* After Phase 4 testing.  
  *Done looks like:* Verified contract addresses on X Layer explorer.  
- **Task:** Integrate DeWEB UI with specific hosting infrastructure.  
  *Why Claude cannot:* Needs server/cloud configuration.  
  *When:* Post-Phase 3.  
  *Done looks like:* Live HTTPS endpoint with SSL cert.  
- **Task:** Legal review of fee structure and disclosures.  
  *Why Claude cannot:* Requires licensed legal expertise.  
  *When:* Pre-launch.  
  *Done looks like:* Signed compliance memo.  
- **Task:** Third-party security audit.  
  *Why Claude cannot:* Needs external auditor credentials.  
  *When:* After Phase 5.  
  *Done looks like:* Audit report with no critical findings.  

**UNKNOWNS TO VERIFY FIRST:**  
- X Layer’s current stablecoin options (default to wrapped ETH if none).  
- DeWEB framework’s compatibility with X Layer RPC nodes.  
- Timeout duration defaults (e.g., 7 days post-due date).  
- Fee recipient address (DAO multisig or team wallet?).  

**RISKS IF A PHASE SLIPS:**  
- **Phase 1:** Incomplete requirements → rework in later phases.  
- **Phase 2:** Contract delays → testing/audit compression.  
- **Phase 4:** Missed edge cases → post-launch critical bugs.  
- **Phase 5:** Audit delays → missed deadline; security debt.  
- **Phase 6:** Demo failures → stakeholder confidence loss.

=== cohere/command-r-plus ===
## PHASE 1: Product Research and Documentation (2 days)

PROMPT:
<<<
As a technical writer, research and document the TapeInvoice product, a live milestone invoice and escrow solution for freelancers and small buyers. The product is built on the X Layer blockchain and uses a TapeOut circuit container as the escrow identity.

**Goal:** Create comprehensive documentation for TapeInvoice, ensuring it is accessible and informative for potential users and developers.

**Files/Folders:**
- `documentation/product_overview.md`: High-level product overview, including its purpose, target audience, and key features.
- `documentation/technical_spec.md`: Detailed technical specification, covering the following:
  - Escrow process: Explain the TapeOut circuit container's role in holding funds and state, with transitions from Draft to Funded, Submitted, Released, or Refunded.
  - User interface: Describe the DeWEB site and HTTPS gateway, emphasizing the no-wallet path for viewing invoice status and sharing receipts.
  - Payment process: Detail the steps for buyers to deposit funds, sellers to post delivery, and the subsequent release or refund process.
  - Fees: Clarify the small configurable fee skim on release, with a default of 50 bps, and emphasize it is not an official protocol fee.
- `documentation/faq.md`: Anticipate and address common questions about TapeInvoice, including security, refund policies, and integration with existing systems.

**Steps:**
1. Study the provided product information and understand the key features and pain points TapeInvoice aims to address.
2. Research and summarize the pain points in the freelance industry regarding late invoice payments, citing sources: Bonsai 2025 (100k+ freelancers, 29% late payments), Remote (85% late payments), and IPSE UK (32–35% delays).
3. Outline the product's differentiation from CoTape, TapeFlow, token launches, and miner desks. Emphasize v1's focus on a single invoice template, milestone-based payments, and public receipts.
4. Detail the locked v1 features: amount, parties, due/timeout, optional delivery-hash, liquid X Layer token deposit, delivery hash posting, buyer release, time-lock refund, mutual cancel, and fee skim.
5. Clearly state the hard cuts: cross-chain functionality, photo/AI oracles, human arbitration, legal e-sign, product tokens, AI drafting, mobile apps, required off-chain backend, unconfirmed TapeSend, and invented package/chain IDs/CLIs/token names.
6. Provide a high-level architecture diagram illustrating the TapeInvoice system and its components.
7. Include a glossary of terms to explain any blockchain-specific jargon or acronyms.

**Acceptance Checklist:**
- [ ] `product_overview.md` provides a clear, concise summary of TapeInvoice's purpose, target market, and key benefits.
- [ ] `technical_spec.md` thoroughly describes the escrow process, user interface, payment flow, and fee structure, leaving no critical detail unexplained.
- [ ] Common questions and potential concerns are addressed in the FAQ, ensuring a comprehensive understanding of the product.
- [ ] The documentation is well-structured, easy to navigate, and free of typos or grammatical errors.
>>>

## PHASE 2: User Experience Design (3 days)

PROMPT:
<<<
In the role of a UX designer, create a seamless user experience for TapeInvoice, ensuring a simple and intuitive process for creating, tracking, and managing invoices.

**Goal:** Design the user interface and interaction flow for TapeInvoice, focusing on usability and clarity.

**Files/Folders:**
- `design/wireframes/invoice_creation

=== ovh/llama-3.3-70b ===
PHASE 1: Research and Documentation (setup and familiarization, ~3 days)
PROMPT:
<<<
Role: Technical Researcher
Context: Review the existing documentation and codebase of TapeInvoice, focusing on the escrow functionality and X Layer contract.
Exact files/folders: Review the README, LICENSE, and src folders.
Steps:
1. Open the primary documentation files (README, LICENSE) and review the content.
2. Identify and mark UNKNOWNs in the documentation, such as unclear or missing information.
3. Verify the X Layer token used for deposits and check if a stablecoin is readily usable.
4. Research the current implementation of the escrow functionality and container control.
5. Document the findings and UNKNOWNs in a separate file (e.g., research_notes.md).
>>>
ACCEPTANCE:
- [ ] The primary documentation files are opened and reviewed.
- [ ] UNKNOWNs in the documentation are identified and marked.
- [ ] The X Layer token used for deposits is verified, and the usability of a stablecoin is checked.
- [ ] The current implementation of the escrow functionality and container control is researched and documented.

PHASE 2: Escrow Functionality Review (escrow deep dive, ~4 days)
PROMPT:
<<<
Role: Technical Auditor
Context: Delve deeper into the escrow functionality, focusing on the TapeOut circuit container and the companion X Layer contract.
Exact files/folders: Review the src/escrow and src/contract folders.
Steps:
1. Review the code implementation of the TapeOut circuit container and its interaction with the X Layer contract.
2. Verify the container control logic and ensure it follows the circuit holder.
3. Research and document the time-lock refund mechanism and mutual cancel functionality.
4. Identify potential security risks and document recommendations for improvement.
5. Update the research_notes.md file with the new findings.
>>>
ACCEPTANCE:
- [ ] The escrow functionality is reviewed, and the TapeOut circuit container implementation is understood.
- [ ] The container control logic is verified, and potential security risks are identified.
- [ ] The time-lock refund mechanism and mutual cancel functionality are researched and documented.
- [ ] Recommendations for improvement are documented.

PHASE 3: UI and UX Review (DeWEB and HTTPS gateway review, ~3 days)
PROMPT:
<<<
Role: UX Auditor
Context: Review the user interface and user experience of the DeWEB site and normal HTTPS gateway.
Exact files/folders: Review the src/ui and src/gateway folders.
Steps:
1. Review the UI implementation of the DeWEB site and HTTPS gateway.
2. Verify the no-wallet path to view invoice status and shareable receipt functionality.
3. Research and document the user experience, identifying potential pain points.
4. Update the research_notes.md file with the new findings.
5. Document recommendations for improvement.
>>>
ACCEPTANCE:
- [ ] The UI implementation is reviewed, and the no-wallet path functionality is verified.
- [ ] The user experience is researched, and potential pain points are identified.
- [ ] Recommendations for improvement are documented.

PHASE 4: Payment and Refund Logic (payment and refund deep dive, ~4 days)
PROMPT:
<<<
Role: Technical Auditor
Context: Review the payment and refund logic, focusing on the X Layer token and stablecoin usage.
Exact files/folders: Review the src/payment and src/refund folders.
Steps:
1. Review the code implementation of the payment logic, including the small configurable fee skim.
2. Verify the refund mechanism, including the time-lock refund and mutual cancel functionality.
3. Research and document the payment and refund logic, identifying potential security risks.
4. Update the research_notes.md file with the new findings.
5. Document recommendations for improvement.
>>>
ACCEPTANCE:
- [ ] The payment logic is reviewed, and the small configurable fee skim is verified.
-

=== ovh/qwen3.8-27b ===
[error: timeout]

=== ovh/qwen3.6-27b ===
[error: timeout]

=== ovh/gpt-oss-20b ===
[error: fan-out timeout]

=== bazaarlink/deepseek-v4-flash ===
[error: fan-out timeout]

=== kilo/auto-free ===
PHASE 1: Research Spike & Unknowns Triage (goal: lock technical assumptions, open primary docs; ~2 days)
PROMPT:
<<<
You are a senior blockchain/full-stack engineer. Context: TODAY is Saturday 14 November 2026. DEADLINE is 7 December 2026, 23:59 UTC. We are building TapeInvoice: a milestone invoice + escrow for freelancers and small buyers on X Layer. The companion X Layer contract holds funds and state (Draft → Funded → Submitted → Released or Refunded). A TapeOut circuit container is the escrow identity. UI is a DeWEB site plus a normal HTTPS gateway. No-wallet path to view invoice status and the shareable receipt.

Your task: research and document the following UNKNOWNs. Do NOT invent answers. Mark each as UNKNOWN, then write a short research note (max 3 bullets) on what you found or where to find it.

Files/folders: create /docs/primary/ and /docs/research/ folders.
1. X Layer stablecoin / liquid token for buyer deposits: Is there a readily usable stablecoin on X Layer (e.g., USDC, USDT, or a bridged variant)? What is the exact token contract address and symbol? If none, what is the recommended low-volatility token? Mark UNKNOWN if not confirmed.

=== kilo/ling-3.2-flash ===
[error: HTTP 429 {"error":{"message":"Rate limit exceeded: limit_rpd/inclusionai/ling-3.2-flash-20261113/29d1aca3-0609-42eb-8d0a-cba9ed72226e. Daily limit reached for inclusionai/ling-3.2-flash:fre]

=== kilo/beam-free ===
[error: empty or reasoning-only response]

[fan-out 160.0s | 10 ok / 5 timed out / 1 rate-limited / 4 error | models=20]
[failed: ovh/mistral-small-3.2 (timed out), kilo/glyph-cluster (error), nvidia/minimax-m3.1-flash (error), nvidia/nemotron-3-ultra (error), ovh/qwen3.8-27b (timed out), ovh/qwen3.6-27b (timed out), ovh/gpt-oss-20b (timed out), bazaarlink/deepseek-v4-flash (timed out), kilo/ling-3.2-flash (rate-limited), kilo/beam-free (error)]
[reserves launched: cohere/command-a-reasoning, cohere/command-r-plus, ovh/llama-3.3-70b, ovh/qwen3.8-27b, ovh/qwen3.6-27b, ovh/gpt-oss-20b, bazaarlink/deepseek-v4-flash, kilo/auto-free, kilo/ling-3.2-flash, kilo/beam-free | skipped-cooldown: or/nvidia/nemotron-3-ultra-550b-a55b:free, or/nvidia/nemotron-3.5-lightning:free, or/baidu/ernie-5.5-flash-preview:free, cf/gpt-oss-120b, cf/llama-3.3-70b, cf/llama-4-scout, kilo/ernie-5.5-flash, pollinations/openai-fast, hyperbolic/llama-3.1-405b, nvidia/mistral-large-4 | target 10/12]

=== DISTILLED (via ovh/qwen3.5-397b, 22.8s) ===
## Consensus
- **6-8 phased approach from research to demo**: Supported by gpt-oss-120b (7 phases), command-a-reasoning (7 phases), gemini-3.5-flash (6 phases), command-a-plus (partial), command-a (partial).
- **Contract state machine (Draft → Funded → Submitted → Released/Refunded)**: All models with contract phases agree (gpt-oss-120b, gemini-3.5-flash, command-a-reasoning, command-a-plus).
- **50 bps fee on release only**: Explicit in gpt-oss-120b, gemini-3.5-flash, command-a-reasoning, command-a-plus.
- **X Layer unknowns must be verified (chain ID, RPC, stablecoin)**: All models mark these as UNKNOWN in Phase 1 (gpt-oss-120b, gemini-3.5-flash, qwen3.5-397b, command-a-plus).
- **No-wallet public receipt view**: Supported by gpt-oss-120b (Phase 4), gemini-3.5-flash (Phase 4), command-a-reasoning (Phase 3).
- **Pain-point citations (Bonsai 2025, Remote, IPSE UK)**: Explicit in gpt-oss-120b (Phase 1), command-a-reasoning (Phase 1 context).
- **Hard cuts enforced (no cross-chain, no AI oracles, no off-chain backend)**: Stated in gpt-oss-120b, command-a-reasoning, command-a-plus.

## Disagreements
- **Backend/API routes**: command-a-reasoning (Phase 3) includes `backend/routes/invoice.js` and `GET /api/invoice/:id`, which contradicts the "no required off-chain backend as source of truth" constraint. gpt-oss-120b and gemini-3.5-flash explicitly require zero server-side API routes.
- **Phase count**: gpt-oss-120b and command-a-reasoning propose 7 phases; gemini-3.5-flash proposes 6; llama-3.3-70b proposes 4 (review-focused); command-r-plus proposes 2 (documentation-focused).
- **Token naming**: command-a-reasoning mentions "XUSD" in unknowns without verification flag; gpt-oss-120b explicitly warns against inventing token symbols.
- **Chain ID speculation**: command-a-plus warns against guessing 195; some models do not explicitly address this risk.

## Unique angles
- **gpt-oss-120b**: Requires PlantUML architecture diagram (`docs/architecture.puml`) and explicit UNKNOWN table with "Source / Action needed" column. Most detailed acceptance checklists per phase.
- **gemini-3.5-flash**: Specifies Next.js static export configuration (`output: 'export'`, `images: { unoptimized: true }`) for DeWEB compatibility. Includes explicit disclaimer banner component requirement.
- **command-a-reasoning**: Separates security audit prep as dedicated Phase 5 with reentrancy guard checklist.
- **command-a-plus**: Includes risk-per-phase slip table (Phase 1-5 specific risks).

## Flagged claims
- **command-a-reasoning**: `backend/routes/invoice.js` and `GET /api/invoice/:id` violate the "no required off-chain backend as source of truth" hard cut.
- **command-a-reasoning**: Mentions "XUSD" in unknowns without marking as potentially invented token name.
- **llama-3.3-70b**: Phases focus on "review existing documentation and codebase" when TapeInvoice v1 is a new build, not an audit of existing code.
- **command-r-plus**: Phase structure (documentation-heavy) does not align with 6-8 phases from research spike through demo dry-run requirement.
- **kilo/auto-free, qwen3.5-397b, qwen2.5-vl-72b**: Incomplete phase coverage (1-2 phases only), insufficient for full build timeline.

## Recommendation + confidence
**Recommendation**: Use gpt-oss-120b's 7-phase structure as the base, integrate gemini-3.5-flash's static export configuration for DeWEB, and adopt command-a-plus's per-phase risk table. Exclude any backend/API route references.

**Confidence**: High — gpt-oss-120b provides the most complete, constraint-compliant phase breakdown with explicit UNKNOWN tracking, proper hard-cut enforcement, and copy-paste-ready prompts with numbered acceptance checklists.

[total 182.8s]
