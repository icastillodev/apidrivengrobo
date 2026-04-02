/**
 * NETWISE - Gestión de Reactivos Biológicos (Versión Pro)
 * Sistema: GROBO 2026
 */
import { API } from '../../api.js';
import { openMensajeriaCompose } from '../../utils/mensajeriaCompose.js';
import { hideLoader } from '../../components/LoaderComponent.js';
import { refreshMenuNotifications } from '../../components/MenuComponent.js';
import { getTipoFormBadgeStyle } from '../../utils/badgeTipoForm.js';
import { renderDerivacionTarifariosToolbar } from '../../utils/derivacionTarifariosUI.js';

let allReactivos = [];
let currentPage = 1;
const rowsPerPage = 15;
let sortConfig = { key: 'idformA', direction: 'none' };
let formDataCache = null;
let openedReactivoFromUrl = false;

window.composeMensajeReactivoInvestigador = async (idInvestigador, idformA) => {
    const id = parseInt(idInvestigador, 10);
    const fid = parseInt(idformA, 10);
    const tc = window.txt?.comunicacion || {};
    if (!id || !fid) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'warning', text: tc.msg_err_sin_dest || '' });
        }
        return;
    }
    const tm = window.txt?.reactivos?.modal || {};
    const asunto = `${tc.msg_asunto || ''} · ${tm.detail_title || 'Reactivos'} #${fid}`;
    await openMensajeriaCompose({
        destinatarioId: id,
        origenTipo: 'formulario',
        origenId: fid,
        origenEtiqueta: `Reactivos #${fid}`,
        asunto,
        lockCategory: true
    });
};

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
 * 1. INICIALIZACIÓN DE PÁGINA DE REACTIVOS
 */
export async function initReactivosPage() {
    const instId = localStorage.getItem('instId');

    // Blindaje de teclado para SweetAlert (evita que Bootstrap robe el foco)
    // Esto es lo que permite que el cuadro de texto de notificación sea escribible
    document.addEventListener('focusin', (e) => {
        if (e.target.closest(".swal2-container")) {
            e.stopImmediatePropagation();
        }
    }, true);
    const btnExcel = document.getElementById('btn-excel-reactivo');
        if (btnExcel) {
            btnExcel.onclick = () => {
                const modalExcel = new bootstrap.Modal(document.getElementById('modal-excel-reactivo'));
                modalExcel.show();
            };
        }
        const btnAyuda = document.getElementById('btn-ayuda-reactivo');
    if (btnAyuda) {
        btnAyuda.onclick = () => {
            // Asegúrate de que el Modal en el HTML tenga el ID: modal-reactivo-help
            const modalHelp = new bootstrap.Modal(document.getElementById('modal-reactivo-help'));
            modalHelp.show();
        };
    }
    try {
        // Carga inicial de datos de la institución
        const res = await API.request(`/reactivos/all?inst=${instId}`);
        
        if (res && res.status === 'success') {
            allReactivos = res.data;
            setupOriginInstitutionFilterReactivo();
            setupSortHeaders();
            renderTable();
            openReactivoFromUrlIfNeeded();

            // LÓGICA DE RE-APERTURA POST-RECARGA
            // Se ejecuta aquí dentro para garantizar que 'allReactivos' ya tiene datos
            const reopenId = sessionStorage.getItem('reopenReactivoId');
            if (reopenId) {
                sessionStorage.removeItem('reopenReactivoId');
                
                // Un pequeño delay para asegurar que el DOM y los componentes estén listos
                setTimeout(() => {
                    const data = allReactivos.find(r => r.idformA == reopenId);
                    if (data) {
                        window.openReactivoModal(data);
                    }
                }, 400); 
            }
        }
    } catch (error) { 
        console.error("❌ Error crítico en API de Reactivos:", error); 
    }

    // Eventos de búsqueda y filtros
    const btnSearch = document.getElementById('btn-search-reactivo');
    const filterStatus = document.getElementById('filter-status-reactivo');
    const searchInput = document.getElementById('search-input-reactivo');

    if (btnSearch) btnSearch.onclick = () => { currentPage = 1; renderTable(); };
    if (filterStatus) filterStatus.onchange = () => { currentPage = 1; renderTable(); };
    const filterDeriv = document.getElementById('filter-deriv-reactivo');
    if (filterDeriv) filterDeriv.onchange = () => { currentPage = 1; renderTable(); };
    const filterRetiroReactivo = document.getElementById('filter-retiro-reactivo');
    if (filterRetiroReactivo) filterRetiroReactivo.onchange = () => { currentPage = 1; renderTable(); };
    if (searchInput) {
        searchInput.onkeyup = (e) => { 
            if (e.key === 'Enter') { currentPage = 1; renderTable(); } 
        };
    }
}

