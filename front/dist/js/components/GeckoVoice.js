/**
 * GECKO VOICE CONTROL SYSTEM - Professional Edition 2026
 * Lógica pura. Sin logs de escucha y ruteo inteligente por Rol.
 */

import { GeckoCommands } from './GeckoCommands.js';

export const GeckoVoice = {
    recognition: null,
    isListeningCommand: false,
    currentLang: localStorage.getItem('lang') || 'es',
    lastCommand: "",
    isRestarting: false,
    errorCount: 0,

    // Cache de triggers aplanados (para rendimiento)
    flatTriggers: { search: [], select: [], modify: [] },

    // Logo SVG
    geckoLogoSVG: `<svg viewBox="0 0 24 24" fill="#1a5d3b" style="width:70px; height:70px;"><path d="M12 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm-5.5 3a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zm11 0a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM3.5 11.5a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zm17 0a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM12 11c3 1.5 4 4.5 4 8s-1.5 5-4 5-4-1.5-4-5 1-6.5 4-8z"/></svg>`,

    init() {
        GeckoVoice.injectStyles();
        GeckoVoice.prepareTriggers(); // Pre-procesar idiomas

        // 1. FILTRO DE NAVEGADOR
        const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
        if (isFirefox) {
            // Si intenta activar en Firefox, bloqueo y aviso.
            if (localStorage.getItem('gecko_ok') == 1) {
                localStorage.setItem('gecko_ok', 2);
                GeckoVoice.showUnsupportedBrowserModal();
                
                const btn = document.getElementById('btn-voice-switch');
                if (btn) {
                    btn.classList.remove('voice-status-1');
                    btn.classList.add('voice-status-error');
                    btn.style.color = '#000';
                }
            }
            return false;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return false;

        try {
            if (GeckoVoice.recognition) try { GeckoVoice.recognition.stop(); } catch(e){}

            GeckoVoice.recognition = new SpeechRecognition();
            GeckoVoice.recognition.continuous = true;
            GeckoVoice.recognition.interimResults = true;
            GeckoVoice.recognition.lang = GeckoVoice.getLocale();

            GeckoVoice.recognition.onresult = (event) => GeckoVoice.handleResult(event);
            
            GeckoVoice.recognition.onerror = (event) => {
                if (event.error === 'no-speech') return;
                
                if (event.error === 'network' || event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    GeckoVoice.errorCount++;
                    if (GeckoVoice.errorCount >= 2) {
                        GeckoVoice.stop();
                        localStorage.setItem('gecko_ok', 2);
                        GeckoVoice.showErrorModal(event.error);
                        
                        const btn = document.getElementById('btn-voice-switch');
                        if(btn) btn.classList.replace('voice-status-1', 'voice-status-error');
                    }
                }
            };

            GeckoVoice.recognition.onend = () => {
                if (localStorage.getItem('gecko_ok') == 1 && !GeckoVoice.isRestarting && GeckoVoice.errorCount < 2) {
                    GeckoVoice.isRestarting = true;
                    setTimeout(() => {
                        try { GeckoVoice.recognition.start(); } catch(e) {}
                        GeckoVoice.isRestarting = false;
                    }, 1000);
                }
            };

            GeckoVoice.createUI();
            GeckoVoice.recognition.start();
            // console.log("Gecko Voice: Motor iniciado."); // LOG QUITADO
            return true;
        } catch (e) {
            console.error("Fallo crítico voz.", e);
            return false;
        }
    },

    // Aplanar los triggers de todos los idiomas en un solo array por acción
    prepareTriggers() {
        ['search', 'select', 'modify'].forEach(action => {
            const trigs = GeckoCommands.triggers[action];
            // Unimos arrays de es, en, pt en uno solo
            GeckoVoice.flatTriggers[action] = [...trigs.es, ...trigs.en, ...trigs.pt];
        });
    },

    getLocale() {
        const map = { 'es': 'es-ES', 'en': 'en-US', 'pt': 'pt-BR' };
        return map[GeckoVoice.currentLang] || 'es-ES';
    },

    handleResult(event) {
        let interim = "";
        let final = "";
        GeckoVoice.errorCount = 0; 

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) final += event.results[i][0].transcript.toLowerCase();
            else interim += event.results[i][0].transcript.toLowerCase();
        }

        const textDetected = (final || interim).trim();
        // LOG QUITADO: console.log("🎤 Oído:", textDetected);

        // 1. DETECCIÓN WAKEWORD
        const detectedWake = GeckoCommands.wakewords.find(w => textDetected.includes(w));

        if (detectedWake && !GeckoVoice.isListeningCommand) {
            GeckoVoice.showUI();
            GeckoVoice.isListeningCommand = true;
            return;
        }

        // 2. DETECCIÓN COMANDO
        if (GeckoVoice.isListeningCommand) {
            let command = textDetected;
            GeckoCommands.wakewords.forEach(w => { command = command.replace(w, '').trim(); });

            if (command.length > 1) {
                const box = document.getElementById('gecko-voice-transcript');
                if(box) box.innerText = command;
                
                const btn = document.getElementById('btn-gecko-confirm');
                if(btn) btn.style.display = 'block';
                
                GeckoVoice.lastCommand = command;
            }
        }
    },

    processFinalAction() {
        if (!GeckoVoice.lastCommand) return;
        GeckoVoice.executeAction(GeckoVoice.lastCommand);
    },

    executeAction(input) {
        // A. BUSCADOR GLOBAL (Usa la lista aplanada)
        if (GeckoVoice.flatTriggers.search.some(s => input.startsWith(s))) {
            const query = input.split(' ').slice(1).join(' ');
            GeckoVoice.hideUI();
            const searchInput = document.getElementById('input-search-top');
            if (searchInput) {
                document.getElementById('search-container-top').classList.remove('hidden');
                searchInput.value = query;
                window.executeGlobalSearch('top');
            }
            return;
        }

        // B. SELECCIÓN NUMÉRICA
        if (GeckoVoice.flatTriggers.select.some(s => input.startsWith(s))) {
            const num = input.match(/\d+/);
            if (num) {
                const items = document.querySelectorAll('.search-result-item');
                if (items[num[0]-1]) items[num[0]-1].click();
            }
            GeckoVoice.hideUI();
            return;
        }

        // C. NAVEGACIÓN POR ROL
        const userLevel = parseInt(localStorage.getItem('userLevel')) || 0;
        let routeMap = {};

        // Definición de roles permitidos para Admin
        const adminRoles = [1, 2, 4, 5, 6];

        if (userLevel === 3) {
            routeMap = GeckoCommands.routes.user; // Mapa de Investigador
        } else if (adminRoles.includes(userLevel)) {
            routeMap = GeckoCommands.routes.admin; // Mapa de Admin
        } else {
            // Fallback genérico o vacío
            routeMap = GeckoCommands.routes.admin; 
        }

        for (const [keyword, path] of Object.entries(routeMap)) {
            if (input.includes(keyword)) {
                const id = input.match(/\d+/);
                const isEdit = GeckoVoice.flatTriggers.modify.some(m => input.includes(m));
                
                let url = GeckoVoice.getCorrectPath(path);
                if (id) url += `?id=${id[0]}${isEdit ? '&action=edit' : ''}`;
                
                window.location.href = url;
                return;
            }
        }
        GeckoVoice.hideUI();
    },

    // --- MODALES (NO FIREFOX) ---
    showUnsupportedBrowserModal() {
        GeckoVoice.createUI();
        const overlay = document.getElementById('gecko-voice-overlay');
        overlay.style.display = 'flex';

        const container = document.querySelector('.gecko-voice-content');
        container.innerHTML = `
            <div class="modal-gecko-body text-center">
                <div class="mb-3">${GeckoVoice.geckoLogoSVG}</div>
                <h5 class="text-danger fw-bold">NAVEGADOR NO COMPATIBLE</h5>
                
                <div class="alert alert-light border text-start small mt-4 mb-4" style="background:#fff5f5; color:#555;">
                    <p class="mb-2"><b>Firefox no soporta</b> el motor de procesamiento de voz requerido para esta función.</p>
                    <p class="mb-0">La función se ha desactivado. Por favor inicia sesión en:</p>
                </div>

                <div class="d-flex justify-content-center gap-4 mb-4 grayscale-icons">
                    <div class="text-center">
                        <img src="https://cdnjs.cloudflare.com/ajax/libs/simple-icons/8.8.0/googlechrome.svg" width="30" alt="Chrome">
                        <div class="small mt-1 text-muted" style="font-size:10px">Chrome</div>
                    </div>
                    <div class="text-center">
                        <img src="https://cdnjs.cloudflare.com/ajax/libs/simple-icons/8.8.0/microsoftedge.svg" width="30" alt="Edge">
                        <div class="small mt-1 text-muted" style="font-size:10px">Edge</div>
                    </div>
                </div>

                <button class="btn btn-dark btn-sm px-5 rounded-pill shadow-sm" onclick="window.GeckoVoice.hideUI()">
                    ENTENDIDO
                </button>
            </div>
        `;
        
        const style = document.createElement('style');
        style.innerHTML = `.grayscale-icons img { filter: grayscale(0); }`;
        document.head.appendChild(style);
        const pulse = container.querySelector('.gecko-pulse-ring');
        if(pulse) pulse.style.display = 'none';
    },

    showErrorModal(errorType) {
        GeckoVoice.createUI();
        const overlay = document.getElementById('gecko-voice-overlay');
        overlay.style.display = 'flex';
        
        const uiText = GeckoCommands.ui[GeckoVoice.currentLang] || GeckoCommands.ui.es;
        
        // Mensaje genérico para Chrome/Edge bloqueado
        let stepsHTML = `
            <p class="small mb-3 text-secondary text-center">${uiText.mic_blocked}</p>
            <div class="text-center">
                <img src="https://cdn-icons-png.flaticon.com/512/2983/2983794.png" width="50" style="opacity:0.5;">
            </div>
        `;

        const container = document.querySelector('.gecko-voice-content');
        container.innerHTML = `
            <div class="modal-gecko-body">
                <div class="text-center mb-3">${GeckoVoice.geckoLogoSVG}</div>
                <h5 class="text-danger fw-bold text-center">ERROR</h5>
                <div class="steps-container mt-4">${stepsHTML}</div>
                <div class="text-center mt-4">
                    <button class="btn btn-outline-secondary btn-sm px-5 rounded-pill" onclick="window.GeckoVoice.hideUI()">Cerrar</button>
                </div>
            </div>
        `;
        const pulse = container.querySelector('.gecko-pulse-ring');
        if(pulse) pulse.style.display = 'none';
    },

    // --- UI HELPERS ---
    createUI() {
        if (document.getElementById('gecko-voice-overlay')) return;
        const uiText = GeckoCommands.ui[GeckoVoice.currentLang] || GeckoCommands.ui.es;
        const overlay = document.createElement('div');
        overlay.id = 'gecko-voice-overlay';
        overlay.innerHTML = `
            <div class="gecko-voice-content">
                <div class="gecko-pulse-ring"></div>
                <div class="mb-4">${GeckoVoice.geckoLogoSVG}</div>
                <h2 class="text-success fw-bold m-0">GECKO VOICE</h2>
                <p id="gecko-voice-status" class="text-uppercase small text-muted mt-2 tracking-widest">Escuchando...</p>
                <div id="gecko-voice-transcript" class="transcript-box">...</div>
                <div class="d-flex gap-3 w-100 justify-content-center mt-3">
                    <button class="btn btn-outline-secondary px-4 rounded-pill" onclick="GeckoVoice.resetCommand()">${uiText.retry}</button>
                    <button class="btn btn-success px-5 fw-bold rounded-pill shadow" id="btn-gecko-confirm" onclick="GeckoVoice.processFinalAction()" style="display:none;">${uiText.confirm}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    showUI() {
        const el = document.getElementById('gecko-voice-overlay');
        if (el) {
            el.style.display = 'flex';
            document.getElementById('gecko-voice-transcript').innerText = '...';
            document.getElementById('btn-gecko-confirm').style.display = 'none';
        }
    },

    hideUI() {
        const el = document.getElementById('gecko-voice-overlay');
        if (el) el.style.display = 'none';
        GeckoVoice.isListeningCommand = false;
        setTimeout(() => { if(document.querySelector('.modal-gecko-body')) el.remove(); }, 300);
    },

    resetCommand() {
        const box = document.getElementById('gecko-voice-transcript');
        if(box) box.innerText = '...';
        GeckoVoice.lastCommand = "";
    },

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => { alert("Copiado"); });
    },

    getCorrectPath(path) {
        const idx = window.location.pathname.indexOf('/paginas/');
        return idx !== -1 ? window.location.pathname.substring(0, idx + 9) + path : path;
    },

    injectStyles() {
        if (document.getElementById('gecko-voice-styles')) return;
        const style = document.createElement('style');
        style.id = 'gecko-voice-styles';
        style.innerHTML = `
            #gecko-voice-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); z-index: 10000; display: none; align-items: center; justify-content: center; }
            .gecko-voice-content { background: white; width: 90%; max-width: 550px; min-height: auto; border-radius: 30px; border: 2px solid #1a5d3b; padding: 2.5rem; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-shadow: 0 25px 50px rgba(0,0,0,0.5); }
            .transcript-box { font-size: 2rem; color: #1a5d3b; margin: 1.5rem 0; min-height: 3rem; word-wrap: break-word; }
            .gecko-pulse-ring { width: 100px; height: 100px; border-radius: 50%; border: 3px solid #1a5d3b; position: absolute; top: 10%; animation: geckoRipple 1.5s infinite ease-out; }
            @keyframes geckoRipple { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(1.8); opacity: 0; } }
        `;
        document.head.appendChild(style);
    },

    stop() {
        if (GeckoVoice.recognition) {
            try { GeckoVoice.recognition.stop(); } catch(e){}
        }
        GeckoVoice.hideUI();
    }
};