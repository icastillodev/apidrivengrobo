import { GeckoSearch } from '../GeckoSearch.js';
import { HotkeyManager } from '../../utils/hotkeys.js';
import { GeckoVoice } from '../GeckoVoice.js';
import { UserPreferences } from './MenuConfig.js';
import { refreshMenuNotifications } from './MenuNotifications.js';
import { Auth } from '../../auth.js'; 

export function setupEventListeners() {
    window.Auth = Auth;
    window.GeckoVoice = GeckoVoice; 
    window.GeckoSearch = GeckoSearch;

    HotkeyManager.init();

    // 1. REPARACIÓN DE BOTONES HAMBURGUESA Y CRUZ
    const closeBtn = document.getElementById('gecko-close-sidebar');
    const toggleTop = document.getElementById('gecko-mobile-toggle-top');
    const toggleSide = document.getElementById('gecko-mobile-toggle');
    const sidebar = document.getElementById('gecko-sidebar-element');

    if(closeBtn && sidebar) {
        closeBtn.addEventListener('click', (e) => { e.preventDefault(); sidebar.classList.remove('open'); });
    }
    if (toggleTop) {
        toggleTop.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if(sidebar) sidebar.classList.add('open'); });
    }
    if (toggleSide) {
        toggleSide.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if(sidebar) sidebar.classList.add('open'); });
    }

    // 2. GESTOS TÁCTILES (SWIPE INTELIGENTE)
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, {passive: true});

    document.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    }, {passive: true});

