import { API } from '../../api.js';
import { showLoader, hideLoader } from '../../components/LoaderComponent.js';
import { setTbodyLoadingSpinner, setTbodyMessageRow } from '../../utils/tableInlineLoading.js';

/** Estado expuesto por compatibilidad; el listado es paginado en servidor. */
export const BitacoraState = {
    pageRows: [],
    totalRows: 0,
    currentPage: 1,
    itemsPerPage: 20,
    maxVisiblePages: 6,
    loadError: false,
};

function txBit() {
    return window.txt?.superadmin_bitacora || {};
}

function escBit(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function currentFiltersFromDom() {
    const action = document.getElementById('filter-action')?.value || 'all';
    const inst = document.getElementById('filter-inst')?.value || 'all';
    const q = (document.getElementById('search-input')?.value || '').trim();
    return { action, inst, q };
}

function buildListQuery(offset, limit) {
    const { action, inst, q } = currentFiltersFromDom();
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    if (q) params.set('q', q);
    if (action && action !== 'all') params.set('accion', action);
    if (inst && inst !== 'all') params.set('inst', inst);
    return `/superadmin/bitacora/list?${params.toString()}`;
}

export async function initBitacora() {
    setupListeners();
    showLoader();
    try {
        await Promise.all([cargarInstitucionesFiltro(), fetchBitacoraPage({ resetPage: true, inline: false })]);
    } finally {
        hideLoader();
    }
}

async function cargarInstitucionesFiltro() {
    const selectInst = document.getElementById('filter-inst');
    const txt = window.txt?.superadmin_bitacora;
    const labelSedes = txt?.opcion_todas_sedes || 'Todas las Sedes';
    const prev = selectInst?.value || 'all';

    if (!selectInst) return;

    try {
        const res = await API.request('/superadmin/bitacora/instituciones-filtro');
        selectInst.innerHTML = '';
        const optAll = document.createElement('option');
        optAll.value = 'all';
        optAll.textContent = labelSedes;
        selectInst.appendChild(optAll);

        if (res.status === 'success' && Array.isArray(res.data)) {
            res.data.forEach((inst) => {
                if (inst == null || inst === '') return;
                const o = document.createElement('option');
                o.value = String(inst);
                o.textContent = String(inst);
                selectInst.appendChild(o);
            });
        }

        const hasPrev = prev !== 'all' && [...selectInst.options].some((o) => o.value === prev);
        selectInst.value = hasPrev ? prev : 'all';
    } catch (e) {
        console.error(e);
        selectInst.innerHTML = '';
        const optAll = document.createElement('option');
        optAll.value = 'all';
        optAll.textContent = labelSedes;
        selectInst.appendChild(optAll);
    }
}

function showTableLoadingRow() {
    const tbody = document.getElementById('table-body');
    const t = txBit();
    setTbodyLoadingSpinner(tbody, {
        colspan: 7,
        spinnerTone: 'success',
        message: t.tabla_cargando || window.txt?.generales?.msg_cargando || '…',
    });
}

/**
 * @param {{ resetPage?: boolean, inline?: boolean }} opts
 */
async function fetchBitacoraPage(opts = {}) {
    const { resetPage = false, inline = true } = opts;
    if (resetPage) {
        BitacoraState.currentPage = 1;
    }
    if (inline) {
        BitacoraState.loadError = false;
        showTableLoadingRow();
    }

    const limit = BitacoraState.itemsPerPage;
    const offset = (BitacoraState.currentPage - 1) * BitacoraState.itemsPerPage;

    try {
        const res = await API.request(buildListQuery(offset, limit));
        BitacoraState.loadError = false;
        if (res.status === 'success') {
            BitacoraState.pageRows = Array.isArray(res.data) ? res.data : [];
            BitacoraState.totalRows = typeof res.total === 'number' ? res.total : BitacoraState.pageRows.length;

            const totalPages = Math.max(1, Math.ceil(BitacoraState.totalRows / BitacoraState.itemsPerPage));
            if (BitacoraState.totalRows > 0 && BitacoraState.currentPage > totalPages) {
                BitacoraState.currentPage = totalPages;
                await fetchBitacoraPage({ inline: true });
                return;
            }
            renderTable();
        } else {
            BitacoraState.pageRows = [];
            BitacoraState.totalRows = 0;
            renderBitacoraErrorRow();
        }
    } catch (e) {
        console.error('Error cargando bitácora:', e);
        BitacoraState.loadError = true;
        BitacoraState.pageRows = [];
        BitacoraState.totalRows = 0;
        renderBitacoraErrorRow();
    }
}

function renderBitacoraErrorRow() {
    const tbody = document.getElementById('table-body');
    const info = document.getElementById('table-info');
    setTbodyMessageRow(tbody, {
        colspan: 7,
        variant: 'danger',
        message: txBit().error_cargar || window.txt?.generales?.error || 'Error',
    });
    if (info) info.innerText = txBit().info_cero || '0';
    renderPagination(0);
}

function setupListeners() {
    document.getElementById('btn-search').addEventListener('click', () => fetchBitacoraPage({ resetPage: true, inline: true }));
    document.getElementById('search-input').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') fetchBitacoraPage({ resetPage: true, inline: true });
    });

    document.getElementById('filter-action').addEventListener('change', () => fetchBitacoraPage({ resetPage: true, inline: true }));
    document.getElementById('filter-inst').addEventListener('change', () => fetchBitacoraPage({ resetPage: true, inline: true }));

    document.getElementById('btn-excel').addEventListener('click', exportToExcel);
}

