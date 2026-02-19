import { Auth } from '../auth.js';
import { API } from '../api.js'; // <--- ESTA ES LA IMPORTACIÓN CRÍTICA QUE FALTABA
import { GeckoVoice } from './GeckoVoice.js';
import { executeGlobalSearch,initGlobalSearchUI } from './GeckoSearch.js';
import { HotkeyManager } from '../utils/hotkeys.js';


// --- HELPER PARA LEER SESIÓN ---
const getSession = (key) => sessionStorage.getItem(key) || localStorage.getItem(key);

// --- HELPER HÍBRIDO (Local vs Web) ---
const getBasePath = () => {
    return (window.location.hostname === 'localhost') 
        ? '/URBE-API-DRIVEN/front/' 
        : '/front/';
};

// --- GENERADOR DE RUTAS ABSOLUTAS ---
// Esto evita que te mande al 404 o a la raíz. Siempre apunta a 'paginas/'
export function getCorrectPath(rawPath) {
    if (!rawPath || rawPath === '#') return 'javascript:void(0);';
    if (rawPath === 'logout') return 'javascript:Auth.logout();';
    return `${getBasePath()}paginas/${rawPath}`;
}


const DEFAULTS = {
    THEME: 'light',
    LANG: localStorage.getItem('institutionLang') || 'es', 
    MENU_LAYOUT: 'menu_top',
    FONT_SIZE: 'chica'
};

