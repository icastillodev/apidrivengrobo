import { API } from '../../api.js';
import { openMensajeriaCompose } from '../../utils/mensajeriaCompose.js';
import { hideLoader, showLoader } from '../../components/LoaderComponent.js';
import { getTipoFormBadgeStyle } from '../../utils/badgeTipoForm.js';
import { renderDerivacionTarifariosToolbar } from '../../utils/derivacionTarifariosUI.js';
import { refreshMenuNotifications } from '../../components/MenuComponent.js';
import { puedeEliminarFormularioAdminSede, runAdminFormularioDelete } from '../../utils/adminFormularioDelete.js';

let allInsumos = [];
let currentPage = 1;
const rowsPerPage = 15;
window.catalogoInsumos = []; // Global para acceso desde addItemRow
let openedInsumoFromUrl = false;

window.composeMensajeInsumoInvestigador = async (idInvestigador, idformA) => {
    const id = parseInt(idInvestigador, 10);
    const fid = parseInt(idformA, 10);
    const tc = window.txt?.comunicacion || {};
    if (!id || !fid) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'warning', text: tc.msg_err_sin_dest || '' });
        }
        return;
    }
    const ti = window.txt?.admin_insumos || {};
    const asunto = `${tc.msg_asunto || ''} · ${ti.titulo || 'Insumos'} #${fid}`;
    await openMensajeriaCompose({
        destinatarioId: id,
        origenTipo: 'formulario',
        origenId: fid,
        origenEtiqueta: `Insumos #${fid}`,
        asunto,
        lockCategory: true
    });
};

/**
 * 1. INICIALIZACIÓN
 */
export async function initInsumosPage() {
    const instId = localStorage.getItem('instId');
    

// Vinculación del Buscador (Se mantiene con botón o tecla Enter)
    const btnSearch = document.getElementById('btn-search-insumo');
    const inputSearch = document.getElementById('search-input-insumo');

    if(btnSearch) btnSearch.onclick = () => { currentPage = 1; renderTable(); };
    if(inputSearch) {
        inputSearch.onkeyup = (e) => { if(e.key === 'Enter') { currentPage = 1; renderTable(); } };
    }

    // FILTROS AUTOMÁTICOS: Se activan al cambiar la selección
    const filterStatus = document.getElementById('filter-status-insumo');
    const filterColumn = document.getElementById('filter-column-insumo');
    const filterDeriv = document.getElementById('filter-deriv-insumo');

    if(filterStatus) {
        filterStatus.onchange = () => { 
            currentPage = 1; 
            renderTable(); // Filtra automáticamente al tocar el estado
        };
    }

    if(filterColumn) {
        filterColumn.onchange = () => { 
            currentPage = 1; 
            renderTable(); // Opcional: También filtra automático al cambiar la columna
        };
    }
    if (filterDeriv) {
        filterDeriv.onchange = () => {
            currentPage = 1;
            renderTable();
        };
    }

    const filterRetiroInsumo = document.getElementById('filter-retiro-insumo');
    if (filterRetiroInsumo) filterRetiroInsumo.onchange = () => { currentPage = 1; renderTable(); };

    document.addEventListener('focusin', (e) => {
        if (e.target.closest(".swal2-container")) e.stopImmediatePropagation();
    }, true);

    try {
        showLoader();
        const res = await API.request(`/insumos/all?inst=${instId}`);
        if (res && res.status === 'success') {
            allInsumos = res.data;
            setupOriginInstitutionFilterInsumo();
            renderTable();
            openInsumoFromUrlIfNeeded();
        }
    } catch (error) { 
        console.error("Error cargando insumos:", error); 
        hideLoader();
    }



    // Vinculación de botones de la interfaz

    if(btnSearch) btnSearch.onclick = () => { currentPage = 1; renderTable(); };
    
    const btnAyuda = document.getElementById('btn-ayuda-insumo');
    if(btnAyuda) btnAyuda.onclick = () => new bootstrap.Modal(document.getElementById('modal-insumo-help')).show();
    
    const btnExcel = document.getElementById('btn-excel-insumo');
    if(btnExcel) btnExcel.onclick = () => new bootstrap.Modal(document.getElementById('modal-excel-insumo')).show();
}

