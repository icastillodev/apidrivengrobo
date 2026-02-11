<?php
namespace App\Models\AdminConfig;

use PDO;

class AdminConfigInstitutionModel {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function getInstitution($id) {
        $sql = "SELECT 
                    NombreInst, 
                    NombreCompletoInst, 
                    InstDir, 
                    InstContacto, 
                    InstCorreo, 
                    Web, 
                    Pais, 
                    Localidad, 
                    Moneda, 
                    PrecioJornadaTrabajoExp, 
                    otrosceuas,
                    Logo,
                    TipoApp
                FROM institucion 
                WHERE IdInstitucion = ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function updateInstitution($data) {
        $instId = $data['instId'] ?? 0;
        if (!$instId) throw new \Exception("ID de Institución no válido");

        $sql = "UPDATE institucion SET 
                    NombreCompletoInst = ?, 
                    InstDir = ?, 
                    InstContacto = ?, 
                    InstCorreo = ?, 
                    Web = ?, 
                    Pais = ?, 
                    Localidad = ?, 
                    Moneda = ?, 
                    PrecioJornadaTrabajoExp = ?, 
                    otrosceuas = ? 
                WHERE IdInstitucion = ?";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            $data['NombreCompletoInst'],
            $data['InstDir'],
            $data['InstContacto'],
            $data['InstCorreo'],
            $data['Web'],
            $data['Pais'],
            $data['Localidad'],
            $data['Moneda'], // 'UYU', 'USD', 'EUR', 'BRL'
            $data['PrecioJornadaTrabajoExp'],
            $data['otrosceuas'], // 1 o 0
            $instId
        ]);
    }
}