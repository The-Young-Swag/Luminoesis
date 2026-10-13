# Luminoesis Design System v3 (refined mockup v5, 2026-10-13)

Direction: refined dashboard mockup (`Luminoesis – Dashboard mockup REFINED.html`,
structure + look + palette logic). v2 audit decisions stand; v3 changes: webp page backgrounds,
navy-violet/pearl palette, halo fix, merged dashboard modules. Deviations from the mockup are
listed in `NOTES_REPORTS/2026-10-13-ui-revision-refined-mockup.md`.

Direction: dashboard mockup (`Luminoesis – Dashboard mockup.html`, structure + intent, not spec).
Skills: design-taste-frontend (v2), redesign-existing-projects (redesign-skill),
high-end-visual-design (soft-skill), full-output-enforcement (output-skill),
Vercel Web Interface Guidelines. Structure reference: Linear-style calm,
data-dense IA (sidebar, command menu, detail views) — structure only, no brand.

## 0. Audit first (redesign-skill checklist, verified in code)

- Mono abused for labels (sidebar kickers, stat labels, chips, pills) → sans labels, mono for numbers/timing only.
- Three greens + aliases → one emerald accent ramp (+ gold reserved for calibration highlights).
- Sidebar scrolls at 1080p with 8 destinations → 5 primary, compact 44px rows, rail at ≤1100px.
- Generic bordered cards → glass floating layers, opaque data cards.
- Triple-duplicated status, decorative pills/eyebrows, corner brackets, BUILT-WITH footer → removed.
- Emerald numerals on white fail contrast (2.1:1) → theme-split figure color.
- Custom overlay dialogs → one native `<dialog>` primitive (trap, Esc, focus return).
- Raw ISO dates → relative grouped dates. Missing PWA icons → generated from logo.

## 1. Color tokens (contrast-verified)

| Role | Dark | Light | Ratio |
|---|---|---|---|
| text `--ink` | #F1EEFF | #14302B | 17.1 / 15.1 |
| secondary `--ink-soft` | #B7B1D8 | #4A625C | 9.5 / 6.1 |
| accent `--accent` (emerald/viridian: actions + selection) | #46E3A6 | #0F6B54 | graphics + UI |
| on-accent `--accent-ink` | #04180F | #FFFFFF | 10.3 / 5.3 |
| figure `--figure` | #46E3A6 | #0D5C47 | 7.9 / 7.1 |
| overdue/status `--warning` (rose only) | #FFA9C4 | #A3304F | 11.9 / 5.6 |
| gold `--gold` (hero light source + logo spark only) | #FFD978 | #B7791F | graphics only |
| surface `--surface` | #12102A | #FFFFFF | opaque cards/dialogs |
| surface-muted | #1A1834 | #DCE9E1 | tracks, wells |
| surface-raised | #1E1B3D | #F2F8F4 | raised rows |
| line `--line` | rgba(196,181,253,.15) | rgba(92,82,170,.16) | hairlines (decorative) |
| background | #080A1C | #E6E8F7 | + dark.webp / light.webp photo layers |

One ramp: emerald. Racing/ink tokens retained as aliases for compatibility.
`--ink-faint` is non-text only (borders, disabled ticks) — never body copy.

## 2. Type scale

- Display: Fraunces 600/700, tight tracking, hero + key stat numerals only.
- UI: Plus Jakarta Sans 400/500/600/700. Sentence case headers, `text-wrap: balance`.
- Data: JetBrains Mono for numerals, timestamps, timing, shortcuts — never labels.
- `font-variant-numeric: tabular-nums` on `body`. Base 15px/1.5, measure ≤65ch.

## 3. Spacing / radii / elevation

- Scale: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48. Section gap 18–20, page padding 20–24.
- Radii: rows 14, cards 24, hero/sidebar 28–32, pills 9999. Nested: inner = outer − 6.
- Elevation: single soft shadow tinted to hue (`0 18px 40px -22px rgba(8,60,40,.35)` light,
  `-18px rgba(0,0,0,.65)` dark). Top-edge highlight on floating layers only.

