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

### D. Asistente Guía Hub Academia (`neutral`)
- **Namespace:** N/A (100% sin RAG en Pinecone para máximo rendimiento y cero costos vectoriales).
- **Rol:** Anfitrión y Asistente Guía de Navegación y Soporte de Hub Academia.
- **Enfoque Académico Oficial:** Exclusivo para **SERUMS** (Medicina) y **ASCENSO** (Educación Magisterial).
- **Persistencia en BD:** 100% Volátil / Efímero. No realiza escrituras en base de datos. Las tablas `conversations`, `chat_messages` y `feedback` han sido completamente eliminadas/purgadas de PostgreSQL/Supabase.
- **Soporte para Visitantes (No Autenticados):**
  - Acceso libre de hasta **2 consultas gratuitas por día** (gestionado en `localStorage` mediante `visitor_general_chat_daily_v1`).
  - Píldoras de preguntas rápidas predefinidas: *"¿Qué ofrece esta plataforma?"*, *"¿Qué simuladores tienen disponibles?"*, *"¿Cuáles son los planes y precios?"*, *"¿Cómo me ayuda a nombrarme/colegiarme?"*.
  - Al 3er intento de consulta, bloquea el campo de texto con el mensaje `"Límite de consultas alcanzado. Regístrate gratis para continuar."` y abre la modal de inicio de sesión/registro (`showAuthPromptModal`).

### E. Tutor de Flashcards y Repaso (`flashcard_tutor`)
- **Namespace:** `medicine` / `education` (según contexto activo).
- **Rol:** Tutor contextual RAG que profundiza la tarjeta flashcard activa.
- **Comportamiento:** Recibe `front`, `back` y `topic` como contexto inyectado.
- **Interacción y Pantalla Completa:** Soporta visualización en modo compacto o pantalla completa en escritorio (PC) mediante `.tutor-chat-panel.chat-fullscreen`.

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
- **Archivos:** [quiz-tutor.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/quiz-tutor.js) (cliente), [quiz.html](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/quiz.html), [quiz.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/quiz.js) y [components.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/ui/components.js).
- **Modo:** Efímero con envío de historial de sesión por cliente (`history`) y cero escrituras relacionales en BD.
- **Flujo de Acceso e Interfaz de Examen**:
  - **Durante el Examen (Modos 10q y 20q)**: Se habilita únicamente una vez que el usuario ha respondido la pregunta activa (tras hacer clic en una opción y desplegarse el botón Siguiente).
  - **En Simulacros Reales (100 preguntas)**: Se deshabilita durante la ejecución para preservar las condiciones de evaluación oficial.
  - **En Culminación y Revisión de Examen (`showExamReview`)**: El botón de Tutor IA se **remueve/oculta por completo** de las tarjetas de corrección de preguntas y de la interfaz final. Cada pregunta en la fase de revisión ya exhibe su explicación técnica y sustento oficial directamente, evitando redundancia.
- **Modo Pantalla Completa en Escritorio (PC)**:
  - Integra la clase `.tutor-chat-panel.chat-fullscreen` accionada por el botón `#quiz-tutor-expand`, permitiendo expandir la ventana a `100vw x 100vh` en PC para la lectura cómoda de tablas comparativas y esquemas técnicos.
- **Contexto RAG de Alta Fidelidad:**
  - El cliente captura los metadatos de la pregunta en curso (enunciado, opciones de respuesta, opción correcta, opción elegida por el usuario, resultado de acierto/error, explicación oficial, tema técnico y examen objetivo) y los transmite en el campo `context` con tipo `quiz_tutor`.
  - El backend (`chatController.js`) detecta este contexto e inyecta dinámicamente el prompt al modelo Gemini 2.5 Flash Lite.
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
- **Archivos:** [quiz-tutor.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/quiz-tutor.js) (cliente), [quiz.html](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/quiz.html), [quiz.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/quiz.js) y [components.js](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/js/ui/components.js).
- **Modo:** Efímero con envío de historial de sesión por cliente (`history`) y cero escrituras relacionales en BD.
- **Flujo de Acceso e Interfaz de Examen**:
  - **Durante el Examen (Modos 10q y 20q)**: Se habilita únicamente una vez que el usuario ha respondido la pregunta activa (tras hacer clic en una opción y desplegarse el botón Siguiente).
  - **En Simulacros Reales (100 preguntas)**: Se deshabilita durante la ejecución para preservar las condiciones de evaluación oficial.
  - **En Culminación y Revisión de Examen (`showExamReview`)**: El botón de Tutor IA se **remueve/oculta por completo** de las tarjetas de corrección de preguntas y de la interfaz final. Cada pregunta en la fase de revisión ya exhibe su explicación técnica y sustento oficial directamente, evitando redundancia.
