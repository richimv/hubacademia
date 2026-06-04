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
        2. **APERTURA DINÁMICA (ANTI-MONOTONÍA)**: PROHIBIDO empezar el caso con la típica frase repetitiva "La docente de [Nivel], [Nombre]...". DEBES variar radicalmente el inicio de cada pregunta.
           🚨 REGLA DE ORO DE UNICIDAD: Queda estrictamente prohibido utilizar de forma literal o muy similar las frases de inicio dadas como ejemplos ilustrativos en otras partes (tales como "Durante el momento de juego libre", "- ¡Mira mi dibujo!", "Durante la asamblea de aula", "¡Mira mi torre de bloques!"). Diseña una apertura situacional 100% inédita para cada pregunta, alternando libremente entre descripciones situacionales, diálogos de aprendizaje directo, debates de estudiantes o dilemas pedagógicos concretos basados en los moldes oficiales.
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
           🚨 REGLA DE ORO DE UNICIDAD: Queda estrictamente prohibido copiar de forma literal o similar las frases de inicio dadas en la galería anterior. Diseña una situación clínica, administrativa, de diálogo o de gestión totalmente inédita para esta pregunta.
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

function buildLanguagePrompt(target, area, career, cefrLevel, historyText) {
    let languageDetails = "";
    if (career === 'en-US') {
        languageDetails = "Language: English (United States) [en-US]. Use American spelling (e.g., 'color', 'analyze', 'center'), American idioms, and tech/business context.";
    } else if (career === 'en-GB') {
        languageDetails = "Language: English (United Kingdom) [en-GB]. Use British spelling (e.g., 'colour', 'analyse', 'centre'), British idioms, and academic/IELTS-style context.";
    } else if (career === 'it-IT') {
        languageDetails = "Language: Italian (Italy) [it-IT]. Focus on grammatical structures, gender agreement, formal vs informal registers (Lei vs tu), and appropriate prepositions.";
    } else {
        languageDetails = `Language Code: ${career || 'en-US'}. Use the standard grammar and spelling for this language code.`;
    }

    let areaInstructions = "";
    if (area === 'Grammar & Use of English') {
        areaInstructions = `Focus on grammar, syntax, word order, verb conjugations, prepositions, or sentence structure appropriate for CEFR level ${cefrLevel}. The question text MUST contain exactly one blank space represented by '_____' (5 underscores) where the correct option fits.`;
    } else if (area === 'Vocabulary & Context') {
        areaInstructions = `Focus on vocabulary, word choice, synonyms/antonyms, phrasal verbs, idioms, or contextual meaning appropriate for CEFR level ${cefrLevel}. The question text MUST contain exactly one blank space represented by '_____' (5 underscores) where the correct option fits.`;
    } else if (area === 'Reading Comprehension') {
        areaInstructions = `Provide a short reading passage (1-2 paragraphs) in the target language, followed by a question that tests comprehension, main idea, detail, or inference at CEFR level ${cefrLevel}. Structure the question_text as: "[Reading Passage]\\n\\nQuestion: [Comprehension Question]"`;
    } else if (area === 'Listening Comprehension') {
        areaInstructions = `Create a script for a listening task (dialogue, announcement, or monologue) in the target language at CEFR level ${cefrLevel}. Store this script in the 'audio_text' field (max 100 words). The 'question_text' should be a question testing comprehension of that script. (e.g., 'According to the speaker, what is the main goal...?')`;
    }

    return `Actúa como un profesor experto y creador de exámenes internacionales de idiomas (tipo TOEFL, IELTS, Cambridge, CELI).
    Genera UNA pregunta de opción múltiple con las siguientes especificaciones:
    
    ${languageDetails}
    - Nivel MCER (CEFR) objetivo: ${cefrLevel}
    - Habilidad / Área a evaluar: ${area}
    - Especificaciones de la habilidad: ${areaInstructions}
    
    🚨 REGLAS DE ORO DE IDIOMAS:
    1. El enunciado de la pregunta (question_text), el pasaje de lectura (si aplica), el script de audio (si aplica) y todas las opciones de respuesta (options) DEBEN estar escritos 100% en el idioma objetivo (${career.split('-')[0]}). No incluyas español en estas partes.
    2. La explicación (explanation) DEBE estar escrita en ESPAÑOL, explicando de forma clara y didáctica la gramática, vocabulario o justificación de la respuesta correcta.
    3. Genera exactamente 4 opciones de respuesta. Evita el sesgo de longitud: TODAS las 4 opciones de respuesta deben tener una longitud similar (aproximadamente el mismo número de palabras). La opción correcta NO debe ser más de una frase más larga o descriptiva que los distractores.
    4. Sin letras (A, B, C, D) al inicio de las opciones.
    5. Escapa correctamente cualquier comilla doble interna usando \\" para que no se rompa el JSON.
    6. Para preguntas que NO sean de 'Listening Comprehension', el campo 'audio_text' debe ser nulo.
    7. Para las áreas 'Grammar & Use of English' y 'Vocabulary & Context', el enunciado de la pregunta ('question_text') DEBE incluir obligatoriamente un espacio en blanco representado exactamente por 5 guiones bajos ('_____') para que el usuario sepa dónde completar el conector, palabra o frase correspondiente.
    8. EVITAR DUPLICADOS Y CLONES: Revisa el historial de preguntas ya existentes que se proporciona abajo y genera una pregunta completamente nueva sobre un tema, situación, vocabulario o contexto diferente. No repitas ni adaptes levemente las preguntas existentes.
    
    ${historyText}
    
    RESPONDE ÚNICAMENTE CON EL SIGUIENTE FORMATO JSON (sin bloques de código markdown ni texto adicional):
    {
      "domain": "languages",
      "target": "${target}",
      "career": "${career}",
      "topic": "${area}",
      "subtopic": "Language Practice",
      "difficulty": "${cefrLevel}",
      "question_text": "Texto de la pregunta (e.g. 'Complete the sentence: She _____ to the store yesterday.' o el pasaje de lectura seguido de la pregunta)",
      "options": ["went", "goes", "has gone", "will go"],
      "correct_option_index": 0,
      "explanation": "Explicación didáctica en español sobre por qué 'went' es la opción correcta debido al adverbio de tiempo 'yesterday'.",
      "audio_text": ${area === 'Listening Comprehension' ? '"Script del audio en el idioma objetivo para que sea sintetizado."' : 'null'}
    }`;
}

