const express = require('express');
const path = require('path');
const { generateCalendarEvents, generateICS } = require('./liturgical');
const db = require('./db');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'app')));
app.use(express.static(__dirname));

// --- Reference data ---

app.get('/api/cycles', (req, res) => {
  try { res.json(db.getCycles()); }
  catch { res.status(500).json({ error: 'Cycles data not found' }); }
});

app.get('/api/instruments', (req, res) => {
  res.json(db.getInstruments());
});

app.get('/api/occasions', (req, res) => {
  try { res.json(db.getOccasions()); }
  catch { res.status(500).json({ error: 'Occasions data not found' }); }
});

app.get('/api/translations', (req, res) => {
  try { res.json(db.getTranslations()); }
  catch { res.status(500).json({ error: 'Translations data not found' }); }
});

app.get('/api/liturgical-order', (req, res) => {
  try { res.json(db.getLiturgicalOrder()); }
  catch { res.status(500).json({ error: 'Liturgical order data not found' }); }
});

app.get('/api/index', (req, res) => {
  try { res.json(db.getIndex()); }
  catch { res.status(500).json({ error: 'Index not found. Run: npm run migrate' }); }
});

// --- Cantata nodes ---

app.get('/api/cantata/:num', (req, res) => {
  const num = req.params.num.replace(/^BWV\s*/i, '');
  const node = db.getNode(num);
  if (!node) return res.status(404).json({ error: `BWV ${num} not found` });
  res.json(node);
});

app.get('/api/cantata/:num/enrich', async (req, res) => {
  const num = req.params.num.replace(/^BWV\s*/i, '');
  console.log(`[enrich] BWV ${num} — start`);

  let node = db.getNode(num);
  let changed = false;

  if (!node) {
    const index = db.getIndex();
    const entry = index.find(e => String(e.bwv) === String(num));
    if (!entry) return res.status(404).json({ error: `BWV ${num} not in index` });
    node = { bwv: entry.bwv, title: entry.title, occasion: entry.occasion, cycle: entry.cycle };
    changed = true;
  }

  // Fetch libretto
  if (!node.movements || node.movements.length === 0) {
    try {
      const data = await db.fetchLibretto(num);
      if (data.movements && data.movements.length > 0) {
        node.movements = data.movements;
        if (data.scoring) node.scoring = data.scoring;
        if (data.key && !node.key) node.key = data.key;
        node.features = db.deriveFeatures(data.movements);
        changed = true;
      }
    } catch (err) {
      console.error(`[enrich] BWV ${num} — libretto FAILED:`, err.message);
    }
  }

  // Key from static lookup
  const keys = db.getKeys();
  if (!node.key && keys[num]) {
    node.key = keys[num];
    changed = true;
  }

  // Re-derive features
  if (node.movements && node.movements.length > 0) {
    const fresh = db.deriveFeatures(node.movements);
    if (JSON.stringify(node.features) !== JSON.stringify(fresh)) {
      node.features = fresh;
      changed = true;
    }
  }

  // Wikipedia
  if (!node.wiki) {
    try {
      const wiki = await db.fetchWikiSummary(num, node.title);
      if (wiki) { node.wiki = wiki; changed = true; }
    } catch (err) {
      console.error(`[enrich] BWV ${num} — wiki FAILED:`, err.message);
    }
  }

  // Extract key from wiki
  if (!node.key && node.wiki && node.wiki.summary) {
    const keyMatch = node.wiki.summary.match(/\bin\s+([A-G](?:[♯♭#]|-?flat|-?sharp)?)\s*(major|minor)/i);
    if (keyMatch) {
      let note = keyMatch[1].replace(/-?flat/i, '♭').replace(/-?sharp/i, '♯').replace('#', '♯');
      node.key = note.charAt(0).toUpperCase() + note.slice(1) + ' ' + keyMatch[2].toLowerCase();
      changed = true;
    }
  }

  if (changed) db.saveNode(num, node);

  if (node.movements || node.wiki) {
    return res.json({ source: changed ? 'fetched' : 'cache', node });
  }
  return res.status(404).json({ error: 'Could not enrich — no data found' });
});

app.get('/api/cantata/:num/performances', async (req, res) => {
  const num = req.params.num.replace(/^BWV\s*/i, '');
  let node = db.getNode(num);
  if (!node) return res.status(404).json({ error: `BWV ${num} not found` });

  if (node.performances) return res.json({ performances: node.performances });

  try {
    const performances = await db.fetchYouTubePerformances(num, node.title);
    if (performances && performances.length > 0) {
      node.performances = performances;
      db.saveNode(num, node);
      return res.json({ performances });
    }
  } catch (err) {
    console.error(`[performances] BWV ${num} — FAILED:`, err.message);
  }
  return res.json({ performances: [] });
});

// --- Readings ---

app.get('/api/reading/:occasion', async (req, res) => {
  const occasion = decodeURIComponent(req.params.occasion);
  const readings = db.getReadings();
  const entry = readings[occasion];
  if (!entry) return res.status(404).json({ error: `No reading for "${occasion}"` });

  try {
    const [gospelResult, epistleResult] = await Promise.all([
      db.fetchReading(entry.gospel),
      entry.epistle ? db.fetchReading(entry.epistle) : Promise.resolve(null)
    ]);
    const result = {
      occasion,
      gospel: { ref: entry.gospel, ...gospelResult },
      epistle: entry.epistle ? { ref: entry.epistle, ...epistleResult } : null
    };
    res.json(result);
  } catch (err) {
    console.error(`[reading] ${occasion}: failed:`, err.message);
    res.status(500).json({ error: 'Failed to fetch reading' });
  }
});

// --- Calendar ---

app.get('/api/calendar/:year', (req, res) => {
  const year = parseInt(req.params.year);
  if (isNaN(year) || year < 1700 || year > 2100) {
    return res.status(400).json({ error: 'Year must be between 1700 and 2100' });
  }
  try {
    const index = db.getIndex();
    const events = generateCalendarEvents(year, index);
    res.json({ year, events });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate calendar', detail: err.message });
  }
});

app.get('/api/calendar/:year/ics', (req, res) => {
  const year = parseInt(req.params.year);
  if (isNaN(year) || year < 1700 || year > 2100) {
    return res.status(400).json({ error: 'Year must be between 1700 and 2100' });
  }
  try {
    const index = db.getIndex();
    const events = generateCalendarEvents(year, index);
    const ics = generateICS(year, events);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="bach-cantatas-${year}.ics"`);
    res.send(ics);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate ICS', detail: err.message });
  }
});

// --- Votes ---

app.get('/api/votes', (req, res) => {
  const userId = req.query.user || 'local';
  res.json(db.getVotes(userId));
});

app.post('/api/votes', (req, res) => {
  const userId = req.body.user || 'local';
  const { occasion, bwv, state } = req.body;
  if (!occasion || !bwv || state === undefined) {
    return res.status(400).json({ error: 'occasion, bwv, and state required' });
  }
  db.setVote(userId, occasion, bwv, state);
  res.json({ ok: true });
});

app.post('/api/votes/import', (req, res) => {
  const userId = req.body.user || 'local';
  const { votes } = req.body;
  if (!votes || typeof votes !== 'object') {
    return res.status(400).json({ error: 'votes object required' });
  }
  db.importVotes(userId, votes);
  res.json({ ok: true, count: Object.keys(votes).length });
});

// --- SPA catch-all ---

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'app', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Bach Cantatas app running at http://localhost:${PORT}`);
});
