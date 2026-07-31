/** @see assetVersion.js POE_ASSET_VERSION */
export const POE_QR_PRINT_VERSION = '20260521';

function groboFrontBasePath() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? '/URBE-API-DRIVEN/front/'
        : '/';
}

function escapeHtmlAttr(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** URL absoluta al portal POEs con ancla de documento (?id=). Sin import de api.js (evita desfase de deploy). */
export function buildPanelPoePublicUrl(idPoe) {
    const base = `${groboFrontBasePath()}paginas/panel/poe.html`;
    const id = String(idPoe ?? '').trim();
    const rel = id ? `${base}?id=${encodeURIComponent(id)}` : base;
    return window.location.origin + rel;
}

/**
 * Abre una ventana lista para imprimir: título, QR y URL en texto.
 * @param {string} docTitle
 * @param {string} targetUrl
 * @param {Window|null} [existingWin] ventana ya abierta (p. ej. desde gesto de Swal)
 * @returns {boolean} false si el navegador bloqueó la ventana
 */
export function printPoeQrSheet(docTitle, targetUrl, existingWin = null) {
    // No usar "noopener" en features: el navegador devuelve null y no se puede document.write.
    const w = existingWin || window.open('about:blank', '_blank');
    if (!w) return false;
    const title = String(docTitle ?? '').trim() || 'POEs';
    const url = String(targetUrl ?? '');
    w.document.open();
    w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtmlAttr(title)}</title>
<style>
  body{font-family:system-ui,sans-serif;padding:24px;text-align:center;}
  h1{font-size:18px;margin:0 0 16px;font-weight:700;}
  .url{font-size:11px;word-break:break-all;text-align:left;margin-top:16px;color:#333;}
  @media print{body{padding:12mm;}}
</style></head><body>
<h1>${escapeHtmlAttr(title)}</h1>
<div id="rq"></div>
<p class="url">${escapeHtmlAttr(url)}</p>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
<script>
(function(){
  var u=${JSON.stringify(url)};
  try{ new QRCode(document.getElementById('rq'),{text:u,width:220,height:220}); }catch(e){}
  setTimeout(function(){ window.focus(); window.print(); },600);
})();
<\/script>
</body></html>`);
    w.document.close();
    return true;
}

/** Carga qrcodejs bajo demanda si la página no lo incluyó en el HTML. */
function ensureQrCodeLib() {
    if (typeof QRCode !== 'undefined') return Promise.resolve(true);
    const existing = document.querySelector('script[data-grobo-qrcode]');
    if (existing) {
        return new Promise((resolve) => {
            existing.addEventListener('load', () => resolve(typeof QRCode !== 'undefined'), { once: true });
            existing.addEventListener('error', () => resolve(false), { once: true });
        });
    }
    return new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
        s.async = true;
        s.dataset.groboQrcode = '1';
        s.onload = () => resolve(typeof QRCode !== 'undefined');
        s.onerror = () => resolve(false);
        document.head.appendChild(s);
    });
}

/**
 * Muestra el QR en SweetAlert2; confirmar = imprimir hoja dedicada.
 * Carga qrcodejs bajo demanda si hace falta.
 */
export async function showPoeQrSwal(tc, docTitle, targetUrl) {
    const t = tc || window.txt?.comunicacion || {};
    const hint = escapeHtmlAttr(t.poe_qr_hint || '');
    const urlHtml = escapeHtmlAttr(targetUrl);
    const qrReady = await ensureQrCodeLib();
    const result = await window.Swal?.fire?.({
        title: t.poe_qr_title || '',
        html: `<p class="small text-muted mb-3">${hint}</p><div class="d-flex justify-content-center"><div id="swal-qr-poe-shared"></div></div><p class="small text-break mt-3 mb-0">${urlHtml}</p>`,
        width: 420,
        showCancelButton: true,
        confirmButtonText: t.poe_btn_imprimir_qr || '',
        cancelButtonText: t.admin_cancelar || '',
        didOpen: async () => {
            const host = document.getElementById('swal-qr-poe-shared');
            if (!host) return;
            if (!qrReady || typeof QRCode === 'undefined') {
                host.innerHTML = `<p class="small text-danger mb-0">${escapeHtmlAttr(t.poe_qr_no_lib || '')}</p>`;
                return;
            }
            host.innerHTML = '';
            try {
                new QRCode(host, { text: targetUrl, width: 220, height: 220 });
            } catch (e) {
                console.error(e);
                host.innerHTML = `<p class="small text-danger mb-0">${escapeHtmlAttr(t.poe_qr_no_lib || '')}</p>`;
            }
        },
        preConfirm: () => {
            // Abrir en el mismo gesto del clic (antes del await) para no perder el popup.
            const w = window.open('about:blank', '_blank');
            if (!w) {
                window.Swal?.showValidationMessage?.(t.poe_print_blocked || '');
                return false;
            }
            return w;
        },
    });
    if (result?.isConfirmed) {
        if (!printPoeQrSheet(docTitle, targetUrl, result.value || null)) {
            await window.Swal?.fire?.({ icon: 'warning', text: t.poe_print_blocked || '' });
        }
    }
}
