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
    const container = document.getElementById('modal-container');
    container.innerHTML = html;
    const myModal = new bootstrap.Modal(document.getElementById(modalId));
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

    if (accion === 'PAGAR') {
        // No pagar más de lo que se debe
        if (montoFinal > debe) {
            montoFinal = debe;
            advertencia = `El monto se ajustó a $${montoFinal} (máximo de deuda).`;
        }
        // No pagar más de lo que el investigador tiene en la billetera
        if (montoFinal > saldo) {
            montoFinal = saldo;
            advertencia = `El monto se ajustó a $${montoFinal} (saldo disponible).`;
        }
    } else { // ACCION === 'QUITAR'
        // No quitar más de lo que ya se pagó
        if (montoFinal > pagado) {
            montoFinal = pagado;
            advertencia = `El monto se ajustó a $${montoFinal} (monto ya pagado).`;
        }
    }

    if (montoFinal <= 0) {
        return Swal.fire('Operación cancelada', 'No hay montos pendientes o saldo suficiente para procesar.', 'warning');
    }

    const confirm = await Swal.fire({
        title: `¿Confirmar ${accion}?`,
        text: advertencia || `Se procesarán $${montoFinal.toFixed(2)}`,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Procesar',
        cancelButtonText: 'Cancelar'
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
                Swal.fire('Error', res.message, 'error');
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

    if (accion === 'PAGAR') {
        if (montoAProcesar > deudaPendiente) {
            montoAProcesar = deudaPendiente;
            notaAjuste = `Ajustado a la deuda máxima: $${montoAProcesar.toFixed(2)}.`;
        }
        if (montoAProcesar > saldoInvestigador) {
            montoAProcesar = saldoInvestigador;
            notaAjuste = `Ajustado ao saldo disponível: $${montoAProcesar.toFixed(2)}.`;
        }
    } else { 
        if (montoAProcesar > yaPagado) {
            montoAProcesar = yaPagado;
            notaAjuste = `Ajustado al monto pagado: $${montoAProcesar.toFixed(2)}.`;
        }
    }

    if (montoAProcesar <= 0) {
        return Swal.fire('Operación no requerida', 'El monto resultante es 0 o no hay saldo/deuda para procesar.', 'info');
    }

    const confirm = await Swal.fire({
        title: `¿Confirmar ${accion}?`,
        text: notaAjuste || `Se procesarán $${montoAProcesar.toFixed(2)}`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Procesar',
        cancelButtonText: 'Cancelar'
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

    if (montoFinal <= 0) return Swal.fire('Aviso', 'Monto no válido o sin saldo/deuda.', 'info');

    const confirm = await Swal.fire({
        title: `¿Confirmar ${accion}?`,
        text: `Monto: $${montoFinal.toFixed(2)}`,
        icon: 'question',
        showCancelButton: true
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

    const confirm = await Swal.fire({
        title: `¿Confirmar ${accion}?`,
        text: `Monto: $${montoAProcesar.toFixed(2)}`,
        icon: 'question',
        showCancelButton: true
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
                Swal.fire('Error', res.message, 'error');
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
// GENERACIÓN DE PDF DESDE MODAL (Formularios)
// ==========================================
window.descargarFichaPDF = async (id, tipo) => {
    if (tipo !== 'ANIMAL') return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();

    const findValue = (labelTxt) => {
        const labels = Array.from(document.querySelectorAll('#modalAnimal label'));
        const target = labels.find(l => l.innerText.includes(labelTxt));
        return target ? target.nextElementSibling?.innerText || '---' : '---';
    };

    const investigador = document.querySelector('#modalAnimal .text-primary.fw-bold')?.innerText || '---';
    const protocoloID = findValue('ID PROTOCOLO:');
    const protocoloNom = findValue('NOMBRE PROTOCOLO');
    const tipoPedido = findValue('TIPO DE PEDIDO');
    const especie = findValue('ESPECIE / SUBESPECIE');
    const fechaEntregado = findValue('FECHA RETIRO (REAL)');

    const counts = Array.from(document.querySelectorAll('#modalAnimal .row.g-2.text-center b, #modalAnimal .row.g-2.text-center span'));
    const m = counts[0]?.innerText || '0';
    const h = counts[1]?.innerText || '0';
    const i = counts[2]?.innerText || '0';
    const total = counts[3]?.innerText || '0';

    const costoTotal = document.getElementById('mdl-ani-total')?.value || '0.00';
    const pagado = document.getElementById('mdl-ani-pagado-txt')?.innerText || '$ 0.00';

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(26, 93, 59);
    doc.text(`GROBO - ${inst}`, 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("FICHA DE PEDIDO: ANIMALES DE LABORATORIO", 105, 28, { align: "center" });
    doc.setDrawColor(26, 93, 59);
    doc.line(20, 32, 190, 32);

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`ID SOLICITUD: ${id}`, 20, 42);

    doc.text("DATOS DEL INVESTIGADOR Y PROTOCOLO", 20, 52);
    doc.setFont("helvetica", "normal");
    doc.text(`Investigador: ${investigador}`, 20, 58);
    doc.text(`Protocolo: ${protocoloNom} (ID: ${protocoloID})`, 20, 64);

    doc.setFont("helvetica", "bold");
    doc.text("DETALLES DEL PEDIDO", 20, 74);
    doc.setFont("helvetica", "normal");
    doc.text(`Tipo de Pedido: ${tipoPedido}`, 20, 80);
    doc.text(`Especie / Subespecie: ${especie}`, 20, 86);
    doc.setTextColor(200, 0, 0); 
    doc.text(`Fecha Retiro (Entregado): ${fechaEntregado}`, 20, 92);
    doc.setTextColor(0);

    doc.autoTable({
        startY: 98,
        head: [['MACHOS', 'HEMBRAS', 'INDISTINTOS', 'TOTAL ANIMALES']],
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
    doc.text("CONTROL FINANCIERO", 25, finalY + 8);
    doc.setFont("helvetica", "normal");
    doc.text(`Costo Final del Formulario: $ ${costoTotal}`, 25, finalY + 15);
    doc.setTextColor(26, 93, 59);
    doc.text(`Total Abonado a la Fecha: ${pagado}`, 25, finalY + 21);

    const footerY = 265;
    doc.setDrawColor(150);
    doc.line(30, footerY, 85, footerY);
    doc.line(125, footerY, 180, footerY);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("Firma Responsable Bioterio", 57, footerY + 5, { align: "center" });
    doc.text("Sello Institucional / Fecha", 152, footerY + 5, { align: "center" });

    doc.save(`Pedido_Animal_${id}.pdf`);
};

// ==========================================
// GENERACIÓN DE PDF DESDE MODAL (Alojamiento)
// ==========================================
window.descargarFichaAlojPDF = async (historiaId) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();

    const getTxt = (id) => document.getElementById(id)?.innerText || '---';
    const getVal = (id) => document.getElementById(id)?.value || '0.00';

    const investigador = getTxt('pdf-aloj-inv');
    const tipoCaja = getTxt('pdf-aloj-tipo');
    const protocolo = getTxt('pdf-aloj-prot');
    const totalDias = getTxt('pdf-aloj-dias');
    const costoTotal = getVal('mdl-aloj-total');
    const pagadoTxt = getTxt('mdl-aloj-pagado-txt');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(26, 93, 59);
    doc.text(`GROBO - ${inst}`, 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`HISTORIAL DE ALOJAMIENTO #${historiaId}`, 105, 28, { align: "center" });
    doc.line(20, 32, 190, 32);

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`Investigador: ${investigador}`, 20, 42);
    doc.setFont("helvetica", "normal");
    doc.text(`Tipo de Caja/Estructura: ${tipoCaja}`, 20, 48);
    doc.text(`Protocolo: ${protocolo}`, 20, 54);
    doc.text(`Días Totales Acumulados: ${totalDias}`, 20, 60);

    const rows = [];
    document.querySelectorAll('#table-aloj-tramos tbody tr').forEach(tr => {
        const tds = tr.querySelectorAll('td');
        rows.push([tds[0].innerText, tds[1].innerText, tds[2].innerText, tds[3].innerText, tds[4].innerText, tds[5].innerText]);
    });

    doc.autoTable({
        startY: 68,
        head: [['ID', 'Desde', 'Hasta', 'Cantidad', 'Días', 'Subtotal']],
        body: rows,
        headStyles: { fillColor: [26, 93, 59], halign: 'center' },
        columnStyles: { 0: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'right' } },
        theme: 'grid'
    });

    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setFillColor(245, 245, 245);
    doc.rect(20, finalY, 170, 22, 'F');
    doc.setFont("helvetica", "bold");
    doc.text(`COSTO TOTAL DE LA HISTORIA: $ ${costoTotal}`, 25, finalY + 8);
    doc.setTextColor(26, 93, 59);
    doc.text(`TOTAL ABONADO A LA FECHA: ${pagadoTxt}`, 25, finalY + 16);

    doc.save(`Ficha_Alojamiento_${historiaId}.pdf`);
};