# 🧪 Casos de Uso: Selección, Optimización y Distribución IA (V6)

Este documento describe el motor de inteligencia de Hub Academia para la gestión de stocks de preguntas. El sistema opera bajo un principio de **Eficiencia de Costos y Balance Estadístico**, priorizando el banco local antes de recurrir a la IA para la reposición de emergencia.

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
