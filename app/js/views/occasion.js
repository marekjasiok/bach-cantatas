import { state } from '../state.js';
import { cantataCard } from '../components.js';

// Liturgical occasion descriptions
const occasionDescriptions = {
    'Advent I': 'First Sunday of Advent \u2014 the beginning of the church year, anticipating Christ\'s coming.',
    'Advent II': 'Second Sunday of Advent \u2014 reflection on the signs of the last days.',
    'Advent III': 'Third Sunday of Advent (Gaudete) \u2014 a Sunday of joy amid the penitential season.',
    'Advent IV': 'Fourth Sunday of Advent \u2014 the final preparation before Christmas.',
    'Christmas': 'The Feast of the Nativity \u2014 celebration of Christ\'s birth.',
    'Christmas Day': 'Christmas Day \u2014 the principal feast celebrating the Incarnation.',
    'Christmas 2': 'Second Day of Christmas (St. Stephen\'s Day) \u2014 honouring the first martyr.',
    'Christmas 3': 'Third Day of Christmas (St. John\'s Day) \u2014 honouring the beloved disciple.',
    'New Year': 'Feast of the Circumcision \u2014 the naming of Jesus, eight days after Christmas.',
    'Epiphany': 'The manifestation of Christ to the Gentiles \u2014 the visit of the Magi.',
    'Purification': 'Candlemas \u2014 the presentation of Christ at the Temple, 40 days after Christmas.',
    'Annunciation': 'The angel Gabriel announces to Mary that she will bear the Son of God.',
    'Septuagesima': 'Seventy days before Easter \u2014 the pre-Lenten season begins.',
    'Sexagesima': 'Sixty days before Easter \u2014 themes of the Word of God as seed.',
    'Estomihi': 'The Sunday before Ash Wednesday \u2014 the last Sunday before Lent.',
    'Invocavit': 'First Sunday of Lent \u2014 Christ\'s temptation in the wilderness.',
    'Reminiscere': 'Second Sunday of Lent \u2014 remembering God\'s mercy and compassion.',
    'Oculi': 'Third Sunday of Lent \u2014 "My eyes are ever toward the Lord."',
    'Laetare': 'Fourth Sunday of Lent \u2014 a day of rejoicing amid the Lenten fast.',
    'Judica': 'Fifth Sunday of Lent (Passion Sunday) \u2014 Christ\'s suffering draws near.',
    'Palm Sunday': 'The triumphal entry of Christ into Jerusalem \u2014 Holy Week begins.',
    'Good Friday': 'The Crucifixion of our Lord \u2014 the most solemn day of the church year. In Leipzig, the Passion was performed during Vespers.',
    'Easter Sunday': 'The Resurrection of our Lord \u2014 the most joyful feast of the church year.',
    'Easter Monday': 'The second day of Easter \u2014 continuing the celebration of the Resurrection.',
    'Easter Tuesday': 'The third day of Easter \u2014 the Emmaus road encounter.',
    'Easter I': 'Quasimodogeniti \u2014 "as newborn babes, desire the pure milk of the Word."',
    'Easter II': 'Misericordias Domini \u2014 "The earth is full of the goodness of the Lord."',
    'Easter III': 'Jubilate \u2014 "Make a joyful noise unto the Lord, all the earth."',
    'Easter IV': 'Cantate \u2014 "O sing unto the Lord a new song."',
    'Easter V': 'Rogate \u2014 the Sunday of prayer before Ascension.',
    'Ascension': 'Christ ascends to heaven forty days after Easter.',
    'Ascension I': 'Exaudi \u2014 the Sunday after Ascension, awaiting the Holy Spirit.',
    'Pentecost': 'The descent of the Holy Spirit upon the apostles \u2014 the birthday of the Church.',
    'Pentecost Sunday': 'The outpouring of the Holy Spirit \u2014 fifty days after Easter.',
    'Trinity': 'Trinity Sunday \u2014 celebrating the mystery of the Triune God.',
    'Trinity Sunday': 'The first Sunday after Pentecost \u2014 the fullness of God revealed.',
    'St. John\'s': 'Feast of St. John the Baptist (Jun 24) \u2014 the forerunner of Christ.',
    'Visitation': 'The Visitation of Mary to Elizabeth \u2014 "My soul magnifies the Lord."',
    'St. Michael\'s': 'Michaelmas \u2014 the feast of St. Michael and All Angels.',
    'Reformation': 'Reformation Day (Oct 31) \u2014 commemorating Luther\'s 95 Theses of 1517.',
    'Ratswahl': 'Council inauguration (Ratswechsel) \u2014 the annual ceremony installing Leipzig\'s new town council, held at the Nikolaikirche on the Monday after St. Bartholomew\'s Day.',
};

