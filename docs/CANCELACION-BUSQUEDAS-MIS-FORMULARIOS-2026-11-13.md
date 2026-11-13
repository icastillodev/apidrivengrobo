# GROBO — Cancelación de peticiones obsoletas de Mis Formularios

**Fecha:** 13/11/2026. **Alcance:** mejora de UX y consumo de red para Mis Formularios. Sin SQL, sin alteraciones a datos científicos, sin migraciones ni activación del índice documental.

## Problema verificado

La página ya desechaba respuestas anteriores con `listRequestGeneration`, pero el request HTTP viejo seguía activo durante el debounce de búsqueda (280 ms) y podía continuar descargando un JSON que ya no correspondía al filtro actual. En cambios rápidos de página también se creaban solicitudes superpuestas.

## Cambio aplicado

- `front/dist/js/pages/usuario/misformularios.js` añade `activeListRequest` con un `AbortController` por llamada paginada. Se pasa `signal` al cuarto argumento soportado por `API.request` sin modificar el API compartido.
- Al comenzar otra carga, se aborta la anterior. En `onMyFormsFilterChanged()` la cancelación ocurre **al escribir o cambiar el filtro**, antes de los 280 ms de debounce.
- `listRequestGeneration` se conserva como segundo resguardo: si un transporte simulado ignora el aborto, una respuesta vieja no puede pintar filas ni errores sobre los filtros nuevos.
- El controlador se limpia en `finally` únicamente si sigue perteneciendo a esa llamada; otra solicitud no pierde su propio controlador por una respuesta tardía.
- La rama de compatibilidad con servidores antiguos sigue funcionando y no cancela el `fullHistoryPromise` que otras exportaciones pueden compartir. Tampoco cambia el tratamiento de HTTP 401/403.
- El HTML referencia `misformularios.js?v=20261113a` para evitar que una caché anterior impida activar el cambio.

**Límite importante:** `AbortController` libera trabajo de red y evita transferencias obsoletas en el navegador; **no garantiza que PHP-FPM interrumpa inmediatamente una consulta SQL ya iniciada**. No se afirma una reducción cuantificada de CPU de servidor.

## Pruebas

- `tests/qa_myforms_paged_browser_20261112.mjs`: **19/19 pruebas** con Chrome ficticio, añadiendo (1) cancelar petición de búsqueda antes del debounce, (2) impedir que una respuesta tardía que ignora `AbortController` sobreescriba el resultado vigente y (3) cancelar la página anterior al navegar rápidamente de la página 2 a la 3.
- Las pruebas también conservan paginación de 12, metadatos, filtros, exportación, JWT, errores HTTP 403 sin fallback inseguro y ayuda localizada ES/EN/PT.
- Regresión general PHP **96/96**, paginación personal **8/8**, render/PDF **6/6**, exportaciones CSV **7/7**.
- Auditoría estática: **187 JS, 84 HTML, 447 imports**, sin errores de sintaxis, referencias o módulos.
- `git diff --check` sin errores.

## Fuera de alcance

- No instala tablas/triggers, no habilita `GROBO_MYFORMS_SEARCH_INDEX`, no modifica lógica de permisos entre instituciones.
- No reemplaza un QA autenticado en producción con usuarios de ensayo autorizados de URBE/CUPAE.
- El rendimiento de texto libre sin filtros todavía depende de la hidratación del historial completo en el backend, aunque el navegador solo recibe la página solicitada.

## Despliegue controlado y postdeploy

- **Commit funcional:** `ca5018e`, rama `fix/grobo-seguridad-facturacion-20261102`, sincronizado con GitHub.
- **Release:** `myforms-abort-ca5018e`, exactamente **2 archivos frontend**: JavaScript de Mis Formularios y HTML que carga su versión `20261113a`.
- Validación: `GROBO_MANIFEST_OK version=myforms-abort-ca5018e files=2`.
- Instalador controlado: `GROBO_CONTROLLED_DEPLOY_OK version=myforms-abort-ca5018e files=2`. **Respaldo:** `/root/grobo-managed-backup-20261113T214508Z`.
- **2/2 SHA-256** contrastados desde los archivos instalados en VPS: JS `052e90f4143cb2e96e22ad2ce7b36dffef28d62d0bd3ba6983f5b3b402ecf92d`; HTML `ce7891947a97287f8926e369fcbf61b8dbd6629272b98f67983ce794d82470dc`.
- Estado posterior: Nginx y PHP-FPM activos, JWT preflight correcto, `TENANT_SECURITY_LIVE=yes`.
- **10/10 pruebas públicas postdeploy**, incluyendo versión exacta de HTML/JS, 5 rutas privadas devolviendo 401 JSON sin datos, y redirecciones al login a 390/768/1366 px.
- No se tocó la base de datos, no se migró esquema, no se habilitó índice textual con triggers. **Sin sesión institucional autorizada no se realizó QA autenticado de URBE/CUPAE**, ni se atribuye una mejora cuantitativa de latencia del backend a esta optimización del navegador.
