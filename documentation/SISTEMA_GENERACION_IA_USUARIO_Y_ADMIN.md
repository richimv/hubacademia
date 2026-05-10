# 🏗️ Sistema de Generación IA y RAG (Arquitectura V6.1)

Este documento detalla la infraestructura distribuida de inteligencia en Hub Academia, diseñada para maximizar el rigor técnico (Médico/Pedagógico) mediante una arquitectura de **RAG Semántico Puro**.

---

## 0. Mapa de Servicios de Inteligencia (Roles IA)

El sistema descentraliza la lógica para optimizar costos y precisión:

*   **👑 `AdminAiService.js` (High-Fidelity):** Generación de banco oficial. Utiliza **RAG Semántico (Pinecone)** para "leer" exámenes pasados y normativas (CNEB/GPC), garantizando que las preguntas tengan un sustento real y mimetismo de estilo profesional.
*   **⚡ `UserAiService.js` (On-Demand):** Generación automática cuando el stock del banco es insuficiente para un simulacro. Prioriza la velocidad y variabilidad de casos, inyectando directrices de dificultad dinámica.
*   **🎓 `TutorAiService.js` (Conversacional):** Cerebro del Chat. Realiza routing dinámico entre namespaces (`medicine` / `education`) para responder consultas con base bibliográfica.
*   **📈 `mlService.js`:** Motor analítico que conecta con modelos predictivos para calcular la tendencia de aprendizaje del usuario.

---

## 1. El Ciclo de Vida de una Pregunta (Flujo de Stock)

A diferencia de otros sistemas, aquí la generación es **proactiva**:

1.  **Vigilancia de Stock:** El `TrainingService` monitorea las áreas solicitadas por el usuario.
2.  **Detección de Vacío:** Si faltan preguntas para un tema específico (ej: "Comprensión Lectora - Nombramiento"), se dispara una orden de creación.
3.  **Inyección de Contexto (RAG):** El servicio de IA solicita al `RagService` fragmentos de exámenes reales para usarlos como plantillas (Few-Shot).
4.  **Validación y Guardado:** La IA entrega el JSON, se limpian metadatos y se inserta en `question_bank` para futuros usuarios.

---

## 2. Configuración de Modelos
- **Inferencia:** Gemini 2.5 Flash Lite (Balance óptimo entre razonamiento y latencia).
- **Embeddings:** `text-multilingual-embedding-002` (768 dimensiones).
- **Vector DB:** Pinecone (Namespaces: `medicine`, `education`).
