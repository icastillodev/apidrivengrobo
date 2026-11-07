// GROBO 2026-11-07: correcciones especificas detectadas en auditoria.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const front=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../front');
const changed=[];
function change(rel,fn){
 const full=path.join(front,rel),src=fs.readFileSync(full,'utf8');
 const dest=fn(src);
 if(src!==dest){fs.writeFileSync(full,dest,'utf8');changed.push(rel);}
}
function exactReplace(s,a,b,n=1){
 // La ruta anterior es un sufijo de la nueva (./dist dentro de ../dist): no reemplazar dos veces.
 if(a.startsWith('./') && b.startsWith('../') && s.includes(b)) return s;
 const count=s.split(a).length-1;
 if(count===0 && (b!=='' ? s.includes(b) : a.includes('adminlte.min.css'))) return s;
 if(count!==n)throw Error('Expected '+n+' occurrences but found '+count+' for '+a.slice(0,55));
 return s.split(a).join(b);
}
// La segunda copia del formulario de animales (obsoleta) repetia 21 IDs.
// Conservar exclusivamente el formulario nuevo: el JS usa select-tipo-form de este.
change('paginas/usuario/formularios/animales.html',s=>{
 const marker='</div><div id="step-2" class="hidden-section">';
 const first=s.indexOf(marker);
 if(first<0) {
  if((s.match(/id="animal-form"/g)||[]).length===1 && (s.match(/id="step-2"/g)||[]).length===1) return s;
  throw Error('Could not locate second animal form');
 }
 const rest=s.slice(first+marker.length);
 const tailMatch=/\r?\n    <\/div>\r?\n\r?\n    <div class="modal fade" id="modal-protocol-help"/.exec(rest);
 if(!tailMatch)throw Error('Could not locate safe end of duplicated animal form');
 const end=first+marker.length+tailMatch.index;
 const out=s.slice(0,first)+'</div>'+s.slice(end);
 if((out.match(/id="animal-form"/g)||[]).length!==1 ||
    (out.match(/id="step-2"/g)||[]).length!==1 ||
    !out.includes('id="select-tipo-form"') ||
    !out.includes('id="select-cepa"'))throw Error('Animal form safety assertion failed');
 return out;
});
for(const rel of ['paginas/qr-sala.html','paginas/qr-salas.html']){
 change(rel,s=>{
  let t=exactReplace(s,'./dist/js/utils/i18n.js','../dist/js/utils/i18n.js');
  const name=rel.includes('qr-salas')?'qr_salas':'qr_sala';
  return exactReplace(t,'./dist/js/pages/'+name+'.js','../dist/js/pages/'+name+'.js');
 });
}
const simplePublic=[
 'paginas/confirmar.html','paginas/construccion.html','paginas/error404.html',
 'paginas/qr-alojamiento.html','paginas/qr-sala.html','paginas/qr-salas.html',
 'paginas/recuperar.html','paginas/registro.html','paginas/resetear.html'
];
for(const rel of simplePublic){
 change(rel,s=>exactReplace(s,'./dist/multimedia/imagenes/grobo/favicon.ico','../dist/multimedia/imagenes/grobo/favicon.ico'));
}
change('paginas/usuario/misprotocolos.html',s=>exactReplace(s,
 '../../../dist/style/css/tailwind.css?v=20260703',
 '../../dist/style/css/tailwind.css?v=20260703'));
for(const rel of ['paginas/admin/alojamientos.html','paginas/admin/precios.html']){
 change(rel,s=>exactReplace(s,'    <link rel="stylesheet" href="../../dist/css/adminlte.min.css">\n',''));
}
console.log('FIXED',changed.length,changed.join(', '));
