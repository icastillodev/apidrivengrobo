import { API } from '../../api.js';

let SALAS = [];
let INVESTIGADORES = [];
let EDITING_ID = null;
const calState = {
  year: null,
  month: null,
  bundle: null,
  selectedDate: null,
  selectedSlot: null
};

export function initAdminReservas() {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  document.getElementById('range-from').value = toISO(from);
  document.getElementById('range-to').value = toISO(to);
  const pdfDay = document.getElementById('pdf-day');
  if (pdfDay) pdfDay.value = toISO(today);

  document.getElementById('btn-buscar').onclick = () => loadAgenda();
  document.getElementById('btn-refresh').onclick = () => loadAgenda();
  const selSala = document.getElementById('select-sala');
  if (selSala) {
    selSala.onchange = () => {
      loadAgenda();
      loadPendientes();
    };
  }
  document.getElementById('btn-nueva-reserva').onclick = () => openModal();
  const btnPdfDia = document.getElementById('btn-pdf-dia');
  if (btnPdfDia) btnPdfDia.onclick = () => exportPDFDia();
  const btnPdfRango = document.getElementById('btn-pdf_rango');
  if (btnPdfRango) btnPdfRango.onclick = () => exportPDFRango();
  const btnPdfCalMes = document.getElementById('btn-pdf-cal-mes');
  if (btnPdfCalMes) btnPdfCalMes.onclick = () => exportPDFCalendarioMesSala();
  const btnPend = document.getElementById('btn-refresh-pend');
  if (btnPend) btnPend.onclick = () => loadPendientes();

  document.getElementById('res-modo').onchange = () => toggleSerieUI();
  document.getElementById('serie-tipo').onchange = () => toggleSerieUI();
  document.getElementById('res-fecha').onchange = () => refreshInstrumentosDisponibles();
  document.getElementById('res-hora-ini').onchange = () => refreshInstrumentosDisponibles();
  document.getElementById('res-hora-fin').onchange = () => refreshInstrumentosDisponibles();
  document.getElementById('res-sala').onchange = () => {
    syncCalToDateInputs();
    refreshInstrumentosDisponibles();
    refreshAdminCalBundle();
  };

  const prev = document.getElementById('adm-cal-prev');
  const next = document.getElementById('adm-cal-next');
  if (prev) prev.onclick = () => changeAdminCalMonth(-1);
  if (next) next.onclick = () => changeAdminCalMonth(1);

  document.getElementById('form-reserva').onsubmit = onSubmit;

  loadInit();
}

async function loadInit() {
  await Promise.all([loadSalas(), loadInvestigadores()]);
  await loadAgenda();
  await loadPendientes();
}

async function loadSalas() {
  const sel = document.getElementById('select-sala');
  const selModal = document.getElementById('res-sala');
  const t = window.txt?.admin_reservas || {};
  sel.innerHTML = `<option value="all">${escapeHtml(t.sel_todas_salas || 'Todas las salas')}</option>`;
  selModal.innerHTML = `<option value="">${t.sel_sala || 'Seleccione una sala'}</option>`;

  const res = await API.request('/admin/reservas/salas', 'GET');
  SALAS = (res?.status === 'success' && Array.isArray(res.data)) ? res.data : [];

  SALAS.forEach(s => {
    const label = `${s.Nombre}${s.Lugar ? ` - ${s.Lugar}` : ''}`;
    sel.insertAdjacentHTML('beforeend', `<option value="${s.IdSalaReserva}">${escapeHtml(label)}</option>`);
    selModal.insertAdjacentHTML('beforeend', `<option value="${s.IdSalaReserva}">${escapeHtml(label)}</option>`);
  });

  sel.value = 'all';
}

async function loadInvestigadores() {
  const sel = document.getElementById('res-titular');
  sel.innerHTML = `<option value="">${window.txt?.admin_reservas?.sel_titular || 'Seleccione titular'}</option>`;

  const res = await API.request('/users/list-investigators', 'GET');
  INVESTIGADORES = (res?.status === 'success' && Array.isArray(res.data)) ? res.data : [];

  INVESTIGADORES.forEach(u => {
    const label = `${u.ApellidoA || ''} ${u.NombreA || ''}`.trim() || `ID ${u.IdUsrA}`;
    sel.insertAdjacentHTML('beforeend', `<option value="${u.IdUsrA}">${escapeHtml(label)} (ID ${u.IdUsrA})</option>`);
  });
}

function salaLabelForAgendaRow(r, salaSingle) {
  if (r.SalaNombre != null && String(r.SalaNombre).length) {
    return `${r.SalaNombre || ''}${r.SalaLugar ? ` - ${r.SalaLugar}` : ''}`.trim();
  }
  if (salaSingle) {
    return `${salaSingle.Nombre || ''}${salaSingle.Lugar ? ` - ${salaSingle.Lugar}` : ''}`.trim() || `ID ${r.IdSalaReserva || ''}`;
  }
  return `ID ${r.IdSalaReserva || ''}`;
}

