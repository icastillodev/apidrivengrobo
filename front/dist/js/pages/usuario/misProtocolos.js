import { API } from '../../api.js';

let allProtocols = [];
let currentPage = 1;
const rowsPerPage = 10;

export async function initMisProtocolos() {
    const userId = localStorage.getItem('userId');
    const instId = localStorage.getItem('instId');

    try {
        const res = await API.request(`/user/my-protocols?user=${userId}&inst=${instId}`);
        if (res.status === 'success') {
            allProtocols = res.data.list;
            
            // Configurar botones
            document.getElementById('btn-export-excel').onclick = exportExcel;
            
            setupInstitutionFilter();
            renderTable();
        }
    } catch (e) { console.error("Error:", e); }

    document.getElementById('search-input').addEventListener('keyup', () => { currentPage = 1; renderTable(); });
    document.getElementById('filter-inst').addEventListener('change', () => { currentPage = 1; renderTable(); });
}

/* --- LOGICA FILTROS & CONTADORES --- */
function setupInstitutionFilter() {
    const insts = [...new Set(allProtocols.map(p => p.Institucion))];
    const container = document.getElementById('container-filter-inst');
    const select = document.getElementById('filter-inst');

    if (insts.length > 1) {
        container.classList.remove('d-none');
        insts.sort().forEach(inst => {
            const option = document.createElement('option');
            option.value = inst; option.text = inst; select.appendChild(option);
        });
    }
}

function updateGlobalCounters(filteredData) {
    const total = filteredData.length;
    const approved = filteredData.filter(p => p.EstadoCodigo == 1).length;

    document.getElementById('count-total').innerText = `Total: ${total}`;
    document.getElementById('count-approved').innerText = `Aprobados: ${approved}`;

    const uniqueInst = [...new Set(filteredData.map(p => p.Institucion))];
    let text = `${total} Registros`;
    if (uniqueInst.length > 1) text += ` entre ${uniqueInst.length} Instituciones`;
    else if (uniqueInst.length === 1) text += ` en ${uniqueInst[0]}`;
    document.getElementById('dynamic-counter').innerHTML = text;
}

