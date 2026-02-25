import { API } from './api.js';

let especieCount = 0;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. OBTENER SLUG DESDE LA URL
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

// 2. VALIDAR SLUG Y CARGAR DATOS (RUTA PÚBLICA)
    try {
        // ESTA ES LA LÍNEA CLAVE QUE DEBEMOS CAMBIAR:
        const res = await API.request(`/form-registro/config/${slug}`);
        
        if (res && res.status === 'success') {
            document.getElementById('id_form_config').value = res.data.id_form_config; 
            document.getElementById('display-nombre-inst').innerText = `Configuración: ${res.data.nombre_inst_previa}`;
            document.getElementById('display-encargado').innerText = `A cargo de: ${res.data.encargado_nombre}`;
            
            cargarValoresPorDefecto();
        } else {
            throw new Error("El enlace ha expirado o no es válido.");
        }
    } catch (e) { 
        console.error("Error:", e);
    // 3. LISTENERS BOTONES
    document.getElementById('btn-add-depto').onclick = () => agregarItemDoble('contenedor-deptos', 'depto_nom[]', 'depto_org[]', 'Nombre Departamento', 'Organismo Superior (Facultad/Instituto)');
    document.getElementById('btn-add-prot').onclick = () => agregarItemSimple('contenedor-tipos-prot', 'prot_tipo[]', 'Ej: Investigación, Docencia');
    document.getElementById('btn-add-sev').onclick = () => agregarItemSimple('contenedor-severidades', 'sev_tipo[]', 'Ej: Leve, Moderada');
    
    document.getElementById('btn-add-reactivo').onclick = () => agregarInventario('contenedor-reactivos', 'reac');
    document.getElementById('btn-add-insumo').onclick = () => agregarInventario('contenedor-insumos', 'ins');
    
    document.getElementById('btn-add-sala').onclick = () => agregarItemDoble('contenedor-salas', 'sala_nom[]', 'sala_lugar[]', 'Nombre Sala', 'Ubicación Física');
    document.getElementById('btn-add-instrumento').onclick = () => agregarItemDoble('contenedor-instrumentos', 'instru_nom[]', 'instru_cant[]', 'Nombre Instrumento', 'Cantidad Disponible', 'number');

    document.getElementById('btn-add-especie').onclick = agregarEspecie;

    document.getElementById('btn-save-draft').onclick = () => saveForm('save');
    document.getElementById('btn-confirm-reg').onclick = () => saveForm('confirm');
});

// --- RENDERIZADORES ---

function cargarValoresPorDefecto() {
    ['Investigación', 'Docencia'].forEach(v => agregarItemSimple('contenedor-tipos-prot', 'prot_tipo[]', '', v));
    ['Sin recuperación', 'Leve', 'Moderada', 'Severa'].forEach(v => agregarItemSimple('contenedor-severidades', 'sev_tipo[]', '', v));
    agregarDeptoDefecto();
}

function agregarItemSimple(containerId, inputName, placeholder = '', val = '') {
    const html = `
        <div class="input-group input-group-sm mb-2 shadow-sm">
            <input type="text" class="form-control" name="${inputName}" value="${val}" placeholder="${placeholder}">
            <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()"><i class="bi bi-x-lg"></i></button>
        </div>`;
    document.getElementById(containerId).insertAdjacentHTML('beforeend', html);
}

function agregarItemDoble(containerId, name1, name2, ph1, ph2, type2 = 'text') {
    const html = `
        <div class="row g-1 mb-2">
            <div class="col-6"><input type="text" class="form-control form-control-sm" name="${name1}" placeholder="${ph1}"></div>
            <div class="col-5"><input type="${type2}" class="form-control form-control-sm" name="${name2}" placeholder="${ph2}"></div>
            <div class="col-1 text-end"><button class="btn btn-sm btn-outline-danger w-100" type="button" onclick="this.parentElement.parentElement.remove()"><i class="bi bi-trash"></i></button></div>
        </div>`;
    document.getElementById(containerId).insertAdjacentHTML('beforeend', html);
}

function agregarDeptoDefecto() {
    agregarItemDoble('contenedor-deptos', 'depto_nom[]', 'depto_org[]', 'Ej: Biología Celular', 'Ej: Facultad de Ciencias');
}

function agregarInventario(containerId, prefix) {
    const html = `
        <div class="dynamic-box">
            <button type="button" class="btn-close btn-remove" onclick="this.parentElement.remove()"></button>
            <div class="row g-2">
                <div class="col-12"><input type="text" class="form-control form-control-sm font-bold" name="${prefix}_nom[]" placeholder="Nombre del Producto"></div>
                <div class="col-4"><input type="number" class="form-control form-control-sm" name="${prefix}_cant[]" placeholder="Cantidad"></div>
                <div class="col-4"><input type="text" class="form-control form-control-sm" name="${prefix}_medida[]" placeholder="Medida (ej: ml, kg)"></div>
                <div class="col-4"><input type="number" class="form-control form-control-sm" name="${prefix}_precio[]" placeholder="Precio ($)"></div>
            </div>
        </div>`;
    document.getElementById(containerId).insertAdjacentHTML('beforeend', html);
}

