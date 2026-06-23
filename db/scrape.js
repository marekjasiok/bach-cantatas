/**
 * External data fetching — libretto, Wikipedia, YouTube, Bible Gateway.
 * Pure functions that fetch and parse; no file I/O or state.
 */

const store = require('./store');

// --- Libretto (U Alberta) ---

async function fetchLibretto(bwv) {
  const url = `https://sites.ualberta.ca/~wfb/cantatas/${bwv}.html`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} from ${url}`);
  const html = await resp.text();
  return parseUAlberta(html);
}

function parseUAlberta(html) {
  const result = { movements: [], scoring: null, key: null };

  const keyRegex = /\bin\s+([A-G](?:[♯♭#]|\-?flat|\-?sharp)?)\s*(major|minor)/i;
  const titleMatch = html.match(keyRegex);
  if (titleMatch) {
    let note = titleMatch[1].replace(/\-?flat/i, '♭').replace(/\-?sharp/i, '♯').replace('#', '♯');
    result.key = note.charAt(0).toUpperCase() + note.slice(1) + ' ' + titleMatch[2].toLowerCase();
  }

  const strip = s => (s || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&auml;/g, 'ä').replace(/&ouml;/g, 'ö').replace(/&uuml;/g, 'ü')
    .replace(/&Auml;/g, 'Ä').replace(/&Ouml;/g, 'Ö').replace(/&Uuml;/g, 'Ü')
    .replace(/&szlig;/g, 'ß')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&\w+;/g, '')
    .trim();

  const getInstruments = cell => {
    const emMatch = cell.match(/<em[^>]*>([\s\S]*?)<\/em>/i);
    return emMatch ? strip(emMatch[1]) : '';
  };

  const rows = html.split(/<tr[^>]*>/i).slice(1);

  for (const row of rows) {
    const rowHtml = row.split(/<\/tr>/i)[0] || '';
    const cellParts = rowHtml.split(/<td[^>]*>/i).slice(1);
    const cells = cellParts.map(c => {
      const end = c.search(/<\/td>/i);
      return end >= 0 ? c.substring(0, end) : c;
    });

    if (cells.length < 2) continue;

    const leftRaw = cells[0];
    const leftText = strip(leftRaw);
    const rightText = strip(cells[1]);

    const mvtMatch = leftText.match(/^(\d+)\.\s*(Coro|Choral[e]?|Chorus|Aria|Recitativ\w*|Duetto?|Sinfonia|Sinfonie|Arioso|Versus|Sonatina|Terzetto|Cavatina)\s*(.*)/i);
    if (mvtMatch) {
      const num = parseInt(mvtMatch[1]);
      const type = normalizeGermanType(mvtMatch[2]);
      const voicePart = mvtMatch[3].trim();
      const instruments = getInstruments(leftRaw);

      let voices = '';
      if (voicePart) {
        const voiceMatch = voicePart.match(/^([SATB,\s]+)/);
        voices = voiceMatch ? voiceMatch[1].trim().replace(/\s+/g, ', ') : '';
      }
      if (!voices && /^(Coro|Choral)/i.test(mvtMatch[2])) voices = 'SATB';

      const textLines = rightText.split('\n').map(l => l.trim()).filter(l => l);

      result.movements.push({
        num,
        type,
        voices,
        instruments: instruments || '',
        de: textLines.join('\n')
      });
      continue;
    }

    if (leftText === 'Besetzung') {
      result.scoring = rightText;
    }
  }

  return result;
}

function normalizeGermanType(raw) {
  const t = raw.toLowerCase().split(/[\s(]/)[0];
  if (t.startsWith('coro') || t === 'chorus') return 'Chorus';
  if (t.startsWith('choral')) return 'Chorale';
  if (t.startsWith('ari')) return 'Aria';
  if (t.startsWith('recitativ')) return 'Recitative';
  if (t.startsWith('duet')) return 'Duet';
  if (t.startsWith('sinf') || t === 'sonatina') return 'Sinfonia';
  if (t === 'versus') return 'Versus';
  if (t === 'terzetto') return 'Terzetto';
  if (t === 'cavatina') return 'Cavatina';
  return raw.split(/[\s(]/)[0];
}

// --- Feature derivation ---

function deriveFeatures(movements) {
  if (!movements || movements.length === 0) return null;
  const instruments = store.getInstruments();
  const structure = movements.map(m => m.type);
  const voiceProfile = {};
  const rawInstruments = new Set();

  for (const m of movements) {
    if (m.voices) {
      const key = m.voices.replace(/,\s*/g, ', ');
      voiceProfile[key] = (voiceProfile[key] || 0) + 1;
    }
    if (m.instruments) {
      for (const inst of m.instruments.split(/,\s*/)) {
        if (inst.trim()) rawInstruments.add(inst.trim().toLowerCase());
      }
    }
  }

  const families = new Set();
  for (const inst of rawInstruments) {
    for (const [familyKey, familyDef] of Object.entries(instruments)) {
      if (new RegExp(familyDef.pattern, 'i').test(inst)) families.add(familyKey);
    }
  }

  return {
    structure,
    opening: structure[0],
    closing: structure[structure.length - 1],
    voice_profile: voiceProfile,
    instrumentation_families: [...families].sort()
  };
}

// --- Wikipedia ---

async function fetchWikiSummary(bwv, title) {
  const pageNames = [
    title ? `${title.replace(/\s+/g, '_')},_BWV_${bwv}` : null,
    `${title ? title.replace(/\s+/g, '_') : 'Cantata'},_BWV_${bwv}_(Bach)`,
    `BWV_${bwv}`
  ].filter(Boolean);

  for (const pageName of pageNames) {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageName)}`;
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const data = await resp.json();

      if (data.type === 'disambiguation') continue;
      if (!data.extract) continue;

      const result = {
        summary: data.extract,
        image: data.thumbnail ? data.thumbnail.source : (data.originalimage ? data.originalimage.source : null),
        url: data.content_urls ? data.content_urls.desktop.page : null
      };

      if (data.extract_html) {
        result.summary_html = data.extract_html;
      }

      return result;
    } catch {
      continue;
    }
  }

  return null;
}

