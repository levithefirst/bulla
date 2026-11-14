export function UnauditedWarning() {
  return (
    <div className="warn" data-testid="warn-unaudited">
      <strong>Unaudited v1.</strong> BullaEscrow has not been audited. Only escrow amounts you can afford to lose.
    </div>
  );
}

export function CircuitHolderWarning() {
  return (
    <div className="warn" data-testid="warn-circuit-holder">
      <strong>Circuit-holder control.</strong> Whoever holds the TapeOut circuit controls its container. This is not safe if that wallet is
      stolen. The container hosts this app and the invoice's identity; funds follow the escrow contract rules, not the circuit.
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