function setupOriginInstitutionFilterReactivo() {
    const columnSelect = document.getElementById('filter-column-reactivo');
    if (!columnSelect) return;
    const values = [...new Set(allReactivos.map(a => (a.InstitucionOrigenNombre || '').trim()).filter(Boolean))].sort();

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

function openReactivoFromUrlIfNeeded() {
    if (openedReactivoFromUrl) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const action = (params.get('action') || '').toLowerCase();
    if (!id || (action && action !== 'view' && action !== 'edit')) return;

    const reactivo = allReactivos.find(r => String(r.idformA) === String(id));
    if (!reactivo) return;
    openedReactivoFromUrl = true;
    setTimeout(() => window.openReactivoModal(reactivo), 200);
}

/**
 * 2. MODAL DE DETALLE (Versión Blindada y Sincronizada)
 */
window.openReactivoModal = async (r) => {
    const instId = Auth.getVal('instId');
    const container = document.getElementById('modal-content-reactivo');

    container.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success"></div></div>`;

    const currentInst = Number(instId || sessionStorage.getItem('instId') || 0);
    const isOriginInst = Number(r.IdInstitucionOrigen || 0) === currentInst && currentInst > 0;
    const isDerivedDest = Number(r.DerivadoActivo || 0) === 1 && !isOriginInst;

    try {
        const [resMaster, resUsage, resNotify, resDeptos, resConfig] = await Promise.all([
            API.request(`/reactivos/form-data?inst=${instId}`),
            API.request(`/reactivos/usage?id=${r.idformA}`),
            API.request(`/reactivos/last-notification?id=${r.idformA}`),
            API.request(`/deptos/list?inst=${instId}`),
            isDerivedDest ? API.request(`/forms/derivation/config?idformA=${r.idformA}&categoria=Otros reactivos biologicos`) : Promise.resolve(null)
        ]);

        const derivConfig = (resConfig && resConfig.status === 'success' && resConfig.data) ? resConfig.data : null;
        if (isDerivedDest) {
            try { await API.request('/forms/derivation/mark-viewed', 'POST', { idformA: r.idformA }); } catch (_) {}
        }

        const cache = resMaster.data || {};
        const protocols = cache.protocols || cache.protocolos || [];
        const insumos = cache.insumos || [];
        if (resDeptos && resDeptos.status === 'success' && resDeptos.data) cache.deptos = resDeptos.data;
        
        const usage = resUsage.data || { totalA: 0, organo: 0 };
        const lastNotify = resNotify.data;
        
        // 🚀 FIX NULL: Usamos Auth.getVal para buscar en SessionStorage o LocalStorage
        const userFull = Auth.getVal('userFull') || Auth.getVal('userName') || 'Admin';
        const userId = Auth.getVal('userId') || '0';
        const identity = `${userFull} (ID: ${userId})`;

        let html = renderModalHeader(r);
        if (derivConfig?.enviadoPor && (derivConfig.enviadoPor.nombre || derivConfig.enviadoPor.institucion)) {
            html += renderEnviadoPor(derivConfig.enviadoPor);
        }
        html += renderDerivacionTarifariosToolbar(r);
        html += renderResearcherContact(r);
        html += `<input type="hidden" id="current-idformA" value="${r.idformA}">`;
        const configIncompleta = derivConfig && !derivConfig.completa;
        html += (configIncompleta ? renderConfigFaltaBanner(derivConfig.faltantes) : '');
        html += renderAdminSection(r, identity, configIncompleta);
        html += renderNotificationSection(lastNotify, r.idformA);
        
        // Pasamos usage y cache (con protocols, insumos y deptos)
        html += renderOrderModificationSection(r, usage, cache);

        container.innerHTML = html;

        const selDepto = document.getElementById('modal-depto-reactivo');
        if (selDepto) selDepto.onchange = function() { window.updateDeptoOrgAmbito(this, 'modal-org-reactivo', 'modal-ambito-reactivo'); };

        document.getElementById('form-reactivo-full').onsubmit = (e) => window.saveFullReactivoForm(e);
        
        const modalEl = document.getElementById('modal-reactivo');
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
        modalInstance.show();

    } catch (e) {
        console.error("❌ Error abriendo modal:", e);
        const t = window.txt?.reactivos?.alerts;
        container.innerHTML = `<div class="alert alert-danger">${t?.tech_error || 'Error al cargar los datos del pedido.'}</div>`;
    }
};
/* --- MÓDULOS DE RENDERIZADO DEL MODAL --- */

function renderModalHeader(r) {
    const t = window.txt.reactivos.modal;
    const tx = window.txt?.misformularios || {};
    const currentInst = Number(localStorage.getItem('instId') || sessionStorage.getItem('instId') || 0);
    const isDerivedActive = Number(r.DerivadoActivo || 0) === 1 && Number(r.IdFormularioDerivacionActiva || 0) > 0;
    const isOriginInst = Number(r.IdInstitucionOrigen || 0) === currentInst && currentInst > 0;
    const wf = (r.EstadoWorkflow || '').toString().toUpperCase();
    const isPendingAtDestination = isDerivedActive && !isOriginInst && wf.includes('PENDIENTE');
    const originName = (r.InstitucionOrigenNombre || '').trim();
    const currentName = (r.InstitucionActualNombre || '').trim();
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
                ? `<button type="button" class="btn btn-sm btn-outline-danger" onclick="window.resolveDerivacionReactivo('cancel', ${r.IdFormularioDerivacionActiva}, ${r.idformA})">${lblRetirar}</button>`
                : isPendingAtDestination
                    ? `
            <button type="button" class="btn btn-sm btn-outline-success" onclick="window.resolveDerivacionReactivo('accept', ${r.IdFormularioDerivacionActiva}, ${r.idformA})">${lblAceptar}</button>
            <button type="button" class="btn btn-sm btn-outline-warning" onclick="window.resolveDerivacionReactivo('return', ${r.IdFormularioDerivacionActiva}, ${r.idformA})">${lblDevolver}</button>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="window.resolveDerivacionReactivo('reject', ${r.IdFormularioDerivacionActiva}, ${r.idformA})">${lblRechazar}</button>`
                    : ''
            }
            <button type="button" class="btn btn-sm btn-outline-dark" onclick="window.showDerivHistoryReactivo(${r.idformA})">${lblHistorial}</button>
        </div>`
        : `
        <div class="mt-2 d-flex flex-wrap gap-2 align-items-center">
            <button type="button" class="btn btn-sm btn-outline-primary" onclick="window.deriveFromAdminReactivo(${r.idformA})">${lblDerivar}</button>
            <button type="button" class="btn btn-sm btn-outline-dark" onclick="window.showDerivHistoryReactivo(${r.idformA})">${lblHistorial}</button>
        </div>`;
    const derivInfoPanel = isDerivedActive
        ? `<div class="alert alert-info mt-2 py-2 px-3 small mb-0">
            <div><strong>${lblProtocolLocked}</strong></div>
            ${isPendingAtDestination ? `<div>${lblWaitAccept}</div>` : ''}
        </div>`
        : '';
    return `
    <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
        <div>
            <h5 class="fw-bold mb-0">${t.detail_title}</h5>
            <span class="small text-muted">ID: <strong>${r.idformA}</strong> | Investigador: ${r.Investigador}</span>
            ${derivBox}
            ${derivInfoPanel}
        </div>
        <button class="btn-close" data-bs-dismiss="modal"></button>
    </div>`;
}

/**
 * MÓDULO DE CONTACTO - AHORA CON DEPARTAMENTO
 */
function renderResearcherContact(r) {
    const t = window.txt.reactivos.modal;
    const tc = window.txt?.comunicacion || {};
    const idInv = parseInt(r.IdInvestigador, 10) || 0;
    const btnMsg = idInv > 0
        ? `<div class="col-12 mt-2">
            <button type="button" class="btn btn-outline-secondary btn-sm fw-bold shadow-sm" onclick="window.composeMensajeReactivoInvestigador(${idInv}, ${parseInt(r.idformA, 10) || 0})">
                <i class="bi bi-chat-dots me-1"></i>${tc.btn_msg_investigador || ''}
            </button>
        </div>`
        : '';
    return `
    <div class="row g-2 mb-3 small border-bottom pb-3 text-center">
        <div class="col-md-4 text-truncate"><strong>${t.email}:</strong> ${r.EmailInvestigador || '---'}</div>
        <div class="col-md-4"><strong>${t.phone}:</strong> ${r.CelularInvestigador || '---'}</div>
        <div class="col-md-4 text-truncate"><strong>${t.dept}:</strong> <span class="text-primary fw-bold">${r.Departamento || '---'}</span></div>
        ${btnMsg}
    </div>`;
}

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
    return `<div class="alert alert-warning py-2 px-3 mb-2 small"><strong><i class="bi bi-exclamation-triangle me-1"></i>${msg}</strong><div class="mt-1">${desc} ${faltantesTxt ? `(${faltantesTxt})` : ''}</div></div>`;
}
function renderAdminSection(r, identity, disableEstado = false) {
    const t = window.txt.reactivos;
    const estado = (r.estado || "Sin estado").trim();
    const disAttr = disableEstado ? ' disabled title="' + (window.txt?.misformularios?.derivacion_actualizar_primero || 'Actualice el formulario antes de cambiar el estado') + '"' : '';
    return `
    <div class="bg-light p-3 rounded border shadow-sm mb-3">
        <div class="row g-3">
            <div class="col-md-6">
                <label class="form-label small fw-bold text-muted uppercase">${t.modal.order_status}</label>
                <div class="d-flex align-items-center gap-2">
                    <select id="modal-status" class="form-select form-select-sm fw-bold" onchange="window.updateReactivoStatusQuick()"${disAttr}>
                        <option value="Sin estado" ${estado === 'Sin estado' ? 'selected' : ''}>${t.status.none}</option>
                        <option value="Proceso" ${estado === 'Proceso' ? 'selected' : ''}>${t.status.process}</option>
                        <option value="Listo para entrega" ${estado === 'Listo para entrega' ? 'selected' : ''}>${t.status.ready}</option>
                        <option value="Entregado" ${estado === 'Entregado' ? 'selected' : ''}>${t.status.delivered}</option>
                        <option value="Suspendido" ${estado === 'Suspendido' ? 'selected' : ''}>${t.status.suspended}</option>
                        <option value="Reservado" ${estado === 'Reservado' ? 'selected' : ''}>${t.status.reserved}</option>
                    </select>
                    <div id="modal-status-badge-container">${getStatusBadge(estado, (Number(r.DerivadoActivo || 0) === 1 && (r.InstitucionActualNombre || '').trim()) ? r.InstitucionActualNombre.trim() : undefined)}</div>
                </div>
            </div>
            <div class="col-md-6">
                <label class="form-label small fw-bold text-muted uppercase">${t.modal.reviewed_by}</label>
                <input type="text" id="modal-quienvisto" class="form-control form-control-sm bg-light fw-bold text-primary" value="${r.quienvisto || identity}" readonly>
            </div>
            <div class="col-12">
                <label class="form-label small fw-bold text-muted uppercase">${t.modal.admin_notes}</label>
                <textarea id="modal-aclaracionadm" class="form-control form-control-sm" rows="2" onblur="window.updateReactivoStatusQuick()">${r.aclaracionadm || ''}</textarea>
            </div>
        </div>
    </div>`;
}
/**
 * Renderiza la sección usando el estado guardado en la notificación
 */
function renderNotificationSection(lastNotify, idformA) {
    const t = window.txt.reactivos.modal;
    const hasData = lastNotify && lastNotify.NotaNotificacion;
    const badgeHtml = hasData ? getStatusBadge(lastNotify.estado) : '';

    return `
    <div class="alert alert-success border-success mb-3 p-3 shadow-sm">
        <div class="d-flex justify-content-between align-items-center">
            <div style="max-width: 80%;">
                <p class="mb-1 fw-bold small uppercase"><i class="bi bi-envelope-check me-1"></i> ${t.last_notify}:</p>
                <div class="mb-0 small" style="font-size: 11px;">
                    ${hasData ? `
                        <span class="text-muted fw-bold">${lastNotify.fecha}:</span> 
                        <span class="text-dark">${lastNotify.NotaNotificacion}</span>
                        <div class="mt-1"><span class="small text-muted me-1">${t.notified_status}:</span> ${badgeHtml}</div>
                    ` : `<span class="text-muted italic">${t.not_notified}</span>`}
                </div>
            </div>
            <button class="btn btn-sm btn-success fw-bold px-3 shadow-sm" onclick="window.openNotifyPopupReactivo(${idformA})">${t.notify_btn}</button>
        </div>
    </div>`;
}
function renderOrderModificationSection(r, usage, cache) {
    const t = window.txt.reactivos.modal;
    const currentInst = Number(localStorage.getItem('instId') || sessionStorage.getItem('instId') || 0);
    const isDerivedActive = Number(r.DerivadoActivo || 0) === 1 && Number(r.IdFormularioDerivacionActiva || 0) > 0;
    const isOriginInst = Number(r.IdInstitucionOrigen || 0) === currentInst && currentInst > 0;
    const wf = (r.EstadoWorkflow || '').toString().toUpperCase();
    const lockProtocol = isDerivedActive && !isOriginInst;
    const lockSaveBtn = isDerivedActive && (isOriginInst || (!isOriginInst && wf.includes('PENDIENTE')));
    const lockImmutable = isDerivedActive && !isOriginInst;
    const canEditTipo = isDerivedActive && !isOriginInst && !wf.includes('PENDIENTE');
    const protocolos = cache.protocols || cache.protocolos || [];
    const reactivos = cache.insumos || [];
    const tipos = Array.isArray(cache.types) ? cache.types : [];
    const deptos = Array.isArray(cache.deptos) ? cache.deptos : [];
    const labelInt = window.txt?.config_departamentos?.badge_interno || 'INTERNO';
    const labelExt = window.txt?.config_departamentos?.badge_externo || 'EXTERNO';
    const sinOrg = window.txt?.generales?.sin_organizacion || '– (sin organización)';
    const idDepto = r.idDepto != null ? r.idDepto : '';
    const orgActual = (r.Organizacion && String(r.Organizacion).trim()) ? r.Organizacion : sinOrg;
    const extFlag = Number(r.DeptoExternoFlag || 1);
    const ambitoBadge = extFlag === 2 ? `<span class="badge bg-danger text-white" style="font-size:9px;">${labelExt}</span>` : `<span class="badge bg-success text-white" style="font-size:9px;">${labelInt}</span>`;
    const optionsDepto = deptos.map(d => {
        const ext = (d.externodepto == 2) || (d.externodepto == null && d.externoorganismo == 2) ? 2 : 1;
        const org = (d.NombreOrganismoSimple && String(d.NombreOrganismoSimple).trim()) ? d.NombreOrganismoSimple : sinOrg;
        const sel = (d.iddeptoA == idDepto) ? ' selected' : '';
        return `<option value="${d.iddeptoA}" data-org="${(org || '').replace(/"/g, '&quot;')}" data-externo="${ext}"${sel}>${d.NombreDeptoA || ''}</option>`;
    }).join('');

    // Valores para inyectar en el formato (tipo cantidad)
    const unidadMedida = r.Medida ? r.Medida : 'unidades';
    const presentacionInicial = r.Presentacion || 0;
    
    const optionsReactivos = reactivos.map(i => {
        const iterId = i.idInsumo || i.IdInsumoexp; 
        const isSelected = (iterId == r.idinsumoA) ? 'selected' : '';
        const pres = i.CantidadInsumo ? ` [${i.CantidadInsumo} ${i.TipoInsumo}]` : '';
        
        return `<option value="${iterId}" data-medida="${i.TipoInsumo || 'un.'}" data-presentacion="${i.CantidadInsumo || 0}" ${isSelected}>${i.NombreInsumo}${pres}</option>`;
    }).join('');
    const optionsTipos = tipos.map(tp => {
        const sel = Number(r.tipoAId || 0) === Number(tp.IdTipoFormulario) ? ' selected' : '';
        return `<option value="${tp.IdTipoFormulario}"${sel}>${tp.nombreTipo || ''}</option>`;
    }).join('');

    return `
    <h6 class="fw-bold text-success uppercase mb-3" style="font-size: 13px;">${t.tech_mod}</h6>

    <form id="form-reactivo-full" class="bg-white p-3 border rounded shadow-sm">
        <input type="hidden" name="idformA" value="${r.idformA}">
        <div class="row g-3">
            <div class="col-md-12">
                <label class="form-label small fw-bold uppercase text-muted mb-1">Tipo de Pedido</label>
                <select name="tipoA" class="form-select form-select-sm" ${canEditTipo ? '' : 'disabled'}>
                    ${optionsTipos}
                </select>
                ${canEditTipo ? '' : `<input type="hidden" name="tipoA" value="${r.tipoAId || ''}">`}
            </div>
            <div class="col-md-12">
                <label class="form-label small fw-bold uppercase text-muted mb-1">${t.protocol_label}</label>
                <input type="text" class="form-control form-control-sm mb-1 bg-light border-0" placeholder="${t.filter_placeholder}" onkeyup="window.filterProtocolListReactivo(this)">
                <select id="select-protocol-modal" name="idprotA" class="form-select form-select-sm" ${lockProtocol ? 'disabled' : ''}>
                    <option value="">${t.select_proto}</option>
                    ${protocolos.map(p => {
                        const isSelected = (p.idprotA == r.idprotA) ? 'selected' : '';
                        return `<option value="${p.idprotA}" ${isSelected}>${p.nprotA} - ${p.tituloA}</option>`;
                    }).join('')}
                </select>
                ${lockProtocol ? `<input type="hidden" name="idprotA" value="${r.idprotA || ''}">` : ''}
            </div>
            <div class="col-md-12">
                <label class="form-label small fw-bold uppercase text-muted mb-1">${window.txt?.admin_insumos?.col_departamento ?? 'Departamento'}</label>
                <select name="depto" id="modal-depto-reactivo" class="form-select form-select-sm fw-bold">
                    <option value="">— ${window.txt?.usuarios?.ficha_sin_departamento ?? 'Sin departamento'} —</option>
                    ${optionsDepto}
                </select>
            </div>
            <div class="col-md-6">
                <label class="form-label small fw-bold uppercase text-muted mb-1">${window.txt?.admin_insumos?.col_organizacion ?? 'Organización'}</label>
                <div id="modal-org-reactivo" class="form-control-plaintext form-control-sm bg-light border rounded px-2 py-1 small">${orgActual}</div>
            </div>
            <div class="col-md-6">
                <label class="form-label small fw-bold uppercase text-muted mb-1">${window.txt?.admin_insumos?.col_ambito ?? 'Ámbito'}</label>
                <div id="modal-ambito-reactivo" class="pt-1">${ambitoBadge}</div>
            </div>
            
            <div class="col-md-6">
                <label class="form-label small fw-bold text-primary uppercase">${t.insumo_exp_label || 'INSUMO EXPERIMENTAL'}</label>
                <select name="reactivo" class="form-select form-select-sm" onchange="window.cambiarMedidaReactivo(this)">
                    <option value="" data-medida="un." data-presentacion="0">${t.select_insumo || 'Seleccione Insumo'}</option>
                    ${optionsReactivos}
                </select>
            </div>
            
            <div class="col-md-3">
                <label id="lbl-medida-dinamica" class="form-label small fw-bold uppercase">(${unidadMedida} ${presentacionInicial}) - ${t.qty_req}</label>
                <input type="number" step="any" name="organo" class="form-control form-control-sm fw-bold text-primary" value="${r.CantidadReactivo || usage.organo || 0}" ${lockImmutable ? 'readonly' : ''}>
            </div>
            
            <div class="col-md-3">
                <label class="form-label small fw-bold uppercase">${t.animals_used}</label>
                <input type="number" name="totalA" class="form-control form-control-sm fw-bold text-danger" value="${usage.totalA || 0}" ${lockImmutable ? 'readonly' : ''}>
            </div>
            
            <div class="col-md-6">
                <label class="form-label small fw-bold uppercase text-muted mb-1">${t.start_date}</label>
                <input type="date" name="fechainicioA" class="form-control form-control-sm" value="${r.Inicio || ''}" ${lockImmutable ? 'readonly' : ''}>
            </div>
            
            <div class="col-md-6">
                <label class="form-label small fw-bold uppercase text-muted mb-1">${t.end_date}</label>
                <input type="date" name="fecRetiroA" class="form-control form-control-sm" value="${r.Retiro || ''}" ${lockImmutable ? 'readonly' : ''}>
            </div>
            
            <div class="mt-4 d-flex justify-content-end gap-2 border-top pt-3 w-100">
                <button type="button" class="btn btn-outline-danger btn-sm px-4 fw-bold shadow-sm" onclick="window.downloadReactivoPDF(${r.idformA})"><i class="bi bi-file-pdf"></i> PDF</button>
                <button type="submit" class="btn btn-success btn-sm px-5 fw-bold shadow-sm" style="background-color: #1a5d3b;" ${lockSaveBtn ? 'disabled title="' + (window.txt?.misformularios?.derivacion_guardar_bloqueado || 'No se puede guardar: el formulario está en derivación.') + '"' : ''}>${t.save_btn}</button>
            </div>
        </div>
    </form>`;
}

