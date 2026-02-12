// ***************************************************
// JS: formRegistroManager.js
// ***************************************************
// Gestión administrativa de links de registro institucional y visor de datos EAV.
// Sistema: Bioterio Central (Gecko Devs 2026)
// ***************************************************

import { API } from '../../api.js';

/**
 * INICIALIZACIÓN DEL MÓDULO
 */
export async function initFormAdmin() {
    renderTable();
}

// ***************************************************
// RENDERIZADO DE LA GRILLA PRINCIPAL
// ***************************************************
// Obtiene los links configurados y los muestra en la tabla con validación de datos.
async function renderTable() {
    const res = await API.request('/superadmin/form-registros/all');
    const tbody = document.getElementById('table-body-forms');
    
    // VALIDACIÓN DE SEGURIDAD: Evita fallos si la API no responde el formato esperado
    if (!res || res.status !== 'success' || !res.data) {
        console.error("Error al obtener datos de la API:", res?.message || "Respuesta inválida");
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger font-bold py-4">No se pudieron cargar los formularios o no hay registros.</td></tr>';
        return;
    }

    tbody.innerHTML = '';

    res.data.forEach(row => {
        const tr = document.createElement('tr');
        tr.className = "cursor-pointer hover:bg-slate-50 transition-colors";
        
        // Al hacer clic en la fila se abre el visor de detalles EAV
        tr.onclick = () => window.verDetalleCompleto(row.id_form_config);

        tr.innerHTML = `
            <td class="font-bold text-muted text-center">${row.id_form_config}</td>
            <td class="font-bold text-slate-700">${row.nombre_inst_previa}</td>
            <td class="text-slate-600">${row.encargado_nombre}</td>
            <td><code class="text-primary bg-slate-100 px-2 py-1 rounded">/formulario/${row.slug_url}</code></td>
            <td class="text-center">
                <span class="badge ${row.campos_completados > 0 ? 'bg-success' : 'bg-secondary'} px-2 py-1">
                    ${row.campos_completados} datos cargados
                </span>
            </td>
            <td class="text-muted" style="font-size: 11px;">${row.creado_el}</td>
            <td class="text-center">
                <button class="btn btn-outline-danger btn-sm border-0" 
                        onclick="event.stopPropagation(); window.deleteLink(${row.id_form_config})">
                    <i class="bi bi-trash"></i> Eliminar
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ***************************************************
// VISOR DE DETALLES (ESTRUCTURA EAV)
// ***************************************************
// Reconstruye dinámicamente las respuestas agrupadas por categoría en el modal.
window.verDetalleCompleto = async (id) => {
    const res = await API.request(`/superadmin/form-registros/detail/${id}`);
    const container = document.getElementById('content-detalle-eav');
    
    if (!res || res.status !== 'success' || !res.data) {
        Swal.fire('Error', 'No se pudieron recuperar los detalles del formulario.', 'error');
        return;
    }

    container.innerHTML = '';

    // Si no hay respuestas aún
    if (Object.keys(res.data).length === 0) {
        container.innerHTML = `<div class="alert alert-info text-center font-bold uppercase">La institución aún no ha cargado datos en este formulario.</div>`;
    } else {
        // El backend devuelve los datos agrupados por CATEGORIA
        for (const [categoria, campos] of Object.entries(res.data)) {
            let sectionHtml = `
                <div class="mb-4 bg-white p-3 rounded shadow-sm border-l-4 border-success">
                    <h6 class="font-black text-success uppercase text-xs mb-3 italic tracking-wider">
                        <i class="bi bi-folder-fill me-1"></i> CATEGORÍA: ${categoria}
                    </h6>
                    <div class="row g-2">
            `;

            campos.forEach(c => {
                sectionHtml += `
                    <div class="col-md-4 mb-2">
                        <label class="d-block text-muted fw-bold uppercase" style="font-size: 9px;">${c.campo.replace('inst_', '').replace(/_/g, ' ')}</label>
                        <div class="border-bottom pb-1 text-slate-800 font-medium" style="font-size: 12px;">
                            ${c.valor || '<span class="text-slate-300 italic">No proporcionado</span>'}
                        </div>
                    </div>
                `;
            });

            sectionHtml += `</div></div>`;
            container.insertAdjacentHTML('beforeend', sectionHtml);
        }
    }

    new bootstrap.Modal(document.getElementById('modal-detalle-form')).show();
};

// ***************************************************
// CREACIÓN DE NUEVO LINK DE ACCESO
// ***************************************************
// Abre modal de SweetAlert2 y procesa el guardado del nuevo link.
window.openCreateLinkModal = async () => {
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
            Swal.fire('¡Éxito!', 'El link de registro ha sido generado correctamente.', 'success');
            renderTable();
        } else {
            Swal.fire('Error', res?.message || 'No se pudo crear el link.', 'error');
        }
    }
};

// ***************************************************
// ELIMINACIÓN TÉCNICA
// ***************************************************
window.deleteLink = async (id) => {
    const confirm = await Swal.fire({
        title: '¿Eliminar este Link?',
        text: "Esta acción borrará el acceso y todas las respuestas cargadas por la institución.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'SÍ, ELIMINAR',
        cancelButtonText: 'CANCELAR'
    });

    if (confirm.isConfirmed) {
        const res = await API.request('/superadmin/form-registros/delete', 'POST', { id_form_config: id });
        if (res && res.status === 'success') {
            Swal.fire('Eliminado', 'El registro ha sido borrado.', 'success');
            renderTable();
        } else {
            Swal.fire('Error', res?.message || 'Error al intentar eliminar.', 'error');
        }
    }
};