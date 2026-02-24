// front/dist/js/components/LoaderComponent.js

export function showLoader() {
    const oldLoader = document.getElementById('global-loader');
    if (oldLoader) oldLoader.remove();

    const loader = document.createElement('div');
    loader.id = 'global-loader';
    
    // Clases de Bootstrap 5 para centrado total y pantalla completa
    loader.className = "position-fixed top-0 start-0 vw-100 vh-100 d-flex flex-column align-items-center justify-content-center";
    loader.style.backgroundColor = "#f4f7f6";
    loader.style.zIndex = "10000";
    loader.style.transition = "opacity 0.8s ease";

    loader.innerHTML = `
        <div class="text-center">
            <div class="mb-4 ">
                <img class="rounded mx-auto d-block" src="../../../dist/multimedia/imagenes/grobo/grobo.png" 
                     alt="Gecko Dev" 
                     class="img-fluid" 
                     style="width: 150px; filter: drop-shadow(0px 4px 4px rgba(0,0,0,0.05));">
            </div>
            
            <div class="d-flex flex-column align-items-center">
                <h1 class="h5 fw-bold text-uppercase mb-1" style="color: #1a5d3b; letter-spacing: 5px;">
                    GROBO - ERP BIOTERIOS <br>Gekos.uy & UDELAR - Unidad de Reactivos y Biomodelos de Experimentación
                </h1>
                <p class="small text-muted text-uppercase" style="letter-spacing: 3px; font-size: 10px;">
                    Cargando entorno seguro...
                </p>
            </div>
        </div>
    `;

    document.body.prepend(loader);

    // Ajustamos a 2.5 segundos para que se aprecie pero no canse
    setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => {
            if (loader.parentNode) loader.remove();
        }, 550);
    }, 1000);
}
export function hideLoader() {
    const loader = document.getElementById('main-loader');
    if (loader) loader.classList.add('d-none');
}