import { API } from '../../api.js';

let isAdmin = false;
let currentHistoryData = [];
let historiaId = null;

const ROLE_MAP = {
    1: 'SUPERADMIN', 2: 'ADMINISTRADOR', 3: 'INVESTIGADOR',
    4: 'TÉCNICO', 5: 'VETERINARIO', 6: 'DIRECTOR'
};

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    historiaId = urlParams.get('historia');
    
    const token = localStorage.getItem('token');
    const role = parseInt(localStorage.getItem('userLevel'));
    const userName = localStorage.getItem('userName');
    isAdmin = (token && [1, 2, 4, 5, 6].includes(role));

    renderAuthZone(userName, role);

    if (!historiaId) return;

    new QRCode(document.getElementById("qrcode-buffer"), {
        text: window.location.href, width: 400, height: 400
    });

    await cargarDatosQR();
});

function renderAuthZone(name, roleId) {
    const zone = document.getElementById('auth-zone');
    if (!zone) return;

    if (name && roleId) {
        zone.innerHTML = `
            <div class="me-2 text-end d-none d-md-block" style="line-height: 1.1;">
                <div class="small fw-bold text-dark">${name.toUpperCase()}</div>
                <small class="text-muted fw-bold" style="font-size: 0.65rem;">${ROLE_MAP[roleId] || 'USER'}</small>
            </div>
            <div class="d-flex align-items-center gap-2">
                <i class="bi bi-person-circle fs-4 text-primary"></i>
                <button onclick="window.cerrarSesionQR()" class="btn btn-xs btn-outline-danger py-0 px-2 shadow-sm"><i class="bi bi-box-arrow-right"></i></button>
            </div>`;
        if (isAdmin) {
            document.querySelectorAll('.admin-only').forEach(el => el.style.setProperty('display', 'flex', 'important'));
            const th = document.getElementById('th-acciones');
            if (th) th.style.setProperty('display', 'table-cell', 'important');
        }
    } else {
        zone.innerHTML = `<button onclick="window.irALogin()" class="btn btn-sm btn-outline-primary fw-bold me-2"><i class="bi bi-person-lock me-1"></i> GESTIÓN</button>`;
    }
}

