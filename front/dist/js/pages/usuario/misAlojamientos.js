import { API } from '../../api.js';
// Importamos el motor de trazabilidad que ya construiste (¡Reutilización de código!)
import { TrazabilidadUI } from '../admin/alojamientos/trazabilidad.js';
import { hasTrazabilidadAlojamientosForUser } from '../../modulesAccess.js';
import {
    isInvestigatorRole,
    buildMensajesNuevoFromContext,
} from '../../utils/investigatorMensajesLink.js';

let allHousings = [];
let currentPage = 1;
const rowsPerPage = 10;

function sessionInstId() {
    return (localStorage.getItem('instId') || sessionStorage.getItem('instId') || '').trim();
}

function escapePdfHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function valoresInicioOrdered(valoresInicioObj, categoriasInicio) {
    const rows = Object.values(valoresInicioObj || {});
    if (!rows.length) return [];
    const idOrder = (categoriasInicio || []).map((c) => Number(c.IdDatosUnidadAloj));
    const orderMap = new Map(idOrder.map((id, i) => [id, i]));
    return rows.sort((a, b) => {
        const ia = orderMap.has(Number(a.IdDatosUnidadAloj)) ? orderMap.get(Number(a.IdDatosUnidadAloj)) : 9999;
        const ib = orderMap.has(Number(b.IdDatosUnidadAloj)) ? orderMap.get(Number(b.IdDatosUnidadAloj)) : 9999;
        if (ia !== ib) return ia - ib;
        return String(a.NombreCatAlojUnidad || '').localeCompare(String(b.NombreCatAlojUnidad || ''), undefined, { sensitivity: 'base' });
    });
}

function escapeMaHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export async function initMisAlojamientos() {
    const userId = localStorage.getItem('userId');
    const instId = sessionInstId();

    document.getElementById('btn-export-excel').onclick = openExcelModal;

    const tbodyBoot = document.getElementById('table-body');
    const maBoot = window.txt?.misalojamientos || {};
    const bootMsg = escapeMaHtml(maBoot.cargando || window.txt?.generales?.msg_cargando || '…');
    if (tbodyBoot) {
        tbodyBoot.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success mb-2" role="status"></div><div class="small">${bootMsg}</div></td></tr>`;
    }
    const ctrBoot = document.getElementById('dynamic-counter');
    if (ctrBoot) ctrBoot.innerText = bootMsg;

    // ENGANCHE GLOBAL PARA LA TRAZABILIDAD (A prueba de fallos)
    window.toggleTrazabilidadReadOnly = async (idAlojamiento, idEspecie) => {
        const roleOpen = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel') || '3', 10);
        if (!hasTrazabilidadAlojamientosForUser(roleOpen)) return;

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
            allHousings = Array.isArray(res.data?.list) ? res.data.list : [];
            setupInstitutionFilter();
            renderTable();
        } else {
            allHousings = [];
            const errMsg = escapeMaHtml(maBoot.error_cargar_lista || window.txt?.generales?.error || 'Error');
            const tb = document.getElementById('table-body');
            if (tb) tb.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-danger small">${errMsg}</td></tr>`;
            updateCounter([]);
        }
    } catch (e) {
        console.error('Error:', e);
        allHousings = [];
        const errMsg = escapeMaHtml(maBoot.error_cargar_lista || window.txt?.generales?.error || 'Error');
        const tb = document.getElementById('table-body');
        if (tb) tb.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-danger small">${errMsg}</td></tr>`;
        updateCounter([]);
    }

    document.getElementById('search-input').addEventListener('keyup', () => { currentPage = 1; renderTable(); });
    document.getElementById('filter-status').addEventListener('change', () => { currentPage = 1; renderTable(); });
    document.getElementById('filter-inst').addEventListener('change', () => { currentPage = 1; renderTable(); });
}


