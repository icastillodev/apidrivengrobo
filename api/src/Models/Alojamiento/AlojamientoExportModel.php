<?php
namespace App\Models\Alojamiento;

class AlojamientoExportModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getExportData($instId, $historiaId, $incluirAloj, $incluirTraz) {
        $data = [];

        // 1. Condición: Todo global o una historia específica
        $whereHistoria = ($historiaId !== 'GLOBAL') ? "AND a.historia = " . (int)$historiaId : "";

        // 2. Traer datos administrativos
        if ($incluirAloj === 'true') {
            $sqlAloj = "
                SELECT a.IdAlojamiento, a.historia, a.fechavisado, a.hastafecha, a.CantidadCaja, 
                       a.PrecioCajaMomento, a.totalpago, a.observaciones, a.finalizado,
                       p.nprotA, p.tituloA, e.EspeNombreA, t.NombreTipoAlojamiento,
                       COALESCE(CONCAT(u.NombreA, ' ', u.ApellidoA), 'Sin Asignar') as Investigador
                FROM alojamiento a
                INNER JOIN protocoloexpe p ON a.idprotA = p.idprotA
                INNER JOIN especiee e ON a.TipoAnimal = e.idespA
                LEFT JOIN tipoalojamiento t ON a.IdTipoAlojamiento = t.IdTipoAlojamiento
                LEFT JOIN personae u ON a.IdUsrA = u.IdUsrA
                WHERE a.IdInstitucion = ? $whereHistoria
                ORDER BY a.historia DESC, a.fechavisado ASC
            ";
            $stmt = $this->db->prepare($sqlAloj);
            $stmt->execute([$instId]);
            $data['alojamientos'] = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        }

        // 3. Traer datos biológicos (Trazabilidad)
        if ($incluirTraz === 'true') {
            $sqlTraz = "
                SELECT a.historia, ac.NombreCaja, eu.NombreEspecieAloj as Sujeto, 
                       o.fechaObs, c.NombreCatAlojUnidad as Metrica, 
                       COALESCE(o.DatoObsVar, o.DatoObsText, CAST(o.DatoObsInt AS CHAR), CAST(o.DatoObsFecha AS CHAR)) as Valor
                FROM observacion_alojamiento_unidad o
                INNER JOIN especie_alojamiento_unidad eu ON o.IdEspecieAlojUnidad = eu.IdEspecieAlojUnidad
                INNER JOIN alojamiento_caja ac ON eu.IdCajaAlojamiento = ac.IdCajaAlojamiento
                INNER JOIN alojamiento a ON ac.IdAlojamiento = a.IdAlojamiento
                INNER JOIN categoriadatosunidadalojamiento c ON o.IdDatosUnidadAloj = c.IdDatosUnidadAloj
                WHERE a.IdInstitucion = ? $whereHistoria
                ORDER BY a.historia DESC, ac.NombreCaja ASC, o.fechaObs DESC
            ";
            $stmtTraz = $this->db->prepare($sqlTraz);
            $stmtTraz->execute([$instId]);
            $data['trazabilidad'] = $stmtTraz->fetchAll(\PDO::FETCH_ASSOC);
        }

        return $data;
    }
}