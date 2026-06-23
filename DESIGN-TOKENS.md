# Bach Cantatas — Design Tokens & Specs

Reference for styling the final product. All values live as CSS custom properties in `:root` inside `app/index.html`.

---

## Color Palette — Manuscript Red & Black

Inspired by printed score aesthetics: rubric red ink for emphasis, iron gall ink for text, rag paper for surfaces.

| Token | Value | Usage |
|-------|-------|-------|
| `--md-primary` | `#8C2F2F` | Active states, toggle fills, icon tints, links |
| `--md-on-primary` | `#FFFFFF` | Text on primary fills |
| `--md-primary-container` | `#F5E6DC` | Occasion hero section, highlighted cards |
| `--md-on-primary-container` | `#3B1515` | Text on primary container |
| `--md-secondary` | `#6B4C3A` | Secondary accents |
| `--md-secondary-container` | `#F0EAE0` | Votes summary card |
| `--md-on-secondary-container` | `#2B1A10` | Text on secondary container |
| `--md-tertiary` | `#5C5030` | Reserved (insights/future) |
| `--md-tertiary-container` | `#EDE5C8` | Reserved |
| `--md-surface` | `#FEFBF6` | Page background — warm rag paper |
| `--md-surface-variant` | `#F0EAE0` | Libretto section bg, hover states, chips |
| `--md-on-surface` | `#1F1B17` | Primary text — iron gall ink |
| `--md-on-surface-variant` | `#5C5248` | Secondary text, labels, metadata |
| `--md-outline` | `#8C7E74` | Placeholder text |
| `--md-outline-variant` | `#DDD5CC` | Borders, dividers |

### Cycle Badge Colors

White text on saturated backgrounds — designed to pop against the warm paper surface.

| Cycle | Class | Background | Hex name |
|-------|-------|-----------|----------|
| EARLY (Pre-Leipzig) | `.cycle-EARLY` | `#E6B800` | Dark gold |
| C1 (Leipzig 1) | `.cycle-C1` | `#81C784` | Soft green |
| C2 (Chorale) | `.cycle-C2` | `#43A047` | Mid green |
| C3 (Leipzig 3) | `.cycle-C3` | `#2E7D32` | Deep green |
| PICANDER | `.cycle-PICANDER` | `#1565C0` | Deep blue |
| LATE | `.cycle-LATE` | `#6A1B9A` | Deep purple |
| MISC | `.cycle-MISC` | `#8E8E93` | Neutral grey |

All badges use `color: #FFFFFF`. Applied via `getCycleClass()` utility.

---

## Typography

### Font Stacks

| Token | Value | Usage |
|-------|-------|-------|
| `--font-ui` | `'Roboto', sans-serif` | All UI: labels, buttons, navigation, metadata |
| `--font-display` | `'EB Garamond', serif` | Headings: app title, occasion names, section headers |
| `--font-libretto` | `'EB Garamond', serif` | Libretto text body only |

### Type Scale

| Token | Size | Typical usage |
|-------|------|---------------|
| `--text-xs` | 11px | Section labels, dot labels, meta badges |
| `--text-sm` | 12px | Card subtitles, chips, button text |
| `--text-md` | 13px | Sheet meta, link labels |
| `--text-base` | 14px | Body text, back button, nav |
| `--text-lg` | 16px | Search input |
| `--text-xl` | 19px | Libretto (= `--libretto-size`) |
| `--text-2xl` | 20px | Sheet title, occasion heading |
| `--text-3xl` | 22px | App title (top bar h1) |
| `--text-4xl` | 32px | Votes summary count |

### Libretto Specific

| Token | Value | Notes |
|-------|-------|-------|
| `--libretto-size` | 19px | EB Garamond medium |
| `--libretto-weight` | 500 | Medium weight, not italic |
| `--libretto-lh` | 1.55 | Tighter than body, bookish |
| `--libretto-columns` | 1 | Default; 2 on wide screens via media query |
| `--libretto-col-gap` | 48px | Gap between columns (wide) |
| `--libretto-min-h` | 360px | Stable frame on mobile |
| `--libretto-pad-bottom` | 48px | Breathing room below text |
| `--libretto-col-height` | 420px | Fixed height for `column-fill: auto` |

