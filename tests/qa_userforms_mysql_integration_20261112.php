<?php
/** Integración MySQL con datos exclusivamente ficticios. Sólo base grobo_myforms_fixture. */
declare(strict_types=1);
require_once dirname(__DIR__) . '/api/autoload.php';

use App\Models\UserForms\UserFormsModel;

$dsn = getenv('GROBO_QA_MYSQL_DSN') ?: '';
if (getenv('GROBO_QA_MYSQL_ISOLATED') !== 'yes'
    || !str_contains($dsn, 'dbname=grobo_myforms_fixture;')) {
    throw new RuntimeException('QA_ONLY_ISOLATED_DATABASE_REQUIRED');
}
$db = new PDO($dsn, getenv('GROBO_QA_MYSQL_USER') ?: 'root',
    getenv('GROBO_QA_MYSQL_PASSWORD') ?: '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => (getenv('GROBO_QA_EMULATE_PREPARES') === 'yes'),
    ]);
if ($db->query('SELECT DATABASE()')->fetchColumn() !== 'grobo_myforms_fixture') {
    throw new RuntimeException('QA_WRONG_DATABASE');
}
$tables = ['formulario_datos_originales','formulario_owner_actual','formulario_derivacion',
 'precioinsumosformulario','precioformulario','protdeptor','protformr',
 'protocoloexpe','tipoformularios','formularioe','departamentoe','organismoe','institucion'];
foreach ($tables as $table) $db->exec('DROP TABLE IF EXISTS ' . $table);
$ddl = [
 "CREATE TABLE institucion (IdInstitucion INT PRIMARY KEY,NombreInst VARCHAR(60),InstCorreo VARCHAR(60),InstContacto VARCHAR(60))",
 "CREATE TABLE organismoe (IdOrganismo INT PRIMARY KEY,NombreOrganismoSimple VARCHAR(60))",
 "CREATE TABLE departamentoe (iddeptoA INT PRIMARY KEY,NombreDeptoA VARCHAR(60),organismopertenece INT)",
 "CREATE TABLE formularioe (idformA INT PRIMARY KEY,IdUsrA INT NOT NULL,IdInstitucion INT NOT NULL,
  tipoA INT,depto INT,fechainicioA DATE,fecRetiroA DATE,estado VARCHAR(70),
  EstadoWorkflow VARCHAR(70),DerivadoActivo INT DEFAULT 0,IdInstitucionOrigen INT NULL)",
 "CREATE TABLE tipoformularios (IdTipoFormulario INT,IdInstitucion INT,nombreTipo VARCHAR(60),
  categoriaformulario VARCHAR(60),color VARCHAR(20),exento INT DEFAULT 0,
  PRIMARY KEY(IdTipoFormulario,IdInstitucion))",
 "CREATE TABLE formulario_derivacion (IdFormularioDerivacion INT PRIMARY KEY,
  idformA INT,idformAOrigen INT NULL,IdInstitucionOrigen INT,IdInstitucionDestino INT,Activo INT,
  IdUsrDestinoResponsable INT NULL,estado_origen VARCHAR(60),estado_destino VARCHAR(60))",
 "CREATE TABLE formulario_owner_actual (idformA INT PRIMARY KEY,IdInstitucionActual INT,IdFormularioDerivacionActiva INT)",
 "CREATE TABLE formulario_datos_originales (IdFormularioDerivacion INT,idformA INT,datos_json TEXT)",
 "CREATE TABLE precioformulario (idformA INT,precioformulario DECIMAL(12,2),totalpago DECIMAL(12,2))",
 "CREATE TABLE precioinsumosformulario (idformA INT,preciototal DECIMAL(12,2),totalpago DECIMAL(12,2))",
 "CREATE TABLE protocoloexpe (idprotA INT PRIMARY KEY,nprotA VARCHAR(60))",
 "CREATE TABLE protformr (idformA INT,idprotA INT)",
 "CREATE TABLE protdeptor (idprotA INT,iddeptoA INT)"
];
foreach ($ddl as $sql) $db->exec($sql);

