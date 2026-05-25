const { VertexAI } = require('@google-cloud/vertexai');
const QuestionRagService = require('./questionRagService');
const genPrompts = require('../prompts/generationPrompts');

/**
 * 👑 ADMIN AI SERVICE (V6.2): Generación de Alta Fidelidad para Banco Oficial.
 * - Solo soporta ASCENSO (Educación) y SERUMS (Medicina).
 * - Utiliza Triple-RAG para mimetismo y sustento legal.
 */
class AdminAiService {
    constructor() {
        const project = process.env.GOOGLE_CLOUD_PROJECT;
        const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
        this.vertex_ai = new VertexAI({ project, location });
        this.model = this.vertex_ai.getGenerativeModel({
            model: 'gemini-2.5-flash-lite',
            generationConfig: {
                maxOutputTokens: 16384,
                temperature: 0.4, // Mayor variedad para evitar repeticiones
                responseMimeType: "application/json"
            }
        });

        // Asignar el servicio RAG (ya es una instancia exportada como Singleton)
        this.ragService = QuestionRagService;
    }

    _parseJSON(text) {
        if (!text) throw new Error("Texto JSON vacío");
        const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
        try {
            return JSON.parse(cleaned);
        } catch (e) {
            // Limpieza robusta de caracteres de control y secuencias escapadas en caso de fallo
            const simpleCleaned = cleaned
                .replace(/\\n/g, ' ')
                .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Eliminar caracteres de control inválidos en JSON
                .trim();
            try {
                return JSON.parse(simpleCleaned);
            } catch (e2) {
                console.error("Error al parsear incluso después de la limpieza básica:", e2.message);
                throw e2;
            }
        }
    }

    /**
     * 🛡️ SANITIZADOR DETERMINISTA DE EXPLICACIONES
     * Elimina referencias a letras de opciones (A, B, C, D, E) en la explicación.
     * Se aplica como último escudo antes de retornar cualquier pregunta generada,
     * independientemente de si la IA obedeció las instrucciones del prompt.
     *
     * Casos que captura y elimina:
     *   - "la opción A", "la alternativa B", "la respuesta es la C"
     *   - "opción A es correcta", "la A es correcta", "respuesta A"
     *   - "La respuesta correcta es la opción A" → "La respuesta correcta es"
     *
     * NO toca frases que mencionan el texto real de la respuesta (que es el comportamiento correcto).
     *
     * @param {string} explanation - Texto de la explicación generada por la IA.
     * @returns {string} - Explicación limpia sin referencias a letras de opciones.
     */
    _sanitizeExplanation(explanation) {
        if (!explanation || typeof explanation !== 'string') return explanation;

        let clean = explanation;

        // Patrón 1: "la opción A", "la alternativa B", "la respuesta C", "el ítem D" etc.
        // Elimina la letra dejando el resto de la frase intacta
        clean = clean.replace(
            /\b(la\s+)?(?:opci[oó]n|alternativa|respuesta|ítem|inciso|literal)\s+([A-E])\b/gi,
            '$1opción correcta'
        );

        // Patrón 2: "la A es correcta", "la B es la respuesta"
        clean = clean.replace(
            /\bla\s+([A-E])\s+(es|siendo|resulta|corresponde)/gi,
            'la opción correcta $2'
        );

        // Patrón 3: "respuesta A", "respuesta: A", "es A"
        clean = clean.replace(
            /\b(?:respuesta|respuestas)[:\s]+([A-E])\b/gi,
            'respuesta correcta'
        );

        // Patrón 4: "es la A", "es la B" al final de frase
        clean = clean.replace(
            /\bes\s+la\s+([A-E])([.,;!?]|$)/gi,
            'es la opción correcta$2'
        );

        // Patrón 5: Letras sueltas entre paréntesis que sean referencias de opción: "(A)", "(B)"
        // Solo las elimina si van precedidas de "opción", "alternativa", "respuesta"
        clean = clean.replace(
            /\b(opci[oó]n|alternativa|respuesta)\s*\(([A-E])\)/gi,
            '$1 correcta'
        );

        // Patrón 6: La respuesta correcta es la primera/segunda/tercera/cuarta/quinta opción
        clean = clean.replace(
            /\b(la\s+)?(?:opci[oó]n|alternativa|respuesta)\s+(primera|segunda|tercera|cuarta|quinta)\b/gi,
            '$1opción correcta'
        );

        if (clean !== explanation) {
            console.log('🧹 [SanitizeExplanation] Referencias de letra eliminadas de la explicación.');
        }

        return clean;
    }

