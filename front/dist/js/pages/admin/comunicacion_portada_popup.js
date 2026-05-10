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

/** Estado de archivos B2 (se envía completo en cada POST para no borrar columnas por omisión). */
const b2 = {
    PortadaImagenB2Key: null,
    PortadaImagenNombre: null,
    PortadaAdjunto1B2Key: null,
    PortadaAdjunto1Nombre: null,
    PortadaAdjunto2B2Key: null,
    PortadaAdjunto2Nombre: null,
    PopupAdjunto1B2Key: null,
    PopupAdjunto1Nombre: null,
    PopupAdjunto2B2Key: null,
    PopupAdjunto2Nombre: null,
};

function hydrateB2FromRow(d) {
    if (!d || typeof d !== 'object') return;
    b2.PortadaImagenB2Key = d.PortadaImagenB2Key || null;
    b2.PortadaImagenNombre = d.PortadaImagenNombre || null;
    b2.PortadaAdjunto1B2Key = d.PortadaAdjunto1B2Key || null;
    b2.PortadaAdjunto1Nombre = d.PortadaAdjunto1Nombre || null;
    b2.PortadaAdjunto2B2Key = d.PortadaAdjunto2B2Key || null;
    b2.PortadaAdjunto2Nombre = d.PortadaAdjunto2Nombre || null;
    b2.PopupAdjunto1B2Key = d.PopupAdjunto1B2Key || null;
    b2.PopupAdjunto1Nombre = d.PopupAdjunto1Nombre || null;
    b2.PopupAdjunto2B2Key = d.PopupAdjunto2B2Key || null;
    b2.PopupAdjunto2Nombre = d.PopupAdjunto2Nombre || null;
}

function renderB2Ui() {
    const tc = window.txt?.comunicacion || {};
    const prefix = tc.pp_b2_status_uploaded || '';

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
        {
            keyK: 'PopupAdjunto1B2Key',
            keyN: 'PopupAdjunto1Nombre',
            fileId: 'pp-file-popup-d1',
            statusId: 'pp-status-popup-d1',
            prevId: 'pp-btn-prev-popup-d1',
            clearId: 'pp-btn-clear-popup-d1',
        },
        {
            keyK: 'PopupAdjunto2B2Key',
            keyN: 'PopupAdjunto2Nombre',
            fileId: 'pp-file-popup-d2',
            statusId: 'pp-status-popup-d2',
            prevId: 'pp-btn-prev-popup-d2',
            clearId: 'pp-btn-clear-popup-d2',
        },
    ];

    for (const row of rows) {
        const k = b2[row.keyK];
        const n = b2[row.keyN];
        const st = document.getElementById(row.statusId);
        const prev = document.getElementById(row.prevId);
        const clr = document.getElementById(row.clearId);
        const has = k && String(k).length > 0;
        if (st) {
            st.textContent = has && n ? `${prefix} ${n}`.trim() : '';
        }
        if (prev) {
            prev.classList.toggle('d-none', !has);
        }
        if (clr) clr.classList.toggle('d-none', !has);
    }
}

async function openAuthenticatedPreview(pathRel) {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const url = `${API.urlBase}${pathRel}`;
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    window.open(objUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(objUrl), 120000);
}

