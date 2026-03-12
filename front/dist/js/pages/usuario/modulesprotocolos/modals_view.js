// dist/js/pages/usuario/modulesprotocolos/modals_view.js

import { store } from './store.js';
import { fetchSpeciesDetails } from './api_service.js';
import { API } from '../../../api.js';

export function viewAdminFeedback(id, msg) {
    window.Swal.fire({
        title: 'Motivo del Rechazo',
        html: `<p class="text-start">${msg || 'Sin detalles.'}</p>`,
        icon: 'warning',
        footer: '<small>Edite y reenvíe la solicitud.</small>'
    });
}

// Reemplaza SOLO la función viewProtocol
export async function viewProtocol(id) {
    const p = store.allData[store.currentTab].find(x => x.idprotA == id);
    if (!p) return;

    const modalEl = document.getElementById('modal-detail');
    const content = document.getElementById('detail-content');
    const modal = new bootstrap.Modal(modalEl);
    
    content.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>';
    modal.show();

    // --- CÁLCULO DE ANIMALES ---
    // p.AnimalesUsados viene del SQL (Suma de totalA de formularios entregados)
    const usados = parseInt(p.AnimalesUsados) || 0; 
    const saldoActual = parseInt(p.CantidadAniA) || 0;
    const total = usados + saldoActual; // Aprobados inicialmente
    const restantes = saldoActual;
    
    let colorRestante = "text-success";
    if(restantes <= 0) colorRestante = "text-danger fw-bold";
    else if(restantes < (total * 0.2)) colorRestante = "text-warning fw-bold";

    let detalleAdminHtml = '';
    if (p.DetalleAdm) {
        detalleAdminHtml = `<div class="alert alert-warning mt-2 mb-0 small">
            <i class="bi bi-chat-quote-fill me-2"></i>
            <strong>Nota Admin:</strong> ${p.DetalleAdm}
        </div>`;
    }

    const species = await fetchSpeciesDetails(id);
    let attachmentsHtml = '';
    try {
        const resAtt = await API.request(`/user/protocols/attachments-by-protocol?idprot=${id}`);
        if (resAtt.status === 'success' && Array.isArray(resAtt.data) && resAtt.data.length > 0) {
                const base = API.urlBase || '';
                const t = window.txt?.misprotocolos || {};
                attachmentsHtml = `<div class="mt-3">
                    <label class="small text-muted fw-bold d-block mb-2">${t.label_adjuntos || 'Archivos adjuntos'}</label>
                    <ul class="list-unstyled small mb-0">` +
                    resAtt.data.map(att => {
                        let label = 'Otro';
                        if (att.tipoadjunto == 1) label = 'Protocolo';
                        else if (att.tipoadjunto == 2) label = 'Aval';
                        const url = `${base}/user/protocols/attachments/download?id=${att.Id_adjuntos_protocolos}`;
                        const idAttr = `att-user-${att.Id_adjuntos_protocolos}`;
                        return `<li class="mb-1">
                            <button type="button" class="btn btn-link p-0 text-decoration-none" id="${idAttr}">
                                <i class="bi bi-paperclip me-1"></i><strong>${label}:</strong>
                                <span class="text-decoration-underline">${att.nombre_original}</span>
                            </button>
                        </li>`;
                    }).join('') + `</ul>
                </div>`;

                // Después de inyectar el HTML, asignamos handlers
                setTimeout(() => {
                    resAtt.data.forEach(att => {
                        const btn = document.getElementById(`att-user-${att.Id_adjuntos_protocolos}`);
                        if (!btn) return;
                        const url = `${base}/user/protocols/attachments/download?id=${att.Id_adjuntos_protocolos}`;
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
                                    console.error('Error descargando adjunto usuario:', text);
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
                                console.error('Error de red al descargar adjunto usuario:', err);
                                window.Swal?.close();
                                window.Swal?.fire('Error', 'Error de red al descargar el archivo.', 'error');
                            }
                        };
                    });
                }, 0);
        }
    } catch (e) {
        console.error('Error cargando adjuntos de protocolo para usuario:', e);
    }
    let especiesHtml = '';
    if(species.length > 0) {
        especiesHtml = `<ul class="list-group list-group-flush small border rounded">` + 
            species.map(e => `<li class="list-group-item d-flex justify-content-between align-items-center"><span><i class="bi bi-tag-fill text-secondary me-2"></i> ${e.EspeNombreA}</span><span class="badge bg-light text-dark border">Autorizada</span></li>`).join('') + `</ul>`;
    } else {
        especiesHtml = '<div class="alert alert-light border text-center small">Sin especies registradas</div>';
    }

    // Fallback de departamento usando cache de config si DeptoFormat viene vacío
    let deptoDisplay = p.DeptoFormat || '';
    if ((!deptoDisplay || deptoDisplay.trim() === '') && store.formDataCache?.depts && p.IdDepto) {
        const found = store.formDataCache.depts.find(d => String(d.iddeptoA) === String(p.IdDepto));
        if (found) deptoDisplay = found.NombreDeptoA;
    }
    if (!deptoDisplay || deptoDisplay.trim() === '') deptoDisplay = '---';

    // Badge de estado coherente con la grilla
    let estadoBadge = '';
    if (p.Aprobado == 1) {
        estadoBadge = '<span class="badge bg-success px-3 py-2">APROBADO</span>';
    } else if (p.Aprobado == 2 || p.Aprobado == 4) {
        estadoBadge = '<span class="badge bg-danger px-3 py-2">RECHAZADO</span>';
    } else {
        estadoBadge = '<span class="badge bg-warning text-dark px-3 py-2">EN REVISIÓN</span>';
    }

    content.innerHTML = `
        <div class="d-flex justify-content-between border-bottom pb-3 mb-4">
            <div>
                <h5 class="fw-bold text-primary mb-1">Protocolo #${p.nprotA}</h5>
                <span class="badge bg-secondary">ID SISTEMA: ${p.idprotA}</span>
            </div>
            <div class="text-end">
                <small class="text-muted d-block">ESTADO</small>
                ${estadoBadge}
            </div>
        </div>

        <div class="row g-4">
            <div class="col-md-12">
                <div class="p-3 bg-light rounded border">
                    <h6 class="fw-bold text-dark mb-2">${p.tituloA}</h6>
                    ${detalleAdminHtml}
                    <div class="row mt-3">
                        <div class="col-md-6 mb-2">
                            <label class="small text-muted fw-bold d-block">RESPONSABLE (USUARIO)</label>
                            <span class="text-dark"><i class="bi bi-person-circle me-1"></i> ${p.ResponsableName || '---'}</span>
                        </div>
                        <div class="col-md-6 mb-2">
                            <label class="small text-muted fw-bold d-block">INVESTIGADOR REFERENTE</label>
                            <span class="text-dark">${p.InvestigadorACargA || '---'}</span>
                        </div>
                        <div class="col-md-6 mb-2">
                            <label class="small text-muted fw-bold d-block">DEPARTAMENTO</label>
                            <span class="text-dark">${deptoDisplay}</span>
                        </div>
                        <div class="col-md-6 mb-2">
                            <label class="small text-muted fw-bold d-block">INICIO</label>
                            <span class="text-dark">${p.FechaInicio || '---'}</span>
                        </div>
                        <div class="col-md-6 mb-2">
                            <label class="small text-muted fw-bold d-block">VENCIMIENTO</label>
                            <span class="${p.Vencimiento && p.Vencimiento < new Date().toISOString().split('T')[0] ? 'text-danger fw-bold' : 'text-dark'}">${p.Vencimiento || '---'}</span>
                        </div>
                    </div>
                    ${attachmentsHtml}
                </div>
            </div>

            <div class="col-md-12">
                <label class="small text-muted fw-bold d-block mb-2">BALANCE DE ANIMALES (GLOBAL)</label>
                <div class="row text-center g-2">
                    <div class="col-4">
                        <div class="border rounded p-2 bg-white">
                            <div class="small text-muted">APROBADOS</div>
                            <div class="fs-5 fw-bold text-primary">${total}</div>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="border rounded p-2 bg-white">
                            <div class="small text-muted">USADOS</div>
                            <div class="fs-5 fw-bold text-secondary">${usados}</div>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="border rounded p-2 bg-white">
                            <div class="small text-muted">DISPONIBLES</div>
                            <div class="fs-5 ${colorRestante}">${restantes}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-12">
                <label class="small text-muted fw-bold d-block mb-2">ESPECIES AUTORIZADAS</label>
                ${especiesHtml}
            </div>
        </div>
    `;
}