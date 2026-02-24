// Archivo: dist/js/pages/superadmin/dashboard_superadmin.js
import { API } from '../../api.js';

export async function initSuperDashboard() {
    try {
        console.log("Solicitando estadísticas a la API...");
        const res = await API.request('/superadmin/global-stats'); 
        
        if (res && res.status === 'success') {
            console.log("✅ Estadísticas cargadas correctamente.");
            document.getElementById('stat-sedes').innerText = res.data.totalSedes || 0;
            document.getElementById('stat-usuarios').innerText = res.data.totalUsuarios || 0;
            document.getElementById('stat-protocolos').innerText = res.data.totalProtocolos || 0;
        } else {
            console.error("❌ El backend respondió, pero con error:", res);
            mostrarErrorStats();
        }
    } catch (error) {
        console.error("❌ Fallo crítico al llamar a la API de estadísticas:", error);
        mostrarErrorStats();
    }
}

function mostrarErrorStats() {
    ['stat-sedes', 'stat-usuarios', 'stat-protocolos'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerText = "Err";
    });
}