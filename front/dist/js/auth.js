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
            instSlug: this.slug
        };

        // 1. FEEDBACK: PROCESANDO
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
                // 2. FEEDBACK: CÓDIGO ENVIADO (Mensaje Claro)
                window.Swal.fire({
                    title: 'Verificación de Seguridad',
                    html: `
                        <p class="mb-2">Se ha enviado un código de acceso a los correos registrados como <b>ADMINISTRADOR</b>.</p>
                        <p class="text-sm text-gray-500 font-bold">⚠️ Revisa tu bandeja de entrada y la carpeta de SPAM.</p>
                        <p class="text-xs text-gray-400 mt-2">Tip: Marca "Recordar mi sesión" para evitar este paso en el futuro.</p>
                    `,
                    icon: 'warning',
                    confirmButtonText: 'ENTENDIDO',
                    confirmButtonColor: '#1a5d3b'
                }).then(() => {
                    // Solo después de dar OK mostramos el input del código
                    document.getElementById('temp-user-id').value = res.userId;
                    this.tempRemember = remember; 
                    
                    const modal = document.getElementById('modal-2fa');
                    modal.classList.remove('hidden');
                    modal.classList.add('flex');
                    document.getElementById('code-2fa').focus();
                    
                    document.getElementById('form-2fa').onsubmit = (ev) => this.handle2FA(ev);
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

    async handle2FA(e) {
        e.preventDefault();
        const userId = document.getElementById('temp-user-id').value;
        const code = document.getElementById('code-2fa').value;
        const instId = localStorage.getItem('instId'); // Contexto actual

        try {
            const res = await API.request('/verify-2fa', 'POST', { userId, code, instId });
            
            if (res?.status === 'success') {
                this.completeLoginProcess(res, this.tempRemember);
            } else {
                alert('CÓDIGO INCORRECTO O EXPIRADO');
                document.getElementById('code-2fa').value = '';
            }
        } catch (err) { console.error(err); }
    },// 3. PROCESO FINAL DE LOGIN (CORRECCIÓN CRÍTICA DE DATOS)
// 3. PROCESO FINAL DE LOGIN
    completeLoginProcess(res, remember) {
        const role = parseInt(res.role);
        
        // Determinar almacenamiento (Recordarme vs Sesión volátil)
        // El Superadmin siempre usa sessionStorage por seguridad, salvo que quieras cambiarlo
        const storage = (remember && role !== 1) ? localStorage : sessionStorage;

        // Limpieza cruzada para evitar conflictos
        if (storage === localStorage) sessionStorage.clear();
        else localStorage.removeItem('token'); 

        // GUARDADO DE DATOS
        storage.setItem('token', res.token);
        storage.setItem('userLevel', role);
        storage.setItem('userName', res.userName);
        storage.setItem('userFull', res.userFull || res.userName);
        storage.setItem('userId', res.userId);
        
        // VITAL: Guardamos el ID de la institución donde estamos parados
        storage.setItem('instId', res.instId); 
        storage.setItem('NombreInst', this.slug);

        console.log("✅ Login Exitoso. Rol:", role, "Inst:", res.instId, "Slug:", this.slug);

        // --- LÓGICA DE REDIRECCIÓN INTELIGENTE ---
        
        if (role === 1) {
            // CASO A: Superadmin en su panel maestro
            if (this.slug === 'superadmin' || this.slug === 'master') {
                console.log("👑 SuperAdmin -> Panel Global");
                window.location.href = '/URBE-API-DRIVEN/front/paginas/superadmin/dashboard.html';
            } 
            // CASO B: Superadmin entrando a una Sede (Actúa como Admin Local)
            else {
                console.log("🕵️ SuperAdmin -> Panel Sede:", this.slug);
                window.location.href = '/URBE-API-DRIVEN/front/paginas/admin/dashboard.html';
            }
        } 
        // CASO C: Usuarios normales (Admin Sede, Investigador, etc)
        else {
            const folder = (role === 3) ? 'usuario' : 'admin';
            window.location.href = `/URBE-API-DRIVEN/front/paginas/${folder}/dashboard.html`;
        }
    },
    logout() {
        // 1. Recuperamos el slug de donde esté guardado (Session o Local)
        const slug = sessionStorage.getItem('NombreInst') || localStorage.getItem('NombreInst') || 'urbe';

        // 2. Limpieza TOTAL de seguridad (Ambos almacenamientos)
        localStorage.clear();
        sessionStorage.clear();

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
        // Helper interno: Busca en Session primero, si no está, busca en Local
        const getValue = (key) => sessionStorage.getItem(key) || localStorage.getItem(key);

        const token = getValue('token');
        const userLevel = parseInt(getValue('userLevel'));
        const inst = getValue('NombreInst');
        
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