/**
 * MANAGER DE MODALES - BIOTERIOS GROBO
 * Ubicación: js/pages/admin/facturacion/Modals/manager.js
 */
import { API } from '../../../../api.js';
import { hideLoader, showLoader } from '../../../../components/LoaderComponent.js'; 
import { openAnimalModal } from './animalModal.js';
import { openAlojModal } from './alojamientos/alojModal.js';
import { openReactiveModal } from './reactiveModal.js';
import { openInsumoModal } from './insumoModal.js';
import { formatBillingMoney } from '../billingLocale.js';

const txBM = () => window.txt?.facturacion?.billing_modal || {};
function bmTpl(str, map) {
    if (!str) return '';
    return str.replace(/\{(\w+)\}/g, (_, k) => (map[k] != null ? String(map[k]) : `{${k}}`));
}

/**
 * Función Inteligente para Recargar la Vista Actual
 * Detecta en qué pestaña del facturador estamos para refrescar la grilla correcta.
 */
window.recargarGrillaActiva = () => {
    if (document.getElementById('sel-depto') && typeof window.cargarFacturacionDepto === 'function') {
        window.cargarFacturacionDepto();
    } else if (document.getElementById('sel-investigador') && typeof window.cargarFacturacionInvestigador === 'function') {
        window.cargarFacturacionInvestigador();
    } else if (document.getElementById('sel-protocolo') && typeof window.cargarFacturacionProtocolo === 'function') {
        window.cargarFacturacionProtocolo();
    } else if (document.getElementById('billing-results-inst') && typeof window.cargarFacturacionInstitucion === 'function') {
        window.cargarFacturacionInstitucion();
    }
};

/**
 * Función Global: Decide qué modal abrir según el tipo
 */
window.abrirEdicionFina = (tipo, id) => {
    switch (tipo) {
        case 'ANIMAL':
            openAnimalModal(id);
            break;
        case 'ALOJ':
            openAlojModal(id);
            break;
        case 'REACTIVO':
            openReactiveModal(id);
            break;
        case 'INSUMO':
            openInsumoModal(id);
            break;
    }
};

window.renderAndShowModal = (html, modalId) => {
    let container = document.getElementById('modal-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'modal-container';
        document.body.appendChild(container);
    }
    container.innerHTML = html;
    const modalEl = document.getElementById(modalId);
    if (!modalEl) {
        console.error('renderAndShowModal: no existe el elemento del modal', modalId);
        if (window.Swal) {
            window.Swal.fire(window.txt?.generales?.error || 'Error', window.txt?.facturacion?.modal_no_encontrado || 'No se pudo abrir el modal. Recargue la página.', 'error');
        }
        return;
    }
    const myModal = new bootstrap.Modal(modalEl);
    myModal.show();
};

// ==========================================
// LÓGICA DE PAGOS: ANIMALES (Formularios Vivos)
// ==========================================
window.ajustarPago = async (accion, id) => {
    let monto = parseFloat(document.getElementById('mdl-ani-monto-accion').value || 0);
    const total = parseFloat(document.getElementById('mdl-ani-total').value);
    const pagado = parseFloat(document.getElementById('mdl-ani-pagado-val').value);
    const saldo = parseFloat(document.getElementById('mdl-ani-saldo-val').value);
    const debe = Math.max(0, total - pagado);

    if (monto <= 0) return;

    let montoFinal = monto;
    let advertencia = '';

    const tx = txBM();
    const accionLabel = accion === 'PAGAR' ? (tx.btn_pagar || accion) : (tx.btn_quitar || accion);
    const mStr = () => `$ ${formatBillingMoney(montoFinal)}`;

    if (accion === 'PAGAR') {
        if (montoFinal > debe) {
            montoFinal = debe;
            advertencia = bmTpl(tx.ajuste_max_deuda_tpl || 'El monto se ajustó a {m} (máximo de deuda).', { m: mStr() });
        }
        if (montoFinal > saldo) {
            montoFinal = saldo;
            advertencia = bmTpl(tx.ajuste_saldo_disp_tpl || 'El monto se ajustó a {m} (saldo disponible).', { m: mStr() });
        }
    } else {
        if (montoFinal > pagado) {
            montoFinal = pagado;
            advertencia = bmTpl(tx.ajuste_ya_pagado_tpl || 'El monto se ajustó a {m} (monto ya pagado).', { m: mStr() });
        }
    }

    if (montoFinal <= 0) {
        return Swal.fire(window.txt?.facturacion?.operacion_cancelada || 'Operación cancelada', window.txt?.facturacion?.operacion_cancelada_msg || 'No hay montos pendientes o saldo suficiente para procesar.', 'warning');
    }

    const confirm = await Swal.fire({
        title: bmTpl(tx.confirm_title_tpl || '¿Confirmar {accion}?', { accion: accionLabel }),
        text: advertencia || bmTpl(tx.confirm_procesar_tpl || 'Se procesarán {m}', { m: mStr() }),
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: tx.btn_procesar || 'Procesar',
        cancelButtonText: window.txt?.generales?.btn_cancelar_swal || 'Cancelar'
    });

    if (confirm.isConfirmed) {
        showLoader();
        try {
            const res = await API.request('/billing/ajustar-pago-individual', 'POST', { 
                id, 
                monto: montoFinal, 
                accion 
            });
            hideLoader();

            if (res.status === 'success') {
                const modalInstance = bootstrap.Modal.getInstance(document.getElementById('modalAnimal'));
                if (modalInstance) modalInstance.hide();
                
                setTimeout(() => {
                    openAnimalModal(id); // Recarga datos frescos en el modal
                    window.recargarGrillaActiva(); // Refresca grilla principal
                }, 300);
            } else {
                Swal.fire(window.txt?.generales?.error || 'Error', res.message, 'error');
            }
        } catch (e) {
            hideLoader();
            console.error(e);
        }
    }
};

