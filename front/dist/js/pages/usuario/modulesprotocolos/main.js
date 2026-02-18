import { store } from './store.js';
import { loadConfig, loadData } from './api_service.js';
import { applyFilters, updateSearchInputType, switchView } from './ui_render.js';
import { viewProtocol, viewAdminFeedback } from './modals_view.js';
import { openNewProtocolModal, openEditProtocolModal, openCreateExternalModal, loadExternalConfig, addNewSpeciesRow, saveProtocol } from './modals_form.js';
import { openNetworkRequestModal, filterMyProtocols, showProtDetails, checkNetBtn, sendNetworkRequest } from './modals_network.js';
// IMPORTAMOS TU AUTH
import { Auth } from '../../../auth.js'; 

export async function initUserProtocols() {
    // 1. Usar Auth para obtener datos de contexto
    const instName = Auth.getVal('NombreInst') || 'Institución';
    const bread = document.getElementById('institucionbread');
    if(bread) bread.innerText = instName;

    // 2. OBTENCIÓN ROBUSTA DEL ID (Usando tu Auth helper)
    const uid = Auth.getVal('userId');

    if(!uid) {
        console.error("CRÍTICO: No hay usuario en sesión (Auth.getVal devolvió null)");
        // Opcional: Auth.logout(); 
        return;
    }
    
    // Guardar en store para uso interno del módulo
    store.currentUserInfo.id = uid;
    
    const badgeUser = document.getElementById('current-user-display');
    if(badgeUser) badgeUser.innerText = `ID: ${store.currentUserInfo.id}`;

    await loadConfig();
    await loadData();

    document.getElementById('btn-search').onclick = applyFilters;
    document.getElementById('filter-type').addEventListener('change', updateSearchInputType);
    const searchInput = document.getElementById('search-input');
    if(searchInput) {
        searchInput.onkeyup = (e) => { if(e.key === 'Enter') applyFilters(); };
    }
    document.getElementById('form-new-prot').onsubmit = saveProtocol;
}

// Window Assignments
window.initUserProtocols = initUserProtocols;
window.switchView = switchView;
window.viewProtocol = viewProtocol;
window.viewAdminFeedback = viewAdminFeedback;
window.openNewProtocolModal = openNewProtocolModal;
window.openEditProtocolModal = openEditProtocolModal;
window.openCreateExternalModal = openCreateExternalModal;
window.loadExternalConfig = loadExternalConfig;
window.addNewSpeciesRow = addNewSpeciesRow;
window.openNetworkRequestModal = openNetworkRequestModal;
window.filterMyProtocols = filterMyProtocols;
window.showProtDetails = showProtDetails;
window.checkNetBtn = checkNetBtn;
window.sendNetworkRequest = sendNetworkRequest;