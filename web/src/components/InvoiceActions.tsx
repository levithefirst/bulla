import { useState } from "react";
import { erc20Abi, isHex, keccak256, toBytes, type Address, type Hex } from "viem";
import { bullaEscrowAbi } from "../abi/bullaEscrow";
import { config, explorerAddress } from "../config";
import { fmtAmount, fmtDuration, shortAddr } from "../lib/format";
import { quoteFee, useAllowanceAndBalance, useInvalidateInvoice, ZERO_ADDR, type EscrowInfo, type InvoiceData, type TokenInfo } from "../lib/invoice";
import { useTx } from "../lib/useTx";
import { useWallet } from "../lib/wallet";
import { sendWrite } from "../lib/write";
import { useEscrowTarget } from "../lib/escrowTarget";
import { notifyCounterparty } from "../lib/notify";
import { UnauditedWarning, CircuitHolderWarning } from "./Warnings";

type Props = { data: InvoiceData; token: TokenInfo; escrow: EscrowInfo; chainNow: bigint };
type Role = "seller" | "buyer" | "arbiter";

const S = { Draft: 1, Funded: 2 } as const;
const M = { Pending: 0, Submitted: 1 } as const;

function useEscrowWrite() {
  const w = useWallet();
  const t = useEscrowTarget();
  return {
    one: (functionName: "claimRefund" | "mutualCancel" | "revokeCancelConsent", id: bigint) => sendWrite(w, { address: t.address!, abi: bullaEscrowAbi, functionName, args: [id] }),
    ms: (functionName: "releaseMilestone" | "arbiterRelease" | "arbiterRefund", id: bigint, index: number) => sendWrite(w, { address: t.address!, abi: bullaEscrowAbi, functionName, args: [id, BigInt(index)] }),
  };
}

function PayeeLine({ data }: { data: InvoiceData }) {
  const to = data.payoutTarget;
  const href = explorerAddress(to);
  return (
    <p className="muted small" data-testid="payee-line">
      Paid to {data.invoice.payToContainer ? "the seller's TapeOut container" : "the circuit holder"}{" "}
      {href ? (
        <a className="mono" href={href} target="_blank" rel="noreferrer">
          {shortAddr(to)}
        </a>
      ) : (
        <span className="mono">{shortAddr(to)}</span>
      )}
    </p>
  );
}

export function FundInvoiceButton({ data, token, chainNow }: Props) {
  const inv = data.invoice;
  const w = useWallet();
  const target = useEscrowTarget();
  const ab = useAllowanceAndBalance(w.address, token.address);
  const invalidate = useInvalidateInvoice();
  const { run, busy } = useTx();
  const [accepted, setAccepted] = useState(false);
  const hasArbiter = inv.arbiter !== ZERO_ADDR;
  const pastDue = chainNow >= inv.dueTimestamp;
  const allowance = ab.data?.allowance ?? 0n;
  const balance = ab.data?.balance;
  const needsApprove = allowance < inv.totalAmount;
  const short = balance !== undefined && balance < inv.totalAmount;
  const amt = fmtAmount(inv.totalAmount, token.decimals, token.symbol);
  const blocked = pastDue || short || (hasArbiter && !accepted);

  return (
    <div className="action" data-testid="fund-panel">
      <h3>Fund this invoice</h3>
      <p>
        Deposit <strong className="num">{amt}</strong> for all {inv.milestoneCount} milestone{inv.milestoneCount > 1 ? "s" : ""}. You release each milestone separately. Two steps: approve the token, then fund.
      </p>
      <UnauditedWarning />
      <CircuitHolderWarning />
      {hasArbiter && (
        <label className="toggle" data-testid="arbiter-accept">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
          <span>
            I accept <span className="mono">{shortAddr(inv.arbiter)}</span> as arbiter. They can release or refund a submitted milestone. They take no fee.
          </span>
        </label>
      )}
      {balance !== undefined && (
        <p className="muted">
          Your balance: <span className="num">{fmtAmount(balance, token.decimals, token.symbol)}</span> · approved: <span className="num">{fmtAmount(allowance, token.decimals, token.symbol)}</span>
        </p>
      )}
      {short && <div className="error">Not enough {token.symbol} to fund.</div>}
      {pastDue && <div className="error">The due date has passed; this invoice can no longer be funded.</div>}
      <div className="steps">
        <button
          className={`btn ${needsApprove ? "btn-primary" : ""}`}
          data-testid="approve-btn"
          disabled={busy || !needsApprove || blocked}
          onClick={() => run(`Approve ${amt}`, () => sendWrite(w, { address: token.address, abi: erc20Abi, functionName: "approve", args: [target.address!, inv.totalAmount] }), () => invalidate(inv.id))}
        >
          1 · {needsApprove ? `Approve ${amt}` : "Approved ✓"}
        </button>
        <button
          className={`btn ${!needsApprove ? "btn-primary" : ""}`}
          data-testid="fund-btn"
          disabled={busy || needsApprove || blocked}
          onClick={() =>
            run(
              "Fund invoice",
              () => sendWrite(w, { address: target.address!, abi: bullaEscrowAbi, functionName: "fundInvoice", args: [inv.id, inv.arbiter] }),
              () => {
                invalidate(inv.id);
                void notifyCounterparty({ kind: "invoiceFunded", invoiceId: inv.id, to: inv.seller });
              },
            )
          }
        >
          2 · Fund {amt}
        </button>
      </div>
    </div>
  );
}

