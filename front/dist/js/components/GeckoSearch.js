import { GeckoSearchEngine } from './GeckoSearchEngine.js';
import { GeckoVoice } from './GeckoVoice.js';

export const GeckoSearch = {
    overlay: null,
    box: null,
    input: null,
    results: null,
    voiceBtn: null,
    triggerEl: null,

    init() {
        this.overlay = document.getElementById('gecko-omni-overlay');
        if (this.overlay) {
            this.box = this.overlay.querySelector('.gecko-omni-box');
            this.input = document.getElementById('gecko-omni-input');
            this.results = document.getElementById('gecko-omni-results');
            this.voiceBtn = document.getElementById('gecko-omni-voice-btn');
        }
        
        if (this.input) {
            this.input.oninput = (e) => this.executeSearch(e.target.value);
            this.input.onkeydown = (e) => {
                if (e.key === 'Escape') this.close();
                if (e.key === 'Enter') this.executeSearch(e.target.value);
            };
        }

        if (this.voiceBtn) {
            this.voiceBtn.onclick = () => {
                if (GeckoVoice.isListeningCommand) GeckoVoice.stop();
                else GeckoVoice.startListening();
            };
        }
    },

    open() {
        if (!this.overlay) this.init();
        this.triggerEl = document.getElementById('gecko-search-trigger');

        // --- ANIMACIÓN DE APERTURA (MORPHING) ---
        // 1. Tomamos las coordenadas exactas del botón disparador
        const rect = this.triggerEl.getBoundingClientRect();
        
        // 2. Colocamos la caja oculta exactamente encima del botón
        this.box.style.transition = 'none'; // Reseteamos transición
        this.box.style.top = `${rect.top}px`;
        this.box.style.left = `${rect.left}px`;
        this.box.style.width = `${rect.width}px`;
        this.box.style.height = `${rect.height}px`;
        this.box.style.borderRadius = '50px'; // Redondo al principio
        
        // 3. Mostramos el overlay y ocultamos el botón real
        this.overlay.classList.add('show');
        this.triggerEl.style.opacity = '0'; 

        // 4. Forzamos al navegador a pintar este frame (Reflow)
        void this.box.offsetWidth;

        // 5. Animamos hacia la posición final (Centro)
        this.box.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
        
        const finalWidth = Math.min(800, window.innerWidth * 0.95);
        const finalLeft = (window.innerWidth - finalWidth) / 2;
        
        this.box.style.top = '100px'; 
        this.box.style.left = `${finalLeft}px`;
        this.box.style.width = `${finalWidth}px`;
        this.box.style.height = 'auto'; 
        this.box.style.minHeight = '56px';
        this.box.style.borderRadius = '16px'; // Cuadrado suave
        
        this.box.classList.add('open');

        setTimeout(() => this.input.focus(), 100);
        document.body.style.overflow = 'hidden'; 
    },

close() {
        if (!this.overlay) return;
        
        // 1. OBTENER POSICIÓN ACTUAL DEL TRIGGER (Por si hubo scroll)
        const rect = this.triggerEl.getBoundingClientRect();
        
        // 2. Ocultar contenido interno PRIMERO (para que no se vea feo al encoger)
        this.box.classList.remove('open'); 
        
        // 3. ANIMAR DE REGRESO A LA FORMA DEL BOTÓN
        this.box.style.top = `${rect.top}px`;
        this.box.style.left = `${rect.left}px`;
        this.box.style.width = `${rect.width}px`;
        this.box.style.height = `${rect.height}px`;
        this.box.style.borderRadius = '50px'; // Vuelve a ser redondo
        this.box.style.opacity = '0'; // Se desvanece al final del viaje

        // 4. LIMPIEZA FINAL (Esperar a que termine la animación css de 0.4s)
        setTimeout(() => {
            this.overlay.classList.remove('show');
            this.triggerEl.style.opacity = '1'; // El botón original reaparece suavemente
            document.body.style.overflow = '';
            
            // Limpiar inputs y estilos
            if(this.input) this.input.value = '';
            if(this.results) this.renderEmpty();
            
            // Quitar estilos inline para la próxima apertura
            this.box.style = ''; 
        }, 380); // Un poco menos de 0.4s para evitar parpadeo
    },

    async executeSearch(term) {
        if (!term || term.length < 1) {
            this.renderEmpty();
            return;
        }
        this.renderSpinner();
        const analysis = GeckoSearchEngine.analyze(term);

        try {
            const instId = localStorage.getItem('instId');
            const params = new URLSearchParams({
                q: analysis.term,
                scope: analysis.scope,
                inst: instId,
                role: localStorage.getItem('userLevel'),
                uid: localStorage.getItem('userId')
            });

            const response = await fetch(`/URBE-API-DRIVEN/api/search/global?${params.toString()}`);
            const res = await response.json();

            if (res.status === 'success') {
                this.renderResults(res.data, term);
            } else {
                this.renderNoResults(term);
            }
        } catch (e) {
            this.results.innerHTML = `<div class="p-3 text-center text-danger small">Error de conexión</div>`;
        }
    },

    renderResults(data, term) {
        let html = '';
        let hasResults = false;

        if (data.protocolos?.length > 0) {
            hasResults = true;
            html += `<div class="small fw-bold text-muted px-3 py-2 bg-light text-uppercase" style="font-size:10px;">Protocolos</div>`;
            data.protocolos.forEach(p => {
                html += `
                    <a href="/URBE-API-DRIVEN/front/paginas/admin/protocolos.html?id=${p.idprotA}&action=edit" class="omni-item">
                        <span class="omni-item-icon"><svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 0h5.293A1 1 0 0 1 10 .293L13.707 4a1 1 0 0 1 .293.707V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm5.5 1.5v2a1 1 0 0 0 1 1h2l-3-3z"/></svg></span>
                        <div class="d-flex flex-column" style="overflow:hidden;">
                            <span class="fw-bold text-truncate">${p.tituloA}</span>
                            <span class="small text-muted">Prot #${p.nprotA}</span>
                        </div>
                        <span class="omni-meta">PROT</span>
                    </a>`;
            });
        }
        
        html += this.getAiOption(term);

        if (!hasResults && html.indexOf('omni-item') === -1) this.renderNoResults(term);
        else this.results.innerHTML = html;
    },

    getAiOption(term) {
        return `
            <div class="omni-item mt-2 border-top pt-2" onclick="GeckoVoice.executeAction('${term}')">
                <span class="omni-item-icon text-success"><svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/></svg></span>
                <div class="d-flex flex-column">
                    <span class="fw-bold text-success">Preguntar a Gecko AI</span>
                    <span class="small text-muted" style="font-size:10px;">"${term}"</span>
                </div>
                <span class="omni-meta bg-success text-white border-0">IA</span>
            </div>`;
    },

    renderEmpty() { this.results.innerHTML = `<div class="gecko-omni-empty"></div>`; },
    renderSpinner() { this.results.innerHTML = `<div class="p-4 text-center"><div class="spinner-border text-success spinner-border-sm"></div></div>`; },
    renderNoResults(term) {
        this.results.innerHTML = `<div class="gecko-omni-empty">Sin resultados locales.<br><button class="btn btn-sm btn-outline-success mt-2" onclick="GeckoVoice.executeAction('${term}')">Consultar IA</button></div>`;
    },
    setInput(text) {
        if (!this.input) this.init();
        this.input.value = text;
        this.executeSearch(text);
    },
    setListening(isListening) {
        if (!this.voiceBtn) this.init();
        if (isListening) {
            this.voiceBtn.classList.add('listening');
            this.input.placeholder = "Escuchando...";
        } else {
            this.voiceBtn.classList.remove('listening');
            this.input.placeholder = "Busca...";
        }
    }
};

window.GeckoSearch = GeckoSearch;
export function initGlobalSearchUI() { GeckoSearch.init(); }