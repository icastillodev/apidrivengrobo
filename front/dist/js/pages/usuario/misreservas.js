import { API } from '../../api.js';

const state = {
  salas: [],
  salaId: null,
  year: null,
  month: null, // 1-12
  bundle: null,
  selectedDate: null, // YYYY-MM-DD
  selectedSlot: null, // { start:'HH:MM', end:'HH:MM', available:true }
  instrumentos: [],
  selectedInstrumentoIds: new Set()
};

export function initMisReservas() {
  const now = new Date();
  state.year = now.getFullYear();
  state.month = now.getMonth() + 1;

  document.getElementById('btn-prev-month').onclick = () => changeMonth(-1);
  document.getElementById('btn-next-month').onclick = () => changeMonth(1);
  document.getElementById('btn-refresh').onclick = () => refreshBundle();
  document.getElementById('btn-clear').onclick = () => clearSelection();
  document.getElementById('btn-reservar').onclick = () => reservar();
  const chkRepeat = document.getElementById('chk-repeat-weekly');
  const repeatUntil = document.getElementById('repeat-until');
  if (chkRepeat && repeatUntil) {
    chkRepeat.onchange = () => {
      repeatUntil.disabled = !chkRepeat.checked;
      const wrap = document.getElementById('repeat-dias-wrap');
      if (wrap) wrap.classList.toggle('d-none', !chkRepeat.checked);
      if (!chkRepeat.checked) clearRepeatValidation();
      if (chkRepeat.checked && !repeatUntil.value && state.selectedDate) {
        repeatUntil.value = addMonthsISO(state.selectedDate, 1);
      }
      if (chkRepeat.checked) syncRepeatDiasFromSelectedDay();
      scheduleRepeatValidation();
    };
    repeatUntil.onchange = () => scheduleRepeatValidation();
  }
  document.querySelectorAll('#repeat-dias-checks input[type="checkbox"]').forEach(cb => {
    cb.onchange = () => scheduleRepeatValidation();
  });
  document.getElementById('select-sala').onchange = () => {
    state.salaId = parseInt(document.getElementById('select-sala').value, 10) || null;
    clearSelection();
    refreshBundle();
  };

  loadSalas();
  loadMisReservas();
}

async function loadSalas() {
  const sel = document.getElementById('select-sala');
  sel.innerHTML = `<option value="">${window.txt?.misreservas?.sel_sala || 'Seleccione una sala'}</option>`;

  const res = await API.request('/user/reservas/salas', 'GET');
  if (res?.status !== 'success') return;

  state.salas = Array.isArray(res.data) ? res.data : [];
  state.salas.forEach(s => {
    sel.insertAdjacentHTML('beforeend', `<option value="${s.IdSalaReserva}">${escapeHtml(s.Nombre)}${s.Lugar ? ` - ${escapeHtml(s.Lugar)}` : ''}</option>`);
  });

  if (state.salas.length === 1) {
    sel.value = String(state.salas[0].IdSalaReserva);
    state.salaId = parseInt(sel.value, 10);
    refreshBundle();
  }

  renderCalendar();
}

function changeMonth(delta) {
  let y = state.year;
  let m = state.month + delta;
  if (m < 1) { m = 12; y--; }
  if (m > 12) { m = 1; y++; }
  state.year = y;
  state.month = m;
  clearSelection();
  refreshBundle();
  loadMisReservas();
}

async function refreshBundle() {
  renderCalendar();
  if (!state.salaId) {
    state.bundle = null;
    return;
  }

  const from = `${state.year}-${String(state.month).padStart(2,'0')}-01`;
  const to = endOfMonth(state.year, state.month);

  const res = await API.request(`/user/reservas/sala/bundle?IdSalaReserva=${state.salaId}&from=${from}&to=${to}`, 'GET');
  state.bundle = (res?.status === 'success') ? res.data : null;
  renderCalendar();
}

async function loadMisReservas() {
  const tbody = document.getElementById('table-mis-reservas');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-3">${window.txt?.misreservas?.cargando || 'Cargando...'}</td></tr>`;

  const from = `${state.year}-${String(state.month).padStart(2,'0')}-01`;
  const to = endOfMonth(state.year, state.month);

  try {
    const res = await API.request(`/user/reservas/mine?from=${from}&to=${to}`, 'GET');
    const rows = (res?.status === 'success' && Array.isArray(res.data)) ? res.data : [];

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-3">${window.txt?.misreservas?.sin_reservas || 'Sin reservas en este período.'}</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td class="fw-bold">${r.fechaini || '—'}</td>
        <td>${(r.Horacomienzo || '').substring(0,5)} - ${(r.Horafin || '').substring(0,5)}</td>
        <td>${escapeHtml(r.SalaNombre || '')}${r.SalaLugar ? ` <span class="text-muted">(${escapeHtml(r.SalaLugar)})</span>` : ''}</td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-3">${window.txt?.misreservas?.err_cargar || 'Error al cargar reservas.'}</td></tr>`;
  }
}

