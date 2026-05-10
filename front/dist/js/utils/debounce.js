/**
 * Ejecuta `fn` tras `waitMs` milisegundos sin nuevas invocaciones.
 * Útil para búsquedas en vivo sin saturar el hilo principal (véase CHECKLIST-OPTIMIZACION-TABLAS-CARGAS §2).
 *
 * @template {(...args: any[]) => void} F
 * @param {F} fn
 * @param {number} waitMs
 * @returns {F & { cancel: () => void }}
 */
export function debounce(fn, waitMs) {
    let t = null;
    function wrapped(...args) {
        clearTimeout(t);
        t = setTimeout(() => {
            t = null;
            fn.apply(this, args);
        }, waitMs);
    }
    wrapped.cancel = () => {
        if (t != null) clearTimeout(t);
        t = null;
    };
    return wrapped;
}
