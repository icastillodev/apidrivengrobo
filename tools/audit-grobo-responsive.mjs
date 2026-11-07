/**
 * Auditoría visual sin login, sin ejecutar código de aplicación ni modificar datos.
 * Ejecutar: node tools/audit-grobo-responsive.mjs
 * Dependencia aislada: npm install --prefix %TEMP%/grobo-ux-audit --no-save playwright-core
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const cwd = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(cwd, '..');
const lib = path.join(os.tmpdir(), 'grobo-ux-audit', 'node_modules', 'playwright-core');
const require = createRequire(import.meta.url);
const { chromium } = require(lib);
const base = path.join(project, 'front');
const output = path.join(os.tmpdir(), 'grobo-ux-audit', 'report');
fs.mkdirSync(output, { recursive: true });

function htmlPaths(dir, result=[]) {
  for (const item of fs.readdirSync(dir, { withFileTypes:true })) {
    const p = path.join(dir,item.name);
    if (item.isDirectory()) htmlPaths(p,result);
    else if (item.name.endsWith('.html') && !item.name.endsWith('.html.html')) result.push(p);
  }
  return result;
}
const all = [path.join(base,'index.html'), ...htmlPaths(path.join(base,'paginas'))];
const sample = new Set([
 'index.html','paginas/registro.html','paginas/recuperar.html',
 'paginas/admin/dashboard.html','paginas/admin/protocolos.html','paginas/admin/historialcontable.html',
 'paginas/admin/usuarios.html','paginas/admin/alojamientos.html','paginas/admin/reservas.html',
 'paginas/admin/facturacion/index.html','paginas/admin/facturacion/investigador.html',
 'paginas/admin/configuracion/tipos-form.html','paginas/admin/precios.html',
 'paginas/panel/dashboard.html','paginas/panel/misprotocolos.html','paginas/panel/misformularios.html',
 'paginas/usuario/formularios/insumos.html','paginas/usuario/formularios/animales.html',
 'paginas/superadmin/dashboard.html','paginas/superadmin/instituciones.html'
]);
const onlySample = process.argv.includes('--sample');
const pages = all.filter(p => !onlySample || sample.has(path.relative(base,p).replaceAll('\\','/')));
const widths = process.argv.includes('--micro') ? [320] : process.argv.includes('--narrow') ? [360] : process.argv.includes('--phone') ? [390] : process.argv.includes('--tablet') ? [768,1024] : process.argv.includes('--desktop') ? [390,768,1024,1366] : [360,390,768,1024];
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless:true,
  args:['--no-first-run','--disable-extensions']
});
const findings=[];
for (const width of widths) {
  const context = await browser.newContext({viewport:{width,height:850},deviceScaleFactor:1,
    isMobile:width<=390,hasTouch:width<=1024,javaScriptEnabled:false,
    ignoreHTTPSErrors:false});
  let done=0;
  for (const p of pages) {
    const rel=path.relative(base,p).replaceAll('\\','/');
    const page=await context.newPage();
    try {
      await page.goto(pathToFileURL(p).href, {waitUntil:'domcontentloaded',timeout:15000});
      await page.evaluate(() => document.body.classList.add('gecko-loaded'));
      await page.waitForTimeout(70);
      const metrics=await page.evaluate((expectedWidth) => {
        const w=window.innerWidth;
        const root=Math.max(document.documentElement.scrollWidth,document.body?.scrollWidth||0);
        const hits=[];
        const nodes=document.querySelectorAll('body *');
        for(const el of nodes) {
          const style=getComputedStyle(el);
          if(style.display==='none'||style.visibility==='hidden'||style.position==='fixed'||style.opacity==='0') continue;
          const r=el.getBoundingClientRect();
          if(r.height===0||r.width===0) continue;
          if(r.right > expectedWidth+3 && r.left < expectedWidth && r.top < 1300) {
            if(hits.length<12) hits.push({tag:el.tagName.toLowerCase(),id:el.id,
              cls:String(el.className).slice(0,65),left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width)});
          }
        }
        const tables=[...document.querySelectorAll('table')].filter(t=> {
          const r=t.getBoundingClientRect(),s=getComputedStyle(t);
          return s.display!=='none'&&r.width>0;
        });
        const tableUnwrapped=tables.filter(t=>!t.closest('.table-responsive, .overflow-auto, [style*="overflow-x"]'));
        const inputs=[...document.querySelectorAll('input,select,textarea')].filter(x=>x.type!=='hidden'&&getComputedStyle(x).display!=='none');
        const unlabeled=inputs.filter(x=>!x.getAttribute('aria-label')&&!x.getAttribute('aria-labelledby')&&!x.labels?.length&&
          !x.getAttribute('placeholder')&&!x.getAttribute('title'));
        return {overflowPx:Math.max(0,root-w),root,innerWidth:w,
          offenders:hits,unwrappedTables:tableUnwrapped.length,tableCount:tables.length,
          inputCount:inputs.length,unlabeledCount:unlabeled.length,
          viewportMeta:!!document.querySelector('meta[name=viewport]')};
      },width);
      findings.push({path:rel,width,viewportExpansionPx:Math.max(0,metrics.innerWidth-width),documentExpansionPx:Math.max(0,metrics.root-width),...metrics});
      if((process.argv.includes('--shots') || metrics.root>width+3 || (metrics.unwrappedTables>0&&width<=390)) && (width===390 || process.argv.includes('--shots'))) {
        const safe=rel.replaceAll('/','-').replaceAll('.html','').slice(0,95);
        const fp=path.join(output,safe+'-'+width+'.png');
        await page.screenshot({path:fp,fullPage:true,timeout:6000}).catch(()=>{});
      }
    } catch (e) {
      findings.push({path:rel,width,error:String(e?.message||e).slice(0,180)});
    } finally {await page.close().catch(()=>{});}
    if(++done%20===0) console.log('PROGRESS',width,done,'/',pages.length);
  }
  await context.close();
}
await browser.close();
const json=path.join(output,'responsive-metrics.json');
fs.writeFileSync(json,JSON.stringify({date:new Date().toISOString(),pages:pages.length,widths,findings},null,2));
console.log('RESULT_PATH',json);
console.log('PAGES',pages.length,'WIDTHS',widths.join(','));
for(const width of widths) {
  const f=findings.filter(x=>x.width===width);
  const over=f.filter(x=>x.documentExpansionPx>=4);
  const tables=f.filter(x=>x.unwrappedTables>0);
  console.log('SUMMARY',width,'overflow',over.length,'tables_unwrapped',tables.length,'errors',f.filter(x=>x.error).length);
  console.log('TOP_OVERFLOW',JSON.stringify(over.sort((a,b)=>b.overflowPx-a.overflowPx).slice(0,13).map(x=>({path:x.path,px:x.documentExpansionPx,offenders:x.offenders?.slice(0,3)}))));
}
