# Nginx producción — `app.groboapp.com`

Documento de referencia: despliegue repo ↔ servidor, **respaldo del nginx anterior**, **configuración nueva completa** y **pasos para aplicarla** sin romper el sitio.

**Importante:** el orden de los `location` importa. La regla específica de `/panel/(capacitacion|…)` debe ir **antes** del `location /panel/` que reescribe a `usuario/`.

---

## Despliegue: carpetas del servidor ↔ este repositorio

| En el servidor (VPS) | Equivale en el repo | Contenido |
|----------------------|---------------------|-----------|
| `/var/www/html/app` | carpeta **`front/`** | HTML estático, `dist/`, `paginas/`, `index.html`, etc. (`root` en nginx). |
| `/var/www/html/core-backend-gem` | carpeta **`api/`** | Backend PHP (API). |

---

## Problema que corrige la configuración nueva

La regla antigua:

```nginx
location /panel/ {
    rewrite ^/panel/(.*?)/?$ /paginas/usuario/$1.html last;
}
```

mandaba **todo** `/panel/...` a `paginas/usuario/...`. Páginas que solo existen en **`paginas/panel/`** (p. ej. capacitación, ventas, soporte, noticias, POE) pedían un `.html` inexistente bajo `usuario/` → **404**.

La versión nueva añade **antes** un `location` que mapea esas rutas a `paginas/panel/$1.html`.

---

## Respaldo: nginx anterior (solo referencia, antes del fix panel)

Guardado aquí **por si hay que comparar o revertir** un solo bloque `server`. No hace falta borrarlo del servidor: conviene conservar copias con fecha en `/etc/nginx/`.

```nginx
server {
    listen 80;
    server_name app.groboapp.com www.app.groboapp.com;

    root /var/www/html/app;
    index index.html;
    autoindex off;

    # ============================================================
    # 1. BACKEND API-DRIVEN
    # ============================================================
    location /api/ {
        alias /var/www/html/core-backend-gem/;

        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;

        try_files $uri $uri/ @api_router;

        location ~ \.php$ {
            fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
            include fastcgi_params;
            fastcgi_param SCRIPT_FILENAME $request_filename;
        }
    }

    location @api_router {
        rewrite ^/api/(.*)$ /api/index.php last;
    }

# ============================================================
    # 2. FIX DE ASSETS FRONTEND (Profundidad Infinita)
    # ============================================================
    location ~ ^/.*?/(dist|assets|paginas|resources|node_modules)/(.*)$ {
        rewrite ^/.*?/(dist|assets|paginas|resources|node_modules)/(.*)$ /$1/$2 last;
    }

# ============================================================
    # FIX: Redirección silenciosa del Favicon
    # ============================================================
    location = /favicon.ico {
        access_log off;
        log_not_found off;
        rewrite ^ /dist/multimedia/imagenes/grobo/favicon.ico last;
    }


        # ============================================================
    # 3. RUTAS ESPECIALES (Superadmin, Formularios y QR)
    # ============================================================
    location ~ ^/gecko(s)?adm/login/?$ {
        rewrite ^ /superadmin_login.html last;
    }

    location = /superadmin_login.html {
        internal;
    }

    location ~ ^/formulario/([a-zA-Z0-9_-]+)/?$ {
        rewrite ^/formulario/([a-zA-Z0-9_-]+)/?$ /paginas/formulario/index.html last;
    }

# NUEVA REGLA: token 6 caracteres
    location ~ "^/qr/([a-zA-Z0-9]{6})/?$" {
        rewrite "^/qr/([a-zA-Z0-9]{6})/?$" /paginas/qr-alojamiento.html?token=$1 last;
    }

    location ^~ /qr/alojamiento {
        rewrite ^/qr/alojamiento/?$ /paginas/qr-alojamiento.html last;
    }

    location = /construccion {
        rewrite ^ /paginas/construccion.html last;
    }

# ============================================================
    # 4. ENMASCARAMIENTO DE RUTAS LÓGICAS (Soporte Multi-Nivel)
    # ============================================================
    location /panel/ {
        rewrite ^/panel/(.*?)/?$ /paginas/usuario/$1.html last;
    }

    location /admin/ {
        rewrite ^/admin/(.*?)/?$ /paginas/admin/$1.html last;
    }

    location /superadmin/ {
        rewrite ^/superadmin/(.*?)/?$ /paginas/superadmin/$1.html last;
    }
# ============================================================
    # 5. ENRUTADOR PRINCIPAL SPA (Slugs Institucionales)
    # ============================================================
    location / {
        try_files $uri $uri.html @slug_router;
    }

    location @slug_router {
        if ($uri ~* "^/(dist|paginas|assets|resources|node_modules)") {
            return 404;
        }

        if ($uri = /index.html) {
            break;
        }

        rewrite ^/([a-zA-Z0-9_-]+)(/.*)?$ /index.html?inst=$1 last;

        return 404;
    }
    # ============================================================
    # 6. PÁGINA 404
    # ============================================================
    error_page 404 /paginas/error404.html;


# ============================================================
    # 7. ZONA SEGURA: GECKO VAULT (phpMyAdmin)
    # ============================================================
    location ^~ /db-geckos-admin/myadminbd {
        alias /var/www/html/gecko-vault-db99;
        index index.php index.html index.htm;

        auth_basic "GeckoLab Restricted Area";
        auth_basic_user_file /etc/nginx/.htpasswd;

        if ($request_uri ~ "^/db-geckos-admin/myadminbd$") {
            return 301 /db-geckos-admin/myadminbd/;
        }

        location ~ \.php$ {
            fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
            include fastcgi_params;
            fastcgi_param SCRIPT_FILENAME $request_filename;
        }
    }

}
```

