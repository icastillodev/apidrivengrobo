<?php
namespace App\Models\AdminConfig;

use PDO;
use Exception;

class AdminConfigInstitutionModel {
    private $db;
    
    // Ruta corregida a 'logos' (plural)
    private const LOGO_PATH = __DIR__ . '/../../../../../dist/multimedia/imagenes/logos/';

    public function __construct($db) {
        $this->db = $db;
    }

    public function getInstitution($id) {
        $sql = "SELECT 
                    IdInstitucion, NombreInst, NombreCompletoInst, InstDir, 
                    InstContacto, InstCorreo, Web, Pais, Localidad, Moneda, 
                    otrosceuas, Logo, LogoEnPdf, idioma
                FROM institucion 
                WHERE IdInstitucion = ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$data) throw new Exception("Institución no encontrada (ID: $id)");
        return $data;
    }

    public function getServices($instId) {
        // Trae todos los servicios (ya no filtramos por Eliminado porque se borran físicamente)
        $sql = "SELECT * FROM serviciosinst WHERE IdInstitucion = ? ORDER BY IdServicioInst DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function updateInstitution($data, $files) {
        $instId = $data['instId'] ?? 0;
        if (!$instId) throw new Exception("ID inválido");

        $sqlLogo = "";
        $params = [
            $data['NombreCompletoInst'], $data['InstDir'], $data['InstContacto'],
            $data['InstCorreo'], $data['Web'], $data['Pais'], $data['Localidad'],
            $data['Moneda'], $data['otrosceuas'], $data['idioma'], $data['LogoEnPdf']
        ];

        if (isset($files['LogoInst']) && $files['LogoInst']['error'] === UPLOAD_ERR_OK) {
            $logoName = $this->handleLogoUpload($files['LogoInst'], $instId);
            $sqlLogo = ", Logo = ?";
            $params[] = $logoName;
        }

        $params[] = $instId;

        $sql = "UPDATE institucion SET 
                    NombreCompletoInst = ?, InstDir = ?, InstContacto = ?, 
                    InstCorreo = ?, Web = ?, Pais = ?, Localidad = ?, 
                    Moneda = ?, otrosceuas = ?, idioma = ?, LogoEnPdf = ? 
                    $sqlLogo
                WHERE IdInstitucion = ?";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    private function handleLogoUpload($file, $instId) {
        if (!in_array($file['type'], ['image/png'])) throw new Exception("Solo PNG");
        if ($file['size'] > 3145728) throw new Exception("Máximo 3MB");

        $current = $this->getInstitution($instId);
        if ($current && !empty($current['Logo'])) {
            $oldPath = self::LOGO_PATH . $current['Logo'];
            if (file_exists($oldPath)) unlink($oldPath);
        }

        if (!is_dir(self::LOGO_PATH)) mkdir(self::LOGO_PATH, 0777, true);

        // Nombre con prefijo para identificar
        $newName = 'urbelogo_' . $instId . '_' . time() . '.png';
        if (move_uploaded_file($file['tmp_name'], self::LOGO_PATH . $newName)) {
            return $newName;
        }
        throw new Exception("Error guardando imagen");
    }

    public function addService($data) {
        // CORREGIDO: Coinciden las 5 columnas con los 5 valores (4 placeholders + el 1 hardcoded)
        $sql = "INSERT INTO serviciosinst 
                (NombreServicioInst, MedidaServicioInst, CantidadPorMedidaInst, IdInstitucion, Habilitado) 
                VALUES (?, ?, ?, ?, 1)";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $data['nombre'],
            $data['medida'] ?? 'Unidad',
            $data['cant'] ?? 1,
            $data['instId']
        ]);
    }

    public function deleteService($id) {
        // CORREGIDO: Borrado físico real (DELETE)
        $sql = "DELETE FROM serviciosinst WHERE IdServicioInst = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
    }

    public function toggleService($id) {
        // Invierte estado (Habilitado = NOT Habilitado)
        $sql = "UPDATE serviciosinst SET Habilitado = NOT Habilitado WHERE IdServicioInst = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
    }
}