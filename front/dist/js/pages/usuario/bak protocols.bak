import { API } from '../../api.js';
import { hideLoader, showLoader } from '../../components/LoaderComponent.js';

let allData = { my: [], local: [], network: [] };
let formDataCache = null; 
let currentTab = 'my';
let currentUserInfo = { id: 0 };

let currentPage = 1;
const rowsPerPage = 10;
let currentSearch = '';
let currentFilterType = 'all';

export async function initUserProtocols() {
    const instName = localStorage.getItem('NombreInst') || 'Institución';
    const bread = document.getElementById('institucionbread');
    if(bread) bread.innerText = instName;

    // 1. OBTENER ID USUARIO REAL
    // Asegúrate de que al loguear guardas 'userId' en localStorage. Si usas otro nombre (ej: 'id'), cámbialo aquí.
    currentUserInfo.id = localStorage.getItem('userId'); 
    
    if(!currentUserInfo.id) {
        console.error("No se encontró ID de usuario en localStorage");
        // Opcional: Redirigir al login si es crítico
    }

    const badgeUser = document.getElementById('current-user-display');
    if(badgeUser) badgeUser.innerText = `ID: ${currentUserInfo.id}`;

    await loadConfig();
    loadData();

    document.getElementById('btn-search').onclick = applyFilters;
    document.getElementById('filter-type').addEventListener('change', updateSearchInputType);
    document.getElementById('search-input').onkeyup = (e) => { if(e.key === 'Enter') applyFilters(); };
    document.getElementById('form-new-prot').onsubmit = saveProtocol;
}

// ... (loadConfig y updateSearchInputType IGUAL) ...
function updateSearchInputType() { /* ... COPIAR DEL ANTERIOR ... */ 
    const type = document.getElementById('filter-type').value;
    const container = document.getElementById('dynamic-search-container');
    let html = '';
    if (type === 'TipoNombre') {
        let opts = `<option value="">-- Todos --</option>`;
        if(formDataCache && formDataCache.types) formDataCache.types.forEach(t => opts += `<option value="${t.NombreTipoprotocolo}">${t.NombreTipoprotocolo}</option>`);
        html = `<select id="search-input" class="form-select form-select-sm border-start-0 fw-bold">${opts}</select>`;
    } else if (type === 'Origen') {
        html = `<select id="search-input" class="form-select form-select-sm border-start-0 fw-bold"><option value="">-- Todos --</option><option value="PROPIA">Propia</option><option value="RED">Red</option></select>`;
    } else {
        html = `<input type="text" id="search-input" class="form-control form-control-sm border-start-0" placeholder="Buscar...">`;
    }
    container.innerHTML = html;
    const input = document.getElementById('search-input');
    if(input.tagName === 'SELECT') input.onchange = applyFilters;
    else input.onkeyup = (e) => { if(e.key === 'Enter') applyFilters(); };
}

async function loadConfig() {
    const instId = localStorage.getItem('instId');
    try {
        const res = await API.request(`/user/protocols/config?inst=${instId}`);
        formDataCache = res.data;
        if (formDataCache.has_network) {
            document.getElementById('tab-network-li').classList.remove('d-none');
            document.getElementById('action-network-li').classList.remove('d-none');
            document.getElementById('action-create-external-li').classList.remove('d-none');
        }
    } catch (e) { console.error(e); }
}

async function loadData() {
    const instId = localStorage.getItem('instId');
    // CORRECCIÓN: Enviar uid en la petición
    const userId = localStorage.getItem('userId');
    
    showLoader();
    try {
        const res = await API.request(`/user/protocols/all-lists?inst=${instId}&uid=${userId}`);
        if (res.status === 'success') {
            allData.my = res.data.my;
            allData.local = res.data.local;
            allData.network = res.data.network;
            updateStats();
            renderTable();
        }
    } catch (e) { console.error(e); }
    hideLoader();
}

// ... (switchView, renderTable, renderPagination, updateStats IGUAL) ...
window.switchView = (tab) => { currentTab = tab; currentPage = 1; document.querySelectorAll('#view-tabs .nav-link').forEach(btn => btn.classList.remove('active')); event.target.closest('.nav-link').classList.add('active'); applyFilters(); };
function getDataset() { return allData[currentTab] || []; }
function applyFilters() { const inputEl = document.getElementById('search-input'); currentSearch = inputEl ? inputEl.value.toLowerCase().trim() : ''; currentFilterType = document.getElementById('filter-type').value; currentPage = 1; renderTable(); }

