import { API } from './api.js';
import { loadLanguage, translatePage } from './utils/i18n.js';

let especieCount = 0;

window.cambiarIdioma = async (lang) => {
    localStorage.setItem('lang', lang);
    window.location.reload(); 
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadLanguage();
    translatePage(); 

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
        mostrarErrorPantalla(txt.onboarding.err_invalid_url || "URL Inválida");
        return;
    }

    try {
        const res = await API.request(`/form-registro/config/${slug}`);
        
        if (res && res.status === 'success') {
            if (res.data && parseInt(res.data.activo) === 0) {
                mostrarErrorPantalla("Este formulario ha sido pausado o desactivado por el administrador de GROBO. Comuníquese con soporte si cree que es un error.");
                return;
            }

            document.getElementById('id_form_config').value = res.data.id_form_config;
            document.getElementById('display-nombre-inst').innerText = `${txt.onboarding.config_title} ${res.data.nombre_inst_previa}`;
            document.getElementById('display-encargado').innerText = `${txt.onboarding.resp_title} ${res.data.encargado_nombre}`;
            
            // LA MAGIA: Si existen respuestas, reconstruimos. Si no, cargamos los defaults.
            if (res.respuestas && Object.keys(res.respuestas).length > 0) {
                reconstruirFormulario(res.respuestas);
            } else {
                cargarValoresPorDefecto();
            }
        } else {
            throw new Error(txt.onboarding.err_expired);
        }
    } catch (e) { 
        mostrarErrorPantalla(txt.onboarding.err_conn);
        return; 
    }

    // LISTENERS
    document.getElementById('btn-add-org').onclick = () => agregarItemSimple('contenedor-organizaciones', 'org_nom[]', txt.onboarding.ph_org);
    document.getElementById('btn-add-depto').onclick = () => agregarDepartamento();
    
    document.getElementById('btn-add-prot').onclick = () => agregarItemSimple('contenedor-tipos-prot', 'prot_tipo[]', txt.onboarding.ph_prot);
    document.getElementById('btn-add-sev').onclick = () => agregarItemSimple('contenedor-severidades', 'sev_tipo[]', txt.onboarding.ph_sev);
    
    document.getElementById('btn-add-form').onclick = () => agregarTipoFormulario();
    document.getElementById('btn-add-reactivo').onclick = () => agregarReactivo(); 
    document.getElementById('btn-add-insumo').onclick = () => agregarInsumo();
    document.getElementById('btn-add-sala').onclick = () => agregarItemDoble('contenedor-salas', 'sala_nom[]', 'sala_lugar[]', txt.onboarding.ph_room_name, txt.onboarding.ph_room_loc);
    document.getElementById('btn-add-instrumento').onclick = () => agregarItemDoble('contenedor-instrumentos', 'instru_nom[]', 'instru_cant[]', txt.onboarding.ph_equip_name, txt.onboarding.ph_qty_disp, 'number');
    
    document.getElementById('btn-add-especie').onclick = () => agregarEspecie();
    const btnServicio = document.getElementById('btn-add-servicio');
    if(btnServicio) btnServicio.onclick = () => agregarServicio();

    document.getElementById('btn-save-draft').onclick = () => saveForm('save');
    document.getElementById('btn-confirm-reg').onclick = () => saveForm('confirm');
});

