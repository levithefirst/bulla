import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// One cache for the whole app; provided only by the lazy route chunks so the landing
// page does not ship @tanstack/react-query.
export const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: true } } });

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
