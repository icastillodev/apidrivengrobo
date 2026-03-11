import { getUserDisplayText, getCorrectPath } from './MenuConfig.js';

const getBasePath = () => (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/';

function getDashboardPath() {
    const roleId = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel') || '0');
    return (roleId === 1 || roleId === 2 || roleId === 4) ? getCorrectPath('admin/dashboard') : getCorrectPath('panel/dashboard');
}

function getInstLogoUrl() {
    const logo = localStorage.getItem('instLogo') || '';
    if (!logo || logo.trim() === '') return '';
    return logo.includes('http') ? logo : `${getBasePath()}dist/multimedia/imagenes/logos/${logo}`;
}

function renderOmniComponents(mode) {
    const existing = document.getElementById('gecko-search-trigger');
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const assetPath = isLocal ? '/URBE-API-DRIVEN/front/' : '/';
    if(existing) existing.remove();

    const trigger = document.createElement('div');
    trigger.id = 'gecko-search-trigger';
    // 🚀 Quitamos el d-none para que se vea siempre (Móvil y PC)
    trigger.className = `gecko-search-trigger d-flex ${mode === 'top' ? 'static' : 'floating'}`; 
    trigger.onclick = () => window.GeckoSearch.open();
    
    // 🚀 Cambiamos el texto ALT G por una flechita de deslizar hacia abajo en pantallas menores a 1250px
    trigger.innerHTML = `
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <span class="placeholder-text">Buscar o Diga "Gecko"...</span>
        <span class="kbd-shortcut d-none d-xl-block">ALT G</span>
        <span class="kbd-shortcut d-xl-none bg-transparent border-0 text-success px-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
        </span>
    `;
    
    if (mode === 'top') {
        const navContainer = document.getElementById('gecko-nav-container-desktop');
        if (navContainer) navContainer.appendChild(trigger);
    } else {
        document.body.appendChild(trigger);
    }

    if (!document.getElementById('gecko-omni-overlay')) {
        const modal = document.createElement('div');
        modal.id = 'gecko-omni-overlay';
        modal.innerHTML = `
            <div class="gecko-omni-box">
                <div class="gecko-omni-header">
                    <img src="${assetPath}dist/multimedia/imagenes/grobo/gecko.png" class="gecko-search-logo" alt="Gecko">
                    <input type="text" id="gecko-omni-input" placeholder="Escribe un comando o di &quot;Gecko&quot; para activar la IA..." autocomplete="off">
                    <button id="gecko-omni-voice-btn" title="Activar Voz">
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M5 3a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0V3z"/>
                            <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/>
                        </svg>
                    </button>
                </div>
                <div id="gecko-omni-results" class="gecko-omni-results">
                    <div class="gecko-omni-empty"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.onclick = (e) => {
            if (e.target === modal) window.GeckoSearch.close();
        };
    }
}

export function renderSideMenuStructure(container, menuIds, templates) {
    document.body.classList.add('with-sidebar');
    const instName = localStorage.getItem('NombreInst') || 'INSTITUCIÓN';
    const userText = getUserDisplayText();
    const logoUrl = getInstLogoUrl();
    const dashboardPath = getDashboardPath();

    const sidebar = document.createElement('aside');
    sidebar.id = "gecko-sidebar-element";
    sidebar.className = "gecko-sidebar shadow-sm";
    
    const dashboardLabel = window.txt?.menu?.panel_inicio || 'Dashboard';
    const brandBlock = logoUrl
        ? `<a href="${dashboardPath}" class="d-flex flex-column text-decoration-none" title="${window.txt?.menu?.ir_dashboard || 'Ir al inicio'}" aria-label="${window.txt?.menu?.ir_dashboard || 'Ir al inicio'}">
                <div class="d-flex align-items-center">
                    <img src="${logoUrl}" alt="${instName}" class="gecko-sidebar-logo gecko-sidebar-logo-mobile" style="max-height: 48px; width: auto; object-fit: contain;">
                </div>
                <span class="text-success fw-black text-uppercase mt-1" style="font-size: 13px;">${instName}</span>
                <span class="text-success fw-bold mt-1" style="font-size: 11px;">— ${dashboardLabel}</span>
                <span class="text-muted mt-2" style="font-size: 11px; font-weight: 600;">${userText}</span>
           </a>`
        : `<a href="${dashboardPath}" class="d-flex flex-column pe-2 text-decoration-none text-body" style="line-height: 1.2; word-break: break-word;" title="${window.txt?.menu?.ir_dashboard || 'Ir al inicio'}" aria-label="${window.txt?.menu?.ir_dashboard || 'Ir al inicio'}"><span class="fs-5 fw-black text-success text-uppercase lh-1">${instName}</span><span class="text-success fw-bold mt-1" style="font-size: 11px;">— ${dashboardLabel}</span><span class="text-muted mt-2" style="font-size: 11px; font-weight: 600;">${userText}</span></a>`;
    
    sidebar.innerHTML = `
        <div class="gecko-sidebar-top-section">
            <div class="d-flex justify-content-between align-items-start w-100">
                <div class="d-flex flex-column pe-2 flex-grow-1">
                    ${brandBlock}
                </div>
                <button class="btn-close mt-1 gecko-btn-close" id="gecko-close-sidebar"></button>
            </div>
            <hr class="my-3 opacity-25 w-100">
        </div>
        
        <div class="gecko-sidebar-scroll-area">
            <ul class="nav nav-pills flex-column gap-1 px-2 mb-3" id="side-menu-ul"></ul>
        </div>
        
        <div class="gecko-sidebar-bottom-section text-center d-flex flex-column pt-4 pb-4">
            <div class="px-2 order-2 order-md-1 mt-4 mt-md-0 mb-md-3">
                <a href="https://groboapp.com" target="_blank" class="text-decoration-none text-success fw-bold d-block mb-1" style="font-size: 10px; opacity: 0.9;">GROBO - ERP BIOTERIOS</a>
                <a href="https://geckos.uy" target="_blank" class="text-decoration-none text-muted d-block geckos-link" style="font-size: 9px; line-height: 1.4;">${window.txt?.login?.desarrollado_por_geckos || 'Desarrollado por Geckos.uy & UDELAR - Unidad de Reactivos y Biomodelos de Experimentación'}</a>
            </div>
            <ul class="nav nav-pills d-flex flex-row justify-content-center align-items-center w-100 m-0 p-0 order-1 order-md-2" id="side-controls-ul"></ul>
        </div>
    `;

    document.body.prepend(sidebar);
    
    const mobileToggle = document.createElement('button');
    mobileToggle.id = "gecko-mobile-toggle";
    // 🚀 QUITAMOS d-md-none para que no desaparezca en 768px
    mobileToggle.className = "btn btn-success position-fixed z-3 shadow";
    mobileToggle.innerHTML = '<svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg>';
    mobileToggle.onclick = (e) => { e.stopPropagation(); sidebar.classList.add('open'); };
    document.body.prepend(mobileToggle);

    const ul = document.getElementById('side-menu-ul');
    // Acceso rápido al Dashboard (además del logo)
    ul.insertAdjacentHTML('beforeend', `
        <li class="nav-item">
            <a href="${dashboardPath}" class="nav-link d-flex align-items-center gap-2">
                <span class="menu-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
                </span>
                <span class="menu-text">${window.txt?.menu?.panel_inicio || 'Panel de inicio'}</span>
            </a>
        </li>
    `);
    menuIds.forEach(id => { ul.insertAdjacentHTML('beforeend', buildMenuItemHTML(id, 'side', templates)); });
    
    const controlsUl = document.getElementById('side-controls-ul');
    controlsUl.insertAdjacentHTML('beforeend', buildControlsHTML('side'));

    renderOmniComponents('side');
}

export function renderTopMenuStructure(container, menuIds, templates) {
    document.body.classList.remove('with-sidebar');
    const instName = localStorage.getItem('NombreInst') || 'INSTITUCIÓN';
    const userText = getUserDisplayText();
    const logoUrl = getInstLogoUrl();
    const dashboardPath = getDashboardPath();

    const dashboardLabel = window.txt?.menu?.panel_inicio || 'Dashboard';
    const topBrandBlock = `
        <a href="${dashboardPath}" class="d-flex align-items-center gap-2 text-decoration-none text-body" title="${window.txt?.menu?.ir_dashboard || 'Ir al inicio'}">
            ${logoUrl ? `<img src="${logoUrl}" alt="${instName}" class="gecko-top-logo gecko-top-logo-mobile" style="max-height: 36px; width: auto; object-fit: contain;">` : ''}
            <span class="text-secondary fw-black text-uppercase border-start border-secondary ps-2 ms-1">${instName}</span>
            <span class="text-success fw-bold ms-1">— ${dashboardLabel}</span>
        </a>
        <span class="text-muted fw-bold ms-2 d-none d-lg-inline border-start border-secondary ps-2" style="font-size: 11px;">${userText}</span>`;

    const header = document.createElement('header');
    header.className = "w-full gecko-header gecko-header-top bg-transparent mb-2"; 
    header.innerHTML = `
        <div class="container-fluid pt-2 pb-1">
            <div class="gecko-top-bar-info justify-content-between align-items-center w-100 px-md-5 mb-2" style="font-size: 11px;">
                <div class="d-flex align-items-center gap-3 flex-wrap">
                    <a href="https://groboapp.com" target="_blank" class="text-decoration-none text-success fw-bold">GROBO - ERP BIOTERIOS</a>
                    <div class="d-flex align-items-center border-start border-secondary ps-3">${topBrandBlock}</div>
                </div>
                <a href="https://geckos.uy" target="_blank" class="text-decoration-none text-dark border-bottom border-success fw-bold geckos-link text-end">${window.txt?.login?.desarrollado_por_geckos || 'Geckos.uy & UDELAR - Unidad de Reactivos y Biomodelos de Experimentación'}</a>
            </div>

            <nav class="w-full d-flex flex-column align-items-center position-relative">
                <div id="gecko-nav-container-desktop" class="d-flex flex-column align-items-center gap-2 position-relative w-100">
                    <button id="gecko-mobile-toggle-top" class="btn btn-link text-success position-absolute start-0 ms-1" style="top:0;">
                        <svg width="28" height="28" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg>
                    </button>
                    <ul id="main-menu-ul" class="nav border-success bg-body p-1 shadow-sm align-items-center gap-1 custom-menu-pill"></ul>
                </div>
            </nav>
        </div>

        <aside id="gecko-sidebar-element" class="gecko-sidebar d-md-none shadow-sm">
            <div class="gecko-sidebar-top-section">
                <div class="d-flex justify-content-between align-items-start w-100">
                    <div class="d-flex flex-column pe-2 flex-grow-1">
                        ${logoUrl ? `<a href="${dashboardPath}" class="d-flex align-items-center text-decoration-none" title="${window.txt?.menu?.ir_dashboard || 'Ir al inicio'}"><img src="${logoUrl}" alt="${instName}" class="gecko-sidebar-logo gecko-sidebar-logo-mobile" style="max-height: 56px; width: auto; object-fit: contain;"></a>` : ''}
                        <span class="fs-5 fw-black text-success text-uppercase lh-1 mt-1">${instName}</span>
                        <span class="text-success fw-bold mt-1" style="font-size: 11px;">— ${dashboardLabel}</span>
                        <span class="text-muted mt-2 d-block" style="font-size: 11px; font-weight: 600;">${userText}</span>
                    </div>
                    <button class="btn-close mt-1 gecko-btn-close" id="gecko-close-sidebar"></button>
                </div>
                <hr class="my-3 opacity-25 w-100">
            </div>
            
            <div class="gecko-sidebar-scroll-area">
                <ul class="nav flex-column px-2 mb-3" id="mobile-menu-ul"></ul>
            </div>
            
            <div class="gecko-sidebar-bottom-section text-center d-flex flex-column pt-4 pb-4">
                <ul class="nav nav-pills d-flex flex-row justify-content-center align-items-center w-100 mb-4 p-0" id="mobile-controls-ul"></ul>
                <div class="px-2 mt-2">
                    <a href="https://groboapp.com" target="_blank" class="text-decoration-none text-success fw-bold d-block mb-1" style="font-size: 10px; opacity: 0.9;">GROBO - ERP BIOTERIOS</a>
                    <a href="https://geckos.uy" target="_blank" class="text-decoration-none text-muted d-block geckos-link" style="font-size: 9px; line-height: 1.4;">${window.txt?.login?.desarrollado_por_geckos || 'Desarrollado por Geckos.uy & UDELAR - Unidad de Reactivos y Biomodelos de Experimentación'}</a>
                </div>
            </div>
        </aside>
    `;
    
    document.body.prepend(header);

    const ulDesktop = document.getElementById('main-menu-ul');
    const ulMobile = document.getElementById('mobile-menu-ul');
    const mobileControls = document.getElementById('mobile-controls-ul');

    // Acceso rápido al Dashboard en menú móvil lateral
    ulMobile.insertAdjacentHTML('beforeend', `
        <li class="nav-item">
            <a href="${dashboardPath}" class="nav-link d-flex align-items-center gap-2">
                <span class="menu-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
                </span>
                <span class="menu-text">${window.txt?.menu?.panel_inicio || 'Panel de inicio'}</span>
            </a>
        </li>
    `);
    
    menuIds.forEach(id => {
        ulDesktop.insertAdjacentHTML('beforeend', buildMenuItemHTML(id, 'top', templates));
        ulMobile.insertAdjacentHTML('beforeend', buildMenuItemHTML(id, 'side', templates));
    });
    
    ulDesktop.insertAdjacentHTML('beforeend', buildControlsHTML('top'));
    mobileControls.insertAdjacentHTML('beforeend', buildControlsHTML('side'));

    renderOmniComponents('top');
}
// AQUÍ ESTÁ LA LÓGICA DEL "ACTIVO", LA LÍNEA VERDE Y LA ESTRUCTURA DEL DROPDOWN
function buildMenuItemHTML(id, layout, templates) {
    const item = templates[id]; 
    if (!item) return '';
    const path = item.path ? getCorrectPath(item.path) : '#';
    const isSide = layout === 'side';
    
    // Detectamos si la URL actual coincide con el enlace para pintarlo de verde
    const currentPath = window.location.pathname;
    const isActive = (item.path !== '#' && currentPath.includes(item.path));
    
    const liClass = isSide ? 'nav-item mb-1 w-100 position-relative group-gecko-item' : 'nav-item position-relative';
    
    // Clases base para enlaces normales
    const linkClass = isSide 
        ? `nav-link d-flex align-items-center text-body gap-3 px-3 py-2 rounded-2 ${isActive ? 'active-gecko-link' : ''}` 
        : `gecko-nav-link d-flex flex-column align-items-center text-decoration-none px-3 py-2 text-body ${isActive ? 'active-gecko-link' : ''}`;
    
    const iconHTML = `<div class="menu-icon position-relative d-flex justify-content-center" data-menu-id="${id}" style="width: 24px;">${item.svg}<div class="notif-dot bg-danger text-white position-absolute" id="badge-${id}" style="display:none;"></div></div>`;
    // Div extra al label para anclar la barrita verde en el medio
    const labelHTML = `<div class="position-relative d-inline-block"><span class="${isSide ? 'small' : 'menu-label mt-1'}" style="font-weight: 600;">${item.label}</span></div>`;

    if (item.isDropdown && item.children) {
        // Auto-abrir o marcar si uno de sus hijos es la página actual
        const isChildActive = item.children.some(c => currentPath.includes(c.path));
        const activeDropClass = isChildActive ? 'active-gecko-link' : ''; 
        const arrowIcon = `<svg class="ms-1 arrow-icon-gecko" width="12" height="12" viewBox="0 0 16 16" style="fill: currentColor; transition: transform 0.3s ease; flex-shrink: 0;"><path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>`;
        
        const childrenHTML = item.children.map(child => {
            const isSubActive = currentPath.includes(child.path);
            const childIcon = (child.svg) ? `<span class="dropdown-child-icon me-2 d-flex align-items-center" style="width: 18px; height: 18px;">${child.svg}</span>` : '';
            return `<li><a href="${getCorrectPath(child.path)}" class="dropdown-item-gecko d-flex align-items-center px-3 py-2 text-decoration-none text-body small ${isSubActive ? 'active-sub-link text-success fw-bold' : ''}" style="font-weight: 600;">${childIcon}${child.label}</a></li>`;
        }).join('');

        // 🚀 LA MAGIA ESTÁ AQUÍ: Construimos distinto si es Lateral o Superior
        let dropLinkClass, dropInner;
        
        if (isSide) {
            // Diseño Menú Lateral: Horizontal, Icono -> Texto -> Flecha centrada al final
            dropLinkClass = `nav-link d-flex align-items-center text-body gap-3 px-3 py-2 rounded-2 dropdown-toggle-gecko justify-content-between ${activeDropClass}`;
            dropInner = `<div class="d-flex align-items-center gap-2">${iconHTML} ${labelHTML}</div> <div class="d-flex align-items-center">${arrowIcon}</div>`;
        } else {
            // Menú Superior: Icono arriba, texto y flecha centrados abajo
            dropLinkClass = `gecko-nav-link d-flex flex-column align-items-center text-decoration-none px-3 py-2 text-body dropdown-toggle-gecko ${activeDropClass}`;
            dropInner = `${iconHTML} <div class="d-flex align-items-center justify-content-center gap-1">${labelHTML} ${arrowIcon}</div>`;
        }

        return `
        <li class="${liClass}">
            <a href="javascript:void(0);" class="${dropLinkClass}">
                ${dropInner}
            </a>
            <ul class="dropdown-menu-gecko list-unstyled hidden">
                ${childrenHTML}
            </ul>
        </li>`;
    }
    
    return `<li class="${liClass}"><a href="${path}" class="${linkClass}">${iconHTML} ${labelHTML}</a></li>`;
}
function buildControlsHTML(layout) {
    const isSide = layout === 'side';
    const btnClass = isSide 
        ? "btn btn-outline-secondary d-flex align-items-center justify-content-center border-opacity-25 btn-control-gecko" 
        : "btn btn-link text-decoration-none p-0 me-2 text-body d-flex align-items-center justify-content-center btn-control-gecko";
    const btnStyle = isSide ? 'width: 38px; height: 38px; padding: 0; border-radius: 50%;' : 'width: 32px; height: 32px; padding: 0;';
    const geckoOk = localStorage.getItem('gecko_ok') || '2';
    
    return `<li class="${isSide ? 'd-flex justify-content-center align-items-center gap-2 w-100 flex-row flex-wrap m-0 p-0' : 'nav-item d-flex align-items-center ms-2 ps-2 border-start border-secondary-subtle'}">
        
        <button class="btn-voice-switch ${btnClass} voice-status-${geckoOk}" style="${btnStyle}" title="Gecko Voice">
            <span class="d-flex align-items-center justify-content-center">
                <svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor">
                    <path d="M5 3a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0V3z"/>
                    <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/>
                </svg>
            </span>
        </button>
        
        <button class="btn-font-switch ${btnClass}" style="${btnStyle}" title="Tamaño de letra"></button>
        
        <button class="btn-theme-switch ${btnClass}" style="${btnStyle}" title="Tema"><span class="pref-icon-theme"></span></button>
        
        <div class="position-relative dropdown-container-lang ${!isSide ? 'mx-1' : ''}">
            <button class="dropdown-toggle-lang btn btn-light rounded-circle border shadow-sm p-0 d-flex align-items-center justify-content-center overflow-hidden" style="${isSide ? 'width:38px; height:38px;' : 'width:28px; height:28px;'}">
                <img class="pref-current-flag" src="" style="width: 100%; height: 100%; object-fit: cover;">
            </button>
            <ul class="dropdown-menu-lang hidden shadow p-2 border list-unstyled" style="position: absolute; min-width: 140px; z-index: 9999; ${isSide ? 'bottom: 110%; left: 50%; transform: translateX(-50%); margin-bottom: 10px;' : 'top: 120%; right: 0;'}">
                <li><a href="#" onclick="window.setAppLang('es')" class="d-flex align-items-center px-2 py-2 text-decoration-none text-body small hover-bg-light rounded mb-1"><img src="https://flagcdn.com/w40/es.png" width="20" class="me-2 shadow-sm"> Español</a></li>
                <li><a href="#" onclick="window.setAppLang('en')" class="d-flex align-items-center px-2 py-2 text-decoration-none text-body small hover-bg-light rounded mb-1"><img src="https://flagcdn.com/w40/us.png" width="20" class="me-2 shadow-sm"> English</a></li>
                <li><a href="#" onclick="window.setAppLang('pt')" class="d-flex align-items-center px-2 py-2 text-decoration-none text-body small hover-bg-light rounded"><img src="https://flagcdn.com/w40/br.png" width="20" class="me-2 shadow-sm"> Português</a></li>
            </ul>
        </div>
        
        <button class="btn-hotkeys-help ${btnClass} d-none d-md-flex" style="${btnStyle}" title="Atajos de Teclado">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/></svg>
        </button>

        <button class="btn-layout-switch ${btnClass} d-none d-md-flex" style="${btnStyle}" title="Cambiar Diseño">
            <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor"><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v1h14V2a1 1 0 0 0-1-1H2z"/></svg>
        </button>
    </li>`;
}