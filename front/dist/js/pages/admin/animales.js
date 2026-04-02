// 1. IMPORTACIONES
import { API } from '../../api.js';
import { hideLoader } from '../../components/LoaderComponent.js';
import { refreshMenuNotifications } from '../../components/MenuComponent.js';
import { getTipoFormBadgeStyle } from '../../utils/badgeTipoForm.js';
import { renderDerivacionTarifariosToolbar } from '../../utils/derivacionTarifariosUI.js';
import { openMensajeriaCompose } from '../../utils/mensajeriaCompose.js';

let allAnimals = [];
let currentPage = 1;
const rowsPerPage = 15;
let sortConfig = { key: 'idformA', direction: 'none' };
let formDataCache = null;
let openedAnimalFromUrl = false;

function getI18nValue(path) {
    if (!path) return '';
    const parts = String(path).split('.');
    let cur = window.txt;
    for (const p of parts) {
        if (!cur || typeof cur !== 'object') return '';
        cur = cur[p];
    }
    return (typeof cur === 'string') ? cur : '';
}

/**
 * INICIALIZACIÓN DE LA PÁGINA
 */
export async function initAnimalesPage() {
    const instId = localStorage.getItem('instId');

    const btnAyuda = document.getElementById('btn-ayuda-animal');
    if (btnAyuda) {
        btnAyuda.onclick = () => {
            const helpModal = new bootstrap.Modal(document.getElementById('modal-animal-help'));
            helpModal.show();
        };
    }

    try {
        const res = await API.request(`/animals/all?inst=${instId}`);
        if (res && res.status === 'success') {
            allAnimals = res.data;
            setupOriginInstitutionFilterAnimal();
            setupSortHeaders();
            renderTable();
            openAnimalFromUrlIfNeeded();
        }
    } catch (error) { console.error("❌ Error:", error); }


// Botón Ayuda
    document.getElementById('btn-ayuda-animal').onclick = () => {
        new bootstrap.Modal(document.getElementById('modal-animal-help')).show();
    };

    // Botón Excel (Abre el popup de fechas)
    document.getElementById('btn-excel-animal').onclick = () => {
        new bootstrap.Modal(document.getElementById('modal-excel-animal')).show();
    };


// LÓGICA DE REAPERTURA AUTOMÁTICA POST-RECARGA
    const reopenId = sessionStorage.getItem('reopenAnimalId');
    if (reopenId) {
        sessionStorage.removeItem('reopenAnimalId'); // Limpiamos para que no se abra siempre
        
        // Esperamos un momento a que la tabla cargue para buscar el objeto
        setTimeout(() => {
            const animalData = allAnimals.find(a => a.idformA == reopenId);
            if (animalData) {
                window.openAnimalModal(animalData); // Abre el popup que estaba
            }
        }, 800); // Ajusta el tiempo según la velocidad de tu API
    }
document.addEventListener('focusin', (e) => {
    if (e.target.closest(".swal2-container")) {
        e.stopImmediatePropagation();
    }
}, true);
    document.getElementById('btn-search-animal').onclick = () => { currentPage = 1; renderTable(); };
    document.getElementById('filter-status-animal').onchange = () => { currentPage = 1; renderTable(); };
    const filterDeriv = document.getElementById('filter-deriv-animal');
    if (filterDeriv) filterDeriv.onchange = () => { currentPage = 1; renderTable(); };
    const filterRetiroAnimal = document.getElementById('filter-retiro-animal');
    if (filterRetiroAnimal) filterRetiroAnimal.onchange = () => { currentPage = 1; renderTable(); };
    document.getElementById('search-input-animal').onkeyup = (e) => { if (e.key === 'Enter') { currentPage = 1; renderTable(); } };
}

function setupOriginInstitutionFilterAnimal() {
    const columnSelect = document.getElementById('filter-column-animal');
    if (!columnSelect) return;
    const values = [...new Set(allAnimals.map(a => (a.InstitucionOrigenNombre || '').trim()).filter(Boolean))].sort();

    // Limpiar opciones previas de origen para no duplicar al recargar.
    Array.from(columnSelect.options)
        .filter(opt => String(opt.value || '').startsWith('origin::'))
        .forEach(opt => opt.remove());

    if (!values.length) return;

    values.forEach(v => {
        const o = document.createElement('option');
        o.value = `origin::${v}`;
        o.textContent = v;
        columnSelect.appendChild(o);
    });
}

function openAnimalFromUrlIfNeeded() {
    if (openedAnimalFromUrl) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const action = (params.get('action') || '').toLowerCase();
    if (!id || (action && action !== 'view' && action !== 'edit')) return;

    const animal = allAnimals.find(a => String(a.idformA) === String(id));
    if (!animal) return;
    openedAnimalFromUrl = true;
    setTimeout(() => window.openAnimalModal(animal), 200);
}

/**
 * RECARGA DE DATOS Y SINCRONIZACIÓN TOTAL (TIEMPO REAL)
 */
async function syncAllData() {
    const instId = localStorage.getItem('instId');
    const res = await API.request(`/animals/all?inst=${instId}`);
    if (res && res.status === 'success') {
        allAnimals = res.data;
        setupOriginInstitutionFilterAnimal();
        renderTable(); 
        refreshMenuNotifications(); 
    }
}

/**
 * GESTIÓN DE TABLA Y ORDENAMIENTO
 */
function setupSortHeaders() {
    document.querySelectorAll('th[data-sortable="true"]').forEach(th => {
        th.style.cursor = 'pointer';
        let label = th.innerText.trim();
        if (!label) {
            label = getI18nValue(th.getAttribute('data-i18n')) || th.getAttribute('data-key') || '';
        }
        th.setAttribute('data-label', label);
        th.onclick = () => {
            const key = th.getAttribute('data-key');
            if (sortConfig.key === key) {
                sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : (sortConfig.direction === 'desc' ? 'none' : 'asc');
            } else { sortConfig.key = key; sortConfig.direction = 'asc'; }
            renderTable();
        };
    });
}

/** Aviso: derivación con formulario copia (modelo antiguo); debe cancelarse y re-derivarse con el flujo actual. */
function legacyDerivacionAnimalFlags(a) {
    const isCopy = Number(a.EsDerivacionCopiaLegacy ?? a.esderivacioncopialegacy ?? 0) === 1;
    const tieneCopia = Number(a.TieneCopiaLegacyActiva ?? a.tienecopialegacyactiva ?? 0) === 1;
    const idOrig = a.IdformALegacyOrigen ?? a.idformalegacyorigen ?? '';
    const idCopia = a.IdformALegacyCopiaActiva ?? a.idformalegacycopiaactiva ?? '';
    return { isCopy, tieneCopia, idOrig, idCopia };
}

function renderLegacyDerivacionBannerAnimal(a, compact = false) {
    const { isCopy, tieneCopia, idOrig, idCopia } = legacyDerivacionAnimalFlags(a);
    if (!isCopy && !tieneCopia) return '';
    const t = window.txt?.admin_animales || {};
    const titulo = t.derivacion_legacy_titulo || 'Derivación antigua (copia de formulario)';
    let cuerpo = '';
    if (isCopy) {
        cuerpo = t.derivacion_legacy_banner_copia
            || 'Este pedido fue generado como formulario nuevo (flujo antiguo). Debe devolver o cancelar el trámite en la red, volver al formulario original y derivar de nuevo con el proceso actual (sin crear un formulario duplicado).';
        if (idOrig) {
            cuerpo += ' ' + (t.derivacion_legacy_form_original || 'Formulario original') + `: #${idOrig}.`;
        }
    } else {
        cuerpo = t.derivacion_legacy_banner_origen
            || 'Existe una copia de este pedido en la red (flujo antiguo). Coordine cerrar esa derivación y vuelva a derivar desde este formulario con el proceso actual.';
        if (idCopia) {
            cuerpo += ' ' + (t.derivacion_legacy_id_copia || 'ID del formulario copia') + `: #${idCopia}.`;
        }
    }
    const cls = compact ? 'alert-warning py-1 px-2 mb-1' : 'alert-warning py-2 px-3 mb-2';
    return `<div class="alert ${cls} small border border-warning mb-0"><i class="bi bi-exclamation-triangle-fill me-2"></i><strong>${titulo}</strong><div class="mt-1 mb-0">${cuerpo}</div></div>`;
}

function updateHeaderIcons() {
    document.querySelectorAll('th[data-sortable="true"]').forEach(th => {
        const key = th.getAttribute('data-key');
        const icon = sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' ▲' : (sortConfig.direction === 'desc' ? ' ▼' : ' -')) : ' -';
        th.innerHTML = `${th.getAttribute('data-label')}${icon}`;
    });
}

function renderTable() {
    const tbody = document.getElementById('table-body-animals');
    const data = getFilteredAndSortedData();
    const pageData = data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    tbody.innerHTML = '';
    pageData.forEach(a => {
        const tr = document.createElement('tr');
        tr.className = "clickable-row";
        tr.onclick = () => window.openAnimalModal(a);

        const tipoBadgeStyle = getTipoFormBadgeStyle(a.colorTipo);
        const tipoBadgeHtml = `<span class="${tipoBadgeStyle.className}" style="${tipoBadgeStyle.style} font-size: 9px; padding: 3px 6px;">${(a.TipoNombre || 'Animal').replace(/</g, '&lt;')}</span>`;
        const cepaNueva = (a.CepaNombre || '').toString().trim();
        const cepaLegacy = (a.raza || '').toString().trim();
        const isValidCepaText = (v) => !!v && v !== '0' && v !== '-' && v.toLowerCase() !== 'null';
        const cepaDisplay = isValidCepaText(cepaNueva)
            ? cepaNueva
            : (isValidCepaText(cepaLegacy) ? `${cepaLegacy} (Cepa/Stock/Raza anterior)` : '-');

        tr.innerHTML = `
            <td class="py-2 px-2 text-muted small">${a.idformA}</td>
            <td class="py-2 px-2">${tipoBadgeHtml}</td>
            <td class="py-2 px-2 small">${a.Investigador}</td>
            <td class="py-2 px-2 small fw-bold text-success">${a.NProtocolo || '---'}</td>
            <td class="py-2 px-2 small">${a.CatEspecie}</td>
            <td class="py-2 px-2 small text-muted">${cepaDisplay}</td>
            <td class="py-2 px-2 small text-muted">${a.Edad || '---'}</td>
            <td class="py-2 px-2 small text-muted">${a.Peso || '---'}</td>
            <td class="py-2 px-2 text-center fw-bold">${a.CantAnimal}</td>
            <td class="py-2 px-2 text-center">
                ${(() => {
                    const extFlag = Number(a.DeptoExternoFlag || 1);
                    const isExt = extFlag === 2;
                    const labelInt = window.txt?.config_departamentos?.badge_interno || 'INTERNO';
                    const labelExt = window.txt?.config_departamentos?.badge_externo || 'EXTERNO';
                    if (isExt) {
                        return `<span class="badge bg-danger text-white" style="font-size:8px;">${labelExt}</span>`;
                    }
                    return `<span class="badge bg-success text-white" style="font-size:8px;">${labelInt}</span>`;
                })()}
            </td>
            <td class="py-2 px-2 small text-muted">${a.Inicio || '---'}</td>
            <td class="py-2 px-2 small text-muted">${a.Retiro || '---'}</td>
            <td class="py-2 px-2 text-center">${getStatusWithWorkflow(a)}</td>
        `;
        tbody.appendChild(tr);
        const { isCopy, tieneCopia } = legacyDerivacionAnimalFlags(a);
        if (isCopy || tieneCopia) {
            const trW = document.createElement('tr');
            trW.className = 'table-warning';
            trW.innerHTML = `<td colspan="13" class="py-1 px-2 small border-top-0">${renderLegacyDerivacionBannerAnimal(a, true)}</td>`;
            tbody.appendChild(trW);
        }
    });

    updateHeaderIcons();
    renderPagination(data.length, 'pagination-animal', renderTable);
    hideLoader();
}

