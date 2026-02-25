import { API } from '../../api.js';

export const BitacoraState = {
    dataFull: [],
    dataFiltered: [],
    currentPage: 1,
    itemsPerPage: 20, 
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
            
            poblarFiltroInstituciones(); // Llenamos el dropdown
            renderTable();
        }
    } catch (e) {
        console.error("Error cargando bitácora:", e);
    }
}

// Extrae las instituciones únicas y las inyecta en el <select>
function poblarFiltroInstituciones() {
    const selectInst = document.getElementById('filter-inst');
    const institucionesUnicas = [...new Set(BitacoraState.dataFull.map(row => row.Institucion))].sort();
    
    // Dejamos la opción "Todas" y agregamos el resto
    selectInst.innerHTML = '<option value="all">Todas las Sedes</option>';
    institucionesUnicas.forEach(inst => {
        if(inst) {
            selectInst.innerHTML += `<option value="${inst}">${inst}</option>`;
        }
    });
}

function setupListeners() {
    document.getElementById('btn-search').addEventListener('click', filterData);
    document.getElementById('search-input').addEventListener('keyup', (e) => {
        if(e.key === 'Enter') filterData();
    });
    
    document.getElementById('filter-action').addEventListener('change', filterData);
    document.getElementById('filter-inst').addEventListener('change', filterData); // Escuchamos el nuevo select

    document.getElementById('btn-excel').addEventListener('click', exportToExcel);
}

function filterData() {
    const text = document.getElementById('search-input').value.toLowerCase();
    const action = document.getElementById('filter-action').value;
    const instFiltro = document.getElementById('filter-inst').value;

    BitacoraState.dataFiltered = BitacoraState.dataFull.filter(row => {
        // 1. Filtro Select Acción
        if (action !== 'all' && !row.accion.includes(action)) return false;

        // 2. Filtro Select Institución
        if (instFiltro !== 'all' && row.Institucion !== instFiltro) return false;

        // 3. Filtro de Texto Global
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
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No se encontraron movimientos.</td></tr>`;
        info.innerText = "0 registros";
        renderPagination(0);
        return;
    }

    paginatedItems.forEach(row => {
        let badgeColor = 'bg-secondary';
        let act = row.accion.toUpperCase();
        if (act.includes('INSERT')) badgeColor = 'bg-success';
        if (act.includes('UPDATE')) badgeColor = 'bg-primary';
        if (act.includes('DELETE')) badgeColor = 'bg-danger';
        if (act.includes('LOGIN')) badgeColor = 'bg-info text-dark';

        // Destacamos SISTEMA GLOBAL
        const instLabel = row.Institucion === 'SISTEMA GLOBAL' 
            ? `<span class="badge bg-dark">SISTEMA GLOBAL</span>` 
            : `<span class="fw-bold text-success">${row.Institucion}</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold text-muted">#${row.id_bitacora}</td>
            <td style="font-size:11px;">${row.fecha_hora}</td>
            <td class="fw-bold text-primary">${row.UsuarioName || 'SISTEMA'}</td>
            <td>${instLabel}</td>
            <td class="text-center"><span class="badge ${badgeColor}">${row.accion}</span></td>
            <td><code class="text-secondary">${row.tabla_afectada}</code></td>
            <td class="text-muted">${row.detalle}</td>
        `;
        tbody.appendChild(tr);
    });

    info.innerText = `Mostrando ${start + 1} a ${Math.min(end, BitacoraState.dataFiltered.length)} de ${BitacoraState.dataFiltered.length} movimientos`;
    renderPagination(BitacoraState.dataFiltered.length);
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