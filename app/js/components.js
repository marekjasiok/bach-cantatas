import { state } from './state.js';
import { CYCLE_ORDER, CYCLE_LABELS, CYCLE_COLORS } from './constants.js';

// Format date string for display (ISO -> user locale)
export function formatDate(dateStr) {
    if (!dateStr) return '';
    // Date object
    if (dateStr instanceof Date) {
        return dateStr.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    }
    // ISO full date: 1723-06-20
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    }
    // Year only: 1713
    if (/^\d{4}$/.test(dateStr)) return dateStr;
    // Approximate / free text — return as-is
    return dateStr;
}

export function getCycleLabel(cycle) {
    return CYCLE_LABELS[cycle] || cycle;
}

export function getCycleClass(cycle) {
    if (cycle.includes('EARLY')) return 'cycle-EARLY';
    if (cycle === 'PICANDER') return 'cycle-PICANDER';
    if (cycle.includes('LATE')) return 'cycle-LATE';
    if (cycle === 'C1') return 'cycle-C1';
    if (cycle === 'C2') return 'cycle-C2';
    if (cycle === 'C3') return 'cycle-C3';
    return 'cycle-MISC';
}

export function getCycleFullName(cycle) {
    if (state.cycleData[cycle]) return state.cycleData[cycle].short || state.cycleData[cycle].name || '';
    return '';
}

export function getCycleColor(cycle) {
    return CYCLE_COLORS[cycle] || CYCLE_COLORS['MISC'];
}

export function getImslpUrl(title, num) {
    if (!title) return `https://imslp.org/index.php?title=Special:Search&search=bach+cantata+bwv+${num}`;
    const formatted = title.replace(/\s+/g, '_').replace(/['']/g, "'");
    return `https://imslp.org/wiki/${encodeURIComponent(formatted)},_BWV_${num}_(Bach,_Johann_Sebastian)`;
}

// Voting persistence
export function getVotes() {
    return JSON.parse(localStorage.getItem('bach-votes') || '{}');
}

export function getListeningStats() {
    const votes = getVotes();
    const keys = Object.keys(votes);
    const likedBwvs = new Set();
    const heardBwvs = new Set();
    for (const k of keys) {
        const bwv = k.split('|')[1];
        if (votes[k] === 2 || votes[k] === true) likedBwvs.add(bwv);
        else if (votes[k] === 1) heardBwvs.add(bwv);
    }
    const knownBwvs = new Set([...likedBwvs, ...heardBwvs]);
    let totalInCatalogue = 0;
    for (const section of state.catalogueData) totalInCatalogue += section.items.length;

    // Cycle breakdown of liked
    const cycleCounts = {};
    for (const bwv of likedBwvs) {
        for (const section of state.catalogueData) {
            const item = section.items.find(c => c.bwv === bwv);
            if (item) { cycleCounts[item.cycle] = (cycleCounts[item.cycle] || 0) + 1; break; }
        }
    }

    return { liked: likedBwvs.size, listened: knownBwvs.size, toDiscover: totalInCatalogue - knownBwvs.size, cycleCounts };
}

export function renderStatsBlock(stats) {
    let html = `<div class="insights-profile">
        <div class="insights-stat"><span class="insights-stat-num">${stats.listened}</span><span class="insights-stat-label">listened</span></div>
        <div class="insights-stat"><span class="insights-stat-num">${stats.liked}</span><span class="insights-stat-label">liked</span></div>
        <div class="insights-stat"><span class="insights-stat-num">${stats.toDiscover}</span><span class="insights-stat-label">to discover</span></div>
    </div>`;

    if (stats.liked > 0) {
        html += `<div class="insights-bar">`;
        for (const c of CYCLE_ORDER) {
            const count = stats.cycleCounts[c] || 0;
            if (count === 0) continue;
            const pct = Math.round((count / stats.liked) * 100);
            html += `<div class="insights-bar-segment ${getCycleClass(c)}" style="width:${pct}%" title="${getCycleFullName(c)}: ${count}"></div>`;
        }
        html += `</div>`;
        html += `<div class="insights-bar-legend">`;
        for (const c of CYCLE_ORDER) {
            if (!stats.cycleCounts[c]) continue;
            html += `<span class="insights-legend-item"><span class="insights-legend-dot ${getCycleClass(c)}"></span>${getCycleFullName(c)} (${stats.cycleCounts[c]})</span>`;
        }
        html += `</div>`;
    }
    return html;
}

