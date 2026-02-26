// front/assets/js/config.js
export const ENV = {
    // Frontend: En local es una carpeta, en producción es la raíz.
    BASE_PATH: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
        ? "/URBE-API-DRIVEN/front/" 
        : "/",
    
    // Dominio principal de la app
    ROOT_SITE: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
        ? "http://localhost/URBE-API-DRIVEN/" 
        : "https://app.groboapp.com/",
    
    // El Backend (API)
    API_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
        ? "/URBE-API-DRIVEN/api" 
        : "/api" // <-- ¡CORREGIDO!
};