import { API } from '../../api.js';

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

function absoluteUrlWithId(idPoe) {
    const u = new URL(window.location.href);
    u.searchParams.set('id', String(idPoe));
    return u.href;
}

export async function initPortalPoe() {
    const t = window.txt?.comunicacion || {};
    const grid = document.getElementById('poe-grid');
    const modalEl = document.getElementById('modal-poe-detalle');
    let modal = null;
    if (modalEl && window.bootstrap) {
        modal = new window.bootstrap.Modal(modalEl);
    }

    let currentQrUrl = '';

    document.getElementById('btn-poe-qr')?.addEventListener('click', async () => {
        const url = currentQrUrl;
        if (!url || typeof QRCode === 'undefined') {
            await window.Swal?.fire?.({ icon: 'warning', title: t.err_generico || '', text: t.poe_qr_no_lib || '' });
            return;
        }
        await window.Swal?.fire?.({
            title: t.poe_qr_title || '',
            html: `<p class="small text-muted mb-3">${escapeHtml(t.poe_qr_hint || '')}</p><div class="d-flex justify-content-center"><div id="swal-qr-poe"></div></div><p class="small text-break mt-3 mb-0">${escapeHtml(url)}</p>`,
            width: 420,
            didOpen: () => {
                const host = document.getElementById('swal-qr-poe');
                if (!host) return;
                host.innerHTML = '';
                try {
                    new QRCode(host, { text: url, width: 220, height: 220 });
                } catch (e) {
                    console.error(e);
                }
            },
        });
    });

    async function abrirDetalle(id) {
        const res = await API.request(`/comunicacion/poe/${id}`, 'GET');
        if (res.status !== 'success' || !res.data) {
            await window.Swal?.fire?.({
                icon: 'error',
                title: t.err_generico || '',
                text: escapeHtml(res.message || ''),
            });
            return;
        }
        const row = res.data;
        currentQrUrl = absoluteUrlWithId(row.IdPoe);

        const tit = document.getElementById('modal-poe-titulo');
        const meta = document.getElementById('modal-poe-meta');
        const resena = document.getElementById('modal-poe-resena');
        const cuerpo = document.getElementById('modal-poe-cuerpo');
        const adjWrap = document.getElementById('modal-poe-adjuntos');

        if (tit) tit.textContent = row.Titulo || '—';
        if (meta) {
            const fu = row.FechaActualizacion || row.FechaCreacion || '';
            meta.textContent = `${t.poe_meta_actualizado || ''}: ${formatFecha(fu)}`;
        }
        const rs = String(row.Resena || '').trim();
        if (resena) {
            if (rs) {
                resena.classList.remove('d-none');
                resena.textContent = rs;
            } else {
                resena.classList.add('d-none');
                resena.textContent = '';
            }
        }
        if (cuerpo) cuerpo.textContent = String(row.Cuerpo || '').trim() || '—';

        const adj = Array.isArray(row.adjuntos) ? row.adjuntos : [];
        if (adjWrap) {
            if (!adj.length) {
                adjWrap.innerHTML = '';
            } else {
                adjWrap.innerHTML = `<div class="w-100 small fw-bold text-muted mb-1">${escapeHtml(t.poe_adjuntos || '')}</div>${adj
                    .map(
                        (a) =>
                            `<a href="${escapeHtml(a.url)}" class="btn btn-sm btn-outline-success fw-bold" target="_blank" rel="noopener noreferrer">${escapeHtml(
                                a.nombre || a.url
                            )}</a>`
                    )
                    .join('')}`;
            }
        }

        modal?.show();
    }

    async function cargarLista() {
        if (!grid) return;
        const loadingMsg = escapeHtml(t.msg_cargando || window.txt?.generales?.msg_cargando || '…');
        grid.innerHTML = `<div class="col-12 text-center py-5 text-muted"><div class="spinner-border spinner-border-sm text-success mb-2" role="status"></div><div class="small">${loadingMsg}</div></div>`;
        const res = await API.request('/comunicacion/poe', 'GET');
        if (res.status !== 'success' || !res.data) {
            grid.innerHTML = `<div class="col-12 text-danger small py-4">${escapeHtml(t.err_generico || '')}</div>`;
            return;
        }
        const rows = res.data.rows || [];
        if (!rows.length) {
            grid.innerHTML = `<div class="col-12"><div class="card border-0 shadow-sm"><div class="card-body text-muted text-center py-5">${escapeHtml(
                t.poe_empty || ''
            )}</div></div></div>`;
            return;
        }
        grid.innerHTML = rows
            .map((r) => {
                const id = parseInt(r.IdPoe, 10) || 0;
                const titulo = escapeHtml(r.Titulo || '—');
                const rs = String(r.Resena || '').trim();
                const extracto = escapeHtml(rs || '');
                const fu = r.FechaActualizacion || '';
                return `
            <div class="col-12 col-md-6 col-xl-4 d-flex">
                <article class="poe-card card shadow-sm border-0 w-100 h-100">
                    <div class="card-body d-flex flex-column p-4">
                        <div class="small text-muted text-uppercase mb-2" style="font-size:10px;letter-spacing:0.04em;">${escapeHtml(formatFecha(fu))}</div>
                        <h2 class="fs-5 fw-bold mb-2">${titulo}</h2>
                        <p class="small text-muted mb-3 flex-grow-1" style="min-height:3rem;">${extracto || '—'}</p>
                        <button type="button" class="btn btn-outline-success btn-sm fw-bold mt-auto align-self-start" data-poe-open="${id}">
                            ${escapeHtml(t.portal_leer_mas || t.ver_mas || '')} <i class="bi bi-arrow-right ms-1"></i>
                        </button>
                    </div>
                </article>
            </div>`;
            })
            .join('');

        grid.querySelectorAll('[data-poe-open]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-poe-open'), 10);
                if (id) abrirDetalle(id);
            });
        });
    }

    await cargarLista();

    const params = new URLSearchParams(window.location.search);
    const idParam = parseInt(params.get('id') || '0', 10);
    if (idParam > 0) {
        await abrirDetalle(idParam);
    }
}
