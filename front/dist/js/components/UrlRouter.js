/**
 * URL ROUTER - AUTO OPENER
 * Se encarga de abrir modales o ejecutar acciones si la URL trae parámetros
 * Compatible con rutas reescritas (ej: /admin/animales sin .html)
 */

export function checkUrlParamsAndOpen() {
    const params = new URLSearchParams(window.location.search);
    const href = window.location.href;
    const pathname = window.location.pathname || '';

    const id = params.get('id');
    const historia = params.get('historia');
    const action = params.get('action') || '';

    if (!id && !historia) return;

    console.log(`🌍 UrlRouter: Detectado ID=${id || historia} Action=${action}`);

    const isPage = (slug) => href.includes(slug + '.html') || pathname.includes('/' + slug);

    // =======================================================
    // 1. PROTOCOLOS
    // =======================================================
    if (isPage('protocolos')) {
        if (action === 'pdf') {
            if (window.exportPdfProtocol) window.exportPdfProtocol(id);
        } else {
            if (typeof openModal === 'function') openModal(id);
            else if (typeof editProtocol === 'function') editProtocol(id);
        }
        return;
    }

    // =======================================================
    // 2. USUARIOS
    // =======================================================
    if (isPage('usuarios')) {
        const userObj = typeof openUserModal === 'function' ? { IdUsrA: id } : null;
        if (typeof openUserModal === 'function') {
            const u = window._allUsersForRouter && window._allUsersForRouter.find(x => String(x.IdUsrA) === String(id));
            if (u) openUserModal(u);
            else openUserModal({ IdUsrA: id });
        } else if (typeof editUser === 'function') editUser(id);
        return;
    }

    // =======================================================
    // 3. ALOJAMIENTOS (historia o id)
    // =======================================================
    if (isPage('alojamientos')) {
        const searchVal = historia || id;
        if (action === 'qr') {
            if (typeof showQrModal === 'function') showQrModal(searchVal);
        } else {
            if (typeof window.verHistorial === 'function') window.verHistorial(searchVal);
            else if (typeof openAlojamientoModal === 'function') openAlojamientoModal(searchVal);
            else if (typeof editAlojamiento === 'function') editAlojamiento(searchVal);
        }
        return;
    }

    // =======================================================
    // 4. ANIMALES (id = idformA)
    // =======================================================
    if (isPage('animales')) {
        if (typeof window.openAnimalModal === 'function' && id) {
            const a = window._allAnimalsForRouter && window._allAnimalsForRouter.find(x => String(x.idformA) === String(id));
            if (a) window.openAnimalModal(a);
            else window.openAnimalModal({ idformA: id });
        }
        return;
    }

    // =======================================================
    // 5. REACTIVOS (id = idformA)
    // =======================================================
    if (isPage('reactivos')) {
        if (typeof window.openReactivoModal === 'function' && id) {
            const r = window._allReactivosForRouter && window._allReactivosForRouter.find(x => String(x.idformA) === String(id));
            if (r) window.openReactivoModal(r);
            else window.openReactivoModal({ idformA: id });
        }
        return;
    }

    // =======================================================
    // 6. INSUMOS / FORMULARIOS (id = idformA)
    // =======================================================
    if (isPage('insumos') || isPage('misformularios')) {
        if (typeof openFormDetail === 'function') openFormDetail(id);
        else if (typeof viewOrder === 'function') viewOrder(id);
    }
}