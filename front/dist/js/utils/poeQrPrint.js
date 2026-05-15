import { getCorrectPath } from '../components/menujs/MenuConfig.js';

function escapeHtmlAttr(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** URL absoluta al portal POEs con ancla de documento (?id=). */
export function buildPanelPoePublicUrl(idPoe) {
    const base = getCorrectPath('panel/poe');
    const sep = base.includes('?') ? '&' : '?';
    const id = encodeURIComponent(String(idPoe));
    try {
        return new URL(`${base}${sep}id=${id}`, window.location.origin).href;
    } catch (e) {
        return `${window.location.origin}/${base}${sep}id=${id}`;
    }
}

/**
 * Abre una ventana lista para imprimir: título, QR y URL en texto.
 * @returns {boolean} false si el navegador bloqueó la ventana
 */
export function printPoeQrSheet(docTitle, targetUrl) {
    const w = window.open('', '_blank', 'noopener,noreferrer');
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
  setTimeout(function(){ window.focus(); window.print(); },400);
})();
<\/script>
</body></html>`);
    w.document.close();
    return true;
}

/**
 * Muestra el QR en SweetAlert2; confirmar = imprimir hoja dedicada.
 * Requiere `QRCode` global (qrcodejs) en la página.
 */
export async function showPoeQrSwal(tc, docTitle, targetUrl) {
    const t = tc || window.txt?.comunicacion || {};
    const hint = escapeHtmlAttr(t.poe_qr_hint || '');
    const urlHtml = escapeHtmlAttr(targetUrl);
    const result = await window.Swal?.fire?.({
        title: t.poe_qr_title || '',
        html: `<p class="small text-muted mb-3">${hint}</p><div class="d-flex justify-content-center"><div id="swal-qr-poe-shared"></div></div><p class="small text-break mt-3 mb-0">${urlHtml}</p>`,
        width: 420,
        showCancelButton: true,
        confirmButtonText: t.poe_btn_imprimir_qr || '',
        cancelButtonText: t.admin_cancelar || '',
        didOpen: () => {
            const host = document.getElementById('swal-qr-poe-shared');
            if (!host || typeof QRCode === 'undefined') return;
            host.innerHTML = '';
            try {
                new QRCode(host, { text: targetUrl, width: 220, height: 220 });
            } catch (e) {
                console.error(e);
            }
        },
    });
    if (result?.isConfirmed) {
        if (!printPoeQrSheet(docTitle, targetUrl)) {
            await window.Swal?.fire?.({ icon: 'warning', text: t.poe_print_blocked || '' });
        }
    }
}