/* --- MODAL FICHA DE ALOJAMIENTO (CON TRAZABILIDAD) --- */
window.openDetailModal = async (id) => {
    const ma = window.txt?.misalojamientos || {};
    const modal = new bootstrap.Modal(document.getElementById('modal-visor'));
    const body = document.getElementById('modal-visor-body');
    const actions = document.getElementById('modal-actions');
    
    const modalLoad = escapeMaHtml(ma.buscando_historia || window.txt?.generales?.msg_cargando || '…');
    body.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success"></div><p class="text-muted small mt-2">${modalLoad}</p></div>`;
    modal.show();

    try {
        const res = await API.request(`/user/housing-detail/${id}`);
        if (res.status === 'success') {
            const h = res.data.header;
            const rows = res.data.rows;
            const roleOpen = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel') || '3', 10);
            const showTraz = hasTrazabilidadAlojamientosForUser(roleOpen);

            const contactInfo = {
                IdInstitucion: h.IdInstitucion,
                NombreInst: h.Institucion,
                InstCorreo: h.InstCorreo,
                InstContacto: h.InstContacto,
            };
            const contactString = encodeURIComponent(JSON.stringify(contactInfo));

            actions.innerHTML = `
                <div class="d-flex gap-2">
                    <button class="btn btn-danger btn-sm fw-bold shadow-sm" onclick="window.downloadPDF(${h.IdHistoria})">
                        <i class="bi bi-file-earmark-pdf me-2"></i> ${window.txt?.misalojamientos?.pdf_ficha || 'PDF FICHA'}
                    </button>
                    <button class="btn btn-outline-dark btn-sm fw-bold shadow-sm" onclick="window.openContactModal('${contactString}')">
                        <i class="bi bi-envelope-at me-2"></i> ${window.txt?.misalojamientos?.contactar_sede || 'CONTACTAR SEDE'}
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
                            <span class="header-label">${window.txt?.misalojamientos?.label_historia || 'HISTORIA'}</span>
                            <span class="badge bg-dark fs-6">#${h.IdHistoria}</span>
                        </div>
                        <div class="col-md-3 border-end text-start px-3">
                            <span class="header-label">${window.txt?.misalojamientos?.label_protocolo || 'PROTOCOLO'}</span>
                            <span class="header-value text-primary d-block text-truncate">${h.Protocolo}</span>
                        </div>
                        <div class="col-md-3 border-end text-start px-3">
                            <span class="header-label">${window.txt?.misalojamientos?.label_especie_tipo || 'ESPECIE / TIPO'}</span>
                            <span class="header-value text-success d-block">${h.Especie}</span>
                        </div>
                        <div class="col-md-2 border-end">
                            <span class="header-label">${window.txt?.misalojamientos?.label_dias_estadia || 'DÍAS ESTADÍA'}</span>
                            <span class="header-value">${h.TotalDias}</span>
                        </div>
                        <div class="col-md-2">
                            <span class="header-label text-success">${window.txt?.misalojamientos?.label_costo_acum || 'COSTO ACUM.'}</span>
                            <span class="header-value text-success">$ ${h.TotalCosto}</span>
                        </div>
                    </div>
                </div>

                ${showTraz ? `<div class="alert alert-info py-2 small text-center mb-3 fw-bold shadow-sm" style="border-left: 4px solid #0dcaf0;">
                    <i class="bi bi-info-circle-fill me-1"></i> ${window.txt?.misalojamientos?.hint_clic_trazabilidad || 'Haga clic en una fila para desplegar la trazabilidad clínica y física.'}
                </div>` : ''}
            `;

            // TABLA MODAL CON TRAZABILIDAD EXPANSIBLE
            const tableRows = rows.map(r => {
                // FALLBACK SEGURO: Si no viene la especie, le pasamos 0 para no romper el HTML
                const espId = r.TipoAnimal || r.idespA || h.EspecieID || 0;

                return `
                <tr class="clickable-row bg-white"${showTraz ? ` onclick="window.toggleTrazabilidadReadOnly(${r.IdAlojamiento}, ${espId})"` : ''}>
                    <td class="text-muted small fw-bold">#${r.IdAlojamiento}</td>
                    <td class="small fw-bold text-secondary">${r.fechavisado}</td>
                    <td class="small fw-bold ${!r.hastafecha ? 'text-primary' : 'text-secondary'}">${r.hastafecha || (window.txt?.misalojamientos?.vigente || 'Vigente')}</td>
                    <td class="text-center fw-bold text-primary">${r.totalcajagrande > 0 ? r.totalcajagrande + ' Gr' : r.totalcajachica + ' Ch'}</td>
                    <td class="text-center fw-bold text-dark">${r.totaldiasdefinidos}</td>
                    <td class="text-center"><i class="bi bi-chevron-down text-muted"></i></td>
                </tr>
                ${showTraz ? `
                <tr id="trazabilidad-row-${r.IdAlojamiento}" class="d-none bg-light">
                    <td colspan="6" class="p-0 border-0">
                        <div id="trazabilidad-content-${r.IdAlojamiento}" class="p-3 border-start border-4 border-primary shadow-inner">
                            </div>
                    </td>
                </tr>` : ''}
                `;
            }).join('');

            html += `
                <div class="table-responsive shadow-sm rounded border">
                    <table class="table table-hover table-sm align-middle mb-0">
                        <thead class="table-secondary text-uppercase small text-muted text-center">
                            <tr>
                                <th>${window.txt?.misalojamientos?.tramo || 'Tramo'}</th>
                                <th>${window.txt?.misalojamientos?.desde || 'Desde'}</th>
                                <th>${window.txt?.misalojamientos?.hasta || 'Hasta'}</th>
                                <th>${window.txt?.misalojamientos?.cajas || 'Cajas'}</th>
                                <th>${window.txt?.misalojamientos?.dias || 'Días'}</th>
                                <th>${window.txt?.misalojamientos?.clinica || 'Clínica'}</th>
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
            `;

            body.innerHTML = html;
        }
    } catch (e) {
        body.innerHTML = `<div class="alert alert-danger">${ma.err_carga_detalle || 'Error al cargar los detalles:'} ${e.message}</div>`;
    }
};

