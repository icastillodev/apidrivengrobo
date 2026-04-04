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

const MSG_CAT_ORDER = ['manual', 'formulario', 'alojamiento', 'lista_usuarios', 'notificacion', 'institucional'];

function labelOrigenTipo(ot) {
    const t = window.txt?.comunicacion || {};
    const m = {
        manual: t.msg_cat_manual,
        formulario: t.msg_cat_formulario,
        alojamiento: t.msg_cat_alojamiento,
        lista_usuarios: t.msg_cat_lista_usuarios,
        notificacion: t.msg_cat_notificacion,
        institucional: t.msg_cat_institucional,
        institucional_comunicado: t.msg_inst_tipo_comunicado,
        consulta_institucion: t.msg_inst_tipo_consulta
    };
    const k = String(ot || '').trim();
    return m[k] || k || '';
}

function avisoCorreoMensajeSiFallo(res) {
    const emailN = res?.data?.emailNotificacion;
    if (!emailN || emailN.ok || typeof Swal === 'undefined') return;
    const t = window.txt?.comunicacion || {};
    const text = emailN.codigo === 'sin_email'
        ? (t.msg_email_sin_direccion || '')
        : (t.msg_email_smtp_error || '');
    Swal.fire({ icon: 'warning', title: t.msg_enviado_ok || '', text });
}

