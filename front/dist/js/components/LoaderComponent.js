// front/dist/js/components/LoaderComponent.js

let loaderStartTime = 0;

export function showLoader() {
    const oldLoader = document.getElementById('global-loader');
    if (oldLoader) oldLoader.remove();

    document.body.classList.remove('gecko-loaded');
    loaderStartTime = Date.now();

    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark' || localStorage.getItem('theme') === 'dark';
    
    const bgColor = isDark ? '#121212' : '#f4f7f6';
    const textColor = isDark ? '#4ade80' : '#1a5d3b';
    
    // Sombra volumétrica para separar las piezas en el espacio 3D
    const dropShadow = isDark ? 'drop-shadow(0px 6px 10px rgba(74, 222, 128, 0.4))' : 'drop-shadow(0px 8px 12px rgba(0,0,0,0.25))';

    // 1. MOTOR DE GRAVEDAD Y CONSTELACIÓN 3D
    const styleId = 'grobo-loader-style';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            .gecko-3d-universe {
                position: relative;
                width: 212px;
                height: 160px;
                perspective: 800px; /* Profundidad de cámara */
                transform-style: preserve-3d;
                margin-bottom: 30px;
                transform: scale(1.15);
            }
            
            /* El ÚNICO sistema rotatorio. Todo el logo se acuesta 60 grados y gira. */
            /* VELOCIDAD AJUSTADA A 4 SEGUNDOS */
            .gecko-orbit-system {
                position: absolute;
                top: 0; left: 0; width: 100%; height: 100%;
                transform-style: preserve-3d;
                transform-origin: 106px 80px; /* Centro matemático del lienzo */
                animation: system-spin 4s linear infinite; 
            }

            /* Nodo contenedor para asignar la Altura (Eje Z) de cada pelotita */
            .gecko-node {
                position: absolute;
                top: 0; left: 0; width: 100%; height: 100%;
                transform-style: preserve-3d;
            }

            /* El SVG siempre mirará a cámara gracias a la contra-rotación */
            /* VELOCIDAD DE CONTRA-ROTACIÓN SINCRONIZADA A 4 SEGUNDOS */
            .gecko-svg {
                position: absolute;
                top: 0; left: 0;
                width: 212px; height: 160px;
                overflow: visible !important;
                filter: ${dropShadow};
                animation: counter-spin 4s linear infinite;
            }

            /* Animación del disco entero */
            @keyframes system-spin {
                0%   { transform: rotateX(60deg) rotateZ(0deg); }
                100% { transform: rotateX(60deg) rotateZ(360deg); }
            }
            
            /* Contra-animación de cada pieza para anular la deformación */
            @keyframes counter-spin {
                0%   { transform: rotateZ(0deg) rotateX(-60deg); }
                100% { transform: rotateZ(-360deg) rotateX(-60deg); }
            }
        `;
        document.head.appendChild(style);
    }

    const loader = document.createElement('div');
    loader.id = 'global-loader';
    
    Object.assign(loader.style, {
        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        backgroundColor: bgColor, zIndex: '2147483647', transition: 'opacity 0.6s ease'
    });

    // 2. DICCIONARIO DE VECTORES SVG (Optimizado)
    const svgDefs = `
        <svg style="position:absolute; width:0; height:0; display:block;" aria-hidden="true">
            <defs>
                <clipPath id="c_p1"><path d="M 26.3 32.1 L 69.5 32.1 L 69.5 75.3 L 26.3 75.3 Z" /></clipPath>
                <clipPath id="c_p1_b"><path d="M 47.9 32.1 C 35.9 32.1 26.3 41.8 26.3 53.7 C 26.3 65.7 35.9 75.3 47.9 75.3 C 59.8 75.3 69.5 65.7 69.5 53.7 C 69.5 41.8 59.8 32.1 47.9 32.1 Z" /></clipPath>
                <clipPath id="c_p1_c"><path d="M 0.3 0.1 L 43.5 0.1 L 43.5 43.3 L 0.3 43.3 Z" /></clipPath>
                <clipPath id="c_p1_d"><path d="M 21.9 0.1 C 9.9 0.1 0.3 9.8 0.3 21.7 C 0.3 33.7 9.9 43.3 21.9 43.3 C 33.8 43.3 43.5 33.7 43.5 21.7 C 43.5 9.8 33.8 0.1 21.9 0.1 Z" /></clipPath>
                
                <clipPath id="c_p2"><path d="M 99.7 22.6 L 193.3 22.6 L 193.3 116.1 L 99.7 116.1 Z" /></clipPath>
                <clipPath id="c_p2_b"><path d="M 146.5 22.6 C 120.7 22.6 99.7 43.5 99.7 69.4 C 99.7 95.2 120.7 116.1 146.5 116.1 C 172.3 116.1 193.3 95.2 193.3 69.4 C 193.3 43.5 172.3 22.6 146.5 22.6 Z" /></clipPath>
                <clipPath id="c_p2_c"><path d="M 0.7 0.6 L 94.3 0.6 L 94.3 94.1 L 0.7 94.1 Z" /></clipPath>
                <clipPath id="c_p2_d"><path d="M 47.5 0.6 C 21.7 0.6 0.7 21.5 0.7 47.4 C 0.7 73.2 21.7 94.1 47.5 94.1 C 73.3 94.1 94.3 73.2 94.3 47.4 C 94.3 21.5 73.3 0.6 47.5 0.6 Z" /></clipPath>

                <clipPath id="c_p3"><path d="M 18 82.9 L 84.5 82.9 L 84.5 149.4 L 18 149.4 Z" /></clipPath>
                <clipPath id="c_p3_b"><path d="M 51.2 82.9 C 32.9 82.9 18 97.8 18 116.1 C 18 134.5 32.9 149.4 51.2 149.4 C 69.6 149.4 84.5 134.5 84.5 116.1 C 84.5 97.8 69.6 82.9 51.2 82.9 Z" /></clipPath>
                <clipPath id="c_p3_c"><path d="M 0 0.9 L 66.5 0.9 L 66.5 67.4 L 0 67.4 Z" /></clipPath>
                <clipPath id="c_p3_d"><path d="M 33.2 0.9 C 14.9 0.9 0 15.8 0 34.1 C 0 52.5 14.9 67.4 33.2 67.4 C 51.6 67.4 66.5 52.5 66.5 34.1 C 66.5 15.8 51.6 0.9 33.2 0.9 Z" /></clipPath>

                <clipPath id="c_p4"><path d="M 99.7 127.2 L 128 127.2 L 128 155.5 L 99.7 155.5 Z" /></clipPath>
                <clipPath id="c_p4_b"><path d="M 113.9 127.2 C 106.1 127.2 99.7 133.5 99.7 141.4 C 99.7 149.2 106.1 155.5 113.9 155.5 C 121.7 155.5 128 149.2 128 141.4 C 128 133.5 121.7 127.2 113.9 127.2 Z" /></clipPath>
                <clipPath id="c_p4_c"><path d="M 0.7 0.2 L 29 0.2 L 29 28.5 L 0.7 28.5 Z" /></clipPath>
                <clipPath id="c_p4_d"><path d="M 14.9 0.2 C 7.1 0.2 0.7 6.5 0.7 14.4 C 0.7 22.2 7.1 28.5 14.9 28.5 C 22.7 28.5 29 22.2 29 14.4 C 29 6.5 22.7 0.2 14.9 0.2 Z" /></clipPath>

                <clipPath id="c_p5"><path d="M 71.4 18 L 99.7 18 L 99.7 46.3 L 71.4 46.3 Z" /></clipPath>
                <clipPath id="c_p5_b"><path d="M 85.6 18 C 77.8 18 71.4 24.3 71.4 32.1 C 71.4 39.9 77.8 46.3 85.6 46.3 C 93.4 46.3 99.7 39.9 99.7 32.1 C 99.7 24.3 93.4 18 85.6 18 Z" /></clipPath>
                <clipPath id="c_p5_c"><path d="M 0.4 0 L 28.7 0 L 28.7 28.3 L 0.4 28.3 Z" /></clipPath>
                <clipPath id="c_p5_d"><path d="M 14.6 0 C 6.8 0 0.4 6.3 0.4 14.1 C 0.4 21.9 6.8 28.3 14.6 28.3 C 22.4 28.3 28.7 21.9 28.7 14.1 C 28.7 6.3 22.4 0 14.6 0 Z" /></clipPath>

                <linearGradient x1="0" y1="1" x2="1" y2="0" id="grad_gecko">
                    <stop stop-opacity="1" stop-color="rgb(0%, 59.2%, 69.8%)" offset="0"/>
                    <stop stop-opacity="1" stop-color="rgb(24.5%, 72%, 52%)" offset="0.5"/>
                    <stop stop-opacity="1" stop-color="rgb(49.2%, 85%, 34.2%)" offset="1"/>
                </linearGradient>
            </defs>
        </svg>
    `;

    // 3. ESTRUCTURA 3D (Constelación unificada con alturas separadas)
    loader.innerHTML = `
        ${svgDefs}
        <div style="text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            
            <div class="gecko-3d-universe">
                <div class="gecko-orbit-system">
                    
                    <div class="gecko-node" style="transform: translateZ(0px);">
                        <svg class="gecko-svg" style="transform-origin: 146.5px 69.4px;" viewBox="0 0 212 160">
                            <g clip-path="url(#c_p2)"><g clip-path="url(#c_p2_b)"><g transform="matrix(1, 0, 0, 1, 99, 22)"><g clip-path="url(#c_p2_c)"><g clip-path="url(#c_p2_d)"><path fill="url(#grad_gecko)" d="M 0.7 0.6 L 0.7 94.1 L 94.3 94.1 L 94.3 0.6 Z" fill-rule="nonzero"/></g></g></g></g></g>
                        </svg>
                    </div>

                    <div class="gecko-node" style="transform: translateZ(35px);">
                        <svg class="gecko-svg" style="transform-origin: 47.9px 53.8px;" viewBox="0 0 212 160">
                            <g clip-path="url(#c_p1)"><g clip-path="url(#c_p1_b)"><g transform="matrix(1, 0, 0, 1, 26, 32)"><g clip-path="url(#c_p1_c)"><g clip-path="url(#c_p1_d)"><path fill="url(#grad_gecko)" d="M 0.3 0.1 L 0.3 43.3 L 43.5 43.3 L 43.5 0.1 Z" fill-rule="nonzero"/></g></g></g></g></g>
                        </svg>
                    </div>

                    <div class="gecko-node" style="transform: translateZ(-25px);">
                        <svg class="gecko-svg" style="transform-origin: 51.3px 116.2px;" viewBox="0 0 212 160">
                            <g clip-path="url(#c_p3)"><g clip-path="url(#c_p3_b)"><g transform="matrix(1, 0, 0, 1, 18, 82)"><g clip-path="url(#c_p3_c)"><g clip-path="url(#c_p3_d)"><path fill="url(#grad_gecko)" d="M 0 0.9 L 0 67.4 L 66.5 67.4 L 66.5 0.9 Z" fill-rule="nonzero"/></g></g></g></g></g>
                        </svg>
                    </div>

                    <div class="gecko-node" style="transform: translateZ(50px);">
                        <svg class="gecko-svg" style="transform-origin: 113.9px 141.4px;" viewBox="0 0 212 160">
                            <g clip-path="url(#c_p4)"><g clip-path="url(#c_p4_b)"><g transform="matrix(1, 0, 0, 1, 99, 127)"><g clip-path="url(#c_p4_c)"><g clip-path="url(#c_p4_d)"><path fill="url(#grad_gecko)" d="M 0.7 0.2 L 0.7 28.5 L 29 28.5 L 29 0.2 Z" fill-rule="nonzero"/></g></g></g></g></g>
                        </svg>
                    </div>

                    <div class="gecko-node" style="transform: translateZ(-45px);">
                        <svg class="gecko-svg" style="transform-origin: 85.6px 32.2px;" viewBox="0 0 212 160">
                            <g clip-path="url(#c_p5)"><g clip-path="url(#c_p5_b)"><g transform="matrix(1, 0, 0, 1, 71, 18)"><g clip-path="url(#c_p5_c)"><g clip-path="url(#c_p5_d)"><path fill="url(#grad_gecko)" d="M 0.4 0 L 0.4 28.3 L 28.7 28.3 L 28.7 0 Z" fill-rule="nonzero"/></g></g></g></g></g>
                        </svg>
                    </div>

                </div>
            </div>

            <div style="padding: 0 20px;">
                <h1 style="color: ${textColor}; letter-spacing: 5px; font-weight: 900; font-size: 16px; margin: 0 0 10px 0; text-transform: uppercase; font-family: sans-serif;">
                    GROBO
                </h1>
                <p style="color: #888; font-size: 11px; letter-spacing: 1.5px; font-weight: 700; margin: 0; text-transform: uppercase; font-family: sans-serif;">
                    SISTEMA ERP DE BIOTERIOS
                </p>
            </div>
            <div style="margin-top: 30px; display: flex; align-items: center; justify-content: center; gap: 12px;">
                <div class="spinner-border spinner-border-sm" style="color: ${textColor}; width: 14px; height: 14px; border-width: 2px;"></div>
                <span style="color: #888; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">
                    Conectando entorno seguro...
                </span>
            </div>
        </div>
    `;

    document.body.prepend(loader);
}

export function hideLoader() {
    const minDuration = 2500; // Ajustado también para acompañar el nuevo ritmo ágil
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