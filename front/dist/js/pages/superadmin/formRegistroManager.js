// ***************************************************
// JS: formRegistroManager.js — Links de onboarding + vista detalle para producción
// ***************************************************

import { API } from '../../api.js';

let catalogoModulosOnboarding = [];

function tf() {
    return window.txt?.superadmin_formulario || {};
}

export async function initFormAdmin() {
    try {
        const res = await API.request('/superadmin/modulos/catalogo');
        if (res?.status === 'success' && Array.isArray(res.data)) {
            catalogoModulosOnboarding = res.data;
        }
    } catch (e) {
        console.error('Catálogo módulos onboarding:', e);
    }
    renderTable();
}

async function renderTable() {
    const res = await API.request('/superadmin/form-registros/all');
    const tbody = document.getElementById('table-body-forms');
    const t = tf();

    if (!res || res.status !== 'success' || !res.data) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger font-bold py-4">${t.error_carga_tabla || 'No se pudieron cargar los formularios o no hay registros.'}</td></tr>`;
        return;
    }

    tbody.innerHTML = '';

    res.data.forEach(row => {
        const isActivo = parseInt(row.activo) === 1;

        const rowClass = isActivo ? 'hover:bg-slate-50 transition-colors cursor-pointer' : 'bg-red-50 text-muted opacity-75 cursor-pointer';
        const slugDisplay = isActivo ? `
        <a href="${window.location.origin}${window.location.pathname.includes('URBE-API-DRIVEN') ? '/URBE-API-DRIVEN/front' : ''}/formulario/${row.slug_url}" 
       target="_blank" 
       class="btn btn-sm btn-outline-primary fw-bold px-2 py-1 shadow-sm"
       title="Abrir formulario público">
        <i class="bi bi-box-arrow-up-right me-1"></i> /formulario/${row.slug_url}
    </a>` : `<span class="text-danger small fw-bold">${t.link_deshabilitado || 'DESHABILITADO'}</span>`;

        const tr = document.createElement('tr');
        tr.className = rowClass;
        tr.onclick = () => window.verDetalleCompleto(row.id_form_config);

        const toggleBtnClass = isActivo ? 'btn-outline-warning' : 'btn-success';
        const toggleIcon = isActivo ? 'bi-pause-circle' : 'bi-play-circle';
        const toggleText = isActivo ? (t.toggle_pausar || 'Pausar') : (t.toggle_activar || 'Activar');
        const toggleAction = isActivo ? 0 : 1;

        tr.innerHTML = `
            <td class="font-bold text-center">${row.id_form_config}</td>
            <td class="font-bold ${isActivo ? 'text-slate-700' : ''}">${row.nombre_inst_previa}</td>
            <td>${row.encargado_nombre}</td>
            <td>${slugDisplay}</td>
            <td class="text-center">
                <span class="badge ${row.campos_completados > 0 ? 'bg-success' : 'bg-secondary'} px-2 py-1">
                    ${row.campos_completados} ${t.badge_datos || 'datos cargados'}
                </span>
            </td>
            <td style="font-size: 11px;">${row.creado_el}</td>
            <td class="text-center">
                <button class="btn ${toggleBtnClass} btn-sm border-0 me-1" 
                        onclick="event.stopPropagation(); window.toggleLinkStatus(${row.id_form_config}, ${toggleAction})">
                    <i class="bi ${toggleIcon}"></i> ${toggleText}
                </button>
                <button class="btn btn-outline-danger btn-sm border-0" 
                        onclick="event.stopPropagation(); window.deleteLink(${row.id_form_config})">
                    <i class="bi bi-trash"></i> ${t.btn_eliminar || 'Eliminar'}
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.toggleLinkStatus = async (id, newStatus) => {
    const t = tf();
    const actionText = newStatus === 1 ? (t.toggle_activar || 'habilitar').toLowerCase() : (t.toggle_pausar || 'deshabilitar').toLowerCase();
    const confirm = await Swal.fire({
        title: `¿${actionText.toUpperCase()}?`,
        text: newStatus === 1 ? (t.confirm_habilitar_txt || 'La institución podrá volver a ingresar datos.') : (t.confirm_pausar_txt || 'La institución ya no podrá acceder a este formulario.'),
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: newStatus === 1 ? '#198754' : '#ffc107',
        confirmButtonText: t.confirm_si || 'SÍ',
        cancelButtonText: t.confirm_no || 'CANCELAR',
    });

    if (confirm.isConfirmed) {
        Swal.fire({ title: t.actualizando || 'Actualizando...', didOpen: () => Swal.showLoading() });
        const res = await API.request('/superadmin/form-registros/toggle-status', 'POST', { id_form_config: id, status: newStatus });

        if (res && res.status === 'success') {
            Swal.fire(t.actualizado || 'Actualizado', t.estado_cambiado || 'El estado del enlace ha cambiado.', 'success');
            renderTable();
        } else {
            Swal.fire('Error', res?.message || 'Error al actualizar.', 'error');
        }
    }
};

window.deleteLink = async (id) => {
    const t = tf();
    const confirm = await Swal.fire({
        title: t.confirm_borrar_titulo || '¿Eliminar este link?',
        text: t.confirm_borrar_txt || 'Se borrará el acceso y las respuestas cargadas.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonText: t.confirm_no || 'CANCELAR',
        confirmButtonText: t.confirm_borrar_si || 'SÍ, ELIMINAR',
    });

    if (confirm.isConfirmed) {
        Swal.fire({ title: t.borrando || 'Borrando...', didOpen: () => Swal.showLoading() });
        const res = await API.request('/superadmin/form-registros/delete', 'POST', { id_form_config: id });

        if (res && res.status === 'success') {
            Swal.fire(t.eliminado || 'Eliminado', t.borrado_ok || 'Registro borrado.', 'success');
            renderTable();
        } else {
            Swal.fire('Error', res?.message || 'Error al eliminar.', 'error');
        }
    }
};

const SECCION_ORDER = [
    'institucion', 'organizaciones', 'departamentos', 'tipo_protocolo', 'severidad', 'tipo_formulario',
    'reactivos', 'insumos', 'servicios', 'reservas', 'especies',
    'permisos_rol_4_sec_admin', 'permisos_rol_5_asistente', 'permisos_rol_6_laboratorio',
];
const SECCION_I18N = {
    institucion: 'seccion_institucion',
    organizaciones: 'seccion_organizaciones',
    departamentos: 'seccion_departamentos',
    tipo_protocolo: 'seccion_tipo_protocolo',
    severidad: 'seccion_severidad',
    tipo_formulario: 'seccion_tipo_formulario',
    reactivos: 'seccion_reactivos',
    insumos: 'seccion_insumos',
    servicios: 'seccion_servicios',
    reservas: 'seccion_reservas',
    especies: 'seccion_especies',
    permisos_rol_4_sec_admin: 'seccion_permisos_sec_admin',
    permisos_rol_5_asistente: 'seccion_permisos_asistente',
    permisos_rol_6_laboratorio: 'seccion_permisos_laboratorio',
};

function getCampoLabel(campo, t) {
    const map = {
        inst_nombre_sede: t.campo_nombre_sede, inst_contacto: t.campo_contacto,
        org_nom: t.campo_organizacion, depto_nom: t.campo_departamento, depto_org: t.campo_organizacion,
        prot_tipo: t.campo_protocolo, sev_tipo: t.campo_severidad,
        form_cat: t.campo_categoria, form_nom: t.campo_nombre_form, form_exento: t.campo_exento,
        reac_nom: t.campo_reactivo, reac_cant: t.campo_cantidad, reac_medida: t.campo_cantidad, reac_esp: t.campo_especie,
        ins_nom: t.campo_insumo, ins_cant: t.campo_cantidad, ins_medida: t.campo_cantidad, ins_esp: t.campo_especie,
        serv_nom: t.campo_servicio, serv_cant: t.campo_cantidad, serv_medida: t.campo_cantidad,
        sala_nom: t.campo_sala, sala_lugar: t.campo_ubicacion, instru_nom: t.campo_instrumento, instru_cant: t.campo_cantidad,
        esp_nombre: t.campo_especie, sub_nom: t.campo_subespecie, aloj_nom: t.campo_alojamiento, aloj_det: t.campo_ubicacion,
        traz_nom: t.campo_trazabilidad, traz_tipo: t.campo_trazabilidad,
    };
    const base = (campo || '').replace(/\[\]$/, '').replace(/_?\d+$/g, '').replace(/_\d+_/g, '_');
    const key = Object.keys(map).find(k => base === k || base.startsWith(`${k}_`));
    return (key && map[key]) ? map[key] : (base.replace(/_/g, ' ').replace(/^\w/, w => w.toUpperCase()));
}

function planEstadoLabel(est, t) {
    const n = parseInt(est, 10);
    if (n === 2) return t.plan_solo_admin || 'Solo administración';
    if (n === 3) return t.plan_admin_inv || 'Admin + investigadores';
    return t.plan_off || 'Desactivado';
}

function renderPlanContratadoHtml(config, t) {
    const map = config?.plan_modulos_map;
    if (!map || typeof map !== 'object' || Object.keys(map).length === 0) {
        return `<div class="alert alert-secondary small mb-3">${t.sin_plan_legacy || 'Enlace creado antes del plan por módulos: el formulario público muestra todas las secciones. Al crear nuevos links, defina servicios contratados.'}</div>`;
    }
    const keys = Object.keys(map).sort();
    const rows = keys.map((k) => `<tr><td class="fw-bold text-uppercase" style="font-size:11px">${k.replace(/_/g, ' ')}</td><td>${planEstadoLabel(map[k], t)}</td></tr>`).join('');
    return `
        <div class="mb-4 bg-dark text-white p-3 rounded shadow-sm">
            <h6 class="font-black uppercase text-xs mb-2 border-bottom border-secondary pb-2">${t.plan_contratados_titulo || 'Servicios contratados (plan del enlace)'}</h6>
            <table class="table table-sm table-dark mb-0" style="font-size:12px"><tbody>${rows}</tbody></table>
            <div class="small mt-2 opacity-75">${t.plan_contratados_ayuda || 'Replique estos mismos estados en Gestión de Sedes al crear la institución en producción.'}</div>
        </div>`;
}

function buildPlainTextExport(config, grouped, t) {
    const lines = [];
    lines.push('=== GROBO — RESUMEN ONBOARDING (PRODUCCIÓN) ===');
    lines.push(`${t.resumen_inst || 'Institución previa'}: ${config?.nombre_inst_previa || ''}`);
    lines.push(`${t.resumen_encargado || 'Encargado'}: ${config?.encargado_nombre || ''}`);
    lines.push(`${t.resumen_slug || 'Slug'}: ${config?.slug_url || ''}`);
    lines.push(`ID config: ${config?.id_form_config || ''}`);
    if (config?.plan_modulos_map && Object.keys(config.plan_modulos_map).length) {
        lines.push('');
        lines.push('--- PLAN MÓDULOS (replicar en superadmin / institución) ---');
        Object.keys(config.plan_modulos_map).sort().forEach((k) => {
            lines.push(`${k}: ${planEstadoLabel(config.plan_modulos_map[k], t)}`);
        });
    }
    lines.push('');
    lines.push('--- DATOS CARGADOS ---');
    const orden = [...SECCION_ORDER.filter((c) => grouped[c]), ...Object.keys(grouped).filter((c) => !SECCION_ORDER.includes(c))];
    orden.forEach((cat) => {
        const campos = grouped[cat];
        if (!campos?.length) return;
        lines.push(`[${cat}]`);
        campos.forEach((c) => {
            const lab = getCampoLabel(c.campo, t);
            let val = c.valor ?? '';
            if (val === '1' || val === '2') val = val === '1' ? (t.valor_si || 'Sí') : (t.valor_no || 'No');
            if (c.campo && String(c.campo).includes('menuRol')) val = val ? (t.valor_si || 'Sí') : (t.valor_no || 'No');
            lines.push(`  ${lab}: ${val}`);
        });
        lines.push('');
    });
    return lines.join('\n');
}

window.copiarResumenOnboarding = async () => {
    const t = tf();
    const pack = window.__lastOnboardingExport;
    if (!pack) return;
    const text = buildPlainTextExport(pack.config, pack.data, t);
    try {
        await navigator.clipboard.writeText(text);
        Swal.fire({ icon: 'success', title: t.clip_ok || 'Copiado', timer: 1800, showConfirmButton: false });
    } catch {
        Swal.fire({ icon: 'error', title: t.clip_err || 'No se pudo copiar', text: t.clip_err_manual || 'Seleccione el texto manualmente o use Imprimir.' });
    }
};

window.verDetalleCompleto = async (id) => {
    const t = tf();
    Swal.fire({ title: t.cargando || 'Cargando datos...', didOpen: () => Swal.showLoading() });

    const res = await API.request(`/superadmin/form-registros/detail/${id}`);
    const container = document.getElementById('content-detalle-eav');

    Swal.close();

    if (!res || res.status !== 'success') {
        Swal.fire('Error', t.detalle_error || 'No se pudieron recuperar los detalles.', 'error');
        return;
    }

    const grouped = res.data && typeof res.data === 'object' ? res.data : {};
    const config = res.config || {};

    window.__lastOnboardingExport = { config, data: grouped };

    container.innerHTML = `
        <div class="no-print d-flex flex-wrap gap-2 mb-3">
            <button type="button" class="btn btn-dark btn-sm fw-bold" onclick="window.copiarResumenOnboarding()">
                <i class="bi bi-clipboard-check me-1"></i> ${t.btn_copiar_produccion || 'Copiar resumen (texto plano)'}
            </button>
            <button type="button" class="btn btn-outline-secondary btn-sm fw-bold" onclick="window.print()">
                <i class="bi bi-printer me-1"></i> ${t.btn_imprimir || 'Imprimir'}
            </button>
        </div>
        ${renderPlanContratadoHtml(config, t)}
        <div class="small text-muted mb-2 border-bottom pb-2">${t.resumen_header || 'Revise cada bloque y transpóngalo a la sede en producción (módulos, catálogos y permisos).'}</div>
    `;

    const keysCount = Object.keys(grouped).length;
    if (keysCount === 0) {
        container.insertAdjacentHTML('beforeend', `<div class="alert alert-info text-center font-bold uppercase">${t.detalle_sin_datos || 'La institución aún no ha cargado datos en este formulario.'}</div>`);
    } else {
        const categoriasOrdenadas = SECCION_ORDER.filter((cat) => grouped[cat]);
        const restantes = Object.keys(grouped).filter((cat) => !SECCION_ORDER.includes(cat));
        const ordenFinal = [...categoriasOrdenadas, ...restantes];

        ordenFinal.forEach((categoria) => {
            const campos = grouped[categoria];
            if (!campos || !campos.length) return;

            const tituloSeccion = t[SECCION_I18N[categoria]] || categoria.replace(/_/g, ' ');
            let sectionHtml = `
                <div class="mb-4 bg-white p-3 rounded shadow-sm border-start border-4 border-success print-section">
                    <h6 class="font-black text-success uppercase text-xs mb-3 italic tracking-wider border-bottom pb-2">
                        <i class="bi bi-folder-fill me-1"></i> ${tituloSeccion}
                    </h6>
                    <div class="row g-3">
            `;

            campos.forEach((c) => {
                const label = getCampoLabel(c.campo, t);
                let valor = c.valor || '';
                if (valor === '1' || valor === '2') valor = valor === '1' ? (t.valor_si || 'Sí') : (t.valor_no || 'No');
                if (c.campo && String(c.campo).includes('menuRol')) valor = valor ? (t.valor_si || 'Sí') : (t.valor_no || 'No');

                sectionHtml += `
                    <div class="col-md-3">
                        <div class="bg-slate-50 p-2 rounded border h-100">
                            <label class="d-block text-muted fw-bold uppercase mb-1" style="font-size: 10px;">${label}</label>
                            <div class="text-slate-800 font-medium" style="font-size: 13px;">
                                ${valor || '<span class="text-slate-300 italic">N/A</span>'}
                            </div>
                        </div>
                    </div>
                `;
            });

            sectionHtml += '</div></div>';
            container.insertAdjacentHTML('beforeend', sectionHtml);
        });
    }

    new bootstrap.Modal(document.getElementById('modal-detalle-form')).show();
};

function buildModulosStepHtml(t) {
    const mods = catalogoModulosOnboarding.filter((m) => m.clave_modulo);
    if (!mods.length) {
        return `<p class="small text-warning">${t.plan_sin_catalogo || 'No se pudo cargar el catálogo de módulos; el enlace se creará sin plan (formulario completo).'}</p>`;
    }
    return `
        <p class="small text-muted mb-2">${t.create_plan_ayuda || 'Defina qué servicios contrató la sede. El formulario público solo mostrará las secciones necesarias.'}</p>
        <div style="max-height:280px;overflow-y:auto;text-align:left">
        ${mods.map((m) => `
            <div class="mb-2 border-bottom pb-2">
                <label class="small fw-bold d-block">${m.NombreModulo}</label>
                <select class="form-select form-select-sm swal-plan-mod" data-idmod="${m.IdModulosApp}">
                    <option value="1">${t.plan_off || 'Desactivado'}</option>
                    <option value="2">${t.plan_solo_admin || 'Solo administración'}</option>
                    <option value="3" selected>${t.plan_admin_inv || 'Admin + investigadores'}</option>
                </select>
            </div>
        `).join('')}
        </div>`;
}

window.openCreateLinkModal = async () => {
    const t = tf();
    const step1 = await Swal.fire({
        title: t.create_step1_title || 'Nuevo link de registro',
        html:
            `<div class="text-start">
            <label class="small font-bold text-muted">${t.label_inst_name || 'Nombre institución'}</label>
            <input id="swal-name" class="swal2-input mt-1 mb-3 w-100" placeholder="${t.ph_inst_name || 'Ej: Universidad Nacional'}">
            <label class="small font-bold text-muted">${t.label_encargado || 'Encargado'}</label>
            <input id="swal-encargado" class="swal2-input mt-1 mb-3 w-100" placeholder="${t.ph_encargado || 'Ej: Dr. Juan Pérez'}">
            <label class="small font-bold text-muted">${t.label_slug || 'Slug URL (único)'}</label>
            <input id="swal-slug" class="swal2-input mt-1 w-100" placeholder="${t.ph_slug || 'Ej: unlp-2026'}">
            </div>`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: t.btn_siguiente || 'Siguiente: módulos',
        cancelButtonText: t.confirm_no || 'Cancelar',
        confirmButtonColor: '#1a5d3b',
        preConfirm: () => {
            const name = document.getElementById('swal-name').value?.trim();
            const encargado = document.getElementById('swal-encargado').value?.trim();
            const slug = document.getElementById('swal-slug').value?.trim();
            if (!name || !encargado || !slug) {
                Swal.showValidationMessage(t.validation_basico || 'Complete todos los campos');
                return false;
            }
            return { nombre_inst_previa: name, encargado_nombre: encargado, slug_url: slug };
        },
    });

    if (!step1.isConfirmed || !step1.value) return;

    const step2 = await Swal.fire({
        title: t.create_step2_title || 'Servicios contratados',
        html: buildModulosStepHtml(t),
        focusConfirm: false,
        showCancelButton: true,
        width: 520,
        confirmButtonText: t.btn_crear_link || 'CREAR ACCESO',
        cancelButtonText: t.confirm_no || 'Cancelar',
        confirmButtonColor: '#1a5d3b',
        preConfirm: () => {
            const modulos = [];
            document.querySelectorAll('.swal-plan-mod').forEach((sel) => {
                modulos.push({
                    IdModulosApp: parseInt(sel.getAttribute('data-idmod'), 10),
                    estado_logico: parseInt(sel.value, 10),
                });
            });
            return { ...step1.value, modulos };
        },
    });

    if (!step2.isConfirmed || !step2.value) return;

    const payload = step2.value;
    Swal.fire({ title: t.procesando || 'Procesando...', didOpen: () => Swal.showLoading() });
    const res = await API.request('/superadmin/form-registros/create-link', 'POST', payload);

    if (res && res.status === 'success') {
        Swal.fire(t.exito || '¡Éxito!', t.link_creado_ok || 'Link generado.', 'success');
        renderTable();
    } else {
        Swal.fire('Error', res?.message || t.link_creado_err || 'No se pudo crear el link.', 'error');
    }
};
