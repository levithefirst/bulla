# Bulla: verified research (X Layer + TapeOut)

Verified: Saturday 14 November 2026. Each row cites the page opened in this session. Anything not confirmed from a primary source is marked **UNKNOWN** and the code uses a clearly named placeholder. `docs/planning/research.md` is the earlier lead list and is not authority.

Note: outbound JSON-RPC to `rpc.xlayer.tech` and `testrpc.xlayer.tech` was blocked by this build container's network policy (HTTP 403 from the sandbox proxy, not from X Layer). On-chain reads (symbol/decimals, TapeOut contract code) were therefore NOT executed here. Run `npm run probe:network` and `npm run probe:tapeout` from a normal machine to confirm.

## 1. X Layer network

Source: https://web3.okx.com/onchainos/dev-docs/xlayer/developer/build-on-xlayer/network-information (official X Layer developer docs, opened 14 Nov 2026). RPC list also at https://web3.okx.com/onchainos/dev-docs/xlayer/developer/rpc-endpoints/rpc-endpoints.

| Item | Mainnet | Testnet |
| --- | --- | --- |
| Network name | X Layer mainnet | X Layer testnet |
| Chain ID | **196** (0xC4) | **1952** |
| RPC | `https://rpc.xlayer.tech`, `https://xlayerrpc.okx.com` | `https://testrpc.xlayer.tech/terigon`, `https://xlayertestrpc.okx.com/terigon` |
| Gas token | OKB | OKB |
| Explorer | `https://www.okx.com/web3/explorer/xlayer` | `https://www.okx.com/web3/explorer/xlayer-test` |

