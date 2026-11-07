/**
 * GROBO: QA funcional seguro con fixtures locales. No usa credenciales ni API real.
 * Ejercita UI con JS habilitado, pruebas de noticias y formulario de animales.
 * Los requests salen SOLO al servidor HTTP temporal en 127.0.0.1.
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const front=path.join(project,'front');
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(os.tmpdir(),'grobo-ux-audit','node_modules','playwright-core'));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
const fixture={
 IdNoticia:42,
 Titulo:'Aviso de prueba <img src=x onerror=alert(1)>',
 Cuerpo:'Contenido de prueba <script>window.__xss=1</script>',
 Categoria:'Noticia & Comunicados',
 CategoriaBadge:'success',
 FechaPublicacion:'2026-11-07 11:00:00',
 NombreInstitucion:'URBE',
 ImagenPortadaB2Key:null,
 AdjuntoDoc1B2Key:null,
 AdjuntoDoc2B2Key:null
};
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://127.0.0.1').pathname;
 if(pathname.startsWith('/URBE-API-DRIVEN/api/reservas/sala/public-bundle')){
  const query=new URL(req.url,'http://127.0.0.1').searchParams;
  const day=(query.get('from')||'2026-11-01').slice(0,7)+'-14';
  res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'});
  res.end(JSON.stringify({status:'success',data:{
    sala:{IdSalaReserva:123,Nombre:'Sala de ensayo',Lugar:'Laboratorio de prueba'},
    availableDays:[day],
    slotsByDay:{[day]:[{start:'09:00',end:'09:30'},{start:'09:30',end:'10:00'}]},
    busyByDay:{[day]:[{start:'<img src=x onerror=window.__qaXss=1>',end:'10:30',mine:false}]}
  }}));return;
 }
 if(pathname.startsWith('/URBE-API-DRIVEN/api/reservas/institucion/public-bundle')){
  res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'});
  res.end(JSON.stringify({status:'success',data:{
    institucion:{NombreInst:'URBE'},
    salas:[{sala:{IdSalaReserva:123,Nombre:'Sala de ensayo',Lugar:'Laboratorio de prueba',QrToken:'sala-qa'},busyByDay:{[new Date().toISOString().slice(0,10)]:[{start:'<img src=x onerror=window.__qaXss=1>',end:'12:30',mine:false}]}}]
  }}));return;
 }
 if(pathname.startsWith('/URBE-API-DRIVEN/api/')){
  const isNews=pathname==='/URBE-API-DRIVEN/api/comunicacion/noticias/public/42';
  res.writeHead(isNews?200:404,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*'});
  res.end(JSON.stringify(isNews?{status:'success',data:fixture}:{status:'error',message:'No se encontro la noticia'}));
  return;
 }
 const prefix='/URBE-API-DRIVEN/front/';
 if(!pathname.startsWith(prefix)){
  res.writeHead(404);res.end('not found');return;
 }
 const rel=decodeURIComponent(pathname.slice(prefix.length));
 if(rel==='__test_animals.html'){
  const raw=fs.readFileSync(path.join(front,'paginas/usuario/formularios/animales.html'),'utf8');
  const clean=raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  res.writeHead(200,{'Content-Type':mime['.html']});
  res.end(clean);return;
 }
 const fp=path.resolve(front,rel);
 if(fp!==front&&!fp.startsWith(front+path.sep)){
  res.writeHead(403);res.end('forbidden');return;
 }
 try{
  const st=fs.statSync(fp);
  if(!st.isFile())throw new Error('not a file');
  res.writeHead(200,{'Content-Type':mime[path.extname(fp).toLowerCase()]||'application/octet-stream'});
  fs.createReadStream(fp).pipe(res);
 } catch(e){res.writeHead(404);res.end('not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
const origin='http://127.0.0.1:'+port+'/URBE-API-DRIVEN/front/';
const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',args:['--no-first-run','--disable-extensions']});
const report=[];
async function pageSetup(width){
 const context=await browser.newContext({viewport:{width,height:780},hasTouch:width<=1024,isMobile:width<600,
   serviceWorkers:'block'});
 await context.route('**/*',async route=>{
  const req=route.request();
  const url=new URL(req.url());
  if(url.hostname==='127.0.0.1'&&Number(url.port)===port)return route.continue();
  if(req.resourceType()==='stylesheet')return route.fulfill({status:200,contentType:'text/css',body:''});
  if(req.resourceType()==='script')return route.fulfill({status:200,contentType:'text/javascript',body:''});
  return route.abort();
 });
 const page=await context.newPage();
 await page.addInitScript(() => {
   window.__qaAlerts=[];
   window.Swal={
     fire:(...args)=>{window.__qaAlerts.push(args);return Promise.resolve({isConfirmed:false});},
     showLoading:()=>{},close:()=>{}
   };
 });
 const errs=[];
 page.on('pageerror',err=>errs.push(String(err.message).slice(0,250)));
 return {context,page,errs};
}
function assert(test,why){if(!test)throw Error(why);}
async function runNews(label,pathUrl,width,assertion){
 const {context,page,errs}=await pageSetup(width);
 try{
  await page.goto(origin+pathUrl,{waitUntil:'domcontentloaded',timeout:14000});
  await assertion(page);
  report.push({test:label,device:width,status:'pass',pageErrors:errs});
  console.log('PASS',label,width,'js_errors='+errs.length);
 }catch(err){report.push({test:label,device:width,status:'fail',reason:err.message,pageErrors:errs});console.log('FAIL',label,width,err.message,'js_errors='+JSON.stringify(errs));}
 finally{await context.close();}
}
for(const width of [390,768,1366]){
 await runNews('public-news-valid','paginas/noticia-publica.html?id=42',width,async page=>{
  await page.waitForSelector('#noticia-publica-article:not(.d-none)',{timeout:6500});
  const state=await page.evaluate(()=>({
   title:document.getElementById('noticia-publica-titulo')?.textContent,
   body:document.getElementById('noticia-publica-cuerpo')?.textContent,
   img:!!document.querySelector('#noticia-publica-article img'),
   overflow:document.documentElement.scrollWidth-innerWidth,
   bad:window.__xss||0
  }));
  assert(state.title===fixture.Titulo,'titulo de noticia incorrecto');
  assert(state.body===fixture.Cuerpo,'texto noticia incorrecto');
  assert(state.bad===0,'texto no seguro fue ejecutado');
  assert(!state.img,'HTML en titulo insertado como elemento');
  assert(state.overflow<=2,'desborde horizontal');
 });
}
await runNews('public-news-invalid','paginas/noticia-publica.html?id=abc',390,async page=>{
 await page.waitForSelector('#noticia-publica-error:not(.d-none)',{timeout:6500});
 assert(await page.locator('#noticia-publica-article.d-none').count()===1,'se mostro articulo invalido');
});
await runNews('public-news-404','paginas/noticia-publica.html?id=999',390,async page=>{
 await page.waitForSelector('#noticia-publica-error:not(.d-none)',{timeout:6500});
 assert((await page.locator('#noticia-publica-error').innerText()).length>0,'mensaje 404 vacio');
});
await runNews('animal-form-mock','__test_animals.html',390,async page=>{
 const state=await page.evaluate(async()=>{
  localStorage.setItem('instId','1');
  localStorage.setItem('userId','999999');
  window.txt={form_animales:{seleccione_tipo:'Seleccione tipo', tipo_unico_hint:'Tipo disponible'},generales:{}};
  const {API}=await import('/URBE-API-DRIVEN/front/dist/js/api.js');
  API.request=async(endpoint)=>{
   if(endpoint.startsWith('/animals/pdf-data'))return {status:'success',data:{}};
   if(endpoint.startsWith('/animals/search-protocols'))return {status:'success',data:{protocols:[],user_email:'qa@example.invalid',form_types:[{IdTipoFormulario:1,nombreTipo:'Pedido animales'}]}};
   if(endpoint.startsWith('/user/protocols/config'))return {status:'success',data:{has_network:false,has_approved_vigent:false}};
   return {status:'error',message:'mock endpoint desconocido'};
  };
  const {initAnimalForm}=await import('/URBE-API-DRIVEN/front/dist/js/pages/usuario/formularios/animales.js');
  await initAnimalForm();
  const qty=document.getElementById('qty-macho');
  qty.value='3';qty.dispatchEvent(new Event('input',{bubbles:true}));
  const total=document.getElementById('qty-total')?.value;
  const type=document.getElementById('select-tipo-form');
  window.resetSelection();
  return {forms:document.querySelectorAll('#animal-form').length,step2:document.querySelectorAll('#step-2').length,
   selected:type?.value,optionCount:type?.options.length,total,hidden:document.getElementById('step-2').classList.contains('hidden-section')};
 });
 assert(state.forms===1&&state.step2===1,'duplicado de formularios');
 assert(state.optionCount===2,'no cargo tipos de solicitud');
 assert(state.total==='3','suma de cantidades incorrecta: '+state.total);
 assert(state.hidden,'resetSelection no oculta el paso');
});
for(const width of [390,768]){
 await runNews('qr-sala-public-readonly','paginas/qr-sala.html?token=fixture-sala',width,async page=>{
  await page.waitForFunction(()=>document.getElementById('sala-nombre')?.textContent?.includes('Sala de ensayo'),{timeout:6500});
  assert(await page.locator('#calendar-grid .day-cell').count()>=28,'calendario no se renderizó');
  const day=page.locator('#calendar-grid .day-cell[data-date$="-14"]').first();
  await day.focus();
  await day.press('Enter');
  assert(await page.locator('#calendar-grid .day-cell[data-date$="-14"]').getAttribute('aria-pressed')==='true','el calendario no funciona con Enter');
  assert(await page.evaluate(()=>document.activeElement?.dataset?.date?.endsWith('-14')),'el foco no vuelve al dia seleccionado');
  assert(await page.locator('#slots-list button').count()===2,'franjas disponibles incorrectas');
  assert(await page.locator('#busy-list img').count()===0,'HTML inseguro inyectado en reservas');
  assert(await page.evaluate(()=>!window.__qaXss),'código de horarios se ejecutó');
  assert(await page.locator('#btn-reservar').isDisabled(),'se permitió reservar sin iniciar sesión');
  await page.locator('#slots-list button').first().click();
  assert(await page.locator('#btn-reservar').isDisabled(),'botón de reserva activo sin sesión');
  await page.evaluate(()=>localStorage.setItem('token','fake-token-for-test-only'));
  await page.locator('#slots-list button').first().click();
  await page.locator('#slots-list button').first().click();
  assert(await page.locator('#btn-reservar').isEnabled(),'reserva debería habilitarse con sesión simulada y franja elegida');
  await page.evaluate(()=>localStorage.removeItem('token'));
 });
 await runNews('qr-salas-public-readonly','paginas/qr-salas.html?token=fixture-institucion',width,async page=>{
  await page.waitForFunction(()=>document.getElementById('inst-nombre')?.textContent?.includes('URBE'),{timeout:6500});
  assert(await page.locator('#salas-list .card').count()===1,'listado de salas incorrecto');
  assert(await page.locator('#salas-list img').count()===0,'HTML inseguro inyectado en listado');
  assert(await page.evaluate(()=>!window.__qaXss),'script malicioso en listado de reservas');
  const href=await page.locator('#salas-list .card a').getAttribute('href');
  assert(!!href?.includes('paginas/qr-sala.html?token=sala-qa'),'URL de QR de sala incorrecta');
  await page.locator('#btn-qr-salas-reload').click();
  await page.waitForFunction(()=>document.getElementById('salas-list')?.textContent?.includes('Sala de ensayo'),{timeout:6500});
 });
}
await runNews('qr-sala-session-only-logout','paginas/qr-sala.html?token=fixture-sala',390,async page=>{
 await page.waitForFunction(()=>document.getElementById('sala-nombre')?.textContent?.includes('Sala de ensayo'),{timeout:6500});
 await page.evaluate(()=>{
   sessionStorage.setItem('token','qa-session-only');
   sessionStorage.setItem('userName','Usuario QA');
   sessionStorage.setItem('userLevel','3');
   localStorage.setItem('lang','es');
   localStorage.setItem('theme','dark');
   localStorage.setItem('NombreInst','URBE');
 });
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForSelector('#auth-zone .bi-person-circle',{state:'attached',timeout:6500});
 const day=page.locator('#calendar-grid .day-cell[data-date$="-14"]').first();
 await day.click();
 await page.locator('#slots-list button').first().click();
 assert(await page.locator('#btn-reservar').isEnabled(),'sesion temporal de navegador no permite reservar');
 await page.locator('#auth-zone button').click();
 await page.waitForSelector('#auth-zone .bi-person-lock',{state:'attached',timeout:6500});
 const state=await page.evaluate(()=>({
   localToken:localStorage.getItem('token'),
   sessionToken:sessionStorage.getItem('token'),
   sessionName:sessionStorage.getItem('userName'),
   lang:localStorage.getItem('lang'),
   theme:localStorage.getItem('theme'),
   inst:localStorage.getItem('NombreInst')
 }));
 assert(!state.localToken&&!state.sessionToken&&!state.sessionName,'logout no elimino ambas sesiones');
 assert(state.lang==='es'&&state.theme==='dark'&&state.inst==='URBE','logout borro preferencias o sede');
});
await runNews('qr-salas-session-only-logout','paginas/qr-salas.html?token=fixture-institucion',390,async page=>{
 await page.waitForFunction(()=>document.getElementById('inst-nombre')?.textContent?.includes('URBE'),{timeout:6500});
 await page.evaluate(()=>{
   sessionStorage.setItem('token','qa-session-only');
   sessionStorage.setItem('userName','Usuario QA');
   sessionStorage.setItem('userLevel','3');
   localStorage.setItem('NombreInst','URBE');
 });
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForSelector('#auth-zone .bi-person-circle',{state:'attached',timeout:6500});
 await page.locator('#auth-zone button').click();
 await page.waitForSelector('#auth-zone .bi-person-lock',{state:'attached',timeout:6500});
 assert(await page.evaluate(()=>!sessionStorage.getItem('token')&&!localStorage.getItem('token')),'logout salas dejo sesion activa');
});
await browser.close();await new Promise(resolve=>server.close(resolve));
const folder=path.join(os.tmpdir(),'grobo-ux-audit','report');
fs.mkdirSync(folder,{recursive:true});
fs.writeFileSync(path.join(folder,'functional-mocks.json'),JSON.stringify(report,null,2));
console.log('SUMMARY_PASS',report.filter(x=>x.status==='pass').length,'FAIL',report.filter(x=>x.status!=='pass').length);
if(report.some(x=>x.status!=='pass'))process.exitCode=1;
