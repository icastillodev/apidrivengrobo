/**
 * GROBO 2026 — informe estadístico integral, multipágina y descargable.
 * Usa jsPDF + AutoTable solo al exportar, nunca consulta la API directamente.
 * Recibe únicamente datasets ya autorizados por StatisticsController.
 */

export const STATISTICS_REPORT_SECTIONS = Object.freeze([
  {id:'globales',label:'Resumen de indicadores'},
  {id:'por_departamento',label:'Indicadores por departamento'},
  {id:'por_organizacion',label:'Indicadores por organización'},
  {id:'ranking_especies',label:'Ranking de especies'},
  {id:'ranking_cepas',label:'Ranking de cepas'},
  {id:'detalle_especies',label:'Detalle de especies'},
  {id:'detalle_cepas',label:'Detalle de cepas'},
  {id:'detalle_protocolos',label:'Detalle de protocolos'},
  {id:'categorias_formularios',label:'Categorías de formularios'},
  {id:'alojamientos_activos',label:'Alojamientos activos'},
  {id:'alojamiento_trazabilidad',label:'Trazabilidad de alojamientos'},
  {id:'derivacion_pedidos',label:'Pedidos propios y derivados'}
]);

const SECTION_TRANSLATIONS={
  en:{
    globales:'Key metrics',por_departamento:'Metrics by department',
    por_organizacion:'Metrics by organization',ranking_especies:'Species ranking',
    ranking_cepas:'Strain ranking',detalle_especies:'Species details',
    detalle_cepas:'Strain details',detalle_protocolos:'Protocols',
    categorias_formularios:'Request categories',alojamientos_activos:'Active housing',
    alojamiento_trazabilidad:'Housing traceability',derivacion_pedidos:'Own and transferred requests'
  },
  pt:{
    globales:'Resumo de indicadores',por_departamento:'Indicadores por departamento',
    por_organizacion:'Indicadores por organização',ranking_especies:'Ranking de espécies',
    ranking_cepas:'Ranking de linhagens',detalle_especies:'Detalhes de espécies',
    detalle_cepas:'Detalhes de linhagens',detalle_protocolos:'Protocolos',
    categorias_formularios:'Categorias de formulários',alojamientos_activos:'Alojamentos ativos',
    alojamiento_trazabilidad:'Rastreabilidade de alojamentos',derivacion_pedidos:'Pedidos próprios e derivados'
  }
};
export function getStatsSectionLabel(id,locale='es'){
  return SECTION_TRANSLATIONS[String(locale).slice(0,2)]?.[id]
    || STATISTICS_REPORT_SECTIONS.find(s=>s.id===id)?.label
    || String(id);
}

