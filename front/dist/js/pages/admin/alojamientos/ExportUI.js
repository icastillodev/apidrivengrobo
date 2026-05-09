// dist/js/pages/admin/alojamientos/ExportUI.js
import { API } from '../../../api.js';
import { AlojamientoState } from '../alojamientos.js';

function formatCajaUbicacionTxt(caja) {
    const parts = [];
    if (caja.nombre_ubicacion_fisica) parts.push(String(caja.nombre_ubicacion_fisica).trim());
    if (caja.nombre_salon) parts.push(String(caja.nombre_salon).trim());
    if (caja.nombre_rack) parts.push(String(caja.nombre_rack).trim());
    if (caja.nombre_lugar_rack) parts.push(String(caja.nombre_lugar_rack).trim());
    if (caja.ComentarioUbicacion && String(caja.ComentarioUbicacion).trim()) {
        parts.push(String(caja.ComentarioUbicacion).trim());
    }
    if (!parts.length && caja.Detalle) return String(caja.Detalle).trim();
    return parts.filter(Boolean).join(' · ');
}

function escapePdfHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Ordena filas de valores_inicio según categorias_inicio (IdDatosUnidadAloj), resto alfabético. */
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

function pickValorInicio(valoresInicioObj, idDatos) {
    if (!valoresInicioObj || idDatos === undefined || idDatos === null || Number.isNaN(Number(idDatos))) {
        return null;
    }
    const id = Number(idDatos);
    return valoresInicioObj[id] ?? valoresInicioObj[String(id)] ?? null;
}

function formatInicioCellVal(vi) {
    if (!vi) return '---';
    const v = vi.Valor;
    if (v === null || v === undefined || String(v).trim() === '') return '---';
    return v;
}

/** Columnas planas para Excel: prefijo i18n + nombre de categoría (coherente con orden de configuración). */
function excelInicioColumnsForUnidad(u, categoriasInicio, t) {
    const prefix = t.export_excel_inicio_prefix || 'Inicio';
    const cells = {};
    const seenIds = new Set();
    (categoriasInicio || []).forEach((cat) => {
        const id = Number(cat.IdDatosUnidadAloj);
        if (Number.isNaN(id)) return;
        seenIds.add(id);
        const vi = pickValorInicio(u.valores_inicio, id);
        cells[`${prefix}: ${cat.NombreCatAlojUnidad}`] = formatInicioCellVal(vi);
    });
    valoresInicioOrdered(u.valores_inicio, []).forEach((r) => {
        const id = Number(r.IdDatosUnidadAloj);
        if (seenIds.has(id)) return;
        seenIds.add(id);
        cells[`${prefix}: ${r.NombreCatAlojUnidad}`] = formatInicioCellVal(r);
    });
    return cells;
}

function unidadTieneValoresInicio(u) {
    return Object.keys(u.valores_inicio || {}).length > 0;
}

