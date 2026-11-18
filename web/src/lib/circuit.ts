import { useQuery } from "@tanstack/react-query";
import { isAddress, parseAbi, type Address } from "viem";
import { client } from "./client";
import { ethCall } from "../../../shared/rpc";

/** TapeKit SPEC Appendix B read interfaces (docs/research.md section 8). */
const factoryAbi = parseAbi(["function isCPU(address) view returns (bool)", "function cpuCount() view returns (uint256)", "function cpuAt(uint256) view returns (address)"]);
const openerAbi = parseAbi(["function accountOf(address circuits, uint256 tokenId) view returns (address)", "function isOpened(address circuits, uint256 tokenId) view returns (bool)"]);
const processorAbi = parseAbi(["function ownerOf(uint256 tokenId) view returns (address)"]);

export type CircuitCheck =
  | { ok: true; processor: Address; holder: Address; container: Address; opened: boolean | null; youHold: boolean }
  | { ok: false; reason: string };

/**
 * Resolve the processor input (an address, or a processor number looked up with factory.cpuAt), then read
 * isCPU, ownerOf, accountOf and isOpened live. Mirrors exactly what createInvoice will check on chain.
 */
export async function checkCircuit(opts: { factory: Address; opener: Address; processorInput: string; circuitId: string; account?: Address }): Promise<CircuitCheck> {
  const pIn = opts.processorInput.trim();
  if (!/^\d+$/.test(opts.circuitId.trim())) return { ok: false, reason: "Enter the circuit #ID (a whole number)." };
  const id = BigInt(opts.circuitId.trim());
  let processor: Address;
  if (isAddress(pIn)) processor = pIn as Address;
  else if (/^\d+$/.test(pIn)) {
    try {
      processor = await ethCall(client, { address: opts.factory, abi: factoryAbi, functionName: "cpuAt", args: [BigInt(pIn)] });
    } catch {
      return { ok: false, reason: `There is no processor number ${pIn}.` };
    }
  } else return { ok: false, reason: "Enter a processor address (0x...) or processor number." };
  try {
    const isCpu = await ethCall(client, { address: opts.factory, abi: factoryAbi, functionName: "isCPU", args: [processor] });
    if (!isCpu) return { ok: false, reason: "That address is not a TapeOut processor (factory.isCPU is false)." };
  } catch {
    return { ok: false, reason: "Could not read the TapeOut factory over RPC." };
  }
  let holder: Address;
  try {
    holder = await ethCall(client, { address: processor, abi: processorAbi, functionName: "ownerOf", args: [id] });
  } catch {
    return { ok: false, reason: `Circuit #${id} does not exist on this processor.` };
  }
  const container = await ethCall(client, { address: opts.opener, abi: openerAbi, functionName: "accountOf", args: [processor, id] });
  const opened = await ethCall(client, { address: opts.opener, abi: openerAbi, functionName: "isOpened", args: [processor, id] }).catch(() => null);
  return { ok: true, processor, holder, container, opened, youHold: !!opts.account && holder.toLowerCase() === opts.account.toLowerCase() };
}

export function useCircuitCheck(opts: { factory?: Address; opener?: Address; processorInput: string; circuitId: string; account?: Address }) {
  const ready = !!opts.factory && !!opts.opener && opts.processorInput.trim() !== "" && opts.circuitId.trim() !== "";
  return useQuery({
    queryKey: ["circuit", opts.factory, opts.opener, opts.processorInput.trim(), opts.circuitId.trim(), opts.account],
    enabled: ready,
    queryFn: () => checkCircuit({ factory: opts.factory!, opener: opts.opener!, processorInput: opts.processorInput, circuitId: opts.circuitId, account: opts.account }),
    staleTime: 15_000,
    retry: 0,
  });
}
