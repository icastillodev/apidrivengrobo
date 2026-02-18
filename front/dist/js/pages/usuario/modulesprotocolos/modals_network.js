import { store } from './store.js';
import { API } from '../../../api.js';
import { loadData } from './api_service.js';

export function openNetworkRequestModal(id = null) {
    const select = document.getElementById('select-my-prot');
    select.innerHTML = '';
    const today = new Date().toISOString().split('T')[0];
    
    const candidates = store.allData.my.filter(p => p.variasInst != 2 && (!p.Vencimiento || p.Vencimiento >= today) && p.Aprobado == 1);
    
    if (candidates.length === 0) return window.Swal.fire('Atención', 'No tiene protocolos APROBADOS vigentes para compartir.', 'warning');

    candidates.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.idprotA;
        opt.text = `[${p.nprotA}] ${p.tituloA}`;
        opt.dataset.title = p.tituloA;
        opt.dataset.id = p.idprotA;
        opt.dataset.date = p.Vencimiento || '-';
        select.appendChild(opt);
    });

    if (id) select.value = id;
    
    document.getElementById('prot-details-preview').classList.add('d-none');
    document.getElementById('step-3-network').classList.add('d-none');
    document.getElementById('btn-send-net').disabled = true;
    
    new bootstrap.Modal(document.getElementById('modal-network-req')).show();
    if(id) showProtDetails();
}

export function filterMyProtocols(input) {
    const term = input.value.toLowerCase();
    Array.from(document.getElementById('select-my-prot').options).forEach(o => {
        o.style.display = o.text.toLowerCase().includes(term) ? '' : 'none';
    });
}

export function showProtDetails() {
    const opt = document.getElementById('select-my-prot').selectedOptions[0];
    if(!opt) return;
    
    document.getElementById('preview-title').innerText = opt.dataset.title;
    document.getElementById('preview-id').innerText = opt.dataset.id;
    document.getElementById('preview-date').innerText = opt.dataset.date;
    
    document.getElementById('prot-details-preview').classList.remove('d-none');
    document.getElementById('step-3-network').classList.remove('d-none');
    
    loadNetworkInstitutions();
}

async function loadNetworkInstitutions() {
    const instId = localStorage.getItem('instId');
    const c = document.getElementById('network-inst-list');
    c.innerHTML = '<div class="spinner-border spinner-border-sm text-primary"></div>';
    
    try {
        const res = await API.request(`/user/protocols/network-targets?inst=${instId}`);
        c.innerHTML = '';
        if(res.status === 'success' && res.data.length > 0) {
            res.data.forEach(i => {
                c.innerHTML += `
                    <div class="network-option p-2 rounded w-100 border mb-2" onclick="window.checkNetBtn(this)">
                        <div class="form-check pointer-events-none p-2">
                            <input class="form-check-input" type="checkbox" value="${i.IdInstitucion}">
                            <label class="form-check-label fw-bold ms-2">${i.NombreInst}</label>
                        </div>
                    </div>`;
            });
        } else {
            c.innerHTML = '<div class="alert alert-warning small w-100">No hay otras instituciones en la red disponibles.</div>';
        }
    } catch(e) { 
        console.error(e);
        c.innerHTML = '<div class="text-danger small">Error cargando instituciones.</div>';
    }
}

// CORRECCIÓN SELECCIÓN DE INSTITUCIÓN
export function checkNetBtn(element) {
    // Si se pasa el elemento (div clickeado), invertir el check
    if (element) {
        element.classList.toggle('selected');
        element.classList.toggle('bg-light');
        const checkbox = element.querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.checked = !checkbox.checked;
    }

    // Verificar si hay alguno seleccionado para habilitar botón
    const anyChecked = document.querySelectorAll('#network-inst-list input[type="checkbox"]:checked').length > 0;
    document.getElementById('btn-send-net').disabled = !anyChecked;
}

export async function sendNetworkRequest() {
    const pid = document.getElementById('select-my-prot').value;
    
    // Obtener array de IDs seleccionados
    const checkboxes = document.querySelectorAll('#network-inst-list input[type="checkbox"]:checked');
    const tgts = Array.from(checkboxes).map(cb => cb.value);
    
    if (tgts.length === 0) return window.Swal.fire('Error', 'Seleccione al menos una institución destino.', 'warning');

    try {
        const res = await API.request('/user/protocols/create-network-request', 'POST', { idprotA: pid, targets: tgts });
        if(res.status === 'success') {
            bootstrap.Modal.getInstance(document.getElementById('modal-network-req')).hide();
            window.Swal.fire('Enviado', 'Solicitud enviada a la red.', 'success');
            loadData();
        } else { window.Swal.fire('Error', res.message, 'error'); }
    } catch(e) { console.error(e); }
}