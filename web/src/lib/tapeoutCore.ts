/**
 * Resolve a TapeOut container address to its on-chain name `<#ID>.<area>.<cpu>.tape`.
 * Only documented read functions are used (TapeKit SPEC Appendix B):
 *   container.token() -> (chainId, processor, #ID)
 *   factory.isCPU(processor), factory.cpuCount(), factory.cpuAt(i)
 *   opener.accountOf(processor, #ID) must equal the container (SPEC §3.3: recompute and compare)
 * Any failure or mismatch returns null so the UI hides the field instead of guessing.
 */
import { getAddress, isAddressEqual, parseAbi, type Address } from "viem";
import { ethCall, type Requester } from "./rpc";

/** Source: docs/research.md §3 (TapeKit README "Mainnet constants", X Layer column). */
export const XLAYER_TAPEOUT = {
  chainId: 196,
  areaCode: 2,
  factory: "0x1f09DAeFA827f02CBb40967cc91b259763760761",
  opener: "0x536adD8F30f03b69f6fbF29d425A816A0dC50106",
} as const;

const containerAbi = parseAbi(["function token() view returns (uint256 chainId, address tokenContract, uint256 tokenId)"]);
const factoryAbi = parseAbi(["function cpuCount() view returns (uint256)", "function cpuAt(uint256) view returns (address)", "function isCPU(address) view returns (bool)"]);
const openerAbi = parseAbi(["function accountOf(address circuits, uint256 tokenId) view returns (address)"]);

export type TapeName = { name: string; processor: Address; processorNumber: number; circuitId: bigint };

export async function resolveTapeName(
  client: Requester,
  container: Address,
  net: { chainId: number; areaCode: number; factory: Address; opener: Address } = XLAYER_TAPEOUT,
  maxProcessors = 2000,
): Promise<TapeName | null> {
  try {
    const [chainId, processor, circuitId] = await ethCall(client, { address: container, abi: containerAbi, functionName: "token" });
    if (Number(chainId) !== net.chainId) return null;
    const [isCpu, account, count] = await Promise.all([
      ethCall(client, { address: net.factory, abi: factoryAbi, functionName: "isCPU", args: [processor] }),
      ethCall(client, { address: net.opener, abi: openerAbi, functionName: "accountOf", args: [processor, circuitId] }),
      ethCall(client, { address: net.factory, abi: factoryAbi, functionName: "cpuCount" }),
    ]);
    if (!isCpu || !isAddressEqual(account, container)) return null;
    const n = Number(count);
    if (!Number.isSafeInteger(n) || n <= 0 || n > maxProcessors) return null;
    // Processor numbers are append-only; scan in parallel (the transport batches these calls).
    const STEP = 50;
    for (let start = 0; start < n; start += STEP) {
      const idx = Array.from({ length: Math.min(STEP, n - start) }, (_, k) => start + k);
      const addrs = await Promise.all(idx.map((i) => ethCall(client, { address: net.factory, abi: factoryAbi, functionName: "cpuAt", args: [BigInt(i)] })));
      const hit = addrs.findIndex((a) => isAddressEqual(a, processor));
      if (hit >= 0) {
        const processorNumber = idx[hit];
        const area = net.areaCode ? `${net.areaCode}.` : "";
        return { name: `${circuitId}.${area}${processorNumber}.tape`, processor: getAddress(processor), processorNumber, circuitId };
      }
    }
    return null;
  } catch {
    return null;
  }
}
