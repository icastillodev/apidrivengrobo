// dist/js/pages/admin/alojamientos/TableUI.js
// Usar referencia global para evitar estado duplicado por doble instancia del módulo
function getDataFull() {
    const ref = typeof window !== 'undefined' && window.__AlojamientoState;
    return ref ? (ref.dataFull || []) : [];
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m]));
}

export const TableUI = {
    currentPage: 1,
    rowsPerPage: 10,
    sortConfig: { key: 'historia', direction: 'desc' },
    _lastFilterKey: null,
    _lastSpeciesIdsKey: null,

    init() {
        document.querySelectorAll('th[data-sortable="true"]').forEach(th => {
            th.style.cursor = 'pointer';
            const label = (th.innerText || th.textContent || '').trim() || th.getAttribute('data-key') || '';
            th.setAttribute('data-label', label);
            th.onclick = () => this.handleSort(th.getAttribute('data-key'));
        });

        window.renderAlojamientosTable = () => this.render();
    },

    poblarFiltroEspecies() {
        const select = document.getElementById('filter-especie');
        if (!select) return;

        const txt = window.txt?.alojamientos || {};
        const defaultAllText = select.querySelector('option[value=""]')?.textContent || '';
        const allText = txt.filter_species_all || defaultAllText || '';

        const dataFull = getDataFull();
        const speciesMap = new Map(); // id -> nombre

        dataFull.forEach(a => {
            const idEsp = String(a.idespA ?? a.TipoAnimal ?? '').trim();
            if (!idEsp) return;
            const nombre = String(a.EspeNombreA ?? '').trim();
            if (!nombre) return;
            speciesMap.set(idEsp, nombre);
        });

        const ids = Array.from(speciesMap.keys()).sort((idA, idB) =>
            speciesMap.get(idA).localeCompare(speciesMap.get(idB), undefined, { sensitivity: 'base' })
        );
        const idsKey = ids.join('|');
        if (this._lastSpeciesIdsKey === idsKey) return;

        const prevSelected = String(select.value || '');

        const options = ids.map(id => {
            const selectedAttr = id === prevSelected ? 'selected' : '';
            return `<option value="${escapeHtml(id)}" ${selectedAttr}>${escapeHtml(speciesMap.get(id))}</option>`;
        }).join('');

        const placeholderSelectedAttr = prevSelected === '' ? 'selected' : '';
        select.innerHTML = `<option value="" ${placeholderSelectedAttr}>${escapeHtml(allText)}</option>${options}`;
        this._lastSpeciesIdsKey = idsKey;
    },

    handleSort(key) {
        if (this.sortConfig.key === key) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : (this.sortConfig.direction === 'desc' ? 'none' : 'asc');
        } else {
            this.sortConfig.key = key;
            this.sortConfig.direction = 'asc';
        }
        this.render();
    },

    render() {
        const dataFull = getDataFull();

        const term = (document.getElementById('search-alojamiento')?.value || '').toLowerCase().trim();
        const estadoFiltro = (document.getElementById('filter-estado')?.value || '').toString();
        const especieFiltro = (document.getElementById('filter-especie')?.value || '').toString();
        const tbody = document.getElementById('tbody-alojamientos');

        if (!tbody) return;

        const txt = window.txt?.alojamientos || {};
        const gen = window.txt?.generales || {};
        const COL_COUNT = 10;

        const filterKey = `${term}|${estadoFiltro}|${especieFiltro}`;
        if (this._lastFilterKey !== filterKey) {
            this._lastFilterKey = filterKey;
            this.currentPage = 1;
        }

        let data = dataFull.filter(a => {
            const nprot = (a.nprotA || '').toString().toLowerCase();
            const inv = (a.Investigador || '').toString().toLowerCase();
            const hist = String(a.historia || '');
            const termLower = term.toLowerCase();
            const matchesSearch = !termLower || nprot.includes(termLower) || inv.includes(termLower) || hist.includes(termLower);
            const isFinalizado = (a.finalizado == 1 || a.finalizado === "1");
            const matchesEstado = estadoFiltro === "" || (isFinalizado ? "1" : "0") === estadoFiltro;
            const idEsp = String(a.idespA ?? a.TipoAnimal ?? '').toString();
            const matchesEspecie = especieFiltro === "" || idEsp === especieFiltro;
            return matchesSearch && matchesEstado && matchesEspecie;
        });

        if (this.sortConfig.direction !== 'none') {
            data.sort((a, b) => {
                let valA = a[this.sortConfig.key] || ''; 
                let valB = b[this.sortConfig.key] || '';
                const factor = this.sortConfig.direction === 'asc' ? 1 : -1;
                return isNaN(valA) || isNaN(valB) ? String(valA).localeCompare(String(valB)) * factor : (parseFloat(valA) - parseFloat(valB)) * factor;
            });
        }

        this.updateHeaderIcons();
        this.renderPagination(data.length);

        const pageData = data.slice((this.currentPage - 1) * this.rowsPerPage, this.currentPage * this.rowsPerPage);

        if (pageData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${COL_COUNT}" class="text-center p-4 text-muted">${gen?.escribebuscar || 'No se encontraron registros.'}</td></tr>`;
            return;
        }

        tbody.innerHTML = pageData.map(a => {
            const isFinalizado = (a.finalizado == 1 || a.finalizado === "1");
            const nombreTipo = (a.NombreTipoAlojamiento || txt?.box_name || 'Caja').toString();
            const infoCajas = `${a.CantidadCaja ?? 0} ${nombreTipo}`;
            const fechavisado = (a.fechavisado || '').toString();
            const diffDays = fechavisado ? Math.max(0, Math.floor((Date.now() - new Date(fechavisado).getTime()) / (1000 * 60 * 60 * 24))) : 0;
            const badgeStatus = isFinalizado ? 'bg-danger' : 'bg-success';
            const textStatus = (isFinalizado ? (txt?.status_finished || 'Finalizado') : (txt?.status_active || 'Vigente')).toString();

            return `
            <tr class="${isFinalizado ? 'status-finalizado' : 'status-vigente'} pointer" onclick="window.verHistorial(${a.historia}, event)">
                <td><span class="badge bg-dark">#${a.historia}</span></td>
                <td class="small fw-bold text-secondary">${fechavisado || '---'}</td> 
                <td><div class="fw-bold">${(a.nprotA || '').toString()}</div><small class="text-muted">${(a.tituloA || '---').toString().replace(/</g, '&lt;')}</small></td>
                <td>${(a.Investigador || '---').toString().replace(/</g, '&lt;')}</td>
                <td>${(a.EspeNombreA || '---').toString().replace(/</g, '&lt;')}</td>
                <td class="text-center fw-bold">${infoCajas}</td>
                <td class="text-center"><span class="badge bg-info text-dark">${diffDays} ${txt?.days_suffix || 'd'}</span></td>
                <td class="small text-muted text-truncate" style="max-width:150px">${(a.observaciones || '---').toString().replace(/</g, '&lt;')}</td>
                <td><span class="badge ${badgeStatus}">${textStatus.toUpperCase()}</span></td>
                <td class="text-end" onclick="event.stopPropagation()">
                    <div class="btn-group shadow-sm">
                        ${!isFinalizado ? `<button type="button" class="btn btn-xs btn-success" title="${txt?.btn_update_stay || 'Actualizar'}" onclick="event.stopPropagation(); event.preventDefault(); window.openModalActualizar(${a.historia})"><i class="bi bi-arrow-repeat"></i></button>` : ''}
                        <button class="btn btn-xs btn-light border" title="${txt?.btn_qr || 'QR'}" onclick="window.verPaginaQR(${a.historia})"><i class="bi bi-qr-code"></i></button>
                        <button class="btn btn-xs btn-light border" title="${txt?.btn_history || 'Historial'}" onclick="window.verHistorial(${a.historia})"><i class="bi bi-clock-history"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    },

    updateHeaderIcons() {
        document.querySelectorAll('th[data-sortable="true"]').forEach(th => {
            const key = th.getAttribute('data-key');
            const icon = this.sortConfig.key === key ? (this.sortConfig.direction === 'asc' ? ' ▲' : (this.sortConfig.direction === 'desc' ? ' ▼' : ' -')) : ' -';
            let iconSpan = th.querySelector('.sort-icon');
            if (!iconSpan) {
                iconSpan = document.createElement('span');
                iconSpan.className = 'sort-icon ms-1';
                th.appendChild(iconSpan);
            }
            iconSpan.textContent = icon;
        });
    },

    renderPagination(totalItems) {
        const pagContainer = document.getElementById('pagination-alojamiento');
        if (!pagContainer) return;
        
        const totalPages = Math.ceil(totalItems / this.rowsPerPage);
        pagContainer.innerHTML = '';
        if (totalPages <= 1) return;

        const createBtn = (label, page, disabled, active = false) => {
            const li = document.createElement('li');
            li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link shadow-none" href="#">${label}</a>`;
            if (!disabled) li.onclick = (e) => { e.preventDefault(); this.currentPage = page; this.render(); };
            return li;
        };

        pagContainer.appendChild(createBtn('«', this.currentPage - 1, this.currentPage === 1));
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                pagContainer.appendChild(createBtn(i, i, false, i === this.currentPage));
            }
        }
        pagContainer.appendChild(createBtn('»', this.currentPage + 1, this.currentPage === totalPages));
    }
};