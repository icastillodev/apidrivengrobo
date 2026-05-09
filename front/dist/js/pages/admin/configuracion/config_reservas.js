import { API } from '../../../api.js';

let CACHED_SALAS = [];

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

function tablaLoadingRow(colspan, fallbackMsg) {
    const tf = window.txt?.config_reservas || {};
    const msg = escCfg(fallbackMsg || tf.tabla_cargando || window.txt?.generales?.msg_cargando || '…');
    return `<tr><td colspan="${colspan}" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success mb-2" role="status"></div><div class="small">${msg}</div></td></tr>`;
}

function tablaMsgRow(colspan, text, variant = 'muted') {
    const cls = variant === 'danger' ? 'text-danger small' : 'text-muted';
    return `<tr><td colspan="${colspan}" class="text-center py-4 ${cls}">${escCfg(text || '—')}</td></tr>`;
}

function getScheduleDays() {
    const tf = window.txt?.config_reservas || {};
    return [
        { id: 1, name: tf.dia_semana_1 || '—' },
        { id: 2, name: tf.dia_semana_2 || '—' },
        { id: 3, name: tf.dia_semana_3 || '—' },
        { id: 4, name: tf.dia_semana_4 || '—' },
        { id: 5, name: tf.dia_semana_5 || '—' },
        { id: 6, name: tf.dia_semana_6 || '—' },
        { id: 7, name: tf.dia_semana_7 || '—' }
    ];
}

function bindInstTableDelegation() {
    const tbody = document.getElementById('table-inst');
    if (!tbody || tbody.dataset.delegBound === '1') return;
    tbody.dataset.delegBound = '1';
    tbody.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-edit-inst');
        if (!btn) return;
        window.openModalInst(
            parseInt(btn.dataset.instId, 10),
            btn.dataset.instNombre || '',
            parseInt(btn.dataset.instCant || '1', 10),
            btn.dataset.instDetalle || '',
            parseInt(btn.dataset.instHab || '1', 10)
        );
    });
}

export async function initConfigReservas() {
    await loadModoAprobacion();
    await Promise.all([loadSalas({ boot: true }), loadInstrumentos({ boot: true })]);

    document.getElementById('form-sala').onsubmit = saveSala;
    document.getElementById('form-inst').onsubmit = saveInst;

    bindInstTableDelegation();

    const btnSaveAprob = document.getElementById('btn-save-aprob');
    if (btnSaveAprob) btnSaveAprob.onclick = () => saveModoAprobacion();

    const scopeGlobal = document.getElementById('inst-scope-global');
    if (scopeGlobal) {
        scopeGlobal.onchange = () => {
            const wrap = document.getElementById('inst-scope-salas-wrap');
            if (!wrap) return;
            wrap.classList.toggle('d-none', scopeGlobal.checked);
        };
    }
}

async function loadModoAprobacion() {
    try {
        const res = await API.request(`/admin/config/reservas/aprobacion/get?t=${Date.now()}`);
        const chk = document.getElementById('res-req-aprob');
        if (!chk) return;
        const v = (res?.status === 'success') ? (res.data?.requiereAprobacion ?? 0) : 0;
        chk.checked = String(v) === '1' || v === 1 || v === true;
    } catch (e) {
        console.error(e);
    }
}

