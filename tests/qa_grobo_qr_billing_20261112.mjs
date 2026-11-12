/**
 * QR de POE y filtros de facturación con Chrome, sin cuentas ni datos reales.
 */
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const req=createRequire(import.meta.url);
const {chromium}=req(path.join(os.tmpdir(),'grobo-ux-audit','node_modules','playwright-core'));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const front=path.join(root,'front');
const prefix='/URBE-API-DRIVEN/front/';
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
const server=http.createServer((request,response)=>{
 const url=new URL(request.url,'http://localhost');
 if(!url.pathname.startsWith(prefix)){response.writeHead(404);response.end();return;}
 let rel=decodeURIComponent(url.pathname.slice(prefix.length));
 if(rel==='cupae/' || rel==='urbe/') rel='index.html';
 const fp=path.resolve(front,rel);
 if(!fp.startsWith(front+path.sep)&&fp!==front){response.writeHead(403);response.end();return;}
 try{const stat=fs.statSync(fp);if(!stat.isFile())throw Error();
   response.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream'});
   fs.createReadStream(fp).pipe(response);
 }catch{response.writeHead(404);response.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
const base='http://127.0.0.1:'+port+prefix;
const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
 args:['--no-first-run','--disable-extensions']});
let passed=0,failed=0;
async function runTest(name,fn){
 try{await fn();passed++;console.log('PASS',name);}
 catch(e){failed++;console.log('FAIL',name,String(e.message).slice(0,180));}
}
async function context(){
 const ctx=await browser.newContext({viewport:{width:390,height:800},serviceWorkers:'block'});
 await ctx.route('**/*',route=>{
  const u=new URL(route.request().url());
  return u.hostname==='127.0.0.1'&&Number(u.port)===port?route.continue():route.abort();
 });
 return ctx;
}
await runTest('QR CUPAE sin sesion abre login correcto conservando POE',async()=>{
 const ctx=await context();const page=await ctx.newPage();
 const url=base+'paginas/panel/poe.html?id=42&inst=cupae';
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForURL(/\/cupae\/\?next=/,{timeout:10000});
 const dest=new URL(page.url());
 if(!dest.pathname.endsWith('/cupae/')||dest.searchParams.get('next')!==url)throw Error('QR lost institution or ID');
 await ctx.close();
});
await runTest('QR antiguo pregunta institucion en vez de enviar a URBE',async()=>{
 const ctx=await context();const page=await ctx.newPage();
 await page.goto(base+'paginas/panel/poe.html?id=42',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.body.textContent?.includes('Seleccioná tu institución'),{timeout:10000});
 const links=await page.locator('a[href*="next="]').count();
 if(links!==2)throw Error('Legacy POE QR institutions missing');
 await ctx.close();
});
await runTest('QR nuevo guarda institucion e ID para POE puntual',async()=>{
 const ctx=await context();const page=await ctx.newPage();
 await page.goto(base+'index.html',{waitUntil:'domcontentloaded'});
 const result=await page.evaluate(async(paths)=>{
   localStorage.setItem('NombreInst','cupae');
   const a=await import(paths[0]);
   const b=await import(paths[1]);
   return [a.buildPanelPoePublicUrl(42),b.buildPanelPoePublicPageAbsoluteUrl(42)];
 },[base+'dist/js/utils/poeQrPrint.js',base+'dist/js/utils/panelPoeUrl.js']);
 for(const url of result) {
  const p=new URL(url);
  if(p.searchParams.get('id')!=='42'||p.searchParams.get('inst')!=='cupae')throw Error('Wrong POE QR URL');
 }
 await ctx.close();
});
await runTest('solo pendientes y busqueda funciona con filas pagadas y no pagadas',async()=>{
 const ctx=await context();const page=await ctx.newPage();
 await page.goto(base+'index.html',{waitUntil:'domcontentloaded'});
 await page.setContent(
 '<div id="billing-person-hub-mount"></div>'+
 '<div id="billing-results"><table>'+
 '<thead><tr><th>Detalle</th><th>Debe</th></tr></thead>'+
 '<tbody><tr id="unpaid"><td>70 animales <input type="checkbox" data-monto="11900"></td><td>$ 11.900,00</td></tr>'+
 '<tr id="paid"><td>Liquidado <input type="checkbox" data-monto="0"></td><td>$ 0,00</td></tr>'+
 '<tr id="due"><td>46 animales</td><td>$ 7.820,00</td></tr></tbody>'+
 '</table></div>');
 const js=fs.readFileSync(path.join(front,'dist/js/pages/admin/facturacion/billingQuickFilters.js'),'utf8');
 await page.evaluate(async(code)=>{
  const src=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
  await import(src);URL.revokeObjectURL(src);
 },js);
 await page.waitForSelector('#billing-quick-pending');
 await page.locator('#billing-quick-pending').check();
 await page.waitForFunction(()=>document.getElementById('paid')?.classList.contains('d-none'),{timeout:3000});
 if(await page.locator('#unpaid.d-none,#due.d-none').count())throw Error('Unpaid row hidden');
 await page.locator('#unpaid input').check();
 await page.locator('#billing-quick-search').fill('46 animales');
 await page.waitForFunction(()=>document.getElementById('unpaid')?.classList.contains('d-none'),{timeout:3000});
 if(await page.locator('#unpaid input:checked').count())throw Error('Hidden payment remained selected');
 if(!(await page.locator('#unpaid input').isDisabled()))throw Error('Hidden payment not disabled');
 await page.locator('#billing-quick-search').fill('70 animales');
 await page.waitForFunction(()=>document.getElementById('due')?.classList.contains('d-none'),{timeout:3000});
 if(await page.locator('#unpaid.d-none').count())throw Error('Search hides matching row');
 await page.locator('#billing-quick-search').fill('');
 await page.waitForFunction(()=>!document.getElementById('due')?.classList.contains('d-none'),{timeout:3000});
 await page.evaluate(()=>{
  document.querySelector('tbody').innerHTML='<tr id="refresh-paid"><td>Liquidado</td><td>$ 0,00</td></tr><tr id="refresh-unpaid"><td>Nuevo</td><td>$ 5,00</td></tr>';
 });
 await page.waitForFunction(()=>document.getElementById('refresh-paid')?.classList.contains('d-none'),{timeout:3000});
 if(await page.locator('#refresh-unpaid.d-none').count())throw Error('Dynamic new due row hidden');
 await ctx.close();
});
await browser.close();
await new Promise(resolve=>server.close(resolve));
console.log('GROBO_NOV12_UI_QA passed='+passed+' failed='+failed);
if(failed)process.exitCode=1;
