// dist/js/pages/usuario/modulesprotocolos/modals_view.js

import { store } from './store.js';
import { fetchSpeciesDetails } from './api_service.js';
import { API } from '../../../api.js'; // Aunque solo usa fetchSpeciesDetails, por si acaso

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
    // p.AnimalesUsados viene del SQL (Suma de totalA de formularios)
    const total = parseInt(p.CantidadAniA) || 0;
    const usados = parseInt(p.AnimalesUsados) || 0; 
    const restantes = total - usados;
    
    let colorRestante = "text-success";
    if(restantes <= 0) colorRestante = "text-danger fw-bold";
    else if(restantes < (total * 0.2)) colorRestante = "text-warning fw-bold";

    let detalleAdminHtml = '';
    if(p.DetalleAdm) detalleAdminHtml = `<div class="alert alert-warning mt-2 mb-0 small"><i class="bi bi-chat-quote-fill me-2"></i> <strong>Nota Admin:</strong> ${p.DetalleAdm}</div>`;

    const species = await fetchSpeciesDetails(id);
    let especiesHtml = '';
    if(species.length > 0) {
        especiesHtml = `<ul class="list-group list-group-flush small border rounded">` + 
            species.map(e => `<li class="list-group-item d-flex justify-content-between align-items-center"><span><i class="bi bi-tag-fill text-secondary me-2"></i> ${e.EspeNombreA}</span><span class="badge bg-light text-dark border">Autorizada</span></li>`).join('') + `</ul>`;
    } else {
        especiesHtml = '<div class="alert alert-light border text-center small">Sin especies registradas</div>';
    }

    content.innerHTML = `
        <div class="d-flex justify-content-between border-bottom pb-3 mb-4">
            <div>
                <h5 class="fw-bold text-primary mb-1">Protocolo #${p.nprotA}</h5>
                <span class="badge bg-secondary">ID SISTEMA: ${p.idprotA}</span>
            </div>
            <div class="text-end">
                <small class="text-muted d-block">ESTADO</small>
                ${p.Aprobado == 1 ? '<span class="badge bg-success px-3 py-2">APROBADO</span>' : '<span class="badge bg-secondary">REVISIÓN / OTRO</span>'}
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
                        <div class="col-md-6">
                            <label class="small text-muted fw-bold d-block">DEPARTAMENTO</label>
                            <span class="text-dark">${p.DeptoFormat || '---'}</span>
                        </div>
                        <div class="col-md-6">
                            <label class="small text-muted fw-bold d-block">VENCIMIENTO</label>
                            <span class="${p.Vencimiento < new Date().toISOString().split('T')[0] ? 'text-danger fw-bold' : 'text-dark'}">${p.Vencimiento || '---'}</span>
                        </div>
                    </div>
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