function setupOriginInstitutionFilterInsumo() {
    const columnSelect = document.getElementById('filter-column-insumo');
    if (!columnSelect) return;
    const values = [...new Set(allInsumos.map(a => (a.InstitucionOrigenNombre || '').trim()).filter(Boolean))].sort();

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

function openInsumoFromUrlIfNeeded() {
    if (openedInsumoFromUrl) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const action = (params.get('action') || '').toLowerCase();
    if (!id || (action && action !== 'view' && action !== 'edit')) return;

    const insumo = allInsumos.find(i => String(i.idformA) === String(id));
    if (!insumo) return;
    openedInsumoFromUrl = true;
    setTimeout(() => window.openInsumoModal(insumo), 200);
}

async function syncAllInsumosData() {
    const instId = localStorage.getItem('instId');
    const res = await API.request(`/insumos/all?inst=${instId}`);
    if (res && res.status === 'success') {
        allInsumos = res.data;
        setupOriginInstitutionFilterInsumo();
        renderTable();
        refreshMenuNotifications();
    }
}

window.adminDeleteFormularioInsumo = async (idformA) => {
    await runAdminFormularioDelete({
        idformA,
        categoria: 'insumo',
        onSuccess: async () => {
            const el = document.getElementById('modal-insumo');
            const m = el && bootstrap.Modal.getInstance(el);
            if (m) m.hide();
            await syncAllInsumosData();
        }
    });
};

/**
 * 3. RENDERIZADO DE TABLA Y PAGINACIÓN
 */
function renderTable() {
    const tbody = document.getElementById('table-body-insumos');
    if (!tbody) return;

    const data = getFilteredAndSortedData(); 
    tbody.innerHTML = '';

    const start = (currentPage - 1) * rowsPerPage;
    data.slice(start, start + rowsPerPage).forEach(f => {
        const tr = document.createElement('tr');
        tr.className = "clickable-row";
        tr.onclick = () => window.openInsumoModal(f);
        const labelSinOrg = window.txt?.generales?.sin_organizacion || '– (sin organización)';
        const protLabel = (f.NProtocolo && f.TituloProtocolo)
            ? `#${f.NProtocolo} - ${f.TituloProtocolo}`
            : '---';

        tr.innerHTML = `
            <td class="py-2 px-2 text-muted small">#${f.idformA}</td>
            <td class="py-2 px-2 small fw-bold">${f.Investigador}</td>
            <td class="py-2 px-2 small text-primary fw-bold">${protLabel}</td>
            <td class="py-2 px-2 small text-primary fw-bold">${f.Departamento || '---'}</td>
            <td class="py-2 px-2 text-center">
                ${(() => {
                    const extFlag = Number(f.DeptoExternoFlag || 1);
                    const isExt = extFlag === 2;
                    const labelInt = window.txt?.config_departamentos?.badge_interno || 'INTERNO';
                    const labelExt = window.txt?.config_departamentos?.badge_externo || 'EXTERNO';
                    return isExt ? `<span class="badge bg-danger text-white" style="font-size:8px;">${labelExt}</span>` : `<span class="badge bg-success text-white" style="font-size:8px;">${labelInt}</span>`;
                })()}
            </td>
            <td class="py-2 px-2 text-center">
                ${(() => {
                    const badgeStyle = getTipoFormBadgeStyle(f.colorTipo);
                    return `<span class="${badgeStyle.className}" style="${badgeStyle.style} font-size: 9px; padding: 3px 6px;">${(f.TipoNombre || 'Insumo').replace(/</g, '&lt;')}</span>`;
                })()}
            </td>
            <td class="py-2 px-2" style="font-size: 13px;">${f.ResumenInsumos || '---'}</td>
            <td class="py-2 px-2 small">${f.Inicio || '---'}</td>
            <td class="py-2 px-2 small">${f.Retiro || '---'}</td>
            <td class="py-2 px-2 small text-muted text-truncate" style="max-width: 150px;">${f.aclaracionadm || '---'}</td>
            <td class="py-2 px-2 text-center">${getStatusWithWorkflow(f)}</td>
        `;
        tbody.appendChild(tr);
    });

    updateHeaderIcons(); // Actualiza flechas de orden
    renderPagination(data.length, 'pagination-insumo', renderTable); // Paginación reactiva
    hideLoader();
}
/**
 * 3. ORQUESTACIÓN DEL MODAL (CON TODAS LAS FUNCIONES DEFINIDAS)
 */
window.openInsumoModal = async (f) => {
    const instId = localStorage.getItem('instId');
    const container = document.getElementById('modal-content-insumo');

    const currentInst = Number(instId || sessionStorage.getItem('instId') || 0);
    const isOriginInst = Number(f.IdInstitucionOrigen || 0) === currentInst && currentInst > 0;
    const isDerivedDest = Number(f.DerivadoActivo || 0) === 1 && !isOriginInst;

    try {
        const [resItems, resFormData, resCat, resNotify, resProt, resDeptos, resConfig] = await Promise.all([
            API.request(`/insumos/details?id=${f.idPrecioinsumosformulario}`),
            API.request(`/insumos/form-data?inst=${instId}`),
            API.request(`/insumos/catalog?inst=${instId}`),
            API.request(`/reactivos/last-notification?id=${f.idformA}`),
            API.request(`/billing/list-active-protocols`),
            API.request(`/deptos/list`),
            isDerivedDest ? API.request(`/forms/derivation/config?idformA=${f.idformA}&categoria=Insumos`) : Promise.resolve(null)
        ]);

        const derivConfig = (resConfig && resConfig.status === 'success' && resConfig.data) ? resConfig.data : null;
        if (isDerivedDest) {
            try { await API.request('/forms/derivation/mark-viewed', 'POST', { idformA: f.idformA }); } catch (_) {}
        }

        window.catalogoInsumos = resCat.data || [];
        const items = resItems.data || [];
        
        // Usamos lista completa de deptos (org + externo) desde /deptos/list; si falla, usamos la de form-data
        let deptos = [];
        if (resDeptos && resDeptos.status === 'success' && Array.isArray(resDeptos.data)) deptos = resDeptos.data;
        else if (resFormData.data && resFormData.data.deptos) deptos = resFormData.data.deptos;
        window.__insumosTiposCache = (resFormData && resFormData.status === 'success' && Array.isArray(resFormData.data?.types))
            ? resFormData.data.types
            : [];
        const protocolos = (resProt && resProt.status === 'success' && Array.isArray(resProt.data)) ? resProt.data : [];
        
        const userFull = localStorage.getItem('userFull') || localStorage.getItem('userName') || 'Usuario';
        const userId = localStorage.getItem('userId') || '—';
        const identity = `${String(userFull).trim() || 'Usuario'} (ID: ${userId})`;

        let html = renderModalHeader(f);
        if (derivConfig?.enviadoPor && (derivConfig.enviadoPor.nombre || derivConfig.enviadoPor.institucion)) {
            html += renderEnviadoPor(derivConfig.enviadoPor);
        }
        html += renderDerivacionTarifariosToolbar(f);
        html += renderResearcherContact(f);
        const configIncompleta = derivConfig && !derivConfig.completa;
        html += (configIncompleta ? renderConfigFaltaBanner(derivConfig.faltantes) : '');
        html += renderAdminSection(f, identity, configIncompleta);
        html += renderNotificationSection(resNotify.data, f.idformA);
        
        // Pasamos f (que tiene f.depto / IdProtocolo) y los arrays deptos + protocolos
        html += renderOrderModificationSection(f, items, deptos, protocolos);

        container.innerHTML = html;
        const selDepto = document.getElementById('modal-depto-insumo');
        if (selDepto) selDepto.onchange = function() { window.updateDeptoOrgAmbito(this, 'modal-org-insumo', 'modal-ambito-insumo'); };
        document.getElementById('form-insumo-full').onsubmit = (e) => window.saveFullInsumoForm(e);

        // Buscador rápido de protocolo en el modal
        const protSearch = document.getElementById('insumo-prot-search');
        const protSelect = document.getElementById('insumo-prot-select');
        if (protSearch && protSelect) {
            protSearch.addEventListener('input', () => {
                const term = protSearch.value.toLowerCase().trim();
                Array.from(protSelect.options).forEach(opt => {
                    if (!opt.value) return; // dejar placeholder
                    const text = opt.textContent.toLowerCase();
                    opt.hidden = term && !text.includes(term);
                });
            });
        }
        
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-insumo')).show();
    } catch (e) { console.error("Error:", e); }
};

/* --- FUNCIONES DE APOYO (DEFINICIONES FALTANTES) --- */

function renderModalHeader(f) {
    const tx = window.txt?.misformularios || {};
    const currentInst = Number(localStorage.getItem('instId') || sessionStorage.getItem('instId') || 0);
    const isDerivedActive = Number(f.DerivadoActivo || 0) === 1 && Number(f.IdFormularioDerivacionActiva || 0) > 0;
    const isOriginInst = Number(f.IdInstitucionOrigen || 0) === currentInst && currentInst > 0;
    const wf = (f.EstadoWorkflow || '').toString().toUpperCase();
    const isPendingAtDestination = isDerivedActive && !isOriginInst && wf.includes('PENDIENTE');
    const originName = (f.InstitucionOrigenNombre || '').trim();
    const currentName = (f.InstitucionActualNombre || '').trim();
    const routeText = [originName, currentName].filter(Boolean).join(' → ');
    const protLabel = (f.NProtocolo && f.TituloProtocolo)
        ? `#${f.NProtocolo} - ${f.TituloProtocolo}`
        : null;
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
                ? `<button type="button" class="btn btn-sm btn-outline-danger" onclick="window.resolveDerivacionInsumo('cancel', ${f.IdFormularioDerivacionActiva}, ${f.idformA})">${lblRetirar}</button>`
                : isPendingAtDestination
                    ? `
            <button type="button" class="btn btn-sm btn-outline-success" onclick="window.resolveDerivacionInsumo('accept', ${f.IdFormularioDerivacionActiva}, ${f.idformA})">${lblAceptar}</button>
            <button type="button" class="btn btn-sm btn-outline-warning" onclick="window.resolveDerivacionInsumo('return', ${f.IdFormularioDerivacionActiva}, ${f.idformA})">${lblDevolver}</button>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="window.resolveDerivacionInsumo('reject', ${f.IdFormularioDerivacionActiva}, ${f.idformA})">${lblRechazar}</button>`
                    : ''
            }
            <button type="button" class="btn btn-sm btn-outline-dark" onclick="window.showDerivHistoryInsumo(${f.idformA})">${lblHistorial}</button>
        </div>`
        : `
        <div class="mt-2 d-flex flex-wrap gap-2 align-items-center">
            <button type="button" class="btn btn-sm btn-outline-primary" onclick="window.deriveFromAdminInsumo(${f.idformA})">${lblDerivar}</button>
            <button type="button" class="btn btn-sm btn-outline-dark" onclick="window.showDerivHistoryInsumo(${f.idformA})">${lblHistorial}</button>
        </div>`;
    const derivInfoPanel = isDerivedActive
        ? `<div class="alert alert-info mt-2 py-2 px-3 small mb-0">
            <div><strong>${lblProtocolLocked}</strong></div>
            ${isPendingAtDestination ? `<div>${lblWaitAccept}</div>` : ''}
        </div>`
        : '';
    const tDel = window.txt?.admin_formularios || {};
    const btnEliminar = puedeEliminarFormularioAdminSede()
        ? `<button type="button" class="btn btn-sm btn-outline-danger align-self-start me-1" title="${String(tDel.delete_btn_title || '').split('"').join('&quot;')}" onclick="window.adminDeleteFormularioInsumo(${f.idformA})"><i class="bi bi-trash"></i> ${tDel.delete_btn || 'Eliminar'}</button>`
        : '';

    return `<div class="p-4 border-bottom d-flex justify-content-between align-items-center bg-light">
        <div>
            <h5 class="fw-bold mb-0 text-success">Ficha de Pedido de Insumos</h5>
            <span class="small text-muted d-block">ID: <strong>#${f.idformA}</strong></span>
            ${protLabel ? `<span class="small text-muted d-block">Protocolo: <strong>${protLabel}</strong></span>` : ''}
            ${derivBox}
            ${derivInfoPanel}
        </div>
        <div class="d-flex align-items-center flex-shrink-0">
            ${btnEliminar}
            <button class="btn-close" data-bs-dismiss="modal"></button>
        </div>
    </div>`;
}

