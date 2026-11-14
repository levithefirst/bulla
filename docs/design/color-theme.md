# Bulla color theme

Source of truth: OKLCH scales, 12 steps, Radix roles. Hex values are sRGB conversions, verified 14 Nov 2026 (Africa/Lagos, WAT) with WCAG 2.1 contrast (coloraide) and APCA-W3 0.0.98G-4g (Myndex constants).

**Brand / logo solid (one accent, both modes): `#AD5526`**
OKLCH `oklch(0.550 0.130 46.0)`. This is the color of the sealed-clay disc (solid circle, horizontal seam). Foreground on it is always `#FFFFFF`.

The product chrome stays almost achromatic — warm stone, not a brown app. The clay is the seal, not the walls.

---

## Why these colors

Bulla is milestone escrow for invoices: money is sealed in, then released. The historical bulla is a clay envelope with a seam, stamped shut. The palette has to feel like **fired ceramic and cut stone**, premium enough for a payments product, and nothing like a muddy brown dashboard or a crypto neon kit.

What we took from elite systems (and did not copy):

- **Linear** and **Vercel**: almost no chromatic chrome; one accent; elevation by lightness, not shadow. We take the discipline. We do not take Linear indigo or Vercel Blue.
- **Stripe**: one solid brand color, stepped neutrals, status hues kept off the chrome. We do not take `#635BFF` or navy `#0A2540`.
- **Radix Colors**: 12-step roles and APCA-guided text steps, built in OKLCH.
- **Apple HIG**: semantic color, light and dark variants, no two meanings for one hue. “Disputed” red is not the brand. Status always includes a label.
- **Material 3**: seed from the clay solid, derive tones; keep escrow status colors static so “released” does not drift when the theme flips.

Color psychology for payments, escrow, and freelance work: people already map **blue to banks** (PayPal, Visa, Coinbase), **green to cash and “go”** (Wise, Upwork, Fiverr), and **purple to fintech-modern** (Stripe). Clay and terracotta can signal craft and a physical seal — but the trap is to land on Anthropic’s pale tan, Airbnb’s coral, or a brown UI that looks cheap. The fix is Vercel-level stone neutrals plus a single darker, fired clay that can carry white type, like a stamp, not like dirt.

### Competitor and adjacent colors we deliberately avoided

| Brand | Hex (approx.) | Why we steered away |
|---|---|---|
| Anthropic | `#D4A27F` on `#1A1915` (hue 56, L 0.75, low chroma) | The obvious “warm clay / AI beige.” Ours is 10° redder (hue 46), much darker (L 0.55), and more chromatic (0.13 vs 0.08). It reads as a seal, not as Claude’s sand. |
| Airbnb Rausch | `#FF385C` (hue 17) | Coral hospitality. Too red, too loud, and it would collide with “disputed.” |
| LegalZoom, Spellbook vermilion | `#F45A27`, `#FF4716` (hue 34–37, high L and chroma) | Bright legal orange. Same neighborhood as terracotta, very different weight. We are darker and quieter. |
| Hermès / generic startup orange | ~`#F37021` | Fashion orange, not a ceramic seal. |
| Stripe, Deel lilac | `#635BFF`, `#C4B1F9` | Payments purple. |
| PayPal, Coinbase, FreshBooks, Revolut | `#003087`, `#0052FF`, `#0075DD`, `#0075EB` | Institution / payout blue. We use a steel blue only for the “funded / held” status, never as brand. |
| Wise, Upwork, Fiverr | `#9FE870`, `#108A00`, `#1DBF73` | Money-green as brand. Green is reserved for “released.” |
| Deel yellow | `#FFE27C` | Too light for text or a 16px mark; not a seal. |
| Escrow.com-style navy + lime | `#01426A`, `#42C31D` | Classic escrow cliché. |
| Muddy brown UIs | brown-700 fills, tan canvases | “Earthy” gone wrong. Neutrals stay stone (chroma ≤ 0.02). The clay never becomes the background. |

