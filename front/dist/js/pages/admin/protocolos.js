// front/dist/js/pages/admin/protocolos.js
import { API } from '../../api.js';

let allProtocols = [];
let currentPage = 1;
const rowsPerPage = 15;
let sortConfig = { key: 'idprotA', direction: 'none' };
let formDataCache = null;

    export async function initProtocolosPage() {
        const instId = localStorage.getItem('instId');

    const btnAyuda = document.getElementById('btn-ayuda-prot'); // Asegúrate que tu botón tenga este ID
    if (btnAyuda) {
        btnAyuda.onclick = () => {
            const helpModal = new bootstrap.Modal(document.getElementById('modal-protocol-help'));
            helpModal.show();
        };
    }

        try {
            const res = await API.request(`/protocols/institution?inst=${instId}`);
            if (res && res.status === 'success') {
                allProtocols = res.data;
                setupSortHeaders();
                renderTable();
            }
        } catch (error) { console.error("❌ Error:", error); }

        document.getElementById('btn-search-prot').onclick = () => { currentPage = 1; renderTable(); };
        document.getElementById('btn-excel-prot').onclick = exportToExcel;
    }

    function setupSortHeaders() {
        document.querySelectorAll('th[data-sortable="true"]').forEach(th => {
            th.style.cursor = 'pointer';
            th.setAttribute('data-label', th.innerText.trim());
            th.onclick = () => {
                const key = th.getAttribute('data-key');
                if (sortConfig.key === key) {
                    sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : (sortConfig.direction === 'desc' ? 'none' : 'asc');
                } else { sortConfig.key = key; sortConfig.direction = 'asc'; }
                renderTable();
            };
        });
    }

    /**
     * 2. RENDERIZADO DE TABLA (SOLO LA GRILLA)
     */
    function renderTable() {
        const tbody = document.getElementById('table-body-protocols');
        const data = getFilteredAndSortedData();
        const pageData = data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

        tbody.innerHTML = '';
        pageData.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = "clickable-row";
            tr.onclick = () => window.openProtocolModal(p);
            
            const depto = p.IsExterno == 1 ? p.DeptoOriginal : (p.DeptoInterno || '---');
            const badgeExterno = p.IsExterno == 1 ? '<br><span class="badge bg-danger mt-1" style="font-size:8px">OTROS CEUAS</span>' : '';

            tr.innerHTML = `
                <td class="py-2 px-2 text-muted">${p.idprotA}</td>
                <td class="py-2 px-2 fw-bold">${p.nprotA}</td>
                <td class="py-2 px-2 small">${p.tituloA || '---'}</td>
                <td class="py-2 px-2">${p.InvestigadorACargA || '---'}</td>
                <td class="py-2 px-2">${p.ApellidoA || ''} ${p.NombreA || ''}</td>
                <td class="py-2 px-2 text-center fw-bold">${p.AniAprob || 0}</td>
                <td class="py-2 px-2 small text-muted">${p.EspeciesList || '---'}</td>
                <td class="py-2 px-2">${depto}</td>
                <td class="py-2 px-2 text-center">
                    <span class="badge bg-secondary">${p.TipoNombre || 'investigacion'}</span>
                    ${badgeExterno}
                </td>
                <td class="py-2 px-2">${p.Vencimiento || '---'}</td>
                <td class="py-2 px-2 small fw-bold">${p.SeveridadNombre || '---'}</td>
            `;
            tbody.appendChild(tr);
        });
        updateHeaderIcons();
        renderPagination(data.length, 'pagination-prot', renderTable);
    }

    function getFilteredAndSortedData() {
        const originFilter = document.getElementById('filter-origin').value;
        const term = document.getElementById('search-input-prot').value.toLowerCase().trim();
        const filterType = document.getElementById('filter-type-prot').value;

        let data = allProtocols.filter(p => {
            // 1. Filtro de Origen (CEUA Local vs Otros CEUAS)
            if (originFilter === 'interno' && p.IsExterno == 1) return false;
            if (originFilter === 'externo' && p.IsExterno != 1) return false;

            if (!term) return true;

            // 2. Lógica de búsqueda por columna
            if (filterType === 'all') {
                return JSON.stringify(p).toLowerCase().includes(term);
            }

            // Caso especial: Departamento (puede estar en dos propiedades distintas)
            if (filterType === 'DeptoBusqueda') {
                const deptoNombre = (p.IsExterno == 1 ? p.DeptoOriginal : p.DeptoInterno) || '';
                return deptoNombre.toLowerCase().includes(term);
            }

            // Búsqueda estándar para el resto de columnas
            const val = String(p[filterType] || '').toLowerCase();
            return val.includes(term);
        });

        if (sortConfig.direction !== 'none') {
            data.sort((a, b) => {
                let valA = a[sortConfig.key] || ''; let valB = b[sortConfig.key] || '';
                const factor = sortConfig.direction === 'asc' ? 1 : -1;
                return isNaN(valA) ? valA.toString().localeCompare(valB) * factor : (valA - valB) * factor;
            });
        } else { data.sort((a, b) => b.idprotA - a.idprotA); }
        return data;
    }

    // front/dist/js/pages/admin/protocolos.js

