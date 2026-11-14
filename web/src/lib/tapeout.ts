import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { config } from "../config";
import { client } from "./client";
import { resolveTapeName, XLAYER_TAPEOUT } from "../../../shared/tapeoutCore";

/** Seller's TapeOut name for a container. Only on X Layer mainnet, the only chain with documented TapeOut addresses. */
export function useTapeName(container: Address | null) {
  const enabled = !!container && !config.mock && config.chain.id === XLAYER_TAPEOUT.chainId;
  return useQuery({
    queryKey: ["tapeName", container],
    enabled,
    queryFn: () => resolveTapeName(client, container!),
    staleTime: 5 * 60_000,
    retry: 0,
  });
}
