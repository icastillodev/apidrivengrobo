import { getUserDisplayText, getCorrectPath } from './MenuConfig.js';

function renderOmniComponents(mode) {
    const existing = document.getElementById('gecko-search-trigger');
    if(existing) existing.remove();

    const trigger = document.createElement('div');
    trigger.id = 'gecko-search-trigger';
    trigger.className = `gecko-search-trigger d-none d-md-flex ${mode === 'top' ? 'static' : 'floating'}`; 
    trigger.onclick = () => window.GeckoSearch.open();
    trigger.innerHTML = `
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <span class="placeholder-text">Buscar o Diga "Gecko"...</span>
        <span class="kbd-shortcut">ALT G</span>
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
                    <svg class="search-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm-5.5 3a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zm11 0a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM3.5 11.5a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zm17 0a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM12 11c3 1.5 4 4.5 4 8s-1.5 5-4 5-4-1.5-4-5 1-6.5 4-8z"/></svg>
                    <input type="text" id="gecko-omni-input" placeholder="Escribe un comando o di &quot;Gecko&quot; para activar la IA..." autocomplete="off">
                    <button id="gecko-omni-voice-btn" title="Activar Voz">
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M5 3a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0V3z"/><path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/></svg>
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

    const sidebar = document.createElement('aside');
    sidebar.id = "gecko-sidebar-element";
    sidebar.className = "gecko-sidebar d-flex flex-column flex-shrink-0 p-3 border-end shadow-sm";
    
    // ESTRUCTURA FLEX PARA QUE EL MENÚ OCUPE LO QUE SOBRA
    sidebar.innerHTML = `
        <div class="d-flex flex-column pb-1 flex-shrink-0">
            <div class="d-flex justify-content-between align-items-center w-100">
                <div class="d-flex flex-column" style="overflow: hidden; line-height: 1.1;">
                    <span class="fs-6 fw-black text-success text-uppercase lh-1 text-truncate" title="${instName}">${instName}</span>
                    <span class="text-muted mt-1 text-truncate" style="font-size: 10px; font-weight: 600;" title="${userText}">${userText}</span>
                </div>
                <button class="btn-close d-md-none ms-2" id="gecko-close-sidebar"></button>
            </div>
            <hr class="my-2 opacity-25">
        </div>
        
        <ul class="nav nav-pills flex-column mb-auto gap-1" id="side-menu-ul"></ul>
        
        <div class="mt-auto border-top pt-2 text-center flex-shrink-0">
            <div class="mb-2 px-2">
                <a href="https://groboapp.com" target="_blank" class="text-decoration-none text-success fw-bold d-block mb-1" style="font-size: 9px; opacity: 0.8;">GROBO - ERP BIOTERIOS</a>
                <a href="https://geckos.uy" target="_blank" class="text-decoration-none text-muted d-block geckos-link" style="font-size: 9px;">
                    Gekos.uy & UDELAR
                </a>
            </div>
            <ul class="nav nav-pills flex-column" id="side-controls-ul"></ul>
        </div>
    `;

    document.body.prepend(sidebar);
    
    // ... resto del renderSideMenu igual (mobile toggle, loops) ...
    const mobileToggle = document.createElement('button');
    mobileToggle.id = "gecko-mobile-toggle";
    mobileToggle.className = "btn btn-success position-fixed top-0 start-0 m-2 d-md-none z-3 shadow";
    mobileToggle.innerHTML = '<svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg>';
    mobileToggle.onclick = (e) => {
        e.stopPropagation();
        sidebar.classList.add('open');
    };
    document.body.prepend(mobileToggle);

    const ul = document.getElementById('side-menu-ul');
    menuIds.forEach(id => {
        ul.insertAdjacentHTML('beforeend', buildMenuItemHTML(id, 'side', templates));
    });
    
    const controlsUl = document.getElementById('side-controls-ul');
    controlsUl.insertAdjacentHTML('beforeend', buildControlsHTML('side'));

    renderOmniComponents('side');
}

export function renderTopMenuStructure(container, menuIds, templates) {
    // Igual que tu versión anterior (no cambia lógica, solo estilos importados)
    document.body.classList.remove('with-sidebar');
    const instName = localStorage.getItem('NombreInst') || 'INSTITUCIÓN';
    const userText = getUserDisplayText();

    const header = document.createElement('header');
    header.className = "w-full gecko-header gecko-header-top bg-transparent mb-2"; 
    header.innerHTML = `
        <div class="container-fluid pt-2 pb-1">
            <div class="d-flex justify-content-between align-items-center w-100 px-md-5 mb-2" style="font-size: 11px;">
                <div class="d-flex align-items-center gap-3">
                    <a href="https://groboapp.com" target="_blank" class="text-decoration-none text-success fw-bold">GROBO - ERP BIOTERIOS</a>
                    <div class="d-flex flex-column lh-1 border-start ps-3">
                        <span class="text-secondary fw-black text-uppercase">${instName}</span>
                        <span class="text-muted fw-bold mt-1" style="font-size: 10px;">${userText}</span>
                    </div>
                </div>
                <a href="https://geckos.uy" target="_blank" class="text-decoration-none text-dark border-bottom border-success fw-bold geckos-link text-end">Gekos.uy & UDELAR - Unidad de Reactivos y Biomodelos de Experimentación</a>
            </div>

            <nav class="w-full d-flex flex-column align-items-center position-relative">
                <div id="gecko-nav-container-desktop" class="d-flex flex-column align-items-center gap-2 position-relative w-100">
                    <button id="gecko-mobile-toggle-top" class="btn btn-link text-success d-md-none position-absolute start-0 ms-n4" style="top:0;">
                        <svg width="28" height="28" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg>
                    </button>
                    <ul id="main-menu-ul" class="nav border-success bg-body p-1 shadow-sm align-items-center d-none d-md-flex gap-1 custom-menu-pill"></ul>
                </div>
            </nav>
        </div>
        <aside id="gecko-sidebar-element" class="gecko-sidebar d-md-none bg-body-tertiary">
            <div class="d-flex justify-content-between align-items-center p-3 border-bottom">
                <div class="d-flex flex-column">
                    <span class="fw-bold text-success small text-uppercase">${instName}</span>
                    <span class="text-muted" style="font-size: 9px;">${userText}</span>
                </div>
                <button class="btn-close" id="gecko-close-sidebar"></button>
            </div>
            <ul class="nav flex-column p-3" id="mobile-menu-ul"></ul>
        </aside>
    `;
    
    document.body.prepend(header);
    const ulDesktop = document.getElementById('main-menu-ul');
    const ulMobile = document.getElementById('mobile-menu-ul');
    
    menuIds.forEach(id => {
        ulDesktop.insertAdjacentHTML('beforeend', buildMenuItemHTML(id, 'top', templates));
        ulMobile.insertAdjacentHTML('beforeend', buildMenuItemHTML(id, 'side', templates));
    });
    ulDesktop.insertAdjacentHTML('beforeend', buildControlsHTML('top'));
    ulMobile.insertAdjacentHTML('beforeend', buildControlsHTML('side'));

    renderOmniComponents('top');
}

function buildMenuItemHTML(id, layout, templates) {
    // Igual que antes...
    const item = templates[id]; 
    if (!item) return '';
    const path = item.path ? getCorrectPath(item.path) : '#';
    const isSide = layout === 'side';
    const liClass = isSide ? 'nav-item mb-1 w-100 position-relative' : 'nav-item position-relative';
    const linkClass = isSide 
        ? 'nav-link d-flex align-items-center text-body gap-3 px-3 py-2 rounded-2' 
        : 'gecko-nav-link d-flex flex-column align-items-center text-decoration-none px-3 py-2 text-body';
    
    const iconHTML = `<div class="menu-icon position-relative d-flex justify-content-center" data-menu-id="${id}" style="width: 24px;">
                        ${item.svg}
                        <div class="notif-dot bg-danger text-white position-absolute" id="badge-${id}" style="display:none;"></div>
                      </div>`;
    const labelHTML = `<span class="${isSide ? 'small' : 'menu-label mt-1'}" style="font-weight: 600;">${item.label}</span>`;

    if (item.isDropdown && item.children) {
        const arrowIcon = `<svg class="ms-1" width="10" height="10" viewBox="0 0 16 16" style="fill: currentColor;"><path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>`;
        const childrenHTML = item.children.map(child => `
            <li><a href="${getCorrectPath(child.path)}" class="dropdown-item-gecko d-flex align-items-center px-3 py-2 text-decoration-none text-body small" style="font-weight: 600;">${child.label}</a></li>
        `).join('');
        const ulStyle = isSide ? 'position: static; background: transparent; padding-left: 30px;' : 'position: absolute; top: 100%; left: 50%; transform: translateX(-50%); min-width: 180px;';

        return `
        <li class="${liClass}">
            <a href="javascript:void(0);" class="${linkClass} dropdown-toggle-gecko d-flex ${isSide ? 'align-items-center justify-content-between' : 'flex-column align-items-center'}">
                ${isSide ? `<div class="d-flex align-items-center gap-2">${iconHTML} ${labelHTML}</div> ${arrowIcon}` : `<div>${iconHTML}</div> <div class="d-flex align-items-center">${labelHTML} ${arrowIcon}</div>`}
            </a>
            <ul class="dropdown-menu-gecko hidden list-unstyled border-0 rounded-3 mt-1 shadow" style="${ulStyle}">
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
    
    // Todos los botones juntos
    return `<li class="${isSide ? 'd-flex justify-content-center gap-2 w-100 mt-3 pb-3 flex-wrap flex-shrink-0' : 'nav-item d-flex align-items-center ms-2 ps-2 border-start border-secondary-subtle'}">
        
        <button id="btn-voice-switch" class="${btnClass} voice-status-${geckoOk}" style="${btnStyle}" title="Gecko Voice">
            <span class="d-flex align-items-center justify-content-center"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm-5.5 3a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zm11 0a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM3.5 11.5a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zm17 0a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM12 11c3 1.5 4 4.5 4 8s-1.5 5-4 5-4-1.5-4-5 1-6.5 4-8z"/></svg></span>
        </button>
        
        <button id="btn-font-switch" class="${btnClass}" style="${btnStyle}" title="Tamaño de letra"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 4L5 20h2l2-5h7l2 5h2L12 4zm-3.5 9L12 6.5 15.5 13h-7z"/></svg></button>
        
        <button id="btn-theme-switch" class="${btnClass}" style="${btnStyle}" title="Tema"><span id="pref-icon-theme"></span></button>
        
        <div class="position-relative dropdown-container-gecko ${!isSide ? 'mx-1' : ''}">
            <button class="dropdown-toggle-gecko btn btn-light rounded-circle border shadow-sm p-0 d-flex align-items-center justify-content-center overflow-hidden" style="${isSide ? 'width:38px; height:38px;' : 'width:28px; height:28px;'}">
                <img id="pref-current-flag" src="" style="width: 100%; height: 100%; object-fit: cover;">
            </button>
            <ul class="dropdown-menu-gecko hidden shadow p-2 border list-unstyled" style="position: absolute; min-width: 140px; z-index: 1050; ${isSide ? 'bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 10px;' : 'top: 120%; right: 0;'}">
                <li><a href="#" onclick="window.setAppLang('es')" class="d-flex align-items-center px-2 py-2 text-decoration-none text-body small hover-bg-light rounded mb-1"><img src="https://flagcdn.com/w40/es.png" width="20" class="me-2 shadow-sm"> Español</a></li>
                <li><a href="#" onclick="window.setAppLang('en')" class="d-flex align-items-center px-2 py-2 text-decoration-none text-body small hover-bg-light rounded mb-1"><img src="https://flagcdn.com/w40/us.png" width="20" class="me-2 shadow-sm"> English</a></li>
                <li><a href="#" onclick="window.setAppLang('pt')" class="d-flex align-items-center px-2 py-2 text-decoration-none text-body small hover-bg-light rounded"><img src="https://flagcdn.com/w40/br.png" width="20" class="me-2 shadow-sm"> Português</a></li>
            </ul>
        </div>
        
        <button id="btn-hotkeys-help" class="${btnClass}" style="${btnStyle}" title="Atajos de Teclado">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/></svg>
        </button>

        <button id="btn-layout-switch" class="${btnClass}" style="${btnStyle}" title="Cambiar Diseño">
            <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor"><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v1h14V2a1 1 0 0 0-1-1H2z"/></svg>
        </button>
    </li>`;
}