// ==========================================
// 🚀 MOTOR DE RECONSTRUCCIÓN DINÁMICA
// ==========================================
function reconstruirFormulario(db) {
    // Helper para extraer arrays de valores limpios desde el objeto EAV
    const getVals = (catArr, campo) => (catArr || []).filter(r => r.campo === campo).map(r => r.valor);

    // 1. Inputs simples de Institución
    if (db['institucion']) {
        db['institucion'].forEach(r => {
            const el = document.querySelector(`[name="${r.campo}"]`);
            if (el) el.value = r.valor;
        });
    }

    // 2. Organizaciones
    if (db['organizaciones']) {
        getVals(db['organizaciones'], 'org_nom[]').forEach(v => agregarItemSimple('contenedor-organizaciones', 'org_nom[]', txt.onboarding.ph_org, v));
    }

    // 3. Departamentos
    if (db['departamentos']) {
        const dNom = getVals(db['departamentos'], 'depto_nom[]');
        const dOrg = getVals(db['departamentos'], 'depto_org[]');
        for(let i=0; i<dNom.length; i++) agregarDepartamento(dNom[i], dOrg[i]);
    }

    // 4. Protocolos y Severidades
    if (db['tipo_protocolo']) {
        getVals(db['tipo_protocolo'], 'prot_tipo[]').forEach(v => agregarItemSimple('contenedor-tipos-prot', 'prot_tipo[]', '', v));
    }
    if (db['severidad']) {
        getVals(db['severidad'], 'sev_tipo[]').forEach(v => agregarItemSimple('contenedor-severidades', 'sev_tipo[]', '', v));
    }

    // 5. Formularios
    if (db['tipo_formulario']) {
        const fCat = getVals(db['tipo_formulario'], 'form_cat[]');
        const fNom = getVals(db['tipo_formulario'], 'form_nom[]');
        const fExe = getVals(db['tipo_formulario'], 'form_exento[]');
        for(let i=0; i<fNom.length; i++) agregarTipoFormulario(fCat[i], fNom[i], fExe[i]);
    }

    // 6. Inventario (Reactivos / Insumos / Servicios)
    if (db['reactivos']) {
        const rNom = getVals(db['reactivos'], 'reac_nom[]');
        const rCan = getVals(db['reactivos'], 'reac_cant[]');
        const rMed = getVals(db['reactivos'], 'reac_medida[]');
        const rEsp = getVals(db['reactivos'], 'reac_esp[]');
        for(let i=0; i<rNom.length; i++) agregarReactivo(rNom[i], rCan[i], rMed[i], rEsp[i]);
    }
    if (db['insumos']) {
        const iNom = getVals(db['insumos'], 'ins_nom[]');
        const iCan = getVals(db['insumos'], 'ins_cant[]');
        const iMed = getVals(db['insumos'], 'ins_medida[]');
        const iEsp = getVals(db['insumos'], 'ins_esp[]');
        for(let i=0; i<iNom.length; i++) agregarInsumo(iNom[i], iCan[i], iMed[i], iEsp[i]);
    }
    if (db['servicios']) {
        const sNom = getVals(db['servicios'], 'serv_nom[]');
        const sCan = getVals(db['servicios'], 'serv_cant[]');
        const sMed = getVals(db['servicios'], 'serv_medida[]');
        for(let i=0; i<sNom.length; i++) agregarServicio(sNom[i], sCan[i], sMed[i]);
    }

    // 7. Reservas
    if (db['reservas']) {
        const sNom = getVals(db['reservas'], 'sala_nom[]');
        const sLug = getVals(db['reservas'], 'sala_lugar[]');
        for(let i=0; i<sNom.length; i++) agregarItemDoble('contenedor-salas', 'sala_nom[]', 'sala_lugar[]', '', '', 'text', sNom[i], sLug[i]);

        const iNom = getVals(db['reservas'], 'instru_nom[]');
        const iCan = getVals(db['reservas'], 'instru_cant[]');
        for(let i=0; i<iNom.length; i++) agregarItemDoble('contenedor-instrumentos', 'instru_nom[]', 'instru_cant[]', '', '', 'number', iNom[i], iCan[i]);
    }

    // 8. Especies y su estructura interna (Complejo EAV Indexado)
    if (db['especies']) {
        const espNames = db['especies'].filter(r => r.campo.startsWith('esp_nombre_'));
        espNames.forEach(espObj => {
            const originId = espObj.campo.split('_')[2]; // Sacamos el ID que tenía cuando se guardó
            const newId = especieCount + 1; // El nuevo ID del DOM
            agregarEspecie(espObj.valor); // Inyecta la especie y crea los contenedores hijos
            
            // Limpiamos los hijos por defecto
            document.getElementById(`sub-contenedor-${newId}`).innerHTML = '';
            document.getElementById(`aloj-contenedor-${newId}`).innerHTML = '';
            document.getElementById(`traz-contenedor-${newId}`).innerHTML = '';

            // Llenamos Subespecies
            getVals(db['especies'], `sub_nom_${originId}[]`).forEach(v => agregarSubespecie(newId, v));
            // Llenamos Alojamientos
            const aNom = getVals(db['especies'], `aloj_nom_${originId}[]`);
            const aDet = getVals(db['especies'], `aloj_det_${originId}[]`);
            for(let i=0; i<aNom.length; i++) agregarAlojamientoEsp(newId, aNom[i], aDet[i]);
            // Llenamos Trazabilidad
            const tNom = getVals(db['especies'], `traz_nom_${originId}[]`);
            const tTip = getVals(db['especies'], `traz_tipo_${originId}[]`);
            for(let i=0; i<tNom.length; i++) agregarTrazabilidad(newId, tNom[i], tTip[i]);
        });
    }

    // 9. Permisos (Checkboxes). Si se guardó, mapeamos. Lo que no está, se desmarca.
    const hasPermData = db['permisos_rol_4_sec_admin'] || db['permisos_rol_5_asistente'] || db['permisos_rol_6_laboratorio'];
    if (hasPermData) {
        document.querySelectorAll('input[type="checkbox"][name^="menuRol"]').forEach(cb => {
            const found = ['permisos_rol_4_sec_admin', 'permisos_rol_5_asistente', 'permisos_rol_6_laboratorio'].some(cat => 
                db[cat] && db[cat].find(r => r.campo === cb.name)
            );
            cb.checked = found;
        });
    }
}

