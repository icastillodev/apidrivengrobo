// ... (imports y funciones auxiliares igual) ...
// Copia switchView, applyFilters, updateSearchInputType, renderPagination del anterior.

import { store } from './store.js';
import { viewProtocol, viewAdminFeedback } from './modals_view.js';
import { openEditProtocolModal } from './modals_form.js';
import { openNetworkRequestModal } from './modals_network.js';

export function switchView(tab) { store.currentTab = tab; store.currentPage = 1; document.querySelectorAll('#view-tabs .nav-link').forEach(btn => btn.classList.remove('active')); if(window.event) window.event.target.closest('.nav-link').classList.add('active'); const opt = document.getElementById('opt-filter-estado'); const sel = document.getElementById('filter-type'); if(tab==='my') opt.classList.remove('d-none'); else { opt.classList.add('d-none'); if(sel.value==='Estado'){ sel.value='all'; updateSearchInputType(); } } applyFilters(); }
export function applyFilters() { const i = document.getElementById('search-input'); store.currentSearch = i ? i.value.toLowerCase().trim() : ''; store.currentFilterType = document.getElementById('filter-type').value; store.currentPage = 1; renderTable(); }
export function updateSearchInputType() { const t = document.getElementById('filter-type').value; const c = document.getElementById('dynamic-search-container'); let h = ''; if(t==='TipoNombre'){let o='<option value="">-- Todos --</option>'; if(store.formDataCache.types) store.formDataCache.types.forEach(x=>o+=`<option value="${x.NombreTipoprotocolo}">${x.NombreTipoprotocolo}</option>`); h=`<select id="search-input" class="form-select form-select-sm border-start-0 fw-bold">${o}</select>`;} else if(t==='Origen'){h=`<select id="search-input" class="form-select form-select-sm border-start-0 fw-bold"><option value="">-- Todos --</option><option value="PROPIA">Propia</option><option value="RED">Red</option></select>`;} else if(t==='Estado'){h=`<select id="search-input" class="form-select form-select-sm border-start-0 fw-bold"><option value="">-- Todos --</option><option value="1">Aprobados</option><option value="3">En Revisión</option><option value="2">Rechazados</option></select>`;} else {h=`<input type="text" id="search-input" class="form-control form-control-sm border-start-0" placeholder="Buscar...">`;} c.innerHTML=h; const i=document.getElementById('search-input'); if(i.tagName==='SELECT')i.onchange=applyFilters; else i.onkeyup=(e)=>{if(e.key==='Enter')applyFilters();}; }