function fillCategoriaNuevo() {
    const sel = document.getElementById('nuevo-categoria');
    if (!sel) return;
    const t = window.txt?.comunicacion || {};
    const m = {
        manual: t.msg_cat_manual,
        formulario: t.msg_cat_formulario,
        alojamiento: t.msg_cat_alojamiento,
        lista_usuarios: t.msg_cat_lista_usuarios,
        notificacion: t.msg_cat_notificacion,
        institucional: t.msg_cat_institucional
    };
    sel.innerHTML = MSG_CAT_ORDER.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(m[v] || v)}</option>`).join('');
}

/**
 * @param {{ alcance?: 'personal' | 'institucional' }} [opts]
 */
export async function initMensajes(opts = {}) {
    const t = window.txt?.comunicacion || {};
    const uid = parseInt(sessionStorage.getItem('userId') || '0', 10);
    const alcance = opts.alcance === 'institucional' ? 'institucional' : 'personal';
    const instMode = alcance === 'institucional';

    const destBlock = document.getElementById('msg-nuevo-dest-block');
    const catBlock = document.getElementById('msg-nuevo-cat-block');
    if (instMode) {
        if (destBlock) destBlock.classList.add('d-none');
        if (catBlock) catBlock.classList.add('d-none');
        const instTipoBlock = document.getElementById('msg-nuevo-inst-tipo-block');
        if (instTipoBlock) instTipoBlock.classList.remove('d-none');
    }

    function fillInstTipoSelect() {
        const sel = document.getElementById('nuevo-inst-tipo');
        if (!sel) return;
        const role = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel') || '0', 10);
        const staff = [1, 2, 4, 5, 6].includes(role);
        const opts = [];
        if (staff) {
            opts.push({ v: 'institucional_comunicado', l: t.msg_inst_tipo_comunicado || '' });
        }
        opts.push({ v: 'consulta_institucion', l: t.msg_inst_tipo_consulta || '' });
        sel.innerHTML = opts.map((o) => `<option value="${escapeHtml(o.v)}">${escapeHtml(o.l)}</option>`).join('');
    }

    let currentHiloId = null;

    /** Cache para filtrar destinatarios sin volver a pedir la API */
    let destinatariosCache = { local: [], red: [] };

    function destinatarioHaystack(u) {
        return [
            u.NombreA,
            u.ApellidoA,
            u.Usuario,
            String(u.IdUsrA ?? ''),
            u.NombreInstitucion,
            u.isInstitution ? 'institucion' : ''
        ].filter(Boolean).join(' ').toLowerCase();
    }

    function formatDestinatarioLabel(u) {
        const nom = (u.NombreA || '').trim();
        const ape = (u.ApellidoA || '').trim();
        const id = String(u.IdUsrA ?? '');
        const usr = (u.Usuario || '').trim();
        const idLbl = t.msg_dest_id_short || 'ID';
        const nameStr = [nom, ape].filter(Boolean).join(' ').trim();
        let s = '';
        if (nameStr) {
            s = `${nameStr} · ${idLbl} ${id}`;
        } else {
            s = `${idLbl} ${id}`;
        }
        if (usr) s += ` · ${usr}`;
        return s;
    }

    function nombreInstitucionGrupo(u) {
        const n = String(u.NombreInstitucion || '').trim();
        if (n) return n;
        const id = parseInt(u.IdInstitucion, 10);
        if (id > 0) {
            const fb = t.msg_dest_inst_fallback || '';
            return fb ? `${fb} ${id}` : `ID ${id}`;
        }
        return t.msg_dest_inst_sin_nombre || '—';
    }

    function renderDestinatariosSelect(query) {
        const sel = document.getElementById('nuevo-dest');
        if (!sel) return;

        const prevVal = sel.value;
        const q = String(query || '').trim().toLowerCase();
        const words = q ? q.split(/\s+/).filter(Boolean) : [];
        const match = (u) => {
            if (!words.length) return true;
            const hay = destinatarioHaystack(u);
            return words.every((w) => hay.includes(w));
        };

        sel.innerHTML = `<option value="">${escapeHtml(t.msg_sel_dest || '')}</option>`;

        const localFiltered = destinatariosCache.local.filter(match);
        const redFiltered = destinatariosCache.red.filter(match);
        const combined = [...localFiltered, ...redFiltered];

        const byInst = new Map();
        for (const u of combined) {
            const idInst = parseInt(u.IdInstitucion, 10) || 0;
            if (!byInst.has(idInst)) {
                byInst.set(idInst, { instId: idInst, label: nombreInstitucionGrupo(u), users: [] });
            }
            byInst.get(idInst).users.push(u);
        }

        const myInst = parseInt(sessionStorage.getItem('instId') || localStorage.getItem('instId') || '0', 10);
        const grupos = [...byInst.values()].sort((a, b) => {
            if (a.instId === myInst && b.instId !== myInst) return -1;
            if (b.instId === myInst && a.instId !== myInst) return 1;
            return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
        });

        for (const g of grupos) {
            g.users.sort((a, b) => {
                const aa = `${(a.ApellidoA || '').trim()} ${(a.NombreA || '').trim()}`.trim().toLowerCase();
                const bb = `${(b.ApellidoA || '').trim()} ${(b.NombreA || '').trim()}`.trim().toLowerCase();
                return aa.localeCompare(bb, undefined, { sensitivity: 'base' });
            });
            const hdr = document.createElement('option');
            hdr.disabled = true;
            hdr.value = '';
            hdr.textContent = ` ${g.label} `;
            hdr.className = 'mensajes-dest-inst-banner';
            sel.appendChild(hdr);
            g.users.forEach((u) => {
                if (u.isInstitution) {
                    const opt = document.createElement('option');
                    opt.value = `inst-${u.IdInstitucion}`;
                    const pref = (t.msg_dest_inst_badge || '').trim();
                    opt.textContent = `\u00A0\u00A0${pref ? `${pref} ` : ''}${u.NombreInstitucion || ''}`;
                    sel.appendChild(opt);
                } else {
                    const opt = document.createElement('option');
                    opt.value = String(u.IdUsrA);
                    opt.textContent = `\u00A0\u00A0${formatDestinatarioLabel(u)}`;
                    sel.appendChild(opt);
                }
            });
        }

        if (prevVal && [...sel.options].some((o) => o.value === prevVal)) {
            sel.value = prevVal;
        } else {
            sel.value = '';
        }
    }

    async function loadHilos(options = {}) {
        const silent = options.silent === true;
        const list = document.getElementById('lista-hilos');
        if (!list) return;

        if (!silent) {
            list.innerHTML = `<div class="p-3 text-muted small">${escapeHtml(t.msg_cargando || '')}</div>`;
        }

        const q = encodeURIComponent(alcance);
        const res = await API.request(`/comunicacion/mensajes/hilos?alcance=${q}`, 'GET');

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
            const ot = String(h.OrigenTipo || '').trim();
            const tipoBadge =
                instMode && (ot === 'institucional_comunicado' || ot === 'consulta_institucion')
                    ? ` <span class="badge bg-secondary rounded-pill">${escapeHtml(labelOrigenTipo(ot))}</span>`
                    : '';
            return `
                <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-start text-start${active}" data-hilo="${h.IdMensajeHilo}">
                    <span class="text-truncate me-2 small">${escapeHtml(h.Asunto || '—')}${tipoBadge}${badge}</span>
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
        const puedeResponder = res.data?.puedeResponder !== false;
        const replyWrap = document.getElementById('hilo-reply-wrap');
        const soloLec = document.getElementById('hilo-solo-lectura');
        if (replyWrap) replyWrap.classList.toggle('d-none', !puedeResponder);
        if (soloLec) soloLec.classList.toggle('d-none', puedeResponder);

        const asuntoEl = document.getElementById('hilo-asunto');
        if (asuntoEl) asuntoEl.textContent = hilo.Asunto || '';

        const metaEl = document.getElementById('hilo-meta');
        if (metaEl) {
            const ot = String(hilo.OrigenTipo || '').trim();
            const extra = ot ? ` · ${labelOrigenTipo(ot)}` : '';
            if (instMode || parseInt(hilo.EsInstitucional || 0, 10) === 1) {
                metaEl.textContent = `${t.msg_hilo_inst || ''}${extra}`;
            } else {
                const other = parseInt(hilo.IdUsrParticipanteA, 10) === uid
                    ? parseInt(hilo.IdUsrParticipanteB, 10)
                    : parseInt(hilo.IdUsrParticipanteA, 10);
                metaEl.textContent = `${t.msg_hilo || ''} · ID ${other}${extra}`;
            }
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
        const wrap = document.getElementById('hilo-reply-wrap');
        if (wrap?.classList.contains('d-none')) return;
        const el = document.getElementById('reply-text');
        const txt = el?.value?.trim();
        if (!currentHiloId || !txt) return;

        const res = await API.request('/comunicacion/mensajes/enviar', 'POST', {
            IdMensajeHilo: currentHiloId,
            Cuerpo: txt
        });

        if (res.status === 'success') {
            el.value = '';
            avisoCorreoMensajeSiFallo(res);
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

    async function fillDestinatarios() {
        const fil = document.getElementById('nuevo-dest-filter');
        if (fil) fil.value = '';

        const res = await API.request('/comunicacion/mensajes/destinatarios', 'GET');
        if (res.status !== 'success' || !res.data) {
            destinatariosCache = { local: [], red: [] };
            renderDestinatariosSelect('');
            return;
        }
        const local = Array.isArray(res.data.local) ? res.data.local : [];
        const red = Array.isArray(res.data.red) ? res.data.red : [];

        destinatariosCache = {
            local: local.filter((u) => parseInt(u.IdUsrA, 10) !== uid),
            red
        };
        renderDestinatariosSelect('');
    }

    document.getElementById('nuevo-dest-filter')?.addEventListener('input', (e) => {
        renderDestinatariosSelect(e.target?.value || '');
    });

    document.getElementById('btn-nuevo-msg')?.addEventListener('click', async () => {
        const roleOpen = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel') || '0', 10);
        const avisoInv = document.getElementById('msg-investigador-aviso');
        if (avisoInv) {
            avisoInv.classList.toggle('d-none', instMode || roleOpen !== 3);
        }
        const filPh = document.getElementById('nuevo-dest-filter');
        if (filPh && !instMode) {
            filPh.placeholder = roleOpen === 3
                ? (t.msg_dest_filtro_ph_inv || t.msg_dest_filtro_ph || '')
                : (t.msg_dest_filtro_ph || '');
        }
        if (!instMode) {
            await fillDestinatarios();
            fillCategoriaNuevo();
        } else {
            fillInstTipoSelect();
        }
        modal?.show();
    });

    document.getElementById('btn-enviar-nuevo')?.addEventListener('click', async () => {
        const asunto = document.getElementById('nuevo-asunto')?.value?.trim() || '';
        const cuerpo = document.getElementById('nuevo-cuerpo')?.value?.trim() || '';

        if (instMode) {
            if (!asunto || !cuerpo) {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({ icon: 'warning', text: t.msg_requiere_asunto_cuerpo || '' });
                }
                return;
            }
            const tipoInst = document.getElementById('nuevo-inst-tipo')?.value || 'consulta_institucion';
            const res = await API.request('/comunicacion/mensajes/enviar', 'POST', {
                EsInstitucional: true,
                Asunto: asunto,
                Cuerpo: cuerpo,
                OrigenTipo: tipoInst
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
                if (window.NotificationManager?.check) {
                    window.NotificationManager.check();
                }
            } else if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', text: res.message || t.err_generico || '' });
            }
            return;
        }

        const destStr = document.getElementById('nuevo-dest')?.value || '0';
        const dest = parseInt(destStr, 10);
        const origenTipo = (document.getElementById('nuevo-categoria')?.value || 'manual').trim() || 'manual';
        
        let payload = {
            Asunto: asunto,
            Cuerpo: cuerpo,
            OrigenTipo: origenTipo
        };

        if (destStr.startsWith('inst-')) {
            payload.EsInstitucional = true;
            payload.IdInstitucionDestino = parseInt(destStr.replace('inst-', ''), 10);
            if (payload.OrigenTipo === 'manual') {
                payload.OrigenTipo = 'consulta_institucion';
            }
        } else {
            payload.IdDestinatario = dest;
            if (!dest) {
                if (typeof Swal !== 'undefined') Swal.fire({ icon: 'warning', text: t.msg_sel_dest || '' });
                return;
            }
        }

        const res = await API.request('/comunicacion/mensajes/enviar', 'POST', payload);

        if (res.status === 'success') {
            const hid = res.data?.IdMensajeHilo;
            modal?.hide();
            const a = document.getElementById('nuevo-asunto');
            const c = document.getElementById('nuevo-cuerpo');
            if (a) a.value = '';
            if (c) c.value = '';
            avisoCorreoMensajeSiFallo(res);
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

    if (instMode) {
        fillInstTipoSelect();
    }

    async function applyMsgNuevoDeepLink() {
        const sp = new URLSearchParams(window.location.search);
        if (sp.get('msgNuevo') !== '1' || instMode) return;

        const instId = sp.get('instId');
        const asuntoRaw = sp.get('asunto') || '';
        const origen = sp.get('origen') || 'manual';

        const url = new URL(window.location.href);
        url.searchParams.delete('msgNuevo');
        url.searchParams.delete('instId');
        url.searchParams.delete('asunto');
        url.searchParams.delete('origen');
        const nq = url.searchParams.toString();
        window.history.replaceState({}, '', url.pathname + (nq ? `?${nq}` : '') + url.hash);

        if (!modal) return;

        const avisoInv = document.getElementById('msg-investigador-aviso');
        if (avisoInv) avisoInv.classList.add('d-none');
        await fillDestinatarios();
        fillCategoriaNuevo();

        const selDest = document.getElementById('nuevo-dest');
        if (instId && selDest) {
            const want = `inst-${instId}`;
            if ([...selDest.options].some((o) => o.value === want)) {
                selDest.value = want;
            }
        }
        const cat = document.getElementById('nuevo-categoria');
        if (cat && ['formulario', 'alojamiento', 'manual'].includes(origen)) {
            cat.value = origen;
        }
        const a = document.getElementById('nuevo-asunto');
        if (a) a.value = asuntoRaw;
        const c = document.getElementById('nuevo-cuerpo');
        if (c) c.value = '';
        modal.show();
    }

    await loadHilos();
    await applyMsgNuevoDeepLink();
}
