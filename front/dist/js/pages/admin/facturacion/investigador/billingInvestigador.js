/**
 * GESTIÓN DE FACTURACIÓN POR INVESTIGADOR - GECKO DEVS
 */
import { API } from '../../../../api.js';
import { hideLoader, showLoader } from '../../../../components/LoaderComponent.js';
import { refreshMenuNotifications } from '../../../../components/MenuComponent.js';
import { setBillingResultsLoadingInline } from '../billingResultsLoading.js';
import { renderDashboard } from '../billingDashboard.js';
import { formatBillingMoney, pdfColsPrecioDebePagoTotal, billingTipoExento, billingTdTotalPagadoDebe, billingSumFormulariosCobrable, billingSumInsumosCobrable, billingInsumoMontoTotalCobrable, billingSumAlojamientos, getBillingNombreInstitucion, billingDerivacionPlainText, billingDerivadaLiquidacionBadge, billingPdfFormularioIdDisplay, billingPdfMarcaExentoLarga, billingAlojPeriodoParaInforme, billingPedidoSinMontoNoExento, billingHtmlRowInsumoPedidoFacturacion, billingHtmlInsumoProtSectionHeader, billingPartitionInsumosPedidoReactivoOtros, billingFormatPedidoFechasPlain } from '../billingLocale.js';
import '../billingPayments.js'; 
import '../modals/manager.js';
import {
    fetchFiltrosAlcanceDerivacion,
    aplicarVisibilidadColumnaFacturacionDerivacion,
    getFacturacionDerivacionSeleccionFromDom as getFacturacionDerivacionSeleccionInv,
    getAmbitoInternoExternoFromDom,
    getFiltrosAlcanceDerivacionCached,
} from '../billingDerivacionFiltros.js';

/** Textos facturación (incl. `billing_depto`, `billing_investigador`) */
function txF() {
    return window.txt?.facturacion || {};
}
function txBD() {
    return txF().billing_depto || {};
}
function txBI() {
    return txF().billing_investigador || {};
}
function txBP() {
    return txF().billing_protocolo || {};
}

window.currentReportData = null;
window.investigadoresCache = [];
window.investigadoresCacheFull = [];

function escapeHtmlInv(s) {
    if (s == null || s === '') return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function listaInvestigadoresBaseFiltrada() {
    const full = Array.isArray(window.investigadoresCacheFull) ? window.investigadoresCacheFull : [];
    const fa = getFiltrosAlcanceDerivacionCached();
    const scope = getFacturacionDerivacionSeleccionInv();
    const ambOrg = getAmbitoInternoExternoFromDom('filter-ambito-investigador');

    let list = full;
    if (ambOrg === 'interno') {
        list = list.filter((u) => Number(u.ambitoProtExterno) !== 1);
    } else if (ambOrg === 'externo') {
        list = list.filter((u) => Number(u.ambitoProtExterno) === 1);
    }

    if (fa?.idUsrFormularios?.size) {
        list = list.filter((u) => fa.idUsrFormularios.has(Number(u.IdUsrA)));
    } else {
        list = [];
    }

    if (scope === 'derivados') {
        if (fa?.idUsrDerivados?.size) {
            list = list.filter((u) => fa.idUsrDerivados.has(Number(u.IdUsrA)));
        } else {
            list = [];
        }
    } else if (scope === 'institucionales') {
        if (fa?.idUsrLocal?.size) {
            list = list.filter((u) => fa.idUsrLocal.has(Number(u.IdUsrA)));
        } else {
            list = [];
        }
    }
    return list;
}

/** Informe principal ya cargado al menos una vez con éxito (recargas = spinner inline). */
let invBillingReportLoadedOk = false;
let filtroInvestigadorVinculado = false;

export async function initBillingInvestigador() {
    try {
        aplicarEstilosTablas();
        showLoader();
        await refreshMenuNotifications();
        
        const hoy = new Date();
        const fDesde = document.getElementById('f-desde');
        const fHasta = document.getElementById('f-hasta');
        if (fDesde && fHasta) {
            fDesde.value = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
            fHasta.value = hoy.toISOString().split('T')[0];
        }

        await fetchFiltrosAlcanceDerivacion();
        aplicarVisibilidadColumnaFacturacionDerivacion(getFiltrosAlcanceDerivacionCached());

        await cargarListaInvestigadores();
        const filterAmbInv = document.getElementById('filter-ambito-investigador');
        if (filterAmbInv) {
            filterAmbInv.addEventListener('change', () => {
                const inputBusqueda = document.getElementById('busqueda-investigador');
                if (inputBusqueda) inputBusqueda.value = '';
                renderizarOpcionesInvestigador(listaInvestigadoresBaseFiltrada());
            });
        }
        const selDer = document.getElementById('sel-facturacion-derivacion');
        if (selDer) {
            selDer.addEventListener('change', () => {
                const inputBusqueda = document.getElementById('busqueda-investigador');
                if (inputBusqueda) {
                    inputBusqueda.value = '';
                }
                renderizarOpcionesInvestigador(listaInvestigadoresBaseFiltrada());
            });
        }
        autoLoadFromUrlParams();
    } catch (error) { 
        console.error("Error en init:", error); 
    } finally { hideLoader(); }
}

function autoLoadFromUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const idUsr = params.get('idUsr');
    const all = params.get('all');
    if (!idUsr) return;

    const select = document.getElementById('sel-investigador');
    if (select) {
        // Si no existe opción en el select, la inyectamos para permitir carga directa desde Gestión de Usuarios
        const exists = Array.from(select.options).some(o => String(o.value) === String(idUsr));
        if (!exists) {
            const opt = document.createElement('option');
            opt.value = idUsr;
            opt.textContent = (txBI().opt_investigador_id || 'Investigador ID {id}').replace(/\{id\}/g, idUsr);
            select.appendChild(opt);
        }
        select.value = idUsr;
    }

    if (String(all) === '1') {
        // Historial completo por defecto
        const fDesde = document.getElementById('f-desde');
        const fHasta = document.getElementById('f-hasta');
        if (fDesde) fDesde.value = '2000-01-01';
        if (fHasta) fHasta.value = new Date().toISOString().split('T')[0];
    }

    const fd = params.get('facturacionDerivacion');
    if (fd) {
        const selFd = document.getElementById('sel-facturacion-derivacion');
        const fa = getFiltrosAlcanceDerivacionCached();
        if (selFd && ['todos', 'derivados', 'institucionales'].includes(fd) && (fd === 'todos' || (fa && fa.tieneDerivadosPendientes))) {
            selFd.value = fd;
        }
    }

    renderizarOpcionesInvestigador(listaInvestigadoresBaseFiltrada());

    setTimeout(() => {
        window.cargarFacturacionInvestigador();
    }, 150);
}

