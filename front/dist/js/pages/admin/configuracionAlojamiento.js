import { API } from '../../api.js';
import { hideLoader, showLoader } from '../../components/LoaderComponent.js';

let cfgProtocolsCache = [];
let cfgUsersCache = [];
let cfgSelectedSpeciesData = null;

// front/dist/js/pages/admin/configuracionAlojamiento.js

window.abrirConfiguracion = async () => {
    // 1. Validar que existan datos de la historia abierta
    const current = (window.currentHistoryData && window.currentHistoryData[0]) || null;
    
    if (!current) {
        console.error("No se detectaron datos de la historia actual.");
        return;
    }

    // 2. CERRAR EL MODAL DE HISTORIAL (Evita que se pisen)
    const modalHistEl = document.getElementById('modal-historial');
    const instanciaHist = bootstrap.Modal.getInstance(modalHistEl);
    if (instanciaHist) instanciaHist.hide();

    // 3. Preparar los IDs en el modal de configuración
    const instId = localStorage.getItem('instId');
    document.getElementById('cfg-title-id').innerText = current.historia;
    document.getElementById('cfg-historia-id').value = current.historia;

    showLoader();
    try {
        // ... el resto de tus peticiones API (Protocolos y Usuarios) ...
        const [resProt, resUsr] = await Promise.all([
            API.request(`/protocolos/search-alojamiento?inst=${instId}`),
            API.request(`/users/institution?inst=${instId}`)
        ]);

        cfgProtocolsCache = resProt.data || [];
        cfgUsersCache = resUsr.data || [];

        renderCfgProtocols('', current.idprotA);
        renderCfgUsers('', current.IdUsrA);
        
        // Cargar las especies del protocolo actual
        await cargarEspeciesConfig(current.idprotA, current.idespA);

        // 4. ABRIR EL MODAL DE CONFIGURACIÓN
        const modalConfigEl = document.getElementById('modal-configuracion-global');
        const modalConfig = new bootstrap.Modal(modalConfigEl);
        modalConfig.show();

    } catch (e) { 
        console.error("Error al abrir configuración:", e); 
    }
    hideLoader();
};

const renderCfgProtocols = (term, selectedId) => {
    const t = (term || '').toLowerCase();
    const select = document.getElementById('cfg-select-prot');
    const filtered = cfgProtocolsCache.filter(p => 
        (p.nprotA || '').toLowerCase().includes(t) || (p.tituloA || '').toLowerCase().includes(t) || (p.idprotA || '').toString().includes(t)
    );
    select.innerHTML = filtered.map(p => `<option value="${p.idprotA}" ${p.idprotA == selectedId ? 'selected' : ''}>#${p.idprotA} | [${p.nprotA}] ${p.tituloA}</option>`).join('');
    select.onchange = (e) => cargarEspeciesConfig(e.target.value);
};

const renderCfgUsers = (term, selectedId) => {
    const t = (term || '').toLowerCase();
    const select = document.getElementById('cfg-select-usr');
    const filtered = cfgUsersCache.filter(u => 
        (u.NombreA || '').toLowerCase().includes(t) || (u.ApellidoA || '').toLowerCase().includes(t) || (u.IdUsrA || '').toString().includes(t)
    );
    select.innerHTML = filtered.map(u => `<option value="${u.IdUsrA}" ${u.IdUsrA == selectedId ? 'selected' : ''}>ID:${u.IdUsrA} - ${(u.ApellidoA || '').toUpperCase()} ${u.NombreA}</option>`).join('');
};

async function cargarEspeciesConfig(idProt, selectedEspId = null) {
    const container = document.getElementById('cfg-container-especie');
    try {
        const res = await API.request(`/protocols/current-species?id=${idProt}`);
        const especies = res.data;

        if (especies.length === 1) {
            const esp = especies[0];
            container.innerHTML = `<input type="text" class="form-control form-control-sm bg-light fw-bold" value="${esp.EspeNombreA}" readonly>
                                   <input type="hidden" id="cfg-select-esp" value="${esp.idespA}">`;
            validarCajasConfig(esp);
        } else {
            container.innerHTML = `<select id="cfg-select-esp" class="form-select form-select-sm shadow-sm">
                <option value="">-- Seleccionar --</option>
                ${especies.map(e => `<option value="${e.idespA}" ${e.idespA == selectedEspId ? 'selected' : ''}>${e.EspeNombreA}</option>`).join('')}
            </select>`;
            document.getElementById('cfg-select-esp').onchange = (e) => {
                const espObj = especies.find(esp => esp.idespA == e.target.value);
                validarCajasConfig(espObj);
            };
            if (selectedEspId) {
                const espObj = especies.find(esp => esp.idespA == selectedEspId);
                validarCajasConfig(espObj);
            }
        }
    } catch (e) { console.error(e); }
}

function validarCajasConfig(info) {
    const container = document.getElementById('cfg-container-caja');
    if (!info) return;
    cfgSelectedSpeciesData = info;
    const tieneChica = parseFloat(info.PalojamientoChica) > 0;
    const tieneGrande = parseFloat(info.PalojamientoGrande) > 0;

    if (tieneChica && tieneGrande) {
        container.innerHTML = `<select id="cfg-tipo-caja" class="form-select form-select-sm"><option value="chica">Caja Chica ($${info.PalojamientoChica})</option><option value="grande">Caja Grande ($${info.PalojamientoGrande})</option></select>`;
    } else {
        const tipo = tieneChica ? 'chica' : 'grande';
        container.innerHTML = `<input type="text" class="form-control form-control-sm bg-light fw-bold" value="Caja ${tipo.toUpperCase()}" readonly><input type="hidden" id="cfg-tipo-caja" value="${tipo}">`;
    }
}

// front/dist/js/pages/admin/configuracionAlojamiento.js

window.guardarConfiguracionGlobal = async () => {
    const data = {
        historia: document.getElementById('cfg-historia-id').value,
        idprotA: document.getElementById('cfg-select-prot').value,
        IdUsrA: document.getElementById('cfg-select-usr').value,
        idespA: document.getElementById('cfg-select-esp').value,
        tipoCaja: document.getElementById('cfg-tipo-caja').value,
        precioChica: parseFloat(cfgSelectedSpeciesData.PalojamientoChica || 0),
        precioGrande: parseFloat(cfgSelectedSpeciesData.PalojamientoGrande || 0)
    };

    // Validación visual antes de enviar
    if (!data.idprotA || !data.IdUsrA || !data.idespA) {
        return Swal.fire('Error', 'Debe seleccionar protocolo, responsable y especie.', 'error');
    }

    const { isConfirmed } = await Swal.fire({
        title: '¿Confirmar Cambio Masivo?',
        html: `
            <div class="text-start small alert alert-danger">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <b>Atención:</b> Se cambiará el tipo de caja a <b>${data.tipoCaja.toUpperCase()}</b> 
                en todos los registros y se recalcularán los costos históricos.
            </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'SÍ, APLICAR A TODA LA HISTORIA',
        confirmButtonColor: '#d33'
    });

    if (isConfirmed) {
        showLoader();
        try {
            const res = await API.request('/alojamiento/update-config', 'POST', data);
            if (res.status === 'success') {
                Swal.fire('Éxito', 'La historia y sus costos se han actualizado.', 'success')
                    .then(() => location.reload());
            }
        } catch (e) { console.error(e); }
        hideLoader();
    }
};

// Listeners de búsqueda
document.addEventListener('input', (e) => {
    if (e.target.id === 'cfg-search-prot') renderCfgProtocols(e.target.value);
    if (e.target.id === 'cfg-search-usr') renderCfgUsers(e.target.value);
});