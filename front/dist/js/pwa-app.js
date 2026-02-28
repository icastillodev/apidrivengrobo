// pwa-app.js
export const PWAApp = {
    deferredPrompt: null,
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
    isStandalone: window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone,

    init() {
        // Capturar el evento de instalación de Android/PC
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
        });

        // Evento para el botón de la cabecera
        const btnInstall = document.getElementById('btn-install-app');
        if (btnInstall) {
            // Si ya está instalada, ocultamos el botón
            if (this.isStandalone) {
                btnInstall.style.display = 'none';
            } else {
                btnInstall.addEventListener('click', () => this.showModal());
            }
        }
    },

    showModal() {
        // Leer estado de favoritos
        let isFav = localStorage.getItem('grobo_favorito') === 'true';

        Swal.fire({
            title: '<span class="text-2xl font-black italic">OPCIONES DE ACCESO</span>',
            html: `
                <div class="flex flex-col gap-4 mt-4">
                    <button id="btn-toggle-fav" class="flex items-center justify-center gap-3 w-full p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                        <svg id="star-icon" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 ${isFav ? 'text-amber-500 fill-current' : 'text-gray-400'}" viewBox="0 0 24 24" stroke="currentColor" fill="${isFav ? 'currentColor' : 'none'}">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        <span id="fav-text" class="font-bold text-sm text-gray-700 uppercase tracking-widest">
                            ${isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                        </span>
                    </button>

                    <div class="bg-amber-50 rounded-xl p-4 border border-amber-100">
                        <h4 class="font-bold text-amber-800 uppercase text-xs tracking-widest mb-2">Instalar como App</h4>
                        ${this.getInstallInstructions()}
                    </div>
                </div>
            `,
            showConfirmButton: false,
            showCloseButton: true,
            didOpen: () => {
                // Lógica de toggle de estrella
                const btnFav = document.getElementById('btn-toggle-fav');
                const starIcon = document.getElementById('star-icon');
                const favText = document.getElementById('fav-text');

                btnFav.addEventListener('click', () => {
                    isFav = !isFav;
                    localStorage.setItem('grobo_favorito', isFav);
                    
                    if(isFav) {
                        starIcon.classList.remove('text-gray-400');
                        starIcon.classList.add('text-amber-500', 'fill-current');
                        starIcon.setAttribute('fill', 'currentColor');
                        favText.innerText = 'Quitar de favoritos';
                    } else {
                        starIcon.classList.remove('text-amber-500', 'fill-current');
                        starIcon.classList.add('text-gray-400');
                        starIcon.setAttribute('fill', 'none');
                        favText.innerText = 'Agregar a favoritos';
                    }
                });

                // Lógica del botón de instalar (Solo Android/Desktop)
                const btnNativeInstall = document.getElementById('btn-native-install');
                if (btnNativeInstall) {
                    btnNativeInstall.addEventListener('click', async () => {
                        if (this.deferredPrompt) {
                            this.deferredPrompt.prompt();
                            const { outcome } = await this.deferredPrompt.userChoice;
                            if (outcome === 'accepted') {
                                Swal.close();
                            }
                            this.deferredPrompt = null;
                        }
                    });
                }
            }
        });
    },

    getInstallInstructions() {
        if (this.isIOS) {
            // Instrucciones para iPhone/iPad
            return `
                <p class="text-xs text-amber-700 font-medium mb-3">En iOS, el navegador no permite instalaciones automáticas.</p>
                <ol class="text-xs text-left text-amber-800 bg-white p-3 rounded-lg list-decimal list-inside space-y-2 font-medium shadow-sm">
                    <li>Toca el botón <strong>Compartir</strong> <svg class="inline w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg> en el menú de Safari.</li>
                    <li>Desliza hacia abajo y selecciona <strong>"Agregar a inicio"</strong> <svg class="inline w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>.</li>
                </ol>
            `;
        } else if (this.deferredPrompt) {
            // Botón nativo 1-click (Android / Chrome Desktop)
            return `
                <p class="text-xs text-amber-700 font-medium mb-3">Instala GROBO en tu dispositivo para un acceso rápido y seguro.</p>
                <button id="btn-native-install" class="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-lg uppercase tracking-widest text-xs transition-colors shadow-md">
                    Instalar GROBO
                </button>
            `;
        } else {
            // Desktop no compatible o ya instalado
            return `
                <p class="text-xs text-amber-700 font-medium text-center">
                    Instalación no soportada en este navegador, o la aplicación ya se encuentra instalada.
                </p>
            `;
        }
    }
};