<?php
namespace App\Models\Reservas;

/**
 * Listas SELECT explícitas — tablas de reservas alineadas a `docs/database.sql`
 * (columna hora inicio: mismo identificador que usa el código existente, `Horacomienzo`).
 */
final class ReservaTableColumns {
    public static function reservaSala(): string {
        return 'IdSalaReserva, Nombre, Lugar, IdInstitucion, habilitado, tipohorasalas, QrToken';
    }

    public static function reservaHorariosPorDiaSala(): string {
        return 'IdHorarioDiaSala, IdDiaSala, HoraIni, HoraFin, IdSalaReserva';
    }

    public static function reservaInstrumento(): string {
        return 'IdReservaInstrumento, NombreInstrumento, habilitado, cantidad, detalleInstrumento, IdInstitucion';
    }

    public static function reserva(): string {
        return 'idReserva, IdReservaSerie, fechaini, fechafin, tiempo, IdSalaReserva, IdInstitucion, IdUsrCreador, '
            . 'IdUsrTitular, Aprobada, IdUsrAprobador, FechaAprobada, IdUsrA, Horacomienzo, Horafin';
    }
}
