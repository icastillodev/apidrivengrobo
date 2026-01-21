/**
 * MODAL: Ficha de Animales (Versión Final con Badges de Estado y Alineación)
 * Ubicación: js/pages/admin/facturacion/Modals/animalModal.js
 */
import { API } from '../../../../api.js';
import { hideLoader, showLoader } from '../../../../components/LoaderComponent.js';

export const openAnimalModal = async (idformA) => {
    try {
        showLoader();
        const res = await API.request(`/billing/detail-animal/${idformA}`);
        hideLoader();

        if (res.status !== 'success') return Swal.fire('Error', 'No se pudo cargar el detalle', 'error');

        const d = res.data;
        const total = parseFloat(d.total_calculado || 0);
        const pagado = parseFloat(d.totalpago || 0);
        const saldo = parseFloat(d.saldoInv || 0);
        const descuento = parseFloat(d.descuento || 0);
        const debe = Math.max(0, total - pagado);

        // --- LÓGICA DE BADGES DE ESTADO Y BENEFICIOS ---
        let badgesHTML = '';
        if (d.is_exento == 1) {
            badgesHTML = '<span class="badge bg-info text-dark shadow-sm">EXENTO</span>';
        } else {
            // 1. Badge de Estado de Pago
            if (debe <= 0 ) {
                badgesHTML += '<span class="badge bg-success shadow-sm">PAGO COMPLETO</span>';
            } else if (pagado > 0) {
                badgesHTML += '<span class="badge bg-warning text-dark shadow-sm">PAGO PARCIAL</span>';
            } else {
                badgesHTML += '<span class="badge bg-danger shadow-sm">SIN PAGAR</span>';
            }
            // 2. Badge de Descuento (Si existe)
            if (descuento > 0) {
                badgesHTML += `<span class="badge bg-dark ms-1 shadow-sm">-${descuento}% DESC.</span>`;
            }
        }

        const html = `
        <div class="modal fade" id="modalAnimal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg" style="border-radius: 12px;">
                    <div class="modal-header bg-dark text-white py-3">
                        <div class="d-flex align-items-center w-100 justify-content-between pe-4">
                            <h5 class="modal-title fw-bold"><i class="bi bi-file-earmark-medical me-2 text-success"></i>PEDIDO #${idformA}</h5>
                            <div class="text-end">
                                <small class="text-white-50 d-block fw-bold uppercase" style="font-size: 10px;">Dinero a Favor del Investigador:</small>
                                <span class="badge bg-success fs-5" id="mdl-ani-saldo-txt">$ ${saldo.toLocaleString('es-UY', {minimumFractionDigits: 2})}</span>
                                <input type="hidden" id="mdl-ani-saldo-val" value="${saldo}">
                            </div>
                        </div>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>

                    <div class="modal-body p-4 bg-light">
                        <div class="row">
                            <div class="col-lg-7 border-end pe-4">
                                
                                <div class="mb-2 d-flex gap-1">
                                    ${badgesHTML}
                                </div>

                                <h6 class="text-success fw-bold border-bottom pb-2 mb-3 uppercase" style="font-size: 11px;">Modificación del Formulario (Datos del Pedido)</h6>
                                
                                <div class="row g-3">
                                    <div class="col-12">
                                        <label class="small fw-bold text-muted">INVESTIGADOR RESPONSABLE</label>
                                        <div class="form-control bg-white border-0 border-bottom rounded-0 ps-0 fw-bold text-primary">${d.solicitante || 'N/A'}</div>
                                    </div>
                                    <div class="col-md-7">
                                        <label class="small fw-bold text-muted">TIPO DE PEDIDO</label>
                                        <div class="form-control bg-white border-0 border-bottom rounded-0 ps-0">${d.nombre_tipo || 'N/A'}</div>
                                    </div>
                                    <div class="col-md-5">
                                        <label class="small fw-bold text-muted">ID PROTOCOLO:</label>
                                        <div class="form-control bg-white border-0 border-bottom rounded-0 ps-0 fw-bold">${d.id_protocolo || '-'}</div>
                                    </div>
                                    <div class="col-12">
                                        <label class="small fw-bold text-muted">NOMBRE PROTOCOLO</label>
                                        <div class="form-control bg-white border-0 border-bottom rounded-0 ps-0 small text-truncate">${d.protocolo_info || 'N/A'}</div>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="small fw-bold text-muted">ESPECIE / SUBESPECIE</label>
                                        <div class="form-control bg-white border-0 border-bottom rounded-0 ps-0">${d.taxonomia || '-'}</div>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="small fw-bold text-muted">EDAD / PESO</label>
                                        <div class="form-control bg-white border-0 border-bottom rounded-0 ps-0 small">${d.edad || '-'} / ${d.peso || '-'}</div>
                                    </div>

                                    <div class="col-12 mt-4">
                                        <div class="row g-2 text-center">
                                            <div class="col-3">
                                                <div class="p-2 bg-white border rounded shadow-sm">
                                                    <small class="d-block text-muted fw-bold" style="font-size: 9px;">MACHOS</small>
                                                    <span class="fs-5 fw-bold">${d.machos}</span>
                                                </div>
                                            </div>
                                            <div class="col-3">
                                                <div class="p-2 bg-white border rounded shadow-sm">
                                                    <small class="d-block text-muted fw-bold" style="font-size: 9px;">HEMBRAS</small>
                                                    <span class="fs-5 fw-bold">${d.hembras}</span>
                                                </div>
                                            </div>
                                            <div class="col-3">
                                                <div class="p-2 bg-white border rounded shadow-sm">
                                                    <small class="d-block text-muted fw-bold" style="font-size: 9px;">INDISTINTOS</small>
                                                    <span class="fs-5 fw-bold">${d.indistintos}</span>
                                                </div>
                                            </div>
                                            <div class="col-3">
                                                <div class="p-2 bg-success text-white border rounded shadow-sm">
                                                    <small class="d-block fw-bold" style="font-size: 9px;">TOTAL ANIMALES</small>
                                                    <span class="fs-5 fw-bold">${d.cantidad}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="col-md-6 mt-3">
                                        <label class="small fw-bold text-muted">FECHA INICIO</label>
                                        <div class="form-control bg-white border-0 border-bottom rounded-0 ps-0 small">${d.fecha_inicio || '-'}</div>
                                    </div>
                                    <div class="col-md-6 mt-3">
                                        <label class="small fw-bold text-muted">FECHA RETIRO (REAL)</label>
                                        <div class="form-control bg-white border-0 border-bottom rounded-0 ps-0 small">${d.fecha_fin || '-'}</div>
                                    </div>
                                    <div class="col-12 mt-3">
                                        <label class="small fw-bold text-muted">ACLARACIÓN USUARIO</label>
                                        <div class="p-2 bg-white border rounded small text-muted" style="min-height: 40px;">${d.aclaracion_usuario || 'Sin comentarios.'}</div>
                                    </div>
                                </div>
                            </div>

                            <div class="col-lg-5 ps-lg-4">
                                <h6 class="text-primary fw-bold border-bottom pb-2 mb-3 uppercase" style="font-size: 11px;">Gestión de Cobros</h6>
                                
                                <div class="mb-4 p-3 rounded" style="background-color: #fffde7; border: 1px solid #fff59d;">
                                    <label class="fw-bold small text-warning-emphasis uppercase" style="font-size: 10px;"><i class="bi bi-sticky me-1"></i>Aclaración Administrativa</label>
                                    <p class="mb-0 mt-2 small text-dark">${d.nota_admin}</p>
                                </div>

                                <div class="p-4 bg-white border rounded shadow-sm mb-4">
                                    <label class="form-label fw-bold text-primary small uppercase">Costo Total del Formulario</label>
                                    <div class="input-group input-group-lg">
                                        <span class="input-group-text bg-white border-end-0 fw-bold text-muted">$</span>
                                        <input type="number" id="mdl-ani-total" class="form-control border-start-0 fw-bold text-primary fs-4" value="${total.toFixed(2)}" readonly>
                                        <button class="btn btn-primary" type="button" onclick="window.toggleEditTotal(${idformA})">
                                            <i class="bi bi-pencil-fill"></i>
                                        </button>
                                    </div>
                                </div>

                                <div class="p-4 border rounded bg-white shadow-sm">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <span class="fw-bold text-muted small uppercase">PAGADO ACTUALMENTE:</span>
                                        <span class="fs-3 fw-bold text-success" id="mdl-ani-pagado-txt">$ ${pagado.toFixed(2)}</span>
                                        <input type="hidden" id="mdl-ani-pagado-val" value="${pagado}">
                                    </div>

                                    <div class="input-group">
                                        <input type="number" id="mdl-ani-monto-accion" class="form-control form-control-lg" placeholder="Monto a mover...">
                                        <button class="btn btn-success fw-bold px-4" onclick="window.ajustarPago('PAGAR', ${idformA})">PAGAR</button>
                                        <button class="btn btn-danger fw-bold px-4" onclick="window.ajustarPago('QUITAR', ${idformA})">QUITAR</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer bg-white border-top-0 d-flex justify-content-between p-4">
                        <button class="btn btn-outline-danger btn-sm px-4 fw-bold" onclick="window.descargarFichaPDF(${idformA}, 'ANIMAL')">
                            <i class="bi bi-file-pdf me-2"></i>PDF
                        </button>
                        <button class="btn btn-secondary btn-sm px-4 fw-bold" data-bs-dismiss="modal">CERRAR</button>
                    </div>
                </div>
            </div>
        </div>`;

        window.renderAndShowModal(html, 'modalAnimal');

    } catch (e) { console.error(e); }
};