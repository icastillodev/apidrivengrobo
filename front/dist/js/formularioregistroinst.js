import { API } from './api.js';
import { loadLanguage, translatePage } from './utils/i18n.js';

let especieCount = 0;

function onboardingI18n() {
    return window.txt?.onboarding || {};
}

/** Plan JSON desde form_registro_config.plan_modulos (null = mostrar todo, compatibilidad). */
function parsePlanModulos(raw) {
    if (raw == null || raw === '') return null;
    try {
        const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return typeof o === 'object' && o !== null ? o : null;
    } catch {
        return null;
    }
}

function planIsWideOpen(plan) {
    return plan == null || Object.keys(plan).length === 0;
}

function moduleEnabledInPlan(plan, key) {
    if (planIsWideOpen(plan)) return true;
    const v = parseInt(plan[key], 10);
    return !Number.isNaN(v) && v > 1;
}

function setBlockVisible(el, visible) {
    if (!el) return;
    el.classList.toggle('d-none', !visible);
    const dis = !visible;
    el.querySelectorAll('input,select,textarea,button').forEach((node) => {
        if (node.type === 'hidden') return;
        node.disabled = dis;
    });
}

function applySpeciesSubcolumns(plan) {
    document.querySelectorAll('#contenedor-especies .onboarding-subcol').forEach((col) => {
        const sub = col.getAttribute('data-onboarding-sub');
        let ok = true;
        if (sub === 'sub') ok = moduleEnabledInPlan(plan, 'animales');
        else if (sub === 'aloj') ok = moduleEnabledInPlan(plan, 'alojamientos');
        else if (sub === 'traz') ok = moduleEnabledInPlan(plan, 'trazabilidad_alojamientos');
        setBlockVisible(col, ok);
    });
}

function applyOnboardingPlan(plan) {
    window.__onboardingPlan = plan;
    const showProt = planIsWideOpen(plan)
        || moduleEnabledInPlan(plan, 'animales')
        || moduleEnabledInPlan(plan, 'reactivos')
        || moduleEnabledInPlan(plan, 'insumos');
    const showAnim = planIsWideOpen(plan)
        || moduleEnabledInPlan(plan, 'animales')
        || moduleEnabledInPlan(plan, 'alojamientos')
        || moduleEnabledInPlan(plan, 'trazabilidad_alojamientos');
    const showReac = moduleEnabledInPlan(plan, 'reactivos');
    const showIns = moduleEnabledInPlan(plan, 'insumos');
    const showRes = moduleEnabledInPlan(plan, 'reservas');

    setBlockVisible(document.getElementById('block-protocolos'), showProt);
    const hp = document.getElementById('heading-protocolos');
    if (hp) hp.classList.toggle('d-none', !showProt);

    setBlockVisible(document.getElementById('block-animales'), showAnim);

    setBlockVisible(document.getElementById('block-inv-reac'), showReac);
    setBlockVisible(document.getElementById('block-inv-ins'), showIns);
    const hi = document.getElementById('heading-inventario');
    if (hi) hi.classList.toggle('d-none', !(showReac || showIns));

    setBlockVisible(document.getElementById('block-reservas'), showRes);

    const permisoMap = [
        ['menuRol4_Animales', 'animales'], ['menuRol4_Reactivos', 'reactivos'], ['menuRol4_Insumos', 'insumos'],
        ['menuRol4_Alojamientos', 'alojamientos'], ['menuRol4_Reservas', 'reservas'],
        ['menuRol5_Animales', 'animales'], ['menuRol5_Reactivos', 'reactivos'], ['menuRol5_Insumos', 'insumos'],
        ['menuRol5_Alojamientos', 'alojamientos'], ['menuRol5_Reservas', 'reservas'],
        ['menuRol6_Animales', 'animales'], ['menuRol6_Reactivos', 'reactivos'], ['menuRol6_Insumos', 'insumos'],
        ['menuRol6_Alojamientos', 'alojamientos'], ['menuRol6_Reservas', 'reservas'],
    ];
    permisoMap.forEach(([name, modKey]) => {
        const cb = document.querySelector(`input[name="${name}"]`);
        if (!cb) return;
        const row = cb.closest('.form-check');
        if (!row) return;
        const on = planIsWideOpen(plan) || moduleEnabledInPlan(plan, modKey);
        row.classList.toggle('d-none', !on);
        cb.disabled = !on;
    });

    applySpeciesSubcolumns(plan);

    document.querySelectorAll('[data-onboarding-block]').forEach((block) => {
        const blockHidden = block.classList.contains('d-none');
        block.querySelectorAll('input,select,textarea,button').forEach((node) => {
            if (node.type === 'hidden') return;
            const inHiddenSub = node.closest('.onboarding-subcol.d-none');
            node.disabled = blockHidden || !!inHiddenSub;
        });
    });
}