// Returns 0 (unheard), 1 (heard), or 2 (liked)
export function getVote(occasion, bwv) {
    const votes = getVotes();
    const direct = votes[occasion + '|' + bwv];
    if (direct) return direct === true ? 2 : direct; // legacy true -> liked
    for (const k of Object.keys(votes)) {
        if (k.endsWith('|' + bwv) && votes[k]) return votes[k] === true ? 2 : votes[k];
    }
    return 0;
}

export function voteIcon(voteState) {
    return voteState === 0 ? 'hearing' : 'favorite';
}

export function voteClass(voteState) {
    if (voteState === 2) return 'voted';
    if (voteState === 1) return 'heard';
    return '';
}

// For single-button contexts (sheet header): next logical target
export function voteNextTarget(voteState) {
    if (voteState === 0) return 1;
    if (voteState === 1) return 2;
    return 1; // state 2 → demote to 1
}

export function voteButton(occasion, bwv, voteState) {
    const safeOcc = occasion.replace(/"/g, '&quot;');
    const safeBwv = bwv.replace(/"/g, '&quot;');
    if (voteState === 1) {
        // Two buttons: ear filled (undo) + heart outlined (promote)
        return `<span class="vote-group" data-occasion="${safeOcc}" data-bwv="${safeBwv}">` +
            `<button class="cantata-vote heard" data-tooltip="Reset" data-occasion="${safeOcc}" data-bwv="${safeBwv}" data-target="0"><span class="material-symbols-outlined icon-filled">hearing</span></button>` +
            `<button class="cantata-vote" data-tooltip="I love it" data-occasion="${safeOcc}" data-bwv="${safeBwv}" data-target="2"><span class="material-symbols-outlined">favorite</span></button>` +
            `</span>`;
    }
    if (voteState === 2) {
        // Heart filled → demotes to state 1
        return `<button class="cantata-vote voted" data-tooltip="Unlike" data-occasion="${safeOcc}" data-bwv="${safeBwv}" data-target="1"><span class="material-symbols-outlined">favorite</span></button>`;
    }
    // State 0: ear outlined → promotes to state 1
    return `<button class="cantata-vote" data-tooltip="I know it" data-occasion="${safeOcc}" data-bwv="${safeBwv}" data-target="1"><span class="material-symbols-outlined">hearing</span></button>`;
}

export function cantataCard(occasion, bwv, title, cycle, opts) {
    const cardState = opts && opts.state !== undefined ? opts.state : getVote(occasion, bwv);
    const isMajor = opts && opts.major;
    const chip = opts && opts.chip
        ? opts.chip
        : `<div class="chip ${getCycleClass(cycle)}">${getCycleFullName(cycle)}</div>`;
    const majorLabel = isMajor ? '<span class="major-work-label">Major work</span>' : '';
    const majorClass = isMajor ? ' cantata-card--major' : '';
    return `<div class="cantata-card occasion-cantata-card${majorClass}" data-bwv="${bwv.replace(/"/g, '&quot;')}">
        <div class="cantata-info">
            <div class="cantata-bwv">BWV ${bwv}${majorLabel}</div>
            <div class="cantata-title">${title || getCycleFullName(cycle)}</div>
            ${chip}
        </div>
        ${voteButton(occasion, bwv, cardState)}
    </div>`;
}

export function toggleVote(occasion, bwv, btn) {
    const votes = getVotes();
    const key = occasion + '|' + bwv;
    const current = votes[key] || 0;
    const next = parseInt(btn.dataset.target);
    if (isNaN(next) || next === current) return;

    if (next === 0) delete votes[key];
    else votes[key] = next;
    localStorage.setItem('bach-votes', JSON.stringify(votes));

    // Grab the card reference before sync replaces DOM
    const onLikes = document.getElementById('view-votes').classList.contains('active');
    const card = btn.closest('.cantata-card');

    // Sync ALL vote buttons for this BWV across the entire page
    syncVoteButtons(occasion, bwv, next);

    // Animate on Like page
    if (onLikes && card) {
        animateCardOnLikesPage(card, current, next, occasion, bwv);
    }

    // Notify listeners (nav badge, other views)
    document.dispatchEvent(new CustomEvent('vote-changed', { detail: { occasion, bwv, state: next } }));
}

function syncVoteButtons(occasion, bwv, newState) {
    const safeBwv = bwv.replace(/"/g, '\\"');
    const newHtml = voteButton(occasion, bwv, newState);

    // Find all vote buttons and vote groups for this BWV
    const voteBtns = document.querySelectorAll(`.cantata-vote[data-bwv="${safeBwv}"]`);
    const voteGroups = document.querySelectorAll(`.vote-group[data-bwv="${safeBwv}"]`);

    for (const el of [...voteBtns, ...voteGroups]) {
        el.insertAdjacentHTML('afterend', newHtml);
        el.remove();
    }
}

function animateCardOnLikesPage(card, fromState, toState, occasion, bwv) {
    const container = document.getElementById('votes-content');

    // Animate card out of current section
    card.style.transition = 'opacity 0.25s ease, transform 0.25s ease, max-height 0.3s ease 0.05s';
    card.style.opacity = '0';
    card.style.transform = toState === 0 ? 'translateX(-20px)' : (toState > fromState ? 'translateY(-20px)' : 'translateY(20px)');
    card.style.maxHeight = card.offsetHeight + 'px';
    card.style.overflow = 'hidden';

    requestAnimationFrame(() => {
        card.style.maxHeight = '0';
        card.style.marginBottom = '0';
    });

    card.addEventListener('transitionend', () => {
        card.remove();

        // Update section headers and counts
        const allVotes = getVotes();
        const likedCount = Object.values(allVotes).filter(v => v === 2).length;
        const heardCount = Object.values(allVotes).filter(v => v === 1).length;
        const total = likedCount + heardCount;

        if (total === 0) {
            import('./views/likes.js').then(m => m.renderVotesView());
            return;
        }

        // Update summary
        const summary = container.querySelector('.votes-summary');
        if (summary) summary.innerHTML = `<div class="vote-count">${total}</div><div class="vote-label">cantata${total > 1 ? 's' : ''} you know</div>`;

        // If card moved between sections (not removed entirely), insert it in the target
        if (toState > 0) {
            // Find or create the target section
            let targetSection = null;
            let targetHeader = null;
            const headers = container.querySelectorAll('.section-header');
            const sections = container.querySelectorAll('.catalogue-section');

            const targetLabel = toState === 2 ? 'Liked' : 'Listened';
            const sourceLabel = fromState === 2 ? 'Liked' : 'Listened';

            headers.forEach((h, i) => {
                if (h.textContent.startsWith(targetLabel)) { targetHeader = h; targetSection = sections[i]; }
            });

            // Build the card item data
            let cycle = 'MISC', title = '', major = false;
            for (const section of state.catalogueData) {
                const catItem = section.items.find(c => c.bwv === bwv);
                if (catItem) { title = catItem.title; cycle = catItem.cycle; major = catItem.major || false; break; }
            }

            const newCardHtml = cantataCard(occasion, bwv, title, cycle, { state: toState, major });

            if (!targetSection) {
                // Create the section (it didn't exist yet)
                const count = toState === 2 ? likedCount : heardCount;
                const headerHtml = `<div class="section-header">${targetLabel} \u00b7 ${count}</div>`;
                const sectionHtml = `<div class="catalogue-section">${newCardHtml}</div>`;

                // Liked goes before Listened
                if (toState === 2) {
                    summary.insertAdjacentHTML('afterend', headerHtml + sectionHtml);
                } else {
                    container.insertAdjacentHTML('beforeend', headerHtml + sectionHtml);
                }
                targetSection = container.querySelector('.catalogue-section:last-of-type');
                if (toState === 2) targetSection = container.querySelectorAll('.catalogue-section')[0];
            } else {
                // Insert card into existing section
                targetSection.insertAdjacentHTML('beforeend', newCardHtml);
                // Update header count
                const count = toState === 2 ? likedCount : heardCount;
                targetHeader.textContent = `${targetLabel} \u00b7 ${count}`;
            }

            // Animate card in
            const newCard = targetSection.lastElementChild;
            newCard.style.opacity = '0';
            newCard.style.transform = toState > fromState ? 'translateY(20px)' : 'translateY(-20px)';
            newCard.style.transition = 'opacity 0.25s ease 0.05s, transform 0.25s ease 0.05s';
            requestAnimationFrame(() => {
                newCard.style.opacity = '1';
                newCard.style.transform = 'translateY(0)';
            });
        }

        // Update source section header count (or remove if empty)
        const updatedHeaders = container.querySelectorAll('.section-header');
        const updatedSections = container.querySelectorAll('.catalogue-section');
        updatedHeaders.forEach((h, i) => {
            const section = updatedSections[i];
            if (section && section.children.length === 0) {
                h.remove();
                section.remove();
            } else if (h.textContent.startsWith('Liked')) {
                h.textContent = `Liked \u00b7 ${likedCount}`;
            } else if (h.textContent.startsWith('Listened')) {
                h.textContent = `Listened \u00b7 ${heardCount}`;
            }
        });
    }, { once: true });
}