- **Modo Pantalla Completa en Escritorio (PC)**:
  - Integra la clase `.tutor-chat-panel.chat-fullscreen` accionada por el botón `#quiz-tutor-expand`, permitiendo expandir la ventana a `100vw x 100vh` en PC para la lectura cómoda de tablas comparativas y esquemas técnicos.
- **Contexto RAG de Alta Fidelidad:**
  - El cliente captura los metadatos de la pregunta en curso (enunciado, opciones de respuesta, opción correcta, opción elegida por el usuario, resultado de acierto/error, explicación oficial, tema técnico y examen objetivo) y los transmite en el campo `context` con tipo `quiz_tutor`.
  - El backend (`chatController.js`) detecta este contexto e inyecta dinámicamente el prompt al modelo Gemini 2.5 Flash Lite.
  - Activa RAG semántico consultando Pinecone en el namespace correspondiente (`medicine` o `education`) basándose en la pregunta y temas técnicos.
- **Monetización y Límites:**
  - **Usuarios Free/Pending:** Consumen 1 vida global (`usage_count`) por consulta.
  - **Usuarios Active (Basic/Advanced):** Incrementan la cuota diaria (`daily_ai_usage` / `daily_rag_usage`), bloqueando el acceso en el middleware de cuota si se excede el límite asignado.

---

## 15. Iconografía y Branding de Hubi (`hubi.png` & `hubifrente.png`)
Para consolidar una identidad visual unificada, moderna y profesional del Asistente Guía e IA de Hub Academia:
- **`hubi.png` (Avatar Flotante Global)**:
  - Implementado como la imagen distintiva del botón flotante global `#chatbot-toggle` en `chat.js` y `chat.css`.
  - Dimensionado a `44px x 44px` con sombra suave y micro-interacción de rotación/escalado al hacer hover.
- **`hubifrente.png` (Vista Frontal del Asistente)**:
  - **Encabezado del Chat General (`chat.js`)**: Renderizado en el elemento `<img id="chatbot-icon" src="/assets/hubifrente.png">` (`32px x 32px`).
  - **Burbuja de Invitación (`#chat-invitation-bubble`)**: Incorpora el avatar mini de Hubi de frente (`30px x 30px`) acompañando la llamada a la acción.
  - **Tutor de Quiz / Simuladores (`quiz-tutor.js`, `quiz.html`)**: Encabezado del panel lateral y botón "Consultar Tutor IA".
  - **Tutor de Repaso / Flashcards (`tutor-chat.js`, `flashcards.js`)**: Encabezado del panel lateral y botón "Dudas con esta respuesta".
  - **Landing Page Mockup (`index.html`)**: Avatar del Asistente en la ventana conversacional de demostración.
- **Restablecimiento y Estabilidad de la Burbuja Tooltip en PC & Móvil**:
  - Se removieron las directivas de renderizado 3D (`transform-style: preserve-3d` y `backface-visibility: hidden`) en `chat.css` que generaban desacoplamiento de capas en aceleración por hardware de Chrome/Edge en PC.
  - El `z-index` de `.chat-invitation-bubble` se elevó a `10050` para garantizar que la invitación flote visiblemente por encima de cualquier otro componente tanto en escritorio como en dispositivos móviles.

---

