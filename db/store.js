/**
 * Data store — file-based reference data + SQLite for user state.
 * This module is the current implementation. To swap backends,
 * rewrite this file keeping the same exported interface.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const Database = require('better-sqlite3');

// --- Paths ---
const DATA_DIR = path.join(__dirname, '..', 'data');
const NODES_DIR = path.join(DATA_DIR, 'nodes');
const INDEX_PATH = path.join(DATA_DIR, 'index.yaml');
const CYCLES_PATH = path.join(DATA_DIR, 'cycles.yaml');
const INSTRUMENTS_PATH = path.join(DATA_DIR, 'instruments.yaml');
const KEYS_PATH = path.join(DATA_DIR, 'keys.yaml');
const READINGS_PATH = path.join(DATA_DIR, 'readings.yaml');
const OCCASIONS_PATH = path.join(DATA_DIR, 'occasions.yaml');
const TRANSLATIONS_PATH = path.join(DATA_DIR, 'translations.yaml');
const LITURGICAL_ORDER_PATH = path.join(DATA_DIR, 'liturgical-order.yaml');
const DB_PATH = path.join(__dirname, 'bach.db');

// --- SQLite init ---
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS votes (
    user_id TEXT NOT NULL DEFAULT 'local',
    occasion TEXT NOT NULL,
    bwv TEXT NOT NULL,
    state INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, occasion, bwv)
  )
`);

// --- Reference data (read-only) ---

function getCycles() {
  return yaml.load(fs.readFileSync(CYCLES_PATH, 'utf8'));
}

function getInstruments() {
  const raw = yaml.load(fs.readFileSync(INSTRUMENTS_PATH, 'utf8'));
  return raw.families || raw;
}

function getIndex() {
  return yaml.load(fs.readFileSync(INDEX_PATH, 'utf8'));
}

function getKeys() {
  return fs.existsSync(KEYS_PATH) ? yaml.load(fs.readFileSync(KEYS_PATH, 'utf8')) : {};
}

function getReadings() {
  return fs.existsSync(READINGS_PATH) ? yaml.load(fs.readFileSync(READINGS_PATH, 'utf8')) : {};
}

function getOccasions() {
  return fs.existsSync(OCCASIONS_PATH) ? yaml.load(fs.readFileSync(OCCASIONS_PATH, 'utf8')) : {};
}

function getTranslations() {
  return fs.existsSync(TRANSLATIONS_PATH) ? yaml.load(fs.readFileSync(TRANSLATIONS_PATH, 'utf8')) : {};
}

function getLiturgicalOrder() {
  return fs.existsSync(LITURGICAL_ORDER_PATH) ? yaml.load(fs.readFileSync(LITURGICAL_ORDER_PATH, 'utf8')) : {};
}

// --- Nodes (cantata enriched data) ---

function getNode(bwv) {
  const filePath = path.join(NODES_DIR, bwv + '.yaml');
  if (!fs.existsSync(filePath)) return null;
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

function saveNode(bwv, node) {
  const filePath = path.join(NODES_DIR, bwv + '.yaml');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, yaml.dump(node, { lineWidth: 120, noRefs: true }), 'utf8');
}

// --- Votes (user state) ---

const stmtGet = db.prepare('SELECT occasion, bwv, state FROM votes WHERE user_id = ?');
const stmtSet = db.prepare(`
  INSERT INTO votes (user_id, occasion, bwv, state, updated_at)
  VALUES (?, ?, ?, ?, datetime('now'))
  ON CONFLICT(user_id, occasion, bwv)
  DO UPDATE SET state = excluded.state, updated_at = datetime('now')
`);
const stmtDelete = db.prepare('DELETE FROM votes WHERE user_id = ? AND occasion = ? AND bwv = ?');

function getVotes(userId = 'local') {
  const rows = stmtGet.all(userId);
  const result = {};
  for (const r of rows) result[r.occasion + '|' + r.bwv] = r.state;
  return result;
}

function setVote(userId = 'local', occasion, bwv, state) {
  if (state === 0) {
    stmtDelete.run(userId, occasion, bwv);
  } else {
    stmtSet.run(userId, occasion, bwv, state);
  }
}

function importVotes(userId = 'local', votes) {
  const tx = db.transaction((entries) => {
    for (const [key, state] of entries) {
      const [occasion, bwv] = key.split('|');
      if (!occasion || !bwv) continue;
      if (state === 0) stmtDelete.run(userId, occasion, bwv);
      else stmtSet.run(userId, occasion, bwv, state);
    }
  });
  tx(Object.entries(votes));
}

module.exports = {
  // Reference data
  getCycles,
  getInstruments,
  getIndex,
  getKeys,
  getReadings,
  getOccasions,
  getTranslations,
  getLiturgicalOrder,
  // Nodes
  getNode,
  saveNode,
  // Votes
  getVotes,
  setVote,
  importVotes,
};
