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

    const closeBtn = document.getElementById('gecko-close-sidebar');
    if(closeBtn) closeBtn.onclick = () => document.getElementById('gecko-sidebar-element').classList.remove('open');

    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('gecko-sidebar-element');
        if (sidebar && sidebar.classList.contains('open')) {
            const bSide = document.getElementById('gecko-mobile-toggle');
            if (!sidebar.contains(e.target) && (!bSide || !bSide.contains(e.target))) {
                sidebar.classList.remove('open');
            }
        }
        if (!e.target.closest('.dropdown-menu-gecko') && !e.target.closest('.dropdown-toggle-gecko')) {
            document.querySelectorAll('.dropdown-menu-gecko').forEach(m => m.classList.add('hidden'));
        }
    });

    // ATAJO GLOBAL ALT G
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key.toLowerCase() === 'g') {
            e.preventDefault();
            const overlay = document.getElementById('gecko-omni-overlay');
            if(overlay && overlay.classList.contains('show')) window.GeckoSearch.close();
            else window.GeckoSearch.open();
        }
    });

    const actions = {
        'btn-voice-switch': () => UserPreferences.toggleVoice(),
        'btn-font-switch': () => UserPreferences.cycleFontSize(),
        'btn-theme-switch': () => UserPreferences.toggleTheme(),
        'btn-layout-switch': () => UserPreferences.toggleMenuLayout(),
        'btn-hotkeys-help': () => showHotkeysModal()
    };

    Object.entries(actions).forEach(([id, fn]) => {
        const btn = document.getElementById(id);
        if(btn) {
            btn.onclick = (e) => { e.preventDefault(); fn(); };
        }
    });

    document.querySelectorAll('.dropdown-toggle-gecko').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const currentMenu = btn.nextElementSibling;
            if(!currentMenu) return;
            const isHidden = currentMenu.classList.contains('hidden');
            document.querySelectorAll('.dropdown-menu-gecko').forEach(m => m.classList.add('hidden'));
            if(isHidden) currentMenu.classList.remove('hidden');
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
    
    // Eliminamos modal viejo si existe
    const oldModal = document.getElementById('modalHotkeys');
    if (oldModal) oldModal.remove();

    // Generamos las tarjetas (Cards)
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