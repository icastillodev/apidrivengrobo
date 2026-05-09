/**
 * Locales para montos y fechas en facturación (alineado con `document.documentElement.lang` / `loadLanguage`).
 */

/** Nombre de la sede para cabeceras PDF (`NombreInst` en localStorage). */
export function getBillingNombreInstitucion() {
    try {
        const raw = localStorage.getItem('NombreInst');
        return raw != null ? String(raw).trim() : '';
    } catch {
        return '';
    }
}

export function getBillingLocale() {
    const raw = (document.documentElement.lang || localStorage.getItem('lang') || localStorage.getItem('idioma') || 'es').slice(0, 2).toLowerCase();
    if (raw === 'en') return 'en-US';
    if (raw === 'pt') return 'pt-BR';
    return 'es-UY';
}

/** Para `toLocaleDateString` en tramos (coherente con fechas cortas regionales). */
export function getBillingDateLocale() {
    const raw = (document.documentElement.lang || localStorage.getItem('lang') || localStorage.getItem('idioma') || 'es').slice(0, 2).toLowerCase();
    if (raw === 'en') return 'en-GB';
    if (raw === 'pt') return 'pt-BR';
    return 'es-UY';
}

/**
 * @param {number|string} value
 * @param {number} [minDigits=2]
 * @param {number} [maxDigits=minDigits]
 */
export function formatBillingMoney(value, minDigits = 2, maxDigits = minDigits) {
    const n = Number(value);
    const safe = Number.isFinite(n) ? n : 0;
    return safe.toLocaleString(getBillingLocale(), {
        minimumFractionDigits: minDigits,
        maximumFractionDigits: maxDigits
    });
}

/** Montos con hasta 2 decimales sin forzar siempre 2 (p. ej. totales en Swal). */
export function formatBillingMoneyLoose(value) {
    return formatBillingMoney(value, 0, 2);
}

export function formatBillingDateTime(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleString(getBillingLocale());
}

/**
 * Columnas PDF alineadas a Precio | Debe | Pago total.
 * Formularios exentos: precio monetario; debe y pago total muestran la etiqueta (p. ej. "Exento").
 *
 * @param {boolean} isExento
 * @param {number|string} total
 * @param {number|string} pagado
 * @param {string} [exentoLabel]
 * @returns {[string, string, string]}
 */
export function pdfColsPrecioDebePagoTotal(isExento, total, pagado, exentoLabel) {
    const t = Number(total);
    const p = Number(pagado);
    const tot = Number.isFinite(t) ? t : 0;
    const pag = Number.isFinite(p) ? p : 0;
    const precio = `$ ${formatBillingMoney(tot)}`;
    if (isExento) {
        const lab = String(exentoLabel || 'Exento').trim() || 'Exento';
        return [precio, lab, lab];
    }
    const debe = Math.max(0, tot - pag);
    return [precio, `$ ${formatBillingMoney(debe)}`, `$ ${formatBillingMoney(pag)}`];
}

/**
 * Reordena la salida de {@link pdfColsPrecioDebePagoTotal} para columnas PDF de estado de cuenta:
 * Total (precio) | Pagado | Debe.
 * @param {[string, string, string]} m
 * @returns {[string, string, string]}
 */
export function pdfColsPdfOrdenTotalPagadoDebe(m) {
    return [m[0], m[2], m[1]];
}

/**
 * Detecta fila exenta desde distintos formatos de API (`is_exento` boolean/1, `exento` legacy).
 * @param {Record<string, unknown>|null|undefined} row
 */
export function billingTipoExento(row) {
    if (!row || typeof row !== 'object') return false;
    const v = row.is_exento;
    if (v === true || v === 1 || v === '1') return true;
    const e = row.exento;
    return e === 1 || e === '1' || e === true;
}

/**
 * Pedido no exento con total y pagos en cero: no debe mostrarse como «pagado» ni cuadrado (solo el caso exento cuadra en cero).
 * @param {boolean} isExento
 * @param {number|string} total
 * @param {number|string} pagado
 */
