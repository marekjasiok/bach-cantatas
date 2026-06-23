import { state } from '../state.js';
import { cantataCard, getCycleClass, getCycleFullName, getVote, voteButton } from '../components.js';
import { closeOccasionDetail, loadOccasionHero } from './occasion.js';

export function buildCatalogueFromIndex(items) {
    const cycleHeaders = {
        EARLY: 'Pre-Leipzig (1704-1722)',
        C1: 'Leipzig Cycle 1 (1723-1724)',
        C2: 'Chorale Cantatas (1724-1725)',
        C3: 'Leipzig Cycle 3 (1725-1727)',
        PICANDER: 'Picander Cycle (1728-1729)',
        LATE: 'Late Works (1730-1748)'
    };
    const groups = {};
    for (const it of items) {
        const cycle = it.cycle || 'MISC';
        if (!groups[cycle]) groups[cycle] = [];
        let occasion = (it.occasion || '')
            .replace('Mon.', 'Monday')
            .replace('Tue.', 'Tuesday')
            .replace('Sun.', 'Sunday')
            .replace(/^Jubilate$/, 'Easter III')
            .replace(/^Sunday after Xmas$/, 'Christmas I')
            .replace(/^Unknown$/, 'Unknown occasion');
        if (it.occasion === 'Easter/Purif.') {
            groups[cycle].push({ ...it, occasion: 'Easter Tuesday', url: `https://en.wikipedia.org/wiki/BWV_${it.bwv}` });
            groups[cycle].push({ ...it, occasion: 'Purification', url: `https://en.wikipedia.org/wiki/BWV_${it.bwv}` });
        } else {
            groups[cycle].push({ ...it, occasion, url: `https://en.wikipedia.org/wiki/BWV_${it.bwv}` });
        }
    }
    const sections = [];
    for (const [cycle, header] of Object.entries(cycleHeaders)) {
        if (groups[cycle]) sections.push({ header, cycle, items: groups[cycle] });
    }
    return sections;
}

export function getAllCatalogueItems(filter) {
    const q = (filter || '').toLowerCase();
    let all = [];
    for (const section of state.catalogueData) {
        for (const it of section.items) {
            if (!q || it.bwv.toLowerCase().includes(q) || it.title.toLowerCase().includes(q) ||
                it.occasion.toLowerCase().includes(q) || it.date.toLowerCase().includes(q)) {
                all.push(it);
            }
        }
    }
    return all;
}

function groupBy(items, keyFn) {
    const groups = {};
    for (const it of items) {
        const key = keyFn(it);
        if (!groups[key]) groups[key] = [];
        groups[key].push(it);
    }
    return groups;
}

function parseDateForSort(dateStr) {
    if (!dateStr) return 9999;
    // ISO date: 1723-06-20
    const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]).getTime();
    // "Month Day, Year" e.g. "Feb 4, 1708"
    const mdy = dateStr.match(/^[A-Z][a-z]+ \d+, (\d{4})/);
    if (mdy) return new Date(dateStr.replace(/\s*\(.*/, '')).getTime() || +mdy[1];
    // Year with prefix: "c. 1708", "1714", "c. 1704–1707"
    const yearMatch = dateStr.match(/(\d{4})/);
    return yearMatch ? +yearMatch[1] : 9999;
}

