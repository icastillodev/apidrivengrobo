import { API } from '../../api.js';
import { SuperAuth } from '../../superAuth.js';
import { initSuperMenu } from '../../components/SuperMenuComponent.js';

let modalInst;
let listaSedes = [];

document.addEventListener('DOMContentLoaded', () => {
    // Verificamos acceso maestro (Nivel 1)
    if (SuperAuth.checkMasterAccess([1])) {
        initSuperMenu();
        modalInst = new bootstrap.Modal(document.getElementById('modalInst'));
        cargarInstituciones();
        setupBusqueda();
    }
});

/**
 * Carga inicial de datos desde la API
 */
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
 * RENDERIZADO DE TABLA
 * Incluye la nueva columna de Servicios con siglas coloreadas
 */
function renderizarTabla(data) {
    const tbody = document.getElementById('tabla-sedes');
    
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No se encontraron instituciones</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(inst => {
        // Badges de Estado General
        const estadoBadge = inst.Activo == 1 
            ? '<span class="badge bg-success-subtle text-success border border-success-subtle px-2">ACTIVA</span>' 
            : '<span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2">INACTIVA</span>';
        
        const ceuasBadge = inst.otrosceuas == 1
            ? '<span class="badge bg-info-subtle text-info border border-info-subtle px-2">SÍ</span>'
            : '<span class="badge bg-light text-muted border px-2">NO</span>';

        // LÓGICA DE SERVICIOS (Visualización compacta)
        // 1: Verde (Habilitado), 2: Naranja (Admin), 3: Tachado (Off)
        const check = (val, label) => {
            // Convertimos a entero por seguridad
            const v = parseInt(val) || 1; 
            if (v === 1) return `<span class="text-success fw-bold" title="Habilitado para Todos">${label}</span>`;
            if (v === 2) return `<span class="text-warning fw-bold" title="Solo Administradores">${label}*</span>`; 
            return `<span class="text-muted opacity-25 text-decoration-line-through" title="Deshabilitado">${label}</span>`;
        };

        const serviciosArr = [
            check(inst.Alojamiento, 'Al'),
            check(inst.Animales, 'An'),
            check(inst.Reactivos, 'Re'),
            check(inst.Reservas, 'Rs'),
            check(inst.Insumos, 'In')
        ];
        
        const serviciosHtml = `<div class="d-flex gap-2 justify-content-center small bg-light rounded py-1 border">${serviciosArr.join('')}</div>`;

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
                    <div style="max-width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${inst.Detalle || '---'}
                    </div>
                </td>
                
                <td>
                    <div class="small fw-bold text-dark">Ciclo: ${inst.TipoFacturacion || 1}m</div>
                    <div class="smaller text-muted">Contrato: ${inst.FechaContrato || 'N/A'}</div>
                </td>

                <td class="text-center align-middle" style="min-width: 140px;">
                    ${serviciosHtml}
                </td>

                <td class="small text-center">
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
 * BÚSQUEDA EN TIEMPO REAL
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
 * ABRIR MODAL PARA CREAR (Resetea formulario y defaults)
 */
window.abrirModalCrear = () => {
    document.getElementById('form-inst').reset();
    document.getElementById('IdInstitucion').value = "";
    document.getElementById('modalLabel').innerText = "Nueva Institución";
    
    // Defaults para campos específicos
    document.getElementById('Pais').value = 'Uruguay';
    document.getElementById('Moneda').value = 'UYU';
    
    // DEFAULT SERVICIOS: Todos en "1" (Habilitado)
    ['Alojamiento', 'Animales', 'Reactivos', 'Reservas', 'Insumos'].forEach(s => {
        const el = document.getElementById(`Serv_${s}`);
        if(el) el.value = 1; 
    });

    modalInst.show();
};

/**
 * ABRIR MODAL PARA EDITAR (Carga datos existentes)
 */
window.abrirModalEditar = (id) => {
    const inst = listaSedes.find(i => i.IdInstitucion == id);
    if (!inst) return;

    document.getElementById('modalLabel').innerText = `Editando: ${inst.NombreInst}`;
    document.getElementById('IdInstitucion').value = inst.IdInstitucion;
    
    // Campos de Texto y Selects Simples
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

    // CARGA DE SERVICIOS (Si es null, fallback a 1)
    // Usamos el operador ?? para asegurar que el 0 o null no rompan
    document.getElementById('Serv_Alojamiento').value = inst.Alojamiento ?? 1;
    document.getElementById('Serv_Animales').value = inst.Animales ?? 1;
    document.getElementById('Serv_Reactivos').value = inst.Reactivos ?? 1;
    document.getElementById('Serv_Reservas').value = inst.Reservas ?? 1;
    document.getElementById('Serv_Insumos').value = inst.Insumos ?? 1;

    modalInst.show();
};

/**
 * GUARDAR CAMBIOS (Create o Update)
 */
window.guardarCambios = async () => {
    const id = document.getElementById('IdInstitucion').value;
    
    // Construcción del Payload
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
        PrecioJornadaTrabajoExp: 0,

        // NUEVOS CAMPOS DE SERVICIOS
        Serv_Alojamiento: document.getElementById('Serv_Alojamiento').value,
        Serv_Animales: document.getElementById('Serv_Animales').value,
        Serv_Reactivos: document.getElementById('Serv_Reactivos').value,
        Serv_Reservas: document.getElementById('Serv_Reservas').value,
        Serv_Insumos: document.getElementById('Serv_Insumos').value
    };

    const endpoint = id ? '/superadmin/instituciones/update' : '/superadmin/instituciones/create';
    if (id) data.IdInstitucion = id;

    try {
        const res = await API.request(endpoint, 'POST', data);
        
        if (res.status === 'success') {
            modalInst.hide();
            cargarInstituciones();
            mostrarNotificacion(id ? "Datos actualizados correctamente" : "Institución creada con éxito");
        } else {
            alert("Error del servidor: " + res.message);
        }
    } catch (err) {
        console.error("Detalle del fallo:", err);
        alert("Fallo de comunicación con la API. Revise la consola.");
    }
};

/**
 * Toast básico de notificación
 */
function mostrarNotificacion(mensaje) {
    const toastEl = document.getElementById('liveToast');
    const msgEl = document.getElementById('toast-msg');
    
    if (toastEl && msgEl) {
        msgEl.innerText = mensaje;
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    } else {
        alert("✅ " + mensaje);
    }
}