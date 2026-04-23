# 🤖 Specs Técnicas: Chat Tutor IA (RAG & Flash Lite)

## 1. Visión General del Chat Médico
El Chat Tutor Clínico de Hub Academia es el módulo interactivo conversacional diseñado para responder dudas médicas en tiempo real, explicar conceptos complejos y sugerir recursos de la biblioteca.

A diferencia del módulo de generación masiva (Simulador), el Chat mantiene memoria contextual de la conversación (historial) y utiliza una arquitectura **RAG Local (Retrieval-Augmented Generation)** fundamentada en las directrices MINSA (SERUMS/ENAM) para evitar alucinaciones, garantizando que cada consejo clínico esté sustentado.

## 2. Arquitectura de Modelos (Costo Cero)
Por mandato de la fase de rentabilidad, el modelo núcleo para todas las inferencias del chat es **Gemini 2.5 Flash Lite** (`gemini-2.5-flash-lite`).

- **Velocidad y Costo:** Este modelo reduce la latencia de respuesta en un 60% frente a versiones "Pro" y disminuye el costo de API por token casi a cero.
- **Parametrización en Chat:**
  ```javascript
  const modelCreativeLite = vertex_ai.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
          maxOutputTokens: 65535,
          temperature: 0.7, // Menos creativo que en trivias, más riguroso en clínica
          topP: 0.95
      }
  });
  ```

## 3. Flujo de Generación (El Ciclo de Vida de un Mensaje)

Cuando un usuario envía un mensaje (`POST /api/chat/message`), se dispara el siguiente flujo gestionado por `ChatController.js` y `mlService.js`:

### Fase I: Persistencia y Recuperación de Memoria
1. Si no existe un `conversationId`, `ChatService` genera una nueva sala y la nombra con los primeros 50 caracteres del mensaje.
2. El mensaje del usuario se guarda en PostgreSQL.
3. El Backend recupera la matriz de historial de la base de datos (últimos ~10 mensajes) para inyectarlo como `history` a la API de Gemini, dándole memoria secuencial a corto plazo.

### Fase II: Pre-flight Check (Límites de Negocio)
El controlador valida si el usuario tiene **Acceso al Motor RAG (Biblioteca Médica)**.
- *Actualización Reciente:* Ahora, tanto los usuarios `advanced`, como los **`basic`**, y `admin` tienen acceso al "Tutor Clínico (RAG)". Los usuarios *Free* degradan automáticamente a memoria general (sin RAG).
- El límite es de 20 mensajes al día (Plan Básico) y 30 mensajes al día (Plan Avanzado).

### Fase III: Búsqueda Inteligente (Agentic Rewriter)
Esta es la fase de oro del Chat. El sistema no hace una simple búsqueda en la base de datos con el texto del usuario ("*hola doc, me duele el estómago, ¿qué GPC leo?*"). 
Se utiliza el micro-servicio `_extractSmartTerms` en `ragService.js`:
1. El LLM Flash Lite analiza la intención y extrae **términos clínicos puros** (ej: `["dolor abdominal", "epigastralgia", "gpc gastroenterología"]`).
2. Estos términos limpios se envían a PostgreSQL usando vectores de búsqueda de texto completo (`tsvector` y `tsquery`).
3. La BD retorna los fragmentos exactos de los libros (Harrison, NTS, Guías Prácticas).

### Fase IV: Inyección de Contexto y Respuesta
1. El modelo Flash Lite recibe el Historial de la Conversación + El mensaje actual + Los fragmentos documentales (RAG).
2. El Prompt interno obliga a la IA a presentarse con un tono empático pero **rigurosamente médico**, citando las fuentes si se le han inyectado.
3. Devuelve la `respuesta`, un puntaje de `confianza` y un arreglo de `sugerencias` de seguimiento (ej: "Ver libros relacionados").

### Fase V: Finalización y Analytics
1. La respuesta del bot se guarda en la base de datos (Historial).
2. Se descuenta una cuota de uso al usuario (`UPDATE users SET chat_standard = chat_standard + 1...`).
3. Se devuelve al frontend el `conversationId`, `messageId` (para posible feedback futuro) y la respuesta formateada.

## 4. Evolución: Expansión de Tutor Clínico a Usuarios Básicos
En la iteración más reciente del sistema, se rompió la barrera que limitaba el RAG solo a usuarios de pago alto (`advanced`). 
**Motivación:** El costo de computar la búsqueda FTS local en PostgreSQL + la tokenización de Gemini Flash Lite es tan marginal que resulta rentable ofrecer respuestas fundamentadas clínicamente (RAG) desde la suscripción básica de *S/ 9.90*, añadiendo inmenso valor a este plan y fomentando conversiones tempranas.

---

## 5. Trazabilidad y Logs (Monitoreo en Tiempo Real)
El sistema ha sido diseñado para ser transparente en su ejecución. A través de la terminal del servidor, se puede auditar cada paso del proceso:
- **Detección de Intención:** Los logs muestran la clasificación detectada (ej: `pregunta_medica_especifica`).
- **Agentic Rewriter:** Se visualizan los términos clínicos extraídos por la IA (ej: `Rewriter IA: Extraídos 10 términos → [hipotermia, terapéutica, ...]`).
- **Verificación RAG:** Confirmación de si los fragmentos fueron inyectados exitosamente (`RAG Local Status: ACTIVO`).
- **Límites de Uso:** Seguimiento automático de los contadores diarios por usuario.

## 6. Generación de Flashcards Adaptativa
El motor de Repaso ahora soporta una generación de hasta **20 tarjetas por pedido**, optimizada para temas densos. El sistema valida este límite tanto en el prompt maestro de la IA como en la lógica de control del backend, asegurando que el estudiante obtenga un set completo de estudio sin degradar la precisión clínica.

---

**Documentación Finalizada y Auditada - 22 de Abril, 2026.**
