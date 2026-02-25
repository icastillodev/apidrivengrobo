import { API } from './api.js';

let especieCount = 0;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. OBTENER SLUG DESDE LA URL (Compatible con ?inst=cnea o /formulario/cnea)
    const urlParams = new URLSearchParams(window.location.search);
    let slug = urlParams.get('inst');

    if (!slug) {
        const pathParts = window.location.pathname.split('/').filter(p => p !== "");
        const formIdx = pathParts.indexOf('formulario');
        if (formIdx !== -1 && pathParts[formIdx + 1]) {
            slug = pathParts[formIdx + 1];
        }
    }

    if (!slug) {
        document.body.innerHTML = `<div class="p-5 text-center"><h1 class="text-danger">URL Inválida</h1><p>No se especificó la institución.</p></div>`;
        return;
    }

    // 2. CARGAR DATOS DE CONFIGURACIÓN (RUTA PÚBLICA)
    try {
        const res = await API.request(`/form-registro/config/${slug}`);
        
        if (res && res.status === 'success') {
            document.getElementById('id_form_config').value = res.data.id_form_config; 
            document.getElementById('display-nombre-inst').innerText = res.data.nombre_inst_previa;
            document.getElementById('display-encargado').innerText = `Responsable: ${res.data.encargado_nombre}`;
            
            cargarValoresPorDefecto();
        } else {
            throw new Error("El enlace ha expirado o no es válido.");
        }
    } catch (e) { 
        console.error("Error al iniciar:", e);
        mostrarErrorPantalla("El enlace no es válido o el servidor no responde.");
        return; // Detener ejecución si falla la carga inicial
    }

    // 3. LISTENERS DE BOTONES (Dinámicos)
    document.getElementById('btn-add-depto').onclick = () => agregarItemDoble('contenedor-deptos', 'depto_nom[]', 'depto_org[]', 'Nombre Departamento', 'Organismo Superior');
    document.getElementById('btn-add-prot').onclick = () => agregarItemSimple('contenedor-tipos-prot', 'prot_tipo[]', 'Ej: Investigación, Docencia');
    document.getElementById('btn-add-sev').onclick = () => agregarItemSimple('contenedor-severidades', 'sev_tipo[]', 'Ej: Leve, Moderada');
    document.getElementById('btn-add-reactivo').onclick = () => agregarInventario('contenedor-reactivos', 'reac');
    document.getElementById('btn-add-insumo').onclick = () => agregarInventario('contenedor-insumos', 'ins');
    document.getElementById('btn-add-sala').onclick = () => agregarItemDoble('contenedor-salas', 'sala_nom[]', 'sala_lugar[]', 'Nombre Sala', 'Ubicación Física');
    document.getElementById('btn-add-instrumento').onclick = () => agregarItemDoble('contenedor-instrumentos', 'instru_nom[]', 'instru_cant[]', 'Nombre Instrumento', 'Cantidad', 'number');
    document.getElementById('btn-add-especie').onclick = agregarEspecie;

    // BOTONES DE LA BARRA SUPERIOR
    document.getElementById('btn-save-draft').onclick = () => saveForm('save');
    document.getElementById('btn-confirm-reg').onclick = () => saveForm('confirm');
});

// --- RENDERIZADORES ---

function mostrarErrorPantalla(msj) {
    document.body.innerHTML = `<div class="p-5 text-center"><h1 class="text-danger">Error</h1><p>${msj}</p><a href="https://groboapp.com" class="btn btn-primary">Volver</a></div>`;
}

function cargarValoresPorDefecto() {
    // Solo agregar si el contenedor está vacío para evitar duplicados en recargas
    if(document.getElementById('contenedor-tipos-prot').children.length === 0) {
        ['Investigación', 'Docencia'].forEach(v => agregarItemSimple('contenedor-tipos-prot', 'prot_tipo[]', '', v));
        ['Sin recuperación', 'Leve', 'Moderada', 'Severa'].forEach(v => agregarItemSimple('contenedor-severidades', 'sev_tipo[]', '', v));
        agregarDeptoDefecto();
    }
}

// Funciones de ayuda UI (Item Simple, Doble, Inventario, Especies...)
function agregarItemSimple(containerId, inputName, placeholder = '', val = '') {
    const html = `
        <div class="input-group input-group-sm mb-2">
            <input type="text" class="form-control" name="${inputName}" value="${val}" placeholder="${placeholder}">
            <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()">×</button>
        </div>`;
    document.getElementById(containerId).insertAdjacentHTML('beforeend', html);
}

function agregarItemDoble(containerId, name1, name2, ph1, ph2, type2 = 'text') {
    const html = `
        <div class="row g-1 mb-2">
            <div class="col-6"><input type="text" class="form-control form-control-sm" name="${name1}" placeholder="${ph1}"></div>
            <div class="col-5"><input type="${type2}" class="form-control form-control-sm" name="${name2}" placeholder="${ph2}"></div>
            <div class="col-1"><button class="btn btn-sm btn-outline-danger w-100" type="button" onclick="this.parentElement.parentElement.remove()">×</button></div>
        </div>`;
    document.getElementById(containerId).insertAdjacentHTML('beforeend', html);
}

function agregarDeptoDefecto() {
    agregarItemDoble('contenedor-deptos', 'depto_nom[]', 'depto_org[]', 'Ej: Biología Celular', 'Ej: Facultad de Ciencias');
}

