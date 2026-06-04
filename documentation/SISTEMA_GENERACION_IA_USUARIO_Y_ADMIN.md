# Sniper-RAG: Motor de Generación Pedagógica de Grado Industrial

Este documento describe el motor de inteligencia artificial diseñado para la creación de bancos de preguntas de alta fidelidad, asegurando validez psicométrica, variedad temática y rigor académico.

---

## 🚀 El Pipeline de Generación Robótica (5 Fases)

A diferencia de los generadores convencionales, nuestro sistema opera como una línea de ensamblaje industrial donde cada fase tiene una responsabilidad única y excluyente.

### 🔍 Fase 1: El Lector de Menú (Anti-Repetición Absoluta)
El sistema elimina la improvisación de la IA. 
1.  **Extracción de Prospecto**: Se recupera el temario oficial completo desde el RAG.
2.  **Shuffle (Barajado)**: Se aplica un algoritmo Fisher-Yates para evitar el sesgo de los primeros temas del PDF.
3.  **Selección Inédita**: La IA cruza el temario con el historial de preguntas ya generadas y elige **un solo subtema específico** que no haya sido cubierto recientemente.

### 📚 Fase 2: El Investigador (RAG de Doble Precisión)
Con el tema elegido, se disparan dos búsquedas quirúrgicas totalmente distintas para alimentar el cerebro de la IA:

*   **RAG de Teoría (El "Qué")**: Busca el sustento técnico (leyes, normas, teorías) basado en el subtema elegido (ej: "Desarrollo del lenguaje"). Su fin es que la IA sea experta en el contenido y pueda fundamentar la explicación.
*   **RAG de Identidad (El "Cómo")**: Olvida el tema y se centra en la estructura. Usa el Sniper de Identidad dinámico según el dominio:
    *   **Educación**: `"Prueba [TARGET] EBR [NIVEL] [ESPECIALIDAD] Año [AÑO] Pregunta [NUM_ALEATORIO]"` (Rango 1-60).
    *   **Medicina**: `"[TARGET] [CARRERA] Item [NUM_ALEATORIO]."` (Rango 1-100, técnica de búsqueda por punto).
    *   *Anti-Colapso de Varianza*: Al inyectar un número de ítem aleatorio, obligamos al motor vectorial (Pinecone) a escanear fragmentos distintos del PDF. Esto garantiza que la IA reciba moldes estructurales completamente variados (diálogos, tablas, situaciones clínicas complejas) y no repita siempre el mismo patrón.

> **Sniper de Temas (Fase 1)**: Para leer el prospecto correctamente, el sistema usa: 
> - **Educación**: `"Temario EBR Nivel [NIVEL] [ESPECIALIDAD]"` (Namespace: `education`)
> - **Medicina**: `"Temario SERUMS [CARRERA]"` (Namespace: `medicine`).

### 🧠 Fase 2.5: Memoria de Tanda (Anti-Repetición 2.0)
A diferencia de los sistemas tradicionales, nuestro motor mantiene una memoria dinámica de **Subtemas** durante el proceso de generación:
1.  **Tracking de Temas**: Cada vez que se elige un subtema (ej. "Sistema de Referencia"), se marca con la etiqueta `TEMA: [Nombre]`.
2.  **Exclusión en Tiempo Real**: El prompt de Fase 1 prohíbe explícitamente elegir cualquier tema que ya esté en la memoria de la tanda actual, garantizando que un lote de 5 preguntas toque 5 puntos distintos del temario oficial.

### 🏗️ Fase 3: El Diseñador Creativo (Dinamismo Visual)
La IA actúa como un arquitecto pedagógico construyendo el "Casuístico".
*   **Apertura Dinámica (Anti-Monotonía)**: El sistema prohíbe explícitamente iniciar los casos con la fórmula repetitiva *"La docente de [Nivel], [Nombre]..."*, forzando aperturas in media res (ej: diálogos directos de alumnos, situaciones de recreo).
*   **Markdown Nativo e Integridad**: Se fuerza el uso de tablas comparativas (mínimo 2 filas) y diálogos pedagógicos si detecta monotonía.
*   **Escapado JSON Crítico**: Para evitar errores de parseo (`Unterminated string`) al generar tablas o diálogos, la IA está forzada a usar `\n` en lugar de presionar 'Enter' real.

