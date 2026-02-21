import { API } from '../api.js';
import { GeckoSearch } from './GeckoSearch.js';
import { NotificationManager } from '../NotificationManager.js';

export const GeckoAiDispatcher = {
    async sendCommand(promptText) {
        GeckoSearch.setInput(promptText); // Feedback visual
        
        try {
            const response = await API.request('/ia/procesar', 'POST', { prompt: promptText });
            
            if (response.status === 'success') {
                this.executeAction(response.data);
            } else {
                NotificationManager.error(response.message);
            }
        } catch (error) {
            console.error("Error GROBO IA", error);
        }
    },

    executeAction(aiJson) {
        // 1. OBLIGATORIO: Mostrar/Hablar el texto de respuesta de la IA
        if (aiJson.mensaje_texto) {
            this.speak(aiJson.mensaje_texto); // Lo dice en voz alta
            // También lo mostramos en el buscador para que se lea
            GeckoSearch.setAiMessage(aiJson.mensaje_texto); 
        }

        // 2. Ejecutar la acción técnica
        switch (aiJson.action_type) {
            case 'navegacion':
                setTimeout(() => window.location.href = aiJson.data.url, 1500);
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
                // Si la IA manda resultados de DB para renderizar
                GeckoSearch.renderResults(aiJson.data.resultados);
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