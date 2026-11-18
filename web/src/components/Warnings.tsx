const Icon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l9.5 17h-19z" />
    <path d="M12 10v4M12 17.5v.01" />
  </svg>
);

export function UnauditedWarning() {
  return (
    <div className="warn" data-testid="warn-unaudited" role="note">
      <Icon />
      <p>
        <strong>Unaudited.</strong> BullaEscrow has not been audited. Only escrow amounts you can afford to lose.
      </p>
    </div>
  );
}

export function CircuitHolderWarning() {
  return (
    <div className="warn" data-testid="warn-circuit-holder" role="note">
      <Icon />
      <p>
        <strong>Circuit-holder control.</strong> Whoever holds the TapeOut circuit controls its container. This is not safe if that wallet is stolen. Funds follow the escrow contract rules, not the circuit.
      </p>
    </div>
  );
}

export function Warnings() {
  return (
    <div className="warn-stack">
      <UnauditedWarning />
      <CircuitHolderWarning />
    </div>
  );
}

/** Without an arbiter, the due-date refund also covers submitted but unreleased milestones. */
export function NoArbiterWarning({ context }: { context: "create" | "receipt" }) {
  return (
    <div className="warn" data-testid="warn-no-arbiter" role="note">
      <Icon />
      <p>
        <strong>No arbiter{context === "create" ? " set" : " on this invoice"}.</strong> After the due date the buyer can refund every milestone that is not released, including ones the seller already
        submitted. {context === "create" ? "We recommend naming an arbiter both sides trust, and leaving review time before the due date." : "Sellers: ask for releases before the due date."}
      </p>
    </div>
  );
}
