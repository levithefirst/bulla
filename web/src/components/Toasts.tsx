import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type ToastKind = "pending" | "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; title: string; body?: string; link?: { href: string; label: string } };
type Api = { push: (t: Omit<Toast, "id">) => number; update: (id: number, t: Omit<Toast, "id">) => void; dismiss: (id: number) => void };

const Ctx = createContext<Api | null>(null);
let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  const schedule = useCallback(
    (id: number, kind: ToastKind) => {
      if (kind === "success" || kind === "info") setTimeout(() => dismiss(id), 8000);
    },
    [dismiss],
  );
  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = ++seq;
      setToasts((ts) => [...ts, { ...t, id }]);
      schedule(id, t.kind);
      return id;
    },
    [schedule],
  );
  const update = useCallback(
    (id: number, t: Omit<Toast, "id">) => {
      setToasts((ts) => (ts.some((x) => x.id === id) ? ts.map((x) => (x.id === id ? { ...t, id } : x)) : [...ts, { ...t, id }]));
      schedule(id, t.kind);
    },
    [schedule],
  );
  return (
    <Ctx.Provider value={{ push, update, dismiss }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`} data-testid={`toast-${t.kind}`}>
            <div className="toast-head">
              <strong>{t.title}</strong>
              <button className="toast-x" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
                ×
              </button>
            </div>
            {t.body && <div className="toast-body">{t.body}</div>}
            {t.link && (
              <a className="toast-link" href={t.link.href} target="_blank" rel="noreferrer">
                {t.link.label}
              </a>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToasts() {
  const v = useContext(Ctx);
  if (!v) throw new Error("ToastProvider missing");
  return v;
}
