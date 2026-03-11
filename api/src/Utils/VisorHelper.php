<?php
namespace App\Utils;

/**
 * Helper para el campo "Revisado por" (visor): devuelve "Nombre Apellido (ID: x)"
 * usando los datos de personae. Quien cambia el estado es el visor.
 */
class VisorHelper {

    /**
     * @param \PDO $db
     * @param int|string $userId
     * @return string "Nombre Apellido (ID: x)" o "Usuario (ID: x)" si no hay nombre
     */
    public static function getNombreApellidoYId($db, $userId) {
        $stmt = $db->prepare("SELECT NombreA, ApellidoA FROM personae WHERE IdUsrA = ? LIMIT 1");
        $stmt->execute([$userId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$row) {
            return 'Usuario (ID: ' . $userId . ')';
        }
        $n = isset($row['NombreA']) ? trim((string) $row['NombreA']) : '';
        $a = isset($row['ApellidoA']) ? trim((string) $row['ApellidoA']) : '';
        if (strtolower($n) === 'null') $n = '';
        if (strtolower($a) === 'null') $a = '';
        $nombre = trim($n . ' ' . $a);
        if ($nombre === '') {
            $nombre = 'Usuario';
        }
        return $nombre . ' (ID: ' . $userId . ')';
    }
}
