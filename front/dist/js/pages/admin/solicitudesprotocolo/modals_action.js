import { sendDecision, loadRequests } from './api_service.js';
import { API } from '../../../api.js';

// --- CONFIGURACIÓN DEL FORMULARIO (SUBMIT) ---
export function setupModal() {
    const form = document.getElementById('form-decision');
    if(form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            
            // 1. Obtener decisión y textos
            const val = document.getElementById('decision-val').value;
            const isApprove = val == 1;
            const txt = window.txt?.solicitudprotocolo?.modal || {};
            
            // 2. Bloquear botones
            const btns = form.querySelectorAll('button');
            btns.forEach(b => b.disabled = true);

            // 3. Efecto de carga visual en el botón activo
            // Buscamos el botón por su clase de color (success=Aprobar, danger=Rechazar)
            const activeBtn = isApprove 
                ? form.querySelector('.btn-success') 
                : form.querySelector('.btn-danger');
            
            let originalText = "";
            if(activeBtn) {
                originalText = activeBtn.innerHTML;
                activeBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> ' + (txt.enviando || 'Enviando...');
            }

            // 4. Enviar datos al servidor
            const fd = new FormData(e.target);
            const res = await sendDecision(fd);

            // 5. Manejar Resultado
            if (res.status === 'success') {
                bootstrap.Modal.getInstance(document.getElementById('modal-details')).hide();
                
                window.Swal.fire({
                    icon: 'success',
                    title: isApprove ? (txt.titulo_aprobado || '¡Aprobado!') : (txt.titulo_rechazado || 'Rechazado'),
                    text: txt.texto_procesado || 'Solicitud procesada y notificación enviada.',
                    confirmButtonColor: '#1a5d3b'
                });
                
                loadRequests(); // Recargar la tabla de fondo
            } else {
                window.Swal.fire('Error', res.message, 'error');
            }

            // 6. Restaurar estado de botones
            btns.forEach(b => b.disabled = false);
            if(activeBtn) activeBtn.innerHTML = originalText;
        };
    }
}