---

## Pasos en el servidor: aplicar la configuración nueva

**No hace falta “vaciar” todo nginx:** solo se reemplaza el archivo del **virtual host** de GROBO (o el bloque `server` dentro de él). El fichero principal `/etc/nginx/nginx.conf` suele quedarse igual y solo hace `include` de `sites-enabled`.

### 1) Conectarse por SSH al VPS

### 2) Ver qué archivo usa este sitio

```bash
ls -la /etc/nginx/sites-enabled/
```

Buscá un enlace o archivo con nombre tipo `app.groboapp.com`, `grobo`, `default`, etc. El path real suele ser **`/etc/nginx/sites-available/nombre`** y en `sites-enabled` un symlink.

### 3) Copia de respaldo con fecha (obligatorio antes de editar)

Sustituí `ARCHIVO` por el nombre real, por ejemplo `app.groboapp.com`:

```bash
sudo cp /etc/nginx/sites-available/ARCHIVO /etc/nginx/sites-available/ARCHIVO.bak-$(date +%Y%m%d)
```

### 4) Editar el archivo del vhost

```bash
sudo nano /etc/nginx/sites-available/ARCHIVO
```

- Borrá **solo** el bloque `server { ... }` de `app.groboapp.com` (o el contenido completo si el archivo es solo este sitio).
- Pegá **tal cual** el bloque completo de la sección **“Configuración nueva (completa)”** más abajo.
- Guardar: `Ctrl+O`, Enter, salir: `Ctrl+X`.

**Nota:** Si el archivo tiene varios `server { }` (otros dominios), no los borréis; solo reemplazad el bloque de `server_name app.groboapp.com`.

### 5) Probar sintaxis (si falla, nginx no recarga mal)

```bash
sudo nginx -t
```

Debe decir `syntax is ok` y `test is successful`.

### 6) Recargar nginx (sin cortar conexiones a la fuerza)

```bash
sudo systemctl reload nginx
```

### 7) Si algo sale mal: restaurar el backup

```bash
sudo cp /etc/nginx/sites-available/ARCHIVO.bak-FECHA /etc/nginx/sites-available/ARCHIVO
sudo nginx -t && sudo systemctl reload nginx
```

### 8) Comprobar en el navegador

- `https://app.groboapp.com/panel/capacitacion` → 200 (no 404).
- Opcional: purgar caché en Cloudflare para esa URL.

---

## Configuración nueva (completa, lista para pegar)

Este es el bloque `server { ... }` vigente recomendado (incluye fix `/panel/` para capacitación, ventas, soporte, noticias, POE).

