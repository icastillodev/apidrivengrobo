import { API } from '../../../api.js';
import { isHistoriaFinalizada, isStandByTramo } from './tramoHelpers.js';

export const QRPageUI = {
    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        const historiaId = urlParams.get('historia');
        
        // Determinar si hay un token válido (Admin) o es invitado (Public)
        const token = localStorage.getItem('token');
        const isAdmin = !!token;

        this.renderHeader(isAdmin);
        await this.loadData(historiaId, isAdmin);
    },

    renderHeader(isAdmin) {
        const txt = window.txt?.alojamientos || {};
        document.getElementById('qr-header').innerHTML = `
            <button class="btn btn-sm btn-outline-dark me-2"><i class="bi bi-qr-code"></i> ${txt.qr_etiqueta_btn || 'Etiqueta QR'}</button>
            <button class="btn btn-sm btn-outline-danger me-2" onclick="window.exportarFichaPDF()"><i class="bi bi-file-pdf"></i> ${txt.qr_pdf_completo || 'PDF Completo'}</button>
            ${isAdmin 
                ? `<button class="btn btn-sm btn-secondary" onclick="window.logout()"><i class="bi bi-box-arrow-right"></i> ${txt.qr_logout}</button>`
                : `<button class="btn btn-sm btn-primary" onclick="window.location.href='/login'"><i class="bi bi-person-fill"></i> ${txt.qr_login}</button>`
            }
        `;
    },

    async loadData(historiaId, isAdmin) {
        try {
            // Traer datos de la historia
            const res = await API.request(`/alojamiento/history?id=${historiaId}`);
            const data = res.data;
            const first = data[0];
            const isFinalizado = isHistoriaFinalizada(data);
            const txt = window.txt.alojamientos;

            // Renderizar Información General (Ocultando precios)
            document.getElementById('qr-info-box').innerHTML = `
                <h4 class="fw-bold">Historia #${first.historia}</h4>
                <p class="mb-1"><b>Protocolo:</b> [${first.nprotA}] ${first.tituloA}</p>
                <p class="mb-1"><b>Estado:</b> <span class="badge ${isFinalizado ? 'bg-danger' : 'bg-success'}">${isFinalizado ? txt.status_finished : txt.status_active}</span></p>
                <p class="mb-1"><b>Días Totales:</b> ${this.calcularDias(data)}</p>
            `;

            // Renderizar la Tabla de Tramos
            document.getElementById('qr-table-body').innerHTML = data.map(h => `
                <tr class="pointer table-light" onclick="window.TrazabilidadUI.toggleRow(${h.IdAlojamiento}, ${h.TipoAnimal})">
                    <td>${h.fechavisado}</td>
                    <td>${h.CantidadCaja} ${txt.qr_cajas || 'Cajas'}</td>
                    <td>${h.observaciones || ''}</td>
                    ${isAdmin ? `<td>
                        <button class="btn btn-xs btn-outline-primary"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-xs btn-outline-danger"><i class="bi bi-trash"></i></button>
                    </td>` : ''}
                </tr>
                <tr id="trazabilidad-row-${h.IdAlojamiento}" class="d-none bg-white">
                    <td colspan="${isAdmin ? 4 : 3}" class="p-0 border-0">
                        <div id="trazabilidad-content-${h.IdAlojamiento}" class="p-3 bg-light"></div>
                    </td>
                </tr>
            `).join('');

        } catch (e) { console.error(e); }
    },

    calcularDias(historyArray) {
        if (!historyArray || historyArray.length === 0) return (window.txt?.alojamientos?.qr_dias_placeholder || '0') + ' ' + (window.txt?.alojamientos?.days_suffix || 'Días');
        const hoy = new Date();
        hoy.setHours(12, 0, 0, 0);
        let dias = 0;
        historyArray.forEach((h) => {
            if (isStandByTramo(h) || !h.fechavisado) return;
            const pIni = String(h.fechavisado).split('-');
            const fIni = new Date(pIni[0], pIni[1] - 1, pIni[2], 12, 0, 0);
            let fFin = hoy;
            if (h.hastafecha) {
                const pFin = String(h.hastafecha).split('-');
                fFin = new Date(pFin[0], pFin[1] - 1, pFin[2], 12, 0, 0);
            }
            dias += Math.max(0, Math.floor((fFin - fIni) / (1000 * 60 * 60 * 24)));
        });
        return `${dias} ${window.txt?.alojamientos?.qr_dias_placeholder || 'Días'}`;
    }
};