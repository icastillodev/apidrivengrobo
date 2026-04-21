import { API } from '../api.js';

/**
 * Caché por número de página + prefetch en idle para bandejas admin (animales, insumos, reactivos).
 * Evita pedir al API miles de filas de una vez cuando hay cientos de páginas.
 *
 * @param {number} rowsPerPage
 * @param {(extra?: Record<string, unknown>) => URLSearchParams} buildListQuery Debe aceptar { fullLoad: true } sin limit/offset para la clave de filtros.
 * @param {string} listUrlPath Ruta sin "?", p. ej. "/animals/all"
 */
export function createAdminListPageCache(rowsPerPage, buildListQuery, listUrlPath) {
    /** @type {Map<number, object[]>} */
    const pageCache = new Map();
    let listGeneration = 0;
    /** @type {string|null} */
    let filtersKeyStored = null;

    function getFiltersKey() {
        return buildListQuery({ fullLoad: true }).toString();
    }

    /** Si cambian filtros u orden, invalida caché y devuelve la generación actual (para prefetch). */
    function syncFiltersKey() {
        const fk = getFiltersKey();
        if (filtersKeyStored !== fk) {
            listGeneration += 1;
            pageCache.clear();
            filtersKeyStored = fk;
        }
        return listGeneration;
    }

    function fetchPage(pageNum) {
        const q = buildListQuery({
            limit: rowsPerPage,
            offset: (pageNum - 1) * rowsPerPage,
        });
        return API.request(`${listUrlPath}?${q.toString()}`);
    }

    async function prefetchPage(pageNum, gen) {
        if (gen !== listGeneration || pageCache.has(pageNum)) return;
        try {
            const res = await fetchPage(pageNum);
            if (gen !== listGeneration) return;
            if (res?.status === 'success' && Array.isArray(res.data)) {
                pageCache.set(pageNum, res.data);
            }
        } catch (e) {
            console.warn('[adminListPrefetch]', listUrlPath, 'página', pageNum, e);
        }
    }

    function schedulePrefetchAround(totalRows, centerPage, gen) {
        if (totalRows <= rowsPerPage) return;
        const totalPages = Math.ceil(totalRows / rowsPerPage);
        const candidates = [centerPage + 1, centerPage + 2, centerPage + 3, centerPage - 1]
            .filter((p) => p >= 1 && p <= totalPages && !pageCache.has(p));
        const run = () => {
            candidates.slice(0, 5).forEach((p) => {
                void prefetchPage(p, gen);
            });
        };
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(run, { timeout: 2200 });
        } else {
            setTimeout(run, 60);
        }
    }

    /** Misma búsqueda/filtros pero los datos en BD cambiaron (p. ej. borrar formulario). */
    function bustPages() {
        listGeneration += 1;
        pageCache.clear();
    }

    return {
        getFiltersKey,
        syncFiltersKey,
        bustPages,
        pageCache,
        getGeneration: () => listGeneration,
        fetchPage,
        prefetchPage,
        schedulePrefetchAround,
    };
}