function showOnboardingIntroOnce(slug) {
    const t = onboardingI18n();
    const key = `grobo_onboarding_intro_${slug}`;
    if (sessionStorage.getItem(key) === '1') return;
    const html = `
        <div class="text-start small" style="max-height:65vh;overflow-y:auto;">
            <p class="fw-bold text-success">${t.intro_p1 || ''}</p>
            <p>${t.intro_p2 || ''}</p>
            <p>${t.intro_p3 || ''}</p>
            <ul class="mb-2">
                <li><strong>${t.intro_li_base || ''}</strong> — ${t.intro_li_base_d || ''}</li>
                <li><strong>${t.intro_li_prot || ''}</strong> — ${t.intro_li_prot_d || ''}</li>
                <li><strong>${t.intro_li_anim || ''}</strong> — ${t.intro_li_anim_d || ''}</li>
                <li><strong>${t.intro_li_inv || ''}</strong> — ${t.intro_li_inv_d || ''}</li>
                <li><strong>${t.intro_li_res || ''}</strong> — ${t.intro_li_res_d || ''}</li>
                <li><strong>${t.intro_li_perm || ''}</strong> — ${t.intro_li_perm_d || ''}</li>
            </ul>
            <p class="text-muted mb-0">${t.intro_p4 || ''}</p>
        </div>`;
    Swal.fire({
        title: t.intro_title || 'Bienvenido',
        html,
        icon: 'info',
        confirmButtonText: t.intro_btn || 'Entendido, comenzar',
        confirmButtonColor: '#1a5d3b',
        width: 'min(640px, 96vw)',
    }).then(() => {
        sessionStorage.setItem(key, '1');
    });
}

function rowHasValue(r) {
    const v = r?.valor;
    return v != null && String(v).trim() !== '';
}

function protocolsSuppressed(plan) {
    return !moduleEnabledInPlan(plan, 'animales')
        && !moduleEnabledInPlan(plan, 'reactivos')
        && !moduleEnabledInPlan(plan, 'insumos');
}

const PERMISO_SUFFIX_TO_MOD = {
    Animales: 'animales',
    Reactivos: 'reactivos',
    Insumos: 'insumos',
    Alojamientos: 'alojamientos',
    Reservas: 'reservas',
};

function permisoModKeyFromCampo(campo) {
    const m = String(campo || '').match(/^menuRol\d+_(.+)$/);
    if (!m) return null;
    return PERMISO_SUFFIX_TO_MOD[m[1]] || null;
}

function orphanedEspeciesRows(rows, plan) {
    if (!rows?.length) return [];
    const anim = moduleEnabledInPlan(plan, 'animales');
    const aloj = moduleEnabledInPlan(plan, 'alojamientos');
    const traz = moduleEnabledInPlan(plan, 'trazabilidad_alojamientos');
    const blockOn = anim || aloj || traz;
    return rows.filter((r) => {
        if (!rowHasValue(r)) return false;
        const c = r.campo || '';
        if (!blockOn) return true;
        if (c.startsWith('esp_nombre_')) return false;
        if (/^sub_nom_/.test(c)) return !anim;
        if (/^aloj_/.test(c)) return !aloj;
        if (/^traz_/.test(c)) return !traz;
        return false;
    });
}

/**
 * Datos guardados que ya no pertenecen a módulos activos en el plan (solo si el plan es estricto).
 * @returns {Object<string, Array<{campo:string,valor:string}>>|null}
 */