window.toggleEditTotal = async (id) => {
    const inp = document.getElementById('mdl-ani-total');
    if (inp.hasAttribute('readonly')) {
        inp.removeAttribute('readonly');
        inp.focus();
    } else {
        const nuevoTotal = inp.value;
        showLoader();
        await API.request('/billing/update-total', 'POST', { id, total: nuevoTotal });
        hideLoader();
        inp.setAttribute('readonly', true);
        window.recargarGrillaActiva(); 
    }
};

// ==========================================
// LÓGICA DE PAGOS: ALOJAMIENTO
// ==========================================
window.ajustarPagoAloj = async (accion, id) => {
    const inputMonto = document.getElementById('mdl-aloj-monto-accion');
    let montoIngresado = parseFloat(inputMonto.value || 0);
    
    const totalCosto = parseFloat(document.getElementById('mdl-aloj-total').value);
    const yaPagado = parseFloat(document.getElementById('mdl-aloj-pagado-val').value);
    const saldoInvestigador = parseFloat(document.getElementById('mdl-aloj-saldo-val').value);
    
    const deudaPendiente = Math.max(0, totalCosto - yaPagado);

    if (montoIngresado <= 0) return;

    let montoAProcesar = montoIngresado;
    let notaAjuste = '';

    const tx = txBM();
    const accionLabel = accion === 'PAGAR' ? (tx.btn_pagar || accion) : (tx.btn_quitar || accion);
    const mStr = () => `$ ${formatBillingMoney(montoAProcesar)}`;

    if (accion === 'PAGAR') {
        if (montoAProcesar > deudaPendiente) {
            montoAProcesar = deudaPendiente;
            notaAjuste = bmTpl(tx.aloj_nota_deuda_max_tpl || 'Ajustado a la deuda máxima: {m}.', { m: mStr() });
        }
        if (montoAProcesar > saldoInvestigador) {
            montoAProcesar = saldoInvestigador;
            notaAjuste = bmTpl(tx.aloj_nota_saldo_tpl || 'Ajustado al saldo disponible: {m}.', { m: mStr() });
        }
    } else {
        if (montoAProcesar > yaPagado) {
            montoAProcesar = yaPagado;
            notaAjuste = bmTpl(tx.aloj_nota_ya_pagado_tpl || 'Ajustado al monto pagado: {m}.', { m: mStr() });
        }
    }

    if (montoAProcesar <= 0) {
        return Swal.fire(window.txt?.facturacion?.operacion_no_requerida || 'Operación no requerida', window.txt?.facturacion?.operacion_no_requerida_msg || 'El monto resultante es 0 o no hay saldo/deuda para procesar.', 'info');
    }

    const confirm = await Swal.fire({
        title: bmTpl(tx.confirm_title_tpl || '¿Confirmar {accion}?', { accion: accionLabel }),
        text: notaAjuste || bmTpl(tx.confirm_procesar_tpl || 'Se procesarán {m}', { m: mStr() }),
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: tx.btn_procesar || 'Procesar',
        cancelButtonText: window.txt?.generales?.btn_cancelar_swal || 'Cancelar'
    });

    if (confirm.isConfirmed) {
        showLoader();
        try {
            const res = await API.request('/billing/ajustar-pago-aloj', 'POST', { 
                id, 
                monto: montoAProcesar, 
                accion 
            });
            hideLoader();

            if (res.status === 'success') {
                const modalInstance = bootstrap.Modal.getInstance(document.getElementById('modalAlojamiento'));
                if (modalInstance) modalInstance.hide();

                setTimeout(() => {
                    openAlojModal(id);
                    window.recargarGrillaActiva(); 
                }, 300);
            }
        } catch (e) { 
            console.error(e); 
            hideLoader(); 
        }
    }
};

