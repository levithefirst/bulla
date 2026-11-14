import type { StateName } from "../lib/invoice";

/** Theme status families (docs/design/color-theme.md): funded, pending, released, disputed. */
export type StatusKind = "funded" | "pending" | "released" | "disputed";

/**
 * Invoice state -> status color. Every state maps to one of the four theme hues.
 * - Draft:     pending  (waiting for the buyer's deposit)
 * - Funded:    funded   (money held in escrow)
 * - Submitted: funded   (money still held; delivery awaiting release)
 * - Released:  released (seal opened on purpose)
 * - Refunded:  disputed (seal broken: time-lock refund to the buyer)
 * - Cancelled: disputed (seal broken by mutual consent)
 */
export const STATE_STATUS: Record<StateName, StatusKind> = {
  None: "pending",
  Draft: "pending",
  Funded: "funded",
  Submitted: "funded",
  Released: "released",
  Refunded: "disputed",
  Cancelled: "disputed",
};

const paths: Record<StatusKind, JSX.Element> = {
  // padlock: held
  funded: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  // clock: waiting
  pending: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  // check: released
  released: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  // return arrow: refunded / broken seal
  disputed: (
    <>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </>
  ),
};

export function StatusIcon({ kind }: { kind: StatusKind }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[kind]}
    </svg>
  );
}

export function StatusBadge({ state, testid }: { state: StateName; testid?: string }) {
  const kind = STATE_STATUS[state];
  return (
    <span className={`status status-${kind}`} data-status={kind}>
      <StatusIcon kind={kind} />
      <span data-testid={testid}>{state}</span>
    </span>
  );
}