function renderCalendar() {
  const title = document.getElementById('calendar-title');
  title.textContent = formatMonthTitle(state.year, state.month);

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  const first = new Date(state.year, state.month - 1, 1);
  const last = new Date(state.year, state.month, 0);

  const startDow = (first.getDay() + 6) % 7; // Mon=0
  const totalCells = Math.ceil((startDow + last.getDate()) / 7) * 7;

  const availableDays = new Set((state.bundle?.availableDays || []).map(String));

  for (let idx = 0; idx < totalCells; idx++) {
    const dayNum = idx - startDow + 1;
    const inMonth = dayNum >= 1 && dayNum <= last.getDate();
    const dateStr = inMonth ? `${state.year}-${String(state.month).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}` : null;
    const isAvailable = !!(dateStr && availableDays.has(dateStr));

    const div = document.createElement('div');
    div.className = 'day-cell p-2 small';
    div.style.boxSizing = 'border-box';
    if (!inMonth || !state.salaId) div.classList.add('disabled');
    if (isAvailable) div.classList.add('available');
    if (dateStr && state.selectedDate === dateStr) div.classList.add('selected');

    div.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div class="fw-bold">${inMonth ? dayNum : ''}</div>
        ${isAvailable ? `<span class="badge bg-success-subtle text-success-emphasis border border-success-subtle" style="font-size:10px;">${window.txt?.misreservas?.badge_disp || 'DISP'}</span>` : ''}
      </div>
    `;

    if (inMonth && state.salaId) {
      div.onclick = () => {
        if (!isAvailable) {
          Swal.fire(window.txt?.misreservas?.swal_error || 'Error', window.txt?.misreservas?.msg_dia_no_disp || 'Ese día no tiene horarios disponibles.', 'info');
          return;
        }
        selectDay(dateStr);
      };
    }

    grid.appendChild(div);
  }

  const sala = state.salas.find(s => String(s.IdSalaReserva) === String(state.salaId));
  document.getElementById('badge-sala').textContent = sala ? sala.Nombre : '—';
}

function selectDay(dateStr) {
  state.selectedDate = dateStr;
  state.selectedSlot = null;
  state.instrumentos = [];
  state.selectedInstrumentoIds = new Set();
  document.getElementById('selected-day-title').textContent = dateStr;
  renderCalendar();
  renderSlots();
  renderInstrumentos();
  updateReserveButton();

  const chkRepeat = document.getElementById('chk-repeat-weekly');
  const repeatUntil = document.getElementById('repeat-until');
  if (chkRepeat && repeatUntil && chkRepeat.checked) {
    repeatUntil.disabled = false;
    repeatUntil.value = addMonthsISO(dateStr, 1);
    syncRepeatDiasFromSelectedDay();
  }
  scheduleRepeatValidation();
}

function renderSlots() {
  const list = document.getElementById('slots-list');
  const empty = document.getElementById('slots-empty');
  list.innerHTML = '';

  const slots = (state.bundle?.slotsByDay && state.selectedDate) ? (state.bundle.slotsByDay[state.selectedDate] || []) : [];
  empty.classList.toggle('d-none', slots.length > 0);

  slots.forEach(s => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm slot-btn ' + (state.selectedSlot && sameSlot(state.selectedSlot, s) ? 'btn-success' : 'btn-outline-success');
    btn.textContent = `${s.start} - ${s.end}`;
    btn.onclick = () => selectSlot(s);
    list.appendChild(btn);
  });
}

async function selectSlot(slot) {
  state.selectedSlot = slot;
  state.selectedInstrumentoIds = new Set();
  renderSlots();
  renderInstrumentos();
  updateReserveButton();
  scheduleRepeatValidation();

  if (!state.salaId || !state.selectedDate || !state.selectedSlot) return;
  const url = `/user/reservas/instrumentos/slot?IdSalaReserva=${state.salaId}&date=${state.selectedDate}&start=${state.selectedSlot.start}&end=${state.selectedSlot.end}`;
  const res = await API.request(url, 'GET');
  state.instrumentos = (res?.status === 'success' && Array.isArray(res.data)) ? res.data : [];
  renderInstrumentos();
}

function renderInstrumentos() {
  const cont = document.getElementById('inst-list');
  const empty = document.getElementById('inst-empty');
  cont.innerHTML = '';

  if (!state.selectedSlot) {
    empty.classList.remove('d-none');
    empty.textContent = window.txt?.misreservas?.msg_sel_horario || 'Seleccione un horario para ver instrumentos disponibles.';
    return;
  }

  empty.classList.toggle('d-none', state.instrumentos.length > 0);
  state.instrumentos.forEach(i => {
    const id = parseInt(i.IdReservaInstrumento, 10);
    const remaining = Math.max(0, parseInt(i.remaining, 10) || 0);
    const disabled = remaining <= 0;
    const checked = state.selectedInstrumentoIds.has(id);
    cont.insertAdjacentHTML('beforeend', `
      <label class="d-flex align-items-center justify-content-between gap-2 p-2 border rounded bg-white ${disabled ? 'opacity-50' : ''}">
        <span class="d-flex align-items-center gap-2">
          <input type="checkbox" class="form-check-input m-0" data-inst-id="${id}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
          <span class="fw-bold">${escapeHtml(i.NombreInstrumento)}</span>
        </span>
        <span class="badge ${disabled ? 'bg-secondary' : 'bg-success'}">${remaining}</span>
      </label>
    `);
  });

  cont.querySelectorAll('input[type="checkbox"][data-inst-id]').forEach(cb => {
    cb.onchange = () => {
      const id = parseInt(cb.dataset.instId, 10);
      if (cb.checked) state.selectedInstrumentoIds.add(id);
      else state.selectedInstrumentoIds.delete(id);
      updateReserveButton();
      scheduleRepeatValidation();
    };
  });
}

function updateReserveButton() {
  const btn = document.getElementById('btn-reservar');
  btn.disabled = !(state.salaId && state.selectedDate && state.selectedSlot);
}

function clearSelection() {
  state.selectedDate = null;
  state.selectedSlot = null;
  state.instrumentos = [];
  state.selectedInstrumentoIds = new Set();
  document.getElementById('selected-day-title').textContent = '—';
  renderCalendar();
  renderSlots();
  renderInstrumentos();
  updateReserveButton();
  clearRepeatValidation();
}

function syncRepeatDiasFromSelectedDay() {
  if (!state.selectedDate) return;
  const dow = isoDow(state.selectedDate);
  const el = document.getElementById(`usr-dw${dow}`);
  if (el) el.checked = true;
}

let repeatValTimer = null;
function scheduleRepeatValidation() {
  clearTimeout(repeatValTimer);
  repeatValTimer = setTimeout(() => runRepeatValidation(), 350);
}

function clearRepeatValidation() {
  const box = document.getElementById('repeat-validacion');
  if (box) {
    box.classList.add('d-none');
    box.textContent = '';
    box.classList.remove('text-danger', 'text-success');
  }
}

async function runRepeatValidation() {
  const t = window.txt?.misreservas || {};
  const box = document.getElementById('repeat-validacion');
  const chk = document.getElementById('chk-repeat-weekly');
  if (!box || !chk?.checked || !state.salaId || !state.selectedDate || !state.selectedSlot) {
    if (box) box.classList.add('d-none');
    return;
  }
  const until = document.getElementById('repeat-until')?.value;
  if (!until) {
    box.classList.remove('d-none');
    box.classList.remove('text-success');
    box.classList.add('text-danger');
    box.textContent = t.repeat_need_until || 'Indique la fecha hasta.';
    return;
  }
  if (until < state.selectedDate) {
    box.classList.remove('d-none');
    box.classList.remove('text-success');
    box.classList.add('text-danger');
    box.textContent = t.repeat_bad_range || 'La fecha hasta debe ser posterior al día elegido.';
    return;
  }
  const dias = getSelectedRepeatDias();
  if (!dias.length) {
    box.classList.remove('d-none');
    box.classList.remove('text-success');
    box.classList.add('text-danger');
    box.textContent = t.repeat_need_dias || 'Seleccione al menos un día de la semana.';
    return;
  }

  const res = await validateSerieDisponibilidad(state.salaId, state.selectedDate, until, dias, state.selectedSlot, getSelectedInstrumentoIds());
  box.classList.remove('d-none');
  if (res.ok) {
    box.classList.remove('text-danger');
    box.classList.add('text-success');
    box.textContent = (t.repeat_ok || 'Disponible: {n} ocurrencias.').replace('{n}', String(res.total));
  } else {
    box.classList.remove('text-success');
    box.classList.add('text-danger');
    box.textContent = `${t.repeat_problemas || 'Sin lugar en algunas fechas:'}\n${res.texto}`;
  }
}

function getSelectedRepeatDias() {
  const out = [];
  for (let i = 1; i <= 7; i++) {
    const el = document.getElementById(`usr-dw${i}`);
    if (el?.checked) out.push(i);
  }
  return out.sort((a, b) => a - b);
}

function getSelectedInstrumentoIds() {
  return Array.from(state.selectedInstrumentoIds || []).map(id => parseInt(id, 10)).filter(id => id > 0);
}

/** Fechas entre ini y fin (inclusive) cuyo día de semana está en diasSemana (1=Lun … 7=Dom) */
function computeSerieFechas(fechaIni, fechaFin, diasSemana) {
  const set = new Set(diasSemana);
  const out = [];
  let d = new Date(`${fechaIni}T12:00:00`);
  const end = new Date(`${fechaFin}T12:00:00`);
  while (d <= end) {
    const isoDow = d.getDay() === 0 ? 7 : d.getDay();
    if (set.has(isoDow)) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      out.push(`${y}-${m}-${day}`);
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function slotMatches(slots, start, end) {
  if (!Array.isArray(slots)) return false;
  return slots.some(s => s.start === start && s.end === end);
}

async function validateSerieDisponibilidad(salaId, fechaIni, fechaFin, diasSemana, slot, instrumentoIds = []) {
  const t = window.txt?.misreservas || {};
  const ids = Array.isArray(instrumentoIds) ? instrumentoIds.map(id => parseInt(id, 10)).filter(id => id > 0) : [];
  const fechas = computeSerieFechas(fechaIni, fechaFin, diasSemana);
  if (!fechas.length) return { ok: false, total: 0, texto: t.repeat_sin_fechas || 'No hay fechas en el rango.' };

  const res = await API.request(`/user/reservas/sala/bundle?IdSalaReserva=${salaId}&from=${fechaIni}&to=${fechaFin}`, 'GET');
  const bundle = (res?.status === 'success') ? res.data : null;
  if (!bundle) return { ok: false, total: 0, texto: t.err_bundle || 'No se pudo cargar disponibilidad.' };

  const available = new Set((bundle.availableDays || []).map(String));
  const slotsByDay = bundle.slotsByDay || {};
  const problemas = [];
  for (const f of fechas) {
    if (!available.has(f)) {
      problemas.push(`${f}: ${t.repeat_dia_cerrado || 'día sin horarios de sala'}`);
      continue;
    }
    const slots = slotsByDay[f];
    if (!slotMatches(slots, slot.start, slot.end)) {
      problemas.push(`${f}: ${t.repeat_slot_no || 'no hay ese horario libre'}`);
      continue;
    }
    if (ids.length) {
      const instRes = await API.request(
        `/user/reservas/instrumentos/slot?IdSalaReserva=${salaId}&date=${f}&start=${slot.start}&end=${slot.end}`,
        'GET'
      );
      const rows = (instRes?.status === 'success' && Array.isArray(instRes.data)) ? instRes.data : [];
      const byId = new Map(rows.map(r => [parseInt(r.IdReservaInstrumento, 10), r]));
      for (const idInst of ids) {
        const row = byId.get(idInst);
        const remaining = row ? Math.max(0, parseInt(row.remaining, 10) || 0) : 0;
        if (remaining < 1) {
          const fromState = state.instrumentos?.find(x => parseInt(x.IdReservaInstrumento, 10) === idInst);
          const nombre = row?.NombreInstrumento
            ? String(row.NombreInstrumento)
            : (fromState?.NombreInstrumento ? String(fromState.NombreInstrumento) : `#${idInst}`);
          const motivo = row ? (t.repeat_inst_no || 'sin disponibilidad') : (t.repeat_inst_na || 'no disponible en esta sala');
          problemas.push(`${f}: ${nombre} — ${motivo}`);
        }
      }
    }
  }
  if (problemas.length) {
    return { ok: false, total: fechas.length, texto: problemas.slice(0, 12).join('\n') + (problemas.length > 12 ? `\n… (+${problemas.length - 12})` : '') };
  }
  return { ok: true, total: fechas.length, texto: '' };
}

