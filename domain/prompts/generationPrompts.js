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
        REGLA DE ORO: Mínimo 2 fuentes diferentes + Un TIP MÉDICO único.`;

    let starterGallery = `
          * SITUACIONAL: "En el marco de la vigilancia epidemiológica semanal, usted detecta...", "Durante la jornada de vacunación en una zona de difícil acceso..."
          * ADMINISTRATIVO: "Como jefe de establecimiento, se le solicita presentar el Plan Operativo Local...", "Al revisar el stock de medicamentos esenciales, se observa..."
          * CLÍNICO DIRECTO: "Una gestante de 24 años acude a su control prenatal refiriendo...", "Niño de 5 años es traído por su madre por presentar cuadro de..."
          * DIÁLOGO/GESTIÓN: "El personal de salud le informa sobre un aumento inusual de casos de...", "Usted recibe una directiva del MINSA sobre el nuevo esquema de..."
          * NORMATIVO: "Según la Norma Técnica de Salud vigente para el nivel I-2...", "En relación al Sistema de Referencia y Contrarreferencia, se define como..."
          * CASUÍSTICA TÉCNICA: "Al analizar los indicadores de desempeño del último trimestre, usted nota que...", "Se reporta un evento supuestamente atribuido a la vacunación (ESAVI) en..."`;

    let levelInstruction = "Estándar SERUMS. PROHIBIDO el uso excesivo de 'Usted se encuentra'. Sé creativo: varía entre casos de gestión, dilemas éticos, normativa pura y casos clínicos clásicos. Explicación: 2-3 párrafos técnicos.";

    return { targetRules, starterGallery, levelInstruction };
}

// La función buildMedicineAdminPrompt se define más abajo con la lógica completa de reglas y galerías.

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
    return `Eres un Arquitecto Pedagógico Senior en la Fase 3 (Diseño Creativo) de nuestra línea de producción industrial. 
        Tu misión es procesar el material de las Fases 1 y 2 para crear una pregunta de grado ministerial.

        ### PASO 1: ANÁLISIS DE IDENTIDAD [MOLDE OFICIAL]
        Analiza estos ejemplos reales para captar EXCLUSIVAMENTE su estructura y complejidad visual:
        - **Formulación**: ¿Usa diálogos entre docentes/alumnos? ¿Usa tablas de datos?
        - **Carga de Texto**: ¿El enunciado es breve o es una casuística extensa?
        - **Estilo de Opciones**: ¿Son directas o explicativas?
        MOLDES DE REFERENCIA: ${context.style || "Identidad oficial MINEDU."}

        ### PASO 2: MATERIAL TÉCNICO [RECURSOS DE INVESTIGACIÓN]
        Este material ha sido seleccionado por nuestro Scout (Fase 1) e Investigador (Fase 2). Es tu "Biblia Técnica":
        - **TEMA SELECCIONADO (INÉDITO)**: ${context.syllabus}
        - **SUSTENTO NORMATIVO/PEDAGÓGICO**: 
          --- INICIO TEORÍA ---
          ${context.basis}
          --- FIN TEORÍA ---

        ### PASO 3: CONSTRUCCIÓN DE INGENIERÍA (OBJETIVO C)
        1. **DISEÑO CASUÍSTICO**: Utiliza el sustento técnico para crear una situación 100% original. No copies los moldes, clona su "vibe" profesional.
        1.5 **ANCLAJE DE NIVEL EDUCATIVO (CRÍTICO)**: El caso DEBE desarrollarse estrictamente en el nivel/especialidad: "${career}". 
           - Si dice "Inicial", los protagonistas son obligatoriamente docentes y niños de 3 a 5 años (PROHIBIDO hablar de Secundaria).
           - Si dice "Primaria", son niños de 6 a 11 años. 
           - Si dice "Secundaria", son adolescentes.
        2. **APERTURA DINÁMICA (ANTI-MONOTONÍA)**: PROHIBIDO empezar el caso con la típica frase "La docente de [Nivel], [Nombre]...". DEBES variar radicalmente el inicio de cada pregunta. Ejemplos de inicios válidos:
           - Acción directa: "Durante el momento de juego libre en los sectores, dos niños..."
           - Contexto de problema: "En el marco de la planificación del proyecto del mes, los estudiantes..."
           - Diálogo inmediato: "- ¡Mira mi dibujo!, exclama un estudiante mientras..."
        2.5 **DINAMISMO VISUAL (OBLIGATORIO)**: Si las preguntas previas han sido planas, tú DEBES usar Markdown para insertar un CUADRO COMPARATIVO o un DIÁLOGO realista.
           - **INTEGRIDAD**: Si decides usar una tabla, debe contener al menos 2 filas de datos reales. No dejes cuadros vacíos.
        3. **ADVERTENCIA DEL CIRUJANO (PSICOMETRÍA)**: 
           Tras tu respuesta, un algoritmo contará los caracteres de tus opciones.
           - **SIMETRÍA EXTREMA**: La opción correcta NO puede ser excesivamente más larga que las demás. 
           - **MARGEN**: Todas las opciones deben tener una extensión similar (máximo +/- 40 letras de diferencia).
        3.5 **ESTRUCTURA DE PREGUNTA Y CONSIGNA (DOBLE BARRERA - CRÍTICO)**:
           - El campo "question_text" DEBE redactarse en dos partes separadas obligatoriamente:
             1. *El Caso/Escenario*: La descripción de la situación, diálogos o conflicto de aprendizaje.
             2. *La Consigna/Pregunta final*: Un párrafo final claro que contenga obligatoriamente signos de interrogación (¿...?) o verbos imperativos específicos para la resolución de la casuística (ej. "indique", "señale", "determine", "seleccione", "calcule", "identifique").
             - NUNCA termines el enunciado sin colocar una pregunta directa o instrucción explícita de lo que el docente debe responder.
        4. **FORMATO DE SALIDA**:
           - **Limpieza**: PROHIBIDO basura de PDF o códigos extraños.
           - **Explicación**: Debe ser técnica y pedagógica, basándose en la teoría proporcionada.
           - **PROHIBICIÓN**: NO menciones letras (A, B, C) en la explicación.
           - **VALOR DE SUBTOPIC (IMPERATIVO)**: El campo 'subtopic' en el JSON devuelto debe ser exactamente: "${context.syllabus || 'Análisis Casuístico'}".
           - **ESCAPADO JSON (CRÍTICO)**: Si usas saltos de línea para diálogos o tablas, DEBES usar "\\n" (barra invertida y n). NUNCA presiones 'Enter' real dentro de un valor JSON.

        ### HISTORIAL (PROHIBIDO): ${historyText}

        DEVUELVE ESTRICTAMENTE UN JSON (1 OBJETO, 3 OPCIONES OBLIGATORIAS):
        {
          "domain": "education",
          "target": "${target}",
          "career": "${career}",
          "topic": "${area}",
          "subtopic": "${context.syllabus || 'Análisis Casuístico'}",
          "difficulty": "Senior",
          "question_text": "...",
          "options": ["Opción A", "Opción B", "Opción C"],
          "correct_option_index": 0,
          "explanation": "...",
          "explanation_image_url": null
        }`;
}

function buildMedicineAdminPrompt(target, area, career, context, historyText = "", targetQuestionNum = null) {
    const rules = getMedicineAdminRules(target, area, career);
    const isResidentado = target === 'RESIDENTADO';
    const optionsCount = isResidentado ? 5 : 4;

    return `Eres un Especialista en Psicometría Médica Senior para exámenes oficiales (ENAM, SERUMS, RESIDENTADO).
        Tu misión es realizar una INGENIERÍA DE RECONSTRUCCIÓN para crear una pregunta de grado industrial.

        ### PASO 1: ANÁLISIS DE IDENTIDAD [MOLDE OFICIAL]
        Analiza este fragmento de examen real para captar exclusivamente su estructura y complejidad:
        - **Formulación**: ¿Es un caso clínico con datos de laboratorio, una pregunta de normativa o directa?
        - **Longitud**: ¿Es un caso extenso o una pregunta breve?
        - **Estilo de Opciones**: ¿Son dosis, diagnósticos, procedimientos o manejos?
        MOLDES DE REFERENCIA: ${context.style || "Estilo directo ENAM/SERUMS."}

        ### PASO 2: MATERIAL TÉCNICO [RECURSOS DE INVESTIGACIÓN]
        Este material ha sido seleccionado por nuestro Investigador (RAG). Es tu fuente de VERDAD:
        - **TEMA SELECCIONADO (Prospecto)**: ${context.syllabus || area}
        - **SUSTENTO CIENTÍFICO (NTS/GPC)**: 
          --- INICIO TEORÍA ---
          ${context.basis || "Guías de Práctica Clínica y Normas Técnicas de Salud del MINSA."}
          --- FIN TEORÍA ---

        ### PASO 3: CONSTRUCCIÓN DE INGENIERÍA (OBJETIVO C)
        1. **DISEÑO CLÍNICO**: Crea un caso clínico o escenario 100% original basado en la teoría del Paso 2.
        2. **CONTEXTUALIZACIÓN (PERFIL ${target})**:
           ${rules.targetRules}
        3. **VARIEDAD DE APERTURA (ANTI-MONOTONÍA)**: PROHIBIDO empezar siempre con "Paciente de...". Varía radicalmente los inicios basándote en esta galería:
           ${rules.starterGallery}
        4. **ADVERTENCIA DEL CIRUJANO (PSICOMETRÍA)**:
           - **SIMETRÍA EXTREMA**: Las ${optionsCount} opciones deben tener una extensión casi idéntica.
           - **PROHIBICIÓN**: La respuesta correcta NO puede destacar por ser más larga o detallada.
        5. **REGLAS DE ORO DE FORMATO (CRÍTICO)**:
           - **ESTRUCTURA DE PREGUNTA Y CONSIGNA (DOBLE BARRERA - CRÍTICO)**:
             El campo "question_text" DEBE estructurarse en dos partes separadas obligatoriamente:
             1. *El Caso Clínico/Escenario*: Toda la historia clínica, antecedentes y exámenes auxiliares.
             2. *La Pregunta o Consigna*: Un párrafo final interrogativo (¿...?) o indicativo directo (ej. "Señale...", "Indique...", "Determine...").
             - NUNCA dejes la historia clínica o el escenario sin una pregunta o consigna explícita en su párrafo final de cierre.
           - **PROHIBICIÓN ABSOLUTA**: No menciones letras (A, B, C, D) en el campo "explanation". Usa descripciones como "La acción correcta es..." o "Esta opción se descarta porque...". Mencionar letras causa el rechazo de la pregunta.
           - La explicación debe ser sólida, técnica y justificar tanto la correcta como el descarte de los distractores. 
           - Finaliza con: 💡 **TIP MÉDICO:** [Consejo clave para el examen].
           - **VALOR DE SUBTOPIC (IMPERATIVO)**: El campo 'subtopic' en el JSON devuelto debe ser exactamente: "${context.syllabus || 'Manejo Clínico'}".

        ### HISTORIAL (PROHIBIDO): ${historyText}

        DEVUELVE JSON (1 OBJETO, ${optionsCount} OPCIONES):
        {
            "domain": "medicine",
            "target": "${target}",
            "career": "${career}",
            "topic": "${area}",
            "subtopic": "${context.syllabus || 'Manejo Clínico'}",
            "difficulty": "Senior",
            "question_text": "...",
            "options": [${Array.from({ length: optionsCount }, (_, i) => `"Opción ${i + 1}"`).join(', ')}],
            "correct_option_index": 0,
            "explanation": "...",
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

    return `Actúa como un Auditor de Calidad Psicométrica DESPIADADO y ANALÍTICO.
        Tu misión es auditar y perfeccionar la pregunta para garantizar que sea impecable pedagógicamente y formalmente.

        ### PASO 1: ANÁLISIS DE DATOS (Interno)
        1. Identifica el "correct_option_index" (la respuesta correcta es la opción número ${questionJson.correct_option_index}).
        2. Realiza un CONTEO EXACTO de palabras para cada una de las ${requiredOptions} opciones.
        3. Compara la longitud de la opción correcta con los distractores.
        4. Analiza si el campo "question_text" cuenta con una pregunta o consigna explícita de cierre.
        5. Analiza si el campo "explanation" comete el error grave de hacer mención directa a letras de alternativas (ej: "Opción A", "Alternativa B", "la respuesta es la C", etc.).

        ### PASO 2: ACCIÓN CORRECTIVA (REGLAS DE HIERRO)
        1. **CONTEO DE OPCIONES**: Deben haber EXACTAMENTE ${requiredOptions} opciones. Ni una más, ni una menos.
        2. **LEY DE SIMETRÍA**: Si la respuesta correcta es más larga, DEBES recortarla eliminando adjetivos o detalles innecesarios, o ALARGAR los distractores agregando contexto técnico similar. Todas las opciones deben verse como un bloque de texto idéntico y simétrico (máximo +/- 10 caracteres de diferencia).
        3. **PREGUNTA O CONSIGNA OBLIGATORIA (CRÍTICO)**: El enunciado ("question_text") debe finalizar obligatoriamente con una pregunta directa (ej. "¿...?") o una instrucción imperativa explícita (ej. "indique", "señale", "determine", "seleccione", "calcule", "identifique"). Si solo tiene el caso clínico o pedagógico pero le falta la pregunta final, agrégala de forma coherente en un párrafo de cierre. NUNCA dejes la pregunta en el aire.
        4. **LIMPIEZA DE LETRAS EN LA EXPLICACIÓN (CRÍTICO)**: Está TERMINANTEMENTE PROHIBIDO mencionar letras de alternativas (A, B, C, D, E) o decir cosas como "Alternativa A", "Opción B", "la respuesta correcta es la C" en la explicación. Las opciones se barajan de manera aleatoria y dinámica al mostrarse al alumno, por lo que el orden cambia siempre. La explicación debe ser 100% conceptual y referirse al contenido mismo de la opción.
        5. **LIMPIEZA GENERAL**: Elimina encabezados, códigos (A01-...) y basura de PDF.

        ### PREGUNTA A AUDITAR:
        ${JSON.stringify(questionJson, null, 2)}

        Devuelve el JSON corregido de forma impecable. Si no puedes corregirlo para que sea perfecto, ajústalo lo mejor posible.
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

    getUserPrompt: (target, area, career, historyText, selectedSubtopic = null) => {
        const isEducationDomain = ['ASCENSO', 'NOMBRAMIENTO', 'ACCESO_CARGOS'].includes(target);
        if (isEducationDomain) return buildEducationUserPrompt(target, area, career, historyText, selectedSubtopic);
        return buildMedicineUserPrompt(target, area, career, historyText, selectedSubtopic);
    },

    buildRefinementPrompt
};

// ═══════════════════════════════════════════════════════════════
// PROMPTS DE USUARIO (CALIDAD PREMIUM V3)
// ═══════════════════════════════════════════════════════════════

function buildMedicineUserPrompt(target, area, career, historyText, selectedSubtopic = null) {
    const subtopicName = selectedSubtopic || "Caso Clínico";
    const isResidentado = target === 'RESIDENTADO';
    const optionsCount = isResidentado ? 5 : 4;
    const rules = getMedicineAdminRules(target, area, career);

    return `Eres un Redactor de Exámenes Médicos Senior para exámenes oficiales (${target}). Genera una pregunta de alto nivel clínico para la carrera: ${career}.
    La pregunta debe basarse estrictamente en este TEMA del prospecto oficial: "${subtopicName}".

    ### REGLAS DE ORO DE CONSTRUCCIÓN CLÍNICA (CRÍTICO):
    1. **APERTURA DINÁMICA (ANTI-MONOTONÍA)**: Varía el inicio del caso clínico. Evita iniciar siempre con "Paciente masculino de 45 años..." o "Mujer de 30 años...". Introduce el caso con la presentación de la urgencia, el ingreso a consultorio, o hallazgos clínicos inmediatos de forma fluida.
    2. **DINAMISMO VISUAL (Markdown)**: Si es pertinente, inyecta los resultados de exámenes de laboratorio o signos vitales en formato de lista en Markdown o tabla para dar una experiencia de examen real de alta fidelidad.
    3. **SIMETRÍA EXTREMA (PSICOMETRÍA)**: Todas las opciones de respuesta deben tener una extensión similar y simétrica (máximo +/- 40 caracteres de diferencia). La respuesta correcta NO puede destacar por ser más larga, detallada o fundamentada.
    4. **ESTRUCTURA DE PREGUNTA Y CONSIGNA (DOBLE BARRERA - OBLIGATORIO)**:
       El campo "question_text" DEBE redactarse en dos partes separadas obligatoriamente por un salto de línea doble:
       - *Parte 1 (Caso Clínico)*: Anamnesis, antecedentes, signos vitales, exploración física y resultados auxiliares.
       - *Parte 2 (Consigna Final)*: Un párrafo final claro y directo con signos de interrogación (¿...?) o indicaciones directas imperativas (ej: "Señale el diagnóstico más probable...", "Determine la conducta inmediata...", "Indique el tratamiento de elección..."). NUNCA dejes el caso clínico sin consigna.
    5. **EXPLICACIÓN LIMPIA (SIN LETRAS)**: La fundamentación médica debe ser rigurosa y fisiopatológica. Está TERMINANTEMENTE PROHIBIDO mencionar letras de alternativas (A, B, C, D, E) o decir cosas como "La opción D es correcta" en la explicación conceptual.
    6. **ESCAPADO JSON DE SALTOS DE LÍNEA**: Si usas saltos de línea para datos de laboratorio o signos vitales, debes usar obligatoriamente "\\n" (barra invertida y n). Nunca presiones 'Enter' real dentro de un valor string de JSON.
    7. **VALOR DE SUBTOPIC (IMPERATIVO)**: El campo 'subtopic' en el JSON devuelto debe ser exactamente: "${subtopicName}".

    ### HISTORIAL TEMAS EVITAR (PROHIBIDOS):
    ${historyText}

    DEVUELVE EXACTAMENTE UN JSON ARRAY CON 1 OBJETO QUE TENGA ESTA ESTRUCTURA (${optionsCount} OPCIONES OBLIGATORIAS):
    [
      {
        "domain": "medicine",
        "target": "${target}",
        "career": "${career}",
        "topic": "${area}",
        "subtopic": "${subtopicName}",
        "difficulty": "Senior",
        "question_text": "Caso clínico... \\n\\n¿Cuál es la conducta inmediata más adecuada?",
        "options": [${Array.from({ length: optionsCount }, (_, i) => `"Opción ${i + 1}"`).join(', ')}],
        "correct_option_index": 0,
        "explanation": "El tratamiento de elección se fundamenta en...",
        "explanation_image_url": null
      }
    ]`;
}

function buildEducationUserPrompt(target, area, career, historyText, selectedSubtopic = null) {
    const subtopicName = selectedSubtopic || "Análisis Casuístico";
    return `Eres un Especialista del MINEDU de alto nivel pedagógico. Genera una pregunta de Casuística de ${target} para la especialidad/nivel: ${career}.
    La pregunta debe basarse estrictamente en este TEMA del prospecto oficial: "${subtopicName}".

    ### REGLAS DE ORO DE CONSTRUCCIÓN ACADÉMICA (CRÍTICO):
    1. **APERTURA DINÁMICA (ANTI-MONOTONÍA)**: Prohibido iniciar el caso con la típica frase descriptiva repetitiva ("La docente de...", "El docente..."). DEBES variar el inicio. Ejemplos de inicios válidos:
       - Acción directa o diálogo: "Durante una asamblea de aula, los estudiantes debaten..."
       - Contexto inmediato: "- ¡Mira mi torre de bloques!, le dice Juan a..."
       - Planteamiento inmediato: "En el recreo, dos estudiantes de Primaria se empujan..."
    2. **DINAMISMO VISUAL (Markdown)**: Inserta diálogos de aprendizaje (con guiones o formato de conversación) o un cuadro/tabla comparativo en Markdown con al menos 2 filas de datos para hacer la pregunta visualmente atractiva y realista.
    3. **SIMETRÍA EXTREMA (PSICOMETRÍA)**: Todas las opciones de respuesta deben tener una extensión similar y simétrica (máximo +/- 40 caracteres de diferencia). La respuesta correcta NO puede ser excesivamente más larga ni más detallada que los distractores.
    4. **ESTRUCTURA DE PREGUNTA Y CONSIGNA (DOBLE BARRERA - OBLIGATORIO)**:
       El campo "question_text" DEBE redactarse en dos partes separadas obligatoriamente por un salto de línea doble:
       - *Parte 1 (Caso/Escenario)*: El contexto pedagógico, diálogos y situación de conflicto cognitivo.
       - *Parte 2 (Consigna Final)*: Un párrafo final claro y directo con signos de interrogación (¿...?) o verbos imperativos (ej. "indique", "señale", "determine", "seleccione", "identifique"). NUNCA termines la casuística sin plantear la consigna exacta de forma obligatoria.
    5. **EXPLICACIÓN LIMPIA (SIN LETRAS)**: La explicación técnica debe basarse en teorías del aprendizaje y pedagogía. Está TERMINANTEMENTE PROHIBIDO mencionar letras de alternativas (A, B, C) o frases como "La opción A es..." dado que las alternativas se barajan de manera aleatoria.
    6. **ESCAPADO JSON DE SALTOS DE LÍNEA**: Si usas saltos de línea para diálogos o tablas, debes usar obligatoriamente "\\n" (barra invertida y n). Nunca presiones 'Enter' real dentro de un valor string de JSON.
    7. **VALOR DE SUBTOPIC (IMPERATIVO)**: El campo 'subtopic' en el JSON devuelto debe ser exactamente: "${subtopicName}".

    ### HISTORIAL TEMAS EVITAR (PROHIBIDOS):
    ${historyText}

    DEVVELVE EXACTAMENTE UN JSON ARRAY CON 1 OBJETO QUE TENGA ESTA ESTRUCTURA (3 OPCIONES OBLIGATORIAS):
    [
      {
        "domain": "education",
        "target": "${target}",
        "career": "${career}",
        "topic": "${area}",
        "subtopic": "${subtopicName}",
        "difficulty": "Senior",
        "question_text": "Caso pedagógico... \\n\\n¿Cuál es la acción docente pertinente para...?",
        "options": ["Opción 1", "Opción 2", "Opción 3"],
        "correct_option_index": 0,
        "explanation": "La retroalimentación es clave porque...",
        "explanation_image_url": null
      }
    ]`;
}

module.exports = GENERATION_PROMPTS;
