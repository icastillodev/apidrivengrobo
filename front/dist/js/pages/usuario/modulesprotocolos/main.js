import { store } from './store.js';
import { loadConfig, loadData } from './api_service.js';
import { applyFilters, updateSearchInputType, switchView } from './ui_render.js';
import { viewProtocol, viewAdminFeedback, downloadProtocolPDF } from './modals_view.js';
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
    if (badgeUser) badgeUser.innerText = store.currentUserInfo.id ? ((window.txt?.misprotocolos?.id_display) || 'ID: ') + store.currentUserInfo.id : (window.txt?.misprotocolos?.id_cargando || 'ID: Cargando...');

    await loadConfig();
    await loadData();

    document.getElementById('btn-search').onclick = applyFilters;
    document.getElementById('filter-type').addEventListener('change', updateSearchInputType);
    const searchInput = document.getElementById('search-input');
    if(searchInput) {
        searchInput.onkeyup = (e) => { if(e.key === 'Enter') applyFilters(); };
    }
    document.getElementById('form-new-prot').onsubmit = saveProtocol;

    const hash = (window.location.hash || '').replace('#', '');
    if (hash === 'network') {
        setTimeout(() => { switchView('network'); }, 150);
    } else if (hash === 'new') {
        setTimeout(() => { openNewProtocolModal(); }, 300);
    }

    const btnAyuda = document.getElementById('btn-ayuda-protocolos');
    if (btnAyuda) btnAyuda.onclick = openAyudaProtocolosModal;
    const linkAyudaInline = document.getElementById('link-ayuda-inline');
    if (linkAyudaInline) linkAyudaInline.onclick = openAyudaProtocolosModal;
}

function openAyudaProtocolosModal() {
    const content = document.getElementById('ayuda-protocolos-content');
    if (!content) return;
    const hasNetwork = !!(store.formDataCache && store.formDataCache.has_network);
    if (hasNetwork) {
        content.innerHTML = `
            <p class="small text-muted mb-3">Tu institución forma parte de una <strong>red</strong>. Podés tener protocolos disponibles de dos formas:</p>
            <ul class="small text-start mb-3">
                <li><strong>Solicitar Nuevo (Interno):</strong> Crear un protocolo en esta institución. Una vez aprobado por la administración, podrás usarlo en formularios y, si querés, <strong>solicitarlo en la red</strong> para usarlo en otras instituciones.</li>
                <li><strong>Solicitar en OTRA Institución (Red):</strong> Crear un nuevo protocolo que se gestionará en otra institución de la red.</li>
                <li><strong>Solicitar Aprobación en RED:</strong> Si ya tenés un protocolo propio <strong>aprobado y vigente</strong>, podés pedir que quede disponible en otras instituciones de la red. Solo aparecen protocolos que cumplan esos requisitos.</li>
            </ul>
            <div class="alert alert-secondary py-2 px-3 small text-start mb-0">
                <i class="bi bi-info-circle me-1"></i> <strong>Para usar la red</strong> necesitás al menos un protocolo propio aprobado y vigente. Si no tenés, creá uno con &quot;Solicitar Nuevo (Interno)&quot; y una vez aprobado podrás compartirlo en la red.
            </div>`;
    } else {
        content.innerHTML = `
            <p class="small text-muted mb-3">Tu institución <strong>no pertenece a una red</strong>.</p>
            <ul class="small text-start mb-0">
                <li><strong>Solicitar Nuevo (Interno):</strong> Creá un protocolo en esta institución. Una vez enviada la solicitud, la administración la revisará y, al aprobarla, podrás usar ese protocolo en formularios de animales, reactivos e insumos.</li>
            </ul>
            <p class="small text-muted mt-3 mb-0">Para usar formularios necesitás al menos un protocolo aprobado y vigente en esta institución.</p>`;
    }
    const modalEl = document.getElementById('modal-ayuda-protocolos');
    if (modalEl) new bootstrap.Modal(modalEl).show();
}

// Window Assignments
window.initUserProtocols = initUserProtocols;
window.switchView = switchView;
window.viewProtocol = viewProtocol;
window.viewAdminFeedback = viewAdminFeedback;
window.downloadProtocolPDF = downloadProtocolPDF;
window.openNewProtocolModal = openNewProtocolModal;
window.openEditProtocolModal = openEditProtocolModal;
window.openCreateExternalModal = openCreateExternalModal;
window.loadExternalConfig = loadExternalConfig;
window.addNewSpeciesRow = addNewSpeciesRow;
window.openNetworkRequestModal = openNetworkRequestModal;
window.openAyudaProtocolosModal = openAyudaProtocolosModal;
window.filterMyProtocols = filterMyProtocols;
window.showProtDetails = showProtDetails;
window.checkNetBtn = checkNetBtn;
window.sendNetworkRequest = sendNetworkRequest;