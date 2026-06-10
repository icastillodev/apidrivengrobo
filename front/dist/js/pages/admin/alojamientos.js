// dist/js/pages/admin/alojamientos.js
import { API, buildQrAlojamientoPublicPageRelativeUrl } from '../../api.js';
import { hideLoader, showLoader } from '../../components/LoaderComponent.js';
import { refreshMenuNotifications } from '../../components/MenuComponent.js';

// Importación de Submódulos
import { TableUI } from './alojamientos/TableUI.js';
import { HistorialUI } from './alojamientos/HistorialUI.js';
import { TramosUI } from './alojamientos/TramosUI.js';
import { RegistroUI } from './alojamientos/RegistroUI.js';
import { ExportUI } from './alojamientos/ExportUI.js';
import { TrazabilidadUI } from './alojamientos/trazabilidad.js';
import { hasTrazabilidadAlojamientosForUser } from '../../modulesAccess.js';
import { openMensajeriaCompose } from '../../utils/mensajeriaCompose.js';

function resolveAlojamientosInstId() {
    const raw = localStorage.getItem('instId') || sessionStorage.getItem('instId');
    const n = parseInt(String(raw || ''), 10);
    return Number.isFinite(n) && n > 0 ? n : NaN;
}

// --- ESTADO GLOBAL (Fuente de Verdad) ---
export const AlojamientoState = {
    dataFull: [],
    currentHistoryData: [],
    /** Metadatos de cobro del listado (`trazabilidad_habilitada`, etc.). */
    listCobro: {},
    instId: resolveAlojamientosInstId(),
    /** Última historia con modal de ficha abierta correctamente (para QR / PDF sin pasar ID en onclick). */
    historiaContextoQR: null
};
if (typeof window !== 'undefined') window.__AlojamientoState = AlojamientoState;

export async function initAlojamientosPage() {
    AlojamientoState.instId = resolveAlojamientosInstId();
    TableUI.init();
    HistorialUI.init();
    TramosUI.init();
    RegistroUI.init();
    ExportUI.init();

    await loadAlojamientos();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'nuevo') {
        setTimeout(() => {
            const btnNuevo = document.getElementById('btn-nuevo-alojamiento'); 
            if (btnNuevo) btnNuevo.click();
        }, 600);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

/** @param {{ resetPagination?: boolean }} [options] Si `resetPagination`, vuelve a la página 1 (útil tras crear una historia nueva). */
export async function loadAlojamientos(options = {}) {
    const resetPagination = options.resetPagination === true;
    try {
        const hasGlobal = !!document.getElementById('global-loader');
        if (!hasGlobal) {
            showLoader();
        } else {
            showLoader({ upgradeOnly: true, staticPhrase: '' });
        }
        AlojamientoState.instId = resolveAlojamientosInstId();
        const rawInst = AlojamientoState.instId;
        const inst = (typeof rawInst === 'number' && Number.isFinite(rawInst) && rawInst > 0) ? rawInst : null;
        const url = inst != null ? `/alojamiento/list?inst=${inst}` : '/alojamiento/list';
        const sep = url.includes('?') ? '&' : '?';
        const fullUrl = `${url}${sep}_=${Date.now()}`;

        const res = await API.request(fullUrl);

        if (res.status === 'success') {
            const raw = res.data;
            AlojamientoState.dataFull = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.data) ? raw.data : []);
            AlojamientoState.listCobro = res.cobro || {};
        } else {
            AlojamientoState.dataFull = [];
            AlojamientoState.listCobro = {};
            const t = window.txt?.alojamientos;
            const msg = (res.message && String(res.message).trim()) || t?.err_carga_lista || '';
            if (msg && typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'warning', text: msg });
            }
        }

            if (resetPagination) {
                TableUI.currentPage = 1;
                TableUI._lastSpeciesIdsKey = null;
                TableUI._lastFilterKey = null;
            }
            TableUI.poblarFiltroEspecies?.();
        TableUI.render();
        if (res.status === 'success') refreshMenuNotifications();
    } catch (e) {
        console.error("Error cargando alojamientos:", e);
        AlojamientoState.dataFull = [];
        AlojamientoState.listCobro = {};
        const t = window.txt?.alojamientos;
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'error', text: t?.err_carga_lista || '' });
        }
            if (resetPagination) {
                TableUI.currentPage = 1;
                TableUI._lastSpeciesIdsKey = null;
                TableUI._lastFilterKey = null;
            }
            TableUI.poblarFiltroEspecies?.();
        TableUI.render();
    } finally {
        hideLoader();
    }
}
window.toggleTrazabilidad = (idAlojamiento, idEspecie) => {
    const roleOpen = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel') || '0', 10);
    if (!hasTrazabilidadAlojamientosForUser(roleOpen)) return;
    TrazabilidadUI.toggleRow(idAlojamiento, idEspecie);
};

