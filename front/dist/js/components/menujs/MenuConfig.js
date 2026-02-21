import { API } from '../../api.js';
import { Auth } from '../../auth.js';

// --- HELPERS ---
export const getSession = (key) => sessionStorage.getItem(key) || localStorage.getItem(key);

const getBasePath = () => (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/';

export function getCorrectPath(rawPath) {
    if (!rawPath || rawPath === '#') return 'javascript:void(0);';
    if (rawPath === 'logout') return 'javascript:Auth.logout();';
    return `${getBasePath()}paginas/${rawPath}`;
}

export function getRoleName(level) {
    // Accedemos al objeto global cargado por tu i18n.js
    // Si window.txt.roles no existe todavía, devolvemos el número como fallback
    if (window.txt && window.txt.roles) {
        return window.txt.roles[level] || `Rol ${level}`;
    }
    return `${level}`;
}

export function getUserDisplayText() {
    const user = getSession('userName') || 'Usuario';
    const id = getSession('userId') || '?';
    const nombre = getSession('userFull'); 
    const apellido = getSession('userApe'); 
    const level = getSession('userLevel'); // Trae el número (1, 2, 3...)

    // Obtenemos la palabra traducida
    const rolTraducido = getRoleName(level);

    let fullName = user;
    if (nombre && apellido) fullName = `${nombre} ${apellido}`;

    // Ahora devolvemos la palabra en lugar del número
    return `${user} (${id}) - ${fullName} - ${rolTraducido}`;
}

// --- CONFIGURACIÓN Y PREFERENCIAS ---
const DEFAULTS = {
    THEME: 'light',
    LANG: localStorage.getItem('institutionLang') || 'es', 
    MENU_LAYOUT: 'menu_top',
    FONT_SIZE: 'chica'
};

export const UserPreferences = {
    userId: localStorage.getItem('userId'),
    
    icons: {
        moon: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1-8.313-12.454z"/></svg>`,
        sun: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 7a5 5 0 1 0 0 10a5 5 0 0 0 0-10zm0-5a1 1 0 0 0 1 1v3a1 1 0 0 0-2 0V3a1 1 0 0 0 1-1zm0 19a1 1 0 0 0-1 1v3a1 1 0 0 0 2 0v-3a1 1 0 0 0-1-1zm10-10a1 1 0 0 0-1-1h-3a1 1 0 0 0 0 2h3a1 1 0 0 0 1-1zM5 12a1 1 0 0 0-1-1H1a1 1 0 0 0 0 2h3a1 1 0 0 0 1-1zm13.364 7.778a1 1 0 0 0-1.414 0l-2.121 2.121a1 1 0 0 0 1.414 1.414l2.121-2.21a1 1 0 0 0 0-1.414zM6.157 4.737l-2.121 2.121a1 1 0 0 0 1.414 1.414l2.121-2.121a1 1 0 0 0-1.414-1.414zm11.314 0a1 1 0 0 0 0 1.414l2.121 2.121a1 1 0 0 0 1.414-1.414l-2.121-2.121a1 1 0 0 0-1.414 0zM6.157 19.07l2.121-2.121a1 1 0 0 0-1.414-1.414l-2.121 2.121a1 1 0 0 0 1.414 1.414z"/></svg>`,
        gecko: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm-5.5 3a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zm11 0a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM3.5 11.5a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zm17 0a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM12 11c3 1.5 4 4.5 4 8s-1.5 5-4 5-4-1.5-4-5 1-6.5 4-8z"/></svg>`,
        font_chica: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 4L5 20h2l2-5h7l2 5h2L12 4zm-3.5 9L12 6.5 15.5 13h-7z"/></svg>`,
        font_mediana: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M11 4L4 20h2l2-5h7l2 5h2L11 4zm-3.5 9L11 6.5 14.5 13h-7z"/><path d="M19 12l-4-4v3h-3v2h3v3z"/></svg>`,
        font_grande: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M10 4L3 20h2l2-5h7l2 5h2L10 4zm-3.5 9L10 6.5 13.5 13h-7z"/><path d="M18 8l-4-4v3h-3v2h3v3zM22 12l-4-4v3h-3v2h3v3z"/></svg>`
    },

    config: {
        theme: localStorage.getItem('theme') || DEFAULTS.THEME,
        lang: localStorage.getItem('lang') || DEFAULTS.LANG,
        menu: localStorage.getItem('menuLayout') || DEFAULTS.MENU_LAYOUT,
        fontSize: localStorage.getItem('fontSize') || 'chica',
        gecko_ok: localStorage.getItem('gecko_ok') || 2
    },

    init: async () => {
        UserPreferences.config.theme = localStorage.getItem('theme') || DEFAULTS.THEME;
        UserPreferences.config.lang = localStorage.getItem('lang') || DEFAULTS.LANG;
        UserPreferences.config.menu = localStorage.getItem('menuLayout') || DEFAULTS.MENU_LAYOUT;
        
        // Carga inicial del tamaño de fuente
        const savedFont = localStorage.getItem('fontSize');
        UserPreferences.config.fontSize = ['chica', 'mediana', 'grande'].includes(savedFont) ? savedFont : 'chica';
        
        UserPreferences.config.gecko_ok = localStorage.getItem('gecko_ok') || 2;

        UserPreferences.applyTheme(UserPreferences.config.theme);
        UserPreferences.applyLanguageVisuals(UserPreferences.config.lang);
        UserPreferences.applyFontSize(UserPreferences.config.fontSize);
        UserPreferences.applyVoiceVisuals(UserPreferences.config.gecko_ok);
        
        return UserPreferences.config.menu;
    },

    // --- CORREGIDO: CICLO DE TAMAÑO DE FUENTE ---
    cycleFontSize: async () => {
        const sizes = ['chica', 'mediana', 'grande'];
        
        // 1. Obtener estado actual (forzar 'chica' si es null)
        let current = UserPreferences.config.fontSize || 'chica';
        
        // 2. Calcular índice
        let currentIndex = sizes.indexOf(current);
        if (currentIndex === -1) currentIndex = 0;

        // 3. Siguiente tamaño
        let nextIndex = (currentIndex + 1) % sizes.length;
        const newSize = sizes[nextIndex];

        // 4. ACTUALIZAR ESTADO INTERNO (Importante para el próximo clic)
        UserPreferences.config.fontSize = newSize;

        // 5. Aplicar visualmente
        UserPreferences.applyFontSize(newSize);
        
        // 6. Guardar en backend
        await UserPreferences.saveBackend({ fontSize: newSize });
    },

    applyFontSize: (size) => {
        // Aplicamos al HTML para que el CSS (root) lo tome
        document.documentElement.setAttribute('data-font-size', size);
        localStorage.setItem('fontSize', size);
        
        // Actualizar el icono del botón
        const btn = document.getElementById('btn-font-switch');
        if (btn) {
            btn.innerHTML = UserPreferences.icons[`font_${size}`] || UserPreferences.icons.font_chica;
            btn.title = `Tamaño: ${size.toUpperCase()}`;
        }
    },

    toggleTheme: async () => {
        const newTheme = UserPreferences.config.theme === 'dark' ? 'light' : 'dark';
        UserPreferences.config.theme = newTheme;
        UserPreferences.applyTheme(newTheme);
        await UserPreferences.saveBackend({ theme: newTheme });
    },

    applyTheme: (theme) => {
        document.documentElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme', theme);
        const iconContainer = document.getElementById('pref-icon-theme');
        if (iconContainer) iconContainer.innerHTML = theme === 'dark' ? UserPreferences.icons.moon : UserPreferences.icons.sun;
    },

    toggleVoice: async () => {
        const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');

        if (isFirefox) {
            if(window.GeckoVoice) window.GeckoVoice.showUnsupportedBrowserModal();
            return; 
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            UserPreferences.applyVoiceVisuals('error');
            if(window.GeckoVoice) window.GeckoVoice.showErrorModal('not-allowed');
            return;
        }

        if (UserPreferences.config.gecko_ok == 1) {
            UserPreferences.config.gecko_ok = 2;
            if(window.GeckoVoice) window.GeckoVoice.stop();
        } else {
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
                UserPreferences.config.gecko_ok = 1;
                if(window.GeckoVoice) window.GeckoVoice.init();
            } catch (err) {
                UserPreferences.applyVoiceVisuals('error');
                if(window.GeckoVoice) window.GeckoVoice.showErrorModal('not-allowed');
                return;
            }
        }

        localStorage.setItem('gecko_ok', UserPreferences.config.gecko_ok);
        UserPreferences.applyVoiceVisuals(UserPreferences.config.gecko_ok);
        await UserPreferences.saveBackend({ gecko_ok: UserPreferences.config.gecko_ok });
    },

    applyVoiceVisuals: (state) => {
        const btn = document.getElementById('btn-voice-switch');
        if (!btn) return;
        btn.classList.remove('voice-status-1', 'voice-status-2', 'voice-status-null', 'voice-status-error');
        if (state == 'error') {
            btn.classList.add('voice-status-error');
            btn.style.color = "#000000"; 
        } else if (state == 1) {
            btn.classList.add('voice-status-1');
            btn.style.color = "#1a5d3b"; 
        } else {
            btn.classList.add('voice-status-2');
            btn.style.color = "#888888"; 
        }
    },

    setLanguage: async (lang) => {
        UserPreferences.config.lang = lang;
        localStorage.setItem('lang', lang);
        UserPreferences.applyLanguageVisuals(lang);
        await UserPreferences.saveBackend({ lang: lang });
        window.location.reload(); 
    },

    applyLanguageVisuals: (lang) => {
        const img = document.getElementById('pref-current-flag');
        if (img) {
            const flags = { 'es': 'es.png', 'en': 'us.png', 'pt': 'br.png' };
            img.src = `https://flagcdn.com/w40/${flags[lang] || 'es.png'}`;
        }
    },

    toggleMenuLayout: async () => {
        const newLayout = UserPreferences.config.menu === 'menu_top' ? 'menu_lateral' : 'menu_top';
        UserPreferences.config.menu = newLayout;
        localStorage.setItem('menuLayout', newLayout);
        await UserPreferences.saveBackend({ menu: newLayout });
        window.location.reload();
    },

    saveBackend: async (data) => {
        if (!UserPreferences.userId) return;
        const fd = new FormData();
        fd.append('userId', UserPreferences.userId);
        if (data.theme) fd.append('theme', data.theme);
        if (data.lang) fd.append('lang', data.lang);
        if (data.menu) fd.append('menu', data.menu);
        if (data.fontSize) fd.append('fontSize', data.fontSize);
        if (data.gecko_ok) fd.append('gecko_ok', data.gecko_ok);
        try {
            await API.request('/user/config/update', 'POST', fd);
        } catch (e) { console.error("Error persistencia:", e); }
    }
};

