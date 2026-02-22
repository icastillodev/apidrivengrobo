<?php
namespace App\Models\Services; // <-- Coincide con la carpeta Models/Services

use App\Utils\GeminiService; // Importamos Gemini desde Utils
use App\Models\Search\GlobalSearchModel; 

class AiService {
    private $db;
    private $gemini;
    private $searchModel;

    public function __construct($db) {
        $this->db = $db;
        $this->gemini = new GeminiService();
        $this->searchModel = new GlobalSearchModel($db); 
    }

    public function analyzeAndExecute($prompt, $idInst, $idUsr, $rol) {
        // Determinamos el prefijo de la ruta según el rol
        $esAdmin = in_array($rol, [1, 2, 4, 5, 6]);
        $tipoUsuario = $esAdmin ? "Administrador" : "Investigador";
        
        $rutas = $esAdmin ? "
            - Formularios / Pedidos -> 'paginas/usuario/formularios.html'
            - Protocolos -> 'paginas/admin/protocolos.html'
            - Alojamientos -> 'paginas/admin/alojamientos.html'
            - Insumos -> 'paginas/admin/insumos.html'
            - Reactivos -> 'paginas/admin/reactivos.html'
            - Animales -> 'paginas/admin/animales.html'
        " : "
            - Formularios / Pedidos -> 'paginas/usuario/misformularios.html'
            - Protocolos -> 'paginas/usuario/misprotocolos.html'
            - Alojamientos -> 'paginas/usuario/misalojamientos.html'
        ";

    $systemInstruction = "
            Eres GROBO IA, el asistente virtual inteligente y experto del sistema Bioterio Central.
            
            CONTEXTO DEL USUARIO ACTUAL:
            - Rol: {$tipoUsuario}.
            - Mapa de navegación permitido: {$rutas}
            
            LÓGICA DEL NEGOCIO (MANUAL DE AYUDA):
            - Protocolos: Son el 'Gatekeeper' legal y financiero. Autorizan el uso de animales y definen el cupo máximo. Si el cupo es cero o la fecha expiró, no se pueden pedir animales.
            - Formularios / Pedidos: Tienen 3 flujos. 1) Animales Vivos (descuentan cupo del protocolo). 2) Reactivos/Tejidos. 3) Insumos Generales (viruta, alimento).
            - Alojamientos / Cajas: Es el 'hotel' de los animales. Se cobra por tiempo (noches de hotel). Tiene trazabilidad total: sabemos en qué caja está cada animal y su historia clínica diaria.
            - Economía: Todo funciona bajo un modelo de cuenta corriente prepaga. Se factura al Responsable Financiero del protocolo, congelando el precio al momento de la entrega.
            
            REGLAS DE DECISIÓN Y COMPORTAMIENTO (¡ESTRICTAS!):
            1. BÚSQUEDA: Si el usuario pide buscar un registro, usa 'busqueda'.
               OJO: El campo 'term' DEBE ser solo UNA palabra clave (ej: apellido), en minúsculas y sin tildes.
               ¡SILENCIO ESTRICTO!: En tu 'mensaje_texto' responde ÚNICA Y EXCLUSIVAMENTE con la frase 'Buscando los datos...'. PROHIBIDO leer o dictar el contenido de la búsqueda.
            
            2. NAVEGACIÓN Y CREACIÓN: Si pide ir a un módulo, usa 'navegacion' con la url. 
               - Si pide CREAR o HACER un NUEVO Protocolo, envíalo a: 'admin/protocolos.html?action=nuevo' (si es admin) o 'usuario/misprotocolos.html?action=nuevo' (si es investigador).
               - Si pide CREAR un NUEVO Alojamiento, envíalo a: 'admin/alojamientos.html?action=nuevo'.
               - Si pide CREAR un Formulario/Pedido de Animales o Insumos, envíalo a: 'usuario/formularios.html'.
            3. SOPORTE TÉCNICO: Si pregunta CÓMO funciona algo (ej: '¿Por qué no puedo pedir animales?'), usa 'respuesta_directa'. 
               OJO: Usa la 'Lógica del Negocio' para responder. Sé breve (máximo 3 oraciones), amigable y muy claro.

            REGLAS ESTRICTAS DE SALIDA:
            NO seas educado. NO saludes. NO digas 'Aquí tienes el JSON'. 
            Devuelve ÚNICA Y EXCLUSIVAMENTE la estructura JSON pura. Nada de texto antes, nada de texto después.

            FORMATO JSON OBLIGATORIO:
            {
                \"action_type\": \"busqueda|navegacion|respuesta_directa\",
                \"mensaje_texto\": \"Tu respuesta hablada. Breve, útil y directa.\",
                \"data\": {
                    \"url\": \"Ruta a navegar (solo para navegacion)\",
                    \"search_params\": {
                        \"scope\": \"protocolo|pedido|alojamiento|usuario|insumo|global\",
                        \"term\": \"palabra clave LIMPIA, SIN TILDES (solo para busqueda)\"
                    }
                }
            }
        ";

    // 1. Llamamos a Gemini (Tu GeminiService ya nos devuelve el array PHP perfecto)
        $iaData = $this->gemini->askGemini($systemInstruction, $prompt);

        // Si por alguna razón viene vacío, tenemos un plan B
        if (!is_array($iaData)) {
            return [
                'action_type' => 'respuesta_directa',
                'mensaje_texto' => 'Entendí tu petición, pero hubo un error procesando los datos.',
                'data' => []
            ];
        }
        $finalResponse = [
            'action_type' => $iaData['action_type'] ?? 'respuesta_directa',
            'mensaje_texto' => $iaData['mensaje_texto'] ?? 'Aquí tienes la información.',
            'data' => $iaData['data'] ?? []
        ];

        // SI LA IA DECIDE BUSCAR EN LA BASE DE DATOS
        if ($finalResponse['action_type'] === 'busqueda' && !empty($finalResponse['data']['search_params'])) {
            $scope = $finalResponse['data']['search_params']['scope'] ?? 'global';
            $term = $finalResponse['data']['search_params']['term'] ?? '';

            if ($term !== '') {
                // Limpieza extrema en PHP: Quita tildes, minúsculas y espacios extra
                $term = strtolower(trim(preg_replace('/&([a-zA-Z])(uml|acute|grave|circ|tilde);/','$',htmlentities($term, ENT_COMPAT, 'UTF-8'))));
                
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
            }
        }

        return $finalResponse;
    }
}