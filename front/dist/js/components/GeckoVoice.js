import { GeckoCommands } from './GeckoCommands.js';
import { GeckoSearch } from './GeckoSearch.js'; 

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

        // 1. WAKEWORD "Gecko"
        const detectedWake = GeckoCommands.wakewords.find(w => textDetected.includes(w));
        if (detectedWake && !this.isListeningCommand) {
            this.startListening();
            return;
        }

        // 2. COMANDO
        if (this.isListeningCommand) {
            let command = textDetected;
            GeckoCommands.wakewords.forEach(w => { command = command.replace(w, '').trim(); });
            
            if (command.length > 0) {
                // CONTEXTO: ¿Estamos en un modal o en el buscador?
                const activeModal = document.querySelector('.modal.show');

                if (activeModal) {
                    // --- MODO RELLENADO DE FORMULARIO ---
                    if (final.length > 0) {
                        // Buscar input activo o textarea
                        const activeInput = activeModal.querySelector('input:focus, textarea:focus') || activeModal.querySelector('input[type="text"], textarea');
                        if (activeInput) {
                            activeInput.value = command; // Rellenar
                            // Disparar evento input para validaciones
                            activeInput.dispatchEvent(new Event('input', { bubbles: true }));
                            this.stop();
                        }
                    }
                } else {
                    // --- MODO BUSCADOR GLOBAL ---
                    GeckoSearch.setInput(command); 
                    if (final.length > 0) {
                        this.stop(); 
                    }
                }
            }
        }
    },

    executeAction(input) {
        console.log("Enviando a IA:", input);
        // ... llamada a API de IA ...
    },

    showUnsupportedBrowserModal() { 
        alert("Navegador no compatible."); 
    }
};