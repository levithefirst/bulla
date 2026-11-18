import type { MilestoneStateName, StateName } from "../lib/invoice";

/** Theme status families (docs/design/color-theme.md) plus a neutral stone style. */
export type StatusKind = "funded" | "pending" | "released" | "disputed" | "neutral";

/**
 * Invoice display state -> status style. Color always comes with the word and an icon.
 * - Draft:           pending  (waiting for the buyer's deposit)
 * - Funded:          funded   (money held in escrow)
 * - Submitted:       funded   (money still held; a delivery awaits release)
 * - Partly released: funded   (some milestones paid, the rest still held)
 * - Released:        released (every milestone paid)
 * - Completed:       released (settled; an arbiter refunded part)
 * - Refunded:        disputed (time-lock refund of the unreleased remainder)
 * - Cancelled:       neutral  (both parties agreed; not a dispute)
 */
export const STATE_STATUS: Record<StateName, StatusKind> = {
  None: "neutral",
  Draft: "pending",
  Funded: "funded",
  Submitted: "funded",
  "Partly released": "funded",
  Released: "released",
  Completed: "released",
  Refunded: "disputed",
  Cancelled: "neutral",
};

/** Milestone state -> status style. */
export const MILESTONE_STATUS: Record<MilestoneStateName, StatusKind> = {
  Pending: "pending",
  Submitted: "funded",
  Released: "released",
  Refunded: "disputed",
};

const paths: Record<StatusKind, JSX.Element> = {
  funded: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  pending: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  released: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  disputed: (
    <>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </>
  ),
  neutral: <path d="M6 12h12" />,
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

export function MilestoneBadge({ state, testid }: { state: MilestoneStateName; testid?: string }) {
  const kind = MILESTONE_STATUS[state];
  return (
    <span className={`status status-${kind} status-sm`} data-status={kind}>
      <StatusIcon kind={kind} />
      <span data-testid={testid}>{state}</span>
    </span>
  );
}