`#AD5526` was tuned so white type on the solid is 5.12:1 (APCA Lc 80), and the mark holds on white (5.12:1) and on black (4.10:1, above the 3:1 graphic minimum).

Escrow status is a four-way set, not a traffic light reused as a brand story:

- **Funded** — steel blue `#2266A4` / text `#3173B3`: money is held, sealed, not yet spent.
- **Pending** — gold `#A56900` / text `#A06500`: waiting.
- **Released** — green `#008760` / text `#00815A`: the seam opened on purpose.
- **Disputed** — crimson `#BD413F` / text `#C04845`: a break in the seal.

Brand clay is none of these.

---

## Semantic tokens

| Role | Light | Dark | Notes |
|---|---|---|---|
| Background | `#FDFAF7` | `#110E0A` | Warm stone canvas, not tan. |
| Surface | `#F9F5F2` | `#181410` | Cards, invoice sheets. |
| Border (inputs, 3:1) | `#978F86` | `#655E56` | Form controls and other 1.4.11 UI. |
| Border subtle | `#D3CCC4` | `#423C35` | Dividers only. |
| Text primary | `#1E1811` | `#F7F3EE` | |
| Text secondary | `#766F66` | `#B9B3AC` | |
| **Brand accent (logo, solid)** | **`#AD5526`** | **`#AD5526`** | One hex, both modes. |
| Accent hover | `#9D4613` | `#9D4613` | Darker in both modes so white text still passes. |
| Accent text (links) | `#B15829` | `#EBA27F` | Step 11. Not the solid hex for small canvas text. |
| On-accent | `#FFFFFF` | `#FFFFFF` | |
| Focus ring | `#AD5526` | `#EBA27F` | |

### Escrow status

Always pair color with the word Funded / Pending / Released / Disputed and an icon.

| Status | Text light | Text dark | Subtle bg light | Subtle bg dark | Solid (both) | On-solid |
|---|---|---|---|---|---|---|
| Funded | `#3173B3` | `#75B8FC` | `#EEFAFF` | `#001228` | `#2266A4` | `#FFFFFF` |
| Pending | `#A06500` | `#E6A732` | `#FFF7E8` | `#1E0D00` | `#A56900` | `#FFFFFF` |
| Released | `#00815A` | `#58C69B` | `#ECFEF5` | `#00190B` | `#008760` | `#FFFFFF` |
| Disputed | `#C04845` | `#FF968D` | `#FFF3F1` | `#250505` | `#BD413F` | `#FFFFFF` |

---

## 12-step scales (OKLCH source)

Roles follow [Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale).

### Neutral — warm stone, hue 70, chroma kept very low

| Step | Light hex | Light OKLCH | Dark hex | Dark OKLCH |
|---|---|---|---|---|
| 1 | `#FDFAF7` | `oklch(0.987 0.005 70)` | `#110E0A` | `oklch(0.165 0.010 70)` |
| 2 | `#F9F5F2` | `oklch(0.973 0.006 70)` | `#181410` | `oklch(0.196 0.011 70)` |
| 3 | `#F2EEE8` | `oklch(0.950 0.009 70)` | `#23201B` | `oklch(0.236 0.012 70)` |
| 4 | `#EAE4DE` | `oklch(0.922 0.011 70)` | `#2C2923` | `oklch(0.276 0.013 70)` |
| 5 | `#E1DAD2` | `oklch(0.892 0.013 70)` | `#36322C` | `oklch(0.316 0.014 70)` |
| 6 | `#D3CCC4` | `oklch(0.848 0.014 70)` | `#423C35` | `oklch(0.360 0.014 70)` |
| 7 | `#978F86` | `oklch(0.655 0.016 70)` | `#655E56` | `oklch(0.485 0.015 70)` |
| 8 | `#877F75` | `oklch(0.600 0.018 70)` | `#766F67` | `oklch(0.545 0.015 70)` |
| 9 | `#766D62` | `oklch(0.540 0.020 70)` | `#878078` | `oklch(0.612 0.016 70)` |
| 10 | `#685F54` | `oklch(0.490 0.020 70)` | `#968F87` | `oklch(0.662 0.016 70)` |
| 11 | `#766F66` | `oklch(0.545 0.016 70)` | `#B9B3AC` | `oklch(0.770 0.012 70)` |
| 12 | `#1E1811` | `oklch(0.215 0.016 70)` | `#F7F3EE` | `oklch(0.966 0.008 70)` |

