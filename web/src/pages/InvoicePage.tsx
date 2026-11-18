import { useState, type ReactNode } from "react";
import { config, explorerAddress, explorerTx } from "../config";
import { formatEther, type Address } from "viem";
import { fmtAmount, fmtDuration, fmtTime, shortAddr, ZERO32 } from "../lib/format";
import { parseError } from "../lib/errors";
import {
  displayState,
  milestoneStateName,
  NotConfiguredError,
  quoteFee,
  useChainNow,
  useEscrowInfo,
  useInvoice,
  useInvoiceTxs,
  useSellerHistory,
  useExecFee,
  useTokenInfo,
  ZERO_ADDR,
  type InvoiceData,
  type TxRef,
} from "../lib/invoice";
import { useTapeName } from "../lib/tapeout";
import { QueryProvider } from "../lib/query";
import { navigate } from "../router";
import { InvoiceActions } from "../components/InvoiceActions";
import { Warnings, NoArbiterWarning } from "../components/Warnings";
import { MilestoneBadge, StatusBadge, StatusIcon, type StatusKind } from "../components/Status";
import { ShareKit } from "../components/ShareKit";
import { CopyButton } from "../components/Copy";
import { Qr } from "../components/Qr";
import { EmptyState } from "../components/Empty";
import { ReceiptSkeleton } from "../components/Skeleton";
import { EscrowTargetProvider, JUDGE_TARGET, REAL_TARGET, useEscrowTarget } from "../lib/escrowTarget";

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

