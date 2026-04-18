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
