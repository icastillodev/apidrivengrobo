import { API } from '../../api.js';

const state = {
  items: [],
  selectedId: null,
  role: 0,
};

function t(k, fb) {
  const parts = k.split('.');
  let o = window.txt;
  for (const p of parts) {
    o = o?.[p];
  }
  return (typeof o === 'string' && o) || fb || k;
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}

function fmtDt(dt) {
  if (!dt) return '';
  try {
    const d = new Date(String(dt).replace(' ', 'T'));
    if (Number.isNaN(d.getTime())) return String(dt);
    return d.toLocaleString();
  } catch {
    return String(dt);
  }
}

function estadoInfo(estado) {
  const e = String(estado || '');
  if (e === 'espera_soporte') {
    return { cls: 'bg-warning text-dark', label: t('soporte.estado_espera_soporte', 'En espera de soporte') };
  }
  if (e === 'espera_usuario') {
    return { cls: 'bg-info text-dark', label: t('soporte.estado_espera_usuario', 'En espera de su respuesta') };
  }
  if (e === 'cerrado') {
    return { cls: 'bg-secondary', label: t('soporte.estado_cerrado', 'Cerrado') };
  }
  return { cls: 'bg-light text-dark', label: e };
}

export function initSupportSoporte() {
  state.role = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel') || '0', 10);

  const ta = document.getElementById('reply-text');
  if (ta) {
    ta.placeholder = t('soporte.placeholder_respuesta', 'Escriba su mensaje…');
  }

  document.getElementById('btn-nuevo-ticket')?.addEventListener('click', () => openNuevoTicket());
  document.getElementById('btn-reply')?.addEventListener('click', () => sendReply());
  document.getElementById('btn-cerrar')?.addEventListener('click', () => cerrarSeleccionado());
  document.getElementById('lista-tickets')?.addEventListener('click', (ev) => {
    const row = ev.target.closest('[data-ticket-id]');
    if (!row) return;
    const id = parseInt(row.getAttribute('data-ticket-id'), 10);
    if (id) selectTicket(id);
  });

  loadList();
}

async function loadList() {
  const box = document.getElementById('lista-tickets');
  if (!box) return;
  box.innerHTML = `<div class="p-3 small text-muted">${escapeHtml(t('soporte.cargando', 'Cargando…'))}</div>`;

  const res = await API.request('/support/tickets?page=1&limit=50', 'GET');
  if (res?.status !== 'success' || !res.data) {
    box.innerHTML = `<div class="p-3 small text-danger">${escapeHtml(res?.message || t('soporte.error_cargar', 'No se pudo cargar.'))}</div>`;
    return;
  }

  state.items = Array.isArray(res.data.items) ? res.data.items : [];
  if (state.items.length === 0) {
    box.innerHTML = `<div class="p-3 small text-muted">${escapeHtml(t('soporte.sin_tickets', 'No hay tickets.'))}</div>`;
    clearPanel();
    return;
  }

  const gecko = state.role === 1;
  let html = '';
  for (const row of state.items) {
    const id = row.IdSupportTicket;
    const { cls, label } = estadoInfo(row.estado);
    const sub = gecko
      ? [row.UsrA, row.NombreInst].filter(Boolean).join(' · ')
      : fmtDt(row.FechaActualizacion);
    const active = state.selectedId === id ? 'active' : '';
    html += `
      <button type="button" class="list-group-item list-group-item-action ${active} text-start" data-ticket-id="${id}">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <span class="fw-bold small">${escapeHtml(row.asunto || '')}</span>
          <span class="badge ${cls} shrink-0">${escapeHtml(label)}</span>
        </div>
        <div class="small text-muted mt-1">${escapeHtml(sub || '')}</div>
      </button>`;
  }
  box.innerHTML = html;

  if (state.selectedId && !state.items.some((x) => x.IdSupportTicket === state.selectedId)) {
    state.selectedId = null;
    clearPanel();
  } else if (state.selectedId) {
    await loadDetail(state.selectedId);
  }
}

