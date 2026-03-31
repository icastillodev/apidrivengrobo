import { API } from '../api.js';

const state = {
  token: null,
  sala: null,
  year: null,
  month: null,
  bundle: null,
  selectedDate: null,
  selectedSlot: null
};

export function initQRSalaPage() {
  state.token = getTokenFromUrl();
  if (!state.token) {
    Swal.fire('Error', window.txt?.qr_sala?.err_token || 'Enlace inválido.', 'error');
    return;
  }

  const now = new Date();
  state.year = now.getFullYear();
  state.month = now.getMonth() + 1;

  const lbl = document.getElementById('current-lang-lbl');
  if (lbl) lbl.innerText = (localStorage.getItem('lang') || localStorage.getItem('idioma') || 'es').toUpperCase();

  document.getElementById('btn-prev-month').onclick = () => changeMonth(-1);
  document.getElementById('btn-next-month').onclick = () => changeMonth(1);
  document.getElementById('btn-clear').onclick = () => clearSelection();
  document.getElementById('btn-reservar').onclick = () => reservar();

  renderAuthZone();
  loadBundle();
}

function renderAuthZone() {
  const zone = document.getElementById('auth-zone');
  const token = localStorage.getItem('token');
  const name = localStorage.getItem('userName');
  const role = parseInt(localStorage.getItem('userLevel'), 10);
  const t = window.txt?.qr_sala || {};

  if (token && name) {
    zone.innerHTML = `
      <div class="d-flex align-items-center gap-2 bg-light px-2 py-1 rounded border">
        <i class="bi bi-person-circle text-primary"></i>
        <span class="small fw-bold">${escapeHtml(name)}</span>
        <button class="btn btn-xs btn-outline-danger py-0 px-2" onclick="window.__qrSalaLogout()"><i class="bi bi-box-arrow-right"></i></button>
      </div>
    `;
    window.__qrSalaLogout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('userLevel');
      localStorage.removeItem('userName');
      window.location.reload();
    };

    // Admin: habilitar etiqueta QR
    if ([1, 2, 4, 5, 6].includes(role)) {
      const btn = document.getElementById('btn-qr-etiqueta');
      if (btn) {
        btn.classList.remove('d-none');
        btn.onclick = () => openEtiquetaModal();
      }
    }
  } else {
    zone.innerHTML = `
      <button class="btn btn-sm btn-outline-primary fw-bold" onclick="window.__qrSalaLogin()">
        <i class="bi bi-person-lock me-1"></i> ${t.btn_login || 'Acceso personal'}
      </button>
    `;
    window.__qrSalaLogin = () => {
      localStorage.setItem('redirectAfterLogin', window.location.href);
      const inst = localStorage.getItem('NombreInst') || '';
      const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/';
      window.location.href = `${basePath}${inst}/`;
    };
  }
}

function openEtiquetaModal() {
  const salaName = document.getElementById('sala-nombre')?.innerText || '';
  const salaLugar = document.getElementById('sala-lugar')?.innerText || '';
  const t = window.txt?.qr_sala || {};

  const titleInput = document.getElementById('qr-custom-title');
  const textInput = document.getElementById('qr-custom-text');
  if (titleInput && !titleInput.value) titleInput.value = salaName || (t.titulo || 'RESERVAS DE SALA');
  if (textInput && !textInput.value) textInput.value = salaLugar ? `${t.ph_indicacion || 'Escaneá para reservar'} - ${salaLugar}` : (t.ph_indicacion || 'Escaneá para reservar');

  const btnGen = document.getElementById('btn-gen-pdf');
  if (btnGen) btnGen.onclick = () => generarEtiquetaPDF();

  new bootstrap.Modal(document.getElementById('modal-personalizar-qr-sala')).show();
}

