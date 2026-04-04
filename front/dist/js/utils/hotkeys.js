import { Auth } from '../auth.js';
import {
    getPanelOrUsuarioPaginasSegment,
    getCorrectPath,
    UserPreferences,
} from '../components/menujs/MenuConfig.js';

/** Roles que usan dashboard admin y atajos de módulos administrativos (sede). */
function isAdminSedeRole(roleId) {
    return roleId === 1 || roleId === 2 || roleId === 4;
}

function usesAdminDashboard() {
    const r = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel') || '0', 10);
    return isAdminSedeRole(r);
}

/**
 * Definiciones para el modal (tid = clave bajo window.txt.hotkeys.*).
 * fallbackES = texto si aún no cargó i18n.
 */
export function getHotkeyRowDefinitions() {
    const rows = [
        { keys: 'Esc', tid: 'row_esc', fallbackES: 'Cerrar buscador, modales o menús abiertos' },
        { keys: 'Ctrl+G / ⌘+G', tid: 'row_ctrl_g', fallbackES: 'Abrir o cerrar Gecko Search (búsqueda / IA)' },
        { keys: 'Ctrl+K / ⌘+K', tid: 'row_ctrl_k', fallbackES: 'Abrir o cerrar Gecko Search (atajo tipo “comando rápido”)' },
        { keys: 'Alt+G', tid: 'row_alt_g', fallbackES: 'Abrir o cerrar Gecko Search (alternativa)' },
        { keys: '?', tid: 'row_question', fallbackES: 'Ver esta tabla de atajos (fuera de campos de texto)' },
        { keys: 'Alt+D', tid: 'row_alt_d', fallbackES: 'Ir al panel de inicio (admin o investigador)' },
        { keys: 'Alt+C', tid: 'row_alt_c', fallbackES: 'Abrir capacitación y manual de ayuda' },
        { keys: 'Alt+M', tid: 'row_alt_m', fallbackES: 'Ir a mensajes' },
        { keys: 'Alt+N', tid: 'row_alt_n', fallbackES: 'Ir al portal de noticias' },
        { keys: 'Alt+S', tid: 'row_alt_s', fallbackES: 'Ir a soporte / ticket' },
        { keys: 'Alt+O', tid: 'row_alt_o', fallbackES: 'Ir a mi perfil' },
        { keys: 'Alt+R', tid: 'row_alt_r', fallbackES: 'Ir a mis reservas' },
        { keys: 'Alt+F', tid: 'row_alt_f', fallbackES: 'Ir a formularios (nuevo pedido / centro)' },
        { keys: 'Alt+P', tid: 'row_alt_p', fallbackES: 'Ir a mis protocolos' },
        { keys: 'Alt+A', tid: 'row_alt_a', fallbackES: 'Ir a mis alojamientos' },
        { keys: 'Alt+Q', tid: 'row_alt_q', fallbackES: 'Ir a mis pedidos / formularios enviados' },
        { keys: 'Alt+Q luego S', tid: 'row_alt_qs', fallbackES: 'Cerrar sesión (pulsar S poco después de Q)' },
        { keys: 'Alt+V', tid: 'row_alt_v', fallbackES: 'Activar o desactivar micrófono (Gecko Voice)' },
        { keys: 'Alt+T', tid: 'row_alt_t', fallbackES: 'Cambiar tema claro / oscuro' },
        { keys: 'Alt+Z', tid: 'row_alt_z', fallbackES: 'Cambiar tamaño de letra' },
        { keys: 'Alt+L', tid: 'row_alt_l', fallbackES: 'Cambiar menú superior / lateral' },
        { keys: 'Alt+K', tid: 'row_alt_k', fallbackES: 'Abrir esta ayuda de atajos' },
    ];

    const roleId = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel') || '0', 10);
    if (isAdminSedeRole(roleId)) {
        rows.push(
            { keys: 'Alt+X luego P', tid: 'row_alt_xp', fallbackES: 'Administración: protocolos' },
            { keys: 'Alt+X luego A', tid: 'row_alt_xa', fallbackES: 'Administración: alojamientos' },
            { keys: 'Alt+X luego B', tid: 'row_alt_xb', fallbackES: 'Administración: facturación (índice)' },
            { keys: 'Alt+X luego U', tid: 'row_alt_xu', fallbackES: 'Administración: usuarios' },
            { keys: 'Alt+X luego E', tid: 'row_alt_xe', fallbackES: 'Administración: estadísticas' },
            { keys: 'Alt+X luego I', tid: 'row_alt_xi', fallbackES: 'Administración: insumos' },
            { keys: 'Alt+X luego K', tid: 'row_alt_xk', fallbackES: 'Administración: reactivos' },
            { keys: 'Alt+X luego J', tid: 'row_alt_xj', fallbackES: 'Administración: animales' },
            { keys: 'Alt+X luego V', tid: 'row_alt_xv', fallbackES: 'Administración: reservas (calendario)' },
            { keys: 'Alt+X luego N', tid: 'row_alt_xn', fallbackES: 'Administración: noticias (comunicación)' }
        );
    }

    return rows;
}

