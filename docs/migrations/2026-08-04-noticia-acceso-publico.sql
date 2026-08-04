-- Noticias: acceso público sin login vía enlace/QR (página noticia-publica.html).
-- Distinto de OcultaEnListado (solo saca del listado dentro de la app).
-- 2026-08-04

ALTER TABLE `noticia`
  ADD COLUMN `AccesoPublico` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT '1=detalle y adjuntos vía URL pública sin JWT; 0=solo usuarios logueados en GROBO'
    AFTER `OcultaEnListado`;
