<?php
namespace App\Models\Services;

use App\Utils\GeminiService;
use App\Models\Search\GlobalSearchModel;

class AiService {
    private const MAX_USER_PROMPT_CHARS = 2000;

    private $db;
    private $gemini;
    private $searchModel;

    public function __construct($db) {
        $this->db = $db;
        $this->gemini = new GeminiService();
        $this->searchModel = new GlobalSearchModel($db);
    }

    public function analyzeAndExecute($prompt, $idInst, $idUsr, $rol) {
        $rol = (int) $rol;
        $prompt = trim((string) $prompt);
        $promptLen = function_exists('mb_strlen') ? mb_strlen($prompt, 'UTF-8') : strlen($prompt);
        if ($promptLen > self::MAX_USER_PROMPT_CHARS) {
            return [
                'action_type' => 'respuesta_directa',
                'mensaje_texto' => 'Tu mensaje supera el límite de longitud. Escribe una consulta más breve sobre GROBO.',
                'data' => []
            ];
        }

        $esAdmin = in_array($rol, [1, 2, 4, 5, 6], true);
        $esAdminSede = in_array($rol, [1, 2, 4], true);
        $tipoUsuario = $esAdminSede ? 'Administrador de sede' : 'Usuario de panel (investigador / lab / asistente)';

        $rutas = $esAdminSede ? "
paginas/admin/protocolos.html | paginas/admin/alojamientos.html | paginas/admin/animales.html | paginas/admin/insumos.html | paginas/admin/reactivos.html | paginas/admin/usuarios.html | paginas/admin/reservas.html | paginas/admin/estadisticas.html | paginas/admin/precios.html | paginas/admin/facturacion/index.html | paginas/panel/formularios.html (centro pedidos)
Nuevo: protocolos ?action=nuevo | alojamientos ?action=nuevo | pedidos paginas/panel/formularios.html
        " : "
paginas/panel/misprotocolos.html | paginas/panel/misformularios.html | paginas/panel/misalojamientos.html | paginas/panel/misreservas.html | paginas/panel/formularios.html | paginas/panel/perfil.html
Nuevo protocolo: paginas/panel/misprotocolos.html?action=nuevo
        ";

        $fast = $this->tryFastPath($prompt, $esAdminSede);
        if ($fast !== null) {
            return $this->applyBusquedaDb($fast, $idInst, $idUsr, $esAdmin);
        }

        if (!$this->isRelaxedGeminiMode()) {
            if ($this->isObviousChitchatOnly($prompt)) {
                return $this->geminiBlockedUserResponse();
            }
            if (!$this->promptLooksLikeGroboTask($prompt)) {
                return $this->geminiBlockedUserResponse();
            }
        }

        $systemInstruction = $this->buildCompactSystemPrompt($tipoUsuario, $rutas);
        $iaData = $this->gemini->askGemini($systemInstruction, $prompt);

        if (!is_array($iaData)) {
            return [
                'action_type' => 'respuesta_directa',
                'mensaje_texto' => 'No pude interpretar la respuesta. Reformulá la petición en una frase corta.',
                'data' => []
            ];
        }

        $finalResponse = [
            'action_type' => $iaData['action_type'] ?? 'respuesta_directa',
            'mensaje_texto' => $iaData['mensaje_texto'] ?? '',
            'data' => is_array($iaData['data'] ?? null) ? $iaData['data'] : []
        ];

        return $this->applyBusquedaDb($finalResponse, $idInst, $idUsr, $esAdmin);
    }