window.filterProtocolListReactivo = (input) => {
    const term = (input && input.value) ? input.value.toLowerCase() : '';
    const select = document.getElementById('select-protocol-modal');
    if (select) Array.from(select.options).forEach(opt => opt.style.display = opt.text.toLowerCase().includes(term) ? '' : 'none');
};

window.updateDeptoOrgAmbito = window.updateDeptoOrgAmbito || function(selectEl, idOrg, idAmbito) {
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

window.cambiarMedidaReactivo = (selectElement) => {
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const medida = selectedOption.getAttribute('data-medida') || 'unidades';
    const presentacion = selectedOption.getAttribute('data-presentacion') || '0';
    
    const label = document.getElementById('lbl-medida-dinamica');
    if (label) {
        const t = window.txt?.reactivos?.modal;
        label.innerText = `(${medida} ${presentacion}) - ${t?.cant_solicitada || t?.qty_req || 'CANT. SOLICITADA'}`;
    }
};

// 🚀 FIX LÓGICA DE TIEMPO REAL: Actualiza "Quien Visto" al toque sin Nulls
window.updateReactivoStatusQuick = async () => {
    const id = document.getElementById('current-idformA').value;
    const row = allReactivos.find(x => Number(x.idformA) === Number(id));
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
    const statusSelect = document.getElementById('modal-status');
    const badgeContainer = document.getElementById('modal-status-badge-container');
    const aclara = document.getElementById('modal-aclaracionadm').value;
    
    // 🚀 FIX NULL: Extracción segura de datos
    const userName = Auth.getVal('userFull') || Auth.getVal('userName') || "Admin";
    const userId = Auth.getVal('userId') || "0";
    const identity = `${userName} (ID: ${userId})`;
    
        const isSinEstado = statusSelect.value.trim().toLowerCase() === 'sin estado';
    const quienVistoTarget = isSinEstado ? 'Falta revisar' : identity;

    const fd = new FormData();
    fd.append('idformA', id);
    fd.append('estado', statusSelect.value);
    fd.append('aclaracionadm', aclara);
    fd.append('quienvisto', quienVistoTarget); 

    try {
        const res = await API.request(`/reactivos/update-status`, 'POST', fd);
        if (res.status === 'success') {
            const porInst = (row && Number(row.DerivadoActivo || 0) === 1 && (row.InstitucionActualNombre || '').trim()) ? row.InstitucionActualNombre.trim() : undefined;
            if (badgeContainer) badgeContainer.innerHTML = getStatusBadge(statusSelect.value, porInst);
            
            const inputQuienVisto = document.getElementById('modal-quienvisto');
            if (inputQuienVisto) inputQuienVisto.value = (res.quienvisto != null && res.quienvisto !== '') ? res.quienvisto : quienVistoTarget;
            
            syncAllData(); 
        } else {
            const title = window.txt?.misformularios?.derivacion_actualizar_formulario || 'Actualizar formulario para la aplicación';
            window.Swal.fire(title, res.message || 'No se pudo cambiar el estado.', 'warning');
        }
    } catch (e) { 
        console.error("❌ Error 500 en servidor al actualizar estado");
        const title = window.txt?.misformularios?.derivacion_actualizar_formulario || 'Actualizar formulario para la aplicación';
        window.Swal.fire(title, e?.message || 'No se pudo cambiar el estado.', 'error');
    }
};

/**
 * REPARACIÓN DEL FILTRADO DE PROTOCOLOS
 */
/**
 * FILTRADO DE PROTOCOLOS EN TIEMPO REAL
 */
window.filterProtocolList = (input) => {
    const term = input.value.toLowerCase().trim();
    const select = document.getElementById('select-protocol-modal');
    if (!select) return;

    const options = Array.from(select.options);
    
    options.forEach(opt => {
        // No filtramos la opción vacía (placeholder)
        if (opt.value === "") return;

        const text = opt.text.toLowerCase();
        // Si el término está en el texto (N°, Título o ID), se muestra
        if (text.includes(term)) {
            opt.style.display = "";
            opt.disabled = false;
        } else {
            opt.style.display = "none";
            opt.disabled = true;
        }
    });

    // Si la opción seleccionada actualmente quedó oculta, reseteamos el select al primer visible
    if (select.selectedOptions[0] && select.selectedOptions[0].style.display === "none") {
        select.value = "";
    }
};
window.saveFullReactivoForm = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const instId = localStorage.getItem('instId');
    const id = fd.get('idformA');
    const row = allReactivos.find(x => Number(x.idformA) === Number(id));
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
        const res = await API.request(`/reactivos/update-full?inst=${instId}`, 'POST', fd);
    if (res.status === 'success') {
        const t = window.txt.reactivos.alerts;
        window.Swal.fire({ 
            title: t.tech_update_title, 
            text: t.tech_update_msg, 
            icon: 'success', 
            confirmButtonColor: '#1a5d3b' 
        }).then(() => { location.reload(); });
    }
    } catch (err) { console.error("❌ Error actualización técnica:", err); }
};

