import { API } from '../../api.js';
import { getTipoFormBadgeStyle } from '../../utils/badgeTipoForm.js';

let allForms = [];
let currentPage = 1;
let protocolsUsedCache = [];
const rowsPerPage = 12;
let derivationTargets = [];

export async function initMisFormularios() {
    const userId = localStorage.getItem('userId');
    const instId = localStorage.getItem('instId');

    document.getElementById('btn-export-excel').onclick = openExcelModal;

    const btnProtocolsUsed = document.getElementById('btn-protocols-used');
    if (btnProtocolsUsed) btnProtocolsUsed.onclick = openProtocolsUsedModal;
    const btnInsumosPedidos = document.getElementById('btn-insumos-pedidos');
    if (btnInsumosPedidos) btnInsumosPedidos.onclick = openInsumosPedidosModal;
    const btnInsumosExpPedidos = document.getElementById('btn-insumos-exp-pedidos');
    if (btnInsumosExpPedidos) btnInsumosExpPedidos.onclick = openInsumosExpPedidosModal;
    const btnConfirmDerive = document.getElementById('btn-confirm-derive');
    if (btnConfirmDerive) btnConfirmDerive.onclick = confirmDeriveForm;

    try {
        const res = await API.request(`/user/my-forms?user=${userId}&inst=${instId}`);
        if (res.status === 'success') {
            allForms = res.data.list;
            // Ya no configuramos contacto global aquí
            setupInstitutionFilter();
            setupOriginInstitutionFilter();
            renderTable();
        }
    } catch (e) { console.error("Error:", e); }

    try {
        const instActiva = localStorage.getItem('instId') || sessionStorage.getItem('instId') || '';
        const resTargets = await API.request(`/forms/derivation/targets?inst=${encodeURIComponent(instActiva)}&instId=${encodeURIComponent(instActiva)}`);
        if (resTargets.status === 'success' && Array.isArray(resTargets.data)) {
            derivationTargets = resTargets.data;
        }
    } catch (e) { console.error('Error cargando instituciones destino de derivación', e); }

    document.getElementById('search-input').addEventListener('keyup', () => { currentPage = 1; renderTable(); });
    document.getElementById('filter-status').addEventListener('change', () => { currentPage = 1; renderTable(); });
    document.getElementById('filter-inst').addEventListener('change', () => { currentPage = 1; renderTable(); });
    document.getElementById('filter-derivation')?.addEventListener('change', () => { currentPage = 1; renderTable(); });
    document.getElementById('filter-origin-inst')?.addEventListener('change', () => { currentPage = 1; renderTable(); });
}

