import { state } from './state.js';
import { loadCalendarYear, getNode } from './api.js';
import { getCycleClass, getCycleLabel, getVotes, getVote, toggleVote } from './components.js';
import { renderSchedule, renderCalendar, navigateHero, setCalendarMode, calendarPrev, calendarNext, isSameDay, getEventForDate } from './views/schedule.js';
import { renderCatalogue, renderCatalogueItem, buildCatalogueFromIndex, openCycleDetail } from './views/catalogue.js';
import { renderOccasionDetail, closeOccasionDetail } from './views/occasion.js';
import { openSheet, closeSheet, renderMovement, fitLibrettoHeight, getEnglishTitle } from './views/sheet.js';
import { renderVotesView } from './views/likes.js';
import { renderInsightsView } from './views/discover.js';

// === Migrate votes: old true values -> 2 (liked) ===
if (!localStorage.getItem('bach-votes-v2')) {
    const oldVotes = JSON.parse(localStorage.getItem('bach-votes') || '{}');
    for (const k of Object.keys(oldVotes)) {
        if (oldVotes[k] === true) oldVotes[k] = 2;
    }
    localStorage.setItem('bach-votes', JSON.stringify(oldVotes));
    localStorage.setItem('bach-votes-v2', '1');
}

// Load reference data + catalogue
const referenceDataReady = Promise.all([
    fetch('/api/cycles').then(r => r.json()),
    fetch('/api/instruments').then(r => r.json()),
    fetch('/api/index').then(r => r.json())
]).then(([cycles, instruments, items]) => {
    state.cycleData = cycles;
    state.familyLabels = Object.fromEntries(Object.entries(instruments).map(([k, v]) => [k, v.label]));
    state.catalogueData = buildCatalogueFromIndex(items);
});

// Global search
function openSearch() {
    document.getElementById('search-overlay').classList.add('open');
    setTimeout(() => document.getElementById('global-search').focus(), 100);
}
function closeSearch() {
    document.getElementById('search-overlay').classList.remove('open');
    document.getElementById('global-search').value = '';
    document.getElementById('search-results').innerHTML = '<div class="search-hint">Search by BWV number, German or English title,<br>libretto text, or liturgical occasion</div>';
}

function openAbout() {
    document.getElementById('help-overlay').classList.add('open');
    history.pushState({ about: true }, '', '/about');
}
function closeAbout() {
    document.getElementById('help-overlay').classList.remove('open');
    if (location.pathname === '/about') {
        history.pushState({}, '', '/');
    }
}

function performSearch(query) {
    const container = document.getElementById('search-results');
    if (!query || query.length < 2) {
        container.innerHTML = '<div class="search-hint">Search by BWV number, German or English title,<br>libretto text, or liturgical occasion</div>';
        return;
    }

    const q = query.toLowerCase();
    const results = [];

    // Search catalogue data
    for (const section of state.catalogueData) {
        for (const it of section.items) {
            let matchReason = '';
            const bwvNum = it.bwv;

            // BWV number match (fuzzy: "140", "bwv140", "bwv 140")
            if (bwvNum === q || ('bwv ' + bwvNum).includes(q) || q.replace(/\s/g, '').includes(bwvNum.toLowerCase())) {
                matchReason = 'BWV match';
            }
            // Title match
            else if (it.title.toLowerCase().includes(q)) {
                matchReason = 'Title: ' + highlightMatch(it.title, q);
            }
            // Occasion match
            else if (it.occasion.toLowerCase().includes(q)) {
                matchReason = 'Occasion: ' + it.occasion;
            }
            // Alternate name match
            else if (it.alt && it.alt.toLowerCase().includes(q)) {
                matchReason = 'Also known as: ' + highlightMatch(it.alt, q);
            }
            // English title match
            else {
                const engTitle = getEnglishTitle(it.bwv, it.title);
                if (engTitle.toLowerCase().includes(q)) {
                    matchReason = 'English: ' + highlightMatch(engTitle, q);
                }
            }

            // Search within cached libretti text
            if (!matchReason && state.nodesCache[it.bwv] && state.nodesCache[it.bwv].movements) {
                for (const mvt of state.nodesCache[it.bwv].movements) {
                    if (mvt.de && mvt.de.toLowerCase().includes(q)) {
                        const snippet = getSnippet(mvt.de, q);
                        matchReason = `Mvt. ${mvt.num}: ${snippet}`;
                        break;
                    }
                }
            }

            if (matchReason) {
                results.push({ ...it, matchReason });
            }
        }
    }

    if (results.length === 0) {
        container.innerHTML = '<div class="search-hint">No results found</div>';
        return;
    }

    let html = '';
    for (const r of results.slice(0, 20)) {
        html += `<div class="search-result-item" data-bwv="${r.bwv}">
            <div class="cantata-cycle ${getCycleClass(r.cycle)}">${getCycleLabel(r.cycle)}</div>
            <div class="cantata-info">
                <div class="cantata-bwv">BWV ${r.bwv}</div>
                <div class="cantata-title">${r.title}</div>
                <div class="search-result-match">${r.matchReason}</div>
            </div>
        </div>`;
    }
    if (results.length > 20) {
        html += `<div class="search-hint">${results.length - 20} more results...</div>`;
    }
    container.innerHTML = html;
}

