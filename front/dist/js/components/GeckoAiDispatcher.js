import { API } from '../api.js';
import { GeckoSearch } from './GeckoSearch.js';

const MAX_IA_PROMPT_CHARS = 2000;

function frontBasePath() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? '/URBE-API-DRIVEN/front/'
        : '/';
}

/** Asegura prefijo paginas/ para rutas internas GROBO. */
function normalizeInternalAppUrl(url) {
    if (!url || typeof url !== 'string') return url;
    const u = url.trim().replace(/^\/+/, '');
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith('paginas/')) return u;
    return `paginas/${u}`;
}

export const GeckoAiDispatcher = {
    async sendCommand(promptText) {
        const prompt = String(promptText ?? '').trim();
        const promptLen = [...prompt].length;
        if (promptLen > MAX_IA_PROMPT_CHARS) {
            const t = window.txt?.gecko_ai;
            const title = t?.prompt_too_long_title || t?.error_swal_title;
            const text = t?.prompt_too_long_text || 'Text too long.';
            if (typeof Swal !== 'undefined') {
                Swal.fire(title || 'GROBO', text, 'warning');
            } else if (window.Swal) {
                window.Swal.fire(title || 'GROBO', text, 'warning');
            } else {
                alert(text);
            }
            GeckoSearch.renderEmpty();
            return;
        }

        GeckoSearch.setInput(prompt);

        // Armamos el payload con la información de sesión para la IA
        const payload = {
            prompt,
            inst: localStorage.getItem('instId'),
            uid: localStorage.getItem('userId'),
            role: localStorage.getItem('userLevel')
        };

        try {
            const response = await API.request('/ia/procesar', 'POST', payload);

            if (response.status === 'success') {
                this.executeAction(response.data);
            } else {
                const errTitle = window.txt?.gecko_ai?.error_swal_title || 'Error de IA';
                let body = response.message;
                if (response.error_code === 'ia_forbidden_role') {
                    body = window.txt?.gecko_ai?.error_role_denied || body;
                }
                if (!body) {
                    body = window.txt?.gecko_ai?.error_generic_body || '—';
                }
                if (typeof Swal !== 'undefined') {
                    Swal.fire(errTitle, body, 'error');
                } else if (window.Swal) {
                    window.Swal.fire(errTitle, body, 'error');
                } else {
                    alert(`${errTitle}: ${body}`);
                }
                GeckoSearch.renderEmpty();
            }
        } catch (error) {
            console.error("Error GROBO IA", error);
            GeckoSearch.renderEmpty();
        }
    },

    executeAction(aiJson) {
        const msg = String(aiJson.mensaje_texto || '').trim();
        if (msg) {
            this.speak(msg);
            GeckoSearch.setAiMessage(msg);
        }

        switch (aiJson.action_type) {
            case 'navegacion': {
                const basePath = frontBasePath();
                const rel = normalizeInternalAppUrl(aiJson.data?.url || '');
                if (rel) {
                    setTimeout(() => {
                        window.location.href = `${basePath}${rel}`;
                    }, 900);
                }
                break;
            }
            case 'ayuda_manual': {
                const slug = (aiJson.data && aiJson.data.slug) ? String(aiJson.data.slug).trim() : 'panel__capacitacion';
                const basePath = frontBasePath();
                const hash = `t=${encodeURIComponent(slug)}`;
                setTimeout(() => {
                    window.location.href = `${basePath}paginas/panel/capacitacion.html#${hash}`;
                }, 900);
                break;
            }
            case 'comando_dom':
                if (aiJson.data.campos) {
                    aiJson.data.campos.forEach(campo => {
                        const inputEl = document.getElementById(campo.id_html);
                        if (inputEl) {
                            inputEl.value = campo.valor;
                            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                            inputEl.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });
                }
                if (aiJson.data.ejecutar_click) {
                    const btn = document.getElementById(aiJson.data.ejecutar_click);
                    if (btn) btn.click();
                }
                break;
            case 'busqueda':
                if (aiJson.data && aiJson.data.resultados) {
                    // Extraemos la palabra que la IA decidió buscar
                    const terminoBuscado = aiJson.data.search_params ? aiJson.data.search_params.term : "Búsqueda IA";
                    GeckoSearch.renderResults(aiJson.data.resultados, terminoBuscado);
                }
                break;
        }
    },

    speak(text) {
        const synth = window.speechSynthesis;
        const utterThis = new SpeechSynthesisUtterance(text);
        utterThis.lang = localStorage.getItem('lang') === 'en' ? 'en-US' : 
                         localStorage.getItem('lang') === 'pt' ? 'pt-BR' : 'es-ES';
        synth.speak(utterThis);
    }
};