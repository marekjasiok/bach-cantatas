import { state } from '../state.js';
import { cantataCard, getVotes, getListeningStats, renderStatsBlock } from '../components.js';

// Votes view
export function renderVotesView() {
    const container = document.getElementById('votes-content');
    const votes = getVotes();
    const keys = Object.keys(votes);

    if (keys.length === 0) {
        container.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">hearing</span><p>No cantatas yet</p><p class="empty-state-hint">Tap the ear icon when you\'ve listened to a cantata</p></div>';
        return;
    }

    // Flatten votes and sort by BWV number
    const allItems = keys.map(key => {
        const [occasion, bwv] = key.split('|');
        let cycle = 'MISC';
        let title = '';
        let major = false;
        const ev = state.allEvents.find(e => e.occasion === occasion);
        if (ev && ev.cantatas) {
            const match = ev.cantatas.find(c => c.bwv === bwv);
            if (match) { cycle = match.cycle; title = match.title || ''; major = match.major || false; }
        }
        if (!title || cycle === 'MISC') {
            for (const section of state.catalogueData) {
                const catItem = section.items.find(c => c.bwv === bwv);
                if (catItem) { title = title || catItem.title; cycle = cycle === 'MISC' ? catItem.cycle : cycle; major = major || catItem.major || false; break; }
            }
        }
        return { occasion, bwv, cycle, title, major, state: votes[key] };
    }).sort((a, b) => parseInt(a.bwv.replace(/\D/g, '')) - parseInt(b.bwv.replace(/\D/g, '')));

    const liked = allItems.filter(i => i.state === 2);
    const heard = allItems.filter(i => i.state === 1);

    // Fixed header: stats + cycle bar
    const headerEl = document.getElementById('votes-header');
    headerEl.innerHTML = renderStatsBlock(getListeningStats());

    // Scrollable content: cards
    let html = '';
    if (liked.length > 0) {
        html += `<div class="catalogue-section-header">Liked</div>`;
        html += '<div class="catalogue-section">';
        for (const item of liked) html += cantataCard(item.occasion, item.bwv, item.title, item.cycle, { state: item.state, major: item.major });
        html += '</div>';
    }

    if (heard.length > 0) {
        html += `<div class="catalogue-section-header">Listened</div>`;
        html += '<div class="catalogue-section">';
        for (const item of heard) html += cantataCard(item.occasion, item.bwv, item.title, item.cycle, { state: item.state, major: item.major });
        html += '</div>';
    }

    container.innerHTML = html;
}
