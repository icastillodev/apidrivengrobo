/**
 * Exportaciones bajo demanda: no cargar cientos de KB de PDF/Excel al entrar
 * a Estadísticas. La carga se comparte entre clics simultáneos.
 */
const base=(location.hostname==='localhost'||location.hostname==='127.0.0.1')
  ? '/URBE-API-DRIVEN/front/' : '/';
const scripts={
  jspdf:base+'dist/js/vendor/jspdf.umd.min.js?v=20261112c',
  autotable:base+'dist/js/vendor/jspdf.plugin.autotable.min.js?v=20261112c',
  xlsx:'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
};
const inflight=new Map();
function loadOnce(id){
  if(id==='jspdf'&&window.jspdf?.jsPDF)return Promise.resolve();
  if(id==='autotable'&&window.jspdf?.jsPDF?.API?.autoTable)return Promise.resolve();
  if(id==='xlsx'&&window.XLSX?.utils)return Promise.resolve();
  if(inflight.has(id))return inflight.get(id);
  const promise=new Promise((resolve,reject)=>{
    const tag=document.createElement('script');
    tag.src=scripts[id];
    tag.async=true;
    tag.crossOrigin='anonymous';
    tag.addEventListener('load',resolve,{once:true});
    tag.addEventListener('error',()=>reject(new Error('No se pudo descargar la biblioteca de exportación.')),{once:true});
    document.head.appendChild(tag);
  }).catch(err=>{inflight.delete(id);throw err;});
  inflight.set(id,promise);
  return promise;
}
export async function ensureStatsExportAssets(type){
  if(type==='excel'){
    await loadOnce('xlsx');
    if(!window.XLSX?.utils)throw new Error('Excel no está disponible.');
    return;
  }
  await loadOnce('jspdf');
  await loadOnce('autotable');
  if(!window.jspdf?.jsPDF?.API?.autoTable)throw new Error('PDF no está disponible.');
}
