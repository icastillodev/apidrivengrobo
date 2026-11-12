/** GROBO: filtros de fechas, estado de carga y exportación a PDF. */
import {STATISTICS_REPORT_SECTIONS,getStatsSectionLabel} from './statsCompletePdf.js';

const i18n={
 es:{range:'Período rápido',month:'Este mes',section:'Contenido del PDF',
 all:'Todas las secciones',charts:'Incluir gráficos',both:'Incluir sede y red',download:'Descargar PDF',
 ready:'Elegí un período o descargá un informe.',loading:'Consultando estadísticas…',
 loaded:'Estadísticas actualizadas',cached:'Resultados de la consulta reciente',
 failed:'No se pudieron cargar los datos.',export:'Generando PDF…',exported:'PDF generado'},
 en:{range:'Quick period',month:'This month',section:'PDF content',
 all:'All sections',charts:'Include charts',both:'Institution and network',download:'Download PDF',
 ready:'Choose a period or export.',loading:'Loading statistics…',
 loaded:'Statistics updated',cached:'Recent results reused',
 failed:'Could not load statistics.',export:'Generating PDF…',exported:'PDF generated'},
 pt:{range:'Período rápido',month:'Este mês',section:'Conteúdo do PDF',
 all:'Todas as seções',charts:'Incluir gráficos',both:'Incluir instituição e rede',download:'Baixar PDF',
 ready:'Escolha um período ou exporte.',loading:'Carregando estatísticas…',
 loaded:'Estatísticas atualizadas',cached:'Resultados recentes reutilizados',
 failed:'Não foi possível carregar os dados.',export:'Gerando PDF…',exported:'PDF gerado'}
};
function isoLocal(d){
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
export function getStatsRangePreset(preset,at=new Date()){
 const to=new Date(at.getFullYear(),at.getMonth(),at.getDate());
 const from=new Date(to);
 if(preset==='month')from.setDate(1);
 else{
   const length={'7':7,'30':30,'90':90}[preset];
   if(!length)throw Error('Período inválido.');
   from.setDate(to.getDate()-length+1);
 }
 return {from:isoLocal(from),to:isoLocal(to)};
}
function esc(s){
 return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
export function initStatsToolbar({onPeriod,onPdfExport,hasRedData}){
 const el=document.getElementById('stats-toolbar');
 if(!el)return null;
 const lang=String(localStorage.getItem('lang')||document.documentElement.lang||'es').slice(0,2);
 const t=i18n[lang]||i18n.es;
 el.innerHTML=`
 <div class="stats-toolbar-top">
   <div class="stats-period-group" role="group" aria-label="${esc(t.range)}">
     <span class="stats-tool-label">${esc(t.range)}</span>
     <button type="button" class="btn btn-sm btn-outline-success" data-stats-preset="7">7d</button>
     <button type="button" class="btn btn-sm btn-outline-success" data-stats-preset="30">30d</button>
     <button type="button" class="btn btn-sm btn-outline-success" data-stats-preset="90">90d</button>
     <button type="button" class="btn btn-sm btn-outline-success" data-stats-preset="month">${esc(t.month)}</button>
   </div>
   <div class="stats-update-status" data-status="ready" role="status" aria-live="polite" id="stats-update-status">
      <span class="stats-status-dot" aria-hidden="true"></span>
      <span id="stats-update-text">${esc(t.ready)}</span>
   </div>
 </div>
 <div class="stats-toolbar-export">
   <div class="stats-section-select">
     <label class="stats-tool-label" for="stats-pdf-section">${esc(t.section)}</label>
     <select id="stats-pdf-section" class="form-select form-select-sm">
       <option value="all">${esc(t.all)}</option>
       ${STATISTICS_REPORT_SECTIONS.map(s=>`<option value="${esc(s.id)}">${esc(getStatsSectionLabel(s.id,lang))}</option>`).join('')}
     </select>
   </div>
   <label class="form-check stats-report-checkbox" for="stats-pdf-charts">
      <input class="form-check-input" type="checkbox" id="stats-pdf-charts" checked>
      <span class="form-check-label">${esc(t.charts)}</span>
   </label>
   <label class="form-check stats-report-checkbox" for="stats-pdf-both">
      <input class="form-check-input" type="checkbox" id="stats-pdf-both" disabled>
      <span class="form-check-label">${esc(t.both)}</span>
   </label>
   <button class="btn btn-success btn-sm fw-bold" type="button" id="stats-pdf-complete">
      <i class="bi bi-file-earmark-pdf me-1" aria-hidden="true"></i>${esc(t.download)}
   </button>
 </div>`;
 const status=el.querySelector('#stats-update-status'),text=el.querySelector('#stats-update-text');
 const btn=el.querySelector('#stats-pdf-complete'),both=el.querySelector('#stats-pdf-both');
 function setStatus(kind='ready',message=''){
   status.dataset.status=kind;text.textContent=message||t[kind]||t.ready;
 }
 function sync(){
   both.disabled=!Boolean(hasRedData?.());
   if(both.disabled)both.checked=false;
 }
 el.querySelectorAll('[data-stats-preset]').forEach(button=>button.addEventListener('click',async()=>{
   for(const peer of el.querySelectorAll('[data-stats-preset]')){
     peer.classList.toggle('active',peer===button);
     peer.setAttribute('aria-pressed',String(peer===button));
   }
   try{await onPeriod(button.dataset.statsPreset);}
   catch(e){setStatus('failed');console.warn('Stats period',e?.name);}
 }));
 const exportCurrent=async()=>{
   btn.disabled=true;setStatus('export');
   try{
     await onPdfExport({
       section:el.querySelector('#stats-pdf-section').value,
       includeCharts:el.querySelector('#stats-pdf-charts').checked,
       includeBoth:both.checked&&!both.disabled,
     });
     setStatus('exported');
   }catch(e){
     setStatus('failed',e?.message||t.failed);
     console.warn('Stats PDF',e?.name);
   }finally{btn.disabled=false;}
 };
 btn.addEventListener('click',exportCurrent);
 sync();
 return {sync,setStatus,exportCurrent};
}