window.toggleEditTotalAloj = async (id) => {
    const inp = document.getElementById('mdl-aloj-total');
    if (inp.hasAttribute('readonly')) {
        inp.removeAttribute('readonly');
        inp.focus();
        inp.classList.add('border-primary', 'bg-white');
    } else {
        const nuevoTotal = inp.value;
        showLoader();
        await API.request('/billing/update-total-aloj', 'POST', { id, total: nuevoTotal });
        hideLoader();
        inp.setAttribute('readonly', true);
        inp.classList.remove('border-primary', 'bg-white');
        window.recargarGrillaActiva(); 
    }
};

// ==========================================
// LÓGICA DE PAGOS: REACTIVOS
// ==========================================
window.ajustarPagoRea = async (accion, id) => {
    let monto = parseFloat(document.getElementById('mdl-rea-monto-accion').value || 0);
    const total = parseFloat(document.getElementById('mdl-rea-total').value);
    const pagado = parseFloat(document.getElementById('mdl-rea-pagado-val').value);
    const saldo = parseFloat(document.getElementById('mdl-rea-saldo-val').value);
    const debe = Math.max(0, total - pagado);

    if (monto <= 0) return;

    let montoFinal = monto;
    if (accion === 'PAGAR') {
        if (montoFinal > debe) montoFinal = debe;
        if (montoFinal > saldo) montoFinal = saldo;
    } else {
        if (montoFinal > pagado) montoFinal = pagado;
    }

    if (montoFinal <= 0) return Swal.fire(window.txt?.generales?.swal_atencion || 'Aviso', window.txt?.facturacion?.monto_invalido_saldo || 'Monto no válido o sin saldo/deuda.', 'info');

    const tx = txBM();
    const accionLabel = accion === 'PAGAR' ? (tx.btn_pagar || accion) : (tx.btn_quitar || accion);
    const confirm = await Swal.fire({
        title: bmTpl(tx.confirm_title_tpl || '¿Confirmar {accion}?', { accion: accionLabel }),
        text: bmTpl(tx.ins_monto_confirm_tpl || 'Monto: {m}', { m: `$ ${formatBillingMoney(montoFinal)}` }),
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: tx.btn_procesar || 'Procesar',
        cancelButtonText: window.txt?.generales?.btn_cancelar_swal || 'Cancelar'
    });

    if (confirm.isConfirmed) {
        showLoader();
        const res = await API.request('/billing/ajustar-pago-individual', 'POST', { 
            id, monto: montoFinal, accion, modulo: 'REACTIVO' 
        });
        hideLoader();

        if (res.status === 'success') {
            const modalInstance = bootstrap.Modal.getInstance(document.getElementById('modalReactivo'));
            if (modalInstance) modalInstance.hide();
            
            setTimeout(() => {
                openReactiveModal(id);
                window.recargarGrillaActiva(); 
            }, 300);
        }
    }
};

window.toggleEditTotalRea = async (id) => {
    const inp = document.getElementById('mdl-rea-total');
    if (inp.hasAttribute('readonly')) {
        inp.removeAttribute('readonly');
        inp.focus();
    } else {
        const nuevoTotal = inp.value;
        showLoader();
        await API.request('/billing/update-total', 'POST', { id, total: nuevoTotal, modulo: 'REACTIVO' });
        hideLoader();
        inp.setAttribute('readonly', true);
        window.recargarGrillaActiva(); 
    }
};

