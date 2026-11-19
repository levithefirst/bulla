import { useCallback, useEffect, useRef, useState } from "react";
import { erc20Abi, formatUnits, type Address, type Hex } from "viem";
import { appTx, config, explorerAddress, explorerTx } from "../config";
import { client } from "../lib/client";
import { ethCall } from "../../../shared/rpc";
import type { StateName } from "../lib/invoice";
import { fmtAmount, shortAddr } from "../lib/format";
import { StatusBadge } from "../components/Status";
import { CopyButton } from "../components/Copy";
import { loadBurners, newBurners, type Burners, type Role } from "./burners";
import { DEMO_AMOUNT, DEMO_MILESTONES, fmtOkb, isDemoRunning, JudgeError, runDemo, STEPS, tankKey, tankStatus, type Step, type StepKey } from "./runDemo";

/** Same rules as lib/invoice displayState, from the raw states the runner reads. */
function judgeDisplay(state: number, ms: number[]): StateName {
  if (state === 1) return "Draft";
  if (state === 3) return "Released";
  if (state !== 2) return "None";
  if (ms.some((m) => m === 1)) return "Submitted";
  if (ms.some((m) => m >= 2)) return "Partly released";
  return "Funded";
}

function TankLine({ tick }: { tick: number }) {
  const [t, setT] = useState<Awaited<ReturnType<typeof tankStatus>>>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let live = true;
    tankStatus()
      .then((x) => live && (setT(x), setErr(false)))
      .catch(() => live && setErr(true));
    return () => {
      live = false;
    };
  }, [tick]);
  if (err) return <p className="muted small" data-testid="tank-line">Demo tank balance unavailable (RPC).</p>;
  if (!t) return null;
  return (
    <p className="muted small" data-testid="tank-line">
      Demo gas tank{" "}
      {explorerAddress(t.address) ? (
        <a className="mono" href={explorerAddress(t.address)!} target="_blank" rel="noreferrer">
          {shortAddr(t.address)}
        </a>
      ) : (
        <span className="mono">{shortAddr(t.address)}</span>
      )}
      : <span className="num" data-testid="tank-balance">{fmtOkb(t.balance)}</span> testnet OKB, about <span className="num">{t.runsLeft}</span> runs left. Per-run cap applies.
    </p>
  );
}

type TxReceipt = { status: Hex; blockNumber: Hex; gasUsed: Hex; from: Address; to: Address | null; contractAddress: Address | null };

/**
 * In-app receipt for one step, read straight from the RPC with eth_getTransactionReceipt. The testnet explorer
 * can lag behind the chain (it shows "not found" for confirmed txs), so this is the source of truth here.
 */
function StepReceipt({ hash }: { hash: Hex }) {
  const [open, setOpen] = useState(false);
  const [r, setR] = useState<TxReceipt | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!open || r) return;
    let live = true;
    (async () => {
      for (let i = 0; i < 5 && live; i++) {
        try {
          const got = (await client.request({ method: "eth_getTransactionReceipt", params: [hash] })) as TxReceipt | null;
          if (got) return live && (setR(got), setErr(null));
        } catch (e) {
          if (live) setErr((e as Error).message ?? "RPC error");
        }
        await new Promise((res) => setTimeout(res, 800));
      }
      if (live) setErr((x) => x ?? "Receipt not returned by the RPC yet. Try again in a few seconds.");
    })();
    return () => {
      live = false;
    };
  }, [open, r, hash]);
  const ok = r ? BigInt(r.status) === 1n : null;
  return (
    <details className="jstep-receipt" data-testid="step-receipt" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>Receipt (read from the RPC)</summary>
      {!r && !err && <p className="muted small">Reading eth_getTransactionReceipt…</p>}
      {!r && err && <p className="muted small">{err}</p>}
      {r && (
        <dl className="lines lines-tight">
          <div>
            <dt>Status</dt>
            <dd data-testid="receipt-status" className={ok ? "check-ok" : undefined}>
              {ok ? "Success" : "Reverted"}
            </dd>
          </div>
          <div>
            <dt>Block</dt>
            <dd className="num" data-testid="receipt-block">
              {BigInt(r.blockNumber).toString()}
            </dd>
          </div>
          <div>
            <dt>Gas used</dt>
            <dd className="num" data-testid="receipt-gas">
              {BigInt(r.gasUsed).toLocaleString("en-US")}
            </dd>
          </div>
          <div>
            <dt>From</dt>
            <dd className="mono" title={r.from}>
              {shortAddr(r.from)}
            </dd>
          </div>
          <div>
            <dt>To</dt>
            <dd className="mono" title={r.to ?? r.contractAddress ?? ""}>
              {r.to ? shortAddr(r.to) : r.contractAddress ? `new contract ${shortAddr(r.contractAddress)}` : "none"}
            </dd>
          </div>
          <div>
            <dt>Hash</dt>
            <dd className="mono" title={hash}>
              {shortAddr(hash)} <CopyButton value={hash} label="Transaction hash" />
            </dd>
          </div>
        </dl>
      )}
    </details>
  );
}

