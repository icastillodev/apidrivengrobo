/**
 * GECKO SEARCH COMPONENT (UI)
 * Versión Final: Genera enlaces con ?id=... y ?action=...
 */
import { GeckoI18n } from './GeckoI18n.js';
import { GeckoSearchEngine } from './GeckoSearchEngine.js';

// --- RUTAS ---
const ROUTE_MAP = {
    admin: {
        usuarios: 'admin/usuarios.html',
        protocolos: 'admin/protocolos.html',
        animales: 'admin/animales.html',
        insumos: 'admin/insumos.html',
        reactivos: 'admin/reactivos.html',
        alojamientos: 'admin/alojamientos.html',
        reservas: 'construccion.html'
    },
    user: {
        usuarios: 'usuario/perfil.html',
        protocolos: 'usuario/misprotocolos.html',
        animales: 'usuario/misalojamientos.html',
        insumos: 'usuario/misformularios.html',
        alojamientos: 'usuario/misalojamientos.html',
        reservas: 'usuario/construccion.html'
    }
};

// --- ICONOS ---
const ICONS = {
    book: `<i class="bi bi-book"></i>`,
    user: `<i class="bi bi-person"></i>`,
    box: `<i class="bi bi-box-seam"></i>`,
    flask: `<i class="bi bi-eyedropper"></i>`,
    file: `<i class="bi bi-file-earmark-text"></i>`
};

export async function executeGlobalSearch(type) {
    const input = document.getElementById(`input-search-${type}`);
    const resultsBox = document.getElementById(`search-results-${type}`);
    
    if (!input || !resultsBox) return;

    // 1. ANALIZAR
    const analysis = GeckoSearchEngine.analyze(input.value);

    // 2. LIMPIEZA INICIAL (Si está vacío, OCULTAR CAJA)
    if (analysis.term.length < 1) { 
        resultsBox.innerHTML = '';
        resultsBox.classList.add('d-none'); // <--- CLAVE: Ocultar visualmente
        return;
    }

    // 3. SPINNER (Mostrar caja)
    resultsBox.classList.remove('d-none'); // <--- CLAVE: Mostrar visualmente
    resultsBox.innerHTML = `<div class="p-3 text-center text-success"><span class="spinner-border spinner-border-sm"></span> Buscando...</div>`;

    try {
        const instId = localStorage.getItem('instId');
        const userId = localStorage.getItem('userId');
        const userLevel = parseInt(localStorage.getItem('userLevel')) || 3;
        const isAdmin = [1, 2, 4, 5, 6].includes(userLevel);
        const routes = isAdmin ? ROUTE_MAP.admin : ROUTE_MAP.user;

        // 4. API
        const params = new URLSearchParams({
            q: analysis.term,
            scope: analysis.scope,
            inst: instId,
            role: userLevel,
            uid: userId
        });

        const response = await fetch(`/URBE-API-DRIVEN/api/search/global?${params.toString()}`);
        if (!response.ok) throw new Error("Error server");
        const res = await response.json();

        if (res.status === "success") {
            const d = res.data;
            let html = '';
            let found = false;

            // --- A. PEDIDOS / FORMULARIOS (Tu caso 4687) ---
            if (d.formularios?.length > 0) {
                found = true;
                html += renderSectionHeader('Pedidos / Formularios', ICONS.file);
                d.formularios.forEach(f => {
                    const url = getPath(routes.insumos) + `?id=${f.idformA}&action=view`; // action=view para disparar modal
                    const solicitante = f.ApellidoA ? `Solic: ${f.ApellidoA}` : '';
                    const estado = `<span class="badge bg-secondary" style="font-size:9px">${f.estado}</span>`;
                    html += renderItem(url, `Pedido #${f.idformA}`, `${f.tipoA} - ${solicitante}`, estado);
                });
            }

            // --- B. PROTOCOLOS ---
            if (d.protocolos?.length > 0) {
                found = true;
                html += renderSectionHeader('Protocolos', ICONS.book);
                d.protocolos.forEach(p => {
                    const isPdf = analysis.term.toLowerCase().includes('pdf');
                    // Si es PDF, action=pdf, si no action=edit (para abrir modal)
                    const action = isPdf ? 'pdf' : 'edit';
                    const url = getPath(routes.protocolos) + `?id=${p.idprotA}&action=${action}`;
                    const inv = p.ApellidoA ? `Inv: ${p.ApellidoA}` : '';
                    html += renderItem(url, `#${p.nprotA}`, `${p.tituloA} ${inv}`, isPdf?'<span class="badge bg-danger">PDF</span>':'');
                });
            }

            // --- C. ALOJAMIENTOS ---
            if (d.alojamientos?.length > 0) {
                found = true;
                html += renderSectionHeader('Alojamientos', ICONS.box);
                d.alojamientos.forEach(a => {
                    const isQr = analysis.term.toLowerCase().includes('qr');
                    const action = isQr ? 'qr' : 'view';
                    const url = getPath(routes.alojamientos) + `?historia=${a.historia}&action=${action}`; // Usamos 'historia' o 'id' segun tu lógica
                    const info = `Prot: ${a.nprotA||a.idprotA} ${a.ApellidoA ? '('+a.ApellidoA+')' : ''}`;
                    html += renderItem(url, `Historia: ${a.historia}`, info, isQr?'<span class="badge bg-dark">QR</span>':'');
                });
            }

            // --- D. USUARIOS ---
            if (isAdmin && d.usuarios?.length > 0) {
                found = true;
                html += renderSectionHeader('Usuarios', ICONS.user);
                d.usuarios.forEach(u => {
                    const url = `${getPath(routes.usuarios)}?id=${u.IdUsrA}&action=edit`;
                    html += renderItem(url, `${u.ApellidoA}, ${u.NombreA}`, u.EmailA);
                });
            }

            // --- E. INSUMOS STOCK ---
            if (d.insumos?.length > 0) {
                found = true;
                html += renderSectionHeader('Catálogo', ICONS.flask);
                d.insumos.forEach(i => {
                    const url = getPath(routes.insumos) + `?id=${i.idInsumo}&action=stock`; 
                    html += renderItem(url, i.NombreInsumo, `Stock: ${i.CantidadInsumo}`);
                });
            }

            resultsBox.innerHTML = found ? html : `<div class="p-3 text-muted small text-center fst-italic">No se encontraron coincidencias.</div>`;
        } else {
            resultsBox.innerHTML = `<div class="p-3 text-muted small text-center">Sin resultados</div>`;
        }

    } catch (e) {
        console.error(e);
        resultsBox.innerHTML = `<div class="p-2 text-danger small text-center">Error conexión</div>`;
    }
}

