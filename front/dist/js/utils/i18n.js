// dist/js/utils/i18n.js

/**
 * Obtiene el idioma preferido del usuario desde la BD si hay sesión activa.
 */
async function getLangFromBackendIfLogged() {
    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (!token) return null;
        const userLevel = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel') || '0', 10);
        const instId = parseInt(sessionStorage.getItem('instId') || localStorage.getItem('instId') || '0', 10);
        const isSuperadminContext = userLevel === 1 || window.location.pathname.toLowerCase().includes('superadmin');
        // Superadmin (nivel 1 / inst 0) no usa /user/config/get para idioma.
        if (isSuperadminContext || instId === 0) return null;
        const { API } = await import('../api.js');
        const res = await API.request('/user/config/get', 'GET');
        if (res?.status === 'success' && res?.data?.idioma_preferido) {
            const lang = res.data.idioma_preferido;
            localStorage.setItem('lang', lang);
            localStorage.setItem('idioma', lang);
            return lang;
        }
    } catch (e) {
        console.warn("No se pudo cargar idioma desde BD, se usará localStorage.", e);
    }
    return null;
}

/** Aplica tema y tamaño de letra desde localStorage al cargar (evita flash) */
function applyStoredThemeAndFont() {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || theme === 'light') {
        document.documentElement.setAttribute('data-bs-theme', theme);
    }
    const fontSize = localStorage.getItem('fontSize');
    if (['chica', 'mediana', 'grande'].includes(fontSize)) {
        document.documentElement.setAttribute('data-font-size', fontSize);
    }
}

export async function loadLanguage(lang = null) {
    // Aplicar tema y fontSize guardados lo antes posible (persistencia visual)
    applyStoredThemeAndFont();
    // Si no se pasó idioma y hay sesión, usar el guardado en BD
    if (lang == null) {
        const fromBackend = await getLangFromBackendIfLogged();
        if (fromBackend) lang = fromBackend;
    }
    const selectedLang = lang || localStorage.getItem('lang') || localStorage.getItem('idioma') || 'es';
    
    console.log(`⏳ Cargando idioma: ${selectedLang}...`);

    try {
        // 2. Importación dinámica (Ojo a la ruta relativa)
        // Esto busca en: dist/js/utils/i18n/es.js
        const module = await import(`./i18n/${selectedLang}.js`);
        
        // 3. Verificamos que el módulo tenga lo que esperamos
        if (!module[selectedLang]) {
            throw new Error(`El archivo ${selectedLang}.js cargó, pero no exporta 'const ${selectedLang}'`);
        }

        // 4. Asignamos a la variable global
        window.txt = module[selectedLang];
        localStorage.setItem('lang', selectedLang);
        localStorage.setItem('idioma', selectedLang);
        document.documentElement.lang = selectedLang;

        console.log(`✅ Idioma cargado correctamente: ${selectedLang}`);
        return true;

    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN loadLanguage:", error);
        
        // Intento de Fallback: Si falló inglés o portugués, intentamos cargar español
        if (selectedLang !== 'es') {
            console.warn("🔄 Reintentando con español (es)...");
            return await loadLanguage('es');
        }
        
        return false;
    }
}
// Agrega esto a tu i18n.js o a un archivo de utilidades central
export const translatePage = () => {
    const elements = document.querySelectorAll('[data-i18n]');

    elements.forEach(el => {
        const path = el.getAttribute('data-i18n');
        const keys = path.split('.');
        
        let text = window.txt;
        keys.forEach(key => { text = text ? text[key] : null; });

        if (text) {
            // USAMOS innerHTML para que respete los <strong> o <br>
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = text;
            else el.innerHTML = text;
        }
    });

    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
        const path = el.getAttribute('data-i18n-aria-label');
        if (!path) return;
        const keys = path.split('.');
        let text = window.txt;
        keys.forEach(key => { text = text ? text[key] : null; });
        if (text && typeof text === 'string') {
            const plain = text.replace(/<[^>]*>/g, '').trim();
            el.setAttribute('aria-label', plain);
        }
    });

    applyPageTitle();
};

