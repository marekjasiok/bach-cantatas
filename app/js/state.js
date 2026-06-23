// Shared mutable state — all modules import and mutate this object
export const state = {
    allEvents: [],
    currentMonth: new Date(),
    selectedEvent: null,
    calendarYear: new Date().getFullYear(),
    heroIdx: -1,
    cycleData: {},
    familyLabels: {},
    catalogueData: [],
    catalogueSort: 'cycle',
    calendarMode: 'schedule',
    nodesCache: {},
    heroCache: {},
    tagsCache: JSON.parse(localStorage.getItem('bach-tags') || '{}'),
    enrichQueue: [],
    enrichRunning: false,
    discoverMaps: { opening: {}, key: {}, family: {} },
    enrichProgress: { done: 0, total: 0 }
};

// Clear stale tags — force full re-enrichment (v6: granular instrument families)
if (!localStorage.getItem('bach-tags-v6')) {
    state.tagsCache = {};
    localStorage.setItem('bach-tags', '{}');
    localStorage.setItem('bach-tags-v6', '1');
}
