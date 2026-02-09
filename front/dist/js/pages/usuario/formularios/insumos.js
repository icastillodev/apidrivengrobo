import { API } from '../../../api.js';

let deptosList = [];
let catalogInsumos = [];
let selectedItems = []; 
let dataFull = null; // Almacén para el PDF de precios e info institucional

export async function initInsumosForm() {
    const instId = localStorage.getItem('instId');
    const instName = localStorage.getItem('NombreInst');
    document.getElementById('lbl-institution-name').innerText = instName;

    // Resetear formulario
    window.resetSelection = () => {
        document.getElementById('step-2').classList.add('hidden-section');
        document.getElementById('step-1').classList.remove('hidden-section');
        document.getElementById('depto-search').value = "";
        selectedItems = [];
    };

    try {
        const res = await API.request(`/insumos-form/init?inst=${instId}`);
        if (res.status === 'success') {
            const data = res.data;
            deptosList = data.departamentos;
            catalogInsumos = data.insumos;
            dataFull = data; // Guardamos todo para el PDF

            document.getElementById('id-tipo-form').value = data.id_tipo_default;
            
            // Configurar Modal de Correo
            const correo = (data.institucion && data.institucion.InstCorreo) ? data.institucion.InstCorreo : '';
            const asunto = "WEB GROBO SOLICITUD DE DEPARTAMENTO"; // Exactamente como pediste
            
            document.getElementById('lbl-inst-correo').innerText = correo || 'No configurado';
            
            if (correo) {
                // Generamos el mailto dinámico
                document.getElementById('mail-to-inst').href = `mailto:${correo}?subject=${encodeURIComponent(asunto)}`;
            } else {
                // Si no hay correo, deshabilitamos el botón visualmente
                const btnMail = document.getElementById('mail-to-inst');
                btnMail.classList.add('disabled');
                btnMail.href = '#';
            }

            setupSearch();
            setupPDFButton();
        }
    } catch (e) { console.error("Error en init:", e); }

    document.getElementById('btn-add-row').onclick = () => {
        if (selectedItems.length < catalogInsumos.length) {
            selectedItems.push({ idInsumo: "", cantidad: 1 });
            renderRows();
        }
    };

    document.getElementById('insumos-form').onsubmit = handleSubmit;
}

/* --- BÚSQUEDA --- */
function setupSearch() {
    const input = document.getElementById('depto-search');
    const list = document.getElementById('depto-list');

    const renderList = (items) => {
        list.innerHTML = '';
        if (items.length === 0) { list.classList.add('d-none'); return; }
        
        items.forEach(d => {
            const item = document.createElement('div');
            item.className = "list-group-item list-group-item-action result-item p-3";
            item.innerHTML = `<h6 class="fw-bold mb-0">${d.NombreDeptoA}</h6>`;
            item.onclick = () => {
                document.getElementById('step-1').classList.add('hidden-section');
                document.getElementById('step-2').classList.remove('hidden-section');
                document.getElementById('selected-depto-id').value = d.iddeptoA;
                document.getElementById('info-depto').innerText = d.NombreDeptoA;
                
                selectedItems = [{ idInsumo: "", cantidad: 1 }];
                renderRows();
            };
            list.appendChild(item);
        });
        list.classList.remove('d-none');
    };

    input.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        renderList(deptosList.filter(d => d.NombreDeptoA.toLowerCase().includes(term)));
    });

    input.addEventListener('focus', () => renderList(deptosList));
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !list.contains(e.target)) list.classList.add('d-none');
    });
}

/* --- TABLA DINÁMICA --- */
function renderRows() {
    const container = document.getElementById('insumos-table-body');
    container.innerHTML = '';

    const usedIds = selectedItems.map(si => si.idInsumo).filter(id => id !== "");

    selectedItems.forEach((si, index) => {
        const tr = document.createElement('tr');
        
        let options = `<option value="">-- Seleccionar Insumo --</option>`;
        catalogInsumos.forEach(ins => {
            const isUsed = usedIds.includes(String(ins.idInsumo));
            const isCurrent = String(ins.idInsumo) === String(si.idInsumo);
            
            if (!isUsed || isCurrent) {
                options += `<option value="${ins.idInsumo}" ${isCurrent ? 'selected' : ''}>
                    ${ins.NombreInsumo} (${ins.CantidadInsumo} ${ins.TipoInsumo})
                </option>`;
            }
        });

        tr.innerHTML = `
            <td class="ps-4">
                <select class="form-select border-0 bg-transparent fw-bold row-insumo" data-index="${index}">
                    ${options}
                </select>
            </td>
            <td>
                <div class="input-group input-group-sm justify-content-center">
                    <input type="number" class="form-control text-center fw-bold row-qty" data-index="${index}" min="1" value="${si.cantidad}" style="max-width: 100px;">
                </div>
            </td>
            <td class="pe-4 text-end">
                ${selectedItems.length > 1 ? `
                    <button type="button" class="btn btn-link text-danger p-0" onclick="window.removeRow(${index})">
                        <i class="bi bi-trash"></i>
                    </button>` : ''}
            </td>
        `;
        container.appendChild(tr);
    });

    document.querySelectorAll('.row-insumo').forEach(el => el.onchange = (e) => {
        selectedItems[e.target.dataset.index].idInsumo = e.target.value;
        renderRows(); 
    });
    document.querySelectorAll('.row-qty').forEach(el => el.onchange = (e) => {
        selectedItems[e.target.dataset.index].cantidad = e.target.value;
    });

    const btnAdd = document.getElementById('btn-add-row');
    if (usedIds.length >= catalogInsumos.length) btnAdd.classList.add('d-none');
    else btnAdd.classList.remove('d-none');
}

