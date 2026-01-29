// front/dist/js/auth.js
import { API } from './api.js';

/**
 * Determina si debe mostrar el nombre largo de la institución
 */
const shouldShowFullName = (short, full) => {
    if (!full || full.trim() === "" || full.length < 4) return false;
    return full.toLowerCase().trim() !== short.toLowerCase().trim();
};

export const Auth = {
    slug: null,

    // Localizado dentro del objeto export const Auth = { ... } en auth.js

    async init() {
        
        try {
            const path = window.location.pathname;

            // --- 1. DETECCIÓN DE SUPERADMIN (BYPASS GECKO DEVS) ---
            // Si la URL es la del panel maestro, no validamos institución
            if (path.includes('admingrobogecko') || path.includes('superadmin_login.html')) {
                this.slug = 'superadmin'; // Slug reservado para el maestro
                localStorage.setItem('NombreInst', 'SISTEMA GLOBAL');
                
                this.updateElements({
                    'inst-welcome': 'SISTEMA MAESTRO',
                    'inst-full-name': 'Panel de Gestión Multi-Sede'
                });

                this.renderLogin(); 
                console.log("Modo SuperAdmin Activado: Validaciones de sede omitidas.");
                return; // CORTAMOS AQUÍ: Evitamos que intente buscar la inst en la API
            }

            // --- 2. DETECCIÓN DE INSTITUCIÓN NORMAL ---
            const urlParams = new URLSearchParams(window.location.search);
            let slugContext = urlParams.get('inst');

            if (!slugContext) {
                // Limpiamos la ruta para extraer el slug (ej: /front/urbe/ -> urbe)
                const parts = path.split('/').filter(p => p && p !== "index.html" && p !== "registro.html" && p !== "front");
                // Si después de 'front' hay algo, ese es nuestro slug
                const pathParts = path.replace(/^\/|\/$/g, '').split('/');
                const fIdx = pathParts.indexOf('front');
                if (fIdx !== -1 && pathParts[fIdx + 1]) {
                    slugContext = pathParts[fIdx + 1];
                }
            }

            // Si no hay nada en URL, probamos con el último guardado
            if (!slugContext) slugContext = localStorage.getItem('NombreInst');

            // Bloqueo de seguridad si la ruta es inválida
            if (!slugContext || slugContext === 'paginas' || slugContext === 'dist') {
                this.showErrorState();
                return;
            }

            // --- 3. VALIDACIÓN CONTRA API ---
            this.slug = slugContext.toLowerCase();
            const res = await API.request(`/validate-inst/${this.slug}`);
            
            if (res && res.status === 'success') {
                const inst = res.data;
                localStorage.setItem('instId', inst.id);
                localStorage.setItem('NombreInst', this.slug);

                // Limpieza y formato de nombres
                const cleanShortName = inst.nombre.replace(/APP\s+/i, '').toUpperCase();
                const displayName = shouldShowFullName(inst.nombre, inst.nombre_completo) ? inst.nombre_completo : cleanShortName;
                
                this.updateElements({
                    'inst-welcome': cleanShortName,
                    'inst-full-name': shouldShowFullName(inst.nombre, inst.nombre_completo) ? inst.nombre_completo : "",
                    'reg-inst-name': `REGISTRO: ${cleanShortName}`,
                    'reg-inst-full-name': shouldShowFullName(inst.nombre, inst.nombre_completo) ? inst.nombre_completo : "",
                    'reg-inst-description-name': displayName
                });

                // Configurar Enlaces Dinámicos
                const regLink = document.getElementById('link-registro-dinamico');
                if (regLink) regLink.href = `paginas/registro.html?inst=${this.slug}`;
                
                const btnVolver = document.getElementById('btn-volver-login');
                if (btnVolver) btnVolver.href = `/URBE-API-DRIVEN/front/${this.slug}`;

                const webLink = document.getElementById('inst-web-link');
                if (webLink && inst.web && inst.web.length > 5) {
                    const container = document.getElementById('web-link-container');
                    if(container) container.classList.remove('hidden');
                    webLink.href = inst.web;
                    webLink.innerHTML = `&#8617; regresar web ${cleanShortName}`;
                }

                this.renderLogin();
            } else {
                console.error("Sede no válida en DB:", this.slug);
                this.showErrorState();
            }
        } catch (e) { 
            console.error("Auth Init Error:", e);
            this.showErrorState(); 
        }
    },async initSuperAdmin() {
        // Modo Maestro: No hay validación de base de datos aquí
        this.slug = 'superadmin'; 
        localStorage.setItem('NombreInst', 'SISTEMA MAESTRO');
        localStorage.setItem('instId', '0'); // ID 0 indica "Global" para el sistema

        this.updateElements({
            'inst-welcome': 'BIENVENIDO MAESTRO',
            'inst-full-name': 'Acceso al Control Global de Sedes'
        });

        this.renderLogin();
    },async initSuperAdmin() {
        this.slug = 'superadmin';
        localStorage.setItem('NombreInst', 'SISTEMA MAESTRO');
        localStorage.setItem('instId', '0'); // ID 0 reservado para SuperAdmin

        this.updateElements({
            'inst-welcome': 'BIENVENIDO MAESTRO',
            'inst-full-name': 'Panel Maestro de Gestión Global'
        });

        this.renderLogin();
    },

    /**
     * Muestra el panel de error y bloquea el login si no hay institución válida
     */
    showErrorState() {
        localStorage.removeItem('NombreInst');
        localStorage.removeItem('instId');
        const err = document.getElementById('error-state');
        const cont = document.getElementById('auth-content');
        if (err) err.classList.remove('hidden');
        if (cont) cont.classList.add('hidden');
    },

    updateElements(map) {
        for (const [id, val] of Object.entries(map)) {
            const el = document.getElementById(id);
            if (el) el.innerText = val;
        }
    },

    /**
     * Procesa el ingreso al sistema
     */
/**
 * Procesa el ingreso al sistema (Gecko Devs 2026)
 * Maneja accesos por sede y acceso maestro para SuperAdmin
 */
// --- REDIRECCIÓN Y LOGIN ---
async handleLogin(e) {
    e.preventDefault();
    const box = document.getElementById('msg-alert');
    if (box) box.classList.add('hidden');

    const payload = {
        user: document.getElementById('username').value,
        pass: document.getElementById('password').value,
        instSlug: this.slug // Aquí va el slug de la sede (ej: 'urbe')
    };

    try {
        const res = await API.request('/login', 'POST', payload);
        
        if (res?.status === 'success') {
            const role = parseInt(res.role);

            // 1. PERSISTENCIA DE SESIÓN
            localStorage.setItem('token', res.token || 'valid');
            localStorage.setItem('userLevel', role); // Sigue siendo 1 (SuperAdmin)
            localStorage.setItem('userName', res.userName);
            localStorage.setItem('userId', res.userId);
            localStorage.setItem('instId', res.instId); // La API devuelve el ID de la sede actual
            localStorage.setItem('NombreInst', this.slug);

            // 2. REDIRECCIÓN DINÁMICA
            if (role === 1) {
                // COMO ENTRA POR UNA SEDE: Lo mandamos al dashboard de ADMIN local
                // Aunque sea Nivel 1, el dashboard de admin le mostrará los datos de esa sede
                console.log("SuperAdmin entrando como Admin de Sede...");
                window.location.href = '/URBE-API-DRIVEN/front/paginas/admin/dashboard.html';
            } else {
                // Redirección normal para otros roles
                const folder = (role === 3) ? 'usuario' : 'admin';
                window.location.href = `/URBE-API-DRIVEN/front/paginas/${folder}/dashboard.html`;
            }
        } else {
            if (box) { box.innerText = res.message.toUpperCase(); box.classList.remove('hidden'); }
        }
    } catch (err) { console.error("Error en login de sede:", err); }
},
    logout() {
        // 1. Recuperamos el slug antes de borrar todo para saber a dónde redirigir
        const slug = localStorage.getItem('NombreInst') || 'urbe';

        // 2. Limpieza total de seguridad de NETWISE
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('userLevel');
        localStorage.removeItem('userName');
        localStorage.setItem('isLoggedIn', 'false');

        // 3. Redirección absoluta al login de la institución
        window.location.href = `/URBE-API-DRIVEN/front/${slug}/`;
    },
    renderLogin() {
        const form = document.getElementById('login-form');
        if (form) { 
            form.classList.remove('hidden'); 
            form.onsubmit = (e) => this.handleLogin(e); 
        }
    },

    /**
     * Validación de permisos para páginas internas
     */
// --- VALIDACIÓN DE ACCESO ---
/**
 * Validador de Acceso Robusto
 * @param {Array} allowed - Array de niveles permitidos (ej: [1, 2])
 */
checkAccess(allowed) {
    const token = localStorage.getItem('token');
    const userLevel = parseInt(localStorage.getItem('userLevel'));
    const inst = localStorage.getItem('NombreInst');
    
    // 1. Si no hay token o nivel, es un intento de acceso anónimo
    if (!token || isNaN(userLevel)) {
        console.warn("Acceso denegado: No hay sesión activa.");
        this.redirectToLogin(inst);
        return false;
    }

    // 2. PASE VIP PARA SUPERADMIN (Nivel 1)
    // El SuperAdmin entra a cualquier lado, sea el panel maestro o una sede
    if (userLevel === 1) {
        return true; 
    }

    // 3. VALIDACIÓN DE ROLES PARA OTROS USUARIOS
    if (!allowed.includes(userLevel)) {
        console.error("Acceso denegado: Nivel de usuario insuficiente.");
        this.redirectToLogin(inst);
        return false;
    }

    // 4. VALIDACIÓN DE SEDE (Para evitar saltos entre instituciones)
    // Si no es superadmin, DEBE tener una institución cargada en el storage
    if (!inst || inst === 'superadmin' || inst === 'SISTEMA GLOBAL') {
        console.error("Acceso denegado: Contexto de institución inválido.");
        this.redirectToLogin('');
        return false;
    }

    return true; // Acceso concedido
},

/**
 * Función auxiliar para redirección limpia
 */
redirectToLogin(slug) {
    const cleanSlug = (slug && slug !== 'superadmin') ? slug : '';
    // Usamos ruta absoluta para no rompernos en subcarpetas
    window.location.href = `/URBE-API-DRIVEN/front/${cleanSlug}`;
}
};