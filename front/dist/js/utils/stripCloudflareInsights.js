/**
 * Quita el beacon de Cloudflare Web Analytics (static.cloudflareinsights.com)
 * si el HTML lo inyecta en el edge. Evita ruido CORS/SRI en consola.
 * Idempotente: solo registra un MutationObserver la primera vez.
 */
(function initStripCloudflareInsights() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (window.__groboStripCfInsights) return;
    window.__groboStripCfInsights = true;

    const re = /static\.cloudflareinsights\.com/;
    const kill = (n) => {
        if (!n || n.nodeType !== 1) return;
        if (n.tagName === 'SCRIPT' && re.test(String(n.src || ''))) {
            try {
                n.remove();
            } catch (e) { /* ignore */ }
        }
    };

    try {
        document.querySelectorAll('script[src]').forEach(kill);
        if (typeof MutationObserver !== 'undefined') {
            new MutationObserver((muts) => {
                muts.forEach((m) => m.addedNodes.forEach(kill));
            }).observe(document.documentElement, { childList: true, subtree: true });
        }
    } catch (e) { /* ignore */ }
})();
