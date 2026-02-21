import { GeckoVoice } from './GeckoVoice.js';

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
        
        // 🚀 SECUESTRO DIRECTO DEL INPUT (La solución a las flechas)
        if (this.input) {
            this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
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
        if (this.overlay) {
            this.overlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; 
            if (this.input) {
                this.input.focus();
                this.input.value = '';
            }
            if (this.results) this.results.innerHTML = '';
            this.hideAiMessage();
            this.selectedIndex = -1;
        }
    },

    close() {
        if (this.overlay) {
            this.overlay.classList.add('hidden');
            document.body.style.overflow = '';
            GeckoVoice.stop();
            this.hideAiMessage();
        }
    },

    setInput(text) {
        if (this.input) this.input.value = text;
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

    // --- MÓDULO DE IA: TEXTO ---
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

    // --- 🚀 CONTROLADOR DE TECLADO BLINDADO ---
    handleKeyDown(e) {
        // 1. Esc: Cerrar todo
        if (e.key === 'Escape') {
            this.close();
            return;
        }

        const items = this.results ? this.results.querySelectorAll('.gecko-result-item') : [];

        // 2. FLECHAS (Evitando que el cursor de texto se mueva)
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault(); // ¡Esto evita que el cursor se mueva en el input!
            
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
            e.preventDefault(); // Evitar submit del form
            
            // Caso A: Seleccionó algo con las flechas
            if (this.selectedIndex >= 0 && items.length > 0 && items[this.selectedIndex]) {
                const link = items[this.selectedIndex].getAttribute('href');
                if (link && link !== '#') {
                    window.location.href = link;
                } else {
                    items[this.selectedIndex].click();
                }
                this.close();
            } 
            // Caso B: Escribió texto libre para la IA
            else if (this.input.value.trim() !== '') {
                this.results.innerHTML = '<div class="text-center text-muted p-3"><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Procesando con GROBO IA...</div>';
                
                // Importación dinámica para llamar a la IA
                import('./GeckoAiDispatcher.js').then(module => {
                    module.GeckoAiDispatcher.sendCommand(this.input.value.trim());
                }).catch(err => console.error("Error cargando IA:", err));
            }
        }
    },

    updateSelection(items) {
        // Limpiamos estilos de todos
        items.forEach(item => {
            item.classList.remove('active-result', 'bg-light', 'border-warning');
        });
        
        // Marcamos el activo
        if (items[this.selectedIndex]) {
            items[this.selectedIndex].classList.add('active-result', 'bg-light', 'border-warning');
            // Hacer scroll suave dentro de la caja de resultados
            items[this.selectedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    },

    // --- MÓDULO DE RESULTADOS ---
    renderResults(resultadosArray) {
        this.selectedIndex = -1; // Resetear índice al recibir nueva info
        
        if (!this.results) return;
        
        if (!resultadosArray || resultadosArray.length === 0) {
            this.results.innerHTML = '<div class="p-3 text-center text-muted">No encontré atajos o módulos específicos para esa consulta.</div>';
            return;
        }

        let html = '';
        resultadosArray.forEach((item, index) => {
            // Se le asigna un tabindex para mejor accesibilidad y la clase base
            html += `
                <a href="${item.url || '#'}" tabindex="${index}" class="gecko-result-item list-group-item list-group-item-action border-0 mb-1 rounded" style="transition: all 0.2s;">
                    <div class="d-flex w-100 justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-0 fw-bold text-dark">${item.titulo}</h6>
                            <small class="text-muted">${item.descripcion || ''}</small>
                        </div>
                    </div>
                </a>
            `;
        });

        this.results.innerHTML = `<div class="list-group shadow-sm">${html}</div>`;
    }
};

export function initGlobalSearchUI() {
    GeckoSearch.init();
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            GeckoSearch.open();
        }
    });
}