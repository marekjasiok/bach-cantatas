# Das Kantatenwerk

A single-page app to listen to Bach's complete church cantatas following the rhythm of the Lutheran liturgical year.

## Concept

The best way to experience the *Kantatenwerk* is on the very day each cantata was composed for, Sunday by Sunday, through the church calendar as Bach intended. This app helps you do exactly that.

- **Listen** — Follow the liturgical calendar. Mark cantatas as heard, then like your favourites.
- **Explore** — Browse the full catalogue by cycle, occasion, key, or BWV number.
- **Like** — Track what you've listened to and what resonated.
- **Discover** — Get recommendations based on your taste profile.

## Stack

- **Frontend**: Vanilla JS single-page app (no framework)
- **Backend**: Express + SQLite (better-sqlite3) + YAML data nodes
- **Liturgical engine**: Custom computation of moveable feasts and fixed occasions
- **Data**: 200+ cantata nodes with metadata, libretto, scoring, and tags

## Running locally

```bash
npm install
npm start
```

The app serves at `http://localhost:3000`.

## Data model

Each cantata is a YAML node in `data/nodes/` containing BWV number, title, occasion, cycle, date, key, instrumentation families, opening form, and full libretto text.

The liturgical engine (`liturgical.js`) computes all Sundays and feast days for any given year based on the Easter algorithm, outputting a calendar of occasions with their assigned cantatas.

## Design

Typography: EB Garamond (display), Roboto (UI), UnifrakturMaguntia (masthead). Colour palette: Manuscript Red & Black. See `DESIGN-TOKENS.md` for the full token system.