function renderResearcherContact(f) {
    const tc = window.txt?.comunicacion || {};
    const tInv = window.txt?.admin_insumos?.col_investigador || 'Investigador';
    const idInv = parseInt(f.IdInvestigador, 10) || 0;
    const fid = parseInt(f.idformA, 10) || 0;
    const btnMsg = idInv > 0
        ? `<div class="col-12 mt-2">
            <button type="button" class="btn btn-outline-secondary btn-sm fw-bold shadow-sm" onclick="window.composeMensajeInsumoInvestigador(${idInv}, ${fid})">
                <i class="bi bi-chat-dots me-1"></i>${tc.btn_msg_investigador || ''}
            </button>
        </div>`
        : '';
    return `<div class="row g-2 p-3 small border-bottom text-center bg-white shadow-sm">
        <div class="col-md-4"><strong>${tInv}:</strong><br>${f.Investigador}</div>
        <div class="col-md-4"><strong>Email:</strong><br>${f.EmailInvestigador || '---'}</div>
        <div class="col-md-4"><strong>Celular:</strong><br>${f.CelularInvestigador || '---'}</div>
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
function renderAdminSection(f, identity, disableEstado = false) {
    const t = window.txt?.admin_insumos?.modal || {};
    const lblRevisado = t.reviewed_by || "Revisado por";
    const revisadoVal = (f.quienvisto && String(f.quienvisto).trim()) ? f.quienvisto : (identity || "Falta revisar");
    const disAttr = disableEstado ? ' disabled title="' + (window.txt?.misformularios?.derivacion_actualizar_primero || 'Actualice el formulario antes de cambiar el estado') + '"' : '';
    return `
    <div class="p-4 bg-white border-bottom shadow-sm">
        <div class="row g-3">
            <div class="col-md-6 text-start">
                <label class="small fw-bold text-muted uppercase">Estado Pedido</label>
                <div class="d-flex align-items-center gap-2">
                    <select id="insumo-status" class="form-select form-select-sm fw-bold shadow-sm" onchange="window.updateInsumoStatusQuick(${f.idformA})"${disAttr}>
                        <option value="Sin estado" ${f.estado === 'Sin estado' ? 'selected' : ''}>Sin estado</option>
                        <option value="Proceso" ${f.estado === 'Proceso' ? 'selected' : ''}>Proceso</option>
                        <option value="Reservado" ${f.estado === 'Reservado' ? 'selected' : ''}>Reservado</option>
                        <option value="Listo para entrega" ${f.estado === 'Listo para entrega' ? 'selected' : ''}>Listo para entrega</option>
                        <option value="Entregado" ${f.estado === 'Entregado' ? 'selected' : ''}>Entregado</option>
                        <option value="Suspendido" ${f.estado === 'Suspendido' ? 'selected' : ''}>Suspendido</option>
                    </select>
                    <div id="insumo-status-badge-container">${getStatusBadge(f.estado, (Number(f.DerivadoActivo || 0) === 1 && (f.InstitucionActualNombre || '').trim()) ? f.InstitucionActualNombre.trim() : undefined)}</div>
                </div>
            </div>
            <div class="col-md-6 text-start">
                <label class="small fw-bold text-muted uppercase">${lblRevisado}</label>
                <input type="text" id="insumo-reviewer" class="form-control form-control-sm bg-light fw-bold text-primary" value="${revisadoVal}" readonly>
            </div>
            <div class="col-12 text-start">
                <label class="small fw-bold text-muted uppercase">Aclaración Administrativa (Auto-guardado)</label>
                <textarea id="insumo-admin-note" class="form-control form-control-sm" rows="2" onblur="window.updateInsumoStatusQuick(${f.idformA})">${f.aclaracionadm || ''}</textarea>
            </div>
        </div>
    </div>`;
}

function renderNotificationSection(lastNotify, idformA) {
    const hasData = lastNotify && lastNotify.NotaNotificacion;
    
    // Mapeo de estilos para el badge del historial
    const states = {
        'entregado': 'bg-success text-white',
        'proceso': 'bg-primary text-white',
        'listo para entrega': 'bg-warning text-dark',
        'suspendido': 'bg-danger text-white',
        'reservado': 'bg-info text-dark',
        'sin estado': 'bg-secondary text-white'
    };
    const e = (lastNotify?.estado || "sin estado").toLowerCase().trim();
    const badgeClass = states[e] || states['sin estado'];

    return `
    <div id="insumo-notify-container" class="p-4 bg-white border-bottom">
        <div class="alert alert-success border-success mb-0 p-3 shadow-sm d-flex justify-content-between align-items-center">
            <div style="max-width: 75%; text-align: left;">
                <p class="mb-1 fw-bold small uppercase text-success">
                    <i class="bi bi-envelope-check me-1"></i> ÚLTIMA NOTIFICACIÓN ENVIADA:
                </p>
                <div class="small text-dark" style="font-size: 11px; line-height: 1.5;">
                    ${hasData ? `
                        <b>Fecha:</b> ${lastNotify.fecha} <br>
                        <b>Estado al notificar:</b> <span class="badge ${badgeClass} ms-1" style="font-size: 8px; vertical-align: middle;">${lastNotify.estado}</span> <br>
                        <b>Mensaje:</b> ${lastNotify.NotaNotificacion}`
                    : 'No hay historial de comunicaciones para este pedido.'}
                </div>
            </div>
            <button type="button" class="btn btn-sm btn-success fw-bold px-3 shadow-sm" onclick="window.openNotifyPopupInsumo(${idformA})">
                NOTIFICAR
            </button>
        </div>
    </div>`;
}

function renderOrderModificationSection(f, items, deptos, protocolos) {
    const currentInst = Number(localStorage.getItem('instId') || sessionStorage.getItem('instId') || 0);
    const isDerivedActive = Number(f.DerivadoActivo || 0) === 1 && Number(f.IdFormularioDerivacionActiva || 0) > 0;
    const isOriginInst = Number(f.IdInstitucionOrigen || 0) === currentInst && currentInst > 0;
    const wf = (f.EstadoWorkflow || '').toString().toUpperCase();
    const lockProtocol = isDerivedActive && !isOriginInst;
    const lockImmutable = isDerivedActive && !isOriginInst;
    const lockSaveBtn = isDerivedActive && (isOriginInst || (!isOriginInst && wf.includes('PENDIENTE')));
    const canEditTipo = isDerivedActive && !isOriginInst && !wf.includes('PENDIENTE');
    const listaDeptos = Array.isArray(deptos) ? deptos : [];
    const listaProt = Array.isArray(protocolos) ? protocolos : [];
    const listaTipos = Array.isArray(window.__insumosTiposCache) ? window.__insumosTiposCache : [];

    const tIns = window.txt?.admin_insumos || {};
    const labelProt = tIns.label_protocolo || 'Protocolo';
    const phBuscarProt = tIns.ph_buscar_protocolo || 'Buscar por número, título o investigador...';
    const sinOrg = window.txt?.generales?.sin_organizacion || '– (sin organización)';
    const labelInt = window.txt?.config_departamentos?.badge_interno || 'INTERNO';
    const labelExt = window.txt?.config_departamentos?.badge_externo || 'EXTERNO';

    const currentProtId = f.IdProtocolo || '';
    const currentProtLabel = (f.NProtocolo && f.TituloProtocolo)
        ? `#${f.NProtocolo} - ${f.TituloProtocolo}`
        : '—';

    const idDepto = f.idDepto != null ? f.idDepto : '';
    const orgActual = (f.Organizacion && String(f.Organizacion).trim()) ? f.Organizacion : sinOrg;
    const extFlag = Number(f.DeptoExternoFlag || 1);
    const ambitoBadge = extFlag === 2 ? `<span class="badge bg-danger text-white" style="font-size:9px;">${labelExt}</span>` : `<span class="badge bg-success text-white" style="font-size:9px;">${labelInt}</span>`;

    const optionsDepto = listaDeptos.map(d => {
        const ext = (d.externodepto == 2) || (d.externodepto == null && d.externoorganismo == 2) ? 2 : 1;
        const org = (d.NombreOrganismoSimple && String(d.NombreOrganismoSimple).trim()) ? d.NombreOrganismoSimple : sinOrg;
        const sel = (d.iddeptoA == idDepto) ? ' selected' : '';
        return `<option value="${d.iddeptoA}" data-org="${(org || '').replace(/"/g, '&quot;')}" data-externo="${ext}"${sel}>${d.NombreDeptoA || ''}</option>`;
    }).join('');
    const optionsTipo = listaTipos.map(tp => {
        const sel = Number(f.tipoAId || 0) === Number(tp.IdTipoFormulario) ? ' selected' : '';
        return `<option value="${tp.IdTipoFormulario}"${sel}>${tp.nombreTipo || ''}</option>`;
    }).join('');

    // Aseguramos que el protocolo actual siempre esté en la lista (aunque ya no esté activo)
    let listaProtFinal = Array.isArray(listaProt) ? [...listaProt] : [];
    if (currentProtId && !listaProtFinal.some(p => String(p.idprotA) === String(currentProtId))) {
        if (f.NProtocolo && f.TituloProtocolo) {
            listaProtFinal.unshift({
                idprotA: currentProtId,
                nprotA: f.NProtocolo,
                tituloA: f.TituloProtocolo,
                Investigador: f.Investigador || ''
            });
        }
    }

    return `
    <div class="p-4 bg-white">
        <h6 class="fw-bold text-success uppercase mb-3" style="font-size: 13px;">Modificación Técnica (Formulario)</h6>
        <form id="form-insumo-full" class="bg-white p-3 border rounded shadow-sm">
            <input type="hidden" name="idformA" value="${f.idformA}">
            <input type="hidden" name="idPrecioinsumosformulario" value="${f.idPrecioinsumosformulario}">
            
            <div class="row g-3 mb-4 text-start">
                <div class="col-md-12">
                    <label class="small fw-bold uppercase text-muted mb-1">Tipo de Pedido</label>
                    <select name="tipoA" class="form-select form-select-sm" ${canEditTipo ? '' : 'disabled'}>
                        ${optionsTipo}
                    </select>
                    ${canEditTipo ? '' : `<input type="hidden" name="tipoA" value="${f.tipoAId || ''}">`}
                </div>
                <div class="col-md-12">
                    <label class="small fw-bold uppercase text-muted d-flex justify-content-between align-items-center mb-1">
                        <span>${labelProt}</span>
                        <input type="text" id="insumo-prot-search" class="form-control form-control-sm ms-2 bg-light border-0" style="max-width: 260px;" placeholder="${phBuscarProt}">
                    </label>
                    <select name="idProt" id="insumo-prot-select" class="form-select form-select-sm fw-bold border-secondary text-primary" required ${lockProtocol ? 'disabled' : ''}>
                        ${listaProtFinal.map(p => {
                            const isSelected = currentProtId && String(currentProtId) === String(p.idprotA) ? 'selected' : '';
                            return `<option value="${p.idprotA}" ${isSelected}>#${p.nprotA} - ${p.tituloA} (${p.Investigador})</option>`;
                        }).join('')}
                    </select>
                    ${lockProtocol ? `<input type="hidden" name="idProt" value="${currentProtId || ''}">` : ''}
                    <p class="small text-muted mt-1 mb-0"><strong>Actual:</strong> ${currentProtLabel}</p>
                </div>
                <div class="col-md-12">
                    <label class="small fw-bold uppercase text-muted mb-1">${window.txt?.admin_insumos?.col_departamento ?? 'Departamento'}</label>
                    <select name="depto" id="modal-depto-insumo" class="form-select form-select-sm fw-bold">
                        <option value="">— ${window.txt?.usuarios?.ficha_sin_departamento ?? 'Sin departamento'} —</option>
                        ${optionsDepto}
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="small fw-bold uppercase text-muted mb-1">${window.txt?.admin_insumos?.col_organizacion ?? 'Organización'}</label>
                    <div id="modal-org-insumo" class="form-control-plaintext form-control-sm bg-light border rounded px-2 py-1 small">${orgActual}</div>
                </div>
                <div class="col-md-6">
                    <label class="small fw-bold uppercase text-muted mb-1">${window.txt?.admin_insumos?.col_ambito ?? 'Ámbito'}</label>
                    <div id="modal-ambito-insumo" class="pt-1">${ambitoBadge}</div>
                </div>
                <div class="col-md-6">
                    <label class="small fw-bold uppercase text-muted mb-1">Fecha Inicio</label>
                    <input type="date" name="fechainicioA" class="form-control form-control-sm" value="${f.Inicio || ''}" ${lockImmutable ? 'readonly' : ''}>
                </div>
                <div class="col-md-6">
                    <label class="small fw-bold uppercase text-muted mb-1">Fecha Retiro</label>
                    <input type="date" name="fecRetiroA" class="form-control form-control-sm" value="${f.Retiro || ''}" ${lockImmutable ? 'readonly' : ''}>
                </div>
            </div>

            <table class="table table-sm border align-middle shadow-sm" id="table-edit-items">
                <thead class="bg-light small uppercase">
                    <tr><th>Producto / Insumo</th><th style="width: 130px;" class="text-center">Cantidad</th><th style="width: 50px;"></th></tr>
                </thead>
                <tbody id="tbody-items-edit">
                    ${items.map((item, index) => renderItemRow(item, index, lockImmutable)).join('')}
                </tbody>
            </table>
            ${lockImmutable ? '' : `<button type="button" class="btn btn-sm btn-outline-success fw-bold w-100 mb-4" onclick="window.addItemRow()">+ AGREGAR PRODUCTO</button>`}

            <div class="alert alert-secondary py-2 mb-4 border-0 text-start">
                <label class="small fw-bold uppercase text-muted d-block" style="font-size: 9px;">Aclaración del Investigador</label>
                <p class="mb-0 small italic" style="font-size: 11px;">${f.AclaracionUsuario || 'Sin observaciones.'}</p>
            </div>

            <div class="mt-2 d-flex justify-content-end gap-2 border-top pt-3 w-100">
                <button type="button" class="btn btn-outline-danger btn-sm px-4 fw-bold shadow-sm" onclick="window.downloadInsumoPDF(${f.idformA})"><i class="bi bi-file-pdf"></i> PDF</button>
                <button type="submit" class="btn btn-success btn-sm px-5 fw-bold shadow-sm" style="background-color: #1a5d3b;" ${lockSaveBtn ? 'disabled title="' + (window.txt?.misformularios?.derivacion_guardar_bloqueado || 'No se puede guardar: el formulario está en derivación.') + '"' : ''}>GUARDAR CAMBIOS</button>
            </div>
        </form>
    </div>`;
}

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

function renderItemRow(item = {}, index, lockImmutable = false) {
    return `
        <tr class="item-row">
            <td>
                <select name="items[${index}][idInsumo]" class="form-select form-select-sm">
                    <option value="">Seleccione insumo...</option>
                    ${window.catalogoInsumos.map(c => `
                        <option value="${c.idInsumo}" ${c.idInsumo == item.idInsumo ? 'selected' : ''}>
                            ${c.NombreInsumo} [${c.TipoInsumo}]
                        </option>`).join('')}
                </select>
            </td>
            <td><input type="number" name="items[${index}][cantidad]" class="form-control form-control-sm fw-bold text-center" value="${item.cantidad || 1}" ${lockImmutable ? 'readonly' : ''}></td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-link text-danger p-0" onclick="window.removeItemRow(this)" ${lockImmutable ? 'disabled' : ''}>
                    <i class="bi bi-trash fs-5"></i>
                </button>
            </td>
        </tr>`;
}

/**
 * 4. EVENTOS DINÁMICOS
 */
window.addItemRow = () => {
    const tbody = document.getElementById('tbody-items-edit');
    const index = tbody.children.length;
    tbody.insertAdjacentHTML('beforeend', renderItemRow({}, index));
};

window.removeItemRow = (btn) => {
    const tbody = document.getElementById('tbody-items-edit');
    if (tbody.children.length > 1) btn.closest('tr').remove();
    else window.Swal.fire('Atención', 'El pedido debe contener al menos un producto.', 'warning');
};

window.updateInsumoStatusQuick = async (id) => {
    const row = allInsumos.find(x => Number(x.idformA) === Number(id));
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
    const status = document.getElementById('insumo-status').value;
    const badgeContainer = document.getElementById('insumo-status-badge-container');
    const aclara = document.getElementById('insumo-admin-note').value;
    const isSinEstado = status.trim().toLowerCase() === 'sin estado';

    const fd = new FormData();
    fd.append('idformA', id);
    fd.append('estado', status);
    fd.append('aclaracionadm', aclara);
    fd.append('userName', '');

    try {
        const res = await API.request(`/insumos/update-status`, 'POST', fd);
        if (res.status === 'success') {
            const inputVisor = document.getElementById('insumo-reviewer');
            if (inputVisor) {
                inputVisor.value = (res.quienvisto != null && res.quienvisto !== '') ? res.quienvisto : (isSinEstado ? 'Falta revisar' : '');
            }
            const porInst = (row && Number(row.DerivadoActivo || 0) === 1 && (row.InstitucionActualNombre || '').trim()) ? row.InstitucionActualNombre.trim() : undefined;
            if (badgeContainer) badgeContainer.innerHTML = getStatusBadge(status, porInst);
            const r = await API.request(`/insumos/all?inst=${localStorage.getItem('instId')}`);
            allInsumos = r.data;
            setupOriginInstitutionFilterInsumo();
            renderTable();
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

window.saveFullInsumoForm = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const id = fd.get('idformA');
    const row = allInsumos.find(x => Number(x.idformA) === Number(id));
    const currentInst = Number(localStorage.getItem('instId') || sessionStorage.getItem('instId') || 0);
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
        const res = await API.request(`/insumos/update-full`, 'POST', fd);
        if (res.status === 'success') {
            window.Swal.fire({ title: '¡Guardado!', icon: 'success', timer: 1000, showConfirmButton: false }).then(() => location.reload());
        }
    } catch (err) { console.error(err); }
};

window.resolveDerivacionInsumo = async (action, idDerivacion, idformA) => {
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
            const rr = await API.request(`/insumos/all?inst=${localStorage.getItem('instId')}`);
            allInsumos = rr.data || [];
            setupOriginInstitutionFilterInsumo();
            renderTable();
            const f = allInsumos.find(x => Number(x.idformA) === Number(idformA));
            if (f) window.openInsumoModal(f);
        } else {
            window.Swal.fire('Error', res.message || 'No se pudo procesar.', 'error');
        }
    } catch (e) {
        window.Swal.fire('Error', 'No se pudo procesar la derivación.', 'error');
    }
};

window.deriveFromAdminInsumo = async (idformA) => {
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
            const rr = await API.request(`/insumos/all?inst=${localStorage.getItem('instId')}`);
            allInsumos = rr.data || [];
            setupOriginInstitutionFilterInsumo();
            renderTable();
            const f = allInsumos.find(x => Number(x.idformA) === Number(idformA));
            if (f) window.openInsumoModal(f);
        } else {
            window.Swal.fire('Error', res.message || 'No se pudo derivar.', 'error');
        }
    } catch (e) {
        window.Swal.fire('Error', tx.historial_derivacion_error || 'No se pudo procesar la derivación.', 'error');
    }
};

window.showDerivHistoryInsumo = async (idformA) => {
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
 * LÓGICA DE FILTRADO Y ORDENAMIENTO (ESTILO GROBO 2026)
 * Optimizada para búsqueda en tiempo real y filtrado por columnas.
 */
function getFilteredAndSortedData() {
    // 1. Captura de filtros desde el DOM
    const statusFilter = document.getElementById('filter-status-insumo').value.toLowerCase().trim();
    const term = document.getElementById('search-input-insumo').value.toLowerCase().trim();
    const filterType = document.getElementById('filter-column-insumo').value;
    const derivFilter = document.getElementById('filter-deriv-insumo')?.value || 'all';
    const retiroEl = document.getElementById('filter-retiro-insumo');
    const retiroVal = retiroEl ? (retiroEl.value || '').trim() : '';

    let data = allInsumos.filter(f => {
        const isDerived = Number(f.DerivadoActivo || 0) === 1;
        let eff = f.estado;
        if (isDerived && (f.estado_origen != null || f.estado_destino != null)) {
            if (f.estado_destino != null && String(f.estado_destino).trim() !== '') eff = f.estado_destino;
            else if (f.estado_origen != null && String(f.estado_origen).trim() !== '') eff = f.estado_origen;
        }
        const estadoFila = (eff || 'sin estado').toString().toLowerCase().trim();
        const matchStatus = statusFilter === 'all' || estadoFila === statusFilter;
        if (!matchStatus) return false;
        if (derivFilter === 'derived' && !isDerived) return false;
        if (derivFilter === 'local' && isDerived) return false;
        const originName = (f.InstitucionOrigenNombre || '').trim();
        if (String(filterType).startsWith('origin::')) {
            const originSelected = String(filterType).slice('origin::'.length);
            if (originName !== originSelected) return false;
        }
        // Filtro por fecha de retiro
        if (retiroVal) {
            const fRetiro = (f.Retiro || '').toString().substring(0, 10);
            if (fRetiro !== retiroVal) return false;
        }
        
        // B. Validación de Búsqueda (Texto en tiempo real)
        let matchSearch = true;
        if (term) {
            if (filterType === 'all' || String(filterType).startsWith('origin::')) {
                // Búsqueda global robusta (ID, Investigador, Depto e Insumos)
                matchSearch = String(f.idformA || '').includes(term) || 
                              String(f.Investigador || '').toLowerCase().includes(term) || 
                              String(f.Departamento || '').toLowerCase().includes(term) ||
                              String(f.ResumenInsumos || '').toLowerCase().includes(term);
            } else {
                // Búsqueda específica por columna
                matchSearch = String(f[filterType] || '').toLowerCase().includes(term);
            }
        }

        return matchStatus && matchSearch;
    });

    // 2. Lógica de Ordenamiento Dinámico
    if (typeof sortConfig !== 'undefined' && sortConfig.direction !== 'none') {
        data.sort((a, b) => {
            let valA = a[sortConfig.key] || ''; 
            let valB = b[sortConfig.key] || '';
            const factor = sortConfig.direction === 'asc' ? 1 : -1;

            // Si los valores son numéricos, restamos; si no, comparamos como texto
            if (!isNaN(valA) && !isNaN(valB) && valA !== '' && valB !== '') {
                return (Number(valA) - Number(valB)) * factor;
            }
            return valA.toString().localeCompare(valB.toString()) * factor;
        });
    } else { 
        // Orden por defecto: ID de formulario descendente (# más alto primero)
        data.sort((a, b) => (Number(b.idformA) || 0) - (Number(a.idformA) || 0)); 
    }

    return data;
}

// Stubs para evitar errores de referencia
window.downloadInsumoPDF = (id) => { console.log("Generando PDF para ID:", id); };
window.openNotifyPopupInsumo = (id) => { console.log("Abriendo popup notificación para ID:", id); };


/**
 * 4. COMPONENTES VISUALES (BADGES Y PAGINADOR)
 */
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

function renderPagination(totalItems, containerId, refreshCallback) {
    const pag = document.getElementById(containerId); 
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    if (!pag) return;
    pag.innerHTML = ''; 
    if (totalPages <= 1) return;

    const createBtn = (label, page, disabled, active = false) => {
        const li = document.createElement('li'); 
        li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${label}</a>`;
        if (!disabled) li.onclick = (e) => { e.preventDefault(); currentPage = page; refreshCallback(); window.scrollTo({top:0, behavior:'smooth'}); }; 
        return li;
    };

    pag.appendChild(createBtn('Anterior', currentPage - 1, currentPage === 1));
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            pag.appendChild(createBtn(i, i, false, i === currentPage));
        }
    }
    pag.appendChild(createBtn('Siguiente', currentPage + 1, currentPage === totalPages));
}