export function renderCatalogue(filter) {
    const container = document.getElementById('catalogue-content');
    if (state.catalogueData.length === 0) {
        container.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">library_music</span><p>Loading catalogue...</p></div>';
        return;
    }

    const items = getAllCatalogueItems(filter);
    let html = '';

    if (state.catalogueSort === 'cycle') {
        const cycleOrder = ['EARLY', 'C1', 'C2', 'C3', 'PICANDER', 'LATE'];
        const groups = groupBy(items, it => it.cycle);
        for (const c of cycleOrder) {
            if (!groups[c] || groups[c].length === 0) continue;
            groups[c].sort((a, b) => parseDateForSort(a.date) - parseDateForSort(b.date));
            const cycleName = state.cycleData[c] ? state.cycleData[c].name : c;
            html += `<div class="catalogue-section"><div class="catalogue-section-header catalogue-cycle-link" id="cat-cycle-${c}" data-cycle="${c}">${cycleName}</div>`;
            for (const it of groups[c]) html += renderCatalogueItem(it);
            html += '</div>';
        }
    } else if (state.catalogueSort === 'occasion') {
        const occasionOrder = ['Advent I','Advent II','Advent III','Advent IV','Christmas Day','Christmas','Christmas 2','Christmas 3','Christmas I','New Year','New Year I','Epiphany','Epiphany I','Epiphany II','Epiphany III','Epiphany IV','Purification','Septuagesima','Sexagesima','Estomihi','Oculi','Annunciation','Palm Sunday','Good Friday','Easter Sunday','Easter Monday','Easter Tuesday','Easter I','Easter II','Easter III','Easter IV','Easter V','Ascension','Ascension I','Pentecost','Pentecost 2','Pentecost 3','Trinity','St. John\'s','Visitation','Trinity I','Trinity II','Trinity III','Trinity IV','Trinity V','Trinity VI','Trinity VII','Trinity VIII','Trinity IX','Trinity X','Trinity XI','Trinity XII','Trinity XIII','Trinity XIV','Trinity XV','Trinity XVI','Trinity XVII','Trinity XVIII','Trinity XIX','Trinity XX','Trinity XXI','Trinity XXII','Trinity XXIII','Trinity XXIV','Trinity XXV','Trinity XXVI','Trinity XXVII','St. Michael\'s','Reformation','Ratswahl','Wedding','Funeral','Penitential','Unknown occasion'];
        const groups = groupBy(items, it => it.occasion);
        const sortedKeys = Object.keys(groups).sort((a, b) => {
            const ia = occasionOrder.indexOf(a);
            const ib = occasionOrder.indexOf(b);
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        });

        // Season boundaries for navigation
        const seasons = [
            { id: 'advent', label: 'Advent', start: 'Advent I' },
            { id: 'christmas', label: 'Christmas', start: 'Christmas Day' },
            { id: 'epiphany', label: 'Epiphany', start: 'Epiphany' },
            { id: 'pre-lent', label: 'Pre-Lent', start: 'Septuagesima' },
            { id: 'lent', label: 'Lent & Holy Week', start: 'Oculi' },
            { id: 'easter', label: 'Easter', start: 'Easter Sunday' },
            { id: 'ascension', label: 'Ascension', start: 'Ascension' },
            { id: 'pentecost', label: 'Pentecost', start: 'Pentecost' },
            { id: 'trinity', label: 'Trinity', start: 'Trinity' },
            { id: 'feasts', label: 'Feasts', start: "St. Michael's" },
            { id: 'other', label: 'Other', start: 'Ratswahl' },
        ];
        const seasonStartSet = new Set(seasons.map(s => s.start));
        function getSeasonId(occ) {
            for (let i = seasons.length - 1; i >= 0; i--) {
                const startIdx = occasionOrder.indexOf(seasons[i].start);
                const occIdx = occasionOrder.indexOf(occ);
                if (occIdx >= startIdx) return seasons[i].id;
            }
            return 'other';
        }

        let currentSeason = null;
        for (const occ of sortedKeys) {
            const season = getSeasonId(occ);
            if (season !== currentSeason) {
                const seasonInfo = seasons.find(s => s.id === season);
                html += `<div class="catalogue-super-header" id="cat-season-${season}">${seasonInfo ? seasonInfo.label : 'Other'}</div>`;
                currentSeason = season;
            }
            html += `<div class="catalogue-section"><div class="catalogue-section-header catalogue-occasion-link" data-occasion="${occ.replace(/"/g, '&quot;')}">${occ}</div>`;
            for (const it of groups[occ]) html += renderCatalogueItem(it);
            html += '</div>';
        }

        // Populate occasion nav chips (only seasons that have content)
        const presentSeasons = seasons.filter(s => sortedKeys.some(occ => getSeasonId(occ) === s.id));
        const occNav = document.getElementById('occasion-nav');
        occNav.innerHTML = presentSeasons.map(s =>
            `<span class="chip" data-scroll-season="${s.id}">${s.label}</span>`
        ).join('');
    } else if (state.catalogueSort === 'key') {
        // Group by key from tagsCache (enriched nodes)
        const withKey = items.filter(it => state.tagsCache[it.bwv] && state.tagsCache[it.bwv].key);
        const withoutKey = items.filter(it => !state.tagsCache[it.bwv] || !state.tagsCache[it.bwv].key);
        const groups = groupBy(withKey, it => state.tagsCache[it.bwv].key);

        // Sort keys: major before minor, then by note
        const noteOrder = ['C', 'C♯', 'D♭', 'D', 'D♯', 'E♭', 'E', 'F', 'F♯', 'G♭', 'G', 'G♯', 'A♭', 'A', 'A♯', 'B♭', 'B'];
        const sortedKeys = Object.keys(groups).sort((a, b) => {
            const aMajor = a.includes('major') ? 0 : 1;
            const bMajor = b.includes('major') ? 0 : 1;
            if (aMajor !== bMajor) return aMajor - bMajor;
            const aNote = a.split(' ')[0];
            const bNote = b.split(' ')[0];
            return (noteOrder.indexOf(aNote) === -1 ? 99 : noteOrder.indexOf(aNote)) - (noteOrder.indexOf(bNote) === -1 ? 99 : noteOrder.indexOf(bNote));
        });

        const majorKeys = sortedKeys.filter(k => k.includes('major'));
        const minorKeys = sortedKeys.filter(k => k.includes('minor'));

        const keySlug = k => k.replace(/\s+/g, '-').replace(/[♯#]/g, 'sharp').replace(/♭/g, 'flat');

        if (majorKeys.length > 0) html += '<div class="catalogue-super-header">Major</div>';
        for (const key of majorKeys) {
            html += `<div class="catalogue-section" id="cat-key-${keySlug(key)}"><div class="catalogue-section-header">${key}</div>`;
            for (const it of groups[key]) html += renderCatalogueItem(it);
            html += '</div>';
        }
        if (minorKeys.length > 0) html += '<div class="catalogue-super-header">Minor</div>';
        for (const key of minorKeys) {
            html += `<div class="catalogue-section" id="cat-key-${keySlug(key)}"><div class="catalogue-section-header">${key}</div>`;
            for (const it of groups[key]) html += renderCatalogueItem(it);
            html += '</div>';
        }
        if (withoutKey.length > 0) {
            html += `<div class="catalogue-section"><div class="catalogue-section-header">Key unknown</div>`;
            for (const it of withoutKey) html += renderCatalogueItem(it);
            html += '</div>';
        }

        // Populate key nav chips
        const keyNav = document.getElementById('key-nav');
        let navHtml = '<span class="key-nav-label">Major</span>';
        for (const key of majorKeys) {
            navHtml += `<span class="chip" data-scroll-key="${keySlug(key)}">${key.split(' ')[0]}</span>`;
        }
        navHtml += '<span class="key-nav-separator"></span><span class="key-nav-label">Minor</span>';
        for (const key of minorKeys) {
            navHtml += `<span class="chip" data-scroll-key="${keySlug(key)}">${key.split(' ')[0]}</span>`;
        }
        keyNav.innerHTML = navHtml;
    } else { // bwv
        const sorted = [...items].sort((a, b) => {
            const na = parseInt(a.bwv.replace(/\D/g, ''));
            const nb = parseInt(b.bwv.replace(/\D/g, ''));
            return na - nb;
        });

        // Group into ranges of 20
        const rangeSize = 20;
        const ranges = [];
        let currentRange = null;
        for (const it of sorted) {
            const num = parseInt(it.bwv.replace(/\D/g, ''));
            const rangeStart = Math.floor((num - 1) / rangeSize) * rangeSize + 1;
            const rangeEnd = rangeStart + rangeSize - 1;
            const rangeId = `bwv-${rangeStart}-${rangeEnd}`;
            if (!currentRange || currentRange.id !== rangeId) {
                currentRange = { id: rangeId, label: `${rangeStart}\u2013${rangeEnd}`, items: [] };
                ranges.push(currentRange);
            }
            currentRange.items.push(it);
        }

        for (const range of ranges) {
            html += `<div class="catalogue-section" id="cat-${range.id}"><div class="catalogue-section-header">${range.label}</div>`;
            for (const it of range.items) html += renderCatalogueItem(it);
            html += '</div>';
        }

        // Populate bwv nav chips
        const bwvNav = document.getElementById('bwv-nav');
        bwvNav.innerHTML = ranges.map(r =>
            `<span class="chip" data-scroll-bwv="${r.id}">${r.label}</span>`
        ).join('');
    }

    container.innerHTML = html;
}

export function renderCatalogueItem(it) {
    return cantataCard(it.occasion, it.bwv, it.title, it.cycle, it.major ? { major: true } : undefined);
}

// Cycle detail panel
export function openCycleDetail(cycleKey, pushState = true) {
    const info = state.cycleData[cycleKey];
    if (!info) return;

    if (pushState) {
        history.pushState({ cycle: cycleKey }, '', '/cycle/' + cycleKey);
    }

    // Get all cantatas from this cycle
    const cycleCantatas = [];
    for (const section of state.catalogueData) {
        if (section.cycle === cycleKey) {
            for (const it of section.items) cycleCantatas.push(it);
        }
    }

    let cantataCards = cycleCantatas.map(c =>
        cantataCard(c.occasion, c.bwv, c.title || '', c.cycle, {
            chip: `<div class="chip cycle-occasion" data-occasion-link="${c.occasion.replace(/"/g, '&quot;')}">${c.occasion}</div>`
        })
    ).join('');

    const wikiUrl = `https://en.wikipedia.org/wiki/${info.wiki}`;
    const wikiPage = info.wiki;

    const cycleKeys = Object.keys(state.cycleData);
    const cycleIdx = cycleKeys.indexOf(cycleKey);
    const prevCycle = cycleIdx > 0 ? cycleKeys[cycleIdx - 1] : null;
    const nextCycle = cycleIdx < cycleKeys.length - 1 ? cycleKeys[cycleIdx + 1] : null;
    const cycleNavHtml = (prevCycle || nextCycle) ? `
        <div class="hero-nav cycle-detail-nav">
            <button class="hero-nav-btn" ${prevCycle ? `data-cycle-nav="${prevCycle}"` : 'disabled'}><span class="material-symbols-outlined">chevron_left</span></button>
            <button class="hero-nav-btn" ${nextCycle ? `data-cycle-nav="${nextCycle}"` : 'disabled'}><span class="material-symbols-outlined">chevron_right</span></button>
        </div>` : '';

    const container = document.getElementById('occasion-body');
    container.innerHTML = `
        <button class="sheet-close" id="close-occasion-btn"><span class="material-symbols-outlined">close</span></button>
        <div class="occasion-detail-full">
            <div class="occasion-hero-layout">
                ${cycleNavHtml}
                <div class="occasion-hero-img" id="occasion-hero"></div>
                <div class="occasion-hero-text">
                    <div class="occasion-name">${info.name}</div>
                    <div class="cycle-description">${info.desc}</div>
                    <div class="sheet-explore-links"><span class="explore-links-label">Read more on</span> <a href="${wikiUrl}" target="_blank" rel="noopener">Wikipedia</a></div>
                </div>
            </div>
            <div class="occasion-section-label">${cycleCantatas.length} cantatas</div>
            <div class="cantata-list">${cantataCards}</div>
        </div>`;

    document.getElementById('occasion-backdrop').classList.add('open');
    container.scrollTop = 0;

    // Load hero image from Wikipedia
    loadOccasionHero(info.heroPage || wikiPage.split('#')[0]);
}
