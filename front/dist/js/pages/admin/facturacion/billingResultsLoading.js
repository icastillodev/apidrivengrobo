/**
 * Indicador de carga dentro del contenedor de resultados de facturación
 * (sin bloquear toda la pantalla con el loader global).
 * @param {string} elementId id del nodo (p. ej. billing-results, billing-results-org)
 */
export function setBillingResultsLoadingInline(elementId) {
    const container = document.getElementById(elementId);
    if (!container) return;
    container.replaceChildren();
    const wrap = document.createElement('div');
    wrap.className = 'd-flex flex-column align-items-center justify-content-center py-5 text-muted';
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-live', 'polite');
    const spin = document.createElement('div');
    spin.className = 'spinner-border text-success mb-2';
    spin.setAttribute('role', 'status');
    const span = document.createElement('span');
    span.className = 'small';
    span.textContent =
        window.txt?.facturacion?.billing_loading_inline ||
        window.txt?.generales?.msg_cargando ||
        '…';
    wrap.appendChild(spin);
    wrap.appendChild(span);
    container.appendChild(wrap);
}