async function saveModoAprobacion() {
    const t = window.txt?.config_reservas || {};
    const chk = document.getElementById('res-req-aprob');
    if (!chk) return;
    try {
        Swal.fire({ title: t.procesando || 'Procesando...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
        const res = await API.request('/admin/config/reservas/aprobacion/set', 'POST', { requiereAprobacion: chk.checked ? 1 : 0 });
        if (res?.status === 'success') {
            Swal.fire(t.swal_ok || 'Guardado', t.aprobacion_saved || 'Configuración actualizada.', 'success');
            return;
        }
        Swal.fire(t.swal_error || 'Error', res?.message || t.msg_no_guardar || 'No se pudo guardar', 'error');
    } catch (e) {
        Swal.fire(t.swal_error || 'Error', t.msg_no_guardar || 'No se pudo guardar', 'error');
    }
}

// ==========================================
// SECCIÓN SALAS
// ==========================================

async function loadSalas({ boot = false } = {}) {
    const tf = window.txt?.config_reservas || {};
    const colspan = 5;
    const instId = localStorage.getItem('instId');
    const tbody = document.getElementById('table-salas');
    if (!tbody) return;

    if (!boot) tbody.innerHTML = tablaLoadingRow(colspan, tf.tabla_cargando_salas);

    try {
        const res = await API.request(`/admin/config/reservas/sala/all?inst=${instId}&t=${Date.now()}`);
        tbody.innerHTML = '';

        const ok = res?.status === 'success';
        const rows = ok && Array.isArray(res.data) ? res.data : null;

        if (!ok || rows === null) {
            CACHED_SALAS = [];
            tbody.innerHTML = tablaMsgRow(colspan, tf.tabla_error_salas, 'danger');
            return;
        }

        if (rows.length === 0) {
            CACHED_SALAS = [];
            tbody.innerHTML = tablaMsgRow(colspan, tf.tabla_sin_salas);
            return;
        }

        CACHED_SALAS = rows;
        rows.forEach(s => {
            const isOff = (s.habilitado == 0);
            let tipoTxt = tf.tipo_bloque_custom || 'Custom';
            if (s.tipohorasalas == 1) tipoTxt = tf.tipo_bloque_1h || tipoTxt;
            if (s.tipohorasalas == 2) tipoTxt = tf.tipo_bloque_30m || tipoTxt;
            const estadoTxt = isOff ? (tf.estado_off || 'OFF') : (tf.estado_on || 'ON');

            tbody.innerHTML += `
                <tr class="${isOff ? 'text-muted bg-light' : ''}">
                    <td class="fw-bold text-dark">${escCfg(s.Nombre)}</td>
                    <td class="small">${escCfg(s.Lugar || '-')}</td>
                    <td class="text-center small"><span class="badge bg-light text-dark border">${escCfg(tipoTxt)}</span></td>
                    <td class="text-center">
                        <span class="badge ${isOff ? 'bg-secondary' : 'bg-success'} rounded-pill" style="width: 80px;">
                            ${escCfg(estadoTxt)}
                        </span>
                    </td>
                    <td class="text-end">
                        <button type="button" class="btn btn-sm btn-light border ms-1"
                            onclick="window.loadSalaDetail(${s.IdSalaReserva})">
                            <i class="bi bi-pencil-fill text-primary"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-link text-danger border-0"
                            onclick="window.toggleSala(${s.IdSalaReserva}, ${s.habilitado})">
                            <i class="bi ${isOff ? 'bi-toggle-off' : 'bi-toggle-on'} fs-5"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        console.error(e);
        CACHED_SALAS = [];
        tbody.innerHTML = tablaMsgRow(colspan, tf.tabla_error_salas, 'danger');
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

    getScheduleDays().forEach(day => {
        // Buscar si existe horario para este día
        const h = existingHours.find(x => x.IdDiaSala == day.id);
        const isActive = !!h;
        const ini = h ? h.HoraIni.substring(0,5) : '08:00';
        const fin = h ? h.HoraFin.substring(0,5) : '17:00';

        tbody.innerHTML += `
            <tr>
                <td class="align-middle fw-bold small text-muted">${escCfg(day.name)}</td>
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

    const tf = window.txt?.config_reservas || {};
    try {
        const res = await API.request('/admin/config/reservas/sala/save', 'POST', fd);
        if(res.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modal-sala')).hide();
            loadSalas();
            Swal.fire(tf.swal_ok || 'OK', tf.msg_sala_saved || '', 'success');
            return;
        }
        Swal.fire(tf.swal_error || 'Error', res?.message || tf.msg_no_guardar || '', 'error');
    } catch(err) {
        Swal.fire(tf.swal_error || 'Error', tf.msg_no_guardar || '', 'error');
    }
}

// CAMBIO MASIVO DE TIPO DE HORA
window.updateGlobalTimeType = async (type) => {
    const tf = window.txt?.config_reservas || {};
    const instId = localStorage.getItem('instId');
    const bodyText = type == 1 ? (tf.swal_masiva_body_1h || '') : (tf.swal_masiva_body_30m || '');

    if((await Swal.fire({
        title: tf.swal_masiva_title || '',
        text: bodyText,
        icon: 'warning', showCancelButton:true
    })).isConfirmed) {
        await API.request('/admin/config/reservas/sala/global-type', 'POST', { instId, type });
        loadSalas();
        Swal.fire(tf.swal_procesado_ok || '', tf.swal_procesado_body || '', 'success');
    }
};

window.toggleSala = async (id, status) => {
    await API.request('/admin/config/reservas/sala/toggle', 'POST', { id, status: status==1?0:1 });
    loadSalas();
};

// ==========================================
// SECCIÓN INSTRUMENTOS
// ==========================================

async function loadInstrumentos({ boot = false } = {}) {
    const tf = window.txt?.config_reservas || {};
    const colspan = 5;
    const instId = localStorage.getItem('instId');
    const tbody = document.getElementById('table-inst');
    if (!tbody) return;

    if (!boot) tbody.innerHTML = tablaLoadingRow(colspan, tf.tabla_cargando_instrumentos);

    try {
        const res = await API.request(`/admin/config/reservas/inst/all?inst=${instId}&t=${Date.now()}`);
        tbody.innerHTML = '';

        const ok = res?.status === 'success';
        const rows = ok && Array.isArray(res.data) ? res.data : null;

        if (!ok || rows === null) {
            tbody.innerHTML = tablaMsgRow(colspan, tf.tabla_error_instrumentos, 'danger');
            return;
        }

        if (rows.length === 0) {
            tbody.innerHTML = tablaMsgRow(colspan, tf.tabla_sin_instrumentos);
            return;
        }

        rows.forEach(i => {
            const isOff = (i.habilitado == 0);
            const estadoTxt = isOff ? (tf.estado_off || 'OFF') : (tf.estado_on || 'ON');
            const idInst = parseInt(i.IdReservaInstrumento, 10);
            const nomEsc = escAttr(i.NombreInstrumento || '');
            const detEsc = escAttr(i.detalleInstrumento || '');

            tbody.innerHTML += `
                <tr class="${isOff ? 'text-muted bg-light' : ''}">
                    <td class="fw-bold">${escCfg(i.NombreInstrumento)}</td>
                    <td class="fw-bold">${escCfg(String(i.cantidad ?? ''))}</td>
                    <td class="small text-muted">${escCfg(i.detalleInstrumento || '-')}</td>
                    <td class="text-center">
                        <span class="badge ${isOff ? 'bg-secondary' : 'bg-primary'} rounded-pill">
                            ${escCfg(estadoTxt)}
                        </span>
                    </td>
                    <td class="text-end">
                        <button type="button" class="btn btn-sm btn-light border ms-1 btn-edit-inst"
                            data-inst-id="${idInst}"
                            data-inst-nombre="${nomEsc}"
                            data-inst-cant="${escAttr(String(i.cantidad ?? 1))}"
                            data-inst-detalle="${detEsc}"
                            data-inst-hab="${escAttr(String(i.habilitado ?? 1))}">
                            <i class="bi bi-pencil-fill text-secondary"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-link text-danger border-0"
                            onclick="window.toggleInst(${i.IdReservaInstrumento}, ${i.habilitado})">
                            <i class="bi ${isOff ? 'bi-toggle-off' : 'bi-toggle-on'} fs-5"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        console.error(e);
        tbody.innerHTML = tablaMsgRow(colspan, tf.tabla_error_instrumentos, 'danger');
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

    // Alcance del instrumento (global vs salas específicas)
    (async () => {
        if (id !== '') {
            try {
                const res = await API.request(`/admin/config/reservas/inst/permitidas?id=${id}&t=${Date.now()}`);
                const ids = (res.status === 'success' && Array.isArray(res.data))
                    ? res.data.map(x => parseInt(x.IdSalaReserva, 10)).filter(n => Number.isFinite(n))
                    : [];
                renderInstSalasPermitidasUI(ids);
            } catch (e) {
                renderInstSalasPermitidasUI([]);
            }
        } else {
            renderInstSalasPermitidasUI([]);
        }
    })();

    new bootstrap.Modal(document.getElementById('modal-inst')).show();
};

async function saveInst(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    fd.append('IdInstitucion', localStorage.getItem('instId'));

    const isGlobal = !!document.getElementById('inst-scope-global')?.checked;
    const selectedSalaIds = [];
    document.querySelectorAll('#inst-scope-salas input[type="checkbox"][data-sala-id]:checked').forEach(cb => {
        selectedSalaIds.push(parseInt(cb.dataset.salaId, 10));
    });

    if (!isGlobal && selectedSalaIds.length === 0) {
        Swal.fire(
            window.txt?.config_reservas?.swal_error || 'Error',
            window.txt?.config_reservas?.inst_scope_need_one || 'Debes seleccionar al menos 1 sala (o marcar que es global).',
            'warning'
        );
        return;
    }

    fd.append('salasPermitidas', JSON.stringify(isGlobal ? [] : selectedSalaIds));
    
    try {
        const res = await API.request('/admin/config/reservas/inst/save', 'POST', fd);
        if(res.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modal-inst')).hide();
            loadInstrumentos();
            Swal.fire(
                window.txt?.config_reservas?.swal_ok || 'Guardado',
                window.txt?.config_reservas?.msg_inst_saved || 'Instrumento actualizado',
                'success'
            );
        }
    } catch(err) {
        Swal.fire(
            window.txt?.config_reservas?.swal_error || 'Error',
            window.txt?.config_reservas?.msg_no_guardar || 'No se pudo guardar',
            'error'
        );
    }
}

window.toggleInst = async (id, status) => {
    await API.request('/admin/config/reservas/inst/toggle', 'POST', { id, status: status==1?0:1 });
    loadInstrumentos();
};

function renderInstSalasPermitidasUI(selectedSalaIds = []) {
    const scopeGlobal = document.getElementById('inst-scope-global');
    const wrap = document.getElementById('inst-scope-salas-wrap');
    const cont = document.getElementById('inst-scope-salas');
    const empty = document.getElementById('inst-scope-salas-empty');
    if (!scopeGlobal || !wrap || !cont || !empty) return;

    cont.innerHTML = '';

    const hasSalas = Array.isArray(CACHED_SALAS) && CACHED_SALAS.length > 0;
    empty.classList.toggle('d-none', hasSalas);

    if (hasSalas) {
        CACHED_SALAS.forEach(s => {
            const id = parseInt(s.IdSalaReserva, 10);
            if (!Number.isFinite(id)) return;
            const checked = selectedSalaIds.includes(id);
            const labelRaw = `${s.Nombre}${s.Lugar ? ` (${s.Lugar})` : ''}`;
            cont.insertAdjacentHTML('beforeend', `
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" data-sala-id="${id}" id="inst-sala-${id}" ${checked ? 'checked' : ''}>
                    <label class="form-check-label" for="inst-sala-${id}">${escCfg(labelRaw)}</label>
                </div>
            `);
        });
    }

    const isGlobal = selectedSalaIds.length === 0;
    scopeGlobal.checked = isGlobal;
    wrap.classList.toggle('d-none', isGlobal);
}