async function loadAgenda() {
  const salaSel = document.getElementById('select-sala').value;
  const from = document.getElementById('range-from').value;
  const to = document.getElementById('range-to').value;
  const tbody = document.getElementById('table-agenda');
  const colspan = 6;

  tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-center text-muted py-4">${window.txt?.admin_reservas?.cargando || 'Cargando...'}</td></tr>`;

  let rows = [];
  let salaSingle = null;

  if (salaSel === 'all') {
    const res = await API.request(`/admin/reservas/agenda?from=${from}&to=${to}`, 'GET');
    rows = res?.status === 'success' ? (Array.isArray(res.data) ? res.data : []) : [];
  } else {
    const salaId = parseInt(salaSel, 10);
    if (!salaId) {
      tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-center text-muted py-4">${window.txt?.admin_reservas?.msg_sel_sala || 'Seleccione una sala.'}</td></tr>`;
      return;
    }
    const res = await API.request(`/admin/reservas/sala/agenda?IdSalaReserva=${salaId}&from=${from}&to=${to}`, 'GET');
    rows = res?.status === 'success' ? (res.data?.reservas || []) : [];
    salaSingle = res?.data?.sala || null;
  }

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-center text-muted py-4">${window.txt?.admin_reservas?.sin_reservas || 'Sin reservas.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const titular = (r.TitularNombre || '').trim();
    const titularLbl = titular && titular !== ',' ? titular : `ID ${r.IdUsrTitular}`;
    const aprobada = (String(r.Aprobada ?? '1') === '1');
    const salaCell = escapeHtml(salaLabelForAgendaRow(r, salaSingle));
    return `
      <tr>
        <td class="ps-4 fw-bold">${r.fechaini}</td>
        <td>${(r.Horacomienzo || '').substring(0,5)} - ${(r.Horafin || '').substring(0,5)}</td>
        <td>${salaCell}</td>
        <td>${escapeHtml(titularLbl)}</td>
        <td>
          ${
            aprobada
              ? `<span class="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle">${window.txt?.admin_reservas?.estado_reservado || 'RESERVADO'}</span>`
              : `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">${window.txt?.admin_reservas?.estado_pendiente || 'PENDIENTE'}</span>`
          }
        </td>
        <td class="text-end pe-4">
          <button class="btn btn-outline-primary btn-sm fw-bold me-1" data-action="edit" data-id="${r.idReserva}">
            <i class="bi bi-pencil-square"></i>
          </button>
          <button class="btn btn-outline-danger btn-sm fw-bold" data-action="delete" data-id="${r.idReserva}">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('button[data-action="edit"]').forEach(b => {
    b.onclick = () => openModalForEdit(parseInt(b.dataset.id, 10));
  });
  tbody.querySelectorAll('button[data-action="delete"]').forEach(b => {
    b.onclick = () => onDelete(parseInt(b.dataset.id, 10));
  });
}

function openModal() {
  EDITING_ID = null;
  document.getElementById('form-reserva').reset();
  const salaMain = document.getElementById('select-sala').value;
  if (salaMain && salaMain !== 'all') document.getElementById('res-sala').value = salaMain;

  const today = new Date();
  document.getElementById('res-fecha').value = toISO(today);
  document.getElementById('res-hora-ini').value = '08:00';
  document.getElementById('res-hora-fin').value = '09:00';

  document.getElementById('inst-admin-list').innerHTML = '';
  toggleSerieUI();
  refreshInstrumentosDisponibles();
  initAdminCal();
  refreshAdminCalBundle();

  new bootstrap.Modal(document.getElementById('modal-reserva')).show();
}