function getFilteredAndSortedData() {
    const statusFilter = document.getElementById('filter-status-animal').value.toLowerCase();
    const term = document.getElementById('search-input-animal').value.toLowerCase().trim();
    const filterType = document.getElementById('filter-column-animal').value;
    const derivFilter = document.getElementById('filter-deriv-animal')?.value || 'all';
    const retiroDate = document.getElementById('filter-retiro-animal');
    const retiroVal = retiroDate ? (retiroDate.value || '').trim() : '';

    let data = allAnimals.filter(a => {
        const isDerived = Number(a.DerivadoActivo || 0) === 1;
        let eff = a.estado;
        if (isDerived && (a.estado_origen != null || a.estado_destino != null)) {
            if (a.estado_destino != null && String(a.estado_destino).trim() !== '') eff = a.estado_destino;
            else if (a.estado_origen != null && String(a.estado_origen).trim() !== '') eff = a.estado_origen;
        }
        const estadoFila = (eff || 'sin estado').toString().toLowerCase().trim();
        if (statusFilter !== 'all' && estadoFila !== statusFilter) return false;
        if (derivFilter === 'derived' && !isDerived) return false;
        if (derivFilter === 'local' && isDerived) return false;
        const originName = (a.InstitucionOrigenNombre || '').trim();
        if (String(filterType).startsWith('origin::')) {
            const originSelected = String(filterType).slice('origin::'.length);
            if (originName !== originSelected) return false;
        }
        if (retiroVal) {
            const aRetiro = (a.Retiro || '').toString().substring(0, 10);
            if (aRetiro !== retiroVal) return false;
        }
        if (!term) return true;
        if (filterType === 'all' || String(filterType).startsWith('origin::')) return JSON.stringify(a).toLowerCase().includes(term);
        return String(a[filterType] || '').toLowerCase().includes(term);
    });

    if (sortConfig.direction !== 'none') {
        data.sort((a, b) => {
            let valA = a[sortConfig.key] || ''; let valB = b[sortConfig.key] || '';
            const factor = sortConfig.direction === 'asc' ? 1 : -1;
            return isNaN(valA) ? valA.toString().localeCompare(valB) * factor : (valA - valB) * factor;
        });
    } else { data.sort((a, b) => b.idformA - a.idformA); }
    return data;
}

/**
 * 2. MODAL DE DETALLE (CORREGIDO)
 */
window.openAnimalModal = async (a) => {
    const instId = localStorage.getItem('instId');
    const container = document.getElementById('modal-content-animal');
    const btnPdfFoot = document.getElementById('btn-modal-animal-pdf');
    if (btnPdfFoot) btnPdfFoot.disabled = true;
    container.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success"></div></div>`;

    const currentInst = Number(instId || sessionStorage.getItem('instId') || 0);
    const isOriginInst = Number(a.IdInstitucionOrigen || 0) === currentInst && currentInst > 0;
    const isDerivedDest = Number(a.DerivadoActivo || 0) === 1 && !isOriginInst;

    const [resMaster, resSex, resNotify, resDeptos, resConfig] = await Promise.all([
        formDataCache ? Promise.resolve({status:'success', data:formDataCache}) : API.request(`/animals/form-data?inst=${instId}`),
        API.request(`/animals/get-sex-data?id=${a.idformA}`),
        API.request(`/animals/last-notification?id=${a.idformA}`),
        API.request(`/deptos/list?inst=${instId}`),
        isDerivedDest ? API.request(`/forms/derivation/config?idformA=${a.idformA}&categoria=Animal`) : Promise.resolve(null)
    ]);
    formDataCache = resMaster.data;
    if (resDeptos && resDeptos.status === 'success' && resDeptos.data) formDataCache.deptos = resDeptos.data;
    const sex = resSex.data || { machoA: 0, hembraA: 0, indistintoA: 0, totalA: 0 };
    const lastNotify = resNotify.data;
    const derivConfig = (resConfig && resConfig.status === 'success' && resConfig.data) ? resConfig.data : null;

    if (isDerivedDest) {
        try { await API.request('/forms/derivation/mark-viewed', 'POST', { idformA: a.idformA }); } catch (_) {}
    }

    // --- CORRECCIÓN IDENTIDAD ---
    const userFull = localStorage.getItem('userFull') || localStorage.getItem('userName') || 'Usuario';
    const userId = localStorage.getItem('userId') || '—';
    const identity = `${String(userFull).trim() || 'Usuario'} (ID: ${userId})`;

    // ENSAMBLADO MODULAR
    let html = renderModalHeader(a, derivConfig);
    if (derivConfig?.enviadoPor && (derivConfig.enviadoPor.nombre || derivConfig.enviadoPor.institucion)) {
        html += renderEnviadoPor(derivConfig.enviadoPor);
    }
    html += renderDerivacionTarifariosToolbar(a);
    html += renderResearcherContact(a);
    html += `<input type="hidden" id="current-idformA" value="${a.idformA}">`;
    const configIncompleta = derivConfig && !derivConfig.completa;
    html += (configIncompleta ? renderConfigFaltaBanner(derivConfig.faltantes) : '');
    html += renderAdminSection(a, identity, configIncompleta);
    html += renderNotificationSection(lastNotify, a.idformA);
    html += renderOrderModificationSection(a, sex, formDataCache);

    container.innerHTML = html;
    if (btnPdfFoot) btnPdfFoot.disabled = false;

    // Actualizar org/ámbito al cambiar departamento
    const selDepto = document.getElementById('modal-depto-animal');
    if (selDepto) selDepto.onchange = function() { window.updateDeptoOrgAmbito(this, 'modal-org-animal', 'modal-ambito-animal'); };

    // Habilitar el cambio de estado cuando el usuario completa lo que falta en UI
    // (la validación final la hace el backend al intentar actualizar el estado).
    const statusSel = document.getElementById('modal-status');
    const updateDerivedEstadoEnablement = () => {
        if (!statusSel) return;
        const deptoOk = (document.getElementById('modal-depto-animal')?.value || '').trim() !== '';
        const espOk = (document.getElementById('select-especie-modal')?.value || '').trim() !== '';
        const catOk = (document.getElementById('select-categoria-modal')?.value || '').trim() !== '';
        const selCepa = document.getElementById('select-cepa-modal');
        const help = document.getElementById('cepa-modal-help');
        const cepaRequired = help && (help.textContent || '').toLowerCase().includes('debe seleccionar');
        const cepaOk = !cepaRequired || (selCepa && String(selCepa.value || '0') !== '0');

        statusSel.disabled = !(deptoOk && espOk && catOk && cepaOk);
        if (statusSel.disabled) {
            statusSel.setAttribute(
                'title',
                window.txt?.misformularios?.derivacion_actualizar_primero || 'Actualice el formulario antes de cambiar el estado'
            );
        } else {
            statusSel.removeAttribute('title');
        }
    };
    if (statusSel && isDerivedDest && configIncompleta) {
        const bind = (id) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('change', updateDerivedEstadoEnablement);
        };
        bind('modal-depto-animal');
        bind('select-especie-modal');
        bind('select-categoria-modal');
        bind('select-cepa-modal');
    }

    // Inicialización de eventos
    document.getElementById('form-animal-full').onsubmit = (e) => window.saveFullAnimalForm(e);
    const isDerivedActive = Number(a.DerivadoActivo || 0) === 1 && Number(a.IdFormularioDerivacionActiva || 0) > 0;
    const useAllLocalSpecies = isDerivedActive && !isOriginInst;
    if (useAllLocalSpecies) {
        await window.loadSpeciesForProtocol(a.idprotA, a.idsubespA, { allLocal: true });
    } else if (a.idprotA) {
        await window.loadSpeciesForProtocol(a.idprotA, a.idsubespA);
    }
    const selEsp = document.getElementById('select-especie-modal');
    const idespA = selEsp && selEsp.value ? selEsp.value : null;
    if (idespA) await window.loadCepasForEspecieModal(idespA, a.idcepaA);
    window.calculateAnimalTotals?.();
    window.updateResumenNuevoFormulario?.();
    if (statusSel && isDerivedDest && configIncompleta) updateDerivedEstadoEnablement();
    new bootstrap.Modal(document.getElementById('modal-animal')).show();
};

/* --- FUNCIONES DE RENDERIZADO (MODULOS) --- */

function renderEnviadoPor(ep) {
    const t = window.txt?.misformularios || {};
    const lbl = t.derivacion_enviado_por || 'Enviado por';
    const parts = [ep.nombre, ep.institucion].filter(Boolean);
    if (parts.length === 0) return '';
    let html = `<div class="alert alert-secondary py-2 px-3 small mb-2"><strong>${lbl}:</strong> ${parts.join(', ')}`;
    if (ep.correo || ep.telefono) html += ` | ${ep.correo || ''} ${ep.telefono ? (ep.correo ? '· ' : '') + ep.telefono : ''}`;
    html += '</div>';
    return html;
}

function renderConfigFaltaBanner(faltantes) {
    const t = window.txt?.misformularios || {};
    const msg = t.derivacion_actualizar_formulario || 'Actualizar formulario para la aplicación';
    const desc = t.derivacion_faltan_datos || 'Complete los datos antes de cambiar el estado.';
    const faltantesTxt = Array.isArray(faltantes) ? faltantes.join(', ') : '';
    return `<div class="alert alert-warning py-2 px-3 mb-2 small">
        <strong><i class="bi bi-exclamation-triangle me-1"></i>${msg}</strong>
        <div class="mt-1">${desc} ${faltantesTxt ? `(${faltantesTxt})` : ''}</div>
    </div>`;
}

