/**
 * GROBO Estadísticas - prueba integral en Chrome con API simulada.
 * Sin datos/credenciales reales. Bootstrap/jsPDF no acceden a producción.
 */
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(os.tmpdir(),'grobo-ux-audit','node_modules','playwright-core'));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const front=path.join(root,'front');
const html=fs.readFileSync(path.join(front,'paginas','admin','estadisticas.html'),'utf8')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const prefix='/URBE-API-DRIVEN/front/';
const fake={
 globales:{total_animales:745,total_reactivos:28,total_insumos:65,total_protocolos:22,total_alojamientos:19},
 por_departamento:[{departamento:'Laboratorio A',total_animales:745,total_reactivos:28,total_insumos:65,protocolos_aprobados:22}],
 por_organizacion:[{organizacion:'Instituto QA',total_animales:745,total_reactivos:28,total_insumos:65,protocolos_aprobados:22}],
 alojamientos_activos:[{departamento:'Laboratorio A',cantidad:19}],
 ranking_especies:[{etiqueta_especie:'Raton QA',cantidad:745}],
 ranking_cepas:[{cepa:'Cepa de ensayo',cantidad_animales:745}],
 detalle_especies:[{departamento:'Laboratorio A',especie:'Ratón QA',subespecie:'General',cantidad_animales:745}],
 detalle_cepas:[{departamento:'Laboratorio A',cepa:'Cepa de ensayo',cantidad_animales:745}],
 detalle_protocolos:[{departamento:'Laboratorio A',nprotA:'QA-123',tituloA:'Protocolo sintético',FechaFinProtA:'2027-01-01'}],
 categorias_formularios:[{categoria:'Animales',cantidad:15}],
 derivacion_pedidos:{activo:false},
 alojamiento_trazabilidad:null,
};
const requests={sede:0,red:0,flags:0};
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8',
 '.css':'text/css;charset=utf-8','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname.startsWith('/URBE-API-DRIVEN/api/stats/')){
  const key=pathname.includes('dashboard-red')?'red':pathname.includes('institution-flags')?'flags':'sede';
  requests[key]++;
  const obj=key==='flags'?{madre_grupo:1,instituciones_en_red:2,red:'Red QA'}:fake;
  res.writeHead(200,{'Content-Type':'application/json'});
  res.end(JSON.stringify({status:'success',data:obj}));
  return;
 }
 if(pathname===prefix+'__qa_estadisticas.html'){
  res.writeHead(200,{'Content-Type':mime['.html']});res.end(html);return;
 }
 if(!pathname.startsWith(prefix)){res.writeHead(404);res.end('Not found');return;}
 let rel;
 try{rel=decodeURIComponent(pathname.slice(prefix.length));}
 catch{res.writeHead(400);res.end('Bad URL');return;}
 const full=path.resolve(front,rel);
 if(full!==front&&!full.startsWith(front+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
 try{
  if(!fs.statSync(full).isFile())throw Error();
  res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream'});
  fs.createReadStream(full).pipe(res);
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port+prefix;
const browser=await chromium.launch({headless:true,
 executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
 args:['--no-first-run','--disable-extensions']});
const libraries=path.join(os.tmpdir(),'grobo-ux-audit','node_modules');
const jsPDF=fs.readFileSync(path.join(libraries,'jspdf','dist','jspdf.umd.min.js'));
const autoTable=fs.readFileSync(path.join(libraries,'jspdf-autotable','dist','jspdf.plugin.autotable.min.js'));
let passed=0,failed=0;
async function check(name,test){
 try{await test();passed++;console.log('PASS',name);}
 catch(e){failed++;console.log('FAIL',name,String(e.message).slice(0,290));}
}
for(const width of [390,768,1366]){
 const ctx=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',acceptDownloads:true});
 await ctx.addInitScript(()=>{
   localStorage.setItem('lang','es');
   localStorage.setItem('instId','1');
   localStorage.setItem('userId','51');
   localStorage.setItem('NombreInst','urbe');
   localStorage.setItem('userLevel','2');
   localStorage.setItem('token','fixture-not-authenticated');
   class MockChart{
     constructor(canvas,config){this.canvas=canvas?.canvas||canvas;this.config=config;this.data=config.data;this.options=config.options;}
     destroy(){}resize(){}getDatasetMeta(){return {hidden:false,data:[]};}
   }
   MockChart.register=()=>{};
   window.Chart=MockChart;
   window.txt={admin_estadisticas:{},generales:{no_data:'Sin datos'}};
 });
 await ctx.route('**/*',route=>{
   const url=route.request().url();
   const parsed=new URL(url);
   if(parsed.hostname==='127.0.0.1'&&Number(parsed.port)===server.address().port)return route.continue();
   const responseHeaders={'access-control-allow-origin':'*'};
   if(url.includes('/jspdf/2.5.1/jspdf.umd.min.js')){
     return route.fulfill({status:200,contentType:'application/javascript',headers:responseHeaders,body:jsPDF});
   }
   if(url.includes('/jspdf-autotable/3.8.1/jspdf.plugin.autotable.min.js')){
     return route.fulfill({status:200,contentType:'application/javascript',headers:responseHeaders,body:autoTable});
   }
   if(route.request().resourceType()==='stylesheet')
     return route.fulfill({status:200,contentType:'text/css',body:''});
   return route.abort();
 });
 const page=await ctx.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message.slice(0,130)));
 await page.goto(origin+'__qa_estadisticas.html',{waitUntil:'domcontentloaded'});
 await check('stats-toolbar-and-first-load-'+width,async()=>{
   await page.evaluate(async origin=>{
     const m=await import(origin+'dist/js/pages/admin/GeckoStats.js');
     await m.initStatsPage();
   },origin);
   await page.waitForFunction(()=>document.getElementById('box-animales')?.textContent?.includes('745'),{timeout:14000});
   if((await page.locator('#stats-toolbar button').count())<4)throw Error('Missing filters');
   if(errors.length)throw Error(errors.join(' | '));
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   if(overflow>4)throw Error('Horizontal overflow '+overflow);
 });
 if(width===390){
   await check('stats-period-presets-and-client-cache',async()=>{
     await page.locator('button[data-stats-preset="7"]').click();
     await page.waitForFunction(()=>document.getElementById('stats-update-text')?.textContent?.includes('Datos'),{timeout:10000});
     const after7=requests.sede;
     await page.locator('button[data-stats-preset="30"]').click();
     await page.waitForFunction(()=>document.getElementById('stats-update-text')?.textContent?.includes('Datos'),{timeout:10000});
     await page.locator('button[data-stats-preset="7"]').click();
     await page.waitForFunction(()=>document.getElementById('stats-update-text')?.textContent?.includes('recientes'),{timeout:10000});
     if(requests.sede!==after7+1)throw Error('Cache did not reuse earlier range');
     await page.locator('#btn-update-stats').click();
     await page.waitForFunction(()=>document.getElementById('stats-update-text')?.textContent?.includes('actualizados'),{timeout:10000});
     if(requests.sede!==after7+2)throw Error('Manual refresh failed to hit API');
   });
   await check('stats-red-access-and-export-both',async()=>{
     await page.evaluate(()=>{
       const e=document.getElementById('tab-red-btn');
       document.getElementById('pane-sede')?.classList.remove('show','active');
       document.getElementById('pane-red')?.classList.add('show','active');
       e.dispatchEvent(new Event('shown.bs.tab'));
     });
     await page.waitForFunction(()=>document.getElementById('red-box-animales')?.textContent?.includes('745'),{timeout:10000});
     if(requests.red<1)throw Error('Red never requested');
     if(await page.locator('#stats-pdf-both').isDisabled())throw Error('Network+institution PDF disabled');
     await page.locator('#stats-pdf-both').check();
     await page.locator('#stats-pdf-charts').uncheck();
     await page.locator('#stats-pdf-section').selectOption('detalle_protocolos');
     const pending=page.waitForEvent('download',{timeout:18000});
     await page.locator('#stats-pdf-complete').click();
     const download=await pending;
     if(!download.suggestedFilename().endsWith('.pdf'))throw Error('Not PDF download');
     const file=path.join(os.tmpdir(),'grobo-ux-audit','report','stats-ui-download-20261112.pdf');
     await download.saveAs(file);
     const bytes=fs.readFileSync(file);
     if(bytes.length<900||bytes.subarray(0,5).toString()!=='%PDF-')throw Error('PDF corrupted');
     console.log('PDF_BROWSER_DOWNLOAD size_kb='+Math.round(bytes.length/1024));
   });
 }
 await page.close();
 await ctx.close();
}
await browser.close();
await new Promise(resolve=>server.close(resolve));
console.log('STATS_UI_QA passed='+passed+' failed='+failed+' API_CALLS='+JSON.stringify(requests));
if(failed)process.exitCode=1;