    /**
     * Generación masiva con validación de target.
     */
    async generateRAGQuestions(target, studyAreas, career, amount = 10, isUserRequest = false, difficulty = null) {
        // 🛡️ BARRERA ELIMINADA: Anteriormente solo se permitía ASCENSO y SERUMS.
        // Ahora el sistema es Universal RAG, por lo que permitimos todos los targets.
        const normalizedTarget = target.toUpperCase();

        try {
            const db = require('../../infrastructure/database/db');
            let areasArray = Array.isArray(studyAreas) ? studyAreas : studyAreas.split(',').map(a => a.trim());
            let allQuestions = [];

            console.log(`🚀 Iniciando Generación Premium V7.0 para ${normalizedTarget} (${amount} items, isUserRequest: ${isUserRequest})...`);
            console.log(`🧠 Memoria de Repetición: Cargando últimas 15 preguntas de la BD.`);

            // 🧠 MEMORIA DE LARGO PLAZO
            const lastQuestionsRes = await db.query(
                "SELECT question_text, subtopic FROM question_bank WHERE target = $1 AND career = $2 ORDER BY created_at DESC LIMIT 25",
                [normalizedTarget, career]
            );
            const globalHistory = [];
            lastQuestionsRes.rows.forEach(r => {
                if (r.question_text) globalHistory.push(r.question_text);
                if (r.subtopic) globalHistory.push(`TEMA: ${r.subtopic}`);
            });
            let batchHistory = [...globalHistory]; // Memoria dinámica que crecerá

            let totalAttempts = 0;
            const maxAttempts = amount * 2; // Límite de seguridad para evitar bucles infinitos

            // Bucle de Garantía de Cuota: No paramos hasta tener el 'amount' deseado
            while (allQuestions.length < amount && totalAttempts < maxAttempts) {
                totalAttempts++;

                // Rotación de áreas temática basada en lo que ya tenemos generado con éxito
                const area = areasArray[allQuestions.length % areasArray.length];

                console.log(`📝 [Generando ${allQuestions.length + 1}/${amount}] Área: ${area} (Intento: ${totalAttempts})`);

                const q = await this._generateSingleQuestion(normalizedTarget, area, career, batchHistory, isUserRequest, difficulty);

                if (q) {
                    allQuestions.push(q);
                    // Guardamos tanto el texto como el subtema para evitar repeticiones semánticas
                    batchHistory.push(q.question_text);
                    if (q.subtopic) batchHistory.push(`TEMA: ${q.subtopic}`);

                    console.log(`✅ [Éxito] Pregunta añadida. Progreso: ${allQuestions.length}/${amount}`);
                } else {
                    console.warn(`⚠️ [Fallo] Intento fallido para la pregunta ${allQuestions.length + 1}. Reintentando con nuevas keywords...`);
                }

                // Pequeño delay para estabilidad de cuotas de API (omitido para usuarios finales en vivo)
                if (allQuestions.length < amount && !isUserRequest) {
                    await new Promise(r => setTimeout(r, 1200));
                }
            }

            if (allQuestions.length < amount) {
                console.warn(`🚨 [Atención] No se pudo completar la cuota total (${allQuestions.length}/${amount}) tras ${totalAttempts} intentos.`);
            }

            return allQuestions;
        } catch (error) {
            console.error('❌ Error en AdminAiService:', error.message);
            throw error;
        }
    }

