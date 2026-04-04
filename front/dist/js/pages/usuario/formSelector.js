import { API } from '../../api.js';
import { getCorrectPath } from '../../components/menujs/MenuConfig.js';
import { esRolInvestigadorVisibilidadModulos, getInstModulesSnapshot } from '../../modulesAccess.js';

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

    if (depTitle) {
        depTitle.textContent = '';
        depTitle.classList.add('d-none');
    }

    try {
        const res = await API.request(`/forms/selector?inst=${currentInstId}`);
        
        if (res.status === 'success') {
            const { dependency_name, is_multi_sede, sedes } = res.data;
            allSedes = sedes; 

            if (depTitle) {
                if (is_multi_sede) {
                    depTitle.textContent = `${(window.txt?.centro_solicitudes?.red) || 'RED:'} ${dependency_name || (window.txt?.centro_solicitudes?.grupo_inst || 'GRUPO INSTITUCIONAL')}`;
                    depTitle.classList.remove('d-none');
                } else if (sedes.length > 0) {
                    depTitle.textContent = sedes[0].NombreCompletoInst;
                    depTitle.classList.remove('d-none');
                } else {
                    depTitle.classList.add('d-none');
                }
            }

            if (is_multi_sede) {
                if (searchInput) searchInput.parentElement.parentElement.classList.remove('d-none');
            } else {
                if (searchInput) searchInput.parentElement.parentElement.classList.add('d-none');
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

    sedes.forEach((sede, idx) => {
        const isCurrent = (sede.IdInstitucion == currentInstId);
        const isLast = idx === sedes.length - 1;
        const t = window.txt?.centro_solicitudes;
        const labelText = isCurrent ? (t?.tu_sede_actual || "(TU SEDE ACTUAL)") : "";

        if (isMulti) {
            html += `
            <div class="col-12 mt-4 mb-0 fade-in gecko-sede-block" data-gecko-current="${isCurrent}">
                <div class="d-flex align-items-stretch gecko-sede-row">
                    <div class="gecko-sede-rail d-flex flex-column align-items-center flex-shrink-0 me-3" aria-hidden="true">
                        <span class="gecko-sede-dot ${isCurrent ? 'gecko-sede-dot--current' : ''}"></span>
                        <span class="gecko-sede-line ${isLast ? 'd-none' : ''}"></span>
                    </div>
                    <div class="flex-grow-1 min-w-0 pt-0 pb-1">
                        <div class="d-flex flex-wrap align-items-baseline gap-2 gap-md-3 mb-1">
                            <h3 class="h5 fw-bold mb-0 text-dark institution-name-selector">${sede.NombreCompletoInst}</h3>
                            ${labelText ? `<span class="badge rounded-pill bg-success-subtle text-success border border-success-subtle align-middle" style="font-size: 0.65rem;">${labelText}</span>` : ''}
                        </div>
                        <p class="mb-0 small text-success fw-semibold text-uppercase gecko-sede-code" style="letter-spacing: 0.12em;">${sede.NombreInst}</p>
                    </div>
                </div>
            </div>`;
        }

        html += renderActionButtons(sede);

        if (isMulti && !isLast) {
            html += `
            <div class="col-12 gecko-sede-separator" aria-hidden="true">
                <div class="gecko-sede-separator__wing" aria-hidden="true"></div>
                <span class="gecko-sede-separator__core" aria-hidden="true"></span>
                <div class="gecko-sede-separator__wing gecko-sede-separator__wing--flip" aria-hidden="true"></div>
            </div>`;
        }
    });

    container.innerHTML = html;
}

/**
 * LÓGICA DE PERMISOS CRUZADA (Backend SQL devuelve 0, 1, o 2)
 * 0 = Módulo apagado para toda la institución.
 * 1 = Solo admin sede (1,2,4).
 * 2 = Abierto a investigadores.
 * Investigador: si 0 en la sede pero tiene datos propios en SU sede (invHasData), sigue viendo la tarjeta solo al elegir esa sede.
 */
function checkPermission(flagValue, moduleKey, idInstSede) {
    if ([1, 2, 4].includes(userRole)) {
        return true;
    }
    const val = parseInt(flagValue, 10);

    if (val === 2) return true;

    if (val === 1) {
        return [1, 2, 4].includes(userRole);
    }

    if (val === 0) {
        if (!esRolInvestigadorVisibilidadModulos(userRole) || !moduleKey) return false;
        if (String(idInstSede) !== String(currentInstId)) return false;
        const { invHasData } = getInstModulesSnapshot();
        return !!(invHasData && invHasData[moduleKey]);
    }

    return false;
}

function renderActionButtons(sede) {
    let buttonsHtml = '';
    const target = sede.IdInstitucion;

    // 1. Animales
    if (checkPermission(sede.flag_animales, 'animales', sede.IdInstitucion)) {
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
    if (checkPermission(sede.flag_reactivos, 'reactivos', sede.IdInstitucion)) {
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
    if (checkPermission(sede.flag_insumos, 'insumos', sede.IdInstitucion)) {
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
    if (checkPermission(sede.flag_reservas, 'reservas', sede.IdInstitucion)) {
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

    return `<div class="row g-3 justify-content-start w-100 mb-4 px-2 px-md-3 gecko-tramites-row">${buttonsHtml}</div>`;
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