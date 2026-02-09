import { API } from '../../api.js';

let allForms = [];
let currentPage = 1;
const rowsPerPage = 12;

export async function initMisFormularios() {
    const userId = localStorage.getItem('userId');
    const instId = localStorage.getItem('instId');

    document.getElementById('btn-export-excel').onclick = openExcelModal;

    try {
        const res = await API.request(`/user/my-forms?user=${userId}&inst=${instId}`);
        if (res.status === 'success') {
            allForms = res.data.list;
            // Ya no configuramos contacto global aquí
            setupInstitutionFilter();
            renderTable();
        }
    } catch (e) { console.error("Error:", e); }

    document.getElementById('search-input').addEventListener('keyup', () => { currentPage = 1; renderTable(); });
    document.getElementById('filter-status').addEventListener('change', () => { currentPage = 1; renderTable(); });
    document.getElementById('filter-inst').addEventListener('change', () => { currentPage = 1; renderTable(); });
}

/* --- RENDERIZADO DE TABLA --- */
function renderTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    const term = document.getElementById('search-input').value.toLowerCase();
    const statusFilter = document.getElementById('filter-status').value;
    const instFilter = document.getElementById('filter-inst').value;

    const filtered = allForms.filter(f => {
        const matchText = Object.values(f).join(' ').toLowerCase().includes(term);
        const matchStatus = statusFilter === 'all' || f.estado === statusFilter;
        const matchInst = instFilter === 'all' || f.NombreInstitucion === instFilter;
        return matchText && matchStatus && matchInst;
    });

    updateCounter(filtered);

    const start = (currentPage - 1) * rowsPerPage;
    const pageData = filtered.slice(start, start + rowsPerPage);

    pageData.forEach(f => {
        const tr = document.createElement('tr');
        tr.className = 'clickable-row align-middle';
        tr.onclick = (e) => { if (!e.target.closest('button')) openDetailModal(f.idformA); };

        const categoryHtml = `
            <div class="d-flex flex-column">
                <span class="fw-bold text-dark" style="font-size: 11px;">${f.Categoria || 'General'}</span>
                <span class="text-muted text-uppercase" style="font-size: 9px;">${f.TipoPedido || ''}</span>
            </div>
        `;

        tr.innerHTML = `
            <td class="ps-3 fw-bold text-muted small">#${f.idformA}</td>
            <td><span class="inst-badge">${f.NombreInstitucion}</span></td>
            <td>${categoryHtml}</td>
            <td class="small">${f.Inicio || '-'}</td>
            <td class="small">${f.Retiro || '-'}</td>
            <td class="text-truncate small" style="max-width: 120px;" title="${f.Protocolo}">${f.Protocolo}</td>
            <td class="text-truncate small" style="max-width: 120px;" title="${f.Departamento}">${f.Departamento}</td>
            <td class="text-center">${getStatusBadge(f.estado)}</td>
            <td class="text-end pe-3">
                <button class="btn btn-sm btn-light border shadow-sm text-danger" onclick="window.downloadPDF(${f.idformA})" title="Descargar PDF">
                    <i class="bi bi-file-earmark-pdf"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderPagination(filtered.length);
}

/* --- PAGINACIÓN INTELIGENTE (MAX 5) --- */
function renderPagination(totalItems) {
    const container = document.getElementById('pagination');
    container.innerHTML = '';
    const totalPages = Math.ceil(totalItems / rowsPerPage);

    if (totalPages <= 1) return;

    // Configuración de ventana deslizante
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage + 1 < maxButtons) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    // Botón Anterior
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<button class="page-link" aria-label="Previous">&laquo;</button>`;
    prevLi.onclick = () => { if (currentPage > 1) { currentPage--; renderTable(); } };
    container.appendChild(prevLi);

    // Botones Numéricos
    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<button class="page-link shadow-none">${i}</button>`;
        li.onclick = () => { currentPage = i; renderTable(); };
        container.appendChild(li);
    }

    // Botón Siguiente
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<button class="page-link" aria-label="Next">&raquo;</button>`;
    nextLi.onclick = () => { if (currentPage < totalPages) { currentPage++; renderTable(); } };
    container.appendChild(nextLi);
}

/* --- MODAL DE DETALLE (DISEÑO IGUALADO AL PDF) --- */
window.openDetailModal = async (id) => {
    const modal = new bootstrap.Modal(document.getElementById('modal-visor'));
    const body = document.getElementById('modal-visor-body');
    const actions = document.getElementById('modal-actions');
    
    // Limpieza inicial
    body.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success"></div></div>`;
    actions.innerHTML = ''; 
    modal.show();

    try {
        const res = await API.request(`/user/form-detail/${id}`);
        if (res.status === 'success') {
            const h = res.data.header;
            const d = res.data.details;
            
            // Inyectar botones (PDF + Contacto)
            const contactInfo = {
                NombreInst: h.NombreInstitucion,
                InstCorreo: h.InstCorreo,
                InstContacto: h.InstContacto
            };
            const contactString = encodeURIComponent(JSON.stringify(contactInfo));

            actions.innerHTML = `
                <div class="d-flex gap-2">
                    <button class="btn btn-danger btn-sm fw-bold shadow-sm" onclick="window.downloadPDF(${h.idformA})">
                        <i class="bi bi-file-earmark-pdf me-2"></i> PDF
                    </button>
                    <button class="btn btn-outline-dark btn-sm fw-bold shadow-sm" onclick="window.openContactModal('${contactString}')">
                        <i class="bi bi-envelope-at me-2"></i> CONTACTAR ${h.NombreInstitucion.toUpperCase()}
                    </button>
                </div>
            `;

            // Cabecera del Modal
            let contentHtml = `
                <div class="row g-3 mb-4 border-bottom pb-3">
                    <div class="col-md-6">
                        <small class="text-muted text-uppercase fw-bold">ID Solicitud</small>
                        <h4 class="mb-0 fw-bold text-primary">#${h.idformA}</h4>
                    </div>
                    <div class="col-md-6 text-end">
                        <small class="text-muted text-uppercase fw-bold">Estado Actual</small><br>
                        ${getStatusBadge(h.estado)}
                    </div>
                </div>
                <div class="row g-3">
                     <div class="col-md-6"><strong class="text-muted">Tipo:</strong> ${h.nombreTipo}</div>
                     <div class="col-md-6"><strong class="text-muted">Solicitado:</strong> ${h.fechainicioA}</div>
                     <div class="col-12"><strong class="text-muted">Aclaración:</strong> <span class="fst-italic">${h.aclaraA || 'Ninguna'}</span></div>
                </div>
                <hr>
                <h6 class="fw-bold text-success text-uppercase mb-3">Detalle Técnico</h6>
            `;

            // --- LÓGICA DE RENDERIZADO VISUAL (Igual al PDF) ---

            // 1. CASO INSUMOS
            if (h.categoriaformulario === 'Insumos') {
                const rows = d.map(item => {
                    const presentacion = `${item.PresentacionCant || ''} ${item.PresentacionTipo || ''}`.trim();
                    return `
                    <tr>
                        <td>
                            <div class="fw-bold text-dark">${item.NombreInsumo}</div>
                            <div class="text-muted small" style="font-size: 11px;">${presentacion}</div>
                        </td>
                        <td class="text-center fw-bold align-middle fs-5">${item.cantidad}</td>
                    </tr>`;
                }).join('');
                
                contentHtml += `
                    <div class="table-responsive">
                        <table class="table table-sm table-bordered align-middle">
                            <thead class="table-light">
                                <tr>
                                    <th class="ps-3 text-uppercase small text-muted">Insumo / Descripción</th>
                                    <th class="text-center text-uppercase small text-muted" style="width: 100px;">Cant.</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>`;
            } 
            // 2. CASO ANIMALES VIVOS
            else if (h.categoriaformulario === 'Animal vivo') {
                contentHtml += `
                    <div class="card bg-light border-0 p-3">
                        <p class="mb-2 fs-6"><strong>Especie:</strong> ${d.EspeNombreA} - ${d.SubEspeNombreA}</p>
                        <div class="d-flex gap-2 justify-content-between text-center bg-white p-2 rounded border">
                            <div class="flex-fill border-end">
                                <small class="text-muted d-block uppercase" style="font-size:10px">Machos</small>
                                <span class="fw-bold">${d.machoA}</span>
                            </div>
                            <div class="flex-fill border-end">
                                <small class="text-muted d-block uppercase" style="font-size:10px">Hembras</small>
                                <span class="fw-bold">${d.hembraA}</span>
                            </div>
                            <div class="flex-fill">
                                <small class="text-success d-block uppercase fw-bold" style="font-size:10px">Total</small>
                                <span class="fw-bold text-success fs-5">${d.totalA}</span>
                            </div>
                        </div>
                    </div>`;
            } 
            // 3. CASO REACTIVOS (Estilo Tarjeta PDF)
            else {
                const presentacion = `${d.PresentacionCant || ''} ${d.PresentacionTipo || ''}`.trim();
                contentHtml += `
                    <div class="card border p-3 shadow-sm">
                        <small class="text-muted text-uppercase fw-bold" style="font-size: 10px;">Producto Solicitado</small>
                        <div class="d-flex justify-content-between align-items-center mt-1">
                            <div>
                                <h5 class="mb-0 fw-bold text-dark">${d.NombreInsumo || 'N/A'}</h5>
                                <small class="text-muted">${presentacion}</small>
                            </div>
                            <div class="text-end">
                                <small class="text-muted text-uppercase fw-bold d-block" style="font-size: 10px;">Cantidad</small>
                                <span class="badge bg-light text-dark border fs-6 px-3">${d.Cantidad || '0'}</span>
                            </div>
                        </div>
                    </div>`;
            }

            body.innerHTML = contentHtml;
        }
    } catch (e) {
        body.innerHTML = `<div class="alert alert-danger">Error cargando detalles del pedido.</div>`;
    }
};

/* --- ABRIR MODAL CONTACTO --- */
window.openContactModal = (encodedInfo) => {
    const info = JSON.parse(decodeURIComponent(encodedInfo));
    const modalTitle = document.getElementById('contact-modal-title');
    const modalBody = document.getElementById('contact-modal-body');

    modalTitle.innerText = (info.NombreInst || 'Institución').toUpperCase();
    const mailLink = info.InstCorreo ? `mailto:${info.InstCorreo}?subject=Consulta Pedido GROBO` : '#';
    const phone = info.InstContacto || 'No disponible';
    
    modalBody.innerHTML = `
        <div class="text-center">
            <div class="mb-4"><i class="bi bi-building fs-1 text-success"></i><h5 class="mt-2 fw-bold text-dark">${info.NombreInst}</h5></div>
            <div class="d-grid gap-3">
                <a href="${mailLink}" class="btn btn-outline-primary fw-bold ${!info.InstCorreo ? 'disabled' : ''}"><i class="bi bi-envelope-at me-2"></i> ${info.InstCorreo || 'Sin correo'}</a>
                <div class="p-3 bg-light rounded border"><small class="text-muted text-uppercase fw-bold">Teléfono / Contacto</small><div class="fs-5 fw-bold text-dark mt-1"><i class="bi bi-telephone me-2"></i> ${phone}</div></div>
            </div>
        </div>`;
    new bootstrap.Modal(document.getElementById('modal-contact')).show();
};

/* --- PDF GENERATOR (FORMATO FINAL CORREGIDO) --- */
window.downloadPDF = async (id) => {
    try {
        Swal.fire({ title: 'Generando PDF...', didOpen: () => Swal.showLoading() });
        const res = await API.request(`/user/form-detail/${id}`);
        
        if (res.status === 'success') {
            const h = res.data.header;
            const d = res.data.details;
            const instName = (h.NombreInstitucion || localStorage.getItem('NombreInst') || 'GROBO').toUpperCase();
            const categoria = (h.Categoria || h.categoriaformulario || '').trim();

            let technicalHtml = '<p class="text-muted fst-italic">Sin detalles técnicos disponibles.</p>';

            // 1. CASO INSUMOS (Array)
            if (categoria === 'Insumos' && Array.isArray(d) && d.length > 0) {
                const rows = d.map(i => {
                    // Formato: Nombre arriba, Presentación abajo
                    const presentacion = `${i.PresentacionCant || ''} ${i.PresentacionTipo || ''}`.trim();
                    return `
                    <tr>
                        <td style="border:1px solid #ddd; padding:8px;">
                            <span style="font-weight:bold; color:#000;">${i.NombreInsumo}</span><br>
                            <span style="color:#666; font-size:10px;">${presentacion}</span>
                        </td>
                        <td style="border:1px solid #ddd; padding:8px; text-align:center; font-weight:bold; font-size:14px;">
                            ${i.cantidad}
                        </td>
                    </tr>`;
                }).join('');
                
                technicalHtml = `
                    <table style="width:100%; border-collapse:collapse; margin-top:10px;">
                        <thead>
                            <tr style="background:#f0f0f0;">
                                <th style="border:1px solid #ddd; padding:8px; font-size:11px; text-align:left; color:#444;">INSUMO / DESCRIPCIÓN</th>
                                <th style="border:1px solid #ddd; padding:8px; font-size:11px; text-align:center; color:#444;">CANTIDAD</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>`;
            } 
            // 2. CASO ANIMAL VIVO
            else if (categoria === 'Animal vivo' && d) {
                technicalHtml = `
                    <div style="border:1px solid #ddd; padding:10px; margin-top:10px; border-radius:4px;">
                        <p style="margin:0 0 5px 0; font-size:12px;"><strong>Especie:</strong> ${d.EspeNombreA || ''} - ${d.SubEspeNombreA || ''}</p>
                        <table style="width:100%; text-align:center; margin-top:5px; font-size:11px; border-collapse:collapse;">
                            <tr>
                                <td style="border:1px solid #ccc; padding:6px; background:#f9f9f9;">Machos<br><b>${d.machoA || 0}</b></td>
                                <td style="border:1px solid #ccc; padding:6px; background:#f9f9f9;">Hembras<br><b>${d.hembraA || 0}</b></td>
                                <td style="border:1px solid #ccc; padding:6px; background:#e8f5e9; font-weight:bold; color:#1a5d3b;">TOTAL<br>${d.totalA || 0}</td>
                            </tr>
                        </table>
                    </div>`;
            } 
            // 3. CASO REACTIVOS (Objeto único)
            else if (d) {
                const nombreItem = d.NombreInsumo || 'Reactivo Biológico';
                const orderedQty = d.Cantidad || 0;
                // Datos del catálogo (Presentación)
                const presentacion = `${d.PresentacionCant || ''} ${d.PresentacionTipo || ''}`.trim();

                technicalHtml = `
                    <table style="width:100%; border-collapse:collapse; margin-top:10px;">
                        <thead>
                            <tr style="background:#f0f0f0;">
                                <th style="border:1px solid #ddd; padding:8px; font-size:11px; text-align:left; color:#444;">REACTIVO / MATERIAL</th>
                                <th style="border:1px solid #ddd; padding:8px; font-size:11px; text-align:center; color:#444;">CANTIDAD</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="border:1px solid #ddd; padding:8px;">
                                    <span style="font-weight:bold; color:#000;">${nombreItem}</span><br>
                                    <span style="color:#666; font-size:10px;">${presentacion}</span>
                                </td>
                                <td style="border:1px solid #ddd; padding:8px; text-align:center; font-weight:bold; font-size:14px;">
                                    ${orderedQty}
                                </td>
                            </tr>
                        </tbody>
                    </table>`;
            }

            // PLANTILLA GENERAL
            const template = `
                <div style="font-family: Arial, sans-serif; padding: 30px; color: #333;">
                    <div style="text-align: center; border-bottom: 3px solid #1a5d3b; padding-bottom: 15px; margin-bottom: 25px;">
                        <h2 style="color: #1a5d3b; margin: 0; font-size: 24px; text-transform: uppercase;">${instName}</h2>
                        <h4 style="margin: 8px 0; font-weight: bold; color: #555;">FICHA DE PEDIDO #${h.idformA}</h4>
                        <p style="margin: 0; font-size: 10px; color: #777;">Generado el: ${new Date().toLocaleString()}</p>
                    </div>

                    <table style="width:100%; font-size:12px; margin-bottom:20px;">
                        <tr>
                            <td style="padding:4px 0;"><strong>Categoría:</strong></td>
                            <td>${h.Categoria} (${h.nombreTipo})</td>
                        </tr>
                        <tr>
                            <td style="padding:4px 0;"><strong>Protocolo:</strong></td>
                            <td>${h.nprotA || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding:4px 0;"><strong>Fechas:</strong></td>
                            <td>Inicio: ${h.fechainicioA} | Retiro: ${h.fecRetiroA || 'A coordinar'}</td>
                        </tr>
                        <tr>
                            <td style="padding:4px 0;"><strong>Estado:</strong></td>
                            <td><span style="background:#eee; padding:2px 5px; border-radius:3px; font-weight:bold;">${h.estado}</span></td>
                        </tr>
                    </table>

                    <div style="background-color: #fff8e1; border-left: 4px solid #ffc107; padding: 12px; margin-bottom: 25px; font-size: 11px;">
                        <strong>Observaciones:</strong><br>
                        ${h.aclaraA || 'Sin observaciones adicionales.'}
                    </div>
                    
                    <h4 style="border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 15px; color: #1a5d3b; font-size: 14px; text-transform: uppercase;">Detalle Técnico</h4>
                    ${technicalHtml}

                    <div style="margin-top: 100px; display: flex; justify-content: space-between;">
                        <div style="width: 40%; border-top: 1px solid #999; text-align: center; font-size: 10px; padding-top: 5px;">
                            Firma Responsable
                        </div>
                        <div style="width: 40%; border-top: 1px solid #999; text-align: center; font-size: 10px; padding-top: 5px;">
                            Sello Institucional
                        </div>
                    </div>
                </div>
            `;

            Swal.close();
            
            const opt = { 
                margin: 10, 
                filename: `Pedido_${h.idformA}_${instName}.pdf`, 
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                html2canvas: { scale: 2, useCORS: true } 
            };
            html2pdf().set(opt).from(template).save();
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'No se pudo generar el PDF.', 'error');
    }
};

// ... (Funciones de filtro de inst, updateCounter, excel, etc. se mantienen igual) ...
function setupInstitutionFilter() {
    const insts = [...new Set(allForms.map(f => f.NombreInstitucion))];
    const container = document.getElementById('container-filter-inst');
    const select = document.getElementById('filter-inst');
    if (insts.length > 1) {
        container.classList.remove('d-none');
        insts.sort().forEach(inst => {
            const option = document.createElement('option');
            option.value = inst; option.text = inst; select.appendChild(option);
        });
    } else { container.classList.add('d-none'); }
}

function updateCounter(filteredData) {
    const uniqueInst = [...new Set(filteredData.map(f => f.NombreInstitucion))];
    const countInst = uniqueInst.length;
    const countRec = filteredData.length;
    let text = `${countRec} Registros`;
    if (countInst > 1) text += ` entre ${countInst} Instituciones`;
    else if (countInst === 1) text += ` en ${uniqueInst[0]}`;
    else text += ` (Sin datos)`;
    document.getElementById('dynamic-counter').innerHTML = text;
}

function getStatusBadge(estado) {
    const map = {
        'Sin estado': 'bg-secondary', 'Proceso': 'bg-primary', 'Listo para entrega': 'bg-info text-dark',
        'Entregado': 'bg-success', 'Suspendido': 'bg-warning text-dark', 'Rechazado': 'bg-danger'
    };
    return `<span class="badge ${map[estado] || 'bg-light text-dark border'} shadow-sm badge-status">${estado || 'Sin estado'}</span>`;
}

function openExcelModal() { new bootstrap.Modal(document.getElementById('modal-excel')).show(); }

window.processExcelExport = () => {
    const start = document.getElementById('excel-start').value;
    const end = document.getElementById('excel-end').value;
    const user = (localStorage.getItem('userFull') || 'Usuario').toUpperCase();
    if (!start || !end) return Swal.fire('Atención', 'Seleccione fechas.', 'warning');
    const data = allForms.filter(r => { const f = r.Inicio || '0000-00-00'; return f >= start && f <= end; });
    if (data.length === 0) return Swal.fire('Sin datos', 'No hay registros.', 'info');
    const headers = ["ID", "Institución", "Categoría", "Tipo", "Inicio", "Retiro", "Protocolo", "Departamento", "Estado"];
    const rows = [headers.join(";")];
    data.forEach(r => {
        const row = [r.idformA, r.NombreInstitucion, r.Categoria, r.TipoPedido, `="${r.Inicio||''}"`, `="${r.Retiro||''}"`, r.Protocolo, r.Departamento, r.estado];
        rows.push(row.map(v => String(v).replace(/;/g, ',')).join(";"));
    });
    const blob = new Blob(["\uFEFF" + rows.join("\r\n")], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `MIS_PEDIDOS_${user}_${start}_${end}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};