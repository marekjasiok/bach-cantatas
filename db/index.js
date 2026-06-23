/**
 * Bach Cantatas — Data Access Layer
 *
 * Public API contract. All server code imports from here.
 * To swap backends, replace ./store.js with a new implementation.
 */

const store = require('./store');
const scrape = require('./scrape');

module.exports = { ...store, ...scrape };
