import { state } from '../state.js';
import { getNode } from '../api.js';
import { getCycleClass, getCycleFullName, getVote, voteButton } from '../components.js';

export async function openSheet(bwvInput, pushState = true) {
    const bwv = bwvInput.replace(/BWV\s*/i, '');
    if (pushState) history.pushState({ cantata: bwv }, '', '/cantata/BWV' + bwv);
    const bachCantatasUrl = `https://www.bach-cantatas.com/BWV${bwv}.htm`;

    // Find cantata in catalogue data
    let cantata = null;
    for (const section of state.catalogueData) {
        cantata = section.items.find(it => it.bwv === bwv);
        if (cantata) break;
    }

    // Find which occasions include this cantata
    const occasions = state.allEvents.filter(e => e.cantatas && e.cantatas.some(c => c.bwv === bwv));

    const cycle = cantata ? cantata.cycle : 'MISC';
    const title = cantata ? cantata.title : '';
    const occasion = cantata ? cantata.occasion : '';
    const date = cantata ? cantata.date : '';
    const wikiUrl = cantata ? cantata.url : `https://en.wikipedia.org/wiki/BWV_${bwv}`;

    // Date line
    let dateLine = '';
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const d = new Date(date + 'T00:00:00');
        dateLine = 'First performed on ' + d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    } else if (state.cycleData[cycle] && state.cycleData[cycle].years) {
        dateLine = 'Ca. ' + state.cycleData[cycle].years;
    }

    let occasionsHtml = '';

    // Compute prev/next BWV
    const allBwvs = [];
    for (const section of state.catalogueData) {
        for (const it of section.items) {
            const n = parseInt(it.bwv, 10);
            if (!isNaN(n) && !allBwvs.includes(n)) allBwvs.push(n);
        }
    }
    allBwvs.sort((a, b) => a - b);
    const bwvNum = parseInt(bwv, 10);
    const bwvIdx = allBwvs.indexOf(bwvNum);
    const prevBwv = bwvIdx > 0 ? allBwvs[bwvIdx - 1] : null;
    const nextBwv = bwvIdx < allBwvs.length - 1 ? allBwvs[bwvIdx + 1] : null;

    // Show sheet immediately with loading state
    const sheetEl = document.getElementById('sheet-body');
    document.getElementById('sheet-backdrop').classList.add('open');
    sheetEl.scrollTop = 0;

    // Render header + loading spinner first
    sheetEl.innerHTML = `
        <div class="sheet-top-row">
            <div class="hero-nav bwv-nav">
                <button class="hero-nav-btn" ${prevBwv ? `data-open-bwv="${prevBwv}"` : 'disabled'}><span class="material-symbols-outlined">chevron_left</span></button>
                <button class="hero-nav-btn" ${nextBwv ? `data-open-bwv="${nextBwv}"` : 'disabled'}><span class="material-symbols-outlined">chevron_right</span></button>
            </div>
            <button class="sheet-close" id="close-sheet-btn"><span class="material-symbols-outlined">close</span></button>
        </div>
        <div class="sheet-header">
            <div class="sheet-title-block">
                <div class="sheet-bwv">BWV ${bwv}</div>
                ${title ? `<div class="sheet-title">${title}</div>` : ''}
                <div class="chip ${getCycleClass(cycle)}">${getCycleFullName(cycle)}</div>
                ${occasion || dateLine ? `<div class="sheet-meta">${occasion ? `Cantata for <a href="#" class="sheet-occasion-link" data-occasion="${occasion.replace(/"/g, '&quot;')}">${occasion}</a>` : ''}${occasion && dateLine ? ' \u00b7 ' : ''}${dateLine}</div>` : ''}
            </div>
            ${voteButton(occasion, bwv, getVote(occasion, bwv))}
        </div>
        <div class="sheet-loading">
            <span class="material-symbols-outlined spinning">progress_activity</span>
            <span>Loading details...</span>
        </div>`;

    // Fetch full node on demand (from cache or API)
    const nodeData = await getNode(bwv);
    const textEntry = nodeData;

    // Overview section -- hero image + structured metadata
    let overviewHtml = '';
    if (textEntry) {
        const wiki = textEntry.wiki;
        const heroImg = wiki && wiki.image ? `<div class="overview-hero" style="background-image:url(${wiki.image})"></div>` : '';

        // Structure summary from movements
        let structureLine = '';
        if (textEntry.movements && textEntry.movements.length > 0) {
            const abbr = textEntry.movements.map(m => {
                const t = m.type;
                if (t === 'Chorus') return 'C';
                if (t === 'Chorale') return 'Ch';
                if (t === 'Aria') return 'A';
                if (t === 'Recitative') return 'R';
                if (t === 'Duet') return 'D';
                if (t === 'Sinfonia') return 'S';
                return t[0];
            }).join(' \u00b7 ');
            structureLine = `${textEntry.movements.length} movements: ${abbr}`;
        }

        // Scoring
        const scoringLine = textEntry.scoring || '';

        // Key
        const keyLine = textEntry.key || (state.tagsCache[bwv] && state.tagsCache[bwv].key) || '';

        // Build meta rows
        let metaRows = '';
        if (keyLine) metaRows += `<div class="overview-row"><span class="overview-label">Key</span><span class="overview-value">${keyLine}</span></div>`;
        if (scoringLine) metaRows += `<div class="overview-row"><span class="overview-label">Scoring</span><span class="overview-value">${scoringLine}</span></div>`;
        if (structureLine) metaRows += `<div class="overview-row"><span class="overview-label">Structure</span><span class="overview-value">${structureLine}</span></div>`;

        // Average duration from performances (filter outliers: keep >=10 min)
        if (textEntry.performances && textEntry.performances.length > 0) {
            const durations = textEntry.performances
                .map(p => p.duration)
                .filter(d => d && /^\d+:\d+$/.test(d))
                .map(d => { const [m, s] = d.split(':').map(Number); return m * 60 + s; });
            if (durations.length > 0) {
                const full = durations.filter(d => d >= 600);
                const pool = full.length > 0 ? full : durations;
                const avg = pool.reduce((a, b) => a + b, 0) / pool.length;
                const mins = Math.round(avg / 60);
                metaRows += `<div class="overview-row"><span class="overview-label">Duration</span><span class="overview-value">${mins} min (average)</span></div>`;
            }
        }

        // Background from wiki
        let backgroundHtml = '';
        if (wiki && (wiki.summary_html || wiki.summary)) {
            const wikiText = (wiki.summary_html || wiki.summary).replace(/<\/?b>/g, '');
            backgroundHtml = `<div class="overview-background">${wikiText}</div>`;
        }

        const readMoreHtml = `<div class="sheet-explore-links"><span class="explore-links-label">Read more on</span> <a href="${wikiUrl}" target="_blank" rel="noopener">Wikipedia</a><span class="sheet-explore-sep">\u00b7</span><a href="${bachCantatasUrl}" target="_blank" rel="noopener">Bach Cantatas</a></div>`;

        if (heroImg || metaRows || backgroundHtml) {
            overviewHtml = `
            <div class="sheet-section">
                <div class="sheet-section-label">Overview</div>
                <div class="overview-layout">
                    ${heroImg}
                    <div class="overview-content">
                        ${metaRows ? `<div class="overview-meta">${metaRows}</div>` : ''}
                        ${backgroundHtml}
                        ${readMoreHtml}
                    </div>
                </div>
            </div>`;
        }
    }

    // Performances -- loaded async after main render
    const performancesHtml = `<div id="perf-slot"></div>`;

    // Text section -- full movements or fallback to incipit
    let textHtml = '';
    if (textEntry && textEntry.movements) {
        const mvts = textEntry.movements;
        const dots = mvts.map((_, i) => `<div class="sheet-mvt-dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></div>`).join('');
        textHtml = `
        <div class="sheet-section">
            <div class="sheet-section-label">Libretto</div>
            <div class="sheet-text-section" id="sheet-text-reader" data-bwv="${bwv}" data-idx="0" data-lang="de">
                <div class="sheet-movement-nav">
                    <div>
                        <div class="sheet-movement-label">${mvts[0].num}. ${mvts[0].type}${mvts[0].voices || mvts[0].instruments ? ` <span class="voices">(${mvts[0].voices || mvts[0].instruments})</span>` : ''}</div>
                    </div>
                    <div class="sheet-nav-arrows">
                        <button class="sheet-nav-btn" id="sheet-prev" disabled><span class="material-symbols-outlined">chevron_left</span></button>
                        <button class="sheet-nav-btn" id="sheet-next" ${mvts.length <= 1 ? 'disabled' : ''}><span class="material-symbols-outlined">chevron_right</span></button>
                    </div>
                </div>
                <div class="sheet-text-body" id="sheet-text-content">${mvts[0].de || '<em class="instrumental">Instrumental</em>'}</div>
                <div class="sheet-text-controls">
                    <button class="sheet-translate-btn" id="sheet-translate">
                        <span class="material-symbols-outlined">translate</span>
                        <span>Translate</span>
                    </button>
                    <div class="sheet-movement-dots">${dots}</div>
                </div>
            </div>
        </div>`;
    } else if (title) {
        const englishTitle = getEnglishTitle(bwv, title);
        textHtml = `
        <div class="sheet-section">
            <div class="sheet-section-label">Text</div>
            <div class="sheet-text-section" id="sheet-text-reader" data-lang="de">
                <div class="sheet-text-body" id="sheet-text-content">${title}</div>
                <div class="sheet-text-controls">
                    <button class="sheet-translate-btn" id="sheet-translate" data-lang="de" data-de="${title.replace(/"/g, '&quot;')}" data-en="${englishTitle.replace(/"/g, '&quot;')}">
                        <span class="material-symbols-outlined">translate</span>
                        <span>English</span>
                    </button>
                </div>
            </div>
        </div>`;
    }

    // Re-render full sheet content (replaces loading spinner)
    sheetEl.innerHTML = `
        <div class="sheet-top-row">
            <div class="hero-nav bwv-nav">
                <button class="hero-nav-btn" ${prevBwv ? `data-open-bwv="${prevBwv}"` : 'disabled'}><span class="material-symbols-outlined">chevron_left</span></button>
                <button class="hero-nav-btn" ${nextBwv ? `data-open-bwv="${nextBwv}"` : 'disabled'}><span class="material-symbols-outlined">chevron_right</span></button>
            </div>
            <button class="sheet-close" id="close-sheet-btn"><span class="material-symbols-outlined">close</span></button>
        </div>
        <div class="sheet-header">
            <div class="sheet-title-block">
                <div class="sheet-bwv">BWV ${bwv}</div>
                ${title ? `<div class="sheet-title">${title}</div>` : ''}
                <div class="chip ${getCycleClass(cycle)}">${getCycleFullName(cycle)}</div>
                ${occasion || dateLine ? `<div class="sheet-meta">${occasion ? `Cantata for <a href="#" class="sheet-occasion-link" data-occasion="${occasion.replace(/"/g, '&quot;')}">${occasion}</a>` : ''}${occasion && dateLine ? ' \u00b7 ' : ''}${dateLine}</div>` : ''}
            </div>
            ${voteButton(occasion, bwv, getVote(occasion, bwv))}
        </div>
        ${overviewHtml}
        ${textHtml}
        ${performancesHtml}
        ${occasionsHtml}`;

    fitLibrettoHeight();

    // Fetch YouTube performances in background
    fetch(`/api/cantata/${bwv}/performances`).then(r => r.json()).then(data => {
        const slot = document.getElementById('perf-slot');
        if (!slot || !data.performances || data.performances.length === 0) return;
        // Filter outliers: prefer full performances (>=10 min)
        const withSecs = data.performances.map(p => {
            const [m, s] = (p.duration || '0:0').split(':').map(Number);
            return { ...p, _secs: m * 60 + s };
        });
        const full = withSecs.filter(p => p._secs >= 600);
        const filtered = (full.length > 0 ? full : withSecs).slice(0, 5);
        const thumbs = filtered.map(p => {
            const performer = p.performer || p.channel;
            const details = [p.place, p.year].filter(Boolean).join(', ');
            const videoId = p.url.match(/[?&]v=([^&]+)/)?.[1] || '';
            return `
            <div class="perf-thumb" data-video-id="${videoId}" title="${p.title.replace(/"/g, '&quot;')}">
                <div class="perf-img-wrap">
                    <img src="${p.thumbnail}" alt="${performer}" loading="lazy">
                    <div class="perf-duration">${p.duration}</div>
                </div>
                <div class="perf-caption"><strong>${performer}</strong>${details ? '<br>' + details : ''}</div>
            </div>`;
        }).join('');
        slot.innerHTML = `
            <div class="sheet-section">
                <div class="sheet-section-label">Watch on YouTube</div>
                <div class="sheet-explore-links"><a href="https://www.youtube.com/results?search_query=BWV+${bwv}+score" target="_blank" rel="noopener"><span class="material-symbols-outlined inline-icon">music_note</span>Listen with score</a></div>
                <div class="perf-grid">${thumbs}</div>
            </div>`;
    }).catch(() => {});
}

