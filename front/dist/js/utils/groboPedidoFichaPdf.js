/**
 * Ficha PDF de pedidos admin (animales / reactivos / insumos): jsPDF + autoTable.
 * Evita html2canvas (PDF en blanco) y prioriza datos de la fila + formulario del modal.
 * Carga jsPDF desde /dist/js/libs (sin CDN) y, si falta, desde jsDelivr.
 */

function getJsPdfCtor() {
    return window.jspdf?.jsPDF || window.jsPDF || null;
}

function pdfLibsReady() {
    const Ctor = getJsPdfCtor();
    if (typeof Ctor !== 'function') return false;
    try {
        const probe = new Ctor();
        return typeof probe.autoTable === 'function';
    } catch (_) {
        return false;
    }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = false;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(src));
        document.head.appendChild(s);
    });
}

async function loadPdfPair(jsUrl, atUrl) {
    await loadScript(jsUrl);
    await loadScript(atUrl);
}

let pdfLibsLoading = null;

/**
 * @returns {Promise<boolean>}
 */
export async function ensureJsPdfAutoTable() {
    const g = window.txt?.generales || {};
    const errPdf = g.err_pdf_lib || 'No se cargó la librería de PDF. Recargue la página.';
    if (pdfLibsReady()) return true;

    if (!pdfLibsLoading) {
        const localJs = new URL('../libs/jspdf/jspdf.umd.min.js', import.meta.url).href;
        const localAt = new URL('../libs/jspdf/jspdf.plugin.autotable.min.js', import.meta.url).href;
        const cdnJs = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
        const cdnAt = 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.1/dist/jspdf.plugin.autotable.min.js';
        pdfLibsLoading = (async () => {
            try {
                await loadPdfPair(localJs, localAt);
            } catch (_) { /* CDN de respaldo */ }
            if (!pdfLibsReady()) {
                await loadPdfPair(cdnJs, cdnAt);
            }
        })().catch((err) => {
            pdfLibsLoading = null;
            throw err;
        });
    }

    try {
        await pdfLibsLoading;
    } catch (_) {
        window.Swal?.fire?.(g.error || 'Error', errPdf, 'error');
        return false;
    }

    if (pdfLibsReady()) return true;
    window.Swal?.fire?.(g.error || 'Error', errPdf, 'error');
    return false;
}

export function pdfPick(...vals) {
    for (const v of vals) {
        const s = String(v ?? '').replace(/\s+/g, ' ').trim();
        if (s && s !== '---' && s !== '—' && s !== '-') return s;
    }
    return '---';
}

export function pdfFmtDate(v) {
    const s = String(v ?? '').trim();
    if (!s) return '---';
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    return s;
}

export function pdfDash(v) {
    const s = String(v ?? '').replace(/\s+/g, ' ').trim();
    return s || '---';
}

export function pdfSelText(root, selector) {
    const s = root?.querySelector?.(selector);
    if (!s || s.tagName !== 'SELECT' || s.selectedIndex < 0) return '';
    return String(s.options[s.selectedIndex]?.text || '').trim();
}

export function pdfNamed(root, name) {
    const el = root?.querySelector?.(`[name="${name}"]`);
    if (!el) return '';
    if (el.tagName === 'SELECT') {
        if (el.selectedIndex < 0) return '';
        return String(el.options[el.selectedIndex]?.text || '').trim();
    }
    return String(el.value ?? '').trim();
}

export function pdfElText(root, selector) {
    const el = root?.querySelector?.(selector);
    return el ? String(el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim() : '';
}

/**
 * @returns {{ doc: object, M: number, pageW: number, right: number, y: number }}
 */
export function startPedidoFichaPdf(title, idPedido) {
    const jsPDF = getJsPdfCtor();
    const doc = new jsPDF();
    const inst = (localStorage.getItem('NombreInst') || sessionStorage.getItem('NombreInst') || 'GROBO').toUpperCase();
    const M = 16;
    const pageW = doc.internal.pageSize.getWidth();
    const right = pageW - M;
    let y = M;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(26, 93, 59);
    doc.text(`GROBO - ${inst}`, pageW / 2, y, { align: 'center' });
    y += 7;
    doc.setFontSize(12);
    doc.setTextColor(50);
    doc.text(String(title || 'Ficha de pedido'), pageW / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(`ID Pedido: ${idPedido}  |  ${new Date().toLocaleString()}`, pageW / 2, y, { align: 'center' });
    y += 4;
    doc.setDrawColor(26, 93, 59);
    doc.line(M, y, right, y);
    y += 8;

    return { doc, M, pageW, right, y, inst };
}

export function pdfKvTable(ctx, body, colW = 36) {
    const { doc, M } = ctx;
    doc.autoTable({
        startY: ctx.y,
        margin: { left: M, right: M },
        body,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2.5, overflow: 'linebreak' },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: colW },
            2: { fontStyle: 'bold', cellWidth: colW },
        },
    });
    ctx.y = doc.lastAutoTable.finalY + 6;
}

export function pdfNoteBlock(ctx, title, text) {
    const { doc, M, right } = ctx;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(26, 93, 59);
    doc.text(String(title), M, ctx.y);
    ctx.y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60);
    const lines = doc.splitTextToSize(text && String(text).trim() ? String(text).trim() : '—', right - M);
    doc.text(lines, M, ctx.y);
    ctx.y += lines.length * 4.4 + 6;
}
