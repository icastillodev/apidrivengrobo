<?php
declare(strict_types=1);

namespace App\Services\UserForms;

use App\Models\UserForms\UserFormsModel;

/** CSV personal multitenant por lotes, armado en un stream temporal para evitar archivos parciales. */
final class UserFormsCsvExporter
{
    public const MAX_FORMS = 20000;
    private const BATCH = 100;

    public function __construct(private UserFormsModel $model)
    {
    }

    /** @return array{ids:array<int,int>,start:string,end:string,lang:string} */
    public function prepare(int $userId, int $instId, string $start, string $end, string $lang = 'es'): array
    {
        foreach ([$start, $end] as $date) {
            $parsed = \DateTimeImmutable::createFromFormat('!Y-m-d', $date);
            if (!$parsed || $parsed->format('Y-m-d') !== $date) {
                throw new \InvalidArgumentException('Rango de fechas inválido');
            }
        }
        if ($start > $end) {
            throw new \InvalidArgumentException('La fecha de inicio no puede superar la fecha final');
        }

        $lang = strtolower(trim($lang));
        if (!in_array($lang, ['es', 'en', 'pt'], true)) {
            $lang = 'es';
        }

        $ids = $this->model->getVisibleCanonicalIds($userId, $instId, self::MAX_FORMS);
        return ['ids' => $ids, 'start' => $start, 'end' => $end, 'lang' => $lang];
    }

    /** Escribe todas las filas en un stream temporal; devuelve cantidad de registros exportados. */
    public function writeCsv($stream, array $job, int $userId, int $instId): int
    {
        if (!is_resource($stream)) {
            throw new \InvalidArgumentException('Destino CSV inválido');
        }
        $lang = $job['lang'];
        $labels = [
            'es' => [
                'ID', 'Institución', 'Categoría', 'Tipo', 'Inicio', 'Retiro',
                'Protocolo', 'Departamento', 'Organización', 'Pagado',
                'Falta pagar', 'Estado pago', 'Estado',
            ],
            'en' => [
                'ID', 'Institution', 'Category', 'Type', 'Start', 'Collection',
                'Protocol', 'Department', 'Organization', 'Paid',
                'Balance due', 'Payment status', 'Status',
            ],
            'pt' => [
                'ID', 'Instituição', 'Categoria', 'Tipo', 'Início', 'Retirada',
                'Protocolo', 'Departamento', 'Organização', 'Pago',
                'Saldo pendente', 'Status do pagamento', 'Estado',
            ],
        ];

        fwrite($stream, "\xEF\xBB\xBF");
        fputcsv($stream, $labels[$lang] ?? $labels['es'], ';', '"', '');
        $written = 0;
        foreach (array_chunk($job['ids'], self::BATCH) as $ids) {
            $response = $this->model->getAllForms($userId, $instId, ['ids' => $ids]);
            $list = $response['list'];
            // Si cambió la pertenencia o se eliminó un pedido, abortar antes de
            // devolver cabeceras o bytes CSV al cliente.
            if (array_map(static fn($row) => (int)$row['idformA'], $list) !== $ids) {
                throw new \RuntimeException('El historial cambió durante la exportación');
            }
            foreach ($list as $row) {
                // La fecha original puede venir del snapshot de derivación.
                $date = (string)($row['Inicio'] ?? '');
                if ($date < $job['start'] || $date > $job['end']) continue;
                $instituciones = $row['institucionesParticipantes'] ?? [];
                if (is_array($instituciones) && $instituciones) {
                    $inst = implode(' → ', array_map(
                        static fn($x) => (string)($x['NombreInst'] ?? ''), $instituciones
                    ));
                } else {
                    $inst = (string)($row['NombreInstitucion'] ?? '');
                }
                $cells = [
                    (int)$row['idformA'],
                    $inst, $row['Categoria'] ?? '', $row['TipoPedido'] ?? '',
                    $date, $row['Retiro'] ?? '', $row['Protocolo'] ?? '',
                    $row['Departamento'] ?? '', $row['Organizacion'] ?? '',
                    self::money($row['monto_pagado'] ?? 0, $lang),
                    self::money($row['falta_pagar'] ?? 0, $lang),
                    self::paymentStatus($row, $lang), $row['estado'] ?? '',
                ];
                if (fputcsv($stream, array_map([self::class, 'safeCell'], $cells), ';', '"', '') === false) {
                    throw new \RuntimeException('No se pudo escribir el CSV');
                }
                $written++;
            }
        }
        return $written;
    }

    private static function safeCell($value): string
    {
        $v = str_replace(["\0", "\r", "\n", "\t"], ['', ' ', ' ', ' '], (string)($value ?? ''));
        return preg_match('/^\s*[=+\-@]/u', $v) ? "'" . $v : $v;
    }

    private static function money($value, string $lang): string
    {
        return $lang === 'en'
            ? number_format((float)$value, 2, '.', ',')
            : number_format((float)$value, 2, ',', '.');
    }

    private static function paymentStatus(array $row, string $lang): string
    {
        $terms = [
            'es' => ['Completo', 'Sin cargo', 'Sin abonar', 'Incompleto'],
            'en' => ['Paid', 'No charge', 'Unpaid', 'Partial'],
            'pt' => ['Pago', 'Sem custo', 'Não pago', 'Parcial'],
        ][$lang] ?? ['Completo', 'Sin cargo', 'Sin abonar', 'Incompleto'];
        $total = (float)($row['monto_total_facturado'] ?? 0);
        $paid = (float)($row['monto_pagado'] ?? 0);
        $due = (float)($row['falta_pagar'] ?? 0);
        if ((int)($row['exento_form'] ?? 0) === 1) return $terms[0];
        if ($total <= .005) return $terms[1];
        if ($paid <= .005) return $terms[2];
        if ($due > .005) return $terms[3];
        return $terms[0];
    }
}