async function cargarListaInvestigadores() {
    const instId = localStorage.getItem('instId') || 1;
    try {
        const res = await API.request(`/users/list-investigators?inst=${instId}`);
        if (res.status === 'success' && res.data) {
            window.investigadoresCacheFull = res.data;
            window.investigadoresCache = res.data;
            renderizarOpcionesInvestigador(listaInvestigadoresBaseFiltrada());
            vincularFiltroRealTime();
        }
    } catch (e) { console.error("Error cargando investigadores:", e); }
}

function renderizarOpcionesInvestigador(lista) {
    const select = document.getElementById('sel-investigador');
    if (!select) return;
    const ph = txBI().ph_sel_investigador || '-- SELECCIONAR INVESTIGADOR --';
    const fa = getFiltrosAlcanceDerivacionCached();
    const scope = getFacturacionDerivacionSeleccionInv();
    const mapUsr = fa?.mapUsrDerivados || {};
    let html = `<option value="">${escapeHtmlInv(ph)}</option>`;
    html += lista.map((u) => {
        const id = Number(u.IdUsrA);
        const ap = String(u.ApellidoA || '').trim();
        const nom = String(u.NombreA || '').trim();
        const base = `${ap}, ${nom}`;
        let label;
        let titleAttr = '';
        if (scope === 'derivados') {
            const orig = mapUsr[id] ?? mapUsr[String(id)];
            label = orig ? `${base} — ${orig}` : base;
            titleAttr = orig ? `${base} — ${orig} (ID: ${id})` : `${base} (ID: ${id})`;
        } else if (scope === 'institucionales') {
            label = base;
            titleAttr = `${base} (ID: ${id})`;
        } else {
            label = `${base} (ID: ${id})`;
        }
        return `<option value="${id}" title="${escapeHtmlInv(titleAttr)}">${escapeHtmlInv(label)}</option>`;
    }).join('');
    select.innerHTML = html;
}

function vincularFiltroRealTime() {
    if (filtroInvestigadorVinculado) {
        return;
    }
    filtroInvestigadorVinculado = true;
    const inputBusqueda = document.getElementById('busqueda-investigador');
    if (!inputBusqueda) return;
    inputBusqueda.addEventListener('input', (e) => {
        const termino = e.target.value.toLowerCase();
        const filtrados = listaInvestigadoresBaseFiltrada().filter(u => {
            const nombreCompleto = `${u.ApellidoA} ${u.NombreA}`.toLowerCase();
            return nombreCompleto.includes(termino) || u.IdUsrA.toString().includes(termino);
        });
        renderizarOpcionesInvestigador(filtrados);
    });
}

window.cargarFacturacionInvestigador = async () => {
    const urlIdUsr = new URLSearchParams(window.location.search).get('idUsr');
    const idUsrSelected = document.getElementById('sel-investigador').value;
    const idUsr = idUsrSelected || urlIdUsr;
    const desde = document.getElementById('f-desde').value;
    const hasta = document.getElementById('f-hasta').value;
    const chkAni = document.getElementById('chk-animales').checked;
    const chkIns = document.getElementById('chk-insumos').checked;

    if (!idUsr) return Swal.fire(window.txt?.generales?.swal_atencion || 'Atención', window.txt?.facturacion?.aviso_investigador || 'Seleccione un investigador de la lista.', 'warning');

    const resultsEl = document.getElementById('billing-results');
    const prevReport = window.currentReportData;
    const useGlobalLoader = !invBillingReportLoadedOk;
    try {
        if (useGlobalLoader) {
            showLoader();
        } else if (resultsEl) {
            setBillingResultsLoadingInline('billing-results');
        }
        const res = await API.request('/billing/investigador-report', 'POST', {
            idUsr,
            desde,
            hasta,
            chkAni,
            chkIns,
            facturacionDerivacion: getFacturacionDerivacionSeleccionInv()
        });
        if (res.status === 'success') {
            window.currentReportData = res.data;
            renderizarResultados(res.data);
            invBillingReportLoadedOk = true;
        } else {
            Swal.fire(window.txt?.generales?.error || 'Error', res.message || '', 'error');
            if (!useGlobalLoader && prevReport) {
                renderizarResultados(prevReport);
            } else if (!useGlobalLoader && resultsEl) {
                resultsEl.replaceChildren();
            }
        }
    } catch (error) {
        console.error('Error en búsqueda:', error);
        if (!useGlobalLoader && prevReport) {
            renderizarResultados(prevReport);
        } else if (!useGlobalLoader && resultsEl) {
            resultsEl.replaceChildren();
            const err = document.createElement('div');
            err.className = 'alert alert-danger m-3';
            err.textContent = window.txt?.generales?.error_carga || 'Error al cargar datos.';
            resultsEl.appendChild(err);
        }
    } finally {
        if (useGlobalLoader) hideLoader();
    }
};

function renderizarResultados(data) {
    const container = document.getElementById('billing-results');
    const dashboardArea = document.getElementById('dashboard-area');
    const saldoContainer = document.getElementById('contenedor-saldo-maestro');
    const tituloInvestigador = document.getElementById('dashboard-investigador-titulo');
    const bi = txBI();
    const tf = txF();
    
    dashboardArea.classList.remove('d-none');

    if (tituloInvestigador && data.perfil) {
        const lblInv = bi.lbl_investigador_colon || 'Investigador:';
        tituloInvestigador.innerHTML = `
            <i class="bi bi-person-check-fill text-primary me-2"></i>
            ${lblInv} <span class="text-primary">${data.perfil.NombreCompleto}</span> 
            <span class="text-muted" style="font-size: 0.8em;">(ID: ${data.perfil.IdUsrA})</span>
        `;
    }

    const saldo = parseFloat(data.perfil?.SaldoDinero || 0);
    const idUsr = data.perfil?.IdUsrA;
    const phMonto = tf.inv_placeholder_monto || tf.monto_ajustar || 'Monto';

    if (saldoContainer) {
        const saldoLbl = bi.saldo_billetera || 'Saldo en Billetera:';
        saldoContainer.innerHTML = `
            <div class="d-flex align-items-center gap-3 justify-content-end mb-4">
                <div class="text-end">
                    <small class="text-muted fw-bold d-block uppercase" style="font-size: 9px;">${saldoLbl}</small>
                    <span class="badge bg-success fs-5 shadow-sm" id="investigador-saldo-global">$ ${formatBillingMoney(saldo)}</span>
                </div>
                <button type="button" class="btn btn-outline-secondary btn-sm fw-bold" onclick="window.openSaldoHistorialPopup({ idUsr: ${idUsr}, scope: 'investigador' })">
                    <i class="bi bi-clock-history me-1"></i>${tf.saldo_hist_btn || 'Historial'}
                </button>
                <div class="input-group input-group-sm shadow-sm" style="width: 210px;">
                    <input type="number" id="inp-saldo-${idUsr}" class="form-control border-primary" placeholder="${phMonto}...">
                    <button type="button" class="btn btn-success" onclick="window.updateBalance(${idUsr}, 'add', false)"><i class="bi bi-plus-lg"></i></button>
                    <button type="button" class="btn btn-danger" onclick="window.updateBalance(${idUsr}, 'sub', false)"><i class="bi bi-dash-lg"></i></button>
                </div>
            </div>
        `;
    }

    renderDashboard(data);

    let html = '';
    const showIns = document.getElementById('chk-insumos').checked;
    const showAni = document.getElementById('chk-animales').checked;

    if (showIns && data.insumosGenerales?.length > 0) {
        html += getInsumosGeneralesTableHTML(data.insumosGenerales);
    }

    const lblProt = tf.label_protocolo || 'Protocolo';
    (data.protocolos || []).forEach(prot => {
        const tieneInsProt = (prot.insumos?.length > 0);
        const tieneAniAloj = showAni && ((prot.formularios?.length > 0) || (prot.alojamientos?.length > 0));
        const mostrarTarjeta = (showAni && ((prot.formularios?.length > 0) || (prot.alojamientos?.length > 0) || tieneInsProt)) || (showIns && tieneInsProt);

        if (!mostrarTarjeta) return;

        html += `
                <div class="card shadow-sm border-0 mb-5 card-protocolo" id="card-prot-${prot.idProt}">
                    <div class="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                        <div>
                            <span class="badge bg-primary mb-1 uppercase" style="font-size: 9px;">${lblProt}: ${prot.nprotA}</span>
                            <h5 class="fw-bold m-0 text-dark">${prot.tituloA}</h5>
                        </div>
                    </div>
                    <div class="card-body p-3">
                        ${showAni ? getFormsTableHTML(prot.formularios, prot.idProt) : ''}
                        ${showAni && prot.alojamientos?.length > 0 ? getAlojTableHTML(prot.alojamientos, prot.idProt) : ''}
                        ${showIns && tieneInsProt ? getInsumosProtocoloTableHTML(prot.insumos, prot.idProt) : ''}
                    </div>
                    ${getFooterHTML(prot)}
                </div>`;
    });

    const sinMov = bi.sin_movimientos || 'No se encontraron movimientos.';
    container.innerHTML = html || `<div class="alert alert-light text-center py-5 shadow-sm">${sinMov}</div>`;
    vincularEventosSeleccion();
}