function renderModalHeader(a, derivConfig) {
    const tx = window.txt?.misformularios || {};
    const currentInst = Number(localStorage.getItem('instId') || sessionStorage.getItem('instId') || 0);
    const isDerivedActive = Number(a.DerivadoActivo || 0) === 1 && Number(a.IdFormularioDerivacionActiva || 0) > 0;
    const isOriginInst = Number(a.IdInstitucionOrigen || 0) === currentInst && currentInst > 0;
    const wf = (a.EstadoWorkflow || '').toString().toUpperCase();
    const isPendingAtDestination = isDerivedActive && !isOriginInst && wf.includes('PENDIENTE');
    const originName = (a.InstitucionOrigenNombre || '').trim();
    const currentName = (a.InstitucionActualNombre || '').trim();
    const routeText = [originName, currentName].filter(Boolean).join(' → ');
    const lblDerivado = tx.workflow_derivado || 'Derivado';
    const lblAceptar = tx.estado_derivacion_aceptada || 'Aceptar';
    const lblDevolver = tx.estado_derivacion_devuelta || 'Devolver';
    const lblRechazar = tx.estado_derivacion_rechazada || 'Rechazar';
    const lblRetirar = tx.retirar_derivacion_btn || 'Retirar derivación';
    const lblHistorial = tx.historial_derivacion_titulo || 'Historial';
    const lblDerivar = tx.derivar_btn || 'Derivar';
    const lblWaitAccept = tx.derivacion_espera_aceptacion || 'Debe aceptar la derivación para comenzar a trabajar.';
    const lblProtocolLocked = tx.derivacion_protocolo_bloqueado || 'Protocolo fijo: no se puede cambiar en formulario derivado.';
    const derivBox = isDerivedActive
        ? `
        <div class="mt-2 d-flex flex-wrap gap-2 align-items-center">
            <span class="badge bg-primary">${lblDerivado}${routeText ? ` · ${routeText}` : ''}</span>
            ${isOriginInst
                ? `<button type="button" class="btn btn-sm btn-outline-danger" onclick="window.resolveDerivacionAnimal('cancel', ${a.IdFormularioDerivacionActiva}, ${a.idformA})">${lblRetirar}</button>`
                : isPendingAtDestination
                    ? `
            <button type="button" class="btn btn-sm btn-outline-success" onclick="window.resolveDerivacionAnimal('accept', ${a.IdFormularioDerivacionActiva}, ${a.idformA})">${lblAceptar}</button>
            <button type="button" class="btn btn-sm btn-outline-warning" onclick="window.resolveDerivacionAnimal('return', ${a.IdFormularioDerivacionActiva}, ${a.idformA})">${lblDevolver}</button>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="window.resolveDerivacionAnimal('reject', ${a.IdFormularioDerivacionActiva}, ${a.idformA})">${lblRechazar}</button>`
                    : ''
            }
            <button type="button" class="btn btn-sm btn-outline-dark" onclick="window.showDerivHistoryAnimal(${a.idformA})">${lblHistorial}</button>
        </div>`
        : `
        <div class="mt-2 d-flex flex-wrap gap-2 align-items-center">
            <button type="button" class="btn btn-sm btn-outline-primary" onclick="window.deriveFromAdminAnimal(${a.idformA})">${lblDerivar}</button>
            <button type="button" class="btn btn-sm btn-outline-dark" onclick="window.showDerivHistoryAnimal(${a.idformA})">${lblHistorial}</button>
        </div>`;
    const derivInfoPanel = isDerivedActive
        ? `<div class="alert alert-info mt-2 py-2 px-3 small mb-0">
            <div><strong>${lblProtocolLocked}</strong></div>
            ${isPendingAtDestination ? `<div>${lblWaitAccept}</div>` : ''}
        </div>`
        : '';

    const legacyBanner = renderLegacyDerivacionBannerAnimal(a, false);
    return `
    <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
        <div class="flex-grow-1 pe-2">
            <h5 class="fw-bold mb-0">Detalle Animal</h5>
            <span class="small text-muted">ID: <strong>${a.idformA}</strong> | Investigador: ${a.Investigador}</span>
            ${legacyBanner}
            ${derivBox}
            ${derivInfoPanel}
        </div>
        <button class="btn-close" data-bs-dismiss="modal"></button>
    </div>`;
}

function renderResearcherContact(a) {
    const ta = window.txt?.admin_animales || {};
    const lblBtn = ta.btn_msg_investigador || '';
    return `
    <div class="row g-2 mb-3 small border-bottom pb-3 text-center" data-id-investigador="${a.IdInvestigador}" data-idform-a="${a.idformA}">
        <div class="col-md-3"><strong>ID Inv:</strong> ${a.IdInvestigador}</div>
        <div class="col-md-3 text-truncate"><strong>Email:</strong> ${a.EmailInvestigador}</div>
        <div class="col-md-3"><strong>Cel:</strong> ${a.CelularInvestigador}</div>
        <div class="col-md-3 text-truncate"><strong>Depto:</strong> ${a.DeptoProtocolo}</div>
        <div class="col-12 mt-2">
            <button type="button" class="btn btn-sm btn-outline-primary fw-bold shadow-sm" onclick="window.composeMsgToInvestigador(${a.IdInvestigador}, ${a.idformA})">
                <i class="bi bi-chat-dots me-1"></i>${lblBtn}
            </button>
        </div>
    </div>`;
}

// --- CORRECCIÓN VISUALIZACIÓN "REVISADO POR" ---
function renderAdminSection(a, identity, disableEstado = false) {
    // Mostrar nombre + ID como en Reactivos; si no hay visor → "Falta revisar"
    const visorTexto = (a.QuienVio && String(a.QuienVio).trim() && a.QuienVio.toLowerCase() !== 'null') ? a.QuienVio : 'Falta revisar';
    const t = window.txt?.admin_animales?.modal || {};
    const lblRevisado = t.reviewed_by || "Revisado por";
    const disAttr = disableEstado ? ' disabled title="' + (window.txt?.misformularios?.derivacion_actualizar_primero || 'Actualice el formulario antes de cambiar el estado') + '"' : '';

    return `
    <div class="bg-light p-3 rounded border shadow-sm mb-3">
        <div class="row g-3">
            <div class="col-md-6">
                <label class="form-label small fw-bold text-muted uppercase">Estado Pedido</label>
                <div class="d-flex align-items-center gap-2">
                    <select id="modal-status" class="form-select form-select-sm fw-bold" onchange="window.updateAnimalStatusQuick()"${disAttr}>
                        <option value="Sin estado" ${a.estado === 'Sin estado' ? 'selected' : ''}>Sin estado</option>
                        <option value="Proceso" ${a.estado === 'Proceso' ? 'selected' : ''}>Proceso</option>
                        <option value="Listo para entrega" ${a.estado === 'Listo para entrega' ? 'selected' : ''}>Listo para entrega</option>
                        <option value="Entregado" ${a.estado === 'Entregado' ? 'selected' : ''}>Entregado</option>
                        <option value="Suspendido" ${a.estado === 'Suspendido' ? 'selected' : ''}>Suspendido</option>
                        <option value="Reservado" ${a.estado === 'Reservado' ? 'selected' : ''}>Reservado</option>
                    </select>
                    <div id="modal-status-badge-container">${getStatusBadge(a.estado, (Number(a.DerivadoActivo || 0) === 1 && (a.InstitucionActualNombre || '').trim()) ? a.InstitucionActualNombre.trim() : undefined)}</div>
                </div>
            </div>
            <div class="col-md-6">
                <label class="form-label small fw-bold text-muted uppercase">${lblRevisado}</label>
                <input type="text" id="modal-quienvisto" class="form-control form-control-sm bg-light fw-bold text-primary" value="${visorTexto}" readonly>
            </div>
            <div class="col-12">
                <label class="form-label small fw-bold text-muted uppercase">Aclaración Admin (Auto-guardado)</label>
                <textarea id="modal-aclaracionadm" class="form-control form-control-sm" rows="2" onblur="window.updateAnimalStatusQuick()">${a.AclaracionAdm || ''}</textarea>
            </div>
        </div>
    </div>`;
}

function renderNotificationSection(lastNotify, idformA) {
    return `
    <div class="alert alert-success border-success mb-3 p-3 d-flex justify-content-between align-items-center shadow-sm">
        <div style="max-width: 70%;">
            <p class="mb-1 fw-bold small uppercase"><i class="bi bi-envelope-check me-1"></i> Notificación por Correo:</p>
            <p id="notify-text" class="mb-0 small" style="font-size: 11px;">
                ${lastNotify ? `<strong>${lastNotify.fecha}:</strong> ${lastNotify.NotaNotificacion}` : 'No se han enviado correos.'}
            </p>
        </div>
        <button class="btn btn-sm btn-success fw-bold px-3 shadow-sm" onclick="window.openNotifyPopup(${idformA})">NOTIFICAR</button>
    </div>
    <hr class="my-4 border-2 border-success opacity-25">`;
}

