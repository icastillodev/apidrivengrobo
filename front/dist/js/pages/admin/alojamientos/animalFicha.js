/**
 * Ficha de animal (sujeto) en alojamiento: modal + PDF con resumen y trazabilidad completa.
 */
import { API } from '../../../api.js';

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function ensureHtml2pdf() {
    if (typeof window.html2pdf === 'function') {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-html2pdf-loader]');
        if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('html2pdf')));
            return;
        }
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        s.async = true;
        s.setAttribute('data-html2pdf-loader', '1');
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('No se pudo cargar html2pdf'));
        document.head.appendChild(s);
    });
}

function sexoSujetoLabel(code, t) {
    const u = String(code ?? '').toUpperCase().trim();
    if (u === 'M') return t.trace_sexo_macho || 'M';
    if (u === 'H' || u === 'F') return t.trace_sexo_hembra || 'H';
    if (u === 'I') return t.trace_sexo_indistinto || 'I';
    return String(code ?? '').trim();
}

/** Líneas de ficha biológica por fila de unidad (un tramo). */
function htmlDatosSujetoTramo(row, t) {
    const parts = [];
    if (row.PesoSujetoKg !== null && row.PesoSujetoKg !== undefined && String(row.PesoSujetoKg).trim() !== '') {
        parts.push(`<span class="me-2"><strong>${esc(t.animal_ficha_peso || 'Peso')}</strong>: ${esc(String(row.PesoSujetoKg))}</span>`);
    }
    if (row.FechaNacimientoSujeto) {
        parts.push(`<span class="me-2"><strong>${esc(t.animal_ficha_nacimiento || '')}</strong>: ${esc(String(row.FechaNacimientoSujeto).slice(0, 10))}</span>`);
    }
    if (row.SexoSujeto) {
        parts.push(`<span class="me-2"><strong>${esc(t.animal_ficha_sexo || '')}</strong>: ${esc(sexoSujetoLabel(row.SexoSujeto, t))}</span>`);
    }
    const razaBits = [];
    if (row.SubespecieNombreSujeto) razaBits.push(String(row.SubespecieNombreSujeto));
    if (row.CategoriaRazaSujeto && !razaBits.includes(String(row.CategoriaRazaSujeto))) {
        razaBits.push(String(row.CategoriaRazaSujeto));
    }
    if (row.CepaNombreSujeto && !razaBits.includes(String(row.CepaNombreSujeto))) {
        razaBits.push(String(row.CepaNombreSujeto));
    }
    if (razaBits.length) {
        parts.push(`<span class="me-2"><strong>${esc(t.animal_ficha_subespecie || '')}</strong>: ${esc(razaBits.join(' · '))}</span>`);
    }
    if (!parts.length) {
        return '';
    }
    return `<p class="small mb-2 text-secondary border-start border-3 border-secondary ps-2">${esc(t.animal_ficha_tramo_datos_sujeto || '')}: ${parts.join(' ')}</p>`;
}

function renderPivotRows(obsPivot, categorias) {
    const t = window.txt?.alojamientos || {};
    if (!obsPivot || obsPivot.length === 0) {
        return `<tr><td colspan="${(categorias?.length || 0) + 1}" class="text-muted">${esc(t.animal_ficha_sin_registros || '—')}</td></tr>`;
    }
    return obsPivot.map((row) => `
        <tr>
            <td class="fw-bold">${esc(row.fechaObs || '')}</td>
            ${(categorias || []).map((c) => `<td>${esc(row.valores?.[c.NombreCatAlojUnidad] ?? '—')}</td>`).join('')}
        </tr>
    `).join('');
}

