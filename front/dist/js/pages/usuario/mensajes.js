import { API } from '../../api.js';
import { Auth } from '../../auth.js?v=20260409';

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

const MSG_CAT_ORDER = ['manual', 'formulario', 'alojamiento', 'reserva', 'lista_usuarios', 'notificacion', 'institucional'];

function labelOrigenTipo(ot) {
    const t = window.txt?.comunicacion || {};
    const m = {
        manual: t.msg_cat_manual,
        formulario: t.msg_cat_formulario,
        alojamiento: t.msg_cat_alojamiento,
        reserva: t.msg_cat_reserva,
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
        reserva: t.msg_cat_reserva,
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
    const role = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel') || '0', 10);
    const isStaff = [1, 2, 4, 5, 6].includes(role);
    const alcance = opts.alcance === 'institucional' ? 'institucional' : 'personal';
    const instMode = alcance === 'institucional';

    const destBlock = document.getElementById('msg-nuevo-dest-block');
    const catBlock = document.getElementById('msg-nuevo-cat-block');
    if (instMode) {
        if (destBlock) destBlock.classList.remove('d-none');
        if (catBlock) catBlock.classList.add('d-none');
        const instTipoBlock = document.getElementById('msg-nuevo-inst-tipo-block');
        if (instTipoBlock) instTipoBlock.classList.remove('d-none');
        const instInvBlock = document.getElementById('msg-nuevo-inst-inv-block');
        if (instInvBlock) instInvBlock.classList.add('d-none');
    }

    function fillInstTipoSelect() {
        const sel = document.getElementById('nuevo-inst-tipo');
        if (!sel) return;
        sel.innerHTML = [
            { v: 'usuario_institucion', l: t.msg_inst_tipo_user_inst || '' },
            { v: 'instituciones_red', l: t.msg_inst_tipo_inst_red || '' },
        ].map((o) => `<option value="${escapeHtml(o.v)}">${escapeHtml(o.l)}</option>`).join('');
    }

    function renderDestinatariosSelectInstMode(query) {
        const tipo = document.getElementById('nuevo-inst-tipo')?.value || 'usuario_institucion';
        const sel = document.getElementById('nuevo-dest');
        if (!sel) return;

        // Reutilizamos el render existente, pero filtrando el cache según el tipo elegido.
        if (tipo === 'instituciones_red') {
            // Solo instituciones de la red (opciones inst-*)
            const localBk = destinatariosCache.local;
            const redBk = destinatariosCache.red;
            destinatariosCache = { local: [], red: redBk.filter((u) => u && u.isInstitution) };
            renderDestinatariosSelect(query);
            destinatariosCache = { local: localBk, red: redBk };
            return;
        }

        // Usuario institución: usuarios locales (sin instituciones)
        const localBk = destinatariosCache.local;
        const redBk = destinatariosCache.red;
        destinatariosCache = { local: localBk.filter((u) => u && !u.isInstitution), red: [] };
        renderDestinatariosSelect(query);
        destinatariosCache = { local: localBk, red: redBk };
    }

    function refreshInstDestHelpText() {
        if (!instMode) return;
        const tipo = document.getElementById('nuevo-inst-tipo')?.value || 'usuario_institucion';
        const lbl = document.querySelector('#msg-nuevo-dest-block [data-i18n="comunicacion.msg_destinatario"]');
        if (!lbl) return;
        lbl.textContent = tipo === 'instituciones_red'
            ? (t.msg_inst_dest_institucion || t.msg_destinatario || '')
            : (t.msg_inst_dest_usuario || t.msg_destinatario || '');
    }

    let currentHiloId = null;

    /** Cache para filtrar destinatarios sin volver a pedir la API */
    let destinatariosCache = { local: [], red: [] };

    let nuevoMensajeEnviando = false;
    let replyEnviando = false;
    let deleteHiloEnviando = false;

    /** Usuario del que se listan formularios/alojamientos al responder (el otro participante del hilo). */
    let replySobreUsuarioId = 0;
    let nuevoRefTimer = null;
    let replyRefTimer = null;

    function setDeleteHiloButtonLoading(on) {
        const btn = document.getElementById('btn-hilo-delete');
        if (!btn) return;
        const txt = escapeHtml(t.msg_delete_hilo_loading || t.msg_cargando || '…');
        if (on) {
            if (!btn.dataset._delSaveHtml) {
                btn.dataset._delSaveHtml = btn.innerHTML;
            }
            btn.disabled = true;
            btn.setAttribute('aria-busy', 'true');
            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span><span>${txt}</span>`;
        } else {
            btn.removeAttribute('aria-busy');
            if (btn.dataset._delSaveHtml) {
                btn.innerHTML = btn.dataset._delSaveHtml;
                delete btn.dataset._delSaveHtml;
            }
            btn.disabled = !isStaff;
        }
    }

    function setReplyEnviando(on) {
        const panel = document.getElementById('panel-hilo-cont');
        const btnReply = document.getElementById('btn-reply');
        const el = document.getElementById('reply-text');
        const delBtn = document.getElementById('btn-hilo-delete');
        const txtEnviando = escapeHtml(t.msg_enviando || t.msg_cargando || '…');
        if (on) {
            if (panel) {
                panel.classList.add('pe-none', 'opacity-75');
            }
            if (btnReply) {
                btnReply.disabled = true;
                btnReply.setAttribute('aria-busy', 'true');
                btnReply.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span><span>${txtEnviando}</span>`;
            }
            if (el) el.disabled = true;
            if (delBtn) {
                delBtn.dataset._msgReplyDelWas = delBtn.disabled ? '1' : '0';
                delBtn.disabled = true;
            }
        } else {
            if (panel) {
                panel.classList.remove('pe-none', 'opacity-75');
            }
            if (btnReply) {
                btnReply.disabled = false;
                btnReply.removeAttribute('aria-busy');
                btnReply.textContent = t.msg_responder || '';
            }
            if (el) el.disabled = false;
            if (delBtn) {
                delBtn.disabled = delBtn.dataset._msgReplyDelWas === '1';
                delete delBtn.dataset._msgReplyDelWas;
            }
        }
    }

    function setModalNuevoEnviando(on) {
        const modal = document.getElementById('modal-nuevo');
        const btnEnviar = document.getElementById('btn-enviar-nuevo');
        if (!modal || !btnEnviar) return;
        const body = modal.querySelector('.modal-body');
        const interactive = modal.querySelectorAll('input, select, textarea, button.btn-close');
        const txtEnviando = escapeHtml(t.msg_enviando || t.msg_cargando || '…');
        if (on) {
            btnEnviar.disabled = true;
            btnEnviar.setAttribute('aria-busy', 'true');
            btnEnviar.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span><span>${txtEnviando}</span>`;
            if (body) body.classList.add('pe-none', 'opacity-75');
            interactive.forEach((el) => {
                if (el.id === 'btn-enviar-nuevo') return;
                el.dataset._msgPrevDisabled = el.disabled ? '1' : '0';
                el.disabled = true;
            });
        } else {
            btnEnviar.removeAttribute('aria-busy');
            btnEnviar.disabled = false;
            btnEnviar.textContent = t.msg_enviar || '';
            if (body) body.classList.remove('pe-none', 'opacity-75');
            interactive.forEach((el) => {
                if (el.id === 'btn-enviar-nuevo') return;
                el.disabled = el.dataset._msgPrevDisabled === '1';
                delete el.dataset._msgPrevDisabled;
            });
        }
    }

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
            const og = document.createElement('optgroup');
            og.label = g.label;
            g.users.forEach((u) => {
                const opt = document.createElement('option');
                if (u.isInstitution) {
                    opt.value = `inst-${u.IdInstitucion}`;
                    const pref = (t.msg_dest_inst_badge || '').trim();
                    opt.textContent = `${pref ? `${pref} ` : ''}${u.NombreInstitucion || ''}`;
                } else {
                    opt.value = String(u.IdUsrA);
                    opt.textContent = formatDestinatarioLabel(u);
                }
                og.appendChild(opt);
            });
            sel.appendChild(og);
        }

        if (prevVal && [...sel.options].some((o) => o.value === prevVal)) {
            sel.value = prevVal;
        } else {
            sel.value = '';
        }
        updateDestEmailHint();
    }

    function updateDestEmailHint() {
        const hint = document.getElementById('msg-dest-email-hint');
        if (!hint) return;
        const sel = document.getElementById('nuevo-dest');
        if (!sel) return;
        const v = String(sel.value || '').trim();
        if (!v || v.startsWith('inst-')) {
            hint.textContent = '';
            return;
        }
        const id = parseInt(v, 10);
        if (!id) { hint.textContent = ''; return; }
        const all = [...(destinatariosCache.local || []), ...(destinatariosCache.red || [])];
        const u = all.find(x => parseInt(x?.IdUsrA || 0, 10) === id);
        const email = u && u.EmailA ? String(u.EmailA).trim() : '';
        const lbl = t.msg_dest_email_label || 'Aviso por email a';
        const no = t.msg_dest_email_none || 'Sin email registrado';
        hint.textContent = `${lbl}: ${email || no}`;
    }

    /** Línea secundaria en lista izquierda: nombre apellido · usuario · ID (sin correo ni teléfono; eso solo al abrir el hilo). */
    function formatListaInterlocutorLine(h) {
        const nom = String(h.ListaInterNombre || '').trim();
        const ape = String(h.ListaInterApellido || '').trim();
        const usr = String(h.ListaInterUsuario || '').trim();
        const idn = parseInt(h.ListaInterId || 0, 10);
        const idShort = t.msg_dest_id_short || 'ID';
        const full = [nom, ape].filter(Boolean).join(' ').trim();
        const parts = [];
        if (full) parts.push(full);
        if (usr) parts.push(usr);
        if (idn > 0) parts.push(`${idShort} ${idn}`);
        return parts.join(' · ');
    }

    async function loadHilos(options = {}) {
        const silent = options.silent === true;
        const list = document.getElementById('lista-hilos');
        if (!list) return;

        if (!silent) {
            const loadingMsg = escapeHtml(t.msg_cargando || window.txt?.generales?.msg_cargando || '…');
            list.innerHTML = `<div class="p-4 text-center text-muted"><div class="spinner-border spinner-border-sm text-success mb-2" role="status"></div><div class="small">${loadingMsg}</div></div>`;
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
            const nUnread = parseInt(h.NoLeidos || 0, 10);
            const badge = nUnread > 0 ? ` <span class="badge bg-danger rounded-pill">${escapeHtml(String(nUnread))}</span>` : '';
            const active = currentHiloId === parseInt(h.IdMensajeHilo, 10) ? ' active' : '';
            const ot = String(h.OrigenTipo || '').trim();
            const hInst = parseInt(h.EsInstitucional || 0, 10) === 1;
            const showTipo = (instMode || hInst) && ot !== '';
            const tipoBadge = showTipo
                ? ` <span class="badge bg-secondary rounded-pill">${escapeHtml(labelOrigenTipo(ot))}</span>`
                : '';
            const interLine = formatListaInterlocutorLine(h);
            const interHtml = interLine
                ? `<div class="text-muted text-break mt-1" style="font-size:11px;line-height:1.35;">${escapeHtml(interLine)}</div>`
                : '';
            return `
                <button type="button" class="list-group-item list-group-item-action text-start w-100${active}" data-hilo="${h.IdMensajeHilo}">
                    <div class="d-flex justify-content-between align-items-start gap-2">
                        <div class="small flex-grow-1" style="min-width:0">
                            <div class="text-break"><span class="fw-medium">${escapeHtml(h.Asunto || (t.msg_hilo_sin_asunto || '—'))}</span>${tipoBadge}${badge}</div>
                            ${interHtml}
                        </div>
                        <small class="text-muted text-nowrap flex-shrink-0">${escapeHtml(formatDate(h.FechaUltimoMensaje || h.FechaCreacion))}</small>
                    </div>
                </button>`;
        }).join('');

        list.querySelectorAll('[data-hilo]').forEach((btn) => {
            btn.addEventListener('click', () => {
                openHilo(parseInt(btn.getAttribute('data-hilo'), 10));
            });
        });
    }

    function getNuevoSobreUsuarioId() {
        const v = String(document.getElementById('nuevo-dest')?.value || '').trim();
        if (!v || v.startsWith('inst-')) return 0;
        const n = parseInt(v, 10);
        return Number.isFinite(n) && n > 0 ? n : 0;
    }

    function clearNuevoRefUi() {
        const bus = document.getElementById('nuevo-ref-buscar');
        if (bus) bus.value = '';
        const sel = document.getElementById('nuevo-ref-select');
        if (sel) {
            sel.innerHTML = `<option value="">${escapeHtml(t.msg_anexo_sin || '')}</option>`;
        }
    }

    function renderRefSelectOptions(sel, items) {
        if (!sel) return;
        const none = t.msg_anexo_sin || '';
        const parts = [`<option value="">${escapeHtml(none)}</option>`];
        for (const it of items || []) {
            const id = parseInt(it.id, 10);
            if (!id) continue;
            const et = String(it.etiqueta || '').trim() || `#${id}`;
            const sub = String(it.sub || '').trim();
            const line = sub ? `${et} — ${sub}` : et;
            parts.push(`<option value="${id}" data-etiqueta="${escapeHtml(et)}">${escapeHtml(line)}</option>`);
        }
        sel.innerHTML = parts.join('');
    }

    function scheduleNuevoRefLoad() {
        if (nuevoRefTimer) clearTimeout(nuevoRefTimer);
        nuevoRefTimer = setTimeout(() => {
            nuevoRefTimer = null;
            loadNuevoRefOpciones();
        }, 300);
    }

    function scheduleReplyRefLoad() {
        if (replyRefTimer) clearTimeout(replyRefTimer);
        replyRefTimer = setTimeout(() => {
            replyRefTimer = null;
            loadReplyRefOpciones();
        }, 300);
    }

    async function loadNuevoRefOpciones() {
        const cat = String(document.getElementById('nuevo-categoria')?.value || '').trim();
        const sel = document.getElementById('nuevo-ref-select');
        const sobre = getNuevoSobreUsuarioId();
        if (!sel || !['formulario', 'alojamiento'].includes(cat)) return;
        if (sobre <= 0) {
            renderRefSelectOptions(sel, []);
            return;
        }
        const q = String(document.getElementById('nuevo-ref-buscar')?.value || '').trim();
        try {
            const res = await API.request(
                `/comunicacion/mensajes/anexos-contexto?usuarioId=${sobre}&tipo=${encodeURIComponent(cat)}&q=${encodeURIComponent(q)}`,
                'GET'
            );
            const items = res?.status === 'success' && Array.isArray(res.data?.items) ? res.data.items : [];
            renderRefSelectOptions(sel, items);
        } catch (e) {
            console.error(e);
            renderRefSelectOptions(sel, []);
        }
    }

    async function loadReplyRefOpciones() {
        const tipo = String(document.getElementById('reply-ref-tipo')?.value || '').trim();
        const sel = document.getElementById('reply-ref-select');
        if (!sel || !['formulario', 'alojamiento'].includes(tipo) || replySobreUsuarioId <= 0) {
            if (sel) renderRefSelectOptions(sel, []);
            return;
        }
        const q = String(document.getElementById('reply-ref-buscar')?.value || '').trim();
        try {
            const res = await API.request(
                `/comunicacion/mensajes/anexos-contexto?usuarioId=${replySobreUsuarioId}&tipo=${encodeURIComponent(tipo)}&q=${encodeURIComponent(q)}`,
                'GET'
            );
            const items = res?.status === 'success' && Array.isArray(res.data?.items) ? res.data.items : [];
            renderRefSelectOptions(sel, items);
        } catch (e) {
            console.error(e);
            renderRefSelectOptions(sel, []);
        }
    }

    function syncReplyRefUi() {
        const tipo = String(document.getElementById('reply-ref-tipo')?.value || '').trim();
        const buscar = document.getElementById('reply-ref-buscar');
        const sel = document.getElementById('reply-ref-select');
        const en = (tipo === 'formulario' || tipo === 'alojamiento') && replySobreUsuarioId > 0;
        if (buscar) {
            buscar.disabled = !en;
            buscar.placeholder = t.msg_anexo_buscar_ph || '';
        }
        if (sel) {
            if (!en) {
                sel.classList.add('d-none');
                renderRefSelectOptions(sel, []);
            } else {
                sel.classList.remove('d-none');
                scheduleReplyRefLoad();
            }
        }
    }

    async function promptHiloDeepLinkSinAcceso(res) {
        const code = String(res?.code || '').trim();
        const isOther = code === 'hilo_sin_acceso';
        if (typeof Swal === 'undefined') return;
        const r = await Swal.fire({
            icon: 'warning',
            title: isOther ? (t.msg_deep_link_hilo_otro_titulo || '') : (t.msg_deep_link_hilo_no_existe_titulo || ''),
            html: `<p class="text-start small mb-0">${escapeHtml(isOther ? (t.msg_deep_link_hilo_otro_texto || '') : (t.msg_deep_link_hilo_no_existe_texto || res?.message || ''))}</p>`,
            showCancelButton: true,
            confirmButtonText: t.msg_deep_link_cerrar_sesion || '',
            cancelButtonText: t.msg_deep_link_quedarse || '',
        });
        if (r.isConfirmed) {
            const returnUrl = window.location.href;
            Auth.logout(false, returnUrl);
        }
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
            currentHiloId = null;
            if (pc) pc.classList.add('d-none');
            if (ph) ph.classList.remove('d-none');
            const code = String(res.code || '').trim();
            if (code === 'hilo_sin_acceso' || code === 'hilo_no_encontrado') {
                await promptHiloDeepLinkSinAcceso(res);
                return false;
            }
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', text: res.message || t.err_generico || '' });
            }
            return false;
        }

        const hilo = res.data.hilo;
        const mensajes = res.data.mensajes || [];
        const puedeResponder = res.data?.puedeResponder !== false;
        const replyWrap = document.getElementById('hilo-reply-wrap');
        const soloLec = document.getElementById('hilo-solo-lectura');
        if (replyWrap) replyWrap.classList.toggle('d-none', !puedeResponder);
        if (soloLec) soloLec.classList.toggle('d-none', puedeResponder);

        const ts = hilo.FechaUltimoMensaje || hilo.FechaCreacion || '';
        const fecha = formatDateTime(ts);
        const asuntoTxt = String(hilo.Asunto || '').trim();
        const asuntoEl = document.getElementById('hilo-asunto');
        if (asuntoEl) {
            const sin = t.msg_hilo_sin_asunto || '—';
            asuntoEl.textContent = asuntoTxt ? (fecha ? `${asuntoTxt} · ${fecha}` : asuntoTxt) : (fecha ? `${sin} · ${fecha}` : sin);
        }

        const pA = hilo.ParticipanteA || null;
        const pB = hilo.ParticipanteB || null;
        const idA = parseInt(hilo.IdUsrParticipanteA || 0, 10);
        const idBRaw = hilo.IdUsrParticipanteB;
        const idB = idBRaw !== null && idBRaw !== undefined && idBRaw !== '' ? parseInt(idBRaw, 10) : 0;
        const otherId = idA === uid ? idB : idA;
        const other = (pA && parseInt(pA.IdUsrA || 0, 10) === otherId) ? pA
            : (pB && parseInt(pB.IdUsrA || 0, 10) === otherId) ? pB
                : null;

        let replyCtxUserId = otherId;
        if (replyCtxUserId <= 0 && mensajes.length > 0) {
            for (let i = 0; i < mensajes.length; i++) {
                const rid = parseInt(mensajes[i].IdUsrRemitente || 0, 10);
                if (rid > 0 && rid !== uid) {
                    replyCtxUserId = rid;
                    break;
                }
            }
        }
        replySobreUsuarioId = replyCtxUserId;

        /** Interlocutor para cabecera (prioriza participantes API; si no, primer mensaje). */
        let interlocutor = null;
        if (other && parseInt(String(other.IdUsrA || 0), 10) > 0) {
            interlocutor = {
                IdUsrA: parseInt(other.IdUsrA, 10),
                NombreA: String(other.NombreA || '').trim(),
                ApellidoA: String(other.ApellidoA || '').trim(),
                Usuario: String(other.Usuario || '').trim()
            };
        } else if (mensajes.length > 0) {
            const m0 = mensajes[0];
            const rid = parseInt(m0.IdUsrRemitente || 0, 10);
            if (rid > 0) {
                interlocutor = {
                    IdUsrA: rid,
                    NombreA: String(m0.RemitenteNombre || '').trim(),
                    ApellidoA: String(m0.RemitenteApellido || '').trim(),
                    Usuario: String(m0.RemitenteUsuario || '').trim()
                };
            }
        }

        if (replySobreUsuarioId <= 0 && interlocutor) {
            const iid = parseInt(String(interlocutor.IdUsrA || 0), 10);
            if (iid > 0 && iid !== uid) {
                replySobreUsuarioId = iid;
            }
        }

        const isInstHilo = parseInt(hilo.EsInstitucional || 0, 10) === 1;
        const replyAnexo = document.getElementById('reply-anexo-wrap');
        if (replyAnexo) {
            const rt = document.getElementById('reply-ref-tipo');
            const rb = document.getElementById('reply-ref-buscar');
            const rs = document.getElementById('reply-ref-select');
            if (rt) rt.value = '';
            if (rb) rb.value = '';
            if (rs) {
                rs.classList.add('d-none');
                renderRefSelectOptions(rs, []);
            }
            replyAnexo.classList.toggle('d-none', instMode || isInstHilo || !puedeResponder || replySobreUsuarioId <= 0);
            syncReplyRefUi();
        }

        const otherName = other ? `${(other.NombreA || '').trim()} ${(other.ApellidoA || '').trim()}`.trim() : '';
        const otherUsr = other ? String(other.Usuario || '').trim() : '';
        const otherIdTxt = interlocutor && interlocutor.IdUsrA > 0
            ? String(interlocutor.IdUsrA)
            : (other ? String(other.IdUsrA || otherId || '') : String(otherId || ''));

        const metaEl = document.getElementById('hilo-meta');
        const interlocutorEl = document.getElementById('hilo-meta-interlocutor');
        if (metaEl) {
            const ot = String(hilo.OrigenTipo || '').trim();
            const extra = ot ? ` · ${labelOrigenTipo(ot)}` : '';
            const base = (instMode || parseInt(hilo.EsInstitucional || 0, 10) === 1)
                ? (t.msg_hilo_inst || '')
                : (t.msg_hilo || '');
            const whoParts = [];
            if (!isStaff) {
                if (otherName) whoParts.push(otherName);
                if (otherUsr) whoParts.push(otherUsr);
                if (otherIdTxt) whoParts.push(`${t.msg_dest_id_short || 'ID'} ${otherIdTxt}`);
            }
            metaEl.textContent = `${base}${whoParts.length ? ` · ${whoParts.join(' · ')}` : ''}${extra}`;
        }
        if (interlocutorEl) {
            const det = hilo.InterlocutorDetalle || null;
            const srcStaff = det || interlocutor;
            if (isStaff && srcStaff && (parseInt(String(srcStaff.IdUsrA || 0), 10) > 0 || srcStaff.NombreA || srcStaff.ApellidoA || srcStaff.Usuario)) {
                interlocutorEl.classList.remove('d-none');
                const dash = escapeHtml(t.msg_hilo_admin_sin_dato || '—');
                const idLbl = t.msg_dest_id_short || 'ID';
                const row = (lbl, val) => {
                    const v = val !== undefined && val !== null ? String(val).trim() : '';
                    const show = v ? escapeHtml(v) : dash;
                    return `<div><span class="text-muted">${escapeHtml(lbl)}:</span> ${show}</div>`;
                };
                const rowIfVal = (lbl, val) => {
                    const v = val !== undefined && val !== null ? String(val).trim() : '';
                    if (!v) return '';
                    return `<div><span class="text-muted">${escapeHtml(lbl)}:</span> ${escapeHtml(v)}</div>`;
                };
                const tit = escapeHtml(t.msg_hilo_admin_interlocutor || '');
                const nomApe = [srcStaff.NombreA, srcStaff.ApellidoA].filter(Boolean).join(' ').trim();
                const tel = String(srcStaff.TelefonoA || '').trim();
                const cel = String(srcStaff.CelularA || '').trim();
                const contacto = [tel, cel].filter(Boolean).join(' · ');
                interlocutorEl.innerHTML =
                    `<div class="fw-semibold text-secondary mb-1">${tit}</div>` +
                    row(t.msg_hilo_admin_nombre_completo || '', nomApe) +
                    row(t.msg_hilo_admin_usuario || '', srcStaff.Usuario) +
                    row(idLbl, parseInt(String(srcStaff.IdUsrA || 0), 10) > 0 ? String(srcStaff.IdUsrA) : '') +
                    rowIfVal(t.msg_hilo_admin_email || '', srcStaff.EmailA) +
                    rowIfVal(t.msg_hilo_admin_contacto || '', contacto);
            } else {
                interlocutorEl.classList.add('d-none');
                interlocutorEl.innerHTML = '';
            }
        }

        const delBtn = document.getElementById('btn-hilo-delete');
        if (delBtn) {
            // Eliminar requiere rol staff institucional.
            delBtn.classList.toggle('d-none', !isStaff);
            delBtn.disabled = !isStaff;
        }

        const box = document.getElementById('hilo-mensajes');
        if (box) {
            box.innerHTML = mensajes.map((m) => {
                const mine = parseInt(m.IdUsrRemitente, 10) === uid;
                const bubble = mine ? 'bg-primary text-white' : 'bg-white border';
                const align = mine ? 'text-end' : '';
                const yo = t.msg_yo || 'Yo';
                const nom = String(m.RemitenteNombre || '').trim();
                const ape = String(m.RemitenteApellido || '').trim();
                const usr = String(m.RemitenteUsuario || '').trim();
                const nombreCompleto = [nom, ape].filter(Boolean).join(' ').trim();
                const idRem = parseInt(m.IdUsrRemitente || 0, 10);
                const idShort = t.msg_dest_id_short || 'ID';
                let remitente = yo;
                if (!mine) {
                    const partes = [];
                    if (nombreCompleto) partes.push(nombreCompleto);
                    if (usr) partes.push(usr);
                    if (idRem > 0) partes.push(`${idShort} ${idRem}`);
                    remitente = partes.length ? partes.join(' · ') : `ID ${idRem || ''}`.trim();
                }
                const ctxTipo = String(m.OrigenTipo || '').trim();
                const ctxEt = String(m.OrigenEtiqueta || '').trim();
                const showCtx = ctxEt !== '' && (ctxTipo === 'formulario' || ctxTipo === 'alojamiento');
                const ctxHtml = showCtx
                    ? `<div class="small mt-1" style="opacity:0.95;"><span class="badge bg-light text-dark">${escapeHtml(labelOrigenTipo(ctxTipo))}</span> <span class="${mine ? 'text-white' : 'text-muted'}">${escapeHtml(ctxEt)}</span></div>`
                    : '';
                return `
                    <div class="mb-2 ${align}">
                        <div class="small ${mine ? 'text-primary' : 'text-muted'}">${escapeHtml(remitente)}</div>
                        <div class="d-inline-block px-2 py-1 rounded small ${bubble}" style="max-width:85%;text-align:left;">
                            ${escapeHtml(m.Cuerpo || '')}
                            ${ctxHtml}
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
        return true;
    }

    async function deleteCurrentHilo() {
        if (!currentHiloId || !isStaff) return;
        if (deleteHiloEnviando) return;
        const id = currentHiloId;
        const delBtnEl = document.getElementById('btn-hilo-delete');
        deleteHiloEnviando = true;
        setDeleteHiloButtonLoading(true);
        try {
            const prev = await API.request(`/comunicacion/mensajes/hilo/${id}/delete-preview`, 'GET');
            if (prev?.status !== 'success' || !prev.data) {
                if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', text: prev?.message || t.err_generico || '' });
                return;
            }
            const p = prev.data;
            const codeSent = !!p.code_sent;
            const asunto = String(p.Asunto || '').trim();
            const msgCount = parseInt(p.mensajes || 0, 10);
            const warn = codeSent ? (t.msg_delete_hilo_code_sent || '') : (t.msg_delete_hilo_code_not_sent || '');

            setDeleteHiloButtonLoading(false);
            if (delBtnEl) delBtnEl.disabled = true;

            const html = `
                <div class="text-start small">
                    <div class="mb-2"><b>${escapeHtml(t.msg_delete_hilo_hilo || 'Hilo')} #${escapeHtml(String(id))}</b></div>
                    ${asunto ? `<div class="mb-2"><b>${escapeHtml(t.msg_asunto || 'Asunto')}:</b> ${escapeHtml(asunto)}</div>` : ``}
                    <div class="mb-2"><b>${escapeHtml(t.msg_delete_hilo_cant || 'Mensajes')}:</b> ${escapeHtml(String(msgCount))}</div>
                    ${warn ? `<div class="alert alert-warning py-2 mb-2">${escapeHtml(warn)}</div>` : ``}
                    <label class="form-label small mb-1">${escapeHtml(t.msg_delete_hilo_password || 'Contraseña')}</label>
                    <input id="swal-del-pass" type="password" class="form-control form-control-sm mb-2">
                    <label class="form-label small mb-1">${escapeHtml(t.msg_delete_hilo_code || 'Código')}</label>
                    <input id="swal-del-code" type="text" inputmode="numeric" maxlength="6" class="form-control form-control-sm">
                </div>
            `;

            const res = await Swal.fire({
                icon: 'warning',
                title: t.msg_delete_hilo_title || '',
                html,
                showCancelButton: true,
                confirmButtonText: t.msg_delete_hilo_confirm || '',
                cancelButtonText: t.msg_delete_hilo_cancel || '',
                preConfirm: async () => {
                    const password = document.getElementById('swal-del-pass')?.value?.trim() || '';
                    const code = document.getElementById('swal-del-code')?.value?.trim() || '';
                    if (!password || !code) {
                        Swal.showValidationMessage(t.msg_delete_hilo_validation || t.err_generico || '');
                        return false;
                    }
                    const confirmBtn = typeof Swal.getConfirmButton === 'function' ? Swal.getConfirmButton() : null;
                    if (confirmBtn) confirmBtn.disabled = true;
                    Swal.showLoading();
                    try {
                        const del = await API.request(`/comunicacion/mensajes/hilo/${id}/delete-full`, 'POST', { password, code });
                        if (del?.status !== 'success') {
                            Swal.showValidationMessage(del?.message || t.err_generico || '');
                            return false;
                        }
                        return true;
                    } catch (err) {
                        console.error(err);
                        Swal.showValidationMessage(t.err_generico || '');
                        return false;
                    } finally {
                        Swal.hideLoading();
                        if (confirmBtn) confirmBtn.disabled = false;
                    }
                }
            });
            if (!res.isConfirmed) return;
            await Swal.fire({ icon: 'success', title: t.msg_delete_hilo_success || '', timer: 1500, showConfirmButton: false });
            currentHiloId = null;
            document.getElementById('panel-hilo-cont')?.classList.add('d-none');
            document.getElementById('panel-hilo-placeholder')?.classList.remove('d-none');
            await loadHilos();
            if (window.NotificationManager?.check) window.NotificationManager.check();
        } catch (e) {
            console.error(e);
            if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', text: t.err_generico || '' });
        } finally {
            deleteHiloEnviando = false;
            setDeleteHiloButtonLoading(false);
            if (delBtnEl) delBtnEl.disabled = !isStaff;
        }
    }

    async function sendReply() {
        if (replyEnviando) return;
        const wrap = document.getElementById('hilo-reply-wrap');
        if (wrap?.classList?.contains('d-none')) return;
        const el = document.getElementById('reply-text');
        const txt = el?.value?.trim();
        if (!currentHiloId || !txt) return;

        replyEnviando = true;
        setReplyEnviando(true);
        try {
            const body = {
                IdMensajeHilo: currentHiloId,
                Cuerpo: txt
            };
            const rt = String(document.getElementById('reply-ref-tipo')?.value || '').trim();
            if ((rt === 'formulario' || rt === 'alojamiento') && replySobreUsuarioId > 0) {
                const oid = parseInt(document.getElementById('reply-ref-select')?.value || '0', 10);
                if (oid > 0) {
                    body.OrigenTipo = rt;
                    body.OrigenId = oid;
                    const opt = document.getElementById('reply-ref-select')?.selectedOptions?.[0];
                    const et = (opt?.getAttribute('data-etiqueta') || '').trim();
                    if (et) body.OrigenEtiqueta = et.slice(0, 500);
                }
            }

            const res = await API.request('/comunicacion/mensajes/enviar', 'POST', body);

            if (res.status === 'success') {
                if (el) el.value = '';
                const rt0 = document.getElementById('reply-ref-tipo');
                const rb0 = document.getElementById('reply-ref-buscar');
                const rs0 = document.getElementById('reply-ref-select');
                if (rt0) rt0.value = '';
                if (rb0) rb0.value = '';
                if (rs0) {
                    rs0.classList.add('d-none');
                    renderRefSelectOptions(rs0, []);
                }
                syncReplyRefUi();
                avisoCorreoMensajeSiFallo(res);
                await openHilo(currentHiloId);
            } else if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', text: res.message || t.err_generico || '' });
            }
        } finally {
            replyEnviando = false;
            setReplyEnviando(false);
        }
    }

    const replyTa = document.getElementById('reply-text');
    if (replyTa) {
        replyTa.placeholder = t.msg_placeholder || '';
        replyTa.title = t.msg_reply_shortcut || '';
        replyTa.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if (replyEnviando) return;
                sendReply();
            }
        });
    }

    document.getElementById('btn-reply')?.addEventListener('click', () => sendReply());
    document.getElementById('btn-hilo-delete')?.addEventListener('click', () => deleteCurrentHilo());
    document.getElementById('reply-ref-tipo')?.addEventListener('change', () => syncReplyRefUi());
    document.getElementById('reply-ref-buscar')?.addEventListener('input', () => scheduleReplyRefLoad());

    const modalEl = document.getElementById('modal-nuevo');
    let modal = null;
    if (modalEl && window.bootstrap) {
        modal = new window.bootstrap.Modal(modalEl);
        modalEl.addEventListener('hide.bs.modal', (e) => {
            if (nuevoMensajeEnviando) {
                e.preventDefault();
            }
        });
    }

    function syncRefBlockVisibility() {
        const cat = (document.getElementById('nuevo-categoria')?.value || '').trim();
        const blk = document.getElementById('msg-nuevo-ref-block');
        const wFa = document.getElementById('nuevo-ref-formaloja-wrap');
        const wRv = document.getElementById('nuevo-ref-reserva-wrap');
        if (!blk) return;
        const showBlk = ['formulario', 'alojamiento', 'reserva'].includes(cat);
        blk.classList.toggle('d-none', !showBlk);
        if (wFa) wFa.classList.toggle('d-none', !['formulario', 'alojamiento'].includes(cat));
        if (wRv) wRv.classList.toggle('d-none', cat !== 'reserva');
        const buscar = document.getElementById('nuevo-ref-buscar');
        const sobre = getNuevoSobreUsuarioId();
        if (buscar) {
            buscar.disabled = !['formulario', 'alojamiento'].includes(cat) || sobre <= 0;
            buscar.placeholder = t.msg_anexo_buscar_ph || '';
        }
        if (['formulario', 'alojamiento'].includes(cat)) {
            scheduleNuevoRefLoad();
        }
    }

    document.getElementById('nuevo-categoria')?.addEventListener('change', syncRefBlockVisibility);

    function attachOrigenRefToPayload(payload) {
        const cat = String(payload.OrigenTipo ?? document.getElementById('nuevo-categoria')?.value ?? '').trim() || 'manual';
        delete payload.OrigenEtiqueta;
        delete payload.OrigenId;
        if (cat === 'formulario' || cat === 'alojamiento') {
            const sel = document.getElementById('nuevo-ref-select');
            const oid = parseInt(sel?.value || '0', 10);
            if (oid > 0) {
                payload.OrigenId = oid;
                const opt = sel?.selectedOptions?.[0];
                const et = (opt?.getAttribute('data-etiqueta') || opt?.textContent || '').trim();
                if (et) payload.OrigenEtiqueta = et.slice(0, 500);
            }
            return payload;
        }
        if (cat === 'reserva') {
            const refEl = document.getElementById('nuevo-origen-id');
            const raw = refEl ? String(refEl.value || '').trim() : '';
            const n = parseInt(raw, 10);
            if (!Number.isNaN(n) && n > 0) {
                payload.OrigenId = n;
            }
        }
        return payload;
    }

    async function fillDestinatarios() {
        const fil = document.getElementById('nuevo-dest-filter');
        if (fil) fil.value = '';

        const chkPersonal = document.getElementById('chk-msg-personal');
        const asPersonal = instMode && isStaff && !!chkPersonal?.checked;
        // En institucional:
        // - normal: selector institucional (usuarios+red como instituciones)
        // - "personal": enviar como hilo personal (solo usuarios; no instituciones)
        const destUrl = instMode
            ? (asPersonal ? '/comunicacion/mensajes/destinatarios' : '/comunicacion/mensajes/destinatarios')
            : '/comunicacion/mensajes/destinatarios?solo_red=1';
        const res = await API.request(destUrl, 'GET');
        if (res.status !== 'success' || !res.data) {
            destinatariosCache = { local: [], red: [] };
            renderDestinatariosSelect('');
            return;
        }
        const local = Array.isArray(res.data.local) ? res.data.local : [];
        const red = Array.isArray(res.data.red) ? res.data.red : [];

        destinatariosCache = {
            // En "personal" dentro de institucional, solo usuarios (no instituciones red).
            local: local.filter((u) => parseInt(u.IdUsrA, 10) !== uid),
            red: (instMode && isStaff && !!document.getElementById('chk-msg-personal')?.checked) ? [] : red
        };
        renderDestinatariosSelect('');
    }

    document.getElementById('nuevo-dest-filter')?.addEventListener('input', (e) => {
        if (instMode) {
            renderDestinatariosSelectInstMode(e.target?.value || '');
        } else {
            renderDestinatariosSelect(e.target?.value || '');
        }
    });
    document.getElementById('nuevo-dest')?.addEventListener('change', () => {
        updateDestEmailHint();
        clearNuevoRefUi();
        syncRefBlockVisibility();
    });
    document.getElementById('nuevo-ref-buscar')?.addEventListener('input', () => scheduleNuevoRefLoad());

    document.getElementById('btn-nuevo-msg')?.addEventListener('click', async () => {
        const refIn = document.getElementById('nuevo-origen-id');
        if (refIn) refIn.value = '';
        clearNuevoRefUi();
        syncRefBlockVisibility();

        const roleOpen = parseInt(sessionStorage.getItem('userLevel') || localStorage.getItem('userLevel') || '0', 10);
        const avisoInv = document.getElementById('msg-investigador-aviso');
        if (avisoInv) {
            avisoInv.classList.toggle('d-none', instMode);
        }
        const scopeBlock = document.getElementById('msg-nuevo-scope-block');
        const chkPersonal = document.getElementById('chk-msg-personal');
        if (scopeBlock) scopeBlock.classList.toggle('d-none', !(instMode && isStaff));
        if (chkPersonal) chkPersonal.checked = false;

        const filPh = document.getElementById('nuevo-dest-filter');
        if (filPh && !instMode) {
            filPh.placeholder = t.msg_dest_filtro_ph_inv || t.msg_dest_filtro_ph || '';
        }
        if (!instMode) {
            await fillDestinatarios();
            fillCategoriaNuevo();
            syncRefBlockVisibility();
        } else {
            fillInstTipoSelect();
            await fillDestinatarios();
            refreshInstDestHelpText();
            renderDestinatariosSelectInstMode('');
        }
        if (chkPersonal && instMode && isStaff) {
            chkPersonal.onchange = async () => {
                const asPersonal = !!chkPersonal.checked;
                const instTipoBlock = document.getElementById('msg-nuevo-inst-tipo-block');
                const catBlock = document.getElementById('msg-nuevo-cat-block');
                if (instTipoBlock) instTipoBlock.classList.toggle('d-none', asPersonal);
                if (catBlock) catBlock.classList.toggle('d-none', !asPersonal);
                // Re-cargar destinatarios y refrescar render.
                await fillDestinatarios();
                if (asPersonal) {
                    fillCategoriaNuevo();
                    clearNuevoRefUi();
                    syncRefBlockVisibility();
                    renderDestinatariosSelect('');
                } else {
                    fillInstTipoSelect();
                    refreshInstDestHelpText();
                    renderDestinatariosSelectInstMode('');
                }
            };
        }
        modal?.show();
    });

    document.getElementById('btn-enviar-nuevo')?.addEventListener('click', async () => {
        if (nuevoMensajeEnviando) return;
        const asunto = document.getElementById('nuevo-asunto')?.value?.trim() || '';
        const cuerpo = document.getElementById('nuevo-cuerpo')?.value?.trim() || '';

        const asPersonalInInst = instMode && isStaff && !!document.getElementById('chk-msg-personal')?.checked;
        if (instMode && !asPersonalInInst) {
            if (!asunto || !cuerpo) {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({ icon: 'warning', text: t.msg_requiere_asunto_cuerpo || '' });
                }
                return;
            }
            const tipoInst = document.getElementById('nuevo-inst-tipo')?.value || 'usuario_institucion';
            const destStr = document.getElementById('nuevo-dest')?.value || '';

            let payloadInst = null;

            if (tipoInst === 'instituciones_red') {
                if (!destStr.startsWith('inst-')) {
                    if (typeof Swal !== 'undefined') Swal.fire({ icon: 'warning', text: t.msg_inst_err_sel_inst || t.msg_sel_dest || '' });
                    return;
                }
                payloadInst = {
                    EsInstitucional: true,
                    Asunto: asunto,
                    Cuerpo: cuerpo,
                    OrigenTipo: 'consulta_institucion',
                    IdInstitucionDestino: parseInt(destStr.replace('inst-', ''), 10)
                };
            } else {
                const dest = parseInt(destStr, 10);
                if (!dest || dest <= 0) {
                    if (typeof Swal !== 'undefined') Swal.fire({ icon: 'warning', text: t.msg_inst_err_sel_usr || t.msg_sel_dest || '' });
                    return;
                }
                payloadInst = {
                    EsInstitucional: true,
                    Asunto: asunto,
                    Cuerpo: cuerpo,
                    OrigenTipo: 'consulta_institucion',
                    IdInvestigadorDestino: dest
                };
            }

            nuevoMensajeEnviando = true;
            setModalNuevoEnviando(true);
            try {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: t.msg_enviando || 'Enviando…',
                        text: t.msg_enviando_correo || 'Enviando correo…',
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                        didOpen: () => Swal.showLoading(),
                    });
                }
                const res = await API.request('/comunicacion/mensajes/enviar', 'POST', payloadInst);
                if (res.status === 'success') {
                    avisoCorreoMensajeSiFallo(res);
                    const hid = res.data?.IdMensajeHilo;
                    // IMPORTANTE: el modal bloquea hide mientras nuevoMensajeEnviando=true.
                    // Bajamos flags antes de cerrar para que el usuario vea el mensaje enviado.
                    nuevoMensajeEnviando = false;
                    setModalNuevoEnviando(false);
                    modal?.hide();
                    const a = document.getElementById('nuevo-asunto');
                    const c = document.getElementById('nuevo-cuerpo');
                    if (a) a.value = '';
                    if (c) c.value = '';
                    const riInst = document.getElementById('nuevo-origen-id');
                    if (riInst) riInst.value = '';
                    clearNuevoRefUi();
                    await loadHilos();
                    if (hid) await openHilo(hid);
                    if (window.NotificationManager?.check) {
                        window.NotificationManager.check();
                    }
                    if (typeof Swal !== 'undefined') Swal.close();
                } else if (typeof Swal !== 'undefined') {
                    Swal.close();
                    Swal.fire({ icon: 'error', text: res.message || t.err_generico || '' });
                }
            } finally {
                nuevoMensajeEnviando = false;
                setModalNuevoEnviando(false);
                if (typeof Swal !== 'undefined') Swal.close();
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

        attachOrigenRefToPayload(payload);

        nuevoMensajeEnviando = true;
        setModalNuevoEnviando(true);
        try {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: t.msg_enviando || 'Enviando…',
                    text: t.msg_enviando_correo || 'Enviando correo…',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    didOpen: () => Swal.showLoading(),
                });
            }
            const res = await API.request('/comunicacion/mensajes/enviar', 'POST', payload);

            if (res.status === 'success') {
                const hid = res.data?.IdMensajeHilo;
                // IMPORTANTE: el modal bloquea hide mientras nuevoMensajeEnviando=true.
                nuevoMensajeEnviando = false;
                setModalNuevoEnviando(false);
                modal?.hide();
                const a = document.getElementById('nuevo-asunto');
                const c = document.getElementById('nuevo-cuerpo');
                if (a) a.value = '';
                if (c) c.value = '';
                const ri2 = document.getElementById('nuevo-origen-id');
                if (ri2) ri2.value = '';
                clearNuevoRefUi();
                avisoCorreoMensajeSiFallo(res);
                await loadHilos();
                if (hid) await openHilo(hid);
                if (typeof Swal !== 'undefined') Swal.close();
            } else if (typeof Swal !== 'undefined') {
                Swal.close();
                Swal.fire({ icon: 'error', text: res.message || t.err_generico || '' });
            }
        } finally {
            nuevoMensajeEnviando = false;
            setModalNuevoEnviando(false);
            if (typeof Swal !== 'undefined') Swal.close();
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
        document.getElementById('nuevo-inst-tipo')?.addEventListener('change', () => {
            const fil = document.getElementById('nuevo-dest-filter');
            if (fil) fil.value = '';
            refreshInstDestHelpText();
            renderDestinatariosSelectInstMode('');
        });
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
        if (cat && ['formulario', 'alojamiento', 'reserva', 'manual'].includes(origen)) {
            cat.value = origen;
        }
        syncRefBlockVisibility();
        const a = document.getElementById('nuevo-asunto');
        if (a) a.value = asuntoRaw;
        const c = document.getElementById('nuevo-cuerpo');
        if (c) c.value = '';
        modal.show();
    }

    await loadHilos();

    async function applyHiloDeepLink() {
        const sp = new URLSearchParams(window.location.search);
        const hid = parseInt(sp.get('hilo') || '0', 10);
        if (!hid) return;
        const ok = await openHilo(hid);
        if (!ok) return;
        const url = new URL(window.location.href);
        url.searchParams.delete('hilo');
        const nq = url.searchParams.toString();
        window.history.replaceState({}, '', url.pathname + (nq ? `?${nq}` : '') + url.hash);
    }

    await applyMsgNuevoDeepLink();
    await applyHiloDeepLink();
}