    /**
     */
    async _generateSingleQuestion(target, area, career, history = [], isUserRequest = false, difficulty = null) {
        try {
            const db = require('../../infrastructure/database/db');
            const LANGUAGE_TARGETS = ['TOEFL', 'IELTS', 'TECH_ENGLISH', 'MCER', 'CELI', 'CILS'];
            const isLanguage = (target && LANGUAGE_TARGETS.includes(target.toUpperCase())) || target === 'languages';

            // 🧠 CONSULTA DE PREVENCIÓN DE DUPLICADOS VECTORIAL/TEMÁTICA
            // Buscamos todas las preguntas existentes para este target y area (topic) en la BD, priorizando la carrera si existe
            let existingRes;
            if (career) {
                existingRes = await db.query(
                    `SELECT question_text, subtopic 
                     FROM question_bank 
                     WHERE target = $1 AND unaccent(UPPER(topic)) = unaccent(UPPER($3))
                     ORDER BY (career = $2) DESC, created_at DESC LIMIT 50`,
                    [target, career, area]
                );
            } else {
                existingRes = await db.query(
                    `SELECT question_text, subtopic 
                     FROM question_bank 
                     WHERE target = $1 AND unaccent(UPPER(topic)) = unaccent(UPPER($2))
                     ORDER BY created_at DESC LIMIT 50`,
                    [target, area]
                );
            }

            const topicHistory = [];
            existingRes.rows.forEach(r => {
                if (r.question_text) topicHistory.push(r.question_text);
                if (r.subtopic) topicHistory.push(`TEMA: ${r.subtopic}`);
            });

            // Combinar historial de la BD con el historial de la tanda/sesión
            const combinedHistory = [...new Set([...topicHistory, ...history])];

            if (isLanguage) {
                // Determinar el idioma y especificaciones basados en career (dialecto)
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

                const cefrLevel = difficulty || 'B1';

                let areaInstructions = "";
                if (area === 'Grammar & Use of English') {
                    areaInstructions = `Focus on grammar, syntax, word order, verb conjugations, prepositions, or sentence structure appropriate for CEFR level ${cefrLevel}. The question text MUST contain exactly one blank space represented by '_____' (5 underscores) where the correct option fits.`;
                } else if (area === 'Vocabulary & Context') {
                    areaInstructions = `Focus on vocabulary, word choice, synonyms/antonyms, phrasal verbs, idioms, or contextual meaning appropriate for CEFR level ${cefrLevel}. The question text MUST contain exactly one blank space represented by '_____' (5 underscores) where the correct option fits.`;
                } else if (area === 'Reading Comprehension') {
                    areaInstructions = `Provide a short reading passage (1-2 paragraphs) in the target language, followed by a question that tests comprehension, main idea, detail, or inference at CEFR level ${cefrLevel}. Structure the question_text as: "[Reading Passage]\n\nQuestion: [Comprehension Question]"`;
                } else if (area === 'Listening Comprehension') {
                    areaInstructions = `Create a script for a listening task (dialogue, announcement, or monologue) in the target language at CEFR level ${cefrLevel}. Store this script in the 'audio_text' field (max 100 words). The 'question_text' should be a question testing comprehension of that script. (e.g., 'According to the speaker, what is the main goal...?')`;
                }

                const historyString = (combinedHistory && combinedHistory.length > 0)
                    ? `HISTORIAL DE PREGUNTAS YA EXISTENTES (PROHIBIDO GENERAR ESTAS PREGUNTAS O VARIACIONES SIMILARES):\n${combinedHistory.slice(-30).map((h, i) => `${i + 1}. ${h}`).join('\n')}`
                    : "No hay preguntas previas.";

                const languagePrompt = `
                Actúa como un profesor experto y creador de exámenes internacionales de idiomas (tipo TOEFL, IELTS, Cambridge, CELI).
                Genera UNA pregunta de opción múltiple con las siguientes especificaciones:
                
                ${languageDetails}
                - Nivel MCER (CEFR) objetivo: ${cefrLevel}
                - Habilidad / Área a evaluar: ${area}
                - Especificaciones de la habilidad: ${areaInstructions}
                
                🚨 REGLAS DE ORO DE IDIOMAS:
                1. El enunciado de la pregunta (question_text), el pasaje de lectura (si aplica), el script de audio (si aplica) y todas las opciones de respuesta (options) DEBEN estar escritos 100% en el idioma objetivo (${career.split('-')[0]}). No incluyas español en estas partes.
                2. La explicación (explanation) DEBE estar escrita en ESPAÑOL, explicando de forma clara y didáctica la gramática, vocabulario o justificación de la respuesta correcta.
                3. Genera exactamente 4 opciones de respuesta. Evita el sesgo de longitud: TODAS las 4 opciones de respuesta deben tener una longitud similar (aproximadamente el mismo número de palabras). La opción correcta NO debe ser más detallada, más larga ni más descriptiva que los distractores.
                4. Sin letras (A, B, C, D) al inicio de las opciones.
                5. Escapa correctamente cualquier comilla doble interna usando \\" para que no se ronpa el JSON.
                6. Para preguntas que NO sean de 'Listening Comprehension', el campo 'audio_text' debe ser nulo.
                7. Para las áreas 'Grammar & Use of English' y 'Vocabulary & Context', el enunciado de la pregunta ('question_text') DEBE incluir obligatoriamente un espacio en blanco representado exactamente por 5 guiones bajos ('_____') para que el usuario sepa dónde completar el conector, palabra o frase correspondiente.
                8. EVITAR DUPLICADOS Y CLONES: Revisa el historial de preguntas ya existentes que se proporciona abajo y genera una pregunta completamente nueva sobre un tema, situación, vocabulario o contexto diferente. No repitas ni adaptes levemente las preguntas existentes.
                
                ${historyString}
                
                RESPONDE ÚNICAMENTE CON EL SIGUIENTE FORMATO JSON (sin bloques de código markdown ni texto adicional):
                {
                  "question_text": "Texto de la pregunta (e.g. 'Complete the sentence: She _____ to the store yesterday.' o el pasaje de lectura seguido de la pregunta)",
                  "options": ["went", "goes", "has gone", "will go"],
                  "correct_option_index": 0,
                  "explanation": "Explicación didáctica en español sobre por qué 'went' es la opción correcta debido al adverbio de tiempo 'yesterday'.",
                  "topic": "${area}",
                  "difficulty": "${cefrLevel}",
                  "career": "${career}",
                  "audio_text": ${area === 'Listening Comprehension' ? '"Script del audio en el idioma objetivo para que sea sintetizado."' : 'null'}
                }
                `;

                console.log(`🤖 [Language Gen] Generando pregunta de idiomas de nivel ${cefrLevel} para el área '${area}' en variante '${career}'`);
                const result = await this.model.generateContent(languagePrompt);
                const responseText = result.response.candidates[0].content.parts[0].text;
                const questionObj = this._parseJSON(responseText);

                // Asegurar que contenga los campos necesarios
                questionObj.topic = area;
                questionObj.difficulty = cefrLevel;
                questionObj.career = career;

                let question = questionObj;

                const checkLanguageQuality = (q) => {
                    const issues = [];
                    if (!q.options || q.options.length !== 4) {
                        issues.push(`La pregunta debe tener exactamente 4 opciones. Actualmente tiene ${q.options ? q.options.length : 0}.`);
                    }
                    if (q.correct_option_index === undefined || q.correct_option_index < 0 || q.correct_option_index > 3) {
                        issues.push(`El campo 'correct_option_index' debe ser un número entero entre 0 y 3.`);
                    }

                    // Comprobar placeholders para Grammar y Vocabulary
                    const needsPlaceholder = ['Grammar & Use of English', 'Vocabulary & Context'].includes(area);
                    const text = q.question_text || "";
                    const hasPlaceholder = text.includes('_____') || text.includes('____') || text.includes('___');
                    if (needsPlaceholder && !hasPlaceholder) {
                        issues.push(`El enunciado de la pregunta (question_text) para el área '${area}' DEBE incluir un espacio en blanco '_____' (cinco guiones bajos) para indicar la palabra que falta.`);
                    }

                    // Comprobar asimetría de longitud de opciones (evitar que la correcta destaque por longitud)
                    if (q.options && q.options.length === 4 && q.correct_option_index >= 0 && q.correct_option_index <= 3) {
                        const lengths = q.options.map(o => String(o).length);
                        const correctLen = lengths[q.correct_option_index];
                        const distractorLengths = lengths.filter((_, i) => i !== q.correct_option_index);
                        const avgDistractorLen = distractorLengths.reduce((a, b) => a + b, 0) / distractorLengths.length;
                        const maxLen = Math.max(...lengths);
                        const minLen = Math.min(...lengths);

                        // Si la correcta es más del doble de larga que la media de los distractores y difiere por más de 15 caracteres
                        if (Math.abs(correctLen - avgDistractorLen) > 15 || (maxLen - minLen) > 25) {
                            issues.push(`Asimetría detectada en las opciones de respuesta. La opción correcta tiene longitud ${correctLen} mientras que los distractores tienen una longitud promedio de ${Math.round(avgDistractorLen)}. Todas las opciones deben tener una longitud y nivel de detalle similar para evitar pistas obvias.`);
                        }
                    }

                    // Evitar duplicados con comparación avanzada (exacta, subcadena y Jaccard por palabras)
                    const normGenText = text.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const isDuplicate = combinedHistory.some(histItem => {
                        if (!histItem) return false;
                        let histText = "";
                        if (typeof histItem === 'string') {
                            if (histItem.startsWith('TEMA:')) return false;
                            histText = histItem;
                        } else {
                            histText = histItem.question_text || "";
                        }

                        const normHistText = histText.toLowerCase().replace(/[^a-z0-9]/g, '');
                        if (normHistText === normGenText) return true;
                        if ((normHistText.length > 15 && normGenText.includes(normHistText)) ||
                            (normGenText.length > 15 && normHistText.includes(normGenText))) {
                            return true;
                        }

                        const wordsGen = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
                        const wordsHist = histText.toLowerCase().split(/\s+/).filter(w => w.length > 2);
                        if (wordsGen.length > 0 && wordsHist.length > 0) {
                            const setGen = new Set(wordsGen);
                            const setHist = new Set(wordsHist);
                            const intersection = new Set([...setGen].filter(x => setHist.has(x)));
                            const union = new Set([...setGen, ...setHist]);
                            const jaccard = intersection.size / union.size;
                            if (jaccard > 0.65) return true;
                        }
                        return false;
                    });
                    if (isDuplicate) {
                        issues.push(`La pregunta generada es un duplicado o clon muy similar a una pregunta del historial de la BD.`);
                    }

                    return issues;
                };

                let issues = checkLanguageQuality(question);
                let auditAttempts = 0;

                while (issues.length > 0 && auditAttempts < 3) {
                    auditAttempts++;
                    console.log(`⚖️ [Auditoría Idiomas L${auditAttempts}] Problemas encontrados:\n- ${issues.join('\n- ')}`);

                    const refinementPrompt = `
                    Actúa como un profesor y editor experto de exámenes internacionales de idiomas.
                    La siguiente pregunta de opción múltiple generada por IA en formato JSON tiene problemas de calidad que deben ser corregidos:

                    Pregunta actual:
                    ${JSON.stringify(question, null, 2)}

                    Problemas detectados a corregir:
                    ${issues.map((iss, idx) => `${idx + 1}. ${iss}`).join('\n')}

                    Por favor, corrige y devuelve la pregunta en formato JSON siguiendo estas instrucciones:
                    1. Si falta el espacio en blanco ('_____') para Grammar o Vocabulary, añádelo en el lugar adecuado del enunciado.
                    2. Si hay asimetría en la longitud de las opciones (es decir, una opción es mucho más larga o descriptiva que las demás, facilitando la respuesta), reescribe las opciones para que TODAS las 4 tengan una longitud, estilo y nivel de detalle similar.
                    3. Si la pregunta es duplicada o muy similar a las del historial, reescribe por completo el enunciado y las opciones para usar un contexto, vocabulario o situación completamente diferente, pero manteniendo el área (${area}) y nivel (${cefrLevel}).
                    4. Asegúrate de que las opciones NO comiencen con letras como A), B), C), D).
                    5. Mantén la explicación didáctica detallada en ESPAÑOL.

                    RESPONDE ÚNICAMENTE CON EL SIGUIENTE FORMATO JSON (sin bloques de código markdown ni texto adicional):
                    {
                      "question_text": "...",
                      "options": [...],
                      "correct_option_index": ...,
                      "explanation": "...",
                      "topic": "${area}",
                      "difficulty": "${cefrLevel}",
                      "career": "${career}",
                      "audio_text": ...
                    }
                    `;

                    try {
                        const refinedResult = await this.model.generateContent(refinementPrompt);
                        const refinedText = refinedResult.response.candidates[0].content.parts[0].text;
                        question = this._parseJSON(refinedText);

                        // Asegurar metadatos correctos
                        question.topic = area;
                        question.difficulty = cefrLevel;
                        question.career = career;

                        issues = checkLanguageQuality(question);
                    } catch (refineErr) {
                        console.error(`⚠️ Error en auditoría/refinamiento de idiomas (intento ${auditAttempts}):`, refineErr.message);
                        break;
                    }
                }

                // Si aún tiene problemas de asimetría o placeholders después de 3 intentos, intentamos sanearlo
                if (issues.length > 0) {
                    console.warn(`🚨 [Calidad Idiomas] Pregunta devuelta con advertencias tras 3 intentos. Saneando lo básico...`);
                    // Asegurar placeholder si es necesario y falta
                    if (['Grammar & Use of English', 'Vocabulary & Context'].includes(area) &&
                        !question.question_text.includes('_____') && !question.question_text.includes('___')) {
                        question.question_text += ' _____';
                    }
                    // Forzar que tenga 4 opciones si no es así
                    if (!question.options || question.options.length !== 4) {
                        question.options = question.options ? question.options.slice(0, 4) : ["option 1", "option 2", "option 3", "option 4"];
                        while (question.options.length < 4) {
                            question.options.push(`option ${question.options.length + 1}`);
                        }
                        question.correct_option_index = 0;
                    }
                }

                // 🛡️ Sanitización final determinista para idiomas: elimina referencias a letras
                question.explanation = this._sanitizeExplanation(question.explanation);

                return question;
            }

            const namespace = target === 'ASCENSO' || target === 'NOMBRAMIENTO' || target === 'ACCESO_CARGOS' ? 'education' : 'medicine';

            // --- FASE 1: EL SELECTOR DE MENÚ (Escoger el tema desde el prospecto) ---
            console.log(`🔍 [Fase 1] Escaneando temario oficial para área: ${area}...`);
            const syllabusList = await this.ragService.getSyllabusContext(namespace, career, area);

            if (!syllabusList || syllabusList.includes("ERROR:")) {
                console.error(`🚨 [Aborto] Temario inválido o vacío. Deteniendo generación para evitar alucinaciones.`);
                return null;
            }

            const selectionPrompt = `Actúa como Director Académico para la carrera de ${career}.
            Aquí tienes fragmentos del TEMARIO OFICIAL (Prospecto):
            ${syllabusList}
            
            HISTORIAL DE TEMAS YA USADOS (PROHIBIDOS):
            ${history.filter(h => h.startsWith('TEMA:')).slice(-15).join('\n')}
            
            HISTORIAL DE PREGUNTAS (CONTEXTO):
            ${history.filter(h => !h.startsWith('TEMA:')).slice(-5).join('\n')}
            
            TAREAS:
            1. Analiza el temario y elige UN subtema específico de la carrera "${career}" que pertenezca ESTRICTAMENTE al área: "${area}". 
            2. Si el temario muestra temas de otras áreas o carreras, IGNÓRALOS. Solo puedes elegir subtemas de "${area}" para "${career}".
            3. Si el área tiene SUB-ÁREAS, elige un punto específico (ej. "1.2 Epidemiología") y no el título general.
            4. El tema elegido NO debe estar en el historial de temas prohibidos.
            5. Genera 2 términos de búsqueda "Sniper" que incluyan palabras técnicas clave (ej: "NTS", "Guía clínica", "Esquema de vacunación", "Manejo clínico", "Normativa") para encontrar el sustento oficial.
            
            RESPONDE SOLO EN JSON:
            { "selectedTopic": "Nombre del tema", "searchTerms": ["termino 1", "termino 2"] }`;

            const selectionResult = await this.model.generateContent(selectionPrompt);
            const selectionData = this._parseJSON(selectionResult.response.candidates[0].content.parts[0].text);

            const selectedSubtopic = selectionData.selectedTopic;
            const technicalSearchTerms = selectionData.searchTerms.join(' ');
            console.log(`🎯 [Fase 1] Tema Elegido: ${selectedSubtopic}`);

            // --- FASE 2: EL INVESTIGADOR (Doble Búsqueda: Teoría + Molde de Examen Real) ---
            const isEducation = ['ASCENSO', 'NOMBRAMIENTO', 'ACCESO_CARGOS'].includes(target);
            let fullContext = { syllabus: selectedSubtopic };

            if (!isUserRequest) {
                const maxQuestions = isEducation ? 60 : 100;
                const randomQuestionNum = Math.floor(Math.random() * maxQuestions) + 1;
                const year = isEducation ? (Math.random() > 0.5 ? '2025' : '2024') : '2025';

                let examIdentity = "";
                let styleSearchTerms = [];

                if (isEducation) {
                    const level = career.replace('EBR - ', '').trim();
                    examIdentity = `Prueba ${target} EBR ${level} ${area} Año ${year} Pregunta ${randomQuestionNum}`;
                    styleSearchTerms = [examIdentity];
                } else {
                    // Medicina: Sniper quirúrgico sin términos de educación
                    const isNursing = career.toLowerCase().includes('enfermeria');
                    const careerTag = isNursing ? 'Enfermería' : 'Medicina Humana';

                    // Los exámenes médicos suelen tener el número seguido de un punto (ej: "78.")
                    examIdentity = `${target} ${careerTag} Item ${randomQuestionNum}`;

                    // Sniper Terms: Buscamos el número solo (muy potente) + el contexto profesional
                    styleSearchTerms = [
                        `${randomQuestionNum}.`,
                        `${target} ${careerTag} 2025`,
                        `${target} ${careerTag} ${area}`
                    ];
                }

                console.log(`📚 [Fase 2] Investigando Teoría para: ${selectedSubtopic}`);
                console.log(`🎭 [Fase 2] Capturando Moldes Reales de: ${examIdentity}`);

                const [theoryContext, styleContext] = await Promise.all([
                    // Búsqueda de Teoría (basada en el tema)
                    this.ragService.getTechnicalBasis(namespace, selectedSubtopic, technicalSearchTerms, 5),
                    // Búsqueda de Moldes (basada en la identidad del examen real)
                    this.ragService.getStyleContextByKeywords(namespace, styleSearchTerms, 15)
                ]);

                fullContext.style = styleContext;
                fullContext.basis = theoryContext;
            }

            // --- FASE 3: EL CONSTRUCTOR (Armar la pregunta) ---
            console.log(`🏗️ [Fase 3] Construyendo pregunta casuística (isUserRequest: ${isUserRequest})...`);
            let question;
            if (isUserRequest) {
                let historyText = "No hay contexto de repetición.";
                if (combinedHistory && combinedHistory.length > 0) {
                    historyText = combinedHistory.map(item => {
                        const text = typeof item === 'string' ? item : (item.question_text || "");
                        return `- Escenario usado: "${text.substring(0, 150)}..."`;
                    }).join('\n');
                }
                const prompt = genPrompts.getUserPrompt(target, area, career, historyText, selectedSubtopic);
                const result = await this.model.generateContent(prompt);
                const responseText = result.response.candidates[0].content.parts[0].text;
                let questionArray = this._parseJSON(responseText);
                question = Array.isArray(questionArray) ? questionArray[0] : questionArray;
            } else {
                const prompt = genPrompts.getAdminPrompt(target, area, career, fullContext, combinedHistory, null);
                const result = await this.model.generateContent(prompt);
                const responseText = result.response.candidates[0].content.parts[0].text;
                question = this._parseJSON(responseText);
            }

            // --- FASE 4: EL AUDITOR (Simetría, Calidad, Limpieza de Letras y Consigna) ---
            const checkQuality = (q) => {
                const issues = [];
                const charCounts = q.options.map(o => o.length);
                const correctCharCount = charCounts[q.correct_option_index];
                const othersCharCounts = charCounts.filter((_, i) => i !== q.correct_option_index);
                const avgOthersChars = othersCharCounts.reduce((a, b) => a + b, 0) / othersCharCounts.length;
                const charDiff = correctCharCount - avgOthersChars;

                if (Math.abs(charDiff) > 40) {
                    issues.push(`Asimetría de longitud en opciones: la opción correcta tiene ${correctCharCount} caracteres, mientras que el promedio de distractores tiene ${Math.round(avgOthersChars)} (diferencia de ${Math.round(charDiff)}). Todas las opciones deben tener una longitud similar.`);
                }

                // Nueva regla 1: No letras en explicación — regex ampliado para capturar todos los patrones
                const explanationText = q.explanation || "";
                const hasLettersInExplanation =
                    /\b(?:opci[oó]n|alternativa|respuesta|ítem|inciso|literal)\s+[A-E]\b/i.test(explanationText) ||
                    /\bla\s+[A-E]\s+(?:es|siendo|resulta|corresponde)/i.test(explanationText) ||
                    /\b[A-E]\s+es\s+(?:la\s+)?(?:correcta|correcta|incorrecta)/i.test(explanationText) ||
                    /\bes\s+la\s+[A-E]\b/i.test(explanationText) ||
                    /\brespuesta[:\s]+[A-E]\b/i.test(explanationText);
                if (hasLettersInExplanation) {
                    issues.push("La explicación contiene mención explícita a letras de alternativas (A, B, C, D o E). Las opciones se barajan al mostrarse. Explica de forma 100% conceptual usando el texto de la respuesta, no su letra.");
                }

                // Nueva regla 2: Validar que el enunciado contenga una interrogante o consigna explícita
                const text = q.question_text || "";
                const lacksQuestionPrompt = !text.includes('?') && !text.includes('¿') &&
                    !/indique|señale|determine|seleccione|calcule|identifique/i.test(text);
                if (lacksQuestionPrompt) {
                    issues.push("El enunciado de la pregunta (question_text) carece de una pregunta final clara (¿...?) o de una consigna imperativa explícita al final.");
                }

                // Evitar duplicados con comparación avanzada (exacta, subcadena y Jaccard por palabras)
                const normGenText = text.toLowerCase().replace(/[^a-z0-9]/g, '');
                const isDuplicate = combinedHistory.some(histItem => {
                    if (!histItem) return false;
                    let histText = "";
                    if (typeof histItem === 'string') {
                        if (histItem.startsWith('TEMA:')) return false;
                        histText = histItem;
                    } else {
                        histText = histItem.question_text || "";
                    }

                    const normHistText = histText.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (normHistText === normGenText) return true;
                    if ((normHistText.length > 20 && normGenText.includes(normHistText)) ||
                        (normGenText.length > 20 && normHistText.includes(normGenText))) {
                        return true;
                    }

                    const wordsGen = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
                    const wordsHist = histText.toLowerCase().split(/\s+/).filter(w => w.length > 2);
                    if (wordsGen.length > 0 && wordsHist.length > 0) {
                        const setGen = new Set(wordsGen);
                        const setHist = new Set(wordsHist);
                        const intersection = new Set([...setGen].filter(x => setHist.has(x)));
                        const union = new Set([...setGen, ...setHist]);
                        const jaccard = intersection.size / union.size;
                        if (jaccard > 0.65) return true;
                    }
                    return false;
                });
                if (isDuplicate) {
                    issues.push("La pregunta generada es un duplicado o clon muy similar a una ya existente en la base de datos o en la tanda actual. Por favor, cambia radicalmente la situación o el caso clínico para evaluar el mismo tema.");
                }

                return {
                    isAsymmetric: Math.abs(charDiff) > 40,
                    hasLetters: hasLettersInExplanation,
                    lacksQuestion: lacksQuestionPrompt,
                    isDuplicate: isDuplicate,
                    diff: Math.round(charDiff),
                    issuesList: issues
                };
            };

            let status = checkQuality(question);
            let auditAttempts = 0;

            while ((status.isAsymmetric || status.hasLetters || status.lacksQuestion || status.isDuplicate) && auditAttempts < 3) {
                auditAttempts++;
                console.log(`⚖️ [Auditoría L${auditAttempts}] ${status.isAsymmetric ? 'ASIMETRÍA ' : ''}${status.hasLetters ? 'LETRAS_DETECTADAS ' : ''}${status.lacksQuestion ? 'FALTA_PREGUNTA ' : ''}${status.isDuplicate ? 'DUPLICADA ' : ''}`);

                const refinementPrompt = genPrompts.buildRefinementPrompt(question, status.issuesList);

                const refinedResult = await this.model.generateContent(refinementPrompt);
                const refinedText = refinedResult.response.candidates[0].content.parts[0].text;
                question = this._parseJSON(refinedText);

                status = checkQuality(question);
            }

            // 🚫 [BLOQUEO DE CALIDAD FINAL]
            if (status.isAsymmetric || status.hasLetters || status.lacksQuestion || status.isDuplicate) {
                console.error(`🚨 [Calidad] Rechazando por fallos persistentes (Letras: ${status.hasLetters}, Asimetría: ${status.isAsymmetric}, Falta Pregunta: ${status.lacksQuestion}, Duplicada: ${status.isDuplicate}).`);
                return null;
            }

            // 🛡️ [SANEADOR DE INGENIERÍA: FORZAR CONTEO DE OPCIONES]
            const requiredCount = isEducation ? 3 : (target === 'RESIDENTADO' ? 5 : 4);

            if (question.options.length !== requiredCount) {
                console.log(`🛡️ [Sanitizer] Forzando ${requiredCount} opciones (IA generó ${question.options.length}).`);

                const correctOptionText = question.options[question.correct_option_index];
                const distractors = question.options.filter((_, i) => i !== question.correct_option_index);

                // Re-armamos el array con la correcta + los distractores necesarios
                const newOptions = [correctOptionText, ...distractors.slice(0, requiredCount - 1)];

                // Mezclamos para que la correcta no sea siempre la primera
                for (let i = newOptions.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [newOptions[i], newOptions[j]] = [newOptions[j], newOptions[i]];
                }

                question.options = newOptions;
                question.correct_option_index = newOptions.indexOf(correctOptionText);
            }

            // Enforzar la inyección exacta del subtopic escogido (Fase 1) En todos los casos
            if (question) {
                question.subtopic = selectedSubtopic || question.subtopic || 'Análisis Casuístico';
                // 🛡️ Sanitización final determinista: elimina referencias a letras que hayan escapado la auditoría
                question.explanation = this._sanitizeExplanation(question.explanation);
            }

            return question;
        } catch (error) {
            console.error(`⚠️ Error en generación admin p/ ${area}:`, error.message);
            return null;
        }
    }

