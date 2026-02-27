export function injectMenuStyles() {
    if(document.getElementById('gecko-menu-styles')) return;

    const style = document.createElement('style');
    style.id = 'gecko-menu-styles';
    style.innerHTML = [
        getBaseStyles(),
        getSidebarStyles(),
        getTriggerStyles(),
        getOmniBoxStyles(),
        getHotkeyStyles(),
        getDarkModeStyles()
    ].join('\n');

    document.head.appendChild(style);
}

// 1. ESTILOS BASE (Aquí arreglamos el tamaño de letra)
function getBaseStyles() {
    return `
        /* DEFINICIÓN DE VARIABLES DE FUENTE */
        :root { --gecko-font-size: 13px; }
        
        html[data-font-size="chica"] { --gecko-font-size: 13px; }
        html[data-font-size="mediana"] { --gecko-font-size: 16px; }
        html[data-font-size="grande"] { --gecko-font-size: 19px; }

        /* APLICACIÓN GLOBAL */
        body, p, span, a, li, td, th, .btn, .form-control, input, select, textarea { 
            font-size: var(--gecko-font-size) !important; 
            transition: background-color 0.3s, color 0.3s, font-size 0.2s ease; 
        }

        /* RESTO DE ESTILOS BASE */
        body { padding-left 0.3s ease; min-height: 100vh; }
        .table-responsive { overflow-x: auto !important; -webkit-overflow-scrolling: touch; border-radius: 8px; }
        
        .menu-icon svg { width: 24px; height: 24px; fill: #888888 !important; transition: fill 0.2s; }
        
        .gecko-nav-link, .gecko-sidebar .nav-link { transition: all 0.2s; border-radius: 6px !important; }
        .gecko-nav-link:hover, .gecko-sidebar .nav-link:hover { background-color: rgba(26, 93, 59, 0.1) !important; color: #1a5d3b !important; }
        .gecko-nav-link:hover .menu-icon svg, .gecko-sidebar .nav-link:hover .menu-icon svg { fill: #1a5d3b !important; }
        
        .custom-menu-pill { border-width: 0 2px 2px 2px !important; border-style: solid !important; border-bottom-left-radius: 12px !important; border-bottom-right-radius: 12px !important; border-top-left-radius: 0 !important; border-top-right-radius: 0 !important; background-color: var(--bs-body-bg); }
        
        .notif-dot { top: -5px; right: -8px; width: 18px; height: 18px; border-radius: 50%; font-size: 10px; font-weight: 900; border: 2px solid white; display: flex; align-items: center; justify-content: center; z-index: 10; }
        
        .dropdown-menu-gecko { position: absolute; min-width: 200px; background-color: #ffffff !important; z-index: 3000 !important; border-radius: 8px; border: 1px solid rgba(0,0,0,0.15); box-shadow: 0 10px 30px rgba(0,0,0,0.1); padding: 0.5rem; }
        .dropdown-menu-gecko.hidden { display: none; }
        // Dentro de getBaseStyles agregar/modificar:
.dropdown-menu-gecko {
    background-color: var(--bs-body-bg) !important;
    border: 1px solid rgba(0,0,0,0.1) !important;
    padding: 8px !important;
}

/* Efecto flechita para el popup lateral */
.gecko-sidebar .dropdown-menu-gecko::before {
    content: "";
    position: absolute;
    top: 15px;
    left: -6px;
    width: 12px;
    height: 12px;
    background: var(--bs-body-bg);
    border-left: 1px solid rgba(0,0,0,0.1);
    border-bottom: 1px solid rgba(0,0,0,0.1);
    transform: rotate(45deg);
}
    /* Color del micrófono */
#btn-voice-switch {
    color: #000000; /* Negro por defecto */
    transition: color 0.3s ease;
}

/* Cambio a verde según la clase dinámica */
#btn-voice-switch.voice-status-true {
    color: #1a5d3b !important; /* Verde */
}
    body:not(.gecko-loaded)::before {
        content: "";
        position: fixed;
        top: 0; left: 0; width: 100vw; height: 100vh;
        background-color: #f4f7f6; /* Color claro */
        z-index: 2147483646;
    }

    [data-bs-theme="dark"] body:not(.gecko-loaded)::before {
        background-color: #121212 !important; /* Color oscuro */
    }
        /* Agrega esto a tus estilos CSS */
@keyframes gecko-pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.8; }
    100% { transform: scale(1); opacity: 1; }
}

/* Aplica la animación al logo del loader */
#global-loader img {
    animation: gecko-pulse 2s ease-in-out infinite;
}
    `;
}

