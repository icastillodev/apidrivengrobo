/**
 * html2pdf desde HTML string — monta un nodo DOM visible para html2canvas (evita PDF en blanco).
 */

function prepareDomForPdfCapture(dom) {
    dom.style.position = 'fixed';
    dom.style.left = '-10000px';
    dom.style.top = '0';
    dom.style.opacity = '1';
    dom.style.visibility = 'visible';
    dom.style.pointerEvents = 'none';
    dom.style.zIndex = '-1';
    dom.style.background = '#ffffff';
    dom.style.color = '#212529';
    dom.style.width = '794px';
    dom.style.maxWidth = '794px';
}

async function waitPdfPaint(dom) {
    void dom.offsetHeight;
    await new Promise((r) => requestAnimationFrame(() => r()));
    await new Promise((r) => setTimeout(r, 120));
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

    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    prepareDomForPdfCapture(wrap);
    document.body.appendChild(wrap);

    const defaults = {
        margin: [18, 18, 18, 18],
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    try {
        await waitPdfPaint(wrap);
        await fn().set({ ...defaults, ...opt }).from(wrap).save();
    } finally {
        wrap.remove();
    }
}