async function loadPendientes() {
  const salaSel = document.getElementById('select-sala').value;
  const salaId = salaSel === 'all' ? null : parseInt(salaSel, 10);
  const from = document.getElementById('range-from').value;
  const to = document.getElementById('range-to').value;
  const tbody = document.getElementById('table-pendientes');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">${window.txt?.admin_reservas?.cargando || 'Cargando...'}</td></tr>`;
  const qsSala = salaId ? `&IdSalaReserva=${salaId}` : '';
  const res = await API.request(`/admin/reservas/pending/list?from=${from}&to=${to}${qsSala}`, 'GET');
  const rows = (res?.status === 'success' && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">${window.txt?.admin_reservas?.pendientes_vacio || 'Sin pendientes.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const titular = (r.TitularNombre || '').trim();
    const titularLbl = titular && titular !== ',' ? titular : `ID ${r.IdUsrTitular}`;
    const salaLbl = `${r.SalaNombre || ''}${r.SalaLugar ? ` - ${r.SalaLugar}` : ''}`.trim() || `ID ${r.IdSalaReserva}`;
    return `
      <tr>
        <td class="ps-4 fw-bold">${r.fechaini}</td>
        <td>${(r.Horacomienzo || '').substring(0,5)} - ${(r.Horafin || '').substring(0,5)}</td>
        <td>${escapeHtml(salaLbl)}</td>
        <td>${escapeHtml(titularLbl)}</td>
        <td class="text-end pe-4">
          <button class="btn btn-warning btn-sm fw-bold" data-action="approve" data-id="${r.idReserva}">
            <i class="bi bi-check2-circle me-1"></i>${window.txt?.admin_reservas?.btn_aprobar || 'Aprobar'}
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('button[data-action="approve"]').forEach(b => {
    b.onclick = () => onApprove(parseInt(b.dataset.id, 10));
  });
}

async function onApprove(idReserva) {
  const t = window.txt?.admin_reservas || {};
  const r = await Swal.fire({
    title: t.swal_confirm_apr_title || '¿Aprobar?',
    text: t.swal_confirm_apr_text || 'La reserva quedará confirmada.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: t.swal_confirm_apr_yes || 'Aprobar',
    cancelButtonText: t.swal_confirm_apr_no || 'Cancelar'
  });
  if (!r.isConfirmed) return;

  Swal.fire({ title: t.procesando || 'Procesando...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
  const res = await API.request('/admin/reservas/pending/approve', 'POST', { idReserva });
  if (res?.status === 'success') {
    Swal.fire(t.ok || 'OK', t.aprobada_ok || 'Reserva aprobada.', 'success');
    await Promise.all([loadAgenda(), loadPendientes()]);
    return;
  }
  Swal.fire(t.swal_error || 'Error', res?.message || t.err_generico || 'No se pudo aprobar.', 'error');
}

async function openModalForEdit(idReserva) {
  const salaSel = document.getElementById('select-sala').value;
  const from = document.getElementById('range-from').value;
  const to = document.getElementById('range-to').value;

  let rows = [];
  let resSalaId = null;

  if (salaSel === 'all') {
    const res = await API.request(`/admin/reservas/agenda?from=${from}&to=${to}`, 'GET');
    rows = res?.status === 'success' ? (Array.isArray(res.data) ? res.data : []) : [];
  } else {
    const salaId = parseInt(salaSel, 10);
    const res = await API.request(`/admin/reservas/sala/agenda?IdSalaReserva=${salaId}&from=${from}&to=${to}`, 'GET');
    rows = res?.status === 'success' ? (res.data?.reservas || []) : [];
    resSalaId = salaId;
  }

  const r = rows.find(x => parseInt(x.idReserva, 10) === parseInt(idReserva, 10));
  if (!r) return;
  if (salaSel === 'all') resSalaId = parseInt(r.IdSalaReserva, 10);

  EDITING_ID = idReserva;
  document.getElementById('form-reserva').reset();
  document.getElementById('res-modo').value = 'single'; // edición solo para single (por ahora)
  toggleSerieUI();

  document.getElementById('res-sala').value = String(resSalaId);
  document.getElementById('res-fecha').value = r.fechaini;
  document.getElementById('res-hora-ini').value = (r.Horacomienzo || '').substring(0, 5);
  document.getElementById('res-hora-fin').value = (r.Horafin || '').substring(0, 5);
  document.getElementById('res-titular').value = String(r.IdUsrTitular);

  await refreshInstrumentosDisponibles();
  initAdminCal();
  syncCalToDateInputs();
  await refreshAdminCalBundle();
  new bootstrap.Modal(document.getElementById('modal-reserva')).show();
}

function initAdminCal() {
  const d = document.getElementById('res-fecha')?.value;
  const dt = d ? new Date(d) : new Date();
  calState.year = dt.getFullYear();
  calState.month = dt.getMonth() + 1;
  calState.bundle = null;
  calState.selectedDate = d || null;
  calState.selectedSlot = null;
  renderAdminCalendar();
  renderAdminSlots();
}

function syncCalToDateInputs() {
  const d = document.getElementById('res-fecha')?.value || null;
  if (!d) return;
  calState.selectedDate = d;
  const dt = new Date(d);
  calState.year = dt.getFullYear();
  calState.month = dt.getMonth() + 1;
}

function changeAdminCalMonth(delta) {
  let y = calState.year ?? new Date().getFullYear();
  let m = (calState.month ?? (new Date().getMonth() + 1)) + delta;
  if (m < 1) { m = 12; y--; }
  if (m > 12) { m = 1; y++; }
  calState.year = y;
  calState.month = m;
  calState.selectedDate = null;
  calState.selectedSlot = null;
  renderAdminCalendar();
  renderAdminSlots();
  refreshAdminCalBundle();
}

async function refreshAdminCalBundle() {
  const salaId = parseInt(document.getElementById('res-sala')?.value, 10);
  if (!salaId) {
    calState.bundle = null;
    renderAdminCalendar();
    renderAdminSlots();
    return;
  }
  const from = `${calState.year}-${String(calState.month).padStart(2,'0')}-01`;
  const to = endOfMonth(calState.year, calState.month);
  const res = await API.request(`/user/reservas/sala/bundle?IdSalaReserva=${salaId}&from=${from}&to=${to}`, 'GET');
  calState.bundle = (res?.status === 'success') ? res.data : null;
  renderAdminCalendar();
  renderAdminSlots();
}

function renderAdminCalendar() {
  const title = document.getElementById('adm-cal-title');
  const grid = document.getElementById('adm-cal-grid');
  if (!title || !grid) return;

  title.textContent = formatMonthTitle(calState.year, calState.month);
  grid.innerHTML = '';

  const first = new Date(calState.year, calState.month - 1, 1);
  const last = new Date(calState.year, calState.month, 0);
  const startDow = (first.getDay() + 6) % 7;
  const totalCells = Math.ceil((startDow + last.getDate()) / 7) * 7;
  const salaId = parseInt(document.getElementById('res-sala')?.value, 10);
  const availableDays = new Set((calState.bundle?.availableDays || []).map(String));

  for (let idx = 0; idx < totalCells; idx++) {
    const dayNum = idx - startDow + 1;
    const inMonth = dayNum >= 1 && dayNum <= last.getDate();
    const dateStr = inMonth ? `${calState.year}-${String(calState.month).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}` : null;
    const isAvailable = !!(dateStr && availableDays.has(dateStr));

    const div = document.createElement('div');
    div.className = 'adm-day-cell p-2 small';
    div.style.boxSizing = 'border-box';
    if (!inMonth || !salaId) div.classList.add('disabled');
    if (isAvailable) div.classList.add('available');
    if (dateStr && calState.selectedDate === dateStr) div.classList.add('selected');
    div.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div class="fw-bold">${inMonth ? dayNum : ''}</div>
        ${isAvailable ? `<span class="badge bg-success-subtle text-success-emphasis border border-success-subtle" style="font-size:10px;">${window.txt?.admin_reservas?.badge_disp || 'DISP'}</span>` : ''}
      </div>
    `;

    if (inMonth && salaId) {
      div.onclick = () => {
        if (!isAvailable) {
          Swal.fire(window.txt?.admin_reservas?.swal_error || 'Error', window.txt?.admin_reservas?.msg_dia_no_disp || 'Ese día no tiene horarios disponibles.', 'info');
          return;
        }
        calState.selectedDate = dateStr;
        calState.selectedSlot = null;
        document.getElementById('res-fecha').value = dateStr;
        renderAdminCalendar();
        renderAdminSlots();
        refreshInstrumentosDisponibles();
      };
    }
    grid.appendChild(div);
  }
}

