/**
 * Probe an EVM RPC: chain id, block number, and (optionally) an ERC-20.
 *   X_LAYER_RPC=https://rpc.xlayer.tech npm run probe:network
 * Optional: ESCROW_TOKEN, PROBE_ACCOUNT, X_LAYER_CHAIN_ID (asserted), ESCROW_ADDRESS.
 */
import "dotenv/config";
import { createPublicClient, http, erc20Abi, isAddress, getAddress, formatUnits } from "viem";

function die(msg: string): never {
  console.error(`probe-network: ${msg}`);
  process.exit(1);
}

async function main() {
  const rpc = process.env.X_LAYER_RPC?.trim();
  if (!rpc) die("X_LAYER_RPC is not set. Copy .env.example to .env or export it.");
  const client = createPublicClient({ transport: http(rpc, { timeout: 15_000 }) });

  const chainId = await client.getChainId().catch((e) => die(`RPC ${rpc} failed: ${e.shortMessage ?? e.message}`));
  const block = await client.getBlockNumber();
  console.log(`rpc        ${rpc}`);
  console.log(`chainId    ${chainId}`);
  console.log(`block      ${block}`);

  const expected = process.env.X_LAYER_CHAIN_ID?.trim();
  if (expected && Number(expected) !== chainId) die(`chainId mismatch: expected ${expected}, got ${chainId}`);

  const token = process.env.ESCROW_TOKEN?.trim();
  if (token) {
    if (!isAddress(token)) die(`ESCROW_TOKEN is not an address: ${token}`);
    const address = getAddress(token);
    const code = await client.getCode({ address });
    if (!code || code === "0x") die(`no contract code at ESCROW_TOKEN ${address}`);
    const [symbol, decimals, name, totalSupply] = await Promise.all([
      client.readContract({ address, abi: erc20Abi, functionName: "symbol" }),
      client.readContract({ address, abi: erc20Abi, functionName: "decimals" }),
      client.readContract({ address, abi: erc20Abi, functionName: "name" }),
      client.readContract({ address, abi: erc20Abi, functionName: "totalSupply" }),
    ]);
    console.log(`token      ${address}`);
    console.log(`  name     ${name}`);
    console.log(`  symbol   ${symbol}`);
    console.log(`  decimals ${decimals}`);
    console.log(`  supply   ${formatUnits(totalSupply, decimals)}`);
    const who = process.env.PROBE_ACCOUNT?.trim() || "0x0000000000000000000000000000000000000001";
    if (!isAddress(who)) die(`PROBE_ACCOUNT is not an address: ${who}`);
    const bal = await client.readContract({ address, abi: erc20Abi, functionName: "balanceOf", args: [getAddress(who)] });
    console.log(`  balanceOf(${who}) = ${formatUnits(bal, decimals)} ${symbol}`);
  } else {
    console.log("token      (ESCROW_TOKEN not set, skipped)");
  }

  const escrow = process.env.ESCROW_ADDRESS?.trim();
  if (escrow) {
    if (!isAddress(escrow)) die(`ESCROW_ADDRESS is not an address: ${escrow}`);
    const code = await client.getCode({ address: getAddress(escrow) });
    console.log(`escrow     ${escrow} ${code && code !== "0x" ? "(has code)" : "(NO CODE)"}`);
  }
}

main().catch((e) => die(e?.shortMessage ?? e?.message ?? String(e)));
