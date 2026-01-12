// front/dist/js/api.js
export const API = {
    urlBase: (typeof ENV !== 'undefined') ? ENV.API_URL : 'http://localhost/URBE-API-DRIVEN/api',

    async request(endpoint, method = 'GET', data = null) {
        const url = `${this.urlBase}${endpoint}`;
        const isFormData = data instanceof FormData;
        
        // Solo enviamos Content-Type si no es FormData (el navegador lo pone solo en FormData)
        const headers = isFormData ? {} : { 'Content-Type': 'application/json' };

        const config = {
            method: method,
            headers: headers,
            body: data ? (isFormData ? data : JSON.stringify(data)) : null
        };

        try {
            const response = await fetch(url, config);
            
            // Leemos primero como texto para manejar posibles errores de formato (MIME)
            const text = await response.text();
            
            try {
                const resData = JSON.parse(text);
                
                // Si aún manejas algún tipo de "unauthorized" por sesión de PHP (no token)
                if (resData.status === 'unauthorized') {
                    window.location.href = '/URBE-API-DRIVEN/front/urbe/';
                    return;
                }

                return resData;
            } catch (e) {
                // Si no es un JSON válido (ej: error 404 en HTML), mostramos el error real
                console.error("La API no devolvió JSON. Respuesta del servidor:", text);
                return { status: 'error', message: 'Error de formato en el servidor' };
            }
        } catch (error) {
            console.error("Error de conexión API:", error);
            return { status: 'error', message: 'No se pudo conectar con el servidor' };
        }
    }
};