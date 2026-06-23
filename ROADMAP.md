# Das Kantatenwerk — Roadmap

## Phase 1: Next.js Migration & Auth (current priority)

### 1.1 Project scaffold
- [ ] Init Next.js 15 (App Router) with TypeScript
- [ ] Move static assets, fonts, and CSS tokens into the new project
- [ ] Port existing views as route groups: `/`, `/catalogue/[sort]`, `/likes`, `/discover`
- [ ] Set up Railway deployment with auto-deploy from `main`

### 1.2 Database
- [ ] Choose DB: PostgreSQL (Neon or Railway-managed) for relational data; evaluate graph DB (Neo4j Aura free tier) for cantata relationships/recommendations later
- [ ] Schema design: `users`, `votes` (user_id, bwv, state, timestamp), `cantatas` (migrate from YAML/SQLite)
- [ ] ORM: Drizzle or Prisma — migrate YAML nodes into Postgres
- [ ] Seed script: import current `data/nodes/*.yaml` + `data/index.json` into DB

### 1.3 Authentication
- [ ] NextAuth.js (Auth.js v5) integration
- [ ] Providers: Google, GitHub, Apple (Sign in with Apple covers iCloud users)
- [ ] Session strategy: JWT (stateless, Railway-friendly)
- [ ] Protected API routes: votes, user preferences
- [ ] UI: sign-in button in top bar, user avatar, sign-out

### 1.4 User data migration
- [ ] On first sign-in, offer to import localStorage votes into server-side DB
- [ ] All vote/like operations go through API routes (optimistic UI, server-confirmed)
- [ ] Listening stats component (`getListeningStats`) reads from DB per user

---

## Phase 2: Full-stack features

### 2.1 Social & sharing
- [ ] Public profile: "Marek has listened to 45 cantatas"
- [ ] Share a cantata or occasion with a link preview (OG tags)
- [ ] Leaderboard / community stats (opt-in)
- [ ] Friend recommendations: "Anna liked BWV 156 — try it this Sunday"
- [ ] Community-curated collections: users assemble themed playlists (e.g. "Best opening choruses", "Intimate chamber cantatas")
- [ ] Follow friends, see their listening activity and favourites

### 2.2 Graph-powered recommendations
- [ ] Model cantata relationships as edges: shared key, shared forces, same occasion, parody relationship, stylistic similarity
- [ ] Neo4j or Postgres `ltree`/recursive CTEs for traversal
- [ ] "Because you liked BWV 12" powered by graph walks, not just tag overlap

### 2.3 Advanced features
- [ ] Push notifications for upcoming occasions (web push via service worker)
- [ ] Offline support / PWA
- [ ] Dark mode
- [ ] Multi-year calendar selector

---

## Backlog (existing)

### Calendar & Schedule
- [ ] Year selector — let users choose which liturgical year to display (currently hardcoded to 2026). Support multi-year or perpetual scrolling.
- [ ] ICS download should reflect the selected year dynamically

### Bible Readings
- [ ] Find a working modern German translation (LUT/LUTH1912 blocked on Bible Gateway)
- [ ] Consider caching fetched readings to avoid repeated scraping
- [ ] Epistle readings (currently only Gospel is displayed)

### Landing Page
- [ ] Refine hero card layout on wider screens
- [ ] Animate transition between past/current/future in schedule

### Cantata Details
- [ ] Performance captions — improve regex for performer/place/date extraction
- [ ] Overview section — enrich with more structured data (instrumentation, duration)

### Insights Tab
- [ ] Implement filter bar: By Key · By Form · By Forces · By Character
- [ ] Tag extraction from Wikipedia enrichment (key, opening form, instrumentation, mood)
- [ ] Flexible tagging model — accumulates properties as data comes in, filter bar adapts
- [ ] Future: IMSLP score analysis (key signatures, instrumentation markings)
- [ ] Future: Audio/spectral analysis from YouTube performances (unsupervised learning)
- [ ] Recommender system — "You liked BWV 12, try also..." based on shared tags, key, forces, mood, parody edges

### Occasions & Cycles
- [ ] Occasion descriptions — lazy-generate from Wikipedia (even when no dedicated page exists, e.g. Ratswahl)
- [ ] Cycle detail panel — swap placeholder descriptions with live Wikipedia content once fetched
- [ ] Occasions data file (`data/occasions.json`) — canonical liturgical order + Wikipedia URLs

### Help Section ("?")
- [ ] Redesign help overlay with onboarding narrative
- [ ] Copy: "Welcome to Das Kantatenwerk! Our purpose is to help you discover — or rediscover — the entirety of Bach's extant corpus of church cantatas by taking you through the Lutheran liturgical year. By far, the best way to experience the _Kantatenwerk_ is to listen to them on the very day they were composed for, following the rhythm of the church calendar as Bach himself intended."
- [ ] Explain the Listen → Explore → Like → Discover pipeline

### General
- [ ] Offline support / service worker
- [ ] Dark mode
- [ ] Mobile responsiveness audit

---

## Tech stack (target)

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 15 (App Router) | SSR, API routes, file-based routing |
| Language | TypeScript | Type safety across stack |
| Auth | Auth.js v5 (NextAuth) | Google/GitHub/Apple, JWT sessions |
| DB | PostgreSQL (Neon or Railway) | Relational, JSON columns for tags |
| ORM | Drizzle | Lightweight, type-safe, no codegen |
| Graph (later) | Neo4j Aura / Postgres recursive | Recommendation engine |
| Hosting | Railway | One platform, auto-deploy, volumes |
| CSS | Keep current tokens + Tailwind utility layer | Preserve design language |

---

*Last updated: 2026-06-23*