Wide-screen (>720px): 2 columns, unbalanced (`column-fill: auto`) — short text stays in left column.

---

## Spacing

| Token | Value | Semantic |
|-------|-------|----------|
| `--space-xs` | 4px | Tight gaps (dot gaps, inline) |
| `--space-sm` | 8px | Small gaps, list padding |
| `--space-md` | 12px | Card inner gaps, link padding |
| `--space-base` | 16px | Standard padding (sections, content) |
| `--space-lg` | 20px | Section margins |
| `--space-xl` | 24px | Section headers, detail padding |
| `--space-2xl` | 32px | Large padding (empty states) |
| `--space-3xl` | 48px | Panel padding (wide), column gap |

---

## Shape

| Token | Value | Usage |
|-------|-------|-------|
| `--md-shape-m` | 12px | Cards, libretto section, links |
| `--md-shape-l` | 16px | Calendar widget, occasion detail |
| `--md-shape-xl` | 28px | Pills (search bar, sort toggles) |

---

## Elevation

| Token | Value | Usage |
|-------|-------|-------|
| `--md-elevation-1` | `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.12)` | Cantata cards |
| `--md-elevation-2` | `0 2px 6px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.10)` | Reserved (elevated surfaces) |

---

## Motion

| Token | Value | Usage |
|-------|-------|-------|
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | All transitions (Material 3 standard) |
| `--duration-short` | 0.15s | Hover states, button feedback |
| `--duration-medium` | 0.25s | Search overlay slide |
| `--duration-long` | 0.3s | Detail panel slide-in |

---

## Layout

| Token / Breakpoint | Value | Behavior |
|--------------------|-------|----------|
| `--app-max-w` | 1200px | App container max width |
| `--detail-max-w` | 960px | Detail panel content cap |
| `--wide-breakpoint` | 720px | Primary responsive breakpoint |
| 720px (media) | — | Grids switch to 2-column; libretto 2-column |
| 1024px (media) | — | Catalogue grids switch to 3-column |

All cantata list grids are single-column below 720px.

---

## Vote States

Three-state listen/like system using Material Symbols `hearing` and `favorite` icons.

| State | Value | Icon | Class | Visual |
|-------|-------|------|-------|--------|
| Unheard | 0 | `hearing` | (none) | Default grey |
| Heard | 1 | `favorite` | `.heard` | Heart outline, `--md-primary` color |
| Liked | 2 | `favorite` | `.voted` | Heart filled, `--md-primary` color, `FILL 1` |

---

## Google Fonts Load

```html
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Roboto:wght@300;400;500;700&family=Roboto+Serif:opsz,wght@8..144,300;8..144,400;8..144,600&family=UnifrakturMaguntia&display=swap" rel="stylesheet">
```

---

## Notes

- **Palette concept**: "Manuscript Red & Black" — evokes a printed Breitkopf score or rubric-annotated hymnbook. Warm rag-paper surface, iron gall ink text, red rubric accents for interactive elements.
- **Cycle badges**: Earthy-to-jewel gradient (gold → greens → blue → purple) following chronological order. Act as the primary color wayfinding through 200+ cantatas.
- **Display font**: EB Garamond serves double duty as both display heading font and libretto body. Roboto Serif is loaded but unused in current tokens.
- **Dark mode**: Not implemented. Define a `@media (prefers-color-scheme: dark)` block remapping all `--md-*` color tokens.
- **Touch targets**: All interactive icons are minimum 36x40px. Bottom nav items have 20px horizontal padding.
- **Data architecture**: Cycle metadata and instrument families live in `data/cycles.yaml` and `data/instruments.yaml`; loaded via API at startup.
