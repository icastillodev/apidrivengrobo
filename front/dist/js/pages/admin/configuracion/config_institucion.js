import { API } from '../../../api.js';

export async function initConfigInstitution(instId) {
    if(!instId) {
        console.error("Falta instId para cargar la configuración");
        return;
    }

    // RUTA BASE PARA VISUALIZAR LOGOS (Desde la ubicación del HTML)
    const LOGO_BASE_PATH = '../../../dist/multimedia/imagenes/logos/';

    // ============================================================
    // 1. LOGICA DE DRAG & DROP DEL LOGO
    // ============================================================
    const dropArea = document.getElementById('drop-area');
    const inputLogo = document.getElementById('in-logo');
    const previewImg = document.getElementById('img-preview');
    const previewCont = document.getElementById('preview-container');
    const uploadMsg = document.getElementById('upload-msg');

    // Al hacer click en el área, abrir selector de archivos
    dropArea.addEventListener('click', () => inputLogo.click());

    // Al seleccionar archivo manual
    inputLogo.addEventListener('change', function() {
        handleFiles(this.files);
    });

    // Eventos de arrastre
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
        if (files.length > 0) {
            const file = files[0];
            // Validaciones
            if (file.type !== 'image/png') return Swal.fire('Error', 'Solo se permiten archivos PNG', 'error');
            if (file.size > 3 * 1024 * 1024) return Swal.fire('Error', 'El archivo supera los 3MB', 'error');

            // Previsualización
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewCont.classList.remove('d-none');
                uploadMsg.classList.add('d-none'); // Ocultar texto de ayuda
                
                // Asignar al input si vino por drop (necesario para el FormData)
                if(inputLogo.files.length === 0){
                    const dT = new DataTransfer();
                    dT.items.add(file);
                    inputLogo.files = dT.files;
                }
            }
            reader.readAsDataURL(file);
        }
    }

    // ============================================================
    // 2. CARGA INICIAL DE DATOS
    // ============================================================
    await loadData();

    // ============================================================
    // 3. GUARDAR FORMULARIO PRINCIPAL (Institución + Logo)
    // ============================================================
    document.getElementById('form-institution').onsubmit = async (e) => {
        e.preventDefault();
        
        const fd = new FormData(e.target);
        fd.append('instId', instId);
        
        // Checkboxes: HTML no los envía si no están marcados, los forzamos
        fd.append('otrosceuas', document.getElementById('check-otrosceuas').checked ? 1 : 0);
        fd.append('LogoEnPdf', document.getElementById('check-logopdf').checked ? 1 : 0);

        Swal.fire({ title: 'Guardando...', didOpen: () => Swal.showLoading() });

        try {
            const res = await API.request('/admin/config/institution/update', 'POST', fd);
            if (res.status === 'success') {
                Swal.fire({
                    title: '¡Actualizado!',
                    text: 'La información se guardó correctamente.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                
                // Recargar datos para ver el nuevo logo si cambió
                loadData(); 
                
                // Resetear área de subida
                previewCont.classList.add('d-none');
                uploadMsg.classList.remove('d-none');
                inputLogo.value = ''; // Limpiar input file
            } else {
                Swal.fire('Error', res.message, 'error');
            }
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Error de conexión con el servidor', 'error');
        }
    };

    // ============================================================
    // 4. GESTIÓN DE SERVICIOS (Agregar)
    // ============================================================
    document.getElementById('btn-add-service').onclick = async () => {
        const nombre = document.getElementById('srv-nombre').value;
        const medida = document.getElementById('srv-medida').value;
        const cant = document.getElementById('srv-cant').value;

        if(!nombre.trim()) return Swal.fire('Atención', 'El nombre del servicio es obligatorio', 'warning');

        // Botón loading state
        const btn = document.getElementById('btn-add-service');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
        btn.disabled = true;

        try {
            const res = await API.request('/admin/config/institution/service/add', 'POST', { 
                instId, 
                nombre, 
                medida, 
                cant 
            });

            if(res.status === 'success') {
                // Limpiar inputs
                document.getElementById('srv-nombre').value = '';
                document.getElementById('srv-medida').value = '';
                document.getElementById('srv-cant').value = '1';
                
                // Recargar lista
                loadServices();
            } else {
                Swal.fire('Error', res.message, 'error');
            }
        } catch(e) {
            console.error(e);
            Swal.fire('Error', 'No se pudo agregar el servicio', 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    };

    // ============================================================
    // FUNCIONES AUXILIARES
    // ============================================================

    // Carga todos los datos de la institución
    async function loadData() {
        try {
            // Usamos timestamp para evitar caché agresivo del navegador en imágenes o datos
            const res = await API.request(`/admin/config/institution?inst=${instId}&t=${Date.now()}`);
            
            if (res.status === 'success') {
                const d = res.data;
                
                // Inputs de Texto
                document.getElementById('in-nombre').value = d.NombreCompletoInst || '';
                document.getElementById('in-web').value = d.Web || '';
                document.getElementById('in-correo').value = d.InstCorreo || '';
                document.getElementById('in-dir').value = d.InstDir || '';
                document.getElementById('in-contacto').value = d.InstContacto || '';
                document.getElementById('in-localidad').value = d.Localidad || '';
                document.getElementById('in-pais').value = d.Pais || '';
                
                // Selects
                document.getElementById('sel-moneda').value = d.Moneda || 'UYU';
                document.getElementById('sel-idioma').value = d.idioma || 'es'; // Importante: campo 'idioma'
                
                // Checkboxes
                document.getElementById('check-otrosceuas').checked = (d.otrosceuas == 1);
                document.getElementById('check-logopdf').checked = (d.LogoEnPdf == 1);

                // VISOR DE LOGO ACTUAL
                const currentLogoBox = document.getElementById('current-logo-container');
                const imgCurrent = document.getElementById('img-current');
                
                if(d.Logo && d.Logo.trim() !== "") {
                    // Agregamos timestamp para forzar recarga de la imagen si cambió pero tiene mismo nombre
                    imgCurrent.src = `${LOGO_BASE_PATH}${d.Logo}?t=${Date.now()}`; 
                    currentLogoBox.classList.remove('d-none');
                } else {
                    currentLogoBox.classList.add('d-none');
                }

                // Renderizar tabla de servicios
                renderServices(d.servicios);
            } else {
                Swal.fire('Error', 'No se pudieron cargar los datos de la institución', 'error');
            }
        } catch (e) {
            console.error("Error loading data:", e);
        }
    }

    // Carga solo la lista de servicios (para refrescar tras agregar/borrar)
    async function loadServices() {
        // Timestamp crítico aquí para asegurar que trae la lista POST-Borrado
        const res = await API.request(`/admin/config/institution?inst=${instId}&t=${Date.now()}`);
        if(res.status === 'success') renderServices(res.data.servicios);
    }

    // Renderiza la tabla HTML
    function renderServices(list) {
        const tbody = document.getElementById('table-services-body');
        tbody.innerHTML = '';

        if(!list || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted small py-3">No hay servicios registrados en el catálogo.</td></tr>';
            return;
        }

        list.forEach(s => {
            const isChecked = (s.Habilitado == 1) ? 'checked' : '';
            const tr = document.createElement('tr');
            
            // Asignamos ID a la fila para poder borrarla visualmente rápido
            tr.id = `row-service-${s.IdServicioInst}`;

            tr.innerHTML = `
                <td class="fw-bold text-dark">${s.NombreServicioInst}</td>
                <td class="small text-muted">${s.CantidadPorMedidaInst || 1} ${s.MedidaServicioInst || 'unid.'}</td>
                
                <td class="text-center align-middle">
                    <div class="form-check form-switch d-flex justify-content-center">
                        <input class="form-check-input srv-toggle" type="checkbox" role="switch" 
                            data-id="${s.IdServicioInst}" ${isChecked} style="cursor: pointer;">
                    </div>
                </td>

                <td class="text-end align-middle">
                    <button class="btn btn-sm btn-link text-danger p-0 border-0 btn-del-srv" 
                        data-id="${s.IdServicioInst}" title="Eliminar permanentemente">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // --- ASIGNAR EVENTOS ---

        // 1. Toggle Switch
        tbody.querySelectorAll('.srv-toggle').forEach(el => {
            el.onchange = async function() {
                try {
                    // Llamada silenciosa (sin loader) para fluidez
                    await API.request('/admin/config/institution/service/toggle', 'POST', { id: this.dataset.id });
                } catch(e) {
                    console.error(e);
                    // Si falla, revertir el switch visualmente
                    this.checked = !this.checked;
                    Swal.fire('Error', 'No se pudo cambiar el estado', 'error');
                }
            };
        });

        // 2. Botón Eliminar
        tbody.querySelectorAll('.btn-del-srv').forEach(el => {
            el.onclick = async function() {
                const idService = this.dataset.id;
                
                const result = await Swal.fire({
                    title: '¿Estás seguro?',
                    text: "El servicio se eliminará del catálogo permanentemente.",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Sí, eliminar',
                    cancelButtonText: 'Cancelar'
                });

                if (result.isConfirmed) {
                    try {
                        const res = await API.request('/admin/config/institution/service/delete', 'POST', { id: idService });
                        
                        if (res.status === 'success') {
                            // 1. Eliminación visual inmediata (UX rápida)
                            const row = document.getElementById(`row-service-${idService}`);
                            if(row) row.remove();

                            // 2. Feedback discreto
                            const Toast = Swal.mixin({
                                toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, timerProgressBar: true
                            });
                            Toast.fire({ icon: 'success', title: 'Servicio eliminado' });

                            // 3. Recarga de seguridad (por si quedó vacía la tabla poner el mensaje de "No hay servicios")
                            loadServices(); 
                        } else {
                            Swal.fire('Error', res.message || 'Error al eliminar', 'error');
                        }
                    } catch (e) {
                        console.error(e);
                        Swal.fire('Error', 'Error de conexión', 'error');
                    }
                }
            };
        });
    }
}