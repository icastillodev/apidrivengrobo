import { SuperAuth } from '../superAuth.js';

// Catálogo Maestro: IDs ÚNICOS para el SuperAdmin
const MENU_TEMPLATES = {
    124: { label: 'Instituciones', svg: `<svg viewBox="0 0 24 24"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>`, path: 'superadmin/instituciones.html' },
    114: { label: 'Usuarios', svg: `<svg viewBox="0 0 640 512"><path d="M320 16a104 104 0 1 1 0 208a104 104 0 1 1 0-208M96 88a72 72 0 1 1 0 144a72 72 0 1 1 0-144M0 416c0-70.7 57.3-128 128-128c12.8 0 25.2 1.9 36.9 5.4C132 330.2 112 378.8 112 432v16c0 11.4 2.4 22.2 6.7 32H32c-17.7 0-32-14.3-32-32zm521.3 64c4.3-9.8 6.7-20.6 6.7-32v-16c0-53.2-20-101.8-52.9-138.6c11.7-3.5 24.1-5.4 36.9-5.4c70.7 0 128 57.3 128 128v32c0 17.7-14.3 32-32 32zM472 160a72 72 0 1 1 144 0a72 72 0 1 1-144 0M160 432c0-88.4 71.6-160 160-160s160 71.6 160 160v16c0 17.7-14.3 32-32 32H192c-17.7 0-32-14.3-32-32z"/></svg>`, path: 'superadmin/usuarios_global.html' },
    301: { label: 'Historial', svg: `<svg viewBox="0 0 24 24"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>`, path: 'superadmin/historial.html' },
    401: { label: 'OTRO', svg: `<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-1 11h-5v5h-2v-5H6v-2h5V7h2v5h5v2z"/></svg>`, path: 'otros.html' },
    501: { 
        label: 'Perfil', 
        svg: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08s5.97 1.09 6 3.08c-1.29 1.94-3.5 3.22-6 3.22z"/></svg>`,
        isDropdown: true,
        children: [
            { label: 'Configurar', path: 'admin/perfil.html' },
            { label: 'Salir', path: 'logout' }
        ]
    }
};

/**
 * INICIALIZACIÓN DEL MENÚ MAESTRO
 */
export async function initSuperMenu() {
    const roleId = parseInt(localStorage.getItem('userLevel')); 
    if (isNaN(roleId) || roleId !== 1) return; // Solo SuperAdmin puede usar este componente

    const header = document.createElement('header');
    header.className = "w-full";
    header.innerHTML = `<nav class="w-full d-flex justify-content-center align-items-center position-relative">
            <ul id="main-menu" class="nav border border-top-0 border-2 border-success bg-white p-1 rounded-bottom shadow-sm mt-0"></ul>
        </nav>`;
    document.body.prepend(header);
    const menuList = document.getElementById('main-menu');

    // BYPASS GECKO 2026: No consultamos a la API. Renderizamos todo el catálogo maestro.
    Object.keys(MENU_TEMPLATES).forEach(id => {
        renderItem(menuList, id);
    });

    setupDropdownLogic();
    console.log("Gecko Devs: SuperMenu renderizado localmente para SuperAdmin.");
}

function getCorrectPath(rawPath) {
    if (rawPath === 'logout') return 'javascript:SuperAuth.logout();';

    const currentPath = window.location.pathname;
    const paginasIndex = currentPath.indexOf('/paginas/');
    if (paginasIndex !== -1) {
        const basePath = currentPath.substring(0, paginasIndex + 9);
        return basePath + rawPath;
    }
    return rawPath;
}

function renderItem(container, id) {
    const item = MENU_TEMPLATES[id];
    if (!item) return;

    if (item.isDropdown) {
        const childrenHTML = item.children.map(child => `
            <li role="none">
                <a role="menuitem" href="${getCorrectPath(child.path)}" class="dropdown-item-gecko block px-3 py-2 rounded-lg text-sm text-decoration-none">
                    ${child.label}
                </a>
            </li>
        `).join('');

        container.innerHTML += `
            <li class="nav-item position-relative dropdown-container-gecko">
                <button type="button" class="dropdown-toggle-gecko gecko-nav-link d-flex flex-column align-items-center border-0 bg-transparent px-3 py-2">
                    <div class="menu-icon mb-1">${item.svg}</div>
                    <span class="menu-label d-flex align-items-center">
                        ${item.label}
                        <svg class="ms-1" width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.24 4.5a.75.75 0 0 1-1.08 0l-4.24-4.5a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd"/></svg>
                    </span>
                </button>
                <ul class="dropdown-menu-gecko hidden shadow-lg p-2 border list-unstyled">
                    ${childrenHTML}
                </ul>
            </li>`;
    } else {
        container.innerHTML += `
            <li class="nav-item position-relative">
                <a href="${getCorrectPath(item.path)}" class="gecko-nav-link d-flex flex-column align-items-center text-decoration-none px-3 py-2">
                    <div class="menu-icon mb-1">${item.svg}</div>
                    <span class="menu-label">${item.label}</span>
                </a>
            </li>`;
    }
}

function setupDropdownLogic() {
    window.SuperAuth = SuperAuth;
    
    document.querySelectorAll('.dropdown-toggle-gecko').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const menu = btn.nextElementSibling;
            const isHidden = menu.classList.contains('hidden');
            document.querySelectorAll('.dropdown-menu-gecko').forEach(m => m.classList.add('hidden'));
            if (isHidden) menu.classList.remove('hidden');
        };
    });
    document.onclick = () => document.querySelectorAll('.dropdown-menu-gecko').forEach(m => m.classList.add('hidden'));
}

const style = document.createElement('style');
style.innerHTML = `
    .gecko-nav-link { color: #555 !important; transition: all 0.2s; border-radius: 12px; min-width: 95px; cursor: pointer; }
    .gecko-nav-link:hover { background-color: #1a5d3b !important; color: #fff !important; }
    .gecko-nav-link:hover svg { fill: #fff !important; }
    .menu-icon svg { width: 32px; height: 32px; fill: #404040; transition: fill 0.2s; }
    .menu-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
    .dropdown-menu-gecko { position: absolute; top: 100%; left: 50%; transform: translateX(-50%); min-width: 180px; background: #fff; z-index: 1000; border-radius: 12px; margin-top: 10px; }
    .dropdown-menu-gecko.hidden { display: none; }
    .dropdown-item-gecko { color: #404040; transition: 0.2s; font-weight: 600; }
    .dropdown-item-gecko:hover { background-color: #1a5d3b; color: #fff !important; }
`;
document.head.appendChild(style);