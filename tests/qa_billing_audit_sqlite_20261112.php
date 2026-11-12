<?php
declare(strict_types=1);
require_once dirname(__DIR__).'/api/autoload.php';
use App\Models\Billing\BillingAuditReader;

$db=new PDO('sqlite::memory:');
$db->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
$db->sqliteCreateFunction('CONCAT',static fn (...$values)=>implode('',array_map('strval',$values)),-1);
$db->sqliteCreateFunction('CONCAT_WS',static function($separator,...$values){
    return implode((string)$separator,array_values(array_filter($values,static fn($v)=>$v!==null)));
},-1);
$db->exec('CREATE TABLE personae (IdUsrA INTEGER PRIMARY KEY, NombreA TEXT, ApellidoA TEXT)');
$db->exec('CREATE TABLE historialpago (IdHistoPago INTEGER PRIMARY KEY, IdUsrA INTEGER,
 IdUsrAAdmin INTEGER, IdInstitucion INTEGER, IdFormA INTEGER, Monto REAL,
 fecha TEXT, TipoHistorial TEXT, IdentificadorTransferencia TEXT, Comentario TEXT)');
$db->exec("INSERT INTO personae VALUES(5,'Admin','QA'),(77,'Investigador','Uno'),(78,'Investigador','Dos')");
$insert=$db->prepare('INSERT INTO historialpago
 (IdHistoPago,IdUsrA,IdUsrAAdmin,IdInstitucion,IdFormA,Monto,fecha,TipoHistorial,IdentificadorTransferencia,Comentario)
 VALUES (?,?,?,?,?,?,?,?,?,?)');
$db->beginTransaction();
for($i=1;$i<=3000;$i++){
    $inst=$i<=2100?1:12;
    $uid=$i%2?77:78;
    $insert->execute([$i,$uid,5,$inst,900+$i,$i*.5,'2026-11-12 '.sprintf('%02d:%02d:00',$i%24,$i%60),
       $i%3?'CARGA_SALDO':'LIQUIDACION','TR-'.($i%50),'QA fila '.$i]);
}
$db->commit();
$reader=new BillingAuditReader($db);
$first=$reader->page(1,[],1,15);
if($first['total']!==2100||count($first['rows'])!==15||$first['page']!==1)throw new RuntimeException('Tenant count wrong');
$other=$reader->page(12,[],1,15);
if($other['total']!==900||count($other['rows'])!==15)throw new RuntimeException('Tenant 12 count wrong');
$subset=$reader->page(1,['user_id'=>77,'type'=>'CARGA_SALDO'],2,15);
if(!$subset['rows']||$subset['total']<100||count($subset['rows'])!==15)throw new RuntimeException('Filtered pagination empty');
foreach($subset['rows'] as $r){
    if((int)$r['IdUsrA']!==77||$r['TipoHistorial']!=='CARGA_SALDO')throw new RuntimeException('Filter mismatch');
}
$search=$reader->page(1,['column'=>'Investigador','search'=>'Uno'],1,15);
if($search['total']<500)throw new RuntimeException('Search not applied');
foreach($search['rows'] as $r)if((int)$r['IdUsrA']!==77)throw new RuntimeException('Wrong name search');
$notFound=$reader->page(1,['column'=>'Investigador','search'=>'OR 1=1'],1,15);
if($notFound['total']!==0)throw new RuntimeException('Input escaped incorrectly');
$cursor=$reader->cursor(12,['user_id'=>77]);
$csvCount=0;
while($cursor->fetch(PDO::FETCH_ASSOC))$csvCount++;
if($csvCount!==450)throw new RuntimeException('Cursor lost records: '.$csvCount);
$batchSize=strlen(json_encode($first['rows']));
$roughAll=round($batchSize*(2100/15));
echo "GROBO_BILLING_SQLITE_QA_OK rows_fixture=3000 tenant1=2100 tenant12=900 page_bytes=".$batchSize.
   " estimated_unpaged_bytes=".$roughAll." cursor_rows=".$csvCount.PHP_EOL;
