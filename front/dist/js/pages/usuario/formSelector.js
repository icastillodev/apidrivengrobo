import { API } from '../../api.js';

let allSedes = []; 
let currentInstId = null;
// Obtenemos el nivel del usuario (1=Super, 2=Admin, 3=Investigador)
const userRole = parseInt(localStorage.getItem('userLevel') || '3');

export async function initFormSelector() {
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
                depTitle.innerText = `RED: ${dependency_name || 'GRUPO INSTITUCIONAL'}`;
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
        container.innerHTML = `<div class="alert alert-danger text-center">Error cargando red institucional.</div>`;
    }
}

function renderSedesList(sedes, isMulti) {
    const container = document.getElementById('forms-grid');
    let html = '';

    if (sedes.length === 0) {
        container.innerHTML = `<div class="text-center text-muted py-5">No se encontraron instituciones.</div>`;
        return;
    }

    sedes.forEach(sede => {
        const isCurrent = (sede.IdInstitucion == currentInstId);
        const headerClass = isCurrent ? "bg-success text-white" : "bg-white text-success border border-success";
        const iconColor = isCurrent ? "text-white" : "text-success";
        const labelText = isCurrent ? "(TU SEDE ACTUAL)" : "";

        if (isMulti) {
            html += `
            <div class="col-12 mt-4 mb-2 fade-in">
                <div class="d-flex align-items-center border-bottom border-2 border-success border-opacity-25 pb-2">
                    <div class="${headerClass} rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm" 
                         style="width: 45px; height: 45px; font-weight: 900; font-size: 20px;">
                        <i class="bi bi-building ${iconColor}"></i>
                    </div>
                    <div>
                        <h5 class="fw-bold mb-0 text-dark">
                            ${sede.NombreCompletoInst} 
                            <span class="text-success small fw-bold ms-2" style="font-size: 10px;">${labelText}</span>
                        </h5>
                        <span class="text-muted text-uppercase small" style="font-size: 0.7rem;">
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
 * LÓGICA DE PERMISOS (1=Todos, 2=Admins, 3=Nadie)
 */
function checkPermission(flagValue) {
    const val = parseInt(flagValue);
    
    // 1: Habilitado para TODOS
    if (val === 1) return true;
    
    // 2: Habilitado solo para ADMINS (Roles 1 y 2)
    // El rol 3 (Investigador) recibe false
    if (val === 2) {
        return [1, 2].includes(userRole);
    }

    // 3 o cualquier otro valor: Deshabilitado
    return false;
}

function renderActionButtons(sede) {
    let buttonsHtml = '';
    const target = sede.IdInstitucion;

    // APLICAMOS LA NUEVA LÓGICA DE FILTRADO 'checkPermission'

    // 1. Animales
    if (checkPermission(sede.flag_animales)) {
        buttonsHtml += createCard(
            'Solicitud Animales', 
            'bi bi-mouse', 
            'bg-success text-white', 
            `formularios/animales.html?targetInst=${target}`
        );
    }

    // 2. Reactivos
    if (checkPermission(sede.flag_reactivos)) {
        buttonsHtml += createCard(
            'Reactivos Biológicos', 
            'bi bi-eyedropper', 
            'bg-warning text-dark', 
            `formularios/reactivos.html?targetInst=${target}`
        );
    }

    // 3. Insumos
    if (checkPermission(sede.flag_insumos)) {
        buttonsHtml += createCard(
            'Pedido de Insumos', 
            'bi bi-box-seam', 
            'bg-primary text-white', 
            `formularios/insumos.html?targetInst=${target}`
        );
    }
    
    // 4. Reservas
    if (checkPermission(sede.flag_reservas)) {
        buttonsHtml += createCard(
            'Reserva de Salas', 
            'bi bi-calendar-check', 
            'bg-info text-dark', 
            `formularios/reservas.html?targetInst=${target}`
        );
    }

    if (buttonsHtml === '') {
        buttonsHtml = `<div class="col-12 text-center text-muted small italic py-2">Sin formularios habilitados para tu nivel de acceso.</div>`;
    }

    return `<div class="row g-3 justify-content-start w-100 mb-3 px-3">${buttonsHtml}</div>`;
}

function createCard(title, iconClass, bgClass, link) {
    return `
    <div class="col-md-6 col-lg-4 col-xl-3">
        <a href="${link}" class="text-decoration-none">
            <div class="card border-0 shadow-sm h-100 hover-scale" style="background: #fff; border-left: 4px solid #1a5d3b !important;">
                <div class="card-body p-3 d-flex align-items-center">
                    <div class="rounded-3 p-3 me-3 ${bgClass} shadow-sm d-flex align-items-center justify-content-center" style="width: 45px; height: 45px;">
                        <i class="${iconClass} fs-5"></i>
                    </div>
                    <div>
                        <h6 class="fw-bold mb-1 text-dark text-uppercase" style="font-size: 0.75rem; letter-spacing: 0.5px;">${title}</h6>
                        <span class="text-success fw-bold" style="font-size: 0.65rem;">
                            Iniciar <i class="bi bi-arrow-right-short"></i>
                        </span>
                    </div>
                </div>
            </div>
        </a>
    </div>`;
}