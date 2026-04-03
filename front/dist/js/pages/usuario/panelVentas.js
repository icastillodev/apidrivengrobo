import { API } from '../../api.js';

function t(k, fb) {
  const parts = k.split('.');
  let o = window.txt;
  for (const p of parts) {
    o = o?.[p];
  }
  return (typeof o === 'string' && o) || fb || k;
}

export async function initVentasContacto() {
  const ta = document.getElementById('ventas-mensaje');
  const btn = document.getElementById('ventas-btn-enviar');
  const emailEl = document.getElementById('ventas-user-email');
  if (!ta || !btn) return;

  ta.placeholder = t(
    'ventas.placeholder_mensaje',
    'Escriba su consulta, presupuesto o comentario…'
  );

  try {
    const res = await API.request('/user/profile', 'GET');
    const d = res?.status === 'success' ? res.data : null;
    const em = d?.EmailA ? String(d.EmailA).trim() : '';
    if (emailEl) {
      emailEl.textContent = em || '—';
    }
  } catch {
    if (emailEl) emailEl.textContent = '—';
  }

  btn.addEventListener('click', async () => {
    const mensaje = String(ta.value || '').trim();
    if (mensaje.length < 10) {
      const Swal = window.Swal;
      if (Swal) {
        Swal.fire({
          icon: 'warning',
          title: t('ventas.msg_corto_titulo', 'Mensaje incompleto'),
          text: t('ventas.msg_corto', 'Escriba al menos 10 caracteres.'),
        });
      }
      return;
    }

    const prevHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>${t('ventas.enviando', 'Enviando…')}`;

    const res = await API.request('/sales/inquiry', 'POST', { mensaje });

    btn.disabled = false;
    btn.innerHTML = prevHtml;

    const Swal = window.Swal;
    if (!Swal) return;

    if (res?.status === 'success' && res.data) {
      const dest = res.data.destinatario || 'ventas@groboapp.com';
      const email = res.data.correo_usuario || '';
      const html = t(
        'ventas.success_html',
        'Mensaje enviado correctamente.'
      )
        .replace(/\{dest\}/g, dest)
        .replace(/\{email\}/g, email);
      ta.value = '';
      Swal.fire({
        icon: 'success',
        title: t('ventas.success_title', 'Mensaje enviado'),
        html,
      });
      return;
    }

    const msg =
      res?.message ||
      t('ventas.error_enviar', 'No se pudo enviar. Intente más tarde.');
    Swal.fire({
      icon: 'error',
      title: t('ventas.error_enviar', 'Error'),
      text: msg,
    });
  });
}