function buildFichaDom(data) {
    const t = window.txt?.alojamientos || {};
    const tm = window.txt?.misalojamientos || {};
    const suj = data.sujeto || {};
    const ult = data.ultimoTramo;
    const tramos = Array.isArray(data.tramos) ? data.tramos : [];
    const cats = data.categorias || [];

    const bioSujetoCabecera = htmlDatosSujetoTramo(suj, t);
    const fechaNac = data.fechaNacimientoSugerida
        ? `<p><strong>${esc(t.animal_ficha_fecha_nac_hint || '')}</strong> ${esc(data.fechaNacimientoSugerida)}</p>`
        : '';

    const prot0 = tramos.length ? tramos[0] : null;
    const protLine = prot0 && (prot0.protocolo_titulo || prot0.protocolo_codigo)
        ? `<p class="mb-1"><strong>${esc(t.animal_ficha_protocolo || 'Protocolo')}</strong> ${esc(prot0.protocolo_titulo || '')}${prot0.protocolo_codigo ? ` (${esc(prot0.protocolo_codigo)})` : ''}</p>`
        : '';

    const ultimoBlock = ult ? `
        <div class="border rounded p-3 mb-3 bg-light">
            <h6 class="fw-bold text-primary mb-2">${esc(t.animal_ficha_ultimo_aloj || 'Último alojamiento')}</h6>
            <p class="mb-1 small"><strong>${esc(t.animal_ficha_tramo || 'Tramo')}</strong> #${ult.IdAlojamiento} · ${esc(ult.NombreTipoAlojamiento || '')}</p>
            <p class="mb-1 small">${esc(tm.desde || 'Desde')}: ${esc(ult.fechavisado || '')} · ${esc(tm.hasta || 'Hasta')}: ${esc(ult.hastafecha || '—')}</p>
            <p class="mb-1 small"><strong>${esc(t.animal_ficha_caja || 'Caja')}</strong>: ${esc(ult.NombreCaja || '')}</p>
            <p class="mb-1 small"><strong>${esc(t.animal_ficha_ubicacion || 'Ubicación')}</strong>: ${esc(ult.ubicacionResumen || '—')}</p>
            ${htmlDatosSujetoTramo(ult, t)}
            ${ult.aloj_obs ? `<p class="mb-0 small"><strong>${esc(t.animal_ficha_obs_aloj || '')}</strong> ${esc(ult.aloj_obs)}</p>` : ''}
        </div>
    ` : '';

    const tramosHtml = tramos.map((tr, idx) => `
        <div class="mb-4 ${idx > 0 ? 'border-top pt-3' : ''}">
            <h6 class="fw-bold">${esc(t.animal_ficha_tramo || 'Tramo')} #${tr.IdAlojamiento} — ${esc(tr.NombreTipoAlojamiento || '')}</h6>
            <p class="small text-muted mb-2">${esc(tr.fechavisado || '')} → ${esc(tr.hastafecha || '—')} · ${esc(tr.NombreCaja || '')} · ${esc(tr.ubicacionResumen || '')}</p>
            ${htmlDatosSujetoTramo(tr, t)}
            ${tr.aloj_obs ? `<p class="small mb-2"><em>${esc(tr.aloj_obs)}</em></p>` : ''}
            <div class="table-responsive">
                <table class="table table-sm table-bordered" style="font-size:11px">
                    <thead class="table-light">
                        <tr><th>${esc(t.trace_fecha || 'Fecha')}</th>${cats.map((c) => `<th>${esc(c.NombreCatAlojUnidad)}</th>`).join('')}</tr>
                    </thead>
                    <tbody>${renderPivotRows(tr.observaciones_pivot, cats)}</tbody>
                </table>
            </div>
        </div>
    `).join('');

    const wrap = document.createElement('div');
    wrap.className = 'animal-ficha-pdf-root';
    wrap.innerHTML = `
        <div class="p-3" style="font-family: Lato, Arial, sans-serif; font-size: 12px;">
            <div class="mb-3 border-bottom pb-2">
                <h4 class="fw-black m-0">${esc(t.animal_ficha_title || 'Ficha del animal')}</h4>
                <div class="small text-muted">${esc(data.NombreInstitucion || '')}</div>
            </div>
            <div class="row mb-3">
                <div class="col-md-6">
                    <p class="mb-1"><strong>${esc(t.animal_ficha_nombre || 'Nombre')}</strong> ${esc(suj.NombreEspecieAloj)}</p>
                    <p class="mb-1"><strong>${esc(t.animal_ficha_id_sujeto || 'ID sujeto')}</strong> ${esc(String(suj.IdUnidadAlojamiento))}</p>
                    <p class="mb-1"><strong>${esc(t.animal_ficha_especie || 'Especie')}</strong> ${esc(data.NombreEspecie || '—')}</p>
                    ${suj.DetalleEspecieAloj ? `<p class="mb-1"><strong>${esc(t.animal_ficha_detalle || '')}</strong> ${esc(suj.DetalleEspecieAloj)}</p>` : ''}
                    ${bioSujetoCabecera}
                </div>
                <div class="col-md-6">
                    <p class="mb-1"><strong>${esc(t.animal_ficha_historia || 'Historia')}</strong> #${esc(String(data.historia))}</p>
                    ${protLine}
                    <p class="mb-1"><strong>${esc(t.animal_ficha_fecha_inicio || 'Inicio del seguimiento')}</strong> ${esc(data.fechaInicioSeguimiento || '—')}</p>
                    ${fechaNac}
                </div>
            </div>
            <p class="small text-muted mb-2">${esc(t.animal_ficha_ideas_hint || '')}</p>
            ${ultimoBlock}
            <div style="page-break-before: always;"></div>
            <h5 class="fw-bold border-bottom pb-2 mb-3">${esc(t.animal_ficha_trazabilidad || 'Trazabilidad completa')}</h5>
            ${tramosHtml || `<p class="text-muted">${esc(t.animal_ficha_sin_tramos || '—')}</p>`}
            <div class="mt-4 pt-2 border-top small text-muted">${esc(t.animal_ficha_pdf_footer || '')}</div>
        </div>
    `;
    return wrap;
}