function Timeline({ data, txs }: { data: InvoiceData; txs: TxRef[] }) {
  const inv = data.invoice;
  const tx = (ev: string, index?: number) => [...txs].reverse().find((t) => t.event === ev && (index === undefined || t.index === index));
  const st = displayState(inv, data.milestones);
  const steps: { label: string; at: bigint; kind: StatusKind | null; tx?: TxRef; note?: string }[] = [
    { label: "Created (Draft)", at: inv.createdAt, kind: "pending", tx: tx("InvoiceCreated") },
    { label: "Funded (all milestones locked)", at: inv.fundedAt, kind: inv.fundedAt > 0n ? "funded" : null, tx: tx("InvoiceFunded") },
  ];
  data.milestones.forEach((m, i) => {
    const name = `Milestone ${i + 1} · ${m.label}`;
    if (m.submittedAt > 0n) steps.push({ label: `${name}: delivery submitted`, at: m.submittedAt, kind: "funded", tx: tx("MilestoneSubmitted", i) });
    if (m.state === 2) steps.push({ label: `${name}: released`, at: m.closedAt, kind: "released", tx: tx("MilestoneReleased", i) });
    if (m.state === 3) steps.push({ label: `${name}: refunded`, at: m.closedAt, kind: "disputed", tx: tx("MilestoneRefunded", i) });
  });
  if (st === "Refunded") steps.push({ label: "Refunded to buyer (time-lock)", at: inv.closedAt, kind: "disputed", tx: tx("Refunded") });
  else if (st === "Cancelled") steps.push({ label: "Cancelled by both parties", at: inv.closedAt, kind: "neutral", tx: tx("InvoiceCancelled") });
  else if (st === "Released" || st === "Completed") steps.push({ label: st === "Released" ? "Every milestone released" : "Completed", at: inv.closedAt, kind: "released", tx: tx("InvoiceCompleted") });
  else steps.push({ label: "Remaining milestones released or refunded", at: 0n, kind: null, note: `refund opens ${fmtTime(inv.dueTimestamp)}` });

  return (
    <ol className="timeline" data-testid="timeline" aria-label="Invoice timeline">
      {steps.map((s, k) => (
        <li key={k} className={s.kind ? `done step-${s.kind}` : "todo"} data-status={s.kind ?? "todo"}>
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

/** How a circuit holder moves USDC out of their container (docs/research.md section 9). */
function WithdrawNote({ container, token, standIn }: { container: Address; token: Address; standIn: boolean }) {
  const fee = useExecFee(container);
  return (
    <details className="withdraw-note" data-testid="withdraw-note">
      <summary>How to withdraw from your container</summary>
      {standIn ? (
        <p className="muted small">This is a testnet stand-in container. It has no code, so nothing can be withdrawn from it; on X Layer mainnet the real TapeOut container works as below.</p>
      ) : (
        <ol className="small">
          <li>The container must be opened (0.08 OKB, once, in the official app at https://www.tapeout.net/containers).</li>
          <li>
            From the wallet that holds the circuit, call the container's <span className="mono">execute(to, value, data, operation)</span> with <span className="mono">to</span> = the token{" "}
            <span className="mono">{shortAddr(token)}</span>, <span className="mono">value</span> = 0, <span className="mono">data</span> = <span className="mono">transfer(yourWallet, amount)</span>,{" "}
            <span className="mono">operation</span> = 0 (only CALL is allowed).
          </li>
          <li>
            Attach the container's <span className="mono">EXEC_FEE()</span> as the transaction value:{" "}
            <span className="num" data-testid="exec-fee">
              {fee.data != null ? `${formatEther(fee.data)} OKB right now` : fee.isLoading ? "reading…" : "could not be read"}
            </span>
            . Without it the call reverts.
          </li>
          <li>Or use the official TapeOut app at https://www.tapeout.net/containers.</li>
        </ol>
      )}
    </details>
  );
}

function SellerHistoryPanel({ data, decimals, symbol }: { data: InvoiceData; decimals: number; symbol: string }) {
  const h = useSellerHistory(data.invoice.processor, data.invoice.circuitId);
  return (
    <section className="card" aria-labelledby="history-title" data-testid="seller-history">
      <h2 id="history-title">On-chain activity</h2>
      <p className="muted small">
        Circuit #{data.invoice.circuitId.toString()} on processor <span className="mono">{shortAddr(data.invoice.processor)}</span>, counted on chain by this escrow. Funded invoices only; unfunded drafts are not
        counted. This is activity, not a reputation score: a seller can bill a wallet they control.
      </p>
      {h.isLoading && <p className="muted small">Reading on-chain counters…</p>}
      {h.isError && <p className="muted small">History unavailable (RPC error).</p>}
      {h.data && (
        <dl className="lines">
          <div>
            <dt>Funded invoices billed with this circuit</dt>
            <dd className="num" data-testid="history-invoices">
              {h.data.fundedInvoices}
            </dd>
          </div>
          <div>
            <dt>Milestones released</dt>
            <dd className="num" data-testid="history-released">
              {h.data.releasedMilestones}
            </dd>
          </div>
          <div className="lines-total">
            <dt>Total released</dt>
            <dd className="num" data-testid="history-total">
              {fmtAmount(h.data.releasedGross, decimals, symbol)}
            </dd>
          </div>
          <div>
            <dt>Milestones refunded</dt>
            <dd className="num">{h.data.refundedMilestones}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}

function Receipt({ idParam }: { idParam: string }) {
  const target = useEscrowTarget();
  const id = /^\d+$/.test(idParam) && idParam !== "0" ? BigInt(idParam) : null;
  const q = useInvoice(id);
  const escrow = useEscrowInfo();
  const token = useTokenInfo(q.data?.invoice.token);
  const now = useChainNow();
  const txs = useInvoiceTxs(id);
  const tape = useTapeName(q.data ? q.data.invoice.container : null);

  if (id === null)
    return (
      <div className="narrow">
        <EmptyState title="That is not an invoice number" testid="receipt-error" tone="error">
          <p className="muted">"{idParam}" is not a valid invoice number. Invoice numbers are whole numbers starting at 1.</p>
          <OpenAnother />
        </EmptyState>
      </div>
    );
  if (q.isLoading) return <ReceiptSkeleton label={`Reading invoice #${id} from ${config.chain.name}`} />;
  if (q.isError) {
    const notConfigured = q.error instanceof NotConfiguredError;
    const notFound = !notConfigured && (String(q.error).includes("InvoiceNotFound") || String(q.error).includes("not found"));
    return (
      <div className="narrow">
        {notConfigured ? (
          <EmptyState title="Escrow not deployed yet" testid="receipt-error">
            <p className="muted">{(q.error as Error).message}</p>
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
              RPC error from <span className="mono">{config.rpcUrl}</span>: {parseError(q.error)}
            </p>
            <p className="muted">Nothing is shown as success when the chain cannot be read.</p>
            <button className="btn" onClick={() => q.refetch()}>
              Retry
            </button>
          </EmptyState>
        )}
      </div>
    );
  }

  const data = q.data!;
  const i = data.invoice;
  const ms = data.milestones;
  const t = token.data;
  const feeBps = escrow.data?.feeBps ?? config.feeBpsHint;
  const totalFee = ms.reduce((a, m) => a + quoteFee(m.amount, feeBps).fee, 0n);
  const held = i.state === 2 ? ms.filter((m) => m.state < 2).reduce((a, m) => a + m.amount, 0n) : 0n;
  const amt = (v: bigint) =>
    t ? (
      <>
        {fmtAmount(v, t.decimals)} <span className="sym">{t.symbol}</span>
      </>
    ) : (
      <span className="skel-inline" aria-label="loading" />
    );
  const state = displayState(i, ms);
  const chainNow = now.data ?? BigInt(Math.floor(Date.now() / 1000));
  const duePassed = chainNow >= i.dueTimestamp;
  const link = window.location.href;
  const escrowAddr = escrow.data?.address ?? target.address;
  const standIn = target.kind === "judge" || !!config.tapeout?.standIn;
  const hasArbiter = i.arbiter !== ZERO_ADDR;

  return (
    <div className="receipt-layout">
      <article className="card receipt-card" data-testid="receipt" aria-labelledby="receipt-title">
        <header className="receipt-head">
          <div>
            <p className="eyebrow-plain">
              Bulla receipt · {config.chain.name}
              {target.kind === "judge" && <span className="tag tag-demo">Demo escrow · DemoUSD, no value</span>}
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
            {ms.length} milestone{ms.length > 1 ? "s" : ""}, funded up front. Released <span className="num strong">{amt(i.releasedAmount)}</span>
            {i.refundedAmount > 0n && (
              <>
                {" "}
                · refunded <span className="num strong">{amt(i.refundedAmount)}</span>
              </>
            )}
            {held > 0n && (
              <>
                {" "}
                · held in escrow <span className="num strong">{amt(held)}</span>
              </>
            )}
            .
          </p>
        </div>

        <dl className="facts">
          <div>
            <dt>Due / refund time-lock</dt>
            <dd>
              <span className="num">{fmtTime(i.dueTimestamp)}</span>
              <span className="fact-sub">{duePassed ? <span className="tag">passed</span> : <span className="muted">in {fmtDuration(Number(i.dueTimestamp - chainNow))}</span>}</span>
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

        <h2 className="section-h">Milestones</h2>
        <div className="table-wrap">
          <table className="ms-table" data-testid="milestones">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Milestone</th>
                <th scope="col" className="r">
                  Amount
                </th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {ms.map((m, k) => (
                <tr key={k} data-testid={`ms-row-${k}`}>
                  <td className="num">{k + 1}</td>
                  <td>
                    <span className="ms-label">{m.label}</span>
                    {m.deliveryHash !== ZERO32 && (
                      <span className="ms-sub">
                        delivery <span className="mono" data-testid={`delivery-hash-value-${k}`} title={m.deliveryHash}>{m.deliveryHash}</span>
                        <CopyButton value={m.deliveryHash} label={`Copy milestone ${k + 1} delivery hash`} />
                      </span>
                    )}
                    {m.deliveryURI && (
                      <span className="ms-sub break">
                        {/^https?:\/\//.test(m.deliveryURI) ? (
                          <a href={m.deliveryURI} target="_blank" rel="noreferrer noopener">
                            {m.deliveryURI}
                          </a>
                        ) : (
                          <span className="mono">{m.deliveryURI}</span>
                        )}
                      </span>
                    )}
                    {m.state === 2 && m.paidTo !== ZERO_ADDR && (
                      <span className="ms-sub">
                        paid to{" "}
                        <ExtLink href={explorerAddress(m.paidTo)} label={`Milestone ${k + 1} payee on explorer`}>
                          <span className="mono">{shortAddr(m.paidTo)}</span>
                        </ExtLink>
                        {m.paidTo.toLowerCase() === i.container.toLowerCase() && " (TapeOut container)"}
                      </span>
                    )}
                  </td>
                  <td className="num r">{amt(m.amount)}</td>
                  <td>
                    <MilestoneBadge state={milestoneStateName(m.state)} testid={`ms-state-${k}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="lines">
          <div>
            <dt>Fee per release ({(feeBps / 100).toFixed(2)}%), all milestones</dt>
            <dd className="num" data-testid="fee">
              {amt(totalFee)}
            </dd>
          </div>
          <div className="lines-total">
            <dt>Paid out if every milestone is released</dt>
            <dd className="num" data-testid="net">
              {amt(i.totalAmount - totalFee)}
            </dd>
          </div>
        </dl>
        <p className="muted small">Refunds and mutual cancels return the unreleased amount with no fee.</p>

        <h2 className="section-h">TapeOut binding and payout</h2>
        {standIn && (
          <p className="tag tag-demo" data-testid="standin-label">
            Testnet stand-in for TapeOut (TapeOut has no testnet deployment)
          </p>
        )}
        <dl className="record">
          <div>
            <dt>Payout target</dt>
            <dd>
              <Value v={data.payoutTarget} label="payout target" testid="payout-target" />
              <span className="fact-sub muted" data-testid="payout-note">
                {i.payToContainer
                  ? data.containerOpened
                    ? "The seller's TapeOut container (opened; follows the circuit)."
                    : "The seller asked for container payout, but the container is not opened yet, so releases go to the circuit holder until it is."
                  : "The current holder of the circuit (re-checked at every release)."}
              </span>
            </dd>
          </div>
          <div>
            <dt>Circuit</dt>
            <dd>
              <span className="mono">#{i.circuitId.toString()}</span> on processor <Value v={i.processor} label="processor address" testid="processor" />
              {tape.data && <span className="fact-sub mono">{tape.data.name}</span>}
            </dd>
          </div>
          <div>
            <dt>Container (ERC-6551)</dt>
            <dd>
              <Value v={i.container} label="container address" testid="container-address" />
              <span className="fact-sub muted" data-testid="container-opened">
                {data.containerOpened ? "Opened" : "Not opened"}
              </span>
            </dd>
          </div>
          <div>
            <dt>Arbiter</dt>
            <dd data-testid="arbiter">{hasArbiter ? <Value v={i.arbiter} label="arbiter address" /> : <span className="muted">None. After the due date the buyer can refund every unreleased milestone, including submitted ones.</span>}</dd>
          </div>
          {i.termsHash !== ZERO32 && (
            <div>
              <dt>Agreed scope hash</dt>
              <dd>
                <Value v={i.termsHash} label="scope hash" kind="hash" />
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

        {i.payToContainer && <WithdrawNote container={i.container} token={i.token} standIn={standIn} />}

        <h2 className="section-h">Timeline</h2>
        <Timeline data={data} txs={txs.data ?? []} />
        {txs.isError && <p className="muted small">Transaction links unavailable (the RPC log query failed). Times above come from contract state.</p>}

        <footer className="receipt-foot">
          <div className="print-only print-qr">
            <Qr value={link} size={112} label="QR code of this receipt link" />
          </div>
          <p className="muted small">
            Read live from {config.chain.name}. Unaudited. <span className="print-only mono break">{link}</span>
          </p>
        </footer>
      </article>

      <aside className="side no-print" aria-label="Receipt actions">
        {t && escrow.data && <InvoiceActions data={data} token={t} escrow={escrow.data} chainNow={chainNow} />}
        <ShareKit link={link} invoiceId={i.id} memo={i.memo} amount={t ? fmtAmount(i.totalAmount, t.decimals, t.symbol) : ""} chainName={config.chain.name} />
        {t && <SellerHistoryPanel data={data} decimals={t.decimals} symbol={t.symbol} />}
        {!hasArbiter && (i.state === 1 || i.state === 2) && <NoArbiterWarning context="receipt" />}
        <Warnings />
      </aside>
    </div>
  );
}

export default function InvoicePage({ idParam, demo = false }: { idParam: string; demo?: boolean }) {
  // `?escrow=demo` receipts belong to the testnet judge-mode escrow (DemoUSD). Never on mainnet builds.
  const target = demo && JUDGE_TARGET ? JUDGE_TARGET : REAL_TARGET;
  return (
    <QueryProvider>
      <EscrowTargetProvider target={target}>
        {demo && !JUDGE_TARGET ? (
          <div className="narrow">
            <EmptyState title="Demo receipts are testnet-only" testid="receipt-error">
              <p className="muted">This link points at the judge-mode escrow on X Layer testnet, which this build does not include.</p>
            </EmptyState>
          </div>
        ) : (
          <Receipt idParam={idParam} />
        )}
      </EscrowTargetProvider>
    </QueryProvider>
  );
}
