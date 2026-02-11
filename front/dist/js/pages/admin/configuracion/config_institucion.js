import { API } from '../../../api.js';

export async function initConfigInstitution() {
    const instId = localStorage.getItem('instId');

    // 1. Cargar Datos
    try {
        const res = await API.request(`/admin/config/institution?inst=${instId}`);
        if (res.status === 'success') {
            const d = res.data;
            
            // Llenar inputs
            document.getElementById('in-nombre').value = d.NombreCompletoInst || '';
            document.getElementById('in-web').value = d.Web || '';
            document.getElementById('in-correo').value = d.InstCorreo || '';
            document.getElementById('in-dir').value = d.InstDir || '';
            document.getElementById('in-contacto').value = d.InstContacto || '';
            document.getElementById('in-localidad').value = d.Localidad || '';
            document.getElementById('in-pais').value = d.Pais || '';
            document.getElementById('in-precio').value = d.PrecioJornadaTrabajoExp || 0;
            
            // Select Moneda
            const moneda = d.Moneda || 'UYU';
            document.getElementById('sel-moneda').value = moneda;

            // Checkbox Otros CEUAS (Convertir 1/0 a true/false)
            document.getElementById('check-otrosceuas').checked = (d.otrosceuas == 1);
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'No se pudo cargar la configuración.', 'error');
    }

    // 2. Manejo del Guardado
    document.getElementById('form-institution').onsubmit = async (e) => {
        e.preventDefault();
        
        const fd = new FormData(e.target);
        fd.append('instId', instId);
        
        // Manejo manual del checkbox (porque si no está marcado, no se envía)
        const isChecked = document.getElementById('check-otrosceuas').checked ? 1 : 0;
        fd.append('otrosceuas', isChecked);

        Swal.fire({ title: 'Guardando...', didOpen: () => Swal.showLoading() });

        try {
            const res = await API.request('/admin/config/institution/update', 'POST', fd);
            if (res.status === 'success') {
                await Swal.fire({
                    title: '¡Actualizado!',
                    text: 'La información de la institución se ha guardado correctamente.',
                    icon: 'success',
                    confirmButtonColor: '#1a5d3b'
                });
                
                // Actualizar localStorage por si cambió el nombre
                // (Opcional, si el backend devolviera el nuevo nombre corto)
                
            } else {
                Swal.fire('Error', res.message || 'Error desconocido', 'error');
            }
        } catch (err) {
            Swal.fire('Error', 'Fallo de conexión al guardar.', 'error');
        }
    };
}