function getSidebarStyles() {
    return `
        .gecko-sidebar { 
            position: fixed !important; 
            top: 0; 
            left: 0; 
            height: 100vh; /* Alto total de la pantalla */
            width: 260px; 
            z-index: 1050; 
            transition: transform 0.3s ease; 
            background-color: var(--bs-body-bg);
            display: flex; 
            flex-direction: column;
            padding-bottom: 15px !important;
            overflow: visible !important; 
        }
        
        #side-menu-ul {
            flex-grow: 1; /* Ocupa todo el espacio sobrante */
            display: flex;
            flex-direction: column;
            justify-content: space-evenly; /* Reparte los ítems equitativamente */
            overflow-y: visible; /* Nunca scroll */
            min-height: 0;
            padding: 0;
            margin-bottom: 0 !important;
        }

        /* Ajuste automático para que quepa todo */
        .gecko-sidebar .nav-item {
            margin-bottom: 0 !important; 
        }

        .gecko-sidebar .nav-link { 
            padding-top: 6px !important; 
            padding-bottom: 6px !important; 
            /* Si hay muchos ítems, el texto se achica un poco automáticamente */
            font-size: clamp(10px, 1.2vh, var(--gecko-font-size)) !important;
        }

        .gecko-sidebar .menu-icon svg {
            /* Achica un poco el icono si la pantalla es bajita */
            width: clamp(18px, 2.5vh, 24px); 
            height: clamp(18px, 2.5vh, 24px);
        }

        @media (min-width: 769px) { body.with-sidebar { padding-left: 260px !important; } }
        /* --- BLOQUEO DE DESBORDAMIENTO (ANTI-SCROLL EXTREMO) --- */
        #side-menu-ul {
            /* Forzamos a que el UL nunca pase del 100% del espacio disponible */
            max-height: calc(100vh - 160px); 
        }

        .gecko-sidebar .nav-item {
            /* Cada ítem tiene permitido encogerse si no hay espacio */
            flex: 1 1 auto; 
            min-height: 25px; /* Altura mínima de colapso */
            display: flex;
            align-items: center;
        }

        .gecko-sidebar .nav-link {
            /* El enlace ocupa el 100% del ítem encogido */
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            /* Padding elástico: menos espacio vertical, menos padding */
            padding-top: clamp(2px, 1vh, 8px) !important;
            padding-bottom: clamp(2px, 1vh, 8px) !important;
            /* La letra se ahoga antes que salir de la pantalla */
            font-size: clamp(9px, 2vh, var(--gecko-font-size)) !important;
        }

        /* Espacio para la barra de búsqueda Omnibox cuando el menú es lateral */
        body.with-sidebar .container,
        body.with-sidebar .container-fluid {
            padding-top: 60px !important; /* Da aire arriba para que el buscador flotante no tape el contenido */
        }
    `;
}

function getTriggerStyles() {
    return `
        .gecko-search-trigger {
            z-index: 1055;
            background: #fff;
            border: 1px solid #e0e0e0;
            border-radius: 50px;
            padding: 6px 16px; /* Más compacto */
            display: flex; align-items: center; gap: 10px;
            transition: opacity 0.2s; /* Solo opacidad, el movimiento lo hace la caja */
            cursor: pointer;
            width: 280px; 
            color: #666;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        .gecko-search-trigger.floating { position: fixed; top: 15px; left: 50%; transform: translateX(-50%); }
        .gecko-search-trigger.static { position: relative; margin: 5px auto 10px auto; }
        
        .gecko-search-trigger:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); color: #1a5d3b; border-color: #1a5d3b; }
        .gecko-search-trigger .placeholder-text { font-size: 13px; font-weight: 500; opacity: 0.8; pointer-events: none; white-space: nowrap; }
        .gecko-search-trigger .kbd-shortcut { font-size: 10px; background: #f8f9fa; padding: 2px 6px; border-radius: 6px; font-family: monospace; border: 1px solid #dee2e6; margin-left: auto; color: #777; font-weight: 700; min-width: 50px; text-align: center; }
    `;
}

