// front/dist/js/pages/resetear.js
import { API } from '../api.js';

export async function initReset() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const slug = urlParams.get('inst');

    if (!token || !slug) {
        Swal.fire("Error", "Enlace de recuperación inválido", "error");
        return;
    }

    const newPass = document.getElementById('new-pass');
    const confirmPass = document.getElementById('confirm-pass');
    const btn = document.getElementById('btn-reset');
    const instTag = document.getElementById('inst-tag');

    instTag.innerText = `Institución: ${slug.toUpperCase()}`;

    // Validación en tiempo real
    const validate = () => {
        const p1 = newPass.value;
        const p2 = confirmPass.value;
        const isLengthValid = p1.length >= 5 && p1.length <= 20;
        const isMatch = p1 === p2 && p1 !== "";

        document.getElementById('match-error').classList.toggle('hidden', p1 === p2 || p2 === "");
        
        const canSubmit = isLengthValid && isMatch;
        btn.disabled = !canSubmit;
        btn.classList.toggle('opacity-50', !canSubmit);
        btn.classList.toggle('cursor-not-allowed', !canSubmit);
    };

    newPass.onkeyup = validate;
    confirmPass.onkeyup = validate;

    document.getElementById('reset-password-form').onsubmit = async (e) => {
        e.preventDefault();
        
        try {
            const res = await API.request('/update-password-recovery', 'POST', {
                token,
                password: newPass.value,
                slug
            });

            if (res.status === 'success') {
                document.getElementById('reset-form-container').classList.add('hidden');
                document.getElementById('reset-success').classList.remove('hidden');
                document.getElementById('btn-login-final').href = `/URBE-API-DRIVEN/front/${slug}/`;
            } else {
                Swal.fire("Error", res.message, "error");
            }
        } catch (err) {
            Swal.fire("Error", "No se pudo conectar con el servidor", "error");
        }
    };
}