    /**
     * Evita llamar a Gemini en patrones triviales (ahorro de coste y latencia).
     */
    private function tryFastPath(string $prompt, bool $esAdminSede): ?array {
        if (preg_match('/^\s*(?:ayuda|manual|documentación|documentacion|help)\s*$/iu', $prompt)) {
            return [
                'action_type' => 'ayuda_manual',
                'mensaje_texto' => 'Abriendo el manual de capacitación.',
                'data' => ['slug' => 'panel__capacitacion']
            ];
        }

        if (preg_match('/^\s*(?:buscar|busca|busque|búscame|buscame|encontrar|encontra|localiza|localize|search|find|lookup|procurar|procure)\s+(.+)$/iu', $prompt, $m)) {
            $termRaw = trim($m[1]);
            $termRaw = preg_replace('/\s+(por favor|please|obrigad[oa]|gracias)\s*$/iu', '', $termRaw);
            $term = $this->normalizeDbTerm($termRaw);
            if ($term !== '') {
                return [
                    'action_type' => 'busqueda',
                    'mensaje_texto' => 'Buscando los datos...',
                    'data' => ['search_params' => ['scope' => 'global', 'term' => $term]]
                ];
            }
        }

        if (preg_match('/^\s*(?:ayuda|manual|documentación|documentacion|help)\s+(?:sobre|con|de|para|with|on|about)?\s*(.+)$/iu', $prompt, $m)) {
            $slug = $this->helpSlugFromTopic(trim($m[1]), $esAdminSede);
            if ($slug !== null) {
                return [
                    'action_type' => 'ayuda_manual',
                    'mensaje_texto' => 'Abriendo el manual de ayuda.',
                    'data' => ['slug' => $slug]
                ];
            }
        }

        if (preg_match('/^\s*(?:cómo|como|how)\s+(?:hago|hacer|puedo|funciona|do i|works)(?:\s+(.+))?$/iu', $prompt, $m)) {
            $rest = isset($m[1]) ? trim((string) $m[1]) : '';
            if ($rest !== '') {
                $slug = $this->helpSlugFromTopic($rest, $esAdminSede);
                if ($slug !== null) {
                    return [
                        'action_type' => 'ayuda_manual',
                        'mensaje_texto' => 'Te muestro el apartado del manual.',
                        'data' => ['slug' => $slug]
                    ];
                }
            }
            return [
                'action_type' => 'ayuda_manual',
                'mensaje_texto' => 'Abriendo el manual de capacitación.',
                'data' => ['slug' => 'panel__capacitacion']
            ];
        }

        return null;
    }

    /**
     * Si es true, se permite llamar a Gemini aunque el texto no tenga palabras clave GROBO (solo depuración / pilotos).
     */
    private function isRelaxedGeminiMode(): bool {
        $v = $_ENV['GROBO_IA_RELAXED_GEMINI'] ?? getenv('GROBO_IA_RELAXED_GEMINI');
        if ($v === false || $v === null || $v === '') {
            return false;
        }
        $v = strtolower(trim((string) $v));

        return in_array($v, ['1', 'true', 'yes', 'si', 'sí', 'on'], true);
    }

    /** Saludo o cortesía suelta → no gastar API. */
    private function isObviousChitchatOnly(string $prompt): bool {
        $p = trim($prompt);
        if ($p === '') {
            return true;
        }

        return (bool) preg_match(
            '/^(?:hola|holaa|hi|hello|hey|buen[oa]s(?:\s+d[ií]as?|\s+tardes?|\s+noches?)?|good\s+(?:morning|afternoon|evening)|qu[ée]\s+tal|que\s+tal|gracias|thanks|thank\s+you|de\s+nada|vale|ok|oki|okay|chau|adios|adiós|bye|saludos|ol[aá]|bom\s+dia|boa\s+tarde|boa\s+noite|oi)\s*[!?.¡¿]*$/iu',
            $p
        );
    }

