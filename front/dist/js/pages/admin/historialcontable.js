import { API } from '../../api.js';
import { showLoader, hideLoader } from '../../components/LoaderComponent.js';

export const HistorialState = {
    dataFull: [],
    dataFiltered: [],
    currentPage: 1,
    itemsPerPage: 15,
    maxVisiblePages: 6 // El máximo de botones de paginación solicitados
};

export async function initHistorialContable() {
    setupListeners();
    await loadData();
}

async function loadData() {
    try {
        showLoader();
        // Llamada a la API blindada
        const res = await API.request('/billing/audit-history');
        if (res.status === 'success') {
            HistorialState.dataFull = res.data || [];
            HistorialState.dataFiltered = [...HistorialState.dataFull];
            HistorialState.currentPage = 1;
            renderTable();
        }
    } catch (e) {
        console.error("Error cargando historial contable:", e);
    } finally {
        hideLoader();
    }
}

function setupListeners() {
    document.getElementById('btn-search').addEventListener('click', filterData);
    document.getElementById('search-input').addEventListener('keyup', (e) => {
        if(e.key === 'Enter') filterData();
    });
    document.getElementById('filter-type').addEventListener('change', filterData);
}

function filterData() {
    const text = document.getElementById('search-input').value.toLowerCase();
    const column = document.getElementById('filter-column').value;
    const type = document.getElementById('filter-type').value;

    HistorialState.dataFiltered = HistorialState.dataFull.filter(row => {
        // 1. Filtro por Tipo de Operación
        if (type !== 'all' && row.TipoHistorial !== type) return false;

        // 2. Filtro por Texto
        if (text) {
            if (column === 'Investigador') return row.UsrCompleto?.toLowerCase().includes(text);
            if (column === 'Admin') return row.AdminCompleto?.toLowerCase().includes(text);
            
            // CORRECCIÓN AQUÍ: IdFormA en lugar de IdFromA
            if (column === 'Ref') return row.IdFormA?.toString().includes(text); 
            
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
    const paginatedItems = HistorialState.dataFiltered.slice(start, end);

    if (paginatedItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No se encontraron registros.</td></tr>`;
        info.innerText = "0 registros";
        renderPagination(0);
        return;
    }

    paginatedItems.forEach(row => {
        let badgeColor = 'bg-secondary';
        if (row.TipoHistorial.includes('PAGO')) badgeColor = 'bg-success';
        if (row.TipoHistorial === 'CARGA_SALDO') badgeColor = 'bg-primary';
        if (row.TipoHistorial.includes('DEVOLUCION')) badgeColor = 'bg-danger';

        // CORRECCIÓN AQUÍ TAMBIÉN: row.IdFormA
        const refTexto = (row.IdFormA == 0 || !row.IdFormA) ? '---' : '#' + row.IdFormA;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold text-muted">#${row.IdHistoPago}</td>
            <td>${formatDate(row.fecha)}</td>
            <td>${row.AdminCompleto || 'Sistema'}</td>
            <td class="fw-bold">${row.UsrCompleto || 'Desconocido'}</td>
            <td><span class="badge ${badgeColor}">${row.TipoHistorial}</span></td>
            <td class="text-center fw-bold text-primary">${refTexto}</td>
            <td class="text-end fw-bold ${row.Monto < 0 ? 'text-danger' : ''}">$${parseFloat(row.Monto).toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });

    info.innerText = `Mostrando ${start + 1} a ${Math.min(end, HistorialState.dataFiltered.length)} de ${HistorialState.dataFiltered.length} registros`;
    renderPagination(HistorialState.dataFiltered.length);
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
            renderTable();
        });
    }

    li.appendChild(a);
    return li;
}

function formatDate(dateString) {
    if (!dateString) return '---';
    const parts = dateString.split('-');
    if(parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateString;
}