const UserPreferences = {
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
        
        const savedFont = localStorage.getItem('fontSize');
        UserPreferences.config.fontSize = ['chica', 'mediana', 'grande'].includes(savedFont) ? savedFont : 'chica';
        UserPreferences.config.gecko_ok = localStorage.getItem('gecko_ok') || 2;

        UserPreferences.applyTheme(UserPreferences.config.theme);
        UserPreferences.applyLanguageVisuals(UserPreferences.config.lang);
        UserPreferences.applyFontSize(UserPreferences.config.fontSize);
        UserPreferences.applyVoiceVisuals(UserPreferences.config.gecko_ok);
        
        return UserPreferences.config.menu;
    },

    cycleFontSize: async () => {
        const sizes = ['chica', 'mediana', 'grande'];
        let current = UserPreferences.config.fontSize;
        let currentIndex = sizes.indexOf(current);
        if (currentIndex === -1) currentIndex = 0;

        let nextIndex = (currentIndex + 1) % sizes.length;
        const newSize = sizes[nextIndex];

        UserPreferences.config.fontSize = newSize;
        UserPreferences.applyFontSize(newSize);
        await UserPreferences.saveBackend({ fontSize: newSize });
    },

    applyFontSize: (size) => {
        document.documentElement.setAttribute('data-font-size', size);
        localStorage.setItem('fontSize', size);
        
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
        // 1. Guardamos la preferencia en el navegador
        UserPreferences.config.lang = lang;
        localStorage.setItem('lang', lang);
        
        // 2. Actualizamos la banderita visualmente (opcional, pero queda bien)
        UserPreferences.applyLanguageVisuals(lang);
        
        // 3. Guardamos en el servidor (Base de datos)
        // Usamos await para asegurar que se guarde ANTES de recargar
        await UserPreferences.saveBackend({ lang: lang });
        
        // 4. ¡EL REFRESCO!
        // Esto recarga la página, vuelve a ejecutar el HTML,
        // lee el nuevo 'lang' del localStorage y carga el archivo correcto.
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

function updateBadge(menuId, count) {
    // YA NO USAMOS MENU_TEMPLATES AQUÍ.
    // Buscamos directamente el elemento por su ID de datos
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

export async function initMenu() {
    const roleId = parseInt(getSession('userLevel')); 
    const instId = getSession('instId') || 0; 
    
    console.log("🚀 InitMenu -> Rol:", roleId, "| Inst:", instId);

    if (isNaN(roleId)) {
        console.warn("Menú detenido: No hay rol de usuario definido.");
        return;
    }

    const resultsTop = document.getElementById('search-results-top');
    
    if(resultsTop) {
        resultsTop.innerHTML = '';      // Vaciar contenido
        resultsTop.classList.add('d-none'); // Ocultar visualmente
    }

        // --- AQUÍ ESTÁ EL CAMBIO CRÍTICO ---
        // Definimos los templates DENTRO de la función, cuando window.txt ya existe.
        if (!window.txt) {
            console.error("❌ Idioma no cargado. Ejecuta await loadLanguage() antes de initMenu().");
            return;
        }

    const MENU_TEMPLATES = {
        1: { label: window.txt.menu.users, svg: `<svg viewBox="0 0 640 512"><path d="M320 16a104 104 0 1 1 0 208a104 104 0 1 1 0-208M96 88a72 72 0 1 1 0 144a72 72 0 1 1 0-144M0 416c0-70.7 57.3-128 128-128c12.8 0 25.2 1.9 36.9 5.4C132 330.2 112 378.8 112 432v16c0 11.4 2.4 22.2 6.7 32H32c-17.7 0-32-14.3-32-32zm521.3 64c4.3-9.8 6.7-20.6 6.7-32v-16c0-53.2-20-101.8-52.9-138.6c11.7-3.5 24.1-5.4 36.9-5.4c70.7 0 128 57.3 128 128v32c0 17.7-14.3 32-32 32zM472 160a72 72 0 1 1 144 0a72 72 0 1 1-144 0M160 432c0-88.4 71.6-160 160-160s160 71.6 160 160v16c0 17.7-14.3 32-32 32H192c-17.7 0-32-14.3-32-32z"/></svg>`, path: 'admin/usuarios.html' },
        2: { label: window.txt.menu.protocols, svg: `<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`, path: 'admin/protocolos.html' },
        3: { label: window.txt.menu.animals, svg: `<svg viewBox="0 0 32 32"><path d="M17.67 6.32c0-2.39-1.94-4.33-4.33-4.33A4.34 4.34 0 0 0 9 6.32c0 .17.01.33.03.49h-.001a3.855 3.855 0 0 1-.027-.362A4.008 4.008 0 0 0 9 6.562v.26L5.978 8.949L2.91 11.1c-.57.4-.91 1.05-.91 1.75c0 1.18.96 2.14 2.14 2.14h3.832a9.065 9.065 0 0 0 1.778 2.87l-1.21 4.73c-.05.2.1.4.3.4H11c.42 0 .73-.2.87-.74l.61-2.35c1.2.58 2.53 1.1 3.93 1.1h.63c-.6 0-1.08.449-1.08 1.01c0 .561.48 1.01 1.08 1.01h5.241c-1.281 0-2.172-1.301-2.578-2.02h.035l.013.023a4.52 4.52 0 0 1 4.043-6.543a.5.5 0 1 1 0 1a3.52 3.52 0 0 0 0 7.04h3.1c.2 0 .394-.022.581-.064a3.369 3.369 0 0 1-2.845 1.564l-5.64-.01a2.99 2.99 0 0 0-.01 5.98L23 30c.55 0 1-.44 1.01-1c0-.55-.45-1-1-1l-4.02-.01c-.55 0-.99-.44-.99-.99s.44-.99.99-.99l5.64.01c2.96 0 5.37-2.41 5.37-5.37v-6.181a.993.993 0 0 0-.054-.323c-.558-5.22-5.371-9.083-10.626-7.946l-1.66.427a5.19 5.19 0 0 0 .01-.307Zm-1.924.188a2.482 2.482 0 1 1-4.965 0a2.482 2.482 0 0 1 4.965 0ZM7.426 12.5a1.105 1.105 0 1 1 0-2.21a1.105 1.105 0 0 1 0 2.21Zm-4.216-.73c.46.13.79.54.79 1.04c0 .51-.35.93-.82 1.05c-.17-.3-.26-.65-.26-1.02c0-.38.1-.75.29-1.07Z"/></svg>`, path: 'admin/animales.html' },
        4: { label: window.txt.menu.reagents, svg: `<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-1 11h-5v5h-2v-5H6v-2h5V7h2v5h5v2z"/></svg>`, path: 'admin/reactivos.html' },
        5: { label: window.txt.menu.supplies, svg: `<svg viewBox="0 0 20 20"><path d="M10.428 2.212a.645.645 0 0 0-.857 0a5.716 5.716 0 0 0-1.926 4.35a.5.5 0 0 0 .246.425A7.407 7.407 0 0 1 9.628 8.41a.5.5 0 0 0 .743 0a7.408 7.408 0 0 1 1.737-1.421a.5.5 0 0 0 .245-.425a5.716 5.716 0 0 0-1.925-4.351Zm-7.412 9.996a.663.663 0 0 1 .606-.72A6.364 6.364 0 0 1 10 15.326a6.364 6.364 0 0 1 6.377-3.838c.366.03.64.352.606.72A6.368 6.368 0 0 1 10.64 18h-.465a.665.665 0 0 1-.176-.024a.665.665 0 0 1-.177.024h-.465a6.368 6.368 0 0 1-6.342-5.792ZM10 10.826a6.364 6.364 0 0 0-6.378-3.838a.663.663 0 0 0-.606.72a6.35 6.35 0 0 0 .765 2.5a.5.5 0 0 0 .434.258a7.357 7.357 0 0 1 5.368 2.394a.5.5 0 0 0 .417.16a.5.5 0 0 0 .416-.16a7.357 7.357 0 0 1 5.368-2.394a.5.5 0 0 0 .434-.259a6.35 6.35 0 0 0 .765-2.499a.663.663 0 0 0-.606-.72A6.364 6.364 0 0 0 10 10.826Z"/></svg>`, path: 'admin/insumos.html' },
        6: { label: window.txt.menu.reservations, svg: `<svg viewBox="0 0 26 26"><path d="M7 0c-.551 0-1 .449-1 1v3c0 .551.449 1 1 1c.551 0 1-.449 1-1V1c0-.551-.449-1-1-1zm12 0c-.551 0-1 .449-1 1v3c0 .551.449 1 1 1c.551 0 1-.449 1-1V1c0-.551-.449-1-1-1zM3 2C1.344 2 0 3.344 0 5v18c0 1.656 1.344 3 3 3h20c1.656 0 3-1.344 3-3V5c0-1.656-1.344-3-3-3h-2v2a2 2 0 0 1-4 0V2H9v2a2 2 0 0 1-4 0V2H3zM2 9h22v14c0 .551-.449 1-1 1H3c-.551 0-1-.449-1-1V9zm7 3v2.313h4.813l-3.782 7.656H13.5l3.469-8.438V12H9z"/></svg>`, path: 'construccion.html' },
        7: { label: window.txt.menu.accommodations, svg: `<svg viewBox="0 0 576 512"><path d="M575.8 255.5c0 18-15 32.1-32 32.1h-32l.7 160.2c0 2.7-.2 5.4-.5 8.1v16.2c0 22.1-17.9 40-40 40h-16c-1.1 0-2.2 0-3.3-.1c-1.4.1-2.8.1-4.2.1L416 512h-24c-22.1 0-40-17.9-40-40v-88c0-17.7-14.3-32-32-32h-64c-17.7 0-32 14.3-32 32v88c0 22.1-17.9 40-40 40h-55.9c-1.5 0-3-.1-4.5-.2c-1.2.1-2.4.2-3.6.2h-16c-22.1 0-40-17.9-40-40V360c0-.9 0-1.9.1-2.8v-69.7h-32c-18 0-32-14-32-32.1c0-9 3-17 10-24L266.4 8c7-7 15-8 22-8s15 2 21 7l255.4 224.5c8 7 12 15 11 24"/></svg>`, path: 'admin/alojamientos.html' },
        8: { label: window.txt.menu.stats, svg: `<svg viewBox="0 0 24 24"><path d="M20 13.75a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75v6.75H14V4.25c0-.728-.002-1.2-.048-1.546c-.044-.325-.115-.427-.172-.484c-.057-.057-.159-.128-.484-.172C12.949 2.002 12.478 2 11.75 2c-.728 0-1.2.002-1.546.048c-.325.044-.427.115-.484.172c-.057.057-.128.159-.172.484c-.046.347-.048.818-.048 1.546V20.5H8V8.75A.75.75 0 0 0 7.25 8h-3a.75.75 0 0 0-.75.75V20.5H1.75a.75.75 0 0 0 0 1.5h20a.75.75 0 0 0 0-1.5H20v-6.75Z"/></svg>`, path: 'admin/estadisticas.html' },
        9: { label: window.txt.menu.admin_config, svg: `<svg viewBox="0 0 24 24"><path d="M12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5m7 2c0-1.1.9-2 2-2V9.5c-1.1 0-2-.9-2-2s.9-2 2-2V4c0-1.1-.9-2-2-2h-3c0 1.1-.9 2-2 2s-2-.9-2-2H4c-1.1 0-2 .9-2 2v1.5c1.1 0 2 .9 2 2s-.9 2-2 2V15c1.1 0 2 .9 2 2s-.9 2-2 2V20c0 1.1.9 2 2 2h3c0-1.1-.9-2 2-2s2 .9 2 2h3c1.1 0 2-.9 2-2v-2.5z"/></svg>`, path: 'admin/configuracion/config.html' },
        10: { label: window.txt.menu.forms, svg: `<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`, path: 'usuario/formularios.html' },
        11: { label: window.txt.menu.my_forms, svg: `<svg viewBox="0 0 24 24"><path d="M13 1.07l1 1 .03.02L18.41 7.5c.39.39.39 1.02 0 1.41L13 14.34l-1-1L17 8.5 13 4.5V2H8c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM8 4h3v1h-3V4z"/></svg>`, path: 'usuario/misformularios.html' },
        12: { label: window.txt.menu.my_accommodations, svg: `<svg viewBox="0 0 576 512"><path d="M280.37 148.26L96 300.11V464a16 16 0 0 0 16 16l40 .06a16 16 0 0 0 16-16V344a16 16 0 0 1 16-16h88a16 16 0 0 1 16 16v120a16 16 0 0 0 16 16l40 .06a16 16 0 0 0 16-16V300.11zM571 225.47L488 153.47V48a16 16 0 0 0-16-16h-48a16 16 0 0 0-16 16v51.33L313.43 14.3a16 16 0 0 0-20.48 0L4.38 225.47a16 16 0 0 0 2.06 22.44l15.11 12.65a16 16 0 0 0 22.59-2.22L288 64.82l243.86 203.52a16 16 0 0 0 22.59 2.22l15.11-12.65a16 16 0 0 0 1.44-22.44z"/></svg>`, path: 'usuario/misalojamientos.html' },
        13: { label: window.txt.menu.my_history, svg: `<svg viewBox="0 0 24 24"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>`, path: 'construccion.html' },
        14: { label: window.txt.menu.my_reservations, svg: `<svg viewBox="0 0 26 26"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>`, path: 'usuario/construccion.html' },
        15: { label: window.txt.menu.my_protocols, svg: `<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`, path: 'admin/protocolos.html' },
        203: { label: window.txt.menu.my_protocols, svg: `<svg viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/></svg>`,path: 'usuario/misprotocolos.html' },
        
        55: { 
            label: window.txt.menu.investigator_group, 
            svg: `<svg viewBox="0 0 24 24"><path d="M12.75 15.5h5.25v8h-5.25zM15 18h3m0 2h-3m-3.5-4.25h-8v8h5.25zM16 5.75V3.5m2-3.5H6a3 3 0 0 0-3 3v11.25h8v-7.5h-6v-3h12v3.25h-6v7.5h8V3a3 3 0 0 0-3-3z"/></svg>`,
            isDropdown: true,
            children: [
                { label: window.txt.menu.my_forms, path: 'usuario/misformularios.html' },
                { label: window.txt.menu.my_accommodations, path: 'usuario/misalojamientos.html' },
                { label: window.txt.menu.my_reservations, path: 'construccion.html' },
                { label: window.txt.menu.my_protocols, path: 'usuario/misprotocolos.html' }
            ]
        },

        202: { 
            label: window.txt.menu.accounting_group, 
            svg: `<svg viewBox="0 0 24 24"><path d="M12.75 15.5h5.25v8h-5.25zM15 18h3m0 2h-3m-3.5-4.25h-8v8h5.25zM16 5.75V3.5m2-3.5H6a3 3 0 0 0-3 3v11.25h8v-7.5h-6v-3h12v3.25h-6v7.5h8V3a3 3 0 0 0-3-3z"/></svg>`,
            isDropdown: true,
            children: [
                { label: window.txt.menu.prices, path: 'admin/precios.html' },
                { label: window.txt.menu.billing, path: 'admin/facturacion/index.html' },
                { label: 'Historial Pagos', path: 'construccion.html' }
            ]
        },

            998: { 
            label: window.txt.menu.help_group, 
            svg: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3m0 4h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
            isDropdown: true,
            children: [
                { label: 'Capacitación', path: 'construccion.html' },
                { label: 'Ticket/Contacto', path: 'construccion.html' },
                { label: 'Preguntas frecuentes', path: 'construccion.html' },
                { label: 'Ventas', path: 'construccion.html' }
            ]
        },
        999: { 
            label: window.txt.menu.profile_group, 
            svg: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08s5.97 1.09 6 3.08c-1.29 1.94-3.5 3.22-6 3.22z"/></svg>`,
            isDropdown: true,
            children: [
                { label: window.txt.menu.config, path: 'usuario/perfil.html' },
                { label: window.txt.menu.logout, path: 'logout' }
            ]
        }
    };

    const menuLayout = await UserPreferences.init();

    window.GeckoVoice = GeckoVoice;
    window.executeGlobalSearch = (typeof executeGlobalSearch !== 'undefined') ? executeGlobalSearch : () => console.log("Buscador no cargado");
    window.setAppLang = UserPreferences.setLanguage;

    try {
        const resMenu = await API.request(`/menu?role=${roleId}&inst=${instId}`);

        if (resMenu && resMenu.status === "success") {
            let ids = (resMenu.data || []).map(id => Number(id));
            
            if (![1, 2].includes(roleId)) ids = ids.filter(id => id !== 9);
            [999, 998, 10].forEach(fixedId => { if(!ids.includes(fixedId)) ids.push(fixedId); });

            const elementsToRemove = ['header.gecko-header', '#gecko-sidebar-element', '#gecko-mobile-toggle', '#gecko-mobile-toggle-top'];
            elementsToRemove.forEach(selector => {
                const el = document.querySelector(selector);
                if (el) el.remove();
            });

            if (menuLayout === 'menu_lateral') {
                // Pasamos los templates como parámetro
                renderSideMenuStructure(document.body, ids, MENU_TEMPLATES);
            } else {
                // Pasamos los templates como parámetro
                renderTopMenuStructure(document.body, ids, MENU_TEMPLATES);
            }

            applyGlobalHeadConfigs();
            setupEventListeners();
            updateBreadcrumbInstitution();

            if (localStorage.getItem('gecko_ok') == 1) {
                if (navigator.userAgent.toLowerCase().includes('firefox')) {
                    localStorage.setItem('gecko_ok', 2);
                    GeckoVoice.showUnsupportedBrowserModal();
                    UserPreferences.applyVoiceVisuals('error');
                } else {
                    GeckoVoice.init();
                }
            }

            UserPreferences.applyTheme(UserPreferences.config.theme);
            UserPreferences.applyLanguageVisuals(UserPreferences.config.lang);
            UserPreferences.applyFontSize(UserPreferences.config.fontSize);
        }
    } catch (err) { console.error("MenuComponent Error:", err); }

    initGlobalSearchUI();
}
function getUserDisplayText() {
    const user = getSession('userName') || 'Usuario';
    const id = getSession('userId') || '?';
    const nombre = getSession('userFull'); 
    const apellido = getSession('userApe'); 

    let fullName = user;
   // if (nombre && apellido && nombre !== user) {
        fullName = `${nombre} ${apellido}`;
  /*  } else if (nombre && nombre !== user) {
        fullName = nombre;
    }

    if (fullName === user) {
        return `${user} (${id})`;
    }*/
    return `${user} (${id}) - ${fullName}`;
}

function renderTopMenuStructure(container, menuIds, templates) {
    document.body.classList.remove('with-sidebar');
    const instName = localStorage.getItem('NombreInst') || 'INSTITUCIÓN';
    const userText = getUserDisplayText();

    const header = document.createElement('header');
    header.className = "w-full gecko-header gecko-header-top bg-transparent mb-2"; 
    // ... el HTML interno del header se mantiene igual ...
    header.innerHTML = `...`; // (Copia tu HTML del header aquí si lo borraste por error, no cambia)

    // Solo asegúrate de copiar el resto del HTML del header original que tienes
    header.innerHTML = `
        <div class="container-fluid pt-2 pb-1">
            <div class="d-flex justify-content-between align-items-center w-100 px-md-5 mb-2" style="font-size: 11px;">
                <div class="d-flex align-items-center gap-3">
                    <a href="https://groboapp.com" target="_blank" class="text-decoration-none text-success fw-bold">GROBO - ERP BIOTERIOS</a>
                    <div class="d-flex flex-column lh-1 border-start ps-3">
                        <span class="text-secondary fw-black text-uppercase">${instName}</span>
                        <span class="text-muted fw-bold mt-1" style="font-size: 10px;">${userText}</span>
                    </div>
                </div>
                <a href="https://geckos.uy" target="_blank" class="text-decoration-none text-dark border-bottom border-success fw-bold geckos-link">GECKOS.uy</a>
            </div>

            <nav class="w-full d-flex flex-column align-items-center position-relative">
                <div class="d-flex align-items-center position-relative">
                    <button id="gecko-mobile-toggle-top" class="btn btn-link text-success d-md-none position-absolute start-0 ms-n4">
                        <svg width="28" height="28" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg>
                    </button>
                    <ul id="main-menu-ul" class="nav border-success bg-body p-1 shadow-sm align-items-center d-none d-md-flex gap-1 custom-menu-pill">
                    </ul>
                </div>

                <button id="btn-toggle-search-top" class="btn btn-link text-success p-0 mt-1 d-none d-md-block" title="Buscador Global">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>
                </button>

                <div id="search-container-top" class="hidden search-panel-float shadow border rounded-3 p-2 bg-body">
                    <div class="input-group">
                        <input type="text" id="input-search-top" class="form-control form-control-sm border-0 bg-transparent" placeholder="Buscador global...">
                        <button class="btn btn-success btn-sm px-3 rounded-2" onclick="window.executeGlobalSearch('top')">BUSCAR</button>
                    </div>
                    <div id="search-results-top" class="search-results-list small mt-2"></div>
                </div>
            </nav>
        </div>
        
        <aside id="gecko-sidebar-element" class="gecko-sidebar d-md-none bg-body-tertiary">
            <div class="d-flex justify-content-between align-items-center p-3 border-bottom">
                <div class="d-flex flex-column">
                    <span class="fw-bold text-success small text-uppercase">${instName}</span>
                    <span class="text-muted" style="font-size: 9px;">${userText}</span>
                </div>
                <button class="btn-close" id="gecko-close-sidebar"></button>
            </div>
            <ul class="nav flex-column p-3" id="mobile-menu-ul"></ul>
        </aside>
    `;
    
    document.body.prepend(header);
    const ulDesktop = document.getElementById('main-menu-ul');
    const ulMobile = document.getElementById('mobile-menu-ul');
    
    menuIds.forEach(id => {
        // PASAMOS TEMPLATES
        ulDesktop.insertAdjacentHTML('beforeend', buildMenuItemHTML(id, 'top', templates));
        ulMobile.insertAdjacentHTML('beforeend', buildMenuItemHTML(id, 'side', templates));
    });
    ulDesktop.insertAdjacentHTML('beforeend', buildControlsHTML('top'));
    ulMobile.insertAdjacentHTML('beforeend', buildControlsHTML('side'));
}

function renderSideMenuStructure(container, menuIds, templates) {
    document.body.classList.add('with-sidebar');
    const instName = localStorage.getItem('NombreInst') || 'INSTITUCIÓN';
    const userText = getUserDisplayText();

    const sidebar = document.createElement('aside');
    sidebar.id = "gecko-sidebar-element";
    sidebar.className = "gecko-sidebar d-flex flex-column flex-shrink-0 p-3 border-end shadow-sm";
    
    sidebar.innerHTML = `
        <div class="d-flex flex-column mb-4 border-bottom pb-3">
            <div class="d-flex justify-content-between align-items-center w-100">
                <div class="d-flex flex-column" style="overflow: hidden;">
                    <span class="fs-5 fw-black text-success text-uppercase lh-1 text-truncate" title="${instName}">${instName}</span>
                    <span class="text-muted mt-1 text-truncate" style="font-size: 11px; font-weight: 600;" title="${userText}">${userText}</span>
                </div>
                <button class="btn-close d-md-none ms-2" id="gecko-close-sidebar"></button>
            </div>
        </div>

        <div class="px-2 mb-4">
            <div class="input-group border rounded-pill bg-body px-2 py-1 shadow-sm">
                <input type="text" id="input-search-side" class="form-control form-control-sm border-0 bg-transparent" placeholder="Buscador global...">
                <button class="btn btn-link text-success p-0 ms-1" onclick="window.executeGlobalSearch('side')">
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>
                </button>
            </div>
            <div id="search-results-side" class="search-results-list small mt-2"></div>
        </div>
        
        <ul class="nav nav-pills flex-column mb-auto gap-1" id="side-menu-ul"></ul>
        
        <div class="mt-auto border-top pt-3 text-center">
            <div class="mb-3 px-2">
                <a href="https://groboapp.com" target="_blank" class="text-decoration-none text-success fw-bold d-block mb-1" style="font-size: 9px; opacity: 0.8;">GROBO - ERP BIOTERIOS</a>
                <a href="https://geckos.uy" target="_blank" class="text-decoration-none text-muted d-block geckos-link" style="font-size: 10px;">Desarrollado por <b>GECKOS.uy</b></a>
            </div>
            <ul class="nav nav-pills flex-column" id="side-controls-ul"></ul>
        </div>
    `;

    document.body.prepend(sidebar);
    
    const mobileToggle = document.createElement('button');
    mobileToggle.id = "gecko-mobile-toggle";
    mobileToggle.className = "btn btn-success position-fixed top-0 start-0 m-2 d-md-none z-3 shadow";
    mobileToggle.innerHTML = '<svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg>';
    mobileToggle.onclick = (e) => {
        e.stopPropagation();
        sidebar.classList.add('open');
    };
    document.body.prepend(mobileToggle);

    const ul = document.getElementById('side-menu-ul');
    menuIds.forEach(id => {
        // PASAMOS TEMPLATES
        ul.insertAdjacentHTML('beforeend', buildMenuItemHTML(id, 'side', templates));
    });
    
    const controlsUl = document.getElementById('side-controls-ul');
    controlsUl.insertAdjacentHTML('beforeend', buildControlsHTML('side'));
}

// --- IMPORTANTE: Recibe 'templates' como tercer parámetro ---
function buildMenuItemHTML(id, layout, templates) {
    const item = templates[id]; // <--- LO USA AQUÍ
    if (!item) return '';

    const path = item.path ? getCorrectPath(item.path) : '#';
    const isSide = layout === 'side';
    
    const liClass = isSide ? 'nav-item mb-1 w-100 position-relative' : 'nav-item position-relative';
    const linkClass = isSide 
        ? 'nav-link d-flex align-items-center text-body gap-3 px-3 py-2 rounded-2' 
        : 'gecko-nav-link d-flex flex-column align-items-center text-decoration-none px-3 py-2 text-body';
    
    const iconHTML = `<div class="menu-icon position-relative d-flex justify-content-center" data-menu-id="${id}" style="width: 24px;">
                        ${item.svg}
                        <div class="notif-dot bg-danger text-white position-absolute" id="badge-${id}" style="display:none;"></div>
                      </div>`;
                      
    const labelHTML = `<span class="${isSide ? 'small' : 'menu-label mt-1'}" style="font-weight: 600;">${item.label}</span>`;

    if (item.isDropdown && item.children) {
        const arrowIcon = `<svg class="ms-1" width="10" height="10" viewBox="0 0 16 16" style="fill: currentColor;"><path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>`;
        const childrenHTML = item.children.map(child => `
            <li><a href="${getCorrectPath(child.path)}" class="dropdown-item-gecko d-flex align-items-center px-3 py-2 text-decoration-none text-body small" style="font-weight: 600;">${child.label}</a></li>
        `).join('');

        const ulStyle = isSide ? 'position: static; background: transparent; padding-left: 30px;' : 'position: absolute; top: 100%; left: 50%; transform: translateX(-50%); min-width: 180px;';

        return `
        <li class="${liClass}">
            <a href="javascript:void(0);" class="${linkClass} dropdown-toggle-gecko d-flex ${isSide ? 'align-items-center justify-content-between' : 'flex-column align-items-center'}">
                ${isSide ? `<div class="d-flex align-items-center gap-2">${iconHTML} ${labelHTML}</div> ${arrowIcon}` : `<div>${iconHTML}</div> <div class="d-flex align-items-center">${labelHTML} ${arrowIcon}</div>`}
            </a>
            <ul class="dropdown-menu-gecko hidden list-unstyled border-0 rounded-3 mt-1 shadow" style="${ulStyle}">
                ${childrenHTML}
            </ul>
        </li>`;
    }
    return `<li class="${liClass}"><a href="${path}" class="${linkClass}">${iconHTML} ${labelHTML}</a></li>`;
}

function buildControlsHTML(layout) {
    const isSide = layout === 'side';
    const btnClass = isSide 
        ? "btn btn-outline-secondary d-flex align-items-center justify-content-center border-opacity-25 btn-control-gecko" 
        : "btn btn-link text-decoration-none p-0 me-2 text-body d-flex align-items-center justify-content-center btn-control-gecko";
    
    const btnStyle = isSide ? 'width: 38px; height: 38px; padding: 0; border-radius: 50%;' : 'width: 32px; height: 32px; padding: 0;';

    const geckoOk = localStorage.getItem('gecko_ok') || '2';
    const themeIcon = (localStorage.getItem('theme') || 'light') === 'dark' ? UserPreferences.icons.moon : UserPreferences.icons.sun;
    const currentLang = localStorage.getItem('lang') || 'es';
    const flagCode = currentLang === 'en' ? 'us' : (currentLang === 'pt' ? 'br' : 'es');
    const currentSize = localStorage.getItem('fontSize') || 'chica';
    const fontIcon = UserPreferences.icons[`font_${currentSize}`] || UserPreferences.icons.font_chica;

    return `
    <li class="${isSide ? 'd-flex justify-content-center gap-2 w-100 mt-3 pb-3 flex-wrap' : 'nav-item d-flex align-items-center ms-2 ps-2 border-start border-secondary-subtle'}">
        <button id="btn-voice-switch" class="${btnClass} voice-status-${geckoOk}" style="${btnStyle}" title="Gecko Voice">
            <span class="d-flex align-items-center justify-content-center">${UserPreferences.icons.gecko}</span>
        </button>
        <button id="btn-font-switch" class="${btnClass}" style="${btnStyle}" title="Tamaño de letra">${fontIcon}</button>
        <button id="btn-theme-switch" class="${btnClass}" style="${btnStyle}" title="Tema"><span id="pref-icon-theme">${themeIcon}</span></button>
        <div class="position-relative dropdown-container-gecko ${!isSide ? 'mx-1' : ''}">
            <button class="dropdown-toggle-gecko btn btn-light rounded-circle border shadow-sm p-0 d-flex align-items-center justify-content-center overflow-hidden" style="${isSide ? 'width:38px; height:38px;' : 'width:28px; height:28px;'}">
                <img id="pref-current-flag" src="https://flagcdn.com/w40/${flagCode}.png" style="width: 100%; height: 100%; object-fit: cover;">
            </button>
            <ul class="dropdown-menu-gecko hidden shadow p-2 border list-unstyled" style="position: absolute; min-width: 140px; z-index: 1050; ${isSide ? 'bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 10px;' : 'top: 120%; right: 0;'}">
                <li><a href="#" onclick="window.setAppLang('es')" class="d-flex align-items-center px-2 py-2 text-decoration-none text-body small hover-bg-light rounded mb-1"><img src="https://flagcdn.com/w40/es.png" width="20" class="me-2 shadow-sm"> Español</a></li>
                <li><a href="#" onclick="window.setAppLang('en')" class="d-flex align-items-center px-2 py-2 text-decoration-none text-body small hover-bg-light rounded mb-1"><img src="https://flagcdn.com/w40/us.png" width="20" class="me-2 shadow-sm"> English</a></li>
                <li><a href="#" onclick="window.setAppLang('pt')" class="d-flex align-items-center px-2 py-2 text-decoration-none text-body small hover-bg-light rounded"><img src="https://flagcdn.com/w40/br.png" width="20" class="me-2 shadow-sm"> Português</a></li>
            </ul>
        </div>
        <button id="btn-layout-switch" class="${btnClass}" style="${btnStyle}" title="Cambiar Diseño">
            <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor"><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v1h14V2a1 1 0 0 0-1-1H2z"/></svg>
        </button>
    </li>
    <li class="${isSide ? 'd-flex justify-content-center gap-2 w-100 mt-3 pb-3 flex-wrap' : 'nav-item d-flex align-items-center ms-2 ps-2 border-start border-secondary-subtle'}">
        <button id="btn-hotkeys-help" class="${btnClass}" style="${btnStyle}" title="Atajos de Teclado">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/></svg>
        </button>
    </li>`;
}

function setupEventListeners() {
    window.Auth = Auth;
    window.GeckoVoice = GeckoVoice; 
    window.executeGlobalSearch = executeGlobalSearch;

    HotkeyManager.init();

    const closeBtn = document.getElementById('gecko-close-sidebar');
    if(closeBtn) closeBtn.onclick = () => document.getElementById('gecko-sidebar-element').classList.remove('open');

    const btnSearchTop = document.getElementById('btn-toggle-search-top');
    const containerSearchTop = document.getElementById('search-container-top');
    
    if(btnSearchTop && containerSearchTop) {
        btnSearchTop.onclick = (e) => {
            e.stopPropagation();
            const isHidden = containerSearchTop.classList.toggle('hidden');
            if(!isHidden) {
                setTimeout(() => document.getElementById('input-search-top').focus(), 50);
            }
        };
    }

    ['input-search-top', 'input-search-side'].forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.onkeydown = (e) => {
                if(e.key === 'Enter') {
                    executeGlobalSearch(id.includes('top') ? 'top' : 'side');
                }
            };
        }
    });

    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('gecko-sidebar-element');
        if (sidebar && sidebar.classList.contains('open')) {
            const bSide = document.getElementById('gecko-mobile-toggle');
            const bTop = document.getElementById('gecko-mobile-toggle-top');
            if (!sidebar.contains(e.target) && (!bSide || !bSide.contains(e.target)) && (!bTop || !bTop.contains(e.target))) {
                sidebar.classList.remove('open');
            }
        }

        if (containerSearchTop && !containerSearchTop.contains(e.target) && e.target !== btnSearchTop) {
            containerSearchTop.classList.add('hidden');
        }
        
        if (!e.target.closest('.dropdown-menu-gecko') && !e.target.closest('.dropdown-toggle-gecko')) {
            document.querySelectorAll('.dropdown-menu-gecko').forEach(m => m.classList.add('hidden'));
        }
    });

    const actions = {
        'btn-voice-switch': () => UserPreferences.toggleVoice(),
        'btn-font-switch': () => UserPreferences.cycleFontSize(),
        'btn-theme-switch': () => UserPreferences.toggleTheme(),
        'btn-layout-switch': () => UserPreferences.toggleMenuLayout(),
        'btn-hotkeys-help': () => showHotkeysModal()
    };

    Object.entries(actions).forEach(([id, fn]) => {
        const btn = document.getElementById(id);
        if(btn) {
            btn.onclick = (e) => { 
                e.preventDefault(); 
                fn(); 
            };
        }
    });

    document.querySelectorAll('.dropdown-toggle-gecko').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const currentMenu = btn.nextElementSibling;
            if(!currentMenu) return;
            
            const isHidden = currentMenu.classList.contains('hidden');
            document.querySelectorAll('.dropdown-menu-gecko').forEach(m => m.classList.add('hidden'));
            if(isHidden) currentMenu.classList.remove('hidden');
        };
    });

    setTimeout(() => {
        const isVoiceActive = localStorage.getItem('gecko_ok') == 1;
        const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
        if (isVoiceActive && !isFirefox && window.GeckoVoice) {
            window.GeckoVoice.init();
        }
    }, 500);

    refreshMenuNotifications();
}