// 4. ESTILOS DEL OMNI-BOX (Animación mejorada y Z-Index corregido)
function getOmniBoxStyles() {
    return `
        /* --- OMNI-OVERLAY --- */
        #gecko-omni-overlay {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: transparent; 
            /* Z-Index 1045: Encima del menú (1030) pero DEBAJO del Modal Backdrop (1050) */
            z-index: 1045; 
            display: none;
            justify-content: center;
            align-items: flex-start;
        }
        #gecko-omni-overlay.show { display: block; }

        /* --- CAJA PRINCIPAL --- */
        .gecko-omni-box {
            background: white;
            /* width/top/left iniciales definidos por JS al abrir */
            border-radius: 50px; /* Empieza redonda como el trigger */
            border: 1px solid rgba(0,0,0,0.15);
            box-shadow: 0 5px 20px rgba(0,0,0,0.1); /* Sombra inicial sutil */
            overflow: hidden;
            display: flex; flex-direction: column;
            position: fixed;
            opacity: 0;
            
            /* LA MAGIA MEJORADA: Curvas Bezier para suavidad extrema */
            transition: 
                top 0.4s cubic-bezier(0.25, 1, 0.5, 1),
                left 0.4s cubic-bezier(0.25, 1, 0.5, 1),
                width 0.4s cubic-bezier(0.25, 1, 0.5, 1),
                height 0.4s cubic-bezier(0.25, 1, 0.5, 1),
                border-radius 0.3s ease,
                opacity 0.2s ease,
                box-shadow 0.4s ease;
        }
        
        /* ESTADO ABIERTO */
        .gecko-omni-box.open {
            /* Los valores finales los pone el JS, pero aquí forzamos la sombra grande */
            box-shadow: 0 25px 80px rgba(0, 0, 0, 0.2) !important;
            opacity: 1 !important;
            border-radius: 16px !important;
        }

        .gecko-omni-header {
            display: flex; align-items: center; border-bottom: 1px solid transparent; 
            padding: 8px 20px; /* Padding reducido para coincidir con el trigger */
            gap: 12px;
            background: #fff;
            height: 52px; /* Altura controlada */
            transition: border-color 0.3s ease 0.2s; /* El borde aparece después */
        }
        .gecko-omni-box.open .gecko-omni-header { border-bottom-color: #f0f0f0; }

        .gecko-omni-header svg { color: #1a5d3b; width: 24px !important; height: 24px !important; min-width: 24px; transition: 0.3s; }
        
        #gecko-omni-input {
            border: none; outline: none; font-size: 16px; width: 100%; color: #333; font-weight: 500; background: transparent; height: 30px;
            transform-origin: left center; transition: 0.3s;
        }
        
        /* MICRÓFONO */
        #gecko-omni-voice-btn {
            background: none; border: none; cursor: pointer; color: #adb5bd; transition: 0.2s; padding: 8px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
        }
        #gecko-omni-voice-btn:hover { background: #f8f9fa; color: #495057; }
        #gecko-omni-voice-btn.listening { color: #dc3545 !important; background: #fff5f5; box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.15); animation: pulseRed 1.5s infinite; }

        /* RESULTADOS (FADE IN/OUT) */
        .gecko-omni-results { 
            max-height: 60vh; overflow-y: auto; padding: 0; background: #fff; 
            opacity: 0; 
            transform: translateY(10px);
            transition: opacity 0.2s ease, transform 0.2s ease;
            pointer-events: none;
        }
        .gecko-omni-box.open .gecko-omni-results { 
            opacity: 1; 
            transform: translateY(0);
            pointer-events: all;
            transition-delay: 0.2s; /* Espera a que la caja crezca */
        }

        .gecko-omni-empty { padding: 40px; text-align: center; color: #999; font-size: 14px; }
        
        .omni-item { padding: 12px 24px; border-bottom: 1px solid #f9f9f9; cursor: pointer; display: flex; align-items: center; gap: 15px; text-decoration: none; color: #444; transition: 0.1s; }
        .omni-item:hover, .omni-item.active { background: #f6fdf8; border-left: 3px solid #1a5d3b; padding-left: 21px; }
        .omni-item-icon { color: #bbb; display: flex; align-items: center; }
        .omni-item:hover .omni-item-icon { color: #1a5d3b; }
        .omni-meta { font-size: 10px; color: #999; margin-left: auto; background: #f5f5f5; padding: 3px 8px; border-radius: 4px; font-weight: 700; letter-spacing: 0.5px; }
        .contenedor-resultados { /* Cambia esta clase por la que uses en tu HTML */
            max-height: 350px; /* Suficiente para unos 5 resultados aprox */
            overflow-y: auto;  /* Activa el scroll vertical solo si se pasa de la altura */
            overflow-x: hidden; /* Evita que salga scroll horizontal feo */
        }
        @keyframes pulseRed { 0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.4); } 70% { box-shadow: 0 0 0 8px rgba(220, 53, 69, 0); } 100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); } }

        /* Reemplaza la regla de .gecko-omni-header svg por esta o añádela */
        .gecko-search-logo {
            width: 42px !important; 
            height: 42px !important;
            min-width: 42px;
            object-fit: contain;
        }

        /* Opcional: Si quieres que el gecko tenga un efecto al abrir la caja */
        .gecko-omni-box.open .gecko-search-logo {
            transform: scale(1.1);
        }
    `;
}