/* --- RENDERIZADO DE TABLA --- */
function renderTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    const term = document.getElementById('search-input').value.toLowerCase();
    const statusFilter = document.getElementById('filter-status').value;
    const instFilter = document.getElementById('filter-inst').value;
    const derivationFilter = document.getElementById('filter-derivation')?.value || 'all';
    const originInstFilter = document.getElementById('filter-origin-inst')?.value || 'all';

    const normEst = (v) => (v == null || String(v).trim() === '' ? 'Sin estado' : String(v).trim());

    const filtered = allForms.filter(f => {
        const matchText = Object.values(f).join(' ').toLowerCase().includes(term);
        const matchStatus = statusFilter === 'all'
            || normEst(f.estado) === statusFilter
            || normEst(f.estado_origen) === statusFilter
            || normEst(f.estado_destino) === statusFilter;
        const instNames = Array.isArray(f.institucionesParticipantes) && f.institucionesParticipantes.length
            ? f.institucionesParticipantes.map(i => i.NombreInst)
            : [f.NombreInstitucion].filter(Boolean);
        const matchInst = instFilter === 'all' || instNames.includes(instFilter);
        const isDerived = Number(f.DerivadoActivo || 0) === 1;
        const matchDeriv = derivationFilter === 'all'
            || (derivationFilter === 'derived' && isDerived)
            || (derivationFilter === 'local' && !isDerived);
        const matchOrigin = originInstFilter === 'all'
            || (f.NombreInstitucionOrigen || '') === originInstFilter;
        return matchText && matchStatus && matchInst && matchDeriv && matchOrigin;
    });

    updateCounter(filtered);

    const start = (currentPage - 1) * rowsPerPage;
    const pageData = filtered.slice(start, start + rowsPerPage);

    pageData.forEach(f => {
        const tr = document.createElement('tr');
        tr.className = 'clickable-row align-middle';
        tr.onclick = (e) => { if (!e.target.closest('button')) openDetailModal(f.idformA); };

        const badgeStyle = getTipoFormBadgeStyle(f.colorTipo);
        const tipoLabel = (f.TipoPedido || f.Categoria || '').trim() || (window.txt?.misformularios?.general || 'General');
        const categoryHtml = `
            <div class="d-flex flex-column">
                <span class="${badgeStyle.className}" style="${badgeStyle.style} font-size: 10px; padding: 3px 8px; width: fit-content;">${tipoLabel.replace(/</g, '&lt;')}</span>
            </div>
        `;

        const actions = buildActionButtons(f);
        const instParticipantes = Array.isArray(f.institucionesParticipantes) && f.institucionesParticipantes.length
            ? f.institucionesParticipantes.map(i => i.NombreInst).join(' → ')
            : (f.NombreInstitucion || '—');
        tr.innerHTML = `
            <td class="ps-3 fw-bold text-muted small">#${f.idformA}</td>
            <td><span class="inst-badge" title="${instParticipantes}">${instParticipantes}</span></td>
            <td>${categoryHtml}</td>
            <td class="small">${f.Inicio || '-'}</td>
            <td class="small">${f.Retiro || '-'}</td>
            <td class="text-truncate small" style="max-width: 120px;" title="${f.Protocolo}">${f.Protocolo}</td>
            <td class="text-truncate small" style="max-width: 120px;" title="${f.Departamento}">${f.Departamento}</td>
            <td class="text-truncate small" style="max-width: 100px;" title="${f.Organizacion || ''}">${f.Organizacion || ''}</td>
            <td class="text-center">${getStatusWithWorkflow(f)}</td>
            <td class="text-end pe-3">
                ${actions}
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
            
            // Inyectar botones (PDF + contacto por cada institución participante)
            const participantesContacto = Array.isArray(h.institucionesParticipantes) && h.institucionesParticipantes.length
                ? h.institucionesParticipantes.map((inst) => ({
                    NombreInst: inst.NombreInst || '—',
                    InstCorreo: inst.InstCorreo || '',
                    InstContacto: inst.InstContacto || ''
                }))
                : [{
                    NombreInst: h.NombreInstitucion || '—',
                    InstCorreo: h.InstCorreo || '',
                    InstContacto: h.InstContacto || ''
                }];
            const contactPayload = encodeURIComponent(JSON.stringify({ contactos: participantesContacto }));
            const tmf = window.txt?.misformularios || {};
            const contactBtns = participantesContacto.map((c) => {
                const one = encodeURIComponent(JSON.stringify({ contactos: [c] }));
                const label = (c.NombreInst || '').substring(0, 28) + ((c.NombreInst || '').length > 28 ? '…' : '');
                return `<button type="button" class="btn btn-outline-dark btn-sm fw-bold shadow-sm" onclick="window.openContactModal('${one}')"><i class="bi bi-envelope-at me-1"></i> ${tmf.btn_contactar_inst || 'Contactar'}: ${String(label).replace(/</g, '&lt;')}</button>`;
            }).join('');

            actions.innerHTML = `
                <div class="d-flex flex-wrap gap-2 align-items-center">
                    <button class="btn btn-danger btn-sm fw-bold shadow-sm" onclick="window.downloadPDF(${h.idformA})">
                        <i class="bi bi-file-earmark-pdf me-2"></i> PDF
                    </button>
                    ${participantesContacto.length > 1 ? `<button type="button" class="btn btn-outline-success btn-sm fw-bold shadow-sm" onclick="window.openContactModal('${contactPayload}')"><i class="bi bi-buildings me-1"></i> ${tmf.btn_contactar_todas || 'Ver contactos de todas'}</button>` : ''}
                    ${contactBtns}
                </div>
            `;

            const porInst = (Number(h.DerivadoActivo || 0) === 1 && (h.InstitucionActualNombre || '').trim()) ? h.InstitucionActualNombre.trim() : undefined;
            const derivBadge = (Number(h.DerivadoActivo || 0) === 1) ? getWorkflowBadgeRow(h) : '';
            const estadoBadge = getStatusBadge(h.estado, porInst);
            let contentHtml = `
                <div class="row g-3 mb-4 border-bottom pb-3">
                    <div class="col-md-6">
                        <small class="text-muted text-uppercase fw-bold">ID Solicitud</small>
                        <h4 class="mb-0 fw-bold text-primary">#${h.idformA}</h4>
                    </div>
                    <div class="col-md-6 text-end">
                        <small class="text-muted text-uppercase fw-bold">Estado Actual</small><br>
                        <div class="d-inline-flex flex-column align-items-end">${derivBadge}${estadoBadge}</div>
                    </div>
                </div>
                <div class="row g-3">
                     <div class="col-md-6"><strong class="text-muted">${window.txt?.misformularios?.label_origen || 'Origen'}:</strong> ${h.NombreInstitucionOrigen || h.NombreInstitucion || '—'}</div>
                     <div class="col-md-6"><strong class="text-muted">${window.txt?.misformularios?.label_tipo || 'Tipo'}:</strong> ${h.nombreTipo || '—'}</div>
                     <div class="col-md-6"><strong class="text-muted">${window.txt?.misformularios?.label_categoria || 'Categoría'}:</strong> ${h.Categoria || h.categoriaformulario || '—'}</div>
                     <div class="col-md-6"><strong class="text-muted">${window.txt?.misformularios?.label_solicitado || 'Solicitado'}:</strong> ${h.fechainicioA || '—'}</div>
                     <div class="col-md-6"><strong class="text-muted">${window.txt?.misformularios?.label_retiro || 'Retiro'}:</strong> ${h.fecRetiroA || '—'}</div>
                     <div class="col-md-6"><strong class="text-muted">${window.txt?.misformularios?.label_protocolo || 'Protocolo'}:</strong> ${(h.nprotA ? h.nprotA + (h.TituloProtocolo ? ' - ' + h.TituloProtocolo : '') : '—')}</div>
                     <div class="col-md-6"><strong class="text-muted">${window.txt?.generales?.departamento || 'Departamento'}:</strong> ${h.NombreDeptoA || '—'}</div>
                     <div class="col-md-6"><strong class="text-muted">${window.txt?.misformularios?.label_organizacion || 'Organización'}:</strong> ${h.NombreOrganismoSimple || '—'}</div>
                     <div class="col-12"><strong class="text-muted">${window.txt?.misformularios?.label_instituciones || 'Instituciones'}:</strong> ${Array.isArray(h.institucionesParticipantes) && h.institucionesParticipantes.length ? h.institucionesParticipantes.map(inst => inst.NombreInst).join(' → ') : (h.NombreInstitucion || '—')}</div>
                     <div class="col-12"><strong class="text-muted">${window.txt?.misformularios?.label_aclaracion || 'Aclaración'}:</strong> <span class="fst-italic">${h.aclaraA || 'Ninguna'}</span></div>
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
            else if (h.categoriaformulario === 'Animal') {
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

            try {
                const instActiva = localStorage.getItem('instId') || sessionStorage.getItem('instId') || '';
                const resHist = await API.request(`/forms/derivation/history?idformA=${id}&inst=${encodeURIComponent(instActiva)}`);
                if (resHist.status === 'success' && Array.isArray(resHist.data) && resHist.data.length) {
                    const lblHist = window.txt?.misformularios?.historial_derivacion_formulario || 'Historial de derivación del formulario';
                    const histHtml = resHist.data.map(d => {
                        const estado = Number(d.estado_derivacion || 0);
                        const badge = estado === 1 ? 'bg-primary' : (estado === 2 ? 'bg-success' : (estado === 3 ? 'bg-warning text-dark' : (estado === 4 ? 'bg-danger' : 'bg-secondary')));
                        return `<div class="border rounded p-2 mb-2"><div class="d-flex justify-content-between"><div class="small fw-bold">#${d.IdFormularioDerivacion}</div><span class="badge ${badge}">${estadoText(estado)}</span></div><div class="small text-muted mt-1">${d.InstitucionOrigenNombre || '-'} → ${d.InstitucionDestinoNombre || '-'}</div><div class="small mt-1">${d.mensaje_origen || d.mensaje_destino || d.motivo_rechazo || ''}</div></div>`;
                    }).join('');
                    body.insertAdjacentHTML('beforeend', `<hr class="my-4"><h6 class="fw-bold text-dark text-uppercase mb-3"><i class="bi bi-clock-history me-2"></i>${lblHist}</h6><div class="small">${histHtml}</div>`);
                }
            } catch (e) { /* no mostrar error si falla */ }
        }
    } catch (e) {
        body.innerHTML = `<div class="alert alert-danger">Error cargando detalles del pedido.</div>`;
    }
};

