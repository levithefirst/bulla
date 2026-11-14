import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { decodeEventLog, getAddress, isAddress, isHex, keccak256, parseUnits, toBytes, type Hex } from "viem";
import { bullaEscrowAbi } from "../abi/bullaEscrow";
import { config } from "../config";
import { parseContainerId, ZERO32 } from "../lib/format";
import { useEscrowInfo, useTokenInfo, useChainNow } from "../lib/invoice";
import { publicClient } from "../wagmi";
import { useToasts } from "./Toasts";
import { useWrongNetwork } from "./Wallet";
import { parseError } from "../lib/errors";
import { UnauditedWarning, CircuitHolderWarning } from "./Warnings";

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreateInvoiceForm({ onCreated }: { onCreated: (id: bigint) => void }) {
  const { address, isConnected } = useAccount();
  const wrong = useWrongNetwork();
  const escrow = useEscrowInfo();
  const token = useTokenInfo(escrow.data?.token ?? config.token);
  const now = useChainNow();
  const { writeContractAsync } = useWriteContract();
  const toasts = useToasts();

  const [buyer, setBuyer] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState(() => toLocalInput(new Date(Date.now() + 14 * 86400_000)));
  const [deliveryHash, setDeliveryHash] = useState("");
  const [container, setContainer] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decimals = token.data?.decimals;
  const symbol = token.data?.symbol ?? config.tokenSymbolHint ?? "token";

  function validate(): { args: readonly [`0x${string}`, `0x${string}`, bigint, bigint, Hex, Hex, string] } | string {
    if (!escrow.data) return "Escrow contract is not reachable.";
    if (decimals === undefined) return "Token decimals not loaded yet.";
    if (!isAddress(buyer.trim())) return "Buyer must be a valid 0x address.";
    if (address && getAddress(buyer.trim()) === address) return "Buyer cannot be your own address.";
    let amt: bigint;
    try {
      amt = parseUnits(amount.trim(), decimals);
    } catch {
      return "Amount is not a valid number.";
    }
    if (amt <= 0n) return "Amount must be greater than zero.";
    const dueTs = BigInt(Math.floor(new Date(due).getTime() / 1000));
    if (!dueTs || (now.data && dueTs <= now.data)) return "Due date must be in the future.";
    let dh: Hex = ZERO32;
    const d = deliveryHash.trim();
    if (d) dh = isHex(d) && d.length === 66 ? (d as Hex) : keccak256(toBytes(d));
    const cid = parseContainerId(container);
    if (!cid || cid === ZERO32) return "Circuit container id must be a container address (0x + 40 hex) or a bytes32 (0x + 64 hex).";
    return { args: [getAddress(buyer.trim()), escrow.data.token, amt, dueTs, dh, cid, memo.trim()] as const };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (typeof v === "string") return setError(v);
    setBusy(true);
    const tid = toasts.push({ kind: "pending", title: "Create invoice: confirm in your wallet" });
    try {
      const hash = await writeContractAsync({ address: escrow.data!.address, abi: bullaEscrowAbi, functionName: "createInvoice", args: v.args, chainId: config.chain.id });
      toasts.update(tid, { kind: "pending", title: "Create invoice: pending", body: `tx ${hash.slice(0, 10)}…` });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("createInvoice reverted on chain.");
      let id: bigint | null = null;
      for (const log of receipt.logs) {
        try {
          const ev = decodeEventLog({ abi: bullaEscrowAbi, data: log.data, topics: log.topics });
          if (ev.eventName === "InvoiceCreated") id = ev.args.id;
        } catch {
          /* other contract's log */
        }
      }
      if (id === null) throw new Error("Invoice created but the InvoiceCreated event was not found.");
      toasts.update(tid, { kind: "success", title: `Invoice #${id} created`, body: "Share the receipt link with your buyer." });
      onCreated(id);
    } catch (err) {
      const msg = parseError(err);
      toasts.update(tid, { kind: "error", title: "Create invoice failed", body: msg });
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  const disabled = !isConnected || wrong || busy || config.mock || !config.escrow;

  return (
    <form className="card form" onSubmit={submit} data-testid="create-form">
      <h2>Create an invoice</h2>
      <p className="muted">You are the seller. The buyer funds it, you deliver, they release. If it is not released by the due date, the buyer can take a refund.</p>
      {!config.escrow && <div className="error">BullaEscrow is not deployed on {config.chain.name} yet. Creating invoices is disabled.</div>}
      {escrow.isError && config.escrow && <div className="error">Cannot reach the escrow contract over RPC: {parseError(escrow.error)}</div>}

      <label>
        Buyer address
        <input name="buyer" className="mono" placeholder="0x…" value={buyer} onChange={(e) => setBuyer(e.target.value)} required />
      </label>
      <label>
        Amount ({symbol})
        <input name="amount" inputMode="decimal" placeholder="250.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <small className="muted">
          Token: <span className="mono">{escrow.data?.token ?? config.token ?? "-"}</span> (set by the escrow contract)
        </small>
      </label>
      <label>
        Due date / refund time-lock
        <input name="due" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} required />
        <small className="muted">After this time the buyer can reclaim funds unless they were released. Leave room to review the delivery.</small>
      </label>
      <label>
        Circuit container id
        <input name="container" className="mono" placeholder="0x… TapeOut container address" value={container} onChange={(e) => setContainer(e.target.value)} required />
        <small className="muted">The TapeOut circuit container this invoice is bound to (see docs/tapeout-binding.md). Stored on chain as bytes32.</small>
      </label>
      <label>
        Agreed deliverable hash (optional)
        <input name="deliveryHash" className="mono" placeholder="0x… bytes32, or any text to hash" value={deliveryHash} onChange={(e) => setDeliveryHash(e.target.value)} />
      </label>
      <label>
        Description
        <input name="memo" maxLength={140} placeholder="Logo design, milestone 1" value={memo} onChange={(e) => setMemo(e.target.value)} />
      </label>

      <UnauditedWarning />
      <CircuitHolderWarning />
      {error && <div className="error" data-testid="form-error">{error}</div>}
      <button className="btn btn-primary" type="submit" disabled={disabled} data-testid="create-submit">
        {busy ? "Creating…" : !isConnected ? "Connect a wallet to create" : wrong ? `Switch to ${config.chain.name}` : "Create invoice"}
      </button>
    </form>
  );
}