// ==========================================
// RENDERIZADORES Y BUILDERS CON SOPORTE EAV
// ==========================================
function mostrarErrorPantalla(msj) {
    document.body.innerHTML = `<div class="p-5 text-center"><h1 class="text-danger">Error</h1><p>${msj}</p><a href="https://groboapp.com" class="btn btn-primary">${txt.onboarding.btn_back}</a></div>`;
}

function cargarValoresPorDefecto() {
    if(document.getElementById('contenedor-organizaciones').children.length === 0) {
        [txt.onboarding.prot_inv, txt.onboarding.prot_doc].forEach(v => agregarItemSimple('contenedor-tipos-prot', 'prot_tipo[]', '', v));
        [txt.onboarding.sev_1, txt.onboarding.sev_2, txt.onboarding.sev_3, txt.onboarding.sev_4].forEach(v => agregarItemSimple('contenedor-severidades', 'sev_tipo[]', '', v));
        agregarItemSimple('contenedor-organizaciones', 'org_nom[]', txt.onboarding.ph_org, 'Universidad General');
        agregarDepartamento();
        agregarTipoFormulario(); 
    }
}

window.poblarSelectOrgs = (selectElement) => {
    const currentVal = selectElement.value;
    selectElement.innerHTML = `<option value="">${txt.onboarding.ph_depto_org}</option>`;
    document.querySelectorAll('input[name="org_nom[]"]').forEach(input => {
        const val = input.value.trim();
        if (val) selectElement.innerHTML += `<option value="${val}" ${val === currentVal ? 'selected' : ''}>${val}</option>`;
    });
};

window.poblarSelectEspecies = (selectElement) => {
    const currentVal = selectElement.value;
    selectElement.innerHTML = `<option value="">${txt.onboarding.ph_species_opt}</option>`;
    document.querySelectorAll('input[name^="esp_nombre_"]').forEach(input => {
        const val = input.value.trim();
        if (val) selectElement.innerHTML += `<option value="${val}" ${val === currentVal ? 'selected' : ''}>${val}</option>`;
    });
};

// Se agregaron parámetros por defecto a todas las constructivas para inyectar valores guardados
function agregarDepartamento(nom = '', org = '') {
    const orgOpt = org ? `<option value="${org}" selected>${org}</option>` : '';
    const html = `
        <div class="row g-1 mb-2">
            <div class="col-6"><input type="text" class="form-control form-control-sm" name="depto_nom[]" value="${nom}" placeholder="${txt.onboarding.ph_depto_name}"></div>
            <div class="col-5">
                <select class="form-select form-select-sm" name="depto_org[]" onfocus="window.poblarSelectOrgs(this)">
                    <option value="">${txt.onboarding.ph_depto_org}</option>
                    ${orgOpt}
                </select>
            </div>
            <div class="col-1"><button class="btn btn-sm btn-outline-danger w-100" type="button" onclick="this.parentElement.parentElement.remove()">×</button></div>
        </div>`;
    document.getElementById('contenedor-deptos').insertAdjacentHTML('beforeend', html);
}