// ==========================================
// LÓGICA DE PAGOS: INSUMOS GENERALES
// ==========================================
window.ajustarPagoIns = async (accion, id) => {
    const inputMonto = document.getElementById('mdl-ins-monto-accion');
    let montoIngresado = parseFloat(inputMonto.value || 0);
    
    const totalCosto = parseFloat(document.getElementById('mdl-ins-total').value);
    const yaPagado = parseFloat(document.getElementById('mdl-ins-pagado-val').value);
    const saldoTitular = parseFloat(document.getElementById('mdl-ins-saldo-val').value);
    
    const deudaPendiente = Math.max(0, totalCosto - yaPagado);

    if (montoIngresado <= 0) return;

    let montoAProcesar = montoIngresado;
    let notaAjuste = '';

    if (accion === 'PAGAR') {
        if (montoAProcesar > deudaPendiente) montoAProcesar = deudaPendiente;
        if (montoAProcesar > saldoTitular) montoAProcesar = saldoTitular;
    } else {
        if (montoAProcesar > yaPagado) montoAProcesar = yaPagado;
    }

    if (montoAProcesar <= 0) return;

    const tx = txBM();
    const accionLabel = accion === 'PAGAR' ? (tx.btn_pagar || accion) : (tx.btn_quitar || accion);
    const confirm = await Swal.fire({
        title: bmTpl(tx.confirm_title_tpl || '¿Confirmar {accion}?', { accion: accionLabel }),
        text: bmTpl(tx.ins_monto_confirm_tpl || 'Monto: {m}', { m: `$ ${formatBillingMoney(montoAProcesar)}` }),
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: tx.btn_procesar || 'Procesar',
        cancelButtonText: window.txt?.generales?.btn_cancelar_swal || 'Cancelar'
    });

    if (confirm.isConfirmed) {
        showLoader();
        try {
            const res = await API.request('/billing/ajustar-pago-insumo', 'POST', { 
                id, 
                monto: montoAProcesar, 
                accion
            });
            hideLoader();

            if (res.status === 'success') {
                const modalInstance = bootstrap.Modal.getInstance(document.getElementById('modalInsumo'));
                if (modalInstance) modalInstance.hide();

                setTimeout(async () => {
                    openInsumoModal(id);
                    window.recargarGrillaActiva(); 
                }, 300);
            } else {
                Swal.fire(window.txt?.generales?.error || 'Error', res.message, 'error');
            }
        } catch (e) {
            console.error(e);
            hideLoader();
        }
    }
};

window.toggleEditTotalIns = async (id) => {
    const inp = document.getElementById('mdl-ins-total');
    if (inp.hasAttribute('readonly')) {
        inp.removeAttribute('readonly');
        inp.focus();
        inp.classList.add('border-primary');
    } else {
        const nuevoTotal = inp.value;
        showLoader();
        await API.request('/billing/update-total', 'POST', { 
            id, 
            total: nuevoTotal, 
            modulo: 'INSUMO' 
        });
        hideLoader();
        inp.setAttribute('readonly', true);
        inp.classList.remove('border-primary');
        window.recargarGrillaActiva(); 
    }
};

