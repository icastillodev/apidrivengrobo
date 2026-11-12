/**
 * QA aislado de Mis Formularios: carga diferida PDF, caché de búsqueda y CSV seguro.
 * No realiza solicitudes ni utiliza datos institucionales.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const js = fs.readFileSync(path.join(root, 'front/dist/js/pages/usuario/misformularios.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'front/paginas/panel/misformularios.html'), 'utf8');
function section(from, to) {
    const start = js.indexOf(from);
    const end = js.indexOf(to, start);
    assert.ok(start >= 0 && end > start, 'Cannot locate function: ' + from);
    return js.slice(start, end);
}
assert.ok(!html.includes('html2pdf.bundle.min.js'), 'PDF library must not block page load');
console.log('PASS lazy PDF script absent from startup');

const scripts = [];
const context = vm.createContext({
    window: {},
    Promise,
    document: {
        createElement: () => ({}),
        head: { appendChild: script => scripts.push(script) },
    },
});
vm.runInContext('let misFormsPdfScriptPromise = null;\n'
    + section('function ensureMisFormsPdfLibrary()', '/** CSV compatible'), context);
const pdfReady1 = vm.runInContext('ensureMisFormsPdfLibrary()', context);
const pdfReady2 = vm.runInContext('ensureMisFormsPdfLibrary()', context);
assert.equal(scripts.length, 1, 'PDF load should be deduplicated');
context.window.html2pdf = () => ({});
scripts[0].onload();
await Promise.all([pdfReady1, pdfReady2]);
await vm.runInContext('ensureMisFormsPdfLibrary()', context);
assert.equal(scripts.length, 1);
console.log('PASS PDF loads once on first request');

const retries = [];
const failed = vm.createContext({
    window: {}, Promise,
    document: {
        createElement: () => ({}),
        head: { appendChild: s => retries.push(s) },
    },
});
vm.runInContext('let misFormsPdfScriptPromise = null;\n'
    + section('function ensureMisFormsPdfLibrary()', '/** CSV compatible'), failed);
const failing = vm.runInContext('ensureMisFormsPdfLibrary()', failed);
retries[0].onerror();
await assert.rejects(failing, /biblioteca PDF/);
const second = vm.runInContext('ensureMisFormsPdfLibrary()', failed);
assert.equal(retries.length, 2, 'PDF failure should allow retries');
failed.window.html2pdf = () => ({});
retries[1].onload();
await second;
console.log('PASS PDF failed load can retry');

const csv = vm.createContext({});
vm.runInContext(section('function csvMisFormsCell(value)', 'function formatMoneyMisForm(value)'), csv);
const cell = value => vm.runInContext('csvMisFormsCell(testValue)', Object.assign(csv, {testValue:value}));
assert.equal(cell('a;b'), '"a;b"');
assert.equal(cell('a"b'), '"a""b"');
assert.equal(cell('a\nb'), '"a b"');
assert.equal(cell('=2+2'), '"\'=2+2"');
assert.equal(cell(' +SUM(1,2)'), '"\' +SUM(1,2)"');
assert.equal(cell('@cmd'), '"\'@cmd"');
console.log('PASS CSV escaping and Excel formula neutralization');

const search = vm.createContext({});
vm.runInContext('const formSearchCache = new WeakMap();\n'
    + section('function formRowSearchText(f)', 'function showMisFormulariosLoadError'), search);
const form = { idformA: 101, institucion: {name:'URBE'}, participantes:['CUPAE'] };
search.form = form;
assert.ok(vm.runInContext('formRowSearchText(form)', search).includes('cupae'));
form.idformA = 202;
assert.ok(vm.runInContext('formRowSearchText(form)', search).includes('101'),
    'Cached search should not recalculate unchanged list item');
console.log('PASS search indexing is reused per row');

assert.ok(js.includes('escapeMisFormsHtml(instParticipantes)'), 'Institution label must be HTML escaped');
assert.ok(js.includes('rowsFragment.appendChild(tr)'), 'Rows should be rendered with DocumentFragment');
console.log('PASS table output escaping and batched insertion');
console.log('GROBO_MYFORMS_RENDER_EXPORT_QA_OK checks=6');
