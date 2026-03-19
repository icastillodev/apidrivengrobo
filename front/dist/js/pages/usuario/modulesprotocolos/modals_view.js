// dist/js/pages/usuario/modulesprotocolos/modals_view.js

import { store } from './store.js';
import { fetchSpeciesDetails } from './api_service.js';
import { API } from '../../../api.js';

function getProtocolById(id) {
    const tabs = ['my', 'local', 'network'];
    for (const tab of tabs) {
        const found = (store.allData?.[tab] || []).find(x => String(x.idprotA) === String(id));
        if (found) return found;
    }
    return null;
}

function getDeptoDisplay(p) {
    let deptoDisplay = p.DeptoFormat || '';
    if ((!deptoDisplay || deptoDisplay.trim() === '') && store.formDataCache?.depts && p.IdDepto) {
        const found = store.formDataCache.depts.find(d => String(d.iddeptoA) === String(p.IdDepto));
        if (found) deptoDisplay = found.NombreDeptoA;
    }
    return (deptoDisplay && deptoDisplay.trim() !== '') ? deptoDisplay : '---';
}

function buildPdfTemplate(p, species, deptoDisplay) {
    const usados = parseInt(p.AnimalesUsados) || 0;
    const saldoActual = parseInt(p.CantidadAniA) || 0;
    const total = usados + saldoActual;
    const restantes = saldoActual;
    const txt = window.txt?.misprotocolos || {};
    const nowIso = new Date().toISOString().split('T')[0];
    const vencido = p.Vencimiento && p.Vencimiento < nowIso;

    const speciesRows = (species && species.length)
        ? species.map(e => `<tr><td>${e.EspeNombreA || '-'}</td><td>Autorizada</td></tr>`).join('')
        : `<tr><td colspan="2">Sin especies registradas</td></tr>`;

    const estado = (p.Aprobado == 1)
        ? 'APROBADO'
        : ((p.Aprobado == 2 || p.Aprobado == 4) ? 'RECHAZADO' : 'EN REVISIÓN');

    return `
        <div style="font-family: Arial, sans-serif; color:#000; background:#fff; padding:16px;">
            <h2 style="margin:0 0 8px 0;">${txt.pdf_title || 'Ficha de Protocolo'}</h2>
            <div style="font-size:12px; margin-bottom:14px;">
                <strong>ID Sistema:</strong> ${p.idprotA || '-'} &nbsp; | &nbsp;
                <strong>N° Protocolo:</strong> ${p.nprotA || '-'} &nbsp; | &nbsp;
                <strong>Estado:</strong> ${estado}
            </div>

            <h4 style="margin:8px 0;">${p.tituloA || '-'}</h4>

            <table style="width:100%; border-collapse:collapse; margin-top:8px;">
                <tr>
                    <td style="border:1px solid #ccc; padding:6px;"><strong>Responsable (usuario)</strong></td>
                    <td style="border:1px solid #ccc; padding:6px;">${p.ResponsableName || '-'}</td>
                </tr>
                <tr>
                    <td style="border:1px solid #ccc; padding:6px;"><strong>Investigador referente</strong></td>
                    <td style="border:1px solid #ccc; padding:6px;">${p.InvestigadorACargA || '-'}</td>
                </tr>
                <tr>
                    <td style="border:1px solid #ccc; padding:6px;"><strong>Departamento</strong></td>
                    <td style="border:1px solid #ccc; padding:6px;">${deptoDisplay}</td>
                </tr>
                <tr>
                    <td style="border:1px solid #ccc; padding:6px;"><strong>Inicio</strong></td>
                    <td style="border:1px solid #ccc; padding:6px;">${p.FechaInicio || '-'}</td>
                </tr>
                <tr>
                    <td style="border:1px solid #ccc; padding:6px;"><strong>Vencimiento</strong></td>
                    <td style="border:1px solid #ccc; padding:6px;">${p.Vencimiento || '-'}${vencido ? ' (Vencido)' : ''}</td>
                </tr>
            </table>

            <h4 style="margin:14px 0 8px;">Balance de animales</h4>
            <table style="width:100%; border-collapse:collapse;">
                <tr>
                    <td style="border:1px solid #ccc; padding:6px;"><strong>Aprobados</strong></td>
                    <td style="border:1px solid #ccc; padding:6px;">${total}</td>
                    <td style="border:1px solid #ccc; padding:6px;"><strong>Usados</strong></td>
                    <td style="border:1px solid #ccc; padding:6px;">${usados}</td>
                    <td style="border:1px solid #ccc; padding:6px;"><strong>Disponibles</strong></td>
                    <td style="border:1px solid #ccc; padding:6px;">${restantes}</td>
                </tr>
            </table>

            <h4 style="margin:14px 0 8px;">Especies autorizadas</h4>
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr>
                        <th style="border:1px solid #ccc; padding:6px; text-align:left;">Especie</th>
                        <th style="border:1px solid #ccc; padding:6px; text-align:left;">Estado</th>
                    </tr>
                </thead>
                <tbody>${speciesRows}</tbody>
            </table>
        </div>
    `;
}