    /**
     * Sin esto NO se llama a Gemini: el lenguaje natural “libre” cuesta tokens.
     * Listas orientadas a datos / pantallas / reglas de negocio GROBO.
     */
    private function promptLooksLikeGroboTask(string $prompt): bool {
        $p = mb_strtolower($prompt, 'UTF-8');
        $p = strtr($p, [
            'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n',
        ]);

        $needles = [
            'grobo', 'gecko', 'bioterio', 'vivario', 'protocolo', 'alojamiento', 'formulario', 'pedido',
            'animal', 'insumo', 'reactivo', 'reserva', 'factur', 'usuario', 'mensaje', 'noticia',
            'buscar', 'busca', 'busque', 'busqueda', 'encontrar', 'localiza', 'search', 'find', 'lookup',
            'ayuda', 'manual', 'capacit', 'tutorial', 'documentacion',
            'nuevo', 'nueva', 'crear', 'abrir', 'ir a', 'llevar', 'mostrar', 'pantalla', 'modulo',
            'rellenar', 'llenar', 'campo', 'input', 'boton', 'guardar', 'enviar', 'cancelar', 'eliminar',
            'cupo', 'caja', 'trazabilidad', 'solicitud', 'entrega', 'precio', 'tarifa', 'estadist',
            'config', 'perfil', 'panel', 'admin', 'laboratorio', 'departamento', 'organiz',
            'saldo', 'pagar', 'cuenta corriente', 'cuenta', 'pedir', 'no puedo', 'no me deja', 'error',
            'por que', 'porque', 'donde', 'cual ', ' cual', 'expli', 'ventana', 'modal', 'popup',
            'pdf', 'excel', 'export', 'help', 'open', 'new', 'create', 'fill', 'save', 'submit',
            'booking', 'billing', 'reagent', 'supply', 'housing', 'investiga', 'experi', 'muestra',
            'tejido', 'viruta', 'alimento', 'comprar', 'devolver', 'stock',
        ];

        foreach ($needles as $n) {
            if (mb_strpos($p, $n, 0, 'UTF-8') !== false) {
                return true;
            }
        }

        return false;
    }

    private function geminiBlockedUserResponse(): array {
        return [
            'action_type' => 'respuesta_directa',
            'mensaje_texto' => 'Solo atiendo pedidos concretos sobre GROBO: por ejemplo «buscar» y una palabra clave, «ayuda sobre alojamientos» o «cómo hago un pedido», o pedime abrir una pantalla (protocolos, formularios, facturación…). Para temas generales que no sean el sistema, usá otro medio; aquí no gastamos consultas fuera de GROBO.',
            'data' => []
        ];
    }

    /**
     * @return string slug con __ (ej. panel__misformularios)
     */
    private function helpSlugFromTopic(string $topic, bool $esAdminSede): ?string {
        $t = mb_strtolower(trim($topic), 'UTF-8');
        $t = strtr($t, [
            'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n',
        ]);
        $t = preg_replace('/[^a-z0-9\s]/', ' ', $t);
        $t = preg_replace('/\s+/u', ' ', trim($t));
        if ($t === '') {
            return null;
        }

        $rows = [
            [['facturacion', 'factura', 'billing', 'faturamento'], 'admin__facturacion__index', 'panel__capacitacion'],
            [['usuario', 'usuarios', 'users'], 'admin__usuarios', 'panel__perfil'],
            [['protocolo', 'protocolos'], 'admin__protocolos', 'panel__misprotocolos'],
            [['formulario', 'formularios', 'pedido', 'pedidos', 'solicitud'], 'panel__formularios', 'panel__misformularios'],
            [['alojamiento', 'alojamientos', 'caja', 'cajas', 'housing'], 'admin__alojamientos', 'panel__misalojamientos'],
            [['animal', 'animales'], 'admin__animales', 'panel__misprotocolos'],
            [['insumo', 'insumos', 'supply'], 'admin__insumos', 'panel__misformularios'],
            [['reactivo', 'reactivos', 'reagent'], 'admin__reactivos', 'panel__misformularios'],
            [['reserva', 'reservas', 'booking'], 'admin__reservas', 'panel__misreservas'],
            [['institucional'], 'panel__mensajes_institucion', 'panel__mensajes_institucion'],
            [['mensaje', 'mensajes', 'message'], 'panel__mensajes', 'panel__mensajes'],
            [['noticia', 'noticias', 'news'], 'admin__comunicacion__noticias', 'panel__noticias'],
            [['estadistica', 'estadisticas', 'stats'], 'admin__estadisticas', 'panel__dashboard'],
            [['precio', 'precios', 'tarifa'], 'admin__precios', 'panel__dashboard'],
            [['config', 'configuracion'], 'admin__configuracion__config', 'panel__perfil'],
            [['perfil', 'profile', 'cuenta'], 'admin__usuarios', 'panel__perfil'],
            [['capacit', 'tutorial'], 'panel__capacitacion', 'panel__capacitacion'],
            [['red', 'network'], 'capacitacion__tema__red', 'capacitacion__tema__red'],
            [['modal', 'ventana emergente', 'popup'], 'capacitacion__tema__modales', 'capacitacion__tema__modales'],
            [['dashboard', 'inicio', 'home'], 'admin__dashboard', 'panel__dashboard'],
        ];

        foreach ($rows as $row) {
            foreach ($row[0] as $kw) {
                if (strpos($t, $kw) !== false) {
                    return $esAdminSede ? $row[1] : $row[2];
                }
            }
        }

        return null;
    }