const FIELD_LABELS={
 total_animales:'Animales',total_reactivos:'Reactivos',total_insumos:'Insumos',
 total_protocolos:'Protocolos',total_alojamientos:'Alojamientos',
 total_historias:'Historias',total_cajas:'Cajas',alojamientos_activos:'Tramos activos',
 total_observaciones_trazabilidad:'Observaciones de trazabilidad',
 departamento:'Departamento',iddep:'ID departamento',iddeptoA:'ID departamento',
 organizacion:'Organización',institucion:'Institución',institucion_origen:'Institución de origen',
 id_institucion_origen:'ID institución de origen',
 especie:'Especie',subespecie:'Subespecie',etiqueta_especie:'Especie / subespecie',
 cepa:'Cepa',cantidad:'Cantidad',cantidad_animales:'Animales',protocolos_aprobados:'Protocolos aprobados',
 nprotA:'Protocolo',tituloA:'Título del protocolo',FechaFinProtA:'Fecha de vencimiento',
 categoria:'Categoría',historias:'Historias',tramos:'Tramos',idprotA:'ID protocolo',
 propias:'Propias',propios:'Pedidos propios',recibidos_por_origen:'Pedidos recibidos por origen',
 derivacion_pedidos:'Pedidos propios y derivados',
};
const normalizeScalar=value=>{
  if(value===null||value===undefined)return '—';
  if(typeof value==='boolean')return value?'Sí':'No';
  if(typeof value==='number')return Number.isFinite(value)?new Intl.NumberFormat('es-UY',{maximumFractionDigits:2}).format(value):'—';
  if(typeof value==='object')return Array.isArray(value)?value.map(normalizeScalar).join(', '):JSON.stringify(value);
  return String(value);
};
function tableFor(section,data){
  if(section==='globales'){
    const rows=Object.entries(data?.globales||{}).map(([name,value])=>[FIELD_LABELS[name]||name,normalizeScalar(value)]);
    return {columns:['Indicador','Total'],rows};
  }
  if(section==='alojamiento_trazabilidad'){
    const value=data?.alojamiento_trazabilidad;
    if(!value||typeof value!=='object')return null;
    const summary=Object.entries(value).filter(([,v])=>!Array.isArray(v)&&typeof v!=='object')
      .map(([name,v])=>[FIELD_LABELS[name]||name,normalizeScalar(v)]);
    const sub=Array.isArray(value.por_especie)?value.por_especie:[];
    return {columns:['Indicador','Total'],rows:summary,extra:sub.length?[{
      title:'Alojamiento por especie',
      columns:['Especie','Historias','Tramos'],
      rows:sub.map(s=>[normalizeScalar(s.especie),normalizeScalar(s.historias),normalizeScalar(s.tramos)])
    }]:[]};
  }
  if(section==='derivacion_pedidos'){
    const d=data?.derivacion_pedidos;
    if(!d||!d.activo)return null;
    const own=d.propios||{};
    const first={title:'Pedidos propios',
      columns:['Animales','Reactivos','Insumos'],
      rows:[[normalizeScalar(own.total_animales),normalizeScalar(own.total_reactivos),normalizeScalar(own.total_insumos)]]};
    const second={title:'Derivaciones recibidas',
      columns:['Institución de origen','Animales','Reactivos','Insumos'],
      rows:(d.recibidos_por_origen||[]).map(x=>[
        normalizeScalar(x.institucion_origen||x.id_institucion_origen),
        normalizeScalar(x.total_animales),normalizeScalar(x.total_reactivos),normalizeScalar(x.total_insumos)
      ])};
    return {columns:first.columns,rows:first.rows,extra:[second]};
  }
  const rows=data?.[section];
  if(!Array.isArray(rows)||!rows.length)return null;
  const fields=Object.keys(rows[0]||{}).filter(k=>!k.startsWith('_'));
  if(!fields.length)return null;
  return {
    columns:fields.map(key=>FIELD_LABELS[key]||key.replaceAll('_',' ')),
    rows:rows.map(row=>fields.map(key=>normalizeScalar(row?.[key]))),
  };
}

function addHeader(doc,title,scope,period,institution){
  const W=doc.internal.pageSize.getWidth();
  doc.setFillColor(26,93,59);
  doc.rect(0,0,W,10,'F');
  doc.setFont('helvetica','bold');
  doc.setFontSize(17);
  doc.setTextColor(26,93,59);
  doc.text('GROBO',15,23);
  doc.setFontSize(12);
  doc.setTextColor(31,41,55);
  doc.text(title,15,33);
  doc.setFont('helvetica','normal');
  doc.setFontSize(9);
  doc.setTextColor(87,99,111);
  doc.text('Ámbito: '+scope+(institution?'  |  Institución: '+institution:''),15,40);
  doc.text('Período: '+period.from+' a '+period.to,15,46);
  doc.text('Generado: '+new Date().toLocaleString('es-UY'),15,52);
  doc.setDrawColor(209,226,215);
  doc.line(15,56,W-15,56);
}
function ensureRoom(doc,y,reserve=20){
  const h=doc.internal.pageSize.getHeight();
  if(y+reserve>h-18){doc.addPage();return 18;}
  return y;
}
function titleLine(doc,label,y){
  const w=doc.internal.pageSize.getWidth();
  y=ensureRoom(doc,y,22);
  doc.setFont('helvetica','bold');
  doc.setFontSize(11);
  doc.setTextColor(26,93,59);
  doc.text(doc.splitTextToSize(label,w-32).slice(0,1),16,y);
  return y+4;
}
function addTable(doc,columns,rows,y){
  if(!columns?.length)return y;
  if(!rows.length)rows=[Array(columns.length).fill('Sin datos registrados en el período')];
  const W=doc.internal.pageSize.getWidth();
  doc.autoTable({
    startY:ensureRoom(doc,y,15),margin:{left:15,right:15,top:18,bottom:19},
    head:[columns.map(normalizeScalar)],body:rows,
    theme:'striped',
    styles:{font:'helvetica',fontSize:columns.length>=6?7.2:8.3,cellPadding:2.4,
      textColor:[38,50,56],overflow:'linebreak'},
    headStyles:{fillColor:[26,93,59],textColor:[255,255,255],fontStyle:'bold'},
    alternateRowStyles:{fillColor:[246,250,247]},
    tableWidth:W-30,
    rowPageBreak:'avoid',
    showHead:'everyPage',
  });
  return (doc.lastAutoTable?.finalY||y)+9;
}
function addChart(doc,id,y){
  const canvas=document.getElementById(id);
  if(!canvas||canvas.width===0||canvas.height===0)return y;
  try{
    const picture=canvas.toDataURL('image/jpeg',0.8);
    const w=doc.internal.pageSize.getWidth()-30;
    const h=Math.min(93,(canvas.height/canvas.width)*w);
    y=ensureRoom(doc,y,h+13);
    doc.addImage(picture,'JPEG',15,y,w,h);
    return y+h+12;
  }catch(error){
    console.warn('GROBO: gráfico omitido del PDF',error?.name);
    return y;
  }
}
function addFooters(doc,label){
  const count=doc.internal.getNumberOfPages();
  for(let n=1;n<=count;n++){
    doc.setPage(n);
    const W=doc.internal.pageSize.getWidth();
    const H=doc.internal.pageSize.getHeight();
    doc.setDrawColor(220,232,223);
    doc.line(15,H-15,W-15,H-15);
    doc.setTextColor(98,108,102);
    doc.setFont('helvetica','normal');doc.setFontSize(8);
    doc.text('GROBO · '+label,15,H-10);
    doc.text('Página '+n+' / '+count,W-15,H-10,{align:'right'});
  }
}

