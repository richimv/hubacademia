# 🤖 Specs Técnicas: Chat Tutor IA (V6.1 - 100% Vectorial)

## 1. Visión General
El Chat Tutor de Hub Academia es un motor conversacional multi-dominio diseñado para responder dudas especializadas en tiempo real, utilizando una arquitectura **RAG Semántica Pura**.

- **Motor Semántico (Pinecone):** Recuperación basada en significado profundo y vectores.
- **Aislamiento por Namespaces:** Separación total entre conocimiento médico y educativo.
- **Rigor Técnico:** Fundamentación en fuentes oficiales (MINSA/MINEDU).

## 2. Arquitectura de Modelos
El sistema utiliza **Gemini 2.5 Flash Lite** para la inferencia, optimizado para latencia mínima.

- **Orquestación:** `TutorAiService.js` gestiona el routing dinámico y la inyección de contexto.
- **Semantic Expansion:** Motor de re-escritura en `RagService.js` que expande la consulta del usuario en temas técnicos.
- **Embeddings:** Vertex AI `text-multilingual-embedding-002` (768 dimensiones).

## 3. Especializaciones del Tutor
El sistema adapta su "personalidad" y base de conocimientos según la especialidad:

### A. Tutor Clínico (`medicine`)
- **Namespace Pinecone:** `medicine`
- **Rol:** Tutor Senior de Medicina Peruana.
- **Multimedia:** Acceso proactivo a infografías, esquemas y mapas mentales médicos.
- **Fuentes:** NTS, GPC, Harrison, Nelson.

### B. Tutor Pedagógico (`education`)
- **Namespace Pinecone:** `education`
- **Rol:** Tutor Senior de Preparación Magisterial.
- **Multimedia:** Acceso proactivo a mapas mentales del CNEB y esquemas pedagógicos.
- **Fuentes:** CNEB, Ley 29944, RVM 094-2020, Pruebas de Ascenso.

### C. Tutor de Idiomas (`languages`)
- **Namespace:** N/A (sin RAG).
- **Rol:** Tutor conversacional de Inglés e Italiano.
- **Comportamiento:** Inmersión gradual, corrección amigable y **tablas gramaticales proactivas**.
- **Infraestructura de Conversación (CCI v3.2):**
  - **Aislamiento en `systemInstruction`:** Las directrices y reglas del tutor se inyectan a través del parámetro nativo `systemInstruction` de Gemini, previniendo la degradación de instrucciones a lo largo del historial.
  - **Historial Estructurado (`contents`):** El historial de turnos se pasa utilizando la estructura nativa de Gemini (`contents` array), mapeando los roles correspondientes (`user` -> `user`, `assistant` -> `model`) para evitar mezclas e interferencias.
  - **Límites de Corrección:** El tutor inspecciona errores *exclusivamente* en la última interacción del usuario, evitando listar o arrastrar errores ya corregidos en turnos previos del historial.
  - **Inmersión del Idioma:** La propiedad `response` se redacta al 100% en el idioma objetivo, eliminando mezclas accidentales con el español, a menos que el usuario formule una duda teórica explícitamente en español.


## 4. Capacidades Multimedia e Inteligencia Visual
El sistema gestiona una arquitectura de apoyo visual proactivo y especializado:

- **Catálogo Visual Dinámico:** Integración con Postgres para buscar recursos tipo `other` (infografías, esquemas) en tiempo real.
- **Proactividad Visual:** La IA decide autónomamente cuándo insertar una imagen del catálogo. No requiere que el usuario la pida explícitamente si el tema es complejo.
- **Límite de Recursos:** Hasta **3 imágenes por respuesta** si la complejidad del tema lo amerita (exclusivo para Medicina y Educación).
- **Tablas Proactivas:** Capacidad universal (todos los dominios) para generar tablas comparativas y cuadros sinópticos en Markdown para estructurar información técnica.
- **Renderizado Premium:** Procesador DOM en `markdown-renderer.js` que envuelve tablas en wrappers responsivos y resuelve URLs de GCS mediante el proxy `/api/media/gcs`.

### D. Asistente Neutro (`neutral`)
- **Namespace:** N/A (sin RAG).
- **Rol:** Asistente inteligente versátil para consultas generales.

### E. Tutor de Flashcards (`flashcard_tutor`)
- **Namespace:** N/A (sin RAG, modo efímero).
- **Rol:** Tutor contextual que expande el conocimiento de la flashcard activa.
- **Comportamiento:** Recibe `front`, `back` y `topic` como contexto inyectado.

## 4. Flujo de Procesamiento RAG
1. **Routing:** El controlador detecta la especialidad enviada desde la UI.
2. **Retrieval:** `RagService` consulta Pinecone usando el namespace correspondiente.
3. **Augmentation:** Se inyecta el contexto recuperado en el prompt de `chatPrompts.js`.
4. **Generation:** Gemini genera una respuesta estructurada en JSON con Markdown.

