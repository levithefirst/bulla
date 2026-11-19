import { useEffect, useState } from "react";
import { decodeEventLog, formatEther, isHex, type Address, type Hex } from "viem";
import { bullaEscrowAbi } from "../abi/bullaEscrow";
import { config, explorerTx } from "../config";
import { client, fallbackClient } from "../lib/client";
import { withFallback } from "../../../shared/rpc";
import { fmtTime, shortAddr } from "../lib/format";
import { CopyButton } from "../components/Copy";
import { EmptyState } from "../components/Empty";
import { ReceiptSkeleton } from "../components/Skeleton";

type RpcLog = { address: Address; data: Hex; topics: [Hex, ...Hex[]]; logIndex: Hex };
type RpcReceipt = { status: Hex; blockNumber: Hex; gasUsed: Hex; effectiveGasPrice?: Hex; from: Address; to: Address | null; contractAddress: Address | null; logs: RpcLog[] };
type Loaded = { r: RpcReceipt; ts: bigint | null };

const known = [config.escrow, config.judge?.escrow].filter(Boolean).map((a) => a!.toLowerCase());
const rpc = fallbackClient ? withFallback(client, fallbackClient) : client;

function fmtArg(v: unknown): string {
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "string") return v.length > 42 ? `${v.slice(0, 10)}…${v.slice(-6)}` : v;
  return String(v);
}

/** #/tx/<hash>: a transaction receipt read directly from the X Layer RPC, with Bulla escrow events decoded. */
export default function TxPage({ hash }: { hash: string }) {
  const valid = isHex(hash) && hash.length === 66;
  const [state, setState] = useState<{ data?: Loaded; error?: string; missing?: boolean }>({});
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!valid) return;
    let live = true;
    setState({});
    (async () => {
      try {
        const r = (await rpc.request({ method: "eth_getTransactionReceipt", params: [hash] })) as RpcReceipt | null;
        if (!r) return live && setState({ missing: true });
        let ts: bigint | null = null;
        try {
          const b = (await rpc.request({ method: "eth_getBlockByNumber", params: [r.blockNumber, false] })) as { timestamp: Hex } | null;
          ts = b ? BigInt(b.timestamp) : null;
        } catch {
          /* time is optional */
        }
        if (live) setState({ data: { r, ts } });
      } catch (e) {
        if (live) setState({ error: (e as Error).message ?? "RPC error" });
      }
    })();
    return () => {
      live = false;
    };
  }, [hash, valid, n]);

  const ext = valid ? explorerTx(hash) : null;
  if (!valid)
    return (
      <div className="narrow">
        <EmptyState title="That is not a transaction hash" testid="tx-error" tone="error">
          <p className="muted">A transaction hash is 0x followed by 64 hex characters.</p>
        </EmptyState>
      </div>
    );
  if (state.missing || state.error)
    return (
      <div className="narrow">
        <EmptyState title={state.missing ? "Transaction not found on this chain" : "Could not read the transaction"} testid="tx-error" tone={state.error ? "error" : "neutral"}>
          <p className="muted">
            {state.missing ? `The ${config.chain.name} RPC has no receipt for ${shortAddr(hash)} yet. A just-sent transaction can take a few seconds.` : state.error}
          </p>
          <button className="btn" onClick={() => setN((x) => x + 1)}>
            Retry
          </button>
        </EmptyState>
      </div>
    );
  if (!state.data) return <ReceiptSkeleton label={`Reading transaction ${shortAddr(hash)} from ${config.chain.name}`} />;

  const { r, ts } = state.data;
  const ok = BigInt(r.status) === 1n;
  const events = r.logs.map((l) => {
    const ours = known.includes(l.address.toLowerCase());
    if (ours)
      try {
        const ev = decodeEventLog({ abi: bullaEscrowAbi, data: l.data, topics: l.topics });
        return { ours, name: String(ev.eventName), args: Object.entries((ev.args ?? {}) as Record<string, unknown>), address: l.address };
      } catch {
        /* fall through */
      }
    return { ours, name: ours ? "Escrow log" : "Log", args: [] as [string, unknown][], address: l.address };
  });
  const gasPrice = r.effectiveGasPrice ? BigInt(r.effectiveGasPrice) : null;

  return (
    <div className="narrow">
      <article className="card receipt-card" data-testid="tx-page">
        <p className="eyebrow-plain">Transaction · {config.chain.name}</p>
        <h1 className="mono break" style={{ fontSize: "1.1rem" }}>
          {hash} <CopyButton value={hash} label="Copy transaction hash" />
        </h1>
        <p className="muted small">Read live from the {config.chain.name} RPC with eth_getTransactionReceipt. This is the source of truth; public explorers can lag.</p>
        <dl className="lines">
          <div>
            <dt>Status</dt>
            <dd data-testid="tx-status" className={ok ? "check-ok" : "field-error"}>
              {ok ? "Success" : "Reverted"}
            </dd>
          </div>
          <div>
            <dt>Block</dt>
            <dd className="num" data-testid="tx-block">
              {BigInt(r.blockNumber).toString()}
            </dd>
          </div>
          {ts !== null && (
            <div>
              <dt>Time</dt>
              <dd className="num">{fmtTime(ts)}</dd>
            </div>
          )}
          <div>
            <dt>From</dt>
            <dd className="mono" title={r.from}>
              {r.from}
            </dd>
          </div>
          <div>
            <dt>To</dt>
            <dd className="mono" title={r.to ?? ""}>
              {r.to ?? (r.contractAddress ? `new contract ${r.contractAddress}` : "none")}
              {r.to && known.includes(r.to.toLowerCase()) && <span className="muted"> (Bulla escrow)</span>}
            </dd>
          </div>
          <div>
            <dt>Gas used</dt>
            <dd className="num">
              {BigInt(r.gasUsed).toLocaleString("en-US")}
              {gasPrice !== null && <span className="muted"> · fee {formatEther(BigInt(r.gasUsed) * gasPrice)} OKB</span>}
            </dd>
          </div>
        </dl>
        <h2 className="section-h">Events</h2>
        {events.length === 0 ? (
          <p className="muted">No events.</p>
        ) : (
          <ol className="timeline" data-testid="tx-events">
            {events.map((e, k) => (
              <li key={k} className="done step-released">
                <span className="dot" />
                <div className="step-body">
                  <span className="step-label">{e.name}</span>
                  <span className="muted step-meta mono break">
                    {e.ours ? e.args.map(([k2, v]) => `${k2}=${fmtArg(v)}`).join(" · ") || "Bulla escrow" : shortAddr(e.address)}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
        {ext && (
          <p className="muted small">
            Also on{" "}
            <a href={ext} target="_blank" rel="noreferrer" data-testid="tx-oklink">
              OKLink
            </a>{" "}
            (its X Layer index was behind the chain when this was built, so it may show "not found").
          </p>
        )}
      </article>
    </div>
  );
}
