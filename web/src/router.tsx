import { useEffect, useState } from "react";

// Hash routing (#/invoice/12) so the static build works on DeWEB, in the TapeKit
// preview viewer, and on any static host without rewrite rules.
export function navigate(path: string) {
  window.location.hash = `#${path}`;
}

export function useRoute(): string {
  const get = () => window.location.hash.replace(/^#/, "") || "/";
  const [route, setRoute] = useState(get);
  useEffect(() => {
    const on = () => {
      setRoute(get());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}
