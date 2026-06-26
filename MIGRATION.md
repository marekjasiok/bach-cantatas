# Next.js Migration Plan

## Methodology: Domain-Driven Design → Contract → Strangle Fig

Progressive replacement, not big-bang rewrite. Solidify domain model and contracts before writing any Next.js code.

---

## Phase 0: Domain Modeling & Entity Naming

### Entity Glossary
Formalize canonical names (currently "node" = cantata, vote states are unclear):

- **Cantata** — core entity (replaces "node")
- **Occasion** — liturgical event
- **Movement** — individual movement within a cantata
- **Cycle** — EARLY, C1, C2, C3, PICANDER, LATE
- **Engagement** — user interaction (heard/liked) — replaces "vote" with opaque 0/1/2
- **CalendarEvent** — computed liturgical date with assigned cantatas

### Type Contracts
Write TypeScript interfaces before any component code. These become the single source of truth.

### State Audit
Separate current `state.js` into:
- **Domain state** — cantatas, occasions, calendar
- **UI state** — active tab, overlay open, scroll position, heroIdx
- **User state** — engagements (votes)

---

## Phase 1: Simplify & Extract (refactor current codebase)

Before touching Next.js:

1. **Extract pure functions** — `liturgical.js` is already framework-agnostic. Pull data transformation logic from views into `/lib` or `/domain`.
2. **Normalize data access** — YAML → JSON index → localStorage → SQLite currently coexist. Decide canonical source, create clean data access layer.
3. **Standardize on YAML** — all data files must be YAML (not JSON). Convert `translations.json`, `index.json`, `readings.json`, `occasions.json`, `liturgical-order.json` to `.yaml`. YAML is already used for cantata nodes, keys, cycles, instruments — make it universal.
4. **Kill dead code** — unused routes, stale enrichment paths.

---

## Phase 2: Architecture Decision Records

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Data fetching | RSC vs client fetch | RSC for catalogue, client for votes |
| State management | Zustand vs React context vs server state | Zustand for UI, TanStack Query for server |
| Routing | App Router pages | Map current routes 1:1 |
| Database | Keep SQLite vs Postgres | Postgres (Neon) for multi-user |
| Styling | Keep CSS vars vs Tailwind vs CSS Modules | CSS Modules + existing design tokens |
| ORM | Drizzle vs Prisma | Drizzle (lightweight, SQL-close) |
| Auth | Auth.js v5 | Google/GitHub/Apple social login |

---

## Phase 3: Incremental Migration (Strangle Fig)

1. Set up Next.js skeleton with existing `/data` folder
2. Port `liturgical.js` as server utility (zero changes needed)
3. Build one route at a time, each as its own branch + PR:
   - Schedule (Listen tab)
   - Catalogue (Explore tab)
   - Sheet (Cantata detail)
   - Occasion detail
   - Likes
   - Discover (Insights)
4. Each route gets before/after parity check

---

## Concrete Next Steps

1. Write `DOMAIN.md` — entity glossary + TypeScript interfaces
2. Write `ARCHITECTURE.md` — ADRs for decisions above
3. Refactor current code — extract pure domain logic from view modules into `/lib`
4. Scaffold Next.js — App Router + existing data layer
