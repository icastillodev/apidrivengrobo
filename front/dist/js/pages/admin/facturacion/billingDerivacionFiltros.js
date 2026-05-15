import { API } from '../../../api.js';

/** Cache en memoria (recarga al volver a entrar en la página). */
let filtrosCache = null;

export function resetFiltrosAlcanceDerivacionCache() {
    filtrosCache = null;
}

export function getFiltrosAlcanceDerivacionCached() {
    return filtrosCache;
}

function toNumSet(arr) {
    const s = new Set();
    if (!Array.isArray(arr)) {
        return s;
    }
    for (const v of arr) {
        const n = parseInt(String(v), 10);
        if (Number.isFinite(n) && n > 0) {
            s.add(n);
        }
    }
    return s;
}

function emptyFiltros() {
    return {
        map: {},
        deptoIdsDerivados: new Set(),
        idUsrDerivados: new Set(),
        idProtDerivados: new Set(),
        deptoIdsLocal: new Set(),
        idUsrLocal: new Set(),
        idProtLocal: new Set(),
        deptoIdsFormularios: new Set(),
        idUsrFormularios: new Set(),
        idProtFormularios: new Set(),
        mapUsrDerivados: {},
        mapProtDerivados: {},
        tieneDerivadosPendientes: false,
    };
}

export async function fetchFiltrosAlcanceDerivacion() {
    if (filtrosCache) {
        return filtrosCache;
    }
    try {
        const res = await API.request('/billing/deptos-derivacion-origenes', 'GET');
        if (res.status !== 'success' || !res.data) {
            filtrosCache = emptyFiltros();
            return filtrosCache;
        }
        const d = res.data;
        const map = d.map && typeof d.map === 'object' ? d.map : {};
        const mapUsrDerivados = d.mapUsrDerivados && typeof d.mapUsrDerivados === 'object' ? d.mapUsrDerivados : {};
        const mapProtDerivados = d.mapProtDerivados && typeof d.mapProtDerivados === 'object' ? d.mapProtDerivados : {};
        filtrosCache = {
            map,
            deptoIdsDerivados: toNumSet(d.deptoIdsDerivados),
            idUsrDerivados: toNumSet(d.idUsrDerivados),
            idProtDerivados: toNumSet(d.idProtDerivados),
            deptoIdsLocal: toNumSet(d.deptoIdsLocal),
            idUsrLocal: toNumSet(d.idUsrLocal),
            idProtLocal: toNumSet(d.idProtLocal),
            deptoIdsFormularios: toNumSet(d.deptoIdsFormularios),
            idUsrFormularios: toNumSet(d.idUsrFormularios),
            idProtFormularios: toNumSet(d.idProtFormularios),
            mapUsrDerivados,
            mapProtDerivados,
            tieneDerivadosPendientes: !!d.tieneDerivadosPendientes,
        };
        return filtrosCache;
    } catch (e) {
        console.warn(e);
        filtrosCache = emptyFiltros();
        return filtrosCache;
    }
}

/**
 * Oculta el bloque de ámbito cobro si no hay derivación pendiente en la sede; en ese caso fuerza "todos".
 * @param {ReturnType<typeof emptyFiltros>} filtros
 */
export function aplicarVisibilidadColumnaFacturacionDerivacion(filtros) {
    const tiene = !!(filtros && filtros.tieneDerivadosPendientes);
    document.querySelectorAll('.col-facturacion-derivacion').forEach((el) => {
        el.classList.toggle('d-none', !tiene);
    });
    if (!tiene) {
        document.querySelectorAll('#sel-facturacion-derivacion').forEach((sel) => {
            if (sel) {
                sel.value = 'todos';
            }
        });
    }
}

export function getFacturacionDerivacionSeleccionFromDom() {
    const el = document.getElementById('sel-facturacion-derivacion');
    const v = el && el.value ? String(el.value).toLowerCase().trim() : 'todos';
    if (v === 'derivados' || v === 'institucionales') {
        return v;
    }
    return 'todos';
}

/**
 * Ámbito de organización (depto/protocolo) según el desplegable de la página.
 * @param {'filter-ambito-depto'|'filter-ambito-investigador'|'filter-ambito-protocolo'} [selectId]
 * @returns {'all'|'interno'|'externo'}
 */
export function getAmbitoInternoExternoFromDom(selectId = 'filter-ambito-depto') {
    const el = document.getElementById(selectId);
    const v = el && el.value ? String(el.value).toLowerCase().trim() : 'all';
    if (v === 'interno' || v === 'externo') {
        return v;
    }
    return 'all';
}
