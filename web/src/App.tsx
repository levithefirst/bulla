import { Layout } from "./components/Layout";
import { useRoute } from "./router";
import { Landing } from "./pages/Landing";
import { CreatePage } from "./pages/CreatePage";
import { InvoicePage } from "./pages/InvoicePage";

export function App() {
  const route = useRoute();
  const m = route.match(/^\/invoice\/([^/?]+)/);
  let page;
  if (m) page = <InvoicePage key={m[1]} idParam={decodeURIComponent(m[1])} />;
  else if (route.startsWith("/create")) page = <CreatePage />;
  else if (route === "/" || route === "") page = <Landing />;
  else
    page = (
      <div className="card">
        <h2>Page not found</h2>
        <a href="#/">Back home</a>
      </div>
    );
  return <Layout>{page}</Layout>;
}
