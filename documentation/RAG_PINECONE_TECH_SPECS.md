# 🌲 Specs Técnicas: RAG con Pinecone (V6.5 - Inmersive)

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
| **`general`** | Cultura General, Ayuda del Hub. | Modo Neutro. |

### Normalización Automática de Namespaces (`normalizeNamespace`)
Para evitar errores de enrutamiento por diferencias de capitalización, acentos o términos afines transmitidos por el cliente, `RagService.normalizeNamespace(rawNamespace)` normaliza de forma segura:
- Términos como `'medicina'`, `'salud'`, `'med'`, `'clinica'`, `'serums'` $\rightarrow$ `'medicine'`.
- Términos como `'educacion'`, `'educación'`, `'docente'`, `'cneb'`, `'ascenso'` $\rightarrow$ `'education'`.
- Cualquier otro valor o ausencia de parámetro $\rightarrow$ `'general'`.

## 🧠 Flujo de Recuperación (Retrieval V6.5)
0. **Semantic Query Expansion (Rewriter)**: Gemini expande la consulta en **3-5 temas técnicos**.
1. **Persistent Topic Cache**: Si el usuario hace seguimiento, se reutilizan los temas del turno anterior.
2. **Top-K Search y Filtrado por Relevancia**: Se recuperan los fragmentos de mayor afinidad semántica, aplicando un umbral estricto de similitud de coseno (`score >= 0.35`) y deduplicación por texto normalizado para eliminar redundancias.
3. **Estructura Enriquecida de Fuentes**: `RagService._formatResults` retorna un objeto con el texto de contexto consolidado y la lista estructurada de fuentes únicas:
   ```javascript
   sources: [
     {
       fuente: "Harrison Principios de Medicina Interna",
       title: "Harrison Principios de Medicina Interna",
       pagina: 1420,
       page: 1420,
       source: "Harrison Principios de Medicina Interna.pdf",
       score: 0.82
     }
   ]
   ```
4. **Citación Obligatoria de Página (Page-Level Traceability)**: El prompt de la IA exige citar explícitamente el nombre del recurso y el número de página (`(Pág. X)` o `[Recurso, Pág. X]`) de donde se extrae cada dato técnico, respaldando visualmente cada afirmación con su fuente documental oficial.
5. **Multimedia Sync**: Sincronización con el Catálogo Visual y apertura en el **Visor Inmersivo Universal**.

## 📥 Ingesta de Datos (Ingestion)
Gestionada por el script `scripts/ingest_rag.py`:
- **Smart Chunking**: Fragmentos de ~1500 caracteres con solapamiento de 300 caracteres.
- **OCR Híbrido**: Uso de Tesseract para páginas escaneadas o imágenes con texto, evaluado **página por página** de forma dinámica (máxima velocidad).
- **Enriquecimiento de Metadatos**: Se guarda `source`, `title`, `page` y `category` en cada vector (esencial para el enrutamiento del `RAG-Filter` y la citación con número de página en el Quiz Tutor).

### 📐 Límites y Especificaciones Recomendadas de PDFs

Para evitar agotamiento de memoria RAM local (OCR), timeouts de red o superar el límite de peticiones por minuto (RPM) de la API de Google Vertex AI, se establecen las siguientes directrices de ingesta por archivo:

| Métrica | Límite Máximo Soportado | "Sweet Spot" Recomendado |
| :--- | :--- | :--- |
| **Número de Páginas** | 600 - 800 páginas | **300 a 500 páginas** |
| **Peso del Archivo** | 150 MB | **30 MB a 70 MB** |
| **Tiempo de Procesamiento** | Variable según OCR | **~2 a 4 minutos por archivo** |

### 💡 Estrategia de Fraccionamiento (Splitting) para Textos Masivos
Para libros de gran volumen (como Harrison, Farreras o manuales CTO completos que superan las 1,000 páginas):
1. **División Obligatoria**: Partir el documento original en tomos o partes descriptivas (ej. de 400 páginas cada uno).
2. **Nombres Descriptivos con Espacios**: Nombrarlos usando espacios naturales y palabras clave de la especialidad (ej. `Harrison Parte 1 Cardiologia.pdf`, `Harrison Parte 2 Infectologia.pdf`).
3. **Resiliencia ante Fallos**: Esto evita el "todo o nada"; si el proceso falla por pérdida de red temporal en la página 3,200, solo se re-ingesta el tomo afectado en lugar de perder horas de procesamiento completo.


## 🛡️ Mecanismo de Seguridad y Fallback de Citaciones
Si Pinecone no devuelve resultados con una similitud suficiente, el sistema utilizará el conocimiento experto pre-entrenado de Gemini, pero siempre bajo el marco de la especialidad seleccionada, informando al usuario que no se encontró un fragmento específico en la biblioteca oficial. Si Gemini no devuelve citas en su respuesta JSON a pesar de haber recibido contexto RAG, `TutorAiService` extrae automáticamente las fuentes y páginas recuperadas de Pinecone para garantizar que el estudiante siempre disponga de las píldoras de citación en la UI.

## 🔒 Control de Acceso por Nivel de Suscripción (Multi-Tier RAG)
- **Plan Advanced / Admin:** Acceso completo a RAG vectorial semántico en Pinecone en los namespaces `medicine` y `education`, con una cuota diaria de hasta 25 consultas RAG (y exención para administradores). Las citas con número de página oficial son extraídas y validadas contra los fragmentos reales.
- **Planes Free y Basic:** RAG desactivado (`useRag: false`). El sistema no realiza llamadas a Pinecone. Se conmuta automáticamente al `[MODO GENERAL EXPERTO - SIN RAG VECTORIAL]` que prohíbe de forma terminante citar páginas inventadas en el texto y exige un array de citas vacío (`"citas": []`). La capa de aplicación y presentación garantizan que nunca se rendericen píldoras RAG para estos usuarios.

---

## ⚠️ Regla de Oro: Consistencia Absoluta de Embeddings

> [!IMPORTANT]
> **Compatibilidad Matemática Estricta**: Toda consulta y almacenamiento en el índice de Pinecone **debe** utilizar el mismo modelo de embeddings: **Google Vertex AI `text-multilingual-embedding-002` (768 dimensiones)**.

### El Peligro del Mismatch (Lección Aprendida)
- Si se importan vectores generados por otros modelos (ej. OpenAI `text-embedding-ada-002`, versiones anteriores de Cohere, o modelos de Vertex AI diferentes), la base de datos vectorial reportará que los registros existen en el Dashboard (ej. `Records: 44,711`), pero **serán completamente invisibles** al buscador semántico.
- La similitud del coseno entre vectores de diferentes modelos cae por debajo de `0.15` (ruido matemático puro), causando fallas silenciosas donde la IA nunca recupera el contexto real de los libros y responde únicamente con conocimiento general.

### Política de Mantenimiento y Migración
1. **Cero Mezclas**: Nunca mezclar vectores de distintas migraciones u orígenes sin verificar el modelo exacto.
2. **Re-indexación Limpia**: Si se decide cambiar el modelo de embeddings en el futuro, es obligatorio:
   - Vaciar por completo los namespaces afectados en Pinecone (`deleteAll: true`).
   - Volver a correr el pipeline de ingesta (`python scripts/ingest_rag.py`) directamente desde los PDFs originales locales para regenerar los vectores y metadatos con el nuevo modelo de forma limpia e íntegra.

