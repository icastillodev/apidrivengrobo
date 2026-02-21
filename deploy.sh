#!/bin/bash
echo "🚀 Iniciando despliegue de GROBO..."

# 1. Nos ubicamos en la carpeta privada del repo en el servidor
cd /home/geckosadm/repo-grobo || exit

# 2. Traemos los últimos cambios de GitHub (rama main)
echo "📥 Descargando actualizaciones de GitHub..."
git pull origin main

# 3. Copiamos el Front-End a la carpeta pública 'app'
echo "📦 Actualizando Frontend..."
sudo rsync -a --delete front/ /var/www/html/app/

# 4. Copiamos la API a la carpeta oculta 'core-backend-gem'
echo "⚙️ Actualizando Backend API..."
sudo rsync -a --delete api/ /var/www/html/core-backend-gem/

# 5. Aseguramos permisos correctos
sudo chown -R www-data:www-data /var/www/html/app
sudo chown -R www-data:www-data /var/www/html/core-backend-gem

echo "✅ ¡Despliegue completado con éxito!"