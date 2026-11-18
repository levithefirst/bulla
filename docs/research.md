# Bulla: verified research (X Layer + TapeOut)

Verified: Saturday 14 November 2026. Each row cites the page or probe opened in this session. Anything not confirmed from a primary source is marked **UNKNOWN** and the code uses a clearly named placeholder. `docs/planning/research.md` is the earlier lead list and is not authority.

On-chain probes were run on 14 Nov 2026 (Africa/Lagos) against `https://rpc.xlayer.tech` (chain 196) and `https://testrpc.xlayer.tech/terigon` (chain 1952). Raw outputs are pasted below. The earlier build sandbox could not reach those RPCs; that limitation no longer applies to these reads.

## 1. X Layer network

Source: https://web3.okx.com/onchainos/dev-docs/xlayer/developer/build-on-xlayer/network-information (official X Layer developer docs, opened 14 Nov 2026). RPC list also at https://web3.okx.com/onchainos/dev-docs/xlayer/developer/rpc-endpoints/rpc-endpoints.

| Item | Mainnet | Testnet |
| --- | --- | --- |
| Network name | X Layer mainnet | X Layer testnet |
| Chain ID | **196** (0xC4) | **1952** |
| RPC | `https://rpc.xlayer.tech`, `https://xlayerrpc.okx.com` | `https://testrpc.xlayer.tech/terigon`, `https://xlayertestrpc.okx.com/terigon` |
| Gas token | OKB | OKB |
| Explorer | `https://www.okx.com/web3/explorer/xlayer` | `https://www.okx.com/web3/explorer/xlayer-test` |

Explorer link forms used by the app: `<explorer>/address/<addr>` and `<explorer>/tx/<hash>`. The `/address/` form is used by Circle's own X Layer links below. The `/tx/` form is the official explorer's own path: requesting `https://www.okx.com/web3/explorer/xlayer/tx/<hash>` for a live mainnet transaction (`0x8cf2bf1158e08d7f2f2aec48b81065c18b577b729c6a297efa7ce8aeea545a11`, block 75907823) returned HTTP 301 to `https://web3.okx.com/explorer/xlayer/tx/<same hash>`. The rendered page was behind a Cloudflare challenge from this machine, so a click after the first testnet tx is still a good UX check.

Chain ID 195 (old testnet) is not used anywhere in this repo.

## 2. ERC-20 for escrow

Source: https://developers.circle.com/stablecoins/usdc-contract-addresses (Circle official, opened 14 Nov 2026).

| Network | Token | Address | Explorer |
| --- | --- | --- | --- |
| X Layer mainnet | USDC | `0xB6CEceAB302E2E4948951eE7843FC24E92933061` | https://www.okx.com/web3/explorer/xlayer/address/0xB6CEceAB302E2E4948951eE7843FC24E92933061 |
| X Layer testnet | USDC (testnet) | `0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3` | https://www.okx.com/web3/explorer/xlayer-test/address/0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3 |

- Decimals and symbol: confirmed on chain by `npm run probe:network` on 14 Nov 2026 (Africa/Lagos). Both mainnet and testnet return `name=USDC`, `symbol=USDC`, `decimals=6`. The UI still always reads `decimals()` from chain and never hard-codes 6.
- Lead not used: `https://usdt0.to/ecosystem/x-layer` lists USDT0 at `0x779Ded0c9e1022225f8E0630b35a9b54bE713736`. Not cross-checked against an OKX/X Layer page this session, so not adopted.

**Mainnet token decision gate:** passed. The escrow token is constructor-injected. `npm run probe:network` with `ESCROW_TOKEN=0xB6CEceAB302E2E4948951eE7843FC24E92933061` against `https://rpc.xlayer.tech` printed `symbol=USDC`, `decimals=6` (output below and in `docs/HANDOFF.md` step 1). Local and e2e use `MockERC20` (symbol `mUSDC`, 6 decimals).

Probe output, X Layer mainnet (block 75907725):

```
rpc        https://rpc.xlayer.tech
chainId    196
block      75907725
token      0xB6CEceAB302E2E4948951eE7843FC24E92933061
  name     USDC
  symbol   USDC
  decimals 6
  supply   91955562.00556
  balanceOf(0x0000000000000000000000000000000000000001) = 0 USDC
```

Probe output, X Layer testnet (block 46217923):

```
rpc        https://testrpc.xlayer.tech/terigon
chainId    1952
block      46217923
token      0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3
  name     USDC
  symbol   USDC
  decimals 6
  supply   19002.364771
  balanceOf(0x0000000000000000000000000000000000000001) = 0 USDC
```

