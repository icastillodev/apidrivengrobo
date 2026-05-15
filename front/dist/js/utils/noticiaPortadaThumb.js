import { API } from '../api.js';

function authHeaders() {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

const txCom = () => window.txt?.comunicacion || {};

/**
 * Rellena una ventana ya abierta (p. ej. `about:blank` abierta en el mismo clic del usuario)
 * con el archivo de la noticia: GET autenticado → Blob → object URL en `location`.
 * Evita el bloqueo de popups que ocurre si se hace `await fetch` y después `window.open`.
 *
 * @param {Window} previewWin
 * @param {number|string} idNoticia
 * @param {'imagen'|'doc1'|'doc2'} tipo
 */
export async function fillNoticiaPreviewWindow(previewWin, idNoticia, tipo) {
    if (!previewWin || previewWin.closed) throw new Error(txCom().pp_b2_preview_fail || '');
    const id = parseInt(String(idNoticia), 10);
    if (!id || id <= 0) throw new Error('ID inválido');
    const url = `${API.urlBase}/comunicacion/noticias/${id}/archivo/${tipo}`;
    const res = await fetch(url, { headers: authHeaders() });
    const mimeHeader = (res.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim();
    const buf = await res.arrayBuffer();

    if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
            const txt = new TextDecoder('utf-8').decode(buf.slice(0, 900)).replace(/\s+/g, ' ').trim();
            if (txt) msg = txt.length > 220 ? `${txt.slice(0, 220)}…` : txt;
        } catch (_) {
            /* ignore */
        }
        throw new Error(msg);
    }
    if (!buf.byteLength) throw new Error('Archivo vacío');

    let mime = mimeHeader || 'application/octet-stream';
    if (tipo === 'imagen') {
        const u8 = new Uint8Array(buf.slice(0, 4));
        const isJpeg = u8.length >= 3 && u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff;
        if (isJpeg) mime = 'image/jpeg';
    }

    const blob = new Blob([buf], { type: mime });
    const objUrl = URL.createObjectURL(blob);
    previewWin.location.href = objUrl;
    setTimeout(() => URL.revokeObjectURL(objUrl), 180000);
}

/**
 * Abre imagen o documento de noticia en una pestaña nueva.
 * Solo es seguro ante bloqueo de popups si se llama en la misma pila síncrona que el clic;
 * desde manejadores `async` use `window.open('about:blank')` primero y `fillNoticiaPreviewWindow`.
 *
 * @param {number|string} idNoticia
 * @param {'imagen'|'doc1'|'doc2'} tipo
 */
export async function openNoticiaArchivoInNewTab(idNoticia, tipo) {
    const tc = txCom();
    const previewWin = window.open('about:blank', '_blank');
    if (!previewWin) {
        throw new Error(tc.admin_noticia_preview_popup_blocked || tc.pp_b2_preview_fail || '');
    }
    try {
        await fillNoticiaPreviewWindow(previewWin, idNoticia, tipo);
    } catch (e) {
        try {
            previewWin.close();
        } catch (_) {
            /* ignore */
        }
        throw e;
    }
}

/** Botones `data-open-noticia-archivo` + `data-noticia-tipo` (doc1|doc2). */
export function bindNoticiaAdjuntoOpenButtons(root, errFallback) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    const tc = txCom();
    root.querySelectorAll('button[data-open-noticia-archivo]').forEach((btn) => {
        btn.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const id = parseInt(btn.getAttribute('data-open-noticia-archivo'), 10);
            const tipo = btn.getAttribute('data-noticia-tipo') || 'doc1';
            const previewWin = window.open('about:blank', '_blank');
            if (!previewWin) {
                const msg = tc.admin_noticia_preview_popup_blocked || tc.pp_b2_preview_fail || errFallback || '';
                if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', text: msg });
                return;
            }
            void (async () => {
                try {
                    await fillNoticiaPreviewWindow(previewWin, id, tipo);
                } catch (e) {
                    try {
                        previewWin.close();
                    } catch (_) {
                        /* ignore */
                    }
                    const msg = String(e?.message || errFallback || '');
                    if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', text: msg });
                }
            })();
        });
    });
}