export function billingPedidoSinMontoNoExento(isExento, total, pagado) {
    if (isExento) return false;
    const t = Number(total);
    const p = Number(pagado);
    const tt = Number.isFinite(t) ? t : 0;
    const pp = Number.isFinite(p) ? p : 0;
    return tt <= 0 && pp <= 0;
}

/**
 * Suma total/pagado/debe solo de formularios no exentos (valores informativos en fila exenta no entran al acumulado).
 * @param {unknown[]|null|undefined} formularios
 * @returns {{ total: number, pagado: number, debe: number }}
 */
export function billingSumFormulariosCobrable(formularios) {
    const acc = { total: 0, pagado: 0, debe: 0 };
    for (const f of formularios || []) {
        if (billingTipoExento(f)) continue;
        const t = Number(f.total || 0);
        const p = Number(f.pagado || 0);
        acc.total += Number.isFinite(t) ? t : 0;
        acc.pagado += Number.isFinite(p) ? p : 0;
        acc.debe += Math.max(0, (Number.isFinite(t) ? t : 0) - (Number.isFinite(p) ? p : 0));
    }
    return acc;
}

/**
 * @param {unknown[]|null|undefined} insumos filas con total_item / pagado
 */
export function billingSumInsumosCobrable(insumos) {
    const acc = { total: 0, pagado: 0, debe: 0 };
    for (const i of insumos || []) {
        if (billingTipoExento(i)) continue;
        const t = Number(i.total_item || 0);
        const p = Number(i.pagado || 0);
        acc.total += Number.isFinite(t) ? t : 0;
        acc.pagado += Number.isFinite(p) ? p : 0;
        acc.debe += Math.max(0, (Number.isFinite(t) ? t : 0) - (Number.isFinite(p) ? p : 0));
    }
    return acc;
}

/**
 * @param {unknown[]|null|undefined} alojamientos
 */
export function billingSumAlojamientos(alojamientos) {
    const acc = { total: 0, pagado: 0, debe: 0 };
    for (const a of alojamientos || []) {
        const t = Number(a.total || 0);
        const p = Number(a.pagado || 0);
        let d = a.debe;
        if (d == null || d === '') d = Math.max(0, t - p);
        d = Number(d);
        acc.total += Number.isFinite(t) ? t : 0;
        acc.pagado += Number.isFinite(p) ? p : 0;
        acc.debe += Number.isFinite(d) ? d : 0;
    }
    return acc;
}

/**
 * Tres celdas HTML: Total (precio) | Pagado | Debe — en exento, pagado y debe muestran la etiqueta.
 * @param {boolean} isExento
 * @param {number|string} total
 * @param {number|string} pagado
 * @param {string} [exentoLabel]
 */
export function billingTdTotalPagadoDebe(isExento, total, pagado, exentoLabel) {
    const m = pdfColsPrecioDebePagoTotal(isExento, total, pagado, exentoLabel);
    const clsPag = isExento ? 'text-end fw-bold text-secondary' : 'text-end text-success fw-bold';
    const clsDeb = isExento ? 'text-end fw-bold text-secondary' : 'text-end text-danger fw-bold';
    return `<td class="text-end fw-bold text-dark">${m[0]}</td><td class="${clsPag}">${m[2]}</td><td class="${clsDeb}">${m[1]}</td>`;
}

/**
 * Derivación activa: nombre de quien derivó + institución origen (texto para tablas / Excel).
 * @param {Record<string, unknown>|null|undefined} row
 */
export function billingDerivacionPlainText(row) {
    if (!row || typeof row !== 'object') return '';
    const nom = String(row.derivado_por_nombre ?? '').trim();
    const inst = String(row.derivado_desde_institucion ?? '').trim();
    if (!nom && !inst) return '';
    if (nom && inst) return `${nom} (${inst})`;
    return nom || inst;
}

/**
 * Cobro liquidado vía `facturacion_formulario_derivado` en la sede actual (badge en grillas contables).
 * @param {Record<string, unknown>|null|undefined} row
 */
