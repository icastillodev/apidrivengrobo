import { API } from '../../../api.js';

const DAYS = [
    { id: 1, name: 'Lunes' }, { id: 2, name: 'Martes' }, { id: 3, name: 'Miércoles' },
    { id: 4, name: 'Jueves' }, { id: 5, name: 'Viernes' }, { id: 6, name: 'Sábado' }, { id: 7, name: 'Domingo' }
];

export function initConfigReservas() {
    loadSalas();
    loadInstrumentos();

    document.getElementById('form-sala').onsubmit = saveSala;
    document.getElementById('form-inst').onsubmit = saveInst;
}

// ==========================================
// SECCIÓN SALAS
// ==========================================

async function loadSalas() {
    const instId = localStorage.getItem('instId');
    const res = await API.request(`/admin/config/reservas/sala/all?inst=${instId}&t=${Date.now()}`);
    const tbody = document.getElementById('table-salas');
    tbody.innerHTML = '';

    if (res.status === 'success' && res.data.length > 0) {
        res.data.forEach(s => {
            const isOff = (s.habilitado == 0);
            let tipoTxt = 'Personalizado';
            if(s.tipohorasalas == 1) tipoTxt = 'Bloque 1 Hora';
            if(s.tipohorasalas == 2) tipoTxt = 'Bloque 30 Min';

            tbody.innerHTML += `
                <tr class="${isOff ? 'text-muted bg-light' : ''}">
                    <td class="fw-bold text-dark">${s.Nombre}</td>
                    <td class="small">${s.Lugar || '-'}</td>
                    <td class="text-center small"><span class="badge bg-light text-dark border">${tipoTxt}</span></td>
                    <td class="text-center">
                        <span class="badge ${isOff ? 'bg-secondary' : 'bg-success'} rounded-pill" style="width: 80px;">
                            ${isOff ? 'OFF' : 'ON'}
                        </span>
                    </td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-light border ms-1" 
                            onclick="window.loadSalaDetail(${s.IdSalaReserva})">
                            <i class="bi bi-pencil-fill text-primary"></i>
                        </button>
                        <button class="btn btn-sm btn-link text-danger border-0" 
                            onclick="window.toggleSala(${s.IdSalaReserva}, ${s.habilitado})">
                            <i class="bi ${isOff ? 'bi-toggle-off' : 'bi-toggle-on'} fs-5"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No hay salas configuradas.</td></tr>';
    }
}

// ABRE MODAL PARA CREAR (Limpio)
window.openModalSala = () => {
    document.getElementById('form-sala').reset();
    document.getElementById('sala-id').value = '';
    document.getElementById('sala-status-container').classList.add('d-none');
    
    // Renderizar grilla vacía (default 8am - 5pm)
    renderScheduleInputs([]); 
    new bootstrap.Modal(document.getElementById('modal-sala')).show();
};

// ABRE MODAL PARA EDITAR (Carga datos y horarios)
window.loadSalaDetail = async (id) => {
    try {
        const res = await API.request(`/admin/config/reservas/sala/detail?id=${id}`);
        if(res.status === 'success') {
            const d = res.data.sala;
            const horarios = res.data.horarios;

            document.getElementById('sala-id').value = d.IdSalaReserva;
            document.getElementById('sala-nombre').value = d.Nombre;
            document.getElementById('sala-lugar').value = d.Lugar;
            document.getElementById('sala-tipo').value = d.tipohorasalas;
            document.getElementById('sala-habilitado').value = d.habilitado;
            
            document.getElementById('sala-status-container').classList.remove('d-none');
            
            renderScheduleInputs(horarios);
            new bootstrap.Modal(document.getElementById('modal-sala')).show();
        }
    } catch(e) { console.error(e); }
};

// RENDERIZA LA GRILLA DE DIAS EN EL MODAL
function renderScheduleInputs(existingHours = []) {
    const tbody = document.getElementById('schedule-body');
    tbody.innerHTML = '';

    DAYS.forEach(day => {
        // Buscar si existe horario para este día
        const h = existingHours.find(x => x.IdDiaSala == day.id);
        const isActive = !!h;
        const ini = h ? h.HoraIni.substring(0,5) : '08:00';
        const fin = h ? h.HoraFin.substring(0,5) : '17:00';

        tbody.innerHTML += `
            <tr>
                <td class="align-middle fw-bold small text-muted">${day.name}</td>
                <td><input type="time" class="form-control form-control-sm inp-ini" data-day="${day.id}" value="${ini}" ${!isActive ? 'disabled' : ''}></td>
                <td><input type="time" class="form-control form-control-sm inp-fin" data-day="${day.id}" value="${fin}" ${!isActive ? 'disabled' : ''}></td>
                <td class="text-center align-middle">
                    <div class="form-check d-flex justify-content-center">
                        <input class="form-check-input check-day" type="checkbox" data-day="${day.id}" ${isActive ? 'checked' : ''} 
                        onchange="window.toggleDayRow(this, ${day.id})">
                    </div>
                </td>
            </tr>
        `;
    });
}

window.toggleDayRow = (checkbox, dayId) => {
    const row = checkbox.closest('tr');
    const inputs = row.querySelectorAll('input[type="time"]');
    inputs.forEach(inp => inp.disabled = !checkbox.checked);
};

// GUARDAR SALA Y HORARIOS
async function saveSala(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.append('IdInstitucion', localStorage.getItem('instId'));

    // Recolectar Horarios
    const schedule = [];
    document.querySelectorAll('.check-day:checked').forEach(chk => {
        const dayId = chk.dataset.day;
        const row = chk.closest('tr');
        schedule.push({
            day: dayId,
            ini: row.querySelector('.inp-ini').value,
            fin: row.querySelector('.inp-fin').value
        });
    });
    fd.append('horarios', JSON.stringify(schedule));

    try {
        const res = await API.request('/admin/config/reservas/sala/save', 'POST', fd);
        if(res.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modal-sala')).hide();
            loadSalas();
            Swal.fire('Guardado', 'Sala y horarios actualizados', 'success');
        }
    } catch(err) { Swal.fire('Error', 'No se pudo guardar', 'error'); }
}

// CAMBIO MASIVO DE TIPO DE HORA
window.updateGlobalTimeType = async (type) => {
    const instId = localStorage.getItem('instId');
    const text = type == 1 ? '1 Hora' : '30 Minutos';
    
    if((await Swal.fire({
        title: '¿Configuración Masiva?', 
        text: `Se cambiarán TODAS las salas a bloques de ${text}.`, 
        icon: 'warning', showCancelButton:true
    })).isConfirmed) {
        await API.request('/admin/config/reservas/sala/global-type', 'POST', { instId, type });
        loadSalas();
        Swal.fire('Procesado', 'Configuración aplicada.', 'success');
    }
};

window.toggleSala = async (id, status) => {
    await API.request('/admin/config/reservas/sala/toggle', 'POST', { id, status: status==1?0:1 });
    loadSalas();
};

// ==========================================
// SECCIÓN INSTRUMENTOS
// ==========================================

async function loadInstrumentos() {
    const instId = localStorage.getItem('instId');
    const res = await API.request(`/admin/config/reservas/inst/all?inst=${instId}&t=${Date.now()}`);
    const tbody = document.getElementById('table-inst');
    tbody.innerHTML = '';

    if (res.status === 'success' && res.data.length > 0) {
        res.data.forEach(i => {
            const isOff = (i.habilitado == 0);
            tbody.innerHTML += `
                <tr class="${isOff ? 'text-muted bg-light' : ''}">
                    <td class="fw-bold">${i.NombreInstrumento}</td>
                    <td class="fw-bold">${i.cantidad}</td>
                    <td class="small text-muted">${i.detalleInstrumento || '-'}</td>
                    <td class="text-center">
                        <span class="badge ${isOff ? 'bg-secondary' : 'bg-primary'} rounded-pill">
                            ${isOff ? 'OFF' : 'ON'}
                        </span>
                    </td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-light border ms-1" onclick="window.openModalInst(${i.IdReservaInstrumento}, '${i.NombreInstrumento}', ${i.cantidad}, '${i.detalleInstrumento || ''}', ${i.habilitado})">
                            <i class="bi bi-pencil-fill text-secondary"></i>
                        </button>
                        <button class="btn btn-sm btn-link text-danger border-0" onclick="window.toggleInst(${i.IdReservaInstrumento}, ${i.habilitado})">
                            <i class="bi ${isOff ? 'bi-toggle-off' : 'bi-toggle-on'} fs-5"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No hay instrumentos registrados.</td></tr>';
    }
}

window.openModalInst = (id='', nombre='', cant=1, det='', hab=1) => {
    document.getElementById('form-inst').reset();
    document.getElementById('inst-id').value = id;
    document.getElementById('inst-nombre').value = nombre;
    document.getElementById('inst-cant').value = cant;
    document.getElementById('inst-detalle').value = det;
    
    const cont = document.getElementById('inst-status-container');
    if(id !== '') {
        cont.classList.remove('d-none');
        document.getElementById('inst-habilitado').value = hab;
    } else {
        cont.classList.add('d-none');
    }
    new bootstrap.Modal(document.getElementById('modal-inst')).show();
};

async function saveInst(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.append('IdInstitucion', localStorage.getItem('instId'));
    
    try {
        const res = await API.request('/admin/config/reservas/inst/save', 'POST', fd);
        if(res.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modal-inst')).hide();
            loadInstrumentos();
            Swal.fire('Guardado', 'Instrumento actualizado', 'success');
        }
    } catch(err) { Swal.fire('Error', 'No se pudo guardar', 'error'); }
}

window.toggleInst = async (id, status) => {
    await API.request('/admin/config/reservas/inst/toggle', 'POST', { id, status: status==1?0:1 });
    loadInstrumentos();
};