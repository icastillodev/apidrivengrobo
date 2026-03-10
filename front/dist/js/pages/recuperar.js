// front/dist/js/pages/recuperar.js
import { API } from '../api.js';
const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/';

export async function initRecuperar() {
    // 1. Detectar Institución
    const slug = localStorage.getItem('NombreInst') || 'urbe';
    const instName = localStorage.getItem('NombreReal') || slug.toUpperCase();

    // 2. Personalizar UI
    const t = window.txt?.recuperar;
    const instPrefix = t?.inst_prefijo ? t.inst_prefijo + ' ' : 'Institución: ';
    document.getElementById('inst-label').innerText = instPrefix + instName;
    const loginPath = `${basePath}${slug}/`;
    document.getElementById('link-volver-login').href = loginPath;
    document.getElementById('btn-volver-exito').href = loginPath;

    // 3. Manejar Envío
    document.getElementById('recuperar-form').onsubmit = async (e) => {
        e.preventDefault();
        
        // CAPTURA DE DATOS: Asegúrate de incluir 'user'
        const emailValue = document.getElementById('recovery-email').value;
        const userValue = document.getElementById('recovery-user').value; 
        
        const btn = document.getElementById('btn-enviar');

        btn.disabled = true;
        btn.innerText = (window.txt?.recuperar?.btn_procesando) || "PROCESANDO...";

        try {
            // Enviamos el objeto con la clave 'user' que espera el Backend
            const res = await API.request('/forgot-password', 'POST', {
                email: emailValue,
                user: (userValue || '').trim().toLowerCase(),
                slug: slug,
                IdInstitucion: localStorage.getItem('instId'),
                lang: localStorage.getItem('lang') || localStorage.getItem('idioma') || 'es'
            });

            if (res.status === 'success') {
                document.getElementById('recovery-form-container').classList.add('hidden');
                document.getElementById('recovery-success').classList.remove('hidden');
            } else {
                const t = window.txt?.recuperar;
                Swal.fire(t?.swal_aviso || "Aviso", res.message || (t?.swal_datos_no_coinciden || "Los datos no coinciden con nuestros registros"), "warning");
                btn.disabled = false;
                btn.innerText = (window.txt?.recuperar?.btn_enviar) || "ENVIAR ENLACE";
            }
        } catch (err) {
            btn.disabled = false;
            btn.innerText = (window.txt?.recuperar?.btn_enviar) || "ENVIAR ENLACE";
            console.error("Error en recuperación:", err);
        }
    };
}