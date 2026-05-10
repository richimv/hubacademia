/**
 * Hub Academia - Catálogo de Prompts para Generación de Preguntas (V6.2)
 * Centraliza las directrices de redacción para Admin y User.
 * Soporta Triple-RAG para Alta Fidelidad en ASCENSO y SERUMS.
 */

// ═══════════════════════════════════════════════════════════════
// DOMINIO: MEDICINA (SERUMS)
// ═══════════════════════════════════════════════════════════════

function getMedicineAdminRules(target, area, career) {
    let targetRules = `PERFIL SERUMS: Salud Pública y Gestión Comunitaria (ENCAPS). 
        VINCULACION COMUNITARIA: El nivel del establecimiento (I-1 al I-4) y la geografía peruana deben integrarse de forma natural.
        JERARQUÍA DE FUENTES: 1. LEY (NTS/RM) > 2. OFICIAL (GPC Minsa) > 3. SOPORTE (Libros).
        REGLA DE ORO: Mínimo 2 fuentes diferentes + Un TIP SERUMS.`;

    let starterGallery = `
          * ESCENARIO: "Usted se encuentra en Iñapari realizando visita domiciliaria...", "Como jefe del EESS se percata que hay productos vencidos..."
          * GESTIÓN/NORMA: "El responsable del establecimiento recibe el stock...", "Según el PAI, la actividad de vigilancia..."
          * PACIENTE: "Paciente joven de 30 años con tratamiento anti-TB...", "Mujer de 85 años hipertensa con antecedente de caída..."
          * DIRECTA: "¿Cuál es el procedimiento a seguir?", "¿Qué determinante de salud es más importante?"`;

    let levelInstruction = "Estándar SERUMS. Evalúa Normativa, Gestión y Casos Clínicos. Explicación: 2-3 párrafos profundos con fuente oficial.";

    return { targetRules, starterGallery, levelInstruction };
}

function buildMedicineAdminPrompt(target, area, career, context, historyText = "", targetQuestionNum = null) {
    const isResidentado = target === 'RESIDENTADO';
    const optionsCount = isResidentado ? 5 : 4;

    return `Eres un Especialista en Ingeniería Clínica para Exámenes Médicos Nacionales (ENAM, SERUMS, RESIDENTADO).
        Tu misión es realizar una INGENIERÍA DE RECONSTRUCCIÓN para crear una pregunta 100% ORIGINAL (OBJETIVO C).

        ### PASO 1: ANÁLISIS DE INGENIERÍA [MOLDE OFICIAL]
        Analiza este fragmento de examen real para identificar:
        - **Formulación**: ¿Es un caso clínico con datos de laboratorio, una pregunta de normativa de salud pública o una pregunta directa?
        - **Longitud**: ¿Es un caso extenso con antecedentes o una pregunta de "una línea"?
        - **Opciones**: ¿Son dosis, nombres de enfermedades, procedimientos o explicaciones de manejo?
        Fragmento: ${context.style || "Estilo oficial MINSA."}

        ### PASO 2: SELECCIÓN DE CONTENIDO [TEORÍA TÉCNICA]
        - **Eje Temático**: Usa este contexto para elegir un subtema médico específico:
           ${context.syllabus || area}
        - **Sustento Científico**: Aplica estrictamente esta lógica médica/normativa (NTS, GPC, RM) para resolver el caso:
           ${context.basis || "Medicina basada en evidencia y Guías de Práctica Clínica del MINSA."}

        ### PASO 3: CONSTRUCCIÓN ORIGINAL (OBJETIVO C)
        1. Crea un caso clínico o escenario 100% NUEVO basado en el tema del Paso 2.
        2. **IMITA LA INGENIERÍA del Paso 1**: 
           - **Limpieza de Molde**: PROHIBIDO copiar encabezados, códigos de examen o números de pregunta del fragmento.
           - **Unicidad**: Genera UNA SOLA pregunta médica clara. Ignora restos de otras preguntas si aparecen en el fragmento.
           - **Variedad de Apertura**: PROHIBIDO empezar siempre con "Paciente de...". Imita el estilo de inicio exacto del [MOLDE OFICIAL].
           - Si el molde usó datos de laboratorio en tabla, tú crea una situación similar con otros datos.
        3. **SIMETRÍA DE OPCIONES (REGLA DE CONTEO)**:
           - **Cepo de Palabras**: Las ${optionsCount} opciones deben tener una extensión casi idéntica (ej. todas entre 8 y 15 palabras).
           - **PROHIBICIÓN**: Está terminantemente prohibido que la respuesta correcta destaque por ser más larga o detallada que los distractores.
        4. Mantén el mismo nivel de dificultad y tono que el molde.
        5. **REGLAS DE ORO DE FORMATO**:
           - **NUNCA** incluyas las opciones (A, B, C) dentro del campo "question_text".
           - La explicación debe ser sólida y NO debe mencionar letras (A, B, C). Finaliza con "💡 **TIP MÉDICO:** [Consejo]".

        ### HISTORIAL (PROHIBIDO): ${historyText}

        DEVUELVE JSON:
        {
            "domain": "medicine",
            "target": "${target}",
            "career": "${career}",
            "topic": "${area}",
            "subtopic": "Manejo Clínico / Normativa",
            "difficulty": "Senior",
            "question_text": "...",
            "options": ["Opción 1", "Opción 2", "Opción 3", "Opción 4"${optionsCount === 5 ? ', "Opción 5"' : ''}],
            "correct_option_index": 0,
            "explanation": "...",
            "explanation_image_url": null
        }`;
}

