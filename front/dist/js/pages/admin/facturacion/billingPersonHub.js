/**
 * Pestañas de categorías + búsqueda por persona con listas pagó / no pagó (juntas o separadas).
 */
import { API } from '../../../api.js';
import { formatBillingMoney, billingTipoExento, billingInsumoDebeCobrable } from './billingLocale.js';

const txF = () => window.txt?.facturacion || {};
const txH = () => txF().hub || {};

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const CATEGORY_PATHS = {
    index: 'index.html',
    depto: 'depto.html',
    org: 'org.html',
    investigador: 'investigador.html',
    protocolo: 'protocolo.html',
    institucion: 'institucion.html',
};

function billingBasePath() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocal ? '/URBE-API-DRIVEN/front/paginas/admin/facturacion/' : '/admin/facturacion/';
}

export function mountBillingCategoryTabs(container, activeKey) {
    if (!container) return;
    const h = txH();
    const tabs = [
        { key: 'index', label: h.tab_centro || 'Centro', icon: 'bi-grid' },
        { key: 'depto', label: txF().por_depto || 'Depto', icon: 'bi-building-gear' },
        { key: 'org', label: txF().por_organizacion || 'Org', icon: 'bi-diagram-3' },
        { key: 'investigador', label: txF().por_investigador || 'Persona', icon: 'bi-person-vcard' },
        { key: 'protocolo', label: txF().por_protocolo || 'Protocolo', icon: 'bi-file-earmark-medical' },
    ];
    const instCol = document.getElementById('billing-card-institucion-col');
    if (instCol && !instCol.classList.contains('d-none')) {
        tabs.push({ key: 'institucion', label: txF().por_institucion || 'Institución', icon: 'bi-buildings-fill' });
    }
    const base = billingBasePath();
    container.innerHTML = `
        <ul class="nav nav-pills flex-wrap gap-1 mb-0" role="tablist">
            ${tabs.map((t) => {
                const active = t.key === activeKey ? ' active' : '';
                const href = t.key === activeKey ? '#' : `${base}${CATEGORY_PATHS[t.key] || 'index.html'}`;
                return `<li class="nav-item" role="presentation">
                    <a class="nav-link fw-bold small text-uppercase${active}" href="${href}" style="font-size:10px;letter-spacing:.5px;">
                        <i class="bi ${t.icon} me-1"></i>${esc(t.label)}
                    </a>
                </li>`;
            }).join('')}
        </ul>`;
}

/**
 * @param {HTMLElement} mountEl
 * @param {{ getDateRange?: () => ({ desde: string, hasta: string }), onInvestigatorPick?: (idUsr: number) => void }} opts
 */
