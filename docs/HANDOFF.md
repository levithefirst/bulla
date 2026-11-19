# Bulla handoff: what is not done

Written 14 Nov 2026 at the end of the autonomous build, updated the same day after the step 1 probes, and updated 18 Nov 2026 for **BullaEscrow v2** (circuit-bound billing, 1 to 10 milestones, optional arbiter, container payout). Deadline: 7 Dec 2026, 23:59 UTC. Step 1 research is recorded below. Nothing here was signed, deployed, minted, published, funded, recorded as a demo, or submitted. `docs/handoff/phase-1.md` is superseded by this build (its scaffold now exists).

## v2 changes (18 Nov 2026)

- **The contract changed; redeploy everything.** A superseded v1 escrow exists on mainnet (`docs/planning/mainnet-budget.md`); ignore it, do not link it. v2 has a different ABI and constructor.
- **Review fixes, 18 Nov 2026 (ABI change): redeploy testnet.** `fundInvoice` now clears cancel consent given on the draft, `revokeCancelConsent(id)` is new, and `circuitStats` counts funded invoices only (field renamed `fundedInvoices`). The testnet contracts deployed earlier the same day (commit `1eef3e2`) predate this and do not match the web ABI: re-run `deploy:judge` then `deploy:testnet`, commit `deployments.json`, rebuild and re-host the judge site.
- **New constructor:** `BullaEscrow(token, opener, factory, feeRecipient, feeBps, initialOwner)`. `opener` and `factory` are TapeOut's, immutable.

| Chain | token | opener | factory | Who supplies them |
| --- | --- | --- | --- | --- |
| X Layer mainnet (196) | USDC `0xB6CEceAB302E2E4948951eE7843FC24E92933061` | `0x536adD8F30f03b69f6fbF29d425A816A0dC50106` (real) | `0x1f09DAeFA827f02CBb40967cc91b259763760761` (real) | hard-coded in `deploy-xlayer.ts`; any `TAPEOUT_*` override is refused; the web build and `deployments.json` validation refuse anything else on 196 |
| X Layer testnet (1952), judge | DemoUSD (deployed by `deploy:judge`) | `MockOpener` stand-in | `MockTapeOutFactory` stand-in | `deploy:judge` deploys them (plus `MockProcessor`), labelled "testnet stand-in for TapeOut" in the UI, because TapeOut has no published testnet deployment |
| X Layer testnet (1952), real token | testnet USDC `0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3` | judge stand-in opener (or `TAPEOUT_OPENER`) | judge stand-in factory (or `TAPEOUT_FACTORY`) | run `deploy:judge` first |
| Local Hardhat | MockUSDC | stand-in | stand-in | `npm run deploy:local` / the E2E stack |

`feeBps` is 50 and `initialOwner` is the deployer on every chain.

## Links

List both everywhere, demo first:

- **One-tap demo (testnet), no wallet, about 15 s:** https://try-usebulla.vercel.app
- **App (mainnet, real USDC):** https://usebulla.vercel.app ; receipt of mainnet demo invoice #1: https://usebulla.vercel.app/#/invoice/1
- **DeWEB (secondary mirror):** https://1-2-397.tapekit.org/ ; same receipt: https://1-2-397.tapekit.org/#/invoice/1

If the submission form has only one URL field, put https://usebulla.vercel.app there and lead the description with the demo link.