window.resolveDerivacionReactivo = async (action, idDerivacion, idformA) => {
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
        const res = await API.request(endpoint, 'POST', { idDerivacion, mensaje, instId: Number(instActiva || 0) });
        if (res.status === 'success') {
            window.Swal.fire('OK', tx.derivar_ok || 'Acción aplicada.', 'success');
            await syncAllData();
            const r = allReactivos.find(x => Number(x.idformA) === Number(idformA));
            if (r) window.openReactivoModal(r);
        } else {
            window.Swal.fire('Error', res.message || 'No se pudo procesar.', 'error');
        }
    } catch (e) {
        window.Swal.fire('Error', 'No se pudo procesar la derivación.', 'error');
    }
};

window.deriveFromAdminReactivo = async (idformA) => {
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
            const r = allReactivos.find(x => Number(x.idformA) === Number(idformA));
            if (r) window.openReactivoModal(r);
        } else {
            window.Swal.fire('Error', res.message || 'No se pudo derivar.', 'error');
        }
    } catch (e) {
        window.Swal.fire('Error', tx.historial_derivacion_error || 'No se pudo procesar la derivación.', 'error');
    }
};

window.showDerivHistoryReactivo = async (idformA) => {
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
 * GENERACIÓN DE PDF - REACTIVOS
 * Captura datos por 'name' y recupera la especie del estado global.
 */
window.downloadReactivoPDF = async (id) => {
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    
    // 1. Buscamos los datos originales del reactivo para obtener la Especie
    const rData = allReactivos.find(item => item.idformA == id);
    const especie = rData ? (rData.Especie || '---') : '---';

    // 2. Capturadores inteligentes por nombre de atributo
    const getVal = (name) => document.querySelector(`[name="${name}"]`)?.value || '---';
    
    // Captura el texto del select usando el atributo 'name' ya que no tiene ID
    const getSelTextByName = (name) => {
        const s = document.querySelector(`select[name="${name}"]`);
        if (!s || s.selectedIndex === -1) return '---';
        return s.options[s.selectedIndex].text;
    };

    // Datos del modal abierto
    const invHeader = document.querySelector('#modal-content-reactivo h5 + span')?.innerText || '---';
    const contactoInfo = document.querySelector('#modal-content-reactivo .row.g-2.mb-3')?.innerText || '---';
    const estadoActual = document.getElementById('modal-status')?.options[document.getElementById('modal-status').selectedIndex]?.text || '---';
    
    // Captura técnica corregida
    const reactivoNombre = getSelTextByName('idinsumoA'); // Usa el name del renderOrderModificationSection
    const nProtocolo = getSelTextByName('idprotA');

    const pdfTemplate = `
        <div style="font-family: Arial, sans-serif; color: #333; padding: 15px;">
            <div style="text-align: center; border-bottom: 2px solid #1a5d3b; padding-bottom: 10px; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #1a5d3b;">GROBO - ${inst}</h2>
                <h4 style="margin: 5px 0;">FICHA DE PEDIDO: REACTIVO BIOLÓGICO</h4>
                <p style="margin: 0; font-size: 11px; color: #666;">ID Solicitud: ${id} | Generado: ${new Date().toLocaleString()}</p>
            </div>

            <div style="margin-bottom: 20px;">
                <p style="margin: 5px 0;"><strong>Investigador:</strong> ${invHeader}</p>
                <p style="margin: 5px 0; font-size: 11px; color: #555;">${contactoInfo}</p>
                <p style="margin: 15px 0; font-size: 14px;"><strong>ESTADO DEL PEDIDO:</strong> <span style="color: #1a5d3b; font-weight: bold;">${estadoActual}</span></p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; width: 50%;"><strong>Protocolo Asociado:</strong><br>${nProtocolo}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Especie:</strong><br>${especie}</td>
                </tr>
                <tr>
                    <td colspan="2" style="padding: 10px; border: 1px solid #ddd;"><strong>Reactivo:</strong><br>${reactivoNombre}</td>
                </tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px;">
                <tr style="background-color: #f2f2f2;">
                    <th style="padding: 10px; border: 1px solid #ddd;">Cantidad Solicitada</th>
                    <th style="padding: 10px; border: 1px solid #ddd; background-color: #e9f5ee;">Animales Utilizados</th>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;">${getVal('organo')}</td>
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${getVal('totalA')}</td>
                </tr>
            </table>

            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <div style="flex: 1; border: 1px solid #ddd; padding: 10px;"><strong>Fecha Inicio:</strong><br>${getVal('fechainicioA')}</div>
                <div style="flex: 1; border: 1px solid #ddd; padding: 10px;"><strong>Fecha Retiro:</strong><br>${getVal('fecRetiroA')}</div>
            </div>

            <div style="border-top: 2px solid #eee; padding-top: 15px; background: #fcfcfc; padding: 10px;">
                <p style="font-size: 12px; font-weight: bold; color: #1a5d3b; margin-bottom: 5px;">ÚLTIMA OBSERVACIÓN REGISTRADA:</p>
                <p style="font-size: 11px; font-style: italic; color: #444;">
                    ${document.querySelector('.alert-success div.small')?.innerText || 'Sin observaciones.'}
                </p>
            </div>
            

        </div>
    `;

    const opt = { 
        margin: [18, 18, 18, 18], 
        filename: `Pedido_Reactivo_${id}.pdf`, 
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        html2canvas: { scale: 2 } 
    };
    html2pdf().set(opt).from(pdfTemplate).save();
};
/**
 * AUXILIARES (TABLA)
 */
async function syncAllData() {
    const instId = localStorage.getItem('instId');
    const res = await API.request(`/reactivos/all?inst=${instId}`);
    if (res && res.status === 'success') {
        allReactivos = res.data;
        setupOriginInstitutionFilterReactivo();
        renderTable(); 
        refreshMenuNotifications(); 
    }
}

function renderTable() {
    const tbody = document.getElementById('table-body-reactivos');
    const data = getFilteredAndSortedData(); 
    const pageData = data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    const t = window.txt.reactivos; // Alias corto

    tbody.innerHTML = '';
    pageData.forEach(r => {
        const tr = document.createElement('tr');
        tr.className = "clickable-row";
        tr.onclick = () => window.openReactivoModal(r);

        const txtMedida = r.Medida || 'un.';
        const txtPresentacion = r.Presentacion || 0;
        const txtPedida = r.CantidadReactivo || 0;
        const extFlag = Number(r.DeptoExternoFlag || 1);
        const isExt = extFlag === 2;
        const labelInt = window.txt?.config_departamentos?.badge_interno || 'INTERNO';
        const labelExt = window.txt?.config_departamentos?.badge_externo || 'EXTERNO';
        const ambitoBadge = isExt ? `<span class="badge bg-danger text-white" style="font-size:8px;">${labelExt}</span>` : `<span class="badge bg-success text-white" style="font-size:8px;">${labelInt}</span>`;
        const tipoBadgeStyle = getTipoFormBadgeStyle(r.colorTipo);
        const tipoBadgeHtml = `<span class="${tipoBadgeStyle.className}" style="${tipoBadgeStyle.style} font-size: 9px; padding: 3px 6px;">${(r.TipoNombre || 'Reactivo').replace(/</g, '&lt;')}</span>`;

        tr.innerHTML = `
            <td class="py-2 px-2 text-muted small">${r.idformA}</td>
            <td class="py-2 px-2 text-center">${tipoBadgeHtml}</td>
            <td class="py-2 px-2 small fw-bold">${r.Investigador}</td>
            <td class="py-2 px-2 small fw-bold text-success">${r.NProtocolo || '---'}</td>
            <td class="py-2 px-2 text-center">${ambitoBadge}</td>
            <td class="py-2 px-2 small text-uppercase text-muted" style="font-size: 10px;">
                ${r.Especie || `<span class="opacity-50 italic">${t.table.no_species}</span>`}
            </td>
            <td class="py-2 px-2 text-center small fw-bold text-muted">${r.AnimalesUsados || 0}</td>
            <td class="py-2 px-2 small fw-bold text-dark">${r.Reactivo || t.table.not_assigned}</td> 
            
            <td class="py-2 px-2 text-center">
                <span class="text-muted fw-bold" style="font-size: 10px;">(${txtMedida} ${txtPresentacion}) - </span>
                <span class="fw-bold text-primary" style="font-size: 11px;">${txtPedida}</span>
            </td>
            
            <td class="py-2 px-2 small text-muted">${r.Inicio || '---'}</td>
            <td class="py-2 px-2 small text-muted">${r.Retiro || '---'}</td>
            <td class="py-2 px-2 small text-truncate" style="max-width: 120px;" title="${r.Aclaracion || ''}">
                ${r.Aclaracion || '---'}
            </td>
            <td class="py-2 px-2 text-center">${getStatusWithWorkflow(r)}</td>
        `;
        tbody.appendChild(tr);
    });

    updateHeaderIcons();
    renderPagination(data.length, 'pagination-reactivo', renderTable);
    hideLoader();
}
// ... (getStatusBadge, setupSortHeaders, getFilteredAndSortedData, updateHeaderIcons se mantienen iguales al patrón de animales)

function getStatusBadge(estado, porInstitucion) {
    const tx = window.txt?.misformularios || {};
    const e = (estado || "Sin estado").toString().toLowerCase().trim();
    const states = {
        'entregado': { label: 'Entregado', class: 'bg-success text-white' },
        'proceso': { label: 'Proceso', class: 'bg-primary text-white' },
        'listo para entrega': { label: 'Listo para entrega', class: 'bg-warning text-dark' },
        'suspendido': { label: 'Suspendido', class: 'bg-danger text-white' },
        'reservado': { label: 'Reservado', class: 'bg-info text-dark' },
        'sin estado': { label: 'Sin estado', class: 'bg-secondary text-white' }
    };
    const s = states[e] || states['sin estado'];
    const lbl = porInstitucion ? `${s.label} ${tx.estado_por || 'por'} ${porInstitucion}` : s.label;
    return `<span class="badge ${s.class} shadow-sm mt-1" style="font-size: 8px; font-weight: 700; padding: 4px 8px; min-width: 90px; display: inline-block;">${lbl}</span>`;
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

function getFilteredAndSortedData() {
    const statusFilter = document.getElementById('filter-status-reactivo').value.toLowerCase();
    const term = document.getElementById('search-input-reactivo').value.toLowerCase().trim();
    const filterType = document.getElementById('filter-column-reactivo').value;
    const derivFilter = document.getElementById('filter-deriv-reactivo')?.value || 'all';
    const retiroEl = document.getElementById('filter-retiro-reactivo');
    const retiroVal = retiroEl ? (retiroEl.value || '').trim() : '';

    let data = allReactivos.filter(r => {
        const isDerived = Number(r.DerivadoActivo || 0) === 1;
        let eff = r.estado;
        if (isDerived && (r.estado_origen != null || r.estado_destino != null)) {
            if (r.estado_destino != null && String(r.estado_destino).trim() !== '') eff = r.estado_destino;
            else if (r.estado_origen != null && String(r.estado_origen).trim() !== '') eff = r.estado_origen;
        }
        const estadoFila = (eff || 'sin estado').toString().toLowerCase().trim();
        if (statusFilter !== 'all' && estadoFila !== statusFilter) return false;
        if (derivFilter === 'derived' && !isDerived) return false;
        if (derivFilter === 'local' && isDerived) return false;
        const originName = (r.InstitucionOrigenNombre || '').trim();
        if (String(filterType).startsWith('origin::')) {
            const originSelected = String(filterType).slice('origin::'.length);
            if (originName !== originSelected) return false;
        }
        if (retiroVal) {
            const rRetiro = (r.Retiro || '').toString().substring(0, 10);
            if (rRetiro !== retiroVal) return false;
        }
        if (!term) return true;
        if (filterType === 'all' || String(filterType).startsWith('origin::')) return JSON.stringify(r).toLowerCase().includes(term);
        return String(r[filterType] || '').toLowerCase().includes(term);
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

function updateHeaderIcons() {
    document.querySelectorAll('th[data-sortable="true"]').forEach(th => {
        const key = th.getAttribute('data-key');
        const icon = sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' ▲' : (sortConfig.direction === 'desc' ? ' ▼' : ' -')) : ' -';
        th.innerHTML = `${th.getAttribute('data-label')}${icon}`;
    });
}

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
function renderPagination(t, c, r) {
    const pag = document.getElementById(c); const total = Math.ceil(t / rowsPerPage);
    if (!pag) return;
    pag.innerHTML = ''; if (total <= 1) return;
    const btn = (l, p, d, a = false) => {
        const li = document.createElement('li'); li.className = `page-item ${d ? 'disabled' : ''} ${a ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${l}</a>`;
        if (!d) li.onclick = (e) => { e.preventDefault(); currentPage = p; r(); }; return li;
    };
    pag.appendChild(btn('Anterior', currentPage - 1, currentPage === 1));
    for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || (i >= currentPage - 2 && i <= currentPage + 2)) {
            pag.appendChild(btn(i, i, false, i === currentPage));
        }
    }
    pag.appendChild(btn('Siguiente', currentPage + 1, currentPage === total));
}

/**
 * FUNCIÓN AUXILIAR PARA CAMBIAR DE PÁGINA
 */
window.changePage = (page) => {
    currentPage = page;
    renderTable(); // Re-renderiza la tabla con el nuevo índice
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Sube al inicio de la tabla
};
/**
 * 2. POPUP DE NOTIFICACIÓN (Con blindaje de foco y validación)
 */
window.openNotifyPopupReactivo = async (idformA) => {
    const t = window.txt?.reactivos?.alerts;
    if (!idformA || idformA === 'undefined') {
        console.error("ID no válido recibido:", idformA);
        return window.Swal.fire('Error', t?.notify_error_id || 'ID de formulario no válido o vacío', 'error');
    }

    const modalEl = document.getElementById('modal-reactivo');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    const originalFocus = modalInstance._config.focus;
    modalInstance._config.focus = false;

    const { value: nota } = await window.Swal.fire({
        title: t?.notify_title || 'Enviar Notificación',
        input: 'textarea',
        inputLabel: t?.notify_label || 'Mensaje para el investigador',
        inputPlaceholder: t?.notify_placeholder || 'Escriba aquí la observación...',
        showCancelButton: true,
        confirmButtonText: t?.notify_confirm || 'Enviar Correo',
        confirmButtonColor: '#1a5d3b',
        didOpen: () => {
            const input = window.Swal.getInput();
            if (input) {
                input.focus();
                input.addEventListener('keydown', (e) => e.stopPropagation());
            }
        },
        willClose: () => { modalInstance._config.focus = originalFocus; }
    });

    if (nota) {
        window.Swal.fire({ title: t?.notify_sending || 'Enviando...', allowOutsideClick: false, didOpen: () => { window.Swal.showLoading(); }});

        try {
            const res = await API.request('/reactivos/send-notification', 'POST', { 
                idformA, 
                nota, 
                instId: localStorage.getItem('instId'), 
                adminId: localStorage.getItem('userId') 
            });
            
            if (res && res.status === 'success') {
                sessionStorage.setItem('reopenReactivoId', idformA);
                window.Swal.fire({ title: t?.notify_sent || '¡Enviado!', icon: 'success', timer: 1000, showConfirmButton: false })
                      .then(() => { location.reload(); });
            } else {
                window.Swal.fire('Error', res.message || (t?.notify_error_server || 'Fallo en el servidor'), 'error');
            }
        } catch (e) { 
            window.Swal.fire('Error', t?.notify_error_conn || 'Fallo de conexión', 'error');
        }
    }
};

/**
 * PROCESAR EXPORTACIÓN A EXCEL - REACTIVOS BIOLÓGICOS
 */
window.processExcelExportReactivos = () => {
    // 1. Captura de fechas y configuración inicial
    const start = document.getElementById('excel-start-date-reactivo').value;
    const end = document.getElementById('excel-end-date-reactivo').value;
    const nombreInst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();

    const t = window.txt.reactivos.alerts;
    if (!start || !end) {
        window.Swal.fire('Atención', t.excel_warn, 'warning');
        return;
    }

    // 2. Obtención de datos filtrados desde el estado global
    let data = getFilteredAndSortedData();

    // 3. Filtro por rango de fechas basado en la fecha de Inicio
    data = data.filter(r => {
        const fechaPedido = r.Inicio || '0000-00-00';
        return fechaPedido >= start && fechaPedido <= end;
    });

    if (data.length === 0) {
        window.Swal.fire('Sin resultados', t.no_results, 'info');
        return;
    }

    // 4. Encabezados Técnicos (Adaptados para Reactivos)
    const headers = [
        "ID", 
        "Investigador", 
        "Protocolo", 
        "Especie", 
        "Animales Usados", 
        "Reactivo", 
        "Cantidad", 
        "Medida", 
        "Inicio", 
        "Retiro", 
        "Estado"
    ];
    
    const csvRows = [headers.join(";")];

    // 5. Procesamiento de filas
    data.forEach(r => {
        const row = [
            r.idformA,
            r.Investigador,
            r.NProtocolo || '---',
            r.Especie || '---',
            r.AnimalesUsados || 0,
            r.Reactivo || 'No asignado',
            r.CantidadReactivo || 0,
            r.Medida || '',
            // TRUCO EXCEL: Forzar formato texto para fechas
            `="${r.Inicio || '---'}"`, 
            `="${r.Retiro || '---'}"`,
            r.estado || 'Sin estado'
        ];
        
        // Limpiar el texto (quitar puntos y coma y saltos de línea)
        csvRows.push(row.map(v => String(v).replace(/;/g, ' ').replace(/\n/g, ' ')).join(";"));
    });

    // 6. Generación y descarga del archivo
    const csvContent = "\uFEFF" + csvRows.join("\r\n"); // BOM para caracteres especiales
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `GROBO_${nombreInst}_Reactivos_${start}_al_${end}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 7. Cerrar el modal de Excel
    const modalEl = document.getElementById('modal-excel-reactivo');
    if (modalEl) {
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
    }
};