## 16. Asistente Guía: Base de Conocimientos 100% Estática de Alta Velocidad (Agosto 2026)

Para optimizar costos de cómputo, reducir las llamadas a la API de Gemini a 0 en el widget flotante general y ofrecer tiempos de respuesta instantáneos (0ms), se reestructuró la arquitectura del **Asistente Guía (Chat General)**:

### 16.1 Módulo `asistenteGuiaKnowledge.js`
Servicio en la capa de dominio (`src/domain/services/asistenteGuiaKnowledge.js`) que centraliza la información oficial de la plataforma:
- **Especialidades Oficiales**: Información centrada exclusivamente en **SERUMS (Salud/Medicina)** y **ASCENSO (Educación Magisterial)**.
- **Categorías de Respuestas Precisas**:
  - `servicios`: Detalla simuladores de SERUMS y ASCENSO, Módulo Repaso (Flashcards) y Mi Biblioteca con enlaces Markdown directos (`[🎯 Ver Simuladores](/simulators)`, `[🎴 Ir a Módulo Repaso](/repaso)`, `[📚 Ir a Mi Biblioteca](/library)`).
  - `precios`: Estructura transparente de Planes Free (20 vidas), Basic y Advanced (`[💎 Ver Tabla de Planes y Precios](/pricing)`).
  - `acceso`: Explicación exacta del acceso en 1 clic mediante Google (botón **"Acceder"** de la barra superior o **"Continuar con Google"**, sin formularios de registro) (`[🔑 Acceder con Google](#acceder)`).
  - `ventajas`: Explicación del sustento técnico oficial (NTS MINSA / CNEB y RVM 094-2020-MINEDU).

### 16.2 Flujo 100% Estático y Efímero para Todos los Usuarios (Basic, Advanced, Free, Visitantes)
1. **0 Llamadas a Gemini**: Toda interacción en el Chat General es despachada instantáneamente (0ms) en memoria de cliente/servidor sin invocar modelos generativos.
2. **4 Píldoras Principales Siempre Visibles**: Se removió la opción redundante de "finalizar conversación". El usuario siempre cuenta con 4 opciones limpias para navegar por la información clave de la plataforma.
3. **Manejador de Acceso Directo con Google**: Al hacer clic en un enlace `[Acceder con Google](#acceder)`, la interfaz abre directamente el modal/diálogo de autenticación con Google (`window.triggerGoogleLogin()`).

---

## 17. Corrección de Resiliencia IA y Persistencia de Exámenes (Agosto 2026)

### 17.1 Fallback Multimodelo en `TutorAiService` y Solución `resourceContext`
- **Resiliencia de Modelos**: Se implementó una cadena de contingencia multimodelo (`['gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-1.5-flash']`) en `_callModelResilient`. En caso de respuesta `400/404` por inconsistencia en el endpoint, se conmuta de forma transparente al siguiente modelo de la cadena sin interrumpir al usuario.
- **Corrección en `ChatController.processMessage`**: Se declaró `resourceContext = null` en la desestructuración de `req.body`, eliminando la excepción `ReferenceError` que ocasionaba respuestas HTTP 500 en Quiz Tutor y Flashcards.

### 17.2 Ciclo de Vida y Limpieza de Sesiones de Examen (`quiz.js`)
- **Fusión de Atributos de Conteo (`totalQuestions` & `total_questions`)**: Los repositorios `docenteRepository` y `medicoRepository` resuelven el conteo de preguntas de forma resiliente (`totalQ = quizData.totalQuestions || quizData.total_questions`), garantizando que tanto exámenes finalizados de corrido como retomados registren sus resultados en `quiz_history` y se reflejen en los KPIs.
- **Purga de Sesiones de Examen en `clearSession()`**: La función realiza un barrido de todas las claves con prefijo `simulator_active_session_*` en `localStorage`, impidiendo la reaparición del modal "Continuar examen anterior" tras culminar un examen.
- **Reanudación de Exámenes Interrumpidos**: Al reanudar una sesión en progreso, `initApp()` posiciona automáticamente la interfaz en la primera pregunta sin responder (`firstUnanswered`), permitiendo al usuario continuar fluidamente.

