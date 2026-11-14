/**
 * The one schema for contracts/deployments.json, shared by the deploy scripts (write) and the
 * web app (read, at build time). After a human deploys, `npm run build` / `npm run deweb:package`
 * picks the new address up with no code change.
 */
import { getAddress, isAddress, type Address } from "viem";

export const NETWORK_KEYS = ["localhost", "xlayerTestnet", "xlayerMainnet"] as const;
export type NetworkKey = (typeof NETWORK_KEYS)[number];
export const EXPECTED_CHAIN_ID: Record<NetworkKey, number> = { localhost: 31337, xlayerTestnet: 1952, xlayerMainnet: 196 };

export type DeploymentEntry = {
  network: NetworkKey;
  chainId: number;
  escrow: string | null;
  token: string | null;
  tokenSymbol: string | null;
  tokenDecimals: number | null;
  feeRecipient: string | null;
  feeBps: number;
  deployedAt: string | null;
  deployBlock: number | null;
  note?: string;
};

export type DeploymentsFile = { networks: Partial<Record<NetworkKey, DeploymentEntry>> };

/** Returns a list of problems; empty means the entry is well-formed. */
export function validateEntry(e: DeploymentEntry): string[] {
  const p: string[] = [];
  if (!NETWORK_KEYS.includes(e.network)) p.push(`unknown network "${e.network}"`);
  else if (e.chainId !== EXPECTED_CHAIN_ID[e.network]) p.push(`chainId ${e.chainId} does not match ${e.network} (${EXPECTED_CHAIN_ID[e.network]})`);
  for (const k of ["escrow", "token", "feeRecipient"] as const) if (e[k] !== null && !isAddress(e[k]!)) p.push(`${k} is not an address`);
  if (!Number.isInteger(e.feeBps) || e.feeBps < 0 || e.feeBps > 1000) p.push("feeBps must be an integer 0..1000");
  if (e.escrow && (e.deployBlock === null || !Number.isInteger(e.deployBlock) || e.deployBlock < 0)) p.push("deployBlock is required once escrow is set");
  if (e.tokenDecimals !== null && (!Number.isInteger(e.tokenDecimals) || e.tokenDecimals < 0 || e.tokenDecimals > 36)) p.push("tokenDecimals out of range");
  return p;
}

export type ResolvedDeployment = { escrow: Address | null; token: Address | null; tokenSymbol: string | null; feeBps: number; deployBlock: bigint };

const addr = (v: string | null | undefined): Address | null => (v && isAddress(v) ? getAddress(v) : null);

/** What the web app uses for a network: file values, optionally overridden by VITE_* env values. */
export function resolveDeployment(file: DeploymentsFile, key: NetworkKey, overrides: { escrow?: string; token?: string } = {}): ResolvedDeployment {
  const d = file.networks[key];
  return {
    escrow: addr(overrides.escrow) ?? addr(d?.escrow),
    token: addr(overrides.token) ?? addr(d?.token),
    tokenSymbol: d?.tokenSymbol ?? null,
    feeBps: d?.feeBps ?? 50,
    deployBlock: d?.deployBlock != null ? BigInt(d.deployBlock) : 0n,
  };
}
