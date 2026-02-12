// ***************************************************
// JS: formularioregistroinst.js (Versión Final Integra)
// ***************************************************
// Maneja el registro dinámico de nuevas sedes, capturando datos institucionales,
// científicos (especies/precios) y operativos (deptos/severidades).
// ***************************************************

import { API } from './api.js';

let especieCount = 0;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. DETECTOR DE SLUG ROBUSTO (Maneja ?inst= o /formulario/slug)
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
        console.error("No se detectó slug de institución.");
        return;
    }

    // 2. CARGA INICIAL DE CONFIGURACIÓN
    try {
        const res = await API.request(`/form-registro/${slug}`);
        if (res && res.status === 'success') {
            document.getElementById('id_form_config').value = res.data.id_form_config;
            document.getElementById('display-nombre-inst').innerText = res.data.nombre_inst_previa;
            document.getElementById('display-encargado').innerText = `Atención: ${res.data.encargado_nombre}`;
            
            // Inyectamos valores estándar por defecto
            cargarValoresPorDefecto();
        } else {
            throw new Error("Respuesta de API inválida");
        }
    } catch (e) { 
        console.error("Error al conectar con la API de registro:", e);
    }

    // 3. VINCULACIÓN DE EVENTOS (Solución a botones que no funcionaban)
    document.getElementById('btn-add-especie').onclick = agregarEspecie;
    document.getElementById('btn-add-depto').onclick = agregarDepto;
    document.getElementById('btn-add-severidad').onclick = () => agregarSeveridad();
    
    document.getElementById('btn-add-tipo-animal').onclick = () => agregarItemSimple('contenedor-tipo-animal', 'tipo_form_animal[]', 'Animal Vivo');
    document.getElementById('btn-add-tipo-reactivo').onclick = () => agregarItemSimple('contenedor-tipo-reactivo', 'tipo_form_reactivo[]', 'Otros reactivos');
    document.getElementById('btn-add-tipo-insumo').onclick = () => agregarItemSimple('contenedor-tipo-insumo', 'tipo_form_insumo[]', 'Insumos');
    document.getElementById('btn-add-tipo-protocolo').onclick = () => agregarItemSimple('contenedor-tipo-protocolo', 'tipo_prot[]', 'Investigación');
    
    document.getElementById('btn-save-draft').onclick = () => saveForm('save');
    document.getElementById('btn-confirm-reg').onclick = () => saveForm('confirm');
});

// ***************************************************
// SECCIÓN: RENDERIZADO DINÁMICO
// ***************************************************

function cargarValoresPorDefecto() {
    // Severidades base requeridas
    ['Severo', 'Leve', 'Moderada', 'Sin recuperación'].forEach(s => agregarSeveridad(s));
}

function agregarEspecie() {
    especieCount++;
    const html = `
        <div class="bg-white border rounded p-3 mb-3 shadow-sm position-relative border-start border-4 border-success">
            <button type="button" class="btn-close position-absolute top-0 end-0 m-2" style="font-size: 10px;" onclick="this.parentElement.remove()"></button>
            
            <div class="row g-2 mb-3">
                <div class="col-md-6">
                    <label class="small font-bold text-success uppercase" style="font-size: 9px;">Nombre Especie</label>
                    <input type="text" class="form-control form-control-sm font-bold" placeholder="Ej: Ratón" name="esp_nombre[]">
                </div>
                <div class="col-md-2">
                    <label class="small font-bold text-muted uppercase" style="font-size: 9px;">$ Animal</label>
                    <input type="number" step="any" class="form-control form-control-sm" name="esp_precio_ani[]">
                </div>
                <div class="col-md-2">
                    <label class="small font-bold text-muted uppercase" style="font-size: 9px;">$ Aloj. Chica</label>
                    <input type="number" step="any" class="form-control form-control-sm" name="esp_aloj_chica[]">
                </div>
                <div class="col-md-2">
                    <label class="small font-bold text-muted uppercase" style="font-size: 9px;">$ Aloj. Grande</label>
                    <input type="number" step="any" class="form-control form-control-sm" name="esp_aloj_grande[]">
                </div>
            </div>

            <div id="sub-contenedor-${especieCount}" class="ps-4 border-start mb-2">
                </div>
            
            <button type="button" class="btn btn-link btn-sm text-success p-0 font-bold" style="font-size: 11px; text-decoration:none;" onclick="window.agregarSubespecie(${especieCount})">
                + AGREGAR SUBESPECIE / CEPA
            </button>
        </div>`;
    document.getElementById('contenedor-especies').insertAdjacentHTML('beforeend', html);
}

