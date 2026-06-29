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
        // Sanitizar GOOGLE_APPLICATION_CREDENTIALS si es una ruta local de Windows o no existe
        const fs = require('fs');
        const path = require('path');
        let keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (keyPath) {
            const isLocalWindowsPath = keyPath.startsWith('C:') || keyPath.includes('\\') || keyPath.includes('Users/');
            const fileExists = fs.existsSync(keyPath);
            if (isLocalWindowsPath || !fileExists) {
                console.warn(`⚠️ [VertexAuth] La ruta GOOGLE_APPLICATION_CREDENTIALS (${keyPath}) es inválida o no existe en este entorno.`);
                const fallbackRootKey = path.join(__dirname, '../../../service-account-key.json');
                if (fs.existsSync(fallbackRootKey)) {
                    console.log(`✅ [VertexAuth] Usando archivo de credenciales de respaldo: ${fallbackRootKey}`);
                    process.env.GOOGLE_APPLICATION_CREDENTIALS = fallbackRootKey;
                } else {
                    console.warn(`🚨 [VertexAuth] No se encontró service-account-key.json de respaldo. Limpiando variable para evitar fallos ENOENT.`);
                    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
                }
            }
        }

        const project = process.env.GOOGLE_CLOUD_PROJECT;
        const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
        this.vertex_ai = new VertexAI({ project, location });
        
        // Modelo primario Gemini 3.1 sin razonamiento para optimización de costos
        this.model = this.vertex_ai.getGenerativeModel({
            model: 'gemini-3.1-flash-lite',
            generationConfig: {
                maxOutputTokens: 16384,
                temperature: 0.4,
                responseMimeType: "application/json"
            }
        });

        // Modelo de respaldo (fallback de emergencia) en caso de limitaciones de región/proyecto en Vertex AI
        this.fallbackModel = this.vertex_ai.getGenerativeModel({
            model: 'gemini-2.5-flash-lite',
            generationConfig: {
                maxOutputTokens: 16384,
                temperature: 0.4,
                responseMimeType: "application/json"
            }
        });

        // Asignar el servicio RAG (ya es una instancia exportada como Singleton)
        this.ragService = QuestionRagService;

        // Bandera de caché en memoria para disponibilidad del modelo 3.1 en Vertex AI
        this.vertexModel31Supported = true;
    }

    /**
     * 🧠 LLAMADOR DE MODELO DUAL Y RESILIENTE (AI CHANNELER)
     * Ejecuta la llamada a Gemini 3.1 Flash-Lite utilizando la API REST de Google AI Studio (si hay GEMINI_API_KEY)
     * o mediante Vertex AI. Cuenta con fallback automático a Gemini 2.5 Flash-Lite en caso de errores de acceso o región.
     */
    async _callModel(prompt) {
        const apiKey = process.env.GEMINI_API_KEY;
        let restError = null;

        if (apiKey) {
            try {
                const axios = require('axios');
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;
                const payload = {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.4
                    }
                };
                console.log("📡 [REST] Llamando a gemini-3.1-flash-lite a través de Google AI Studio...");
                const res = await axios.post(url, payload, { timeout: 15000 });
                if (res.data && res.data.candidates && res.data.candidates[0] && res.data.candidates[0].content) {
                    const text = res.data.candidates[0].content.parts[0].text;
                    return {
                        response: {
                            candidates: [{
                                content: { parts: [{ text }] }
                            }]
                        }
                    };
                }
            } catch (err) {
                restError = err;
                console.warn("⚠️ [REST Fallo] Error al llamar a gemini-3.1-flash-lite vía REST:", err.message);
                if (err.response && err.response.data) {
                    console.warn("❌ [REST Detalles]:", JSON.stringify(err.response.data));
                }
                
                // REST Fallback a gemini-2.5-flash-lite si la 3.1 falló (pero la API key es válida)
                const isAuthError = err.response && (err.response.status === 400 || err.response.status === 403);
                if (!isAuthError) {
                    try {
                        const axios = require('axios');
                        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
                        const payload = {
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: {
                                responseMimeType: "application/json",
                                temperature: 0.4
                            }
                        };
                        console.log("📡 [REST Fallback] Reintentando con gemini-2.5-flash-lite vía REST...");
                        const fallbackRes = await axios.post(fallbackUrl, payload, { timeout: 15000 });
                        if (fallbackRes.data && fallbackRes.data.candidates && fallbackRes.data.candidates[0] && fallbackRes.data.candidates[0].content) {
                            const text = fallbackRes.data.candidates[0].content.parts[0].text;
                            return {
                                response: {
                                    candidates: [{
                                        content: { parts: [{ text }] }
                                    }]
                                }
                            };
                        }
                    } catch (fallbackErr) {
                        console.warn("⚠️ [REST Fallback Fallo] Error con gemini-2.5-flash-lite vía REST:", fallbackErr.message);
                        if (fallbackErr.response && fallbackErr.response.data) {
                            console.warn("❌ [REST Fallback Detalles]:", JSON.stringify(fallbackErr.response.data));
                        }
                    }
                }
            }
        }

        // Si ya sabemos que Vertex no soporta 3.1, saltar directamente al fallback 2.5
        if (!this.vertexModel31Supported) {
            console.log("📡 [VertexAI Bypass] gemini-3.1-flash-lite marcado como no soportado. Usando gemini-2.5-flash-lite directamente...");
            try {
                return await this.fallbackModel.generateContent(prompt);
            } catch (vertexErr) {
                console.error("❌ [VertexAI Fallo Crítico] Falló fallbackModel en Vertex:", vertexErr);
                if (restError) throw restError;
                throw vertexErr;
            }
        }

        // Intento por Vertex AI (Canal Secundario)
        try {
            console.log("📡 [VertexAI] Llamando a gemini-3.1-flash-lite...");
            return await this.model.generateContent(prompt);
        } catch (err) {
            // Si el error es 404 (modelo no disponible en la región/proyecto) o cualquier otro error crítico, hacer downgrade
            const isNotAvailable = err.message && (err.message.includes('404') || err.message.includes('NOT_FOUND') || err.message.includes('access'));
            if (isNotAvailable) {
                this.vertexModel31Supported = false; // Marcar en memoria
                console.warn("🚨 [VertexAI Fallback] gemini-3.1-flash-lite no disponible en tu región/proyecto. Aplicando downgrade de emergencia a gemini-2.5-flash-lite...");
                try {
                    return await this.fallbackModel.generateContent(prompt);
                } catch (vertexErr) {
                    console.error("❌ [VertexAI Fallo Crítico] Falló fallbackModel en Vertex tras downgrade:", vertexErr);
                    if (restError) throw restError;
                    throw vertexErr;
                }
            }
            // Si Vertex falla por credenciales u otros errores de infraestructura, y teníamos un error de REST, lanzamos el de REST que es más informativo.
            if (restError) {
                console.error("❌ [VertexAI Fallo] Fallo de infraestructura Vertex AI. Lanzando error original de REST.");
                throw restError;
            }
            throw err;
        }
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
    _checkQuality(question, target, area, career, difficulty, combinedHistory) {
        const issues = [];
        const isEducation = ['ASCENSO', 'NOMBRAMIENTO', 'ACCESO_CARGOS'].includes(target);
        const requiredCount = isEducation ? 3 : (target === 'RESIDENTADO' ? 5 : 4);

        if (!question.question_text || typeof question.question_text !== 'string' || question.question_text.trim() === '') {
            issues.push("La pregunta debe incluir un enunciado ('question_text') no vacío.");
        }

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

            // Umbral estándar
            const charDiff = correctLen - avgDistractorLen;
            if (Math.abs(charDiff) > 40) {
                issues.push(`Asimetría detectada. Opción correcta: ${correctLen} letras, Distractores promedio: ${Math.round(avgDistractorLen)} (Diferencia de ${Math.round(charDiff)}). Todas las opciones deben tener una longitud similar.`);
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

        // 4. Pregunta o Consigna Explícita (Solo para Medicina y Educación)
        const text = question.question_text || "";
        const lacksQuestionPrompt = !text.includes('?') && !text.includes('¿') &&
            !/indique|señale|determine|seleccione|calcule|identifique/i.test(text);
        if (lacksQuestionPrompt) {
            issues.push("El enunciado de la pregunta (question_text) carece de una pregunta final clara (¿...?) o de una consigna imperativa explícita al final.");
        }

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

        // 6. Prevención de Repetición Estilística de Apertura (Antirrepetición de escenario)
        const cleanStarter = (str) => {
            return str
                .toLowerCase()
                .replace(/^[-—\s¡¿"']+/g, '') // Quitar guiones, signos de admiración/interrogación y espacios al inicio
                .replace(/[^a-z0-9áéíóúüñ]/gi, ' ') // Quedarse con alfanuméricos y letras acentuadas
                .trim();
        };

        const currentStarter = cleanStarter(text);
        const currentWords = currentStarter.split(/\s+/).filter(Boolean);
        const currentPrefixWords = currentWords.slice(0, 10); // primeras 10 palabras

        let hasRepetitivePrefix = false;
        if (currentPrefixWords.length >= 3) {
            for (const histItem of combinedHistory) {
                if (!histItem) continue;
                let histText = "";
                if (typeof histItem === 'string') {
                    if (histItem.startsWith('TEMA:')) continue;
                    histText = histItem;
                } else {
                    histText = histItem.question_text || "";
                }

                const histStarter = cleanStarter(histText);
                const histWords = histStarter.split(/\s+/).filter(Boolean);
                const histPrefixWords = histWords.slice(0, 10);

                // A. Coincidencia exacta de las primeras 4 palabras
                if (currentPrefixWords.length >= 4 && histPrefixWords.length >= 4) {
                    const firstFourCurrent = currentPrefixWords.slice(0, 4).join(' ');
                    const firstFourHist = histPrefixWords.slice(0, 4).join(' ');
                    if (firstFourCurrent === firstFourHist) {
                        hasRepetitivePrefix = true;
                        break;
                    }
                }

                // B. Similitud Jaccard en las primeras 10 palabras > 0.40
                if (currentPrefixWords.length > 0 && histPrefixWords.length > 0) {
                    const setGen = new Set(currentPrefixWords);
                    const setHist = new Set(histPrefixWords);
                    const intersection = new Set([...setGen].filter(x => setHist.has(x)));
                    const union = new Set([...setGen, ...setHist]);
                    const jaccard = intersection.size / union.size;
                    
                    if (jaccard > 0.40) {
                        hasRepetitivePrefix = true;
                        break;
                    }
                }
            }
        }

        if (hasRepetitivePrefix) {
            issues.push("La formulación o el escenario de inicio de la pregunta es idéntico o muy similar a una pregunta del historial. Reescribe el caso usando una situación o diálogo completamente diferente.");
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

            // 1. Generación en Paralelo por Chunks
            const chunkSize = 5;
            for (let i = 0; i < amount && allQuestions.length < amount; i += chunkSize) {
                const chunkLength = Math.min(chunkSize, amount - i);
                const chunkIndices = Array.from({ length: chunkLength }, (_, idx) => i + idx);
                console.log(`⚡ [Paralelo] Iniciando bloque de ${chunkLength} preguntas en paralelo...`);
                
                const chunkPromises = chunkIndices.map(async (globalIdx, localIdx) => {
                    const area = areasArray[globalIdx % areasArray.length];
                    try {
                        const q = await this._generateSingleQuestion(normalizedTarget, area, career, [...batchHistory], isUserRequest, difficulty, globalIdx);
                        return { area, question: q };
                    } catch (e) {
                        console.error(`❌ Error en tarea paralela para área ${area}:`, e);
                        return { area, question: null };
                    }
                });

                const resolved = await Promise.all(chunkPromises);

                for (const item of resolved) {
                    if (item.question && allQuestions.length < amount) {
                        const status = this._checkQuality(item.question, normalizedTarget, item.area, career, difficulty, batchHistory);
                        if (status.isValid) {
                            allQuestions.push(item.question);
                            batchHistory.push(item.question.question_text);
                            if (item.question.subtopic) batchHistory.push(`TEMA: ${item.question.subtopic}`);
                            console.log(`✅ [Paralelo] Pregunta añadida. Progreso: ${allQuestions.length}/${amount}`);
                        } else {
                            console.warn(`⚠️ [Fallo Calidad Batch] Pregunta rechazada por duplicado/estilo contra el lote actual.`);
                        }
                    }
                }
            }

            // 2. Fallback Secuencial para Rellenar la Cuota si es necesario
            let totalAttempts = allQuestions.length;
            const maxAttempts = amount * 2; // Límite de seguridad para evitar bucles infinitos

            while (allQuestions.length < amount && totalAttempts < maxAttempts) {
                totalAttempts++;
                const area = areasArray[allQuestions.length % areasArray.length];
                console.log(`📝 [Generando Secuencial ${allQuestions.length + 1}/${amount}] Área: ${area} (Intento: ${totalAttempts})`);

                const q = await this._generateSingleQuestion(normalizedTarget, area, career, batchHistory, isUserRequest, difficulty, totalAttempts);

                if (q) {
                    const status = this._checkQuality(q, normalizedTarget, area, career, difficulty, batchHistory);
                    if (status.isValid) {
                        allQuestions.push(q);
                        batchHistory.push(q.question_text);
                        if (q.subtopic) batchHistory.push(`TEMA: ${q.subtopic}`);
                        console.log(`✅ [Éxito Secuencial] Pregunta añadida. Progreso: ${allQuestions.length}/${amount}`);
                    } else {
                        console.warn(`⚠️ [Fallo Calidad Secuencial] Pregunta rechazada.`);
                    }
                } else {
                    console.warn(`⚠️ [Fallo Generación Secuencial] Intento fallido. Reintentando...`);
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
            console.error('❌ Error en AdminAiService:', error);
            throw error;
        }
    }

    async _generateSingleQuestion(target, area, career, history = [], isUserRequest = false, difficulty = null, parallelIndex = 0) {
        try {
            const db = require('../../infrastructure/database/db');

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
            
            VARIACIÓN DE PROCESO (Evita duplicados):
            Fuerza la variación eligiendo un subtema del fragmento número ${(parallelIndex % 5) + 1} de la lista de fragmentos del prospecto provistos para evitar colisiones con otros procesos concurrentes.
            
            TAREAS:
            1. Analiza el temario y elige UN subtema específico de la carrera "${career}" que pertenezca ESTRICTAMENTE al área: "${area}".
            2. Si el temario muestra temas de otras áreas o carreras, IGNÓRALOS. Solo puedes elegir subtemas de "${area}" para "${career}".
            3. Si el área tiene SUB-ÁREAS, elige un punto específico (ej. "1.2 Epidemiología") y no el título general.
            4. El tema elegido NO debe estar en el historial de temas prohibidos.
            5. Genera 2 términos de búsqueda "Sniper" que incluyan palabras técnicas clave (ej: "NTS", "Guía clínica", "Esquema de vacunación", "Manejo clínico", "Normativa") para encontrar el sustento oficial.
            
            RESPONDE SOLO EN JSON:
            { "selectedTopic": "Nombre del tema", "searchTerms": ["termino 1", "termino 2"] }`;

            const selectionResult = await this._callModel(selectionPrompt);
            const selectionData = this._parseJSON(selectionResult.response.candidates[0].content.parts[0].text);

            selectedSubtopic = selectionData.selectedTopic || area;
            const technicalSearchTerms = Array.isArray(selectionData.searchTerms)
                 ? selectionData.searchTerms.join(' ')
                 : (typeof selectionData.searchTerms === 'string' ? selectionData.searchTerms : selectedSubtopic);
            console.log(`🎯 [Fase 1] Tema Elegido: ${selectedSubtopic}`);

            // FASE 2: RAG Dual (Teoría + Estructura de Examen Real)
            let fullContext = { syllabus: selectedSubtopic };

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

            // FASE 3: Constructor de pregunta (Unificado)
            console.log(`🏗️ [Fase 3] Construyendo pregunta (isUserRequest: ${isUserRequest})...`);
            initialPrompt = genPrompts.getUnifiedPrompt(target, area, career, fullContext, combinedHistory, null);

            // 3. Generar pregunta y ejecutar Bucle de Auditoría por IA (Fase 4)
            const result = await this._callModel(initialPrompt);
            const responseText = result.response.candidates[0].content.parts[0].text;
            let questionObj = this._parseJSON(responseText);
            let question = Array.isArray(questionObj) ? questionObj[0] : questionObj;

            if (!question) {
                console.error(`🚨 [Generación] La pregunta decodificada es null o undefined para el área ${area}`);
                return null;
            }

            // Forzar metadatos correctos post-generación
            question.topic = area;

            let status = this._checkQuality(question, target, area, career, difficulty, combinedHistory);
            let auditAttempts = 0;

            while (!status.isValid && auditAttempts < 3) {
                auditAttempts++;
                console.log(`⚖️ [Auditoría L${auditAttempts}] Problemas encontrados:\n- ${status.issuesList.join('\n- ')}`);

                const refinementPrompt = genPrompts.buildRefinementPrompt(question, status.issuesList);
                try {
                    const refinedResult = await this._callModel(refinementPrompt);
                    const refinedText = refinedResult.response.candidates[0].content.parts[0].text;
                    const parsedRefined = this._parseJSON(refinedText);
                    question = Array.isArray(parsedRefined) ? parsedRefined[0] : parsedRefined;

                    if (!question) {
                        console.error(`🚨 [Refinamiento] La pregunta refinada es null o undefined para el área ${area}`);
                        return null;
                    }

                    // Mantener consistencia de metadatos
                    question.topic = area;

                    status = this._checkQuality(question, target, area, career, difficulty, combinedHistory);
                } catch (refineErr) {
                    console.error(`⚠️ Error en auditoría/refinamiento (intento ${auditAttempts}):`, refineErr);
                    break;
                }
            }

            // FASE 5: Bloqueo de Calidad final
            if (!status.isValid) {
                console.error(`🚨 [Calidad] Rechazando pregunta por fallos de calidad persistentes tras 3 refinamientos:`, status.issuesList);
                return null;
            }

            // 🛡️ Saneador de Estructura Final (Opciones e indexes)
            const requiredCount = isEducation ? 3 : (target === 'RESIDENTADO' ? 5 : 4);

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
            question.subtopic = selectedSubtopic || question.subtopic || 'Análisis Casuístico';

            // Escudo final de sanitización estática
            question.explanation = this._sanitizeExplanation(question.explanation);

            return question;
        } catch (error) {
            console.error(`⚠️ Error en generación individual p/ ${area}:`, error);
            return null;
        }
    }


}

module.exports = new AdminAiService();