export async function mountBillingPersonHub(mountEl, opts = {}) {
    if (!mountEl) return;
    const h = txH();
    mountEl.innerHTML = `
        <div class="billing-person-hub border rounded-3 p-3 mb-4 bg-light-subtle shadow-sm">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <h6 class="fw-bold text-success mb-0 text-uppercase small">
                    <i class="bi bi-person-lines-fill me-2"></i>${esc(h.title || 'Buscar por persona')}
                </h6>
                <span class="text-muted small">${esc(h.subtitle || '')}</span>
            </div>
            <div class="row g-2 align-items-end">
                <div class="col-lg-4 col-md-5">
                    <label class="form-label small fw-bold text-muted mb-1">${esc(h.lbl_investigador || 'Investigador')}</label>
                    <input type="search" id="billing-hub-inv-filter" class="form-control form-control-sm mb-1" placeholder="${esc(h.ph_filtrar || '')}">
                    <select id="billing-hub-inv-select" class="form-select form-select-sm border-primary">
                        <option value="">${esc(h.opt_sel || '--')}</option>
                    </select>
                </div>
                <div class="col-lg-3 col-md-4">
                    <label class="form-label small fw-bold text-muted mb-1">${esc(h.lbl_modo || 'Ámbito de cobro')}</label>
                    <select id="billing-hub-modo" class="form-select form-select-sm">
                        <option value="juntas">${esc(h.modo_juntas || 'Juntas (todo)')}</option>
                        <option value="separadas">${esc(h.modo_separadas || 'Separadas (local / derivada)')}</option>
                    </select>
                </div>
                <div class="col-lg-2 col-md-3">
                    <button type="button" id="billing-hub-btn-search" class="btn btn-success btn-sm fw-bold w-100">
                        <i class="bi bi-search me-1"></i>${esc(h.btn_buscar || 'Buscar')}
                    </button>
                </div>
                <div class="col-lg-3 col-md-12 text-md-end">
                    <a href="#" id="billing-hub-link-full" class="btn btn-outline-primary btn-sm fw-bold d-none">
                        <i class="bi bi-box-arrow-in-right me-1"></i>${esc(h.btn_abrir_facturacion || 'Estado de cuenta completo')}
                    </a>
                </div>
            </div>
            <div id="billing-hub-results" class="mt-3"></div>
        </div>`;

    const instId = localStorage.getItem('instId') || '1';
    let investigators = [];
    try {
        const res = await API.request(`/users/list-investigators?inst=${instId}`);
        if (res.status === 'success' && Array.isArray(res.data)) {
            investigators = res.data;
        }
    } catch (e) {
        console.warn('billingPersonHub investigators', e);
    }

    const sel = mountEl.querySelector('#billing-hub-inv-select');
    const filterInp = mountEl.querySelector('#billing-hub-inv-filter');
    const renderOpts = (list) => {
        const ph = h.opt_sel || '--';
        sel.innerHTML = `<option value="">${esc(ph)}</option>` + list.map((u) => {
            const label = `${u.ApellidoA || ''}, ${u.NombreA || ''} (ID ${u.IdUsrA})`;
            return `<option value="${u.IdUsrA}">${esc(label)}</option>`;
        }).join('');
    };
    renderOpts(investigators);

    filterInp?.addEventListener('input', () => {
        const q = (filterInp.value || '').trim().toLowerCase();
        if (!q) {
            renderOpts(investigators);
            return;
        }
        renderOpts(investigators.filter((u) => {
            const nom = `${u.ApellidoA || ''} ${u.NombreA || ''}`.toLowerCase();
            return nom.includes(q) || String(u.IdUsrA).includes(q);
        }));
    });

    const resultsEl = mountEl.querySelector('#billing-hub-results');
    const linkFull = mountEl.querySelector('#billing-hub-link-full');
    const btn = mountEl.querySelector('#billing-hub-btn-search');

    const runSearch = async () => {
        const idUsr = parseInt(String(sel?.value || ''), 10) || 0;
        if (!idUsr) {
            if (typeof Swal !== 'undefined') {
                Swal.fire(window.txt?.generales?.swal_atencion || 'Atención', txF().aviso_investigador || '', 'warning');
            }
            return;
        }
        const range = typeof opts.getDateRange === 'function' ? opts.getDateRange() : {};
        const desde = range.desde || document.getElementById('f-desde')?.value || '';
        const hasta = range.hasta || document.getElementById('f-hasta')?.value || '';
        const modo = mountEl.querySelector('#billing-hub-modo')?.value || 'juntas';

        if (typeof opts.onInvestigatorPick === 'function') {
            opts.onInvestigatorPick(idUsr);
        }

        const baseFact = billingBasePath();
        if (linkFull) {
            linkFull.href = `${baseFact}investigador.html?idUsr=${encodeURIComponent(idUsr)}&all=1`;
            linkFull.classList.remove('d-none');
        }

        resultsEl.innerHTML = `<div class="text-center py-3 text-muted small"><span class="spinner-border spinner-border-sm me-2"></span>${esc(window.txt?.generales?.msg_cargando || '…')}</div>`;

        try {
            if (modo === 'separadas') {
                const [loc, der] = await Promise.all([
                    fetchInvestigadorReport(idUsr, desde, hasta, 'institucionales'),
                    fetchInvestigadorReport(idUsr, desde, hasta, 'derivados'),
                ]);
                resultsEl.innerHTML = `
                    <div class="row g-3">
                        <div class="col-lg-6">${renderReportSplitPanel(loc, h.seccion_local || 'Local')}</div>
                        <div class="col-lg-6">${renderReportSplitPanel(der, h.seccion_derivada || 'Derivada')}</div>
                    </div>`;
            } else {
                const data = await fetchInvestigadorReport(idUsr, desde, hasta, 'todos');
                resultsEl.innerHTML = renderReportSplitPanel(data, h.seccion_juntas || 'Todo');
            }
        } catch (e) {
            resultsEl.innerHTML = `<div class="alert alert-danger small mb-0">${esc(String(e?.message || e))}</div>`;
        }
    };

    btn?.addEventListener('click', () => runSearch());

    const params = new URLSearchParams(window.location.search);
    const urlUsr = params.get('idUsr') || params.get('hubIdUsr');
    if (urlUsr && sel) {
        sel.value = urlUsr;
        setTimeout(() => runSearch(), 200);
    }
}

async function fetchInvestigadorReport(idUsr, desde, hasta, facturacionDerivacion) {
    const res = await API.request('/billing/investigador-report', 'POST', {
        idUsr,
        desde: desde || null,
        hasta: hasta || null,
        chkAni: true,
        chkIns: true,
        facturacionDerivacion,
    });
    if (res.status !== 'success') {
        throw new Error(res.message || window.txt?.generales?.error || 'Error');
    }
    return res.data || {};
}