export const HotkeyManager = {
    buffer: [],
    timer: null,
    /** ms entre teclas en combinaciones Alt+X → B */
    chordWindowMs: 520,

    /** @deprecated Usar getHotkeyRowDefinitions + i18n */
    getVisibleHotkeys() {
        const t = typeof window !== 'undefined' ? window.txt?.hotkeys : null;
        return getHotkeyRowDefinitions().map((r) => ({
            keys: r.keys,
            desc: (t && r.tid && t[r.tid]) ? t[r.tid] : r.fallbackES,
        }));
    },

    init() {
        if (!sessionStorage.getItem('token') && !localStorage.getItem('token')) return;
        window.addEventListener('keydown', (e) => this.handle(e));
        console.log('⌨️ HotkeyManager: Listo');
    },

    handle(e) {
        if (e.repeat) return;

        const key = e.key.toLowerCase();
        const isTyping =
            ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) ||
            document.activeElement?.isContentEditable;

        const searchCombo = (e.ctrlKey || e.metaKey) && key === 'g';
        if (searchCombo) {
            e.preventDefault();
            this.toggleSearch();
            return;
        }

        if (isTyping && e.key !== 'Escape') {
            return;
        }

        if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            document.getElementById('btn-hotkeys-help')?.click();
            return;
        }

        if (e.key === 'Escape') {
            this.closeModals();
            return;
        }

        if (e.altKey) {
            if (e.key === 'Alt' || e.key === 'AltGraph') return;
            if (e.key.length !== 1 || !/[a-z0-9]/i.test(e.key)) return;
            e.preventDefault();
            this.buffer.push(e.key.toLowerCase());
            clearTimeout(this.timer);
            this.timer = setTimeout(() => {
                this.execute(this.buffer);
                this.buffer = [];
            }, this.chordWindowMs);
        }
    },

    toggleSearch() {
        if (window.GeckoSearch) {
            const overlay = document.getElementById('gecko-omni-overlay');
            if (overlay && overlay.classList.contains('show')) {
                window.GeckoSearch.close();
            } else {
                window.GeckoSearch.open();
            }
        }
    },

    execute(keys) {
        const chord = keys.join('');
        const roleId = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel') || '0', 10);
        const adminSede = isAdminSedeRole(roleId);
        const seg = getPanelOrUsuarioPaginasSegment();

        const actions = {
            k: () => document.getElementById('btn-hotkeys-help')?.click(),
            d: () => {
                window.location.href = getCorrectPath(
                    usesAdminDashboard() ? 'admin/dashboard.html' : 'panel/dashboard.html'
                );
            },
            qs: () => Auth.logout(),
            q: () => {
                window.location.href = getCorrectPath(`${seg}/misformularios.html`);
            },
            f: () => {
                window.location.href = getCorrectPath(`${seg}/formularios.html`);
            },
            p: () => {
                window.location.href = getCorrectPath(`${seg}/misprotocolos.html`);
            },
            a: () => {
                window.location.href = getCorrectPath(`${seg}/misalojamientos.html`);
            },
            v: () => document.getElementById('btn-voice-switch')?.click(),
            c: () => {
                window.location.href = getCorrectPath('panel/capacitacion.html');
            },
            m: () => {
                window.location.href = getCorrectPath(`${seg}/mensajes.html`);
            },
            n: () => {
                window.location.href = getCorrectPath('panel/noticias.html');
            },
            s: () => {
                window.location.href = getCorrectPath('panel/soporte.html');
            },
            o: () => {
                window.location.href = getCorrectPath(`${seg}/perfil.html`);
            },
            r: () => {
                window.location.href = getCorrectPath(`${seg}/misreservas.html`);
            },
            t: () => UserPreferences.toggleTheme(),
            z: () => UserPreferences.cycleFontSize(),
            l: () => UserPreferences.toggleMenuLayout(),

            xp: () => adminSede && (window.location.href = getCorrectPath('admin/protocolos.html')),
            xa: () => adminSede && (window.location.href = getCorrectPath('admin/alojamientos.html')),
            xb: () => adminSede && (window.location.href = getCorrectPath('admin/facturacion/index.html')),
            xu: () => adminSede && (window.location.href = getCorrectPath('admin/usuarios.html')),
            xe: () => adminSede && (window.location.href = getCorrectPath('admin/estadisticas.html')),
            xi: () => adminSede && (window.location.href = getCorrectPath('admin/insumos.html')),
            xk: () => adminSede && (window.location.href = getCorrectPath('admin/reactivos.html')),
            xj: () => adminSede && (window.location.href = getCorrectPath('admin/animales.html')),
            xv: () => adminSede && (window.location.href = getCorrectPath('admin/reservas.html')),
            xn: () =>
                adminSede &&
                (window.location.href = getCorrectPath('admin/comunicacion/noticias.html')),
        };

        if (actions[chord]) {
            actions[chord]();
        }
    },

    closeModals() {
        if (window.GeckoSearch) window.GeckoSearch.close();
        if (window.bootstrap) {
            document.querySelectorAll('.modal.show').forEach((m) => {
                const modal = window.bootstrap.Modal.getInstance(m);
                if (modal) modal.hide();
            });
        }
        document.querySelectorAll('.dropdown-menu-gecko').forEach((m) => m.classList.add('hidden'));
    },
};