Dark step 3 hex is derived from the same OKLCH as the generator; if a rebuilt token differs by one digit of sRGB, prefer the OKLCH.

### Accent — sealed clay, hue 46

| Step | Light hex | Light OKLCH | Dark hex | Dark OKLCH |
|---|---|---|---|---|
| 1 | `#FFF8F4` | `oklch(0.985 0.010 46)` | `#1A100C` | `oklch(0.175 0.018 46)` |
| 2 | `#FDF0E8` | `oklch(0.970 0.018 46)` | `#201510` | `oklch(0.205 0.024 46)` |
| 3 | `#F8E4D8` | `oklch(0.945 0.030 46)` | `#2A1C15` | `oklch(0.248 0.034 46)` |
| 4 | `#F2D7C6` | `oklch(0.915 0.042 46)` | `#34231A` | `oklch(0.288 0.044 46)` |
| 5 | `#EBC9B3` | `oklch(0.880 0.055 46)` | `#3F2B1F` | `oklch(0.332 0.054 46)` |
| 6 | `#DBB096` | `oklch(0.810 0.075 46)` | `#513625` | `oklch(0.388 0.066 46)` |
| 7 | `#C48A66` | `oklch(0.700 0.100 46)` | `#6A452E` | `oklch(0.450 0.085 46)` |
| 8 | `#B36F45` | `oklch(0.620 0.115 46)` | `#875533` | `oklch(0.520 0.105 46)` |
| 9 | `#AD5526` | `oklch(0.550 0.130 46)` | `#AD5526` | `oklch(0.550 0.130 46)` |
| 10 | `#9D4613` | `oklch(0.500 0.130 46)` | `#9D4613` | `oklch(0.500 0.130 46)` |
| 11 | `#B15829` | `oklch(0.560 0.130 46)` | `#EBA27F` | `oklch(0.775 0.100 46)` |
| 12 | `#6F2C0A` | `oklch(0.330 0.100 46)` | `#F6D3BE` | `oklch(0.910 0.055 46)` |

Light steps 1–8 and dark 1–8, 11–12 are the intended tonal ladder from the same hue and chroma curve. If you regenerate them, keep steps 9 and 10 locked to `#AD5526` and `#9D4613`.

---

## CSS custom properties

```css
:root {
  color-scheme: light;
  --bg: #fdfaf7;
  --surface: #f9f5f2;
  --surface-2: #f2eee8;
  --border: #978f86;
  --border-subtle: #d3ccc4;
  --text: #1e1811;
  --text-secondary: #766f66;
  --accent: #ad5526;
  --accent-hover: #9d4613;
  --accent-text: #b15829;
  --on-accent: #ffffff;
  --focus: #ad5526;
  --funded-text: #3173b3;
  --funded-bg: #eefaff;
  --funded-solid: #2266a4;
  --pending-text: #a06500;
  --pending-bg: #fff7e8;
  --pending-solid: #a56900;
  --released-text: #00815a;
  --released-bg: #ecfef5;
  --released-solid: #008760;
  --disputed-text: #c04845;
  --disputed-bg: #fff3f1;
  --disputed-solid: #bd413f;
  --on-status: #ffffff;
  --font-sans: "Geist", "Geist Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, "SFMono-Regular", monospace;
}

[data-theme="dark"] {
  color-scheme: dark;
  --bg: #110e0a;
  --surface: #181410;
  --surface-2: #23201b;
  --border: #655e56;
  --border-subtle: #423c35;
  --text: #f7f3ee;
  --text-secondary: #b9b3ac;
  --accent: #ad5526;
  --accent-hover: #9d4613;
  --accent-text: #eba27f;
  --on-accent: #ffffff;
  --focus: #eba27f;
  --funded-text: #75b8fc;
  --funded-bg: #001228;
  --funded-solid: #2266a4;
  --pending-text: #e6a732;
  --pending-bg: #1e0d00;
  --pending-solid: #a56900;
  --released-text: #58c69b;
  --released-bg: #00190b;
  --released-solid: #008760;
  --disputed-text: #ff968d;
  --disputed-bg: #250505;
  --disputed-solid: #bd413f;
  --on-status: #ffffff;
}
```