function buildRefinementPrompt(questionJson, issues = []) {
    const isEducation = questionJson.domain === 'education';
    const isResidentado = questionJson.target === 'RESIDENTADO';
    const isLanguage = questionJson.domain === 'languages' || ['TOEFL', 'IELTS', 'TECH_ENGLISH', 'MCER', 'CELI', 'CILS'].includes(String(questionJson.target).toUpperCase());
    const requiredOptions = isEducation ? 3 : (isResidentado ? 5 : 4);

    let issuesText = '';
    if (issues && issues.length > 0) {
        issuesText = `\n### PROBLEMAS ESPECÍFICOS DETECTADOS A CORREGIR:\n${issues.map((iss, idx) => `${idx + 1}. ${iss}`).join('\n')}\n`;
    }

    let languageRules = '';
    if (isLanguage) {
        languageRules = `\n5. **REGLAS DE IDIOMAS**:
           - El enunciado de la pregunta, las opciones y el audio_text deben estar 100% en el idioma objetivo (e.g., inglés, italiano).
           - La explicación (explanation) debe estar en ESPAÑOL y ser fluida y gramaticalmente correcta.
           - Para Grammar o Vocabulary, la pregunta debe incluir obligatoriamente el placeholder '_____'.`;
    }

    return `Actúa como un Auditor de Calidad Psicométrica DESPIADADO y ANALÍTICO.
        Tu misión es auditar y perfeccionar la pregunta para garantizar que sea impecable pedagógicamente y formalmente.
        ${issuesText}
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
        4. **LIMPIEZA DE LETRAS EN LA EXPLICACIÓN (CRÍTICO)**: Está TERMINANTEMENTE PROHIBIDO mencionar letras de alternativas (A, B, C, D, E) o decir cosas como "Alternativa A", "Opción B", "la respuesta correcta es la C" en la explicación. Las opciones se barajan de manera aleatoria y dinámica al mostrarse al alumno, por lo que el orden cambia siempre. La explicación debe ser 100% conceptual y referirse al contenido mismo de la opción (ej: "El uso de 'went' es correcto por..." en lugar de "La opción A es correcta"). Reescribe cualquier oración incompleta para que sea fluida y gramaticalmente correcta en español.
        ${languageRules}
        6. **LIMPIEZA GENERAL**: Elimina encabezados, códigos (A01-...) y basura de PDF.

        ### PREGUNTA A AUDITAR:
        ${JSON.stringify(questionJson, null, 2)}

        Devuelve el JSON corregido de forma impecable. Si no puedes corregirlo para que sea perfecto, ajústalo lo mejor posible.
        DEVUELVE SOLO EL JSON SIN MARKDOWN:`;
}

const GENERATION_PROMPTS = {
    getUnifiedPrompt: (target, area, career, context, history = [], targetQuestionNum = null) => {
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
        return buildMedicineAdminPrompt(target, area, career, context, historyText, targetQuestionNum);
    },

    getLanguagePrompt: (target, area, career, cefrLevel, history = []) => {
        let historyText = "No hay contexto de repetición.";
        if (history && history.length > 0) {
            historyText = history.map(item => {
                const text = typeof item === 'string' ? item : (item.question_text || "");
                return `- Pregunta de idioma previa: "${text.substring(0, 150)}..."`;
            }).join('\n');
        }
        return buildLanguagePrompt(target, area, career, cefrLevel, historyText);
    },

    buildRefinementPrompt
};

module.exports = GENERATION_PROMPTS;