## 3. TapeOut on X Layer

Primary source: TapeOut's official open-source repo https://github.com/TapeOutProtocol/TapeKit (README "Mainnet constants" and "Site owner handbook"), its normative spec https://github.com/TapeOutProtocol/TapeKit/blob/main/SPEC.md (Appendix B), and https://github.com/TapeOutProtocol/TapeKit/blob/main/kernel/src/config.js (`XLAYER_MAINNET`, comment says addresses were read-checked on X Layer on 2026-09-19).

### Concepts (from TapeKit README / SPEC §1)

- **Processor**: a CPU in TapeOut; on chain an independent circuit NFT contract (`Circuits`). Processors are created by a factory; `factory.cpuAt(i)` returns processor number `i`.
- **Circuit**: an NFT `#ID` on a processor.
- **Container**: the ERC-6551 account bound to that circuit. Address is derived from (chain, processor, #ID) via `opener.accountOf(processor, #ID)`. "One container, one website." Whoever holds the circuit NFT controls the container and the site.
- **SiteRegistry**: stores site files by (container, path), each with a SHA-256.
- **Name** on X Layer: `<#ID>.2.<processor>.tape` (area code 2), e.g. format example `1.2.0.tape`. Input `#1@2.0` also accepted.

### X Layer contract addresses (TapeKit README, "X Layer and Base use the same contract addresses")

| Contract | X Layer (chainId 196) |
| --- | --- |
| Processor factory | `0x1f09DAeFA827f02CBb40967cc91b259763760761` |
| Container opener | `0x536adD8F30f03b69f6fbF29d425A816A0dC50106` |
| SiteRegistry (proxy) | `0xd6EFb7adCc9c83dC4924Ad56f6a8E4e969b9ADB6` |
| DomainBinding (proxy) | `0x68809Fd2fb343aA57D0aeB7f33Defe477c9666f9` |

TapeOut on X Layer **testnet (1952)**: still **UNKNOWN**. Re-checked 14 Nov 2026 against TapeKit `kernel/src/config.js` (`NETWORKS` is only BNB Smart Chain mainnet, X Layer mainnet 196, and Base mainnet 8453) and a recursive file list of https://github.com/TapeOutProtocol/TapeKit (no `1952` or testnet deployment). Bulla's testnet deploy uses a fixture container id; real binding is mainnet-only.

Probe output, X Layer mainnet (`npm run probe:tapeout`, 14 Nov 2026). A first run failed `monthlyFee` because the DomainBinding address in the script used a bad EIP-55 checksum (`...fb343aa57...` instead of `...fb343aA57...`); the script now checksums addresses with `getAddress` before calling. After that fix:

```
factory        0x1f09DAeFA827f02CBb40967cc91b259763760761 code OK
opener         0x536adD8F30f03b69f6fbF29d425A816A0dC50106 code OK
siteRegistry   0xd6EFb7adCc9c83dC4924Ad56f6a8E4e969b9ADB6 code OK
domainBinding  0x68809Fd2fb343aA57D0aeB7f33Defe477c9666f9 code OK
processors     419
cpuAt(0)       0x839bdD6fa7A66416A609A735e11DE5411B98574e
monthlyFee     0 wei (native OKB) per 30 days
```


### Read-only interfaces confirmed (SPEC Appendix B)

- Factory: `cpuCount() → uint256`, `cpuAt(uint256) → address`, `isCPU(address) → bool`
- Opener: `accountOf(address circuits, uint256 tokenId) → address`, `isOpened(address circuits, uint256 tokenId) → bool`
- Processor (circuit NFT): `ownerOf(uint256) → address`, `name() → string`
- Container: `token() → (uint256 chainId, address tokenContract, uint256 tokenId)`
- SiteRegistry: `fileInfo(container, path)`, `read`, `readRange`, `pathCount`, `pathsRange`, `paths`, `fallbackPath`, `isOpenedContainer(address) → bool`
- DomainBinding: `isLive(name, container)`, `isContainerLive(container)`, `containerPaidUntil(container)`, `monthlyFee()`, `bind(name, container, months)` payable

Write calls on SiteRegistry (README handbook §3B): `putFile(container, path, contentType, sha256Hash, firstChunk)` (≤ 24,000 bytes), `appendChunk(container, path, expectIndex, chunk)`, `setFallback(container, path)`, `removeFile(container, path)`, signed by the holder or an operator set with `setOperator`. Exact ABI types of these write functions: still **UNKNOWN** (signatures only described in prose; not in SPEC Appendix B). Bulla does not script writes.

### How to mint or reuse a circuit, and open a container

- Official TapeOut app (https://www.tapeout.net/, opened 14 Nov 2026): the protocol's own site. Design and tape-out (mint) is at https://www.tapeout.net/canvas (HTTP 200). Open or create a container at https://www.tapeout.net/containers (HTTP 200). Related routes: `/circuits`, `/create`, `/processors`. The app treats X Layer as a first-class chain (chain id 196, symbol OKB, home tab "X Layer · Base", factory address matches TapeKit). Per-circuit container pages use `/container/<chain>/<cpu>/<id>`.
- Official opener write ABI, taken from the official app bundle at https://www.tapeout.net/app/assets/index-B42CEsqR.js (the script loaded by `/containers`): `open(address circuits, uint256 tokenId) payable returns (address)`, `FEE() view returns (uint256)`, and `event Opened(address indexed circuits, uint256 indexed tokenId, address indexed account, address payer)`. These write signatures are still absent from TapeKit SPEC Appendix B (read-only only). Open the container in the official UI; do not invent a broadcast script.
- Fab X (https://fabx.tech/en/, canvas https://fabx.tech/en/canvas) remains a community miner on TapeOut / X Layer, not the protocol team.
- TapeKit README: "You need, in this order: a TapeOut circuit (an NFT on some processor), its container **opened** (through the container opener; the HashPort console does this for you), and then files written under it." HashPort itself is BNB Chain only (see below), so on X Layer use the official TapeOut UI, not HashPort.
- Programmatic tape-out (compiling a netlist and minting from a script): still **UNKNOWN**. No SDK on npm; TapeKit roadmap says `@tapekit/kernel` on npm and a publishing CLI are "Next". Do not invent one.

### Publishing a static site to DeWEB

From TapeKit README "Site owner handbook":

1. Plain static folder, `index.html` at root, relative paths only, ASCII/NFC file names, no `.`/`..` segments.
2. Compute SHA-256 of every file (`shasum -a 256`).
3. Publish either via the **HashPort console** (pick circuit, upload folder, two wallet signatures; it computes hashes, splits chunks, sets fallback) or by direct `SiteRegistry` calls (above).
4. For client-side routing set `fallbackPath` to `index.html`. Bulla uses hash routing (`#/invoice/1`) so it also works in the preview viewer.
5. To be "100% on-chain": no `https://` references in HTML/CSS, no off-chain fetches. Chain reads through the wallet provider or the configured public nodes are allowed. (Bulla makes RPC calls to X Layer nodes; those are chain data.)
6. Activation: clients only display activated names; `DomainBinding.bind(name, container, months)`. README price is 0.08 BNB per 30 days on BNB Smart Chain. X Layer `monthlyFee()` was read on chain on 14 Nov 2026 and returned **0 wei** (native OKB) per 30 days. Re-read before paying: a zero fee can change if the proxy implementation is upgraded. The DomainBinding proxy's ERC-1967 implementation was `0x5ebf29b80789e548907c707530c3c7607c4347df`, which matches TapeKit `kernel/src/config.js` `expectedImpl` for this proxy.
7. Files above 8,400,000 bytes are never read; chunk = 24,000 bytes.

HashPort support for X Layer containers: **no** (as of 14 Nov 2026). Official pages https://www.hashport.ai/ and https://www.hashport.ai/app say "Store your dapp frontend on BNB Chain", "No other network, no other token, no other wallet", uploads cost "BNB Chain gas", and files are written as "read-only code contract[s] on BNB Chain mainnet". The console tells users with no container to open one for "0.012 BNB" on tapeout.net. There is no X Layer mention on those pages. For X Layer, publish with direct `SiteRegistry` calls on X Layer (a human must perform them) or another tool that actually targets chain 196. Do not assume HashPort will upload to X Layer.

Publishing CLI: **none exists** (roadmap item). Bulla does not wrap or invent `tapekit` CLI flags.

### How a layperson opens a DeWEB site

- Official HTTPS gateway: `https://tapekit.org/` (README: "Official gateway live at tapekit.org"). BSC example: `https://4246-0.tapekit.org/` for `4246.0.tape`.
- Gateway hostname for an **X Layer** name (`<id>.2.<cpu>.tape`): **confirmed**. Official TapeKit `kernel/src/name.js` (opened 14 Nov 2026) documents the gateway host as `<#ID>-<processor>.<gateway>` on BNB Smart Chain or `<#ID>-<area>-<processor>.<gateway>` on other chains, with the examples `4246-0.tapekit.org` and `1-2-344.tapekit.org`. `formatHostLabel` joins `[tokenId, area, cpu]` with hyphens when an area code is set; X Layer is area 2. The official Service Worker gateway (`sw-gateway/boot.js`) parses that same form and names X Layer area 2. So a site named `1.2.344.tape` is `https://1-2-344.tapekit.org/`, and in general `https://<id>-2-<cpu>.tapekit.org/`. The documented site-search shortcut remains `https://tapekit.org/?open=<name>`. After publish, confirm the live URL opens (clients only display activated names).
- Other readers: Chrome extension (keyword `tape`), `web+tape://` links, preview viewer; desktop `tape://` app is planned.

## 4. Architecture (Bulla)

`BullaEscrow` on X Layer holds the ERC-20 and all invoice state (Draft → Funded → Submitted → Released / Refunded, plus mutual cancel). Each invoice stores a `circuitContainerId` (`bytes32`): the TapeOut container address (or a fixture id locally) that the seller declares as the escrow's on-chain identity and public home. The UI is a static, relative-path Vite build meant to live in that container on DeWEB (SiteRegistry), so the receipt page and the app are served from the same circuit. The contract does not call TapeOut and does not run a NAND VM: the container id is a binding and a pointer. Control of the DeWEB site follows whoever holds the circuit NFT; control of funds follows the contract rules (seller and buyer EOAs), not the circuit.

## 5. Event

Source: https://web3.okx.com/xlayer/build-x-series, re-opened 14 Nov 2026. Deadline 7 Dec 2026 23:59 UTC. Websites/apps submit access link + which TapeOut features they use; circuit projects submit processor contract address + circuit ID; optional video ≤ 3 minutes.

Official submission form, linked from that page (two `href`s in the official HTML, record only, **not submitted**): https://forms.gle/EoDNbxQ65dev1wFd9 . That short link redirects to https://docs.google.com/forms/d/e/1FAIpQLScyVnDmyzxRyBxszLUWbwV5kVbpmZJ3JS6oyOxqjALRvhR1kg/viewform?usp=send_form . From this machine the form required a Google account to view, so the form title was not independently read. An assistant must not submit as the user.

## 6. Unknowns summary

| Item | Status | Placeholder used |
| --- | --- | --- |
| On-chain USDC `decimals()`/`symbol()` on X Layer | Confirmed: `USDC` / `6` on mainnet (block 75907725) and testnet (block 46217923) | UI still reads from chain |
| `/tx/` explorer path | Confirmed as official path via 301 to `web3.okx.com/explorer/xlayer/tx/<hash>` (page body not rendered here) | `EXPLORER_URL + /tx/` |
| TapeOut on X Layer testnet | Still UNKNOWN (no addresses in TapeKit) | `FIXTURE_CONTAINER_ID` |
| Official circuit mint / open-container UI | Confirmed: https://www.tapeout.net/canvas and https://www.tapeout.net/containers | human signs in that UI |
| Opener write function to open a container | Confirmed from official app ABI: `open(address,uint256) payable returns (address)`; `FEE() view returns (uint256)`. Still absent from SPEC Appendix B. Use the official UI. | human uses official UI |
| HashPort X Layer support | No (BNB Chain only, official HashPort pages 14 Nov 2026) | direct SiteRegistry on X Layer |
| X Layer gateway hostname | Confirmed: `https://<id>-2-<cpu>.tapekit.org/` (example `https://1-2-344.tapekit.org/` for `1.2.344.tape`) | record the live URL after publish as `DEWEB_GATEWAY_URL` |
| X Layer `DomainBinding.monthlyFee()` | Confirmed 0 wei (native OKB) per 30 days; re-read before paying | already read; re-read at bind time |
| SiteRegistry write ABI types | Still UNKNOWN (prose only) | no scripted writes |
| Official Google Form URL | Confirmed (not submitted): https://forms.gle/EoDNbxQ65dev1wFd9 | human submits later |

## 7. Judge mode and sponsor features (added 14 Nov 2026, Claude Code)

Appended for the judge-mode build; sections 1 to 6 above are unchanged.

| Feature | What Bulla wires | Source | Status |
| --- | --- | --- | --- |
| X Layer settlement | Escrow on mainnet 196 (real USDC) and testnet 1952 (judge mode, DemoUSD) | §1 network table (official X Layer network information page) | Wired in code; not deployed yet (HANDOFF steps 3, 4, 3b) |
| X Layer testnet faucet | Grok Bot funds the judge-mode demo gas tank from it | https://web3.okx.com/xlayer/faucet ; official docs https://web3.okx.com/onchainos/dev-docs/xlayer/developer/bridge/get-testnet-okb-from-faucet ("each user can only claim 0.2 OKB per day") | Confirmed. The daily cap bounds the tank: a judge run tops each burner up to about 700k gas × gas price × 2 |
| OKX explorer deep links | Every tx (toasts, receipt timeline, each judge-mode step) links to `<explorer>/tx/<hash>`; addresses to `<explorer>/address/<addr>` | §1 explorer URLs; `/tx/` path confirmed in §6 (301 to `web3.okx.com/explorer/xlayer/tx/<hash>`) | Mainnet path confirmed; testnet uses the same pattern under `/xlayer-test` (UNKNOWN until the first testnet tx link is clicked) |
| OKX Wallet connect | Listed first as "Recommended on X Layer"; "Get OKX Wallet" links to the official site when not detected | Official OKX Wallet site https://web3.okx.com/ ("One crypto wallet, 130+ native chains") and https://web3.okx.com/wallet/x-layer (X Layer wallet page) | The injected object name `window.okxwallet` comes from community sources (e.g. Ethereum Stack Exchange); no official OKX developer page for it was found this session: **UNKNOWN (official)**. The generic browser-wallet connector covers OKX Wallet through `window.ethereum` too |
| Native USDC on X Layer | Real-token mode escrows Circle USDC | §2 (Circle official address list; decimals probed = 6) | Confirmed |
| TapeOut circuit container + DeWEB | Invoice `circuitContainerId`; seller's `<#ID>.2.<cpu>.tape` name on mainnet receipts; app packaged for SiteRegistry | §3 | Wired; container mint and DeWEB publish are human steps (HANDOFF 5, 6) |

Judge-mode demo gas tank: a dedicated, throwaway, testnet-only key held by Grok Bot. Its private key is embedded in the judge build (it has to sign in the browser), so it must be treated as public: it holds only small faucet amounts, is never reused for anything else, and is rotated if drained. Mainnet builds refuse to compile with it set.

## 8. TapeOut interfaces for circuit-bound invoices (verified 18 Nov 2026, Claude Code)

Appended for BullaEscrow v2; earlier sections are unchanged. Sources read on 18 Nov 2026: https://github.com/TapeOutProtocol/TapeKit/blob/main/SPEC.md (Appendix B and §3.1) and https://github.com/TapeOutProtocol/TapeKit/blob/main/kernel/src/config.js (`L2_CONTRACTS`, `XLAYER_MAINNET`). Note: the SPEC numbers the processor as B.3, not B.1 (B.1 is the factory).

| Interface | SPEC section | Signature and meaning (quoted from the SPEC tables) | Used by Bulla v2 |
| --- | --- | --- | --- |
| Processor (circuit NFT, ERC-721) | B.3 | `ownerOf(uint256 tokenId) returns (address)`: "The holder; reverts when the #ID does not exist" | `createInvoice` requires `ownerOf(circuitId) == msg.sender`; every release re-reads it |
| Container opener | B.2 | `accountOf(address circuits, uint256 tokenId) returns (address)`: "The circuit's container address (deterministic ERC-6551 computation; works even before the container is deployed)"; `isOpened(address circuits, uint256 tokenId) returns (bool)` | Container address stored per invoice and used as the optional payout target; the UI shows `isOpened` |
| Container (ERC-6551 account) | B.4 | `token() returns (uint256 chainId, address tokenContract, uint256 tokenId)`: "The circuit bound to the container ... must be recomputed with `accountOf` and compared" | Receipt name resolver (`shared/tapeoutCore.ts`) |
| Processor factory | B.1 | `cpuCount()`, `cpuAt(uint256)`, `isCPU(address)` | Create form checks the processor is a TapeOut processor (`isCPU`) |

X Layer mainnet (chain 196) addresses, from `kernel/src/config.js` `L2_CONTRACTS` (comment there: same source and deployer order on Base and X Layer, read-checked on 2026-09-19):

| Contract | Address |
| --- | --- |
| Processor factory | `0x1f09DAeFA827f02CBb40967cc91b259763760761` |
| Container opener | `0x536adD8F30f03b69f6fbF29d425A816A0dC50106` |

The opener's write function `open(address,uint256)` (payable, `FEE()` = 0.08 OKB on X Layer) is recorded in `docs/planning/mainnet-budget.md`; Bulla never calls it.

### Can a container move ERC-20 out (ERC-6551 `execute`)? UNKNOWN at the time of writing; resolved in section 9 (yes)

- The SPEC lists only `token()` for the container (B.4). It documents no `execute`, `executeCall`, or other call-forwarding function.
- TapeKit contains no Solidity source for the container or its implementation (repository tree checked 18 Nov 2026).
- SPEC §3.1 gives the BNB Chain container implementation `0xAf4E78a2257C9c5480c2F8310E3b00437260751d`. BscScan shows it is a verified `AccountBeaconProxy` whose ABI is only a constructor, `fallback` and `receive` (https://bscscan.com/address/0xAf4E78a2257C9c5480c2F8310E3b00437260751d#code). The account logic sits behind a beacon whose implementation was not read here.
- The X Layer container implementation address is not published in TapeKit: UNKNOWN.

Consequence for Bulla v2: paying into the container is **opt-in per invoice** (`payToContainer`, default `false` = pay the seller's wallet). The create form warns that a holder can only spend USDC sent to the container if the container supports outgoing calls, which is unconfirmed. To confirm before recommending it: read the beacon's implementation behind an opened X Layer container (ERC-1967 beacon slot) and check its verified source for an owner-gated `execute` (ERC-6551 `IERC6551Executable.execute(address,uint256,bytes,uint8)`, see https://eips.ethereum.org/EIPS/eip-6551). Owner: Grok Bot (WIN-AUDIT action 4).

## 9. Container `execute`, opening, and TapeSend on X Layer (verified on chain 18 Nov 2026 by Grok Bot)

Appended 18 Nov 2026; supersedes the UNKNOWN in section 8. Source for every row: `docs/planning/win-audit/onchain-checks.md` (bytecode selectors, live `eth_call` against `https://rpc.xlayer.tech`, and official TapeKit issue #5, maintainer reproduction on X Layer, 28 Sep 2026).

| Fact | Detail |
| --- | --- |
| Container `execute` exists | ERC-6551 `execute(address to, uint256 value, bytes data, uint8 operation)`, selector `0x51945447`, present in the account logic and works in simulation. `executeCall(address,uint256,bytes)` (`0x9e5d4c49`) does not exist |
| Only CALL | `operation` must be `0`. `operation = 1` reverts `OnlyCall()` (`0x90afeb14`) |
| Execution fee | The holder attaches `EXEC_FEE()` as `msg.value`. It read `1300000000000000` wei (0.0013 OKB) on X Layer; without it the call reverts `ProtocolFeeTooLow(uint256,uint256)` (`0xafd49700`). Read it live before quoting a number: it can change with the beacon implementation |
| Container must be opened | `execute` is gated on `opener.isOpened`. An unopened container reverts `NotPaid()` (`0x34e4a710`) until `open()` is paid (0.08 OKB, `docs/planning/mainnet-budget.md`) |
| ERC-20 transfer specifically | Not simulated (the checked container's token balances were not read). A CALL to the token's `transfer` is the standard ERC-6551 way and is the path documented here |
| TapeSend hub | Live on X Layer: hub proxy `0xe61A9C7213a6Aa616C246a2B569e555B417b25ee` (same on every chain), X Layer implementation `0xdCC57797089eBD9f26e686379A4323f353a3F9C6` matching the official client's pin; unsealed and, per its README, not independently audited |
| Logs on the public RPC | `eth_getLogs` on `https://rpc.xlayer.tech` was rejected even for 2,000-block windows |

What Bulla v2 does with this:

- `payToContainer` stays **opt-in** per invoice (default: the circuit holder, normally the seller's wallet).
- At every release the contract reads `opener.isOpened(processor, circuitId)`; if the container is not opened, the release goes to the circuit holder instead (fallback), so funds never land in a container that cannot yet move them.
- The create form shows the container's opened status; the receipt explains how to withdraw: call the container's `execute(tokenAddress, 0, transfer(to, amount), 0)` with `EXEC_FEE()` attached, from the circuit holder's wallet, or use the official TapeOut app at https://www.tapeout.net/containers (section 3 above).
- Because the public RPC rejects `eth_getLogs`, the seller history panel reads the new on-chain `circuitStats(processor, circuitId)` view instead of scanning events; timeline transaction links stay best-effort.
- TapeSend stays out of scope for v2; `web/src/lib/notify.ts` is the seam.
