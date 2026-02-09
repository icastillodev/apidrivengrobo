import { API } from '../../api.js';

export async function initProfile() {
    const userId = localStorage.getItem('userId');

    // 1. Cargar Datos
    try {
        const res = await API.request(`/user/profile?user=${userId}`);
        if (res.status === 'success') {
            const d = res.data;
            
            // Llenar Tarjeta Lateral
            document.getElementById('lbl-nombre-completo').innerText = `${d.NombreA} ${d.ApellidoA}`;
            document.getElementById('lbl-usuario').innerText = `@${d.Usuario}`;
            document.getElementById('lbl-institucion').innerText = d.NombreInst;

            // Llenar Formulario Personal
            document.getElementById('input-nombre').value = d.NombreA;
            document.getElementById('input-apellido').value = d.ApellidoA;
            document.getElementById('input-email').value = d.EmailA;
            document.getElementById('input-celular').value = d.CelularA || '';
        }
    } catch (e) {
        console.error("Error cargando perfil:", e);
    }

    // 2. Manejo Formulario Datos Personales
    document.getElementById('form-personal').onsubmit = async (e) => {
        e.preventDefault();
        
        const fd = new FormData();
        fd.append('userId', userId);
        fd.append('nombre', document.getElementById('input-nombre').value);
        fd.append('apellido', document.getElementById('input-apellido').value);
        fd.append('email', document.getElementById('input-email').value);
        fd.append('celular', document.getElementById('input-celular').value);

        Swal.fire({ title: 'Guardando...', didOpen: () => Swal.showLoading() });

        try {
            const res = await API.request('/user/profile/update', 'POST', fd);
            if (res.status === 'success') {
                Swal.fire('¡Éxito!', 'Tus datos han sido actualizados.', 'success');
                // Actualizar nombre en tarjeta lateral
                const n = document.getElementById('input-nombre').value;
                const a = document.getElementById('input-apellido').value;
                document.getElementById('lbl-nombre-completo').innerText = `${n} ${a}`;
                // Actualizar localStorage si se usa para el header
                localStorage.setItem('userFull', `${n} ${a}`);
            } else {
                Swal.fire('Error', res.message, 'error');
            }
        } catch (e) {
            Swal.fire('Error', 'No se pudo conectar con el servidor.', 'error');
        }
    };

    // 3. Manejo Cambio de Contraseña
    document.getElementById('form-security').onsubmit = async (e) => {
        e.preventDefault();

        const currentPass = document.getElementById('pass-current').value;
        const newPass = document.getElementById('pass-new').value;
        const confirmPass = document.getElementById('pass-confirm').value;

        if (newPass.length < 6) {
            return Swal.fire('Atención', 'La nueva contraseña debe tener al menos 6 caracteres.', 'warning');
        }

        if (newPass !== confirmPass) {
            return Swal.fire('Error', 'Las nuevas contraseñas no coinciden.', 'error');
        }

        Swal.fire({ title: 'Actualizando...', didOpen: () => Swal.showLoading() });

        try {
            const payload = { userId, currentPass, newPass };
            const res = await API.request('/user/profile/change-password', 'POST', payload);

            if (res.status === 'success') {
                Swal.fire('¡Contraseña Actualizada!', 'Tu clave ha sido modificada correctamente.', 'success');
                document.getElementById('form-security').reset();
            } else {
                Swal.fire('Error', res.message, 'error');
            }
        } catch (e) {
            Swal.fire('Error', 'No se pudo procesar la solicitud.', 'error');
        }
    };
}