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
/** Vista red por institución: '' = toda la red (nombre igual a `institucion` en API). */
let redInstitutionFilter = '';

/** Alineado con StatisticsController::STATS_MAX_RANGE_DAYS (evita peticiones que suelen provocar 504). */
const STATS_MAX_RANGE_DAYS = 400;
const STATS_API_TIMEOUT_MS = 120000;

/** Colores fijos por métrica (alineados con filtros / tarjetas). */
const STATS_METRIC_COLORS = {
    animales: '#198754',
    reactivos: '#ffc107',
    insumos: '#6c757d',
    protocolos: '#0d6efd',
    alojamientos: '#0dcaf0'
};

function ensureGroboStatsPlugins() {
    const ChartLib = typeof window !== 'undefined' ? window.Chart : null;
    if (!ChartLib || ChartLib.__groboStatsBarPluginReg) return;
    ChartLib.__groboStatsBarPluginReg = true;
    ChartLib.register({
        id: 'groboStatsBarValues',
        afterDatasetsDraw(chart) {
            const en = chart.options.plugins?.groboStatsBarValues?.enabled;
            if (!en || chart.config.type !== 'bar') return;
            const ctx = chart.ctx;
            const indexAxis = chart.options.indexAxis;
            chart.data.datasets.forEach((dataset, di) => {
                const meta = chart.getDatasetMeta(di);
                if (meta.hidden) return;
                meta.data.forEach((element, i) => {
                    const raw = dataset.data[i];
                    const num = typeof raw === 'number' ? raw : parseFloat(raw);
                    if (!Number.isFinite(num) || num === 0) return;
                    const { x, y, base } = element.getProps(['x', 'y', 'base'], true);
                    ctx.save();
                    ctx.font = '600 11px system-ui,-apple-system,"Segoe UI",sans-serif';
                    ctx.fillStyle = chart.options.plugins?.groboStatsBarValues?.color || '#212529';
                    if (indexAxis === 'y') {
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'middle';
                        const tx = Math.min(x + 6, chart.chartArea.right - 2);
                        ctx.fillText(String(Math.round(num)), tx, y);
                    } else {
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        const ty = Math.min(y, base) - 4;
                        ctx.fillText(String(Math.round(num)), x, ty);
                    }
                    ctx.restore();
                });
            });
        }
    });
}

function txStats() {
    return window.txt?.admin_estadisticas || {};
}

function validateStatsDatesForRequest(from, to) {
    const t = txStats();
    if (!from || !to) {
        return { ok: false, message: t.err_fechas_requeridas || 'Indique fechas desde y hasta.' };
    }
    const re = /^\d{4}-\d{2}-\d{2}$/;
    if (!re.test(String(from)) || !re.test(String(to))) {
        return { ok: false, message: t.err_fechas_invalidas || 'Formato de fecha inválido (AAAA-MM-DD).' };
    }
    const d0 = new Date(`${from}T12:00:00`);
    const d1 = new Date(`${to}T12:00:00`);
    if (Number.isNaN(d0.getTime()) || Number.isNaN(d1.getTime())) {
        return { ok: false, message: t.err_fechas_invalidas || 'Formato de fecha inválido (AAAA-MM-DD).' };
    }
    let a = d0.getTime();
    let b = d1.getTime();
    if (a > b) {
        const tmp = a;
        a = b;
        b = tmp;
    }
    const days = Math.ceil((b - a) / 86400000);
    if (days > STATS_MAX_RANGE_DAYS) {
        const tpl = t.err_rango_muy_largo || 'Reduzca el periodo: el máximo es {d} días para evitar timeouts.';
        return { ok: false, message: tpl.replace(/\{d\}/g, String(STATS_MAX_RANGE_DAYS)) };
    }
    return { ok: true };
}