---

## Tailwind theme extend

```js
export default {
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        "border-subtle": "var(--border-subtle)",
        ink: "var(--text)",
        "ink-secondary": "var(--text-secondary)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          text: "var(--accent-text)",
          fg: "var(--on-accent)",
        },
        funded: { text: "var(--funded-text)", bg: "var(--funded-bg)", solid: "var(--funded-solid)" },
        pending: { text: "var(--pending-text)", bg: "var(--pending-bg)", solid: "var(--pending-solid)" },
        released: { text: "var(--released-text)", bg: "var(--released-bg)", solid: "var(--released-solid)" },
        disputed: { text: "var(--disputed-text)", bg: "var(--disputed-bg)", solid: "var(--disputed-solid)" },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
};
```

---

## Font pairing

- **Geist Sans** for all UI, invoice copy, and navigation. Payments products at this level stay typographically quiet; a display serif would fight the seal metaphor and collide with Portia’s literary face.
- **Geist Mono** for amounts, invoice numbers, hashes, and chain addresses.

Do not use a brown or “handmade” script. Do not use Space Grotesk or other over-used startup faces.

---

## Contrast results

Targets: WCAG 2.1 AA 4.5:1 normal text, 3:1 non-text UI. APCA: Lc 75 primary, Lc 60 secondary / accent / status text, Lc 45 solid-button labels.

