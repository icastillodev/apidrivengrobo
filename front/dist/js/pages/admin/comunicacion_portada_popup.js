import { API } from '../../api.js';
import { hideLoader, showLoader } from '../../components/LoaderComponent.js';

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

const b2 = {
    PortadaImagenB2Key: null,
    PortadaImagenNombre: null,
    PortadaAdjunto1B2Key: null,
    PortadaAdjunto1Nombre: null,
    PortadaAdjunto2B2Key: null,
    PortadaAdjunto2Nombre: null,
};

let ppPortadaImgObjUrl = null;

function revokePpPortadaPreview() {
    if (ppPortadaImgObjUrl) {
        try {
            URL.revokeObjectURL(ppPortadaImgObjUrl);
        } catch (_) {
            /* ignore */
        }
        ppPortadaImgObjUrl = null;
    }
    const wrap = document.getElementById('pp-wrap-preview-portada-img');
    const img = document.getElementById('pp-preview-portada-img');
    if (wrap) wrap.classList.add('d-none');
    if (img) {
        img.removeAttribute('src');
        img.alt = '';
    }
}

function syncPpPortadaPreview() {
    revokePpPortadaPreview();
    const f = document.getElementById('pp-file-portada-img')?.files?.[0];
    const wrap = document.getElementById('pp-wrap-preview-portada-img');
    const img = document.getElementById('pp-preview-portada-img');
    if (!f || !wrap || !img) return;
    ppPortadaImgObjUrl = URL.createObjectURL(f);
    img.src = ppPortadaImgObjUrl;
    img.alt = window.txt?.comunicacion?.admin_img_preview_alt || '';
    wrap.classList.remove('d-none');
}

function hasPendingPortadaFiles() {
    return !!(
        document.getElementById('pp-file-portada-img')?.files?.[0]
        || document.getElementById('pp-file-portada-d1')?.files?.[0]
        || document.getElementById('pp-file-portada-d2')?.files?.[0]
    );
}

function hydrateB2FromRow(d) {
    if (!d || typeof d !== 'object') return;
    b2.PortadaImagenB2Key = d.PortadaImagenB2Key || null;
    b2.PortadaImagenNombre = d.PortadaImagenNombre || null;
    b2.PortadaAdjunto1B2Key = d.PortadaAdjunto1B2Key || null;
    b2.PortadaAdjunto1Nombre = d.PortadaAdjunto1Nombre || null;
    b2.PortadaAdjunto2B2Key = d.PortadaAdjunto2B2Key || null;
    b2.PortadaAdjunto2Nombre = d.PortadaAdjunto2Nombre || null;
}

function renderB2Ui() {
    const tc = window.txt?.comunicacion || {};
    const prefix = tc.pp_b2_status_uploaded || '';
    const pendLab = (tc.popup_admin_file_selected || tc.admin_noticia_b2_pending_on_save || '').trim();

    const rows = [
        {
            keyK: 'PortadaImagenB2Key',
            keyN: 'PortadaImagenNombre',
            fileId: 'pp-file-portada-img',
            statusId: 'pp-status-portada-img',
            prevId: 'pp-btn-prev-portada-img',
            clearId: 'pp-btn-clear-portada-img',
        },
        {
            keyK: 'PortadaAdjunto1B2Key',
            keyN: 'PortadaAdjunto1Nombre',
            fileId: 'pp-file-portada-d1',
            statusId: 'pp-status-portada-d1',
            prevId: 'pp-btn-prev-portada-d1',
            clearId: 'pp-btn-clear-portada-d1',
        },
        {
            keyK: 'PortadaAdjunto2B2Key',
            keyN: 'PortadaAdjunto2Nombre',
            fileId: 'pp-file-portada-d2',
            statusId: 'pp-status-portada-d2',
            prevId: 'pp-btn-prev-portada-d2',
            clearId: 'pp-btn-clear-portada-d2',
        },
    ];

    for (const row of rows) {
        const k = b2[row.keyK];
        const n = b2[row.keyN];
        const st = document.getElementById(row.statusId);
        const prev = document.getElementById(row.prevId);
        const clr = document.getElementById(row.clearId);
        const pending = document.getElementById(row.fileId)?.files?.[0];
        const pendingName = pending?.name ? String(pending.name) : '';
        const has = k && String(k).length > 0;
        if (st) {
            if (has && n) st.textContent = `${prefix} ${n}`.trim();
            else if (pendingName) st.textContent = `${pendLab} ${pendingName}`.trim();
            else st.textContent = '';
        }
        if (prev) {
            prev.classList.toggle('d-none', !(has || pendingName));
        }
        if (clr) {
            clr.classList.toggle('d-none', !(has || pendingName));
        }
    }
}