const PATH_TO_TITLE_KEY = {
    'admin/dashboard': 'dashboard_admin', 'usuario/dashboard': 'dashboard_usuario', 'panel/dashboard': 'dashboard_usuario',
    'admin/usuarios': 'usuarios', 'admin/protocolos': 'protocolos', 'admin/animales': 'animales', 'admin/reactivos': 'reactivos',
    'admin/insumos': 'insumos', 'admin/alojamientos': 'alojamientos', 'admin/reservas': 'admin_reservas', 'admin/estadisticas': 'estadisticas', 'admin/precios': 'precios',
    'admin/configuracion/config': 'config', 'admin/configuracion/institucion': 'config_institucion', 'admin/configuracion/departamentos': 'config_departamentos',
    'admin/configuracion/especies': 'config_especies', 'admin/configuracion/roles': 'config_roles', 'admin/configuracion/tipos-form': 'config_tipos_form',
    'admin/configuracion/reservas': 'config_reservas', 'admin/configuracion/insumos-exp': 'config_insumos_exp', 'admin/configuracion/insumos': 'insumos_config',
    'admin/configuracion/alojamientos': 'alojamientos_config',
    'admin/configuracion/alojamientos-ubicacion': 'config_aloj_ubicacion',
    'admin/configuracion/protocolos-config': 'config_protocolos',
    'admin/facturacion/index': 'facturacion', 'admin/facturacion/depto': 'facturacion_depto', 'admin/facturacion/investigador': 'facturacion_investigador',
    'admin/facturacion/protocolo': 'facturacion_protocolo', 'admin/facturacion/org': 'facturacion_org', 'admin/facturacion/institucion': 'facturacion_institucion',
    'admin/historialcontable': 'historial_contable',
    'admin/solicitud_protocolo': 'solicitud_protocolo', 'usuario/formularios': 'formularios', 'panel/formularios': 'formularios', 'usuario/formularios/animales': 'formularios_animales',
    'usuario/formularios/reactivos': 'formularios_reactivos', 'usuario/formularios/insumos': 'formularios_insumos',     'usuario/misformularios': 'mis_formularios', 'panel/misformularios': 'mis_formularios',
    'usuario/misprotocolos': 'mis_protocolos', 'panel/misprotocolos': 'mis_protocolos',
    'usuario/misalojamientos': 'mis_alojamientos', 'panel/misalojamientos': 'mis_alojamientos',
    'usuario/misreservas': 'mis_reservas', 'panel/misreservas': 'mis_reservas',
    'usuario/mensajes': 'mensajes', 'panel/mensajes': 'mensajes',
    'usuario/soporte': 'soporte', 'panel/soporte': 'soporte',
    'panel/ventas': 'ventas',
    'usuario/capacitacion': 'capacitacion', 'panel/capacitacion': 'capacitacion',
    'usuario/mensajes_institucion': 'mensajes_institucion', 'panel/mensajes_institucion': 'mensajes_institucion',
    'usuario/perfil': 'perfil', 'panel/perfil': 'perfil',
    'panel/noticias': 'noticias_portal',
    'admin/comunicacion/noticias': 'noticias_admin',
    'superadmin/dashboard': 'superadmin_dashboard', 'superadmin/instituciones': 'superadmin_instituciones',
    'superadmin/institucionformulario': 'superadmin_formulario', 'superadmin/usuarios_global': 'superadmin_usuarios', 'superadmin/bitacora': 'superadmin_dashboard',
    'registro': 'registro', 'recuperar': 'recuperar', 'confirmar': 'confirmar', 'resetear': 'resetear', 'error404': 'error404', 'construccion': 'construccion',
    'formulario/index': 'formulario_registro_inst', 'qr-alojamiento': 'qr_alojamiento', 'qr-sala': 'qr_sala', 'qr-salas': 'qr_salas'
};

export function applyPageTitle() {
    if (!window.txt || !window.txt.titulos_pagina) return;
    let key = document.body?.getAttribute('data-page-title-key')
        || PATH_TO_TITLE_KEY[pathnameToKey(window.location.pathname)];
    if (!key && (window.location.pathname === '/' || window.location.pathname.match(/\/[a-z]+\/?$/))) key = 'login';
    if (key && window.txt.titulos_pagina[key]) {
        document.title = window.txt.titulos_pagina[key] + ' - GROBO';
    }
    if (!document.querySelector('meta[name="robots"]')) {
        const meta = document.createElement('meta');
        meta.name = 'robots';
        meta.content = 'noindex, nofollow';
        document.head.appendChild(meta);
    }
}

function pathnameToKey(pathname) {
    let p = pathname.replace(/\.html$/, '').replace(/^\//, '');
    const idxPaginas = p.indexOf('paginas/');
    if (idxPaginas !== -1) {
        p = p.substring(idxPaginas + 8);
    } else {
        const idxPanel = p.indexOf('panel/');
        const idxAdmin = p.indexOf('admin/');
        const idxUsuario = p.indexOf('usuario/');
        const idxSuper = p.indexOf('superadmin/');
        if (idxPanel !== -1) {
            p = p.substring(idxPanel);
        } else if (idxAdmin !== -1) {
            p = p.substring(idxAdmin);
        } else if (idxUsuario !== -1) {
            p = p.substring(idxUsuario);
        } else if (idxSuper !== -1) {
            p = p.substring(idxSuper);
        }
    }
    const parts = p.split('/').filter(Boolean);
    return parts.length ? parts.join('/') : null;
}