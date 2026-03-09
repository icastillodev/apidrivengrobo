// front/dist/js/pages/confirmar.js
import { API } from '../api.js';
const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/';


export async function initConfirmacion() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const slug = urlParams.get('inst'); // Recuperamos el slug de la institución

    if (!token || !slug) {
        const t = window.txt?.confirmar;
        showStatus('error', t?.error_faltan_params || 'Faltan parámetros de seguridad o contexto institucional.');
        return;
    }

    try {
        const res = await API.request('/confirm-account', 'POST', { token, slug });

        if (res.status === 'success') {
            // 1. Mostrar el nombre de la institución en el mensaje
            document.getElementById('confirm-inst-name').innerText = slug.toUpperCase();
            
            // 2. Corregir la ruta del botón para que no vaya al general
            const btnLogin = document.getElementById('btn-ir-login');
            btnLogin.href = `${basePath}${slug}/`; // Ruta institucional específica
            
            showStatus('success');
        } else {
            showStatus('error', res.message);
        }
    } catch (err) {
        const t = window.txt?.confirmar;
        showStatus('error', t?.error_servidor || 'No se pudo conectar con el servidor de validación.');
    }
}

function showStatus(type, message = "") {
    document.getElementById('status-loading').classList.add('hidden');
    if (type === 'success') {
        document.getElementById('status-success').classList.remove('hidden');
    } else {
        document.getElementById('status-error').classList.remove('hidden');
        const el = document.getElementById('error-message');
        if (el) el.innerText = message || (window.txt?.confirmar?.error_default || 'El enlace es inválido o el token ha expirado.');
    }
}