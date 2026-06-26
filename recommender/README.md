I have an idea I'd like to explore. What if we go on youtube and build a sound profile for every cantata? But that could quickly turn out expensive. Would it be easier to OCR the scores from bach-cantatas - or maybe even find on the web some other readable format? Then we could code something in Python and train an unsupervised neural network to find the distances between them?
How would we measure success? What makes a cantata "similar" to another?
Could we do some research on this? Then we'd have human-curated part and ai-powered suggestions for "Cantatas you liked".

---

## Data sources (ranked by feasibility)

1. **Structured score data (MusicXML/MIDI)** — Bach cantatas are well-covered in projects like Bach Digital and CPDL. MusicXML gives pitch, rhythm, instrumentation, voicing — all parseable without OCR. Cleanest path.
2. **Audio features from YouTube** — Spotify-style embeddings (tempo, key, timbre, spectral features) via `librosa`. Expensive in API calls but captures *performance* character, not just notation.
3. **OCR of scores** — Worst option. Music OCR (OMR) is fragile and you'd still need to convert to a structured format afterward.

## What makes cantatas "similar"?

Possible feature dimensions:
- **Instrumentation** (oboe d'amore vs. trumpet ensemble → totally different mood)
- **Key & mode** (D major festive vs. B minor introspective)
- **Vocal forces** (solo cantatas vs. full SATB chorus)
- **Melodic/harmonic language** (chorale density, chromaticism)
- **Liturgical function** (already in our data — same Sunday = thematic link)
- **Tempo/movement structure** (opening chorus vs. sinfonia)

## Suggested approach

1. Source MusicXML from IMSLP or Bach Digital (many already digitized)
2. Extract feature vectors in Python (pitch histograms, rhythm patterns, instrumentation flags, key signatures)
3. Train an autoencoder or use UMAP for dimensionality reduction — gives distance metric without needing labels
4. Validate against known musicological groupings (e.g., Leipzig vs. Weimar period, chorale cantatas cluster)

## Success metric

Does the system surface cantatas that a knowledgeable listener would agree "go well together"? Validate against existing concert programming — conductors already do this curation intuitively.

## Parked ideas

- **YouTube audio scraping** — interesting for recommending a particular *performance* of a cantata (e.g., Gardiner vs. Suzuki vs. Koopman). Not pursuing now; revisit once the score-based similarity engine works.

## Data availability (researched 2026-06-24)

### Primary source: Casadesus-Masanell MuseScore collection
- Full scores for **all ~200 sacred cantatas** (BWV 1–224)
- MuseScore format → exportable to MusicXML, MIDI
- Engraved from public-domain Bach-Gesellschaft Ausgabe editions
- Non-commercial use, attribution required
- `musescore.com/user/17782181/sets`

### Quick-start: music21 corpus (Python)
- Bundled in `music21` — no download step
- Contains ~150+ cantata **chorale movements only** (closing 4-part harmonizations)
- Good for prototyping the feature extraction pipeline before scaling to full scores

### Other sources (less useful)
- **IMSLP** — mostly PDFs, inconsistent MusicXML availability
- **Bach Digital** — metadata/manuscripts only, no machine-readable scores
- **DCML Bach Chorales** (GitHub) — 371 chorales (BWV 250–438), CC0, but not cantatas

## Prototype plan (music21 chorales)

### Phase 1 — Feature extraction
From each of the ~150 chorales, extract a ~30-dim vector:
- Key & mode (major/minor, relative brightness)
- Pitch class histogram (12-dim)
- Interval histogram (melodic leaps vs. steps)
- Chromaticism score (% non-diatonic pitches)
- Rhythmic density (notes per beat)
- Voice range spread (soprano–bass distance)
- Cadence patterns (phrase endings)

### Phase 2 — Distance & clustering
- Normalize, reduce with UMAP to 2–3D
- Pairwise cosine distances
- Visualize — do clusters map to key families, liturgical seasons, composition period?

### Phase 3 — Validate
- Pick known cantatas, check nearest neighbors
- Cross-reference with liturgical groupings in our YAML data

### Limitations
Chorales are only the final movement — proof of concept, not final model. Two cantatas could share chorale style but differ wildly in their opening chorus.

## Verdict

This is a **weekend-to-start, month-to-polish** project. We can prototype with music21 chorales immediately, then scale to full scores via the MuseScore collection.
