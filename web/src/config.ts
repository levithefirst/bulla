import { defineChain, getAddress, isAddress, type Address, type Chain } from "viem";
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

type NetworkKey = "localhost" | "xlayerTestnet" | "xlayerMainnet";
const CHAINS: Record<NetworkKey, Chain> = { localhost, xlayerTestnet: xLayerTestnet, xlayerMainnet: xLayerMainnet };

type Dep = { escrow: string | null; token: string | null; tokenSymbol: string | null; feeBps: number; deployBlock: number | null };

function addr(v: string | null | undefined): Address | null {
  return v && isAddress(v) ? getAddress(v) : null;
}

const networkKey = ((import.meta.env.VITE_BULLA_NETWORK as NetworkKey) || "xlayerMainnet") as NetworkKey;
if (!(networkKey in CHAINS)) throw new Error(`Unknown VITE_BULLA_NETWORK "${networkKey}"`);
const dep = ((deployments as { networks: Record<string, Dep> }).networks[networkKey] ?? null) as Dep | null;

const chain = CHAINS[networkKey];
export const config = {
  networkKey,
  chain,
  isXLayer: networkKey !== "localhost",
  rpcUrl: import.meta.env.VITE_RPC_URL || chain.rpcUrls.default.http[0],
  explorer: chain.blockExplorers?.default.url ?? null,
  escrow: addr(import.meta.env.VITE_ESCROW_ADDRESS) ?? addr(dep?.escrow),
  token: addr(import.meta.env.VITE_ESCROW_TOKEN) ?? addr(dep?.token),
  tokenSymbolHint: dep?.tokenSymbol ?? null,
  feeBpsHint: dep?.feeBps ?? 50,
  deployBlock: dep?.deployBlock != null ? BigInt(dep.deployBlock) : 0n,
  mock: import.meta.env.VITE_MOCK === "1",
  deweb: dewebJson,
};

export const explorerAddress = (a: string) => (config.explorer ? `${config.explorer}/address/${a}` : null);
export const explorerTx = (h: string) => (config.explorer ? `${config.explorer}/tx/${h}` : null);
