/**
 * GECKO STATISTICS ENGINE - GROBO 2026
 * Desarrollado para: Gecko Devs (Tojito)
 * Versión: Final (PDF Rápido + Excel Multi-hoja + UX Mejorada)
 */

// ¡AQUÍ ESTABA EL ERROR! Faltaba importar la API para que pudiera hacer la petición.
import { API } from '../../api.js';
import { getPdfLogoImageUrl } from '../../utils/pdfLogoHeader.js';

let charts = {};
let rawData = null;
let redRawData = null;
let deptColorsSede = {};
let deptColorsRed = {};
/** @type {'sede'|'red'} */
let currentStatsScope = 'sede';
let redDataLoaded = false;

export async function initStatsPage() {
    console.log("GeckoStats: Inicializando...");
    
    // 1. Configurar Fechas por defecto (Mes actual)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    if (document.getElementById('stats-from')) document.getElementById('stats-from').value = firstDay;
    if (document.getElementById('stats-to')) document.getElementById('stats-to').value = today;

    // 2. Ocultar contenido hasta que cargue
    const content = document.getElementById('stats-content');
    if (content) content.style.display = 'none';

    // 3. Eventos de Botones Principales (según pestaña activa)
    document.getElementById('btn-update-stats').onclick = async () => {
        if (currentStatsScope === 'red') await loadStatsRedFull();
        else await loadStats();
    };

    document.getElementById('btn-excel-stats').onclick = () => {
        if (currentStatsScope === 'red') exportToExcelRed();
        else exportToExcel();
    };
    document.getElementById('btn-pdf-stats').onclick = () => {
        if (currentStatsScope === 'red') askExportPDFOptionsRed();
        else askExportPDFOptions();
    };

    // 4. Configuración de Gráficos (Cambio de tipo)
    const chartTypeSel = document.getElementById('chart-type');
    if (chartTypeSel) chartTypeSel.addEventListener('change', () => renderMainChart('sede'));

    const chartTypeRed = document.getElementById('red-chart-type');
    if (chartTypeRed) chartTypeRed.addEventListener('change', () => renderMainChart('red'));

    const speciesTypeSel = document.getElementById('species-chart-type');
    if (speciesTypeSel) speciesTypeSel.addEventListener('change', () => renderSpeciesChart('sede'));

    const speciesTypeRed = document.getElementById('red-species-chart-type');
    if (speciesTypeRed) speciesTypeRed.addEventListener('change', () => renderSpeciesChart('red'));

    // 5. Filtros visuales por pestaña
    document.querySelectorAll('#pane-sede .col-chk-sede').forEach(chk => {
        chk.addEventListener('change', (e) => {
            toggleTableColumn(e.target.dataset.col, e.target.checked, 'sede');
            renderMainChart('sede');
        });
    });
    document.querySelectorAll('#pane-red .col-chk-red').forEach(chk => {
        chk.addEventListener('change', (e) => {
            toggleTableColumn(e.target.dataset.col, e.target.checked, 'red');
            renderMainChart('red');
        });
    });

    window.viewChartFullScreen = openChartModal;
    window.exportChartToPDF = exportChartToPDF;

    loadInstitutionFlags();
    wireStatsScopeTabs();
}

function wireStatsScopeTabs() {
    const tabRed = document.getElementById('tab-red-btn');
    const tabSede = document.getElementById('tab-sede-btn');
    if (tabRed) {
        tabRed.addEventListener('shown.bs.tab', async () => {
            currentStatsScope = 'red';
            if (!redDataLoaded) await loadStatsRedFull();
            else resizeAllCharts();
        });
    }
    if (tabSede) {
        tabSede.addEventListener('shown.bs.tab', () => {
            currentStatsScope = 'sede';
            resizeAllCharts();
        });
    }
}

function resizeAllCharts() {
    requestAnimationFrame(() => {
        ['main', 'species', 'mainRed', 'speciesRed', 'modal'].forEach(k => {
            const c = charts[k];
            if (c && typeof c.resize === 'function') c.resize();
        });
    });
}

/**
 * Carga de datos desde la API
 */
