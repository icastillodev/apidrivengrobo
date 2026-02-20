import { API } from '../../api.js';
import { hideLoader, showLoader } from '../../components/LoaderComponent.js';

let dataFull = { especies: [], subespecies: [], tiposAlojamiento: [], insumos: [], insumosExp: [], servicios: [], institucion: {} };

export async function initPreciosPage() {
    const instId = localStorage.getItem('instId');
    try {
        showLoader();
        
        // Carga de traducciones en el DOM si no usan data-i18n directo
        if(window.txt && window.txt.precios) {
            document.getElementById('lbl-bread-precio').innerText = window.txt.bread.prices;
            document.getElementById('lbl-titulo-pag').innerText = window.txt.precios.title;
            document.getElementById('lbl-titulo-pdf').innerText = window.txt.precios.pdf_title;
            document.getElementById('lbl-buscador').innerText = window.txt.precios.search;
            document.getElementById('search-input-precios').placeholder = window.txt.precios.search_placeholder;
            document.getElementById('lbl-sec-ani').innerText = window.txt.precios.sec_animals;
            document.getElementById('lbl-sec-insexp').innerText = window.txt.precios.sec_ins_exp;
            document.getElementById('lbl-sec-inscom').innerText = window.txt.precios.sec_ins_com;
            document.getElementById('lbl-sec-serv').innerText = window.txt.precios.sec_services;
            document.getElementById('lbl-btn-guardar').innerText = window.txt.precios.btn_save;
        }

        const res = await API.request(`/precios/all-data?inst=${instId}`);
        if (res && res.status === 'success') {
            dataFull = res.data;
            const inputTitulo = document.getElementById('titulo-precios');
            if (inputTitulo) inputTitulo.value = dataFull.institucion.tituloprecios || '';
            window.renderAllPriceTables();
        }
    } catch (e) { 
        console.error("Error cargando precios:", e); 
    } finally {
        hideLoader();
    }
}

window.renderAllPriceTables = () => {
    const term = document.getElementById('search-input-precios').value.toLowerCase().trim();
    const txtP = window.txt?.precios || {};
    
    // 1. RENDER ANIMALES Y ALOJAMIENTO
    const tbodyAn = document.getElementById('tbody-precios-animales');
    let htmlAn = '';

    dataFull.especies.forEach(e => {
        const subs = dataFull.subespecies.filter(s => String(s.idespA) === String(e.idespA) && String(s.Existe) !== "2");
        const alojamientos = dataFull.tiposAlojamiento.filter(a => String(a.idespA) === String(e.idespA));

        const cumpleBusqueda = e.EspeNombreA.toLowerCase().includes(term);
        const tieneHijos = subs.length > 0 || alojamientos.length > 0;

        if (cumpleBusqueda || tieneHijos) {
            htmlAn += `
                <tr class="table-light fw-bold" data-id="${e.idespA}" data-type="especie" style="border-left: 5px solid #1a5d3b;">
                    <td class="bg-light">
                        <i class="bi bi-tag-fill text-success me-2"></i><span class="text-uppercase">${e.EspeNombreA}</span>
                    </td>
                    <td class="text-center text-muted small">${txtP.badge_base || 'ESPECIE (BASE)'}</td>
                    <td><input type="number" class="form-control form-control-sm precio-input" value="${e.Panimal}"></td>
                </tr>`;

            subs.forEach(s => {
                htmlAn += `
                    <tr data-id="${s.idsubespA}" data-type="subespecie">
                        <td class="ps-5 small"><i class="bi bi-arrow-return-right me-2 text-secondary"></i>${s.SubEspeNombreA}</td>
                        <td class="text-center text-primary small">${txtP.badge_var || 'VAR. / SUBESPECIE'}</td>
                        <td><input type="number" class="form-control form-control-sm precio-input" value="${s.Psubanimal}"></td>
                    </tr>`;
            });

            alojamientos.forEach(a => {
                htmlAn += `
                    <tr data-id="${a.IdTipoAlojamiento}" data-type="alojamiento">
                        <td class="ps-5 small"><i class="bi bi-house-door me-2 text-warning"></i>${a.NombreTipoAlojamiento} <span class="text-muted ms-2" style="font-size:10px;">${a.DetalleTipoAlojamiento || ''}</span></td>
                        <td class="text-center text-warning small fw-bold">${txtP.badge_aloj || 'ALOJAMIENTO'}</td>
                        <td><input type="number" class="form-control form-control-sm precio-input" value="${a.PrecioXunidad}"></td>
                    </tr>`;
            });
        }
    });
    tbodyAn.innerHTML = htmlAn || `<tr><td colspan="3" class="text-center p-3 text-muted">${txtP.no_data || 'No se encontraron registros.'}</td></tr>`;
    
    // 2. RENDER INSUMOS
    const renderInsumo = (i, type, idField) => `
        <tr data-id="${i[idField]}" data-type="${type}">
            <td class="small">${i.NombreInsumo}</td>
            <td class="small text-center fw-bold">${i.CantidadInsumo || 0} ${i.TipoInsumo || ''}</td>
            <td><input type="number" class="form-control form-control-sm precio-input" value="${i.PrecioInsumo}"></td>
        </tr>`;

    document.getElementById('tbody-insumos-exp').innerHTML = dataFull.insumosExp.filter(i => i.NombreInsumo.toLowerCase().includes(term)).map(i => renderInsumo(i, 'insumo-exp', 'IdInsumoexp')).join('');
    document.getElementById('tbody-insumos-comunes').innerHTML = dataFull.insumos.filter(i => i.NombreInsumo.toLowerCase().includes(term)).map(i => renderInsumo(i, 'insumo', 'idInsumo')).join('');

    // 3. RENDER SERVICIOS
    const tbodyServ = document.getElementById('tbody-servicios');
    let htmlServ = '';
    dataFull.servicios.filter(s => s.NombreServicioInst.toLowerCase().includes(term)).forEach(s => {
        htmlServ += `
            <tr data-id="${s.IdServicioInst}" data-type="servicio">
                <td class="fw-bold text-danger">${s.NombreServicioInst}</td>
                <td class="text-center small text-muted">${s.CantidadPorMedidaInst || 1} ${s.MedidaServicioInst || 'Unidad'}</td>
                <td><input type="number" class="form-control form-control-sm precio-input fw-bold text-danger" value="${s.Precio}"></td>
            </tr>`;
    });
    tbodyServ.innerHTML = htmlServ || `<tr><td colspan="3" class="text-center p-3 text-muted">${txtP.no_services || 'Sin servicios configurados.'}</td></tr>`;
};

