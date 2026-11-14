import { useState } from "react";
import { config, explorerAddress, explorerTx } from "../config";
import { containerAddressOf, fmtAmount, fmtTime, shortAddr, ZERO32 } from "../lib/format";
import { parseError } from "../lib/errors";
import { NotConfiguredError, quoteFee, stateName, useChainNow, useEscrowInfo, useInvoice, useInvoiceTxs, useTokenInfo, type Invoice, type TxRef } from "../lib/invoice";
import { InvoiceActions } from "../components/InvoiceActions";
import { Warnings } from "../components/Warnings";

function AddrLink({ a, testid }: { a: string; testid?: string }) {
  const href = explorerAddress(a);
  return href ? (
    <a className="mono" href={href} target="_blank" rel="noreferrer" title={a} data-testid={testid}>
      {a}
    </a>
  ) : (
    <span className="mono" title={a} data-testid={testid}>
      {a}
    </span>
  );
}

function TxLink({ tx }: { tx?: TxRef }) {
  if (!tx) return null;
  const href = explorerTx(tx.hash);
  return href ? (
    <a className="mono tx" href={href} target="_blank" rel="noreferrer">
      tx {shortAddr(tx.hash)}
    </a>
  ) : (
    <span className="mono tx">tx {shortAddr(tx.hash)}</span>
  );
}

