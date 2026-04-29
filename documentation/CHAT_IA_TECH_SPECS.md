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

## 9. Funcionalidades de Interacción y Escalabilidad
Para mejorar la productividad del estudiante, se han implementado utilidades de respuesta consistentes:

### 9.1. Utilidades de Respuesta (Productividad)
- **Botón de Copiado**: Implementado en el Chat General y Tutor de Flashcards. Utiliza la `Clipboard API` para permitir el copiado rápido de explicaciones íntegras al portapapeles con feedback visual instantáneo.
- **Guardado de Notas**: Integración directa con el servicio de biblioteca para convertir respuestas de IA en notas persistentes.

### 9.2. Roadmap de Escalabilidad (Arquitectura Preparada)
El sistema está diseñado para escalar hacia un modelo de "Asistente Multimodal" sin rediseñar el núcleo:
- **Tablas de Datos**: El `MarkdownRenderer` está preparado para detectar sintaxis de tablas y renderizar componentes `<table>` premium (ideal para comparativas farmacológicas o cuadros sinópticos).
- **Soporte Multimedia (GCS)**: El motor de renderizado se expandirá para procesar URLs de Google Cloud Storage. Esto permitirá que la IA incluya imágenes, diagramas clínicos y esquemas visuales directamente en el chat.
- **Componentes Interactivos**: La arquitectura permite inyectar micro-componentes (ej. calculadoras de dosis, cronómetros de estudio) dentro de los contenedores de mensaje del bot.

### 9.3. Procesamiento de Imágenes Médicas (Visión Artificial)
Basado en el análisis de viabilidad técnica para producción:
- **OCR de Bajo Costo**: Implementación híbrida de **OpenCV** (pre-procesamiento) + **Tesseract OCR** (extracción) para lectura de informes y etiquetas en imágenes sin costos por API.
- **Análisis Avanzado (GCS/Vision AI)**: Integración con **Google Cloud Vision AI** para casos de alta complejidad, como interpretación de hallazgos en radiografías o segmentación anatómica.
- **Fase de Despliegue**: Se priorizará el pre-procesamiento en el backend para garantizar privacidad y optimizar la precisión de los modelos de Deep Learning.

---

**Documentación Actualizada y Auditada - 28 de Abril, 2026.**
