import { API } from '../../../api.js';
import { hideLoader, showLoader } from '../../../components/LoaderComponent.js';
import { refreshMenuNotifications } from '../../../components/MenuComponent.js';
import { setBillingResultsLoadingInline } from './billingResultsLoading.js';
import { renderDashboard } from './billingDashboard.js';
import {
    formatBillingMoney,
    formatBillingDateTime,
    pdfColsPrecioDebePagoTotal,
    pdfColsPdfOrdenTotalPagadoDebe,
    billingTipoExento,
    billingTdTotalPagadoDebe,
    getBillingNombreInstitucion,
    billingSumFormulariosCobrable,
    billingSumAlojamientos,
    billingSumInsumosCobrable,
    billingInsumoMontoTotalCobrable,
    billingDerivacionPlainText,
    billingDerivadaLiquidacionBadge,
    billingDerivacionSalienteHint,
    billingPdfFormularioIdDisplay,
    billingPdfMarcaExentoCorta,
    billingPdfMarcaExentoLarga,
    billingAlojPeriodoParaInforme,
    billingPedidoSinMontoNoExento,
    billingHtmlRowInsumoPedidoFacturacion,
    billingHtmlInsumoProtSectionHeader,
    billingPartitionInsumosPedidoReactivoOtros,
    billingFormatPedidoFechasPlain
} from './billingLocale.js';
import './billingPayments.js';

import './modals/manager.js' ;
import {
    fetchFiltrosAlcanceDerivacion,
    aplicarVisibilidadColumnaFacturacionDerivacion,
    getFacturacionDerivacionSeleccionFromDom as getFacturacionDerivacionSeleccion,
    getAmbitoInternoExternoFromDom,
    getFiltrosAlcanceDerivacionCached,
} from './billingDerivacionFiltros.js';

/** Textos facturación (incl. `billing_depto` — lote i18n ES/EN/PT) */
function txF() {
    return window.txt?.facturacion || {};
}
function txBD() {
    return txF().billing_depto || {};
}
function txBI() {
    return txF().billing_investigador || {};
}
function txBP() {
    return txF().billing_protocolo || {};
}
function txBE() {
    return txF().billing_depto_export || {};
}

let currentReportData = null;
/** Lista completa de departamentos (para filtrar por ámbito sin nueva petición) */
let deptosRaw = [];
/** Tras el primer informe por departamento exitoso, las recargas muestran spinner en el área de resultados. */
let deptoBillingReportLoadedOk = false;

/** Tarjetas de protocolo por página (menos DOM cuando hay muchos protocolos). */
const DEPT_BILLING_PROTOCOLS_PER_PAGE = 8;
let deptoProtPage = 1;

