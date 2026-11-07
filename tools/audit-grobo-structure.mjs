/**
 * GROBO: auditoria estructural de HTML; solo lectura, sin login ni API.
 * parser temporal: npm install --prefix %TEMP%/grobo-ux-audit --no-save parse5 playwright-core
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const front=path.join(root,'front');
const parser=await import(pathToFileURL(path.join(os.tmpdir(),'grobo-ux-audit','node_modules','parse5','dist','index.js')).href);
function files(dir,out=[]) {
 for(const d of fs.readdirSync(dir,{withFileTypes:true})) {
  const p=path.join(dir,d.name);
  if(d.isDirectory()) files(p,out);
  else if(d.name.endsWith('.html')&&!d.name.endsWith('.html.html'))out.push(p);
 }
 return out;
}
const all=[path.join(front,'index.html'),...files(path.join(front,'paginas'))];
const findings=[];
for(const fp of all){
 const html=fs.readFileSync(fp,'utf8');
 if(!html.trim())continue;
 const rel=path.relative(front,fp).replaceAll('\\','/');
 const errors=[];
 const tree=parser.parse(html,{sourceCodeLocationInfo:true,onParseError:error=>errors.push(error.code)});
 const ids=new Map(),labels=new Set(),nodes=[],formButtons=[],formStack=[],pathStack=[];
 function attrs(n){const a={};for(const x of n.attrs||[])a[x.name]=x.value;return a;}
 function visit(node,ancestors=[]){
  const tag=node.tagName||'';
  const a=attrs(node);
  if(a.id){ids.set(a.id,(ids.get(a.id)||0)+1);}
  if(tag==='label'&&a.for)labels.add(a.for);
  if(tag==='input'||tag==='select'||tag==='textarea') nodes.push({tag,a,labelWrapped:ancestors.includes('label')});
  if(tag==='button'&&ancestors.includes('form')&&!a.type)formButtons.push({id:a.id||'',text:'',line:node.sourceCodeLocation?.startLine||0});
  for(const child of node.childNodes||[])visit(child,tag?[...ancestors,tag]:ancestors);
 }
 visit(tree);
 const duplicateIds=[...ids.entries()].filter(([k,n])=>n>1).map(([k,n])=>({id:k,count:n}));
 const unlabeledInputs=nodes.filter(({tag,a,labelWrapped})=>a.type!=='hidden'&&a.type!=='submit'&&a.type!=='button'&&a.type!=='checkbox'&&a.type!=='radio'&&
  !labelWrapped&&!labels.has(a.id||'')&&!a['aria-label']&&!a['aria-labelledby']&&!a.title);
 const missingRefs=[];
 const depMatches=[...html.matchAll(/(?:from\s*|import\s*\()\s*['"]((?:\.\.?\/)[^'"]+\.js)(?:\?[^'"]*)?['"]/g)];
 for(const m of depMatches) {
  const f=path.resolve(path.dirname(fp),m[1]);
  if(!fs.existsSync(f))missingRefs.push(m[1]);
 }
 const linkMatches=[...html.matchAll(/<(?:link|script)\b[^>]*(?:href|src)=['"]([^'"]+)['"][^>]*>/gi)];
 for(const m of linkMatches){
  const val=m[1];if(!val.startsWith('.')&&!val.startsWith('/'))continue;
  const resolved=path.resolve(path.dirname(fp),val.split(/[?#]/)[0]);
  if(!fs.existsSync(resolved))missingRefs.push(val);
 }
 const viewport=/<meta\s+name=['"]viewport['"]/i.test(html);
 const badParse=errors.filter(e=>!['missing-doctype','non-void-html-element-start-tag-with-trailing-solidus'].includes(e));
 findings.push({path:rel,viewport,duplicateIds,missingRefs:[...new Set(missingRefs)],unlabeledInputs:unlabeledInputs.length,
  formButtonsWithoutType:formButtons,htmlParseErrors:[...new Set(badParse)],totalFields:nodes.length});
}
const summary={
 fileCount:findings.length,
 noViewport:findings.filter(x=>!x.viewport).map(x=>x.path),
 duplicateIds:findings.filter(x=>x.duplicateIds.length).map(x=>({path:x.path,ids:x.duplicateIds})),
 brokenReferences:findings.filter(x=>x.missingRefs.length).map(x=>({path:x.path,refs:x.missingRefs})),
 implicitSubmit:findings.filter(x=>x.formButtonsWithoutType.length).map(x=>({path:x.path,buttons:x.formButtonsWithoutType})),
 htmlParse:findings.filter(x=>x.htmlParseErrors.length).map(x=>({path:x.path,errors:x.htmlParseErrors})),
 unlabeledInputs:findings.filter(x=>x.unlabeledInputs>0).sort((a,b)=>b.unlabeledInputs-a.unlabeledInputs).slice(0,35).map(x=>({path:x.path,count:x.unlabeledInputs,total:x.totalFields}))
};
const folder=path.join(os.tmpdir(),'grobo-ux-audit','report');fs.mkdirSync(folder,{recursive:true});
fs.writeFileSync(path.join(folder,'structural-metrics.json'),JSON.stringify({summary,findings},null,2));
for(const [key,value] of Object.entries(summary)){
 console.log('SUMMARY',key,Array.isArray(value)?value.length:value);
 if(Array.isArray(value))console.log('TOP',key,JSON.stringify(value.slice(0,14)));
}
