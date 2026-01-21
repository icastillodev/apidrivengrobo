/**
 * MANAGER DE MODALES - BIOTERIOS GROBO
 * Ubicación: js/pages/admin/facturacion/Modals/manager.js
 */
import { API } from '../../../../api.js';
import { hideLoader, showLoader } from '../../../../components/LoaderComponent.js'; // IMPORTACIÓN REQUERIDA AQUÍ
import { openAnimalModal } from './animalModal.js';

// Despachador de modales
window.abrirEdicionFina = (tipo, id) => {
    if (tipo === 'ANIMAL') openAnimalModal(id);
    // Próximamente: REACTIVO, INSUMO, ALOJ
};

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
        // No pagar más de lo que el investigador tiene
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
                bootstrap.Modal.getInstance(document.getElementById('modalAnimal')).hide();
                await openAnimalModal(id); // Recarga datos frescos
                window.cargarFacturacionDepto(); // Refresca grilla principal
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
        showLoader(); // Uso de loader corregido
        await API.request('/billing/update-total', 'POST', { id, total: nuevoTotal });
        hideLoader();
        inp.setAttribute('readonly', true);
        window.cargarFacturacionDepto();
    }
};

window.renderAndShowModal = (html, modalId) => {
    const container = document.getElementById('modal-container');
    container.innerHTML = html;
    const myModal = new bootstrap.Modal(document.getElementById(modalId));
    myModal.show();
};



/**
 * GENERACIÓN DE PDF PROFESIONAL - BIOTERIOS GROBO
 * Construcción manual para evitar errores de renderizado.
 */
window.descargarFichaPDF = async (id, tipo) => {
    if (tipo !== 'ANIMAL') return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();

    // 1. Captura de datos desde el Modal Abierto
    // Función auxiliar interna para buscar valores por etiqueta de label
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

    // Conteo de animales
    const counts = Array.from(document.querySelectorAll('#modalAnimal .row.g-2.text-center b, #modalAnimal .row.g-2.text-center span'));
    const m = counts[0]?.innerText || '0';
    const h = counts[1]?.innerText || '0';
    const i = counts[2]?.innerText || '0';
    const total = counts[3]?.innerText || '0';

    // Datos Financieros
    const costoTotal = document.getElementById('mdl-ani-total')?.value || '0.00';
    const pagado = document.getElementById('mdl-ani-pagado-txt')?.innerText || '$ 0.00';

    // 2. Diseño del Documento
    // --- Encabezado ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(26, 93, 59); // Verde Institucional
    doc.text(`GROBO - ${inst}`, 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("FICHA DE PEDIDO: ANIMALES DE LABORATORIO", 105, 28, { align: "center" });
    doc.setDrawColor(26, 93, 59);
    doc.line(20, 32, 190, 32);

    // --- Bloque de Información Principal ---
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
    doc.setTextColor(200, 0, 0); // Rojo para la fecha de retiro
    doc.text(`Fecha Retiro (Entregado): ${fechaEntregado}`, 20, 92);
    doc.setTextColor(0);

    // 3. Tabla de Cantidades (autoTable)
    doc.autoTable({
        startY: 98,
        head: [['MACHOS', 'HEMBRAS', 'INDISTINTOS', 'TOTAL ANIMALES']],
        body: [[m, h, i, total]],
        headStyles: { fillColor: [26, 93, 59], halign: 'center' },
        styles: { halign: 'center', fontSize: 11, fontStyle: 'bold' },
        theme: 'grid'
    });

    // 4. Cuadro de Resumen Financiero
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

    // 5. Pie de Página y Firmas
    const footerY = 265;
    doc.setDrawColor(150);
    doc.line(30, footerY, 85, footerY);
    doc.line(125, footerY, 180, footerY);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("Firma Responsable Bioterio", 57, footerY + 5, { align: "center" });
    doc.text("Sello Institucional / Fecha", 152, footerY + 5, { align: "center" });

    // Guardar el archivo
    doc.save(`Pedido_Animal_${id}.pdf`);
};