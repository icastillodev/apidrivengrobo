<?php
/** GROBO — CSV autenticado sobre MySQL sintético y aislado, NUNCA producción. */
declare(strict_types=1);
require_once __DIR__ . '/qa_userforms_mysql_integration_20261112.php';

use App\Services\UserForms\UserFormsCsvExporter;

$exporter = new UserFormsCsvExporter($model);
$job = $exporter->prepare(202, 22, '2026-11-01', '2026-11-30', 'es');
requireFixture($job['ids'] === [1005, 1004, 1002], 'CSV snapshot leaked or omitted foreign institution');
$stream = tmpfile();
requireFixture(is_resource($stream), 'Unable to create temporary CSV');
$count = $exporter->writeCsv($stream, $job, 202, 22);
requireFixture($count === 3, 'Expected 3 exported forms');
rewind($stream);
$header = fgetcsv($stream, 0, ';', '"', '');
requireFixture(count($header) === 13, 'CSV columns changed');
$header[0] = ltrim($header[0], "\xEF\xBB\xBF");
requireFixture($header[0] === 'ID' && $header[1] === 'Institución', 'CSV headers changed');
$rows = [];
while (($row = fgetcsv($stream, 0, ';', '"', '')) !== false) $rows[] = $row;
fclose($stream);
requireFixture(array_column($rows, 0) === ['1005', '1004', '1002'], 'Wrong CSV IDs or ordering');
requireFixture($rows[0][11] === 'Completo', 'Exempt payment status changed');
requireFixture($rows[2][3] === 'Solicitud original de animales', 'Original form snapshot lost');
requireFixture(str_contains($rows[2][1], 'URBE') && str_contains($rows[2][1], 'CUPAE'),
    'Derivation participants absent from CSV');
requireFixture($rows[2][10] === '55,00', 'Financial due amount changed');
echo "PASS CSV snapshots, cross-institution route, 13 columns and financial status\n";

$oneDate = $exporter->prepare(202,22,'2026-11-04','2026-11-04','en');
$stream = tmpfile();
$n = $exporter->writeCsv($stream, $oneDate, 202,22);
requireFixture($n === 1, 'Date filter must use original start');
rewind($stream);
$line = explode("\n", stream_get_contents($stream));
fclose($stream);
requireFixture(str_contains($line[0], 'Institution') && str_contains($line[1], '1004'),
    'English date-filter export wrong');
echo "PASS exact dates and English localization\n";

$db->exec("UPDATE tipoformularios SET nombreTipo='=HYPERLINK(\"http://invalid.test\")'
           WHERE IdTipoFormulario=2 AND IdInstitucion=22");
$job = $exporter->prepare(202,22,'2026-11-01','2026-11-30','pt');
$stream = tmpfile();
$exporter->writeCsv($stream,$job,202,22);
rewind($stream);
$bytes = stream_get_contents($stream);
fclose($stream);
requireFixture(str_contains($bytes, "'=HYPERLINK"), 'Excel formula injection not neutralized');
requireFixture(str_contains($bytes, 'Instituição'), 'Portuguese labels missing');
echo "PASS formula injection escaping and Portuguese headers\n";

$outsiderJob = $exporter->prepare(303,33,'2026-11-01','2026-11-30','es');
requireFixture($outsiderJob['ids'] === [1003], 'CSV metadata leaked between institutions');
$foreignRows = $model->getAllForms(303,33,['ids'=>[1003,1002]]);
requireFixture(array_column($foreignRows['list'],'idformA') === [1003],
    'Direct IDs bypassed JWT-scoped SQL WHERE');
echo "PASS explicit IDs cannot bypass institution/user scope\n";

foreach ([['2026-02-30','2026-11-01'],['2026-12-01','2026-11-01']] as $dates) {
    try {
        $exporter->prepare(202,22,$dates[0],$dates[1]);
        throw new RuntimeException('Bad date range accepted');
    } catch (InvalidArgumentException $expected) {}
}
try {
    $model->getVisibleCanonicalIds(202,22,1);
    throw new RuntimeException('CSV maximum did not reject an oversized snapshot');
} catch (LengthException $expected) {}
echo "PASS invalid ranges and max-record limit rejected\n";

// CSV por lotes: 250 filas sintéticas extra prueban tres llamadas de 100.
$insert = $db->prepare("INSERT INTO formularioe
 (idformA,IdUsrA,IdInstitucion,tipoA,depto,fechainicioA,fecRetiroA,estado,EstadoWorkflow,DerivadoActivo,IdInstitucionOrigen)
 VALUES (?,?,?,?,?,?,?,?,?,?,?)");
$db->beginTransaction();
for ($i = 0; $i < 250; $i++) {
    $insert->execute([20000+$i, 202, 22, 2, 2, '2026-11-09', '2026-11-11',
        'Proceso', null, 0, null]);
}
$db->commit();
$largeJob = $exporter->prepare(202,22,'2026-11-01','2026-11-30','es');
requireFixture(count($largeJob['ids']) === 253, 'Wrong total in multi-batch fixture');
$largeStream = tmpfile();
$largeCount = $exporter->writeCsv($largeStream, $largeJob, 202, 22);
rewind($largeStream);
$lines = [];
while (($record = fgetcsv($largeStream, 0, ';', '"', '')) !== false) $lines[] = $record;
fclose($largeStream);
requireFixture($largeCount === 253 && count($lines) === 254, 'CSV truncated across 100-item batches');
requireFixture($lines[1][0] === '20249' && $lines[253][0] === '1002',
    'CSV lost canonical sorting across batches');
requireFixture(count(array_unique(array_column(array_slice($lines,1),0))) === 253,
    'CSV contains duplicate canonical forms');
echo "PASS 253 unique forms exported across 3 bounded batches\n";

// Capturar IDs, cambiar la visibilidad después y asegurar error en vez de CSV incompleto.
$staleJob = $exporter->prepare(202,22,'2026-11-01','2026-11-30','es');
$db->exec("DELETE FROM formularioe WHERE idformA=20249");
try {
    $exporter->writeCsv(tmpfile(), $staleJob, 202, 22);
    throw new RuntimeException('Export accepted a changed snapshot of authorized IDs');
} catch (RuntimeException $error) {
    requireFixture($error->getMessage() === 'El historial cambió durante la exportación',
        'Unexpected error during snapshot concurrency test');
}
echo "PASS concurrent removal cancels export before sending a partial file\n";

echo "GROBO_MYFORMS_CSV_MYSQL_QA_OK checks=7\n";
