import { API } from './api.js';

export const NotificationManager = {
    init() {
        this.check();
        setInterval(() => this.check(), 30000); 
    },

    async check() {
        const instId = localStorage.getItem('instId');
        if (!instId) return;

        try {
            const res = await API.request(`/menu/notifications?inst=${instId}`);
            
            if (res.status === "success" && res.data) {
                // Actualizamos los 4 pilares
                this.setNumberBadge(2, res.data.protocolos); 
                this.setNumberBadge(3, res.data.animales);   
                this.setNumberBadge(4, res.data.reactivos);  
                this.setNumberBadge(5, res.data.insumos);    
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
        const container = document.querySelector(`.menu-icon[data-menu-id="${id}"]`);
        if (!container) return;

        let dot = container.querySelector('.notif-dot');
        if (!dot) return;

        const total = parseInt(count) || 0;

        if (total > 0) {
            // ESTADO PENDIENTE (Peligro/Acción requerida)
            dot.innerText = total > 99 ? '99+' : total;
            dot.style.display = 'flex';
            dot.classList.remove('bg-success', 'border-success-subtle');
            dot.classList.add('bg-danger', 'animate-pulse'); // Pulsa en rojo para llamar la atención
        } else {
            // ESTADO LIMPIO (Todo verificado)
            // Usamos un check icon de Bootstrap Icons
            dot.innerHTML = '<i class="bi bi-check-lg" style="font-size: 10px; -webkit-text-stroke: 1px;"></i>';
            dot.style.display = 'flex';
            dot.classList.remove('bg-danger', 'animate-pulse');
            dot.classList.add('bg-success', 'border-success-subtle'); // Verde suave
        }
    }
};

// Ajuste de Estilos para que el verde no sea tan chillón y el rojo pulse
const style = document.createElement('style');
style.innerHTML = `
    .notif-dot {
        transition: all 0.4s ease;
    }
    .bg-success { background-color: #198754 !important; }
    .bg-danger { background-color: #dc3545 !important; }
    .animate-pulse { animation: pulse 2s infinite; }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
`;
document.head.appendChild(style);