// front/dist/js/pages/admin/protocolos.js

window.openProtocolModal = async (p = null) => {
    const instId = localStorage.getItem('instId');
    const modalEl = document.getElementById('modal-protocol');
    const container = document.getElementById('modal-content-prot');

    container.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>`;
    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();

    if (!formDataCache) {
        const res = await API.request(`/protocols/form-data?inst=${instId}`);
        formDataCache = res.data;
    }

    let currentSpeciesIds = [];
    if (p) {
        const resSpec = await API.request(`/protocols/current-species?id=${p.idprotA}`);
        if (resSpec.status === 'success') currentSpeciesIds = resSpec.data;
    }

    const showOtrosCeuas = formDataCache.otrosceuas_enabled || (p && p.IsExterno == 1);
    const otrosCeuasHTML = showOtrosCeuas ? `
        <div class="col-12 mb-2">
            <div class="form-check form-switch bg-light p-2 rounded border shadow-sm">
                <input class="form-check-input ms-0 me-2" type="checkbox" name="protocoloexpe" id="chk-otros-ceuas" value="1"
                       ${p?.IsExterno == 1 ? 'checked' : ''} onchange="window.toggleDeptoInput(this)">
                <label class="form-check-label fw-bold text-danger small uppercase" for="chk-otros-ceuas">
                    Protocolo Externo (Otros CEUAS)
                </label>
            </div>
        </div>` : '';

    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
            <div class="d-flex align-items-center gap-3">
                <h5 class="fw-bold mb-0">${p ? 'Editar Protocolo' : 'Nuevo Protocolo'}</h5>
                ${p ? `<span class="badge bg-light text-secondary border fw-bold px-2 py-1" style="font-size: 11px;">IDPROTOCOLO: ${p.idprotA}</span>` : ''}
            </div>
            <div class="d-flex gap-2">
                ${p ? `<button type="button" class="btn btn-outline-danger btn-sm fw-bold" onclick="window.downloadProtocolPDF(${p.idprotA})">
                    <i class="bi bi-file-pdf me-1"></i> FICHA PDF
                </button>` : ''}
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
        </div>
        
        <div id="protocol-print-area">
            <div class="d-none d-print-block mb-4 text-center border-bottom pb-3">
                <h4 class="fw-bold mb-1 text-uppercase" style="letter-spacing: 1px;">
                    ${formDataCache.NombreCompletoInst || 'UNIDAD REACTIVOS BIOTERIO EXPERIMENTAL'}
                </h4>
                <p class="text-muted small mb-0 fw-bold">Ficha de protocolo</p>
            </div>

            <form id="form-protocolo">
                <input type="hidden" name="IdInstitucion" value="${instId}">
                <div class="row g-3">
                    ${otrosCeuasHTML}
                    <div class="col-md-8">
                        <label class="form-label small fw-bold text-muted uppercase">Título del Protocolo *</label>
                        <input type="text" name="tituloA" class="form-control" value="${p?.tituloA || ''}" required>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label small fw-bold text-muted uppercase">N° Protocolo *</label>
                        <input type="text" name="nprotA" class="form-control" value="${p?.nprotA || ''}" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-bold text-muted uppercase">Resp. Proyecto (Texto) *</label>
                        <input type="text" name="InvestigadorACargA" class="form-control" value="${p?.InvestigadorACargA || ''}" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-bold text-muted uppercase">Resp. Protocolo (Usuario) *</label>
                        <select name="IdUsrA" class="form-select" required>
                            <option value="">-- Seleccione --</option>
                            ${formDataCache.users.map(u => `<option value="${u.IdUsrA}" ${p?.IdUsrA == u.IdUsrA ? 'selected' : ''}>${u.ApellidoA}, ${u.NombreA}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-bold text-muted uppercase">Departamento *</label>
                        <select name="departamento" class="form-select">
                            ${formDataCache.depts.map(d => `<option value="${d.iddeptoA}" ${p?.departamento == d.iddeptoA ? 'selected' : ''}>${d.NombreDeptoA}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small fw-bold text-muted uppercase">Tipo *</label>
                        <select name="tipoprotocolo" class="form-select">
                            ${formDataCache.types.map(t => `<option value="${t.idtipoprotocolo}" ${p?.tipoprotocolo == t.idtipoprotocolo ? 'selected' : ''}>${t.NombreTipoprotocolo}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small fw-bold text-muted uppercase">Ani. Aprob. *</label>
                        <input type="number" name="CantidadAniA" class="form-control" value="${p?.CantidadAniA || 0}">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small fw-bold text-muted uppercase">Severidad</label>
                        <select name="severidad" class="form-select">
                            ${formDataCache.severities.map(s => `<option value="${s.IdSeveridadTipo}" ${p?.severidad == s.IdSeveridadTipo ? 'selected' : ''}>${s.NombreSeveridad}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-bold text-muted uppercase">Fecha Inicio *</label>
                        <input type="date" name="FechaIniProtA" class="form-control" value="${p?.FechaIniProtA || ''}">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-bold text-muted uppercase">Fecha Vencimiento *</label>
                        <input type="date" name="FechaFinProtA" class="form-control" value="${p?.FechaFinProtA || ''}">
                    </div>
                    <div class="col-12 mt-4">
                        <label class="form-label small fw-bold text-muted uppercase">Especies Asociadas *</label>
                        <div id="species-container">
                            ${currentSpeciesIds.length > 0 ? currentSpeciesIds.map(id => window.renderSpeciesRow(id)).join('') : window.renderSpeciesRow()}
                        </div>
                    </div>
                </div>
            </form>
        </div>

        <div class="mt-5 d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cerrar</button>
            <button type="submit" form="form-protocolo" class="btn btn-primary btn-sm px-4">
                ${p ? 'Guardar Cambios' : 'Crear Protocolo'}
            </button>
        </div>
    `;

    document.getElementById('form-protocolo').onsubmit = (e) => saveProtocol(e, p?.idprotA);
    if (p?.IsExterno == 1) window.toggleDeptoInput(document.getElementById('chk-otros-ceuas'), p.DeptoOriginal);
    window.updateAvailableSpecies();
};
    /**
     * 3. LÓGICA DINÁMICA (OTROS CEUAS, ESPECIES, FILTROS)
     */
    window.toggleDeptoInput = (checkbox, val = '') => {
        const sWrap = document.getElementById('wrapper-depto-select');
        const mWrap = document.getElementById('wrapper-depto-manual');
        const deptoS = document.getElementById('depto-select');
        const deptoM = document.getElementById('depto-manual');

        if (checkbox.checked) {
            sWrap.style.display = 'none'; mWrap.style.display = 'block';
            deptoS.required = false; deptoM.required = true; deptoM.value = val;
        } else {
            sWrap.style.display = 'block'; mWrap.style.display = 'none';
            deptoS.required = true; deptoM.required = false; deptoM.value = '';
        }
    };

    window.renderSpeciesRow = (selectedId = null) => {
        const picked = Array.from(document.querySelectorAll('select[name="especies[]"]')).map(s => s.value);
        const options = formDataCache.species.map(e => {
            const isPicked = picked.includes(String(e.idespA)) && selectedId != e.idespA;
            return `<option value="${e.idespA}" ${selectedId == e.idespA ? 'selected' : ''} ${isPicked ? 'disabled' : ''}>${e.EspeNombreA}</option>`;
        }).join('');
        return `<div class="row g-2 mb-2 species-row align-items-center">
            <div class="col-md-10"><select name="especies[]" class="form-select form-select-sm" onchange="window.updateAvailableSpecies()" required><option value="">-- Seleccionar --</option>${options}</select></div>
            <div class="col-md-2"><button type="button" class="btn btn-outline-danger btn-sm w-100" onclick="window.removeSpeciesRow(this)">X</button></div>
        </div>`;
    };

    window.addSpeciesRow = () => {
        const container = document.getElementById('species-container');
        const div = document.createElement('div'); div.innerHTML = window.renderSpeciesRow();
        container.appendChild(div.firstElementChild);
        window.updateAvailableSpecies();
    };

    window.updateAvailableSpecies = () => {
        const selects = document.querySelectorAll('select[name="especies[]"]');
        const picked = Array.from(selects).map(s => s.value).filter(v => v !== "");
        selects.forEach(s => {
            const current = s.value;
            Array.from(s.options).forEach(opt => {
                if (opt.value !== "" && opt.value !== current) opt.disabled = picked.includes(opt.value);
            });
        });
    };

    window.removeSpeciesRow = (btn) => {
        if (document.querySelectorAll('.species-row').length > 1) { btn.closest('.species-row').remove(); window.updateAvailableSpecies(); }
        else alert("Mínimo una especie.");
    };

    window.filterUserList = (input) => {
        const f = input.value.toLowerCase(); const s = document.getElementById('select-user-prot');
        for (let i = 1; i < s.options.length; i++) s.options[i].style.display = s.options[i].text.toLowerCase().includes(f) ? '' : 'none';
    };

    /**
     * 4. GUARDADO Y TABLA
     */
        async function saveProtocol(e, id) {
            e.preventDefault();
            console.log("📝 Ejecutando saveProtocol para ID:", id || 'NUEVO');
            
            const form = e.target;
            const fd = new FormData(form);
            const instId = localStorage.getItem('instId');

            // Validación básica
            if (fd.get('tituloA').trim().length < 5) {
                alert("El título es demasiado corto.");
                return;
            }

            // Construimos la URL agregando inst para mayor seguridad
            const url = id ? `/protocols/save?id=${id}&inst=${instId}` : `/protocols/save?inst=${instId}`;

            try {
                const res = await API.request(url, 'POST', fd);
                console.log("📥 Respuesta API:", res);

                if (res.status === 'success') {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('modal-protocol'));
                    if (modal) modal.hide();
                    
                    // Recargar la tabla para ver el nuevo protocolo
                    initProtocolosPage(); 
                } else {
                    alert("Error: " + res.message);
                }
            } catch (error) {
                console.error("❌ Error en la petición:", error);
            }
        }

    function updateHeaderIcons() {
        document.querySelectorAll('th[data-sortable="true"]').forEach(th => {
            const key = th.getAttribute('data-key');
            const icon = sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' ▲' : (sortConfig.direction === 'desc' ? ' ▼' : ' -')) : ' -';
            th.innerHTML = `${th.getAttribute('data-label')}${icon}`;
        });
    }

    function renderPagination(t, c, r) {
        const pag = document.getElementById(c); const total = Math.ceil(t / rowsPerPage);
        pag.innerHTML = ''; if (total <= 1) return;
        const btn = (l, p, d, a = false) => {
            const li = document.createElement('li'); li.className = `page-item ${d ? 'disabled' : ''} ${a ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#">${l}</a>`;
            if (!d) li.onclick = (e) => { e.preventDefault(); currentPage = p; r(); }; return li;
        };
        pag.appendChild(btn('Anterior', currentPage - 1, currentPage === 1));
        pag.appendChild(btn(1, 1, false, currentPage === 1));
        for (let i = Math.max(2, currentPage - 2); i <= Math.min(total - 1, currentPage + 2); i++) pag.appendChild(btn(i, i, false, i === currentPage));
        pag.appendChild(btn(total, total, false, currentPage === total));
        pag.appendChild(btn('Siguiente', currentPage + 1, currentPage === total));
    }

window.downloadProtocolPDF = async (id) => {
    const element = document.getElementById('protocol-print-area');
    if (!element) return;

    const clonedElement = element.cloneNode(true);
    const originalInputs = element.querySelectorAll('input, select');
    const clonedInputs = clonedElement.querySelectorAll('input, select');

    originalInputs.forEach((input, index) => {
        // LÓGICA ESPECIAL PARA EL SWITCH (Evita que aparezca el "1")
        if (input.type === 'checkbox') {
            if (input.id === 'chk-otros-ceuas' && input.checked) {
                const span = document.createElement('span');
                span.className = "d-block fw-bold text-danger mb-3";
                span.style.fontSize = "11px";
                span.innerText = "ESTE PROTOCOLO PERTENECE A OTROS CEUAS (EXTERNO)";
                clonedInputs[index].parentNode.replaceChild(span, clonedInputs[index]);
            } else {
                clonedInputs[index].remove(); // Eliminamos si no está marcado
            }
            return;
        }

        // Conversión normal de Selects e Inputs
        let text = input.tagName === 'SELECT' ? input.options[input.selectedIndex]?.text : input.value;
        const span = document.createElement('span');
        span.className = "d-block border-bottom py-1 fw-bold text-dark mb-2";
        span.style.fontSize = "12px";
        span.innerText = text || '---';
        clonedInputs[index].parentNode.replaceChild(span, clonedInputs[index]);
    });

    // Limpieza de UI y Botones
    clonedElement.querySelectorAll('button, .btn, .spinner-border, .alert').forEach(el => el.remove());
    
    // Mostramos el membrete y el ID
    const printHeader = clonedElement.querySelector('.d-none');
    if (printHeader) {
        printHeader.classList.remove('d-none');
        // Insertamos el ID justo debajo del título "Ficha de protocolo"
        const idBadge = document.createElement('div');
        idBadge.innerHTML = `<p class="text-secondary small fw-bold mt-2">IDPROTOCOLO: ${id}</p>`;
        printHeader.appendChild(idBadge);
    }

    const opt = {
        margin: [15, 15, 15, 15],
        filename: `Ficha_Protocolo_${id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(clonedElement).save();
    } catch (error) {
        console.error("Error al generar PDF:", error);
    }
};