export function billingDerivadaLiquidacionBadge(row) {
    if (!row || typeof row !== 'object') return '';
    const v = row.es_facturacion_derivada;
    if (v !== true && v !== 1 && v !== '1') return '';
    const lbl = window.txt?.facturacion?.billing_institucion?.origen_badge_derivado ?? 'Derivado';
    const safe = String(lbl).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<span class="badge ms-1 align-middle" style="font-size:8px;background:#6f42c1;color:#fff;">${safe}</span>`;
}

/**
 * Marca corta de exento en columnas tipo `#123 (EX)` — `facturacion.billing_depto_export.pdf_marca_ex` (ES/EN/PT).
 */
export function billingPdfMarcaExentoCorta() {
    const v = window.txt?.facturacion?.billing_depto_export?.pdf_marca_ex;
    return v != null && String(v).trim() !== '' ? String(v).trim() : '(EX)';
}

/**
 * Marca larga para texto plano / Excel — `facturacion.billing_depto_export.pdf_marca_exento` (ES/EN/PT).
 */
export function billingPdfMarcaExentoLarga() {
    const v = window.txt?.facturacion?.billing_depto_export?.pdf_marca_exento;
    return v != null && String(v).trim() !== '' ? String(v).trim() : '(EXENTO)';
}

/**
 * ID de formulario para PDF/Excel (exento + liquidación derivada en sede).
 * @param {Record<string, unknown>|null|undefined} f
 * @param {{ style?: 'hash'|'plain', marcaExento?: string }} [opt]
 */
export function billingPdfFormularioIdDisplay(f, opt = {}) {
    const row = f && typeof f === 'object' ? f : {};
    const style = opt.style === 'plain' ? 'plain' : 'hash';
    const isEx = billingTipoExento(row);
    const id = row.id != null ? String(row.id) : '';
    const hash = style === 'hash' ? '#' : '';
    const base = `${hash}${id}`;
    const exLab = (opt.marcaExento != null && String(opt.marcaExento).trim() !== '')
        ? String(opt.marcaExento).trim()
        : billingPdfMarcaExentoCorta();
    if (isEx) {
        return style === 'plain' ? `${id} ${exLab}`.trim() : `${base} ${exLab}`.trim();
    }
    const der = row.es_facturacion_derivada === true || row.es_facturacion_derivada === 1 || row.es_facturacion_derivada === '1';
    if (der) {
        const lbl = window.txt?.facturacion?.billing_institucion?.origen_badge_derivado ?? 'Derivado';
        return style === 'plain' ? `${id} (${lbl})` : `${base} (${lbl})`;
    }
    return style === 'plain' ? id : base;
}

/**
 * Texto de estadía para informes (PDF/Excel): usa `periodo` del API (tramos unidos) o fallback inicio–fin.
 * @param {Record<string, unknown>|null|undefined} a fila alojamiento de facturación
 * @param {{ includeDias?: boolean, diasUnit?: string, emptyLabel?: string }} [opt]
 */
export function billingAlojPeriodoParaInforme(a, opt = {}) {
    const row = a && typeof a === 'object' ? a : {};
    const includeDias = opt.includeDias !== false;
    const diasUnit = String(opt.diasUnit ?? 'd').trim() || 'd';
    const emptyLabel = String(opt.emptyLabel ?? '—').trim() || '—';

    let p = String(row.periodo ?? '').trim();
    if (!p || p === '-') {
        const ini = String(row.fecha_inicio ?? '').trim();
        const fin = String(row.fecha_fin ?? '').trim();
        if (ini && fin) p = ini === fin ? ini : `${ini} – ${fin}`;
        else p = ini || fin || '';
    }
    const n = Number(row.dias);
    const hasDias = includeDias && Number.isFinite(n) && n > 0;
    const dSuf = hasDias ? ` (${n} ${diasUnit})` : '';
    if (p) return `${p}${dSuf}`;
    if (hasDias) return `(${n} ${diasUnit})`;
    return emptyLabel;
}

/**
 * Pedido tipo insumo: categoría del tipo de formulario (misma heurística que animales/reactivos).
 * @param {Record<string, unknown>|null|undefined} row
 */
export function billingInsumoPedidoEsCategoriaReactivo(row) {
    if (!row || typeof row !== 'object') return false;
    const c = String(row.categoria ?? '').toLowerCase();
    return c.includes('reactivo');
}

/**
 * Partición para grillas de pedidos insumo: reactivos vs demás rubros.
 * @param {unknown[]|null|undefined} insumos
 */
export function billingPartitionInsumosPedidoReactivoOtros(insumos) {
    const reactivos = [];
    const otros = [];
    for (const i of insumos || []) {
        if (billingInsumoPedidoEsCategoriaReactivo(i)) reactivos.push(i);
        else otros.push(i);
    }
    return { reactivos, otros };
}

/**
 * Subtítulo visual dentro del tbody (agrupa insumos por categoría).
 */
export function billingHtmlInsumoProtSectionHeader(colspan, label) {
    const n = Math.max(1, parseInt(String(colspan), 10) || 9);
    const esc = String(label ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    return `<tr class="table-light"><td colspan="${n}" class="text-start py-2 ps-2"><span class="fw-bold text-secondary small">${esc}</span></td></tr>`;
}

/**
 * Fila estándar de pedido insumo en facturación (protocolo o insumos generales depto).
 * @param {Record<string, unknown>} i
 * @param {{ bd: object, tf: object, bi: object, exL: string }} packs
 * @param {'protocolo'|'general'} variant
 * @param {string|number} [idProt] obligatorio si variant === 'protocolo'
 */
export function billingHtmlRowInsumoPedidoFacturacion(i, packs, variant, idProt) {
    const { bd, tf, exL } = packs;
    const total = parseFloat(i.total_item || 0);
    const pagado = parseFloat(i.pagado || 0);
    const isExento = billingTipoExento(i);
    const debe = isExento ? 0 : Math.max(0, total - pagado);
    const sinMontoNoEx = billingPedidoSinMontoNoExento(isExento, total, pagado);
    const lblSinTot = tf.pedido_sin_total_cobrable || 'Sin total';
    const badge = isExento ? `<span class="badge bg-info text-dark shadow-sm">${bd.badge_exento || 'EXENTO'}</span>` :
        sinMontoNoEx ? `<span class="badge bg-secondary shadow-sm">${lblSinTot}</span>` :
            ((debe <= 0) ? `<span class="badge bg-success shadow-sm">${bd.aloj_estado_pago || 'PAGO'}</span>` :
                (pagado > 0 ? `<span class="badge bg-warning text-dark shadow-sm">${tf.estado_cobro_parcial || 'PARCIAL'}</span>` :
                    `<span class="badge bg-danger shadow-sm">${tf.estado_cobro_pendiente || 'PENDIENTE'}</span>`));
    const detalleHTML = (i.detalle_completo || '').split(' | ').map(item => `• ${item}`).join('<br>');
    const rowStyle = (isExento || (debe <= 0 && !sinMontoNoEx)) ? 'background-color: #f0fff4 !important;' : '';
    const chk =
        variant === 'protocolo'
            ? `<input type="checkbox" class="check-item-insumo-prot" data-prot="${idProt}" data-id="${i.id}" data-monto="${debe}" ${(debe <= 0 || isExento) ? 'disabled' : ''}>`
            : `<input type="checkbox" class="check-item-insumo-global" data-id="${i.id}" data-monto="${debe}" ${(debe <= 0 || isExento) ? 'disabled' : ''}>`;
    return `
            <tr class="text-center align-middle pointer" style="${rowStyle}"
                onclick="if(event.target.tagName !== 'INPUT') window.abrirEdicionFina('INSUMO', ${i.id})">
                <td>${chk}</td>
                <td class="small text-muted fw-bold">#${i.id}${billingDerivadaLiquidacionBadge(i)}</td>
                <td>${badge}</td>
                <td class="small">${i.solicitante || '-'}</td>
                <td class="small text-start text-muted">${billingDerivacionPlainText(i) || '—'}</td>
                <td class="text-start ps-3 small" style="line-height: 1.2;">${detalleHTML}</td>
                ${billingTdTotalPagadoDebe(isExento, total, pagado, exL)}
            </tr>`;
}
