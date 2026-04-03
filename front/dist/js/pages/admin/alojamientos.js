// dist/js/pages/admin/alojamientos.js
import { API } from '../../api.js';
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

// Base Path dinámico para compatibilidad Local / Producción
const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/';

// --- ESTADO GLOBAL (Fuente de Verdad) ---
export const AlojamientoState = {
    dataFull: [],
    currentHistoryData: [],
    instId: parseInt(localStorage.getItem('instId'))
};
if (typeof window !== 'undefined') window.__AlojamientoState = AlojamientoState;

export async function initAlojamientosPage() {
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

// Función global exportada para que otros módulos puedan recargar la grilla
export async function loadAlojamientos() {
    try {
        showLoader();
        const rawInst = AlojamientoState.instId;
        const inst = (typeof rawInst === 'number' && Number.isFinite(rawInst) && rawInst > 0) ? rawInst : null;
        const url = inst != null ? `/alojamiento/list?inst=${inst}` : '/alojamiento/list';
        const sep = url.includes('?') ? '&' : '?';
        const fullUrl = `${url}${sep}_=${Date.now()}`;

        const res = await API.request(fullUrl);

        if (res.status === 'success') {
            const raw = res.data;
            AlojamientoState.dataFull = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.data) ? raw.data : []);
        } else {
            AlojamientoState.dataFull = [];
        }

            TableUI.poblarFiltroEspecies?.();
        TableUI.render();
        if (res.status === 'success') refreshMenuNotifications();
    } catch (e) {
        console.error("Error cargando alojamientos:", e);
        AlojamientoState.dataFull = [];
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

// Función auxiliar global para el QR
window.verPaginaQR = async (historiaId = null) => {
    const id = historiaId || (AlojamientoState.currentHistoryData[0]?.historia);
    if (!id) return console.error("Sin ID de historia para QR.");
    
    try {
        // 1. Mostramos un pequeño loading porque vamos a hablar con el Backend
        const t = window.txt?.alojamientos;
        Swal.fire({ title: t?.qr_generating_link || 'Generando enlace seguro...', didOpen: () => Swal.showLoading() });

        // 2. Pedimos (o creamos) el token único de 6 letras para esta historia
        const res = await API.request('/alojamiento/generar-qr', 'POST', { historia: id });

        if (res.status === 'success' && res.codigo) {
            Swal.close();
            
            // 3. Abrimos la URL limpia, corta y pública (Ej: /qr/a8x2m9)
            const url = `${basePath}qr/${res.codigo}`;
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

function parseIdUsrAlojamientoRow(row) {
    if (!row || typeof row !== 'object') return 0;
    const raw =
        row.IdUsrResponsableAlojamiento ??
        row.idUsrResponsableAlojamiento ??
        row.IdUsrA ??
        row.idUsrA;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseIdTitularRow(row) {
    if (!row || typeof row !== 'object') return 0;
    const raw = row.IdTitularProtocolo ?? row.idTitularProtocolo;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * @param {number} [historiaIdDesdeModal] Id de historia pasado desde el footer del modal (más fiable que depender solo del último tramo).
 */
window.openMensajeriaComposeAlojamiento = async (historiaIdDesdeModal) => {
    const hist = AlojamientoState.currentHistoryData;
    const tc = window.txt?.comunicacion || {};
    const ta = window.txt?.alojamientos || {};
    if (!hist || hist.length === 0) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'warning', text: tc.msg_err_sin_dest || '' });
        }
        return;
    }
    const first = hist[0];
    const last = hist[hist.length - 1];

    let destId = 0;
    for (let i = hist.length - 1; i >= 0; i--) {
        const id = parseIdUsrAlojamientoRow(hist[i]);
        if (id > 0) {
            destId = id;
            break;
        }
    }
    if (!destId) {
        destId = parseIdTitularRow(first);
    }
    if (!destId) {
        const rowTit = hist.find((r) => parseIdTitularRow(r) > 0);
        destId = rowTit ? parseIdTitularRow(rowTit) : 0;
    }
    if (!destId) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'warning', text: tc.msg_err_sin_dest || '' });
        }
        return;
    }

    const hidFromArg = parseInt(historiaIdDesdeModal, 10);
    const hidFromData = parseInt(last.historia ?? first.historia, 10);
    const hid =
        Number.isFinite(hidFromArg) && hidFromArg > 0
            ? hidFromArg
            : Number.isFinite(hidFromData) && hidFromData > 0
              ? hidFromData
              : null;

    const asunto = `${tc.msg_asunto || ''} · ${ta.history_record || ''}${hid ? ' #' + hid : ''}`;
    await openMensajeriaCompose({
        destinatarioId: destId,
        origenTipo: 'alojamiento',
        origenId: hid,
        origenEtiqueta: hid ? `Historia #${hid}` : null,
        asunto,
        lockCategory: true
    });
};