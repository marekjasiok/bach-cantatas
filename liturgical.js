// Compute liturgical calendar dates for any year
// Based on the Western (Lutheran) liturgical calendar as used in Bach's Leipzig

// Easter: Anonymous Gregorian algorithm (Computus)
function easter(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// Helper: add days to a date
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// Helper: find Sunday on or after a date
function sundayOnOrAfter(date) {
  const d = new Date(date);
  const day = d.getDay();
  if (day !== 0) d.setDate(d.getDate() + (7 - day));
  return d;
}

// Helper: find Sunday before a date
function sundayBefore(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 7 : day));
  return d;
}

// Advent I: 4th Sunday before Christmas (Sunday nearest Nov 30)
function adventI(year) {
  const christmas = new Date(year, 11, 25);
  const dayOfWeek = christmas.getDay();
  // Sunday before Christmas
  const sun4 = new Date(year, 11, 25 - dayOfWeek - 21);
  return sun4;
}

// Compute all liturgical occasion dates for a given year
// Returns: { "Occasion Name": Date, ... }
function computeLiturgicalYear(year) {
  const dates = {};
  const e = easter(year);

  // === Fixed feasts ===
  dates['New Year'] = new Date(year, 0, 1);
  dates['Epiphany'] = new Date(year, 0, 6);
  dates['Purification'] = new Date(year, 1, 2);       // Candlemas, Feb 2
  dates['Annunciation'] = new Date(year, 2, 25);      // Mar 25
  dates['St. John\'s'] = new Date(year, 5, 24);       // Jun 24
  dates['Visitation'] = new Date(year, 6, 2);         // Jul 2 (old calendar)
  dates['St. Michael\'s'] = new Date(year, 8, 29);    // Sep 29
  dates['Reformation'] = new Date(year, 9, 31);       // Oct 31
  dates['Christmas'] = new Date(year, 11, 25);
  dates['Christmas Day'] = new Date(year, 11, 25);
  dates['Christmas 2'] = new Date(year, 11, 26);
  dates['Christmas 3'] = new Date(year, 11, 27);

  // Christmas I = first Sunday after Christmas
  const christmasSun = sundayOnOrAfter(new Date(year, 11, 26));
  if (christmasSun.getFullYear() === year) dates['Christmas I'] = christmasSun;

  // === Easter-dependent movable feasts ===
  dates['Septuagesima'] = addDays(e, -63);
  dates['Sexagesima'] = addDays(e, -56);
  dates['Estomihi'] = addDays(e, -49);
  // Lent Sundays
  dates['Invocavit'] = addDays(e, -42);
  dates['Reminiscere'] = addDays(e, -35);
  dates['Oculi'] = addDays(e, -28);
  dates['Laetare'] = addDays(e, -21);
  dates['Judica'] = addDays(e, -14);
  dates['Palm Sunday'] = addDays(e, -7);
  dates['Palm Sun.'] = addDays(e, -7);
  dates['Good Friday'] = addDays(e, -2);

  // Easter
  dates['Easter Sunday'] = e;
  dates['Easter Mon.'] = addDays(e, 1);
  dates['Easter Monday'] = addDays(e, 1);
  dates['Easter Tue.'] = addDays(e, 2);
  dates['Easter Tuesday'] = addDays(e, 2);

  // Sundays after Easter (Quasimodogeniti through Exaudi)
  dates['Easter I'] = addDays(e, 7);    // Quasimodogeniti
  dates['Easter II'] = addDays(e, 14);   // Misericordias Domini
  dates['Easter III'] = addDays(e, 21);  // Jubilate
  dates['Jubilate'] = addDays(e, 21);
  dates['Easter IV'] = addDays(e, 28);   // Cantate
  dates['Easter V'] = addDays(e, 35);    // Rogate

  dates['Ascension'] = addDays(e, 39);
  dates['Ascension I'] = addDays(e, 42); // Exaudi (Sunday after Ascension)

  dates['Pentecost'] = addDays(e, 49);
  dates['Pentecost Sunday'] = addDays(e, 49);
  dates['Pentecost 2'] = addDays(e, 50);
  dates['Pentecost 3'] = addDays(e, 51);

  // Trinity Sunday and Sundays after Trinity
  dates['Trinity'] = addDays(e, 56);
  dates['Trinity Sunday'] = addDays(e, 56);
  for (let i = 1; i <= 27; i++) {
    const roman = toRoman(i);
    dates[`Trinity ${roman}`] = addDays(e, 56 + 7 * i);
  }

  // === Epiphany Sundays (between Epiphany and Septuagesima) ===
  const epiphany = new Date(year, 0, 6);
  const septuagesima = dates['Septuagesima'];
  let epSun = sundayOnOrAfter(new Date(year, 0, 7));
  let epCount = 1;
  while (epSun < septuagesima) {
    const roman = toRoman(epCount);
    dates[`Epiphany ${roman}`] = new Date(epSun);
    epSun = addDays(epSun, 7);
    epCount++;
  }

  // New Year I = first Sunday after New Year
  const nySun = sundayOnOrAfter(new Date(year, 0, 2));
  if (nySun < epiphany) dates['New Year I'] = nySun;

  // === Advent ===
  const advI = adventI(year);
  dates['Advent I'] = advI;
  dates['Advent II'] = addDays(advI, 7);
  dates['Advent III'] = addDays(advI, 14);
  dates['Advent IV'] = addDays(advI, 21);

  // === Civic occasions ===
  // Ratswahl (council inauguration): first Monday after St. Bartholomew's Day (Aug 24)
  const bartholomew = new Date(year, 7, 24);
  const bartDay = bartholomew.getDay(); // 0=Sun, 1=Mon, ...
  const daysToMon = bartDay === 0 ? 1 : (8 - bartDay);
  dates['Ratswahl'] = new Date(year, 7, 24 + daysToMon);

  // Funeral, Wedding, Unknown — no calendar entries

  return dates;
}

