import { API } from './api.js';

export const NotificationManager = {
    init() {
        if (typeof window !== 'undefined') {
            window.NotificationManager = NotificationManager;
        }
        this.check();
        setInterval(() => this.check(), 30000); 
    },

    async check() {
        const instId = localStorage.getItem('instId');
        if (!instId) return;

        let url = `/menu/notifications?inst=${encodeURIComponent(instId)}`;
        try {
            const desde = localStorage.getItem('grobo_noticias_vista_hasta');
            if (desde) {
                url += `&noticias_desde=${encodeURIComponent(desde)}`;
            }
        } catch (e) { /* ignore */ }

        try {
            const res = await API.request(url);
            
            if (res.status === "success" && res.data) {
                // Actualizamos los 4 pilares
                this.setNumberBadge(2, res.data.protocolos); 
                this.setNumberBadge(3, res.data.animales);   
                this.setNumberBadge(4, res.data.reactivos);  
                this.setNumberBadge(5, res.data.insumos);    
                this.setNumberBadge(6, res.data.reservas);
                if (typeof res.data.mensajes !== 'undefined') {
                    this.setMessageBadge(204, res.data.mensajes);
                }
                if (typeof res.data.noticias_nuevas !== 'undefined') {
                    this.setNewsBadge(206, res.data.noticias_nuevas);
                }
                if (typeof res.data.noticias_borradores !== 'undefined') {
                    this.setMessageBadge(205, res.data.noticias_borradores);
                }
            }
        } catch (e) {
            console.warn("NotificationManager: Error de sincronización.");
        }
    },

    /**
     * GESTIÓN VISUAL DEL BADGE
     * total > 0  => Rojo con número (Pendientes)
     * total == 0 => Verde con Check (Todo al día)
     */
    setNumberBadge(id, count) {
        const containers = document.querySelectorAll(`.menu-icon[data-menu-id="${id}"]`);
        if (!containers.length) return;

        const total = parseInt(count) || 0;

        containers.forEach((container) => {
            const dot = container.querySelector('.notif-dot');
            if (!dot) return;

            if (total > 0) {
                dot.innerText = total > 99 ? '99+' : total;
                dot.style.display = 'flex';
                dot.classList.remove('bg-success', 'border-success-subtle');
                dot.classList.add('bg-danger', 'animate-pulse');
            } else {
                dot.innerHTML = '<i class="bi bi-check-lg" style="font-size: 10px; -webkit-text-stroke: 1px;"></i>';
                dot.style.display = 'flex';
                dot.classList.remove('bg-danger', 'animate-pulse');
                dot.classList.add('bg-success', 'border-success-subtle');
            }
        });
    },

    /**
     * 204 Mensajes: rojo con número si hay no leídos; verde con 0 si no.
     * 205 Borradores noticias: solo badge rojo con número si hay borradores (sin punto verde si no hay).
     */
    setMessageBadge(id, count) {
        const containers = document.querySelectorAll(`.menu-icon[data-menu-id="${id}"]`);
        if (!containers.length) return;

        const total = parseInt(count, 10) || 0;
        const isDraftsMenu = id === 205;

        containers.forEach((container) => {
            const dot = container.querySelector('.notif-dot');
            if (!dot) return;

            if (total > 0) {
                dot.innerText = total > 99 ? '99+' : String(total);
                dot.style.display = 'flex';
                dot.classList.remove('bg-success', 'border-success-subtle', 'bg-info');
                dot.classList.add('bg-danger', 'animate-pulse');
            } else if (isDraftsMenu) {
                dot.style.display = 'none';
                dot.innerHTML = '';
                dot.classList.remove('bg-danger', 'animate-pulse', 'bg-success', 'border-success-subtle', 'bg-info');
            } else {
                dot.innerText = '0';
                dot.style.display = 'flex';
                dot.classList.remove('bg-danger', 'animate-pulse', 'bg-info');
                dot.classList.add('bg-success', 'border-success-subtle');
            }
        });
    },

    /** Portal de noticias (206): badge azul si hay publicaciones con FechaPublicacion posterior al último detalle abierto (no al entrar al listado). */
    setNewsBadge(id, count) {
        const containers = document.querySelectorAll(`.menu-icon[data-menu-id="${id}"]`);
        if (!containers.length) return;

        const total = parseInt(count, 10) || 0;

        containers.forEach((container) => {
            const dot = container.querySelector('.notif-dot');
            if (!dot) return;

            if (total > 0) {
                dot.innerText = total > 99 ? '99+' : String(total);
                dot.style.display = 'flex';
                dot.classList.remove('bg-success', 'border-success-subtle', 'bg-danger');
                dot.classList.add('bg-info', 'animate-pulse');
            } else {
                dot.style.display = 'none';
                dot.innerHTML = '';
                dot.classList.remove('bg-danger', 'animate-pulse', 'bg-success', 'border-success-subtle', 'bg-info');
            }
        });
    }
};

// Ajuste de Estilos para que el verde no sea tan chillón y el rojo pulse
const style = document.createElement('style');
style.innerHTML = `
    .notif-dot {
        transition: all 0.4s ease;
        color: #fff !important;
    }
    .bg-success { background-color: #198754 !important; }
    .bg-danger { background-color: #dc3545 !important; }
    .bg-info { background-color: #0dcaf0 !important; color: #000 !important; }
    .animate-pulse { animation: pulse 2s infinite; }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
`;
document.head.appendChild(style);