/**
 * Usuarios sin apellido/nombre usable o con apellido/nombre que empieza por "." o ","
 * van al final de la lista (registro, historial, etc.).
 */
function __usuarioNombreAlFinal(u) {
    const ap = String(u?.ApellidoA ?? '').trim();
    const nom = String(u?.NombreA ?? '').trim();
    if (!ap || !nom) return true;
    const malInicio = (s) => /^[.,]/.test(s);
    return malInicio(ap) || malInicio(nom);
}

/**
 * Lista de usuarios de la institución: orden por apellido y texto "Apellido, Nombre".
 */
export function sortUsersByApellidoNombre(users) {
    return [...(users || [])].sort((a, b) => {
        const fa = __usuarioNombreAlFinal(a);
        const fb = __usuarioNombreAlFinal(b);
        if (fa !== fb) return fa ? 1 : -1;
        const cmpAp = String(a.ApellidoA || '').localeCompare(String(b.ApellidoA || ''), 'es', { sensitivity: 'base' });
        if (cmpAp !== 0) return cmpAp;
        return String(a.NombreA || '').localeCompare(String(b.NombreA || ''), 'es', { sensitivity: 'base' });
    });
}

export function formatUsuarioApellidoNombre(u) {
    const nom = (u.NombreA || '').trim();
    const ap = (u.ApellidoA || '').trim();
    if (ap && nom) return `${ap}, ${nom}`;
    return ap || nom || '';
}

export function escListText(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
