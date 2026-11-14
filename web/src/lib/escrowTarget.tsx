import { createContext, useContext, type ReactNode } from "react";
import type { Address } from "viem";
import { config } from "../config";

/**
 * Which BullaEscrow a page talks to: the real-token escrow (USDC on X Layer) or, on testnet /
 * local judge builds only, the judge-mode escrow bound to DemoUSD.
 */
export type EscrowTarget = { kind: "real" | "judge"; address: Address | null; deployBlock: bigint };

export const REAL_TARGET: EscrowTarget = { kind: "real", address: config.escrow, deployBlock: config.deployBlock };
export const JUDGE_TARGET: EscrowTarget | null = config.judge ? { kind: "judge", address: config.judge.escrow, deployBlock: config.judge.deployBlock } : null;

const Ctx = createContext<EscrowTarget>(REAL_TARGET);

export function EscrowTargetProvider({ target, children }: { target: EscrowTarget; children: ReactNode }) {
  return <Ctx.Provider value={target}>{children}</Ctx.Provider>;
}

export const useEscrowTarget = () => useContext(Ctx);