/**
 * @param {object} opts
 * @param {{label:string,id:string,data:object,chartIds?:string[]}[]} opts.datasets
 * @param {{from:string,to:string}} opts.period
 * @param {string[]} [opts.sections]
 * @param {boolean} [opts.includeCharts]
 * @param {string} [opts.institution]
 * @param {boolean} [opts.save]
 * @returns {Promise<object>} PDF (útil para verificaciones automáticas sin descarga).
 */
export async function buildCompleteStatisticsPdf(opts){
  const JsPdf=window.jspdf?.jsPDF;
  if(typeof JsPdf!=='function')throw new Error('Falta el generador jsPDF.');
  if(!opts.datasets?.length)throw new Error('Cargá estadísticas antes de generar el informe.');
  const sections=new Set(opts.sections?.length?opts.sections:STATISTICS_REPORT_SECTIONS.map(s=>s.id));
  const locale=String(opts.locale||'es').slice(0,2);
  const doc=new JsPdf({orientation:'portrait',unit:'mm',format:'a4',compress:true});
  if(typeof doc.autoTable!=='function')throw new Error('Falta la extensión AutoTable para PDF.');
  doc.setProperties?.({title:'Estadísticas GROBO',subject:'Informe institucional',author:'GROBO'});
  let included=0;
  opts.datasets.forEach((set,index)=>{
    if(!set?.data||!set?.id) return;
    if(index)doc.addPage();
    addHeader(doc,'Informe de estadísticas',set.label,opts.period,opts.institution||'');
    let y=65;
    for(const section of STATISTICS_REPORT_SECTIONS){
      if(!sections.has(section.id))continue;
      const contents=tableFor(section.id,set.data);
      if(!contents)continue;
      y=titleLine(doc,getStatsSectionLabel(section.id,locale),y);
      y=addTable(doc,contents.columns,contents.rows,y+2);
      included++;
      for(const part of contents.extra||[]){
        y=titleLine(doc,part.title,y);
        y=addTable(doc,part.columns,part.rows,y+2);
      }
    }
    if(opts.includeCharts){
      y=titleLine(doc,'Visualizaciones',y);
      for(const canvasId of set.chartIds||[])y=addChart(doc,canvasId,y);
    }
  });
  addFooters(doc,opts.datasets.map(d=>d.label).join(' + '));
  if(opts.save!==false){
    const scope=opts.datasets.map(d=>d.id).join('_');
    doc.save('GROBO_Estadisticas_'+scope+'_'+opts.period.from+'_'+opts.period.to+'.pdf');
  }
  return {doc,sections:included,pages:doc.internal.getNumberOfPages()};
}
