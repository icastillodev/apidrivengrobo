import { API } from '../api.js';

/**
 * Adaptador para endpoints que usan `page` + `pageSize` en lugar de `limit` + `offset`.
 * `createAdminListPageCache` sigue pasando limit/offset en `extra`; aquí se convierten.
 *
 * @param {number} rowsPerPage tamaño de página por defecto
 * @param {Record<string, unknown>} extra p. ej. `{ limit, offset }` o `{ fullLoad: true }`
 */
export function offsetLimitToPagePageSizeQuery(rowsPerPage, extra = {}) {
    const p = new URLSearchParams();
    if (extra.fullLoad) {
        return p;
    }
    const limit = extra.limit != null ? Number(extra.limit) : rowsPerPage;
    const offset = extra.offset != null ? Number(extra.offset) : 0;
    const page = Math.max(1, Math.floor(offset / limit) + 1);
    p.set('page', String(page));
    p.set('pageSize', String(limit));
    return p;
}

/**
 * Igual que arriba pero el API espera `limit` (no `pageSize`). Ej.: `GET /support/tickets`.
 * Aplica techo 50 / suelo 5 alineado con `SupportTicketController`.
 */
export function offsetLimitToPageLimitQuery(rowsPerPage, extra = {}) {
    const p = new URLSearchParams();
    if (extra.fullLoad) {
        return p;
    }
    const rawLimit = extra.limit != null ? Number(extra.limit) : rowsPerPage;
    const limit = Math.min(50, Math.max(5, rawLimit));
    const offset = extra.offset != null ? Number(extra.offset) : 0;
    const page = Math.max(1, Math.floor(offset / limit) + 1);
    p.set('page', String(page));
    p.set('limit', String(limit));
    return p;
}

/**
 * Caché por número de página + prefetch en idle para bandejas admin (animales, insumos, reactivos, usuarios, noticias/POEs admin, soporte panel vía `offsetLimitToPagePageSizeQuery` / `offsetLimitToPageLimitQuery`).
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
            let rows = null;
            if (res?.status === 'success' && Array.isArray(res.data)) {
                rows = res.data;
            } else if (res?.status === 'success' && res.data && Array.isArray(res.data.items)) {
                rows = res.data.items;
            }
            if (rows) {
                pageCache.set(pageNum, rows);
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
