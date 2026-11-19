import { createClient, http } from "viem";

// Used only for `client.request(...)`; see lib/rpc.ts.
import { config } from "../config";

// Read-only client used for every receipt read, wallet or not. A bare `createClient` plus
// tree-shakable actions from "viem/actions" keeps signature-verification crypto and unused
// actions out of the bundle. JSON-RPC batching (max 10, the X Layer public-node limit per
// TapeKit's config) groups the TapeOut name lookup into a few requests.
export const client = createClient({
  chain: config.chain,
  // Short receipt polling on X Layer testnet (~1 s blocks); other networks keep viem's default.
  pollingInterval: config.chain.id === 1952 ? 250 : undefined,
  transport: http(config.rpcUrl, { timeout: 20_000, batch: { batchSize: 10, wait: 16 } }),
});

/**
 * Read client on the chain's second documented public RPC (xlayerrpc.okx.com / xlayertestrpc.okx.com, from the
 * X Layer network information page). Used as a retry target for best-effort reads. Null when VITE_RPC_URL overrides.
 */
const fallbackUrl = import.meta.env.VITE_RPC_URL ? undefined : config.chain.rpcUrls.default.http[1];
export const fallbackClient = fallbackUrl ? createClient({ chain: config.chain, transport: http(fallbackUrl, { timeout: 20_000, batch: { batchSize: 10, wait: 16 } }) }) : null;
