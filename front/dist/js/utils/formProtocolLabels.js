/**
 * Etiqueta de opción de protocolo en modales admin (incluye derivados desde otra sede).
 * @param {{ nprotA?: string, tituloA?: string, es_protocolo_derivado?: number|string, derivacion_inst_origen?: string }} p
 */
/** Si el protocolo actual no está en el combo (otro CEUA, vencido, sin cupo), lo agrega para poder mostrarlo y cambiarlo. */
export function withCurrentProtocolOption(list, currentId, extra = {}) {
    const lista = Array.isArray(list) ? [...list] : [];
    const id = currentId != null && String(currentId).trim() !== '' && String(currentId) !== '0' ? currentId : null;
    if (!id) return lista;
    if (lista.some((p) => String(p.idprotA) === String(id))) return lista;
    lista.unshift({
        idprotA: id,
        nprotA: extra.nprotA || extra.NProtocolo || id,
        tituloA: extra.tituloA || extra.TituloProtocolo || '',
        Investigador: extra.Investigador || '',
        protocoloexpe: extra.protocoloexpe,
        es_protocolo_derivado: extra.es_protocolo_derivado,
        derivacion_inst_origen: extra.derivacion_inst_origen,
    });
    return lista;
}

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
