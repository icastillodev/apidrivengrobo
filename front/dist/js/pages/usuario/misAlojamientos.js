import { API } from '../../api.js';
// Importamos el motor de trazabilidad que ya construiste (¡Reutilización de código!)
import { TrazabilidadUI } from '../admin/alojamientos/trazabilidad.js';

let allHousings = [];
let currentPage = 1;
const rowsPerPage = 10;

export async function initMisAlojamientos() {
    const userId = localStorage.getItem('userId');
    const instId = localStorage.getItem('instId');

    document.getElementById('btn-export-excel').onclick = openExcelModal;

    // ENGANCHE GLOBAL PARA LA TRAZABILIDAD (A prueba de fallos)
    window.toggleTrazabilidadReadOnly = async (idAlojamiento, idEspecie) => {
        // Si por algún motivo llega undefined, forzamos un 0 para que no rompa la API
        const idEspSeguro = idEspecie || 0; 
        
        // Activamos el modo lectura del motor
        TrazabilidadUI.isReadOnly = true; 
        
        // Llamamos al motor original
        await TrazabilidadUI.toggleRow(idAlojamiento, idEspSeguro);
    };

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


/* --- MODAL FICHA DE ALOJAMIENTO (CON TRAZABILIDAD) --- */
window.openDetailModal = async (id) => {
    const modal = new bootstrap.Modal(document.getElementById('modal-visor'));
    const body = document.getElementById('modal-visor-body');
    const actions = document.getElementById('modal-actions');
    
    body.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success"></div><p class="text-muted small mt-2">Buscando historia...</p></div>`;
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
                        <i class="bi bi-envelope-at me-2"></i> CONTACTAR SEDE
                    </button>
                </div>
            `;

            let html = `
                <div class="text-center mb-3">
                    <h5 class="fw-bold text-success m-0 text-uppercase" style="letter-spacing: 1px;">${h.Institucion}</h5>
                </div>

                <div class="header-card bg-white shadow-sm border border-success border-2 border-top-0 border-end-0 border-start-0 p-3 mb-4">
                    <div class="row text-center g-3">
                        <div class="col-md-2 border-end">
                            <span class="header-label">HISTORIA</span>
                            <span class="badge bg-dark fs-6">#${h.IdHistoria}</span>
                        </div>
                        <div class="col-md-3 border-end text-start px-3">
                            <span class="header-label">PROTOCOLO</span>
                            <span class="header-value text-primary d-block text-truncate">${h.Protocolo}</span>
                        </div>
                        <div class="col-md-3 border-end text-start px-3">
                            <span class="header-label">ESPECIE / TIPO</span>
                            <span class="header-value text-success d-block">${h.Especie}</span>
                        </div>
                        <div class="col-md-2 border-end">
                            <span class="header-label">DÍAS ESTADÍA</span>
                            <span class="header-value">${h.TotalDias}</span>
                        </div>
                        <div class="col-md-2">
                            <span class="header-label text-success">COSTO ACUM.</span>
                            <span class="header-value text-success">$ ${h.TotalCosto}</span>
                        </div>
                    </div>
                </div>

                <div class="alert alert-info py-2 small text-center mb-3 fw-bold shadow-sm" style="border-left: 4px solid #0dcaf0;">
                    <i class="bi bi-info-circle-fill me-1"></i> Haga clic en una fila para desplegar la trazabilidad clínica y física.
                </div>
            `;

            // TABLA MODAL CON TRAZABILIDAD EXPANSIBLE
            const tableRows = rows.map(r => {
                // FALLBACK SEGURO: Si no viene la especie, le pasamos 0 para no romper el HTML
                const espId = r.TipoAnimal || r.idespA || h.EspecieID || 0;

                return `
                <tr class="clickable-row bg-white" onclick="window.toggleTrazabilidadReadOnly(${r.IdAlojamiento}, ${espId})">
                    <td class="text-muted small fw-bold">#${r.IdAlojamiento}</td>
                    <td class="small fw-bold text-secondary">${r.fechavisado}</td>
                    <td class="small fw-bold ${!r.hastafecha ? 'text-primary' : 'text-secondary'}">${r.hastafecha || 'Vigente'}</td>
                    <td class="text-center fw-bold text-primary">${r.totalcajagrande > 0 ? r.totalcajagrande + ' Gr' : r.totalcajachica + ' Ch'}</td>
                    <td class="text-center fw-bold text-dark">${r.totaldiasdefinidos}</td>
                    <td class="text-center"><i class="bi bi-chevron-down text-muted"></i></td>
                </tr>
                <tr id="trazabilidad-row-${r.IdAlojamiento}" class="d-none bg-light">
                    <td colspan="6" class="p-0 border-0">
                        <div id="trazabilidad-content-${r.IdAlojamiento}" class="p-3 border-start border-4 border-primary shadow-inner">
                            </div>
                    </td>
                </tr>
                `;
            }).join('');

            html += `
                <div class="table-responsive shadow-sm rounded border">
                    <table class="table table-hover table-sm align-middle mb-0">
                        <thead class="table-secondary text-uppercase small text-muted text-center">
                            <tr>
                                <th>Tramo</th>
                                <th>Desde</th>
                                <th>Hasta</th>
                                <th>Cajas</th>
                                <th>Días</th>
                                <th>Clínica</th>
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
            `;

            body.innerHTML = html;
        }
    } catch (e) { body.innerHTML = `<div class="alert alert-danger">Error cargando detalles: ${e.message}</div>`; }
};

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
        tr.className = 'clickable-row align-middle bg-white border-bottom shadow-sm mb-1';
        tr.onclick = (e) => { if (!e.target.closest('button')) openDetailModal(h.IdHistoria); };

        const isVigente = h.Estado === 'Vigente';
        const badge = isVigente 
            ? '<span class="badge bg-success shadow-sm badge-status px-3">VIGENTE</span>' 
            : '<span class="badge bg-secondary shadow-sm badge-status px-3">FINALIZADO</span>';

        tr.innerHTML = `
            <td class="ps-3 fw-bold text-muted small">#${h.IdHistoria}</td>
            <td><span class="inst-badge">${h.Institucion}</span></td>
            <td class="fw-bold text-primary">${h.Protocolo}</td>
            <td class="text-success fw-bold small">${h.Especie}</td>
            <td class="small fw-bold text-secondary">${h.FechaInicio}</td>
            <td class="small fw-bold ${!isVigente ? 'text-secondary' : 'text-primary'}">${h.FechaFin}</td>
            <td class="text-center fw-bold text-dark">$ ${h.CostoTotal}</td>
            <td class="text-center">${badge}</td>
            <td class="text-end pe-3">
                <button class="btn btn-sm btn-outline-danger fw-bold px-2 py-1 shadow-sm" onclick="window.downloadPDF(${h.IdHistoria})" title="Descargar Ficha">
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
    if (uniqueInst > 1) text += ` en ${uniqueInst} Instituciones`;
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

/* --- MODAL FICHA DE ALOJAMIENTO (CON TRAZABILIDAD) --- */
window.openDetailModal = async (id) => {
    const modal = new bootstrap.Modal(document.getElementById('modal-visor'));
    const body = document.getElementById('modal-visor-body');
    const actions = document.getElementById('modal-actions');
    
    body.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success"></div><p class="text-muted small mt-2">Buscando historia...</p></div>`;
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
                        <i class="bi bi-envelope-at me-2"></i> CONTACTAR SEDE
                    </button>
                </div>
            `;

            // CABECERA MODAL
            let html = `
                <div class="text-center mb-3">
                    <h5 class="fw-bold text-success m-0 text-uppercase" style="letter-spacing: 1px;">${h.Institucion}</h5>
                </div>

                <div class="header-card bg-white shadow-sm border border-success border-2 border-top-0 border-end-0 border-start-0">
                    <div class="row text-center g-3">
                        <div class="col-md-2 border-end">
                            <span class="header-label">HISTORIA</span>
                            <span class="badge bg-dark fs-6">#${h.IdHistoria}</span>
                        </div>
                        <div class="col-md-3 border-end text-start px-3">
                            <span class="header-label">PROTOCOLO</span>
                            <span class="header-value text-primary d-block text-truncate">${h.Protocolo}</span>
                        </div>
                        <div class="col-md-3 border-end text-start px-3">
                            <span class="header-label">ESPECIE / TIPO</span>
                            <span class="header-value text-success d-block">${h.Especie}</span>
                        </div>
                        <div class="col-md-2 border-end">
                            <span class="header-label">DÍAS ESTADÍA</span>
                            <span class="header-value">${h.TotalDias}</span>
                        </div>
                        <div class="col-md-2">
                            <span class="header-label text-success">COSTO ACUM.</span>
                            <span class="header-value text-success">$ ${h.TotalCosto}</span>
                        </div>
                    </div>
                </div>

                <div class="alert alert-info py-2 small text-center mb-3 fw-bold shadow-sm" style="border-left: 4px solid #0dcaf0;">
                    <i class="bi bi-info-circle-fill me-1"></i> Haga clic en una fila para desplegar la trazabilidad clínica y física.
                </div>
            `;

            // TABLA MODAL CON TRAZABILIDAD EXPANSIBLE
            const tableRows = rows.map(r => `
                <tr class="clickable-row bg-white" onclick="window.toggleTrazabilidadReadOnly(${r.IdAlojamiento}, ${r.TipoAnimal || h.EspecieID})">
                    <td class="text-muted small fw-bold">#${r.IdAlojamiento}</td>
                    <td class="small fw-bold text-secondary">${r.fechavisado}</td>
                    <td class="small fw-bold ${!r.hastafecha ? 'text-primary' : 'text-secondary'}">${r.hastafecha || 'Vigente'}</td>
                    <td class="text-center fw-bold text-primary">${r.totalcajagrande > 0 ? r.totalcajagrande + ' Gr' : r.totalcajachica + ' Ch'}</td>
                    <td class="text-center fw-bold text-dark">${r.totaldiasdefinidos}</td>
                    <td class="text-center"><i class="bi bi-chevron-down text-muted"></i></td>
                </tr>
                <tr id="trazabilidad-row-${r.IdAlojamiento}" class="d-none bg-light">
                    <td colspan="6" class="p-0 border-0">
                        <div id="trazabilidad-content-${r.IdAlojamiento}" class="p-3 border-start border-4 border-primary shadow-inner">
                            <div class="text-center text-muted small"><div class="spinner-border spinner-border-sm"></div> Cargando cajas...</div>
                        </div>
                    </td>
                </tr>
            `).join('');

            html += `
                <div class="table-responsive shadow-sm rounded border">
                    <table class="table table-hover table-sm align-middle mb-0">
                        <thead class="table-secondary text-uppercase small text-muted text-center">
                            <tr>
                                <th>Tramo</th>
                                <th>Desde</th>
                                <th>Hasta</th>
                                <th>Cajas</th>
                                <th>Días</th>
                                <th>Clínica</th>
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
            `;

            body.innerHTML = html;
        }
    } catch (e) { body.innerHTML = `<div class="alert alert-danger">Error cargando detalles: ${e.message}</div>`; }
};

/* --- PDF GENERATOR AVANZADO --- */
window.downloadPDF = async (id) => {
    // 1. PREGUNTAR QUÉ INCLUIR EN EL PDF
    const { value: options } = await Swal.fire({
        title: 'Exportar Ficha PDF',
        html: `
            <div class="text-start p-3 bg-light border rounded">
                <p class="small text-muted mb-3">Seleccione qué información incluir:</p>
                <div class="form-check form-switch mb-2">
                    <input class="form-check-input" type="checkbox" id="chk-aloj" checked>
                    <label class="form-check-label fw-bold small">Tramos de Alojamiento (Contabilidad)</label>
                </div>
                <div class="form-check form-switch">
                    <input class="form-check-input border-primary" type="checkbox" id="chk-traz" checked>
                    <label class="form-check-label fw-bold small text-primary">Trazabilidad y Clínica de los Animales</label>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-file-pdf"></i> Generar Documento',
        confirmButtonColor: '#dc3545',
        preConfirm: () => ({
            aloj: document.getElementById('chk-aloj').checked,
            traz: document.getElementById('chk-traz').checked
        })
    });

    if (!options) return;
    if (!options.aloj && !options.traz) {
        return Swal.fire('Atención', 'Debe seleccionar al menos una opción para exportar.', 'warning');
    }

    // 2. RECOPILAR DATOS Y ARMAR PLANTILLA
    try {
        Swal.fire({ title: 'Generando PDF...', text: 'Recopilando datos...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        
        const res = await API.request(`/user/housing-detail/${id}`);
        if (res.status !== 'success') throw new Error('Error al traer detalles de la base de datos.');

        const h = res.data.header;
        const rows = res.data.rows;
        const instId = localStorage.getItem('instId');

        // A. CONSTRUIR TABLA DE ALOJAMIENTOS
        let tableAlojHtml = '';
        if (options.aloj) {
            const trs = rows.map(r => `
                <tr>
                    <td style="border:1px solid #ddd;padding:5px;">#${r.IdAlojamiento}</td>
                    <td style="border:1px solid #ddd;padding:5px;">${r.fechavisado}</td>
                    <td style="border:1px solid #ddd;padding:5px;">${r.hastafecha || 'Vigente'}</td>
                    <td style="border:1px solid #ddd;padding:5px;text-align:center;">${r.totalcajagrande > 0 ? r.totalcajagrande + ' Gr' : r.totalcajachica + ' Ch'}</td>
                    <td style="border:1px solid #ddd;padding:5px;text-align:center;">${r.totaldiasdefinidos}</td>
                </tr>
            `).join('');
            tableAlojHtml = `
                <h4 style="border-bottom:1px solid #ccc;margin-bottom:10px;font-size:12px;">DETALLE DE MOVIMIENTOS</h4>
                <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:20px;">
                    <thead style="background:#f0f0f0;">
                        <tr>
                            <th style="border:1px solid #ddd;padding:5px;">ID</th>
                            <th style="border:1px solid #ddd;padding:5px;">Desde</th>
                            <th style="border:1px solid #ddd;padding:5px;">Hasta</th>
                            <th style="border:1px solid #ddd;padding:5px;">Cajas</th>
                            <th style="border:1px solid #ddd;padding:5px;">Días</th>
                        </tr>
                    </thead>
                    <tbody>${trs}</tbody>
                </table>
            `;
        }

        // B. CONSTRUIR TRAZABILIDAD CLÍNICA
        let trazabilidadHtml = '';
        if (options.traz) {
            // Buscamos el ID de la especie de forma segura
            const espId = h.EspecieID || (rows.length > 0 ? (rows[0].TipoAnimal || rows[0].idespA) : 0) || 0;
            
            for (let tramo of rows) {
                try {
                    const resTraz = await API.request(`/trazabilidad/get-arbol?idAlojamiento=${tramo.IdAlojamiento}&idEspecie=${espId}&instId=${instId}`);
                    if (resTraz.status === 'success' && resTraz.data && resTraz.data.cajas && resTraz.data.cajas.length > 0) {
                        let hasObsInTramo = false;
                        let tramoHtml = `<div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                            <h5 style="font-size: 11px; background-color: #f0f8ff; padding: 5px; color: #0d6efd; margin-bottom: 8px;">TRAMO #${tramo.IdAlojamiento} (Desde: ${new Date(tramo.fechavisado).toLocaleDateString()})</h5>`;
                        
                        resTraz.data.cajas.forEach(caja => {
                            let cajaHtml = `<div style="margin-left: 5px; margin-bottom: 10px;">
                                <strong style="font-size: 10px; color: #444; background: #e9ecef; padding: 2px 5px; border-radius: 3px;">📦 ${caja.NombreCaja}</strong>`;
                            
                            let hasObsInCaja = false;
                            if (caja.unidades && caja.unidades.length > 0) {
                                caja.unidades.forEach(u => {
                                    if (u.observaciones_pivot && u.observaciones_pivot.length > 0) {
                                        hasObsInTramo = true;
                                        hasObsInCaja = true;
                                        cajaHtml += `<div style="margin-left: 15px; margin-top: 8px;">
                                            <span style="font-size: 10px; color: #198754; font-weight: bold;">🐾 ${u.NombreEspecieAloj}</span>
                                            <table style="width: 100%; border-collapse: collapse; margin-top: 3px; font-size: 9px; text-align: center;">
                                                <tr style="background-color: #f9f9f9;">
                                                    <th style="border: 1px solid #ccc; padding: 4px;">Fecha</th>`;
                                        
                                        resTraz.data.categorias.forEach(cat => {
                                            cajaHtml += `<th style="border: 1px solid #ccc; padding: 4px;">${cat.NombreCatAlojUnidad}</th>`;
                                        });
                                        cajaHtml += `</tr>`;

                                        u.observaciones_pivot.forEach(obs => {
                                            cajaHtml += `<tr><td style="border: 1px solid #ccc; padding: 4px;">${new Date(obs.fechaObs).toLocaleDateString()}</td>`;
                                            resTraz.data.categorias.forEach(cat => {
                                                const val = obs[`cat_${cat.IdDatosUnidadAloj}`] || '-';
                                                cajaHtml += `<td style="border: 1px solid #ccc; padding: 4px;">${val}</td>`;
                                            });
                                            cajaHtml += `</tr>`;
                                        });
                                        cajaHtml += `</table></div>`;
                                    }
                                });
                            }
                            cajaHtml += `</div>`;
                            if(hasObsInCaja) tramoHtml += cajaHtml;
                        });
                        tramoHtml += `</div>`;
                        if (hasObsInTramo) trazabilidadHtml += tramoHtml;
                    }
                } catch(err) { console.warn("Sin clínica en tramo:", tramo.IdAlojamiento); }
            }

            if (trazabilidadHtml === '') {
                trazabilidadHtml = '<p style="font-size: 11px; font-style: italic; color: #888;">Los animales de esta historia no tienen variables clínicas registradas.</p>';
            } else {
                trazabilidadHtml = `
                <div style="border-top: 2px solid #eee; padding-top: 15px;">
                    <p style="font-size: 13px; font-weight: bold; color: #0d6efd; border-bottom: 1px solid #0d6efd; padding-bottom: 5px; margin-bottom: 15px;">
                        TRAZABILIDAD Y CONSTANTES CLÍNICAS:
                    </p>
                    ${trazabilidadHtml}
                </div>`;
            }
        }

        // C. ENSAMBLAR PDF COMPLETO
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

                ${tableAlojHtml}
                ${trazabilidadHtml}
                
                <div style="margin-top:20px;font-size:10px;color:#777;text-align:center;">Generado por GROBO el ${new Date().toLocaleString()}</div>
            </div>`;

        Swal.close();
        html2pdf().set({ margin: 10, filename: `Alojamiento_${h.IdHistoria}.pdf`, html2canvas: { scale: 2 } }).from(template).save();
        
    } catch (e) {
        Swal.fire('Error', e.message || 'No se pudo generar PDF', 'error');
    }
};

/* --- CONTACTAR SEDE --- */
window.openContactModal = (infoStr) => {
    const info = JSON.parse(decodeURIComponent(infoStr));
    const correo = info.InstCorreo || '';
    const telefono = info.InstContacto || 'No registrado';

    Swal.fire({
        title: `<h5 class="fw-bold m-0 text-dark">CONTACTAR AL BIOTERIO</h5><span class="text-success small">${info.NombreInst.toUpperCase()}</span>`,
        html: `
            <div class="d-flex flex-column gap-3 mt-3 px-2">
                <div class="p-3 bg-light border border-success rounded text-center shadow-sm">
                    <i class="bi bi-telephone-fill text-success fs-2 d-block mb-1"></i>
                    <span class="small text-muted text-uppercase fw-bold d-block">Línea Directa</span>
                    <strong class="fs-4 text-dark">${telefono}</strong>
                </div>
                ${correo ? `
                    <a href="mailto:${correo}" class="btn btn-primary fw-bold shadow-sm py-2 text-uppercase" style="letter-spacing: 1px;">
                        <i class="bi bi-envelope-at-fill me-2"></i> Enviar Correo
                    </a>
                ` : `<div class="alert alert-warning small py-2">La sede no registró un correo electrónico.</div>`}
            </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        width: '400px'
    });
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