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
    }

    document.getElementById('btn-pp-guardar')?.addEventListener('click', async () => {
        const rawNews = val('pp-popup-id-noticia');
        const parsedNews = rawNews ? parseInt(rawNews, 10) : NaN;
        const payload = {
            PortadaTitulo: val('pp-portada-titulo') || null,
            PortadaCuerpo: val('pp-portada-cuerpo') || null,
            PortadaUrlAdjunto1: val('pp-portada-url1') || null,
            PortadaNombreAdjunto1: val('pp-portada-nombre1') || null,
            PortadaUrlAdjunto2: val('pp-portada-url2') || null,
            PortadaNombreAdjunto2: val('pp-portada-nombre2') || null,
            PopupActivo: document.getElementById('pp-popup-activo')?.checked ? 1 : 0,
            PopupTitulo: val('pp-popup-titulo') || null,
            PopupCuerpo: val('pp-popup-cuerpo') || null,
            PopupUrlAdjunto1: val('pp-popup-url1') || null,
            PopupNombreAdjunto1: val('pp-popup-nombre1') || null,
            PopupUrlAdjunto2: val('pp-popup-url2') || null,
            PopupNombreAdjunto2: val('pp-popup-nombre2') || null,
            PopupIdNoticia: Number.isFinite(parsedNews) && parsedNews > 0 ? parsedNews : null,
        };
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

    try {
        showLoader({ upgradeOnly: true, staticPhrase: '' });
        await cargar();
    } finally {
        hideLoader();
    }
}
