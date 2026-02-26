import { API } from '../../api.js';
import { TrazabilidadUI } from './alojamientos/trazabilidad.js'; 
let isAdmin = false;
let currentHistoryData = [];
let historiaId = null;

// =========================================================================
// 1. FUNCIONES GLOBALES EXPUESTAS (Para que funcionen los OnClick del HTML)
// =========================================================================

window.cambiarIdiomaQR = (lang) => {
    localStorage.setItem('idioma', lang);
    window.location.reload();
};

window.cerrarSesionQR = () => {
    localStorage.removeItem('token'); 
    localStorage.removeItem('userLevel'); 
    window.location.reload();
};

window.irALogin = () => {
    localStorage.setItem('redirectAfterLogin', window.location.href);
    const inst = localStorage.getItem('NombreInst') || '';
    const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/';
    window.location.href = `${basePath}${inst}/`; 
};

window.abrirModalPersonalizar = () => { 
    new bootstrap.Modal(document.getElementById('modal-personalizar-qr')).show(); 
};

window.exportarHistoriaPDF = async () => {
    const instId = localStorage.getItem('instId_temp_qr') || localStorage.getItem('instId') || 1;
    
    // Mostramos un loading porque el PDF se genera en el backend
    Swal.fire({ title: 'Generando PDF...', didOpen: () => Swal.showLoading() });
    
    try {
        // Pedimos al backend que nos devuelva el archivo
        const response = await fetch(API.urlBase + `/alojamiento/export?alojamientos=true&trazabilidad=true&formato=pdf&historia=${historiaId}&instId=${instId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error("Fallo al generar PDF");

        // Convertimos la respuesta binaria a un Blob y lo descargamos
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Historia_${historiaId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        
        Swal.close();
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'No se pudo generar el PDF', 'error');
    }
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
        doc.save(`QR_Etiqueta_H${historiaId}.pdf`);
        bootstrap.Modal.getInstance(document.getElementById('modal-personalizar-qr')).hide();
    }
};

// --- FUNCIONES DE ADMINISTRADOR ---

window.finalizarHistoriaQR = async () => {
    const { isConfirmed } = await Swal.fire({ title: '¿Finalizar Estadía?', icon: 'warning', showCancelButton: true });
    if (isConfirmed) {
        const res = await API.request('/alojamiento/finalize', 'POST', { historia: historiaId });
        if (res.status === 'success') window.location.reload();
    }
};

window.desfinalizarQR = async () => {
    const { isConfirmed } = await Swal.fire({ title: '¿Desfinalizar?', icon: 'warning', showCancelButton: true });
    if (isConfirmed) {
        const res = await API.request('/alojamiento/unfinalize', 'POST', { historia: historiaId });
        if (res.status === 'success') window.location.reload();
    }
};

window.abrirActualizarQR = () => {
    const last = currentHistoryData[currentHistoryData.length - 1];
    document.getElementById('reg-fecha-qr').valueAsDate = new Date();
    document.getElementById('reg-cantidad-qr').value = last.CantidadCaja || 1;
    new bootstrap.Modal(document.getElementById('modal-actualizar-qr')).show();
};

window.guardarNuevoTramo = async () => {
    const f = currentHistoryData[0];
    const data = {
        fechavisado: document.getElementById('reg-fecha-qr').value,
        CantidadCaja: parseInt(document.getElementById('reg-cantidad-qr').value) || 0,
        IdTipoAlojamiento: f.IdTipoAlojamiento || 1,
        idprotA: f.idprotA, 
        IdUsrA: f.IdUsrA, 
        historia: f.historia,
        TipoAnimal: f.TipoAnimal || f.idespA,
        is_update: true, 
        IdInstitucion: localStorage.getItem('instId_temp_qr') || 1,
        observaciones: document.getElementById('reg-obs-qr').value || ""
    };
    const res = await API.request('/alojamiento/save', 'POST', data);
    if (res.status === 'success') {
        bootstrap.Modal.getInstance(document.getElementById('modal-actualizar-qr')).hide();
        await cargarDatosQR();
    }
};

window.modificarTramoQR = (id) => {
    const tramo = currentHistoryData.find(t => t.IdAlojamiento == id);
    if (!tramo) return;
    document.getElementById('edit-id-label').innerText = id;
    document.getElementById('edit-id-alojamiento').value = id;
    document.getElementById('edit-fecha-qr').value = tramo.fechavisado;
    document.getElementById('edit-cantidad-qr').value = tramo.CantidadCaja || 0;
    document.getElementById('edit-obs-qr').value = tramo.observaciones || '';
    new bootstrap.Modal(document.getElementById('modal-editar-tramo')).show();
};

window.guardarEdicionTramo = async () => {
    const data = {
        IdAlojamiento: parseInt(document.getElementById('edit-id-alojamiento').value),
        historia: parseInt(historiaId),
        fechavisado: document.getElementById('edit-fecha-qr').value,
        CantidadCaja: parseInt(document.getElementById('edit-cantidad-qr').value) || 0,
        observaciones: document.getElementById('edit-obs-qr').value || "",
        IdInstitucion: localStorage.getItem('instId_temp_qr') || 1
    };
    const res = await API.request('/alojamiento/update-row', 'POST', data);
    if (res.status === 'success') {
        bootstrap.Modal.getInstance(document.getElementById('modal-editar-tramo')).hide();
        await cargarDatosQR();
    }
};

window.eliminarTramoQR = async (idAlojamiento) => {
    const { isConfirmed } = await Swal.fire({ 
        title: '¿Eliminar tramo?', 
        text: "Se borrará físicamente junto con sus observaciones.", 
        icon: 'warning', 
        showCancelButton: true 
    });
    if (isConfirmed) {
        const res = await API.request('/alojamiento/delete-row', 'POST', { IdAlojamiento: idAlojamiento, historia: historiaId });
        if (res.status === 'success') await cargarDatosQR();
    }
};

// =========================================================================
// 2. LÓGICA PRINCIPAL DE INICIALIZACIÓN
// =========================================================================

const ROLE_MAP = { 1: 'SUPERADMIN', 2: 'ADMINISTRADOR', 3: 'INVESTIGADOR', 4: 'TÉCNICO', 5: 'VETERINARIO', 6: 'DIRECTOR' };

export const initQRPage = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    historiaId = urlParams.get('historia');
    
    if (!historiaId) {
        mostrarErrorCritico("Falta el ID de historia en la URL."); return;
    }

    const lbl = document.getElementById('current-lang-lbl');
    if(lbl) lbl.innerText = (localStorage.getItem('idioma') || 'es').toUpperCase();

    const token = localStorage.getItem('token');
    const role = parseInt(localStorage.getItem('userLevel'));
    const userName = localStorage.getItem('userName');
    isAdmin = (token && [1, 2, 4, 5, 6].includes(role));

    renderAuthZone(userName, role);

    try {
        new QRCode(document.getElementById("qrcode-buffer"), { text: window.location.href, width: 400, height: 400 });
    } catch(e) {}

    window.TrazabilidadUI = TrazabilidadUI;
    window.TrazabilidadUI.isReadOnly = !isAdmin;

    await cargarDatosQR();
};

function renderAuthZone(name, roleId) {
    const zone = document.getElementById('auth-zone');
    const txt = window.txt.alojamientos || {};

    if (name && roleId) {
        zone.innerHTML = `
            <div class="me-2 text-end d-none d-md-block" style="line-height: 1.1;">
                <div class="small fw-bold text-dark">${name.toUpperCase()}</div>
                <small class="text-muted fw-bold" style="font-size: 0.65rem;">${ROLE_MAP[roleId] || 'USER'}</small>
            </div>
            <i class="bi bi-person-circle fs-4 text-primary me-2"></i>
            <button onclick="window.cerrarSesionQR()" class="btn btn-xs btn-outline-danger py-0 px-2 shadow-sm"><i class="bi bi-box-arrow-right"></i></button>`;
            
        if (isAdmin) {
            document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('admin-only', 'd-none'));
        }
    } else {
        zone.innerHTML = `<button onclick="window.irALogin()" class="btn btn-sm btn-outline-primary fw-bold"><i class="bi bi-person-lock me-1"></i> ${txt.qr_login || 'ACCESO PERSONAL'}</button>`;
    }
}

async function cargarDatosQR() {
    try {
        const res = await API.request(`/alojamiento/history?historia=${historiaId}`);
        
        if (res.status === 'success' && res.data && res.data.length > 0) {
            currentHistoryData = res.data;
            const first = currentHistoryData[0];
            const last = currentHistoryData[currentHistoryData.length - 1]; 
            const hoy = new Date(); hoy.setHours(12, 0, 0, 0);
            const txt = window.txt.alojamientos || {};

            localStorage.setItem('instId_temp_qr', first.IdInstitucion || 1);

            document.getElementById('txt-historia').innerText = first.historia;
            document.getElementById('txt-protocolo').innerText = `[${first.nprotA}]`;
            document.getElementById('txt-titulo').innerText = first.tituloA || '---';
            document.getElementById('txt-tipo-alojamiento').innerText = first.NombreTipoAlojamiento || txt.box_name || 'Caja';
            document.getElementById('txt-especie').innerText = first.EspeNombreA;
            document.getElementById('txt-investigador').innerText = first.Investigador;
            document.getElementById('txt-obs').innerText = last.observaciones || '---';

            // --- NUEVO: INYECTAR CONTACTO DEL INVESTIGADOR CLICKEABLE ---
            const containerContacto = document.getElementById('container-contacto');
            if (containerContacto) {
                let htmlContacto = '';
                
                // Botón Email (abre gestor de correos)
                if (first.EmailInvestigador && first.EmailInvestigador !== 'No registrado') {
                    htmlContacto += `
                        <a href="mailto:${first.EmailInvestigador}?subject=Consulta sobre Historia #${first.historia}" class="text-decoration-none text-primary small fw-bold">
                            <i class="bi bi-envelope-at-fill me-1"></i> ${first.EmailInvestigador}
                        </a>
                    `;
                }
                
                // Botón Teléfono (abre marcador en celulares)
                if (first.CelularInvestigador && first.CelularInvestigador !== 'No registrado') {
                    htmlContacto += `
                        <a href="tel:${first.CelularInvestigador.replace(/\D/g,'')}" class="text-decoration-none text-success small fw-bold">
                            <i class="bi bi-telephone-fill me-1"></i> ${first.CelularInvestigador}
                        </a>
                    `;
                }

                if (htmlContacto === '') {
                    htmlContacto = '<span class="text-muted small italic">Sin datos de contacto</span>';
                }

                containerContacto.innerHTML = htmlContacto;
            }
            // -------------------------------------------------------------

            const thCajas = document.getElementById('th-cajas');
            if (thCajas) thCajas.innerText = txt.th_boxes || 'CAJAS';

            const tbody = document.getElementById('tbody-historial');
            let totalDias = 0;

            tbody.innerHTML = currentHistoryData.map(h => {
                const esAbierto = !h.hastafecha;
                const pIni = h.fechavisado.split('-');
                const fIni = new Date(pIni[0], pIni[1]-1, pIni[2], 12,0,0);
                let fFin = esAbierto ? hoy : new Date(h.hastafecha.split('-')[0], h.hastafecha.split('-')[1]-1, h.hastafecha.split('-')[2], 12,0,0);

                let dias = Math.max(0, Math.floor((fFin - fIni) / (1000 * 60 * 60 * 24)));
                const cant = parseInt(h.CantidadCaja || 0);
                totalDias += dias;

                // CUIDADO AQUÍ CON EL ID DE ESPECIE AL ABRIR TRAZABILIDAD
                const espId = h.TipoAnimal || h.idespA || first.TipoAnimal || first.idespA || 0;

                return `
                <tr class="pointer table-light" onclick="window.TrazabilidadUI.toggleRow(${h.IdAlojamiento}, ${espId})">
                    <td><span class="text-muted small">#${h.IdAlojamiento}</span></td>
                    <td>${fIni.toLocaleDateString()}</td>
                    <td class="${esAbierto ? 'text-primary fw-bold' : ''}">${esAbierto ? (txt.status_active || 'Vigente') : fFin.toLocaleDateString()}</td>
                    <td class="fw-bold fs-6">${cant} <small class="text-muted fw-normal">${h.NombreTipoAlojamiento || ''}</small></td>
                    <td class="fw-bold">${dias}</td>
                    
                    <td class="small text-muted italic">${h.observaciones || '---'}</td>
                    
                    <td class="${isAdmin ? '' : 'd-none'}" onclick="event.stopPropagation()">
                        <div class="btn-group shadow-sm">
                            <button class="btn btn-xs btn-outline-primary" onclick="window.modificarTramoQR(${h.IdAlojamiento})"><i class="bi bi-pencil"></i></button>
                            <button class="btn btn-xs btn-outline-danger" onclick="window.eliminarTramoQR(${h.IdAlojamiento})"><i class="bi bi-trash"></i></button>
                        </div>
                    </td>
                </tr>
                <tr id="trazabilidad-row-${h.IdAlojamiento}" class="d-none bg-white">
                    <td colspan="${isAdmin ? 7 : 6}" class="p-0 border-0">
                        <div id="trazabilidad-content-${h.IdAlojamiento}" class="p-3 border-start border-4 border-primary shadow-inner bg-light"></div>
                    </td>
                </tr>`;
            }).join('');

            document.getElementById('txt-total-dias').innerText = totalDias;

            const isFinalizado = currentHistoryData.some(h => String(h.finalizado) === "1");
            const badge = document.getElementById('badge-estado');
            if (badge) {
                badge.innerText = isFinalizado ? (txt.status_finished || 'FINALIZADO') : (txt.status_active || 'VIGENTE');
                badge.className = `badge rounded-pill px-3 py-2 text-uppercase ${isFinalizado ? 'bg-danger' : 'bg-success'}`;
            }

            if (isAdmin) renderFooterQR(isFinalizado);

            document.getElementById('qr-loader').classList.add('d-none');
            document.getElementById('qr-content').classList.remove('d-none');
        } else {
            mostrarErrorCritico("No se encontraron datos para esta historia.");
        }
    } catch (e) { 
        console.error(e); mostrarErrorCritico(`Error de conexión con el servidor.`);
    }
}

function renderFooterQR(isFinalizado) {
    const footer = document.getElementById('footer-admin');
    const txt = window.txt.alojamientos || {};
    if (!footer) return;
    
    if (isFinalizado) {
        footer.innerHTML = `<button class="btn btn-sm btn-warning w-100 fw-bold text-uppercase" onclick="window.desfinalizarQR()">${txt.btn_unfinalize || 'Desfinalizar'}</button>`;
    } else {
        footer.innerHTML = `
            <button class="btn btn-sm btn-danger fw-bold px-4 shadow-sm text-uppercase" onclick="window.finalizarHistoriaQR()">${txt.btn_finish || 'Finalizar'}</button>
            <button class="btn btn-sm btn-primary fw-bold px-4 shadow-sm text-uppercase" onclick="window.abrirActualizarQR()">${txt.btn_update_stay || 'Actualizar Tramo'}</button>`;
    }
}

function mostrarErrorCritico(mensaje) {
    document.getElementById('qr-loader').innerHTML = `<i class="bi bi-exclamation-octagon text-danger" style="font-size: 3rem;"></i><h5 class="mt-3 fw-bold text-danger">Error</h5><p class="text-muted">${mensaje}</p>`;
}