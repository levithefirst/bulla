/**
 * Minimal EIP-1193 wallet layer (replaces wagmi to cut ~40 KB from the DeWEB bundle).
 * Two connectors: OKX Wallet (window.okxwallet) and any injected wallet (window.ethereum).
 * No WalletConnect: it needs a hosted relay and a project id.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getAddress, type Address } from "viem";
import { config } from "../config";

export type Eip1193 = {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?(event: string, fn: (...a: never[]) => void): void;
  removeListener?(event: string, fn: (...a: never[]) => void): void;
};

export type ConnectorId = "okxWallet" | "injected";
type W = Window & { okxwallet?: Eip1193; ethereum?: Eip1193 };
export const CONNECTORS: { id: ConnectorId; name: string; get: () => Eip1193 | undefined }[] = [
  { id: "okxWallet", name: "OKX Wallet", get: () => (window as W).okxwallet },
  { id: "injected", name: "Browser wallet", get: () => (window as W).ethereum },
];

const KEY = "bulla.wallet";
const store = {
  get: (): ConnectorId | null => {
    try {
      const v = localStorage.getItem(KEY);
      return v === "okxWallet" || v === "injected" ? v : null;
    } catch {
      return null;
    }
  },
  set: (v: ConnectorId | null) => {
    try {
      if (v) localStorage.setItem(KEY, v);
      else localStorage.removeItem(KEY);
    } catch {
      /* storage unavailable */
    }
  },
};

export class WalletError extends Error {
  code?: number;
}

type State = {
  address?: Address;
  chainId?: number;
  connectorId?: ConnectorId;
  provider?: Eip1193;
  isConnecting: boolean;
};

type Api = State & {
  isConnected: boolean;
  wrongNetwork: boolean;
  connect(id: ConnectorId): Promise<void>;
  disconnect(): void;
  switchChain(): Promise<void>;
};

const Ctx = createContext<Api | null>(null);

const toAddr = (a: unknown): Address | undefined => (Array.isArray(a) && typeof a[0] === "string" ? getAddress(a[0]) : undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>({ isConnecting: false });
  const provRef = useRef<Eip1193 | undefined>();

  const attach = useCallback(async (id: ConnectorId, provider: Eip1193, prompt: boolean) => {
    const accounts = await provider.request({ method: prompt ? "eth_requestAccounts" : "eth_accounts" });
    const address = toAddr(accounts);
    if (!address) {
      if (prompt) throw new WalletError("The wallet returned no account.");
      return false;
    }
    const chainId = Number(await provider.request({ method: "eth_chainId" }));
    provRef.current = provider;
    setS({ address, chainId, connectorId: id, provider, isConnecting: false });
    store.set(id);
    return true;
  }, []);

  // Silent reconnect: only if the user connected before and the wallet still exposes the account.
  useEffect(() => {
    const id = store.get();
    const provider = id && CONNECTORS.find((c) => c.id === id)?.get();
    if (id && provider) attach(id, provider, false).catch(() => store.set(null));
  }, [attach]);

  // Wallet events
  useEffect(() => {
    const p = s.provider;
    if (!p?.on) return;
    const onAccounts = (a: unknown) => {
      const address = toAddr(a);
      if (!address) {
        store.set(null);
        setS({ isConnecting: false });
      } else setS((x) => ({ ...x, address }));
    };
    const onChain = (c: unknown) => setS((x) => ({ ...x, chainId: Number(c) }));
    p.on("accountsChanged", onAccounts as never);
    p.on("chainChanged", onChain as never);
    return () => {
      p.removeListener?.("accountsChanged", onAccounts as never);
      p.removeListener?.("chainChanged", onChain as never);
    };
  }, [s.provider]);

  const connect = useCallback(
    async (id: ConnectorId) => {
      const c = CONNECTORS.find((x) => x.id === id)!;
      const provider = c.get();
      if (!provider) throw new WalletError(`${c.name} was not detected in this browser.`);
      setS((x) => ({ ...x, isConnecting: true }));
      try {
        await attach(id, provider, true);
      } catch (e) {
        setS((x) => ({ ...x, isConnecting: false }));
        throw e;
      }
    },
    [attach],
  );

  const disconnect = useCallback(() => {
    store.set(null);
    provRef.current = undefined;
    setS({ isConnecting: false });
  }, []);

  const switchChain = useCallback(async () => {
    const p = provRef.current;
    if (!p) throw new WalletError("Connect a wallet first.");
    const chain = config.chain;
    const hex = `0x${chain.id.toString(16)}`;
    try {
      await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
    } catch (e) {
      if ((e as { code?: number }).code !== 4902) throw e;
      await p.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: hex,
            chainName: chain.name,
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: chain.rpcUrls.default.http,
            blockExplorerUrls: config.explorer ? [config.explorer] : undefined,
          },
        ],
      });
    }
    const chainId = Number(await p.request({ method: "eth_chainId" }));
    setS((x) => ({ ...x, chainId }));
  }, []);

  const api = useMemo<Api>(
    () => ({ ...s, isConnected: !!s.address, wrongNetwork: !!s.address && s.chainId !== config.chain.id, connect, disconnect, switchChain }),
    [s, connect, disconnect, switchChain],
  );
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useWallet() {
  const v = useContext(Ctx);
  if (!v) throw new Error("WalletProvider missing");
  return v;
}
