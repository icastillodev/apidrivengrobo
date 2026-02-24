<?php
namespace App\Models\AdminConfig;

use PDO;
use Exception;
use App\Utils\Auditoria;

class AdminConfigInstitutionModel {
    private $db;
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

        if (!$data) throw new Exception("Institución no encontrada");
        return $data;
    }

    public function getServices($instId) {
        $sql = "SELECT * FROM serviciosinst WHERE IdInstitucion = ? ORDER BY IdServicioInst DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$instId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function updateInstitution($data, $files) {
        $instId = $data['instId'];

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
        
        $res = $this->db->prepare($sql)->execute($params);
        Auditoria::log($this->db, 'UPDATE', 'institucion', "Configuración General Actualizada");
        return $res;
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

        $newName = 'urbelogo_' . $instId . '_' . time() . '.png';
        if (move_uploaded_file($file['tmp_name'], self::LOGO_PATH . $newName)) {
            return $newName;
        }
        throw new Exception("Error guardando imagen");
    }

    public function addService($data) {
        $sql = "INSERT INTO serviciosinst 
                (NombreServicioInst, MedidaServicioInst, CantidadPorMedidaInst, IdInstitucion, Habilitado) 
                VALUES (?, ?, ?, ?, 1)";
        
        $res = $this->db->prepare($sql)->execute([
            $data['nombre'],
            $data['medida'] ?? 'Unidad',
            $data['cant'] ?? 1,
            $data['instId']
        ]);
        Auditoria::log($this->db, 'INSERT', 'serviciosinst', "Agregó Servicio: " . $data['nombre']);
        return $res;
    }

    public function deleteService($id) {
        $sql = "DELETE FROM serviciosinst WHERE IdServicioInst = ?";
        $res = $this->db->prepare($sql)->execute([$id]);
        Auditoria::log($this->db, 'DELETE', 'serviciosinst', "Eliminó Servicio ID: $id");
        return $res;
    }

    public function toggleService($id) {
        $sql = "UPDATE serviciosinst SET Habilitado = NOT Habilitado WHERE IdServicioInst = ?";
        $res = $this->db->prepare($sql)->execute([$id]);
        Auditoria::log($this->db, 'UPDATE', 'serviciosinst', "Cambió estado de Servicio ID: $id");
        return $res;
    }
}