# GROBO — CSV personal por lotes y memoria acotada

**Fecha:** 12/11/2026
**Alcance:** botón de Excel/CSV de Mis Formularios, sin cambios en base, saldos, stock ni protocolos.

## Nueva ruta autenticada

`GET /user/my-forms-csv?start=YYYY-MM-DD&end=YYYY-MM-DD&lang=es|en|pt`

- Obtiene usuario e institución exclusivamente del JWT mediante `Auditoria::getDatosSesion`. No admite IDs de usuario o institución tomados del navegador.
- Valida fechas reales y rango ordenado; admite los tres idiomas de GROBO.
- Obtiene hasta **20.000 IDs canónicos** autorizados en un único SELECT liviano y con orden descendente. Si hay más de 20.000 rechaza con HTTP 413 y JSON; **nunca genera CSV truncado**.
- Procesa los IDs capturados en lotes de **100**, repitiendo el WHERE de visibilidad de cada usuario al cargar sus datos completos. Se recuperan snapshots originales, derivaciones, participantes y saldos de los mismos métodos del listado, no de cálculos alternativos.
- Filtra por `Inicio` **después** de recuperar los snapshots, para conservar el significado de las fechas originales de formularios derivados.
- Genera el CSV en un archivo temporal privado del servidor y sólo envía encabezados/bytes cuando todas las consultas fueron válidas. Si una institución pierde acceso o un formulario desaparece entre el listado de IDs y su lectura, responde 409 con JSON, sin CSV parcialmente enviado.
- Cabeceras CSV `Content-Type: text/csv`, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`; UTF-8 BOM y delimitador punto y coma, con escape de comillas, control de nuevas líneas y neutralización de fórmulas Excel (signos =,+,-,@).
- En los casos de cero registros correspondientes a las fechas, devuelve un mensaje JSON 404, no un archivo vacío.
- **Nunca** escribe en la base ni muta registros científicos o facturación.

## Interfaz

- Intenta la nueva descarga mediante `fetch` con Authorization Bearer, sin mantener cientos o miles de objetos de formularios en memoria del navegador; el navegador sólo recibe el archivo CSV.
- La exportación paginada JS anterior se conserva como **respaldo de compatibilidad** únicamente si la ruta del backend todavía no existe (HTTP 404 no-JSON). Errores de permisos, límite, cambios concurrentes y datos insuficientes detienen la descarga; no se ocultan con un fallback.
- Mantiene la ventana/modal de Excel y rango de fechas; el idioma de descarga sigue la interfaz cuando se determina `es`, `en` o `pt`.
- El HTML importa la versión `20261112h` de Mis Formularios para neutralizar copias antiguas de Cloudflare.

## Pruebas realizadas (sin datos institucionales)

- Test PHP sintético `tests/qa_userforms_pagination_20261112.php`: **8/8**.
- MySQL 8.4 aislado, PDO nativo: `tests/qa_userforms_mysql_integration_20261112.php`: **6/6**.
- MySQL 8.4 aislado, servicio CSV: `tests/qa_userforms_csv_mysql_20261112.php`: **7/7**: 13 columnas, snapshots, 2 instituciones, saldos, idiomas, protección de fórmulas, 253 filas en 3 lotes, fechas, límites, aislamiento y cambios concurrentes.
- Chrome con 205 pedidos de ensayo `tests/qa_myforms_paged_browser_20261112.mjs`: **8/8**: incluye uso del Bearer, archivo CSV real, fallback legacy y error 403 sin descarga.

## Límites actuales

- Tope de 20.000 formularios visibles por archivo, **no por rango de fechas**: el snapshot de IDs se captura antes de aplicar el rango efectivo para respetar los snapshots originales. Si el usuario supera el límite debe reducirse por consulta/indexación en una fase posterior.
- El archivo temporal puede utilizar disco si la exportación excede memoria de PHP. El navegador aún recibe un `Blob` final, pero evita materializar JSON de cada fila.
- Las ediciones de importes entre lotes no se congelan transaccionalmente: el conjunto de IDs es estable, pero los atributos de un formulario pueden cambiar durante la exportación. Una exportación con snapshot transaccional requiere diseño adicional de consistencia y presupuesto de bloqueos.
- No hay cuentas institucionales de ensayo autorizadas disponibles para validación funcional auténtica en URBE y CUPAE, ni p50/p95 autenticados del VPS.
