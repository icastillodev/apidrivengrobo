// dist/js/pages/admin/alojamientos/RegistroUI.js
import { API } from '../../../api.js';
import { showLoader, hideLoader } from '../../../components/LoaderComponent.js';
import { AlojamientoState, loadAlojamientos } from '../alojamientos.js';

export const RegistroUI = {
    init() {
        // Enlace al entorno global para los onclick
       window.openModalRegistro = this.abrirModalRegistro.bind(this);
        window.guardarNuevoAlojamiento = this.guardarNuevoAlojamiento.bind(this);
        window.selectUsuarioReg = this.selectUsuarioReg.bind(this);

        // 1. Buscador del Protocolo
        document.getElementById('reg-search-prot')?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            Array.from(document.getElementById('reg-protocolo').options).forEach(opt => {
                opt.style.display = opt.text.toLowerCase().includes(term) ? '' : 'none';
            });
        });

        // 2. Cascada: Al cambiar Protocolo -> Buscar Especies
        document.getElementById('reg-protocolo')?.addEventListener('change', (e) => {
            this.loadEspecies(e.target.value);
        });

        // 3. Cascada: Al cambiar Especie -> Buscar Tipos de Cajas
        document.getElementById('reg-especie')?.addEventListener('change', (e) => {
            this.loadTipos(e.target.value);
        });

        // 4. Buscador del Dropdown de Usuarios
        document.getElementById('reg-user-search')?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const items = document.querySelectorAll('.user-dropdown-item');
            items.forEach(item => {
                item.style.display = item.innerText.toLowerCase().includes(term) ? '' : 'none';
            });
        });
    },

    async abrirModalRegistro() {
        // Limpiar el formulario
        document.getElementById('reg-fecha').valueAsDate = new Date();
        document.getElementById('reg-cantidad').value = 1;
        document.getElementById('reg-obs').value = '';
        document.getElementById('reg-especie').innerHTML = '<option>Esperando protocolo...</option>';
        document.getElementById('reg-tipo').innerHTML = '<option>Esperando especie...</option>';
        document.getElementById('reg-especie').disabled = true;
        document.getElementById('reg-tipo').disabled = true;

        // Limpiar Dropdown de Usuario
        document.getElementById('reg-usuario-hidden').value = '';
        document.querySelector('#btn-user-select span').innerText = 'Seleccione un usuario...';

        showLoader();
        await Promise.all([this.loadProtocolos(), this.loadUsuarios()]);
        hideLoader();

        new bootstrap.Modal(document.getElementById('modal-registro')).show();
    },

    async loadProtocolos() {
        try {
            const res = await API.request(`/protocoloexpe/list?inst=${AlojamientoState.instId}`);
            if (res.status === 'success') {
                const sel = document.getElementById('reg-protocolo');
                // FORMATO PROFESIONAL: Titulo | Inv | Dpto | ID
                sel.innerHTML = res.data.map(p => 
                    `<option value="${p.idprotA}">[${p.nprotA}] ${p.tituloA || 'Sin Título'} | Inv: ${p.Investigador} | Dpto: ${p.Departamento || '---'} | ID: ${p.idprotA}</option>`
                ).join('');
            }
        } catch (e) { console.error(e); }
    },

    async loadUsuarios() {
        try {
            // Solicitamos a la base de usuarios de la institución
            const res = await API.request(`/personae/list?inst=${AlojamientoState.instId}`);
            if (res.status === 'success') {
                const list = document.getElementById('reg-user-list');
                // FORMATO EXIGIDO: ID, usuario, nombre, apellido
                list.innerHTML = res.data.map(u => `
                    <a href="#" class="dropdown-item user-dropdown-item small border-bottom py-2" onclick="window.selectUsuarioReg(${u.IdUsrA}, '${u.usuarioA}', '${u.NombreA}', '${u.ApellidoA}', event)">
                        <span class="fw-bold text-primary">ID: ${u.IdUsrA}</span> | 
                        <span class="text-dark fw-bold">${u.usuarioA}</span> - 
                        <span class="text-muted">${u.NombreA} ${u.ApellidoA}</span>
                    </a>
                `).join('');
            }
        } catch (e) { console.error(e); }
    },

    // Función que se ejecuta al elegir un usuario del Dropdown
    selectUsuarioReg(id, user, nombre, apellido, e) {
        e.preventDefault();
        document.getElementById('reg-usuario-hidden').value = id;
        document.querySelector('#btn-user-select span').innerHTML = `<span class="fw-bold text-primary">ID: ${id}</span> | ${user} - ${nombre} ${apellido}`;
    },

    async loadEspecies(idProt) {
        const selEsp = document.getElementById('reg-especie');
        const selTipo = document.getElementById('reg-tipo');
        
        selEsp.innerHTML = '<option>Cargando especies...</option>';
        selTipo.innerHTML = '<option>Esperando especie...</option>';
        selEsp.disabled = true;
        selTipo.disabled = true;

        try {
            const res = await API.request(`/protocols/current-species?id=${idProt}`);
            if (res.status === 'success' && res.data.length > 0) {
                selEsp.innerHTML = res.data.map(s => `<option value="${s.idespA}">${s.EspeNombreA}</option>`).join('');
                selEsp.disabled = false;
                
                // MÁGIA: Disparar la carga de tipos de cajas para la primera especie automáticamente
                await this.loadTipos(res.data[0].idespA);
            } else {
                selEsp.innerHTML = '<option>No hay especies asignadas</option>';
            }
        } catch (e) { console.error(e); }
    },

    async loadTipos(idEsp) {
        const selTipo = document.getElementById('reg-tipo');
        selTipo.innerHTML = '<option>Cargando tipos de caja...</option>';
        selTipo.disabled = true;

        try {
            const res = await API.request(`/precios/all-data`);
            if (res.status === 'success') {
                // Filtramos que la caja sea de la especie seleccionada y esté habilitada
                const tipos = res.data.alojamientos.filter(t => t.idespA == idEsp && t.Habilitado == 1);
                
                if (tipos.length > 0) {
                    selTipo.innerHTML = tipos.map(t => `<option value="${t.IdTipoAlojamiento}">${t.NombreTipoAlojamiento} ($${t.PrecioXunidad})</option>`).join('');
                    selTipo.disabled = false;
                } else {
                    selTipo.innerHTML = '<option>No hay cajas/precios habilitados para esta especie.</option>';
                }
            }
        } catch (e) { console.error(e); }
    },

    async guardarNuevoAlojamiento() {
        const data = {
            idprotA: document.getElementById('reg-protocolo').value,
            IdUsrA: document.getElementById('reg-usuario-hidden').value,
            TipoAnimal: document.getElementById('reg-especie').value,
            IdTipoAlojamiento: document.getElementById('reg-tipo').value,
            fechavisado: document.getElementById('reg-fecha').value,
            CantidadCaja: document.getElementById('reg-cantidad').value,
            observaciones: document.getElementById('reg-obs').value,
            IdInstitucion: AlojamientoState.instId
        };

        if (!data.idprotA || !data.IdUsrA || !data.IdTipoAlojamiento) {
            return Swal.fire('Incompleto', 'Debe seleccionar un Protocolo, un Usuario Responsable y un Tipo de Alojamiento.', 'warning');
        }

        showLoader();
        try {
            const res = await API.request('/alojamiento/save', 'POST', data);
            if (res.status === 'success') {
                bootstrap.Modal.getInstance(document.getElementById('modal-registro')).hide();
                Swal.fire('Éxito', 'Alojamiento registrado correctamente.', 'success');
                await loadAlojamientos(); // Refresca la grilla principal
            } else {
                Swal.fire('Error', res.message, 'error');
            }
        } catch (e) { console.error(e); } finally { hideLoader(); }
    }
};