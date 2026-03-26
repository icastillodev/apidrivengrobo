FROM php:8.3-fpm

# Instalar dependencias necesarias para tu API
RUN apt-get update && apt-get install -y \
    libzip-dev \
    zip \
    unzip \
    && docker-php-ext-install pdo pdo_mysql zip

WORKDIR /var/www/html/core-backend-gem