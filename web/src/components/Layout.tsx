import type { ReactNode } from "react";
import { config } from "../config";
import { ConnectButton, NetworkBanner } from "./Wallet";
import { ThemeToggle } from "./ThemeToggle";

export function Layout({ children }: { children: ReactNode }) {
  const d = config.deweb;
  return (
    <div className="app">
      <header className="topbar no-print">
        <a className="brand" href="#/">
          <img src="./logo.png" alt="" width={28} height={28} className="logo" />
          <span>Bulla</span>
        </a>
        <span className={`net-pill ${config.isXLayer ? "" : "net-local"}`} title={`chain id ${config.chain.id}`}>
          {config.chain.name}
        </span>
        <nav className="nav">
          <a href="#/create">New invoice</a>
          <ThemeToggle />
        </nav>
        <ConnectButton />
      </header>
      <NetworkBanner />
      {config.mock && (
        <div className="banner banner-mock" data-testid="mock-banner">
          Dev mock mode: fixture data, no chain reads, writes disabled. Never publish a mock build.
        </div>
      )}
      <main className="main">{children}</main>
      <footer className="footer no-print">
        <div>
          Bulla v1 · unaudited · escrow{" "}
          {config.escrow ? <span className="mono">{config.escrow}</span> : <em>not deployed on {config.chain.name} yet</em>} on {config.chain.name}
        </div>
        <div>
          DeWEB home:{" "}
          {d.tapeName ? (
            <span className="mono">
              {d.tapeName} {d.container ? `· container ${d.container}` : ""}
            </span>
          ) : (
            <em>not published yet (see docs/deweb.md)</em>
          )}
        </div>
      </footer>
    </div>
  );
}