$inserts = [
 "INSERT INTO institucion VALUES (12,'URBE','qa@invalid.test','QA'),(22,'CUPAE','qa@invalid.test','QA'),(33,'PRIVATE','qa@invalid.test','QA')",
 "INSERT INTO organismoe VALUES (1,'Biologia'),(2,'Veterinaria'),(3,'Privado')",
 "INSERT INTO departamentoe VALUES (1,'Depto URBE',1),(2,'Depto CUPAE',2),(3,'Depto PRIVADO',3)",
 "INSERT INTO tipoformularios VALUES (1,12,'Animales URBE','Animal','#17733f',0),(2,22,'Reactivos CUPAE','Reactivo','#a45c3e',0),(3,33,'Privado','Insumos','#243152',0),(4,12,'Exento','Animal','#448844',1)",
 "INSERT INTO formularioe VALUES
 (1001,101,12,1,1,'2026-11-01','2026-11-03','Entregado',NULL,0,NULL),
 (1002,101,12,1,1,'2026-11-02','2026-11-04','Proceso','DERIVADO',1,12),
 (1003,303,33,3,3,'2026-11-03','2026-11-05','Entregado',NULL,0,NULL),
 (1004,202,22,2,2,'2026-11-04','2026-11-06','Proceso',NULL,0,NULL),
 (1005,101,12,4,1,'2026-11-05','2026-11-07','Proceso','DERIVADO',1,12),
 (1006,101,12,1,1,'2026-11-06','2026-11-08','Entregado',NULL,0,NULL),
 (1007,101,22,2,2,'2026-11-07','2026-11-09','Proceso','COPIA',1,12),
 (1008,101,12,4,1,'2026-11-08','2026-11-10','Entregado',NULL,0,NULL)",
 "INSERT INTO formulario_derivacion VALUES (2001,1002,NULL,12,22,1,202,'Proceso','Proceso'),(2002,1005,NULL,12,22,1,NULL,'Proceso','Proceso'),(2003,1006,NULL,12,22,0,202,'Entregado','Entregado'),(2004,1007,1002,12,22,1,202,'Proceso','Proceso')",
 "INSERT INTO formulario_owner_actual VALUES (1002,22,2001),(1005,22,2002),(1007,22,2004)",
 "INSERT INTO precioformulario VALUES (1001,100,30),(1002,50,10),(1004,80,20),(1005,0,0)",
 "INSERT INTO precioinsumosformulario VALUES (1001,0,0),(1002,20,5),(1004,5,0)",
 "INSERT INTO protocoloexpe VALUES (11,'PROTO-URBE-1'),(12,'PROTO-DERIVADO-2'),(14,'PROTO-CUPAE-4')",
 "INSERT INTO protformr VALUES (1001,11),(1002,12),(1004,14)",
 "INSERT INTO protdeptor VALUES (11,1),(12,1),(12,2),(14,2)"
];
foreach ($inserts as $sql) $db->exec($sql);
$snapshot = ['nombreTipo'=>'Solicitud original de animales','categoria'=>'Animal',
 'header'=>['nprotA'=>'PROTO-ORIGINAL','TituloProtocolo'=>'Cientifico',
  'NombreDeptoA'=>'Depto URBE','NombreOrganismoSimple'=>'Biologia']];
$st = $db->prepare("INSERT INTO formulario_datos_originales
 (IdFormularioDerivacion,idformA,datos_json) VALUES (?,?,?)");
$st->execute([2001,1002,json_encode($snapshot, JSON_UNESCAPED_UNICODE)]);

function requireFixture(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
}
$model = new UserFormsModel($db);
$hasTable = (new ReflectionMethod(UserFormsModel::class, 'hasTable'))->invoke($model, 'formulario_derivacion');
$hasOriginColumn = (new ReflectionMethod(UserFormsModel::class, 'hasColumn'))->invoke($model, 'formulario_derivacion', 'idformAOrigen');
requireFixture($hasTable && $hasOriginColumn, 'Native PDO metadata detection failed');
echo "PASS real MySQL schema detection with native prepared statements\n";
$owner = $model->getAllForms(101,12,['limit'=>100,'offset'=>0]);
requireFixture($owner['total'] === 5, 'Owner total incorrect: total=' . $owner['total'] . '; IDs=' . json_encode(array_column($owner['list'],'idformA')));
requireFixture(array_map('intval',array_column($owner['list'],'idformA')) === [1008,1006,1005,1002,1001], 'Owner order/IDs');
echo "PASS owner isolated and legacy copy excluded\n";

$receiver = $model->getAllForms(202,22,['limit'=>2,'offset'=>0]);
requireFixture($receiver['total'] === 3, 'Receiver total includes another institution');
requireFixture(array_map('intval',array_column($receiver['list'],'idformA')) === [1005,1004], 'Page 1 wrong');
$second = $model->getAllForms(202,22,['limit'=>2,'offset'=>2]);
requireFixture(array_map('intval',array_column($second['list'],'idformA')) === [1002], 'Page 2 wrong');
echo "PASS pagination on actual MySQL with shared derived forms\n";

$derived = $second['list'][0];
requireFixture($derived['TipoPedido'] === 'Solicitud original de animales', 'Snapshot title missing');
requireFixture($derived['Protocolo'] === 'PROTO-ORIGINAL - Cientifico', 'Snapshot protocol missing');
requireFixture((float)$derived['falta_pagar'] === 55.0, 'Snapshot payment calculation changed');
requireFixture(count($derived['institucionesParticipantes']) === 2, 'Missing route participants');
echo "PASS snapshot, financial state and participants preserved\n";

$colleague = $model->getAllForms(404,22,['limit'=>12,'offset'=>0]);
requireFixture($colleague['total'] === 1 && (int)$colleague['list'][0]['idformA'] === 1005, 'Colleague tenant scope');
$outsider = $model->getAllForms(303,33,['limit'=>12,'offset'=>0]);
requireFixture($outsider['total'] === 1 && (int)$outsider['list'][0]['idformA'] === 1003, 'Outsider scope');
$empty = $model->getAllForms(999,33,['limit'=>12,'offset'=>0]);
requireFixture($empty['total'] === 0 && !$empty['list'], 'Unknown user sees forms');
echo "PASS institution isolation for colleagues and outsiders\n";

$meta = $model->getMyFormsFilterMeta(202,22);
requireFixture($meta['instituciones'] === ['CUPAE','URBE'], 'Metadata leaks institution');
requireFixture($meta['origenes'] === ['URBE'], 'Origin metadata wrong');
echo "PASS filter metadata is appropriately scoped\n";

$legacy = $model->getAllForms(202,22);
$legacyIds = array_values(array_unique(array_map('intval',array_column($legacy['list'],'idformA'))));
requireFixture($legacyIds === [1005,1004,1002], 'Legacy list changed');
requireFixture(count($legacy['list']) === count($legacyIds), 'Legacy list duplicated canonical forms through JOIN');
echo "PASS legacy contract and canonical identities retained\n";
echo "GROBO_USERFORMS_MYSQL_INTEGRATION_QA_OK checks=6\n";