/* --- ABRIR MODAL CONTACTO (una o varias instituciones) --- */
window.openContactModal = (encodedInfo) => {
    let data = JSON.parse(decodeURIComponent(encodedInfo));
    const list = Array.isArray(data.contactos) ? data.contactos : (data.NombreInst ? [data] : []);
    const modalTitle = document.getElementById('contact-modal-title');
    const modalBody = document.getElementById('contact-modal-body');
    const tmf = window.txt?.misformularios || {};
    const subj = encodeURIComponent(tmf.contacto_mail_asunto || 'Consulta pedido GROBO');

    modalTitle.innerText = list.length > 1
        ? (tmf.contacto_modal_todas || 'Contacto — instituciones').toUpperCase()
        : (list[0]?.NombreInst || tmf.contacto_modal_una || 'Institución').toUpperCase();

    const blocks = list.map((info) => {
        const mailLink = info.InstCorreo ? `mailto:${info.InstCorreo}?subject=${subj}` : '#';
        const phone = info.InstContacto || (tmf.contacto_no_tel || 'No disponible');
        const sinCorreo = tmf.contacto_sin_correo || 'Sin correo';
        const telLbl = tmf.contacto_tel_lbl || 'Teléfono / Contacto';
        return `
        <div class="border rounded p-3 mb-3 bg-light">
            <div class="text-center mb-3"><i class="bi bi-building fs-3 text-success"></i><h6 class="mt-2 fw-bold text-dark mb-0">${String(info.NombreInst || '').replace(/</g, '&lt;')}</h6></div>
            <div class="d-grid gap-2">
                <a href="${mailLink}" class="btn btn-outline-primary fw-bold btn-sm ${!info.InstCorreo ? 'disabled' : ''}"><i class="bi bi-envelope-at me-2"></i> ${info.InstCorreo || sinCorreo}</a>
                <div class="p-2 bg-white rounded border small"><span class="text-muted text-uppercase fw-bold">${telLbl}</span><div class="fw-bold text-dark mt-1"><i class="bi bi-telephone me-2"></i> ${String(phone).replace(/</g, '&lt;')}</div></div>
            </div>
        </div>`;
    }).join('');

    modalBody.innerHTML = `<div class="px-1">${blocks}</div>`;
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
            else if (categoria === 'Animal' && d) {
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
                margin: [18, 18, 18, 18], 
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
    const insts = [...new Set(allForms.flatMap(f =>
        Array.isArray(f.institucionesParticipantes) && f.institucionesParticipantes.length
            ? f.institucionesParticipantes.map(i => i.NombreInst)
            : [f.NombreInstitucion].filter(Boolean)
    ))];
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

function setupOriginInstitutionFilter() {
    const origins = [...new Set(
        allForms
            .map(f => (f.NombreInstitucionOrigen || '').trim())
            .filter(Boolean)
    )];
    const container = document.getElementById('container-filter-origin-inst');
    const select = document.getElementById('filter-origin-inst');
    if (!container || !select) return;
    select.innerHTML = `<option value="all">${window.txt?.misformularios?.filter_origen_todos || 'Todas las instituciones origen'}</option>`;
    if (origins.length > 0) {
        container.classList.remove('d-none');
        origins.sort().forEach(inst => {
            const option = document.createElement('option');
            option.value = inst;
            option.text = inst;
            select.appendChild(option);
        });
    } else {
        container.classList.add('d-none');
    }
}

function updateCounter(filteredData) {
    const uniqueInst = [...new Set(filteredData.flatMap(f =>
        Array.isArray(f.institucionesParticipantes) && f.institucionesParticipantes.length
            ? f.institucionesParticipantes.map(i => i.NombreInst)
            : [f.NombreInstitucion].filter(Boolean)
    ))];
    const countInst = uniqueInst.length;
    const countRec = filteredData.length;
    let text = `${countRec} Registros`;
    if (countInst > 1) text += ` entre ${countInst} Instituciones`;
    else if (countInst === 1) text += ` en ${uniqueInst[0]}`;
    else text += ` (Sin datos)`;
    document.getElementById('dynamic-counter').innerHTML = text;
}

function getStatusBadge(estado, porInstitucion) {
    const tx = window.txt?.misformularios || {};
    const map = {
        'Sin estado': 'bg-secondary', 'Proceso': 'bg-primary', 'Listo para entrega': 'bg-info text-dark',
        'Entregado': 'bg-success', 'Suspendido': 'bg-warning text-dark', 'Rechazado': 'bg-danger', 'Reservado': 'bg-info text-dark'
    };
    const keyEst = (estado != null && String(estado).trim() !== '') ? String(estado).trim() : 'Sin estado';
    const lbl = porInstitucion ? `${keyEst} ${tx.estado_por || 'por'} ${porInstitucion}` : keyEst;
    return `<span class="badge ${map[keyEst] || 'bg-light text-dark border'} shadow-sm badge-status mt-1">${lbl}</span>`;
}

function getWorkflowBadgeRow(f) {
    const tx = window.txt?.misformularios || {};
    const isDerived = Number(f.DerivadoActivo || 0) === 1;
    if (isDerived) {
        const originName = (f.NombreInstitucionOrigen || '').trim();
        const currentName = (f.InstitucionActualNombre || '').trim();
        const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const routeText = [originName, currentName].filter(Boolean).map(esc).join(' → ');
        const base = tx.workflow_derivado || 'Derivado';
        const label = routeText ? `${base} · ${routeText}` : base;
        return `<span class="badge bg-primary">${label}</span>`;
    }
    const wf = (f.EstadoWorkflow || '').toString().toUpperCase();
    if (!wf) return `<span class="badge bg-light text-dark border">${tx.workflow_local || 'Local'}</span>`;
    if (wf.includes('RECHAZ')) return `<span class="badge bg-danger">${tx.workflow_rechazado || 'Rechazado'}</span>`;
    if (wf.includes('DEVUEL')) return `<span class="badge bg-warning text-dark">${tx.workflow_devuelto || 'Devuelto'}</span>`;
    if (wf.includes('CANCEL')) return `<span class="badge bg-secondary">${tx.workflow_cancelado || 'Cancelado'}</span>`;
    return `<span class="badge bg-info text-dark">${wf}</span>`;
}

function getStatusWithWorkflow(f) {
    const isDerived = Number(f.DerivadoActivo || 0) === 1;
    // Queremos que en investigador, los derivados muestren SIEMPRE 2 estados (Origen/Destino).
    // A veces el backend no manda las keys con valor, pero el objeto incluye los campos; por eso usamos hasOwnProperty.
    const hasEstadoOrigenKey = Object.prototype.hasOwnProperty.call(f, 'estado_origen');
    const hasEstadoDestinoKey = Object.prototype.hasOwnProperty.call(f, 'estado_destino');
    const hasDualEstados = isDerived && (hasEstadoOrigenKey || hasEstadoDestinoKey || f.estado_origen != null || f.estado_destino != null);
    let estadoBadge;
    if (hasDualEstados) {
        // Destino → origen → estado del formulario (evita "—" cuando derivación aún no copió columnas).
        const st = (f.estado_destino != null && String(f.estado_destino).trim() !== '')
            ? f.estado_destino
            : (f.estado_origen != null && String(f.estado_origen).trim() !== '')
                ? f.estado_origen
                : (f.estado != null && String(f.estado).trim() !== '' ? f.estado : null);
        const b = st ? getStatusBadge(st) : getStatusBadge('Sin estado');
        estadoBadge = `<div class="d-flex flex-column gap-1 small">${b}</div>`;
    } else {
        const porInst = isDerived ? (f.InstitucionActualNombre || '').trim() : '';
        estadoBadge = getStatusBadge(f.estado, porInst || undefined);
    }
    const derivLine = isDerived ? `<div class="mb-1">${getWorkflowBadgeRow(f)}</div>` : '';
    return `<div class="d-inline-flex flex-column align-items-center">${derivLine}${estadoBadge}</div>`;
}

function buildActionButtons(f) {
    const instId = Number(localStorage.getItem('instId') || 0);
    const isDerived = Number(f.DerivadoActivo || 0) === 1;
    const canDerive = !isDerived;
    const canCancel = isDerived && Number(f.IdInstitucionOrigen || 0) === instId && Number(f.IdFormularioDerivacionActiva || 0) > 0;

    const btnPdf = `<button class="btn btn-sm btn-light border shadow-sm text-danger" onclick="window.downloadPDF(${f.idformA})" title="Descargar PDF"><i class="bi bi-file-earmark-pdf"></i></button>`;
    const btnHistory = `<button class="btn btn-sm btn-outline-dark border shadow-sm" onclick="window.openDerivationHistory(${f.idformA})" title="${window.txt?.misformularios?.historial_derivacion_titulo || 'Historial de derivación'}"><i class="bi bi-clock-history"></i></button>`;
    const btnDerive = canDerive
        ? `<button class="btn btn-sm btn-outline-primary border shadow-sm" onclick="window.openDeriveModal(${f.idformA})" title="${window.txt?.misformularios?.derivar_btn || 'Derivar'}"><i class="bi bi-arrow-left-right"></i></button>`
        : '';
    const btnCancel = canCancel
        ? `<button class="btn btn-sm btn-outline-warning border shadow-sm" onclick="window.cancelDerivation(${f.IdFormularioDerivacionActiva})" title="${window.txt?.misformularios?.retirar_derivacion_btn || 'Retirar derivación'}"><i class="bi bi-arrow-counterclockwise"></i></button>`
        : '';

    return `<div class="d-flex justify-content-end gap-1">${btnPdf}${btnHistory}${btnDerive}${btnCancel}</div>`;
}

window.openDeriveModal = (idformA) => {
    const select = document.getElementById('derive-target-inst');
    const hidden = document.getElementById('derive-form-id');
    const msg = document.getElementById('derive-message');
    if (!select || !hidden || !msg) return;
    hidden.value = String(idformA);
    msg.value = '';
    select.innerHTML = '';
    if (!derivationTargets.length) {
        select.innerHTML = `<option value="">${window.txt?.misformularios?.derivar_sin_destinos || 'No hay instituciones disponibles para derivar'}</option>`;
    } else {
        select.innerHTML = derivationTargets.map(t => `<option value="${t.IdInstitucion}">${t.NombreInst}</option>`).join('');
    }
    new bootstrap.Modal(document.getElementById('modal-derivar-form')).show();
};

async function confirmDeriveForm() {
    const idformA = Number(document.getElementById('derive-form-id')?.value || 0);
    const instDestino = Number(document.getElementById('derive-target-inst')?.value || 0);
    const mensaje = (document.getElementById('derive-message')?.value || '').trim();
    if (!idformA || !instDestino) {
        Swal.fire('Atención', window.txt?.misformularios?.derivar_error_destino || 'Seleccione una institución destino.', 'warning');
        return;
    }

    try {
        Swal.fire({ title: window.txt?.misformularios?.derivar_procesando || 'Derivando...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
        const instActiva = localStorage.getItem('instId') || sessionStorage.getItem('instId') || '';
        const res = await API.request('/forms/derivation/derive', 'POST', { idformA, instDestino, mensaje, instId: Number(instActiva || 0) });
        if (res.status === 'success') {
            Swal.fire('OK', window.txt?.misformularios?.derivar_ok || 'Formulario derivado correctamente.', 'success');
            const modalEl = document.getElementById('modal-derivar-form');
            bootstrap.Modal.getInstance(modalEl)?.hide();
            await reloadMyForms();
        } else {
            Swal.fire('Error', res.message || 'No se pudo derivar.', 'error');
        }
    } catch (e) {
        Swal.fire('Error', e?.message || 'No se pudo derivar.', 'error');
    }
}

window.openDerivationHistory = async (idformA) => {
    const listEl = document.getElementById('derivation-history-list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-dark"></div></div>';
    new bootstrap.Modal(document.getElementById('modal-derivacion-history')).show();

    try {
        const instActiva = localStorage.getItem('instId') || sessionStorage.getItem('instId') || '';
        const res = await API.request(`/forms/derivation/history?idformA=${idformA}&inst=${encodeURIComponent(instActiva)}`);
        if (res.status !== 'success' || !Array.isArray(res.data) || !res.data.length) {
            listEl.innerHTML = `<div class="p-3 text-muted">${window.txt?.misformularios?.historial_derivacion_vacio || 'Sin movimientos de derivación.'}</div>`;
            return;
        }
        listEl.innerHTML = res.data.map(d => {
            const estado = Number(d.estado_derivacion || 0);
            const badge = estado === 1 ? 'bg-primary' : (estado === 2 ? 'bg-success' : (estado === 3 ? 'bg-warning text-dark' : (estado === 4 ? 'bg-danger' : 'bg-secondary')));
            return `
                <div class="border rounded p-2 mb-2">
                    <div class="d-flex justify-content-between">
                        <div class="small fw-bold">#${d.IdFormularioDerivacion}</div>
                        <span class="badge ${badge}">${estadoText(estado)}</span>
                    </div>
                    <div class="small text-muted mt-1">${d.InstitucionOrigenNombre || '-'} → ${d.InstitucionDestinoNombre || '-'}</div>
                    <div class="small mt-1">${d.mensaje_origen || d.mensaje_destino || d.motivo_rechazo || ''}</div>
                </div>
            `;
        }).join('');
    } catch (e) {
        listEl.innerHTML = `<div class="p-3 text-danger">${window.txt?.misformularios?.historial_derivacion_error || 'Error al cargar historial.'}</div>`;
    }
};

window.cancelDerivation = async (idDerivacion) => {
    const confirm = await Swal.fire({
        title: window.txt?.misformularios?.retirar_derivacion_titulo || 'Retirar derivación',
        text: window.txt?.misformularios?.retirar_derivacion_confirm || '¿Desea retirar esta derivación y devolver el formulario a origen?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: window.txt?.misformularios?.retirar_derivacion_btn || 'Retirar'
    });
    if (!confirm.isConfirmed) return;

    try {
        Swal.fire({ title: window.txt?.misformularios?.retirar_derivacion_procesando || 'Procesando...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
        const instActiva = localStorage.getItem('instId') || sessionStorage.getItem('instId') || '';
        const res = await API.request('/forms/derivation/cancel', 'POST', { idDerivacion, instId: Number(instActiva || 0) });
        if (res.status === 'success') {
            Swal.fire('OK', window.txt?.misformularios?.retirar_derivacion_ok || 'Derivación retirada.', 'success');
            await reloadMyForms();
        } else {
            Swal.fire('Error', res.message || 'No se pudo retirar.', 'error');
        }
    } catch (e) {
        Swal.fire('Error', e?.message || 'No se pudo retirar.', 'error');
    }
};

function estadoText(v) {
    if (v === 1) return window.txt?.misformularios?.estado_derivacion_pendiente || 'Pendiente';
    if (v === 2) return window.txt?.misformularios?.estado_derivacion_aceptada || 'Aceptada';
    if (v === 3) return window.txt?.misformularios?.estado_derivacion_devuelta || 'Devuelta';
    if (v === 4) return window.txt?.misformularios?.estado_derivacion_rechazada || 'Rechazada';
    if (v === 5) return window.txt?.misformularios?.estado_derivacion_cancelada || 'Cancelada';
    return '-';
}

async function reloadMyForms() {
    const userId = localStorage.getItem('userId');
    const instId = localStorage.getItem('instId');
    const res = await API.request(`/user/my-forms?user=${userId}&inst=${instId}`);
    if (res.status === 'success') {
        allForms = res.data.list || [];
        setupInstitutionFilter();
        setupOriginInstitutionFilter();
        renderTable();
    }
}

function openExcelModal() { new bootstrap.Modal(document.getElementById('modal-excel')).show(); }

/* --- PROTOCOLOS UTILIZADOS EN MIS FORMULARIOS --- */
window.openProtocolsUsedModal = async () => {
    const listEl = document.getElementById('protocols-used-list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2 text-muted small">Cargando...</p></div>';
    const modal = new bootstrap.Modal(document.getElementById('modal-protocols-used'));
    modal.show();

    try {
        const res = await API.request('/user/protocols-used-in-forms');
        if (res.status !== 'success' || !res.data || !res.data.length) {
            listEl.innerHTML = '<div class="p-4 text-center text-muted">No hay protocolos en tus formularios. Solo se cuentan animales de solicitudes <strong>Entregadas</strong>.</div>';
            return;
        }
        protocolsUsedCache = res.data;
        const rows = res.data.map(p => {
            const vence = p.FechaFinProtA ? new Date(p.FechaFinProtA).toLocaleDateString() : '—';
            const cupo = parseInt(p.cupo_restante, 10) || 0;
            const usados = parseInt(p.animales_usados, 10) || 0;
            return `
                <tr class="clickable-row align-middle" data-idprot="${p.idprotA}" style="cursor: pointer;">
                    <td class="ps-3 fw-bold text-success">${p.nprotA}</td>
                    <td class="text-truncate" style="max-width: 220px;" title="${(p.tituloA || '').replace(/"/g, '&quot;')}">${p.tituloA || '—'}</td>
                    <td class="text-center fw-bold">${usados}</td>
                    <td class="text-center fw-bold text-success">${cupo}</td>
                    <td class="small">${vence}</td>
                    <td class="text-end pe-3">
                        <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); window.showProtocolDetail(${p.idprotA})" title="Ver detalle y cupo">
                            <i class="bi bi-eye"></i>
                        </button>
                    </td>
                </tr>`;
        }).join('');
        listEl.innerHTML = `
            <table class="table table-hover align-middle mb-0" style="font-size: 12px;">
                <thead class="table-light text-uppercase">
                    <tr>
                        <th class="ps-3">N° Prot.</th>
                        <th>Título</th>
                        <th class="text-center">Animales que usé</th>
                        <th class="text-center">Cupo restante</th>
                        <th>Vence</th>
                        <th class="text-end pe-3">Ver</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>`;
        listEl.querySelectorAll('tr.clickable-row').forEach(tr => {
            tr.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                const id = tr.getAttribute('data-idprot');
                if (id) window.showProtocolDetail(parseInt(id, 10));
            });
        });
    } catch (e) {
        listEl.innerHTML = '<div class="p-4 text-center text-danger">Error al cargar los protocolos.</div>';
    }
};

window.showProtocolDetail = async (idprotA) => {
    const body = document.getElementById('modal-protocol-detail-body');
    if (!body) return;
    const p = protocolsUsedCache.find(x => parseInt(x.idprotA, 10) === parseInt(idprotA, 10));
    if (!p) {
        body.innerHTML = '<div class="alert alert-warning">No se encontró el protocolo en la lista.</div>';
        new bootstrap.Modal(document.getElementById('modal-protocol-detail')).show();
        return;
    }
    const usados = parseInt(p.animales_usados, 10) || 0;
    const cupo = parseInt(p.cupo_restante, 10) || 0;
    const vence = p.FechaFinProtA ? new Date(p.FechaFinProtA).toLocaleDateString() : '—';
    body.innerHTML = `
        <div class="mb-3">
            <h6 class="fw-bold text-dark">${p.nprotA || ''} — ${(p.tituloA || 'Sin título').substring(0, 80)}${(p.tituloA || '').length > 80 ? '…' : ''}</h6>
        </div>
        <div class="row g-3 mb-3">
            <div class="col-6">
                <div class="bg-primary-subtle rounded p-3 text-center border border-primary">
                    <span class="d-block small text-primary text-uppercase fw-bold">Animales que usé</span>
                    <span class="fs-4 fw-bold text-primary">${usados}</span>
                    <div class="small text-muted mt-1">solo en formularios Entregados</div>
                </div>
            </div>
            <div class="col-6">
                <div class="bg-success-subtle rounded p-3 text-center border border-success">
                    <span class="d-block small text-success text-uppercase fw-bold">Cupo restante</span>
                    <span class="fs-4 fw-bold text-success">${cupo}</span>
                    <div class="small text-muted mt-1">del protocolo</div>
                </div>
            </div>
        </div>
        <p class="small text-muted mb-0"><strong>Vencimiento:</strong> ${vence}</p>
        <p class="small text-muted mt-2 mb-0">Los animales que usé corresponden a la suma de <code>totalA</code> (sexoe) de tus solicitudes con estado <strong>Entregado</strong> vinculadas a este protocolo.</p>
    `;
    new bootstrap.Modal(document.getElementById('modal-protocol-detail')).show();
};

/* --- INSUMOS PEDIDOS (cantidades y de qué) --- */
window.openInsumosPedidosModal = async () => {
    const listEl = document.getElementById('insumos-pedidos-list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-success"></div><p class="mt-2 text-muted small">Cargando...</p></div>';
    const modal = new bootstrap.Modal(document.getElementById('modal-insumos-pedidos'));
    modal.show();
    try {
        const res = await API.request('/user/insumos-pedidos');
        if (res.status !== 'success' || !res.data || !res.data.length) {
            listEl.innerHTML = '<div class="p-4 text-center text-muted">No tienes pedidos de insumos.</div>';
            return;
        }
        const parts = res.data.map(f => {
            const estadoBadge = getStatusBadge(f.estado);
            const inst = f.NombreInstitucion || '—';
            const items = (f.items || []).map(i => {
                const pres = `${i.PresentacionCant || ''} ${i.PresentacionTipo || ''}`.trim();
                return `<tr><td class="ps-2">${i.NombreInsumo || '—'}</td><td class="small text-muted">${pres || '—'}</td><td class="text-center fw-bold">${i.cantidad}</td><td class="small">${inst}</td></tr>`;
            }).join('');
            return `
                <div class="border rounded mb-3 overflow-hidden">
                    <div class="bg-light px-3 py-2 d-flex justify-content-between align-items-center">
                        <span class="fw-bold text-success">#${f.idformA}</span>
                        <span class="small">${f.Inicio || '—'}</span>
                        ${estadoBadge}
                    </div>
                    <table class="table table-sm table-hover mb-0" style="font-size: 12px;">
                        <thead class="table-light"><tr><th class="ps-2">Insumo</th><th>Tipo / Cant.</th><th class="text-center" style="width:80px">Cant. pedida</th><th>Institución</th></tr></thead>
                        <tbody>${items}</tbody>
                    </table>
                </div>`;
        }).join('');
        listEl.innerHTML = parts || '<div class="p-4 text-center text-muted">No hay ítems.</div>';
    } catch (e) {
        listEl.innerHTML = '<div class="p-4 text-center text-danger">Error al cargar insumos pedidos.</div>';
    }
};

/* --- INSUMOS EXPERIMENTALES PEDIDOS --- */
window.openInsumosExpPedidosModal = async () => {
    const listEl = document.getElementById('insumos-exp-pedidos-list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-info"></div><p class="mt-2 text-muted small">Cargando...</p></div>';
    const modal = new bootstrap.Modal(document.getElementById('modal-insumos-exp-pedidos'));
    modal.show();
    try {
        const res = await API.request('/user/insumos-exp-pedidos');
        if (res.status !== 'success' || !res.data || !res.data.length) {
            listEl.innerHTML = '<div class="p-4 text-center text-muted">No tienes pedidos de insumos experimentales (reactivos).</div>';
            return;
        }
        const rows = res.data.map(r => {
            const pres = `${r.PresentacionCant || ''} ${r.PresentacionTipo || ''}`.trim();
            return `
                <tr>
                    <td class="ps-2">${r.NombreInsumo || '—'}</td>
                    <td class="small text-muted">${pres || '—'}</td>
                    <td class="text-center fw-bold">${r.Cantidad ?? '—'}</td>
                    <td class="small">${r.NombreInstitucion || '—'}</td>
                    <td class="small">${r.Inicio || '—'}</td>
                    <td>${getStatusBadge(r.estado)}</td>
                </tr>`;
        }).join('');
        listEl.innerHTML = `
            <table class="table table-sm table-hover mb-0" style="font-size: 12px;">
                <thead class="table-light text-uppercase">
                    <tr><th class="ps-2">Insumo experimental</th><th>Tipo / Cant.</th><th class="text-center">Cant. pedida</th><th>Institución</th><th>Fecha</th><th>Estado</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>`;
    } catch (e) {
        listEl.innerHTML = '<div class="p-4 text-center text-danger">Error al cargar insumos experimentales.</div>';
    }
};

window.processExcelExport = () => {
    const start = document.getElementById('excel-start').value;
    const end = document.getElementById('excel-end').value;
    const user = (localStorage.getItem('userFull') || 'Usuario').toUpperCase();
    if (!start || !end) return Swal.fire('Atención', 'Seleccione fechas.', 'warning');
    const data = allForms.filter(r => { const f = r.Inicio || '0000-00-00'; return f >= start && f <= end; });
    if (data.length === 0) return Swal.fire('Sin datos', 'No hay registros.', 'info');
    const headers = ["ID", "Institución", "Categoría", "Tipo", "Inicio", "Retiro", "Protocolo", "Departamento", "Organización", "Estado"];
    const rows = [headers.join(";")];
    data.forEach(r => {
        const instStr = Array.isArray(r.institucionesParticipantes) && r.institucionesParticipantes.length
            ? r.institucionesParticipantes.map(i => i.NombreInst).join(' → ')
            : (r.NombreInstitucion || '');
        const row = [r.idformA, instStr, r.Categoria, r.TipoPedido, `="${r.Inicio||''}"`, `="${r.Retiro||''}"`, r.Protocolo, r.Departamento, r.Organizacion || '', r.estado];
        rows.push(row.map(v => String(v).replace(/;/g, ',')).join(";"));
    });
    const blob = new Blob(["\uFEFF" + rows.join("\r\n")], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `MIS_PEDIDOS_${user}_${start}_${end}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};