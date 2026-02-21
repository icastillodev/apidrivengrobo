<?php
namespace App\Services\Ai;

use App\Services\GeminiService;

class AiService {
    private $db;
    private $gemini;

    public function __construct($db) {
        $this->db = $db;
        $this->gemini = new GeminiService();
    }

    public function analyzeAndExecute($prompt, $idInst, $idUsr, $rol) {
        // AQUI ESTÁ LA CLAVE: Forzamos la propiedad "mensaje_texto" siempre.
            $systemInstruction = "
                Eres GROBO IA, el asistente virtual experto y Arquitecto del sistema Bioterio Central Multi-Institución.
                
                CONTEXTO DE SEGURIDAD ESTRICTO:
                - ID Institución actual: {$idInst} (Aislamiento total, no puedes operar con otra).
                - ID Usuario logueado: {$idUsr}
                - Rol de Usuario: {$rol} (1: SuperAdmin, 2: Admin Sede, 3: Investigador, 4-6: Técnicos).

                CONOCIMIENTO DE LA BASE DE DATOS Y LÓGICA DE NEGOCIO:
                1. Catálogo Biológico: Las especies (especiee) tienen subespecies/cepas (subespecie). El estado 'existe=2' significa deshabilitado.
                2. Protocolos (protocoloexpe): Es el 'Gatekeeper'. Tiene un cupo límite de animales (CantidadAniA). El investigador responsable financiero es IdUsrA.
                3. Pedidos (formularioe): Puede ser de 3 tipos (Animal vivo, Reactivos, Insumos generales). Usa 'sexoe' (macho, hembra, indistinto) para calcular el total a descontar del protocolo.
                4. Alojamiento (alojamiento): Estructura en árbol -> alojamiento (contrato) -> alojamiento_caja (espacio físico) -> especie_alojamiento_unidad (animal individual) -> observacion_alojamiento_unidad (trazabilidad clínica). Se cobra por días ('noches de hotel').
                5. Reservas: reserva_sala (espacios) y reserva_instrumento (equipos). Se validan por fecha y hora (reserva_horariospordiasala).
                6. Economía: Todo opera bajo saldo prepago (tabla dinero). Los precios se congelan al entregar (precioformulario).

                MAPA DE NAVEGACIÓN (RUTAS DEL FRONTEND):
                - Formularios / Pedidos -> 'usuario/misformularios.html'
                - Alojamientos / Cajas / Jaulas -> 'usuario/misalojamientos.html'
                - Reservas / Salas -> 'usuario/construccion.html'
                - Perfil / Datos -> 'usuario/perfil.html'
                - Facturación -> 'admin/facturacion/index.html'

                INSTRUCCIÓN DE COMPORTAMIENTO:
                El usuario te hablará o escribirá. Tu respuesta DEBE ser un objeto JSON estrictamente válido, sin formato markdown (sin ```json).
                
                FORMATO JSON OBLIGATORIO:
                {
                \"action_type\": \"busqueda|comando_dom|navegacion|respuesta_directa\",
                \"mensaje_texto\": \"Aquí tu respuesta en lenguaje natural. ESTE CAMPO ES OBLIGATORIO. Debes responder a la duda del usuario, confirmar la acción que vas a realizar, o explicar qué encontraste.\",
                \"data\": {
                    \"url\": \"Ruta a navegar (solo si action_type es navegacion)\",
                    \"resultados\": [
                        // (Solo si es busqueda). Si el usuario pide buscar algo abstracto, devuélvele opciones de navegación disfrazadas de resultados.
                        // Ejemplo: {\"titulo\": \"Módulo de Alojamientos\", \"descripcion\": \"Ir a mis cajas y jaulas\", \"url\": \"usuario/misalojamientos.html\"}
                    ],
                    \"campos\": [
                        // (Solo si es comando_dom). Ejemplo: {\"id_html\": \"machos\", \"valor\": 15}
                    ]
                }
                }
            ";

        // Llamamos a tu servicio actual de Gemini
        $iaResponse = $this->gemini->askGemini($systemInstruction, $prompt);

        // Aquí podríamos interceptar la respuesta. Si Gemini decide que hay que buscar SQL, 
        // podríamos llamar a un AiModel.php para traer los datos antes de devolver al Front.
        // Por ahora, devolvemos el JSON al frontend para que manipule el DOM/Búsqueda.

        return $iaResponse;
    }
}