import { API } from '../../api.js';

let allUsers = [];
let currentPage = 1;
const rowsPerPage = 15;
let modalUser;

const rolesMap = {
    2: 'Administrador Sede',
    3: 'Investigador',
    4: 'SecAdmin',
    5: 'Técnico',
    6: 'Laboratorio'
};

export async function initSuperUsuarios() {
    modalUser = new bootstrap.Modal(document.getElementById('modal-user'));
    await cargarSedes();
    await cargarUsuarios();
    poblarSelectRoles();
    
    document.getElementById('btn-search').onclick = () => {
        currentPage = 1;
        renderTable();
    };
    document.getElementById('btn-excel').onclick = exportToExcel;
}

// --- CARGA DE DATOS ---

async function cargarSedes() {
    const res = await API.request('/superadmin/instituciones');
    if (res.status === 'success') {
        const select = document.getElementById('IdInstitucion');
        select.innerHTML = res.data.map(i => `<option value="${i.IdInstitucion}">${i.NombreInst}</option>`).join('');
    }
}

async function cargarUsuarios() {
    const res = await API.request('/superadmin/usuarios');
    if (res.status === 'success') {
        allUsers = res.data;
        renderTable();
    }
}

function poblarSelectRoles() {
    const select = document.getElementById('IdTipoUsrA');
    select.innerHTML = Object.entries(rolesMap).map(([id, nombre]) => `<option value="${id}">${nombre}</option>`).join('');
}

// --- RENDERIZADO Y BÚSQUEDA ---

function renderTable() {
    const term = document.getElementById('search-input').value.toLowerCase().trim();
    
    const filtered = allUsers.filter(u => {
        const id = String(u.IdUsrA || "");
        const sede = (u.NombreInst || "").toLowerCase();
        const rol = (rolesMap[u.IdTipoUsrA] || "").toLowerCase();
        const nombre = (u.NombreA || "").toLowerCase();
        const apellido = (u.ApellidoA || "").toLowerCase();
        const email = (u.EmailA || "").toLowerCase();

        return id.includes(term) || sede.includes(term) || rol.includes(term) || 
               nombre.includes(term) || apellido.includes(term) || email.includes(term);
    });

    const tbody = document.getElementById('table-body');
    const start = (currentPage - 1) * rowsPerPage;
    const pageData = filtered.slice(start, start + rowsPerPage);

    tbody.innerHTML = pageData.map(u => `
        <tr onclick="abrirModalEditar(${u.IdUsrA})" class="cursor-pointer border-b hover:bg-gray-50">
            <td class="px-3 py-2">#${u.IdUsrA}</td>
            <td class="px-3 py-2 fw-bold text-success">${u.NombreInst || '---'}</td>
            <td class="px-3 py-2">${u.ApellidoA || ''}, ${u.NombreA || ''}</td>
            <td class="px-3 py-2">
                <div class="fw-bold" style="font-size: 11px;">${u.UsrA || '---'}</div>
                <div class="text-muted" style="font-size: 10px;">${u.EmailA || '---'}</div>
            </td>
            <td class="text-center">
                <span class="badge bg-light text-dark border" style="font-size: 10px;">
                    ${rolesMap[u.IdTipoUsrA] || 'S/R'}
                </span>
            </td>
        </tr>
    `).join('');

    renderPagination(filtered.length);
}



function renderPagination(totalRows) {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    pagination.innerHTML = '';
    if (totalPages <= 1) return;

    const createBtn = (label, targetPage, isDisabled, isActive = false) => {
        const li = document.createElement('li');
        li.className = `page-item ${isDisabled ? 'disabled' : ''} ${isActive ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link shadow-none" href="#">${label}</a>`;
        if (!isDisabled) li.onclick = (e) => { e.preventDefault(); currentPage = targetPage; renderTable(); };
        return li;
    };

    pagination.appendChild(createBtn('Anterior', currentPage - 1, currentPage === 1));
    pagination.appendChild(createBtn(1, 1, false, currentPage === 1));

    let start = Math.max(2, currentPage - 2);
    let end = Math.min(totalPages - 1, currentPage + 2);

    if (start > 2) pagination.innerHTML += `<li class="page-item disabled"><span class="page-link border-0">...</span></li>`;
    for (let i = start; i <= end; i++) pagination.appendChild(createBtn(i, i, false, i === currentPage));
    if (end < totalPages - 1) pagination.innerHTML += `<li class="page-item disabled"><span class="page-link border-0">...</span></li>`;

    pagination.appendChild(createBtn(totalPages, totalPages, false, currentPage === totalPages));
    pagination.appendChild(createBtn('Siguiente', currentPage + 1, currentPage === totalPages));
}

