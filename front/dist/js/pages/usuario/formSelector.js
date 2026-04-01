import { API } from '../../api.js';
import { getCorrectPath } from '../../components/menujs/MenuConfig.js';

let allSedes = []; 
let currentInstId = null;
// Obtenemos el nivel del usuario (1=Super, 2=Admin, 3=Investigador)
const userRole = parseInt(localStorage.getItem('userLevel') || '3');

export async function initFormSelector() {
    // 🚀 NUEVO: Limpiamos cualquier selección anterior por seguridad al entrar aquí
    sessionStorage.removeItem('target_inst_secreto');
    
    currentInstId = localStorage.getItem('instId');
    const container = document.getElementById('forms-grid');
    const depTitle = document.getElementById('dependency-title');
    const searchInput = document.getElementById('inst-search');

    try {
        const res = await API.request(`/forms/selector?inst=${currentInstId}`);
        
        if (res.status === 'success') {
            const { dependency_name, is_multi_sede, sedes } = res.data;
            allSedes = sedes; 

            if (is_multi_sede) {
                depTitle.innerText = `${(window.txt?.centro_solicitudes?.red) || 'RED:'} ${dependency_name || (window.txt?.centro_solicitudes?.grupo_inst || 'GRUPO INSTITUCIONAL')}`;
                if(searchInput) searchInput.parentElement.parentElement.classList.remove('d-none');
            } else {
                if(sedes.length > 0) depTitle.innerText = sedes[0].NombreCompletoInst;
                if(searchInput) searchInput.parentElement.parentElement.classList.add('d-none');
            }

            renderSedesList(allSedes, is_multi_sede);

            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const term = e.target.value.toLowerCase();
                    const filtered = allSedes.filter(s => 
                        s.NombreCompletoInst.toLowerCase().includes(term) || 
                        s.NombreInst.toLowerCase().includes(term)
                    );
                    renderSedesList(filtered, is_multi_sede);
                });
            }
        }
    } catch (e) {
        console.error("Error:", e);
        const t = window.txt?.centro_solicitudes;
        container.innerHTML = `<div class="alert alert-danger text-center">${t?.error_red || 'Error cargando red institucional.'}</div>`;
    }
}

function renderSedesList(sedes, isMulti) {
    const container = document.getElementById('forms-grid');
    let html = '';

    if (sedes.length === 0) {
        const t = window.txt?.centro_solicitudes;
        container.innerHTML = `<div class="text-center text-muted py-5">${t?.sin_instituciones || 'No se encontraron instituciones.'}</div>`;
        return;
    }

    sedes.forEach(sede => {
        const isCurrent = (sede.IdInstitucion == currentInstId);
        const headerClass = isCurrent ? "bg-success text-white" : "bg-white text-success border border-success";
        const iconColor = isCurrent ? "text-white" : "text-success";
        const t = window.txt?.centro_solicitudes;
        const labelText = isCurrent ? (t?.tu_sede_actual || "(TU SEDE ACTUAL)") : "";

        if (isMulti) {
            html += `
            <div class="col-12 mt-4 mb-2 fade-in">
                <div class="d-flex align-items-center border-bottom border-2 border-success border-opacity-25 pb-3 pt-1">
                    <div class="${headerClass} rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm flex-shrink-0" 
                         style="width: 48px; height: 48px; font-weight: 900; font-size: 22px;">
                        <i class="bi bi-building ${iconColor}"></i>
                    </div>
                    <div class="flex-grow-1 min-w-0">
                        <h5 class="fw-bold mb-1 text-dark institution-name-selector" style="font-size: 1.1rem; line-height: 1.3;">
                            ${sede.NombreCompletoInst} 
                            ${labelText ? `<span class="badge bg-success-subtle text-success-emphasis border border-success-subtle ms-2 align-middle" style="font-size: 0.65rem;">${labelText}</span>` : ''}
                        </h5>
                        <span class="text-success fw-semibold text-uppercase d-inline-block mt-0" style="font-size: 0.8rem; letter-spacing: 0.5px;">
                            ${sede.NombreInst}
                        </span>
                    </div>
                </div>
            </div>`;
        }

        html += renderActionButtons(sede);
    });

    container.innerHTML = html;
}