function Timeline({ inv, txs }: { inv: Invoice; txs: TxRef[] }) {
  const tx = (ev: string) => [...txs].reverse().find((t) => t.event === ev);
  const final = stateName(inv.state);
  const steps: { label: string; at: bigint; done: boolean; tx?: TxRef; note?: string }[] = [
    { label: "Created (Draft)", at: inv.createdAt, done: true, tx: tx("InvoiceCreated") },
    { label: "Funded", at: inv.fundedAt, done: inv.fundedAt > 0n, tx: tx("InvoiceFunded") },
    { label: "Delivery submitted", at: inv.submittedAt, done: inv.submittedAt > 0n, tx: tx("DeliverySubmitted") },
  ];
  if (final === "Released") steps.push({ label: "Released to seller", at: inv.closedAt, done: true, tx: tx("FundsReleased") });
  else if (final === "Refunded") steps.push({ label: "Refunded to buyer (time-lock)", at: inv.closedAt, done: true, tx: tx("Refunded") });
  else if (final === "Cancelled") steps.push({ label: "Cancelled by both parties", at: inv.closedAt, done: true, tx: tx("InvoiceCancelled") });
  else steps.push({ label: "Released or refunded", at: 0n, done: false, note: `refund opens ${fmtTime(inv.dueTimestamp)}` });

  return (
    <ol className="timeline" data-testid="timeline">
      {steps.map((s) => (
        <li key={s.label} className={s.done ? "done" : "todo"}>
          <span className="dot" />
          <div>
            <strong>{s.label}</strong>
            <div className="muted">
              {s.done ? fmtTime(s.at) : s.note ?? "pending"} <TxLink tx={s.tx} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function InvoicePage({ idParam }: { idParam: string }) {
  const id = /^\d+$/.test(idParam) && idParam !== "0" ? BigInt(idParam) : null;
  const inv = useInvoice(id);
  const escrow = useEscrowInfo();
  const token = useTokenInfo(inv.data?.token);
  const now = useChainNow();
  const txs = useInvoiceTxs(id);
  const [copied, setCopied] = useState(false);

  if (id === null) return <div className="card error">"{idParam}" is not a valid invoice number.</div>;
  if (inv.isLoading) return <div className="card muted" data-testid="loading">Reading invoice #{id.toString()} from {config.chain.name}…</div>;
  if (inv.isError) {
    const notFound = String(inv.error).includes("InvoiceNotFound") || String(inv.error).includes("not found");
    return (
      <div className="card error" data-testid="receipt-error">
        <h2>{notFound ? `Invoice #${id} does not exist` : "Could not read this invoice"}</h2>
        <p>{inv.error instanceof NotConfiguredError ? inv.error.message : notFound ? `No invoice #${id} on this escrow.` : `RPC error from ${config.rpcUrl}: ${parseError(inv.error)}`}</p>
        <p className="muted">Nothing is shown as success when the chain cannot be read.</p>
        <button className="btn" onClick={() => inv.refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const i = inv.data!;
  const t = token.data;
  const feeBps = escrow.data?.feeBps ?? config.feeBpsHint;
  const { fee, net } = quoteFee(i.totalAmount, feeBps);
  const f = (v: bigint) => (t ? fmtAmount(v, t.decimals, t.symbol) : "…");
  const state = stateName(i.state);
  const containerAddr = containerAddressOf(i.circuitContainerId);
  const chainNow = now.data ?? BigInt(Math.floor(Date.now() / 1000));
  const link = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="receipt-wrap">
      <article className="card receipt" data-testid="receipt">
        <header className="receipt-head">
          <div>
            <div className="muted small">Bulla invoice · {config.chain.name}</div>
            <h1>
              Invoice #{i.id.toString()}
            </h1>
            {i.memo && <p className="memo">{i.memo}</p>}
          </div>
          <span className={`state state-${state.toLowerCase()}`} data-testid="state">
            {state}
          </span>
        </header>

        <div className="amount-big" data-testid="amount">
          {f(i.totalAmount)}
        </div>

        <table className="kv">
          <tbody>
            <tr>
              <th>Fee on release ({(feeBps / 100).toFixed(2)}%)</th>
              <td data-testid="fee">{f(fee)}</td>
            </tr>
            <tr>
              <th>Seller receives on release</th>
              <td data-testid="net">{f(net)}</td>
            </tr>
            <tr>
              <th>Due / refund time-lock</th>
              <td>
                {fmtTime(i.dueTimestamp)} {chainNow >= i.dueTimestamp ? <span className="tag">passed</span> : null}
              </td>
            </tr>
            <tr>
              <th>Seller</th>
              <td>
                <AddrLink a={i.seller} testid="seller" />
              </td>
            </tr>
            <tr>
              <th>Buyer</th>
              <td>
                <AddrLink a={i.buyer} testid="buyer" />
              </td>
            </tr>
            <tr>
              <th>Token</th>
              <td>
                {t?.symbol ?? ""} <AddrLink a={i.token} />
              </td>
            </tr>
            <tr>
              <th>Delivery hash</th>
              <td className="mono break" data-testid="delivery-hash-value">
                {i.deliveryHash === ZERO32 ? <span className="muted">none yet</span> : i.deliveryHash}
              </td>
            </tr>
            {i.deliveryURI && (
              <tr>
                <th>Delivery link</th>
                <td className="break">
                  {/^https?:\/\//.test(i.deliveryURI) ? (
                    <a href={i.deliveryURI} target="_blank" rel="noreferrer noopener">
                      {i.deliveryURI}
                    </a>
                  ) : (
                    <span className="mono">{i.deliveryURI}</span>
                  )}
                </td>
              </tr>
            )}
            <tr>
              <th>Circuit container id</th>
              <td className="mono break" data-testid="container-id">
                {i.circuitContainerId}
                {containerAddr && (
                  <div>
                    container <AddrLink a={containerAddr} />
                  </div>
                )}
              </td>
            </tr>
            <tr>
              <th>Escrow contract</th>
              <td>{escrow.data ? <AddrLink a={escrow.data.address} /> : config.escrow ? <AddrLink a={config.escrow} /> : "-"}</td>
            </tr>
            {(i.sellerCancelConsent || i.buyerCancelConsent) && (
              <tr>
                <th>Cancel consent</th>
                <td>
                  seller {i.sellerCancelConsent ? "yes" : "no"} · buyer {i.buyerCancelConsent ? "yes" : "no"}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <h2 className="section-h">Timeline</h2>
        <Timeline inv={i} txs={txs.data ?? []} />
        {txs.isError && <p className="muted small">Transaction links unavailable (RPC log query failed). Timestamps above come from contract state.</p>}

        <div className="row no-print">
          <button
            className="btn btn-ghost"
            data-testid="copy-link"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                window.prompt("Copy this receipt link:", link);
              }
            }}
          >
            {copied ? "Link copied" : "Copy receipt link"}
          </button>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            Print
          </button>
        </div>
        <p className="muted small">Read live from {config.chain.name}. Unaudited v1.</p>
      </article>

      <aside className="side no-print">
        {t && escrow.data && <InvoiceActions inv={i} token={t} escrow={escrow.data} chainNow={chainNow} />}
        <Warnings />
      </aside>
    </div>
  );
}
