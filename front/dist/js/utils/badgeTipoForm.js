/**
 * Devuelve clase y estilo para un badge de tipo de formulario según el color configurado.
 * Colores: verde, rosado, rojo, violeta, azul, celeste, bordo, amarillo, verde claro, negro. null/empty = gris.
 * @param {string|null|undefined} color - Valor del campo color del tipoformulario
 * @returns {{ className: string, style: string }}
 */
export function getTipoFormBadgeStyle(color) {
    const c = (color || '').toString().toLowerCase().trim();
    const base = 'badge shadow-sm';
    // Bootstrap: success=verde, danger=rojo, primary=azul, info=celeste, warning=amarillo, dark=negro
    const map = {
        'verde': { className: `${base} bg-success text-white`, style: '' },
        'rojo': { className: `${base} bg-danger text-white`, style: '' },
        'azul': { className: `${base} bg-primary text-white`, style: '' },
        'celeste': { className: `${base} bg-info text-dark`, style: '' },
        'amarillo': { className: `${base} bg-warning text-dark`, style: '' },
        'negro': { className: `${base} bg-dark text-white`, style: '' },
        'rosado': { className: `${base}`, style: 'background-color:#e91e8c;color:#fff;' },
        'violeta': { className: `${base}`, style: 'background-color:#7c3aed;color:#fff;' },
        'bordo': { className: `${base}`, style: 'background-color:#800020;color:#fff;' },
        'verde claro': { className: `${base}`, style: 'background-color:#90EE90;color:#1a1a1a;' }
    };
    const found = map[c];
    if (found) return found;
    return { className: `${base} bg-secondary text-white`, style: '' };
}

/**
 * Genera el HTML de un badge para el tipo de formulario.
 * @param {string} label - Texto del badge (ej. nombre del tipo)
 * @param {string|null|undefined} color - Color del tipoformulario
 * @param {string} [extraClass] - Clases adicionales (ej. font-size)
 */
export function renderTipoFormBadge(label, color, extraClass = '') {
    const { className, style } = getTipoFormBadgeStyle(color);
    const styleAttr = style ? ` style="${style}"` : '';
    const cls = `${className} ${(extraClass || '').trim()}`.trim();
    return `<span class="${cls}"${styleAttr}>${escapeHtml(label)}</span>`;
}

function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}
