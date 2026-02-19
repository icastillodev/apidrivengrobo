import { Auth } from '../auth.js';

const getBasePath = () => (window.location.hostname === 'localhost') ? '/URBE-API-DRIVEN/front/' : '/front/';
const getCorrectPath = (rawPath) => {
    if (!rawPath || rawPath === '#') return 'javascript:void(0);';
    if (rawPath === 'logout') return 'javascript:Auth.logout();';
    return `${getBasePath()}paginas/${rawPath}`;
};

export const HotkeyManager = {
    buffer: [],
    timer: null,

    getVisibleHotkeys() {
        const roleId = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel'));
        const isAdmin = roleId === 1 || roleId === 2;

        const list = [
            { keys: 'ESC', desc: 'Cerrar Buscador / Modales', role: 'all' },
            { keys: 'CTRL + G', desc: 'Abrir Gecko Search (IA)', role: 'all' },
            { keys: 'ALT + K', desc: 'Ver esta ayuda', role: 'all' },
            { keys: 'ALT + F', desc: 'Ir a Formularios', role: 'all' },
            { keys: 'ALT + P', desc: 'Mis Protocolos', role: 'all' },
            { keys: 'ALT + A', desc: 'Mis Alojamientos', role: 'all' },
            { keys: 'ALT + Q', desc: 'Mis Pedidos', role: 'all' },
            { keys: 'ALT + Q + S', desc: 'Cerrar Sesión', role: 'all' },
            { keys: 'ALT + V', desc: 'Activar Voz (Micrófono)', role: 'all' },
        ];

        if (isAdmin) {
            list.push(
                { keys: 'ALT + X + P', desc: 'Admin Protocolos', role: 'admin' },
                { keys: 'ALT + X + A', desc: 'Admin Alojamientos', role: 'admin' }
            );
        }
        return list;
    },

    init() {
        if (!sessionStorage.getItem('token') && !localStorage.getItem('token')) return;
        window.addEventListener('keydown', (e) => this.handle(e));
        console.log("⌨️ HotkeyManager: Listo");
    },

    handle(e) {
        // CORRECCIÓN: Ignorar repeticiones para que no abra y cierre solo
        if (e.repeat) return;

        const key = e.key.toLowerCase();
        const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable;
        
        // 1. CTRL + G (Global)
        if (e.ctrlKey && key === 'g') {
            e.preventDefault();
            this.toggleSearch();
            return;
        }

        if (isTyping && e.key !== 'Escape') return;

        // 2. ESCAPE
        if (e.key === 'Escape') {
            this.closeModals();
            return;
        }

        // 3. ALT + ...
        if (e.altKey) {
            if (key === 'alt') return;
            e.preventDefault();
            this.buffer.push(key);
            clearTimeout(this.timer);
            this.timer = setTimeout(() => {
                this.execute(this.buffer);
                this.buffer = [];
            }, 400); 
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
        const roleId = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel'));
        const isAdmin = roleId === 1 || roleId === 2;

        const actions = {
            'k': () => document.getElementById('btn-hotkeys-help')?.click(),
            'qs': () => Auth.logout(),
            'f': () => window.location.href = getCorrectPath('usuario/formularios.html'),
            'p': () => window.location.href = getCorrectPath('usuario/misprotocolos.html'),
            'v': () => document.getElementById('btn-voice-switch')?.click(),
            
            // Admin
            'xp': () => isAdmin && (window.location.href = getCorrectPath('admin/protocolos.html')),
            'xa': () => isAdmin && (window.location.href = getCorrectPath('admin/alojamientos.html'))
        };

        if (actions[chord]) actions[chord]();
    },

    closeModals() {
        if (window.GeckoSearch) window.GeckoSearch.close();
        if (window.bootstrap) {
            document.querySelectorAll('.modal.show').forEach(m => {
                const modal = window.bootstrap.Modal.getInstance(m);
                if (modal) modal.hide();
            });
        }
        document.querySelectorAll('.dropdown-menu-gecko').forEach(m => m.classList.add('hidden'));
    }
};