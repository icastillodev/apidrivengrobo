import { API } from '../../api.js';
import { hideLoader, showLoader } from '../../components/LoaderComponent.js';

let dataFull = { especies: [], subespecies: [], insumos: [], insumosExp: [], institucion: {} };

export async function initPreciosPage() {
    const instId = localStorage.getItem('instId');
    try {
        showLoader();
        const res = await API.request(`/precios/all-data?inst=${instId}`);
        if (res && res.status === 'success') {
            dataFull = res.data;
            
            // CARGA DE VALORES INSTITUCIONALES
            const inputJornada = document.getElementById('jornada-precio');
            if (inputJornada) inputJornada.value = dataFull.institucion.PrecioJornadaTrabajoExp || 0;
            
            // CARGA DEL NUEVO CAMPO TITULO
            const inputTitulo = document.getElementById('titulo-precios');
            if (inputTitulo) inputTitulo.value = dataFull.institucion.tituloprecios || '';
            
            renderAllPriceTables();
        }
        hideLoader();
    } catch (e) { console.error("Error:", e); hideLoader(); }
}

/**
 * RENDERIZADO DE ANIMALES (NOMBRES FIJOS)
 */
window.renderAllPriceTables = () => {
    const term = document.getElementById('search-input-precios').value.toLowerCase().trim();
    const tbodyAn = document.getElementById('tbody-precios-animales');
    let htmlAn = '';

    dataFull.especies.forEach(e => {
        const subVinculadas = dataFull.subespecies.filter(s => 
            String(s.idespA) === String(e.idespA) && String(s.Existe) !== "2"
        );

        const tienePrecioBase = parseFloat(e.Panimal) > 0 || parseFloat(e.PalojamientoChica) > 0 || parseFloat(e.PalojamientoGrande) > 0;
        const cumpleBusqueda = e.EspeNombreA.toLowerCase().includes(term);
        const esVisible = tienePrecioBase || subVinculadas.length > 0;

        if (esVisible && cumpleBusqueda) {
            
            // FILA ESPECIE: Nombre FIJO
            htmlAn += `
                <tr class="table-light fw-bold" data-id="${e.idespA}" data-type="especie" style="border-left: 5px solid #1a5d3b;">
                    <td class="bg-light">
                        <i class="bi bi-tag-fill text-success me-2"></i>
                        <span class="text-uppercase">${e.EspeNombreA}</span> <small class="text-muted">(BASE)</small>
                    </td>
                    <td><input type="number" class="form-control form-control-sm pan" value="${e.Panimal}"></td>
                    <td><input type="number" class="form-control form-control-sm pch" value="${e.PalojamientoChica}"></td>
                    <td><input type="number" class="form-control form-control-sm pgr" value="${e.PalojamientoGrande}"></td>
                </tr>`;

            // FILAS SUBESPECIES: Nombre FIJO
            if (subVinculadas.length > 0) {
                htmlAn += `
                    <tr class="bg-light small fw-bold text-muted">
                        <td class="ps-4 italic text-primary">Variedad / Subespecie</td>
                        <td class="text-primary">Precio Animal</td>
                        <td colspan="2" class="bg-white border-0"></td> 
                    </tr>`;

                subVinculadas.forEach(s => {
                    htmlAn += `
                        <tr data-id="${s.idsubespA}" data-type="subespecie">
                            <td class="ps-5 small">
                                <i class="bi bi-arrow-return-right me-2 text-secondary"></i>${s.SubEspeNombreA}
                            </td>
                            <td><input type="number" class="form-control form-control-sm pan" value="${s.Psubanimal}"></td>
                            <td colspan="2" class="bg-white border-0"></td> 
                        </tr>`;
                });
            }
        }
    });

    if (htmlAn !== '') {
        htmlAn += `
            <tr class="bg-white">
                <td colspan="4" class="text-end p-3">
                    <small class="text-danger fw-bold italic">
                        * Nota: Los elementos con valores en cero (0) en Precio Animal, Caja Chica o Caja Grande serán omitidos en el reporte PDF.
                    </small>
                </td>
            </tr>`;
    }

    tbodyAn.innerHTML = htmlAn || '<tr><td colspan="4" class="text-center p-3 text-muted">No se encontraron registros activos.</td></tr>';
    
    if (typeof renderSuppliesTables === 'function') renderSuppliesTables(term);
};

