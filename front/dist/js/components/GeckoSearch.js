/**
 * GECKO GLOBAL SEARCH ENGINE
 * Soporte para comandos (PDF, QR), roles de usuario y categorización.
 */
import { GeckoI18n } from './GeckoI18n.js';

// Mapa de rutas según el Rol del usuario
const ROUTE_MAP = {
    admin: {
        usuarios: 'admin/usuarios.html',
        protocolos: 'admin/protocolos.html',
        animales: 'admin/animales.html',
        insumos: 'admin/insumos.html',
        alojamientos: 'admin/alojamientos.html',
        reservas: 'construccion.html'
    },
    user: {
        usuarios: 'usuario/perfil.html', // El usuario solo se ve a sí mismo
        protocolos: 'usuario/misprotocolos.html',
        animales: 'usuario/misalojamientos.html', // Contexto de animales en sus alojamientos
        insumos: 'usuario/misformularios.html', // Contexto de pedidos
        alojamientos: 'usuario/misalojamientos.html',
        reservas: 'usuario/construccion.html'
    }
};

export async function executeGlobalSearch(type) {
    const input = document.getElementById(`input-search-${type}`);
    const resultsBox = document.getElementById(`search-results-${type}`);
    const query = input.value.trim();
    const instId = localStorage.getItem('instId');
    const userId = localStorage.getItem('userId');
    const userLevel = parseInt(localStorage.getItem('userLevel')) || 3; // Default 3 (Usuario)

    // Determinar si es Admin (Roles 1, 2, 4, 5, 6) o Usuario (3)
    const isAdmin = [1, 2, 4, 5, 6].includes(userLevel);
    const routes = isAdmin ? ROUTE_MAP.admin : ROUTE_MAP.user;

    // --- 1. PROCESADOR DE COMANDOS DIRECTOS (PDF, QR) ---
    // Detecta patrones como "pdf 20" o "qr 105"
    const cmdMatch = query.match(/^(pdf|qr)\s+(\d+)$/i);
    
    if (cmdMatch) {
        const action = cmdMatch[1].toLowerCase();
        const id = cmdMatch[2];
        
        if (action === 'qr') {
            // Acción directa QR: Simula ir a la vista de QR de alojamiento
            // Nota: Aquí podrías abrir un modal directo si tuvieras la función global
            window.location.href = getPath(routes.alojamientos) + `?action=qr&id=${id}`;
            return;
        }
        
        if (action === 'pdf') {
            // Acción directa PDF: Asumimos Protocolo por defecto (o podrías preguntar)
            window.location.href = getPath(routes.protocolos) + `?action=pdf&id=${id}`;
            return;
        }
    }

    // Validación mínima de longitud
    if (query.length < 2) {
        resultsBox.innerHTML = '';
        return;
    }

    // Spinner de carga
    resultsBox.innerHTML = `
        <div class="p-3 text-center">
            <div class="spinner-border spinner-border-sm text-success"></div> 
            <span class="small text-muted ms-2 fst-italic">${GeckoI18n.get('loading')}</span>
        </div>`;

    try {
        // --- 2. PETICIÓN A LA BASE DE DATOS ---
        const response = await fetch(`/URBE-API-DRIVEN/api/search/global?q=${encodeURIComponent(query)}&inst=${instId}&role=${userLevel}&uid=${userId}`);
        const res = await response.json();

        if (res.status === "success") {
            let html = '';
            const d = res.data;
            let hasResults = false;

            // --- SECCIÓN: PROTOCOLOS ---
            // Admin ve todos, Usuario solo los suyos (filtrado por backend)
            if (d.protocolos?.length > 0) {
                hasResults = true;
                html += renderSectionHeader(GeckoI18n.get('labels.protocols'), 'book');
                d.protocolos.forEach(p => {
                    // Si el usuario escribió "pdf" en la búsqueda textual
                    const isPdfSearch = query.toLowerCase().includes('pdf');
                    const link = getPath(routes.protocolos) + `?id=${p.idprotA}${isPdfSearch ? '&action=pdf' : ''}`;
                    
                    html += `
                        <a href="${link}" class="search-result-item d-flex justify-content-between align-items-center">
                            <div>
                                <span class="fw-bold text-success">#${p.nprotA}</span>
                                <span class="d-block text-truncate" style="max-width: 220px;">${p.tituloA}</span>
                            </div>
                            ${isPdfSearch ? '<span class="badge bg-danger">PDF</span>' : '<small class="text-muted">Ver</small>'}
                        </a>`;
                });
            }

            // --- SECCIÓN: ALOJAMIENTOS / CAJAS ---
            if (d.alojamientos?.length > 0) {
                hasResults = true;
                html += renderSectionHeader(GeckoI18n.get('labels.housing'), 'box');
                d.alojamientos.forEach(a => {
                    const isQrSearch = query.toLowerCase().includes('qr');
                    const link = getPath(routes.alojamientos) + `?historia=${a.historia}${isQrSearch ? '&action=qr' : ''}`;

                    html += `
                        <a href="${link}" class="search-result-item d-flex justify-content-between align-items-center">
                            <div>
                                <span class="fw-bold">ID: ${a.historia}</span>
                                <small class="d-block text-muted">Prot: ${a.idprotA}</small>
                            </div>
                            ${isQrSearch ? '<span class="badge bg-dark text-white">QR</span>' : ''}
                        </a>`;
                });
            }

            // --- SECCIÓN: USUARIOS (Solo Admin) ---
            if (isAdmin && d.usuarios?.length > 0) {
                hasResults = true;
                html += renderSectionHeader(GeckoI18n.get('labels.users'), 'user');
                d.usuarios.forEach(u => {
                    html += `
                        <a href="${getPath(routes.usuarios)}?id=${u.IdUsrA}" class="search-result-item">
                            <div class="fw-bold">${u.ApellidoA}, ${u.NombreA}</div>
                            <small class="text-muted">${u.EmailA}</small>
                        </a>`;
                });
            }

            // --- SECCIÓN: INSUMOS / REACTIVOS ---
            if (d.insumos?.length > 0) {
                hasResults = true;
                html += renderSectionHeader(GeckoI18n.get('labels.supplies'), 'flask');
                d.insumos.forEach(i => {
                    // Determinar si va a insumos o reactivos según tipo (ejemplo lógico)
                    const target = i.TipoInsumo === 'Reactivo' ? routes.reactivos : routes.insumos;
                    
                    html += `
                        <a href="${getPath(target)}?id=${i.idInsumo}" class="search-result-item d-flex justify-content-between">
                            <span>${i.NombreInsumo}</span>
                            <span class="badge bg-light text-dark border">Stock: ${i.CantidadInsumo}</span>
                        </a>`;
                });
            }

            resultsBox.innerHTML = hasResults ? html : `<div class="p-3 text-muted small text-center">${GeckoI18n.get('no_results')}</div>`;
        } else {
            resultsBox.innerHTML = `<div class="p-3 text-muted small text-center">${GeckoI18n.get('no_results')}</div>`;
        }
    } catch (e) {
        console.error(e); // Solo para dev
        resultsBox.innerHTML = `<div class="p-3 text-danger small text-center">${GeckoI18n.get('error_net')}</div>`;
    }
}

