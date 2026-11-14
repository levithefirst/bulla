import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { config } from "../config";
import { shortAddr } from "../lib/format";
import { parseError } from "../lib/errors";
import { useToasts } from "./Toasts";

export function useWrongNetwork() {
  const { isConnected, chainId } = useAccount();
  return isConnected && chainId !== config.chain.id;
}

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);
  const toasts = useToasts();

  if (isConnected && address) {
    return (
      <div className="wallet">
        <span className="wallet-addr mono" data-testid="connected-address" title={address}>
          {shortAddr(address)}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet">
      <button className="btn btn-sm" onClick={() => setOpen((o) => !o)} disabled={isPending} data-testid="connect-wallet">
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>
      {open && (
        <div className="wallet-menu" role="menu">
          {connectors.map((c) => (
            <button
              key={c.uid}
              className="wallet-option"
              role="menuitem"
              data-testid={`connector-${c.id}`}
              onClick={async () => {
                setOpen(false);
                try {
                  await connectAsync({ connector: c });
                } catch (e) {
                  const msg = parseError(e);
                  toasts.push({
                    kind: "error",
                    title: `Could not connect ${c.name}`,
                    body: /provider/i.test(msg) ? `${c.name} was not detected in this browser.` : msg,
                  });
                }
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function NetworkBanner() {
  const wrong = useWrongNetwork();
  const { chainId } = useAccount();
  const { switchChainAsync, isPending } = useSwitchChain();
  const toasts = useToasts();
  if (!wrong) return null;
  return (
    <div className="banner banner-wrong" data-testid="wrong-network">
      <span>
        Wrong network: your wallet is on chain {chainId}. Bulla runs on <strong>{config.chain.name}</strong> (chain {config.chain.id}).
      </span>
      <button
        className="btn btn-sm"
        disabled={isPending}
        onClick={async () => {
          try {
            await switchChainAsync({ chainId: config.chain.id });
          } catch (e) {
            toasts.push({ kind: "error", title: `Switch to ${config.chain.name} failed`, body: parseError(e) });
          }
        }}
      >
        Switch to {config.chain.name}
      </button>
    </div>
  );
}
