// front/dist/js/components/LoaderComponent.js

let loaderStartTime = 0;

export function showLoader() {
    const oldLoader = document.getElementById('global-loader');
    if (oldLoader) oldLoader.remove();

    document.body.classList.remove('gecko-loaded');
    loaderStartTime = Date.now();

    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const assetPath = isLocal ? '/URBE-API-DRIVEN/front/' : '/';
    
    // Detectamos el tema desde el HTML o localStorage
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark' || localStorage.getItem('theme') === 'dark';
    
    const bgColor = isDark ? '#121212' : '#f4f7f6';
    const textColor = isDark ? '#4ade80' : '#1a5d3b';

    const loader = document.createElement('div');
    loader.id = 'global-loader';
    
    // ESTILOS DE FUERZA BRUTA PARA CENTRADO TOTAL
    Object.assign(loader.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bgColor,
        zIndex: '2147483647', // El máximo posible
        transition: 'opacity 0.6s ease'
    });

    loader.innerHTML = `
        <div style="text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <div style="margin-bottom: 25px;">
                <img src="${assetPath}dist/multimedia/imagenes/grobo/grobo.png" 
                     alt="Grobo Logo" 
                     style="width: 180px; height: auto; display: block; margin: 0 auto; filter: ${isDark ? 'drop-shadow(0px 0px 12px rgba(74, 222, 128, 0.2))' : 'none'};">
            </div>
            <div style="padding: 0 20px;">
                <h1 style="color: ${textColor}; letter-spacing: 4px; font-weight: 900; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; font-family: sans-serif;">
                    GROBO - ERP BIOTERIOS
                </h1>
                <p style="color: #888; font-size: 10px; letter-spacing: 1.5px; font-weight: 700; margin: 0; text-transform: uppercase; font-family: sans-serif;">
                    Gekos.uy & UDELAR - URBE
                </p>
            </div>
            <div style="margin-top: 25px; display: flex; align-items: center; justify-content: center; gap: 12px;">
                <div class="spinner-border spinner-border-sm" style="color: ${textColor}; width: 14px; height: 14px; border-width: 2px;"></div>
                <span style="color: #888; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">
                    Cargando entorno seguro...
                </span>
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