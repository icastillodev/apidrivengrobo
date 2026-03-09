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
let redRawData = null; // Datos agregados de la red (para modal)
let deptColors = {}; // Caché de colores para consistencia visual

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

    // 3. Eventos de Botones Principales
    document.getElementById('btn-update-stats').onclick = loadStats;
    
    // Exportaciones
    document.getElementById('btn-excel-stats').onclick = exportToExcel;
    document.getElementById('btn-pdf-stats').onclick = askExportPDFOptions; 

    // 4. Configuración de Gráficos (Cambio de tipo)
    const chartTypeSel = document.getElementById('chart-type');
    if(chartTypeSel) chartTypeSel.addEventListener('change', renderMainChart);

    const speciesTypeSel = document.getElementById('species-chart-type');
    if(speciesTypeSel) speciesTypeSel.addEventListener('change', renderSpeciesChart);

    // 5. Filtros Visuales (Checkboxes)
    document.querySelectorAll('.col-chk').forEach(chk => {
        chk.addEventListener('change', (e) => {
            toggleTableColumn(e.target.dataset.col, e.target.checked);
            renderMainChart(); // Redibujar gráfico al cambiar filtros
        });
    });

    // 6. Exponer funciones al ámbito global (para los onclick en HTML)
    window.viewChartFullScreen = openChartModal;
    window.exportChartToPDF = exportChartToPDF;

    // 7. Bloque "Estadísticas de la red" (solo si madre_grupo = 1)
    loadInstitutionFlags();
    const btnOpenRed = document.getElementById('btn-open-red-stats');
    if (btnOpenRed) btnOpenRed.onclick = openRedModal;
    const btnLoadRed = document.getElementById('btn-load-red-stats');
    if (btnLoadRed) btnLoadRed.onclick = loadStatsRed;
    const btnRedPdf = document.getElementById('btn-red-export-pdf');
    if (btnRedPdf) btnRedPdf.onclick = () => exportRedPDF();
    const btnRedExcel = document.getElementById('btn-red-export-excel');
    if (btnRedExcel) btnRedExcel.onclick = () => exportRedExcel();
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
            
            generateDeptColors(rawData.por_departamento);

            renderGlobalCards();
            renderAlojamientoTrazabilidadSection();
            renderSpeciesCounters();
            renderTable();
            renderTableOrganizacion();
            renderMainChart();
            renderSpeciesChart();
            renderDetailsSection();
            
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
        if (res.status === 'success' && res.data && res.data.madre_grupo == 1) {
            const card = document.getElementById('stats-red-card');
            if (card) card.style.display = 'block';
        }
    } catch (e) {
        console.warn('No se pudieron cargar flags de institución:', e);
    }
}

function openRedModal() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    const fromEl = document.getElementById('red-stats-from');
    const toEl = document.getElementById('red-stats-to');
    if (fromEl) fromEl.value = firstDay;
    if (toEl) toEl.value = today;
    redRawData = null;
    document.getElementById('red-stats-content').innerHTML = '';
    const modal = new bootstrap.Modal(document.getElementById('modal-stats-red'));
    modal.show();
}

async function loadStatsRed() {
    const from = document.getElementById('red-stats-from')?.value;
    const to = document.getElementById('red-stats-to')?.value;
    const btn = document.getElementById('btn-load-red-stats');
    const t = window.txt?.admin_estadisticas;
    if (btn) {
        btn.disabled = true;
        btn.textContent = t?.cargando || 'CARGANDO...';
    }
    try {
        const res = await API.request(`/stats/dashboard-red?from=${from}&to=${to}&v=${Date.now()}`);
        if (res.status === 'success') {
            redRawData = res.data;
            renderRedStatsContent();
            document.getElementById('btn-red-export-pdf').disabled = false;
            document.getElementById('btn-red-export-excel').disabled = false;
        } else {
            alert(res.message || 'Error al cargar estadísticas de la red.');
        }
    } catch (e) {
        console.error(e);
        alert('Error de conexión.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = t?.red_btn_cargar || 'Cargar';
        }
    }
}