export function renderTable() {
    const tbody = document.getElementById('table-protocols');
    const rawData = store.allData[store.currentTab] || [];
    
    const filteredData = rawData.filter(p => {
        if (!store.currentSearch) return true;
        if (store.currentFilterType === 'Origen') return p.OrigenCalculado === store.currentSearch.toUpperCase();
        if (store.currentFilterType === 'Estado') {
            if(store.currentSearch == '2') return (p.Aprobado == 2 || p.Aprobado == 4);
            return p.Aprobado == store.currentSearch;
        }
        if (store.currentFilterType === 'all') return JSON.stringify(p).toLowerCase().includes(store.currentSearch);
        const val = String(p[store.currentFilterType] || '').toLowerCase();
        return val.includes(store.currentSearch);
    });

    const totalItems = filteredData.length;
    const start = (store.currentPage - 1) * store.rowsPerPage;
    const pageData = filteredData.slice(start, start + store.rowsPerPage);
    const today = new Date().toISOString().split('T')[0];

    tbody.innerHTML = '';
    if (pageData.length === 0) { tbody.innerHTML = '<tr><td colspan="10" class="text-center py-5 text-muted fst-italic">No se encontraron protocolos.</td></tr>'; renderPagination(0); return; }

    pageData.forEach(p => {
        let dateClass = "text-muted";
        let dateText = p.Vencimiento || '-';
        if (p.Vencimiento && p.Vencimiento < today) {
            dateClass = "text-danger fw-bold text-decoration-underline";
            dateText += " (Vencido)";
        }

        let tipoHtml = `<span class="fw-bold text-dark">${p.TipoNombre || '-'}</span>`;
        if (p.IsExterno == 1) tipoHtml += `<br><span class="badge bg-danger mt-1" style="font-size:9px">OTROS CEUAS</span>`;

        let origenHtml = `<span class="badge bg-light text-dark border">PROPIA</span>`;
        if (p.OrigenCalculado === 'RED' || (p.Origen && p.Origen !== store.formDataCache.NombreCompletoInst)) {
            const inst = p.InstitucionOrigen || p.Origen || '';
            origenHtml = `<span class="badge bg-info text-white">RED</span><br><span class="small text-muted" style="font-size:9px">${inst}</span>`;
        }

        let estadoHtml = '-';
        if(store.currentTab === 'my') {
            // ESTADO LOCAL
            const st = p.Aprobado;
            if(st == 1) estadoHtml = '<span class="badge bg-success">APROBADO</span>';
            else if(st == 2 || st == 4) estadoHtml = `<span class="badge bg-danger cursor-help" onclick="window.viewAdminFeedback(${p.idprotA}, '${p.DetalleAdm || ''}')" title="Ver motivo">RECHAZADO <i class="bi bi-info-circle"></i></span>`;
            else estadoHtml = '<span class="badge bg-warning text-dark">EN REVISIÓN</span>';

            // ESTADO RED (Adicional)
            if (p.AprobadoRed == 3) estadoHtml += '<br><span class="badge bg-info mt-1" style="font-size:9px">RED: PENDIENTE</span>';
            if (p.AprobadoRed == 1) estadoHtml += '<br><span class="badge bg-success mt-1" style="font-size:9px">RED: APROBADO</span>';
        }

        const tr = document.createElement('tr');
        tr.onclick = (e) => { 
            if(!e.target.closest('button') && !e.target.closest('.badge')) viewProtocol(p.idprotA); 
        };

        let actions = `<button class="btn btn-sm btn-outline-secondary" onclick="window.viewProtocol(${p.idprotA})" title="Ver Detalle"><i class="bi bi-eye"></i></button>`;
        
        if (store.currentTab === 'my') {
            if (p.Aprobado == 2 || p.Aprobado == 4) {
                actions += `<button class="btn btn-sm btn-warning ms-1" onclick="window.openEditProtocolModal(${p.idprotA})" title="Corregir"><i class="bi bi-pencil-square"></i></button>`;
            } 
            else if ((p.Aprobado == 1 || p.Aprobado == 1) && p.variasInst != 2 && (!p.Vencimiento || p.Vencimiento >= today)) {
                if(store.formDataCache.has_network) {
                    actions += `<button class="btn btn-sm btn-info text-white ms-1" onclick="window.openNetworkRequestModal(${p.idprotA})" title="Solicitar en Red"><i class="bi bi-share-fill"></i></button>`;
                }
            }
        }

        tr.innerHTML = `
            <td class="text-muted small px-2">${p.idprotA}</td>
            <td class="fw-bold text-primary px-2">${p.nprotA}</td>
            <td class="small text-wrap px-2" style="max-width:200px;">${p.tituloA}</td>
            <td class="small px-2 fw-bold text-dark"><i class="bi bi-person-fill text-muted"></i> ${p.ResponsableName || 'Sin Asignar'}</td>
            <td class="small px-2 text-muted">${p.InvestigadorACargA || '-'}</td>
            <td class="px-2 text-center small">${tipoHtml}</td>
            <td class="px-2 text-center">${origenHtml}</td>
            <td class="px-2 text-center">${estadoHtml}</td>
            <td class="px-2 small ${dateClass}">${dateText}</td>
            <td class="px-2 text-end">${actions}</td>
        `;
        tbody.appendChild(tr);
    });
    renderPagination(totalItems);
}
export function renderPagination(totalItems) { const pag = document.getElementById('pagination'); const totalPages = Math.ceil(totalItems / store.rowsPerPage); pag.innerHTML = ''; if (totalPages <= 1) return; let startPage = Math.max(1, store.currentPage - 4); let endPage = Math.min(totalPages, startPage + 9); if (endPage - startPage < 9) startPage = Math.max(1, endPage - 9); const createBtn = (lbl, p, dis, act) => { const li = document.createElement('li'); li.className = `page-item ${dis ? 'disabled' : ''} ${act ? 'active' : ''}`; li.innerHTML = `<a class="page-link" href="#">${lbl}</a>`; if(!dis) li.onclick = (e) => { e.preventDefault(); store.currentPage = p; renderTable(); }; return li; }; pag.appendChild(createBtn('«', store.currentPage - 1, store.currentPage === 1, false)); for (let i = startPage; i <= endPage; i++) pag.appendChild(createBtn(i, i, false, store.currentPage === i)); pag.appendChild(createBtn('»', store.currentPage + 1, store.currentPage === totalPages, false)); }
export function updateStats() { document.getElementById('stats-bar').innerHTML = `<span class="me-3 fw-bold text-primary"><i class="bi bi-person-fill"></i> Mis Protocolos: ${store.allData.my.length}</span><span class="me-3 fw-bold text-success"><i class="bi bi-building"></i> Institución: ${store.allData.local.length}</span>${store.formDataCache.has_network ? `<span class="fw-bold text-info"><i class="bi bi-globe"></i> Red: ${store.allData.network.length}</span>` : ''}`; }