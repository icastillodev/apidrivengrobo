import { API } from '../../../api.js';

function tf() {
    return window.txt?.config_institucion || {};
}

function escCfg(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escAttr(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/'/g, '&#39;');
}

function servicesLoadingRow() {
    const t = tf();
    const msg = escCfg(t.tabla_servicios_cargando || window.txt?.generales?.msg_cargando || '…');
    return `<tr><td colspan="4" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success mb-2" role="status"></div><div class="small">${msg}</div></td></tr>`;
}

function renderServicesLoadError() {
    const tbody = document.getElementById('table-services-body');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-danger small">${escCfg(tf().tabla_error_servicios)}</td></tr>`;
}

export async function initConfigInstitution(instId) {
    if (!instId) {
        console.error('Falta instId para cargar la configuración');
        return;
    }

    const LOGO_BASE_PATH = '../../../dist/multimedia/imagenes/logos/';

    const dropArea = document.getElementById('drop-area');
    const inputLogo = document.getElementById('in-logo');
    const previewImg = document.getElementById('img-preview');
    const previewCont = document.getElementById('preview-container');
    const uploadMsg = document.getElementById('upload-msg');

    dropArea.addEventListener('click', () => inputLogo.click());

    inputLogo.addEventListener('change', function () {
        handleFiles(this.files);
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('dragover'), false);
    });

    dropArea.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files), false);

    function handleFiles(files) {
        const t = tf();
        if (files.length > 0) {
            const file = files[0];
            if (file.type !== 'image/png') {
                Swal.fire(t.swal_error_titulo || 'Error', t.swal_png_solo || '', 'error');
                return;
            }
            if (file.size > 3 * 1024 * 1024) {
                Swal.fire(t.swal_error_titulo || 'Error', t.swal_logo_max_mb || '', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewCont.classList.remove('d-none');
                uploadMsg.classList.add('d-none');

                if (inputLogo.files.length === 0) {
                    const dT = new DataTransfer();
                    dT.items.add(file);
                    inputLogo.files = dT.files;
                }
            };
            reader.readAsDataURL(file);
        }
    }

    await loadData({ instId, boot: true });

    document.getElementById('form-institution').onsubmit = async (e) => {
        e.preventDefault();

        const fd = new FormData(e.target);
        fd.append('instId', instId);

        fd.append('otrosceuas', 0);
        fd.append('LogoEnPdf', document.getElementById('check-logopdf').checked ? 1 : 0);

        const t = tf();
        Swal.fire({ title: t.swal_guardando || '…', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

        try {
            const res = await API.request('/admin/config/institution/update', 'POST', fd);
            if (res.status === 'success') {
                Swal.fire({
                    title: t.swal_actualizado_titulo || '',
                    text: t.swal_actualizado_texto || '',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });

                await loadData({ instId, boot: false });

                previewCont.classList.add('d-none');
                uploadMsg.classList.remove('d-none');
                inputLogo.value = '';
            } else {
                Swal.fire(t.swal_error_titulo || 'Error', res.message || '', 'error');
            }
        } catch (err) {
            console.error(err);
            Swal.fire(tf().swal_error_titulo || 'Error', tf().swal_error_conexion || '', 'error');
        }
    };

    document.getElementById('btn-add-service').onclick = async () => {
        const t = tf();
        const nombre = document.getElementById('srv-nombre').value;
        const medida = document.getElementById('srv-medida').value;
        const cant = document.getElementById('srv-cant').value;

        if (!nombre.trim()) {
            Swal.fire(t.swal_atencion || '', t.swal_servicio_nombre_obligatorio || '', 'warning');
            return;
        }

        const btn = document.getElementById('btn-add-service');
        const spin = document.createElement('span');
        spin.className = 'spinner-border spinner-border-sm me-1';
        spin.setAttribute('role', 'status');
        btn.disabled = true;
        btn.insertBefore(spin, btn.firstChild);

        try {
            const res = await API.request('/admin/config/institution/service/add', 'POST', {
                instId,
                nombre,
                medida,
                cant
            });

            if (res.status === 'success') {
                document.getElementById('srv-nombre').value = '';
                document.getElementById('srv-medida').value = '';
                document.getElementById('srv-cant').value = '1';

                await loadServices(instId);
            } else {
                Swal.fire(t.swal_error_titulo || 'Error', res.message || '', 'error');
            }
        } catch (e) {
            console.error(e);
            Swal.fire(t.swal_error_titulo || 'Error', t.swal_no_agregar_servicio || '', 'error');
        } finally {
            btn.querySelector('.spinner-border')?.remove();
            btn.disabled = false;
        }
    };

    const editServiceModalEl = document.getElementById('modal-edit-service');
    const editServiceModal = editServiceModalEl ? bootstrap.Modal.getOrCreateInstance(editServiceModalEl) : null;
    const formEditService = document.getElementById('form-edit-service');
    if (formEditService) {
        formEditService.onsubmit = async (e) => {
            e.preventDefault();
            const t = tf();
            const id = document.getElementById('edit-srv-id').value;
            const nombre = document.getElementById('edit-srv-nombre').value.trim();
            const medida = document.getElementById('edit-srv-medida').value.trim();
            const cant = document.getElementById('edit-srv-cant').value;

            if (!id || !nombre) {
                Swal.fire(t.swal_atencion || '', t.swal_editar_faltan_datos || '', 'warning');
                return;
            }

            try {
                const res = await API.request('/admin/config/institution/service/update', 'POST', {
                    id,
                    nombre,
                    medida,
                    cant
                });

                if (res.status === 'success') {
                    editServiceModal?.hide();
                    Swal.fire({
                        title: t.swal_servicio_actualizado || '',
                        icon: 'success',
                        timer: 1000,
                        showConfirmButton: false
                    });
                    await loadServices(instId);
                } else {
                    Swal.fire(t.swal_error_titulo || 'Error', res.message || t.swal_no_actualizar_servicio || '', 'error');
                }
            } catch (error) {
                console.error(error);
                Swal.fire(tf().swal_error_titulo || 'Error', tf().swal_error_conexion || '', 'error');
            }
        };
    }

    async function loadData({ instId: id, boot = false }) {
        const tbody = document.getElementById('table-services-body');
        if (!boot && tbody) tbody.innerHTML = servicesLoadingRow();

        try {
            const res = await API.request(`/admin/config/institution?inst=${id}&t=${Date.now()}`);

            if (res.status === 'success') {
                const d = res.data;

                document.getElementById('in-nombre').value = d.NombreCompletoInst || '';
                document.getElementById('in-web').value = d.Web || '';
                document.getElementById('in-correo').value = d.InstCorreo || '';
                document.getElementById('in-dir').value = d.InstDir || '';
                document.getElementById('in-contacto').value = d.InstContacto || '';
                document.getElementById('in-localidad').value = d.Localidad || '';
                document.getElementById('in-pais').value = d.Pais || '';

                document.getElementById('sel-moneda').value = d.Moneda || 'UYU';
                document.getElementById('sel-idioma').value = d.idioma || 'es';

                document.getElementById('check-logopdf').checked = (d.LogoEnPdf == 1);
                localStorage.setItem('instLogoEnPdf', d.LogoEnPdf == 1 ? '1' : '0');

                const currentLogoBox = document.getElementById('current-logo-container');
                const imgCurrent = document.getElementById('img-current');

                if (d.Logo && d.Logo.trim() !== '') {
                    imgCurrent.src = `${LOGO_BASE_PATH}${d.Logo}?t=${Date.now()}`;
                    currentLogoBox.classList.remove('d-none');
                } else {
                    currentLogoBox.classList.add('d-none');
                }

                renderServices(Array.isArray(d.servicios) ? d.servicios : []);
            } else {
                Swal.fire(tf().swal_error_titulo || 'Error', tf().error_carga_institucion || '', 'error');
                renderServicesLoadError();
            }
        } catch (e) {
            console.error('Error loading data:', e);
            renderServicesLoadError();
            Swal.fire(tf().swal_error_titulo || 'Error', tf().error_carga_institucion || '', 'error');
        }
    }

    async function loadServices(id) {
        const tbody = document.getElementById('table-services-body');
        if (tbody) tbody.innerHTML = servicesLoadingRow();

        try {
            const res = await API.request(`/admin/config/institution?inst=${id}&t=${Date.now()}`);
            if (res.status === 'success') {
                renderServices(Array.isArray(res.data.servicios) ? res.data.servicios : []);
            } else {
                renderServicesLoadError();
            }
        } catch (e) {
            console.error(e);
            renderServicesLoadError();
        }
    }

    function renderServices(list) {
        const tbody = document.getElementById('table-services-body');
        tbody.innerHTML = '';

        const t = tf();

        if (!list || list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted small py-3">${escCfg(t.tabla_sin_servicios)}</td></tr>`;
            return;
        }

        list.forEach(s => {
            const isChecked = (s.Habilitado == 1) ? 'checked' : '';
            const tr = document.createElement('tr');

            tr.id = `row-service-${s.IdServicioInst}`;

            const medidaLbl = (s.MedidaServicioInst || '').trim() || (t.medida_unidad_defecto || '');
            const cantStr = String(s.CantidadPorMedidaInst ?? 1);
            const refCell = `${escCfg(cantStr)} ${escCfg(medidaLbl)}`.trim();

            tr.innerHTML = `
                <td class="fw-bold text-dark">${escCfg(s.NombreServicioInst)}</td>
                <td class="small text-muted">${refCell}</td>

                <td class="text-center align-middle">
                    <div class="form-check form-switch d-flex justify-content-center">
                        <input class="form-check-input srv-toggle" type="checkbox" role="switch"
                            data-id="${escAttr(String(s.IdServicioInst))}" ${isChecked} style="cursor: pointer;">
                    </div>
                </td>

                <td class="text-end align-middle">
                    <button type="button" class="btn btn-sm btn-link text-primary p-0 border-0 me-2 btn-edit-srv"
                        data-id="${escAttr(String(s.IdServicioInst))}"
                        data-nombre="${escAttr(s.NombreServicioInst || '')}"
                        data-medida="${escAttr(s.MedidaServicioInst || '')}"
                        data-cant="${escAttr(String(s.CantidadPorMedidaInst ?? 1))}"
                        title="${escAttr(t.title_editar_servicio)}">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-link text-danger p-0 border-0 btn-del-srv"
                        data-id="${escAttr(String(s.IdServicioInst))}"
                        title="${escAttr(t.title_eliminar_servicio)}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('.srv-toggle').forEach(el => {
            el.onchange = async function () {
                try {
                    await API.request('/admin/config/institution/service/toggle', 'POST', { id: this.dataset.id });
                } catch (e) {
                    console.error(e);
                    this.checked = !this.checked;
                    Swal.fire(tf().swal_error_titulo || 'Error', tf().swal_toggle_error || '', 'error');
                }
            };
        });

        tbody.querySelectorAll('.btn-del-srv').forEach(el => {
            el.onclick = async function () {
                const idService = this.dataset.id;
                const tt = tf();

                const result = await Swal.fire({
                    title: tt.swal_borrar_titulo || '',
                    text: tt.swal_borrar_texto || '',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: tt.swal_borrar_confirm || '',
                    cancelButtonText: tt.swal_borrar_cancel || ''
                });

                if (result.isConfirmed) {
                    try {
                        const res = await API.request('/admin/config/institution/service/delete', 'POST', { id: idService });

                        if (res.status === 'success') {
                            const row = document.getElementById(`row-service-${idService}`);
                            if (row) row.remove();

                            const Toast = Swal.mixin({
                                toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, timerProgressBar: true
                            });
                            Toast.fire({ icon: 'success', title: tt.swal_toast_servicio_eliminado || '' });

                            await loadServices(instId);
                        } else {
                            Swal.fire(tt.swal_error_titulo || 'Error', res.message || tt.swal_error_eliminar || '', 'error');
                        }
                    } catch (e) {
                        console.error(e);
                        Swal.fire(tt.swal_error_titulo || 'Error', tt.swal_error_conexion || '', 'error');
                    }
                }
            };
        });

        tbody.querySelectorAll('.btn-edit-srv').forEach(el => {
            el.onclick = function () {
                document.getElementById('edit-srv-id').value = this.dataset.id || '';
                document.getElementById('edit-srv-nombre').value = this.dataset.nombre || '';
                document.getElementById('edit-srv-medida').value = this.dataset.medida || '';
                document.getElementById('edit-srv-cant').value = this.dataset.cant || '1';
                editServiceModal?.show();
            };
        });
    }
}
