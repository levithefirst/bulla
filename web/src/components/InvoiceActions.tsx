import { useState } from "react";
import { erc20Abi, isHex, keccak256, toBytes, type Address, type Hex } from "viem";
import { bullaEscrowAbi } from "../abi/bullaEscrow";
import { config } from "../config";
import { fmtAmount, fmtDuration } from "../lib/format";
import { quoteFee, useAllowanceAndBalance, useInvalidateInvoice, type EscrowInfo, type Invoice, type TokenInfo } from "../lib/invoice";
import { useTx } from "../lib/useTx";
import { UnauditedWarning, CircuitHolderWarning } from "./Warnings";
import { useWallet } from "../lib/wallet";
import { sendWrite } from "../lib/write";
import { useEscrowTarget } from "../lib/escrowTarget";

type Props = { inv: Invoice; token: TokenInfo; escrow: EscrowInfo; chainNow: bigint };

const S = { Draft: 1, Funded: 2, Submitted: 3 } as const;

function useWrite() {
  const w = useWallet();
  const t = useEscrowTarget();
  return (functionName: "fundInvoice" | "releaseFunds" | "claimRefund" | "mutualCancel", id: bigint) =>
    sendWrite(w, { address: t.address!, abi: bullaEscrowAbi, functionName, args: [id] });
}

export function FundInvoiceButton({ inv, token, chainNow }: Props) {
  const w = useWallet();
  const target = useEscrowTarget();
  const ab = useAllowanceAndBalance(w.address, token.address);
  const write = useWrite();
  const invalidate = useInvalidateInvoice();
  const { run, busy } = useTx();
  const pastDue = chainNow >= inv.dueTimestamp;
  const allowance = ab.data?.allowance ?? 0n;
  const balance = ab.data?.balance;
  const needsApprove = allowance < inv.totalAmount;
  const short = balance !== undefined && balance < inv.totalAmount;
  const amt = fmtAmount(inv.totalAmount, token.decimals, token.symbol);

  return (
    <div className="action" data-testid="fund-panel">
      <h3>Fund this invoice</h3>
      <p>
        Deposit <strong className="num">{amt}</strong> into escrow. Two steps: approve the token, then fund.
      </p>
      <UnauditedWarning />
      <CircuitHolderWarning />
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
          disabled={busy || !needsApprove || pastDue || short}
          onClick={() =>
            run(`Approve ${amt}`, () => sendWrite(w, { address: token.address, abi: erc20Abi, functionName: "approve", args: [target.address!, inv.totalAmount] }), () => invalidate(inv.id))
          }
        >
          1 · {needsApprove ? `Approve ${amt}` : "Approved ✓"}
        </button>
        <button className={`btn ${!needsApprove ? "btn-primary" : ""}`} data-testid="fund-btn" disabled={busy || needsApprove || pastDue || short} onClick={() => run("Fund invoice", () => write("fundInvoice", inv.id), () => invalidate(inv.id))}>
          2 · Fund {amt}
        </button>
      </div>
    </div>
  );
}

