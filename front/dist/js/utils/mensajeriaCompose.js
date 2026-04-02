/**

 * Composición de mensajes internos (POST /comunicacion/mensajes/enviar).

 * Usa OrigenTipo / OrigenId / OrigenEtiqueta del hilo como categoría contextual.

 * El servidor envía siempre un correo al destinatario con el mensaje (avisar por email).

 */

import { API } from '../api.js';



const CATEGORY_ORDER = ['manual', 'formulario', 'alojamiento', 'lista_usuarios', 'notificacion'];



function esc(s) {

    return String(s ?? '')

        .replace(/&/g, '&amp;')

        .replace(/</g, '&lt;')

        .replace(/>/g, '&gt;')

        .replace(/"/g, '&quot;');

}

/**
 * Bootstrap 5 mantiene el foco dentro del .modal mientras está abierto.
 * SweetAlert2 se monta fuera del modal: el foco vuelve al modal y no se puede escribir en los inputs del Swal.
 * Desactivamos el FocusTrap de los modales visibles al abrir el compose y lo reactivamos al cerrar.
 */
let _composeFocusTrapInstances = [];

function deactivateBootstrapModalFocusTrapsForSwal() {
    _composeFocusTrapInstances = [];
    if (typeof bootstrap === 'undefined' || !bootstrap.Modal) return;
    document.querySelectorAll('.modal.show').forEach((modalEl) => {
        const inst = bootstrap.Modal.getInstance(modalEl);
        const trap = inst && inst._focustrap;
        if (trap && typeof trap.deactivate === 'function') {
            trap.deactivate();
            _composeFocusTrapInstances.push(inst);
        }
    });
}

function reactivateBootstrapModalFocusTrapsAfterSwal() {
    _composeFocusTrapInstances.forEach((inst) => {
        try {
            const el = inst && inst._element;
            const trap = inst && inst._focustrap;
            if (el && el.classList.contains('show') && trap && typeof trap.activate === 'function') {
                trap.activate();
            }
        } catch (e) {
            /* ignore */
        }
    });
    _composeFocusTrapInstances = [];
}



async function mostrarResultadoEnvio(t, emailN) {

    if (emailN && !emailN.ok) {

        const text = emailN.codigo === 'sin_email'

            ? (t.msg_email_sin_direccion || '')

            : (t.msg_email_smtp_error || '');

        await Swal.fire({ icon: 'warning', title: t.msg_enviado_ok || '', text });

        return;

    }

    await Swal.fire({

        icon: 'success',

        title: t.msg_enviado_ok || '',

        timer: 1800,

        showConfirmButton: false

    });

}



/**

 * @param {object} opts

 * @param {number} opts.destinatarioId

 * @param {string} [opts.asunto]

 * @param {string} [opts.cuerpo]

 * @param {string} [opts.origenTipo] - Valor enviado al API (categoría)

 * @param {number|null} [opts.origenId]

 * @param {string|null} [opts.origenEtiqueta]

 * @param {boolean} [opts.lockCategory] - Si true, no muestra el selector de categoría

 * @returns {Promise<boolean>} true si se envió correctamente

 */

export async function openMensajeriaCompose(opts) {

    const destinatarioId = parseInt(opts.destinatarioId, 10);

    if (!destinatarioId || destinatarioId <= 0) {

        if (typeof Swal !== 'undefined') {

            Swal.fire({ icon: 'warning', text: (window.txt?.comunicacion?.msg_err_sin_dest) || '' });

        }

        return false;

    }



    const t = window.txt?.comunicacion || {};

    const labels = {

        manual: t.msg_cat_manual,

        formulario: t.msg_cat_formulario,

        alojamiento: t.msg_cat_alojamiento,

        lista_usuarios: t.msg_cat_lista_usuarios,

        notificacion: t.msg_cat_notificacion

    };

    let asunto0 = String(opts.asunto ?? '').trim();

    let cuerpo0 = String(opts.cuerpo ?? '').trim();

    const origenId = opts.origenId != null && opts.origenId > 0 ? parseInt(opts.origenId, 10) : null;

    const origenEtiqueta = opts.origenEtiqueta != null && String(opts.origenEtiqueta).trim() !== ''

        ? String(opts.origenEtiqueta).trim()

        : null;

    let tipoDefault = String(opts.origenTipo || 'manual').trim() || 'manual';

    if (!CATEGORY_ORDER.includes(tipoDefault)) {

        tipoDefault = 'manual';

    }

    const lockCategory = opts.lockCategory === true;



    let categoryHtml = '';

    if (!lockCategory) {

        const optsHtml = CATEGORY_ORDER.map((v) => {

            const lab = labels[v] || v;

            const sel = v === tipoDefault ? ' selected' : '';

            return `<option value="${esc(v)}"${sel}>${esc(lab)}</option>`;

        }).join('');

        categoryHtml = `

            <label class="form-label small mb-1" for="swal-msg-cat">${esc(t.msg_categoria || 'Categoría')}</label>

            <select id="swal-msg-cat" class="form-select form-select-sm mb-2">${optsHtml}</select>`;

    }



    const html = `

        <div class="text-start">

            ${categoryHtml}

            <label class="form-label small mb-1" for="swal-msg-asunto">${esc(t.msg_asunto || '')}</label>

            <input id="swal-msg-asunto" class="form-control form-control-sm mb-2" maxlength="255" value="${esc(asunto0)}">

            <label class="form-label small mb-1" for="swal-msg-cuerpo">${esc(t.msg_compose_cuerpo || t.admin_cuerpo || '')}</label>

            <textarea id="swal-msg-cuerpo" class="form-control" rows="5">${esc(cuerpo0)}</textarea>

        </div>`;



    if (typeof Swal === 'undefined') {

        return false;

    }



    const r = await Swal.fire({

        title: t.msg_compose_titulo || t.msg_nuevo || '',

        html,

        width: 520,

        showCancelButton: true,

        confirmButtonText: t.msg_enviar || '',

        cancelButtonText: t.msg_compose_cancelar || t.modal_cerrar || '',

        focusConfirm: false,

        stopKeydownPropagation: false,

        didOpen: () => {
            deactivateBootstrapModalFocusTrapsForSwal();
            const c = Swal.getHtmlContainer();
            const asunto = c && c.querySelector('#swal-msg-asunto');
            if (asunto && typeof asunto.focus === 'function') {
                setTimeout(() => asunto.focus({ preventScroll: true }), 0);
            }
        },

        didClose: () => {
            reactivateBootstrapModalFocusTrapsAfterSwal();
        },

        preConfirm: () => {

            const tipo = lockCategory

                ? tipoDefault

                : (document.getElementById('swal-msg-cat')?.value || tipoDefault);

            const as = document.getElementById('swal-msg-asunto')?.value?.trim() || '';

            const cu = document.getElementById('swal-msg-cuerpo')?.value?.trim() || '';

            if (!as || !cu) {

                Swal.showValidationMessage(t.msg_validation || '');

                return false;

            }

            return { tipo, asunto: as, cuerpo: cu };

        }

    });



    if (!r.isConfirmed || !r.value) {

        return false;

    }



    const payload = {

        IdDestinatario: destinatarioId,

        Asunto: r.value.asunto,

        Cuerpo: r.value.cuerpo,

        OrigenTipo: r.value.tipo,

        OrigenId: origenId,

        OrigenEtiqueta: origenEtiqueta

    };



    const res = await API.request('/comunicacion/mensajes/enviar', 'POST', payload);

    if (res.status === 'success') {

        await mostrarResultadoEnvio(t, res.data?.emailNotificacion);

        return true;

    }

    if (typeof Swal !== 'undefined') {

        Swal.fire({ icon: 'error', text: res.message || t.err_generico || '' });

    }

    return false;

}