## 4. Glass (technically correct) + page backgrounds

Backgrounds: `dark.webp` / `light.webp` are page backgrounds ONLY (fixed layers + theme wash,
opacity crossfade, active image preloaded, flat fallback under reduced-transparency).
Glass reads only over them.
- L1 chrome (sidebar, top bars): blur 22px saturate 150%, uniform 1px edge, inset top highlight.
- L2 overlays (palette, dialogs, popovers, sheets): stronger fill, blur 24px, shadow.
- L3 spotlight (hero): theme-driven — pearl + gold rays in light, navy-violet in dark.
- Halo rule (fixed once in primitives): `background-clip: padding-box`, uniform borders,
  highlights live ONLY as inset shadows inside the box; active nav keeps a single inset accent bar.
- Data cards, table rows, lists: OPAQUE. Never `backdrop-filter` on scrolling
  containers or repeated items. Fallbacks: `@supports not (backdrop-filter)` →
  strong fill; `prefers-reduced-transparency` → opaque; `prefers-contrast` →
  stronger edges; `prefers-reduced-motion` → still output.

## 5. Motion

Controls 150–200ms `cubic-bezier(.2,.8,.2,1)`; press `scale(.98)`/`translateY(1px)`.
Reveals: IntersectionObserver, `translateY(16px)+blur(4px) → none` over 700ms
`cubic-bezier(.32,.72,0,1)`, staggered 60–90ms. Transform + opacity only.

## 6. Primitives (single implementations)

Surface/Glass (CSS), Card (opaque `.card-flat` / floating `.card-glass`),
Button (`.btn-primary` accent / `.btn-ghost` / `.island` hero CTA),
Badge (`.badge` + warn variant), Dialog (native `<dialog>` wrapper),
Stat (dashboard `StatCard`), PageHeader (title + context + jump),
EmptyState (icon, title, one action). No one-off buttons/cards/shadows/colors.

## 7. Navigation (5 primary + settings row)

Today `/` · Spaces `/learning-spaces` · Review `/review?tab=cards|flashcards` (due badge)
· Library `/library` · Insights `/insights` · Settings `/settings` (normal labeled row, once).
Footer: on-device status, then one utility bar (segmented theme `switch` + 44px collapse, equal
heights; rail stacks icon-only). Collapse + theme persist. Logo: `LumiNoesis.png` on a `#0b0724`
tile. System: Privacy (reachable via Settings + palette + URL). `/flashcards` redirects to Review
flashcards tab; `/privacy` keeps rendering. Mobile: 5-tab bar + palette + drawer.
Sidebar never scrolls at 1080p: 5×44px rows + rail ≤1100px. Palm-tree badge is the
dev-only TanStack devtools button — gated to DEV builds.

## 8. Dashboard contract

Answers “what should I do now?”: hero = one primary action (`N cards due ·
Start review`) + slim 5-step calibration. Bento 12-col: hero 7×2, study 5,
recall 5, queue 7×2, rhythm 5, activity 5, retention 12. Queue grouped Overdue/Today/Upcoming
with relative chips (“7 wks overdue”). Rhythm is ONE card (N-of-5 + meter calibrating;
chart + peak line at baseline). Activity is ONE card (3 newest + heatmap + legend).
Empty: single onboarding card. Zero eyebrows on dashboard cards — one `PanelHeader`
(title + sub) everywhere. Dates relative, never raw ISO.

## 9. Skill conflicts (mockup loses)

- Theme-driven hero (v3): pearl + gold rays on light, navy-violet spotlight on dark —
  the old fixed-dark hero device is retired; hero ink follows the theme for 4.5:1.
- Fraunces numerals everywhere (taste discourages serif-as-default): display
  numerals are the brand voice here; body stays sans.
- Marketing-scale whitespace (soft-skill): workspaces stay dense; air goes to
  hero + section rhythm only.
