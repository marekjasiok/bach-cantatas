import { state } from './state.js';

// Load calendar for a given year from the API
export async function loadCalendarYear(year) {
    state.calendarYear = year;
    const resp = await fetch(`/api/calendar/${year}`);
    const data = await resp.json();
    state.allEvents = data.events.map(ev => ({
        date: new Date(ev.date),
        occasion: ev.occasion,
        cantatas: ev.cantatas.map(c => ({
            cycle: c.cycle,
            bwv: c.bwv,
            title: c.title || '',
            major: c.major || false,
            url: `https://en.wikipedia.org/wiki/BWV_${c.bwv}`
        }))
    }));
    return state.allEvents;
}

export function downloadICS() {
    window.open(`/api/calendar/${state.calendarYear}/ics`, '_blank');
}

// Node cache — stores full cantata data fetched on demand
export async function getNode(bwvStr) {
    if (state.nodesCache[bwvStr]) return state.nodesCache[bwvStr];
    try {
        const resp = await fetch(`/api/cantata/${bwvStr}/enrich`);
        if (!resp.ok) return null;
        const result = await resp.json();
        state.nodesCache[bwvStr] = result.node || result;
        // Extract tags for insights
        extractTags(bwvStr, state.nodesCache[bwvStr]);
        return state.nodesCache[bwvStr];
    } catch (e) { return null; }
}

export function saveTags() {
    localStorage.setItem('bach-tags', JSON.stringify(state.tagsCache));
}

export function extractTags(bwv, node) {
    if (!node) return;
    const tags = state.tagsCache[bwv] || {};

    // Key — from node directly or parse from wiki summary
    if (node.key) {
        tags.key = node.key;
    } else if (!tags.key && node.wiki && node.wiki.summary) {
        const keyMatch = node.wiki.summary.match(/\bin\s+([A-G](?:[♯♭#]|-?flat|-?sharp)?)\s*(major|minor)/i);
        if (keyMatch) {
            let note = keyMatch[1].replace(/-?flat/i, '♭').replace(/-?sharp/i, '♯').replace('#', '♯');
            tags.key = note.charAt(0).toUpperCase() + note.slice(1) + ' ' + keyMatch[2].toLowerCase();
        }
    }

    // Opening form
    if (!tags.opening && node.features) {
        tags.opening = node.features.opening || null;
    }

    // Structure
    if (!tags.structure && node.features && node.features.structure) {
        tags.structure = node.features.structure;
        tags.movements = node.features.structure.length;
    }

    // Instrumentation families (always update from node)
    if (node.features && node.features.instrumentation_families) {
        tags.families = node.features.instrumentation_families;
    }

    // Scoring string
    if (!tags.scoring && node.scoring) {
        tags.scoring = node.scoring;
    }

    // Voice profile
    if (!tags.voices && node.features && node.features.voice_profile) {
        tags.voices = Object.keys(node.features.voice_profile);
    }

    // Edges from node
    if (!tags.edges && node.edges && Object.keys(node.edges).length > 0) {
        tags.edges = node.edges;
    }

    state.tagsCache[bwv] = tags;
    saveTags();
}