/** ID de historia positivo para QR (argumento, contexto de modal, dataset, último historial cargado). */
function resolveHistoriaIdForQR(explicit) {
    const toPosInt = (v) => {
        const n = parseInt(String(v ?? '').trim(), 10);
        return Number.isFinite(n) && n > 0 ? n : null;
    };
    let id = toPosInt(explicit);
    if (id) return id;
    id = toPosInt(AlojamientoState.historiaContextoQR);
    if (id) return id;
    const modal = document.getElementById('modal-historial');
    id = toPosInt(modal?.dataset?.historia ?? modal?.getAttribute?.('data-historia'));
    if (id) return id;
    // Fallback extra: si por algún motivo no se seteó dataset/historiaContextoQR,
    // intentamos leer el # de historia desde el resumen renderizado en el modal.
    const badge = document.querySelector('#historial-summary .badge');
    const badgeTxt = (badge?.textContent || '').trim();
    // Ej: "#123" -> 123
    id = toPosInt(badgeTxt.replace(/[^0-9]/g, ''));
    if (id) return id;
    const row = AlojamientoState.currentHistoryData?.[0];
    if (row && typeof row === 'object') {
        id = toPosInt(
            row.historia ??
                row.Historia ??
                row.HISTORIA ??
                row.idHistoria ??
                row.IdHistoria ??
                row.id_historia
        );
    }
    return id;
}

// Función auxiliar global para el QR
window.verPaginaQR = async (historiaId = null) => {
    const id = resolveHistoriaIdForQR(historiaId);
    if (!id) {
        const t = window.txt?.alojamientos;
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'info', text: t?.qr_sin_historia || 'Abra primero el historial de una estadía o use el botón QR en la tabla.' });
        } else {
            console.error('Sin ID de historia para QR.');
        }
        return;
    }
    
    try {
        // 1. Mostramos un pequeño loading porque vamos a hablar con el Backend
        const t = window.txt?.alojamientos;
        Swal.fire({ title: t?.qr_generating_link || 'Generando enlace seguro...', didOpen: () => Swal.showLoading() });

        // 2. Pedimos (o creamos) el token único de 6 letras para esta historia
        const res = await API.request('/alojamiento/generar-qr', 'POST', { historia: id });

        if (res.status === 'success' && res.codigo) {
            Swal.close();
            
            // URL explícita a la página QR (compatible sin rewrite nginx en /qr/:code).
            const url = buildQrAlojamientoPublicPageRelativeUrl(res.codigo);
            window.open(url, 'Ficha QR', 'width=700,height=700,menubar=no,toolbar=no');
        } else {
            throw new Error(res.message || (t?.qr_error_token || "Error al generar el token de seguridad."));
        }
    } catch (error) {
        console.error(error);
        const t = window.txt?.alojamientos;
        Swal.fire('Error', t?.qr_error_link || 'No se pudo generar el enlace del QR.', 'error');
    }
};

