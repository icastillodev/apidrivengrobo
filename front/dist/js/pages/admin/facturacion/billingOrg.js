import { API } from '../../../api.js';
import { showLoader, hideLoader } from '../../../components/LoaderComponent.js';
import { formatBillingMoney } from './billingLocale.js';
import { setBillingResultsLoadingInline } from './billingResultsLoading.js';
import {
    fetchFiltrosAlcanceDerivacion,
    aplicarVisibilidadColumnaFacturacionDerivacion,
    getFacturacionDerivacionSeleccionFromDom as getFacturacionDerivacionSeleccionOrg,
    getFiltrosAlcanceDerivacionCached,
} from './billingDerivacionFiltros.js';

let orgBillingReportLoadedOk = false;
/** @type {{ organizaciones: unknown[], opts: { desde: string, hasta: string, chkAni: boolean, chkAlo: boolean, chkIns: boolean, facturacionDerivacion?: string } } | null} */
let orgLastSnapshot = null;

export async function initBillingOrg() {
    const hoy = new Date();
    const fDesde = document.getElementById('f-desde-org');
    const fHasta = document.getElementById('f-hasta-org');
    if (fDesde && fHasta) {
        fDesde.value = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
        fHasta.value = hoy.toISOString().split('T')[0];
    }
    await fetchFiltrosAlcanceDerivacion();
    aplicarVisibilidadColumnaFacturacionDerivacion(getFiltrosAlcanceDerivacionCached());
    const btn = document.getElementById('btn-cargar-org');
    if (btn) btn.addEventListener('click', cargarFacturacionOrg);
}

async function cargarFacturacionOrg() {
    const desde = document.getElementById('f-desde-org').value;
    const hasta = document.getElementById('f-hasta-org').value;
    const chkAni = document.getElementById('chk-animales-org').checked;
    const chkAlo = document.getElementById('chk-alojamiento-org').checked;
    const chkIns = document.getElementById('chk-insumos-org').checked;

    if (!chkAni && !chkAlo && !chkIns) {
        if (window.Swal) window.Swal.fire(window.txt?.generales?.swal_atencion || 'Atención', window.txt?.facturacion?.aviso_filtro || 'Debe tener al menos un filtro activo (Animales, Alojamiento o Insumos).', 'warning');
        return;
    }

    const opts = { desde, hasta, chkAni, chkAlo, chkIns, facturacionDerivacion: getFacturacionDerivacionSeleccionOrg() };
    const resultsEl = document.getElementById('billing-results-org');
    const prevSnap = orgLastSnapshot;
    const useGlobalLoader = !orgBillingReportLoadedOk;

    try {
        if (useGlobalLoader) {
            showLoader();
        } else if (resultsEl) {
            setBillingResultsLoadingInline('billing-results-org');
        }
        const res = await API.request('/billing/org-report', 'POST', {
            desde,
            hasta,
            chkAni,
            chkAlo,
            chkIns,
            facturacionDerivacion: getFacturacionDerivacionSeleccionOrg()
        });
        if (res.status === 'success' && res.data && res.data.organizaciones) {
            orgLastSnapshot = { organizaciones: res.data.organizaciones, opts };
            renderResultadosOrg(res.data.organizaciones, opts);
            orgBillingReportLoadedOk = true;
        } else {
            if (window.Swal) window.Swal.fire(window.txt?.generales?.error || 'Error', (res && res.message) || window.txt?.facturacion?.no_se_obtuvieron_datos || 'No se obtuvieron datos.', 'error');
            if (!useGlobalLoader && prevSnap) {
                renderResultadosOrg(prevSnap.organizaciones, prevSnap.opts);
            } else if (!useGlobalLoader && resultsEl) {
                resultsEl.replaceChildren();
            }
        }
    } catch (e) {
        console.error(e);
        if (window.Swal) window.Swal.fire(window.txt?.generales?.error || 'Error', window.txt?.facturacion?.error_cargar_reporte || 'Error al cargar el reporte.', 'error');
        if (!useGlobalLoader && prevSnap) {
            renderResultadosOrg(prevSnap.organizaciones, prevSnap.opts);
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
}

function renderResultadosOrg(organizaciones, opts) {
    const container = document.getElementById('billing-results-org');
    if (!container) return;

    const t = window.txt || {};
    const fDeuda = v => `$ ${formatBillingMoney(parseFloat(v || 0))}`;

    let html = '';
    organizaciones.forEach(org => {
        const tot = org.totales || {};
        if (!(org.departamentos || []).length) return;

        html += `
            <div class="card card-org shadow-sm border-0 mb-4">
                <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <h5 class="m-0 fw-bold text-info"><i class="bi bi-diagram-3 me-2"></i>${escapeHtml(org.nombre)}</h5>
                    <div class="d-flex gap-3 flex-wrap">
                        <span class="badge bg-danger">${t.facturacion?.deuda_total || 'Deuda'}: ${fDeuda(tot.globalDeuda)}</span>
                        <span class="badge bg-success">${t.facturacion?.total_pagado || 'Pagado'}: ${fDeuda(tot.totalPagado)}</span>
                    </div>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover table-sm mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th class="ps-3">${t.facturacion?.org_col_departamento || 'Departamento'}</th>
                                    <th class="text-end">${t.facturacion?.deuda_total || 'Deuda'}</th>
                                    <th class="text-end">${t.facturacion?.total_pagado || 'Pagado'}</th>
                                    <th class="text-center" style="width: 120px;"></th>
                                </tr>
                            </thead>
                            <tbody>`;

        (org.departamentos || []).forEach(d => {
            const dt = d.totales || {};
            const linkDepto = getDeptoReportLink(d.iddeptoA, opts);
            html += `
                                <tr>
                                    <td class="ps-3 fw-bold">${escapeHtml(d.NombreDeptoA)}</td>
                                    <td class="text-end text-danger fw-bold">${fDeuda(dt.globalDeuda)}</td>
                                    <td class="text-end text-success">${fDeuda(dt.totalPagado)}</td>
                                    <td class="text-center">
                                        <a href="${linkDepto}" class="btn btn-sm btn-outline-primary py-0 px-2">${t.facturacion?.link_ver_detalle || 'Ver detalle'}</a>
                                    </td>
                                </tr>`;
        });

        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>`;
    });

    container.innerHTML = html || `<div class="alert alert-info">${t.facturacion?.org_sin_resultados || 'No hay datos para el período y filtros seleccionados.'}</div>`;
}

function getDeptoReportLink(deptoId, opts) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const base = isLocal ? '/URBE-API-DRIVEN/front/admin/facturacion/depto' : '/admin/facturacion/depto';
    const params = new URLSearchParams();
    if (opts.desde) params.set('desde', opts.desde);
    if (opts.hasta) params.set('hasta', opts.hasta);
    if (deptoId) params.set('depto', deptoId);
    if (opts.facturacionDerivacion && opts.facturacionDerivacion !== 'todos') {
        params.set('facturacionDerivacion', opts.facturacionDerivacion);
    }
    const q = params.toString();
    return q ? `${base}?${q}` : base;
}

function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}
