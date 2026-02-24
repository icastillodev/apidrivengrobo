import { API } from '../../api.js';

let modalInst;
let listaSedes = [];
let catalogoModulos = [];

// Exportamos la función principal para que el HTML la llame de forma controlada
export async function initSuperInstituciones() {
    modalInst = new bootstrap.Modal(document.getElementById('modalInst'));
    
    // Conectamos botones globales a window (necesario para onclicks en HTML)
    window.abrirModalCrear = abrirModalCrear;
    window.abrirModalEditar = abrirModalEditar;
    window.guardarCambios = guardarCambios;

    await cargarCatalogoModulos();
    await cargarInstituciones();
    setupBusqueda();
}

async function cargarCatalogoModulos() {
    try {
        const res = await API.request('/superadmin/modulos/catalogo');
        if (res.status === 'success') {
            catalogoModulos = res.data;
        }
    } catch (e) { console.error("Error al cargar módulos maestros:", e); }
}

async function cargarInstituciones() {
    try {
        const res = await API.request('/superadmin/instituciones');
        if (res.status === 'success') {
            listaSedes = res.data;
            renderizarTabla(listaSedes);
        }
    } catch (err) { console.error("Error al recuperar sedes:", err); }
}

function renderizarTabla(data) {
    const tbody = document.getElementById('tabla-sedes');
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No se encontraron instituciones</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(inst => {
        const estadoBadge = inst.Activo == 1 
            ? '<span class="badge bg-success-subtle text-success border border-success-subtle px-2">ACTIVA</span>' 
            : '<span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2">INACTIVA</span>';
        
        const ceuasBadge = inst.otrosceuas == 1
            ? '<span class="badge bg-info-subtle text-info border border-info-subtle px-2">SÍ</span>'
            : '<span class="badge bg-light text-muted border px-2">NO</span>';

        // LÓGICA DE DIBUJADO DE MÓDULOS EN LA TABLA
        let modulosHtml = '';
        if (inst.modulos && inst.modulos.length > 0) {
            const modulosArr = inst.modulos.map(m => {
                const nombreCorto = m.NombreModulo.substring(0, 3).toUpperCase();
                
                if (m.estado_logico === 1) return `<span class="text-muted opacity-25 text-decoration-line-through" title="${m.NombreModulo} (Off)">${nombreCorto}</span>`;
                if (m.estado_logico === 2) return `<span class="text-warning fw-bold" title="${m.NombreModulo} (Solo Admin)">${nombreCorto}*</span>`;
                if (m.estado_logico === 3) return `<span class="text-success fw-bold" title="${m.NombreModulo} (Full)">${nombreCorto}</span>`;
            });
            modulosHtml = `<div class="d-flex flex-wrap gap-2 justify-content-center small bg-light rounded py-1 px-2 border">${modulosArr.join('')}</div>`;
        } else {
            modulosHtml = `<span class="text-muted small italic">Sin módulos asignados</span>`;
        }

        return `
            <tr onclick="abrirModalEditar(${inst.IdInstitucion})" class="cursor-pointer hover:bg-blue-50 transition-all border-b leading-tight">
                <td class="px-4 fw-bold text-primary small">#${inst.IdInstitucion}</td>
                <td>
                    <div class="fw-bold text-dark">${inst.NombreInst}</div>
                    <div class="text-muted smaller uppercase" style="font-size: 0.75rem;">${inst.NombreCompletoInst || ''}</div>
                </td>
                <td class="small">
                    <div class="text-dark"><i class="bi bi-envelope me-1 text-muted"></i>${inst.InstCorreo || '---'}</div>
                </td>
                <td>
                    <span class="d-block small fw-bold text-dark">${inst.Pais}</span>
                    <span class="text-muted smaller">${inst.Localidad || '---'}</span>
                </td>
                <td>
                    <div class="small fw-bold text-dark">Ciclo: ${inst.TipoFacturacion || 1}m</div>
                </td>
                <td class="text-center align-middle">${modulosHtml}</td>
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

function setupBusqueda() {
    document.getElementById('busqueda').oninput = (e) => {
        const term = e.target.value.toLowerCase();
        const filtrados = listaSedes.filter(i => 
            i.IdInstitucion.toString().includes(term) ||
            i.NombreInst.toLowerCase().includes(term) ||
            (i.Localidad && i.Localidad.toLowerCase().includes(term))
        );
        renderizarTabla(filtrados);
    };
}

// INYECTA LOS SELECTS DINÁMICOS BASADOS EN catalogoModulos
function dibujarSelectsModulos(valoresPrevios = []) {
    const contenedor = document.getElementById('contenedor-modulos');
    contenedor.innerHTML = '';

    catalogoModulos.forEach(mod => {
        const prev = valoresPrevios.find(v => v.IdModulosApp == mod.IdModulosApp);
        let valorSeleccionado = prev ? prev.estado_logico : 1; 

        const html = `
            <div class="col-md-3 col-6">
                <label class="form-label small fw-bold text-secondary">${mod.NombreModulo}</label>
                <select class="form-select form-select-sm module-selector" data-idmod="${mod.IdModulosApp}">
                    <option value="1" ${valorSeleccionado == 1 ? 'selected' : ''}>Desactivado</option>
                    <option value="2" ${valorSeleccionado == 2 ? 'selected' : ''}>Solo Admin</option>
                    <option value="3" ${valorSeleccionado == 3 ? 'selected' : ''}>Admin y Usuarios</option>
                </select>
            </div>
        `;
        contenedor.insertAdjacentHTML('beforeend', html);
    });
}

function abrirModalCrear() {
    document.getElementById('form-inst').reset();
    document.getElementById('IdInstitucion').value = "";
    document.getElementById('modalLabel').innerText = "Nueva Institución";
    
    document.getElementById('Pais').value = 'Uruguay';
    document.getElementById('Moneda').value = 'UYU';
    
    dibujarSelectsModulos([]); 
    modalInst.show();
}

function abrirModalEditar(id) {
    const inst = listaSedes.find(i => i.IdInstitucion == id);
    if (!inst) return;

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

    dibujarSelectsModulos(inst.modulos || []);

    modalInst.show();
}

async function guardarCambios() {
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
        modulos: [] 
    };

    document.querySelectorAll('.module-selector').forEach(select => {
        data.modulos.push({
            IdModulosApp: parseInt(select.getAttribute('data-idmod')),
            estado_logico: parseInt(select.value)
        });
    });

    const endpoint = id ? '/superadmin/instituciones/update' : '/superadmin/instituciones/create';
    if (id) data.IdInstitucion = id;

    try {
        const res = await API.request(endpoint, 'POST', data);
        
        if (res.status === 'success') {
            modalInst.hide();
            await cargarInstituciones();
            mostrarNotificacion(id ? "Datos actualizados correctamente" : "Institución creada con éxito");
        } else {
            alert("Error del servidor: " + res.message);
        }
    } catch (err) {
        console.error("Detalle del fallo:", err);
        alert("Fallo de comunicación con la API. Revise la consola.");
    }
}

function mostrarNotificacion(mensaje) {
    const toastEl = document.getElementById('liveToast');
    const msgEl = document.getElementById('toast-msg');
    if (toastEl && msgEl) {
        msgEl.innerText = mensaje;
        new bootstrap.Toast(toastEl).show();
    }
}