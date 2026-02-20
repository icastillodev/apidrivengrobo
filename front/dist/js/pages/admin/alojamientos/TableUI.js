// dist/js/pages/admin/alojamientos/TableUI.js
import { AlojamientoState } from '../alojamientos.js';

export const TableUI = {
    currentPage: 1,
    rowsPerPage: 10,
    sortConfig: { key: 'historia', direction: 'desc' },

    init() {
        const btnAyuda = document.getElementById('btn-ayuda-alojamiento');
        if (btnAyuda) {
            btnAyuda.onclick = () => new bootstrap.Modal(document.getElementById('modal-alojamiento-help')).show();
        }

        document.querySelectorAll('th[data-sortable="true"]').forEach(th => {
            th.style.cursor = 'pointer';
            th.setAttribute('data-label', th.innerText.trim());
            th.onclick = () => this.handleSort(th.getAttribute('data-key'));
        });

        window.renderAlojamientosTable = () => this.render();
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
        const term = document.getElementById('search-alojamiento')?.value.toLowerCase().trim() || '';
        const estadoFiltro = document.getElementById('filter-estado')?.value || '';
        const tbody = document.getElementById('tbody-alojamientos');
        if (!tbody) return;

        // INYECTAMOS LOS DICCIONARIOS DE IDIOMA
        const txt = window.txt.alojamientos;
        const gen = window.txt.generales;

        let data = AlojamientoState.dataFull.filter(a => {
            const matchesSearch = a.nprotA.toLowerCase().includes(term) || a.Investigador.toLowerCase().includes(term) || String(a.historia).includes(term);
            const isFinalizado = (a.finalizado == 1 || a.finalizado == "1");
            const matchesEstado = estadoFiltro === "" || (isFinalizado ? "1" : "0") === estadoFiltro;
            return matchesSearch && matchesEstado;
        });

        if (this.sortConfig.direction !== 'none') {
            data.sort((a, b) => {
                let valA = a[this.sortConfig.key] || ''; 
                let valB = b[this.sortConfig.key] || '';
                const factor = this.sortConfig.direction === 'asc' ? 1 : -1;
                return isNaN(valA) || isNaN(valB) ? valA.toString().localeCompare(valB.toString()) * factor : (parseFloat(valA) - parseFloat(valB)) * factor;
            });
        }

        this.updateHeaderIcons();
        this.renderPagination(data.length);

        const pageData = data.slice((this.currentPage - 1) * this.rowsPerPage, this.currentPage * this.rowsPerPage);
        
        tbody.innerHTML = pageData.map(a => {
            const isFinalizado = (a.finalizado == 1 || a.finalizado == "1");
            
            // Textos Dinámicos Multi-idioma
            const nombreTipo = a.NombreTipoAlojamiento || txt.box_name; // Si viene null, dice "Caja/Box/Caixa"
            const infoCajas = `${a.CantidadCaja || 0} ${nombreTipo}`;
            const diffDays = Math.floor(Math.abs(new Date() - new Date(a.fechavisado)) / (1000 * 60 * 60 * 24));
            
            const badgeStatus = isFinalizado ? 'bg-danger' : 'bg-success';
            const textStatus = isFinalizado ? txt.status_finished : txt.status_active;

            // FILA MAESTRA
            return `
            <tr class="${isFinalizado ? 'status-finalizado' : 'status-vigente'} pointer" onclick="window.verHistorial(${a.historia}, event)">
                <td><span class="badge bg-dark">#${a.historia}</span></td>
                <td class="small fw-bold text-secondary">${a.fechavisado}</td> 
                <td><div class="fw-bold">${a.nprotA}</div><small class="text-muted">${a.tituloA || '---'}</small></td>
                <td>${a.Investigador}</td>
                <td>${a.EspeNombreA}</td>
                <td class="text-center fw-bold">${infoCajas}</td>
                <td class="text-center"><span class="badge bg-info text-dark">${diffDays} ${txt.days_suffix}</span></td>
                <td class="small text-muted text-truncate" style="max-width:150px">${a.observaciones || '---'}</td>
                <td><span class="badge ${badgeStatus}">${textStatus.toUpperCase()}</span></td>
                <td class="text-end" onclick="event.stopPropagation()">
                    <div class="btn-group shadow-sm">
                        ${!isFinalizado ? `<button class="btn btn-xs btn-success" title="${txt.btn_update_stay}" onclick="window.openModalActualizar(${a.historia})"><i class="bi bi-arrow-repeat"></i></button>` : ''}
                        <button class="btn btn-xs btn-light border" title="${txt.btn_qr}" onclick="window.verPaginaQR(${a.historia})"><i class="bi bi-qr-code"></i></button>
                        <button class="btn btn-xs btn-light border" title="${txt.btn_history}" onclick="window.verHistorial(${a.historia})"><i class="bi bi-clock-history"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center p-4 text-muted">${gen.escribebuscar || 'No se encontraron registros.'}</td></tr>`;
        }
    },

    updateHeaderIcons() {
        document.querySelectorAll('th[data-sortable="true"]').forEach(th => {
            const key = th.getAttribute('data-key');
            const icon = this.sortConfig.key === key ? (this.sortConfig.direction === 'asc' ? ' ▲' : (this.sortConfig.direction === 'desc' ? ' ▼' : ' -')) : ' -';
            th.innerHTML = `${th.getAttribute('data-label')}${icon}`;
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