// ═══════════════════════════════════════════════════════════════
// DOMINIO: EDUCACIÓN (ASCENSO)
// ═══════════════════════════════════════════════════════════════

function getEducationAdminRules(target, area, career) {
    return {
        targetRules: `PERFIL ASCENSO: Docente experimentado. Enfoque: Retroalimentación Formativa y Evaluación por Competencias.
            JERARQUÍA: Rúbricas de Evaluación del Desempeño Docente MINEDU y CNEB.`,
        starterGallery: `
              * RETROALIMENTACIÓN: "Al finalizar la unidad, el docente evalúa los portafolios y observa que..."
              * CASUÍSTICA: "Un estudiante levanta la mano y afirma que...", "Dos estudiantes discuten sobre la solución de un problema..."`,
        levelInstruction: "Nivel: Senior Magisterial. Explicación: 2-3 párrafos detallando el andamiaje pedagógico y descartando enfoques tradicionales."
    };
}

function buildEducationAdminPrompt(target, area, career, context, historyText = "", targetQuestionNum = null) {
    return `Eres un Arquitecto Pedagógico para el MINEDU (Perú). 
        Tu misión es realizar una INGENIERÍA DE RECONSTRUCCIÓN para crear una pregunta 100% ORIGINAL.

        ### PASO 1: ANÁLISIS DE INGENIERÍA [MOLDE OFICIAL]
        Analiza este fragmento para identificar:
        - **Formulación**: ¿Es un caso con diálogos, una tabla comparativa, o una situación narrativa directa?
        - **Longitud**: ¿La pregunta es corta y al grano o extensa y detallada?
        - **Opciones**: ¿Son opciones de una sola palabra, frases cortas o explicaciones largas?
        Fragmento: ${context.style || "Estilo oficial MINEDU."}

        ### PASO 2: SELECCIÓN DE CONTENIDO [TEMARIO + TÉCNICO]
        - **Tema**: Elige UN subtema específico de este [TEMARIO] que no se haya usado:
           ${context.syllabus || "Temas generales de " + area}
        - **Sustento**: Aplica estrictamente esta lógica pedagógica para resolver el caso:
           ${context.basis || "Enfoque por competencias y retroalimentación."}

        ### PASO 3: CONSTRUCCIÓN ORIGINAL (OBJETIVO C)
        1. Crea un escenario 100% NUEVO basado en el tema del Paso 2.
        2. **IMITA LA INGENIERÍA del Paso 1**: 
           - **Limpieza de Molde**: PROHIBIDO copiar encabezados de página, códigos de examen (ej. A01-EBRI-11), o números de pregunta del fragmento.
           - **Unicidad**: Genera UNA SOLA pregunta clara. Si el fragmento contiene restos de otra pregunta, IGNÓRALOS.
           - **Variedad de Apertura**: PROHIBIDO empezar siempre con "En el aula de...". Imita el estilo de inicio exacto del [MOLDE OFICIAL].
           - Si el molde usó una tabla, tú crea una TABLA ORIGINAL. Si usó diálogos, tú escribe DIÁLOGOS ORIGINALES.
        3. **SIMETRÍA DE OPCIONES (REGLA DE CONTEO)**:
           - **Cepo de Palabras**: Todas las opciones DEBEN tener una extensión casi idéntica (ej. si una tiene 12 palabras, las otras deben tener entre 10 y 14).
           - **Igualdad Técnica**: No uses lenguaje más complejo en la respuesta correcta que en los distractores.
           - **PROHIBICIÓN**: Si la respuesta correcta es más larga que los distractores, la pregunta será invalidada.
        4. Mantén el mismo nivel de dificultad y tono que el molde.
        5. **REGLA DE ORO DE FORMATO**:
           - **NUNCA** incluyas las opciones o alternativas (A, B, C) dentro del campo "question_text".
           - El "question_text" debe terminar siempre en la pregunta final (ej: ¿Qué acción es pertinente?).
           - Las opciones van ÚNICAMENTE en el array "options".
        6. **REGLA DE ORO TÉCNICA**: La explicación debe ser sólida y NO debe mencionar letras (A, B, C).

        ### HISTORIAL (PROHIBIDO): ${historyText}

        DEVUELVE JSON (3 OPCIONES OBLIGATORIAS):
        {
          "domain": "education",
          "target": "${target}",
          "career": "${career}",
          "topic": "${area}",
          "subtopic": "Análisis Casuístico (Original)",
          "difficulty": "Senior",
          "question_text": "...",
          "options": ["Opción A", "Opción B", "Opción C"],
          "correct_option_index": 0,
          "explanation": "...",
          "explanation_image_url": null
        }`;
}

