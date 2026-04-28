# 🤖 Specs Técnicas: Chat Tutor IA (V6 - Pinecone & Gemini Flash Lite)

## 1. Visión General del Chat Médico
El Chat Tutor Clínico de Hub Academia es el módulo interactivo conversacional diseñado para responder dudas médicas en tiempo real, explicar conceptos complejos y sugerir recursos de la biblioteca.

A diferencia del módulo de generación masiva (Simulador), el Chat utiliza una arquitectura **RAG Híbrido Avanzado**:
- **Motor Semántico (Pinecone):** Recuperación basada en el significado clínico y vectores de alta dimensionalidad.
- **Memoria Contextual:** Gestión de historial persistente en PostgreSQL.
- **Rigor Médico:** Fundamentación estricta en la jerarquía de fuentes peruanas (NTS, GPC, Harrison).

## 2. Arquitectura de Modelos
El chat utiliza **Gemini 2.5 Flash Lite** para la inferencia, garantizando latencia mínima y precisión científica.

- **Orquestación:** Gestionada exclusivamente por `TutorAiService.js`.
- **Configuración:**
  ```javascript
  // Configuración en TutorAiService.js
  this.model = this.vertex_ai.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.8,
          topP: 0.9
      }
  });
  ```

## 3. Flujo de Generación (Arquitectura V6)

Cuando un usuario envía un mensaje (`POST /api/chat/message`), se dispara el siguiente flujo:

### Fase I: Persistencia y Orquestación
1. `ChatController` recibe el mensaje y lo delega a `ChatService`.
2. `ChatService` recupera el historial de PostgreSQL y llama al especialista: `TutorAiService.handleChat`.

### Fase II: RAG Semántico (Pinecone)
Esta es la gran mejora de la V6. El sistema llama a `RagService.searchContextSmart` con el modo **`SEMANTIC`**:
1. **Embedding:** El texto del usuario se convierte en un vector usando Vertex AI Embeddings.
2. **Vector Search:** Se consulta a la base de datos **Pinecone** (Index: `hub-academia-index`).
3. **Filtros Clínicos:** Se recuperan los 8 fragmentos más relevantes basados en la "distancia del coseno" (significado médico).

### Fase III: Inyección de Contexto y Respuesta
1. `TutorAiService` recibe el historial + los fragmentos de Pinecone.
2. Se inyecta el prompt especializado de `chatPrompts.js`.
3. El modelo genera una respuesta pedagógica, citando fuentes oficiales y sugiriendo lecturas.

## 4. Límites de Uso y Acceso
- **Acceso RAG:** Usuarios `basic`, `advanced` y `admin` tienen acceso al RAG Semántico. Los usuarios *Free* usan conocimiento general.
- **Cuotas:** 20 mensajes/día (Básico), 30 mensajes/día (Avanzado).

---

## 5. Arquitectura de Especialidades (Especialista IA)
| Especialidad | Servicio | Motor RAG | Almacenamiento |
| :--- | :--- | :--- | :--- |
| **Médico** | `TutorAiService` | **Pinecone (Semantic)** | PostgreSQL |
| **Generación Admin** | `AdminAiService` | **Postgres (FTS)** | Banco de Preguntas |
| **Generación User** | `UserAiService` | **Modo Fast (Lite)** | Banco de Preguntas |

## 6. Evolución Técnica: De FTS a Pinecone
El sistema migró de una búsqueda basada en palabras clave (FTS) a una búsqueda basada en **contexto clínico (Pinecone)**. Esto permite que el chat entienda sinónimos médicos y relaciones patológicas complejas que el FTS tradicional pasaba por alto.

## 7. Modalidades de Chat (Ecosistema Unificado)
El sistema ahora opera bajo un ecosistema de interfaces especializadas que comparten el mismo cerebro (Gemini + Pinecone) pero optimizan la experiencia según el contexto del usuario:

### 7.1. Chat General (Navegador Académico)
- **Frontend:** `chat.js`.
- **Alcance:** Resolución de dudas clínicas extensas, búsqueda en biblioteca y navegación.
- **Key Features:** Historial persistente en PostgreSQL, botones de navegación interna dinámica (`[career:id]`, `[course:id]`) y sugerencias de seguimiento inteligentes.

### 7.2. Flashcard Tutor (Asistente de Estudio)
- **Frontend:** `tutor-chat.js`.
- **Contexto:** Se activa exclusivamente dentro de las sesiones de repaso de flashcards.
- **Especialización:** Diseñado para explicar el "por qué" de una tarjeta. Utiliza un panel lateral (Sidebar) responsivo que permite al alumno consultar dudas sin interrumpir el flujo de estudio.

### 7.3. Asistente de Audio (Hands-Free Assistant)
- **Frontend:** `audio-assistant.js`.
- **Propósito:** Aprendizaje auditivo interactivo para situaciones de movilidad.
- **Tecnología:** Integración nativa con Web Speech API para reconocimiento y síntesis de voz (TTS).
- **Modo Reproductor:** Interfaz dual que incluye una ventana completa para lectura y un **Modo Minimizado** (tipo Spotify) que permite mantener la conversación activa mientras se navega por otras secciones de la plataforma.

## 8. Motor de Renderizado Universal (`MarkdownRenderer`)
Se ha centralizado la lógica de visualización en `markdown-renderer.js` para eliminar inconsistencias entre módulos:
- **Jerarquía de Listas:** Soporte nativo para 3 niveles de anidación con viñetas geométricas de alta definición (L1: Disco azul, L2: Círculo hueco, L3: Cuadrado).
- **Estética Premium:** Aplicación de degradados Indigo-Púrpura en textos destacados (`**bold**`) compartida en todo el sitio.
- **Optimización Móvil:** Ajuste de espaciados y alineación óptica de precisión en listas para máxima legibilidad en pantallas pequeñas.

---

**Documentación Actualizada y Auditada - 28 de Abril, 2026.**
