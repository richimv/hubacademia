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
        4. **FORMATO DE SALIDA**:
           - **Limpieza**: PROHIBIDO basura de PDF o códigos extraños.
           - **Explicación**: Debe ser técnica y pedagógica, basándose en la teoría proporcionada.
           - **PROHIBICIÓN**: NO menciones letras (A, B, C) en la explicación.
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
           - **PROHIBICIÓN ABSOLUTA**: No menciones letras (A, B, C, D) en el campo "explanation". Usa descripciones como "La acción correcta es..." o "Esta opción se descarta porque...". Mencionar letras causa el rechazo de la pregunta.
           - La explicación debe ser sólida, técnica y justificar tanto la correcta como el descarte de los distractores. 
           - Finaliza con: 💡 **TIP MÉDICO:** [Consejo clave para el examen].

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
        Tu misión es garantizar que la pregunta sea IMPOSIBLE de adivinar por la extensión de las opciones.

        ### PASO 1: ANÁLISIS DE DATOS (Interno)
        1. Identifica el "correct_option_index" (la respuesta correcta es la opción número ${questionJson.correct_option_index}).
        2. Realiza un CONTEO EXACTO de palabras para cada una de las ${requiredOptions} opciones.
        3. Compara: ¿La opción correcta es la más larga? ¿Por cuántas palabras?
        
        ### PASO 2: ACCIÓN CORRECTIVA (REGLAS DE HIERRO)
        1. **CONTEO DE OPCIONES**: Deben haber EXACTAMENTE ${requiredOptions}. Ni una más, ni una menos.
        2. **LEY DE SIMETRÍA**: Si la respuesta correcta es más larga, DEBES recortarla eliminando adjetivos o detalles innecesarios, o ALARGAR los distractores agregando contexto técnico similar.
        3. **VARIANZA MÁXIMA**: Ninguna opción puede ser más de 3 palabras más larga que las demás. Todas deben verse como un bloque de texto idéntico.
        4. **LIMPIEZA**: Elimina encabezados, códigos (A01-...) y basura de PDF.
        5. **SIN LETRAS**: La explicación debe ser técnica y no mencionar letras (A, B, C).

        ### PREGUNTA A AUDITAR:
        ${JSON.stringify(questionJson, null, 2)}

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