/** Clona el bloque interior (.p-3) de una ficha individual para incrustar en PDF agregado. */
function cloneFichaInnerBlock(dom) {
    const p = dom.querySelector('.p-3');
    return p ? p.cloneNode(true) : dom.cloneNode(true);
}

function countAggregateSubjects(data) {
    if (data.scope === 'caja') return (data.fichasSujetos || []).length;
    if (data.scope === 'alojamiento') {
        return (data.grupos || []).reduce((n, g) => n + (g.fichasSujetos || []).length, 0);
    }
    return 0;
}

/** Ficha PDF/modal: varios sujetos (alcance caja o tramo completo). */
function buildFichaDomAggregate(data) {
    const t = window.txt?.alojamientos || {};
    const wrap = document.createElement('div');
    wrap.className = 'animal-ficha-pdf-root';
    const shell = document.createElement('div');
    shell.className = 'p-3';
    shell.style.fontFamily = 'Lato, Arial, sans-serif';
    shell.style.fontSize = '12px';

    if (data.scope === 'caja') {
        const head = document.createElement('div');
        head.className = 'mb-3 border-bottom pb-2';
        head.innerHTML = `<h4 class="fw-black m-0">${esc(t.animal_ficha_scope_caja || '')}</h4>
            <div class="small text-muted">${esc(data.NombreInstitucion || '')}</div>
            <p class="mb-0 mt-2 small"><strong>${esc(t.animal_ficha_caja || '')}</strong> ${esc(data.NombreCaja || '')}
            · <strong>${esc(t.animal_ficha_historia || '')}</strong> #${esc(String(data.historia))}
            · <strong>${esc(t.animal_ficha_tramo || '')}</strong> #${esc(String(data.IdAlojamiento))}
            · <strong>${esc(t.animal_ficha_especie || '')}</strong> ${esc(data.NombreEspecie || '')}</p>`;
        shell.appendChild(head);
        const list = data.fichasSujetos || [];
        if (!list.length) {
            const pEl = document.createElement('p');
            pEl.className = 'text-muted';
            pEl.textContent = t.animal_ficha_empty_caja || '';
            shell.appendChild(pEl);
        } else {
            list.forEach((fd, i) => {
                const block = document.createElement('div');
                block.className = i > 0 ? 'mt-4 pt-3' : 'mt-3';
                if (i > 0) block.style.pageBreakBefore = 'always';
                block.appendChild(cloneFichaInnerBlock(buildFichaDom(fd)));
                shell.appendChild(block);
            });
        }
    } else if (data.scope === 'alojamiento') {
        const head = document.createElement('div');
        head.className = 'mb-3 border-bottom pb-2';
        head.innerHTML = `<h4 class="fw-black m-0">${esc(t.animal_ficha_scope_alojamiento || '')}</h4>
            <div class="small text-muted">${esc(data.NombreInstitucion || '')}</div>
            <p class="mb-0 mt-2 small"><strong>${esc(t.animal_ficha_tramo || '')}</strong> #${esc(String(data.IdAlojamiento))}
            · <strong>${esc(t.animal_ficha_historia || '')}</strong> #${esc(String(data.historia))}
            · <strong>${esc(t.animal_ficha_especie || '')}</strong> ${esc(data.NombreEspecie || '')}</p>`;
        shell.appendChild(head);
        const grupos = data.grupos || [];
        if (!countAggregateSubjects(data)) {
            const pEl = document.createElement('p');
            pEl.className = 'text-muted';
            pEl.textContent = t.animal_ficha_empty_aloj || '';
            shell.appendChild(pEl);
        } else {
            grupos.forEach((g, gi) => {
                const gh = document.createElement('div');
                gh.className = gi === 0 ? 'mt-3 mb-2' : 'mt-4 mb-2 pt-3 border-top';
                if (gi > 0) gh.style.pageBreakBefore = 'always';
                gh.innerHTML = `<h5 class="fw-bold text-primary border-bottom pb-1 mb-2"><i class="bi bi-box-seam me-1"></i>${esc(t.animal_ficha_caja || '')}: ${esc(g.NombreCaja || '')}</h5>`;
                shell.appendChild(gh);
                const sujetos = g.fichasSujetos || [];
                if (!sujetos.length) {
                    const emp = document.createElement('p');
                    emp.className = 'small text-muted mb-3';
                    emp.textContent = t.animal_ficha_caja_sin_sujetos || '';
                    shell.appendChild(emp);
                    return;
                }
                sujetos.forEach((fd, j) => {
                    const block = document.createElement('div');
                    block.className = j > 0 ? 'mt-4 pt-3' : '';
                    if (j > 0) block.style.pageBreakBefore = 'always';
                    block.appendChild(cloneFichaInnerBlock(buildFichaDom(fd)));
                    shell.appendChild(block);
                });
            });
        }
    } else {
        shell.innerHTML = `<p class="text-muted">${esc(t.animal_ficha_error || '')}</p>`;
    }

    wrap.appendChild(shell);
    return wrap;
}