window.removeRow = (index) => {
    selectedItems.splice(index, 1);
    renderRows();
};

/* --- PDF LOGIC --- */
function setupPDFButton() {
    const btn = document.getElementById('btn-tarifario');
    const lbl = document.getElementById('lbl-tarifario-titulo');
    if (!btn || !dataFull) return;

    const titulo = (dataFull.institucion && dataFull.institucion.tituloprecios) 
        ? dataFull.institucion.tituloprecios : 'VER TARIFARIO';
    if(lbl) lbl.innerText = titulo;
    
    btn.classList.remove('d-none');
    btn.onclick = () => generateInsumosPDF(dataFull);
}

function generateInsumosPDF(data) {
    const inst = localStorage.getItem('NombreInst');
    const fecha = new Date().toLocaleDateString();
    
    // Generar filas de tabla para el PDF
    const rows = data.insumos.map(i => `
        <tr>
            <td style="padding: 6px; border: 1px solid #ddd;">${i.NombreInsumo}</td>
            <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${i.CantidadInsumo} ${i.TipoInsumo}</td>
            <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-weight: bold;">$ ${i.PrecioInsumo}</td>
        </tr>
    `).join('');

    const template = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <div style="text-align: center; border-bottom: 2px solid #0d6efd; margin-bottom: 20px;">
                <h2 style="color: #0d6efd; margin: 0;">GROBO - ${inst}</h2>
                <h4 style="margin: 5px 0;">TARIFARIO DE INSUMOS</h4>
                <p style="font-size: 11px;">Fecha: ${fecha}</p>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <tr style="background: #f8f9fa;"><th>Nombre</th><th>Presentación</th><th>Precio</th></tr>
                ${rows}
            </table>
        </div>`;

    html2pdf().set({ margin: 10, filename: `Insumos_${inst}.pdf`, html2canvas: { scale: 2 } }).from(template).save();
}

/* --- ENVÍO --- */
async function handleSubmit(e) {
    e.preventDefault();
    const cleanItems = selectedItems.filter(i => i.idInsumo !== "");
    
    // Captura de nuevos campos
    const fechaRetiro = document.getElementById('fecha-retiro').value;
    const aclaracion = document.getElementById('aclaracion-pedido').value;

    // Validación extra
    if(cleanItems.length === 0) {
        return Swal.fire('Atención', 'Seleccione al menos un insumo válido.', 'warning');
    }
    if(!fechaRetiro) {
        return Swal.fire('Atención', 'Debe indicar una fecha estimada de retiro.', 'warning');
    }

    const confirm = await Swal.fire({
        title: '¿Confirmar Pedido?',
        text: `Se enviará una solicitud de ${cleanItems.length} insumo(s).`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'SÍ, ENVIAR',
        confirmButtonColor: '#0d6efd'
    });

    if (confirm.isConfirmed) {
        Swal.fire({ title: 'Procesando...', didOpen: () => Swal.showLoading() });
        
        const payload = {
            instId: localStorage.getItem('instId'),
            userId: localStorage.getItem('userId'),
            idDepto: document.getElementById('selected-depto-id').value,
            idTipoFormulario: document.getElementById('id-tipo-form').value,
            
            // Nuevos datos enviados al backend
            fecRetiroA: fechaRetiro,
            aclaraA: aclaracion,
            
            items: cleanItems
        };

        try {
            const res = await API.request('/insumos-form/save', 'POST', payload);
            if (res.status === 'success') {
                await Swal.fire('¡Enviado!', `El pedido #${res.id} ha sido registrado.`, 'success');
                window.location.href = '../misformularios.html';
            } else {
                 Swal.fire('Error', res.message || 'Error desconocido', 'error');
            }
        } catch(err) {
            Swal.fire('Error', 'No se pudo procesar la solicitud.', 'error');
        }
    }
}