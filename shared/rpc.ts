/**
 * Small JSON-RPC layer on viem's ABI codecs. viem's generic actions (readContract/call with
 * deployless + CCIP support, writeContract/sendTransaction with EIP-7702 signature recovery)
 * add ~100 KB that Bulla never needs; this file replaces them with direct eth_* calls.
 * It has no app-config imports so tests can pass any EIP-1193-style requester.
 */
import {
  decodeErrorResult,
  decodeEventLog,
  decodeFunctionResult,
  encodeFunctionData,
  hexToBigInt,
  type Abi,
  type Address,
  type ContractFunctionArgs,
  type ContractFunctionName,
  type ContractFunctionReturnType,
  type Hex,
} from "viem";

export type Requester = { request(args: { method: string; params?: unknown }): Promise<unknown> };

/** A decoded contract revert (custom error name + args) or a plain revert reason. */
export class ContractRevert extends Error {
  constructor(
    public errorName: string,
    public args: readonly unknown[] = [],
  ) {
    super(`Reverted: ${errorName}`);
  }
}

const ERROR_STRING_ABI = [{ type: "error", name: "Error", inputs: [{ name: "message", type: "string" }] }] as const;

/** Find revert bytes anywhere in a JSON-RPC / viem error chain. */
export function findRevertData(e: unknown): Hex | undefined {
  let cur = e as { data?: unknown; cause?: unknown; details?: string } | undefined;
  for (let i = 0; cur && i < 12; i++) {
    const d = cur.data as unknown;
    if (typeof d === "string" && /^0x[0-9a-fA-F]{8,}$/.test(d)) return d as Hex;
    if (d && typeof d === "object" && typeof (d as { data?: unknown }).data === "string") return (d as { data: Hex }).data;
    cur = cur.cause as typeof cur;
  }
  return undefined;
}

export function toRevert(e: unknown, abi: Abi): unknown {
  const data = findRevertData(e);
  if (!data) return e;
  for (const a of [abi, ERROR_STRING_ABI as unknown as Abi]) {
    try {
      const r = decodeErrorResult({ abi: a, data });
      return r.errorName === "Error" ? new ContractRevert(String(r.args?.[0] ?? "Error")) : new ContractRevert(r.errorName, r.args ?? []);
    } catch {
      /* not this abi */
    }
  }
  return e;
}

type ReadFn<abi extends Abi> = ContractFunctionName<abi, "view" | "pure" | "nonpayable" | "payable">;

export async function ethCall<const abi extends Abi, fn extends ReadFn<abi>>(
  rpc: Requester,
  req: { address: Address; abi: abi; functionName: fn; args?: ContractFunctionArgs<abi, "view" | "pure" | "nonpayable" | "payable", fn>; from?: Address },
): Promise<ContractFunctionReturnType<abi, "view" | "pure" | "nonpayable" | "payable", fn>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = encodeFunctionData({ abi: req.abi, functionName: req.functionName, args: req.args } as any);
  let res: Hex;
  try {
    res = (await rpc.request({ method: "eth_call", params: [{ to: req.address, data, ...(req.from ? { from: req.from } : {}) }, "latest"] })) as Hex;
  } catch (e) {
    throw toRevert(e, req.abi);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return decodeFunctionResult({ abi: req.abi, functionName: req.functionName, data: res } as any) as any;
}

export async function latestTimestamp(rpc: Requester): Promise<bigint> {
  const b = (await rpc.request({ method: "eth_getBlockByNumber", params: ["latest", false] })) as { timestamp: Hex };
  return hexToBigInt(b.timestamp);
}

export type DecodedLog = { eventName: string; args: Record<string, unknown>; transactionHash: Hex; blockNumber: bigint };

export async function getLogs(rpc: Requester, address: Address, abi: Abi, fromBlock: bigint): Promise<DecodedLog[]> {
  const logs = (await rpc.request({ method: "eth_getLogs", params: [{ address, fromBlock: `0x${fromBlock.toString(16)}`, toBlock: "latest" }] })) as {
    data: Hex;
    topics: [Hex, ...Hex[]];
    transactionHash: Hex;
    blockNumber: Hex;
  }[];
  const out: DecodedLog[] = [];
  for (const l of logs) {
    try {
      const ev = decodeEventLog({ abi, data: l.data, topics: l.topics });
      out.push({ eventName: String(ev.eventName), args: (ev.args ?? {}) as Record<string, unknown>, transactionHash: l.transactionHash, blockNumber: hexToBigInt(l.blockNumber) });
    } catch {
      /* unknown event */
    }
  }
  return out;
}

export type Receipt = { status: "success" | "reverted"; blockNumber: bigint; logs: { data: Hex; topics: [Hex, ...Hex[]] }[] };

export async function waitForReceipt(rpc: Requester, hash: Hex, timeoutMs = 120_000, pollMs = 1_000): Promise<Receipt> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const r = (await rpc.request({ method: "eth_getTransactionReceipt", params: [hash] })) as { status: Hex; blockNumber: Hex; logs: Receipt["logs"] } | null;
    if (r) return { status: r.status === "0x1" ? "success" : "reverted", blockNumber: hexToBigInt(r.blockNumber), logs: r.logs };
    if (Date.now() > end) throw new Error(`Timed out waiting for transaction ${hash}.`);
    await new Promise((res) => setTimeout(res, pollMs));
  }
}
