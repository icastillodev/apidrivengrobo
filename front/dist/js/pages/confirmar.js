// front/dist/js/pages/confirmar.js
import { API } from '../api.js';
const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/';


export async function initConfirmacion() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const slug = urlParams.get('inst'); // Recuperamos el slug de la institución
    const tr = window.txt?.confirmar || {};
    const captions = [
        ['confirm-help', 'textContent', tr.reenviar_help],
        ['confirm-login-link', 'textContent', tr.reenviar_login],
        ['resend-username', 'placeholder', tr.reenviar_username],
        ['resend-email', 'placeholder', tr.reenviar_email],
        ['resend-btn', 'textContent', tr.reenviar_btn],
    ];
    captions.forEach(([id, prop, value]) => {
        const el = document.getElementById(id);
        if (el && value) el[prop] = value;
    });
    const loginLink = document.getElementById('confirm-login-link');
    if (loginLink && slug) loginLink.href = `${basePath}${encodeURIComponent(slug)}/`;

    const resendForm = document.getElementById('resend-activation-form');
    resendForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const feedback = document.getElementById('resend-feedback');
        const btn = document.getElementById('resend-btn');
        if (!slug) {
            if (feedback) feedback.textContent = 'Falta la institución en el enlace.';
            return;
        }
        btn.disabled = true;
        if (feedback) feedback.textContent = '';
        try {
            const res = await API.request('/resend-activation', 'POST', {
                slug,
                username: document.getElementById('resend-username')?.value.trim(),
                email: document.getElementById('resend-email')?.value.trim(),
                lang: localStorage.getItem('lang') || 'es',
            });
            if (feedback) feedback.textContent = res.status === 'success'
                ? (window.txt?.confirmar?.reenviar_generico || 'Si la cuenta está pendiente y los datos coinciden, te llegará un correo nuevo.')
                : (res.code === 'too_many_requests'
                    ? (window.txt?.confirmar?.reenviar_limite || 'Demasiados intentos. Probá más tarde.')
                    : (window.txt?.confirmar?.reenviar_error || 'No se pudo procesar la solicitud.'));
        } catch (_) {
            if (feedback) feedback.textContent = window.txt?.confirmar?.reenviar_error || 'No se pudo procesar la solicitud.';
        } finally {
            btn.disabled = false;
        }
    });

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