function agregarEspecie() {
    especieCount++;
    const html = `
        <div class="dynamic-box" style="border-left-color: #198754;">
            <button type="button" class="btn-close btn-remove" onclick="this.parentElement.remove()"></button>
            <div class="row g-2 mb-3 align-items-end">
                <div class="col-md-5">
                    <label class="small text-muted font-bold">Nombre Especie</label>
                    <input type="text" class="form-control form-control-sm font-bold" placeholder="Ej: Ratón, Rata" name="esp_nombre_${especieCount}">
                </div>
                <div class="col-md-7 text-end">
                    <button type="button" class="btn btn-sm btn-light border text-primary font-bold" onclick="window.agregarAlojamiento(${especieCount})">+ Tipo Alojamiento</button>
                    <button type="button" class="btn btn-sm btn-light border text-success font-bold" onclick="window.agregarSubespecie(${especieCount})">+ Cepa/Genética</button>
                </div>
            </div>
            
            <div class="row g-3">
                <div class="col-md-6">
                    <h6 class="small font-bold text-success border-bottom pb-1">Cepas / Genéticas</h6>
                    <div id="sub-contenedor-${especieCount}"></div>
                </div>
                <div class="col-md-6">
                    <h6 class="small font-bold text-primary border-bottom pb-1">Tipos de Alojamiento</h6>
                    <div id="aloj-contenedor-${especieCount}"></div>
                </div>
            </div>
        </div>`;
    document.getElementById('contenedor-especies').insertAdjacentHTML('beforeend', html);
    window.agregarSubespecie(especieCount); // Agregar uno por defecto
    window.agregarAlojamiento(especieCount); // Agregar uno por defecto
}

window.agregarSubespecie = (parentID) => {
    const html = `
        <div class="input-group input-group-sm mb-1">
            <input type="text" class="form-control w-50" placeholder="Nombre Cepa" name="sub_nom_${parentID}[]">
            <input type="number" class="form-control" placeholder="$ Precio" name="sub_precio_${parentID}[]">
            <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()">×</button>
        </div>`;
    document.getElementById(`sub-contenedor-${parentID}`).insertAdjacentHTML('beforeend', html);
};

window.agregarAlojamiento = (parentID) => {
    const html = `
        <div class="input-group input-group-sm mb-1">
            <input type="text" class="form-control w-50" placeholder="Ej: Caja Ventilada" name="aloj_nom_${parentID}[]">
            <input type="number" class="form-control" placeholder="$ Noche" name="aloj_precio_${parentID}[]">
            <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()">×</button>
        </div>`;
    document.getElementById(`aloj-contenedor-${parentID}`).insertAdjacentHTML('beforeend', html);
};


// --- PERSISTENCIA EAV ---

async function saveForm(action) {
    const idForm = document.getElementById('id_form_config').value;
    const formElement = document.getElementById('form-full-registro');
    const formData = new FormData(formElement);
    
    let respuestas = [];

    // LÓGICA EAV: Parseamos todos los name attributes y los clasificamos
    formData.forEach((value, key) => {
        if (!value || value.trim() === '') return; // Ignorar vacíos

        let categoria = 'institucion'; 
        
        if (key.startsWith('esp_') || key.startsWith('sub_') || key.startsWith('aloj_')) categoria = 'especies';
        else if (key.startsWith('sev_')) categoria = 'severidad';
        else if (key.startsWith('prot_')) categoria = 'tipo_protocolo';
        else if (key.startsWith('depto_')) categoria = 'departamentos';
        else if (key.startsWith('reac_')) categoria = 'reactivos';
        else if (key.startsWith('ins_')) categoria = 'insumos';
        else if (key.startsWith('sala_') || key.startsWith('instru_')) categoria = 'reservas';

        respuestas.push({
            categoria: categoria,
            campo: key,
            valor: value
        });
    });

    if (action === 'confirm') {
        const result = await Swal.fire({
            title: '¿Confirmar Registro?',
            text: "Al confirmar, esta información será procesada por los administradores de GROBO para crear su institución.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1a5d3b',
            confirmButtonText: 'SÍ, ENVIAR DATOS'
        });
        if (!result.isConfirmed) return;
    }

    Swal.fire({ title: 'Sincronizando datos...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const payload = {
            id_form: idForm,
            respuestas: respuestas,
            action: action
        };

        // Usa la ruta que tú mismo definiste en routes.php: /superadmin/form-registros/submit (Asegúrate de agregarla si no está)
        // Por tu código previo asumo que el backend escucha en /form-registro/submit o similar
        const res = await API.request('/superadmin/form-registros/submit', 'POST', payload);

        if (res && res.status === 'success') {
            Swal.fire({
                title: '¡Operación Exitosa!',
                text: action === 'confirm' ? 'Sus datos han sido enviados al administrador.' : 'Borrador guardado localmente.',
                icon: 'success',
                confirmButtonColor: '#1a5d3b'
            }).then(() => {
                if(action === 'confirm') window.location.href = 'https://groboapp.com';
            });
        } else {
            throw new Error(res.message || "Error desconocido");
        }
    } catch (e) {
        Swal.fire('Error de conexión', e.message, 'error');
    }
}