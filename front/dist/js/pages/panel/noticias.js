import { API } from '../../api.js';
import { NotificationManager } from '../../NotificationManager.js';

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

export async function initPortalNoticias() {
    const t = window.txt?.comunicacion || {};
    const pageSize = 10;
    let alcance = 'local';
    let page = 1;
    let total = 0;

    const tbody = document.getElementById('noticias-tbody');
    const infoEl = document.getElementById('noticias-pag-info');
    const btnPrev = document.getElementById('noticias-prev');
    const btnNext = document.getElementById('noticias-next');
    const filtro = document.getElementById('filtro-alcance');

    const modalEl = document.getElementById('modal-noticia');
    let modal = null;
    if (modalEl && window.bootstrap) {
        modal = new window.bootstrap.Modal(modalEl);
    }

    function totalPages() {
        return Math.max(1, Math.ceil(total / pageSize));
    }

    async function cargarLista(options = {}) {
        const silent = options.silent === true;
        if (!tbody) return;
        if (!silent) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-muted p-3">${escapeHtml(t.msg_cargando || '')}</td></tr>`;
        }

        const res = await API.request(
            `/comunicacion/noticias?alcance=${encodeURIComponent(alcance)}&page=${page}&pageSize=${pageSize}`,
            'GET'
        );

        if (res.status !== 'success' || !res.data) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-danger p-3">${escapeHtml(t.err_generico || '')}</td></tr>`;
            return;
        }

        const rows = res.data.rows || [];
        total = parseInt(res.data.total, 10) || 0;

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-muted p-3">${escapeHtml(t.dash_sin_noticias || '')}</td></tr>`;
        } else {
            tbody.innerHTML = rows.map((r) => {
                const id = parseInt(r.IdNoticia, 10);
                const fp = r.FechaPublicacion || r.FechaCreacion || '';
                return `
                    <tr class="noticia-row" style="cursor:pointer" data-id="${id}">
                        <td class="text-muted">${escapeHtml(String(fp).substring(0, 16))}</td>
                        <td class="fw-semibold">${escapeHtml(r.Titulo || '—')}</td>
                        <td class="text-end"><span class="text-success small">${escapeHtml(t.ver_mas || '')}</span></td>
                    </tr>`;
            }).join('');

            tbody.querySelectorAll('.noticia-row').forEach((tr) => {
                tr.addEventListener('click', () => {
                    const id = parseInt(tr.getAttribute('data-id'), 10);
                    if (id) abrirDetalle(id);
                });
            });
        }

        if (infoEl) {
            const tpl = t.portal_pag_info || '';
            const tp = totalPages();
            infoEl.textContent = tpl
                .replace('{page}', String(page))
                .replace('{totalPages}', String(tp))
                .replace('{total}', String(total));
        }

        if (btnPrev) btnPrev.disabled = page <= 1;
        if (btnNext) btnNext.disabled = page >= totalPages();

        try {
            localStorage.setItem('grobo_noticias_vista_hasta', new Date().toISOString());
            NotificationManager.check();
        } catch (e) { /* ignore */ }
    }

    async function abrirDetalle(id) {
        const res = await API.request(`/comunicacion/noticias/${id}`, 'GET');
        if (res.status !== 'success' || !res.data) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', text: res.message || t.err_generico || '' });
            }
            return;
        }
        const row = res.data;
        const tit = document.getElementById('modal-noticia-titulo');
        const meta = document.getElementById('modal-noticia-meta');
        const cuerpo = document.getElementById('modal-noticia-cuerpo');
        if (tit) tit.textContent = row.Titulo || '—';
        if (meta) {
            const fp = row.FechaPublicacion || row.FechaCreacion || '';
            const inst = row.NombreInstitucion || '';
            meta.textContent = [formatFecha(fp), inst].filter(Boolean).join(' · ');
        }
        if (cuerpo) cuerpo.textContent = row.Cuerpo || '';
        modal?.show();
    }

    filtro?.querySelectorAll('[data-alcance]').forEach((btn) => {
        btn.addEventListener('click', () => {
            alcance = btn.getAttribute('data-alcance') || 'local';
            page = 1;
            filtro.querySelectorAll('[data-alcance]').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            cargarLista();
        });
    });

    btnPrev?.addEventListener('click', () => {
        if (page > 1) {
            page -= 1;
            cargarLista();
        }
    });

    btnNext?.addEventListener('click', () => {
        if (page < totalPages()) {
            page += 1;
            cargarLista();
        }
    });

    document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState !== 'visible') return;
        if (document.getElementById('modal-noticia')?.classList.contains('show')) return;
        await cargarLista({ silent: true });
    });

    const params = new URLSearchParams(window.location.search);
    const alcFromUrl = params.get('alcance');
    if (alcFromUrl === 'red' || alcFromUrl === 'local') {
        alcance = alcFromUrl;
        filtro?.querySelectorAll('[data-alcance]').forEach((b) => {
            b.classList.toggle('active', (b.getAttribute('data-alcance') || '') === alcance);
        });
    }
    const idParam = parseInt(params.get('id') || '0', 10);

    await cargarLista();
    if (idParam > 0) {
        await abrirDetalle(idParam);
    }
}
