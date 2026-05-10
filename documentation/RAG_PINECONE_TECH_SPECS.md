# 🌲 Specs Técnicas: RAG con Pinecone (V6)

## 🛠️ Stack Tecnológico
- **Base de Datos Vectorial**: Pinecone (Serverless).
- **Índice**: `hub-academia-index`.
- **Métrica de Similitud**: Coseno.
- **Modelo de Embeddings**: Google Vertex AI `text-multilingual-embedding-002`.
- **Dimensiones**: 768.

## 🏛️ Organización por Namespaces
Para garantizar precisión y evitar alucinaciones cruzadas, los datos se aíslan en compartimentos estancos:

| Namespace | Contenido | Uso Principal |
| :--- | :--- | :--- |
| **`medicine`** | Harrison, NTS MINSA, GPC, ENAM, SERUMS. | Tutor Clínico / Chat Médico. |
| **`education`** | CNEB, Ley Reforma Magisterial, Pruebas de Ascenso, Temarios MINEDU. | Tutor Pedagógico / Chat Docente. |
| **`languages`** | Gramática, Diccionarios, Modismos. | Modo Idiomas (Próximamente). |
| **`general`** | Cultura General, Ayuda del Hub. | Modo Neutro. |

## 🧠 Flujo de Recuperación (Retrieval)
1. **Embedding**: El mensaje del usuario se convierte en un vector de 768 dimensiones.
2. **Namespace Routing**: Se selecciona el namespace basado en la especialidad del chat (`medicine` o `education`).
3. **Top-K Search**: Se recuperan los 8 fragmentos más cercanos semánticamente.
4. **Metadata Filtering**: El sistema puede filtrar por `target` (ej. solo Nombramiento) si el metadato existe en el vector.

## 📥 Ingesta de Datos (Ingestion)
Gestionada por el script `scripts/ingest_rag.py`:
- **Smart Chunking**: Fragmentos de ~1500 caracteres con solapamiento.
- **OCR Híbrido**: Uso de Tesseract para páginas escaneadas o imágenes con texto.
- **Enriquecimiento de Metadatos**: Se guarda `source`, `title`, `page` y `category` en cada vector.

## 🛡️ Mecanismo de Seguridad
Si Pinecone no devuelve resultados con una similitud suficiente, el sistema utilizará el conocimiento experto pre-entrenado de Gemini, pero siempre bajo el marco de la especialidad seleccionada, informando al usuario que no se encontró un fragmento específico en la biblioteca oficial.
