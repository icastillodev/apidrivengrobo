import { API } from '../../api.js';
import { TrazabilidadUI } from './alojamientos/trazabilidad.js'; 

let isAdmin = false;
let currentHistoryData = [];
let historiaId = null;
let tokenQR = null;

// =========================================================================
// 1. FUNCIONES GLOBALES EXPUESTAS (Para que funcionen los OnClick del HTML)
// =========================================================================

window.cambiarIdiomaQR = (lang) => {
    localStorage.setItem('lang', lang);
    localStorage.setItem('idioma', lang); // compat
    window.location.reload();
};

window.cerrarSesionQR = () => {
    localStorage.removeItem('token'); 
    localStorage.removeItem('userLevel'); 
    localStorage.removeItem('userName'); 
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
    const token = localStorage.getItem('token');
    const t = window.txt?.alojamientos || {};
    
    Swal.fire({ title: (t.qr_swal_generating_pdf || 'Generando PDF...'), didOpen: () => Swal.showLoading() });
    
    try {
        // Usuario logueado: usar export con sesión (blob)
        if (token) {
            const response = await fetch(API.urlBase + `/alojamiento/export?alojamientos=true&trazabilidad=true&formato=pdf&historia=${historiaId}&instId=${instId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(t.qr_pdf_fail || "Fallo al generar PDF");
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
            return;
        }

        // Vista pública (QR sin login): exportación por token → JSON → generar PDF en front
        if (!tokenQR) {
            Swal.close();
            Swal.fire('Error', window.txt?.alojamientos?.qr_swal_error_no_link || 'No hay enlace de etiqueta activo para exportar.', 'error');
            return;
        }
        const res = await fetch(API.urlBase + `/alojamiento/public-export?token=${tokenQR}`);
        const json = await res.json();
        if (json.status !== 'success' || !json.data) throw new Error(json.message || (t.qr_error_obtener_datos || 'Error al obtener datos'));

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        let y = 15;
        const lineH = 6;

        doc.setFontSize(14);
        doc.text(`Historia #${json.historia}`, 14, y); y += lineH + 2;
        doc.setFontSize(10);

        if (json.data.alojamientos && json.data.alojamientos.length) {
            doc.setFont(undefined, 'bold');
            doc.text(t.qr_pdf_registros_alojamiento || 'Registros de alojamiento', 14, y); y += lineH;
            doc.setFont(undefined, 'normal');
            json.data.alojamientos.forEach(row => {
                const vig = row.finalizado == 1 ? 'FINALIZADO' : (t.qr_vigente || 'VIGENTE');
                doc.text(`${row.fechavisado} - ${row.hastafecha || (t.qr_vigente || 'Vigente')} | ${row.CantidadCaja} ${t.qr_cajas_minus || 'cajas'} | ${row.nprotA} | ${vig}`, 14, y);
                y += lineH;
                if (y > 270) { doc.addPage(); y = 15; }
            });
            y += 4;
        }

        if (json.data.trazabilidad && json.data.trazabilidad.length) {
            doc.setFont(undefined, 'bold');
            doc.text(t.qr_pdf_trazabilidad_clinica || 'Trazabilidad clínica', 14, y); y += lineH;
            doc.setFont(undefined, 'normal');
            json.data.trazabilidad.forEach(row => {
                doc.text(`${row.NombreCaja} | ${row.Sujeto} | ${row.fechaObs} | ${row.Metrica}: ${row.Valor}`, 14, y);
                y += lineH;
                if (y > 270) { doc.addPage(); y = 15; }
            });
        }

        doc.save(`Historia_${json.historia}.pdf`);
        Swal.close();
    } catch (e) {
        console.error(e);
        Swal.close();
        const t = window.txt?.alojamientos || {};
        const fallback = t.qr_pdf_fail || 'No se pudo generar el PDF';
        Swal.fire(window.txt?.generales?.error || 'Error', (e.message || fallback), 'error');
    }
};

// 🚀 NUEVA GENERACIÓN DE PDF BLINDADA (CON TOKENS)
window.confirmarDescargaPDF = async () => {
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

    try {
        Swal.fire({ title: (window.txt?.alojamientos?.qr_swal_etiqueta_title || 'Generando Etiqueta Segura...'), didOpen: () => Swal.showLoading() });

        // 1. Pedimos al Backend que genere (o recupere) el Token random de 6 letras
        const resToken = await API.request('/alojamiento/generar-qr', 'POST', { historia: historiaId });
        
        if (resToken.status !== 'success') throw new Error(window.txt?.alojamientos?.qr_error_codigo_seguro || "No se pudo generar el código seguro.");

        // 2. Armamos la URL corta y pública
        const basePath = window.location.origin + ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/');
        const publicUrl = `${basePath}qr/${resToken.codigo}`;

        // 3. Dibujamos el QR en un div temporal e invisible
        const tempDiv = document.createElement('div');
        new QRCode(tempDiv, { text: publicUrl, width: 400, height: 400 });

        // 4. Esperamos 100ms para que la librería termine de renderizar la imagen
        setTimeout(() => {
            const qrImg = tempDiv.querySelector("img") || tempDiv.querySelector("canvas");
            if (qrImg) {
                const qrBase64 = qrImg.src || qrImg.toDataURL("image/png");
                doc.addImage(qrBase64, 'PNG', midX - (cfg.qrSize / 2), cfg.qrY, cfg.qrSize, cfg.qrSize);
                doc.save(`QR_Etiqueta_H${historiaId}.pdf`);
                bootstrap.Modal.getInstance(document.getElementById('modal-personalizar-qr')).hide();
                Swal.close();
            } else {
                Swal.fire('Error', window.txt?.alojamientos?.qr_swal_error_render || 'No se pudo renderizar la imagen QR.', 'error');
            }
        }, 150);

    } catch (error) {
        console.error(error);
        Swal.fire('Error', window.txt?.alojamientos?.qr_swal_error_etiqueta || 'Hubo un problema al generar la etiqueta.', 'error');
    }
};

// --- FUNCIONES DE ADMINISTRADOR ---

window.finalizarHistoriaQR = async () => {
    const txt = window.txt?.alojamientos;
    const { isConfirmed } = await Swal.fire({ title: txt?.qr_swal_finalizar_title || '¿Finalizar Estadía?', icon: 'warning', showCancelButton: true });
    if (isConfirmed) {
        const res = await API.request('/alojamiento/finalize', 'POST', { historia: historiaId });
        if (res.status === 'success') window.location.reload();
    }
};

window.desfinalizarQR = async () => {
    const txt = window.txt?.alojamientos;
    const { isConfirmed } = await Swal.fire({ title: txt?.qr_swal_desfinalizar_title || '¿Desfinalizar?', icon: 'warning', showCancelButton: true });
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
        await cargarDatosQR(historiaId, tokenQR); // Recargamos usando las variables activas
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
        await cargarDatosQR(historiaId, tokenQR);
    }
};

window.eliminarTramoQR = async (idAlojamiento) => {
    const txt = window.txt?.alojamientos;
    const { isConfirmed } = await Swal.fire({
        title: txt?.qr_swal_eliminar_title || '¿Eliminar tramo?',
        text: txt?.qr_swal_eliminar_text || "Se borrará físicamente junto con sus observaciones.",
        icon: 'warning',
        showCancelButton: true
    });
    if (isConfirmed) {
        const res = await API.request('/alojamiento/delete-row', 'POST', { IdAlojamiento: idAlojamiento, historia: historiaId });
        if (res.status === 'success') await cargarDatosQR(historiaId, tokenQR);
    }
};

// =========================================================================
// 2. LÓGICA PRINCIPAL DE INICIALIZACIÓN
// =========================================================================

const ROLE_MAP = {
    1: () => window.txt?.alojamientos?.qr_rol_superadmin || 'SUPERADMIN',
    2: () => window.txt?.alojamientos?.qr_rol_admin || 'ADMINISTRADOR',
    3: () => window.txt?.alojamientos?.qr_rol_investigador || 'INVESTIGADOR',
    4: () => window.txt?.alojamientos?.qr_rol_tecnico || 'TÉCNICO',
    5: () => window.txt?.alojamientos?.qr_rol_veterinario || 'VETERINARIO',
    6: () => window.txt?.alojamientos?.qr_rol_director || 'DIRECTOR'
};

export const initQRPage = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const historiaParam = urlParams.get('historia');
    tokenQR = urlParams.get('token'); 

    // 🚀 EL FIX MAESTRO: Atrapa 6 letras/números que estén justo después de "/qr/"
    if (!tokenQR) {
        const match = window.location.href.match(/\/qr\/([a-zA-Z0-9]{6})/);
        if (match) {
            tokenQR = match[1]; // ¡Atrapado! (ej: wr98ug)
        }
    }
    
    // 📡 RADAR PARA LA CONSOLA (F12) - Te dirá si el JS nuevo está corriendo
    console.log("📍 URL que lee JS:", window.location.href);
    console.log("🔑 Token atrapado por JS:", tokenQR);

    // 🚀 BLINDAJE CON MENSAJE DETALLADO
    if (!historiaParam && !tokenQR) {
        mostrarErrorCritico(window.txt?.alojamientos?.qr_error_enlace_invalido || "Enlace inválido o incompleto. Revisa la consola."); 
        return;
    }

    const lbl = document.getElementById('current-lang-lbl');
    if(lbl) lbl.innerText = (localStorage.getItem('lang') || localStorage.getItem('idioma') || 'es').toUpperCase();

    const token = localStorage.getItem('token');
    const role = parseInt(localStorage.getItem('userLevel'));
    const userName = localStorage.getItem('userName');
    isAdmin = (token && [1, 2, 4, 5, 6].includes(role));

    renderAuthZone(userName, role);

    window.TrazabilidadUI = TrazabilidadUI;
    window.TrazabilidadUI.isReadOnly = !isAdmin;

    await cargarDatosQR(historiaParam, tokenQR);
};

