import { state } from '../state.js';
import { loadCalendarYear } from '../api.js';
import { cantataCard, getCycleClass, getCycleColor } from '../components.js';
import { getOccasionDescription, getOccasionWikiUrl } from './occasion.js';

export function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function getEventForDate(date) {
    return state.allEvents.find(e => isSameDay(e.date, date));
}

// Calendar rendering
export function renderCalendar() {
    const container = document.getElementById('calendar-widget');
    const year = state.currentMonth.getFullYear();
    const month = state.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = (firstDay.getDay() + 6) % 7; // Monday = 0
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dayNames = ['Mo','Tu','We','Th','Fr','Sa','Su'];

    let grid = dayNames.map(d => `<div class="day-header">${d}</div>`).join('');

    // Previous month padding
    const prevMonth = new Date(year, month, 0);
    for (let i = startDow - 1; i >= 0; i--) {
        const day = prevMonth.getDate() - i;
        grid += `<div class="calendar-day other-month">${day}</div>`;
    }

    // Current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(year, month, d);
        const ev = getEventForDate(date);
        const isToday = isSameDay(date, today);
        const isSelected = state.selectedEvent && isSameDay(date, state.selectedEvent.date);
        let classes = 'calendar-day';
        if (ev) classes += ' has-event';
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';

        let dots = '';
        if (ev && ev.cantatas && ev.cantatas.length > 0) {
            const uniqueCycles = [...new Set(ev.cantatas.map(c => c.cycle))];
            dots = '<div class="event-dots">' +
                uniqueCycles.slice(0, 4).map(c => `<div class="event-dot" style="background:${getCycleColor(c)}"></div>`).join('') +
                '</div>';
        }

        grid += `<div class="${classes}" data-date="${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}">${d}${dots}</div>`;
    }

    // Next month padding
    const totalCells = startDow + lastDay.getDate();
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
        grid += `<div class="calendar-day other-month">${d}</div>`;
    }

    container.innerHTML = `
        <div class="calendar-nav">
            <button id="cal-prev"><span class="material-symbols-outlined">chevron_left</span></button>
            <span class="calendar-month-label">${monthNames[month]} ${year}</span>
            <button id="cal-next"><span class="material-symbols-outlined">chevron_right</span></button>
        </div>
        <div class="calendar-grid">${grid}</div>`;
}

