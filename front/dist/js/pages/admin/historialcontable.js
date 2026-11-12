import { API } from '../../api.js';
import { showLoader, hideLoader } from '../../components/LoaderComponent.js';
import { debounce } from '../../utils/debounce.js';
import { fetchBillingPersonSummary } from './facturacion/billingPersonHub.js';
import { formatBillingMoney } from './facturacion/billingLocale.js';

export const HistorialState = {
    dataFull: [],
    dataFiltered: [],
    currentPage: 1,
    itemsPerPage: 15,
    maxVisiblePages: 6, // El máximo de botones de paginación solicitados
    /** Filtro por investigador afectado (`historialpago.IdUsrA`); null = todos */
    filterIdUsr: null,
    personSummary: null,
    /** Nuevo modo: página y filtros en servidor para no transferir todo el historial. */
    serverMode: true,
    serverTotal: 0,
    querySerial: 0,
    requestAbort: null,
};

let investigadoresHistorialCache = [];

const debouncedRenderInvestigatorsPanel = debounce(() => renderInvestigatorsPanel(), 280);

function txHist() {
    return window.txt?.admin_historialcontable || {};
}

function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function auditQueryParams(page=HistorialState.currentPage, includePaging=true) {
    const p = new URLSearchParams();
    if (includePaging) {
        p.set('paged','1');
        p.set('page',String(page));
        p.set('per_page',String(HistorialState.itemsPerPage));
    }
    const type=document.getElementById('filter-type')?.value||'all';
    const column=document.getElementById('filter-column')?.value||'all';
    const search=document.getElementById('search-input')?.value?.trim()||'';
    if(type!=='all')p.set('type',type);
    if(column!=='all')p.set('column',column);
    if(search)p.set('search',search);
    if(HistorialState.filterIdUsr>0)p.set('user_id',String(HistorialState.filterIdUsr));
    return p;
}