function getUserNetworkStatusBadge(status) {
    const t = window.txt?.misprotocolos || {};
    const code = Number(status);
    if (code === 1) return `<span class="badge bg-success">${t.red_estado_aprobada || 'APROBADA'}</span>`;
    if (code === 2 || code === 4) return `<span class="badge bg-danger">${t.red_estado_rechazada || 'RECHAZADA'}</span>`;
    if (code === 3) return `<span class="badge bg-warning text-dark">${t.red_estado_revision || 'EN REVISIÓN'}</span>`;
    return `<span class="badge bg-secondary">${t.red_estado_no_enviada || 'NO ENVIADA'}</span>`;
}

function getNetworkStatusLabel(code) {
    const t = window.txt?.misprotocolos || {};
    const n = Number(code);
    if (n === 1) return t.red_estado_aprobada || 'APROBADA';
    if (n === 2 || n === 4) return t.red_estado_rechazada || 'RECHAZADA';
    if (n === 3) return t.red_estado_revision || 'EN REVISIÓN';
    return t.red_estado_no_enviada || 'NO ENVIADA';
}

async function fetchNetworkStatusByProtocol(idprot) {
    try {
        const res = await API.request(`/user/protocols/network-status?idprot=${idprot}`);
        if (res.status === 'success' && Array.isArray(res.data)) return res.data;
        return [];
    } catch (_) {
        return [];
    }
}

export function viewAdminFeedback(id, msg) {
    window.Swal.fire({
        title: 'Motivo del Rechazo',
        html: `<p class="text-start">${msg || 'Sin detalles.'}</p>`,
        icon: 'warning',
        footer: '<small>Edite y reenvíe la solicitud.</small>'
    });
}

