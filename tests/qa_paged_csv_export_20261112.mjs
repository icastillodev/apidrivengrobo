/** QA de exportaciones grandes (solo fixtures, no toca datos institucionales). */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { eachPagedExportBatch, safeCsvCell } from '../front/dist/js/utils/pagedCsvExport.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const file of ['animales.js', 'reactivos.js', 'insumos.js']) {
    const src = fs.readFileSync(path.join(root, 'front/dist/js/pages/admin', file), 'utf8');
    assert.ok(src.includes('eachPagedExportBatch({'), file + ': export still uses single-page request');
    assert.ok(src.includes("baseParams.set('sort_key', 'idformA')"), file + ': export sorting not stable');
    assert.ok(src.includes('row.map(safeCsvCell)'), file + ': CSV escaping not enforced');
}
console.log('PASS three admin modules use paged, stable exports');

const ids = Array.from({ length: 1205 }, (_, i) => ({ idformA: i + 1, institution: i % 2 ? 12 : 1 }));
let calls = [];
let stored = [];
const count = await eachPagedExportBatch({
    requestPage: async ({ limit, offset }) => {
        calls.push({ limit, offset });
        return { status:'success', total:ids.length, data:ids.slice(offset, offset + limit) };
    },
    onBatch: batch => stored.push(...batch.map(x => x.idformA)),
    pageSize:500,
});
assert.equal(count, 1205);
assert.equal(stored.length, 1205);
assert.deepEqual(calls.map(c => c.offset), [0,500,1000]);
assert.deepEqual(calls.map(c => c.limit), [500,500,500]);
assert.equal(new Set(stored).size, 1205);
console.log('PASS all 1205 records exported in 3 pages without truncation');

let emptyCount = 0;
const empty = await eachPagedExportBatch({
    requestPage: async () => ({ status:'success', total:0, data:[] }),
    onBatch: () => emptyCount++,
});
assert.equal(empty, 0);
assert.equal(emptyCount, 0);
console.log('PASS empty exports end cleanly');

await assert.rejects(eachPagedExportBatch({
    requestPage: async () => ({ status:'success', total:2, data:[{idformA:1}] }),
    onBatch: () => {},
}), /incompleta/);
console.log('PASS incomplete pages abort export');

let n = 0;
await assert.rejects(eachPagedExportBatch({
    requestPage: async ({ offset }) => ({ status:'success', total: n++ ? 4 : 5,
        data: Array.from({length:Math.min(3, (n===1?5:4)-offset)}, (_,i)=>({idformA:offset+i+1})) }),
    onBatch: () => {}, pageSize:3,
}), /cambió/);
console.log('PASS moving totals abort export');

await assert.rejects(eachPagedExportBatch({
    requestPage: async ({offset,limit}) => ({status:'success',total:4,
        data:Array.from({length:Math.min(limit,4-offset)},(_,i)=>({idformA:1}))}),
    onBatch: () => {}, pageSize:2,
}), /duplicado/);
await assert.rejects(eachPagedExportBatch({
    requestPage: async () => ({status:'error',message:'Sin autorización'}),
    onBatch: () => {},
}), /Sin autorización/);
console.log('PASS repeated IDs and API permission failures abort export');

assert.equal(safeCsvCell('uno;dos'), '"uno;dos"');
assert.equal(safeCsvCell('=SUM(A1:A2)'), '"\'=SUM(A1:A2)"');
assert.equal(safeCsvCell('línea\nsegunda'), '"línea segunda"');
assert.equal(safeCsvCell('a"b'), '"a""b"');
console.log('PASS CSV escaping prevents spreadsheet formulas and corrupt columns');
console.log('GROBO_PAGED_CSV_EXPORT_QA_OK checks=7');