function buildOrphanExportPayload(plan, grouped) {
    if (planIsWideOpen(plan) || !grouped || typeof grouped !== 'object') return null;
    const out = {};
    const take = (cat, rows) => {
        const arr = (rows || []).filter(rowHasValue);
        if (arr.length) {
            out[cat] = arr.map((r) => ({ campo: r.campo, valor: String(r.valor ?? '') }));
        }
    };
    if (protocolsSuppressed(plan)) {
        take('tipo_protocolo', grouped.tipo_protocolo);
        take('severidad', grouped.severidad);
    }
    if (!moduleEnabledInPlan(plan, 'reactivos')) take('reactivos', grouped.reactivos);
    if (!moduleEnabledInPlan(plan, 'insumos')) take('insumos', grouped.insumos);
    if (!moduleEnabledInPlan(plan, 'reservas')) take('reservas', grouped.reservas);

    const espOr = orphanedEspeciesRows(grouped.especies || [], plan);
    if (espOr.length) {
        out.especies = espOr.map((r) => ({ campo: r.campo, valor: String(r.valor ?? '') }));
    }

    ['permisos_rol_4_sec_admin', 'permisos_rol_5_asistente', 'permisos_rol_6_laboratorio'].forEach((cat) => {
        const rows = (grouped[cat] || []).filter(rowHasValue).filter((r) => {
            const mk = permisoModKeyFromCampo(r.campo);
            return mk && !moduleEnabledInPlan(plan, mk);
        });
        if (rows.length) {
            out[cat] = rows.map((r) => ({ campo: r.campo, valor: String(r.valor ?? '') }));
        }
    });

    return Object.keys(out).length ? out : null;
}

function orphanSectionLabel(cat, t) {
    const map = {
        tipo_protocolo: t.seccion_exp_prot || 'Tipos de protocolo',
        severidad: t.seccion_exp_sev || 'Severidades',
        reactivos: t.seccion_exp_reac || 'Reactivos',
        insumos: t.seccion_exp_ins || 'Insumos',
        reservas: t.seccion_exp_res || 'Reservas',
        especies: t.seccion_exp_esp || 'Especies / alojamiento / trazabilidad',
        permisos_rol_4_sec_admin: t.seccion_exp_p4 || 'Permisos rol 4',
        permisos_rol_5_asistente: t.seccion_exp_p5 || 'Permisos rol 5',
        permisos_rol_6_laboratorio: t.seccion_exp_p6 || 'Permisos rol 6',
    };
    return map[cat] || cat;
}

function renderOrphanExportBar(plan, grouped, slug) {
    const bar = document.getElementById('onboarding-orphan-export');
    if (!bar) return;
    const payload = buildOrphanExportPayload(plan, grouped);
    window.__onboardingOrphanPayload = payload;
    window.__onboardingSlugExport = slug || 'formulario';
    if (!payload) {
        bar.classList.add('d-none');
        bar.innerHTML = '';
        return;
    }
    const t = onboardingI18n();
    bar.classList.remove('d-none');
    bar.innerHTML = `
    <div class="alert alert-warning border border-warning shadow-sm mb-0">
      <div class="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
        <div>
          <h6 class="fw-bold mb-1 text-dark"><i class="bi bi-archive me-2"></i>${t.orphan_alert_title || 'Respaldo: datos de servicios desactivados'}</h6>
          <p class="small mb-0 text-dark">${t.orphan_alert_desc || 'Había información guardada en módulos que ya no están en su plan. Descargue copia antes de guardar el formulario, o esos campos dejarán de enviarse.'}</p>
        </div>
        <div class="d-flex flex-wrap gap-2 flex-shrink-0">
          <button type="button" class="btn btn-success btn-sm fw-bold" id="btn-orphan-excel"><i class="bi bi-file-earmark-excel me-1"></i>${t.orphan_btn_excel || 'Descargar Excel'}</button>
          <button type="button" class="btn btn-danger btn-sm fw-bold" id="btn-orphan-pdf"><i class="bi bi-file-earmark-pdf me-1"></i>${t.orphan_btn_pdf || 'Descargar PDF'}</button>
        </div>
      </div>
    </div>`;
    const bx = document.getElementById('btn-orphan-excel');
    const bp = document.getElementById('btn-orphan-pdf');
    if (bx) bx.onclick = () => exportOrphanExcel();
    if (bp) bp.onclick = () => exportOrphanPdf();
}