function getFormsTableHTML(formularios, idProt) {
    const bd = txBD();
    const bi = txBI();
    const tf = txF();
    const safeForms = formularios || [];

    if (safeForms.length === 0) return `<p class="text-center my-4 text-muted small">${bi.sin_pedidos_protocolo || 'No hay pedidos vinculados a este protocolo.'}</p>`;
    const secTit = bi.sec_pedidos_prot_form || 'Pedidos de Protocolo (Formularios)';
    const exL = bi.pdf_monto_exento || 'Exento';
    return `
        <h6 class="fw-bold text-secondary border-bottom pb-2 mb-3" style="font-size: 11px;">${secTit}</h6>
        <div class="table-responsive">
            <table class="table table-bordered table-billing mb-4 tabla-finanzas">
                <thead class="table-light text-center">
                    <tr>
                        <th style="width:2%"><input type="checkbox" class="check-all-form" data-prot="${idProt}"></th>
                        <th style="width:5%">${bd.th_id || 'ID'}</th>
                        <th style="width:8%">${bd.th_estado || 'ESTADO'}</th>
                        <th style="width:12%">${bi.th_fechas || 'FECHAS'}</th>
                        <th style="width:15%">${bd.th_especie_cepa || 'ESPECIE / TIPO'}</th>
                        <th style="width:15%">${bd.th_detalle_concepto || 'CONCEPTO'}</th>
                        <th style="width:12%" class="small">${bd.th_quien_derivo || 'Derivado por'}</th>
                        <th style="width:18%">${bd.th_cantidad_presentacion || 'CANTIDAD / PRESENTACIÓN'}</th>
                        <th style="width:8%">${bd.th_total_uc || 'TOTAL'}</th>
                        <th style="width:8%">${bd.th_pagado_uc || 'PAGADO'}</th>
                        <th style="width:8%">${bd.th_debe_uc || 'DEBE'}</th>
                    </tr>
                </thead>
                <tbody>
                    ${safeForms.map(f => {
                        const isExento = billingTipoExento(f);
                        const total = parseFloat(f.total || 0);
                        const pagado = parseFloat(f.pagado || 0);
                        const debe = isExento ? 0 : Math.max(0, total - pagado);
                        const sinMontoNoEx = billingPedidoSinMontoNoExento(isExento, total, pagado);
                        const lblSinTot = tf.pedido_sin_total_cobrable || 'Sin total';

                        const isRea = f.categoria?.toLowerCase().includes('reactivo');
                        const tipoModal = isRea ? 'REACTIVO' : 'ANIMAL';

                        let cantidadDisplay = '';
                        if (isRea) {
                            const nmRea = f.NombreInsumo || bi.reactivo_fallback || 'Reactivo';
                            cantidadDisplay = `
                                <div class="text-start lh-sm">
                                    <span class="text-info fw-bold">${nmRea}</span><br>
                                    <small class="text-muted" style="font-size: 10px;">${bd.lbl_pres || 'Pres:'} <b>${f.CantidadInsumo || '-'} ${f.TipoInsumo || ''}</b></small><br>
                                    <span class="badge bg-light text-dark border mt-1 shadow-sm">${bd.lbl_solicitadas || 'Solicitadas:'} <b class="text-primary">${f.cant_organo || 0} ${bd.un_abbr || 'un.'}</b></span>
                                </div>`;
                        } else {
                            cantidadDisplay = `<b class="fs-5 text-dark">${f.cant_animal || 0}</b> <small class="text-muted">${bd.un_abbr || 'un.'}</small>`;
                        }

                        const espDisplay = f.nombre_especie + (f.nombre_subespecie && f.nombre_subespecie !== 'N/A' ? `<br><small class="text-muted">${f.nombre_subespecie}</small>` : '');
                        const fi = bi.fecha_in || 'In:';
                        const fo = bi.fecha_out || 'Out:';
                        const fechasDisplay = `<div class="small"><b>${fi}</b> ${f.fecha || '-'}</div><div class="small text-danger"><b>${fo}</b> ${f.fecRetiroA || '-'}</div>`;
                        const dctoHTML = (f.descuento > 0) ? `<br><span class="badge-discount mt-1 d-inline-block">-${f.descuento}%</span>` : '';
                        
                        let estadoBadge = isExento ? `<span class="badge bg-info text-dark shadow-sm">${bd.badge_exento || 'EXENTO'}</span>` :
                            sinMontoNoEx ? `<span class="badge bg-secondary shadow-sm">${lblSinTot}</span>` :
                                         (debe <= 0 ? `<span class="badge bg-success shadow-sm">${bd.badge_pago_completo || 'PAGO COMPLETO'}</span>` :
                                         (pagado > 0 ? `<span class="badge bg-warning text-dark shadow-sm">${bd.badge_pago_parcial || 'PAGO PARCIAL'}</span>` :
                                         `<span class="badge bg-danger shadow-sm">${bd.badge_sin_pagar || 'SIN PAGAR'}</span>`));

                        const rowStyle = (isExento || (debe <= 0 && !sinMontoNoEx)) ? 'background-color: #f8fff9 !important;' : '';

                        return `
                            <tr class="text-center align-middle pointer" style="${rowStyle}" 
                                onclick="if(event.target.tagName !== 'INPUT') window.abrirEdicionFina('${tipoModal}', ${f.id})">
                                <td><input type="checkbox" class="check-item-form" data-prot="${idProt}" data-monto="${debe}" data-id="${f.id}" ${(debe <= 0 || isExento) ? 'disabled' : ''}></td>
                                <td class="small text-muted fw-bold">#${f.id}${billingDerivadaLiquidacionBadge(f)}</td>
                                <td>${estadoBadge}</td>
                                <td>${fechasDisplay}</td>
                                <td class="small text-secondary">${isRea ? `<span class="badge bg-light text-info border">${bd.badge_reactivo_bio || 'REACTIVO BIOLÓGICO'}</span>` : espDisplay}</td>
                                <td class="text-start ps-3 small">${(f.detalle_display || '').replace(/<[^>]*>/g, "")} ${dctoHTML}</td>
                                <td class="small text-start text-muted">${billingDerivacionPlainText(f) || '—'}</td>
                                <td>${cantidadDisplay}</td>
                                ${billingTdTotalPagadoDebe(isExento, total, pagado, exL)}
                            </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;
}