async function openAuthenticatedPreview(pathRel) {
    const t = window.txt?.comunicacion || {};
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const url = `${API.urlBase}${pathRel}`;
    const previewWin = window.open('about:blank', '_blank');
    if (!previewWin) {
        throw new Error(t.admin_noticia_preview_popup_blocked || t.pp_b2_preview_fail || '');
    }
    try {
        const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!res.ok) {
            let detail = String(res.status);
            try {
                const txt = await res.clone().text();
                const plain = String(txt || '').trim();
                if (plain && plain.length < 500 && !plain.startsWith('{')) {
                    detail = plain;
                }
            } catch (_) {}
            previewWin.close();
            throw new Error(detail);
        }
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
        previewWin.location.href = objUrl;
        setTimeout(() => URL.revokeObjectURL(objUrl), 120000);
    } catch (e) {
        try {
            previewWin.close();
        } catch (_) {}
        throw e;
    }
}

function clearB2Slot(keys, fileInputId) {
    b2[keys.k] = null;
    b2[keys.n] = null;
    const fi = document.getElementById(fileInputId);
    if (fi) fi.value = '';
    if (fileInputId === 'pp-file-portada-img') revokePpPortadaPreview();
    renderB2Ui();
}

export async function initAdminPortadaPopup() {
    const t = window.txt?.comunicacion || {};

    async function cargar() {
        const res = await API.request('/admin/comunicacion/portada-popup', 'GET');
        if (res.status !== 'success' || !res.data) {
            await window.Swal?.fire?.({
                icon: 'error',
                title: t.err_generico || 'Error',
                text: res.message || t.err_forbidden || '',
            });
            return;
        }
        const d = res.data;
        hydrateB2FromRow(d);
        revokePpPortadaPreview();
        setVal('pp-portada-titulo', d.PortadaTitulo || '');
        setVal('pp-portada-cuerpo', d.PortadaCuerpo || '');
        setVal('pp-portada-url1', d.PortadaUrlAdjunto1 || '');
        setVal('pp-portada-nombre1', d.PortadaNombreAdjunto1 || '');
        setVal('pp-portada-url2', d.PortadaUrlAdjunto2 || '');
        setVal('pp-portada-nombre2', d.PortadaNombreAdjunto2 || '');
        renderB2Ui();
    }

    function buildPayload() {
        return {
            PortadaTitulo: val('pp-portada-titulo') || null,
            PortadaCuerpo: val('pp-portada-cuerpo') || null,
            PortadaUrlAdjunto1: val('pp-portada-url1') || null,
            PortadaNombreAdjunto1: val('pp-portada-nombre1') || null,
            PortadaUrlAdjunto2: val('pp-portada-url2') || null,
            PortadaNombreAdjunto2: val('pp-portada-nombre2') || null,
            PortadaImagenB2Key: b2.PortadaImagenB2Key,
            PortadaImagenNombre: b2.PortadaImagenNombre,
            PortadaAdjunto1B2Key: b2.PortadaAdjunto1B2Key,
            PortadaAdjunto1Nombre: b2.PortadaAdjunto1Nombre,
            PortadaAdjunto2B2Key: b2.PortadaAdjunto2B2Key,
            PortadaAdjunto2Nombre: b2.PortadaAdjunto2Nombre,
        };
    }

    async function flushPendingPortadaB2(tcLocal) {
        const errUpload = tcLocal.pp_b2_err_upload || '';
        const imgIn = document.getElementById('pp-file-portada-img');
        const fImg = imgIn?.files?.[0];
        if (fImg) {
            const fd = new FormData();
            fd.append('file', fImg);
            const res = await API.request('/comunicacion/b2/upload/portada-imagen', 'POST', fd);
            if (res.status !== 'success' || !res.data) throw new Error(res.message || errUpload);
            b2.PortadaImagenB2Key = res.data.PortadaImagenB2Key ?? null;
            b2.PortadaImagenNombre = res.data.PortadaImagenNombre ?? null;
            if (imgIn) imgIn.value = '';
            revokePpPortadaPreview();
        }
        for (const slot of [1, 2]) {
            const inp = document.getElementById(slot === 1 ? 'pp-file-portada-d1' : 'pp-file-portada-d2');
            const file = inp?.files?.[0];
            if (!file) continue;
            const fd = new FormData();
            fd.append('file', file);
            fd.append('slot', String(slot));
            const res = await API.request('/comunicacion/b2/upload/portada-documento', 'POST', fd);
            if (res.status !== 'success' || !res.data) throw new Error(res.message || errUpload);
            const d = res.data;
            if (slot === 1) {
                b2.PortadaAdjunto1B2Key = d.PortadaAdjunto1B2Key ?? null;
                b2.PortadaAdjunto1Nombre = d.PortadaAdjunto1Nombre ?? null;
                setVal('pp-portada-url1', '');
                setVal('pp-portada-nombre1', '');
            } else {
                b2.PortadaAdjunto2B2Key = d.PortadaAdjunto2B2Key ?? null;
                b2.PortadaAdjunto2Nombre = d.PortadaAdjunto2Nombre ?? null;
                setVal('pp-portada-url2', '');
                setVal('pp-portada-nombre2', '');
            }
            if (inp) inp.value = '';
        }
        renderB2Ui();
    }

    async function uploadPortadaImagen() {
        const inp = document.getElementById('pp-file-portada-img');
        const file = inp?.files?.[0];
        if (!file) {
            await window.Swal?.fire?.({ icon: 'warning', title: t.pp_b2_err_no_file || '', timer: 2000, showConfirmButton: false });
            return;
        }
        const msgUp = t.b2_subiendo_cloud || t.admin_noticia_uploading_files || '';
        showLoader({ staticPhrase: msgUp });
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await API.request('/comunicacion/b2/upload/portada-imagen', 'POST', fd);
            if (res.status !== 'success' || !res.data) {
                throw new Error(res.message || t.pp_b2_err_upload || '');
            }
            b2.PortadaImagenB2Key = res.data.PortadaImagenB2Key ?? null;
            b2.PortadaImagenNombre = res.data.PortadaImagenNombre ?? null;
            if (inp) inp.value = '';
            revokePpPortadaPreview();
            renderB2Ui();
            hideLoader();
            await window.Swal?.fire?.({ icon: 'success', title: t.pp_b2_upload_ok || '', timer: 1600, showConfirmButton: false });
        } catch (e) {
            hideLoader();
            await window.Swal?.fire?.({ icon: 'error', title: t.err_generico || 'Error', text: escapeHtml(e.message || '') });
        }
    }

    async function uploadPortadaDoc(slot) {
        const inp = document.getElementById(slot === 1 ? 'pp-file-portada-d1' : 'pp-file-portada-d2');
        const file = inp?.files?.[0];
        if (!file) {
            await window.Swal?.fire?.({ icon: 'warning', title: t.pp_b2_err_no_file || '', timer: 2000, showConfirmButton: false });
            return;
        }
        const msgUp = t.b2_subiendo_cloud || t.admin_noticia_uploading_files || '';
        showLoader({ staticPhrase: msgUp });
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('slot', String(slot));
            const res = await API.request('/comunicacion/b2/upload/portada-documento', 'POST', fd);
            if (res.status !== 'success' || !res.data) {
                throw new Error(res.message || t.pp_b2_err_upload || '');
            }
            const d = res.data;
            if (slot === 1) {
                b2.PortadaAdjunto1B2Key = d.PortadaAdjunto1B2Key ?? null;
                b2.PortadaAdjunto1Nombre = d.PortadaAdjunto1Nombre ?? null;
                setVal('pp-portada-url1', '');
                setVal('pp-portada-nombre1', '');
            } else {
                b2.PortadaAdjunto2B2Key = d.PortadaAdjunto2B2Key ?? null;
                b2.PortadaAdjunto2Nombre = d.PortadaAdjunto2Nombre ?? null;
                setVal('pp-portada-url2', '');
                setVal('pp-portada-nombre2', '');
            }
            if (inp) inp.value = '';
            renderB2Ui();
            hideLoader();
            await window.Swal?.fire?.({ icon: 'success', title: t.pp_b2_upload_ok || '', timer: 1600, showConfirmButton: false });
        } catch (e) {
            hideLoader();
            await window.Swal?.fire?.({ icon: 'error', title: t.err_generico || 'Error', text: escapeHtml(e.message || '') });
        }
    }

    function onUrlBlurPortada(slot) {
        const url = slot === 1 ? val('pp-portada-url1') : val('pp-portada-url2');
        if (!url) return;
        if (slot === 1) {
            b2.PortadaAdjunto1B2Key = null;
            b2.PortadaAdjunto1Nombre = null;
            const fi = document.getElementById('pp-file-portada-d1');
            if (fi) fi.value = '';
        } else {
            b2.PortadaAdjunto2B2Key = null;
            b2.PortadaAdjunto2Nombre = null;
            const fi = document.getElementById('pp-file-portada-d2');
            if (fi) fi.value = '';
        }
        renderB2Ui();
    }

    document.getElementById('btn-pp-guardar')?.addEventListener('click', async () => {
        const pending = hasPendingPortadaFiles();
        try {
            if (pending) {
                showLoader({ staticPhrase: t.b2_subiendo_cloud || t.admin_noticia_uploading_files || '' });
                await flushPendingPortadaB2(t);
                showLoader({ upgradeOnly: true, staticPhrase: t.b2_guardando || t.pp_btn_guardar || '' });
            } else {
                showLoader({ staticPhrase: t.b2_guardando || t.pp_btn_guardar || '' });
            }
            const payload = buildPayload();
            const res = await API.request('/admin/comunicacion/portada-popup', 'POST', payload);
            hideLoader();
            if (res.status === 'success') {
                await window.Swal?.fire?.({
                    icon: 'success',
                    title: t.pp_save_ok || '',
                    timer: 1800,
                    showConfirmButton: false,
                });
                await cargar();
            } else {
                await window.Swal?.fire?.({
                    icon: 'error',
                    title: t.err_generico || 'Error',
                    text: escapeHtml(res.message || ''),
                });
            }
        } catch (e) {
            hideLoader();
            await window.Swal?.fire?.({
                icon: 'error',
                title: t.err_generico || 'Error',
                text: escapeHtml(e.message || ''),
            });
        }
    });

    document.getElementById('pp-btn-upload-portada-img')?.addEventListener('click', () => uploadPortadaImagen());
    document.getElementById('pp-btn-upload-portada-d1')?.addEventListener('click', () => uploadPortadaDoc(1));
    document.getElementById('pp-btn-upload-portada-d2')?.addEventListener('click', () => uploadPortadaDoc(2));

    document.getElementById('pp-btn-clear-portada-img')?.addEventListener('click', () => {
        clearB2Slot({ k: 'PortadaImagenB2Key', n: 'PortadaImagenNombre' }, 'pp-file-portada-img');
    });
    document.getElementById('pp-btn-clear-portada-d1')?.addEventListener('click', () => {
        clearB2Slot({ k: 'PortadaAdjunto1B2Key', n: 'PortadaAdjunto1Nombre' }, 'pp-file-portada-d1');
    });
    document.getElementById('pp-btn-clear-portada-d2')?.addEventListener('click', () => {
        clearB2Slot({ k: 'PortadaAdjunto2B2Key', n: 'PortadaAdjunto2Nombre' }, 'pp-file-portada-d2');
    });

    document.getElementById('pp-file-portada-img')?.addEventListener('change', () => {
        syncPpPortadaPreview();
        renderB2Ui();
    });
    document.getElementById('pp-file-portada-d1')?.addEventListener('change', () => renderB2Ui());
    document.getElementById('pp-file-portada-d2')?.addEventListener('change', () => renderB2Ui());

    document.getElementById('pp-btn-prev-portada-img')?.addEventListener('click', async (ev) => {
        const pf = document.getElementById('pp-file-portada-img')?.files?.[0];
        if (pf) {
            const u = URL.createObjectURL(pf);
            const previewWin = window.open(u, '_blank', 'noopener,noreferrer');
            if (!previewWin) {
                URL.revokeObjectURL(u);
                await window.Swal?.fire?.({
                    icon: 'warning',
                    text: t.admin_noticia_preview_popup_blocked || t.pp_b2_preview_fail || '',
                });
                return;
            }
            setTimeout(() => URL.revokeObjectURL(u), 120000);
            return;
        }
        const btn = ev.currentTarget;
        const pathRel = btn?.dataset?.previewPath || btn?.getAttribute?.('data-preview-path');
        if (!pathRel) return;
        try {
            await openAuthenticatedPreview(pathRel);
        } catch (err) {
            await window.Swal?.fire?.({
                icon: 'error',
                title: t.pp_b2_preview_fail || t.err_generico || '',
                text: escapeHtml(err?.message || ''),
            });
        }
    });

    document.getElementById('pp-btn-prev-portada-d1')?.addEventListener('click', async (ev) => {
        const pf = document.getElementById('pp-file-portada-d1')?.files?.[0];
        if (pf) {
            const u = URL.createObjectURL(pf);
            const previewWin = window.open(u, '_blank', 'noopener,noreferrer');
            if (!previewWin) {
                URL.revokeObjectURL(u);
                await window.Swal?.fire?.({
                    icon: 'warning',
                    text: t.admin_noticia_preview_popup_blocked || t.pp_b2_preview_fail || '',
                });
                return;
            }
            setTimeout(() => URL.revokeObjectURL(u), 120000);
            return;
        }
        const btn = ev.currentTarget;
        const pathRel = btn?.dataset?.previewPath || btn?.getAttribute?.('data-preview-path');
        if (!pathRel) return;
        try {
            await openAuthenticatedPreview(pathRel);
        } catch (err) {
            await window.Swal?.fire?.({
                icon: 'error',
                title: t.pp_b2_preview_fail || t.err_generico || '',
                text: escapeHtml(err?.message || ''),
            });
        }
    });

    document.getElementById('pp-btn-prev-portada-d2')?.addEventListener('click', async (ev) => {
        const pf = document.getElementById('pp-file-portada-d2')?.files?.[0];
        if (pf) {
            const u = URL.createObjectURL(pf);
            const previewWin = window.open(u, '_blank', 'noopener,noreferrer');
            if (!previewWin) {
                URL.revokeObjectURL(u);
                await window.Swal?.fire?.({
                    icon: 'warning',
                    text: t.admin_noticia_preview_popup_blocked || t.pp_b2_preview_fail || '',
                });
                return;
            }
            setTimeout(() => URL.revokeObjectURL(u), 120000);
            return;
        }
        const btn = ev.currentTarget;
        const pathRel = btn?.dataset?.previewPath || btn?.getAttribute?.('data-preview-path');
        if (!pathRel) return;
        try {
            await openAuthenticatedPreview(pathRel);
        } catch (err) {
            await window.Swal?.fire?.({
                icon: 'error',
                title: t.pp_b2_preview_fail || t.err_generico || '',
                text: escapeHtml(err?.message || ''),
            });
        }
    });

    document.getElementById('pp-portada-url1')?.addEventListener('blur', () => onUrlBlurPortada(1));
    document.getElementById('pp-portada-url2')?.addEventListener('blur', () => onUrlBlurPortada(2));

    try {
        showLoader({ upgradeOnly: true, staticPhrase: '' });
        await cargar();
    } finally {
        hideLoader();
    }
}
