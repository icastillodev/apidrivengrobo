import { API } from '../../api.js';
import { getSession } from './MenuConfig.js'; 

export async function refreshMenuNotifications() {
    const instId = getSession('instId');
    if (!instId) return;

    try {
        const res = await API.request(`/menu/notifications?inst=${instId}`);
        
        if (res && res.status === "success" && res.data) {
            updateBadge(2, res.data.protocolos || 0); // Protocolos
            updateBadge(3, res.data.animales || 0);   // Animales
            updateBadge(4, res.data.reactivos || 0);  // Reactivos
            updateBadge(5, res.data.insumos || 0);    // Insumos
        }
    } catch (e) {
        console.warn("Fallo en notificaciones:", e);
    }
}

// Función interna para actualizar los puntitos rojos
function updateBadge(menuId, count) {
    // Busca el icono específico por su ID
    const iconContainer = document.querySelector(`.menu-icon[data-menu-id="${menuId}"]`);
    
    if (!iconContainer) return;

    let dot = iconContainer.querySelector('.notif-dot');
    
    if (count > 0) {
        if (!dot) {
            // Si no existe el punto rojo, lo crea
            iconContainer.insertAdjacentHTML('beforeend', 
                `<div class="notif-dot bg-danger text-white position-absolute d-flex align-items-center justify-content-center shadow-sm" style="display:flex;">${count}</div>`
            );
        } else {
            // Si existe, actualiza el número
            dot.innerText = count;
            dot.style.display = 'flex';
        }
    } else if (dot) {
        // Si la cuenta es 0 y existe el punto, lo oculta
        dot.style.display = 'none';
    }
}