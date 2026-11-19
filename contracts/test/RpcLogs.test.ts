import { expect } from "chai";
import { encodeEventTopics, encodeAbiParameters, type Hex } from "viem";
import { blockAtTimestamp, getInvoiceLogsAt, getLogsChunked, MAX_LOG_RANGE, type Requester } from "../../shared/rpc";

const abi = [{ type: "event", name: "MilestoneSubmitted", inputs: [{ name: "id", type: "uint256", indexed: true }, { name: "index", type: "uint256", indexed: true }, { name: "deliveryHash", type: "bytes32", indexed: false }, { name: "deliveryURI", type: "string", indexed: false }] }] as const;
const ESC = "0x35a7862e64b60857aDd42a8B8621DB8d9b4B5E07";
const H = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as Hex;

/** A fake X Layer node: 1 block per second (with a few uneven gaps), eth_getLogs capped at 100 blocks like rpc.xlayer.tech. */
function fakeChain(head: number, events: { block: number; id: bigint; index: bigint }[]) {
  const ts = (n: number) => 1_795_000_000 + n + (n > 5_000 ? 7 : 0);
  let calls = 0;
  const rpc: Requester = {
    async request({ method, params }) {
      calls++;
      const p = params as any[];
      if (method === "eth_blockNumber") return `0x${head.toString(16)}`;
      if (method === "eth_getBlockByNumber") return { timestamp: `0x${ts(Number(BigInt(p[0]))).toString(16)}` };
      if (method === "eth_getLogs") {
        const from = Number(BigInt(p[0].fromBlock)), to = Number(BigInt(p[0].toBlock));
        if (to - from > Number(MAX_LOG_RANGE)) throw new Error("block range greater than 100 max");
        const idTopic = p[0].topics?.[1];
        return events
          .filter((e) => e.block >= from && e.block <= to && (!idTopic || BigInt(idTopic) === e.id))
          .map((e) => ({ data: encodeAbiParameters([{ type: "bytes32" }, { type: "string" }], [H(1), "x"]), topics: encodeEventTopics({ abi, eventName: "MilestoneSubmitted", args: { id: e.id, index: e.index } }), transactionHash: H(e.block), blockNumber: `0x${e.block.toString(16)}` }));
      }
      throw new Error(`unexpected ${method}`);
    },
  };
  return { rpc, ts, calls: () => calls };
}

describe("Chunked eth_getLogs for the 100-block RPC cap (shared/rpc.ts)", () => {
  it("splits a range into windows of at most 100 blocks and returns every log", async () => {
    const c = fakeChain(2_000, [{ block: 10, id: 1n, index: 0n }, { block: 111, id: 1n, index: 1n }, { block: 999, id: 2n, index: 0n }]);
    const logs = await getLogsChunked(c.rpc, ESC, abi, 0n, 1_000n);
    expect(logs.map((l) => Number(l.blockNumber))).to.deep.equal([10, 111, 999]);
  });
  it("finds the first block at or after a timestamp, including after uneven block times", async () => {
    const c = fakeChain(100_000, []);
    for (const n of [1, 4_321, 5_001, 77_777, 99_999]) expect(await blockAtTimestamp(c.rpc, BigInt(c.ts(n)), 0n, 100_000n)).to.equal(BigInt(n));
  });
  it("resolves an invoice's events from its on-chain timestamps without a full scan", async () => {
    const ev = [{ block: 60_010, id: 7n, index: 0n }, { block: 60_500, id: 7n, index: 1n }, { block: 60_500, id: 8n, index: 0n }];
    const c = fakeChain(110_000, ev);
    const logs = await getInvoiceLogsAt(c.rpc, ESC, abi, 7n, [BigInt(c.ts(60_010)), BigInt(c.ts(60_500)), 0n], 1_000n);
    expect(logs.map((l) => [Number(l.blockNumber), l.args.id])).to.deep.equal([[60_010, 7n], [60_500, 7n]]);
    expect(c.calls()).to.be.below(60);
  });
});
