import { useState, type ReactNode } from "react";
import type { Address } from "viem";
import { config, explorerAddress, explorerTx } from "../config";
import { containerAddressOf, fmtAmount, fmtDuration, fmtTime, shortAddr, ZERO32 } from "../lib/format";
import { parseError } from "../lib/errors";
import { NotConfiguredError, quoteFee, stateName, useChainNow, useEscrowInfo, useInvoice, useInvoiceTxs, useTokenInfo, type Invoice, type TxRef } from "../lib/invoice";
import { useTapeName } from "../lib/tapeout";
import { QueryProvider } from "../lib/query";
import { navigate } from "../router";
import { InvoiceActions } from "../components/InvoiceActions";
import { Warnings } from "../components/Warnings";
import { StatusBadge, StatusIcon, type StatusKind } from "../components/Status";
import { CopyButton } from "../components/Copy";
import { Qr } from "../components/Qr";
import { EmptyState } from "../components/Empty";
import { ReceiptSkeleton } from "../components/Skeleton";

function ExtLink({ href, children, label }: { href: string | null; children: ReactNode; label?: string }) {
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" aria-label={label}>
      {children}
    </a>
  ) : (
    <>{children}</>
  );
}

/** An address or hash with copy and (when an explorer exists) an explorer link. */
function Value({ v, label, testid, kind = "address" }: { v: string; label: string; testid?: string; kind?: "address" | "hash" }) {
  const href = kind === "address" ? explorerAddress(v) : null;
  return (
    <span className="value">
      <span className="mono break" data-testid={testid} title={v}>
        {v}
      </span>
      <span className="value-actions no-print">
        <CopyButton value={v} label={`Copy ${label}`} />
        {href && (
          <a className="icon-link" href={href} target="_blank" rel="noreferrer" aria-label={`View ${label} on explorer`} title="View on explorer">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
            </svg>
          </a>
        )}
      </span>
    </span>
  );
}

function TxLink({ tx }: { tx?: TxRef }) {
  if (!tx) return null;
  return (
    <span className="tx mono">
      <ExtLink href={explorerTx(tx.hash)} label={`Transaction ${tx.hash}`}>
        tx {shortAddr(tx.hash)}
      </ExtLink>
    </span>
  );
}

