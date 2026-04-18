/**
 * Locales para montos y fechas en facturación (alineado con `document.documentElement.lang` / `loadLanguage`).
 */

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
