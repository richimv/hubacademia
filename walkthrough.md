# Walkthrough: Mejora de la Experiencia del Visitante e Inteligencia Artificial en Producción

Hemos completado la mejora de la experiencia para usuarios visitantes (no registrados) en el simulador y resuelto el fallo 500 en la generación de preguntas de idiomas por IA en producción.

---

## 1. Experiencia del Usuario Visitante

### Cambios Realizados
- **Apertura de Configuración:** En [simulator-dash.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/simulator-dash.js), se eliminó la restricción que impedía a los visitantes abrir el modal de configuración de exámenes.
- **Aislamiento de Sesión Activa de Simulacros (`quiz.js`, `simulator-dash.js` y `sessionManager.js`)**:
  - **Problema**: El almacenamiento local de exámenes a medio terminar usaba una clave compartida estática (`simulator_active_session`). Si un usuario iniciaba un examen, cerraba sesión y otro ingresaba desde el mismo dispositivo/navegador, la sesión del primero se cargaba incorrectamente.
  - **Solución**: Modifiqué el almacenamiento para ser dinámico y específico del usuario, mapeándose como `simulator_active_session_${userId}`. Además, adapté `simulator-dash.js` para limpiar correctamente esta clave dinámica al cambiar la configuración.
  - **Soporte Asíncrono**: Refactoricé `sessionManager.js` para guardar la promesa de inicialización de sesión (`initPromise`) y evitar llamadas HTTP duplicadas a la API `/api/auth/me`. En `quiz.js` se colocó un `await window.sessionManager.initialize()` al inicio de `init()` para garantizar que la sesión está completamente cargada antes de recuperar los borradores.
- **Resiliencia ante Límites de Cuota / Rate Limits de la IA (`tutorAiService.js`)**:
  - **Problema**: El servicio de tutoría del examen fallaba con un error HTTP 500 (Internal Server Error) cuando la API de Vertex AI arrojaba un error `429 Too Many Requests (RESOURCE_EXHAUSTED)`.
  - **Solución**: Creé el método `_callModelResilient` dentro de `TutorAiService` que encapsula la llamada con un algoritmo de **backoff exponencial** (reintento automático aumentando progresivamente el tiempo de espera).
  - **Canal Dual/REST Fallback**: Si existe la variable de entorno `GEMINI_API_KEY`, el servicio usa la API REST directa de Google AI Studio (que cuenta con su propio pool de cuota separado). Si este canal falla o no está disponible, realiza un fallback automático e inteligente hacia Vertex AI.
- **Suite de Pruebas**: Aprobación de la suite Jest con el 100% de éxito en la validación (81/81 Passed). aplica un efecto visual *shake*.
- **Petición con Filtros:** En [quiz.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/quiz.js), la llamada al endpoint `/demo` ahora incluye los parámetros configurados: `target`, `career`, `difficulty`, y `areas`.
- **Mensaje de Invitación General:** En [uiManager.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/ui/uiManager.js), se actualizó la descripción del modal de registro para que muestre un mensaje general de invitación a probar todos los servicios y herramientas del sitio web.
- **Corrección de ReferenceError:** En [simulator-dash.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/simulator-dash.js), se declaró la variable `masteryEl` (haciendo referencia al elemento `stat-mastery`), solucionando un fallo `ReferenceError` crítico que interrumpía la inicialización de los gráficos y estadísticas de la demo.

### Backend (Controladores y Repositorios)
- **Controladores `/demo`:** En [docenteController.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/application/controllers/docenteController.js), [medicoController.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/application/controllers/medicoController.js) y [idiomasSimulatorController.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/application/controllers/idiomasSimulatorController.js), se modificó la acción `getDemoQuestions` para extraer los parámetros `target`, `career`, `difficulty`, `areas` de la petición y pasarlos al repositorio.
- **Repositorios:** En [docenteRepository.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/repositories/docenteRepository.js), [medicoRepository.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/repositories/medicoRepository.js) y [idiomasSimulatorRepository.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/repositories/idiomasSimulatorRepository.js), se actualizó el método `getRandomDemoQuestions` para armar dinámicamente las cláusulas SQL y filtrar las preguntas según la configuración seleccionada.

---

## 2. Solución al Fallo 500 en Producción en el Simulador de Idiomas

### Cambios Realizados
- **Target Matching Robustecido:** En [adminAiService.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/services/adminAiService.js) (líneas 521 y 606), agregamos `'IDIOMAS'` y `'LANGUAGES'` a la lista blanca de `LANGUAGE_TARGETS`. Esto previene que peticiones de IA con estos targets ingresen al pipeline RAG de Medicina (donde no existen temarios/archivos de idiomas en Pinecone, lo que causaba abortos de generación y lanzaba un error `500` al cliente).
- **Validación de Enunciados:** En [adminAiService.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/services/adminAiService.js) (línea 259), inyectamos una comprobación en el validador psicométrico (`_checkQuality`) que asegura que el enunciado de la pregunta (`question_text`) sea una cadena de texto no vacía.
- **Prevención de Excepciones de Tipo:** En [adminAiService.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/domain/services/adminAiService.js) (línea 800), agregamos una cláusula de protección condicional antes de llamar a `.includes()` sobre `question.question_text` para evitar fallos de tipo (`TypeError`) si la IA llegase a retornar un objeto con el enunciado nulo o vacío.

---

## 3. Soporte Multimodal para Preguntas con Imágenes Base64 (`tutorAiService.js`)

### Cambios Realizados
- **Extracción de Imágenes Base64 (Antes de la sanitización):** Modificamos el orden en `tutorAiService.js` para extraer las imágenes en base64 **antes** de que el texto pase por la sanitización y el límite de 2000 caracteres de `securityUtils.sanitizeInputForAI`. De este modo, evitamos que la cadena base64 se corte a la mitad, lo que anteriormente rompía la expresión regular y dejaba ruidos base64 en el prompt y borraba el resto del enunciado, alternativas e indicaciones del sistema, provocando que la IA respondiera alucinando sobre "Gamificación".
- **Optimización de Regex:** Reemplazamos el motor de la expresión regular por una versión lineal y robusta sin búsquedas hacia adelante (`/data:(image\/[a-z0-9-+.]+);base64,([^"'\s)>]+)/gi`) para garantizar inmunidad total a backtracking y máxima velocidad.
- **Flujo Multimodal Nativo:** Las imágenes extraídas se inyectan como partes de datos en línea (`inlineData`) en la llamada a Gemini, lo que permite al modelo de lenguaje multimodal "ver" y analizar las imágenes directamente para responder con precisión las preguntas del estudiante.
- **Acceso por Plan (Basic vs Advanced):** 
  - **Plan Basic:** Obtiene la explicación directa de la IA aprovechando la entrada multimodal de imágenes (sin búsqueda RAG).
  - **Plan Advanced:** Obtiene la explicación multimodal enriquecida adicionalmente con la recuperación RAG semántica de Pinecone.

---

## 4. Verificación de Resultados

### Pruebas Unitarias de Regresión
Se ha ejecutado la suite de testeo unitario localmente:
- **Resultado:** 11 suites pasadas, 81 pruebas unitarias exitosas en total (100% de éxito).