function Timeline({ inv, txs }: { inv: Invoice; txs: TxRef[] }) {
  const tx = (ev: string) => [...txs].reverse().find((t) => t.event === ev);
  const final = stateName(inv.state);
  // Each completed step takes the status style of the state it entered (see STATE_STATUS).
  const steps: { label: string; at: bigint; kind: StatusKind | null; tx?: TxRef; note?: string }[] = [
    { label: "Created (Draft)", at: inv.createdAt, kind: "pending", tx: tx("InvoiceCreated") },
    { label: "Funded", at: inv.fundedAt, kind: inv.fundedAt > 0n ? "funded" : null, tx: tx("InvoiceFunded") },
    { label: "Delivery submitted", at: inv.submittedAt, kind: inv.submittedAt > 0n ? "funded" : null, tx: tx("DeliverySubmitted") },
  ];
  if (final === "Released") steps.push({ label: "Released to seller", at: inv.closedAt, kind: "released", tx: tx("FundsReleased") });
  else if (final === "Refunded") steps.push({ label: "Refunded to buyer (time-lock)", at: inv.closedAt, kind: "disputed", tx: tx("Refunded") });
  else if (final === "Cancelled") steps.push({ label: "Cancelled by both parties", at: inv.closedAt, kind: "neutral", tx: tx("InvoiceCancelled") });
  else steps.push({ label: "Released or refunded", at: 0n, kind: null, note: `refund opens ${fmtTime(inv.dueTimestamp)}` });

  return (
    <ol className="timeline" data-testid="timeline" aria-label="Invoice timeline">
      {steps.map((s) => (
        <li key={s.label} className={s.kind ? `done step-${s.kind}` : "todo"} data-status={s.kind ?? "todo"}>
          <span className="dot">{s.kind && <StatusIcon kind={s.kind} />}</span>
          <div className="step-body">
            <span className="step-label">{s.label}</span>
            <span className="muted step-meta">
              <span className="num">{s.kind ? fmtTime(s.at) : s.note ?? "pending"}</span> <TxLink tx={s.tx} />
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function OpenAnother() {
  const [id, setId] = useState("");
  const clean = id.trim().replace(/^#/, "");
  return (
    <form
      className="open-form"
      aria-label="Open another receipt"
      onSubmit={(e) => {
        e.preventDefault();
        if (/^\d+$/.test(clean) && clean !== "0") navigate(`/invoice/${clean}`);
      }}
    >
      <label className="sr-only" htmlFor="another-id">
        Invoice number
      </label>
      <input id="another-id" className="mono" placeholder="Invoice #" inputMode="numeric" value={id} onChange={(e) => setId(e.target.value)} />
      <button className="btn" type="submit">
        Open
      </button>
    </form>
  );
}

function Receipt({ idParam }: { idParam: string }) {
  const id = /^\d+$/.test(idParam) && idParam !== "0" ? BigInt(idParam) : null;
  const inv = useInvoice(id);
  const escrow = useEscrowInfo();
  const token = useTokenInfo(inv.data?.token);
  const now = useChainNow();
  const txs = useInvoiceTxs(id);
  const containerAddr = inv.data ? containerAddressOf(inv.data.circuitContainerId) : null;
  const tape = useTapeName(containerAddr as Address | null);

  if (id === null)
    return (
      <div className="narrow">
        <EmptyState title="That is not an invoice number" testid="receipt-error" tone="error">
          <p className="muted">"{idParam}" is not a valid invoice number. Invoice numbers are whole numbers starting at 1.</p>
          <OpenAnother />
        </EmptyState>
      </div>
    );
  if (inv.isLoading) return <ReceiptSkeleton label={`Reading invoice #${id} from ${config.chain.name}`} />;
  if (inv.isError) {
    const notConfigured = inv.error instanceof NotConfiguredError;
    const notFound = !notConfigured && (String(inv.error).includes("InvoiceNotFound") || String(inv.error).includes("not found"));
    return (
      <div className="narrow">
        {notConfigured ? (
          <EmptyState title="Escrow not deployed yet" testid="receipt-error">
            <p className="muted">{(inv.error as Error).message}</p>
            <a className="btn" href="#/">
              Back home
            </a>
          </EmptyState>
        ) : notFound ? (
          <EmptyState title={`Invoice #${id} does not exist`} testid="receipt-error">
            <p className="muted">There is no invoice #{id.toString()} on this escrow. Check the number, or open another receipt.</p>
            <OpenAnother />
          </EmptyState>
        ) : (
          <EmptyState title="Could not read this invoice" testid="receipt-error" tone="error">
            <p>
              RPC error from <span className="mono">{config.rpcUrl}</span>: {parseError(inv.error)}
            </p>
            <p className="muted">Nothing is shown as success when the chain cannot be read.</p>
            <button className="btn" onClick={() => inv.refetch()}>
              Retry
            </button>
          </EmptyState>
        )}
      </div>
    );
  }

  const i = inv.data!;
  const t = token.data;
  const feeBps = escrow.data?.feeBps ?? config.feeBpsHint;
  const { fee, net } = quoteFee(i.totalAmount, feeBps);
  const amt = (v: bigint) =>
    t ? (
      <>
        {fmtAmount(v, t.decimals)} <span className="sym">{t.symbol}</span>
      </>
    ) : (
      <span className="skel-inline" aria-label="loading" />
    );
  const state = stateName(i.state);
  const chainNow = now.data ?? BigInt(Math.floor(Date.now() / 1000));
  const duePassed = chainNow >= i.dueTimestamp;
  const link = window.location.href;
  const escrowAddr = escrow.data?.address ?? config.escrow;

  return (
    <div className="receipt-layout">
      <article className="card receipt-card" data-testid="receipt" aria-labelledby="receipt-title">
        <header className="receipt-head">
          <div>
            <p className="eyebrow-plain">
              Bulla receipt · {config.chain.name}
            </p>
            <h1 id="receipt-title">
              Invoice <span className="num">#{i.id.toString()}</span>
            </h1>
          </div>
          <StatusBadge state={state} testid="state" />
        </header>
        {i.memo ? <p className="memo">{i.memo}</p> : <p className="memo muted">No description</p>}

        <div className="amount-block">
          <p className="amount-big num" data-testid="amount">
            {amt(i.totalAmount)}
          </p>
          <p className="muted">
            Seller receives <span className="num strong">{amt(net)}</span> on release, after a <span className="num">{(feeBps / 100).toFixed(2)}%</span> fee.
          </p>
        </div>

        <dl className="facts">
          <div>
            <dt>Due / refund time-lock</dt>
            <dd>
              <span className="num">{fmtTime(i.dueTimestamp)}</span>
              <span className="fact-sub">
                {duePassed ? <span className="tag">passed</span> : <span className="muted">in {fmtDuration(Number(i.dueTimestamp - chainNow))}</span>}
              </span>
            </dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd className="num">{fmtTime(i.createdAt)}</dd>
          </div>
          <div>
            <dt>Seller</dt>
            <dd>
              <Value v={i.seller} label="seller address" testid="seller" />
              {tape.data && (
                <span className="fact-sub" data-testid="tape-name">
                  TapeOut <span className="mono">{tape.data.name}</span>
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt>Buyer</dt>
            <dd>
              <Value v={i.buyer} label="buyer address" testid="buyer" />
            </dd>
          </div>
        </dl>

        <h2 className="section-h">Amounts</h2>
        <dl className="lines">
          <div>
            <dt>Escrowed</dt>
            <dd className="num">{amt(i.totalAmount)}</dd>
          </div>
          <div>
            <dt>Fee on release ({(feeBps / 100).toFixed(2)}%)</dt>
            <dd className="num" data-testid="fee">
              {amt(fee)}
            </dd>
          </div>
          <div className="lines-total">
            <dt>Seller receives on release</dt>
            <dd className="num" data-testid="net">
              {amt(net)}
            </dd>
          </div>
        </dl>
        <p className="muted small">Refunds and mutual cancels return the full amount with no fee.</p>

        <h2 className="section-h">Escrow record</h2>
        <dl className="record">
          <div>
            <dt>Circuit container id</dt>
            <dd>
              <Value v={i.circuitContainerId} label="circuit container id" testid="container-id" kind="hash" />
              {containerAddr && (
                <span className="fact-sub">
                  Container <ExtLink href={explorerAddress(containerAddr)} label="View container on explorer"><span className="mono">{shortAddr(containerAddr)}</span></ExtLink>
                </span>
              )}
            </dd>
          </div>
          {tape.data && (
            <div>
              <dt>Seller TapeOut name</dt>
              <dd>
                <span className="mono">{tape.data.name}</span>
                <span className="fact-sub muted">
                  circuit #{tape.data.circuitId.toString()} on processor {tape.data.processorNumber}
                </span>
              </dd>
            </div>
          )}
          <div>
            <dt>Delivery hash</dt>
            <dd>
              {i.deliveryHash === ZERO32 ? (
                <span className="muted" data-testid="delivery-hash-value">
                  None yet
                </span>
              ) : (
                <Value v={i.deliveryHash} label="delivery hash" testid="delivery-hash-value" kind="hash" />
              )}
            </dd>
          </div>
          {i.deliveryURI && (
            <div>
              <dt>Delivery link</dt>
              <dd className="break">
                {/^https?:\/\//.test(i.deliveryURI) ? (
                  <a href={i.deliveryURI} target="_blank" rel="noreferrer noopener">
                    {i.deliveryURI}
                  </a>
                ) : (
                  <span className="mono">{i.deliveryURI}</span>
                )}
              </dd>
            </div>
          )}
          <div>
            <dt>Token</dt>
            <dd>{t ? <Value v={i.token} label={`${t.symbol} token address`} /> : <Value v={i.token} label="token address" />}</dd>
          </div>
          <div>
            <dt>Escrow contract</dt>
            <dd>{escrowAddr ? <Value v={escrowAddr} label="escrow contract address" /> : "-"}</dd>
          </div>
          {(i.sellerCancelConsent || i.buyerCancelConsent) && (
            <div>
              <dt>Cancel consent</dt>
              <dd>
                Seller {i.sellerCancelConsent ? "yes" : "no"} · Buyer {i.buyerCancelConsent ? "yes" : "no"}
              </dd>
            </div>
          )}
        </dl>

        <h2 className="section-h">Timeline</h2>
        <Timeline inv={i} txs={txs.data ?? []} />
        {txs.isError && <p className="muted small">Transaction links unavailable (the RPC log query failed). Times above come from contract state.</p>}

        <footer className="receipt-foot">
          <div className="print-only print-qr">
            <Qr value={link} size={112} label="QR code of this receipt link" />
          </div>
          <p className="muted small">
            Read live from {config.chain.name}. Unaudited v1. <span className="print-only mono break">{link}</span>
          </p>
        </footer>
      </article>

      <aside className="side no-print" aria-label="Receipt actions">
        {t && escrow.data && <InvoiceActions inv={i} token={t} escrow={escrow.data} chainNow={chainNow} />}
        <section className="card share" aria-labelledby="share-title">
          <h2 id="share-title">Share this receipt</h2>
          <p className="muted small">Anyone with the link can read it. No wallet needed.</p>
          <div className="share-qr">
            <Qr value={link} size={152} label={`QR code linking to invoice ${i.id} receipt`} />
          </div>
          <div className="row">
            <CopyButton value={link} label="Copy receipt link" text="Copy link" testid="copy-link" />
            <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
              Print
            </button>
          </div>
        </section>
        <Warnings />
      </aside>
    </div>
  );
}

export default function InvoicePage({ idParam }: { idParam: string }) {
  return (
    <QueryProvider>
      <Receipt idParam={idParam} />
    </QueryProvider>
  );
}