function getAlojTableHTML(alojamientos, idProt) {
    const bd = txBD();
    const bi = txBI();
    const bp = txBP();
    const tf = txF();
    const secA = bi.sec_alojamientos || 'Alojamientos';
    const lblAloj = bi.lbl_aloj_def || 'Alojamiento';
    const thDep = bp.th_aloj_departamento || bi.col_departamento || 'DEPTO';
    return `
        <div class="mt-2 border-top pt-3">
            <h6 class="fw-bold text-muted mb-2 small uppercase">${secA}</h6>
            <table class="table table-bordered table-billing mb-0">
                <thead class="table-dark text-center">
                    <tr>
                        <th style="width:3%"><input type="checkbox" class="check-all-aloj" data-prot="${idProt}"></th>
                        <th>${bi.th_historia || 'HISTORIA'}</th><th class="small">${thDep}</th><th>${bd.th_especie_cepa || 'ESPECIE / TIPO'}</th><th>${tf.dias || 'DÍAS'}</th><th>${bd.th_total_uc || 'TOTAL'}</th><th>${bd.th_pagado_uc || 'PAGADO'}</th><th>${bd.th_debe_uc || 'DEBE'}</th>
                    </tr>
                </thead>
                <tbody>
                    ${alojamientos.map(a => `
                        <tr onclick="window.billingRowClickOpenAlojModal(event, ${a.historia})" class="text-center align-middle pointer">
                            <td><input type="checkbox" class="check-item-aloj" data-prot="${idProt}" data-id="${a.historia}" data-monto="${a.debe}" ${a.debe <= 0 ? 'disabled' : ''}></td>
                            <td>#${a.historia}</td>
                            <td class="small text-start">${(a.nombre_departamento && String(a.nombre_departamento).trim()) ? a.nombre_departamento : '—'}</td>
                            <td>${a.especie} <br><small class="text-muted">${a.caja || lblAloj}</small></td>
                            <td class="fw-bold">${a.dias}</td>
                            <td class="text-end">$ ${formatBillingMoney(a.total)}</td>
                            <td class="text-end text-success fw-bold">$ ${formatBillingMoney(a.pagado || 0)}</td>
                            <td class="text-end text-danger fw-bold">$ ${formatBillingMoney(a.debe)}</td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
}

/** Insumos de pedido vinculados al protocolo (misma grilla que Facturación por Protocolo). */
function getInsumosProtocoloTableHTML(insumos, idProt) {
    if (!insumos || insumos.length === 0) return '';
    const bd = txBD();
    const tf = txF();
    const bi = txBI();
    const exL = bi.pdf_monto_exento || 'Exento';
    const titulo = tf.insumos_protocolo ?? 'Insumos del protocolo';
    const packs = { bd, tf, bi, exL };
    const { reactivos, otros } = billingPartitionInsumosPedidoReactivoOtros(insumos);
    const lblRea = tf.insumos_prot_subtitulo_reactivos ?? 'Pedidos insumo — reactivos biológicos';
    const lblDem = tf.insumos_prot_subtitulo_demas ?? 'Pedidos insumo — materiales y otros rubros';
    const colspan = 10;
    let tbody = '';
    if (reactivos.length > 0) {
        tbody += billingHtmlInsumoProtSectionHeader(colspan, lblRea);
        tbody += reactivos.map(i => billingHtmlRowInsumoPedidoFacturacion(i, packs, 'protocolo', idProt)).join('');
    }
    if (otros.length > 0) {
        tbody += billingHtmlInsumoProtSectionHeader(colspan, lblDem);
        tbody += otros.map(i => billingHtmlRowInsumoPedidoFacturacion(i, packs, 'protocolo', idProt)).join('');
    }

    return `
        <div class="mt-4 border-top pt-3">
            <h6 class="fw-bold text-secondary border-bottom pb-2 mb-3" style="font-size: 11px;"><i class="bi bi-box-seam me-1"></i>${titulo}</h6>
            <div class="table-responsive">
                <table class="table table-bordered table-billing mb-0">
                    <thead class="table-light text-center">
                        <tr>
                            <th style="width:3%"><input type="checkbox" class="check-all-insumo-prot" data-prot="${idProt}"></th>
                            <th style="width:5%">${bd.th_id || 'ID'}</th>
                            <th style="width:8%">${bi.th_estado_cap || 'Estado'}</th>
                            <th style="width:10%">${bi.th_fechas || 'FECHAS'}</th>
                            <th style="width:12%">${bi.th_solicitante_cap || 'Solicitante'}</th>
                            <th style="width:12%" class="small">${bd.th_quien_derivo || 'Derivado por'}</th>
                            <th>${bi.th_concepto_detalle || 'Concepto / Detalle'}</th>
                            <th style="width:10%">${tf.total || 'Total'}</th>
                            <th style="width:10%">${tf.pago || 'Pagado'}</th>
                            <th style="width:10%">${bd.th_debe_uc || 'DEBE'}</th>
                        </tr>
                    </thead>
                    <tbody>${tbody}</tbody>
                </table>
            </div>
        </div>`;
}

