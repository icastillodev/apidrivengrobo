/**
 * URL ROUTER - AUTO OPENER
 * Se encarga de abrir modales o ejecutar acciones si la URL trae parámetros
 * Ejemplo: protocolos.html?id=105&action=edit -> Abre el modal del protocolo 105
 */

export function checkUrlParamsAndOpen() {
    const params = new URLSearchParams(window.location.search);
    
    // Obtenemos los parámetros comunes
    const id = params.get('id'); 
    const historia = params.get('historia'); // Para alojamientos
    const action = params.get('action');     // edit, view, pdf, qr

    // Si no hay ID ni Historia, no hacemos nada
    if (!id && !historia) return;

    console.log(`🌍 UrlRouter: Detectado ID=${id || historia} Action=${action}`);

    // Limpiar la URL para que si recarga no se abra de nuevo (Opcional, descomentar si te gusta)
    // window.history.replaceState({}, document.title, window.location.pathname);

    // =======================================================
    // 1. LÓGICA PARA PROTOCOLOS
    // =======================================================
    if (window.location.href.includes('protocolos.html')) {
        if (action === 'pdf') {
            // Si tienes una función global para PDF
            if (window.exportPdfProtocol) window.exportPdfProtocol(id);
        } else {
            // Abrir Modal de Edición/Ver
            // NOTA: Reemplaza 'openModal' por el nombre REAL de tu función en protocolos.js
            if (typeof openModal === 'function') openModal(id);
            else if (typeof editProtocol === 'function') editProtocol(id);
            else console.warn("No encontré la función openModal() o editProtocol() en esta página.");
        }
    }

    // =======================================================
    // 2. LÓGICA PARA USUARIOS
    // =======================================================
    else if (window.location.href.includes('usuarios.html')) {
        // Reemplaza 'openUserModal' por tu función real
        if (typeof openUserModal === 'function') openUserModal(id);
        else if (typeof editUser === 'function') editUser(id);
    }

    // =======================================================
    // 3. LÓGICA PARA ALOJAMIENTOS
    // =======================================================
    else if (window.location.href.includes('alojamientos.html')) {
        const searchVal = historia || id; // Puede venir por historia
        
        if (action === 'qr') {
            if (typeof showQrModal === 'function') showQrModal(searchVal);
        } else {
            // Abrir detalle de alojamiento
            if (typeof openAlojamientoModal === 'function') openAlojamientoModal(searchVal);
            else if (typeof editAlojamiento === 'function') editAlojamiento(searchVal);
        }
    }

    // =======================================================
    // 4. LÓGICA PARA INSUMOS / FORMULARIOS
    // =======================================================
    else if (window.location.href.includes('insumos.html') || window.location.href.includes('misformularios.html')) {
        if (typeof openFormDetail === 'function') {
            openFormDetail(id);
        } else if (typeof viewOrder === 'function') {
            viewOrder(id);
        }
    }
}