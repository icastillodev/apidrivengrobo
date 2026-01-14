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

    async init() {

        const cleanPath = window.location.pathname.replace(/^\/|\/$/g, '');
        const parts = cleanPath.split('/');
        const fIdx = parts.indexOf('front');
        let slugContext = (fIdx !== -1) ? parts[fIdx + 1] : null;

        try {
            // 1. Detección de Institución por URL o Storage
            const urlParams = new URLSearchParams(window.location.search);
            let slugContext = urlParams.get('inst');

            if (!slugContext) {
                const parts = window.location.pathname.split('/').filter(p => p && p !== "index.html" && p !== "registro.html");
                const fIdx = parts.indexOf('front');
                slugContext = parts[fIdx + 1];
            }

            if (!slugContext) slugContext = localStorage.getItem('NombreInst');

            // 2. Bloqueo si no hay institución válida
            if (!slugContext || slugContext === 'paginas' || slugContext === 'front') {
                this.showErrorState();
                return;
            }

            this.slug = slugContext.toLowerCase();
            const res = await API.request(`/validate-inst/${this.slug}`);
            
            if (res && res.status === 'success') {
                const inst = res.data;
                localStorage.setItem('instId', inst.id);
                localStorage.setItem('NombreInst', this.slug);

                // 3. Limpiar nombre: Quitar "APP" y forzar MAYÚSCULAS
                const cleanShortName = inst.nombre.replace(/APP\s+/i, '').toUpperCase();
                const displayName = shouldShowFullName(inst.nombre, inst.nombre_completo) ? inst.nombre_completo : cleanShortName;
                
                // 4. Actualizar Interfaz Dinámica
                this.updateElements({
                    'inst-welcome': cleanShortName, // Solo nombre limpio
                    'reg-inst-name': `REGISTRO: ${cleanShortName}`,
                    'inst-full-name': shouldShowFullName(inst.nombre, inst.nombre_completo) ? inst.nombre_completo : "",
                    'reg-inst-full-name': shouldShowFullName(inst.nombre, inst.nombre_completo) ? inst.nombre_completo : "",
                    'reg-inst-description-name': displayName
                });

                // Configurar Enlaces
                const regLink = document.getElementById('link-registro-dinamico');
                if (regLink) regLink.href = `paginas/registro.html?inst=${this.slug}`;
                
                const btnVolver = document.getElementById('btn-volver-login');
                if (btnVolver) btnVolver.href = `/URBE-API-DRIVEN/front/${this.slug}`;

                const webLink = document.getElementById('inst-web-link');
                if (webLink && inst.web && inst.web.length > 5) {
                    document.getElementById('web-link-container').classList.remove('hidden');
                    webLink.href = inst.web;
                    webLink.innerHTML = `&#8617; regresar web ${cleanShortName}`;
                }

                this.renderLogin();
            } else {
                this.showErrorState();
            }
        } catch (e) { 
            console.error("Auth Init Error:", e);
            this.showErrorState(); 
        }
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
        async handleLogin(e) {
            e.preventDefault();
            const box = document.getElementById('msg-alert');
            if (box) box.classList.add('hidden');

            const payload = {
                user: document.getElementById('username').value,
                pass: document.getElementById('password').value,
                instSlug: this.slug
            };

            try {
                const res = await API.request('/login', 'POST', payload);
                
                if (res?.status === 'success') {
                    const userId = res.userId || res.IdUsrA;
                    const role = parseInt(res.role); //

                    // Guardar Sesión
                    localStorage.setItem('token', res.token || 'valid');
                    localStorage.setItem('userLevel', role);
                    localStorage.setItem('userName', res.userName);
                    localStorage.setItem('NombreInst', this.slug);
                    localStorage.setItem('userId', userId);
                    localStorage.setItem('userFull', res.userFull || res.userName);
                    
                    // REDIRECCIÓN DINÁMICA DE NETWISE
                    if (role === 1) {
                        // SuperAdmin
                        window.location.href = '/URBE-API-DRIVEN/front/paginas/superadmin/dashboard.html';
                    } else if (role === 3) {
                        // Usuario / Investigador
                        window.location.href = '/URBE-API-DRIVEN/front/paginas/usuario/dashboard.html';
                    } else if ([2, 4, 5, 6].includes(role)) {
                        // Administradores de sede
                        window.location.href = '/URBE-API-DRIVEN/front/paginas/admin/dashboard.html';
                    } else {
                        if (box) { box.innerText = "ROL NO RECONOCIDO"; box.classList.remove('hidden'); }
                    }

                } else {
                    if (box) { 
                        box.innerText = (res.message || "ERROR DE ACCESO").toUpperCase(); 
                        box.classList.remove('hidden'); 
                    }
                }
            } catch (err) {
                if (box) { box.innerText = "ERROR DE CONEXIÓN"; box.classList.remove('hidden'); }
            }
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
    checkAccess(allowed) {
        const token = localStorage.getItem('token');
        const userLevel = parseInt(localStorage.getItem('userLevel'));
        const userId = localStorage.getItem('userId');
        const inst = localStorage.getItem('NombreInst');
        
        if (!token || !userId || userId == '0' || !allowed.includes(userLevel)) {
            window.location.href = `/URBE-API-DRIVEN/front/${inst || ''}`;
        }
    }
};