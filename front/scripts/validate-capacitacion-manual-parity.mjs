/**
 * §7.4 — Paridad estructural entre capacitacionManual.es|en|pt.js:
 * mismas claves de capítulo, mismo número de bloques y mismos id / cat / icon por índice.
 *
 * Uso (desde cualquier cwd): node front/scripts/validate-capacitacion-manual-parity.mjs
 */
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manualDir = path.join(__dirname, '../dist/js/utils');

const langs = ['es', 'en', 'pt'];
const packs = {};
for (const lang of langs) {
  const url = pathToFileURL(path.join(manualDir, `capacitacionManual.${lang}.js`)).href;
  packs[lang] = (await import(url)).CHAPTERS;
}

const keysEs = Object.keys(packs.es).sort();
const keysEn = Object.keys(packs.en).sort();
const keysPt = Object.keys(packs.pt).sort();

const errors = [];

function sameKeys(a, b, label) {
  const sa = new Set(a);
  const sb = new Set(b);
  for (const k of sa) {
    if (!sb.has(k)) errors.push(`${label}: falta clave "${k}"`);
  }
  for (const k of sb) {
    if (!sa.has(k)) errors.push(`${label}: sobra clave "${k}"`);
  }
}

sameKeys(keysEs, keysEn, 'es vs en (capítulos)');
sameKeys(keysEs, keysPt, 'es vs pt (capítulos)');

for (const slug of keysEs) {
  const ce = packs.es[slug];
  const cn = packs.en[slug];
  const cp = packs.pt[slug];
  if (!cn || !cp) continue;

  const be = ce.blocks;
  const bn = cn.blocks;
  const bp = cp.blocks;
  if (!Array.isArray(be) || !Array.isArray(bn) || !Array.isArray(bp)) {
    errors.push(`${slug}: blocks no es array en algún idioma`);
    continue;
  }
  if (be.length !== bn.length || be.length !== bp.length) {
    errors.push(
      `${slug}: distinto nº de bloques es=${be.length} en=${bn.length} pt=${bp.length}`
    );
    continue;
  }

  for (let i = 0; i < be.length; i += 1) {
    const tri = [
      ['es', be[i]],
      ['en', bn[i]],
      ['pt', bp[i]],
    ];
    const ids = tri.map(([, b]) => b?.id);
    const cats = tri.map(([, b]) => b?.cat ?? null);
    const icons = tri.map(([, b]) => b?.icon ?? null);
    if (ids[0] !== ids[1] || ids[0] !== ids[2]) {
      errors.push(`${slug} bloque[${i}]: id es=${ids[0]} en=${ids[1]} pt=${ids[2]}`);
    }
    if (cats[0] !== cats[1] || cats[0] !== cats[2]) {
      errors.push(`${slug} bloque[${i}]: cat es=${cats[0]} en=${cats[1]} pt=${cats[2]}`);
    }
    if (icons[0] !== icons[1] || icons[0] !== icons[2]) {
      errors.push(`${slug} bloque[${i}]: icon es=${icons[0]} en=${icons[1]} pt=${icons[2]}`);
    }
  }
}

if (errors.length) {
  console.error('Paridad manual §7.4: ERRORES\n' + errors.join('\n'));
  process.exit(1);
}

console.log(
  `OK: §7.4 — ${keysEs.length} capítulos; bloques alineados (id/cat/icon) en es, en, pt.`
);
process.exit(0);
