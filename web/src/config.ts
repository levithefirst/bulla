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
  blockExplorers: { default: { name: "OKX Explorer", url: "https://web3.okx.com/explorer/x-layer" } },
});

export const xLayerTestnet = defineChain({
  id: 1952,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: ["https://testrpc.xlayer.tech/terigon", "https://xlayertestrpc.okx.com/terigon"] } },
  blockExplorers: { default: { name: "OKX Explorer", url: "https://web3.okx.com/explorer/x-layer-testnet" } },
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
  // TapeOut overrides are for localhost / testnet stand-ins only; resolveDeployment throws on mainnet.
  tapeoutOpener: import.meta.env.VITE_TAPEOUT_OPENER,
  tapeoutFactory: import.meta.env.VITE_TAPEOUT_FACTORY,
  tapeoutProcessor: import.meta.env.VITE_TAPEOUT_PROCESSOR,
  judgeOpener: import.meta.env.VITE_JUDGE_TAPEOUT_OPENER,
  judgeFactory: import.meta.env.VITE_JUDGE_TAPEOUT_FACTORY,
  judgeProcessor: import.meta.env.VITE_JUDGE_TAPEOUT_PROCESSOR,
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
  /** TapeOut contracts for the real-token escrow: official on 196, stand-ins on testnet/local. */
  tapeout: dep.tapeout,
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
/**
 * External tx explorer: OKLink. As of 19 Nov 2026 neither OKLink nor the OKX explorer had indexed recent X Layer
 * blocks (mainnet or testnet), so the app's own RPC receipt page (appTx) is the primary link and this is secondary.
 */
const OKLINK: Record<number, string> = { 196: "https://www.oklink.com/x-layer", 1952: "https://www.oklink.com/x-layer-testnet" };
export const explorerTx = (h: string) => (OKLINK[config.chain.id] ? `${OKLINK[config.chain.id]}/tx/${h}` : null);
/** In-app transaction receipt read straight from the chain RPC (always resolves once the tx is mined). */
export const appTx = (h: string) => `#/tx/${h}`;
