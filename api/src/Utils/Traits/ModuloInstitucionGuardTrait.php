<?php
namespace App\Utils\Traits;

use App\Utils\ModulosInstitucion;

/**
 * Requiere $this->db (PDO) en la clase que use el trait.
 */
trait ModuloInstitucionGuardTrait
{
    protected function modulosRespond403(string $message): void
    {
        if (ob_get_length()) {
            ob_clean();
        }
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'error', 'message' => $message]);
        exit;
    }

    protected function enforceModuloSesionOrExit(array $sesion, string $key): void
    {
        try {
            ModulosInstitucion::assertModuloSesion($this->db, $sesion, $key);
        } catch (\RuntimeException $e) {
            $this->modulosRespond403($e->getMessage());
        }
    }

    protected function enforceModuloInstOrExit(array $sesion, string $key, int $targetInstId): void
    {
        try {
            ModulosInstitucion::assertModuloContratado(
                $this->db,
                $targetInstId,
                (int)($sesion['role'] ?? 0),
                $key
            );
        } catch (\RuntimeException $e) {
            $this->modulosRespond403($e->getMessage());
        }
    }

    protected function enforceModuloWithRequestInstOrExit(array $sesion, string $key, $getInstParam): void
    {
        $instId = ModulosInstitucion::instEffectiveFromRequest($sesion, $getInstParam);
        $this->enforceModuloInstOrExit($sesion, $key, $instId);
    }

    /**
     * Investigadores: si el módulo está apagado pero tienen datos propios (pedidos, reservas, alojamientos…), permitir lectura.
     */
    protected function enforceModuloSesionOrInvestigatorLegacyOrExit(array $sesion, string $key): void
    {
        $role = (int) ($sesion['role'] ?? 0);
        $inst = (int) ($sesion['instId'] ?? 0);
        $uid = (int) ($sesion['userId'] ?? 0);

        try {
            ModulosInstitucion::assertModuloSesion($this->db, $sesion, $key);
        } catch (\RuntimeException $e) {
            if (!ModulosInstitucion::esRolInvestigadorVisibilidadModulos($role)
                || !ModulosInstitucion::investigatorHasLegacyDataForModule($this->db, $uid, $inst, $key)) {
                $this->modulosRespond403($e->getMessage());
            }
        }
    }
}
