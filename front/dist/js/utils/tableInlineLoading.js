/**
 * Filas estándar de carga / mensaje dentro de `<tbody>` (sin overlay de página).
 * Ver docs/CHECKLIST-OPTIMIZACION-TABLAS-CARGAS.md §4.
 */

export function escapeHtmlBasic(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Spinner + texto (mensajes i18n; se escapan).
 * @param {HTMLTableSectionElement|null} tbody
 * @param {{ colspan?: number, message?: string, spinnerTone?: 'success' | 'primary', layout?: 'standard' | 'inventory' }} opts
 */
export function setTbodyLoadingSpinner(tbody, opts = {}) {
    if (!tbody) return;
    const colspan = opts.colspan ?? 1;
    const tone = opts.spinnerTone === 'primary' ? 'primary' : 'success';
    const msg = escapeHtmlBasic(opts.message ?? '');
    const inventory = opts.layout === 'inventory';
    if (inventory) {
        tbody.innerHTML =
            `<tr><td colspan="${colspan}" class="text-center py-3">` +
            `<div class="spinner-border spinner-border-sm text-${tone}" role="status"></div>` +
            `<div class="small text-muted mt-2">${msg}</div></td></tr>`;
        return;
    }
    tbody.innerHTML =
        `<tr><td colspan="${colspan}" class="text-center py-4 text-muted">` +
        `<div class="spinner-border spinner-border-sm text-${tone} mb-2" role="status"></div>` +
        `<div class="small">${msg}</div></td></tr>`;
}

/**
 * Una fila de texto (vacío, error, etc.).
 * @param {HTMLTableSectionElement|null} tbody
 * @param {{ colspan?: number, variant?: 'muted' | 'mutedEmpty' | 'danger', message?: string, layout?: 'standard' | 'inventory' }} opts
 */
export function setTbodyMessageRow(tbody, opts = {}) {
    if (!tbody) return;
    const colspan = opts.colspan ?? 1;
    const variant = opts.variant === 'danger' ? 'danger' : opts.variant === 'mutedEmpty' ? 'mutedEmpty' : 'muted';
    const inventory = opts.layout === 'inventory';
    const msg = escapeHtmlBasic(opts.message ?? '');
    let cls;
    if (variant === 'danger') {
        cls = inventory ? 'text-center text-danger py-4' : 'text-center py-4 text-danger small';
    } else if (variant === 'mutedEmpty') {
        cls = 'text-center py-5 text-muted fst-italic';
    } else {
        cls = 'text-center py-4 text-muted small';
    }
    tbody.innerHTML = `<tr><td colspan="${colspan}" class="${cls}">${msg}</td></tr>`;
}
