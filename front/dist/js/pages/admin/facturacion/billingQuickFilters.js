/**
 * Filtro visual compartido de facturación: no crea cargos ni modifica datos.
 * Nunca convierte el filtro en un permiso ni sustituye el saldo real de la API.
 */
const translations = {
    es: { title: 'Filtrar resultados', search: 'Buscar en los resultados…',
          pending: 'Solo pendientes de pago', count: 'filas visibles',
          hint: 'Los totales no cambian. El filtro oculta filas de la tabla, no modifica pagos.' },
    en: { title: 'Filter results', search: 'Search results…',
          pending: 'Unpaid only', count: 'visible rows',
          hint: 'Totals do not change. This only hides rows and never modifies payments.' },
    pt: { title: 'Filtrar resultados', search: 'Buscar nos resultados…',
          pending: 'Somente pendentes de pagamento', count: 'linhas visíveis',
          hint: 'Os totais não mudam. O filtro apenas oculta linhas; não modifica pagamentos.' },
};

function getLabels() {
    const code = String(localStorage.getItem('lang') || document.documentElement.lang || 'es')
        .toLowerCase().slice(0, 2);
    return translations[code] || translations.es;
}

function normalize(value) {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Se devuelve null cuando no hay datos suficientes para afirmar que una fila está pagada. */
export function rowHasPendingAmount(row) {
    const amounts = [...row.querySelectorAll('input[type="checkbox"][data-monto]')]
        .map(input => Number.parseFloat(String(input.dataset.monto || '0').replace(',', '.')))
        .filter(Number.isFinite);
    if (amounts.length) return amounts.some(value => value > 0.009);

    // Algunos listados son de solo lectura. Solo inferir cuando el estado es explícito.
    const states = [...row.querySelectorAll('[data-estado-cobro], [data-payment-status]')]
        .map(el => String(el.dataset.estadoCobro || el.dataset.paymentStatus || '').toLowerCase());
    if (states.some(x => ['pendiente','partial','parcial','unpaid','1','2'].includes(x))) return true;
    if (states.some(x => ['pagado','paid','3'].includes(x))) return false;

    // Tablas informativas sin casillas de cobro: usar únicamente la columna
    // rotulada DEBE/PENDIENTE; nunca confundir TOTAL con dinero pendiente.
    const table = row.closest('table');
    const headers = [...(table?.querySelectorAll('thead tr:last-child th') || [])];
    const index = headers.findIndex(th => /^(debe|pendiente|due|divida|dívida|a pagar)/i
        .test(normalize(th.textContent).trim()));
    const cells = [...row.children].filter(el => el.tagName === 'TD');
    if (index < 0 || cells.length !== headers.length || !cells[index]) return null;
    const formatted = String(cells[index].textContent || '').replace(/[^\d,.-]/g, '').trim();
    if (!formatted) return null;
    // Interpretación local: 11.900,00 / 11,900.00 / 11900.00
    const lastComma = formatted.lastIndexOf(',');
    const lastDot = formatted.lastIndexOf('.');
    const decimal = lastComma > lastDot ? ',' : '.';
    const numberText = formatted.split('').filter(ch => /[\d-]/.test(ch) || ch === decimal).join('').replace(decimal, '.');
    const amount = Number.parseFloat(numberText);
    return Number.isFinite(amount) ? amount > 0.009 : null;
}

function installQuickFilters() {
    const anchor = document.getElementById('billing-person-hub-mount');
    const results = document.getElementById('billing-results')
        || document.getElementById('billing-results-org')
        || document.getElementById('billing-results-inst')
        || anchor; // Centro: los resultados están dentro del buscador por persona.
    if (!anchor || !results || document.getElementById('billing-quick-filters')) return;
    const labels = getLabels();
    const section = document.createElement('section');
    section.id = 'billing-quick-filters';
    section.className = 'border rounded-3 p-3 mb-3 bg-white shadow-sm';
    section.setAttribute('aria-label', labels.title);
    section.innerHTML = `
        <div class="row align-items-center g-2">
            <div class="col-12 col-md-5">
                <label class="small fw-bold text-muted mb-1" for="billing-quick-search">${labels.title}</label>
                <input id="billing-quick-search" class="form-control form-control-sm"
                    type="search" placeholder="${labels.search}" autocomplete="off">
            </div>
            <div class="col-12 col-md-4">
                <div class="form-check form-switch mt-md-3">
                    <input class="form-check-input" type="checkbox"
                        id="billing-quick-pending" role="switch">
                    <label class="form-check-label small fw-bold" for="billing-quick-pending">${labels.pending}</label>
                </div>
            </div>
            <div class="col-12 col-md-3 text-md-end">
                <output id="billing-quick-count" class="small text-muted" aria-live="polite"></output>
            </div>
        </div>
        <div class="text-muted mt-1" style="font-size:11px">${labels.hint}</div>`;
    anchor.insertAdjacentElement('afterend', section);
    const search = section.querySelector('#billing-quick-search');
    const toggle = section.querySelector('#billing-quick-pending');
    const counter = section.querySelector('#billing-quick-count');
    let scheduled = false;
    const disabledByFilter = new WeakSet();

    function applyFilters() {
        scheduled = false;
        const term = normalize(search.value.trim());
        const pendingOnly = toggle.checked;
        let count = 0;
        for (const row of results.querySelectorAll('tbody tr')) {
            const hasCells = row.querySelectorAll('td').length > 0;
            if (!hasCells) continue;
            const matched = !term || normalize(row.textContent).includes(term);
            const pending = rowHasPendingAmount(row);
            // Si el estado es desconocido, conservar el registro: ocultarlo puede
            // esconder una deuda verdadera. Los encabezados/subtotales se preservan.
            const isVisible = matched && (!pendingOnly || pending !== false);
            row.classList.toggle('d-none', !isVisible);
            // Seguridad de cobros: nunca liquidar casillas previamente
            // seleccionadas que quedaron ocultas por búsqueda o filtro.
            for (const input of row.querySelectorAll('input[type="checkbox"][data-monto]')) {
                if (!isVisible) {
                    if (input.checked) {
                        input.checked = false;
                        input.dispatchEvent(new Event('change', {bubbles:true}));
                    }
                    if (!input.disabled) {
                        input.disabled = true;
                        disabledByFilter.add(input);
                    }
                } else if (disabledByFilter.has(input)) {
                    input.disabled = false;
                    disabledByFilter.delete(input);
                }
            }
            if (isVisible) count++;
        }
        counter.textContent = `${count} ${labels.count}`;
    }
    function schedule() {
        if (scheduled) return;
        scheduled = true;
        queueMicrotask(applyFilters);
    }
    search.addEventListener('input', schedule);
    toggle.addEventListener('change', schedule);
    // Volver a proteger filas ocultas después de los select-all originales.
    results.addEventListener('change', schedule, true);
    // La aplicación reconstruye el HTML después de consultas y pagos.
    new MutationObserver(schedule).observe(results, {childList:true,subtree:true});
    schedule();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installQuickFilters, {once:true});
} else {
    installQuickFilters();
}