function clearB2Slot(keys, fileInputId) {
    b2[keys.k] = null;
    b2[keys.n] = null;
    const fi = document.getElementById(fileInputId);
    if (fi) fi.value = '';
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
        setVal('pp-portada-titulo', d.PortadaTitulo || '');
        setVal('pp-portada-cuerpo', d.PortadaCuerpo || '');
        setVal('pp-portada-url1', d.PortadaUrlAdjunto1 || '');
        setVal('pp-portada-nombre1', d.PortadaNombreAdjunto1 || '');
        setVal('pp-portada-url2', d.PortadaUrlAdjunto2 || '');
        setVal('pp-portada-nombre2', d.PortadaNombreAdjunto2 || '');
        const chk = document.getElementById('pp-popup-activo');
        if (chk) chk.checked = parseInt(d.PopupActivo, 10) === 1;
        setVal('pp-popup-titulo', d.PopupTitulo || '');
        setVal('pp-popup-cuerpo', d.PopupCuerpo || '');
        setVal('pp-popup-url1', d.PopupUrlAdjunto1 || '');
        setVal('pp-popup-nombre1', d.PopupNombreAdjunto1 || '');
        setVal('pp-popup-url2', d.PopupUrlAdjunto2 || '');
        setVal('pp-popup-nombre2', d.PopupNombreAdjunto2 || '');
        setVal('pp-popup-id-noticia', d.PopupIdNoticia != null ? String(d.PopupIdNoticia) : '');
        renderB2Ui();
    }

    function buildPayload() {
        const rawNews = val('pp-popup-id-noticia');
        const parsedNews = rawNews ? parseInt(rawNews, 10) : NaN;
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
            PopupActivo: document.getElementById('pp-popup-activo')?.checked ? 1 : 0,
            PopupTitulo: val('pp-popup-titulo') || null,
            PopupCuerpo: val('pp-popup-cuerpo') || null,
            PopupUrlAdjunto1: val('pp-popup-url1') || null,
            PopupNombreAdjunto1: val('pp-popup-nombre1') || null,
            PopupUrlAdjunto2: val('pp-popup-url2') || null,
            PopupNombreAdjunto2: val('pp-popup-nombre2') || null,
            PopupAdjunto1B2Key: b2.PopupAdjunto1B2Key,
            PopupAdjunto1Nombre: b2.PopupAdjunto1Nombre,
            PopupAdjunto2B2Key: b2.PopupAdjunto2B2Key,
            PopupAdjunto2Nombre: b2.PopupAdjunto2Nombre,
            PopupIdNoticia: Number.isFinite(parsedNews) && parsedNews > 0 ? parsedNews : null,
        };
    }

    async function uploadPortadaImagen() {
        const inp = document.getElementById('pp-file-portada-img');
        const file = inp?.files?.[0];
        if (!file) {
            await window.Swal?.fire?.({ icon: 'warning', title: t.pp_b2_err_no_file || '', timer: 2000, showConfirmButton: false });
            return;
        }
        showLoader({ upgradeOnly: true, staticPhrase: '' });
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await API.request('/comunicacion/b2/upload/portada-imagen', 'POST', fd);
            if (res.status !== 'success' || !res.data) {
                throw new Error(res.message || t.pp_b2_err_upload || '');
            }
            b2.PortadaImagenB2Key = res.data.PortadaImagenB2Key ?? null;
            b2.PortadaImagenNombre = res.data.PortadaImagenNombre ?? null;
            renderB2Ui();
            await window.Swal?.fire?.({ icon: 'success', title: t.pp_b2_upload_ok || '', timer: 1600, showConfirmButton: false });
        } catch (e) {
            await window.Swal?.fire?.({ icon: 'error', title: t.err_generico || 'Error', text: escapeHtml(e.message || '') });
        } finally {
            hideLoader();
        }
    }

    async function uploadPortadaDoc(slot) {
        const inp = document.getElementById(slot === 1 ? 'pp-file-portada-d1' : 'pp-file-portada-d2');
        const file = inp?.files?.[0];
        if (!file) {
            await window.Swal?.fire?.({ icon: 'warning', title: t.pp_b2_err_no_file || '', timer: 2000, showConfirmButton: false });
            return;
        }
        showLoader({ upgradeOnly: true, staticPhrase: '' });
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
            renderB2Ui();
            await window.Swal?.fire?.({ icon: 'success', title: t.pp_b2_upload_ok || '', timer: 1600, showConfirmButton: false });
        } catch (e) {
            await window.Swal?.fire?.({ icon: 'error', title: t.err_generico || 'Error', text: escapeHtml(e.message || '') });
        } finally {
            hideLoader();
        }
    }

    async function uploadPopupDoc(slot) {
        const inp = document.getElementById(slot === 1 ? 'pp-file-popup-d1' : 'pp-file-popup-d2');
        const file = inp?.files?.[0];
        if (!file) {
            await window.Swal?.fire?.({ icon: 'warning', title: t.pp_b2_err_no_file || '', timer: 2000, showConfirmButton: false });
            return;
        }
        showLoader({ upgradeOnly: true, staticPhrase: '' });
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('slot', String(slot));
            const res = await API.request('/comunicacion/b2/upload/popup-documento', 'POST', fd);
            if (res.status !== 'success' || !res.data) {
                throw new Error(res.message || t.pp_b2_err_upload || '');
            }
            const d = res.data;
            if (slot === 1) {
                b2.PopupAdjunto1B2Key = d.PopupAdjunto1B2Key ?? null;
                b2.PopupAdjunto1Nombre = d.PopupAdjunto1Nombre ?? null;
                setVal('pp-popup-url1', '');
                setVal('pp-popup-nombre1', '');
            } else {
                b2.PopupAdjunto2B2Key = d.PopupAdjunto2B2Key ?? null;
                b2.PopupAdjunto2Nombre = d.PopupAdjunto2Nombre ?? null;
                setVal('pp-popup-url2', '');
                setVal('pp-popup-nombre2', '');
            }
            renderB2Ui();
            await window.Swal?.fire?.({ icon: 'success', title: t.pp_b2_upload_ok || '', timer: 1600, showConfirmButton: false });
        } catch (e) {
            await window.Swal?.fire?.({ icon: 'error', title: t.err_generico || 'Error', text: escapeHtml(e.message || '') });
        } finally {
            hideLoader();
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

    function onUrlBlurPopup(slot) {
        const url = slot === 1 ? val('pp-popup-url1') : val('pp-popup-url2');
        if (!url) return;
        if (slot === 1) {
            b2.PopupAdjunto1B2Key = null;
            b2.PopupAdjunto1Nombre = null;
            const fi = document.getElementById('pp-file-popup-d1');
            if (fi) fi.value = '';
        } else {
            b2.PopupAdjunto2B2Key = null;
            b2.PopupAdjunto2Nombre = null;
            const fi = document.getElementById('pp-file-popup-d2');
            if (fi) fi.value = '';
        }
        renderB2Ui();
    }

    document.getElementById('btn-pp-guardar')?.addEventListener('click', async () => {
        const payload = buildPayload();
        const res = await API.request('/admin/comunicacion/portada-popup', 'POST', payload);
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
    });

    document.getElementById('pp-btn-upload-portada-img')?.addEventListener('click', () => uploadPortadaImagen());
    document.getElementById('pp-btn-upload-portada-d1')?.addEventListener('click', () => uploadPortadaDoc(1));
    document.getElementById('pp-btn-upload-portada-d2')?.addEventListener('click', () => uploadPortadaDoc(2));
    document.getElementById('pp-btn-upload-popup-d1')?.addEventListener('click', () => uploadPopupDoc(1));
    document.getElementById('pp-btn-upload-popup-d2')?.addEventListener('click', () => uploadPopupDoc(2));

    document.getElementById('pp-btn-clear-portada-img')?.addEventListener('click', () => {
        clearB2Slot({ k: 'PortadaImagenB2Key', n: 'PortadaImagenNombre' }, 'pp-file-portada-img');
    });
    document.getElementById('pp-btn-clear-portada-d1')?.addEventListener('click', () => {
        clearB2Slot({ k: 'PortadaAdjunto1B2Key', n: 'PortadaAdjunto1Nombre' }, 'pp-file-portada-d1');
    });
    document.getElementById('pp-btn-clear-portada-d2')?.addEventListener('click', () => {
        clearB2Slot({ k: 'PortadaAdjunto2B2Key', n: 'PortadaAdjunto2Nombre' }, 'pp-file-portada-d2');
    });
    document.getElementById('pp-btn-clear-popup-d1')?.addEventListener('click', () => {
        clearB2Slot({ k: 'PopupAdjunto1B2Key', n: 'PopupAdjunto1Nombre' }, 'pp-file-popup-d1');
    });
    document.getElementById('pp-btn-clear-popup-d2')?.addEventListener('click', () => {
        clearB2Slot({ k: 'PopupAdjunto2B2Key', n: 'PopupAdjunto2Nombre' }, 'pp-file-popup-d2');
    });

    ['pp-btn-prev-portada-img', 'pp-btn-prev-portada-d1', 'pp-btn-prev-portada-d2', 'pp-btn-prev-popup-d1', 'pp-btn-prev-popup-d2'].forEach((id) => {
        document.getElementById(id)?.addEventListener('click', async (ev) => {
            const btn = ev.currentTarget;
            const pathRel = btn?.dataset?.previewPath || btn?.getAttribute?.('data-preview-path');
            if (!pathRel) return;
            try {
                await openAuthenticatedPreview(pathRel);
            } catch (_) {
                await window.Swal?.fire?.({ icon: 'error', title: t.pp_b2_preview_fail || t.err_generico || '' });
            }
        });
    });

    document.getElementById('pp-portada-url1')?.addEventListener('blur', () => onUrlBlurPortada(1));
    document.getElementById('pp-portada-url2')?.addEventListener('blur', () => onUrlBlurPortada(2));
    document.getElementById('pp-popup-url1')?.addEventListener('blur', () => onUrlBlurPopup(1));
    document.getElementById('pp-popup-url2')?.addEventListener('blur', () => onUrlBlurPopup(2));

    try {
        showLoader({ upgradeOnly: true, staticPhrase: '' });
        await cargar();
    } finally {
        hideLoader();
    }
}
