/**
 * Comprueba que cada titleKey/bodyKey de capacitacionTours.js exista en es.js, en.js y pt.js
 * bajo la sección capacitacion (evita textos tipo tour_*_title visibles en el tour).
 * Uso: node front/scripts/validate-capacitacion-tour-i18n.cjs
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const toursPath = path.join(root, 'dist/js/utils/capacitacionTours.js');
const tours = fs.readFileSync(toursPath, 'utf8');
const keys = new Set();
for (const m of tours.matchAll(/(titleKey|bodyKey):\s*'([^']+)'/g)) {
  keys.add(m[2]);
}

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const langs = ['es', 'en', 'pt'];
const missing = {};
for (const lang of langs) {
  const c = fs.readFileSync(path.join(root, 'dist/js/utils/i18n', `${lang}.js`), 'utf8');
  missing[lang] = [];
  for (const k of keys) {
    const re = new RegExp(`\\b${escRe(k)}\\s*:`);
    if (!re.test(c)) missing[lang].push(k);
  }
}

let bad = false;
for (const lang of langs) {
  if (missing[lang].length) {
    bad = true;
    console.error(`${lang}: faltan ${missing[lang].length} claves`);
    console.error(missing[lang].join('\n'));
  }
}

if (!bad) {
  console.log(`OK: ${keys.size} claves tour presentes en es, en y pt.`);
}
process.exit(bad ? 1 : 0);
