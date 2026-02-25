import { API } from './api.js';

const getBasePath = () => (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/';

export const SuperAuth = {
    async init() {
        console.log("Gecko Devs: Modo SuperAdmin Independiente Iniciado.");
        
        localStorage.setItem('NombreInst', 'SISTEMA_GLOBAL');
        localStorage.setItem('instId', '0');
        
        const form = document.getElementById('login-form');
        if (form) {
            form.onsubmit = (e) => this.handleLogin(e);
        }
    },

async handleLogin(e) {
        e.preventDefault();
        const box = document.getElementById('msg-alert');
        if (box) box.classList.add('hidden');

        const payload = {
            user: document.getElementById('username').value,
            pass: document.getElementById('password').value,
            instSlug: 'master'
        };

        // 1. ABRIMOS EL SWEETALERT DE CARGA
        Swal.fire({
            title: 'Verificando credenciales',
            text: 'Conectando con el servidor seguro...',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const res = await API.request('/login-superadmin', 'POST', payload);
            
            // 2. CERRAMOS EL CARGANDO
            Swal.close();
            
            // Si el backend dice "Todo bien, entra"
            if (res?.status === 'success') {
                this.completeLogin(res, box);
            } 
            // Si el backend dice "Espera, pon el código 2FA que te mandé al correo"
            else if (res?.status === '2fa_required') {
                // Le damos un pequeño respiro de 300ms antes de abrir el otro modal
                setTimeout(() => this.prompt2FA(res.userId, box), 300);
            } 
            // Si la clave está mal o la IP fue bloqueada
            else {
                if (box) { 
                    box.innerText = (res?.message || "ACCESO MAESTRO DENEGADO").toUpperCase(); 
                    box.classList.remove('hidden'); 
                }
            }
        } catch (err) {
            Swal.close();
            console.error("Error crítico en SuperAuth:", err);
            if (box) { box.innerText = "ERROR DE CONEXIÓN CON EL SERVIDOR."; box.classList.remove('hidden'); }
        }
    },

    // Pide el código 2FA con una alerta visual flotante
    async prompt2FA(userId, box) {
        const { value: code } = await Swal.fire({
            title: 'Verificación en Dos Pasos',
            text: 'Revisa tu correo e ingresa el código de 6 dígitos de seguridad.',
            input: 'text',
            inputPlaceholder: '000000',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Verificar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#16a34a', // Verde oscuro Tailwind
            inputValidator: (value) => {
                if (!value || value.length !== 6) {
                    return 'Debes ingresar un código válido de 6 dígitos'
                }
            }
        });

        if (code) {
            try {
                // Verificamos el código usando la misma ruta de la API
                const res = await API.request('/verify-2fa', 'POST', { userId: userId, code: code, instId: 0 });
                
                if (res?.status === 'success') {
                    this.completeLogin(res, box);
                } else {
                    Swal.fire('Error', 'Código incorrecto o vencido', 'error');
                }
            } catch (e) {
                console.error(e);
            }
        }
    },

// Finaliza el proceso y guarda la sesión
    completeLogin(res, box) {
        const role = parseInt(res.role || res.userLevel); 
                
        if (role === 1) {
            const tokenReal = res.token || (res.data && res.data.token) || res.jwt;

            if (!tokenReal) {
                if (box) { box.innerText = "ERROR DE SISTEMA: TOKEN NO RECIBIDO"; box.classList.remove('hidden'); }
                return;
            }

            // 1. Guardamos en LocalStorage
            localStorage.setItem('token', tokenReal);
            localStorage.setItem('userLevel', 1);
            localStorage.setItem('userName', res.userName || 'Master');
            localStorage.setItem('userId', res.userId || 0);
            localStorage.setItem('NombreInst', 'SISTEMA_GLOBAL');
            localStorage.setItem('instId', '0');

            // 2. Guardamos en SessionStorage (Para api.js)
            sessionStorage.setItem('token', tokenReal);
            sessionStorage.setItem('userLevel', 1);
            sessionStorage.setItem('userName', res.userName || 'Master');
            sessionStorage.setItem('userId', res.userId || 0);
            sessionStorage.setItem('NombreInst', 'SISTEMA_GLOBAL');
            sessionStorage.setItem('instId', '0');

            // 3. Forzamos en Cookies (Por si PHP lee $_COOKIE)
            document.cookie = `token=${tokenReal}; path=/; SameSite=Lax`;
            document.cookie = `userLevel=1; path=/; SameSite=Lax`;
            document.cookie = `NombreInst=SISTEMA_GLOBAL; path=/; SameSite=Lax`;

            // Redirigir al dashboard
            window.location.href = getBasePath() + 'paginas/superadmin/dashboard.html';
        } else {
            if (box) { 
                box.innerText = "ACCESO DENEGADO: NO ERES GECKO MASTER"; 
                box.classList.remove('hidden'); 
            }
        }
    },

    checkMasterAccess(allowedRoles = [1]) {
        const token = localStorage.getItem('token');
        const userLevel = parseInt(localStorage.getItem('userLevel'));

        if (!token || isNaN(userLevel)) {
            window.location.href = getBasePath() + 'superadmin_login.html';
            return false;
        }
        if (userLevel === 1) return true; 

        if (!allowedRoles.includes(userLevel)) {
            window.location.href = getBasePath();
            return false;
        }
        return true; 
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('userLevel');
        localStorage.removeItem('userName');
        localStorage.setItem('isLoggedIn', 'false');
        window.location.href = getBasePath() + 'superadmin_login.html';
    }
};