Explorer link forms used by the app: `<explorer>/address/<addr>` and `<explorer>/tx/<hash>` (the `/address/` form is used by Circle's own X Layer links below; the `/tx/` form is the standard OKX explorer path but was not separately confirmed: treat as **UNKNOWN until clicked once**).

Chain ID 195 (old testnet) is not used anywhere in this repo.

## 2. ERC-20 for escrow

Source: https://developers.circle.com/stablecoins/usdc-contract-addresses (Circle official, opened 14 Nov 2026).

| Network | Token | Address | Explorer |
| --- | --- | --- | --- |
| X Layer mainnet | USDC | `0xB6CEceAB302E2E4948951eE7843FC24E92933061` | https://www.okx.com/web3/explorer/xlayer/address/0xB6CEceAB302E2E4948951eE7843FC24E92933061 |
| X Layer testnet | USDC (testnet) | `0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3` | https://www.okx.com/web3/explorer/xlayer-test/address/0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3 |

- Decimals: Circle USDC is a 6-decimal token; the on-chain `decimals()` call on X Layer was **not executed in this session (UNKNOWN until `npm run probe:network` prints it)**. The UI always reads `decimals()` from chain and never hard-codes 6.
- Symbol: expected `USDC`; on-chain `symbol()` likewise unprobed.
- Lead not used: `https://usdt0.to/ecosystem/x-layer` lists USDT0 at `0x779Ded0c9e1022225f8E0630b35a9b54bE713736`. Not cross-checked against an OKX/X Layer page this session, so not adopted.

**Mainnet token decision gate:** the escrow token is constructor-injected. Mainnet deploy must not run until a human (a) runs `npm run probe:network` with `ESCROW_TOKEN=0xB6Ce...3061` against `https://rpc.xlayer.tech` and sees `symbol=USDC`, `decimals=6`, and (b) records that output in `docs/HANDOFF.md`. Local and e2e use `MockERC20` (symbol `mUSDC`, 6 decimals).

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
| DomainBinding (proxy) | `0x68809Fd2fb343aa57D0aeB7f33Defe477c9666f9` |

TapeOut on X Layer **testnet (1952)**: **UNKNOWN**. No testnet addresses are published in TapeKit. Bulla's testnet deploy uses a fixture container id; real binding is mainnet-only.

### Read-only interfaces confirmed (SPEC Appendix B)

- Factory: `cpuCount() → uint256`, `cpuAt(uint256) → address`, `isCPU(address) → bool`
- Opener: `accountOf(address circuits, uint256 tokenId) → address`, `isOpened(address circuits, uint256 tokenId) → bool`
- Processor (circuit NFT): `ownerOf(uint256) → address`, `name() → string`
- Container: `token() → (uint256 chainId, address tokenContract, uint256 tokenId)`
- SiteRegistry: `fileInfo(container, path)`, `read`, `readRange`, `pathCount`, `pathsRange`, `paths`, `fallbackPath`, `isOpenedContainer(address) → bool`
- DomainBinding: `isLive(name, container)`, `isContainerLive(container)`, `containerPaidUntil(container)`, `monthlyFee()`, `bind(name, container, months)` payable

Write calls on SiteRegistry (README handbook §3B): `putFile(container, path, contentType, sha256Hash, firstChunk)` (≤ 24,000 bytes), `appendChunk(container, path, expectIndex, chunk)`, `setFallback(container, path)`, `removeFile(container, path)`, signed by the holder or an operator set with `setOperator`. Exact ABI types of these write functions: **UNKNOWN** (signatures only described in prose). Bulla does not script writes.

### How to mint or reuse a circuit, and open a container

- Fab X (https://fabx.tech/en/, X Layer): "Collect transistors: Mint NAND and LATCH" → "Design and tape out: connect gates on the canvas ... then mint it as a circuit NFT" (canvas at https://fabx.tech/en/canvas). This is a community miner built on TapeOut on X Layer, not the protocol team.
- TapeKit README: "You need, in this order: a TapeOut circuit (an NFT on some processor), its container **opened** (through the container opener; the HashPort console does this for you), and then files written under it."
- The function that opens a container on the opener (name, arguments, fee): **UNKNOWN**. Not in SPEC Appendix B (read-only only). Do it in an official UI.
- Official TapeOut minting app URL: **UNKNOWN**. The community guide https://tapeout.link/guide/hashport (not confirmed as official) says a "community container factory" does "pick number → mint → tape out → open container" with 1 NAND, and names HashPort as `hashport.ai`. Treat as a lead.
- Programmatic tape-out (compiling a netlist and minting from a script): **UNKNOWN**. No SDK on npm; TapeKit roadmap says `@tapekit/kernel` on npm and a publishing CLI are "Next". Do not invent one.

### Publishing a static site to DeWEB

From TapeKit README "Site owner handbook":

1. Plain static folder, `index.html` at root, relative paths only, ASCII/NFC file names, no `.`/`..` segments.
2. Compute SHA-256 of every file (`shasum -a 256`).
3. Publish either via the **HashPort console** (pick circuit, upload folder, two wallet signatures; it computes hashes, splits chunks, sets fallback) or by direct `SiteRegistry` calls (above).
4. For client-side routing set `fallbackPath` to `index.html`. Bulla uses hash routing (`#/invoice/1`) so it also works in the preview viewer.
5. To be "100% on-chain": no `https://` references in HTML/CSS, no off-chain fetches. Chain reads through the wallet provider or the configured public nodes are allowed. (Bulla makes RPC calls to X Layer nodes; those are chain data.)
6. Activation: clients only display activated names; `DomainBinding.bind(name, container, months)`. README price is in BNB for BSC; X Layer `monthlyFee()` value: **UNKNOWN** (read it on chain before paying).
7. Files above 8,400,000 bytes are never read; chunk = 24,000 bytes.

HashPort support for X Layer containers: **UNKNOWN** (the guide describes uploads to BNB Chain). If HashPort does not support X Layer, the fallback is the community uploader or direct `SiteRegistry` calls on X Layer, which a human must perform.

Publishing CLI: **none exists** (roadmap item). Bulla does not wrap or invent `tapekit` CLI flags.

### How a layperson opens a DeWEB site

- Official HTTPS gateway: `https://tapekit.org/` (README: "Official gateway live at tapekit.org"). BSC example: `https://4246-0.tapekit.org/` for `4246.0.tape`.
- Gateway hostname for an **X Layer** name (`<id>.2.<cpu>.tape`): **UNKNOWN**. By analogy it may be `https://<id>-2-<cpu>.tapekit.org/`, but this is not stated anywhere; use the gateway home page's name box (`https://tapekit.org/?open=<name>` is the documented site-search shortcut form `https://<gateway domain>/?open=%s`).
- Other readers: Chrome extension (keyword `tape`), `web+tape://` links, preview viewer; desktop `tape://` app is planned.

## 4. Architecture (Bulla)

`BullaEscrow` on X Layer holds the ERC-20 and all invoice state (Draft → Funded → Submitted → Released / Refunded, plus mutual cancel). Each invoice stores a `circuitContainerId` (`bytes32`): the TapeOut container address (or a fixture id locally) that the seller declares as the escrow's on-chain identity and public home. The UI is a static, relative-path Vite build meant to live in that container on DeWEB (SiteRegistry), so the receipt page and the app are served from the same circuit. The contract does not call TapeOut and does not run a NAND VM: the container id is a binding and a pointer. Control of the DeWEB site follows whoever holds the circuit NFT; control of funds follows the contract rules (seller and buyer EOAs), not the circuit.

## 5. Event

Source: https://web3.okx.com/xlayer/build-x-series (see `docs/planning/research.md`, reviewed earlier the same day). Deadline 7 Dec 2026 23:59 UTC; Google Form; websites/apps submit access link + which TapeOut features they use; circuit projects submit processor contract address + circuit ID; optional video ≤ 3 minutes. Not re-opened this session.

## 6. Unknowns summary

| Item | Status | Placeholder used |
| --- | --- | --- |
| On-chain USDC `decimals()`/`symbol()` on X Layer | UNKNOWN (probe blocked here) | UI reads from chain |
| `/tx/` explorer path | UNKNOWN until clicked | `EXPLORER_URL + /tx/` |
| TapeOut on X Layer testnet | UNKNOWN | `FIXTURE_CONTAINER_ID` |
| Opener write function to open a container | UNKNOWN | human uses official UI |
| Official circuit mint app URL | UNKNOWN (leads: fabx.tech canvas, community container factory) | `CIRCUIT_ID_PLACEHOLDER` |
| HashPort X Layer support | UNKNOWN | human checklist |
| X Layer gateway hostname | UNKNOWN | `DEWEB_GATEWAY_URL` placeholder |
| X Layer `DomainBinding.monthlyFee()` | UNKNOWN | read on chain before paying |
| SiteRegistry write ABI types | UNKNOWN | no scripted writes |
