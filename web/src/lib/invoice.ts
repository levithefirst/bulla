import { useQuery, useQueryClient } from "@tanstack/react-query";
import { erc20Abi, type Address, type Hex } from "viem";
import { bullaEscrowAbi } from "../abi/bullaEscrow";
import { config } from "../config";
import { client } from "./client";
import { ethCall, getLogs, latestTimestamp } from "./rpc";
import { MOCK_INVOICES, MOCK_TOKEN } from "./mock";

export const STATE_NAMES = ["None", "Draft", "Funded", "Submitted", "Released", "Refunded", "Cancelled"] as const;
export type StateName = (typeof STATE_NAMES)[number];

export type Invoice = {
  id: bigint;
  seller: Address;
  buyer: Address;
  token: Address;
  totalAmount: bigint;
  deliveryHash: Hex;
  deliveryURI: string;
  dueTimestamp: bigint;
  createdAt: bigint;
  fundedAt: bigint;
  submittedAt: bigint;
  closedAt: bigint;
  state: number;
  circuitContainerId: Hex;
  sellerCancelConsent: boolean;
  buyerCancelConsent: boolean;
  memo: string;
};

export type TokenInfo = { address: Address; symbol: string; decimals: number };
export type EscrowInfo = { address: Address; feeBps: number; feeRecipient: Address; token: Address };
export type TxRef = { event: string; hash: Hex; blockNumber: bigint };

export const stateName = (s: number): StateName => STATE_NAMES[s] ?? "None";

export class NotConfiguredError extends Error {}

export function requireEscrow(): Address {
  if (!config.escrow) throw new NotConfiguredError(`BullaEscrow is not deployed on ${config.chain.name} yet (no address in contracts/deployments.json).`);
  return config.escrow;
}

export function useEscrowInfo() {
  return useQuery({
    queryKey: ["escrow", config.escrow],
    queryFn: async (): Promise<EscrowInfo> => {
      if (config.mock) return { address: "0x000000000000000000000000000000000000b011", feeBps: 50, feeRecipient: "0x000000000000000000000000000000000000fee5", token: MOCK_TOKEN.address };
      const address = requireEscrow();
      const [feeBps, feeRecipient, token] = await Promise.all([
        ethCall(client, { address, abi: bullaEscrowAbi, functionName: "feeBps" }),
        ethCall(client, { address, abi: bullaEscrowAbi, functionName: "feeRecipient" }),
        ethCall(client, { address, abi: bullaEscrowAbi, functionName: "token" }),
      ]);
      return { address, feeBps: Number(feeBps), feeRecipient, token };
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
  return useQuery({
    queryKey: ["invoice", id?.toString()],
    enabled: id !== null,
    queryFn: async (): Promise<Invoice> => {
      if (config.mock) {
        const inv = MOCK_INVOICES.find((x) => x.id === id);
        if (!inv) throw new Error(`Invoice #${id} not found (mock data has ids 1-${MOCK_INVOICES.length}).`);
        return inv;
      }
      const address = requireEscrow();
      return (await ethCall(client, { address, abi: bullaEscrowAbi, functionName: "getInvoice", args: [id!] })) as Invoice;
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
  return useQuery({
    queryKey: ["invoiceTxs", id?.toString()],
    enabled: id !== null && !config.mock && !!config.escrow,
    queryFn: async (): Promise<TxRef[]> => {
      const logs = await getLogs(client, config.escrow!, bullaEscrowAbi, config.deployBlock);
      return logs.filter((l) => l.args.id === id).map((l) => ({ event: l.eventName, hash: l.transactionHash, blockNumber: l.blockNumber }));
    },
    refetchInterval: 15_000,
    retry: 0,
  });
}

export function useInvalidateInvoice() {
  const qc = useQueryClient();
  return (id?: bigint) => {
    qc.invalidateQueries({ queryKey: ["invoice", id?.toString()] });
    qc.invalidateQueries({ queryKey: ["invoiceTxs", id?.toString()] });
    qc.invalidateQueries({ queryKey: ["allowance"] });
    qc.invalidateQueries({ queryKey: ["balance"] });
    qc.invalidateQueries({ queryKey: ["chainNow"] });
  };
}

export function useAllowanceAndBalance(owner?: Address, token?: Address) {
  return useQuery({
    queryKey: ["allowance", owner, token],
    enabled: !!owner && !!token && !config.mock && !!config.escrow,
    queryFn: async () => {
      const [allowance, balance] = await Promise.all([
        ethCall(client, { address: token!, abi: erc20Abi, functionName: "allowance", args: [owner!, config.escrow!] }),
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