async function loadStats() {
    const from = document.getElementById('stats-from')?.value;
    const to = document.getElementById('stats-to')?.value;
    const instId = localStorage.getItem('instId') || '1';
    
    const btn = document.getElementById('btn-update-stats');
    const t = window.txt?.admin_estadisticas;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${t?.cargando || 'CARGANDO...'}`;
    }

    try {
        // ✅ AHORA SÍ FUNCIONARÁ EL MOTOR API.request
        const res = await API.request(`/stats/dashboard?inst=${instId}&from=${from}&to=${to}&v=${Date.now()}`);

        if (res.status === 'success') {
            rawData = res.data;
            document.getElementById('stats-content').style.display = 'block';
            
            generateDeptColors(rawData.por_departamento, 'sede');

            renderGlobalCards('sede');
            renderAlojamientoTrazabilidadSection('sede');
            renderSpeciesCounters('sede');
            renderTable('sede');
            renderTableOrganizacion('sede');
            renderMainChart('sede');
            renderSpeciesChart('sede');
            renderDetailsSection('sede');
            
        } else {
            alert("Error en la respuesta: " + res.message);
        }
    } catch (e) {
        console.error("Error de red/servidor:", e);
        alert("Error de conexión con el servidor.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = t?.btn_actualizar || 'ACTUALIZAR';
        }
    }
}

async function loadInstitutionFlags() {
    try {
        const res = await API.request('/stats/institution-flags');
        const wrap = document.getElementById('stats-scope-wrap');
        if (res.status === 'success' && res.data && res.data.madre_grupo == 1 && (res.data.instituciones_en_red || 0) > 1) {
            if (wrap) wrap.classList.remove('d-none');
        } else if (wrap) {
            wrap.classList.add('d-none');
        }
    } catch (e) {
        console.warn('No se pudieron cargar flags de institución:', e);
    }
}

async function loadStatsRedFull() {
    const from = document.getElementById('stats-from')?.value;
    const to = document.getElementById('stats-to')?.value;
    const btn = document.getElementById('btn-update-stats');
    const t = window.txt?.admin_estadisticas;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${t?.cargando || 'CARGANDO...'}`;
    }
    try {
        const res = await API.request(`/stats/dashboard-red?from=${from}&to=${to}&v=${Date.now()}`);
        if (res.status === 'success') {
            redRawData = res.data;
            redDataLoaded = true;
            const pane = document.getElementById('stats-content-red');
            if (pane) pane.style.display = 'block';
            generateDeptColors(redRawData.por_departamento || [], 'red');
            renderGlobalCards('red');
            renderAlojamientoTrazabilidadSection('red');
            renderSpeciesCounters('red');
            renderTable('red');
            renderTableOrganizacion('red');
            renderMainChart('red');
            renderSpeciesChart('red');
            renderDetailsSection('red');
        } else {
            alert(res.message || 'Error al cargar estadísticas de la red.');
        }
    } catch (e) {
        console.error(e);
        alert('Error de conexión.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = t?.btn_actualizar || 'ACTUALIZAR';
        }
    }
}

