/**
 * Prueba PDF real con 2 sedes, 12 secciones y paginación larga.
 * Sin datos personales ni conexión a producción.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const nodeModules=path.join(os.tmpdir(),'grobo-ux-audit','node_modules');
const {jsPDF}=require(path.join(nodeModules,'jspdf'));
const {applyPlugin}=require(path.join(nodeModules,'jspdf-autotable'));
applyPlugin(jsPDF);
global.window={jspdf:{jsPDF}};
global.document={getElementById:()=>null};
const {buildCompleteStatisticsPdf,STATISTICS_REPORT_SECTIONS}=await import(
  new URL('../front/dist/js/utils/statsCompletePdf.js',import.meta.url)
);
const lots=(n,fn)=>Array.from({length:n},(_,i)=>fn(i));
const fixture={
 globales:{total_animales:745,total_reactivos:38,total_insumos:125,total_protocolos:28,total_alojamientos:17},
 por_departamento:lots(10,i=>({departamento:'Depto '+i,total_animales:i*7,total_reactivos:i,total_insumos:i*2,protocolos_aprobados:i%7})),
 por_organizacion:lots(9,i=>({organizacion:'Instituto '+i,total_animales:i*2,total_reactivos:i,total_insumos:i,protocolos_aprobados:3})),
 ranking_especies:lots(24,i=>({etiqueta_especie:'Especie '+i,cantidad:i*10})),
 ranking_cepas:lots(19,i=>({cepa:'Cepa '+i,cantidad_animales:100-i})),
 detalle_especies:lots(55,i=>({departamento:'D '+i%10,especie:'Especie '+i,subespecie:'Subespecie',cantidad_animales:i+1})),
 detalle_cepas:lots(65,i=>({departamento:'D '+i%10,cepa:'Cepa '+i,cantidad_animales:i})),
 detalle_protocolos:lots(110,i=>({departamento:'D '+i%10,nprotA:'QA-'+i,
   tituloA:'Protocolo sintético de ensayo '+i+' con nombre suficientemente largo para verificar ajuste de celdas y salto de página',
   FechaFinProtA:'2027-07-10'})),
 categorias_formularios:lots(8,i=>({categoria:'Formulario '+i,cantidad:i*3})),
 alojamientos_activos:lots(10,i=>({departamento:'D '+i,cantidad:i+4})),
 alojamiento_trazabilidad:{total_historias:80,total_cajas:150,total_observaciones_trazabilidad:220,
   alojamientos_activos:45,por_especie:lots(14,i=>({especie:'Especie '+i,historias:i+1,tramos:i+2}))},
 derivacion_pedidos:{activo:true,propios:{total_animales:180,total_reactivos:20,total_insumos:17},
   recibidos_por_origen:lots(8,i=>({institucion_origen:'Sede '+i,total_animales:i*4,total_reactivos:i,total_insumos:i}))}
};
const now=performance.now();
const out=await buildCompleteStatisticsPdf({
 datasets:[
   {id:'sede',label:'URBE - institución',data:fixture},
   {id:'red',label:'Red institucional (sintética)',data:fixture}
 ],
 period:{from:'2026-10-01',to:'2026-11-12'},
 institution:'URBE',includeCharts:false,save:false,
});
const bytes=Buffer.from(out.doc.output('arraybuffer'));
const report=path.join(os.tmpdir(),'grobo-ux-audit','report');
fs.mkdirSync(report,{recursive:true});
const pdfFile=path.join(report,'GROBO_Stats_Integral_QA_20261112.pdf');
fs.writeFileSync(pdfFile,bytes);
if(!bytes.subarray(0,5).equals(Buffer.from('%PDF-')))throw Error('Not a PDF');
if(out.pages<4||out.sections!==STATISTICS_REPORT_SECTIONS.length*2)throw Error('Incomplete report: '+JSON.stringify(out));
console.log('PDF_FULL_QA_OK pages='+out.pages+' sections='+out.sections+
 ' size_kb='+Math.round(bytes.length/1024)+' elapsed_ms='+Math.round(performance.now()-now));
const only=await buildCompleteStatisticsPdf({
 datasets:[{id:'sede',label:'Sede',data:fixture}],
 period:{from:'2026-10-01',to:'2026-11-12'},sections:['detalle_protocolos'],includeCharts:false,save:false,
});
if(only.sections!==1||only.pages<1)throw Error('Section export incomplete');
console.log('PDF_SECTION_QA_OK pages='+only.pages+' sections='+only.sections);
