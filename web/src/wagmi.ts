import { createConfig, http, injected } from "@wagmi/core";
import { createPublicClient, http as viemHttp } from "viem";
import { config } from "./config";

// Two connectors only: OKX Wallet (window.okxwallet) and any injected EIP-1193 wallet
// (MetaMask, Rabby, ...). No WalletConnect: it needs a hosted relay and a project id.
type AnyWindow = (Window & { okxwallet?: unknown; ethereum?: unknown }) | undefined;
const okxWallet = injected({
  target: { id: "okxWallet", name: "OKX Wallet", provider: ((w?: AnyWindow) => w?.okxwallet) as never },
});
const browserWallet = injected({
  target: { id: "injected", name: "Browser wallet", provider: ((w?: AnyWindow) => w?.ethereum) as never },
});

export const wagmiConfig = createConfig({
  chains: [config.chain],
  connectors: [okxWallet, browserWallet],
  multiInjectedProviderDiscovery: false,
  transports: { [config.chain.id]: http(config.rpcUrl) },
});

// Read-only client used for every receipt read, wallet or not.
export const publicClient = createPublicClient({ chain: config.chain, transport: viemHttp(config.rpcUrl, { timeout: 20_000 }) });

declare global {
  interface Window {
    ethereum?: unknown;
  }
}
