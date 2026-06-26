import { state } from '../state.js';
import { getNode } from '../api.js';
import { getVotes, getListeningStats, renderStatsBlock, getCycleClass, getCycleFullName, formatDate } from '../components.js';
import { renderCatalogueItem } from './catalogue.js';
import { CYCLE_ORDER } from '../constants.js';

export function startEnrichQueue(priorityBwvs) {
    // Build queue: priority items first, then the rest
    const allBwvs = [];
    for (const section of state.catalogueData) {
        for (const it of section.items) allBwvs.push(it.bwv);
    }
    const rest = allBwvs.filter(b => !priorityBwvs.includes(b) && !state.tagsCache[b]);
    state.enrichQueue = [...priorityBwvs.filter(b => !state.tagsCache[b]), ...rest];
    state.enrichProgress = { done: Object.keys(state.tagsCache).length, total: allBwvs.length };
    if (!state.enrichRunning) runEnrichQueue();
}

async function runEnrichQueue() {
    state.enrichRunning = true;
    while (state.enrichQueue.length > 0) {
        const bwv = state.enrichQueue.shift();
        if (state.tagsCache[bwv] && state.tagsCache[bwv].opening) {
            state.enrichProgress.done++;
            continue;
        }
        try {
            await getNode(bwv);
        } catch (e) { /* skip failures */ }
        state.enrichProgress.done++;
        // Live refresh every 10 cantatas
        if (state.enrichProgress.done % 10 === 0 || state.enrichProgress.done >= state.enrichProgress.total) {
            if (document.getElementById('view-insights').classList.contains('active')) {
                renderInsightsView();
            }
        }
        // Small delay to avoid hammering the server
        await new Promise(r => setTimeout(r, 300));
    }
    state.enrichRunning = false;
    if (document.getElementById('view-insights').classList.contains('active')) {
        renderInsightsView();
    }
}

function scoreCantatas(pool, tagProfile, cycleCts, occasionCts, yearCts) {
    return pool.map(c => {
        let score = 0;
        if (cycleCts[c.cycle]) score += cycleCts[c.cycle] * 3;
        if (occasionCts[c.occasion]) score += occasionCts[c.occasion] * 2;
        const year = c.date ? c.date.substring(0, 4) : null;
        if (year && yearCts[year]) score += yearCts[year];
        const t = state.tagsCache[c.bwv];
        if (t) {
            if (t.opening && tagProfile[`opening:${t.opening}`]) score += tagProfile[`opening:${t.opening}`] * 2;
            if (t.key && tagProfile[`key:${t.key}`]) score += tagProfile[`key:${t.key}`] * 3;
            if (t.families) for (const f of t.families) {
                if (tagProfile[`family:${f}`]) score += tagProfile[`family:${f}`];
            }
        }
        score += Math.random() * 0.5;
        return { ...c, score };
    }).sort((a, b) => b.score - a.score);
}