function renderAdminSlots() {
  const list = document.getElementById('adm-slots-list');
  const empty = document.getElementById('adm-slots-empty');
  if (!list || !empty) return;
  list.innerHTML = '';

  const slots = (calState.bundle?.slotsByDay && calState.selectedDate) ? (calState.bundle.slotsByDay[calState.selectedDate] || []) : [];
  empty.classList.toggle('d-none', slots.length > 0);

  slots.forEach(s => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const sel = calState.selectedSlot && calState.selectedSlot.start === s.start && calState.selectedSlot.end === s.end;
    btn.className = 'btn btn-sm adm-slot-btn ' + (sel ? 'btn-success' : 'btn-outline-success');
    btn.textContent = `${s.start} - ${s.end}`;
    btn.onclick = () => {
      calState.selectedSlot = s;
      document.getElementById('res-hora-ini').value = s.start;
      document.getElementById('res-hora-fin').value = s.end;
      renderAdminSlots();
      refreshInstrumentosDisponibles();
    };
    list.appendChild(btn);
  });
}

function toggleSerieUI() {
  const modo = document.getElementById('res-modo').value;
  const tipo = parseInt(document.getElementById('serie-tipo').value, 10);

  const showSerie = modo === 'serie';
  document.getElementById('serie-tipo-wrap').classList.toggle('d-none', !showSerie);
  document.getElementById('serie-cada-wrap').classList.toggle('d-none', !showSerie);
  document.getElementById('serie-rango-wrap').classList.toggle('d-none', !showSerie);

  document.getElementById('serie-dias-wrap').classList.toggle('d-none', !(showSerie && tipo === 1));
  document.getElementById('serie-fechas-wrap').classList.toggle('d-none', !(showSerie && tipo === 2));

  if (showSerie) {
    // defaults
    const f = document.getElementById('res-fecha').value;
    document.getElementById('serie-desde').value = f;
    const d = new Date(f);
    d.setMonth(d.getMonth() + 11);
    document.getElementById('serie-hasta').value = toISO(d);
  }
}

