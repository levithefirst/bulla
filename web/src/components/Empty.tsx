import type { ReactNode } from "react";

export function EmptyState({ title, children, tone = "neutral", icon, testid }: { title: string; children?: ReactNode; tone?: "neutral" | "error"; icon?: ReactNode; testid?: string }) {
  return (
    <section className={`card empty empty-${tone}`} data-testid={testid} role={tone === "error" ? "alert" : undefined}>
      <div className="empty-icon" aria-hidden="true">
        {icon ?? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h6l1.5 2h3L15 12h6" />
          </svg>
        )}
      </div>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
