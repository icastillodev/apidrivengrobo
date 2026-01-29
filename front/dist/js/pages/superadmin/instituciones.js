import { API } from '../../api.js';
import { SuperAuth } from '../../superAuth.js';
import { initSuperMenu } from '../../components/SuperMenuComponent.js';

let modalInst;
let listaSedes = [];

document.addEventListener('DOMContentLoaded', () => {
    if (SuperAuth.checkMasterAccess([1])) {
        initSuperMenu();
        modalInst = new bootstrap.Modal(document.getElementById('modalInst'));
        cargarInstituciones();
        setupBusqueda();
    }
});

async function cargarInstituciones() {
    try {
        const res = await API.request('/superadmin/instituciones');
        if (res.status === 'success') {
            listaSedes = res.data;
            renderizarTabla(listaSedes);
        }
    } catch (err) { console.error("Error al recuperar sedes:", err); }
}

/**
 * RENDERIZADO: 9 Columnas alineadas al THEAD
 */
function renderizarTabla(data) {
    const tbody = document.getElementById('tabla-sedes');
    tbody.innerHTML = data.map(inst => {
        const estadoBadge = inst.Activo == 1 
            ? '<span class="badge bg-success-subtle text-success border border-success-subtle px-2">ACTIVA</span>' 
            : '<span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2">INACTIVA</span>';
        
        const ceuasBadge = inst.otrosceuas == 1
            ? '<span class="badge bg-info-subtle text-info border border-info-subtle px-2">SÍ</span>'
            : '<span class="badge bg-light text-muted border px-2">NO</span>';

        return `
            <tr onclick="abrirModalEditar(${inst.IdInstitucion})" class="cursor-pointer hover:bg-blue-50 transition-all border-b leading-tight">
                <td class="px-4 fw-bold text-primary small">#${inst.IdInstitucion}</td>
                <td>
                    <div class="fw-bold text-dark">${inst.NombreInst}</div>
                    <div class="text-muted smaller uppercase" style="font-size: 0.75rem;">${inst.NombreCompletoInst || ''}</div>
                    <div class="text-primary smaller fw-bold mt-1" style="font-size: 0.7rem;">DEP: ${inst.DependenciaInstitucion || '---'}</div>
                </td>
                <td class="small">
                    <div class="text-dark"><i class="bi bi-envelope me-1 text-muted"></i>${inst.InstCorreo || '---'}</div>
                    <div class="text-muted smaller"><i class="bi bi-link-45deg me-1"></i>${inst.Web ? 'Web Activa' : 'Sin Web'}</div>
                </td>
                <td>
                    <span class="d-block small fw-bold text-dark">${inst.Pais}</span>
                    <span class="text-muted smaller">${inst.Localidad || '---'}</span>
                </td>
                <td class="small italic text-muted">
                    <div style="max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${inst.Detalle || '---'}
                    </div>
                </td>
                <td>
                    <div class="small fw-bold text-dark">Ciclo: ${inst.TipoFacturacion || 1}m</div>
                    <div class="smaller text-muted">Contrato: ${inst.FechaContrato || 'N/A'}</div>
                </td>
                <td class="small">
                    <div class="${inst.UltimoPago ? 'text-success' : 'text-danger'} fw-bold">
                        ${inst.UltimoPago || 'PENDIENTE'}
                    </div>
                </td>
                <td class="text-center">${ceuasBadge}</td>
                <td class="text-center">${estadoBadge}</td>
            </tr>
        `;
    }).join('');
}

/**
 * BÚSQUEDA TOTAL
 */
function setupBusqueda() {
    document.getElementById('busqueda').oninput = (e) => {
        const term = e.target.value.toLowerCase();
        const filtrados = listaSedes.filter(i => 
            i.IdInstitucion.toString().includes(term) ||
            i.NombreInst.toLowerCase().includes(term) ||
            (i.NombreCompletoInst && i.NombreCompletoInst.toLowerCase().includes(term)) ||
            (i.DependenciaInstitucion && i.DependenciaInstitucion.toLowerCase().includes(term)) ||
            (i.Detalle && i.Detalle.toLowerCase().includes(term)) ||
            (i.Localidad && i.Localidad.toLowerCase().includes(term))
        );
        renderizarTabla(filtrados);
    };
}

/**
 * MODALES (Aquí se soluciona el ReferenceError)
 */
