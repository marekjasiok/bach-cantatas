# Bach Cantatas App — Roadmap

## Backlog

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
- [ ] Copy: "Welcome to Das Kantatenwerk! Our purpose is to take you through the Lutheran liturgical year to discover — or rediscover — the entirety of Bach's extant corpus of church cantatas. By far, the best way to experience the _Kantatenwerk_ is to listen to them on the very day they were composed for, following the rhythm of the church calendar as Bach himself intended."
- [ ] Explain the Listen → Explore → Like → Discover pipeline

### General
- [ ] Offline support / service worker
- [ ] Dark mode
- [ ] Mobile responsiveness audit

---

*Last updated: 2026-06-21*
