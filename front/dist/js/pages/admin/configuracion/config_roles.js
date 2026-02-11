import { API } from '../../../api.js';

let allUsers = [];
let menuConfig = [];
let currentPage = 1;
const rowsPerPage = 12; // Paginación de 6 filas

const ROLE_NAMES = {
    3: { label: 'Investigador', class: 'bg-info-subtle text-info border-info' },
    4: { label: 'Sub Admin', class: 'bg-primary-subtle text-primary border-primary' },
    5: { label: 'Asistente', class: 'bg-warning-subtle text-warning border-warning' },
    7: { label: 'Laboratorio', class: 'bg-secondary-subtle text-secondary border-secondary' }
};

const MENU_DEFINITION = [
    { id: 1, name: "Usuario / Mis Formularios" },
    { id: 2, name: "Administración Protocolos" },
    { id: 3, name: "Admin. Formulario Animales" },
    { id: 4, name: "Admin. Formulario Reactivos" },
    { id: 5, name: "Admin. Formulario Insumos" },
    { id: 6, name: "Administración de Reservas" },
    { id: 7, name: "Administración de Alojamientos" },
    { id: 8, name: "Estadísticas" },
    { id: 202, name: "Módulo Contable" }
];

/**
 * INICIALIZACIÓN
 */
export async function initConfigRoles() {
    await loadData();
    
    // Evento de búsqueda en tiempo real
    document.getElementById('user-search').onkeyup = () => { 
        currentPage = 1; 
        renderUsers(); 
    };

    // Evento al cambiar el rol en el panel derecho (Menús)
    document.getElementById('select-role-menu').onchange = () => {
        renderMenuPermissions();
    };
}

/**
 * CARGA DE DATOS
 */
async function loadData() {
    const instId = localStorage.getItem('instId');
    try {
        const res = await API.request(`/admin/config/roles/init?inst=${instId}`);
        if (res.status === 'success') {
            allUsers = res.data.users || [];
            menuConfig = res.data.menuConfig || [];
            renderUsers();
            renderMenuPermissions();
        }
    } catch (e) { 
        console.error("Error al cargar roles:", e); 
    }
}

/**
 * RENDERIZADO DE USUARIOS (TABLA IZQUIERDA)
 */
function renderUsers() {
    const term = document.getElementById('user-search').value.toLowerCase().trim();
    
    // Filtrado seguro (protección contra nulls)
    const filtered = allUsers.filter(u => {
        const nombre = (u.NombreA || "").toLowerCase();
        const apellido = (u.ApellidoA || "").toLowerCase();
        const username = (u.UsrA || "").toLowerCase();
        const idString = String(u.IdUsrA);
        
        return nombre.includes(term) || 
               apellido.includes(term) || 
               username.includes(term) ||
               idString.includes(term); // También permite buscar por ID
    });

    // Cálculos de paginación
    const totalPages = Math.ceil(filtered.length / rowsPerPage);
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;

    const start = (currentPage - 1) * rowsPerPage;
    const pageData = filtered.slice(start, start + rowsPerPage);
    const tbody = document.getElementById('table-users');
    tbody.innerHTML = '';

    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No se encontraron usuarios</td></tr>`;
        renderPagination(0);
        return;
    }

    pageData.forEach(u => {
        const role = ROLE_NAMES[u.CurrentRoleId] || { label: 'Sin Rol', class: 'bg-light text-dark' };
        
        const tr = document.createElement('tr');
        tr.className = "clickable-row"; // Clase opcional para cursor pointer en CSS
        tr.innerHTML = `
            <td class="ps-3 text-dark">
                <span class="text-secondary small fw-normal me-1" style="font-size: 0.85em;">#${u.IdUsrA}</span>
                <span class="fw-bold">${u.ApellidoA || ''}, ${u.NombreA || ''}</span>
            </td>
            <td class="text-primary fw-bold" style="letter-spacing: 0.5px;">@${u.UsrA || '---'}</td>
            <td><span class="badge border ${role.class}" style="font-size: 10px;">${role.label}</span></td>
            <td class="text-end pe-3">
                <button class="btn btn-sm btn-light border shadow-sm" onclick="window.openRoleModal(${u.IdUsrA}, ${u.CurrentRoleId})">
                    <i class="bi bi-person-gear"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderPagination(filtered.length);
}

/**
 * CONTROLES DE PAGINACIÓN
 */