/**
 * RENDER DE INSUMOS (NOMBRES FIJOS)
 */
function renderSuppliesTables(term) {
    const renderInsumo = (i, type) => `
        <tr data-id="${type === 'exp' ? i.IdInsumoexp : i.idInsumo}" data-type="${type === 'exp' ? 'insumo-exp' : 'insumo'}">
            <td class="small">${i.NombreInsumo}</td>
            <td class="small text-center fw-bold">${i.CantidadInsumo || 0} ${i.TipoInsumo || ''}</td>
            <td><input type="number" class="form-control form-control-sm precio" value="${i.PrecioInsumo}"></td>
        </tr>`;

    document.getElementById('tbody-insumos-exp').innerHTML = dataFull.insumosExp
        .filter(i => i.NombreInsumo.toLowerCase().includes(term))
        .map(i => renderInsumo(i, 'exp')).join('');

    document.getElementById('tbody-insumos-comunes').innerHTML = dataFull.insumos
        .filter(i => i.NombreInsumo.toLowerCase().includes(term))
        .map(i => renderInsumo(i, 'comun')).join('');
}

window.saveAllPrices = async () => {
    const items = [];
    
    // Animales
    document.querySelectorAll('#tbody-precios-animales tr[data-id]').forEach(tr => {
        items.push({
            type: tr.dataset.type,
            id: tr.dataset.id,
            pan: tr.querySelector('.pan')?.value || 0,
            pch: tr.querySelector('.pch')?.value || 0,
            pgr: tr.querySelector('.pgr')?.value || 0
        });
    });

    // Insumos
    document.querySelectorAll('[data-type^="insumo"]').forEach(tr => {
        items.push({
            type: tr.dataset.type,
            id: tr.dataset.id,
            precio: tr.querySelector('.precio').value
        });
    });

    try {
        showLoader();
        await API.request('/precios/update-all', 'POST', {
            instId: localStorage.getItem('instId'),
            jornada: document.getElementById('jornada-precio').value,
            tituloprecios: document.getElementById('titulo-precios').value, // NUEVO CAMPO
            data: items
        });
        
        window.Swal.fire('Guardado', 'Tarifas actualizadas correctamente.', 'success')
            .then(() => { initPreciosPage(); });
            
    } catch (e) { hideLoader(); }
};

