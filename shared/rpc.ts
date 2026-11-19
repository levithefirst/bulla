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

type RawLog = { data: Hex; topics: [Hex, ...Hex[]]; transactionHash: Hex; blockNumber: Hex; logIndex?: Hex };
const hex = (n: bigint) => `0x${n.toString(16)}`;

function decodeLogs(abi: Abi, logs: RawLog[]): DecodedLog[] {
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

/** All logs from fromBlock to latest in one call. Works on nodes without a range limit (local Hardhat). */
export async function getLogs(rpc: Requester, address: Address, abi: Abi, fromBlock: bigint): Promise<DecodedLog[]> {
  const logs = (await rpc.request({ method: "eth_getLogs", params: [{ address, fromBlock: hex(fromBlock), toBlock: "latest" }] })) as RawLog[];
  return decodeLogs(abi, logs);
}

/**
 * The public X Layer RPCs (rpc.xlayer.tech, xlayerrpc.okx.com, and the testnet ones) reject eth_getLogs when
 * toBlock - fromBlock > 100 ("block range greater than 100 max", measured 19 Nov 2026).
 */
export const MAX_LOG_RANGE = 100n;

/** Logs in [from, to], split into windows the public RPC accepts. Optional topics filter. */
export async function getLogsChunked(rpc: Requester, address: Address, abi: Abi, from: bigint, to: bigint, topics?: (Hex | null)[], concurrency = 4): Promise<DecodedLog[]> {
  const windows: [bigint, bigint][] = [];
  for (let a = from; a <= to; a += MAX_LOG_RANGE + 1n) windows.push([a, a + MAX_LOG_RANGE > to ? to : a + MAX_LOG_RANGE]);
  const results: RawLog[][] = new Array(windows.length);
  let next = 0;
  const worker = async () => {
    while (next < windows.length) {
      const k = next++;
      const [a, b] = windows[k];
      results[k] = (await rpc.request({ method: "eth_getLogs", params: [{ address, fromBlock: hex(a), toBlock: hex(b), ...(topics ? { topics } : {}) }] })) as RawLog[];
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, windows.length) }, worker));
  return decodeLogs(abi, results.flat());
}

export async function blockNumber(rpc: Requester): Promise<bigint> {
  return hexToBigInt((await rpc.request({ method: "eth_blockNumber" })) as Hex);
}

/** First block in [lo, hi] whose timestamp is >= ts (hi if none). Interpolation with a bisection fallback: a few calls on ~1 s blocks. */
export async function blockAtTimestamp(rpc: Requester, ts: bigint, lo: bigint, hi: bigint, cache = new Map<bigint, bigint>()): Promise<bigint> {
  const tsOf = async (n: bigint) => {
    const c = cache.get(n);
    if (c !== undefined) return c;
    const b = (await rpc.request({ method: "eth_getBlockByNumber", params: [hex(n), false] })) as { timestamp: Hex } | null;
    if (!b) throw new Error(`Block ${n} not returned by the RPC.`);
    const t = hexToBigInt(b.timestamp);
    cache.set(n, t);
    return t;
  };
  let tLo = await tsOf(lo);
  if (tLo >= ts) return lo;
  let tHi = await tsOf(hi);
  if (tHi < ts) return hi;
  // Invariant: ts(lo) < ts <= ts(hi).
  let bisect = false;
  for (let i = 0; hi - lo > 1 && i < 64; i++) {
    const before = hi - lo;
    let mid = !bisect && tHi > tLo ? lo + ((ts - tLo) * (hi - lo)) / (tHi - tLo) : (lo + hi) / 2n;
    if (mid <= lo) mid = lo + 1n;
    if (mid >= hi) mid = hi - 1n;
    const t = await tsOf(mid);
    if (t < ts) (lo = mid), (tLo = t);
    else (hi = mid), (tHi = t);
    // Interpolation that does not halve the bracket (uneven block times) is followed by one bisection step.
    bisect = !bisect && (hi - lo) * 2n > before;
  }
  return hi;
}

/**
 * Logs for one invoice id (the first indexed topic of every invoice event) without scanning the whole chain:
 * each known on-chain timestamp (createdAt, fundedAt, submittedAt, closedAt) is mapped to its block, and only a
 * small window around that block is queried.
 */
export async function getInvoiceLogsAt(rpc: Requester, address: Address, abi: Abi, id: bigint, timestamps: bigint[], deployBlock: bigint): Promise<DecodedLog[]> {
  const head = await blockNumber(rpc);
  const cache = new Map<bigint, bigint>();
  const starts = new Set<bigint>();
  for (const ts of [...new Set(timestamps.filter((t) => t > 0n))].sort((a, b) => (a < b ? -1 : 1))) {
    const b = await blockAtTimestamp(rpc, ts, deployBlock, head, cache);
    starts.add(b > deployBlock ? b - 1n : b);
  }
  // Merge overlapping windows so each block range is read once.
  const windows: [bigint, bigint][] = [];
  for (const s of [...starts].sort((a, b) => (a < b ? -1 : 1))) {
    const e = s + MAX_LOG_RANGE > head ? head : s + MAX_LOG_RANGE;
    const last = windows[windows.length - 1];
    if (last && s <= last[1] + 1n) last[1] = e > last[1] ? e : last[1];
    else windows.push([s, e]);
  }
  const topics: (Hex | null)[] = [null, `0x${id.toString(16).padStart(64, "0")}` as Hex];
  const out: DecodedLog[] = [];
  for (const [a, b] of windows) out.push(...(await getLogsChunked(rpc, address, abi, a, b, topics)));
  return out;
}

/** Try each requester in order (primary RPC, then the documented fallback). */
export function withFallback(...rpcs: Requester[]): Requester {
  return {
    async request(args) {
      let last: unknown;
      for (const r of rpcs) {
        try {
          return await r.request(args);
        } catch (e) {
          last = e;
        }
      }
      throw last;
    },
  };
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
