# Sanjeevani — Design System

Style reference: monochrome brutalist, like the Corviin site (dark, stark, engineered) and the Sanjeevani landing mock (light, editorial-brutalist). Sanjeevani should use the **light** variant as its primary theme (patient-facing trust + accessibility), with a **dark** variant available for staff portals if desired — but consistent tokens throughout.

## 1. Core Principles
- No decorative gradients, no drop shadows-as-decoration, no rounded pill buttons everywhere. Sharp, confident, high-contrast.
- Big oversized display type for section headers; small tracked-out uppercase micro-labels (`01 // SECTION NAME`) as eyebrow text above every section — this is a signature motif from both reference screenshots.
- Generous whitespace, thin 1px hairline borders instead of shadows for separation.
- Data-entry screens (reception, doctor forms) are dense and utilitarian — no animation, pure speed.
- Patient-facing screens are calmer, larger touch targets, still monochrome but warmer off-white background.

## 2. Color Tokens

```css
:root {
  /* Light theme (default — patient/marketing) */
  --bg: #F7F5F0;         /* warm off-white */
  --bg-elevated: #FFFFFF;
  --bg-muted: #EDEAE2;
  --fg: #0A0A0A;          /* near-black */
  --fg-muted: #6B6B66;
  --border: #D8D5CC;
  --accent: #050505;      /* used for primary buttons — pure near-black */
  --accent-foreground: #FFFFFF;
  --warn: #B23B2E;        /* critical / interaction warnings */
  --safe: #2F6B3A;        /* OTC scanner "SAFE" */
  --focus-ring: #0A0A0A;
}

[data-theme="dark"] {
  /* Dark theme — staff/ops portals */
  --bg: #050505;
  --bg-elevated: #0F0F0F;
  --bg-muted: #141414;
  --fg: #FFFFFF;
  --fg-muted: #8A8A85;
  --border: #262626;
  --accent: #FFFFFF;
  --accent-foreground: #050505;
  --warn: #FF5A44;
  --safe: #4ADE80;
  --focus-ring: #FFFFFF;
}
```

Triage/severity colors (used consistently across all portals):
- Level 1 Routine: `--fg-muted` (grey)
- Level 2 Urgent: `#B8862B` (amber)
- Level 3 Critical: `--warn` (red), always paired with a visible badge, never color alone

## 3. Typography

- **Display/Headings:** A bold grotesk/sans (e.g. `Inter Tight`, `Neue Montreal`, or `Archivo` at weight 700–800) — used for oversized hero and section headers (`text-5xl` to `text-8xl`, tight tracking, `leading-[0.95]`).
- **Body/UI:** `Inter` — regular 400/500, `text-sm`/`text-base`, generous line-height (1.6) for readability on patient screens.
- **Micro-labels/eyebrows:** Same UI font, `text-xs`, `uppercase`, `tracking-[0.15em]`, `text-fg-muted`, prefixed with a number like `01 //`.

Tailwind config snippet:
```js
// tailwind.config.js
fontFamily: {
  display: ['"Archivo"', 'sans-serif'],
  sans: ['"Inter"', 'sans-serif'],
},
letterSpacing: {
  widest2: '0.2em',
},
```

## 4. Layout & Spacing
- 8px base spacing scale (Tailwind default is fine).
- Section vertical rhythm: `py-24` to `py-32` between major sections, echoing the reference sites' generous breathing room.
- Container: max-w-7xl, `px-6 md:px-12`.
- Hairline dividers (`border-t border-[--border]`) between sections instead of background color blocks, except for hero (which gets a subtly textured/dotted background — see below).

## 5. Signature Visual Motifs (from references)
1. **Eyebrow index labels**: `01 // PATIENTS · DOCTORS · CLINICS · 2026` above every hero/section.
2. **Marquee/ticker strip**: a full-bleed horizontal band of oversized outlined text scrolling or static, e.g. `FEWER MISTAKES ○ CLEAR PRESCRIPTIONS ○` — used as a visual divider between sections.
3. **Dot-grid / noise texture background** behind hero sections (low-opacity radial dot pattern) for depth without color.
4. **Numbered feature cards** in a grid, each with a `(01)` index, bold title, one-line description, thin border, no shadow.
5. **Stark form fields**: full-width, thin-bordered, no rounded corners (`rounded-none` or `rounded-sm` max), placeholder text in muted grey, label as small uppercase tracked text above the field.
6. **Two-tone buttons**: solid near-black/white primary button with arrow icon (`→`), and an outline secondary button — both `rounded-full` in the reference (note: pill-shaped buttons are the one rounded exception; everything else stays sharp).

## 6. Component Tokens (Tailwind utility patterns)

**Primary button**
```html
<button class="inline-flex items-center gap-2 rounded-full bg-[--accent] text-[--accent-foreground] px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity">
  Get Started <span aria-hidden>→</span>
</button>
```

**Secondary/outline button**
```html
<button class="inline-flex items-center gap-2 rounded-full border border-[--fg] px-6 py-3 text-sm font-medium hover:bg-[--fg] hover:text-[--bg] transition-colors">
  Talk to Us
</button>
```

**Eyebrow label**
```html
<p class="text-xs uppercase tracking-[0.2em] text-[--fg-muted] flex items-center gap-2">
  <span class="w-1.5 h-1.5 bg-[--fg] rounded-full"></span> 05 // Your Workspace
</p>
```

**Feature card**
```html
<div class="border border-[--border] p-8 hover:border-[--fg] transition-colors">
  <div class="w-9 h-9 rounded-full border border-[--border] flex items-center justify-center mb-6">
    <Icon class="w-4 h-4" />
  </div>
  <h3 class="font-display text-xl font-semibold mb-2">For Doctors</h3>
  <p class="text-sm text-[--fg-muted] mb-4">Less paperwork, more time with patients.</p>
  <ul class="space-y-2 text-sm mb-6">
    <li><strong>Prescriptions, digitized</strong> — a photo becomes clean, structured text.</li>
  </ul>
  <a class="text-sm font-medium inline-flex items-center gap-1">Open Doctor Panel →</a>
</div>
```

**Stark form input**
```html
<label class="block">
  <span class="text-xs uppercase tracking-[0.15em] text-[--fg-muted]">Name</span>
  <input class="mt-2 w-full border border-[--border] bg-transparent px-4 py-3 text-sm focus:outline-none focus:border-[--fg]" placeholder="Your full name" />
</label>
```

**Triage/severity badge**
```html
<span class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wide border" style="color: var(--warn); border-color: var(--warn);">
  ● Critical
</span>
```

## 7. Iconography
- Thin-stroke line icons only (Lucide React — already available as an approved library). No filled/duotone icons, no illustrations with color.

## 8. Patient PWA Specific Notes
- `manifest.json` `theme_color: "#050505"`, `background_color: "#F7F5F0"`, `display: "standalone"`.
- Larger tap targets (min 44px height) throughout for accessibility.
- Dosing toggle uses the same brutalist high-contrast toggle pattern (black/white switch, not a colorful iOS-style toggle) as seen in the reference navbar theme switcher.
- Adherence ring: a minimal circular progress ring using `stroke` only (no fill gradients), black stroke on light theme.

## 9. Motion
- Minimal. Opacity/translate transitions only (150–250ms ease-out). No bounce/spring easing, no parallax — motion should feel engineered, not playful, consistent with the brutalist tone. Exception: the OCR Evidence Viewer's zoom/pan into a handwriting crop, which can use a slightly slower (300–400ms) ease for a "focus pull" effect since it's the app's signature interaction.