export function getOccasionDescription(occasion) {
    if (occasionDescriptions[occasion]) return occasionDescriptions[occasion];
    // Trinity Sundays
    const trinityMatch = occasion.match(/^Trinity\s+([IVXL]+)$/);
    if (trinityMatch) {
        const n = fromRoman(trinityMatch[1]);
        return `${n}${ordinalSuffix(n)} Sunday after Trinity \u2014 the long green season of the church year.`;
    }
    // Epiphany Sundays
    const epiphMatch = occasion.match(/^Epiphany\s+([IVXL]+)$/);
    if (epiphMatch) {
        const n = fromRoman(epiphMatch[1]);
        return `${n}${ordinalSuffix(n)} Sunday after Epiphany \u2014 the season of Christ's manifestation to the world.`;
    }
    return null;
}

function fromRoman(str) {
    const vals = { I: 1, V: 5, X: 10, L: 50 };
    let total = 0;
    for (let i = 0; i < str.length; i++) {
        const curr = vals[str[i]] || 0;
        const next = vals[str[i + 1]] || 0;
        total += curr < next ? -curr : curr;
    }
    return total;
}

function ordinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

export function getOccasionWikiUrl(occasion) {
    const wikiMap = {
        'Advent I': 'Advent', 'Advent II': 'Advent', 'Advent III': 'Advent', 'Advent IV': 'Advent',
        'Christmas': 'Christmas', 'Christmas Day': 'Christmas',
        'Epiphany': 'Epiphany_(holiday)',
        'Purification': 'Candlemas',
        'Annunciation': 'Annunciation',
        'Septuagesima': 'Septuagesima', 'Sexagesima': 'Sexagesima', 'Estomihi': 'Quinquagesima',
        'Good Friday': 'Good_Friday',
        'Easter Sunday': 'Easter', 'Easter Monday': 'Easter_Monday',
        'Ascension': 'Feast_of_the_Ascension',
        'Pentecost': 'Pentecost', 'Pentecost Sunday': 'Pentecost',
        'Trinity': 'Trinity_Sunday', 'Trinity Sunday': 'Trinity_Sunday',
        'St. John\'s': 'Nativity_of_John_the_Baptist',
        'Visitation': 'Visitation_(Christianity)',
        'St. Michael\'s': 'Michaelmas',
        'Reformation': 'Reformation_Day',
        'Ratswahl': 'Church_cantata_(Bach)#New_council',
        'Palm Sunday': 'Palm_Sunday',
    };
    if (wikiMap[occasion]) return `https://en.wikipedia.org/wiki/${wikiMap[occasion]}`;
    if (/^Trinity\s/.test(occasion)) return 'https://en.wikipedia.org/wiki/Trinity_Sunday';
    if (/^Epiphany\s/.test(occasion)) return 'https://en.wikipedia.org/wiki/Epiphany_season';
    if (/^Easter\s/.test(occasion)) return 'https://en.wikipedia.org/wiki/Eastertide';
    return null;
}

