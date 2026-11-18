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
  /** TapeOut contracts the real-token escrow is bound to. Mainnet: always the official ones. */
  tapeout?: TapeOutBinding;
  /** Judge mode (testnet / local only): BullaEscrow bound to DemoUSD, separate from the real-token escrow. */
  judge?: JudgeDeployment;
};

/** TapeOut contracts an escrow is bound to (constructor immutables `opener`, `factory`). */
export type TapeOutBinding = {
  opener: string;
  factory: string;
  /** Default processor offered in the create form (stand-ins only; null on mainnet, where the seller enters theirs). */
  processor: string | null;
  /** True for the testnet/local stand-ins (MockOpener etc.). Never true on mainnet. */
  standIn: boolean;
};

export type JudgeDeployment = {
  escrow: string;
  token: string;
  deployBlock: number;
  feeRecipient: string;
  feeBps: number;
  deployedAt: string;
  /** Judge mode always uses the stand-ins: TapeOut has no testnet deployment. */
  tapeout: TapeOutBinding;
};

/** Official TapeOut contracts on X Layer mainnet (docs/research.md section 8; TapeKit kernel/src/config.js). */
export const XLAYER_TAPEOUT_OFFICIAL = {
  opener: "0x536adD8F30f03b69f6fbF29d425A816A0dC50106",
  factory: "0x1f09DAeFA827f02CBb40967cc91b259763760761",
} as const;

/** Throws unless the binding is TapeOut's official X Layer opener and factory (used for chain 196). */
export function assertOfficialTapeOut(b: Pick<TapeOutBinding, "opener" | "factory"> & { standIn?: boolean }, where: string) {
  const eq = (a: string, c: string) => a.toLowerCase() === c.toLowerCase();
  if (b.standIn || !eq(b.opener, XLAYER_TAPEOUT_OFFICIAL.opener) || !eq(b.factory, XLAYER_TAPEOUT_OFFICIAL.factory)) {
    throw new Error(`${where}: X Layer mainnet must use the official TapeOut opener ${XLAYER_TAPEOUT_OFFICIAL.opener} and factory ${XLAYER_TAPEOUT_OFFICIAL.factory}; stand-ins are never allowed on 196.`);
  }
}

/** Judge mode may only exist on these networks. Never mainnet. */
export const JUDGE_NETWORKS: readonly NetworkKey[] = ["xlayerTestnet", "localhost"];

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
  if (e.tapeout) {
    if (!isAddress(e.tapeout.opener) || !isAddress(e.tapeout.factory) || (e.tapeout.processor !== null && !isAddress(e.tapeout.processor))) p.push("tapeout addresses invalid");
    if (e.network === "xlayerMainnet") {
      try {
        assertOfficialTapeOut(e.tapeout, "deployments.json");
      } catch (err) {
        p.push((err as Error).message);
      }
    }
  }
  if (e.network === "xlayerMainnet" && e.escrow && !e.tapeout) p.push("xlayerMainnet escrow needs a tapeout binding (official opener and factory)");
  if (e.judge) {
    if (!JUDGE_NETWORKS.includes(e.network)) p.push(`judge mode is not allowed on ${e.network}`);
    if (!isAddress(e.judge.escrow) || !isAddress(e.judge.token) || !isAddress(e.judge.feeRecipient)) p.push("judge addresses invalid");
    if (!Number.isInteger(e.judge.deployBlock) || e.judge.deployBlock < 0) p.push("judge.deployBlock invalid");
    if (!e.judge.tapeout || !e.judge.tapeout.standIn || !e.judge.tapeout.processor) p.push("judge.tapeout must be the stand-ins with a processor");
  }
  return p;
}

export type ResolvedTapeOut = { opener: Address; factory: Address; processor: Address | null; standIn: boolean };
export type ResolvedJudge = { escrow: Address; token: Address; deployBlock: bigint; tapeout: ResolvedTapeOut | null };
export type ResolvedDeployment = {
  escrow: Address | null;
  token: Address | null;
  tokenSymbol: string | null;
  feeBps: number;
  deployBlock: bigint;
  tapeout: ResolvedTapeOut | null;
  judge: ResolvedJudge | null;
};

type TapeOverrides = { tapeoutOpener?: string; tapeoutFactory?: string; tapeoutProcessor?: string; judgeProcessor?: string; judgeOpener?: string; judgeFactory?: string };

function resolveBinding(b: TapeOutBinding | undefined, o: { opener?: string; factory?: string; processor?: string }, standInDefault: boolean): ResolvedTapeOut | null {
  const opener = addr(o.opener) ?? addr(b?.opener);
  const factory = addr(o.factory) ?? addr(b?.factory);
  if (!opener || !factory) return null;
  return { opener, factory, processor: addr(o.processor) ?? addr(b?.processor), standIn: b ? b.standIn : standInDefault };
}

const addr = (v: string | null | undefined): Address | null => (v && isAddress(v) ? getAddress(v) : null);

/** What the web app uses for a network: file values, optionally overridden by VITE_* env values. */
export function resolveDeployment(
  file: DeploymentsFile,
  key: NetworkKey,
  overrides: { escrow?: string; token?: string; judgeEscrow?: string; judgeToken?: string; judgeDeployBlock?: string } & TapeOverrides = {},
): ResolvedDeployment {
  const d = file.networks[key];
  let tapeout: ResolvedTapeOut | null;
  if (key === "xlayerMainnet") {
    // Mainnet: always the official contracts. Any override or stand-in is a hard error.
    if (overrides.tapeoutOpener || overrides.tapeoutFactory || overrides.tapeoutProcessor) throw new Error("TapeOut overrides are not allowed on X Layer mainnet");
    if (d?.tapeout) assertOfficialTapeOut(d.tapeout, "contracts/deployments.json xlayerMainnet.tapeout");
    tapeout = { opener: getAddress(XLAYER_TAPEOUT_OFFICIAL.opener), factory: getAddress(XLAYER_TAPEOUT_OFFICIAL.factory), processor: null, standIn: false };
  } else {
    tapeout = resolveBinding(d?.tapeout, { opener: overrides.tapeoutOpener, factory: overrides.tapeoutFactory, processor: overrides.tapeoutProcessor }, true);
  }
  let judge: ResolvedJudge | null = null;
  if (JUDGE_NETWORKS.includes(key)) {
    const je = addr(overrides.judgeEscrow) ?? addr(d?.judge?.escrow);
    const jt = addr(overrides.judgeToken) ?? addr(d?.judge?.token);
    const jb = overrides.judgeDeployBlock ? BigInt(overrides.judgeDeployBlock) : BigInt(d?.judge?.deployBlock ?? 0);
    const jtape = resolveBinding(d?.judge?.tapeout, { opener: overrides.judgeOpener, factory: overrides.judgeFactory, processor: overrides.judgeProcessor }, true);
    if (je && jt) judge = { escrow: je, token: jt, deployBlock: jb, tapeout: jtape };
  }
  return {
    tapeout,
    judge,
    escrow: addr(overrides.escrow) ?? addr(d?.escrow),
    token: addr(overrides.token) ?? addr(d?.token),
    tokenSymbol: d?.tokenSymbol ?? null,
    feeBps: d?.feeBps ?? 50,
    deployBlock: d?.deployBlock != null ? BigInt(d.deployBlock) : 0n,
  };
}
