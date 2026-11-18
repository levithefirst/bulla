import { useQuery, useQueryClient } from "@tanstack/react-query";
import { erc20Abi, parseAbi, type Address, type Hex } from "viem";
import { bullaEscrowAbi } from "../abi/bullaEscrow";
import { config } from "../config";
import { client } from "./client";
import { ethCall, getLogs, latestTimestamp } from "../../../shared/rpc";
import { MOCK_INVOICES, MOCK_TOKEN } from "./mock";
import { useEscrowTarget, type EscrowTarget } from "./escrowTarget";
import { assertOfficialTapeOut } from "../../../shared/deployments";

/** Contract invoice states (BullaEscrow v2). */
export const STATE_NAMES = ["None", "Draft", "Funded", "Completed", "Refunded", "Cancelled"] as const;
export type ContractStateName = (typeof STATE_NAMES)[number];
/** What a badge shows: contract state refined by milestone progress. */
export type StateName = "None" | "Draft" | "Funded" | "Submitted" | "Partly released" | "Released" | "Completed" | "Refunded" | "Cancelled";
export const MILESTONE_STATES = ["Pending", "Submitted", "Released", "Refunded"] as const;
export type MilestoneStateName = (typeof MILESTONE_STATES)[number];

export type Invoice = {
  id: bigint;
  seller: Address;
  buyer: Address;
  token: Address;
  arbiter: Address;
  processor: Address;
  circuitId: bigint;
  container: Address;
  payToContainer: boolean;
  totalAmount: bigint;
  releasedAmount: bigint;
  refundedAmount: bigint;
  milestoneCount: number;
  dueTimestamp: bigint;
  createdAt: bigint;
  fundedAt: bigint;
  closedAt: bigint;
  state: number;
  sellerCancelConsent: boolean;
  buyerCancelConsent: boolean;
  termsHash: Hex;
  memo: string;
};

export type Milestone = {
  amount: bigint;
  state: number;
  deliveryHash: Hex;
  deliveryURI: string;
  label: string;
  submittedAt: bigint;
  closedAt: bigint;
  paidTo: Address;
};

export type InvoiceData = { invoice: Invoice; milestones: Milestone[]; payoutTarget: Address; containerOpened: boolean };

export const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as Address;
export const milestoneStateName = (s: number): MilestoneStateName => MILESTONE_STATES[s] ?? "Pending";

/** Badge status: Draft, Funded, Submitted (a delivery awaits release), Partly released, Released (all paid), Completed (settled with some refunded), Refunded, Cancelled. */
export function displayState(inv: Invoice, ms: Milestone[]): StateName {
  const c = STATE_NAMES[inv.state] ?? "None";
  if (c === "Completed") return inv.refundedAmount === 0n ? "Released" : "Completed";
  if (c !== "Funded") return c;
  if (ms.some((m) => m.state === 1)) return "Submitted";
  if (ms.some((m) => m.state === 2 || m.state === 3)) return "Partly released";
  return "Funded";
}

export type TokenInfo = { address: Address; symbol: string; decimals: number };
export type EscrowInfo = { address: Address; feeBps: number; feeRecipient: Address; token: Address; opener: Address; factory: Address };
export type TxRef = { event: string; hash: Hex; blockNumber: bigint; index?: number };


export class NotConfiguredError extends Error {}

export function requireEscrow(t: EscrowTarget): Address {
  if (!t.address) throw new NotConfiguredError(`BullaEscrow is not deployed on ${config.chain.name} yet (no address in contracts/deployments.json).`);
  return t.address;
}

export function useEscrowInfo() {
  const t = useEscrowTarget();
  return useQuery({
    queryKey: ["escrow", t.address],
    queryFn: async (): Promise<EscrowInfo> => {
      if (config.mock)
        return { address: "0x000000000000000000000000000000000000b011", feeBps: 50, feeRecipient: "0x000000000000000000000000000000000000fee5", token: MOCK_TOKEN.address, opener: ZERO_ADDR, factory: ZERO_ADDR };
      const address = requireEscrow(t);
      const [feeBps, feeRecipient, token, opener, factory] = await Promise.all([
        ethCall(client, { address, abi: bullaEscrowAbi, functionName: "feeBps" }),
        ethCall(client, { address, abi: bullaEscrowAbi, functionName: "feeRecipient" }),
        ethCall(client, { address, abi: bullaEscrowAbi, functionName: "token" }),
        ethCall(client, { address, abi: bullaEscrowAbi, functionName: "opener" }),
        ethCall(client, { address, abi: bullaEscrowAbi, functionName: "factory" }),
      ]);
      // Runtime guard: on X Layer mainnet the escrow must be bound to TapeOut's official contracts.
      if (config.chain.id === 196) assertOfficialTapeOut({ opener, factory }, `BullaEscrow ${address}`);
      return { address, feeBps: Number(feeBps), feeRecipient, token, opener, factory };
    },
    staleTime: 60_000,
    retry: 1,
  });
}

export function useTokenInfo(token?: Address | null) {
  return useQuery({
    queryKey: ["token", token],
    enabled: !!token,
    queryFn: async (): Promise<TokenInfo> => {
      if (config.mock) return MOCK_TOKEN;
      const [symbol, decimals] = await Promise.all([
        ethCall(client, { address: token!, abi: erc20Abi, functionName: "symbol" }),
        ethCall(client, { address: token!, abi: erc20Abi, functionName: "decimals" }),
      ]);
      return { address: token!, symbol, decimals };
    },
    staleTime: Infinity,
    retry: 1,
  });
}