function agregarTipoFormulario(cat = 'Animal vivo', nom = '', exento = '2') {
    const html = `
        <div class="row g-2 mb-2 p-2 bg-light border rounded position-relative shadow-sm">
            <button type="button" class="btn-close position-absolute top-0 end-0 m-1" style="font-size: 0.6rem" onclick="this.parentElement.remove()"></button>
            <div class="col-md-4">
                <label class="small text-muted fw-bold">${txt.onboarding.form_cat}</label>
                <select class="form-select form-select-sm fw-bold text-primary" name="form_cat[]">
                    <option value="Animal vivo" ${cat==='Animal vivo'?'selected':''}>Animal Vivo</option>
                    <option value="Otros reactivos biologicos" ${cat==='Otros reactivos biologicos'?'selected':''}>Otros Reactivos</option>
                    <option value="Insumos" ${cat==='Insumos'?'selected':''}>Insumos</option>
                </select>
            </div>
            <div class="col-md-5">
                <label class="small text-muted fw-bold">${txt.onboarding.form_name}</label>
                <input type="text" class="form-control form-control-sm" name="form_nom[]" value="${nom}" placeholder="${txt.onboarding.ph_form_name}">
            </div>
            <div class="col-md-3">
                <label class="small text-muted fw-bold">${txt.onboarding.form_billing}</label>
                <select class="form-select form-select-sm" name="form_exento[]">
                    <option value="2" ${exento==='2'?'selected':''}>${txt.onboarding.form_normal}</option>
                    <option value="1" class="text-success fw-bold" ${exento==='1'?'selected':''}>${txt.onboarding.form_free}</option>
                </select>
            </div>
        </div>`;
    document.getElementById('contenedor-formularios').insertAdjacentHTML('beforeend', html);
}

function agregarReactivo(nom = '', cant = '', med = '', esp = '') {
    const espOpt = esp ? `<option value="${esp}" selected>${esp}</option>` : '';
    const html = `
        <div class="dynamic-box mb-2 p-2 border rounded bg-light position-relative">
            <button type="button" class="btn-close position-absolute top-0 end-0 m-1" style="font-size: 0.6rem" onclick="this.parentElement.remove()"></button>
            <div class="row g-2">
                <div class="col-12"><input type="text" class="form-control form-control-sm fw-bold" name="reac_nom[]" value="${nom}" placeholder="${txt.onboarding.ph_reagent_name}"></div>
                <div class="col-4"><input type="number" class="form-control form-control-sm" name="reac_cant[]" value="${cant}" placeholder="${txt.onboarding.ph_qty}"></div>
                <div class="col-3"><input type="text" class="form-control form-control-sm" name="reac_medida[]" value="${med}" placeholder="${txt.onboarding.ph_measure}"></div>
                <div class="col-5">
                    <select class="form-select form-select-sm text-success" name="reac_esp[]" onfocus="window.poblarSelectEspecies(this)">
                        <option value="">${txt.onboarding.ph_species_opt}</option>
                        ${espOpt}
                    </select>
                </div>
            </div>
        </div>`;
    document.getElementById('contenedor-reactivos').insertAdjacentHTML('beforeend', html);
}

function agregarInsumo(nom = '', cant = '', med = '', esp = '') {
    const espOpt = esp ? `<option value="${esp}" selected>${esp}</option>` : '';
    const html = `
        <div class="dynamic-box mb-2 p-2 border rounded bg-light position-relative">
            <button type="button" class="btn-close position-absolute top-0 end-0 m-1" style="font-size: 0.6rem" onclick="this.parentElement.remove()"></button>
            <div class="row g-2">
                <div class="col-12"><input type="text" class="form-control form-control-sm fw-bold" name="ins_nom[]" value="${nom}" placeholder="${txt.onboarding.ph_insumo_name}"></div>
                <div class="col-4"><input type="number" class="form-control form-control-sm" name="ins_cant[]" value="${cant}" placeholder="${txt.onboarding.ph_qty}"></div>
                <div class="col-3"><input type="text" class="form-control form-control-sm" name="ins_medida[]" value="${med}" placeholder="${txt.onboarding.ph_measure}"></div>
                <div class="col-5">
                    <select class="form-select form-select-sm text-success" name="ins_esp[]" onfocus="window.poblarSelectEspecies(this)">
                        <option value="">${txt.onboarding.ph_species_opt}</option>
                        ${espOpt}
                    </select>
                </div>
            </div>
        </div>`;
    document.getElementById('contenedor-insumos').insertAdjacentHTML('beforeend', html);
}

function agregarServicio(nom = '', cant = '', med = '') {
    const html = `
        <div class="input-group input-group-sm mb-2 shadow-sm">
            <input type="text" class="form-control w-50 fw-bold" name="serv_nom[]" value="${nom}" placeholder="${txt.onboarding.ph_serv_name}">
            <input type="number" class="form-control" name="serv_cant[]" value="${cant}" placeholder="${txt.onboarding.ph_qty}">
            <input type="text" class="form-control" name="serv_medida[]" value="${med}" placeholder="${txt.onboarding.ph_serv_measure}">
            <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()">×</button>
        </div>`;
    document.getElementById('contenedor-servicios').insertAdjacentHTML('beforeend', html);
}

