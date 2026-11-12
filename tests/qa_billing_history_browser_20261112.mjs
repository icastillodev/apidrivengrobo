/**
 * Browser E2E simulado: paginación, filtros y exportación CSV.
 * Sin credenciales ni base de datos real.
 */
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(os.tmpdir(),'grobo-ux-audit','node_modules','playwright-core'));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const front=path.join(root,'front');
const prefix='/URBE-API-DRIVEN/front/';
const stats={paged:0,csv:0,requests:[]};
const contentType={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json'};
const server=http.createServer((request,response)=>{
 const uri=new URL(request.url,'http://127.0.0.1');
 if(uri.pathname.startsWith('/URBE-API-DRIVEN/api/')){
  if(uri.pathname.endsWith('/billing/audit-history-csv')){
   stats.csv++;
   response.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="GROBO-QA.csv"'});
   response.end('ID;Nombre;Monto\n1;Test;25\n');return;
  }
  if(uri.pathname.endsWith('/billing/audit-history')){
   stats.paged++;stats.requests.push(uri.searchParams.toString());
   const page=Math.max(1,Number(uri.searchParams.get('page')||1));
   const q=uri.searchParams.get('search')||'';
   const type=uri.searchParams.get('type')||'all';
   const user=uri.searchParams.get('user_id')||'';
   const total=q||type!=='all'||user?3:62;
   const count=Math.min(15,Math.max(0,total-(page-1)*15));
   const rows=Array.from({length:count},(_,i)=>({
     IdHistoPago:page*100+i,IdUsrA:user?Number(user):77,Monto:27.25,
     IdFormA:700+i,fecha:'2026-11-12',TipoHistorial:'CARGA_SALDO',
     AdminCompleto:'Admin',UsrCompleto:'Investigador QA',
     IdentificadorTransferencia:'QA',Comentario:'QA',
   }));
   response.writeHead(200,{'Content-Type':'application/json'});
   response.end(JSON.stringify({status:'success',data:rows,pagination:{
     page,per_page:15,pages:Math.ceil(total/15),total}}));return;
  }
  if(uri.pathname.endsWith('/users/list-investigators')){
   response.writeHead(200,{'Content-Type':'application/json'});
   response.end(JSON.stringify({status:'success',data:[
    {IdUsrA:77,ApellidoA:'Prueba',NombreA:'Uno',SaldoDinero:50},
    {IdUsrA:78,ApellidoA:'<img src=x onerror=alert(1)>',NombreA:'Dos',SaldoDinero:0}
   ]}));return;
  }
  response.writeHead(200,{'Content-Type':'application/json'});
  response.end(JSON.stringify({status:'success',data:{}}));return;
 }
 if(uri.pathname===prefix+'__test.html'){
   response.writeHead(200,{'Content-Type':'text/html'});
   response.end('<html><body>QA</body></html>');return;
 }
 if(!uri.pathname.startsWith(prefix)){response.writeHead(404);response.end();return;}
 const full=path.resolve(front,decodeURIComponent(uri.pathname.slice(prefix.length)));
 if(full!==front&&!full.startsWith(front+path.sep)){response.writeHead(403);response.end();return;}
 try{
  if(!fs.statSync(full).isFile())throw Error();
  response.writeHead(200,{'Content-Type':contentType[path.extname(full)]||'application/octet-stream'});
  fs.createReadStream(full).pipe(response);
 }catch{response.writeHead(404);response.end('Missing');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const url='http://127.0.0.1:'+server.address().port+prefix;
const browser=await chromium.launch({headless:true,
 executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
 args:['--no-first-run','--disable-extensions']});
let pass=0,fail=0;
async function verify(label,fn){
 try{await fn();pass++;console.log('PASS '+label);}
 catch(e){fail++;console.log('FAIL '+label+' '+e.message.slice(0,180));}
}
const ctx=await browser.newContext({viewport:{width:390,height:840},acceptDownloads:true,serviceWorkers:'block'});
await ctx.addInitScript(()=>{
 localStorage.setItem('instId','12');localStorage.setItem('userId','77');
 localStorage.setItem('token','fixture-token');
 window.txt={generales:{},admin_historialcontable:{},facturacion:{hub:{}}};
});
const page=await ctx.newPage();
const exceptions=[];page.on('pageerror',e=>exceptions.push(e.message));
await page.goto(url+'__test.html');
await page.setContent([
 '<div id="historial-carga-error" class="d-none"></div>',
 '<button id="btn-search">Buscar</button>',
 '<input id="search-input" />',
 '<select id="filter-type"><option value="all">Todos</option><option value="CARGA_SALDO">Cargas</option></select>',
 '<select id="filter-column"><option value="all">Todos</option><option value="Investigador">Investigador</option></select>',
 '<input id="inv-hist-search" />',
 '<button id="btn-inv-ver-todos">Todos</button>',
 '<div id="lista-invest-historial"></div><p id="lista-invest-historial-empty" class="d-none"></p>',
 '<div id="hist-person-summary" class="d-none"></div>',
 '<button id="btn-excel">Exportar CSV</button>',
 '<table><tbody id="table-body-historial"></tbody></table>',
 '<div id="table-info"></div><ul id="pagination-historial"></ul>'
].join(''));
await page.evaluate(async base=>{
 const m=await import(base+'dist/js/pages/admin/historialcontable.js');
 await m.initHistorialContable();
},url);
await verify('first page loads 15 rows and displays 62 total',async()=>{
 if(await page.locator('#table-body-historial tr').count()!==15)throw Error('Wrong page size');
 const info=await page.locator('#table-info').innerText();
 if(!info.includes('62'))throw Error('Total not shown '+info);
 if(stats.paged!==1)throw Error('Expected one paged fetch: '+stats.paged);
});
await verify('changing page requests backend, no full reload',async()=>{
 await page.locator('#pagination-historial li a').filter({hasText:'2'}).first().click();
 await page.waitForFunction(()=>document.getElementById('table-body-historial')?.textContent?.includes('#200'),{timeout:4000});
 if(!stats.requests.at(-1)?.includes('page=2'))throw Error('Page number not passed');
});
await verify('query and type filtered on server',async()=>{
 await page.locator('#search-input').fill('investigador');
 await page.waitForTimeout(500);
 await page.waitForFunction(()=>document.querySelectorAll('#table-body-historial tr').length===3,{timeout:4000});
 if(!stats.requests.at(-1)?.includes('search=investigador'))throw Error('Search not passed');
 await page.locator('#filter-type').selectOption('CARGA_SALDO');
 await page.waitForTimeout(150);
 if(!stats.requests.at(-1)?.includes('type=CARGA_SALDO'))throw Error('Filter missing');
});
await verify('investigator names are escaped in HTML',async()=>{
 const img=await page.locator('#lista-invest-historial img').count();
 if(img!==0)throw Error('Unsafe HTML inserted');
 const txt=await page.locator('#lista-invest-historial').innerText();
 if(!txt.includes('<img'))throw Error('Name escaped incorrectly');
});
await verify('CSV downloads all rows matching server filters',async()=>{
 const pending=page.waitForEvent('download',{timeout:8000});
 await page.locator('#btn-excel').click();
 const download=await pending;
 if(!download.suggestedFilename().endsWith('.csv'))throw Error('Unexpected file');
 if(stats.csv!==1)throw Error('CSV API not used');
});
if(exceptions.length){fail++;console.log('FAIL browser exceptions '+exceptions.slice(0,3).join(' | '));}
await browser.close();
await new Promise(ok=>server.close(ok));
console.log('GROBO_BILLING_HISTORY_UI_QA passed='+pass+' failed='+fail+' paged_requests='+stats.paged);
if(fail)process.exitCode=1;
