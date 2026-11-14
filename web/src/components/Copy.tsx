import { useState } from "react";

/** Icon button that copies `value`. Announces success through an aria-live region. */
export function CopyButton({ value, label, testid, text }: { value: string; label: string; testid?: string; text?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      window.prompt(label, value);
    }
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  }
  return (
    <button type="button" className={`copy-btn${text ? " copy-btn-text" : ""}`} onClick={copy} aria-label={done ? `${label}: copied` : label} title={label} data-testid={testid}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {done ? (
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        ) : (
          <>
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a1 1 0 0 1 1-1h10" />
          </>
        )}
      </svg>
      {text && <span>{done ? "Copied" : text}</span>}
      <span className="sr-only" aria-live="polite">
        {done ? "Copied" : ""}
      </span>
    </button>
  );
}
