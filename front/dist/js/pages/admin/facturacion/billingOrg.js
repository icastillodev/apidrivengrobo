import { API } from '../../../api.js';
import { showLoader, hideLoader } from '../../../components/LoaderComponent.js';

export async function initBillingOrg() {
    const hoy = new Date();
    const fDesde = document.getElementById('f-desde-org');
    const fHasta = document.getElementById('f-hasta-org');
    if (fDesde && fHasta) {
        fDesde.value = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
        fHasta.value = hoy.toISOString().split('T')[0];
    }
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
        if (window.Swal) window.Swal.fire(window.txt?.facturacion?.filtro_al_menos || 'Atención', 'Debe tener al menos un filtro activo (Animales, Alojamiento o Insumos).', 'warning');
        return;
    }

    try {
        showLoader();
        const res = await API.request('/billing/org-report', 'POST', { desde, hasta, chkAni, chkAlo, chkIns });
        if (res.status === 'success' && res.data && res.data.organizaciones) {
            renderResultadosOrg(res.data.organizaciones, { desde, hasta, chkAni, chkAlo, chkIns });
        } else {
        if (window.Swal) window.Swal.fire(window.txt?.generales?.error || 'Error', (res && res.message) || window.txt?.facturacion?.no_se_obtuvieron_datos || 'No se obtuvieron datos.', 'error');
        }
    } catch (e) {
        console.error(e);
        if (window.Swal) window.Swal.fire(window.txt?.generales?.error || 'Error', window.txt?.facturacion?.error_cargar_reporte || 'Error al cargar el reporte.', 'error');
    } finally {
        hideLoader();
    }
}

function renderResultadosOrg(organizaciones, opts) {
    const container = document.getElementById('billing-results-org');
    if (!container) return;

    const t = window.txt || {};
    const fDeuda = v => `$ ${parseFloat(v || 0).toLocaleString('es-UY', { minimumFractionDigits: 2 })}`;

    let html = '';
    organizaciones.forEach(org => {
        const tot = org.totales || {};
        const hasData = (tot.globalDeuda > 0) || (tot.totalPagado > 0) || (org.departamentos || []).some(d => (d.totales?.globalDeuda > 0) || (d.totales?.totalPagado > 0));
        if (!hasData && (org.departamentos || []).length === 0) return;

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
                                    <th class="ps-3">${t.generales?.departamento || 'Departamento'}</th>
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

    container.innerHTML = html || `<div class="alert alert-info">${t.generales?.sin_resultados || 'No hay datos para el período y filtros seleccionados.'}</div>`;
}

function getDeptoReportLink(deptoId, opts) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const base = isLocal ? '/URBE-API-DRIVEN/front/admin/facturacion/depto' : '/admin/facturacion/depto';
    const params = new URLSearchParams();
    if (opts.desde) params.set('desde', opts.desde);
    if (opts.hasta) params.set('hasta', opts.hasta);
    if (deptoId) params.set('depto', deptoId);
    const q = params.toString();
    return q ? `${base}?${q}` : base;
}

function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}
