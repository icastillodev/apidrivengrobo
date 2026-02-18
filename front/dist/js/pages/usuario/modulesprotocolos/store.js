export const store = {
    allData: { my: [], local: [], network: [] },
    formDataCache: null,
    currentTab: 'my', // 'my', 'local', 'network'
    currentPage: 1,
    rowsPerPage: 10,
    currentSearch: '',
    currentFilterType: 'all',
    currentUserInfo: { id: 0 },
    externalSpecies: [] // Temporal para creación externa
};

export function resetPagination() {
    store.currentPage = 1;
}