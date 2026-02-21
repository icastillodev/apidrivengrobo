export const API = {
    // 1. DETECCIÓN HÍBRIDA DE ENTORNO
    urlBase: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
        ? '/URBE-API-DRIVEN/api' 
        : '/core-backend-gem', // <-- La ruta secreta que configuramos en Nginx

    async request(endpoint, method = 'GET', data = null) {
        const url = `${this.urlBase}${endpoint}`;
        const isFormData = data instanceof FormData;
        
        const headers = {};
        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

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

            // 3. MANEJO DE SESIÓN EXPIRADA
            if (response.status === 401 || response.status === 403) {
                console.warn("Sesión expirada o inválida. Cerrando...");
                localStorage.removeItem('token');
                localStorage.removeItem('userLevel');
                
                // 4. REDIRECCIÓN HÍBRIDA CORRECTA
                // En producción, el login está en la raíz "/"
                const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
                    ? '/URBE-API-DRIVEN/front/' 
                    : '/'; 

                const savedSlug = localStorage.getItem('NombreInst');

                if (savedSlug && savedSlug !== 'superadmin' && savedSlug !== 'SISTEMA GLOBAL') {
                    window.location.href = `${basePath}${savedSlug}/`; // app.groboapp.com/urbe/
                } else {
                    window.location.href = basePath; // app.groboapp.com/
                }

                return { status: 'error', message: 'Sesión expirada' };
            }
            
            const text = await response.text();
            
            try {
                const resData = JSON.parse(text);

                if (resData.status === 'unauthorized') {
                     const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
                        ? '/URBE-API-DRIVEN/front/' 
                        : '/';
                     const savedSlug = localStorage.getItem('NombreInst');
                     
                     if (savedSlug && savedSlug !== 'superadmin') {
                        window.location.href = `${basePath}${savedSlug}/`;
                     } else {
                        window.location.href = basePath;
                     }
                     return;
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
    }
};