function SubmitModal({ data, index, onClose }: { data: InvoiceData; index: number; onClose: () => void }) {
  const inv = data.invoice;
  const m = data.milestones[index];
  const [hashInput, setHashInput] = useState("");
  const [uri, setUri] = useState("");
  const w = useWallet();
  const target = useEscrowTarget();
  const invalidate = useInvalidateInvoice();
  const { run, busy } = useTx();
  const input = hashInput.trim();
  const hash: Hex | null = !input ? null : isHex(input) && input.length === 66 ? (input as Hex) : keccak256(toBytes(input));
  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <div className="modal card" role="dialog" aria-modal="true" aria-labelledby="submit-title" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === "Escape" && !busy && onClose()}>
        <h3 id="submit-title">
          Submit milestone {index + 1}: {m.label}
        </h3>
        <label>
          Delivery hash
          <input autoFocus className="mono" data-testid="delivery-hash" placeholder="0x… bytes32 (e.g. sha256 of the file) or any text to hash" value={hashInput} onChange={(e) => setHashInput(e.target.value)} />
          {hash && hash !== input && <small className="muted mono">keccak256(text) = {hash}</small>}
        </label>
        <label>
          Artifact URI (optional)
          <input data-testid="delivery-uri" placeholder="ipfs://… or https://… or tape://…" value={uri} onChange={(e) => setUri(e.target.value)} />
        </label>
        <div className="row row-end">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            data-testid="submit-delivery"
            disabled={!hash || busy}
            onClick={async () => {
              const ok = await run(
                `Submit milestone ${index + 1}`,
                () => sendWrite(w, { address: target.address!, abi: bullaEscrowAbi, functionName: "submitMilestone", args: [inv.id, BigInt(index), hash!, uri.trim()] }),
                () => {
                  invalidate(inv.id);
                  void notifyCounterparty({ kind: "milestoneSubmitted", invoiceId: inv.id, index, to: inv.buyer });
                },
              );
              if (ok) onClose();
            }}
          >
            {busy ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MilestoneAction({ data, token, escrow, chainNow, index, role }: Props & { index: number; role: Role }) {
  const inv = data.invoice;
  const m = data.milestones[index];
  const write = useEscrowWrite();
  const invalidate = useInvalidateInvoice();
  const { run, busy } = useTx();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const pastDue = chainNow >= inv.dueTimestamp;
  const { fee, net } = quoteFee(m.amount, escrow.feeBps);
  const f = (v: bigint) => fmtAmount(v, token.decimals, token.symbol);
  const open = m.state === M.Pending || m.state === M.Submitted;
  if (!open) return null;

  return (
    <li className="ms-action" data-testid={`ms-action-${index}`}>
      <div className="row-between">
        <strong>
          {index + 1}. {m.label}
        </strong>
        <span className="num">{f(m.amount)}</span>
      </div>
      {role === "seller" && (
        <>
          <button className="btn btn-sm" data-testid={`open-submit-${index}`} disabled={pastDue} onClick={() => setSubmitting(true)}>
            {m.state === M.Submitted ? "Update delivery…" : "Submit delivery…"}
          </button>
          {pastDue && <p className="muted small">The due date has passed; deliveries can no longer be submitted.</p>}
          {submitting && <SubmitModal data={data} index={index} onClose={() => setSubmitting(false)} />}
        </>
      )}
      {role === "buyer" && (
        <div data-testid={`release-panel-${index}`}>
          <p className="muted small">
            Fee <span className="num" data-testid={`release-fee-${index}`}>{f(fee)}</span> · paid out <span className="num" data-testid={`release-net-${index}`}>{f(net)}</span>
            {m.state === M.Pending && " · not submitted yet"}
          </p>
          {!confirming ? (
            <button className="btn btn-primary btn-sm" data-testid={`release-btn-${index}`} onClick={() => setConfirming(true)}>
              Release {f(net)}…
            </button>
          ) : (
            <div className="confirm">
              <PayeeLine data={data} />
              <UnauditedWarning />
              <div className="row">
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)} disabled={busy}>
                  Back
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  data-testid={`release-confirm-${index}`}
                  disabled={busy}
                  onClick={() =>
                    run(`Release milestone ${index + 1}`, () => write.ms("releaseMilestone", inv.id, index), () => {
                      invalidate(inv.id);
                      void notifyCounterparty({ kind: "milestoneReleased", invoiceId: inv.id, index, to: inv.seller });
                    })
                  }
                >
                  {busy ? "Releasing…" : "Confirm release (irreversible)"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {role === "arbiter" && m.state === M.Submitted && (
        <div className="row" data-testid={`arbiter-panel-${index}`}>
          <button className="btn btn-sm" disabled={busy} onClick={() => run(`Arbiter release ${index + 1}`, () => write.ms("arbiterRelease", inv.id, index), () => invalidate(inv.id))} data-testid={`arbiter-release-${index}`}>
            Release to seller
          </button>
          <button className="btn btn-sm" disabled={busy} onClick={() => run(`Arbiter refund ${index + 1}`, () => write.ms("arbiterRefund", inv.id, index), () => invalidate(inv.id))} data-testid={`arbiter-refund-${index}`}>
            Refund to buyer
          </button>
        </div>
      )}
      {role === "arbiter" && m.state === M.Pending && <p className="muted small">Waiting for the seller to submit.</p>}
    </li>
  );
}

export function ClaimRefundButton({ data, token }: Props) {
  const inv = data.invoice;
  const write = useEscrowWrite();
  const invalidate = useInvalidateInvoice();
  const { run, busy } = useTx();
  const unresolved = data.milestones.filter((m) => m.state === M.Pending || m.state === M.Submitted).reduce((a, m) => a + m.amount, 0n);
  return (
    <div className="action" data-testid="refund-panel">
      <h3>Claim refund</h3>
      <p>The due date has passed. You can take back the unreleased {fmtAmount(unresolved, token.decimals, token.symbol)} (no fee). Released milestones stay paid.</p>
      <button className="btn btn-primary" data-testid="refund-btn" disabled={busy} onClick={() => run("Claim refund", () => write.one("claimRefund", inv.id), () => invalidate(inv.id))}>
        {busy ? "Refunding…" : "Claim refund"}
      </button>
    </div>
  );
}

export function MutualCancelButton({ data, token, me }: Props & { me: "seller" | "buyer" }) {
  const inv = data.invoice;
  const write = useEscrowWrite();
  const invalidate = useInvalidateInvoice();
  const { run, busy } = useTx();
  const mine = me === "seller" ? inv.sellerCancelConsent : inv.buyerCancelConsent;
  const theirs = me === "seller" ? inv.buyerCancelConsent : inv.sellerCancelConsent;
  const funded = inv.state === S.Funded;
  const remainder = data.milestones.filter((m) => m.state === M.Pending || m.state === M.Submitted).reduce((a, m) => a + m.amount, 0n);
  const other = me === "seller" ? "buyer" : "seller";
  return (
    <div className="action action-quiet" data-testid="cancel-panel">
      <h3>Mutual cancel</h3>
      <p className="muted">Needs both parties. Consent given before funding is cleared when the buyer funds. {funded ? `The buyer gets the unreleased ${fmtAmount(remainder, token.decimals, token.symbol)} back, no fee.` : "Nothing is funded yet, so nothing moves."}</p>
      <p>
        Seller consent: <strong>{inv.sellerCancelConsent ? "yes" : "no"}</strong> · Buyer consent: <strong>{inv.buyerCancelConsent ? "yes" : "no"}</strong>
      </p>
      {mine ? (
        <>
          <p className="muted" data-testid="cancel-waiting">
            You consented. Waiting for the {other}.
          </p>
          <button className="btn" data-testid="cancel-revoke" disabled={busy} onClick={() => run("Withdraw cancel consent", () => write.one("revokeCancelConsent", inv.id), () => invalidate(inv.id))}>
            Withdraw my consent
          </button>
        </>
      ) : (
        <button className="btn" data-testid="cancel-btn" disabled={busy} onClick={() => run(theirs ? "Cancel invoice" : "Consent to cancel", () => write.one("mutualCancel", inv.id), () => invalidate(inv.id))}>
          {theirs ? `Confirm cancel${funded ? " and refund the remainder" : ""}` : "Consent to cancel"}
        </button>
      )}
    </div>
  );
}

export function InvoiceActions(props: Props) {
  const { address, isConnected, wrongNetwork } = useWallet();
  const inv = props.data.invoice;
  const eq = (a?: Address) => !!address && !!a && a !== ZERO_ADDR && a.toLowerCase() === address.toLowerCase();
  const roles: Role[] = [eq(inv.seller) && "seller", eq(inv.buyer) && "buyer", eq(inv.arbiter) && "arbiter"].filter(Boolean) as Role[];
  const role = roles[0];
  const open = inv.state === S.Draft || inv.state === S.Funded;
  const due = props.chainNow >= inv.dueTimestamp;

  if (!open) return null;
  if (config.mock) return <div className="card muted">Mock mode: actions are disabled.</div>;
  if (!isConnected) return <div className="card muted" data-testid="actions-connect">Connect the seller's, buyer's or arbiter's wallet to act on this invoice. Reading this receipt needs no wallet.</div>;
  if (wrongNetwork) return <div className="card muted">Switch your wallet to {config.chain.name} to act on this invoice.</div>;
  if (!role) return <div className="card muted" data-testid="actions-none">The connected wallet is not the seller, buyer or arbiter of this invoice.</div>;

  return (
    <section className="card actions" data-testid={`actions-${role}`}>
      <h2>Your actions ({role})</h2>
      <p className="muted">{due ? "Due date passed." : `Due in ${fmtDuration(Number(inv.dueTimestamp - props.chainNow))} (chain time).`}</p>
      {role === "buyer" && inv.state === S.Draft && <FundInvoiceButton {...props} />}
      {role === "seller" && inv.state === S.Draft && <p className="muted">Waiting for the buyer to fund. Share the receipt link.</p>}
      {inv.state === S.Funded && (
        <div className="action">
          <h3>Milestones</h3>
          {role === "buyer" && <PayeeLine data={props.data} />}
          <ol className="ms-actions">
            {props.data.milestones.map((_, i) => (
              <MilestoneAction key={i} {...props} index={i} role={role} />
            ))}
          </ol>
        </div>
      )}
      {role === "buyer" && inv.state === S.Funded && due && <ClaimRefundButton {...props} />}
      {(role === "seller" || role === "buyer") && <MutualCancelButton {...props} me={role} />}
    </section>
  );
}