```nginx
server {
    listen 80;
    server_name app.groboapp.com www.app.groboapp.com;

    root /var/www/html/app;
    index index.html;
    autoindex off;

    # ============================================================
    # 1. BACKEND API-DRIVEN
    # ============================================================
    location /api/ {
        alias /var/www/html/core-backend-gem/;

        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;

        try_files $uri $uri/ @api_router;

        location ~ \.php$ {
            fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
            include fastcgi_params;
            fastcgi_param SCRIPT_FILENAME $request_filename;
        }
    }

    location @api_router {
        rewrite ^/api/(.*)$ /api/index.php last;
    }

    # ============================================================
    # 2. ASSETS (profundidad / slugs)
    # ============================================================
    location ~ ^/.*?/(dist|assets|paginas|resources|node_modules)/(.*)$ {
        rewrite ^/.*?/(dist|assets|paginas|resources|node_modules)/(.*)$ /$1/$2 last;
    }

    # ============================================================
    # Favicon
    # ============================================================
    location = /favicon.ico {
        access_log off;
        log_not_found off;
        rewrite ^ /dist/multimedia/imagenes/grobo/favicon.ico last;
    }

    # ============================================================
    # 3. Rutas especiales
    # ============================================================
    location ~ ^/gecko(s)?adm/login/?$ {
        rewrite ^ /superadmin_login.html last;
    }

    location = /superadmin_login.html {
        internal;
    }

    location ~ ^/formulario/([a-zA-Z0-9_-]+)/?$ {
        rewrite ^/formulario/([a-zA-Z0-9_-]+)/?$ /paginas/formulario/index.html last;
    }

    location ~ "^/qr/([a-zA-Z0-9]{6})/?$" {
        rewrite "^/qr/([a-zA-Z0-9]{6})/?$" /paginas/qr-alojamiento.html?token=$1 last;
    }

    location ^~ /qr/alojamiento {
        rewrite ^/qr/alojamiento/?$ /paginas/qr-alojamiento.html last;
    }

    location = /construccion {
        rewrite ^ /paginas/construccion.html last;
    }

    # ============================================================
    # 4. PANEL: solo paginas/panel/ (¡antes del /panel/ genérico!)
    # ============================================================
    location ~ ^/panel/(capacitacion|ventas|soporte|noticias|poe)/?$ {
        rewrite ^/panel/([a-zA-Z0-9_-]+)/?$ /paginas/panel/$1.html last;
    }

    # ============================================================
    # 5. PANEL: resto → usuario
    # ============================================================
    location /panel/ {
        rewrite ^/panel/(.*?)/?$ /paginas/usuario/$1.html last;
    }

    location /admin/ {
        rewrite ^/admin/(.*?)/?$ /paginas/admin/$1.html last;
    }

    location /superadmin/ {
        rewrite ^/superadmin/(.*?)/?$ /paginas/superadmin/$1.html last;
    }

    # ============================================================
    # 6. SPA / slugs institucionales
    # ============================================================
    location / {
        try_files $uri $uri.html @slug_router;
    }

    location @slug_router {
        if ($uri ~* "^/(dist|paginas|assets|resources|node_modules)") {
            return 404;
        }

        if ($uri = /index.html) {
            break;
        }

        rewrite ^/([a-zA-Z0-9_-]+)(/.*)?$ /index.html?inst=$1 last;

        return 404;
    }

    error_page 404 /paginas/error404.html;

    # ============================================================
    # 7. phpMyAdmin (Gecko Vault)
    # ============================================================
    location ^~ /db-geckos-admin/myadminbd {
        alias /var/www/html/gecko-vault-db99;
        index index.php index.html index.htm;

        auth_basic "GeckoLab Restricted Area";
        auth_basic_user_file /etc/nginx/.htpasswd;

        if ($request_uri ~ "^/db-geckos-admin/myadminbd$") {
            return 301 /db-geckos-admin/myadminbd/;
        }

        location ~ \.php$ {
            fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
            include fastcgi_params;
            fastcgi_param SCRIPT_FILENAME $request_filename;
        }
    }
}
```

---

## Comprobación rápida

- `/panel/capacitacion` debe resolver a `paginas/panel/capacitacion.html` (HTTP 200).
- `/panel/poe?id=1` debe resolver a `paginas/panel/poe.html` (HTTP 200). Los QR POE usan además la ruta explícita `/paginas/panel/poe.html?id=…` en el front.
- Si usáis Cloudflare, purgar caché tras cambios.

## Nota sobre nuevas páginas “solo panel”

Si añadís un `.html` solo bajo `paginas/panel/` y la URL lógica es `/panel/nombre`, añadid `nombre` al grupo `(capacitacion|ventas|soporte|noticias|poe|...)` o una regla dedicada **antes** de `location /panel/`.
