/**
 * GROBO: comprobación de rechazo de solicitudes NO autenticadas en producción.
 * SOLAMENTE GET: nunca registra, crea, modifica ni elimina.
 * NO imprime respuestas con datos, cookies, tokens o PII.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
const targets=[
 ['billing-audit','/billing/audit-history',true],
 ['balance-history','/billing/saldo-historial?idUsr=999999',true],
 ['billing-balance','/billing/get-investigator-balance/999999',true],
 ['mine-payments','/user/my-payments-history',true],
 ['mine-forms','/user/my-forms',true],
 ['mine-protocols','/user/protocols/all-lists',true],
 ['institution-users','/users/institution',true],
 ['protocol-institution-urbe','/protocols/institution?inst=1',true],
 ['protocol-institution-cupae','/protocols/institution?inst=12',true],
 ['protocol-form-data','/protocols/form-data?inst=12',true],
 ['protocol-pending','/protocols/pending-count?inst=12',true],
 ['animals-search','/animals/search-protocols?inst=1&user=999999',true],
 ['admin-reservations','/admin/reservas/agenda',true],
 ['admin-salas','/admin/config/reservas/sala/all',true],
 ['public-news','/comunicacion/noticias/public/999999999',false],
 ['public-sala-invalid','/reservas/sala/public-bundle?token=qa-invalid&from=2026-11-01&to=2026-11-30',false],
 ['public-inst-invalid','/reservas/institucion/public-bundle?token=qa-invalid&from=2026-11-01&to=2026-11-01',false]
];
const rows=[];
for (const [name,uri,priv] of targets){
  const record={name,priv,http:null,applicationStatus:null,rejected:null,error:null};
  try{
    const ctl=new AbortController();const tid=setTimeout(()=>ctl.abort(),11000);
    try{
      const response=await fetch('https://app.groboapp.com/api'+uri,{
        method:'GET',headers:{Accept:'application/json'},redirect:'manual',signal:ctl.signal,
      });
      record.http=response.status;
      const type=response.headers.get('content-type')||'';
      const raw=(await response.text()).slice(0,150000);
      let parsed=null;try{parsed=JSON.parse(raw);}catch{}
      record.applicationStatus=parsed?.status??null;
      record.contentType=type.split(';')[0];
      record.jsonValid=parsed!==null;
      record.classification='public';
      if (priv) {
        if (parsed===null) {
          record.classification='unverified-non-json';
          record.rejected=null;
        } else if (['success','ok'].includes(record.applicationStatus)) {
          record.classification='possible-auth-bypass';
          record.rejected=false;
          record.error='SENSITIVE_SUCCESS_WITHOUT_AUTH';
        } else if (record.applicationStatus==='error') {
          record.rejected=true;
          record.classification=response.status>=500
            ? 'server-error-on-no-auth'
            : ([401,403].includes(response.status)?'correct-4xx-denial':'legacy-json-denial');
        } else {
          record.classification='unverified-json-shape';
          record.rejected=null;
        }
      }
    }finally{clearTimeout(tid);}
  }catch(e){record.error=e?.name==='AbortError'?'TIMEOUT':e?.name||'NETWORK_ERROR';}
  rows.push(record);
  console.log(JSON.stringify(record));
}
const dir=path.join(os.tmpdir(),'grobo-ux-audit','report');fs.mkdirSync(dir,{recursive:true});
const file=path.join(dir,'production-unauth-api-audit.json');
fs.writeFileSync(file,JSON.stringify({date:new Date().toISOString(),rows},null,2));
console.log('SUMMARY',JSON.stringify({
 tested:rows.length,private:rows.filter(x=>x.priv).length,
 privateJsonDenials:rows.filter(x=>x.priv&&x.rejected===true).length,
 properHttpDenials:rows.filter(x=>x.classification==='correct-4xx-denial').length,
 legacyJsonDenials:rows.filter(x=>x.classification==='legacy-json-denial').length,
 serverErrors:rows.filter(x=>x.classification==='server-error-on-no-auth').length,
 unverifiedNonJson:rows.filter(x=>x.classification==='unverified-non-json').map(x=>x.name),
 possibleAuthBypass:rows.filter(x=>x.classification==='possible-auth-bypass').map(x=>x.name),
 connectionErrors:rows.filter(x=>x.error&&x.error!=='SENSITIVE_SUCCESS_WITHOUT_AUTH').length}));