export async function downloadProtocolPDF(id) {
    const txt = window.txt?.misprotocolos || {};
    const p = getProtocolById(id);
    if (!p) {
        window.Swal?.fire('Error', txt.pdf_error || 'No se pudo generar el PDF.', 'error');
        return;
    }
    if (typeof window.html2pdf === 'undefined') {
        window.Swal?.fire('Error', txt.pdf_error || 'No se pudo generar el PDF.', 'error');
        return;
    }

    try {
        window.Swal?.fire({
            title: txt.pdf_generando_title || 'Generando PDF...',
            html: txt.pdf_generando_msg || 'Espere un momento',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => window.Swal.showLoading()
        });

        const species = await fetchSpeciesDetails(id);
        const networkStatus = await fetchNetworkStatusByProtocol(id);
        const deptoDisplay = getDeptoDisplay(p);
        const wrapper = document.createElement('div');
        wrapper.innerHTML = buildPdfTemplate(p, species, deptoDisplay);

        if (Array.isArray(networkStatus) && networkStatus.length > 0) {
            const t = window.txt?.misprotocolos || {};
            const rows = networkStatus.map(r => {
                const own = Number(r.esPropia) === 1 ? ` (${t.red_institucion_propia || 'PROPIA'})` : '';
                return `<tr>
                    <td style="border:1px solid #ccc; padding:6px;">${r.NombreInst || '-'}${own}</td>
                    <td style="border:1px solid #ccc; padding:6px;">${getNetworkStatusLabel(r.estado)}</td>
                </tr>`;
            }).join('');

            const section = document.createElement('div');
            section.innerHTML = `
                <h4 style="margin:14px 0 8px;">${t.red_estado_solicitudes || 'Estado de solicitudes por institución'}</h4>
                <table style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr>
                            <th style="border:1px solid #ccc; padding:6px; text-align:left;">${t.red_col_institucion || 'Institución'}</th>
                            <th style="border:1px solid #ccc; padding:6px; text-align:left;">${t.red_col_estado || 'Estado'}</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>`;
            wrapper.appendChild(section);
        }

        const safeNprot = String(p.nprotA || p.idprotA || 'protocolo').replace(/[^\w\-\.]+/g, '_');
        await window.html2pdf().set({
            margin: 8,
            filename: `ficha-protocolo-${safeNprot}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, backgroundColor: '#ffffff' },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(wrapper).save();

        window.Swal?.close();
    } catch (err) {
        console.error('Error generando PDF de protocolo usuario:', err);
        window.Swal?.close();
        window.Swal?.fire('Error', txt.pdf_error || 'No se pudo generar el PDF.', 'error');
    }
}

// Reemplaza SOLO la función viewProtocol
export async function viewProtocol(id) {
    const p = store.allData[store.currentTab].find(x => x.idprotA == id);
    if (!p) return;
    const isRedProt = String(p?.TipoAprobacion || '').toUpperCase() === 'RED';

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
    let networkStatusHtml = '';
    let networkMissingBannerHtml = '';
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

    // Estado de red por institución (modal completo del protocolo)
    try {
        const t = window.txt?.misprotocolos || {};
        const resNet = await API.request(`/user/protocols/network-status?idprot=${id}`);
        if (resNet.status === 'success' && Array.isArray(resNet.data) && resNet.data.length > 0) {
            const networkRows = resNet.data;
            if (isRedProt) {
                const missing = networkRows.filter(r => Number(r.estado) === 0);
                if (missing.length > 0) {
                    const names = missing.map(r => r.NombreInst || '-').filter(Boolean).slice(0, 4).join(', ');
                    const more = missing.length > 4 ? ` +${missing.length - 4}` : '';
                    networkMissingBannerHtml = `
                        <div class="alert alert-info mt-3 mb-2">
                            <div class="fw-bold">${t.red_faltan_envios_title || 'Envío a la red pendiente'}</div>
                            <div class="small text-muted mt-1">
                                ${t.red_faltan_envios_msg || 'Faltan instituciones de red por recibir la solicitud.'} 
                                <strong>${names}${more}</strong>.
                            </div>
                            <div class="mt-3">
                                <button type="button" class="btn btn-info text-white btn-sm fw-bold" onclick="window.openNetworkRequestModal(${p.idprotA})">
                                    ${t.red_btn_enviar_desde_detalle || 'Enviar a la red'}
                                </button>
                            </div>
                        </div>
                    `;
                }
            }

            networkStatusHtml = `
                <div class="mt-3">
                    <label class="small text-muted fw-bold d-block mb-2">${t.red_estado_solicitudes || 'Estado de solicitudes por institución'}</label>
                    <div class="table-responsive">
                        <table class="table table-sm table-bordered mb-0">
                            <thead>
                                <tr>
                                    <th class="small">${t.red_col_institucion || 'Institución'}</th>
                                    <th class="small">${t.red_col_estado || 'Estado'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${networkRows.map(r => `
                                    <tr>
                                        <td class="small">
                                            ${r.NombreInst || '-'}
                                            ${Number(r.esPropia) === 1 ? `<span class="badge bg-primary ms-1">${t.red_institucion_propia || 'PROPIA'}</span>` : ''}
                                        </td>
                                        <td class="small">${getUserNetworkStatusBadge(r.estado)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>`;
        }
    } catch (e) {
        // Silencioso para no romper el modal si no aplica
    }
    let especiesHtml = '';
    if(species.length > 0) {
        especiesHtml = `<ul class="list-group list-group-flush small border rounded">` + 
            species.map(e => `<li class="list-group-item d-flex justify-content-between align-items-center"><span><i class="bi bi-tag-fill text-secondary me-2"></i> ${e.EspeNombreA}</span><span class="badge bg-light text-dark border">Autorizada</span></li>`).join('') + `</ul>`;
    } else {
        especiesHtml = '<div class="alert alert-light border text-center small">Sin especies registradas</div>';
    }

    const deptoDisplay = getDeptoDisplay(p);

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
                <div class="mt-2">
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="window.downloadProtocolPDF(${p.idprotA})">
                        <i class="bi bi-file-earmark-pdf-fill me-1"></i>${window.txt?.misprotocolos?.btn_pdf_ficha || 'PDF Ficha'}
                    </button>
                </div>
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
                    ${networkMissingBannerHtml}
                    ${networkStatusHtml}
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