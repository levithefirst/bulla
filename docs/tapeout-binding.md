# Binding a Bulla invoice to a TapeOut circuit container

Every Bulla invoice stores a `circuitContainerId` (`bytes32`). This page explains how to get a real one on X Layer. Facts and sources are in `docs/research.md` §3; anything marked UNKNOWN there is still UNKNOWN here.

## What the id is

- A TapeOut **circuit** is an NFT `#ID` on a **processor** (a circuit NFT contract created by the TapeOut factory).
- Its **container** is the ERC-6551 account bound to that circuit. The address is deterministic: `opener.accountOf(processor, #ID)`. "Whoever holds the NFT controls the site" (TapeKit handbook §1).
- Bulla stores that container **address** left-padded to 32 bytes. The UI accepts the plain 0x address and pads it.
- On X Layer the human-readable name is `<#ID>.2.<processorNumber>.tape`.

X Layer TapeOut contracts (TapeKit README, chain 196):

| Contract | Address |
| --- | --- |
| Processor factory | `0x1f09DAeFA827f02CBb40967cc91b259763760761` |
| Container opener | `0x536adD8F30f03b69f6fbF29d425A816A0dC50106` |
| SiteRegistry | `0xd6EFb7adCc9c83dC4924Ad56f6a8E4e969b9ADB6` |
| DomainBinding | `0x68809Fd2fb343aA57D0aeB7f33Defe477c9666f9` |

## Step by step (human, X Layer mainnet)

Programmatic tape-out is **UNKNOWN** (no SDK or CLI is published; TapeKit lists a publishing CLI as roadmap). Do these steps in official or ecosystem UIs with the wallet that will hold the circuit. Use a dedicated wallet: whoever holds the circuit controls the container, and that is not safe if the wallet is stolen.

1. **Get a circuit (mint or reuse).**
   - Reuse: if you already hold a TapeOut circuit NFT on X Layer, note its processor contract address and `#ID` (from your wallet's NFT view or the explorer).
   - Mint: use the official TapeOut canvas at https://www.tapeout.net/canvas (X Layer is a first-class chain in that app). Fab X at https://fabx.tech/en/canvas is a community miner on the same protocol, not the official app. Verify any UI before signing.
2. **Open the container.** Use the official TapeOut containers page at https://www.tapeout.net/containers. The official app calls `open(address circuits, uint256 tokenId)` payable on the opener and reads `FEE()`. Do this in the official UI (a signature is required). Do not use HashPort for this on X Layer: HashPort's official pages are BNB Chain only (see `docs/research.md` §3).
3. **Read the container id.** With the circuit in hand:
   ```bash
   X_LAYER_RPC=https://rpc.xlayer.tech \
   TAPEOUT_PROCESSOR=0x<processor> TAPEOUT_CIRCUIT_ID=<id> \
   npm run probe:tapeout
   ```
   The script only calls documented read functions (`factory.isCPU`, `processor.ownerOf/name`, `opener.accountOf/isOpened`, `SiteRegistry.pathCount`, `DomainBinding.isContainerLive/monthlyFee`). It prints `holder`, `container`, `opened`, and the exact `circuitContainerId for createInvoice: 0x000…<container>`.
4. **Use it.** Paste the container address into the "Circuit container id" field of the create form (or the bytes32 the probe printed). The receipt shows the id and an explorer link to the container.
5. **Record it** for the submission in `docs/SUBMISSION-DRAFT.md` (circuit ID, processor contract address) and in `web/src/deweb.json` if this is also the container hosting the app.

Done looks like: `probe:tapeout` prints `opened true`, `holder` equals your wallet, and an invoice created with that container id shows the same address on its receipt.

## Local and testnet

- Local tests and e2e use `FIXTURE_CONTAINER_ID = 0x…b0110a00` (`contracts/scripts/deploy-local.ts`, `e2e/bulla.spec.ts`). It is not a TapeOut container.
- TapeOut on X Layer testnet (1952): **UNKNOWN** (no addresses published). On testnet use the fixture id or the mainnet container address as a plain label; nothing on chain checks it.

## Which TapeOut features Bulla uses (draft for the submission form)

| Feature | How Bulla uses it | Status |
| --- | --- | --- |
| Circuit container (ERC-6551 identity) | Each invoice stores the seller's container id; the receipt shows it with an explorer link | Implemented (field + UI); real container pending human mint |
| DeWEB / SiteRegistry hosting | The static Bulla app is packaged for SiteRegistry (relative paths, hash routing, SHA-256 manifest) | Package script done; publish pending human (see `docs/deweb.md`) |
| TapeKit reader / gateway | Laypeople open the app via the TapeKit HTTPS gateway at `https://<id>-2-<cpu>.tapekit.org/` (official format; example `https://1-2-344.tapekit.org/`) | Pending publish; hostname format confirmed |
| TapeOut read APIs | `probe:tapeout` reads factory/opener/SiteRegistry/DomainBinding on X Layer | Implemented and executed on mainnet 14 Nov 2026: all four contracts `code OK`, `monthlyFee` 0 wei |
| TapeSend, FabX mining, TapeCode | Not used | Out of scope for v1 |
