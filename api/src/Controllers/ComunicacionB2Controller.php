<?php
namespace App\Controllers;

use App\Models\Comunicacion\InstitucionPortadaPopupModel;
use App\Models\Comunicacion\InstitucionPoeModel;
use App\Models\Comunicacion\MensajeriaModel;
use App\Models\Comunicacion\NoticiaModel;
use App\Utils\Auditoria;
use App\Utils\BackblazeB2;
use App\Utils\ComunicacionArchivoValidacion;

/**
 * Subida y descarga de adjuntos B2 para comunicación (perfiles MENSAJES, NOTICIASPOPUP, POES).
 */
class ComunicacionB2Controller {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    private function json($data, $code = 200) {
        if (ob_get_length()) {
            ob_clean();
        }
        header('Content-Type: application/json; charset=UTF-8');
        if ($code !== 200) {
            http_response_code($code);
        }
        echo json_encode(is_array($data) && isset($data['status']) ? $data : ['status' => 'success', 'data' => $data]);
        exit;
    }

    private function requireInst(array $sesion): int {
        $instId = (int) ($sesion['instId'] ?? 0);
        if ($instId <= 0) {
            throw new \Exception('Se requiere una institución válida.');
        }

        return $instId;
    }

    /** URL absoluta del prefijo /api (o subcarpeta local) para enlaces de descarga en JSON. */
    private static function apiPublicPrefix(): string {
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
        $scheme = $https ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $script = $_SERVER['SCRIPT_NAME'] ?? '/api/index.php';
        $dir = dirname(str_replace('\\', '/', $script));
        if ($dir === '/' || $dir === '.') {
            $dir = '';
        }

        return $scheme . '://' . $host . rtrim($dir, '/');
    }

    private static function mimeDesdeNombreArchivo(string $nombre): string {
        $ext = strtolower(pathinfo($nombre, PATHINFO_EXTENSION));
        switch ($ext) {
            case 'jpg':
            case 'jpeg':
                return 'image/jpeg';
            case 'pdf':
                return 'application/pdf';
            case 'png':
                return 'image/png';
            case 'xlsx':
                return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            case 'xls':
                return 'application/vnd.ms-excel';
            case 'docx':
                return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            case 'doc':
                return 'application/msword';
            default:
                return 'application/octet-stream';
        }
    }

    private static function archivoUploadedOk(array $f): bool {
        return isset($f['tmp_name'], $f['error'])
            && (int) $f['error'] === UPLOAD_ERR_OK
            && is_uploaded_file($f['tmp_name']);
    }

    // --- Subidas (multipart campo `file`) ---