// --- YouTube ---

function parsePerformanceInfo(videoTitle, channel, description) {
  const combined = `${videoTitle}\n${description}`;

  const fullDateMatch = combined.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(19[5-9]\d|20[0-2]\d)/i);
  const monthYearMatch = !fullDateMatch && combined.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(19[5-9]\d|20[0-2]\d)/i);
  const yearMatch = combined.match(/\b(19[5-9]\d|20[0-2]\d)\b/);
  const year = fullDateMatch
    ? `${fullDateMatch[1]} ${fullDateMatch[2]} ${fullDateMatch[3]}`
    : monthYearMatch
      ? `${monthYearMatch[1]} ${monthYearMatch[2]}`
      : (yearMatch ? yearMatch[1] : '');

  let place = '';
  const atPlace = description.match(/(?:at|in)\s+(?:the\s+)?([A-Z][a-zA-Zé\s]+?)(?:,|\.|$|\n)/m);
  if (atPlace) {
    const candidate = atPlace[1].trim();
    if (!/^(Bach|Cantata|Jesus|Christ|God|Lord|Church of)/i.test(candidate) && candidate.length < 40) {
      place = candidate;
    }
  }
  if (!place) {
    const knownPlaces = combined.match(/(?:Leipzig|Berlin|Amsterdam|Tokyo|London|Paris|Vienna|Zürich|Basel|Stuttgart|Hamburg|Dresden|Munich|Cologne|Utrecht|Melbourne|Sydney|New York|Boston|Haarlem|Rotterdam|Groningen|Naarden|Antwerp|Brussels|Salzburg|Weimar|Eisenach|Lübeck|Frankfurt|Freiburg|Heidelberg|Montréal|Toronto|Chicago|Philadelphia|Washington|Seoul|São Paulo|TivoliVredenburg|Thomaskirche|Herderkirche|Gewandhaus)/i);
    place = knownPlaces ? knownPlaces[0] : '';
  }

  const conductors = combined.match(/(?:Gardiner|Harnoncourt|Suzuki|Herreweghe|Koopman|Rilling|Richter|Leonhardt|Lutz|Kuijken|Jacobs|Pinnock|Münchinger|Rademann|Veldhoven|Van Veldhoven|Masaaki)/i);
  const performer = conductors ? conductors[0] : channel;

  return { performer, place, year };
}

async function fetchVideoDescription(videoId) {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    });
    if (!resp.ok) return '';
    const html = await resp.text();
    const match = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
    if (match) {
      return match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    return '';
  } catch {
    return '';
  }
}

async function fetchYouTubePerformances(bwv, title) {
  const query = `Bach BWV ${bwv} cantata`;
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

  const resp = await fetch(searchUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
  });
  if (!resp.ok) return null;
  const html = await resp.text();

  const dataMatch = html.match(/var ytInitialData\s*=\s*({.*?});<\/script>/s);
  if (!dataMatch) return null;

  try {
    const data = JSON.parse(dataMatch[1]);
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;

    if (!contents) return null;

    const videoItems = [];
    for (const item of contents) {
      const video = item.videoRenderer;
      if (!video) continue;
      if (videoItems.length >= 15) break;
      videoItems.push({
        id: video.videoId,
        title: video.title?.runs?.map(r => r.text).join('') || '',
        channel: video.ownerText?.runs?.[0]?.text || '',
        duration: video.lengthText?.simpleText || ''
      });
    }

    if (videoItems.length === 0) return null;

    const videos = await Promise.all(videoItems.map(async (v) => {
      const description = await fetchVideoDescription(v.id);
      const { performer, place, year } = parsePerformanceInfo(v.title, v.channel, description);
      return {
        id: v.id,
        title: v.title,
        channel: v.channel,
        performer,
        place,
        year,
        duration: v.duration,
        thumbnail: `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${v.id}`
      };
    }));

    return videos;
  } catch (err) {
    console.error(`[YouTube] BWV ${bwv}: parse error:`, err.message);
    return null;
  }
}