function highlightMatch(text, query) {
    const idx = text.toLowerCase().indexOf(query);
    if (idx === -1) return text;
    const start = Math.max(0, idx - 10);
    const end = Math.min(text.length, idx + query.length + 20);
    let snippet = (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '');
    return snippet;
}

function getSnippet(text, query) {
    const lines = text.split('\n');
    for (const line of lines) {
        if (line.toLowerCase().includes(query)) {
            const trimmed = line.trim();
            return trimmed.length > 50 ? trimmed.slice(0, 50) + '...' : trimmed;
        }
    }
    return '';
}

// Search input handler
document.getElementById('global-search').addEventListener('input', function(e) {
    performSearch(e.target.value.trim());
});

// Tab switching
function switchView(viewName, pushState = true) {
    // Close any open overlays
    document.getElementById('sheet-backdrop').classList.remove('open');
    document.getElementById('occasion-backdrop').classList.remove('open');
    state.selectedEvent = null;

    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const nav = document.querySelector(`.nav-item[data-view="${viewName}"]`);
    if (nav) nav.classList.add('active');

    // Show target view
    const view = document.getElementById('view-' + viewName);
    if (view) view.classList.add('active');

    if (viewName === 'votes') renderVotesView();
    if (viewName === 'catalogue') renderCatalogue('');
    if (viewName === 'calendar') renderSchedule();
    if (viewName === 'insights') renderInsightsView();
    // Show/hide sort-specific navs
    const cycleNav = document.getElementById('cycle-nav');
    const keyNav = document.getElementById('key-nav');
    const occNav = document.getElementById('occasion-nav');
    const bwvNav = document.getElementById('bwv-nav');
    if (cycleNav) cycleNav.classList.toggle('active', viewName === 'catalogue' && state.catalogueSort === 'cycle');
    if (keyNav) keyNav.classList.toggle('active', viewName === 'catalogue' && state.catalogueSort === 'key');
    if (occNav) occNav.classList.toggle('active', viewName === 'catalogue' && state.catalogueSort === 'occasion');
    if (bwvNav) bwvNav.classList.toggle('active', viewName === 'catalogue' && state.catalogueSort === 'bwv');

    if (pushState) {
        let url;
        if (viewName === 'calendar') url = '/';
        else if (viewName === 'catalogue') url = '/catalogue/' + state.catalogueSort;
        else url = '/' + viewName;
        history.pushState({ view: viewName }, '', url);
    }
}