// ==========================================
// PDF modal alojamiento legacy (`alojamientoModal.js` — #modalAloj)
// ==========================================
window.descargarFichaAlojLegacyPDF = async (historiaId) => {
    const tx = txBM();
    const g = window.txt?.generales || {};
    const diasEl = document.getElementById('mdl-aloj-dias');
    const totalEl = document.getElementById('mdl-aloj-total');
    const pagoEl = document.getElementById('mdl-aloj-pago');
    if (!diasEl || !totalEl || !pagoEl) {
        return Swal.fire(g.swal_atencion || 'Atención', tx.err_aloj_legacy_modal || 'Abra el modal de alojamiento y vuelva a intentar.', 'info');
    }
    const dias = String(diasEl.value ?? '');
    const total = parseFloat(totalEl.value || 0);
    const pagado = parseFloat(pagoEl.value || 0);
    const debe = Math.max(0, total - pagado);
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const M = 18;
    const pageW = doc.internal.pageSize.getWidth();
    const right = pageW - M;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(26, 93, 59);
    doc.text(`GROBO - ${inst}`, 105, M + 2, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(bmTpl(tx.pdf_aloj_legacy_titulo_tpl || 'RESUMEN ALOJAMIENTO — HISTORIA {id}', { id: historiaId }), 105, M + 10, { align: 'center' });
    doc.setDrawColor(26, 93, 59);
    doc.line(M, M + 14, right, M + 14);

    let y = M + 24;
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    doc.text(`${tx.pdf_aloj_legacy_dias || 'Días totales:'} ${dias}`, M, y);
    y += 7;
    doc.text(`${tx.pdf_aloj_legacy_cuenta || 'Cuenta a pagar:'} $ ${formatBillingMoney(total)}`, M, y);
    y += 7;
    doc.text(`${tx.pdf_aloj_legacy_liquidado || 'Monto liquidado:'} $ ${formatBillingMoney(pagado)}`, M, y);
    y += 7;
    doc.setTextColor(200, 0, 0);
    doc.text(`${tx.pdf_aloj_legacy_debe || 'Saldo pendiente:'} $ ${formatBillingMoney(debe)}`, M, y);
    doc.setTextColor(0);

    const footerY = 265;
    doc.setDrawColor(150);
    doc.line(30, footerY, 85, footerY);
    doc.line(125, footerY, 180, footerY);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(tx.pdf_firma_resp || 'Firma Responsable Bioterio', 57, footerY + 5, { align: 'center' });
    doc.text(tx.pdf_sello_fecha || 'Sello Institucional / Fecha', 152, footerY + 5, { align: 'center' });

    doc.save(`Alojamiento_Legacy_${historiaId}.pdf`);
};

// ==========================================
// GENERACIÓN DE PDF DESDE MODAL (Formularios)
// ==========================================
window.descargarFichaPDF = async (id, tipo) => {
    if (tipo === 'ALOJ') return window.descargarFichaAlojLegacyPDF(id);
    if (tipo !== 'ANIMAL') return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const M = 18;
    const pageW = doc.internal.pageSize.getWidth();
    const right = pageW - M;
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    const tx = txBM();
    const na = tx.na || 'N/A';

    const findValue = (labelTxt) => {
        if (!labelTxt) return na;
        const labels = Array.from(document.querySelectorAll('#modalAnimal label'));
        const target = labels.find(l => (l.innerText || '').includes(labelTxt));
        return target ? target.nextElementSibling?.innerText || na : na;
    };

    const investigador = document.querySelector('#modalAnimal .text-primary.fw-bold')?.innerText || na;
    const protocoloID = findValue(tx.lbl_id_protocolo || 'ID PROTOCOLO:');
    const protocoloNom = findValue(tx.lbl_nombre_protocolo || 'NOMBRE PROTOCOLO');
    const tipoPedido = findValue(tx.lbl_tipo_pedido || 'TIPO DE PEDIDO');
    const especie = findValue(tx.lbl_especie_sub || 'ESPECIE / SUBESPECIE');
    const fechaEntregado = findValue(tx.lbl_fecha_retiro || 'FECHA RETIRO (REAL)');

    const counts = Array.from(document.querySelectorAll('#modalAnimal .row.g-2.text-center b, #modalAnimal .row.g-2.text-center span'));
    const m = counts[0]?.innerText || '0';
    const h = counts[1]?.innerText || '0';
    const i = counts[2]?.innerText || '0';
    const total = counts[3]?.innerText || '0';

    const costoTotalNum = parseFloat(document.getElementById('mdl-ani-total')?.value || 0);
    const pagado = document.getElementById('mdl-ani-pagado-txt')?.innerText || `$ ${formatBillingMoney(0)}`;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(26, 93, 59);
    doc.text(`GROBO - ${inst}`, 105, M + 2, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(tx.pdf_pedido_animal_titulo || 'FICHA DE PEDIDO: ANIMALES DE LABORATORIO', 105, M + 10, { align: "center" });
    doc.setDrawColor(26, 93, 59);
    doc.line(M, M + 14, right, M + 14);

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(bmTpl(tx.pdf_id_solicitud_tpl || 'ID SOLICITUD: {id}', { id }), 20, 42);

    doc.text(tx.pdf_sec_datos_inv_prot || 'DATOS DEL INVESTIGADOR Y PROTOCOLO', 20, 52);
    doc.setFont("helvetica", "normal");
    doc.text(`${tx.pdf_investigador_lbl || 'Investigador:'} ${investigador}`, 20, 58);
    doc.text(bmTpl(tx.pdf_protocolo_nom_id_tpl || 'Protocolo: {nom} (ID: {id})', { nom: protocoloNom, id: protocoloID }), 20, 64);

    doc.setFont("helvetica", "bold");
    doc.text(tx.pdf_sec_detalle_pedido || 'DETALLES DEL PEDIDO', 20, 74);
    doc.setFont("helvetica", "normal");
    doc.text(`${tx.pdf_tipo_pedido_lbl || 'Tipo de Pedido:'} ${tipoPedido}`, 20, 80);
    doc.text(`${tx.pdf_especie_lbl || 'Especie / Subespecie:'} ${especie}`, 20, 86);
    doc.setTextColor(200, 0, 0);
    doc.text(`${tx.pdf_fecha_retiro_entregado || 'Fecha Retiro (Entregado):'} ${fechaEntregado}`, 20, 92);
    doc.setTextColor(0);

    doc.autoTable({
        startY: 98, margin: { left: M, right: M },
        head: [[tx.lbl_machos || 'MACHOS', tx.lbl_hembras || 'HEMBRAS', tx.lbl_indistintos || 'INDISTINTOS', tx.lbl_total_animales || 'TOTAL ANIMALES']],
        body: [[m, h, i, total]],
        headStyles: { fillColor: [26, 93, 59], halign: 'center' },
        styles: { halign: 'center', fontSize: 11, fontStyle: 'bold' },
        theme: 'grid'
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setDrawColor(200);
    doc.setFillColor(245, 245, 245);
    doc.rect(20, finalY, 170, 25, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.text(tx.pdf_control_fin || 'CONTROL FINANCIERO', 25, finalY + 8);
    doc.setFont("helvetica", "normal");
    doc.text(`${tx.pdf_costo_final_form || 'Costo Final del Formulario:'} $ ${formatBillingMoney(costoTotalNum)}`, 25, finalY + 15);
    doc.setTextColor(26, 93, 59);
    doc.text(`${tx.pdf_total_abonado_fecha || 'Total Abonado a la Fecha:'} ${pagado}`, 25, finalY + 21);

    const footerY = 265;
    doc.setDrawColor(150);
    doc.line(30, footerY, 85, footerY);
    doc.line(125, footerY, 180, footerY);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(tx.pdf_firma_resp || 'Firma Responsable Bioterio', 57, footerY + 5, { align: "center" });
    doc.text(tx.pdf_sello_fecha || 'Sello Institucional / Fecha', 152, footerY + 5, { align: "center" });

    doc.save(`Pedido_Animal_${id}.pdf`);
};

// ==========================================
// GENERACIÓN DE PDF DESDE MODAL (Alojamiento)
// ==========================================
window.descargarFichaAlojPDF = async (historiaId) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    const tx = txBM();
    const na = tx.na || 'N/A';

    const getTxt = (id) => document.getElementById(id)?.innerText || na;
    const getVal = (id) => document.getElementById(id)?.value || '0.00';

    const investigador = getTxt('pdf-aloj-inv');
    const tipoCaja = getTxt('pdf-aloj-tipo');
    const protocolo = getTxt('pdf-aloj-prot');
    const totalDias = getTxt('pdf-aloj-dias');
    const costoTotalNum = parseFloat(getVal('mdl-aloj-total')) || 0;
    const pagadoTxt = getTxt('mdl-aloj-pagado-txt');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(26, 93, 59);
    doc.text(`GROBO - ${inst}`, 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(bmTpl(tx.pdf_ficha_aloj_titulo_tpl || 'HISTORIAL DE ALOJAMIENTO #{id}', { id: historiaId }), 105, 28, { align: "center" });
    doc.line(20, 32, 190, 32);

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`${tx.pdf_ficha_aloj_investigador || 'Investigador:'} ${investigador}`, 20, 42);
    doc.setFont("helvetica", "normal");
    doc.text(`${tx.pdf_ficha_aloj_tipo_estructura || 'Tipo de Caja/Estructura:'} ${tipoCaja}`, 20, 48);
    doc.text(`${tx.pdf_ficha_aloj_protocolo || 'Protocolo:'} ${protocolo}`, 20, 54);
    doc.text(`${tx.pdf_ficha_aloj_dias_acumulados || 'Días Totales Acumulados:'} ${totalDias}`, 20, 60);

    const rows = [];
    document.querySelectorAll('#table-aloj-tramos tbody tr').forEach(tr => {
        const tds = tr.querySelectorAll('td');
        rows.push([tds[0].innerText, tds[1].innerText, tds[2].innerText, tds[3].innerText, tds[4].innerText, tds[5].innerText]);
    });

    doc.autoTable({
        startY: 68,
        head: [[
            tx.aloj_th_id || 'ID',
            tx.aloj_th_desde || 'Desde',
            tx.aloj_th_hasta || 'Hasta',
            tx.aloj_th_cant || 'Cant.',
            tx.aloj_th_dias || 'Días',
            tx.aloj_th_subtotal || 'Subtotal'
        ]],
        body: rows,
        headStyles: { fillColor: [26, 93, 59], halign: 'center' },
        columnStyles: { 0: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'right' } },
        theme: 'grid'
    });

    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setFillColor(245, 245, 245);
    doc.rect(20, finalY, 170, 22, 'F');
    doc.setFont("helvetica", "bold");
    doc.text(`${tx.pdf_ficha_aloj_costo_total_hist || 'COSTO TOTAL DE LA HISTORIA:'} $ ${formatBillingMoney(costoTotalNum)}`, 25, finalY + 8);
    doc.setTextColor(26, 93, 59);
    doc.text(`${tx.pdf_ficha_aloj_total_abonado || 'TOTAL ABONADO A LA FECHA:'} ${pagadoTxt}`, 25, finalY + 16);

    doc.save(`Ficha_Alojamiento_${historiaId}.pdf`);
};

window.descargarFichaReaPDF = async (idformA) => {
    const tx = txBM();
    const g = window.txt?.generales || {};
    const errPdf = window.txt?.facturacion?.error_pdf || 'No se pudo generar el documento PDF.';
    showLoader();
    try {
        const res = await API.request(`/billing/detail-reactive/${idformA}`);
        if (res.status !== 'success') {
            hideLoader();
            return Swal.fire(g.error || 'Error', tx.err_reactivo || 'No se pudo cargar el detalle del reactivo.', 'error');
        }
        const d = res.data;
        hideLoader();

        const total = parseFloat(d.total_calculado || 0);
        const pagado = parseFloat(d.totalpago || 0);
        const debe = Math.max(0, total - pagado);
        const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const M = 18;
        const pageW = doc.internal.pageSize.getWidth();
        const right = pageW - M;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(26, 93, 59);
        doc.text(`GROBO - ${inst}`, 105, M + 2, { align: 'center' });
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(tx.pdf_ficha_rea_titulo || 'FICHA: REACTIVO BIOLÓGICO', 105, M + 10, { align: 'center' });
        doc.setDrawColor(26, 93, 59);
        doc.line(M, M + 14, right, M + 14);

        let y = M + 22;
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.text(bmTpl(tx.pdf_id_solicitud_tpl || 'ID SOLICITUD: {id}', { id: idformA }), M, y);

        y += 10;
        doc.text(tx.pdf_sec_datos_inv_prot || 'DATOS DEL INVESTIGADOR Y PROTOCOLO', M, y);
        doc.setFont('helvetica', 'normal');
        y += 6;
        doc.text(`${tx.pdf_investigador_lbl || 'Investigador:'} ${d.titular_nombre || tx.na || 'N/A'}`, M, y);
        y += 6;
        const protTxt = String(d.protocolo_info || tx.na || 'N/A').replace(/\s+/g, ' ');
        const protLines = doc.splitTextToSize(`${tx.pdf_rea_protocolo_lbl || 'Protocolo:'} ${protTxt}`, right - M);
        doc.text(protLines, M, y);
        y += protLines.length * 5 + 4;

        doc.setFont('helvetica', 'bold');
        doc.text(tx.sec_det_bio || 'Detalles del Insumo Biológico', M, y);
        doc.setFont('helvetica', 'normal');
        y += 6;
        doc.text(`${tx.lbl_reactivo || 'Reactivo'}: ${d.nombre_reactivo || tx.na || 'N/A'}`, M, y);
        y += 6;
        const cantLbl = bmTpl(tx.lbl_cant_present_tpl || 'Cant. ({pres} {um})', {
            pres: String(d.presentacion_reactivo ?? 0),
            um: String(d.unidad_medida ?? '')
        });
        doc.text(`${cantLbl}: ${d.cantidad_organos ?? 0}`, M, y);
        y += 6;
        doc.text(`${tx.lbl_animales || 'Animales'}: ${d.animales_usados ?? 0}`, M, y);
        y += 6;
        doc.text(`${tx.lbl_inicio || 'Inicio'}: ${d.fecha_inicio || '-'}`, M, y);
        y += 6;
        doc.text(`${tx.lbl_retiro || 'Retiro'}: ${d.fecha_fin || '-'}`, M, y);
        y += 6;
        if (d.is_exento == 1) {
            doc.setTextColor(0, 120, 180);
            doc.text(tx.badge_exento || 'EXENTO', M, y);
            doc.setTextColor(0);
            y += 6;
        }
        if (d.nota_admin && String(d.nota_admin).trim()) {
            doc.setFont('helvetica', 'bold');
            doc.text(tx.pdf_rea_nota_admin_pdf || 'Nota administrativa:', M, y);
            doc.setFont('helvetica', 'normal');
            y += 5;
            const noteLines = doc.splitTextToSize(String(d.nota_admin), right - M);
            doc.text(noteLines, M, y);
            y += noteLines.length * 5 + 6;
        } else {
            y += 4;
        }

        const boxY = y;
        const boxH = d.is_exento == 1 ? 24 : 31;
        doc.setDrawColor(200);
        doc.setFillColor(245, 245, 245);
        doc.rect(M, boxY, right - M, boxH, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text(tx.pdf_control_fin || 'CONTROL FINANCIERO', M + 5, boxY + 8);
        doc.setFont('helvetica', 'normal');
        doc.text(`${tx.pdf_costo_final_form || 'Costo Final del Formulario:'} $ ${formatBillingMoney(total)}`, M + 5, boxY + 15);
        doc.setTextColor(26, 93, 59);
        doc.text(`${tx.pdf_total_abonado_fecha || 'Total Abonado a la Fecha:'} $ ${formatBillingMoney(pagado)}`, M + 5, boxY + 22);
        if (d.is_exento != 1) {
            doc.setTextColor(200, 0, 0);
            doc.text(`${tx.pdf_rea_debe_lbl || 'Deuda pendiente:'} $ ${formatBillingMoney(debe)}`, M + 5, boxY + 29);
        }
        doc.setTextColor(0);

        const footerY = 265;
        doc.setDrawColor(150);
        doc.line(30, footerY, 85, footerY);
        doc.line(125, footerY, 180, footerY);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(tx.pdf_firma_resp || 'Firma Responsable Bioterio', 57, footerY + 5, { align: 'center' });
        doc.text(tx.pdf_sello_fecha || 'Sello Institucional / Fecha', 152, footerY + 5, { align: 'center' });

        doc.save(`Pedido_Reactivo_${idformA}.pdf`);
    } catch (e) {
        hideLoader();
        console.error(e);
        Swal.fire(g.error || 'Error', errPdf, 'error');
    }
};

window.descargarFichaInsPDF = async (idformA) => {
    const tx = txBM();
    const g = window.txt?.generales || {};
    const errPdf = window.txt?.facturacion?.error_pdf || 'No se pudo generar el documento PDF.';
    showLoader();
    try {
        const res = await API.request(`/billing/detail-insumo/${idformA}`);
        if (res.status !== 'success') {
            hideLoader();
            return Swal.fire(g.error || 'Error', tx.err_insumo || 'No se pudo cargar', 'error');
        }
        const d = res.data;
        hideLoader();

        const total = parseFloat(d.total_item || 0);
        const pagado = parseFloat(d.pagado || 0);
        const saldo = parseFloat(d.saldoInv || 0);
        const debe = Math.max(0, total - pagado);
        const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const M = 18;
        const pageW = doc.internal.pageSize.getWidth();
        const right = pageW - M;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(26, 93, 59);
        doc.text(`GROBO - ${inst}`, 105, M + 2, { align: 'center' });
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(tx.pdf_ficha_ins_titulo || 'FICHA: INSUMOS', 105, M + 10, { align: 'center' });
        doc.setDrawColor(26, 93, 59);
        doc.line(M, M + 14, right, M + 14);

        let y = M + 22;
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.text(bmTpl(tx.pdf_id_solicitud_tpl || 'ID SOLICITUD: {id}', { id: idformA }), M, y);

        y += 10;
        doc.setFont('helvetica', 'normal');
        doc.text(`${tx.lbl_solicitante || 'Solicitante'}: ${d.solicitante || tx.na || 'N/A'}`, M, y);
        y += 8;

        doc.setFont('helvetica', 'bold');
        doc.text(tx.pdf_ins_detalle_sec || 'Detalle del pedido', M, y);
        doc.setFont('helvetica', 'normal');
        y += 5;
        const bullets = String(d.detalle_completo || '').split('|').map(s => s.trim()).filter(Boolean);
        const detalleTxt = bullets.length ? bullets.map(b => `• ${b}`).join('\n') : (tx.na || 'N/A');
        const detLines = doc.splitTextToSize(detalleTxt, right - M);
        doc.text(detLines, M, y);
        y += detLines.length * 5 + 8;

        const boxY = y;
        const boxH = 40;
        doc.setDrawColor(200);
        doc.setFillColor(245, 245, 245);
        doc.rect(M, boxY, right - M, boxH, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text(tx.pdf_control_fin || 'CONTROL FINANCIERO', M + 5, boxY + 8);
        doc.setFont('helvetica', 'normal');
        doc.text(`${tx.lbl_saldo_disponible_uc || 'SALDO DISPONIBLE'}: $ ${formatBillingMoney(saldo)}`, M + 5, boxY + 15);
        doc.text(`${tx.pdf_costo_final_form || 'Costo Final del Formulario:'} $ ${formatBillingMoney(total)}`, M + 5, boxY + 22);
        doc.setTextColor(26, 93, 59);
        doc.text(`${tx.pdf_total_abonado_fecha || 'Total Abonado a la Fecha:'} $ ${formatBillingMoney(pagado)}`, M + 5, boxY + 29);
        doc.setTextColor(200, 0, 0);
        doc.text(`${tx.pdf_ins_debe_lbl || 'Deuda pendiente:'} $ ${formatBillingMoney(debe)}`, M + 5, boxY + 36);
        doc.setTextColor(0);

        const footerY = 265;
        doc.setDrawColor(150);
        doc.line(30, footerY, 85, footerY);
        doc.line(125, footerY, 180, footerY);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(tx.pdf_firma_resp || 'Firma Responsable Bioterio', 57, footerY + 5, { align: 'center' });
        doc.text(tx.pdf_sello_fecha || 'Sello Institucional / Fecha', 152, footerY + 5, { align: 'center' });

        doc.save(`Pedido_Insumo_${idformA}.pdf`);
    } catch (e) {
        hideLoader();
        console.error(e);
        Swal.fire(g.error || 'Error', errPdf, 'error');
    }
};