function escapeHtml(s) {
    if (s == null || s === '') return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function collectVisibleProtocolsDepto(data, showAni, showAlo, showIns) {
    const list = Array.isArray(data?.protocolos) ? data.protocolos : [];
    return list.filter((prot) => {
        const hasVisibleForms = showAni && prot.formularios && prot.formularios.length > 0;
        const hasVisibleAloj = showAlo && prot.alojamientos && prot.alojamientos.length > 0;
        const hasVisibleIns = showIns && prot.insumos && prot.insumos.length > 0;
        return hasVisibleForms || hasVisibleAloj || hasVisibleIns;
    });
}

function buildDeptoProtocolPagerHtml(page, totalPages, totalCards) {
    if (totalPages <= 1) return '';
    const gen = window.txt?.generales || {};
    const tm = txBD();
    const per = DEPT_BILLING_PROTOCOLS_PER_PAGE;
    const from = (page - 1) * per + 1;
    const to = Math.min(page * per, totalCards);
    const status = (tm.prot_cards_range_tpl || '{a}–{b} / {total}')
        .replace(/\{a\}/g, String(from))
        .replace(/\{b\}/g, String(to))
        .replace(/\{total\}/g, String(totalCards));
    const prevL = gen.pag_anterior || 'Anterior';
    const nextL = gen.pag_siguiente || 'Siguiente';
    return `
        <nav id="depto-prot-pager" class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3 p-2 bg-white rounded shadow-sm border" data-i18n-ignore="true" aria-label="protocol-cards">
            <span class="small text-muted">${escapeHtml(status)}</span>
            <div class="btn-group btn-group-sm">
                <button type="button" class="btn btn-outline-secondary" ${page <= 1 ? 'disabled' : ''} onclick="window.goDeptoProtocolPage(${page - 1})">${escapeHtml(prevL)}</button>
                <span class="btn btn-outline-secondary disabled" style="pointer-events:none;opacity:1;">${page} / ${totalPages}</span>
                <button type="button" class="btn btn-outline-secondary" ${page >= totalPages ? 'disabled' : ''} onclick="window.goDeptoProtocolPage(${page + 1})">${escapeHtml(nextL)}</button>
            </div>
        </nav>`;
}

function buildDeptoProtocolCardsHtml(visibleSlice, showAni, showAlo, showIns) {
    let html = '';
    visibleSlice.forEach((prot) => {
        const hasVisibleForms = showAni && prot.formularios && prot.formularios.length > 0;
        const hasVisibleAloj = showAlo && prot.alojamientos && prot.alojamientos.length > 0;
        const hasVisibleIns = showIns && prot.insumos && prot.insumos.length > 0;
        const header = getHeaderHTML(prot);
        const formsTable = hasVisibleForms ? getFormsTableHTML(prot.formularios, prot.idProt) : '';
        const alojTable = hasVisibleAloj ? getAlojTableHTML(prot.alojamientos, prot.idProt) : '';
        const insTable = hasVisibleIns ? getInsumosProtocoloTableHTML(prot.insumos, prot.idProt) : '';
        const footer = getFooterHTML(prot, showAni, showAlo, showIns);
        html += `
                <div class="card shadow-sm border-0 mb-5 card-protocolo" id="card-prot-${prot.idProt}">
                    ${header}
                    <div class="collapse" id="saldo-hist-${prot.idProt}">
                        <div class="border-top bg-light p-2" id="saldo-hist-inner-${prot.idProt}" style="font-size: 11px;"></div>
                    </div>
                    <div class="card-body p-3">
                        ${formsTable}
                        ${alojTable}
                        ${insTable}
                    </div>
                    ${footer}
                </div>`;
    });
    return html;
}

/** Paginador + tarjetas del lote visible (lee checkboxes del DOM). */
function buildDeptoProtocolDynamicBlock(data) {
    const showAni = document.getElementById('chk-animales')?.checked;
    const showAlo = document.getElementById('chk-alojamiento')?.checked;
    const showIns = document.getElementById('chk-insumos')?.checked;
    const visible = collectVisibleProtocolsDepto(data, showAni, showAlo, showIns);
    const totalCards = visible.length;
    const totalPages = Math.max(1, Math.ceil(totalCards / DEPT_BILLING_PROTOCOLS_PER_PAGE));
    const page = Math.min(Math.max(1, deptoProtPage), totalPages);
    deptoProtPage = page;
    const start = (page - 1) * DEPT_BILLING_PROTOCOLS_PER_PAGE;
    const slice = visible.slice(start, start + DEPT_BILLING_PROTOCOLS_PER_PAGE);
    const pager = buildDeptoProtocolPagerHtml(page, totalPages, totalCards);
    const cards = buildDeptoProtocolCardsHtml(slice, showAni, showAlo, showIns);
    return pager + `<div id="depto-prot-cards-wrap">${cards}</div>`;
}

window.goDeptoProtocolPage = (newPage) => {
    deptoProtPage = newPage;
    const dyn = document.getElementById('depto-prot-dynamic');
    if (!dyn || !window.currentReportData) return;
    dyn.innerHTML = buildDeptoProtocolDynamicBlock(window.currentReportData);
    vincularCheckboxes();
    vincularChecksPago();
};

export async function initBillingDepto() {
    try {
        aplicarEstilosTablas();
        showLoader();
        await refreshMenuNotifications();
        const hoy = new Date();
        const fDesde = document.getElementById('f-desde');
        const fHasta = document.getElementById('f-hasta');
        if (fDesde && fHasta) {
            fDesde.value = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
            fHasta.value = hoy.toISOString().split('T')[0];
        }
        await fetchFiltrosAlcanceDerivacion();
        aplicarVisibilidadColumnaFacturacionDerivacion(getFiltrosAlcanceDerivacionCached());
        await cargarListaDeptos();
        const filterAmbito = document.getElementById('filter-ambito-depto');
        if (filterAmbito) {
            filterAmbito.addEventListener('change', () => renderDeptoOptions());
        }
        const selDer = document.getElementById('sel-facturacion-derivacion');
        if (selDer) {
            selDer.addEventListener('change', () => renderDeptoOptions());
        }
        const selDeptoInit = document.getElementById('sel-depto');
        if (selDeptoInit && typeof window.invalidateDeptoSaldoHistorialPanelsCache === 'function') {
            selDeptoInit.addEventListener('change', () => window.invalidateDeptoSaldoHistorialPanelsCache());
        }
        aplicarParamsUrlDepto();
        renderDeptoOptions();
    } catch (error) { console.error("Error en init:", error); } finally { hideLoader(); }
}

function aplicarParamsUrlDepto() {
    const params = new URLSearchParams(window.location.search);
    const desde = params.get('desde');
    const hasta = params.get('hasta');
    const deptoId = params.get('depto');
    if (desde) {
        const el = document.getElementById('f-desde');
        if (el) el.value = desde;
    }
    if (hasta) {
        const el = document.getElementById('f-hasta');
        if (el) el.value = hasta;
    }
    if (deptoId) {
        const sel = document.getElementById('sel-depto');
        if (sel) {
            sel.value = deptoId;
            if (desde && hasta && sel.value === deptoId) setTimeout(() => window.cargarFacturacionDepto && window.cargarFacturacionDepto(), 300);
        }
    }
    const fd = params.get('facturacionDerivacion');
    if (fd) {
        const selFd = document.getElementById('sel-facturacion-derivacion');
        const fa = getFiltrosAlcanceDerivacionCached();
        if (selFd && ['todos', 'derivados', 'institucionales'].includes(fd) && (fd === 'todos' || (fa && fa.tieneDerivadosPendientes))) {
            selFd.value = fd;
        }
    }
}

async function cargarListaDeptos() {
    const instId = localStorage.getItem('instId') || 1;
    try {
        const res = await API.request(`/deptos/list?inst=${instId}`);
        if (res.status === 'success' && res.data) {
            deptosRaw = res.data;
            renderDeptoOptions();
        }
    } catch (e) { console.error(e); }
}

/** Filtra departamentos por ámbito org., ámbito de cobro y formularios entregados; etiquetas según modo derivado/local. */
function renderDeptoOptions() {
    const select = document.getElementById('sel-depto');
    if (!select) return;
    const currentVal = select.value;
    const ambOrg = getAmbitoInternoExternoFromDom('filter-ambito-depto');

    const isExterno = (d) => (d.externodepto == 2) || (d.externoorganismo != null && d.externoorganismo == 2);
    let list = deptosRaw;
    if (ambOrg === 'interno') list = list.filter((d) => !isExterno(d));
    if (ambOrg === 'externo') list = list.filter((d) => isExterno(d));

    const fa = getFiltrosAlcanceDerivacionCached();
    const scope = getFacturacionDerivacionSeleccion();

    if (fa?.deptoIdsFormularios?.size) {
        list = list.filter((d) => fa.deptoIdsFormularios.has(Number(d.iddeptoA)));
    } else {
        list = [];
    }

    if (scope === 'derivados') {
        if (fa?.deptoIdsDerivados?.size) {
            list = list.filter((d) => fa.deptoIdsDerivados.has(Number(d.iddeptoA)));
        } else {
            list = [];
        }
    } else if (scope === 'institucionales') {
        if (fa?.deptoIdsLocal?.size) {
            list = list.filter((d) => fa.deptoIdsLocal.has(Number(d.iddeptoA)));
        } else {
            list = [];
        }
    }

    const mapDeptOrigen = fa?.map || {};
    const tf = txF();
    const titleTpl = tf.derivacion_depto_title_tpl || '';

    select.innerHTML = `<option value="">${txF().opcion_seleccionar || '-- SELECCIONAR --'}</option>` +
        list.map((d) => {
            const idNum = Number(d.iddeptoA);
            const nombre = String(d.NombreDeptoA || '').trim() || `ID ${idNum}`;
            let label;
            let titleAttr = '';
            if (scope === 'derivados') {
                const orig = mapDeptOrigen[idNum] ?? mapDeptOrigen[String(idNum)];
                label = orig ? `${nombre} — ${orig}` : nombre;
                if (orig) {
                    titleAttr = String(titleTpl).replace(/\{origenes\}/g, String(orig));
                }
            } else if (scope === 'institucionales') {
                label = nombre;
                titleAttr = `${nombre} (ID: ${idNum})`;
            } else {
                const org = d.NombreOrganismoSimple ? ` (${d.NombreOrganismoSimple})` : '';
                label = `${nombre}${org} (ID: ${idNum})`;
            }
            return `<option value="${d.iddeptoA}" title="${escapeHtml(titleAttr)}">${escapeHtml(label)}</option>`;
        }).join('');

    if (currentVal && list.some((d) => String(d.iddeptoA) === String(currentVal))) {
        select.value = currentVal;
    }
    if (typeof window.invalidateDeptoSaldoHistorialPanelsCache === 'function') {
        window.invalidateDeptoSaldoHistorialPanelsCache();
    }
}

window.cargarFacturacionDepto = async () => {
    const deptoId = document.getElementById('sel-depto').value;
    const desde = document.getElementById('f-desde').value;
    const hasta = document.getElementById('f-hasta').value;
    
    const chkAni = document.getElementById('chk-animales').checked;
    const chkAlo = document.getElementById('chk-alojamiento').checked;
    const chkIns = document.getElementById('chk-insumos').checked;

    if (!chkAni && !chkAlo && !chkIns) {
        Swal.fire(window.txt?.generales?.swal_atencion || 'Atención', window.txt?.facturacion?.aviso_filtro || 'Debe tener al menos un filtro activo (Animales, Alojamiento o Insumos).', 'warning');
        return;
    }

    if (!deptoId) { Swal.fire(window.txt?.generales?.swal_atencion || 'Atención', window.txt?.facturacion?.aviso_depto || 'Seleccione un departamento.', 'warning'); return; }

    const resultsEl = document.getElementById('billing-results');
    const prevReport = window.currentReportData;
    const useGlobalLoader = !deptoBillingReportLoadedOk;
    try {
        if (useGlobalLoader) {
            showLoader();
        } else if (resultsEl) {
            setBillingResultsLoadingInline('billing-results');
        }
        const res = await API.request('/billing/depto-report', 'POST', {
            depto: deptoId,
            desde,
            hasta,
            chkAni,
            chkAlo,
            chkIns,
            facturacionDerivacion: getFacturacionDerivacionSeleccion()
        });
        if (res.status === 'success') {
            window.currentReportData = res.data;
            renderizarResultados(window.currentReportData);
            deptoBillingReportLoadedOk = true;
        } else {
            Swal.fire(window.txt?.generales?.error || 'Error', res.message, 'error');
            if (!useGlobalLoader && prevReport) {
                renderizarResultados(prevReport);
            } else if (!useGlobalLoader && resultsEl) {
                resultsEl.replaceChildren();
            }
        }
    } catch (error) {
        console.error(error);
        if (!useGlobalLoader && prevReport) {
            renderizarResultados(prevReport);
        } else if (!useGlobalLoader && resultsEl) {
            resultsEl.replaceChildren();
            const err = document.createElement('div');
            err.className = 'alert alert-danger m-3';
            err.textContent = window.txt?.generales?.error_carga || 'Error al cargar datos.';
            resultsEl.appendChild(err);
        }
    } finally {
        if (useGlobalLoader) hideLoader();
    }
};

function renderizarResultados(data) {
    const container = document.getElementById('billing-results');
    renderDashboard(data);

    const selectEl = document.getElementById('sel-depto');
    if (selectEl && selectEl.selectedIndex > 0) {
        const titEl = document.getElementById('titulo-departamento-dinamico');
        if (titEl) titEl.innerText = selectEl.options[selectEl.selectedIndex].text;
    }

    const showIns = document.getElementById('chk-insumos').checked;
    const showAni = document.getElementById('chk-animales').checked;
    const showAlo = document.getElementById('chk-alojamiento').checked;

    const restoreProt = window.__billingRestoreProtId;
    if (restoreProt != null && restoreProt !== '') {
        const rid = parseInt(String(restoreProt), 10);
        window.__billingRestoreProtId = null;
        if (Number.isFinite(rid) && rid >= 0) {
            const visible = collectVisibleProtocolsDepto(data, showAni, showAlo, showIns);
            const idx = visible.findIndex((pr) => String(pr.idProt) === String(rid));
            deptoProtPage = idx >= 0 ? Math.floor(idx / DEPT_BILLING_PROTOCOLS_PER_PAGE) + 1 : 1;
        } else {
            deptoProtPage = 1;
        }
    } else {
        deptoProtPage = 1;
    }

    let html = '';
    if (showIns && data.insumosGenerales) {
        html += getInsumosGeneralesTableHTML(data.insumosGenerales);
    }

    if (collectVisibleProtocolsDepto(data, showAni, showAlo, showIns).length > 0) {
        html += `<div id="depto-prot-dynamic">${buildDeptoProtocolDynamicBlock(data)}</div>`;
    }

    if (!html) {
        html = `<div class="alert alert-warning text-center">${txF().sin_movimientos || 'No hay movimientos que coincidan con los filtros seleccionados.'}</div>`;
    }

    container.innerHTML = html;
    vincularCheckboxes();
    vincularChecksPago();
    if (showIns) {
        vincularCheckboxesInsumos();
        vincularChecksPagoInsumosProt();
    }
}

function vincularChecksPagoInsumosProt() {
    document.querySelectorAll('.check-all-insumo-prot').forEach((master) => {
        master.addEventListener('change', (e) => {
            const idProt = e.target.dataset.prot;
            document.querySelectorAll(`.check-item-insumo-prot[data-prot="${idProt}"]:not(:disabled)`)
                .forEach((c) => { c.checked = e.target.checked; });
            actualizarMontoInsumosProt(idProt);
        });
    });
    document.querySelectorAll('.check-item-insumo-prot').forEach((chk) => {
        chk.addEventListener('change', () => actualizarMontoInsumosProt(chk.dataset.prot));
    });
}

function actualizarMontoInsumosProt(idProt) {
    const visor = document.getElementById(`pago-insumos-seleccionado-${idProt}`);
    if (!visor) return;
    let total = 0;
    document.querySelectorAll(`.check-item-insumo-prot[data-prot="${idProt}"]:checked`)
        .forEach((c) => { total += parseFloat(c.dataset.monto || 0); });
    visor.innerText = `$ ${formatBillingMoney(total)}`;
}

function vincularChecksPago() {
    const checkboxes = document.querySelectorAll('.check-item-form, .check-item-aloj');
    checkboxes.forEach(chk => {
        chk.addEventListener('change', () => {
            const idProt = chk.dataset.prot;
            const container = document.getElementById(`pago-seleccionado-${idProt}`);
            let total = 0;
            document.querySelectorAll(`.check-item-form[data-prot="${idProt}"]:checked, .check-item-aloj[data-prot="${idProt}"]:checked`)
                .forEach(selected => { total += parseFloat(selected.dataset.monto || 0); });
                
            if (container) {
                container.innerText = `$ ${formatBillingMoney(total)}`;
                container.classList.add('text-success');
                setTimeout(() => container.classList.remove('text-success'), 500);
            }
        });
    });
}

function getHeaderHTML(prot) {
    const tf = txF();
    const isSinProtocolo = (prot.idProt === 0);
    const protocoloLabel = isSinProtocolo ? (tf.depto_sin_protocolo || prot.nprotA) : prot.nprotA;
    const tituloDisplay = isSinProtocolo ? '' : (prot.tituloA || '');
    const investigadorDisplay = isSinProtocolo ? (tf.saldo_hist_placeholder_empty || '—') : `${prot.investigador} (ID: ${prot.idUsr})`;
    const lblProt = `${tf.label_protocolo || 'Protocolo'}:`;
    const lblInv = `${window.txt?.generales?.investigador || 'Investigador'}:`;
    const bloqueSaldo = isSinProtocolo ? '' : `
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <small class="text-muted fw-bold uppercase" style="font-size: 10px;">${tf.saldo_actual || 'Saldo Actual:'}</small>
                            <span class="badge bg-light text-success border fs-6 fw-bold">$ ${formatBillingMoney(parseFloat(prot.saldoInv))}</span>
                        </div>
                        <div class="d-flex justify-content-end mb-1">
                            <button type="button" class="btn btn-outline-secondary btn-sm fw-bold" title="${String(tf.saldo_hist_sub || '').replace(/"/g, '&quot;')}" onclick="window.toggleDeptoSaldoHistorialPanel(${prot.idProt}, ${prot.idUsr})">
                                <i class="bi bi-clock-history me-1"></i>${tf.saldo_hist_btn || 'Historial'}
                            </button>
                        </div>
                        <div class="input-group input-group-sm shadow-sm" style="width: 210px;">
                            <span class="input-group-text bg-white border-end-0"><i class="bi bi-pencil-square"></i></span>
                            <input type="number" id="inp-saldo-prot-${prot.idProt}" class="form-control border-start-0 border-end-0 border-primary" placeholder="${tf.monto_ajustar || 'Monto a ajustar...'}">
                            <button type="button" class="btn btn-success" onclick="window.updateBalance(${prot.idUsr}, 'add', true, ${prot.idProt})"><i class="bi bi-plus-lg"></i></button>
                            <button type="button" class="btn btn-danger" onclick="window.updateBalance(${prot.idUsr}, 'sub', true, ${prot.idProt})"><i class="bi bi-dash-lg"></i></button>
                        </div>`;
    return `
        <div class="card-header bg-white py-3 border-bottom">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <span class="badge bg-success mb-2 uppercase" style="font-size: 9px;">${lblProt} ${protocoloLabel}</span>
                    ${tituloDisplay ? `<h5 class="fw-bold m-0 text-dark">${tituloDisplay}</h5>` : ''}
                    <div class="small text-muted mt-1">
                        <i class="bi bi-person-circle me-1"></i>${lblInv} <b class="text-dark">${investigadorDisplay}</b>
                    </div>
                </div>
                <div class="text-end">
                    <div class="d-flex flex-column align-items-end gap-1">
                        ${bloqueSaldo}
                    </div>
                </div>
            </div>
        </div>`;
}
function getInsumosProtocoloTableHTML(insumos, idProt) {
    if (!insumos || insumos.length === 0) return '';
    const bd = txBD();
    const tf = txF();
    const bi = txBI();
    const exL = bi.pdf_monto_exento || 'Exento';
    const packs = { bd, tf, bi, exL };
    const titulo = tf.insumos_protocolo ?? 'Insumos del protocolo';
    const { reactivos, otros } = billingPartitionInsumosPedidoReactivoOtros(insumos);
    const lblRea = tf.insumos_prot_subtitulo_reactivos ?? 'Pedidos insumo — reactivos biológicos';
    const lblDem = tf.insumos_prot_subtitulo_demas ?? 'Pedidos insumo — materiales y otros rubros';
    const colspan = 10;
    let tbody = '';
    if (reactivos.length > 0) {
        tbody += billingHtmlInsumoProtSectionHeader(colspan, lblRea);
        tbody += reactivos.map((i) => billingHtmlRowInsumoPedidoFacturacion(i, packs, 'protocolo', idProt)).join('');
    }
    if (otros.length > 0) {
        tbody += billingHtmlInsumoProtSectionHeader(colspan, lblDem);
        tbody += otros.map((i) => billingHtmlRowInsumoPedidoFacturacion(i, packs, 'protocolo', idProt)).join('');
    }
    return `
        <div class="mt-4 border-top pt-3">
            <h6 class="fw-bold text-secondary border-bottom pb-2 mb-3" style="font-size: 11px;"><i class="bi bi-box-seam me-1"></i>${titulo}</h6>
            <div class="table-responsive">
                <table class="table table-bordered table-billing mb-0">
                    <thead class="table-light text-center">
                        <tr>
                            <th style="width:3%"><input type="checkbox" class="check-all-insumo-prot" data-prot="${idProt}"></th>
                            <th style="width:5%">${bd.th_id || 'ID'}</th>
                            <th style="width:8%">${bi.th_estado_cap || 'Estado'}</th>
                            <th style="width:10%">${bi.th_fechas || 'FECHAS'}</th>
                            <th style="width:12%">${bi.th_solicitante_cap || 'Solicitante'}</th>
                            <th style="width:12%" class="small">${bd.th_quien_derivo || 'Derivado por'}</th>
                            <th>${bi.th_concepto_detalle || 'Concepto / Detalle'}</th>
                            <th style="width:10%">${tf.total || 'Total'}</th>
                            <th style="width:10%">${tf.pago || 'Pagado'}</th>
                            <th style="width:10%">${bd.th_debe_uc || 'DEBE'}</th>
                        </tr>
                    </thead>
                    <tbody>${tbody}</tbody>
                </table>
            </div>
        </div>`;
}

function getFormsTableHTML(formularios, idProt) {
    if (!formularios || formularios.length === 0) return '';
    const bd = txBD();
    const bi = txBI();
    const tf = txF();
    const exL = bi.pdf_monto_exento || 'Exento';
    return `
        <h6 class="fw-bold text-secondary border-bottom pb-2 mb-3" style="font-size: 11px;">${bd.sec_pedidos_formularios || 'Pedidos (Formularios)'}</h6>
        <div class="table-responsive">
            <table class="table table-bordered table-billing mb-4 tabla-finanzas">
                <thead class="table-light text-center">
                    <tr>
                        <th style="width:2%"><input type="checkbox" class="check-all-form" data-prot="${idProt}"></th>
                        <th style="width:5%">${bd.th_id || 'ID'}</th>
                        <th style="width:8%">${bd.th_estado || 'ESTADO'}</th>
                        <th style="width:10%">${bi.th_fechas || 'FECHAS'}</th>
                        <th style="width:12%">${bd.th_solicitante || 'SOLICITANTE'}</th>
                        <th style="width:12%" class="small">${bd.th_quien_derivo || 'Derivado por'}</th>
                        <th style="width:14%">${bd.th_especie_cepa || 'ESPECIE / CEPA'}</th>
                        <th style="width:14%">${bd.th_detalle_concepto || 'DETALLE / CONCEPTO'}</th>
                        <th style="width:14%">${bd.th_cantidad_presentacion || 'CANTIDAD / PRESENTACIÓN'}</th>
                        <th style="width:7%">${bd.th_total_uc || 'TOTAL'}</th>
                        <th style="width:7%">${bd.th_pagado_uc || 'PAGADO'}</th>
                        <th style="width:7%">${bd.th_debe_uc || 'DEBE'}</th>
                    </tr>
                </thead>
                <tbody>
                    ${formularios.map(f => {
                        const isExento = billingTipoExento(f);
                        const total = parseFloat(f.total || 0);
                        const pagado = parseFloat(f.pagado || 0);
                        const debe = isExento ? 0 : Math.max(0, total - pagado);
                        const sinMontoNoEx = billingPedidoSinMontoNoExento(isExento, total, pagado);
                        const lblSinTot = tf.pedido_sin_total_cobrable || 'Sin total';

                        const isRea = f.categoria?.toLowerCase().includes('reactivo');
                        const tipoModal = isRea ? 'REACTIVO' : 'ANIMAL';

                        // 🚀 MAGIA VISUAL PARA CANTIDADES Y REACTIVOS
                        let cantidadDisplay = '';
                        if (isRea) {
                            cantidadDisplay = `
                                <div class="text-start lh-sm">
                                    <span class="text-info fw-bold">${f.NombreInsumo || (window.txt?.generales?.reactivo || 'Reactivo')}</span><br>
                                    <small class="text-muted" style="font-size: 10px;">${bd.lbl_pres || 'Pres:'} <b>${f.CantidadInsumo || '-'} ${f.TipoInsumo || ''}</b></small><br>
                                    <span class="badge bg-light text-dark border mt-1 shadow-sm">${bd.lbl_solicitadas || 'Solicitadas:'} <b class="text-primary">${f.cant_organo || 0} ${bd.un_abbr || 'un.'}</b></span>
                                </div>`;
                        } else {
                            cantidadDisplay = `<b class="fs-5 text-dark">${f.cant_animal || 0}</b> <small class="text-muted">${bd.un_abbr || 'un.'}</small>`;
                        }

                        // --- VISUAL: ESPECIE Y ESTADO ---
                        const espDisplay = f.nombre_especie + (f.nombre_subespecie && f.nombre_subespecie !== 'N/A' ? `<br><small class="text-muted">${f.nombre_subespecie}</small>` : '');
                        const fi = bi.fecha_in || 'In:';
                        const fo = bi.fecha_out || 'Out:';
                        const fechasDisplay = `<div class="small"><b>${fi}</b> ${f.fecha || '-'}</div><div class="small text-danger"><b>${fo}</b> ${f.fecRetiroA || '-'}</div>`;
                        const dctoHTML = (f.descuento > 0) ? `<br><span class="badge-discount mt-1 d-inline-block">-${f.descuento}%</span>` : '';
                        
                        let estadoBadge = isExento ? `<span class="badge bg-info text-dark shadow-sm">${bd.badge_exento || 'EXENTO'}</span>` :
                            sinMontoNoEx ? `<span class="badge bg-secondary shadow-sm">${lblSinTot}</span>` :
                                         (debe <= 0 ? `<span class="badge bg-success shadow-sm">${bd.badge_pago_completo || 'PAGO COMPLETO'}</span>` : 
                                         (pagado > 0 ? `<span class="badge bg-warning text-dark shadow-sm">${bd.badge_pago_parcial || 'PAGO PARCIAL'}</span>` : 
                                         `<span class="badge bg-danger shadow-sm">${bd.badge_sin_pagar || 'SIN PAGAR'}</span>`));

                        const rowStyle = (isExento || (debe <= 0 && !sinMontoNoEx)) ? 'background-color: #f8fff9 !important;' : '';

                        return `
                            <tr class="text-center align-middle pointer" style="${rowStyle}" 
                                onclick="if(event.target.tagName !== 'INPUT') window.abrirEdicionFina('${tipoModal}', ${f.id})">
                                <td><input type="checkbox" class="check-item-form" data-prot="${idProt}" data-monto="${debe}" data-id="${f.id}" ${(debe <= 0 || isExento) ? 'disabled' : ''}></td>
                                <td class="small text-muted fw-bold">#${f.id}${billingDerivadaLiquidacionBadge(f)}${billingDerivacionSalienteHint(f)}</td>
                                <td>${estadoBadge}</td>
                                <td>${fechasDisplay}</td>
                                <td class="small fw-bold">${f.solicitante}</td>
                                <td class="small text-start text-muted">${billingDerivacionPlainText(f) || '—'}</td>
                                <td class="small text-secondary">${isRea ? `<span class="badge bg-light text-info border">${bd.badge_reactivo_bio || 'REACTIVO BIOLÓGICO'}</span>` : espDisplay}</td>
                                <td class="text-start ps-3 small">${(f.detalle_display || '').replace(/<[^>]*>/g, "")} ${dctoHTML}</td>
                                <td>${cantidadDisplay}</td>
                                ${billingTdTotalPagadoDebe(isExento, total, pagado, exL)}
                            </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;
}

function getAlojTableHTML(alojamientos, idProt) {
    if (!alojamientos || alojamientos.length === 0) return '';
    const bd = txBD();
    const tf = txF();
    const bp = txBP();
    const thDep = bp.th_aloj_departamento || txBI().col_departamento || 'DEPTO';

    const filas = alojamientos.map(a => {
        const total = parseFloat(a.total || 0);
        const pagado = parseFloat(a.pagado || 0);
        const debe = parseFloat(a.debe || 0);

        let estadoHTML = (debe <= 0) ? `<span class="badge bg-success">${bd.aloj_estado_pago || 'PAGO'}</span>` : 
                         (pagado > 0 ? `<span class="badge bg-warning text-dark">${tf.estado_cobro_parcial || 'PARCIAL'}</span>` : 
                         `<span class="badge bg-danger">${tf.estado_cobro_pendiente || 'PENDIENTE'}</span>`);

        const isDone = (debe <= 0);
        const investigador = a.TitularProtocolo || window.currentReportData.protocolos.find(p => p.idProt == idProt)?.investigador
            || window.txt?.facturacion?.billing_modal?.na || 'N/A';
        const tipoAloj = a.caja || bd.aloj_caja_default || 'Alojamiento estándar';

    return `
        <tr onclick="window.billingRowClickOpenAlojModal(event, ${a.historia})" class="pointer text-center align-middle" ${isDone ? 'style="background-color: #f0fff4 !important;"' : ''}>
            <td>
                <input type="checkbox" class="check-item-aloj" data-prot="${idProt}" data-id="${a.historia}" data-monto="${debe}" ${isDone ? 'disabled' : ''}>
            </td>
            <td>#${a.historia}</td>
            <td>${estadoHTML}</td>
            <td class="small text-start">${(a.nombre_departamento && String(a.nombre_departamento).trim()) ? a.nombre_departamento : '—'}</td>
            <td class="text-start ps-3 small fw-bold">${investigador}</td>
            <td>${a.especie} <br><span class="badge bg-light text-primary border mt-1">${tipoAloj}</span></td>
            <td class="fw-bold">${a.dias}</td>
            <td class="text-end">$ ${formatBillingMoney(total)}</td>
            <td class="text-end text-success">$ ${formatBillingMoney(pagado)}</td>
            <td class="text-end text-danger fw-bold">$ ${formatBillingMoney(debe)}</td>
        </tr>`;
    }).join('');

    return `
        <div class="mt-4">
            <h6 class="fw-bold text-muted mb-3 uppercase" style="font-size: 10px;">${bd.sec_estadias_aloj || 'Estadías / Alojamientos'}</h6>
            <table class="table table-bordered table-billing mb-0">
                <thead class="table-dark text-center">
                    <tr>
                        <th style="width:3%"><input type="checkbox" class="check-all-aloj" data-prot="${idProt}"></th>
                        <th style="width:7%">${bd.th_hist || 'Hist.'}</th>
                        <th style="width:8%">${window.txt?.generales?.estado || 'Estado'}</th>
                        <th style="width:10%" class="small">${thDep}</th>
                        <th>${tf.titular_paga || 'Titular (Responsable Financiero)'}</th>
                        <th style="width:15%">${tf.esp_tipo_aloj || 'Especie / Tipo Aloj.'}</th>
                        <th style="width:5%">${tf.dias || 'Días'}</th>
                        <th style="width:8%">${tf.total || 'Total'}</th>
                        <th style="width:8%">${tf.pago || 'Pago'}</th>
                        <th style="width:8%">${tf.falta || 'Falta'}</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>`;
}

function getFooterHTML(prot, showAni, showAlo, showIns) {
    const tf = txF();
    let totAni = 0, totRea = 0, totOtr = 0, totAlo = 0, totIns = 0;
    let sumTotal = 0, sumPagado = 0, sumDebe = 0;

    if (showAni && prot.formularios) {
        prot.formularios.forEach(f => {
            const t = parseFloat(f.total || 0), p = parseFloat(f.pagado || 0), d = parseFloat(f.debe || 0);
            const ex = billingTipoExento(f);
            if (!ex) {
                sumTotal += t; sumPagado += p; sumDebe += d;
            }
            const cat = (f.categoria || '').toLowerCase();
            if (ex) return;
            if (cat.includes('otros reactivos biologicos')) totOtr += t;
            else if (cat.includes('reactivo')) totRea += t;
            else totAni += t;
        });
    }

    if (showAlo && prot.alojamientos) {
        prot.alojamientos.forEach(a => {
            const t = parseFloat(a.total || 0), p = parseFloat(a.pagado || 0), d = parseFloat(a.debe || 0);
            totAlo += t; sumTotal += t; sumPagado += p; sumDebe += d;
        });
    }

    if (showIns && prot.insumos) {
        const sIns = billingSumInsumosCobrable(prot.insumos);
        totIns = sIns.total;
        sumTotal += sIns.total;
        sumPagado += sIns.pagado;
        sumDebe += sIns.debe;
    }

    const isSinProtocolo = (prot.idProt === 0);
    const tieneInsumosProt = showIns && prot.insumos && prot.insumos.length > 0;
    const lblPagarIns = tf.btn_pagar_insumos_prot || 'Pagar insumos';
    const bloquePagoInsumos = (!isSinProtocolo && tieneInsumosProt) ? `
                <div class="d-flex align-items-center gap-2 border-start ps-3 ms-2">
                    <div class="text-end">
                        <small class="text-muted d-block fw-bold uppercase" style="font-size: 9px;">${tf.seleccion_insumos_lbl || 'Insumos seleccionados'}:</small>
                        <span class="fs-6 fw-bold text-primary" id="pago-insumos-seleccionado-${prot.idProt}">$ ${formatBillingMoney(0)}</span>
                    </div>
                    <button type="button" class="btn btn-outline-primary fw-bold px-3 shadow-sm" onclick="window.procesarPagoInsumosProtocolo(${prot.idProt})">
                        <i class="bi bi-box-seam me-1"></i> ${lblPagarIns}
                    </button>
                </div>` : '';

    const bloquePago = isSinProtocolo ? `
                <div class="small text-muted">${tf.liquidar_sin_protocolo_ayuda || 'Para liquidar pedidos sin protocolo use Facturación por investigador.'}</div>` : `
                <div class="d-flex align-items-center gap-3">
                    <div class="text-end me-2">
                        <small class="text-muted d-block fw-bold uppercase" style="font-size: 9px;">${tf.seleccionado_lbl || 'Seleccionado'}:</small>
                        <span class="fs-5 fw-bold text-primary" id="pago-seleccionado-${prot.idProt}">$ ${formatBillingMoney(0)}</span>
                    </div>
                <button type="button" class="btn btn-primary fw-bold px-4 shadow-sm" onclick="window.procesarPagoProtocolo(${prot.idProt})">
                        <i class="bi bi-wallet2 me-2"></i> ${tf.btn_pagar_sel || 'Pagar Selección'}
                    </button>
                    ${bloquePagoInsumos}
                </div>`;

return `
        <div class="card-footer bg-white border-top py-3 shadow-sm">
            <div class="row mb-3">
                <div class="col-md-12 d-flex gap-4 border-bottom pb-2">
                    ${totAlo > 0 ? `<div class="small text-muted">${window.txt?.menu?.accommodations || 'Alojamientos'}: <b>$ ${formatBillingMoney(totAlo)}</b></div>` : ''}
                    ${totAni > 0 ? `<div class="small text-muted">${window.txt?.menu?.animals || 'Animales'}: <b>$ ${formatBillingMoney(totAni)}</b></div>` : ''}
                    ${totRea > 0 ? `<div class="small text-muted">${window.txt?.menu?.reagents || 'Reactivos'}: <b>$ ${formatBillingMoney(totRea)}</b></div>` : ''}
                    ${totIns > 0 ? `<div class="small text-muted">${tf.filtro_insumos || 'Insumos'}: <b>$ ${formatBillingMoney(totIns)}</b></div>` : ''}
                </div>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <div class="d-flex gap-5 align-items-center">
                    <div class="text-center">
                        <small class="text-muted text-uppercase fw-bold" style="font-size:9px">${tf.total || 'Total'} ${tf.label_protocolo || 'Protocolo'}</small>
                        <b class="fs-6 d-block text-dark">$ ${formatBillingMoney(sumTotal)}</b>
                    </div>
                    <div class="text-center">
                        <small class="text-muted text-uppercase fw-bold" style="font-size:9px">${tf.pago || 'Pago'}</small>
                        <b class="fs-6 text-success d-block">$ ${formatBillingMoney(sumPagado)}</b>
                    </div>
                    <div class="text-center">
                        <small class="text-muted text-uppercase fw-bold" style="font-size:10px">${tf.falta || 'Falta'}</small>
                        <b class="fs-6 text-danger d-block">$ ${formatBillingMoney(sumDebe)}</b>
                    </div>
                <button type="button" class="btn btn-link btn-sm text-danger p-0 ms-2" onclick="window.downloadProtocoloPDF(${prot.idProt})">
                        <i class="bi bi-file-earmark-pdf fs-4"></i>
                    </button>
                </div>

                ${bloquePago}
            </div>
        </div>`;
}

function vincularCheckboxes() {
    document.querySelectorAll('.check-all-form, .check-all-aloj').forEach(chkAll => {
        chkAll.addEventListener('change', (e) => {
            const protId = e.target.dataset.prot;
            const selector = e.target.classList.contains('check-all-form') ? `.check-item-form[data-prot="${protId}"]` : `.check-item-aloj[data-prot="${protId}"]`;
            document.querySelectorAll(selector).forEach(item => { if (!item.disabled) item.checked = e.target.checked; });
            actualizarSumaPago(protId);
        });
    });
    document.querySelectorAll('.check-item-form, .check-item-aloj').forEach(item => {
        item.addEventListener('change', function() { actualizarSumaPago(this.dataset.prot); });
    });
}

function actualizarSumaPago(protId) {
    let suma = 0;
    const card = document.getElementById(`card-prot-${protId}`);
    if (!card) return;
    card.querySelectorAll('input[type="checkbox"]:checked:not(.check-all-form):not(.check-all-aloj)').forEach(chk => {
        suma += parseFloat(chk.dataset.monto || 0);
    });
    const txtTotal = document.getElementById(`total-seleccionado-${protId}`);
    if (txtTotal) txtTotal.innerText = `$ ${formatBillingMoney(suma)}`;
}

window.abrirAyudaBilling = () => { new bootstrap.Modal(document.getElementById('modal-billing-help')).show(); };

function getInsumosGeneralesTableHTML(insumos) {
    if (!insumos || insumos.length === 0) return '';
    const bd = txBD();
    const tf = txF();
    const bi = txBI();
    const exL = bi.pdf_monto_exento || 'Exento';
    const packs = { bd, tf, bi, exL };
    const sums = billingSumInsumosCobrable(insumos);
    const sumTotal = sums.total;
    const sumPagado = sums.pagado;
    const sumDebe = sums.debe;
    const { reactivos, otros } = billingPartitionInsumosPedidoReactivoOtros(insumos);
    const lblRea = tf.insumos_prot_subtitulo_reactivos ?? 'Pedidos insumo — reactivos biológicos';
    const lblDem = tf.insumos_prot_subtitulo_demas ?? 'Pedidos insumo — materiales y otros rubros';
    const colspan = 10;
    let filas = '';
    if (reactivos.length > 0) {
        filas += billingHtmlInsumoProtSectionHeader(colspan, lblRea);
        filas += reactivos.map(i => billingHtmlRowInsumoPedidoFacturacion(i, packs, 'general')).join('');
    }
    if (otros.length > 0) {
        filas += billingHtmlInsumoProtSectionHeader(colspan, lblDem);
        filas += otros.map(i => billingHtmlRowInsumoPedidoFacturacion(i, packs, 'general')).join('');
    }

    return `
        <div class="card shadow-sm border-0 mb-5 card-insumos-generales" style="border-left: 5px solid #0d6efd !important;">
            <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h5 class="m-0 text-primary fw-bold"><i class="bi bi-box-seam-fill me-2"></i>${bd.card_insumos_depto_titulo || 'Insumos Generales del Departamento'}</h5>
                <button class="btn btn-link btn-sm text-danger p-0" onclick="window.downloadInsumosPDF()"><i class="bi bi-filetype-pdf fs-4"></i></button>
            </div>
            <div class="card-body p-0">
                <table class="table table-bordered table-billing mb-0">
                    <thead class="table-dark text-center">
                        <tr>
                            <th style="width:3%"><input type="checkbox" id="check-all-insumos-gen"></th>
                            <th style="width:5%">${bd.th_id || 'ID'}</th>
                            <th style="width:8%">${window.txt?.generales?.estado || 'Estado'}</th>
                            <th style="width:10%">${bi.th_fechas || 'FECHAS'}</th>
                            <th style="width:15%">${bd.th_solicitante || 'Solicitante'}</th>
                            <th style="width:14%" class="small">${bd.th_quien_derivo || 'Derivado por'}</th>
                            <th>${bd.th_conceptos_cantidades || 'Conceptos y Cantidades (Agrupados)'}</th> 
                            <th style="width:10%">${tf.total || 'Total'}</th>
                            <th style="width:10%">${tf.pago || 'Pago'}</th>
                            <th style="width:10%">${bd.th_debe_uc || 'DEBE'}</th>
                        </tr>
                    </thead>
                    <tbody>${filas}</tbody>
                </table>
            </div>
            <div class="card-footer bg-light py-3 border-top">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex gap-5">
                        <div class="text-center">
                            <small class="d-block text-muted uppercase" style="font-size:9px">${bd.footer_insumos_total || 'Total Insumos'}</small>
                            <b class="fs-6">$ ${formatBillingMoney(sumTotal)}</b>
                        </div>
                        <div class="text-center">
                            <small class="d-block text-muted uppercase" style="font-size:9px">${bd.footer_insumos_pagado || 'Total Pago'}</small>
                            <b class="fs-6 text-success">$ ${formatBillingMoney(sumPagado)}</b>
                        </div>
                        <div class="text-center">
                            <small class="d-block text-muted uppercase" style="font-size:9px">${bd.footer_insumos_falta || 'Total Falta'}</small>
                            <b class="fs-6 text-danger">$ ${formatBillingMoney(sumDebe)}</b>
                        </div>
                    </div>
                    <div class="text-end">
                        <span class="fs-4 fw-bold text-primary" id="total-insumos-seleccionados">$ ${formatBillingMoney(0)}</span>
                        <button class="btn btn-primary btn-sm fw-bold ms-3 shadow-sm" onclick="window.procesarPagoInsumosGenerales()">
                            <i class="bi bi-wallet2 me-1"></i> ${tf.btn_pagar_sel || 'Pagar Selección'}
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
}

function vincularCheckboxesInsumos() {
    const master = document.getElementById('check-all-insumos-gen');
    if (!master) return;
    master.addEventListener('change', (e) => {
        const items = document.querySelectorAll('.check-item-insumo-global:not(:disabled)');
        items.forEach(chk => chk.checked = e.target.checked);
        actualizarSumaInsumos();
    });
    document.querySelectorAll('.check-item-insumo-global').forEach(chk => {
        chk.addEventListener('change', actualizarSumaInsumos);
    });
}

function actualizarSumaInsumos() {
    let suma = 0;
    document.querySelectorAll('.check-item-insumo-global:checked').forEach(chk => { suma += parseFloat(chk.dataset.monto || 0); });
    const display = document.getElementById('total-insumos-seleccionados');
    if (display) display.innerText = `$ ${formatBillingMoney(suma)}`;
}

window.exportExcelDeptoGlobal = () => {
    if (!window.currentReportData) return Swal.fire(window.txt?.generales?.swal_aviso || window.txt?.recuperar?.swal_aviso || 'Aviso', txF().sin_datos_cargados || 'No hay datos cargados.', 'info');
    
    const inst = (localStorage.getItem('NombreInst') || 'BIOTERIO').toUpperCase();
    const be = txBE();
    const marcaExExcel = billingPdfMarcaExentoLarga();
    const biEx = txBI();
    const C = {
        dp: be.excel_depto_prot || 'Departamento / Protocolo',
        iu: be.excel_id_usuario || 'ID Usuario',
        sol: be.excel_solicitante || 'Solicitante',
        qd: be.excel_quien_derivo || 'Derivado por',
        ti: be.excel_tipo_item || 'Tipo Item',
        ids: be.excel_id_sistema || 'ID Sistema',
        fe: be.excel_fechas || biEx.th_fechas || 'FECHAS',
        cd: be.excel_concepto_detalle || 'Concepto / Detalle',
        ct: be.excel_costo_total || 'Costo Total',
        mp: be.excel_monto_pagado || 'Monto Pagado',
        da: be.excel_deuda_actual || 'Deuda Actual'
    };
    const deptoNombre = document.getElementById('sel-depto')?.selectedOptions[0]?.text || txBD().depto_nombre_sin_sel || 'GENERAL';
    const dataMatrix = [];
    const row = (vals) => {
        const o = {};
        o[C.dp] = vals.dp; o[C.iu] = vals.iu; o[C.sol] = vals.sol; o[C.qd] = vals.qd; o[C.ti] = vals.ti;
        o[C.ids] = vals.ids; o[C.fe] = vals.fe; o[C.cd] = vals.cd; o[C.ct] = vals.ct; o[C.mp] = vals.mp; o[C.da] = vals.da;
        return o;
    };
    const tplAloj = (esp, caja) => (be.excel_aloj_concepto_tpl || 'Alojamiento {esp} ({caja})').replace(/\{esp\}/g, esp).replace(/\{caja\}/g, caja);
    const lblDer = window.txt?.facturacion?.billing_institucion?.origen_badge_derivado ?? 'Derivado';

    if (window.currentReportData.insumosGenerales) {
        window.currentReportData.insumosGenerales.forEach(i => {
            const tiIns = be.excel_tipo_insumo || 'INSUMO';
            const tiInsMark =
                i.es_facturacion_derivada === 1 || i.es_facturacion_derivada === true
                    ? `${tiIns} — ${lblDer}`
                    : tiIns;
            dataMatrix.push(row({
                dp: be.excel_ins_generales || 'INSUMOS GENERALES',
                iu: i.IdUsrA,
                sol: i.solicitante,
                qd: billingDerivacionPlainText(i),
                ti: tiInsMark,
                ids: billingPdfFormularioIdDisplay(i, { style: 'plain', marcaExento: marcaExExcel }),
                fe: billingFormatPedidoFechasPlain(i, biEx),
                cd: (i.detalle_completo || "").replace(/\|/g, " - "),
                ct: billingInsumoMontoTotalCobrable(i),
                mp: parseFloat(i.pagado || 0),
                da: parseFloat(i.debe || 0)
            }));
        });
    }

    window.currentReportData.protocolos.forEach(prot => {
        (prot.formularios || []).forEach(f => {
            const tiBase = f.categoria?.toLowerCase().includes('reactivo')
                ? (be.excel_tipo_reactivo || 'REACTIVO')
                : (be.excel_tipo_animal || 'ANIMAL');
            const tiForm =
                f.es_facturacion_derivada === 1 || f.es_facturacion_derivada === true
                    ? `${tiBase} — ${lblDer}`
                    : tiBase;
            dataMatrix.push(row({
                dp: `PROT: ${prot.nprotA}`,
                iu: prot.idUsr,
                sol: f.solicitante || prot.investigador,
                qd: billingDerivacionPlainText(f),
                ti: tiForm,
                ids: billingPdfFormularioIdDisplay(f, { style: 'plain', marcaExento: marcaExExcel }),
                fe: billingFormatPedidoFechasPlain(f, biEx),
                cd: (f.detalle_display || "").replace(/<[^>]*>/g,''),
                ct: parseFloat(f.total || 0),
                mp: parseFloat(f.pagado || 0),
                da: parseFloat(f.debe || 0)
            }));
        });
        (prot.alojamientos || []).forEach(a => {
            const diasU = String(be.excel_aloj_dias_unit || be.pdf_aloj_dias_unit || 'd').trim() || 'd';
            const perTxt = billingAlojPeriodoParaInforme(a, { diasUnit: diasU, emptyLabel: '' });
            const cdAloj = perTxt
                ? `${tplAloj(a.especie, a.caja)} — ${perTxt}`
                : tplAloj(a.especie, a.caja);
            dataMatrix.push(row({
                dp: `PROT: ${prot.nprotA}`,
                iu: prot.idUsr,
                sol: a.TitularProtocolo || prot.investigador,
                qd: '',
                ti: be.excel_tipo_aloj || 'ALOJAMIENTO',
                ids: a.historia,
                fe: perTxt || '-',
                cd: cdAloj,
                ct: parseFloat(a.total || 0),
                mp: parseFloat(a.pagado || 0),
                da: parseFloat(a.debe || 0)
            }));
        });
    });

    const worksheet = XLSX.utils.json_to_sheet(dataMatrix);
    const workbook = XLSX.utils.book_new();
    const sheetName = (be.excel_sheet || 'Facturación').substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    const pref = be.excel_archivo_prefijo || 'Facturacion';
    const nombreArchivoSeguro = `${pref}_${deptoNombre}_${inst}`.replace(/[^a-zA-Z0-9_ \-\(\)]/g, "_");
    XLSX.writeFile(workbook, `${nombreArchivoSeguro}.xlsx`);
};

document.addEventListener('change', (e) => {
    const t = e.target;
    if (!t.matches('.check-item-form, .check-item-aloj, .check-all-form, .check-all-aloj')) return;
    const idProt = t.dataset.prot;

    if (t.classList.contains('check-all-form')) {
        document.querySelectorAll(`.check-item-form[data-prot="${idProt}"]:not(:disabled)`).forEach(c => c.checked = t.checked);
    }
    if (t.classList.contains('check-all-aloj')) {
        document.querySelectorAll(`.check-item-aloj[data-prot="${idProt}"]:not(:disabled)`).forEach(c => c.checked = t.checked);
    }
    actualizarMontoVisual(idProt);
});

function actualizarMontoVisual(idProt) {
    const visor = document.getElementById(`pago-seleccionado-${idProt}`);
    if (!visor) return;

    let total = 0;
    const seleccionados = document.querySelectorAll(
        `.check-item-form[data-prot="${idProt}"]:checked, .check-item-aloj[data-prot="${idProt}"]:checked`
    );
    seleccionados.forEach(chk => { total += parseFloat(chk.dataset.monto || 0); });

    visor.innerText = `$ ${formatBillingMoney(total)}`;
    
    if (total > 0) {
        visor.classList.replace('text-primary', 'text-success');
        visor.classList.add('fw-bold');
    } else {
        visor.classList.replace('text-success', 'text-primary');
        visor.classList.remove('fw-bold');
    }
}

function aplicarEstilosTablas() {
    if (document.getElementById('estilos-gecko-hover')) return;
    const style = document.createElement('style');
    style.id = 'estilos-gecko-hover';
    style.innerHTML = `
        .table-billing tbody tr { transition: all 0.2s; }
        .table-billing tbody tr:hover td { background-color: #e8f5e9 !important; color: #000 !important; }
        
        /* FILAS CLICKEABLES */
        .pointer { cursor: pointer !important; }
        .pointer:hover { background-color: #e8f5e9 !important; }
        
        /* MAGIA: QUitar manito de la primera columna (Checkbox) */
        .pointer td:first-child { cursor: default !important; }
        .pointer td:first-child input[type="checkbox"] { cursor: pointer !important; }
        
        .badge-discount { font-size: 0.7rem; padding: 2px 5px; background-color: #d1e7dd; color: #0f5132; border: 1px solid #badbcc; border-radius: 4px; margin-left: 5px; }
    `;
    document.head.appendChild(style);
}

function getSelectedDateRangeLabel() {
    const sep = txBI().fecha_rango_sep || ' a ';
    const desde = document.getElementById('f-desde')?.value || '';
    const hasta = document.getElementById('f-hasta')?.value || '';
    if (!desde && !hasta) return '-';
    if (desde && hasta) return `${desde}${sep}${hasta}`;
    return desde || hasta;
}

window.downloadProtocoloPDF = async (idProt) => {
    const tf = txF();
    if (!window.currentReportData || !window.currentReportData.protocolos || window.currentReportData.protocolos.length === 0) {
        return Swal.fire(window.txt?.generales?.swal_aviso || window.txt?.recuperar?.swal_aviso || 'Aviso', txBD().aviso_pdf_sin_consulta || 'Primero debe realizar una consulta para exportar los datos.', 'info');
    }

    const prot = window.currentReportData.protocolos.find(p => p.idProt == idProt);
    if (!prot) return Swal.fire(window.txt?.generales?.error || 'Error', tf.error_info_no_encontrada || 'No se encontró la información del protocolo.', 'error');

    showLoader();

    try {
        const bi = txBI();
        const bp = txBP();
        const be = txBE();
        const lblTotPdf = bi.pdf_col_total || bi.pdf_col_precio || 'Total';
        const lblPagPdf = bi.pdf_col_pagado || bi.pdf_col_pago_total || 'Pagado';
        const lblDebPdf = bi.pdf_col_debe || 'Debe';
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const M = 18;
        const pageW = doc.internal.pageSize.getWidth();
        const right = pageW - M;
        const biCab = txBI();
        const inst = (getBillingNombreInstitucion() || biCab.pdf_inst_generica || 'INSTITUCIÓN').toUpperCase();
        const verdeGecko = [25, 135, 84];
        const rangoFechas = getSelectedDateRangeLabel();
        const marcaEx = billingPdfMarcaExentoCorta();

        doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(verdeGecko[0], verdeGecko[1], verdeGecko[2]);
        doc.text(inst, 105, M, { align: "center" });

        doc.setFontSize(11); doc.setTextColor(100);
        doc.text(bp.pdf_titulo_detalle_prot || 'ESTADO DE CUENTA DETALLADO POR PROTOCOLO', 105, M + 7, { align: "center" });
        doc.setDrawColor(verdeGecko[0], verdeGecko[1], verdeGecko[2]);
        doc.line(M, M + 10, right, M + 10);

        doc.setFontSize(10); doc.setTextColor(0);
        doc.text(bp.pdf_uc_protocolo || 'PROTOCOLO:', M, M + 20);
        doc.setFont("helvetica", "normal"); doc.text(`${prot.tituloA} (${prot.nprotA})`, 50, M + 20);
        doc.setFont("helvetica", "bold"); doc.text(bp.pdf_uc_responsable || 'RESPONSABLE:', M, M + 26);
        doc.setFont("helvetica", "normal"); doc.text(`${prot.investigador} (ID: ${prot.idUsr})`, 50, M + 26);
        doc.setFont("helvetica", "bold"); doc.text(bp.pdf_uc_fecha_reporte || 'FECHA REPORTE:', M, M + 32);
        doc.setFont("helvetica", "normal"); doc.text(`${formatBillingDateTime()}`, 50, M + 32);
        doc.setFont("helvetica", "bold"); doc.text(bi.pdf_rango_filtrado || 'RANGO FILTRADO:', M, M + 38);
        doc.setFont("helvetica", "normal"); doc.text(`${rangoFechas}`, 50, M + 38);

        let currentY = M + 46;

        if (prot.formularios && prot.formularios.length > 0) {
            const exL = bi.pdf_monto_exento || 'Exento';
            const bodyForms = prot.formularios.map(f => {
                const isEx = billingTipoExento(f);
                const total = parseFloat(f.total || 0);
                const pagadoReal = parseFloat(f.pagado || 0);
                const m = pdfColsPrecioDebePagoTotal(isEx, total, pagadoReal, exL);
                const c = pdfColsPdfOrdenTotalPagadoDebe(m);
                return [
                    billingPdfFormularioIdDisplay(f, { marcaExento: marcaEx }),
                    billingFormatPedidoFechasPlain(f, bi),
                    f.nombre_especie || '---',
                    (f.detalle_display || "").replace(/<\/?[^>]+(>|$)/g, ""),
                    c[0], c[1], c[2]
                ];
            });

            doc.autoTable({
                startY: currentY,
                margin: { left: M, right: M },
                head: [[
                    bi.pdf_col_id || 'ID',
                    bi.pdf_col_fecha || 'Fechas',
                    bi.pdf_col_especie || 'Especie',
                    bi.pdf_col_concepto || 'Concepto',
                    lblTotPdf,
                    lblPagPdf,
                    lblDebPdf
                ]],
                body: bodyForms,
                theme: 'grid',
                headStyles: { fillColor: verdeGecko },
                styles: { fontSize: 8 },
                columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right', fontStyle: 'bold' } }
            });
            currentY = doc.lastAutoTable.finalY + 10;
        }

        if (prot.alojamientos && prot.alojamientos.length > 0) {
            const tplCajaPer = (caja, periodo) => (be.pdf_periodo_caja_tpl || 'Caja: {caja} | {periodo}').replace(/\{caja\}/g, caja).replace(/\{periodo\}/g, periodo);
            const exLAloj = bi.pdf_monto_exento || 'Exento';
            const bodyAloj = prot.alojamientos.map(a => {
                const m = pdfColsPrecioDebePagoTotal(billingTipoExento(a), a.total, a.pagado || 0, exLAloj);
                const c = pdfColsPdfOrdenTotalPagadoDebe(m);
                return [`H-${a.historia}`, a.especie, tplCajaPer(a.caja, a.periodo), c[0], c[1], c[2]];
            });

            doc.autoTable({
                startY: currentY,
                margin: { left: M, right: M },
                head: [[
                    bp.pdf_th_hist_abrev || 'Hist.',
                    bi.pdf_col_especie || 'Especie',
                    bp.pdf_col_periodo_aloj || 'Periodo alojamiento',
                    lblTotPdf,
                    lblPagPdf,
                    lblDebPdf
                ]],
                body: bodyAloj,
                theme: 'grid',
                headStyles: { fillColor: [40, 40, 40] },
                styles: { fontSize: 8 },
                columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } }
            });
            currentY = doc.lastAutoTable.finalY + 15;
        }

        if (currentY > 250) { doc.addPage(); currentY = M; }

        const sF = billingSumFormulariosCobrable(prot.formularios);
        const sA = billingSumAlojamientos(prot.alojamientos || []);
        const pTotal = sF.total + sA.total;
        const pPago = sF.pagado + sA.pagado;
        const pDebe = sF.debe + sA.debe;

        doc.setDrawColor(200); doc.setFillColor(245, 245, 245); doc.rect(120, currentY, 70, 25, 'FD');
        doc.setFontSize(9); doc.setTextColor(100);
        doc.text(`${lblTotPdf}:`, 125, currentY + 7);
        doc.text(`${lblPagPdf}:`, 125, currentY + 13);
        doc.text(`${lblDebPdf}:`, 125, currentY + 19);
        doc.setFont("helvetica", "bold"); doc.setTextColor(0); doc.text(`$ ${formatBillingMoney(pTotal)}`, 185, currentY + 7, { align: "right" });
        doc.setTextColor(verdeGecko[0], verdeGecko[1], verdeGecko[2]); doc.text(`$ ${formatBillingMoney(pPago)}`, 185, currentY + 13, { align: "right" });
        doc.setTextColor(200, 0, 0); doc.text(`$ ${formatBillingMoney(pDebe)}`, 185, currentY + 19, { align: "right" });

        doc.save(`Ficha_Financiera_Prot_${prot.nprotA}.pdf`);

    } catch (e) {
        console.error("Error generando PDF:", e);
        Swal.fire(window.txt?.generales?.error || 'Error', tf.error_pdf || 'No se pudo generar el documento PDF.', 'error');
    } finally { hideLoader(); }
};

window.downloadInsumosPDF = async () => {
    const tf = txF();
    const bi = txBI();
    const bp = txBP();
    const be = txBE();
    const av = window.txt?.generales?.swal_aviso || window.txt?.recuperar?.swal_aviso || 'Aviso';
    if (!window.currentReportData || !window.currentReportData.insumosGenerales) {
        return Swal.fire(av, be.swal_sin_insumos_cargados || 'No hay datos de insumos cargados.', 'info');
    }

    const insumos = window.currentReportData.insumosGenerales;
    if (insumos.length === 0) return Swal.fire(av, be.swal_sin_insumos_vacio || 'No hay insumos para reportar.', 'info');

    showLoader();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const M = 18;
    const pageW = doc.internal.pageSize.getWidth();
    const right = pageW - M;
    const inst = (getBillingNombreInstitucion() || bi.pdf_inst_generica || 'INSTITUCIÓN').toUpperCase();
    const deptoNombre = document.getElementById('sel-depto')?.selectedOptions[0]?.text || txBD().depto_nombre_sin_sel || 'GENERAL';
    const azulInsumos = [13, 110, 253];
    const rangoFechas = getSelectedDateRangeLabel();

    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(azulInsumos[0], azulInsumos[1], azulInsumos[2]);
    doc.text(inst, 105, M, { align: "center" });
    doc.setFontSize(11); doc.setTextColor(100); doc.text(be.pdf_reporte_insumos || 'REPORTE DE INSUMOS GENERALES', 105, M + 7, { align: "center" });
    doc.setFontSize(9); doc.text(`${bp.pdf_uc_departamento || 'DEPARTAMENTO:'} ${deptoNombre.toUpperCase()}`, 105, M + 12, { align: "center" });
    doc.setFontSize(9); doc.text(`${bi.pdf_rango_filtrado || 'RANGO FILTRADO:'} ${rangoFechas}`, 105, M + 16, { align: "center" });
    doc.line(M, M + 19, right, M + 19);

    const lblTotPdf = bi.pdf_col_total || bi.pdf_col_precio || 'Total';
    const lblPagPdf = bi.pdf_col_pagado || bi.pdf_col_pago_total || 'Pagado';
    const lblDebPdf = bi.pdf_col_debe || 'Debe';
    const exL = bi.pdf_monto_exento || 'Exento';
    const marcaExPdfIns = billingPdfMarcaExentoLarga();
    const body = insumos.map(i => {
        const m = pdfColsPrecioDebePagoTotal(billingTipoExento(i), billingInsumoMontoTotalCobrable(i), i.pagado || 0, exL);
        const c = pdfColsPdfOrdenTotalPagadoDebe(m);
        const idPdf = billingPdfFormularioIdDisplay(i, { style: 'plain', marcaExento: marcaExPdfIns });
        return [
            String(idPdf).substring(0, 26),
            billingFormatPedidoFechasPlain(i, bi),
            i.solicitante,
            (i.detalle_completo || "").split(' | ').join('\n'),
            c[0], c[1], c[2]
        ];
    });

    doc.autoTable({
        startY: M + 24, margin: { left: M, right: M }, head: [[
            bi.pdf_col_id || 'ID',
            bi.pdf_col_fecha || 'Fechas',
            txBD().th_solicitante || 'Solicitante',
            be.pdf_head_detalle_prod || 'Detalle de Productos / Cantidades',
            lblTotPdf,
            lblPagPdf,
            lblDebPdf
        ]],
        body: body, theme: 'striped', headStyles: { fillColor: azulInsumos },
        styles: { fontSize: 8, overflow: 'linebreak', cellPadding: 3 },
        columnStyles: { 3: { cellWidth: 60 }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right', fontStyle: 'bold' } }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    const totalDeudaInsumos = billingSumInsumosCobrable(insumos).debe;
    doc.setFontSize(10); doc.setTextColor(0); doc.setFont("helvetica", "bold");
    doc.text(`${be.pdf_total_deuda_ins || 'TOTAL DEUDA PENDIENTE INSUMOS:'} $ ${formatBillingMoney(totalDeudaInsumos)}`, 190, finalY, { align: "right" });

    doc.save(`Reporte_Insumos_${deptoNombre}.pdf`);
    hideLoader();
};

window.downloadGlobalPDF = async () => {
    const tf = txF();
    const bi = txBI();
    const bd = txBD();
    const bp = txBP();
    const be = txBE();
    if (!window.currentReportData) {
        return Swal.fire(window.txt?.generales?.swal_aviso || window.txt?.recuperar?.swal_aviso || 'Aviso', tf.sin_datos_cargados || 'No hay datos cargados.', 'info');
    }
    
    showLoader();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const M = 18;
    const pageW = doc.internal.pageSize.getWidth();
    const right = pageW - M;
    const instNombre = (getBillingNombreInstitucion() || bi.pdf_inst_generica || 'INSTITUCIÓN').toUpperCase();
    const deptoNombre = document.getElementById('sel-depto')?.selectedOptions[0]?.text || txBD().depto_nombre_sin_sel || 'GENERAL';
    const verdeGrobo = [26, 93, 59];
    const rangoFechas = getSelectedDateRangeLabel();
    const unAb = bd.un_abbr || 'un.';
    const marcaExFull = billingPdfMarcaExentoLarga();
    const cajaDef = be.pdf_caja_def || 'Caja';
    const enCurso = be.pdf_en_curso || 'EN CURSO';
    const lblTotPdf = bi.pdf_col_total || bi.pdf_col_precio || 'Total';
    const lblPagPdf = bi.pdf_col_pagado || bi.pdf_col_pago_total || 'Pagado';
    const lblDebPdf = bi.pdf_col_debe || 'Debe';

    doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(45, 45, 45);
    doc.text(instNombre, 148, M, { align: "center" });
    doc.setFontSize(22); doc.setTextColor(verdeGrobo[0], verdeGrobo[1], verdeGrobo[2]);
    doc.text(be.pdf_reporte_fact || 'REPORTE DE FACTURACIÓN', 148, M + 7, { align: "center" });
    doc.setFontSize(12); doc.setTextColor(100); doc.text(`${bp.pdf_uc_departamento || 'DEPARTAMENTO:'} ${deptoNombre.toUpperCase()}`, 148, M + 14, { align: "center" });
    doc.setFontSize(10); doc.text(`${bi.pdf_rango_filtrado || 'RANGO FILTRADO:'} ${rangoFechas}`, 148, M + 19, { align: "center" });
    doc.setDrawColor(verdeGrobo[0], verdeGrobo[1], verdeGrobo[2]); doc.line(M, M + 22, right, M + 22);

    const t = window.currentReportData.totales;
    doc.autoTable({
        startY: M + 28, margin: { left: M, right: M }, head: [[
            bi.pdf_deu_animales || 'DEUDA ANIMALES',
            bi.pdf_deu_reactivos || 'DEUDA REACTIVOS',
            bi.pdf_deu_aloj || 'DEUDA ALOJAMIENTO',
            bi.pdf_deu_insumos || 'DEUDA INSUMOS',
            be.pdf_head_pagado_global || 'PAGADO GLOBAL',
            be.pdf_head_deuda_global || 'DEUDA GLOBAL'
        ]],
        body: [[
            `$ ${formatBillingMoney(t.deudaAnimales)}`, `$ ${formatBillingMoney(t.deudaReactivos)}`, `$ ${formatBillingMoney(t.deudaAlojamiento)}`, 
            `$ ${formatBillingMoney(t.deudaInsumos)}`, `$ ${formatBillingMoney(t.totalPagado)}`,
            { content: `$ ${formatBillingMoney(t.globalDeuda)}`, styles: { textColor: [180, 0, 0], fontStyle: 'bold' } }
        ]],
        theme: 'grid', headStyles: { fillColor: [40, 40, 40], halign: 'center' }, styles: { halign: 'center', fontSize: 10 }
    });

    let currentY = doc.lastAutoTable.finalY + 12;
    const lineProtInv = (nprot, inv) => (be.pdf_line_prot_inv || 'PROT: {nprot} | INVESTIGADOR: {inv}').replace(/\{nprot\}/g, nprot).replace(/\{inv\}/g, inv);

    window.currentReportData.protocolos.forEach((prot) => {
        if (currentY > 180) { doc.addPage(); currentY = M; }

        doc.setFillColor(245, 245, 245); doc.rect(M, currentY, right - M, 8, 'F');
        doc.setFontSize(10); doc.setTextColor(verdeGrobo[0], verdeGrobo[1], verdeGrobo[2]);
        doc.text(lineProtInv(prot.nprotA, prot.investigador), M + 3, currentY + 6);

        if (prot.formularios?.length > 0) {
            const bodyForms = prot.formularios.map(f => {
                const isExento = billingTipoExento(f);
                const isRea = f.categoria?.toLowerCase().includes('reactivo');
                const esp = f.nombre_especie || '---';
                const sub = (f.nombre_subespecie && f.nombre_subespecie !== 'N/A') ? `:${f.nombre_subespecie}` : '';
                const cant = isRea ? `${f.NombreInsumo} (${f.TipoInsumo}) ${f.CantidadInsumo} - ${f.cant_organo} ${unAb}` : `${f.cant_animal} ${unAb}`;
                const idPlain = billingPdfFormularioIdDisplay(f, { style: 'plain', marcaExento: marcaExFull });
                const total = parseFloat(f.total || 0);
                const pagadoReal = parseFloat(f.pagado || 0);
                const exL = bi.pdf_monto_exento || 'Exento';
                const m = pdfColsPrecioDebePagoTotal(isExento, total, pagadoReal, exL);
                const c = pdfColsPdfOrdenTotalPagadoDebe(m);

                return [
                    { content: idPlain, styles: { fontStyle: isExento ? 'bold' : 'normal', textColor: isExento ? [0, 150, 200] : [0, 0, 0] } },
                    billingFormatPedidoFechasPlain(f, bi),
                    f.solicitante, esp + sub, f.detalle_display.replace(/<[^>]*>/g, ""), cant,
                    c[0], c[1], c[2]
                ];
            });

            doc.autoTable({
                startY: currentY + 10, margin: { left: M, right: M }, head: [[
                    bi.pdf_col_id || 'ID',
                    bi.pdf_col_fecha || 'Fechas',
                    bd.th_solicitante || 'Solicitante',
                    bi.pdf_col_especie || 'Especie',
                    bi.pdf_col_detalle || 'Detalle',
                    be.pdf_th_cantidad || 'Cantidad',
                    lblTotPdf,
                    lblPagPdf,
                    lblDebPdf
                ]],
                body: bodyForms, theme: 'grid', headStyles: { fillColor: verdeGrobo },
                styles: { fontSize: 7 }, columnStyles: { 4: { cellWidth: 45 }, 5: { cellWidth: 50 } }
            });
            currentY = doc.lastAutoTable.finalY + 5;
        }

        if (prot.alojamientos?.length > 0) {
            const alojLine = (esp, caja) => (be.pdf_aloj_linea_tpl || 'Alojamiento Especie: {esp} ({caja})')
                .replace(/\{esp\}/g, esp).replace(/\{caja\}/g, (caja != null && String(caja).length) ? String(caja) : cajaDef);
            const exLAlojG = bi.pdf_monto_exento || 'Exento';
            const diasPdf = be.pdf_aloj_dias_unit || 'd';
            const lblPerAloj = be.pdf_th_periodo_aloj_informe || bp.pdf_col_periodo_aloj || 'Periodo alojamiento';
            const bodyAloj = prot.alojamientos.map(a => {
                const m = pdfColsPrecioDebePagoTotal(billingTipoExento(a), a.total, a.pagado || 0, exLAlojG);
                const c = pdfColsPdfOrdenTotalPagadoDebe(m);
                const perTxt = billingAlojPeriodoParaInforme(a, {
                    diasUnit: diasPdf,
                    emptyLabel: enCurso,
                });
                return [a.historia, alojLine(a.especie, a.caja), perTxt, c[0], c[1], c[2]];
            });

            doc.autoTable({
                startY: currentY, margin: { left: M, right: M }, head: [[
                    be.pdf_th_id_hist || 'ID Historia',
                    be.pdf_th_concepto || 'Concepto',
                    lblPerAloj,
                    lblTotPdf,
                    lblPagPdf,
                    lblDebPdf
                ]],
                body: bodyAloj, theme: 'grid', headStyles: { fillColor: [100, 100, 100] },
                styles: { fontSize: 7 },
                columnStyles: { 2: { cellWidth: 62 }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } }
            });
            currentY = doc.lastAutoTable.finalY + 12;
        } else {
            currentY += 8;
        }
    });

    const pages = doc.internal.getNumberOfPages();
    const fechaGen = formatBillingDateTime();
    for (let j = 1; j <= pages; j++) {
        doc.setPage(j); doc.setFontSize(8); doc.setTextColor(150);
        doc.text((be.pdf_footer_inst_tpl || 'Institución: {inst} | Generado: {fecha}').replace(/\{inst\}/g, instNombre).replace(/\{fecha\}/g, fechaGen), 15, 202);
        doc.text((be.pdf_footer_pagina_tpl || 'Página {j} de {pages}').replace(/\{j\}/g, String(j)).replace(/\{pages\}/g, String(pages)), 282, 202, { align: "right" });
    }

    const pref = be.excel_archivo_prefijo || 'Facturacion';
    const instArch = String(instNombre).replace(/[^a-zA-Z0-9_ \-\(\)]/g, '_');
    doc.save(`${pref}_${deptoNombre}_${instArch}.pdf`);
    hideLoader();
};