// --- GESTIÓN DE NOTIFICACIONES ---
export async function refreshMenuNotifications() {
    const instId = getSession('instId');
    if (!instId) return;

    try {
        const res = await API.request(`/menu/notifications?inst=${instId}`);
        
        if (res && res.status === "success" && res.data) {
            updateBadge(2, res.data.protocolos || 0);
            updateBadge(3, res.data.animales || 0);
            updateBadge(4, res.data.reactivos || 0);
            updateBadge(5, res.data.insumos || 0);
        }
    } catch (e) {
        console.warn("Fallo en notificaciones:", e);
    }
}

// --- FUNCIÓN INTERNA PARA PINTAR PUNTITOS (AGREGADA) ---
function updateBadge(menuId, count) {
    const iconContainer = document.querySelector(`.menu-icon[data-menu-id="${menuId}"]`);
    if (!iconContainer) return;

    let dot = iconContainer.querySelector('.notif-dot');
    
    if (count > 0) {
        if (!dot) {
            iconContainer.insertAdjacentHTML('beforeend', 
                `<div class="notif-dot bg-danger text-white position-absolute d-flex align-items-center justify-content-center shadow-sm" style="display:flex;">${count}</div>`
            );
        } else {
            dot.innerText = count;
            dot.style.display = 'flex';
        }
    } else if (dot) {
        dot.style.display = 'none';
    }
}

// --- OTROS HELPERS GLOBALES ---
export async function updateBreadcrumbInstitution() {
    const breadEl = document.getElementById('institucionbread');
    if (breadEl) {
        const instName = getSession('NombreInst') || 'GROBO';
        breadEl.innerText = instName.toUpperCase();
    }
}

export async function applyGlobalHeadConfigs() {
    const head = document.head;
    const basePath = (window.location.hostname === 'localhost') ? '/URBE-API-DRIVEN/front/' : '/front/';

    if (!document.querySelector('meta[name="robots"]')) {
        const robots = document.createElement('meta');
        robots.name = "robots";
        robots.content = "noindex, nofollow"; 
        head.appendChild(robots);
    }

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = "description";
        head.appendChild(metaDesc);
    }
    metaDesc.content = "GROBO - Gestor de Reactivos Biológicos Online. ERP web para la gestión de protocolos, gastos y reactivos biológicos.";

    let favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = "icon";
        favicon.type = "image/x-icon";
        head.appendChild(favicon);
    }
    favicon.href = `${basePath}dist/multimedia/imagenes/grobo/favicon.ico`; 
}