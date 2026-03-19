/**
 * Tarifarios en modales de derivación (destino): PDF de precios de mi institución y de la institución origen.
 */
export async function openTarifarioDerivacionPdf(instId) {
    const id = (instId != null && String(instId).trim() !== '')
        ? String(instId).trim()
        : '';
    if (!id) {
        if (window.Swal) {
            window.Swal.fire(
                window.txt?.generales?.swal_atencion || 'Atención',
                window.txt?.misformularios?.derivacion_tarifario_sin_inst || 'No se pudo determinar la institución.',
                'info'
            );
        }
        return;
    }
    try {
        const { PreciosService } = await import('../services/PreciosService.js');
        await PreciosService.downloadUniversalPDF(id);
    } catch (e) {
        console.error(e);
        if (window.Swal) {
            window.Swal.fire(window.txt?.generales?.error || 'Error', String(e?.message || e), 'error');
        }
    }
}

/**
 * @param {object} record Fila con DerivadoActivo, IdFormularioDerivacionActiva, IdInstitucionOrigen
 * @returns {string} HTML vacío si no aplica (no es destino en derivación activa)
 */
export function renderDerivacionTarifariosToolbar(record) {
    const tx = window.txt?.misformularios || {};
    const currentInst = Number(localStorage.getItem('instId') || sessionStorage.getItem('instId') || 0);
    const origId = Number(record?.IdInstitucionOrigen || 0);
    const isDerivedActive = Number(record?.DerivadoActivo || 0) === 1 && Number(record?.IdFormularioDerivacionActiva || 0) > 0;
    const isOriginInst = origId > 0 && origId === currentInst;
    if (!isDerivedActive || isOriginInst || !origId || !currentInst) return '';

    const lblTitle = tx.derivacion_tarifarios_titulo || 'Tarifarios';
    const lblLocal = tx.derivacion_tarifario_mi_inst || 'Lista de precios — mi institución (PDF)';
    const lblOrigen = tx.derivacion_tarifario_inst_origen || 'Lista de precios — institución que derivó (PDF)';

    return `
    <div class="alert alert-light border shadow-sm mb-3 py-2 px-3 small">
        <div class="fw-bold text-dark mb-2"><i class="bi bi-currency-dollar me-1"></i>${lblTitle}</div>
        <div class="d-flex flex-wrap gap-2">
            <button type="button" class="btn btn-sm btn-outline-success" onclick="window.openTarifarioDerivacionPdf(${currentInst})">
                <i class="bi bi-file-earmark-pdf me-1"></i>${lblLocal}
            </button>
            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="window.openTarifarioDerivacionPdf(${origId})">
                <i class="bi bi-file-earmark-pdf me-1"></i>${lblOrigen}
            </button>
        </div>
    </div>`;
}

if (typeof window !== 'undefined') {
    window.openTarifarioDerivacionPdf = openTarifarioDerivacionPdf;
}