// Schedule view
export function renderSchedule() {
    const container = document.getElementById('schedule-list');
    const heroEl = document.getElementById('hero-next');
    if (!state.allEvents || state.allEvents.length === 0) {
        container.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">event_busy</span><p>No events loaded</p></div>';
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

    // Find next upcoming event (default hero)
    if (state.heroIdx < 0) {
        for (let i = 0; i < state.allEvents.length; i++) {
            if (state.allEvents[i].date >= today) { state.heroIdx = i; break; }
        }
        if (state.heroIdx < 0) state.heroIdx = state.allEvents.length - 1;
    }

    renderHeroCard(heroEl, state.heroIdx, today, dayNames);
    renderScheduleList(container, state.heroIdx, today, monthNames, dayNames);
}

export function renderHeroCard(heroEl, idx, today, dayNames) {
    if (idx < 0 || !heroEl) return;
    const ev = state.allEvents[idx];
    const d = ev.date;
    const daysUntil = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
    let label = 'Next Occasion';
    if (daysUntil === 0) label = 'Today';
    else if (daysUntil === 1) label = 'Tomorrow';
    else if (daysUntil <= 7 && daysUntil > 0) label = 'This ' + dayNames[d.getDay()];
    else if (daysUntil < 0) label = 'Past Occasion';

    const dateStr = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const description = getOccasionDescription(ev.occasion) || '';
    const wikiUrl = getOccasionWikiUrl(ev.occasion);

    const cantataCards = (ev.cantatas || []).map(c =>
        cantataCard(ev.occasion, c.bwv, c.title, c.cycle, c.major ? { major: true } : undefined)
    ).join('');

    const prevDisabled = idx <= 0 ? ' disabled' : '';
    const nextDisabled = idx >= state.allEvents.length - 1 ? ' disabled' : '';

    heroEl.innerHTML = `<div class="hero-next">
        <div class="hero-nav">
            <button class="hero-nav-btn" id="hero-prev"${prevDisabled}><span class="material-symbols-outlined">chevron_left</span></button>
            <button class="hero-nav-btn" id="hero-next-btn"${nextDisabled}><span class="material-symbols-outlined">chevron_right</span></button>
        </div>
        <div class="hero-next-img" id="hero-next-img"></div>
        <div class="hero-next-content">
            <div class="hero-next-label">${label}</div>
            <div class="hero-next-occasion" data-occasion-idx="${idx}">${ev.occasion}</div>
            <div class="hero-next-date">${dateStr}</div>
            ${description ? `<div class="hero-next-desc">${description}</div>` : ''}
            <div class="hero-next-label hero-next-label--spaced">Cantatas for this occasion</div>
            <div class="cantata-list">${cantataCards}</div>
        </div>
    </div>`;

    // Load hero image from Wikipedia
    if (wikiUrl) {
        const pageName = wikiUrl.split('/wiki/')[1];
        fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageName)}`)
            .then(r => r.json()).then(data => {
                const imgUrl = data.thumbnail ? data.thumbnail.source : null;
                const imgEl = document.getElementById('hero-next-img');
                if (imgUrl && imgEl) {
                    imgEl.style.backgroundImage = `url(${imgUrl})`;
                    imgEl.classList.add('loaded');
                }
            }).catch(() => {});
    }
}

export function renderScheduleList(container, currentHeroIdx, today, monthNames, dayNames) {
    const renderItem = (ev, idx, isPast) => {
        const d = ev.date;
        const chips = (ev.cantatas || []).map(c =>
            `<span class="chip ${getCycleClass(c.cycle)}" data-bwv="${c.bwv}">BWV ${c.bwv}</span>`
        ).join('');
        return `<div class="schedule-item${isPast ? ' past' : ''}" data-occasion-idx="${idx}" id="schedule-ev-${idx}">
            <div class="schedule-date">
                <div class="schedule-date-month">${monthNames[d.getMonth()]}</div>
                <div class="schedule-date-day">${d.getDate()}</div>
            </div>
            <div class="schedule-body">
                <div class="schedule-weekday">${dayNames[d.getDay()]}</div>
                <div class="schedule-occasion" data-occasion-idx="${idx}">${ev.occasion}</div>
                <div class="schedule-cantatas">${chips}</div>
            </div>
        </div>`;
    };

    let html = '';
    // Past events
    for (let i = 0; i < state.allEvents.length; i++) {
        if (state.allEvents[i].date >= today) continue;
        html += renderItem(state.allEvents[i], i, true);
    }
    // Divider
    html += `<div class="section-header" id="coming-up-anchor">Coming Up</div>`;
    // Future events
    for (let i = 0; i < state.allEvents.length; i++) {
        if (state.allEvents[i].date < today) continue;
        html += renderItem(state.allEvents[i], i, false);
    }

    container.innerHTML = html;

    // Auto-scroll to the event AFTER the hero card
    const scrollTarget = currentHeroIdx + 1 < state.allEvents.length
        ? document.getElementById(`schedule-ev-${currentHeroIdx + 1}`)
        : document.getElementById('coming-up-anchor');
    if (scrollTarget) {
        setTimeout(() => {
            container.scrollTop = scrollTarget.offsetTop - container.offsetTop;
        }, 50);
    }
}

export function navigateHero(direction) {
    const newIdx = state.heroIdx + direction;
    if (newIdx < 0 || newIdx >= state.allEvents.length) return;
    state.heroIdx = newIdx;
    const heroEl = document.getElementById('hero-next');
    const container = document.getElementById('schedule-list');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    renderHeroCard(heroEl, state.heroIdx, today, dayNames);
    // Update schedule scroll
    const scrollTarget = state.heroIdx + 1 < state.allEvents.length
        ? document.getElementById(`schedule-ev-${state.heroIdx + 1}`)
        : document.getElementById('coming-up-anchor');
    if (scrollTarget && container) {
        container.scrollTop = scrollTarget.offsetTop - container.offsetTop;
    }
}

// Toggle schedule/calendar mode
export function setCalendarMode(mode) {
    state.calendarMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    document.getElementById('schedule-container').classList.toggle('calendar-mode-hidden', mode !== 'schedule');
    document.getElementById('calendar-container').classList.toggle('calendar-mode-hidden', mode !== 'calendar');
    if (mode === 'calendar') renderCalendar();
    if (mode === 'schedule') renderSchedule();
}

// Calendar navigation handlers
export function calendarPrev() {
    state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
    if (state.currentMonth.getFullYear() !== state.calendarYear) {
        loadCalendarYear(state.currentMonth.getFullYear()).then(() => renderCalendar());
    } else { renderCalendar(); }
}

export function calendarNext() {
    state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
    if (state.currentMonth.getFullYear() !== state.calendarYear) {
        loadCalendarYear(state.currentMonth.getFullYear()).then(() => renderCalendar());
    } else { renderCalendar(); }
}
