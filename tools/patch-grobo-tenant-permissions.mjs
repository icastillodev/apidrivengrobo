/**
 * GROBO: aplicar protección de tenancy a edición de solicitudes y configuración de reservas.
 * Repetible: node tools/patch-grobo-tenant-permissions.mjs --apply
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const apply=process.argv.includes('--apply');
const patches=[];

function edit(file,transform) {
 const full=path.join(root,file);
 const source=fs.readFileSync(full,'utf8');
 const crlf=source.includes('\r\n');
 const before=source.replaceAll('\r\n','\n');
 const after=transform(before);
 if(after===before)return;
 if(apply)fs.writeFileSync(full,crlf?after.replaceAll('\n','\r\n'):after,'utf8');
 patches.push(file);
}
function swapOnce(s,oldValue,newValue,label) {
 if(s.includes(newValue)) return s;
 const count=s.split(oldValue).length-1;
 if(count!==1) throw Error(label+': expected one match, found '+count);
 return s.replace(oldValue,newValue);
}
edit('api/src/Models/AdminConfig/AdminConfigReservasModel.php', s=>{
 s=swapOnce(s,
  '    public function getAllSalas($instId) {',
  `    /** Filtro por IdInstitucion obligatorio para toda escritura de configuración. */
    private function assertSalaOwned(int $idSala, int $instId): void {
        if ($idSala <= 0 || $instId <= 0) {
            throw new \\InvalidArgumentException('Sala o institución inválida.');
        }
        $stmt = $this->db->prepare(
            'SELECT IdSalaReserva FROM reserva_sala
             WHERE IdSalaReserva = ? AND IdInstitucion = ? LIMIT 1 FOR UPDATE'
        );
        $stmt->execute([$idSala, $instId]);
        if (!$stmt->fetchColumn()) {
            throw new \\DomainException('Sala no encontrada en la institución actual.');
        }
    }

    private function assertInstrumentoOwned(int $id, int $instId): void {
        if ($id <= 0 || $instId <= 0) {
            throw new \\InvalidArgumentException('Instrumento o institución inválidos.');
        }
        $stmt = $this->db->prepare(
            'SELECT IdReservaInstrumento FROM reserva_instrumento
             WHERE IdReservaInstrumento = ? AND IdInstitucion = ? LIMIT 1 FOR UPDATE'
        );
        $stmt->execute([$id, $instId]);
        if (!$stmt->fetchColumn()) {
            throw new \\DomainException('Instrumento no encontrado en la institución actual.');
        }
    }

    public function getAllSalas($instId) {`,
  'create tenancy guards');
 s=swapOnce(s,'public function getSalaDetail($id) {','public function getSalaDetail($id, int $instId) {','scoped room detail signature');
 s=swapOnce(s,
   '$sala = $this->db->prepare("SELECT {$colsSala} FROM reserva_sala WHERE IdSalaReserva = ?");\n        $sala->execute([$id]);\n        $salaData = $sala->fetch(PDO::FETCH_ASSOC);',
   `$sala = $this->db->prepare("SELECT {$colsSala} FROM reserva_sala WHERE IdSalaReserva = ? AND IdInstitucion = ?");
        $sala->execute([$id, $instId]);
        $salaData = $sala->fetch(PDO::FETCH_ASSOC);
        if (!$salaData) {
            throw new \\DomainException('Sala no encontrada en la institución actual.');
        }`,'scoped room select');
 s=swapOnce(s,'    public function saveSala($data, $horarios) {\n        try {',
 `    public function saveSala($data, $horarios) {
        $instId = (int)($data['IdInstitucion'] ?? 0);
        if ($instId <= 0) throw new \\InvalidArgumentException('Institución inválida.');
        try {`,'room save inst guard');
 s=swapOnce(s,
 `                $idSala = $data['IdSalaReserva'];
                $hab = $data['habilitado'] ?? 1;
                $sql = "UPDATE reserva_sala SET Nombre=?, Lugar=?, tipohorasalas=?, habilitado=? WHERE IdSalaReserva=?";
                $this->db->prepare($sql)->execute([$data['Nombre'], $data['Lugar'], $data['tipohorasalas'], $hab, $idSala]);`,
 `                $idSala = (int)$data['IdSalaReserva'];
                $this->assertSalaOwned($idSala, $instId);
                $hab = $data['habilitado'] ?? 1;
                $sql = "UPDATE reserva_sala SET Nombre=?, Lugar=?, tipohorasalas=?, habilitado=? WHERE IdSalaReserva=? AND IdInstitucion=?";
                $this->db->prepare($sql)->execute([$data['Nombre'], $data['Lugar'], $data['tipohorasalas'], $hab, $idSala, $instId]);`,
 'room update owner');
 s=swapOnce(s,
 `    public function toggleSala($id, $status) {
        $this->db->prepare("UPDATE reserva_sala SET habilitado = ? WHERE IdSalaReserva = ?")->execute([$status, $id]);`,
 `    public function toggleSala($id, $status, int $instId) {
        $id = (int)$id;
        $this->assertSalaOwned($id, $instId);
        $this->db->prepare("UPDATE reserva_sala SET habilitado = ? WHERE IdSalaReserva = ? AND IdInstitucion = ?")->execute([$status, $id, $instId]);`,
 'room toggle owner');
 s=swapOnce(s,
 `    public function getInstSalasPermitidas($idReservaInstrumento) {
        $stmt = $this->db->prepare("SELECT IdSalaReserva FROM reserva_instrumento_sala_permitida WHERE IdReservaInstrumento = ?");
        $stmt->execute([$idReservaInstrumento]);`,
 `    public function getInstSalasPermitidas($idReservaInstrumento, int $instId) {
        $stmt = $this->db->prepare(
            "SELECT permitida.IdSalaReserva FROM reserva_instrumento_sala_permitida permitida
             JOIN reserva_instrumento instr ON instr.IdReservaInstrumento = permitida.IdReservaInstrumento
             JOIN reserva_sala sala ON sala.IdSalaReserva = permitida.IdSalaReserva
             WHERE permitida.IdReservaInstrumento = ? AND instr.IdInstitucion = ? AND sala.IdInstitucion = ?"
        );
        $stmt->execute([$idReservaInstrumento, $instId, $instId]);`,
 'instrument rooms scoped read');
 s=swapOnce(s,
 `    public function saveInst($data, $salasPermitidas = []) {
        try {`,
 `    public function saveInst($data, $salasPermitidas = []) {
        $instId = (int)($data['IdInstitucion'] ?? 0);
        if ($instId <= 0) throw new \\InvalidArgumentException('Institución inválida.');
        try {`,
 'instrument save inst guard');
 s=swapOnce(s,
 `            $hab = $data['habilitado'] ?? 1;
            $sql = "UPDATE reserva_instrumento SET NombreInstrumento=?, cantidad=?, detalleInstrumento=?, habilitado=? WHERE IdReservaInstrumento=?";
            $this->db->prepare($sql)->execute([$data['NombreInstrumento'], $data['cantidad'], $data['detalleInstrumento'], $hab, $data['IdReservaInstrumento']]);`,
 `            $this->assertInstrumentoOwned((int)$data['IdReservaInstrumento'], $instId);
            $hab = $data['habilitado'] ?? 1;
            $sql = "UPDATE reserva_instrumento SET NombreInstrumento=?, cantidad=?, detalleInstrumento=?, habilitado=? WHERE IdReservaInstrumento=? AND IdInstitucion=?";
            $this->db->prepare($sql)->execute([$data['NombreInstrumento'], $data['cantidad'], $data['detalleInstrumento'], $hab, $data['IdReservaInstrumento'], $instId]);`,
 'instrument save owner');
 s=swapOnce(s,
 `                    if ($idSalaInt > 0) {
                        $stmtPerm->execute([(int)$idInstrumento, $idSalaInt]);
                    }`,
 `                    if ($idSalaInt > 0) {
                        $this->assertSalaOwned($idSalaInt, $instId);
                        $stmtPerm->execute([(int)$idInstrumento, $idSalaInt]);
                    }`,
 'cross-tenant room link guard');
 s=swapOnce(s,
 `    public function toggleInst($id, $status) {
        $this->db->prepare("UPDATE reserva_instrumento SET habilitado = ? WHERE IdReservaInstrumento = ?")->execute([$status, $id]);`,
 `    public function toggleInst($id, $status, int $instId) {
        $id = (int)$id;
        $this->assertInstrumentoOwned($id, $instId);
        $this->db->prepare("UPDATE reserva_instrumento SET habilitado = ? WHERE IdReservaInstrumento = ? AND IdInstitucion = ?")->execute([$status, $id, $instId]);`,
 'instrument toggle owner');
 return s;
});
edit('api/src/Controllers/AdminConfigReservasController.php',s=>{
 const needle="        $this->enforceModuloSesionOrExit($sesion, 'reservas');";
 if(!s.includes('requireAdminReservaRole')){
   const matches=s.split(needle).length-1;
   if(matches<9)throw Error('Expected 9+ guarded admin operations, found '+matches);
   s=s.replaceAll(needle,needle+"\n        $this->requireAdminReservaRole($sesion);");
 }
 s=swapOnce(s,'    private function jsonResponse($data) {',
  `    private function requireAdminReservaRole(array $sesion): void {
        if (!in_array((int)($sesion['role'] ?? 0), [1, 2, 4, 5, 6], true)) {
            $this->modulosRespond403('Sin permisos de administración de reservas.');
        }
    }

    private function jsonResponse($data) {`,
 'admin-only role guard helper');
 s=swapOnce(s,"$this->model->getSalaDetail($_GET['id'])","$this->model->getSalaDetail((int)($_GET['id'] ?? 0), (int)$sesion['instId'])",'room detail call');
 s=swapOnce(s,"$this->model->toggleSala($input['id'], $input['status'])","$this->model->toggleSala($input['id'], $input['status'], (int)$sesion['instId'])",'room toggle call');
 s=swapOnce(s,"$this->model->toggleInst($input['id'], $input['status'])","$this->model->toggleInst($input['id'], $input['status'], (int)$sesion['instId'])",'instrument toggle call');
 const start=s.indexOf('    public function getInstSalasPermitidas() {');
 const end=s.indexOf('    public function saveInst() {',start);
 if(start<0||end<=start)throw Error('Instrument rooms method not found');
 let segment=s.slice(start,end);
 segment=swapOnce(segment,"        $sesion = Auditoria::getDatosSesion();",
   "        $sesion = Auditoria::getDatosSesion();\n        $this->requireAdminReservaRole($sesion);",'instrument permissions role');
 segment=swapOnce(segment,"$_GET['id'] !== ''","$_GET['inst'] !== ''",'instrument inst check');
 segment=swapOnce(segment,"isset($_GET['id'])","isset($_GET['inst'])",'instrument inst isset');
 segment=swapOnce(segment,"filter_var($_GET['id'], FILTER_VALIDATE_INT)","filter_var($_GET['inst'], FILTER_VALIDATE_INT)",'instrument inst filter');
 segment=swapOnce(segment,"$this->model->getInstSalasPermitidas($id)","$this->model->getInstSalasPermitidas($id, $targetInst)",'instrument scoped read call');
 s=s.slice(0,start)+segment+s.slice(end);
 return s;
});
console.log(apply?'PATCHED':'WOULD_PATCH',patches.length,JSON.stringify(patches));
