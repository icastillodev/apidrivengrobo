/**
 * GROBO: My Forms con historial simulado. No usa credenciales ni MySQL.
 * Comprueba paginado inicial, filtros legacy íntegros, metadatos, exportación completa.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(os.tmpdir(), 'grobo-ux-audit', 'node_modules', 'playwright-core'));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const front = path.join(root, 'front');
const myFormsHtml = fs.readFileSync(path.join(front, 'paginas/panel/misformularios.html'), 'utf8');
const tableHead = myFormsHtml.match(/<table id="tabla-misformularios"[\s\S]*?<\/thead>/)?.[0] || '';
assert.equal((tableHead.match(/<th\b/g) || []).length, 13, 'Mis Formularios header must align with 13 cells');
const prefix = '/URBE-API-DRIVEN/front/';
const fixtureHtml = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<button id="btn-export-excel">Excel</button>
<select id="filter-status"><option value="all">Todos</option><option value="Entregado">Entregado</option></select>
<div id="container-filter-inst" class="d-none"><select id="filter-inst"><option value="all">Todas</option></select></div>
<div id="container-filter-origin-inst" class="d-none"><select id="filter-origin-inst"><option value="all">Orígenes</option></select></div>
<select id="filter-derivation"><option value="all">Todas</option><option value="derived">Derivados</option></select>
<input id="search-input"><span id="dynamic-counter"></span>
<table><tbody id="table-body"></tbody></table><ul id="pagination"></ul>
<input id="excel-start" type="date"><input id="excel-end" type="date">
<div id="modal-excel"></div>
</body></html>`;
const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    if (u.pathname === prefix + '__qa_myforms.html') {
        res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
        return res.end(fixtureHtml);
    }
    if (!u.pathname.startsWith(prefix)) {res.writeHead(404);return res.end();}
    const file = path.resolve(front, decodeURIComponent(u.pathname.slice(prefix.length)));
    if (!file.startsWith(front+path.sep)) {res.writeHead(403);return res.end();}
    try {
        if (!fs.statSync(file).isFile()) throw Error('not found');
        res.writeHead(200, {'Content-Type':file.endsWith('.js')?'application/javascript':'application/octet-stream'});
        fs.createReadStream(file).pipe(res);
    } catch {res.writeHead(404);res.end('missing');}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser = await chromium.launch({
    headless:true, executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args:['--no-first-run','--disable-extensions']
});
try {
    const context = await browser.newContext({
        viewport:{width:390,height:840}, serviceWorkers:'block', acceptDownloads:true
    });
    const page = await context.newPage();
    const errors=[];
    page.on('pageerror', error=>errors.push(error.message));
    const base='http://127.0.0.1:'+server.address().port+prefix;
    await page.goto(base+'__qa_myforms.html');
    const initial=await page.evaluate(async base=>{
        localStorage.setItem('instId','12');
        localStorage.setItem('userFull','Persona de prueba');
        window.txt={misformularios:{},generales:{}};
        window.Swal={
            fire:()=>({isConfirmed:true}), showLoading:()=>{}, close:()=>{},
        };
        window.bootstrap={Modal:class {static getInstance(){return {hide(){}};} show(){} }};
        const forms=Array.from({length:205},(_,i)=>({
            idformA:1205-i, Inicio:'2026-11-10', Retiro:'2026-11-14',
            estado:i%2?'Entregado':'Proceso', Categoria:'Animal', TipoPedido:'Animal vivo',
            colorTipo:'#258b61',NombreInstitucion:'URBE',NombreInstitucionOrigen:i%5===0?'URBE':'',
            DerivadoActivo:i%5===0?1:0,
            Protocolo:'PROTO-'+i, Departamento:'Bio', Organizacion:'Organismo',
            monto_total_facturado:100,monto_pagado:20, falta_pagar:80, exento_form:0,
            institucionesParticipantes: i%5===0
                ?[{NombreInst:'URBE'},{NombreInst:'CUPAE'}]:[{NombreInst:'URBE'}],
        }));
        const api=await import(base+'dist/js/api.js');
        const calls=[];
        api.API.request=async (endpoint, method='GET', data=null, fetchOptions=null)=>{
            calls.push(endpoint);
            const signal=fetchOptions?.signal;
            const params=new URL(endpoint,'http://localhost').searchParams;
            const search=params.get('search');
            const pageOffset=Number(params.get('offset')||0);
            const slowSearch=window.__slowFilteredQA && endpoint.includes('filtered=1')
                && search==='1201';
            const stubbornSearch=window.__stubbornFilteredQA && endpoint.includes('filtered=1')
                && search==='1202';
            const slowPage=window.__slowPageQA && endpoint.includes('paged=1') && pageOffset===12;
            if(slowSearch || stubbornSearch || slowPage){
                const kind=slowSearch?'search':stubbornSearch?'stubborn':'page';
                window.__slowCounts??={};
                window.__slowCounts[kind]=(window.__slowCounts[kind]||0)+1;
                return new Promise(resolve=>{
                    let done=false;
                    const finish=result=>{if(done)return;done=true;resolve(result);};
                    window.__resolveSlowQA=()=>finish({status:'success',
                        data:{total:1,limit:12,offset:pageOffset,list:[forms[0]]}});
                    const onAbort=()=>{
                        window.__abortCounts??={};
                        window.__abortCounts[kind]=(window.__abortCounts[kind]||0)+1;
                        if(!stubbornSearch) finish({status:'error',errorKind:'timeout'});
                    };
                    if(signal?.aborted)onAbort();
                    else signal?.addEventListener('abort',onAbort,{once:true});
                });
            }
            if(endpoint.includes('?meta=1'))return {status:'success',data:{instituciones:['URBE','CUPAE'],origenes:['URBE']}};
            if(endpoint.includes('paged=1')){
                const u=new URL(endpoint,'http://localhost');
                const offset=Number(u.searchParams.get('offset')||0);
                const limit=Number(u.searchParams.get('limit')||12);
                return {status:'success',data:{total:forms.length,limit,offset,list:forms.slice(offset,offset+limit)}};
            }
            if(endpoint.includes('filtered=1')){
                if(window.__denyFilter)return {status:'error',http_status:403,message:'Denegado QA'};
                if(window.__legacyFiltered)return {status:'success',data:{list:forms}};
                const u=new URL(endpoint,'http://localhost');
                const p=u.searchParams;
                const search=(p.get('search')||'').toLowerCase();
                const exactId=/^#([1-9][0-9]{0,9})$/.exec(search.trim());
                const status=p.get('status')||'all';
                const inst=p.get('inst_name')||'all';
                const derived=p.get('derivation')||'all';
                const origin=p.get('origin_inst')||'all';
                const allMatching=forms.filter(f=>{
                    const allText=Object.values(f).flatMap(v=>Array.isArray(v)
                        ?v.flatMap(item=>Object.values(item)):v).join(' ').toLowerCase();
                    const statuses=[f.estado,f.estado_origen,f.estado_destino];
                    const statusMatches=status==='all'||(status==='Sin estado'
                        ?statuses.every(v=>v==null||String(v).trim()==='')
                        :statuses.some(v=>v!=null&&String(v).trim()===status));
                    const names=f.institucionesParticipantes.map(item=>item.NombreInst);
                    const derivMatches=derived==='all'||(derived==='derived'&&f.DerivadoActivo===1)
                        ||(derived==='local'&&f.DerivadoActivo!==1);
                    return (exactId ? String(f.idformA)===exactId[1] : allText.includes(search))
                        &&statusMatches&&
                        (inst==='all'||names.includes(inst))&&derivMatches&&
                        (origin==='all'||f.NombreInstitucionOrigen===origin);
                });
                const offset=Number(p.get('offset')||0);
                const limit=Number(p.get('limit')||12);
                return {status:'success',data:{total:allMatching.length,limit,offset,
                    list:allMatching.slice(offset,offset+limit)}};
            }
            if(endpoint==='/user/my-forms')return {status:'success',data:{list:forms}};
            if(endpoint.startsWith('/forms/derivation/targets'))return {status:'success',data:[]};
            throw Error('Unexpected endpoint: '+endpoint);
        };
        window.__calls=calls;
        await (await import(base+'dist/js/pages/usuario/misformularios.js')).initMisFormularios();
        return {calls:[...calls],rows:document.querySelectorAll('#table-body tr').length,
            counter:document.getElementById('dynamic-counter').textContent,
            instOptions:document.getElementById('filter-inst').options.length};
    },base);
    assert.equal(initial.rows,12);
    assert.ok(initial.counter.includes('205'));
    assert.equal(initial.instOptions,3);
    assert.equal(await page.locator('#misforms-id-hint').count(),1);
    assert.ok((await page.locator('#misforms-id-hint').innerText()).includes('#12345'));
    assert.ok((await page.locator('#search-input').getAttribute('aria-describedby')).includes('misforms-id-hint'));
    console.log('PASS accessible, localized exact-ID search hint renders once');
    assert.ok(initial.calls.some(s=>s.includes('paged=1') && s.includes('limit=12') && s.includes('offset=0')));
    assert.ok(!initial.calls.includes('/user/my-forms'),'Legacy fetch on initial load');
    console.log('PASS first page loads only 12 forms; metadata global; no legacy GET');

    await page.locator('#pagination button').filter({hasText:'2'}).first().click();
    await page.waitForFunction(()=>document.getElementById('table-body').textContent.includes('#1193'));
    assert.ok((await page.evaluate(()=>window.__calls)).some(s=>s.includes('offset=12')));
    console.log('PASS page 2 requests next 12 only');

    await page.locator('#search-input').fill('1191');
    await page.waitForFunction(()=>window.__calls.some(x=>x.includes('filtered=1') && x.includes('1191'))
        && document.querySelectorAll('#table-body tr').length===1);
    let calls=await page.evaluate(()=>window.__calls);
    assert.ok(calls.some(x=>x.includes('filtered=1') && x.includes('1191')));
    assert.equal(calls.filter(x=>x==='/user/my-forms').length,0);
    assert.equal(await page.locator('#table-body tr').count(),1);
    console.log('PASS global search retrieves 1 row server-side, never downloads all forms');

    await page.locator('#search-input').fill('#1191');
    await page.waitForFunction(()=>window.__calls.some(x=>x.includes('search=%231191'))
        && document.getElementById('table-body').textContent.includes('#1191'));
    assert.equal(await page.locator('#table-body tr').count(),1);
    assert.ok((await page.evaluate(()=>window.__calls)).some(x=>x.includes('filtered=1') && x.includes('search=%231191')));
    console.log('PASS exact #ID search requests server-side indexed form lookup');

    await page.locator('#search-input').fill('');
    await page.locator('#filter-inst').selectOption('CUPAE');
    await page.waitForFunction(()=>document.getElementById('dynamic-counter').textContent.includes('41'));
    calls=await page.evaluate(()=>window.__calls);
    assert.equal(calls.filter(x=>x==='/user/my-forms').length,0);
    assert.ok(calls.some(x=>x.includes('filtered=1') && x.includes('inst_name=CUPAE')));
    console.log('PASS global institution filter paginates 41 matches on server');

    assert.equal(await page.locator('#table-body tr').count(),12);
    await page.locator('#pagination button').filter({hasText:'2'}).first().click();
    await page.waitForFunction(()=>document.getElementById('table-body').textContent.includes('#1145'));
    calls=await page.evaluate(()=>window.__calls);
    assert.ok(calls.some(x=>x.includes('filtered=1') && x.includes('offset=12')));
    console.log('PASS global institution filter paginates page 2 on server');

    await page.locator('#filter-status').selectOption('Entregado');
    await page.waitForFunction(()=>document.getElementById('dynamic-counter').textContent.includes('20 registros'));
    await page.locator('#filter-derivation').selectOption('derived');
    await page.locator('#filter-origin-inst').selectOption('URBE');
    await page.waitForFunction(()=>document.getElementById('dynamic-counter').textContent.includes('20 registros'));
    calls=await page.evaluate(()=>window.__calls);
    assert.ok(calls.some(x=>x.includes('filtered=1') && x.includes('origin_inst=URBE')
        && x.includes('derivation=derived') && x.includes('status=Entregado')));
    console.log('PASS combined origin, status and derivation filters remain server-side');

    await page.locator('#search-input').fill('NOT-A-REAL-PROTOCOL');
    await page.waitForFunction(()=>document.getElementById('dynamic-counter').textContent.trim().startsWith('0 registros')
        && document.getElementById('table-body').textContent.includes('No hay formularios'));
    assert.ok((await page.locator('#table-body').innerText()).includes('No hay formularios'));
    console.log('PASS no matching rows show an informative empty state');

    await page.locator('#search-input').fill('');
    await page.locator('#filter-status').selectOption('all');
    await page.locator('#filter-inst').selectOption('all');
    await page.locator('#filter-derivation').selectOption('all');
    await page.locator('#filter-origin-inst').selectOption('all');
    await page.waitForFunction(()=>document.getElementById('dynamic-counter').textContent.includes('205'));
    assert.equal(await page.locator('#table-body tr').count(),12);
    console.log('PASS reset filters returns to paged API');

    // Cancelar búsquedas viejas en el momento de escribir, sin esperar el
    // debounce de 280 ms. El servidor viejo sólo simula una red lenta.
    await page.evaluate(()=>{window.__slowFilteredQA=true;window.__slowCounts={};window.__abortCounts={};});
    await page.locator('#search-input').fill('1201');
    await page.waitForFunction(()=>window.__slowCounts?.search===1);
    await page.locator('#search-input').fill('1200');
    await page.waitForFunction(()=>window.__abortCounts?.search===1);
    await page.waitForFunction(()=>document.getElementById('table-body').textContent.includes('#1200'));
    assert.equal(await page.locator('#table-body tr').count(),1);
    console.log('PASS obsolete text request is aborted before debounce and never repaints');

    // Algunos transportes pueden ignorar AbortController: el número de
    // generación también debe descartar la respuesta tardía.
    await page.evaluate(()=>{window.__slowFilteredQA=false;window.__stubbornFilteredQA=true;});
    await page.locator('#search-input').fill('1202');
    await page.waitForFunction(()=>window.__slowCounts?.stubborn===1);
    await page.locator('#search-input').fill('1200');
    await page.waitForFunction(()=>document.getElementById('table-body').textContent.includes('#1200'));
    await page.evaluate(()=>window.__resolveSlowQA());
    assert.ok((await page.locator('#table-body').innerText()).includes('#1200'));
    assert.equal(await page.locator('#table-body tr').count(),1);
    console.log('PASS late response ignoring abort cannot overwrite the current filter');

    await page.evaluate(()=>{window.__stubbornFilteredQA=false;});
    await page.locator('#search-input').fill('');
    await page.waitForFunction(()=>document.getElementById('dynamic-counter').textContent.includes('205'));
    await page.evaluate(()=>{window.__slowPageQA=true;});
    await page.locator('#pagination button').filter({hasText:'2'}).first().click();
    await page.waitForFunction(()=>window.__slowCounts?.page===1);
    await page.locator('#pagination button').filter({hasText:'3'}).first().click();
    await page.waitForFunction(()=>window.__abortCounts?.page===1);
    await page.waitForFunction(()=>document.getElementById('table-body').textContent.includes('#1181'));
    assert.equal(await page.locator('#table-body tr').count(),12);
    await page.evaluate(()=>{window.__slowPageQA=false;});
    console.log('PASS fast pagination aborts older fetch while preserving page 3');

    await page.locator('#excel-start').fill('2026-11-01');
    await page.locator('#excel-end').fill('2026-11-30');
    const downloadPromise=page.waitForEvent('download',{timeout:15000});
    await page.evaluate(()=>window.processExcelExport());
    const download=await downloadPromise;
    const text=fs.readFileSync(await download.path(),'utf8').replace(/^\uFEFF/,'');
    assert.equal(text.split(/\r?\n/).filter(Boolean).length,206,'CSV must include 205 rows plus header');
    calls=await page.evaluate(()=>window.__calls);
    assert.ok(calls.some(s=>s.includes('limit=100&offset=200')));
    assert.ok(download.suggestedFilename().endsWith('.csv'));
    console.log('PASS global export traverses 205 forms in three bounded requests');

    // API moderna: respuesta CSV del servidor en lugar de descargar 205 JSON
    // y concatenarlas en el navegador. La descarga debe llevar JWT.
    await page.evaluate(()=>{
        sessionStorage.setItem('token','qa-jwt-test-token');
        window.__swalMessages=[];
        window.Swal.fire=(...args)=>{window.__swalMessages.push(args);return {isConfirmed:true};};
    });
    let serverAuth = '';
    await page.route('**/api/user/my-forms-csv?**', async route => {
        serverAuth = route.request().headers()['authorization'] || '';
        await route.fulfill({
            status:200,
            contentType:'text/csv; charset=utf-8',
            body:'ID;Estado\r\n1205;Completo\r\n',
        });
    });
    const before = (await page.evaluate(()=>window.__calls)).length;
    const fromServerPromise = page.waitForEvent('download',{timeout:15000});
    await page.evaluate(()=>window.processExcelExport());
    const serverCsv = await fromServerPromise;
    assert.ok(fs.readFileSync(await serverCsv.path(),'utf8').includes('1205;Completo'));
    assert.equal(serverAuth,'Bearer qa-jwt-test-token');
    assert.equal((await page.evaluate(()=>window.__calls)).length,before,
        'Server CSV should not fetch paginated JSON again');
    console.log('PASS streamed CSV request uses JWT and skips legacy JSON export');
    await page.unroute('**/api/user/my-forms-csv?**');

    // Permisos de la API: una respuesta JSON 403 no debe transformarse en CSV.
    await page.route('**/api/user/my-forms-csv?**', async route =>
        route.fulfill({status:403,contentType:'application/json',
            body:JSON.stringify({status:'error',message:'Acceso denegado QA'})}));
    await page.evaluate(()=>window.processExcelExport());
    const errorText=await page.evaluate(()=>JSON.stringify(window.__swalMessages));
    assert.ok(errorText.includes('Acceso denegado QA'));
    assert.equal((await page.evaluate(()=>window.__calls)).length,before);
    console.log('PASS JSON permission error aborts export without silent fallback');
    await page.unroute('**/api/user/my-forms-csv?**');

    // La API no debe descargar el historial completo ante un error 403 de filtro.
    await page.evaluate(()=>{ window.__denyFilter=true; });
    await page.locator('#search-input').fill('1205');
    await page.waitForFunction(()=>document.getElementById('table-body').textContent.includes('Denegado QA'));
    assert.equal((await page.evaluate(()=>window.__calls)).filter(x=>x==='/user/my-forms').length,0);
    console.log('PASS filter 403 errors never fall back to full-history access');

    // En un servidor viejo que ignora filtered=1, usar sólo allí el contrato legacy.
    await page.evaluate(()=>{window.__denyFilter=false;window.__legacyFiltered=true;});
    await page.locator('#search-input').fill('1200');
    await page.waitForFunction(()=>document.getElementById('table-body').textContent.includes('#1200')
        && window.__calls.some(x=>x==='/user/my-forms'));
    assert.equal(await page.locator('#table-body tr').count(),1);
    console.log('PASS an older API is supported without breaking global search');

    for (const [lang,label] of [['en','Exact ID'],['pt','ID exato']]) {
        const result = await page.evaluate(async ({base,lang})=>{
            localStorage.setItem('lang',lang);
            await (await import(base+'dist/js/pages/usuario/misformularios.js')).initMisFormularios();
            return {text:document.getElementById('misforms-id-hint').textContent,
                count:document.querySelectorAll('#misforms-id-hint').length};
        },{base,lang});
        assert.ok(result.text.includes(label), 'Localized exact-ID help missing for '+lang);
        assert.equal(result.count,1,'Search hint duplicated on reinit');
    }
    console.log('PASS localized EN/PT exact-ID hints remain unique on reinit');

    assert.deepEqual(errors,[]);
    console.log('GROBO_MYFORMS_PAGED_BROWSER_QA_OK checks=19');
} finally {
    await browser.close();
    await new Promise(done=>server.close(done));
}