function flattenReportToLines(data) {
    const lines = [];
    const pushLine = (tipo, ref, desc, total, pagado, debe) => {
        const t = parseFloat(total) || 0;
        const p = parseFloat(pagado) || 0;
        const d = parseFloat(debe) || 0;
        if (t <= 0 && p <= 0 && d <= 0) return;
        lines.push({ tipo, ref, desc, total: t, pagado: p, debe: d });
    };

    (data.insumosGenerales || []).forEach((ins) => {
        if (billingTipoExento(ins)) return;
        const debe = billingInsumoDebeCobrable(ins);
        const pagado = parseFloat(ins.pagado || 0);
        const total = parseFloat(ins.total_item || 0) || debe + pagado;
        pushLine('insumo', `#${ins.id}`, ins.detalle_completo || ins.solicitante || '', total, pagado, debe);
    });

    (data.protocolos || []).forEach((prot) => {
        const protLbl = `${prot.nprotA || ''} ${prot.tituloA || ''}`.trim();
        (prot.formularios || []).forEach((f) => {
            if (billingTipoExento(f)) return;
            const total = parseFloat(f.total || 0);
            const pagado = parseFloat(f.pagado || 0);
            const debe = parseFloat(f.debe || 0);
            pushLine('form', `#${f.id}`, protLbl, total, pagado, debe);
        });
        (prot.alojamientos || []).forEach((a) => {
            const total = parseFloat(a.total || 0);
            const pagado = parseFloat(a.pagado || 0);
            const debe = parseFloat(a.debe || 0);
            pushLine('aloj', `#${a.historia || a.last_id || ''}`, protLbl, total, pagado, debe);
        });
        (prot.insumos || []).forEach((ins) => {
            if (billingTipoExento(ins)) return;
            const debe = billingInsumoDebeCobrable(ins);
            const pagado = parseFloat(ins.pagado || 0);
            const total = parseFloat(ins.total_item || 0) || debe + pagado;
            pushLine('insumo', `#${ins.id}`, protLbl, total, pagado, debe);
        });
    });

    return lines;
}

function renderLinesTable(lines, paidOnly) {
    const h = txH();
    const filtered = lines.filter((ln) => (paidOnly ? ln.pagado > 0.009 : ln.debe > 0.009));
    if (!filtered.length) {
        return `<p class="text-muted small text-center py-2 mb-0">${esc(h.sin_filas || 'Sin ítems en esta lista.')}</p>`;
    }
    const rows = filtered.map((ln) => `
        <tr>
            <td class="small text-muted">${esc(ln.tipo)}</td>
            <td class="fw-bold small">${esc(ln.ref)}</td>
            <td class="small">${esc(ln.desc)}</td>
            <td class="text-end small">$ ${formatBillingMoney(ln.total)}</td>
            <td class="text-end small text-success">$ ${formatBillingMoney(ln.pagado)}</td>
            <td class="text-end small text-danger">$ ${formatBillingMoney(ln.debe)}</td>
        </tr>`).join('');
    return `<div class="table-responsive" style="max-height:220px;overflow:auto">
        <table class="table table-sm table-bordered mb-0" style="font-size:10px">
            <thead class="table-light"><tr>
                <th>${esc(h.th_tipo || 'Tipo')}</th>
                <th>${esc(h.th_ref || 'Ref')}</th>
                <th>${esc(h.th_detalle || 'Detalle')}</th>
                <th class="text-end">${esc(h.th_total || 'Total')}</th>
                <th class="text-end">${esc(h.th_pagado || 'Pagó')}</th>
                <th class="text-end">${esc(h.th_debe || 'Debe')}</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>
    </div>`;
}

function renderReportSplitPanel(data, sectionTitle) {
    const h = txH();
    const t = data.totales || {};
    const lines = flattenReportToLines(data);
    const sumPagado = parseFloat(t.totalPagado || 0);
    const sumDebe = parseFloat(t.globalDeuda || 0);
    const perfil = data.perfil?.NombreCompleto || '';

    return `
        <div class="border rounded bg-white p-3 h-100">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                <span class="fw-bold small text-uppercase text-primary">${esc(sectionTitle)}</span>
                ${perfil ? `<span class="small text-muted">${esc(perfil)}</span>` : ''}
            </div>
            <div class="d-flex flex-wrap gap-2 mb-3">
                <span class="badge bg-danger">${esc(h.badge_debe || 'Debe')}: $ ${formatBillingMoney(sumDebe)}</span>
                <span class="badge bg-success">${esc(h.badge_pagado || 'Pagó')}: $ ${formatBillingMoney(sumPagado)}</span>
            </div>
            <div class="row g-2">
                <div class="col-md-6">
                    <div class="fw-bold small text-danger mb-1">${esc(h.lista_no_pago || 'No pagó / pendiente')}</div>
                    ${renderLinesTable(lines, false)}
                </div>
                <div class="col-md-6">
                    <div class="fw-bold small text-success mb-1">${esc(h.lista_pago || 'Pagó / liquidado')}</div>
                    ${renderLinesTable(lines, true)}
                </div>
            </div>
        </div>`;
}

/** Resumen compacto debe/pagado para historial contable u otros paneles. */
export async function initBillingPageHub(activeCategory, opts = {}) {
    const tabsEl = document.getElementById('billing-category-tabs');
    const hubEl = document.getElementById('billing-person-hub-mount');
    mountBillingCategoryTabs(tabsEl, activeCategory);
    if (hubEl) {
        await mountBillingPersonHub(hubEl, opts);
    }
}

export async function fetchBillingPersonSummary(idUsr, desde, hasta) {
    const data = await fetchInvestigadorReport(idUsr, desde, hasta, 'todos');
    const t = data.totales || {};
    return {
        debe: parseFloat(t.globalDeuda || 0),
        pagado: parseFloat(t.totalPagado || 0),
        nombre: data.perfil?.NombreCompleto || '',
    };
}
