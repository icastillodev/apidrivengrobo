export async function initFormularios() {
    const instId = localStorage.getItem('instId');
    const container = document.getElementById('main-content');

    try {
        const response = await fetch(`/URBE-API-DRIVEN/api/institution-linked?inst=${instId}`);
        const res = await response.json();
        
        if (res.status === "success") {
            renderSedes(container, res.data);
        }
    } catch (err) {
        console.error("Gecko Error: Fallo al cargar sedes vinculadas.", err);
    }
}

function renderSedes(container, sedes) {
    if (sedes.length === 0) {
        container.innerHTML = `<p class="text-center p-5 text-muted">No tenés sedes configuradas.</p>`;
        return;
    }

    const html = sedes.map(sede => `
        <div class="card mb-4 border-success shadow-sm overflow-hidden">
            <div class="card-body p-4">
                <div class="mb-3">
                    <h3 class="h5 mb-0 text-success fw-bold">${sede.NombreCompletoInst}</h3>
                    <span class="badge bg-light text-dark border">${sede.NombreInst}</span>
                </div>
                
                <div class="d-grid gap-2 d-md-flex">
                    <a href="formularioinsumos.html?inst=${sede.IdInstitucion}" class="btn btn-success flex-grow-1">
                        <i class="bi bi-box-seam me-2"></i> Nuevo Formulario Insumos
                    </a>
                    <a href="formularioanimales.html?inst=${sede.IdInstitucion}" class="btn btn-outline-success flex-grow-1">
                        <i class="bi bi-bug me-2"></i> Nuevo Formulario Animales
                    </a>
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="max-w-3xl mx-auto py-5 px-3">
            <h2 class="h4 mb-4 text-center">Gestión de Formularios por Sede</h2>
            <div class="sedes-list">${html}</div>
        </div>
    `;
}