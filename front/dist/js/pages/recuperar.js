// front/dist/js/pages/recuperar.js
import { API } from '../api.js';

const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/';

function getLangPayload() {
    return localStorage.getItem('lang') || localStorage.getItem('idioma') || 'es';
}

function applyTabStyles(activePassword) {
    const tabPass = document.getElementById('tab-password');
    const tabUser = document.getElementById('tab-username');
    if (!tabPass || !tabUser) return;
    if (activePassword) {
        tabPass.className = 'flex-1 py-3 px-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-tight bg-black text-white transition-colors';
        tabUser.className = 'flex-1 py-3 px-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-tight bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors';
        tabPass.setAttribute('aria-selected', 'true');
        tabUser.setAttribute('aria-selected', 'false');
    } else {
        tabUser.className = 'flex-1 py-3 px-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-tight bg-black text-white transition-colors';
        tabPass.className = 'flex-1 py-3 px-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-tight bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors';
        tabUser.setAttribute('aria-selected', 'true');
        tabPass.setAttribute('aria-selected', 'false');
    }
}

function showSuccessPanel(mode) {
    const t = window.txt?.recuperar;
    const titleEl = document.getElementById('recovery-success-title');
    const msgEl = document.getElementById('recovery-success-msg');
    if (titleEl) {
        titleEl.textContent = mode === 'user'
            ? (t?.success_titulo_user || t?.success_titulo || 'Listo')
            : (t?.success_titulo || '¡Correo enviado!');
    }
    if (msgEl) {
        msgEl.textContent = mode === 'user'
            ? (t?.success_msg_user || t?.success_msg || '')
            : (t?.success_msg || '');
    }
    document.getElementById('recovery-main-flow')?.classList.add('hidden');
    document.getElementById('recovery-success')?.classList.remove('hidden');
}

export async function initRecuperar() {
    const params = new URLSearchParams(window.location.search);
    const instParam = (params.get('inst') || '').trim().toLowerCase();
    let slug = instParam || (localStorage.getItem('NombreInst') || '').trim().toLowerCase() || 'urbe';
    let instId = localStorage.getItem('instId');
    let instDisplay = slug.toUpperCase();

    const instLabel = document.getElementById('inst-label');
    const t = window.txt?.recuperar;
    const instPrefix = t?.inst_prefijo ? `${t.inst_prefijo} ` : 'Institución: ';

    if (instLabel) {
        instLabel.textContent = `${instPrefix}${instDisplay}`;
    }

    try {
        const res = await API.request(`/validate-inst/${encodeURIComponent(slug)}`);
        if (res?.status === 'success' && res.data) {
            instId = String(res.data.id);
            localStorage.setItem('instId', instId);
            localStorage.setItem('NombreInst', slug);
            const nombre = res.data.nombre || res.data.nombre_completo || '';
            instDisplay = String(nombre).replace(/^APP\s+/i, '').trim().toUpperCase() || slug.toUpperCase();
            if (instLabel) {
                instLabel.textContent = `${instPrefix}${instDisplay}`;
            }
        } else if (instParam) {
            const tr = window.txt?.recuperar;
            Swal.fire(tr?.swal_aviso || 'Aviso', tr?.swal_inst_invalida || 'No se pudo validar la institución.', 'warning');
        }
    } catch (e) {
        console.warn('validate-inst recuperar:', e);
        if (instParam) {
            const tr = window.txt?.recuperar;
            Swal.fire(tr?.swal_aviso || 'Aviso', tr?.swal_error_red || 'Error de conexión.', 'error');
        }
    }

    const loginPath = `${basePath}${slug}/`;
    const linkVolver = document.getElementById('link-volver-login');
    const btnExito = document.getElementById('btn-volver-exito');
    if (linkVolver) linkVolver.href = loginPath;
    if (btnExito) btnExito.href = loginPath;

    const panelPass = document.getElementById('panel-password');
    const panelUser = document.getElementById('panel-username');
    const tabPass = document.getElementById('tab-password');
    const tabUser = document.getElementById('tab-username');

    tabPass?.addEventListener('click', () => {
        panelPass?.classList.remove('hidden');
        panelUser?.classList.add('hidden');
        applyTabStyles(true);
    });
    tabUser?.addEventListener('click', () => {
        panelUser?.classList.remove('hidden');
        panelPass?.classList.add('hidden');
        applyTabStyles(false);
    });

    const idNum = parseInt(String(instId || ''), 10);
    const payloadBase = {
        slug,
        IdInstitucion: Number.isFinite(idNum) && idNum > 0 ? idNum : 0,
        lang: getLangPayload()
    };

    document.getElementById('recuperar-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailValue = document.getElementById('recovery-email')?.value || '';
        const userValue = document.getElementById('recovery-user')?.value || '';
        const btn = document.getElementById('btn-enviar');
        const labelEnviar = (window.txt?.recuperar?.btn_enviar) || 'ENVIAR';

        btn.disabled = true;
        btn.textContent = (window.txt?.recuperar?.btn_procesando) || 'PROCESANDO...';

        try {
            const res = await API.request('/forgot-password', 'POST', {
                ...payloadBase,
                email: emailValue,
                user: userValue.trim().toLowerCase()
            });

            if (res.status === 'success') {
                showSuccessPanel('password');
            } else {
                Swal.fire(
                    t?.swal_aviso || 'Aviso',
                    res.message || (t?.swal_datos_no_coinciden || 'Los datos no coinciden con nuestros registros'),
                    'warning'
                );
                btn.disabled = false;
                btn.textContent = labelEnviar;
            }
        } catch (err) {
            btn.disabled = false;
            btn.textContent = labelEnviar;
            console.error('Error en recuperación:', err);
            Swal.fire(t?.swal_aviso || 'Aviso', t?.swal_error_red || 'Error de conexión.', 'error');
        }
    });

    document.getElementById('recuperar-user-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailValue = document.getElementById('recovery-email-user')?.value || '';
        const btn = document.getElementById('btn-enviar-user');
        const labelEnviar = (window.txt?.recuperar?.btn_enviar_user) || 'ENVIAR';

        btn.disabled = true;
        btn.textContent = (window.txt?.recuperar?.btn_procesando) || 'PROCESANDO...';

        try {
            const res = await API.request('/forgot-username', 'POST', {
                ...payloadBase,
                email: emailValue
            });

            if (res.status === 'success') {
                showSuccessPanel('user');
            } else {
                Swal.fire(t?.swal_aviso || 'Aviso', res.message || (t?.swal_error_red || 'Error'), 'warning');
                btn.disabled = false;
                btn.textContent = labelEnviar;
            }
        } catch (err) {
            btn.disabled = false;
            btn.textContent = labelEnviar;
            console.error('Error recordatorio usuario:', err);
            Swal.fire(t?.swal_aviso || 'Aviso', t?.swal_error_red || 'Error de conexión.', 'error');
        }
    });
}
