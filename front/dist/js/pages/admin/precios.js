import { API } from '../../api.js';
import { Auth } from '../../auth.js';
import { hideLoader, showLoader } from '../../components/LoaderComponent.js';
import { getPdfLogoHeaderHtml } from '../../utils/pdfLogoHeader.js';
import { isTrazabilidadAlojamientosInstActiva, refreshInstModulesSnapshot } from '../../modulesAccess.js';
import {
    htmlAlojCobroSwitchRow,
    isTrazabilidadCobroInstActiva,
} from '../../utils/alojamientoCobroModo.js';

let dataFull = { especies: [], subespecies: [], tiposAlojamiento: [], insumos: [], insumosExp: [], servicios: [], institucion: {}, trazabilidad_habilitada: false };

const PRECIOS_TBODY_IDS = ['tbody-precios-animales', 'tbody-insumos-exp', 'tbody-insumos-comunes', 'tbody-servicios'];

function __preciosColspanAnimales() {
    return __preciosCobroSwitchVisible() ? 4 : 3;
}

function __preciosCobroTdEmpty() {
    return __preciosCobroSwitchVisible() ? '<td></td>' : '';
}

window.__preciosSyncCobroLbl = (sw) => {
    const lbl = sw?.closest('.d-flex')?.querySelector('.aloj-cobro-lbl');
    if (!lbl) return;
    const a = lbl.getAttribute('data-lbl-aloj') || '';
    const s = lbl.getAttribute('data-lbl-suj') || '';
    lbl.textContent = sw.checked ? s : a;
};

function __preciosEscapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function __preciosNorm(s) {
    return String(s ?? '').toLowerCase().trim();
}

function __preciosParseInstId(raw) {
    const n = parseInt(String(raw ?? '').trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
}

function __preciosInstIdFromJwt() {
    try {
        const token = typeof Auth?.getVal === 'function' ? Auth.getVal('token') : null;
        if (!token || !String(token).includes('.')) return null;
        const b64 = String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(b64));
        return __preciosParseInstId(payload?.instId);
    } catch (_) {
        return null;
    }
}

/** Primera sede válida (>0); ignora target_inst_secreto=0 que tapaba localStorage. */
function __preciosResolveInstId() {
    if (typeof Auth?.hydrateSession === 'function') Auth.hydrateSession();

    const candidates = [
        sessionStorage.getItem('target_inst_secreto'),
        sessionStorage.getItem('instId'),
        localStorage.getItem('instId'),
        typeof Auth?.getVal === 'function' ? Auth.getVal('instId') : null,
    ];

    for (const raw of candidates) {
        const id = __preciosParseInstId(raw);
        if (id) return id;
    }

    return __preciosInstIdFromJwt();
}

function __preciosAllDataEndpoint(instId) {
    return instId ? `/precios/all-data?inst=${instId}` : '/precios/all-data';
}

/** Switch visible: API, snapshot módulo 6 o sondeo alojamiento/list. */
function __preciosCobroSwitchVisible() {
    return (
        isTrazabilidadCobroInstActiva(dataFull.trazabilidad_habilitada)
        || isTrazabilidadAlojamientosInstActiva()
    );
}

async function __preciosProbeCobroDesdeAlojamiento(instId) {
    if (dataFull.trazabilidad_habilitada) return;
    const id = parseInt(String(instId ?? '').trim(), 10);
    if (!Number.isFinite(id) || id <= 0) return;
    try {
        const r = await API.request(`/alojamiento/list?inst=${id}`);
        if (r?.cobro?.trazabilidad_habilitada) {
            dataFull.trazabilidad_habilitada = true;
        }
    } catch (_) {
        /* ignore */
    }
}

function __preciosApplyDataPayload(payload) {
    dataFull = {
        especies: Array.isArray(payload?.especies) ? payload.especies : [],
        subespecies: Array.isArray(payload?.subespecies) ? payload.subespecies : [],
        tiposAlojamiento: Array.isArray(payload?.tiposAlojamiento) ? payload.tiposAlojamiento : [],
        insumos: Array.isArray(payload?.insumos) ? payload.insumos : [],
        insumosExp: Array.isArray(payload?.insumosExp) ? payload.insumosExp : [],
        servicios: Array.isArray(payload?.servicios) ? payload.servicios : [],
        institucion: payload?.institucion && typeof payload.institucion === 'object' ? payload.institucion : {},
        trazabilidad_habilitada: !!payload?.trazabilidad_habilitada,
    };
}