// --- ACCIONES MODAL ---

window.abrirModalCrear = () => {
    document.getElementById('form-user').reset();
    document.getElementById('IdUsrA').value = "";
    document.getElementById('hint-pass').classList.remove('d-none');
    document.getElementById('btn-reset').style.display = "none";
    modalUser.show();
};

window.abrirModalEditar = (id) => {
    const u = allUsers.find(user => user.IdUsrA == id);
    if (!u) return;

    // Asignamos el nombre de usuario al campo del modal
    document.getElementById('UsrA').value = u.UsrA || "";
    
    document.getElementById('IdUsrA').value = u.IdUsrA;
    document.getElementById('NombreA').value = u.NombreA || "";
    document.getElementById('ApellidoA').value = u.ApellidoA || "";
    document.getElementById('EmailA').value = u.EmailA || "";
    document.getElementById('IdInstitucion').value = u.IdInstitucion;
    document.getElementById('IdTipoUsrA').value = parseInt(u.IdTipoUsrA);
    document.getElementById('confirmado').value = u.confirmado;
    document.getElementById('hint-pass').classList.add('d-none');
    document.getElementById('btn-reset').style.display = "block";
    modalUser.show();
};

window.guardarUsuario = async () => {
    const userInput = document.getElementById('UsrA');
    
    // NUEVA SEGURIDAD: Si el valider en vivo marcó el campo como inválido, frenamos el envío
    if (userInput.classList.contains('is-invalid')) {
        return alert("Por favor, elegí un nombre de usuario que no esté en uso.");
    }

    const id = document.getElementById('IdUsrA').value;
    const data = {
        UsrA: userInput.value.trim(),
        NombreA: document.getElementById('NombreA').value,
        ApellidoA: document.getElementById('ApellidoA').value,
        EmailA: document.getElementById('EmailA').value,
        IdInstitucion: document.getElementById('IdInstitucion').value,
        IdTipoUsrA: document.getElementById('IdTipoUsrA').value,
        confirmado: document.getElementById('confirmado').value,
        Clave: id ? null : "12345678"
    };

    const endpoint = id ? `/superadmin/usuarios/update?id=${id}` : '/superadmin/usuarios/create';
    const res = await API.request(endpoint, 'POST', data);
    if (res.status === 'success') {
        modalUser.hide();
        cargarUsuarios();
        (window.mostrarNotificacion || alert)(id ? "Datos actualizados" : "Usuario creado (Clave: 12345678)");
    }
};

window.resetPassword = async () => {
    const id = document.getElementById('IdUsrA').value;
    if (!confirm("¿Resetear clave de este usuario a '12345678'?")) return;
    const res = await API.request(`/superadmin/usuarios/reset-pass?id=${id}`, 'POST');
    if (res.status === 'success') alert("Clave restablecida correctamente.");
};

function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(allUsers.map(u => ({
        "ID": u.IdUsrA, "Institución": u.NombreInst, "Apellido": u.ApellidoA, "Nombre": u.NombreA, "Email": u.EmailA, "Rol": rolesMap[u.IdTipoUsrA]
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Usuarios_Global");
    XLSX.writeFile(wb, "Reporte_Gecko_Personal.xlsx");
}

let debounceTimer;

document.getElementById('UsrA').addEventListener('input', function() {
    const username = this.value.trim();
    const feedback = document.getElementById('user-feedback');
    const icon = document.getElementById('user-status-icon');
    const input = this;

    // Limpiamos estados previos
    clearTimeout(debounceTimer);
    feedback.innerText = "";
    input.classList.remove('is-invalid', 'is-valid');
    icon.classList.add('d-none');

    if (username.length < 3) return; // No validar nombres muy cortos

    icon.classList.remove('d-none'); // Mostrar spinner

    debounceTimer = setTimeout(async () => {
        try {
            // Pasamos el ID actual por si estamos editando (para que no se valide a sí mismo)
            const currentId = document.getElementById('IdUsrA').value;
            const res = await API.request(`/superadmin/usuarios/check-username?user=${username}&exclude=${currentId}`);
            
            icon.classList.add('d-none'); // Ocultar spinner

            if (res.available) {
                input.classList.add('is-valid');
                feedback.innerText = "✅ Disponible";
                feedback.className = "form-text smaller fw-bold mt-1 text-success";
            } else {
                input.classList.add('is-invalid');
                feedback.innerText = "❌ Ya está en uso por otro bioterio";
                feedback.className = "form-text smaller fw-bold mt-1 text-danger";
            }
        } catch (err) {
            icon.classList.add('d-none');
            console.error("Error en validación en vivo");
        }
    }, 400); // 400ms de espera
});