# Especificaciones Técnicas: RAG Semántico con Pinecone (V6)

## 📋 Descripción General
El sistema ha evolucionado de una búsqueda de texto tradicional (FTS) a una **Búsqueda Semántica Vectorial** de alta precisión. La V6 utiliza Pinecone como motor principal para el Chat Tutor, permitiendo una comprensión profunda de la intención clínica del estudiante.

## 🛠️ Stack Tecnológico
- **Base de Datos Vectorial**: Pinecone (Serverless - Index: `hub-academia-index`).
- **Modelo de Embeddings**: Google Vertex AI `text-multilingual-embedding-002` (768 dimensiones).
- **Consumidor Principal**: `TutorAiService.js` (Modo Chat).
- **Respaldo (Fallback)**: PostgreSQL Full Text Search (FTS).

## 🏛️ Organización por Namespaces (Aislamiento Total)
Para maximizar la precisión y reducir la latencia, los vectores se dividen en compartimentos estancos:

| Namespace | Contenido | Uso Principal |
| :--- | :--- | :--- |
| **`medicine`** | Harrison, NTS MINSA, GPC, ENAM. | Tutor Clínico / Chat Médico. |
| **`languages`** | Gramática, Diccionarios, Modismos. | Modo Idiomas. |
| **`education`** | Currículo Nacional, Normas MINEDU. | Modo Educación. |
| **`general`** | Cultura General, Ayuda del Hub. | Modo Neutro. |

## 🧠 Arquitectura de Búsqueda Híbrida
1. **Fase de Vectorización**: El mensaje del usuario se convierte en un vector de 768 dimensiones.
2. **Consulta a Pinecone**: Se realiza una búsqueda de "similitud de coseno" en el namespace correspondiente.
3. **Inyección de Prompts**: Los fragmentos se bindean con el catálogo de `chatPrompts.js`.
4. **Mecanismo de Respaldo**: Si Pinecone no devuelve resultados, se intenta FTS en Postgres (si la tabla `documents` existe).

## 📂 Estructura de Metadata en Pinecone
Cada vector incluye un objeto enriquecido para permitir **Filtros de Precisión (Gratuitos)**:
- `content`: El texto original.
- `source`: Nombre del libro o Norma (ej: "Harrison").
- `category`: Área clínica (ej: "Cardiología").
- `chunk_index`: Orden secuencial.

## 💰 Política de Eficiencia y Estimación de Costos
El sistema está diseñado para ser rentable y escalable:

1. **Uso Selectivo**: Solo el **Chat Tutor** (basado en suscripción) utiliza Pinecone.
2. **Generación Local**: Los simulacros diarios NO consumen Pinecone; usan el banco local o generación directa.
3. **Estimación de Gasto**:
   - **Pinecone**: ~$2.00 por cada 1,000,000 de lecturas.
   - **Embeddings**: ~$0.10 por cada 1,000,000 de caracteres procesados.
   - *Proyección*: Un uso intenso de 1,000 usuarios activos se estima en < $10 USD/mes.

## 🚀 Beneficios V6
- **Entendimiento Multilingüe**: Mejor manejo de términos médicos técnicos.
- **Latencia Ultra-Baja**: Respuestas en menos de 1 segundo.
- **Precisión Clínica**: Eliminación de alucinaciones mediante contexto oficial.

---
**Documentación Actualizada - 27 de Abril, 2026.**
