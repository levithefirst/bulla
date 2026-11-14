/**
 * Test wallet for Playwright: injects an EIP-1193 `window.ethereum` into the page.
 * Signing happens in the Node test process with a THROWAWAY key from e2e/.keys.json;
 * the key never enters the page or the web bundle.
 */
import type { BrowserContext } from "@playwright/test";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";

/** Find the innermost JSON-RPC code/data (revert bytes) in a viem error chain. */
function rpcErrorShape(e: unknown) {
  let code: number | undefined;
  let data: unknown;
  let cur = e as { code?: unknown; data?: unknown; cause?: unknown; details?: string } | undefined;
  for (let i = 0; cur && i < 10; i++) {
    if (typeof cur.code === "number") code = cur.code;
    if (typeof cur.data === "string" && cur.data.startsWith("0x")) data = cur.data;
    else if (cur.data && typeof (cur.data as { data?: unknown }).data === "string") data = (cur.data as { data: string }).data;
    cur = cur.cause as typeof cur;
  }
  const message = (e as { details?: string; shortMessage?: string; message?: string }).details || (e as Error).message;
  return { code: code ?? 3, message, data };
}

export async function injectWallet(context: BrowserContext, privateKey: Hex, rpc: string) {
  const account = privateKeyToAccount(privateKey);
  const transport = http(rpc);
  const wallet = createWalletClient({ chain: hardhat, transport, account });
  const pub = createPublicClient({ chain: hardhat, transport });

  // Like a real wallet: no accounts are exposed until the site asks to connect.
  let authorized = false;
  await context.exposeBinding("__bullaWallet", async (_src, method: string, params: unknown[]) => {
    switch (method) {
      case "eth_requestAccounts":
        authorized = true;
        return [account.address];
      case "eth_accounts":
        return authorized ? [account.address] : [];
      case "eth_chainId":
        return "0x7a69";
      case "net_version":
        return "31337";
      case "wallet_requestPermissions":
        authorized = true;
        return [{ parentCapability: "eth_accounts" }];
      case "wallet_getPermissions":
        return authorized ? [{ parentCapability: "eth_accounts" }] : [];
      case "wallet_revokePermissions":
        return null;
      case "wallet_switchEthereumChain":
      case "wallet_addEthereumChain":
        return null;
      case "eth_sendTransaction": {
        const tx = (params?.[0] ?? {}) as { to?: Hex; data?: Hex; value?: Hex; gas?: Hex };
        try {
          return await wallet.sendTransaction({
            to: tx.to,
            data: tx.data,
            value: tx.value ? BigInt(tx.value) : 0n,
            gas: tx.gas ? BigInt(tx.gas) : undefined,
          });
        } catch (e) {
          throw new Error(JSON.stringify(rpcErrorShape(e)));
        }
      }
      default:
        try {
          return await pub.request({ method: method as never, params: params as never });
        } catch (e) {
          // Surface JSON-RPC errors (incl. revert data) back into the page.
          throw new Error(JSON.stringify(rpcErrorShape(e)));
        }
    }
  });

  await context.addInitScript(() => {
    const listeners: Record<string, ((...a: unknown[]) => void)[]> = {};
    const provider = {
      isBullaTestWallet: true,
      async request({ method, params }: { method: string; params?: unknown[] }) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return await (window as any).__bullaWallet(method, params ?? []);
        } catch (e) {
          const raw = String((e as Error).message ?? e);
          const json = raw.slice(raw.indexOf("{"));
          try {
            const p = JSON.parse(json);
            const err = new Error(p.message) as Error & { code?: number; data?: unknown };
            err.code = p.code;
            err.data = p.data;
            throw err;
          } catch (inner) {
            if ((inner as { code?: number }).code !== undefined) throw inner;
            throw new Error(raw);
          }
        }
      },
      on(ev: string, fn: (...a: unknown[]) => void) {
        (listeners[ev] ||= []).push(fn);
      },
      removeListener(ev: string, fn: (...a: unknown[]) => void) {
        listeners[ev] = (listeners[ev] || []).filter((f) => f !== fn);
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).ethereum = provider;
  });
  return account.address;
}