function renderTable() {
    const tbody = document.getElementById('table-protocols');
    const rawData = getDataset();
    const filteredData = rawData.filter(p => {
        if (!currentSearch) return true;
        if (currentFilterType === 'Origen') return p.OrigenCalculado === currentSearch.toUpperCase();
        if (currentFilterType === 'all') return JSON.stringify(p).toLowerCase().includes(currentSearch);
        const val = String(p[currentFilterType] || '').toLowerCase();
        return val.includes(currentSearch);
    });
    const totalItems = filteredData.length;
    const start = (currentPage - 1) * rowsPerPage;
    const pageData = filteredData.slice(start, start + rowsPerPage);
    const today = new Date().toISOString().split('T')[0];

    tbody.innerHTML = '';
    if (pageData.length === 0) { tbody.innerHTML = '<tr><td colspan="10" class="text-center py-5 text-muted fst-italic">No se encontraron protocolos.</td></tr>'; renderPagination(0); return; }

    pageData.forEach(p => {
        let dateClass = "text-muted"; let dateText = p.Vencimiento || '-';
        if (p.Vencimiento && p.Vencimiento < today) { dateClass = "text-danger fw-bold text-decoration-underline"; dateText += " (Vencido)"; }
        let tipoHtml = `<span class="fw-bold text-dark">${p.TipoNombre || '-'}</span>`;
        if (p.IsExterno == 1) tipoHtml += `<br><span class="badge bg-danger mt-1" style="font-size:9px">OTROS CEUAS</span>`;
        let origenHtml = `<span class="badge bg-light text-dark border">PROPIA</span>`;
        if (p.OrigenCalculado === 'RED' || (p.Origen && p.Origen !== formDataCache.NombreCompletoInst)) {
            const inst = p.Origen || (p.InstitucionOrigen ? p.InstitucionOrigen : '');
            origenHtml = `<span class="badge bg-info text-white">RED</span><br><span class="small text-muted" style="font-size:9px">${inst}</span>`;
        }
        let estadoHtml = '-';
        if(currentTab === 'my') {
            const st = p.Aprobado;
            if(st == 1) estadoHtml = '<span class="badge bg-success">APROBADO</span>';
            else if(st == 3 || st == null) estadoHtml = '<span class="badge bg-warning text-dark">EN REVISIÓN</span>';
            else if(st == 2 || st == 4) estadoHtml = `<span class="badge bg-danger cursor-help" onclick="window.viewAdminFeedback(${p.idprotA}, '${p.DetalleAdm || ''}')" title="Ver motivo">RECHAZADO <i class="bi bi-info-circle"></i></span>`;
        }
        const tr = document.createElement('tr');
        tr.onclick = (e) => { if(!e.target.closest('button') && !e.target.closest('.badge')) window.viewProtocol(p.idprotA); };
        let actions = `<button class="btn btn-sm btn-outline-secondary" onclick="window.viewProtocol(${p.idprotA})" title="Ver Detalle"><i class="bi bi-eye"></i></button>`;
        if (currentTab === 'my') {
            if (p.Aprobado == 2 || p.Aprobado == 4) actions += `<button class="btn btn-sm btn-warning ms-1" onclick="window.openEditProtocolModal(${p.idprotA})" title="Corregir"><i class="bi bi-pencil-square"></i></button>`;
            else if (p.Aprobado == 1 && p.variasInst != 2 && (!p.Vencimiento || p.Vencimiento >= today)) {
                if(formDataCache.has_network) actions += `<button class="btn btn-sm btn-info text-white ms-1" onclick="window.openNetworkRequestModal(${p.idprotA})" title="Solicitar en Red"><i class="bi bi-share-fill"></i></button>`;
            }
        }
        tr.innerHTML = `<td class="text-muted small px-2">${p.idprotA}</td><td class="fw-bold text-primary px-2">${p.nprotA}</td><td class="small text-wrap px-2" style="max-width:200px;">${p.tituloA}</td><td class="small px-2 fw-bold text-dark"><i class="bi bi-person-fill text-muted"></i> ${p.ResponsableName || '-'}</td><td class="small px-2 text-muted">${p.InvestigadorACargA || '-'}</td><td class="px-2 text-center small">${tipoHtml}</td><td class="px-2 text-center">${origenHtml}</td><td class="px-2 text-center">${estadoHtml}</td><td class="px-2 small ${dateClass}">${dateText}</td><td class="px-2 text-end">${actions}</td>`;
        tbody.appendChild(tr);
    });
    renderPagination(totalItems);
}

