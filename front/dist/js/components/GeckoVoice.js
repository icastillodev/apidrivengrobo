/**
 * GECKO VOICE CONTROL SYSTEM - Professional Edition 2026
 * Lógica pura. Sin complicaciones de UI innecesarias.
 */

import { GeckoCommands } from './GeckoCommands.js';

export const GeckoVoice = {
    recognition: null,
    isListeningCommand: false,
    currentLang: localStorage.getItem('lang') || 'es',
    lastCommand: "",
    isRestarting: false,
    errorCount: 0,
    flatTriggers: { search: [], select: [], modify: [] },

    geckoLogoSVG: `<svg viewBox="0 0 24 24" fill="#1a5d3b" style="width:70px; height:70px;"><path d="M12 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm-5.5 3a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zm11 0a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM3.5 11.5a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zm17 0a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM12 11c3 1.5 4 4.5 4 8s-1.5 5-4 5-4-1.5-4-5 1-6.5 4-8z"/></svg>`,

    init() {
        GeckoVoice.injectStyles();
        GeckoVoice.prepareTriggers();

        const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
        if (isFirefox) {
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
            return true;
        } catch (e) { return false; }
    },

    prepareTriggers() {
        ['search', 'select', 'modify'].forEach(action => {
            const trigs = GeckoCommands.triggers[action];
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

        // 1. WAKEWORD
        const detectedWake = GeckoCommands.wakewords.find(w => textDetected.includes(w));
        if (detectedWake && !GeckoVoice.isListeningCommand) {
            GeckoVoice.showUI();
            GeckoVoice.isListeningCommand = true;
            return;
        }

        // 2. COMANDO
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

async executeAction(input) {
        console.log("🦎 GeckoVoice: Consultando a NeMo...", input);
        
        // 1. Mostrar estado "Pensando" en la UI
        const statusEl = document.getElementById('gecko-voice-status');
        if(statusEl) statusEl.innerText = "Procesando...";

        try {
            // 2. Llamada a tu API intermedia (Hostinger -> VPS)
            // Ojo: Crearemos este endpoint en PHP más abajo
            const response = await fetch('/URBE-API-DRIVEN/api/voice/process.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    command: input,
                    userLevel: localStorage.getItem('userLevel'),
                    lang: GeckoVoice.currentLang
                })
            });

            const data = await response.json();
            GeckoVoice.hideUI();

            if (data.status === 'success') {
                GeckoVoice.handleAiAction(data.action);
            } else {
                console.warn("NeMo no entendió:", data.message);
                // Fallback: Si la IA falla, usamos tu lógica antigua de búsqueda local
                GeckoVoice.fallbackLegacySearch(input);
            }

        } catch (e) {
            console.error("Error conectando con IA:", e);
            GeckoVoice.hideUI();
            alert("Error de conexión con el servidor de voz.");
        }
    },

    // Nueva función para ejecutar lo que diga la IA
    handleAiAction(aiJson) {
        console.log("🤖 Acción IA:", aiJson);

        // CASO A: NAVEGACIÓN (Ir a una URL con parámetros)
        if (aiJson.action === 'navigate') {
            let finalUrl = aiJson.target;
            
            // Si hay parámetros (id, historia, action), los agregamos
            if (aiJson.params) {
                const query = new URLSearchParams(aiJson.params).toString();
                finalUrl += `?${query}`;
            }
            window.location.href = finalUrl;
        }

        // CASO B: BÚSQUEDA GLOBAL (Disparar tu buscador existente)
        else if (aiJson.action === 'search') {
            const searchInput = document.getElementById('input-search-top');
            if (searchInput) {
                document.getElementById('search-container-top').classList.remove('hidden');
                searchInput.value = aiJson.query; // El término limpio que extrajo NeMo
                window.executeGlobalSearch('top'); // Tu función existente
            }
        }

        // CASO C: ACCIÓN DIRECTA (Ej: Imprimir QR)
        else if (aiJson.action === 'print_qr') {
            // Si ya estamos en la página correcta, ejecutamos
            if (typeof showQrModal === 'function') {
                showQrModal(aiJson.id);
            } else {
                // Si no, vamos a la página con el parámetro action=qr
                window.location.href = `/paginas/usuario/misalojamientos.html?historia=${aiJson.id}&action=qr`;
            }
        }
    },

// --- MODAL DE COMPATIBILIDAD (Con Cierre al tocar afuera y X) ---
    showUnsupportedBrowserModal() {
        GeckoVoice.injectStyles();
        GeckoVoice.createUI();
        
        const overlay = document.getElementById('gecko-voice-overlay');
        overlay.style.display = 'flex'; 

        // 1. LÓGICA: CERRAR AL TOCAR AFUERA
        overlay.onclick = (e) => {
            // Si el click es exactamente en el overlay (fondo oscuro) y no en el contenido
            if (e.target === overlay) {
                window.GeckoVoice.hideUI();
            }
        };

        const container = document.querySelector('.gecko-voice-content');
        container.innerHTML = `
            <div style="position: absolute; top: 20px; right: 20px; cursor: pointer; padding: 5px; z-index: 10;" 
                 onclick="window.GeckoVoice.hideUI()" title="Cerrar">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transition: 0.2s;">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </div>

            <div class="modal-gecko-body text-center w-100">
                <div class="mb-3 d-flex justify-content-center">${GeckoVoice.geckoLogoSVG}</div>
                <h4 class="fw-black text-dark mb-3">NAVEGADOR NO COMPATIBLE</h4>
                
                <div class="alert alert-light border small py-2 mb-4 mx-auto" style="background-color: #f8f9fa; color: #666;">
                    La tecnología de voz "Manos Libres" requiere un motor en la nube específico.
                </div>

                <div class="row g-4 justify-content-center mb-4">
                    <div class="col-12">
                        <h6 class="text-success fw-bold small mb-3">
                            ✅ RECOMENDADOS (COMPATIBLES)
                        </h6>
                        <div class="d-flex justify-content-center gap-4 compatible-list">
                            <div class="text-center">
                                <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/googlechrome.svg" width="40">
                                <div class="icon-label text-success">Chrome</div>
                            </div>
                            <div class="text-center">
                                <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/microsoftedge.svg" width="40">
                                <div class="icon-label text-success">Edge</div>
                            </div>
                        </div>
                    </div>

                    <div class="col-8 border-top opacity-25 mx-auto"></div>

                    <div class="col-12">
                        <h6 class="text-danger fw-bold small mb-3">
                            ❌ NO SOPORTADOS
                        </h6>
                        <div class="d-flex justify-content-center gap-4 incompatible-list">
                            <div class="text-center">
                                <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/firefoxbrowser.svg" width="32">
                                <div class="icon-label">Firefox</div>
                            </div>
                            <div class="text-center">
                                <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/brave.svg" width="32">
                                <div class="icon-label">Brave</div>
                            </div>
                            <div class="text-center">
                                <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/opera.svg" width="32">
                                <div class="icon-label">Opera</div>
                            </div>
                        </div>
                    </div>
                </div>

                <button class="btn btn-dark btn-sm px-5 rounded-pill shadow fw-bold" onclick="window.GeckoVoice.hideUI()">
                    ENTENDIDO
                </button>
            </div>
        `;
        
        const pulse = container.querySelector('.gecko-pulse-ring');
        if(pulse) pulse.style.display = 'none';
    },

    showErrorModal(errorType) {
        GeckoVoice.createUI();
        const overlay = document.getElementById('gecko-voice-overlay');
        overlay.style.display = 'flex';
        const uiText = GeckoCommands.ui[GeckoVoice.currentLang] || GeckoCommands.ui.es;
        const container = document.querySelector('.gecko-voice-content');
        container.innerHTML = `
            <div class="modal-gecko-body">
                <div class="text-center mb-3">${GeckoVoice.geckoLogoSVG}</div>
                <h5 class="text-danger fw-bold text-center">ERROR</h5>
                <p class="small mb-3 text-secondary text-center mt-4">${uiText.mic_blocked}</p>
                <div class="text-center mt-4">
                    <button class="btn btn-outline-secondary btn-sm px-5 rounded-pill" onclick="window.GeckoVoice.hideUI()">Cerrar</button>
                </div>
            </div>
        `;
        const pulse = container.querySelector('.gecko-pulse-ring');
        if(pulse) pulse.style.display = 'none';
    },

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

    getCorrectPath(path) {
        const idx = window.location.pathname.indexOf('/paginas/');
        return idx !== -1 ? window.location.pathname.substring(0, idx + 9) + path : path;
    },

injectStyles() {
        // Cambiamos el ID para forzar la actualización de estilos
        if (document.getElementById('gecko-voice-styles-v2')) return;
        
        const style = document.createElement('style');
        style.id = 'gecko-voice-styles-v2';
        style.innerHTML = `
            /* OVERLAY: CENTRADO ABSOLUTO OBLIGATORIO */
            #gecko-voice-overlay { 
                position: fixed !important; 
                top: 0 !important; 
                left: 0 !important; 
                width: 100vw !important; 
                height: 100vh !important; 
                background: rgba(0,0,0,0.85) !important; 
                backdrop-filter: blur(8px); 
                z-index: 99999 !important; /* Encima de todo */
                display: none; 
                
                /* FLEXBOX PARA CENTRAR */
                align-items: center !important; 
                justify-content: center !important; 
                flex-direction: column !important;
                margin: 0 !important;
                padding: 0 !important;
            }

            /* CAJA DEL MODAL */
            .gecko-voice-content { 
                background: white; 
                width: 90%; 
                max-width: 550px; 
                border-radius: 25px; 
                border: 4px solid #1a5d3b; 
                padding: 2.5rem; 
                position: relative; 
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                text-align: center; 
                box-shadow: 0 25px 60px rgba(0,0,0,0.6); 
                animation: geckoPopIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }

            @keyframes geckoPopIn {
                from { opacity: 0; transform: scale(0.8); }
                to { opacity: 1; transform: scale(1); }
            }

            /* ICONOS */
            .grayscale-icons img { transition: transform 0.2s; filter: grayscale(100%); opacity: 0.7; }
            .grayscale-icons img:hover { transform: scale(1.1); filter: grayscale(0%); opacity: 1; }
            
            /* Colores específicos al hacer hover o por clase */
            .compatible-list img { filter: none !important; opacity: 1 !important; }
            .incompatible-list img { filter: grayscale(100%) opacity(0.5); }
            
            .icon-label { font-size: 10px; margin-top: 5px; font-weight: 700; color: #555; text-transform: uppercase; }
            
            .gecko-pulse-ring { 
                width: 100px; height: 100px; border-radius: 50%; border: 3px solid #1a5d3b; 
                position: absolute; top: 20%; animation: geckoRipple 1.5s infinite ease-out; 
            }
            @keyframes geckoRipple { 
                0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } 
            }
        `;
        document.head.appendChild(style);
    },

    stop() { if (GeckoVoice.recognition) try{GeckoVoice.recognition.stop();}catch(e){} GeckoVoice.hideUI(); }
};