// Expuesta a window para el string HTML dinámico
window.agregarSubespecie = (parentID) => {
    const html = `
        <div class="row g-2 mb-2 align-items-center bg-light p-2 rounded border">
            <div class="col-md-3">
                <input type="text" class="form-control form-control-sm" placeholder="Nombre Cepa" name="sub_nombre_${parentID}[]">
            </div>
            <div class="col-md-2">
                <input type="number" step="any" class="form-control form-control-sm" placeholder="$ Animal" name="sub_precio_ani_${parentID}[]">
            </div>
            <div class="col-md-3">
                <input type="number" step="any" class="form-control form-control-sm" placeholder="$ Aloj. Chica" name="sub_precio_aloj_chica_${parentID}[]">
            </div>
            <div class="col-md-3">
                <input type="number" step="any" class="form-control form-control-sm" placeholder="$ Aloj. Grande" name="sub_precio_aloj_grande_${parentID}[]">
            </div>
            <div class="col-md-1 text-end">
                <button type="button" class="btn-close" style="font-size: 8px;" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        </div>`;
    document.getElementById(`sub-contenedor-${parentID}`).insertAdjacentHTML('beforeend', html);
};

function agregarSeveridad(val = '') {
    const html = `
        <div class="input-group input-group-sm mb-2 shadow-sm">
            <span class="input-group-text bg-white"><i class="bi bi-exclamation-triangle text-warning"></i></span>
            <input type="text" class="form-control" name="sev_nombre[]" value="${val}" placeholder="Nombre severidad">
            <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()">×</button>
        </div>`;
    document.getElementById('contenedor-severidades').insertAdjacentHTML('beforeend', html);
}

function agregarDepto() {
    const html = `
        <div class="row g-2 mb-2 p-2 border rounded bg-white shadow-sm">
            <div class="col-md-7">
                <input type="text" class="form-control form-control-sm" name="depto_nombre[]" placeholder="Nombre del Departamento">
            </div>
            <div class="col-md-4">
                <input type="text" class="form-control form-control-sm" name="depto_org[]" placeholder="Organismo Superior">
            </div>
            <div class="col-md-1 text-end">
                <button type="button" class="btn-close mt-1" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        </div>`;
    document.getElementById('contenedor-deptos').insertAdjacentHTML('beforeend', html);
}

function agregarItemSimple(containerId, inputName, val = '') {
    const html = `
        <div class="input-group input-group-sm mb-1">
            <input type="text" class="form-control" name="${inputName}" value="${val}">
            <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()">×</button>
        </div>`;
    document.getElementById(containerId).insertAdjacentHTML('beforeend', html);
}

// ***************************************************
// SECCIÓN: PERSISTENCIA (SAVE & CONFIRM)
// ***************************************************

async function saveForm(action) {
    const idForm = document.getElementById('id_form_config').value;
    const formElement = document.getElementById('form-full-registro');
    const formData = new FormData(formElement);
    
    let respuestas = [];

    // Recorremos todos los campos para clasificarlos por categoría EAV
    formData.forEach((value, key) => {
        let categoria = 'institucion'; // Por defecto

        if (key.startsWith('esp_') || key.startsWith('sub_')) categoria = 'especies';
        else if (key.startsWith('sev_')) categoria = 'severidad';
        else if (key.startsWith('tipo_form')) categoria = 'tipo_formulario';
        else if (key.startsWith('tipo_prot')) categoria = 'tipo_protocolo';
        else if (key.startsWith('depto_')) categoria = 'departamentos';

        respuestas.push({
            categoria: categoria,
            campo: key,
            valor: value
        });
    });

    if (action === 'confirm') {
        const result = await Swal.fire({
            title: '¿Confirmar Registro?',
            text: "Se enviará la información a groboapp.com para su validación técnica y activación.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1a5d3b',
            confirmButtonText: 'SÍ, CONFIRMAR',
            cancelButtonText: 'REVISAR'
        });
        if (!result.isConfirmed) return;
    }

    // Loader de proceso
    Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res = await API.request('/form-registro/submit', 'POST', {
            id_form: idForm,
            respuestas: respuestas,
            action: action
        });

        if (res && res.status === 'success') {
            Swal.fire({
                title: '¡Recibido!',
                text: action === 'confirm' 
                    ? 'Registro enviado con éxito. Revisaremos los datos a la brevedad.' 
                    : 'Borrador guardado correctamente.',
                icon: 'success',
                confirmButtonColor: '#1a5d3b'
            });
        } else {
            throw new Error(res.message || "Error desconocido");
        }
    } catch (e) {
        Swal.fire('Error', 'No se pudo procesar la solicitud: ' + e.message, 'error');
    }
}