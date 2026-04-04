import { API } from '../../api.js';
import { Auth } from '../../auth.js';
import { loadLanguage, translatePage } from '../../utils/i18n.js';
import { mergeCapacitacionPrefsFromServer } from '../../utils/capacitacionTourPrefs.js';
import {
  mergeNoticiasVistaFromServer,
  syncCapUiPrefsToBackend,
} from '../../utils/userCapUiPrefsBackend.js';

// --- HELPERS ---
export const getSession = (key) => sessionStorage.getItem(key) || localStorage.getItem(key);

const getBasePath = () => (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/';

// ABRÍ TU ARCHIVO: menujs/MenuConfig.js
// Y REEMPLAZÁ LA FUNCIÓN getCorrectPath POR ESTO:

export function getCorrectPath(rawPath) {
    if (rawPath === 'logout') return 'javascript:Auth.logout();';

    const isLocalhost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const basePath = isLocalhost ? '/URBE-API-DRIVEN/front/' : '/';

    // Localhost: rutas limpias tipo /front/panel/dashboard sin try_files nginx caen en index (login) y queda "Validando…".
    // Forzar archivos reales bajo paginas/.
    if (isLocalhost) {
        // Animales / reactivos / insumos / reservas: los HTML viven solo en paginas/usuario/formularios/
        // (no existe paginas/panel/formularios/*.html para investigadores).
        if (rawPath.startsWith('panel/formularios/')) {
            const sub = rawPath.slice('panel/formularios/'.length).replace(/\.html$/i, '');
            return `${basePath}paginas/usuario/formularios/${sub}.html`;
        }
        const prefixes = ['panel/', 'admin/', 'usuario/', 'superadmin/'];
        for (const p of prefixes) {
            if (rawPath.startsWith(p)) {
                const rest = rawPath.slice(p.length);
                const folder = p.slice(0, -1);
                const pathPart = /\.html$/i.test(rest) ? rest : `${rest}.html`;
                return `${basePath}paginas/${folder}/${pathPart}`;
            }
        }
    }

    // Producción: mismos formularios de pedido bajo paginas/usuario/formularios/
    if (rawPath.startsWith('panel/formularios/')) {
        const sub = rawPath.slice('panel/formularios/'.length).replace(/\.html$/i, '');
        return `${basePath}paginas/usuario/formularios/${sub}.html`;
    }

    return basePath + rawPath;
}

/**
 * Carpeta bajo paginas/ para módulos “mis …” y formularios de investigador.
 * Alineado con menú / hotkeys: roles 1, 2, 4 → usuario; resto → panel.
 */
export function getPanelOrUsuarioPaginasSegment() {
    const r = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel') || '0', 10);
    return (r === 1 || r === 2 || r === 4) ? 'usuario' : 'panel';
}

export function getRoleName(level) {
    if (window.txt && window.txt.roles) {
        return window.txt.roles[level] || (window.txt.menu?.rol_fallback || 'Rol') + ' ' + level;
    }
    return (window.txt?.menu?.rol_fallback || 'Rol') + ' ' + level;
}

export function getUserDisplayText() {
    const user = getSession('userName') || (window.txt?.menu?.usuario_default || 'Usuario');
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
    // YA NO LO DEFINIMOS ACÁ ARRIBA. Lo calcularemos dinámicamente cuando se necesite.
    
    icons: {
        moon: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1-8.313-12.454z"/></svg>`,
        sun: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.8 5.2a.75.75 0 011.06 0l1.59 1.59a.75.75 0 11-1.06 1.06l-1.59-1.59a.75.75 0 010-1.06zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.74 17.74a.75.75 0 010 1.06l-1.59 1.59a.75.75 0 11-1.06-1.06l1.59-1.59a.75.75 0 011.06 0zM12 18.75a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25a.75.75 0 01.75-.75zM6.26 17.74a.75.75 0 01-1.06 0l-1.59 1.59a.75.75 0 111.06 1.06l1.59-1.59a.75.75 0 010-1.06zM4.5 12a.75.75 0 01-.75.75H1.5a.75.75 0 010-1.5h2.25a.75.75 0 01.75.75zM5.2 5.2a.75.75 0 010 1.06l-1.59 1.59a.75.75 0 01-1.06-1.06l1.59-1.59a.75.75 0 011.06 0z"/></svg>`,        gecko: `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm-5.5 3a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zm11 0a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM3.5 11.5a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zm17 0a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM12 11c3 1.5 4 4.5 4 8s-1.5 5-4 5-4-1.5-4-5 1-6.5 4-8z"/></svg>`,
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
        const roleId = parseInt(getSession('userLevel') || '0', 10);
        const instId = parseInt(getSession('instId') || '0', 10);
        try {
            // Tipo 1 / contexto sin institución no debe depender de este endpoint.
            if (!(roleId === 1 || instId === 0)) {
                const res = await API.request('/user/config/get', 'GET');
                
                if (res && res.status === 'success' && res.data) {
                    const dbConfig = res.data;
                    if (dbConfig.tema_preferido) localStorage.setItem('theme', dbConfig.tema_preferido);
                    if (dbConfig.idioma_preferido) localStorage.setItem('lang', dbConfig.idioma_preferido);
                    if (dbConfig.letra_preferida) localStorage.setItem('fontSize', dbConfig.letra_preferida);
                    if (dbConfig.menu_preferido) localStorage.setItem('menuLayout', dbConfig.menu_preferido);
                    if (dbConfig.gecko_ok !== null && dbConfig.gecko_ok !== "") localStorage.setItem('gecko_ok', dbConfig.gecko_ok);
                    mergeCapacitacionPrefsFromServer(dbConfig);
                    mergeNoticiasVistaFromServer(dbConfig);
                    if (!sessionStorage.getItem('gecko_cap_ui_synced')) {
                        sessionStorage.setItem('gecko_cap_ui_synced', '1');
                        syncCapUiPrefsToBackend();
                    }
                }
            }
        } catch (e) {
            console.warn("No se pudo cargar la config de BD, usando local.", e);
        }

        UserPreferences.config.theme = localStorage.getItem('theme') || DEFAULTS.THEME;
        UserPreferences.config.lang = localStorage.getItem('lang') || DEFAULTS.LANG;
        UserPreferences.config.menu = localStorage.getItem('menuLayout') || DEFAULTS.MENU_LAYOUT;
        
        const savedFont = localStorage.getItem('fontSize');
        UserPreferences.config.fontSize = ['chica', 'mediana', 'grande'].includes(savedFont) ? savedFont : 'chica';
        UserPreferences.config.gecko_ok = localStorage.getItem('gecko_ok') || 2;

        UserPreferences.applyTheme(UserPreferences.config.theme);
        UserPreferences.applyLanguageVisuals(UserPreferences.config.lang);
        UserPreferences.applyFontSize(UserPreferences.config.fontSize);
        UserPreferences.applyVoiceVisuals(UserPreferences.config.gecko_ok);
        // Recargar idioma y traducir si la config de BD difiere del inicial (persistencia)
        await loadLanguage(UserPreferences.config.lang);
        if (typeof translatePage === 'function') translatePage();
        
        return UserPreferences.config.menu;
    },

    cycleFontSize: async () => {
        const sizes = ['chica', 'mediana', 'grande'];
        let current = UserPreferences.config.fontSize || 'chica';
        let currentIndex = sizes.indexOf(current);
        if (currentIndex === -1) currentIndex = 0;

        let nextIndex = (currentIndex + 1) % sizes.length;
        const newSize = sizes[nextIndex];

        await UserPreferences.setFontSizeChoice(newSize);
    },

    /** Tamaño explícito (p. ej. asistente inicial) sin ciclar. */
    setFontSizeChoice: async (size) => {
        const s = ['chica', 'mediana', 'grande'].includes(size) ? size : 'chica';
        UserPreferences.config.fontSize = s;
        UserPreferences.applyFontSize(s);
        await UserPreferences.saveBackend({ fontSize: s });
    },

    applyFontSize: (size) => {
        document.documentElement.setAttribute('data-font-size', size);
        localStorage.setItem('fontSize', size);
        document.querySelectorAll('.btn-font-switch').forEach(btn => {
            btn.innerHTML = UserPreferences.icons[`font_${size}`] || UserPreferences.icons.font_chica;
            const label = (window.txt?.menu?.tamanio_label || 'Tamaño:') + ' ' + size.toUpperCase();
            btn.title = label;
        });
    },

    toggleTheme: async () => {
        const newTheme = UserPreferences.config.theme === 'dark' ? 'light' : 'dark';
        await UserPreferences.setThemeChoice(newTheme);
    },

    /** Tema explícito light | dark (p. ej. asistente inicial). */
    setThemeChoice: async (theme) => {
        const t = theme === 'dark' ? 'dark' : 'light';
        UserPreferences.config.theme = t;
        UserPreferences.applyTheme(t);
        await UserPreferences.saveBackend({ theme: t });
    },

    applyTheme: (theme) => {
        document.documentElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme', theme);
        document.querySelectorAll('.pref-icon-theme').forEach(icon => {
            icon.innerHTML = theme === 'dark' ? UserPreferences.icons.moon : UserPreferences.icons.sun;
        });
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
            if (window.GeckoVoice) window.GeckoVoice.showErrorModal('no-api');
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
        document.querySelectorAll('.btn-voice-switch').forEach(btn => {
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
        });
    },

    /** Cambia idioma sin recargar (tutorial / asistente inicial). */
    applyLanguageChoice: async (lang) => {
        const code = lang === 'en' || lang === 'pt' ? lang : 'es';
        UserPreferences.config.lang = code;
        localStorage.setItem('lang', code);
        localStorage.setItem('idioma', code);
        UserPreferences.applyLanguageVisuals(code);
        await loadLanguage(code);
        if (typeof translatePage === 'function') translatePage();
        await UserPreferences.saveBackend({ lang: code });
    },

    setLanguage: async (lang) => {
        await UserPreferences.applyLanguageChoice(lang);
        window.location.reload();
    },

    applyLanguageVisuals: (lang) => {
        document.querySelectorAll('.pref-current-flag').forEach(img => {
            const flags = { 'es': 'es.png', 'en': 'us.png', 'pt': 'br.png' };
            img.src = `https://flagcdn.com/w40/${flags[lang] || 'es.png'}`;
        });
    },

    /** menu_top | menu_lateral — sin recargar (asistente inicial aplica reload al final). */
    setMenuLayoutChoice: async (layout) => {
        const m = layout === 'menu_lateral' ? 'menu_lateral' : 'menu_top';
        UserPreferences.config.menu = m;
        localStorage.setItem('menuLayout', m);
        await UserPreferences.saveBackend({ menu: m });
    },

    toggleMenuLayout: async () => {
        const newLayout = UserPreferences.config.menu === 'menu_top' ? 'menu_lateral' : 'menu_top';
        await UserPreferences.setMenuLayoutChoice(newLayout);
        window.location.reload();
    },

    saveBackend: async (data) => {
        // --- LA CORRECCIÓN CLAVE ---
        // Utilizamos el Helper de Auth para buscar la variable híbrida de Sesión
        const userId = Auth.getVal('userId');
        
        if (!userId) {
            console.error("❌ Guardado cancelado: No se detectó un usuario activo.");
            return;
        }

        const payload = {};
        if (data.theme) payload.theme = data.theme;
        if (data.lang) payload.lang = data.lang;
        if (data.menu) payload.menu = data.menu;
        if (data.fontSize) payload.fontSize = data.fontSize;
        if (data.gecko_ok !== undefined) payload.gecko_ok = data.gecko_ok;
        if (data.setupWizardDone !== undefined) payload.setupWizardDone = data.setupWizardDone ? 1 : 0;
        if (data.capAutoTourOff !== undefined) payload.capAutoTourOff = data.capAutoTourOff ? 1 : 0;
        if (data.capHelpFabHidden !== undefined) payload.capHelpFabHidden = data.capHelpFabHidden ? 1 : 0;

        try {
            const res = await API.request('/user/config/update', 'POST', payload);
            console.log("🛠️ Debug de guardado en BD:", res);
        } catch (e) { 
            console.error("❌ Error persistencia:", e); 
        }
    }
};

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

    // 1. AJUSTE DE RUTA: En producción debe ser '/' para URLs enmascaradas
    const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
        ? '/URBE-API-DRIVEN/front/' 
        : '/';

    // Configuración de Robots
    if (!document.querySelector('meta[name="robots"]')) {
        const robots = document.createElement('meta');
        robots.name = "robots";
        robots.content = "noindex, nofollow"; 
        head.appendChild(robots);
    }

    // Configuración de Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = "description";
        head.appendChild(metaDesc);
    }
    metaDesc.content = "GROBO - Gestor de Reactivos Biológicos Online. ERP web para la gestión de protocolos, gastos y reactivos biológicos.";

    // 2. CONFIGURACIÓN DINÁMICA DEL FAVICON
    let favicon = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]');
    
    if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = "icon";
        favicon.type = "image/x-icon";
        head.appendChild(favicon);
    }
    
    // Usamos la ruta absoluta construida con el basePath
    favicon.href = `${basePath}dist/multimedia/imagenes/grobo/favicon.ico`; 
}