# Bulla mainnet budget (X Layer chain 196)

Measured on Wednesday 18 November 2026, 01:09 Africa/Lagos, against `https://rpc.xlayer.tech`. This is a read-only study. No transaction was signed or broadcast. The destination under discussion is the mainnet ops wallet `0x00f9b7a48F4B3eCdcc8288C2295E59132143B3b0`, whose balance was 0 OKB at this block.

**Bottom line:** the fixed TapeOut fees dominate, and they are much larger than gas at today's prices. A recommended send is **0.10 OKB** (about **$8.68**) plus about **$1.00 USDC** for a visible demo invoice. **$10 of OKB is more than the OKB requirement.**

Re-read `opener.FEE()`, `TAPEOUT_FEE()`, and `DomainBinding.monthlyFee()` immediately before signing, because those values can change if the contracts are upgraded.

## Live prices used in this table

| Item | Value | Source | When (Africa/Lagos) |
| --- | --- | --- | --- |
| OKB/USD | **$86.77** | CoinGecko API `https://api.coingecko.com/api/v3/simple/price?ids=okb&vs_currencies=usd`, `last_updated_at=1794960528` | 18 Nov 2026, 01:08:48 |
| `eth_gasPrice` | 20,000,001 wei (0.020000001 gwei) | `eth_gasPrice` on `https://rpc.xlayer.tech` | 18 Nov 2026, 01:09:28 |
| `baseFeePerGas` | 20,000,000 wei (0.02 gwei) | latest block **76191532**, timestamp 1794960568 | 18 Nov 2026, 01:09:28 |
| `eth_maxPriorityFeePerGas` | 1 wei | same RPC | same time |
| L1 data fee | **0 wei** on live receipts (`l1Fee=0x0`) | see §1 | same session |

USD figures below use $86.77 per OKB and `cost = gasUsed * 20,000,001 wei`. They will move if the OKB price or the base fee moves.

## Budget table