function buildMedicineAdminPrompt(target, area, career, context, historyText = "", targetQuestionNum = null) {
    return `Eres un Especialista en Psicometría Médica para exámenes ENAM/SERUMS.
        Tu misión es clonar el estilo de los exámenes oficiales de medicina.

        1. RIGOR CLÍNICO: La pregunta debe basarse en el [TEMARIO OFICIAL] y [BIBLIOTECA TÉCNICA].
        2. ### INSTRUCCIÓN DE MIMETISMO CON VARIACIÓN (OBJETIVO B):
           - **SEPARACIÓN DE PIEZAS**: Los modelos de medicina ya incluyen sus 4 opciones. Identifícalas y úsalas para llenar el array de opciones en el JSON.
           - **VARIACIÓN**: Crea un caso clínico NUEVO variando los datos del paciente, pero mantén el diagnóstico y la estructura de las opciones del molde.
        
        3. EXPLICACIÓN (SOPORTE RAG): Un párrafo clínico fluido basado en la [BIBLIOTECA TÉCNICA]. 
           - **REGLA DE ORO**: PROHIBIDO mencionar letras (A, B, C, D). Refiérete al diagnóstico o tratamiento directamente (ej: "El tratamiento de elección es...").
           - Finaliza con: 💡 **TIP MÉDICO:** [Un consejo clave].
        4. OPCIONES: Usa 4 opciones que sean espejos de las del molde (puedes variar términos técnicos).
         [EJEMPLOS DE ESTILO REAL]:
        ${context.style || "Estilo directo ENAM/SERUMS."}

        [BIBLIOTECA TÉCNICA (NTS/GPC)]:
        ${context.basis || "Guías de Práctica Clínica y Normas Técnicas de Salud."}

        [TEMARIO OFICIAL]:
        ${context.syllabus || area}

        [HISTORIAL (BLOQUEADO)]:
        ${historyText}

        DEVUELVE JSON:
        {
            "domain": "medicine",
            "target": "${target}",
            "career": "${career}",
            "topic": "${area}",
            "subtopic": "Clínica Médica",
            "difficulty": "Senior",
            "question_text": "Enunciado directo y clínico",
            "options": ["Opción 1", "Opción 2", "Opción 3", "Opción 4"],
            "correct_option_index": 0,
            "explanation": "Un solo párrafo clínico + TIP MÉDICO.",
            "explanation_image_url": null
        }`;
}

// ═══════════════════════════════════════════════════════════════
// REFINAMIENTO Y AUDITORÍA
// ═══════════════════════════════════════════════════════════════

