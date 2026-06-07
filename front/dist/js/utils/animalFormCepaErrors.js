/** Mensajes fijos de la API (es) → i18n form_animales (G1). */
export function mapAnimalFormCepaApiError(rawMsg) {
    const fa = window.txt?.form_animales || {};
    const msg = String(rawMsg || '').trim();
    if (!msg) return '';
    const norm = msg.toLowerCase();
    if (norm.includes('debe seleccionar una cepa')) {
        return fa.debe_seleccionar_cepa_texto || msg;
    }
    if (norm.includes('cepa seleccionada no es válida') || norm.includes('cepa seleccionada no es valida')) {
        return fa.err_cepa_invalida_api || msg;
    }
    return msg;
}