export function SubmitDeliveryModal({ inv, chainNow }: Props) {
  const [open, setOpen] = useState(false);
  const [hashInput, setHashInput] = useState("");
  const [uri, setUri] = useState("");
  const w = useWallet();
  const target = useEscrowTarget();
  const invalidate = useInvalidateInvoice();
  const { run, busy } = useTx();
  const pastDue = chainNow >= inv.dueTimestamp;
  const resubmit = inv.state === S.Submitted;

  const input = hashInput.trim();
  const hash: Hex | null = !input ? null : isHex(input) && input.length === 66 ? (input as Hex) : keccak256(toBytes(input));

  return (
    <div className="action" data-testid="submit-panel">
      <h3>{resubmit ? "Update delivery" : "Submit delivery"}</h3>
      <p>Record a hash of what you delivered (and optionally a link). The buyer then reviews and releases.</p>
      {pastDue && <div className="error">The due date has passed; deliveries can no longer be submitted.</div>}
      <button className="btn btn-primary" data-testid="open-submit" disabled={pastDue} onClick={() => setOpen(true)}>
        {resubmit ? "Update delivery…" : "Submit delivery…"}
      </button>
      {open && (
        <div className="modal-backdrop" onClick={() => !busy && setOpen(false)}>
          <div className="modal card" role="dialog" aria-modal="true" aria-labelledby="submit-title" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === "Escape" && !busy && setOpen(false)}>
            <h3 id="submit-title">Submit delivery for invoice #{inv.id.toString()}</h3>
            <label>
              Delivery hash
              <input autoFocus className="mono" data-testid="delivery-hash" placeholder="0x… bytes32 (e.g. sha256/keccak of the file) or any text to hash" value={hashInput} onChange={(e) => setHashInput(e.target.value)} />
              {hash && hash !== input && <small className="muted mono">keccak256(text) = {hash}</small>}
            </label>
            <label>
              Artifact URI (optional)
              <input data-testid="delivery-uri" placeholder="ipfs://… or https://… or tape://…" value={uri} onChange={(e) => setUri(e.target.value)} />
            </label>
            <div className="row row-end">
              <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                data-testid="submit-delivery"
                disabled={!hash || busy}
                onClick={async () => {
                  const ok = await run(
                    "Submit delivery",
                    () => sendWrite(w, { address: target.address!, abi: bullaEscrowAbi, functionName: "submitDelivery", args: [inv.id, hash!, uri.trim()] }),
                    () => invalidate(inv.id),
                  );
                  if (ok) setOpen(false);
                }}
              >
                {busy ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReleaseFundsButton({ inv, token, escrow }: Props) {
  const [confirming, setConfirming] = useState(false);
  const write = useWrite();
  const invalidate = useInvalidateInvoice();
  const { run, busy } = useTx();
  const { fee, net } = quoteFee(inv.totalAmount, escrow.feeBps);
  const f = (v: bigint) => fmtAmount(v, token.decimals, token.symbol);

  return (
    <div className="action" data-testid="release-panel">
      <h3>Release funds to the seller</h3>
      <table className="kv">
        <tbody>
          <tr>
            <th>Escrowed</th>
            <td className="num">{f(inv.totalAmount)}</td>
          </tr>
          <tr>
            <th>Bulla fee ({(escrow.feeBps / 100).toFixed(2)}%)</th>
            <td className="num" data-testid="release-fee">{f(fee)}</td>
          </tr>
          <tr>
            <th>Seller receives</th>
            <td className="num" data-testid="release-net">
              <strong>{f(net)}</strong>
            </td>
          </tr>
        </tbody>
      </table>
      <UnauditedWarning />
      <CircuitHolderWarning />
      {inv.state === S.Funded && <div className="warn">No delivery has been submitted yet. Releasing now pays the seller anyway.</div>}
      {!confirming ? (
        <button className="btn btn-primary" data-testid="release-btn" onClick={() => setConfirming(true)}>
          Release {f(net)} to seller…
        </button>
      ) : (
        <div className="row">
          <button className="btn btn-ghost" onClick={() => setConfirming(false)} disabled={busy}>
            Back
          </button>
          <button className="btn btn-primary" data-testid="release-confirm" disabled={busy} onClick={() => run("Release funds", () => write("releaseFunds", inv.id), () => invalidate(inv.id))}>
            {busy ? "Releasing…" : "Confirm release (irreversible)"}
          </button>
        </div>
      )}
    </div>
  );
}

export function ClaimRefundButton({ inv, token }: Props) {
  const write = useWrite();
  const invalidate = useInvalidateInvoice();
  const { run, busy } = useTx();
  return (
    <div className="action" data-testid="refund-panel">
      <h3>Claim refund</h3>
      <p>The due date has passed without a release. You can take back the full {fmtAmount(inv.totalAmount, token.decimals, token.symbol)} (no fee).</p>
      <button className="btn btn-primary" data-testid="refund-btn" disabled={busy} onClick={() => run("Claim refund", () => write("claimRefund", inv.id), () => invalidate(inv.id))}>
        {busy ? "Refunding…" : "Claim refund"}
      </button>
    </div>
  );
}

export function MutualCancelButton({ inv, token, me }: Props & { me: "seller" | "buyer" }) {
  const write = useWrite();
  const invalidate = useInvalidateInvoice();
  const { run, busy } = useTx();
  const mine = me === "seller" ? inv.sellerCancelConsent : inv.buyerCancelConsent;
  const theirs = me === "seller" ? inv.buyerCancelConsent : inv.sellerCancelConsent;
  const funded = inv.state !== S.Draft;
  const other = me === "seller" ? "buyer" : "seller";
  return (
    <div className="action action-quiet" data-testid="cancel-panel">
      <h3>Mutual cancel</h3>
      <p className="muted">
        Needs both parties. {funded ? `On cancel the buyer gets the full ${fmtAmount(inv.totalAmount, token.decimals, token.symbol)} back, no fee.` : "Nothing is funded yet, so nothing moves."}
      </p>
      <p>
        Seller consent: <strong>{inv.sellerCancelConsent ? "yes" : "no"}</strong> · Buyer consent: <strong>{inv.buyerCancelConsent ? "yes" : "no"}</strong>
      </p>
      {mine ? (
        <p className="muted" data-testid="cancel-waiting">
          You consented. Waiting for the {other}.
        </p>
      ) : (
        <button className="btn" data-testid="cancel-btn" disabled={busy} onClick={() => run(theirs ? "Cancel invoice" : "Consent to cancel", () => write("mutualCancel", inv.id), () => invalidate(inv.id))}>
          {theirs ? `Confirm cancel${funded ? " and refund buyer" : ""}` : "Consent to cancel"}
        </button>
      )}
    </div>
  );
}

export function InvoiceActions(props: Props) {
  const { address, isConnected, wrongNetwork: wrong } = useWallet();
  const { inv, chainNow } = props;
  const eq = (a?: Address) => !!address && !!a && a.toLowerCase() === address.toLowerCase();
  const me = eq(inv.seller) ? "seller" : eq(inv.buyer) ? "buyer" : null;
  const open = inv.state === S.Draft || inv.state === S.Funded || inv.state === S.Submitted;
  const due = chainNow >= inv.dueTimestamp;

  if (!open) return null;
  if (config.mock) return <div className="card muted">Mock mode: actions are disabled.</div>;
  if (!isConnected) return <div className="card muted" data-testid="actions-connect">Connect the seller's or buyer's wallet to act on this invoice. Reading this receipt needs no wallet.</div>;
  if (wrong) return <div className="card muted">Switch your wallet to {config.chain.name} to act on this invoice.</div>;
  if (!me) return <div className="card muted" data-testid="actions-none">The connected wallet is neither the seller nor the buyer of this invoice.</div>;

  return (
    <section className="card actions" data-testid={`actions-${me}`}>
      <h2>Your actions ({me})</h2>
      <p className="muted">{due ? "Due date passed." : `Due in ${fmtDuration(Number(inv.dueTimestamp - chainNow))} (chain time).`}</p>
      {me === "buyer" && inv.state === S.Draft && <FundInvoiceButton {...props} />}
      {me === "seller" && (inv.state === S.Funded || inv.state === S.Submitted) && <SubmitDeliveryModal {...props} />}
      {me === "buyer" && (inv.state === S.Funded || inv.state === S.Submitted) && <ReleaseFundsButton {...props} />}
      {me === "buyer" && (inv.state === S.Funded || inv.state === S.Submitted) && due && <ClaimRefundButton {...props} />}
      {me === "seller" && inv.state === S.Draft && <p className="muted">Waiting for the buyer to fund. Share the receipt link.</p>}
      <MutualCancelButton {...props} me={me} />
    </section>
  );
}
