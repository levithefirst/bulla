
=== or/nvidia/nemotron-3-ultra-550b-a55b:free ===
[error: HTTP 429 {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day: https://openrouter.ai/settings/credits?utm_source=api&utm_]

=== or/nvidia/nemotron-3.5-lightning:free ===
[error: HTTP 429 {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day: https://openrouter.ai/settings/credits?utm_source=api&utm_]

=== or/baidu/ernie-5.5-flash-preview:free ===
[error: HTTP 429 {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day: https://openrouter.ai/settings/credits?utm_source=api&utm_]

=== cohere/command-a-plus ===
We need to produce two artifacts: (1) a self-contained mega-prompt that Claude Code will paste and run autonomously, covering all the tasks described. (2) a complete ordered list of everything Claude Code cannot do from now until hackathon submission, split by who can do it: Grok Bot can do, Fluid only.

We need to ensure we follow all constraints: no new product, no application code in answer, only produce the mega-prompt and the list. The mega-prompt must be self-contained and not ask human to intervene. Must include everything: research verification, monorepo scaffold, contracts + tests + local deploy script, testnet deploy scripts (no live key), circuit-container binding docs/scripts, full UI (landing, receipt, all write actions), DeWEB/static build + publish checklist, e2e tests, README, submission draft, demo doc + video script, handoff doc of everything Claude could not do, acceptance checklist. Must be one block between <<< and >>>.

We need to output the mega-prompt as a single copy-paste-ready block. Then after that block, output the NON-CLAUDE TASKS list.

We must not include any code in our answer besides the mega-prompt block? The instruction: "Do not write application code in your answer." The mega-prompt is a prompt to Claude Code, not code we write. So we can include the prompt text, which includes code snippets for the AI to generate, but not actual code we produce. The mega-prompt can contain instructions to generate code, but we are not writing the code ourselves. That should be fine.

We must not invent official addresses, chain IDs, etc. Use UNKNOWN placeholders where uncertain.

We must include the official docs as authority; if unknown, write UNKNOWN in docs/research.md and placeholder.

We must not commit keys, seeds, .env. Provide placeholder for .env.example.

We must not broadcast mainnet. Use testnet deploy scripts but no live key.

We must not mention "TapeInvoice" in UI. Use Bulla.

We must include the brand Bulla in UI, README, docs.

We need to reference the existing repo state: README, .gitignore, assets, docs/planning, docs/handoff/phase-1.md. The mega-prompt must start from that state, not wipe existing docs.

We need to produce a complete list of non-Claude tasks: tasks that require a human (Fluid) or Grok Bot (which can browse, sign up, etc). Must be ordered from now to submission. Must be split by who can do it: Grok Bot can do, Fluid only.

We need to include tasks like: confirm official chain ID, RPC, token addresses; obtain X Layer token for funding; sign transactions on mainnet; create TapeOut circuit; mint container; open container; record demo video; submit Google Form; attend Demo Day; etc.

We need to be careful not to invent any official addresses or URLs. Use placeholders like <CONFIRM_FROM_OFFICIAL_DOCS>.

We need to produce the mega-prompt in a block between <<< and >>>. The block must be self-contained; not refer to external files beyond the repo. Should instruct Claude Code to read existing docs, verify research, scaffold monorepo, write contracts, tests, deployment scripts, UI, e2e tests, docs, etc. Must include acceptance checklist at the end.

We need to ensure we don't produce any code in the answer outside the mega-prompt. The list of non-Claude tasks is plain text, not code.

We need to be thorough.

Let's outline the mega-prompt content:

- Preamble: You are Claude Code, working in repo at /workspace/bulla, branch main, with given files. Do not modify existing docs or logo. Use Bulla brand. Follow hard rules.

- Step 1: Research verification. Read docs/planning/research.md, locate sources, verify chain ID, RPC, token address, TapeOut factory, SiteRegistry

=== cohere/command-a ===
<<<
**MEGA-PROMPT FOR BULLA DEVELOPMENT**

**Objective**: Autonomously complete Bulla’s development from the current repo state to submission-ready, adhering to all constraints and hard rules.  

**Repo State**:  
- Path: `/workspace/bulla`  
- Remote: `https://github.com/levithefirst/bulla.git`  
- Branch: `main`  
- Commits: 4 (de78f30, 7896c08, e1a3f85, 6dafc36)  
- Existing files: `README.md`, `.gitignore`, `assets/logo.png`, `docs/planning/`, `docs/handoff/phase-1.md`  

**Hard Rules**:  
1. Official docs are the only authority for chain IDs, RPCs, explorers, token addresses, TapeOut factories, SiteRegistry, and CLIs. If unconfirmed, write `UNKNOWN` in `docs/research.md` and use a placeholder.  
2. Never invent `@xlayer/tapout-sdk`, `XUSD`, tapekit flags, or chain IDs (including 195).  
3. Never commit keys, seeds, or `.env`. Use `.env.example` for placeholders.  
4. Commit as `levithefirst <304593143+levithefirst@users.noreply.github.com>`.  
5. Keep the repo private.  
6. Use “Bulla” in the UI.  
7. Do not broadcast mainnet. Testnet deploy scripts may be written but not executed with live keys.  
8. Finish by writing `docs/HANDOFF.md` listing what Claude could not do.  

**Sequence of Work**:  

1. **Research Verification**  
   - Update `docs/planning/research.md` with verified sources for:  
     - X Layer chain ID, RPC, explorer, and token addresses.  
     - TapeOut factories, SiteRegistry, and CLIs.  
     - Mark unconfirmed details as `UNKNOWN` with placeholders.  

2. **Monorepo Scaffold**  
   - Create `contracts/`, `web/`, `scripts/`, and `.env.example`.  
   - Initialize Foundry in `contracts/` with `foundry.toml`.  
   - Set up Vite + React + TypeScript in `web/` with `viem/wagmi`.  

3. **Smart Contracts**  
   - Write `BullaInvoice.sol` implementing the specified invoice flow.  
   - Use OpenZeppelin `IERC20`, `SafeERC20`, and `ReentrancyGuard`.  
   - Add tests in `contracts/test/` covering all functions and edge cases.  
   - Write a local deploy script in `scripts/deploy-local.ts` generating `deployments.json`.  

4. **Testnet Deploy Scripts**  
   - Write scripts in `scripts/` for testnet deployment (no live keys).  
   - Include placeholders for unconfirmed details (e.g., token address).  

5. **Circuit-Container Binding**  
   - Document circuit-container binding in `docs/scripts/`.  
   - If programmatic tape-out is `UNKNOWN`, fallback to official UI instructions.  

6. **UI Development**  
   - Build landing page and `/invoice/:id` receipt page in `web/`.  
   - Implement wallet connection (OKX Wallet + MetaMask).  
   - Add approve-then-fund flow and warnings (unaudited, circuit-holder risk).  
   - Handle wrong-network banner for X Layer.  

7. **DeWEB/Static Build**  
   - Configure static export in `web/` with relative paths.  
   - Write a publish checklist in `docs/DEMO.md

=== cf/gpt-oss-120b ===
[error: HTTP 429 {"errors":[{"message":"AiError: AiError: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to contin]

=== cf/llama-3.3-70b ===
[error: HTTP 429 {"errors":[{"message":"AiError: AiError: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to contin]

=== cf/llama-4-scout ===
[error: HTTP 429 {"errors":[{"message":"AiError: AiError: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to contin]

=== ovh/gpt-oss-120b ===
<<<
**MEGA‑PROMPT FOR CLAUDE CODE (ONE‑SHOT EXECUTION)**  

You are Claude Code, an autonomous AI tasked with turning the existing **bulla** repository (located at `/workspace/bulla`) into a complete, production‑ready submission for the **X Layer TapeOut Accelerate** hackathon.  
The repository currently contains only a README, .gitignore, a logo, and several planning documents. **Do NOT delete or overwrite any existing files** (including docs/planning/* and assets/logo.png).  

Your work must be performed **entirely in this run**, without waiting for human intervention. Follow the sequence below and **commit after each logical phase** (use the author “levithefirst <304593143+levithefirst@users.noreply.github.com>”). All commits should be on branch `main`.  

---  

### 0️⃣ PRE‑RESEARCH VERIFICATION  

1. Open `docs/planning/research.md`.  
2. For every external claim (chain IDs, RPC URLs, explorer URLs, X Layer token address, TapeOut factory address, SiteRegistry address, official CLI names, etc.) do the following:  
   - Attempt to verify against the **official X Layer documentation** (https://web3.okx.com/xlayer/build-x-series), the X Layer GitHub repos, or other primary sources.  
   - If a source is confirmed, add a citation line under the claim (e.g., `// source: <URL>`).  
   - If a source cannot be confirmed after consulting the primary source, replace the value with the literal string `UNKNOWN` and add a comment `// source: UNKNOWN – verify later`.  
3. Append a new section `## Verification Summary` summarizing which items remain `UNKNOWN`.  

Commit these changes as **“chore: verify research sources”**.

---  

### 1️⃣ MONOREPO SCAFFOLDING  

Create a standard **monorepo** layout inside the repo:  

```
/contracts          # Solidity contracts & Foundry config
/web                # Vite + React frontend
/scripts            # Deployment & utility scripts
/.env.example       # Sample env (no secrets)
/foundry.toml       # Foundry config (use solidity ^0.8.24)
/package.json      # Workspace root (optional)
```

- Initialize **Foundry** in `/contracts` (`forge init --force`).  
- Initialize a **Vite+React+TypeScript** project in `/web` (`npm create vite@latest . -- --template react-ts`).  
- Install required dependencies in `/web`: `viem`, `wagmi`, `@wagmi/core`, `@web3modal/ethers5`, `@web3modal/react`, `tailwindcss` (optional), `playwright`.  
- Install Solidity dependencies in `/contracts`: `openzeppelin-contracts`, `openzeppelin-contracts-upgradeable`, `forge-std`.  

Commit the scaffold as **“chore: add monorepo scaffold”**.

---  

### 2️⃣ SOLIDITY CONTRACT (v1)  

Inside `/contracts/src/`, create `BullaInvoice.sol` implementing the **Milestone Invoice + Escrow** logic described in the product spec:

- **State**: enum `Status { Draft, Funded, Submitted, Released, Refunded, Cancelled }`  
- **Struct Invoice** contains: `seller`, `buyer`, `amount`, `feeBps`, `feeRecipient`, `dueTimestamp`, `deliveryHash`, `circuitContainerId`, `status`.  
- Functions (all `nonReentrant` where needed):
  - `createInvoice(uint256 amount, uint256 dueTimestamp, bytes32 circuitContainerId) external returns (uint256 invoiceId)`
  - `fundInvoice(uint256 invoiceId, uint256 amount) external` – pulls ERC‑20 via `SafeERC20.safeTransferFrom`.
  - `submitDelivery(uint256 invoiceId, bytes32 deliveryHash) external`
  - `releaseFunds(uint256 invoiceId) external` – transfers amount‑fee to seller and feeRecipient.
  - `requestRefund(uint256 invoiceId) external` – callable by buyer after `dueTimestamp` while status is `Funded` or `Submitted`.
  - `mutualCancel(uint256 invoiceId) external` – requires both parties’ consent (simple bool flags).
- **Constructor** receives: `address _token`, `uint256 _feeBps` (default 50), `address _feeRecipient`.  
- Use `OpenZeppelin IERC20`, `SafeERC20`, `ReentrancyGuard`.  
- **Owner** (`Ownable`) can only change `feeRecipient`.  

Add comprehensive NatSpec comments.  

Create corresponding **unit tests** in `/contracts/test/BullaInvoice.t.sol` covering all state transitions, fee calculation, timeout refund, and mutual cancel. Use Forge Stubs for ERC‑20 (MockERC20).  

Create a **deployment script** `/scripts/deploy.ts` (TypeScript, using `viem` and `foundry` JSON output) that:
- Reads `deployments.json` (generated after a local deployment) to avoid redeploy on repeat runs.
- Deploys `BullaInvoice.sol` with constructor args: token address (from verified research or `UNKNOWN` placeholder), feeBps, feeRecipient (set to `msg.sender` placeholder).  
- Writes the deployed address to `deployments.json`.  

Do **NOT** send any transaction; only generate the script files.  

Commit as **“feat: implement BullaInvoice contract + tests + deploy script”**.

---  

### 3️⃣ FRONTEND (Vite + React)

#### 3.1 Project Structure  

Under `/web/src/` create:  

- `components/` – UI atoms (Header, Footer, InvoiceCard, ConnectWalletButton, TxButton).  
- `pages/` – `Landing.tsx`, `InvoiceDetail.tsx`.  
- `hooks/` – `useBullaContract.ts` (encapsulates contract reads/writes via `wagmi`).  

#### 3.2 Global UI Requirements  

- Brand name **Bulla** appears in all user‑facing text, navigation, and README excerpts.  
- Use the logo at `../assets/logo.png`.  
- Display a persistent **network banner**: “Wrong network – please switch to X Layer” (detect via chain ID).  

#### 3.3 Wallet Integration  

- Implement wallet connection using **wagmi** + **viem** with **OKX Wallet**, **MetaMask**, or any injected provider.  
- Show “Connect Wallet” button when no account.  

#### 3.4 Invoice Flow UI  

1. **Create Draft** – form: amount, due date, circuitContainerId (free‑text). Calls `createInvoice`.  
2. **Fund Invoice** – two‑step: (a) `ERC20.approve(contract, amount)`, (b) `fundInvoice`. Show required allowance UI.  
3. **Submit Delivery** – textarea for delivery hash / artifact URI, calls `submitDelivery`.  
4. **Release Funds** – button visible to buyer when status is `Submitted`, calls `releaseFunds`.  
5. **Timeout Refund** – auto‑displayed message after `dueTimestamp` with “Refund” button (calls `requestRefund`).  
6. **Mutual Cancel** – both parties can click “Cancel” → UI shows pending consent, once both have clicked calls `mutualCancel`.  

All transaction buttons must show real‑time status (pending, success, error) using wagmi’s `useSendTransaction`.  

#### 3.5 Public Receipt Page  

Route: `/invoice/:id` (static‑export compatible). It must display:  

- Invoice ID, seller & buyer addresses (shortened).  
- Amount, fee (computed as `amount * feeBps / 10_000`).  
- Current status timeline (Draft → Funded → Submitted → Released/Refunded/Cancelled).  
- Delivery hash / artifact URI (if submitted).  
- Circuit container ID (linked to official X Layer explorer if known, otherwise show `UNKNOWN`).  
- Explorer links for the contract and transaction hashes (use verified explorer URL or placeholder).  
- “Copy” and “Print” buttons for a printable receipt.  

No wallet needed to view this page (read‑only).  

#### 3.6 Static Export  

Configure Vite to build a **static site** (`npm run build && vite preview`). Ensure all routes work via relative paths (`<base href="./">`).  

Commit UI code as **“feat: full Bulla UI with wallet integration & receipt page”**.

---  

### 4️⃣ E2E TESTS (Playwright)

Create `/web/tests/` with a Playwright test suite that runs against a **local Foundry node** (via `anvil`) and the Vite dev server:

- Deploy MockERC20 and BullaInvoice on the local node using the script from step 2.  
- Simulate two EOAs (use deterministic private keys from `scripts/fixtures/keys.json` – **do NOT expose real keys**).  
- Test the complete flow: create → fund → submit → release, asserting UI updates and contract state.  
- Test timeout refund: fast‑forward blockchain time past `dueTimestamp` and verify refund button appears and succeeds.  
- Test mutual cancel: both parties click cancel and the refund occurs.  

Add CI script in `package.json`:

```json
"scripts": {
  "test:e2e": "playwright test"
}
```

Commit as **“test: add Playwright e2e suite for full invoice lifecycle”**.

---  

### 5️⃣ DOCUMENTATION  

1. **README.md** – update with:  
   - Project overview, brand “Bulla”, architecture diagram, quick start (install, build, run locally).  
   - Security warning: “Unaudited v1. Contract holds funds; circuit owner controls container. If that wallet is compromised, funds are at risk.”  
   - Links to all major docs (docs/SUBMISSION‑DRAFT.md, docs/DEMO.md, docs/HANDOFF.md).  

2. **docs/SUBMISSION‑DRAFT.md** – fill the hackathon submission fields:  
   - **Product**: Bulla – milestone invoice + escrow on X Layer.  
   - **Target users / reach**: freelancers & agencies (cite Bonsai 2025, Remote, IPSE UK stats).  
   - **Revenue model**: 0.5 % fee per successful release (feeRecipient is Bulla).  
   - **Why users pay & stay**: trust‑less escrow, on‑chain receipt, no middle‑man, low fee.  
   - Include the three citation links exactly as provided.  

3. **docs/DEMO.md** – write a **≤3‑minute video script** covering: intro, UI walkthrough (create, fund, submit, release), receipt view, safety warnings, and conclusion.  

4. **docs/HANDOFF.md** – automatically generate a list titled **“Tasks Claude Code could NOT perform”**. For each item, write a short description and a placeholder `TODO:`. This file will be used later by humans.  

5. **docs/research.md** – already updated in step 0.  

Commit all docs in a single commit **“docs: add submission draft, demo script, handoff list, and update README”**.

---  

### 6️⃣ ACCEPTANCE CHECKLIST (Claude must run before finishing)

Before terminating, run the following checks **automatically** and output a summary table **“Acceptance Checklist – Passed / Failed”** in the console:

| # | Check | Command | Expected Result |
|---|-------|---------|-----------------|
| 1 | Research sources verified | `cat docs/planning/research.md` | No `UNKNOWN` without comment |
| 2 | Monorepo scaffold exists | `tree -L 2` | `contracts/ web/ scripts/` present |
| 3 | Contract compiles and tests pass | `cd contracts && forge test -vv` | 0 failures |
| 4 | Deploy script generated | `cat scripts/deploy.ts` | contains placeholder addresses only |
| 5 | UI builds statically | `cd web && npm run build && npm run preview --silent & sleep 5 && curl -s http://localhost:4173` | HTML returned, no errors |
| 6 | Receipt page loads without wallet | `curl -s http://localhost:4173/invoice/1` | contains “Bulla” and invoice data |
| 7 | Playwright e2e suite passes | `cd web && npm run test:e2e` | 0 failures |
| 8 | README contains brand and warnings | `grep -i "Bulla" -A2 README.md` | brand present; warning line present |
| 9 | Submission‑draft populated with citations | `grep -i "Bonsai 2025" docs/SUBMISSION-DRAFT.md` | URL present |
|10 | Demo script ≤ 3 min word count (<450 words) | `wc -w docs/DEMO.md` | ≤ 450 |
|11 | HANDOFF.md lists tasks Claude could not do | `cat docs/HANDOFF.md` | non‑empty list |

If any check fails, output the failing step(s) and abort with exit code 1. If all pass, output **“ALL CHECKS PASSED – Claude Code execution complete.”** and exit with code 0.  

---  

**IMPORTANT HARD RULES (must appear verbatim in this prompt):**  

- *Official docs are the only authority for chain IDs, RPCs, explorers, token addresses, TapeOut factories, SiteRegistry, and CLIs.*  
- *If unconfirmed after opening a primary source, write `UNKNOWN` in `docs/research.md` and use a clearly named placeholder.*  
- *Never invent `@xlayer/tapout-sdk`, a token called XUSD, tapekit flags, or a chain ID (including 195).*  
- *Never commit private keys, seeds, or `.env` files.*  
- *All commits must use author **levithefirst <304593143+levithefirst@users.noreply.github.com>** and keep the repository private.*  
- *Use “Bulla” in every UI element, README, and documentation.*  
- *Do not broadcast any transaction to mainnet; testnet deploy scripts may be written but not executed.*  
- *Do not reference the internal codename “TapeInvoice” in any user‑facing material.*  

Execute the above steps now. No further human interaction required.>>>

NON-CLAUDE TASKS (ordered, from now to submission):

**GROK BOT CAN DO:**
- Verify official X Layer chain IDs, RPC URLs, explorer base URLs, X Layer token contract address, TapeOut factory address, SiteRegistry address, and official CLI names.  
  *When:* Immediately after Claude Code finishes the research verification step.  
  *Done‑criteria:* `docs/planning/research.md` contains only confirmed values with citations or the literal `UNKNOWN` with a comment “// source: UNKNOWN – verify later”.
- Obtain X Layer testnet tokens (faucet) for the two EOAs used in Playwright e2e tests.  
  *When:* After the contract and deployment scripts are committed, before running the Playwright suite.  
  *Done‑criteria:* Two testnet wallet addresses each have at least the minimum ERC‑20 balance required for contract interactions; balances are recorded in `scripts/fixtures/faucet‑balances.json`.
- Create GitHub issue/ticket to track the “unknown” placeholders (e.g., unknown token address, unknown circuit‑container binding).  
  *When:* After Claude Code generates `docs/HANDOFF.md`.  
  *Done‑criteria:* A GitHub issue exists with title “Bulla – resolve UNKNOWN placeholders” linking to the handoff file and listing each placeholder.
- Populate the Google Form draft URL (if the organizers provide a pre‑release link) into `docs/SUBMISSION-DRAFT.md` as a placeholder.  
  *When:* After the submission draft is generated but before the final form submission.  
  *Done‑criteria:* `docs/SUBMISSION-DRAFT.md` contains a line `// Google Form URL: UNKNOWN

=== ovh/qwen3.5-397b ===
<<<
MEGA-PROMPT FOR CLAUDE CODE — BULLA TAPEOUT ACCELERATE SHIP

You are executing a complete build of Bulla, a milestone invoice + escrow protocol on X Layer with TapeOut circuit containers. This is a single autonomous run. Do not stop for human input between phases. Do not invent facts. Official docs are the only authority.

================================================================================
PHASE 0: GROUND RULES (READ FIRST, ENFORCE ALWAYS)
================================================================================

1. OFFICIAL DOCS ONLY: For chain IDs, RPCs, explorers, token addresses, TapeOut factories, SiteRegistry, and CLIs — open primary sources. If unconfirmed after checking, write UNKNOWN in docs/research.md and use clearly named placeholders. Never invent @xlayer/tapout-sdk, a token called XUSD, tapekit flags, or chain ID 195.

2. NO LIVE KEYS: Write deploy scripts. Do not execute signed transactions on testnet or mainnet. Do not commit keys, seeds, or .env files. Create .env.example with placeholders only.

3. BRANDING: Use "Bulla" in all user-facing UI, README, and docs. Internal codename was TapeInvoice — do not put "TapeInvoice" in the UI.

4. COMMIT IDENTITY: Commit as levithefirst <304593143+levithefirst@users.noreply.github.com>. Keep repo private.

5. EXISTING FILES: Do not wipe existing docs/planning/, docs/handoff/, assets/logo.png, README.md, or .gitignore. Extend them.

6. STACK: Foundry for contracts. Vite + React + TypeScript + viem/wagmi for UI. Static export, relative paths. No backend.

7. CONTRACT SCOPE: seller createInvoice; buyer fundInvoice (ERC-20); seller submitDelivery; buyer releaseFunds; timeout refund after dueTimestamp while Funded or Submitted; mutualCancel. Fee: constructor-set feeBps default 50 (0.5%) and feeRecipient; skim only on successful release. Each invoice stores a circuitContainerId. Seller and buyer EOAs act. OpenZeppelin IERC20/SafeERC20/ReentrancyGuard. Owner may change feeRecipient only.

8. UI SCOPE: Landing + /invoice/:id no-wallet receipt (timeline, amounts, fee, delivery hash, container id, explorer links, copy/print). Wallet-connect for writes (OKX Wallet + injected). Approve-then-fund two-step. Visible warnings: unaudited v1, and "whoever holds the circuit controls the container — not safe if that wallet is stolen." Wrong-network banner names X Layer.

9. SUBMISSION REQUIREMENTS: Google Form needs access link and/or processor contract address plus circuit ID; product, target users/reach, revenue model, why users pay and stay; optional demo video ≤ 3 minutes.

10. ACCEPTANCE CHECKLIST: Run at end before stopping. All items must pass.

================================================================================
PHASE 1: RESEARCH VERIFICATION — docs/research.md
================================================================================

Update docs/planning/research.md (or create docs/research.md if clearer) with verified sources. For each item, cite URL and date accessed. Mark UNKNOWN if not confirmed.

REQUIRED VERIFICATIONS:
- X Layer chain ID (do not assume 195)
- X Layer testnet chain ID and name
- X Layer mainnet RPC URL(s)
- X Layer testnet RPC URL(s)
- X Layer block explorer URL (mainnet)
- X Layer block explorer URL (testnet)
- Official ERC-20 token address on X Layer mainnet for fees (if any confirmed)
- TapeOut factory contract address (mainnet and/or testnet)
- TapeOut SiteRegistry contract address
- TapeOut CLI name and install command (if exists)
- TapeOut programmatic container creation API (if exists)
- TapeOut official UI URL for manual container creation
- OKX Wallet injection provider name (e.g., window.okxwallet)
- X Layer faucet URL(s) for testnet ETH and/or tokens
- Google Form submission link for X Layer TapeOut Accelerate

For each UNKNOWN, write a clear placeholder name (e.g., XLAYER_MAINNET_RPC, TAPEOUT_FACTORY_ADDRESS) and note where it must be filled before deploy.

================================================================================
PHASE 2: MONOREPO SCAFFOLD
================================================================================

Create the following directory structure without removing existing files:

/workspace/bulla/
├── contracts/           # Foundry project
│   ├── src/
│   │   └── Bulla.sol
│   ├── test/
│   │   └── Bulla.t.sol
│   ├── script/
│   │   ├── Deploy.s.sol
│   │   └── DeployTestnet.s.sol
│   ├── foundry.toml
│   └── remappings.txt
├── web/                 # Vite + React + TypeScript
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css
│   │   ├── components/
│   │   │   ├── Landing.tsx
│   │   │   ├── InvoiceReceipt.tsx
│   │   │   ├── CreateInvoiceForm.tsx
│   │   │   ├── FundInvoiceForm.tsx
│   │   │   ├── SubmitDeliveryForm.tsx
│   │   │   ├── ReleaseFundsForm.tsx
│   │   │   ├── RefundButton.tsx
│   │   │   ├── MutualCancelButton.tsx
│   │   │   ├── NetworkBanner.tsx
│   │   │   └── WarningBanner.tsx
│   │   ├── hooks/
│   │   │   ├── useBullaContract.ts
│   │   │   ├── useInvoice.ts
│   │   │   └── useNetwork.ts
│   │   ├── lib/
│   │   │   ├── contract.ts
│   │   │   └── utils.ts
│   │   └── types/
│   │       └── index.ts
│   ├── public/
│   │   └── logo.png     # Copy from assets/logo.png
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js (if using Tailwind)
│   └── package.json
├── scripts/
│   ├── verify-deploy.sh
│   └── build-and-export.sh
├── .env.example
├── deployments.json
├── README.md            # Extend, do not replace
└── docs/
    ├── research.md      # From Phase 1
    ├── SUBMISSION-DRAFT.md
    ├── DEMO.md
    ├── VIDEO-SCRIPT.md
    └── HANDOFF.md

Initialize Foundry in contracts/: `forge init` then replace with Bulla.sol.
Initialize Vite in web/: `npm create vite@latest web -- --template react-ts` then customize.

================================================================================
PHASE 3: SMART CONTRACT — contracts/src/Bulla.sol
================================================================================

Write a complete Foundry contract with:

STRUCTS:
- Invoice {
    uint256 id;
    address seller;
    address buyer;
    uint256 amount;
    address token;
    uint256 dueTimestamp;
    bytes32 deliveryHash;
    string deliveryUri;
    string circuitContainerId;
    InvoiceState state;
    uint256 createdAt;
}

ENUM InvoiceState: Draft, Funded, Submitted, Released, Refunded, Cancelled

CONSTRUCTOR:
- address _token (ERC-20)
- uint256 _feeBps (default 50)
- address _feeRecipient

FUNCTIONS:
- createInvoice(address buyer, uint256 amount, uint256 dueTimestamp, string memory circuitContainerId) returns (uint256 invoiceId)
- fundInvoice(uint256 invoiceId) — transfers ERC-20 from buyer to contract
- submitDelivery(uint256 invoiceId, bytes32 deliveryHash, string memory deliveryUri) — seller only, state Funded → Submitted
- releaseFunds(uint256 invoiceId) — buyer only, state Submitted → Released, skims fee to feeRecipient, rest to seller
- refund(uint256 invoiceId) — callable by anyone after dueTimestamp if state is Funded or Submitted, refunds buyer, state → Refunded
- mutualCancel(uint256 invoiceId) — requires both seller and buyer consent (two-step or signed message), refunds buyer if funded, state → Cancelled
- getInvoice(uint256 invoiceId) view returns Invoice
- changeFeeRecipient(address newFeeRecipient) — owner only

MODIFIERS:
- onlySeller(uint256 invoiceId)
- onlyBuyer(uint256 invoiceId)
- onlyOwner (for feeRecipient change)

EVENTS:
- InvoiceCreated(uint256 indexed invoiceId, address seller, address buyer, uint256 amount, string circuitContainerId)
- InvoiceFunded(uint256 indexed invoiceId, uint256 amount)
- DeliverySubmitted(uint256 indexed invoiceId, bytes32 deliveryHash, string deliveryUri)
- FundsReleased(uint256 indexed invoiceId, uint256 sellerAmount, uint256 feeAmount)
- FundsRefunded(uint256 indexed invoiceId, uint256 amount)
- InvoiceCancelled(uint256 indexed invoiceId)

SECURITY:
- Use OpenZeppelin SafeERC20 for token transfers
- Use ReentrancyGuard
- Check state transitions explicitly
- No withdrawal patterns that could drain contract
- Owner cannot touch user funds, only feeRecipient

Write full Foundry tests in contracts/test/Bulla.t.sol covering:
- Create invoice (Draft state)
- Fund invoice (Funded state, balance check)
- Submit delivery (Submitted state)
- Release funds (Released state, fee skim, seller receives remainder)
- Timeout refund after dueTimestamp (Funded → Refunded)
- Timeout refund after dueTimestamp (Submitted → Refunded)
- Mutual cancel (Cancelled state, refund if funded)
- Revert: fund non-existent invoice
- Revert: submit delivery not by seller
- Revert: release funds not by buyer
- Revert: release funds before submission
- Revert: refund before dueTimestamp
- Revert: change feeRecipient not by owner

================================================================================
PHASE 4: DEPLOY SCRIPTS — contracts/script/
================================================================================

Deploy.s.sol:
- Local deployment (Anvil)
- Deploys MockERC20 if token address is zero
- Deploys Bulla contract
- Creates one test invoice
- Writes deployments.json with { local: { bullaAddress, tokenAddress, chainId } }

DeployTestnet.s.sol:
- Reads token address from env XLAYER_TESTNET_TOKEN (placeholder if UNKNOWN)
- Deploys Bulla contract to X Layer testnet
- Does NOT sign or broadcast — writes deployment artifact to deployments.json with { testnet: { bullaAddress, tokenAddress, chainId, txHash: "PENDING_HUMAN_SIGN" } }
- Includes clear comment: "Human must run: forge script --broadcast --private-key $PRIVATE_KEY"

deployments.json structure:
{
  "local": { "bullaAddress": "...", "tokenAddress": "...", "chainId": "..." },
  "testnet": { "bullaAddress": "UNKNOWN_UNTIL_DEPLOY", "tokenAddress": "...", "chainId": "...", "txHash": "PENDING_HUMAN_SIGN" },
  "mainnet": { "bullaAddress": "UNKNOWN_UNTIL_DEPLOY", "tokenAddress": "...", "chainId": "...", "txHash": "PENDING_HUMAN_SIGN" }
}

================================================================================
PHASE 5: CIRCUIT-CONTAINER BINDING — docs/ + scripts/
================================================================================

Create docs/CIRCUIT-CONTAINER.md with:
- What a TapeOut circuit container is (escrow identity, DeWEB home of static app)
- How to create one manually via official UI (URL from research, or UNKNOWN placeholder)
- How to bind container ID to invoice (stored in contract at createInvoice)
- How to deploy static UI to container (if programmatic API exists, document; else manual steps)
- Warning: "Whoever holds the circuit controls the container — not safe if that wallet is stolen"

Create scripts/build-and-export.sh:
- Runs `npm run build` in web/
- Exports static files to web/dist/
- Outputs checklist for manual upload to TapeOut container or alternative DeWEB host
- Does not invent CLI commands — if tapekit or similar is UNKNOWN, write "CONFIRM FROM OFFICIAL DOCS"

================================================================================
PHASE 6: UI IMPLEMENTATION — web/
================================================================================

CONFIGURATION:
- vite.config.ts: base path "/", build.outDir "dist", relative assets
- wagmi config: chains from research (X Layer mainnet + testnet), connectors (injected, OKX Wallet if detected)
- contract ABI: generate from Foundry artifact or write minimal ABI for Bulla.sol

COMPONENTS:

Landing.tsx:
- Bulla logo (from public/logo.png)
- Tagline: "Milestone invoices with on-chain escrow"
- CTA: "Create Invoice"
- Link to /invoice/:id for public receipt view
- Warning banner: "Unaudited v1. Circuit holder controls container."

InvoiceReceipt.tsx (/invoice/:id):
- Read-only view, no wallet required
- Fetch invoice data from contract via viem public client
- Display: invoice ID, seller address (truncated), buyer address (truncated), amount, token, due date, state, delivery hash/URI, circuit container ID, fee amount, explorer links
- Timeline visualization: Draft → Funded → Submitted → Released/Refunded/Cancelled
- Copy buttons for addresses, hash, container ID
- Print button (window.print())

CreateInvoiceForm.tsx:
- Wallet connect required
- Inputs: buyer address, amount, due date (datetime picker), circuit container ID
- Calls createInvoice
- Shows tx pending/success/fail

FundInvoiceForm.tsx:
- Wallet connect required
- Two-step: Approve token → Fund invoice
- Shows allowance check, approve tx, then fund tx
- Uses SafeERC20 forceApprove pattern if needed

SubmitDeliveryForm.tsx:
- Seller only
- Input: delivery hash (optional), delivery URI (e.g., IPFS or Arweave link)
- Calls submitDelivery

ReleaseFundsForm.tsx:
- Buyer only, only if state == Submitted
- Calls releaseFunds
- Shows expected seller amount and fee amount

RefundButton.tsx:
- Visible if state == Funded or Submitted AND block.timestamp >= dueTimestamp
- Anyone can call
- Calls refund

MutualCancelButton.tsx:
- Two-step consent: seller initiates, buyer confirms (or vice versa)
- Simple implementation: seller calls, stores pendingCancel[invoiceId] = buyer, then buyer calls to execute
- Refunds buyer if funded

NetworkBanner.tsx:
- Detects connected chain
- If not X Layer (mainnet or testnet from research), show red banner: "Wrong network. Connect to X Layer [name]."

WarningBanner.tsx:
- Always visible on write pages
- "Unaudited v1 contract. Whoever holds the circuit controls the container — not safe if that wallet is stolen."

HOOKS:

useBullaContract.ts:
- Returns contract instance via wagmi useContract
- Exposes all write functions with proper error handling

useInvoice.ts:
- Fetches invoice data by ID
- Returns parsed Invoice object with state label

useNetwork.ts:
- Returns current chain, detects X Layer mismatch

STYLING:
- Use

=== ovh/mistral-small-3.2 ===
Here's the requested output:

<<<
**Bulla Mega-Prompt (2026-11-14)**

**Phase 0: Research Verification**
1. Update docs/research.md with verified sources for:
   - X Layer chain IDs, RPCs, explorers
   - ERC-20 token addresses (mainnet/testnet)
   - TapeOut factories, SiteRegistry, and CLI commands
   - Mark as UNKNOWN if unconfirmed after primary source checks
2. Add placeholder values for all UNKNOWN items with clear naming (e.g., `UNKNOWN_XLAYER_TESTNET_RPC`)

**Phase 1: Monorepo Scaffold**
1. Create structure:
   ```
   contracts/
     Invoice.sol
     MockERC20.sol
     foundry.toml
   web/
     src/
       components/
       pages/
       App.tsx
     vite.config.ts
     tsconfig.json
   scripts/
     deploy.ts
     testnet-deploy.ts
   e2e/
     tests/
   docs/
     SUBMISSION-DRAFT.md
     DEMO.md
     HANDOFF.md
   ```

**Phase 2: Contract Development**
1. Implement Invoice.sol with:
   - All specified functions (createInvoice, fundInvoice, etc.)
   - OpenZeppelin imports (IERC20, SafeERC20, ReentrancyGuard)
   - Constructor parameters (token address, feeBps, feeRecipient)
   - Time-lock refund logic
   - Mutual cancel functionality
2. Write MockERC20.sol for local testing
3. Create foundry.toml with:
   - X Layer testnet config
   - MockERC20 as default token
4. Write full test suite covering:
   - Happy paths (create→fund→submit→release)
   - Edge cases (timeouts, mutual cancel, reentrancy)
   - Fee calculations

**Phase 3: Deployment Scripts**
1. Create scripts/deploy.ts for local/anvil deployment
2. Create scripts/testnet-deploy.ts with:
   - Placeholder private key (must be replaced by human)
   - Verification of deployed addresses
3. Generate deployments.json template

**Phase 4: Circuit Container Binding**
1. Document circuit-container binding process in docs/handoff/phase-1.md
2. Create fallback UI solution if programmatic tape-out is UNKNOWN
3. Add warning about circuit holder security risks

**Phase 5: UI Development**
1. Implement Vite + React + TypeScript app with:
   - Landing page (product pitch, warnings)
   - /invoice/:id receipt page (timeline, amounts, explorer links)
   - Wallet connection (OKX Wallet + injected)
   - Approve-then-fund flow
   - Wrong-network detection
2. Add static export configuration
3. Implement relative path routing

**Phase 6: Testing**
1. Write e2e tests covering:
   - Full invoice lifecycle
   - Timeout refunds
   - Mutual cancel
   - Local and testnet scenarios
2. Add test coverage for UI edge cases

**Phase 7: Documentation**
1. Update README.md with:
   - Architecture diagram
   - Setup instructions
   - Deployment checklist
2. Create docs/SUBMISSION-DRAFT.md with:
   - Product description
   - Target users (freelancers, small businesses)
   - Revenue model (0.5% fee)
   - Pain-point citations (Bonsai, Remote, IPSE)
3. Create docs/DEMO.md with:
   - ≤3 minute video script
   - Key demo points
4. Create docs/HANDOFF.md listing all Claude limitations

**Phase 8: Acceptance Checklist**
1. Verify all tests

=== ovh/qwen2.5-vl-72b ===
<<<
```plaintext
# Mega-Prompt for Claude Code

## Context and Setup

Today is Saturday, 14 November 2026. The deadline for the X Layer TapeOut Accelerate event is 7 December 2026, 23:59 UTC. The product is Bulla, a milestone invoice + escrow solution on X Layer. The internal codename was TapeInvoice, but this should not appear in the UI. The flow includes Draft → Funded → Submitted → Released / Refunded, with a time-lock refund mechanism and mutual cancellation option. The companion Solidity contract holds funds and state, and a TapeOut circuit container serves as the escrow identity and DeWEB home of the static app. There is no backend, no TapeSend, no bridges, and it is not related to CoTape, TapeFlow, or a token launch.

## Current Repo State

The current repository is located at `/workspace/bulla`, with the remote URL `https://github.com/levithefirst/bulla.git`. The branch is `main`, and the working tree is clean. Present files include `README.md`, `.gitignore`, `assets/logo.png`, and various planning documents in `docs/planning/` and `docs/handoff/`.

## Task Overview

This mega-prompt covers the following tasks in one run:
1. Research verification and documentation.
2. Monorepo scaffolding.
3. Contract development, testing, and deployment.
4. UI development and static build.
5. E2E testing.
6. Documentation updates.
7. Submission draft preparation.
8. Handoff documentation.

## Detailed Instructions

### 1. Research Verification

- Verify all information in `docs/planning/research.md` using official sources. If any information is unconfirmed, document it as `UNKNOWN` in `docs/research.md`.
- Ensure all references to chain IDs, RPCs, explorers, token addresses, TapeOut factories, SiteRegistry, and CLIs are accurate and sourced from official documentation.

### 2. Monorepo Scaffold

- Create necessary directories: `contracts/`, `web/`, `scripts/`, and `.env.example`.
- Initialize the project with Vite + React + TypeScript + viem/wagmi for the UI.
- Set up Foundry for smart contract development (if not possible, use Hardhat).

### 3. Contract Development

- Develop the Solidity contract for Bulla, including functions for creating invoices, funding, submitting deliveries, releasing funds, and mutual cancellation.
- Implement safety measures like reentrancy guards and proper access control.
- Write comprehensive tests for the contract.
- Create a local deployment script that writes to `deployments.json`.
- Write testnet deployment scripts, ensuring they do not use live private keys.

### 4. UI Development

- Develop the landing page and invoice receipt page using Vite + React + TypeScript + viem/wagmi.
- Implement wallet connectivity for OKX Wallet and MetaMask.
- Ensure the UI reflects the brand name "Bulla" and includes necessary warnings and banners.
- Static export the UI for DeWEB publishing.

### 5. E2E Testing

- Write end-to-end tests using Playwright or an equivalent tool to cover the entire flow: create → fund → submit → release and timeout-refund on local/testnet.

### 6. Documentation Updates

- Update the `README.md` with detailed instructions and information about the project.
- Write `docs/SUBMISSION-DRAFT.md` using approved pain-point citations.
- Prepare `docs/DEMO.md` with a script for a ≤3-minute demo video.

### 7. Submission Draft Preparation

- Draft the submission content for the Google Form, including the processor contract address, circuit ID, product description, target users, revenue model, and reasons for user payment and retention.

### 8. Hand

=== kilo/glyph-cluster ===
[error: empty or reasoning-only response]

=== kilo/ernie-5.5-flash ===
[error: empty or reasoning-only response]

=== pollinations/openai-fast ===
<<<
# Bulla Project Production Prompt (AUTONOMOUS EXECUTION)

**Prerequisites – Assumptions**
- Working directory is `/workspace/bulla` and currently clean (no uncommitted changes).
- GitHub repo `https://github.com/levithefirst/bulla.git` accessible; we will commit with author `levithefirst <304593143+levithefirst@users.noreply.github.com>`.
- Tooling: Git, Node (v20+), Foundry (`forge`), `npm`, `vite`, `react`, `typescript`, `viem`, `wagmi`, `playwright`.
- No private keys or secrets will be touched automatically. All private key usage must be an explicit human step.

---

## 1. Research Verification
1. Create/ensure existence of `docs/research.md` (it already exists; we will edit it).  
2. Fetch official X Layer documentation references:
   ```sh
   curl -s https://docs.xlayerhq.com/api/chain-ids.json | jq . > docs/official_chain_ids.json
   curl -s https://docs.xlayerhq.com/api/rpc-endpoints.json | jq . > docs/official_rpc.json
   curl -s https://docs.xlayerhq.com/api/explorers.json | jq . > docs/official_explorers.json
   curl -s https://github.com/xlayerhq/tapout-sdk/releases/latest | grep -oP 'v[0-9]+\.[0-9]+\.[0-9]+' > docs/official_tapout_sdk_version
   ```
   **If any of the above URLs or JSON keys are unavailable**: add a line in `docs/research.md` like  
   `- ChainID: UNKNOWN`  
   [Ensure that “UNKNOWN” is capitalized exactly] and set `chainId = $UNKNOWN_CHAIN_ID` in subsequent configs.

3. Record all sources in `docs/research.md` under sections “Official Chain IDs”, “RPC Endpoints”, “Explorers”, “Tapout SDK”.  
4. Ensure that any unavailable info uses the placeholder `UNKNOWN` as specified.

---

## 2. Monorepo Scaffold
```bash
# Create directories
mkdir -p contracts scripts tests ui
# Core package.json in root (kept simple)
cat <<'EOF' > package.json
{
  "name": "bulla",
  "private": true,
  "scripts": {
    "forge:init": "forge init --etherscan-api-key $ETHERSCAN_API_KEY cli",
    "forge:build": "forge build",
    "forge:test": "forge test",
    "forge:deploy:testnet": "forge script scripts/TestnetDeploy.sol --broadcast --rpc-url \${TESTNET_RPC} --private-key \${PRIVATE_KEY} --slow",
    "ui:build": "cd ui && npm run build",
    "ui:dev": "cd ui && npm run dev",
    "playwright:test": "playwright test",
    "ci": "npm run forge:test && npm run ui:build && npm run playwright:test"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.2.0",

=== gemini-3.5-flash ===
<<<
# BULLA HACKATHON AUTONOMOUS EXECUTION PROMPT
# TARGET: X Layer TapeOut Accelerate Hackathon (Deadline: 7 Dec 2026, 23:59 UTC)
# PRODUCT: Bulla (Milestone invoice + escrow on X Layer)

You are Claude Code acting as the lead software engineer for Bulla. Execute the entire development pipeline from workspace root `/workspace/bulla` in one continuous run without stopping for human intervention between phases. 

### CRITICAL CONSTRAINTS & HARD RULES
1. **Git Identity**: Configure git user before any commits:
   `git config user.name "levithefirst"`
   `git config user.email "304593143+levithefirst@users.noreply.github.com"`
2. **Repo State**: Keep existing planning docs in `docs/planning/`, existing handoff files, and `assets/logo.png`. Do NOT wipe or overwrite them.
3. **No Hallucinated Tools/SDKs/Chains**:
   - Official X Layer documentation is the ONLY authority for RPCs, Chain IDs, Explorer URLs, Token addresses, TapeOut factories, and Site Registry.
   - If an RPC, Chain ID, factory address, or token contract cannot be confirmed via official documentation, write `UNKNOWN` in `docs/research.md` and use explicit placeholders in config (e.g. `process.env.VITE_XLAYER_CHAIN_ID`).
   - NEVER invent packages like `@xlayer/tapout-sdk`, fake CLI flags, tokens named `XUSD`, or unverified Chain IDs (e.g., do NOT hardcode 195 unless verified in docs).
4. **Security & Secrets**: Never commit private keys, mnemonic seeds, or live `.env` files. Ensure `.gitignore` ignores `.env`, `cache`, `out`, `dist`, `node_modules`, `broadcast`.
5. **Branding**: Product name is **Bulla**. Use "Bulla" in all UI text, READMEs, titles, and headers. Never display internal codenames like "TapeInvoice" in the UI.
6. **No Mainnet Broadcasting**: Do not broadcast signed mainnet transactions. Write testnet/mainnet deploy scripts that accept an environment variable private key, but do NOT execute live network deployments.
7. **Scope Boundaries**: Bulla is a static dApp + companion Solidity escrow contract. No custom backend, no TapeSend, no token launch, no bridges, no NAND VM.

---

### PHASE 0: PRE-FLIGHT & GIT IDENTITY
- Run:
  ```bash
  git config user.name "levithefirst"
  git config user.email "304593143+levithefirst@users.noreply.github.com"
  ```
- Verify root directory structure (`assets/logo.png`, `docs/planning/`, `README.md`).

---

### PHASE 1: RESEARCH VERIFICATION (`docs/research.md`)
- Create `docs/research.md`. Inspect `docs/planning/research.md` if present, treating it as unverified leads.
- Search repository/web references or official docs for X Layer Testnet/Mainnet parameters:
  - Chain ID, RPC Endpoint, Block Explorer URL.
  - X Layer TapeOut / SiteRegistry / DeWEB deployment contracts or interfaces.
  - Official ERC-20 token addresses (e.g., USDT, USDC, WOKB on X Layer).
- If any parameter is unconfirmed, explicitly record it as `UNKNOWN` with a note explaining the manual fallback required by the operator.
- Document the fallback mechanism: manual deployment to X Layer + static upload via official TapeOut UI.

---

### PHASE 2: MONOREPO & DEVELOPMENT ENVIRONMENT SCAFFOLD
- Create project structure in `/workspace/bulla`:
  - Root configuration (`package.json`, `.gitignore`, `.env.example`).
  - `contracts/`: Smart contract suite managed with Foundry (preferred) or Hardhat.
  - `web/`: React + Vite + TypeScript frontend.
  - `scripts/`: Local orchestration and deployment script helpers.
- Create `.env.example` containing:
  ```env
  VITE_XLAYER_RPC_URL=https://rpc.xlayer.tech
  VITE_XLAYER_CHAIN_ID=UNKNOWN
  VITE_BULLA_ESCROW_ADDRESS=
  VITE_DEFAULT_TOKEN_ADDRESS=
  PRIVATE_KEY=
  ```
- Install dependencies:
  - Frontend: `vite`, `react`, `react-dom`, `viem`, `wagmi`, `@tanstack/react-query`, `lucide-react`, `clsx`, `tailwind-merge`.
  - Development tools: TailwindCSS, PostCSS, Autoprefixer, TypeScript, Vitest/Playwright for testing.
  - Contracts: OpenZeppelin Contracts (`@openzeppelin/contracts`).

---

### PHASE 3: SMART CONTRACT DEVELOPMENT (`contracts/`)
Implement `BullaEscrow.sol` and supporting contracts in Foundry/Hardhat.

#### 1. Requirements (`BullaEscrow.sol`):
- **Dependencies**: OpenZeppelin `IERC20`, `SafeERC20`, `ReentrancyGuard`, `Ownable`.
- **Constructor**:
  - `feeRecipient` (address)
  - `feeBps` (uint16, default 50 = 0.5%, max 500 = 5%)
- **Data Structures**:
  - `enum InvoiceState { Draft, Funded, Submitted, Released, Refunded, Cancelled }`
  - `struct Invoice`:
    - `uint256 id`
    - `address seller`
    - `address buyer`
    - `address token` (ERC-20 address)
    - `uint256 amount`
    - `uint256 dueTimestamp`
    - `string circuitContainerId`
    - `string deliveryHash` (artifact URI / IPFS hash / deliverable description)
    - `InvoiceState state`
    - `bool sellerCancelRequested`
    - `bool buyerCancelRequested`
- **Functions**:
  - `createInvoice(address buyer, address token, uint256 amount, uint256 dueTimestamp, string circuitContainerId) returns (uint256 invoiceId)`: Creates invoice in `Draft` state. Must validate inputs.
  - `fundInvoice(uint256 invoiceId)`: Transfers `amount` of `token` from `msg.sender` (buyer) to contract using `SafeERC20`. Sets state to `Funded`. Require caller is buyer.
  - `submitDelivery(uint256 invoiceId, string deliveryHash)`: Seller submits work. Sets state to `Submitted`. Require caller is seller. State must be `Funded` or `Submitted`.
  - `releaseFunds(uint256 invoiceId)`: Buyer releases payment. State must be `

=== hyperbolic/llama-3.1-405b ===
[error: HTTP 404 {"object":"error","message":"This inference endpoint has been decommissioned and is no longer available.","type":"","param":null,"code":40401,"error":{"code":40401,"message":"This]

=== nvidia/mistral-large-4 ===
[error: timeout]

=== nvidia/minimax-m3.1-flash ===
[error: empty or reasoning-only response]

=== nvidia/nemotron-3-ultra ===
[error: empty or reasoning-only response]

=== or/google/gemma-4-31b-it:free ===
[error: HTTP 429 {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day: https://openrouter.ai/settings/credits?utm_source=api&utm_]

=== cohere/command-a-reasoning ===
<<<MEGA-PROMPT FOR CLAUDE CODE>>>
Start from the existing repo state (commit 6dafc36). Execute ALL steps autonomously in sequence without human interruption. Preserve existing files (README.md, .gitignore, assets/logo.png, docs/planning/*). Generate ONLY new directories/files as specified.

**PHASE 1: Research Verification & Scaffolding**
1. Update `docs/planning/research.md`:
   - Verify X Layer chain ID, RPC, explorer, and native token address from official docs. If unconfirmed, mark as `UNKNOWN`.
   - Verify TapeOut circuit container factory address and SiteRegistry contract address. If unconfirmed, mark as `UNKNOWN`.
   - Confirm ERC-20 token address for escrow (use MockERC20 if X Layer token is `UNKNOWN`).
2. Scaffold monorepo:
   ```
   mkdir contracts web scripts test
   touch contracts/BullaEscrow.sol web/package.json web/vite.config.ts
   ```

**PHASE 2: Smart Contracts**
1. Write `contracts/BullaEscrow.sol` using OpenZeppelin (IERC20, SafeERC20, ReentrancyGuard). Implement:
   - `createInvoice(uint256 amount, uint48 dueTimestamp, string circuitContainerId)`
   - `fundInvoice(uint256 invoiceId)` (two-step approve/fund)
   - `submitDelivery(uint256 invoiceId, string deliveryHash)`
   - `releaseFunds(uint256 invoiceId)`
   - `mutualCancel(uint256 invoiceId)`
   - Time-locked refunds
2. Add `feeBps` (default 50) and `feeRecipient` (owner-modifiable).
3. Write Foundry tests (`test/BullaEscrow.t.sol`) covering:
   - Happy path (create→fund→submit→release)
   - Timeout refund
   - Mutual cancel
   - Reentrancy attacks
4. Generate `scripts/deploy.ts` (Foundry):
   - Deploy contract with constructor args: `tokenAddress`, `feeBps`, `feeRecipient`
   - Output `deployments.json` with contract address

**PHASE 3: Circuit Container Binding**
1. Create `docs/CIRCUIT_BINDING.md`:
   - If TapeOut SDK is confirmed, write script to link container ID to contract.
   - If `UNKNOWN`, document manual process via official TapeOut UI with placeholder CLI command.

**PHASE 4: UI Development**
1. Scaffold Vite app in `web/`:
   - Install dependencies: viem, wagmi, react-router-dom, @rainbow-me/rainbowkit (OKX Wallet support)
   - Create routes: `/` (landing), `/invoice/:id` (receipt)
2. Implement wallet connection (X Layer network detection).
3. Build invoice flow:
   - Seller: Create invoice → Submit delivery
   - Buyer: Approve → Fund → Release
   - Display warnings: "Unaudited v1" + circuit wallet risk
4. Static export with relative paths.

**PHASE 5: Testing & Deployment**
1. Write e2e tests (`test/e2e.spec.ts`) using Playwright:
   - Local anvil network simulation
   - Testnet workflow (using MockERC20)
2. Create `scripts/testnet-deploy.ts` (dry-run without private key).
3. Generate deployment checklist in `docs/DEPLOY.md`:
   - Confirm RPC endpoints from official docs
   - Verify token addresses
   - Circuit container minting steps

**PHASE 6: Documentation**
1. Update README.md with:
   - Deployment instructions
   - Contract ABI reference
   - Circuit binding process
2. Write `docs/SUBMISSION-DRAFT.md`:
   - Product: Bulla escrow for X Layer
   - Target: Freelancers (cite Bonsai/Remote/IPSE stats)
   - Revenue: Fee split (0.5% default)
   - User retention: Time-locked security
3. Write `docs/DEMO.md` with video script:
   - 0:00-0:30: Problem (late payments)
   - 0:30-1:30: Create/fund invoice demo
   - 1:30-2:30: Delivery submission + refund timeout
   - 2:30-3:00: Mutual cancel + circuit binding

**PHASE 7: Finalize Handoff**
1. Generate `docs/HANDOFF.md` listing:
   - Missing circuit SDK integration (if UNKNOWN)
   - Unsigned testnet/mainnet deployments
   - Demo video recording
   - Google Form submission
2. Run acceptance checklist:
   - [ ] Contracts compile + pass tests
   - [ ] UI builds statically with receipt links
   - [ ] e2e tests pass on local/testnet
   - [ ] All `UNKNOWN` items documented
   - [ ] No private keys committed
>>>

NON-CLAUDE TASKS:
**GROK BOT CAN DO:**
- **Verify official X Layer token address**: Immediately; done when `docs/planning/research.md` confirms token address or marks as `UNKNOWN`.
- **Automate testnet faucet funding**: By 11/18; done when CI script exists to fund test wallets via official faucet (if known).
- **Set up GitHub Actions for tests**: By 11/22; done when PR workflow runs contract/e2e tests on push.
- **Monitor TapeOut SDK releases**: Ongoing; done when SDK confirmation added to `docs/CIRCUIT_BINDING.md`.
- **Generate demo video transcript**: By 11/30; done when `docs/DEMO.md` script is finalized.

**FLUID ONLY:**
- **Mint TapeOut circuit container**: By 11/25; done when container ID is added to `deployments.json`.
- **Sign testnet/mainnet deployments**: By 12/3; done when broadcast files exist in `/broadcast`.
- **Record demo video**: By 12/5; done when 3-minute video uploaded to specified platform.
- **Submit Google Form**: 12/7 23:00 UTC; done when form ID and contract address shared in #submissions.
- **Confirm eligibility with X Layer**: Immediately; done when official event docs confirm Bulla meets criteria.

=== cohere/command-r-plus ===
<<< # Bulla: Milestone Invoicing on X Layer

## Overview
This mega-prompt is designed to guide Claude Code through the development of Bulla, a milestone invoicing application on the X Layer network. The goal is to create a secure and user-friendly platform for freelancers and contractors to manage their invoices and payments, addressing the pain points of late payments and delayed client payments.

## Phase 1: Research Verification and Planning

### Research Verification
- Verify and update the information in docs/planning/research.md with the latest official sources.
- For any information that is unconfirmed or unavailable, use the placeholder "UNKNOWN" and create a task to confirm it later.
- Sources to consult: Official X Layer documentation, whitepapers, and blog posts.
- Focus on the following topics: chain IDs, RPCs, explorers, token addresses, TapeOut factories, SiteRegistry, and CLIs.

### Planning
- Review the existing planning documents in docs/planning/ and update them based on the research findings.
- Create a comprehensive plan for the development process, including the following:
  - Monorepo scaffold
  - Contract design and implementation
  - Test suite and local deployment
  - Testnet deployment scripts
  - Circuit-container binding
  - UI development
  - DeWEB/static build and publish
  - End-to-end testing
  - Documentation and submission materials

## Phase 2: Monorepo Scaffolding

### Monorepo Setup
- Create a new monorepo structure using your preferred tool (e.g., Lerna, Turborepo, or NX).
- Initialize the monorepo with the following packages:
  - contracts: Solidity smart contracts for Bulla
  - web: Frontend application using Vite, React, TypeScript, and viem/wagmi
  - scripts: Deployment and utility scripts
  - docs: Documentation and submission materials
- Ensure the monorepo is initialized with the correct package manager (e.g., Yarn or npm).

### Package Configuration
- Configure each package with the necessary dependencies and scripts:
  - contracts: OpenZeppelin, Foundry/Hardhat, and testing libraries
  - web: Vite, React, TypeScript, viem/wagmi, and testing libraries
  - scripts: Deployment tools and libraries
  - docs: Markdown and static site generator (if needed)
- Set up the monorepo to support cross-package dependencies and build processes.

## Phase 3: Smart Contract Development

### Contract Design
- Design the Bulla smart contract system based on the product requirements:
  - Seller creates an invoice
  - Buyer funds the invoice with ERC-20 tokens
  - Seller submits delivery proof (hash or URI)
  - Buyer releases funds
  - Timeout refund mechanism
  - Mutual cancellation
- Implement the following contracts:
  - BullaInvoice: Main contract for managing invoices
  - MockERC20 (if needed): Mock token contract for local/testnet testing
  - MainnetERC20: Mainnet token contract (constructor-injected address)
- Ensure the contracts follow best practices for security and gas optimization.

### Contract Implementation
- Write the Solidity code for the BullaInvoice contract, including:
  - Constructor: Set feeBps and feeRecipient
  - Functions: createInvoice, fundInvoice, submitDelivery, releaseFunds, mutualCancel
  - Modifiers: onlySeller, onlyBuyer, onlyOwner (for feeRecipient change)
  - Events: InvoiceCreated, InvoiceFunded, DeliverySubmitted, FundsReleased, MutualCancel
- Implement the MockERC20 contract for local/testnet testing (if needed).
- Inject the mainnet token address into the MainnetERC20 contract constructor.

### Contract Testing
- Write comprehensive unit tests for the BullaInvoice contract using Foundry/Hardhat testing frameworks:
  - Test each

=== cf/nemotron-3-120b ===
[error: HTTP 429 {"errors":[{"message":"AiError: AiError: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to contin]

=== or/google/gemma-4-26b-a4b-it:free ===
[error: HTTP 429 {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day: https://openrouter.ai/settings/credits?utm_source=api&utm_]

=== cf/mistral-small-3.1 ===
[error: HTTP 429 {"errors":[{"message":"AiError: AiError: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to contin]

=== or/nvidia/nemotron-3.5-super-vl:free ===
[error: HTTP 429 {"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day: https://openrouter.ai/settings/credits?utm_source=api&utm_]

=== cf/qwen3.8-27b ===
[error: HTTP 429 {"errors":[{"message":"AiError: AiError: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to contin]

=== or/inclusionai/ling-3.2-flash:free ===
[error: fan-out timeout]

=== or/openrouter/free ===
[error: fan-out timeout]

[fan-out 160.0s | 10 ok / 3 timed out / 12 rate-limited / 5 error | models=30]
[failed: or/nvidia/nemotron-3-ultra-550b-a55b:free (rate-limited), or/nvidia/nemotron-3.5-lightning:free (rate-limited), or/baidu/ernie-5.5-flash-preview:free (rate-limited), cf/gpt-oss-120b (rate-limited), cf/llama-3.3-70b (rate-limited), cf/llama-4-scout (rate-limited), kilo/glyph-cluster (error), kilo/ernie-5.5-flash (error), hyperbolic/llama-3.1-405b (error), nvidia/mistral-large-4 (timed out), nvidia/minimax-m3.1-flash (error), nvidia/nemotron-3-ultra (error), or/google/gemma-4-31b-it:free (rate-limited), cf/nemotron-3-120b (rate-limited), or/google/gemma-4-26b-a4b-it:free (rate-limited), cf/mistral-small-3.1 (rate-limited), or/nvidia/nemotron-3.5-super-vl:free (rate-limited), cf/qwen3.8-27b (rate-limited), or/inclusionai/ling-3.2-flash:free (timed out), or/openrouter/free (timed out)]
[reserves launched: or/google/gemma-4-31b-it:free, cohere/command-a-reasoning, cohere/command-r-plus, cf/nemotron-3-120b, or/google/gemma-4-26b-a4b-it:free, cf/mistral-small-3.1, or/nvidia/nemotron-3.5-super-vl:free, cf/qwen3.8-27b, or/inclusionai/ling-3.2-flash:free, or/openrouter/free | target 10/12]

=== DISTILLED (via ovh/qwen3.5-397b, 25.8s) ===
# Consensus
- All models attempted to produce a mega-prompt structure with phased development (research → scaffold → contracts → UI → tests → docs). Supported by: cohere/command-a-plus, cohere/command-a, ovh/gpt-oss-120b, ovh/qwen3.5-397b, ovh/mistral-small-3.2, ovh/qwen2.5-vl-72b, pollinations/openai-fast, gemini-3.5-flash, cohere/command-a-reasoning, cohere/command-r-plus.
- All models acknowledged the hard rules about not inventing chain IDs, token addresses, or SDKs, and using UNKNOWN placeholders. Supported by: all 10 models.
- All models recognized the need for Foundry contracts + Vite/React UI stack. Supported by: all 10 models.
- Only 2 models (ovh/gpt-oss-120b, cohere/command-a-reasoning) produced both required artifacts: the mega-prompt AND the NON-CLAUDE TASKS split.

# Disagreements
- **Mega-prompt detail level**: ovh/qwen3.5-397b and ovh/gpt-oss-120b provided highly detailed component-level UI specs; cohere/command-a-reasoning provided condensed phase summaries. 
- **NON-CLAUDE TASKS structure**: ovh/gpt-oss-120b included specific done-criteria with timestamps; cohere/command-a-reasoning had briefer task descriptions without clear completion criteria.
- **Contract naming**: ovh/qwen3.5-397b used "Bulla.sol"; gemini-3.5-flash used "BullaEscrow.sol"; cohere/command-r-plus used "BullaInvoice.sol".

# Unique angles
- **ovh/gpt-oss-120b**: Included explicit acceptance checklist table with 11 verifiable commands before stopping.
- **cohere/command-a-reasoning**: Only model to complete both artifacts (mega-prompt + NON-CLAUDE TASKS) without mid-sentence truncation in the tasks section.
- **ovh/qwen3.5-397b**: Most detailed UI component breakdown (8 specific components with function specs).

# Flagged claims
- **pollinations/openai-fast**: Invented API endpoints (`https://docs.xlayerhq.com/api/chain-ids.json`) not confirmed in original requirements—violates "official docs only" rule.
- **cohere/command-a-plus**: Truncated mid-sentence in mega-prompt, leaving hard rules incomplete.
- **All models except 2**: Failed to produce the complete NON-CLAUDE TASKS artifact as required.
- **ovh/gpt-oss-120b**: NON-CLAUDE TASKS section truncated mid-sentence at "// Google Form URL: UNKNOWN".

# Recommendation + confidence
**Recommendation**: Use cohere/command-a-reasoning as the base, supplementing with ovh/gpt-oss-120b's acceptance checklist and ovh/qwen3.5-397b's UI component specs.  
**Confidence**: Low — 8 of 10 models produced incomplete outputs, indicating systemic issues with prompt length constraints or model capacity for this task complexity.

[total 185.8s]