export function useInvoice(id: bigint | null) {
  const t = useEscrowTarget();
  return useQuery({
    queryKey: ["invoice", t.address, id?.toString()],
    enabled: id !== null,
    queryFn: async (): Promise<InvoiceData> => {
      if (config.mock) {
        const d = MOCK_INVOICES.find((x) => x.invoice.id === id);
        if (!d) throw new Error(`Invoice #${id} not found (mock data has ids 1-${MOCK_INVOICES.length}).`);
        return d;
      }
      const address = requireEscrow(t);
      const [invoice, milestones, payoutTarget, containerOpened] = await Promise.all([
        ethCall(client, { address, abi: bullaEscrowAbi, functionName: "getInvoice", args: [id!] }),
        ethCall(client, { address, abi: bullaEscrowAbi, functionName: "getMilestones", args: [id!] }),
        ethCall(client, { address, abi: bullaEscrowAbi, functionName: "payoutTarget", args: [id!] }),
        ethCall(client, { address, abi: bullaEscrowAbi, functionName: "containerOpened", args: [id!] }),
      ]);
      return { invoice: invoice as unknown as Invoice, milestones: milestones as unknown as Milestone[], payoutTarget, containerOpened };
    },
    refetchInterval: 10_000,
    retry: (count, err) => !(err instanceof NotConfiguredError) && !String(err).includes("InvoiceNotFound") && count < 1,
  });
}

/** Chain time (latest block timestamp). Time-locks are judged against the chain, not the laptop clock. */
export function useChainNow() {
  return useQuery({
    queryKey: ["chainNow"],
    queryFn: async () => {
      if (config.mock) return BigInt(Math.floor(Date.now() / 1000));
      return latestTimestamp(client);
    },
    refetchInterval: 10_000,
  });
}

/** Best-effort transaction hashes for the timeline. Failure (e.g. RPC log range limits) is not fatal. */
export function useInvoiceTxs(id: bigint | null) {
  const t = useEscrowTarget();
  return useQuery({
    queryKey: ["invoiceTxs", t.address, id?.toString()],
    enabled: id !== null && !config.mock && !!t.address,
    queryFn: async (): Promise<TxRef[]> => {
      const logs = await getLogs(client, t.address!, bullaEscrowAbi, t.deployBlock);
      return logs
        .filter((l) => l.args.id === id)
        .map((l) => ({ event: l.eventName, hash: l.transactionHash, blockNumber: l.blockNumber, index: typeof l.args.index === "bigint" ? Number(l.args.index) : undefined }));
    },
    refetchInterval: 15_000,
    retry: 0,
  });
}

export function useInvalidateInvoice() {
  const qc = useQueryClient();
  // Prefix invalidation: covers both escrow targets.
  return (_id?: bigint) => {
    qc.invalidateQueries({ queryKey: ["invoice"] });
    qc.invalidateQueries({ queryKey: ["invoiceTxs"] });
    qc.invalidateQueries({ queryKey: ["allowance"] });
    qc.invalidateQueries({ queryKey: ["balance"] });
    qc.invalidateQueries({ queryKey: ["chainNow"] });
  };
}

export function useAllowanceAndBalance(owner?: Address, token?: Address) {
  const t = useEscrowTarget();
  return useQuery({
    queryKey: ["allowance", t.address, owner, token],
    enabled: !!owner && !!token && !config.mock && !!t.address,
    queryFn: async () => {
      const [allowance, balance] = await Promise.all([
        ethCall(client, { address: token!, abi: erc20Abi, functionName: "allowance", args: [owner!, t.address!] }),
        ethCall(client, { address: token!, abi: erc20Abi, functionName: "balanceOf", args: [owner!] }),
      ]);
      return { allowance, balance };
    },
    refetchInterval: 10_000,
  });
}

export function quoteFee(amount: bigint, feeBps: number) {
  const fee = (amount * BigInt(feeBps)) / 10_000n;
  return { fee, net: amount - fee };
}

export type SellerHistory = { fundedInvoices: number; releasedMilestones: number; releasedGross: bigint; refundedMilestones: number };

/**
 * On-chain activity of a TapeOut circuit on this escrow (funded invoices only; unfunded drafts are excluded), from the contract's on-chain `circuitStats`
 * counters (no event scan: the public X Layer RPC rejects eth_getLogs, docs/research.md section 9).
 */
export function useSellerHistory(processor?: Address, circuitId?: bigint) {
  const t = useEscrowTarget();
  return useQuery({
    queryKey: ["sellerHistory", t.address, processor, circuitId?.toString()],
    enabled: !!processor && circuitId !== undefined && !config.mock && !!t.address,
    queryFn: async (): Promise<SellerHistory> => {
      const st = await ethCall(client, { address: t.address!, abi: bullaEscrowAbi, functionName: "circuitStats", args: [processor!, circuitId!] });
      return { fundedInvoices: Number(st.fundedInvoices), releasedMilestones: Number(st.releasedMilestones), releasedGross: st.releasedAmount, refundedMilestones: Number(st.refundedMilestones) };
    },
    refetchInterval: 15_000,
    retry: 0,
  });
}

/** Container EXEC_FEE() read live (TapeOut account logic; docs/research.md section 9). Null if the container has no such function (e.g. a stand-in). */
export function useExecFee(container?: Address) {
  return useQuery({
    queryKey: ["execFee", container],
    enabled: !!container && !config.mock,
    queryFn: async () => {
      try {
        return await ethCall(client, { address: container!, abi: parseAbi(["function EXEC_FEE() view returns (uint256)"]), functionName: "EXEC_FEE" });
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
    retry: 0,
  });
}