window.saveAllPrices = async () => {
    const items = [];
    document.querySelectorAll('tr[data-id]').forEach(tr => {
        const input = tr.querySelector('.precio-input');
        if(input) {
            items.push({ type: tr.dataset.type, id: tr.dataset.id, precio: input.value || 0 });
        }
    });

    try {
        showLoader();
        await API.request('/precios/update-all', 'POST', {
            instId: localStorage.getItem('instId'),
            tituloprecios: document.getElementById('titulo-precios').value,
            data: items
        });
        
        window.Swal.fire(
            window.txt?.precios?.alert_saved || 'Guardado', 
            window.txt?.precios?.alert_success || 'Tarifas actualizadas correctamente.', 
            'success'
        ).then(() => { initPreciosPage(); });
            
    } catch (e) { hideLoader(); }
};

window.exportPreciosPDF = () => {
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    const fechaActual = new Date().toLocaleDateString();
    const tituloDoc = document.getElementById('titulo-precios').value || dataFull.institucion.tituloprecios || 'TARIFARIO OFICIAL';

    let animalRows = '';
    dataFull.especies.forEach(e => {
        const subs = dataFull.subespecies.filter(s => String(s.idespA) === String(e.idespA) && String(s.Existe) !== "2");
        const aloj = dataFull.tiposAlojamiento.filter(a => String(a.idespA) === String(e.idespA));
        
        const hasContent = parseFloat(e.Panimal) > 0 || subs.some(s => parseFloat(s.Psubanimal) > 0) || aloj.some(a => parseFloat(a.PrecioXunidad) > 0);

        if (hasContent) {
            animalRows += `
                <tr style="background-color: #1a5d3b; color: white; font-weight: bold;">
                    <td style="padding: 6px; border: 1px solid #ddd;" colspan="2">${e.EspeNombreA} (BASE)</td>
                    <td style="text-align: center; border: 1px solid #ddd;">${parseFloat(e.Panimal) > 0 ? '$ ' + e.Panimal : '---'}</td>
                </tr>`;

            subs.filter(s => parseFloat(s.Psubanimal) > 0).forEach(s => {
                animalRows += `
                    <tr style="background-color: #fcfcfc;">
                        <td style="padding: 4px 4px 4px 20px; border: 1px solid #ddd; font-size: 11px;">└ VARIEDAD: ${s.SubEspeNombreA}</td>
                        <td style="border: 1px solid #ddd; font-size: 10px; text-align:center;">Animal</td>
                        <td style="text-align: center; border: 1px solid #ddd; font-size: 11px;">$ ${s.Psubanimal}</td>
                    </tr>`;
            });

            aloj.filter(a => parseFloat(a.PrecioXunidad) > 0).forEach(a => {
                animalRows += `
                    <tr>
                        <td style="padding: 4px 4px 4px 20px; border: 1px solid #ddd; font-size: 11px; color:#b8860b;">└ ALOJ: ${a.NombreTipoAlojamiento} ${a.DetalleTipoAlojamiento ? `(${a.DetalleTipoAlojamiento})` : ''}</td>
                        <td style="border: 1px solid #ddd; font-size: 10px; text-align:center; color:#b8860b;">Alojamiento</td>
                        <td style="text-align: center; border: 1px solid #ddd; font-size: 11px; font-weight:bold;">$ ${a.PrecioXunidad}</td>
                    </tr>`;
            });
        }
    });

    const renderInsumoPDF = (lista) => lista.filter(i => parseFloat(i.PrecioInsumo) > 0).map(i => `
        <tr>
            <td style="padding: 4px; border: 1px solid #ddd;">${i.NombreInsumo}</td>
            <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${i.CantidadInsumo || 0} ${i.TipoInsumo || ''}</td>
            <td style="padding: 4px; border: 1px solid #ddd; text-align: center; font-weight: bold;">$ ${i.PrecioInsumo}</td>
        </tr>`).join('');

    const renderServiciosPDF = () => dataFull.servicios.filter(s => parseFloat(s.Precio) > 0).map(s => `
        <tr>
            <td style="padding: 4px; border: 1px solid #ddd; color: #d9534f; font-weight: bold;">${s.NombreServicioInst}</td>
            <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${s.CantidadPorMedidaInst || 1} ${s.MedidaServicioInst || 'U'}</td>
            <td style="padding: 4px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #d9534f;">$ ${s.Precio}</td>
        </tr>`).join('');

    const template = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <div style="text-align: center; border-bottom: 2px solid #1a5d3b; margin-bottom: 20px;">
                <h2 style="color: #1a5d3b; margin: 0;">GROBO - ${inst}</h2>
                <h4 style="margin: 5px 0; text-transform: uppercase;">${tituloDoc}</h4>
                <p style="font-size: 11px; color: #666;">Fecha: ${fechaActual}</p>
            </div>

            <h4 style="font-size: 13px; color: #1a5d3b; margin-bottom:5px;">1. ANIMALES Y ALOJAMIENTO</h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px;">
                <thead>
                    <tr style="background: #e9ecef;">
                        <th style="padding: 6px; border: 1px solid #ddd; text-align: left;">Descripción</th>
                        <th style="padding: 6px; border: 1px solid #ddd; width: 100px;">Tipo</th>
                        <th style="padding: 6px; border: 1px solid #ddd; width: 100px;">Precio</th>
                    </tr>
                </thead>
                <tbody>${animalRows || '<tr><td colspan="3" style="text-align:center;">Sin datos</td></tr>'}</tbody>
            </table>

            <h4 style="font-size: 13px; color: #0d6efd; margin-bottom:5px; border-bottom: 1px solid #eee;">2. INSUMOS EXPERIMENTALES</h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px;">
                <tr style="background: #f8f9fa;"><th>Nombre</th><th>Cantidad/Tipo</th><th>Precio</th></tr>
                ${renderInsumoPDF(dataFull.insumosExp)}
            </table>

            <h4 style="font-size: 13px; color: #6c757d; margin-bottom:5px; border-bottom: 1px solid #eee;">3. INSUMOS COMUNES</h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px;">
                <tr style="background: #f8f9fa;"><th>Nombre</th><th>Cantidad/Tipo</th><th>Precio</th></tr>
                ${renderInsumoPDF(dataFull.insumos)}
            </table>

            <h4 style="font-size: 13px; color: #d9534f; margin-bottom:5px; border-bottom: 1px solid #eee;">4. SERVICIOS INSTITUCIONALES</h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
                <tr style="background: #fff4f4; color: #d9534f;"><th>Servicio</th><th>Medida</th><th>Precio</th></tr>
                ${renderServiciosPDF()}
            </table>
        </div>`;

    html2pdf().set({ margin: 10, filename: `Tarifario_${inst}.pdf`, html2canvas: { scale: 2 } }).from(template).save();
};

window.exportPreciosExcel = () => {
    const inst = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
    const headers = ["Categoría", "Nombre / Detalle", "Tipo", "Medida/Cant", "Precio"];
    const csvRows = [headers.join(";")];

    dataFull.especies.forEach(e => {
        csvRows.push(["ANIMALES", e.EspeNombreA, "ESPECIE BASE", "1 U", e.Panimal].join(";"));
        
        dataFull.subespecies.filter(s => String(s.idespA) === String(e.idespA)).forEach(s => {
            csvRows.push(["ANIMALES", `└ ${s.SubEspeNombreA}`, "VARIEDAD", "1 U", s.Psubanimal].join(";"));
        });
        
        dataFull.tiposAlojamiento.filter(a => String(a.idespA) === String(e.idespA)).forEach(a => {
            csvRows.push(["ALOJAMIENTO", `└ ${a.NombreTipoAlojamiento} ${a.DetalleTipoAlojamiento || ''}`, "TIPO ALOJ.", "1 U", a.PrecioXunidad].join(";"));
        });
    });

    dataFull.insumosExp.forEach(i => csvRows.push(["INSUMO-EXP", i.NombreInsumo, "EXPERIMENTAL", `${i.CantidadInsumo} ${i.TipoInsumo}`, i.PrecioInsumo].join(";")));
    dataFull.insumos.forEach(i => csvRows.push(["INSUMO-COMUN", i.NombreInsumo, "COMUN", `${i.CantidadInsumo} ${i.TipoInsumo}`, i.PrecioInsumo].join(";")));
    dataFull.servicios.forEach(s => csvRows.push(["SERVICIOS", s.NombreServicioInst, "SERVICIO", `${s.CantidadPorMedidaInst} ${s.MedidaServicioInst}`, s.Precio].join(";")));

    const csvContent = "\uFEFF" + csvRows.join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    link.download = `Tarifario_${inst}.csv`;
    link.click();
};