- **Container payout facts** (verified on chain by Grok Bot, `docs/research.md` §9, source `docs/planning/win-audit/onchain-checks.md`): the container must be **opened** (`opener.isOpened`; open it in the official app, `open()` costs 0.08 OKB) or it reverts `NotPaid()`. An opened container withdraws with ERC-6551 `execute(to, value, data, 0)` (selector `0x51945447`; operation 1 reverts `OnlyCall()`), called by the circuit holder with `EXEC_FEE()` attached as `msg.value` (0.0013 OKB read on 18 Nov 2026; always read it live) or it reverts `ProtocolFeeTooLow`. v2 therefore keeps "Pay into my TapeOut container" opt-in and pays the holder whenever the container is not opened. The receipt shows a "How to withdraw from your container" note (execute with `EXEC_FEE`, or the official https://www.tapeout.net/containers UI). A USDC withdrawal through `execute` was not simulated end to end: **UNKNOWN** until the first real withdrawal.
- **The public X Layer RPC rejects `eth_getLogs`.** The "On-chain activity" panel reads the on-chain `circuitStats` view instead; timeline tx links stay best effort.
- **TapeSend** hub is live on X Layer (proxy `0xe61A9C7213a6Aa616C246a2B569e555B417b25ee`, implementation `0xdCC57797089eBD9f26e686379A4323f353a3F9C6`, per `onchain-checks.md`) but out of scope for v2; the seam is `web/src/lib/notify.ts`.
- **Judge-mode speed (web only):** transactions are pipelined with local nonces, explicit gas and gas price (price +20%, no estimate calls), and 200 ms receipt polling. Dependent chain: gas tops, circuit, open + create, fund, submit x2, release x2 (6 blocks). Mint and approve go out beside the circuit mint, and fund is broadcast the moment the create receipt arrives. Timing with a local node on 1 s blocks: `E2E_BLOCK_MS=1000 JUDGE_MAX_MS=15000 npm run e2e` (5.7 s in-app, was 7.2 s sequential). The live testnet figure is not yet measured after this change; the previous live run took 45 to 54 s.
- **v2 checks, 18 Nov 2026:** `npm test` 57 passing; `npm run e2e` 10 passing; judge mode 12 transactions, 664 ms in-app and 982 ms from the tap to Released on a local node (limit 10 s); Slither 0 high, 0 medium, 4 low, 1 informational. Testnet timing is still not measured.

What was done and verified at v1 (Claude Code run, 14 Nov 2026, kept for history): `npm run compile`; `npm test` (50 passing: 30 unit, 8 fuzz/invariant, 5 TapeOut-name resolver, 5 deployments wiring incl. the judge block, 2 DemoUSD); `npm run check:contrast` (all pairings pass, light and dark); `npm run build`; `npm run e2e` (9 passing on a local Hardhat node, including `e2e/judge-mode.spec.ts`: one tap from the landing page to Released in **387 ms in-app / 923 ms wall clock**, limit 10 s; empty gas tank shows a clear message and sends nothing; the own-wallet path still works); `npm run e2e:testnet` skips cleanly without its env; `npm run deweb:package` (12 files, ~470 KB, no judge code, no key); `npm run screenshots` (16 PNGs incl. judge mode). Deploy scripts (`deploy:testnet`, `deploy:mainnet`, `deploy:judge`) were run only without a key and refused. Nothing was broadcast to any real network. `npm run release:check` correctly fails today.

Build environment limits that caused some of the items below: the original Claude Code sandbox could not reach X Layer RPCs (`rpc.xlayer.tech`, `testrpc.xlayer.tech` were refused by the sandbox egress proxy), could not download the Foundry installer or native solc (so the repo uses Hardhat + the `solc` npm package), and has no wallet. Step 1 probes and official-source lookups were later run from a machine that can reach those RPCs (14 Nov 2026, Africa/Lagos). A Slither run is recorded in `docs/slither.md`.

## Ordered list

### 1. Re-verify the UNKNOWNs (done 14 Nov 2026, Africa/Lagos, except the live click of a testnet tx)

From `docs/research.md` §6. Outputs and sources are pasted there.

| Item | How | Status |
| --- | --- | --- |
| USDC `symbol()`/`decimals()` on X Layer mainnet and testnet | `X_LAYER_RPC=https://rpc.xlayer.tech X_LAYER_CHAIN_ID=196 ESCROW_TOKEN=0xB6CEceAB302E2E4948951eE7843FC24E92933061 npm run probe:network` (and testnet with `0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3`, chain 1952, `https://testrpc.xlayer.tech/terigon`) | **Done.** Mainnet block 75907725 and testnet block 46217923 both printed `name=USDC`, `symbol=USDC`, `decimals=6`. Mainnet token gate passed. |
| TapeOut contracts have code on X Layer | `X_LAYER_RPC=https://rpc.xlayer.tech npm run probe:tapeout` | **Done.** factory, opener, siteRegistry, and domainBinding all `code OK`. `processors 419`, `cpuAt(0) 0x839bdD6fa7A66416A609A735e11DE5411B98574e`, `monthlyFee 0 wei (native OKB) per 30 days`. A first `monthlyFee` call failed on a bad EIP-55 checksum in the probe (`...fb343aa57...`); fixed to `0x68809Fd2fb343aA57D0aeB7f33Defe477c9666f9`. |
| Explorer `/tx/<hash>` path | official explorer redirect, plus a click after the first testnet tx | **Path confirmed.** `https://www.okx.com/web3/explorer/xlayer/tx/<hash>` 301s to `https://web3.okx.com/explorer/xlayer/tx/<same hash>` (sample mainnet tx `0x8cf2bf1158e08d7f2f2aec48b81065c18b577b729c6a297efa7ce8aeea545a11`). The rendered page was behind Cloudflare here; still click a link in the app after the first testnet tx. |
| Official TapeOut mint / open-container UI on X Layer | official TapeOut site | **Done.** Mint/tape-out: https://www.tapeout.net/canvas . Open container: https://www.tapeout.net/containers . Official app ABI: `open(address circuits, uint256 tokenId) payable returns (address)`, `FEE() view returns (uint256)`. Fab X (https://fabx.tech/en/canvas) is a community miner, not the official app. |
| HashPort X Layer support | https://www.hashport.ai/ and https://www.hashport.ai/app | **No.** Official pages are BNB Chain only ("Store your dapp frontend on BNB Chain", "No other network"). X Layer publish fallback: direct `SiteRegistry` calls on chain 196. |
| X Layer gateway hostname | official TapeKit `kernel/src/name.js` and `sw-gateway/boot.js` | **Done.** Format `https://<id>-2-<cpu>.tapekit.org/` (example `https://1-2-344.tapekit.org/` for `1.2.344.tape`). Shortcut `https://tapekit.org/?open=<name>`. Confirm the live URL after publish. |
| TapeOut on X Layer testnet | TapeKit `kernel/src/config.js` and repo file list | Still **UNKNOWN**. No 1952 addresses published. Fixture id remains correct for testnet. |
| Official Google Form URL | https://web3.okx.com/xlayer/build-x-series (HTML `href`, record only, not submitted) | **Recorded.** https://forms.gle/EoDNbxQ65dev1wFd9 (redirects to https://docs.google.com/forms/d/e/1FAIpQLScyVnDmyzxRyBxszLUWbwV5kVbpmZJ3JS6oyOxqjALRvhR1kg/viewform?usp=send_form). Form view required a Google account from this machine; not submitted. |

### 2. Wallets and gas (human)

- Create dedicated self-custodial wallets: **deployer**, **fee recipient**, **circuit holder / seller**, **demo buyer**. Never paste a seed into chat or the repo.
- Fund with OKB for gas on X Layer testnet and mainnet, and USDC for the demo buyer (about 30 USDC is enough).
- Done: balances visible in the explorer for each address. Placeholders: `<<DEPLOYER_ADDRESS>>`, `<<FEE_RECIPIENT_ADDRESS>>`, `<<SELLER_ADDRESS>>`, `<<BUYER_ADDRESS>>`.

### 3. Testnet deploy (human, signed)

Run step 3b's `deploy:judge` first: the real-token testnet escrow binds to the TapeOut stand-ins it deploys.

```bash
cp .env.example .env   # then set DEPLOYER_PRIVATE_KEY locally, FEE_RECIPIENT, ESCROW_TOKEN
FEE_RECIPIENT=<<FEE_RECIPIENT_ADDRESS>> npm run deploy:judge     # step 3b.1
ESCROW_TOKEN=0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3 FEE_RECIPIENT=<<FEE_RECIPIENT_ADDRESS>> npm run deploy:testnet
# -> BullaEscrow(testnet USDC, judge stand-in opener, judge stand-in factory, FEE_RECIPIENT, 50, deployer)
```

Done: `contracts/deployments.json` `xlayerTestnet.escrow` is set; `ESCROW_ADDRESS=<addr> npm run probe:network` says `has code`; one full invoice run on testnet through the UI (`VITE_BULLA_NETWORK=xlayerTestnet npm run dev`). Commit `deployments.json`. Placeholder: `<<ESCROW_ADDRESS_TESTNET>>`.

### 3b. Judge mode on X Layer testnet (Grok Bot, testnet only)

Judge mode is the one-tap demo on the landing page ("Try it now"): two burner keys created in the visitor's browser run mint, create, fund (lock), submit and release on X Layer testnet with valueless DemoUSD. Owner: **Grok Bot**. See also `docs/SUBMISSION-CHECKLIST.md` items 1 to 4.

1. **Deploy** the TapeOut stand-ins (`MockTapeOutFactory`, `MockOpener`, `MockProcessor`), DemoUSD and the judge escrow `BullaEscrow(DemoUSD, stand-in opener, stand-in factory, FEE_RECIPIENT, 50, deployer)` with a testnet-only deployer key: `FEE_RECIPIENT=<<FEE_RECIPIENT_ADDRESS>> npm run deploy:judge` (refuses any network but `xlayerTestnet`; the stand-in deployer refuses chain 196). Commit the `xlayerTestnet.judge` block (with `judge.tapeout`) it writes to `contracts/deployments.json`.
2. **Gas tank:** create a dedicated throwaway key used for nothing else. Fund it from the official faucet https://web3.okx.com/xlayer/faucet (0.2 OKB per user per day per the X Layer docs). Each judge run tops each burner up to 1.2M gas × gas price, and a run is refused if it would exceed the per-run cap (`VITE_DEMO_RUN_CAP_WEI`, default 3M gas × gas price); the judge page shows the tank balance and runs left, so check the tank on the testnet explorer before demos and top up daily if needed. **Never commit the key.**
3. **Important caveat:** the tank key is passed at build time as `VITE_DEMO_GAS_TANK_KEY` and is therefore embedded in the hosted judge build's JavaScript. Anyone who reads the bundle can spend the tank. That is acceptable only because it is a testnet key holding a few faucet OKB. Keep the balance small, never reuse the key, and **rotate it** (new key, re-fund, rebuild, re-host) if it is drained or after the event. Mainnet builds refuse to compile with the variable set, and `deweb:package` scans for it.
4. **Build and host** the judge site: `VITE_BULLA_NETWORK=xlayerTestnet VITE_DEMO_GAS_TANK_KEY=… npm run build`, upload `web/dist/` to an HTTPS static host (Fluid's account). Then set `VITE_JUDGE_URL=<that URL>` for the mainnet/DeWEB build so its "Try it now" links there. Hosted: `https://try-usebulla.vercel.app` (Vercel static upload, no repo link), so `VITE_JUDGE_URL=https://try-usebulla.vercel.app`.
5. **Acceptance on testnet:** `E2E_TESTNET=1 VITE_DEMO_GAS_TANK_KEY=… npm run e2e:testnet`. It requires all 12 steps to link to `https://www.okx.com/web3/explorer/xlayer-test/tx/…` and finish within 60 s (`JUDGE_MAX_MS` to change), and prints the measured time; paste it into the checklist. This could not run in the build sandbox (X Layer RPCs blocked there), so testnet timing is **not yet measured**.
6. Done looks like: one tap on the hosted judge URL reaches Released, each step's OKX explorer link opens, and an empty tank shows "Demo gas tank empty" rather than a fake success.

### 4. Mainnet deploy of v2 (human, signed, after step 1 token gate)

```bash
ESCROW_TOKEN=0xB6CEceAB302E2E4948951eE7843FC24E92933061 FEE_RECIPIENT=<<FEE_RECIPIENT_ADDRESS>> \
CONFIRM_MAINNET=I_UNDERSTAND_UNAUDITED npm run deploy:mainnet
# -> BullaEscrow(USDC, 0x536adD8F30f03b69f6fbF29d425A816A0dC50106, 0x1f09DAeFA827f02CBb40967cc91b259763760761, FEE_RECIPIENT, 50, deployer)
```

The script writes `xlayerMainnet.escrow` and the official `tapeout` binding; it refuses `TAPEOUT_*` overrides on mainnet. No mock is ever deployed on 196.

Optionally verify the source on the OKX explorer (docs: https://web3.okx.com/onchainos/dev-docs/xlayer/developer/verify-a-smart-contract/verifying-contract). **Done 18 Nov 2026 (Grok Bot, ops wallet):** v2 escrow `0x35a7862e64b60857aDd42a8B8621DB8d9b4B5E07`, tx `0x2f9049d5cfc78ac28342eacef488ed9889f8fb90bd8d9e9a55425ce6cee94f67`, block 76238200, fee recipient and owner `0x00f9b7a48F4B3eCdcc8288C2295E59132143B3b0`, 50 bps. Source verified on Sourcify (exact match): https://repo.sourcify.dev/196/0x35a7862e64b60857aDd42a8B8621DB8d9b4B5E07 . OKLink verification not done (its API needs a key).

### 5. TapeOut circuit and container (human, signed)

Follow `docs/tapeout-binding.md`. **Open the container** in the official app (https://www.tapeout.net/containers, 0.08 OKB) if invoices should pay into it; until then releases go to the holder. Done: `npm run probe:tapeout` with `TAPEOUT_PROCESSOR`/`TAPEOUT_CIRCUIT_ID` prints `opened true` and `holder` = the circuit-holder wallet. **Done 18 Nov 2026 (Grok Bot, by script, ops wallet `0x00f9b7a48F4B3eCdcc8288C2295E59132143B3b0`):**

| Field | Value |
| --- | --- |
| Processor | cpu #397 "Tapee", `0x34fd3c870DEd61b264e3E7062163EA4539F79998` (transistors `0xE19f6F9d10e85a1EF2F3aa753F65EF24bCe2018A`, native OKB pricing, mint price 0) |
| Circuit | **#1** on Tapee (1 in, 1 out, 2 NAND buffer), holder = ops wallet |
| Container | `0x52D7504EFDF73EcdCE91411B77e154CEe353241e`, **opened** (`isOpened = true`), `token() = (196, Tapee, 1)`, `owner()` = ops wallet, `EXEC_FEE()` = 0.0013 OKB |
| Mint 2 NAND | `0x739ceb2cf1407c38cec7b248730a425d16c716f3d3f702ce422b66f465a50d5b` |
| Tape out | `0xa19c5245b28194fb9477a2ae498ea6ff6c78a1bae1479e7675708ce2c11f6c37` |
| Open container | `0x87672d904015bbdcc6a9cc3a505bc27d489033cd34869078df2a6056fefd5f2a` |

`npm run probe:tapeout` with `TAPEOUT_PROCESSOR=0x34fd3c870DEd61b264e3E7062163EA4539F79998 TAPEOUT_CIRCUIT_ID=1` prints `opened true` and the ops wallet as holder. A `createInvoice` eth_call on the mainnet escrow with this circuit and `payToContainer = true` succeeds. Details and costs: `docs/planning/mainnet-budget.md` "Spent so far".

### 6. DeWEB publish

**Done (Grok Bot, 18 Nov 2026, ops wallet).** Package `0xc84f1bd1971b61a014e3e682dce6b4147ea8a663c9795b9f4c63ab29c404bcc6` (12 files, 504,497 bytes, 26 chunks) uploaded to container `0x52D7504EFDF73EcdCE91411B77e154CEe353241e` with `scripts/deweb-publish.mjs`: 26 `putFile`/`appendChunk` txs plus `setFallback("index.html")`, every tx simulated first, log in `deweb-out/publish-log.json` (gitignored). ABI: Sourcify exact match of the BNB SiteRegistry impl; the X Layer proxy points at the TapeKit-pinned impl `0xa85c4143…`, whose bytecode contains every selector used. All 12 files read back byte-for-byte (`read()` SHA-256 equals the manifest).

The gateway refused to show the site until the name was paid, so `scripts/deweb-bind.mjs` called `DomainBinding.bind("1.2.397.tape", container, 120)` (impl `0x5ebf29b8…` pinned in TapeKit `kernel/src/config.js`; `monthlyFee` re-read as 0, so value 0): tx `0x412e41140339d1d180ffa994320ced33899235e50ad1c18ac0a391693ef14b9e`, `isLive` true, container paid until 26 Sep 2036.

Cost: 0.002770333 OKB for the upload (27 txs, about 115M gas at 0.024 gwei) plus 0.000004452 OKB for the bind. Live as a secondary mirror: https://1-2-397.tapekit.org/ and https://1-2-397.tapekit.org/#/invoice/1 (headless check: invoice #1 Released, both milestones Released, 0.995 USDC to the container).

`web/src/deweb.json` is filled and the HTTPS mirror rebuilt with it. The DeWEB copy is the build from before that edit, so its footer still says "not published yet"; republishing only the changed JS (`node scripts/deweb-publish.mjs send` after `npm run deweb:package`) would fix that for roughly 0.0013 OKB. Not done, to keep to a single pass.

### 7. HTTPS mirror

**Done.** App (mainnet, real USDC): https://usebulla.vercel.app (Vercel static upload of the mainnet build, no repo link, no gas tank key, `.vercelignore` blocks `.env*`). Receipt: https://usebulla.vercel.app/#/invoice/1.

### 8. Demo invoices on mainnet (human, signed, real funds)

One milestone invoice created with the real circuit and "Pay into my TapeOut container" on, with at least one milestone **Released** into the opened container (receipt and explorer shot for the form and the video; note the release tx hash) and one Funded invoice with a short due date for the refund shot. Done: both receipts open on the gateway. Placeholder: `<<DEMO_INVOICE_ID>>`.

**Done 18 Nov 2026 (Grok Bot):** invoice **#1** on escrow `0x35a7862e64b60857aDd42a8B8621DB8d9b4B5E07`, 2 x 0.50 USDC, both milestones released into the opened container (0.995 USDC, fee 0.005 USDC). Release tx for the explorer shot: `0x910a5e2f8c2731339518f99b594bcf96935eefe0e2d696038b08a36726c3b15c` (milestone 0), `0x81a14d46c4dc0dd1a1d648fd46fe86b441cbbae91af5c3a55b9503421c2b993e` (milestone 1). Buyer wallet `0x8888a1022F062158E563d32b4CCA1501B95Fe5fB` (box key, never committed). The receipt page is `#/invoice/1` on the **mainnet** app: https://usebulla.vercel.app/#/invoice/1 (DeWEB secondary mirror: https://1-2-397.tapekit.org/#/invoice/1). Full tx table: `docs/research.md` section 10.

### 9. Demo video (human)

Script and exact clicks in `docs/DEMO.md`. Done: ≤ 3:00 video uploaded, link in the draft. Placeholder: `<<VIDEO_URL>>`.

### 10. Fill and submit the form (human only)

Replace every `<<…>>` in `docs/SUBMISSION-DRAFT.md` and run `npm run release:check` until it passes, then submit the Google Form from https://web3.okx.com/xlayer/build-x-series before 7 Dec 2026 23:59 UTC. Confirm eligibility (age of majority, not a restricted person). Done: form confirmation saved. An assistant must not submit as the user.

### 11. Check the new receipt features on a live chain (human or assistant with RPC access)

The build sandbox cannot reach X Layer RPCs, so these were verified only against a local chain and mocks:

- **Seller TapeOut name on receipts** (`<#ID>.2.<cpu>.tape`). Resolved in `shared/tapeoutCore.ts` from `container.token()`, `factory.isCPU/cpuCount/cpuAt` and `opener.accountOf`, using only the X Layer addresses in `docs/research.md`; hidden when any check fails. Tested with mocks installed at those exact addresses. Done looks like: a mainnet receipt bound to your real container shows the same name `probe:tapeout` prints. With 419 processors the scan is about 9 batched JSON-RPC requests; if the public RPC rate-limits it, the field simply stays hidden.
- **Deploy wiring.** After step 3 or 4, `contracts/deployments.json` is written in the schema `web/src/config.ts` reads (`shared/deployments.ts`, tested). Done looks like: `VITE_BULLA_NETWORK=xlayerTestnet npm run build` shows the escrow address in the footer with no code change.
- **Screenshots** in `docs/screenshots/` show "Localhost (Hardhat)" and mock USDC. Optionally re-shoot against testnet after step 3 for the submission.

### 11b. Submission checklist

`docs/SUBMISSION-CHECKLIST.md` lists every remaining item with an owner (Claude, Grok Bot, Fluid) and dates up to the internal deadline of **6 Dec 2026, 23:59 UTC**. Promo drafts in `docs/promo/PROMO-DRAFTS.md` are marked "draft, needs Fluid's OK"; nothing goes public without Fluid's OK.

### 12. Nice to have before Demo Day (assistant can do)

- Independent review or audit of `BullaEscrow`. Slither: first run 0 high / 1 medium / 5 low; the medium (enum strict equality, a false positive) was removed by a range check and the re-run is 0 high / 0 medium / 4 low (`docs/slither.md`). The contract also gained full NatSpec, `TransferShortfall`, `EscrowConfigured`, `totalHeld` accounting and an overflow-safe `mulDiv` fee, with seeded fuzz/invariant tests (`docs/contracts.md`).
- Further bundle cuts if upload gas matters: swapping React for Preact (compat) would save roughly another 120 KB; replacing `@tanstack/react-query` with small hooks about 35 KB. Not done, to avoid a framework change this close to the deadline.
- Foundry port of the tests if Foundry becomes installable (optional; Hardhat is the chosen toolchain).
- Find an official OKX developer page for the `window.okxwallet` provider name (research §7 marks it UNKNOWN-official; the generic browser-wallet connector covers OKX Wallet anyway).
- Judge mode on testnet uses TapeOut stand-ins because TapeOut has no published testnet deployment; if one appears, redeploy the judge escrow with the real testnet opener and factory.
- First real container withdrawal: **done 18 Nov 2026.** `execute(USDC, 0, transfer(ops, 995000), 0)` with `EXEC_FEE()` (0.0013 OKB) from the circuit holder moved 0.995 USDC out of container `0x52D7504EFDF73EcdCE91411B77e154CEe353241e`: tx `0x027e5a9b748e7a877ffb728f7c6ce5b61f4a12225d5b048d1ad934ac5417123f`. Recorded in `docs/research.md` section 10.

## Secrets check

No keys, seeds, `.env`, or wallet files are committed. `e2e/.keys.json` (random throwaway keys used only on a local Hardhat node) is gitignored and stays on the build machine.