/**
 * 5. GESTIÓN DE ORDENAMIENTO DE CABECERAS
 */
function setupSortHeaders() {
    document.querySelectorAll('th[data-sortable="true"]').forEach(th => {
        th.style.cursor = 'pointer';
        th.setAttribute('data-label', th.innerText.trim());
        th.onclick = () => {
            const key = th.getAttribute('data-key');
            if (sortConfig.key === key) {
                sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : (sortConfig.direction === 'desc' ? 'none' : 'asc');
            } else { 
                sortConfig.key = key; 
                sortConfig.direction = 'asc'; 
            }
            renderTable();
        };
    });
}

function updateHeaderIcons() {
    document.querySelectorAll('th[data-sortable="true"]').forEach(th => {
        const key = th.getAttribute('data-key');
        const icon = sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' ▲' : (sortConfig.direction === 'desc' ? ' ▼' : '')) : '';
        let iconSpan = th.querySelector('.sort-icon');
        if (!iconSpan) {
            iconSpan = document.createElement('span');
            iconSpan.className = 'sort-icon ms-1 small text-muted';
            th.appendChild(iconSpan);
        }
        iconSpan.textContent = icon;
    });
}
/**
 * POPUP DE NOTIFICACIÓN PARA INSUMOS
 * Gestiona el envío de correos y el registro en 'notificacioncorreo'
 */