// Routing
function handleRoute(pushState = false) {
    const path = location.pathname;

    // Close about if navigating elsewhere
    if (path !== '/about') document.getElementById('help-overlay').classList.remove('open');

    // /cantata/BWV140
    const cantataMatch = path.match(/^\/cantata\/BWV(\d+[a-z]?)$/i);
    if (cantataMatch) {
        // Skip rendering schedule underneath — show overlay instantly
        showBackdropInstant('sheet-backdrop');
        openSheet(cantataMatch[1], false);
        return;
    }

    // /cycle/C1, /cycle/EARLY etc.
    const cycleMatch = path.match(/^\/cycle\/(.+)$/);
    if (cycleMatch) {
        const cycleKey = decodeURIComponent(cycleMatch[1]);
        showBackdropInstant('occasion-backdrop');
        openCycleDetail(cycleKey, false);
        return;
    }

    // /occasion/Trinity-XXVII
    const occasionMatch = path.match(/^\/occasion\/(.+)$/);
    if (occasionMatch) {
        const slug = decodeURIComponent(occasionMatch[1]).replace(/-/g, ' ').replace(/['']/g, "'");
        closeSheet(false);
        showBackdropInstant('occasion-backdrop');
        const ev = state.allEvents.find(e => e.occasion.replace(/\s+/g, ' ').replace(/['']/g, "'") === slug);
        if (ev) {
            renderOccasionDetail(ev, false);
        }
        return;
    }

    // /about
    if (path === '/about') {
        document.getElementById('help-overlay').classList.add('open');
        return;
    }

    // /catalogue/cycle, /catalogue/occasion, /catalogue/key, /catalogue/bwv
    const catSortMatch = path.match(/^\/catalogue\/(cycle|occasion|key|bwv)$/);
    if (catSortMatch) {
        closeSheet(false);
        document.getElementById('occasion-backdrop').classList.remove('open');
        state.catalogueSort = catSortMatch[1];
        document.querySelectorAll('.sort-btn').forEach(b => b.classList.toggle('active', b.dataset.sort === state.catalogueSort));
        switchView('catalogue', false);
        return;
    }

    // /catalogue (bare — redirect to sort-specific), /votes, /insights
    const viewMatch = path.match(/^\/(catalogue|votes|insights)$/);
    if (viewMatch) {
        closeSheet(false);
        document.getElementById('occasion-backdrop').classList.remove('open');
        if (viewMatch[1] === 'catalogue') {
            history.replaceState({ view: 'catalogue' }, '', '/catalogue/' + state.catalogueSort);
        }
        switchView(viewMatch[1], false);
        return;
    }

    // Default: calendar home
    closeSheet(false);
    document.getElementById('occasion-backdrop').classList.remove('open');
    switchView('calendar', false);
}

// Show a backdrop overlay instantly (no slide transition) for direct URL loads
function showBackdropInstant(id) {
    const el = document.getElementById(id);
    el.style.transition = 'none';
    el.classList.add('open');
    // Re-enable transition after paint for subsequent close/open
    requestAnimationFrame(() => { el.style.transition = ''; });
}

window.addEventListener('popstate', () => handleRoute(false));

