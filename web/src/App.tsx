import { lazy, Suspense } from "react";
import { Layout } from "./components/Layout";
import { useRoute } from "./router";
import { Landing } from "./pages/Landing";
import { PageSkeleton, ReceiptSkeleton } from "./components/Skeleton";
import { EmptyState } from "./components/Empty";
import { config } from "./config";

// Route-level code splitting: the landing page ships without viem actions, react-query, or the QR encoder.
const CreatePage = lazy(() => import("./pages/CreatePage"));
const InvoicePage = lazy(() => import("./pages/InvoicePage"));
const TxPage = lazy(() => import("./pages/TxPage"));
// Judge mode is compiled only into testnet / local builds; mainnet builds drop this chunk entirely.
const JudgePage = __JUDGE_BUILD__ ? lazy(() => import("./judge/JudgePage")) : null;

export function App() {
  const route = useRoute();
  const m = route.match(/^\/invoice\/([^/?]+)/);
  const demo = /[?&]escrow=demo(&|$)/.test(route);
  const tx = route.match(/^\/tx\/([^/?]+)/);
  let page;
  if (tx)
    page = (
      <Suspense fallback={<ReceiptSkeleton label="Loading transaction" />}>
        <TxPage key={route} hash={decodeURIComponent(tx[1])} />
      </Suspense>
    );
  else if (m)
    page = (
      <Suspense fallback={<ReceiptSkeleton label="Loading receipt" />}>
        <InvoicePage key={route} idParam={decodeURIComponent(m[1])} demo={demo} />
      </Suspense>
    );
  else if (route.startsWith("/try"))
    page =
      JudgePage && config.judge !== null ? (
        <Suspense fallback={<PageSkeleton />}>
          <JudgePage autoRun={/[?&]run=1(&|$)/.test(route)} />
        </Suspense>
      ) : (
        <div className="narrow">
          <EmptyState title="Judge mode runs on X Layer testnet" testid="judge-unavailable">
            <p className="muted">This build targets {config.chain.name}. The one-tap demo uses throwaway testnet wallets and only exists in the testnet build.</p>
            {config.judgeUrl ? (
              <a className="btn btn-primary" href={config.judgeUrl}>
                Open the testnet demo
              </a>
            ) : (
              <a className="btn" href="#/create">
                Use my own wallet
              </a>
            )}
          </EmptyState>
        </div>
      );
  else if (route.startsWith("/create"))
    page = (
      <Suspense fallback={<PageSkeleton />}>
        <CreatePage />
      </Suspense>
    );
  else if (route === "/" || route === "") page = <Landing />;
  else
    page = (
      <div className="narrow">
        <EmptyState title="Page not found">
          <p className="muted">There is nothing at this address.</p>
          <a className="btn" href="#/">
            Back home
          </a>
        </EmptyState>
      </div>
    );
  return <Layout>{page}</Layout>;
}