// --- FUNCIÓN PARA ABRIR EL MODAL (Desde la tabla) ---
export async function openRequestDetails(row) {
    // Helper seguro para asignar texto sin romper si el ID no existe
    const setVal = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    const sp = window.txt?.solicitudprotocolo || {};
    const txt = sp.modal || {};
    const tabla = sp.tabla || {};

    // 1. IDs ocultos para el formulario
    document.getElementById('decision-id').value = row.idSolicitudProtocolo;
    document.getElementById('decision-val').value = ""; // Se define al clickear el botón

    // 2. Llenar Textos Visuales
    setVal('view-sol-id', `#SOL-${row.idSolicitudProtocolo}`);
    setVal('view-nprot-header', `ID: ${row.nprotA}`);
    
    setVal('view-titulo', row.tituloA);
    setVal('view-nprot', row.nprotA); // N° Protocolo
    
    // Fechas
    setVal('view-inicio', row.FechaIniProtA || '-');
    setVal('view-vence', row.FechaFinProtA || '-');

    // Datos Personas
    setVal('view-investigator', row.Solicitante || (tabla.desconocido || 'Desconocido'));
    setVal('view-email', row.Email || '');
    setVal('view-director', row.InvestigadorACargA || '-');
    
    // Datos Técnicos
    setVal('view-depto', row.DeptoFormat || (txt.no_especificado || 'No especificado'));
    setVal('view-tipo', row.TipoNombre || (txt.estandar || 'Estándar'));
    setVal('view-cant', row.CantidadAniA || '0');
    setVal('view-especies', row.Especies || (txt.no_registradas || 'No registradas'));
    setVal('view-origin', row.Origen || (txt.interno || 'Interno'));

    // 3. Badge de Tipo (HTML)
    const isInternal = row.TipoEtiqueta === 'INTERNA';
    const badgeHtml = isInternal 
        ? `<span class="badge badge-type-internal px-3 py-2 text-uppercase">${(tabla.tipo_interna || 'INTERNA')}</span>`
        : `<span class="badge badge-type-network px-3 py-2 text-uppercase"><i class="bi bi-globe me-2"></i>${txt.solicitud_red || 'SOLICITUD DE RED'}</span>`;
    
    const badgeContainer = document.getElementById('view-badge');
    if(badgeContainer) badgeContainer.innerHTML = badgeHtml;

    // 4. Textos de Ayuda y Placeholder (Traducción)
    const textArea = document.querySelector('textarea[name="mensaje"]');
    
    if(textArea) {
        textArea.value = ""; // Limpiar mensaje anterior
        textArea.placeholder = txt.placeholder || "Escriba...";
    }
    
    // Reemplazo dinámico del email en el texto de ayuda
    const emailUser = row.Email ? row.Email : 'el usuario';
    const helpText = (txt.ayuda_mensaje || "Se enviará a: {email}").replace('{email}', emailUser);
    setVal('msg-help-text', helpText);

    // 5. Adjuntos (si existen)
    const attachmentsBlock = document.getElementById('attachments-block');
    const attachmentsList = document.getElementById('view-attachments');
    if (attachmentsBlock && attachmentsList) {
        attachmentsList.innerHTML = '';
        attachmentsBlock.classList.add('d-none');

        try {
            const res = await API.request(`/admin/requests/attachments?id=${row.idSolicitudProtocolo}`);
            if (res.status === 'success' && Array.isArray(res.data) && res.data.length > 0) {
                const m = window.txt?.solicitudprotocolo?.modal || {};
                res.data.forEach(att => {
                    const li = document.createElement('li');
                    let label;
                    if (att.tipoadjunto == 1) label = m.adjunto_protocolo || 'Protocolo';
                    else if (att.tipoadjunto == 2) label = m.adjunto_aval || 'Aval';
                    else label = m.adjunto_otro || 'Otro';

                    const base = API.urlBase || '';
                    const url = `${base}/admin/requests/attachments/download?id=${att.Id_adjuntos_protocolos}`;
                    li.innerHTML = `<button type="button" class="btn btn-link p-0 text-decoration-none">
                        <i class="bi bi-paperclip me-1"></i><strong>${label}:</strong> <span class="text-decoration-underline">${att.nombre_original}</span>
                    </button>`;
                    const btn = li.querySelector('button');
                    btn.onclick = async () => {
                        try {
                            window.Swal?.fire({
                                title: 'Descargando archivo...',
                                html: 'Espere un momento',
                                allowOutsideClick: false,
                                allowEscapeKey: false,
                                didOpen: () => window.Swal.showLoading()
                            });
                            const token = sessionStorage.getItem('token') || localStorage.getItem('token');
                            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                            const res = await fetch(url, { headers });
                            if (!res.ok) {
                                const text = await res.text();
                                console.error('Error descargando adjunto admin:', text);
                                window.Swal?.close();
                                window.Swal?.fire('Error', 'No se pudo descargar el archivo.', 'error');
                                return;
                            }
                            const blob = await res.blob();
                            window.Swal?.close();
                            const blobUrl = URL.createObjectURL(blob);
                            window.open(blobUrl, '_blank');
                            setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
                        } catch (err) {
                            console.error('Error de red al descargar adjunto admin:', err);
                            window.Swal?.close();
                            window.Swal?.fire('Error', 'Error de red al descargar el archivo.', 'error');
                        }
                    };
                    attachmentsList.appendChild(li);
                });
                attachmentsBlock.classList.remove('d-none');
            }
        } catch (e) {
            console.error('Error cargando adjuntos de solicitud:', e);
        }
    }

    // 6. Asegurar que los botones estén habilitados
    const btns = document.querySelectorAll('#form-decision button');
    btns.forEach(b => b.disabled = false);

    // 7. Mostrar Modal
    new bootstrap.Modal(document.getElementById('modal-details')).show();
}