// Event delegation
document.addEventListener('click', function(e) {
    // Insights tag expand
    const insightsTag = e.target.closest('.insights-tag[data-tag-type]');
    if (insightsTag) {
        const type = insightsTag.dataset.tagType;
        const value = insightsTag.dataset.tagValue;
        const group = insightsTag.closest('.insights-tag-group');

        if (type === 'family') {
            // Multi-select with AND/intersection for instrumentation
            insightsTag.classList.toggle('active');
            const slot = group && group.querySelector('.insights-expand-slot');
            if (!slot) return;
            const activeTags = [...group.querySelectorAll('.insights-tag.active')].map(t => t.dataset.tagValue);
            if (activeTags.length === 0) {
                slot.innerHTML = '';
            } else {
                // Intersect: cantatas that have ALL selected instruments
                const sets = activeTags.map(tag => new Set((state.discoverMaps.family[tag] || []).map(c => c.bwv)));
                const intersection = [...sets[0]].filter(bwv => sets.every(s => s.has(bwv)));
                const items = (state.discoverMaps.family[activeTags[0]] || []).filter(c => intersection.includes(c.bwv));
                if (items.length === 0) {
                    slot.innerHTML = '<div class="search-hint">No cantatas match all selected instruments</div>';
                } else {
                    let expandHtml = '<div class="catalogue-section">';
                    for (const c of items) expandHtml += renderCatalogueItem(c);
                    expandHtml += '</div>';
                    slot.innerHTML = expandHtml;
                }
            }
        } else {
            // Single-select toggle for other tag types
            const wasActive = insightsTag.classList.contains('active');
            if (group) {
                group.querySelectorAll('.insights-tag.active').forEach(t => t.classList.remove('active'));
                const slot = group.querySelector('.insights-expand-slot');
                if (slot) slot.innerHTML = '';
            }
            if (!wasActive) {
                insightsTag.classList.add('active');
                const slot = group && group.querySelector('.insights-expand-slot');
                if (slot && state.discoverMaps[type] && state.discoverMaps[type][value]) {
                    const items = state.discoverMaps[type][value];
                    let expandHtml = '<div class="catalogue-section">';
                    for (const c of items) expandHtml += renderCatalogueItem(c);
                    expandHtml += '</div>';
                    slot.innerHTML = expandHtml;
                }
            }
        }
        return;
    }
    // Close sheet on backdrop click
    if (e.target.id === 'sheet-backdrop') {
        closeSheet(true);
        return;
    }
    // Video overlay
    const perfThumb = e.target.closest('.perf-thumb[data-video-id]');
    if (perfThumb) {
        const videoId = perfThumb.dataset.videoId;
        if (videoId) {
            document.getElementById('video-embed').innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
            document.getElementById('video-overlay').classList.add('open');
        }
        return;
    }
    if (e.target.closest('#close-video-btn') || (e.target.id === 'video-overlay')) {
        document.getElementById('video-overlay').classList.remove('open');
        document.getElementById('video-embed').innerHTML = '';
        return;
    }
    // Home link
    const homeLink = e.target.closest('.top-bar-home');
    if (homeLink) { e.preventDefault(); switchView('calendar'); return; }
    // About/help overlay
    if (e.target.closest('#open-help')) { openAbout(); return; }
    if (e.target.closest('#close-help') || (e.target.closest('.help-overlay') && !e.target.closest('.help-content'))) { closeAbout(); return; }
    // Search overlay
    if (e.target.closest('#open-search')) { openSearch(); return; }
    if (e.target.closest('#close-search')) { closeSearch(); return; }
    // Search result click
    const resultItem = e.target.closest('.search-result-item');
    if (resultItem) {
        const bwv = resultItem.dataset.bwv;
        closeSearch();
        openSheet(bwv);
        return;
    }
    // Close occasion detail
    if (e.target.closest('#close-occasion-btn')) { closeOccasionDetail(); return; }
    // Occasion prev/next navigation
    const occNavBtn = e.target.closest('[data-occasion-nav]');
    if (occNavBtn) {
        const dir = occNavBtn.dataset.occasionNav;
        const occasions = state.allEvents.filter(ev => ev.cantatas && ev.cantatas.length > 0);
        const idx = occasions.findIndex(ev => ev.occasion === state.selectedEvent.occasion);
        const target = dir === 'prev' ? occasions[idx - 1] : occasions[idx + 1];
        if (target) renderOccasionDetail(target);
        return;
    }
    // Close sheet
    if (e.target.closest('#close-sheet-btn')) { closeSheet(true); return; }
    // BWV navigation in sheet
    const bwvNavBtn = e.target.closest('[data-open-bwv]');
    if (bwvNavBtn) { openSheet(bwvNavBtn.dataset.openBwv); return; }
    // Cycle navigation in cycle detail
    const cycleNavBtn = e.target.closest('[data-cycle-nav]');
    if (cycleNavBtn) { openCycleDetail(cycleNavBtn.dataset.cycleNav); return; }
    // Movement prev/next navigation
    const prevBtn = e.target.closest('#sheet-prev');
    const nextBtn = e.target.closest('#sheet-next');
    if (prevBtn || nextBtn) {
        const reader = document.getElementById('sheet-text-reader');
        if (!reader) return;
        const bwv = reader.dataset.bwv;
        const entry = state.nodesCache[bwv];
        if (!entry) return;
        let idx = parseInt(reader.dataset.idx);
        if (prevBtn && idx > 0) idx--;
        if (nextBtn && idx < entry.movements.length - 1) idx++;
        reader.dataset.idx = idx;
        reader.dataset.lang = 'de';
        renderMovement(bwv, idx);
        return;
    }
    // Movement dot click
    const dot = e.target.closest('.sheet-mvt-dot');
    if (dot) {
        const reader = document.getElementById('sheet-text-reader');
        if (!reader) return;
        const bwv = reader.dataset.bwv;
        const idx = parseInt(dot.dataset.idx);
        reader.dataset.idx = idx;
        reader.dataset.lang = 'de';
        renderMovement(bwv, idx);
        return;
    }
    // Translate toggle in sheet
    const translateBtn = e.target.closest('#sheet-translate');
    if (translateBtn) {
        const content = document.getElementById('sheet-text-content');
        if (!content) return;
        // Open Google Translate with the current text
        const text = content.textContent.trim();
        const url = `https://translate.google.com/?sl=de&tl=en&text=${encodeURIComponent(text)}&op=translate`;
        window.open(url, '_blank');
        return;
    }
    // Reading tab toggle
    const readingTab = e.target.closest('.reading-tab');
    if (readingTab) {
        const tab = readingTab.dataset.tab;
        document.querySelectorAll('.reading-tab').forEach(t => t.classList.remove('active'));
        readingTab.classList.add('active');
        ['de', 'de-modern', 'en'].forEach(id => {
            const el = document.getElementById('reading-' + id);
            if (el) el.classList.toggle('reading-hidden', id !== tab);
        });
        return;
    }
    // Cycle chip -- open cycle detail (anywhere in the app)
    const cycleChipInCard = e.target.closest('.chip.cycle-EARLY, .chip.cycle-C1, .chip.cycle-C2, .chip.cycle-C3, .chip.cycle-PICANDER, .chip.cycle-LATE, .chip.cycle-occasion');
    if (cycleChipInCard && !cycleChipInCard.dataset.scrollCycle && !cycleChipInCard.dataset.bwv) {
        const classes = cycleChipInCard.className;
        const cycleMatch = classes.match(/cycle-(EARLY|C1|C2|C3|PICANDER|LATE)/);
        if (cycleMatch) {
            if (cycleChipInCard.closest('#sheet-backdrop')) closeSheet(false);
            openCycleDetail(cycleMatch[1]);
            return;
        }
        // Occasion chip in cycle detail -- open occasion detail
        const occLink = cycleChipInCard.dataset.occasionLink;
        if (occLink) {
            const ev = state.allEvents.find(ev => ev.occasion === occLink);
            if (ev) {
                document.getElementById('occasion-backdrop').classList.remove('open');
                setTimeout(() => renderOccasionDetail(ev), 50);
            }
            return;
        }
    }
    // Occasion cantata card -- open sheet (but not if clicking vote or cycle chip)
    const occasionCard = e.target.closest('.occasion-cantata-card');
    if (occasionCard && !e.target.closest('.cantata-vote') && !e.target.closest('.chip')) {
        openSheet(occasionCard.dataset.bwv);
        return;
    }
    // Occasion link in sheet header -- open occasion detail
    const occasionLink = e.target.closest('.sheet-occasion-link');
    if (occasionLink) {
        e.preventDefault();
        const occ = occasionLink.dataset.occasion;
        const ev = state.allEvents.find(e => e.occasion === occ);
        if (ev) {
            closeSheet(false);
            renderOccasionDetail(ev);
        }
        return;
    }
    // Intercept BWV link clicks -- open detail sheet instead
    const bwvLink = e.target.closest('.cantata-bwv a');
    if (bwvLink) {
        e.preventDefault();
        const bwvText = bwvLink.textContent.trim();
        openSheet(bwvText);
        return;
    }
    // Vote buttons
    const btn = e.target.closest('.cantata-vote');
    if (btn) {
        const { occasion, bwv } = btn.dataset;
        if (bwv) toggleVote(occasion || '', bwv, btn);
        return;
    }
    // Cycle nav badge in catalogue -- scroll to section in cycle view, open detail in other views
    const cycleNavBadge = e.target.closest('[data-scroll-cycle]');
    if (cycleNavBadge) {
        const cycleKey = cycleNavBadge.dataset.scrollCycle;
        if (state.catalogueSort === 'cycle') {
            const container = document.getElementById('catalogue-content');
            const target = document.getElementById('cat-cycle-' + cycleKey);
            if (target && container) container.scrollTo({ top: target.offsetTop - container.offsetTop, behavior: 'smooth' });
        } else {
            openCycleDetail(cycleKey);
        }
        return;
    }
    // Key nav chip scroll
    const keyChip = e.target.closest('[data-scroll-key]');
    if (keyChip) {
        const container = document.getElementById('catalogue-content');
        const target = document.getElementById('cat-key-' + keyChip.dataset.scrollKey);
        if (target && container) container.scrollTo({ top: target.offsetTop - container.offsetTop, behavior: 'smooth' });
        return;
    }
    // Season nav chip scroll
    const seasonChip = e.target.closest('[data-scroll-season]');
    if (seasonChip) {
        const container = document.getElementById('catalogue-content');
        const target = document.getElementById('cat-season-' + seasonChip.dataset.scrollSeason);
        if (target && container) container.scrollTo({ top: target.offsetTop - container.offsetTop, behavior: 'smooth' });
        return;
    }
    // BWV nav chip scroll
    const bwvChip = e.target.closest('[data-scroll-bwv]');
    if (bwvChip) {
        const container = document.getElementById('catalogue-content');
        const target = document.getElementById('cat-' + bwvChip.dataset.scrollBwv);
        if (target && container) container.scrollTo({ top: target.offsetTop - container.offsetTop, behavior: 'smooth' });
        return;
    }
    // Catalogue occasion heading -- open occasion detail
    const catOccLink = e.target.closest('.catalogue-occasion-link');
    if (catOccLink) {
        const occ = catOccLink.dataset.occasion;
        const ev = state.allEvents.find(e => e.occasion === occ);
        if (ev) renderOccasionDetail(ev);
        return;
    }
    // Catalogue cycle heading -- open cycle detail
    const catCycleLink = e.target.closest('.catalogue-cycle-link');
    if (catCycleLink) {
        const cycleKey = catCycleLink.dataset.cycle;
        if (cycleKey) openCycleDetail(cycleKey);
        return;
    }
    // Sort toggle
    const sortBtn = e.target.closest('.sort-btn');
    if (sortBtn) {
        document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
        sortBtn.classList.add('active');
        state.catalogueSort = sortBtn.dataset.sort;
        renderCatalogue('');
        // Show/hide sort-specific navs
        document.getElementById('cycle-nav').classList.toggle('active', state.catalogueSort === 'cycle');
        document.getElementById('key-nav').classList.toggle('active', state.catalogueSort === 'key');
        document.getElementById('occasion-nav').classList.toggle('active', state.catalogueSort === 'occasion');
        document.getElementById('bwv-nav').classList.toggle('active', state.catalogueSort === 'bwv');
        history.pushState({ view: 'catalogue' }, '', '/catalogue/' + state.catalogueSort);
        return;
    }
    // Nav tabs
    const navItem = e.target.closest('.nav-item[data-view]');
    if (navItem) {
        switchView(navItem.dataset.view);
        return;
    }
    // Mode toggle
    const modeBtn = e.target.closest('.mode-btn[data-mode]');
    if (modeBtn) {
        setCalendarMode(modeBtn.dataset.mode);
        return;
    }
    // Hero nav arrows
    if (e.target.closest('#hero-prev')) { navigateHero(-1); return; }
    if (e.target.closest('#hero-next-btn')) { navigateHero(1); return; }
    // Hero cantata card -- open cantata detail
    const heroCard = e.target.closest('.hero-cantata-card[data-bwv]');
    if (heroCard) {
        openSheet(heroCard.dataset.bwv);
        return;
    }
    // Hero occasion name -- open occasion detail
    const heroOccasion = e.target.closest('.hero-next-occasion[data-occasion-idx]');
    if (heroOccasion) {
        const ev = state.allEvents[parseInt(heroOccasion.dataset.occasionIdx)];
        if (ev) renderOccasionDetail(ev);
        return;
    }
    // Schedule BWV chip -- jump directly to cantata detail
    const schedBwvChip = e.target.closest('.schedule-cantatas .chip[data-bwv]');
    if (schedBwvChip) {
        openSheet(schedBwvChip.dataset.bwv);
        return;
    }
    // Schedule occasion name -- open occasion detail
    const schedOccasion = e.target.closest('.schedule-occasion[data-occasion-idx]');
    if (schedOccasion) {
        const ev = state.allEvents[parseInt(schedOccasion.dataset.occasionIdx)];
        if (ev) renderOccasionDetail(ev);
        return;
    }
    // Calendar day clicks
    const day = e.target.closest('.calendar-day.has-event');
    if (day) {
        const [y, m, d] = day.dataset.date.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const ev = getEventForDate(date);
        if (ev) renderOccasionDetail(ev);
        return;
    }
    // Calendar nav
    if (e.target.closest('#cal-prev')) {
        calendarPrev();
    }
    if (e.target.closest('#cal-next')) {
        calendarNext();
    }
});

