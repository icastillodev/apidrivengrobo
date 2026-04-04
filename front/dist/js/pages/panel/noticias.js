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

const NOTICIA_BADGE_VARIANTS = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'dark'];

function noticiaCategoriaBadgeHtml(r) {
    const name = String(r?.Categoria ?? '').trim();
    if (!name) return '';
    let v = String(r?.CategoriaBadge ?? 'primary').toLowerCase();
    if (!NOTICIA_BADGE_VARIANTS.includes(v)) v = 'primary';
    return `<span class="badge text-bg-${v}">${escapeHtml(name)}</span>`;
}

function textoExtracto(r) {
    const raw = String(r?.CuerpoResumen ?? r?.Cuerpo ?? '').trim();
    return raw.replace(/\s+/g, ' ');
}

function bindLeerMas(grid, onOpen) {
    grid.querySelectorAll('[data-noticia-id]').forEach((el) => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const id = parseInt(el.getAttribute('data-noticia-id'), 10);
            if (id) onOpen(id);
        });
    });
}

/** Avanza el cursor de “noticias vistas” solo al abrir una noticia (no al entrar al listado). */
function advanceNoticiasVistaHasta(fechaPublicacionOCreacion) {
    const raw = fechaPublicacionOCreacion != null ? String(fechaPublicacionOCreacion).trim() : '';
    if (!raw) return;
    const articleMs = new Date(raw).getTime();
    if (Number.isNaN(articleMs)) return;
    let prevMs = 0;
    try {
        const prev = localStorage.getItem('grobo_noticias_vista_hasta');
        if (prev) {
            const t = new Date(prev).getTime();
            if (!Number.isNaN(t)) prevMs = t;
        }
    } catch (e) {
        /* ignore */
    }
    const best = Math.max(prevMs, articleMs);
    try {
        localStorage.setItem('grobo_noticias_vista_hasta', new Date(best).toISOString());
    } catch (e) {
        /* ignore */
    }
}

