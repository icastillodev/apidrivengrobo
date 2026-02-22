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
    `;
}

function getSidebarStyles() {
    return `
        .gecko-sidebar { 
            position: fixed !important; top: 0; left: 0; 
            height: 100vh; width: 260px; z-index: 1050; 
            transition: transform 0.3s ease; 
            background-color: var(--bs-body-bg);
            display: flex; flex-direction: column;
            padding-bottom: 10px !important;
            /* IMPORTANTE: Permitir que los hijos se vean fuera */
            overflow: visible !important; 
        }
        
        #side-menu-ul {
            flex-grow: 1;
            /* Cambiamos auto por visible para que el flyout no se corte */
            /* Si tienes MUCHOS ítems y necesitas scroll, hay que usar una técnica de portal JS, 
               pero para una cantidad normal, visible funciona */
            overflow-y: visible; 
            min-height: 0;
            padding: 0;
        }

        /* Si el mouse está sobre el ítem o el submenú, lo mantenemos visible (si usas hover) */
        .group-gecko-item:hover .dropdown-menu-gecko.hidden {
            /* Esto es opcional si manejas el toggle por JS, déjalo si quieres soporte hover */
        }

        .gecko-sidebar .nav-link { padding-top: 8px !important; padding-bottom: 8px !important; }
        
        @media (min-width: 769px) { body.with-sidebar { padding-left: 260px !important; } }
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
        [data-bs-theme="dark"] .gecko-search-trigger { background: rgba(30, 30, 30, 0.8); border-color: #444; color: #ccc; }
        [data-bs-theme="dark"] .gecko-search-trigger:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
        [data-bs-theme="dark"] .gecko-search-trigger .kbd-shortcut { background: rgba(255,255,255,0.1); border-color: #555; color: #aaa; }
        [data-bs-theme="dark"] .gecko-omni-box { background: #1e1e1e; border: 1px solid #444; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
        [data-bs-theme="dark"] .gecko-omni-header { border-bottom-color: #333; background: #1e1e1e; }
        [data-bs-theme="dark"] #gecko-omni-input { color: #fff; }
        [data-bs-theme="dark"] .gecko-omni-results { background: #1e1e1e; }
        [data-bs-theme="dark"] .omni-item { border-color: #2a2a2a; color: #ddd; }
        [data-bs-theme="dark"] .omni-item:hover { background: #2a2a2a; }
        [data-bs-theme="dark"] .omni-meta { background: #333; color: #aaa; }
        [data-bs-theme="dark"] .hotkey-item { background: #252525; border-color: #333; }
        [data-bs-theme="dark"] .hotkey-desc { color: #ccc; }
        [data-bs-theme="dark"] .hotkey-keys kbd { background: #555; }
    `;
}