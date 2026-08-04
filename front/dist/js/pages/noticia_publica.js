import { API } from '../../api.js';
import { hydrateNoticiaPortadaThumbs, bindNoticiaAdjuntoOpenButtons } from '../../utils/noticiaPortadaThumb.js';

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatFecha(ds) {
    if (!ds) return '—';
    const d = new Date(String(ds).replace(' ', 'T'));
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

function adjuntosHtml(r, t) {
    const idNoticia = parseInt(r.IdNoticia, 10) || 0;
    if (!idNoticia) return '';
    const btns = [];
    if (r.AdjuntoDoc1B2Key && String(r.AdjuntoDoc1B2Key).trim()) {
        const nm = escapeHtml(String(r.AdjuntoDoc1Nombre || '').trim() || t.noticia_adjunto_sin_nombre || '—');
        btns.push(
            `<button type="button" class="btn btn-sm btn-outline-secondary" data-open-noticia-archivo="${idNoticia}" data-noticia-tipo="doc1">${nm}</button>`
        );
    }
    if (r.AdjuntoDoc2B2Key && String(r.AdjuntoDoc2B2Key).trim()) {
        const nm = escapeHtml(String(r.AdjuntoDoc2Nombre || '').trim() || t.noticia_adjunto_sin_nombre || '—');
        btns.push(
            `<button type="button" class="btn btn-sm btn-outline-secondary" data-open-noticia-archivo="${idNoticia}" data-noticia-tipo="doc2">${nm}</button>`
        );
    }
    if (!btns.length) return '';
    const lab = escapeHtml(t.noticia_adjuntos_label || '');
    return `<div class="mb-3"><div class="small text-muted text-uppercase mb-2 fw-semibold" style="font-size:11px;">${lab}</div><div class="d-flex flex-wrap gap-2">${btns.join('')}</div></div>`;
}

export async function initNoticiaPublica() {
    const t = window.txt?.comunicacion || {};
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id') || '0', 10);
    const loading = document.getElementById('noticia-publica-loading');
    const errEl = document.getElementById('noticia-publica-error');
    const article = document.getElementById('noticia-publica-article');

    const showErr = (msg) => {
        loading?.classList.add('d-none');
        article?.classList.add('d-none');
        if (errEl) {
            errEl.textContent = msg || t.noticia_publica_no_disponible || 'Noticia no disponible';
            errEl.classList.remove('d-none');
        }
    };

    if (id <= 0) {
        showErr(t.noticia_publica_id_invalido || '');
        return;
    }

    const res = await API.request(`/comunicacion/noticias/public/${id}`, 'GET');
    if (res.status !== 'success' || !res.data) {
        showErr(res.message || t.noticia_publica_no_disponible || '');
        return;
    }

    const row = res.data;
    const tit = document.getElementById('noticia-publica-titulo');
    const meta = document.getElementById('noticia-publica-meta');
    const cuerpo = document.getElementById('noticia-publica-cuerpo');
    const hostPortada = document.getElementById('noticia-publica-portada');
    const hostAdj = document.getElementById('noticia-publica-adjuntos');

    if (tit) tit.textContent = row.Titulo || '—';
    document.title = `${row.Titulo || 'Noticia'} · GROBO`;

    if (meta) {
        const fp = row.FechaPublicacion || row.FechaCreacion || '';
        const inst = row.NombreInstitucion || '';
        const badge = noticiaCategoriaBadgeHtml(row);
        meta.innerHTML = `<span>${escapeHtml(formatFecha(fp))}</span>${badge ? ` ${badge}` : ''}${
            inst ? `<span class="text-muted"> · ${escapeHtml(inst)}</span>` : ''
        }`;
    }

    if (cuerpo) cuerpo.textContent = row.Cuerpo || '';

    if (hostPortada) {
        hostPortada.innerHTML = '';
        if (row.ImagenPortadaB2Key && String(row.ImagenPortadaB2Key).trim() !== '') {
            hostPortada.innerHTML = `<div class="mb-3 rounded overflow-hidden bg-light d-none border d-flex align-items-center justify-content-center p-2" data-noticia-portada-id="${id}" style="max-height:min(70vh,560px);min-height:80px"><img alt="" class="d-block mx-auto" style="max-width:100%;max-height:min(65vh,520px);width:auto;height:auto;object-fit:contain" /></div>`;
            await hydrateNoticiaPortadaThumbs(hostPortada, { publicAccess: true });
        }
    }

    if (hostAdj) {
        hostAdj.innerHTML = adjuntosHtml(row, t) || '';
        bindNoticiaAdjuntoOpenButtons(hostAdj, t.err_generico || '', { publicAccess: true });
    }

    loading?.classList.add('d-none');
    errEl?.classList.add('d-none');
    article?.classList.remove('d-none');
}