// Occasion detail panel
export function renderOccasionDetail(event, pushState = true) {
    if (!event) return;
    state.selectedEvent = event;
    if (pushState) {
        const slug = event.occasion.replace(/\s+/g, '-');
        history.pushState({ occasion: event.occasion }, '', '/occasion/' + encodeURIComponent(slug));
    }
    const dateStr = event.date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const description = getOccasionDescription(event.occasion);
    const wikiUrl = getOccasionWikiUrl(event.occasion);

    let cantataCards = (event.cantatas || []).map(c =>
        cantataCard(event.occasion, c.bwv, c.title, c.cycle, c.major ? { major: true } : undefined)
    ).join('');

    if (!cantataCards) {
        cantataCards = '<div class="cantata-card"><div class="cantata-info"><div class="cantata-title">No cantata assigned</div></div></div>';
    }

    let descHtml = description ? `<div class="occasion-description">${description}</div>` : '';
    let wikiHtml = wikiUrl ? `<div class="sheet-explore-links"><span class="explore-links-label">Read more on</span> <a href="${wikiUrl}" target="_blank" rel="noopener">Wikipedia</a></div>` : '';

    const wikiPage = wikiUrl ? wikiUrl.split('/wiki/')[1] : null;

    // Compute prev/next occasion in liturgical order
    const occasions = state.allEvents.filter(e => e.cantatas && e.cantatas.length > 0);
    const idx = occasions.findIndex(e => e.occasion === event.occasion);
    const prevOcc = idx > 0 ? occasions[idx - 1] : null;
    const nextOcc = idx < occasions.length - 1 ? occasions[idx + 1] : null;
    const navArrows = `<div class="sheet-nav-arrows">
        <button class="sheet-nav-btn" data-occasion-nav="prev" ${!prevOcc ? 'disabled' : ''}><span class="material-symbols-outlined">chevron_left</span></button>
        <button class="sheet-nav-btn" data-occasion-nav="next" ${!nextOcc ? 'disabled' : ''}><span class="material-symbols-outlined">chevron_right</span></button>
    </div>`;

    const container = document.getElementById('occasion-body');
    container.innerHTML = `
        <button class="sheet-back" id="close-occasion-btn">
            <span class="material-symbols-outlined">close</span>
            <span>Close</span>
        </button>
        <div class="occasion-detail-full">
            <div class="occasion-hero-layout">
                <div class="occasion-hero-img" id="occasion-hero"></div>
                <div class="occasion-hero-text">
                    <div class="occasion-hero-header">
                        <div>
                            <div class="occasion-date">${dateStr}</div>
                            <div class="occasion-name">${event.occasion}</div>
                        </div>
                        ${navArrows}
                    </div>
                    ${descHtml}
                    ${wikiHtml}
                </div>
            </div>
            <div id="reading-slot"></div>
            <div class="occasion-section-label">Cantatas for this occasion</div>
            <div class="cantata-list">${cantataCards}</div>
        </div>`;

    document.getElementById('occasion-backdrop').classList.add('open');

    // Lazy-load hero image from Wikipedia
    if (wikiPage) loadOccasionHero(wikiPage);

    // Fetch Gospel reading
    fetch(`/api/reading/${encodeURIComponent(event.occasion)}`).then(r => r.json()).then(data => {
        const slot = document.getElementById('reading-slot');
        if (!slot || !data.gospel) return;
        const chapter = data.gospel.match(/:/) ? data.gospel.match(/(\d+):/)[1] : '';
        let deFormatted = '';
        if (data.de) {
            // Strip verse numbers for Luther 1545 (Gutenberg-style: no indexing)
            let deClean = data.de.replace(/<span class="verse-num">\d+<\/span>/g, '').replace(/^\s+/, '');
            const firstLetter = deClean.charAt(0);
            deClean = deClean.substring(1);
            deFormatted = `<p><span class="reading-dropcap">${firstLetter}</span>${deClean}</p>`;
        }
        let deModern = '';
        if (data.de_modern) {
            deModern = `<p><span class="reading-dropcap">${chapter}</span>${data.de_modern}</p>`;
        }
        let enFormatted = '';
        if (data.en) {
            enFormatted = `<p><span class="reading-dropcap">${chapter}</span>${data.en}</p>`;
        }
        const deRef = data.gospel.replace(/^Matthew/, 'Matth\u00e4us').replace(/^Mark/, 'Markus').replace(/^Luke/, 'Lukas').replace(/^John/, 'Johannes').replace(/^Acts/, 'Apostelgeschichte').replace(/^Romans/, 'R\u00f6mer').replace(/^Revelation/, 'Offenbarung');
        const bgDe = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(data.gospel)}&version=LUTH1545`;
        const bgSch = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(data.gospel)}&version=SCH2000`;
        const bgEn = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(data.gospel)}&version=KJV`;
        const refLink = (href, label) => `<div class="reading-ref"><a href="${href}" target="_blank" rel="noopener" class="app-link">${label}</a></div>`;
        slot.innerHTML = `
            <div class="occasion-section-label">Prescribed reading</div>
            <div class="reading-tabs">
                <button class="reading-tab active" data-tab="de">Luther 1545</button>
                <button class="reading-tab" data-tab="de-modern">Deutsch</button>
                <button class="reading-tab" data-tab="en">English</button>
            </div>
            <div class="spacer-xl"></div>
            <div class="reading-text reading-fraktur" id="reading-de" lang="de">${deFormatted || '<em>Unavailable</em>'}${refLink(bgDe, `${deRef} (LUTH1545)`)}</div>
            <div class="reading-text reading-garamond reading-hidden" id="reading-de-modern" lang="de">${deModern || '<em>Unavailable</em>'}${refLink(bgSch, `${deRef} (SCH2000)`)}</div>
            <div class="reading-text reading-garamond reading-hidden" id="reading-en" lang="en">${enFormatted || '<em>Unavailable</em>'}${refLink(bgEn, `${data.gospel} (KJV)`)}</div>`;
    }).catch(() => {});
}

export async function loadOccasionHero(pageName) {
    const el = document.getElementById('occasion-hero');
    if (!el) return;

    if (state.heroCache[pageName]) {
        el.style.backgroundImage = `url(${state.heroCache[pageName]})`;
        el.classList.add('loaded');
        return;
    }

    try {
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageName)}`;
        const resp = await fetch(url);
        if (!resp.ok) return;
        const data = await resp.json();
        const imgUrl = data.thumbnail ? data.thumbnail.source : (data.originalimage ? data.originalimage.source : null);
        if (imgUrl) {
            state.heroCache[pageName] = imgUrl;
            el.style.backgroundImage = `url(${imgUrl})`;
            el.classList.add('loaded');
        }
    } catch (e) { /* silent fail -- image is decorative */ }
}

export function closeOccasionDetail() {
    document.getElementById('occasion-backdrop').classList.remove('open');
    state.selectedEvent = null;
    if (location.pathname.startsWith('/occasion/') || location.pathname.startsWith('/cycle/')) {
        const view = getActiveView();
        const url = view === 'calendar' ? '/' : '/' + view;
        history.pushState({ view }, '', url);
    }
}

function getActiveView() {
    const nav = document.querySelector('.nav-item.active');
    return nav ? nav.dataset.view : 'calendar';
}
