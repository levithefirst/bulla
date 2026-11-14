# Bulla handoff: what is not done

Written 14 Nov 2026 at the end of the autonomous build, and updated the same day after the step 1 probes. Deadline: 7 Dec 2026, 23:59 UTC. Step 1 research is recorded below. Nothing here was signed, deployed, minted, published, funded, recorded as a demo, or submitted. `docs/handoff/phase-1.md` is superseded by this build (its scaffold now exists).

What is done and verified (latest Claude Code run, 14 Nov 2026): `npm run compile`; `npm test` (50 passing: 30 unit, 8 fuzz/invariant, 5 TapeOut-name resolver, 5 deployments wiring incl. the judge block, 2 DemoUSD); `npm run check:contrast` (all pairings pass, light and dark); `npm run build`; `npm run e2e` (9 passing on a local Hardhat node, including `e2e/judge-mode.spec.ts`: one tap from the landing page to Released in **387 ms in-app / 923 ms wall clock**, limit 10 s; empty gas tank shows a clear message and sends nothing; the own-wallet path still works); `npm run e2e:testnet` skips cleanly without its env; `npm run deweb:package` (12 files, ~470 KB, no judge code, no key); `npm run screenshots` (16 PNGs incl. judge mode). Deploy scripts (`deploy:testnet`, `deploy:mainnet`, `deploy:judge`) were run only without a key and refused. Nothing was broadcast to any real network. `npm run release:check` correctly fails today.

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

```bash
cp .env.example .env   # then set DEPLOYER_PRIVATE_KEY locally, FEE_RECIPIENT, ESCROW_TOKEN
ESCROW_TOKEN=0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3 FEE_RECIPIENT=<<FEE_RECIPIENT_ADDRESS>> npm run deploy:testnet
```

Done: `contracts/deployments.json` `xlayerTestnet.escrow` is set; `ESCROW_ADDRESS=<addr> npm run probe:network` says `has code`; one full invoice run on testnet through the UI (`VITE_BULLA_NETWORK=xlayerTestnet npm run dev`). Commit `deployments.json`. Placeholder: `<<ESCROW_ADDRESS_TESTNET>>`.

### 3b. Judge mode on X Layer testnet (Grok Bot, testnet only)

Judge mode is the one-tap demo on the landing page ("Try it now"): two burner keys created in the visitor's browser run mint, create, fund (lock), submit and release on X Layer testnet with valueless DemoUSD. Owner: **Grok Bot**. See also `docs/SUBMISSION-CHECKLIST.md` items 1 to 4.

1. **Deploy** DemoUSD + the judge escrow with a testnet-only deployer key: `FEE_RECIPIENT=<<FEE_RECIPIENT_ADDRESS>> npm run deploy:judge` (refuses any network but `xlayerTestnet`). Commit the `xlayerTestnet.judge` block it writes to `contracts/deployments.json`.
2. **Gas tank:** create a dedicated throwaway key used for nothing else. Fund it from the official faucet https://web3.okx.com/xlayer/faucet (0.2 OKB per user per day per the X Layer docs). Each judge run tops each burner up to about 700k gas × gas price × 2, so check the tank on the testnet explorer before demos and top up daily if needed. **Never commit the key.**
3. **Important caveat:** the tank key is passed at build time as `VITE_DEMO_GAS_TANK_KEY` and is therefore embedded in the hosted judge build's JavaScript. Anyone who reads the bundle can spend the tank. That is acceptable only because it is a testnet key holding a few faucet OKB. Keep the balance small, never reuse the key, and **rotate it** (new key, re-fund, rebuild, re-host) if it is drained or after the event. Mainnet builds refuse to compile with the variable set, and `deweb:package` scans for it.
4. **Build and host** the judge site: `VITE_BULLA_NETWORK=xlayerTestnet VITE_DEMO_GAS_TANK_KEY=… npm run build`, upload `web/dist/` to an HTTPS static host (Fluid's account). Then set `VITE_JUDGE_URL=<that URL>` for the mainnet/DeWEB build so its "Try it now" links there. Placeholder: `<<JUDGE_URL>>`.
5. **Acceptance on testnet:** `E2E_TESTNET=1 VITE_DEMO_GAS_TANK_KEY=… npm run e2e:testnet`. It requires all 8 steps to link to `https://www.okx.com/web3/explorer/xlayer-test/tx/…` and finish within 60 s (`JUDGE_MAX_MS` to change), and prints the measured time; paste it into the checklist. This could not run in the build sandbox (X Layer RPCs blocked there), so testnet timing is **not yet measured**.
6. Done looks like: one tap on the hosted judge URL reaches Released, each step's OKX explorer link opens, and an empty tank shows "Demo gas tank empty" rather than a fake success.

### 4. Mainnet deploy (human, signed, after step 1 token gate)

```bash
ESCROW_TOKEN=0xB6CEceAB302E2E4948951eE7843FC24E92933061 FEE_RECIPIENT=<<FEE_RECIPIENT_ADDRESS>> \
CONFIRM_MAINNET=I_UNDERSTAND_UNAUDITED npm run deploy:mainnet
```

Optionally verify the source on the OKX explorer (docs: https://web3.okx.com/onchainos/dev-docs/xlayer/developer/verify-a-smart-contract/verifying-contract). Done: `xlayerMainnet.escrow` set and committed; explorer shows the contract. Placeholder: `<<ESCROW_ADDRESS_MAINNET>>`.

### 5. TapeOut circuit and container (human, signed)

Follow `docs/tapeout-binding.md`. Done: `npm run probe:tapeout` with `TAPEOUT_PROCESSOR`/`TAPEOUT_CIRCUIT_ID` prints `opened true` and `holder` = the circuit-holder wallet. Placeholders: `<<TAPEOUT_PROCESSOR_ADDRESS>>`, `<<PROCESSOR_NUMBER>>`, `<<CIRCUIT_ID>>`, `<<CONTAINER_ADDRESS>>`.

### 6. DeWEB publish (human, signed)

Follow `docs/deweb.md`: `npm run deweb:package` after the mainnet deploy, upload `deweb-out/site/` to the container (HashPort or direct SiteRegistry calls), activate the name if required, check the gateway status page. Then fill `web/src/deweb.json`, rebuild, re-upload changed files. Done: the gateway URL opens the app, `#/invoice/<id>` shows a mainnet receipt with no wallet, status page says every file verified. Placeholders: `<<DEWEB_GATEWAY_URL>>`, `<<SITE_MANIFEST_SHA256>>`.

### 7. HTTPS mirror (optional, human)

Checklist in `docs/deweb.md`. Done: mirror shows the same receipt. Placeholder: `<<HTTPS_MIRROR_URL>>`.

### 8. Demo invoices on mainnet (human, signed, real funds)

One invoice through to **Released** (receipt for the form) and one Funded invoice with a short due date for the refund shot. Done: both receipts open on the gateway. Placeholder: `<<DEMO_INVOICE_ID>>`.

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
- Judge mode on testnet uses a local fixture container id because TapeOut has no published testnet deployment; if one appears, bind the judge invoices to a real testnet container.

## Secrets check

No keys, seeds, `.env`, or wallet files are committed. `e2e/.keys.json` (random throwaway keys used only on a local Hardhat node) is gitignored and stays on the build machine.