## 5. Estructura de Respuesta (JSON Nativo)
Todas las respuestas del tutor siguen este esquema para ser renderizadas por el frontend:
```json
{
  "intencion": "consulta_especializada",
  "respuesta": "Texto en Markdown pedagógico...",
  "sugerencias": ["Pregunta 1", "Pregunta 2", "Pregunta 3"]
}
```
- `responseMimeType: "application/json"` fuerza a Gemini a devolver JSON válido.
- Parsing en `TutorAiService.js` con fallback de limpieza de bloques ```` ```json ````

## 6. Evolución Técnica: De FTS a Pinecone Puro
El sistema ha migrado de una búsqueda basada en palabras clave (FTS) a una arquitectura **100% basada en Contexto Semántico**. Esto garantiza que el tutor entienda sinónimos, pedagogía y relaciones clínicas complejas sin depender de una base de datos local.

---

## 7. Pipeline de Renderizado de Texto (V3 — Unificado)

### 7.1 Problema Original
El texto de la IA se mostraba con formato inconsistente, JSON crudo visible, `\n` literales, y espaciado excesivo entre párrafos y viñetas.

### 7.2 Causa Raíz
Dos sistemas conflictivos preservaban el whitespace simultáneamente:
- `white-space: pre-wrap` en `.message` (CSS) → preservaba cada `\n` como espacio visual.
- `marked.js` con `breaks: true` → convertía cada `\n` en `<br>`.
- **Resultado:** cada salto de línea se renderizaba **dos veces**.
- Además, `marked.js` no estaba cargado en la mayoría de páginas (solo `flashcards.html` y `quiz.html`).

### 7.3 Arquitectura Actual

```
Gemini API → JSON { respuesta: "Markdown..." }
    ↓
TutorAiService.js → Parsea JSON, extrae "respuesta"
    ↓
ChatController.js → enrichResponse() → res.json({ respuesta, sugerencias })
    ↓
Frontend (chat.js / tutor-chat.js)
    ↓
formatMessage(text)
    ├─ JSON Safety Net: detecta JSON crudo → extrae "respuesta"
    └─ MarkdownRenderer.render(text)
         ├─ JSON Safety Net (centralizado)
         ├─ marked.js parse (breaks: true, gfm: true)
         ├─ wrapTables() → responsividad horizontal
         ├─ resolveImageUrl() → resolución de paths de GCS vía proxy
         └─ referrerpolicy="no-referrer" → bypass contra bloqueo de hotlinking externo
    ↓
<div class="message-body markdown-content">HTML renderizado</div>
    ↓
markdown-content.css → Tipografía premium unificada
```

### 7.4 Archivos Clave

| Archivo | Rol |
|---------|-----|
| `css/markdown-content.css` | **CSS único** para todo contenido Markdown de la IA |
| `js/utils/markdown-renderer.js` | Motor de parsing centralizado (marked.js + fallback regex) |
| `js/chat.js` → `formatMessage()` | Renderiza mensajes del chat general |
| `js/tutor-chat.js` → `addMessage()` | Renderiza mensajes del tutor de flashcards |

| `js/ui/libraryUI.js` | Renderiza notas guardadas en el visor |

### 7.5 JSON Safety Net
Si por algún motivo el texto contiene un JSON crudo (fallo de parsing backend, mensajes históricos corruptos):
```javascript
if (typeof text === 'string' && text.trimStart().startsWith('{')) {
    try {
        const parsed = JSON.parse(text);
        if (parsed && parsed.respuesta) text = parsed.respuesta;
    } catch(e) {}
}
```
Implementado en: `markdown-renderer.js`, `chat.js`, y `tutor-chat.js`.

### 7.6 Dependencias CDN (marked.js)
`marked.min.js` **DEBE** cargarse ANTES de `markdown-renderer.js` en cada HTML:
- ✅ `index.html`
- ✅ `resource.html`
- ✅ `course.html`
- ✅ `flashcards.html`
- ✅ `repaso.html`
- ✅ `simulator-dashboard.html`
- ✅ `quiz.html`

### 7.7 Configuración de marked.js
```javascript
marked.setOptions({
    gfm: true,        // GitHub Flavored Markdown (tablas, strikethrough)
    breaks: true,      // \n → <br> (seguro porque pre-wrap fue removido)
    headerIds: false,  // Sin IDs auto-generados en headings
    mangle: false      // Sin ofuscación de emails
});
```

---

## 8. Diseño CSS Unificado (`markdown-content.css`)

### 8.1 Clases CSS
| Clase | Uso |
|-------|-----|
| `.markdown-content` | Contenedor base para texto IA (paragraphs, lists, code, tables) |
| `.markdown-compact` | Modificador para paneles pequeños (Audio, Tutor Flashcard) |

### 8.2 Paleta de Colores
| Elemento | Color | Token |
|----------|-------|-------|
| Headings H1, H2 | `#93c5fd` | Blue 300 |
| Headings H3 | `#a5b4fc` | Indigo 300 |
| Bold/Strong | `#60a5fa` | Blue 400 (accent keywords) |
| List markers | `#60a5fa` | Blue 400 |
| Blockquote border | `#6366f1` | Indigo 500 |
| Code blocks bg | `#020617` | Slate 950 |
| Inline code bg | `rgba(0,0,0,0.35)` | — |