async function refreshInstrumentosDisponibles() {
  const salaId = parseInt(document.getElementById('res-sala').value, 10);
  const date = document.getElementById('res-fecha').value;
  const start = document.getElementById('res-hora-ini').value;
  const end = document.getElementById('res-hora-fin').value;
  const cont = document.getElementById('inst-admin-list');

  cont.innerHTML = `<div class="small text-muted">${window.txt?.admin_reservas?.cargando || 'Cargando...'}</div>`;

  if (!salaId || !date || !start || !end || !(start < end)) {
    cont.innerHTML = `<div class="small text-muted">${window.txt?.admin_reservas?.msg_inst_need_slot || 'Seleccione sala/fecha/horario.'}</div>`;
    return;
  }

  const res = await API.request(`/user/reservas/instrumentos/slot?IdSalaReserva=${salaId}&date=${date}&start=${start}&end=${end}`, 'GET');
  const rows = (res?.status === 'success' && Array.isArray(res.data)) ? res.data : [];

  if (!rows.length) {
    cont.innerHTML = `<div class="small text-muted">${window.txt?.admin_reservas?.msg_sin_instrumentos || 'Sin instrumentos disponibles.'}</div>`;
    return;
  }

  cont.innerHTML = rows.map(i => {
    const remaining = Math.max(0, parseInt(i.remaining, 10) || 0);
    const max = remaining;
    const disabled = max <= 0;
    return `
      <div class="d-flex align-items-center justify-content-between gap-2 mb-2">
        <div class="fw-bold">${escapeHtml(i.NombreInstrumento)}</div>
        <div class="d-flex align-items-center gap-2">
          <span class="badge ${disabled ? 'bg-secondary' : 'bg-success'}">${remaining}</span>
          <input type="number" class="form-control form-control-sm" style="width:90px"
            data-inst-id="${i.IdReservaInstrumento}" min="0" max="${max}" value="0" ${disabled ? 'disabled' : ''}>
        </div>
      </div>
    `;
  }).join('');
}