### ⚖️ Fase 4: El Cirujano Psicométrico (Simetría Calibrada)
Una vez que la IA entrega la pregunta, nuestro código JavaScript toma el mando para auditar la calidad pedagógica.
*   **Auditoría de Caracteres**: Se cuenta letra por letra la extensión de cada opción.
*   **Umbral Pedagógico (40 caracteres)**: Si la opción correcta se desvía más de **40 caracteres** del promedio de los distractores, el sistema detecta asimetría. (Este umbral fue calibrado desde 10 para permitir argumentaciones pedagógicas naturales sin bucles infinitos).
*   **Filtro de Letras**: Se usa un Regex avanzado para detectar y eliminar si la explicación menciona "Opción A" o "Alternativa B", asegurando que el barajado de respuestas no confunda al usuario.
*   **Bucle de Refinamiento**: El sistema devuelve la pregunta a la IA hasta 3 veces para corregir simetría o fugas de letras.

### 🚫 Fase 5: El Bloqueo de Calidad (Ingeniería Inflexible)
El último filtro antes de la base de datos.
*   **Cláusula de Rechazo**: Si tras los 3 intentos la IA no logra la simetría perfecta o persiste en mencionar letras (A, B, C) en la explicación, **la pregunta es destruida**.
*   **Reinicio de Ciclo**: El sistema prefiere el fallo y reiniciar desde la Fase 1 antes que permitir una pregunta de baja calidad.
*   **Sanitización Final**: Se fuerza el número de opciones según el dominio (3 para Educación, 5 para Residentado Médico) y se barajan las alternativas.

---

## ⚡ Arquitectura Unificada de Generación RAG (Usuario y Admin)

Con el fin de evitar desviaciones estilísticas y asegurar que todas las preguntas generadas en Hub Academia cuenten con el mismo rigor pedagógico y variedad casuística, se ha unificado el pipeline de generación para que tanto el flujo en lote (Admin) como la generación en vivo (Usuario) ejecuten las **5 Fases Completas de RAG**:

1. **Fase 1 (El Scout - Temario Dinámico)**: Selecciona un subtema inédito cruzándolo con el historial.
2. **Fase 2 (El Investigador - RAG Dual)**: Realiza búsquedas quirúrgicas en Pinecone para inyectar Teoría (el qué) y moldes reales de examen de Identidad/Estilo (el cómo) tanto para usuario como admin.
3. **Fase 3 (El Diseñador Creativo)**: Emplea el prompt unificado de RAG (`generationPrompts.js` / `getUnifiedPrompt`) con restricciones psicométricas y visuales estrictas.
4. **Fase 4 & 5 (El Auditor de Calidad)**: Realiza la auditoría en bucle cerrado de hasta 3 intentos de refinamiento por la IA, validando asimetría, duplicados, ausencia de consignas y el filtro de letras en la explicación.

### ⚡ Optimización de Rendimiento mediante Paralelización por Bloques (Chunking)
Para maximizar la velocidad de generación y evitar latencias altas (esperas de más de 30 segundos), el sistema implementa la paralelización por bloques de hasta 5 elementos (`chunkSize = 5`):
* **Llamadas Concurrentes**: Las preguntas dentro de cada bloque se resuelven de forma simultánea empleando `Promise.all` para los flujos asíncronos y consultas RAG.
* **Mitigación de Colisiones Temáticas (Variación Paralela)**: Para evitar que las tareas concurrentes elijan los mismos subtemas, se inyecta en el prompt de selección académica (`selectionPrompt`) una directriz basada en el índice paralelo (`parallelIndex`):
  * `"Fuerza la variación eligiendo un subtema del fragmento número (index % 5) + 1 de la lista de fragmentos..."`. Esto induce a los hilos de ejecución a apuntar a diferentes secciones del temario oficial.
* **Auditoría Cruzada Post-Generación**: Al resolverse el bloque de promesas concurrentes, cada pregunta exitosa se audita de forma secuencial y ordenada en memoria contra las ya aceptadas. Si alguna colisiona estilísticamente o es un duplicado, se descarta inmediatamente.
* **Bucle de Relleno Secuencial**: Si existen descartes o fallos en el bloque paralelo, el sistema activa un fallback secuencial estricto para generar y rellenar las preguntas faltantes de la cuota.