// Roman numeral helper (1-27)
function toRoman(n) {
  const vals = [['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]];
  let result = '';
  let remaining = n;
  for (const [sym, val] of vals) {
    while (remaining >= val) {
      result += sym;
      remaining -= val;
    }
  }
  return result;
}

// Generate calendar events for a year
// Takes: year, index (array of cantata metadata)
// Returns: array of { date, occasion, cantatas: [{bwv, num, title, cycle}] }
function generateCalendarEvents(year, index) {
  const dates = computeLiturgicalYear(year);
  const occasionGroups = {};

  for (const cantata of index) {
    const occasion = cantata.occasion;
    if (!occasion || occasion === 'Unknown' || occasion === 'Funeral' || occasion === 'Wedding') continue;

    // Normalize occasion name for lookup
    let lookupKey = occasion
      .replace('Easter/Purif.', 'Purification')
      .replace(/\s*\(\*\*.*?\*\*\)/, '')
      .trim();

    if (!dates[lookupKey]) continue;

    if (!occasionGroups[lookupKey]) {
      occasionGroups[lookupKey] = {
        date: dates[lookupKey],
        occasion: lookupKey,
        cantatas: []
      };
    }
    const entry = { bwv: cantata.bwv, title: cantata.title, cycle: cantata.cycle };
    if (cantata.major) entry.major = true;
    occasionGroups[lookupKey].cantatas.push(entry);
  }

  // Sort by date
  return Object.values(occasionGroups).sort((a, b) => a.date - b.date);
}

// Generate ICS string
function generateICS(year, events) {
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  let ics = `BEGIN:VCALENDAR
PRODID:-//Bach Cantatas App//EN
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Bach Cantatas ${year}
X-WR-TIMEZONE:Europe/Berlin
X-WR-CALDESC:J.S. Bach: Sacred Cantatas mapped to the ${year} liturgical calendar
`;

  for (const ev of events) {
    const d = ev.date;
    const dtStart = formatICSDate(d);
    const dtEnd = formatICSDate(d, 2);
    const uid = `bach-${year}-${ev.occasion.replace(/[^a-z0-9]/gi, '')}@cantatas.app`;

    // Build description: group by cycle
    const byCycle = {};
    for (const c of ev.cantatas) {
      const label = c.cycle || 'MISC';
      if (!byCycle[label]) byCycle[label] = [];
      byCycle[label].push(`BWV ${c.bwv} (https://en.wikipedia.org/wiki/BWV_${c.bwv})`);
    }
    const desc = Object.entries(byCycle)
      .map(([cycle, items]) => `${cycle}: ${items.join(', ')}`)
      .join('\\n');

    ics += `BEGIN:VEVENT
DTSTART:${dtStart}
DTEND:${dtEnd}
DTSTAMP:${now}
UID:${uid}
CREATED:${now}
DESCRIPTION:${foldLine(desc)}
LAST-MODIFIED:${now}
SEQUENCE:0
STATUS:CONFIRMED
SUMMARY:${ev.occasion}
TRANSP:OPAQUE
BEGIN:VALARM
ACTION:DISPLAY
TRIGGER:P0D
DESCRIPTION:This is an event reminder
END:VALARM
END:VEVENT
`;
  }

  ics += 'END:VCALENDAR\n';
  return ics;
}

function formatICSDate(date, addHours = 0) {
  const d = new Date(date);
  d.setHours(10 + addHours, 0, 0);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
}

// ICS line folding (max 75 chars per line)
function foldLine(str) {
  // For DESCRIPTION, just escape newlines and return (simple approach)
  return str.replace(/\n/g, '\\n');
}

module.exports = { computeLiturgicalYear, generateCalendarEvents, generateICS, easter };