/** Spinner solo en las tablas (evita loader de página completa en recargas). */
function setPreciosTbodiesLoading(active) {
    const msg = __preciosEscapeHtml(window.txt?.generales?.msg_cargando || '…');
    const colAn = __preciosColspanAnimales();
    const rowAn = `<tr><td colspan="${colAn}" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success mb-2" role="status"></div><div class="small">${msg}</div></td></tr>`;
    const row = `<tr><td colspan="3" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success mb-2" role="status"></div><div class="small">${msg}</div></td></tr>`;
    PRECIOS_TBODY_IDS.forEach((id) => {
        const el = document.getElementById(id);
        if (el && active) el.innerHTML = id === 'tbody-precios-animales' ? rowAn : row;
    });
}

function setPreciosTbodiesError() {
    const err = __preciosEscapeHtml(window.txt?.generales?.error_carga || 'Error');
    const colAn = __preciosColspanAnimales();
    PRECIOS_TBODY_IDS.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const col = id === 'tbody-precios-animales' ? colAn : 3;
        el.innerHTML = `<tr><td colspan="${col}" class="text-center py-4 text-danger">${err}</td></tr>`;
    });
}

/**
 * @param {{ inline?: boolean }} [opts] — `inline: true`: sin overlay global; feedback en `<tbody>` (p. ej. tras guardar).
 */
export async function initPreciosPage(opts = {}) {
    const inlineReload = opts.inline === true;
    const instId = __preciosResolveInstId();
    try {
        await refreshInstModulesSnapshot(API.request);
        if (inlineReload) {
            setPreciosTbodiesLoading(true);
        } else {
            showLoader();
        }

        const res = await API.request(__preciosAllDataEndpoint(instId));
        if (res && res.status === 'success' && res.data) {
            __preciosApplyDataPayload(res.data);
            await __preciosProbeCobroDesdeAlojamiento(instId);
            const inputTitulo = document.getElementById('titulo-precios');
            if (inputTitulo) inputTitulo.value = dataFull.institucion.tituloprecios || '';
            __preciosSyncAnimalesTableHeader();
            window.renderAllPriceTables();
        } else {
            console.error('Error cargando precios:', res?.message || res);
            setPreciosTbodiesError();
        }
    } catch (e) {
        console.error('Error cargando precios:', e);
        setPreciosTbodiesError();
    } finally {
        if (!inlineReload) hideLoader();
    }
}

function __preciosSyncAnimalesTableHeader() {
    const headRow = document.getElementById('thead-precios-animales-row');
    if (!headRow) return;
    const txtP = window.txt?.precios || {};
    const cobroTh = __preciosCobroSwitchVisible()
        ? `<th style="min-width: 115px; width: 115px;" class="text-center small" data-i18n="precios.table.th_cobro">${__preciosEscapeHtml(txtP.table?.th_cobro || '')}</th>`
        : '';
    headRow.innerHTML = `
        <th data-i18n="precios.table.desc_animal">${__preciosEscapeHtml(txtP.table?.desc_animal || '')}</th>
        <th style="width: 200px;" class="text-center" data-i18n="precios.table.clasificacion">${__preciosEscapeHtml(txtP.table?.clasificacion || '')}</th>
        <th style="width: 150px;" data-i18n="precios.table.precio_unidad">${__preciosEscapeHtml(txtP.table?.precio_unidad || '')}</th>${cobroTh}`;
}