    public function uploadMensajeAdjunto() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            if (!self::archivoUploadedOk($_FILES['file'] ?? [])) {
                $this->json(['status' => 'error', 'message' => 'No se recibió ningún archivo válido.'], 400);
            }
            $f = $_FILES['file'];
            $meta = ComunicacionArchivoValidacion::validarMensajeAdjunto($f['tmp_name'], (string) ($f['name'] ?? 'file'));
            $key = ComunicacionArchivoValidacion::construirClaveObjeto('mensajes', $instId, $meta['nombreSeguro']);
            $b2 = new BackblazeB2('MENSAJES');
            $b2->uploadFile($f['tmp_name'], $key, $meta['mime']);
            $this->json([
                'status' => 'success',
                'data' => [
                    'AdjuntoB2Key' => $key,
                    'AdjuntoNombreOriginal' => $meta['nombreSeguro'],
                    'mime' => $meta['mime'],
                ],
            ]);
        } catch (\InvalidArgumentException $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function uploadNoticiaImagenPortada() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            if (!self::archivoUploadedOk($_FILES['file'] ?? [])) {
                $this->json(['status' => 'error', 'message' => 'No se recibió ningún archivo válido.'], 400);
            }
            $f = $_FILES['file'];
            $meta = ComunicacionArchivoValidacion::validarNoticiaImagenPortada($f['tmp_name'], (string) ($f['name'] ?? 'file'));
            $key = ComunicacionArchivoValidacion::construirClaveObjeto('noticias/imagen', $instId, $meta['nombreSeguro']);
            $b2 = new BackblazeB2('NOTICIASPOPUP');
            $b2->uploadFile($f['tmp_name'], $key, $meta['mime']);
            $this->json([
                'status' => 'success',
                'data' => [
                    'ImagenPortadaB2Key' => $key,
                    'ImagenPortadaNombre' => $meta['nombreSeguro'],
                    'mime' => $meta['mime'],
                ],
            ]);
        } catch (\InvalidArgumentException $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function uploadNoticiaDocumento() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            if (!self::archivoUploadedOk($_FILES['file'] ?? [])) {
                $this->json(['status' => 'error', 'message' => 'No se recibió ningún archivo válido.'], 400);
            }
            $f = $_FILES['file'];
            $meta = ComunicacionArchivoValidacion::validarNoticiaDocumento($f['tmp_name'], (string) ($f['name'] ?? 'file'));
            $key = ComunicacionArchivoValidacion::construirClaveObjeto('noticias/doc', $instId, $meta['nombreSeguro']);
            $b2 = new BackblazeB2('NOTICIASPOPUP');
            $b2->uploadFile($f['tmp_name'], $key, $meta['mime']);
            $this->json([
                'status' => 'success',
                'data' => [
                    'AdjuntoDocB2Key' => $key,
                    'AdjuntoDocNombre' => $meta['nombreSeguro'],
                    'mime' => $meta['mime'],
                ],
            ]);
        } catch (\InvalidArgumentException $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function uploadPortadaImagen() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            if (!self::archivoUploadedOk($_FILES['file'] ?? [])) {
                $this->json(['status' => 'error', 'message' => 'No se recibió ningún archivo válido.'], 400);
            }
            $f = $_FILES['file'];
            $meta = ComunicacionArchivoValidacion::validarPortadaPopupImagen($f['tmp_name'], (string) ($f['name'] ?? 'file'));
            $key = ComunicacionArchivoValidacion::construirClaveObjeto('portada/imagen', $instId, $meta['nombreSeguro']);
            $b2 = new BackblazeB2('NOTICIASPOPUP');
            $b2->uploadFile($f['tmp_name'], $key, $meta['mime']);
            $this->json([
                'status' => 'success',
                'data' => [
                    'PortadaImagenB2Key' => $key,
                    'PortadaImagenNombre' => $meta['nombreSeguro'],
                    'mime' => $meta['mime'],
                ],
            ]);
        } catch (\InvalidArgumentException $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function uploadPortadaDocumento() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            if (!self::archivoUploadedOk($_FILES['file'] ?? [])) {
                $this->json(['status' => 'error', 'message' => 'No se recibió ningún archivo válido.'], 400);
            }
            $slot = isset($_POST['slot']) ? (int) $_POST['slot'] : 0;
            if (!in_array($slot, [1, 2], true)) {
                $this->json(['status' => 'error', 'message' => 'Indique slot 1 o 2.'], 400);
            }
            $f = $_FILES['file'];
            $meta = ComunicacionArchivoValidacion::validarPortadaPopupDocumento($f['tmp_name'], (string) ($f['name'] ?? 'file'));
            $key = ComunicacionArchivoValidacion::construirClaveObjeto('portada/doc', $instId, $meta['nombreSeguro']);
            $b2 = new BackblazeB2('NOTICIASPOPUP');
            $b2->uploadFile($f['tmp_name'], $key, $meta['mime']);
            $data = ['slot' => $slot, 'mime' => $meta['mime'], 'nombreSeguro' => $meta['nombreSeguro']];
            if ($slot === 1) {
                $data['PortadaAdjunto1B2Key'] = $key;
                $data['PortadaAdjunto1Nombre'] = $meta['nombreSeguro'];
            } else {
                $data['PortadaAdjunto2B2Key'] = $key;
                $data['PortadaAdjunto2Nombre'] = $meta['nombreSeguro'];
            }
            $this->json(['status' => 'success', 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function uploadPopupDocumento() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            if (!self::archivoUploadedOk($_FILES['file'] ?? [])) {
                $this->json(['status' => 'error', 'message' => 'No se recibió ningún archivo válido.'], 400);
            }
            $slot = isset($_POST['slot']) ? (int) $_POST['slot'] : 0;
            if (!in_array($slot, [1, 2], true)) {
                $this->json(['status' => 'error', 'message' => 'Indique slot 1 o 2.'], 400);
            }
            $f = $_FILES['file'];
            $meta = ComunicacionArchivoValidacion::validarPortadaPopupDocumento($f['tmp_name'], (string) ($f['name'] ?? 'file'));
            $key = ComunicacionArchivoValidacion::construirClaveObjeto('popup/doc', $instId, $meta['nombreSeguro']);
            $b2 = new BackblazeB2('NOTICIASPOPUP');
            $b2->uploadFile($f['tmp_name'], $key, $meta['mime']);
            $data = ['slot' => $slot, 'mime' => $meta['mime'], 'nombreSeguro' => $meta['nombreSeguro']];
            if ($slot === 1) {
                $data['PopupAdjunto1B2Key'] = $key;
                $data['PopupAdjunto1Nombre'] = $meta['nombreSeguro'];
            } else {
                $data['PopupAdjunto2B2Key'] = $key;
                $data['PopupAdjunto2Nombre'] = $meta['nombreSeguro'];
            }
            $this->json(['status' => 'success', 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function uploadPoeInstructivo() {
        try {
            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            if (!self::archivoUploadedOk($_FILES['file'] ?? [])) {
                $this->json(['status' => 'error', 'message' => 'No se recibió ningún archivo válido.'], 400);
            }
            $slot = isset($_POST['slot']) ? (int) $_POST['slot'] : 0;
            if (!in_array($slot, [1, 2], true)) {
                $this->json(['status' => 'error', 'message' => 'Indique slot 1 o 2.'], 400);
            }
            $f = $_FILES['file'];
            $meta = ComunicacionArchivoValidacion::validarPoeInstructivo($f['tmp_name'], (string) ($f['name'] ?? 'file'));
            $key = ComunicacionArchivoValidacion::construirClaveObjeto('poe/doc', $instId, $meta['nombreSeguro']);
            $b2 = new BackblazeB2('POES');
            $b2->uploadFile($f['tmp_name'], $key, $meta['mime']);
            $data = ['slot' => $slot, 'mime' => $meta['mime'], 'nombreSeguro' => $meta['nombreSeguro']];
            if ($slot === 1) {
                $data['Adjunto1B2Key'] = $key;
            } else {
                $data['Adjunto2B2Key'] = $key;
            }
            $this->json(['status' => 'success', 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        } catch (\Exception $e) {
            $this->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    // --- Descargas ---

    public function downloadMensajeAdjunto($idMensaje) {
        try {
            if (ob_get_length()) {
                ob_clean();
            }
            header_remove('Content-Type');

            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);
            $uid = (int) $sesion['userId'];
            $role = (int) ($sesion['role'] ?? 0);

            $mid = (int) $idMensaje;
            if ($mid <= 0) {
                http_response_code(400);
                echo 'ID inválido';
                exit;
            }

            $model = new MensajeriaModel($this->db);
            $stmt = $this->db->prepare(
                'SELECT m.AdjuntoB2Key, m.AdjuntoNombreOriginal, m.IdMensajeHilo, m.IdInstitucion
                 FROM mensaje m WHERE m.IdMensaje = ? LIMIT 1'
            );
            $stmt->execute([$mid]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            if (!$row || empty($row['AdjuntoB2Key'])) {
                http_response_code(404);
                echo 'Adjunto no encontrado';
                exit;
            }

            $hiloId = (int) ($row['IdMensajeHilo'] ?? 0);
            $hilo = $model->getHiloRow($hiloId, $uid, $instId, $role);
            if (!$hilo) {
                http_response_code(403);
                echo 'Sin acceso';
                exit;
            }

            $nombre = (string) ($row['AdjuntoNombreOriginal'] ?? 'adjunto');
            $mime = self::mimeDesdeNombreArchivo($nombre);
            $inline = ($mime === 'image/jpeg');

            $b2 = new BackblazeB2('MENSAJES');
            $b2->streamDownloadAttachment((string) $row['AdjuntoB2Key'], $nombre, $mime, $inline);
        } catch (\Exception $e) {
            if (ob_get_length()) {
                ob_clean();
            }
            header_remove('Content-Type');
            http_response_code(500);
            echo $e->getMessage();
            exit;
        }
    }

    /**
     * tipo: imagen | doc1 | doc2
     */
    public function downloadNoticiaArchivo($idNoticia, $tipo) {
        try {
            if (ob_get_length()) {
                ob_clean();
            }
            header_remove('Content-Type');

            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);

            $nid = (int) $idNoticia;
            $tipo = strtolower((string) $tipo);
            if ($nid <= 0 || !in_array($tipo, ['imagen', 'doc1', 'doc2'], true)) {
                http_response_code(400);
                echo 'Parámetros inválidos';
                exit;
            }

            $nm = new NoticiaModel($this->db);
            $row = $nm->getByIdAdmin($instId, $nid);
            if (!$row) {
                $row = $nm->getPublicById($instId, $nid);
            }
            if (!$row) {
                http_response_code(404);
                echo 'Noticia no encontrada';
                exit;
            }

            $key = null;
            $nombre = 'archivo';
            if ($tipo === 'imagen') {
                $key = $row['ImagenPortadaB2Key'] ?? null;
                $nombre = (string) ($row['ImagenPortadaNombre'] ?? 'portada.jpg');
            } elseif ($tipo === 'doc1') {
                $key = $row['AdjuntoDoc1B2Key'] ?? null;
                $nombre = (string) ($row['AdjuntoDoc1Nombre'] ?? 'adjunto');
            } else {
                $key = $row['AdjuntoDoc2B2Key'] ?? null;
                $nombre = (string) ($row['AdjuntoDoc2Nombre'] ?? 'adjunto');
            }

            if ($key === null || $key === '') {
                http_response_code(404);
                echo 'Archivo no disponible';
                exit;
            }

            $mime = self::mimeDesdeNombreArchivo($nombre);
            $inline = strpos($mime, 'image/') === 0;

            $b2 = new BackblazeB2('NOTICIASPOPUP');
            $b2->streamDownloadAttachment((string) $key, $nombre, $mime, $inline);
        } catch (\Exception $e) {
            if (ob_get_length()) {
                ob_clean();
            }
            header_remove('Content-Type');
            http_response_code(500);
            echo $e->getMessage();
            exit;
        }
    }

    /**
     * tipo: portada_imagen | portada_doc1 | portada_doc2 | popup_doc1 | popup_doc2
     */
    public function downloadPortadaPopupArchivo($tipo) {
        try {
            if (ob_get_length()) {
                ob_clean();
            }
            header_remove('Content-Type');

            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);

            $tipo = strtolower((string) $tipo);
            $map = [
                'portada_imagen' => ['k' => 'PortadaImagenB2Key', 'n' => 'PortadaImagenNombre'],
                'portada_doc1' => ['k' => 'PortadaAdjunto1B2Key', 'n' => 'PortadaAdjunto1Nombre'],
                'portada_doc2' => ['k' => 'PortadaAdjunto2B2Key', 'n' => 'PortadaAdjunto2Nombre'],
                'popup_doc1' => ['k' => 'PopupAdjunto1B2Key', 'n' => 'PopupAdjunto1Nombre'],
                'popup_doc2' => ['k' => 'PopupAdjunto2B2Key', 'n' => 'PopupAdjunto2Nombre'],
            ];
            if (!isset($map[$tipo])) {
                http_response_code(400);
                echo 'Tipo inválido';
                exit;
            }

            $pm = new InstitucionPortadaPopupModel($this->db);
            $row = $pm->getByInstitucion($instId);
            if (!$row) {
                http_response_code(404);
                echo 'Sin configuración';
                exit;
            }

            $kc = $map[$tipo]['k'];
            $nc = $map[$tipo]['n'];
            $key = $row[$kc] ?? null;
            $nombre = (string) ($row[$nc] ?? 'archivo');

            if ($key === null || $key === '') {
                http_response_code(404);
                echo 'Archivo no disponible';
                exit;
            }

            $mime = self::mimeDesdeNombreArchivo($nombre);
            $inline = strpos($mime, 'image/') === 0;

            $b2 = new BackblazeB2('NOTICIASPOPUP');
            $b2->streamDownloadAttachment((string) $key, $nombre, $mime, $inline);
        } catch (\Exception $e) {
            if (ob_get_length()) {
                ob_clean();
            }
            header_remove('Content-Type');
            http_response_code(500);
            echo $e->getMessage();
            exit;
        }
    }

    public function downloadPoeAdjunto($idPoe, $slot) {
        try {
            if (ob_get_length()) {
                ob_clean();
            }
            header_remove('Content-Type');

            $sesion = Auditoria::getDatosSesion();
            $instId = $this->requireInst($sesion);

            $pid = (int) $idPoe;
            $slot = (int) $slot;
            if ($pid <= 0 || !in_array($slot, [1, 2], true)) {
                http_response_code(400);
                echo 'Parámetros inválidos';
                exit;
            }

            $m = new InstitucionPoeModel($this->db);
            // Admin puede previsualizar instructivos aunque el POE esté inactivo (getPublicById exige Activo = 1).
            $row = $m->getByIdAdmin($instId, $pid);
            if (!$row) {
                $row = $m->getPublicById($instId, $pid);
            }
            if (!$row) {
                http_response_code(404);
                echo 'Documento no encontrado';
                exit;
            }

            $kCol = 'Adjunto' . $slot . 'B2Key';
            $nCol = 'NombreAdjunto' . $slot;
            $key = $row[$kCol] ?? null;
            $nombre = (string) ($row[$nCol] ?? 'adjunto');

            if ($key !== null && $key !== '') {
                $mime = self::mimeDesdeNombreArchivo($nombre);
                $b2 = new BackblazeB2('POES');
                $b2->streamDownloadAttachment((string) $key, $nombre, $mime, false);
                return;
            }

            $uCol = 'UrlAdjunto' . $slot;
            $url = isset($row[$uCol]) ? trim((string) $row[$uCol]) : '';
            if ($url !== '' && preg_match('#^https?://#i', $url)) {
                header('Location: ' . $url, true, 302);
                exit;
            }

            http_response_code(404);
            echo 'Adjunto no disponible';
            exit;
        } catch (\Exception $e) {
            if (ob_get_length()) {
                ob_clean();
            }
            header_remove('Content-Type');
            http_response_code(500);
            echo $e->getMessage();
            exit;
        }
    }

    /** Expuesto por si el front arma enlaces absolutos (misma lógica que PortadaPopup). */
    public static function absoluteApiPrefix(): string {
        return self::apiPublicPrefix();
    }
}
