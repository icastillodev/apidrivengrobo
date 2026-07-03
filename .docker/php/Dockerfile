FROM php:8.3-fpm

# Instalar dependencias necesarias para tu API
RUN apt-get update && apt-get install -y \
    libzip-dev \
    zip \
    unzip \
    && docker-php-ext-install pdo pdo_mysql zip

# Límites de subida (adjuntos PDF de protocolos hasta ~5MB)
COPY .docker/php/uploads.ini /usr/local/etc/php/conf.d/uploads.ini

WORKDIR /var/www/html/core-backend-gem