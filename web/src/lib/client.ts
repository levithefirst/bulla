import { createClient, http } from "viem";

// Used only for `client.request(...)`; see lib/rpc.ts.
import { config } from "../config";

// Read-only client used for every receipt read, wallet or not. A bare `createClient` plus
// tree-shakable actions from "viem/actions" keeps signature-verification crypto and unused
// actions out of the bundle. JSON-RPC batching (max 10, the X Layer public-node limit per
// TapeKit's config) groups the TapeOut name lookup into a few requests.
export const client = createClient({
  chain: config.chain,
  transport: http(config.rpcUrl, { timeout: 20_000, batch: { batchSize: 10, wait: 16 } }),
});