function extractRedInstitutionNames(raw) {
    const rows = raw?.por_departamento || [];
    const set = new Set();
    rows.forEach((r) => {
        const n = String(r.institucion || '').trim();
        if (n) set.add(n);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function buildRankingEspeciesFromDetalle(detalle) {
    const m = new Map();
    (detalle || []).forEach((e) => {
        const sub = e.subespecie != null && String(e.subespecie).trim() !== '' ? e.subespecie : 'Gral';
        const label = `${e.especie || ''} (${sub})`.trim();
        m.set(label, (m.get(label) || 0) + (Number(e.cantidad_animales) || 0));
    });
    return [...m.entries()]
        .map(([etiqueta_especie, cantidad]) => ({ etiqueta_especie, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad);
}

function buildRankingCepasFromDetalle(detalle) {
    const m = new Map();
    (detalle || []).forEach((c) => {
        const k = String(c.cepa ?? '').trim() || '—';
        m.set(k, (m.get(k) || 0) + (Number(c.cantidad_animales) || 0));
    });
    return [...m.entries()]
        .map(([cepa, cantidad_animales]) => ({ cepa, cantidad_animales }))
        .sort((a, b) => b.cantidad_animales - a.cantidad_animales);
}

function buildFilteredRedView(raw, instFilter) {
    const prefix = `${instFilter} --> `;
    const porDepartamento = (raw.por_departamento || []).filter((d) => String(d.institucion || '').trim() === instFilter);
    const deptKeys = new Set(porDepartamento.map((d) => d.departamento));
    const alojamientos_activos = (raw.alojamientos_activos || []).filter((a) => deptKeys.has(a.departamento));
    const porOrganizacion = (raw.por_organizacion || []).filter((o) => String(o.organizacion || '').startsWith(prefix));
    const detalle_especies = (raw.detalle_especies || []).filter((e) => String(e.departamento || '').startsWith(prefix));
    const detalle_protocolos = (raw.detalle_protocolos || []).filter((p) => String(p.departamento || '').startsWith(prefix));
    const detalle_cepas = (raw.detalle_cepas || []).filter((c) => String(c.departamento || '').startsWith(prefix));

    let sumAnim = 0;
    let sumRea = 0;
    let sumIns = 0;
    let sumProt = 0;
    let sumAloj = 0;
    porDepartamento.forEach((d) => {
        sumAnim += Number(d.total_animales) || 0;
        sumRea += Number(d.total_reactivos) || 0;
        sumIns += Number(d.total_insumos) || 0;
        sumProt += Number(d.protocolos_aprobados) || 0;
        const al = alojamientos_activos.find((a) => a.departamento === d.departamento);
        sumAloj += al ? Number(al.cantidad) || 0 : 0;
    });

    const globales = {
        total_animales: sumAnim,
        total_reactivos: sumRea,
        total_insumos: sumIns,
        total_protocolos: sumProt,
        total_alojamientos: sumAloj
    };

    return {
        ...raw,
        globales,
        por_departamento: porDepartamento,
        por_organizacion: porOrganizacion,
        alojamientos_activos,
        detalle_especies,
        detalle_protocolos,
        detalle_cepas,
        ranking_especies: buildRankingEspeciesFromDetalle(detalle_especies),
        ranking_cepas: buildRankingCepasFromDetalle(detalle_cepas),
        categorias_formularios: [],
        derivacion_pedidos: { activo: false },
        alojamiento_trazabilidad: null
    };
}

function getRedStatsPayload() {
    if (!redRawData) return null;
    if (!redInstitutionFilter) return redRawData;
    return buildFilteredRedView(redRawData, redInstitutionFilter);
}

function statsDataForScope(scope) {
    return scope === 'red' ? getRedStatsPayload() : rawData;
}

function formatRedDeptLabel(departamento) {
    if (!redInstitutionFilter || !departamento) return departamento;
    const p = `${redInstitutionFilter} --> `;
    const s = String(departamento);
    return s.startsWith(p) ? s.slice(p.length) : s;
}

function refreshRedFilteredViews() {
    if (!redRawData) return;
    generateDeptColors(statsDataForScope('red').por_departamento || [], 'red');
    renderGlobalCards('red');
    renderDerivacionPedidosSection('red');
    renderAlojamientoTrazabilidadSection('red');
    renderSpeciesCounters('red');
    renderStrainCounters('red');
    renderCategoriasSection('red');
    renderTable('red');
    renderTableOrganizacion('red');
    renderMainChart('red');
    renderSpeciesChart('red');
    renderDetailsSection('red');
}

function renderRedInstitutionTabs() {
    const wrap = document.getElementById('red-institution-tabs-wrap');
    if (!wrap || !redRawData) return;
    const names = extractRedInstitutionNames(redRawData);
    const t = txStats();
    const hint = document.getElementById('red-inst-filter-hint');
    if (names.length <= 1) {
        wrap.classList.add('d-none');
        wrap.innerHTML = '';
        if (hint) {
            hint.classList.add('d-none');
            hint.textContent = '';
        }
        return;
    }
    wrap.classList.remove('d-none');
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    const allLbl = t.red_tab_all || 'Toda la red';
    const secLbl = t.red_tabs_inst_label || 'Institución';
    let html = `<div class="small fw-bold text-muted mb-2"><i class="bi bi-building"></i> ${esc(secLbl)}</div><div class="btn-group btn-group-sm flex-wrap gap-1" role="group">`;
    html += `<button type="button" class="btn btn-sm ${!redInstitutionFilter ? 'btn-success' : 'btn-outline-success'} fw-bold" data-red-all="1">${esc(allLbl)}</button>`;
    names.forEach((name) => {
        const active = redInstitutionFilter === name;
        html += `<button type="button" class="btn btn-sm ${active ? 'btn-success' : 'btn-outline-secondary'} fw-bold" data-red-inst="${encodeURIComponent(name)}">${esc(name)}</button>`;
    });
    html += '</div>';
    wrap.innerHTML = html;
    wrap.onclick = (e) => {
        const btn = e.target.closest('button[data-red-all], button[data-red-inst]');
        if (!btn || !wrap.contains(btn)) return;
        if (btn.hasAttribute('data-red-all')) redInstitutionFilter = '';
        else redInstitutionFilter = decodeURIComponent(btn.getAttribute('data-red-inst') || '');
        renderRedInstitutionTabs();
        refreshRedFilteredViews();
    };
    if (hint) {
        if (redInstitutionFilter) {
            hint.classList.remove('d-none');
            const tpl = t.red_filter_hint || '';
            hint.textContent = tpl.replace(/\{inst\}/g, redInstitutionFilter);
        } else {
            hint.classList.add('d-none');
            hint.textContent = '';
        }
    }
}

export async function initStatsPage() {
    console.log("GeckoStats: Inicializando...");
    ensureGroboStatsPlugins();

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

    // Carga inicial de la pestaña Sede (antes había que pulsar Actualizar a ciegas).
    await loadStats();
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
    const t = txStats();
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${t?.cargando || window.txt?.generales?.msg_cargando || '…'}`;
    }

    const vr = validateStatsDatesForRequest(from, to);
    if (!vr.ok) {
        alert(vr.message);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = t?.btn_actualizar || 'ACTUALIZAR';
        }
        return;
    }

    const ac = new AbortController();
    const toid = setTimeout(() => ac.abort(), STATS_API_TIMEOUT_MS);

    try {
        const res = await API.request(
            `/stats/dashboard?inst=${instId}&from=${from}&to=${to}&v=${Date.now()}`,
            'GET',
            null,
            { signal: ac.signal }
        );

        if (res.errorKind === 'timeout' || res.message === 'STATS_REQUEST_TIMEOUT') {
            alert(t.err_timeout_cliente || 'La consulta tardó demasiado. Acorte el rango de fechas o intente de nuevo.');
            return;
        }
        if (res.status === 'success') {
            rawData = res.data;
            document.getElementById('stats-content').style.display = 'block';
            
            generateDeptColors(rawData.por_departamento, 'sede');

            renderGlobalCards('sede');
            renderDerivacionPedidosSection('sede');
            renderAlojamientoTrazabilidadSection('sede');
            renderSpeciesCounters('sede');
            renderStrainCounters('sede');
            renderCategoriasSection('sede');
            renderTable('sede');
            renderTableOrganizacion('sede');
            renderMainChart('sede');
            renderSpeciesChart('sede');
            renderDetailsSection('sede');
            
        } else {
            alert(res.message || t?.err_respuesta || 'Error en la respuesta.');
        }
    } catch (e) {
        console.error("Error de red/servidor:", e);
        alert(t?.err_conexion || 'Error de conexión con el servidor.');
    } finally {
        clearTimeout(toid);
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
        const d = res.data || {};
        const mg = Number(d.madre_grupo ?? d.MadreGrupo ?? 0);
        const nRed = Number(d.instituciones_en_red ?? 0);
        const redNombre = String(d.red ?? d.dependencia_grupo ?? d.DependenciaInstitucion ?? '').trim();
        const puedeRed = mg === 1 && (nRed > 1 || redNombre !== '');
        if (res.status === 'success' && res.data && puedeRed) {
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
    const t = txStats();
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${t?.cargando || window.txt?.generales?.msg_cargando || '…'}`;
    }

    const vr = validateStatsDatesForRequest(from, to);
    if (!vr.ok) {
        alert(vr.message);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = t?.btn_actualizar || 'ACTUALIZAR';
        }
        return;
    }

    const ac = new AbortController();
    const toid = setTimeout(() => ac.abort(), STATS_API_TIMEOUT_MS);

    try {
        const res = await API.request(
            `/stats/dashboard-red?from=${from}&to=${to}&v=${Date.now()}`,
            'GET',
            null,
            { signal: ac.signal }
        );
        if (res.errorKind === 'timeout' || res.message === 'STATS_REQUEST_TIMEOUT') {
            alert(t.err_timeout_cliente || 'La consulta tardó demasiado. Acorte el rango de fechas o intente de nuevo.');
            return;
        }
        if (res.status === 'success') {
            redRawData = res.data;
            redInstitutionFilter = '';
            redDataLoaded = true;
            const pane = document.getElementById('stats-content-red');
            if (pane) pane.style.display = 'block';
            generateDeptColors(redRawData.por_departamento || [], 'red');
            renderGlobalCards('red');
            renderDerivacionPedidosSection('red');
            renderAlojamientoTrazabilidadSection('red');
            renderSpeciesCounters('red');
            renderStrainCounters('red');
            renderCategoriasSection('red');
            renderTable('red');
            renderTableOrganizacion('red');
            renderMainChart('red');
            renderSpeciesChart('red');
            renderDetailsSection('red');
            renderRedInstitutionTabs();
        } else {
            alert(res.message || t?.red_sin_permiso || 'Error al cargar estadísticas de la red.');
        }
    } catch (e) {
        console.error(e);
        alert(t?.err_conexion || 'Error de conexión.');
    } finally {
        clearTimeout(toid);
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
    const rv = getRedStatsPayload();
    const wb = XLSX.utils.book_new();
    const g = rv.globales;
    const globalData = [
        ['METRICA', 'TOTAL RED'],
        ['Animales', g.total_animales],
        ['Reactivos', g.total_reactivos],
        ['Insumos', g.total_insumos],
        ['Protocolos', g.total_protocolos],
        ['Alojamientos', g.total_alojamientos]
    ];
    if (rv.alojamiento_trazabilidad) {
        const at = rv.alojamiento_trazabilidad;
        globalData.push(['Historias (aloj.)', at.total_historias], ['Cajas físicas', at.total_cajas], ['Obs. trazabilidad', at.total_observaciones_trazabilidad]);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(globalData), 'Resumen_Red');
    const deptData = (rv.por_departamento || []).map(d => ({
        Departamento: d.departamento,
        Animales: d.total_animales,
        Reactivos: d.total_reactivos,
        Insumos: d.total_insumos,
        Protocolos: d.protocolos_aprobados
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(deptData), 'Departamentos_Red');
    const espData = (rv.detalle_especies || []).map(e => ({
        Departamento: e.departamento,
        Especie: e.especie,
        Subespecie: e.subespecie,
        Cantidad: e.cantidad_animales
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(espData), 'Detalle_Especies_Red');
    const protData = (rv.detalle_protocolos || []).map(p => ({
        Departamento: p.departamento,
        Protocolo: p.nprotA,
        Titulo: p.tituloA,
        Vence: p.FechaFinProtA,
        Estado: new Date(p.FechaFinProtA) < new Date() ? 'VENCIDO' : 'VIGENTE'
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(protData), 'Protocolos_Red');
    const orgData = (rv.por_organizacion || []).map(o => ({
        Organización: o.organizacion || '',
        Animales: o.total_animales,
        Reactivos: o.total_reactivos,
        Insumos: o.total_insumos,
        'Prot. Aprob': o.protocolos_aprobados
    }));
    if (orgData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orgData), 'Organizacion_Red');
    if (rv.alojamiento_trazabilidad?.por_especie?.length) {
        const atEsp = rv.alojamiento_trazabilidad.por_especie.map(e => ({
            Especie: e.especie,
            Historias: e.historias,
            Tramos: e.tramos
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(atEsp), 'Aloj_por_especie_Red');
    }

    if (Array.isArray(rv.categorias_formularios) && rv.categorias_formularios.length) {
        const cat = rv.categorias_formularios.map(c => ({
            Categoria: c.categoria,
            Cantidad: c.cantidad
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cat), 'Categorias_Red');
    }
    if (Array.isArray(rv.ranking_cepas) && rv.ranking_cepas.length) {
        const cep = rv.ranking_cepas.map(c => ({
            Cepa: c.cepa,
            Cantidad: c.cantidad_animales
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cep), 'Top_Cepas_Red');
    }
    if (Array.isArray(rv.detalle_cepas) && rv.detalle_cepas.length) {
        const det = rv.detalle_cepas.map(c => ({
            Departamento: c.departamento,
            Cepa: c.cepa,
            Cantidad: c.cantidad_animales
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(det), 'Detalle_Cepas_Red');
    }
    const rank = (rv.ranking_especies || []).map(r => ({ Especie: r.etiqueta_especie, Cantidad: r.cantidad }));
    if (rank.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rank), 'Ranking_especies_Red');

    statsAppendDerivacionPedidosSheet(wb, rv, 'Deriv_pedidos_Red');

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
    const rv = getRedStatsPayload();
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
    const te = txStats();
    const tTit = te.red_pdf_doc_title || 'REPORTE RED — GROBO';
    doc.setFontSize(16);
    doc.text(tTit, M, titleY);
    doc.setFontSize(10);
    const metaRed = buildStatsPdfPeriodMeta();
    let yMetaR = titleY + 7;
    metaRed.lines.forEach((line) => {
        doc.text(line, M, yMetaR);
        yMetaR += 7;
    });
    const tableStartRed = yMetaR + 6;
    const gen = window.txt?.generales || {};
    const lblTotal = gen.total ?? 'Total';
    doc.autoTable({
        startY: tableStartRed,
        margin: { left: M, right: M },
        head: [[te.pdf_col_metrica || 'Métrica', lblTotal, te.pdf_col_metrica || 'Métrica', lblTotal]],
        body: buildStatsPdfSummaryBody(rv),
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
                currentY = pdfEnsureSpace(doc, currentY, h + 20);
                doc.text(te.red_pdf_graf_depto || 'Gráfico por departamento (red)', M, currentY);
                doc.addImage(imgData, 'JPEG', 15, currentY + 5, 180, h);
                currentY += h + 15;
            } catch (e) {
                console.warn(e);
            }
        }
        const canvasSp = document.getElementById('red-chart-species');
        if (canvasSp) {
            try {
                const imgData = canvasSp.toDataURL('image/jpeg', 0.75);
                const props = doc.getImageProperties(imgData);
                const h = Math.min(100, (props.height * 170) / props.width);
                currentY = pdfEnsureSpace(doc, currentY, h + 18);
                doc.text(te.red_pdf_graf_esp || 'Gráfico especies (red)', M, currentY);
                doc.addImage(imgData, 'JPEG', 15, currentY + 5, 170, h);
                currentY += h + 12;
            } catch (e) {
                console.warn(e);
            }
        }
    }

    currentY = pdfEnsureSpace(doc, currentY, 35);
    statsPdfAppendExtendedTables(doc, rv, M, currentY);
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
    const data = statsDataForScope(scope);
    if (!data || !data.globales) return;
    const p = scope === 'red' ? 'red-' : '';
    const g = data.globales;
    setSafeText(`${p}box-animales`, g.total_animales);
    setSafeText(`${p}box-reactivos`, g.total_reactivos);
    setSafeText(`${p}box-insumos`, g.total_insumos);
    setSafeText(`${p}box-protocolos`, g.total_protocolos);
    setSafeText(`${p}box-alojamientos`, g.total_alojamientos);
}

function renderDerivacionPedidosSection(scope) {
    const containerId = scope === 'red' ? 'red-stats-derivacion-pedidos' : 'stats-derivacion-pedidos';
    const container = document.getElementById(containerId);
    const data = statsDataForScope(scope);
    const t = txStats();
    if (!container || !data) return;
    const dp = data.derivacion_pedidos;
    if (!dp || !dp.activo) {
        container.innerHTML = '';
        return;
    }
    const prop = dp.propios || {};
    const recibidos = Array.isArray(dp.recibidos_por_origen) ? dp.recibidos_por_origen : [];
    const fmtInt = (v) => Math.round(Number(v) || 0).toLocaleString('es-UY');
    const fmtDec = (v) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return '0';
        return (Math.abs(n - Math.round(n)) < 1e-6 ? Math.round(n) : n).toLocaleString('es-UY', { maximumFractionDigits: 2 });
    };
    const rows = recibidos.length
        ? recibidos.map((r) => {
            const nombre = (r.institucion_origen || '').trim() || String(r.id_institucion_origen ?? '');
            return `<tr><td class="fw-bold">${nombre}</td><td class="text-center">${fmtDec(r.total_animales)}</td><td class="text-center">${fmtInt(r.total_reactivos)}</td><td class="text-center">${fmtInt(r.total_insumos)}</td></tr>`;
        }).join('')
        : `<tr><td colspan="4" class="text-muted small text-center py-3">${t.deriv_sin_recibidos || '—'}</td></tr>`;

    container.innerHTML = `
        <h6 class="fw-bold mb-3 text-secondary border-bottom pb-2">
            <i class="bi bi-arrow-left-right"></i> ${t.seccion_deriv_pedidos || 'Pedidos: propios y derivados'}
        </h6>
        <div class="row g-3">
            <div class="col-lg-5">
                <div class="card border-0 shadow-sm h-100 border-start border-3 border-success">
                    <div class="card-header bg-white fw-bold small">${t.deriv_propios_title || 'Pedidos propios'}</div>
                    <div class="card-body py-3">
                        <p class="small text-muted mb-3">${t.deriv_propios_desc || ''}</p>
                        <div class="row g-2 text-center">
                            <div class="col-4">
                                <div class="small text-muted fw-bold">${t.th_animales || 'Animales'}</div>
                                <div class="fs-5 fw-bold text-success">${fmtDec(prop.total_animales)}</div>
                            </div>
                            <div class="col-4">
                                <div class="small text-muted fw-bold">${t.th_reactivos || 'Reactivos'}</div>
                                <div class="fs-5 fw-bold text-warning">${fmtInt(prop.total_reactivos)}</div>
                            </div>
                            <div class="col-4">
                                <div class="small text-muted fw-bold">${t.th_insumos || 'Insumos'}</div>
                                <div class="fs-5 fw-bold text-secondary">${fmtInt(prop.total_insumos)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-lg-7">
                <div class="card border-0 shadow-sm h-100 border-start border-3 border-primary">
                    <div class="card-header bg-white fw-bold small">${t.deriv_recibidos_title || 'Recibidos por origen'}</div>
                    <div class="card-body p-0">
                        <p class="small text-muted px-3 pt-3 mb-0">${t.deriv_recibidos_desc || ''}</p>
                        <div class="table-responsive">
                            <table class="table table-sm table-hover align-middle mb-0" style="font-size: 12px;">
                                <thead class="table-light text-uppercase">
                                    <tr>
                                        <th>${t.deriv_th_inst_origen || 'Origen'}</th>
                                        <th class="text-center">${t.th_animales || ''}</th>
                                        <th class="text-center">${t.th_reactivos || ''}</th>
                                        <th class="text-center">${t.th_insumos || ''}</th>
                                    </tr>
                                </thead>
                                <tbody>${rows}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}

function renderAlojamientoTrazabilidadSection(scope) {
    const containerId = scope === 'red' ? 'red-alojamiento-trazabilidad-section' : 'alojamiento-trazabilidad-section';
    const container = document.getElementById(containerId);
    const data = statsDataForScope(scope);
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
    const data = statsDataForScope(scope);
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
    const data = statsDataForScope(scope);
    if (!tbody || !data?.por_departamento) return;

    const colCls = scope === 'red' ? 'red-col-val' : 'col-val';
    tbody.innerHTML = data.por_departamento.map(d => {
        const alojObj = (data.alojamientos_activos || []).find(a => a.departamento === d.departamento);
        const cantAloj = alojObj ? alojObj.cantidad : 0;
        const badgeClass = cantAloj > 0 ? 'bg-info text-dark' : 'bg-light text-muted border';

        return `
            <tr>
                <td class="fw-bold text-success small py-3 text-uppercase">${scope === 'red' ? formatRedDeptLabel(d.departamento) : d.departamento}</td>
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
    const data = statsDataForScope(scope);
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

function sumMetricArr(arr) {
    return arr.reduce((a, b) => a + (Number(b) || 0), 0);
}

function renderMainChart(scope = 'sede') {
    ensureGroboStatsPlugins();
    const isRed = scope === 'red';
    const canvasId = isRed ? 'red-chart-canvas' : 'chart-canvas';
    const chartKey = isRed ? 'mainRed' : 'main';
    const typeEl = document.getElementById(isRed ? 'red-chart-type' : 'chart-type');
    const canvas = document.getElementById(canvasId);
    const data = statsDataForScope(isRed ? 'red' : 'sede');
    if (!canvas || !data?.por_departamento) return;

    const ctx = canvas.getContext('2d');
    const type = typeEl?.value || 'bar';
    const ChartLib = window.Chart;
    const te = txStats();
    const MC = STATS_METRIC_COLORS;

    if (charts[chartKey]) charts[chartKey].destroy();

    const labels = data.por_departamento.map((d) => (isRed ? formatRedDeptLabel(d.departamento) : d.departamento));
    const datasets = [];
    const deptColorMap = isRed ? deptColorsRed : deptColorsSede;

    const chkPrefix = isRed ? 'red-chk-' : 'chk-';
    const activeMetricsCount = ['ani', 'rea', 'ins', 'pro', 'alo'].filter(m => document.getElementById(`${chkPrefix}${m}`)?.checked).length;
    const useDeptColors = activeMetricsCount === 1 && metricChecked(scope, 'chk-ani');

    if (metricChecked(scope, 'chk-ani')) {
        const vals = data.por_departamento.map(d => d.total_animales);
        const bg = useDeptColors ? labels.map(l => deptColorMap[l]) : MC.animales;
        datasets.push({
            label: `${te.label_animales || 'Animales'} · Σ ${sumMetricArr(vals)}`,
            data: vals,
            backgroundColor: bg,
            borderRadius: 4,
            borderSkipped: false
        });
    }
    if (metricChecked(scope, 'chk-rea')) {
        const vals = data.por_departamento.map(d => d.total_reactivos);
        datasets.push({
            label: `${te.label_reactivos || 'Reactivos'} · Σ ${sumMetricArr(vals)}`,
            data: vals,
            backgroundColor: MC.reactivos,
            borderRadius: 4,
            borderSkipped: false
        });
    }
    if (metricChecked(scope, 'chk-ins')) {
        const vals = data.por_departamento.map(d => d.total_insumos);
        datasets.push({
            label: `${te.label_insumos || 'Insumos'} · Σ ${sumMetricArr(vals)}`,
            data: vals,
            backgroundColor: MC.insumos,
            borderRadius: 4,
            borderSkipped: false
        });
    }
    if (metricChecked(scope, 'chk-pro')) {
        const vals = data.por_departamento.map(d => d.protocolos_aprobados);
        datasets.push({
            label: `${te.label_prot_aprob || 'Prot.'} · Σ ${sumMetricArr(vals)}`,
            data: vals,
            backgroundColor: MC.protocolos,
            borderRadius: 4,
            borderSkipped: false
        });
    }
    if (metricChecked(scope, 'chk-alo')) {
        const vals = data.por_departamento.map(d => (data.alojamientos_activos || []).find(a => a.departamento === d.departamento)?.cantidad || 0);
        datasets.push({
            label: `${te.label_aloj_activos || 'Aloj.'} · Σ ${sumMetricArr(vals)}`,
            data: vals,
            backgroundColor: MC.alojamientos,
            borderRadius: 4,
            borderSkipped: false
        });
    }

    const parentEl = canvas.parentElement;
    const isHorizBar = type === 'bar';
    if (parentEl) {
        if (isHorizBar) {
            parentEl.style.minHeight = `${Math.max(260, labels.length * (18 + activeMetricsCount * 5))}px`;
        } else {
            parentEl.style.minHeight = '';
        }
    }

    charts[chartKey] = new ChartLib(ctx, {
        type,
        data: { labels, datasets },
        options: {
            indexAxis: isHorizBar ? 'y' : undefined,
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: isHorizBar ? { right: 36, left: 4 } : {}
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        usePointStyle: true,
                        padding: 10
                    }
                },
                groboStatsBarValues: { enabled: isHorizBar }
            },
            scales: isHorizBar
                ? {
                      x: { beginAtZero: true, stacked: false, ticks: { precision: 0 } },
                      y: { stacked: false, grid: { display: false } }
                  }
                : {}
        }
    });
}

function renderSpeciesChart(scope = 'sede') {
    ensureGroboStatsPlugins();
    const isRed = scope === 'red';
    const canvasId = isRed ? 'red-chart-species' : 'chart-species';
    const typeElId = isRed ? 'red-species-chart-type' : 'species-chart-type';
    const containerId = isRed ? 'red-species-chart-container' : 'species-chart-container';
    const chartKey = isRed ? 'speciesRed' : 'species';
    const canvas = document.getElementById(canvasId);
    const src = statsDataForScope(isRed ? 'red' : 'sede');
    if (!canvas || !src) return;
    const rankList = Array.isArray(src.ranking_especies) ? src.ranking_especies : [];
    if (!rankList.length) {
        if (charts[chartKey]) charts[chartKey].destroy();
        return;
    }

    const ctx = canvas.getContext('2d');
    const type = document.getElementById(typeElId)?.value || 'bar';
    const ChartLib = window.Chart;
    const te = txStats();

    if (charts[chartKey]) charts[chartKey].destroy();

    const rank = rankList;
    const labels = rank.map(e => e.etiqueta_especie);
    const values = rank.map(e => e.cantidad);

    const container = document.getElementById(containerId);
    if (container) {
        if (type === 'bar') {
            container.style.height = `${Math.max(400, labels.length * 26)}px`;
        } else {
            container.style.height = '400px';
        }
    }

    const pieColors = labels.map((_, i) => `hsl(${(i * 41 + 18) % 360}, 62%, 44%)`);
    const barColors = labels.map((_, i) => `hsl(${(i * 41 + 18) % 360}, 58%, 40%)`);
    const isHorizBar = type === 'bar';

    charts[chartKey] = new ChartLib(ctx, {
        type,
        data: {
            labels,
            datasets: [{
                label: te.pdf_th_cantidad || 'Cantidad',
                data: values,
                backgroundColor: type === 'pie' ? pieColors : barColors,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: isHorizBar ? 'y' : 'x',
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: isHorizBar ? { right: 36 } : {}
            },
            plugins: {
                legend: {
                    display: type === 'pie',
                    position: 'right',
                    labels: {
                        generateLabels(chart) {
                            const d = chart.data;
                            const ds = d.datasets[0];
                            if (!d.labels?.length || !ds) return [];
                            return d.labels.map((lbl, i) => ({
                                text: `${lbl}: ${ds.data[i]}`,
                                fillStyle: Array.isArray(ds.backgroundColor) ? ds.backgroundColor[i] : ds.backgroundColor,
                                strokeStyle: '#fff',
                                lineWidth: 1,
                                hidden: false,
                                index: i,
                                datasetIndex: 0
                            }));
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label(ctx) {
                            const v = ctx.raw;
                            const base = ctx.dataset.label || '';
                            return `${base ? `${base}: ` : ''}${v}`;
                        }
                    }
                },
                groboStatsBarValues: { enabled: isHorizBar }
            },
            scales: isHorizBar
                ? {
                      x: { beginAtZero: true, ticks: { precision: 0 } },
                      y: { grid: { display: false } }
                  }
                : {}
        }
    });
}

// ==========================================
// DETALLES INFERIORES
// ==========================================

function renderDetailsSection(scope = 'sede') {
    const containerId = scope === 'red' ? 'red-details-container' : 'details-container';
    const container = document.getElementById(containerId);
    const data = statsDataForScope(scope);
    if (!container || !data?.por_departamento) return;
    const t = window.txt?.admin_estadisticas || {};
    const gen = window.txt?.generales || {};
    container.innerHTML = '';
    const deptos = data.por_departamento.map(d => d.departamento);

    deptos.forEach(depto => {
        const especies = (data.detalle_especies || []).filter(x => x.departamento === depto);
        const protocolos = (data.detalle_protocolos || []).filter(x => x.departamento === depto);
        const cepas = (data.detalle_cepas || []).filter(x => x.departamento === depto);

        if (especies.length === 0 && protocolos.length === 0 && cepas.length === 0) return;

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
                ? `<span class="badge bg-danger" style="font-size:9px">${t.det_prot_vencido || 'Vencido'} (${p.FechaFinProtA})</span>`
                : `<span class="badge bg-success" style="font-size:9px">${t.det_prot_vigente || 'Vigente'}</span>`;
            
            return `
            <li class="list-group-item px-0 py-2 border-bottom">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="badge bg-light text-dark border">${p.nprotA}</span>
                    ${badge}
                </div>
                <div class="small text-muted text-truncate" title="${p.tituloA}">${p.tituloA}</div>
            </li>`;
        }).join('');

        // Render Cepas
        let htmlCep = cepas.map(c => `
            <li class="list-group-item d-flex justify-content-between px-0 py-1 border-bottom">
                <span>${c.cepa}</span>
                <span class="fw-bold text-primary">${c.cantidad_animales}</span>
            </li>`).join('');

        col.innerHTML = `
            <div class="card h-100 shadow-sm border-0 border-top border-3 border-success">
                <div class="card-header bg-white fw-bold text-success text-uppercase small">${depto}</div>
                <div class="card-body p-3 pt-0">
                    <div class="mb-3">
                        <h6 class="small fw-bold text-muted border-bottom py-2"><i class="bi bi-heptagon-half"></i> ${(t.det_especies || 'Especies').toUpperCase()}</h6>
                        <ul class="list-group list-group-flush small">${htmlEsp || `<li class="text-muted small fst-italic">${t.det_sin_datos || gen.no_data || 'Sin datos'}</li>`}</ul>
                    </div>
                    <div class="mb-3">
                        <h6 class="small fw-bold text-muted border-bottom py-2"><i class="bi bi-diagram-3"></i> ${(t.det_cepas || 'Cepas').toUpperCase()}</h6>
                        <ul class="list-group list-group-flush small">${htmlCep || `<li class="text-muted small fst-italic">${t.det_sin_datos || gen.no_data || 'Sin datos'}</li>`}</ul>
                    </div>
                    <div>
                        <h6 class="small fw-bold text-muted border-bottom py-2"><i class="bi bi-journal-check"></i> ${(t.det_protocolos || 'Protocolos').toUpperCase()}</h6>
                        <ul class="list-group list-group-flush small">${htmlProt || `<li class="text-muted small fst-italic">${t.det_sin_datos || gen.no_data || 'Sin datos'}</li>`}</ul>
                    </div>
                </div>
            </div>`;
        container.appendChild(col);
    });
}

function renderStrainCounters(scope = 'sede') {
    const isRed = scope === 'red';
    const containerId = isRed ? 'red-strain-counters-container' : 'strain-counters-container';
    const container = document.getElementById(containerId);
    const src = statsDataForScope(isRed ? 'red' : 'sede');
    if (!container || !src) return;

    const list = Array.isArray(src.ranking_cepas) ? src.ranking_cepas : [];
    const top = list.slice(0, 12);
    if (!top.length) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = top.map((r) => {
        const label = String(r.cepa ?? '').trim() || '—';
        const qty = Number(r.cantidad_animales ?? 0) || 0;
        return `
            <div class="col-6 col-md-4 col-xl-3">
                <div class="card shadow-sm border-0 p-3 h-100">
                    <div class="small text-muted fw-bold text-uppercase">${label}</div>
                    <div class="fs-4 fw-bold text-primary">${qty}</div>
                </div>
            </div>`;
    }).join('');
}

function renderCategoriasSection(scope = 'sede') {
    const isRed = scope === 'red';
    const topId = isRed ? 'red-categories-top-container' : 'categories-top-container';
    const listId = isRed ? 'red-categories-list' : 'categories-list';
    const topEl = document.getElementById(topId);
    const listEl = document.getElementById(listId);
    const src = statsDataForScope(isRed ? 'red' : 'sede');
    if (!src) return;

    const cats = Array.isArray(src.categorias_formularios) ? src.categorias_formularios : [];
    const top = cats.slice(0, 6);

    if (topEl) {
        topEl.innerHTML = top.map((c) => {
            const label = String(c.categoria ?? '').trim() || '—';
            const qty = Number(c.cantidad ?? 0) || 0;
            return `
                <div class="col-6">
                    <div class="border rounded p-2 bg-light h-100">
                        <div class="small text-muted fw-bold text-uppercase">${label}</div>
                        <div class="fw-bold">${qty}</div>
                    </div>
                </div>`;
        }).join('');
    }

    if (listEl) {
        listEl.innerHTML = cats.map((c) => {
            const label = String(c.categoria ?? '').trim() || '—';
            const qty = Number(c.cantidad ?? 0) || 0;
            return `
                <li class="list-group-item d-flex justify-content-between px-0 py-1 border-bottom">
                    <span>${label}</span>
                    <span class="fw-bold">${qty}</span>
                </li>`;
        }).join('') || '';
    }
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

/**
 * Hoja opcional: pedidos propios vs recibidos por derivación (misma semántica que la vista).
 * @param {object} wb libro XLSX
 * @param {object} data payload stats (sede o red)
 * @param {string} sheetName máx. 31 caracteres (Excel)
 */
function statsAppendDerivacionPedidosSheet(wb, data, sheetName) {
    const dp = data?.derivacion_pedidos;
    if (!dp?.activo || !wb || !sheetName) return;
    const t = window.txt?.admin_estadisticas || {};
    const p = dp.propios || {};
    const rows = [];
    rows.push([t.seccion_deriv_pedidos || 'Pedidos: propios y derivados']);
    rows.push([]);
    rows.push([t.deriv_propios_title || 'Propios']);
    rows.push([t.th_animales || 'Animales', t.th_reactivos || 'Reactivos', t.th_insumos || 'Insumos']);
    rows.push([p.total_animales ?? 0, p.total_reactivos ?? 0, p.total_insumos ?? 0]);
    rows.push([]);
    rows.push([t.deriv_recibidos_title || 'Recibidos por origen']);
    rows.push([
        t.deriv_th_inst_origen || 'Institución origen',
        t.th_animales || 'Animales',
        t.th_reactivos || 'Reactivos',
        t.th_insumos || 'Insumos'
    ]);
    const rec = Array.isArray(dp.recibidos_por_origen) ? dp.recibidos_por_origen : [];
    if (rec.length) {
        rec.forEach((r) => {
            const nombre = String(r.institucion_origen || '').trim() || String(r.id_institucion_origen ?? '');
            rows.push([nombre, r.total_animales ?? 0, r.total_reactivos ?? 0, r.total_insumos ?? 0]);
        });
    } else {
        rows.push([t.deriv_sin_recibidos || '—', '', '', '']);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sheetName.slice(0, 31));
}

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

    if (Array.isArray(rawData.categorias_formularios) && rawData.categorias_formularios.length) {
        const cat = rawData.categorias_formularios.map(c => ({
            "Categoria": c.categoria,
            "Cantidad": c.cantidad
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cat), "Categorias");
    }
    if (Array.isArray(rawData.ranking_cepas) && rawData.ranking_cepas.length) {
        const cep = rawData.ranking_cepas.map(c => ({
            "Cepa": c.cepa,
            "Cantidad": c.cantidad_animales
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cep), "Top Cepas");
    }
    if (Array.isArray(rawData.detalle_cepas) && rawData.detalle_cepas.length) {
        const det = rawData.detalle_cepas.map(c => ({
            "Departamento": c.departamento,
            "Cepa": c.cepa,
            "Cantidad": c.cantidad_animales
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(det), "Detalle Cepas");
    }

    statsAppendDerivacionPedidosSheet(wb, rawData, 'Deriv_pedidos');

    XLSX.writeFile(wb, `Reporte_GROBO_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ==========================================
// EXPORTACIÓN PDF RÁPIDO (AUTO-TABLE)
// ==========================================

/** Metadatos de periodo para encabezado PDF (inputs #stats-from / #stats-to). */
function buildStatsPdfPeriodMeta() {
    const t = txStats();
    const lines = [];
    const fromIn = document.getElementById('stats-from')?.value?.trim() || '';
    const toIn = document.getElementById('stats-to')?.value?.trim() || '';
    const re = /^\d{4}-\d{2}-\d{2}$/;
    const fmt = (isoYmd) => {
        const d = new Date(`${isoYmd}T12:00:00`);
        return Number.isNaN(d.getTime()) ? isoYmd : d.toLocaleDateString();
    };
    if (fromIn && toIn && re.test(fromIn) && re.test(toIn)) {
        let d0 = new Date(`${fromIn}T12:00:00`);
        let d1 = new Date(`${toIn}T12:00:00`);
        if (!Number.isNaN(d0.getTime()) && !Number.isNaN(d1.getTime())) {
            if (d0 > d1) {
                const tmp = d0;
                d0 = d1;
                d1 = tmp;
            }
            const iso0 = d0.toISOString().slice(0, 10);
            const iso1 = d1.toISOString().slice(0, 10);
            const pLine = (t.pdf_periodo_line_tpl || 'Periodo consultado: {from} — {to}')
                .replace(/\{from\}/g, fmt(iso0))
                .replace(/\{to\}/g, fmt(iso1));
            lines.push(pLine);
            const dias = Math.floor((d1 - d0) / 86400000) + 1;
            lines.push((t.pdf_total_dias_tpl || 'Total de días (inclusive): {n}').replace(/\{n\}/g, String(dias)));
        }
    }
    lines.push((t.pdf_emitido_tpl || 'Generado: {fecha}').replace(/\{fecha\}/g, new Date().toLocaleString()));
    return { lines };
}

function pdfEnsureSpace(doc, y, reserveMm = 45, marginTop = 18, bottomLimit = 275) {
    if (y + reserveMm > bottomLimit) {
        doc.addPage();
        return marginTop;
    }
    return y;
}

function buildStatsPdfSummaryBody(data) {
    const te = txStats();
    const g = data.globales;
    const rows = [
        [te.label_animales, g.total_animales, te.label_reactivos, g.total_reactivos],
        [te.label_insumos, g.total_insumos, te.th_prot_aprob, g.total_protocolos],
        [te.box_alojamientos, g.total_alojamientos, '', '']
    ];
    const at = data.alojamiento_trazabilidad;
    if (at) {
        rows.push(
            [te.pdf_metric_hist_aloj, at.total_historias ?? 0, te.pdf_metric_cajas, at.total_cajas ?? 0],
            [te.pdf_metric_obs_traz, at.total_observaciones_trazabilidad ?? 0, te.pdf_metric_aloj_tramos, at.alojamientos_activos ?? 0]
        );
    }
    return rows;
}

function buildStatsPdfDeptRows(data) {
    return (data.por_departamento || []).map((d) => {
        const alojObj = (data.alojamientos_activos || []).find((a) => a.departamento === d.departamento);
        const cantAloj = alojObj ? alojObj.cantidad : 0;
        return [d.departamento, d.total_animales, d.total_reactivos, d.total_insumos, d.protocolos_aprobados, cantAloj];
    });
}

function statsPdfProtocolEstadoRow(p, te) {
    const vencimiento = new Date(p.FechaFinProtA);
    if (Number.isNaN(vencimiento.getTime())) return '—';
    return vencimiento < new Date() ? (te.det_prot_vencido || 'Vencido') : (te.det_prot_vigente || 'Vigente');
}

function statsPdfRenderCharts(doc, includeCharts, canvasIds, M, startY) {
    let currentY = startY;
    const te = txStats();
    if (!includeCharts) return currentY;
    const canvas = document.getElementById(canvasIds.main);
    if (canvas) {
        try {
            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            const props = doc.getImageProperties(imgData);
            const h = (props.height * 180) / props.width;
            currentY = pdfEnsureSpace(doc, currentY, h + 20);
            doc.text(te.pdf_grafico_depto, M, currentY);
            doc.addImage(imgData, 'JPEG', 15, currentY + 5, 180, h);
            currentY += h + 15;
        } catch (e) {
            console.warn(e);
        }
    }
    const canvasSp = document.getElementById(canvasIds.species);
    if (canvasSp) {
        try {
            const imgData = canvasSp.toDataURL('image/jpeg', 0.75);
            const props = doc.getImageProperties(imgData);
            const h = Math.min(100, (props.height * 170) / props.width);
            currentY = pdfEnsureSpace(doc, currentY, h + 18);
            doc.text(te.pdf_graf_uso_especies, M, currentY);
            doc.addImage(imgData, 'JPEG', 15, currentY + 5, 170, h);
            currentY += h + 12;
        } catch (e) {
            console.warn(e);
        }
    }
    return currentY;
}

function statsPdfAppendExtendedTables(doc, data, M, startY) {
    const te = txStats();
    const gen = window.txt?.generales || {};
    let currentY = startY;

    currentY = pdfEnsureSpace(doc, currentY, 40);
    doc.text(te.desglose_depto, M, currentY);
    doc.autoTable({
        startY: currentY + 5,
        margin: { left: M, right: M },
        head: [[
            te.th_departamento,
            te.pdf_abbr_anim,
            te.pdf_abbr_reac,
            te.pdf_abbr_ins,
            te.pdf_abbr_prot,
            te.pdf_abbr_aloj
        ]],
        body: buildStatsPdfDeptRows(data),
        theme: 'striped'
    });
    currentY = doc.lastAutoTable.finalY + 10;

    const dpPdf = data.derivacion_pedidos;
    if (dpPdf && dpPdf.activo) {
        currentY = pdfEnsureSpace(doc, currentY, 55);
        doc.setFontSize(11);
        doc.text(te.seccion_deriv_pedidos, M, currentY);
        doc.setFontSize(10);
        const yProp = currentY + 7;
        doc.text(te.deriv_propios_title, M, yProp);
        const pr = dpPdf.propios || {};
        doc.autoTable({
            startY: yProp + 4,
            margin: { left: M, right: M },
            head: [[te.th_animales, te.th_reactivos, te.th_insumos]],
            body: [[
                pr.total_animales ?? 0,
                pr.total_reactivos ?? 0,
                pr.total_insumos ?? 0
            ]],
            theme: 'striped'
        });
        currentY = doc.lastAutoTable.finalY + 8;
        doc.text(te.deriv_recibidos_title, M, currentY);
        const recPdf = Array.isArray(dpPdf.recibidos_por_origen) ? dpPdf.recibidos_por_origen : [];
        const bodyDeriv = recPdf.length
            ? recPdf.map((r) => [
                String(r.institucion_origen || '').trim() || String(r.id_institucion_origen ?? ''),
                r.total_animales ?? 0,
                r.total_reactivos ?? 0,
                r.total_insumos ?? 0
            ])
            : [[te.deriv_sin_recibidos, '', '', '']];
        doc.autoTable({
            startY: currentY + 4,
            margin: { left: M, right: M },
            head: [[te.deriv_th_inst_origen, te.th_animales, te.th_reactivos, te.th_insumos]],
            body: bodyDeriv,
            theme: 'striped'
        });
        currentY = doc.lastAutoTable.finalY + 10;
    }

    const orgRows = data.por_organizacion || [];
    if (orgRows.length) {
        const labelSinOrg = gen.sin_organizacion || '(Sin organización)';
        currentY = pdfEnsureSpace(doc, currentY, 50);
        doc.text(te.desglose_org, M, currentY);
        const bodyOrg = orgRows.map((o) => {
            const orgLabel = o.organizacion === '(Sin organización)' ? labelSinOrg : (o.organizacion || '–');
            return [
                orgLabel,
                parseInt(o.total_animales, 10) || 0,
                parseInt(o.total_reactivos, 10) || 0,
                parseInt(o.total_insumos, 10) || 0,
                parseInt(o.protocolos_aprobados, 10) || 0
            ];
        });
        doc.autoTable({
            startY: currentY + 5,
            margin: { left: M, right: M },
            head: [[
                te.th_organizacion,
                te.th_animales,
                te.th_reactivos,
                te.th_insumos,
                te.th_prot_aprob
            ]],
            body: bodyOrg,
            theme: 'striped'
        });
        currentY = doc.lastAutoTable.finalY + 10;
    }

    const atEsp = data.alojamiento_trazabilidad?.por_especie;
    if (Array.isArray(atEsp) && atEsp.length) {
        currentY = pdfEnsureSpace(doc, currentY, 45);
        doc.text(te.pdf_seccion_aloj_por_especie, M, currentY);
        doc.autoTable({
            startY: currentY + 5,
            margin: { left: M, right: M },
            head: [[te.pdf_th_especie, te.pdf_th_hist_aloj, te.pdf_th_tramos_aloj]],
            body: atEsp.map((e) => [e.especie, e.historias, e.tramos]),
            theme: 'striped'
        });
        currentY = doc.lastAutoTable.finalY + 10;
    }

    const rankEsp = data.ranking_especies || [];
    if (rankEsp.length) {
        currentY = pdfEnsureSpace(doc, currentY, 45);
        doc.text(te.pdf_seccion_ranking_especies, M, currentY);
        doc.autoTable({
            startY: currentY + 5,
            margin: { left: M, right: M },
            head: [[te.pdf_th_especie, te.pdf_th_cantidad]],
            body: rankEsp.map((r) => [r.etiqueta_especie, r.cantidad]),
            theme: 'striped'
        });
        currentY = doc.lastAutoTable.finalY + 10;
    }

    const rankCep = data.ranking_cepas || [];
    if (Array.isArray(rankCep) && rankCep.length) {
        currentY = pdfEnsureSpace(doc, currentY, 45);
        doc.text(te.top_cepas, M, currentY);
        doc.autoTable({
            startY: currentY + 5,
            margin: { left: M, right: M },
            head: [[te.pdf_th_cepa, te.pdf_th_cantidad]],
            body: rankCep.map((c) => [String(c.cepa ?? '').trim() || '—', c.cantidad_animales ?? 0]),
            theme: 'striped'
        });
        currentY = doc.lastAutoTable.finalY + 10;
    }

    const detCep = data.detalle_cepas || [];
    if (Array.isArray(detCep) && detCep.length) {
        currentY = pdfEnsureSpace(doc, currentY, 45);
        doc.text(te.pdf_seccion_detalle_cepas, M, currentY);
        doc.autoTable({
            startY: currentY + 5,
            margin: { left: M, right: M },
            head: [[te.th_departamento, te.pdf_th_cepa, te.pdf_th_cantidad]],
            body: detCep.map((c) => [c.departamento, c.cepa, c.cantidad_animales]),
            theme: 'plain',
            columnStyles: { 0: { fontStyle: 'bold' } }
        });
        currentY = doc.lastAutoTable.finalY + 10;
    }

    const cats = data.categorias_formularios || [];
    if (Array.isArray(cats) && cats.length) {
        currentY = pdfEnsureSpace(doc, currentY, 45);
        doc.text(te.categorias, M, currentY);
        doc.autoTable({
            startY: currentY + 5,
            margin: { left: M, right: M },
            head: [[te.pdf_th_categoria, te.pdf_th_cantidad]],
            body: cats.map((c) => [String(c.categoria ?? '').trim() || '—', c.cantidad ?? 0]),
            theme: 'striped'
        });
        currentY = doc.lastAutoTable.finalY + 10;
    }

    const detEsp = data.detalle_especies || [];
    if (detEsp.length) {
        currentY = pdfEnsureSpace(doc, currentY, 45);
        doc.text(te.pdf_seccion_detalle_especies, M, currentY);
        doc.autoTable({
            startY: currentY + 5,
            margin: { left: M, right: M },
            head: [[
                te.pdf_th_depto_corta,
                te.pdf_th_especie,
                te.pdf_th_subespecie,
                te.pdf_th_cantidad
            ]],
            body: detEsp.map((e) => [
                e.departamento,
                e.especie,
                e.subespecie || '-',
                e.cantidad_animales
            ]),
            theme: 'plain',
            columnStyles: { 0: { fontStyle: 'bold' } }
        });
        currentY = doc.lastAutoTable.finalY + 10;
    }

    const detProt = data.detalle_protocolos || [];
    if (detProt.length) {
        currentY = pdfEnsureSpace(doc, currentY, 45);
        doc.text(te.pdf_seccion_detalle_protocolos, M, currentY);
        doc.autoTable({
            startY: currentY + 5,
            margin: { left: M, right: M },
            head: [[
                te.pdf_th_depto_corta,
                te.pdf_th_cod_protocolo,
                te.pdf_th_titulo_prot,
                te.pdf_th_vence,
                te.pdf_th_estado_prot
            ]],
            body: detProt.map((p) => [
                p.departamento,
                p.nprotA,
                String(p.tituloA || '').slice(0, 100),
                p.FechaFinProtA || '—',
                statsPdfProtocolEstadoRow(p, te)
            ]),
            theme: 'striped'
        });
    }
}

function askExportPDFOptions() {
    const t = txStats();
    if (!window.Swal) { exportFastPDF(true); return; }
    Swal.fire({
        title: t.pdf_sede_export_title || 'Exportar PDF',
        text: t.pdf_sede_export_text || '¿Desea incluir los gráficos? (Esto puede tardar un poco más)',
        icon: 'question',
        showDenyButton: true,
        confirmButtonText: t.pdf_sede_con_graficos || 'Sí, con Gráficos',
        denyButtonText: t.pdf_sede_solo_tablas || 'No, solo Tablas (Rápido)',
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

    const te = txStats();
    doc.setFontSize(16);
    doc.text(te.pdf_doc_title_sede || 'REPORTE ESTADÍSTICO - GROBO', M, titleY);
    doc.setFontSize(10);
    const metaSede = buildStatsPdfPeriodMeta();
    let yMeta = titleY + 7;
    metaSede.lines.forEach((line) => {
        doc.text(line, M, yMeta);
        yMeta += 7;
    });
    const tableStartSede = yMeta + 6;

    const gen = window.txt?.generales || {};
    const lblTotal = gen.total ?? 'Total';
    doc.autoTable({
        startY: tableStartSede,
        margin: { left: M, right: M },
        head: [[te.pdf_col_metrica || 'Métrica', lblTotal, te.pdf_col_metrica || 'Métrica', lblTotal]],
        body: buildStatsPdfSummaryBody(rawData),
        theme: 'grid',
        headStyles: { fillColor: [26, 93, 59] }
    });

    let currentY = doc.lastAutoTable.finalY + 10;
    currentY = statsPdfRenderCharts(doc, includeCharts, { main: 'chart-canvas', species: 'chart-species' }, M, currentY);
    currentY = pdfEnsureSpace(doc, currentY, 35);
    statsPdfAppendExtendedTables(doc, rawData, M, currentY);

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