// Escape key closes overlays
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        if (document.getElementById('video-overlay').classList.contains('open')) {
            document.getElementById('video-overlay').classList.remove('open');
            document.getElementById('video-embed').innerHTML = '';
        } else if (document.getElementById('help-overlay').classList.contains('open')) {
            closeAbout();
        }
    }
});

// React to vote changes — update nav badge and re-render active view if needed
document.addEventListener('vote-changed', () => {
    const votes = getVotes();
    const total = Object.keys(votes).length;
    // Update nav badge
    const likeNav = document.querySelector('.nav-item[data-view="votes"] .nav-label');
    if (likeNav) likeNav.textContent = total > 0 ? `Like (${total})` : 'Like';
    // If Likes view is visible but NOT animating (sheet overlay triggered this), re-render
    const likesView = document.getElementById('view-votes');
    const sheetOpen = document.getElementById('sheet-backdrop').classList.contains('open');
    if (likesView.classList.contains('active') && sheetOpen) {
        renderVotesView();
    }
});

// Pre-show overlay immediately for detail URLs (before data loads)
(function preShowOverlay() {
    const path = location.pathname;
    if (path.match(/^\/cantata\/BWV/i)) {
        showBackdropInstant('sheet-backdrop');
    } else if (path.match(/^\/occasion\//) || path.match(/^\/cycle\//)) {
        showBackdropInstant('occasion-backdrop');
    }
})();

// Init -- wait for both calendar events AND reference data before rendering
Promise.all([loadCalendarYear(new Date().getFullYear()), referenceDataReady])
    .then(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Always initialize the base calendar view (hides other views, sets nav)
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const calView = document.getElementById('view-calendar');
        if (calView) calView.classList.add('active');
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const calNav = document.querySelector('.nav-item[data-view="calendar"]');
        if (calNav) calNav.classList.add('active');
        renderSchedule();

        // Route-aware init: open overlay if detail URL
        const path = location.pathname;
        if (path !== '/' && path !== '/calendar') {
            handleRoute();
        }

        state.currentMonth = state.selectedEvent ? new Date(state.selectedEvent.date) : today;
        history.replaceState({ view: 'calendar' }, '', location.pathname);
    })
    .catch(() => {
        document.getElementById('schedule-list').innerHTML =
            '<div class="empty-state"><span class="material-symbols-outlined">error</span><p>Could not load calendar. Run: npm run migrate && npm start</p></div>';
    });