| Item | Gas (best measured figure) | OKB | USD at $86.77 | Notes |
| --- | --- | --- | --- | --- |
| BullaEscrow deploy | 1,818,621 | 0.0000363724 | $0.003156 | Mainnet `eth_estimateGas` of the compiled artifact plus constructor args (`token=Circle USDC 0xB6CEceAB302E2E4948951eE7843FC24E92933061`, `feeBps=50`, fee recipient and owner set to the ops wallet) |
| TapeOut transistor mint (cheapest unsold path) | not measured | 0, plus a protocol fee of 1,000,000 wei (0.000000000001 OKB) on the cheapest unsold processors | about $0.00 | `mintPrice()` is 0 on 16 unsold processors. Newer free processors (for example cpu #419 Lingxi, #422 Chipet Heart, #423 Forkcast) also read `protocolFee() = 1,000,000 wei`. Older free processors read `protocolFee() = 0.00066 OKB` (about $0.057). Use a price-0 processor with the 1,000,000 wei fee if it still has remaining supply when you mint. |
| TapeOut circuit (tapeout) protocol fee | not measured | **0.0013** (`TAPEOUT_FEE() = 1,300,000,000,000,000 wei`) | $0.112801 | Read on every processor probed, including cpu #0, #1, #2, #3 (named TapeOut), #4-#7, #30, and #424-#426 |
| Open the circuit container | not measured | **0.08** (`opener.FEE() = 80,000,000,000,000,000 wei`) | $6.9416 | Same figure as the official TapeOut fee sheet (X Layer, 0.08 OKB). Payable on `open(address,uint256)` at `0x536adD8F30f03b69f6fbF29d425A816A0dC50106` |
| DomainBinding, 1 month | not measured | **0** (`monthlyFee() = 0 wei`) | $0 | Re-confirmed this session. `bind` still costs gas. Re-read before paying |
| DeWEB publish (12 files, 26 chunks, plus `setFallback`) | 106,030,304 (local SSTORE2 stand-in) + about 2,430,000 auth allowance = **108,460,304** | 0.0021692062 | $0.188222 | See §4. 27 transactions. The 2,430,000 is not a mainnet estimate; it is 27 txs × 3 checks × ~30,000 gas, using the SiteRegistry source comment that a real container `isValidSigner` is about 30,000 gas cold |
| Demo invoice loop (approve, create, fund, submit, release) | **583,711** | 0.0000116742 | $0.001013 | Local Hardhat measurement of the real `BullaEscrow` and a 6-decimal mock token, 1 USDC invoice, memo `"demo"`. Breakdown in §5 |
| **Measured gas subtotal** | **110,862,636** | **0.0022172528** | **$0.192391** | Deploy + DeWEB (with auth allowance) + demo invoice. Does not include mint, tapeout, open, or bind gas |
| **2× measured gas** | 221,725,272 | 0.0044345057 | $0.384782 | Safety buffer requested for this note |
| **Fixed protocol fees** | n/a | **0.0813** | **$7.054401** | 0.08 + 0.0013 + (1e6 wei mint protocol fee, negligible) + 0 bind fee |
| **Fixed fees + 2× measured gas** | n/a | **0.0857345057** | **$7.439183** | Before rounding up, and before unmeasured write gas |

Unmeasured gas (mint, tapeout, `open`, `bind`, and a possible second DeWEB publish after the escrow address is baked into the bundle) is not invented here. Even a second full DeWEB publish at today's gas price would be about another 0.0022 OKB (about $0.19). That still fits inside the 0.10 OKB recommendation below.

## 1. Gas price and L1 data fee

X Layer is an OP Stack L2. Official X Layer contract docs list a predeploy `GasPriceOracle` at `0x420000000000000000000000000000000000000F` ("Provides L1 fee calculation and offline gas estimation") and an `L1FeeVault` at `0x420000000000000000000000000000000000001A` ("Collects L1 fee portion"): https://web3.okx.com/onchainos/dev-docs/xlayer/developer/build-on-xlayer/contracts

So an L1 data fee exists as a mechanism and must be included when it is nonzero.

Live state, block 76191532:

- L2 base fee is 0.02 gwei, which matches the official Jovian announcement that X Layer set a 0.02 gwei minimum base fee (https://web3.okx.com/learn/x-layer-activates-jovian-upgrade).
- Receipts on this block report `l1BaseFeeScalar = 0x0` and `l1BlobBaseFeeScalar = 0x0`.
- The same receipts, and `GasPriceOracle.getL1Fee(rawTx)`, return **`l1Fee = 0 wei`**, including a 3,637-byte type-2 transaction (`0x03c1959026c66ca6d0ece2686737aee1a3289d40f3c46071918adade84fd107b`).
- `operatorFeeScalar()` and `operatorFeeConstant()` on `L1Block` (`0x4200000000000000000000000000000000000015`) also read 0.

Today, therefore, the cost of a transaction is L2 execution only: `gasUsed * (baseFee + priorityFee)`, currently `gasUsed * 20,000,001 wei`. If OKX later sets a nonzero L1 scalar, an L1 fee would appear on top of these numbers. This study does not invent a future scalar.

## 2. BullaEscrow deploy

- Artifact: `contracts/artifacts/contracts/BullaEscrow.sol/BullaEscrow.json` (init code 8,531 bytes including constructor args, deployed bytecode 7,730 bytes).
- Constructor: `(address token_, address feeRecipient_, uint16 feeBps_, address initialOwner)` as in `contracts/scripts/deploy-xlayer.ts`.
- Mainnet `eth_estimateGas` of that init code: **1,818,621 gas** (`0x1bbcfd`).
- A local Hardhat deploy of the same contract used 1,802,405 gas. The table uses the mainnet estimate.

## 3. TapeOut circuit mint and container

Addresses from TapeKit `kernel/src/config.js` (X Layer, read-checked on 2026-09-19) and `docs/research.md` §3:

| Contract | Address |
| --- | --- |
| Processor factory | `0x1f09DAeFA827f02CBb40967cc91b259763760761` |
| Container opener | `0x536adD8F30f03b69f6fbF29d425A816A0dC50106` |
| SiteRegistry proxy | `0xd6EFb7adCc9c83dC4924Ad56f6a8E4e969b9ADB6` |
| DomainBinding proxy | `0x68809Fd2fb343aA57D0aeB7f33Defe477c9666f9` |

On-chain reads this session:

- `factory.cpuCount() = 427`.
- `opener.FEE() = 0.08 OKB`. Matches the official fee sheet at https://tapeout.link/guide/first-tapeout ("Open a circuit container: 0.012 BNB; X Layer 0.08 OKB", dated 2026-09-25).
- `DomainBinding.monthlyFee() = 0 wei` (same as the 14 Nov 2026 probe). One month of binding therefore has no protocol fee; only gas.
- `TAPEOUT_FEE() = 0.0013 OKB` on every processor sampled.
- Each processor has a `transistors()` ERC-1155. `mintPrice()` and `supplyCap()` / `minted()` were read on all 427 transistor contracts (RPC batches of 10, the node limit is 10). **377** had remaining supply. **16** of those had `mintPrice() = 0`. Three of the free, unsold processors also had the lower `protocolFee() = 1,000,000 wei`:
  - cpu #419 Lingxi, cap 100,000,000, minted 66,000
  - cpu #422 Chipet Heart, cap 100,000,000, minted 1
  - cpu #423 Forkcast, cap 1,000,000, minted 815
- Other free processors (for example cpu #397 Tapee, #414 PULSE Financial Indicators) still have remaining supply but read `protocolFee() = 0.00066 OKB`.
- The official app (`https://www.tapeout.net/assets/index-BN6fIJi7.js`) documents L2 mint price as "{symbol} each, 0 = free" and says X Layer is in a test phase. These are community processors, not a promise that inventory stays unsold. Check `mintPrice()` and remaining supply again before minting.
- The exact minimum transistor count for a valid tapeout was not found in a primary source. On a price-0 processor the per-transistor mint price is 0 either way. The protocol fee is per mint transaction (1,000,000 wei or 0.00066 OKB, depending on the processor).
- `factory.deployFee()` reads 10,000,000 wei. Creating a new processor is not required if any free unsold processor remains.

The official opener write ABI, already recorded in `docs/research.md`, is `open(address circuits, uint256 tokenId) payable`. No `Opened` log was found in the last 4,000 X Layer blocks (the public RPC only allows a 100-block `eth_getLogs` window, and none of those 40 windows contained the event), so `open` gas was not measured. The 0.08 OKB fee is the figure that matters at today's gas price.

## 4. DeWEB publish

`npm run deweb:package` was run this session for `xlayerMainnet` (escrow still undeployed, so the script warned that the published app would show "not deployed"; file sizes are still the bytes that would be uploaded).

- **12 files, 469,972 bytes, 26 chunks of at most 24,000 bytes**, plus one `setFallback(container, "index.html")` call: **27 transactions**.
- Manifest SHA-256: `0xe2884b2ac25b3c7d707b505ce42e8aebe832c886b57283016720760c7499efa2`.
- After the escrow address is written into `contracts/deployments.json`, this package must be rebuilt. If `web/src/deweb.json` is later filled and the site is published again, budget a second publish of similar size.

How the bytes are stored (verified source, not a guess):

- TapeKit `expectedImpl` for the X Layer SiteRegistry proxy is `0xa85c4143d1d4a77f54b8e4ecc9e6d1418afea45f`. That implementation is live (14,377 bytes of code).
- Its bytecode contains the SSTORE2 init pattern `600B5981380380925939F3` and the `CHUNK_MAX` push for 24,000.
- The same-size BNB implementation `0x1d279D138A4D803378a7d4557c056f1beD53c261` is a Sourcify exact match (verified 30 Oct 2026). `src/SiteRegistry.sol` in that match says: files are split into chunks of at most 24,000 bytes, "each chunk is a read-only code contract (SSTORE2-style: `0x00 || data`)". `_deploy` does `create` of 11 init bytes plus a `0x00` prefix plus the chunk. `putFile` writes the first chunk; `appendChunk` appends later chunks. Code deposit is the EVM's 200 gas per runtime byte, so a full 24,000-byte chunk costs about 200 × 24,001 = 4,800,200 gas just to store the code, which matches the local measurements (a 24,000-byte `putFile` was 5,419,225 to 5,462,503 gas including calldata and bookkeeping).

The SiteRegistry ABI for the writes is `putFile(address,string,string,bytes32,bytes)` and `appendChunk(address,string,uint256,bytes)` (state mutability `nonpayable`). Types are no longer UNKNOWN for budgeting; they come from the Sourcify-verified ABI.

Mainnet `eth_estimateGas` of a real `putFile` needs a holder of an opened container, which this wallet is not yet, so gas was measured on a local Hardhat stand-in that copies `_deploy`, `putFile`, `appendChunk`, and `setFallback` from that source, using the real `deweb-out/site/` bytes:

| Step | Bytes | Local gas |
| --- | ---: | ---: |
| PUT `assets/CreatePage-Dfv34xTM.js` | 8,182 | 2,010,934 |
| PUT `assets/InvoicePage-D60mIFbW.js` chunk 0 | 24,000 | 5,419,369 |
| APPEND InvoicePage chunk 1 | 22,140 | 4,891,235 |
| PUT `geist-latin-ext` woff2 | 16,512 | 3,841,233 |
| PUT `geist-latin` woff2 chunk 0 | 24,000 | 5,462,503 |
| APPEND geist-latin chunk 1 | 5,400 | 1,266,644 |
| PUT `geist-mono-latin-ext` woff2 | 14,696 | 3,447,999 |
| PUT `geist-mono-latin` woff2 | 23,128 | 5,274,120 |
| PUT `index-BgVYNAnx.css` chunk 0 | 24,000 | 5,419,225 |
| APPEND css chunk 1 | 1,257 | 369,513 |
| PUT `index-Bn8F0kit.js` chunk 0 | 24,000 | 5,419,297 |
| APPEND index.js chunks 1-7 (7 × 24,000) | 168,000 | 7 × 5,294,056 |
| APPEND index.js chunk 8 | 17,705 | 3,930,666 |
| PUT `query-Diokm3bf.js` chunk 0 | 24,000 | 5,419,297 |
| APPEND query.js chunks 1-2 (2 × 24,000) | 48,000 | 2 × 5,294,056 |
| APPEND query.js chunk 3 | 212 | 143,260 |
| PUT `favicon.png` | 3,968 | 1,080,581 |
| PUT `index.html` | 1,057 | 451,416 |
| PUT `logo.png` | 19,715 | 4,489,294 |
| `setFallback("index.html")` | n/a | 47,214 |
| **Total, 27 txs** | **469,972 file bytes** | **106,030,304** |

The stand-in does not run `onlyEditor` / `isValidSigner` / `isOpened`. The verified source comments that a real container `isValidSigner` is about 30,000 gas cold. The table's 2,430,000 allowance is 27 × 3 × 30,000 and is labeled as such, not as a mainnet estimate.

## 5. Demo invoices

`BullaEscrow.createInvoice` reverts `InvalidAmount` when `totalAmount == 0` (`contracts/contracts/BullaEscrow.sol`). There is no larger minimum. With USDC's 6 decimals, the contract minimum is 1 base unit (0.000001 USDC).

A sensible visible demo is **1.00 USDC** (the 0.5% fee is 0.005 USDC, paid to the fee wallet). $5 also works and is still just a transfer between wallets we control; it is not required.

Local Hardhat gas, 1 USDC invoice, memo `"demo"`:

| Step | Gas |
| --- | ---: |
| `USDC.approve` (first approval) | 46,331 |
| `createInvoice` | 253,081 |
| `fundInvoice` | 100,706 |
| `submitDelivery` | 85,080 |
| `releaseFunds` | 98,513 |
| **Total** | **583,711** |

If the demo buyer is a second wallet, also budget one USDC transfer from the ops wallet to that buyer (not measured here; an ERC-20 transfer is far smaller than the loop above). The USDC itself is not spent: it moves from buyer to escrow to seller, minus the 0.5% fee, which goes to the fee recipient (the ops wallet, unless Fluid names a different address).

## 6. OKX withdrawal minimum (what Fluid can actually send)

The official withdrawal-info page is https://www.okx.com/fees/withdrawal-info (also https://www.okx.com/en-us/fees/withdrawal-info). That page loads its table from the official public endpoint `https://www.okx.com/v2/asset/withdraw/fee-amount-infos` (`GET_WITHDRAWAL_RATE` in the official fees bundle `okex-fees-CAmi-t6u.js`, which calls `/v2/asset/withdraw/fee-amount-infos`).

Live values from that endpoint this session (`code=0`):

| Asset | Network | Minimum withdrawal | Withdrawal fee |
| --- | --- | ---: | ---: |
| OKB | X Layer | **0.02 OKB** (about $1.74) | **0.0000052 OKB** (about $0.00045) |
| USDC | X Layer | **0.0003 USDC** | **0.00016 USDC** |

The 0.02 OKB minimum is below the 0.10 OKB recommendation, so it is not the binding floor. Fluid should withdraw **on X Layer**, not Ethereum (OKX no longer withdraws OKB to Ethereum L1). The fee is charged by OKX on the withdrawal; the amount that should arrive is the requested amount minus that fee if the fee is taken from the withdrawal, or the requested amount if the fee is taken from the remaining OKX balance. In either case the fee is negligible next to 0.10 OKB.

The authenticated OKX API `GET /api/v5/asset/currencies` was not used (it requires an API key).

## Recommendation

Send **0.10 OKB** (about **$8.68** at $86.77) to `0x00f9b7a48F4B3eCdcc8288C2295E59132143B3b0` on **X Layer mainnet**, and about **$1.00 USDC** (Circle USDC `0xB6CEceAB302E2E4948951eE7843FC24E92933061` on the same chain) for the demo invoice.

How that was rounded: fixed protocol fees 0.0813 OKB, plus a 2× buffer on measured gas (0.0044345057 OKB), plus headroom for unmeasured writes and a possible second DeWEB publish, rounded up from 0.0857 OKB to **0.10 OKB**.

**$10 of OKB is more than needed.** $10 buys about 0.115 OKB at this price, which already covers the 0.10 OKB recommendation with a little left over. It does not replace the USDC: send the USDC separately (OKX's X Layer USDC minimum is only 0.0003 USDC; $1 is a demo amount, not an exchange minimum).

What this 0.10 OKB is meant to cover:

1. BullaEscrow deploy
2. Mint transistors on a still-unsold price-0 processor, tape out a small circuit (0.0013 OKB), and open its container (0.08 OKB)
3. One DeWEB publish of the current 469,972-byte package, and likely a rebuild-and-publish after the escrow address is known
4. `DomainBinding.bind` for 1 month at a 0 protocol fee
5. Demo invoice gas (the $1 USDC is separate)

Do not send a seed or a private key. If Fluid wants the 0.5% fees or the circuit NFT to sit in a wallet they control, send that public address before the deploy and the tapeout.

## Sources (primary)

- X Layer RPC `https://rpc.xlayer.tech`, chain id `0xc4` (196), block 76191532
- CoinGecko OKB price API, 18 Nov 2026, 01:08:48 Africa/Lagos
- Official X Layer contracts page: https://web3.okx.com/onchainos/dev-docs/xlayer/developer/build-on-xlayer/contracts
- Official Jovian 0.02 gwei minimum base fee: https://web3.okx.com/learn/x-layer-activates-jovian-upgrade
- TapeKit config: https://github.com/TapeOutProtocol/TapeKit/blob/main/kernel/src/config.js
- Official TapeOut fee sheet: https://tapeout.link/guide/first-tapeout
- Official TapeOut app bundle: https://www.tapeout.net/assets/index-BN6fIJi7.js
- Sourcify exact match of BNB SiteRegistry implementation `0x1d279D138A4D803378a7d4557c056f1beD53c261` (`src/SiteRegistry.sol`)
- Official OKX withdrawal table API: https://www.okx.com/v2/asset/withdraw/fee-amount-infos (used by https://www.okx.com/fees/withdrawal-info)
- This repo: `contracts/artifacts/contracts/BullaEscrow.sol/BullaEscrow.json`, `contracts/scripts/deploy-xlayer.ts`, `contracts/contracts/BullaEscrow.sol`, and `deweb-out/manifest.json` from `npm run deweb:package`

## Spent so far

- 18 Nov 2026: v1 BullaEscrow deployed to mainnet at 0x6f74E81A8a3444D9C28D702582Ccf2F0a861790A (block 76192196), about $0.003 of gas. Superseded by v2 per the win audit; not recorded as the live escrow.
- 18 Nov 2026, 14:07 Africa/Lagos: **v2 BullaEscrow** deployed to mainnet at `0x35a7862e64b60857aDd42a8B8621DB8d9b4B5E07` (block 76238200, tx `0x2f9049d5cfc78ac28342eacef488ed9889f8fb90bd8d9e9a55425ce6cee94f67`), 3,250,465 gas at 0.0253125 gwei = **0.0000822774 OKB** (about $0.007). Sourcify exact match.
- 18 Nov 2026, about 14:15 Africa/Lagos: **TapeOut circuit and container** for the ops wallet, by script (viem, no browser). Fees re-read on chain before each tx: `mintPrice() = 0`, `protocolFee() = 0.00066 OKB` (cpu #397 Tapee, native OKB; the cheaper 1,000,000-wei processors #419/#422/#423 charge that fee in BEM, an ERC-20 the wallet does not hold), `TAPEOUT_FEE() = 0.0013 OKB`, `opener.FEE() = 0.08 OKB`. Each tx was simulated with `eth_call` first. Function signatures come from the official app ABI (https://www.tapeout.net/app/assets/index-DizVcbig.js) and their selectors were confirmed in the beacon implementations' bytecode (processor impl `0x977f217887E085D298Cb3819cDAD5A0ee35F29B2`: `tapeout(bytes,uint32,uint32)` `0x7bd3ac1d`; transistors impl `0x44Ebf3345bcf9aB329e7a28E53fd8EcfAd1a5EFE`: `mint(uint256,uint256)` `0x1b2ef1ca`). Netlist: one input, one output, encoded as the official app does (each output buffered by two NANDs).

| Step | Tx | Gas used | Cost (OKB) |
| --- | --- | --- | --- |
| `transistors.mint(0, 2)` (2 NAND) | `0x739ceb2cf1407c38cec7b248730a425d16c716f3d3f702ce422b66f465a50d5b` | 137,699 | 0.000662754 |
| `tapeout(nl, 1, 1)` -> circuit #1 | `0xa19c5245b28194fb9477a2ae498ea6ff6c78a1bae1479e7675708ce2c11f6c37` | 241,782 | 0.001304836 |
| `opener.open(Tapee, 1)` | `0x87672d904015bbdcc6a9cc3a505bc27d489033cd34869078df2a6056fefd5f2a` | 167,256 | 0.080003345 |

Ops wallet OKB: 0.105001870 before the circuit, **0.023030936** after. Circuit plus container total: **0.081970934 OKB** (about $7.15 at $87.18/OKB, OKX OKB-USDT ticker 18 Nov 2026).
- 18 Nov 2026, about 14:22 to 14:24 Africa/Lagos: **mainnet demo invoice #1** (2 x 0.50 USDC, released into the container) and the first container withdrawal. Gas for 10 txs: 0.0000308761 OKB; container `EXEC_FEE`: 0.0013 OKB; 0.0001 OKB parked in the buyer wallet for gas (0.0000888 left there). USDC is net zero: 1.00 out to the buyer, 0.995 back via the container and 0.005 back as the fee. Ops wallet after: **0.021611221 OKB, 1.273179 USDC**. Tx table: `docs/research.md` section 10.
