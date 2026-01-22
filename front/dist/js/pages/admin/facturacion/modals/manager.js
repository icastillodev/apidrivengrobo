/**
 * MANAGER DE MODALES - BIOTERIOS GROBO
 * Ubicación: js/pages/admin/facturacion/Modals/manager.js
 */
import { API } from '../../../../api.js';
import { hideLoader, showLoader } from '../../../../components/LoaderComponent.js'; // IMPORTACIÓN REQUERIDA AQUÍ
import { openAnimalModal } from './animalModal.js';
import { openAlojModal } from './alojamientos/alojModal.js';
import { openReactiveModal } from './reactiveModal.js';
import { openInsumoModal } from './insumoModal.js';

/**
 * Función Global: Decide qué modal abrir
 */
window.abrirEdicionFina = (tipo, id) => {
    switch (tipo) {
        case 'ANIMAL':
            openAnimalModal(id);
            break;
        case 'ALOJ': // 2. AGREGA EL CASO PARA ALOJAMIENTO
            openAlojModal(id);
            break;
        case 'REACTIVO':
            openReactiveModal(id); // Próximamente
            break;
        case 'INSUMO':
            openInsumoModal(id); // Próximamente
            break;
    }
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




/**
 * Lógica para editar el Total de la Historia
 */
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
        window.cargarFacturacionDepto();
    }
};

/**
 * Lógica de Pago/Quitar con límites automáticos
 */
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
        // Límite 1: No puede pagar más de lo que debe
        if (montoAProcesar > deudaPendiente) {
            montoAProcesar = deudaPendiente;
            notaAjuste = `Ajustado a la deuda máxima: $${montoAProcesar.toFixed(2)}.`;
        }
        // Límite 2: No puede pagar más de lo que tiene el investigador
        if (montoAProcesar > saldoInvestigador) {
            montoAProcesar = saldoInvestigador;
            notaAjuste = `Ajustado al saldo disponible: $${montoAProcesar.toFixed(2)}.`;
        }
    } else { // ACCION === 'QUITAR'
        // Límite: No puede quitar más de lo que ya pagó (mínimo queda en 0)
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
                    if (window.cargarFacturacionDepto) window.cargarFacturacionDepto();
                }, 300);
            }
        } catch (e) { console.error(e); hideLoader(); }
    }
};


/**
 * Lógica de Pago/Quitar para Reactivos
 */
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
            bootstrap.Modal.getInstance(document.getElementById('modalReactivo')).hide();
            setTimeout(() => {
                openReactiveModal(id);
                if(window.cargarFacturacionDepto) window.cargarFacturacionDepto();
            }, 300);
        }
    }
};

/**
 * Editar costo total del reactivo
 */
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
        window.cargarFacturacionDepto();
    }
};


/**
 * Lógica de Pago/Quitar para el Módulo de Insumos
 * Apunta al nuevo endpoint especializado para Insumos/Reactivos
 */
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
                const modalEl = document.getElementById('modalInsumo');
                const modalInstance = bootstrap.Modal.getInstance(modalEl);
                if (modalInstance) modalInstance.hide();

                setTimeout(async () => {
                    openInsumoModal(id);
                    if (window.cargarFacturacionDepto) window.cargarFacturacionDepto();
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

/**
 * Función para permitir editar el total del pedido de insumos
 */
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
        window.cargarFacturacionDepto();
    }
};


/**
 * Genera el reporte PDF Global del Departamento
 * Ajustado: Encabezado personalizado, sin saldos y con Badges de EXENTO.
 */
