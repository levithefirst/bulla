import { useState } from "react";
import type { Hex } from "viem";
import { explorerTx } from "../config";
import { client } from "./client";
import { waitForReceipt } from "./rpc";
import { useToasts } from "../components/Toasts";
import { parseError } from "./errors";

/** Wraps a wallet write: pending toast with hash -> wait for receipt -> success or parsed revert. */
export function useTx() {
  const toasts = useToasts();
  const [busy, setBusy] = useState(false);

  async function run(label: string, send: () => Promise<Hex>, onDone?: () => void): Promise<boolean> {
    setBusy(true);
    const id = toasts.push({ kind: "pending", title: `${label}: confirm in your wallet` });
    try {
      const hash = await send();
      const link = explorerTx(hash);
      toasts.update(id, { kind: "pending", title: `${label}: pending`, body: `tx ${hash.slice(0, 10)}…${hash.slice(-6)}`, link: link ? { href: link, label: "View on explorer" } : undefined });
      const receipt = await waitForReceipt(client, hash);
      if (receipt.status !== "success") throw new Error(`${label} reverted on chain (tx ${hash}).`);
      toasts.update(id, { kind: "success", title: `${label}: confirmed`, body: `block ${receipt.blockNumber}`, link: link ? { href: link, label: "View on explorer" } : undefined });
      onDone?.();
      return true;
    } catch (e) {
      toasts.update(id, { kind: "error", title: `${label} failed`, body: parseError(e) });
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { run, busy };
}
