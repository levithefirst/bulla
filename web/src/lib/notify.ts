import type { Address } from "viem";

/**
 * Counterparty notification seam. Today: no channel (no-op). Planned: TapeSend encrypted container-to-container
 * notes. The TapeSend hub is live on X Layer (proxy 0xe61A9C7213a6Aa616C246a2B569e555B417b25ee, implementation
 * 0xdCC57797089eBD9f26e686379A4323f353a3F9C6; docs/research.md section 9) but unsealed and unaudited, so it is
 * out of scope for v2. Also out of scope: email, push, any backend.
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