window.downloadGlobalPDF = async () => {
    if (!currentReportData) {
        return Swal.fire('Aviso', 'No hay datos cargados.', 'info');
    }
    
    showLoader();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4'); 
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    
    // Obtenemos el nombre del departamento del selector de la interfaz
    const deptoNombre = document.getElementById('select-depto')?.selectedOptions[0]?.text || 'GENERAL';
    const verdeGrobo = [26, 93, 59];

    // 1. ENCABEZADO PERSONALIZADO
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(verdeGrobo[0], verdeGrobo[1], verdeGrobo[2]);
    doc.text("REPORTE DE FACTURACIÓN", 148, 15, { align: "center" });
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`DEPARTAMENTO: ${deptoNombre.toUpperCase()}`, 148, 22, { align: "center" });
    doc.setDrawColor(verdeGrobo[0], verdeGrobo[1], verdeGrobo[2]);
    doc.line(15, 25, 282, 25);

    // 2. RESUMEN DE TOTALES (DASHBOARD)
    const t = currentReportData.totales;
    doc.autoTable({
        startY: 32,
        head: [['DEUDA ANIMALES', 'DEUDA REACTIVOS', 'DEUDA ALOJAMIENTO', 'DEUDA INSUMOS', 'PAGADO GLOBAL', 'DEUDA GLOBAL']],
        body: [[
            `$ ${t.deudaAnimales.toFixed(2)}`, 
            `$ ${t.deudaReactivos.toFixed(2)}`, 
            `$ ${t.deudaAlojamiento.toFixed(2)}`, 
            `$ ${t.deudaInsumos.toFixed(2)}`, 
            `$ ${t.totalPagado.toFixed(2)}`,
            { content: `$ ${t.globalDeuda.toFixed(2)}`, styles: { textColor: [180, 0, 0], fontStyle: 'bold' } }
        ]],
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40], halign: 'center' },
        styles: { halign: 'center', fontSize: 10 }
    });

    let currentY = doc.lastAutoTable.finalY + 12;

    // 3. SECCIÓN POR PROTOCOLO
    currentReportData.protocolos.forEach((prot) => {
        if (currentY > 180) { doc.addPage(); currentY = 20; }

        // Banner del Protocolo
        doc.setFillColor(245, 245, 245);
        doc.rect(15, currentY, 267, 8, 'F');
        doc.setFontSize(10);
        doc.setTextColor(verdeGrobo[0], verdeGrobo[1], verdeGrobo[2]);
        doc.text(`PROT: ${prot.nprotA} | INVESTIGADOR: ${prot.investigador}`, 18, currentY + 6);
        
        // Tabla de Formularios
        if (prot.formularios?.length > 0) {
            const bodyForms = prot.formularios.map(f => {
                const isExento = (f.is_exento == 1 || f.exento == 1);
                const isRea = f.categoria?.toLowerCase().includes('reactivo');
                
                // Formateo de Especie
                const esp = f.nombre_especie || '---';
                const sub = (f.nombre_subespecie && f.nombre_subespecie !== 'N/A') ? `:${f.nombre_subespecie}` : '';
                
                // Formateo de Cantidad
                const cant = isRea 
                    ? `${f.NombreInsumo} (${f.TipoInsumo}) ${f.CantidadInsumo} - ${f.cant_organo} un.`
                    : `${f.cant_animal} un.`;

                // Badge de Exento en el ID
                const idDisplay = isExento ? `${f.id} (EXENTO)` : f.id;

                return [
                    { content: idDisplay, styles: { fontStyle: isExento ? 'bold' : 'normal', textColor: isExento ? [0, 150, 200] : [0, 0, 0] } },
                    f.solicitante,
                    esp + sub,
                    f.detalle_display.replace(/<[^>]*>/g, ""), // Limpiar HTML
                    cant,
                    `$ ${parseFloat(f.total).toFixed(2)}`,
                    isExento ? '$ 0.00' : `$ ${parseFloat(f.debe).toFixed(2)}`
                ];
            });

            doc.autoTable({
                startY: currentY + 10,
                head: [['ID', 'Solicitante', 'Especie', 'Detalle', 'Cantidad', 'Total', 'Debe']],
                body: bodyForms,
                theme: 'grid',
                headStyles: { fillColor: verdeGrobo },
                styles: { fontSize: 7 },
                columnStyles: { 3: { cellWidth: 50 }, 4: { cellWidth: 55 } }
            });
            currentY = doc.lastAutoTable.finalY + 5;
        }

        // Tabla de Alojamientos
        if (prot.alojamientos?.length > 0) {
            const bodyAloj = prot.alojamientos.map(a => [
                a.historia,
                `Alojamiento Especie: ${a.especie}`,
                a.fecha_ingreso,
                a.fecha_salida || 'EN CURSO',
                `$ ${parseFloat(a.total).toFixed(2)}`,
                `$ ${parseFloat(a.debe).toFixed(2)}`
            ]);

            doc.autoTable({
                startY: currentY,
                head: [['ID Historia', 'Concepto', 'Ingreso', 'Salida', 'Total', 'Debe']],
                body: bodyAloj,
                theme: 'grid',
                headStyles: { fillColor: [100, 100, 100] },
                styles: { fontSize: 7 },
                margin: { left: 50 }
            });
            currentY = doc.lastAutoTable.finalY + 12;
        } else {
            currentY += 8;
        }
    });

    // 4. PIE DE PÁGINA
    const pages = doc.internal.getNumberOfPages();
    for (let j = 1; j <= pages; j++) {
        doc.setPage(j);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Institución: ${inst} | Generado: ${new Date().toLocaleString()}`, 15, 202);
        doc.text(`Página ${j} de ${pages}`, 282, 202, { align: "right" });
    }

    doc.save(`Facturacion_${deptoNombre}_${inst}.pdf`);
    hideLoader();
};