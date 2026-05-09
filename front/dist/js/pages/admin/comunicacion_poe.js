import { API } from '../../api.js';
import { getCorrectPath } from '../../components/menujs/MenuConfig.js';

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function val(id) {
    const el = document.getElementById(id);
    return el ? String(el.value ?? '').trim() : '';
}

function setVal(id, v) {
    const el = document.getElementById(id);
    if (el) el.value = v ?? '';
}

function panelPoeUrlWithId(idPoe) {
    const base = getCorrectPath('panel/poe');
    const sep = base.includes('?') ? '&' : '?';
    try {
        return new URL(`${base}${sep}id=${encodeURIComponent(String(idPoe))}`, window.location.origin).href;
    } catch (e) {
        return `${window.location.origin}/${base}${sep}id=${encodeURIComponent(String(idPoe))}`;
    }
}

export async function initAdminPoe() {
    const t = window.txt?.comunicacion || {};
    const tbody = document.getElementById('admin-poe-tbody');
    const infoEl = document.getElementById('admin-poe-pag-info');
    const modalEl = document.getElementById('modal-poe-admin');
    let modal = null;
    if (modalEl && window.bootstrap) {
        modal = new window.bootstrap.Modal(modalEl);
    }

    let page = 1;
    const pageSize = 15;
    let total = 0;

    function totalPages() {
        return Math.max(1, Math.ceil(total / pageSize));
    }

    async function cargarTabla() {
        if (!tbody) return;
        const loadingMsg = escapeHtml(t.msg_cargando || window.txt?.generales?.msg_cargando || '…');
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success mb-2" role="status"></div><div class="small">${loadingMsg}</div></td></tr>`;
        const res = await API.request(`/admin/comunicacion/poe?page=${page}&pageSize=${pageSize}`, 'GET');
        if (res.status !== 'success' || !Array.isArray(res.data)) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">${escapeHtml(res.message || t.err_generico || '')}</td></tr>`;
            return;
        }
        total = parseInt(res.total, 10) || 0;
        const rows = res.data;
        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">${escapeHtml(t.poe_admin_vacio || '')}</td></tr>`;
        } else {
            tbody.innerHTML = rows
                .map((r) => {
                    const id = parseInt(r.IdPoe, 10) || 0;
                    const activo = parseInt(r.Activo, 10) === 1;
                    const est = activo ? t.poe_estado_activo || '' : t.poe_estado_inactivo || '';
                    const badge = activo ? 'success' : 'secondary';
                    return `<tr>
                        <td class="ps-3 fw-semibold">${escapeHtml(r.Titulo || '—')}</td>
                        <td class="text-center">${escapeHtml(String(r.Orden ?? 0))}</td>
                        <td class="text-center"><span class="badge text-bg-${badge}">${escapeHtml(est)}</span></td>
                        <td class="text-end pe-3">
                            <button type="button" class="btn btn-sm btn-outline-primary me-1" data-poe-edit="${id}">${escapeHtml(t.poe_btn_editar || t.admin_editar || '')}</button>
                            <button type="button" class="btn btn-sm btn-outline-danger" data-poe-del="${id}">${escapeHtml(t.poe_btn_eliminar || t.admin_eliminar || '')}</button>
                        </td>
                    </tr>`;
                })
                .join('');
            tbody.querySelectorAll('[data-poe-edit]').forEach((b) => {
                b.addEventListener('click', () => abrirEdit(parseInt(b.getAttribute('data-poe-edit'), 10)));
            });
            tbody.querySelectorAll('[data-poe-del]').forEach((b) => {
                b.addEventListener('click', () => eliminar(parseInt(b.getAttribute('data-poe-del'), 10)));
            });
        }
        if (infoEl) {
            const tp = totalPages();
            infoEl.textContent = `${page} / ${tp} · ${total}`;
        }
    }

    function resetForm() {
        setVal('poe-id', '');
        setVal('poe-titulo', '');
        setVal('poe-resena', '');
        setVal('poe-cuerpo', '');
        setVal('poe-url1', '');
        setVal('poe-nombre1', '');
        setVal('poe-url2', '');
        setVal('poe-nombre2', '');
        setVal('poe-orden', '0');
        const chk = document.getElementById('poe-activo');
        if (chk) chk.checked = true;
        const qrBtn = document.getElementById('btn-poe-admin-qr');
        if (qrBtn) qrBtn.disabled = true;
        const mt = document.getElementById('modal-poe-admin-title');
        if (mt) mt.textContent = t.poe_modal_nuevo || '';
    }

    async function abrirEdit(id) {
        const res = await API.request(`/admin/comunicacion/poe/detail?id=${id}`, 'GET');
        if (res.status !== 'success' || !res.data) {
            await window.Swal?.fire?.({ icon: 'error', text: res.message || '' });
            return;
        }
        const d = res.data;
        setVal('poe-id', String(d.IdPoe || ''));
        setVal('poe-titulo', d.Titulo || '');
        setVal('poe-resena', d.Resena || '');
        setVal('poe-cuerpo', d.Cuerpo || '');
        setVal('poe-url1', d.UrlAdjunto1 || '');
        setVal('poe-nombre1', d.NombreAdjunto1 || '');
        setVal('poe-url2', d.UrlAdjunto2 || '');
        setVal('poe-nombre2', d.NombreAdjunto2 || '');
        setVal('poe-orden', d.Orden != null ? String(d.Orden) : '0');
        const chk = document.getElementById('poe-activo');
        if (chk) chk.checked = parseInt(d.Activo, 10) === 1;
        const qrBtn = document.getElementById('btn-poe-admin-qr');
        if (qrBtn) {
            qrBtn.disabled = parseInt(d.Activo, 10) !== 1;
            qrBtn.dataset.poePublicUrl = panelPoeUrlWithId(parseInt(d.IdPoe, 10));
        }
        const mt = document.getElementById('modal-poe-admin-title');
        if (mt) mt.textContent = t.poe_modal_editar || '';
        modal?.show();
    }

    async function eliminar(id) {
        const ok = await window.Swal?.fire?.({
            icon: 'warning',
            title: t.poe_confirm_delete_title || '',
            text: t.poe_confirm_delete || '',
            showCancelButton: true,
            confirmButtonText: t.admin_eliminar || '',
            cancelButtonText: t.admin_cancelar || '',
        });
        if (!ok?.isConfirmed) return;
        const res = await API.request('/admin/comunicacion/poe/delete', 'POST', { IdPoe: id });
        if (res.status === 'success') {
            await window.Swal?.fire?.({ icon: 'success', timer: 1400, showConfirmButton: false });
            await cargarTabla();
        } else {
            await window.Swal?.fire?.({ icon: 'error', text: res.message || '' });
        }
    }

    document.getElementById('btn-poe-nuevo')?.addEventListener('click', () => {
        resetForm();
        modal?.show();
    });

    document.getElementById('btn-poe-guardar')?.addEventListener('click', async () => {
        const id = parseInt(val('poe-id'), 10);
        const payload = {
            Titulo: val('poe-titulo') || null,
            Resena: val('poe-resena') || null,
            Cuerpo: val('poe-cuerpo') || null,
            UrlAdjunto1: val('poe-url1') || null,
            NombreAdjunto1: val('poe-nombre1') || null,
            UrlAdjunto2: val('poe-url2') || null,
            NombreAdjunto2: val('poe-nombre2') || null,
            Orden: parseInt(val('poe-orden'), 10) || 0,
            Activo: document.getElementById('poe-activo')?.checked ? 1 : 0,
        };
        let res;
        if (id > 0) {
            res = await API.request('/admin/comunicacion/poe/update', 'POST', { ...payload, IdPoe: id });
        } else {
            res = await API.request('/admin/comunicacion/poe', 'POST', payload);
        }
        if (res.status === 'success') {
            await window.Swal?.fire?.({
                icon: 'success',
                title: t.poe_save_ok || t.pp_save_ok || '',
                timer: 1600,
                showConfirmButton: false,
            });
            modal?.hide();
            await cargarTabla();
        } else {
            await window.Swal?.fire?.({ icon: 'error', title: t.err_generico || '', text: escapeHtml(res.message || '') });
        }
    });

    document.getElementById('admin-poe-prev')?.addEventListener('click', () => {
        if (page > 1) {
            page -= 1;
            cargarTabla();
        }
    });
    document.getElementById('admin-poe-next')?.addEventListener('click', () => {
        if (page < totalPages()) {
            page += 1;
            cargarTabla();
        }
    });

    document.getElementById('btn-poe-admin-qr')?.addEventListener('click', async () => {
        const btn = document.getElementById('btn-poe-admin-qr');
        const url = btn?.dataset?.poePublicUrl || '';
        if (!url || typeof QRCode === 'undefined') return;
        await window.Swal?.fire?.({
            title: t.poe_qr_title || '',
            html: `<p class="small text-muted mb-3">${escapeHtml(t.poe_qr_hint || '')}</p><div class="d-flex justify-content-center"><div id="swal-qr-poe-admin"></div></div><p class="small text-break mt-3 mb-0">${escapeHtml(url)}</p>`,
            width: 420,
            didOpen: () => {
                const host = document.getElementById('swal-qr-poe-admin');
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

    await cargarTabla();
}
