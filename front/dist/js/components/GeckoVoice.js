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

        // 1. WAKEWORD "Gecko" (Despertar)
        const detectedWake = GeckoCommands.wakewords.find(w => textDetected.includes(w));
        if (detectedWake && !this.isListeningCommand) {
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
                
                // Apagamos el micrófono
                this.stop(); 
                
                // 🚀 ENVIAMOS EL TEXTO A LA IA (El Dispatcher)
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

    showUnsupportedBrowserModal() { 
        alert("Navegador no compatible."); 
    }
};