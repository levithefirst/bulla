import { lazy, Suspense } from "react";
import { Layout } from "./components/Layout";
import { useRoute } from "./router";
import { Landing } from "./pages/Landing";
import { PageSkeleton, ReceiptSkeleton } from "./components/Skeleton";
import { EmptyState } from "./components/Empty";

// Route-level code splitting: the landing page ships without viem actions, react-query, or the QR encoder.
const CreatePage = lazy(() => import("./pages/CreatePage"));
const InvoicePage = lazy(() => import("./pages/InvoicePage"));

export function App() {
  const route = useRoute();
  const m = route.match(/^\/invoice\/([^/?]+)/);
  let page;
  if (m)
    page = (
      <Suspense fallback={<ReceiptSkeleton label="Loading receipt" />}>
        <InvoicePage key={m[1]} idParam={decodeURIComponent(m[1])} />
      </Suspense>
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
