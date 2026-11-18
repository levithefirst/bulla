import type { Address } from "viem";

/**
 * Counterparty notification seam. Today: no channel (no-op). Planned: TapeSend encrypted container-to-container
 * notes, ONLY once the X Layer TapeSend hub is confirmed live (sources conflict; Grok Bot is verifying, see
 * docs/planning/win-audit/WIN-AUDIT.md section 3). Out of scope until then: email, push, any backend.
 *
 * To add a channel later: implement NotificationChannel and call setNotificationChannel() at startup.
 * Call sites already pass every event the UI produces; a failing channel must never block a payment flow.
 */
export type BullaNotice =
  | { kind: "invoiceCreated"; invoiceId: bigint; to: Address }
  | { kind: "invoiceFunded"; invoiceId: bigint; to: Address }
  | { kind: "milestoneSubmitted"; invoiceId: bigint; index: number; to: Address }
  | { kind: "milestoneReleased"; invoiceId: bigint; index: number; to: Address };

export interface NotificationChannel {
  readonly name: string;
  send(notice: BullaNotice): Promise<void>;
}

const none: NotificationChannel = { name: "none", send: async () => {} };
let channel: NotificationChannel = none;

export function setNotificationChannel(c: NotificationChannel | null) {
  channel = c ?? none;
}

export function notificationChannelName() {
  return channel.name;
}

/** Fire-and-forget: errors are swallowed so notifications can never break escrow actions. */
export async function notifyCounterparty(n: BullaNotice): Promise<void> {
  try {
    await channel.send(n);
  } catch {
    /* never block payments on a notification */
  }
}
