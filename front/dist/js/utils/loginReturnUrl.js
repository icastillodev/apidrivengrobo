/**
 * URL de retorno para ?next= / redirectAfterLogin cuando el usuario
 * estaba en una pantalla con enlace profundo (hilo de mensajes, etc.).
 */
export function getPreservableAppReturnHref() {
    try {
        const path = window.location.pathname.toLowerCase();
        if (!path.includes('/paginas/')) return '';
        const sp = new URLSearchParams(window.location.search);
        const keys = ['hilo', 'msgnuevo', 'asunto', 'origen', 'instid', 'form', 'idform', 'historia', 'token', 'alcance', 'id'];
        if (path.includes('poe.html') && sp.has('id')) {
            return window.location.origin + window.location.pathname + window.location.search + window.location.hash;
        }
        for (let i = 0; i < keys.length; i++) {
            if (sp.has(keys[i])) {
                return window.location.origin + window.location.pathname + window.location.search + window.location.hash;
            }
        }
    } catch (_) {
        /* ignore */
    }
    return '';
}
