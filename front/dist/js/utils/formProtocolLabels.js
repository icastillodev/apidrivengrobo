/**
 * Etiqueta de opción de protocolo en modales admin (incluye derivados desde otra sede).
 * @param {{ nprotA?: string, tituloA?: string, es_protocolo_derivado?: number|string, derivacion_inst_origen?: string }} p
 */
export function formatAdminProtocolOptionLabel(p) {
    const nprot = String(p?.nprotA ?? '').trim();
    const titulo = String(p?.tituloA ?? '').trim();
    const base = titulo ? `${nprot} - ${titulo}` : nprot;
    if (Number(p?.es_protocolo_derivado) !== 1) {
        return base;
    }
    const orig = String(p?.derivacion_inst_origen ?? '').trim();
    const prefix = window.txt?.form_animales?.protocolo_derivado_de || 'derivado —';
    return orig ? `${base} (${prefix} ${orig})` : `${base} (${prefix})`;
}
