/** UI compartida: campo texto largo compacto + modal editor enriquecido (Quill). */

let quillLoadPromise = null;
let activeQuill = null;

function escHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escJsStr(s) {
    return String(s ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r?\n/g, '\\n');
}

export function sanitizeRichHtml(html) {
    const wrap = document.createElement('div');
    wrap.innerHTML = String(html ?? '');
    wrap.querySelectorAll('script, iframe, object, embed, form').forEach((n) => n.remove());
    return wrap.innerHTML;
}

function looksLikeHtml(value) {
    const s = String(value ?? '').trim();
    return s.includes('<') && s.includes('>');
}

function loadQuillAssets() {
    if (typeof window !== 'undefined' && window.Quill) {
        return Promise.resolve();
    }
    if (quillLoadPromise) return quillLoadPromise;
    quillLoadPromise = new Promise((resolve, reject) => {
        if (!document.querySelector('link[data-traz-quill-css]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.snow.css';
            link.setAttribute('data-traz-quill-css', '1');
            document.head.appendChild(link);
        }
        if (document.querySelector('script[data-traz-quill-js]')) {
            const wait = setInterval(() => {
                if (window.Quill) {
                    clearInterval(wait);
                    resolve();
                }
            }, 40);
            setTimeout(() => {
                clearInterval(wait);
                if (window.Quill) resolve();
                else reject(new Error('Quill timeout'));
            }, 8000);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.js';
        script.setAttribute('data-traz-quill-js', '1');
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Quill load failed'));
        document.head.appendChild(script);
    });
    return quillLoadPromise;
}

/**
 * Textarea compacto (~2 líneas) + botón + verde para abrir editor amplio.
 */
export function htmlTextoLargoCompactControl(opts = {}) {
    const txt = window.txt?.alojamientos || {};
    const id = String(opts.id || '');
    const name = String(opts.name || id);
    const value = opts.value != null ? String(opts.value) : '';
    const inputClass = String(opts.inputClass || 'form-control form-control-sm border-secondary').replace(' mb-2', '');
    const label = opts.label != null ? String(opts.label) : '';
    const expandTitle = escHtml(txt.trace_texto_largo_expand_title || 'Ampliar texto');
    return `<div class="d-flex align-items-start gap-1 mb-2 traz-texto-largo-wrap">
        <textarea name="${escHtml(name)}" id="${escHtml(id)}" class="${escHtml(inputClass)}" rows="2" style="resize:vertical;min-height:2.6rem;max-width:min(220px,42vw)">${escHtml(value)}</textarea>
        <button type="button" class="btn btn-success btn-sm px-2 py-1 flex-shrink-0 shadow-sm" title="${expandTitle}" aria-label="${expandTitle}" onclick="window.__ubExpandTextoLargo('${escJsStr(id)}', '${escJsStr(label)}')"><i class="bi bi-plus-lg"></i></button>
    </div>`;
}

/**
 * Modal amplio con Quill (negrita, color, enlaces, listas). Al aceptar copia HTML al campo origen.
 */
export async function openTextoLargoExpand(fieldId, fieldLabel) {
    const el = document.getElementById(String(fieldId || ''));
    if (!el) return;

    const txt = window.txt?.alojamientos || {};
    const gen = window.txt?.generales || {};
    const hint = txt.trace_texto_largo_modal_hint
        || 'Al aceptar, el texto se copia al campo compacto. Debe guardar el formulario para que quede registrado.';
    const title = (fieldLabel && String(fieldLabel).trim())
        ? String(fieldLabel).trim()
        : (txt.trace_texto_largo_titulo || 'Texto largo');
    const initial = el.value ?? '';
    const target = document.getElementById('modal-historial') || 'body';

    try {
        await loadQuillAssets();
    } catch (_) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'warning', text: txt.trace_texto_largo_editor_err || 'No se pudo cargar el editor de texto.' });
        }
        return;
    }

    const { isConfirmed, value } = await Swal.fire({
        title,
        target,
        width: 'min(820px, 94vw)',
        html: `<p class="small text-muted text-start mb-2">${escHtml(hint)}</p>
            <div id="swal-traz-quill-wrap" class="swal-traz-quill-wrap text-start border rounded bg-white">
                <div id="swal-traz-quill-editor" style="min-height:300px"></div>
            </div>`,
        showCancelButton: true,
        confirmButtonText: txt.trace_texto_largo_ok || gen.aceptar || 'Aceptar',
        cancelButtonText: gen.cancelar || 'Cancelar',
        focusConfirm: false,
        didOpen: () => {
            activeQuill = null;
            const host = document.getElementById('swal-traz-quill-editor');
            if (!host || !window.Quill) return;
            activeQuill = new window.Quill(host, {
                theme: 'snow',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ color: [] }, { background: [] }],
                        [{ list: 'ordered' }, { list: 'bullet' }],
                        ['link'],
                        ['clean'],
                    ],
                },
            });
            if (looksLikeHtml(initial)) {
                activeQuill.clipboard.dangerouslyPasteHTML(sanitizeRichHtml(initial));
            } else if (initial) {
                activeQuill.setText(initial);
            }
            activeQuill.focus({ preventScroll: true });
        },
        willClose: () => {
            activeQuill = null;
        },
        preConfirm: () => {
            if (!activeQuill) return '';
            const plain = activeQuill.getText().trim();
            if (!plain) return '';
            return sanitizeRichHtml(activeQuill.root.innerHTML);
        },
    });

    if (isConfirmed) {
        el.value = value ?? '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

export function bindExpandTextoLargoGlobal() {
    if (typeof window !== 'undefined') {
        window.__ubExpandTextoLargo = openTextoLargoExpand;
    }
}

bindExpandTextoLargoGlobal();
