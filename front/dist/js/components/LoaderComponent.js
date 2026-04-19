// front/dist/js/components/LoaderComponent.js
import '../utils/stripCloudflareInsights.js';

let loaderStartTime = 0;
let phraseIntervalId = null;
let progressIntervalId = null;
/** Se incrementa al detener el loader o al remontar uno: invalida timeouts de frases en curso. */
let loaderPhraseGen = 0;

/** Frases de estado (≥40), tono institucional / bioterio / datos seguros. */
const LOADER_PHRASES_ES = [
    'Conectando con entorno seguro',
    'Verificando credenciales de acceso',
    'Estableciendo canal cifrado con el servidor',
    'Sincronizando preferencias de su sesión',
    'Cargando políticas de la institución',
    'Preparando su espacio de trabajo',
    'Validando permisos del rol asignado',
    'Aplicando aislamiento multi-institución',
    'Comprobando integridad de la sesión',
    'Recuperando módulos habilitados para su sede',
    'Consultando configuración regional',
    'Inicializando componentes de navegación',
    'Cargando menú y accesos autorizados',
    'Sincronizando notificaciones pendientes',
    'Preparando vistas de facturación y saldos',
    'Verificando estado de protocolos activos',
    'Cargando datos de bioterio y especies',
    'Alineando formularios con el tarifario vigente',
    'Revisando reservas y alojamientos en curso',
    'Actualizando bandeja de mensajes institucionales',
    'Protegiendo datos personales y clínicos',
    'Aplicando trazas de auditoría cuando corresponde',
    'Optimizando caché de textos e idioma',
    'Cargando ayudas contextuales del sistema',
    'Verificando mantenimientos programados',
    'Comprobando versión de la aplicación',
    'Preparando tableros y métricas del panel',
    'Sincronizando insumos y pedidos recientes',
    'Cargando historial contable autorizado',
    'Validando cupos y límites de protocolo',
    'Asegurando rutas de solo lectura donde aplique',
    'Preparando exportaciones y reportes seguros',
    'Cargando departamentos y responsables',
    'Verificando vínculos usuario–institución',
    'Aplicando tema y accesibilidad guardados',
    'Inicializando búsqueda global segura',
    'Cargando capacitación y tours guiados',
    'Sincronizando preferencias de voz y UI',
    'Comprobando alertas de seguridad de cuenta',
    'Finalizando arranque del entorno GROBO',
    'Un momento: estamos casi listos',
    'Últimos ajustes antes de mostrar la página',
    'Cerrando el círculo de verificación del cliente',
    'Listo para mostrar sus datos autorizados',
    'Resolviendo dependencias de la interfaz',
    'Chequeando tokens y expiración de sesión',
    'Asentando filtros de mensajería interna',
    'Activando atajos y preferencias guardadas',
    'Sincronizando avisos de mantenimiento del sistema',
];

