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

    /**
     * Generación masiva con validación de target.
     */
    async generateRAGQuestions(target, studyAreas, career, amount = 10, isUserRequest = false) {
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
                "SELECT question_text FROM question_bank WHERE target = $1 AND career = $2 ORDER BY created_at DESC LIMIT 15",
                [normalizedTarget, career]
            );
            const globalHistory = lastQuestionsRes.rows.map(r => r.question_text);
            let batchHistory = [...globalHistory]; // Memoria dinámica que crecerá

            let totalAttempts = 0;
            const maxAttempts = amount * 2; // Límite de seguridad para evitar bucles infinitos

            // Bucle de Garantía de Cuota: No paramos hasta tener el 'amount' deseado
            while (allQuestions.length < amount && totalAttempts < maxAttempts) {
                totalAttempts++;

                // Rotación de áreas temática basada en lo que ya tenemos generado con éxito
                const area = areasArray[allQuestions.length % areasArray.length];

                console.log(`📝 [Generando ${allQuestions.length + 1}/${amount}] Área: ${area} (Intento: ${totalAttempts})`);

                const q = await this._generateSingleQuestion(normalizedTarget, area, career, batchHistory, isUserRequest);

                if (q) {
                    allQuestions.push(q);
                    // Guardamos tanto el texto como el subtema para evitar repeticiones semánticas
                    batchHistory.push(q.question_text);
                    if (q.syllabus) batchHistory.push(`TEMA: ${q.syllabus}`);

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
     * _generateSingleQuestion: Pipeline Robotizado de 4 Fases.
     */
    async _generateSingleQuestion(target, area, career, history = [], isUserRequest = false) {
        try {
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
            const selectionData = JSON.parse(selectionResult.response.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim());

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
                if (history && history.length > 0) {
                    historyText = history.map(item => {
                        const text = typeof item === 'string' ? item : (item.question_text || "");
                        return `- Escenario usado: "${text.substring(0, 150)}..."`;
                    }).join('\n');
                }
                const prompt = genPrompts.getUserPrompt(target, area, career, historyText, selectedSubtopic);
                const result = await this.model.generateContent(prompt);
                const responseText = result.response.candidates[0].content.parts[0].text;
                let questionArray = JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '').trim());
                question = Array.isArray(questionArray) ? questionArray[0] : questionArray;
            } else {
                const prompt = genPrompts.getAdminPrompt(target, area, career, fullContext, history, null);
                const result = await this.model.generateContent(prompt);
                const responseText = result.response.candidates[0].content.parts[0].text;
                question = JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '').trim());
            }

            // --- FASE 4: EL AUDITOR (Simetría, Calidad, Limpieza de Letras y Consigna) ---
            const checkQuality = (q) => {
                const charCounts = q.options.map(o => o.length);
                const correctCharCount = charCounts[q.correct_option_index];
                const othersCharCounts = charCounts.filter((_, i) => i !== q.correct_option_index);
                const avgOthersChars = othersCharCounts.reduce((a, b) => a + b, 0) / othersCharCounts.length;
                const charDiff = correctCharCount - avgOthersChars;

                // Nueva regla 1: No letras en explicación (A, B, C, Alternativa A, etc)
                const hasLettersInExplanation = /la opción [ABC]|la alternativa [ABC]|en [ABC]|la [ABC] es/i.test(q.explanation || "");

                // Nueva regla 2: Validar que el enunciado contenga una interrogante o consigna explícita
                const text = q.question_text || "";
                const lacksQuestionPrompt = !text.includes('?') && !text.includes('¿') &&
                    !/indique|señale|determine|seleccione|calcule|identifique/i.test(text);

                return {
                    isAsymmetric: Math.abs(charDiff) > 10,
                    hasLetters: hasLettersInExplanation,
                    lacksQuestion: lacksQuestionPrompt,
                    correctLen: correctCharCount,
                    avgOthers: avgOthersChars,
                    diff: Math.round(charDiff)
                };
            };

            let status = checkQuality(question);
            let auditAttempts = 0;

            while ((status.isAsymmetric || status.hasLetters || status.lacksQuestion) && auditAttempts < 3) {
                auditAttempts++;
                console.log(`⚖️ [Auditoría L${auditAttempts}] ${status.isAsymmetric ? 'ASIMETRÍA ' : ''}${status.hasLetters ? 'LETRAS_DETECTADAS ' : ''}${status.lacksQuestion ? 'FALTA_PREGUNTA' : ''}`);

                const refinementPrompt = genPrompts.buildRefinementPrompt(question);

                const refinedResult = await this.model.generateContent(refinementPrompt);
                const refinedText = refinedResult.response.candidates[0].content.parts[0].text;
                question = JSON.parse(refinedText.replace(/```json/g, '').replace(/```/g, '').trim());

                status = checkQuality(question);
            }

            // 🚫 [BLOQUEO DE CALIDAD FINAL]
            if (status.isAsymmetric || status.hasLetters || status.lacksQuestion) {
                console.error(`🚨 [Calidad] Rechazando por fallos persistentes (Letras: ${status.hasLetters}, Asimetría: ${status.diff}, Falta Pregunta: ${status.lacksQuestion}).`);
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
