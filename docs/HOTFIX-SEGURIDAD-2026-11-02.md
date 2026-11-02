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

## SMTP Resend
El SMTP actual rechaza con `550 API key is invalid`. Crear **nueva API key** desde la cuenta Resend autorizada; no copiarla al chat, al código ni a Git.
Archivo preparado: `scripts/grobo-rotate-resend-smtp.sh`. Requiere root, solicita la clave por terminal sin mostrarla, envía un correo de prueba antes de reemplazar el secreto en `.env`, hace backup protegido y pide revocar la clave antigua en el proveedor.

## Despliegue
1. Obtener permiso administrativo para actualizar paquetes y archivos en producción.
2. Aplicar parche PHP de seguridad primero y verificar servicios.
3. Rotar Resend y confirmar recepción real de email.
4. Hacer respaldo reciente de base de datos y de la app; ejecutar migraciones autorizadas.
5. Desplegar revisión integrada sobre staging, comprobar regresiones y después instalar en producción.
6. Verificar contable, protocolos en red y acceso de usuario, sin tocar registros históricos.

No dar por ejecutados los pasos bloqueados por privilegios o credenciales del proveedor.