function getInsumosGeneralesTableHTML(insumos) {
    if (!insumos || insumos.length === 0) return '';

    const bd = txBD();
    const tf = txF();
    const bi = txBI();
    const exL = bi.pdf_monto_exento || 'Exento';
    const packs = { bd, tf, bi, exL };
    const sums = billingSumInsumosCobrable(insumos);
    const sumTotal = sums.total;
    const sumPagado = sums.pagado;
    const sumDebe = sums.debe;
    const { reactivos, otros } = billingPartitionInsumosPedidoReactivoOtros(insumos);
    const lblRea = tf.insumos_prot_subtitulo_reactivos ?? 'Pedidos insumo — reactivos biológicos';
    const lblDem = tf.insumos_prot_subtitulo_demas ?? 'Pedidos insumo — materiales y otros rubros';
    const colspan = 10;
    let filas = '';
    if (reactivos.length > 0) {
        filas += billingHtmlInsumoProtSectionHeader(colspan, lblRea);
        filas += reactivos.map(i => billingHtmlRowInsumoPedidoFacturacion(i, packs, 'general')).join('');
    }
    if (otros.length > 0) {
        filas += billingHtmlInsumoProtSectionHeader(colspan, lblDem);
        filas += otros.map(i => billingHtmlRowInsumoPedidoFacturacion(i, packs, 'general')).join('');
    }

    const tituloSinProt = tf.insumos_sin_protocolo ?? 'Insumos sin protocolo (pedidos directos)';

    return `
        <div class="card shadow-sm border-0 mb-5 card-insumos-generales" style="border-left: 5px solid #0d6efd !important;">
            <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h5 class="m-0 text-primary fw-bold"><i class="bi bi-box-seam-fill me-2"></i>${tituloSinProt}</h5>
                <button class="btn btn-link btn-sm text-danger p-0" onclick="window.downloadInsumosPDF && window.downloadInsumosPDF()">
                    <i class="bi bi-filetype-pdf fs-4"></i>
                </button>
            </div>
            <div class="card-body p-0">
                <table class="table table-bordered table-billing mb-0">
                    <thead class="table-dark text-center">
                        <tr>
                            <th style="width:3%"><input type="checkbox" id="check-all-insumos-gen"></th>
                            <th style="width:5%">${bd.th_id || 'ID'}</th>
                            <th style="width:8%">${window.txt?.generales?.estado || 'Estado'}</th>
                            <th style="width:10%">${bi.th_fechas || 'FECHAS'}</th>
                            <th style="width:15%">${bd.th_solicitante || 'Solicitante'}</th>
                            <th style="width:12%" class="small">${bd.th_quien_derivo || 'Derivado por'}</th>
                            <th>${bd.th_conceptos_cantidades || 'Conceptos y Cantidades (Agrupados)'}</th>
                            <th style="width:10%">${tf.total || 'Total'}</th>
                            <th style="width:10%">${tf.pago || 'Pago'}</th>
                            <th style="width:10%">${bd.th_debe_uc || 'DEBE'}</th>
                        </tr>
                    </thead>
                    <tbody>${filas}</tbody>
                </table>
            </div>
            <div class="card-footer bg-light py-3 border-top">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex gap-5">
                        <div class="text-center">
                            <small class="d-block text-muted uppercase" style="font-size:9px">${bd.footer_insumos_total || 'Total Insumos'}</small>
                            <b class="fs-6">$ ${formatBillingMoney(sumTotal)}</b>
                        </div>
                        <div class="text-center">
                            <small class="d-block text-muted uppercase" style="font-size:9px">${bd.footer_insumos_pagado || 'Total Pago'}</small>
                            <b class="fs-6 text-success">$ ${formatBillingMoney(sumPagado)}</b>
                        </div>
                        <div class="text-center">
                            <small class="d-block text-muted uppercase" style="font-size:9px">${bd.footer_insumos_falta || 'Total Falta'}</small>
                            <b class="fs-6 text-danger">$ ${formatBillingMoney(sumDebe)}</b>
                        </div>
                    </div>
                    <div class="text-end">
                        <span class="fs-4 fw-bold text-primary" id="total-insumos-seleccionados">$ ${formatBillingMoney(0)}</span>
                        <button class="btn btn-primary btn-sm fw-bold ms-3 shadow-sm" onclick="window.procesarPagoInsumosGenerales()">
                            <i class="bi bi-wallet2 me-1"></i> ${tf.btn_pagar_sel || 'Pagar Selección'}
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
}

function getFooterHTML(prot) {
    const bi = txBI();
    const tf = txF();
    const mn = window.txt?.menu || {};
    const sForm = billingSumFormulariosCobrable(prot.formularios);
    const sAloj = billingSumAlojamientos(prot.alojamientos);
    const sIns = billingSumInsumosCobrable(prot.insumos);
    let totAni = 0;
    let totRea = 0;
    for (const f of prot.formularios || []) {
        if (billingTipoExento(f)) continue;
        const t = Number(f.total || 0);
        if (!Number.isFinite(t)) continue;
        const cat = String(f.categoria || '').toLowerCase();
        if (cat.includes('reactivo')) totRea += t;
        else totAni += t;
    }
    const totAlo = sAloj.total;
    const totIns = sIns.total;
    const numTotal = sForm.total + sAloj.total + sIns.total;
    const numDebe = sForm.debe + sAloj.debe + sIns.debe;
    const numPago = sForm.pagado + sAloj.pagado + sIns.pagado;
    const lblTot = tf.total || 'Total';
    const lblAloj = mn.accommodations || 'Alojamiento';
    const lblAni = mn.animals || 'Animales';
    const lblRea = mn.reagents || 'Reactivos';
    const lblIns = tf.filtro_insumos || 'Insumos';
    const lblPag = tf.pago || 'Pagado';
    const lblFal = tf.falta || 'Falta';
    const btnEc = bi.btn_estado_cuenta || 'ESTADO DE CUENTA';
    const selLiq = bi.seleccion_liquidar || 'Seleccionado para liquidar:';

    return `
        <div class="card-footer bg-white border-top py-3 shadow-sm">
            <div class="d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center gap-4">
                    <button type="button" class="btn btn-outline-danger btn-sm fw-bold" onclick="window.downloadProtocoloPDF(${prot.idProt})">
                        <i class="bi bi-file-earmark-pdf me-1"></i>${btnEc}
                    </button>
                    
                    <div class="d-flex gap-3 border-start ps-4">
                        <div class="small text-muted">${lblTot}: <b>$ ${formatBillingMoney(numTotal)}</b></div>
                        <div class="small text-muted">${lblAloj}: <b>$ ${formatBillingMoney(totAlo)}</b></div>
                        <div class="small text-muted">${lblAni}: <b>$ ${formatBillingMoney(totAni)}</b></div>
                        <div class="small text-muted">${lblRea}: <b>$ ${formatBillingMoney(totRea)}</b></div>
                        <div class="small text-muted">${lblIns}: <b>$ ${formatBillingMoney(totIns)}</b></div>
                        <div class="small text-success border-start ps-3">${lblPag}: <b>$ ${formatBillingMoney(numPago)}</b></div>
                        <div class="small text-danger border-start ps-3">${lblFal}: <b>$ ${formatBillingMoney(numDebe)}</b></div>
                    </div>
                </div>

                <div class="d-flex align-items-center gap-3">
                    <div class="text-end me-2">
                        <small class="text-muted d-block uppercase fw-bold" style="font-size: 9px;">${selLiq}</small>
                        <span class="fs-5 fw-bold text-primary" id="pago-seleccionado-${prot.idProt}">$ ${formatBillingMoney(0)}</span>
                    </div>
                    <button type="button" class="btn btn-primary fw-bold px-4 shadow-sm" onclick="window.procesarPagoProtocolo(${prot.idProt})">
                        <i class="bi bi-wallet2 me-2"></i> ${tf.btn_pagar_sel || 'Pagar Selección'}
                    </button>
                    ${(prot.insumos?.length > 0) ? `
                    <div class="d-flex align-items-center gap-2 border-start ps-3 ms-2">
                        <div class="text-end">
                            <small class="text-muted d-block uppercase fw-bold" style="font-size: 9px;">${tf.seleccion_insumos_lbl || 'Insumos seleccionados'}:</small>
                            <span class="fs-6 fw-bold text-primary" id="pago-insumos-seleccionado-${prot.idProt}">$ ${formatBillingMoney(0)}</span>
                        </div>
                        <button type="button" class="btn btn-outline-primary fw-bold px-3 shadow-sm" onclick="window.procesarPagoInsumosProtocolo(${prot.idProt})">
                            <i class="bi bi-box-seam me-1"></i> ${tf.btn_pagar_insumos_prot || 'Pagar insumos'}
                        </button>
                    </div>` : ''}
                </div>
            </div>
        </div>`;
}

function vincularEventosSeleccion() {
    document.querySelectorAll('.check-all-form, .check-all-aloj, .check-all-insumo-prot').forEach(master => {
        master.addEventListener('change', (e) => {
            const idProt = e.target.dataset.prot;
            let clase = '.check-item-aloj';
            if (e.target.classList.contains('check-all-form')) clase = '.check-item-form';
            else if (e.target.classList.contains('check-all-insumo-prot')) clase = '.check-item-insumo-prot';
            document.querySelectorAll(`${clase}[data-prot="${idProt}"]:not(:disabled)`).forEach(c => c.checked = e.target.checked);
            if (e.target.classList.contains('check-all-insumo-prot')) {
                actualizarSumaInsumosProt(idProt);
            } else {
                actualizarSuma(idProt);
            }
        });
    });

    document.addEventListener('change', (e) => {
        if (e.target.matches('.check-item-form, .check-item-aloj')) {
            actualizarSuma(e.target.dataset.prot);
        }
        if (e.target.matches('.check-item-insumo-prot')) {
            actualizarSumaInsumosProt(e.target.dataset.prot);
        }
    });

    const masterIns = document.getElementById('check-all-insumos-gen');
    if (masterIns) {
        masterIns.addEventListener('change', (e) => {
            document.querySelectorAll('.check-item-insumo-global:not(:disabled)').forEach(c => c.checked = e.target.checked);
            actualizarSumaInsumos();
        });
    }
    document.querySelectorAll('.check-item-insumo-global').forEach(c => c.addEventListener('change', actualizarSumaInsumos));
}

function actualizarSuma(idProt) {
    let suma = 0;
    document.querySelectorAll(
        `.check-item-form[data-prot="${idProt}"]:checked, .check-item-aloj[data-prot="${idProt}"]:checked`
    ).forEach((chk) => { suma += parseFloat(chk.dataset.monto || 0); });
    const visor = document.getElementById(`pago-seleccionado-${idProt}`);
    if (visor) visor.innerText = `$ ${formatBillingMoney(suma)}`;
}

function actualizarSumaInsumosProt(idProt) {
    let suma = 0;
    document.querySelectorAll(`.check-item-insumo-prot[data-prot="${idProt}"]:checked`)
        .forEach((chk) => { suma += parseFloat(chk.dataset.monto || 0); });
    const visor = document.getElementById(`pago-insumos-seleccionado-${idProt}`);
    if (visor) visor.innerText = `$ ${formatBillingMoney(suma)}`;
}

function actualizarSumaInsumos() {
    let suma = 0;
    document.querySelectorAll('.check-item-insumo-global:checked').forEach(chk => suma += parseFloat(chk.dataset.monto || 0));
    const visor = document.getElementById('total-insumos-seleccionados');
    if (visor) visor.innerText = `$ ${formatBillingMoney(suma)}`;
}

function aplicarEstilosTablas() {
    if (document.getElementById('estilos-gecko-inv')) return;
    const style = document.createElement('style');
    style.id = 'estilos-gecko-inv';
    style.innerHTML = `
        /* Cursor y Hover estilo Departamento */
        .table-billing tbody tr { transition: all 0.2s; }
        .table-billing tbody tr:hover td { background-color: #f0f7ff !important; color: #000 !important; }
        
        .pointer { cursor: pointer !important; }
        .pointer:hover { background-color: #f0f7ff !important; }
        
        /* MAGIA: Anular manito en checkbox */
        .pointer td:first-child { cursor: default !important; }
        .pointer td:first-child input[type="checkbox"] { cursor: pointer !important; }
        
        .table-billing thead th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; vertical-align: middle; }
        .tabla-finanzas tbody td { font-size: 11px; }
    `;
    document.head.appendChild(style);
}

function getSelectedDateRangeLabelInv() {
    const sep = txBI().fecha_rango_sep || ' a ';
    let desde = document.getElementById('f-desde')?.value || '';
    let hasta = document.getElementById('f-hasta')?.value || '';
    if (!desde && !hasta) {
        desde = document.getElementById('perfil-billing-desde')?.value || '';
        hasta = document.getElementById('perfil-billing-hasta')?.value || '';
    }
    if (!desde && !hasta) return '-';
    if (desde && hasta) return `${desde}${sep}${hasta}`;
    return desde || hasta;
}

window.abrirAyudaBilling = () => { new bootstrap.Modal(document.getElementById('modal-billing-help')).show(); };

// =====================================
// EXPORTADOR DE PDF GLOBAL
// =====================================
window.downloadGlobalPDF = async () => {
    if (!window.currentReportData) return Swal.fire(window.txt?.generales?.swal_aviso || 'Aviso', window.txt?.facturacion?.sin_datos_cargados || 'No hay datos cargados.', 'info');
    
    showLoader();
    const bi = txBI();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const M = 18;
    const pageW = doc.internal.pageSize.getWidth();
    const right = pageW - M;
    const invNombre = window.currentReportData.perfil?.NombreCompleto || bi.pdf_investigador_upper || 'INVESTIGADOR';
    const azulGecko = [13, 110, 253];
    const rangoFechas = getSelectedDateRangeLabelInv();
    const invPfx = ((bi.lbl_investigador_colon || 'Investigador:').replace(/\s*:?\s*$/, '') || 'Investigador').toUpperCase();
    const instLine = (getBillingNombreInstitucion() || bi.pdf_inst_generica || 'INSTITUCIÓN').toUpperCase();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(45, 45, 45);
    doc.text(instLine, 148, M, { align: "center" });
    doc.setFontSize(20);
    doc.setTextColor(azulGecko[0], azulGecko[1], azulGecko[2]);
    doc.text(bi.pdf_cuenta_integral || 'ESTADO DE CUENTA INTEGRAL', 148, M + 7, { align: "center" });
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`${invPfx}: ${invNombre.toUpperCase()}`, 148, M + 14, { align: "center" });
    doc.setFontSize(10);
    doc.text(`${bi.pdf_rango_filtrado || 'RANGO FILTRADO:'} ${rangoFechas}`, 148, M + 19, { align: "center" });
    doc.line(M, M + 22, right, M + 22);

    const t = window.currentReportData.totales;
    doc.autoTable({
        startY: M + 26, margin: { left: M, right: M },
        head: [[
            bi.pdf_deu_animales || 'DEUDA ANIMALES',
            bi.pdf_deu_reactivos || 'DEUDA REACTIVOS',
            bi.pdf_deu_aloj || 'DEUDA ALOJAMIENTO',
            bi.pdf_deu_insumos || 'DEUDA INSUMOS',
            bi.pdf_tot_pagado_ex || 'TOTAL PAGADO (+EX)',
            bi.pdf_deu_total || 'DEUDA TOTAL'
        ]],
        body: [[
            `$ ${formatBillingMoney(t.deudaAnimales)}`, `$ ${formatBillingMoney(t.deudaReactivos)}`, 
            `$ ${formatBillingMoney(t.deudaAlojamiento)}`, `$ ${formatBillingMoney(t.deudaInsumos)}`, 
            `$ ${formatBillingMoney(t.totalPagado)}`,
            { content: `$ ${formatBillingMoney(t.globalDeuda)}`, styles: { textColor: [180, 0, 0], fontStyle: 'bold' } }
        ]],
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40] },
        styles: { halign: 'center' }
    });

    let currentY = doc.lastAutoTable.finalY + 10;

    (window.currentReportData.protocolos || []).forEach((prot) => {
        if (currentY > 160) {
            doc.addPage();
            currentY = M;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(80, 80, 80);
            doc.text(instLine, 148, currentY + 4, { align: 'center' });
            currentY += 8;
        }

        doc.setFillColor(245, 245, 245);
        doc.rect(M, currentY, right - M, 8, 'F');
        doc.setFontSize(9);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text(`${bi.pdf_prot || 'PROT:'} ${prot.nprotA} - ${prot.tituloA}`, M + 3, currentY + 6);
        const pAloj = bi.pdf_prefijo_aloj || 'Alojamiento';
        const pEstr = bi.pdf_aloj_estructura || 'Estructura';
        const pIns = (bi.pdf_prefijo_insumo || 'Insumo:').replace(/\s*:?\s*$/, '');
        const exL = bi.pdf_monto_exento || 'Exento';

        const lblTotPdf = bi.pdf_col_total || bi.pdf_col_precio || 'Total';
        const lblPagPdf = bi.pdf_col_pagado || bi.pdf_col_pago_total || 'Pagado';
        const lblDebPdf = bi.pdf_col_debe || 'Debe';

        const bodyItems = [
            ...(prot.formularios || []).map(f => {
                const isEx = billingTipoExento(f);
                const total = parseFloat(f.total || 0);
                const pagadoReal = parseFloat(f.pagado || 0);
                const m = pdfColsPrecioDebePagoTotal(isEx, total, pagadoReal, exL);

                return [
                    billingPdfFormularioIdDisplay(f, { style: 'plain', marcaExento: billingPdfMarcaExentoLarga() }),
                    billingFormatPedidoFechasPlain(f, bi),
                    f.nombre_especie,
                    f.detalle_display.replace(/<[^>]*>/g, ""),
                    m[0], m[2], m[1]
                ];
            }),
            ...(prot.alojamientos || []).map(a => {
                const m = pdfColsPrecioDebePagoTotal(false, a.total, a.pagado || 0, exL);
                const diasU = window.txt?.facturacion?.billing_depto_export?.pdf_aloj_dias_unit || 'd';
                return [
                    a.historia,
                    billingAlojPeriodoParaInforme(a, { diasUnit: diasU }),
                    a.especie,
                    `${pAloj} (${a.caja || pEstr})`,
                    m[0],
                    m[2],
                    m[1],
                ];
            }),
            ...(prot.insumos || []).map(i => {
                const total = billingInsumoMontoTotalCobrable(i);
                const pagado = parseFloat(i.pagado || 0);
                const det = (i.detalle_completo || '').replace(/<[^>]*>/g, '').substring(0, 40);
                const m = pdfColsPrecioDebePagoTotal(billingTipoExento(i), total, pagado, exL);
                const idInsPdf = `I-${billingPdfFormularioIdDisplay(i, { style: 'plain', marcaExento: billingPdfMarcaExentoLarga() })}`;
                return [
                    String(idInsPdf).substring(0, 28),
                    billingFormatPedidoFechasPlain(i, bi),
                    `${pIns}: ${det}`,
                    m[0], m[2], m[1]
                ];
            })
        ];

        doc.autoTable({
            startY: currentY + 8, margin: { left: M, right: M },
            head: [[
                bi.pdf_col_id || 'ID',
                bi.pdf_col_fecha || 'Fecha',
                bi.pdf_col_especie || 'Especie',
                bi.pdf_col_detalle || 'Detalle',
                lblTotPdf,
                lblPagPdf,
                lblDebPdf
            ]],
            body: bodyItems,
            theme: 'striped',
            headStyles: { fillColor: azulGecko },
            styles: { fontSize: 7 },
            columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right', fontStyle: 'bold' } }
        });

        const sF = billingSumFormulariosCobrable(prot.formularios);
        const sA = billingSumAlojamientos(prot.alojamientos);
        const sI = billingSumInsumosCobrable(prot.insumos);
        const pTotal = sF.total + sA.total + sI.total;
        const pPago = sF.pagado + sA.pagado + sI.pagado;
        const pDebe = sF.debe + sA.debe + sI.debe;

        currentY = doc.lastAutoTable.finalY;
        doc.setFontSize(7); doc.setTextColor(100);
        const ySum = currentY + 5;
        doc.text(`${lblTotPdf}:`, 120, ySum);
        doc.setTextColor(0); doc.setFont('helvetica', 'bold');
        doc.text(`$ ${formatBillingMoney(pTotal)}`, 155, ySum, { align: 'right' });
        doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
        doc.text(`${lblPagPdf}:`, 165, ySum);
        doc.setTextColor(26, 93, 59); doc.setFont('helvetica', 'bold');
        doc.text(`$ ${formatBillingMoney(pPago)}`, 205, ySum, { align: 'right' });
        doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
        doc.text(`${lblDebPdf}:`, 215, ySum);
        doc.setTextColor(200, 0, 0); doc.setFont('helvetica', 'bold');
        doc.text(`$ ${formatBillingMoney(pDebe)}`, 275, ySum, { align: 'right' });
        doc.setFont('helvetica', 'normal'); doc.setTextColor(0);

        currentY += 15;
    });

    doc.save(`Reporte_Integral_${invNombre.replace(/ /g, '_')}.pdf`);
    hideLoader();
};

window.downloadProtocoloPDF = async (idProt) => {
    if (!window.currentReportData) return;
    const prot = window.currentReportData.protocolos.find(p => p.idProt == idProt || String(p.idProt) === String(idProt));
    if (!prot) return;

    showLoader();
    const bi = txBI();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const M = 18;
    const pageW = doc.internal.pageSize.getWidth();
    const right = pageW - M;
    const inst = (getBillingNombreInstitucion() || bi.pdf_inst_generica || 'INSTITUCIÓN').toUpperCase();
    const invNombre = window.currentReportData.perfil?.NombreCompleto || bi.pdf_investigador_upper || 'INVESTIGADOR';
    const rangoFechas = getSelectedDateRangeLabelInv();
    const pEstr = bi.pdf_aloj_estructura || 'Estructura';
    const alojAb = bi.pdf_aloj_abrev || 'Aloj.';
    const pIns = (bi.pdf_prefijo_insumo || 'Insumo:').replace(/\s*:?\s*$/, '');

    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(26, 93, 59);
    doc.text(inst, 105, M, { align: "center" });

    doc.setFontSize(11); doc.setTextColor(100);
    doc.text(bi.pdf_cuenta_individual_prot || 'ESTADO DE CUENTA INDIVIDUAL POR PROTOCOLO', 105, M + 7, { align: "center" });
    doc.line(M, M + 10, right, M + 10);

    doc.setFontSize(9); doc.setTextColor(0);
    doc.text(`${bi.pdf_lbl_protocolo || 'Protocolo:'} ${prot.tituloA}`, M, M + 20);
    doc.text(`${bi.pdf_lbl_investigador || 'Investigador:'} ${invNombre}`, M, M + 26);
    doc.text(`${bi.pdf_lbl_rango || 'Rango filtrado:'} ${rangoFechas}`, M, M + 32);

    const exL = bi.pdf_monto_exento || 'Exento';
    const lblTotPdf = bi.pdf_col_total || bi.pdf_col_precio || 'Total';
    const lblPagPdf = bi.pdf_col_pagado || bi.pdf_col_pago_total || 'Pagado';
    const lblDebPdf = bi.pdf_col_debe || 'Debe';
    const bodyAll = [
        ...(prot.formularios || []).map(f => {
            const isEx = billingTipoExento(f);
            const total = parseFloat(f.total || 0);
            const pagadoReal = parseFloat(f.pagado || 0);
            const m = pdfColsPrecioDebePagoTotal(isEx, total, pagadoReal, exL);
            return [
                billingPdfFormularioIdDisplay(f, { style: 'plain', marcaExento: billingPdfMarcaExentoLarga() }),
                billingFormatPedidoFechasPlain(f, bi),
                f.nombre_especie,
                f.detalle_display.replace(/<[^>]*>/g, ""),
                m[0], m[2], m[1]
            ];
        }),
        ...(prot.alojamientos || []).map(a => {
            const m = pdfColsPrecioDebePagoTotal(false, a.total, a.pagado || 0, exL);
            const diasU = window.txt?.facturacion?.billing_depto_export?.pdf_aloj_dias_unit || 'd';
            const perInf = billingAlojPeriodoParaInforme(a, { diasUnit: diasU });
            const concepto = `${alojAb} (${a.caja || pEstr})`;
            return [`H-${a.historia}`, perInf || '-', a.especie, concepto, m[0], m[2], m[1]];
        }),
        ...(prot.insumos || []).map(i => {
            const total = billingInsumoMontoTotalCobrable(i);
            const pagado = parseFloat(i.pagado || 0);
            const det = (i.detalle_completo || '').replace(/<[^>]*>/g, '').substring(0, 35);
            const m = pdfColsPrecioDebePagoTotal(billingTipoExento(i), total, pagado, exL);
            const idInsPdf = `I-${billingPdfFormularioIdDisplay(i, { style: 'plain', marcaExento: billingPdfMarcaExentoLarga() })}`;
            return [
                String(idInsPdf).substring(0, 28),
                billingFormatPedidoFechasPlain(i, bi),
                '-',
                `${pIns}: ${det}`,
                m[0], m[2], m[1]
            ];
        }),
    ];

    doc.autoTable({
        startY: M + 38, margin: { left: M, right: M }, head: [[
            bi.pdf_col_id || 'ID',
            bi.pdf_col_fecha || 'Fechas',
            bi.pdf_col_especie || 'Especie',
            bi.pdf_col_concepto || 'Concepto',
            lblTotPdf,
            lblPagPdf,
            lblDebPdf
        ]],
        body: bodyAll, theme: 'grid', headStyles: { fillColor: [26, 93, 59] },
        styles: { fontSize: 8 }, columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right', fontStyle: 'bold' } }
    });

    const sFp = billingSumFormulariosCobrable(prot.formularios);
    const sAp = billingSumAlojamientos(prot.alojamientos);
    const sIp = billingSumInsumosCobrable(prot.insumos);
    const pTotal = sFp.total + sAp.total + sIp.total;
    const pPago = sFp.pagado + sAp.pagado + sIp.pagado;
    const pDebe = sFp.debe + sAp.debe + sIp.debe;

    let currentY = doc.lastAutoTable.finalY + 10;
    if (currentY > 250) { doc.addPage(); currentY = M; }

    doc.setDrawColor(200); doc.setFillColor(245, 245, 245); doc.rect(120, currentY, 70, 25, 'FD');
    doc.setFontSize(9); doc.setTextColor(100);
    doc.text(`${lblTotPdf}:`, 125, currentY + 7);
    doc.text(`${lblPagPdf}:`, 125, currentY + 13);
    doc.text(`${lblDebPdf}:`, 125, currentY + 19);

    doc.setFont("helvetica", "bold"); doc.setTextColor(0); doc.text(`$ ${formatBillingMoney(pTotal)}`, 185, currentY + 7, { align: "right" });
    doc.setTextColor(26, 93, 59); doc.text(`$ ${formatBillingMoney(pPago)}`, 185, currentY + 13, { align: "right" });
    doc.setTextColor(200, 0, 0); doc.text(`$ ${formatBillingMoney(pDebe)}`, 185, currentY + 19, { align: "right" });

    doc.save(`Ficha_Protocolo_${prot.nprotA}.pdf`);
    hideLoader();
};