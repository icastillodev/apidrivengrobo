import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const front=path.join(project,'front');
const css=path.join(front,'dist','style','css','responsive-polish.css');
const apply=process.argv.includes('--apply');
const changes=[];
function edit(rel, transform) {
  const p=path.join(front,rel);
  const before=fs.readFileSync(p,'utf8');
  const after=transform(before);
  if(after===before) return;
  if(!apply) {console.log('WOULD_UPDATE',rel);return;}
  fs.writeFileSync(p,after,'utf8');
  changes.push(rel);
}
function replaceExactly(input,oldValue,newValue,expected,description) {
  if(input.includes('\r\n')) {
    oldValue=oldValue.replaceAll('\r\n','\n').replaceAll('\n','\r\n');
    newValue=newValue.replaceAll('\r\n','\n').replaceAll('\n','\r\n');
  }
  const count=input.split(oldValue).length-1;
  if(count===0 && input.includes(newValue)) return input;
  if(count!==expected) throw new Error(description+' expected '+expected+' occurrences, got '+count);
  return input.split(oldValue).join(newValue);
}
function wrapTables(input,pattern,expected,description) {
  if(input.includes('gecko-ux-table-scroll')) return input;
  let count=0;
  const result=input.replace(pattern,(match)=> {
    count++;
    return '<div class="table-responsive gecko-ux-table-scroll" tabindex="0" role="region" aria-label="Tabla con desplazamiento horizontal">\n'+match+'\n</div>';
  });
  if(count!==expected) throw new Error(description+' expected '+expected+', got '+count);
  return result;
}
function visit(dir) {
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const p=path.join(dir,entry.name);
    if(entry.isDirectory()) visit(p);
    else if(entry.name.endsWith('.html')&&!entry.name.endsWith('.html.html')) {
      const rel=path.relative(front,p).replaceAll('\\','/');
      edit(rel,raw=>{
        if(!raw.includes('</head>') || !raw.includes('<html'))return raw;
        let html=raw;
        if(!/<meta\s+name=['"]viewport['"]/i.test(html)) {
          html=html.replace(/<meta\s+charset=['"][^'"]+['"]\s*\/?>(\r?\n)/i,
            m=>m+'    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n');
        }
        if(html.includes('responsive-polish.css')) return html;
        const href=path.relative(path.dirname(p),css).replaceAll('\\','/');
        const link='    <link rel="stylesheet" href="'+href+'?v=20261107a">\n';
        return html.replace('</head>',link+'</head>');
      });
    }
  }
}
visit(front);
edit('paginas/admin/alojamientos.html',raw=>{
  let out=replaceExactly(raw,
    'class="d-flex justify-content-between align-items-center mb-4"',
    'class="d-flex justify-content-between align-items-center mb-4 gecko-ux-heading-actions"',1,'alojamientos heading');
  out=replaceExactly(out,
    '<div class="d-flex gap-2">\n                    <button',
    '<div class="d-flex gap-2 gecko-ux-action-buttons">\n                    <button',1,'alojamientos actions');
  return out;
});
for(const rel of ['paginas/panel/misformularios.html','paginas/usuario/misformularios.html']) {
  edit(rel,raw=>{
    let out=replaceExactly(raw,
      'class="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3"',
      'class="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3 gecko-ux-heading-actions"',1,rel+' heading');
    return replaceExactly(out,
      '<div class="d-flex gap-2">\n                <button id="btn-protocols-used"',
      '<div class="d-flex gap-2 gecko-ux-action-buttons">\n                <button id="btn-protocols-used"',1,rel+' actions');
  });
}
edit('paginas/admin/historialcontable.html',s=>
  replaceExactly(s,'<div class="input-group shadow-sm" style="max-width: 950px;">',
    '<div class="input-group shadow-sm gecko-ux-filters" style="max-width: 950px;">',1,'history filters')
);
edit('paginas/admin/protocolos.html',s=>
  replaceExactly(s,'<div class="col-lg-7">\n                    <div class="input-group shadow-sm">',
    '<div class="col-lg-7">\n                    <div class="input-group shadow-sm gecko-ux-filters">',1,'protocol filters')
);
edit('paginas/admin/configuracion/tipos-form.html',raw=>{
  if(raw.includes('gecko-ux-table-scroll')) return raw;
  return replaceExactly(raw,'<div class="card border-0 shadow-sm"><div class="card-body p-0"><table class="table table-hover mb-0 align-middle"','<div class="card border-0 shadow-sm"><div class="card-body p-0"><div class="table-responsive gecko-ux-table-scroll" tabindex="0"><table class="table table-hover mb-0 align-middle"',3,'tipos table open')
    .replaceAll('</table></div></div>', '</table></div></div></div>');
});
edit('paginas/admin/configuracion/protocolos-config.html',raw=>
  wrapTables(raw,/<table class="table table-hover align-middle mb-0">[\s\S]*?<\/table>/g,2,'protocol config tables')
);
edit('paginas/admin/precios.html',raw=>
  wrapTables(raw,/<table class="table table-sm border shadow-sm">[\s\S]*?<\/table>/g,2,'price tables')
);
edit('paginas/usuario/formularios/insumos.html',raw=>
  wrapTables(raw,/<table class="table table-hover mb-0 align-middle">[\s\S]*?<\/table>/g,1,'insumos table')
);
console.log(apply?'UPDATED':'PREVIEW',changes.length,'HTML files');
