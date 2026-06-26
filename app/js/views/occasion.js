import { state } from '../state.js';
import { cantataCard } from '../components.js';

// Loaded at init from /api/occasions
let occasionDescriptions = {};
let occasionWikiMap = {};
let occasionWikiFallbacks = {};

export async function loadOccasionData() {
    const resp = await fetch('/api/occasions');
    const data = await resp.json();
    occasionDescriptions = data.descriptions;
    occasionWikiMap = data.wiki;
    occasionWikiFallbacks = data.wikiFallbacks;
}

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
    if (occasionWikiMap[occasion]) return `https://en.wikipedia.org/wiki/${occasionWikiMap[occasion]}`;
    for (const [prefix, page] of Object.entries(occasionWikiFallbacks)) {
        if (occasion.startsWith(prefix + ' ')) return `https://en.wikipedia.org/wiki/${page}`;
    }
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
        <button class="sheet-close" id="close-occasion-btn"><span class="material-symbols-outlined">close</span></button>
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

    // Fetch prescribed readings (gospel + epistle)
    fetch(`/api/reading/${encodeURIComponent(event.occasion)}`).then(r => r.json()).then(data => {
        const slot = document.getElementById('reading-slot');
        if (!slot || !data.gospel) return;

        const renderReadingPanel = (reading, prefix) => {
            const ref = reading.ref;
            const chapter = ref.match(/:/) ? ref.match(/(\d+):/)[1] : '';
            let deFormatted = '';
            if (reading.de) {
                let deClean = reading.de.replace(/<span class="verse-num">\d+<\/span>/g, '').replace(/^\s+/, '');
                const firstLetter = deClean.charAt(0);
                deClean = deClean.substring(1);
                deFormatted = `<p><span class="reading-dropcap">${firstLetter}</span>${deClean}</p>`;
            }
            let deModern = '';
            if (reading.de_modern) {
                deModern = `<p><span class="reading-dropcap">${chapter}</span>${reading.de_modern}</p>`;
            }
            let enFormatted = '';
            if (reading.en) {
                enFormatted = `<p><span class="reading-dropcap">${chapter}</span>${reading.en}</p>`;
            }
            const deRef = ref.replace(/^Matthew/, 'Matth\u00e4us').replace(/^Mark/, 'Markus').replace(/^Luke/, 'Lukas').replace(/^John/, 'Johannes').replace(/^Acts/, 'Apostelgeschichte').replace(/^Romans/, 'R\u00f6mer').replace(/^Revelation/, 'Offenbarung').replace(/^1 Corinthians/, '1. Korinther').replace(/^2 Corinthians/, '2. Korinther').replace(/^Galatians/, 'Galater').replace(/^Ephesians/, 'Epheser').replace(/^Philippians/, 'Philipper').replace(/^Colossians/, 'Kolosser').replace(/^1 Thessalonians/, '1. Thessalonicher').replace(/^2 Thessalonians/, '2. Thessalonicher').replace(/^1 Timothy/, '1. Timotheus').replace(/^2 Timothy/, '2. Timotheus').replace(/^Titus/, 'Titus').replace(/^Hebrews/, 'Hebr\u00e4er').replace(/^James/, 'Jakobus').replace(/^1 Peter/, '1. Petrus').replace(/^2 Peter/, '2. Petrus').replace(/^1 John/, '1. Johannes').replace(/^2 John/, '2. Johannes').replace(/^Isaiah/, 'Jesaja');
            const bgDe = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=LUTH1545`;
            const bgSch = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=SCH2000`;
            const bgEn = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=KJV`;
            const refLink = (href, label) => `<div class="reading-ref"><a href="${href}" target="_blank" rel="noopener" class="app-link">${label}</a></div>`;
            return `
                <div class="reading-text reading-fraktur" data-lang="de" id="${prefix}-de" lang="de">${deFormatted || '<em>Unavailable</em>'}${refLink(bgDe, `${deRef} (LUTH1545)`)}</div>
                <div class="reading-text reading-garamond reading-hidden" data-lang="de-modern" id="${prefix}-de-modern" lang="de">${deModern || '<em>Unavailable</em>'}${refLink(bgSch, `${deRef} (SCH2000)`)}</div>
                <div class="reading-text reading-garamond reading-hidden" data-lang="en" id="${prefix}-en" lang="en">${enFormatted || '<em>Unavailable</em>'}${refLink(bgEn, `${ref} (KJV)`)}</div>`;
        };

        const hasEpistle = data.epistle && data.epistle.ref;
        slot.innerHTML = `
            <div class="occasion-section-label">Prescribed readings</div>
            <div class="reading-nav-row">
                <div class="reading-source-tabs">
                    <button class="reading-source-tab active" data-source="gospel">Gospel</button>
                    ${hasEpistle ? `<button class="reading-source-tab" data-source="epistle">Epistle</button>` : ''}
                </div>
                <div class="reading-tabs" id="reading-lang-tabs">
                    <button class="reading-tab active" data-lang="de">Luther 1545</button>
                    <button class="reading-tab" data-lang="de-modern">Deutsch</button>
                    <button class="reading-tab" data-lang="en">English</button>
                </div>
            </div>
            <div class="reading-panel" id="reading-panel-gospel">${renderReadingPanel(data.gospel, 'gospel')}</div>
            ${hasEpistle ? `<div class="reading-panel reading-hidden" id="reading-panel-epistle">${renderReadingPanel(data.epistle, 'epistle')}</div>` : ''}`;
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