function renderPagination(totalItems) { const pag = document.getElementById('pagination'); const totalPages = Math.ceil(totalItems / rowsPerPage); pag.innerHTML = ''; if (totalPages <= 1) return; let startPage = Math.max(1, currentPage - 4); let endPage = Math.min(totalPages, startPage + 9); if (endPage - startPage < 9) startPage = Math.max(1, endPage - 9); const createBtn = (lbl, p, dis, act) => { const li = document.createElement('li'); li.className = `page-item ${dis ? 'disabled' : ''} ${act ? 'active' : ''}`; li.innerHTML = `<a class="page-link" href="#">${lbl}</a>`; if(!dis) li.onclick = (e) => { e.preventDefault(); currentPage = p; renderTable(); }; return li; }; pag.appendChild(createBtn('«', currentPage - 1, currentPage === 1, false)); for (let i = startPage; i <= endPage; i++) pag.appendChild(createBtn(i, i, false, currentPage === i)); pag.appendChild(createBtn('»', currentPage + 1, currentPage === totalPages, false)); }
function updateStats() { document.getElementById('stats-bar').innerHTML = `<span class="me-3 fw-bold text-primary"><i class="bi bi-person-fill"></i> Mis Protocolos: ${allData.my.length}</span><span class="me-3 fw-bold text-success"><i class="bi bi-building"></i> Institución: ${allData.local.length}</span>${formDataCache.has_network ? `<span class="fw-bold text-info"><i class="bi bi-globe"></i> Red: ${allData.network.length}</span>` : ''}`; }
window.viewAdminFeedback = (id, msg) => { window.Swal.fire({ title: 'Motivo del Rechazo', html: `<p class="text-start">${msg || 'Sin detalles.'}</p>`, icon: 'warning', footer: '<small>Edite y reenvíe la solicitud.</small>' }); };
window.viewProtocol = async (id) => { /* ... IGUAL AL ANTERIOR ... */ const p = getDataset().find(x => x.idprotA == id); if (!p) return; const modalEl = document.getElementById('modal-detail'); const content = document.getElementById('detail-content'); const modal = new bootstrap.Modal(modalEl); content.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>'; modal.show(); const total = parseInt(p.CantidadAniA) || 0; const usados = parseInt(p.AnimalesUsados) || 0; const restantes = total - usados; let colorRestante = "text-success"; if(restantes <= 0) colorRestante = "text-danger fw-bold"; else if(restantes < (total * 0.2)) colorRestante = "text-warning fw-bold"; let detalleAdminHtml = ''; if(p.DetalleAdm) detalleAdminHtml = `<div class="alert alert-warning mt-2 mb-0 small"><i class="bi bi-chat-quote-fill me-2"></i> <strong>Nota Admin:</strong> ${p.DetalleAdm}</div>`; let especiesHtml = ''; try { const res = await API.request(`/user/protocols/species-detail?id=${id}`); if(res.status === 'success' && res.data.length > 0) { especiesHtml = `<ul class="list-group list-group-flush small border rounded">` + res.data.map(e => `<li class="list-group-item d-flex justify-content-between align-items-center"><span><i class="bi bi-tag-fill text-secondary me-2"></i> ${e.EspeNombreA}</span><span class="badge bg-light text-dark border">Autorizada</span></li>`).join('') + `</ul>`; } } catch(e){} let tipoText = p.TipoNombre || '---'; if(p.IsExterno == 1) tipoText += ' (Otros CEUAS)'; content.innerHTML = `<div class="d-flex justify-content-between border-bottom pb-3 mb-4"><div><h5 class="fw-bold text-primary mb-1">Protocolo #${p.nprotA}</h5><span class="badge bg-secondary">ID SISTEMA: ${p.idprotA}</span></div><div class="text-end"><small class="text-muted d-block">ESTADO</small>${p.Aprobado == 1 ? '<span class="badge bg-success px-3 py-2">APROBADO</span>' : '<span class="badge bg-secondary">REVISIÓN / OTRO</span>'}</div></div><div class="row g-4"><div class="col-md-12"><div class="p-3 bg-light rounded border"><h6 class="fw-bold text-dark mb-2">${p.tituloA}</h6>${detalleAdminHtml}<div class="row mt-3"><div class="col-md-6 mb-2"><label class="small text-muted fw-bold d-block">RESPONSABLE (USUARIO)</label><span class="text-dark"><i class="bi bi-person-circle me-1"></i> ${p.ResponsableName || '---'}</span></div><div class="col-md-6 mb-2"><label class="small text-muted fw-bold d-block">INVESTIGADOR REFERENTE</label><span class="text-dark">${p.InvestigadorACargA || '---'}</span></div><div class="col-md-6"><label class="small text-muted fw-bold d-block">DEPARTAMENTO</label><span class="text-dark">${p.DeptoFormat || '---'}</span></div><div class="col-md-6"><label class="small text-muted fw-bold d-block">VENCIMIENTO</label><span class="${p.Vencimiento < new Date().toISOString().split('T')[0] ? 'text-danger fw-bold' : 'text-dark'}">${p.Vencimiento || '---'}</span></div></div></div></div><div class="col-md-12"><label class="small text-muted fw-bold d-block mb-2">BALANCE DE ANIMALES (GLOBAL)</label><div class="row text-center g-2"><div class="col-4"><div class="border rounded p-2 bg-white"><div class="small text-muted">APROBADOS</div><div class="fs-5 fw-bold text-primary">${total}</div></div></div><div class="col-4"><div class="border rounded p-2 bg-white"><div class="small text-muted">USADOS</div><div class="fs-5 fw-bold text-secondary">${usados}</div></div></div><div class="col-4"><div class="border rounded p-2 bg-white"><div class="small text-muted">DISPONIBLES</div><div class="fs-5 ${colorRestante}">${restantes}</div></div></div></div></div><div class="col-12"><label class="small text-muted fw-bold d-block mb-2">ESPECIES</label>${especiesHtml || '<div class="alert alert-light border text-center small">Sin especies registradas</div>'}</div></div>`; };

// --- CORRECCIÓN EN SAVE PROTOCOL ---
async function saveProtocol(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    
    // Inyectar el ID real
    const userId = localStorage.getItem('userId');
    if(userId) fd.append('currentUserId', userId); 
    
    if(!fd.get('IdInstitucion')) fd.append('IdInstitucion', localStorage.getItem('instId'));

    const isUpdate = fd.get('idprotA') ? true : false;
    const url = isUpdate ? '/user/protocols/update-internal' : '/user/protocols/create-internal';

    try {
        const res = await API.request(url, 'POST', fd);
        if(res.status==='success') {
            bootstrap.Modal.getInstance(document.getElementById('modal-new-prot')).hide();
            window.Swal.fire('Éxito', 'Solicitud procesada correctamente.', 'success');
            loadData();
        } else { window.Swal.fire('Error', res.message, 'error'); }
    } catch(e) { console.error(e); }
}

// ... (Resto de funciones: openNewProtocolModal, openEditProtocolModal, openNetworkRequestModal, showProtDetails, loadNetworkInstitutions, sendNetworkRequest, fillSelect, addNewSpeciesRow... IGUAL AL ANTERIOR)
window.openNewProtocolModal = () => { prepareModal('NUEVA SOLICITUD', false); document.getElementById('form-new-prot').reset(); document.getElementById('edit-prot-id').value = ""; document.getElementById('new-species-container').innerHTML = ''; window.addNewSpeciesRow(); new bootstrap.Modal(document.getElementById('modal-new-prot')).show(); };
window.openEditProtocolModal = async (id) => { /* ... copiar lógica anterior ... */ const p=allData.my.find(x=>x.idprotA==id); if(!p)return; prepareModal('CORREGIR SOLICITUD', true); document.getElementById('edit-prot-id').value=p.idprotA; document.getElementById('inp-titulo').value=p.tituloA; document.getElementById('inp-nprot').value=p.nprotA; document.getElementById('inp-inv').value=p.InvestigadorACargA; document.getElementById('inp-cant').value=p.CantidadAniA; document.getElementById('inp-ini').value=p.FechaIniProtA; document.getElementById('inp-fin').value=p.Vencimiento; fillSelect('new-depto', formDataCache.depts, 'iddeptoA', 'NombreDeptoA'); document.getElementById('new-depto').value=p.DeptoFormat; fillSelect('new-tipo', formDataCache.types, 'idtipoprotocolo', 'NombreTipoprotocolo'); document.getElementById('new-tipo').value=p.tipoprotocolo; fillSelect('new-sev', formDataCache.severities, 'IdSeveridadTipo', 'NombreSeveridad'); document.getElementById('new-sev').value=p.severidad; const c=document.getElementById('new-species-container'); c.innerHTML=''; try{const r=await API.request(`/user/protocols/species-detail?id=${id}`); if(r.status==='success'&&r.data.length>0) r.data.forEach(e=>{const d=document.createElement('div'); d.className='row g-2 mb-2 species-row'; const o=formDataCache.species.map(s=>`<option value="${s.idespA}" ${s.idespA==e.idespA?'selected':''}>${s.EspeNombreA}</option>`).join(''); d.innerHTML=`<div class="col-10"><select name="especies[]" class="form-select form-select-sm">${o}</select></div><div class="col-2"><button type="button" class="btn btn-outline-danger btn-sm w-100" onclick="this.closest('.species-row').remove()">X</button></div>`; c.appendChild(d);}); else window.addNewSpeciesRow();}catch(e){window.addNewSpeciesRow();} new bootstrap.Modal(document.getElementById('modal-new-prot')).show(); };
function prepareModal(t,e){document.getElementById('modal-new-prot-title').innerText=t; const a=document.getElementById('alert-edit-mode'); const b=document.getElementById('btn-save-prot'); fillSelect('new-depto',formDataCache.depts,'iddeptoA','NombreDeptoA'); fillSelect('new-tipo',formDataCache.types,'idtipoprotocolo','NombreTipoprotocolo'); fillSelect('new-sev',formDataCache.severities,'IdSeveridadTipo','NombreSeveridad'); if(e){a.classList.remove('d-none');b.innerText="REENVIAR CORRECCIÓN";b.classList.replace('btn-primary','btn-warning');}else{a.classList.add('d-none');b.innerText="ENVIAR SOLICITUD";b.classList.replace('btn-warning','btn-primary');}}
window.addNewSpeciesRow = (useExternal = false)=>{const c=document.getElementById('new-species-container'); const s=useExternal?window.externalSpecies:formDataCache.species; const o=s?s.map(e=>`<option value="${e.idespA}">${e.EspeNombreA}</option>`).join(''):''; const d=document.createElement('div'); d.className='row g-2 mb-2 species-row'; d.innerHTML=`<div class="col-10"><select name="especies[]" class="form-select form-select-sm" required><option value="">-- Seleccionar --</option>${o}</select></div><div class="col-2"><button type="button" class="btn btn-outline-danger btn-sm w-100" onclick="this.closest('.species-row').remove()">X</button></div>`; c.appendChild(d);};
window.openNetworkRequestModal=(id)=>{const s=document.getElementById('select-my-prot'); s.innerHTML=''; const t=new Date().toISOString().split('T')[0]; const c=allData.my.filter(p=>p.variasInst!=2&&(!p.Vencimiento||p.Vencimiento>=t)&&p.Aprobado==1); if(c.length===0)return window.Swal.fire('Atención','No tiene protocolos APROBADOS vigentes.','warning'); c.forEach(p=>{const o=document.createElement('option'); o.value=p.idprotA; o.text=`[${p.nprotA}] ${p.tituloA}`; o.dataset.title=p.tituloA; o.dataset.id=p.idprotA; o.dataset.date=p.Vencimiento||'-'; s.appendChild(o);}); if(id)s.value=id; document.getElementById('prot-details-preview').classList.add('d-none'); document.getElementById('step-3-network').classList.add('d-none'); document.getElementById('btn-send-net').disabled=true; new bootstrap.Modal(document.getElementById('modal-network-req')).show(); if(id)window.showProtDetails();};
window.filterMyProtocols=(i)=>{const t=i.value.toLowerCase(); Array.from(document.getElementById('select-my-prot').options).forEach(o=>o.style.display=o.text.toLowerCase().includes(t)?'':'none');};
window.showProtDetails=()=>{const o=document.getElementById('select-my-prot').selectedOptions[0]; if(!o)return; document.getElementById('preview-title').innerText=o.dataset.title; document.getElementById('preview-id').innerText=o.dataset.id; document.getElementById('preview-date').innerText=o.dataset.date; document.getElementById('prot-details-preview').classList.remove('d-none'); document.getElementById('step-3-network').classList.remove('d-none'); loadNetworkInstitutions();};
async function loadNetworkInstitutions(){const i=localStorage.getItem('instId'); const c=document.getElementById('network-inst-list'); c.innerHTML='Cargando...'; try{const r=await API.request(`/user/protocols/network-targets?inst=${i}`); c.innerHTML=''; if(r.status==='success'&&r.data.length>0)r.data.forEach(x=>c.innerHTML+=`<div class="network-option p-2 rounded w-100" onclick="this.classList.toggle('selected');window.checkNetBtn();"><div class="form-check pointer-events-none"><input class="form-check-input" type="checkbox" value="${x.IdInstitucion}"><label class="form-check-label fw-bold">${x.NombreInst}</label></div></div>`); else c.innerHTML='No hay instituciones.';}catch(e){}};
window.checkNetBtn=()=>{const s=document.querySelectorAll('.network-option.selected'); document.getElementById('btn-send-net').disabled=s.length===0; document.querySelectorAll('.network-option input').forEach(i=>i.checked=false); s.forEach(d=>d.querySelector('input').checked=true);};
window.sendNetworkRequest=async()=>{const p=document.getElementById('select-my-prot').value; const t=Array.from(document.querySelectorAll('.network-option input:checked')).map(i=>i.value); try{const r=await API.request('/user/protocols/create-network-request','POST',{idprotA:p,targets:t}); if(r.status==='success'){bootstrap.Modal.getInstance(document.getElementById('modal-network-req')).hide(); window.Swal.fire('Enviado','Solicitud enviada.','success'); loadData();}else window.Swal.fire('Error',r.message,'error');}catch(e){console.error(e);}};
function fillSelect(i,d,v,t){const s=document.getElementById(i); s.innerHTML='<option value="">-- Seleccionar --</option>'; if(d) d.forEach(x=>s.innerHTML+=`<option value="${x[v]}">${x[t]}</option>`);}
// --- FUNCIONES EXTRA (Solicitud Externa) ---
window.openCreateExternalModal = () => { document.getElementById('modal-new-prot-title').innerText = 'SOLICITUD EN OTRA INSTITUCIÓN (RED)'; document.getElementById('external-inst-selector').classList.remove('d-none'); document.getElementById('external-mode-flag').value = "1"; document.getElementById('form-new-prot').reset(); document.getElementById('edit-prot-id').value = ""; const sel = document.getElementById('select-target-inst'); sel.innerHTML = '<option value="">-- Seleccione Institución --</option>'; if(formDataCache.network_institutions) formDataCache.network_institutions.forEach(i => sel.innerHTML += `<option value="${i.IdInstitucion}">${i.NombreInst}</option>`); fillSelect('new-depto', [], '', ''); fillSelect('new-tipo', [], '', ''); fillSelect('new-sev', [], '', ''); document.getElementById('new-species-container').innerHTML = ''; new bootstrap.Modal(document.getElementById('modal-new-prot')).show(); };
window.loadExternalConfig = async (targetInstId) => { if(!targetInstId) return; document.getElementById('form-inst-id').value = targetInstId; showLoader(); try { const res = await API.request(`/user/protocols/config?inst=${targetInstId}`); const conf = res.data; fillSelect('new-depto', conf.depts, 'iddeptoA', 'NombreDeptoA'); fillSelect('new-tipo', conf.types, 'idtipoprotocolo', 'NombreTipoprotocolo'); fillSelect('new-sev', conf.severities, 'IdSeveridadTipo', 'NombreSeveridad'); window.externalSpecies = conf.species; document.getElementById('new-species-container').innerHTML = ''; window.addNewSpeciesRow(true); } catch(e){ console.error(e); } hideLoader(); };