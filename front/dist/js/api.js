export const API = {
    // 1. DETECCIÓN HÍBRIDA DE ENTORNO
    urlBase: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
        ? '/URBE-API-DRIVEN/api' 
        : '/core-backend-gem', // <-- La ruta secreta configurada en Nginx

    async request(endpoint, method = 'GET', data = null) {
        const url = `${this.urlBase}${endpoint}`;
        const isFormData = data instanceof FormData;
        
        const headers = {};
        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        // Obtener token (Prioriza SessionStorage por sobre LocalStorage)
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method: method,
            headers: headers,
            body: data ? (isFormData ? data : JSON.stringify(data)) : null
        };

        try {
            const response = await fetch(url, config);

            // --- 2. MANEJO DE EXPULSIÓN HTTP (401 / 403) ---
            if (response.status === 401 || response.status === 403) {
                console.warn("🔐 Seguridad: Sesión expirada o token inválido detectado por HTTP Status.");
                this.forceLogout();
                return { status: 'error', message: 'Sesión expirada' };
            }
            
            const text = await response.text();
            
            try {
                const resData = JSON.parse(text);

                // --- 3. MANEJO DE EXPULSIÓN LÓGICA (JSON Custom Error) ---
                // Si el backend devuelve status unauthorized, o un error específico del JWT
                if (resData.status === 'unauthorized' || 
                   (resData.status === 'error' && (
                       resData.message.includes('token') || 
                       resData.message.includes('expirado') || 
                       resData.message.includes('Denegado')
                   ))
                ) {
                    // Evitamos que salte en el propio login
                    if (!endpoint.includes('/login') && !endpoint.includes('/validate-inst')) {
                        console.warn(`🔐 Seguridad: Token rechazado por la API: ${resData.message}`);
                        this.forceLogout();
                        return resData;
                    }
                }

                return resData;

            } catch (e) {
                console.error("CRITICAL API ERROR (No JSON):", text);
                return { status: 'error', message: 'Error crítico en el servidor' };
            }
        } catch (error) {
            console.error("Fallo de conexión:", error);
            return { status: 'error', message: 'Error de conexión con la API' };
        }
    },

/**
     * Helper centralizado para expulsar al usuario, limpiar todo rastro y redirigir
     */
    forceLogout() {
        // Limpiamos todo rastro de sesión
        localStorage.clear();
        sessionStorage.clear();
        
        // Limpiamos Cookies de forma segura (Evitando el error de nombre vacío)
        try {
            const cookies = document.cookie.split(";");
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (!cookie) continue; // Si la cookie está vacía, la saltamos
                const eqPos = cookie.indexOf("=");
                const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            }
        } catch(e) { console.warn("Error limpiando cookies", e); }

        // Redirección Híbrida
        const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
            ? '/URBE-API-DRIVEN/front/' 
            : '/'; 

        // Si estamos en la zona de superadmin, lo mandamos a su login
        if (window.location.pathname.includes('superadmin')) {
            window.location.href = basePath + 'superadmin_login.html';
            return;
        }

        // Si es usuario normal
        let slugDestino = '';
        const pathParts = window.location.pathname.split('/'); 
        const frontIndex = pathParts.indexOf('front');
        if (frontIndex !== -1 && pathParts[frontIndex + 1] && pathParts[frontIndex + 1] !== 'paginas') {
            slugDestino = pathParts[frontIndex + 1];
        }

        if (slugDestino && slugDestino !== 'superadmin' && slugDestino !== 'master') {
            window.location.href = `${basePath}${slugDestino}/`; 
        } else {
            window.location.href = basePath; 
        }
    }
};