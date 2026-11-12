/**
 * GROBO: referencias de solo lectura que se repiten al abrir fichas.
 * Caché exclusivamente EN MEMORIA; no almacena saldo, órdenes ni datos
 * personales y se invalida automáticamente al cambiar el token.
 */
import { API } from '../api.js';

const TTL_MS = 45_000;
const MAX_INSTITUTIONS = 6;
const cache = new Map();
let lastToken = null;

/** No se persiste ni se imprime el token; solo se compara por identidad. */
function syncAuthenticatedScope() {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token') || '';
    if (token !== lastToken) {
        cache.clear();
        lastToken = token;
    }
}

export function invalidateReferenceDataCache() {
    cache.clear();
}

/**
 * Catálogo de departamentos para usuarios y formularios (sede de JWT).
 * @param {string|number} institutionId
 * @returns {Promise<{status:string,data?:Array}>}
 */
export function getDepartmentsCached(institutionId) {
    syncAuthenticatedScope();
    const id = Number(institutionId);
    if (!Number.isSafeInteger(id) || id <= 0) {
        return API.request('/deptos/list');
    }
    const key = String(id);
    const cached = cache.get(key);
    const now = Date.now();
    if (cached && now - cached.created < TTL_MS) {
        return cached.promise;
    }
    cache.delete(key);
    const entry = {created:now, promise:null};
    entry.promise = API.request('/deptos/list?inst=' + encodeURIComponent(key))
        .then(response => {
            // Respuestas fallidas/erróneas jamás se guardan.
            if (response?.status !== 'success' || !Array.isArray(response.data)) {
                if (cache.get(key) === entry) cache.delete(key);
            }
            return response;
        })
        .catch(error => {
            if (cache.get(key) === entry) cache.delete(key);
            throw error;
        });
    cache.set(key, entry);
    while (cache.size > MAX_INSTITUTIONS) {
        cache.delete(cache.keys().next().value);
    }
    return entry.promise;
}