async function exportHistorialCsv() {
    if (HistorialState.serverMode) {
        // Exportación por streaming desde el backend; CSV de todo el filtro,
        // no solo de las 15 filas visibles. Nunca calcular pagos en cliente.
        try {
            const p=auditQueryParams(1,false);
            const token=sessionStorage.getItem('token')||localStorage.getItem('token')||'';
            const response=await fetch(API.urlBase+'/billing/audit-history-csv?'+p.toString(),{
                headers:{Authorization:'Bearer '+token},cache:'no-store'
            });
            if(!response.ok)throw new Error('No se pudo exportar el historial.');
            const blob=await response.blob();
            const link=document.createElement('a');
            const href=URL.createObjectURL(blob);
            link.href=href;
            link.download='GROBO_Historial_'+new Date().toISOString().slice(0,10)+'.csv';
            link.click();
            setTimeout(()=>URL.revokeObjectURL(href),5000);
        }catch(error){
            const msg=error?.message||'No se pudo descargar el historial.';
            if(typeof Swal!=='undefined')Swal.fire({icon:'error',text:msg});
            else alert(msg);
        }
        return;
    }
    const t = txHist();
    const rows = HistorialState.dataFiltered;
    if (!rows.length) {
        if (typeof Swal !== 'undefined') {
            Swal.fire(window.txt?.generales?.swal_atencion || 'Atención', t.excel_empty || 'No hay datos para exportar.', 'info');
        }
        return;
    }
    const sep = ';';
    const esc = (v) => {
        const s = String(v ?? '').replace(/"/g, '""');
        return `"${s}"`;
    };
    const headers = [
        t.col_id_mov || 'ID',
        t.col_fecha || 'Fecha',
        t.col_administrador || 'Admin',
        t.col_investigador || 'Investigador',
        t.col_tipo_operacion || 'Tipo',
        t.col_ref_pedido || 'Ref',
        t.col_transferencia || 'Transferencia',
        t.col_comentario || 'Comentario',
        t.col_monto || 'Monto',
    ];
    const lines = [headers.map(esc).join(sep)];
    rows.forEach((row) => {
        const refTexto =
            row.IdFormA == 0 || !row.IdFormA ? '' : `#${row.IdFormA}`;
        lines.push(
            [
                row.IdHistoPago,
                formatDate(row.fecha),
                row.AdminCompleto,
                row.UsrCompleto,
                row.TipoHistorial,
                refTexto,
                row.IdentificadorTransferencia,
                row.Comentario,
                row.Monto,
            ]
                .map(esc)
                .join(sep)
        );
    });
    const blob = new Blob(['\ufeff' + lines.join('\r\n')], {
        type: 'text/csv;charset=utf-8;',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${t.excel_filename || 'historial_contable'}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
}

export async function initHistorialContable() {
    const params = new URLSearchParams(window.location.search);
    const urlIdUsr = params.get('idUsr');
    if (urlIdUsr) {
        const n = parseInt(String(urlIdUsr), 10);
        HistorialState.filterIdUsr = Number.isFinite(n) ? n : null;
    }
    setupListeners();
    try {
        showLoader();
        await Promise.all([loadData(), loadInvestigatorsList()]);
        if (HistorialState.filterIdUsr != null) {
            await loadPersonSummaryForFilter();
        }
    } finally {
        hideLoader();
    }
}

async function loadData({preservePage=false}={}) {
    if(!preservePage)HistorialState.currentPage=1;
    const serial=++HistorialState.querySerial;
    HistorialState.requestAbort?.abort();
    const abort=new AbortController();
    HistorialState.requestAbort=abort;
    const errorBox=document.getElementById('historial-carga-error');
    if(errorBox)errorBox.classList.add('d-none');
    try {
        const query=auditQueryParams(HistorialState.currentPage,true);
        const res=await API.request('/billing/audit-history?'+query.toString(),
            'GET',null,{signal:abort.signal,cache:'no-store'});
        if(serial!==HistorialState.querySerial)return;
        if(res.status!=='success')throw new Error(res.message||'No se pudo cargar el historial.');
        if(res.pagination&&Number.isFinite(Number(res.pagination.total))) {
            HistorialState.serverMode=true;
            HistorialState.serverTotal=Math.max(0,Number(res.pagination.total));
            HistorialState.currentPage=Math.max(1,Number(res.pagination.page)||1);
            HistorialState.dataFull=Array.isArray(res.data)?res.data:[];
            HistorialState.dataFiltered=HistorialState.dataFull;
            renderTable();
        } else {
            // Compatibilidad temporal con versiones antiguas de la API.
            HistorialState.serverMode=false;
            HistorialState.dataFull=Array.isArray(res.data)?res.data:[];
            filterData();
        }
    }catch(error){
        if(serial!==HistorialState.querySerial)return;
        HistorialState.dataFull=[];
        HistorialState.dataFiltered=[];
        HistorialState.serverTotal=0;
        renderTable();
        if(errorBox){
            errorBox.classList.remove('d-none');
            errorBox.textContent=window.txt?.admin_historialcontable?.error_carga
                || 'No se pudo cargar el historial contable. Revisá la conexión.';
        }
        if(error.name!=='AbortError')console.warn('Historial contable sin cargar',error?.name);
    }finally{
        if(serial===HistorialState.querySerial)HistorialState.requestAbort=null;
    }
}

async function loadInvestigatorsList() {
    const instId = localStorage.getItem('instId') || 1;
    try {
        const res = await API.request(`/users/list-investigators?inst=${instId}`);
        if (res.status === 'success' && Array.isArray(res.data)) {
            investigadoresHistorialCache = res.data;
        } else {
            investigadoresHistorialCache = [];
        }
    } catch (e) {
        console.error('Error cargando investigadores (historial contable):', e);
        investigadoresHistorialCache = [];
    }
    renderInvestigatorsPanel();
}

function renderInvestigatorsPanel() {
    const container = document.getElementById('lista-invest-historial');
    const emptyEl = document.getElementById('lista-invest-historial-empty');
    if (!container || !emptyEl) return;

    const q = (document.getElementById('inv-hist-search')?.value || '').trim().toLowerCase();
    let list = investigadoresHistorialCache;
    if (q) {
        list = list.filter((u) => {
            const nom = `${u.ApellidoA || ''} ${u.NombreA || ''}`.toLowerCase();
            return nom.includes(q) || String(u.IdUsrA).includes(q);
        });
    }

    container.innerHTML = '';
    if (!list.length) {
        emptyEl.classList.remove('d-none');
        return;
    }
    emptyEl.classList.add('d-none');

    const sel = HistorialState.filterIdUsr;
    const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;
    const lblHist = txHist().btn_ver_historial_tabla || 'Historial';
    const lblFact = txHist().btn_ir_facturacion || 'Facturación';

    list.forEach((u) => {
        const active = sel != null && Number(sel) === Number(u.IdUsrA);
        const item = document.createElement('div');
        item.className = `list-group-item list-group-item-action d-flex flex-wrap align-items-center justify-content-between gap-2 py-3 ${active ? 'bg-light border-start border-success border-4' : ''}`;
        item.innerHTML = `
            <div class="flex-grow-1" style="min-width: 140px;">
                <div class="fw-bold small">${escapeHtml(u.ApellidoA || '')} ${escapeHtml(u.NombreA || '')}</div>
                <div class="text-muted" style="font-size: 10px;">ID ${Number(u.IdUsrA) || 0}</div>
            </div>
            <div class="text-end">
                <span class="badge bg-secondary">${fmt(u.SaldoDinero)}</span>
            </div>
            <div class="d-flex flex-wrap gap-1">
                <button type="button" class="btn btn-success btn-sm fw-bold btn-inv-filter" data-id="${Number(u.IdUsrA) || 0}">${escapeHtml(lblHist)}</button>
                <a class="btn btn-outline-primary btn-sm fw-bold" href="facturacion/investigador.html?idUsr=${encodeURIComponent(Number(u.IdUsrA) || 0)}">${escapeHtml(lblFact)}</a>
            </div>
        `;
        container.appendChild(item);
    });
}

function setupListeners() {
    document.getElementById('btn-search').addEventListener('click', filterData);
    document.getElementById('search-input').addEventListener('keyup', (e) => {
        if(e.key === 'Enter') filterData();
    });
    document.getElementById('filter-type').addEventListener('change', filterData);
    document.getElementById('filter-column')?.addEventListener('change', filterData);
    document.getElementById('search-input')?.addEventListener(
        'input', debounce(filterData, 350)
    );
    document.getElementById('btn-excel')?.addEventListener('click', exportHistorialCsv);

    document.getElementById('btn-inv-ver-todos')?.addEventListener('click', () => {
        HistorialState.filterIdUsr = null;
        HistorialState.personSummary = null;
        renderPersonSummaryBar();
        renderInvestigatorsPanel();
        filterData();
    });
    document.getElementById('inv-hist-search')?.addEventListener('input', () => debouncedRenderInvestigatorsPanel());

    document.getElementById('lista-invest-historial')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-inv-filter');
        if (!btn || !btn.dataset.id) return;
        const n = parseInt(String(btn.dataset.id), 10);
        HistorialState.filterIdUsr = Number.isFinite(n) ? n : null;
        void loadPersonSummaryForFilter();
        renderInvestigatorsPanel();
        filterData();
    });
}

async function loadPersonSummaryForFilter() {
    const uid = HistorialState.filterIdUsr;
    const bar = document.getElementById('hist-person-summary');
    if (!uid) {
        HistorialState.personSummary = null;
        renderPersonSummaryBar();
        return;
    }
    if (bar) {
        bar.innerHTML = `<span class="small text-muted"><span class="spinner-border spinner-border-sm me-1"></span></span>`;
    }
    try {
        HistorialState.personSummary = await fetchBillingPersonSummary(uid, null, null);
    } catch (_) {
        HistorialState.personSummary = null;
    }
    renderPersonSummaryBar();
}

function renderPersonSummaryBar() {
    const bar = document.getElementById('hist-person-summary');
    if (!bar) return;
    const s = HistorialState.personSummary;
    const h = window.txt?.facturacion?.hub || {};
    if (!s || HistorialState.filterIdUsr == null) {
        bar.innerHTML = '';
        bar.classList.add('d-none');
        return;
    }
    bar.classList.remove('d-none');
    const lblDebe = h.resumen_debe || 'Debe total';
    const lblPag = h.resumen_pagado || 'Pagado total';
    bar.innerHTML = `
        <div class="alert alert-light border small py-2 mb-0 d-flex flex-wrap align-items-center justify-content-between gap-2">
            <span class="fw-bold">${escapeHtml(s.nombre || '')} <span class="text-muted">(ID ${HistorialState.filterIdUsr})</span></span>
            <span>
                <span class="badge bg-danger me-1">${lblDebe}: $ ${formatBillingMoney(s.debe)}</span>
                <span class="badge bg-success">${lblPag}: $ ${formatBillingMoney(s.pagado)}</span>
            </span>
            <a class="btn btn-outline-primary btn-sm fw-bold" href="facturacion/investigador.html?idUsr=${encodeURIComponent(HistorialState.filterIdUsr)}&all=1">${escapeHtml(h.btn_abrir_facturacion || 'Estado de cuenta')}</a>
        </div>`;
}

function filterData() {
    const text = document.getElementById('search-input').value.toLowerCase();
    const column = document.getElementById('filter-column').value;
    const type = document.getElementById('filter-type').value;
    if (HistorialState.serverMode) {
        HistorialState.currentPage=1;
        void loadData({preservePage:true});
        return;
    }

    HistorialState.dataFiltered = HistorialState.dataFull.filter(row => {
        if (HistorialState.filterIdUsr != null && HistorialState.filterIdUsr !== '') {
            const rid = row.IdUsrA != null && row.IdUsrA !== '' ? Number(row.IdUsrA) : NaN;
            if (rid !== Number(HistorialState.filterIdUsr)) return false;
        }

        // 1. Filtro por Tipo de Operación
        if (type !== 'all' && row.TipoHistorial !== type) return false;

        // 2. Filtro por Texto
        if (text) {
            if (column === 'Investigador') return row.UsrCompleto?.toLowerCase().includes(text);
            if (column === 'Admin') return row.AdminCompleto?.toLowerCase().includes(text);
            
            // CORRECCIÓN AQUÍ: IdFormA en lugar de IdFromA
            if (column === 'Ref') return row.IdFormA?.toString().includes(text);
            if (column === 'Transferencia') {
                return String(row.IdentificadorTransferencia ?? '')
                    .toLowerCase()
                    .includes(text);
            }
            if (column === 'Comentario') {
                return String(row.Comentario ?? '')
                    .toLowerCase()
                    .includes(text);
            }
            
            // Si es 'all', busca en todos lados
            const concatData = Object.values(row).join(' ').toLowerCase();
            if (!concatData.includes(text)) return false;
        }
        return true;
    });

    HistorialState.currentPage = 1; 
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('table-body-historial');
    const info = document.getElementById('table-info');
    tbody.innerHTML = '';

    const start = (HistorialState.currentPage - 1) * HistorialState.itemsPerPage;
    const end = start + HistorialState.itemsPerPage;
    const paginatedItems = HistorialState.serverMode
        ? HistorialState.dataFiltered
        : HistorialState.dataFiltered.slice(start, end);
    const totalResults = HistorialState.serverMode
        ? HistorialState.serverTotal
        : HistorialState.dataFiltered.length;

    if (paginatedItems.length === 0) {
        const emptyMsg = txHist().sin_registros || 'No se encontraron registros.';
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">${emptyMsg}</td></tr>`;
        info.innerText = txHist().info_cero || '0 registros';
        renderPagination(totalResults);
        return;
    }

    paginatedItems.forEach(row => {
        const tipoH = String(row.TipoHistorial || '');
        let badgeColor = 'bg-secondary';
        if (tipoH.includes('PAGO')) badgeColor = 'bg-success';
        if (tipoH === 'CARGA_SALDO') badgeColor = 'bg-primary';
        if (tipoH.includes('DEVOLUCION')) badgeColor = 'bg-danger';

        // CORRECCIÓN AQUÍ TAMBIÉN: row.IdFormA
        const refTexto = (row.IdFormA == 0 || !row.IdFormA) ? '---' : '#' + row.IdFormA;

        const transferTxt =
            row.IdentificadorTransferencia != null &&
            String(row.IdentificadorTransferencia).trim() !== ''
                ? escapeHtml(row.IdentificadorTransferencia)
                : '—';
        const commentTxt =
            row.Comentario != null && String(row.Comentario).trim() !== ''
                ? escapeHtml(row.Comentario)
                : '—';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold text-muted">#${row.IdHistoPago}</td>
            <td>${escapeHtml(formatDate(row.fecha))}</td>
            <td>${escapeHtml(row.AdminCompleto || 'Sistema')}</td>
            <td class="fw-bold">${escapeHtml(row.UsrCompleto || 'Desconocido')}</td>
            <td><span class="badge ${badgeColor}">${escapeHtml(tipoH)}</span></td>
            <td class="text-center fw-bold text-primary">${refTexto === '---' ? '---' : escapeHtml(refTexto)}</td>
            <td class="text-muted small">${transferTxt}</td>
            <td class="text-muted small">${commentTxt}</td>
            <td class="text-end fw-bold ${row.Monto < 0 ? 'text-danger' : ''}">$${(Number.parseFloat(row.Monto) || 0).toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });

    const tpl = txHist().table_info || 'Mostrando {a} a {b} de {total} registros';
    info.innerText = tpl
        .replace('{a}', String(start + 1))
        .replace('{b}', String(Math.min(end, totalResults)))
        .replace('{total}', String(totalResults));
    renderPagination(totalResults);
}

// ==========================================
// PAGINACIÓN AVANZADA (Ventana de 6 botones)
// ==========================================
function renderPagination(totalItems) {
    const ul = document.getElementById('pagination-historial');
    ul.innerHTML = '';

    const totalPages = Math.ceil(totalItems / HistorialState.itemsPerPage);
    if (totalPages <= 1) return;

    // Botón Anterior (Deshabilitado si estoy en pag 1)
    ul.appendChild(createPageItem('«', HistorialState.currentPage - 1, HistorialState.currentPage === 1));

    // Lógica para mostrar solo 6 botones a la vez
    let startPage = Math.max(1, HistorialState.currentPage - Math.floor(HistorialState.maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + HistorialState.maxVisiblePages - 1);

    if (endPage - startPage + 1 < HistorialState.maxVisiblePages) {
        startPage = Math.max(1, endPage - HistorialState.maxVisiblePages + 1);
    }

    if (startPage > 1) {
        ul.appendChild(createPageItem('1', 1, false));
        if (startPage > 2) ul.appendChild(createPageItem('...', null, true));
    }

    for (let i = startPage; i <= endPage; i++) {
        ul.appendChild(createPageItem(i, i, false, i === HistorialState.currentPage));
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) ul.appendChild(createPageItem('...', null, true));
        ul.appendChild(createPageItem(totalPages, totalPages, false));
    }

    // Botón Siguiente (Deshabilitado si estoy en la última pag)
    ul.appendChild(createPageItem('»', HistorialState.currentPage + 1, HistorialState.currentPage === totalPages));
}

function createPageItem(text, targetPage, disabled = false, active = false) {
    const li = document.createElement('li');
    li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
    
    const a = document.createElement('a');
    a.className = `page-link ${active ? 'bg-success border-success text-white' : 'text-success'}`;
    a.href = '#';
    a.innerText = text;

    if (!disabled && targetPage !== null) {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            HistorialState.currentPage = targetPage;
            if(HistorialState.serverMode)void loadData({preservePage:true});
            else renderTable();
        });
    }

    li.appendChild(a);
    return li;
}

function formatDate(dateString) {
    if (dateString == null || String(dateString).trim() === '') return '---';
    const raw = String(dateString).trim();
    const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDate) {
        return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;
    }
    const isoDt = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
    if (isoDt) {
        return `${isoDt[3]}/${isoDt[2]}/${isoDt[1]} ${isoDt[4]}:${isoDt[5]}`;
    }
    return raw;
}