function shuffleCopy(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getPhraseQueue() {
    const extra = window.txt?.loader?.frases;
    const base = Array.isArray(extra) && extra.length ? [...LOADER_PHRASES_ES, ...extra] : LOADER_PHRASES_ES;
    return shuffleCopy(base);
}

function stopLoaderPhraseRotation() {
    if (phraseIntervalId) {
        clearInterval(phraseIntervalId);
        phraseIntervalId = null;
    }
    if (progressIntervalId) {
        clearInterval(progressIntervalId);
        progressIntervalId = null;
    }
    loaderPhraseGen += 1;
}

/** Puntos 1…5: avanza con el tiempo; el activo tintinea (5 = casi listo). */
function applyProgressDots(loaderEl, step, dotColor) {
    const dots = loaderEl.querySelectorAll('[data-gecko-loader-progress] .gecko-progress-dot');
    const n = dots.length;
    if (!n) return;
    const s = Math.min(Math.max(Number(step) || 1, 1), n);
    dots.forEach((dot, i) => {
        const k = i + 1;
        dot.classList.remove('gecko-dot-done', 'gecko-dot-active', 'gecko-dot-todo');
        dot.style.background = dotColor;
        if (k < s) dot.classList.add('gecko-dot-done');
        else if (k === s) dot.classList.add('gecko-dot-active');
        else dot.classList.add('gecko-dot-todo');
    });
}

function startProgressSteps(loaderEl, dotColor) {
    const genAtMount = loaderPhraseGen;
    let step = 1;
    applyProgressDots(loaderEl, step, dotColor);
    progressIntervalId = window.setInterval(() => {
        if (genAtMount !== loaderPhraseGen) return;
        if (step < 5) step += 1;
        applyProgressDots(loaderEl, step, dotColor);
    }, 720);
}

function startPhraseRotation(loaderEl) {
    const phraseTextEl = loaderEl.querySelector('[data-gecko-loader-phrase-text]');
    const subEl = loaderEl.querySelector('[data-gecko-loader-sub]');
    if (!phraseTextEl) return;

    const queue = getPhraseQueue();
    let idx = 0;
    phraseTextEl.style.opacity = '1';
    phraseTextEl.textContent = queue[idx % queue.length];
    if (subEl) subEl.style.color = '#888';

    const fadeMs = 380;
    const holdMs = 2800;
    const genAtMount = loaderPhraseGen;

    phraseIntervalId = window.setInterval(() => {
        if (genAtMount !== loaderPhraseGen) return;
        const tickGen = loaderPhraseGen;
        phraseTextEl.style.opacity = '0';
        window.setTimeout(() => {
            if (tickGen !== loaderPhraseGen) return;
            idx = (idx + 1) % queue.length;
            phraseTextEl.textContent = queue[idx];
            void phraseTextEl.offsetWidth;
            phraseTextEl.style.opacity = '1';
        }, fadeMs);
    }, holdMs + fadeMs);
}

/**
 * Muestra el loader a pantalla completa. Debe llamarse lo antes posible (p. ej. al inicio del handler de DOMContentLoaded
 * o al evaluar el módulo si el script va al final de `<body>`).
 */
export function showLoader() {
    document.getElementById('gecko-boot-overlay')?.remove();

    if (!document.body) {
        document.addEventListener('DOMContentLoaded', () => showLoader(), { once: true });
        return;
    }

    const oldLoader = document.getElementById('global-loader');
    if (oldLoader) oldLoader.remove();

    document.body.classList.remove('gecko-loaded');
    loaderStartTime = Date.now();
    stopLoaderPhraseRotation();

    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark' || localStorage.getItem('theme') === 'dark';

    const bgColor = isDark ? '#121212' : '#f4f7f6';
    const textColor = isDark ? '#4ade80' : '#1a5d3b';
    const phraseMuted = isDark ? '#9ca3af' : '#5c5c5c';

    const dropShadow = isDark ? 'drop-shadow(0px 6px 10px rgba(74, 222, 128, 0.4))' : 'drop-shadow(0px 8px 12px rgba(0,0,0,0.25))';

    const styleId = 'grobo-loader-style';
    const styleCss = `
            .gecko-3d-universe {
                position: relative;
                width: 212px;
                height: 160px;
                perspective: 800px;
                transform-style: preserve-3d;
                margin-bottom: 30px;
                transform: scale(1.15);
            }
            .gecko-orbit-system {
                position: absolute;
                top: 0; left: 0; width: 100%; height: 100%;
                transform-style: preserve-3d;
                transform-origin: 106px 80px;
                animation: system-spin 4s linear infinite;
            }
            .gecko-node {
                position: absolute;
                top: 0; left: 0; width: 100%; height: 100%;
                transform-style: preserve-3d;
            }
            .gecko-svg {
                position: absolute;
                top: 0; left: 0;
                width: 212px; height: 160px;
                overflow: visible !important;
                filter: ${dropShadow};
                animation: counter-spin 4s linear infinite;
            }
            @keyframes system-spin {
                0%   { transform: rotateX(60deg) rotateZ(0deg); }
                100% { transform: rotateX(60deg) rotateZ(360deg); }
            }
            @keyframes counter-spin {
                0%   { transform: rotateZ(0deg) rotateX(-60deg); }
                100% { transform: rotateZ(-360deg) rotateX(-60deg); }
            }
            .gecko-loader-phrase-row {
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: center;
                flex-wrap: wrap;
                gap: 8px 10px;
                margin-top: 22px;
                max-width: min(92vw, 440px);
                padding: 0 18px;
                box-sizing: border-box;
                min-height: 3em;
            }
            .gecko-loader-phrase-wrap {
                flex: 1 1 200px;
                min-width: 0;
                text-align: center;
            }
            .gecko-loader-phrase-text {
                display: inline;
                transition: opacity 0.32s ease;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                font-family: sans-serif;
                line-height: 1.4;
                will-change: opacity;
            }
            .gecko-loader-progress {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                flex: 0 0 auto;
                padding: 2px 0 0 2px;
            }
            .gecko-progress-dot {
                width: 5px;
                height: 5px;
                border-radius: 50%;
                flex-shrink: 0;
                transition: opacity 0.2s ease, transform 0.2s ease;
            }
            .gecko-progress-dot.gecko-dot-done {
                opacity: 0.92;
                transform: scale(1);
                animation: none;
            }
            .gecko-progress-dot.gecko-dot-todo {
                opacity: 0.16;
                transform: scale(0.92);
                animation: none;
            }
            .gecko-progress-dot.gecko-dot-active {
                animation: gecko-dot-twinkle 0.9s ease-in-out infinite;
            }
            @keyframes gecko-dot-twinkle {
                0%, 100% { opacity: 0.28; transform: scale(0.88); }
                50% { opacity: 1; transform: scale(1.25); }
            }
            #global-loader .gecko-loader-progress,
            #global-loader .gecko-progress-dot {
                visibility: visible !important;
            }
        `;
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
    }
    styleEl.textContent = styleCss;

    const loader = document.createElement('div');
    loader.id = 'global-loader';

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
        zIndex: '2147483647',
        transition: 'opacity 0.55s ease',
        visibility: 'visible',
        opacity: '1',
    });

    const dotColor = textColor;
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
            <div style="padding: 0 24px;">
                <h1 style="color: ${textColor}; letter-spacing: 5px; font-weight: 900; font-size: 16px; margin: 0 0 10px 0; text-transform: uppercase; font-family: sans-serif;">
                    GROBO
                </h1>
                <p data-gecko-loader-sub style="color: #888; font-size: 11px; letter-spacing: 1.5px; font-weight: 700; margin: 0; text-transform: uppercase; font-family: sans-serif;">
                    SISTEMA ERP DE BIOTERIOS
                </p>
            </div>
            <div class="gecko-loader-phrase-row">
                <div class="gecko-loader-phrase-wrap">
                    <span data-gecko-loader-phrase-text class="gecko-loader-phrase-text" style="color: ${phraseMuted};">…</span>
                </div>
                <span class="gecko-loader-progress" data-gecko-loader-progress aria-hidden="true">
                    <span class="gecko-progress-dot"></span>
                    <span class="gecko-progress-dot"></span>
                    <span class="gecko-progress-dot"></span>
                    <span class="gecko-progress-dot"></span>
                    <span class="gecko-progress-dot"></span>
                </span>
            </div>
        </div>
    `;

    document.body.prepend(loader);
    startPhraseRotation(loader);
    startProgressSteps(loader, dotColor);
}

/**
 * Oculta el loader con fundido. Espera a que termine el trabajo asíncrono antes de llamar (p. ej. tras await initMenu()).
 * @param {{ minVisibleMs?: number }} [opts]
 */
export function hideLoader(opts = {}) {
    const minVisibleMs = typeof opts.minVisibleMs === 'number' ? opts.minVisibleMs : 380;
    const remainingTime = Math.max(0, minVisibleMs - (Date.now() - loaderStartTime));

    window.setTimeout(() => {
        stopLoaderPhraseRotation();
        document.getElementById('gecko-boot-overlay')?.remove();
        document.body.classList.add('gecko-loaded');
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.style.opacity = '0';
            window.setTimeout(() => {
                if (loader.parentNode) loader.remove();
            }, 580);
        }
    }, remainingTime);
}