window.openNotifyPopupInsumo = async (idformA) => {
    // 1. Buscamos los datos actuales del pedido en el estado local
    const f = allInsumos.find(item => item.idformA == idformA);

    // 2. Abrimos el cuadro de diálogo para redactar el mensaje
    const { value: text } = await window.Swal.fire({
        title: `<span class="small fw-bold uppercase">NOTIFICAR A: ${f.Investigador}</span>`,
        input: 'textarea',
        inputLabel: `El investigador recibirá un correo (Estado: ${f.estado})`,
        inputPlaceholder: 'Escriba aquí el mensaje o aclaración técnica...',
        showCancelButton: true,
        confirmButtonText: 'ENVIAR NOTIFICACIÓN',
        confirmButtonColor: '#1a5d3b',
        cancelButtonText: 'CANCELAR',
        allowOutsideClick: false,
        inputAttributes: {
            'autocapitalize': 'off',
            'autocorrect': 'off'
        }
    });

    // 3. Si hay mensaje, procesamos el envío
    if (text) {
        showLoader();
        
        // Preparamos los datos exactos para la entidad 'notificacioncorreo'
        const fd = new FormData();
        fd.append('idformA', idformA);               // Mapea al campo 'ID'
        fd.append('mensaje', text);               // Mapea al campo 'NotaNotificacion'
        fd.append('email', f.EmailInvestigador);     // Para el envío del PHPMailer
        fd.append('investigador', f.Investigador);   // Para el saludo del template
        fd.append('estado', f.estado);               // Mapea al campo 'estado'
        fd.append('instId', localStorage.getItem('instId')); // Mapea a 'IdInstitucion'
        fd.append('adminId', localStorage.getItem('userId'));

        try {
            // Llamada al endpoint que ejecuta MailService y guarda en BD
            const res = await API.request('/insumos/send-notification', 'POST', fd);
            
            if (res.status === 'success') {
                // Notificamos éxito al usuario
                await window.Swal.fire({
                    title: '¡Mensaje Enviado!',
                    text: 'El historial de comunicaciones ha sido actualizado.',
                    icon: 'success',
                    confirmButtonColor: '#1a5d3b'
                });

                // 4. Actualizamos el historial en el modal sin recargar la página
                // Consultamos la última notificación recién creada en 'notificacioncorreo'
                const resNotify = await API.request(`/reactivos/last-notification?id=${idformA}`);
                const notifyDiv = document.getElementById('insumo-notify-container');
                
                if (notifyDiv) {
                    // Re-renderizamos solo el componente de notificación
                    notifyDiv.outerHTML = renderNotificationSection(resNotify.data, idformA);
                }
            } else {
                throw new Error(res.message || "Error al procesar la notificación.");
            }
        } catch (e) {
            console.error("Error en notificación:", e);
            window.Swal.fire('Error', 'No se pudo enviar el correo o registrar la actividad.', 'error');
        } finally {
            hideLoader();
        }
    }
};