/* --- FILTROS Y TABLA --- */
function setupInstitutionFilter() {
    const insts = [...new Set(allHousings.map(h => h.Institucion))];
    const container = document.getElementById('container-filter-inst');
    const select = document.getElementById('filter-inst');
    if (!container || !select) return;
    const allLabel = window.txt?.misalojamientos?.filter_inst_todos || window.txt?.generales?.todas || 'Todas';
    select.innerHTML = `<option value="all">${allLabel}</option>`;
    if (insts.length > 1) {
        container.classList.remove('d-none');
        insts.sort().forEach(inst => {
            const opt = document.createElement('option');
            opt.value = inst; opt.text = inst; select.appendChild(opt);
        });
    } else {
        container.classList.add('d-none');
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

    if (pageData.length === 0) {
        const ma = window.txt?.misalojamientos || {};
        const msg =
            allHousings.length === 0
                ? ma.lista_vacia || ''
                : ma.sin_resultados_filtro || '';
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted small">${escapeMaHtml(msg || '—')}</td></tr>`;
        renderPagination(filtered.length);
        updateCounter(filtered);
        return;
    }

    pageData.forEach(h => {
        const tr = document.createElement('tr');
        tr.className = 'clickable-row align-middle bg-white border-bottom shadow-sm mb-1';
        tr.onclick = (e) => { if (!e.target.closest('button')) openDetailModal(h.IdHistoria); };

        const isVigente = h.Estado === 'Vigente';
        const t = window.txt?.misalojamientos;
        const badge = isVigente 
            ? `<span class="badge bg-success shadow-sm badge-status px-3">${t?.badge_vigente || 'VIGENTE'}</span>` 
            : `<span class="badge bg-secondary shadow-sm badge-status px-3">${t?.badge_finalizado || 'FINALIZADO'}</span>`;

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
                <button class="btn btn-sm btn-outline-danger fw-bold px-2 py-1 shadow-sm" onclick="window.downloadPDF(${h.IdHistoria})" title="${(window.txt?.misalojamientos?.tooltip_descargar_ficha || 'Descargar ficha').replace(/"/g, '&quot;')}">
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
    const ma = window.txt?.misalojamientos || {};
    let text = (ma.counter_line || '{n} registros').replace('{n}', String(total));
    if (uniqueInst > 1) text += (ma.counter_inst || ' en {n} instituciones').replace('{n}', String(uniqueInst));
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

/* --- PDF GENERATOR AVANZADO --- */
window.downloadPDF = async (id) => {
    const t = window.txt?.misalojamientos || {};
    const rolePdf = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel') || '3', 10);
    const canPdfTraz = hasTrazabilidadAlojamientosForUser(rolePdf);

    // 1. PREGUNTAR QUÉ INCLUIR EN EL PDF
    const { value: options } = await Swal.fire({
        title: t.pdf_export_title || 'Exportar ficha PDF',
        html: `
            <div class="text-start p-3 bg-light border rounded">
                <p class="small text-muted mb-3">${t.pdf_export_intro || 'Seleccione qué información incluir:'}</p>
                <div class="form-check form-switch mb-2">
                    <input class="form-check-input" type="checkbox" id="chk-aloj" checked>
                    <label class="form-check-label fw-bold small">${t.pdf_opt_aloj || 'Tramos de alojamiento (contabilidad)'}</label>
                </div>
                ${canPdfTraz ? `
                <div class="form-check form-switch">
                    <input class="form-check-input border-primary" type="checkbox" id="chk-traz" checked>
                    <label class="form-check-label fw-bold small text-primary">${t.pdf_opt_traz || 'Trazabilidad y clínica de los animales'}</label>
                </div>` : ''}
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: `<i class="bi bi-file-pdf"></i> ${t.pdf_btn_generar || 'Generar documento'}`,
        confirmButtonColor: '#dc3545',
        preConfirm: () => ({
            aloj: document.getElementById('chk-aloj').checked,
            traz: canPdfTraz ? document.getElementById('chk-traz').checked : false
        })
    });

    if (!options) return;
    if (!options.aloj && !options.traz) {
        return Swal.fire(t.swal_atencion || 'Atención', t.pdf_export_need_option || 'Debe seleccionar al menos una opción para exportar.', 'warning');
    }

    // 2. RECOPILAR DATOS Y ARMAR PLANTILLA
    try {
        Swal.fire({
            title: t.pdf_generando_title || 'Generando PDF...',
            text: t.pdf_recopilando_text || 'Recopilando datos...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
        });

        const res = await API.request(`/user/housing-detail/${id}`);
        if (res.status !== 'success') throw new Error(t.err_housing_detail || 'Error al obtener los detalles.');

        const h = res.data.header;
        const rows = res.data.rows;
        const instId = sessionInstId();

        // A. CONSTRUIR TABLA DE ALOJAMIENTOS
        let tableAlojHtml = '';
        if (options.aloj) {
            const vig = t.vigente || 'Vigente';
            const gr = t.pdf_caja_gr || 'Gr';
            const ch = t.pdf_caja_ch || 'Ch';
            const trs = rows.map(r => `
                <tr>
                    <td style="border:1px solid #ddd;padding:5px;">#${r.IdAlojamiento}</td>
                    <td style="border:1px solid #ddd;padding:5px;">${r.fechavisado}</td>
                    <td style="border:1px solid #ddd;padding:5px;">${r.hastafecha || vig}</td>
                    <td style="border:1px solid #ddd;padding:5px;text-align:center;">${r.totalcajagrande > 0 ? `${r.totalcajagrande} ${gr}` : `${r.totalcajachica} ${ch}`}</td>
                    <td style="border:1px solid #ddd;padding:5px;text-align:center;">${r.totaldiasdefinidos}</td>
                </tr>
            `).join('');
            tableAlojHtml = `
                <h4 style="border-bottom:1px solid #ccc;margin-bottom:10px;font-size:12px;">${t.pdf_sec_movimientos || 'Detalle de movimientos'}</h4>
                <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:20px;">
                    <thead style="background:#f0f0f0;">
                        <tr>
                            <th style="border:1px solid #ddd;padding:5px;">${t.pdf_th_id || 'ID'}</th>
                            <th style="border:1px solid #ddd;padding:5px;">${t.desde || 'Desde'}</th>
                            <th style="border:1px solid #ddd;padding:5px;">${t.hasta || 'Hasta'}</th>
                            <th style="border:1px solid #ddd;padding:5px;">${t.cajas || 'Cajas'}</th>
                            <th style="border:1px solid #ddd;padding:5px;">${t.dias || 'Días'}</th>
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
                        const catsPdf = resTraz.data.categorias_datos || resTraz.data.categorias || [];
                        const catsInicio = resTraz.data.categorias_inicio || [];
                        let hasTrazContentInTramo = false;
                        const tramoTit = (t.pdf_tramo_bloque || 'Tramo #{id} (desde: {fecha})')
                            .replace('{id}', String(tramo.IdAlojamiento))
                            .replace('{fecha}', new Date(tramo.fechavisado).toLocaleDateString());
                        let tramoHtml = `<div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                            <h5 style="font-size: 11px; background-color: #f0f8ff; padding: 5px; color: #0d6efd; margin-bottom: 8px;">${escapePdfHtml(tramoTit)}</h5>`;

                        resTraz.data.cajas.forEach((caja) => {
                            let cajaHtml = `<div style="margin-left: 5px; margin-bottom: 10px;">
                                <strong style="font-size: 10px; color: #444; background: #e9ecef; padding: 2px 5px; border-radius: 3px;">📦 ${escapePdfHtml(caja.NombreCaja)}</strong>`;

                            let hasContentInCaja = false;
                            if (caja.unidades && caja.unidades.length > 0) {
                                caja.unidades.forEach((u) => {
                                    const rowsInicio = valoresInicioOrdered(u.valores_inicio, catsInicio);
                                    const hasInicio = rowsInicio.length > 0;
                                    const hasPivot = u.observaciones_pivot && u.observaciones_pivot.length > 0;
                                    if (!hasInicio && !hasPivot) return;

                                    hasTrazContentInTramo = true;
                                    hasContentInCaja = true;

                                    const thFecha = t.pdf_th_fecha || 'Fecha';
                                    const thCampo = t.pdf_th_variable || 'Variable';
                                    const thValor = t.pdf_th_valor || 'Valor';
                                    const lblInicio = t.pdf_traz_ficha_inicio || 'Ficha inicial';
                                    const lblMediciones = t.pdf_traz_mediciones || 'Mediciones clínicas';

                                    cajaHtml += `<div style="margin-left: 15px; margin-top: 8px;">
                                            <span style="font-size: 10px; color: #198754; font-weight: bold;">🐾 ${escapePdfHtml(u.NombreEspecieAloj)}</span>`;

                                    if (hasInicio) {
                                        cajaHtml += `<div style="font-size: 9px; font-weight: bold; color: #495057; margin-top: 6px;">${escapePdfHtml(lblInicio)}</div>
                                            <table style="width: 100%; border-collapse: collapse; margin-top: 2px; font-size: 9px;">
                                                <tr style="background-color: #f9f9f9;">
                                                    <th style="border: 1px solid #ccc; padding: 4px; text-align: left;">${escapePdfHtml(thCampo)}</th>
                                                    <th style="border: 1px solid #ccc; padding: 4px; text-align: left;">${escapePdfHtml(thValor)}</th>
                                                </tr>`;
                                        rowsInicio.forEach((row) => {
                                            cajaHtml += `<tr>
                                                <td style="border: 1px solid #ccc; padding: 4px;">${escapePdfHtml(row.NombreCatAlojUnidad)}</td>
                                                <td style="border: 1px solid #ccc; padding: 4px;">${escapePdfHtml(row.Valor)}</td>
                                            </tr>`;
                                        });
                                        cajaHtml += `</table>`;
                                    }

                                    if (hasPivot) {
                                        cajaHtml += `<div style="font-size: 9px; font-weight: bold; color: #495057; margin-top: 8px;">${escapePdfHtml(lblMediciones)}</div>
                                            <table style="width: 100%; border-collapse: collapse; margin-top: 3px; font-size: 9px; text-align: center;">
                                                <tr style="background-color: #f9f9f9;">
                                                    <th style="border: 1px solid #ccc; padding: 4px;">${escapePdfHtml(thFecha)}</th>`;
                                        catsPdf.forEach((cat) => {
                                            cajaHtml += `<th style="border: 1px solid #ccc; padding: 4px;">${escapePdfHtml(cat.NombreCatAlojUnidad)}</th>`;
                                        });
                                        cajaHtml += `</tr>`;

                                        u.observaciones_pivot.forEach((obs) => {
                                            cajaHtml += `<tr><td style="border: 1px solid #ccc; padding: 4px;">${escapePdfHtml(new Date(obs.fechaObs).toLocaleDateString())}</td>`;
                                            catsPdf.forEach((cat) => {
                                                const val = (obs.valores && obs.valores[cat.NombreCatAlojUnidad]) || '-';
                                                cajaHtml += `<td style="border: 1px solid #ccc; padding: 4px;">${escapePdfHtml(val)}</td>`;
                                            });
                                            cajaHtml += `</tr>`;
                                        });
                                        cajaHtml += `</table>`;
                                    }

                                    cajaHtml += `</div>`;
                                });
                            }
                            cajaHtml += `</div>`;
                            if (hasContentInCaja) tramoHtml += cajaHtml;
                        });
                        tramoHtml += `</div>`;
                        if (hasTrazContentInTramo) trazabilidadHtml += tramoHtml;
                    }
                } catch(err) { console.warn("Sin clínica en tramo:", tramo.IdAlojamiento); }
            }

            if (trazabilidadHtml === '') {
                trazabilidadHtml = `<p style="font-size: 11px; font-style: italic; color: #888;">${t.pdf_sin_clinica || 'Los animales de esta historia no tienen variables clínicas registradas.'}</p>`;
            } else {
                trazabilidadHtml = `
                <div style="border-top: 2px solid #eee; padding-top: 15px;">
                    <p style="font-size: 13px; font-weight: bold; color: #0d6efd; border-bottom: 1px solid #0d6efd; padding-bottom: 5px; margin-bottom: 15px;">
                        ${t.pdf_traz_header || 'Trazabilidad y constantes clínicas:'}
                    </p>
                    ${trazabilidadHtml}
                </div>`;
            }
        }

        // C. ENSAMBLAR PDF COMPLETO
        const piePdf = (t.pdf_generado_por || 'Generado por GROBO el {fecha}').replace('{fecha}', new Date().toLocaleString());
        const subFicha = (t.pdf_ficha_subtitulo || 'Ficha de alojamiento — Historia #{id}').replace('{id}', String(h.IdHistoria));
        const template = `
            <div style="font-family:Arial;padding:20px;color:#333;font-size:12px;background:#ffffff;">
                <div style="text-align:center;border-bottom:2px solid #1a5d3b;padding-bottom:10px;margin-bottom:15px;">
                    <h2 style="color:#1a5d3b;margin:0;font-size:18px;">${h.Institucion.toUpperCase()}</h2>
                    <h3 style="margin:5px 0;font-size:14px;">${subFicha}</h3>
                </div>

                <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:11px;">
                    <tr style="background:#f8f9fa;">
                        <td style="border:1px solid #ddd;padding:8px;"><strong>${t.pdf_investigador || 'INVESTIGADOR:'}</strong><br>${h.Investigador}</td>
                        <td style="border:1px solid #ddd;padding:8px;"><strong>${t.pdf_protocolo_label || 'PROTOCOLO:'}</strong><br>${h.Protocolo}</td>
                        <td style="border:1px solid #ddd;padding:8px;"><strong>${t.pdf_especie_label || 'ESPECIE:'}</strong><br>${h.Especie}</td>
                        <td style="border:1px solid #ddd;padding:8px;"><strong>${t.pdf_total_dias || 'TOTAL DÍAS:'}</strong><br>${h.TotalDias}</td>
                    </tr>
                </table>

                ${tableAlojHtml}
                ${trazabilidadHtml}
                
                <div style="margin-top:20px;font-size:10px;color:#777;text-align:center;">${piePdf}</div>
            </div>`;

        Swal.close();
        html2pdf()
            .set({
                margin: [18, 18, 18, 18],
                filename: `Alojamiento_${h.IdHistoria}.pdf`,
                html2canvas: { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true },
            })
            .from(template)
            .save();
        
    } catch (e) {
        Swal.fire(
            window.txt?.generales?.error || 'Error',
            e.message || t.err_pdf_ficha || 'No se pudo generar el PDF.',
            'error',
        );
    }
};

