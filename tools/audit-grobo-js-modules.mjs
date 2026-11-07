/**
 * GROBO: auditoría de sintaxis JS, enlaces ES module e imports del HTML.
 * Sin correr frontend, sin red, sin credenciales. Usa acorn temporal.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const front=path.join(project,'front');
const acorn=await import(pathToFileURL(path.join(os.tmpdir(),'grobo-ux-audit','node_modules','acorn','dist','acorn.mjs')).href);
const parse5=await import(pathToFileURL(path.join(os.tmpdir(),'grobo-ux-audit','node_modules','parse5','dist','index.js')).href);
const files=(dir,suffix,out=[])=>{for(const v of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,v.name);if(v.isDirectory())files(p,suffix,out);else if(v.name.endsWith(suffix)&&!v.name.endsWith('.html.html'))out.push(p);}return out;};
const srcFiles=files(path.join(front,'dist','js'),'.js');
const htmlFiles=[path.join(front,'index.html'),path.join(front,'superadmin_login.html'),...files(path.join(front,'paginas'),'.html')].filter(p=>fs.readFileSync(p,'utf8').trim());
const syntaxErrors=[], importErrors=[], cssMissing=[],htmlScriptErrors=[], moduleExports=new Map(),imports=[];
function fmtPath(p){return path.relative(front,p).replaceAll('\\','/');}
function checkAST(code,file){
 let ast;
 try {ast=acorn.parse(code,{ecmaVersion:'latest',sourceType:'module',allowHashBang:true});}
 catch(err){syntaxErrors.push({file,error:err.message.slice(0,180)});return;}
 const exported=[];
 for(const n of ast.body){
  if(n.type==='ExportNamedDeclaration'){
   if(n.declaration?.id?.name)exported.push(n.declaration.id.name);
   if(n.declaration?.declarations)for(const d of n.declaration.declarations){if(d.id?.name)exported.push(d.id.name);}
   for(const spec of n.specifiers||[])exported.push(spec.exported?.name);
  }
  if(n.type==='ExportDefaultDeclaration')exported.push('default');
  const source=n.type==='ImportDeclaration'||n.type==='ExportNamedDeclaration'&&n.source||n.type==='ExportAllDeclaration' ? n.source?.value : null;
  if(!source)continue;
  if(source.startsWith('.')||source.startsWith('/')){
   const bare=source.split('?')[0].split('#')[0];
   const resolved=path.resolve(path.dirname(file),bare);
   imports.push({file:fmtPath(file),source,resolved:fmtPath(resolved),names:(n.specifiers||[]).filter(s=>s.imported).map(s=>s.imported.name)});
   if(!fs.existsSync(resolved))importErrors.push({file:fmtPath(file),source});
  }
 }
 moduleExports.set(fmtPath(file),new Set(exported));
}
for(const p of srcFiles)checkAST(fs.readFileSync(p,'utf8'),p);
for(const p of htmlFiles){
 const html=fs.readFileSync(p,'utf8');
 const dom=parse5.parse(html,{sourceCodeLocationInfo:true});
 function visit(node){
  if(node.tagName==='script'&&!node.attrs?.some(a=>a.name==='src')){
   const attrs=Object.fromEntries((node.attrs||[]).map(a=>[a.name,a.value]));
   const content=node.childNodes?.filter(c=>c.nodeName==='#text').map(c=>c.value).join('')||'';
   if(content.trim() && (!attrs.type||attrs.type==='module'||attrs.type==='text/javascript')){
     try{
       acorn.parse(content,{ecmaVersion:'latest',sourceType:attrs.type==='module'?'module':'script',
       allowReturnOutsideFunction:attrs.type!=='module'});
     }catch(e){
       htmlScriptErrors.push({file:fmtPath(p),line:node.sourceCodeLocation?.startLine,error:e.message.slice(0,180)});
     }
   }
  }
  for(const c of node.childNodes||[])visit(c);
 }
 visit(dom);
}
const missingExports=[];
for(const imp of imports){
 if(!imp.names.length)continue;
 const exports=moduleExports.get(imp.resolved);
 if(!exports)continue;
 for(const name of imp.names) if(!exports.has(name)) missingExports.push({...imp,missingExport:name});
}
const report={date:new Date().toISOString(),jsFiles:srcFiles.length,htmlFiles:htmlFiles.length,
 syntaxErrors,importErrors,missingExports,htmlScriptErrors,
 importEdges:imports.length};
const folder=path.join(os.tmpdir(),'grobo-ux-audit','report');fs.mkdirSync(folder,{recursive:true});
fs.writeFileSync(path.join(folder,'javascript-metrics.json'),JSON.stringify(report,null,2));
console.log('JS_FILES',report.jsFiles,'HTML_FILES',report.htmlFiles,'MODULE_IMPORT_EDGES',report.importEdges);
for(const [k,val]of Object.entries(report)){
 if(Array.isArray(val)){console.log(k.toUpperCase(),val.length); for(const x of val.slice(0,22))console.log('ISSUE',k,JSON.stringify(x));}
}