function renderTable() {
    const tbody = document.getElementById('table-body');
    const info = document.getElementById('table-info');
    const t = txBit();
    if (!tbody || !info) return;

    if (BitacoraState.loadError) {
        renderBitacoraErrorRow();
        return;
    }

    tbody.innerHTML = '';

    const start = (BitacoraState.currentPage - 1) * BitacoraState.itemsPerPage;
    const end = start + BitacoraState.pageRows.length;
    const paginatedItems = BitacoraState.pageRows;

    if (paginatedItems.length === 0) {
        const emptyRaw =
            BitacoraState.totalRows === 0 ? t.tabla_sin_filas || '' : t.sin_resultados_filtro || t.tabla_sin_filas || '';
        setTbodyMessageRow(tbody, { colspan: 7, variant: 'muted', message: emptyRaw || '—' });
        info.innerText = t.info_cero || '0';
        renderPagination(0);
        return;
    }

    paginatedItems.forEach((row) => {
        let badgeColor = 'bg-secondary';
        const act = String(row.accion || '').toUpperCase();
        if (act.includes('INSERT')) badgeColor = 'bg-success';
        if (act.includes('UPDATE')) badgeColor = 'bg-primary';
        if (act.includes('DELETE')) badgeColor = 'bg-danger';
        if (act.includes('LOGIN')) badgeColor = 'bg-info text-dark';

        const instLabel =
            row.Institucion === 'SISTEMA GLOBAL'
                ? `<span class="badge bg-dark">SISTEMA GLOBAL</span>`
                : `<span class="fw-bold text-success">${escBit(row.Institucion)}</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold text-muted">#${row.id_bitacora}</td>
            <td style="font-size:11px;">${escBit(row.fecha_hora)}</td>
            <td class="fw-bold text-primary">${escBit(row.UsuarioName || 'SISTEMA')}</td>
            <td>${instLabel}</td>
            <td class="text-center"><span class="badge ${badgeColor}">${escBit(row.accion)}</span></td>
            <td><code class="text-secondary">${escBit(row.tabla_afectada)}</code></td>
            <td class="text-muted">${escBit(row.detalle)}</td>
        `;
        tbody.appendChild(tr);
    });

    const tpl = t.table_info || 'Showing {a} to {b} of {total}';
    info.innerText = tpl
        .replace('{a}', String(BitacoraState.totalRows === 0 ? 0 : start + 1))
        .replace('{b}', String(Math.min(start + paginatedItems.length, BitacoraState.totalRows)))
        .replace('{total}', String(BitacoraState.totalRows));
    renderPagination(BitacoraState.totalRows);
}

function renderPagination(totalItems) {
    const ul = document.getElementById('pagination');
    ul.innerHTML = '';

    const totalPages = Math.ceil(totalItems / BitacoraState.itemsPerPage);
    if (totalPages <= 1) return;

    ul.appendChild(createPageItem('«', BitacoraState.currentPage - 1, BitacoraState.currentPage === 1));

    let startPage = Math.max(1, BitacoraState.currentPage - Math.floor(BitacoraState.maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + BitacoraState.maxVisiblePages - 1);

    if (endPage - startPage + 1 < BitacoraState.maxVisiblePages) {
        startPage = Math.max(1, endPage - BitacoraState.maxVisiblePages + 1);
    }

    if (startPage > 1) {
        ul.appendChild(createPageItem('1', 1, false));
        if (startPage > 2) ul.appendChild(createPageItem('...', null, true));
    }

    for (let i = startPage; i <= endPage; i++) {
        ul.appendChild(createPageItem(String(i), i, false, i === BitacoraState.currentPage));
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) ul.appendChild(createPageItem('...', null, true));
        ul.appendChild(createPageItem(String(totalPages), totalPages, false));
    }

    ul.appendChild(createPageItem('»', BitacoraState.currentPage + 1, BitacoraState.currentPage === totalPages));
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
            BitacoraState.currentPage = targetPage;
            fetchBitacoraPage({ inline: true });
        });
    }

    li.appendChild(a);
    return li;
}

async function exportToExcel() {
    const t = txBit();
    const { action, inst, q } = currentFiltersFromDom();
    const params = new URLSearchParams();
    params.set('limit', '0');
    params.set('offset', '0');
    if (q) params.set('q', q);
    if (action && action !== 'all') params.set('accion', action);
    if (inst && inst !== 'all') params.set('inst', inst);

    showLoader();
    try {
        const res = await API.request(`/superadmin/bitacora/list?${params.toString()}`);
        if (res.status !== 'success' || !Array.isArray(res.data) || res.data.length === 0) {
            const msg = t.excel_empty || '';
            if (typeof Swal !== 'undefined') {
                Swal.fire(window.txt?.generales?.swal_atencion || 'Atención', msg || '—', 'info');
            } else {
                alert(msg || '—');
            }
            return;
        }
        const ws = XLSX.utils.json_to_sheet(res.data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Bitacora');
        XLSX.writeFile(wb, `Bitacora_Auditoria_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
        console.error(e);
        if (typeof Swal !== 'undefined') {
            Swal.fire(window.txt?.generales?.error || 'Error', txBit().error_cargar || '', 'error');
        } else {
            alert(txBit().error_cargar || 'Error');
        }
    } finally {
        hideLoader();
    }
}