const ROLE_LABEL: Record<Role | "tank", string> = { freelancer: "Freelancer", client: "Client", tank: "Gas tank" };
const FEE_BPS = 50; // judge escrow is deployed with 50 bps (contracts/scripts/deploy-judge.ts)
const FEE_TOTAL = DEMO_MILESTONES.reduce((a, m) => a + (m.amount * BigInt(FEE_BPS)) / 10_000n, 0n);

function fresh(): Step[] {
  return STEPS.map((s) => ({ ...s, status: "idle" as const }));
}

function useBalances(b: Burners, tick: number) {
  const [bal, setBal] = useState<Record<Role, { okb?: bigint; demo?: bigint }>>({ freelancer: {}, client: {} });
  useEffect(() => {
    let live = true;
    (async () => {
      const out: Record<Role, { okb?: bigint; demo?: bigint }> = { freelancer: {}, client: {} };
      for (const r of ["freelancer", "client"] as const) {
        try {
          out[r].okb = BigInt((await client.request({ method: "eth_getBalance", params: [b[r].address, "latest"] })) as Hex);
          if (config.judge) out[r].demo = await ethCall(client, { address: config.judge.token, abi: erc20Abi, functionName: "balanceOf", args: [b[r].address] });
        } catch {
          /* RPC hiccup: leave unknown */
        }
      }
      if (live) setBal(out);
    })();
    return () => {
      live = false;
    };
  }, [b, tick]);
  return bal;
}

function StepIcon({ s }: { s: Step["status"] }) {
  if (s === "running") return <span className="spin" aria-hidden="true" />;
  const d = s === "done" ? "M5 12.5l4.5 4.5L19 7.5" : s === "skipped" ? "M6 12h12" : s === "error" ? "M7 7l10 10M17 7L7 17" : "";
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      {d && <path d={d} />}
    </svg>
  );
}

