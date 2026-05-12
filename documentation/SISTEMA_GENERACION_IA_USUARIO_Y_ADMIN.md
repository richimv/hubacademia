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

## 🧠 Reglas de Oro Técnicas

1.  **Explicación Descriptiva**: Está prohibido mencionar letras (A, B, C) en la explicación para evitar confusiones tras el barajado de opciones.
2.  **Variedad de Apertura**: El sistema bloquea el uso repetitivo de frases como "En el aula de..." o "Un docente desea...", forzando inicios in media res o descripciones situacionales.
3.  **Dificultad Senior**: El tono y la complejidad deben imitar fielmente los exámenes de ascenso de escala magisterial.
