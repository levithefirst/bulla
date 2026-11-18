import { useId, useMemo, useState, type ReactNode } from "react";
import { decodeEventLog, getAddress, isAddress, isHex, keccak256, parseUnits, toBytes, type Hex } from "viem";
import { bullaEscrowAbi } from "../abi/bullaEscrow";
import { mockProcessorAbi } from "../abi/mockProcessor";
import { config, explorerAddress } from "../config";
import { fmtAmount, fmtDuration, shortAddr, ZERO32 } from "../lib/format";
import { quoteFee, useEscrowInfo, useTokenInfo, useChainNow, ZERO_ADDR } from "../lib/invoice";
import { useCircuitCheck } from "../lib/circuit";
import { client } from "../lib/client";
import { waitForReceipt } from "../../../shared/rpc";
import { useWallet } from "../lib/wallet";
import { sendWrite } from "../lib/write";
import { parseError } from "../lib/errors";
import { notifyCounterparty } from "../lib/notify";
import { useToasts } from "./Toasts";
import { UnauditedWarning, CircuitHolderWarning } from "./Warnings";

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Field = "buyer" | "due" | "circuit" | "arbiter" | "milestones" | "deliveryHash" | "memo";
type Row = { label: string; amount: string };
const MAX_MILESTONES = 10;

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
  const fid = (f: string) => `${uid}-${f}`;
  const standIn = !!config.tapeout?.standIn;

  const [buyer, setBuyer] = useState("");
  const [rows, setRows] = useState<Row[]>([{ label: "", amount: "" }]);
  const [due, setDue] = useState(() => toLocalInput(new Date(Date.now() + 14 * 86400_000)));
  const [processor, setProcessor] = useState(config.tapeout?.processor ?? "");
  const [circuitId, setCircuitId] = useState("");
  const [payToContainer, setPayToContainer] = useState(false);
  const [arbiter, setArbiter] = useState("");
  const [deliveryHash, setDeliveryHash] = useState("");
  const [memo, setMemo] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [busy, setBusy] = useState(false);
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decimals = token.data?.decimals;
  const symbol = token.data?.symbol ?? config.tokenSymbolHint ?? "token";
  const feeBps = escrow.data?.feeBps ?? config.feeBpsHint;
  const circuit = useCircuitCheck({ factory: escrow.data?.factory, opener: escrow.data?.opener, processorInput: processor, circuitId, account: w.address });
  const c = circuit.data;

  const parsed = useMemo(
    () =>
      rows.map((r) => {
        if (decimals === undefined) return null;
        try {
          const a = parseUnits(r.amount.trim() || "0", decimals);
          return a > 0n ? a : null;
        } catch {
          return null;
        }
      }),
    [rows, decimals],
  );
  const amounts = parsed.every((x) => x !== null) ? (parsed as bigint[]) : null;
  const total = amounts ? amounts.reduce((acc, x) => acc + x, 0n) : null;
  const totalFee = amounts ? amounts.reduce((acc, x) => acc + quoteFee(x, feeBps).fee, 0n) : null;
  const dueTs = Math.floor(new Date(due).getTime() / 1000) || 0;
  const nowTs = Number(now.data ?? BigInt(Math.floor(Date.now() / 1000)));
  const f = (x: bigint) => (decimals !== undefined ? fmtAmount(x, decimals, symbol) : "-");
  const clearErr = (k: Field) => errors[k] && setErrors((x) => ({ ...x, [k]: undefined }));

  function setRow(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));
    clearErr("milestones");
  }

  function validate() {
    const e: Partial<Record<Field, string>> = {};
    const b = buyer.trim();
    if (!isAddress(b)) e.buyer = "Enter a valid 0x address (42 characters).";
    else if (w.address && getAddress(b) === w.address) e.buyer = "The buyer cannot be your own address.";
    if (decimals === undefined) e.milestones = "Token details are still loading.";
    else if (rows.some((r) => !r.label.trim())) e.milestones = "Give every milestone a short label.";
    else if (rows.some((r) => new TextEncoder().encode(r.label.trim()).length > 80)) e.milestones = "Labels can be at most 80 bytes.";
    else if (parsed.some((x) => x === null)) e.milestones = "Every milestone needs an amount greater than zero.";
    if (!dueTs || dueTs <= nowTs) e.due = "Pick a time in the future.";
    if (!c) e.circuit = circuit.isFetching ? "Still checking the circuit on chain." : "Enter your TapeOut processor and circuit #ID.";
    else if (!c.ok) e.circuit = c.reason;
    else if (!c.youHold) e.circuit = `Circuit #${circuitId} is held by ${shortAddr(c.holder)}, not the connected wallet. Only the holder can bill with it.`;
    const a = arbiter.trim();
    if (a) {
      if (!isAddress(a)) e.arbiter = "Enter a valid 0x address, or leave it empty.";
      else if (isAddress(b) && getAddress(a) === getAddress(b)) e.arbiter = "The arbiter cannot be the buyer.";
      else if (w.address && getAddress(a) === w.address) e.arbiter = "The arbiter cannot be you.";
    }
    setErrors(e);
    if (Object.keys(e).length || !escrow.data || !c || !c.ok) return null;
    const d = deliveryHash.trim();
    const termsHash: Hex = !d ? ZERO32 : isHex(d) && d.length === 66 ? (d as Hex) : keccak256(toBytes(d));
    return {
      buyer: getAddress(b),
      token: escrow.data.token,
      amounts: parsed as bigint[],
      labels: rows.map((r) => r.label.trim()),
      dueTimestamp: BigInt(dueTs),
      processor: c.processor,
      circuitId: BigInt(circuitId.trim()),
      payToContainer,
      arbiter: a ? getAddress(a) : ZERO_ADDR,
      termsHash,
      memo: memo.trim(),
    } as const;
  }

  async function mintStandIn() {
    if (!config.tapeout?.processor) return;
    setMinting(true);
    const tid = toasts.push({ kind: "pending", title: "Mint stand-in circuit: confirm in your wallet" });
    try {
      const hash = await sendWrite(w, { address: config.tapeout.processor, abi: mockProcessorAbi, functionName: "mint", args: [] });
      const r = await waitForReceipt(client, hash);
      for (const log of r.logs) {
        try {
          const ev = decodeEventLog({ abi: mockProcessorAbi, data: log.data, topics: log.topics });
          if (ev.eventName === "Transfer") setCircuitId(String(ev.args.tokenId));
        } catch {
          /* other log */
        }
      }
      toasts.update(tid, { kind: "success", title: "Stand-in circuit minted", body: "Testnet stand-in for TapeOut, not a real TapeOut circuit." });
    } catch (e) {
      toasts.update(tid, { kind: "error", title: "Mint failed", body: parseError(e) });
    } finally {
      setMinting(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const p = validate();
    if (!p) {
      if (!escrow.data) setError("The escrow contract could not be reached.");
      return;
    }
    setBusy(true);
    const tid = toasts.push({ kind: "pending", title: "Create invoice: confirm in your wallet" });
    try {
      const hash = await sendWrite(w, { address: escrow.data!.address, abi: bullaEscrowAbi, functionName: "createInvoice", args: [p] });
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
      void notifyCounterparty({ kind: "invoiceCreated", invoiceId: id, to: p.buyer });
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
  const described = (k: string, hasErr: boolean) => (hasErr ? `${fid(k)}-err` : `${fid(k)}-hint`);
  const payee = c && c.ok ? (payToContainer ? c.container : c.holder) : null;

  return (
    <div className="create-layout">
      <form className="card form" onSubmit={submit} noValidate data-testid="create-form" aria-labelledby={`${uid}-title`}>
        <header className="form-head">
          <p className="eyebrow-plain">New invoice</p>
          <h1 id={`${uid}-title`}>Create a milestone invoice</h1>
          <p className="muted">The buyer funds every milestone up front. You deliver and submit each one, the buyer releases each one. Anything not released by the due date goes back to the buyer.</p>
        </header>

        {!config.escrow && (
          <div className="error" role="alert">
            BullaEscrow is not deployed on {config.chain.name} yet. Creating invoices is disabled until it is.
          </div>
        )}
        {escrow.isError && config.escrow && (
          <div className="error" role="alert">
            Cannot use the escrow contract: {parseError(escrow.error)}
          </div>
        )}

        <fieldset>
          <legend>Your TapeOut circuit</legend>
          {standIn && (
            <p className="tag tag-demo" data-testid="standin-label">
              {config.chain.name}: testnet stand-in for TapeOut (TapeOut has no testnet deployment)
            </p>
          )}
          <div className="grid-2">
            <FormField id={fid("processor")} label="Processor" hint={standIn ? "Stand-in processor, prefilled." : "TapeOut processor address, or its processor number."}>
              <input id={fid("processor")} name="processor" className="mono" placeholder="0x… or 344" autoComplete="off" spellCheck={false} value={processor} onChange={(e) => (setProcessor(e.target.value), clearErr("circuit"))} />
            </FormField>
            <FormField id={fid("circuit")} label="Circuit #ID" error={errors.circuit} hint="The circuit NFT you hold.">
              <input id={fid("circuit")} name="circuitId" className="num" inputMode="numeric" placeholder="1" autoComplete="off" value={circuitId} onChange={(e) => (setCircuitId(e.target.value), clearErr("circuit"))} aria-invalid={!!errors.circuit} aria-describedby={described("circuit", !!errors.circuit)} />
            </FormField>
          </div>
          {standIn && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={mintStandIn} disabled={minting || !w.isConnected || w.wrongNetwork} data-testid="mint-standin">
              {minting ? "Minting…" : "Mint a stand-in circuit (testnet only)"}
            </button>
          )}
          <div className="circuit-check" aria-live="polite" data-testid="circuit-check">
            {circuit.isFetching && <span className="muted">Checking ownerOf on chain…</span>}
            {!circuit.isFetching && c && !c.ok && <span className="field-error">{c.reason}</span>}
            {!circuit.isFetching && c && c.ok && (
              <>
                {c.youHold ? (
                  <span className="check-ok" data-testid="circuit-ok">
                    You hold circuit #{circuitId}
                  </span>
                ) : (
                  <span className="field-error">Circuit #{circuitId} is held by {shortAddr(c.holder)}{w.address ? ", not you" : ". Connect the holder's wallet"}.</span>
                )}
                <span className="muted small">
                  Container{" "}
                  {explorerAddress(c.container) ? (
                    <a className="mono" href={explorerAddress(c.container)!} target="_blank" rel="noreferrer" data-testid="container-address">
                      {c.container}
                    </a>
                  ) : (
                    <span className="mono" data-testid="container-address">
                      {c.container}
                    </span>
                  )}
                  {c.opened === false && " · not opened yet"}
                </span>
              </>
            )}
          </div>
          <label className="toggle">
            <input type="checkbox" name="payToContainer" checked={payToContainer} onChange={(e) => setPayToContainer(e.target.checked)} data-testid="pay-to-container" />
            <span>
              <strong>Pay into my TapeOut container</strong>
              <span className="muted small">
                {" "}
                Releases go to the circuit's container instead of your wallet, so receivables follow the circuit. Whether a container can send USDC back out is not confirmed yet (docs/research.md §8): only use this if you can
                withdraw from it.
              </span>
            </span>
          </label>
        </fieldset>

        <fieldset>
          <legend>Milestones</legend>
          <ol className="ms-editor" data-testid="milestones-editor">
            {rows.map((r, i) => (
              <li key={i} className="ms-row">
                <span className="ms-n num" aria-hidden="true">
                  {i + 1}
                </span>
                <input name={`label-${i}`} aria-label={`Milestone ${i + 1} label`} placeholder={i === 0 ? "Wireframes" : "Next deliverable"} maxLength={80} value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} />
                <div className="input-affix ms-amount">
                  <input name={`amount-${i}`} aria-label={`Milestone ${i + 1} amount in ${symbol}`} className="num" inputMode="decimal" placeholder="100.00" value={r.amount} onChange={(e) => setRow(i, { amount: e.target.value })} />
                  <span className="affix" aria-hidden="true">
                    {symbol}
                  </span>
                </div>
                <button type="button" className="copy-btn" aria-label={`Remove milestone ${i + 1}`} disabled={rows.length === 1} onClick={() => setRows((rs) => rs.filter((_, k) => k !== i))}>
                  ×
                </button>
              </li>
            ))}
          </ol>
          {errors.milestones && <p className="field-error">{errors.milestones}</p>}
          <button type="button" className="btn btn-ghost btn-sm" disabled={rows.length >= MAX_MILESTONES} onClick={() => setRows((rs) => [...rs, { label: "", amount: "" }])} data-testid="add-milestone">
            Add milestone ({rows.length}/{MAX_MILESTONES})
          </button>
        </fieldset>

        <fieldset>
          <legend>Who and when</legend>
          <FormField id={fid("buyer")} label="Buyer address" hint="The only wallet that can fund, release, or claim the refund." error={errors.buyer}>
            <input id={fid("buyer")} name="buyer" className="mono" placeholder="0x…" autoComplete="off" spellCheck={false} value={buyer} onChange={(e) => (setBuyer(e.target.value), clearErr("buyer"))} aria-invalid={!!errors.buyer} aria-describedby={described("buyer", !!errors.buyer)} />
          </FormField>
          <FormField id={fid("due")} label="Due date and refund time-lock" hint="After this, anything not released can be refunded to the buyer. Leave review time." error={errors.due}>
            <input id={fid("due")} name="due" type="datetime-local" className="num" value={due} onChange={(e) => (setDue(e.target.value), clearErr("due"))} aria-invalid={!!errors.due} aria-describedby={described("due", !!errors.due)} />
          </FormField>
          <FormField id={fid("arbiter")} label="Arbiter (optional)" hint="Someone both sides trust. The buyer accepts them when funding. They can release or refund a submitted milestone, and take no fee." error={errors.arbiter}>
            <input id={fid("arbiter")} name="arbiter" className="mono" placeholder="0x… or leave empty" autoComplete="off" spellCheck={false} value={arbiter} onChange={(e) => (setArbiter(e.target.value), clearErr("arbiter"))} aria-invalid={!!errors.arbiter} aria-describedby={described("arbiter", !!errors.arbiter)} />
          </FormField>
          <FormField id={fid("memo")} label="Description" hint="Shown on the public receipt. Up to 140 characters.">
            <input id={fid("memo")} name="memo" maxLength={140} placeholder="Logo design" value={memo} onChange={(e) => setMemo(e.target.value)} />
          </FormField>
          <FormField id={fid("terms")} label="Agreed scope hash (optional)" hint="A bytes32, or any text (it is hashed).">
            <input id={fid("terms")} name="deliveryHash" className="mono" placeholder="0x… or text" autoComplete="off" spellCheck={false} value={deliveryHash} onChange={(e) => setDeliveryHash(e.target.value)} />
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
            <dt>Buyer deposits ({rows.length} milestone{rows.length > 1 ? "s" : ""})</dt>
            <dd className="num">{total !== null ? f(total) : "-"}</dd>
          </div>
          <div>
            <dt>Fees if all released ({(feeBps / 100).toFixed(2)}% each)</dt>
            <dd className="num">{totalFee !== null ? f(totalFee) : "-"}</dd>
          </div>
          <div className="lines-total">
            <dt>Paid out if all released</dt>
            <dd className="num">{total !== null && totalFee !== null ? f(total - totalFee) : "-"}</dd>
          </div>
          <div>
            <dt>Paid to</dt>
            <dd className="mono small">{payee ? `${payToContainer ? "container " : "circuit holder "}${shortAddr(payee)}` : "-"}</dd>
          </div>
          <div>
            <dt>Refund opens</dt>
            <dd className="num">{dueTs > nowTs ? `in ${fmtDuration(dueTs - nowTs)}` : "-"}</dd>
          </div>
        </dl>
        <h3>What happens next</h3>
        <ol className="next-steps">
          <li>You get a receipt link to send to the buyer.</li>
          <li>The buyer funds the whole invoice{arbiter.trim() ? " and accepts the arbiter" : ""}.</li>
          <li>You submit each milestone; the buyer releases each one.</li>
          <li>Unreleased milestones refund to the buyer after the due date.</li>
        </ol>
      </aside>
    </div>
  );
}
