import { API } from '../../api.js';

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatDate(ds) {
    if (!ds) return '';
    const d = new Date(ds);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
}

function formatDateTime(ds) {
    if (!ds) return '';
    const d = new Date(ds);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

export async function initMensajes() {
    const t = window.txt?.comunicacion || {};
    const uid = parseInt(sessionStorage.getItem('userId') || '0', 10);

    let currentHiloId = null;

    async function loadHilos(options = {}) {
        const silent = options.silent === true;
        const list = document.getElementById('lista-hilos');
        if (!list) return;

        if (!silent) {
            list.innerHTML = `<div class="p-3 text-muted small">${escapeHtml(t.msg_cargando || '')}</div>`;
        }

        const res = await API.request('/comunicacion/mensajes/hilos', 'GET');

        if (res.status !== 'success' || !Array.isArray(res.data)) {
            list.innerHTML = `<div class="p-3 text-muted small">${escapeHtml(t.err_generico || '')}</div>`;
            return;
        }

        const hilos = res.data;
        if (hilos.length === 0) {
            list.innerHTML = `<div class="p-3 text-muted small">${escapeHtml(t.msg_hilos_vacio || '')}</div>`;
            return;
        }

        list.innerHTML = hilos.map((h) => {
            const unread = parseInt(h.NoLeidos || 0, 10) > 0;
            const badge = unread ? ' <span class="badge bg-danger rounded-pill">!</span>' : '';
            const active = currentHiloId === parseInt(h.IdMensajeHilo, 10) ? ' active' : '';
            return `
                <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-start text-start${active}" data-hilo="${h.IdMensajeHilo}">
                    <span class="text-truncate me-2 small">${escapeHtml(h.Asunto || '—')}${badge}</span>
                    <small class="text-muted text-nowrap">${escapeHtml(formatDate(h.FechaUltimoMensaje || h.FechaCreacion))}</small>
                </button>`;
        }).join('');

        list.querySelectorAll('[data-hilo]').forEach((btn) => {
            btn.addEventListener('click', () => {
                openHilo(parseInt(btn.getAttribute('data-hilo'), 10));
            });
        });
    }

    async function openHilo(id, opts = {}) {
        const skipLoadHilos = opts.skipLoadHilos === true;
        currentHiloId = id;
        const ph = document.getElementById('panel-hilo-placeholder');
        const pc = document.getElementById('panel-hilo-cont');
        if (ph) ph.classList.add('d-none');
        if (pc) pc.classList.remove('d-none');

        const res = await API.request(`/comunicacion/mensajes/hilo/${id}?markRead=1`, 'GET');
        if (res.status !== 'success' || !res.data) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', text: res.message || t.err_generico || '' });
            }
            return;
        }

        const hilo = res.data.hilo;
        const mensajes = res.data.mensajes || [];

        const asuntoEl = document.getElementById('hilo-asunto');
        if (asuntoEl) asuntoEl.textContent = hilo.Asunto || '';

        const other = parseInt(hilo.IdUsrParticipanteA, 10) === uid
            ? parseInt(hilo.IdUsrParticipanteB, 10)
            : parseInt(hilo.IdUsrParticipanteA, 10);
        const metaEl = document.getElementById('hilo-meta');
        if (metaEl) {
            metaEl.textContent = `${t.msg_hilo || ''} · ID ${other}`;
        }

        const box = document.getElementById('hilo-mensajes');
        if (box) {
            box.innerHTML = mensajes.map((m) => {
                const mine = parseInt(m.IdUsrRemitente, 10) === uid;
                const bubble = mine ? 'bg-primary text-white' : 'bg-white border';
                const align = mine ? 'text-end' : '';
                return `
                    <div class="mb-2 ${align}">
                        <div class="d-inline-block px-2 py-1 rounded small ${bubble}" style="max-width:85%;text-align:left;">
                            ${escapeHtml(m.Cuerpo || '')}
                        </div>
                        <div class="small text-muted">${escapeHtml(formatDateTime(m.FechaEnvio))}</div>
                    </div>`;
            }).join('');
            box.scrollTop = box.scrollHeight;
        }

        if (!skipLoadHilos) {
            await loadHilos();
        }
        if (window.NotificationManager?.check) {
            window.NotificationManager.check();
        }
    }

    async function sendReply() {
        const el = document.getElementById('reply-text');
        const txt = el?.value?.trim();
        if (!currentHiloId || !txt) return;

        const res = await API.request('/comunicacion/mensajes/enviar', 'POST', {
            IdMensajeHilo: currentHiloId,
            Cuerpo: txt
        });

        if (res.status === 'success') {
            el.value = '';
            await openHilo(currentHiloId);
        } else if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'error', text: res.message || t.err_generico || '' });
        }
    }

    const replyTa = document.getElementById('reply-text');
    if (replyTa) {
        replyTa.placeholder = t.msg_placeholder || '';
        replyTa.title = t.msg_reply_shortcut || '';
        replyTa.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                sendReply();
            }
        });
    }

    document.getElementById('btn-reply')?.addEventListener('click', () => sendReply());

    const modalEl = document.getElementById('modal-nuevo');
    let modal = null;
    if (modalEl && window.bootstrap) {
        modal = new window.bootstrap.Modal(modalEl);
    }

    function labelUsuario(u) {
        return [u.ApellidoA, u.NombreA].filter(Boolean).join(', ') || u.Usuario || (`#${u.IdUsrA}`);
    }

    async function fillDestinatarios() {
        const sel = document.getElementById('nuevo-dest');
        if (!sel) return;
        sel.innerHTML = `<option value="">${escapeHtml(t.msg_sel_dest || '')}</option>`;
        const res = await API.request('/comunicacion/mensajes/destinatarios', 'GET');
        if (res.status !== 'success' || !res.data) return;
        const local = Array.isArray(res.data.local) ? res.data.local : [];
        const red = Array.isArray(res.data.red) ? res.data.red : [];

        if (local.length) {
            const og = document.createElement('optgroup');
            og.label = t.msg_dest_grupo_local || '';
            local.forEach((u) => {
                if (parseInt(u.IdUsrA, 10) === uid) return;
                const opt = document.createElement('option');
                opt.value = String(u.IdUsrA);
                opt.textContent = labelUsuario(u);
                og.appendChild(opt);
            });
            if (og.children.length) sel.appendChild(og);
        }
        if (red.length) {
            const og = document.createElement('optgroup');
            og.label = t.msg_dest_grupo_red || '';
            red.forEach((u) => {
                const opt = document.createElement('option');
                opt.value = String(u.IdUsrA);
                const inst = u.NombreInstitucion || '';
                const base = labelUsuario(u);
                opt.textContent = inst ? `${base} (${inst})` : base;
                og.appendChild(opt);
            });
            sel.appendChild(og);
        }
    }

    document.getElementById('btn-nuevo-msg')?.addEventListener('click', async () => {
        await fillDestinatarios();
        modal?.show();
    });

    document.getElementById('btn-enviar-nuevo')?.addEventListener('click', async () => {
        const dest = parseInt(document.getElementById('nuevo-dest')?.value || '0', 10);
        const asunto = document.getElementById('nuevo-asunto')?.value?.trim() || '';
        const cuerpo = document.getElementById('nuevo-cuerpo')?.value?.trim() || '';
        if (!dest || !asunto || !cuerpo) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'warning', text: t.msg_sel_dest || '' });
            }
            return;
        }

        const res = await API.request('/comunicacion/mensajes/enviar', 'POST', {
            IdDestinatario: dest,
            Asunto: asunto,
            Cuerpo: cuerpo
        });

        if (res.status === 'success') {
            const hid = res.data?.IdMensajeHilo;
            modal?.hide();
            const a = document.getElementById('nuevo-asunto');
            const c = document.getElementById('nuevo-cuerpo');
            if (a) a.value = '';
            if (c) c.value = '';
            await loadHilos();
            if (hid) await openHilo(hid);
        } else if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'error', text: res.message || t.err_generico || '' });
        }
    });

    document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState !== 'visible') return;
        await loadHilos({ silent: true });
        if (currentHiloId) {
            await openHilo(currentHiloId, { skipLoadHilos: true });
        } else if (window.NotificationManager?.check) {
            window.NotificationManager.check();
        }
    });

    await loadHilos();
}
