/**
 * Inspección de estructura de 2 respuestas de endpoints GET admin, SIN emitir datos.
 */
for (const url of [
 'https://app.groboapp.com/api/admin/reservas/agenda',
 'https://app.groboapp.com/api/admin/config/reservas/sala/all',
 'https://app.groboapp.com/api/protocols/institution?inst=1'
]){
 const r=await fetch(url,{headers:{Accept:'application/json'}});
 const s=await r.text();
 let j=null;try{j=JSON.parse(s)}catch{}
 const shape=j===null?'null':Array.isArray(j)?'array':typeof j;
 const obj=!!j&&typeof j==='object'&&!Array.isArray(j)?j:{};
 console.log(JSON.stringify({
   path:new URL(url).pathname,
   status:r.status,shape,
   properties:Object.keys(obj).slice(0,12),
   errorFlag:obj.error===true,
   successFlag:obj.success===true,
   hasData:!!obj.data,
   hasMessage:typeof obj.message==='string'&&obj.message.length>0,
   arrayLength:Array.isArray(j)?j.length:null,
   responseByteLength:s.length
 }));
}
