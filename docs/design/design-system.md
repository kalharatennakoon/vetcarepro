# Design System

Visual language for VetCare Pro: design tokens, typography, and the shared component library.

> **Status: specification, not implementation.** This document describes the intended system. The current codebase does not implement it — see [Current state](#current-state) below before assuming any token exists in code.

---

## Brand personality

Calm, trustworthy, clinical but warm. The product handles anxious moments — a sick animal, an unexpected bill — and the interface should reduce tension rather than add to it. Clinical precision without coldness.

---

## Current state

An audit of the codebase found no design token layer of any kind:

| Finding | Measure |
|---|---|
| CSS custom properties defined | 0 |
| Inline style objects in JSX | ~1,400 |
| Distinct hex colour values | 146 |
| Files with heaviest inline styling | `Analytics.jsx` (198), `DiseaseCaseDetail.jsx` (160), `PetDetail.jsx` (155) |

**The web and iOS clients also diverge on brand colour.** The web application uses blue (`#3b82f6`, with `#137fec` also present); the iOS app uses teal (`#127d8c`, defined in `Theme.swift` and `AccentColor.colorset`). The two do not currently read as one product.

Those two hex values are worth noting side by side — `#137fec` and `#127d8c` differ by a single character in three positions. A transcription error somewhere in the chain is at least as likely an explanation as an independent design decision, and resolving which was intended should precede adopting either.

### Remediation sequence

1. **Decide the brand colour** — resolve the blue/teal divergence deliberately before either is propagated.
2. **Define tokens** as CSS custom properties in `client/src/index.css`, with matching values in `mobile/ios/VetCare/Theme.swift`.
3. **Migrate the highest-density files first** — the three listed above account for a disproportionate share of inline styling.
4. **Extract repeated patterns into components** rather than restyling each occurrence.

Step 1 gates the rest. Propagating a token layer built on the wrong accent colour means doing the work twice.

---

## Design tokens

> Populate from the approved style guide. Token names below are the contract; values are placeholders pending step 1 above.

### Colour

| Token | Purpose |
|---|---|
| `--color-primary` | Brand accent, primary actions |
| `--color-primary-hover` | Hover and pressed state |
| `--color-background` | Application background |
| `--color-surface` | Card and panel surfaces |
| `--color-border` | Dividers and input borders |
| `--color-text-primary` | Body text |
| `--color-text-secondary` | Supporting and label text |
| `--color-success` | Confirmation, healthy status |
| `--color-warning` | Attention, expiring stock |
| `--color-danger` | Errors, destructive actions, critical severity |
| `--color-info` | Neutral informational states |

Semantic colours carry clinical meaning in this product — severity indicators, stock warnings, vaccination status. Contrast requirements are therefore a functional constraint, not only an accessibility one.

### Typography

| Token | Purpose |
|---|---|
| `--font-family-base` | All interface text |
| `--font-family-mono` | Identifiers, codes, timestamps |
| `--font-size-xs` … `--font-size-3xl` | Type scale |
| `--font-weight-regular` / `-medium` / `-semibold` / `-bold` | Weights |
| `--line-height-tight` / `-base` / `-relaxed` | Line heights |

The audit found `0.875rem` used 407 times and `0.75rem` 209 times, alongside irregular values such as `0.72rem` and `0.78rem` — a scale is already implicit and simply needs formalizing.

### Spacing

A single scale, ideally 4px-based, replacing ad-hoc pixel values.

| Token | Value |
|---|---|
| `--space-1` … `--space-12` | 4px increments |

### Radius, elevation, motion

Current radius usage clusters at 8px (210 occurrences), 6px (210), and 12px (105), with outliers at 7px and 10px. Three tokens — `--radius-sm`, `--radius-md`, `--radius-lg` — plus `--radius-full` for pills and avatars would cover observed usage.

Elevation: `--shadow-sm`, `--shadow-md`, `--shadow-lg`.
Motion: `--duration-fast`, `--duration-base`, `--easing-standard`.

---

## Component library

Eleven shared components form the interface vocabulary. Each needs documented variants, states, and accessibility behaviour before it can be considered part of the system.

| Component | Notes |
|---|---|
| Button | Primary, secondary, ghost, destructive; loading and disabled states |
| Input | Text, number, date, select; error and helper text |
| Card | Default and interactive surfaces |
| Table | Sortable headers, empty state, row actions |
| Modal | Confirmation and form variants; focus trapping |
| Badge / status pill | Carries severity and status semantics |
| Toast | Success, error, informational |
| Empty state | Icon, message, primary action |
| Loading state | Skeleton and spinner |
| Navigation | Sidebar and top bar, role-aware |
| Chat bubble | Assistant and user; source citation chips |

The chat bubble is the one component with no equivalent in a conventional management interface, and carries the most product-specific requirements — citation chips, decision-support framing, disambiguation options, and pending-confirmation states for proposed write actions.

---

## Cross-platform parity

Tokens are defined once conceptually and expressed twice: CSS custom properties for web, `Theme.swift` for iOS. The two must be updated together.

The iOS app targets iOS 26.5 and adopts Liquid Glass, which affects surface treatment and elevation. Parity means matching brand identity and semantic meaning — not identical rendering. Platform conventions should be respected rather than overridden.

---

## Accessibility

- Text contrast meeting WCAG 2.1 AA — 4.5:1 for body, 3:1 for large text
- Colour never the sole carrier of meaning; severity and status need a label or icon alongside
- Visible focus indicators on all interactive elements
- Touch targets at least 44×44 points on iOS
- Full keyboard navigability on web

The colour-alone constraint deserves emphasis in this product. A severity indicator distinguished only by hue is unreadable to a colour-blind user, and severity here carries clinical weight.

---

## Related

- [`../ARCHITECTURE.md`](../ARCHITECTURE.md) §7 — frontend structure
- [`../SCOPE.md`](../SCOPE.md) §5 — styling recorded as a known gap
- [`../deliverables/wireframes/`](../deliverables/wireframes/) — low-fidelity wireframes