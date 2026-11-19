import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { decodeEventLog, getAddress, isAddress, isHex, keccak256, toBytes, type Address, type Hex } from "viem";
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
import { addressError, parseAmount, totalError } from "../../../shared/validate";
import { UnauditedWarning, CircuitHolderWarning, NoArbiterWarning } from "./Warnings";

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Field = "buyer" | "due" | "circuit" | "arbiter" | "milestones" | "deliveryHash" | "memo";
type Row = { label: string; amount: string };
const MAX_MILESTONES = 10;

/** Create-form draft, kept in localStorage so a refresh does not wipe it. Cleared after a successful create. */
type Draft = { buyer: string; rows: Row[]; due: string; processor: string; circuitId: string; payToContainer: boolean; arbiter: string; deliveryHash: string; memo: string };
export const DRAFT_KEY = `bulla.createDraft.v1.${config.networkKey}`;
const circuitKey = (a: string) => `bulla.lastCircuit.v1.${config.networkKey}.${a.toLowerCase()}`;
function loadDraft(): Partial<Draft> {
  try {
    const j = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null");
    if (!j || typeof j !== "object") return {};
    const rows = Array.isArray(j.rows) ? (j.rows as unknown[]).slice(0, MAX_MILESTONES).map((r) => ({ label: String((r as Row)?.label ?? "").slice(0, 80), amount: String((r as Row)?.amount ?? "").slice(0, 40) })) : undefined;
    const str = (v: unknown, max = 200) => (typeof v === "string" ? v.slice(0, max) : undefined);
    return { buyer: str(j.buyer, 64), rows: rows && rows.length ? rows : undefined, due: str(j.due, 32), processor: str(j.processor, 64), circuitId: str(j.circuitId, 40), payToContainer: typeof j.payToContainer === "boolean" ? j.payToContainer : undefined, arbiter: str(j.arbiter, 64), deliveryHash: str(j.deliveryHash, 300), memo: str(j.memo, 140) };
  } catch {
    return {};
  }
}

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

  const [draft] = useState(loadDraft);
  const [buyer, setBuyer] = useState(draft.buyer ?? "");
  const [rows, setRows] = useState<Row[]>(draft.rows ?? [{ label: "", amount: "" }]);
  const [due, setDue] = useState(() => draft.due ?? toLocalInput(new Date(Date.now() + 14 * 86400_000)));
  const [processor, setProcessor] = useState(draft.processor ?? config.tapeout?.processor ?? "");
  const [circuitId, setCircuitId] = useState(draft.circuitId ?? "");
  const [payToContainer, setPayToContainer] = useState(draft.payToContainer ?? false);
  const [arbiter, setArbiter] = useState(draft.arbiter ?? "");
  const [deliveryHash, setDeliveryHash] = useState(draft.deliveryHash ?? "");
  const [memo, setMemo] = useState(draft.memo ?? "");
  /** Fields the user has left (blur) or changed; their live errors show inline. Submit marks everything. */
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (k: string) => setTouched((t) => (t[k] ? t : { ...t, [k]: true }));
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    try {
      const d: Draft = { buyer, rows, due, processor, circuitId, payToContainer, arbiter, deliveryHash, memo };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {
      /* storage unavailable */
    }
  }, [buyer, rows, due, processor, circuitId, payToContainer, arbiter, deliveryHash, memo]);

  // Prefill the processor and circuit this wallet last billed with (stored locally after a successful create).
  // TapeOut circuits are not enumerable per owner (435 processors on mainnet, no tokenOfOwnerByIndex), so nothing is guessed.
  useEffect(() => {
    if (!w.address || circuitId.trim()) return;
    try {
      const j = JSON.parse(localStorage.getItem(circuitKey(w.address)) ?? "null");
      if (j && typeof j.processor === "string" && typeof j.circuitId === "string" && /^\d+$/.test(j.circuitId)) {
        setProcessor(j.processor);
        setCircuitId(j.circuitId);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.address]);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [busy, setBusy] = useState(false);
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decimals = token.data?.decimals;
  const symbol = token.data?.symbol ?? config.tokenSymbolHint ?? "token";
  const feeBps = escrow.data?.feeBps ?? config.feeBpsHint;
  const circuit = useCircuitCheck({ factory: escrow.data?.factory, opener: escrow.data?.opener, processorInput: processor, circuitId, account: w.address });
  const c = circuit.data;

  const dec = decimals ?? 6; // both X Layer deployments use 6-decimal USDC / DemoUSD; submit still waits for the on-chain value
  const amountResults = useMemo(() => rows.map((r) => parseAmount(r.amount, dec, symbol)), [rows, dec, symbol]);
  const parsed = amountResults.map((r) => (r.ok ? r.value : null));
  const amounts = parsed.every((x) => x !== null) ? (parsed as bigint[]) : null;
  const total = amounts ? amounts.reduce((acc, x) => acc + x, 0n) : null;
  const totalErr = total !== null ? totalError(total, dec, symbol) : null;
  const totalFee = amounts ? amounts.reduce((acc, x) => acc + quoteFee(x, feeBps).fee, 0n) : null;
  const dueTs = Math.floor(new Date(due).getTime() / 1000) || 0;
  const nowTs = Number(now.data ?? BigInt(Math.floor(Date.now() / 1000)));
  const f = (x: bigint) => fmtAmount(x, decimals ?? dec, symbol);
  const clearErr = (k: Field) => errors[k] && setErrors((x) => ({ ...x, [k]: undefined }));

  function setRow(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));
    clearErr("milestones");
  }

  const reserved = { "the escrow contract": escrow.data?.address ?? config.escrow, "the token contract": escrow.data?.token ?? config.token, "the TapeOut processor": isAddress(processor.trim()) ? (processor.trim() as Address) : null };
  const buyerErr = addressError(buyer, "buyer", { self: w.address, reserved });
  const labelErr = (r: Row) => (!r.label.trim() ? "Give this milestone a short label." : new TextEncoder().encode(r.label.trim()).length > 80 ? "Labels can be at most 80 bytes." : null);
  const dueErr = !dueTs ? "Pick a due date." : dueTs <= nowTs ? "Pick a time in the future." : null;
  const arbiterErr = (() => {
    const a = arbiter.trim();
    if (!a) return null;
    const base = addressError(a, "arbiter", { self: w.address, reserved });
    if (base) return base;
    return isAddress(buyer.trim()) && getAddress(a) === getAddress(buyer.trim()) ? "The arbiter cannot be the buyer." : null;
  })();
  const show = (k: string, err: string | null | undefined) => (touched[k] || touched.all ? err ?? undefined : undefined);

  function validate() {
    setTouched((t) => ({ ...t, all: true }));
    const e: Partial<Record<Field, string>> = {};
    const b = buyer.trim();
    if (buyerErr) e.buyer = buyerErr;
    if (decimals === undefined) e.milestones = "Token details are still loading.";
    else if (rows.some((r) => labelErr(r))) e.milestones = "Give every milestone a short label (at most 80 bytes).";
    else if (amountResults.some((r) => !r.ok)) e.milestones = "Fix the milestone amounts marked above.";
    else if (totalErr) e.milestones = totalErr;
    if (dueErr) e.due = dueErr;
    if (!c) e.circuit = circuit.isFetching ? "Still checking the circuit on chain." : "Enter your TapeOut processor and circuit #ID.";
    else if (!c.ok) e.circuit = c.reason;
    else if (!c.youHold) e.circuit = `Circuit #${circuitId} is held by ${shortAddr(c.holder)}, not the connected wallet. Only the holder can bill with it.`;
    const a = arbiter.trim();
    if (arbiterErr) e.arbiter = arbiterErr;
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
      done.current = true;
      try {
        localStorage.removeItem(DRAFT_KEY);
        if (w.address) localStorage.setItem(circuitKey(w.address), JSON.stringify({ processor: processor.trim(), circuitId: circuitId.trim() }));
      } catch {
        /* storage unavailable */
      }
      onCreated(id);
    } catch (err) {
      const msg = parseError(err);
      toasts.update(tid, { kind: "error", title: "Create invoice failed", body: msg });
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  const done1 = !buyerErr && !dueErr;
  const done2 = total !== null && total > 0n && !totalErr && rows.every((r) => !labelErr(r));
  const done3 = !!(c && c.ok && c.youHold);
  const buyerLive = buyer.trim() ? show("buyer", buyerErr) : undefined;
  const liveInvalid = !!(buyerErr || dueErr || arbiterErr || totalErr || amountResults.some((r) => !r.ok) || rows.some((r) => labelErr(r)));
  const blocked = !w.isConnected || w.wrongNetwork || busy || config.mock || !config.escrow || (!!touched.all && liveInvalid);
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

        <ol className="step-rail" aria-label="Progress">
          {[
            ["Client and amounts", done1],
            ["Milestones", done2],
            ["Payout and circuit", done3],
          ].map(([label, ok], k) => (
            <li key={k} className={ok ? "rail-done" : ""}>
              <a href={`#step-${k + 1}`} onClick={(e) => (e.preventDefault(), document.getElementById(`step-${k + 1}`)?.scrollIntoView({ block: "start" }))}>
                <span className="rail-n num">{ok ? "\u2713" : k + 1}</span>
                <span className="rail-label">{label as string}</span>
              </a>
            </li>
          ))}
        </ol>

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

        <fieldset className="step" id="step-1" data-done={done1 ? "true" : "false"}>
          <legend className="step-legend">
            <span className="step-n num" aria-hidden="true">{done1 ? "\u2713" : "1"}</span>
            <span className="step-title">
              <span className="step-kicker">Step 1 of 3</span>
              Client and amounts
            </span>
          </legend>
          <p className="step-sub muted small">Who pays, by when, and what the receipt says.</p>
          <FormField id={fid("buyer")} label="Buyer address" hint="The only wallet that can fund, release, or claim the refund." error={errors.buyer ?? buyerLive}>
            <input id={fid("buyer")} name="buyer" className="mono" placeholder="0x…" autoComplete="off" spellCheck={false} value={buyer} onChange={(e) => (setBuyer(e.target.value), clearErr("buyer"))} onBlur={() => touch("buyer")} data-testid="buyer-input" aria-invalid={!!(errors.buyer ?? buyerLive)} aria-describedby={described("buyer", !!(errors.buyer ?? buyerLive))} />
          </FormField>
          <FormField id={fid("due")} label="Due date and refund time-lock" hint="After this, anything not released can be refunded to the buyer. Leave review time." error={errors.due ?? show("due", dueErr)}>
            <input id={fid("due")} name="due" type="datetime-local" className="num" value={due} onChange={(e) => (setDue(e.target.value), clearErr("due"), touch("due"))} onBlur={() => touch("due")} aria-invalid={!!(errors.due ?? show("due", dueErr))} aria-describedby={described("due", !!(errors.due ?? show("due", dueErr)))} data-testid="due-input" />
          </FormField>
          <FormField id={fid("memo")} label="Description" hint="Shown on the public receipt. Up to 140 characters.">
            <input id={fid("memo")} name="memo" maxLength={140} placeholder="Logo design" value={memo} onChange={(e) => setMemo(e.target.value)} />
          </FormField>
        </fieldset>

        <fieldset className="step" id="step-2" data-done={done2 ? "true" : "false"}>
          <legend className="step-legend">
            <span className="step-n num" aria-hidden="true">{done2 ? "\u2713" : "2"}</span>
            <span className="step-title">
              <span className="step-kicker">Step 2 of 3</span>
              Milestones
            </span>
          </legend>
          <p className="step-sub muted small">Up to 10 deliverables. The buyer funds all of them up front and releases each one.</p>
          <ol className="ms-editor" data-testid="milestones-editor">
            {rows.map((r, i) => {
              const amtErr = show(`amount-${i}`, amountResults[i].ok ? null : amountResults[i].error);
              const lblErr = show(`label-${i}`, labelErr(r));
              return (
              <li key={i} className={`ms-row${amtErr || lblErr ? " ms-row-invalid" : ""}`}>
                <span className="ms-n num" aria-hidden="true">
                  {i + 1}
                </span>
                <input name={`label-${i}`} aria-label={`Milestone ${i + 1} label`} placeholder={i === 0 ? "Wireframes" : "Next deliverable"} maxLength={80} value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} onBlur={() => touch(`label-${i}`)} aria-invalid={!!lblErr} />
                <div className="input-affix ms-amount">
                  <input name={`amount-${i}`} aria-label={`Milestone ${i + 1} amount in ${symbol}`} className="num" inputMode="decimal" placeholder="100.00" value={r.amount} onChange={(e) => (setRow(i, { amount: e.target.value }), touch(`amount-${i}`))} onBlur={() => touch(`amount-${i}`)} aria-invalid={!!amtErr} aria-describedby={amtErr ? `${fid("amt")}-${i}-err` : undefined} data-testid={`amount-${i}`} />
                  <span className="affix" aria-hidden="true">
                    {symbol}
                  </span>
                </div>
                <button type="button" className="copy-btn" aria-label={`Remove milestone ${i + 1}`} disabled={rows.length === 1} onClick={() => setRows((rs) => rs.filter((_, k) => k !== i))}>
                  ×
                </button>
                {(lblErr || amtErr) && (
                  <p className="field-error ms-row-error" id={`${fid("amt")}-${i}-err`} data-testid={`ms-error-${i}`}>
                    {[lblErr, amtErr].filter(Boolean).join(" ")}
                  </p>
                )}
              </li>
              );
            })}
          </ol>
          {(errors.milestones || (totalErr && (touched.all || Object.keys(touched).some((k) => k.startsWith("amount"))))) && <p className="field-error" data-testid="milestones-error">{errors.milestones ?? totalErr}</p>}
          <button type="button" className="btn btn-ghost btn-sm" disabled={rows.length >= MAX_MILESTONES} onClick={() => setRows((rs) => [...rs, { label: "", amount: "" }])} data-testid="add-milestone">
            Add milestone ({rows.length}/{MAX_MILESTONES})
          </button>
        </fieldset>

        <fieldset className="step" id="step-3" data-done={done3 ? "true" : "false"}>
          <legend className="step-legend">
            <span className="step-n num" aria-hidden="true">{done3 ? "\u2713" : "3"}</span>
            <span className="step-title">
              <span className="step-kicker">Step 3 of 3</span>
              Payout and TapeOut circuit
            </span>
          </legend>
          <p className="step-sub muted small">Bill with a circuit you hold, choose where releases land, and add an arbiter.</p>
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
                  {" · "}
                  <span data-testid="container-opened">{c.opened === true ? "opened" : c.opened === false ? "not opened yet" : "opened status unknown"}</span>
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
                Releases go to the circuit's container instead of your wallet, so receivables follow the circuit. You withdraw with the container's execute call plus a small OKB fee (EXEC_FEE), or in the official
                TapeOut app.{" "}
                {c && c.ok && c.opened === false
                  ? "Your container is not opened yet, so until you open it (0.08 OKB on tapeout.net) releases go to your wallet instead."
                  : "If the container is not opened at release time, that release goes to your wallet instead."}
              </span>
            </span>
          </label>
          <FormField id={fid("arbiter")} label="Arbiter (optional, recommended)" hint="Someone both sides trust. The buyer accepts them when funding. They can release or refund a submitted milestone, and take no fee." error={errors.arbiter ?? show("arbiter", arbiterErr)}>
            <input id={fid("arbiter")} name="arbiter" className="mono" placeholder="0x… or leave empty" autoComplete="off" spellCheck={false} value={arbiter} onChange={(e) => (setArbiter(e.target.value), clearErr("arbiter"))} onBlur={() => touch("arbiter")} aria-invalid={!!(errors.arbiter ?? show("arbiter", arbiterErr))} aria-describedby={described("arbiter", !!(errors.arbiter ?? show("arbiter", arbiterErr)))} data-testid="arbiter-input" />
          </FormField>
          {!arbiter.trim() && <NoArbiterWarning context="create" />}
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
        <p className="eyebrow-plain">Live summary</p>
        <h2 id={`${uid}-sum`} className="summary-total num" data-testid="summary-total">{total !== null && !totalErr ? f(total) : `- ${symbol}`}</h2>
        <p className="summary-memo muted">{memo.trim() || "No description yet"}</p>
        <ul className="summary-ms">
          {rows.map((r, k) => (
            <li key={k}>
              <span className="num summary-ms-n">{k + 1}</span>
              <span className="summary-ms-label">{r.label.trim() || "Untitled milestone"}</span>
              <span className="num summary-ms-amt" data-testid={`summary-amt-${k}`}>{amountResults[k].ok ? f(amountResults[k].value) : r.amount.trim() ? "invalid" : "-"}</span>
            </li>
          ))}
        </ul>
        <dl className="lines">
          <div>
            <dt>Buyer deposits ({rows.length} milestone{rows.length > 1 ? "s" : ""})</dt>
            <dd className="num">{total !== null && !totalErr ? f(total) : "-"}</dd>
          </div>
          <div>
            <dt>Fees if all released ({(feeBps / 100).toFixed(2)}% each)</dt>
            <dd className="num">{totalFee !== null && !totalErr ? f(totalFee) : "-"}</dd>
          </div>
          <div className="lines-total">
            <dt>Paid out if all released</dt>
            <dd className="num">{total !== null && totalFee !== null && !totalErr ? f(total - totalFee) : "-"}</dd>
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
