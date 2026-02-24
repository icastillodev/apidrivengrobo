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

// Base Path dinámico para compatibilidad Local / Producción
const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/';

// --- ESTADO GLOBAL (Fuente de Verdad) ---
export const AlojamientoState = {
    dataFull: [],
    currentHistoryData: [],
    instId: parseInt(localStorage.getItem('instId'))
};
export async function initAlojamientosPage() {
    // Inicializar listeners y configuraciones de cada submódulo
    TableUI.init();
    HistorialUI.init();
    TramosUI.init();
    RegistroUI.init();
    ExportUI.init();

    await loadAlojamientos();

    // MAGIA IA: Detectar si la IA pide crear nuevo alojamiento
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
        const res = await API.request(`/alojamiento/list?inst=${AlojamientoState.instId}`);
        if (res.status === 'success') {
            AlojamientoState.dataFull = res.data;
            TableUI.render();
            refreshMenuNotifications(); 
        }
    } catch (e) {
        console.error("Error cargando alojamientos:", e);
    } finally {
        hideLoader();
    }
}
window.toggleTrazabilidad = (idAlojamiento, idEspecie) => {
    TrazabilidadUI.toggleRow(idAlojamiento, idEspecie);
};

// Función auxiliar global para el QR
window.verPaginaQR = (historiaId = null) => {
    const id = historiaId || (AlojamientoState.currentHistoryData[0]?.historia);
    if (!id) return console.error("Sin ID de historia para QR.");
    
    // Usamos el basePath absoluto en lugar del relativo ../../ para evitar errores de rutas
    const url = `${basePath}paginas/qr-alojamiento.html?historia=${id}`;
    window.open(url, 'Ficha QR', 'width=700,height=700,menubar=no,toolbar=no');
};