function agregarItemSimple(containerId, inputName, placeholder = '', val = '') {
    const html = `
        <div class="input-group input-group-sm mb-2 shadow-sm">
            <input type="text" class="form-control" name="${inputName}" value="${val}" placeholder="${placeholder}">
            <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()">×</button>
        </div>`;
    document.getElementById(containerId).insertAdjacentHTML('beforeend', html);
}

function agregarItemDoble(containerId, name1, name2, ph1, ph2, type2 = 'text', val1 = '', val2 = '') {
    const html = `
        <div class="row g-1 mb-2">
            <div class="col-6"><input type="text" class="form-control form-control-sm" name="${name1}" value="${val1}" placeholder="${ph1}"></div>
            <div class="col-5"><input type="${type2}" class="form-control form-control-sm" name="${name2}" value="${val2}" placeholder="${ph2}"></div>
            <div class="col-1"><button class="btn btn-sm btn-outline-danger w-100" type="button" onclick="this.parentElement.parentElement.remove()">×</button></div>
        </div>`;
    document.getElementById(containerId).insertAdjacentHTML('beforeend', html);
}

function agregarEspecie(nomVal = '') {
    especieCount++;
    const html = `
        <div class="dynamic-box p-3 mb-4 border-start border-4 border-success shadow bg-white rounded">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <input type="text" class="form-control fw-bold w-50" value="${nomVal}" placeholder="${txt.onboarding.ph_species_name}" name="esp_nombre_${especieCount}">
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.parentElement.remove()"><i class="bi bi-trash"></i> ${txt.onboarding.btn_del_species}</button>
            </div>
            
            <div class="row g-3">
                <div class="col-md-4 border-end">
                    <div class="d-flex flex-column mb-2 border-bottom pb-1">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <label class="small fw-bold text-success">${txt.onboarding.sub_title}</label>
                            <button type="button" class="btn btn-xs btn-outline-success" onclick="window.agregarSubespecie(${especieCount})">+</button>
                        </div>
                        <small class="text-muted" style="font-size: 0.65rem; line-height: 1.1;">${txt.onboarding.sub_desc}</small>
                    </div>
                    <div id="sub-contenedor-${especieCount}"></div>
                </div>
                
                <div class="col-md-4 border-end">
                    <div class="d-flex flex-column mb-2 border-bottom pb-1">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <label class="small fw-bold text-primary">${txt.onboarding.aloj_title}</label>
                            <button type="button" class="btn btn-xs btn-outline-primary" onclick="window.agregarAlojamientoEsp(${especieCount})">+</button>
                        </div>
                        <small class="text-muted" style="font-size: 0.65rem; line-height: 1.1;">${txt.onboarding.aloj_desc}</small>
                    </div>
                    <div id="aloj-contenedor-${especieCount}"></div>
                </div>

                <div class="col-md-4">
                    <div class="d-flex flex-column mb-2 border-bottom pb-1">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <label class="small fw-bold text-secondary">${txt.onboarding.traz_title}</label>
                            <button type="button" class="btn btn-xs btn-outline-secondary" onclick="window.agregarTrazabilidad(${especieCount})">+</button>
                        </div>
                        <small class="text-muted" style="font-size: 0.65rem; line-height: 1.1;">${txt.onboarding.traz_desc}</small>
                    </div>
                    <div id="traz-contenedor-${especieCount}"></div>
                </div>
            </div>
        </div>`;
    document.getElementById('contenedor-especies').insertAdjacentHTML('beforeend', html);
    
    // Solo agregamos valores por defecto si no estamos reconstruyendo una BD
    if(!nomVal) {
        window.agregarSubespecie(especieCount);
        window.agregarAlojamientoEsp(especieCount);
        window.agregarTrazabilidad(especieCount);
    }
}

window.agregarSubespecie = (parentID, val = '') => {
    const html = `
        <div class="input-group input-group-sm mb-1">
            <input type="text" class="form-control" value="${val}" placeholder="${txt.onboarding.ph_sub}" name="sub_nom_${parentID}[]">
            <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()">×</button>
        </div>`;
    document.getElementById(`sub-contenedor-${parentID}`).insertAdjacentHTML('beforeend', html);
};