/**
 * GENERACIÓN DE PDF - INSUMOS EXPERIMENTALES
 * Captura la lista dinámica de productos y datos del departamento.
 */
window.downloadInsumoPDF = async (id) => {
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    
    // 1. Helpers para captura de datos del DOM
    const getVal = (name) => document.querySelector(`[name="${name}"]`)?.value || '---';
    
    const getSelTextByName = (name) => {
        const s = document.querySelector(`select[name="${name}"]`);
        if (!s || s.selectedIndex === -1) return '---';
        return s.options[s.selectedIndex].text;
    };

    // 2. Captura de información de cabecera y contacto
    const invHeader = document.querySelector('#modal-content-insumo h5 + span + strong')?.innerText 
                      || document.querySelector('#modal-content-insumo h5')?.innerText || '---';
    
    // Capturamos el bloque de contacto (Investigador, Email, Celular)
    const contactoInfo = Array.from(document.querySelectorAll('#modal-content-insumo .row.g-2.p-3 div'))
                              .map(div => div.innerText.replace('\n', ': ')).join(' | ');

    const estadoActual = document.getElementById('insumo-status')?.options[document.getElementById('insumo-status').selectedIndex]?.text || '---';
    const deptoNombre = getSelTextByName('depto');
    const orgNombre = (document.getElementById('insumo-org-display')?.innerText || '').replace(/Organización:\s*/i, '').trim() || (window.txt?.generales?.sin_organizacion || '– (sin organización)');

    // 3. CAPTURA DINÁMICA DE PRODUCTOS (La tabla del modal)
    const productRows = document.querySelectorAll('#tbody-items-edit tr');
    let itemsHtml = '';
    
    productRows.forEach(row => {
        const select = row.querySelector('select');
        const nombre = select.options[select.selectedIndex]?.text || '---';
        const cantidad = row.querySelector('input[type="number"]')?.value || '0';
        
        itemsHtml += `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: left;">${nombre}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${cantidad}</td>
            </tr>`;
    });

    const pdfTemplate = `
        <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; line-height: 1.4;">
            <div style="text-align: center; border-bottom: 2px solid #1a5d3b; padding-bottom: 10px; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #1a5d3b;">GROBO - ${inst}</h2>
                <h4 style="margin: 5px 0; text-transform: uppercase;">Ficha de Pedido: Insumos Experimentales</h4>
                <p style="margin: 0; font-size: 11px; color: #666;">Solicitud ID: #${id} | Generado: ${new Date().toLocaleString()}</p>
            </div>

            <div style="margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 5px;">
                <p style="margin: 5px 0;"><strong>Investigador Responsable:</strong> ${invHeader}</p>
                <p style="margin: 5px 0; font-size: 11px; color: #555;">${contactoInfo}</p>
                <p style="margin: 10px 0 0 0;"><strong>Departamento Destino:</strong> <span style="color: #0d6efd;">${deptoNombre}</span></p>
                <p style="margin: 6px 0 0 0;"><strong>Organización:</strong> <span style="color: #0d6efd;">${orgNombre}</span></p>
                <p style="margin: 15px 0 0 0; font-size: 14px;"><strong>ESTADO DEL PEDIDO:</strong> <span style="color: #1a5d3b; font-weight: bold; text-transform: uppercase;">${estadoActual}</span></p>
            </div>

            <p style="font-size: 12px; font-weight: bold; margin-bottom: 10px; color: #1a5d3b;">DETALLE DE PRODUCTOS SOLICITADOS:</p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
                <thead>
                    <tr style="background-color: #1a5d3b; color: white;">
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Descripción del Producto / Insumo</th>
                        <th style="width: 100px; padding: 10px; border: 1px solid #ddd; text-align: center;">Cantidad</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <div style="flex: 1; border: 1px solid #ddd; padding: 10px; background: #fff;">
                    <strong style="font-size: 10px; color: #666;">FECHA ESTIMADA INICIO:</strong><br>${getVal('fechainicioA')}
                </div>
                <div style="flex: 1; border: 1px solid #ddd; padding: 10px; background: #fff;">
                    <strong style="font-size: 10px; color: #666;">FECHA ESTIMADA RETIRO:</strong><br>${getVal('fecRetiroA')}
                </div>
            </div>



            <div style="margin-top: 30px; text-align: center; font-size: 9px; color: #999;">
                Documento generado por GROBO - Sistema de Gestión de Bioterios
            </div>
        </div>
    `;

    const opt = { 
        margin: [18, 18, 18, 18], 
        filename: `Pedido_Insumos_${id}_${new Date().getTime()}.pdf`, 
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(pdfTemplate).save();
};

/**
 * PROCESAR EXPORTACIÓN A EXCEL - INSUMOS EXPERIMENTALES
 */
window.processExcelExportInsumos = () => {
    // 1. Captura de fechas y configuración inicial
    const start = document.getElementById('excel-start-date-insumo').value;
    const end = document.getElementById('excel-end-date-insumo').value;
    const nombreInst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();

    if (!start || !end) {
        window.Swal.fire('Atención', 'Debe seleccionar un rango de fechas.', 'warning');
        return;
    }

    // 2. Obtención de datos filtrados desde el estado global de insumos
    let data = getFilteredAndSortedData();

    // 3. Filtro por rango de fechas basado en la fecha de Inicio
    data = data.filter(r => {
        const fechaPedido = r.Inicio || '0000-00-00';
        return fechaPedido >= start && fechaPedido <= end;
    });

    if (data.length === 0) {
        window.Swal.fire('Sin resultados', 'No hay registros de insumos en ese rango.', 'info');
        return;
    }

    // 4. Encabezados Técnicos para Insumos
    const headers = [
        "ID", 
        "Investigador", 
        "Departamento", 
        "Insumos (Cantidad/Medida)", 
        "Fecha Inicio", 
        "Fecha Retiro", 
        "Aclaracion Admin",
        "Estado"
    ];
    
    const csvRows = [headers.join(";")];

    // 5. Procesamiento de filas
    data.forEach(r => {
        // Limpiamos el HTML del resumen de insumos (quitamos <b>, </b>, etc.)
        const insumosLimpio = (r.ResumenInsumos || '---').replace(/<[^>]*>?/gm, '');

        const row = [
            r.idformA,
            r.Investigador,
            r.Departamento || '---',
            insumosLimpio,
            `="${r.Inicio || '---'}"`, // Truco Excel para mantener formato fecha
            `="${r.Retiro || '---'}"`,
            r.aclaracionadm || '---',
            r.estado || 'Sin estado'
        ];
        
        // Limpieza de caracteres que rompen el CSV (punto y coma y saltos de línea)
        csvRows.push(row.map(v => String(v).replace(/;/g, ' ').replace(/\n/g, ' ')).join(";"));
    });

    // 6. Generación y descarga del archivo
    const csvContent = "\uFEFF" + csvRows.join("\r\n"); // BOM para compatibilidad con Excel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `GROBO_${nombreInst}_INSUMOS_${start}_al_${end}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 7. Cerrar el modal de Excel de insumos
    const modalEl = document.getElementById('modal-excel-insumo');
    if (modalEl) {
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
    }
};