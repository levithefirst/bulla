# shared/

Framework-free TypeScript used by both the web app (`web/`) and the Hardhat tests (`contracts/`):

- `rpc.ts`: direct `eth_call` / `eth_getLogs` / receipt polling on viem's ABI codecs, with revert decoding.
- `tapeoutCore.ts`: resolves a TapeOut container to its `<#ID>.2.<cpu>.tape` name using only the X Layer addresses in `docs/research.md`.

Kept outside `web/` because `web/package.json` is an ES module package and the Hardhat tests load TypeScript as CommonJS.
