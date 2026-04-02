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

window.openMensajeriaComposeAlojamiento = async () => {
    const hist = AlojamientoState.currentHistoryData;
    const tc = window.txt?.comunicacion || {};
    const ta = window.txt?.alojamientos || {};
    if (!hist || hist.length === 0) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'warning', text: tc.msg_err_sin_dest || '' });
        }
        return;
    }
    const last = hist[hist.length - 1];
    const first = hist[0];
    let destId = parseInt(last.IdUsrA, 10);
    if (!destId || destId <= 0) {
        destId = parseInt(first.IdTitularProtocolo, 10);
    }
    if (!destId || destId <= 0) {
        const rowTit = hist.find((r) => parseInt(r.IdTitularProtocolo, 10) > 0);
        destId = rowTit ? parseInt(rowTit.IdTitularProtocolo, 10) : 0;
    }
    if (!destId || destId <= 0) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'warning', text: tc.msg_err_sin_dest || '' });
        }
        return;
    }
    const hid = parseInt(last.historia ?? first.historia, 10) || null;
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