// --- HELPERS ---

function getPath(p) {
    const idx = window.location.pathname.indexOf('/paginas/');
    return idx !== -1 ? window.location.pathname.substring(0, idx + 9) + p : p;
}

function renderSectionHeader(title, icon) {
    // Iconos simples SVG
    const icons = {
        book: `<svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687z"/></svg>`,
        user: `<svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>`,
        box: `<svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5l2.404.961L10.404 2l-2.218-.887zm3.564 1.426L5.596 5 8 5.961 14.154 3.5l-2.404-.961zm3.25 1.7-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923l6.5 2.6zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464L7.443.184z"/></svg>`,
        flask: `<svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M9.366 10.05a.5.5 0 0 1-.571.28A2.5 2.5 0 0 0 6 12a.5.5 0 0 1-1 0 3.5 3.5 0 0 1 3.5-3.5.5.5 0 0 1 .166.012c.31.096.536.425.466.862a.5.5 0 0 1-.766.676zM7.056 12.72a.5.5 0 0 1 .596-.328c.41.088.78.297 1.076.602.25.257.25.674 0 .932-.25.257-.655.257-.905 0-.296-.305-.502-.676-.59-1.086a.5.5 0 0 1 .328-.596z"/><path d="M5.106 2.553a1 1 0 0 1 .324-.707C5.815 1.46 6.52 1 8 1s2.185.46 2.57 .846c.102.102.222.373.324.707.13.425.297.97.513 1.579l.21.603a100 100 0 0 1 .42 1.22c.26 1.03.627 2.56 1.393 4.295.033.076.07.151.11.226.792 1.488 1.455 3.197.636 4.96-.39 1.09-1.282 1.96-2.43 2.375a7.99 7.99 0 0 1-5.14-.066c-1.127-.432-1.996-1.323-2.366-2.417-.79-1.72-1.15-3.33-1.15-4.85 0-1.52.36-3.13 1.15-4.85.025-.055.053-.111.082-.167.766-1.735 1.133-3.265 1.393-4.295.07-.278.21-.685.42-1.22l.21-.603c.216-.609.383-1.154.513-1.579zM8 2c-1.32 0-1.892.385-2.146.64-.092.3-.235.793-.416 1.32l-.21.602c-.255 1.01-.617 2.525-1.373 4.242L3.81 8.87c-.755 1.637-1.11 3.176-1.11 4.63 0 1.252.3 2.553.94 3.32.617.74 1.55 1.18 2.592 1.18h3.536c1.042 0 1.975-.44 2.592-1.18.64-.767.94-2.068.94-3.32 0-1.454-.355-2.993-1.11-4.63l-.045-.097c-.756-1.717-1.118-3.232-1.373-4.242l-.21-.602c-.181-.527-.324-1.02-.416-1.32C10.892 2.385 10.32 2 9 2H8z"/></svg>`
    };

    return `
        <div class="search-section-header d-flex align-items-center gap-2 text-uppercase text-muted fw-bold mt-2 mb-1 border-bottom pb-1" style="font-size: 0.75rem;">
            ${icons[icon] || icons.book} ${title}
        </div>
    `;
}