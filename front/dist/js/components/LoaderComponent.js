// front/dist/js/components/LoaderComponent.js

let loaderStartTime = 0;

export function showLoader() {
    const oldLoader = document.getElementById('global-loader');
    if (oldLoader) oldLoader.remove();

    document.body.classList.remove('gecko-loaded');
    loaderStartTime = Date.now();

    // 1. Detección de entorno para rutas de imagen
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const assetPath = isLocal ? '/URBE-API-DRIVEN/front/' : '/';
    
    // 2. Detección de tema
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    const bgColor = isDark ? '#121212' : '#f4f7f6';
    const textColor = isDark ? '#4ade80' : '#1a5d3b';
    const subTextColor = isDark ? '#888' : '#6c757d';

    const loader = document.createElement('div');
    loader.id = 'global-loader';
    
    // CENTRADO TOTAL: d-flex, align-items-center y justify-content-center
    loader.className = "position-fixed top-0 start-0 w-100 vh-100 d-flex align-items-center justify-content-center";
    loader.style.backgroundColor = bgColor;
    loader.style.zIndex = "1000005";
    loader.style.transition = "opacity 0.6s ease";

    loader.innerHTML = `
        <div class="text-center" style="width: 100%;">
            <div class="mb-4">
                <img src="${assetPath}dist/multimedia/imagenes/grobo/grobo.png" 
                     alt="Grobo Logo" 
                     style="width: 180px; filter: ${isDark ? 'drop-shadow(0px 0px 12px rgba(74, 222, 128, 0.2))' : 'none'};">
            </div>
            
            <div class="px-4">
                <h1 class="h6 fw-bold text-uppercase mb-2" style="color: ${textColor}; letter-spacing: 4px; font-weight: 900;">
                    GROBO - ERP BIOTERIOS
                </h1>
                <p class="text-uppercase m-0" style="color: ${subTextColor}; font-size: 10px; letter-spacing: 1.5px; font-weight: 700;">
                    Gekos.uy & UDELAR - URBE
                </p>
                
                <div class="mt-4 d-flex align-items-center justify-content-center gap-3">
                    <div class="spinner-border spinner-border-sm" style="color: ${textColor}; width: 16px; height: 16px; border-width: 2px;"></div>
                    <span style="color: ${subTextColor}; font-size: 10px; font-weight: 800; letter-spacing: 2px;">
                        INICIANDO...
                    </span>
                </div>
            </div>
        </div>
    `;

    document.body.prepend(loader);
}

export function hideLoader() {
    const minDuration = 2000; // 2 segundos mínimo para que se luzca el logo
    const remainingTime = Math.max(0, minDuration - (Date.now() - loaderStartTime));

    setTimeout(() => {
        document.body.classList.add('gecko-loaded');
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => { if (loader.parentNode) loader.remove(); }, 600);
        }
    }, remainingTime);
}