function renderRedStatsContent() {
    const container = document.getElementById('red-stats-content');
    if (!container || !redRawData) return;
    const t = window.txt?.admin_estadisticas;
    const g = redRawData.globales || {};
    const labelSinOrg = window.txt?.generales?.sin_organizacion || '(Sin organización)';
    const deptRows = (redRawData.por_departamento || []).map(d => `
        <tr><td>${d.departamento || ''}</td><td class="text-center">${(parseInt(d.total_animales, 10) || 0).toLocaleString()}</td><td class="text-center">${(parseInt(d.total_reactivos, 10) || 0).toLocaleString()}</td><td class="text-center">${(parseInt(d.total_insumos, 10) || 0).toLocaleString()}</td><td class="text-center">${(parseInt(d.protocolos_aprobados, 10) || 0).toLocaleString()}</td><td class="text-center">–</td></tr>
    `).join('');
    const orgRows = (redRawData.por_organizacion || []).map(o => {
        const orgLabel = (o.organizacion === '(Sin organización)' || (o.organizacion && o.organizacion.endsWith(' – (Sin organización)')) ? (o.institucion ? o.institucion + ' – ' + labelSinOrg : labelSinOrg) : (o.organizacion || '–');
        return `<tr><td>${orgLabel}</td><td class="text-center">${(parseInt(o.total_animales, 10) || 0).toLocaleString()}</td><td class="text-center">${(parseInt(o.total_reactivos, 10) || 0).toLocaleString()}</td><td class="text-center">${(parseInt(o.total_insumos, 10) || 0).toLocaleString()}</td><td class="text-center">${(parseInt(o.protocolos_aprobados, 10) || 0).toLocaleString()}</td></tr>`;
    }).join('');
    container.innerHTML = `
        <div class="row g-2 mb-3">
            <div class="col"><div class="card p-2 border-0 bg-light text-center"><small class="text-muted fw-bold">${t?.box_animales || 'ANIMALES'}</small><h5 class="mb-0 fw-bold text-success">${(parseInt(g.total_animales, 10) || 0).toLocaleString()}</h5></div></div>
            <div class="col"><div class="card p-2 border-0 bg-light text-center"><small class="text-muted fw-bold">${t?.box_reactivos || 'REACTIVOS'}</small><h5 class="mb-0 fw-bold text-warning">${(parseInt(g.total_reactivos, 10) || 0).toLocaleString()}</h5></div></div>
            <div class="col"><div class="card p-2 border-0 bg-light text-center"><small class="text-muted fw-bold">${t?.box_insumos || 'INSUMOS'}</small><h5 class="mb-0 fw-bold text-secondary">${(parseInt(g.total_insumos, 10) || 0).toLocaleString()}</h5></div></div>
            <div class="col"><div class="card p-2 border-0 bg-light text-center"><small class="text-muted fw-bold">${t?.box_protocolos || 'PROT.'}</small><h5 class="mb-0 fw-bold text-primary">${(parseInt(g.total_protocolos, 10) || 0).toLocaleString()}</h5></div></div>
            <div class="col"><div class="card p-2 border-0 bg-light text-center"><small class="text-muted fw-bold">${t?.box_alojamientos || 'ALOJ.'}</small><h5 class="mb-0 fw-bold text-info">${(parseInt(g.total_alojamientos, 10) || 0).toLocaleString()}</h5></div></div>
        </div>
        <h6 class="fw-bold mb-2 text-secondary">${t?.desglose_depto ?? 'Por departamento'}</h6>
        <div class="table-responsive mb-4">
            <table class="table table-sm table-bordered">
                <thead class="table-light"><tr><th>${t?.th_departamento || 'Departamento'}</th><th class="text-center">${t?.th_animales || 'Anim.'}</th><th class="text-center">${t?.th_reactivos || 'Reac.'}</th><th class="text-center">${t?.th_insumos || 'Ins.'}</th><th class="text-center">${t?.th_prot_aprob || 'Prot.'}</th><th class="text-center">${t?.th_aloj_activos || 'Aloj.'}</th></tr></thead>
                <tbody>${deptRows || '<tr><td colspan="6" class="text-center text-muted">Sin datos</td></tr>'}</tbody>
            </table>
        </div>
        <h6 class="fw-bold mb-2 text-secondary">${t?.desglose_org ?? 'Por organización'}</h6>
        <div class="table-responsive">
            <table class="table table-sm table-bordered">
                <thead class="table-light"><tr><th>${t?.th_organizacion || 'Organización'}</th><th class="text-center">${t?.th_animales || 'Anim.'}</th><th class="text-center">${t?.th_reactivos || 'Reac.'}</th><th class="text-center">${t?.th_insumos || 'Ins.'}</th><th class="text-center">${t?.th_prot_aprob || 'Prot.'}</th></tr></thead>
                <tbody>${orgRows || '<tr><td colspan="5" class="text-center text-muted">Sin datos</td></tr>'}</tbody>
            </table>
        </div>
    `;
}

async function exportRedPDF() {
    if (!redRawData) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const t = window.txt?.generales;
    const lblTotal = t?.total ?? 'Total';
    let titleY = 15;
    const logoUrl = getPdfLogoImageUrl(localStorage.getItem('instLogoEnPdf'), localStorage.getItem('instLogo'));
    if (logoUrl) {
        try {
            const resp = await fetch(logoUrl);
            const blob = await resp.blob();
            const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
            doc.addImage(dataUrl, 'JPEG', 14, 5, 35, 12);
            titleY = 24;
        } catch (e) { console.warn('Logo no cargado:', e); }
    }
    doc.setFontSize(14);
    doc.text("ESTADÍSTICAS DE LA RED - GROBO", 14, titleY);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, titleY + 7);
    const g = redRawData.globales || {};
    doc.autoTable({
        startY: titleY + 14,
        head: [['Métrica', lblTotal, 'Métrica', lblTotal]],
        body: [['Animales', g.total_animales, 'Reactivos', g.total_reactivos], ['Insumos', g.total_insumos, 'Protocolos', g.total_protocolos], ['Alojamientos', g.total_alojamientos, '', '']],
        theme: 'grid',
        headStyles: { fillColor: [26, 93, 59] }
    });
    doc.save(`Reporte_Red_GROBO_${Date.now()}.pdf`);
}