const DASH_PORTADA_STYLE_ID = 'dash-noticia-portada-adaptive-css';

function ensureDashPortadaAdaptiveStyles() {
    if (document.getElementById(DASH_PORTADA_STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = DASH_PORTADA_STYLE_ID;
    el.textContent = `
.dash-noticia-portada-wrap.dash-noticia-portada--adaptive {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 128px;
}
.dash-noticia-portada-wrap.dash-noticia-portada--adaptive .dash-noticia-portada-img {
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
}
`;
    document.head.appendChild(el);
}

/**
 * Ajusta marco de portada en dashboard según proporción real (cuadrado vs horizontal / vertical).
 * Solo aplica si el wrap tiene la clase `dash-noticia-portada--adaptive`.
 */
function applyDashPortadaAdaptiveLayout(wrap, img) {
    if (!wrap?.classList.contains('dash-noticia-portada--adaptive')) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return;
    const r = w / h;
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.justifyContent = 'center';
    wrap.style.width = '100%';
    img.style.display = 'block';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.style.objectPosition = 'center';

    if (r >= 0.88 && r <= 1.12) {
        wrap.style.aspectRatio = '1 / 1';
        wrap.style.maxHeight = 'min(228px, 78vw)';
    } else if (r > 1.12) {
        const ar = Math.min(Math.max(r, 1.28), 2.35);
        wrap.style.aspectRatio = `${ar} / 1`;
        wrap.style.maxHeight = 'min(198px, 58vw)';
    } else {
        const ar = Math.max(Math.min(r, 0.82), 0.48);
        wrap.style.aspectRatio = `${ar} / 1`;
        wrap.style.maxHeight = 'min(268px, 72vw)';
    }
}

/**
 * Carga imágenes de portada vía GET autenticado (B2 proxy) y las muestra en wraps
 * `[data-noticia-portada-id]` con un `<img>` hijo.
 */
export async function hydrateNoticiaPortadaThumbs(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    ensureDashPortadaAdaptiveStyles();
    const wraps = [...root.querySelectorAll('[data-noticia-portada-id]')];
    await Promise.all(
        wraps.map(async (wrap) => {
            const id = parseInt(wrap.getAttribute('data-noticia-portada-id'), 10);
            const img = wrap.querySelector('img');
            if (!id || !img) return;
            try {
                const url = `${API.urlBase}/comunicacion/noticias/${id}/archivo/imagen`;
                const res = await fetch(url, { headers: authHeaders() });
                const mimeHeader = (res.headers.get('content-type') || '').split(';')[0].trim();
                const buf = await res.arrayBuffer();
                if (!res.ok || !buf.byteLength) {
                    wrap.remove();
                    return;
                }
                const u8 = new Uint8Array(buf.slice(0, 3));
                const isJpeg = u8.length >= 3 && u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff;
                const mimeOk = isJpeg || mimeHeader.startsWith('image/');
                if (!mimeOk) {
                    wrap.remove();
                    return;
                }
                const mime = isJpeg ? 'image/jpeg' : mimeHeader || 'image/jpeg';
                const prev = img.dataset.blobUrl;
                if (prev) URL.revokeObjectURL(prev);
                const blob = new Blob([buf], { type: mime });
                const objUrl = URL.createObjectURL(blob);
                img.dataset.blobUrl = objUrl;
                img.src = objUrl;
                wrap.classList.remove('d-none');
                const runLayout = () => applyDashPortadaAdaptiveLayout(wrap, img);
                if (img.complete && img.naturalWidth > 0) {
                    runLayout();
                } else {
                    img.addEventListener('load', runLayout, { once: true });
                }
            } catch (_) {
                wrap.remove();
            }
        })
    );
}
