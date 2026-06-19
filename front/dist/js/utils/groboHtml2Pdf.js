/**
 * html2pdf desde HTML string — monta un nodo DOM visible para html2canvas (evita PDF en blanco).
 */

function prepareDomForPdfCapture(dom) {
    dom.style.position = 'fixed';
    dom.style.left = '0';
    dom.style.top = '0';
    dom.style.opacity = '1';
    dom.style.visibility = 'visible';
    dom.style.pointerEvents = 'none';
    dom.style.zIndex = '2147483640';
    dom.style.background = '#ffffff';
    dom.style.color = '#212529';
    dom.style.width = '794px';
    dom.style.maxWidth = '794px';
    dom.style.padding = '16px';
    dom.style.boxSizing = 'border-box';
    dom.querySelectorAll('[style*="display: flex"], [style*="display:flex"]').forEach((el) => {
        el.style.display = 'block';
    });
    dom.querySelectorAll('table').forEach((t) => {
        t.style.width = '100%';
        t.style.borderCollapse = 'collapse';
    });
}

async function waitPdfPaint(dom) {
    void dom.offsetHeight;
    if (document.fonts?.ready) {
        try {
            await document.fonts.ready;
        } catch (_) {
            /* ignore */
        }
    }
    await new Promise((r) => requestAnimationFrame(() => r()));
    await new Promise((r) => setTimeout(r, 200));
}

function getHtml2PdfFn() {
    if (typeof html2pdf === 'function') return html2pdf;
    if (typeof window.html2pdf === 'function') return window.html2pdf;
    return null;
}

/**
 * @param {string} html
 * @param {Record<string, unknown>} [opt] opciones html2pdf (filename, margin, etc.)
 */
export async function saveHtmlStringAsPdf(html, opt = {}) {
    const fn = getHtml2PdfFn();
    if (!fn) {
        const err = new Error('html2pdf_not_loaded');
        err.code = 'html2pdf_not_loaded';
        throw err;
    }

    const host = document.createElement('div');
    host.innerHTML = String(html || '').trim();
    const target = host.firstElementChild || host;
    prepareDomForPdfCapture(target);
    document.body.appendChild(target);

    const defaults = {
        margin: [12, 12, 12, 12],
        html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            scrollX: 0,
            scrollY: 0,
            windowWidth: 794,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    try {
        await waitPdfPaint(target);
        await fn().set({ ...defaults, ...opt }).from(target).save();
    } finally {
        target.remove();
    }
}