/* --- CONTACTAR SEDE --- */
window.openContactModal = (infoStr) => {
    const info = JSON.parse(decodeURIComponent(infoStr));
    const ma = window.txt?.misalojamientos || {};
    const correo = info.InstCorreo || '';
    const telefono = info.InstContacto || ma.contact_sin_telefono || 'No registrado';
    const iid = parseInt(String(info.IdInstitucion || ''), 10);
    const hrefMsg =
        iid > 0 && isInvestigatorRole()
            ? buildMensajesNuevoFromContext({
                  instId: iid,
                  asunto: `${ma.contacto_msg_asunto_aloj || 'Consulta alojamiento GROBO'} — ${info.NombreInst || ''}`.trim(),
                  origenTipo: 'alojamiento',
              })
            : '';
    const btnMsg = hrefMsg
        ? `<a href="${hrefMsg}" class="btn btn-success fw-bold shadow-sm py-2 text-uppercase w-100" style="letter-spacing: 1px;">
                <i class="bi bi-chat-dots-fill me-2"></i> ${ma.btn_enviar_mensaje_app || 'Enviar mensaje (app)'}
            </a>`
        : '';

    Swal.fire({
        title: `<h5 class="fw-bold m-0 text-dark">${ma.contact_modal_titulo || 'Contactar al bioterio'}</h5><span class="text-success small">${info.NombreInst.toUpperCase()}</span>`,
        html: `
            <div class="d-flex flex-column gap-3 mt-3 px-2">
                <div class="p-3 bg-light border border-success rounded text-center shadow-sm">
                    <i class="bi bi-telephone-fill text-success fs-2 d-block mb-1"></i>
                    <span class="small text-muted text-uppercase fw-bold d-block">${ma.contact_linea_directa || 'Línea directa'}</span>
                    <strong class="fs-4 text-dark">${telefono}</strong>
                </div>
                ${correo ? `
                    <a href="mailto:${correo}" class="btn btn-primary fw-bold shadow-sm py-2 text-uppercase" style="letter-spacing: 1px;">
                        <i class="bi bi-envelope-at-fill me-2"></i> ${ma.contact_btn_correo || 'Enviar correo'}
                    </a>
                ` : `<div class="alert alert-warning small py-2">${ma.contact_sin_correo || 'La sede no registró un correo electrónico.'}</div>`}
                ${btnMsg}
            </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        width: '400px'
    });
};

function openExcelModal() { new bootstrap.Modal(document.getElementById('modal-excel')).show(); }

window.processExcelExport = () => {
    const ma = window.txt?.misalojamientos || {};
    const start = document.getElementById('excel-start').value;
    const end = document.getElementById('excel-end').value;
    if (!start || !end) {
        return Swal.fire(ma.swal_info || 'Información', ma.excel_sel_fechas || 'Seleccione las fechas.', 'info');
    }

    const data = allHousings.filter(h => h.FechaInicio >= start && h.FechaInicio <= end);
    if (!data.length) {
        return Swal.fire(ma.swal_info || 'Información', ma.excel_sin_datos || 'No hay datos en el rango.', 'info');
    }

    const headers = [
        ma.col_historia || 'Historia',
        ma.col_institucion || 'Institución',
        ma.col_protocolo || 'Protocolo',
        ma.col_especie || 'Especie',
        ma.col_inicio || 'Inicio',
        ma.col_fin || 'Fin',
        ma.col_costo || 'Costo total',
        ma.col_estado || 'Estado',
    ];
    const rows = [headers.join(';')];
    data.forEach((h) => {
        const vals = [
            h.IdHistoria,
            h.Institucion,
            h.Protocolo,
            h.Especie,
            h.FechaInicio,
            h.FechaFin,
            h.CostoTotal,
            h.Estado,
        ].map((v) => String(v ?? '').replace(/;/g, ','));
        rows.push(vals.join(';'));
    });
    
    const blob = new Blob(["\uFEFF"+rows.join("\r\n")], {type:'text/csv;charset=utf-8;'});
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "Alojamientos.csv";
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};