/**
 * Eliminación de formularios (animales / reactivos / insumos) en admin:
 * roles 1 y 2, confirmación con contraseña, endpoint /admin/forms/delete
 */
import { API } from '../api.js';

export function puedeEliminarFormularioAdminSede() {
    const r = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel') || '0', 10);
    return r === 1 || r === 2;
}

/**
 * @param {{ idformA: number|string, categoria: 'animal'|'reactivo'|'insumo', onSuccess?: () => (void|Promise<void>) }} opts
 * @returns {Promise<boolean>} true si se eliminó
 */
export async function runAdminFormularioDelete(opts) {
    const idformA = parseInt(String(opts.idformA), 10);
    const categoria = opts.categoria;
    const t = window.txt?.admin_formularios || {};
    const SwalLib = window.Swal;

    if (!puedeEliminarFormularioAdminSede()) {
        if (SwalLib) {
            await SwalLib.fire(
                t.delete_sin_permiso_titulo || 'Sin permiso',
                t.delete_sin_permiso_rol || 'Solo perfiles Superadmin (roles 1 y 2) pueden eliminar formularios.',
                'warning'
            );
        } else if (window.mostrarNotificacion) {
            window.mostrarNotificacion(t.delete_sin_permiso_rol || 'Sin permiso.', 'warning');
        } else {
            alert(t.delete_sin_permiso_rol || 'Sin permiso.');
        }
        return false;
    }
    if (!idformA || !categoria) {
        return false;
    }

    const callApi = async (password) => {
        return API.request('/admin/forms/delete', 'POST', { idformA, password, categoria });
    };

    if (!SwalLib) {
        const password = window.prompt(t.delete_placeholder || 'Contraseña');
        if (password === null || String(password).trim() === '') {
            return false;
        }
        const res = await callApi(String(password).trim());
        if (res && res.status === 'success') {
            if (opts.onSuccess) {
                await opts.onSuccess();
            }
            alert(res.message || t.delete_success || 'OK');
            return true;
        }
        alert((res && res.message) || t.delete_error || 'Error');
        return false;
    }

    const { value: password, isConfirmed } = await SwalLib.fire({
        title: t.delete_title || 'Eliminar formulario',
        html: t.delete_html || '<p class="text-muted mb-2 text-start"></p>',
        input: 'password',
        inputPlaceholder: t.delete_placeholder || 'Tu contraseña para confirmar',
        inputAttributes: { autocomplete: 'current-password' },
        showCancelButton: true,
        confirmButtonText: t.delete_confirm || 'Eliminar',
        cancelButtonText: t.delete_cancel || 'Cancelar',
        customClass: { popup: 'swal-delete-form-popup' },
        preConfirm: () => {
            const input = document.querySelector('.swal-delete-form-popup .swal2-input');
            const v = input && input.value ? String(input.value).trim() : '';
            if (!v) {
                SwalLib.showValidationMessage(t.delete_password_required || 'Ingresa tu contraseña.');
                return false;
            }
            return v;
        }
    });

    if (!isConfirmed || !password) {
        return false;
    }

    const res = await callApi(password);
    if (res && res.status === 'success') {
        await SwalLib.fire('', res.message || t.delete_success || '', 'success');
        if (opts.onSuccess) {
            await opts.onSuccess();
        }
        return true;
    }
    await SwalLib.fire(t.delete_error || 'Error', (res && res.message) || '', 'error');
    return false;
}
