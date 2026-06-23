# Bach Cantatas — Project Outline

## Goal
A web app that tracks my listening through the liturgical year and learns my preferences. I already listen to all cantatas on their prescribed occasions (multiple cycles per Sunday). I vote for my favourite — the system builds a taste profile and recommends what to pay special attention to on upcoming Sundays.

## Listening practice
- Follow the Lutheran liturgical calendar
- Each Sunday/feast: listen to the cantatas assigned across Cycles 1, 2, 3 (and late works)
- One full year = the entire surviving corpus
- Multiple recordings per cantata possible (Gardiner, Suzuki, Koopman, etc.)

## What we have
- Full chronological catalogue (~200 cantatas, BWV numbers, dates, occasions)
- Liturgical cycle mapping (Cycles 1-3 by occasion, showing how Bach set the same Sunday differently)
- Luther hymns table (Cycle II chorale cantatas: BWV, hymn author, theme)
- Lutheran Year calendar mapping
- Architecture paper + cycles overview (PDFs, to be converted)
- Calendar .ics files (2025–2027 liturgical dates)

## Feature dimensions for recommendations

A cantata can be characterized along multiple axes:

**Structural / musicological:**
- Scoring (instruments: strings only, oboes, trumpets/timpani, flutes, horns, organ obbligato)
- Movement count and types (chorus, aria, recit, chorale, arioso, sinfonia)
- Key and tonal character
- Duration
- Chorus complexity (simple chorale harmonization vs. elaborate fugal chorus)
- Presence of a major opening chorus vs. solo opening

**Liturgical / thematic:**
- Season (Advent, Christmas, Epiphany, Lent, Easter, Pentecost, Trinity)
- Emotional register (penitential, joyful, reflective, triumphant, pastoral)
- Theological theme (death/resurrection, sin/grace, trust/doubt, praise, eschatology)

**Historical / contextual:**
- Period (Weimar early, Leipzig Cycle 1/2/3, late)
- Librettist (where known: Neumeister, Franck, Lehms, Picander, Ziegler)
- Whether it's a chorale cantata (Cycle II) or free text
- Reworking/parody relationships (shares music with another work)

**Listening experience:**
- Mood (dark, bright, intimate, grandiose, contemplative)
- Standout movements (famous arias, iconic choruses)
- Accessibility (immediate appeal vs. acquired taste)
- Tempo/energy profile across the cantata

## The web app

**Core loop:**
1. Show today's liturgical occasion + assigned cantatas across cycles
2. I listen, then vote (simple: star/heart, or ranked preference among the day's cantatas)
3. System accumulates votes over time
4. System surfaces patterns and predicts preferences for upcoming Sundays

**What the system learns from votes:**
- Do I consistently prefer Cycle II chorale cantatas over free-text Cycle I?
- Do I gravitate toward intimate scoring (solo + obbligato) or grand choruses?
- Do I prefer penitential darkness or joyful brightness?
- Which librettists/hymn authors resonate?
- Key/mode preferences (minor vs major)?
- Do I favour early Weimar reworkings or mature Leipzig originals?

**Recommendations it can make:**
- "This Sunday has 3 cantatas. Based on your pattern, you'll likely prefer BWV X — listen to it last (save the best)"
- "You haven't heard BWV Y yet, but it shares [scoring/mood/chorale source] with your top-rated cantatas"
- "Your taste clusters around [intimate penitential works with oboe] — here are 5 you rated lower that deserve a relisten"
- "You and [other user] share 80% preference overlap — they loved BWV Z which you haven't rated yet"

**Views:**
- **Calendar view:** liturgical year, today highlighted, upcoming Sundays with cantata assignments
- **Vote view:** today's cantatas, play links, vote buttons
- **Profile view:** my constellation of preferences (visualized on feature dimensions)
- **Analyst view:** patterns, clusters, prediction accuracy over time

## Next steps
- [ ] Convert the two PDFs to readable format
- [ ] Build the structured dataset (one row per cantata, feature columns)
- [ ] Design the data model (cantatas, occasions, votes, features)
- [ ] Prototype the calendar + vote interface
- [ ] Define similarity metric for recommendations
- [ ] Decide if multi-user (social/collaborative filtering) or personal only
- [ ] Plan for eventual public release — personal first, social later