window.abrirModalCrear = () => {
    document.getElementById('form-inst').reset();
    document.getElementById('IdInstitucion').value = "";
    document.getElementById('modalLabel').innerText = "Nueva Institución";
    modalInst.show();
};

window.abrirModalEditar = (id) => {
    // Buscamos la institución en el array local
    const inst = listaSedes.find(i => i.IdInstitucion == id);
    if (!inst) return; // Si no existe, salimos para evitar el ReferenceError

    document.getElementById('modalLabel').innerText = `Editando: ${inst.NombreInst}`;
    document.getElementById('IdInstitucion').value = inst.IdInstitucion;
    document.getElementById('NombreInst').value = inst.NombreInst;
    document.getElementById('NombreCompletoInst').value = inst.NombreCompletoInst || '';
    document.getElementById('DependenciaInstitucion').value = inst.DependenciaInstitucion || '';
    document.getElementById('InstCorreo').value = inst.InstCorreo || '';
    document.getElementById('Pais').value = inst.Pais || 'Uruguay';
    document.getElementById('Localidad').value = inst.Localidad || '';
    document.getElementById('Moneda').value = inst.Moneda || 'UYU';
    document.getElementById('Web').value = inst.Web || '';
    document.getElementById('Logo').value = inst.Logo || '';
    document.getElementById('otrosceuas').value = inst.otrosceuas || 2;
    document.getElementById('TipoApp').value = inst.TipoApp || 1;
    document.getElementById('Activo').value = inst.Activo;
    document.getElementById('UltimoPago').value = inst.UltimoPago || '';
    document.getElementById('TipoFacturacion').value = inst.TipoFacturacion || 1;
    document.getElementById('FechaContrato').value = inst.FechaContrato || '';
    document.getElementById('Detalle').value = inst.Detalle || '';

    modalInst.show();
};

window.guardarCambios = async () => {
    const id = document.getElementById('IdInstitucion').value;
    const data = {
        NombreInst: document.getElementById('NombreInst').value,
        NombreCompletoInst: document.getElementById('NombreCompletoInst').value,
        DependenciaInstitucion: document.getElementById('DependenciaInstitucion').value,
        InstCorreo: document.getElementById('InstCorreo').value,
        Pais: document.getElementById('Pais').value,
        Localidad: document.getElementById('Localidad').value,
        Moneda: document.getElementById('Moneda').value,
        Web: document.getElementById('Web').value,
        Logo: document.getElementById('Logo').value || '',
        otrosceuas: document.getElementById('otrosceuas').value,
        TipoApp: document.getElementById('TipoApp').value,
        Activo: document.getElementById('Activo').value,
        UltimoPago: document.getElementById('UltimoPago').value || null,
        TipoFacturacion: document.getElementById('TipoFacturacion').value,
        FechaContrato: document.getElementById('FechaContrato').value || null,
        Detalle: document.getElementById('Detalle').value,
        PrecioJornadaTrabajoExp: 0
    };

    const endpoint = id ? '/superadmin/instituciones/update' : '/superadmin/instituciones/create';
    if (id) data.IdInstitucion = id;

    try {
        const res = await API.request(endpoint, 'POST', data);
        
        if (res.status === 'success') {
            modalInst.hide();
            cargarInstituciones();
            mostrarNotificacion(id ? "Datos actualizados" : "Sede creada con éxito");
        } else {
            // Error controlado devuelto por tu controlador PHP
            alert("Error de la API: " + res.message);
        }
    } catch (err) {
        // ERROR DETALLADO: Aquí capturamos lo que realmente pasó
        console.error("Detalle del fallo:", err);
        
        // Si el error tiene un cuerpo de respuesta (JSON sucio), lo mostramos
        const mensajeError = err.message || "Error desconocido";
        alert("Fallo en la comunicación: " + mensajeError + "\n\nRevisá la consola (F12) para ver la respuesta cruda del servidor.");
    }
};
/**
 * Muestra un mensaje de éxito al usuario
 */
function mostrarNotificacion(mensaje) {
    // Si usas SweetAlert2 o Toastr, aquí iría su lógica.
    // Por ahora, usamos un alert simple para que no rompa el código:
    alert("✅ " + mensaje);
    
    // Si querés algo más profesional y usas Bootstrap:
    console.log("Notificación: " + mensaje);
}