    /**
     * Extrae palabras clave del texto del temario para la búsqueda en cascada.
     */
    _extractKeywordsFromSyllabus(text, defaultArea) {
        if (!text) return defaultArea;
        // Limpiamos el texto y tomamos algunas palabras clave representativas (no todas)
        // Eliminamos palabras comunes y conectores
        const words = text.split(/\s+/)
            .filter(w => w.length > 4)
            .filter(w => !['FRAGMENTO', 'TEMARIO', 'OFICIAL', 'FUENTE'].includes(w.toUpperCase()))
            .slice(0, 10); // Tomamos las primeras 10 palabras relevantes

        return words.length > 0 ? words.join(' ') : defaultArea;
    }

    /**
     * 🔎 SNIPER RAG: Genera términos de búsqueda directos y aleatorios.
     * En lugar de pedirle a la IA, el código elige una "Pregunta Objetivo" (1-60).
     */
    async _generateSearchKeywords(target, area, career) {
        try {
            const isEducation = ['ASCENSO', 'NOMBRAMIENTO', 'ACCESO_CARGOS'].includes(target);
            const maxQuestions = isEducation ? 60 : 100;
            const randomQuestionNum = Math.floor(Math.random() * maxQuestions) + 1;
            const years = isEducation ? ["2025", "2024"] : ["2025"];
            const year = years[Math.floor(Math.random() * years.length)];

            if (isEducation) {
                const parts = career.split(' - ');
                const nivel = (parts[1] || "").trim();
                const rawSpecialty = (parts[parts.length - 1] || "").trim();

                // Normalización robusta para nombres de archivos PDF
                const especialidad = rawSpecialty
                    .replace(/Profesor de /gi, '')
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
                    .replace(/ /g, '_');

                // Si la especialidad es igual al nivel (ej. Inicial - Inicial), no la repetimos
                const especialidadSuffix = (especialidad.toLowerCase() === nivel.toLowerCase()) ? "" : `_${especialidad}`;

                const normalizedTarget = target.charAt(0).toUpperCase() + target.slice(1).toLowerCase();
                const sourceFile = `Prueba_${normalizedTarget}_EBR_${nivel}${especialidadSuffix}_${year}.pdf`;

                // 1. Sniper Term (Style) | 2. Knowledge Term | 3. Hard Filter (Filename)
                return [
                    `Prueba ${normalizedTarget} EBR ${nivel} ${especialidad} Año ${year} Pregunta ${randomQuestionNum}`,
                    `${area} ${nivel} ${especialidad} casuística enfoque pedagógico`,
                    sourceFile
                ];
            } else {
                // Medicina (ENAM/SERUMS/RESIDENTADO) - Sniper RAG de Alta Precisión
                const isNursing = career.toLowerCase().includes('enfermeria');
                const careerTag = isNursing ? 'enfermeria' : 'medicina';

                // Mapeo de archivos reales para SERUMS (según Pinecone)
                let sourceFile = null;
                if (target === 'SERUMS') {
                    const pool = isNursing
                        ? ["SERUMS-enfermeria.pdf", "SERUMS-enfermeria-tipo-a.pdf", "SERUMS-enfermeria-tipo-b.pdf"]
                        : ["SERUMS-medicina.pdf", "SERUMS-medicina-tipo-a.pdf", "SERUMS-medicina-tipo-b.pdf"];

                    sourceFile = pool[Math.floor(Math.random() * pool.length)];
                }

                const styleTerm = `${target} ${careerTag} ${randomQuestionNum}.`;

                return [
                    styleTerm,
                    `${area} ${careerTag} casuística manejo clínico oficial`,
                    sourceFile // Filtro duro si existe
                ];
            }
        } catch (error) {
            console.error("❌ Error en Sniper Keywords:", error.message);
            return [`${target} ${career} ${area}`];
        }
    }
}

module.exports = new AdminAiService();
