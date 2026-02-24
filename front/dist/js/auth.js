import { API } from './api.js';

// --- LISTA DE DATOS QUE DEBEN VIAJAR EN LA SESIÓN ---
const SESSION_KEYS = [
    'token', 
    'userLevel', 
    'userId', 
    'userName', 
    'userFull', 
    'userApe', 
    'instId', 
    'NombreInst'
];

const shouldShowFullName = (short, full) => {
    if (!full || full.trim() === "" || full.length < 4) return false;
    return full.toLowerCase().trim() !== short.toLowerCase().trim();
};

export const Auth = {
    slug: null,
    tempRemember: false,
    resendTimer: null,

    getVal(key) {
        return sessionStorage.getItem(key) || localStorage.getItem(key);
    },

    getBasePath() {
        return (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
        ? '/URBE-API-DRIVEN/front/' : '/';
    },

    hydrateSession() {
        if (!sessionStorage.getItem('token') && !localStorage.getItem('token')) {
            const cookieToken = this.getCookie('token');
            if (cookieToken) {
                console.log("💧 Auth: Restaurando sesión completa desde Cookies...");
                SESSION_KEYS.forEach(key => {
                    const val = this.getCookie(key);
                    if (val) {
                        sessionStorage.setItem(key, val);
                        if (key === 'instId' || key === 'NombreInst') {
                            localStorage.setItem(key, val);
                        }
                    }
                });
            }
        }
    },

async init() {
        try {
            // 1. HIDRATAR ANTES DE NADA
            this.hydrateSession();

            const path = window.location.pathname;
            if (path.includes('/paginas/')) return; 

            // SUPERADMIN
            if (path.includes('admingrobogecko') || path.includes('superadmin_login.html')) {
                this.slug = 'superadmin';
                localStorage.setItem('NombreInst', 'SISTEMA GLOBAL');
                this.autoRedirectIfLogged(1);
                this.updateElements({ 'inst-welcome': 'SISTEMA MAESTRO', 'inst-full-name': 'Panel de Gestión Multi-Sede' });
                this.renderLogin(); 
                return; 
            }

            // ------------------------------------------------------------------
            // LÓGICA DE DETECCIÓN DE INSTITUCIÓN A PRUEBA DE FALLOS
            // ------------------------------------------------------------------
            let slugContext = new URLSearchParams(window.location.search).get('inst');

            if (!slugContext) {
                const isLocalhost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
                // Limpiamos la ruta de cosas inútiles
                const pathParts = path.split('/').filter(p => p && p !== 'index.html' && p !== 'front');
                
                if (isLocalhost) {
                    // Localhost ej: /URBE-API-DRIVEN/front/urbe -> pathParts: ['URBE-API-DRIVEN', 'urbe']
                    if (pathParts.length > 1) slugContext = pathParts[1];
                } else {
                    // Producción ej: app.groboapp.com/urbe -> pathParts: ['urbe']
                    if (pathParts.length > 0) slugContext = pathParts[0];
                }
            }

            if (!slugContext) slugContext = localStorage.getItem('NombreInst');

            // Palabras prohibidas que no son instituciones
            if (!slugContext || ['dist', 'assets', 'resources', 'paginas', 'index.html'].includes(slugContext)) {
                console.warn("⚠️ No hay slug válido. URL detectada:", slugContext);
                this.showErrorState();
                return;
            }

            this.slug = slugContext.toLowerCase();
            
            // --- DIAGNÓSTICO EN CONSOLA ---
            console.log("🔍 DIAGNÓSTICO DE RUTA:");
            console.log("-> URL Actual:", path);
            console.log("-> Sede Detectada (Slug):", this.slug);
            // ------------------------------

            const storedToken = this.getVal('token');
            const storedInst = this.getVal('NombreInst');
            
            if (storedToken && storedInst === this.slug) {
                console.log("✅ Sesión activa detectada. Redirigiendo...");
                const role = parseInt(this.getVal('userLevel'));
                this.autoRedirectIfLogged(role);
                return; 
            }

            // Llamada a la API
            console.log(`🌐 Pidiendo validación a API: /validate-inst/${this.slug}`);
            const res = await API.request(`/validate-inst/${this.slug}`);
            
            console.log("📥 Respuesta de la API:", res); // <- ESTO ES CLAVE

            if (res && res.status === 'success') {
                const inst = res.data;
                
                localStorage.setItem('instId', inst.id);
                localStorage.setItem('NombreInst', this.slug);
                if (!storedToken) {
                    sessionStorage.setItem('instId', inst.id);
                    sessionStorage.setItem('NombreInst', this.slug);
                }

                const cleanShortName = inst.nombre.replace(/APP\s+/i, '').toUpperCase();
                const displayName = shouldShowFullName(inst.nombre, inst.nombre_completo) ? inst.nombre_completo : cleanShortName;
                
                this.updateElements({
                    'inst-welcome': cleanShortName,
                    'inst-full-name': shouldShowFullName(inst.nombre, inst.nombre_completo) ? inst.nombre_completo : "",
                    'reg-inst-name': `REGISTRO: ${cleanShortName}`,
                    'reg-inst-description-name': displayName,
                    'logo-url': inst.Logo 
                });

                const regLink = document.getElementById('link-registro-dinamico');
                if (regLink) regLink.href = `paginas/registro.html?inst=${this.slug}`;
                const btnVolver = document.getElementById('btn-volver-login');
                if (btnVolver) btnVolver.href = `${this.getBasePath()}${this.slug}`;
                const webLink = document.getElementById('inst-web-link');
                if (webLink && inst.web && inst.web.length > 5) {
                    const container = document.getElementById('web-link-container');
                    if(container) container.classList.remove('hidden');
                    webLink.href = inst.web;
                    webLink.innerHTML = `&#8617; regresar web ${cleanShortName}`;
                }

                this.renderLogin();
            } else {
                console.error("❌ La API rechazó la institución o Nginx devolvió 404.");
                this.showErrorState();
            }
        } catch (e) { 
            console.error("❌ Auth Init Error Fatal:", e);
            this.showErrorState(); 
        }
    },

    updateElements(map) {
        for (const [id, val] of Object.entries(map)) {
            if (id === 'logo-url') {
                const logoContainer = document.getElementById('logo-container');
                const logoImg = document.getElementById('inst-logo');
                if (val && val.length > 4 && logoContainer && logoImg) {
                    const basePath = this.getBasePath(); 
                    const src = val.includes('http') ? val : `${basePath}dist/multimedia/imagenes/logos/${val}`;
                    logoImg.src = src;
                    logoContainer.classList.remove('hidden');
                }
                continue;
            }
            const el = document.getElementById(id);
            if (el) el.innerText = val;
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        const box = document.getElementById('msg-alert');
        if (box) box.classList.add('hidden');

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember-me')?.checked || false;

        const payload = {
            user: username,
            pass: password,
            instSlug: this.slug || localStorage.getItem('NombreInst')
        };

        window.Swal.fire({
            title: 'Iniciando Sesión',
            text: 'Verificando credenciales...',
            allowOutsideClick: false,
            didOpen: () => { window.Swal.showLoading(); }
        });

        try {
            const res = await API.request('/login', 'POST', payload);
            
            if (res?.status === 'success') {
                window.Swal.close();
                this.completeLoginProcess(res, remember);

            } else if (res?.status === '2fa_required') {
                window.Swal.fire({
                    title: 'Verificación de Seguridad',
                    html: `<p>Código enviado al correo.</p>`,
                    icon: 'warning',
                    confirmButtonText: 'ENTENDIDO',
                    confirmButtonColor: '#1a5d3b'
                }).then(() => {
                    document.getElementById('temp-user-id').value = res.userId;
                    this.tempRemember = remember; 
                    const modal = document.getElementById('modal-2fa');
                    modal.classList.remove('hidden');
                    modal.classList.add('flex');
                    document.getElementById('code-2fa').focus();
                    document.getElementById('form-2fa').onsubmit = (ev) => this.handle2FA(ev);
                    
                    const resendLink = document.getElementById('resend-link');
                    if(resendLink) resendLink.onclick = (ev) => { ev.preventDefault(); this.resendCode(res.userId); };
                });
            } else {
                window.Swal.close();
                if (box) { 
                    box.innerText = (res.message || 'Error desconocido').toUpperCase(); 
                    box.classList.remove('hidden'); 
                }
            }
        } catch (err) { 
            window.Swal.close();
            console.error("Error en login:", err); 
        }
    },

    async resendCode(userId) {
        window.Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Reenviando código...', showConfirmButton: false, timer: 1500 });
        this.startResendTimer(180);
    },

    startResendTimer(seconds) {
        const link = document.getElementById('resend-link');
        const timerSpan = document.getElementById('resend-timer');
        let remaining = seconds;
        if (!link || !timerSpan) return;

        link.classList.add('hidden');
        timerSpan.classList.remove('hidden');
        if (this.resendTimer) clearInterval(this.resendTimer);

        this.resendTimer = setInterval(() => {
            remaining--;
            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            timerSpan.innerText = `Espera ${m}:${s < 10 ? '0' : ''}${s}`;
            if (remaining <= 0) {
                clearInterval(this.resendTimer);
                timerSpan.classList.add('hidden');
                link.classList.remove('hidden');
            }
        }, 1000);
    },

    async handle2FA(e) {
        e.preventDefault();
        const userId = document.getElementById('temp-user-id').value;
        const code = document.getElementById('code-2fa').value;
        const instId = localStorage.getItem('instId') || sessionStorage.getItem('instId'); 

        try {
            const res = await API.request('/verify-2fa', 'POST', { userId, code, instId });
            if (res?.status === 'success') {
                if (this.resendTimer) clearInterval(this.resendTimer);
                this.completeLoginProcess(res, this.tempRemember);
            } else {
                alert('CÓDIGO INCORRECTO');
                document.getElementById('code-2fa').value = '';
            }
        } catch (err) { console.error(err); }
    },

    completeLoginProcess(res, remember) {
        const role = parseInt(res.role);
        
        localStorage.clear(); 
        sessionStorage.clear();
        this.clearAllCookies();

        const sessionData = {
            token: res.token,
            userLevel: role,
            userId: res.userId,
            userName: res.userName,
            userFull: res.userFull || res.userName,
            userApe: res.userApe || '',
            instId: res.instId,
            NombreInst: this.slug || localStorage.getItem('NombreInst')
        };

        if (remember) {
            SESSION_KEYS.forEach(key => {
                if (sessionData[key] !== undefined) {
                    localStorage.setItem(key, sessionData[key]);
                }
            });
        } else {
            SESSION_KEYS.forEach(key => {
                if (sessionData[key] !== undefined) {
                    this.setCookie(key, sessionData[key], null);
                    sessionStorage.setItem(key, sessionData[key]);
                }
            });
            localStorage.setItem('instId', sessionData.instId);
            localStorage.setItem('NombreInst', sessionData.NombreInst);
        }

        this.autoRedirectIfLogged(role);
    },

    autoRedirectIfLogged(role) {
        if (!this.getVal('token')) return;
        const basePath = this.getBasePath();

        if (role === 1) {
            if (this.slug === 'superadmin' || this.slug === 'master' || this.getVal('NombreInst') === 'SISTEMA GLOBAL') {
                window.location.href = `${basePath}paginas/superadmin/dashboard.html`;
            } else {
                window.location.href = `${basePath}paginas/admin/dashboard.html`;
            }
        } else {
            const folder = (role === 3) ? 'usuario' : 'admin';
            window.location.href = `${basePath}paginas/${folder}/dashboard.html`;
        }
    },

    logout() {
        const slug = this.getVal('NombreInst') || 'urbe';
        
        localStorage.clear();
        sessionStorage.clear();
        this.clearAllCookies();
        
        this.redirectToLogin(slug);
    },

    renderLogin() {
        const form = document.getElementById('login-form');
        if (form) { 
            form.classList.remove('hidden'); 
            form.onsubmit = (e) => this.handleLogin(e); 
        }
    },

    checkAccess(allowed) {
        this.hydrateSession();

        const token = this.getVal('token');
        const userLevel = parseInt(this.getVal('userLevel'));
        const inst = this.getVal('NombreInst');
        
        if (!token || isNaN(userLevel)) {
            console.warn("Acceso denegado: No hay sesión activa.");
            this.redirectToLogin(inst);
            return false;
        }

        if (userLevel === 1) return true; 

        if (!allowed.includes(userLevel)) {
            console.error("Nivel insuficiente.");
            this.autoRedirectIfLogged(userLevel); 
            return false;
        }

        if (!inst || inst === 'superadmin' || inst === 'SISTEMA GLOBAL') {
            console.error("Contexto inválido.");
            this.logout();
            return false;
        }

        return true; 
    },

    redirectToLogin(slug) {
        const basePath = this.getBasePath();
        const cleanSlug = (slug && slug !== 'superadmin' && slug !== 'SISTEMA GLOBAL') ? slug : '';
        window.location.href = cleanSlug ? `${basePath}${cleanSlug}/` : basePath;
    },

    showErrorState() {
        this.clearAllCookies(); 
        localStorage.removeItem('NombreInst');
        
        const err = document.getElementById('error-state');
        const cont = document.getElementById('auth-content');
        if (err) err.classList.remove('hidden');
        if (cont) cont.classList.add('hidden');
    },

    setCookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        const valEncoded = encodeURIComponent(value || "");
        document.cookie = name + "=" + valEncoded + expires + "; path=/; SameSite=Lax";
    },

    getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for(let i=0;i < ca.length;i++) {
            let c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf(nameEQ) == 0) {
                return decodeURIComponent(c.substring(nameEQ.length,c.length));
            }
        }
        return null;
    },

    deleteCookie(name) {
        document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    },

    clearAllCookies() {
        SESSION_KEYS.forEach(k => this.deleteCookie(k));
    }
};