function renderOrderModificationSection(a, sex, cache) {
    const tx = window.txt?.misformularios || {};
    const deptos = Array.isArray(cache.deptos) ? cache.deptos : [];
    const currentInst = Number(localStorage.getItem('instId') || sessionStorage.getItem('instId') || 0);
    const isDerivedActive = Number(a.DerivadoActivo || 0) === 1 && Number(a.IdFormularioDerivacionActiva || 0) > 0;
    const isOriginInst = Number(a.IdInstitucionOrigen || 0) === currentInst && currentInst > 0;
    const wf = (a.EstadoWorkflow || '').toString().toUpperCase();
    const lockProtocol = isDerivedActive && !isOriginInst;
    const lockImmutable = isDerivedActive && !isOriginInst;
    // En derivación destino queremos que el usuario pueda ajustar el tipo/formulario,
    // aunque otros elementos del formulario puedan quedar bloqueados.
    const lockTipo = false;
    // En destino RED debemos mostrar y reutilizar lo ya configurado localmente (no limpiar depto/cepa/tipo)
    const emptyEditable = false;
    const labelInt = window.txt?.config_departamentos?.badge_interno || 'INTERNO';
    const labelExt = window.txt?.config_departamentos?.badge_externo || 'EXTERNO';
    const sinOrg = window.txt?.generales?.sin_organizacion || '– (sin organización)';
    const idDepto = emptyEditable ? '' : (a.idDepto != null ? a.idDepto : '');
    const orgActual = (a.Organizacion && String(a.Organizacion).trim()) ? a.Organizacion : sinOrg;
    const extFlag = Number(a.DeptoExternoFlag || 1);
    const isExt = extFlag === 2;
    const ambitoBadge = isExt ? `<span class="badge bg-danger text-white" style="font-size:9px;">${labelExt}</span>` : `<span class="badge bg-success text-white" style="font-size:9px;">${labelInt}</span>`;
    const optionsDepto = deptos.map(d => {
        const ext = (d.externodepto == 2) || (d.externodepto == null && d.externoorganismo == 2) ? 2 : 1;
        const org = (d.NombreOrganismoSimple && String(d.NombreOrganismoSimple).trim()) ? d.NombreOrganismoSimple : sinOrg;
        const sel = (d.iddeptoA == idDepto) ? ' selected' : '';
        return `<option value="${d.iddeptoA}" data-org="${(org || '').replace(/"/g, '&quot;')}" data-externo="${ext}"${sel}>${d.NombreDeptoA || ''}</option>`;
    }).join('');
    const protLabel = (a.NProtocolo || '') + (a.TituloProtocolo ? ` - ${a.TituloProtocolo}` : '') || '—';
    const panelOrigen = lockImmutable ? `
    <div class="alert alert-info border-info mb-3 py-3">
        <h6 class="fw-bold text-dark mb-2"><i class="bi bi-file-earmark-text me-2"></i>1. ${tx.derivacion_datos_origen || 'Datos del formulario original (derivado)'}</h6>
        <p class="small text-muted mb-2">${tx.derivacion_datos_origen_desc || 'Estos son los datos que vinieron con la derivación.'}</p>
        <div class="row g-2 small">
            <div class="col-6"><strong>Tipo:</strong> ${a.TipoNombre || '—'}</div>
            <div class="col-6"><strong>Protocolo:</strong> ${protLabel}</div>
            <div class="col-6"><strong>Departamento:</strong> ${a.DeptoProtocolo || '—'}</div>
            <div class="col-6"><strong>${window.txt?.form_animales?.especie || 'Especie'}:</strong> ${a.EspeNombreA || '—'}</div>
            <div class="col-6"><strong>${window.txt?.form_animales?.label_categoria || 'Categoría'}:</strong> ${a.SubEspeNombreA || '—'}</div>
            <div class="col-6"><strong>Cepa:</strong> ${a.CepaNombre || '—'}</div>
            <div class="col-6"><strong>Cantidades:</strong> M:${sex.machoA} H:${sex.hembraA} I:${sex.indistintoA} Total:${sex.totalA}</div>
            <div class="col-6"><strong>Edad/Peso:</strong> ${a.Edad || '—'} / ${a.Peso || '—'}</div>
            <div class="col-6"><strong>Inicio/Retiro:</strong> ${a.Inicio || '—'} / ${a.Retiro || '—'}</div>
        </div>
    </div>` : '';

    const tituloModificar = lockImmutable ? (tx.derivacion_modificar_con_mi_inst || '2. Modificar con opciones de mi institución') : (tx.derivacion_modificar_con_mi_inst || 'Modificar formulario');
    const panelResumen = lockImmutable ? `
    <div class="alert alert-success border-success mb-3 py-3" id="resumen-nuevo-formulario-animal">
        <h6 class="fw-bold text-dark mb-2"><i class="bi bi-check2-square me-2"></i>3. ${tx.derivacion_resumen_nuevo || 'Resumen del nuevo formulario (lo que modifiqué)'}</h6>
        <p class="small text-muted mb-2">${tx.derivacion_resumen_desc || 'Vista previa de cómo quedará el pedido al guardar.'}</p>
        <div id="resumen-nuevo-formulario-content" class="row g-2 small text-dark">— ${tx.derivacion_resumen_placeholder || 'Seleccione especie y categoría arriba.'} —</div>
    </div>` : '';

    return `
    <h6 class="fw-bold text-success uppercase mb-3" style="font-size: 13px;">${lockImmutable ? '2. ' : ''}${tituloModificar}</h6>
    ${panelOrigen}
    <form id="form-animal-full" class="bg-white p-3 border rounded shadow-sm">
        <input type="hidden" name="idformA" value="${a.idformA}">
        <div class="row g-3">
            
            <div class="col-md-12">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Tipo de Pedido</label>
                <select name="tipoA" id="select-type-modal" class="form-select form-select-sm" onchange="window.calculateAnimalTotals()" ${lockTipo ? 'disabled' : ''}>
                    ${cache.types.map(t => {
                        const tipoIdOk = isOriginInst
                            ? (a.TipoNombre === t.nombreTipo)
                            : ((a.tipoAId != null && String(a.tipoAId) !== '') ? (Number(a.tipoAId) === Number(t.IdTipoFormulario)) : (a.TipoNombre === t.nombreTipo));
                        return `<option value="${t.IdTipoFormulario}" data-exento="${t.exento}" data-desc="${t.descuento}" ${tipoIdOk ? 'selected' : ''}>${t.nombreTipo}</option>`;
                    }).join('')}
                </select>
                ${lockTipo ? `<input type="hidden" name="tipoA" value="${a.tipoAId || ''}">` : ''}
            </div>
            <div class="col-md-12">
                <label class="form-label small fw-bold uppercase text-muted mb-1">N° Protocolo</label>
                ${lockProtocol
                    ? `<div class="form-control form-control-sm bg-light">${protLabel}</div><input type="hidden" name="idprotA" value="${a.idprotA || ''}">`
                    : `<input type="text" class="form-control form-control-sm mb-1 bg-light border-0" placeholder="Filtrar protocolo..." onkeyup="window.filterProtocolList(this)">
                <select id="select-protocol-modal" name="idprotA" class="form-select form-select-sm" onchange="window.handleProtocolChange(this)">
                    ${cache.protocols.map(p => `<option value="${p.idprotA}" data-externo="${p.protocoloexpe}" ${a.idprotA == p.idprotA ? 'selected' : ''}>${p.nprotA} - ${p.tituloA}</option>`).join('')}
                </select>`}
            </div>
            <div class="col-md-12">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Departamento</label>
                <select name="depto" id="modal-depto-animal" class="form-select form-select-sm fw-bold" onchange="window.updateResumenNuevoFormulario?.()">
                    <option value="">— Sin departamento —</option>
                    ${optionsDepto}
                </select>
            </div>
            <div class="col-md-6">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Organización</label>
                <div id="modal-org-animal" class="form-control-plaintext form-control-sm bg-light border rounded px-2 py-1 small">${orgActual}</div>
            </div>
            <div class="col-md-6">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Ámbito</label>
                <div id="modal-ambito-animal" class="pt-1">${ambitoBadge}</div>
            </div>

            <div class="col-12 mt-4">
                <h6 class="fw-bold text-success border-bottom border-success border-opacity-25 pb-2 mb-1" style="font-size: 11px;">1. CARACTERÍSTICAS DEL ANIMAL</h6>
            </div>
            
            <div class="col-md-3">
                <label class="form-label small fw-bold uppercase text-muted mb-1">${window.txt?.form_animales?.especie || 'Especie'}</label>
                <select id="select-especie-modal" class="form-select form-select-sm" onchange="window.onEspecieModalChange(this); window.updateResumenNuevoFormulario?.();"></select>
            </div>
            <div class="col-md-3">
                <label class="form-label small fw-bold uppercase text-muted mb-1">${window.txt?.form_animales?.label_categoria || 'Categoría'}</label>
                <select id="select-categoria-modal" name="idsubespA" class="form-select form-select-sm" onchange="window.updateSpeciesPrice(this)"></select>
            </div>
            <div class="col-md-3">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Cepa/Stock/Raza</label>
                <select id="select-cepa-modal" name="idcepaA" class="form-select form-select-sm fw-bold" onchange="window.updateResumenNuevoFormulario?.()"></select>
                <div id="cepa-modal-help" class="small text-muted mt-1" style="font-size: 10px;"></div>
            </div>
            ${a.raza ? `
            <div class="col-md-3">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Cepa/Stock/Raza / Línea (legacy)</label>
                <input type="text" name="razaA" class="form-control form-control-sm" value="${a.raza || ''}" ${lockImmutable ? 'readonly' : ''}>
            </div>` : `<input type="hidden" name="razaA" value="">`}
            <div class="col-md-3">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Edad</label>
                <input type="text" name="edadA" class="form-control form-control-sm" value="${a.Edad || ''}" ${lockImmutable ? 'readonly' : ''}>
            </div>
            <div class="col-md-3">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Peso</label>
                <input type="text" name="pesoA" class="form-control form-control-sm" value="${a.Peso || ''}" ${lockImmutable ? 'readonly' : ''}>
            </div>

            <div class="col-12 mt-4">
                <h6 class="fw-bold text-success border-bottom border-success border-opacity-25 pb-2 mb-1" style="font-size: 11px;">2. CANTIDADES Y COSTOS</h6>
            </div>

            <div class="col-md-3">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Machos</label>
                <input type="number" name="machoA" class="form-control form-control-sm" value="${sex.machoA}" oninput="window.calculateAnimalTotals()" ${lockImmutable ? 'readonly' : ''}>
            </div>
            <div class="col-md-3">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Hembras</label>
                <input type="number" name="hembraA" class="form-control form-control-sm" value="${sex.hembraA}" oninput="window.calculateAnimalTotals()" ${lockImmutable ? 'readonly' : ''}>
            </div>
            <div class="col-md-3">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Indistintos</label>
                <input type="number" name="indistintoA" class="form-control form-control-sm" value="${sex.indistintoA}" oninput="window.calculateAnimalTotals()" ${lockImmutable ? 'readonly' : ''}>
            </div>
            <div class="col-md-3">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Total</label>
                <input type="number" id="total-animals-modal" name="totalA" class="form-control form-control-sm bg-light fw-bold text-center" value="${sex.totalA}" readonly>
            </div>

            <div class="col-md-6 mt-3">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Precio Unitario (BD)</label>
                <div class="input-group input-group-sm">
                    <span class="input-group-text bg-light fw-bold">$</span>
                    <input type="text" id="price-unit-modal" class="form-control bg-light text-end" value="${emptyEditable ? 0 : (a.PrecioUnit || 0)}" readonly>
                </div>
            </div>
            <div class="col-md-6 mt-3">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Precio Final</label>
                <div id="discount-alert" class="small text-danger fw-bold mb-1" style="display:none;"></div>
                <div class="input-group input-group-sm">
                    <span class="input-group-text alert-success border-success fw-bold">$</span>
                    <input type="text" id="price-total-modal" class="form-control alert-success border-success fw-bold text-end" value="0.00" readonly>
                </div>
            </div>

            <div class="col-12 mt-4">
                <h6 class="fw-bold text-success border-bottom border-success border-opacity-25 pb-2 mb-1" style="font-size: 11px;">3. FECHAS Y OBSERVACIONES</h6>
            </div>

            <div class="col-md-6">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Fecha de Inicio</label>
                <input type="date" name="fechainicioA" class="form-control form-control-sm" value="${a.Inicio || ''}" ${lockImmutable ? 'readonly' : ''}>
            </div>
            <div class="col-md-6">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Fecha de Retiro</label>
                <input type="date" name="fecRetiroA" class="form-control form-control-sm" value="${a.Retiro || ''}" ${lockImmutable ? 'readonly' : ''}>
            </div>

            <div class="col-12">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Aclaración Usuario (Lectura)</label>
                <div class="p-2 border rounded bg-light small" style="min-height: 40px;">${a.Aclaracion || '<span class="text-muted fst-italic">Sin aclaración adicional enviada por el usuario.</span>'}</div>
            </div>

            ${panelResumen}

            <div class="mt-4 d-flex justify-content-end gap-2 border-top pt-3 w-100">
                <button type="submit" class="btn btn-success btn-sm px-5 fw-bold shadow-sm" style="background-color: #1a5d3b;" ${(isDerivedActive && (isOriginInst || (wf || '').includes('PENDIENTE'))) ? 'disabled title="' + (tx.derivacion_guardar_bloqueado || 'No se puede guardar: el formulario está en derivación.') + '"' : ''}>GUARDAR CAMBIOS</button>
            </div>
        </div>
    </form>`;
}
// --- ACTUALIZACIÓN DINÁMICA ---
window.updateAnimalStatusQuick = async () => {
    const id = document.getElementById('current-idformA').value;
    const row = allAnimals.find(x => Number(x.idformA) === Number(id));
    const currentInst = Number(localStorage.getItem('instId') || sessionStorage.getItem('instId') || 0);
    const isOriginInst = Number(row?.IdInstitucionOrigen || 0) === currentInst && currentInst > 0;
    const isDerivedActive = Number(row?.DerivadoActivo || 0) === 1 && Number(row?.IdFormularioDerivacionActiva || 0) > 0;
    const wf = (row?.EstadoWorkflow || '').toString().toUpperCase();
    const lockByPending = isDerivedActive && !isOriginInst && wf.includes('PENDIENTE');
    if (lockByPending) {
        const tx = window.txt?.misformularios || {};
        window.Swal.fire('Derivación pendiente', tx.derivacion_espera_aceptacion || 'Debe aceptar la derivación para comenzar a trabajar.', 'warning');
        return;
    }

    // En derivación destino: al cambiar estado, primero persistimos depto/cepa/tipo/categoría
    // para que el backend valide contra BD y no contra el estado actual del UI.
    const isDerivedDest = isDerivedActive && !isOriginInst;
    if (isDerivedDest) {
        const formEl = document.getElementById('form-animal-full');
        if (formEl) {
            const tx = window.txt?.misformularios || {};
            const instParam = currentInst || sessionStorage.getItem('instId') || '';
            const fdFull = new FormData(formEl);
            try {
                const resFull = await API.request(`/animals/update-full?inst=${instParam}`, 'POST', fdFull);
                if (resFull?.status !== 'success') {
                    const title = tx.derivacion_actualizar_formulario || 'Actualizar formulario para la aplicación';
                    window.Swal.fire(title, resFull?.message || tx.derivacion_no_pudo_guardar_datos, 'warning');
                    return;
                }
            } catch (err) {
                const title = tx.derivacion_actualizar_formulario || 'Actualizar formulario para la aplicación';
                window.Swal.fire(title, err?.message || tx.derivacion_no_pudo_guardar_datos, 'error');
                return;
            }
        }
    }

    const statusSelect = document.getElementById('modal-status');
    const aclara = document.getElementById('modal-aclaracionadm').value;
    const isSinEstado = statusSelect.value.trim().toLowerCase() === 'sin estado';

    const fd = new FormData();
    fd.append('idformA', id);
    fd.append('estado', statusSelect.value);
    fd.append('aclaracionadm', aclara);
    fd.append('userName', '');

    try {
        const res = await API.request(`/animals/update-status`, 'POST', fd);
        if (res.status === 'success') {
            const inputVisor = document.getElementById('modal-quienvisto');
            if (inputVisor) {
                inputVisor.value = (res.quienvisto != null && res.quienvisto !== '') ? res.quienvisto : (isSinEstado ? 'Falta revisar' : '');
            }
            const porInst = (row && Number(row.DerivadoActivo || 0) === 1 && (row.InstitucionActualNombre || '').trim()) ? row.InstitucionActualNombre.trim() : undefined;
            document.getElementById('modal-status-badge-container').innerHTML = getStatusBadge(statusSelect.value, porInst);
            syncAllData();
        } else {
            const title = window.txt?.misformularios?.derivacion_actualizar_formulario || 'Actualizar formulario para la aplicación';
            window.Swal.fire(title, res.message || 'No se pudo cambiar el estado.', 'warning');
        }
    } catch (e) {
        console.error(e);
        const title = window.txt?.misformularios?.derivacion_actualizar_formulario || 'Actualizar formulario para la aplicación';
        window.Swal.fire(title, e?.message || 'No se pudo cambiar el estado.', 'error');
    }
};

