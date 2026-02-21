/**
 * GECKO STATISTICS ENGINE - GROBO 2026
 * Desarrollado para: Gecko Devs (Tojito)
 * Versión: Final (PDF Rápido + Excel Multi-hoja + UX Mejorada)
 */

let charts = {};
let rawData = null;
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
}

/**
 * Carga de datos desde la API
 */
async function loadStats() {
    const from = document.getElementById('stats-from')?.value;
    const to = document.getElementById('stats-to')?.value;
    const instId = localStorage.getItem('instId') || '1';
    
    const btn = document.getElementById('btn-update-stats');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> CARGANDO...`;
    }

    try {
        // ✅ USANDO EL MOTOR SEGURO API.request
        const res = await API.request(`/stats/dashboard?inst=${instId}&from=${from}&to=${to}&v=${Date.now()}`);

        if (res.status === 'success') {
            rawData = res.data;
            document.getElementById('stats-content').style.display = 'block';
            
            generateDeptColors(rawData.por_departamento);

            renderGlobalCards();
            renderSpeciesCounters();
            renderTable();
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
            btn.innerHTML = 'ACTUALIZAR';
        }
    }
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

    // Título
    doc.setFontSize(16);
    doc.text("REPORTE ESTADÍSTICO - GROBO", 14, 15);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 22);

    // Tabla Resumen
    const g = rawData.globales;
    doc.autoTable({
        startY: 28,
        head: [['Métrica', 'Total', 'Métrica', 'Total']],
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