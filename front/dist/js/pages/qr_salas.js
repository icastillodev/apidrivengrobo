/**
 * QR público: todas las salas de la institución (token institucional).
 */
import { API } from '../api.js';

const state = {
  token: null,
  dateStr: null,
  bundle: null
};

export function initQRSalasPage() {
  state.token = getTokenFromUrl();
  if (!state.token) {
    Swal.fire('Error', window.txt?.qr_salas?.err_token || '', 'error');
    return;
  }

  const today = new Date();
  state.dateStr = toYMD(today);

  const lbl = document.getElementById('current-lang-lbl');
  if (lbl) lbl.innerText = (localStorage.getItem('lang') || localStorage.getItem('idioma') || 'es').toUpperCase();

  const inp = document.getElementById('qr-salas-fecha');
  if (inp) {
    inp.value = state.dateStr;
    inp.onchange = () => {
      state.dateStr = inp.value;
      loadBundle();
    };
  }

  document.getElementById('btn-qr-salas-reload')?.addEventListener('click', () => loadBundle());

  renderAuthZone();
  loadBundle();
}

function toYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function renderAuthZone() {
  const zone = document.getElementById('auth-zone');
  const token = localStorage.getItem('token');
  const name = localStorage.getItem('userName');
  const role = parseInt(localStorage.getItem('userLevel'), 10);
  const t = window.txt?.qr_salas || {};

  if (token && name) {
    zone.innerHTML = `
      <div class="d-flex align-items-center gap-2 bg-light px-2 py-1 rounded border">
        <i class="bi bi-person-circle text-primary"></i>
        <span class="small fw-bold">${escapeHtml(name)}</span>
        <button class="btn btn-xs btn-outline-danger py-0 px-2" type="button" onclick="window.__qrSalasLogout()"><i class="bi bi-box-arrow-right"></i></button>
      </div>
    `;
    window.__qrSalasLogout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('userLevel');
      localStorage.removeItem('userName');
      window.location.reload();
    };

    if ([1, 2, 4, 5, 6].includes(role)) {
      const btn = document.getElementById('btn-qr-etiqueta-general');
      if (btn) {
        btn.classList.remove('d-none');
        btn.onclick = () => openEtiquetaModal();
      }
    }
  } else {
    zone.innerHTML = `
      <button class="btn btn-sm btn-outline-primary fw-bold" type="button" onclick="window.__qrSalasLogin()">
        <i class="bi bi-person-lock me-1"></i> ${t.btn_login || ''}
      </button>
    `;
    window.__qrSalasLogin = () => {
      localStorage.setItem('redirectAfterLogin', window.location.href);
      const inst = localStorage.getItem('NombreInst') || '';
      const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/';
      window.location.href = `${basePath}${inst}/`;
    };
  }
}

function openEtiquetaModal() {
  const instName = document.getElementById('inst-nombre')?.innerText || '';
  const t = window.txt?.qr_sala || {};
  const titleInput = document.getElementById('qr-custom-title');
  const textInput = document.getElementById('qr-custom-text');
  if (titleInput && !titleInput.value) titleInput.value = instName || (t.titulo || '');
  if (textInput && !textInput.value) textInput.value = window.txt?.qr_salas?.etiqueta_default || '';

  const btnGen = document.getElementById('btn-gen-pdf');
  if (btnGen) btnGen.onclick = () => generarEtiquetaPDF();

  new bootstrap.Modal(document.getElementById('modal-personalizar-qr-salas')).show();
}