async function fetchFicha(idEspecieAlojUnidad) {
    return API.request(`/trazabilidad/ficha-animal?idEspecieAlojUnidad=${encodeURIComponent(String(idEspecieAlojUnidad))}`, 'GET');
}

async function fetchFichaCaja(idCajaAlojamiento) {
    return API.request(`/trazabilidad/ficha-animal?idCajaAlojamiento=${encodeURIComponent(String(idCajaAlojamiento))}`, 'GET');
}

async function fetchFichaAlojamiento(idAlojamiento) {
    return API.request(`/trazabilidad/ficha-animal?idAlojamiento=${encodeURIComponent(String(idAlojamiento))}`, 'GET');
}

export const AnimalFichaUI = {
    async open(idEspecieAlojUnidad) {
        const t = window.txt?.alojamientos || {};
        const tm = window.txt?.misalojamientos || {};
        const Swal = window.Swal;
        if (typeof Swal === 'undefined') {
            window.alert(t.animal_ficha_error || 'Error');
            return;
        }
        Swal.fire({
            title: t.animal_ficha_loading || '...',
            didOpen: () => Swal.showLoading(),
            allowOutsideClick: false,
            target: document.getElementById('modal-historial') || document.body,
        });
        try {
            const res = await fetchFicha(idEspecieAlojUnidad);
            Swal.close();
            if (res.status !== 'success' || !res.data) {
                throw new Error(res.message || t.animal_ficha_error || '');
            }
            const dom = buildFichaDom(res.data);
            const html = dom.outerHTML;
            const idAloj = parseInt(res.data.IdAlojamientoFicha, 10) || 0;
            const idEsp = parseInt(res.data.IdEspecieFicha, 10) || 0;
            const traceUi = window.TrazabilidadUI;
            const canModificar = typeof traceUi?.editSubjectFicha === 'function'
                && !traceUi?.isReadOnly
                && idAloj > 0
                && idEsp > 0;

            const result = await Swal.fire({
                title: '',
                html,
                width: 'min(920px, 96vw)',
                showConfirmButton: true,
                confirmButtonText: tm.cerrar || window.txt?.comunicacion?.modal_cerrar || 'Cerrar',
                showDenyButton: true,
                denyButtonText: t.animal_ficha_pdf || 'PDF',
                showCancelButton: canModificar,
                cancelButtonText: t.animal_ficha_modal_modificar || t.trace_edit_subject_ficha || '',
                reverseButtons: true,
                focusConfirm: false,
                customClass: { htmlContainer: 'text-start' },
                target: document.getElementById('modal-historial') || document.body,
            });

            const Dr = window.Swal?.DismissReason;
            const fueCancel = result.dismiss === (Dr?.cancel ?? 'cancel');
            if (result.isDenied) {
                await AnimalFichaUI.downloadPdf(idEspecieAlojUnidad);
            } else if (canModificar && fueCancel) {
                await traceUi.editSubjectFicha(idEspecieAlojUnidad, idAloj, idEsp);
            }
        } catch (e) {
            Swal.close();
            Swal.fire({ icon: 'error', text: String(e.message || e), target: document.getElementById('modal-historial') || document.body });
        }
    },

    async openCaja(idCajaAlojamiento) {
        const t = window.txt?.alojamientos || {};
        const tm = window.txt?.misalojamientos || {};
        const Swal = window.Swal;
        if (typeof Swal === 'undefined') {
            window.alert(t.animal_ficha_error || 'Error');
            return;
        }
        Swal.fire({
            title: t.animal_ficha_loading || '...',
            didOpen: () => Swal.showLoading(),
            allowOutsideClick: false,
            target: document.getElementById('modal-historial') || document.body,
        });
        try {
            const res = await fetchFichaCaja(idCajaAlojamiento);
            Swal.close();
            if (res.status !== 'success' || !res.data) {
                throw new Error(res.message || t.animal_ficha_error || '');
            }
            const dom = buildFichaDomAggregate(res.data);
            const html = dom.outerHTML;
            const result = await Swal.fire({
                title: '',
                html,
                width: 'min(920px, 96vw)',
                showConfirmButton: true,
                confirmButtonText: tm.cerrar || window.txt?.comunicacion?.modal_cerrar || 'Cerrar',
                showDenyButton: true,
                denyButtonText: t.animal_ficha_pdf || 'PDF',
                showCancelButton: false,
                reverseButtons: true,
                focusConfirm: false,
                customClass: { htmlContainer: 'text-start' },
                target: document.getElementById('modal-historial') || document.body,
            });
            if (result.isDenied) {
                await AnimalFichaUI.downloadPdfCaja(idCajaAlojamiento);
            }
        } catch (e) {
            Swal.close();
            Swal.fire({ icon: 'error', text: String(e.message || e), target: document.getElementById('modal-historial') || document.body });
        }
    },

    async openAlojamiento(idAlojamiento) {
        const t = window.txt?.alojamientos || {};
        const tm = window.txt?.misalojamientos || {};
        const Swal = window.Swal;
        if (typeof Swal === 'undefined') {
            window.alert(t.animal_ficha_error || 'Error');
            return;
        }
        Swal.fire({
            title: t.animal_ficha_loading || '...',
            didOpen: () => Swal.showLoading(),
            allowOutsideClick: false,
            target: document.getElementById('modal-historial') || document.body,
        });
        try {
            const res = await fetchFichaAlojamiento(idAlojamiento);
            Swal.close();
            if (res.status !== 'success' || !res.data) {
                throw new Error(res.message || t.animal_ficha_error || '');
            }
            const dom = buildFichaDomAggregate(res.data);
            const html = dom.outerHTML;
            const result = await Swal.fire({
                title: '',
                html,
                width: 'min(920px, 96vw)',
                showConfirmButton: true,
                confirmButtonText: tm.cerrar || window.txt?.comunicacion?.modal_cerrar || 'Cerrar',
                showDenyButton: true,
                denyButtonText: t.animal_ficha_pdf || 'PDF',
                showCancelButton: false,
                reverseButtons: true,
                focusConfirm: false,
                customClass: { htmlContainer: 'text-start' },
                target: document.getElementById('modal-historial') || document.body,
            });
            if (result.isDenied) {
                await AnimalFichaUI.downloadPdfAlojamiento(idAlojamiento);
            }
        } catch (e) {
            Swal.close();
            Swal.fire({ icon: 'error', text: String(e.message || e), target: document.getElementById('modal-historial') || document.body });
        }
    },

    async downloadPdf(idEspecieAlojUnidad) {
        const t = window.txt?.alojamientos || {};
        const Swal = window.Swal;
        try {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ title: t.animal_ficha_generando_pdf || '...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
            }
            const res = await fetchFicha(idEspecieAlojUnidad);
            if (res.status !== 'success' || !res.data) {
                throw new Error(res.message || t.animal_ficha_error || '');
            }
            await ensureHtml2pdf();
            const dom = buildFichaDom(res.data);
            dom.style.position = 'fixed';
            dom.style.left = '-9999px';
            document.body.appendChild(dom);
            const opt = {
                margin: 10,
                filename: `ficha-animal-${idEspecieAlojUnidad}.pdf`,
                image: { type: 'jpeg', quality: 0.95 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            };
            await window.html2pdf().set(opt).from(dom).save();
            dom.remove();
            if (typeof Swal !== 'undefined') Swal.close();
        } catch (e) {
            if (typeof Swal !== 'undefined') Swal.close();
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', text: String(e.message || e) });
            } else {
                window.alert(String(e.message || e));
            }
        }
    },

    async downloadPdfCaja(idCajaAlojamiento) {
        const t = window.txt?.alojamientos || {};
        const Swal = window.Swal;
        try {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ title: t.animal_ficha_generando_pdf || '...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
            }
            const res = await fetchFichaCaja(idCajaAlojamiento);
            if (res.status !== 'success' || !res.data) {
                throw new Error(res.message || t.animal_ficha_error || '');
            }
            await ensureHtml2pdf();
            const dom = buildFichaDomAggregate(res.data);
            dom.style.position = 'fixed';
            dom.style.left = '-9999px';
            document.body.appendChild(dom);
            const opt = {
                margin: 10,
                filename: `ficha-caja-${idCajaAlojamiento}.pdf`,
                image: { type: 'jpeg', quality: 0.95 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            };
            await window.html2pdf().set(opt).from(dom).save();
            dom.remove();
            if (typeof Swal !== 'undefined') Swal.close();
        } catch (e) {
            if (typeof Swal !== 'undefined') Swal.close();
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', text: String(e.message || e) });
            } else {
                window.alert(String(e.message || e));
            }
        }
    },

    async downloadPdfAlojamiento(idAlojamiento) {
        const t = window.txt?.alojamientos || {};
        const Swal = window.Swal;
        try {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ title: t.animal_ficha_generando_pdf || '...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
            }
            const res = await fetchFichaAlojamiento(idAlojamiento);
            if (res.status !== 'success' || !res.data) {
                throw new Error(res.message || t.animal_ficha_error || '');
            }
            await ensureHtml2pdf();
            const dom = buildFichaDomAggregate(res.data);
            dom.style.position = 'fixed';
            dom.style.left = '-9999px';
            document.body.appendChild(dom);
            const opt = {
                margin: 10,
                filename: `ficha-alojamiento-${idAlojamiento}.pdf`,
                image: { type: 'jpeg', quality: 0.95 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            };
            await window.html2pdf().set(opt).from(dom).save();
            dom.remove();
            if (typeof Swal !== 'undefined') Swal.close();
        } catch (e) {
            if (typeof Swal !== 'undefined') Swal.close();
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', text: String(e.message || e) });
            } else {
                window.alert(String(e.message || e));
            }
        }
    },
};

export default AnimalFichaUI;
