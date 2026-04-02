import { API } from '../../api.js';
import { NotificationManager } from '../../NotificationManager.js';

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function toDatetimeLocal(val) {
    if (!val) return '';
    const s = String(val).replace(' ', 'T');
    return s.length >= 16 ? s.substring(0, 16) : s;
}

const NOTICIA_BADGE_VARIANTS = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'dark'];

function noticiaCategoriaBadgeHtml(r) {
    const name = String(r?.Categoria ?? '').trim();
    if (!name) return '';
    let v = String(r?.CategoriaBadge ?? 'primary').toLowerCase();
    if (!NOTICIA_BADGE_VARIANTS.includes(v)) v = 'primary';
    return `<span class="badge text-bg-${v} ms-1" style="font-size:10px;vertical-align:middle;">${escapeHtml(name)}</span>`;
}

export async function initAdminNoticias() {
    const t = window.txt?.comunicacion || {};
    const pageSize = 15;
    let page = 1;
    let total = 0;
    const tbody = document.getElementById('admin-noticias-tbody');
    const infoEl = document.getElementById('admin-noticias-pag-info');
    const btnPrev = document.getElementById('admin-noticias-prev');
    const btnNext = document.getElementById('admin-noticias-next');
    const editEstado = document.getElementById('edit-estado');
    const wrapFechaCompartir = document.getElementById('wrap-fecha-compartir');

    const modalEl = document.getElementById('modal-noticia-admin');
    let modal = null;
    if (modalEl && window.bootstrap) {
        modal = new window.bootstrap.Modal(modalEl);
    }

    function totalPages() {
        return Math.max(1, Math.ceil(total / pageSize));
    }

    function estadoLabel(r) {
        const pub = parseInt(r.Publicado, 10) === 1;
        if (!pub) return t.admin_estado_borrador || '';
        const raw = r.FechaPublicacion;
        const fp = raw ? new Date(String(raw).replace(' ', 'T')) : null;
        if (fp && !Number.isNaN(fp.getTime()) && fp.getTime() > Date.now()) {
            return t.admin_estado_programada || '';
        }
        return t.admin_estado_publicada || '';
    }

    function enRedBadge(r) {
        const legacy = (r.Alcance || '').toLowerCase() === 'red';
        const comp = r.CompartirEnRed !== undefined && r.CompartirEnRed !== null
            ? parseInt(r.CompartirEnRed, 10) === 1
            : legacy;
        return comp
            ? `<span class="badge bg-info text-dark">${escapeHtml(t.admin_si || '')}</span>`
            : `<span class="badge bg-secondary">${escapeHtml(t.admin_no || '')}</span>`;
    }

    function syncEstadoUI() {
        const borrador = editEstado?.value === 'borrador';
        wrapFechaCompartir?.classList.toggle('d-none', borrador);
    }

    editEstado?.addEventListener('change', syncEstadoUI);

    async function cargarLista(options = {}) {
        const silent = options.silent === true;
        if (!tbody) return;
        if (!silent) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-muted p-3">${escapeHtml(t.msg_cargando || '')}</td></tr>`;
        }

        const res = await API.request(`/admin/comunicacion/noticias?page=${page}&pageSize=${pageSize}`, 'GET');

        if (res.status !== 'success') {
            tbody.innerHTML = `<tr><td colspan="5" class="text-danger p-3">${escapeHtml(res.message || t.err_forbidden || t.err_generico || '')}</td></tr>`;
            return;
        }

        const rows = Array.isArray(res.data) ? res.data : [];
        total = parseInt(res.total, 10) || 0;

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-muted p-3">${escapeHtml(t.dash_sin_noticias || '')}</td></tr>`;
        } else {
            tbody.innerHTML = rows.map((r) => {
                const id = parseInt(r.IdNoticia, 10);
                const fp = r.FechaPublicacion || r.FechaCreacion || '';
                const est = estadoLabel(r);
                return `
                    <tr>
                        <td class="text-muted text-nowrap">${escapeHtml(String(fp).substring(0, 16))}${noticiaCategoriaBadgeHtml(r)}</td>
                        <td class="fw-semibold">${escapeHtml(r.Titulo || '—')}</td>
                        <td class="text-center">${enRedBadge(r)}</td>
                        <td class="text-center"><span class="badge bg-light text-dark border">${escapeHtml(est)}</span></td>
                        <td class="text-end text-nowrap">
                            <button type="button" class="btn btn-outline-primary btn-sm btn-edit" data-id="${id}">${escapeHtml(t.admin_editar || '')}</button>
                            <button type="button" class="btn btn-outline-danger btn-sm btn-del" data-id="${id}">${escapeHtml(t.admin_eliminar || '')}</button>
                        </td>
                    </tr>`;
            }).join('');

            tbody.querySelectorAll('.btn-edit').forEach((btn) => {
                btn.addEventListener('click', () => abrirEdicion(parseInt(btn.getAttribute('data-id'), 10)));
            });
            tbody.querySelectorAll('.btn-del').forEach((btn) => {
                btn.addEventListener('click', () => eliminar(parseInt(btn.getAttribute('data-id'), 10)));
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
    }

    async function abrirEdicion(id) {
        const res = await API.request(`/admin/comunicacion/noticias/detail?id=${id}`, 'GET');
        if (res.status !== 'success' || !res.data) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', text: res.message || t.err_generico || '' });
            }
            return;
        }
        const row = res.data;
        document.getElementById('edit-id').value = String(row.IdNoticia || id);
        document.getElementById('edit-titulo').value = row.Titulo || '';
        document.getElementById('edit-categoria').value = row.Categoria || '';
        const selBadge = document.getElementById('edit-categoria-badge');
        if (selBadge) {
            const v = String(row.CategoriaBadge || 'primary').toLowerCase();
            selBadge.value = NOTICIA_BADGE_VARIANTS.includes(v) ? v : 'primary';
        }
        document.getElementById('edit-cuerpo').value = row.Cuerpo || '';

        const legacyRed = (row.Alcance || '').toLowerCase() === 'red';
        const legacyHint = document.getElementById('edit-legacy-red-hint');
        if (legacyHint) {
            legacyHint.classList.toggle('d-none', !legacyRed);
        }

        const pub = parseInt(row.Publicado, 10) === 1;
        if (editEstado) {
            editEstado.value = pub ? 'publicada' : 'borrador';
        }
        const compartir = legacyRed || parseInt(row.CompartirEnRed, 10) !== 0;
        const cb = document.getElementById('edit-compartir-red');
        if (cb) cb.checked = compartir;

        const fechaIn = document.getElementById('edit-fecha-pub');
        if (fechaIn) {
            // Si Publicado y FechaPublicacion es NULL (publicó “ahora”), el listado usa FechaCreación;
            // el modal debe mostrar esa misma base para poder editarla sin depender de “programar”.
            const refPub = row.FechaPublicacion || row.FechaCreacion || '';
            fechaIn.value = pub ? toDatetimeLocal(refPub) : '';
        }

        syncEstadoUI();
        const tituloModal = document.getElementById('modal-admin-titulo');
        if (tituloModal) tituloModal.textContent = t.admin_editar || '';
        modal?.show();
    }

    function abrirNueva() {
        document.getElementById('edit-id').value = '';
        document.getElementById('edit-titulo').value = '';
        document.getElementById('edit-categoria').value = '';
        document.getElementById('edit-categoria-badge').value = 'primary';
        document.getElementById('edit-cuerpo').value = '';
        document.getElementById('edit-legacy-red-hint')?.classList.add('d-none');
        if (editEstado) editEstado.value = 'borrador';
        document.getElementById('edit-fecha-pub').value = '';
        const cb = document.getElementById('edit-compartir-red');
        if (cb) cb.checked = true;
        syncEstadoUI();
        const tituloModal = document.getElementById('modal-admin-titulo');
        if (tituloModal) tituloModal.textContent = t.admin_nueva || '';
        modal?.show();
    }

    async function guardar() {
        const idStr = document.getElementById('edit-id')?.value || '';
        const titulo = document.getElementById('edit-titulo')?.value?.trim() || '';
        const categoria = document.getElementById('edit-categoria')?.value?.trim() || '';
        const categoriaBadge = document.getElementById('edit-categoria-badge')?.value || 'primary';
        const cuerpo = document.getElementById('edit-cuerpo')?.value?.trim() || '';
        const estado = editEstado?.value || 'borrador';
        const publicado = estado === 'publicada' ? 1 : 0;
        const fechaVal = document.getElementById('edit-fecha-pub')?.value || '';
        const compartir = document.getElementById('edit-compartir-red')?.checked ? 1 : 0;

        const base = {
            Titulo: titulo,
            Cuerpo: cuerpo,
            Publicado: publicado,
            Categoria: categoria,
            CategoriaBadge: categoria ? categoriaBadge : ''
        };
        if (publicado) {
            base.FechaPublicacion = fechaVal;
            base.CompartirEnRed = compartir;
        }

        let res;
        if (idStr) {
            res = await API.request('/admin/comunicacion/noticias/update', 'POST', {
                IdNoticia: parseInt(idStr, 10),
                ...base
            });
        } else {
            res = await API.request('/admin/comunicacion/noticias', 'POST', base);
        }

        if (res.status === 'success') {
            modal?.hide();
            await cargarLista();
            NotificationManager.check();
        } else if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'error', text: res.message || t.err_generico || '' });
        }
    }

    async function eliminar(id) {
        const ok = typeof Swal !== 'undefined'
            ? (await Swal.fire({
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: t.admin_eliminar || 'OK',
                cancelButtonText: t.admin_cancelar || '',
                text: t.admin_confirm_eliminar || ''
            })).isConfirmed
            : window.confirm(t.admin_confirm_eliminar || '');

        if (!ok) return;

        const res = await API.request('/admin/comunicacion/noticias/delete', 'POST', { IdNoticia: id });
        if (res.status === 'success') {
            await cargarLista();
            NotificationManager.check();
        } else if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'error', text: res.message || t.err_generico || '' });
        }
    }

    document.getElementById('btn-nueva-noticia')?.addEventListener('click', abrirNueva);
    document.getElementById('btn-guardar-noticia')?.addEventListener('click', guardar);
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
        if (document.getElementById('modal-noticia-admin')?.classList.contains('show')) return;
        await cargarLista({ silent: true });
    });

    await cargarLista();
}
