import { API } from '../../../api.js'; 
import { showLoader, hideLoader } from '../../../components/LoaderComponent.js';
import { store } from './store.js';
import { renderTable, updateStats } from './ui_render.js';
import { Auth } from '../../../auth.js'; 

export async function loadConfig() {
    // 1. OBTENER INST ID (Con fallbacks)
    let instId = Auth.getVal('instId');
    if (!instId) instId = localStorage.getItem('instId'); // Fallback manual
    
    console.log(`[CONFIG] Cargando configuración para InstID: ${instId}`);

    try {
        const res = await API.request(`/user/protocols/config?inst=${instId}`);
        store.formDataCache = res.data;
        
        // Activar pestañas si hay red
        if (store.formDataCache.has_network) {
            const tab = document.getElementById('tab-network-li'); if(tab) tab.classList.remove('d-none');
            const action = document.getElementById('action-network-li'); if(action) action.classList.remove('d-none');
            const ext = document.getElementById('action-create-external-li'); if(ext) ext.classList.remove('d-none');
            document.querySelectorAll('.opt-network').forEach(e => e.classList.remove('d-none'));
        }
    } catch (e) { console.error("[CONFIG] Error:", e); }
}

export async function loadData() {
    showLoader();
    
    // 2. OBTENER DATOS DE SESIÓN (Depuración)
    let instId = Auth.getVal('instId');
    let userId = Auth.getVal('userId');

    // FALLBACKS DE EMERGENCIA (Por si Auth falla)
    if (!instId) instId = localStorage.getItem('instId');
    if (!userId) userId = localStorage.getItem('userId') || localStorage.getItem('id');

    console.group("🔍 DIAGNÓSTICO DE CARGA DE DATOS");
    console.log("Institución ID:", instId);
    console.log("Usuario ID:", userId);
    console.log("URL Petición:", `/user/protocols/all-lists?inst=${instId}&uid=${userId}`);
    console.groupEnd();

    if (!userId || !instId) {
        console.error("⛔ DETENIDO: Faltan IDs críticos (User o Inst).");
        hideLoader();
        window.Swal.fire('Error de Datos', `No se detectó la sesión correctamente.\nUser: ${userId}, Inst: ${instId}`, 'error');
        return;
    }

    try {
        const res = await API.request(`/user/protocols/all-lists?inst=${instId}&uid=${userId}`);
        
        console.log("📡 RESPUESTA API:", res); // VERIFICAR QUÉ DEVUELVE EL SERVER

        if (res.status === 'success') {
            store.allData.my = res.data.my;
            store.allData.local = res.data.local;
            store.allData.network = res.data.network;
            
            console.log(`✅ Datos cargados: Mis=${res.data.my.length}, Local=${res.data.local.length}, Red=${res.data.network.length}`);
            
            updateStats();
            renderTable();
        } else {
            console.error("❌ API devolvió error:", res.message);
        }
    } catch (e) { console.error("❌ Error en petición data:", e); }
    hideLoader();
}

export async function fetchSpeciesDetails(id) {
    try {
        const res = await API.request(`/user/protocols/species-detail?id=${id}`);
        return (res.status === 'success') ? res.data : [];
    } catch (e) { return []; }
}