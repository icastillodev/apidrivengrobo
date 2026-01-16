import { API } from '../api.js';

export const PreciosService = {
    /**
     * Genera y descarga el PDF del tarifario oficial desde cualquier lugar.
     */
    async downloadUniversalPDF() {
        const instId = localStorage.getItem('instId');
        const instNombre = (localStorage.getItem('NombreInst') || 'URBE').toUpperCase();
        const fechaActual = new Date().toLocaleDateString();

        try {
            // 1. Obtener datos frescos de la API
            const res = await API.request(`/precios/all-data?inst=${instId}`);
            if (!res || res.status !== 'success') throw new Error("No se pudo obtener el tarifario");

            const data = res.data;

            // 2. Procesar Filas de Animales (Jerárquico)
            let animalRows = '';
            data.especies.forEach(e => {
                const pAni = parseFloat(e.Panimal) || 0;
                const pChi = parseFloat(e.PalojamientoChica) || 0;
                const pGra = parseFloat(e.PalojamientoGrande) || 0;

                // Solo mostramos si tiene algún precio base
                if (pAni > 0 || pChi > 0 || pGra > 0) {
                    animalRows += `
                        <tr style="background-color: #f2f2f2; font-weight: bold;">
                            <td style="padding: 8px; border: 1px solid #ddd;">${e.EspeNombreA}</td>
                            <td style="text-align: center; border: 1px solid #ddd;">${pAni > 0 ? '$ ' + pAni : '---'}</td>
                            <td style="text-align: center; border: 1px solid #ddd;">${pChi > 0 ? '$ ' + pChi : '---'}</td>
                            <td style="text-align: center; border: 1px solid #ddd;">${pGra > 0 ? '$ ' + pGra : '---'}</td>
                        </tr>`;

                    // Subespecies vinculadas
                    const subs = data.subespecies.filter(s => 
                        String(s.idespA) === String(e.idespA) && 
                        parseFloat(s.Psubanimal) > 0 && 
                        String(s.Existe) !== "2"
                    );
                    
                    subs.forEach(s => {
                        animalRows += `
                            <tr>
                                <td style="padding: 6px 6px 6px 30px; border: 1px solid #ddd; font-size: 11px; color: #555;">└ ${s.SubEspeNombreA}</td>
                                <td style="text-align: center; border: 1px solid #ddd; font-size: 11px;">$ ${s.Psubanimal}</td>
                                <td colspan="2" style="border: 1px solid #ddd; background: #fafafa;"></td>
                            </tr>`;
                    });
                }
            });

            // 3. Procesar Insumos
            const renderInsumoRow = (lista) => lista.filter(i => parseFloat(i.PrecioInsumo) > 0).map(i => `
                <tr>
                    <td style="padding: 6px; border: 1px solid #ddd;">${i.NombreInsumo}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${i.CantidadInsumo || 0} ${i.TipoInsumo || ''}</td>
                    <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-weight: bold;">$ ${i.PrecioInsumo}</td>
                </tr>`).join('');

            // 4. Template del PDF con márgenes y cabeceras solicitadas
            const template = `
                <div style="font-family: Arial, sans-serif; padding: 30px; color: #333;">
                    <div style="text-align: center; border-bottom: 3px solid #1a5d3b; padding-bottom: 10px; margin-bottom: 20px;">
                        <h2 style="color: #1a5d3b; margin: 0;">GROBO - ${instNombre}</h2>
                        <h4 style="margin: 5px 0; color: #444;">TARIFARIO OFICIAL VIGENTE</h4>
                        <p style="font-size: 11px; color: #888;">Emisión: ${fechaActual}</p>
                    </div>

                    <div style="margin-bottom: 10px; font-weight: bold; color: #1a5d3b; text-transform: uppercase; font-size: 14px;">
                        ALOJAMIENTO: CAJA CHICA Y CAJA GRANDE
                    </div>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px;">
                        <thead>
                            <tr style="background: #1a5d3b; color: white;">
                                <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">ESPECIE / VARIEDAD</th>
                                <th>PRECIO ANIMAL</th><th>CAJA CHICA</th><th>CAJA GRANDE</th>
                            </tr>
                        </thead>
                        <tbody>${animalRows}</tbody>
                    </table>

                    <div style="display: flex; gap: 20px; margin-bottom: 30px;">
                        <div style="flex: 1;">
                            <h4 style="color: #0d6efd; border-bottom: 1px solid #eee; font-size: 13px;">INSUMOS EXPERIMENTALES</h4>
                            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                                <tr style="background: #f8f9fa;"><th>Insumo</th><th>Cant/Tipo</th><th>Precio</th></tr>
                                ${renderInsumoRow(data.insumosExp)}
                            </table>
                        </div>
                        <div style="flex: 1;">
                            <h4 style="color: #6c757d; border-bottom: 1px solid #eee; font-size: 13px;">INSUMOS COMUNES</h4>
                            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                                <tr style="background: #f8f9fa;"><th>Insumo</th><th>Cant/Tipo</th><th>Precio</th></tr>
                                ${renderInsumoRow(data.insumos)}
                            </table>
                        </div>
                    </div>

                    <div style="padding: 15px; background: #fff4f4; border: 1px solid #f5c2c2; border-radius: 4px;">
                        <span style="font-size: 14px; font-weight: bold;">JORNAL DE TRABAJO EXPERIMENTAL:</span>
                        <span style="float: right; color: #d9534f; font-weight: bold; font-size: 16px;">
                            $ ${data.institucion.PrecioJornadaTrabajoExp || 0}
                        </span>
                    </div>
                </div>`;

            // 5. Generar PDF
            const opt = {
                margin: 0,
                filename: `Tarifario_${instNombre}_${fechaActual.replace(/\//g, '-')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(template).save();

        } catch (error) {
            console.error("Error al generar PDF universal:", error);
        }
    }
};

// Hacerlo disponible globalmente para botones simples
window.downloadTarifarioGeneral = PreciosService.downloadUniversalPDF;