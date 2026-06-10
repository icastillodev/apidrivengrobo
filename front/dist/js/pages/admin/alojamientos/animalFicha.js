/**
 * Ficha de animal (sujeto) en alojamiento: modal + PDF con resumen y trazabilidad completa.
 */
import { API } from '../../../api.js';

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function ensureHtml2pdf() {
    if (typeof window.html2pdf === 'function') {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-html2pdf-loader]');
        if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('html2pdf')));
            return;
        }
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        s.async = true;
        s.setAttribute('data-html2pdf-loader', '1');
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('No se pudo cargar html2pdf'));
        document.head.appendChild(s);
    });
}

function mountDomForPdf(dom) {
    prepareDomForPdfCapture(dom);
    document.body.appendChild(dom);
    return dom;
}

/** Ajustes de layout para html2pdf/html2canvas (evita PDF en blanco). */
function prepareDomForPdfCapture(dom) {
    dom.style.position = 'fixed';
    dom.style.left = '-10000px';
    dom.style.top = '0';
    dom.style.opacity = '1';
    dom.style.visibility = 'visible';
    dom.style.pointerEvents = 'none';
    dom.style.zIndex = '-1';
    dom.style.background = '#ffffff';
    dom.style.color = '#212529';
    dom.style.width = '794px';
    dom.style.maxWidth = '794px';
    dom.querySelectorAll('.row').forEach((row) => {
        row.style.display = 'block';
        row.style.width = '100%';
    });
    dom.querySelectorAll('[class*="col-"]').forEach((col) => {
        col.style.width = '100%';
        col.style.maxWidth = '100%';
        col.style.flex = 'none';
    });
}

async function waitNextFrame() {
    void domOffsetForceReflow(document.body);
    await new Promise((r) => requestAnimationFrame(() => r()));
    await new Promise((r) => setTimeout(r, 120));
}

function domOffsetForceReflow(el) {
    if (el && el.offsetHeight != null) return el.offsetHeight;
    return 0;
}

function filterSingleFichaTramos(data, tramoScope) {
    if (!data || tramoScope !== 'actual' || !Array.isArray(data.tramos)) return data;
    const idActual = parseInt(data.IdAlojamientoFicha, 10) || 0;
    if (!idActual) return data;
    const tramos = data.tramos.filter((tr) => parseInt(tr.IdAlojamiento, 10) === idActual);
    let ultimo = data.ultimoTramo;
    if (ultimo && parseInt(ultimo.IdAlojamiento, 10) !== idActual) {
        ultimo = tramos.length ? tramos[tramos.length - 1] : null;
    }
    return { ...data, tramos, ultimoTramo: ultimo };
}

function filterFichaForExport(data, exportOpts = {}) {
    if (!data) return data;
    const tramoScope = exportOpts.tramoScope === 'actual' ? 'actual' : 'todos';
    const clone = JSON.parse(JSON.stringify(data));
    if (clone.scope === 'caja' && Array.isArray(clone.fichasSujetos)) {
        clone.fichasSujetos = clone.fichasSujetos.map((fd) => filterSingleFichaTramos(fd, tramoScope));
        return clone;
    }
    if (clone.scope === 'alojamiento' && Array.isArray(clone.grupos)) {
        clone.grupos = clone.grupos.map((g) => ({
            ...g,
            fichasSujetos: (g.fichasSujetos || []).map((fd) => filterSingleFichaTramos(fd, tramoScope)),
        }));
        return clone;
    }
    return filterSingleFichaTramos(clone, tramoScope);
}

function allowTramoScopePicker(data) {
    if (!data || data.scope) return false;
    return (data.tramos || []).length > 1;
}

async function pickFichaExportOptions(t, opts = {}) {
    const { format = 'pdf', allowTramoScope = false } = opts;
    const Swal = window.Swal;
    if (typeof Swal === 'undefined') {
        return { mode: 'full', tramoScope: 'todos' };
    }

    let html = `<p class="small text-muted text-start mb-3">${esc(t.animal_ficha_export_options_hint || '')}</p>`;
    html += `<div class="text-start mb-3">
        <label class="form-label fw-bold small mb-1">${esc(t.animal_ficha_pdf_elegir_title || '')}</label>
        <div class="form-check"><input class="form-check-input" type="radio" name="exp-mode" id="exp-mode-full" value="full" checked>
        <label class="form-check-label" for="exp-mode-full">${esc(t.animal_ficha_pdf_completa || '')}</label></div>
        <div class="form-check"><input class="form-check-input" type="radio" name="exp-mode" id="exp-mode-simple" value="simple">
        <label class="form-check-label" for="exp-mode-simple">${esc(t.animal_ficha_pdf_simple || '')}</label></div>
    </div>`;

    if (allowTramoScope) {
        html += `<div class="text-start mb-2">
            <label class="form-label fw-bold small mb-1">${esc(t.animal_ficha_tramo_scope_title || '')}</label>
            <div class="form-check"><input class="form-check-input" type="radio" name="exp-tramo" id="exp-tramo-todos" value="todos" checked>
            <label class="form-check-label" for="exp-tramo-todos">${esc(t.animal_ficha_tramo_todos || '')}</label></div>
            <div class="form-check"><input class="form-check-input" type="radio" name="exp-tramo" id="exp-tramo-actual" value="actual">
            <label class="form-check-label" for="exp-tramo-actual">${esc(t.animal_ficha_tramo_actual || '')}</label></div>
        </div>`;
    }

    const result = await Swal.fire({
        title: format === 'excel' ? (t.animal_ficha_excel || 'Excel') : (t.animal_ficha_pdf || 'PDF'),
        html,
        showCancelButton: true,
        confirmButtonText: format === 'excel'
            ? (t.animal_ficha_excel_descargar || 'Descargar')
            : (t.animal_ficha_pdf || 'PDF'),
        cancelButtonText: window.txt?.comunicacion?.modal_cerrar || window.txt?.generales?.cerrar || 'Cerrar',
        focusConfirm: false,
        preConfirm: () => {
            const modeEl = document.querySelector('input[name="exp-mode"]:checked');
            const tramoEl = document.querySelector('input[name="exp-tramo"]:checked');
            return {
                mode: modeEl?.value === 'simple' ? 'simple' : 'full',
                tramoScope: tramoEl?.value === 'actual' ? 'actual' : 'todos',
            };
        },
    });
    if (result.isDismissed) return null;
    return result.value;
}