| Pair | Colors | WCAG 2.1 | APCA | Target | Result |
|---|---|---|---|---|---|
| Primary text / background | `#1E1811` on `#FDFAF7` | 16.91:1 | Lc 101.7 | 4.5 / 75 | pass |
| Primary text / surface | `#1E1811` on `#F9F5F2` | 16.22:1 | Lc 98.8 | 4.5 / 75 | pass |
| Secondary text / background | `#766F66` on `#FDFAF7` | 4.77:1 | Lc 71.6 | 4.5 / 60 | pass |
| Secondary text / surface | `#766F66` on `#F9F5F2` | 4.57:1 | Lc 68.8 | 4.5 / 60 | pass |
| Accent text / background | `#B15829` on `#FDFAF7` | 4.70:1 | Lc 70.6 | 4.5 / 60 | pass |
| Accent text / surface | `#B15829` on `#F9F5F2` | 4.51:1 | Lc 67.8 | 4.5 / 60 | pass |
| White / brand solid | `#FFFFFF` on `#AD5526` | 5.12:1 | Lc -80.2 | 4.5 / 60 | pass |
| White / accent hover | `#FFFFFF` on `#9D4613` | 6.33:1 | Lc -86.0 | 4.5 / 60 | pass |
| Input border / background | `#978F86` on `#FDFAF7` | 3.06:1 | Lc 56.2 | 3.0 / 0 | pass |
| Logo / white | `#AD5526` on `#FFFFFF` | 5.12:1 | Lc 74.8 | 3.0 / 0 | pass |
| Logo / black | `#AD5526` on `#000000` | 4.10:1 | Lc -26.9 | 3.0 / 0 | pass |
| Funded text / background | `#3173B3` on `#FDFAF7` | 4.77:1 | Lc 71.3 | 4.5 / 60 | pass |
| Funded text / status bg | `#3173B3` on `#EEFAFF` | 4.67:1 | Lc 69.8 | 4.5 / 60 | pass |
| White / funded solid | `#FFFFFF` on `#2266A4` | 5.99:1 | Lc -84.8 | 4.5 / 45 | pass |
| Pending text / background | `#A06500` on `#FDFAF7` | 4.64:1 | Lc 70.4 | 4.5 / 60 | pass |
| Pending text / status bg | `#A06500` on `#FFF7E8` | 4.53:1 | Lc 68.7 | 4.5 / 60 | pass |
| White / pending solid | `#FFFFFF` on `#A56900` | 4.54:1 | Lc -76.7 | 4.5 / 45 | pass |
| Released text / background | `#00815A` on `#FDFAF7` | 4.71:1 | Lc 70.6 | 4.5 / 60 | pass |
| Released text / status bg | `#00815A` on `#ECFEF5` | 4.68:1 | Lc 70.1 | 4.5 / 60 | pass |
| White / released solid | `#FFFFFF` on `#008760` | 4.53:1 | Lc -76.3 | 4.5 / 45 | pass |
| Disputed text / background | `#C04845` on `#FDFAF7` | 4.75:1 | Lc 70.6 | 4.5 / 60 | pass |
| Disputed text / status bg | `#C04845` on `#FFF3F1` | 4.55:1 | Lc 67.7 | 4.5 / 60 | pass |
| White / disputed solid | `#FFFFFF` on `#BD413F` | 5.26:1 | Lc -80.6 | 4.5 / 45 | pass |
| Primary text / dark bg | `#F7F3EE` on `#110E0A` | 17.42:1 | Lc -100.0 | 4.5 / 75 | pass |
| Primary text / dark surface | `#F7F3EE` on `#181410` | 16.58:1 | Lc -99.5 | 4.5 / 75 | pass |
| Secondary text / dark bg | `#B9B3AC` on `#110E0A` | 9.27:1 | Lc -61.4 | 4.5 / 60 | pass |
| Secondary text / dark surface | `#B9B3AC` on `#181410` | 8.82:1 | Lc -60.9 | 4.5 / 60 | pass |
| Accent text / dark bg | `#EBA27F` on `#110E0A` | 9.17:1 | Lc -61.0 | 4.5 / 60 | pass |
| Accent text / dark surface | `#EBA27F` on `#181410` | 8.73:1 | Lc -60.6 | 4.5 / 60 | pass |
| Input border / dark bg | `#655E56` on `#110E0A` | 3.01:1 | Lc -19.8 | 3.0 / 0 | pass |
| Funded text / dark bg | `#75B8FC` on `#110E0A` | 9.18:1 | Lc -61.1 | 4.5 / 60 | pass |
| Funded text / dark status bg | `#75B8FC` on `#001228` | 8.97:1 | Lc -60.7 | 4.5 / 60 | pass |
| Pending text / dark bg | `#E6A732` on `#110E0A` | 9.11:1 | Lc -60.7 | 4.5 / 60 | pass |
| Pending text / dark status bg | `#E6A732` on `#1E0D00` | 8.93:1 | Lc -60.5 | 4.5 / 60 | pass |
| Released text / dark bg | `#58C69B` on `#110E0A` | 9.13:1 | Lc -60.9 | 4.5 / 60 | pass |
| Released text / dark status bg | `#58C69B` on `#00190B` | 8.71:1 | Lc -60.3 | 4.5 / 60 | pass |
| Disputed text / dark bg | `#FF968D` on `#110E0A` | 9.17:1 | Lc -61.1 | 4.5 / 60 | pass |
| Disputed text / dark status bg | `#FF968D` on `#250505` | 9.07:1 | Lc -60.8 | 4.5 / 60 | pass |

---

## Usage rules

- The clay accent appears on the logo, the primary action (fund, confirm, seal), and focus. It is not a page fill and not a sidebar.
- Status hues are only for funded / pending / released / disputed. Never recolor the brand mark to match a status.
- No gradients, no coin-gold, no purple, no neon, no muddy brown canvas.
- Light and dark both ship. Honor `prefers-color-scheme`, and allow a toggle that sets `data-theme`.
