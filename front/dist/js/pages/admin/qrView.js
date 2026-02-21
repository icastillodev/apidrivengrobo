import { API } from '../../api.js';

let isAdmin = false;
let currentHistoryData = [];

// Mapeo de roles de usuario del sistema URBE
const ROLE_MAP = {
    1: 'SUPERADMIN',
    2: 'ADMINISTRADOR',
    3: 'INVESTIGADOR',
    4: 'TÉCNICO',
    5: 'VETERINARIO',
    6: 'DIRECTOR'
};

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const historiaId = urlParams.get('historia');
    
    // 1. Detección de Sesión y Rol
    const token = localStorage.getItem('token');
    const role = parseInt(localStorage.getItem('userLevel'));
    const userName = localStorage.getItem('userName');
    
    // Definimos si tiene permisos de gestión (Admin, Técnicos, etc.)
    isAdmin = (token && [1, 2, 4, 5, 6].includes(role));

    // Renderizar la zona de autenticación con botón de Logout
    renderAuthZone(userName, role);

    if (!historiaId) return;

    // 2. Generar QR Buffer para etiquetas
    new QRCode(document.getElementById("qrcode-buffer"), {
        text: window.location.href,
        width: 400, height: 400
    });

    // 3. Cargar datos de la historia
    await cargarDatosQR(historiaId);
});

/**
 * Gestiona la visualización del usuario logueado y el botón de gestión/logout
 */
function renderAuthZone(name, roleId) {
    const zone = document.getElementById('auth-zone');
    if (name && roleId) {
        const roleName = ROLE_MAP[roleId] || 'USUARIO';
        zone.innerHTML = `
            <div class="me-2 text-end d-none d-md-block" style="line-height: 1.1;">
                <div class="small fw-bold text-dark">${name.toUpperCase()}</div>
                <small class="text-muted fw-bold" style="font-size: 0.65rem;">${roleName}</small>
            </div>
            <div class="d-flex align-items-center gap-2">
                <i class="bi bi-person-circle fs-4 text-primary"></i>
                <button onclick="window.cerrarSesionQR()" class="btn btn-xs btn-outline-danger shadow-sm py-0 px-2" title="Cerrar Sesión">
                    <i class="bi bi-box-arrow-right"></i>
                </button>
            </div>`;
        
        // Habilitar elementos de gestión si es admin
        if (isAdmin) {
            document.querySelectorAll('.admin-only').forEach(el => el.style.setProperty('display', 'flex', 'important'));
            const thAcciones = document.getElementById('th-acciones');
            if (thAcciones) thAcciones.style.setProperty('display', 'table-cell', 'important');
        }
    } else {
        zone.innerHTML = `
            <button onclick="window.irALogin()" class="btn btn-sm btn-outline-primary fw-bold me-2 shadow-sm">
                <i class="bi bi-person-lock me-1"></i> GESTIÓN
            </button>`;
    }
}

/**
 * Lógica de Redirección y Cierre de Sesión
 */
window.irALogin = () => {
    localStorage.setItem('redirectAfterLogin', window.location.href);
    const inst = localStorage.getItem('NombreInst') || '';
    const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/';
    window.location.href = `${basePath}${inst}/`; 
};


window.cerrarSesionQR = () => {
    // Limpieza de seguridad
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userLevel');
    localStorage.removeItem('userName');
    localStorage.setItem('isLoggedIn', 'false');
    // Recargamos para volver al modo público (Investigador)
    window.location.reload();
};

/**
 * Carga de datos y renderizado de tabla (Limpia, sin repetir tipo de caja)
 */
