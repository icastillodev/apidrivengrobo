import { API } from '../api.js';
import { getPdfLogoHeaderHtml } from '../utils/pdfLogoHeader.js';

/**
 * Servicio del tarifario oficial.
 * Nota: En red, el tarifario mostrado al hacer un formulario depende de la institución elegida al seleccionar el formulario; una vez elegido, el resto del flujo usa la institución actual.
 */

/** Carga html2pdf si no está definido (p. ej. en dashboard sin script previo). */
function ensureHtml2Pdf() {
    if (typeof window.html2pdf === 'function') return Promise.resolve();
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('No se pudo cargar html2pdf'));
        document.head.appendChild(s);
    });
}

export const PreciosService = {
    /**
     * Genera y descarga el PDF del tarifario oficial desde cualquier lugar.
     */
    async downloadUniversalPDF() {
        const instId = sessionStorage.getItem('target_inst_secreto') || localStorage.getItem('instId');
        const fechaActual = new Date().toLocaleDateString();

        try {
            await ensureHtml2Pdf();

            // 1. Obtener datos frescos de la API (cache-bust para evitar PDF viejo)
            const res = await API.request(`/precios/all-data?inst=${instId}&_=${Date.now()}`);
            if (!res || res.status !== 'success') throw new Error("No se pudo obtener el tarifario");

            const data = res.data;
            const instNombreRaw = data?.institucion?.NombreInst || localStorage.getItem('NombreInst') || 'URBE';
            const instNombre = String(instNombreRaw).toUpperCase();
            const fileSafeInst = String(instNombreRaw)
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^\w\s-]/g, '')
                .trim()
                .replace(/\s+/g, '_')
                .replace(/_+/g, '_')
                .toUpperCase() || 'URBE';
            const fechaFile = new Date().toISOString().slice(0, 10);

            // 2. Procesar Filas de Animales (Jerárquico) - texto siempre oscuro para PDF (dark mode)
            let animalRows = '';
            data.especies.forEach(e => {
                const pAni = parseFloat(e.Panimal) || 0;
                const pChi = parseFloat(e.PalojamientoChica) || 0;
                const pGra = parseFloat(e.PalojamientoGrande) || 0;

                if (pAni > 0 || pChi > 0 || pGra > 0) {
                    animalRows += `
                        <tr style="background-color: #f2f2f2; font-weight: bold;">
                            <td style="padding: 8px; border: 1px solid #ddd; color: #000;">${e.EspeNombreA}</td>
                            <td style="text-align: center; border: 1px solid #ddd; color: #000;">${pAni > 0 ? '$ ' + pAni : '---'}</td>
                            <td style="text-align: center; border: 1px solid #ddd; color: #000;">${pChi > 0 ? '$ ' + pChi : '---'}</td>
                            <td style="text-align: center; border: 1px solid #ddd; color: #000;">${pGra > 0 ? '$ ' + pGra : '---'}</td>
                        </tr>`;

                    const subs = data.subespecies.filter(s =>
                        String(s.idespA) === String(e.idespA) &&
                        parseFloat(s.Psubanimal) > 0 &&
                        String(s.Existe) !== "2"
                    );
                    subs.forEach(s => {
                        animalRows += `
                            <tr>
                                <td style="padding: 6px 6px 6px 30px; border: 1px solid #ddd; font-size: 11px; color: #000;">└ ${s.SubEspeNombreA}</td>
                                <td style="text-align: center; border: 1px solid #ddd; font-size: 11px; color: #000;">$ ${s.Psubanimal}</td>
                                <td colspan="2" style="border: 1px solid #ddd; background: #fafafa; color: #000;"></td>
                            </tr>`;
                    });
                }
            });

            // 3. Procesar Insumos - texto oscuro para PDF
            const renderInsumoRow = (lista) => (lista || []).filter(i => parseFloat(i.PrecioInsumo) > 0).map(i => `
                <tr>
                    <td style="padding: 6px; border: 1px solid #ddd; color: #000;">${i.NombreInsumo}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; text-align: center; color: #000;">${i.CantidadInsumo || 0} ${i.TipoInsumo || ''}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #000;">$ ${i.PrecioInsumo}</td>
                </tr>`).join('');

            const renderServiciosRow = () => {
                const list = Array.isArray(data.servicios) ? data.servicios : [];
                if (list.length === 0) {
                    return `<tr><td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align:center; color:#000;">Sin servicios institucionales configurados.</td></tr>`;
                }
                return list.map(s => {
                    const cant = (s.CantidadPorMedidaInst == null || s.CantidadPorMedidaInst === '') ? 1 : s.CantidadPorMedidaInst;
                    const med = (s.MedidaServicioInst && String(s.MedidaServicioInst).trim()) ? s.MedidaServicioInst : 'U';
                    const precio = (s.Precio == null || s.Precio === '') ? 0 : s.Precio;
                    return `
                        <tr>
                            <td style="padding: 6px; border: 1px solid #ddd; color: #000;">${s.NombreServicioInst || ''}</td>
                            <td style="padding: 6px; border: 1px solid #ddd; text-align: center; color: #000;">${cant} ${med}</td>
                            <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #000;">$ ${precio}</td>
                        </tr>`;
                }).join('');
            };

            const logoHeader = getPdfLogoHeaderHtml(data.institucion?.LogoEnPdf, data.institucion?.Logo || '');

            // 4. Template del PDF: fondo blanco y TODO el texto color oscuro para que se vea bien en dark mode
            const template = `
                <div style="font-family: Arial, sans-serif; padding: 26px; color: #000; background: #fff;">
                    ${logoHeader}
                    <div class="pdf-section avoid-break" style="text-align: center; border-bottom: 3px solid #1a5d3b; padding-bottom: 10px; margin-bottom: 20px;">
                        <h2 style="color: #1a5d3b; margin: 0;">GROBO - ${instNombre}</h2>
                        <h4 style="margin: 5px 0; color: #000;">TARIFARIO OFICIAL VIGENTE</h4>
                        <p style="font-size: 11px; color: #000;">Emisión: ${fechaActual}</p>
                    </div>

                    <div class="pdf-section avoid-break" style="margin-bottom: 10px; font-weight: bold; color: #1a5d3b; text-transform: uppercase; font-size: 14px;">
                        ALOJAMIENTO: CAJA CHICA Y CAJA GRANDE
                    </div>

                    <table class="avoid-break" style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px;">
                        <thead>
                            <tr style="background: #1a5d3b; color: #fff;">
                                <th style="padding: 10px; border: 1px solid #ddd; text-align: left; color: #fff;">ESPECIE / VARIEDAD</th>
                                <th style="color: #fff;">PRECIO ANIMAL</th><th style="color: #fff;">CAJA CHICA</th><th style="color: #fff;">CAJA GRANDE</th>
                            </tr>
                        </thead>
                        <tbody>${animalRows}</tbody>
                    </table>

                    <div class="pdf-section avoid-break" style="display: flex; gap: 20px; margin-bottom: 30px;">
                        <div class="avoid-break" style="flex: 1;">
                            <h4 style="color: #000; border-bottom: 1px solid #eee; font-size: 13px;">INSUMOS EXPERIMENTALES</h4>
                            <table class="avoid-break" style="width: 100%; border-collapse: collapse; font-size: 10px;">
                                <tr style="background: #f8f9fa;"><th style="color: #000;">Insumo</th><th style="color: #000;">Cant/Tipo</th><th style="color: #000;">Precio</th></tr>
                                ${renderInsumoRow(data.insumosExp)}
                            </table>
                        </div>
                        <div class="avoid-break" style="flex: 1;">
                            <h4 style="color: #000; border-bottom: 1px solid #eee; font-size: 13px;">INSUMOS COMUNES</h4>
                            <table class="avoid-break" style="width: 100%; border-collapse: collapse; font-size: 10px;">
                                <tr style="background: #f8f9fa;"><th style="color: #000;">Insumo</th><th style="color: #000;">Cant/Tipo</th><th style="color: #000;">Precio</th></tr>
                                ${renderInsumoRow(data.insumos)}
                            </table>
                        </div>
                    </div>

                    <div class="pdf-section avoid-break" style="padding: 15px; background: #f0f2f5; border: 1px solid #dee2e6; border-radius: 4px;">
                        <span style="font-size: 14px; font-weight: bold; color: #000;">JORNAL DE TRABAJO EXPERIMENTAL:</span>
                        <span style="float: right; color: #000; font-weight: bold; font-size: 16px;">
                            $ ${data.institucion.PrecioJornadaTrabajoExp || 0}
                        </span>
                    </div>

                    <div class="pdf-section avoid-break" style="margin-top: 25px;">
                        <h4 style="color: #000; border-bottom: 1px solid #eee; font-size: 13px;">SERVICIOS INSTITUCIONALES</h4>
                        <table class="avoid-break" style="width: 100%; border-collapse: collapse; font-size: 10px;">
                            <tr style="background: #f8f9fa;"><th style="color: #000;">Servicio</th><th style="color: #000;">Medida</th><th style="color: #000;">Precio</th></tr>
                            ${renderServiciosRow()}
                        </table>
                    </div>
                </div>`;

            // 5. Generar PDF (filename con timestamp para evitar cache del navegador)
            const opt = {
                margin: [16, 12, 16, 12],
                filename: `Tarifario_${fileSafeInst}_${fechaFile}_${Date.now()}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, logging: false, backgroundColor: '#ffffff', useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'legacy', 'avoid-all'], avoid: ['.avoid-break', 'table', 'tr'] }
            };

            window.html2pdf().set(opt).from(template).save();

        } catch (error) {
            console.error("Error al generar PDF universal:", error);
        }
    }
};

// Hacerlo disponible globalmente para botones simples
window.downloadTarifarioGeneral = PreciosService.downloadUniversalPDF;