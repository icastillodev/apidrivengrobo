/** CantidadCaja = 0: pausa (stand by), no cierra la estadía. */
export function isStandByTramo(h) {
    return (parseInt(h?.CantidadCaja ?? 0, 10) || 0) === 0;
}

/**
 * Finalizado solo mira el último tramo. Un flag viejo en un tramo cerrado
 * no debe bloquear stand by ni "Actualizar estadía".
 */
export function isHistoriaFinalizada(history) {
    if (!Array.isArray(history) || history.length === 0) return false;
    const last = history[history.length - 1];
    return last.finalizado == 1 || last.finalizado === '1';
}