export default function JudgePage({ autoRun }: { autoRun: boolean }) {
  const [burners, setBurners] = useState<Burners>(() => loadBurners());
  const [steps, setSteps] = useState<Step[]>(fresh);
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState<Role>("client");
  const [invoice, setInvoice] = useState<{ id: bigint; state: StateName } | null>(null);
  const [history, setHistory] = useState<StateName[]>([]);
  const [container, setContainer] = useState<{ address: Address; circuitId: bigint } | null>(null);
  const [result, setResult] = useState<{ ms: number; containerReceived: bigint } | null>(null);
  const [error, setError] = useState<JudgeError | Error | null>(null);
  const [tick, setTick] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef<number | null>(null);
  // Synchronous guard: React state updates are async, so two taps in the same frame would both see running === false.
  const runningRef = useRef(false);
  const bal = useBalances(burners, tick);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => started.current && setElapsed(performance.now() - started.current), 100);
    return () => clearInterval(t);
  }, [running]);

  const run = useCallback(async () => {
    if (running || runningRef.current || isDemoRunning()) return;
    runningRef.current = true;
    setRunning(true);
    setSteps(fresh());
    setInvoice(null);
    setHistory([]);
    setContainer(null);
    setResult(null);
    setError(null);
    started.current = performance.now();
    try {
      const r = await runDemo(burners, {
        step: (key: StepKey, patch) => setSteps((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x))),
        state: (id, state, ms) => {
          const d = judgeDisplay(state, ms);
          setInvoice({ id, state: d });
          setHistory((h) => (h[h.length - 1] === d ? h : [...h, d]));
        },
        container: (address, circuitId) => setContainer({ address, circuitId }),
        active: (role) => role !== "tank" && setActive(role),
      });
      setResult({ ms: r.ms, containerReceived: r.containerReceived });
      setElapsed(r.ms);
    } catch (e) {
      setError(e as Error);
    } finally {
      runningRef.current = false;
      setRunning(false);
      setTick((t) => t + 1);
    }
  }, [burners, running]);

  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRun && !autoRan.current) {
      autoRan.current = true;
      run();
    }
  }, [autoRun, run]);

  const code = (error as JudgeError | null)?.code;
  const tankMissing = !tankKey();
  const f = (v: bigint) => fmtAmount(v, 6, "DemoUSD");
  const fee = FEE_TOTAL;
  const state = invoice ? invoice.state : null;
  const b = burners[active];
  const doneCount = steps.filter((x) => x.status === "done" || x.status === "skipped").length;
  const pctDone = Math.round((doneCount / Math.max(steps.length, 1)) * 100);

  return (
    <div className="judge">
      <header className="judge-head">
        <p className="eyebrow-plain">Judge mode · {config.chain.name} · real transactions, valueless DemoUSD</p>
        <h1>One tap: a full escrow, on chain.</h1>
        <p className="lead">
          Two demo wallets are created in this browser: a Freelancer and a Client. One tap runs the whole loop on {config.chain.name}: lock the money, deliver, release. Every step is a real transaction, and
          each one links to its receipt read straight from the chain RPC.
        </p>
        <div className="cta-row">
          <button className="btn btn-primary btn-lg" onClick={run} disabled={running || tankMissing} data-testid="judge-run">
            {running ? (state === "Released" ? "Finishing…" : "Running…") : result ? "Run it again" : "Run the escrow demo"}
          </button>
          <a className="btn btn-ghost" href="#/create" data-testid="judge-advanced">
            Advanced: use my own wallet
          </a>
        </div>
        <p className="muted small">No wallet to install. Demo keys live only in this browser and hold nothing of value. TapeOut has no testnet deployment, so the circuit, opener and factory here are labelled stand-ins. Real-token mode uses USDC and real TapeOut circuits on X Layer mainnet, with OKX Wallet or any browser wallet.</p>
        <TankLine tick={tick} />
      </header>

      {tankMissing && (
        <div className="error" role="alert" data-testid="judge-tank-missing">
          This build has no demo gas tank configured, so judge mode cannot run. Use your own wallet instead.
        </div>
      )}
      {error && (
        <div className="error" role="alert" data-testid={code === "tankEmpty" ? "judge-tank-empty" : "judge-error"}>
          <strong>{code === "tankEmpty" ? "Demo gas tank empty. " : code === "cap" ? "Above the demo gas cap. " : code === "chain" ? "Wrong network. " : code === "busy" ? "" : "The demo stopped. "}</strong>
          {error.message}
        </div>
      )}

      {result && (
        <section className="released-moment" aria-live="polite" aria-label="Escrow loop finished">
          <span className="released-check" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <div>
            <p className="released-kicker">Escrow settled on {config.chain.name}</p>
            <p className="released-title">Released</p>
            <p className="released-sub num">
              {f(DEMO_AMOUNT - fee)} landed in the Freelancer's container in {(result.ms / 1000).toFixed(1)} s, across {steps.filter((x) => x.hash).length} real transactions.
            </p>
          </div>
          {invoice && (
            <a className="btn btn-primary btn-lg" href={`#/invoice/${invoice.id}?escrow=demo`}>
              See the public receipt
            </a>
          )}
        </section>
      )}

      <div className="judge-grid">
        <section className="card" aria-labelledby="steps-title">
          <div className="row-between">
            <h2 id="steps-title">The loop</h2>
            <span className={`judge-timer num${result ? " judge-timer-done" : ""}`} data-testid="judge-elapsed" data-ms={result ? result.ms : undefined} aria-live="polite">
              {result ? `Done in ${(result.ms / 1000).toFixed(1)} s` : running ? `${(elapsed / 1000).toFixed(1)} s` : "Ready"}
            </span>
          </div>
          <div className={`judge-progress${result ? " judge-progress-done" : ""}`} aria-hidden="true">
            <span style={{ width: `${pctDone}%` }} />
          </div>
          <p className="judge-progress-label muted small num">
            {doneCount} of {steps.length} steps confirmed
          </p>
          <ol className="judge-steps">
            {steps.map((s) => (
              <li key={s.key} className={`jstep jstep-${s.status}`} data-testid={`step-${s.key}`} data-status={s.status}>
                <span className="jstep-icon">
                  <StepIcon s={s.status} />
                </span>
                <div className="jstep-body">
                  <span className="jstep-label">{s.label}</span>
                  <span className="jstep-meta">
                    <span className={`role-chip role-${s.role}`}>{ROLE_LABEL[s.role]}</span>
                    {s.hash && (
                      <span className="mono" data-testid="step-tx" title={s.hash}>
                        tx {shortAddr(s.hash)}
                      </span>
                    )}
                    {s.hash && <CopyButton value={s.hash} label="Transaction hash" testid="step-copy-hash" />}
                    {s.hash && s.status === "done" && (
                      <a href={appTx(s.hash)} target="_blank" rel="noreferrer" data-testid="step-rpc-link" aria-label={`Open the receipt of transaction ${s.hash}, read from the RPC`}>
                        Receipt
                      </a>
                    )}
                    {s.hash && explorerTx(s.hash) && (
                      <a href={explorerTx(s.hash)!} target="_blank" rel="noreferrer" data-testid="step-explorer" aria-label={`View transaction ${s.hash} on OKLink (its testnet index lags, it may show not found)`}>
                        OKLink (index lags)
                      </a>
                    )}
                    {s.note && <span className="muted">{s.note}</span>}
                  </span>
                  {s.hash && s.status === "done" && <StepReceipt hash={s.hash} />}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="side">
          <section className="card judge-invoice" aria-labelledby="live-title">
            <div className="row-between">
              <h2 id="live-title">Live invoice</h2>
              {state ? <StatusBadge state={state} testid="judge-state" /> : <span className="muted small">not created yet</span>}
            </div>
            <p className="amount-big num">
              {fmtAmount(DEMO_AMOUNT, 6)} <span className="sym">DemoUSD</span>
            </p>
            {history.length > 0 && (
              <ol className="state-history" aria-label="Status changes confirmed on chain" data-testid="judge-history">
                {history.map((st, k) => (
                  <li key={k}>
                    <StatusBadge state={st} />
                  </li>
                ))}
              </ol>
            )}
            <dl className="lines">
              {DEMO_MILESTONES.map((m, k) => (
                <div key={k}>
                  <dt>
                    Milestone {k + 1}: {m.label}
                  </dt>
                  <dd className="num">{f(m.amount)}</dd>
                </div>
              ))}
              <div>
                <dt>Fees (0.50% per release)</dt>
                <dd className="num">{f(fee)}</dd>
              </div>
              <div className="lines-total">
                <dt>Paid into the Freelancer's container</dt>
                <dd className="num">{f(DEMO_AMOUNT - fee)}</dd>
              </div>
            </dl>
            {container && (
              <div className="container-landing" data-testid="judge-container">
                <p className="tag tag-demo">Testnet stand-in for TapeOut</p>
                <p className="small">
                  Circuit #{container.circuitId.toString()} · container{" "}
                  {explorerAddress(container.address) ? (
                    <a className="mono" href={explorerAddress(container.address)!} target="_blank" rel="noreferrer" data-testid="judge-container-link">
                      {shortAddr(container.address)}
                    </a>
                  ) : (
                    <span className="mono" data-testid="judge-container-link">
                      {shortAddr(container.address)}
                    </span>
                  )}
                </p>
                {result && (
                  <p className="check-ok" data-testid="judge-container-received">
                    Container received {f(result.containerReceived)}
                  </p>
                )}
              </div>
            )}
            {invoice && (
              <a className="btn btn-block mt-16" href={`#/invoice/${invoice.id}?escrow=demo`} data-testid="judge-receipt-link">
                Open public receipt #{invoice.id.toString()}
              </a>
            )}
            <p className="muted small mt-12">On X Layer mainnet the same contract checks the seller's real TapeOut circuit (ownerOf) and pays its real container (opener.accountOf).</p>
          </section>

          <section className="card" aria-labelledby="roles-title">
            <h2 id="roles-title">Demo wallets</h2>
            <div className="seg" role="tablist" aria-label="Acting role">
              {(["freelancer", "client"] as const).map((r) => (
                <button key={r} role="tab" aria-selected={active === r} className={`seg-btn${active === r ? " seg-on" : ""}`} onClick={() => setActive(r)} data-testid={`role-${r}`}>
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
            <div className="burner" role="tabpanel">
              <p className="tag tag-demo">Demo-only burner · testnet</p>
              <dl className="lines">
                <div>
                  <dt>Address</dt>
                  <dd className="value">
                    <a className="mono" href={explorerAddress(b.address) ?? undefined} target="_blank" rel="noreferrer">
                      {shortAddr(b.address)}
                    </a>
                    <CopyButton value={b.address as Address} label={`Copy ${ROLE_LABEL[active]} address`} />
                  </dd>
                </div>
                <div>
                  <dt>Testnet OKB</dt>
                  <dd className="num">{bal[active].okb !== undefined ? Number(formatUnits(bal[active].okb!, 18)).toFixed(6) : "-"}</dd>
                </div>
                <div>
                  <dt>DemoUSD</dt>
                  <dd className="num">{bal[active].demo !== undefined ? fmtAmount(bal[active].demo!, 6) : "-"}</dd>
                </div>
              </dl>
              <button
                className="btn btn-ghost btn-sm mt-12"
                disabled={running}
                onClick={() => {
                  setBurners(newBurners());
                  setSteps(fresh());
                  setInvoice(null);
                  setResult(null);
                }}
              >
                New demo wallets
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
