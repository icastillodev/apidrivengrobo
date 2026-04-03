/**
 * Módulos contratados por institución (snapshot en login: sessionStorage.instModulos).
 * Alineado con App\Utils\ModulosInstitucion (API).
 */

export const MENU_ID_TO_MODULE = {
    3: 'animales',
    4: 'reactivos',
    5: 'insumos',
    6: 'reservas',
    7: 'alojamientos',
    10: '_forms_any',
    11: '_forms_any',
    12: 'alojamientos',
    14: 'reservas',
};

function getSessionHybrid(key) {
    return sessionStorage.getItem(key) || localStorage.getItem(key);
}

export function getInstModulesSnapshot() {
    try {
        const raw = getSessionHybrid('instModulos');
        if (!raw) return { byKey: {}, list: [], invHasData: null };
        const o = JSON.parse(raw);
        const inv = o.invHasData && typeof o.invHasData === 'object' ? o.invHasData : null;
        return {
            byKey: o.byKey && typeof o.byKey === 'object' ? o.byKey : {},
            list: Array.isArray(o.list) ? o.list : [],
            invHasData: inv,
        };
    } catch {
        return { byKey: {}, list: [], invHasData: null };
    }
}

export function setInstModulesSnapshot(snap) {
    if (!snap || typeof snap !== 'object') return;
    const payload = { byKey: snap.byKey || {}, list: snap.list || [] };
    if (snap.invHasData && typeof snap.invHasData === 'object') {
        payload.invHasData = snap.invHasData;
    }
    const s = JSON.stringify(payload);
    sessionStorage.setItem('instModulos', s);
    try {
        localStorage.setItem('instModulos', s);
    } catch {
        /* ignore quota */
    }
}

export async function ensureInstModulesLoaded(apiRequest) {
    if (getSessionHybrid('instModulos')) return;
    if (typeof apiRequest !== 'function') return;
    try {
        const res = await apiRequest('/session/modulos', 'GET');
        if (res && res.status === 'success' && res.data) {
            setInstModulesSnapshot(res.data);
        }
    } catch {
        /* sin sesión o error: menú usará snapshot vacío */
    }
}

function estadoParaKey(byKey, key) {
    const v = byKey[key];
    return v !== undefined && v !== null ? parseInt(v, 10) : 1;
}

function rolEsAdminSede(roleId) {
    return [1, 2, 4].includes(parseInt(roleId, 10));
}

/** Investigador / asistente / lab: no admin sede ni Gecko maestro. */
export function esRolInvestigadorVisibilidadModulos(roleId) {
    const r = parseInt(roleId, 10);
    if (Number.isNaN(r) || r <= 0 || r === 1) return false;
    return !rolEsAdminSede(r);
}

/**
 * Módulo visible en menú / rutas panel: contratado o (investigador con datos propios previos).
 */
export function investigadorVeModuloEnMenu(moduleKey, byKey, roleId, invHasData) {
    const est = estadoParaKey(byKey, moduleKey);
    if (rolPuedeModulo(est, roleId)) return true;
    if (!esRolInvestigadorVisibilidadModulos(roleId) || !invHasData || typeof invHasData !== 'object') {
        return false;
    }
    return !!invHasData[moduleKey];
}

export function rolPuedeModulo(estadoLogico, roleId) {
    const e = parseInt(estadoLogico, 10);
    const r = parseInt(roleId, 10);
    if (Number.isNaN(e) || e <= 1) return false;
    if (e >= 3) return true;
    return rolEsAdminSede(r);
}

export function anyFormularioActivo(byKey, roleId) {
    const { invHasData } = getInstModulesSnapshot();
    return anyFormularioActivoOlegacyInv(byKey, roleId, invHasData);
}

