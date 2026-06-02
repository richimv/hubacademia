const { VertexAI } = require('@google-cloud/vertexai');
const QuestionRagService = require('./questionRagService');
const genPrompts = require('../prompts/generationPrompts');

/**
 * 👑 ADMIN AI SERVICE (V7.1): Generación de Alta Fidelidad para Banco Oficial.
 * - Flujo Unificado Multi-Dominio: Medicina, Educación e Idiomas.
 * - Pipeline RAG / AI Auditor en bucle cerrado de refinamiento.
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
     * Se aplica como último escudo antes de retornar cualquier pregunta generada.
     */
    _sanitizeExplanation(explanation) {
        if (!explanation || typeof explanation !== 'string') return explanation;

        let clean = explanation;

        // Patrón 1: "la opción A", "la alternativa B", "la respuesta C", "el ítem D" etc.
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
     * 🛡️ VALIDADOR DE CALIDAD PSICOMÉTRICA UNIFICADO (AI AUDITOR SCOUT)
     * Centraliza todas las reglas de negocio, asimetría, duplicados y exclusión de letras
     * para asegurar coherencia transversal en todos los módulos de Hub Academia.
     */
    _checkQuality(question, target, area, career, difficulty, isLanguage, combinedHistory) {
        const issues = [];
        const isEducation = ['ASCENSO', 'NOMBRAMIENTO', 'ACCESO_CARGOS'].includes(target);
        const requiredCount = isLanguage ? 4 : (isEducation ? 3 : (target === 'RESIDENTADO' ? 5 : 4));

        if (!question.options || question.options.length !== requiredCount) {
            issues.push(`La pregunta debe tener exactamente ${requiredCount} opciones. Actualmente tiene ${question.options ? question.options.length : 0}.`);
        }

        if (question.correct_option_index === undefined || question.correct_option_index < 0 || question.correct_option_index >= (question.options ? question.options.length : 0)) {
            issues.push(`El campo 'correct_option_index' debe ser un índice válido correspondiente a las opciones disponibles.`);
        }

        // 1. Asimetría de Longitud de Opciones
        if (question.options && question.options.length === requiredCount && question.correct_option_index >= 0 && question.correct_option_index < requiredCount) {
            const lengths = question.options.map(o => String(o || '').length);
            const correctLen = lengths[question.correct_option_index];
            const distractorLengths = lengths.filter((_, i) => i !== question.correct_option_index);
            const avgDistractorLen = distractorLengths.reduce((a, b) => a + b, 0) / distractorLengths.length;
            const maxLen = Math.max(...lengths);
            const minLen = Math.min(...lengths);

            if (isLanguage) {
                // Umbral más estricto para idiomas
                if (Math.abs(correctLen - avgDistractorLen) > 15 || (maxLen - minLen) > 25) {
                    issues.push(`Asimetría detectada en opciones de idiomas. Opción correcta: ${correctLen} letras, Distractores promedio: ${Math.round(avgDistractorLen)}. Deben ser similares en extensión y detalle.`);
                }
            } else {
                // Umbral estándar
                const charDiff = correctLen - avgDistractorLen;
                if (Math.abs(charDiff) > 40) {
                    issues.push(`Asimetría detectada. Opción correcta: ${correctLen} letras, Distractores promedio: ${Math.round(avgDistractorLen)} (Diferencia de ${Math.round(charDiff)}). Todas las opciones deben tener una longitud similar.`);
                }
            }
        }

        // 2. Prohibición de Letras/Números de Alternativas en la Explicación
        const explanationText = question.explanation || "";
        const hasLettersInExplanation =
            /\b(?:opci[oó]n|alternativa|respuesta|ítem|inciso|literal)\s+[A-E]\b/i.test(explanationText) ||
            /\bla\s+[A-E]\s+(?:es|siendo|resulta|corresponde)/i.test(explanationText) ||
            /\b[A-E]\s+es\s+(?:la\s+)?(?:correcta|incorrecta)/i.test(explanationText) ||
            /\bes\s+la\s+[A-E]\b/i.test(explanationText) ||
            /\brespuesta[:\s]+[A-E]\b/i.test(explanationText);
        if (hasLettersInExplanation) {
            issues.push("La explicación contiene mención explícita a letras de alternativas (A, B, C, D o E). Las opciones se barajan al mostrarse. Explica de forma 100% conceptual en español, refiriéndote a la frase o respuesta exacta sin usar su letra.");
        }

        // 3. Placeholder de Completación (Solo para Idiomas - Gramática/Vocabulario)
        if (isLanguage) {
            const needsPlaceholder = ['Grammar & Use of English', 'Vocabulary & Context'].includes(area);
            const text = question.question_text || "";
            const hasPlaceholder = text.includes('_____') || text.includes('____') || text.includes('___');
            if (needsPlaceholder && !hasPlaceholder) {
                issues.push(`El enunciado de la pregunta (question_text) para el área '${area}' DEBE incluir un espacio en blanco '_____' (cinco guiones bajos) para indicar la palabra a completar.`);
            }
        }

        // 4. Pregunta o Consigna Explícita (Solo para Medicina y Educación)
        if (!isLanguage) {
            const text = question.question_text || "";
            const lacksQuestionPrompt = !text.includes('?') && !text.includes('¿') &&
                !/indique|señale|determine|seleccione|calcule|identifique/i.test(text);
            if (lacksQuestionPrompt) {
                issues.push("El enunciado de la pregunta (question_text) carece de una pregunta final clara (¿...?) o de una consigna imperativa explícita al final.");
            }
        }

        // 5. Prevención de Duplicados (Comparación Semántica y Jaccard)
        const text = question.question_text || "";
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
            issues.push("La pregunta generada es un duplicado o clon muy similar a una pregunta ya existente en la base de datos o en la tanda actual.");
        }

        return {
            isValid: issues.length === 0,
            issuesList: issues
        };
    }

    /**
     * Generación masiva con validación de target.
     */
    async generateRAGQuestions(target, studyAreas, career, amount = 10, isUserRequest = false, difficulty = null) {
        const normalizedTarget = target.toUpperCase();

        try {
            const db = require('../../infrastructure/database/db');
            let areasArray = Array.isArray(studyAreas) ? studyAreas : studyAreas.split(',').map(a => a.trim());
            let allQuestions = [];

            console.log(`🚀 Iniciando Generación Premium V7.1 para ${normalizedTarget} (${amount} items, isUserRequest: ${isUserRequest})...`);
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

            while (allQuestions.length < amount && totalAttempts < maxAttempts) {
                totalAttempts++;

                const area = areasArray[allQuestions.length % areasArray.length];
                console.log(`📝 [Generando ${allQuestions.length + 1}/${amount}] Área: ${area} (Intento: ${totalAttempts})`);

                const q = await this._generateSingleQuestion(normalizedTarget, area, career, batchHistory, isUserRequest, difficulty);

                if (q) {
                    allQuestions.push(q);
                    batchHistory.push(q.question_text);
                    if (q.subtopic) batchHistory.push(`TEMA: ${q.subtopic}`);
                    console.log(`✅ [Éxito] Pregunta añadida. Progreso: ${allQuestions.length}/${amount}`);
                } else {
                    console.warn(`⚠️ [Fallo] Intento fallido para la pregunta ${allQuestions.length + 1}. Reintentando...`);
                }

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
     * REFACTORIZADO: Flujo unificado de generación de pregunta individual con auditoría por IA.
     */
    async _generateSingleQuestion(target, area, career, history = [], isUserRequest = false, difficulty = null) {
        try {
            const db = require('../../infrastructure/database/db');
            const LANGUAGE_TARGETS = ['TOEFL', 'IELTS', 'TECH_ENGLISH', 'MCER', 'CELI', 'CILS'];
            const isLanguage = (target && LANGUAGE_TARGETS.includes(target.toUpperCase())) || target === 'languages';

            // 1. Obtener historial específico para duplicados
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
            const combinedHistory = [...new Set([...topicHistory, ...history])];

            let initialPrompt = "";
            let selectedSubtopic = null;

            // 2. Generar el Prompt de Generación Inicial
            if (isLanguage) {
                const cefrLevel = difficulty || 'B1';
                initialPrompt = genPrompts.getLanguagePrompt(target, area, career, cefrLevel, combinedHistory);
                console.log(`🤖 [Language Gen] Generando pregunta de nivel ${cefrLevel} para el área '${area}' (${career})`);
            } else {
                const namespace = target === 'ASCENSO' || target === 'NOMBRAMIENTO' || target === 'ACCESO_CARGOS' ? 'education' : 'medicine';

                // FASE 1: Seleccionar tema desde el prospecto
                console.log(`🔍 [Fase 1] Escaneando temario oficial para área: ${area}...`);
                const syllabusList = await this.ragService.getSyllabusContext(namespace, career, area);

                if (!syllabusList || syllabusList.includes("ERROR:")) {
                    console.error(`🚨 [Aborto] Temario inválido o vacío. Deteniendo generación.`);
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

                selectedSubtopic = selectionData.selectedTopic;
                const technicalSearchTerms = selectionData.searchTerms.join(' ');
                console.log(`🎯 [Fase 1] Tema Elegido: ${selectedSubtopic}`);

                // FASE 2: RAG Dual (Teoría + Estructura de Examen Real)
                let fullContext = { syllabus: selectedSubtopic };

                if (!isUserRequest) {
                    const isEducation = ['ASCENSO', 'NOMBRAMIENTO', 'ACCESO_CARGOS'].includes(target);
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
                        const isNursing = career.toLowerCase().includes('enfermeria');
                        const careerTag = isNursing ? 'Enfermería' : 'Medicina Humana';
                        examIdentity = `${target} ${careerTag} Item ${randomQuestionNum}`;
                        styleSearchTerms = [
                            `${randomQuestionNum}.`,
                            `${target} ${careerTag} 2025`,
                            `${target} ${careerTag} ${area}`
                        ];
                    }

                    console.log(`📚 [Fase 2] Investigando Teoría para: ${selectedSubtopic}`);
                    console.log(`🎭 [Fase 2] Capturando Moldes Reales de: ${examIdentity}`);

                    const [theoryContext, styleContext] = await Promise.all([
                        this.ragService.getTechnicalBasis(namespace, selectedSubtopic, technicalSearchTerms, 5),
                        this.ragService.getStyleContextByKeywords(namespace, styleSearchTerms, 15)
                    ]);

                    fullContext.style = styleContext;
                    fullContext.basis = theoryContext;
                }

                // FASE 3: Constructor de pregunta
                console.log(`🏗️ [Fase 3] Construyendo pregunta (isUserRequest: ${isUserRequest})...`);
                if (isUserRequest) {
                    let historyText = "No hay contexto de repetición.";
                    if (combinedHistory && combinedHistory.length > 0) {
                        historyText = combinedHistory.map(item => {
                            const text = typeof item === 'string' ? item : (item.question_text || "");
                            return `- Escenario usado: "${text.substring(0, 150)}..."`;
                        }).join('\n');
                    }
                    initialPrompt = genPrompts.getUserPrompt(target, area, career, historyText, selectedSubtopic);
                } else {
                    initialPrompt = genPrompts.getAdminPrompt(target, area, career, fullContext, combinedHistory, null);
                }
            }

            // 3. Generar pregunta y ejecutar Bucle de Auditoría por IA (Fase 4)
            const result = await this.model.generateContent(initialPrompt);
            const responseText = result.response.candidates[0].content.parts[0].text;
            let questionObj = this._parseJSON(responseText);
            let question = Array.isArray(questionObj) ? questionObj[0] : questionObj;

            // Forzar metadatos correctos post-generación
            question.topic = area;
            if (isLanguage) {
                question.difficulty = difficulty || 'B1';
                question.career = career;
                question.domain = 'languages';
            }

            let status = this._checkQuality(question, target, area, career, difficulty, isLanguage, combinedHistory);
            let auditAttempts = 0;

            while (!status.isValid && auditAttempts < 3) {
                auditAttempts++;
                console.log(`⚖️ [Auditoría L${auditAttempts}] Problemas encontrados:\n- ${status.issuesList.join('\n- ')}`);

                const refinementPrompt = genPrompts.buildRefinementPrompt(question, status.issuesList);
                try {
                    const refinedResult = await this.model.generateContent(refinementPrompt);
                    const refinedText = refinedResult.response.candidates[0].content.parts[0].text;
                    const parsedRefined = this._parseJSON(refinedText);
                    question = Array.isArray(parsedRefined) ? parsedRefined[0] : parsedRefined;

                    // Mantener consistencia de metadatos
                    question.topic = area;
                    if (isLanguage) {
                        question.difficulty = difficulty || 'B1';
                        question.career = career;
                        question.domain = 'languages';
                    }

                    status = this._checkQuality(question, target, area, career, difficulty, isLanguage, combinedHistory);
                } catch (refineErr) {
                    console.error(`⚠️ Error en auditoría/refinamiento (intento ${auditAttempts}):`, refineErr.message);
                    break;
                }
            }

            // FASE 5: Bloqueo de Calidad final
            if (!status.isValid) {
                console.error(`🚨 [Calidad] Rechazando pregunta por fallos de calidad persistentes tras 3 refinamientos:`, status.issuesList);
                return null;
            }

            // 🛡️ Saneador de Estructura Final (Opciones e indexes)
            const isEducation = ['ASCENSO', 'NOMBRAMIENTO', 'ACCESO_CARGOS'].includes(target);
            const requiredCount = isLanguage ? 4 : (isEducation ? 3 : (target === 'RESIDENTADO' ? 5 : 4));

            if (question.options.length !== requiredCount) {
                console.log(`🛡️ [Sanitizer] Forzando ${requiredCount} opciones (IA generó ${question.options.length}).`);
                const correctOptionText = question.options[question.correct_option_index];
                const distractors = question.options.filter((_, i) => i !== question.correct_option_index);
                const newOptions = [correctOptionText, ...distractors.slice(0, requiredCount - 1)];

                for (let i = newOptions.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [newOptions[i], newOptions[j]] = [newOptions[j], newOptions[i]];
                }
                question.options = newOptions;
                question.correct_option_index = newOptions.indexOf(correctOptionText);
            }

            // Sanitización y formateo final del subtema
            if (isLanguage) {
                question.subtopic = question.subtopic || 'Language Practice';
                if (['Grammar & Use of English', 'Vocabulary & Context'].includes(area) &&
                    !question.question_text.includes('_____') && !question.question_text.includes('___')) {
                    question.question_text += ' _____';
                }
            } else {
                question.subtopic = selectedSubtopic || question.subtopic || 'Análisis Casuístico';
            }

            // Escudo final de sanitización estática
            question.explanation = this._sanitizeExplanation(question.explanation);

            return question;
        } catch (error) {
            console.error(`⚠️ Error en generación individual p/ ${area}:`, error.message);
            return null;
        }
    }

    /**
     * Extrae palabras clave del texto del temario para la búsqueda en cascada.
     */
    _extractKeywordsFromSyllabus(text, defaultArea) {
        if (!text) return defaultArea;
        const words = text.split(/\s+/)
            .filter(w => w.length > 4)
            .filter(w => !['FRAGMENTO', 'TEMARIO', 'OFICIAL', 'FUENTE'].includes(w.toUpperCase()))
            .slice(0, 10);

        return words.length > 0 ? words.join(' ') : defaultArea;
    }

    /**
     * 🔎 SNIPER RAG: Genera términos de búsqueda directos y aleatorios.
     */
    async _generateSearchKeywords(target, area, career) {
        try {
            const isEducation = ['ASCENSO', 'NOMBRAMIENTO', 'ACCESO_CARGOS'].includes(target);
            const maxQuestions = isEducation ? 60 : 100;
            const randomQuestionNum = Math.floor(Math.random() * maxQuestions) + 1;
            const years = isEducation ? ["2025", "2024"] : ["2025"];
            const year = years[Math.floor(Math.random() * years.length)];

            if (isEducation) {
                let nivel = '';
                let rawSpecialty = '';

                if (career === 'EBR - Inicial') {
                    nivel = 'Inicial';
                    rawSpecialty = 'Inicial';
                } else if (career === 'EBR - Primaria') {
                    nivel = 'Primaria';
                    rawSpecialty = 'Primaria';
                } else if (career === 'EBR Primaria Profesor de Innovación Pedagógica') {
                    nivel = 'Primaria';
                    rawSpecialty = 'Profesor de Innovación Pedagógica';
                } else if (career === 'EBR Primaria Educación Física') {
                    nivel = 'Primaria';
                    rawSpecialty = 'Educación Física';
                } else if (career.startsWith('EBR - Secundaria')) {
                    nivel = 'Secundaria';
                    rawSpecialty = career.replace('EBR - Secundaria - ', '');
                } else {
                    // Fallback
                    const parts = career.split(' - ');
                    nivel = (parts[1] || "").trim();
                    rawSpecialty = (parts[parts.length - 1] || "").trim();
                }

                const especialidad = rawSpecialty
                    .replace(/Profesor de /gi, '')
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .replace(/ /g, '_');

                const especialidadSuffix = (especialidad.toLowerCase() === nivel.toLowerCase()) ? "" : `_${especialidad}`;
                const normalizedTarget = target.charAt(0).toUpperCase() + target.slice(1).toLowerCase();
                const sourceFile = `Prueba_${normalizedTarget}_EBR_${nivel}${especialidadSuffix}_${year}.pdf`;

                return [
                    `Prueba ${normalizedTarget} EBR ${nivel} ${especialidad} Año ${year} Pregunta ${randomQuestionNum}`,
                    `${area} ${nivel} ${especialidad} casuística enfoque pedagógico`,
                    sourceFile
                ];
            } else {
                const isNursing = career.toLowerCase().includes('enfermeria');
                const careerTag = isNursing ? 'enfermeria' : 'medicina';

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
                    sourceFile
                ];
            }
        } catch (error) {
            console.error("❌ Error en Sniper Keywords:", error.message);
            return [`${target} ${career} ${area}`];
        }
    }
}

module.exports = new AdminAiService();
