import { API } from '../../api.js';

let allUsers = [];
let currentPage = 1;
const rowsPerPage = 15;
let modalUser;
let modalDeleteFull;
let deletePreviewUserId = null;
let deletePreviewData = null;

function getRolesMap() {
    const t = window.txt?.superadmin_usuarios_global;
    if (t) return { 2: t.rol_superadmin, 3: t.rol_investigador, 4: t.rol_administrador, 5: t.rol_tecnico, 6: t.rol_laboratorio };
    return { 2: 'Superadmin', 3: 'Investigador', 4: 'Admin', 5: 'Técnico', 6: 'Laboratorio' };
}

export async function initSuperUsuarios() {
    modalUser = new bootstrap.Modal(document.getElementById('modal-user'));
    modalDeleteFull = new bootstrap.Modal(document.getElementById('modal-delete-full'));
    await cargarSedes();
    await cargarUsuarios();
    poblarSelectRoles();

    document.getElementById('btn-search').onclick = () => {
        currentPage = 1;
        renderTable();
    };
    document.getElementById('btn-excel').onclick = exportToExcel;

    document.getElementById('btn-eliminacion-total').onclick = abrirModalEliminacionTotal;
    document.getElementById('btn-confirm-delete-full').onclick = confirmarEliminacionTotal;
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
    const rolesMap = getRolesMap();
    const select = document.getElementById('IdTipoUsrA');
    const soloRoles = { 2: rolesMap[2], 4: rolesMap[4] };
    select.innerHTML = Object.entries(soloRoles).map(([id, nombre]) => `<option value="${id}">${nombre}</option>`).join('');
}

// --- RENDERIZADO Y BÚSQUEDA ---

function renderTable() {
    const rolesMap = getRolesMap();
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
        const a = document.createElement('a');
        a.className = 'page-link shadow-none';
        a.href = '#';
        a.textContent = label;
        a.addEventListener('click', (e) => {
            e.preventDefault();
            if (!isDisabled) {
                currentPage = targetPage;
                renderTable();
            }
        });
        li.appendChild(a);
        return li;
    };

    const addEllipsis = () => {
        const li = document.createElement('li');
        li.className = 'page-item disabled';
        li.innerHTML = '<span class="page-link border-0">...</span>';
        pagination.appendChild(li);
    };

    pagination.appendChild(createBtn('Anterior', currentPage - 1, currentPage === 1));
    pagination.appendChild(createBtn(1, 1, false, currentPage === 1));

    let start = Math.max(2, currentPage - 2);
    let end = Math.min(totalPages - 1, currentPage + 2);

    if (start > 2) addEllipsis();
    for (let i = start; i <= end; i++) pagination.appendChild(createBtn(i, i, false, i === currentPage));
    if (end < totalPages - 1) addEllipsis();

    pagination.appendChild(createBtn(totalPages, totalPages, false, currentPage === totalPages));
    pagination.appendChild(createBtn('Siguiente', currentPage + 1, currentPage === totalPages));
}

// --- ACCIONES MODAL ---