async function cargarDatosQR() {
    try {
        const res = await API.request(`/alojamiento/history?historia=${historiaId}`);
        if (res.status === 'success' && res.data.length > 0) {
            currentHistoryData = res.data;
            const first = currentHistoryData[0];
            // OBTENEMOS EL ÚLTIMO TRAMO PARA LAS OBSERVACIONES
            const last = currentHistoryData[currentHistoryData.length - 1]; 
            const hoy = new Date(); hoy.setHours(12, 0, 0, 0);

            document.getElementById('txt-historia').innerText = first.historia;
            document.getElementById('txt-protocolo').innerText = `[${first.nprotA}]`;
            document.getElementById('txt-titulo').innerText = first.tituloA || 'Sin título definido';
            document.getElementById('txt-especie').innerText = first.EspeNombreA;
            document.getElementById('txt-investigador').innerText = first.Investigador;
            
            // CAMBIO: Ahora trae la observación del último tramo (el vigente)
            document.getElementById('txt-obs').innerText = last.observaciones || 'Sin observaciones recientes.';

            const esChicaGlobal = parseFloat(first.totalcajachica) > 0;
            const thCajas = document.getElementById('th-cajas');
            if (thCajas) thCajas.innerText = `TOTAL DE CAJAS (${esChicaGlobal ? 'CHICA' : 'GRANDE'})`;

            const tbody = document.getElementById('tbody-historial');
            let totalDias = 0; let totalDinero = 0;

            tbody.innerHTML = currentHistoryData.map(h => {
                const esAbierto = !h.hastafecha;
                const pIni = h.fechavisado.split('-');
                const fIni = new Date(pIni[0], pIni[1]-1, pIni[2], 12,0,0);
                let fFin = esAbierto ? hoy : new Date(h.hastafecha.split('-')[0], h.hastafecha.split('-')[1]-1, h.hastafecha.split('-')[2], 12,0,0);

                let dias = Math.max(0, Math.floor((fFin - fIni) / (1000 * 60 * 60 * 24)));
                const esChica = parseFloat(h.totalcajachica) > 0;
                const cant = esChica ? parseInt(h.totalcajachica) : parseInt(h.totalcajagrande);
                const precio = esChica ? h.preciocajachica : h.preciocajagrande;
                const subtotal = esAbierto ? (dias * precio * cant) : parseFloat(h.totalpago || 0);

                totalDias += dias; totalDinero += subtotal;

                return `
                <tr>
                    <td><span class="text-muted small">#${h.IdAlojamiento}</span></td>
                    <td>${fIni.toLocaleDateString()}</td>
                    <td class="${esAbierto ? 'text-primary fw-bold' : ''}">${esAbierto ? 'VIGENTE' : fFin.toLocaleDateString()}</td>
                    <td class="fw-bold fs-6">${cant}</td>
                    <td class="fw-bold">${dias}</td>
                    <td>$${parseFloat(precio).toFixed(2)}</td>
                    <td class="fw-bold text-success">$${subtotal.toFixed(2)}</td>
                    <td class="small text-muted italic">${h.observaciones || '---'}</td>
                    ${isAdmin ? `
                    <td>
                        <div class="btn-group shadow-sm">
                            <button class="btn btn-xs btn-outline-primary" onclick="window.modificarTramoQR(${h.IdAlojamiento})">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-xs btn-outline-danger" onclick="window.eliminarTramoQR(${h.IdAlojamiento})">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>` : ''}
                </tr>`;
            }).join('');

            document.getElementById('txt-total-dias').innerText = totalDias;
            document.getElementById('txt-total-pago').innerText = `$${totalDinero.toFixed(2)}`;

            const isFinalizado = currentHistoryData.some(h => String(h.finalizado) === "1");
            const badge = document.getElementById('badge-estado');
            if (badge) {
                badge.innerText = isFinalizado ? 'FINALIZADO' : 'ESTADÍA VIGENTE';
                badge.className = `badge rounded-pill px-3 py-2 ${isFinalizado ? 'bg-danger' : 'bg-success'}`;
            }

            if (isAdmin) renderFooterQR(isFinalizado);

            document.getElementById('qr-loader').classList.add('d-none');
            document.getElementById('qr-content').classList.remove('d-none');
        }
    } catch (e) { console.error(e); }
}

function renderFooterQR(isFinalizado) {
    const footer = document.getElementById('footer-admin');
    if (!footer) return;
    if (isFinalizado) {
        footer.innerHTML = `<button class="btn btn-sm btn-warning w-100 fw-bold" onclick="window.desfinalizarQR()">DESFINALIZAR HISTORIA</button>`;
    } else {
        footer.innerHTML = `
            <button class="btn btn-sm btn-danger fw-bold px-4 shadow-sm" onclick="window.finalizarHistoriaQR()">FINALIZAR</button>
            <button class="btn btn-sm btn-primary fw-bold px-4 shadow-sm" onclick="window.abrirActualizarQR()">ACTUALIZAR</button>`;
    }
}

// --- ACCIONES ADMIN ---

window.modificarTramoQR = (id) => {
    const tramo = currentHistoryData.find(t => t.IdAlojamiento == id);
    if (!tramo) return;

    const label = document.getElementById('edit-id-label');
    if (label) label.innerText = id;

    const inputId = document.getElementById('edit-id-alojamiento');
    if (inputId) inputId.value = id;

    const inputFecha = document.getElementById('edit-fecha-qr');
    if (inputFecha) inputFecha.value = tramo.fechavisado;

    const inputCant = document.getElementById('edit-cantidad-qr');
    if (inputCant) inputCant.value = (tramo.totalcajachica > 0) ? tramo.totalcajachica : tramo.totalcajagrande;

    const inputObs = document.getElementById('edit-obs-qr');
    if (inputObs) inputObs.value = tramo.observaciones || '';

    new bootstrap.Modal(document.getElementById('modal-editar-tramo')).show();
};

window.guardarEdicionTramo = async () => {
    const id = document.getElementById('edit-id-alojamiento').value;
    const original = currentHistoryData.find(t => t.IdAlojamiento == id);
    const esChica = parseFloat(original.totalcajachica) > 0;

    const data = {
        IdAlojamiento: parseInt(id),
        historia: parseInt(historiaId),
        fechavisado: document.getElementById('edit-fecha-qr').value,
        totalcajachica: esChica ? document.getElementById('edit-cantidad-qr').value : 0,
        totalcajagrande: !esChica ? document.getElementById('edit-cantidad-qr').value : 0,
        observaciones: document.getElementById('edit-obs-qr').value,
        IdInstitucion: localStorage.getItem('instId')
    };

    const res = await API.request('/alojamiento/update-row', 'POST', data);
    if (res.status === 'success') {
        bootstrap.Modal.getInstance(document.getElementById('modal-editar-tramo')).hide();
        await cargarDatosQR();
    }
};

window.eliminarTramoQR = async (id) => {
    const { isConfirmed } = await Swal.fire({ title: '¿Eliminar?', text: "Se borrará este tramo.", icon: 'warning', showCancelButton: true });
    if (isConfirmed) {
        const res = await API.request(`/alojamiento/delete-row?id=${id}`, 'DELETE');
        if (res.status === 'success') await cargarDatosQR();
    }
};

window.abrirActualizarQR = () => {
    const last = currentHistoryData[currentHistoryData.length - 1];
    document.getElementById('reg-fecha-qr').valueAsDate = new Date();
    document.getElementById('reg-cantidad-qr').value = (last.totalcajachica > 0) ? last.totalcajachica : last.totalcajagrande;
    new bootstrap.Modal(document.getElementById('modal-actualizar-qr')).show();
};

window.guardarNuevoTramo = async () => {
    const f = currentHistoryData[0];
    const data = {
        fechavisado: document.getElementById('reg-fecha-qr').value,
        totalcajachica: (f.totalcajachica > 0) ? document.getElementById('reg-cantidad-qr').value : 0,
        totalcajagrande: (f.totalcajagrande > 0) ? document.getElementById('reg-cantidad-qr').value : 0,
        idprotA: f.idprotA, IdUsrA: f.IdUsrA, historia: f.historia,
        is_update: true, IdInstitucion: localStorage.getItem('instId'),
        observaciones: document.getElementById('reg-obs-qr').value
    };
    const res = await API.request('/alojamiento/save', 'POST', data);
    if (res.status === 'success') {
        bootstrap.Modal.getInstance(document.getElementById('modal-actualizar-qr')).hide();
        await cargarDatosQR();
    }
};

window.cerrarSesionQR = () => {
    localStorage.removeItem('token'); localStorage.removeItem('userId');
    localStorage.removeItem('userLevel'); localStorage.removeItem('userName');
    window.location.reload();
};

window.irALogin = () => {
    localStorage.setItem('redirectAfterLogin', window.location.href);
    window.location.href = `../${localStorage.getItem('NombreInst')}/`; 
};

window.abrirModalPersonalizar = () => { new bootstrap.Modal(document.getElementById('modal-personalizar-qr')).show(); };

window.confirmarDescargaPDF = () => {
    const { jsPDF } = window.jspdf;
    const sizeType = document.getElementById('qr-custom-size').value;
    const config = { chico: [50, 50], mediano: [80, 80], grande: [100, 100] };
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: config[sizeType] });
    const midX = config[sizeType][0] / 2;

    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    const tit = document.getElementById('qr-custom-title').value;
    if (tit) doc.text(tit, midX, 10, { align: 'center' });

    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    const txt = document.getElementById('qr-custom-text').value;
    if (txt) doc.text(txt, midX, 15, { align: 'center' });

    const qrImg = document.getElementById("qrcode-buffer").querySelector("img") || document.getElementById("qrcode-buffer").querySelector("canvas");
    if (qrImg) {
        const qrBase64 = qrImg.src || qrImg.toDataURL("image/png");
        doc.addImage(qrBase64, 'PNG', 15, 20, 50, 50);
        doc.save(`Etiqueta_H${historiaId}.pdf`);
    }
};