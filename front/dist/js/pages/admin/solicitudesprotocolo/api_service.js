import { API } from '../../../api.js';
import { renderTable } from './ui_render.js';
import { Auth } from '../../../auth.js';

function escHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function tablaTxt(key, fallback) {
    return window.txt?.solicitudprotocolo?.tabla?.[key] ?? fallback;
}

export async function loadRequests() {
    const instId = Auth.getVal('instId');
    const table = document.getElementById('table-requests');
    const empty = document.getElementById('empty-state');
    if (!table) return;

    const loadMsg = escHtml(window.txt?.generales?.msg_cargando || '…');
    table.innerHTML =
        `<tr><td colspan="6" class="text-center py-5"><div class="spinner-border text-primary spinner-border-sm" role="status"></div>` +
        `<div class="small text-muted mt-2">${loadMsg}</div></td></tr>`;
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
            console.error('Error API:', res.message);
            const tpl = tablaTxt('error_api', 'Error: {msg}');
            const cell = escHtml(tpl).replace(/\{msg\}/g, escHtml(String(res.message || '')));
            table.innerHTML = `<tr><td colspan="6" class="text-center text-danger small py-3">${cell}</td></tr>`;
        }
    } catch (e) {
        console.error(e);
        const msg = escHtml(tablaTxt('error_conexion', 'Connection error.'));
        table.innerHTML = `<tr><td colspan="6" class="text-center text-danger small py-3">${msg}</td></tr>`;
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