// --- HELPERS ---
function executeCommand(analysis) {
    // Redirigir a pagina correspondiente con action
    // Implementar si usas comandos directos
}

function getPath(p) {
    const idx = window.location.pathname.indexOf('/paginas/');
    if (idx !== -1) return window.location.pathname.substring(0, idx + 9) + p;
    return `/URBE-API-DRIVEN/front/paginas/${p}`;
}

function renderSectionHeader(title, icon) {
    return `<div class="d-flex align-items-center gap-2 text-uppercase text-muted fw-bold mt-2 mb-1 border-bottom pb-1 mx-2" style="font-size: 0.75rem;">${icon} ${title}</div>`;
}

function renderItem(url, title, subtitle, badge = '') {
    return `
        <a href="${url}" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center border-0 px-3 py-2">
            <div style="overflow: hidden;">
                <div class="fw-bold text-dark text-truncate" style="max-width: 230px;">${title}</div>
                <small class="d-block text-muted text-truncate" style="max-width: 230px;">${subtitle}</small>
            </div>
            <div class="ms-2">${badge}</div>
        </a>`;
}

export function initGlobalSearchUI() {
    const ids = ['search-results-top', 'search-results-side']; // IDs posibles
    ids.forEach(id => {
        const box = document.getElementById(id);
        if(box) {
            box.innerHTML = '';         // Vaciar contenido fantasma
            box.classList.add('d-none'); // Forzar ocultamiento Bootstrap
            box.style.display = 'none';  // Forzar ocultamiento CSS inline (por si acaso)
        }
    });
}