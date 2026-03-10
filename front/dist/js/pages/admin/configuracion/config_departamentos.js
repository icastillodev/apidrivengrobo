import { API } from '../../../api.js';

let deptosList = [];
let orgsList = [];

export async function initConfigDeptos() {
    const instId = localStorage.getItem('instId');
    loadData(instId);

    // Eventos de Formularios
    document.getElementById('form-depto').onsubmit = (e) => saveDepto(e, instId);
    document.getElementById('form-org').onsubmit = (e) => saveOrg(e, instId);
}

async function loadData(instId) {
    try {
        const res = await API.request(`/admin/config/deptos-init?inst=${instId}`);
        if (res.status === 'success') {
            deptosList = res.data.deptos;
            orgsList = res.data.orgs;
            renderDeptos();
            renderOrgs();
        }
    } catch (e) { console.error(e); }
}

/* --- DEPARTAMENTOS --- */
function renderDeptos() {
    const tbody = document.getElementById('table-deptos');
    tbody.innerHTML = '';
    
    if(deptosList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No hay departamentos registrados</td></tr>`;
        return;
    }

    deptosList.forEach(d => {
        const esExterno = Number(d.externodepto) === 2;
        const labelInterno = window.txt?.config_departamentos?.badge_interno || 'Interno';
        const labelExterno = window.txt?.config_departamentos?.badge_externo || 'Externo';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-4 fw-bold text-dark">${d.NombreDeptoA}</td>
            <td class="small text-muted">${d.DetalledeptoA || '-'}</td>
            <td><span class="badge bg-light text-dark border">${(d.NombreOrg && d.NombreOrg.trim()) ? d.NombreOrg : (window.txt?.generales?.sin_organizacion || '– (sin organización)')}</span></td>
            <td>
                <span class="badge ${esExterno ? 'bg-danger text-white' : 'bg-success text-white'}">
                    ${esExterno ? labelExterno : labelInterno}
                </span>
            </td>
            <td class="text-end pe-4">
                <button class="btn btn-sm btn-light border" onclick="window.editDepto(${d.iddeptoA})"><i class="bi bi-pencil-fill text-info"></i></button>
                <button class="btn btn-sm btn-light border" onclick="window.deleteDepto(${d.iddeptoA})"><i class="bi bi-trash-fill text-danger"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openModalDepto = (id = null) => {
    const form = document.getElementById('form-depto');
    form.reset();
    document.getElementById('depto-id').value = "";
    
    // Llenar select de organismos
    const sel = document.getElementById('depto-org');
    sel.innerHTML = '<option value="">Seleccione...</option>';
    orgsList.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.IdOrganismo;
        opt.text = o.NombreOrganismoSimple;
        sel.appendChild(opt);
    });

    // Por defecto, departamento interno
    const radioInterno = document.getElementById('depto-interno');
    const radioExterno = document.getElementById('depto-externo');
    if (radioInterno && radioExterno) {
        radioInterno.checked = true;
        radioExterno.checked = false;
    }

    // Al cambiar de organismo, sugerir interno/externo según organismo (solo para nuevos o cuando el usuario cambie)
    sel.onchange = () => {
        const selected = orgsList.find(o => String(o.IdOrganismo) === sel.value);
        if (!selected || !radioInterno || !radioExterno) return;
        const esOrgExterno = Number(selected.externoorganismo) === 2;
        radioInterno.checked = !esOrgExterno;
        radioExterno.checked = esOrgExterno;
    };

    if (id) {
        const d = deptosList.find(x => x.iddeptoA == id);
        if (d) {
            document.getElementById('depto-id').value = d.iddeptoA;
            document.getElementById('depto-nombre').value = d.NombreDeptoA;
            document.getElementById('depto-detalle').value = d.DetalledeptoA;
            sel.value = d.organismopertenece;

            if (radioInterno && radioExterno) {
                const esExterno = Number(d.externodepto) === 2;
                radioInterno.checked = !esExterno;
                radioExterno.checked = esExterno;
            }
        }
    }
    
    new bootstrap.Modal(document.getElementById('modal-depto')).show();
};
window.editDepto = window.openModalDepto;

async function saveDepto(e, instId) {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.append('instId', instId);

    // [NUEVO] - Limpieza del ID de Organismo antes de enviar
    if (!fd.get('idOrg') || fd.get('idOrg').trim() === '') {
        fd.set('idOrg', ''); // Lo forzamos a vacío absoluto para que PHP lo detecte fácil
    }

    const modalEl = document.getElementById('modal-depto');
    const modal = bootstrap.Modal.getInstance(modalEl);
    modal.hide();

    Swal.fire({ title: 'Guardando...', didOpen: () => Swal.showLoading() });

    try {
        const res = await API.request('/admin/config/depto/save', 'POST', fd);
        if (res.status === 'success') {
            await Swal.fire('Éxito', 'Departamento guardado.', 'success');
            loadData(instId);
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch (err) { 
        Swal.fire('Error', 'Fallo de red', 'error'); 
    }
}

window.deleteDepto = async (id) => {
    const confirm = await Swal.fire({ title: '¿Eliminar?', text: "Esta acción es irreversible.", icon: 'warning', showCancelButton: true });
    if (!confirm.isConfirmed) return;

    try {
        const fd = new FormData(); fd.append('idDepto', id);
        const res = await API.request('/admin/config/depto/delete', 'POST', fd);
        if (res.status === 'success') {
            Swal.fire('Eliminado', '', 'success');
            loadData(localStorage.getItem('instId'));
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch (e) { Swal.fire('Error', 'No se pudo eliminar', 'error'); }
};


/* --- ORGANISMOS --- */
function renderOrgs() {
    const tbody = document.getElementById('table-orgs');
    tbody.innerHTML = '';

    orgsList.forEach(o => {
        const esExterno = Number(o.externoorganismo) === 2;
        const labelInterno = window.txt?.config_departamentos?.badge_interno || 'Interno';
        const labelExterno = window.txt?.config_departamentos?.badge_externo || 'Externo';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-4 fw-bold">${o.NombreOrganismoSimple}</td>
            <td class="small text-truncate" style="max-width: 200px;">${o.NombreOrganismoCompleto}</td>
            <td class="small">${o.ContactoOrgnismo || '-'}</td>
            <td class="small">${o.PaisOrganismo || '-'}</td>
            <td>
                <span class="badge ${esExterno ? 'bg-danger text-white' : 'bg-success text-white'}">
                    ${esExterno ? labelExterno : labelInterno}
                </span>
            </td>
            <td class="text-end pe-4">
                <button class="btn btn-sm btn-light border" onclick="window.editOrg(${o.IdOrganismo})"><i class="bi bi-pencil-fill text-secondary"></i></button>
                <button class="btn btn-sm btn-light border" onclick="window.deleteOrg(${o.IdOrganismo})"><i class="bi bi-trash-fill text-danger"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openModalOrg = (id = null) => {
    const form = document.getElementById('form-org');
    form.reset();
    document.getElementById('org-id').value = "";

    const radioInterno = document.getElementById('org-interno');
    const radioExterno = document.getElementById('org-externo');
    if (radioInterno && radioExterno) {
        radioInterno.checked = true;
        radioExterno.checked = false;
    }

    if (id) {
        const o = orgsList.find(x => x.IdOrganismo == id);
        if (o) {
            document.getElementById('org-id').value = o.IdOrganismo;
            document.getElementById('org-simple').value = o.NombreOrganismoSimple;
            document.getElementById('org-completo').value = o.NombreOrganismoCompleto;
            document.getElementById('org-contacto').value = o.ContactoOrgnismo;
            document.getElementById('org-correo').value = o.CorreoOrganismo;
            document.getElementById('org-dir').value = o.DireccionOrganismo;
            document.getElementById('org-pais').value = o.PaisOrganismo;

            if (radioInterno && radioExterno) {
                const esExterno = Number(o.externoorganismo) === 2;
                radioInterno.checked = !esExterno;
                radioExterno.checked = esExterno;
            }
        }
    }
    new bootstrap.Modal(document.getElementById('modal-org')).show();
};
window.editOrg = window.openModalOrg;

async function saveOrg(e, instId) {
    e.preventDefault();
    const fd = new FormData(e.target);
    
    const modalEl = document.getElementById('modal-org');
    const modal = bootstrap.Modal.getInstance(modalEl);
    modal.hide();

    Swal.fire({ title: 'Guardando...', didOpen: () => Swal.showLoading() });

    try {
        const res = await API.request('/admin/config/org/save', 'POST', fd);
        if (res.status === 'success') {
            await Swal.fire('Éxito', 'Organismo guardado.', 'success');
            loadData(instId);
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch (err) { Swal.fire('Error', 'Fallo de red', 'error'); }
}

window.deleteOrg = async (id) => {
    const confirm = await Swal.fire({ title: '¿Eliminar Organismo?', text: "Verifique que no tenga departamentos asociados.", icon: 'warning', showCancelButton: true });
    if (!confirm.isConfirmed) return;

    try {
        const fd = new FormData(); fd.append('idOrg', id);
        const res = await API.request('/admin/config/org/delete', 'POST', fd);
        if (res.status === 'success') {
            Swal.fire('Eliminado', '', 'success');
            loadData(localStorage.getItem('instId'));
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch (e) { Swal.fire('Error', 'No se pudo eliminar', 'error'); }
};