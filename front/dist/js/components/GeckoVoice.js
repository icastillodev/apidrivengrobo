import { GeckoCommands } from './GeckoCommands.js';
import { GeckoSearch } from './GeckoSearch.js';

function transcriptHasWakeWord(text) {
    const norm = String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    const tokens = norm.split(/[^a-z0-9]+/).filter(Boolean);
    const set = new Set(tokens);
    const pad = ` ${tokens.join(' ')} `;
    return GeckoCommands.wakewords.some((w) => {
        const ww = String(w)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
        if (ww.length <= 3) {
            return set.has(ww);
        }
        if (set.has(ww)) return true;
        return tokens.some((t) => t.startsWith(ww) || t.includes(ww)) || pad.includes(` ${ww} `);
    });
}

export const GeckoVoice = {
    recognition: null,
    isListeningCommand: false,
    currentLang: localStorage.getItem('lang') || 'es',
    errorCount: 0,

    init() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return false;

        try {
            if (this.recognition) try { this.recognition.stop(); } catch(e){}

            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = this.getLocale();

            this.recognition.onresult = (event) => this.handleResult(event);
            this.recognition.start();
            return true;
        } catch (e) { return false; }
    },

    getLocale() {
        const map = { 'es': 'es-ES', 'en': 'en-US', 'pt': 'pt-BR' };
        return map[this.currentLang] || 'es-ES';
    },

    startListening() {
        if (this.recognition) {
            try { this.recognition.start(); } catch(e){}
            this.isListeningCommand = true;
            
            // CHECK CONTEXTO: ¿HAY UN MODAL DE BOOTSTRAP ABIERTO?
            const activeModal = document.querySelector('.modal.show');
            
            if (!activeModal) {
                // SOLO si NO hay modal, abrimos el buscador
                GeckoSearch.open(); 
                GeckoSearch.setListening(true);
            } else {
                // Si HAY modal, damos feedback visual en el modal si es posible
                console.log("🎤 Voz activa en contexto MODAL");
                // Aquí podrías agregar un borde rojo al input activo o un indicador
            }
        }
    },

    stop() {
        if (this.recognition) try{this.recognition.stop();}catch(e){}
        this.isListeningCommand = false;
        GeckoSearch.setListening(false);
    },

handleResult(event) {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) final += event.results[i][0].transcript.toLowerCase();
            else interim += event.results[i][0].transcript.toLowerCase();
        }

        const textDetected = (final || interim).trim();

        // 1. Palabra de activación (Gecko / Grobo y fonéticas)
        if (transcriptHasWakeWord(textDetected) && !this.isListeningCommand) {
            this.startListening();
            return;
        }

        // 2. PROCESAR COMANDO FINAL
        if (this.isListeningCommand) {
            let command = textDetected;
            GeckoCommands.wakewords.forEach(w => { command = command.replace(w, '').trim(); });
            
            // Mostrar lo que va escuchando en el buscador (feedback visual)
            GeckoSearch.setInput(command); 

            // CUANDO EL USUARIO TERMINA DE HABLAR (isFinal)
            if (final.length > 0 && command.length > 0) {
                console.log("🎤 Frase final capturada:", command);

                this.stop();

                if (this.tryHandleLocalVoiceCommand(command)) {
                    return;
                }

                import('./GeckoAiDispatcher.js').then(module => {
                    module.GeckoAiDispatcher.sendCommand(command);
                }).catch(err => console.error("Error cargando Dispatcher:", err));
            }
        }
    },

    executeAction(input) {
        console.log("Enviando a IA:", input);
        // ... llamada a API de IA ...
    },

    /**
     * Comandos de voz sin llamar a la API (cerrar, siguiente, guardar…).
     * @returns {boolean} true si ya se manejó el comando
     */
    tryHandleLocalVoiceCommand(command) {
        const raw = String(command || '')
            .replace(/[.,;:!?¿¡]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
        if (!raw) return false;

        const modal = document.querySelector('.modal.show');

        if (/^(cerrar|cierra|cerrá|salir|close|fechar|sair|cancelar)$/i.test(raw)) {
            if (modal) {
                const dismiss = modal.querySelector('[data-bs-dismiss="modal"], .btn-close');
                if (dismiss) {
                    dismiss.click();
                    GeckoSearch.close();
                    return true;
                }
            }
            GeckoSearch.close();
            return true;
        }

        if (/^(siguiente|próximo|proximo|next|continuar|continua|adelante|avançar)$/i.test(raw)) {
            if (modal) {
                const buttons = [...modal.querySelectorAll('button.btn-primary, button.btn-success, button.btn-info, a.btn-primary')];
                const nextBtn = buttons.find(
                    (b) =>
                        !b.disabled &&
                        /siguiente|next|próximo|proximo|continu|avançar|continuar|pr[oó]ximo/i.test(b.textContent || '')
                );
                if (nextBtn) {
                    nextBtn.click();
                    return true;
                }
                const activeTab = modal.querySelector('.nav-tabs .nav-link.active');
                const sibling = activeTab && activeTab.nextElementSibling;
                if (sibling && sibling.classList.contains('nav-link')) {
                    sibling.click();
                    return true;
                }
            }
            return false;
        }

        if (
            /^(finalizar|terminar|guardar|enviar|listo|hecho|ok|aplicar|confirmar|save|submit|salvar|concluir)$/i.test(
                raw
            )
        ) {
            if (modal) {
                const candidates = [...modal.querySelectorAll('button')];
                const pick = candidates.find(
                    (b) =>
                        !b.disabled &&
                        /guardar|enviar|aceptar|confirmar|finalizar|aplicar|salvar|save|submit|ok|listo|hecho|concluir/i.test(
                            b.textContent || ''
                        ) &&
                        !b.matches('[data-bs-dismiss="modal"]') &&
                        !b.matches('.btn-close')
                );
                if (pick) {
                    pick.click();
                    return true;
                }
                const sub = modal.querySelector('button[type="submit"]:not([disabled])');
                if (sub) {
                    sub.click();
                    return true;
                }
            }
            return false;
        }

        return false;
    },

    showUnsupportedBrowserModal() {
        const t = window.txt?.gecko_ai;
        const title = t?.voice_firefox_title || window.txt?.generales?.error;
        const text = t?.voice_firefox_text || 'Navegador no compatible.';
        if (typeof Swal !== 'undefined') {
            Swal.fire({ title: title || 'GROBO', text, icon: 'info' });
        } else if (window.Swal) {
            window.Swal.fire({ title: title || 'GROBO', text, icon: 'info' });
        } else {
            alert(text);
        }
    },

    /** @param {'no-api'|'not-allowed'} reason */
    showErrorModal(reason) {
        const t = window.txt?.gecko_ai;
        const title = window.txt?.generales?.error || 'Error';
        const text =
            reason === 'no-api'
                ? (t?.voice_no_api_text || t?.voice_mic_denied_text)
                : t?.voice_mic_denied_text;
        const finalText =
            text ||
            (reason === 'no-api'
                ? 'Su navegador no admite reconocimiento de voz.'
                : 'No se pudo usar el micrófono. Revise los permisos del sitio.');
        if (typeof Swal !== 'undefined') {
            Swal.fire({ title, text: finalText, icon: 'warning' });
        } else if (window.Swal) {
            window.Swal.fire({ title, text: finalText, icon: 'warning' });
        } else {
            alert(finalText);
        }
    }
};