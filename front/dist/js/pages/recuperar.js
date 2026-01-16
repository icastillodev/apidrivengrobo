// front/dist/js/pages/recuperar.js
import { API } from '../api.js';

export async function initRecuperar() {
    // 1. Detectar Institución
    const slug = localStorage.getItem('NombreInst') || 'urbe';
    const instName = localStorage.getItem('NombreReal') || slug.toUpperCase();

    // 2. Personalizar UI
    document.getElementById('inst-label').innerText = `Institución: ${instName}`;
    const loginPath = `/URBE-API-DRIVEN/front/${slug}/`;
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
        btn.innerText = "PROCESANDO...";

        try {
            // Enviamos el objeto con la clave 'user' que espera el Backend
            const res = await API.request('/forgot-password', 'POST', { 
                email: emailValue,
                user: userValue, 
                slug: slug,
                IdInstitucion: localStorage.getItem('instId') 
            });

            if (res.status === 'success') {
                document.getElementById('recovery-form-container').classList.add('hidden');
                document.getElementById('recovery-success').classList.remove('hidden');
            } else {
                Swal.fire("Aviso", res.message || "Los datos no coinciden con nuestros registros", "warning");
                btn.disabled = false;
                btn.innerText = "ENVIAR ENLACE";
            }
        } catch (err) {
            btn.disabled = false;
            btn.innerText = "ENVIAR ENLACE";
            console.error("Error en recuperación:", err);
        }
    };
}