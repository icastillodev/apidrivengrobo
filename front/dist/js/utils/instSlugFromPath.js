/**
 * Resuelve el slug de institución desde la URL del login (con o sin barra final, ?inst=, /front/{slug}/, etc.).
 */
const RESERVED = new Set([
    'dist', 'assets', 'resources', 'paginas', 'front', 'api', 'core-backend-gem',
    'panel', 'admin', 'superadmin', 'usuario', 'urbe-api-driven', 'index.html'
]);

export function extractInstitutionSlugFromPath(pathname, search) {
    const instQ = new URLSearchParams(search || '').get('inst');
    if (instQ) {
        const s = decodeURIComponent(String(instQ).trim()).replace(/\/+$/, '').toLowerCase();
        if (s && !RESERVED.has(s)) return s;
    }

    let path = String(pathname || '').trim();
    path = path.replace(/\/+/g, '/').replace(/\/+$/, '');
    if (!path || path === '/') return '';

    const m = path.match(/\/front\/([a-zA-Z0-9_-]+)$/i);
    if (m && m[1]) {
        const slug = m[1].toLowerCase();
        if (!RESERVED.has(slug)) return slug;
    }

    const parts = path.split('/').filter((p) => p && p.toLowerCase() !== 'index.html');
    const frontIdx = parts.findIndex((p) => p.toLowerCase() === 'front');
    if (frontIdx !== -1 && parts[frontIdx + 1]) {
        const slug = parts[frontIdx + 1].toLowerCase();
        if (!RESERVED.has(slug)) return slug;
    }

    if (parts.length === 1) {
        const slug = parts[0].toLowerCase();
        if (!RESERVED.has(slug)) return slug;
    }

    if (parts.length > 0) {
        const slug = parts[0].toLowerCase();
        if (!RESERVED.has(slug)) return slug;
    }

    return '';
}