/**
 * LÓGICA DE PERMISOS CRUZADA (Backend SQL devuelve 0, 1, o 2)
 * 0 = Módulo apagado para toda la institución (Nadie lo ve).
 * 1 = Habilitado, pero cerrado a investigadores (Solo lo ven Admins/Roles 1 y 2).
 * 2 = Habilitado y abierto a investigadores (Lo ven todos).
 */
function checkPermission(flagValue) {
    const val = parseInt(flagValue);
    
    // Si la institución no tiene el módulo, NADIE lo ve.
    if (val === 0) return false;
    
    // Si el módulo está abierto para investigadores (2), TODO EL MUNDO lo ve.
    if (val === 2) return true;
    
    // Si el módulo es de uso exclusivo interno (1), SOLO roles administrativos (1 y 2) lo ven.
    if (val === 1) {
        return [1, 2].includes(userRole);
    }

    return false;
}

function renderActionButtons(sede) {
    let buttonsHtml = '';
    const target = sede.IdInstitucion;

    // 1. Animales
    if (checkPermission(sede.flag_animales)) {
        const t = window.txt?.centro_solicitudes;
        buttonsHtml += createCard(
            t?.solicitud_animales || 'Solicitud Animales', 
            'bi bi-mouse', 
            'bg-success text-white', 
            'panel/formularios/animales', 
            target
        );
    }

    // 2. Reactivos
    if (checkPermission(sede.flag_reactivos)) {
        const t = window.txt?.centro_solicitudes;
        buttonsHtml += createCard(
            t?.reactivos_biologicos || 'Reactivos Biológicos', 
            'bi bi-eyedropper', 
            'bg-warning text-dark', 
            'panel/formularios/reactivos', 
            target
        );
    }

    // 3. Insumos
    if (checkPermission(sede.flag_insumos)) {
        const t = window.txt?.centro_solicitudes;
        buttonsHtml += createCard(
            t?.pedido_insumos || 'Pedido de Insumos', 
            'bi bi-box-seam', 
            'bg-primary text-white', 
            'panel/formularios/insumos', 
            target
        );
    }
    
    // 4. Reservas
    if (checkPermission(sede.flag_reservas)) {
        const t = window.txt?.centro_solicitudes;
        buttonsHtml += createCard(
            t?.reserva_salas || 'Reserva de Salas', 
            'bi bi-calendar-check', 
            'bg-info text-dark', 
            'panel/formularios/reservas', 
            target
        );
    }

    if (buttonsHtml === '') {
        const t = window.txt?.centro_solicitudes;
        buttonsHtml = `<div class="col-12 text-center text-muted small italic py-2">${t?.sin_formularios || 'Sin formularios habilitados para tu nivel de acceso.'}</div>`;
    }

    return `<div class="row g-3 justify-content-start w-100 mb-3 px-3">${buttonsHtml}</div>`;
}

function createCard(title, iconClass, bgClass, modulePath, targetId) {
    // Usamos onclick para disparar la función secreta en lugar de un href tradicional
    return `
    <div class="col-md-6 col-lg-4 col-xl-3">
        <div class="card border-0 shadow-sm h-100 hover-scale" style="background: #fff; border-left: 4px solid #1a5d3b !important;" onclick="window.irAFormulario('${modulePath}', ${targetId})">
            <div class="card-body p-3 d-flex align-items-center">
                <div class="rounded-3 p-3 me-3 ${bgClass} shadow-sm d-flex align-items-center justify-content-center" style="width: 45px; height: 45px;">
                    <i class="${iconClass} fs-5"></i>
                </div>
                <div>
                    <h6 class="fw-bold mb-1 text-dark text-uppercase" style="font-size: 0.75rem; letter-spacing: 0.5px;">${title}</h6>
                    <span class="text-success fw-bold" style="font-size: 0.65rem;">
                        ${window.txt?.centro_solicitudes?.iniciar || 'Iniciar'} <i class="bi bi-arrow-right-short"></i>
                    </span>
                </div>
            </div>
        </div>
    </div>`;
}

// Redirección al mismo destino que el menú (getCorrectPath → paginas/.../formularios/....html en localhost)
window.irAFormulario = (modulePath, targetId) => {
    sessionStorage.setItem('target_inst_secreto', targetId);
    window.location.href = getCorrectPath(modulePath);
};