# GROBO — Revisión operativa y seguridad (2026-11-02)

## Código preparado
- Acceso: reenvío de activación limitado, sin filtrar existencia de cuentas, con tokens separados lógicamente entre recuperación y activación.
- Contraseñas: se eliminan las claves predeterminadas de creación y reinicio; el titular establece la suya mediante enlace al correo registrado. Se verifican rol e institución.
- Roles: el historial contable y los resúmenes financieros exigen permisos, los investigadores no pueden consultar datos de otra persona.
- Contable: carga con error visible; se corrigió HTML de la tabla y manejo de importes nulos. Buscadores, listados pagado/debe, separación local/derivada y CSV por consulta.
- Facturación: solo pedidos cobrables por la sede; no mezclar deuda de otras instituciones.
- Protocolos: borrar creaciones manuales sin formularios/alojamientos en ninguna sede; rechazar solicitudes en lugar de borrarlas; bloquear rechazo si hay uso.
- Correo: credenciales solo por .env, límite de envíos por IP validada, destinatario y global.

## QA ejecutado
- PHP: validación de sintaxis de los controladores, modelos y rutas modificados.
- JS: validación de sintaxis de frontend e idiomas.
- BD producción **solo lectura**: el modelo contable recuperó los movimientos en dos sedes y un pedido de prueba no apareció en la sede que no lo cobra.
- No se alteró saldo, historial ni contraseñas en producción.

## Pendiente para publicación
- **No ejecutar una sincronización masiva de directorios**: producción está en una revisión distinta a la carpeta local. Preparar paquete, respaldo y matriz de compatibilidad antes de subir.
- Confirmar migraciones SQL pendientes (especialmente comprobantes, roles y tabla mail_rate_event).
- Validar rutas de ambas sedes, registro/confirmación/recuperación, pagos y reportes con usuarios de prueba.
- Integrar y probar en staging; no modificar el diseño existente.

## PHP del VPS
Ubuntu 24.04 LTS necesita, como mínimo, php8.3-fpm paquete `8.3.6-0ubuntu0.24.04.13` por las correcciones publicadas el 21-oct-2026. La cadena corta `php -v` no indica los parches de Ubuntu; verificar `dpkg-query -W php8.3-fpm`.

Archivo preparado: `scripts/grobo-upgrade-php-security.sh`. Se ejecuta como root, hace backup de configuración, actualiza paquetes, comprueba PHP-FPM y Nginx, y verifica el paquete corregido.

## SMTP Brevo

Brevo SMTP reemplaza a Resend. Se debe usar login SMTP y clave SMTP (no API key). Servidor: smtp-relay.brevo.com:587 con STARTTLS. Verificar el remitente y autenticar el dominio en Brevo.

Script: scripts/grobo-configurar-brevo-smtp.sh. Prueba STARTTLS, AUTH y aceptacion del correo antes de actualizar .env. Hace respaldo privado y escritura atomica. Credenciales en archivo temporal chmod 600, nunca en Git.

Detalles: docs/BREVO-SMTP-GROBO.md.

## Despliegue
1. Obtener permiso administrativo para actualizar paquetes y archivos en producción.
2. Aplicar parche PHP de seguridad primero y verificar servicios.
3. Configurar Brevo SMTP, probar y confirmar recepción real del correo.
4. Hacer respaldo reciente de base de datos y de la app; ejecutar migraciones autorizadas.
5. Desplegar revisión integrada sobre staging, comprobar regresiones y después instalar en producción.
6. Verificar contable, protocolos en red y acceso de usuario, sin tocar registros históricos.

No dar por ejecutados los pasos bloqueados por privilegios o credenciales del proveedor.
