import { API } from '../../api.js';

export const BitacoraState = {
    dataFull: [],
    dataFiltered: [],
    currentPage: 1,
    itemsPerPage: 20, // 20 logs por página
    maxVisiblePages: 6
};

export async function initBitacora() {
    setupListeners();
    await loadData();
}

async function loadData() {
    try {
        const res = await API.request('/superadmin/bitacora/list');
        if (res.status === 'success') {
            BitacoraState.dataFull = res.data || [];
            BitacoraState.dataFiltered = [...BitacoraState.dataFull];
            BitacoraState.currentPage = 1;
            renderTable();
        }
    } catch (e) {
        console.error("Error cargando bitácora:", e);
    }
}

function setupListeners() {
    document.getElementById('btn-search').addEventListener('click', filterData);
    document.getElementById('search-input').addEventListener('keyup', (e) => {
        if(e.key === 'Enter') filterData();
    });
    document.getElementById('filter-action').addEventListener('change', filterData);

    document.getElementById('btn-excel').addEventListener('click', exportToExcel);
}

function filterData() {
    const text = document.getElementById('search-input').value.toLowerCase();
    const action = document.getElementById('filter-action').value;

    BitacoraState.dataFiltered = BitacoraState.dataFull.filter(row => {
        // 1. Filtro Select Action
        if (action !== 'all' && !row.accion.includes(action)) return false;

        // 2. Filtro de Texto (Busca en todo el registro)
        if (text) {
            const concatData = Object.values(row).join(' ').toLowerCase();
            if (!concatData.includes(text)) return false;
        }
        return true;
    });

    BitacoraState.currentPage = 1; 
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('table-body');
    const info = document.getElementById('table-info');
    tbody.innerHTML = '';

    const start = (BitacoraState.currentPage - 1) * BitacoraState.itemsPerPage;
    const end = start + BitacoraState.itemsPerPage;
    const paginatedItems = BitacoraState.dataFiltered.slice(start, end);

    if (paginatedItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No se encontraron movimientos.</td></tr>`;
        info.innerText = "0 registros";
        renderPagination(0);
        return;
    }

    paginatedItems.forEach(row => {
        // Estilos según acción
        let badgeColor = 'bg-secondary';
        let act = row.accion.toUpperCase();
        if (act.includes('INSERT')) badgeColor = 'bg-success';
        if (act.includes('UPDATE')) badgeColor = 'bg-primary';
        if (act.includes('DELETE')) badgeColor = 'bg-danger';
        if (act.includes('LOGIN')) badgeColor = 'bg-info text-dark';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold text-muted">#${row.id_bitacora}</td>
            <td style="font-size:11px;">${row.fecha_hora}</td>
            <td class="fw-bold text-primary">${row.UsuarioName || 'SISTEMA'}</td>
            <td class="text-center"><span class="badge ${badgeColor}">${row.accion}</span></td>
            <td><code class="text-secondary">${row.tabla_afectada}</code></td>
            <td class="text-muted">${row.detalle}</td>
        `;
        tbody.appendChild(tr);
    });

    info.innerText = `Mostrando ${start + 1} a ${Math.min(end, BitacoraState.dataFiltered.length)} de ${BitacoraState.dataFiltered.length} movimientos`;
    renderPagination(BitacoraState.dataFiltered.length);
}

// Lógica idéntica a Billing (Limitada a 6 botones)
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
        ul.appendChild(createPageItem(i, i, false, i === BitacoraState.currentPage));
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) ul.appendChild(createPageItem('...', null, true));
        ul.appendChild(createPageItem(totalPages, totalPages, false));
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
            renderTable();
        });
    }

    li.appendChild(a);
    return li;
}

function exportToExcel() {
    if(BitacoraState.dataFiltered.length === 0) return alert("No hay datos para exportar.");
    const ws = XLSX.utils.json_to_sheet(BitacoraState.dataFiltered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bitacora");
    XLSX.writeFile(wb, `Bitacora_Auditoria_${new Date().toISOString().slice(0,10)}.xlsx`);
}