async function onSubmit(e) {
  e.preventDefault();
  const t = window.txt?.admin_reservas || {};

  const IdUsrTitular = parseInt(document.getElementById('res-titular').value, 10);
  const IdSalaReserva = parseInt(document.getElementById('res-sala').value, 10);
  const fechaini = document.getElementById('res-fecha').value;
  const Horacomienzo = document.getElementById('res-hora-ini').value;
  const Horafin = document.getElementById('res-hora-fin').value;

  if (!IdUsrTitular || !IdSalaReserva || !fechaini || !(Horacomienzo < Horafin)) {
    Swal.fire(t.swal_error || 'Error', t.msg_incompleto || 'Complete los datos obligatorios.', 'warning');
    return;
  }

  const instrumentos = [];
  document.querySelectorAll('#inst-admin-list input[type="number"][data-inst-id]').forEach(inp => {
    const qty = parseInt(inp.value, 10) || 0;
    const id = parseInt(inp.dataset.instId, 10);
    if (id && qty > 0) instrumentos.push({ IdReservaInstrumento: id, cantidad: qty });
  });

  const modo = document.getElementById('res-modo').value;

  Swal.fire({ title: t.procesando || 'Procesando...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

  try {
    if (modo === 'serie') {
      const TipoRepeat = parseInt(document.getElementById('serie-tipo').value, 10);
      const FechaInicio = document.getElementById('serie-desde').value;
      const FechaFin = document.getElementById('serie-hasta').value;
      const CadaNSemanas = parseInt(document.getElementById('serie-cada-n').value, 10) || 1;

      let DiasSemana = [];
      let FechasEspecificas = [];
      if (TipoRepeat === 1) {
        DiasSemana = Array.from(document.querySelectorAll('#serie-dias-wrap input[type="checkbox"]:checked')).map(cb => parseInt(cb.value, 10));
      } else {
        FechasEspecificas = (document.getElementById('serie-fechas').value || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
      }

      const payload = {
        IdUsrTitular,
        IdSalaReserva,
        HoraInicio: Horacomienzo,
        HoraFin: Horafin,
        FechaInicio,
        FechaFin,
        TipoRepeat,
        CadaNSemanas,
        DiasSemana,
        FechasEspecificas,
        instrumentos
      };

      const res = await API.request('/admin/reservas/series/create', 'POST', payload);
      if (res?.status === 'success') {
        Swal.fire(t.ok || 'OK', `${t.serie_creada || 'Serie creada.'} (${res.data?.creadas || 0}/${(res.data?.creadas || 0) + (res.data?.omitidas || 0)})`, 'success');
        bootstrap.Modal.getInstance(document.getElementById('modal-reserva')).hide();
        await loadAgenda();
        return;
      }
      Swal.fire(t.swal_error || 'Error', res?.message || t.err_generico || 'No se pudo crear.', 'error');
      return;
    }

    const payload = { IdUsrTitular, IdSalaReserva, fechaini, Horacomienzo, Horafin, instrumentos };
    const url = EDITING_ID ? '/admin/reservas/update' : '/admin/reservas/create';
    if (EDITING_ID) payload.idReserva = EDITING_ID;
    const res = await API.request(url, 'POST', payload);
    if (res?.status === 'success') {
      Swal.fire(t.ok || 'OK', EDITING_ID ? (t.reserva_upd_ok || 'Reserva actualizada.') : (t.reserva_ok || 'Reserva creada.'), 'success');
      bootstrap.Modal.getInstance(document.getElementById('modal-reserva')).hide();
      await loadAgenda();
      return;
    }
    Swal.fire(t.swal_error || 'Error', res?.message || t.err_generico || 'No se pudo crear.', 'error');
  } catch (err) {
    Swal.fire(t.swal_error || 'Error', t.err_generico || 'No se pudo crear.', 'error');
  }
}

async function onDelete(idReserva) {
  const t = window.txt?.admin_reservas || {};
  const r = await Swal.fire({
    title: t.swal_confirm_del_title || '¿Eliminar?',
    text: t.swal_confirm_del_text || 'Esta acción no se puede deshacer.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: t.swal_confirm_del_yes || 'Eliminar',
    cancelButtonText: t.swal_confirm_del_no || 'Cancelar'
  });
  if (!r.isConfirmed) return;

  Swal.fire({ title: t.procesando || 'Procesando...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
  const res = await API.request('/admin/reservas/delete', 'POST', { idReserva });
  if (res?.status === 'success') {
    Swal.fire(t.ok || 'OK', t.reserva_del_ok || 'Reserva eliminada.', 'success');
    await loadAgenda();
    return;
  }
  Swal.fire(t.swal_error || 'Error', res?.message || t.err_generico || 'No se pudo eliminar.', 'error');
}

function toISO(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatMonthTitle(year, month) {
  const m = new Date(year, month - 1, 1);
  return m.toLocaleString((localStorage.getItem('lang') || 'es'), { month: 'long', year: 'numeric' }).toUpperCase();
}

function endOfMonth(year, month) {
  const d = new Date(year, month, 0);
  return `${year}-${String(month).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

async function exportPDFDia() {
  const t = window.txt?.admin_reservas || {};
  const salaSel = document.getElementById('select-sala').value;
  const day = document.getElementById('pdf-day')?.value;
  if (!day) {
    Swal.fire(t.swal_error || 'Error', t.pdf_need_day || 'Seleccione un día.', 'warning');
    return;
  }
  if (salaSel !== 'all') {
    const salaId = parseInt(salaSel, 10);
    if (!salaId) {
      Swal.fire(t.swal_error || 'Error', t.pdf_need_data || 'Seleccione sala y día.', 'warning');
      return;
    }
    Swal.fire({ title: t.procesando || 'Procesando...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    const res = await API.request(`/admin/reservas/sala/agenda?IdSalaReserva=${salaId}&from=${day}&to=${day}`, 'GET');
    if (res?.status !== 'success') {
      Swal.fire(t.swal_error || 'Error', res?.message || t.err_generico || 'No se pudo generar.', 'error');
      return;
    }
    const sala = res.data?.sala;
    const rows = res.data?.reservas || [];
    generatePDF({
      title: t.pdf_title_dia || 'Reservas del día',
      subtitle: `${day} • ${(sala?.Nombre || '')}${sala?.Lugar ? ` - ${sala?.Lugar}` : ''}`.trim(),
      rows,
      includeSala: false
    }, `reservas_${salaId}_${day}.pdf`);
    Swal.close();
    return;
  }

  Swal.fire({ title: t.procesando || 'Procesando...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
  const res = await API.request(`/admin/reservas/agenda?from=${day}&to=${day}`, 'GET');
  if (res?.status !== 'success') {
    Swal.fire(t.swal_error || 'Error', res?.message || t.err_generico || 'No se pudo generar.', 'error');
    return;
  }
  const rows = Array.isArray(res.data) ? res.data : [];
  rows.sort((a, b) => {
    const sa = String(a.SalaNombre || '').localeCompare(String(b.SalaNombre || ''), 'es');
    if (sa !== 0) return sa;
    const ha = String(a.Horacomienzo || '').localeCompare(String(b.Horacomienzo || ''));
    if (ha !== 0) return ha;
    return String(a.Horafin || '').localeCompare(String(b.Horafin || ''));
  });
  generatePDF({
    title: t.pdf_title_dia_global || 'Reservas del día (todas las salas)',
    subtitle: `${day} • ${t.pdf_global || 'Todas las salas'}`,
    rows,
    includeSala: true
  }, `reservas_global_${day}.pdf`);
  Swal.close();
}

async function exportPDFRango() {
  const t = window.txt?.admin_reservas || {};
  const salaSel = document.getElementById('select-sala').value;
  const from = document.getElementById('range-from').value;
  const to = document.getElementById('range-to').value;
  if (!from || !to) {
    Swal.fire(t.swal_error || 'Error', t.pdf_need_rango || 'Seleccione fechas DESDE y HASTA.', 'warning');
    return;
  }

  if (salaSel === 'all') {
    Swal.fire({ title: t.procesando || 'Procesando...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    const res = await API.request(`/admin/reservas/agenda?from=${from}&to=${to}`, 'GET');
    if (res?.status !== 'success') {
      Swal.fire(t.swal_error || 'Error', res?.message || t.err_generico || 'No se pudo generar.', 'error');
      return;
    }
    const rows = Array.isArray(res.data) ? res.data : [];
    rows.sort((a, b) => {
      const sa = String(a.SalaNombre || '').localeCompare(String(b.SalaNombre || ''), 'es');
      if (sa !== 0) return sa;
      const da = String(a.fechaini || '').localeCompare(String(b.fechaini || ''));
      if (da !== 0) return da;
      return String(a.Horacomienzo || '').localeCompare(String(b.Horacomienzo || ''));
    });
    generatePDF({
      title: t.pdf_title_rango_global || 'Reservas (todas las salas)',
      subtitle: `${from} → ${to} • ${t.pdf_global || 'Todas las salas'}`,
      rows,
      includeSala: true
    }, `reservas_global_${from}_${to}.pdf`);
    Swal.close();
    return;
  }

  const salaId = parseInt(salaSel, 10);
  if (!salaId) {
    Swal.fire(t.swal_error || 'Error', t.pdf_need_data || 'Seleccione sala.', 'warning');
    return;
  }

  Swal.fire({ title: t.procesando || 'Procesando...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
  const res = await API.request(`/admin/reservas/sala/agenda?IdSalaReserva=${salaId}&from=${from}&to=${to}`, 'GET');
  if (res?.status !== 'success') {
    Swal.fire(t.swal_error || 'Error', res?.message || t.err_generico || 'No se pudo generar.', 'error');
    return;
  }
  const sala = res.data?.sala;
  const rows = res.data?.reservas || [];
  generatePDF({
    title: t.pdf_title_rango || 'Reservas por rango',
    subtitle: `${from} → ${to} • ${(sala?.Nombre || '')}${sala?.Lugar ? ` - ${sala?.Lugar}` : ''}`.trim(),
    rows,
    includeSala: false
  }, `reservas_${salaId}_${from}_${to}.pdf`);
  Swal.close();
}

async function exportPDFCalendarioMesSala() {
  const t = window.txt?.admin_reservas || {};
  const salaSel = document.getElementById('select-sala').value;
  const from = document.getElementById('range-from').value;
  if (salaSel === 'all') {
    Swal.fire(t.swal_error || 'Error', t.pdf_cal_need_sala || 'Seleccione una sala para el calendario mensual.', 'info');
    return;
  }
  const salaId = parseInt(salaSel, 10);
  if (!salaId || !from) {
    Swal.fire(t.swal_error || 'Error', t.pdf_need_month || 'Seleccione sala y un mes (use DESDE).', 'warning');
    return;
  }

  const monthStart = `${from.substring(0,7)}-01`;
  const [yy, mm] = monthStart.split('-').map(n => parseInt(n, 10));
  const monthEnd = endOfMonth(yy, mm);

  Swal.fire({ title: t.procesando || 'Procesando...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
  const res = await API.request(`/admin/reservas/sala/agenda?IdSalaReserva=${salaId}&from=${monthStart}&to=${monthEnd}`, 'GET');
  if (res?.status !== 'success') {
    Swal.fire(t.swal_error || 'Error', res?.message || t.err_generico || 'No se pudo generar.', 'error');
    return;
  }
  const sala = res.data?.sala;
  const rows = res.data?.reservas || [];
  generatePDFCalendarMonth({
    title: t.pdf_title_cal_mes || 'Calendario de reservas (mes)',
    subtitle: `${formatMonthTitle(yy, mm)} • ${(sala?.Nombre || '')}${sala?.Lugar ? ` - ${sala?.Lugar}` : ''}`.trim(),
    year: yy,
    month: mm,
    rows
  }, `calendario_${salaId}_${monthStart.substring(0,7)}.pdf`);
  Swal.close();
}

function generatePDF(meta, filename) {
  const t = window.txt?.admin_reservas || {};
  const { jsPDF } = (window.jspdf || {});
  if (!jsPDF) {
    Swal.fire(t.swal_error || 'Error', t.pdf_no_lib || 'No se pudo cargar la librería PDF.', 'error');
    return;
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(String(meta.title || ''), margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(String(meta.subtitle || ''), margin, y);
  y += 8;

  // Header tabla
  const colX = meta.includeSala ? {
    fecha: margin,
    sala: margin + 26,
    horario: margin + 78,
    titular: margin + 112,
    estado: pageW - margin - 22
  } : {
    fecha: margin,
    horario: margin + 32,
    titular: margin + 70,
    estado: pageW - margin - 22
  };
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(t.th_fecha || 'Fecha', colX.fecha, y);
  if (meta.includeSala) doc.text(t.th_sala || 'Sala', colX.sala, y);
  doc.text(t.th_horario || 'Horario', colX.horario, y);
  doc.text(t.th_titular || 'Titular', colX.titular, y);
  doc.text(t.th_estado || 'Estado', colX.estado, y);
  y += 4;
  doc.setDrawColor(200);
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const rows = Array.isArray(meta.rows) ? meta.rows : [];
  for (const r of rows) {
    const aprobada = String(r.Aprobada ?? '1') === '1';
    const estado = aprobada ? (t.estado_reservado || 'RESERVADO') : (t.estado_pendiente || 'PENDIENTE');
    const titular = (r.TitularNombre || '').trim();
    const titularLbl = titular && titular !== ',' ? titular : `ID ${r.IdUsrTitular}`;
    const horario = `${String(r.Horacomienzo || '').substring(0,5)}-${String(r.Horafin || '').substring(0,5)}`;
    const salaLbl = meta.includeSala ? `${r.SalaNombre || ''}${r.SalaLugar ? ` - ${r.SalaLugar}` : ''}`.trim() : '';

    const line1 = String(r.fechaini || '');
    const line2 = horario;
    const line3 = titularLbl;

    const maxTitWidth = (colX.estado - 4) - colX.titular;
    const titLines = doc.splitTextToSize(String(line3), Math.max(10, maxTitWidth));
    const rowH = Math.max(5, titLines.length * 4);

    if (y + rowH + 10 > pageH) {
      doc.addPage();
      y = 14;
    }

    doc.text(line1, colX.fecha, y);
    if (meta.includeSala) {
      const salaLines = doc.splitTextToSize(String(salaLbl), Math.max(18, (colX.horario - 4) - colX.sala));
      doc.text(salaLines, colX.sala, y);
    }
    doc.text(line2, colX.horario, y);
    doc.text(titLines, colX.titular, y);
    doc.text(estado, colX.estado, y);
    y += rowH;
    doc.setDrawColor(240);
    doc.line(margin, y, pageW - margin, y);
    y += 3;
  }

  doc.save(filename || 'reservas.pdf');
}

function generatePDFCalendarMonth(meta, filename) {
  const t = window.txt?.admin_reservas || {};
  const { jsPDF } = (window.jspdf || {});
  if (!jsPDF) {
    Swal.fire(t.swal_error || 'Error', t.pdf_no_lib || 'No se pudo cargar la librería PDF.', 'error');
    return;
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(String(meta.title || ''), margin, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(String(meta.subtitle || ''), margin, 18);

  const gridTop = 24;
  const gridLeft = margin;
  const gridW = pageW - margin * 2;
  const gridH = pageH - gridTop - 10;
  const colW = gridW / 7;
  const rowH = gridH / 6; // hasta 6 semanas

  // Build map date -> list of strings
  const byDate = new Map();
  (Array.isArray(meta.rows) ? meta.rows : []).forEach(r => {
    const d = String(r.fechaini || '');
    if (!d) return;
    const aprobada = String(r.Aprobada ?? '1') === '1';
    const estado = aprobada ? (t.estado_reservado || 'RESERVADO') : (t.estado_pendiente || 'PENDIENTE');
    const horario = `${String(r.Horacomienzo || '').substring(0,5)}-${String(r.Horafin || '').substring(0,5)}`;
    const titular = (r.TitularNombre || '').trim();
    const titularLbl = titular && titular !== ',' ? titular : `ID ${r.IdUsrTitular}`;
    const line = `${horario} ${estado} • ${titularLbl}`;
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d).push(line);
  });

  const first = new Date(meta.year, meta.month - 1, 1);
  const last = new Date(meta.year, meta.month, 0);
  const startDow = (first.getDay() + 6) % 7; // Mon=0

  // headers dow
  const dows = [
    t.dow_lu || 'Lun', t.dow_ma || 'Mar', t.dow_mi || 'Mié', t.dow_ju || 'Jue', t.dow_vi || 'Vie', t.dow_sa || 'Sáb', t.dow_do || 'Dom'
  ];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  for (let c = 0; c < 7; c++) {
    doc.text(String(dows[c]), gridLeft + c * colW + 2, gridTop - 2);
  }

  doc.setDrawColor(180);
  // draw grid
  for (let r = 0; r <= 6; r++) {
    doc.line(gridLeft, gridTop + r * rowH, gridLeft + gridW, gridTop + r * rowH);
  }
  for (let c = 0; c <= 7; c++) {
    doc.line(gridLeft + c * colW, gridTop, gridLeft + c * colW, gridTop + 6 * rowH);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const totalCells = 42;
  for (let idx = 0; idx < totalCells; idx++) {
    const dayNum = idx - startDow + 1;
    const inMonth = dayNum >= 1 && dayNum <= last.getDate();
    const row = Math.floor(idx / 7);
    const col = idx % 7;
    const cellX = gridLeft + col * colW;
    const cellY = gridTop + row * rowH;

    if (!inMonth) continue;
    const dateStr = `${meta.year}-${String(meta.month).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
    // day number
    doc.setFont('helvetica', 'bold');
    doc.text(String(dayNum), cellX + 2, cellY + 4);
    doc.setFont('helvetica', 'normal');

    const lines = byDate.get(dateStr) || [];
    const maxLines = Math.max(0, Math.floor((rowH - 6) / 3.6));
    const renderLines = lines.slice(0, maxLines);
    let yy = cellY + 8;
    for (const l of renderLines) {
      const wrapped = doc.splitTextToSize(String(l), colW - 4);
      for (const wl of wrapped) {
        if (yy > cellY + rowH - 2) break;
        doc.text(String(wl), cellX + 2, yy);
        yy += 3.6;
      }
      if (yy > cellY + rowH - 2) break;
    }
    if (lines.length > renderLines.length) {
      doc.setFontSize(7);
      doc.text(`+${lines.length - renderLines.length} ${t.pdf_more || 'más'}`, cellX + 2, cellY + rowH - 2);
      doc.setFontSize(8);
    }
  }

  doc.save(filename || 'calendario.pdf');
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

