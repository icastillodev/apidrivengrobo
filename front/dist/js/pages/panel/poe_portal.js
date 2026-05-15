import { API } from '../../api.js';
import { buildPanelPoePublicUrl, printPoeQrSheet, showPoeQrSwal } from '../../utils/poeQrPrint.js';

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatFecha(ds) {
    if (!ds) return '—';
    const d = new Date(ds);
    return Number.isNaN(d.getTime()) ? String(ds).substring(0, 16) : d.toLocaleString();
}

function formatCuerpoHtml(raw) {
    const s = String(raw ?? '').trim();
    if (!s) return `<p class="text-muted small mb-0">${escapeHtml(window.txt?.comunicacion?.poe_sin_texto || '—')}</p>`;
    return `<div class="poe-cuerpo-text small" style="white-space:pre-wrap;">${escapeHtml(s)}</div>`;
}

async function openPoeAdjunto(idPoe, slot) {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const url = `${API.urlBase}/comunicacion/poe/${idPoe}/adjunto/${slot}`;
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    window.open(objUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(objUrl), 120000);
}

export async function initPortalPoe() {
    const t = window.txt?.comunicacion || {};
    const grid = document.getElementById('poe-portal-grid');
    const modalEl = document.getElementById('modal-poe-portal-detalle');
    let modal = null;
    if (modalEl && window.bootstrap) {
        modal = new window.bootstrap.Modal(modalEl);
    }

    const elTitulo = document.getElementById('poe-detalle-titulo');
    const elResena = document.getElementById('poe-detalle-resena');
    const elCuerpo = document.getElementById('poe-detalle-cuerpo');
    const elAdjuntos = document.getElementById('poe-detalle-adjuntos');
    const elMeta = document.getElementById('poe-detalle-meta');
    const btnQr = document.getElementById('btn-poe-detalle-qr');
    const btnPrintQr = document.getElementById('btn-poe-detalle-print-qr');

    let currentDetail = { id: 0, titulo: '', url: '' };

    async function cargarLista() {
        if (!grid) return;
        const loadingMsg = escapeHtml(t.msg_cargando || window.txt?.generales?.msg_cargando || '…');
        grid.innerHTML = `<div class="col-12 text-center py-5 text-muted"><div class="spinner-border spinner-border-sm text-success mb-2" role="status"></div><div class="small">${loadingMsg}</div></div>`;

        const res = await API.request('/comunicacion/poe', 'GET');
        const rows = res?.data?.rows;
        if (res.status !== 'success' || !Array.isArray(rows)) {
            grid.innerHTML = `<div class="col-12 text-danger small py-4">${escapeHtml(res.message || t.err_generico || '')}</div>`;
            return;
        }

        if (!rows.length) {
            grid.innerHTML = `<div class="col-12"><div class="card border-0 shadow-sm"><div class="card-body text-muted text-center py-5">${escapeHtml(t.poe_empty || '')}</div></div></div>`;
            return;
        }

        grid.innerHTML = rows
            .map((r) => {
                const id = parseInt(r.IdPoe, 10) || 0;
                const fe = r.FechaActualizacion || r.FechaCreacion || '';
                const resena = String(r.Resena ?? '').trim();
                const extracto = escapeHtml(resena || '—');
                const btnVer = escapeHtml(t.poe_btn_ver_detalle || t.portal_leer_mas || '');
                const btnQrLbl = escapeHtml(t.poe_btn_qr || '');
                const metaLbl = escapeHtml(t.poe_meta_actualizado || '');
                return `
            <div class="col d-flex">
                <article class="card shadow-sm border poe-portal-card w-100 h-100">
                    <div class="card-body d-flex flex-column p-4">
                        <div class="small text-muted text-uppercase mb-2" style="font-size:11px;letter-spacing:.04em">${metaLbl}: ${escapeHtml(formatFecha(fe))}</div>
                        <h2 class="h5 fw-bold mb-2">${escapeHtml(r.Titulo || '—')}</h2>
                        <p class="small text-muted mb-3 flex-grow-1" style="display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden;line-height:1.45">${extracto}</p>
                        <div class="d-flex flex-wrap gap-2 mt-auto">
                            <button type="button" class="btn btn-outline-success btn-sm fw-bold" data-poe-ver="${id}">${btnVer} <i class="bi bi-arrow-right ms-1"></i></button>
                            <button type="button" class="btn btn-outline-secondary btn-sm fw-bold" data-poe-qr="${id}" data-poe-title="${escapeHtml(r.Titulo || '')}">
                                <i class="bi bi-qr-code me-1"></i>${btnQrLbl}
                            </button>
                        </div>
                    </div>
                </article>
            </div>`;
            })
            .join('');

        grid.querySelectorAll('[data-poe-ver]').forEach((b) => {
            b.addEventListener('click', () => abrirDetalle(parseInt(b.getAttribute('data-poe-ver'), 10)));
        });
        grid.querySelectorAll('[data-poe-qr]').forEach((b) => {
            b.addEventListener('click', () => {
                const id = parseInt(b.getAttribute('data-poe-qr'), 10);
                const title = b.getAttribute('data-poe-title') || '';
                const url = buildPanelPoePublicUrl(id);
                showPoeQrSwal(t, title, url);
            });
        });
    }

    function pintarDetalle(d) {
        const id = parseInt(d.IdPoe, 10) || 0;
        currentDetail = { id, titulo: String(d.Titulo || ''), url: buildPanelPoePublicUrl(id) };
        if (elTitulo) elTitulo.textContent = d.Titulo || '—';
        const resena = String(d.Resena ?? '').trim();
        if (elResena) {
            elResena.textContent = resena;
            elResena.classList.toggle('d-none', !resena);
        }
        if (elCuerpo) elCuerpo.innerHTML = formatCuerpoHtml(d.Cuerpo);
        const fe = d.FechaActualizacion || d.FechaCreacion || '';
        if (elMeta) {
            const lbl = t.poe_meta_actualizado || '';
            elMeta.textContent = fe ? `${lbl}: ${formatFecha(fe)}` : '';
        }

        const adj = Array.isArray(d.adjuntos) ? d.adjuntos : [];
        if (elAdjuntos) {
            if (!adj.length) {
                elAdjuntos.innerHTML = '';
                elAdjuntos.classList.add('d-none');
            } else {
                elAdjuntos.classList.remove('d-none');
                const lab = escapeHtml(t.poe_adjuntos || '');
                const btns = adj
                    .map((a, idx) => {
                        const nom = escapeHtml(a.nombre || a.url || `—`);
                        const slot = idx + 1;
                        if (a.origen === 'b2') {
                            return `<button type="button" class="btn btn-sm btn-outline-secondary" data-poe-adj="${id}" data-poe-slot="${slot}">${nom}</button>`;
                        }
                        const href = escapeHtml(a.url || '#');
                        return `<a class="btn btn-sm btn-outline-secondary" href="${href}" target="_blank" rel="noopener noreferrer">${nom}</a>`;
                    })
                    .join('');
                elAdjuntos.innerHTML = `<div class="small text-muted text-uppercase mb-2 fw-semibold" style="font-size:11px;">${lab}</div><div class="d-flex flex-wrap gap-2">${btns}</div>`;
                elAdjuntos.querySelectorAll('[data-poe-adj]').forEach((btn) => {
                    btn.addEventListener('click', async () => {
                        const pid = parseInt(btn.getAttribute('data-poe-adj'), 10);
                        const slot = parseInt(btn.getAttribute('data-poe-slot'), 10);
                        try {
                            await openPoeAdjunto(pid, slot);
                        } catch (_) {
                            await window.Swal?.fire?.({ icon: 'error', text: t.err_generico || '' });
                        }
                    });
                });
            }
        }
    }

    async function abrirDetalle(id) {
        if (!id) return;
        const res = await API.request(`/comunicacion/poe/${id}`, 'GET');
        if (res.status !== 'success' || !res.data) {
            await window.Swal?.fire?.({ icon: 'error', text: res.message || t.err_generico || '' });
            return;
        }
        pintarDetalle(res.data);
        modal?.show();
        try {
            const u = new URL(window.location.href);
            u.searchParams.set('id', String(id));
            window.history.replaceState({}, '', u.toString());
        } catch (e) {
            /* ignore */
        }
    }

    btnQr?.addEventListener('click', () => {
        if (!currentDetail.id) return;
        showPoeQrSwal(t, currentDetail.titulo, currentDetail.url);
    });

    btnPrintQr?.addEventListener('click', () => {
        if (!currentDetail.id) return;
        if (!printPoeQrSheet(currentDetail.titulo, currentDetail.url)) {
            window.Swal?.fire?.({ icon: 'warning', text: t.poe_print_blocked || '' });
        }
    });

    await cargarLista();

    try {
        const u = new URL(window.location.href);
        const idParam = parseInt(u.searchParams.get('id') || '0', 10);
        if (idParam > 0) await abrirDetalle(idParam);
    } catch (e) {
        /* ignore */
    }
}