### 8.3 Spacing
- **Párrafos:** `margin-bottom: 0.6em`
- **Listas:** `margin: 0.4em 0 0.7em`, items `margin-bottom: 0.25em`
- **Headings:** `margin-top: 1.1em`, `margin-bottom: 0.4em`
- **Code blocks:** `margin: 0.75em 0`
- **Compact variant:** Reduce ~15% todos los espaciados

### 8.4 Ancho de Mensajes
- **Bot messages:** `max-width: 95%` — Aprovecha casi todo el ancho del chat.
- **User messages:** `max-width: 85%` — Distinción visual del remitente.

---

## 9. Interfaces del Chat

### 9.1 Chat General (Widget flotante)
- **Archivo:** `js/chat.js`
- **Persistencia:** Conversaciones guardadas en PostgreSQL vía `ChatService`.
- **Historial:** Carga completa al cambiar de conversación.
- **Sugerencias:** Pastillas clickeables generadas por la IA o fallback predefinido.

### 9.2 Asistente de Voz (Audio Assistant) [ELIMINADO - JULIO 2026]
- **Estado**: Eliminado en su totalidad tanto del frontend como del backend por motivos de reducción de costos y reestructuración de límites.
- **Acción**: Los archivos `audio-assistant.js` y `audio-assistant.css` han sido removidos y sus cuotas asociadas eliminadas de la base de datos.

### 9.3 Tutor de Flashcards
- **Archivo:** `js/tutor-chat.js`
- **Modo:** Efímero con historial de sesión en cliente.
- **Contexto:** Inyecta `front`, `back`, `topic` de la tarjeta activa.
- **Estilo:** `.markdown-compact` para panel lateral compacto.

---

## 10. Prompts del Sistema (`chatPrompts.js`)

### 10.1 Directrices de Formato (Globales)
Inyectadas a TODOS los prompts vía `buildPrompt()`:
1. Markdown rico: `**negrita**` para conceptos clave.
2. Viñetas `- o *` para clasificaciones.
3. Doble salto de línea entre párrafos.
4. `## o ###` para subtítulos en explicaciones extensas.
5. **Tablas Proactivas:** La IA decide crear tablas para fundamentar y dar claridad profesional.
6. **NUNCA** envolver la respuesta en bloques de código.

### 10.2 Rol de Curador Visual (Medicina/Edu)
1. **Selección:** Elegir hasta 3 imágenes del catálogo si son altamente relevantes.
2. **Integración:** Sintaxis `![Descripción](URL)` integrada naturalmente en el flujo.
3. **No alucinar:** Si el catálogo no aplica, ignorarlo sin mencionarlo.

### 10.3 Reglas de Citación
- **Fuentes oficiales (MINSA, MINEDU):** Citar explícitamente (NTS, GPC, RVM).
- **Literatura comercial (Harrison, CTO):** Camuflar como "literatura médica estándar".

### 10.3 Sugerencias Activas
- 3 preguntas cortas (máx 45 caracteres) en el array `sugerencias`.
- Escritas en primera persona del usuario: "Quiero saber más", "Dame un ejemplo".
- **NUNCA** incluirlas dentro del texto de la `respuesta`.

---

## 11. Archivo Deprecado
- **`chat.html`**: Página standalone legacy que usa Bootstrap 5. **NO se usa** en la aplicación actual. El chat vive como widget flotante inyectado por `chat.js` en todas las páginas. Solo existe una ruta legacy en `vercel.json`. Candidato a eliminación.

---

## 12. Interfaz del Selector de Modos (Model Selector UI)
Para maximizar el espacio útil de lectura en el widget de chat y profesionalizar la interfaz visual, se rediseñó el selector de especialidades:
- **Selector de Cabecera (`#chatbot-persona-trigger`)**: Reemplaza el contenedor de pestañas por una cápsula interactiva dentro del encabezado que muestra el modo activo ("Neutro", "Médico" o "Educación") como subtítulo dinámico y un chevron de rotación.
- **Menú Desplegable Flotante (`#chatbot-persona-dropdown`)**: Un popover glassmorphic con desenfoque de fondo al 94%, sombras pronunciadas y acentos de color contextuales según la especialidad seleccionada (Azul para General, Cian para Médico, Verde para Educación).
- **Controlador de Cierre Automático**: Cierra el selector al cambiar de modo o si el usuario hace clic fuera de la cabecera o el panel desplegable.

