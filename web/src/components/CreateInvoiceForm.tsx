import { useId, useMemo, useState, type ReactNode } from "react";
import { decodeEventLog, getAddress, isAddress, isHex, keccak256, parseUnits, toBytes, type Address, type Hex } from "viem";
import { bullaEscrowAbi } from "../abi/bullaEscrow";
import { config } from "../config";
import { fmtAmount, fmtDuration, parseContainerId, ZERO32 } from "../lib/format";
import { quoteFee, useEscrowInfo, useTokenInfo, useChainNow } from "../lib/invoice";
import { client } from "../lib/client";
import { waitForReceipt } from "../../../shared/rpc";
import { useWallet } from "../lib/wallet";
import { sendWrite } from "../lib/write";
import { parseError } from "../lib/errors";
import { useToasts } from "./Toasts";
import { UnauditedWarning, CircuitHolderWarning } from "./Warnings";

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Field = "buyer" | "amount" | "due" | "container" | "deliveryHash" | "memo";

function FormField({ id, label, hint, error, children }: { id: string; label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <div className={`field${error ? " field-invalid" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p className="field-error" id={`${id}-err`}>
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function CreateInvoiceForm({ onCreated }: { onCreated: (id: bigint) => void }) {
  const w = useWallet();
  const escrow = useEscrowInfo();
  const token = useTokenInfo(escrow.data?.token ?? config.token);
  const now = useChainNow();
  const toasts = useToasts();
  const uid = useId();
  const fid = (f: Field) => `${uid}-${f}`;

  const [v, setV] = useState<Record<Field, string>>({
    buyer: "",
    amount: "",
    due: toLocalInput(new Date(Date.now() + 14 * 86400_000)),
    container: "",
    deliveryHash: "",
    memo: "",
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decimals = token.data?.decimals;
  const symbol = token.data?.symbol ?? config.tokenSymbolHint ?? "token";
  const feeBps = escrow.data?.feeBps ?? config.feeBpsHint;
  const set = (f: Field) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setV((x) => ({ ...x, [f]: e.target.value }));
    if (errors[f]) setErrors((x) => ({ ...x, [f]: undefined }));
  };

  const parsedAmount = useMemo(() => {
    if (decimals === undefined) return null;
    try {
      const a = parseUnits(v.amount.trim() || "0", decimals);
      return a > 0n ? a : null;
    } catch {
      return null;
    }
  }, [v.amount, decimals]);
  const dueTs = Math.floor(new Date(v.due).getTime() / 1000) || 0;
  const nowTs = Number(now.data ?? BigInt(Math.floor(Date.now() / 1000)));

  function validate(): { args: readonly [Address, Address, bigint, bigint, Hex, Hex, string] } | null {
    const e: Partial<Record<Field, string>> = {};
    const buyer = v.buyer.trim();
    if (!isAddress(buyer)) e.buyer = "Enter a valid 0x address (42 characters).";
    else if (w.address && getAddress(buyer) === w.address) e.buyer = "The buyer cannot be your own address.";
    if (!parsedAmount) e.amount = decimals === undefined ? "Token details are still loading." : "Enter an amount greater than zero.";
    if (!dueTs || dueTs <= nowTs) e.due = "Pick a time in the future.";
    const cid = parseContainerId(v.container);
    if (!cid || cid === ZERO32) e.container = "Paste the container address (0x + 40 hex) or a bytes32 id (0x + 64 hex).";
    setErrors(e);
    if (Object.keys(e).length || !escrow.data) return null;
    const d = v.deliveryHash.trim();
    const dh: Hex = !d ? ZERO32 : isHex(d) && d.length === 66 ? (d as Hex) : keccak256(toBytes(d));
    return { args: [getAddress(buyer), escrow.data.token, parsedAmount!, BigInt(dueTs), dh, cid!, v.memo.trim()] as const };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const valid = validate();
    if (!valid) {
      if (!escrow.data) setError("The escrow contract could not be reached.");
      return;
    }
    setBusy(true);
    const tid = toasts.push({ kind: "pending", title: "Create invoice: confirm in your wallet" });
    try {
      const hash = await sendWrite(w, { address: escrow.data!.address, abi: bullaEscrowAbi, functionName: "createInvoice", args: valid.args });
      toasts.update(tid, { kind: "pending", title: "Create invoice: pending", body: `tx ${hash.slice(0, 10)}…` });
      const receipt = await waitForReceipt(client, hash);
      if (receipt.status !== "success") throw new Error("createInvoice reverted on chain.");
      let id: bigint | null = null;
      for (const log of receipt.logs) {
        try {
          const ev = decodeEventLog({ abi: bullaEscrowAbi, data: log.data, topics: log.topics });
          if (ev.eventName === "InvoiceCreated") id = ev.args.id;
        } catch {
          /* another contract's log */
        }
      }
      if (id === null) throw new Error("Invoice created but the InvoiceCreated event was not found.");
      toasts.update(tid, { kind: "success", title: `Invoice #${id} created`, body: "Share the receipt link with your buyer." });
      onCreated(id);
    } catch (err) {
      const msg = parseError(err);
      toasts.update(tid, { kind: "error", title: "Create invoice failed", body: msg });
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  const blocked = !w.isConnected || w.wrongNetwork || busy || config.mock || !config.escrow;
  const q = parsedAmount ? quoteFee(parsedAmount, feeBps) : null;
  const f = (x: bigint) => (decimals !== undefined ? fmtAmount(x, decimals, symbol) : "-");
  const described = (fl: Field) => (errors[fl] ? `${fid(fl)}-err` : `${fid(fl)}-hint`);

  return (
    <div className="create-layout">
      <form className="card form" onSubmit={submit} noValidate data-testid="create-form" aria-labelledby={`${uid}-title`}>
        <header className="form-head">
          <p className="eyebrow-plain">New invoice</p>
          <h1 id={`${uid}-title`}>Create an invoice</h1>
          <p className="muted">You are the seller. The buyer funds it, you deliver, they release. If it is not released by the due date, the buyer can take a refund.</p>
        </header>

        {!config.escrow && (
          <div className="error" role="alert">
            BullaEscrow is not deployed on {config.chain.name} yet. Creating invoices is disabled until it is.
          </div>
        )}
        {escrow.isError && config.escrow && (
          <div className="error" role="alert">
            Cannot reach the escrow contract over RPC: {parseError(escrow.error)}
          </div>
        )}

        <fieldset>
          <legend>Who and how much</legend>
          <FormField id={fid("buyer")} label="Buyer address" hint="The only wallet that can fund, release, or refund." error={errors.buyer}>
            <input id={fid("buyer")} name="buyer" className="mono" placeholder="0x…" autoComplete="off" spellCheck={false} value={v.buyer} onChange={set("buyer")} aria-invalid={!!errors.buyer} aria-describedby={described("buyer")} required />
          </FormField>
          <FormField
            id={fid("amount")}
            label={`Amount (${symbol})`}
            hint={
              <>
                Token set by the escrow: <span className="mono">{escrow.data?.token ?? config.token ?? "-"}</span>
              </>
            }
            error={errors.amount}
          >
            <div className="input-affix">
              <input id={fid("amount")} name="amount" className="num" inputMode="decimal" placeholder="250.00" autoComplete="off" value={v.amount} onChange={set("amount")} aria-invalid={!!errors.amount} aria-describedby={described("amount")} required />
              <span className="affix" aria-hidden="true">
                {symbol}
              </span>
            </div>
          </FormField>
          <FormField id={fid("due")} label="Due date and refund time-lock" hint="After this time the buyer can reclaim funds unless they were released. Leave room to review the delivery." error={errors.due}>
            <input id={fid("due")} name="due" type="datetime-local" className="num" value={v.due} onChange={set("due")} aria-invalid={!!errors.due} aria-describedby={described("due")} required />
          </FormField>
        </fieldset>

        <fieldset>
          <legend>Identity and scope</legend>
          <FormField id={fid("container")} label="Circuit container id" hint="Your TapeOut circuit container address. It is stored on chain and shown on the receipt." error={errors.container}>
            <input id={fid("container")} name="container" className="mono" placeholder="0x… TapeOut container address" autoComplete="off" spellCheck={false} value={v.container} onChange={set("container")} aria-invalid={!!errors.container} aria-describedby={described("container")} required />
          </FormField>
          <FormField id={fid("memo")} label="Description" hint="Shown on the public receipt. Up to 140 characters.">
            <input id={fid("memo")} name="memo" maxLength={140} placeholder="Logo design, milestone 1" value={v.memo} onChange={set("memo")} aria-describedby={described("memo")} />
          </FormField>
          <FormField id={fid("deliveryHash")} label="Agreed deliverable hash (optional)" hint="A bytes32, or any text (it is hashed). Replaced when you submit the delivery.">
            <input id={fid("deliveryHash")} name="deliveryHash" className="mono" placeholder="0x… or text" autoComplete="off" spellCheck={false} value={v.deliveryHash} onChange={set("deliveryHash")} aria-describedby={described("deliveryHash")} />
          </FormField>
        </fieldset>

        <div className="warn-stack">
          <UnauditedWarning />
          <CircuitHolderWarning />
        </div>
        {error && (
          <div className="error" data-testid="form-error" role="alert">
            {error}
          </div>
        )}
        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={blocked} data-testid="create-submit">
          {busy ? "Creating…" : !w.isConnected ? "Connect a wallet to create" : w.wrongNetwork ? `Switch to ${config.chain.name}` : "Create invoice"}
        </button>
      </form>

      <aside className="card summary" aria-labelledby={`${uid}-sum`}>
        <h2 id={`${uid}-sum`}>Summary</h2>
        <dl className="lines">
          <div>
            <dt>Buyer deposits</dt>
            <dd className="num">{q ? f(parsedAmount!) : "-"}</dd>
          </div>
          <div>
            <dt>Fee on release ({(feeBps / 100).toFixed(2)}%)</dt>
            <dd className="num">{q ? f(q.fee) : "-"}</dd>
          </div>
          <div className="lines-total">
            <dt>You receive on release</dt>
            <dd className="num">{q ? f(q.net) : "-"}</dd>
          </div>
          <div>
            <dt>Refund opens</dt>
            <dd className="num">{dueTs > nowTs ? `in ${fmtDuration(dueTs - nowTs)}` : "-"}</dd>
          </div>
        </dl>
        <h3>What happens next</h3>
        <ol className="next-steps">
          <li>You get a receipt link to send to the buyer.</li>
          <li>The buyer approves {symbol} and funds the escrow.</li>
          <li>You deliver and submit the delivery hash.</li>
          <li>The buyer releases, or is refunded after the due date.</li>
        </ol>
      </aside>
    </div>
  );
}