function buildRefinementPrompt(questionJson) {
    const isEducation = questionJson.domain === 'education';
    const isResidentado = questionJson.target === 'RESIDENTADO';
    const requiredOptions = isEducation ? 3 : (isResidentado ? 5 : 4);

    return `Actúa como un Auditor de Calidad Psicométrica DESPIADADO.
        Tu misión es corregir errores de la IA generadora. NO aceptes respuestas mediocres.

        ### PREGUNTA A AUDITAR:
        ${JSON.stringify(questionJson, null, 2)}

        ### REGLAS DE ORO DE AUDITORÍA:
        1. **CONTEO DE OPCIONES**: Para este dominio (${questionJson.domain}) DEBEN HABER EXACTAMENTE ${requiredOptions} OPCIONES. Si hay más, ELIMÍNALAS. Si hay menos, CREA una coherente.
        2. **SIMETRÍA MATEMÁTICA**: La diferencia de palabras entre la opción más larga y la más corta NO debe superar el 20%. Si la respuesta correcta es más larga, RECÓRTALA o alarga las otras hasta que se vean idénticas en longitud.
        3. **LIMPIEZA TOTAL**: Borra cualquier rastro de códigos (A01-...), números de pregunta del PDF o encabezados.
        4. **SIN LETRAS**: La explicación no debe decir "La opción A es correcta...". Debe decir "La retroalimentación es correcta porque...".

        ### INSTRUCCIÓN FINAL:
        Devuelve el JSON corregido. Si no puedes corregirlo para que sea perfecto, ajústalo lo mejor posible pero NUNCA entregues una respuesta correcta más larga que el resto.
        DEVUELVE SOLO EL JSON SIN MARKDOWN:`;
}

// ═══════════════════════════════════════════════════════════════
// INTERFAZ PÚBLICA
// ═══════════════════════════════════════════════════════════════

const GENERATION_PROMPTS = {
    getAdminPrompt: (target, area, career, context, history = [], targetQuestionNum = null) => {
        const isEducationDomain = ['ASCENSO', 'NOMBRAMIENTO', 'ACCESO_CARGOS'].includes(target);

        let historyText = "No hay contexto de repetición.";
        if (history && history.length > 0) {
            historyText = history.map(item => {
                const text = typeof item === 'string' ? item : (item.question_text || "");
                return `- Escenario usado: "${text.substring(0, 150)}..."`;
            }).join('\n');
        }

        if (isEducationDomain) {
            return buildEducationAdminPrompt(target, area, career, context, historyText, targetQuestionNum);
        }
        // Default: Medicina (SERUMS, ENAM, RESIDENTADO)
        return buildMedicineAdminPrompt(target, area, career, context, historyText, targetQuestionNum);
    },

    getUserPrompt: (target, area, career, historyText) => {
        // Mantiene la lógica fast sin RAG para reponer stock rápidamente
        if (target === 'ASCENSO') return buildEducationUserPrompt(target, area, career, historyText);
        return buildMedicineUserPrompt(target, area, career, historyText);
    },
    
    buildRefinementPrompt
};

// ... (Las funciones buildMedicineUserPrompt y buildEducationUserPrompt se mantienen igual para velocidad) ...
function buildMedicineUserPrompt(target, area, career, historyText) {
    return `Actúa como Redactor de Exámenes Médicos. Genera 1 pregunta de ${target} para ${area}.
    REGLA: Evita estos temas: ${historyText}. 
    DEVUELVE EXACTAMENTE UN JSON ARRAY CON 1 OBJETO QUE TENGA ESTA ESTRUCTURA:
    [
      {
        "domain": "medicine",
        "target": "${target}",
        "career": "${career}",
        "topic": "${area}",
        "subtopic": "Caso Clínico",
        "difficulty": "Intermedio",
        "question_text": "Texto de la pregunta...",
        "options": ["Opcion A", "Opcion B", "Opcion C", "Opcion D", "Opcion E"],
        "correct_option_index": 0,
        "explanation": "Explicacion...",
        "explanation_image_url": nul
      }
    ]`;
}

function buildEducationUserPrompt(target, area, career, historyText) {
    return `Actúa como Especialista MINEDU. Genera 1 pregunta de Casuística de ${target} para ${area}.
    REGLA: Evita estos temas: ${historyText}.
    DEVUELVE EXACTAMENTE UN JSON ARRAY CON 1 OBJETO QUE TENGA ESTA ESTRUCTURA (3 OPCIONES OBLIGATORIAS):
    [
      {
        "domain": "education",
        "target": "${target}",
        "career": "${career}",
        "topic": "${area}",
        "subtopic": "Análisis Casuístico (Original)",
        "difficulty": "Senior",
        "question_text": "...",
        "options": ["Opción A", "Opción B", "Opción C"],
        "correct_option_index": 0,
        "explanation": "...",
        "explanation_image_url": null
      }
    ]`;
}

module.exports = GENERATION_PROMPTS;
