import { API } from '../../api.js';

const state = {
  salas: [],
  salaId: null,
  year: null,
  month: null, // 1-12
  bundle: null,
  selectedDate: null, // YYYY-MM-DD
  /** Franjas atómicas elegidas (30m/1h); deben formar un bloque contiguo. */
  selectedSlots: [],
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
      if (chkRepeat.checked && state.selectedDate) {
        bindRepeatUntilToUsuarioSerie();
        if (!repeatUntil.value) repeatUntil.value = usuarioSerieFechaCap(state.selectedDate);
      }
      if (chkRepeat.checked) syncRepeatDiasFromSelectedDay();
      scheduleRepeatValidation();
    };
    repeatUntil.onchange = () => {
      bindRepeatUntilToUsuarioSerie();
      scheduleRepeatValidation();
    };
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
  state.selectedSlots = [];
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
    bindRepeatUntilToUsuarioSerie();
    repeatUntil.value = usuarioSerieFechaCap(dateStr);
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
    const sel = state.selectedSlots.some(x => sameSlot(x, s));
    btn.className = 'btn btn-sm slot-btn ' + (sel ? 'btn-success' : 'btn-outline-success');
    btn.textContent = `${s.start} - ${s.end}`;
    btn.onclick = () => toggleSlot(s);
    list.appendChild(btn);
  });
}

function toggleSlot(slot) {
  const t = window.txt?.misreservas || {};
  const idx = state.selectedSlots.findIndex(x => sameSlot(x, slot));
  let next;
  if (idx >= 0) {
    next = state.selectedSlots.filter((_, i) => i !== idx);
    next = longestContiguousRun(sortSlotsByStart(next));
  } else {
    next = sortSlotsByStart([...state.selectedSlots, slot]);
    if (!areSlotsContiguous(next)) {
      Swal.fire(t.swal_error || 'Error', t.slots_contiguous || 'Elegí franjas consecutivas (una que termine cuando empieza la siguiente).', 'info');
      return;
    }
  }
  state.selectedSlots = next;
  state.selectedInstrumentoIds = new Set();
  renderSlots();
  renderInstrumentos();
  updateReserveButton();
  scheduleRepeatValidation();
  void loadInstrumentosForMergedRange();
}

async function loadInstrumentosForMergedRange() {
  const merged = getMergedRangeFromSlots();
  if (!state.salaId || !state.selectedDate || !merged) {
    state.instrumentos = [];
    renderInstrumentos();
    return;
  }
  const url = `/user/reservas/instrumentos/slot?IdSalaReserva=${state.salaId}&date=${state.selectedDate}&start=${merged.start}&end=${merged.end}`;
  const res = await API.request(url, 'GET');
  state.instrumentos = (res?.status === 'success' && Array.isArray(res.data)) ? res.data : [];
  renderInstrumentos();
}

