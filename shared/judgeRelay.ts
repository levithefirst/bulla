/**
 * Judge-mode gas relayer rules, shared by the serverless relayer (web/api/gas.ts) and the browser runner so the
 * numbers match. No browser or chain dependencies: unit tested in contracts/test/JudgeRelay.test.ts.
 */

/** Gas budget per demo wallet for one run. Measured on X Layer testnet (19 Nov 2026, invoice #14 of the judge escrow): the
 *  Freelancer used about 1.0M gas (escrow calls 747k plus circuit mint and open), the Client about 0.57M. The budget is the
 *  larger role plus headroom, because pipelined transactions need gasLimit x price available up front. */
export const GAS_UNITS_PER_ROLE = 1_200_000n;
/** Two plain OKB transfers from the tank per run. */
export const TANK_TRANSFER_GAS = 21_000n;
/** Hard cap on what one run may take from the tank, in gas units at the run's price. */
export const RUN_CAP_GAS_UNITS = 3_000_000n;

/** Gas price used for every judge transaction: the node's price plus 20%. */
export const bumped = (gp: bigint) => (gp * 12n) / 10n;

export type TopUpPlan = { gasPrice: bigint; topUps: [bigint, bigint]; spend: bigint; cap: bigint };

/** What the tank sends to [freelancer, client] so each can pay for its part of one run. */
export function planTopUps(nodeGasPrice: bigint, balances: [bigint, bigint]): TopUpPlan {
  const gasPrice = bumped(nodeGasPrice);
  const need = gasPrice * GAS_UNITS_PER_ROLE;
  const topUps: [bigint, bigint] = [balances[0] < need ? need - balances[0] : 0n, balances[1] < need ? need - balances[1] : 0n];
  const transfers = BigInt(topUps.filter((t) => t > 0n).length);
  return { gasPrice, topUps, spend: topUps[0] + topUps[1] + gasPrice * TANK_TRANSFER_GAS * transfers, cap: gasPrice * RUN_CAP_GAS_UNITS };
}

/** Tank outflow for one run by a new visitor (fresh demo wallets): both full top-ups plus the two transfers. */
export function perRunCost(nodeGasPrice: bigint): bigint {
  return planTopUps(nodeGasPrice, [0n, 0n]).spend;
}

/** Sliding-window limiter keyed by client IP. In-memory per serverless instance: it slows abuse, the per-run cap bounds it. */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(
    readonly max: number,
    readonly windowMs: number,
  ) {}

  /** Records a hit and returns 0 if allowed, or the milliseconds until the next allowed hit. */
  take(key: string, now = Date.now()): number {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return this.windowMs - (now - recent[0]);
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 5_000) for (const [k, v] of this.hits) if (!v.some((t) => now - t < this.windowMs)) this.hits.delete(k);
    return 0;
  }
}

export const isAddr = (a: unknown): a is `0x${string}` => typeof a === "string" && /^0x[0-9a-fA-F]{40}$/.test(a);
