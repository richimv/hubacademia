# 🤖 Specs Técnicas: Chat Tutor IA (V6.1 - 100% Vectorial)

## 1. Visión General
El Chat Tutor de Hub Academia es un motor conversacional multi-dominio diseñado para responder dudas especializadas en tiempo real, utilizando una arquitectura **RAG Semántica Pura**.

- **Motor Semántico (Pinecone):** Recuperación basada en significado profundo y vectores.
- **Aislamiento por Namespaces:** Separación total entre conocimiento médico y educativo.
- **Rigor Técnico:** Fundamentación en fuentes oficiales (MINSA/MINEDU).

## 2. Arquitectura de Modelos
El sistema utiliza **Gemini 2.5 Flash Lite** para la inferencia, optimizado para latencia mínima.

- **Orquestación:** `TutorAiService.js` gestiona el routing dinámico.
- **Embeddings:** Vertex AI `text-multilingual-embedding-002` (768 dimensiones).

## 3. Especializaciones del Tutor
El sistema adapta su "personalidad" y base de conocimientos según la especialidad:

### A. Tutor Clínico (`medicine`)
- **Namespace Pinecone:** `medicine`
- **Rol:** Tutor Senior de Medicina Peruana.
- **Fuentes:** NTS, GPC, Harrison, Nelson.

### B. Tutor Pedagógico (`education`)
- **Namespace Pinecone:** `education`
- **Rol:** Tutor Senior de Preparación Magisterial.
- **Fuentes:** CNEB, Ley 29944, RVM 094-2020, Pruebas de Ascenso.

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

## 6. Evolución Técnica: De FTS a Pinecone Puro
El sistema ha migrado de una búsqueda basada en palabras clave (FTS) a una arquitectura **100% basada en Contexto Semántico**. Esto garantiza que el tutor entienda sinónimos, pedagogía y relaciones clínicas complejas sin depender de una base de datos local.
