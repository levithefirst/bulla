import { defineChain, type Chain } from "viem";
import { NETWORK_KEYS, resolveDeployment, type DeploymentsFile, type NetworkKey } from "../../shared/deployments";
import deployments from "../../contracts/deployments.json";
import dewebJson from "./deweb.json";

// Values from docs/research.md §1 (official X Layer network information page).
export const xLayerMainnet = defineChain({
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.xlayer.tech", "https://xlayerrpc.okx.com"] } },
  blockExplorers: { default: { name: "OKX Explorer", url: "https://www.okx.com/web3/explorer/xlayer" } },
});

export const xLayerTestnet = defineChain({
  id: 1952,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: ["https://testrpc.xlayer.tech/terigon", "https://xlayertestrpc.okx.com/terigon"] } },
  blockExplorers: { default: { name: "OKX Explorer", url: "https://www.okx.com/web3/explorer/xlayer-test" } },
  testnet: true,
});

export const localhost = defineChain({
  id: 31337,
  name: "Localhost (Hardhat)",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
  testnet: true,
});

const CHAINS: Record<NetworkKey, Chain> = { localhost, xlayerTestnet: xLayerTestnet, xlayerMainnet: xLayerMainnet };

const networkKey = (import.meta.env.VITE_BULLA_NETWORK || "xlayerMainnet") as NetworkKey;
if (!NETWORK_KEYS.includes(networkKey)) throw new Error(`Unknown VITE_BULLA_NETWORK "${networkKey}"`);
// contracts/deployments.json is written by the deploy scripts in the same shared schema.
const dep = resolveDeployment(deployments as DeploymentsFile, networkKey, {
  escrow: import.meta.env.VITE_ESCROW_ADDRESS,
  token: import.meta.env.VITE_ESCROW_TOKEN,
  judgeEscrow: import.meta.env.VITE_JUDGE_ESCROW_ADDRESS,
  judgeToken: import.meta.env.VITE_JUDGE_TOKEN,
  judgeDeployBlock: import.meta.env.VITE_JUDGE_DEPLOY_BLOCK,
});

const chain = CHAINS[networkKey];
export const config = {
  networkKey,
  chain,
  isXLayer: networkKey !== "localhost",
  rpcUrl: import.meta.env.VITE_RPC_URL || chain.rpcUrls.default.http[0],
  explorer: chain.blockExplorers?.default.url ?? null,
  escrow: dep.escrow,
  token: dep.token,
  tokenSymbolHint: dep.tokenSymbol,
  feeBpsHint: dep.feeBps,
  deployBlock: import.meta.env.VITE_DEPLOY_BLOCK ? BigInt(import.meta.env.VITE_DEPLOY_BLOCK) : dep.deployBlock,
  mock: import.meta.env.VITE_MOCK === "1",
  /**
   * Judge mode: one-tap testnet demo with browser burner keys. Compiled in only for
   * xlayerTestnet (1952) and the local CI node; mainnet builds drop it entirely (__JUDGE_BUILD__).
   */
  judge: __JUDGE_BUILD__ ? dep.judge : null,
  /** Mainnet/DeWEB builds can link out to the hosted testnet judge build. */
  judgeUrl: import.meta.env.VITE_JUDGE_URL || null,
  deweb: dewebJson,
};

export const explorerAddress = (a: string) => (config.explorer ? `${config.explorer}/address/${a}` : null);
export const explorerTx = (h: string) => (config.explorer ? `${config.explorer}/tx/${h}` : null);