---

## 13. Burbuja de Invitación Animada (Chat Tooltip UX)
Para guiar al usuario e invitarlo a interactuar con el Tutor IA de manera amigable, se implementó una burbuja de diálogo interactiva, diferida y optimizada para rendimiento extremo (60 FPS):
- **Inyección HTML (`#chat-invitation-bubble`)**: El widget flotante inyecta el contenedor de la burbuja como elemento hermano directo (fuera de `#chatbot-toggle`). Esto elimina el acoplamiento de renderizado, evitando que la burbuja sufra las transformaciones de escala y rotación aplicadas al botón durante el hover.
- **Despliegue Diferido (3 segundos)**: Al cargar cualquier página que instancie `ChatComponent`, se activa un temporizador de 3 segundos antes de mostrar la burbuja de invitación.
- **Persistencia de Descarte (Local Storage)**: Si el usuario pulsa la "X" de cierre de la burbuja, se detiene la propagación para evitar abrir el chat, se oculta la burbuja de inmediato y se guarda en `localStorage` la clave `chat_invitation_dismissed: 'true'`, previniendo futuras activaciones de la invitación para no perturbar su experiencia de estudio.
- **Acceso Rápido Integrado**: Si el usuario pulsa en cualquier otra parte de la burbuja, se inicia automáticamente el flujo de apertura del chat y se remueve la clase activa de la burbuja.
- **Aceleración por Hardware y Fluidez a 60 FPS (`chat.css`)**:
  - Posicionamiento `position: fixed` fijo en pantalla con override responsivo para móviles (`bottom: 95px; right: 24px` en escritorio, `bottom: 86px; right: 20px` en móvil) para evitar recálculos de flujo (reflow).
  - Uso de las directivas `will-change: transform, opacity;` y `transform-style: preserve-3d;` con `backface-visibility: hidden;` para forzar la composición en capas independientes de la GPU.
  - La animación `@keyframes bubble-float` mantiene explícitamente la escala constante (`scale(1)`) en sus keyframes, evitando colisiones con el estado inicial de escalado en la transición de entrada.

---

## 14. Tutor de Simulador de Examen (Quiz Tutor)
- **Archivos:** [quiz-tutor.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/quiz-tutor.js) (cliente), [quiz.html](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/quiz.html) y [quiz.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/quiz.js).
- **Modo:** Efímero con envío de historial de sesión por cliente (`history`) y desactivación de la persistencia relacional en BD.
- **Acceso:** Se habilita únicamente una vez que el usuario ha respondido la pregunta activa (es decir, tras hacer clic en una opción y mostrarse el botón Siguiente en modos de 10 o 20 preguntas). En el examen Simulacro Real (100 preguntas), se bloquea el tutor interactivo durante la ejecución para evitar trampas, habilitándose en su lugar de forma proactiva al final en cada una de las tarjetas de la pantalla de corrección/revisión.
- **Contexto RAG de Alta Fidelidad:**
  - El frontend captura los metadatos de la pregunta en curso (enunciado, opciones de respuesta, opción correcta, opción elegida por el usuario, resultado de acierto/error, explicación oficial, tema técnico y examen objetivo) y los transmite estructuradamente en el campo `context` del request con el tipo `quiz_tutor`.
  - El backend (`chatController.js`) detecta este contexto e inyecta dinámicamente un prompt estructurado al modelo Gemini 2.5 Flash Lite.
  - Se activa el RAG semántico consultando Pinecone en el namespace respectivo (`medicine` o `education`) utilizando la pregunta y los temas técnicos de la misma para alimentar las respuestas con bases de datos y normas oficiales de alta especialización.
- **Monetización y Límites:**
  - Se han erradicado los vacíos legales del bypass `isEphemeral`. Las consultas del tutor de flashcards y de simulador se controlan y debitan estrictamente:
    - **Usuarios Free/Pending:** Consume exactamente 1 vida del pool global de 20 vidas. Las consultas se realizan estrictamente sin RAG (modo estándar) para minimizar costos de API.
    - **Usuarios Active (Basic/Advanced):** Se incrementa el contador de uso diario respectivo (`daily_ai_usage` o `daily_rag_usage`), bloqueando el acceso en el middleware si superan la cuota asignada.

---
*Última actualización: 9 de julio de 2026 (Depreciación y remoción del Asistente de Voz / Audio Assistant)*

