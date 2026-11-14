/**
 * WCAG 2.1 contrast check for every color pairing the Bulla UI uses, in light and dark,
 * reading the actual token values from web/src/styles.css. Targets follow
 * docs/design/color-theme.md: 4.5:1 for text, 3:1 for non-text UI and graphics.
 *   npm run check:contrast
 */
import * as fs from "fs";
import * as path from "path";

const css = fs.readFileSync(path.resolve(__dirname, "../web/src/styles.css"), "utf8");

function block(selector: string): Record<string, string> {
  const i = css.indexOf(selector + " {");
  if (i < 0) throw new Error(`selector not found: ${selector}`);
  const body = css.slice(css.indexOf("{", i) + 1, css.indexOf("}", i));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) out[m[1]] = m[2].toLowerCase();
  return out;
}

const light = block(":root");
const darkForced = { ...light, ...block(':root[data-theme="dark"]') };
const darkSystem = { ...light, ...block(':root:not([data-theme="light"])') };
for (const k of Object.keys(darkForced)) {
  if (darkForced[k] !== darkSystem[k]) throw new Error(`dark token mismatch between system and forced blocks: --${k}`);
}

function lum(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [foreground token, background token, min ratio, where it is used]
const S = ["funded", "pending", "released", "disputed"];
const pairs: [string, string, number, string][] = [
  ["text", "bg", 4.5, "body text, inputs, buttons"],
  ["text", "surface", 4.5, "cards, header, toasts"],
  ["text-secondary", "bg", 4.5, "placeholders, muted on page"],
  ["text-secondary", "surface", 4.5, "muted text in cards, footer, net pill"],
  ["accent-text", "bg", 4.5, "links on page"],
  ["accent-text", "surface", 4.5, "links in cards, nav hover"],
  ["on-accent", "accent", 4.5, "primary button, step numbers"],
  ["on-accent", "accent-hover", 4.5, "primary button hover"],
  ["border", "bg", 3, "input and button borders (control fill is --bg)"],
  ["accent", "bg", 3, "logo on page"],
  ["accent", "surface", 3, "logo in header"],
  ["focus", "bg", 3, "focus ring"],
  ["focus", "surface", 3, "focus ring in cards"],
  ["text-secondary", "bg", 4.5, "neutral (Cancelled) badge: text on its --bg fill"],
  ["surface", "text-secondary", 3, "neutral (Cancelled) timeline dot icon"],
  ["text-secondary", "surface", 3, "neutral (Cancelled) timeline dot on card"],
  ["disputed-text", "disputed-bg", 4.5, "field validation errors, wrong-network banner"],
  ["pending-text", "pending-bg", 4.5, "warnings, mock banner, 'passed' tag"],
  ...S.flatMap((s): [string, string, number, string][] => [
    [`${s}-text`, `${s}-bg`, 4.5, `${s} badge, notices`],
    ["on-status", `${s}-solid`, 4.5, `${s} timeline dot icon`],
    [`${s}-solid`, "surface", 3, `${s} timeline dot and toast edge`],
  ]),
];

let fail = 0;
for (const [mode, t] of [["light", light], ["dark", darkForced]] as const) {
  console.log(`\n${mode}`);
  for (const [fg, bg, min, use] of pairs) {
    const r = ratio(t[fg], t[bg]);
    const ok = r >= min;
    if (!ok) fail++;
    console.log(`  ${ok ? "pass" : "FAIL"}  ${r.toFixed(2).padStart(5)}:1 >= ${min}  --${fg} ${t[fg]} on --${bg} ${t[bg]}  (${use})`);
  }
}
console.log(fail ? `\n${fail} pairing(s) below target` : "\nall pairings meet their targets");
process.exit(fail ? 1 : 0);