async function generarEtiquetaPDF() {
  const { jsPDF } = window.jspdf;
  const sizeType = document.getElementById('qr-custom-size').value;
  const config = {
    chico:   { doc: [50, 50],   fontT: 9,  fontB: 7,  qrSize: 28, qrY: 18 },
    mediano: { doc: [80, 80],   fontT: 14, fontB: 10, qrSize: 45, qrY: 28 },
    grande:  { doc: [100, 100], fontT: 18, fontB: 12, qrSize: 60, qrY: 34 }
  };
  const cfg = config[sizeType] || config.mediano;
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: cfg.doc });
  const midX = cfg.doc[0] / 2;

  const tit = document.getElementById('qr-custom-title').value || '';
  const txt = document.getElementById('qr-custom-text').value || '';

  doc.setFont("helvetica", "bold"); doc.setFontSize(cfg.fontT);
  if (tit) doc.text(tit, midX, 10, { align: 'center' });
  doc.setFont("helvetica", "normal"); doc.setFontSize(cfg.fontB);
  if (txt) doc.text(txt, midX, 16, { align: 'center', maxWidth: cfg.doc[0] - 10 });

  const t = window.txt?.qr_sala || {};
  Swal.fire({ title: t.procesando_etiqueta || 'Generando etiqueta...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

  try {
    // Generar token QR (si no existe) para esta sala
    const salaId = parseInt(state.sala?.IdSalaReserva, 10);
    const resToken = await API.request('/admin/config/reservas/sala/generar-qr', 'POST', { IdSalaReserva: salaId });
    if (resToken?.status !== 'success') throw new Error(resToken?.message || 'No se pudo generar token');

    const codigo = resToken.codigo;
    const basePath = window.location.origin + ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/');
    const publicUrl = `${basePath}qr-sala/${codigo}`;

    // Render QR invisible
    const buf = document.getElementById('qrcode-buffer');
    buf.innerHTML = '';
    new QRCode(buf, { text: publicUrl, width: 400, height: 400 });

    setTimeout(() => {
      const qrImg = buf.querySelector('img') || buf.querySelector('canvas');
      if (!qrImg) throw new Error('No se pudo renderizar el QR');
      const qrBase64 = qrImg.src || qrImg.toDataURL('image/png');
      doc.addImage(qrBase64, 'PNG', midX - (cfg.qrSize / 2), cfg.qrY, cfg.qrSize, cfg.qrSize);
      doc.save(`QR_Sala_${salaId}.pdf`);
      bootstrap.Modal.getInstance(document.getElementById('modal-personalizar-qr-sala')).hide();
      Swal.close();
    }, 150);
  } catch (e) {
    console.error(e);
    Swal.fire(t.err || 'Error', e.message || t.err_generico || 'No se pudo generar.', 'error');
  }
}

async function loadBundle() {
  renderCalendar();
  const from = `${state.year}-${String(state.month).padStart(2,'0')}-01`;
  const to = endOfMonth(state.year, state.month);

  const res = await API.request(`/reservas/sala/public-bundle?token=${state.token}&from=${from}&to=${to}`, 'GET');
  if (res?.status !== 'success') {
    Swal.fire('Error', res?.message || window.txt?.qr_sala?.err_cargar || 'No se pudo cargar.', 'error');
    return;
  }

  state.bundle = res.data;
  state.sala = res.data?.sala || null;
  document.getElementById('sala-nombre').innerText = state.sala?.Nombre || '—';
  document.getElementById('sala-lugar').innerText = state.sala?.Lugar || '—';

  renderCalendar();
  renderDayLists();
  updateReserveButton();
}

function changeMonth(delta) {
  let y = state.year;
  let m = state.month + delta;
  if (m < 1) { m = 12; y--; }
  if (m > 12) { m = 1; y++; }
  state.year = y;
  state.month = m;
  clearSelection();
  loadBundle();
}

function renderCalendar() {
  document.getElementById('calendar-title').textContent = formatMonthTitle(state.year, state.month);
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
    if (!inMonth) div.classList.add('disabled');
    if (isAvailable) div.classList.add('available');
    if (dateStr && state.selectedDate === dateStr) div.classList.add('selected');

    div.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div class="fw-bold">${inMonth ? dayNum : ''}</div>
        ${isAvailable ? `<span class="badge bg-success-subtle text-success-emphasis border border-success-subtle" style="font-size:10px;">${window.txt?.qr_sala?.badge_disp || 'DISP'}</span>` : ''}
      </div>
    `;

    if (inMonth) {
      div.onclick = () => {
        state.selectedDate = dateStr;
        state.selectedSlot = null;
        renderCalendar();
        renderDayLists();
        updateReserveButton();
      };
    }

    grid.appendChild(div);
  }
}

function renderDayLists() {
  const slotsList = document.getElementById('slots-list');
  const slotsEmpty = document.getElementById('slots-empty');
  const busyList = document.getElementById('busy-list');
  const busyEmpty = document.getElementById('busy-empty');

  slotsList.innerHTML = '';
  busyList.innerHTML = '';

  const date = state.selectedDate;
  const slots = date ? (state.bundle?.slotsByDay?.[date] || []) : [];
  const busy = date ? (state.bundle?.busyByDay?.[date] || []) : [];

  slotsEmpty.classList.toggle('d-none', slots.length > 0);
  busyEmpty.classList.toggle('d-none', busy.length > 0);

  slots.forEach(s => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm slot-btn ' + (state.selectedSlot && sameSlot(state.selectedSlot, s) ? 'btn-success' : 'btn-outline-success');
    btn.textContent = `${s.start} - ${s.end}`;
    btn.onclick = () => {
      state.selectedSlot = s;
      renderDayLists();
      updateReserveButton();
    };
    slotsList.appendChild(btn);
  });

  busy.forEach(b => {
    const mine = !!b.mine;
    busyList.insertAdjacentHTML('beforeend', `
      <div class="d-flex justify-content-between align-items-center border rounded p-2 bg-light">
        <div class="fw-bold">${b.start} - ${b.end}</div>
        <span class="badge ${mine ? 'bg-primary' : 'bg-danger'}">${mine ? (window.txt?.qr_sala?.reservado_vos || 'Reservado por vos') : (window.txt?.qr_sala?.reservado || 'RESERVADO')}</span>
      </div>
    `);
  });
}

function updateReserveButton() {
  const btn = document.getElementById('btn-reservar');
  const logged = !!localStorage.getItem('token');
  btn.disabled = !(logged && state.sala?.IdSalaReserva && state.selectedDate && state.selectedSlot);
}

function clearSelection() {
  state.selectedDate = null;
  state.selectedSlot = null;
  renderCalendar();
  renderDayLists();
  updateReserveButton();
}

async function reservar() {
  const logged = !!localStorage.getItem('token');
  if (!logged) return;
  if (!state.sala?.IdSalaReserva || !state.selectedDate || !state.selectedSlot) return;

  const payload = {
    IdSalaReserva: parseInt(state.sala.IdSalaReserva, 10),
    fechaini: state.selectedDate,
    Horacomienzo: state.selectedSlot.start,
    Horafin: state.selectedSlot.end,
    instrumentos: []
  };

  const t = window.txt?.qr_sala || {};
  const confirm = await Swal.fire({
    title: t.confirm_titulo || 'Confirmar reserva',
    text: t.confirm_texto || '¿Deseas reservar este horario?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: t.btn_confirmar || 'Confirmar',
    cancelButtonText: t.btn_cancelar || 'Cancelar'
  });
  if (!confirm.isConfirmed) return;

  Swal.fire({ title: t.procesando || 'Procesando...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
  const res = await API.request('/user/reservas/create', 'POST', payload);
  if (res?.status === 'success') {
    Swal.fire(t.ok || 'OK', t.ok_texto || 'Reserva creada.', 'success');
    await loadBundle();
    clearSelection();
  } else {
    Swal.fire(t.err || 'Error', res?.message || t.err_generico || 'No se pudo reservar.', 'error');
  }
}

function getTokenFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  let token = urlParams.get('token');
  if (!token) {
    const match = window.location.href.match(/\/qr-sala\/([a-zA-Z0-9]{6,80})/);
    if (match) token = match[1];
  }
  return token;
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