function clearPanel() {
  document.getElementById('panel-ticket-placeholder')?.classList.remove('d-none');
  document.getElementById('panel-ticket-cont')?.classList.add('d-none');
  document.getElementById('panel-ticket-placeholder').textContent = t(
    'soporte.seleccione_ticket',
    'Seleccione un ticket de la lista.'
  );
}

async function selectTicket(id) {
  state.selectedId = id;
  document.querySelectorAll('#lista-tickets [data-ticket-id]').forEach((el) => {
    el.classList.toggle('active', parseInt(el.getAttribute('data-ticket-id'), 10) === id);
  });
  await loadDetail(id);
}

async function loadDetail(id) {
  const ph = document.getElementById('panel-ticket-placeholder');
  const cont = document.getElementById('panel-ticket-cont');
  if (!ph || !cont) return;

  ph.classList.remove('d-none');
  cont.classList.add('d-none');
  ph.textContent = t('soporte.cargando', 'Cargando…');

  const res = await API.request(`/support/tickets/${id}`, 'GET');
  if (res?.status !== 'success' || !res.data) {
    ph.textContent = res?.message || t('soporte.error_cargar', 'No se pudo cargar.');
    return;
  }

  const { ticket, mensajes, puedeResponder, puedeCerrar } = res.data;
  ph.classList.add('d-none');
  cont.classList.remove('d-none');

  document.getElementById('ticket-asunto').textContent = ticket.asunto || '';
  const gecko = state.role === 1;
  let meta = `#${ticket.IdSupportTicket} · ${fmtDt(ticket.FechaCreacion)}`;
  if (gecko) {
    const u = [ticket.UsrA, [ticket.NombreA, ticket.ApellidoA].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
    if (u) meta += ` · ${u}`;
    if (ticket.NombreInst) meta += ` · ${ticket.NombreInst}`;
  }
  document.getElementById('ticket-meta').textContent = meta;

  const { cls, label } = estadoInfo(ticket.estado);
  const badge = document.getElementById('ticket-estado-badge');
  badge.className = `badge rounded-pill ${cls}`;
  badge.textContent = label;

  const hint = document.getElementById('ticket-turno-hint');
  if (ticket.estado === 'cerrado') {
    hint.classList.add('d-none');
    hint.textContent = '';
  } else if (puedeResponder) {
    hint.textContent = gecko
      ? t('soporte.turno_soporte', 'Es su turno: responda al usuario.')
      : t('soporte.turno_usuario', 'Es su turno: puede enviar una respuesta.');
    hint.className = 'alert alert-success py-2 px-3 small mb-3';
    hint.classList.remove('d-none');
  } else {
    hint.textContent = gecko
      ? t('soporte.turno_espera_usuario', 'En espera del mensaje del usuario.')
      : t('soporte.turno_espera_soporte', 'En espera de respuesta del equipo de soporte.');
    hint.className = 'alert alert-secondary py-2 px-3 small mb-3';
    hint.classList.remove('d-none');
  }

  const wrap = document.getElementById('ticket-mensajes');
  wrap.innerHTML = '';
  const list = Array.isArray(mensajes) ? mensajes : [];
  if (list.length === 0) {
    wrap.innerHTML = `<div class="small text-muted">${escapeHtml(t('soporte.sin_mensajes', 'Sin mensajes.'))}</div>`;
  } else {
    for (const m of list) {
      const sop = parseInt(m.es_soporte, 10) === 1;
      const who = sop
        ? t('soporte.msg_soporte', 'Soporte Gecko')
        : [m.NombreA, m.ApellidoA].filter(Boolean).join(' ') || m.UsrA || t('soporte.usuario', 'Usuario');
      const align = sop ? 'ms-auto' : 'me-auto';
      const bg = sop ? 'bg-primary text-white' : 'bg-white border';
      wrap.insertAdjacentHTML(
        'beforeend',
        `<div class="mb-2 ${align}" style="max-width:92%">
          <div class="small opacity-75 mb-1">${escapeHtml(who)} · ${escapeHtml(fmtDt(m.FechaCreacion))}</div>
          <div class="rounded p-2 ${bg}" style="white-space:pre-wrap;word-break:break-word;">${escapeHtml(m.cuerpo || '')}</div>
        </div>`
      );
    }
  }

  const wrapReply = document.getElementById('wrap-reply');
  const btnCerrar = document.getElementById('btn-cerrar');
  if (puedeResponder && ticket.estado !== 'cerrado') {
    wrapReply?.classList.remove('d-none');
    document.getElementById('reply-text').value = '';
  } else {
    wrapReply?.classList.add('d-none');
  }
  if (puedeCerrar) {
    btnCerrar?.classList.remove('d-none');
  } else {
    btnCerrar?.classList.add('d-none');
  }
}

async function sendReply() {
  const id = state.selectedId;
  if (!id) return;
  const txt = document.getElementById('reply-text')?.value?.trim() || '';
  if (!txt) {
    await Swal.fire({ icon: 'warning', text: t('soporte.msg_vacio', 'Escriba un mensaje.') });
    return;
  }
  const res = await API.request(`/support/tickets/${id}/reply`, 'POST', { mensaje: txt });
  if (res?.status !== 'success') {
    await Swal.fire({ icon: 'error', text: res?.message || t('soporte.error_enviar', 'No se pudo enviar.') });
    return;
  }
  await loadList();
  await loadDetail(id);
}

async function cerrarSeleccionado() {
  const id = state.selectedId;
  if (!id) return;
  const ok = await Swal.fire({
    icon: 'question',
    text: t('soporte.cerrar_confirm', '¿Cerrar este ticket? No se podrán añadir más mensajes.'),
    showCancelButton: true,
    confirmButtonText: t('soporte.cerrar_si', 'Sí, cerrar'),
    cancelButtonText: t('soporte.cerrar_no', 'Cancelar'),
  });
  if (!ok.isConfirmed) return;
  const res = await API.request(`/support/tickets/${id}/cerrar`, 'POST', {});
  if (res?.status !== 'success') {
    await Swal.fire({ icon: 'error', text: res?.message || t('soporte.error_cerrar', 'No se pudo cerrar.') });
    return;
  }
  await loadList();
  await loadDetail(id);
}

async function openNuevoTicket() {
  const gecko = state.role === 1;
  const note = gecko
    ? `<p class="small text-muted mb-2">${escapeHtml(t('soporte.nuevo_gecko_hint', 'Como GeckoDev puede abrir tickets de prueba; el correo se envía igual a soporte.'))}</p>`
    : '';
  const html = `
    ${note}
    <label class="form-label small mb-1">${escapeHtml(t('soporte.asunto', 'Asunto'))}</label>
    <input type="text" id="sw-asunto" class="form-control form-control-sm mb-2" maxlength="255">
    <label class="form-label small mb-1">${escapeHtml(t('soporte.mensaje', 'Mensaje'))}</label>
    <textarea id="sw-msg" class="form-control form-control-sm" rows="4"></textarea>
  `;
  const r = await Swal.fire({
    title: t('soporte.nuevo_ticket', 'Nuevo ticket'),
    html,
    showCancelButton: true,
    confirmButtonText: t('soporte.btn_crear', 'Crear'),
    cancelButtonText: t('soporte.cerrar_no', 'Cancelar'),
    focusConfirm: false,
    preConfirm: () => {
      const asunto = document.getElementById('sw-asunto')?.value?.trim() || '';
      const mensaje = document.getElementById('sw-msg')?.value?.trim() || '';
      if (!asunto || !mensaje) {
        Swal.showValidationMessage(t('soporte.validar_campos', 'Complete asunto y mensaje.'));
        return false;
      }
      return { asunto, mensaje };
    },
  });
  if (!r.isConfirmed || !r.value) return;

  const res = await API.request('/support/tickets', 'POST', r.value);
  if (res?.status !== 'success' || !res.data?.IdSupportTicket) {
    await Swal.fire({ icon: 'error', text: res?.message || t('soporte.error_crear', 'No se pudo crear el ticket.') });
    return;
  }
  const newId = res.data.IdSupportTicket;
  state.selectedId = newId;
  await Swal.fire({ icon: 'success', text: t('soporte.creado_ok', 'Ticket creado.'), timer: 1600, showConfirmButton: false });
  await loadList();
  await selectTicket(newId);
}