function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    const container = document.getElementById('pagination-container');
    container.innerHTML = '';

    if (totalPages <= 1) return;

    const nav = document.createElement('nav');
    const ul = document.createElement('ul');
    ul.className = "pagination pagination-sm mb-0 shadow-sm";

    // Botón Anterior
    ul.innerHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="window.changePage(event, ${currentPage - 1})">
                <i class="bi bi-chevron-left"></i>
            </a>
        </li>
    `;

    // Lógica de visualización de páginas (1 ... 4 5 6 ... 10)
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            ul.innerHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="window.changePage(event, ${i})">${i}</a>
                </li>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            ul.innerHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    // Botón Siguiente
    ul.innerHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="window.changePage(event, ${currentPage + 1})">
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>
    `;

    nav.appendChild(ul);
    container.appendChild(nav);
}

window.changePage = (event, page) => {
    event.preventDefault();
    if (page < 1) return;
    currentPage = page;
    renderUsers();
};

/**
 * RENDERIZADO DE MENÚS (PANEL DERECHO)
 */
function renderMenuPermissions() {
    const roleId = parseInt(document.getElementById('select-role-menu').value);
    const container = document.getElementById('menu-list-container');
    container.innerHTML = '';

    MENU_DEFINITION.forEach(m => {
        // Buscamos si existe configuración para este rol y menú
        const config = menuConfig.find(c => c.IdTipoUsrA == roleId && c.NombreMenu == m.id);
        const isActive = config ? config.Activo == 1 : false;

        const item = document.createElement('div');
        item.className = "list-group-item d-flex justify-content-between align-items-center py-3";
        item.innerHTML = `
            <div class="fw-bold small text-secondary">
                <span class="badge bg-light text-dark border me-2" style="width:35px; font-size: 10px;">${m.id}</span> ${m.name}
            </div>
            <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" role="switch" 
                    ${isActive ? 'checked' : ''} 
                    onchange="window.toggleMenuPermission(${roleId}, ${m.id}, this.checked)">
            </div>
        `;
        container.appendChild(item);
    });
}

/**
 * MODAL DE CAMBIO DE ROL
 */
window.openRoleModal = (userId, currentRole) => {
    document.getElementById('target-user-id').value = userId;
    document.getElementById('new-role-select').value = currentRole;
    new bootstrap.Modal(document.getElementById('modal-role')).show();
};

window.processRoleChange = async () => {
    const userId = document.getElementById('target-user-id').value;
    const newRoleId = document.getElementById('new-role-select').value;
    
    const fd = new FormData();
    fd.append('userId', userId);
    fd.append('newRoleId', newRoleId);

    Swal.fire({ title: 'Actualizando...', didOpen: () => Swal.showLoading() });

    try {
        const res = await API.request('/admin/config/roles/update-user-role', 'POST', fd);
        if(res.status === 'success') {
            Swal.fire({ title: 'Rol Actualizado', icon: 'success', timer: 1000, showConfirmButton: false });
            bootstrap.Modal.getInstance(document.getElementById('modal-role')).hide();
            loadData(); // Recargamos para ver el cambio en la tabla
        } else {
            Swal.fire('Error', res.message || 'Error al actualizar', 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'No se pudo actualizar el rol.', 'error');
    }
};

/**
 * TOGGLE DE PERMISOS DE MENÚ
 */
window.toggleMenuPermission = async (roleId, menuId, isChecked) => {
    const fd = new FormData();
    fd.append('instId', localStorage.getItem('instId'));
    fd.append('roleId', roleId);
    fd.append('menuId', menuId);
    fd.append('status', isChecked ? 1 : 2); // 1 Activo, 2 Inactivo

    try {
        const res = await API.request('/admin/config/roles/toggle-menu', 'POST', fd);
        if(res.status === 'success') {
            // Actualización optimista de la caché local
            const index = menuConfig.findIndex(c => c.IdTipoUsrA == roleId && c.NombreMenu == menuId);
            if(index > -1) {
                menuConfig[index].Activo = isChecked ? 1 : 2;
            } else {
                menuConfig.push({ 
                    IdTipoUsrA: roleId, 
                    NombreMenu: menuId, 
                    Activo: isChecked ? 1 : 2 
                });
            }
        }
    } catch (err) {
        console.error("Error al cambiar permiso:", err);
        // Si falla, podrías revertir el switch visualmente aquí si quisieras ser muy estricto
    }
};