/**
 * CÁLCULO DE PRECIOS CON EXENTO Y DESCUENTO
 */
window.calculateAnimalTotals = () => {
    const m = parseInt(document.querySelector('input[name="machoA"]').value) || 0;
    const h = parseInt(document.querySelector('input[name="hembraA"]').value) || 0;
    const i = parseInt(document.querySelector('input[name="indistintoA"]').value) || 0;
    const total = m + h + i;
    document.getElementById('total-animals-modal').value = total;

    const typeSelect = document.getElementById('select-type-modal');
    const selectedType = typeSelect.options[typeSelect.selectedIndex];
    
    // Lógica de Modificadores (Exento y Descuento)
    const isExento = selectedType.dataset.exento == "1";
    const discountPercent = parseFloat(selectedType.dataset.desc) || 0;
    const unitPrice = parseFloat(document.getElementById('price-unit-modal').value) || 0;

    let finalPrice = total * unitPrice;

    const alertBox = document.getElementById('discount-alert');
    if (isExento) {
        finalPrice = 0;
        alertBox.style.display = 'block';
        alertBox.innerText = "⚠️ EXENTO DE PAGO (100%)";
    } else if (discountPercent > 0) {
        finalPrice = finalPrice * (1 - (discountPercent / 100));
        alertBox.style.display = 'block';
        alertBox.innerText = `🎁 DESCUENTO POR ${selectedType.text}: ${discountPercent}%`;
    } else {
        alertBox.style.display = 'none';
    }

    document.getElementById('price-total-modal').value = finalPrice.toFixed(2);
    window.updateResumenNuevoFormulario?.();
};

window.updateResumenNuevoFormulario = () => {
    const content = document.getElementById('resumen-nuevo-formulario-content');
    if (!content) return;
    const selEsp = document.getElementById('select-especie-modal');
    const selCat = document.getElementById('select-categoria-modal');
    const selCepa = document.getElementById('select-cepa-modal');
    const priceUnit = document.getElementById('price-unit-modal');
    const priceTotal = document.getElementById('price-total-modal');
    const depto = document.getElementById('modal-depto-animal');
    const lblEsp = window.txt?.form_animales?.especie || 'Especie';
    const lblCat = window.txt?.form_animales?.label_categoria || 'Categoría';
    const espText = selEsp?.options[selEsp?.selectedIndex]?.text || '—';
    const catText = selCat?.options[selCat?.selectedIndex]?.text || '—';
    const cepaText = selCepa?.options[selCepa?.selectedIndex]?.text || '—';
    const deptoText = depto?.options[depto?.selectedIndex]?.text || '—';
    const unit = (priceUnit?.value || 0);
    const total = (priceTotal?.value || '0');
    const totalA = document.querySelector('input[name="totalA"]')?.value || '0';
    const ph = window.txt?.misformularios?.derivacion_resumen_placeholder || 'Seleccione especie y categoría arriba.';
    const hasEsp = (selEsp?.value || '').trim();
    const hasCat = (selCat?.value || '').trim();
    if (!hasEsp && !hasCat) {
        content.innerHTML = `<div class="col-12 text-muted fst-italic">— ${ph} —</div>`;
        return;
    }
    content.innerHTML = `
        <div class="col-6"><strong>${lblEsp}:</strong> ${espText}</div>
        <div class="col-6"><strong>${lblCat}:</strong> ${catText}</div>
        <div class="col-6"><strong>Cepa:</strong> ${cepaText}</div>
        <div class="col-6"><strong>Departamento:</strong> ${deptoText}</div>
        <div class="col-6"><strong>Cantidad:</strong> ${totalA}</div>
        <div class="col-6"><strong>Precio unit.:</strong> $${unit}</div>
        <div class="col-6"><strong>Total:</strong> $${total}</div>
    `;
};

window._speciesModalCache = null;

window.loadSpeciesForProtocol = async (protId, selectedSubId = null, opts = {}) => {
    const selEsp = document.getElementById('select-especie-modal');
    const selCat = document.getElementById('select-categoria-modal');
    if (!selEsp || !selCat) return;

    try {
        const instId = localStorage.getItem('instId') || sessionStorage.getItem('instId') || '';
        const allLocal = !!opts.allLocal;
        const url = allLocal
            ? `/animals/protocol-species?all=1&inst=${encodeURIComponent(instId)}`
            : `/animals/protocol-species?id=${protId}`;
        const res = await API.request(url);
        if (res.status === 'success' && res.data) {
            const filtered = res.data.filter(s => s.existe != 2);
            window._speciesModalCache = filtered;
            if (filtered.length > 0) {
                const especiesUnicas = [...new Map(filtered.map(s => [s.idespA, { idespA: s.idespA, EspeNombreA: s.EspeNombreA }])).values()];
                const item = selectedSubId ? filtered.find(s => s.idsubespA == selectedSubId) : null;
                const needsSelectPrompt = allLocal && !item && selectedSubId != null;
                const emptyOpt = (allLocal && selectedSubId == null) || needsSelectPrompt
                    ? `<option value="">${window.txt?.misformularios?.derivacion_seleccione_especie || '— Seleccione especie —'}</option>` : '';
                selEsp.innerHTML = emptyOpt + especiesUnicas.map(e => `<option value="${e.idespA}">${e.EspeNombreA}</option>`).join('');
                selCat.innerHTML = `<option value="">${window.txt?.form_animales?.primero_especie || 'Primero seleccione especie...'}</option>`;
                selCat.disabled = true;
                if (item) {
                    selEsp.value = item.idespA;
                    window.onEspecieModalChange(selEsp, selectedSubId);
                } else if (allLocal && especiesUnicas.length > 0) {
                    // En derivación destino puede que la subespecie original no exista en la institución destino.
                    // Aun así habilitamos una especie local para que categoría/cepa se puedan completar.
                    selEsp.value = especiesUnicas[0].idespA;
                    window.onEspecieModalChange(selEsp, null);
                } else if (!allLocal && filtered.length > 0) {
                    selEsp.value = filtered[0].idespA;
                    window.onEspecieModalChange(selEsp, filtered[0].idsubespA);
                }
                window.updateSpeciesPrice(selCat);
            } else {
                selEsp.innerHTML = '<option value="">Sin especies aprobadas</option>';
                selCat.innerHTML = '<option value="">—</option>';
            }
        }
    } catch (e) { console.error(e); }
};