---

## 18. Optimización del Asistente Guía: Opciones Numeradas, Disparo Directo de Modal Google y Desbloqueo Permanente (Agosto 2026)

### 18.1 Delegación de Eventos e Intercepción de Botones de Opción
- **Recepción Instantánea de Clics**: Se expandió el selector de eventos en `chat.js` a `e.target.closest('a, button, li, .chat-option-btn, .suggestion-btn')`. Cliquear cualquiera de las 4 opciones dentro del cuerpo del mensaje del bot dispara automáticamente la consulta al chat sin bloqueos ni retrasos.
- **Instrucción Clara de Registro**: Se removió el botón flotante redundante de `"Registrarme con Google"` en la respuesta del Asistente Guía y en la delegación de eventos del chat. En su lugar, el bot orienta claramente al usuario a pulsar el botón oficial **"Acceder"** de la barra superior para iniciar sesión o registrarse con Google en 1 clic.

### 18.2 Navegación por Números (1, 2, 3, 4) y Formato de Lista Limpia sin Botones Redundantes
- **Lista de Texto Numerada**: Las 4 opciones iniciales se despliegan como una lista de texto en negrita sin sintaxis de hipervínculo (`1. **🚀 Servicios y Simuladores**`, `2. **💳 Planes y Precios**`, etc.), evitando confusiones visuales y eliminando la redundancia de botones dentro del mensaje inicial.
- **Coincidencia Exacta por Entrada de Texto**: `AsistenteGuiaKnowledge.matchIntent` valida de forma limpia entradas simples como `"1"`, `"2"`, `"3"`, `"4"` o `"1."`.
- **Manejo de Entrada No Válida**: Si el usuario envía un número fuera del rango o un texto irrelevante, el bot responde indicando amablemente que ingrese una opción válida (1 al 4) o seleccione las sugerencias de la barra inferior.

### 18.3 Detalle Explicativo de Módulo Repaso y Mi Biblioteca (con Noticias Oficiales)
- **Módulo Repaso (Flashcards Inteligentes)**: Se incorporó la explicación detallada sobre la memorización activa basada en el algoritmo SM-2 (*Olvidé*, *Difícil*, *Bien*, *Fácil*), la generación automatizada de mazos con IA a partir de simulacros y la asistencia del Tutor IA Contextual en cada tarjeta.
- **Mi Biblioteca (Centro de Recursos, Apuntes y Noticias)**: Se especificó la gestión unificada de notas personales y la integración de **Noticias Oficiales y Novedades Normativas** actualizadas del **MINSA (Salud)** y **MINEDU (Educación)**.

### 18.4 Alcance Exclusivo y Formato Singular de Enlaces
- **Exclusividad en Salud (SERUMS)**: Se eliminó cualquier mención de ENAM o Residentado del módulo de respuestas del Asistente Guía, alineándolo al 100% con los dos pilares oficiales actuales (**SERUMS** y **ASCENSO**).
- **Enlaces en Singular**: Todos los hipervínculos hacia simuladores adoptan la estructura en singular: `[🩺 Ver simulador de SERUMS](/simulator-dashboard?context=MEDICINA)` y `[🎓 Ver simulador de ASCENSO](/simulator-dashboard?context=EDUCACION)`.

### 18.5 Desbloqueo Definitivo de la Barra de Búsqueda del Chat General
- **Remoción del Candado para Visitantes**: Se desactivó la restricción que bloqueaba el textarea con el mensaje `"⚠️ Regístrate gratis para continuar."`. La función `setVisitorLockState` mantiene la barra de texto activa y accesible en todo momento con el placeholder `"Pregunta sobre la plataforma..."`.

---
*Última actualización: 3 de agosto de 2026 (Opciones en formato de lista limpia, especificación detallada de Repaso y Mi Biblioteca con Noticias Oficiales, y activación directa de modal Google)*




