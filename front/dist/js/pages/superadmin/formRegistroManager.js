// ***************************************************
// JS: formRegistroManager.js
// ***************************************************

import { API } from '../../api.js';

export async function initFormAdmin() {
    renderTable();
}

async function renderTable() {
    const res = await API.request('/superadmin/form-registros/all');
    const tbody = document.getElementById('table-body-forms');
    
    if (!res || res.status !== 'success' || !res.data) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger font-bold py-4">No se pudieron cargar los formularios o no hay registros.</td></tr>';
        return;
    }

    tbody.innerHTML = '';

    res.data.forEach(row => {
        const isActivo = parseInt(row.activo) === 1;
        
        // Estilo visual de la fila si está deshabilitada
        const rowClass = isActivo ? "hover:bg-slate-50 transition-colors cursor-pointer" : "bg-red-50 text-muted opacity-75 cursor-pointer";
        const slugDisplay = isActivo ? `
        <a href="${window.location.origin}${window.location.pathname.includes('URBE-API-DRIVEN') ? '/URBE-API-DRIVEN/front' : ''}/formulario/${row.slug_url}" 
       target="_blank" 
       class="btn btn-sm btn-outline-primary fw-bold px-2 py-1 shadow-sm"
       title="Abrir formulario público">
        <i class="bi bi-box-arrow-up-right me-1"></i> /formulario/${row.slug_url}
    </a>` : `<span class="text-danger small fw-bold">DESHABILITADO</span>`;
        
        const tr = document.createElement('tr');
        tr.className = rowClass;
        tr.onclick = () => window.verDetalleCompleto(row.id_form_config);

        // Botón de Toggle (Habilitar / Deshabilitar)
        const toggleBtnClass = isActivo ? "btn-outline-warning" : "btn-success";
        const toggleIcon = isActivo ? "bi-pause-circle" : "bi-play-circle";
        const toggleText = isActivo ? "Pausar" : "Activar";
        const toggleAction = isActivo ? 0 : 1;

        tr.innerHTML = `
            <td class="font-bold text-center">${row.id_form_config}</td>
            <td class="font-bold ${isActivo ? 'text-slate-700' : ''}">${row.nombre_inst_previa}</td>
            <td>${row.encargado_nombre}</td>
            <td>${slugDisplay}</td>
            <td class="text-center">
                <span class="badge ${row.campos_completados > 0 ? 'bg-success' : 'bg-secondary'} px-2 py-1">
                    ${row.campos_completados} datos cargados
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
                    <i class="bi bi-trash"></i> Eliminar
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// TOGGLE STATUS
window.toggleLinkStatus = async (id, newStatus) => {
    const actionText = newStatus === 1 ? 'habilitar' : 'deshabilitar';
    const confirm = await Swal.fire({
        title: `¿${actionText.toUpperCase()} Link?`,
        text: newStatus === 1 ? "La institución podrá volver a ingresar datos." : "La institución ya no podrá acceder a este formulario.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: newStatus === 1 ? '#198754' : '#ffc107',
        confirmButtonText: `SÍ, ${actionText.toUpperCase()}`,
        cancelButtonText: 'CANCELAR'
    });

    if (confirm.isConfirmed) {
        Swal.fire({ title: 'Actualizando...', didOpen: () => Swal.showLoading() });
        const res = await API.request('/superadmin/form-registros/toggle-status', 'POST', { id_form_config: id, status: newStatus });
        
        if (res && res.status === 'success') {
            Swal.fire('Actualizado', 'El estado del enlace ha cambiado.', 'success');
            renderTable();
        } else {
            Swal.fire('Error', res?.message || 'Error al actualizar.', 'error');
        }
    }
};

// ELIMINAR
window.deleteLink = async (id) => {
    const confirm = await Swal.fire({
        title: '¿Eliminar este Link?',
        text: "Esta acción borrará el acceso y todas las respuestas cargadas permanentemente.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonText: 'CANCELAR',
        confirmButtonText: 'SÍ, ELIMINAR'
    });

    if (confirm.isConfirmed) {
        Swal.fire({ title: 'Borrando...', didOpen: () => Swal.showLoading() });
        const res = await API.request('/superadmin/form-registros/delete', 'POST', { id_form_config: id });
        
        if (res && res.status === 'success') {
            Swal.fire('Eliminado', 'El registro ha sido borrado.', 'success');
            renderTable();
        } else {
            Swal.fire('Error', res?.message || 'Error al intentar eliminar.', 'error');
        }
    }
};

// VISOR DE DETALLES (bloques legibles + i18n)
const SECCION_ORDER = [
    'institucion', 'organizaciones', 'departamentos', 'tipo_protocolo', 'severidad', 'tipo_formulario',
    'reactivos', 'insumos', 'servicios', 'reservas', 'especies',
    'permisos_rol_4_sec_admin', 'permisos_rol_5_asistente', 'permisos_rol_6_laboratorio'
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
    permisos_rol_6_laboratorio: 'seccion_permisos_laboratorio'
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
        traz_nom: t.campo_trazabilidad, traz_tipo: t.campo_trazabilidad
    };
    const base = (campo || '').replace(/\[\]$/, '').replace(/_?\d+$/g, '').replace(/_\d+_/g, '_');
    const key = Object.keys(map).find(k => base === k || base.startsWith(k + '_'));
    return (key && map[key]) ? map[key] : (base.replace(/_/g, ' ').replace(/^\w/, w => w.toUpperCase()));
}

window.verDetalleCompleto = async (id) => {
    Swal.fire({ title: 'Cargando datos...', didOpen: () => Swal.showLoading() });
    
    const res = await API.request(`/superadmin/form-registros/detail/${id}`);
    const container = document.getElementById('content-detalle-eav');
    const t = window.txt?.superadmin_formulario || {};

    Swal.close();

    if (!res || res.status !== 'success' || !res.data) {
        Swal.fire('Error', 'No se pudieron recuperar los detalles.', 'error');
        return;
    }

    container.innerHTML = '';

    if (Object.keys(res.data).length === 0) {
        container.innerHTML = `<div class="alert alert-info text-center font-bold uppercase">${t.detalle_sin_datos || 'La institución aún no ha cargado datos en este formulario.'}</div>`;
    } else {
        const categoriasOrdenadas = SECCION_ORDER.filter(cat => res.data[cat]);
        const restantes = Object.keys(res.data).filter(cat => !SECCION_ORDER.includes(cat));
        const ordenFinal = [...categoriasOrdenadas, ...restantes];

        ordenFinal.forEach(categoria => {
            const campos = res.data[categoria];
            if (!campos || !campos.length) return;

            const tituloSeccion = t[SECCION_I18N[categoria]] || categoria.replace(/_/g, ' ');
            let sectionHtml = `
                <div class="mb-4 bg-white p-3 rounded shadow-sm border-start border-4 border-success">
                    <h6 class="font-black text-success uppercase text-xs mb-3 italic tracking-wider border-bottom pb-2">
                        <i class="bi bi-folder-fill me-1"></i> ${tituloSeccion}
                    </h6>
                    <div class="row g-3">
            `;

            campos.forEach(c => {
                const label = getCampoLabel(c.campo, t);
                let valor = c.valor || '';
                if (valor === '1' || valor === '2') valor = valor === '1' ? (t.valor_si || 'Sí') : (t.valor_no || 'No');
                if (c.campo && c.campo.includes('menuRol')) valor = valor ? (t.valor_si || 'Sí') : (t.valor_no || 'No');

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

            sectionHtml += `</div></div>`;
            container.insertAdjacentHTML('beforeend', sectionHtml);
        });
    }

    new bootstrap.Modal(document.getElementById('modal-detalle-form')).show();
};

window.openCreateLinkModal = async () => {
    // ... (Tu código de openCreateLinkModal se mantiene exactamente igual) ...
    const { value: formValues } = await Swal.fire({
        title: 'Generar Nuevo Link de Registro',
        html:
            '<div class="text-start">' +
            '<label class="small font-bold text-muted">NOMBRE DE LA INSTITUCIÓN</label>' +
            '<input id="swal-name" class="swal2-input mt-1 mb-3 w-100" placeholder="Ej: Universidad Nacional">' +
            '<label class="small font-bold text-muted">NOMBRE DEL ENCARGADO</label>' +
            '<input id="swal-encargado" class="swal2-input mt-1 mb-3 w-100" placeholder="Ej: Dr. Juan Pérez">' +
            '<label class="small font-bold text-muted">SLUG DE URL (Único)</label>' +
            '<input id="swal-slug" class="swal2-input mt-1 w-100" placeholder="Ej: unlp-2026">' +
            '</div>',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'CREAR ACCESO',
        confirmButtonColor: '#1a5d3b',
        preConfirm: () => {
            const name = document.getElementById('swal-name').value;
            const encargado = document.getElementById('swal-encargado').value;
            const slug = document.getElementById('swal-slug').value;

            if (!name || !encargado || !slug) {
                Swal.showValidationMessage('Todos los campos son obligatorios');
                return false;
            }
            return {
                nombre_inst_previa: name,
                encargado_nombre: encargado,
                slug_url: slug
            }
        }
    });

    if (formValues) {
        Swal.fire({ title: 'Procesando...', didOpen: () => Swal.showLoading() });
        const res = await API.request('/superadmin/form-registros/create-link', 'POST', formValues);
        
        if(res && res.status === 'success') {
            Swal.fire('¡Éxito!', 'El link de registro ha sido generado.', 'success');
            renderTable();
        } else {
            Swal.fire('Error', res?.message || 'No se pudo crear el link.', 'error');
        }
    }
};