window.onEspecieModalChange = (selEsp, selectedSubId = null) => {
    const idespA = selEsp && selEsp.value ? selEsp.value : null;
    const selCat = document.getElementById('select-categoria-modal');
    if (!selCat) return;
    selCat.innerHTML = '<option value="">—</option>';
    selCat.disabled = true;
    if (!idespA) {
        window.loadCepasForEspecieModal(null);
        window.updateResumenNuevoFormulario?.();
        return;
    }
    const cache = window._speciesModalCache || [];
    const categorias = cache.filter(s => s.idespA == idespA);
    if (categorias.length > 0) {
        selCat.disabled = false;
        selCat.innerHTML = categorias.map(s => `
            <option value="${s.idsubespA}" data-price="${s.Psubanimal || 0}" ${selectedSubId == s.idsubespA ? 'selected' : ''}>${s.SubEspeNombreA}</option>
        `).join('');
        if (selectedSubId) selCat.value = selectedSubId;
    }
    window.updateSpeciesPrice(selCat);
    window.loadCepasForEspecieModal(idespA);
};

window.updateSpeciesPrice = (select) => {
    const sel = select || document.getElementById('select-categoria-modal');
    const selected = sel && sel.options[sel.selectedIndex];
    const priceUnit = document.getElementById('price-unit-modal');
    if (priceUnit) priceUnit.value = (selected && selected.value && (selected.dataset.price || 0)) || 0;
    window.calculateAnimalTotals();
    const idespA = document.getElementById('select-especie-modal');
    const idespVal = idespA && idespA.value ? idespA.value : null;
    if (idespVal) window.loadCepasForEspecieModal(idespVal); else if (document.getElementById('select-cepa-modal')) window.loadCepasForEspecieModal(null);
    window.updateResumenNuevoFormulario?.();
};

window.loadCepasForEspecieModal = async (idespA, currentIdCepa = null) => {
    const instId = localStorage.getItem('instId');
    const sel = document.getElementById('select-cepa-modal');
    const help = document.getElementById('cepa-modal-help');
    if (!sel) return;
    sel.innerHTML = `<option value="0">-</option>`;
    sel.disabled = true;
    if (help) help.textContent = 'Cargando...';
    if (!idespA) {
        if (help) help.textContent = window.txt?.form_animales?.seleccione_especie_cepa || 'Seleccione especie.';
        return;
    }
    try {
        const res = await API.request(`/animals/cepas?inst=${instId}&idespA=${encodeURIComponent(idespA)}`);
        const list = (res && res.status === 'success' && Array.isArray(res.data)) ? res.data : [];
        sel.innerHTML = '';
        if (list.length > 0) {
            sel.disabled = false;
            sel.innerHTML = `<option value="0">Seleccione...</option>`;
            list.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.idcepaA;
                opt.text = c.CepaNombreA;
                sel.appendChild(opt);
            });
            if (currentIdCepa) sel.value = String(currentIdCepa);
            if (help) help.textContent = 'Si existen Cepa/Stock/Raza habilitadas para esta especie, debe seleccionar una.';
        } else {
            sel.disabled = true;
            sel.innerHTML = `<option value="0">-</option>`;
            if (help) help.textContent = 'No hay Cepa/Stock/Raza a seleccionar.';
        }
    } catch (e) {
        console.error(e);
        sel.disabled = true;
        sel.innerHTML = `<option value="0">-</option>`;
        if (help) help.textContent = 'No hay Cepa/Stock/Raza a seleccionar.';
    }
};

window.handleProtocolChange = async (select) => {
    window.loadSpeciesForProtocol(select.value);
};

window.updateDeptoOrgAmbito = (selectEl, idOrg, idAmbito) => {
    const opt = selectEl && selectEl.options[selectEl.selectedIndex];
    const labelInt = window.txt?.config_departamentos?.badge_interno || 'INTERNO';
    const labelExt = window.txt?.config_departamentos?.badge_externo || 'EXTERNO';
    const sinOrg = window.txt?.generales?.sin_organizacion || '– (sin organización)';
    const orgEl = idOrg ? document.getElementById(idOrg) : null;
    const ambitoEl = idAmbito ? document.getElementById(idAmbito) : null;
    if (opt && opt.value) {
        const org = opt.dataset.org || sinOrg;
        const ext = parseInt(opt.dataset.externo, 10) === 2;
        if (orgEl) orgEl.textContent = org;
        if (ambitoEl) ambitoEl.innerHTML = ext ? `<span class="badge bg-danger text-white" style="font-size:9px;">${labelExt}</span>` : `<span class="badge bg-success text-white" style="font-size:9px;">${labelInt}</span>`;
    } else {
        if (orgEl) orgEl.textContent = sinOrg;
        if (ambitoEl) ambitoEl.innerHTML = '';
    }
};

window.filterProtocolList = (input) => {
    const term = input.value.toLowerCase();
    const select = document.getElementById('select-protocol-modal');
    Array.from(select.options).forEach(opt => opt.style.display = opt.text.toLowerCase().includes(term) ? '' : 'none');
};

window.saveFullAnimalForm = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const instId = localStorage.getItem('instId');
    const id = fd.get('idformA');
    const row = allAnimals.find(x => Number(x.idformA) === Number(id));
    const currentInst = Number(instId || sessionStorage.getItem('instId') || 0);
    const isOriginInst = Number(row?.IdInstitucionOrigen || 0) === currentInst && currentInst > 0;
    const isDerivedActive = Number(row?.DerivadoActivo || 0) === 1 && Number(row?.IdFormularioDerivacionActiva || 0) > 0;
    const wf = (row?.EstadoWorkflow || '').toString().toUpperCase();
    const lockByPending = isDerivedActive && !isOriginInst && wf.includes('PENDIENTE');
    const lockSaveByDerivacion = isDerivedActive && (isOriginInst || lockByPending);
    if (lockSaveByDerivacion) {
        const tx = window.txt?.misformularios || {};
        window.Swal.fire('No se puede guardar', lockByPending ? (tx.derivacion_espera_aceptacion || 'Debe aceptar la derivación para comenzar a trabajar.') : (tx.derivacion_guardar_bloqueado || 'El formulario está en derivación.'), 'warning');
        return;
    }

    try {
        const catSel = document.getElementById('select-categoria-modal');
        const cepaSel = document.getElementById('select-cepa-modal');
        const cepaHelp = document.getElementById('cepa-modal-help');
        const hasCepas = cepaHelp && (cepaHelp.textContent || '').toLowerCase().includes('debe seleccionar');
        if (isDerivedActive && !isOriginInst && catSel && !(catSel.value || '').trim()) {
            const msg = window.txt?.misformularios?.derivacion_especie_requerida || 'Debe seleccionar Especie y Categoría para el formulario derivado.';
            window.Swal.fire('Falta información', msg, 'warning');
            return;
        }
        if (hasCepas && cepaSel && String(cepaSel.value || '0') === '0') {
            window.Swal.fire('Falta información', 'Debe seleccionar una Cepa/Stock/Raza.', 'warning');
            return;
        }
        const instParam = instId || sessionStorage.getItem('instId') || '';
        const res = await API.request(`/animals/update-full?inst=${instParam}`, 'POST', fd);
        if (res.status === 'success') {
            sessionStorage.setItem('reopenAnimalId', String(id));
            window.Swal.fire({ 
                title: '¡Guardado!', 
                text: 'Los datos del pedido se han actualizado.', 
                icon: 'success', 
                confirmButtonText: 'Aceptar',
                confirmButtonColor: '#1a5d3b'
            }).then(() => { location.reload(); });
        } else {
            window.Swal.fire('Error al guardar', res.message || 'No se pudieron guardar los cambios.', 'error');
        }
    } catch (err) {
        console.error(err);
        window.Swal.fire('Error', err?.message || 'Error al guardar. Revise la consola.', 'error');
    }
};

window.resolveDerivacionAnimal = async (action, idDerivacion, idformA) => {
    const tx = window.txt?.misformularios || {};
    const actionMap = {
        accept: '/forms/derivation/accept',
        return: '/forms/derivation/return',
        reject: '/forms/derivation/reject',
        cancel: '/forms/derivation/cancel'
    };
    const endpoint = actionMap[action];
    if (!endpoint) return;

    let mensaje = '';
    if (action !== 'accept') {
        const resMsg = await window.Swal.fire({
            title: tx.derivar_label_mensaje || 'Mensaje',
            input: 'textarea',
            inputPlaceholder: 'Motivo / observación',
            showCancelButton: true,
            confirmButtonText: 'Continuar',
            confirmButtonColor: '#1a5d3b'
        });
        if (!resMsg.isConfirmed) return;
        mensaje = (resMsg.value || '').trim();
    } else {
        const c = await window.Swal.fire({ title: 'Confirmar', text: tx.estado_derivacion_aceptada ? `¿${tx.estado_derivacion_aceptada}?` : '¿Aceptar derivación?', icon: 'question', showCancelButton: true, confirmButtonColor: '#1a5d3b' });
        if (!c.isConfirmed) return;
    }

    try {
        window.Swal.fire({ title: tx.derivar_procesando || 'Procesando...', didOpen: () => window.Swal.showLoading(), allowOutsideClick: false });
        const instActiva = localStorage.getItem('instId') || sessionStorage.getItem('instId') || '';
        const payload = { idDerivacion, mensaje, instId: Number(instActiva || 0) };
        const res = await API.request(endpoint, 'POST', payload);
        if (res.status === 'success') {
            window.Swal.fire('OK', tx.derivar_ok || 'Acción aplicada.', 'success');
            await syncAllData();
            const a = allAnimals.find(x => Number(x.idformA) === Number(idformA));
            if (a) window.openAnimalModal(a);
        } else {
            window.Swal.fire('Error', res.message || 'No se pudo procesar.', 'error');
        }
    } catch (e) {
        window.Swal.fire('Error', 'No se pudo procesar la derivación.', 'error');
    }
};