// --- Bible Gateway ---

async function fetchReading(gospel) {
  const search = encodeURIComponent(gospel);
  const headers = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' };
  const result = { gospel };

  const [resp1545, resp1912] = await Promise.all([
    fetch(`https://www.biblegateway.com/passage/?search=${search}&version=LUTH1545`, { headers }),
    fetch(`https://www.biblegateway.com/passage/?search=${search}&version=SCH2000`, { headers })
  ]);

  if (resp1545.ok) {
    result.de = parseBibleGateway(await resp1545.text(), gospel);
  }
  if (resp1912.ok) {
    const htmlLut = await resp1912.text();
    const headingMatch = htmlLut.match(/<h3[^>]*>\s*<span[^>]*class="text[^"]*"[^>]*>([\s\S]*?)<\/span>\s*<\/h3>/);
    if (headingMatch) result.heading = headingMatch[1].replace(/<[^>]+>/g, '').trim();
    result.de_modern = parseBibleGateway(htmlLut, gospel);
  }

  // KJV from bible-api.com
  try {
    const resp = await fetch(`https://bible-api.com/${encodeURIComponent(gospel)}?translation=kjv`);
    if (resp.ok) {
      const data = await resp.json();
      if (data.verses && data.verses.length) {
        result.en = data.verses.map(v => `<span class="verse-num">${v.verse}</span>${v.text.trim()}`).join(' ');
      } else {
        result.en = data.text || '';
      }
    }
  } catch {}

  result.biblegateway_de = `https://www.biblegateway.com/passage/?search=${search}&version=LUTH1545`;
  result.biblegateway_en = `https://www.biblegateway.com/passage/?search=${search}&version=KJV`;
  return result;
}

function parseBibleGateway(html, reference) {
  const refMatch = reference && reference.match(/(\d+):(\d+)(?:-(\d+))?/);
  const chapter = refMatch ? parseInt(refMatch[1]) : null;
  const startVerse = refMatch ? parseInt(refMatch[2]) : 1;
  const endVerse = refMatch && refMatch[3] ? parseInt(refMatch[3]) : 99;

  const openRegex = /<span[^>]*class="text\s+[^"]*?-(\d+)-(\d+)"[^>]*>/g;
  const positions = [];
  let m;
  while ((m = openRegex.exec(html)) !== null) {
    const lookback = html.substring(Math.max(0, m.index - 200), m.index);
    if (lookback.lastIndexOf('<h3') > lookback.lastIndexOf('</h3')) continue;
    positions.push({ tagStart: m.index, contentStart: m.index + m[0].length, ch: parseInt(m[1]), v: parseInt(m[2]) });
  }

  const chunks = [];
  for (let i = 0; i < positions.length; i++) {
    const { ch: vCh, v: vNum, contentStart } = positions[i];
    if (chapter && vCh !== chapter) continue;
    if (vNum < startVerse || vNum > endVerse) continue;

    const end = (i + 1 < positions.length) ? positions[i + 1].tagStart : contentStart + 2000;
    let text = html.substring(contentStart, end);
    const cut = text.search(/<\/div>|class="footnotes"|Read full chapter|class="full-chap-link"/);
    if (cut > 0) text = text.substring(0, cut);

    text = text.replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/g, '');
    text = text.replace(/<span[^>]*class="heading"[^>]*>[\s\S]*?<\/span>/g, '');
    text = text.replace(/<sup[^>]*class="(footnote|crossreference)"[^>]*>[\s\S]*?<\/sup>/g, '');
    text = text.replace(/<sup[^>]*class="versenum"[^>]*>\s*(\d+)\s*<\/sup>/g, '{{v$1}}');
    text = text.replace(/<span[^>]*class="chapternum"[^>]*>[\s\S]*?<\/span>/g, '');
    text = text.replace(/<[^>]+>/g, '');
    text = text.replace(/\{\{v(\d+)\}\}/g, '<span class="verse-num">$1</span>');
    text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
    text = text.replace(/&auml;/g, 'ä').replace(/&ouml;/g, 'ö').replace(/&uuml;/g, 'ü');
    text = text.replace(/&Auml;/g, 'Ä').replace(/&Ouml;/g, 'Ö').replace(/&Uuml;/g, 'Ü');
    text = text.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
    text = text.replace(/&\w+;/g, '');
    text = text.replace(/\s+/g, ' ').trim();
    if (text) chunks.push(text);
  }

  return chunks.join(' ');
}

module.exports = {
  fetchLibretto,
  deriveFeatures,
  fetchWikiSummary,
  fetchYouTubePerformances,
  fetchReading,
};
