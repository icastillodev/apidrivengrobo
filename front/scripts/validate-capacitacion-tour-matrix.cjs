/**
 * Comprueba que cada `menuPath` de la matriz §13.2 exista en `CAPACITACION_TOUR_STEPS`.
 * Complementa validate-capacitacion-tour-i18n.cjs (claves i18n en es/en/pt).
 *
 * Uso: node front/scripts/validate-capacitacion-tour-matrix.cjs
 */
const fs = require('fs');
const path = require('path');

const toursPath = path.join(__dirname, '..', 'dist/js/utils/capacitacionTours.js');
const full = fs.readFileSync(toursPath, 'utf8');

const EXPECTED_MENU_PATHS = [
  'panel/capacitacion',
  'admin/usuarios',
  'admin/dashboard',
  'panel/dashboard',
  'usuario/dashboard',
  'admin/protocolos',
  'admin/solicitud_protocolo',
  'admin/animales',
  'admin/reactivos',
  'admin/insumos',
  'admin/reservas',
  'admin/alojamientos',
  'admin/estadisticas',
  'admin/configuracion/config',
  'panel/formularios',
  'panel/misformularios',
  'usuario/misformularios',
  'panel/misalojamientos',
  'usuario/misalojamientos',
  'panel/misreservas',
  'usuario/misreservas',
  'panel/misprotocolos',
  'panel/mensajes',
  'panel/mensajes_institucion',
  'panel/noticias',
  'panel/perfil',
  'panel/soporte',
  'panel/ventas',
  'admin/precios',
  'admin/facturacion/index',
  'admin/historialcontable',
  'admin/comunicacion/noticias',
  'capacitacion/tema/red',
];

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const missing = [];

for (const p of EXPECTED_MENU_PATHS) {
  const re = new RegExp(`['"]${escRe(p)}['"]\\s*:`);
  if (!re.test(full)) missing.push(p);
}

if (!/\b__modals__\s*:/.test(full)) {
  missing.push('__modals__ (clave sin comillas en objeto)');
}
if (!/\b__welcome__\s*:/.test(full)) {
  missing.push('__welcome__ (clave sin comillas en objeto)');
}

if (missing.length) {
  console.error('Faltan entradas en CAPACITACION_TOUR_STEPS o archivo ilegible:');
  console.error(missing.join('\n'));
  process.exit(1);
}

console.log(
  `OK: §13.2 — ${EXPECTED_MENU_PATHS.length} rutas con entrada en capacitacionTours.js + __welcome__ / __modals__.`
);
process.exit(0);