window.deriveFromAdminAnimal = async (idformA) => {
    const tx = window.txt?.misformularios || {};
    try {
        const instActiva = localStorage.getItem('instId') || sessionStorage.getItem('instId') || '';
        const resTargets = await API.request(`/forms/derivation/targets?inst=${encodeURIComponent(instActiva)}&instId=${encodeURIComponent(instActiva)}`);
        const targets = Array.isArray(resTargets?.data) ? resTargets.data : [];
        if (!targets.length) {
            window.Swal.fire(tx.derivar_titulo || 'Derivar formulario', tx.derivar_sin_destinos || 'No hay instituciones destino disponibles en la red.', 'info');
            return;
        }
        const options = {};
        targets.forEach(t => { options[String(t.IdInstitucion)] = t.NombreInst; });
        const pick = await window.Swal.fire({
            title: tx.derivar_titulo || 'Derivar formulario',
            input: 'select',
            inputOptions: options,
            inputPlaceholder: tx.derivar_label_destino || 'Seleccione institución destino',
            showCancelButton: true,
            confirmButtonText: tx.derivar_btn_confirmar || 'Derivar',
            confirmButtonColor: '#1a5d3b',
            inputValidator: (v) => (!v ? (tx.derivar_error_destino || 'Debe seleccionar una institución destino.') : null),
            didOpen: () => {
                const sel = window.Swal.getInput();
                if (!sel) return;
                sel.style.border = '2px solid #0d6efd';
                sel.style.backgroundColor = '#ffffff';
                sel.style.fontWeight = '700';
                sel.style.color = '#0d3b66';
                sel.style.minHeight = '42px';
            }
        });
        if (!pick.isConfirmed) return;
        const msg = await window.Swal.fire({
            title: tx.derivar_label_mensaje || 'Mensaje',
            input: 'textarea',
            inputPlaceholder: 'Motivo / observación',
            showCancelButton: true,
            confirmButtonText: tx.derivar_btn_confirmar || 'Derivar',
            confirmButtonColor: '#1a5d3b'
        });
        if (!msg.isConfirmed) return;
        const targetName = (targets.find(t => Number(t.IdInstitucion) === Number(pick.value)) || {}).NombreInst || '';
        const confirmDerive = await window.Swal.fire({
            title: tx.derivar_confirm_titulo || 'Confirmar derivación',
            text: `${tx.derivar_confirm_text || 'Al derivar, el formulario quedará bloqueado en la institución actual hasta que se resuelva en destino.'}${targetName ? ' ' + targetName : ''}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: tx.derivar_btn_confirmar || 'Derivar',
            confirmButtonColor: '#1a5d3b'
        });
        if (!confirmDerive.isConfirmed) return;
        window.Swal.fire({ title: tx.derivar_procesando || 'Procesando...', didOpen: () => window.Swal.showLoading(), allowOutsideClick: false });
        const res = await API.request('/forms/derivation/derive', 'POST', {
            idformA,
            instDestino: Number(pick.value),
            mensaje: (msg.value || '').trim(),
            instId: Number(instActiva || 0)
        });
        if (res.status === 'success') {
            window.Swal.fire('OK', tx.derivar_ok || 'Formulario derivado correctamente.', 'success');
            await syncAllData();
            const a = allAnimals.find(x => Number(x.idformA) === Number(idformA));
            if (a) window.openAnimalModal(a);
        } else {
            window.Swal.fire('Error', res.message || 'No se pudo derivar.', 'error');
        }
    } catch (e) {
        window.Swal.fire('Error', tx.historial_derivacion_error || 'No se pudo procesar la derivación.', 'error');
    }
};

window.showDerivHistoryAnimal = async (idformA) => {
    const tx = window.txt?.misformularios || {};
    try {
        window.Swal.fire({ title: tx.historial_derivacion_titulo || 'Historial de derivación', didOpen: () => window.Swal.showLoading(), allowOutsideClick: false });
        const instActiva = localStorage.getItem('instId') || sessionStorage.getItem('instId') || '';
        const res = await API.request(`/forms/derivation/history?idformA=${idformA}&inst=${encodeURIComponent(instActiva)}`);
        if (res.status !== 'success' || !Array.isArray(res.data) || !res.data.length) {
            window.Swal.fire(tx.historial_derivacion_titulo || 'Historial', tx.historial_derivacion_vacio || 'Sin movimientos de derivación.', 'info');
            return;
        }
        const html = res.data.map(d => {
            const e = Number(d.estado_derivacion || 0);
            const est = e === 1 ? (tx.estado_derivacion_pendiente || 'Pendiente')
                : e === 2 ? (tx.estado_derivacion_aceptada || 'Aceptada')
                : e === 3 ? (tx.estado_derivacion_devuelta || 'Devuelta')
                : e === 4 ? (tx.estado_derivacion_rechazada || 'Rechazada')
                : (tx.estado_derivacion_cancelada || 'Cancelada');
            return `<div style="text-align:left;border:1px solid #ddd;border-radius:6px;padding:8px;margin-bottom:8px;">
                <div><strong>#${d.IdFormularioDerivacion}</strong> - ${est}</div>
                <div style="font-size:12px;color:#666;">${d.InstitucionOrigenNombre || '-'} → ${d.InstitucionDestinoNombre || '-'}</div>
                <div style="font-size:12px;">${d.mensaje_origen || d.mensaje_destino || d.motivo_rechazo || ''}</div>
            </div>`;
        }).join('');
        window.Swal.fire({
            title: tx.historial_derivacion_titulo || 'Historial de derivación',
            html: `<div style="max-height:380px;overflow:auto;">${html}</div>`,
            width: 760
        });
    } catch (e) {
        window.Swal.fire('Error', tx.historial_derivacion_error || 'Error al cargar historial.', 'error');
    }
};

/**
 * NOTIFICACIÓN POR CORREO - GROBO (CON LOADER DE CARGA)
 */
window.openNotifyPopup = async (idformA) => {
    // 1. GESTIÓN DE FOCO (Para evitar conflictos con Bootstrap)
    const animalModalEl = document.getElementById('modal-animal');
    const modalInstance = bootstrap.Modal.getInstance(animalModalEl);
    const originalFocus = modalInstance._config.focus;
    modalInstance._config.focus = false;

    // 2. INPUT DE MENSAJE
    const { value: nota } = await window.Swal.fire({
        title: 'Enviar Notificación',
        input: 'textarea',
        inputLabel: 'Mensaje para el investigador',
        inputPlaceholder: 'Escriba aquí la observación...',
        showCancelButton: true,
        confirmButtonText: 'Enviar Correo',
        confirmButtonColor: '#1a5d3b',
        didOpen: () => {
            const input = window.Swal.getInput();
            if (input) {
                input.focus();
                input.addEventListener('keydown', (e) => e.stopPropagation());
            }
        },
        willClose: () => {
            modalInstance._config.focus = originalFocus;
        }
    });

    // 3. PROCESO DE ENVÍO CON FEEDBACK VISUAL
    if (nota) {
        const instId = localStorage.getItem('instId');
        const adminId = localStorage.getItem('userId');

        // --- AQUÍ ESTÁ LA MAGIA: MOSTRAR "ENVIANDO..." ---
        window.Swal.fire({
            title: 'Enviando...',
            text: 'Conectando con el servidor de correo, por favor espere.',
            allowOutsideClick: false, // Bloquea clics fuera
            allowEscapeKey: false,    // Bloquea tecla ESC
            didOpen: () => {
                window.Swal.showLoading(); // Muestra el spinner girando
            }
        });

        try {
            const res = await API.request('/animals/send-notification', 'POST', { 
                idformA, nota, instId, adminId 
            });
            
            if (res.status === 'success') {
                sessionStorage.setItem('reopenAnimalId', idformA);
                const tc = window.txt?.comunicacion || {};
                const wrap = document.querySelector('#modal-animal [data-id-investigador]');
                const idInv = wrap ? parseInt(wrap.getAttribute('data-id-investigador'), 10) : 0;
                window.Swal.close();
                if (idInv > 0) {
                    const ask = await window.Swal.fire({
                        title: tc.notify_post_ask_title || '',
                        text: tc.notify_post_ask_text || '',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: tc.notify_post_ask_confirm || '',
                        cancelButtonText: tc.notify_post_ask_dismiss || ''
                    });
                    if (ask.isConfirmed) {
                        const pref = tc.msg_default_subject_prefix || '';
                        const asunto = `${tc.msg_asunto || 'Asunto'} · ${pref} #${idformA}`;
                        await openMensajeriaCompose({
                            destinatarioId: idInv,
                            origenTipo: 'notificacion',
                            origenId: idformA,
                            origenEtiqueta: `Formulario #${idformA}`,
                            cuerpo: nota,
                            asunto,
                            lockCategory: true
                        });
                    }
                }
                await window.Swal.fire({
                    title: '¡Enviado!',
                    text: 'Los correos han sido enviados correctamente.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
                location.reload();
            } else {
                window.Swal.fire('Error', res.message || 'Fallo en el servidor', 'error');
            }
        } catch (e) { 
            window.Swal.fire('Error', 'Fallo de conexión', 'error');
        }
    }
};
/* --- AUXILIARES --- */

function getStatusBadge(estado, porInstitucion) {
    const tx = window.txt?.misformularios || {};
    const e = (estado || "Sin estado").toString().toLowerCase().trim();
    const states = {
        'entregado':          { label: 'Entregado',          class: 'bg-success text-white' },
        'proceso':            { label: 'Proceso',            class: 'bg-primary text-white' },
        'listo para entrega': { label: 'Listo para entrega', class: 'bg-warning text-dark' },
        'suspendido':         { label: 'Suspendido',         class: 'bg-danger text-white' },
        'reservado':          { label: 'Reservado',          class: 'bg-info text-dark' },
        'sin estado':         { label: 'Sin estado',         class: 'bg-secondary text-white' }
    };
    const s = states[e] || states['sin estado'];
    const lbl = porInstitucion ? `${s.label} ${tx.estado_por || 'por'} ${porInstitucion}` : s.label;
    return `<span class="badge ${s.class} shadow-sm mt-1" style="font-size: 9px; font-weight: 700; padding: 5px 10px; min-width: 90px; display: inline-block;">${lbl}</span>`;
}

function getWorkflowBadgeRow(item) {
    const tx = window.txt?.misformularios || {};
    const wf = (item.EstadoWorkflow || '').toString().toUpperCase();
    const isDerived = Number(item.DerivadoActivo || 0) === 1;
    if (isDerived) {
        const originName = (item.InstitucionOrigenNombre || '').trim();
        const currentName = (item.InstitucionActualNombre || '').trim();
        const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const routeText = [originName, currentName].filter(Boolean).map(esc).join(' → ');
        const base = tx.workflow_derivado || 'Derivado';
        const label = routeText ? `${base} · ${routeText}` : base;
        return `<span class="badge bg-primary mt-1">${label}</span>`;
    }
    if (!wf) return '';
    if (wf.includes('ACEPT')) return `<span class="badge bg-success mt-1">${tx.estado_derivacion_aceptada || 'Aceptada'}</span>`;
    if (wf.includes('DEVUEL')) return `<span class="badge bg-warning text-dark mt-1">${tx.estado_derivacion_devuelta || 'Devuelta'}</span>`;
    if (wf.includes('RECHAZ')) return `<span class="badge bg-danger mt-1">${tx.estado_derivacion_rechazada || 'Rechazada'}</span>`;
    if (wf.includes('CANCEL')) return `<span class="badge bg-secondary mt-1">${tx.estado_derivacion_cancelada || 'Cancelada'}</span>`;
    return `<span class="badge bg-info text-dark mt-1">${wf}</span>`;
}

