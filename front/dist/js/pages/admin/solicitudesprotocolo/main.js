import { loadRequests } from './api_service.js';
import { setupModal, openRequestDetails } from './modals_action.js';
import { Auth } from '../../../auth.js';

export async function initAdminRequests() {
    const instId = Auth.getVal('instId');
    const bread = document.getElementById('institucionbread');
    if(bread) bread.innerText = Auth.getVal('NombreInst') || 'Institución';

    if(!instId) {
        console.error("⛔ No hay ID de institución.");
        return;
    }

    await loadRequests();
    setupModal();
}

window.openRequestDetails = openRequestDetails;