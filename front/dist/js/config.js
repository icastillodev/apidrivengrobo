// front/assets/js/config.js
const ENV = {
    BASE_PATH: window.location.hostname === 'localhost' ? "/URBE-API-DRIVEN/front/" : "/api/",
    ROOT_SITE: window.location.hostname === 'localhost' ? "http://localhost/URBE-API-DRIVEN/" : "https://www.grobo.com/",
    // QUITAMOS index.php para usar URLs limpias
    API_URL: window.location.hostname === 'localhost' ? "/URBE-API-DRIVEN/api" : "/api"
};