export function anyFormularioActivoOlegacyInv(byKey, roleId, invHasData) {
    const keys = ['animales', 'reactivos', 'insumos'];
    if (keys.some((k) => rolPuedeModulo(estadoParaKey(byKey, k), roleId))) return true;
    if (!esRolInvestigadorVisibilidadModulos(roleId) || !invHasData || typeof invHasData !== 'object') {
        return false;
    }
    return keys.some((k) => !!invHasData[k]);
}

/**
 * @param {number[]} ids
 * @param {number} roleId
 * @param {number} instId
 */
export function filterMenuIdsByModulos(ids, roleId, instId) {
    const r = parseInt(roleId, 10);
    const inst = parseInt(instId, 10);
    // GeckoDev (1), Superadmin sede (2), Admin (4): menú completo; el API sigue aplicando permisos reales.
    if (inst <= 0 || [1, 2, 4].includes(r)) return ids;

    const { byKey, invHasData } = getInstModulesSnapshot();
    const out = [];

    (ids || []).forEach((id) => {
        const mid = parseInt(id, 10);
        const mk = MENU_ID_TO_MODULE[mid];
        if (!mk) {
            out.push(mid);
            return;
        }
        if (mk === '_forms_any') {
            if (anyFormularioActivoOlegacyInv(byKey, r, invHasData)) out.push(mid);
            return;
        }
        if (investigadorVeModuloEnMenu(mk, byKey, r, invHasData)) out.push(mid);
    });

    return [...new Set(out)];
}

const PATH_RULES = [
    { path: 'panel/misformularios', anyOf: ['animales', 'reactivos', 'insumos'] },
    { path: 'panel/misalojamientos', keys: ['alojamientos'] },
    { path: 'panel/misreservas', keys: ['reservas'] },
    { path: 'panel/misprotocolos', keys: [] },
    { path: 'panel/mensajes', keys: [] },
    { path: 'panel/soporte', keys: [] },
    { path: 'panel/ventas', keys: [] },
    { path: 'panel/capacitacion', keys: [] },
];

export function pathVisibleForModules(path, roleId) {
    const p = String(path || '').replace(/\.html$/i, '').replace(/^\//, '');
    const r = parseInt(roleId, 10);
    if ([1, 2, 4].includes(r)) {
        return true;
    }
    const { byKey, invHasData } = getInstModulesSnapshot();

    const rule = PATH_RULES.find((x) => p === x.path || p.startsWith(`${x.path}/`));
    if (!rule) return true;
    if (!rule.keys?.length && !rule.anyOf?.length) return true;
    if (rule.anyOf && rule.anyOf.length) {
        return rule.anyOf.some((k) => investigadorVeModuloEnMenu(k, byKey, r, invHasData));
    }
    return rule.keys.every((k) => investigadorVeModuloEnMenu(k, byKey, r, invHasData));
}

/** Módulo trazabilidad (árbol biológico en alojamientos). */
export function hasTrazabilidadAlojamientosForUser(roleId) {
    const r = parseInt(roleId, 10);
    if ([1, 2, 4].includes(r)) return true;
    const { byKey, invHasData } = getInstModulesSnapshot();
    return investigadorVeModuloEnMenu('trazabilidad_alojamientos', byKey, r, invHasData);
}

/**
 * Pantalla config roles (solo perfiles 5 y 6): ocultar ítems no contratados o solo-admin.
 */
export function menuIdVisibleInRolesConfig(menuId, targetRoleId) {
    const mid = parseInt(menuId, 10);
    const tr = parseInt(targetRoleId, 10);
    const mk = MENU_ID_TO_MODULE[mid];
    if (!mk) return true;

    const { byKey } = getInstModulesSnapshot();
    if (mk === '_forms_any') {
        return ['animales', 'reactivos', 'insumos'].some((k) =>
            rolPuedeModulo(estadoParaKey(byKey, k), 3)
        );
    }
    const est = estadoParaKey(byKey, mk);
    if (est <= 1) return false;
    if (tr >= 5 && est === 2) return false;
    return true;
}
