-- Noticias: ocultar del listado/dashboard pero seguir accesible por enlace directo (?id=).
-- 2026-08-04

ALTER TABLE `noticia`
  ADD COLUMN `OcultaEnListado` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT '1=no aparece en listados/portal/dashboard; sí por URL ?id= si Publicado=1'
    AFTER `CompartirEnRed`;
