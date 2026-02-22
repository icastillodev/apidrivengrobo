import { API } from '../api.js';
import { GeckoSearch } from './GeckoSearch.js';

export const GeckoAiDispatcher = {
    async sendCommand(promptText) {
        GeckoSearch.setInput(promptText); 
        
        // Armamos el payload con la información de sesión para la IA
        const payload = {
            prompt: promptText,
            inst: localStorage.getItem('instId'),
            uid: localStorage.getItem('userId'),
            role: localStorage.getItem('userLevel')
        };

        try {
            const response = await API.request('/ia/procesar', 'POST', payload);
            
            if (response.status === 'success') {
                this.executeAction(response.data);
            } else {
                // CORRECCIÓN: Buscamos Swal globalmente, si no existe, usamos el alert nativo
                if (typeof Swal !== 'undefined') {
                    Swal.fire('Error de IA', response.message, 'error');
                } else if (window.Swal) {
                    window.Swal.fire('Error de IA', response.message, 'error');
                } else {
                    alert('Error de IA: ' + response.message);
                }
                GeckoSearch.renderEmpty();
            }
        } catch (error) {
            console.error("Error GROBO IA", error);
            GeckoSearch.renderEmpty();
        }
    },

    executeAction(aiJson) {
        if (aiJson.mensaje_texto) {
            this.speak(aiJson.mensaje_texto); 
            GeckoSearch.setAiMessage(aiJson.mensaje_texto); 
        }

        switch (aiJson.action_type) {
            case 'navegacion':
                const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/';
                setTimeout(() => window.location.href = `${basePath}${aiJson.data.url}`, 1500);
                break;
            case 'comando_dom':
                if (aiJson.data.campos) {
                    aiJson.data.campos.forEach(campo => {
                        const inputEl = document.getElementById(campo.id_html);
                        if (inputEl) {
                            inputEl.value = campo.valor;
                            inputEl.dispatchEvent(new Event('input', { bubbles: true })); 
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