    private function normalizeDbTerm(string $raw): string {
        $raw = trim($raw);
        if ($raw === '') {
            return '';
        }
        $term = strtolower(trim(preg_replace('/&([a-zA-Z])(uml|acute|grave|circ|tilde);/', '$', htmlentities($raw, ENT_COMPAT, 'UTF-8'))));
        $term = preg_replace('/\s+/u', ' ', $term);
        if (function_exists('mb_strlen') && mb_strlen($term, 'UTF-8') > 120) {
            $term = mb_substr($term, 0, 120, 'UTF-8');
        }

        return trim($term);
    }

    private function buildCompactSystemPrompt(string $tipoUsuario, string $rutas): string {
        return "GROBO IA: asistente operativo del bioterio. Rol: {$tipoUsuario}.
Rutas típicas: {$rutas}

Objetivo: respuestas cortas y acciones concretas. Prioridad: (1) busqueda BD (2) navegacion (3) comando_dom (4) ayuda_manual (5) respuesta_directa breve.

REGLAS:
- busqueda: un término o frase corta sin tildes en search_params.term; scope protocolo|pedido|alojamiento|usuario|insumo|global. mensaje_texto EXACTO: Buscando los datos...
- navegacion: data.url SIEMPRE con prefijo paginas/ ej paginas/admin/alojamientos.html?action=nuevo o paginas/panel/misformularios.html
- comando_dom: rellenar inputs visibles con id HTML real: data.campos [{\"id_html\":\"...\",\"valor\":\"...\"}]; opcional data.ejecutar_click con id de botón. Solo si el usuario pidió datos concretos; no inventar ids.
- ayuda_manual: data.slug con doble guión bajo (ej panel__misalojamientos, admin__protocolos, panel__capacitacion). Una frase corta en mensaje_texto.
- respuesta_directa: máximo 2 frases; solo lógica de negocio GROBO (protocolos=cupo, alojamiento=estadías, pedidos=flujos).
- Fuera de GROBO: respuesta_directa de una frase: solo ayudás con GROBO.

Salida: SOLO JSON válido, sin markdown.
{\"action_type\":\"busqueda|navegacion|comando_dom|ayuda_manual|respuesta_directa\",\"mensaje_texto\":\"...\",\"data\":{}}";
    }

    private function applyBusquedaDb(array $finalResponse, $idInst, $idUsr, bool $esAdmin): array {
        if (($finalResponse['action_type'] ?? '') !== 'busqueda' || empty($finalResponse['data']['search_params'])) {
            return $finalResponse;
        }

        $scope = $finalResponse['data']['search_params']['scope'] ?? 'global';
        $term = $finalResponse['data']['search_params']['term'] ?? '';

        if ($term === '') {
            return $finalResponse;
        }

        $term = strtolower(trim(preg_replace('/&([a-zA-Z])(uml|acute|grave|circ|tilde);/', '$', htmlentities($term, ENT_COMPAT, 'UTF-8'))));
        $termParam = "%$term%";

        if ($esAdmin) {
            $dbResults = $this->searchModel->searchForAdmin($idInst, $termParam, $scope);
        } else {
            $dbResults = $this->searchModel->searchForUser($idInst, $idUsr, $termParam, $scope);
        }

        $finalResponse['data']['resultados'] = [];
        foreach ($dbResults as $key => $val) {
            if (!empty($val)) {
                $finalResponse['data']['resultados'][$key] = $val;
            }
        }

        if (empty($finalResponse['data']['resultados'])) {
            $finalResponse['mensaje_texto'] = "Busqué '$term', pero no encontré registros en la base de datos.";
        }

        return $finalResponse;
    }
}
