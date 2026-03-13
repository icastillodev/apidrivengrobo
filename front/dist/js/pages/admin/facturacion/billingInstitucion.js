import { API } from '../../../api.js';
import { showLoader, hideLoader } from '../../../components/LoaderComponent.js';

export async function initBillingInstitucion() {
    const hoy = new Date();
    const fDesde = document.getElementById('f-desde-inst');
    const fHasta = document.getElementById('f-hasta-inst');
    if (fDesde && fHasta) {
        fDesde.value = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
        fHasta.value = hoy.toISOString().split('T')[0];
    }
    const btn = document.getElementById('btn-cargar-inst');
    if (btn) btn.addEventListener('click', cargarFacturacionInstitucion);
}

async function cargarFacturacionInstitucion() {
    const desde = document.getElementById('f-desde-inst')?.value || null;
    const hasta = document.getElementById('f-hasta-inst')?.value || null;
    const estadoCobro = document.getElementById('f-estado-cobro-inst')?.value || 'all';

    try {
        showLoader();
        const res = await API.request('/billing/institucion-report', 'POST', { desde, hasta, estadoCobro });
        if (res.status === 'success' && res.data) {
            renderResultadosInstitucion(res.data);
        } else {
            if (window.Swal) window.Swal.fire(window.txt?.generales?.error || 'Error', res.message || 'No se obtuvieron datos.', 'error');
        }
    } catch (e) {
        console.error(e);
        if (window.Swal) window.Swal.fire(window.txt?.generales?.error || 'Error', window.txt?.facturacion?.error_cargar_reporte || 'Error al cargar el reporte.', 'error');
    } finally {
        hideLoader();
    }
}

function renderResultadosInstitucion(data) {
    const container = document.getElementById('billing-results-inst');
    if (!container) return;

    const t = window.txt || {};
    const fmt = (v) => `$ ${parseFloat(v || 0).toLocaleString('es-UY', { minimumFractionDigits: 2 })}`;

    const tot = data.totales || {};
    let html = `
        <div class="card shadow-sm border-0 mb-4">
            <div class="card-body">
                <div class="row text-center g-3">
                    <div class="col-md-3">
                        <div class="p-3 border rounded bg-light">
                            <small class="text-muted d-block">${t.facturacion?.estado_cobro_todos || 'Total'}</small>
                            <b class="fs-5">${tot.cantidad || 0}</b>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="p-3 border rounded bg-light">
                            <small class="text-muted d-block">${t.facturacion?.total || 'Total'}</small>
                            <b class="fs-5">${fmt(tot.montoTotal)}</b>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="p-3 border rounded bg-light">
                            <small class="text-muted d-block">${t.facturacion?.total_pagado || 'Pagado'}</small>
                            <b class="fs-5 text-success">${fmt(tot.montoPagado)}</b>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="p-3 border rounded bg-light">
                            <small class="text-muted d-block">${t.facturacion?.falta || 'Debe'}</small>
                            <b class="fs-5 text-danger">${fmt(tot.montoDebe)}</b>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

    const instituciones = Array.isArray(data.instituciones) ? data.instituciones : [];
    if (!instituciones.length) {
        container.innerHTML = html + `<div class="alert alert-info">${t.facturacion?.sin_datos_institucion || 'No hay facturación derivada para los filtros seleccionados.'}</div>`;
        return;
    }

    instituciones.forEach(inst => {
        const ti = inst.totales || {};
        html += `
            <div class="card card-inst shadow-sm border-0 mb-4">
                <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <h6 class="m-0 fw-bold text-primary">
                        <i class="bi bi-building me-2"></i>${escapeHtml(inst.institucion || '-')}
                    </h6>
                    <div class="d-flex gap-3 flex-wrap">
                        <span class="badge bg-secondary">${t.facturacion?.estado_cobro_todos || 'Total'}: ${ti.cantidad || 0}</span>
                        <span class="badge bg-success">${t.facturacion?.total_pagado || 'Pagado'}: ${fmt(ti.montoPagado)}</span>
                        <span class="badge bg-danger">${t.facturacion?.falta || 'Debe'}: ${fmt(ti.montoDebe)}</span>
                    </div>
                </div>
                <div class="table-responsive">
                    <table class="table table-sm table-hover mb-0">
                        <thead class="table-light">
                            <tr>
                                <th class="ps-3">ID</th>
                                <th>${t.facturacion?.col_formulario || 'Formulario'}</th>
                                <th>${t.generales?.investigador || 'Investigador'}</th>
                                <th>${t.facturacion?.filtro_estado_cobro || 'Estado cobro'}</th>
                                <th class="text-end">${t.facturacion?.total || 'Total'}</th>
                                <th class="text-end">${t.facturacion?.total_pagado || 'Pagado'}</th>
                                <th class="text-end">${t.facturacion?.falta || 'Debe'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(inst.items || []).map(item => `
                                <tr>
                                    <td class="ps-3">#${item.idformA}</td>
                                    <td>${escapeHtml(item.nombreTipo || item.tipoFormulario || '-')}</td>
                                    <td>${escapeHtml(item.investigador || '-')}</td>
                                    <td>${escapeHtml(estadoCobroText(item.estadoCobro))}</td>
                                    <td class="text-end">${fmt(item.montoTotal)}</td>
                                    <td class="text-end text-success">${fmt(item.montoPagado)}</td>
                                    <td class="text-end text-danger fw-bold">${fmt(item.montoDebe)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    });

    container.innerHTML = html;
}

function estadoCobroText(estado) {
    const n = Number(estado);
    if (n === 1) return window.txt?.facturacion?.estado_cobro_pendiente || 'PENDIENTE';
    if (n === 2) return window.txt?.facturacion?.estado_cobro_parcial || 'PARCIAL';
    if (n === 3) return window.txt?.facturacion?.estado_cobro_pagado || 'PAGADO';
    if (n === 4) return window.txt?.facturacion?.estado_cobro_anulado || 'ANULADO';
    return '-';
}

function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}