function exportOrphanExcel() {
    const t = onboardingI18n();
    const payload = window.__onboardingOrphanPayload;
    if (!payload || typeof window.XLSX === 'undefined') {
        Swal.fire({ icon: 'error', title: t.orphan_libs_missing || 'No se pudo generar Excel', text: t.orphan_try_pdf || 'Pruebe PDF o recargue la página.' });
        return;
    }
    const rows = [];
    Object.keys(payload).sort().forEach((cat) => {
        payload[cat].forEach((r) => {
            rows.push({
                [t.export_col_seccion || 'Sección']: orphanSectionLabel(cat, t),
                [t.export_col_campo || 'Campo']: r.campo,
                [t.export_col_valor || 'Valor']: r.valor,
            });
        });
    });
    const ws = window.XLSX.utils.json_to_sheet(rows);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Respaldo');
    const safe = String(window.__onboardingSlugExport || 'onboarding').replace(/[^\w\-]+/g, '_');
    window.XLSX.writeFile(wb, `GROBO_onboarding_respaldo_modulos_${safe}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function exportOrphanPdf() {
    const t = onboardingI18n();
    const payload = window.__onboardingOrphanPayload;
    const jsp = window.jspdf?.jsPDF;
    if (!payload || typeof jsp !== 'function') {
        Swal.fire({ icon: 'error', title: t.orphan_libs_pdf_missing || 'No se pudo generar PDF', text: t.orphan_try_excel || 'Pruebe Excel o recargue la página.' });
        return;
    }
    const doc = new jsp({ unit: 'mm', format: 'a4' });
    const margin = 14;
    let y = 16;
    const lineH = 5;
    const pageH = 285;
    doc.setFontSize(11);
    doc.text(t.orphan_pdf_title || 'GROBO — Respaldo datos (módulos desactivados)', margin, y);
    y += lineH * 2;
    doc.setFontSize(9);
    Object.keys(payload).sort().forEach((cat) => {
        const title = orphanSectionLabel(cat, t);
        doc.setFont('helvetica', 'bold');
        const headLines = doc.splitTextToSize(`■ ${title}`, 180);
        headLines.forEach((ln) => {
            if (y > pageH) { doc.addPage(); y = 16; }
            doc.text(ln, margin, y);
            y += lineH;
        });
        doc.setFont('helvetica', 'normal');
        payload[cat].forEach((r) => {
            const txt = `${r.campo}: ${r.valor}`;
            const lines = doc.splitTextToSize(txt, 180);
            lines.forEach((ln) => {
                if (y > pageH) { doc.addPage(); y = 16; }
                doc.text(ln, margin + 2, y);
                y += lineH;
            });
        });
        y += lineH;
    });
    const safe = String(window.__onboardingSlugExport || 'onboarding').replace(/[^\w\-]+/g, '_');
    doc.save(`GROBO_onboarding_respaldo_modulos_${safe}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

window.cambiarIdioma = async (lang) => {
    localStorage.setItem('lang', lang);
    window.location.reload(); 
};

document.addEventListener('DOMContentLoaded', async () => {
    const lang = localStorage.getItem('lang') || localStorage.getItem('idioma') || null;
    await loadLanguage(lang);
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
        mostrarErrorPantalla((onboardingI18n().err_invalid_url) || "URL Inválida");
        return;
    }

    try {
        const res = await API.request(`/form-registro/config/${slug}`);
        
        if (res && res.status === 'success') {
            if (res.data && parseInt(res.data.activo) === 0) {
                mostrarErrorPantalla((onboardingI18n().err_pausado) || "Este formulario ha sido pausado o desactivado por el administrador de GROBO. Comuníquese con soporte si cree que es un error.");
                return;
            }

            document.getElementById('id_form_config').value = res.data.id_form_config;
            document.getElementById('display-nombre-inst').innerText = `${(onboardingI18n().config_title) || 'Configuración:'} ${res.data.nombre_inst_previa}`;
            document.getElementById('display-encargado').innerText = `${(onboardingI18n().resp_title) || 'Responsable:'} ${res.data.encargado_nombre}`;
            
            // Si existen respuestas, reconstruimos. Si no, cargamos los defaults.
            if (res.respuestas && Object.keys(res.respuestas).length > 0) {
                reconstruirFormulario(res.respuestas);
            } else {
                cargarValoresPorDefecto();
            }

            const plan = parsePlanModulos(res.data.plan_modulos);
            applyOnboardingPlan(plan);
            const groupedResp = (res.respuestas && typeof res.respuestas === 'object') ? res.respuestas : {};
            renderOrphanExportBar(plan, groupedResp, slug);
            showOnboardingIntroOnce(slug);
        } else {
            throw new Error((onboardingI18n().err_expired) || "El enlace ha expirado o no es válido.");
        }
    } catch (e) { 
        mostrarErrorPantalla((onboardingI18n().err_conn) || "El enlace no es válido o el servidor no responde.");
        return; 
    }

    // LISTENERS
    document.getElementById('btn-add-org').onclick = () => agregarItemSimple('contenedor-organizaciones', 'org_nom[]', (onboardingI18n().ph_org) || "Ej: Facultad de Medicina");
    document.getElementById('btn-add-depto').onclick = () => agregarDepartamento();
    
    document.getElementById('btn-add-prot').onclick = () => agregarItemSimple('contenedor-tipos-prot', 'prot_tipo[]', (onboardingI18n().ph_prot) || "Ej: Investigación, Docencia");
    document.getElementById('btn-add-sev').onclick = () => agregarItemSimple('contenedor-severidades', 'sev_tipo[]', (onboardingI18n().ph_sev) || "Ej: Leve, Moderada");
    
    document.getElementById('btn-add-form').onclick = () => agregarTipoFormulario();
    document.getElementById('btn-add-reactivo').onclick = () => agregarReactivo(); 
    document.getElementById('btn-add-insumo').onclick = () => agregarInsumo();
    document.getElementById('btn-add-sala').onclick = () => agregarItemDoble('contenedor-salas', 'sala_nom[]', 'sala_lugar[]', (onboardingI18n().ph_room_name) || "Nombre Sala", (onboardingI18n().ph_room_loc) || "Ubicación Física");
    document.getElementById('btn-add-instrumento').onclick = () => agregarItemDoble('contenedor-instrumentos', 'instru_nom[]', 'instru_cant[]', (onboardingI18n().ph_equip_name) || "Nombre Instrumento", (onboardingI18n().ph_qty_disp) || "Cantidad a disposición", 'number');
    
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
        getVals(db['organizaciones'], 'org_nom[]').forEach(v => agregarItemSimple('contenedor-organizaciones', 'org_nom[]', (window.txt?.onboarding?.ph_org || 'Ej: Facultad de Medicina'), v));
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
    document.body.innerHTML = `<div class="p-5 text-center"><h1 class="text-danger">Error</h1><p>${msj}</p><a href="https://groboapp.com" class="btn btn-primary">${onboardingI18n().btn_back}</a></div>`;
}

function cargarValoresPorDefecto() {
    if(document.getElementById('contenedor-organizaciones').children.length === 0) {
        [onboardingI18n().prot_inv, onboardingI18n().prot_doc].forEach(v => agregarItemSimple('contenedor-tipos-prot', 'prot_tipo[]', '', v));
        [onboardingI18n().sev_1, onboardingI18n().sev_2, onboardingI18n().sev_3, onboardingI18n().sev_4].forEach(v => agregarItemSimple('contenedor-severidades', 'sev_tipo[]', '', v));
        agregarItemSimple('contenedor-organizaciones', 'org_nom[]', onboardingI18n().ph_org, 'Universidad General');
        agregarDepartamento();
        agregarTipoFormulario(); 
    }
}

window.poblarSelectOrgs = (selectElement) => {
    const currentVal = selectElement.value;
    selectElement.innerHTML = `<option value="">${onboardingI18n().ph_depto_org}</option>`;
    document.querySelectorAll('input[name="org_nom[]"]').forEach(input => {
        const val = input.value.trim();
        if (val) selectElement.innerHTML += `<option value="${val}" ${val === currentVal ? 'selected' : ''}>${val}</option>`;
    });
};

window.poblarSelectEspecies = (selectElement) => {
    const currentVal = selectElement.value;
    selectElement.innerHTML = `<option value="">${onboardingI18n().ph_species_opt}</option>`;
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
            <div class="col-6"><input type="text" class="form-control form-control-sm" name="depto_nom[]" value="${nom}" placeholder="${onboardingI18n().ph_depto_name}"></div>
            <div class="col-5">
                <select class="form-select form-select-sm" name="depto_org[]" onfocus="window.poblarSelectOrgs(this)">
                    <option value="">${onboardingI18n().ph_depto_org}</option>
                    ${orgOpt}
                </select>
            </div>
            <div class="col-1"><button class="btn btn-sm btn-outline-danger w-100" type="button" onclick="this.parentElement.parentElement.remove()">×</button></div>
        </div>`;
    document.getElementById('contenedor-deptos').insertAdjacentHTML('beforeend', html);
}

function agregarTipoFormulario(cat = 'Animal', nom = '', exento = '2') {
    const html = `
        <div class="row g-2 mb-2 p-2 bg-light border rounded position-relative shadow-sm">
            <button type="button" class="btn-close position-absolute top-0 end-0 m-1" style="font-size: 0.6rem" onclick="this.parentElement.remove()"></button>
            <div class="col-md-4">
                <label class="small text-muted fw-bold">${onboardingI18n().form_cat}</label>
                <select class="form-select form-select-sm fw-bold text-primary" name="form_cat[]">
                    <option value="Animal" ${cat==='Animal'?'selected':''}>Animal</option>
                    <option value="Otros reactivos biologicos" ${cat==='Otros reactivos biologicos'?'selected':''}>Otros Reactivos</option>
                    <option value="Insumos" ${cat==='Insumos'?'selected':''}>Insumos</option>
                </select>
            </div>
            <div class="col-md-5">
                <label class="small text-muted fw-bold">${onboardingI18n().form_name}</label>
                <input type="text" class="form-control form-control-sm" name="form_nom[]" value="${nom}" placeholder="${onboardingI18n().ph_form_name}">
            </div>
            <div class="col-md-3">
                <label class="small text-muted fw-bold">${onboardingI18n().form_billing}</label>
                <select class="form-select form-select-sm" name="form_exento[]">
                    <option value="2" ${exento==='2'?'selected':''}>${onboardingI18n().form_normal}</option>
                    <option value="1" class="text-success fw-bold" ${exento==='1'?'selected':''}>${onboardingI18n().form_free}</option>
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
                <div class="col-12"><input type="text" class="form-control form-control-sm fw-bold" name="reac_nom[]" value="${nom}" placeholder="${onboardingI18n().ph_reagent_name}"></div>
                <div class="col-4"><input type="number" class="form-control form-control-sm" name="reac_cant[]" value="${cant}" placeholder="${onboardingI18n().ph_qty}"></div>
                <div class="col-3"><input type="text" class="form-control form-control-sm" name="reac_medida[]" value="${med}" placeholder="${onboardingI18n().ph_measure}"></div>
                <div class="col-5">
                    <select class="form-select form-select-sm text-success" name="reac_esp[]" onfocus="window.poblarSelectEspecies(this)">
                        <option value="">${onboardingI18n().ph_species_opt}</option>
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
                <div class="col-12"><input type="text" class="form-control form-control-sm fw-bold" name="ins_nom[]" value="${nom}" placeholder="${onboardingI18n().ph_insumo_name}"></div>
                <div class="col-4"><input type="number" class="form-control form-control-sm" name="ins_cant[]" value="${cant}" placeholder="${onboardingI18n().ph_qty}"></div>
                <div class="col-3"><input type="text" class="form-control form-control-sm" name="ins_medida[]" value="${med}" placeholder="${onboardingI18n().ph_measure}"></div>
                <div class="col-5">
                    <select class="form-select form-select-sm text-success" name="ins_esp[]" onfocus="window.poblarSelectEspecies(this)">
                        <option value="">${onboardingI18n().ph_species_opt}</option>
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
            <input type="text" class="form-control w-50 fw-bold" name="serv_nom[]" value="${nom}" placeholder="${onboardingI18n().ph_serv_name}">
            <input type="number" class="form-control" name="serv_cant[]" value="${cant}" placeholder="${onboardingI18n().ph_qty}">
            <input type="text" class="form-control" name="serv_medida[]" value="${med}" placeholder="${onboardingI18n().ph_serv_measure}">
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
                <input type="text" class="form-control fw-bold w-50" value="${nomVal}" placeholder="${onboardingI18n().ph_species_name}" name="esp_nombre_${especieCount}">
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.parentElement.remove()"><i class="bi bi-trash"></i> ${onboardingI18n().btn_del_species}</button>
            </div>
            
            <div class="row g-3">
                <div class="col-md-4 border-end onboarding-subcol" data-onboarding-sub="sub">
                    <div class="d-flex flex-column mb-2 border-bottom pb-1">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <label class="small fw-bold text-success">${onboardingI18n().sub_title}</label>
                            <button type="button" class="btn btn-xs btn-outline-success" onclick="window.agregarSubespecie(${especieCount})">+</button>
                        </div>
                        <small class="text-muted" style="font-size: 0.65rem; line-height: 1.1;">${onboardingI18n().sub_desc}</small>
                    </div>
                    <div id="sub-contenedor-${especieCount}"></div>
                </div>
                
                <div class="col-md-4 border-end onboarding-subcol" data-onboarding-sub="aloj">
                    <div class="d-flex flex-column mb-2 border-bottom pb-1">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <label class="small fw-bold text-primary">${onboardingI18n().aloj_title}</label>
                            <button type="button" class="btn btn-xs btn-outline-primary" onclick="window.agregarAlojamientoEsp(${especieCount})">+</button>
                        </div>
                        <small class="text-muted" style="font-size: 0.65rem; line-height: 1.1;">${onboardingI18n().aloj_desc}</small>
                    </div>
                    <div id="aloj-contenedor-${especieCount}"></div>
                </div>

                <div class="col-md-4 onboarding-subcol" data-onboarding-sub="traz">
                    <div class="d-flex flex-column mb-2 border-bottom pb-1">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <label class="small fw-bold text-secondary">${onboardingI18n().traz_title}</label>
                            <button type="button" class="btn btn-xs btn-outline-secondary" onclick="window.agregarTrazabilidad(${especieCount})">+</button>
                        </div>
                        <small class="text-muted" style="font-size: 0.65rem; line-height: 1.1;">${onboardingI18n().traz_desc}</small>
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
    applySpeciesSubcolumns(window.__onboardingPlan);
}

window.agregarSubespecie = (parentID, val = '') => {
    const html = `
        <div class="input-group input-group-sm mb-1">
            <input type="text" class="form-control" value="${val}" placeholder="${onboardingI18n().ph_sub}" name="sub_nom_${parentID}[]">
            <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()">×</button>
        </div>`;
    document.getElementById(`sub-contenedor-${parentID}`).insertAdjacentHTML('beforeend', html);
};

window.agregarAlojamientoEsp = (parentID, nom = '', det = '') => {
    const html = `
        <div class="mb-2 p-1 border rounded bg-light position-relative">
            <button type="button" class="btn-close position-absolute top-0 end-0 m-1" style="font-size: 0.5rem" onclick="this.parentElement.remove()"></button>
            <input type="text" class="form-control form-control-sm fw-bold mb-1 pe-4" value="${nom}" placeholder="${onboardingI18n().ph_aloj_name}" name="aloj_nom_${parentID}[]">
            <input type="text" class="form-control form-control-sm text-muted" value="${det}" placeholder="${onboardingI18n().ph_aloj_det}" name="aloj_det_${parentID}[]">
        </div>`;
    document.getElementById(`aloj-contenedor-${parentID}`).insertAdjacentHTML('beforeend', html);
};

window.agregarTrazabilidad = (parentID, nom = '', tipo = 'Texto') => {
    const html = `
        <div class="input-group input-group-sm mb-2">
            <input type="text" class="form-control" value="${nom}" placeholder="${onboardingI18n().ph_traz_name}" name="traz_nom_${parentID}[]">
            <select class="form-select text-secondary" name="traz_tipo_${parentID}[]" style="max-width: 90px;">
                <option value="Texto" ${tipo==='Texto'?'selected':''}>${onboardingI18n().traz_txt}</option>
                <option value="Numero" ${tipo==='Numero'?'selected':''}>${onboardingI18n().traz_num}</option>
                <option value="Fecha" ${tipo==='Fecha'?'selected':''}>${onboardingI18n().traz_date}</option>
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
            title: onboardingI18n().confirm_title,
            text: onboardingI18n().confirm_text,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1a5d3b',
            confirmButtonText: onboardingI18n().btn_yes_send
        });
        if (!result.isConfirmed) return;
    }

    Swal.fire({ title: onboardingI18n().loading_save, allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const payload = { id_form: idForm, respuestas: respuestas, action: action, lang: localStorage.getItem('lang') || localStorage.getItem('idioma') || 'es' };
        const res = await API.request('/form-registro/submit', 'POST', payload);

        if (res && res.status === 'success') {
            Swal.fire({
                title: onboardingI18n().saved_title,
                text: action === 'confirm' ? onboardingI18n().saved_send_txt : onboardingI18n().saved_draft_txt,
                icon: 'success',
                confirmButtonColor: '#1a5d3b',
                confirmButtonText: (onboardingI18n().saved_seguir_editando) || 'Seguir editando'
            }).then(() => {
                if (action === 'confirm') {
                    // No redirigir; el usuario permanece en el formulario para seguir editando
                }
            });
        }
    } catch (e) {
        Swal.fire('Error', e.message, 'error');
    }
}