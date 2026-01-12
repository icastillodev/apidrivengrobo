// front/dist/js/auth.js
import { API } from './api.js';

export const Auth = {
    slug: null,

    async init() {
        try {
            const path = window.location.pathname;
            const pathParts = path.split('/').filter(p => p !== "" && p !== "index.html");
            const frontIndex = pathParts.indexOf('front');
            const slugContext = pathParts[frontIndex + 1];

            if (!slugContext) return;
            this.slug = slugContext.toLowerCase();
            const check = await API.request(`/validate-inst/${this.slug}`);
            
            if (check && check.status === 'success') {
                localStorage.setItem('instId', check.data.id || 0);
                localStorage.setItem('NombreInst', this.slug); 
                this.renderLogin();
            }
        } catch (error) { console.error(error); }
    },

    checkAccess(allowedLevels) {
        const rawLevel = localStorage.getItem('userLevel'); 
        const userLevel = parseInt(rawLevel);
        const token = localStorage.getItem('token');
        const NombreInst = localStorage.getItem('NombreInst'); 

        const isSessionActive = token && token !== 'null' && token !== 'undefined';
        const isAuthorized = allowedLevels.includes(userLevel);

        if (!isSessionActive || isNaN(userLevel) || !isAuthorized) {
            const folder = NombreInst || '';
            window.location.href = `/URBE-API-DRIVEN/front/${folder}`;
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        const payload = {
            user: document.getElementById('username').value,
            pass: document.getElementById('password').value,
            instSlug: this.slug
        };
        const res = await API.request('/login', 'POST', payload);
        
        if (res && res.status === 'success') {
            const secureToken = res.token || 'valid_session_gecko'; 
            
            // Guardamos los datos de sesión
            localStorage.setItem('token', secureToken);
            localStorage.setItem('userLevel', res.role); 
            localStorage.setItem('userName', res.userName);
            localStorage.setItem('NombreInst', this.slug);

            // CORRECCIÓN ID: Guardamos el ID y nombre real del usuario
            // Nota: Asegúrate de que tu API devuelva IdUsrA y el nombre completo
            localStorage.setItem('userId', res.userId || res.IdUsrA || '0'); 
            localStorage.setItem('userFull', res.userFull || res.userName);

            window.location.href = '/URBE-API-DRIVEN/front/paginas/admin/dashboard.html';
        }
    },

    renderLogin() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.classList.remove('hidden');
            loginForm.onsubmit = (e) => this.handleLogin(e);
        }
    }, // <-- IMPORTANTE: Coma agregada para continuar la lista de propiedades

    logout() {
        // Obtenemos el nombre de la institución para volver al login correcto
        const slug = localStorage.getItem('NombreInst') || '';

        // Limpieza total del almacenamiento
        localStorage.removeItem('token');
        localStorage.removeItem('userLevel');
        localStorage.removeItem('userName');
        localStorage.removeItem('userFull');
        localStorage.setItem('userId', '0'); 
        
        // Redirección inmediata
        window.location.href = `/URBE-API-DRIVEN/front/${slug}`;
    }
}; // <-- Cierre correcto del objeto Auth