export const ExportUI = {
    init() {
        window.exportarFichaPDF = this.downloadAlojamientoPDF.bind(this);
        window.exportExcelAlojamientos = this.processExcelExportAlojamientos.bind(this);
    },

    // -------------------------------------------------------------
    // 1. PDF DE LA FICHA HISTÓRICA (Perfecto, sin cambios)
    // -------------------------------------------------------------
    async downloadAlojamientoPDF() {
        const historyData = AlojamientoState.currentHistoryData;
        const t = window.txt?.alojamientos || {};
        if (!historyData || historyData.length === 0) return Swal.fire('Error', t.export_no_historia || 'No hay una historia abierta para exportar.', 'error');
        
        const first = historyData[0];
        const historiaId = first.historia;
        const instId = localStorage.getItem('instId_temp_qr') || localStorage.getItem('instId') || 1;
        const instName = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();

        const { value: options } = await Swal.fire({
            title: t.export_pdf_title || t.exp_title || 'Exportar PDF',
            html: `
                <div class="text-start p-3 bg-light border rounded">
                    <p class="small text-muted mb-3">${t.export_select_info || 'Seleccione qué información incluir:'}</p>
                    <div class="form-check form-switch mb-2">
                        <input class="form-check-input" type="checkbox" id="chk-aloj" checked>
                        <label class="form-check-label fw-bold small">${t.exp_opt_aloj || 'Tramos de Alojamiento'}</label>
                    </div>
                    <div class="form-check form-switch mb-2">
                        <input class="form-check-input" type="checkbox" id="chk-traz" checked>
                        <label class="form-check-label fw-bold small text-primary">${t.exp_opt_traz || 'Trazabilidad Clínica de los Animales'}</label>
                    </div>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="chk-precio" checked>
                        <label class="form-check-label fw-bold small text-success">${t.exp_opt_precio || 'Información Financiera'}</label>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: `<i class="bi bi-file-pdf"></i> ${t.export_btn_doc || 'Generar Documento'}`,
            confirmButtonColor: '#dc3545',
            preConfirm: () => ({
                aloj: document.getElementById('chk-aloj').checked,
                traz: document.getElementById('chk-traz').checked,
                precio: document.getElementById('chk-precio').checked
            })
        });

        if (!options) return;

        const isFinalizado = historyData.some(h => String(h.finalizado) === "1");
        const statusTxt = isFinalizado ? 'FINALIZADO' : 'VIGENTE';

        let tableRows = '';
        let totalDias = 0;
        let totalCosto = 0;

        historyData.forEach(h => {
            const fIni = new Date(h.fechavisado).toLocaleDateString();
            const fFin = h.hastafecha ? new Date(h.hastafecha).toLocaleDateString() : 'Vigente';
            const dias = h.totaldiasdefinidos || 0;
            const cant = h.CantidadCaja || 0;
            const precio = parseFloat(h.PrecioCajaMomento || 0);
            const subtotal = parseFloat(h.totalpago || 0);

            totalDias += parseInt(dias);
            totalCosto += subtotal;

            tableRows += `
                <tr>
                    <td style="padding: 6px; border: 1px solid #ddd;">#${h.IdAlojamiento}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">${fIni} - ${fFin}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">${cant}</td>
                    <td style="padding: 6px; border: 1px solid #ddd;">${dias}</td>
                    ${options.precio ? `<td style="padding: 6px; border: 1px solid #ddd;">$${precio.toFixed(2)}</td>` : ''}
                    ${options.precio ? `<td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; color: #1a5d3b;">$${subtotal.toFixed(2)}</td>` : ''}
                </tr>
            `;
        });

        let trazabilidadHtml = '';
        
        if (options.traz) {
            Swal.fire({ title: t.export_recopilando || 'Recopilando datos clínicos...', text: t.export_esperar || 'Por favor espere.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            
            for (let h of historyData) {
                try {
                    const res = await API.request(`/trazabilidad/get-arbol?idAlojamiento=${h.IdAlojamiento}&idEspecie=${first.TipoAnimal || first.idespA}&instId=${instId}`);
                    
                    if (res.status === 'success' && res.data && res.data.cajas && res.data.cajas.length > 0) {
                        const catsExport = res.data.categorias_datos || res.data.categorias || [];
                        const catsInicio = res.data.categorias_inicio || [];
                        let hasTrazContentInTramo = false;
                        const fechIniTramo = new Date(h.fechavisado).toLocaleDateString();
                        const tramoTitulo = (t.export_pdf_tramo_header || 'TRAMO #{id} ({desde}: {fecha})')
                            .replace('{id}', String(h.IdAlojamiento))
                            .replace('{desde}', t.export_tramo_desde || 'Desde')
                            .replace('{fecha}', fechIniTramo);
                        let tramoHtml = `<div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                            <h5 style="font-size: 11px; background-color: #f0f8ff; padding: 5px; color: #0d6efd; margin-bottom: 8px;">${escapePdfHtml(tramoTitulo)}</h5>`;
                        
                        res.data.cajas.forEach(caja => {
                            const ubiTxt = formatCajaUbicacionTxt(caja);
                            let cajaHtml = `<div style="margin-left: 5px; margin-bottom: 10px;">
                                <strong style="font-size: 10px; color: #444; background: #e9ecef; padding: 2px 5px; border-radius: 3px;">📦 ${escapePdfHtml(caja.NombreCaja)}</strong>`;
                            if (ubiTxt) {
                                cajaHtml += `<div style="font-size: 9px; color: #555; margin-top: 3px;">📍 ${escapePdfHtml(ubiTxt)}</div>`;
                            }
                            
                            let hasContentInCaja = false;

                            if (caja.unidades && caja.unidades.length > 0) {
                                caja.unidades.forEach(u => {
                                    const rowsInicio = valoresInicioOrdered(u.valores_inicio, catsInicio);
                                    const hasInicio = rowsInicio.length > 0;
                                    const hasPivot = u.observaciones_pivot && u.observaciones_pivot.length > 0;
                                    if (!hasInicio && !hasPivot) return;

                                    hasTrazContentInTramo = true;
                                    hasContentInCaja = true;

                                    const thFecha = t.export_pdf_th_fecha || 'Fecha';
                                    const thCampo = t.export_pdf_th_variable || 'Campo';
                                    const thValor = t.export_pdf_th_valor || 'Valor';
                                    const lblInicio = t.export_traz_ficha_inicio || 'Ficha inicial';
                                    const lblMediciones = t.export_traz_mediciones || 'Mediciones clínicas';

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
                                        catsExport.forEach(cat => {
                                            cajaHtml += `<th style="border: 1px solid #ccc; padding: 4px;">${escapePdfHtml(cat.NombreCatAlojUnidad)}</th>`;
                                        });
                                        cajaHtml += `</tr>`;

                                        u.observaciones_pivot.forEach(obs => {
                                            cajaHtml += `<tr><td style="border: 1px solid #ccc; padding: 4px;">${escapePdfHtml(new Date(obs.fechaObs).toLocaleDateString())}</td>`;
                                            catsExport.forEach(cat => {
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
                } catch (e) { console.error("Error", e); }
            }
            Swal.close();

            if (trazabilidadHtml === '') {
                trazabilidadHtml = `<p style="font-size: 11px; font-style: italic; color: #888;">${t.export_sin_variables || 'Los animales no tienen variables clínicas registradas.'}</p>`;
            }
        }

        const pdfTemplate = `
            <div style="font-family: Arial, sans-serif; color: #333; padding: 15px; background: #ffffff;">
                <div style="text-align: center; border-bottom: 2px solid #0d6efd; padding-bottom: 10px; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: #0d6efd;">GROBO - ${instName}</h2>
                    <h4 style="margin: 5px 0;">${t.export_ficha_tecnica || 'FICHA TÉCNICA: ALOJAMIENTO ANIMAL'}</h4>
                    <p style="margin: 0; font-size: 11px; color: #666;">Historia #${historiaId} | Generado: ${new Date().toLocaleString()}</p>
                </div>

                <div style="margin-bottom: 20px;">
                    <p style="margin: 5px 0;"><strong>Investigador:</strong> ${first.Investigador}</p>
                    <p style="margin: 5px 0;"><strong>Protocolo:</strong> [${first.nprotA}] ${first.tituloA || ''}</p>
                    <p style="margin: 15px 0; font-size: 14px;"><strong>${t.export_estado_estadia || 'ESTADO DE ESTADÍA:'}</strong> <span style="color: ${isFinalizado ? '#dc3545' : '#198754'}; font-weight: bold;">${statusTxt}</span></p>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; width: 50%;"><strong>Especie:</strong><br>${first.EspeNombreA}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Estructura Física:</strong><br>${first.NombreTipoAlojamiento || 'Caja'}</td>
                    </tr>
                </table>

                ${options.aloj ? `
                <p style="font-size: 12px; font-weight: bold; margin-bottom: 5px; color: #444;">${t.export_tramos_label || 'TRAMOS DE ALOJAMIENTO (Contabilidad):'}</p>
                <table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px; font-size: 11px;">
                    <tr style="background-color: #f2f2f2;">
                        <th style="padding: 6px; border: 1px solid #ddd;">ID</th>
                        <th style="padding: 6px; border: 1px solid #ddd;">Periodo</th>
                        <th style="padding: 6px; border: 1px solid #ddd;">Cant.</th>
                        <th style="padding: 6px; border: 1px solid #ddd;">Días</th>
                        ${options.precio ? `<th style="padding: 6px; border: 1px solid #ddd; background-color: #e9f5ee;">Precio Unit.</th>` : ''}
                        ${options.precio ? `<th style="padding: 6px; border: 1px solid #ddd; background-color: #e9f5ee;">Subtotal</th>` : ''}
                    </tr>
                    ${tableRows}
                    <tr style="background-color: #f2f2f2; font-weight: bold;">
                        <td colspan="3" style="text-align: right; padding: 8px; border: 1px solid #ddd;">${t.export_totales || 'TOTALES GLOBALES:'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${totalDias} ${t.days_suffix || 'Días'}</td>
                        ${options.precio ? `<td colspan="2" style="padding: 8px; border: 1px solid #ddd; color: #1a5d3b; font-size: 14px;">$${totalCosto.toFixed(2)}</td>` : ''}
                    </tr>
                </table>
                ` : ''}

                ${options.traz ? `
                <div style="border-top: 2px solid #eee; padding-top: 15px; background: #ffffff; padding: 10px;">
                    <p style="font-size: 13px; font-weight: bold; color: #0d6efd; border-bottom: 1px solid #0d6efd; padding-bottom: 5px; margin-bottom: 15px;">
                        ${escapePdfHtml(t.export_traz_section_title || 'TRAZABILIDAD Y CONSTANTES CLÍNICAS')}
                    </p>
                    ${trazabilidadHtml}
                </div>
                ` : ''}
            </div>
        `;

        const opt = { 
            margin: [18, 18, 18, 18], 
            filename: `Alojamiento_H${historiaId}.pdf`, 
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            html2canvas: { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true }
        };
        
        window.html2pdf().set(opt).from(pdfTemplate).save();
    },

    // -------------------------------------------------------------
    // 2. EXCEL GLOBAL PLANO (Todos los datos cruzados en una hoja)
    // -------------------------------------------------------------
    async processExcelExportAlojamientos() {
        const t = window.txt?.alojamientos || {};
        if (typeof XLSX === 'undefined') {
            return Swal.fire('Error', t.export_sheetjs_error || 'La librería SheetJS no está cargada. Asegúrese de mantener el script en el HTML.', 'error');
        }

        const instId = localStorage.getItem('instId') || 1;
        const instName = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
        
        const { value: options } = await Swal.fire({
            title: t.exp_title || 'Exportar Base de Datos (Excel)',
            html: `
                <div class="text-start p-3 bg-light border rounded mb-3">
                    <label class="small fw-bold">${t.export_fecha_inicio || 'Fecha Inicio'}</label>
                    <input type="date" id="exc-start" class="form-control form-control-sm mb-2">
                    <label class="small fw-bold">${t.export_fecha_fin || 'Fecha Fin'}</label>
                    <input type="date" id="exc-end" class="form-control form-control-sm mb-3 border-bottom pb-3">
                    
                    <div class="form-check form-switch mb-2">
                        <input class="form-check-input" type="checkbox" id="chk-exc-traz" checked>
                        <label class="form-check-label fw-bold small text-primary">${t.export_detallar_clinica || 'Detallar Clínica por Animal (Filas Múltiples)'}</label>
                    </div>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="chk-exc-precio" checked>
                        <label class="form-check-label fw-bold small text-success">${t.exp_opt_precio || 'Incluir Costos'}</label>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-file-earmark-spreadsheet"></i> ' + (t.export_descargar_data || 'Descargar Data'),
            confirmButtonColor: '#198754',
            preConfirm: () => {
                const s = document.getElementById('exc-start').value;
                const e = document.getElementById('exc-end').value;
                if (!s || !e) { Swal.showValidationMessage(t.export_fechas_obligatorias || 'Ambas fechas son obligatorias'); return false; }
                return { 
                    start: s, 
                    end: e, 
                    traz: document.getElementById('chk-exc-traz').checked,
                    precio: document.getElementById('chk-exc-precio').checked 
                }
            }
        });

        if (!options) return;

        let data = AlojamientoState.dataFull || [];
        data = data.filter(r => r.fechavisado >= options.start && r.fechavisado <= options.end);

        if (data.length === 0) {
            return Swal.fire(t.export_sin_resultados || 'Sin resultados', t.export_sin_alojamientos_fechas || 'No hay alojamientos en esas fechas.', 'info');
        }

        Swal.fire({ 
            title: t.export_procesando || 'Procesando...', 
            text: t.export_cruzando || 'Cruzando datos administrativos y clínicos.', 
            allowOutsideClick: false, 
            didOpen: () => Swal.showLoading() 
        });

        // Aquí guardaremos todas las filas que irán a Excel
        let allRows = [];

        const colUbic = t.export_col_ubicacion_caja || 'Ubicación caja';

        for (let r of data) {
            // Estructura base de la fila (Datos del Alojamiento)
            let baseRow = {
                "Historia ID": r.historia,
                "Tramo ID": r.IdAlojamiento,
                "Protocolo": r.nprotA || '---',
                "Investigador": r.Investigador || '---',
                "Especie": r.EspeNombreA || '---',
                "Tipo Alojamiento": r.NombreTipoAlojamiento || 'Caja',
                "Cant. Cajas": r.CantidadCaja || 0,
                "Ingreso": r.fechavisado,
                "Retiro": r.hastafecha || 'Vigente',
                "Días Estadía": r.totaldiasdefinidos || 0,
                "Estado": r.finalizado == 1 ? 'FINALIZADO' : 'VIGENTE'
            };

            if (options.precio) {
                baseRow["Precio Unitario"] = parseFloat(r.PrecioCajaMomento || 0);
                baseRow["Costo Subtotal"] = parseFloat(r.totalpago || 0);
            }

            if (options.traz) {
                baseRow["Nota Administrativa"] = r.observaciones || '---';
                let hasTrazRows = false;
                const sinRegTxt = t.export_excel_sin_registro_clinico || 'Sin registro clínico';
                const soloInicioTxt = t.export_excel_solo_inicio || '(Solo ficha inicial)';

                try {
                    const res = await API.request(`/trazabilidad/get-arbol?idAlojamiento=${r.IdAlojamiento}&idEspecie=${r.TipoAnimal || r.idespA}&instId=${instId}`);

                    if (res.status === 'success' && res.data && res.data.cajas) {
                        const categorias = res.data.categorias_datos || res.data.categorias || [];
                        const categoriasInicio = res.data.categorias_inicio || [];

                        res.data.cajas.forEach(c => {
                            if (c.unidades) {
                                c.unidades.forEach(u => {
                                    const inicioCols = excelInicioColumnsForUnidad(u, categoriasInicio, t);
                                    const hasPivot = u.observaciones_pivot && u.observaciones_pivot.length > 0;
                                    const hasInicio = unidadTieneValoresInicio(u);

                                    if (hasPivot) {
                                        hasTrazRows = true;
                                        u.observaciones_pivot.forEach(obs => {
                                            let clinRow = { ...baseRow, ...inicioCols };
                                            clinRow["Caja Física"] = c.NombreCaja;
                                            clinRow[colUbic] = formatCajaUbicacionTxt(c) || '---';
                                            clinRow["Sujeto / Animal"] = u.NombreEspecieAloj;
                                            clinRow["Fecha de Medición"] = new Date(obs.fechaObs).toLocaleDateString();

                                            categorias.forEach(cat => {
                                                clinRow[cat.NombreCatAlojUnidad] = (obs.valores && obs.valores[cat.NombreCatAlojUnidad]) || '---';
                                            });

                                            allRows.push(clinRow);
                                        });
                                    } else if (hasInicio) {
                                        hasTrazRows = true;
                                        let clinRow = { ...baseRow, ...inicioCols };
                                        clinRow["Caja Física"] = c.NombreCaja;
                                        clinRow[colUbic] = formatCajaUbicacionTxt(c) || '---';
                                        clinRow["Sujeto / Animal"] = u.NombreEspecieAloj;
                                        clinRow["Fecha de Medición"] = soloInicioTxt;
                                        categorias.forEach(cat => {
                                            clinRow[cat.NombreCatAlojUnidad] = '---';
                                        });
                                        allRows.push(clinRow);
                                    }
                                });
                            }
                        });
                    }
                } catch(e) { console.error("Fallo al traer trazabilidad", e); }

                if (!hasTrazRows) {
                    let emptyRow = { ...baseRow };
                    emptyRow["Caja Física"] = sinRegTxt;
                    emptyRow[colUbic] = '---';
                    emptyRow["Sujeto / Animal"] = "---";
                    emptyRow["Fecha de Medición"] = "---";
                    allRows.push(emptyRow);
                }
            } else {
                // Si el usuario NO pidió trazabilidad, solo exportamos la fila administrativa
                baseRow["Observaciones"] = r.observaciones || '---';
                allRows.push(baseRow);
            }
        }

        // Convertir el JSON estructurado a una hoja de Excel usando SheetJS
        const ws = XLSX.utils.json_to_sheet(allRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Base de Datos Plana");

        Swal.close();
        XLSX.writeFile(wb, `GROBO_${instName}_Alojamientos_Clínica.xlsx`);
    }
};