import { useEffect, useRef, useState } from "react";
import { config } from "../config";
import { shortAddr } from "../lib/format";
import { parseError } from "../lib/errors";
import { CONNECTORS, useWallet } from "../lib/wallet";
import { useToasts } from "./Toasts";

export function useWrongNetwork() {
  return useWallet().wrongNetwork;
}

export function ConnectButton() {
  const w = useWallet();
  const [open, setOpen] = useState(false);
  const toasts = useToasts();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (w.isConnected && w.address) {
    return (
      <div className="wallet">
        <span className="wallet-addr mono" data-testid="connected-address" title={w.address} aria-label={`Connected wallet ${w.address}`}>
          <span className="wallet-dot" aria-hidden="true" />
          {shortAddr(w.address)}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={() => w.disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet" ref={ref}>
      <button className="btn btn-sm" onClick={() => setOpen((o) => !o)} disabled={w.isConnecting} aria-haspopup="menu" aria-expanded={open} data-testid="connect-wallet">
        {w.isConnecting ? "Connecting…" : "Connect wallet"}
      </button>
      {open && (
        <div className="wallet-menu" role="menu" aria-label="Choose a wallet">
          {CONNECTORS.map((c) => (
            <button
              key={c.id}
              className="wallet-option"
              role="menuitem"
              data-testid={`connector-${c.id}`}
              onClick={async () => {
                setOpen(false);
                try {
                  await w.connect(c.id);
                } catch (e) {
                  toasts.push({ kind: "error", title: `Could not connect ${c.name}`, body: parseError(e) });
                }
              }}
            >
              <span>{c.name}</span>
              {!c.get() && <span className="muted small">not detected</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function NetworkBanner() {
  const w = useWallet();
  const toasts = useToasts();
  const [busy, setBusy] = useState(false);
  if (!w.wrongNetwork) return null;
  return (
    <div className="banner banner-wrong" data-testid="wrong-network" role="alert">
      <span>
        Wrong network: your wallet is on chain <span className="num">{w.chainId}</span>. Bulla runs on <strong>{config.chain.name}</strong> (chain{" "}
        <span className="num">{config.chain.id}</span>).
      </span>
      <button
        className="btn btn-sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await w.switchChain();
          } catch (e) {
            toasts.push({ kind: "error", title: `Switch to ${config.chain.name} failed`, body: parseError(e) });
          } finally {
            setBusy(false);
          }
        }}
      >
        Switch to {config.chain.name}
      </button>
    </div>
  );
}