function exportToExcelRed() {
    if (!redRawData) {
        alert(window.txt?.admin_estadisticas?.red_sin_datos || 'Cargue primero las estadísticas de la red (pestaña Red).');
        return;
    }
    const wb = XLSX.utils.book_new();
    const g = redRawData.globales;
    const globalData = [
        ['METRICA', 'TOTAL RED'],
        ['Animales', g.total_animales],
        ['Reactivos', g.total_reactivos],
        ['Insumos', g.total_insumos],
        ['Protocolos', g.total_protocolos],
        ['Alojamientos', g.total_alojamientos]
    ];
    if (redRawData.alojamiento_trazabilidad) {
        const at = redRawData.alojamiento_trazabilidad;
        globalData.push(['Historias (aloj.)', at.total_historias], ['Cajas físicas', at.total_cajas], ['Obs. trazabilidad', at.total_observaciones_trazabilidad]);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(globalData), 'Resumen_Red');
    const deptData = (redRawData.por_departamento || []).map(d => ({
        Departamento: d.departamento,
        Animales: d.total_animales,
        Reactivos: d.total_reactivos,
        Insumos: d.total_insumos,
        Protocolos: d.protocolos_aprobados
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(deptData), 'Departamentos_Red');
    const espData = (redRawData.detalle_especies || []).map(e => ({
        Departamento: e.departamento,
        Especie: e.especie,
        Subespecie: e.subespecie,
        Cantidad: e.cantidad_animales
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(espData), 'Detalle_Especies_Red');
    const protData = (redRawData.detalle_protocolos || []).map(p => ({
        Departamento: p.departamento,
        Protocolo: p.nprotA,
        Titulo: p.tituloA,
        Vence: p.FechaFinProtA,
        Estado: new Date(p.FechaFinProtA) < new Date() ? 'VENCIDO' : 'VIGENTE'
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(protData), 'Protocolos_Red');
    const orgData = (redRawData.por_organizacion || []).map(o => ({
        Organización: o.organizacion || '',
        Animales: o.total_animales,
        Reactivos: o.total_reactivos,
        Insumos: o.total_insumos,
        'Prot. Aprob': o.protocolos_aprobados
    }));
    if (orgData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orgData), 'Organizacion_Red');
    if (redRawData.alojamiento_trazabilidad?.por_especie?.length) {
        const atEsp = redRawData.alojamiento_trazabilidad.por_especie.map(e => ({
            Especie: e.especie,
            Historias: e.historias,
            Tramos: e.tramos
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(atEsp), 'Aloj_por_especie_Red');
    }
    const rank = (redRawData.ranking_especies || []).map(r => ({ Especie: r.etiqueta_especie, Cantidad: r.cantidad }));
    if (rank.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rank), 'Ranking_especies_Red');
    XLSX.writeFile(wb, `Reporte_Red_GROBO_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function askExportPDFOptionsRed() {
    if (!window.Swal) { exportFastPDFRed(true); return; }
    Swal.fire({
        title: window.txt?.admin_estadisticas?.red_pdf_title || 'Exportar PDF (red)',
        text: window.txt?.admin_estadisticas?.red_pdf_text || '¿Incluir gráficos de la red?',
        icon: 'question',
        showDenyButton: true,
        confirmButtonText: window.txt?.admin_estadisticas?.red_pdf_con_graf || 'Sí, con gráficos',
        denyButtonText: window.txt?.admin_estadisticas?.red_pdf_solo_tablas || 'Solo tablas',
        confirmButtonColor: '#1a5d3b'
    }).then((r) => exportFastPDFRed(r.isConfirmed));
}

async function exportFastPDFRed(includeCharts) {
    if (!redRawData) {
        alert(window.txt?.admin_estadisticas?.red_sin_datos || 'Cargue primero las estadísticas de la red (pestaña Red).');
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const M = 18;
    let titleY = M;
    const logoUrl = getPdfLogoImageUrl(localStorage.getItem('instLogoEnPdf'), localStorage.getItem('instLogo'));
    if (logoUrl) {
        try {
            const resp = await fetch(logoUrl);
            const blob = await resp.blob();
            const dataUrl = await new Promise((res, rej) => {
                const r = new FileReader();
                r.onload = () => res(r.result);
                r.onerror = rej;
                r.readAsDataURL(blob);
            });
            doc.addImage(dataUrl, 'JPEG', M, M, 35, 12);
            titleY = M + 19;
        } catch (e) {
            console.warn('Logo no cargado para PDF red:', e);
        }
    }
    const tTit = window.txt?.admin_estadisticas?.red_pdf_doc_title || 'REPORTE RED — GROBO';
    doc.setFontSize(16);
    doc.text(tTit, M, titleY);
    doc.setFontSize(10);
    doc.text(`${window.txt?.admin_estadisticas?.red_pdf_fecha || 'Fecha'}: ${new Date().toLocaleDateString()}`, M, titleY + 7);
    const g = redRawData.globales;
    const t = window.txt?.generales;
    const lblTotal = t?.total ?? 'Total';
    doc.autoTable({
        startY: titleY + 13,
        margin: { left: M, right: M },
        head: [['Métrica', lblTotal, 'Métrica', lblTotal]],
        body: [
            ['Animales', g.total_animales, 'Reactivos', g.total_reactivos],
            ['Insumos', g.total_insumos, 'Protocolos', g.total_protocolos],
            ['Alojamientos', g.total_alojamientos, '', '']
        ],
        theme: 'grid',
        headStyles: { fillColor: [26, 93, 59] }
    });
    let currentY = doc.lastAutoTable.finalY + 10;
    if (includeCharts) {
        const canvas = document.getElementById('red-chart-canvas');
        if (canvas) {
            try {
                const imgData = canvas.toDataURL('image/jpeg', 0.8);
                const props = doc.getImageProperties(imgData);
                const h = (props.height * 180) / props.width;
                if (currentY + h > 280) { doc.addPage(); currentY = 15; }
                doc.text(window.txt?.admin_estadisticas?.red_pdf_graf_depto || 'Gráfico por departamento (red)', 14, currentY);
                doc.addImage(imgData, 'JPEG', 15, currentY + 5, 180, h);
                currentY += h + 15;
            } catch (e) { console.warn(e); }
        }
        const canvasSp = document.getElementById('red-chart-species');
        if (canvasSp) {
            try {
                const imgData = canvasSp.toDataURL('image/jpeg', 0.75);
                const props = doc.getImageProperties(imgData);
                const h = Math.min(100, (props.height * 170) / props.width);
                if (currentY + h > 280) { doc.addPage(); currentY = 15; }
                doc.text(window.txt?.admin_estadisticas?.red_pdf_graf_esp || 'Gráfico especies (red)', 14, currentY);
                doc.addImage(imgData, 'JPEG', 15, currentY + 5, 170, h);
                currentY += h + 12;
            } catch (e) { console.warn(e); }
        }
    }
    if (currentY + 30 > 280) { doc.addPage(); currentY = M; }
    doc.text(window.txt?.admin_estadisticas?.red_pdf_tab_depto || 'Desglose por departamento (red)', M, currentY);
    const rowsDept = (redRawData.por_departamento || []).map(d => [d.departamento, d.total_animales, d.total_reactivos, d.total_insumos, d.protocolos_aprobados]);
    doc.autoTable({
        startY: currentY + 5,
        margin: { left: M, right: M },
        head: [['Departamento', 'Anim.', 'Reac.', 'Ins.', 'Prot.']],
        body: rowsDept,
        theme: 'striped'
    });
    doc.addPage();
    doc.text(window.txt?.admin_estadisticas?.red_pdf_tab_esp || 'Detalle especies (red)', M, M);
    const rowsEsp = (redRawData.detalle_especies || []).map(e => [e.departamento, e.especie, e.subespecie || '-', e.cantidad_animales]);
    doc.autoTable({
        startY: M + 5,
        margin: { left: M, right: M },
        head: [['Depto', 'Especie', 'Subespecie', 'Cant.']],
        body: rowsEsp,
        theme: 'plain',
        columnStyles: { 0: { fontStyle: 'bold' } }
    });
    doc.save(`Reporte_Red_GROBO_${Date.now()}.pdf`);
}

// ==========================================
// UTILIDADES
// ==========================================

function generateDeptColors(deptos, scopeKey) {
    const palette = [
        '#1a5d3b', '#0d6efd', '#ffc107', '#dc3545', '#6610f2',
        '#fd7e14', '#20c997', '#0dcaf0', '#6c757d', '#d63384', '#198754'
    ];
    const bucket = {};
    (deptos || []).forEach((d, i) => {
        bucket[d.departamento] = palette[i % palette.length];
    });
    if (scopeKey === 'red') deptColorsRed = bucket;
    else deptColorsSede = bucket;
}

function setSafeText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = parseInt(val, 10).toLocaleString('es-UY');
}

function metricChecked(scope, id) {
    const fullId = scope === 'red' ? `red-${id}` : id;
    return document.getElementById(fullId)?.checked;
}

// ==========================================
// RENDERIZADO DE COMPONENTES
// ==========================================

function renderGlobalCards(scope) {
    const data = scope === 'red' ? redRawData : rawData;
    if (!data || !data.globales) return;
    const p = scope === 'red' ? 'red-' : '';
    const g = data.globales;
    setSafeText(`${p}box-animales`, g.total_animales);
    setSafeText(`${p}box-reactivos`, g.total_reactivos);
    setSafeText(`${p}box-insumos`, g.total_insumos);
    setSafeText(`${p}box-protocolos`, g.total_protocolos);
    setSafeText(`${p}box-alojamientos`, g.total_alojamientos);
}

function renderAlojamientoTrazabilidadSection(scope) {
    const containerId = scope === 'red' ? 'red-alojamiento-trazabilidad-section' : 'alojamiento-trazabilidad-section';
    const container = document.getElementById(containerId);
    const data = scope === 'red' ? redRawData : rawData;
    if (!container || !data || !data.alojamiento_trazabilidad) return;
    const at = data.alojamiento_trazabilidad;

    let html = `
        <div class="col-md-3 col-6">
            <div class="card p-3 border-0 shadow-sm text-center border-top border-3 border-info">
                <small class="text-muted fw-bold">HISTORIAS</small>
                <h3 class="mb-0 fw-bold text-info">${(at.total_historias || 0).toLocaleString('es-UY')}</h3>
                <small class="text-muted" style="font-size: 0.7rem;">Agrupaciones de alojamiento</small>
            </div>
        </div>
        <div class="col-md-3 col-6">
            <div class="card p-3 border-0 shadow-sm text-center border-top border-3 border-secondary">
                <small class="text-muted fw-bold">CAJAS FÍSICAS</small>
                <h3 class="mb-0 fw-bold text-secondary">${(at.total_cajas || 0).toLocaleString('es-UY')}</h3>
                <small class="text-muted" style="font-size: 0.7rem;">Unidades de trazabilidad</small>
            </div>
        </div>
        <div class="col-md-3 col-6">
            <div class="card p-3 border-0 shadow-sm text-center border-top border-3 border-success">
                <small class="text-muted fw-bold">OBS. TRAZABILIDAD</small>
                <h3 class="mb-0 fw-bold text-success">${(at.total_observaciones_trazabilidad || 0).toLocaleString('es-UY')}</h3>
                <small class="text-muted" style="font-size: 0.7rem;">Registros clínicos</small>
            </div>
        </div>
        <div class="col-md-3 col-6">
            <div class="card p-3 border-0 shadow-sm text-center border-top border-3 border-primary">
                <small class="text-muted fw-bold">ALOJ. ACTIVOS</small>
                <h3 class="mb-0 fw-bold text-primary">${(at.alojamientos_activos || 0).toLocaleString('es-UY')}</h3>
                <small class="text-muted" style="font-size: 0.7rem;">Tramos vigentes</small>
            </div>
        </div>`;

    if (at.por_especie && at.por_especie.length > 0) {
        html += `
        <div class="col-12 mt-2">
            <div class="card border-0 shadow-sm">
                <div class="card-header bg-white fw-bold small">Alojamiento por especie</div>
                <div class="table-responsive">
                    <table class="table table-sm table-hover mb-0">
                        <thead class="table-light"><tr><th>Especie</th><th class="text-center">Historias</th><th class="text-center">Tramos</th></tr></thead>
                        <tbody>
                            ${at.por_especie.map(e => `<tr><td class="fw-bold">${e.especie}</td><td class="text-center">${e.historias}</td><td class="text-center">${e.tramos}</td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;
    }
    container.innerHTML = html;
}

function renderSpeciesCounters(scope) {
    const containerId = scope === 'red' ? 'red-species-counters-container' : 'species-counters-container';
    const container = document.getElementById(containerId);
    const data = scope === 'red' ? redRawData : rawData;
    if (!container || !data?.ranking_especies) return;
    container.innerHTML = '';

    const top4 = data.ranking_especies.slice(0, 4);
    if (top4.length === 0) {
        container.innerHTML = '<div class="col-12 text-muted fst-italic">No hay datos de especies para este período.</div>';
        return;
    }

    const metas = [
        {color: 'success', icon: 'trophy-fill'},
        {color: 'primary', icon: '2-circle-fill'},
        {color: 'warning', icon: '3-circle-fill'},
        {color: 'secondary', icon: 'check-circle-fill'}
    ];

    top4.forEach((esp, i) => {
        const meta = metas[i] || metas[3];
        const html = `
            <div class="col-md-3 col-sm-6">
                <div class="card border-0 shadow-sm h-100 border-bottom border-${meta.color} border-3">
                    <div class="card-body p-3 d-flex justify-content-between align-items-center">
                        <div style="overflow: hidden;">
                            <h6 class="text-muted small fw-bold text-uppercase mb-1">TOP ${i+1}</h6>
                            <h5 class="fw-bold text-dark mb-0 text-truncate" title="${esp.etiqueta_especie}">${esp.etiqueta_especie}</h5>
                        </div>
                        <div class="text-end ps-2">
                            <h2 class="fw-bold text-${meta.color} mb-0">${esp.cantidad}</h2>
                            <small class="text-muted" style="font-size: 0.7rem;"><i class="bi bi-${meta.icon}"></i> USO</small>
                        </div>
                    </div>
                </div>
            </div>`;
        container.insertAdjacentHTML('beforeend', html);
    });
}

function renderTable(scope) {
    const tbodyId = scope === 'red' ? 'red-table-body-stats' : 'table-body-stats';
    const tbody = document.getElementById(tbodyId);
    const data = scope === 'red' ? redRawData : rawData;
    if (!tbody || !data?.por_departamento) return;

    const colCls = scope === 'red' ? 'red-col-val' : 'col-val';
    tbody.innerHTML = data.por_departamento.map(d => {
        const alojObj = (data.alojamientos_activos || []).find(a => a.departamento === d.departamento);
        const cantAloj = alojObj ? alojObj.cantidad : 0;
        const badgeClass = cantAloj > 0 ? 'bg-info text-dark' : 'bg-light text-muted border';

        return `
            <tr>
                <td class="fw-bold text-success small py-3 text-uppercase">${d.departamento}</td>
                <td class="text-center ${colCls}-1 fw-bold">${d.total_animales}</td>
                <td class="text-center ${colCls}-2 text-muted">${d.total_reactivos}</td>
                <td class="text-center ${colCls}-3 text-muted">${d.total_insumos}</td>
                <td class="text-center ${colCls}-4 text-primary">${d.protocolos_aprobados}</td>
                <td class="text-center ${colCls}-5"><span class="badge ${badgeClass} rounded-pill px-3">${cantAloj}</span></td>
            </tr>`;
    }).join('');

    const chkSel = scope === 'red' ? '#pane-red .col-chk-red' : '#pane-sede .col-chk-sede';
    document.querySelectorAll(chkSel).forEach(chk => {
        toggleTableColumn(chk.dataset.col, chk.checked, scope);
    });
}

function renderTableOrganizacion(scope) {
    const tbodyId = scope === 'red' ? 'red-table-body-org' : 'table-body-org';
    const tbody = document.getElementById(tbodyId);
    const data = scope === 'red' ? redRawData : rawData;
    if (!tbody || !data || !data.por_organizacion) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">–</td></tr>';
        return;
    }
    const t = window.txt?.generales;
    const labelSinOrg = t?.sin_organizacion || '(Sin organización)';
    tbody.innerHTML = data.por_organizacion.map(o => {
        const orgLabel = (o.organizacion === '(Sin organización)') ? labelSinOrg : (o.organizacion || '–');
        return `
            <tr>
                <td class="fw-bold text-success small py-2">${orgLabel}</td>
                <td class="text-center">${parseInt(o.total_animales, 10) || 0}</td>
                <td class="text-center">${parseInt(o.total_reactivos, 10) || 0}</td>
                <td class="text-center">${parseInt(o.total_insumos, 10) || 0}</td>
                <td class="text-center text-primary">${parseInt(o.protocolos_aprobados, 10) || 0}</td>
            </tr>`;
    }).join('');
}

function toggleTableColumn(colNum, isVisible, scope = 'sede') {
    const mode = isVisible ? '' : 'none';
    const prefix = scope === 'red' ? 'red-col-val' : 'col-val';
    document.querySelectorAll(`.${prefix}-${colNum}`).forEach(el => { el.style.display = mode; });
    const tableId = scope === 'red' ? 'red-main-stats-table' : 'main-stats-table';
    const table = document.getElementById(tableId);
    if (table && table.tHead && table.tHead.rows[0]) {
        const th = table.tHead.rows[0].cells[parseInt(colNum, 10)];
        if (th) th.style.display = mode;
    }
}

// ==========================================
// GRÁFICOS (CHART.JS)
// ==========================================

function renderMainChart(scope = 'sede') {
    const isRed = scope === 'red';
    const canvasId = isRed ? 'red-chart-canvas' : 'chart-canvas';
    const chartKey = isRed ? 'mainRed' : 'main';
    const typeEl = document.getElementById(isRed ? 'red-chart-type' : 'chart-type');
    const canvas = document.getElementById(canvasId);
    const data = isRed ? redRawData : rawData;
    if (!canvas || !data?.por_departamento) return;

    const ctx = canvas.getContext('2d');
    const type = typeEl?.value || 'bar';
    const ChartLib = window.Chart;

    if (charts[chartKey]) charts[chartKey].destroy();

    const labels = data.por_departamento.map(d => d.departamento);
    const datasets = [];
    const deptColorMap = isRed ? deptColorsRed : deptColorsSede;

    const chkPrefix = isRed ? 'red-chk-' : 'chk-';
    const activeMetricsCount = ['ani', 'rea', 'ins', 'pro', 'alo'].filter(m => document.getElementById(`${chkPrefix}${m}`)?.checked).length;
    const useDeptColors = activeMetricsCount === 1 && metricChecked(scope, 'chk-ani');

    if (metricChecked(scope, 'chk-ani')) {
        datasets.push({
            label: 'Animales',
            data: data.por_departamento.map(d => d.total_animales),
            backgroundColor: useDeptColors ? labels.map(l => deptColorMap[l]) : '#198754'
        });
    }
    if (metricChecked(scope, 'chk-rea')) {
        datasets.push({ label: 'Reactivos', data: data.por_departamento.map(d => d.total_reactivos), backgroundColor: '#ffc107' });
    }
    if (metricChecked(scope, 'chk-ins')) {
        datasets.push({ label: 'Insumos', data: data.por_departamento.map(d => d.total_insumos), backgroundColor: '#6c757d' });
    }
    if (metricChecked(scope, 'chk-pro')) {
        datasets.push({ label: 'Protocolos', data: data.por_departamento.map(d => d.protocolos_aprobados), backgroundColor: '#0d6efd', hidden: true });
    }
    if (metricChecked(scope, 'chk-alo')) {
        const dataAloj = data.por_departamento.map(d => (data.alojamientos_activos || []).find(a => a.departamento === d.departamento)?.cantidad || 0);
        datasets.push({ label: 'Alojamientos', data: dataAloj, backgroundColor: '#0dcaf0' });
    }

    charts[chartKey] = new ChartLib(ctx, {
        type,
        data: { labels, datasets },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
}

function renderSpeciesChart(scope = 'sede') {
    const isRed = scope === 'red';
    const canvasId = isRed ? 'red-chart-species' : 'chart-species';
    const typeElId = isRed ? 'red-species-chart-type' : 'species-chart-type';
    const containerId = isRed ? 'red-species-chart-container' : 'species-chart-container';
    const chartKey = isRed ? 'speciesRed' : 'species';
    const canvas = document.getElementById(canvasId);
    const src = isRed ? redRawData : rawData;
    if (!canvas || !src?.ranking_especies) return;

    const ctx = canvas.getContext('2d');
    const type = document.getElementById(typeElId)?.value || 'bar';
    const ChartLib = window.Chart;

    if (charts[chartKey]) charts[chartKey].destroy();

    const rank = src.ranking_especies;
    const labels = rank.map(e => e.etiqueta_especie);
    const values = rank.map(e => e.cantidad);

    const container = document.getElementById(containerId);
    if (container) {
        if (type === 'bar') {
            container.style.height = `${Math.max(400, labels.length * 25)}px`;
        } else {
            container.style.height = '400px';
        }
    }

    const pieColors = labels.map((_, i) => `hsl(${(i * 45) % 360}, 65%, 45%)`);

    charts[chartKey] = new ChartLib(ctx, {
        type,
        data: {
            labels,
            datasets: [{
                label: 'Cantidad',
                data: values,
                backgroundColor: type === 'pie' ? pieColors : '#1a5d3b',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: type === 'bar' ? 'y' : 'x',
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// ==========================================
// DETALLES INFERIORES
// ==========================================

function renderDetailsSection(scope = 'sede') {
    const containerId = scope === 'red' ? 'red-details-container' : 'details-container';
    const container = document.getElementById(containerId);
    const data = scope === 'red' ? redRawData : rawData;
    if (!container || !data?.por_departamento) return;
    container.innerHTML = '';
    const deptos = data.por_departamento.map(d => d.departamento);

    deptos.forEach(depto => {
        const especies = (data.detalle_especies || []).filter(x => x.departamento === depto);
        const protocolos = (data.detalle_protocolos || []).filter(x => x.departamento === depto);

        if (especies.length === 0 && protocolos.length === 0) return;

        const col = document.createElement('div');
        col.className = 'col-lg-4 col-md-6';
        
        // Render Especies
        let htmlEsp = especies.map(e => `
            <li class="list-group-item d-flex justify-content-between px-0 py-1 border-bottom">
                <span>${e.especie} <small class="text-muted">(${e.subespecie||'-'})</small></span>
                <span class="fw-bold text-success">${e.cantidad_animales}</span>
            </li>`).join('');

        // Render Protocolos con Estado
        let htmlProt = protocolos.map(p => {
            const vencimiento = new Date(p.FechaFinProtA);
            const hoy = new Date();
            const isVencido = vencimiento < hoy;
            const badge = isVencido 
                ? `<span class="badge bg-danger" style="font-size:9px">Vencido (${p.FechaFinProtA})</span>` 
                : `<span class="badge bg-success" style="font-size:9px">Vigente</span>`;
            
            return `
            <li class="list-group-item px-0 py-2 border-bottom">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="badge bg-light text-dark border">${p.nprotA}</span>
                    ${badge}
                </div>
                <div class="small text-muted text-truncate" title="${p.tituloA}">${p.tituloA}</div>
            </li>`;
        }).join('');

        col.innerHTML = `
            <div class="card h-100 shadow-sm border-0 border-top border-3 border-success">
                <div class="card-header bg-white fw-bold text-success text-uppercase small">${depto}</div>
                <div class="card-body p-3 pt-0">
                    <div class="mb-3">
                        <h6 class="small fw-bold text-muted border-bottom py-2"><i class="bi bi-heptagon-half"></i> ESPECIES</h6>
                        <ul class="list-group list-group-flush small">${htmlEsp || '<li class="text-muted small fst-italic">Sin datos</li>'}</ul>
                    </div>
                    <div>
                        <h6 class="small fw-bold text-muted border-bottom py-2"><i class="bi bi-journal-check"></i> PROTOCOLOS</h6>
                        <ul class="list-group list-group-flush small">${htmlProt || '<li class="text-muted small fst-italic">Sin datos</li>'}</ul>
                    </div>
                </div>
            </div>`;
        container.appendChild(col);
    });
}

// ==========================================
// MODAL FULLSCREEN
// ==========================================

function openChartModal(chartKey) {
    if (typeof bootstrap === 'undefined') { alert("Bootstrap JS no cargado en HTML"); return; }
    const sourceChart = charts[chartKey];
    if (!sourceChart) return;

    const modalCanvas = document.getElementById('modal-chart-canvas');
    const ctx = modalCanvas.getContext('2d');
    const ChartLib = window.Chart;

    if (charts['modal']) charts['modal'].destroy();

    // Clonamos la config del gráfico original
    const config = {
        type: sourceChart.config.type,
        data: sourceChart.config.data,
        options: {
            ...sourceChart.config.options,
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true } }
        }
    };

    charts['modal'] = new ChartLib(ctx, config);

    const modalEl = document.getElementById('chartModal');
    new bootstrap.Modal(modalEl).show();
}

// ==========================================
// EXPORTACIÓN EXCEL AVANZADA (MULTI-HOJA)
// ==========================================

function exportToExcel() {
    if (!rawData) return;
    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen
    const globalData = [
        ["METRICA", "TOTAL"],
        ["Animales", rawData.globales.total_animales],
        ["Reactivos", rawData.globales.total_reactivos],
        ["Insumos", rawData.globales.total_insumos],
        ["Protocolos", rawData.globales.total_protocolos],
        ["Alojamientos", rawData.globales.total_alojamientos]
    ];
    if (rawData.alojamiento_trazabilidad) {
        const at = rawData.alojamiento_trazabilidad;
        globalData.push(["Historias (aloj.)", at.total_historias], ["Cajas físicas", at.total_cajas], ["Obs. trazabilidad", at.total_observaciones_trazabilidad]);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(globalData), "Resumen");

    // Hoja 2: Departamentos
    const deptData = rawData.por_departamento.map(d => ({
        "Departamento": d.departamento,
        "Animales": d.total_animales,
        "Reactivos": d.total_reactivos,
        "Insumos": d.total_insumos,
        "Protocolos": d.protocolos_aprobados
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(deptData), "Departamentos");

    // Hoja 3: Especies Detalle
    const espData = rawData.detalle_especies.map(e => ({
        "Departamento": e.departamento,
        "Especie": e.especie,
        "Subespecie": e.subespecie,
        "Cantidad": e.cantidad_animales
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(espData), "Detalle Especies");

    // Hoja 4: Protocolos
    const protData = rawData.detalle_protocolos.map(p => ({
        "Departamento": p.departamento,
        "Protocolo": p.nprotA,
        "Titulo": p.tituloA,
        "Vence": p.FechaFinProtA,
        "Estado": new Date(p.FechaFinProtA) < new Date() ? 'VENCIDO' : 'VIGENTE'
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(protData), "Protocolos");

    if (rawData.alojamiento_trazabilidad && rawData.alojamiento_trazabilidad.por_especie) {
        const atEsp = rawData.alojamiento_trazabilidad.por_especie.map(e => ({
            "Especie": e.especie,
            "Historias": e.historias,
            "Tramos": e.tramos
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(atEsp), "Alojamiento por especie");
    }

    XLSX.writeFile(wb, `Reporte_GROBO_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ==========================================
// EXPORTACIÓN PDF RÁPIDO (AUTO-TABLE)
// ==========================================

function askExportPDFOptions() {
    if (!window.Swal) { exportFastPDF(true); return; }
    Swal.fire({
        title: 'Exportar PDF',
        text: '¿Desea incluir los gráficos? (Esto puede tardar un poco más)',
        icon: 'question',
        showDenyButton: true,
        confirmButtonText: 'Sí, con Gráficos',
        denyButtonText: 'No, solo Tablas (Rápido)',
        confirmButtonColor: '#1a5d3b'
    }).then((r) => exportFastPDF(r.isConfirmed));
}

async function exportFastPDF(includeCharts) {
    if (!rawData) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const M = 18;
    let titleY = M;
    const logoUrl = getPdfLogoImageUrl(localStorage.getItem('instLogoEnPdf'), localStorage.getItem('instLogo'));
    if (logoUrl) {
        try {
            const resp = await fetch(logoUrl);
            const blob = await resp.blob();
            const dataUrl = await new Promise((res, rej) => {
                const r = new FileReader();
                r.onload = () => res(r.result);
                r.onerror = rej;
                r.readAsDataURL(blob);
            });
            doc.addImage(dataUrl, 'JPEG', M, M, 35, 12);
            titleY = M + 19;
        } catch (e) {
            console.warn('Logo no cargado para PDF:', e);
        }
    }

    // Título
    doc.setFontSize(16);
    doc.text("REPORTE ESTADÍSTICO - GROBO", M, titleY);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, M, titleY + 7);

    // Tabla Resumen
    const g = rawData.globales;
    const t = window.txt?.generales;
    const lblTotal = t?.total ?? 'Total';
    doc.autoTable({
        startY: titleY + 13,
        margin: { left: M, right: M },
        head: [['Métrica', lblTotal, 'Métrica', lblTotal]],
        body: [
            ['Animales', g.total_animales, 'Reactivos', g.total_reactivos],
            ['Insumos', g.total_insumos, 'Protocolos', g.total_protocolos],
            ['Alojamientos', g.total_alojamientos, '', '']
        ],
        theme: 'grid',
        headStyles: { fillColor: [26, 93, 59] }
    });

    let currentY = doc.lastAutoTable.finalY + 10;

    // Inyectar Gráfico (Solo si se pidió)
    if (includeCharts) {
        const canvas = document.getElementById('chart-canvas');
        if (canvas) {
            try {
                const imgData = canvas.toDataURL('image/jpeg', 0.8);
                const props = doc.getImageProperties(imgData);
                const h = (props.height * 180) / props.width;
                if (currentY + h > 280) { doc.addPage(); currentY = 15; }
                doc.text("Gráfico General", 14, currentY);
                doc.addImage(imgData, 'JPEG', 15, currentY + 5, 180, h);
                currentY += h + 15;
            } catch(e) { console.warn("Error chart img"); }
        }
    }

    // Tabla Departamentos
    if (currentY + 30 > 280) { doc.addPage(); currentY = M; }
    doc.text("Desglose por Departamento", M, currentY);

    const rowsDept = rawData.por_departamento.map(d => [d.departamento, d.total_animales, d.total_reactivos, d.total_insumos, d.protocolos_aprobados]);
    doc.autoTable({
        startY: currentY + 5,
        margin: { left: M, right: M },
        head: [['Departamento', 'Anim.', 'Reac.', 'Ins.', 'Prot.']],
        body: rowsDept,
        theme: 'striped'
    });

    // Tabla Especies
    doc.addPage();
    doc.text("Detalle de Especies Utilizadas", M, M);
    const rowsEsp = rawData.detalle_especies.map(e => [e.departamento, e.especie, e.subespecie||'-', e.cantidad_animales]);
    doc.autoTable({
        startY: M + 5,
        margin: { left: M, right: M },
        head: [['Depto', 'Especie', 'Subespecie', 'Cant.']],
        body: rowsEsp,
        theme: 'plain',
        columnStyles: { 0: { fontStyle: 'bold' } }
    });

    doc.save(`Reporte_GROBO_${Date.now()}.pdf`);
}

// Exportar un solo gráfico (botón en header de tarjeta)
function exportChartToPDF(canvasId, name) {
    const canvas = document.getElementById(canvasId);
    if (!window.jspdf) return;
    const pdf = new window.jspdf.jsPDF('landscape');
    const imgData = canvas.toDataURL("image/jpeg", 1.0);
    const props = pdf.getImageProperties(imgData);
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = (props.height * pdfW) / props.width;
    pdf.addImage(imgData, 'JPEG', 0, 10, pdfW, pdfH);
    pdf.save(`${name}.pdf`);
}