function renderInstrumentos() {
  const cont = document.getElementById('inst-list');
  const empty = document.getElementById('inst-empty');
  cont.innerHTML = '';

  if (!getMergedRangeFromSlots()) {
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
  btn.disabled = !(state.salaId && state.selectedDate && state.selectedSlots.length > 0);
}

function clearSelection() {
  state.selectedDate = null;
  state.selectedSlots = [];
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

/** Coincide con api UserReservasSeriesModel: FechaFin <= FechaInicio + 1 mes. */
function usuarioSerieFechaCap(fechaIni) {
  return addMonthsISO(fechaIni, 1);
}

function bindRepeatUntilToUsuarioSerie() {
  const el = document.getElementById('repeat-until');
  if (!el || !state.selectedDate) return;
  const cap = usuarioSerieFechaCap(state.selectedDate);
  el.min = state.selectedDate;
  el.max = cap;
  const v = (el.value || '').trim();
  if (!v || v < state.selectedDate) return;
  if (v > cap) el.value = cap;
}

function effectiveUsuarioSerieFechaFinInternal() {
  if (!state.selectedDate) return null;
  bindRepeatUntilToUsuarioSerie();
  const cap = usuarioSerieFechaCap(state.selectedDate);
  const raw = (document.getElementById('repeat-until')?.value || '').trim();
  let fin = raw || cap;
  if (fin < state.selectedDate) fin = state.selectedDate;
  if (fin > cap) fin = cap;
  return fin;
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
  if (!box || !chk?.checked || !state.salaId || !state.selectedDate || !getMergedRangeFromSlots()) {
    if (box) box.classList.add('d-none');
    return;
  }
  bindRepeatUntilToUsuarioSerie();
  const until = effectiveUsuarioSerieFechaFinInternal();
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

  const merged = getMergedRangeFromSlots();
  const res = await validateSerieDisponibilidad(state.salaId, state.selectedDate, until, dias, merged, getSelectedInstrumentoIds());
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

/** El rango [merged.start, merged.end] está cubierto por franjas atómicas consecutivas del día. */
function daySlotsCoverMerged(daySlots, merged) {
  if (!merged || !Array.isArray(daySlots) || !daySlots.length) return false;
  let cur = merged.start;
  const sorted = sortSlotsByStart(daySlots);
  while (cur !== merged.end) {
    const next = sorted.find(s => s.start === cur);
    if (!next) return false;
    cur = next.end;
  }
  return true;
}

async function validateSerieDisponibilidad(salaId, fechaIni, fechaFin, diasSemana, merged, instrumentoIds = []) {
  const t = window.txt?.misreservas || {};
  const ids = Array.isArray(instrumentoIds) ? instrumentoIds.map(id => parseInt(id, 10)).filter(id => id > 0) : [];
  if (!merged?.start || !merged?.end) return { ok: false, total: 0, texto: t.repeat_slot_no || 'no hay ese horario libre' };

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
    if (!daySlotsCoverMerged(slots, merged)) {
      problemas.push(`${f}: ${t.repeat_slot_no || 'no hay ese horario libre'}`);
      continue;
    }
    if (ids.length) {
      const instRes = await API.request(
        `/user/reservas/instrumentos/slot?IdSalaReserva=${salaId}&date=${f}&start=${merged.start}&end=${merged.end}`,
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
  const merged = getMergedRangeFromSlots();
  if (!state.salaId || !state.selectedDate || !merged) return;

  const chkRepeat = document.getElementById('chk-repeat-weekly');
  const doRepeat = !!(chkRepeat && chkRepeat.checked);
  const t = window.txt?.misreservas || {};

  if (doRepeat) {
    const diasSemana = getSelectedRepeatDias();
    if (!diasSemana.length) {
      Swal.fire(t.swal_error || 'Error', t.repeat_need_dias || 'Seleccione al menos un día de la semana.', 'warning');
      return;
    }
    bindRepeatUntilToUsuarioSerie();
    const fin = effectiveUsuarioSerieFechaFinInternal();
    if (!fin || fin < state.selectedDate) {
      Swal.fire(t.swal_error || 'Error', t.repeat_bad_range || 'La fecha hasta debe ser igual o posterior al día elegido.', 'warning');
      return;
    }
    const v = await validateSerieDisponibilidad(state.salaId, state.selectedDate, fin, diasSemana, merged, getSelectedInstrumentoIds());
    if (!v.ok) {
      Swal.fire(t.repeat_bloqueo_titulo || 'Sin disponibilidad', v.texto || t.repeat_problemas || 'Revisá los días.', 'warning');
      return;
    }
  }

  const payload = {
    IdSalaReserva: state.salaId,
    fechaini: state.selectedDate,
    Horacomienzo: merged.start,
    Horafin: merged.end,
    instrumentos: Array.from(state.selectedInstrumentoIds)
  };

  const rangoTxt = `${merged.start} – ${merged.end}`;
  const confirmTextSimple = (t.confirm_texto_rango || t.confirm_texto || '¿Deseas confirmar esta reserva?').replace(/\{rango\}/g, rangoTxt);
  const confirm = await Swal.fire({
    title: t.confirm_titulo || 'Confirmar reserva',
    text: doRepeat ? (t.confirm_texto_serie || '¿Deseas solicitar esta reserva en serie?') : confirmTextSimple,
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
      bindRepeatUntilToUsuarioSerie();
      const fin = effectiveUsuarioSerieFechaFinInternal();
      const seriePayload = {
        IdSalaReserva: state.salaId,
        HoraInicio: merged.start,
        HoraFin: merged.end,
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
      let msgOk = doRepeat ? (t.ok_texto_serie || 'Tu serie fue solicitada y quedará pendiente de aprobación.') : (t.ok_texto || 'Tu reserva fue creada.');
      if (doRepeat && res.data) {
        const creadas = parseInt(res.data.creadas, 10) || 0;
        const omit = parseInt(res.data.omitidas, 10) || 0;
        if (!creadas && omit > 0) msgOk = t.serie_sin_ocurrencias || msgOk;
        else if (creadas >= 0 && omit > 0) {
          msgOk = (t.serie_resumen_partial || '').replace('{c}', String(creadas)).replace('{o}', String(omit)).trim() || msgOk;
        }
      }
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

function sortSlotsByStart(slots) {
  return [...(slots || [])].sort((a, b) => String(a.start).localeCompare(String(b.start)));
}

function areSlotsContiguous(sorted) {
  if (!sorted.length) return false;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].end !== sorted[i + 1].start) return false;
  }
  return true;
}

/** Mayor subsecuencia contigua (por tiempo) dentro de la lista ordenada por inicio. */
function longestContiguousRun(sortedInput) {
  const sorted = sortSlotsByStart(sortedInput);
  if (!sorted.length) return [];
  let best = [];
  let cur = [];
  for (const s of sorted) {
    if (!cur.length) {
      cur = [s];
    } else if (cur[cur.length - 1].end === s.start) {
      cur.push(s);
    } else {
      if (cur.length > best.length) best = cur;
      cur = [s];
    }
  }
  if (cur.length > best.length) best = cur;
  return best;
}

function getMergedRangeFromSlots() {
  const sorted = sortSlotsByStart(state.selectedSlots);
  if (!sorted.length || !areSlotsContiguous(sorted)) return null;
  return { start: sorted[0].start, end: sorted[sorted.length - 1].end };
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

