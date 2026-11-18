import { useState } from "react";
import { navigate } from "../router";
import { Warnings } from "../components/Warnings";
import { config } from "../config";
import { StatusIcon, type StatusKind } from "../components/Status";

const FLOW: { kind: StatusKind; title: string; body: string }[] = [
  { kind: "pending", title: "Draft", body: "The seller bills up to 10 milestones with a TapeOut circuit they hold. The contract checks ownerOf on chain." },
  { kind: "funded", title: "Funded", body: "The buyer funds every milestone up front in USDC. The money sits in the escrow contract, not with either party." },
  { kind: "funded", title: "Submitted", body: "The seller records a delivery hash per milestone. An optional arbiter, accepted by the buyer, can settle a dispute." },
  { kind: "released", title: "Released", body: "Each release pays the circuit holder or its TapeOut container, minus 0.5%. Unreleased milestones refund after the due date." },
];

const network = config.isXLayer ? "X Layer" : config.chain.name;

function OpenReceipt() {
  const [id, setId] = useState("");
  const clean = id.trim().replace(/^#/, "");
  const valid = /^\d+$/.test(clean) && clean !== "0";
  return (
    <form
      className="open-form"
      aria-label="Open a receipt"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) navigate(`/invoice/${clean}`);
      }}
    >
      <label className="sr-only" htmlFor="open-id">
        Invoice number
      </label>
      <input id="open-id" className="mono" placeholder="Invoice #" inputMode="numeric" autoComplete="off" value={id} onChange={(e) => setId(e.target.value)} data-testid="open-id" />
      <button className="btn" type="submit" disabled={!valid} data-testid="open-btn">
        Open receipt
      </button>
    </form>
  );
}

function ReceiptPreview() {
  return (
    <figure className="preview" aria-label="Example receipt">
      <div className="preview-card">
        <div className="row-between">
          <span className="preview-id mono">Invoice #12</span>
          <span className="status status-funded">
            <StatusIcon kind="funded" />
            Funded
          </span>
        </div>
        <p className="preview-memo">Brand identity, milestone 2</p>
        <p className="preview-amount num">
          1,200 <span className="sym">USDC</span>
        </p>
        <dl className="preview-lines">
          <div>
            <dt>Fee on release (0.50%)</dt>
            <dd className="num">6 USDC</dd>
          </div>
          <div>
            <dt>Seller receives</dt>
            <dd className="num">1,194 USDC</dd>
          </div>
          <div>
            <dt>Refund opens</dt>
            <dd className="num">Dec 5, 2026</dd>
          </div>
        </dl>
        <ol className="preview-steps" aria-hidden="true">
          <li className="on-pending" />
          <li className="on-funded" />
          <li />
          <li />
        </ol>
      </div>
      <figcaption className="muted small">Example receipt. Real receipts are read live from {network}.</figcaption>
    </figure>
  );
}

export function Landing() {
  return (
    <div className="landing">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">
            <img src="./logo.png" alt="" width={18} height={18} />
            Milestone escrow on {network}
          </p>
          <h1 id="hero-title">Get paid for milestones, without chasing.</h1>
          <p className="lead">
            Your client funds the invoice up front in USDC. You deliver and record proof. They release. If nothing is released by the due date, a time-lock refunds them. Anyone can check the receipt, no wallet
            needed.
          </p>
          <div className="cta-row">
            {config.judge ? (
              <a className="btn btn-primary btn-lg" href="#/try?run=1" data-testid="cta-try">
                Try it now: one-tap escrow
              </a>
            ) : config.judgeUrl ? (
              <a className="btn btn-primary btn-lg" href={config.judgeUrl} data-testid="cta-try">
                Try it now on X Layer testnet
              </a>
            ) : null}
            <a className={`btn btn-lg${config.judge || config.judgeUrl ? "" : " btn-primary"}`} href="#/create" data-testid="cta-create">
              Create an invoice
            </a>
            <OpenReceipt />
          </div>
          <p className="advanced-link">
            <a href="#/create" data-testid="cta-advanced">
              Advanced: use my own wallet
            </a>{" "}
            <span className="muted">OKX Wallet (recommended on X Layer) or any browser wallet, with real USDC.</span>
          </p>
          <ul className="facts-inline" aria-label="Key facts">
            <li>0.5% fee, only on release</li>
            <li>Full refund after the due date</li>
            <li>No backend, no account</li>
          </ul>
        </div>
        <ReceiptPreview />
      </section>

      <section className="section" aria-labelledby="how-title">
        <h2 id="how-title" className="section-title">
          How it works
        </h2>
        <ol className="flow">
          {FLOW.map((s, i) => (
            <li className="flow-step" key={s.title}>
              <div className="flow-head">
                <span className="flow-n num" aria-hidden="true">
                  {i + 1}
                </span>
                <span className={`status status-${s.kind}`}>
                  <StatusIcon kind={s.kind} />
                  {s.title}
                </span>
              </div>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="muted small flow-note">Either side can also propose a cancel. When both agree, the buyer gets the full amount back with no fee.</p>
      </section>

      <section className="section split" aria-labelledby="who-title">
        <div>
          <h2 id="who-title" className="section-title">
            Built for the people in the deal
          </h2>
          <dl className="who">
            <div>
              <dt>Freelancers and studios</dt>
              <dd>Money is committed before work starts. One invoice per milestone, one link to share.</dd>
            </div>
            <div>
              <dt>Clients</dt>
              <dd>A hard refund date you can verify yourself. Release only when the delivery is in.</dd>
            </div>
            <div>
              <dt>Anyone with the link</dt>
              <dd>Accountants, managers, and the next client can read the receipt without connecting a wallet.</dd>
            </div>
          </dl>
        </div>
        <div className="card tapeout-card">
          <h2 className="section-title">Where TapeOut fits</h2>
          <p>
            Your TapeOut circuit is your business account. The escrow only lets the circuit's holder bill with it (checked with ownerOf), pays each release to the holder or, if you choose, into the circuit's
            container, and the receipt shows the circuit's public payment history. The app is a static site meant for DeWEB, so receipts can be served from {network}, not from a server we run.
          </p>
          <Warnings />
        </div>
      </section>
    </div>
  );
}