function exportRedExcel() {
    if (!redRawData) return;
    const wb = XLSX.utils.book_new();
    const g = redRawData.globales || {};
    const hojaResumen = [
        ['Métrica', 'Total'],
        ['Animales', g.total_animales],
        ['Reactivos', g.total_reactivos],
        ['Insumos', g.total_insumos],
        ['Protocolos', g.total_protocolos],
        ['Alojamientos', g.total_alojamientos]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hojaResumen), 'Resumen_Red');
    const deptData = (redRawData.por_departamento || []).map(d => ({
        Departamento: d.departamento,
        Animales: d.total_animales,
        Reactivos: d.total_reactivos,
        Insumos: d.total_insumos,
        'Prot. Aprob': d.protocolos_aprobados
    }));
    if (deptData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(deptData), 'Por_Depto_Red');
    const orgData = (redRawData.por_organizacion || []).map(o => ({
        Organización: o.organizacion || '',
        Animales: o.total_animales,
        Reactivos: o.total_reactivos,
        Insumos: o.total_insumos,
        'Prot. Aprob': o.protocolos_aprobados
    }));
    if (orgData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orgData), 'Por_Org_Red');
    XLSX.writeFile(wb, `Reporte_Red_GROBO_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ==========================================
// UTILIDADES
// ==========================================

function generateDeptColors(deptos) {
    deptColors = {};
    const palette = [
        '#1a5d3b', '#0d6efd', '#ffc107', '#dc3545', '#6610f2', 
        '#fd7e14', '#20c997', '#0dcaf0', '#6c757d', '#d63384', '#198754'
    ];
    deptos.forEach((d, i) => {
        deptColors[d.departamento] = palette[i % palette.length];
    });
}

function setSafeText(id, val) {
    const el = document.getElementById(id);
    if(el) el.innerText = parseInt(val).toLocaleString('es-UY');
}

// ==========================================
// RENDERIZADO DE COMPONENTES
// ==========================================

function renderGlobalCards() {
    if (!rawData || !rawData.globales) return;
    const g = rawData.globales;
    setSafeText('box-animales', g.total_animales);
    setSafeText('box-reactivos', g.total_reactivos);
    setSafeText('box-insumos', g.total_insumos);
    setSafeText('box-protocolos', g.total_protocolos);
    setSafeText('box-alojamientos', g.total_alojamientos);
}

function renderAlojamientoTrazabilidadSection() {
    const container = document.getElementById('alojamiento-trazabilidad-section');
    if (!container || !rawData || !rawData.alojamiento_trazabilidad) return;
    const at = rawData.alojamiento_trazabilidad;

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

function renderSpeciesCounters() {
    const container = document.getElementById('species-counters-container');
    if (!container || !rawData.ranking_especies) return;
    container.innerHTML = '';

    const top4 = rawData.ranking_especies.slice(0, 4);
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

function renderTable() {
    const tbody = document.getElementById('table-body-stats');
    if (!tbody) return;

    tbody.innerHTML = rawData.por_departamento.map(d => {
        const alojObj = rawData.alojamientos_activos.find(a => a.departamento === d.departamento);
        const cantAloj = alojObj ? alojObj.cantidad : 0;
        const badgeClass = cantAloj > 0 ? 'bg-info text-dark' : 'bg-light text-muted border';

        return `
            <tr>
                <td class="fw-bold text-success small py-3 text-uppercase">${d.departamento}</td>
                <td class="text-center col-val-1 fw-bold">${d.total_animales}</td>
                <td class="text-center col-val-2 text-muted">${d.total_reactivos}</td>
                <td class="text-center col-val-3 text-muted">${d.total_insumos}</td>
                <td class="text-center col-val-4 text-primary">${d.protocolos_aprobados}</td>
                <td class="text-center col-val-5"><span class="badge ${badgeClass} rounded-pill px-3">${cantAloj}</span></td>
            </tr>`;
    }).join('');

    // Restaurar visibilidad según checkboxes
    document.querySelectorAll('.col-chk').forEach(chk => {
        toggleTableColumn(chk.dataset.col, chk.checked);
    });
}

function renderTableOrganizacion() {
    const tbody = document.getElementById('table-body-org');
    if (!tbody || !rawData || !rawData.por_organizacion) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">–</td></tr>';
        return;
    }
    const t = window.txt?.generales;
    const labelSinOrg = t?.sin_organizacion || '(Sin organización)';
    tbody.innerHTML = rawData.por_organizacion.map(o => {
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

function toggleTableColumn(colNum, isVisible) {
    const mode = isVisible ? '' : 'none';
    // Ocultar celdas del cuerpo
    document.querySelectorAll(`.col-val-${colNum}`).forEach(el => el.style.display = mode);
    
    // Ocultar encabezado (TH)
    const table = document.getElementById('main-stats-table');
    if(table && table.tHead && table.tHead.rows[0]) {
        // Asumiendo estructura: Depto (0), Ani(1), Rea(2)...
        const th = table.tHead.rows[0].cells[parseInt(colNum)];
        if(th) th.style.display = mode;
    }
}

// ==========================================
// GRÁFICOS (CHART.JS)
// ==========================================

function renderMainChart() {
    const ctx = document.getElementById('chart-canvas').getContext('2d');
    const type = document.getElementById('chart-type')?.value || 'bar';
    const ChartLib = window.Chart;

    if (charts['main']) charts['main'].destroy();

    const labels = rawData.por_departamento.map(d => d.departamento);
    const datasets = [];
    
    // Función helper para ver si un checkbox está activo
    const isChecked = (sel) => document.querySelector(sel)?.checked;
    
    // Lógica de colores:
    // Si solo hay 1 métrica (ej: Animales), coloreamos por Departamento.
    // Si hay >1 métrica (Comparación), coloreamos por Métrica.
    const activeMetricsCount = document.querySelectorAll('.col-chk:checked').length;
    const useDeptColors = (activeMetricsCount === 1 && isChecked('#chk-ani'));

    if (isChecked('#chk-ani')) {
        datasets.push({ 
            label: 'Animales', 
            data: rawData.por_departamento.map(d => d.total_animales), 
            backgroundColor: useDeptColors ? labels.map(l => deptColors[l]) : '#198754' 
        });
    }
    if (isChecked('#chk-rea')) {
        datasets.push({ label: 'Reactivos', data: rawData.por_departamento.map(d => d.total_reactivos), backgroundColor: '#ffc107' });
    }
    if (isChecked('#chk-ins')) {
        datasets.push({ label: 'Insumos', data: rawData.por_departamento.map(d => d.total_insumos), backgroundColor: '#6c757d' });
    }
    if (isChecked('#chk-pro')) {
        datasets.push({ label: 'Protocolos', data: rawData.por_departamento.map(d => d.protocolos_aprobados), backgroundColor: '#0d6efd', hidden: true });
    }
    if (isChecked('#chk-alo')) {
        const dataAloj = rawData.por_departamento.map(d => rawData.alojamientos_activos.find(a=>a.departamento===d.departamento)?.cantidad||0);
        datasets.push({ label: 'Alojamientos', data: dataAloj, backgroundColor: '#0dcaf0' });
    }

    charts['main'] = new ChartLib(ctx, {
        type: type,
        data: { labels, datasets },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
}

function renderSpeciesChart() {
    const ctx = document.getElementById('chart-species').getContext('2d');
    const type = document.getElementById('species-chart-type')?.value || 'bar';
    const ChartLib = window.Chart;

    if (charts['species']) charts['species'].destroy();

    const data = rawData.ranking_especies; // Trae TODAS las especies
    const labels = data.map(e => e.etiqueta_especie);
    const values = data.map(e => e.cantidad);

    // Altura dinámica: Si es lista (bar), crece según cantidad de especies
    const container = document.getElementById('species-chart-container');
    if (type === 'bar') {
        const h = Math.max(400, labels.length * 25);
        container.style.height = `${h}px`;
    } else {
        container.style.height = '400px';
    }

    // Colores aleatorios para torta
    const pieColors = labels.map((_, i) => `hsl(${(i * 45) % 360}, 65%, 45%)`);

    charts['species'] = new ChartLib(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: 'Cantidad',
                data: values,
                backgroundColor: type === 'pie' ? pieColors : '#1a5d3b',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: type === 'bar' ? 'y' : 'x', // Barras horizontales
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// ==========================================
// DETALLES INFERIORES
// ==========================================

function renderDetailsSection() {
    const container = document.getElementById('details-container');
    container.innerHTML = '';
    const deptos = rawData.por_departamento.map(d => d.departamento);

    deptos.forEach(depto => {
        const especies = rawData.detalle_especies.filter(x => x.departamento === depto);
        const protocolos = rawData.detalle_protocolos.filter(x => x.departamento === depto);

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

    let titleY = 15;
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
            doc.addImage(dataUrl, 'JPEG', 14, 5, 35, 12);
            titleY = 24;
        } catch (e) {
            console.warn('Logo no cargado para PDF:', e);
        }
    }

    // Título
    doc.setFontSize(16);
    doc.text("REPORTE ESTADÍSTICO - GROBO", 14, titleY);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, titleY + 7);

    // Tabla Resumen
    const g = rawData.globales;
    const t = window.txt?.generales;
    const lblTotal = t?.total ?? 'Total';
    doc.autoTable({
        startY: titleY + 13,
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
    if (currentY + 30 > 280) { doc.addPage(); currentY = 15; }
    doc.text("Desglose por Departamento", 14, currentY);
    
    const rowsDept = rawData.por_departamento.map(d => [d.departamento, d.total_animales, d.total_reactivos, d.total_insumos, d.protocolos_aprobados]);
    doc.autoTable({
        startY: currentY + 5,
        head: [['Departamento', 'Anim.', 'Reac.', 'Ins.', 'Prot.']],
        body: rowsDept,
        theme: 'striped'
    });

    // Tabla Especies
    doc.addPage();
    doc.text("Detalle de Especies Utilizadas", 14, 15);
    const rowsEsp = rawData.detalle_especies.map(e => [e.departamento, e.especie, e.subespecie||'-', e.cantidad_animales]);
    doc.autoTable({
        startY: 20,
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