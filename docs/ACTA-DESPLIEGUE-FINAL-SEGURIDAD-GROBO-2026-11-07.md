# GROBO — Acta final del despliegue de seguridad

**Fecha:** 7 de noviembre de 2026

## Despliegue confirmado

La actualización de seguridad se publicó en producción, bajo el VPS autorizado de GROBO, en dos fases.

**Primera fase:** 3 archivos PHP independientes de autenticación (administración de salas e instrumentos y protocolos de red), con respaldo privado:
`/root/grobo-managed-backup-20261107T180235Z`.

**Segunda fase:** paquete completo `security-8adf4ad` de 13 archivos PHP, con respaldo privado:
`/root/grobo-managed-backup-20261107T181220Z`.

La segunda fase incluyó:
- Verificación de sintaxis de 13 archivos, configuración de Nginx y PHP-FPM.
- Comprobación **de solo lectura** de conectividad MySQL y columnas requeridas de nueve tablas.
- Rotación autorizada de `JWT_SECRET` usando 256 bits aleatorios generados exclusivamente en el VPS. El valor nunca se imprimió ni salió del servidor.
- Respaldo privado de `.env` anterior en `/root/grobo-jwt-before-rotation-*/production.env`.
- Publicación controlada con copia de seguridad y reversión de archivos en caso de fallo.
- Verificación de firma y lectura de JWT de prueba en PHP, sin usuarios reales.
- Nueva comprobación de base de datos y respuesta pública HTTP de URBE y CUPAE.

La consola confirmó:
```text
GROBO_ROTATION_AND_FULL_SECURITY_DEPLOY_DONE
GROBO_CONTROLLED_DEPLOY_OK version=security-8adf4ad files=13
GROBO_JWT_SIGN_VERIFY_OK
GROBO_DATABASE_SCHEMA_POSTCHECK_OK
```

**Efecto esperado:** los tokens JWT antiguos quedaron invalidados y los usuarios deben volver a iniciar sesión. No se borraron cuentas, protocolos, pagos, formularios ni reservas.

## Verificaciones independientes después de la publicación

- Comparación SHA-256 de los **13 archivos PHP** contra el manifiesto: **13/13 idénticos**, sin diferencias.
- `php -l` correcto para cada archivo publicado.
- `JWT_SECRET_PREFLIGHT_OK`; `nginx` y `php8.3-fpm` activos; PHP `8.3.6-0ubuntu0.24.04.13`.
- **96/96 pruebas PHP en contenedor aislado**: autenticación, roles, reservas, protocolos, consultas contables y red institucional. No sustituyen operaciones reales autenticadas.
- **18/18 pruebas públicas en Chrome con JS activo**, anchos 390, 768 y 1366 px: URBE/CUPAE, noticias, QR y confirmación de cuentas, sin errores JS, HTTP 5xx ni desbordes horizontales.
- **17 endpoints HTTP GET de solo lectura**, 14 privados sin sesión y tres públicos: los 14 privados devolvieron error, sin ninguna respuesta `status=success`. De los privados, 7 retornaron códigos HTTP de rechazo correctos (401/403), y otros 7 mantienen códigos heredados (200/404) pese a JSON `status=error`. **Se recomienda homogeneizar estos códigos**.
- Dos endpoints que previamente devolvían HTML/no JSON sin sesión ahora devuelven JSON HTTP 401; rutas de protocolos que daban HTTP 500 al no estar autenticado ahora responden HTTP 401.

## Pendiente de auditoría por rol con sesión real

1. Iniciar sesión en URBE y CUPAE con cuentas de **prueba**, verificando administración, investigador, contador y superadmin.
2. Revisar facturación por institución, historial, búsqueda por persona, exportaciones y saldos sin introducir cobros de prueba sobre datos reales.
3. Validar aprobación/rechazo/edición de protocolos locales y en red, y sus restricciones cuando existen formularios, sin borrar registros reales.
4. Completar pruebas de solicitudes de animales e insumos, reserva de salas/instrumentos y acciones con códigos QR válidos.
5. Confirmar entrega real de notificaciones de Brevo y enlaces de activación en buzones controlados.
6. Revisar compatibilidad con iOS Safari y Android Chrome en dispositivos físicos.

No declarar esos recorridos funcionales **probados** hasta usar usuarios de ensayo autorizados; las pruebas públicas y fixtures no los sustituyen.

## Código y rollback

- Cambios de seguridad funcional: commit `8adf4ad`.
- Herramientas de publicación y preparación: commit `d021eaf` y posteriores.
- Verificador reproducible: `scripts/grobo-verify-security-live.py`.
- Las copias del `.env` anterior y de los archivos previos permanecen solo en `/root` con permisos restringidos.
- **No restaurar automáticamente la clave JWT antigua**, porque era corta. Si hubiera una incidencia de autenticación, diagnosticarla y conservar la clave nueva siempre que sea posible.

Ningún archivo privado de configuración ni clave se incorporó a Git.
