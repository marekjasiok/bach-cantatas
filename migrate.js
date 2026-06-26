#!/usr/bin/env node
// Migrate cantatas_full_list.md + libretti.json → data/nodes/*.yaml + data/index.yaml

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Convert "Jun 20, 1723" or "1713" to ISO "1723-06-20" or "1713"
// Returns null for approximate dates like "c. 1707–1708"
function toISODate(raw) {
  // Full date: "Mar 25, 1714", "Feb 7, 1723"
  const fullMatch = raw.match(/^([A-Z][a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (fullMatch) {
    const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
                     Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
    const m = months[fullMatch[1]];
    if (m) return `${fullMatch[3]}-${m}-${String(fullMatch[2]).padStart(2, '0')}`;
  }
  // Year only: "1713", "1730"
  const yearOnly = raw.match(/^(\d{4})$/);
  if (yearOnly) return yearOnly[1];
  // Approximate — return null, keep raw
  return null;
}

const MD_PATH = path.join(__dirname, 'cantatas_full_list.md');
const LIBRETTI_PATH = path.join(__dirname, 'app', 'libretti.json');
const NODES_DIR = path.join(__dirname, 'data', 'nodes');
const INDEX_PATH = path.join(__dirname, 'data', 'index.yaml');

// Parse catalogue from markdown
function parseCatalogue(md) {
  const entries = [];
  let currentCycle = '';

  const cycleMap = {
    'Pre-Leipzig': 'EARLY',
    'Cycle 1': 'C1',
    'Cycle 2': 'C2',
    'Cycle 3': 'C3',
    'Picander': 'PICANDER',
    'Late Works': 'LATE'
  };

  for (const line of md.split('\n')) {
    // Detect section headers
    const headerMatch = line.match(/^###\s+.*?(Pre-Leipzig|Cycle 1|Cycle 2|Cycle 3|Picander|Late Works)/i);
    if (headerMatch) {
      for (const [key, val] of Object.entries(cycleMap)) {
        if (headerMatch[1].includes(key)) { currentCycle = val; break; }
      }
      continue;
    }

    // Parse table rows: | [BWV X](url) | _Title_ | Occasion | Date |
    const rowMatch = line.match(/\|\s*\[BWV\s+(\d+[a-z]?)\]\(([^)]+)\)\s*\|\s*_([^_]+)_\s*\|\s*([^|]+)\|\s*([^|]+)\|/);
    if (rowMatch) {
      const rawDate = rowMatch[5].trim();
      entries.push({
        bwv: rowMatch[1],
        num: rowMatch[1],
        url: rowMatch[2],
        title: rowMatch[3].trim(),
        occasion: rowMatch[4].trim(),
        date: toISODate(rawDate) || rawDate,
        cycle: currentCycle
      });
    }
  }
  return entries;
}

// Load libretti
function loadLibretti() {
  try {
    return JSON.parse(fs.readFileSync(LIBRETTI_PATH, 'utf8'));
  } catch { return {}; }
}

// Derive basic features from movements
function deriveFeatures(movements) {
  if (!movements || movements.length === 0) return null;

  const structure = movements.map(m => m.type);
  const opening = structure[0] || null;
  const closing = structure[structure.length - 1] || null;

  // Voice profile: count movements per voice type
  const voiceProfile = {};
  for (const m of movements) {
    if (m.voices) {
      const key = m.voices.replace(/,\s*/g, ', ');
      voiceProfile[key] = (voiceProfile[key] || 0) + 1;
    }
  }

  // Collect instruments
  const instruments = new Set();
  for (const m of movements) {
    if (m.instruments) {
      // Split on comma but keep "I/II" together
      for (const inst of m.instruments.split(/,\s*/)) {
        const clean = inst.trim().toLowerCase();
        if (clean) instruments.add(clean);
      }
    }
  }

  // Instrumentation families
  const families = new Set();
  for (const inst of instruments) {
    if (/violin|viola|violoncell|archi|string/i.test(inst)) families.add('strings');
    if (/oboe|taille/i.test(inst)) families.add('double_reeds');
    if (/flauto|traverso|recorder/i.test(inst)) families.add('flutes');
    if (/tromba|clarino|corno/i.test(inst)) families.add('brass');
    if (/timpani/i.test(inst)) families.add('percussion');
    if (/continuo|organo|cembalo|fagotto/i.test(inst)) families.add('continuo');
  }

  return {
    structure,
    opening,
    closing,
    voice_profile: voiceProfile,
    instrumentation_families: [...families].sort()
  };
}

// Main
function main() {
  const md = fs.readFileSync(MD_PATH, 'utf8');
  const catalogue = parseCatalogue(md);
  const libretti = loadLibretti();

  // Ensure output dirs
  fs.mkdirSync(NODES_DIR, { recursive: true });

  const index = [];

  for (const entry of catalogue) {
    const key = 'BWV ' + entry.bwv;
    const libretto = libretti[key];
    const movements = libretto ? libretto.movements : null;
    const features = deriveFeatures(movements);

    const node = {
      bwv: entry.bwv,
      title: entry.title,
      cycle: entry.cycle,
      occasion: entry.occasion,
      date: entry.date,
      url: entry.url
    };

    if (movements) {
      // Clean movements for YAML (remove instruments from text if it got mixed in)
      node.movements = movements.map(m => {
        const mvt = { num: m.num, type: m.type, voices: m.voices };
        if (m.instruments) mvt.instruments = m.instruments;
        if (m.de) mvt.de = m.de;
        return mvt;
      });
    }

    if (features) {
      node.features = features;
    }

    // Placeholder for edges (computed in a second pass)
    node.edges = {};

    // Write YAML
    const yamlStr = yaml.dump(node, {
      lineWidth: 120,
      noRefs: true,
      quotingType: '"',
      forceQuotes: false
    });
    const filename = entry.num + '.yaml';
    fs.writeFileSync(path.join(NODES_DIR, filename), yamlStr, 'utf8');

    // Index entry (lightweight)
    index.push({
      bwv: entry.bwv,
      title: entry.title,
      cycle: entry.cycle,
      occasion: entry.occasion,
      date: entry.date
    });
  }

  // Write index
  fs.writeFileSync(INDEX_PATH, yaml.dump(index, { lineWidth: 120, noRefs: true, quotingType: '"' }), 'utf8');

  console.log(`Migrated ${catalogue.length} cantatas → ${NODES_DIR}`);
  console.log(`Index written → ${INDEX_PATH}`);
}

main();
