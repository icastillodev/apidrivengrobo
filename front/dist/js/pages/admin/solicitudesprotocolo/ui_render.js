export function renderTable(data) {
    const tbody = document.getElementById('table-requests');
    const txt = window.txt?.solicitudprotocolo?.tabla || {}; 
    tbody.innerHTML = '';

    data.forEach(row => {
        const isInternal = row.TipoEtiqueta === 'INTERNA';
        const badgeClass = isInternal ? 'badge-type-internal' : 'badge-type-network';
        const badgeLabel = isInternal ? (txt.tipo_interna || 'INTERNA') : (txt.tipo_red || 'RED');
        const icon = !isInternal ? '<i class="bi bi-globe me-1"></i>' : '';
        const originText = isInternal ? '-' : `<span class="text-info fw-bold">${row.Origen}</span>`;

        const tr = document.createElement('tr');
        tr.className = "cursor-pointer";
        tr.onclick = (e) => {
            if(e.target.closest('button')) return; 
            window.openRequestDetails(row);
        };

        tr.innerHTML = `
            <td class="px-3 fw-bold text-muted small">#${row.idSolicitudProtocolo}</td>
            <td class="px-3"><span class="badge ${badgeClass} fw-normal px-2">${icon}${badgeLabel}</span></td>
            
            <td class="px-3">
                <div class="fw-bold text-dark text-wrap" style="max-width: 280px; line-height: 1.2;">${row.tituloA}</div>
                <div class="small text-primary font-monospace mt-1 fw-bold">
                    <i class="bi bi-hash"></i> ${row.nprotA}
                </div>
            </td>
            
            <td class="px-3">
                <div class="d-flex align-items-center">
                    <div class="bg-light rounded-circle p-1 me-2 border d-flex justify-content-center align-items-center" style="width:30px;height:30px;">
                        <i class="bi bi-person text-secondary"></i>
                    </div>
                    <div>
                        <div class="fw-bold" style="font-size:12px;">${row.Solicitante || (txt.desconocido || 'Desconocido')}</div>
                        <div class="small text-muted" style="font-size:11px;">${row.Email || ''}</div>
                    </div>
                </div>
            </td>
            <td class="px-3 small">${originText}</td>
            <td class="px-3 text-end">
                <button class="btn btn-sm btn-outline-secondary border-0 rounded-circle p-2">
                    <i class="bi bi-eye-fill fs-5"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}