window.renderAllPriceTables = () => {
    try {
    const searchEl = document.getElementById('search-input-precios');
    const term = __preciosNorm(searchEl?.value);
    const txtP = window.txt?.precios || {};
    const colAn = __preciosColspanAnimales();
    
    // 1. RENDER ANIMALES Y ALOJAMIENTO
    const tbodyAn = document.getElementById('tbody-precios-animales');
    let htmlAn = '';

    dataFull.especies.forEach(e => {
        const subs = dataFull.subespecies.filter(s => String(s.idespA) === String(e.idespA) && String(s.Existe) !== "2");
        const alojamientos = dataFull.tiposAlojamiento.filter(a => String(a.idespA) === String(e.idespA));

        const cumpleBusqueda = __preciosNorm(e.EspeNombreA).includes(term);
        const tieneHijos = subs.length > 0 || alojamientos.length > 0;

        if (cumpleBusqueda || tieneHijos) {
            htmlAn += `
                <tr class="table-light fw-bold" data-id="${e.idespA}" data-type="especie" style="border-left: 5px solid #1a5d3b;">
                    <td class="bg-light">
                        <i class="bi bi-tag-fill text-success me-2"></i><span class="text-uppercase">${e.EspeNombreA}</span>
                    </td>
                    <td class="text-center text-muted small">${txtP.badge_base || 'ESPECIE (BASE)'}</td>
                    <td><input type="number" class="form-control form-control-sm precio-input" value="${e.Panimal}"></td>
                    ${__preciosCobroTdEmpty()}
                </tr>`;

            subs.forEach(s => {
                htmlAn += `
                    <tr data-id="${s.idsubespA}" data-type="subespecie">
                        <td class="ps-5 small"><i class="bi bi-arrow-return-right me-2 text-secondary"></i>${s.SubEspeNombreA}</td>
                        <td class="text-center text-primary small">${txtP.badge_var || 'VAR. / SUBESPECIE'}</td>
                        <td><input type="number" class="form-control form-control-sm precio-input" value="${s.Psubanimal}"></td>
                        ${__preciosCobroTdEmpty()}
                    </tr>`;
            });

            alojamientos.forEach(a => {
                const modo = a.alojamiento_cobro_modo === 'SUJETO' ? 'SUJETO' : 'CONTENIDO';
                const cobroTd = __preciosCobroSwitchVisible()
                    ? `<td class="text-center align-middle">${htmlAlojCobroSwitchRow(a.IdTipoAlojamiento, modo)}</td>`
                    : '';
                htmlAn += `
                    <tr data-id="${a.IdTipoAlojamiento}" data-type="alojamiento">
                        <td class="ps-5 small"><i class="bi bi-house-door me-2 text-warning"></i>${a.NombreTipoAlojamiento} <span class="text-muted ms-2" style="font-size:10px;">${a.DetalleTipoAlojamiento || ''}</span></td>
                        <td class="text-center text-warning small fw-bold">${txtP.badge_aloj || 'ALOJAMIENTO'}</td>
                        <td><input type="number" class="form-control form-control-sm precio-input" value="${a.PrecioXunidad}"></td>
                        ${cobroTd}
                    </tr>`;
            });
        }
    });
    if (tbodyAn) {
        tbodyAn.innerHTML = htmlAn || `<tr><td colspan="${colAn}" class="text-center p-3 text-muted">${txtP.no_data || 'No se encontraron registros.'}</td></tr>`;
    }
    
    // 2. RENDER INSUMOS
    const renderInsumo = (i, type, idField) => `
        <tr data-id="${i[idField]}" data-type="${type}">
            <td class="small">${i.NombreInsumo}</td>
            <td class="small text-center fw-bold">${i.CantidadInsumo || 0} ${i.TipoInsumo || ''}</td>
            <td><input type="number" class="form-control form-control-sm precio-input" value="${i.PrecioInsumo}"></td>
        </tr>`;

    const tbodyExp = document.getElementById('tbody-insumos-exp');
    const tbodyCom = document.getElementById('tbody-insumos-comunes');
    if (tbodyExp) {
        tbodyExp.innerHTML = dataFull.insumosExp.filter(i => __preciosNorm(i.NombreInsumo).includes(term)).map(i => renderInsumo(i, 'insumo-exp', 'IdInsumoexp')).join('');
    }
    if (tbodyCom) {
        tbodyCom.innerHTML = dataFull.insumos.filter(i => __preciosNorm(i.NombreInsumo).includes(term)).map(i => renderInsumo(i, 'insumo', 'idInsumo')).join('');
    }

    // 3. RENDER SERVICIOS
    const tbodyServ = document.getElementById('tbody-servicios');
    let htmlServ = '';
    (dataFull.servicios || []).filter(s => __preciosNorm(s?.NombreServicioInst).includes(term)).forEach(s => {
        htmlServ += `
            <tr data-id="${s.IdServicioInst}" data-type="servicio">
                <td class="fw-bold text-dark">${s.NombreServicioInst}</td>
                <td class="text-center small text-muted">${s.CantidadPorMedidaInst || 1} ${s.MedidaServicioInst || 'Unidad'}</td>
                <td><input type="number" class="form-control form-control-sm precio-input fw-bold text-dark" value="${s.Precio}"></td>
            </tr>`;
    });
    if (tbodyServ) {
        tbodyServ.innerHTML = htmlServ || `<tr><td colspan="3" class="text-center p-3 text-muted">${txtP.no_services || 'Sin servicios configurados.'}</td></tr>`;
    }
    } catch (e) {
        console.error('Error renderizando tarifario:', e);
        setPreciosTbodiesError();
    }
};

