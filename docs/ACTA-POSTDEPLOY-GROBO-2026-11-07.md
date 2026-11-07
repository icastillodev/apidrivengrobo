# GROBO — Verificación posdespliegue (2026-11-07)

## Estado: despliegue ejecutado y comprobaciones públicas aprobadas

Se ejecutó el procedimiento autorizado `/home/geckosadm/grobo-ops/grobo-completar-actualizacion.sh` en el VPS. La consola confirmó `GROBO_UPDATE_DONE`. Esta acta no sustituye las pruebas con sesiones autenticadas de URBE y CUPAE.

### Infraestructura y seguridad
- PHP-FPM: **8.3.6-0ubuntu0.24.04.13**, comprobado mediante `dpkg-query -W php8.3-fpm`.
- `nginx` y `php8.3-fpm`: **active** tras el despliegue.
- Las comprobaciones de configuración `php-fpm8.3 -t` y `nginx -t` pasaron durante el procedimiento con `sudo`. Repetirlas como usuario no administrativo puede dar errores de permisos de archivos PID y configuración.
- Versión de código desplegada: paquete verificado de la rama `fix/grobo-seguridad-facturacion-20261102`, release de aplicación `7e1ff7f`. Los siguientes commits de la rama ajustaron el procedimiento operativo sin alterar los 115 archivos de la app.
- Comparación byte por byte de los 115 archivos del paquete con los publicados en `/var/www/html/app` y `/var/www/html/core-backend-gem`: **115 coincidencias exactas, 0 faltantes, 0 diferentes**.
- Respaldo de configuración PHP/Nginx: `/root/grobo-php-security-*.tar.gz` (elegir respaldo correcto por fecha y verificarlo antes de restaurar).
- Respaldo de configuración previa SMTP: `/root/grobo-smtp-env-before-brevo-20261107T154725Z`.
- Respaldo de archivos de aplicación anteriores: `/root/grobo-backup-release-20261107T154726Z`.
- El archivo `.env` de producción tiene permisos **640**. Los archivos temporales que contenían credenciales SMTP fueron eliminados del VPS y del escritorio de Tojito.

### Brevo — SMTP
- Servidor SMTP: `smtp-relay.brevo.com:587`, con STARTTLS.
- Autenticación validada previamente mediante `BREVO_SMTP_AUTH_OK`.
- La IP de salida del VPS fue autorizada en Brevo; se superó el error SMTP 525.
- Test de envío real: `BREVO_SMTP_TEST_ACCEPTED` y `BREVO_ENV_UPDATED`.
- El programa de reactivación produjo `ACTIVATIONS_ATTEMPTED=2;SENT=2` y dos resultados `LINK_SENT` para cuentas pendientes de URBE. **Aceptación por SMTP no prueba lectura, llegada al inbox ni activación del usuario**. Verificar por separado con destinatario y registros de Brevo.

### Comprobaciones HTTP en producción
Las siguientes rutas devolvieron **HTTP 200**:
- `https://app.groboapp.com/urbe/`
- `https://app.groboapp.com/cupae/`
- `https://app.groboapp.com/dist/style/css/responsive-polish.css`
- `https://app.groboapp.com/dist/js/utils/qrAuthSession.js`
- `https://app.groboapp.com/paginas/confirmar.html`
- `https://app.groboapp.com/paginas/qr-sala.html`
- `https://app.groboapp.com/paginas/noticia-publica.html`

### Prueba de navegador real sin iniciar sesión
Script reproducible: `node tools/audit-grobo-live-public.mjs` (usa `playwright-core` instalado en `%TEMP%\grobo-ux-audit`); reporte JSON en `%TEMP%\grobo-ux-audit\report\postdeploy-public-smoke.json`.

Se comprobó en Chrome con JS habilitado:
- URBE login, CUPAE login, noticia pública con ID inválido, QR de sala sin token, QR de todas las salas sin token y confirmación sin token.
- Anchos de viewport: **390, 768 y 1366 píxeles** (6 vistas × 3 anchos = **18 pruebas**).
- Resultado: **18 respuestas HTTP 200, 0 desbordes horizontales, 0 errores JS en la consola de página, 0 errores HTTP 5xx**.
- La hoja `responsive-polish.css` estaba enlazada en las 18 comprobaciones.
- Sin credenciales y sin tokens QR válidos, estas pruebas verifican render y tolerancia a entradas inválidas, **no** los flujos completos de reserva, formularios o aprobación.

## QA funcional autenticado pendiente
1. Confirmar llegada de correo de prueba y de activación; validar SPF, DKIM, reputación, enlaces y expiración en Brevo.
2. Iniciar sesión como administrador de URBE y CUPAE y como investigador con cuentas de prueba autorizadas.
3. Revisar aislamiento de facturación por institución, historial de pagos, filtros por investigador y exportaciones PDF/Excel con datos anonimizados o de prueba.
4. Revisar permisos para rechazar/eliminar protocolos según origen y cantidad de formularios, incluso protocolos compartidos entre instituciones; **no usar registros reales para probar borrado**.
5. Completar solicitud de animales, insumos y reactivos, reservas y vistas QR con datos de prueba.
6. Validar navegación, modales, calendarios, foco y desplazamiento de tablas en Safari iOS y Chrome Android, además de tablets.
7. Comprobar monitoreo y logs posteriores al lanzamiento; documentar incidencias antes de nuevas modificaciones.

## Comando de verificación de archivos
`bash /home/geckosadm/grobo-ops/grobo-postdeploy-verify-20261107.sh`

El comparador, la prueba HTTP y los demás checks son de **solo lectura**. Las operaciones administrativas y de recuperación de datos requieren `sudo` y deben ejecutarse solo con respaldo validado.
