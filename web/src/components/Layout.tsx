import type { ReactNode } from "react";
import { config } from "../config";
import { ConnectButton, NetworkBanner } from "./Wallet";
import { ThemeToggle } from "./ThemeToggle";

export function Layout({ children }: { children: ReactNode }) {
  const d = config.deweb;
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar no-print">
        <div className="topbar-inner">
          <a className="brand" href="#/" aria-label="Bulla home">
            <img src="./logo.png" alt="" width={28} height={28} />
            <span>Bulla</span>
          </a>
          <span className="net-pill" title={`Chain id ${config.chain.id}`}>
            <span className="net-dot" aria-hidden="true" />
            {config.chain.name}
          </span>
          <nav className="nav" aria-label="Main">
            <a href="#/create" className="nav-link">
              New invoice
            </a>
            <ThemeToggle />
            <ConnectButton />
          </nav>
        </div>
      </header>
      <NetworkBanner />
      {config.mock && (
        <div className="banner banner-mock" data-testid="mock-banner" role="note">
          Dev mock mode: fixture data, no chain reads, writes disabled. Never publish a mock build.
        </div>
      )}
      <main className="main" id="main" tabIndex={-1}>
        {children}
      </main>
      <footer className="footer no-print">
        <div className="footer-inner">
          <div className="footer-brand">
            <img src="./logo.png" alt="" width={20} height={20} />
            <span>Bulla v1 · unaudited</span>
          </div>
          <dl className="footer-meta">
            <div>
              <dt>Escrow</dt>
              <dd>{config.escrow ? <span className="mono">{config.escrow}</span> : <em>not deployed on {config.chain.name} yet</em>}</dd>
            </div>
            <div>
              <dt>DeWEB home</dt>
              <dd>{d.tapeName ? <span className="mono">{d.tapeName}</span> : <em>not published yet</em>}</dd>
            </div>
          </dl>
        </div>
      </footer>
    </div>
  );
}
