/**
 * Hub Academia - Catálogo de Prompts para Generación de Preguntas
 * Centraliza las directrices de redacción para Admin y User.
 * [RESTAURACIÓN TOTAL: Prompts Profesionales Literales]
 */

const GENERATION_PROMPTS = {
    /**
     * PROMPT MAESTRO (ADMIN): Alta fidelidad, basado en RAG y Jerarquía médica oficial.
     */
    getAdminPrompt: (target, area, career, ragContext, styleExamples) => {
        let targetRules = "";
        let starterGallery = "";
        let levelInstruction = "";

        if (target === "ENAM") {
            targetRules = `PERFIL ENAM: Médico General - Enfoque Clínico y Diagnóstico.
            ENFOQUE: Clínica general, diagnóstico diferencial y manejo inicial basado en evidencia.
            JERARQUÍA DE FUENTES: 1. GPC Oficiales (Minsa/EsSalud) > 2. Libros Clínicos (Harrison/Nelson/Williams) > 3. Manuales de Especialidad (AMIR/CTO) > 4. NTS/RM/Leyes.
            REGLA DE ORO: Mínimo 2 fuentes distintas en la explicación.`;
            starterGallery = `
              * PACIENTE (Clásico): "Mujer de 45 años...", "Gestante de 32 semanas...", "Niño con fiebre de..." (Sin 'Un' o 'Una').
              * TIEMPO: "Tras 4 horas de evolución...", "Hace 3 días presenta..."
              * HALLAZGO/CLÍNICA: "Al examen físico se palpa...", "La radiografía de tórax muestra...", "El laboratorio reporta..."
              * ACCIÓN: "Usted se encuentra en emergencia...", "Durante el control prenatal...", "Al atender un parto..."
              * DIRECTA: "¿Cuál es el diagnóstico más probable?", "¿Qué tratamiento de elección...?", "¿Cuál es la complicación...?"`;
            levelInstruction = "Nivel Senior ENAM. Evalúa Diagnóstico y Manejo. Explicación: 2-3 párrafos técnicos.";
        } else if (target === "SERUMS") {
            targetRules = `Enfoque: Salud Pública y Gestión Comunitaria (ENCAPS). 
            VINCULACION COMUNITARIA: El nivel del establecimiento (I-1 al I-4) y la geografía peruana deben integrarse de forma natural y VARIADA.
            JERARQUÍA DE FUENTES (ESTRICTA): 1. LEY (NTS/RM) > 2. OFICIAL (GPC Minsa) > 3. SOPORTE (Libros).
            REGLA DE ORO: Mínimo 2 fuentes diferentes + Un TIP SERUMS`;
            starterGallery = `
              * ESCENARIO OPERATIVO: "Usted se encuentra en Iñapari realizando visita domiciliaria...", "Como jefe del EESS se percata que hay productos vencidos...", "Se le encarga implementar servicios con pertinencia cultural..."
              * GESTIÓN/NORMA: "El responsable del establecimiento recibe el stock...", "Según el PAI, la actividad de vigilancia...", "Dentro del marco del MCI, usted indica la prueba de..."
              * PACIENTE DIVERSO: "Paciente joven de 30 años con tratamiento anti-TB...", "Mujer de 85 años hipertensa con antecedente de caída...", "Varón de 4 años procedente de Ucayali..."
              * ENTORNO: "En una comunidad Aymara...", "En un establecimiento de la comunidad andina...", "Establecimiento de salud I-1 en Loreto..."
              * DIRECTA: "¿Cuál es el procedimiento a seguir?", "¿Qué determinante de salud es más importante?", "¿Cuál es el plazo máximo...?"`;
            levelInstruction = "Estándar SERUMS. Evalúa Normativa, Gestión y Casos Clínicos de Comunidad. Explicación: 2-3 párrafos profundos con fuente oficial.";
        } else if (target === "RESIDENTADO") {
            targetRules = `PERFIL RESIDENTADO (ESPECIALIDAD): ENFOQUE EN LIBROS Y EVIDENCIA CLÍNICA.
            JERARQUÍA ESTRICTA: 1. LIBROS DE REFERENCIA (Harrison, Washington, Nelson, Williams, etc.) y GPC Clínicas.
            2. MANUALES DE ESPECIALIDAD (AMIR, CTO).
            3. NORMAS (NTS) Y LEYES.
            REGLA DE ORO: La fundamentación DEBE priorizar el sustento clínico/fisiopatológico de los LIBROS en temas médicos.`;
            starterGallery = `
              * PACIENTE (Complejo): "Varón con antecedente de cirrosis...", "Paciente polimedicado que...", "Mujer con clínica de..."
              * FISIOPATOLÓGICO: "El mecanismo de acción de...", "La causa más frecuente de...", "La enzima responsable de..."
              * ESCENARIO HOSPI: "Paciente en UCI presenta...", "Tras 24h de postoperatorio...", "Durante la laparotomía..."
              * HALLAZGO AVANZADO: "El signo de (Epónimo) se asocia a...", "En el frotis de sangre periférica...", "La RM de encéfalo muestra..."
              * DIRECTA: "¿Qué marcador tumoral...?", "¿Cuál es el Gold Standard para...?", "¿Qué gen está mutado en...?"`;
            levelInstruction = "Nivel Senior Residentado. Evalúa Fisiopatología, Manejo Avanzado y Especialidad. Explicación: 2-3 párrafos analíticos basados en bibliografía oficial.";
        }

        return `Eres un Redactor Senior de Exámenes Médicos Nacionales (SERUMS, ENAM, RESIDENTADO).
        MISIÓN CRÍTICA: Generar 1 pregunta INÉDITA de Nivel Senior para el área: **${area}**.
        Target: ${target} | Carrera: ${career}

        [REGLAS DE ORO DE VARIABILIDAD (INQUEBRANTABLES)]
        1. ROTACIÓN DE SUJETOS: Alterna entre: Gestante (incluye fórmula G_P____), Escolar, Adulto Mayor frágil, Reo en penal, Trabajador sexual, Autoridad local (Alcalde), Personal del EESS (Farmacéutico, Jefe de Puesto, Enfermera), Paciente con comorbilidades.
        2. ESCENARIOS DIVERSOS: No todo es "Puesto I-1". Usa: C.S. Urbano marginal, Brigada de selva alta, Campamento minero, Auditoría de farmacia, Sala de Situación, Institución Educativa, Visita domiciliaria.
        3. RIGOR TÉCNICO: Incluye SIEMPRE datos de laboratorio o signos vitales específicos (Ej: "SatO2: 84%", "Hb: 9 g/dL", "Fe sérico: 30").
        4. ESTILO TELEGRAMA MINSA: Elimina preámbulos literarios. No cuentes historias. Entrega datos y pregunta.
        5. LA LÁPIDA DE LOS PREFIJOS: Banea el inicio "Usted, como [Rol]...". Es una muletilla inaceptable.

        [REGLAS PARA LAS OPCIONES]
        - TEXTO LIMPIO: Sin letras ni prefijos (A., B., C.).
        - BREVEDAD: 1 a 12 palabras máximo.
        - SIMETRÍA VISUAL (OBLIGATORIO): Todas las opciones deben tener una longitud similar. Prohibido que la correcta sea la más larga.

        [EXPLICACIÓN (FUNDAMENTACIÓN)]
        - ${levelInstruction}
        - Usa CITACIÓN EN NEGRITA al inicio de cada párrafo fuente (Ej: "**Según la NTS 123...**", "**De acuerdo a la RM...**").
        - SECCIÓN OBLIGATORIA (Solo para SERUMS): Finaliza SIEMPRE con el texto "💡 **TIP SERUMS:** [Consejo práctico]".

        [JERARQUÍA DE FUENTES]:
        ${targetRules}
        ${starterGallery}

        [DATOS DE APOYO RAG LOCAL]:
        ${ragContext || "Usa tu base experta basada en jerarquía médica."}

        [ESTILO REAL DE EXAMEN]:
        ${styleExamples || "Estilo directo."}

        DEVUELVE JSON:
        {
            "topic": "${area}",
            "subtopic": "...",
            "difficulty": "Senior",
            "question_text": "...",
            "options": ${target === 'RESIDENTADO' ? '["A", "B", "C", "D", "E"]' : '["A", "B", "C", "D"]'},
            "correct_option_index": 0,
            "explanation": "...",
            "visual_support_recommendation": "..."
        }`;
    },

    /**
     * PROMPT MAESTRO (USER): Enfocado en variabilidad extrema y velocidad del simulador.
     */
    getUserPrompt: (target, area, career, historyText) => {
        let targetRules = "";
        let starterGallery = "";

        if (target === "ENAM") {
            targetRules = "Médico General - Clínico Diagnóstico. GPC Oficiales + Libros Harrison/Nelson.";
            starterGallery = "* PACIENTE: 'Mujer de 45 años...', 'Gestante de 32 semanas...'. * TIEMPO: 'Tras 4 horas...'.";
        } else if (target === "SERUMS") {
            targetRules = "Salud Pública y Gestión (ENCAPS). Geografía peruana integrada y VARIADA.";
            starterGallery = "* ESCENARIO: 'Usted se encuentra en Iñapari...', 'Como jefe del EESS se percata...'. * DIRECTA: '¿Qué norma regula...?'.";
        }

        return `Actúa como Redactor de Exámenes Médicos Nacionales.
        Genera 1 pregunta de ${target} para: **${area}**. Carrera: ${career}.

        [REGLAS DE ORO]:
        1. ESTILO: Telegrama Minsa (Seco y Técnico).
        2. NO REPETIR: Evita temas o escenarios presentes en el historial:
        ${historyText}

        3. RIGOR: Incluye signos vitales (PA, FC, FR, T°).
        4. LA LÁPIDA DE PREFIJOS: Prohibido empezar con "Usted como [Rol]...".
        5. OPCIONES: Simetría visual y brevedad (máximo 12 palabras).

        [REGLAS TARGET]:
        ${targetRules}
        ${starterGallery}

        DEVUELVE JSON ARRAY:
        [{
            "topic": "${area}",
            "difficulty": "Senior",
            "question_text": "...",
            "options": ["...", "...", "...", "..."],
            "correct_option_index": 0,
            "explanation": "2 párrafos técnicos con citado en negrita. Finaliza con TIP SERUMS si aplica.",
            "visual_support_recommendation": "..."
        }]`;
    }
};

module.exports = GENERATION_PROMPTS;
