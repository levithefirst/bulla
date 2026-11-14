import { useState } from "react";
import { navigate } from "../router";
import { Warnings } from "../components/Warnings";
import { config } from "../config";
import { StatusIcon, type StatusKind } from "../components/Status";

const FLOW_KIND: StatusKind[] = ["pending", "funded", "funded", "released"];

export function Landing() {
  const [id, setId] = useState("");
  const valid = /^\d+$/.test(id.trim()) && id.trim() !== "0";
  return (
    <div className="landing">
      <section className="hero">
        <img src="./logo.png" alt="Bulla logo" className="hero-logo logo" width={96} height={96} />
        <div>
          <h1>Get paid for milestones, without chasing.</h1>
          <p className="lead">
            Bulla is a milestone invoice with escrow on {config.isXLayer ? "X Layer" : config.chain.name}. Your client funds it up front in USDC, you submit the delivery, they release. If they never release by the due date,
            the time-lock refunds them. Every invoice has a public receipt anyone can open, no wallet needed.
          </p>
          <div className="cta-row">
            <a className="btn btn-primary" href="#/create" data-testid="cta-create">
              Create an invoice
            </a>
            <form
              className="open-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (valid) navigate(`/invoice/${id.trim()}`);
              }}
            >
              <input aria-label="Invoice number" placeholder="Invoice #" inputMode="numeric" value={id} onChange={(e) => setId(e.target.value)} data-testid="open-id" />
              <button className="btn" type="submit" disabled={!valid} data-testid="open-btn">
                Open receipt
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="flow">
        {[
          ["Draft", "Seller creates the invoice: buyer, amount, due date, and the TapeOut circuit container it is bound to."],
          ["Funded", "Buyer approves USDC, then funds. The money sits in the escrow contract, not with either party."],
          ["Submitted", "Seller records a delivery hash and optional link. It is on chain and on the receipt."],
          ["Released / Refunded", "Buyer releases (seller gets the amount minus a 0.5% fee), or after the due date the buyer reclaims it in full. Both can agree to cancel."],
        ].map(([t, d], i) => (
          <div className="flow-step" key={t}>
            <span className="flow-n">{i + 1}</span>
            <h3>
              <span className={`status status-${FLOW_KIND[i]}`} aria-hidden="true">
                <StatusIcon kind={FLOW_KIND[i]} />
              </span>
              {t}
            </h3>
            <p>{d}</p>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Why the TapeOut circuit matters</h2>
        <p>
          Each invoice stores the id of a TapeOut circuit container: the on-chain identity the seller trades under. The Bulla app itself is a static site meant to be published into that container on DeWEB,
          so the receipt page is served from X Layer, not from a server we run. There is no backend.
        </p>
        <Warnings />
      </section>
    </div>
  );
}