function agregarInventario(containerId, prefix) {
    const html = `
        <div class="dynamic-box mb-2 p-2 border rounded bg-light position-relative">
            <button type="button" class="btn-close position-absolute top-0 end-0 m-1" style="font-size: 0.6rem" onclick="this.parentElement.remove()"></button>
            <div class="row g-2">
                <div class="col-12"><input type="text" class="form-control form-control-sm fw-bold" name="${prefix}_nom[]" placeholder="Producto"></div>
                <div class="col-4"><input type="number" class="form-control form-control-sm" name="${prefix}_cant[]" placeholder="Cant."></div>
                <div class="col-4"><input type="text" class="form-control form-control-sm" name="${prefix}_medida[]" placeholder="Unidad"></div>
                <div class="col-4"><input type="number" class="form-control form-control-sm" name="${prefix}_precio[]" placeholder="Precio $"></div>
            </div>
        </div>`;
    document.getElementById(containerId).insertAdjacentHTML('beforeend', html);
}

function agregarEspecie() {
    especieCount++;
    const html = `
        <div class="dynamic-box p-3 mb-3 border-start border-4 border-success shadow-sm bg-white rounded">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <input type="text" class="form-control form-control-sm fw-bold w-50" placeholder="Nombre Especie (Ej: Ratón)" name="esp_nombre_${especieCount}">
                <button type="button" class="btn-close" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
            <div class="row g-2">
                <div class="col-md-6">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <label class="small fw-bold text-success">Cepas / Genéticas</label>
                        <button type="button" class="btn btn-xs btn-outline-success" onclick="window.agregarSubespecie(${especieCount})">+</button>
                    </div>
                    <div id="sub-contenedor-${especieCount}"></div>
                </div>
                <div class="col-md-6">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <label class="small fw-bold text-primary">Alojamiento</label>
                        <button type="button" class="btn btn-xs btn-outline-primary" onclick="window.agregarAlojamiento(${especieCount})">+</button>
                    </div>
                    <div id="aloj-contenedor-${especieCount}"></div>
                </div>
            </div>
        </div>`;
    document.getElementById('contenedor-especies').insertAdjacentHTML('beforeend', html);
    window.agregarSubespecie(especieCount);
    window.agregarAlojamiento(especieCount);
}

window.agregarSubespecie = (parentID) => {
    const html = `
        <div class="input-group input-group-sm mb-1">
            <input type="text" class="form-control" placeholder="Cepa" name="sub_nom_${parentID}[]">
            <input type="number" class="form-control" placeholder="$" name="sub_precio_${parentID}[]" style="max-width: 80px;">
            <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()">×</button>
        </div>`;
    document.getElementById(`sub-contenedor-${parentID}`).insertAdjacentHTML('beforeend', html);
};

window.agregarAlojamiento = (parentID) => {
    const html = `
        <div class="input-group input-group-sm mb-1">
            <input type="text" class="form-control" placeholder="Tipo" name="aloj_nom_${parentID}[]">
            <input type="number" class="form-control" placeholder="$" name="aloj_precio_${parentID}[]" style="max-width: 80px;">
            <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()">×</button>
        </div>`;
    document.getElementById(`aloj-contenedor-${parentID}`).insertAdjacentHTML('beforeend', html);
};

// --- PERSISTENCIA EAV ---

async function saveForm(action) {
    const idForm = document.getElementById('id_form_config').value;
    const formElement = document.getElementById('form-full-registro');
    
    if(!idForm) {
        Swal.fire('Error', 'No se detectó el ID de configuración.', 'error');
        return;
    }

    const formData = new FormData(formElement);
    let respuestas = [];

    formData.forEach((value, key) => {
        if (!value || value.toString().trim() === '') return;

        let categoria = 'institucion'; 
        if (key.startsWith('esp_') || key.startsWith('sub_') || key.startsWith('aloj_')) categoria = 'especies';
        else if (key.startsWith('sev_')) categoria = 'severidad';
        else if (key.startsWith('prot_')) categoria = 'tipo_protocolo';
        else if (key.startsWith('depto_')) categoria = 'departamentos';
        else if (key.startsWith('reac_')) categoria = 'reactivos';
        else if (key.startsWith('ins_')) categoria = 'insumos';
        else if (key.startsWith('sala_') || key.startsWith('instru_')) categoria = 'reservas';

        respuestas.push({ categoria, campo: key, valor: value });
    });

    if (action === 'confirm') {
        const result = await Swal.fire({
            title: '¿Finalizar y enviar?',
            text: "Se notificará al administrador de GROBO para revisar y dar de alta su institución.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1a5d3b',
            confirmButtonText: 'SÍ, ENVIAR AHORA'
        });
        if (!result.isConfirmed) return;
    }

    Swal.fire({ title: 'Guardando datos...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const payload = { id_form: idForm, respuestas: respuestas, action: action };
        
        // Enviamos al backend
        const res = await API.request('/form-registro/submit', 'POST', payload);

        if (res && res.status === 'success') {
            Swal.fire({
                title: '¡Guardado!',
                text: action === 'confirm' ? 'Los datos han sido enviados al administrador.' : 'Progreso guardado correctamente.',
                icon: 'success',
                confirmButtonColor: '#1a5d3b'
            }).then(() => {
                if(action === 'confirm') window.location.href = 'https://groboapp.com';
            });
        } else {
            throw new Error(res.message || "Error al procesar la solicitud");
        }
    } catch (e) {
        Swal.fire('Error', e.message, 'error');
    }
}