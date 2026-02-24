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
        
        // Limpiamos Cookies manualmente iterando
        const cookies = document.cookie.split("; ");
        for (let c = 0; c < cookies.length; c++) {
            const d = window.location.hostname.split(".");
            while (d.length > 0) {
                const cookieBase = encodeURIComponent(cookies[c].split(";")[0].split("=")[0]) + '=; expires=Thu, 01-Jan-1970 00:00:01 GMT; domain=' + d.join('.') + ' ;path=';
                const p = window.location.pathname.split('/');
                document.cookie = cookieBase + '/';
                while (p.length > 0) {
                    document.cookie = cookieBase + p.join('/');
                    p.pop();
                }
                d.shift();
            }
        }

        // Redirección Híbrida
        const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
            ? '/URBE-API-DRIVEN/front/' 
            : '/'; 

        // Como acabamos de borrar el localStorage, intentamos extraer el nombre de la URL si es posible
        let slugDestino = '';
        const pathParts = window.location.pathname.split('/'); 
        const frontIndex = pathParts.indexOf('front');
        if (frontIndex !== -1 && pathParts[frontIndex + 1] && pathParts[frontIndex + 1] !== 'paginas') {
            slugDestino = pathParts[frontIndex + 1];
        }

        if (slugDestino && slugDestino !== 'superadmin' && slugDestino !== 'master') {
            window.location.href = `${basePath}${slugDestino}/`; // Ej: app.groboapp.com/urbe/
        } else {
            window.location.href = basePath; // app.groboapp.com/
        }
    }
};