/**
 * GROBO: accesibilidad sin cambios de estilo.
 * Asocia la etiqueta con su unico campo hermano directo, si ambos tienen estructura inequivoca.
 * Usa parse5 instalado temporalmente. --apply para escribir.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath,pathToFileURL } from 'node:url';
const front=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../front');
const parser=await import(pathToFileURL(path.join(os.tmpdir(),'grobo-ux-audit','node_modules','parse5','dist','index.js')).href);
const apply=process.argv.includes('--apply');
function allPages(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
 const p=path.join(dir,e.name);
 if(e.isDirectory())allPages(p,out);else if(e.name.endsWith('.html')&&!e.name.endsWith('.html.html'))out.push(p);
}return out;}
const paths=[path.join(front,'index.html'),...allPages(path.join(front,'paginas'))];
let filesChanged=0,labelsFixed=0;
for(const fp of paths){
 const html=fs.readFileSync(fp,'utf8');if(!html.trim())continue;
 const doc=parser.parse(html,{sourceCodeLocationInfo:true});
 const edits=[];
 const countIds=new Map();
 function attrs(n){return Object.fromEntries((n.attrs||[]).map(x=>[x.name,x.value]));}
 function census(n){const a=attrs(n);if(a.id)countIds.set(a.id,(countIds.get(a.id)||0)+1);for(const child of n.childNodes||[])census(child);}
 census(doc);
 function crawl(node){
  const children=(node.childNodes||[]).filter(c=>c.tagName);
  const labels=children.filter(c=>c.tagName==='label'&&!attrs(c).for);
  const fields=children.filter(c=>['input','select','textarea'].includes(c.tagName) && attrs(c).id && attrs(c).type!=='hidden');
  if(labels.length===1&&fields.length===1&&countIds.get(attrs(fields[0]).id)===1){
    const label=labels[0], loc=label.sourceCodeLocation?.startTag;
    if(loc && html.slice(loc.startOffset,loc.endOffset).endsWith('>')){
      const startTag=html.slice(loc.startOffset,loc.endOffset);
      if(!/\bfor\s*=/.test(startTag))
        edits.push({at:loc.endOffset-1,text:' for="'+attrs(fields[0]).id+'"'});
    }
  }
  for(const c of node.childNodes||[])crawl(c);
 }
 crawl(doc);
 if(edits.length){
  const rel=path.relative(front,fp).replaceAll('\\','/');
  console.log(apply?'LABELS_FIXED':'LABELS_CANDIDATES',rel,edits.length);
  if(apply){
    let res=html;
    for(const {at,text} of edits.sort((a,b)=>b.at-a.at))res=res.slice(0,at)+text+res.slice(at);
    fs.writeFileSync(fp,res,'utf8');
  }
  labelsFixed+=edits.length;filesChanged++;
 }
}
console.log('RESULT',apply?'APPLIED':'PREVIEW','PAGES',filesChanged,'LABELS',labelsFixed);
