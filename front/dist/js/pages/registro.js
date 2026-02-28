// front/dist/js/pages/registro.js
import { Auth } from '../auth.js';
import { API } from '../api.js';

const basePath = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? '/URBE-API-DRIVEN/front/' : '/';

let isUserValid = false;
let isPassValid = false;
let isPassLengthValid = false;

export async function initRegistro() {
    // 1. Inicializar branding y validación de sede
    await Auth.init();
    
    // --- NUEVO: RECUPERAR DATOS DE INSTITUCIÓN Y ACTUALIZAR UI ---
    const instId = localStorage.getItem('instId');
    const instSlug = localStorage.getItem('NombreInst'); // El slug que guardas en storage
    const instFullName = localStorage.getItem('instFullName') || ''; // Opcional, si tienes el nombre largo

    // Si por algún motivo no hay institución válida, mostramos el error y ocultamos el form
    if (!instId || !instSlug) {
        document.getElementById('auth-content').classList.add('hidden');
        document.getElementById('error-state').classList.remove('hidden');
        return; // Detenemos la ejecución aquí
    }

    // Actualizamos los textos en el HTML (quitamos el "Validando...")
    document.getElementById('reg-inst-name').innerText = instSlug.toUpperCase();
    document.getElementById('reg-inst-description-name').innerText = instSlug.toUpperCase();
    if (document.getElementById('reg-inst-full-name')) {
        document.getElementById('reg-inst-full-name').innerText = instFullName;
    }

    // Actualizamos el enlace del botón "Volver al Login"
    const btnVolver = document.getElementById('btn-volver-login');
    if (btnVolver) {
        btnVolver.href = `${basePath}${instSlug}/`;
    }
    // -------------------------------------------------------------

    // 2. Cargar países con detección de IP (blindado contra errores 429/CORS)
    await loadCountriesAndDetect();

    const form = document.getElementById('registro-form');
    const userInput = document.getElementById('reg-user');
    const passInput = document.getElementById('reg-pass');
    const confirmInput = document.getElementById('reg-pass-confirm');
    const btnSubmit = document.getElementById('btn-finalizar');

    // --- VALIDACIÓN DE USUARIO EN TIEMPO REAL ---
    let typingTimer;
    userInput.addEventListener('keyup', () => {
        clearTimeout(typingTimer);
        const val = userInput.value.trim();
        
        if (val.length < 3) {
            hideUserFeedback();
            isUserValid = false;
            checkFormValidity();
            return;
        }

        typingTimer = setTimeout(async () => {
            const res = await API.request(`/check-username?user=${val}`);
            isUserValid = res.available;
            
            // Feedback visual: Verde si disponible / Rojo si existe
            document.getElementById('user-error').classList.toggle('hidden', isUserValid);
            document.getElementById('user-success').classList.toggle('hidden', !isUserValid);
            checkFormValidity();
        }, 500);
    });

    // --- VALIDACIÓN DE CONTRASEÑAS ---
    const validatePass = () => {
        const p1 = passInput.value;
        const p2 = confirmInput.value;
        
        // Regla: 5 a 20 caracteres
        isPassLengthValid = (p1.length >= 5 && p1.length <= 20);
        
        // Regla: Coincidencia exacta
        isPassValid = (p1 === p2 && p1 !== "" && isPassLengthValid);
        
        document.getElementById('pass-error').classList.toggle('hidden', p1 === p2 || p2 === "");
        checkFormValidity();
    };

    passInput.addEventListener('keyup', validatePass);
    confirmInput.addEventListener('keyup', validatePass);

    /**
     * Control del estado del botón de envío
     */
    function checkFormValidity() {
        const canSubmit = isUserValid && isPassValid && isPassLengthValid;
        btnSubmit.disabled = !canSubmit;
        if (canSubmit) {
            btnSubmit.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            btnSubmit.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }

    function hideUserFeedback() {
        document.getElementById('user-error').classList.add('hidden');
        document.getElementById('user-success').classList.add('hidden');
    }

    // --- ENVÍO DEL FORMULARIO CON CARGA ---
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        // Bloqueo para evitar envíos múltiples
        btnSubmit.disabled = true;
        Swal.fire({
            title: 'Procesando Registro...',
            html: `Estamos creando su cuenta en <b>${instSlug.toUpperCase()}</b>, por favor espere.`,
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        // Contexto institucional desde el storage
        data.IdInstitucion = instId; // Ya lo capturamos arriba

        try {
            // Enviamos el registro a la API inyectando el slug en la URL
            const res = await API.request(`/register?inst=${instSlug}`, 'POST', data);
            
            Swal.close();

            if (res.status === 'success') {
                Swal.fire({
                    title: '¡REGISTRO ENVIADO!',
                    html: `
                        <div class="text-center">
                            <p>Se ha enviado un mail a <b>${data.EmailA}</b>.</p>
                            <p class="mt-2 text-sm italic">Confirme su cuenta para activar su acceso.</p>
                            <div class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-amber-700 font-bold uppercase text-[10px]">
                                IMPORTANTE: Si no lo recibes, revisa tu carpeta de CORREO NO DESEADO (SPAM).
                            </div>
                        </div>
                    `,
                    icon: 'success',
                    confirmButtonColor: '#000',
                    confirmButtonText: 'VOLVER AL LOGIN'
                }).then(() => {
                    window.location.href = `${basePath}${instSlug}/`;
                });
            } else {
                btnSubmit.disabled = false;
                Swal.fire("Error", res.message || "Error en el servidor", "error");
            }
        } catch (err) { 
            btnSubmit.disabled = false;
            Swal.close();
            console.error(err); 
        }
    };
}

/**
 * Carga lista de países y detecta el país del usuario (Blindado)
 */
async function loadCountriesAndDetect() {
    const select = document.getElementById('reg-pais');
    if (!select) return;

    try {
        let userCountryCode = 'UY'; // Por defecto Uruguay

        // Detección por IP con manejo de errores 429/CORS
        try {
            const ipRes = await fetch('https://ipapi.co/json/');
            if (ipRes.ok) {
                const ipData = await ipRes.json();
                userCountryCode = ipData.country_code;
            }
        } catch (ipErr) {
            console.warn("Detección de país falló. Usando default.");
        }

        // Carga de lista oficial de países
        const resCountries = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2');
        const countries = await resCountries.json();
        
        const sortedCountries = countries.sort((a, b) => a.name.common.localeCompare(b.name.common));
        
        select.innerHTML = sortedCountries.map(c => `
            <option value="${c.name.common}" ${c.cca2 === userCountryCode ? 'selected' : ''}>
                ${c.name.common}
            </option>
        `).join('');

    } catch (e) {
        // Fallback manual si fallan las APIs externas
        select.innerHTML = '<option value="Uruguay" selected>Uruguay</option><option value="Argentina">Argentina</option>';
    }
}