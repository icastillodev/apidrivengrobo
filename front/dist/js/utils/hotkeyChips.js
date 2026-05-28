import { isHotkeysDisabled } from './hotkeys.js';

const STYLE_ID = 'grobo-hotkey-chips-style';

function ensureChipStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
.grobo-hotkey-chip {
    display: inline-flex;
    align-items: center;
    margin-left: 0.35rem;
    padding: 0.1rem 0.35rem;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    line-height: 1.2;
    color: #1a5d3b;
    background: rgba(26, 93, 59, 0.08);
    border: 1px solid rgba(26, 93, 59, 0.22);
    border-radius: 4px;
    vertical-align: middle;
    white-space: nowrap;
}
@media (max-width: 767px) {
    .grobo-hotkey-chip { display: none !important; }
}
`;
    document.head.appendChild(style);
}

function appendChip(host, keys) {
    if (!host || !keys) return;
    if (host.querySelector('.grobo-hotkey-chip')) return;
    const chip = document.createElement('span');
    chip.className = 'grobo-hotkey-chip';
    chip.setAttribute('aria-hidden', 'true');
    chip.textContent = keys;
    host.appendChild(chip);
}

function isAdminSede() {
    const r = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel') || '0', 10);
    return r === 1 || r === 2 || r === 4;
}

/**
 * Muestra atajos en elementos marcados con data-hotkey-chip (solo escritorio).
 */
export function applyHotkeyChips() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (window.matchMedia('(max-width: 767px)').matches) return;
    if (isHotkeysDisabled()) return;

    ensureChipStyles();

    document.querySelectorAll('[data-hotkey-chip]').forEach((el) => {
        const keys = String(el.getAttribute('data-hotkey-chip') || '').trim();
        if (keys) appendChip(el, keys);
    });

    if (document.body?.dataset?.pageTitleKey === 'formularios' || /formularios\.html/i.test(window.location.pathname)) {
        document.querySelectorAll('[data-i18n="centro_solicitudes.nueva_solicitud"]').forEach((el) => {
            appendChip(el, 'Alt+N');
        });
    }

    if (isAdminSede() && /facturacion\/index\.html/i.test(window.location.pathname)) {
        const badge = document.querySelector('[data-i18n="facturacion.titulo"]');
        if (badge) appendChip(badge, 'Alt+B');
    }
}