function handleSwipe() {
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY; // Positivo significa que deslizó hacia abajo
        const absX = Math.abs(diffX);
        const absY = Math.abs(diffY);
        
        // SWIPE HORIZONTAL (Para abrir/cerrar menú)
        if (absX > absY) {
            if (diffX > 40 && touchStartX < 40) {
                if (sidebar && window.innerWidth <= 1250) sidebar.classList.add('open');
            }
            if (diffX < -50) {
                if (sidebar && sidebar.classList.contains('open')) sidebar.classList.remove('open');
            }
        } 
        // 🚀 SWIPE VERTICAL (Para abrir el buscador GeckoSearch)
        else if (absY > absX) {
            // Solo lo activamos si el dedo empezó bien arriba en la pantalla y deslizó hacia abajo
            if (diffY > 60 && touchStartY < 120) {
                window.GeckoSearch.open();
            }
        }
    }

    // 3. CERRAR SI SE TOCA FUERA DEL MENÚ (Escritorio)
    document.addEventListener('click', (e) => {
        // 🚀 ESCUDO CONTRA EL ERROR DE CONSOLA (Si tocas el scroll o un nodo de texto)
        if (!e.target || typeof e.target.closest !== 'function') return;

        if (sidebar && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && 
               (!toggleSide || !toggleSide.contains(e.target)) && 
               (!toggleTop || !toggleTop.contains(e.target))) {
                sidebar.classList.remove('open');
            }
        }
        
        // Cierra los menús desplegables (Acordeones de módulos)
        if (!e.target.closest('.dropdown-menu-gecko') && !e.target.closest('.dropdown-toggle-gecko')) {
            document.querySelectorAll('.dropdown-menu-gecko').forEach(m => m.classList.add('hidden'));
            document.querySelectorAll('.dropdown-toggle-gecko').forEach(b => b.classList.remove('open'));
            document.querySelectorAll('.nav-item.expanded-grid').forEach(li => li.classList.remove('expanded-grid'));
        }

        // Cierra el menú desplegable de idiomas (Banderas) si se hace click afuera
        if (!e.target.closest('.dropdown-container-lang')) {
            document.querySelectorAll('.dropdown-menu-lang').forEach(m => m.classList.add('hidden'));
        }
    });

    // 4. ATAJO GLOBAL ALT G
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key.toLowerCase() === 'g') {
            e.preventDefault();
            const overlay = document.getElementById('gecko-omni-overlay');
            if(overlay && overlay.classList.contains('show')) window.GeckoSearch.close();
            else window.GeckoSearch.open();
        }
    });

    // 5. BOTONES DE CONFIGURACIÓN
    const actions = {
        '.btn-voice-switch': () => UserPreferences.toggleVoice(),
        '.btn-font-switch': () => UserPreferences.cycleFontSize(),
        '.btn-theme-switch': () => UserPreferences.toggleTheme(),
        '.btn-layout-switch': () => UserPreferences.toggleMenuLayout(),
        '.btn-hotkeys-help': () => showHotkeysModal()
    };

    Object.entries(actions).forEach(([selector, fn]) => {
        document.querySelectorAll(selector).forEach(btn => {
            btn.addEventListener('click', (e) => { e.preventDefault(); fn(); });
        });
    });

    // EVENTO DEL MENÚ DE IDIOMAS (Para que se abra el popup de banderas)
    document.querySelectorAll('.dropdown-toggle-lang').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const menu = btn.nextElementSibling;
            if (menu) menu.classList.toggle('hidden');
        });
    });

    // 6. ACORDEÓN CLICK (ABRIR / CERRAR Y EXPANSIÓN GRID)
    document.querySelectorAll('.dropdown-toggle-gecko').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const currentMenu = btn.nextElementSibling;
            if(!currentMenu) return;

            const isHidden = currentMenu.classList.contains('hidden');
            const liParent = btn.closest('.nav-item'); // Capturamos la caja padre para el Grid Móvil
            
            // Cierra todos
            document.querySelectorAll('.dropdown-menu-gecko').forEach(m => m.classList.add('hidden'));
            document.querySelectorAll('.dropdown-toggle-gecko').forEach(b => b.classList.remove('open'));
            document.querySelectorAll('.nav-item.expanded-grid').forEach(li => li.classList.remove('expanded-grid'));

            // Abre el tocado
            if(isHidden) {
                currentMenu.classList.remove('hidden');
                btn.classList.add('open'); 
                if (liParent && window.innerWidth <= 768) {
                    liParent.classList.add('expanded-grid'); // Expande a 2 columnas en móvil
                }
            }
        };
    });

    setTimeout(() => {
        if (localStorage.getItem('gecko_ok') == 1) {
            if (!navigator.userAgent.toLowerCase().includes('firefox')) {
                window.GeckoVoice.init();
            }
        }
    }, 500);

    refreshMenuNotifications();
}

function showHotkeysModal() {
    const hotkeys = HotkeyManager.getVisibleHotkeys();
    
    const oldModal = document.getElementById('modalHotkeys');
    if (oldModal) oldModal.remove();

    const cards = hotkeys.map(h => `
        <div class="hotkey-item">
            <span class="hotkey-desc">${h.desc}</span>
            <span class="hotkey-keys"><kbd>${h.keys}</kbd></span>
        </div>
    `).join('');

    const modalHTML = `
    <div class="modal fade" id="modalHotkeys" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg" style="border-radius: 16px; overflow: hidden;">
                <div class="modal-header bg-success text-white py-3">
                    <h5 class="modal-title d-flex align-items-center gap-2 fw-bold">
                        <svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M0 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V5zm13.5 1a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1zm0 3a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1zm-3-3a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1zm0 3a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1zm-3-3a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1zm0 3a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1zM2 9.5a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1zm5 4a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1z"/></svg>
                        Atajos de Teclado
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body bg-light">
                    <div class="hotkey-card-container">
                        ${cards}
                    </div>
                </div>
                <div class="modal-footer justify-content-center bg-white border-top-0 py-3">
                    <span class="text-muted small fw-bold text-uppercase" style="font-size: 11px; letter-spacing: 1px;">Optimiza tu flujo de trabajo con GROBO</span>
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const m = new bootstrap.Modal(document.getElementById('modalHotkeys'));
    m.show();
}