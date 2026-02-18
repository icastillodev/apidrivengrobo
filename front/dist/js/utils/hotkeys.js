import { Auth } from '../auth.js';

// Re-definimos la lógica de rutas aquí para evitar importar Menucomponents (Evita el círculo)
const getBasePath = () => {
    return (window.location.hostname === 'localhost') ? '/URBE-API-DRIVEN/front/' : '/front/';
};

const getCorrectPath = (rawPath) => {
    if (!rawPath || rawPath === '#') return 'javascript:void(0);';
    if (rawPath === 'logout') return 'javascript:Auth.logout();';
    return `${getBasePath()}paginas/${rawPath}`;
};

export const HotkeyManager = {
    buffer: [],
    timer: null,

    // Nueva función para obtener la lista "leíble" para el modal
    getVisibleHotkeys() {
        const roleId = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel'));
        const isAdmin = roleId === 1 || roleId === 2;

        const list = [
            { keys: 'ESC', desc: 'Cerrar modales / menús', role: 'all' },
            { keys: 'ALT + G', desc: 'Abrir/Cerrar Buscador Global', role: 'all' },
            { keys: 'ALT + K', desc: 'Ver esta ayuda (Hotkeys)', role: 'all' },
            { keys: 'ALT + F', desc: 'Ir a Formularios', role: 'all' },
            { keys: 'ALT + P', desc: 'Mis Protocolos', role: 'all' },
            { keys: 'ALT + A', desc: 'Mis Alojamientos', role: 'all' },
            { keys: 'ALT + Q', desc: 'Mis Formularios', role: 'all' },
            { keys: 'ALT + Q + S', desc: 'Cerrar Sesión', role: 'all' },
            { keys: 'ALT + H', desc: 'Capacitación', role: 'all' },
            { keys: 'ALT + Y', desc: 'Ticket / Soporte', role: 'all' },
            { keys: 'ALT + O', desc: 'Cambiar Modo Oscuro', role: 'all' },
            { keys: 'ALT + M', desc: 'Cambiar Diseño Menú', role: 'all' },
            { keys: 'ALT + L', desc: 'Cambiar Tamaño Letra', role: 'all' },
            { keys: 'ALT + V', desc: 'Activar/Desactivar Voz', role: 'all' },
        ];

        if (isAdmin) {
            list.push(
                { keys: 'ALT + X + A', desc: 'Admin Alojamientos', role: 'admin' },
                { keys: 'ALT + X + P', desc: 'Admin Protocolos', role: 'admin' },
                { keys: 'ALT + X + R', desc: 'Admin Reactivos', role: 'admin' },
                { keys: 'ALT + X + I', desc: 'Admin Insumos', role: 'admin' },
                { keys: 'ALT + X + C', desc: 'Configuraciones', role: 'admin' },
                { keys: 'ALT + X + E', desc: 'Estadísticas Globales', role: 'admin' }
            );
        }

        return list;
    },

    init() {
        if (!sessionStorage.getItem('token') && !localStorage.getItem('token')) return;
        window.addEventListener('keydown', (e) => this.handle(e));
        console.log("⌨️ HotkeyManager: Toggle de búsqueda y Ayuda listos");
    },

    handle(e) {
        const key = e.key.toLowerCase();
        
        // EXCEPCIÓN: Detectamos si es Alt + G (Buscador) para permitirlo aunque esté escribiendo
        const isAltG = e.altKey && key === 'g';
        const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable;
        
        // Bloqueamos si escribe, EXCEPTO si presiona ESC o Alt+G
        if (isTyping && e.key !== 'Escape' && !isAltG) return;

        if (e.key === 'Escape') {
            this.closeModals();
            return;
        }

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

    execute(keys) {
        const chord = keys.join('');
        const roleId = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel'));
        const isAdmin = roleId === 1 || roleId === 2;

        const actions = {
            // TOGGLE BUSCADOR: Ejecuta el click del botón del menú (abre o cierra)
            'g': () => document.getElementById('btn-toggle-search-top')?.click() || document.getElementById('input-search-side')?.focus(),
            // ABRIR AYUDA: Alt + K
            'k': () => document.getElementById('btn-hotkeys-help')?.click(),
            
            'f': () => window.location.href = getCorrectPath('usuario/formularios.html'),
            'p': () => window.location.href = getCorrectPath('usuario/misprotocolos.html'),
            'a': () => window.location.href = getCorrectPath('usuario/misalojamientos.html'),
            'q': () => window.location.href = getCorrectPath('usuario/misformularios.html'),
            'qs': () => Auth.logout(),
            'h': () => window.location.href = getCorrectPath('construccion.html'),
            'y': () => window.location.href = getCorrectPath('construccion.html'),
            'o': () => document.getElementById('btn-theme-switch')?.click(),
            'm': () => document.getElementById('btn-layout-switch')?.click(),
            'l': () => document.getElementById('btn-font-switch')?.click(),
            'v': () => document.getElementById('btn-voice-switch')?.click(),
            
            // Admin
            'xa': () => isAdmin && (window.location.href = getCorrectPath('admin/alojamientos.html')),
            'xp': () => isAdmin && (window.location.href = getCorrectPath('admin/protocolos.html')),
            'xr': () => isAdmin && (window.location.href = getCorrectPath('admin/reactivos.html')),
            'xi': () => isAdmin && (window.location.href = getCorrectPath('admin/insumos.html')),
            'xc': () => isAdmin && (window.location.href = getCorrectPath('admin/configuracion/config.html')),
            'xe': () => isAdmin && (window.location.href = getCorrectPath('admin/estadisticas.html'))
        };

        if (actions[chord]) actions[chord]();
    },

    closeModals() {
        if (window.bootstrap) {
            document.querySelectorAll('.modal.show').forEach(m => {
                const modal = window.bootstrap.Modal.getInstance(m);
                if (modal) modal.hide();
            });
        }
        document.querySelectorAll('.dropdown-menu-gecko').forEach(m => m.classList.add('hidden'));
        document.getElementById('search-container-top')?.classList.add('hidden');
    }
};