function getHotkeyStyles() {
    return `
        .hotkey-card-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px; padding: 15px; }
        .hotkey-item { display: flex; align-items: center; justify-content: space-between; background: #fff; border: 1px solid #eee; padding: 8px 12px; border-radius: 8px; transition: 0.2s; }
        .hotkey-item:hover { border-color: #1a5d3b; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        .hotkey-keys kbd { background: #333; color: #fff; padding: 3px 6px; border-radius: 4px; font-family: monospace; font-size: 10px; margin-left: 3px; }
        .hotkey-desc { font-size: 12px; font-weight: 600; color: #555; }
    `;
}

function getDarkModeStyles() {
    return `
        /* Variables Globales Modo Oscuro */
        [data-bs-theme="dark"] {
            --bs-body-bg: #121212 !important;
            --bs-body-color: #E0E0E0 !important;
            --gecko-dark-card: #1E1E1E;
            --gecko-dark-border: #2A2A2A;
            --gecko-dark-hover: #1e3a29; 
            --gecko-accent: #4ade80 !important; 
            --gecko-input-bg: #2B2B2B;
        }

        /* --- SELECCIÓN DE TEXTO --- */
        [data-bs-theme="dark"] ::selection {
            background: rgba(74, 222, 128, 0.3);
            color: #ffffff;
        }

        /* --- FONDOS Y TARJETAS GLOBALES --- */
        /* Forzamos el fondo del body y sobreescribimos estilos en línea */
        [data-bs-theme="dark"] body { background-color: var(--bs-body-bg) !important; }
        
        [data-bs-theme="dark"] .card, 
        [data-bs-theme="dark"] .bg-white,
        [data-bs-theme="dark"] .bg-body-tertiary,
        [data-bs-theme="dark"] .bg-light { 
            background-color: var(--gecko-dark-card) !important; 
            border-color: var(--gecko-dark-border) !important; 
        }
        
        /* Cajas especiales (ej. "step-2" verde clarito en claro) */
        [data-bs-theme="dark"] [style*="background: #f8fff9"] {
            background-color: #16241a !important; /* Verde ultra oscuro */
            border-left-color: var(--gecko-accent) !important;
        }

        /* --- CLASES ESPECÍFICAS DE TAILWIND --- */
        [data-bs-theme="dark"] .bg-gray-50 { background-color: #1A1A1A !important; }
        [data-bs-theme="dark"] .border-gray-200 { border-color: var(--gecko-dark-border) !important; }
        [data-bs-theme="dark"] .text-gray-900 { color: #FFFFFF !important; }
        [data-bs-theme="dark"] .text-gray-400 { color: #888888 !important; }
        [data-bs-theme="dark"] .text-green-600 { color: var(--gecko-accent) !important; }
        [data-bs-theme="dark"] .text-amber-600 { color: #F59E0B !important; }

        /* --- TEXTOS --- */
        [data-bs-theme="dark"] .text-dark { color: #FFFFFF !important; }
        [data-bs-theme="dark"] .text-muted { color: #A0A0A0 !important; }
        [data-bs-theme="dark"] .text-secondary { color: #B0B0B0 !important; }
        [data-bs-theme="dark"] .text-success { color: var(--gecko-accent) !important; } 
        [data-bs-theme="dark"] .text-primary { color: #60A5FA !important; } 

        /* --- INPUTS Y FORMULARIOS --- */
        [data-bs-theme="dark"] .form-control,
        [data-bs-theme="dark"] .form-select,
        [data-bs-theme="dark"] .input-group-text {
            background-color: var(--gecko-input-bg) !important;
            border-color: var(--gecko-dark-border) !important;
            color: #FFFFFF !important;
        }
        [data-bs-theme="dark"] .form-control:focus,
        [data-bs-theme="dark"] .form-select:focus {
            border-color: var(--gecko-accent) !important;
            box-shadow: 0 0 0 0.25rem rgba(74, 222, 128, 0.25) !important;
        }
        [data-bs-theme="dark"] .form-control::placeholder { color: #777 !important; }
        
        /* Input totales bg-success */
        [data-bs-theme="dark"] input.bg-success {
            background-color: var(--gecko-dark-hover) !important;
            color: var(--gecko-accent) !important;
            border-color: var(--gecko-accent) !important;
        }

        /* --- LISTAS DESPLEGABLES (Buscador de Protocolos) --- */
        [data-bs-theme="dark"] .list-group-item {
            background-color: var(--gecko-dark-card) !important;
            border-color: var(--gecko-dark-border) !important;
            color: #E0E0E0 !important;
        }
        [data-bs-theme="dark"] .list-group-item:hover,
        [data-bs-theme="dark"] .list-group-item-action:focus {
            background-color: var(--gecko-dark-hover) !important;
        }
        
        /* --- TABLA Y TRAZABILIDAD --- */
        [data-bs-theme="dark"] .table { border-color: var(--gecko-dark-border) !important; color: #E0E0E0; }
        [data-bs-theme="dark"] .table thead th,
        [data-bs-theme="dark"] .table thead.bg-secondary { 
            background-color: #252525 !important; 
            color: #AAA !important; 
            border-color: var(--gecko-dark-border) !important;
        }
        [data-bs-theme="dark"] .table-light,
        [data-bs-theme="dark"] .table tbody tr { background-color: var(--gecko-dark-card) !important; border-color: var(--gecko-dark-border) !important; color: #E0E0E0; }
        [data-bs-theme="dark"] .table tbody tr td { border-color: var(--gecko-dark-border) !important; }
        [data-bs-theme="dark"] .table tbody tr.pointer:hover { background-color: #252525 !important; }
        [data-bs-theme="dark"] [id^="trazabilidad-row"] td { background-color: #121212 !important; }
        [data-bs-theme="dark"] [id^="trazabilidad-content"] { 
            background-color: #1A1A1A !important; 
            border-left-color: var(--gecko-accent) !important;
        }

        /* --- MODAL --- */
        [data-bs-theme="dark"] .modal-content { background-color: var(--bs-body-bg); border: 1px solid var(--gecko-dark-border); }
        [data-bs-theme="dark"] .modal-header.bg-dark { background-color: #1E1E1E !important; border-bottom: 1px solid var(--gecko-dark-border); }
        [data-bs-theme="dark"] .modal-footer,
        [data-bs-theme="dark"] .modal-footer.bg-light { background-color: #1E1E1E !important; border-top: 1px solid var(--gecko-dark-border); }
        [data-bs-theme="dark"] #historial-summary.bg-light { background-color: #1E1E1E !important; border-color: var(--gecko-dark-border) !important; }
        [data-bs-theme="dark"] #historial-summary .border-end { border-right-color: var(--gecko-dark-border) !important; }
        [data-bs-theme="dark"] #historial-summary .border-top { border-top-color: var(--gecko-dark-border) !important; }
        [data-bs-theme="dark"] .alert-info { background-color: rgba(13, 202, 240, 0.1) !important; border-color: transparent !important; border-left-color: #0dcaf0 !important; color: #E0E0E0; }

        /* --- BOTONES Y BADGES --- */
        [data-bs-theme="dark"] .btn-outline-dark { border-color: #555; color: #CCC; }
        [data-bs-theme="dark"] .btn-outline-dark:hover { background-color: #333; color: #FFF; border-color: #777; }
        
        [data-bs-theme="dark"] .btn-outline-success { border-color: var(--gecko-accent); color: var(--gecko-accent); }
        [data-bs-theme="dark"] .btn-outline-success:hover { background-color: var(--gecko-dark-hover); color: #FFF; }
        
        [data-bs-theme="dark"] .btn-light { background-color: #252525 !important; border-color: #444 !important; color: #CCC !important; }
        [data-bs-theme="dark"] .btn-light:hover { background-color: #333 !important; color: #FFF !important; }

        [data-bs-theme="dark"] .badge.bg-dark,
        [data-bs-theme="dark"] .badge.bg-secondary { background-color: #333 !important; color: #DDD !important; border: 1px solid #555; }
        [data-bs-theme="dark"] .badge.bg-success { background-color: var(--gecko-dark-hover) !important; color: var(--gecko-accent) !important; border: 1px solid var(--gecko-accent); }
        [data-bs-theme="dark"] .badge.bg-light { background-color: #252525 !important; color: #AAA !important; border-color: #444 !important; }

        /* ========================================================= */
        /* --- MENÚ SUPERIOR / LATERAL (SUBRAYADOS VERDE CLARITO) --- */
        /* ========================================================= */
        [data-bs-theme="dark"] .gecko-sidebar { border-right: 1px solid var(--gecko-dark-border) !important; }
        [data-bs-theme="dark"] .custom-menu-pill,
        [data-bs-theme="dark"] .border-success { border-color: var(--gecko-accent) !important; }
        
        [data-bs-theme="dark"] .gecko-nav-link, 
        [data-bs-theme="dark"] .gecko-sidebar .nav-link { color: #CCCCCC !important; border: 2px solid transparent; }
        
        [data-bs-theme="dark"] .gecko-nav-link:hover, 
        [data-bs-theme="dark"] .gecko-sidebar .nav-link:hover { background-color: var(--gecko-dark-hover) !important; color: var(--gecko-accent) !important; }

        [data-bs-theme="dark"] .gecko-nav-link:hover { border-bottom: 2px solid var(--gecko-accent) !important; }
        [data-bs-theme="dark"] .gecko-sidebar .nav-link:hover { border-bottom: 2px solid transparent !important; border-left: 3px solid var(--gecko-accent) !important; }

        [data-bs-theme="dark"] .dropdown-menu-gecko { background-color: var(--gecko-dark-card) !important; border: 1px solid var(--gecko-accent) !important; box-shadow: 0 10px 30px rgba(0,0,0,0.6) !important; }
        [data-bs-theme="dark"] .dropdown-menu-gecko::before { background: var(--gecko-dark-card); border-color: var(--gecko-accent); }
        [data-bs-theme="dark"] .dropdown-item-gecko { color: #CCCCCC; }
        [data-bs-theme="dark"] .dropdown-item-gecko:hover { background-color: var(--gecko-dark-hover); color: var(--gecko-accent) !important; }

        /* --- OMNIBOX BUSCADOR --- */
        [data-bs-theme="dark"] .gecko-search-trigger { background: var(--gecko-dark-card); border-color: var(--gecko-dark-border); color: #ccc; }
        [data-bs-theme="dark"] .gecko-search-trigger:hover { background: #252525; border-color: var(--gecko-accent); color: #fff; }
        [data-bs-theme="dark"] .gecko-search-trigger .kbd-shortcut { background: #2A2A2A; border-color: #444; color: #aaa; }
        [data-bs-theme="dark"] .gecko-omni-box { background: var(--gecko-dark-card); border: 1px solid var(--gecko-accent); box-shadow: 0 20px 60px rgba(0,0,0,0.8) !important; }
        [data-bs-theme="dark"] .gecko-omni-header { border-bottom-color: var(--gecko-dark-border); background: var(--gecko-dark-card); }
        [data-bs-theme="dark"] #gecko-omni-input { color: #fff; }
        [data-bs-theme="dark"] .gecko-omni-results { background: var(--gecko-dark-card); }
        [data-bs-theme="dark"] .omni-item { border-color: var(--gecko-dark-border); color: #ddd; }
        [data-bs-theme="dark"] .omni-item:hover, [data-bs-theme="dark"] .omni-item.active { background: var(--gecko-dark-hover); border-left-color: var(--gecko-accent); }
        [data-bs-theme="dark"] .omni-item:hover .omni-item-icon { color: var(--gecko-accent); }
        [data-bs-theme="dark"] .omni-meta { background: #333; color: #aaa; }
        [data-bs-theme="dark"] .btn-control-gecko { border-color: var(--gecko-dark-border) !important; color: #CCCCCC !important; background: transparent !important; }
        [data-bs-theme="dark"] .btn-control-gecko:hover { background-color: var(--gecko-dark-hover) !important; color: var(--gecko-accent) !important; border-color: var(--gecko-accent) !important; }
        /* ========================================================================== */
        /* TELÓN DE FONDO DINÁMICO (LIGHT / DARK)                                     */
        /* ========================================================================== */

        /* Bloqueo de scroll inicial */
        body:not(.gecko-loaded) {
            overflow: hidden !important;
        }

        /* 1. El telón que tapa el HTML crudo (Modo Claro por defecto) */
        body:not(.gecko-loaded)::before {
            content: "";
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background-color: #f4f7f6; 
            z-index: 999999;
        }

        /* 2. El telón en Modo Oscuro (Se activa si el HTML tiene data-bs-theme="dark") */
        [data-bs-theme="dark"] body:not(.gecko-loaded)::before {
            background-color: #121212 !important; 
        }

        /* Spinner minimalista de respaldo */
        body:not(.gecko-loaded)::after {
            content: "";
            position: fixed;
            top: 50%; left: 50%;
            width: 40px; height: 40px;
            margin: -20px 0 0 -20px;
            border: 3px solid rgba(26, 93, 59, 0.1);
            border-top-color: #1a5d3b;
            border-radius: 50%;
            animation: gecko-global-spin 0.6s linear infinite;
            z-index: 1000000;
        }

        [data-bs-theme="dark"] body:not(.gecko-loaded)::after {
            border-color: rgba(74, 222, 128, 0.1);
            border-top-color: #4ade80; 
        }

        @keyframes gecko-global-spin { to { transform: rotate(360deg); } }
        /* Hover sutil para las filas de la tabla en modo oscuro */
[data-bs-theme="dark"] .table tbody tr {
  background-color: var(--gecko-dark-card) !important;
  border-color: var(--gecko-dark-border) !important;
  color: #E0E0E0;
  transition: background-color 0.15s ease, color 0.15s ease;
}

[data-bs-theme="dark"] .table tbody tr:hover {
  /* Un verde esmeralda muy suave (8% de opacidad) */
  background-color: rgba(74, 222, 128, 0.08) !important; 
  /* Iluminamos el texto un poquito hacia el verde de la marca */
  color: #4ade80 !important; 
  cursor: pointer;
}
  /* Hover sutil verde para las filas */
[data-bs-theme="dark"] .table tbody tr {
    transition: background-color 0.15s ease;
}

[data-bs-theme="dark"] .table tbody tr:hover {
    background-color: rgba(74, 222, 128, 0.1) !important; /* Verde marca al 10% */
    cursor: pointer;
}
    `;
}