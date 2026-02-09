import { API } from '../../api.js';

let allHousings = [];
let currentPage = 1;
const rowsPerPage = 10;

export async function initMisAlojamientos() {
    const userId = localStorage.getItem('userId');
    const instId = localStorage.getItem('instId');

    document.getElementById('btn-export-excel').onclick = openExcelModal;

    try {
        const res = await API.request(`/user/my-housings?user=${userId}&inst=${instId}`);
        if (res.status === 'success') {
            allHousings = res.data.list;
            setupInstitutionFilter();
            renderTable();
        }
    } catch (e) { console.error("Error:", e); }

    document.getElementById('search-input').addEventListener('keyup', () => { currentPage = 1; renderTable(); });
    document.getElementById('filter-status').addEventListener('change', () => { currentPage = 1; renderTable(); });
    document.getElementById('filter-inst').addEventListener('change', () => { currentPage = 1; renderTable(); });
}

/* --- FILTROS Y TABLA --- */
function setupInstitutionFilter() {
    const insts = [...new Set(allHousings.map(h => h.Institucion))];
    const container = document.getElementById('container-filter-inst');
    const select = document.getElementById('filter-inst');
    if (insts.length > 1) {
        container.classList.remove('d-none');
        insts.sort().forEach(inst => {
            const opt = document.createElement('option');
            opt.value = inst; opt.text = inst; select.appendChild(opt);
        });
    }
}

function renderTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    const term = document.getElementById('search-input').value.toLowerCase();
    const statusFilter = document.getElementById('filter-status').value;
    const instFilter = document.getElementById('filter-inst').value;

    const filtered = allHousings.filter(h => {
        const matchText = Object.values(h).join(' ').toLowerCase().includes(term);
        const matchStatus = statusFilter === 'all' || h.Estado === statusFilter;
        const matchInst = instFilter === 'all' || h.Institucion === instFilter;
        return matchText && matchStatus && matchInst;
    });

    updateCounter(filtered);

    const start = (currentPage - 1) * rowsPerPage;
    const pageData = filtered.slice(start, start + rowsPerPage);

    pageData.forEach(h => {
        const tr = document.createElement('tr');
        tr.className = 'clickable-row align-middle';
        tr.onclick = (e) => { if (!e.target.closest('button')) openDetailModal(h.IdHistoria); };

        const isVigente = h.Estado === 'Vigente';
        const badge = isVigente 
            ? '<span class="badge bg-success shadow-sm badge-status">VIGENTE</span>' 
            : '<span class="badge bg-secondary shadow-sm badge-status">FINALIZADO</span>';

        tr.innerHTML = `
            <td class="ps-3 fw-bold text-muted small">#${h.IdHistoria}</td>
            <td><span class="inst-badge">${h.Institucion}</span></td>
            <td>${h.Protocolo}</td>
            <td>${h.Especie}</td>
            <td class="small">${h.FechaInicio}</td>
            <td class="small">${h.FechaFin}</td>
            <td class="text-center fw-bold">$ ${h.CostoTotal}</td>
            <td class="text-center">${badge}</td>
            <td class="text-end pe-3">
                <button class="btn btn-sm btn-light border shadow-sm text-danger" onclick="window.downloadPDF(${h.IdHistoria})" title="Descargar Ficha">
                    <i class="bi bi-file-earmark-pdf"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderPagination(filtered.length);
}

function updateCounter(data) {
    const total = data.length;
    const uniqueInst = [...new Set(data.map(h => h.Institucion))].length;
    let text = `${total} Registros`;
    if (uniqueInst > 1) text += ` entre ${uniqueInst} Instituciones`;
    document.getElementById('dynamic-counter').innerText = text;
}

function renderPagination(total) {
    const container = document.getElementById('pagination');
    container.innerHTML = '';
    const pages = Math.ceil(total / rowsPerPage);
    if (pages <= 1) return;

    const max = 5;
    let start = Math.max(1, currentPage - Math.floor(max/2));
    let end = Math.min(pages, start + max - 1);
    if (end - start + 1 < max) start = Math.max(1, end - max + 1);

    const btn = (l, p, d, a) => {
        const li = document.createElement('li'); li.className = `page-item ${d?'disabled':''} ${a?'active':''}`;
        li.innerHTML = `<button class="page-link shadow-none">${l}</button>`;
        li.onclick = () => { if (!d && !a) { currentPage = p; renderTable(); } };
        container.appendChild(li);
    };
    
    btn('&laquo;', currentPage-1, currentPage===1, false);
    for (let i = start; i <= end; i++) btn(i, i, false, i === currentPage);
    btn('&raquo;', currentPage+1, currentPage===pages, false);
}

/* --- MODAL FICHA DE ALOJAMIENTO --- */
window.openDetailModal = async (id) => {
    const modal = new bootstrap.Modal(document.getElementById('modal-visor'));
    const body = document.getElementById('modal-visor-body');
    const actions = document.getElementById('modal-actions');
    
    body.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success"></div></div>`;
    modal.show();

    try {
        const res = await API.request(`/user/housing-detail/${id}`);
        if (res.status === 'success') {
            const h = res.data.header;
            const rows = res.data.rows;

            const contactInfo = { NombreInst: h.Institucion, InstCorreo: h.InstCorreo, InstContacto: h.InstContacto };
            const contactString = encodeURIComponent(JSON.stringify(contactInfo));

            actions.innerHTML = `
                <div class="d-flex gap-2">
                    <button class="btn btn-danger btn-sm fw-bold shadow-sm" onclick="window.downloadPDF(${h.IdHistoria})">
                        <i class="bi bi-file-earmark-pdf me-2"></i> PDF FICHA
                    </button>
                    <button class="btn btn-outline-dark btn-sm fw-bold shadow-sm" onclick="window.openContactModal('${contactString}')">
                        <i class="bi bi-envelope-at me-2"></i> CONTACTAR ${h.Institucion.toUpperCase()}
                    </button>
                </div>
            `;

            // CABECERA MODAL (CON TÍTULO DE INSTITUCIÓN AGREGADO)
            let html = `
                <div class="text-center mb-3">
                    <h4 class="fw-bold text-success m-0" style="letter-spacing: 1px;">${h.Institucion.toUpperCase()}</h4>
                </div>

                <div class="header-card">
                    <div class="row text-center">
                        <div class="col border-end">
                            <span class="header-label">ID HISTORIA</span>
                            <span class="badge bg-dark fs-6">#${h.IdHistoria}</span>
                        </div>
                        <div class="col border-end">
                            <span class="header-label">INVESTIGADOR</span>
                            <span class="header-value text-truncate d-block" style="max-width:150px">${h.Investigador}</span>
                        </div>
                        <div class="col border-end">
                            <span class="header-label">PROTOCOLO</span>
                            <span class="header-value">${h.Protocolo}</span>
                        </div>
                        <div class="col border-end">
                            <span class="header-label">ESPECIE</span>
                            <span class="header-value">${h.Especie}</span>
                        </div>
                        <div class="col border-end">
                            <span class="header-label">DÍAS</span>
                            <span class="header-value">${h.TotalDias}</span>
                        </div>
                        <div class="col">
                            <span class="header-label">TOTAL</span>
                            <span class="header-value text-success">$ ${h.TotalCosto}</span>
                        </div>
                    </div>
                </div>
            `;

            // TABLA MODAL
            const tableRows = rows.map(r => `
                <tr>
                    <td class="text-muted small">#${r.IdAlojamiento}</td>
                    <td class="small">${r.fechavisado}</td>
                    <td class="small">${r.hastafecha || 'Vigente'}</td>
                    <td class="text-center fw-bold text-primary">${r.totalcajagrande > 0 ? r.totalcajagrande + ' Gr' : r.totalcajachica + ' Ch'}</td>
                    <td class="text-center fw-bold">${r.totaldiasdefinidos}</td>
                </tr>
            `).join('');

            html += `
                <div class="table-responsive">
                    <table class="table table-bordered table-sm table-hover align-middle">
                        <thead class="table-light text-uppercase small text-muted text-center">
                            <tr>
                                <th>ID</th>
                                <th>Desde</th>
                                <th>Hasta</th>
                                <th>Cajas</th>
                                <th>Días</th>
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
            `;

            body.innerHTML = html;
        }
    } catch (e) { body.innerHTML = `<div class="alert alert-danger">Error cargando detalles.</div>`; }
};

/* --- PDF GENERATOR --- */
window.downloadPDF = async (id) => {
    try {
        Swal.fire({ title: 'Generando PDF...', didOpen: () => Swal.showLoading() });
        const res = await API.request(`/user/housing-detail/${id}`);
        if (res.status === 'success') {
            const h = res.data.header;
            const rows = res.data.rows;

            const tableRows = rows.map(r => `
                <tr>
                    <td style="border:1px solid #ddd;padding:5px;">#${r.IdAlojamiento}</td>
                    <td style="border:1px solid #ddd;padding:5px;">${r.fechavisado}</td>
                    <td style="border:1px solid #ddd;padding:5px;">${r.hastafecha || 'Vigente'}</td>
                    <td style="border:1px solid #ddd;padding:5px;text-align:center;">${r.totalcajagrande > 0 ? r.totalcajagrande + ' Gr' : r.totalcajachica + ' Ch'}</td>
                    <td style="border:1px solid #ddd;padding:5px;text-align:center;">${r.totaldiasdefinidos}</td>
                </tr>
            `).join('');

            // ENCABEZADO CON INSTITUCIÓN
            const template = `
                <div style="font-family:Arial;padding:20px;color:#333;font-size:12px;">
                    <div style="text-align:center;border-bottom:2px solid #1a5d3b;padding-bottom:10px;margin-bottom:15px;">
                        <h2 style="color:#1a5d3b;margin:0;font-size:18px;">${h.Institucion.toUpperCase()}</h2>
                        <h3 style="margin:5px 0;font-size:14px;">FICHA DE ALOJAMIENTO - HISTORIA #${h.IdHistoria}</h3>
                    </div>

                    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:11px;">
                        <tr style="background:#f8f9fa;">
                            <td style="border:1px solid #ddd;padding:8px;"><strong>INVESTIGADOR:</strong><br>${h.Investigador}</td>
                            <td style="border:1px solid #ddd;padding:8px;"><strong>PROTOCOLO:</strong><br>${h.Protocolo}</td>
                            <td style="border:1px solid #ddd;padding:8px;"><strong>ESPECIE:</strong><br>${h.Especie}</td>
                            <td style="border:1px solid #ddd;padding:8px;"><strong>TOTAL DÍAS:</strong><br>${h.TotalDias}</td>
                        </tr>
                    </table>

                    <h4 style="border-bottom:1px solid #ccc;margin-bottom:10px;font-size:12px;">DETALLE DE MOVIMIENTOS</h4>
                    <table style="width:100%;border-collapse:collapse;font-size:10px;">
                        <thead style="background:#f0f0f0;">
                            <tr>
                                <th style="border:1px solid #ddd;padding:5px;">ID</th>
                                <th style="border:1px solid #ddd;padding:5px;">Desde</th>
                                <th style="border:1px solid #ddd;padding:5px;">Hasta</th>
                                <th style="border:1px solid #ddd;padding:5px;">Cajas</th>
                                <th style="border:1px solid #ddd;padding:5px;">Días</th>
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                    
                    <div style="margin-top:20px;font-size:10px;color:#777;text-align:center;">Generado por GROBO el ${new Date().toLocaleString()}</div>
                </div>`;

            Swal.close();
            html2pdf().set({ margin: 10, filename: `Alojamiento_${h.IdHistoria}.pdf`, html2canvas: { scale: 2 } }).from(template).save();
        }
    } catch (e) { Swal.fire('Error', 'No se pudo generar PDF', 'error'); }
};

window.openContactModal = (infoStr) => {
    const info = JSON.parse(decodeURIComponent(infoStr));
    document.getElementById('contact-modal-title').innerText = info.NombreInst.toUpperCase();
    document.getElementById('contact-modal-body').innerHTML = `
        <div class="text-center">
            <div class="d-grid gap-3">
                <a href="mailto:${info.InstCorreo}" class="btn btn-outline-primary fw-bold"><i class="bi bi-envelope-at me-2"></i> ${info.InstCorreo||'--'}</a>
                <div class="p-3 bg-light rounded border"><i class="bi bi-telephone me-2"></i> ${info.InstContacto||'--'}</div>
            </div>
        </div>`;
    new bootstrap.Modal(document.getElementById('modal-contact')).show();
};

function openExcelModal() { new bootstrap.Modal(document.getElementById('modal-excel')).show(); }

window.processExcelExport = () => {
    const start = document.getElementById('excel-start').value;
    const end = document.getElementById('excel-end').value;
    if (!start || !end) return Swal.fire('Info', 'Seleccione fechas', 'info');
    
    const data = allHousings.filter(h => h.FechaInicio >= start && h.FechaInicio <= end);
    if (!data.length) return Swal.fire('Info', 'No hay datos', 'info');

    const headers = ["Historia", "Institucion", "Protocolo", "Especie", "Inicio", "Fin", "Costo", "Estado"];
    const rows = [headers.join(";")];
    data.forEach(h => rows.push(Object.values(h).map(v => String(v).replace(/;/g,',')).join(";")));
    
    const blob = new Blob(["\uFEFF"+rows.join("\r\n")], {type:'text/csv;charset=utf-8;'});
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "Alojamientos.csv";
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};