# Backblaze B2 – Adjuntos en Solicitud de Protocolo

Para que los **3 adjuntos** de la solicitud de protocolo se guarden en tu bucket de Backblaze B2, necesitas configurar las siguientes variables en el archivo **`api/.env`**.

## 1. Variables requeridas en `api/.env`

Añade (o completa) estas líneas:

```env
# Backblaze B2 - Adjuntos solicitud protocolo
B2_KEY_ID=tu_key_id_de_aplicacion
B2_APPLICATION_KEY=tu_application_key
B2_BUCKET_ID=tu_bucket_id
B2_BUCKET_NAME=nombre_del_bucket
```

### Cómo obtener cada valor

| Variable | Dónde se obtiene |
|--------|-------------------|
| **B2_KEY_ID** | En el panel de Backblaze B2: **App Keys** → Create New Key → **keyID** (empieza con un número). |
| **B2_APPLICATION_KEY** | El mismo paso: al crear la key te muestra la **applicationKey** (solo se muestra una vez; guárdala). |
| **B2_BUCKET_ID** | En **Buckets** → clic en tu bucket → en la ficha del bucket aparece **Bucket ID** (hex largo). |
| **B2_BUCKET_NAME** | Nombre del bucket (ej: `grobo-adjuntos`). Debe coincidir con el bucket cuyo ID pusiste arriba. |

- Si el bucket es **privado** (recomendado): la app usará la API de B2 para generar URLs de descarga temporales autorizadas.
- Si el bucket es **público**: se pueden usar URLs públicas de descarga (menos seguro).

## 2. Tabla en la base de datos (según READMEBD.md)

La app usa la tabla **`solicitudadjuntosprotocolos`**, subordinada de **`solicitudprotocolo`**, tal como está definida en `docs/READMEBD.md`:

| Columna | Tipo | Descripción |
|--------|------|-------------|
| **Id_adjuntos_protocolos** | int (PK, auto increment) | ID del adjunto |
| **nombre_original** | varchar(100) | Nombre del archivo que subió el usuario |
| **file_key** | text | Key del objeto en el bucket B2 (path/identificador en B2) |
| **IdSolicitudProtocolo** | int (FK → solicitudprotocolo.IdSolicitudProtocolo) | Solicitud a la que pertenece |
| **tipoadjunto** | int | 1 = protocolo, 2 = aval, 3 = otro (equivale a adjunto 1, 2 y 3) |

**Qué debes agregar en la BD:** si la tabla **`solicitudadjuntosprotocolos`** aún no existe, créala con la estructura anterior. El script está en `docs/sql/solicitudadjuntosprotocolos.sql`. Si ya la tienes, solo verifica que existan esas columnas y la FK a `solicitudprotocolo(IdSolicitudProtocolo)`.

## 3. Comportamiento de la aplicación

- **Usuario (solicitud de protocolo):** puede adjuntar hasta 3 archivos en el formulario. Al enviar, se crea el protocolo y la solicitud; luego cada archivo se sube a B2 y se guarda un registro en **`solicitudadjuntosprotocolos`** con `tipoadjunto` 1, 2 o 3.
- **Administrador:** en la pantalla de solicitudes de protocolo puede ver los adjuntos de cada solicitud y usar “Aceptar” con normalidad. Los enlaces de adjuntos llevan a una ruta de la API que devuelve (o redirige a) la descarga autorizada desde B2.

## 4. Resumen de lo que debes entregar

Para que todo funcione:

1. **Archivo `api/.env`** con: `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET_ID`, `B2_BUCKET_NAME`.
2. Tabla **`solicitudadjuntosprotocolos`** creada y con FK a **`solicitudprotocolo(IdSolicitudProtocolo)`** (ver `docs/READMEBD.md` y `docs/sql/solicitudadjuntosprotocolos.sql` si falta crearla).
3. (Opcional) Si el bucket es privado, la app generará URLs de descarga autorizadas; si es público, se puede ajustar para usar la URL pública del archivo.

Cuando tengas el `.env` y la tabla listos, las solicitudes con adjuntos y la descarga para el admin deberían funcionar con esta configuración.
