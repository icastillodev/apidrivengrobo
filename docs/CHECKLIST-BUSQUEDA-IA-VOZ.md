# Checklist — búsqueda, IA y voz

Backlog **único** para funcionalidades de **búsqueda**, **inteligencia artificial** y **voz** (extraído del antiguo checklist de sprint).

Convención: `[ ]` pendiente · `[x]` hecho.

### Inventario técnico en repo (referencia, 2026-04)

No cierra por sí solo los ítems de producto de abajo; sirve para saber **dónde está el código** antes de planificar mejoras.

| Ámbito | Dónde |
|--------|--------|
| Omnibúsqueda UI (overlay, teclado, resultados) | `front/dist/js/components/GeckoSearch.js`, `GeckoSearchEngine.js`; HTML del overlay según plantillas que incluyan `#gecko-omni-*` |
| Voz (Web Speech API, wake word, envío a IA) | `front/dist/js/components/GeckoVoice.js`; comandos / wake: `GeckoCommands.js`; activación desde menú: `MenuConfig.js`, `MenuEvents.js`, `MenuComponent.js` |
| Cliente IA (payload, acciones, TTS) | `front/dist/js/components/GeckoAiDispatcher.js` → `POST /ia/procesar` (`API.request`) |
| Backend | `api/routes.php` → `AiController@processCommand`; identidad efectiva desde **sesión** (`Auditoria::getDatosSesion`), no solo el cuerpo del POST |
| Rol / permisos IA | Variable de entorno opcional **`GROBO_IA_ALLOWED_ROLES`** (lista de `IdTipousrA` separados por coma). Si está definida y no vacía, solo esos roles reciben IA; si no, todos los usuarios con sesión válida (como antes). Respuesta **403** + `error_code: ia_forbidden_role` → mensaje **`gecko_ai.error_role_denied`** en el cliente |
| Lógica IA (Gemini + búsqueda por rol) | `api/src/Models/Services/AiService.php` — mapa de rutas según rol admin/panel, `GlobalSearchModel` (`searchForAdmin` / `searchForUser`), `GeminiService` |
| Acciones soportadas por el dispatcher (según respuesta JSON) | `mensaje_texto` + TTS; `navegacion`; `comando_dom` (rellenar `#id` y opcional `click`); `busqueda` con resultados en overlay |
| Mensajes UI voz / error IA | `window.txt.gecko_ai.*` en `i18n/es|en|pt.js`; `GeckoVoice.showErrorModal` (corrige llamada previa a método inexistente), Firefox / sin API / micrófono denegado |

---

## Búsqueda y ayuda inteligente

- [ ] **Mejorar búsqueda con IA** (respuestas y ayuda contextual en la app).
- [ ] **Limitar el uso de IA** en la app (sin preguntas cotidianas / fuera de contexto).
- [ ] **Limitar la IA por usuario** (según rol / permisos).

## Voz

- [ ] **Mejorar funcionalidad de voz** (rellenar formularios y acciones en la app).
- [ ] **Entrenamiento de voz** y mejoras de interacción por voz.

---

## Notas

- **2026-04:** i18n **`gecko_ai`** (ES/EN/PT) para título de error de IA y mensajes de voz (Firefox, sin API, micrófono denegado); **`GeckoVoice.showErrorModal`** implementado (antes `MenuConfig` lo invocaba y podía fallar en runtime); **`toggleVoice`** usa razón **`no-api`** cuando no hay `SpeechRecognition`.
- **2026-04 (IA):** tope **2000 caracteres** alineado cliente (`GeckoAiDispatcher` + claves `prompt_too_long_*`) y servidor (`AiService::MAX_USER_PROMPT_CHARS`); en **`AiService`** instrucción de sistema **regla 4 — fuera de ámbito** para que el modelo responda con `respuesta_directa` si la petición no es sobre GROBO/bioterio (complementa ítems *Limitar el uso de IA* / *cotidianas fuera de contexto* del backlog).
- **2026-04 (IA por rol):** **`GROBO_IA_ALLOWED_ROLES`** en `.env` (documentado en **`.env.example`**); **`error_code` `ia_forbidden_role`** + i18n **`gecko_ai.error_role_denied`** / **`error_generic_body`** en el Swal de error del dispatcher.
- **2026-04 (coste + voz + ayuda):** `buscar …` / `ayuda …` / `cómo …` con **fast-path en PHP** (sin Gemini); **`ayuda_manual`** abre `capacitacion.html#t=slug`; prompt compacto + **`maxOutputTokens` 512**; **`comando_dom`** con `change`; wake words ampliadas y detección por tokens; voz local **cerrar / siguiente / guardar** sin API.
- **2026-04 (ahorro API):** si el texto **no** coincide con fast-path y **no** contiene palabras clave de tareas GROBO, **no se llama a Gemini** (respuesta fija); saludos/cortesías sueltas tampoco disparan la API. Variable **`GROBO_IA_RELAXED_GEMINI=1`** en `.env` recupera el modo permisivo (solo depuración).
- **Capacitación / manual / barra de ayuda:** lista viva [`CHECKLIST-CAPACITACION-PENDIENTE.md`](CHECKLIST-CAPACITACION-PENDIENTE.md); guía archivada [`checklist-finalizados/CHECKLIST-CAPACITACION-HUB.md`](checklist-finalizados/CHECKLIST-CAPACITACION-HUB.md).
- Ítems de correos, reservas módulo completo, tickets, FAQ público, etc., que estaban mezclados en el sprint anterior pueden reabrirse en un **issue** o checklist de producto aparte si el equipo lo necesita.
