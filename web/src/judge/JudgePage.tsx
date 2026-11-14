import { useCallback, useEffect, useRef, useState } from "react";
import { erc20Abi, formatUnits, type Address, type Hex } from "viem";
import { config, explorerAddress, explorerTx } from "../config";
import { client } from "../lib/client";
import { ethCall } from "../../../shared/rpc";
import { stateName } from "../lib/invoice";
import { fmtAmount, shortAddr } from "../lib/format";
import { StatusBadge } from "../components/Status";
import { CopyButton } from "../components/Copy";
import { loadBurners, newBurners, type Burners, type Role } from "./burners";
import { DEMO_AMOUNT, JudgeError, runDemo, STEPS, tankKey, type Step, type StepKey } from "./runDemo";

const ROLE_LABEL: Record<Role | "tank", string> = { freelancer: "Freelancer", client: "Client", tank: "Gas tank" };
const FEE_BPS = 50; // judge escrow is deployed with 50 bps (contracts/scripts/deploy-judge.ts)

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
  const [invoice, setInvoice] = useState<{ id: bigint; state: number } | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [result, setResult] = useState<{ ms: number } | null>(null);
  const [error, setError] = useState<JudgeError | Error | null>(null);
  const [tick, setTick] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef<number | null>(null);
  const bal = useBalances(burners, tick);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => started.current && setElapsed(performance.now() - started.current), 100);
    return () => clearInterval(t);
  }, [running]);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setSteps(fresh());
    setInvoice(null);
    setHistory([]);
    setResult(null);
    setError(null);
    started.current = performance.now();
    try {
      const r = await runDemo(burners, {
        step: (key: StepKey, patch) => setSteps((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x))),
        state: (id, state) => {
          setInvoice({ id, state });
          setHistory((h) => (h[h.length - 1] === state ? h : [...h, state]));
        },
        active: (role) => role !== "tank" && setActive(role),
      });
      setResult({ ms: r.ms });
      setElapsed(r.ms);
    } catch (e) {
      setError(e as Error);
    } finally {
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
  const fee = (DEMO_AMOUNT * BigInt(FEE_BPS)) / 10_000n;
  const state = invoice ? stateName(invoice.state) : null;
  const b = burners[active];

  return (
    <div className="judge">
      <header className="judge-head">
        <p className="eyebrow-plain">Judge mode · {config.chain.name} · real transactions, valueless DemoUSD</p>
        <h1>One tap: a full escrow, on chain.</h1>
        <p className="lead">
          Two demo wallets are created in this browser: a Freelancer and a Client. One tap runs the whole loop on {config.chain.name}: lock the money, deliver, release. Every step is a real transaction you can
          open on the OKX explorer.
        </p>
        <div className="cta-row">
          <button className="btn btn-primary btn-lg" onClick={run} disabled={running || tankMissing} data-testid="judge-run">
            {running ? "Running…" : result ? "Run it again" : "Run the escrow demo"}
          </button>
          <a className="btn btn-ghost" href="#/create" data-testid="judge-advanced">
            Advanced: use my own wallet
          </a>
        </div>
        <p className="muted small">No wallet to install. Demo keys live only in this browser and hold nothing of value. Real-token mode uses USDC with OKX Wallet or any browser wallet.</p>
      </header>

      {tankMissing && (
        <div className="error" role="alert" data-testid="judge-tank-missing">
          This build has no demo gas tank configured, so judge mode cannot run. Use your own wallet instead.
        </div>
      )}
      {error && (
        <div className="error" role="alert" data-testid={code === "tankEmpty" ? "judge-tank-empty" : "judge-error"}>
          <strong>{code === "tankEmpty" ? "Demo gas tank empty. " : code === "chain" ? "Wrong network. " : "The demo stopped. "}</strong>
          {error.message}
        </div>
      )}

      <div className="judge-grid">
        <section className="card" aria-labelledby="steps-title">
          <div className="row-between">
            <h2 id="steps-title">The loop</h2>
            <span className={`judge-timer num${result ? " judge-timer-done" : ""}`} data-testid="judge-elapsed" data-ms={result ? result.ms : undefined} aria-live="polite">
              {result ? `Done in ${(result.ms / 1000).toFixed(1)} s` : running ? `${(elapsed / 1000).toFixed(1)} s` : "Ready"}
            </span>
          </div>
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
                    {s.hash &&
                      (explorerTx(s.hash) ? (
                        <a className="mono" href={explorerTx(s.hash)!} target="_blank" rel="noreferrer" data-testid="step-tx" aria-label={`View transaction ${s.hash} on the OKX explorer`}>
                          {shortAddr(s.hash)} on OKX Explorer
                        </a>
                      ) : (
                        <span className="mono" data-testid="step-tx" title={s.hash}>
                          tx {shortAddr(s.hash)}
                        </span>
                      ))}
                    {s.note && <span className="muted">{s.note}</span>}
                  </span>
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
              <ol className="state-history" aria-label="Status changes read from chain" data-testid="judge-history">
                {history.map((st, k) => (
                  <li key={k}>
                    <StatusBadge state={stateName(st)} />
                  </li>
                ))}
              </ol>
            )}
            <dl className="lines">
              <div>
                <dt>Fee on release (0.50%)</dt>
                <dd className="num">{f(fee)}</dd>
              </div>
              <div className="lines-total">
                <dt>Freelancer receives</dt>
                <dd className="num">{f(DEMO_AMOUNT - fee)}</dd>
              </div>
            </dl>
            {invoice && (
              <a className="btn btn-block mt-16" href={`#/invoice/${invoice.id}?escrow=demo`} data-testid="judge-receipt-link">
                Open public receipt #{invoice.id.toString()}
              </a>
            )}
            <p className="muted small mt-12">Container id is a local fixture: TapeOut has no published X Layer testnet deployment. Real invoices bind a mainnet container.</p>
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
