export const API = {
    // 1. DETECCIÓN HÍBRIDA DE ENTORNO (La magia automática)
    // Si el dominio es localhost, asumimos la estructura de carpetas local.
    // Si es producción (groboapp.com), asumimos la raíz limpia.
    urlBase: (window.location.hostname === 'localhost') 
        ? '/URBE-API-DRIVEN/api' 
        : '/api',

    async request(endpoint, method = 'GET', data = null) {
        // Construimos la URL final automáticamente
        const url = `${this.urlBase}${endpoint}`;
        const isFormData = data instanceof FormData;
        
        // 2. HEADERS Y SEGURIDAD
        const headers = {};

        // A. Content-Type (Solo si no es archivo/FormData)
        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        // B. INYECCIÓN AUTOMÁTICA DEL TOKEN
        // Esto soluciona el problema de "me saca al abrir otra pestaña"
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

            // 3. MANEJO DE SESIÓN EXPIRADA (401/403)
            if (response.status === 401 || response.status === 403) {
                console.warn("Sesión expirada o inválida. Cerrando...");
                
                // Limpiamos credenciales críticas
                localStorage.removeItem('token');
                localStorage.removeItem('userLevel');
                // NO borramos 'NombreInst' para intentar devolverlo a su casa
                
                // 4. REDIRECCIÓN HÍBRIDA (Calculada al vuelo)
                const basePath = (window.location.hostname === 'localhost') 
                    ? '/URBE-API-DRIVEN/front/' 
                    : '/front/';

                const savedSlug = localStorage.getItem('NombreInst');

                // Si tenía una sede guardada válida, lo devolvemos ahí.
                // Si no, lo mandamos al login "pelado" (raíz).
                if (savedSlug && savedSlug !== 'superadmin' && savedSlug !== 'SISTEMA GLOBAL') {
                    window.location.href = `${basePath}${savedSlug}/`;
                } else {
                    window.location.href = basePath; // Login Pelado
                }

                return { status: 'error', message: 'Sesión expirada' };
            }
            
            // 5. PROCESAMIENTO DE RESPUESTA
            const text = await response.text();
            
            try {
                const resData = JSON.parse(text);

                // Manejo de respuesta "unauthorized" manual del backend
                if (resData.status === 'unauthorized') {
                     const basePath = (window.location.hostname === 'localhost') ? '/URBE-API-DRIVEN/front/' : '/front/';
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
                return { 
                    status: 'error', 
                    message: 'Error crítico en el servidor (HTML recibido).' 
                };
            }
        } catch (error) {
            console.error("Fallo de conexión:", error);
            return { status: 'error', message: 'Error de conexión con la API' };
        }
    }
};