// Loaded at init from /api/translations
let translationsData = {};

export async function loadTranslations() {
    const resp = await fetch('/api/translations');
    translationsData = await resp.json();
}

export function getEnglishTitle(bwv, germanTitle) {
    const num = bwv.replace(/^BWV\s*/i, '');
    return translationsData[num] || germanTitle;
}

export function fitLibrettoHeight() {
    const el = document.getElementById('sheet-text-content');
    if (!el || window.innerWidth < 720) return;
    // Temporarily remove columns to measure full single-column text height
    el.style.columns = 'unset';
    el.style.height = 'auto';
    requestAnimationFrame(() => {
        const fullHeight = el.scrollHeight;
        // Restore columns
        el.style.columns = '';
        el.style.columnFill = 'auto';
        // Height needed for 2 columns (with some padding)
        const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 24;
        const neededHeight = Math.ceil(fullHeight / 2) + lineHeight * 2;
        const minHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--libretto-col-height')) || 420;
        el.style.height = Math.max(minHeight, neededHeight) + 'px';
    });
}

export function renderMovement(bwv, idx) {
    const entry = state.nodesCache[bwv];
    if (!entry) return;
    const mvt = entry.movements[idx];
    const total = entry.movements.length;

    document.querySelector('.sheet-movement-label').innerHTML = `${mvt.num}. ${mvt.type}${mvt.voices || mvt.instruments ? ` <span class="voices">(${mvt.voices || mvt.instruments})</span>` : ''}`;

    const content = document.getElementById('sheet-text-content');
    if (mvt.de) {
        content.textContent = mvt.de;
    } else {
        content.innerHTML = '<em class="instrumental">Instrumental</em>';
    }
    content.classList.remove('translated');

    const translateBtn = document.getElementById('sheet-translate');
    if (translateBtn) translateBtn.querySelector('span:last-child').textContent = 'English';

    document.getElementById('sheet-prev').disabled = (idx === 0);
    document.getElementById('sheet-next').disabled = (idx >= total - 1);

    document.querySelectorAll('.sheet-mvt-dot').forEach((d, i) => {
        d.classList.toggle('active', i === idx);
    });

    fitLibrettoHeight();
}

export function closeSheet(pushState = true) {
    document.getElementById('sheet-backdrop').classList.remove('open');
    if (pushState && location.pathname.startsWith('/cantata/')) {
        const view = getActiveView();
        const url = view === 'calendar' ? '/' : '/' + view;
        history.pushState({ view }, '', url);
    }
}

function getActiveView() {
    const nav = document.querySelector('.nav-item.active');
    return nav ? nav.dataset.view : 'calendar';
}