### 🛡️ Auditoría Antirrepetición Estilística de Escenario
Para mitigar el colapso de variedad y evitar que la IA use siempre las mismas aperturas o diálogos repetitivos (ej. "- ¡Mira mi torre de bloques!", "¡Mira mi dibujo!"), el validador realiza una doble barrera antirrepetición en la Fase 4:
* **Coincidencia Exacta de Prefijo**: Rechaza enunciados cuyas primeras 4 palabras coincidan exactamente con alguna pregunta del historial.
* **Similitud Jaccard de Apertura**: Calcula la intersección de palabras en el prefijo inicial (primeras 10 palabras). Si la similitud Jaccard es mayor a `0.40`, se levanta una alerta de calidad, forzando a la IA a reescribir por completo la formulación inicial.

---

## 🧠 Reglas de Oro Técnicas

1.  **Explicación Descriptiva**: Está prohibido mencionar letras (A, B, C) en la explicación para evitar confusiones tras el barajado de opciones.
2.  **Variedad de Apertura**: El sistema bloquea el uso repetitivo de frases como "En el aula de..." o "Un docente desea...", forzando inicios in media res o descripciones situacionales.
3.  **Dificultad Senior**: El tono y la complejidad deben imitar fielmente los exámenes de ascenso de escala magisterial.

---

## 🌐 Integración del Dominio de Idiomas (Languages)

El sistema ha sido extendido para dar soporte completo a la generación de preguntas para el aprendizaje de lenguas extranjeras, unificando los criterios bajo las cuatro capas arquitectónicas:

### 1. Modelo de Datos y Validación
* **Dominio Canónico**: Se registra en la base de datos como `'languages'`. El repositorio (`adminRepository.js`) valida y autoriza este dominio en la lista blanca de `canonicalDomain`.
* **Dificultad Adaptable (MCER/CEFR)**: En lugar de forzar `'Senior'`, se autorizan y guardan los niveles estándar del Marco Común Europeo de Referencia para las lenguas (`'A1'`, `'A2'`, `'B1'`, `'B2'`, `'C1'`, `'C2'`) en la columna `difficulty` gracias a la actualización de `canonicalDifficulty`.
* **Variantes de Dialecto**: El dialecto o variante regional se mapea en la columna `career` (ej. `'en-US'` para inglés estadounidense, `'en-GB'` para inglés británico, `'it-IT'` para italiano).

### 2. Flujo Específico de Calidad y Generación
Al detectar un target de idiomas (ej. `MCER`, `TOEFL`, `IELTS`), el servicio de IA (`adminAiService.js`) conmuta al pipeline de idiomas:
* **Idioma del Contenido**: El enunciado (`question_text`), las opciones y los scripts de audio se generan al 100% en el idioma objetivo. La explicación didáctica se escribe en **español** para facilitar el autoaprendizaje del alumno.
* **Placeholder Obligatorio**: Para las áreas de *Grammar & Use of English* y *Vocabulary & Context*, se valida y exige la inyección de exactamente un espacio en blanco (`_____`) en el enunciado de la pregunta.
* **Soporte de Audio**: En la habilidad *Listening Comprehension*, se crea un script pedagógico (máx. 100 palabras) almacenado en la columna `audio_text` para su posterior síntesis por el motor TTS.
* **Auditoría Psicométrica de Idiomas**: Comprueba asimetrías de longitud entre la alternativa correcta y los distractores (máximo 15 caracteres de desviación respecto a la media de distractores) y el formato JSON. Sanea referencias a letras (`A`, `B`, `C`, `D`) de manera determinista al final del flujo.



-------------------------------------------------------------


# 🧪 Casos de Uso: Selección, Optimización y Distribución IA (V6)

Este docapartado describe el motor de inteligencia de Hub Academia para la gestión de stocks de preguntas. El sistema opera bajo un principio de **Eficiencia de Costos y Balance Estadístico**, priorizando el banco local antes de recurrir a la IA para la reposición de emergencia.

---

Antes de activar la IA, el sistema intenta completar el lote de 5 preguntas usando el contenido existente en la base de datos para **todas** las áreas seleccionadas por el usuario en su configuración de examen.

### ⚙️ Mapeo de Configuración del Simulador
Para que el motor de búsqueda (RAG y Local) funcione, el sistema mapea la UI a los campos de la base de datos de la siguiente forma:

#### 🩺 Módulo Medicina (Simulacro)
*   **Examen Objetivo (`target`)**: Mapea a `ENAM`, `SERUMS` o `RESIDENTADO`.
*   **Carrera Profesional (`career`)**: Mapea a la profesión específica (ej: `Medicina Humana`, `Enfermería`).
*   **Áreas de Estudio (`areas`)**: Grupo de áreas temáticas (ej: Grupo D - Salud Pública, Gestión, Ética, etc.).

#### 🎓 Módulo Educación (Simulacro)
*   **Examen Objetivo (`target`)**: Mapea a `ASCENSO`, `NOMBRAMIENTO` o `ACCESO_CARGOS`.
*   **Modalidad / Nivel (`career` - prefijo)**: Parte del campo career (ej: `EBR - Nivel Primaria`).
*   **Especialidad (`career` - sufijo)**: Parte final del campo career (ej: `EBR - Nivel Secundaria (Matemática)`).
*   **Áreas de Estudio (`areas`)**: Subtemas pedagógicos o conocimientos específicos.

### ⚙️ Mapeo Técnico de Configuración (Backend)
Para que el motor de búsqueda (RAG y Local) funcione, el sistema mapea la UI a los campos de la base de datos y al namespace de Pinecone de la siguiente forma:

| Módulo | Campo UI | Campo DB (`question_bank`) | Propósito RAG |
| :--- | :--- | :--- | :--- |
| **🩺 MEDICINA** | Examen Objetivo | `target` (SERUMS, ENAM) | Filtro de Identidad |
| | Carrera Profesional | `career` (Medicina Humana, Enfermería) | **Namespace: medicine** |
| | Áreas de Estudio | `topic` (Salud Pública, Gestión, etc.) | Muestreo de Áreas |
| **🎓 EDUCACIÓN** | Examen Objetivo | `target` (ASCENSO, NOMBRAMIENTO) | Filtro de Identidad |
| | Modalidad / Nivel | `career` (Prefijo: EBR - Nivel Primaria) | **Namespace: education** |
| | Especialidad | `career` (Sufijo: Matemática, General) | Sniper de Temario |
| | Áreas de Estudio | `topic` (Habilidades Gen., Pedagogía) | Muestreo de Áreas |

> [!NOTE]
> En el módulo **Educación**, el campo `career` en la base de datos concatena el Nivel y la Especialidad (ej: `EBR - Nivel Primaria - General`) para facilitar el filtrado único.

---

## 🤖 Fase 2: Distribución de Áreas IA (Generación de Emergencia)

Solo cuando el Escaneo Global detecta que el banco local es insuficiente para completar el lote de 5 preguntas según la configuración aplicada, se activa la IA mediante el servicio `userAiService.js`.

### 🔝 Escenario 1: Reposición con Muchas Áreas (> 5 áreas)
**Escenario Medicina:** Usuario elige 15 áreas, pero el banco está agotado.
**Escenario Educación:** Usuario elige 8 áreas de Didáctica y CNEB, banco agotado.

1.  **Muestreo para IA**: El sistema elige **5 áreas aleatorias** de las originales (respetando la representatividad de los bloques/grupos).
2.  **Generación Determinista**: Se le ordena a la IA generar **exactamente 1 pregunta por cada una** de esas 5 áreas.
3.  **Resultado**: Lote de 5 preguntas de alta calidad con 5 tópicos distintos.

### 📊 Escenario 2: Reposición con Exactamente 5 Áreas
1.  **Muestreo Fiel**: Se toman las 5 áreas.
2.  **Distribución 1:1**: 1 pregunta por área para garantizar que el simulador cubra toda la selección del usuario.

### 📉 Escenario 3: Reposición con Pocas Áreas (< 5 ejes temáticos)
1.  **Distribución Equitativa**: Se distribuyen las 5 preguntas entre los ejes disponibles (ej: 2 temas -> 3 y 2 preguntas respectivamente).
2.  **Repetición Necesaria**: Se generan múltiples preguntas por tema para completar el lote de 5.

---

## 🚦 Lógica de Activación IA (Triggers)

El sistema activa la IA de reposición **SOLO** en los siguientes casos:

1.  **Déficit de Stock Absoluto**: Cuando el Banco Local tiene menos de 5 preguntas disponibles para el conjunto de áreas seleccionadas.
2.  **Déficit de Diversidad Estadística**: Si el usuario selecciona 5 o más áreas, pero el banco solo tiene stock para 4 áreas o menos. **Se fuerza la IA** para garantizar que el examen cumpla con la diversidad configurada por el alumno.
3.  **Optimización Post-Fix**: El sistema permite que un solo tema agote su stock del banco (hasta 5) antes de llamar a la IA, optimizando el uso de recursos locales.

---

## 🛠️ Mecanismo de Selección Local (Garantía de No-Sesgo)

1.  **Aislamiento por Usuario**: Las preguntas vistas se marcan solo para el usuario actual.
2.  **Olvido Saludable (24h Window)**: El sistema excluye preguntas vistas en las últimas 24 horas, permitiendo el repaso posterior.
3.  **rn Adaptive Sampling**: Uso de `ROW_NUMBER()` dinámico particionado por tópico para asegurar que el pool inicial tenga una mezcla equilibrada de todos los grupos académicos.

---

## 🎓 Convenciones de Metadatos: Educación (Docente Pro)

Para garantizar que el filtrado del simulador funcione correctamente, se aplican las siguientes reglas de almacenamiento:

1.  **Campo `target`**: Almacena el tipo de examen en mayúsculas (ej: `NOMBRAMIENTO`, `ASCENSO`, `ACCESO_CARGOS`).
2.  **Campo `career`**: Almacena la combinación de **Modalidad/Nivel + Especialidad**.
    - *Formato:* `EBR - Nivel Primaria` o `EBR - Nivel Secundaria (Matemática)`.
3.  **Campo `difficulty`**: Siempre se guarda como **`Senior`** para mantener la paridad con el nivel de examen oficial.

### 🎯 Ingeniería RAG de Alta Fidelidad (Snipers)

Para que el simulador coincida exactamente con lo que el usuario configuró, el sistema utiliza "Snipers" de búsqueda dinámicos en 3 capas:

#### 1. Sniper de Temas (Fase 1 - El Scout)
*   **Propósito**: Garantizar que la IA solo elija temas que pertenecen al prospecto oficial.
*   **Estructura Educación**: `"Temario EBR Nivel [NIVEL] [ESPECIALIDAD]"`
*   **Estructura Medicina**: `"Temario SERUMS [CARRERA]"` (ej: `Temario SERUMS ENFERMERIA`)

#### 2. Sniper de Identidad (Fase 2 - El Investigador)
*   **Propósito**: Recuperar moldes visuales de PDFs reales para clonar la estructura oficial.
*   **Estructura Educación**: `"Prueba [TARGET] EBR [NIVEL] [ESPECIALIDAD] [AÑO] Pregunta [NUM]"` (Rango: 1-60).
*   **Estructura Medicina**: `"[TARGET] [CARRERA] Item [NUM]"` (Rango: 1-100).
*   **Técnica Quirúrgica (Medicina)**: Se inyecta el número de ítem con punto (ej: `78.`) como término de búsqueda para localizar fragmentos exactos del PDF.

#### 3. RAG de Teoría (Fase 2 - El Experto)
*   **Propósito**: Sustento legal y técnico para fundamentar la casuística.
*   **Contexto**: Búsqueda semántica por el subtema elegido en las Fases 1 y 2.

---

### 📂 Estructura de Temarios (Prospectos)

Para garantizar la precisión técnica, el sistema utiliza dos prospectos base en el namespace `medicine`:

1.  **Temario SERUMS MEDICINA HUMANA**: Enfocado en ciencias básicas, clínicas (Pediatría, Gineco-Obstetricia, Cirugía, Medicina Interna) y Salud Pública.
2.  **Temario SERUMS ENFERMERIA**: Enfocado en cuidados de enfermería, programas de salud (Etapas de vida), inmunizaciones y gestión comunitaria.

> [!IMPORTANT]
> El sistema utiliza el campo `career` de la configuración del usuario para decidir qué temario escanear en la **Fase 1 (El Scout)**. Si el usuario elige "Enfermería", la IA jamás recibirá temas de "Cirugía Compleja" destinados a medicina humana.

---

**Documentación Integrada (Medicina + Educación) - 11 de Mayo, 2026.**