window.saveAllPrices = async () => {
    const items = [];
    document.querySelectorAll('tr[data-id]').forEach(tr => {
        const input = tr.querySelector('.precio-input');
        if (!input) return;
        const item = { type: tr.dataset.type, id: tr.dataset.id, precio: input.value || 0 };
        if (tr.dataset.type === 'alojamiento' && __preciosCobroSwitchVisible()) {
            const sw = tr.querySelector('.aloj-cobro-switch');
            if (sw) item.cobro_modo = sw.checked ? 'SUJETO' : 'CONTENIDO';
        }
        items.push(item);
    });

    const payload = {
        instId: __preciosResolveInstId() || localStorage.getItem('instId'),
        tituloprecios: document.getElementById('titulo-precios').value,
        data: items
    };

    try {
        showLoader();
        await API.request('/precios/update-all', 'POST', payload);
        hideLoader();
        window.Swal.fire(
            window.txt?.precios?.alert_saved || 'Guardado',
            window.txt?.precios?.alert_success || 'Tarifas actualizadas correctamente.',
            'success'
        ).then(() => {
            initPreciosPage({ inline: true });
        });
    } catch (e) {
        hideLoader();
    }
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
                <tr style="background-color: #1a5d3b; color: #fff; font-weight: bold;">
                    <td style="padding: 6px; border: 1px solid #ddd; color: #fff;" colspan="2">${e.EspeNombreA} (BASE)</td>
                    <td style="text-align: center; border: 1px solid #ddd; color: #fff;">${parseFloat(e.Panimal) > 0 ? '$ ' + e.Panimal : '---'}</td>
                </tr>`;

            subs.filter(s => parseFloat(s.Psubanimal) > 0).forEach(s => {
                animalRows += `
                    <tr style="background-color: #fcfcfc;">
                        <td style="padding: 4px 4px 4px 20px; border: 1px solid #ddd; font-size: 11px; color: #000;">└ VARIEDAD: ${s.SubEspeNombreA}</td>
                        <td style="border: 1px solid #ddd; font-size: 10px; text-align:center; color: #000;">Animal</td>
                        <td style="text-align: center; border: 1px solid #ddd; font-size: 11px; color: #000;">$ ${s.Psubanimal}</td>
                    </tr>`;
            });

            aloj.filter(a => parseFloat(a.PrecioXunidad) > 0).forEach(a => {
                animalRows += `
                    <tr>
                        <td style="padding: 4px 4px 4px 20px; border: 1px solid #ddd; font-size: 11px; color: #000;">└ ALOJ: ${a.NombreTipoAlojamiento} ${a.DetalleTipoAlojamiento ? `(${a.DetalleTipoAlojamiento})` : ''}</td>
                        <td style="border: 1px solid #ddd; font-size: 10px; text-align:center; color: #000;">Alojamiento</td>
                        <td style="text-align: center; border: 1px solid #ddd; font-size: 11px; font-weight:bold; color: #000;">$ ${a.PrecioXunidad}</td>
                    </tr>`;
            });
        }
    });

    const renderInsumoPDF = (lista) => lista.filter(i => parseFloat(i.PrecioInsumo) > 0).map(i => `
        <tr>
            <td style="padding: 4px; border: 1px solid #ddd; color: #000;">${i.NombreInsumo}</td>
            <td style="padding: 4px; border: 1px solid #ddd; text-align: center; color: #000;">${i.CantidadInsumo || 0} ${i.TipoInsumo || ''}</td>
            <td style="padding: 4px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #000;">$ ${i.PrecioInsumo}</td>
        </tr>`).join('');

    const renderServiciosPDF = () => (dataFull.servicios || []).map(s => `
        <tr>
            <td style="padding: 4px; border: 1px solid #ddd; color: #000; font-weight: bold;">${s.NombreServicioInst}</td>
            <td style="padding: 4px; border: 1px solid #ddd; text-align: center; color: #000;">${s.CantidadPorMedidaInst || 1} ${s.MedidaServicioInst || 'U'}</td>
            <td style="padding: 4px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #000;">$ ${s.Precio}</td>
        </tr>`).join('');

    const logoHeader = getPdfLogoHeaderHtml(dataFull.institucion?.LogoEnPdf, dataFull.institucion?.Logo || '');

    const template = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #fff; color: #000;">
            ${logoHeader}
            <div style="text-align: center; border-bottom: 2px solid #1a5d3b; margin-bottom: 20px;">
                <h2 style="color: #1a5d3b; margin: 0;">GROBO - ${inst}</h2>
                <h4 style="margin: 5px 0; text-transform: uppercase; color: #000;">${tituloDoc}</h4>
                <p style="font-size: 11px; color: #000;">Fecha: ${fechaActual}</p>
            </div>

            <h4 style="font-size: 13px; color: #1a5d3b; margin-bottom:5px;">1. ANIMALES Y ALOJAMIENTO</h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px;">
                <thead>
                    <tr style="background: #e9ecef;">
                        <th style="padding: 6px; border: 1px solid #ddd; text-align: left; color: #000;">Descripción</th>
                        <th style="padding: 6px; border: 1px solid #ddd; width: 100px; color: #000;">Tipo</th>
                        <th style="padding: 6px; border: 1px solid #ddd; width: 100px; color: #000;">Precio</th>
                    </tr>
                </thead>
                <tbody>${animalRows || '<tr><td colspan="3" style="text-align:center; color: #000;">Sin datos</td></tr>'}</tbody>
            </table>

            <h4 style="font-size: 13px; color: #000; margin-bottom:5px; border-bottom: 1px solid #eee;">2. INSUMOS EXPERIMENTALES</h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px;">
                <tr style="background: #f8f9fa;"><th style="color: #000;">Nombre</th><th style="color: #000;">Cantidad/Tipo</th><th style="color: #000;">Precio</th></tr>
                ${renderInsumoPDF(dataFull.insumosExp)}
            </table>

            <h4 style="font-size: 13px; color: #000; margin-bottom:5px; border-bottom: 1px solid #eee;">3. INSUMOS COMUNES</h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px;">
                <tr style="background: #f8f9fa;"><th style="color: #000;">Nombre</th><th style="color: #000;">Cantidad/Tipo</th><th style="color: #000;">Precio</th></tr>
                ${renderInsumoPDF(dataFull.insumos)}
            </table>

            <h4 style="font-size: 13px; color: #000; margin-bottom:5px; border-bottom: 1px solid #eee;">4. SERVICIOS INSTITUCIONALES</h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
                <tr style="background: #f0f2f5;"><th style="color: #000;">Servicio</th><th style="color: #000;">Medida</th><th style="color: #000;">Precio</th></tr>
                ${renderServiciosPDF()}
            </table>
        </div>`;

    html2pdf().set({
        margin: [18, 18, 18, 18],
        filename: `Tarifario_${inst}_${Date.now()}.pdf`,
        html2canvas: {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: false
        }
    }).from(template).save();
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