function renderAuthZone(name, roleId) {
    const zone = document.getElementById('auth-zone');
    const txt = window.txt.alojamientos || {};

    if (name && roleId) {
        zone.innerHTML = `
            <div class="me-2 text-end d-none d-md-block" style="line-height: 1.1;">
                <div class="small fw-bold text-dark">${name.toUpperCase()}</div>
                <small class="text-muted fw-bold" style="font-size: 0.65rem;">${(typeof ROLE_MAP[roleId] === 'function' ? ROLE_MAP[roleId]() : ROLE_MAP[roleId]) || 'USER'}</small>
            </div>
            <i class="bi bi-person-circle fs-4 text-primary me-2"></i>
            <button onclick="window.cerrarSesionQR()" class="btn btn-xs btn-outline-danger py-0 px-2 shadow-sm"><i class="bi bi-box-arrow-right"></i></button>`;
            
        if (isAdmin) {
            document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('admin-only', 'd-none'));
        }
    } else {
        zone.innerHTML = `<button onclick="window.irALogin()" class="btn btn-sm btn-outline-primary fw-bold"><i class="bi bi-person-lock me-1"></i> ${txt.qr_login_btn || txt.qr_login || 'ACCESO PERSONAL'}</button>`;
    }
}

async function cargarDatosQR(hParam, tParam) {
    try {
        let res;
        
        // 🚀 DOBLE ENTRADA INTELIGENTE:
        if (hParam) {
            // Modo Admin (Interno): Usa la API que pide Token
            res = await API.request(`/alojamiento/history?historia=${hParam}`);
            historiaId = hParam;
        } else if (tParam) {
            // Modo Público (Escaneo QR): Usa la nueva API blindada basada en Token
            res = await API.request(`/alojamiento/public-history?token=${tParam}`);
        }
        
        if (res && res.status === 'success' && res.data && res.data.length > 0) {
            currentHistoryData = res.data;
            const first = currentHistoryData[0];
            const last = currentHistoryData[currentHistoryData.length - 1]; 
            const hoy = new Date(); hoy.setHours(12, 0, 0, 0);
            const txt = window.txt.alojamientos || {};

            // Si entró por QR público, descubrimos qué historia es realmente
            if (tParam) historiaId = first.historia;

            localStorage.setItem('instId_temp_qr', first.IdInstitucion || 1);

            document.getElementById('txt-historia').innerText = first.historia;
            document.getElementById('txt-protocolo').innerText = `[${first.nprotA}]`;
            document.getElementById('txt-titulo').innerText = first.tituloA || '---';
            document.getElementById('txt-tipo-alojamiento').innerText = first.NombreTipoAlojamiento || txt.box_name || 'Caja';
            document.getElementById('txt-especie').innerText = first.EspeNombreA;
            document.getElementById('txt-investigador').innerText = first.Investigador;
            document.getElementById('txt-obs').innerText = last.observaciones || '---';

            const containerContacto = document.getElementById('container-contacto');
            if (containerContacto) {
                let htmlContacto = '';
                
                if (first.EmailInvestigador && first.EmailInvestigador !== 'No registrado') {
                    htmlContacto += `
                        <a href="mailto:${first.EmailInvestigador}?subject=Consulta sobre Historia #${first.historia}" class="text-decoration-none text-primary small fw-bold">
                            <i class="bi bi-envelope-at-fill me-1"></i> ${first.EmailInvestigador}
                        </a>
                    `;
                }
                
                if (first.CelularInvestigador && first.CelularInvestigador !== 'No registrado') {
                    htmlContacto += `
                        <a href="tel:${first.CelularInvestigador.replace(/\D/g,'')}" class="text-decoration-none text-success small fw-bold">
                            <i class="bi bi-telephone-fill me-1"></i> ${first.CelularInvestigador}
                        </a>
                    `;
                }

                if (htmlContacto === '') {
                    htmlContacto = `<span class="text-muted small italic">${txt.qr_sin_contacto || 'Sin datos de contacto'}</span>`;
                }

                containerContacto.innerHTML = htmlContacto;
            }

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
            mostrarErrorCritico(txt.qr_error_no_data || "No se encontraron datos para esta historia o enlace revocado.");
        }
    } catch (e) {
        console.error(e); mostrarErrorCritico(window.txt?.alojamientos?.qr_error_denied || "Acceso Denegado o Error de conexión.");
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
    const t = window.txt?.alojamientos || {};
    const msg = mensaje || t.qr_error_init || 'Error';
    const title = window.txt?.generales?.error || 'Error';
    document.getElementById('qr-loader').innerHTML = `<i class="bi bi-exclamation-octagon text-danger" style="font-size: 3rem;"></i><h5 class="mt-3 fw-bold text-danger">${title}</h5><p class="text-muted">${msg}</p>`;
}