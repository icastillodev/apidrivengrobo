import { API } from './api.js';

// Constante híbrida para el enrutamiento
const getBasePath = () => (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/';

export const SuperAuth = {
    async init() {
        console.log("Gecko Devs: Modo SuperAdmin Independiente.");
        // Limpiamos rastros de sedes anteriores para no confundir al sistema
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
            instSlug: 'master' // Flag directo para el backend
        };

        try {
            const res = await API.request('/login', 'POST', payload);
            
            if (res?.status === 'success' && parseInt(res.role) === 1) {
                // Guardamos la sesión maestra
                localStorage.setItem('token', res.token || 'valid');
                localStorage.setItem('userLevel', 1);
                localStorage.setItem('userName', res.userName);
                localStorage.setItem('userId', res.userId);

                // Directo al dashboard de superadmin usando ruta dinámica
                window.location.href = getBasePath() + 'paginas/superadmin/dashboard.html';
            } else {
                if (box) { 
                    box.innerText = "ACCESO MAESTRO DENEGADO"; 
                    box.classList.remove('hidden'); 
                }
            }
        } catch (err) {
            console.error("Error crítico en SuperAuth:", err);
        }
    },

/**
 * Validador de Acceso - Versión GECKO 2026
 * @param {Array} allowedRoles - Niveles que pueden ver la página (ej: [1])
 */
    logout() {
            // Limpieza total de seguridad de NETWISE
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            localStorage.removeItem('userLevel');
            localStorage.removeItem('userName');
            localStorage.setItem('isLoggedIn', 'false');

            // Redirección al login de SuperAdmin con ruta dinámica
            window.location.href = getBasePath() + 'superadmin_login.html';
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
        }
};