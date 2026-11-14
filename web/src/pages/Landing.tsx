import { useState } from "react";
import { navigate } from "../router";
import { Warnings } from "../components/Warnings";
import { config } from "../config";
import { StatusIcon, type StatusKind } from "../components/Status";

const FLOW: { kind: StatusKind; title: string; body: string }[] = [
  { kind: "pending", title: "Draft", body: "The seller sets the buyer, amount, due date, and the TapeOut circuit container the invoice is bound to." },
  { kind: "funded", title: "Funded", body: "The buyer approves USDC, then funds. The money sits in the escrow contract, not with either party." },
  { kind: "funded", title: "Submitted", body: "The seller records a delivery hash and an optional link. It is on chain and on the receipt." },
  { kind: "released", title: "Released", body: "The buyer releases and the seller is paid, minus 0.5%. After the due date an unreleased invoice refunds the buyer." },
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
            <a className="btn btn-primary btn-lg" href="#/create" data-testid="cta-create">
              Create an invoice
            </a>
            <OpenReceipt />
          </div>
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
            Each invoice stores the seller's TapeOut circuit container: their on-chain identity. The Bulla app is a static site published into that container on DeWEB, so receipts are served from {network},
            not from a server we run.
          </p>
          <Warnings />
        </div>
      </section>
    </div>
  );
}