/* --- RENDER TABLA --- */
function renderTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    const term = document.getElementById('search-input').value.toLowerCase();
    const instFilter = document.getElementById('filter-inst').value;

    const filtered = allProtocols.filter(p => {
        const matchText = Object.values(p).join(' ').toLowerCase().includes(term);
        const matchInst = instFilter === 'all' || p.Institucion === instFilter;
        return matchText && matchInst;
    });

    updateGlobalCounters(filtered);

    const start = (currentPage - 1) * rowsPerPage;
    const pageData = filtered.slice(start, start + rowsPerPage);

    pageData.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = 'clickable-row align-middle';
        tr.onclick = (e) => { if (!e.target.closest('button')) openDetailModal(p.idprotA); };

        const isApproved = p.EstadoCodigo == 1;
        const statusBadge = isApproved 
            ? '<span class="badge bg-success shadow-sm badge-status">Aprobado</span>'
            : `<span class="badge bg-warning text-dark shadow-sm badge-status">${p.EstadoTexto}</span>`;

        tr.innerHTML = `
            <td class="ps-3 fw-bold text-muted small">${p.idprotA}</td>
            <td class="fw-bold text-dark">${p.nprotA || '---'}</td>
            <td><span class="inst-badge">${p.Institucion}</span></td>
            <td class="text-truncate" style="max-width: 180px;" title="${p.tituloA}">${p.tituloA}</td>
            <td class="text-truncate" style="max-width: 120px;">${p.Responsable}</td>
            <td class="text-center fw-bold">${p.CantidadAprobada}</td>
            <td class="text-truncate small" style="max-width: 100px;" title="${p.Especies}">${p.Especies || '-'}</td>
            <td class="text-truncate small" style="max-width: 100px;">${p.Departamento}</td>
            <td><span class="badge bg-light text-dark border" style="font-size:10px">${p.Tipo || 'N/A'}</span></td>
            <td class="small text-danger fw-bold">${p.Vencimiento || '-'}</td>
            <td class="text-center">${statusBadge}</td>
            <td class="text-end pe-3">
                <button class="btn btn-sm btn-light border shadow-sm text-danger" onclick="window.downloadPDF(${p.idprotA})" title="Descargar PDF">
                    <i class="bi bi-file-earmark-pdf"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderPagination(filtered.length);
}

function renderPagination(totalItems) {
    const container = document.getElementById('pagination');
    container.innerHTML = '';
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    if (totalPages <= 1) return;

    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage + 1 < maxButtons) startPage = Math.max(1, endPage - maxButtons + 1);

    const createBtn = (label, page, disabled, active) => {
        const li = document.createElement('li');
        li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
        li.innerHTML = `<button class="page-link shadow-none">${label}</button>`;
        li.onclick = () => { if (!disabled && !active) { currentPage = page; renderTable(); } };
        container.appendChild(li);
    };

    createBtn('&laquo;', currentPage - 1, currentPage === 1, false);
    for (let i = startPage; i <= endPage; i++) createBtn(i, i, false, i === currentPage);
    createBtn('&raquo;', currentPage + 1, currentPage === totalPages, false);
}

/* --- MODAL DETALLE (COMPLETO) --- */
window.openDetailModal = async (id) => {
    const modal = new bootstrap.Modal(document.getElementById('modal-visor'));
    const body = document.getElementById('modal-visor-body');
    const actions = document.getElementById('modal-actions');
    
    body.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success"></div></div>`;
    modal.show();

    try {
        const res = await API.request(`/user/protocol-detail/${id}`);
        if (res.status === 'success') {
            const d = res.data;
            actions.innerHTML = `<button class="btn btn-danger btn-sm fw-bold shadow-sm" onclick="window.downloadPDF(${d.idprotA})"><i class="bi bi-file-earmark-pdf me-2"></i> DESCARGAR PDF</button>`;

            // Renderizado del Modal con TODO (Título, Tipo, Depto, Severidad...)
            body.innerHTML = `
                <div class="border-bottom pb-3 mb-3">
                    <small class="text-muted text-uppercase fw-bold">Título del Proyecto</small>
                    <h5 class="fw-bold text-primary mb-2">${d.tituloA}</h5>
                    <div class="d-flex gap-2 align-items-center">
                        <span class="badge bg-dark">N° ${d.nprotA}</span>
                        <span class="inst-badge">${d.NombreInst}</span>
                        <span class="badge bg-light text-dark border">${d.NombreTipoprotocolo || 'Tipo no definido'}</span>
                    </div>
                </div>

                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="small text-muted fw-bold text-uppercase">Responsable</label>
                        <div class="fw-bold text-dark">${d.InvestigadorACargA}</div>
                    </div>
                    <div class="col-md-6">
                        <label class="small text-muted fw-bold text-uppercase">Departamento</label>
                        <div class="fw-bold text-dark">${d.NombreDeptoA || '---'}</div>
                    </div>
                    
                    <div class="col-md-6">
                        <label class="small text-muted fw-bold text-uppercase">Vigencia</label>
                        <div class="text-dark">
                            ${d.FechaIniProtA || '?'} <i class="bi bi-arrow-right mx-1 small text-muted"></i> ${d.FechaFinProtA || '?'}
                        </div>
                    </div>
                    <div class="col-md-6">
                        <label class="small text-muted fw-bold text-uppercase">Severidad</label>
                        <div>
                            <span class="badge ${d.NombreSeveridad === 'Severo' ? 'bg-danger' : 'bg-info text-dark'}">
                                ${d.NombreSeveridad || 'No definida'}
                            </span>
                        </div>
                    </div>

                    <div class="col-12 mt-3">
                        <div class="card bg-light border-0 p-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <small class="text-muted text-uppercase fw-bold d-block">Especies Aprobadas</small>
                                    <span class="fw-bold text-dark fs-6">${d.EspeciesLista || 'Sin especies definidas'}</span>
                                </div>
                                <div class="text-center border-start ps-4">
                                    <small class="text-muted text-uppercase fw-bold d-block">Cupo Total</small>
                                    <span class="fs-4 fw-black text-success">${d.CantidadAniA}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
        }
    } catch (e) { body.innerHTML = `<div class="alert alert-danger">Error al cargar datos.</div>`; }
};

/* --- PDF EXACTO AL MODAL --- */
window.downloadPDF = async (id) => {
    try {
        Swal.fire({ title: 'Generando PDF...', didOpen: () => Swal.showLoading() });
        const res = await API.request(`/user/protocol-detail/${id}`);
        
        if (res.status === 'success') {
            const d = res.data;
            const instName = (d.NombreInst || 'GROBO').toUpperCase();

            const template = `
                <div style="font-family: Arial, sans-serif; padding: 30px; color: #333;">
                    
                    <div style="text-align: center; border-bottom: 3px solid #1a5d3b; padding-bottom: 15px; margin-bottom: 25px;">
                        <h2 style="color: #1a5d3b; margin: 0; font-size: 24px; text-transform: uppercase;">${instName}</h2>
                        <h4 style="margin: 8px 0; font-weight: bold; color: #555;">FICHA DE PROTOCOLO #${d.nprotA}</h4>
                        <p style="margin: 0; font-size: 10px; color: #777;">Generado el: ${new Date().toLocaleString()}</p>
                    </div>

                    <div style="background-color: #f8f9fa; padding: 15px; border-left: 5px solid #1a5d3b; margin-bottom: 25px;">
                        <p style="margin: 0 0 5px 0; font-size: 10px; text-transform: uppercase; color: #666; font-weight: bold;">Título del Proyecto:</p>
                        <p style="margin: 0; font-size: 14px; font-weight: bold; color: #000; line-height: 1.4;">
                            ${d.tituloA}
                        </p>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 25px;">
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; width: 30%; color: #666;"><strong>Tipo:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${d.NombreTipoprotocolo || 'No definido'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;"><strong>Responsable:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${d.InvestigadorACargA}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;"><strong>Departamento:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${d.NombreDeptoA || '---'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;"><strong>Vigencia:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${d.FechaIniProtA} al ${d.FechaFinProtA}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;"><strong>Severidad:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${d.NombreSeveridad || '---'}</td>
                        </tr>
                    </table>

                    <div style="border: 1px solid #ccc; padding: 15px; border-radius: 5px;">
                        <table style="width: 100%; text-align: center;">
                            <tr>
                                <td style="border-right: 1px solid #ccc;">
                                    <p style="margin: 0 0 5px 0; font-size: 10px; text-transform: uppercase; color: #666;">Especies Aprobadas</p>
                                    <p style="margin: 0; font-weight: bold; font-size: 14px;">${d.EspeciesLista || '---'}</p>
                                </td>
                                <td>
                                    <p style="margin: 0 0 5px 0; font-size: 10px; text-transform: uppercase; color: #666;">Cupo Total Autorizado</p>
                                    <p style="margin: 0; font-weight: bold; font-size: 18px; color: #1a5d3b;">${d.CantidadAniA}</p>
                                </td>
                            </tr>
                        </table>
                    </div>


            `;

            Swal.close();
            html2pdf().set({ margin: 10, filename: `Protocolo_${d.nprotA}.pdf`, html2canvas: { scale: 2 } }).from(template).save();
        }
    } catch (e) {
        Swal.fire('Error', 'No se pudo generar el PDF', 'error');
    }
};

function exportExcel() {
    const data = allProtocols;
    if (!data.length) return Swal.fire('Info', 'No hay datos para exportar', 'info');
    
    // Headers incluyendo Departamento, Tipo y Severidad
    const headers = ["ID", "N Prot", "Institucion", "Titulo", "Responsable", "Depto", "Tipo", "Severidad", "Cantidad", "Especies", "Vencimiento", "Estado"];
    const rows = [headers.join(";")];
    
    data.forEach(p => rows.push([
        p.idprotA, 
        p.nprotA, 
        p.Institucion, 
        p.tituloA, 
        p.Responsable,
        p.Departamento,
        p.Tipo,
        p.Severidad,
        p.CantidadAprobada, 
        p.Especies, 
        p.Vencimiento, 
        p.EstadoTexto
    ].map(v => String(v||'').replace(/;/g,',')).join(";")));
    
    const blob = new Blob(["\uFEFF" + rows.join("\r\n")], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); 
    link.href = URL.createObjectURL(blob); 
    link.download = "Mis_Protocolos_Global.csv";
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}