function updateBreadcrumbInstitution() {
    const breadEl = document.getElementById('institucionbread');
    if (breadEl) {
        const instName = getSession('NombreInst') || 'GROBO';
        breadEl.innerText = instName.toUpperCase();
    }
}

const style = document.createElement('style');
style.innerHTML = `
    body { transition: background-color 0.3s, color 0.3s, padding-left 0.3s ease; min-height: 100vh; }
    .table-responsive { overflow-x: auto !important; -webkit-overflow-scrolling: touch; border-radius: 8px; }
    table { min-width: 850px; }
    .menu-icon svg { width: 24px; height: 24px; fill: #888888 !important; transition: fill 0.2s; }
    .gecko-nav-link, .gecko-sidebar .nav-link { transition: all 0.2s; border-radius: 6px !important; }
    .gecko-nav-link:hover, .gecko-sidebar .nav-link:hover { background-color: rgba(26, 93, 59, 0.1) !important; color: #1a5d3b !important; }
    .gecko-nav-link:hover .menu-icon svg, .gecko-sidebar .nav-link:hover .menu-icon svg { fill: #1a5d3b !important; }
    .custom-menu-pill { border-width: 0 2px 2px 2px !important; border-style: solid !important; border-bottom-left-radius: 12px !important; border-bottom-right-radius: 12px !important; border-top-left-radius: 0 !important; border-top-right-radius: 0 !important; background-color: var(--bs-body-bg); }
    .gecko-sidebar { position: fixed !important; top: 0; left: 0; height: 100vh; width: 260px; z-index: 1050; transition: transform 0.3s ease; background-color: var(--bs-body-bg); }
    @media (min-width: 769px) { body.with-sidebar { padding-left: 260px !important; } }
    .notif-dot { top: -5px; right: -8px; width: 18px; height: 18px; border-radius: 50%; font-size: 10px; font-weight: 900; border: 2px solid white; display: flex; align-items: center; justify-content: center; z-index: 10; }
    .dropdown-menu-gecko { position: absolute; min-width: 200px; background-color: #ffffff !important; z-index: 3000 !important; border-radius: 8px; border: 1px solid rgba(0,0,0,0.15); box-shadow: 0 10px 30px rgba(0,0,0,0.1); padding: 0.5rem; }
    .dropdown-menu-gecko.hidden { display: none; }
    .dropdown-item-gecko { border-radius: 4px; margin-bottom: 2px; transition: 0.2s; }
    [data-bs-theme="dark"] body { background-color: #121212 !important; color: #e5e5e5 !important; }
    [data-bs-theme="dark"] .geckos-link { color: #888888 !important; border-color: #444 !important; }
    [data-bs-theme="dark"] .table-light, [data-bs-theme="dark"] thead.table-light tr th { background-color: #252525 !important; color: #fff !important; border-color: #444 !important; }
    [data-bs-theme="dark"] .bg-light, [data-bs-theme="dark"] .input-group-text, [data-bs-theme="dark"] .form-check.bg-light { background-color: #1e1e1e !important; color: #adb5bd !important; border: 1px solid #333 !important; }
    [data-bs-theme="dark"] .form-control, [data-bs-theme="dark"] .form-select { background-color: #0f0f0f !important; color: #fff !important; border-color: #444 !important; }
    [data-bs-theme="dark"] .dropdown-menu-gecko { background-color: #1e1e1e; border-color: #333; }
    [data-bs-theme="dark"] .notif-dot { border-color: #1e1e1e; }
    #btn-toggle-search-top { margin: 10px auto 0 !important; background-color: #ffffff !important; border: 1px solid rgba(26, 93, 59, 0.15) !important; border-radius: 8px !important; width: 110px !important; height: 40px !important; display: flex !important; align-items: center !important; justify-content: center !important; transition: all 0.3s ease; padding: 0; color: #1a5d3b !important; box-shadow: 0 3px 6px rgba(0,0,0,0.05); }
    #btn-toggle-search-top:hover { background-color: #1a5d3b !important; color: #ffffff !important; border-color: #1a5d3b !important; cursor: pointer; }
    #search-container-top { position: absolute; top: 110%; left: 50% !important; transform: translateX(-50%) !important; width: 350px; z-index: 4000; border-color: #1a5d3b !important; background-color: var(--bs-body-bg); }
    #btn-voice-switch { transition: 0.3s; }
    .voice-status-1 img { filter: none; }
    .voice-status-1 { color: #1a5d3b !important; border-color: #1a5d3b !important; }
    .voice-status-2 img, .voice-status-null img { filter: grayscale(1) opacity(0.4); }
    .voice-status-2 { color: #888 !important; }
    .voice-status-error img { filter: brightness(0); }
    .voice-status-error { color: #000 !important; }
    .search-panel-float { position: absolute; top: 100%; width: 320px; z-index: 4000; margin-top: 12px; border-color: #1a5d3b !important; }
    :root { --gecko-font-size: 15px; }
    [data-font-size="chica"] { --gecko-font-size: 15px; }
    [data-font-size="mediana"] { --gecko-font-size: 17px; }
    [data-font-size="grande"] { --gecko-font-size: 20px; }
    body, .btn, .form-control, .form-select, .nav-link, .dropdown-item-gecko, table, th, td, .table { font-size: var(--gecko-font-size) !important; }
    h1 { font-size: calc(var(--gecko-font-size) * 1.8) !important; }
    h2 { font-size: calc(var(--gecko-font-size) * 1.6) !important; }
    h3 { font-size: calc(var(--gecko-font-size) * 1.4) !important; }
    h4 { font-size: calc(var(--gecko-font-size) * 1.2) !important; }
    h5, h6 { font-size: calc(var(--gecko-font-size) * 1.1) !important; }
    #btn-font-switch svg { transition: transform 0.2s ease; }
    #search-container-top { z-index: 10600 !important; position: fixed !important; top: 70px !important; }
    #input-search-side { position: relative; z-index: 10600; }
`;
document.head.appendChild(style);


