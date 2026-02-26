// dist/js/pages/admin/alojamientos/RegistroUI.js
import { API } from '../../../api.js';
import { showLoader, hideLoader } from '../../../components/LoaderComponent.js';
import { AlojamientoState, loadAlojamientos } from '../alojamientos.js';

export const RegistroUI = {
    // Variables de estado consolidadas (¡Sin duplicados!)
    selections: { idprotA: null, IdUsrA: null, idespA: null, IdTipoAlojamiento: null, departamento: null },
    currentData: { protocolos: [], usuarios: [], deptos: [] },

    init() {
        // Enlaces principales
        window.openModalRegistro = this.abrirModalRegistro.bind(this);
        window.guardarNuevoAlojamiento = this.guardarNuevoAlojamiento.bind(this);

        // Funciones expuestas para los onclick
        window.regSelectProtocolo = this.selectProtocolo.bind(this);
        window.regSelectUsuario = this.selectUsuario.bind(this);
        window.regSelectEspecie = this.selectEspecie.bind(this);
        window.regSelectTipo = this.selectTipo.bind(this);

        // Buscador de Protocolos
        document.getElementById('reg-search-prot')?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filas = document.querySelectorAll('#reg-grid-protocolos tr');
            filas.forEach(fila => {
                fila.style.display = fila.innerText.toLowerCase().includes(term) ? '' : 'none';
            });
        });

        // Buscador de Usuarios
        document.getElementById('reg-search-user')?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const items = document.querySelectorAll('#reg-list-usuarios .list-group-item');
            items.forEach(item => {
                item.style.display = item.innerText.toLowerCase().includes(term) ? '' : 'none';
            });
        });
    },

    async abrirModalRegistro() {
        this.selections = { idprotA: null, IdUsrA: null, idespA: null, IdTipoAlojamiento: null, departamento: null };
        
        document.getElementById('step-2-usuario').classList.add('d-none');
        document.getElementById('step-3-detalles').classList.add('d-none');
        document.getElementById('step-4-final').classList.add('d-none');
        document.getElementById('btn-save-reg').classList.add('d-none');
        document.getElementById('reg-search-prot').value = '';
        document.getElementById('reg-search-user').value = '';
        document.getElementById('reg-fecha').valueAsDate = new Date();
        document.getElementById('reg-cantidad').value = 1;
        document.getElementById('reg-obs').value = '';
        document.getElementById('reg-select-depto').innerHTML = '<option value="">Esperando protocolo...</option>';

        showLoader();
        // Llamamos a las 3 promesas en paralelo
        await Promise.all([this.loadProtocolos(), this.loadUsuarios(), this.loadDeptos()]);
        hideLoader();

        new bootstrap.Modal(document.getElementById('modal-registro')).show();
    },

    async loadDeptos() {
        try {
            const res = await API.request('/deptos/list');
            if (res.status === 'success') {
                this.currentData.deptos = res.data;
            }
        } catch(e) { console.error(e); }
    },

    async loadProtocolos() {
        try {
            const res = await API.request(`/protocoloexpe/list?inst=${AlojamientoState.instId}`);
            if (res.status === 'success') {
                this.currentData.protocolos = res.data;
                const tbody = document.getElementById('reg-grid-protocolos');
                
                tbody.innerHTML = res.data.map(p => {
                    const responsable = p.ResponsableFormat || `ID: ${p.IdUsrA}`;
                    const especies = p.EspeciesList || 'A definir';

                    return `
                    <tr id="reg-row-prot-${p.idprotA}" onclick="window.regSelectProtocolo(${p.idprotA})" class="transition-colors">
                        <td class="fw-bold text-muted">#${p.idprotA}</td>
                        <td class="fw-bold text-primary">${p.nprotA}</td>
                        <td class="text-truncate" style="max-width: 200px;">${p.tituloA || 'Sin Título'}</td>
                        <td class="text-info fw-bold" style="font-size: 10px;">${p.DeptoFormat || '---'}</td>
                        <td class="text-success fw-bold" style="font-size: 10px;">${especies}</td>
                        <td class="text-muted" style="font-size: 10px;"><i class="bi bi-person-fill"></i> ${responsable}</td>
                    </tr>
                    `;
                }).join('');
            }
        } catch (e) { console.error("Error al cargar protocolos:", e); }
    },

    async loadUsuarios() {
        try {
            const res = await API.request(`/users/institution`);
            const list = document.getElementById('reg-list-usuarios');
            list.innerHTML = '';
            
            if (res.status === 'success') {
                this.currentData.usuarios = res.data;
                
                if (res.data.length === 0) {
                    list.innerHTML = '<div class="alert alert-warning small p-2">No hay usuarios activos.</div>';
                    return;
                }

                list.innerHTML = res.data.map(u => `
                    <div id="reg-item-usr-${u.IdUsrA}" class="list-group-item list-group-item-action py-2 border-0 border-bottom" onclick="window.regSelectUsuario(${u.IdUsrA})">
                        <div class="d-flex justify-content-between align-items-center">
                            <span><b class="text-dark">ID: ${u.IdUsrA}</b> | <span class="fw-bold">${u.NombreA || ''} ${u.ApellidoA || ''}</span></span>
                            <small class="badge bg-light text-dark border fst-italic">@${u.Usuario}</small>
                        </div>
                    </div>
                `).join('');
            }
        } catch (e) { console.error("Error cargando usuarios:", e); }
    },

    selectProtocolo(id) {
        this.selections.idprotA = id;
        
        document.querySelectorAll('#reg-grid-protocolos tr').forEach(tr => {
            tr.classList.remove('table-primary', 'border-primary');
        });
        const selectedRow = document.getElementById(`reg-row-prot-${id}`);
        if(selectedRow) selectedRow.classList.add('table-primary', 'border-primary');

        // AUTO-SELECCIONAR EL DEPARTAMENTO DEL PROTOCOLO Y BLOQUEARLO
        const prot = this.currentData.protocolos.find(p => p.idprotA == id);
        if (prot && prot.departamento) {
            this.selections.departamento = prot.departamento;
            document.getElementById('reg-select-depto').innerHTML = `<option value="${prot.departamento}">${prot.DeptoFormat}</option>`;
        } else {
            this.selections.departamento = null;
            document.getElementById('reg-select-depto').innerHTML = `<option value="">Sin departamento asignado</option>`;
        }

        this.selections.IdUsrA = null;
        document.getElementById('step-3-detalles').classList.add('d-none');
        document.getElementById('step-4-final').classList.add('d-none');
        document.getElementById('btn-save-reg').classList.add('d-none');
        document.querySelectorAll('#reg-list-usuarios .list-group-item').forEach(li => li.classList.remove('active', 'bg-success', 'text-white'));

        const step2 = document.getElementById('step-2-usuario');
        step2.classList.remove('d-none');
        step2.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    selectUsuario(id) {
        this.selections.IdUsrA = id;

        document.querySelectorAll('#reg-list-usuarios .list-group-item').forEach(li => {
            li.classList.remove('active', 'bg-success', 'text-white', 'border-success');
        });
        const selectedItem = document.getElementById(`reg-item-usr-${id}`);
        if(selectedItem) selectedItem.classList.add('active', 'bg-success', 'text-white', 'border-success');

        const step3 = document.getElementById('step-3-detalles');
        step3.classList.remove('d-none');
        step3.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        this.loadEspecies();
    },

    async loadEspecies() {
        const container = document.getElementById('reg-list-especies');
        container.innerHTML = '<div class="spinner-border spinner-border-sm text-warning"></div> Cargando...';
        
        document.getElementById('reg-list-tipos').innerHTML = '';
        document.getElementById('step-4-final').classList.add('d-none');
        document.getElementById('btn-save-reg').classList.add('d-none');

        try {
            const res = await API.request(`/protocols/current-species?id=${this.selections.idprotA}`);
            if (res.status === 'success' && res.data.length > 0) {
                container.innerHTML = res.data.map(s => `
                    <button type="button" id="reg-btn-esp-${s.idespA}" class="btn btn-outline-secondary btn-sm text-start fw-bold" onclick="window.regSelectEspecie(${s.idespA}, '${s.EspeNombreA}')">
                        <i class="bi bi-check-circle me-1 d-none" id="icon-esp-${s.idespA}"></i> ${s.EspeNombreA}
                    </button>
                `).join('');

                if (res.data.length === 1) {
                    this.selectEspecie(res.data[0].idespA, res.data[0].EspeNombreA);
                }
            } else {
                container.innerHTML = '<div class="alert alert-danger small p-2">Este protocolo no tiene especies asignadas.</div>';
            }
        } catch (e) { console.error("Error cargando especies:", e); }
    },

    selectEspecie(id, nombre) {
        this.selections.idespA = id;

        document.querySelectorAll('#reg-list-especies button').forEach(btn => {
            btn.classList.remove('btn-warning', 'text-dark');
            btn.classList.add('btn-outline-secondary');
            btn.querySelector('i').classList.add('d-none');
        });
        const selectedBtn = document.getElementById(`reg-btn-esp-${id}`);
        if(selectedBtn) {
            selectedBtn.classList.remove('btn-outline-secondary');
            selectedBtn.classList.add('btn-warning', 'text-dark');
            selectedBtn.querySelector('i').classList.remove('d-none');
        }

        this.loadTipos(id);
    },

    async loadTipos(idEsp) {
        const container = document.getElementById('reg-list-tipos');
        container.innerHTML = '<div class="spinner-border spinner-border-sm text-primary"></div> Cargando estructuras...';
        
        document.getElementById('step-4-final').classList.add('d-none');
        document.getElementById('btn-save-reg').classList.add('d-none');

        try {
            const res = await API.request(`/alojamiento/tipos-por-especie?idEsp=${idEsp}`);
            if (res.status === 'success') {
                const tipos = res.data;
                if (tipos.length > 0) {
                    container.innerHTML = tipos.map(t => `
                        <button type="button" id="reg-btn-tipo-${t.IdTipoAlojamiento}" class="btn btn-outline-secondary btn-sm text-start" onclick="window.regSelectTipo(${t.IdTipoAlojamiento}, '${t.NombreTipoAlojamiento}')">
                            <i class="bi bi-check-circle me-1 d-none" id="icon-tipo-${t.IdTipoAlojamiento}"></i> 
                            <b>${t.NombreTipoAlojamiento}</b> <span class="text-success ms-2">$${t.PrecioXunidad}</span>
                        </button>
                    `).join('');
                } else {
                    container.innerHTML = '<div class="alert alert-danger small p-2">No hay estructuras tarifadas.</div>';
                }
            }
        } catch (e) { console.error("Error cargando tipos:", e); }
    },

    selectTipo(id, nombre) {
        this.selections.IdTipoAlojamiento = id;

        document.querySelectorAll('#reg-list-tipos button').forEach(btn => {
            btn.classList.remove('btn-primary', 'text-white');
            btn.classList.add('btn-outline-secondary');
            btn.querySelector('i').classList.add('d-none');
        });
        const selectedBtn = document.getElementById(`reg-btn-tipo-${id}`);
        if(selectedBtn) {
            selectedBtn.classList.remove('btn-outline-secondary');
            selectedBtn.classList.add('btn-primary', 'text-white');
            selectedBtn.querySelector('i').classList.remove('d-none');
        }

        document.getElementById('lbl-cantidad-dinamico').innerText = `Cantidad Inicial de ${nombre.toUpperCase()}`;
        document.getElementById('reg-cantidad').placeholder = `Ej: 5`;

        const step4 = document.getElementById('step-4-final');
        step4.classList.remove('d-none');
        step4.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        document.getElementById('btn-save-reg').classList.remove('d-none');
    },

    async guardarNuevoAlojamiento() {
        const data = {
            idprotA: this.selections.idprotA,
            IdUsrA: this.selections.IdUsrA,
            departamento: this.selections.departamento, 
            TipoAnimal: this.selections.idespA,
            IdTipoAlojamiento: this.selections.IdTipoAlojamiento,
            fechavisado: document.getElementById('reg-fecha').value,
            CantidadCaja: document.getElementById('reg-cantidad').value,
            observaciones: document.getElementById('reg-obs').value,
            IdInstitucion: AlojamientoState.instId
        };

        if (!data.idprotA || !data.IdUsrA || !data.TipoAnimal || !data.IdTipoAlojamiento || !data.fechavisado || !data.CantidadCaja) {
            return Swal.fire('Incompleto', 'Debe completar todos los pasos del asistente.', 'warning');
        }

        showLoader();
        try {
            const res = await API.request('/alojamiento/save', 'POST', data);
            if (res.status === 'success') {
                bootstrap.Modal.getInstance(document.getElementById('modal-registro')).hide();
                Swal.fire({ title: '¡Éxito!', text: 'Alojamiento registrado correctamente.', icon: 'success', timer: 1500, showConfirmButton: false});
                await loadAlojamientos(); 
            } else {
                Swal.fire('Error', res.message, 'error');
            }
        } catch (e) { console.error(e); } finally { hideLoader(); }
    }
};