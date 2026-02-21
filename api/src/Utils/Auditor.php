<?php
namespace App\Utils;
use PDO;

class Auditor {
    public static function log($db, $userId, $accion, $tabla, $detalle) {
        try {
            $query = "INSERT INTO bitacora (id_usuario, accion, tabla_afectada, detalle, fecha_hora) 
                      VALUES (:uid, :acc, :tab, :det, NOW())";
            $stmt = $db->prepare($query);
            $stmt->execute([
                ':uid' => $userId,
                ':acc' => $accion,
                ':tab' => $tabla,
                ':det' => $detalle
            ]);
        } catch (\Exception $e) {
            // Un error en la auditoría no debería romper la aplicación, solo se loguea en el servidor
            error_log("Error de Auditoría: " . $e->getMessage());
        }
    }
}