window.agregarAlojamientoEsp = (parentID, nom = '', det = '') => {
    const html = `
        <div class="mb-2 p-1 border rounded bg-light position-relative">
            <button type="button" class="btn-close position-absolute top-0 end-0 m-1" style="font-size: 0.5rem" onclick="this.parentElement.remove()"></button>
            <input type="text" class="form-control form-control-sm fw-bold mb-1 pe-4" value="${nom}" placeholder="${txt.onboarding.ph_aloj_name}" name="aloj_nom_${parentID}[]">
            <input type="text" class="form-control form-control-sm text-muted" value="${det}" placeholder="${txt.onboarding.ph_aloj_det}" name="aloj_det_${parentID}[]">
        </div>`;
    document.getElementById(`aloj-contenedor-${parentID}`).insertAdjacentHTML('beforeend', html);
};

window.agregarTrazabilidad = (parentID, nom = '', tipo = 'Texto') => {
    const html = `
        <div class="input-group input-group-sm mb-2">
            <input type="text" class="form-control" value="${nom}" placeholder="${txt.onboarding.ph_traz_name}" name="traz_nom_${parentID}[]">
            <select class="form-select text-secondary" name="traz_tipo_${parentID}[]" style="max-width: 90px;">
                <option value="Texto" ${tipo==='Texto'?'selected':''}>${txt.onboarding.traz_txt}</option>
                <option value="Numero" ${tipo==='Numero'?'selected':''}>${txt.onboarding.traz_num}</option>
                <option value="Fecha" ${tipo==='Fecha'?'selected':''}>${txt.onboarding.traz_date}</option>
            </select>
            <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()">×</button>
        </div>`;
    document.getElementById(`traz-contenedor-${parentID}`).insertAdjacentHTML('beforeend', html);
};

// --- GUARDAR ESTADO EAV ---
async function saveForm(action) {
    const idForm = document.getElementById('id_form_config').value;
    const formElement = document.getElementById('form-full-registro');
    
    if(!idForm) return;

    const formData = new FormData(formElement);
    let respuestas = [];

    formData.forEach((value, key) => {
        if (!value || value.toString().trim() === '') return;
        
        let categoria = 'institucion'; 
        if (key.startsWith('org_')) categoria = 'organizaciones';
        else if (key.startsWith('form_')) categoria = 'tipo_formulario';
        else if (key.startsWith('serv_')) categoria = 'servicios';
        else if (key.startsWith('esp_') || key.startsWith('sub_') || key.startsWith('aloj_') || key.startsWith('traz_')) categoria = 'especies';
        else if (key.startsWith('sev_')) categoria = 'severidad';
        else if (key.startsWith('prot_')) categoria = 'tipo_protocolo';
        else if (key.startsWith('depto_')) categoria = 'departamentos';
        else if (key.startsWith('reac_')) categoria = 'reactivos';
        else if (key.startsWith('ins_')) categoria = 'insumos';
        else if (key.startsWith('sala_') || key.startsWith('instru_')) categoria = 'reservas';
        else if (key.startsWith('menuRol4_')) categoria = 'permisos_rol_4_sec_admin'; 
        else if (key.startsWith('menuRol5_')) categoria = 'permisos_rol_5_asistente';  
        else if (key.startsWith('menuRol6_')) categoria = 'permisos_rol_6_laboratorio';  

        respuestas.push({ categoria, campo: key, valor: value });
    });

    if (action === 'confirm') {
        const result = await Swal.fire({
            title: txt.onboarding.confirm_title,
            text: txt.onboarding.confirm_text,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1a5d3b',
            confirmButtonText: txt.onboarding.btn_yes_send
        });
        if (!result.isConfirmed) return;
    }

    Swal.fire({ title: txt.onboarding.loading_save, allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const payload = { id_form: idForm, respuestas: respuestas, action: action };
        const res = await API.request('/form-registro/submit', 'POST', payload);

        if (res && res.status === 'success') {
            Swal.fire({
                title: txt.onboarding.saved_title,
                text: action === 'confirm' ? txt.onboarding.saved_send_txt : txt.onboarding.saved_draft_txt,
                icon: 'success',
                confirmButtonColor: '#1a5d3b'
            }).then(() => {
                if(action === 'confirm') window.location.href = 'https://groboapp.com';
            });
        }
    } catch (e) {
        Swal.fire('Error', e.message, 'error');
    }
}