async function cargarDatosQR(historiaId) {
    try {
        const res = await API.request(`/alojamiento/history?historia=${historiaId}`);
        if (res.status === 'success' && res.data.length > 0) {
            currentHistoryData = res.data;
            const first = currentHistoryData[0];
            const hoy = new Date();
            hoy.setHours(12, 0, 0, 0);

            // Cabecera Técnica
            document.getElementById('txt-historia').innerText = first.historia;
            document.getElementById('txt-protocolo').innerText = `[${first.nprotA}]`;
            document.getElementById('txt-titulo').innerText = first.tituloA || 'Sin título definido';
            document.getElementById('txt-especie').innerText = first.EspeNombreA;
            document.getElementById('txt-investigador').innerText = first.Investigador;

            // Encabezado de Tabla Dinámico
            const esChicaGlobal = parseFloat(first.totalcajachica) > 0;
            const thCajas = document.getElementById('th-cajas');
            if (thCajas) thCajas.innerText = `CANT. (${esChicaGlobal ? 'CHICA' : 'GRANDE'})`;

            // Renderizado de Filas
            const tbody = document.getElementById('tbody-historial');
            let totalDias = 0;
            let totalDinero = 0;

            tbody.innerHTML = currentHistoryData.map(h => {
                const esAbierto = !h.hastafecha;
                const pIni = h.fechavisado.split('-');
                const fIni = new Date(pIni[0], pIni[1] - 1, pIni[2], 12, 0, 0);
                let fFin = esAbierto ? hoy : new Date(h.hastafecha.split('-')[0], h.hastafecha.split('-')[1] - 1, h.hastafecha.split('-')[2], 12, 0, 0);

                let dias = Math.max(0, Math.floor((fFin - fIni) / (1000 * 60 * 60 * 24)));
                const esChica = parseFloat(h.totalcajachica) > 0;
                const precioUnit = esChica ? parseFloat(h.preciocajachica) : parseFloat(h.preciocajagrande);
                const cant = esChica ? parseInt(h.totalcajachica) : parseInt(h.totalcajagrande);
                const subtotal = esAbierto ? (dias * precioUnit * cant) : parseFloat(h.totalpago || 0);

                totalDias += dias; totalDinero += subtotal;

                return `
                <tr>
                    <td><span class="text-muted small">#${h.IdAlojamiento}</span></td>
                    <td>${fIni.toLocaleDateString()}</td>
                    <td class="${esAbierto ? 'text-primary fw-bold' : ''}">${esAbierto ? 'Vigente' : fFin.toLocaleDateString()}</td>
                    <td class="fw-bold fs-6">${cant}</td>
                    <td class="fw-bold">${dias}</td>
                    <td>$${precioUnit.toFixed(2)}</td>
                    <td class="fw-bold text-success">$${subtotal.toFixed(2)}</td>
                    <td class="small text-muted italic">${h.observaciones || '---'}</td>
                    ${isAdmin ? `
                    <td>
                        <button class="btn btn-xs btn-outline-danger shadow-sm" onclick="window.eliminarTramoQR(${h.IdAlojamiento}, ${h.historia})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>` : ''}
                </tr>`;
            }).join('');

            document.getElementById('txt-total-dias').innerText = totalDias;
            document.getElementById('txt-total-pago').innerText = `$${totalDinero.toFixed(2)}`;

            // Badge de Estado y Footer Admin
            const isFinalizado = currentHistoryData.some(h => String(h.finalizado) === "1");
            const badge = document.getElementById('badge-estado');
            if (badge) {
                badge.innerText = isFinalizado ? 'FINALIZADO' : 'ESTADÍA VIGENTE';
                badge.className = `badge rounded-pill px-3 ${isFinalizado ? 'bg-danger' : 'bg-success'}`;
            }

            if (isAdmin) renderFooterQR(historiaId, isFinalizado);

            document.getElementById('qr-loader').classList.add('d-none');
            document.getElementById('qr-content').classList.remove('d-none');
        }
    } catch (e) { console.error("Error cargando QR:", e); }
}

function renderFooterQR(historiaId, isFinalizado) {
    const footer = document.getElementById('footer-admin');
    if (!footer) return;
    if (isFinalizado) {
        footer.innerHTML = `<button class="btn btn-sm btn-warning fw-bold px-4" onclick="window.desfinalizar(${historiaId})">DESFINALIZAR</button>`;
    } else {
        footer.innerHTML = `
            <button class="btn btn-sm btn-danger fw-bold px-4 shadow-sm" onclick="window.finalizar(${historiaId})">FINALIZAR</button>
            <button class="btn btn-sm btn-primary fw-bold px-4 shadow-sm" onclick="window.actualizar(${historiaId})">ACTUALIZAR / AGREGAR TRAMO</button>`;
    }
}

// --- ACCIONES ADMIN ---
window.eliminarTramoQR = async (id, hId) => {
    const { isConfirmed } = await Swal.fire({ title: '¿Eliminar?', text: "Se borrará este tramo.", icon: 'warning', showCancelButton: true });
    if (isConfirmed) {
        const res = await API.request(`/alojamiento/delete?id=${id}`, 'DELETE');
        if (res.status === 'success') await cargarDatosQR(hId);
    }
};

window.actualizar = (id) => {
    if (window.opener) window.close(); // Si es popup, se cierra para volver al admin
};

// --- MODAL PERSONALIZACIÓN Y PDF ---
window.abrirModalPersonalizar = () => {
    new bootstrap.Modal(document.getElementById('modal-personalizar-qr')).show();
};

window.confirmarDescargaPDF = () => {
    const { jsPDF } = window.jspdf;
    const sizeType = document.getElementById('qr-custom-size').value;
    const config = {
        chico:   { doc: [50, 50],   fontT: 9,  fontB: 7,  qrSize: 28, qrY: 16 },
        mediano: { doc: [80, 80],   fontT: 14, fontB: 10, qrSize: 45, qrY: 25 },
        grande:  { doc: [100, 100], fontT: 18, fontB: 12, qrSize: 60, qrY: 30 }
    };
    const cfg = config[sizeType];
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: cfg.doc });
    const midX = cfg.doc[0] / 2;
    const hId = new URLSearchParams(window.location.search).get('historia');

    doc.setFont("helvetica", "bold"); doc.setFontSize(cfg.fontT);
    const tit = document.getElementById('qr-custom-title').value;
    if (tit) doc.text(tit, midX, 10, { align: 'center' });

    doc.setFont("helvetica", "normal"); doc.setFontSize(cfg.fontB);
    const txt = document.getElementById('qr-custom-text').value;
    if (txt) doc.text(txt, midX, 15, { align: 'center' });

    const qrImg = document.getElementById("qrcode-buffer").querySelector("img") || document.getElementById("qrcode-buffer").querySelector("canvas");
    if (qrImg) {
        const qrBase64 = qrImg.src || qrImg.toDataURL("image/png");
        doc.addImage(qrBase64, 'PNG', midX - (cfg.qrSize / 2), cfg.qrY, cfg.qrSize, cfg.qrSize);
        doc.save(`QR_Etiqueta_H${hId}.pdf`);
        bootstrap.Modal.getInstance(document.getElementById('modal-personalizar-qr')).hide();
    }
};