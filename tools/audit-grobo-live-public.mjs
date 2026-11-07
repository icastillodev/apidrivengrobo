import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(path.join(os.tmpdir(),'grobo-ux-audit','node_modules','playwright-core'));
const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',args:['--no-first-run','--disable-extensions']});
const urls=[
 ['URBE_LOGIN','https://app.groboapp.com/urbe/'],
 ['CUPAE_LOGIN','https://app.groboapp.com/cupae/'],
 ['NEWS_INVALID_ID','https://app.groboapp.com/paginas/noticia-publica.html?id=0'],
 ['QR_SALA_NO_TOKEN','https://app.groboapp.com/paginas/qr-sala.html'],
 ['QR_SALAS_NO_TOKEN','https://app.groboapp.com/paginas/qr-salas.html'],
 ['CONFIRM_NO_TOKEN','https://app.groboapp.com/paginas/confirmar.html']
];
let results=[];
for(const width of [390,768,1366]){
 const ctx=await browser.newContext({viewport:{width,height:850},deviceScaleFactor:1,hasTouch:width<1024,isMobile:width<=390,serviceWorkers:'block'});
 for(const [name,url]of urls){
  const page=await ctx.newPage(), errors=[];
  page.on('pageerror',e=>errors.push(String(e.message).slice(0,170)));
  const rec={name,width,http:null,urlLoaded:null,overflowPx:null,css:false,jsErrors:[],error:null};
  try{
    const res=await page.goto(url,{waitUntil:'domcontentloaded',timeout:16000});
    await page.waitForTimeout(750);
    const metrics=await page.evaluate(()=>({
      viewport:window.innerWidth,
      scroll:Math.max(document.documentElement.scrollWidth,document.body?.scrollWidth||0),
      css:[...document.querySelectorAll('link[rel=stylesheet]')].some(el=>el.href.includes('responsive-polish.css')),
      title:document.title
    }));
    rec.http=res?.status();rec.urlLoaded=page.url().slice(0,130);
    rec.overflowPx=Math.max(0,metrics.scroll-width);
    rec.css=metrics.css;rec.title=metrics.title?.slice(0,70);
    rec.jsErrors=errors.slice(0,3);
  }catch(err){rec.error=String(err.message).slice(0,200);}
  results.push(rec);
  console.log(JSON.stringify(rec));
  await page.close();
 }
 await ctx.close();
}
await browser.close();
const p=path.join(os.tmpdir(),'grobo-ux-audit','report','postdeploy-public-smoke.json');
fs.mkdirSync(path.dirname(p),{recursive:true});
fs.writeFileSync(p,JSON.stringify(results,null,2),'utf8');
console.log('RESULT_FILE',p);
console.log('SUMMARY',JSON.stringify({pages:results.length,errors:results.filter(x=>x.error).length,horizontalOverflows:results.filter(x=>x.overflowPx>3).length,serverErrors:results.filter(x=>x.http>=500).length}));
