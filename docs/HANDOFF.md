# Bulla handoff: what is not done

Written 14 Nov 2026 at the end of the autonomous build. Deadline: 7 Dec 2026, 23:59 UTC. Everything below is **not done**. Nothing here was signed, deployed, minted, published, funded, recorded, or submitted. `docs/handoff/phase-1.md` is superseded by this build (its scaffold now exists).

What is done and verified in this session: `npm install`, `npm run compile`, `npm test` (30 passing), `npm run build` (static relative-path tree), `npm run deploy:local` (writes `contracts/deployments.json`), `npm run e2e` (5 passing on a local Hardhat node: no-wallet receipt, happy path, timeout refund, mutual cancel, parsed revert), `npm run deweb:package` (no problems; warns that mainnet escrow is not deployed). Testnet and mainnet deploy scripts were run only without a key and refused (dry run).

Build environment limits that caused some of the items below: this sandbox could not reach X Layer RPCs (`rpc.xlayer.tech`, `testrpc.xlayer.tech` were refused by the sandbox egress proxy), could not download the Foundry installer or native solc (so the repo uses Hardhat + the `solc` npm package), and has no wallet.

## Ordered list

### 1. Re-verify the UNKNOWNs (human or assistant with web + RPC access, ~30 min)

From `docs/research.md` §6. For each, update `docs/research.md` with the source URL or probe output.

| Item | How | Done looks like |
| --- | --- | --- |
| USDC `symbol()`/`decimals()` on X Layer mainnet and testnet | `X_LAYER_RPC=https://rpc.xlayer.tech X_LAYER_CHAIN_ID=196 ESCROW_TOKEN=0xB6CEceAB302E2E4948951eE7843FC24E92933061 npm run probe:network` (and testnet with `0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3`, chain 1952, `https://testrpc.xlayer.tech/terigon`) | prints `USDC`, `6`; paste output into research.md; mainnet token gate passed |
| TapeOut contracts have code on X Layer | `X_LAYER_RPC=https://rpc.xlayer.tech npm run probe:tapeout` | every row says `code OK`; `monthlyFee` printed |
| Explorer `/tx/<hash>` path | click a tx link in the app after the first testnet tx | page opens; else fix `explorerTx` in `web/src/config.ts` |
| Official TapeOut mint / open-container UI on X Layer | find the official app (leads: fabx.tech canvas, community container factory, hashport.ai) | URL recorded with source |
| HashPort X Layer support | open hashport.ai | yes/no recorded |
| X Layer gateway hostname | after publish, the URL tapekit.org gives for a `<id>.2.<cpu>.tape` name | URL recorded |
| TapeOut on X Layer testnet | look for published addresses | recorded or stays UNKNOWN (fixture id is fine) |

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

Replace every `<<…>>` in `docs/SUBMISSION-DRAFT.md`, then submit the Google Form from https://web3.okx.com/xlayer/build-x-series before 7 Dec 2026 23:59 UTC. Confirm eligibility (age of majority, not a restricted person). Done: form confirmation saved. An assistant must not submit as the user.

### 11. Nice to have before Demo Day (assistant can do)

- Independent review or audit of `BullaEscrow` (at minimum a second-person review and a Slither run where the tool can be installed).
- Foundry port of the tests if Foundry becomes installable (optional; Hardhat is the chosen toolchain).
- Reduce bundle size (currently ~545 KB JS) to cut DeWEB upload gas.
- Show the seller's `<#ID>.2.<cpu>.tape` name on receipts by reading `container.token()` and the factory processor list.

## Secrets check

No keys, seeds, `.env`, or wallet files are committed. `e2e/.keys.json` (random throwaway keys used only on a local Hardhat node) is gitignored and stays on the build machine.
