<?php
namespace App\Controllers;

class GlobalSearchController {
    private $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function search() {
        header('Content-Type: application/json');
        
        // Recoger parámetros
        $query  = $_GET['q'] ?? '';
        $instId = $_GET['inst'] ?? 0;
        $role   = isset($_GET['role']) ? intval($_GET['role']) : 0;
        $userId = isset($_GET['uid']) ? intval($_GET['uid']) : 0;

        if (strlen($query) < 2) {
            echo json_encode(['status' => 'success', 'data' => []]);
            exit;
        }

        $term = "%$query%";
        $results = [
            'protocolos'   => [],
            'usuarios'     => [], // Para admin (Investigadores) / Para user (Formularios)
            'alojamientos' => [],
            'insumos'      => []
        ];

        try {
            // =========================================================
            // LÓGICA PARA ADMINISTRADORES (Roles 1, 2, 4, 5, 6)
            // =========================================================
            if (in_array($role, [1, 2, 4, 5, 6])) {
                
                // 1. PROTOCOLOS (Todos los de la institución)
                $sqlProt = "SELECT idprotA, tituloA, nprotA FROM protocoloexpe 
                            WHERE IdInstitucion = ? AND (tituloA LIKE ? OR nprotA LIKE ?) 
                            ORDER BY idprotA DESC LIMIT 5";
                $stmt = $this->db->prepare($sqlProt);
                $stmt->execute([$instId, $term, $term]);
                $results['protocolos'] = $stmt->fetchAll();

                // 2. USUARIOS (Busca personas)
                $sqlUsr = "SELECT p.IdUsrA, p.NombreA, p.ApellidoA, p.EmailA 
                           FROM personae p 
                           INNER JOIN usuarioe u ON p.IdUsrA = u.IdUsrA
                           WHERE u.IdInstitucion = ? 
                           AND (p.NombreA LIKE ? OR p.ApellidoA LIKE ? OR p.EmailA LIKE ?) LIMIT 5";
                $stmt = $this->db->prepare($sqlUsr);
                $stmt->execute([$instId, $term, $term, $term]);
                $results['usuarios'] = $stmt->fetchAll();

                // 3. ALOJAMIENTOS (Por Historia o ID Protocolo)
                $sqlAloj = "SELECT idprotA, historia FROM alojamiento 
                            WHERE IdInstitucion = ? AND (historia LIKE ? OR idprotA LIKE ?) 
                            GROUP BY historia LIMIT 5";
                $stmt = $this->db->prepare($sqlAloj);
                $stmt->execute([$instId, $term, $term]);
                $results['alojamientos'] = $stmt->fetchAll();

                // 4. INSUMOS (Catálogo Global)
                $sqlIns = "SELECT idInsumo, NombreInsumo, CantidadInsumo, TipoInsumo FROM insumo 
                           WHERE IdInstitucion = ? AND NombreInsumo LIKE ? 
                           UNION 
                           SELECT IdInsumoexp as idInsumo, NombreInsumo, CantidadInsumo, TipoInsumo FROM insumoexperimental 
                           WHERE IdInstitucion = ? AND NombreInsumo LIKE ? LIMIT 5";
                $stmt = $this->db->prepare($sqlIns);
                $stmt->execute([$instId, $term, $instId, $term]);
                $results['insumos'] = $stmt->fetchAll();

            } 
            // =========================================================
            // LÓGICA PARA USUARIOS / INVESTIGADORES (Rol 3)
            // =========================================================
            else {
                
                // 1. MIS PROTOCOLOS (Solo donde él es el investigador a cargo o responsable)
                $sqlProt = "SELECT idprotA, tituloA, nprotA FROM protocoloexpe 
                            WHERE IdInstitucion = ? AND IdUsrA = ? 
                            AND (tituloA LIKE ? OR nprotA LIKE ?) 
                            ORDER BY idprotA DESC LIMIT 5";
                $stmt = $this->db->prepare($sqlProt);
                $stmt->execute([$instId, $userId, $term, $term]);
                $results['protocolos'] = $stmt->fetchAll();

                // 2. MIS FORMULARIOS (Reemplaza a la búsqueda de usuarios)
                // Usamos el array 'insumos' en el JS para mapear a formularios, o 'usuarios' si prefieres reutilizar la estructura.
                // Aquí vamos a buscar Formularios por ID o Tipo para mostrarlos.
                // NOTA: En el JS, mapeaste "insumos" a "misformularios.html". Usaremos el array de insumos para devolver forms.
                
                $sqlForms = "SELECT idformA as idInsumo, CONCAT('Formulario #', idformA) as NombreInsumo, estado as CantidadInsumo, tipoA as TipoInsumo 
                             FROM formularioe 
                             WHERE IdInstitucion = ? AND IdUsrA = ? 
                             AND (idformA LIKE ? OR tipoA LIKE ?) LIMIT 5";
                $stmt = $this->db->prepare($sqlForms);
                $stmt->execute([$instId, $userId, $term, $term]);
                $results['insumos'] = $stmt->fetchAll(); // Se mostrarán en la sección de "Insumos/Formularios"

                // 3. MIS ALOJAMIENTOS
                $sqlAloj = "SELECT idprotA, historia FROM alojamiento 
                            WHERE IdInstitucion = ? AND IdUsrA = ? 
                            AND (historia LIKE ? OR idprotA LIKE ?) 
                            GROUP BY historia LIMIT 5";
                $stmt = $this->db->prepare($sqlAloj);
                $stmt->execute([$instId, $userId, $term, $term]);
                $results['alojamientos'] = $stmt->fetchAll();

                // El array de 'usuarios' se deja vacío para rol 3 porque no pueden buscar a otros.
            }

            echo json_encode(['status' => 'success', 'data' => $results]);

        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }
}