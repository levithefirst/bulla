import { useEffect, useState } from "react";

type Pref = "system" | "light" | "dark";
const KEY = "bulla.theme";
const ORDER: Pref[] = ["system", "light", "dark"];
const LABEL: Record<Pref, string> = { system: "Auto", light: "Light", dark: "Dark" };

function read(): Pref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

/** Applies data-theme on <html>. "system" removes it so prefers-color-scheme decides. */
export function applyTheme(p: Pref) {
  const el = document.documentElement;
  if (p === "system") el.removeAttribute("data-theme");
  else el.setAttribute("data-theme", p);
}

export function ThemeToggle() {
  const [pref, setPref] = useState<Pref>(read);
  useEffect(() => {
    applyTheme(pref);
    try {
      if (pref === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, pref);
    } catch {
      /* storage unavailable: theme still applies for this page view */
    }
  }, [pref]);
  const next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
  return (
    <button
      className="btn btn-ghost btn-sm theme-toggle"
      data-testid="theme-toggle"
      data-theme-pref={pref}
      title={`Theme: ${LABEL[pref]}. Click for ${LABEL[next]}.`}
      aria-label={`Color theme: ${LABEL[pref]}. Switch to ${LABEL[next]}.`}
      onClick={() => setPref(next)}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        {pref === "dark" ? (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        ) : pref === "light" ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
          </>
        )}
      </svg>
      <span>{LABEL[pref]}</span>
    </button>
  );
}