/**
 * Inyecta metadatos globales: SEO (noindex), Descripción y Favicon
 */
function applyGlobalHeadConfigs() {
    const head = document.head;
    const basePath = getBasePath(); // Usamos tu helper hibrido [cite: 5450]

    // --- A. BLOQUEO DE GOOGLE (SEO) ---
    if (!document.querySelector('meta[name="robots"]')) {
        const robots = document.createElement('meta');
        robots.name = "robots";
        robots.content = "noindex, nofollow"; // Prohíbe indexar y seguir links
        head.appendChild(robots);
    }

    // --- B. DESCRIPCIÓN UNIFICADA ---
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = "description";
        head.appendChild(metaDesc);
    }
    metaDesc.content = "GROBO - Gestor de Reactivos Biológicos Online. ERP web para la gestión de protocolos, gastos y reactivos biológicos.";

    // --- C. EL FAVICON (EL "ICO") ---
    let favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = "icon";
        favicon.type = "image/x-icon";
        head.appendChild(favicon);
    }
    // Apunta a tu carpeta de recursos multimedia
    favicon.href = `${basePath}dist/multimedia/imagenes/grobo/favicon.ico`; 
}


function showHotkeysModal() {
    const hotkeys = HotkeyManager.getVisibleHotkeys();
    
    // Si ya existe un modal de ayuda, lo removemos para refrescar
    const oldModal = document.getElementById('modalHotkeys');
    if (oldModal) oldModal.remove();

    const rows = hotkeys.map(h => `
        <tr>
            <td><kbd class="bg-dark text-light border-0 shadow-sm">${h.keys}</kbd></td>
            <td class="small fw-bold text-secondary text-uppercase">${h.desc}</td>
        </tr>
    `).join('');

    const modalHTML = `
    <div class="modal fade" id="modalHotkeys" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-success text-white">
                    <h5 class="modal-title d-flex align-items-center gap-2">
                        <svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M0 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V5zm13.5 1a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1zm0 3a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1zm-3-3a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1zm0 3a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1zm-3-3a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1zm0 3a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1zm-3-3a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1zm0 3a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1zM2 9.5a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1zm5 4a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1z"/></svg>
                        Atajos de Teclado (Hotkeys)
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0" style="min-width: 100% !important;">
                            <thead class="table-light">
                                <tr>
                                    <th style="width: 40%;">Combinación</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer justify-content-center bg-light">
                    <span class="text-muted small">Optimiza tu flujo de trabajo con GROBO</span>
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const m = new bootstrap.Modal(document.getElementById('modalHotkeys'));
    m.show();
}