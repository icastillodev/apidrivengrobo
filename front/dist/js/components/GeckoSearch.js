import { GeckoVoice } from './GeckoVoice.js';
import { GeckoSearchEngine } from './GeckoSearchEngine.js';

export const GeckoSearch = {
    overlay: null,
    box: null,
    input: null,
    results: null,
    voiceBtn: null,
    aiMessageBox: null,
    selectedIndex: -1, // Índice para navegación por teclado

    init() {
        this.overlay = document.getElementById('gecko-omni-overlay');
        if (!this.overlay) return;

        this.box = this.overlay.querySelector('.gecko-omni-box');
        this.input = document.getElementById('gecko-omni-input');
        this.results = document.getElementById('gecko-omni-results');
        this.voiceBtn = document.getElementById('gecko-omni-voice-btn');
        this.aiMessageBox = document.getElementById('gecko-ai-message');
        
        // SECUESTRO DIRECTO DEL INPUT PARA EVENTOS DE TECLADO
        if (this.input) {
            // Usamos keydown para interceptar las flechas antes de que muevan el cursor de texto
            this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
            this.input.oninput = (e) => this.executeSearch(e.target.value);
        }

        // Eventos de Voz
        if (this.voiceBtn) {
            this.voiceBtn.onclick = () => {
                if (GeckoVoice.isListeningCommand) {
                    GeckoVoice.stop();
                } else {
                    GeckoVoice.startListening();
                }
            };
        }
    },

    open() {
        if (!this.overlay) this.init();
        this.triggerEl = document.getElementById('gecko-search-trigger');

        // Animación de apertura (Morphing)
        const rect = this.triggerEl.getBoundingClientRect();
        
        this.box.style.transition = 'none'; 
        this.box.style.top = `${rect.top}px`;
        this.box.style.left = `${rect.left}px`;
        this.box.style.width = `${rect.width}px`;
        this.box.style.height = `${rect.height}px`;
        this.box.style.borderRadius = '50px'; 
        
        this.overlay.classList.add('show');
        this.triggerEl.style.opacity = '0'; 

        void this.box.offsetWidth;

        this.box.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
        const finalWidth = Math.min(800, window.innerWidth * 0.95);
        const finalLeft = (window.innerWidth - finalWidth) / 2;
        
        this.box.style.top = '100px'; 
        this.box.style.left = `${finalLeft}px`;
        this.box.style.width = `${finalWidth}px`;
        this.box.style.height = 'auto'; 
        this.box.style.minHeight = '56px';
        this.box.style.borderRadius = '16px'; 
        
        this.box.classList.add('open');

        setTimeout(() => {
            this.input.focus();
            this.input.value = '';
        }, 100);
        
        document.body.style.overflow = 'hidden'; 
        if (this.results) this.results.innerHTML = '';
        this.hideAiMessage();
        this.selectedIndex = -1;
    },

    close() {
        if (!this.overlay) return;
        
        const rect = this.triggerEl.getBoundingClientRect();
        this.box.classList.remove('open'); 
        
        this.box.style.top = `${rect.top}px`;
        this.box.style.left = `${rect.left}px`;
        this.box.style.width = `${rect.width}px`;
        this.box.style.height = `${rect.height}px`;
        this.box.style.borderRadius = '50px'; 
        this.box.style.opacity = '0'; 

        setTimeout(() => {
            this.overlay.classList.remove('show');
            this.triggerEl.style.opacity = '1'; 
            document.body.style.overflow = '';
            
            if(this.input) this.input.value = '';
            if(this.results) this.renderEmpty();
            this.box.style = ''; 
        }, 380); 
        
        GeckoVoice.stop();
        this.hideAiMessage();
    },

    setInput(text) {
        if (this.input) this.input.value = text;
        this.executeSearch(text);
    },

    setListening(isListening) {
        if (!this.voiceBtn) return;
        if (isListening) {
            this.voiceBtn.classList.add('gecko-listening-pulse'); 
            this.voiceBtn.style.color = '#d97706';
        } else {
            this.voiceBtn.classList.remove('gecko-listening-pulse');
            this.voiceBtn.style.color = '';
        }
    },

    setAiMessage(text) {
        if (this.aiMessageBox) {
            this.aiMessageBox.innerText = text;
            this.aiMessageBox.classList.remove('hidden');
        }
    },

    hideAiMessage() {
        if (this.aiMessageBox) {
            this.aiMessageBox.innerText = '';
            this.aiMessageBox.classList.add('hidden');
        }
    },

    // --- 🚀 CONTROLADOR DE TECLADO ---
    handleKeyDown(e) {
        // 1. Esc: Cerrar todo
        if (e.key === 'Escape') {
            this.close();
            return;
        }

        const items = this.results ? this.results.querySelectorAll('.gecko-result-item') : [];

        // 2. FLECHAS (Evitando que el cursor de texto se mueva)
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault(); 
            
            if (items.length === 0) return;

            if (e.key === 'ArrowDown') {
                this.selectedIndex++;
                if (this.selectedIndex >= items.length) this.selectedIndex = 0; // Loop al inicio
            } else {
                this.selectedIndex--;
                if (this.selectedIndex < 0) this.selectedIndex = items.length - 1; // Loop al final
            }
            
            this.updateSelection(items);
            return;
        } 
        
        // 3. ENTER
                if (e.key === 'Enter') {
                    e.preventDefault(); 
                    
                    // Caso A: El usuario bajó con las flechas y seleccionó algo específico de la lista
                    if (this.selectedIndex >= 0 && items.length > 0 && items[this.selectedIndex]) {
                        const link = items[this.selectedIndex].getAttribute('href');
                        if (link && link !== '#') {
                            window.location.href = link;
                        } else {
                            items[this.selectedIndex].click(); // Simula clic si no es un <a> real
                        }
                        this.close();
                    } 
                    // Caso B: Escribió algo y le dio Enter directo (Mandarlo a la IA)
                    else if (this.input.value.trim() !== '') {
                        const term = this.input.value.trim();
                        
                        // Ponemos loader
                        this.results.innerHTML = `<div class="text-center p-4">
                            <div class="spinner-border text-success spinner-border-sm mb-2" role="status"></div>
                            <div class="small fw-bold text-success">Consultando a GROBO IA...</div>
                        </div>`;
                        
                        // Importación dinámica y ejecución
                        import('./GeckoAiDispatcher.js').then(module => {
                            module.GeckoAiDispatcher.sendCommand(term);
                        }).catch(err => {
                            console.error("Error cargando IA:", err);
                            this.renderEmpty();
                        });
                    }
                }
    },

    updateSelection(items) {
        // Limpiamos estilos de todos
        items.forEach(item => {
            item.classList.remove('active-result', 'bg-success-subtle', 'border-start', 'border-4', 'border-success');
        });
        
        // Marcamos el activo
        if (items[this.selectedIndex]) {
            const activeItem = items[this.selectedIndex];
            activeItem.classList.add('active-result', 'bg-success-subtle', 'border-start', 'border-4', 'border-success');
            // Hacer scroll suave dentro de la caja de resultados
            activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    },

    // --- MÓDULO DE BÚSQUEDA TRADICIONAL ---
    async executeSearch(term) {
        if (!term || term.length < 1) {
            this.renderEmpty();
            return;
        }
        this.renderSpinner();
        
        // Análisis léxico simple para detectar intenciones
        const analysis = GeckoSearchEngine.analyze(term);

            try {
            // 🚀 IMPORTACIÓN DINÁMICA HÍBRIDA (Local vs Prod)
            const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
                ? '/URBE-API-DRIVEN/front/' 
                : '/';
            
            const { API } = await import(`${basePath}dist/js/api.js`);
            
            const instId = localStorage.getItem('instId');
            const params = new URLSearchParams({
                q: analysis.term,
                scope: analysis.scope,
                inst: instId,
                role: localStorage.getItem('userLevel'),
                uid: localStorage.getItem('userId')
            });

            const res = await API.request(`/search/global?${params.toString()}`);

            if (res.status === 'success') {
                this.renderResults(res.data, term);
            } else {
                this.renderNoResults(term);
            }
        } catch (e) {
            this.results.innerHTML = `<div class="p-3 text-center text-danger small">Error de conexión con el motor de búsqueda.</div>`;
        }
    },

    renderResults(data, term) {
        this.selectedIndex = -1; // Resetear índice al recibir nueva info
        if (!this.results) return;

        const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/';
        let html = '';
        let hasResults = false;
        let globalIndex = 0; // Para el tabindex correlativo

        // --- RENDERIZADO DE RESULTADOS ---
        // (Protocolos)
        if (data.protocolos?.length > 0) {
            hasResults = true;
            html += `<div class="small fw-bold text-muted px-3 py-2 bg-light text-uppercase" style="font-size:10px;">Protocolos</div>`;
            data.protocolos.forEach(p => {
                html += `
                    <a href="${basePath}paginas/admin/protocolos.html?id=${p.idprotA}&action=edit" tabindex="${globalIndex++}" class="gecko-result-item list-group-item list-group-item-action border-0 mb-1 rounded d-flex align-items-center gap-3">
                        <span class="text-secondary"><i class="bi bi-file-earmark-medical fs-5"></i></span>
                        <div class="d-flex flex-column" style="overflow:hidden;">
                            <span class="fw-bold text-truncate text-dark" style="font-size: 13px;">${p.tituloA}</span>
                            <span class="small text-muted" style="font-size: 11px;">Protocolo #${p.nprotA} | Inv: ${p.ApellidoA}</span>
                        </div>
                        <span class="badge bg-light text-secondary border ms-auto">PROT</span>
                    </a>`;
            });
        }
        
        // (Formularios)
        if (data.formularios?.length > 0) {
            hasResults = true;
            html += `<div class="small fw-bold text-muted px-3 py-2 bg-light text-uppercase" style="font-size:10px;">Pedidos & Formularios</div>`;
            data.formularios.forEach(f => {
                html += `
                    <a href="${basePath}paginas/usuario/misformularios.html?id=${f.idformA}&action=view" tabindex="${globalIndex++}" class="gecko-result-item list-group-item list-group-item-action border-0 mb-1 rounded d-flex align-items-center gap-3">
                        <span class="text-primary"><i class="bi bi-ui-checks fs-5"></i></span>
                        <div class="d-flex flex-column" style="overflow:hidden;">
                            <span class="fw-bold text-truncate text-dark" style="font-size: 13px;">Pedido #${f.idformA}</span>
                            <span class="small text-muted" style="font-size: 11px;">${f.tipoA} | ${f.ApellidoA}</span>
                        </div>
                        <span class="badge bg-primary-subtle text-primary ms-auto">${f.estado}</span>
                    </a>`;
            });
        }

        // (Usuarios)
        if (data.usuarios?.length > 0) {
            hasResults = true;
            html += `<div class="small fw-bold text-muted px-3 py-2 bg-light text-uppercase" style="font-size:10px;">Usuarios</div>`;
            data.usuarios.forEach(u => {
                html += `
                    <a href="${basePath}paginas/admin/usuarios.html?id=${u.IdUsrA}" tabindex="${globalIndex++}" class="gecko-result-item list-group-item list-group-item-action border-0 mb-1 rounded d-flex align-items-center gap-3">
                        <span class="text-success"><i class="bi bi-person-badge fs-5"></i></span>
                        <div class="d-flex flex-column" style="overflow:hidden;">
                            <span class="fw-bold text-truncate text-dark" style="font-size: 13px;">${u.ApellidoA}, ${u.NombreA}</span>
                            <span class="small text-muted" style="font-size: 11px;">${u.EmailA}</span>
                        </div>
                        <span class="badge bg-light text-secondary border ms-auto">ID: ${u.IdUsrA}</span>
                    </a>`;
            });
        }

        // --- OPCIÓN DE IA AL FINAL DE LA LISTA ---
        html += `
            <div class="gecko-result-item list-group-item list-group-item-action mt-2 border-top pt-2 rounded pointer" tabindex="${globalIndex}" onclick="GeckoVoice.executeAction('${term}')">
                <div class="d-flex align-items-center gap-3">
                    <span class="text-success"><i class="bi bi-robot fs-5"></i></span>
                    <div class="d-flex flex-column">
                        <span class="fw-bold text-success" style="font-size: 13px;">Preguntar a GROBO IA</span>
                        <span class="small text-muted" style="font-size:10px;">"${term}"</span>
                    </div>
                    <span class="badge bg-success ms-auto">ENTER</span>
                </div>
            </div>`;

        if (!hasResults) {
            this.renderNoResults(term);
        } else {
            this.results.innerHTML = `<div class="list-group shadow-sm pb-2">${html}</div>`;
        }
    },

    renderEmpty() { 
        this.results.innerHTML = `<div class="gecko-omni-empty p-4 text-center text-muted small"><i class="bi bi-search fs-1 d-block mb-2 opacity-25"></i> Escribe para buscar en la base de datos...</div>`; 
    },
    
    renderSpinner() { 
        this.results.innerHTML = `<div class="p-4 text-center"><div class="spinner-border text-success spinner-border-sm"></div></div>`; 
    },
    
    renderNoResults(term) {
        this.results.innerHTML = `
            <div class="p-4 text-center">
                <i class="bi bi-clipboard-x text-muted fs-1 opacity-50 mb-2 d-block"></i>
                <p class="text-muted small mb-3">No hay coincidencias exactas para <b>"${term}"</b></p>
                <button class="btn btn-sm btn-outline-success fw-bold px-4 rounded-pill" onclick="GeckoVoice.executeAction('${term}')">
                    <i class="bi bi-robot me-1"></i> Consultar a GROBO IA
                </button>
            </div>
        `;
    }
};

export function initGlobalSearchUI() { 
    GeckoSearch.init(); 
    
    // Atajo Global para abrir (Ctrl+K o Cmd+K)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            GeckoSearch.open();
        }
    });
}