function buildFichaExportToolbarHtml(t, toolbarId) {
    return `<div id="${toolbarId}" class="d-flex flex-wrap gap-2 mb-3 pb-2 border-bottom">
        <button type="button" class="btn btn-sm btn-outline-danger" data-ficha-export="pdf"><i class="bi bi-file-pdf me-1"></i>${esc(t.animal_ficha_pdf || 'PDF')}</button>
        <button type="button" class="btn btn-sm btn-outline-success" data-ficha-export="excel"><i class="bi bi-file-earmark-spreadsheet me-1"></i>${esc(t.animal_ficha_excel || 'Excel')}</button>
    </div>`;
}

function wireExportToolbar(toolbarId, handlers) {
    const bar = document.getElementById(toolbarId);
    if (!bar) return;
    bar.querySelector('[data-ficha-export="pdf"]')?.addEventListener('click', (e) => {
        e.preventDefault();
        handlers.pdf?.();
    });
    bar.querySelector('[data-ficha-export="excel"]')?.addEventListener('click', (e) => {
        e.preventDefault();
        handlers.excel?.();
    });
}

function ensureXlsx() {
    if (typeof window.XLSX !== 'undefined') {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-xlsx-loader]');
        if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('xlsx')));
            return;
        }
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        s.async = true;
        s.setAttribute('data-xlsx-loader', '1');
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(tOrDefault(window.txt?.alojamientos?.export_sheetjs_error, 'xlsx')));
        document.head.appendChild(s);
    });
}

function tOrDefault(v, d) {
    return v || d;
}