window.exportPreciosPDF = () => {
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    const fechaActual = new Date().toLocaleDateString();
    
    // USAMOS EL TÍTULO PERSONALIZADO O EL DEFAULT
    const tituloDoc = dataFull.institucion.tituloprecios || 'TARIFARIO OFICIAL';

    let animalRows = '';
    dataFull.especies.forEach(e => {
        const pAni = parseFloat(e.Panimal) || 0;
        const pChi = parseFloat(e.PalojamientoChica) || 0;
        const pGra = parseFloat(e.PalojamientoGrande) || 0;

        if (pAni > 0 || pChi > 0 || pGra > 0) {
            animalRows += `
                <tr style="background-color: #f2f2f2; font-weight: bold;">
                    <td style="padding: 8px; border: 1px solid #ddd;">${e.EspeNombreA}</td>
                    <td style="text-align: center; border: 1px solid #ddd;">${pAni > 0 ? '$ ' + pAni : '---'}</td>
                    <td style="text-align: center; border: 1px solid #ddd;">${pChi > 0 ? '$ ' + pChi : '---'}</td>
                    <td style="text-align: center; border: 1px solid #ddd;">${pGra > 0 ? '$ ' + pGra : '---'}</td>
                </tr>`;

            const sub = dataFull.subespecies.filter(s => String(s.idespA) === String(e.idespA) && parseFloat(s.Psubanimal) > 0 && String(s.Existe) !== "2");
            sub.forEach(s => {
                animalRows += `
                    <tr>
                        <td style="padding: 6px 6px 6px 30px; border: 1px solid #ddd; font-size: 11px;">└ ${s.SubEspeNombreA}</td>
                        <td style="text-align: center; border: 1px solid #ddd; font-size: 11px;">$ ${s.Psubanimal}</td>
                        <td colspan="2" style="border: 1px solid #ddd; background: #fafafa;"></td>
                    </tr>`;
            });
        }
    });

    const renderInsumoPDF = (lista) => lista.filter(i => parseFloat(i.PrecioInsumo) > 0).map(i => `
        <tr>
            <td style="padding: 6px; border: 1px solid #ddd;">${i.NombreInsumo}</td>
            <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${i.CantidadInsumo || 0} ${i.TipoInsumo || ''}</td>
            <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-weight: bold;">$ ${i.PrecioInsumo}</td>
        </tr>`).join('');

    const template = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <div style="text-align: center; border-bottom: 2px solid #1a5d3b; margin-bottom: 20px;">
                <h2 style="color: #1a5d3b; margin: 0;">GROBO - ${inst}</h2>
                <h4 style="margin: 5px 0; text-transform: uppercase;">${tituloDoc}</h4>
                <p style="font-size: 11px; color: #666;">Fecha: ${fechaActual}</p>
            </div>

            <div style="margin-bottom: 10px; font-weight: bold; color: #1a5d3b;">ALOJAMIENTO: CAJA CHICA Y CAJA GRANDE</div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px;">
                <thead>
                    <tr style="background: #1a5d3b; color: white;">
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">ESPECIE / VARIEDAD</th>
                        <th>PRECIO ANIMAL</th><th>CAJA CHICA</th><th>CAJA GRANDE</th>
                    </tr>
                </thead>
                <tbody>${animalRows}</tbody>
            </table>

            <h4 style="font-size: 14px; color: #0d6efd; border-bottom: 1px solid #eee;">INSUMOS EXPERIMENTALES</h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
                <tr style="background: #f8f9fa;"><th>Nombre</th><th>Cantidad/Tipo</th><th>Precio</th></tr>
                ${renderInsumoPDF(dataFull.insumosExp)}
            </table>

            <h4 style="font-size: 14px; color: #6c757d; border-bottom: 1px solid #eee;">INSUMOS COMUNES</h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
                <tr style="background: #f8f9fa;"><th>Nombre</th><th>Cantidad/Tipo</th><th>Precio</th></tr>
                ${renderInsumoPDF(dataFull.insumos)}
            </table>

            <div style="padding: 10px; background: #fff4f4; border: 1px solid #f5c2c2; font-size: 14px;">
                <strong>JORNAL DE TRABAJO EXPERIMENTAL:</strong> 
                <span style="color: #d9534f; font-weight: bold; float: right;">$ ${dataFull.institucion.PrecioJornadaTrabajoExp || 0}</span>
            </div>
        </div>`;

    html2pdf().set({ margin: 10, filename: `Tarifario_${inst}.pdf`, html2canvas: { scale: 2 } }).from(template).save();
};

window.exportPreciosExcel = () => {
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    const headers = ["Categoría", "Nombre / Variedad", "Precio Animal", "Caja Chica", "Caja Grande", "Medida/Cant"];
    const csvRows = [headers.join(";")];

    dataFull.especies.forEach(e => {
        csvRows.push(["ESPECIE", e.EspeNombreA, e.Panimal, e.PalojamientoChica, e.PalojamientoGrande, "BASE"].join(";"));
        dataFull.subespecies.filter(s => String(s.idespA) === String(e.idespA)).forEach(s => {
            csvRows.push(["SUBESPECIE", s.SubEspeNombreA, s.Psubanimal, "0", "0", "VARIEDAD"].join(";"));
        });
    });

    dataFull.insumosExp.forEach(i => csvRows.push(["INSUMO-EXP", i.NombreInsumo, i.PrecioInsumo, "0", "0", `${i.CantidadInsumo} ${i.TipoInsumo}`].join(";")));
    dataFull.insumos.forEach(i => csvRows.push(["INSUMO-COMUN", i.NombreInsumo, i.PrecioInsumo, "0", "0", `${i.CantidadInsumo} ${i.TipoInsumo}`].join(";")));
    csvRows.push(["JORNADA", "JORNAL DE TRABAJO", dataFull.institucion.PrecioJornadaTrabajoExp, "0", "0", "DIA/TEC"].join(";"));

    const csvContent = "\uFEFF" + csvRows.join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    link.download = `Revision_Tarifario_${inst}.csv`;
    link.click();
};