window.abrirModalCrear = () => {
    document.getElementById('form-user').reset();
    document.getElementById('IdUsrA').value = "";
    document.getElementById('hint-pass').classList.remove('d-none');
    document.getElementById('btn-reset').style.display = "none";
    document.getElementById('btn-eliminacion-total').style.display = 'none';
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
    const btnDel = document.getElementById('btn-eliminacion-total');
    btnDel.style.display = id ? 'inline-block' : 'none';
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
    const rolesMap = getRolesMap();
    const ws = XLSX.utils.json_to_sheet(allUsers.map(u => ({
        "ID": u.IdUsrA, "Institución": u.NombreInst, "Apellido": u.ApellidoA, "Nombre": u.NombreA, "Email": u.EmailA, "Rol": rolesMap[u.IdTipoUsrA]
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Usuarios_Global");
    XLSX.writeFile(wb, "Reporte_Gecko_Personal.xlsx");
}

async function abrirModalEliminacionTotal() {
    const id = document.getElementById('IdUsrA').value;
    if (!id) return;
    const t = window.txt?.superadmin_usuarios_global;
    try {
        const res = await API.request(`/superadmin/usuarios/delete-preview?id=${id}`);
        if (res.status !== 'success' || !res.data) {
            (window.mostrarNotificacion || alert)(res.message || (t?.delete_error ?? 'Error'));
            return;
        }
        deletePreviewUserId = id;
        deletePreviewData = res.data;
        const listEl = document.getElementById('delete-preview-list');
        listEl.innerHTML = '';
        const items = [
            [t?.delete_modal_usuario ?? 'Usuario', res.data.usuario + ' (' + (res.data.nombre || res.data.usuario) + ')'],
            [t?.delete_modal_institucion ?? 'Institución', res.data.institucion],
            [t?.delete_modal_protocolos ?? 'Protocolos', res.data.protocolos],
            [t?.delete_modal_formularios ?? 'Formularios', res.data.formularios],
            [t?.delete_modal_alojamientos ?? 'Alojamientos', res.data.alojamientos]
        ];
        items.forEach(([label, value]) => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between small';
            li.innerHTML = '<span class="text-muted">' + label + '</span><span class="fw-bold">' + value + '</span>';
            listEl.appendChild(li);
        });
        const pl = res.data.protocolos_list || [];
        const fl = res.data.formularios_list || [];
        const al = res.data.alojamientos_list || [];
        if (pl.length > 0) {
            const sec = document.createElement('li');
            sec.className = 'list-group-item small fw-bold text-danger bg-light';
            sec.textContent = (t?.delete_modal_list_protocolos ?? 'Protocolos que se eliminarán:');
            listEl.appendChild(sec);
            pl.forEach(function(p) {
                const li = document.createElement('li');
                li.className = 'list-group-item small ps-4';
                li.textContent = (p.nprotA || '') + ' — ' + (p.tituloA || '');
                listEl.appendChild(li);
            });
        }
        if (fl.length > 0) {
            const sec = document.createElement('li');
            sec.className = 'list-group-item small fw-bold text-danger bg-light';
            sec.textContent = (t?.delete_modal_list_formularios ?? 'Formularios que se eliminarán:');
            listEl.appendChild(sec);
            fl.forEach(function(f) {
                const li = document.createElement('li');
                li.className = 'list-group-item small ps-4';
                li.textContent = '#' + (f.idformA || '') + ' ' + (f.tipo_nombre || f.tipoA || '') + (f.categoria ? ' (' + f.categoria + ')' : '') + (f.nprot ? ' — Protocolo ' + f.nprot : '');
                listEl.appendChild(li);
            });
        }
        if (al.length > 0) {
            const sec = document.createElement('li');
            sec.className = 'list-group-item small fw-bold text-danger bg-light';
            sec.textContent = (t?.delete_modal_list_alojamientos ?? 'Alojamientos que se eliminarán:');
            listEl.appendChild(sec);
            al.slice(0, 100).forEach(function(a) {
                const li = document.createElement('li');
                li.className = 'list-group-item small ps-4';
                li.textContent = 'Historia ' + (a.historia || '') + (a.idprotA ? ' (Protocolo ' + a.idprotA + ')' : '');
                listEl.appendChild(li);
            });
            if (al.length > 100) {
                const more = document.createElement('li');
                more.className = 'list-group-item small ps-4 text-muted';
                more.textContent = '... y ' + (al.length - 100) + ' más.';
                listEl.appendChild(more);
            }
        }
        document.getElementById('delete-password').value = '';
        document.getElementById('delete-code').value = '';
        const codeSentEl = document.getElementById('delete-code-sent');
        if (res.data.code_sent) {
            codeSentEl.textContent = t?.delete_code_sent ?? 'Código enviado a tu correo.';
            codeSentEl.classList.remove('d-none');
        } else {
            codeSentEl.classList.add('d-none');
        }
        modalUser.hide();
        modalDeleteFull.show();
    } catch (e) {
        (window.mostrarNotificacion || alert)(t?.delete_error ?? 'Error');
        console.error(e);
    }
}

async function confirmarEliminacionTotal() {
    if (!deletePreviewUserId || !deletePreviewData) return;
    const password = document.getElementById('delete-password').value.trim();
    const code = document.getElementById('delete-code').value.trim();
    const t = window.txt?.superadmin_usuarios_global;
    if (!password || !code) {
        (window.mostrarNotificacion || alert)(t?.delete_modal_password ?? 'Ingresa contraseña y código.');
        return;
    }
    const btn = document.getElementById('btn-confirm-delete-full');
    btn.disabled = true;
    try {
        const res = await API.request('/superadmin/usuarios/delete-full', 'POST', {
            id: parseInt(deletePreviewUserId, 10),
            password,
            code
        });
        if (res.status === 'success') {
            modalDeleteFull.hide();
            deletePreviewUserId = null;
            deletePreviewData = null;
            await cargarUsuarios();
            (window.mostrarNotificacion || alert)(t?.delete_success ?? res.message);
        } else {
            (window.mostrarNotificacion || alert)(res.message || (t?.delete_error ?? 'Error'));
        }
    } catch (e) {
        (window.mostrarNotificacion || alert)(e?.message || (t?.delete_error ?? 'Error'));
        console.error(e);
    } finally {
        btn.disabled = false;
    }
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