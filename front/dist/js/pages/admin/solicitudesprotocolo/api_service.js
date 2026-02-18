import { API } from '../../../api.js';
import { renderTable } from './ui_render.js';
import { Auth } from '../../../auth.js';

export async function loadRequests() {
    const instId = Auth.getVal('instId');
    const table = document.getElementById('table-requests');
    const empty = document.getElementById('empty-state');
    
    table.innerHTML = '<tr><td colspan="6" class="text-center py-5"><div class="spinner-border text-primary spinner-border-sm"></div></td></tr>';
    empty.classList.add('d-none');

    try {
        const res = await API.request(`/admin/requests/list?inst=${instId}`);
        if (res.status === 'success') {
            const data = res.data;
            if (data.length > 0) {
                renderTable(data);
                table.parentElement.classList.remove('d-none');
                empty.classList.add('d-none');
            } else {
                table.innerHTML = '';
                empty.classList.remove('d-none');
            }
        } else {
            console.error("Error API:", res.message);
            table.innerHTML = `<tr><td colspan="6" class="text-center text-danger small py-3">Error: ${res.message}</td></tr>`;
        }
    } catch (e) { 
        console.error(e);
        table.innerHTML = '<tr><td colspan="6" class="text-center text-danger small py-3">Error de conexión.</td></tr>';
    }
}

export async function sendDecision(fd) {
    try {
        fd.append('adminId', Auth.getVal('userId'));
        const res = await API.request('/admin/requests/process', 'POST', fd);
        return res;
    } catch (e) {
        return { status: 'error', message: e.message || 'Error de red' };
    }
}