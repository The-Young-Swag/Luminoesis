---
version: v1
name: Luminoesis-enterprise
description: |
  Enterprise study-workspace system for Luminoesis — offline-first adaptive
  spaced repetition. Deep racing-green authority (#004225) + veridian action
  (#40826d) + emerald signal (#50c878) on paper surfaces (#f6f7f3 / #ffffff).
  Inter for UI, Fraunces for display moments only, JetBrains Mono for
  operational metadata. Solid surfaces first, glass sparingly. One accent per
  view, tabular numbers, explicit empty/loading/error states, keyboard-first.
---

colors:
  primary: "#004225"
  primary-strong: "#002a16"
  action: "#40826d"
  action-strong: "#2f5d4f"
  signal: "#50c878"
  signal-strong: "#3aa361"
  ink: "#17201b"
  ink-soft: "#5d6862"
  ink-faint: "#667269"
  line: "#dce3de"
  line-strong: "#c5d8ce"
  surface: "#ffffff"
  surface-muted: "#f5f9f7"
  surface-raised: "#fbfcf9"
  background: "#f6f7f3"
  warning: "#d97706"
  destructive: "#dc2626"
  on-primary: "#ffffff"

typography:
  display:
    fontFamily: Fraunces, Georgia, serif
    usage: Page headlines only, max 2 lines, text-wrap balance
  ui:
    fontFamily: Inter, system-ui, sans-serif
    usage: All product UI, 14–15px body, tabular-nums for metrics
  mono:
    fontFamily: JetBrains Mono, monospace
    usage: Operational metadata only (status, counts, shortcuts). Never body copy.

rounded:
  sm: 8px
  md: 12px
  lg: 16px
  pill: 9999px

spacing:
  page-max: 1120px
  page-max-wide: 1280px
  section-gap: 20px
  card-padding: 20px

components:
  app-shell:
    sidebar: 280px fixed, 64px collapsed, glass-nav with solid fallback
    content: page-wrap centered, min-w-0 throughout, no horizontal scroll
  command-bar:
    pattern: Breadcrumb / title left, primary + secondary actions right
    sticky: Top of content on dense pages, single row on desktop
  kpi-card:
    layout: Icon + label top, display value tabular-nums, hint line
    interaction: Entire card is one Link when navigable, focus-visible ring
  nav-item:
    layout: Icon tile + label, no secondary microcopy by default
    active: Solid racing background, white text, aria-current page
  insight-banner:
    usage: Max one per view, veridian-muted fill, single contextual CTA
  state-panel:
    usage: Current state + next action, never duplicates hero CTA intent

rules:
  - One accent per view. Racing for authority, veridian for action, emerald for live signal. Never mix warm/cool grays.
  - Eyebrows max 1 per 3 sections. Headline alone is usually enough.
  - No duplicate CTA intent per view. One label for review everywhere.
  - Buttons keep original label + spinner during request, never wrap at desktop.
  - URL reflects state. Links use Link, never div onClick or raw href for internal routes.
  - Keyboard first: skip link, visible focus rings, focus trap in sheets, return focus on close.
  - Numbers use tabular-nums. Dates use Intl.DateTimeFormat.
  - Skeletons mirror final layout. Empty states offer next step. Errors inline with fix.
  - Animate transform/opacity only, honor prefers-reduced-motion, never transition-all.
  - color-scheme light/dark on html, theme-color matches background.
---

## Overview

Luminoesis is an enterprise study workspace, not a marketing site. The UI
reads as a calm operations console: paper background, white working surfaces,
hairline borders, racing-green authority moments, veridian actions, emerald
live signal. Fraunces appears only in page headlines. Everything operational
(counts, status, shortcuts) is JetBrains Mono at 10–12px. Body is Inter.

Glass is restraint, not identity. Sidebar and overlays may blur; content
cards stay solid white for contrast and print resilience. Dark mode inverts
to #141517 with the same accent logic — no section-level theme flips.

**Enterprise guarantees:**
- Skip link + h1 per view + hierarchical h2 sections with scroll-margin
- One primary CTA per view (Start review), secondary actions ghost
- KPI values tabular, comparable, never faked precision
- Command deck: feed left, HUD rail right on desktop, single column mobile
- Every list handles empty / sparse / dense / error without broken UI
