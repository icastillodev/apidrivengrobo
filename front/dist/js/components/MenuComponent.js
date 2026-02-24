import { API } from '../api.js';
import { Auth } from '../auth.js';
import { GeckoVoice } from './GeckoVoice.js';
// CORRECCIÓN: Importamos el objeto GeckoSearch
import { GeckoSearch, initGlobalSearchUI } from './GeckoSearch.js';

import { getSession, applyGlobalHeadConfigs, updateBreadcrumbInstitution, UserPreferences } from './menujs/MenuConfig.js';
import { injectMenuStyles } from './menujs/MenuStyles.js';
import { getMenuTemplates } from './menujs/MenuTemplates.js';
import { renderTopMenuStructure, renderSideMenuStructure } from './menujs/MenuRender.js';
import { setupEventListeners } from './menujs/MenuEvents.js';
import { refreshMenuNotifications } from './menujs/MenuNotifications.js';

export { refreshMenuNotifications }; 

export async function initMenu() {
    const roleId = parseInt(getSession('userLevel')); 
    const instId = getSession('instId') || 0; 
    
    console.log("🚀 InitMenu -> Rol:", roleId, "| Inst:", instId);

    if (isNaN(roleId)) {
        console.warn("Menú detenido: No hay rol de usuario definido.");
        return;
    }

    if (!window.txt) {
        console.error("❌ Idioma no cargado. Ejecuta await loadLanguage() antes de initMenu().");
        return;
    }

    // Inicializar UI de Buscador Global
    initGlobalSearchUI();

    // 1. Inyectar estilos globales
    injectMenuStyles();

    // 2. Obtener layout
    const menuLayout = await UserPreferences.init();

    // 3. Exponer globales (CORREGIDO)
    window.GeckoVoice = GeckoVoice;
    window.GeckoSearch = GeckoSearch; // Exponemos el objeto completo
    window.setAppLang = UserPreferences.setLanguage;
    window.Auth = Auth;

try {
        let ids = [];

        // Si es SUPERADMIN (Rol 1), le forzamos a ver todo, sin preguntar a la API
        if (roleId === 1) {
            ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 203, 55, 202, 998, 999];
        } 
        // Si es usuario normal, le preguntamos a la base de datos qué puede ver
        else {
            const resMenu = await API.request(`/menu?role=${roleId}&inst=${instId}`);
            if (resMenu && resMenu.status === "success") {
                ids = (resMenu.data || []).map(id => Number(id));
            }
        }

        // Si después de preguntar, tenemos IDs para mostrar, dibujamos el menú
        if (ids.length > 0) {
            if (![1, 2].includes(roleId)) ids = ids.filter(id => id !== 9);
            [999, 998, 10].forEach(fixedId => { if(!ids.includes(fixedId)) ids.push(fixedId); });

            ['header.gecko-header', '#gecko-sidebar-element', '#gecko-mobile-toggle', '#gecko-mobile-toggle-top'].forEach(s => {
                const el = document.querySelector(s);
                if (el) el.remove();
            });

            const templates = getMenuTemplates();

            if (menuLayout === 'menu_lateral') {
                renderSideMenuStructure(document.body, ids, templates);
            } else {
                renderTopMenuStructure(document.body, ids, templates);
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
}