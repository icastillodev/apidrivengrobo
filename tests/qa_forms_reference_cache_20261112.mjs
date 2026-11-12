/**
 * GROBO: prueba de caché por sesión e institución + prefetch limitado.
 * HTTP simulado local, sin tokens ni datos institucionales reales.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(os.tmpdir(),'grobo-ux-audit','node_modules','playwright-core'));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const front=path.join(root,'front');
const prefix='/URBE-API-DRIVEN/front/';
const callCounts={departments:{},list:[]};
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1');
 if(u.pathname==='/URBE-API-DRIVEN/api/deptos/list'){
  const inst=u.searchParams.get('inst')||'session';
  callCounts.departments[inst]=(callCounts.departments[inst]||0)+1;
  const result=inst==='3'?{status:'error',message:'simulated failure'}:{
   status:'success',data:[{id:99,inst,nombre:'Departamento QA'}]
  };
  res.writeHead(200,{'Content-Type':'application/json'});
  res.end(JSON.stringify(result));return;
 }
 if(u.pathname==='/URBE-API-DRIVEN/api/animals/all'){
  callCounts.list.push(Number(u.searchParams.get('offset')||0));
  res.writeHead(200,{'Content-Type':'application/json'});
  res.end(JSON.stringify({status:'success',data:[{idformA:Number(u.searchParams.get('offset')||0)}]}));return;
 }
 if(u.pathname===prefix+'__qa_cache.html'){
  res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><html><body>GROBO QA</body></html>');return;
 }
 if(!u.pathname.startsWith(prefix)){res.writeHead(404);res.end();return;}
 const rel=decodeURIComponent(u.pathname.slice(prefix.length));
 const file=path.resolve(front,rel);
 if(file!==front&&!file.startsWith(front+path.sep)){res.writeHead(403);res.end();return;}
 try{
  if(!fs.statSync(file).isFile())throw Error('not file');
  const type=path.extname(file)==='.js'?'text/javascript':'application/octet-stream';
  res.writeHead(200,{'Content-Type':type});
  fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(404);res.end('Missing');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
const browser=await chromium.launch({headless:true,
 executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
 args:['--no-first-run','--disable-extensions']});
const ctx=await browser.newContext({viewport:{width:390,height:840},serviceWorkers:'block'});
const page=await ctx.newPage();
const errors=[];page.on('pageerror',err=>errors.push(err.message));
await page.goto('http://127.0.0.1:'+port+prefix+'__qa_cache.html');
const url='http://127.0.0.1:'+port+prefix;
const start=await page.evaluate(async base=>{
 sessionStorage.setItem('token','qa-session-a');
 sessionStorage.setItem('userId','1001');
 const m=await import(base+'dist/js/utils/referenceDataCache.js');
 const [a,b,c]=await Promise.all([
  m.getDepartmentsCached(1),m.getDepartmentsCached(1),m.getDepartmentsCached(1)]);
 const d=await m.getDepartmentsCached(2);
 return {same:a.status==='success'&&b.status==='success'&&c.status==='success',
  separated:d.data?.[0]?.inst==='2'};
},url);
if(!start.same||!start.separated||
 callCounts.departments['1']!==1||callCounts.departments['2']!==1){
 throw Error('Department cache failed to coalesce or separate tenants');
}
console.log('PASS department concurrent deduplication');
console.log('PASS department institution isolation');
const next=await page.evaluate(async base=>{
 const m=await import(base+'dist/js/utils/referenceDataCache.js');
 sessionStorage.setItem('token','qa-session-b');
 await m.getDepartmentsCached(1);
 await m.getDepartmentsCached(3);
 await m.getDepartmentsCached(3);
 return true;
},url);
if(callCounts.departments['1']!==2 || callCounts.departments['3']!==2)
 throw Error('Auth change or failed result remained cached');
console.log('PASS token change invalidates cache');
console.log('PASS failed requests never cached');
await page.evaluate(async base=>{
 const m=await import(base+'dist/js/utils/adminListPageCache.js');
 const build=extra=>{
  const p=new URLSearchParams({inst:'1'});
  if(!extra.fullLoad){
   p.set('limit',String(extra.limit||15));
   p.set('offset',String(extra.offset||0));
  }
  return p;
 };
 const c=m.createAdminListPageCache(15,build,'/animals/all');
 const gen=c.syncFiltersKey();
 c.schedulePrefetchAround(180,5,gen);
 window.__qaCache=c;
},url);
await page.waitForTimeout(2300);
const prefetch=[...callCounts.list].sort((a,b)=>a-b);
if(prefetch.join(',')!=='45,75')throw Error('Expected 2 idle neighbors, got '+prefetch.join(','));
const bound=await page.evaluate(()=>{
 const c=window.__qaCache;
 for(let n=1;n<=100;n++)c.pageCache.set(n,[{id:n}]);
 return {size:c.pageCache.size,oldest:c.pageCache.keys().next().value};
});
if(bound.size!==12||bound.oldest<80)throw Error('Page cache not bounded '+JSON.stringify(bound));
console.log('PASS only next/previous page prefetched');
console.log('PASS bounded cache at 12 pages');
if(errors.length)throw Error('Browser exceptions: '+errors.join(' | '));
await browser.close();
await new Promise(resolve=>server.close(resolve));
console.log('GROBO_FORMS_CACHES_QA_OK checks=6');
