/**
 * Read-only TapeOut probe on X Layer. Calls ONLY functions documented in
 * TapeKit SPEC Appendix B, at addresses from the TapeKit README (docs/research.md §3).
 *
 *   X_LAYER_RPC=https://rpc.xlayer.tech npm run probe:tapeout
 *   TAPEOUT_PROCESSOR=0x... TAPEOUT_CIRCUIT_ID=1 npm run probe:tapeout
 *
 * Refuses to run on any chain other than 196: TapeOut testnet addresses are UNKNOWN.
 */
import "dotenv/config";
import { createPublicClient, http, parseAbi, isAddress, getAddress, pad, type Address } from "viem";

// Source: https://github.com/TapeOutProtocol/TapeKit README "Mainnet constants" (X Layer and Base column)
const XLAYER_TAPEOUT = {
  chainId: 196,
  areaCode: 2,
  factory: "0x1f09DAeFA827f02CBb40967cc91b259763760761",
  opener: "0x536adD8F30f03b69f6fbF29d425A816A0dC50106",
  siteRegistry: "0xd6EFb7adCc9c83dC4924Ad56f6a8E4e969b9ADB6",
  domainBinding: "0x68809Fd2fb343aa57D0aeB7f33Defe477c9666f9",
} as const;

const factoryAbi = parseAbi(["function cpuCount() view returns (uint256)", "function cpuAt(uint256) view returns (address)", "function isCPU(address) view returns (bool)"]);
const openerAbi = parseAbi(["function accountOf(address circuits, uint256 tokenId) view returns (address)", "function isOpened(address circuits, uint256 tokenId) view returns (bool)"]);
const processorAbi = parseAbi(["function ownerOf(uint256) view returns (address)", "function name() view returns (string)"]);
const registryAbi = parseAbi(["function isOpenedContainer(address) view returns (bool)", "function pathCount(address) view returns (uint256)", "function fallbackPath(address) view returns (string)"]);
const bindingAbi = parseAbi(["function monthlyFee() view returns (uint256)", "function isContainerLive(address) view returns (bool)"]);

function die(msg: string): never {
  console.error(`probe-tapeout: ${msg}`);
  process.exit(1);
}

async function main() {
  const rpc = process.env.X_LAYER_RPC?.trim();
  if (!rpc) die("X_LAYER_RPC is not set.");
  const client = createPublicClient({ transport: http(rpc, { timeout: 15_000 }) });
  const chainId = await client.getChainId().catch((e) => die(`RPC failed: ${e.shortMessage ?? e.message}`));
  if (chainId !== XLAYER_TAPEOUT.chainId) {
    console.log(`chainId ${chainId}: TapeOut addresses for this chain are UNKNOWN (only X Layer mainnet 196 is documented).`);
    console.log("Missing: official TapeOut factory/opener/SiteRegistry for this chain. Nothing called.");
    process.exit(2);
  }

  for (const [label, addr] of Object.entries(XLAYER_TAPEOUT)) {
    if (typeof addr !== "string") continue;
    const code = await client.getCode({ address: addr as Address });
    console.log(`${label.padEnd(14)} ${addr} ${code && code !== "0x" ? "code OK" : "NO CODE"}`);
  }

  const cpuCount = await client.readContract({ address: XLAYER_TAPEOUT.factory, abi: factoryAbi, functionName: "cpuCount" });
  console.log(`processors     ${cpuCount}`);
  if (cpuCount > 0n) {
    const cpu0 = await client.readContract({ address: XLAYER_TAPEOUT.factory, abi: factoryAbi, functionName: "cpuAt", args: [0n] });
    console.log(`cpuAt(0)       ${cpu0}`);
  }
  const fee = await client.readContract({ address: XLAYER_TAPEOUT.domainBinding, abi: bindingAbi, functionName: "monthlyFee" }).catch(() => null);
  console.log(`monthlyFee     ${fee === null ? "call failed" : `${fee} wei (native OKB) per 30 days`}`);

  const proc = process.env.TAPEOUT_PROCESSOR?.trim();
  const idRaw = process.env.TAPEOUT_CIRCUIT_ID?.trim();
  if (!proc || !idRaw) {
    console.log("\nNo TAPEOUT_PROCESSOR / TAPEOUT_CIRCUIT_ID set: mint or reuse a circuit first (docs/tapeout-binding.md).");
    return;
  }
  if (!isAddress(proc)) die(`TAPEOUT_PROCESSOR is not an address: ${proc}`);
  const processor = getAddress(proc);
  const id = BigInt(idRaw);
  const isCpu = await client.readContract({ address: XLAYER_TAPEOUT.factory, abi: factoryAbi, functionName: "isCPU", args: [processor] });
  if (!isCpu) die(`${processor} is not a processor created by the X Layer factory.`);
  const name = await client.readContract({ address: processor, abi: processorAbi, functionName: "name" });
  const owner = await client.readContract({ address: processor, abi: processorAbi, functionName: "ownerOf", args: [id] }).catch(() => die(`no-such-token: #${id}`));
  const container = await client.readContract({ address: XLAYER_TAPEOUT.opener, abi: openerAbi, functionName: "accountOf", args: [processor, id] });
  const opened = await client.readContract({ address: XLAYER_TAPEOUT.opener, abi: openerAbi, functionName: "isOpened", args: [processor, id] });
  const files = await client.readContract({ address: XLAYER_TAPEOUT.siteRegistry, abi: registryAbi, functionName: "pathCount", args: [container] }).catch(() => 0n);
  const live = await client.readContract({ address: XLAYER_TAPEOUT.domainBinding, abi: bindingAbi, functionName: "isContainerLive", args: [container] }).catch(() => false);

  console.log(`\nprocessor      ${processor} (${name})`);
  console.log(`circuit #ID    ${id}`);
  console.log(`holder         ${owner}`);
  console.log(`container      ${container}`);
  console.log(`opened         ${opened}`);
  console.log(`site files     ${files}`);
  console.log(`name live      ${live}`);
  console.log(`\ncircuitContainerId for createInvoice: ${pad(container, { size: 32 })}`);
  console.log("Processor number (for the <#ID>.2.<cpu>.tape name): find i where cpuAt(i) == processor.");
}

main().catch((e) => die(e?.shortMessage ?? e?.message ?? String(e)));