function parsePositiveUserId(raw) {
    const n = parseInt(String(raw ?? '').trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

/** IdUsrA del alojamiento (responsable de la estadía), último tramo con dato válido. */
export function resolveDestinatarioAlojamiento(tramos, historiaId = null) {
    const rows = Array.isArray(tramos) ? tramos : [];
    const state = (typeof window !== 'undefined' && window.__AlojamientoState) ? window.__AlojamientoState : AlojamientoState;

    const pickFromRow = (row) => {
        if (!row || typeof row !== 'object') return 0;
        const candidates = [
            row.IdUsrResponsableAlojamiento,
            row.idUsrResponsableAlojamiento,
            row.IdUsrA,
            row.idUsrA,
            row.idusuario,
            row.IdUsuario,
        ];
        for (const c of candidates) {
            const id = parsePositiveUserId(c);
            if (id) return id;
        }
        return 0;
    };

    for (let i = rows.length - 1; i >= 0; i--) {
        const id = pickFromRow(rows[i]);
        if (id) return id;
    }

    const hid = parsePositiveUserId(historiaId);
    if (hid) {
        const list = state.dataFull || [];
        const rowList = list.find((r) => parsePositiveUserId(r.historia ?? r.Historia ?? r.HISTORIA) === hid);
        const idList = pickFromRow(rowList);
        if (idList) return idList;
    }

    return 0;
}

function pickUserIdFromRow(row) {
    if (!row || typeof row !== 'object') return 0;
    const candidates = [
        row.IdUsrResponsableAlojamiento,
        row.idUsrResponsableAlojamiento,
        row.IdUsrA,
        row.idUsrA,
        row.idusuario,
        row.IdUsuario,
    ];
    for (const c of candidates) {
        const id = parsePositiveUserId(c);
        if (id) return id;
    }
    return 0;
}

/** Nombre del responsable del alojamiento (IdUsrA), último tramo que coincide con destId. */
export function resolveDestinatarioNombreAlojamiento(tramos, destId, historiaId = null) {
    const id = parsePositiveUserId(destId);
    if (!id) return '';
    const rows = Array.isArray(tramos) ? tramos : [];
    const state = (typeof window !== 'undefined' && window.__AlojamientoState) ? window.__AlojamientoState : AlojamientoState;

    for (let i = rows.length - 1; i >= 0; i--) {
        const row = rows[i];
        if (pickUserIdFromRow(row) !== id) continue;
        const nom = row.nombre_responsable ?? row.NombreResponsable;
        if (nom && String(nom).trim()) return String(nom).trim();
        const inv = row.Investigador;
        if (inv && String(inv).trim() && inv !== 'Sin Investigador') return String(inv).trim();
    }

    const hid = parsePositiveUserId(historiaId);
    if (hid) {
        const rowList = (state.dataFull || []).find(
            (r) => parsePositiveUserId(r.historia ?? r.Historia ?? r.HISTORIA) === hid
        );
        if (rowList && pickUserIdFromRow(rowList) === id) {
            const inv = rowList.Investigador;
            if (inv && String(inv).trim() && inv !== 'Sin Investigador') return String(inv).trim();
        }
    }

    return '';
}

/**
 * @param {number} [historiaIdDesdeModal] Id de historia pasado desde el footer del modal.
 * @param {number} [destIdExplicit] IdUsrA del responsable (tramo vigente), embebido en el botón del modal.
 */
window.openMensajeriaComposeAlojamiento = async (historiaIdDesdeModal, destIdExplicit) => {
    const state = (typeof window !== 'undefined' && window.__AlojamientoState) ? window.__AlojamientoState : AlojamientoState;
    const hist = state.currentHistoryData || [];
    const tc = window.txt?.comunicacion || {};
    const ta = window.txt?.alojamientos || {};

    let destId = parsePositiveUserId(destIdExplicit);
    if (!destId) {
        destId = resolveDestinatarioAlojamiento(hist, historiaIdDesdeModal);
    }
    if (!destId) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'warning', text: tc.msg_err_sin_dest || '' });
        }
        return;
    }

    const first = hist[0] || {};
    const last = hist[hist.length - 1] || first;
    const hidFromArg = parseInt(historiaIdDesdeModal, 10);
    const hidFromData = parseInt(last.historia ?? first.historia, 10);
    const hid =
        Number.isFinite(hidFromArg) && hidFromArg > 0
            ? hidFromArg
            : Number.isFinite(hidFromData) && hidFromData > 0
              ? hidFromData
              : null;

    const asunto = `${tc.msg_asunto || ''} · ${ta.history_record || ''}${hid ? ' #' + hid : ''}`;
    const destinatarioNombre = resolveDestinatarioNombreAlojamiento(hist, destId, historiaIdDesdeModal);
    await openMensajeriaCompose({
        destinatarioId: destId,
        destinatarioNombre,
        origenTipo: 'alojamiento',
        origenId: hid,
        origenEtiqueta: hid ? `Historia #${hid}` : null,
        asunto,
        lockCategory: true
    });
};