# Luminoesis Design System v2

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
| text `--ink` | #EAF6EF | #0A2018 | 17.1 / 15.1 |
| secondary `--ink-soft` | #A3BDB0 | #475F54 | 9.5 / 6.1 |
| accent `--accent` | #4FE0A3 | #0E7A54 | graphics + UI |
| on-accent `--accent-ink` | #04200F | #FFFFFF | 10.3 / 5.3 |
| figure `--figure` | #4FE0A3 | #0E5A3E | 7.9 / 7.1 |
| warn `--warn` | #FFC266 | #8A5300 | 11.9 / 5.6 |
| gold `--gold` | #FFD978 | #B7791F | graphics only |
| surface `--surface` | #0C1F17 | #FFFFFF | opaque cards/dialogs |
| surface-muted | #12291E | #DCE9E1 | tracks, wells |
| surface-raised | #143325 | #F2F8F4 | raised rows |
| line `--line` | rgba(255,255,255,.10) | #CFDED5 | hairlines (decorative) |
| background | #05130d | #EAF3EE | + 3 ambient radials |

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

## 4. Glass (technically correct)

Ambient: `body::before` fixed, 3 radial gradients (emerald wash, gold breath, deep falloff),
no image dependency. Glass reads only over it.
- L1 chrome (sidebar, top bars): blur 22px saturate 150%, 1px edge, top highlight.
- L2 overlays (palette, dialogs, popovers, sheets): stronger fill, blur 24px, shadow.
- L3 spotlight (hero): gradient wash + blur + specular ring motif.
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

## 7. Navigation (5 primary)

Today `/` · Spaces `/learning-spaces` · Review `/review?tab=cards|flashcards` (due badge)
· Library `/library` · Insights `/insights`. System: Settings (footer), Privacy
(reachable via Settings + palette + URL). `/flashcards` redirects to Review
flashcards tab; `/privacy` keeps rendering. Mobile: 5-tab bar + palette + drawer.
Sidebar never scrolls at 1080p: 5×44px rows + rail ≤1100px. Palm-tree badge is the
dev-only TanStack devtools button — gated to DEV builds.

## 8. Dashboard contract

Answers “what should I do now?”: hero = one primary action (`N cards due ·
Start review`) + slim 5-step calibration. Bento 12-col: hero 7×2, study 5,
recall 5, queue 7×2, rhythm 5, activity 5. Queue grouped Overdue/Today/Upcoming
with relative chips (“7 wks overdue”). Empty: single onboarding card, heatmap
hidden until data. Max one eyebrow per section. Dates relative, never raw ISO.

## 9. Skill conflicts (mockup loses)

- Dark hero on light page (redesign-skill flags it): kept as the intentional
  spotlight device with edge highlight + ring motif, not an accident.
- Fraunces numerals everywhere (taste discourages serif-as-default): display
  numerals are the brand voice here; body stays sans.
- Marketing-scale whitespace (soft-skill): workspaces stay dense; air goes to
  hero + section rhythm only.
