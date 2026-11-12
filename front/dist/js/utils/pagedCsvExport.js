/**
 * GROBO — Exportación CSV paginada para bandejas administrativas.
 * Consumir páginas autenticadas conserva filtros y aislamiento aplicados por la API.
 */
export function safeCsvCell(value) {
    let v = String(value ?? '').replace(/\u0000/g, '').replace(/[\r\n]+/g, ' ');
    // Excel puede ejecutar fórmulas incluso en celdas entrecomilladas.
    if (/^\s*[=+\-@]/.test(v)) v = "'" + v;
    return '"' + v.replace(/"/g, '""') + '"';
}

/**
 * No descarga el archivo si una página falla, cambia el total o faltan filas.
 * onBatch recibe sólo una página a la vez; no conserva todas las respuestas JSON.
 */
export async function eachPagedExportBatch({ requestPage, onBatch, pageSize = 500 }) {
    if (typeof requestPage !== 'function' || typeof onBatch !== 'function') {
        throw new TypeError('Faltan callbacks de exportación');
    }
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 10000) {
        throw new RangeError('Tamaño de página inválido');
    }

    let total = null;
    let offset = 0;
    const seenIds = new Set();
    while (total === null || offset < total) {
        const res = await requestPage({ limit: pageSize, offset });
        if (res?.status !== 'success' || !Array.isArray(res?.data)) {
            throw new Error(res?.message || 'No se pudo obtener una página de la exportación.');
        }
        const reported = Number(res.total);
        if (!Number.isSafeInteger(reported) || reported < 0) {
            throw new Error('La API no devolvió el total de registros paginados.');
        }
        if (total === null) total = reported;
        if (reported !== total) {
            throw new Error('El listado cambió durante la exportación; vuelva a intentarlo.');
        }

        const expected = Math.min(pageSize, total - offset);
        if (res.data.length !== expected) {
            throw new Error('Exportación incompleta: faltan registros en una página.');
        }

        for (const row of res.data) {
            const id = Number(row?.idformA);
            if (!Number.isSafeInteger(id) || id <= 0 || seenIds.has(id)) {
                throw new Error('La API devolvió un pedido duplicado o sin identificador.');
            }
            seenIds.add(id);
        }
        if (res.data.length) {
            onBatch(res.data, { total, loaded: offset + res.data.length });
        }
        offset += res.data.length;
    }
    return total;
}

export function downloadCsvRows(rows, filename) {
    const blob = new Blob(['\uFEFF', rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename.replace(/[\\/:*?"<>|]/g, '_');
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}
