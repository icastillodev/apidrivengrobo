import { API } from './api.js?v1';
import { extractInstitutionSlugFromPath } from './utils/instSlugFromPath.js';
import { setInstModulesSnapshot } from './modulesAccess.js';

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
            this.hydrateSession();

            const path = window.location.pathname;

            // Si el servidor entrega index.html (login) pero la URL es /.../panel/pagina sin /paginas/,
            // Auth.init salía antes sin renderizar y quedaba "Validando...". Forzar HTML real.
            if (path.includes('/panel/') && !path.includes('/paginas/')) {
                const m = path.match(/\/panel\/([^/?]+)/);
                if (m) {
                    const page = String(m[1] || '').replace(/\.html$/i, '');
                    if (page) {
                        window.location.replace(`${this.getBasePath()}paginas/panel/${page}.html`);
                        return;
                    }
                }
            }
            
            // Ignorar validación de login en páginas bajo paginas/ y módulos que no usan este index
            if (path.includes('/paginas/') || path.includes('/admin/') || path.includes('/superadmin/') || path.includes('/formulario/') || path.includes('/construccion') ||path.includes('adm/login')  || path.includes('/qr/')) return;

            // SUPERADMIN
            if (path.includes('admingrobogecko') || path.includes('superadmin_login.html')) {
                this.slug = 'superadmin';
                localStorage.setItem('NombreInst', 'SISTEMA GLOBAL');
                this.autoRedirectIfLogged(1);
                this.updateElements({ 'inst-welcome': 'SISTEMA MAESTRO', 'inst-full-name': 'Panel de Gestión Multi-Sede' });
                this.renderLogin(); 
                return; 
            }

            // EXTRACCIÓN DEL SLUG (?inst=, /front/{slug}, con o sin barra final, etc.)
            let slugContext = extractInstitutionSlugFromPath(path, window.location.search);

            if (!slugContext) slugContext = localStorage.getItem('NombreInst');

            if (!slugContext && window.location.hostname.includes('urbe.')) {
                slugContext = 'urbe';
            }

            const forbiddenPaths = ['dist', 'assets', 'resources', 'paginas', 'front', 'api', 'core-backend-gem', 'panel', 'admin', 'superadmin'];
            const slugLower = String(slugContext || '').toLowerCase();
            if (!slugContext || forbiddenPaths.includes(slugLower)) {
                console.warn("⚠️ Sede no detectada en la URL:", path);
                this.showErrorState();
                return;
            }

            this.slug = slugLower;
            
            const storedToken = this.getVal('token');
            const storedInst = this.getVal('NombreInst');
            
            // REDIRECCIÓN SI YA ESTÁ LOGUEADO (Evita que vuelva a ver el login)
            if (storedToken && storedInst === this.slug) {
                const role = parseInt(this.getVal('userLevel'));
                this.autoRedirectIfLogged(role);
                return; 
            }

            const res = await API.request(`/validate-inst/${this.slug}`);
            
            if (res && res.status === 'success') {
                const inst = res.data;
                
                localStorage.setItem('instId', inst.id);
                localStorage.setItem('NombreInst', this.slug);
                localStorage.setItem('instLogo', inst.Logo || '');
                localStorage.setItem('instLogoEnPdf', (inst.LogoEnPdf == 1 || inst.LogoEnPdf === '1') ? '1' : '0');
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
                const recLink = document.getElementById('link-recuperar-dinamico');
                if (recLink) recLink.href = `paginas/recuperar.html?inst=${this.slug}`;
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
                console.error("❌ Institución no válida o no encontrada en BD.");
                this.showErrorState();
            }
        } catch (e) { 
            console.error("Error crítico Auth Init:", e);
            this.showErrorState(); 
        }
    },
    updateElements(map) {
        for (const [id, val] of Object.entries(map)) {
            if (id === 'logo-url') {
                const logoContainer = document.getElementById('logo-container');
                const logoImg = document.getElementById('inst-logo');
                const welcomeEl = document.getElementById('inst-welcome');
                if (val && val.length > 4 && logoContainer && logoImg) {
                    const basePath = this.getBasePath(); 
                    const src = val.includes('http') ? val : `${basePath}dist/multimedia/imagenes/logos/${val}`;
                    logoImg.src = src;
                    logoContainer.classList.remove('hidden');
                    if (welcomeEl) { welcomeEl.textContent = ''; welcomeEl.classList.add('hidden'); }
                } else {
                    if (logoContainer) logoContainer.classList.add('hidden');
                    if (welcomeEl) welcomeEl.classList.remove('hidden');
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

        const username = (document.getElementById('username').value || '').replace(/\s+/g, '').trim().toLowerCase();
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
                await this.completeLoginProcess(res, remember);

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
                await this.completeLoginProcess(res, this.tempRemember);
            } else {
                const modal = document.getElementById('modal-2fa');
                if (modal) {
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                }
                const loginForm = document.getElementById('login-form');
                if (loginForm) loginForm.classList.remove('hidden');
                window.Swal.fire({
                    icon: 'error',
                    title: (window.txt?.login?.twofa?.codigo_incorrecto) || 'Código incorrecto',
                    text: (window.txt?.login?.twofa?.vuelve_login) || 'Serás redirigido al login.'
                }).then(() => {
                    this.redirectToLogin(this.slug || this.getVal('NombreInst'));
                });
                document.getElementById('code-2fa').value = '';
            }
        } catch (err) {
            const modal = document.getElementById('modal-2fa');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
            const loginForm = document.getElementById('login-form');
            if (loginForm) loginForm.classList.remove('hidden');
            this.redirectToLogin(this.slug || this.getVal('NombreInst'));
        }
    },

    completeLoginProcess: async function(res, remember) {
        const role = parseInt(res.role);

        const savedLang = localStorage.getItem('lang') || localStorage.getItem('idioma') || 'es';
        const savedLogo = localStorage.getItem('instLogo') || '';

        localStorage.clear();
        sessionStorage.clear();
        this.clearAllCookies();
        if (savedLogo) localStorage.setItem('instLogo', savedLogo);

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
        if (res.instLogo) localStorage.setItem('instLogo', res.instLogo);

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

        if (res.modulos) {
            setInstModulesSnapshot(res.modulos);
        }

        localStorage.setItem('lang', savedLang);
        localStorage.setItem('idioma', savedLang);
        try {
            await API.request('/user/config/update', 'POST', { lang: savedLang });
        } catch (e) {
            console.warn("No se pudo guardar idioma en BD:", e);
        }

        this.autoRedirectIfLogged(role);
    },

autoRedirectIfLogged(role) {
        if (!this.getVal('token')) return;

        // 🚀 VOLVER AL QR (o cualquier URL guardada antes del login)
        const redirectUrl = localStorage.getItem('redirectAfterLogin');
        if (redirectUrl && redirectUrl.length > 5) {
            localStorage.removeItem('redirectAfterLogin');
            window.location.href = redirectUrl;
            return;
        }
        
        let basePath = '/';
        const isLocalhost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        
        if (isLocalhost) {
            basePath = `/URBE-API-DRIVEN/front/`;
            // Misma regla que getCorrectPath: HTML bajo paginas/ para no depender del rewrite nginx.
            if (role === 1) {
                if (this.slug === 'superadmin' || this.slug === 'master' || this.getVal('NombreInst') === 'SISTEMA GLOBAL') {
                    window.location.href = `${basePath}paginas/superadmin/dashboard.html`;
                } else {
                    window.location.href = `${basePath}paginas/admin/dashboard.html`;
                }
                return;
            }
            const goAdmin = (role === 2 || role === 4);
            window.location.href = goAdmin
                ? `${basePath}paginas/admin/dashboard.html`
                : `${basePath}paginas/panel/dashboard.html`;
            return;
        }

        if (role === 1) {
            if (this.slug === 'superadmin' || this.slug === 'master' || this.getVal('NombreInst') === 'SISTEMA GLOBAL') {
                window.location.href = `${basePath}superadmin/dashboard`;
            } else {
                window.location.href = `${basePath}admin/dashboard`;
            }
        } else {
            const goAdmin = (role === 2 || role === 4);
            const folder = goAdmin ? 'admin' : 'panel';
            window.location.href = `${basePath}${folder}/dashboard`;
        }
    },
    renderLogin() {
        const form = document.getElementById('login-form');
        if (form) { 
            form.classList.remove('hidden'); 
            form.onsubmit = (e) => this.handleLogin(e); 
        }
    },

    checkAccess(allowed, options = {}) {
        const { skipInstCheck = false } = options; // Para panel/perfil: no expulsar por sede nula
        this.hydrateSession();

        const token = this.getVal('token');
        const userLevel = parseInt(this.getVal('userLevel'), 10);
        
        // Forzamos a String para evitar que un null real se evalúe raro
        const inst = String(this.getVal('NombreInst') || '').trim().toLowerCase();
        const instId = String(this.getVal('instId') || '').trim().toLowerCase();
        const path = window.location.pathname.toLowerCase();
        
        // 1. BLOQUEO DE URL CORRUPTA (Si alguien escribe /null/ a mano en la barra)
        if (path.includes('/null/') || path.includes('/undefined/') || path.includes('/0/')) {
            console.error("Acceso bloqueado: URL corrupta detectada.");
            this.logout(true);
            return false;
        }

        if (!token || Number.isNaN(userLevel)) {
            console.warn("Acceso denegado: No hay sesión activa.");
            // Evitar slug vacío para no acabar en raíz; en perfil preferir reenviar a institución conocida
            const slugForRedirect = (skipInstCheck && inst) ? inst : (inst || 'urbe');
            this.redirectToLogin(slugForRedirect);
            return false;
        }

        // El SuperAdmin puede saltar la restricción de sede
        if (userLevel === 1) return true; 

        if (!allowed.includes(userLevel)) {
            console.error("Nivel insuficiente.");
            this.autoRedirectIfLogged(userLevel); 
            return false;
        }

        // 2. BLOQUEO DE VARIABLES FANTASMA (opcional: en perfil no expulsar por sede nula)
        if (!skipInstCheck) {
            const invalidValues = ['null', 'undefined', '0', '', 'superadmin', 'sistema global'];
            if (invalidValues.includes(inst) || invalidValues.includes(instId)) {
                console.error("Contexto inválido: Sede no asignada o nula.");
                this.logout(true);
                return false;
            }
        }

        return true; 
    },

    // Le agregamos un parámetro para forzar ir a la raíz si todo se rompe
    logout(forceRoot = false) {
        let slug = '';
        if (!forceRoot) {
            slug = this.getVal('NombreInst') || '';
            // Fallback: intentar obtener slug de la URL actual (ej. /urbe/admin/...)
            if (!slug || slug === 'null' || slug === 'undefined') {
                slug = extractInstitutionSlugFromPath(window.location.pathname, window.location.search);
            }
            if (!slug || slug === 'null' || slug === 'undefined') slug = 'urbe';
        }
        
        localStorage.clear();
        sessionStorage.clear();
        this.clearAllCookies();
        
        this.redirectToLogin(slug);
    },

redirectToLogin(slug) {
        const basePath = this.getBasePath();
        const safeSlug = String(slug || '').toLowerCase().trim();

        // 1. CASO SUPERADMIN: Lo devolvemos a la ruta secreta de Nginx
        if (safeSlug === 'superadmin' || safeSlug === 'sistema global') {
            window.location.href = `${basePath}geckoadm/login`;
            return;
        }

        // 2. CASO BASURA/NULO: No mandar a la raíz (front) — usar slug por defecto para que no quede en blanco
        const invalidSlugs = ['null', 'undefined', '0', ''];
        const targetSlug = invalidSlugs.includes(safeSlug) ? 'urbe' : safeSlug;
        window.location.href = `${basePath}${targetSlug}`;
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