function getStatusWithWorkflow(item) {
    const isDerived = Number(item.DerivadoActivo || 0) === 1;
    const derivBadge = getWorkflowBadgeRow(item);
    const hasDualEstados = isDerived && (item.estado_origen != null || item.estado_destino != null);
    let estadoBadge;
    if (hasDualEstados) {
        const st = (item.estado_destino != null && String(item.estado_destino).trim() !== '')
            ? item.estado_destino
            : (item.estado_origen != null && String(item.estado_origen).trim() !== '')
                ? item.estado_origen
                : (item.estado != null && String(item.estado).trim() !== '' ? item.estado : null);
        const b = st ? getStatusBadge(st) : getStatusBadge('Sin estado');
        estadoBadge = `<div class="d-flex flex-column gap-1 small">${b}</div>`;
    } else {
        const porInst = isDerived ? (item.InstitucionActualNombre || '').trim() : '';
        estadoBadge = getStatusBadge(item.estado, porInst || undefined);
    }
    if (isDerived) {
        return `<div class="d-inline-flex flex-column align-items-center">${derivBadge}${estadoBadge}</div>`;
    }
    return `<div class="d-inline-flex flex-column align-items-center">${estadoBadge}${derivBadge}</div>`;
}

function renderPagination(t, c, r) {
    const pag = document.getElementById(c); const total = Math.ceil(t / rowsPerPage);
    pag.innerHTML = ''; if (total <= 1) return;
    const btn = (l, p, d, a = false) => {
        const li = document.createElement('li'); li.className = `page-item ${d ? 'disabled' : ''} ${a ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${l}</a>`;
        if (!d) li.onclick = (e) => { e.preventDefault(); currentPage = p; r(); }; return li;
    };
    pag.appendChild(btn('Anterior', currentPage - 1, currentPage === 1));
    pag.appendChild(btn(1, 1, false, currentPage === 1));
    for (let i = Math.max(2, currentPage - 2); i <= Math.min(total - 1, currentPage + 2); i++) pag.appendChild(btn(i, i, false, i === currentPage));
    if (total > 1) pag.appendChild(btn(total, total, false, currentPage === total));
    pag.appendChild(btn('Siguiente', currentPage + 1, currentPage === total));
}

/** PDF ficha desde el pie del modal (usa el idformA cargado en el formulario). */
window.downloadAnimalPDFFromModal = () => {
    const hid = document.getElementById('current-idformA');
    const id = hid ? parseInt(hid.value, 10) : 0;
    if (!id) return;
    window.downloadAnimalPDF(id);
};

/**
 * GENERACIÓN DE FICHA PDF PERSONALIZADA - GROBO
 * Versión final con corrección de campos y lógica de exención.
 */
window.downloadAnimalPDF = async (id) => {
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    
    // Captura mejorada de selectores por 'name' para evitar el problema de Edad/Peso
    const getValByName = (name) => document.querySelector(`input[name="${name}"], textarea[name="${name}"]`)?.value || '---';
    const getSel = (id) => {
        const sel = document.getElementById(id);
        return sel ? sel.options[sel.selectedIndex]?.text : '---';
    };

    // Datos principales
    const investigador = document.querySelector('#modal-content-animal h5 + span')?.innerText || '---';
    const contacto = document.querySelector('#modal-content-animal .row.g-2.mb-3')?.innerText || '---';
    const tipoPedido = getSel('select-type-modal');
    const nProtocolo = getSel('select-protocol-modal');
    const especie = getSel('select-especie-modal');
    const categoria = getSel('select-categoria-modal');
    const estado = getSel('modal-status');
    
    // Corrección Edad y Peso
    const edad = getValByName('edadA');
    const peso = getValByName('pesoA');
    const raza = getValByName('razaA');

    
    const machos = getValByName('machoA') || '0';
    const hembras = getValByName('hembraA') || '0';
    const indistintos = getValByName('indistintoA') || '0';
    const total = document.getElementById('total-animals-modal')?.value || '0';
    
    const precioUnit = document.getElementById('price-unit-modal')?.value || '0';
    const precioTotalRaw = document.getElementById('price-total-modal')?.value || '0';
    
    // Lógica Exento de Pago
    let precioFinalDisplay = `$${precioTotalRaw}`;
    if (parseFloat(precioTotalRaw) === 0) {
        precioFinalDisplay = `$${precioTotalRaw} (Exento de pago)`;
    }

    const fInicio = getValByName('fechainicioA');
    const fRetiro = getValByName('fecRetiroA');
    const aclaracion = document.querySelector('#form-animal-full .bg-light.small')?.innerText || 'Sin aclaraciones.';

    // HTML del Template para PDF
    const pdfTemplate = `
        <div style="font-family: Arial, sans-serif; color: #333; padding: 10px;">
            <div style="text-align: center; border-bottom: 2px solid #1a5d3b; padding-bottom: 10px; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #1a5d3b;">GROBO - ${inst}</h2>
                <h4 style="margin: 5px 0; color: #444;">FICHA DE PEDIDO: ANIMAL</h4>
                <p style="margin: 0; font-size: 12px; color: #666;">ID Pedido: ${id} | Generado: ${new Date().toLocaleString()}</p>
            </div>

            <div style="margin-bottom: 20px;">
                <p style="font-size: 12px; margin: 5px 0;"><strong>Investigador:</strong> ${investigador}</p>
                <p style="font-size: 11px; margin: 5px 0; color: #555;">${contacto}</p>
                <p style="font-size: 14px; margin: 15px 0;"><strong>ESTADO DEL PEDIDO:</strong> <span style="color: #1a5d3b; font-weight: bold;">${estado}</span></p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; width: 50%;"><strong>Tipo de Pedido:</strong><br>${tipoPedido}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>N° Protocolo:</strong><br>${nProtocolo}</td>
                </tr>
            <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Especie:</strong><br>${especie}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Categoría:</strong><br>${categoria}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;" colspan="2">
                        <strong>Cepa/Stock/Raza:</strong> ${raza} &nbsp;|&nbsp; <strong>Edad:</strong> ${edad} &nbsp;|&nbsp; <strong>Peso:</strong> ${peso}
                    </td>
                </tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="padding: 10px; border: 1px solid #ddd;">Machos</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">Hembras</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">Indistintos</th>
                        <th style="padding: 10px; border: 1px solid #ddd; background-color: #e9f5ee;">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">${machos}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${hembras}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${indistintos}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${total}</td>
                    </tr>
                </tbody>
            </table>

            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; border: 1px solid #eee;">
                <p style="margin: 5px 0; font-size: 12px;"><strong>Precio Unitario:</strong> $${precioUnit}</p>
                <p style="margin: 5px 0; font-size: 18px; color: #1a5d3b;"><strong>PRECIO TOTAL: ${precioFinalDisplay}</strong></p>
            </div>

            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <div style="flex: 1; border: 1px solid #ddd; padding: 10px;">
                    <strong>Fecha Inicio:</strong><br>${fInicio}
                </div>
                <div style="flex: 1; border: 1px solid #ddd; padding: 10px;">
                    <strong>Fecha Retiro:</strong><br>${fRetiro}
                </div>
            </div>

            <div style="border-top: 1px solid #eee; padding-top: 10px;">
                <p style="font-size: 11px; margin-bottom: 5px;"><strong>Aclaración del Usuario:</strong></p>
                <p style="font-size: 11px; font-style: italic; color: #555; background: #fff; padding: 5px; border: 1px dashed #ccc;">${aclaracion}</p>
            </div>
        </div>
    `;

    // Configuración de html2pdf
    const opt = {
        margin: [18, 18, 18, 18],
        filename: `GROBO_${inst}_Pedido_${id}.pdf`,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(pdfTemplate).save();
    } catch (error) {
        console.error("Error al generar PDF:", error);
    }
};

/**
 * PROCESAR EXPORTACIÓN A EXCEL - GROBO
 */
window.processExcelExport = () => {
    const start = document.getElementById('excel-start-date').value;
    const end = document.getElementById('excel-end-date').value;
    const nombreInst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();

    if (!start || !end) {
        window.Swal.fire('Atención', 'Debe seleccionar un rango de fechas.', 'warning');
        return;
    }

    let data = getFilteredAndSortedData();

    // Filtro por rango de fechas
    data = data.filter(a => {
        const fechaPedido = a.Inicio || '0000-00-00';
        return fechaPedido >= start && fechaPedido <= end;
    });

    if (data.length === 0) {
        window.Swal.fire('Sin resultados', 'No hay registros en ese rango.', 'info');
        return;
    }

    // Encabezados con punto y coma
    const headers = ["ID", "Tipo", "Investigador", "Protocolo", "Especie", "Cepa/Stock/Raza", "Edad", "Peso", "Total", "Inicio", "Retiro", "Estado"];
    const csvRows = [headers.join(";")];

    data.forEach(a => {
        const cepaNueva = (a.CepaNombre || '').toString().trim();
        const cepaLegacy = (a.raza || '').toString().trim();
        const isValidCepaText = (v) => !!v && v !== '0' && v !== '-' && v.toLowerCase() !== 'null';
        const cepaDisplay = isValidCepaText(cepaNueva)
            ? cepaNueva
            : (isValidCepaText(cepaLegacy) ? `${cepaLegacy} (Cepa/Stock/Raza anterior)` : '-');
        const row = [
            a.idformA,
            a.TipoNombre,
            a.Investigador,
            a.NProtocolo || '---',
            a.CatEspecie || '---',
            cepaDisplay,
            a.Edad || '---',  // NUEVO
            a.Peso || '---',  // NUEVO
            a.CantAnimal,
            `="${a.Inicio || '---'}"`, 
            `="${a.Retiro || '---'}"`,
            a.estado
        ];
        // Limpiar el texto para que no rompa las columnas
        csvRows.push(row.map(v => String(v).replace(/;/g, ' ').replace(/\n/g, ' ')).join(";"));
    });

    // Generación del archivo con nombre detallado
    const csvContent = "\uFEFF" + csvRows.join("\r\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    // Nombre de archivo con fechas incluido
    link.setAttribute("href", url);
    link.setAttribute("download", `GROBO_${nombreInst}_Animales_${start}_al_${end}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    const modalInstance = bootstrap.Modal.getInstance(document.getElementById('modal-excel-animal'));
    if (modalInstance) modalInstance.hide();
};

window.composeMsgToInvestigador = async (idInv, idformA) => {
    const id = parseInt(idInv, 10);
    const fid = parseInt(idformA, 10);
    if (!id || !fid) return;
    const tc = window.txt?.comunicacion || {};
    const pref = tc.msg_default_subject_prefix || '';
    const asunto = `${tc.msg_asunto || 'Asunto'} · ${pref} #${fid}`;
    await openMensajeriaCompose({
        destinatarioId: id,
        origenTipo: 'formulario',
        origenId: fid,
        origenEtiqueta: `Formulario #${fid}`,
        asunto,
        lockCategory: true
    });
};