async function generarEtiquetaPDF() {
  const { jsPDF } = window.jspdf;
  const sizeType = document.getElementById('qr-custom-size').value;
  const config = {
    chico: { doc: [50, 50], fontT: 9, fontB: 7, qrSize: 28, qrY: 18 },
    mediano: { doc: [80, 80], fontT: 14, fontB: 10, qrSize: 45, qrY: 28 },
    grande: { doc: [100, 100], fontT: 18, fontB: 12, qrSize: 60, qrY: 34 }
  };
  const cfg = config[sizeType] || config.mediano;
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: cfg.doc });
  const midX = cfg.doc[0] / 2;

  const tit = document.getElementById('qr-custom-title').value || '';
  const txt = document.getElementById('qr-custom-text').value || '';

  doc.setFont('helvetica', 'bold'); doc.setFontSize(cfg.fontT);
  if (tit) doc.text(tit, midX, 10, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(cfg.fontB);
  if (txt) doc.text(txt, midX, 16, { align: 'center', maxWidth: cfg.doc[0] - 10 });

  const t = window.txt?.qr_sala || {};
  Swal.fire({ title: t.procesando_etiqueta || '...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

  try {
    const resToken = await API.request('/admin/config/reservas/institucion/generar-qr', 'POST', {});
    if (resToken?.status !== 'success') throw new Error(resToken?.message || 'Token');

    const codigo = resToken.codigo;
    const basePath = window.location.origin + ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/');
    const publicUrl = `${basePath}qr-salas.html?token=${encodeURIComponent(codigo)}`;

    const buf = document.getElementById('qrcode-buffer');
    buf.innerHTML = '';
    new QRCode(buf, { text: publicUrl, width: 400, height: 400 });

    setTimeout(() => {
      const qrImg = buf.querySelector('img') || buf.querySelector('canvas');
      if (!qrImg) throw new Error('QR');
      const qrBase64 = qrImg.src || qrImg.toDataURL('image/png');
      doc.addImage(qrBase64, 'PNG', midX - (cfg.qrSize / 2), cfg.qrY, cfg.qrSize, cfg.qrSize);
      doc.save('QR_Reservas_Todas_las_salas.pdf');
      bootstrap.Modal.getInstance(document.getElementById('modal-personalizar-qr-salas')).hide();
      Swal.close();
    }, 150);
  } catch (e) {
    console.error(e);
    Swal.fire(t.err || 'Error', e.message || t.err_generico || '', 'error');
  }
}

async function loadBundle() {
  const box = document.getElementById('salas-list');
  const t = window.txt?.qr_salas || {};
  if (box) box.innerHTML = `<div class="text-muted small py-3">${t.cargando || '...'}</div>`;

  const from = state.dateStr;
  const to = state.dateStr;

  const res = await API.request(`/reservas/institucion/public-bundle?token=${encodeURIComponent(state.token)}&from=${from}&to=${to}`, 'GET');
  if (res?.status !== 'success') {
    Swal.fire('Error', res?.message || t.err_cargar || '', 'error');
    return;
  }

  state.bundle = res.data;
  const inst = res.data?.institucion;
  document.getElementById('inst-nombre').innerText = inst?.NombreInst || '—';

  const salas = Array.isArray(res.data?.salas) ? res.data.salas : [];
  if (!box) return;

  if (!salas.length) {
    box.innerHTML = `<div class="alert alert-warning mb-0">${t.sin_salas || ''}</div>`;
    return;
  }

  const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/';

  box.innerHTML = salas.map((item) => {
    const s = item.sala || {};
    const busy = (item.busyByDay && item.busyByDay[state.dateStr]) ? item.busyByDay[state.dateStr] : [];
    const tok = s.QrToken || '';
    const salaUrl = tok ? `${window.location.origin}${basePath}qr-sala.html?token=${encodeURIComponent(tok)}` : '#';

    const busyHtml = busy.length
      ? busy.map((b) => `
          <div class="d-flex justify-content-between align-items-center border rounded p-2 bg-light mb-1">
            <div class="fw-bold small">${b.start} - ${b.end}</div>
            <span class="badge ${b.mine ? 'bg-primary' : 'bg-danger'}">${b.mine ? (window.txt?.qr_sala?.reservado_vos || '') : (window.txt?.qr_sala?.reservado || '')}</span>
          </div>`).join('')
      : `<div class="small text-muted">${t.sin_reservas_dia || ''}</div>`;

    return `
      <div class="card border shadow-sm mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div>
              <div class="fw-black">${escapeHtml(s.Nombre || '—')}</div>
              <div class="small text-muted">${escapeHtml(s.Lugar || '')}</div>
            </div>
            <a class="btn btn-sm btn-success fw-bold" href="${escapeHtml(salaUrl)}">${t.btn_ir_sala || ''}</a>
          </div>
          <div class="mt-2 small fw-bold text-muted">${t.ocupacion_dia || ''} (${state.dateStr})</div>
          <div class="mt-1">${busyHtml}</div>
        </div>
      </div>`;
  }).join('');
}

function getTokenFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  let token = urlParams.get('token');
  if (!token) {
    const match = window.location.href.match(/\/qr-salas\/([a-zA-Z0-9]{6,80})/);
    if (match) token = match[1];
  }
  return token;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