// Insights / Recommender
export function renderInsightsView() {
    const container = document.getElementById('insights-content');
    const votes = getVotes();
    const allKeys = Object.keys(votes);

    // Gather all cantatas from catalogueData
    const allCantatas = [];
    for (const section of state.catalogueData) {
        for (const it of section.items) allCantatas.push(it);
    }

    const headerEl = document.getElementById('insights-header');

    if (allKeys.length === 0) {
        headerEl.innerHTML = '';
        container.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">hearing</span><p>Listen to some cantatas first</p><p class="empty-state-hint">Tap the ear icon when you\'ve listened, then the heart if you liked it</p></div>';
        if (allCantatas.length > 0) startEnrichQueue([]);
        return;
    }

    if (allCantatas.length === 0) {
        headerEl.innerHTML = '';
        container.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">insights</span><p>Loading...</p></div>';
        return;
    }

    // Separate heard vs liked
    const likedBwvs = new Set();
    const heardBwvs = new Set();
    for (const k of allKeys) {
        const bwv = k.split('|')[1];
        if (votes[k] === 2) likedBwvs.add(bwv);
        else if (votes[k] === 1) heardBwvs.add(bwv);
    }
    const knownBwvs = new Set([...likedBwvs, ...heardBwvs]);

    const liked = allCantatas.filter(c => likedBwvs.has(c.bwv));
    const heard = allCantatas.filter(c => heardBwvs.has(c.bwv));
    const unknown = allCantatas.filter(c => !knownBwvs.has(c.bwv));

    // Build profile from liked
    const cycleCounts = {};
    const occasionCounts = {};
    const yearCounts = {};
    for (const c of liked) {
        cycleCounts[c.cycle] = (cycleCounts[c.cycle] || 0) + 1;
        occasionCounts[c.occasion] = (occasionCounts[c.occasion] || 0) + 1;
        const year = c.date ? c.date.substring(0, 4) : null;
        if (year) yearCounts[year] = (yearCounts[year] || 0) + 1;
    }

    // --- Phase 1: Instant render (profile stats + cycle bar into fixed header) ---
    const stats = getListeningStats();
    const sortedCycles = Object.entries(cycleCounts).sort((a, b) => b[1] - a[1]);
    const topCycle = sortedCycles[0];
    headerEl.innerHTML = renderStatsBlock(stats);

    // Scrollable content area
    container.innerHTML = `<div id="insights-deferred"></div>`;

    // --- Phase 2: Deferred render (chunked to avoid blocking) ---
    const deferred = document.getElementById('insights-deferred');
    if (!deferred) return;

    // Pre-compute tag profiles synchronously (cheap)
    const likedTags = {};
    for (const c of liked) {
        const t = state.tagsCache[c.bwv];
        if (!t) continue;
        if (t.opening) likedTags[`opening:${t.opening}`] = (likedTags[`opening:${t.opening}`] || 0) + 1;
        if (t.key) likedTags[`key:${t.key}`] = (likedTags[`key:${t.key}`] || 0) + 1;
        if (t.families) for (const f of t.families) likedTags[`family:${f}`] = (likedTags[`family:${f}`] || 0) + 1;
    }
    const heardTags = {};
    for (const c of heard) {
        const t = state.tagsCache[c.bwv];
        if (!t) continue;
        if (t.opening) heardTags[`opening:${t.opening}`] = (heardTags[`opening:${t.opening}`] || 0) + 1;
        if (t.key) heardTags[`key:${t.key}`] = (heardTags[`key:${t.key}`] || 0) + 1;
        if (t.families) for (const f of t.families) heardTags[`family:${f}`] = (heardTags[`family:${f}`] || 0) + 1;
    }

    // Build render chunks — each appends its HTML in its own frame
    const chunks = [];

    // Chunk 1: Tag-based insights (opening + instrumentation)
    chunks.push(() => {
        const allEnriched = allCantatas.filter(c => state.tagsCache[c.bwv]);
        if (allEnriched.length === 0) return '';
        const openingMap = {};
        const keyMap = {};
        const familyMap = {};
        for (const c of allEnriched) {
            const t = state.tagsCache[c.bwv];
            if (t.opening) { (openingMap[t.opening] = openingMap[t.opening] || []).push(c); }
            if (t.key) { (keyMap[t.key] = keyMap[t.key] || []).push(c); }
            if (t.families) for (const f of t.families) { (familyMap[f] = familyMap[f] || []).push(c); }
        }
        state.discoverMaps = { opening: openingMap, key: keyMap, family: familyMap };

        let h = '';
        if (Object.keys(openingMap).length > 0) {
            h += `<div class="catalogue-super-header">By opening form</div>`;
            h += `<div class="insights-tag-group"><div class="insights-tags">`;
            const sortedOpenings = Object.entries(openingMap).sort((a, b) => b[1].length - a[1].length);
            for (const [form, items] of sortedOpenings) {
                h += `<span class="insights-tag" data-tag-type="opening" data-tag-value="${form}">${form} <small>(${items.length})</small></span>`;
            }
            h += `</div><div class="insights-expand-slot" data-expand-group="opening"></div></div>`;
        }
        if (Object.keys(familyMap).length > 0) {
            h += `<div class="catalogue-super-header">By instrumentation</div>`;
            h += `<div class="insights-tag-group"><div class="insights-tags">`;
            const sortedFamilies = Object.entries(familyMap).sort((a, b) => (state.familyLabels[a[0]] || a[0]).localeCompare(state.familyLabels[b[0]] || b[0]));
            for (const [fam, items] of sortedFamilies) {
                h += `<span class="insights-tag" data-tag-type="family" data-tag-value="${fam}">${state.familyLabels[fam] || fam} <small>(${items.length})</small></span>`;
            }
            h += `</div><div class="insights-expand-slot" data-expand-group="family"></div></div>`;
        }
        return h;
    });

    // Chunk 2: Recommendations based on liked
    chunks.push(() => {
        if (liked.length === 0) return '';
        const likedRecs = scoreCantatas(unknown, likedTags, cycleCounts, occasionCounts, yearCounts).slice(0, 6);
        let h = `<div class="catalogue-super-header">Because you liked</div>`;
        const reasons = [];
        if (topCycle) reasons.push(getCycleFullName(topCycle[0]));
        const topOpening = Object.entries(likedTags).filter(([k]) => k.startsWith('opening:')).sort((a, b) => b[1] - a[1])[0];
        if (topOpening) reasons.push(`${topOpening[0].replace('opening:', '')} openings`);
        if (reasons.length > 0) h += `<p class="section-subtitle">Based on your love for ${reasons.join(' and ')}</p>`;
        h += '<div class="catalogue-section">';
        for (const it of likedRecs) h += renderCatalogueItem(it);
        h += '</div>';
        return h;
    });

    // Chunk 3: Recommendations based on heard
    chunks.push(() => {
        if (heard.length === 0) return '';
        const heardCycleCounts = {};
        const heardOccasionCounts = {};
        const heardYearCounts = {};
        for (const c of heard) {
            heardCycleCounts[c.cycle] = (heardCycleCounts[c.cycle] || 0) + 1;
            heardOccasionCounts[c.occasion] = (heardOccasionCounts[c.occasion] || 0) + 1;
            const year = c.date ? c.date.substring(0, 4) : null;
            if (year) heardYearCounts[year] = (heardYearCounts[year] || 0) + 1;
        }
        const heardRecs = scoreCantatas(unknown, heardTags, heardCycleCounts, heardOccasionCounts, heardYearCounts).slice(0, 6);
        let h = `<div class="catalogue-super-header">Because you know</div>`;
        h += `<p class="section-subtitle">Similar to cantatas you've listened to</p>`;
        h += '<div class="catalogue-section">';
        for (const it of heardRecs) h += renderCatalogueItem(it);
        h += '</div>';
        return h;
    });

    // Chunk 4: Try something different + Upcoming
    chunks.push(() => {
        let h = '';
        const unexploredCycles = CYCLE_ORDER.filter(c => !cycleCounts[c] && !heard.some(hc => hc.cycle === c));
        if (unexploredCycles.length > 0) {
            h += `<div class="catalogue-super-header">Try something different</div>`;
            h += `<p class="section-subtitle">You haven't explored ${unexploredCycles.map(c => getCycleFullName(c)).join(', ')} yet</p>`;
            const unexploredCantatas = unknown.filter(c => unexploredCycles.includes(c.cycle));
            const shuffled = unexploredCantatas.sort(() => Math.random() - 0.5).slice(0, 6);
            h += '<div class="catalogue-section">';
            for (const it of shuffled) h += renderCatalogueItem(it);
            h += '</div>';
        }
        const now = new Date();
        const upcoming = state.allEvents.filter(e => new Date(e.date) > now).sort((a, b) => new Date(a.date) - new Date(b.date));
        const matchingUpcoming = upcoming.find(e => e.cantatas && e.cantatas.some(c => {
            const topCycles = sortedCycles.slice(0, 2).map(sc => sc[0]);
            return topCycles.includes(c.cycle);
        }));
        if (matchingUpcoming) {
            h += `<div class="catalogue-super-header">Coming up for you</div>`;
            h += `<p class="section-subtitle">${matchingUpcoming.occasion} \u00b7 ${formatDate(matchingUpcoming.date)}</p>`;
            h += '<div class="catalogue-section">';
            for (const c of matchingUpcoming.cantatas) {
                h += renderCatalogueItem({ bwv: c.bwv, title: c.title || '', cycle: c.cycle, occasion: matchingUpcoming.occasion });
            }
            h += '</div>';
        }
        return h;
    });

    // Flush chunks one per frame
    let i = 0;
    function flushNext() {
        if (i >= chunks.length) return;
        const html = chunks[i]();
        if (html) deferred.insertAdjacentHTML('beforeend', html);
        i++;
        requestAnimationFrame(flushNext);
    }
    requestAnimationFrame(flushNext);

    // Start background enrichment (liked first, then all)
    startEnrichQueue([...knownBwvs]);
}