export async function initPortalNoticias() {
    const t = window.txt?.comunicacion || {};
    const pageSize = 6;
    let alcance = 'local';
    let sort = 'fecha_desc';
    let search = '';
    let page = 1;
    let total = 0;
    let searchTimeout = null;

    const grid = document.getElementById('noticias-grid');
    const infoEl = document.getElementById('noticias-pag-info');
    const pagUl = document.getElementById('noticias-pag');
    const sortSel = document.getElementById('noticias-sort');
    const filtro = document.getElementById('filtro-alcance');
    const searchInput = document.getElementById('noticias-search');

    const modalEl = document.getElementById('modal-noticia');
    let modal = null;
    if (modalEl && window.bootstrap) {
        modal = new window.bootstrap.Modal(modalEl);
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (searchTimeout) clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                search = searchInput.value.trim();
                page = 1;
                cargarLista();
            }, 400);
        });
    }

    if (sortSel) {
        const opts = [
            ['fecha_desc', t.portal_sort_fecha_desc || ''],
            ['fecha_asc', t.portal_sort_fecha_asc || ''],
            ['titulo_asc', t.portal_sort_titulo_asc || ''],
            ['titulo_desc', t.portal_sort_titulo_desc || '']
        ];
        sortSel.innerHTML = opts.map(([v, l]) => `<option value="${escapeHtml(v)}">${escapeHtml(l)}</option>`).join('');
        sortSel.value = sort;
        sortSel.addEventListener('change', () => {
            sort = sortSel.value || 'fecha_desc';
            page = 1;
            cargarLista();
        });
    }

    function totalPages() {
        return Math.max(1, Math.ceil(total / pageSize));
    }

    function renderPagination() {
        if (!pagUl) return;
        pagUl.innerHTML = '';
        const tp = totalPages();
        if (tp <= 1) return;

        const maxBtns = 5;
        let startPage = Math.max(1, page - Math.floor(maxBtns / 2));
        let endPage = Math.min(tp, startPage + maxBtns - 1);
        if (endPage - startPage + 1 < maxBtns) {
            startPage = Math.max(1, endPage - maxBtns + 1);
        }

        const addLi = (disabled, label, htmlInner, onClick) => {
            const li = document.createElement('li');
            li.className = `page-item${disabled ? ' disabled' : ''}`;
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'page-link';
            b.innerHTML = htmlInner;
            b.setAttribute('aria-label', label);
            if (!disabled && onClick) b.addEventListener('click', onClick);
            li.appendChild(b);
            pagUl.appendChild(li);
        };

        addLi(page <= 1, 'prev', '&laquo;', () => {
            page -= 1;
            cargarLista();
        });

        for (let i = startPage; i <= endPage; i++) {
            const li = document.createElement('li');
            li.className = `page-item${i === page ? ' active' : ''}`;
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'page-link';
            b.textContent = String(i);
            if (i !== page) {
                b.addEventListener('click', () => {
                    page = i;
                    cargarLista();
                });
            }
            li.appendChild(b);
            pagUl.appendChild(li);
        }

        addLi(page >= tp, 'next', '&raquo;', () => {
            page += 1;
            cargarLista();
        });
    }

    async function cargarLista(options = {}) {
        const silent = options.silent === true;
        if (!grid) return;
        if (!silent) {
            grid.innerHTML = `<div class="col-12 text-muted small py-5 text-center">${escapeHtml(t.msg_cargando || '')}</div>`;
        }

        const q = new URLSearchParams({
            alcance,
            page: String(page),
            pageSize: String(pageSize),
            sort,
            search
        });
        const res = await API.request(`/comunicacion/noticias?${q.toString()}`, 'GET');

        if (res.status !== 'success' || !res.data) {
            grid.innerHTML = `<div class="col-12 text-danger small py-4">${escapeHtml(t.err_generico || '')}</div>`;
            return;
        }

        const rows = res.data.rows || [];
        total = parseInt(res.data.total, 10) || 0;

        if (!rows.length) {
            grid.innerHTML = `<div class="col-12"><div class="card border-0 shadow-sm"><div class="card-body text-muted text-center py-5">${escapeHtml(t.dash_sin_noticias || '')}</div></div></div>`;
        } else {
            grid.innerHTML = rows
                .map((r) => {
                    const id = parseInt(r.IdNoticia, 10);
                    const fp = r.FechaPublicacion || r.FechaCreacion || '';
                    const badge = noticiaCategoriaBadgeHtml(r);
                    const instRed =
                        alcance === 'red' && String(r.NombreInstitucion || '').trim()
                            ? `<span class="text-muted">${escapeHtml(r.NombreInstitucion)}</span>`
                            : '';
                    const extracto = escapeHtml(textoExtracto(r));
                    const leer = escapeHtml(t.portal_leer_mas || t.ver_mas || '');
                    return `
                <div class="col d-flex">
                    <article class="noticia-tarjeta card shadow-sm w-100 h-100">
                        <div class="card-body d-flex flex-column p-4">
                            <div class="noticia-meta d-flex flex-wrap align-items-center gap-2 text-muted mb-2">
                                <time datetime="${escapeHtml(String(fp))}">${escapeHtml(formatFecha(fp))}</time>
                                ${badge ? `<span class="d-flex align-items-center">${badge}</span>` : ''}
                                ${instRed ? `<span class="d-none d-md-inline">·</span>${instRed}` : ''}
                            </div>
                            <h2 class="noticia-titulo fw-bold mb-2">${escapeHtml(r.Titulo || '—')}</h2>
                            <p class="noticia-extracto small text-muted mb-3 flex-grow-1">${extracto || '—'}</p>
                            <button type="button" class="btn btn-outline-success btn-sm fw-bold mt-auto align-self-start" data-noticia-id="${id}">
                                ${leer} <i class="bi bi-arrow-right ms-1"></i>
                            </button>
                        </div>
                    </article>
                </div>`;
                })
                .join('');
            bindLeerMas(grid, abrirDetalle);
        }

        if (infoEl) {
            const tpl = t.portal_pag_info || '';
            const tp = totalPages();
            infoEl.textContent = tpl
                .replace('{page}', String(page))
                .replace('{totalPages}', String(tp))
                .replace('{total}', String(total));
        }

        renderPagination();

        if (!silent) {
            try {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (e) {
                window.scrollTo(0, 0);
            }
        }
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
            const fechaTxt = escapeHtml(formatFecha(fp));
            const instTxt = escapeHtml(inst);
            const badge = noticiaCategoriaBadgeHtml(row);
            meta.innerHTML = `<span>${fechaTxt}</span>${badge ? ` ${badge}` : ''}${inst ? `<span class="text-muted"> · ${instTxt}</span>` : ''}`;
        }
        if (cuerpo) cuerpo.textContent = row.Cuerpo || '';
        advanceNoticiasVistaHasta(row.FechaPublicacion || row.FechaCreacion);
        try {
            await NotificationManager.check();
        } catch (e) {
            /* ignore */
        }
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