async function reservar() {
  if (!state.salaId || !state.selectedDate || !state.selectedSlot) return;

  const chkRepeat = document.getElementById('chk-repeat-weekly');
  const repeatUntil = document.getElementById('repeat-until');
  const doRepeat = !!(chkRepeat && chkRepeat.checked);
  const untilDate = (repeatUntil && repeatUntil.value) ? repeatUntil.value : null;
  const t = window.txt?.misreservas || {};

  if (doRepeat) {
    const diasSemana = getSelectedRepeatDias();
    if (!diasSemana.length) {
      Swal.fire(t.swal_error || 'Error', t.repeat_need_dias || 'Seleccione al menos un día de la semana.', 'warning');
      return;
    }
    const fin = untilDate || addMonthsISO(state.selectedDate, 1);
    if (fin < state.selectedDate) {
      Swal.fire(t.swal_error || 'Error', t.repeat_bad_range || 'La fecha hasta debe ser posterior al día elegido.', 'warning');
      return;
    }
    const v = await validateSerieDisponibilidad(state.salaId, state.selectedDate, fin, diasSemana, state.selectedSlot, getSelectedInstrumentoIds());
    if (!v.ok) {
      Swal.fire(t.repeat_bloqueo_titulo || 'Sin disponibilidad', v.texto || t.repeat_problemas || 'Revisá los días.', 'warning');
      return;
    }
  }

  const payload = {
    IdSalaReserva: state.salaId,
    fechaini: state.selectedDate,
    Horacomienzo: state.selectedSlot.start,
    Horafin: state.selectedSlot.end,
    instrumentos: Array.from(state.selectedInstrumentoIds)
  };

  const confirm = await Swal.fire({
    title: t.confirm_titulo || 'Confirmar reserva',
    text: doRepeat ? (t.confirm_texto_serie || '¿Deseas solicitar esta reserva en serie?') : (t.confirm_texto || '¿Deseas confirmar esta reserva?'),
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: t.btn_confirmar || 'Confirmar',
    cancelButtonText: t.btn_cancelar || 'Cancelar'
  });
  if (!confirm.isConfirmed) return;

  Swal.fire({ title: t.procesando || 'Procesando...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
  try {
    let res;
    if (doRepeat) {
      const fin = untilDate || addMonthsISO(state.selectedDate, 1);
      const seriePayload = {
        IdSalaReserva: state.salaId,
        HoraInicio: state.selectedSlot.start,
        HoraFin: state.selectedSlot.end,
        FechaInicio: state.selectedDate,
        FechaFin: fin,
        TipoRepeat: 1,
        CadaNSemanas: 1,
        DiasSemana: getSelectedRepeatDias(),
        instrumentos: Array.from(state.selectedInstrumentoIds)
      };
      res = await API.request('/user/reservas/series/create', 'POST', seriePayload);
    } else {
      res = await API.request('/user/reservas/create', 'POST', payload);
    }
    if (res?.status === 'success') {
      const msgOk = doRepeat ? (t.ok_texto_serie || 'Tu serie fue solicitada y quedará pendiente de aprobación.') : (t.ok_texto || 'Tu reserva fue creada.');
      Swal.fire(t.ok_titulo || 'Reservado', msgOk, 'success');
      await refreshBundle();
      await loadMisReservas();
      clearSelection();
    } else {
      Swal.fire(t.swal_error || 'Error', res?.message || t.err_generico || 'No se pudo reservar.', 'error');
    }
  } catch (e) {
    Swal.fire(t.swal_error || 'Error', t.err_generico || 'No se pudo reservar.', 'error');
  }
}

function addMonthsISO(isoDate, months) {
  const [y, m, d] = String(isoDate).split('-').map(n => parseInt(n, 10));
  const dt = new Date(y, (m - 1), d);
  dt.setMonth(dt.getMonth() + (parseInt(months, 10) || 0));
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function isoDow(isoDate) {
  const [y, m, d] = String(isoDate).split('-').map(n => parseInt(n, 10));
  const dt = new Date(y, (m - 1), d);
  const js = dt.getDay(); // 0 Sun .. 6 Sat
  return js === 0 ? 7 : js; // 1..7 (Mon..Sun)
}

function formatMonthTitle(year, month) {
  const m = new Date(year, month - 1, 1);
  return m.toLocaleString((localStorage.getItem('lang') || 'es'), { month: 'long', year: 'numeric' }).toUpperCase();
}

function endOfMonth(year, month) {
  const d = new Date(year, month, 0);
  return `${year}-${String(month).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function sameSlot(a, b) {
  return a && b && a.start === b.start && a.end === b.end;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