function excelSheetName(label, fallback) {
    return String(label || fallback).replace(/[\\/*?:[\]]/g, '_').slice(0, 31);
}

function collectFichaSubjects(data) {
    if (!data) return [];
    if (data.scope === 'caja') return data.fichasSujetos || [];
    if (data.scope === 'alojamiento') {
        return (data.grupos || []).flatMap((g) => g.fichasSujetos || []);
    }
    return [data];
}

function buildResumenRows(data, t, tm) {
    const suj = data.sujeto || {};
    const prot0 = (data.tramos || [])[0];
    const rows = [
        [t.animal_ficha_nombre, suj.NombreEspecieAloj],
        [t.animal_ficha_id_sujeto, suj.IdUnidadAlojamiento],
        [t.animal_ficha_especie, data.NombreEspecie],
        [t.animal_ficha_historia, data.historia],
        [t.animal_ficha_protocolo, prot0 ? `${prot0.protocolo_titulo || ''}${prot0.protocolo_codigo ? ` (${prot0.protocolo_codigo})` : ''}`.trim() : ''],
        [t.animal_ficha_fecha_inicio, data.fechaInicioSeguimiento],
        [t.animal_ficha_nacimiento, data.fechaNacimientoSugerida || suj.FechaNacimientoSujeto],
        [t.animal_ficha_peso, suj.PesoSujetoKg],
        [t.animal_ficha_sexo, sexoSujetoLabel(suj.SexoSujeto, t)],
        [t.animal_ficha_subespecie, [suj.SubespecieNombreSujeto, suj.CepaNombreSujeto, suj.CategoriaRazaSujeto].filter(Boolean).join(' · ')],
        [t.animal_ficha_detalle, suj.DetalleEspecieAloj],
        [t.animal_ficha_institucion || 'Institución', data.NombreInstitucion],
    ];
    return rows.filter((r) => r[1] != null && String(r[1]).trim() !== '');
}

function buildInicioRows(data, t) {
    const cats = data.categorias_inicio || [];
    const vin = data.valores_inicio || {};
    const rows = [[t.animal_ficha_excel_col_campo || 'Campo', t.animal_ficha_excel_col_valor || 'Valor']];
    cats.forEach((c) => {
        const o = vin[c.IdDatosUnidadAloj] || vin[String(c.IdDatosUnidadAloj)];
        const v = o?.Valor != null ? String(o.Valor) : '';
        if (v) rows.push([c.NombreCatAlojUnidad, v]);
    });
    return rows.length > 1 ? rows : null;
}

function buildTrazabilidadRows(data, t, tm) {
    const cats = data.categorias_datos || data.categorias || [];
    const tramos = data.tramos || [];
    const header = [
        t.animal_ficha_tramo,
        tm.desde || 'Desde',
        tm.hasta || 'Hasta',
        t.animal_ficha_caja,
        t.animal_ficha_ubicacion,
        t.trace_fecha,
        ...cats.map((c) => c.NombreCatAlojUnidad),
    ];
    const rows = [header.map((h) => h || '')];
    tramos.forEach((tr) => {
        const obsList = tr.observaciones_pivot || [];
        if (!obsList.length) {
            rows.push([
                tr.IdAlojamiento,
                tr.fechavisado || '',
                tr.hastafecha || '',
                tr.NombreCaja || '',
                tr.ubicacionResumen || '',
                '',
                ...cats.map(() => ''),
            ]);
            return;
        }
        obsList.forEach((obs) => {
            rows.push([
                tr.IdAlojamiento,
                tr.fechavisado || '',
                tr.hastafecha || '',
                tr.NombreCaja || '',
                tr.ubicacionResumen || '',
                obs.fechaObs || '',
                ...cats.map((c) => obs.valores?.[c.NombreCatAlojUnidad] ?? ''),
            ]);
        });
    });
    return rows;
}

function appendSubjectSheetsToWorkbook(wb, data, exportOpts, t, tm, usedNames, idx) {
    const filtered = filterSingleFichaTramos(JSON.parse(JSON.stringify(data)), exportOpts.tramoScope || 'todos');
    const mode = exportOpts.mode || 'full';
    const idLab = filtered.sujeto?.IdUnidadAlojamiento || idx;
    const base = excelSheetName(`S${idLab}`, `Sujeto_${idx}`);

    const addSheet = (suffix, rows, fallback) => {
        let name = excelSheetName(`${base}_${suffix}`, fallback);
        let n = 1;
        while (usedNames.has(name)) {
            n += 1;
            name = excelSheetName(`${base}_${suffix}_${n}`, `${fallback}_${n}`);
        }
        usedNames.add(name);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
    };

    addSheet('Res', buildResumenRows(filtered, t, tm), 'Resumen');
    const inicio = buildInicioRows(filtered, t);
    if (inicio) addSheet('Ini', inicio, 'Inicio');
    if (mode === 'full') addSheet('Traz', buildTrazabilidadRows(filtered, t, tm), 'Trazabilidad');
}

function buildFichaExcelWorkbook(data, exportOpts) {
    const t = window.txt?.alojamientos || {};
    const tm = window.txt?.misalojamientos || {};
    const wb = XLSX.utils.book_new();
    const usedNames = new Set();
    const subjects = collectFichaSubjects(data);
    if (!subjects.length) {
        appendSubjectSheetsToWorkbook(wb, data, exportOpts, t, tm, usedNames, 1);
    } else {
        subjects.forEach((fd, i) => appendSubjectSheetsToWorkbook(wb, fd, exportOpts, t, tm, usedNames, i + 1));
    }
    return wb;
}

async function writeExcelWorkbook(wb, filename) {
    await ensureXlsx();
    window.XLSX.writeFile(wb, filename);
}

async function resolveExportOptions(t, data, format, preset) {
    if (preset && typeof preset === 'object') return preset;
    return pickFichaExportOptions(t, {
        format,
        allowTramoScope: allowTramoScopePicker(data),
    });
}

async function renderPdfFromDom(dom, filename) {
    mountDomForPdf(dom);
    domOffsetForceReflow(dom);
    await waitNextFrame();
    const opt = {
        margin: 10,
        filename,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            scrollX: 0,
            scrollY: 0,
            windowWidth: dom.scrollWidth || 794,
            windowHeight: dom.scrollHeight || undefined,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
    };
    await window.html2pdf().set(opt).from(dom).save();
    dom.remove();
}

function sexoSujetoLabel(code, t) {
    const u = String(code ?? '').toUpperCase().trim();
    if (u === 'M') return t.trace_sexo_macho || 'M';
    if (u === 'H' || u === 'F') return t.trace_sexo_hembra || 'H';
    if (u === 'I') return t.trace_sexo_indistinto || 'I';
    return String(code ?? '').trim();
}

/** Líneas de ficha biológica por fila de unidad (un tramo). */
function htmlDatosSujetoTramo(row, t) {
    const parts = [];
    const cx = row.con_cirugia === 1 || row.con_cirugia === '1' || row.con_cirugia === true;
    if (cx) {
        parts.push(`<span class="badge bg-warning text-dark me-2">${esc(t.animal_ficha_con_cirugia_badge || '')}</span>`);
    }
    if (row.PesoSujetoKg !== null && row.PesoSujetoKg !== undefined && String(row.PesoSujetoKg).trim() !== '') {
        parts.push(`<span class="me-2"><strong>${esc(t.animal_ficha_peso || 'Peso')}</strong>: ${esc(String(row.PesoSujetoKg))}</span>`);
    }
    if (row.FechaNacimientoSujeto) {
        parts.push(`<span class="me-2"><strong>${esc(t.animal_ficha_nacimiento || '')}</strong>: ${esc(String(row.FechaNacimientoSujeto).slice(0, 10))}</span>`);
    }
    if (row.SexoSujeto) {
        parts.push(`<span class="me-2"><strong>${esc(t.animal_ficha_sexo || '')}</strong>: ${esc(sexoSujetoLabel(row.SexoSujeto, t))}</span>`);
    }
    const razaBits = [];
    if (row.SubespecieNombreSujeto) razaBits.push(String(row.SubespecieNombreSujeto));
    if (row.CategoriaRazaSujeto && !razaBits.includes(String(row.CategoriaRazaSujeto))) {
        razaBits.push(String(row.CategoriaRazaSujeto));
    }
    if (row.CepaNombreSujeto && !razaBits.includes(String(row.CepaNombreSujeto))) {
        razaBits.push(String(row.CepaNombreSujeto));
    }
    if (razaBits.length) {
        parts.push(`<span class="me-2"><strong>${esc(t.animal_ficha_subespecie || '')}</strong>: ${esc(razaBits.join(' · '))}</span>`);
    }
    if (!parts.length) {
        return '';
    }
    return `<p class="small mb-2 text-secondary border-start border-3 border-secondary ps-2">${esc(t.animal_ficha_tramo_datos_sujeto || '')}: ${parts.join(' ')}</p>`;
}

function renderPivotRows(obsPivot, categorias) {
    const t = window.txt?.alojamientos || {};
    if (!obsPivot || obsPivot.length === 0) {
        return `<tr><td colspan="${(categorias?.length || 0) + 1}" class="text-muted">${esc(t.animal_ficha_sin_registros || '—')}</td></tr>`;
    }
    return obsPivot.map((row) => `
        <tr>
            <td class="fw-bold">${esc(row.fechaObs || '')}</td>
            ${(categorias || []).map((c) => `<td>${esc(row.valores?.[c.NombreCatAlojUnidad] ?? '—')}</td>`).join('')}
        </tr>
    `).join('');
}

function htmlValoresInicio(catsInicio, vin, t) {
    if (!catsInicio || !catsInicio.length) {
        return '';
    }
    const rows = catsInicio
        .map((c) => {
            const o = vin[c.IdDatosUnidadAloj] || vin[String(c.IdDatosUnidadAloj)];
            const v = o && o.Valor != null && o.Valor !== '' ? String(o.Valor) : '';
            if (!v) {
                return '';
            }
            return `<tr><td class="text-muted small">${esc(c.NombreCatAlojUnidad)}</td><td class="small">${esc(v)}</td></tr>`;
        })
        .filter(Boolean)
        .join('');
    if (!rows) {
        return '';
    }
    return `<div class="mt-2 mb-3"><h6 class="fw-bold small">${esc(t.animal_ficha_bloque_inicio || '')}</h6><table class="table table-sm table-bordered mb-0" style="font-size:11px">${rows}</table></div>`;
}

function htmlCobroModoBadge(data, t) {
    if (!data?.trazabilidad_habilitada) return '';
    const isSujeto = data.alojamiento_cobro_modo === 'SUJETO';
    const label = isSujeto
        ? (t.animal_ficha_cobro_sujeto || 'Cobro por sujeto')
        : (t.animal_ficha_cobro_alojamiento || 'Cobro por alojamiento');
    const cls = isSujeto ? 'bg-success' : 'bg-secondary';
    return `<span class="badge ${cls} ms-2 align-middle" style="font-size:11px;">${esc(label)}</span>`;
}

function buildFichaDom(data, options = {}) {
    const mode = options.mode === 'simple' ? 'simple' : 'full';
    const t = window.txt?.alojamientos || {};
    const tm = window.txt?.misalojamientos || {};
    const suj = data.sujeto || {};
    const ult = data.ultimoTramo;
    const tramos = Array.isArray(data.tramos) ? data.tramos : [];
    const cats = data.categorias_datos || data.categorias || [];
    const catsInicio = data.categorias_inicio || [];
    const vin = data.valores_inicio || {};

    const bioSujetoCabecera = htmlDatosSujetoTramo(suj, t);
    const fechaNac = data.fechaNacimientoSugerida
        ? `<p><strong>${esc(t.animal_ficha_fecha_nac_hint || '')}</strong> ${esc(data.fechaNacimientoSugerida)}</p>`
        : '';

    const prot0 = tramos.length ? tramos[0] : null;
    const protLine = prot0 && (prot0.protocolo_titulo || prot0.protocolo_codigo)
        ? `<p class="mb-1"><strong>${esc(t.animal_ficha_protocolo || 'Protocolo')}</strong> ${esc(prot0.protocolo_titulo || '')}${prot0.protocolo_codigo ? ` (${esc(prot0.protocolo_codigo)})` : ''}</p>`
        : '';

    const ultimoBlock = mode === 'full' && ult ? `
        <div class="border rounded p-3 mb-3 bg-light">
            <h6 class="fw-bold text-primary mb-2">${esc(t.animal_ficha_ultimo_aloj || 'Último alojamiento')}</h6>
            <p class="mb-1 small"><strong>${esc(t.animal_ficha_tramo || 'Tramo')}</strong> #${ult.IdAlojamiento} · ${esc(ult.NombreTipoAlojamiento || '')}</p>
            <p class="mb-1 small">${esc(tm.desde || 'Desde')}: ${esc(ult.fechavisado || '')} · ${esc(tm.hasta || 'Hasta')}: ${esc(ult.hastafecha || '—')}</p>
            <p class="mb-1 small"><strong>${esc(ult.NombreTipoAlojamiento || t.type_box || 'Tipo')}</strong>: ${esc(ult.NombreCaja || '—')}</p>
            <p class="mb-1 small"><strong>${esc(t.animal_ficha_ubicacion || 'Ubicación')}</strong>: ${esc(ult.ubicacionResumen || '—')}</p>
            ${ult.aloj_obs ? `<p class="mb-0 small"><strong>${esc(t.animal_ficha_obs_aloj || '')}</strong> ${esc(ult.aloj_obs)}</p>` : ''}
        </div>
    ` : '';

    const tramosHtml = mode === 'full' ? tramos.map((tr, idx) => `
        <div class="mb-4 ${idx > 0 ? 'border-top pt-3' : ''}">
            <h6 class="fw-bold">${esc(t.animal_ficha_tramo || 'Tramo')} #${tr.IdAlojamiento} — ${esc(tr.NombreTipoAlojamiento || '')}</h6>
            <p class="small text-muted mb-2">${esc(tr.fechavisado || '')} → ${esc(tr.hastafecha || '—')} · ${esc(tr.NombreCaja || '')} · ${esc(tr.ubicacionResumen || '')}</p>
            ${tr.aloj_obs ? `<p class="small mb-2"><em>${esc(tr.aloj_obs)}</em></p>` : ''}
            <div class="table-responsive">
                <table class="table table-sm table-bordered" style="font-size:11px">
                    <thead class="table-light">
                        <tr><th>${esc(t.trace_fecha || 'Fecha')}</th>${cats.map((c) => `<th>${esc(c.NombreCatAlojUnidad)}</th>`).join('')}</tr>
                    </thead>
                    <tbody>${renderPivotRows(tr.observaciones_pivot, cats)}</tbody>
                </table>
            </div>
        </div>
    `).join('') : '';

    const pdfTitle = mode === 'simple'
        ? (t.animal_ficha_title_simple || t.animal_ficha_title || 'Ficha del animal')
        : (t.animal_ficha_title || 'Ficha del animal');

    const wrap = document.createElement('div');
    wrap.className = 'animal-ficha-pdf-root';
    wrap.innerHTML = `
        <div class="p-3" style="font-family: Lato, Arial, sans-serif; font-size: 12px; color: #212529;">
            <div class="mb-3 border-bottom pb-2">
                <h4 class="fw-black m-0">${esc(pdfTitle)}${htmlCobroModoBadge(data, t)}</h4>
                <div class="small text-muted">${esc(data.NombreInstitucion || '')}</div>
            </div>
            <div class="row mb-3">
                <div class="col-md-6">
                    <p class="mb-1"><strong>${esc(t.animal_ficha_nombre || 'Nombre')}</strong> ${esc(suj.NombreEspecieAloj)}</p>
                    <p class="mb-1"><strong>${esc(t.animal_ficha_id_sujeto || 'ID sujeto')}</strong> ${esc(String(suj.IdUnidadAlojamiento))}</p>
                    <p class="mb-1"><strong>${esc(t.animal_ficha_especie || 'Especie')}</strong> ${esc(data.NombreEspecie || '—')}</p>
                    ${suj.DetalleEspecieAloj ? `<p class="mb-1"><strong>${esc(t.animal_ficha_detalle || '')}</strong> ${esc(suj.DetalleEspecieAloj)}</p>` : ''}
                    ${bioSujetoCabecera}
                    ${htmlValoresInicio(catsInicio, vin, t)}
                </div>
                <div class="col-md-6">
                    <p class="mb-1"><strong>${esc(t.animal_ficha_historia || 'Historia')}</strong> #${esc(String(data.historia))}</p>
                    ${protLine}
                    <p class="mb-1"><strong>${esc(t.animal_ficha_fecha_inicio || 'Inicio del seguimiento')}</strong> ${esc(data.fechaInicioSeguimiento || '—')}</p>
                    ${fechaNac}
                </div>
            </div>
            ${mode === 'full' ? `<p class="small text-muted mb-2">${esc(t.animal_ficha_ideas_hint || '')}</p>` : ''}
            ${ultimoBlock}
            ${mode === 'full' ? `<div style="page-break-before: always;"></div>
            <h5 class="fw-bold border-bottom pb-2 mb-3">${esc(t.animal_ficha_trazabilidad || 'Trazabilidad completa')}</h5>
            ${tramosHtml || `<p class="text-muted">${esc(t.animal_ficha_sin_tramos || '—')}</p>`}` : ''}
            <div class="mt-4 pt-2 border-top small text-muted">${esc(t.animal_ficha_pdf_footer || '')}</div>
        </div>
    `;
    return wrap;
}

/** Clona el bloque interior (.p-3) de una ficha individual para incrustar en PDF agregado. */
function cloneFichaInnerBlock(dom) {
    const p = dom.querySelector('.p-3');
    return p ? p.cloneNode(true) : dom.cloneNode(true);
}

function countAggregateSubjects(data) {
    if (data.scope === 'caja') return (data.fichasSujetos || []).length;
    if (data.scope === 'alojamiento') {
        return (data.grupos || []).reduce((n, g) => n + (g.fichasSujetos || []).length, 0);
    }
    return 0;
}

/** Ficha PDF/modal: varios sujetos (alcance caja o tramo completo). */
function buildFichaDomAggregate(data, options = {}) {
    const t = window.txt?.alojamientos || {};
    const wrap = document.createElement('div');
    wrap.className = 'animal-ficha-pdf-root';
    const shell = document.createElement('div');
    shell.className = 'p-3';
    shell.style.fontFamily = 'Lato, Arial, sans-serif';
    shell.style.fontSize = '12px';

    if (data.scope === 'caja') {
        const head = document.createElement('div');
        head.className = 'mb-3 border-bottom pb-2';
        head.innerHTML = `<h4 class="fw-black m-0">${esc(t.animal_ficha_scope_caja || '')}</h4>
            <div class="small text-muted">${esc(data.NombreInstitucion || '')}</div>
            <p class="mb-0 mt-2 small"><strong>${esc(t.animal_ficha_caja || '')}</strong> ${esc(data.NombreCaja || '')}
            · <strong>${esc(t.animal_ficha_historia || '')}</strong> #${esc(String(data.historia))}
            · <strong>${esc(t.animal_ficha_tramo || '')}</strong> #${esc(String(data.IdAlojamiento))}
            · <strong>${esc(t.animal_ficha_especie || '')}</strong> ${esc(data.NombreEspecie || '')}</p>`;
        shell.appendChild(head);
        const list = data.fichasSujetos || [];
        if (!list.length) {
            const pEl = document.createElement('p');
            pEl.className = 'text-muted';
            pEl.textContent = t.animal_ficha_empty_caja || '';
            shell.appendChild(pEl);
        } else {
            list.forEach((fd, i) => {
                const block = document.createElement('div');
                block.className = i > 0 ? 'mt-4 pt-3' : 'mt-3';
                if (i > 0) block.style.pageBreakBefore = 'always';
                block.appendChild(cloneFichaInnerBlock(buildFichaDom(fd, options)));
                shell.appendChild(block);
            });
        }
    } else if (data.scope === 'alojamiento') {
        const head = document.createElement('div');
        head.className = 'mb-3 border-bottom pb-2';
        head.innerHTML = `<h4 class="fw-black m-0">${esc(t.animal_ficha_scope_alojamiento || '')}</h4>
            <div class="small text-muted">${esc(data.NombreInstitucion || '')}</div>
            <p class="mb-0 mt-2 small"><strong>${esc(t.animal_ficha_tramo || '')}</strong> #${esc(String(data.IdAlojamiento))}
            · <strong>${esc(t.animal_ficha_historia || '')}</strong> #${esc(String(data.historia))}
            · <strong>${esc(t.animal_ficha_especie || '')}</strong> ${esc(data.NombreEspecie || '')}</p>`;
        shell.appendChild(head);
        const grupos = data.grupos || [];
        if (!countAggregateSubjects(data)) {
            const pEl = document.createElement('p');
            pEl.className = 'text-muted';
            pEl.textContent = t.animal_ficha_empty_aloj || '';
            shell.appendChild(pEl);
        } else {
            grupos.forEach((g, gi) => {
                const gh = document.createElement('div');
                gh.className = gi === 0 ? 'mt-3 mb-2' : 'mt-4 mb-2 pt-3 border-top';
                if (gi > 0) gh.style.pageBreakBefore = 'always';
                gh.innerHTML = `<h5 class="fw-bold text-primary border-bottom pb-1 mb-2"><i class="bi bi-box-seam me-1"></i>${esc(t.animal_ficha_caja || '')}: ${esc(g.NombreCaja || '')}</h5>`;
                shell.appendChild(gh);
                const sujetos = g.fichasSujetos || [];
                if (!sujetos.length) {
                    const emp = document.createElement('p');
                    emp.className = 'small text-muted mb-3';
                    emp.textContent = t.animal_ficha_caja_sin_sujetos || '';
                    shell.appendChild(emp);
                    return;
                }
                sujetos.forEach((fd, j) => {
                    const block = document.createElement('div');
                    block.className = j > 0 ? 'mt-4 pt-3' : '';
                    if (j > 0) block.style.pageBreakBefore = 'always';
                    block.appendChild(cloneFichaInnerBlock(buildFichaDom(fd, options)));
                    shell.appendChild(block);
                });
            });
        }
    } else {
        shell.innerHTML = `<p class="text-muted">${esc(t.animal_ficha_error || '')}</p>`;
    }

    wrap.appendChild(shell);
    return wrap;
}

async function fetchFicha(idEspecieAlojUnidad) {
    return API.request(`/trazabilidad/ficha-animal?idEspecieAlojUnidad=${encodeURIComponent(String(idEspecieAlojUnidad))}`, 'GET');
}

async function fetchFichaCaja(idCajaAlojamiento) {
    return API.request(`/trazabilidad/ficha-animal?idCajaAlojamiento=${encodeURIComponent(String(idCajaAlojamiento))}`, 'GET');
}

async function fetchFichaAlojamiento(idAlojamiento) {
    return API.request(`/trazabilidad/ficha-animal?idAlojamiento=${encodeURIComponent(String(idAlojamiento))}`, 'GET');
}

export const AnimalFichaUI = {
    async open(idEspecieAlojUnidad) {
        const t = window.txt?.alojamientos || {};
        const tm = window.txt?.misalojamientos || {};
        const Swal = window.Swal;
        if (typeof Swal === 'undefined') {
            window.alert(t.animal_ficha_error || 'Error');
            return;
        }
        Swal.fire({
            title: t.animal_ficha_loading || '...',
            didOpen: () => Swal.showLoading(),
            allowOutsideClick: false,
            target: document.getElementById('modal-historial') || document.body,
        });
        try {
            const res = await fetchFicha(idEspecieAlojUnidad);
            Swal.close();
            if (res.status !== 'success' || !res.data) {
                throw new Error(res.message || t.animal_ficha_error || '');
            }
            const dom = buildFichaDom(res.data);
            const toolbarId = `ficha-export-${idEspecieAlojUnidad}-${Date.now()}`;
            const html = buildFichaExportToolbarHtml(t, toolbarId) + dom.outerHTML;
            const idAloj = parseInt(res.data.IdAlojamientoFicha, 10) || 0;
            const idEsp = parseInt(res.data.IdEspecieFicha, 10) || 0;
            const traceUi = window.TrazabilidadUI;
            const canModificar = typeof traceUi?.openSubjectInicioConfig === 'function'
                && !traceUi?.isReadOnly
                && idAloj > 0
                && idEsp > 0;

            const result = await Swal.fire({
                title: '',
                html,
                width: 'min(920px, 96vw)',
                showConfirmButton: true,
                confirmButtonText: tm.cerrar || window.txt?.comunicacion?.modal_cerrar || 'Cerrar',
                showDenyButton: false,
                showCancelButton: canModificar,
                cancelButtonText: t.animal_ficha_modal_modificar_inicio || t.trace_inicio_title || '',
                reverseButtons: true,
                focusConfirm: false,
                customClass: { htmlContainer: 'text-start' },
                target: document.getElementById('modal-historial') || document.body,
                didOpen: () => {
                    wireExportToolbar(toolbarId, {
                        pdf: () => AnimalFichaUI.downloadPdf(idEspecieAlojUnidad),
                        excel: () => AnimalFichaUI.downloadExcel(idEspecieAlojUnidad),
                    });
                },
            });

            const Dr = window.Swal?.DismissReason;
            const fueCancel = result.dismiss === (Dr?.cancel ?? 'cancel');
            if (canModificar && fueCancel) {
                await traceUi.openSubjectInicioConfig(idEspecieAlojUnidad, idAloj, idEsp);
            }
        } catch (e) {
            Swal.close();
            Swal.fire({ icon: 'error', text: String(e.message || e), target: document.getElementById('modal-historial') || document.body });
        }
    },

    async openCaja(idCajaAlojamiento) {
        const t = window.txt?.alojamientos || {};
        const tm = window.txt?.misalojamientos || {};
        const Swal = window.Swal;
        if (typeof Swal === 'undefined') {
            window.alert(t.animal_ficha_error || 'Error');
            return;
        }
        Swal.fire({
            title: t.animal_ficha_loading || '...',
            didOpen: () => Swal.showLoading(),
            allowOutsideClick: false,
            target: document.getElementById('modal-historial') || document.body,
        });
        try {
            const res = await fetchFichaCaja(idCajaAlojamiento);
            Swal.close();
            if (res.status !== 'success' || !res.data) {
                throw new Error(res.message || t.animal_ficha_error || '');
            }
            const dom = buildFichaDomAggregate(res.data);
            const toolbarId = `ficha-export-caja-${idCajaAlojamiento}-${Date.now()}`;
            const html = buildFichaExportToolbarHtml(t, toolbarId) + dom.outerHTML;
            await Swal.fire({
                title: '',
                html,
                width: 'min(920px, 96vw)',
                showConfirmButton: true,
                confirmButtonText: tm.cerrar || window.txt?.comunicacion?.modal_cerrar || 'Cerrar',
                showDenyButton: false,
                showCancelButton: false,
                reverseButtons: true,
                focusConfirm: false,
                customClass: { htmlContainer: 'text-start' },
                target: document.getElementById('modal-historial') || document.body,
                didOpen: () => {
                    wireExportToolbar(toolbarId, {
                        pdf: () => AnimalFichaUI.downloadPdfCaja(idCajaAlojamiento),
                        excel: () => AnimalFichaUI.downloadExcelCaja(idCajaAlojamiento),
                    });
                },
            });
        } catch (e) {
            Swal.close();
            Swal.fire({ icon: 'error', text: String(e.message || e), target: document.getElementById('modal-historial') || document.body });
        }
    },

    async openAlojamiento(idAlojamiento) {
        const t = window.txt?.alojamientos || {};
        const tm = window.txt?.misalojamientos || {};
        const Swal = window.Swal;
        if (typeof Swal === 'undefined') {
            window.alert(t.animal_ficha_error || 'Error');
            return;
        }
        Swal.fire({
            title: t.animal_ficha_loading || '...',
            didOpen: () => Swal.showLoading(),
            allowOutsideClick: false,
            target: document.getElementById('modal-historial') || document.body,
        });
        try {
            const res = await fetchFichaAlojamiento(idAlojamiento);
            Swal.close();
            if (res.status !== 'success' || !res.data) {
                throw new Error(res.message || t.animal_ficha_error || '');
            }
            const dom = buildFichaDomAggregate(res.data);
            const toolbarId = `ficha-export-aloj-${idAlojamiento}-${Date.now()}`;
            const html = buildFichaExportToolbarHtml(t, toolbarId) + dom.outerHTML;
            await Swal.fire({
                title: '',
                html,
                width: 'min(920px, 96vw)',
                showConfirmButton: true,
                confirmButtonText: tm.cerrar || window.txt?.comunicacion?.modal_cerrar || 'Cerrar',
                showDenyButton: false,
                showCancelButton: false,
                reverseButtons: true,
                focusConfirm: false,
                customClass: { htmlContainer: 'text-start' },
                target: document.getElementById('modal-historial') || document.body,
                didOpen: () => {
                    wireExportToolbar(toolbarId, {
                        pdf: () => AnimalFichaUI.downloadPdfAlojamiento(idAlojamiento),
                        excel: () => AnimalFichaUI.downloadExcelAlojamiento(idAlojamiento),
                    });
                },
            });
        } catch (e) {
            Swal.close();
            Swal.fire({ icon: 'error', text: String(e.message || e), target: document.getElementById('modal-historial') || document.body });
        }
    },

    async downloadPdf(idEspecieAlojUnidad, preset) {
        const t = window.txt?.alojamientos || {};
        const Swal = window.Swal;
        try {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ title: t.animal_ficha_generando_pdf || '...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
            }
            const res = await fetchFicha(idEspecieAlojUnidad);
            if (res.status !== 'success' || !res.data) {
                throw new Error(res.message || t.animal_ficha_error || '');
            }
            const exportOpts = await resolveExportOptions(t, res.data, 'pdf', preset);
            if (!exportOpts) {
                if (typeof Swal !== 'undefined') Swal.close();
                return;
            }
            const filtered = filterFichaForExport(res.data, exportOpts);
            await ensureHtml2pdf();
            const dom = buildFichaDom(filtered, { mode: exportOpts.mode });
            await renderPdfFromDom(dom, `ficha-animal-${idEspecieAlojUnidad}.pdf`);
            if (typeof Swal !== 'undefined') Swal.close();
        } catch (e) {
            if (typeof Swal !== 'undefined') Swal.close();
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', text: String(e.message || e) });
            } else {
                window.alert(String(e.message || e));
            }
        }
    },

    async downloadExcel(idEspecieAlojUnidad, preset) {
        const t = window.txt?.alojamientos || {};
        const Swal = window.Swal;
        try {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ title: t.animal_ficha_generando_excel || '...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
            }
            const res = await fetchFicha(idEspecieAlojUnidad);
            if (res.status !== 'success' || !res.data) {
                throw new Error(res.message || t.animal_ficha_error || '');
            }
            const exportOpts = await resolveExportOptions(t, res.data, 'excel', preset);
            if (!exportOpts) {
                if (typeof Swal !== 'undefined') Swal.close();
                return;
            }
            const filtered = filterFichaForExport(res.data, exportOpts);
            const wb = buildFichaExcelWorkbook(filtered, exportOpts);
            await writeExcelWorkbook(wb, `ficha-animal-${idEspecieAlojUnidad}.xlsx`);
            if (typeof Swal !== 'undefined') Swal.close();
        } catch (e) {
            if (typeof Swal !== 'undefined') Swal.close();
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', text: String(e.message || e) });
            } else {
                window.alert(String(e.message || e));
            }
        }
    },

    async downloadPdfCaja(idCajaAlojamiento, preset) {
        const t = window.txt?.alojamientos || {};
        const Swal = window.Swal;
        try {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ title: t.animal_ficha_generando_pdf || '...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
            }
            const res = await fetchFichaCaja(idCajaAlojamiento);
            if (res.status !== 'success' || !res.data) {
                throw new Error(res.message || t.animal_ficha_error || '');
            }
            const exportOpts = await resolveExportOptions(t, res.data, 'pdf', preset);
            if (!exportOpts) {
                if (typeof Swal !== 'undefined') Swal.close();
                return;
            }
            const filtered = filterFichaForExport(res.data, exportOpts);
            await ensureHtml2pdf();
            const dom = buildFichaDomAggregate(filtered, { mode: exportOpts.mode });
            await renderPdfFromDom(dom, `ficha-caja-${idCajaAlojamiento}.pdf`);
            if (typeof Swal !== 'undefined') Swal.close();
        } catch (e) {
            if (typeof Swal !== 'undefined') Swal.close();
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', text: String(e.message || e) });
            } else {
                window.alert(String(e.message || e));
            }
        }
    },

    async downloadExcelCaja(idCajaAlojamiento, preset) {
        const t = window.txt?.alojamientos || {};
        const Swal = window.Swal;
        try {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ title: t.animal_ficha_generando_excel || '...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
            }
            const res = await fetchFichaCaja(idCajaAlojamiento);
            if (res.status !== 'success' || !res.data) {
                throw new Error(res.message || t.animal_ficha_error || '');
            }
            const exportOpts = await resolveExportOptions(t, res.data, 'excel', preset);
            if (!exportOpts) {
                if (typeof Swal !== 'undefined') Swal.close();
                return;
            }
            const filtered = filterFichaForExport(res.data, exportOpts);
            const wb = buildFichaExcelWorkbook(filtered, exportOpts);
            await writeExcelWorkbook(wb, `ficha-caja-${idCajaAlojamiento}.xlsx`);
            if (typeof Swal !== 'undefined') Swal.close();
        } catch (e) {
            if (typeof Swal !== 'undefined') Swal.close();
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', text: String(e.message || e) });
            } else {
                window.alert(String(e.message || e));
            }
        }
    },

    async downloadPdfAlojamiento(idAlojamiento, preset) {
        const t = window.txt?.alojamientos || {};
        const Swal = window.Swal;
        try {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ title: t.animal_ficha_generando_pdf || '...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
            }
            const res = await fetchFichaAlojamiento(idAlojamiento);
            if (res.status !== 'success' || !res.data) {
                throw new Error(res.message || t.animal_ficha_error || '');
            }
            const exportOpts = await resolveExportOptions(t, res.data, 'pdf', preset);
            if (!exportOpts) {
                if (typeof Swal !== 'undefined') Swal.close();
                return;
            }
            const filtered = filterFichaForExport(res.data, exportOpts);
            await ensureHtml2pdf();
            const dom = buildFichaDomAggregate(filtered, { mode: exportOpts.mode });
            await renderPdfFromDom(dom, `ficha-alojamiento-${idAlojamiento}.pdf`);
            if (typeof Swal !== 'undefined') Swal.close();
        } catch (e) {
            if (typeof Swal !== 'undefined') Swal.close();
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', text: String(e.message || e) });
            } else {
                window.alert(String(e.message || e));
            }
        }
    },

    async downloadExcelAlojamiento(idAlojamiento, preset) {
        const t = window.txt?.alojamientos || {};
        const Swal = window.Swal;
        try {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ title: t.animal_ficha_generando_excel || '...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
            }
            const res = await fetchFichaAlojamiento(idAlojamiento);
            if (res.status !== 'success' || !res.data) {
                throw new Error(res.message || t.animal_ficha_error || '');
            }
            const exportOpts = await resolveExportOptions(t, res.data, 'excel', preset);
            if (!exportOpts) {
                if (typeof Swal !== 'undefined') Swal.close();
                return;
            }
            const filtered = filterFichaForExport(res.data, exportOpts);
            const wb = buildFichaExcelWorkbook(filtered, exportOpts);
            await writeExcelWorkbook(wb, `ficha-alojamiento-${idAlojamiento}.xlsx`);
            if (typeof Swal !== 'undefined') Swal.close();
        } catch (e) {
            if (typeof Swal !== 'undefined') Swal.close();
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', text: String(e.message || e) });
            } else {
                window.alert(String(e.message || e));
            }
        }
    },
};

export default AnimalFichaUI;
