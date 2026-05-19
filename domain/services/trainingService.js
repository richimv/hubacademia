const { VertexAI } = require('@google-cloud/vertexai');
const repository = require('../repositories/trainingRepository');
const adminAiService = require('./adminAiService');

// CONFIGURACIÓN VERTEX AI
const project = process.env.GOOGLE_CLOUD_PROJECT;
const location = process.env.GOOGLE_CLOUD_LOCATION;
const vertex_ai = new VertexAI({ project: project, location: location });

const modelCreativeLite = vertex_ai.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
        maxOutputTokens: 65535,
        temperature: 0.9,
        topP: 0.95,
        responseMimeType: 'application/json'
    },
});

class TrainingService {

    /**
     * Normaliza el tema para consistencia en DB (ej: "Pediatría" -> "PEDIATRIA").
     */
    normalizeTopic(input) {
        if (!input) return "GENERAL";
        return input
            .toUpperCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar tildes
            .trim()
            .replace(/\s+/g, " "); // Solo normalizar espacios
    }

    /**
     * Mezcla las opciones de respuesta y actualiza el índice correcto.
     */
    shuffleOptions(question) {
        if (!question.options || !question.options.length) return question;

        const originalOptions = question.options;

        // Crear array de objetos {text, originalIndex}
        const mappedOptions = originalOptions.map((opt, index) => ({
            text: opt,
            isCorrect: index === question.correct_option_index
        }));

        // Shuffle (Fisher-Yates)
        for (let i = mappedOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [mappedOptions[i], mappedOptions[j]] = [mappedOptions[j], mappedOptions[i]];
        }

        // Reconstruir
        question.options = mappedOptions.map(o => o.text);
        question.correct_option_index = mappedOptions.findIndex(o => o.isCorrect);

        return question;
    }

    // MÉTODO _buildRagQuery EXTIRPADO COMPLETAMENTE POR CONTROL FINANCIERO

    /**
     * Obtiene Preguntas (Banco Local).
     * Soporta tanto Modo Legacy (String) como Modo Multi-Area (Objeto).
     */
    async getQuestions(categoryOptions, limit = 5, userId, subscriptionTier = 'free', seenIds = []) {
        // 1. Parsear opciones y detectar dominio desde el inicio
        let target = null;
        let career = null;
        let areas = [];

        if (typeof categoryOptions === 'object') {
            target = categoryOptions.target || null;
            career = categoryOptions.career || null;
            areas = categoryOptions.areas && categoryOptions.areas.length > 0 ? categoryOptions.areas : [];
        } else {
            // Modo Legacy o String simple
            target = 'MEDICINA'; // Fallback seguro solo si es un string plano
            areas = [this.normalizeTopic(categoryOptions)];
        }

        // 🎯 DOMAIN ROUTING: Detect domain from target (V3.1 Neutral)
        const EDUCATION_TARGETS = ['NOMBRAMIENTO', 'ASCENSO', 'ACCESO_CARGOS'];
        const isEducation = target && EDUCATION_TARGETS.includes(target.toUpperCase());
        const isTrivia = target === 'GENERAL_TRIVIA';

        const dbDomain = isTrivia ? 'GENERAL_TRIVIA' : (isEducation ? 'education' : 'medicine');
        const dbTarget = isTrivia ? null : target;

        // 🔄 FALLBACK DE ÁREAS (Context-Aware)
        // Si no hay áreas o son genéricas, inyectamos los ejes oficiales según el dominio.
        const isGeneric = !areas || areas.length === 0 ||
            (areas.length === 1 && (
                ['GENERAL', 'MEDICINA GENERAL', 'EDUCACION GENERAL', 'TODAS'].includes(areas[0].toUpperCase())
            ));

        if (isGeneric) {
            if (isEducation) {
                areas = [
                    'Comprensión Lectora',
                    'Razonamiento Lógico',
                    'Teorías del Aprendizaje y Desarrollo',
                    'Principios del Currículo Nacional (CNEB)',
                    'Evaluación Formativa y Retroalimentación'
                ];
            } else if (isTrivia) {
                areas = ['Cultura General', 'Ciencia', 'Historia', 'Arte'];
            } else {
                // Default: Medicina
                areas = [
                    'Ciencias Básicas',
                    'Salud Pública',
                    'Ginecología y Obstetricia',
                    'Pediatría',
                    'Cirugía General',
                    'Medicina Interna'
                ];
            }
        }

        console.log(`📡 [TrainingService] Modo: ${dbDomain} | Target: ${dbTarget} | Áreas: ${areas.join(', ')}`);

        // 🎯 NORMALIZACIÓN DE ÁREAS (Necesario para Repo y IA)
        const normalizedAllAreas = areas.map(a => a.trim().toUpperCase());
        const areaMap = new Map();
        areas.forEach(a => areaMap.set(a.trim().toUpperCase(), a.trim()));

        // ---------------------------------------------------------
        // A. FLUJO PRINCIPAL (MEDICINA + EDUCACIÓN)
        // ---------------------------------------------------------
        if (dbDomain === 'medicine' || dbDomain === 'education') {
            console.log(`\n🧠 [TrainingService] Analizando stock en ${normalizedAllAreas.length} áreas para ${dbTarget}...`);

            const rawBankQuestions = await repository.findQuestionsInBankBatch(dbDomain, dbTarget, normalizedAllAreas, 50, userId, career, seenIds);

            const questionsByArea = {};
            rawBankQuestions.forEach(q => {
                const shuffledQ = this.shuffleOptions(q);
                const topicKey = shuffledQ.topic ? shuffledQ.topic.toUpperCase() : 'GENERAL';
                if (!questionsByArea[topicKey]) questionsByArea[topicKey] = [];
                questionsByArea[topicKey].push(shuffledQ);
            });

            const areasWithStock = normalizedAllAreas.filter(area => questionsByArea[area] && questionsByArea[area].length > 0);

            // 2. Lotería de Áreas: Para el banco, intentamos abarcar todas las que tengan stock primero
            let bankSampledAreas;
            if (areasWithStock.length >= 5) {
                bankSampledAreas = areasWithStock.sort(() => 0.5 - Math.random()).slice(0, 5);
            } else if (areasWithStock.length > 0) {
                bankSampledAreas = [...areasWithStock];
            } else {
                bankSampledAreas = normalizedAllAreas.length > 5 ? normalizedAllAreas.sort(() => 0.5 - Math.random()).slice(0, 5) : normalizedAllAreas;
            }

            let balancedBatch = [];
            for (const area of bankSampledAreas) {
                if (balancedBatch.length < limit && questionsByArea[area] && questionsByArea[area].length > 0) {
                    balancedBatch.push(questionsByArea[area].shift());
                }
            }

            // Si aún no completamos, intentamos sacar más de las mismas áreas con stock o de cualquier área seleccionada
            if (balancedBatch.length < limit) {
                const searchOrder = [...areasWithStock, ...normalizedAllAreas];
                for (const area of searchOrder) {
                    while (balancedBatch.length < limit && questionsByArea[area] && questionsByArea[area].length > 0) {
                        balancedBatch.push(questionsByArea[area].shift());
                    }
                }
            }

            const areasStr = areasWithStock.length > 5 ? `${areasWithStock.length} áreas` : `[${areasWithStock.join(', ')}]`;
            console.log(`🔎 [Banco] Stock detectado en: ${areasStr} (${balancedBatch.length}/${limit} preguntas).`);

            const bankCount = balancedBatch.length;
            let batchIsHealthy = bankCount === limit;

            // ✅ REGLA DE ORO (CASOS_FLUJO_IA): Si se seleccionaron >= 5 áreas, el lote DEBE tener 5 áreas únicas.
            // Si el banco solo tiene stock en < 5 áreas, forzamos IA para cumplir con la diversidad de tópicos.
            if (normalizedAllAreas.length >= 5 && areasWithStock.length < 5) {
                batchIsHealthy = false;
                console.log(`⚠️ [IA Trigger] Banco insuficiente para diversidad: solo ${areasWithStock.length} áreas con stock. Forzando Reposición IA.`);
            }
            let source = 'BANK';

            if (!batchIsHealthy) {
                const tier = String(subscriptionTier || 'free').toLowerCase();

                // ✅ IA PARA TODOS: Se permite la generación IA (Modo Fast para Free/Basic, RAG para Admin)
                // Se elimina el bloqueo previo: tier !== 'advanced' && tier !== 'admin'

                // 🎯 REPOSICIÓN IA: Seleccionar las 5 áreas para la generación (Escenarios 1, 2 y 3)
                const rawSampled = normalizedAllAreas.length >= 5
                    ? normalizedAllAreas.sort(() => 0.5 - Math.random()).slice(0, 5)
                    : normalizedAllAreas;

                // Mapear de vuelta al Title Case original para que la IA genere correctamente
                const sampledAreas = rawSampled.map(a => areaMap.get(a) || a);

                console.log(`🤖 [IA] Lote insuficiente (${bankCount}/${limit}). Activando Reposición para ${sampledAreas.length} áreas...`);
                source = 'AI_REPOSITION';

                if (limit >= 100) {
                    if (bankCount < 10) {
                        throw new Error(`No hay suficientes preguntas en el banco para este simulacro. Solo hay ${bankCount} disponibles.`);
                    }
                    repository.markQuestionsAsSeen(userId, balancedBatch.map(q => q.id));
                    return { questions: balancedBatch, source: 'BANK', topic: sampledAreas[0] };
                }

                const areaPrompt = sampledAreas.join(', ');

                // 🎯 REGLA DE ARQUITECTURA GLOBAL: La fidelidad (RAG) es innegociable en toda la plataforma.
                // Ya sea Medicina (ENAM/SERUMS) o Educación (ASCENSO), TODO usuario dispara generación Pinecone.
                console.log(`🚀 [Replenish-RAG-Universal] Calling AdminAiService (RAG) for ${target}`);
                try {
                    let aiQuestions = await adminAiService.generateRAGQuestions(target, areaPrompt, career, limit, true);

                    if (aiQuestions && aiQuestions.length > 0) {
                        source = 'HYBRID';
                        aiQuestions = aiQuestions.map(q => this.shuffleOptions(q));
                        // 🎯 FIX: No marcamos como vistas aquí, dejamos que el flujo natural lo haga al entregar
                        const newIds = await repository.saveQuestionBankBatch(aiQuestions, sampledAreas[0], dbDomain, dbTarget, career);
                        if (newIds && newIds.length > 0) {
                            aiQuestions.forEach((q, idx) => { if (newIds[idx]) q.id = newIds[idx]; });
                        }
                        balancedBatch = aiQuestions.slice(0, limit);
                        console.log(`✅ Balance Restaurado: Lote de emergencia generado y entregado.`);
                    } else {
                        // Si la IA no devolvió nada (posible error interno silenciado)
                        throw new Error("AI_GENERATION_EMPTY");
                    }
                } catch (aiErr) {
                    console.error("❌ Error Crítico en Reposición IA:", aiErr.message);
                    throw new Error("AI_REPLENISHMENT_FAILED");
                }
            }

            if (balancedBatch.length > 0) {
                repository.markQuestionsAsSeen(userId, balancedBatch.filter(q => q.id).map(q => q.id));
                return {
                    questions: balancedBatch.slice(0, limit),
                    source: source,
                    topic: (!batchIsHealthy && typeof sampledAreas !== 'undefined') ? sampledAreas[0] : (areaMap.get(bankSampledAreas[0]) || bankSampledAreas[0])
                };
            }

            // Si llegamos aquí y no hay preguntas, es que el BANCO está agotado Y la IA falló o no se activó.
            throw new Error("BANK_EXHAUSTED_AND_IA_FAILED");
        }

        // ---------------------------------------------------------
        // SI ES QUIZ ARENA (GENERAL_TRIVIA / OTROS)
        // ---------------------------------------------------------
        const normalizedTopic = String(areas[0] || 'Cultura General').trim().toUpperCase();
        const questions = await repository.findArenaQuestions(dbDomain, dbTarget, normalizedTopic, limit, userId);

        // SI ES QUIZ ARENA (GENERAL_TRIVIA), Conservamos la IA (Bajo temperatura creativa y sin RAG)
        if (questions.length < limit) {
            const tier = String(subscriptionTier || 'free').toLowerCase();

            // 🛡️ RESTRICCIÓN DE IA EN ARENA: Se permite a todos los usuarios (incluyendo 'free')
            // si el banco se agota, para no interrumpir la experiencia de juego.
            // Los límites de cuota diaria (UsageService) se validan en el controlador.
            console.log(`🧠 [Arena-IA] Reponiendo ${limit - questions.length} faltantes con IA... [Tema: ${areas[0]}]`);
            let newQuestions = await this.generateGeneralQuestionsAI(areas, limit - questions.length, subscriptionTier);

            // 🔀 Shuffle de opciones para nuevas preguntas IA
            newQuestions = newQuestions.map(q => this.shuffleOptions(q));

            // 3. Guardar las nuevas en el Banco Y OBTENER IDs
            let newIds = [];
            if (newQuestions.length > 0) {
                newIds = await repository.saveQuestionBankBatch(newQuestions, areas[0], dbDomain, dbTarget, career);
                // ✅ VINCULACIÓN DE IDs: Asignar IDs reales a los objetos en memoria para que el marcado de seen funcione
                newQuestions.forEach((q, idx) => {
                    if (newIds[idx]) q.id = newIds[idx];
                });
            }

            // 🔀 SHUFFLE TOTAL: Asegurar que tanto las del banco como las de la IA tengan opciones barajeadas
            const combined = [...questions.map(q => this.shuffleOptions(q)), ...newQuestions].slice(0, limit);

            // ✅ ANTI-REPETICIÓN: Marcar TODO el lote entregado como visto
            const finalIds = combined.filter(q => q.id).map(q => q.id);
            if (finalIds.length > 0) {
                await repository.markQuestionsAsSeen(userId, finalIds);
            }

            return {
                questions: combined,
                source: questions.length > 0 ? 'HYBRID' : 'IA',
                topic: normalizedTopic
            };
        }

        const bankQuestions = questions.slice(0, limit).map(q => this.shuffleOptions(q));

        // ✅ ANTI-REPETICIÓN: Marcar lote del banco como visto
        const finalBankIds = bankQuestions.filter(q => q.id).map(q => q.id);
        if (finalBankIds.length > 0) {
            await repository.markQuestionsAsSeen(userId, finalBankIds);
        }

        return {
            questions: bankQuestions,
            source: 'BANK',
            topic: normalizedTopic
        };
    }

    // MÉTODO generateMedicalQuestionsAI MIGRADO A MLService.generateRAGQuestions (RAG Maestro)

    /**
     * Generador Puro IA (GENERAL) - Lógica interna y Deduplicación
     */
    async generateGeneralQuestionsAI(areas, count, tier = 'free') {
        try {
            console.log(`🤖 [Arena IA] Usando modelo Lite para Tier: ${tier}`);

            const areaString = areas.join(', ');

            // Extraer Contexto de Deduplicación
            let deduplicationText = "No hay contexto previo de deduplicación.";
            try {
                const pastQuestions = await repository.getRandomQuestionsContext('GENERAL_TRIVIA', null, areas, 30);
                if (pastQuestions.length > 0) {
                    deduplicationText = pastQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n');
                }
            } catch (e) { console.error("Deduplication fetch failed", e); }


            // Añadir entropía al prompt (Versión Simplificada)
            const seeds = ["Curiosidades", "Hechos poco conocidos", "Conceptos clave", "Errores comunes", "Aplicaciones prácticas"];
            const randomSeed = seeds[Math.floor(Math.random() * seeds.length)];

            const prompt = `
            Actúa como un Quiz Master dinámico para una App de Trivia Premium. 
            Tema: "${areaString}". 
            
            🚨 VISIÓN DE JUEGO (GAMIFICATION):
            - No generes preguntas extremadamente técnicas, aburridas o estresantes.
            - Genera "Trivias Inteligentes": Preguntas directas, datos curiosos, conceptos clave y cultura general.
            - El tono debe ser profesional pero ágil, relajado y divertido (Gamified).
            - Estándar Interno: Senior (Alta calidad de redacción y veracidad), pero accesible para el aprendizaje lúdico y el relax.
            
            🚨 REGLA DE ORO DE DEDUPLICACIÓN (CONTEXTO NEGATIVO):
            ABSOLUTAMENTE PROHIBIDO evaluar los siguientes conceptos exactos o temas relacionados:
            -- INICIO PREGUNTAS PROHIBIDAS --
            ${deduplicationText}
            -- FIN PREGUNTAS PROHIBIDAS --
            ⚠️ TU MISIÓN: No solo evites el texto exacto, sino también la temática central de las preguntas anteriores. Sé original, busca escenarios laterales o curiosidades que NO estén en la lista.

            🚨 REGLA DE ORO DE OPCIONES (ANTI-SESGO):
            - SIMETRÍA VISUAL: Todas las opciones deben tener una longitud similar.
            - NO AL SESGO DE LONGITUD: Bajo ninguna circunstancia la opción correcta debe ser significativamente más larga o detallada que las demás.
            - DISTRACTORES REALES (TRAMPAS): Las opciones incorrectas deben ser plausibles y estar relacionadas con el tema; evita rellenos obvios o absurdos.

            Instrucciones de Calidad:
            1. IDIOMA: ESPAÑOL (Neutro).
            2. FORMATO: Genera EXACTAMENTE 4 opciones.
            3. DINAMISMO: Preguntas que inviten a la curiosidad (Ej: "¿Sabías que...?", "¿Cuál es el principal responsable de...?", "¿Qué hito marcó...?").
            4. CALIDAD DE OPCIONES: Sin letras ("A", "B"). Conceptos crudos.
            
            Genera ${count} preguntas de trivia interesantes y retadoras pero NO estresantes.
            
            JSON ESTRICTO (No incluyas explicaciones fuera del JSON):
            [{"question_text":"¿Cuál es el principal factor...?","options":["Concepto A", "Concepto B", "Concepto C", "Concepto D"],"correct_option_index":0,"explanation":"Explicación educativa de 1-2 líneas.","topic":"${areas[0]}","visual_support_recommendation":"Recomendación de imagen (ej: Mapa de Europa del siglo XVIII, Diagrama de la fotosíntesis, Retrato de Newton, etc.)"}]
            
            🚨 REGLA DE SOPORTE VISUAL:
            En el campo "visual_support_recommendation", sugiere qué recurso visual ayudaría a reforzar la explicación. Sé creativo y variado (Tablas, Mapas, Diagramas, Pinturas, Fotos históricas).
            
            ⚠️ REGLA DE FORMATO:
            Bajo ninguna circunstancia uses letras ("A)", "B.", "C.-", etc.) al inicio de las opciones.
            Las opciones deben contener únicamente el texto crudo del concepto evaluado.
            Asegúrate de escapar correctamente las comillas dobles internas con \\" para no romper el formato JSON.
            `;

            const result = await modelCreativeLite.generateContent(prompt);
            const text = result.response.candidates[0].content.parts[0].text;

            let questions;
            try {
                // Extracción robusta (Mismo estándar que mlService)
                const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                let jsonString = codeBlockMatch ? codeBlockMatch[1] : text;
                const startIndex = jsonString.search(/\[/);
                const endIndex = jsonString.lastIndexOf(']');

                if (startIndex !== -1 && endIndex !== -1) {
                    jsonString = jsonString.substring(startIndex, endIndex + 1);
                }
                questions = JSON.parse(jsonString);
            } catch (parseError) {
                console.error("❌ Error parseando JSON de IA General:", parseError.message);
                console.error("📝 Texto crudo recibido que causó el error:\n", text);
                return [];
            }

            // 🛡️ SANITIZACIÓN ROBUSTA: Forzar 4 opciones
            questions = questions.map(q => {
                // Si tiene más de 4, cortamos (asegurando que la correcta esté dentro)
                if (q.options.length > 4) {
                    // Si la correcta es índice 4 o mayor (5ta opción+), la movemos al 3
                    if (q.correct_option_index >= 4) {
                        q.options[3] = q.options[q.correct_option_index]; // Mover correcta a pos 3
                        q.correct_option_index = 3;
                    }
                    q.options = q.options.slice(0, 4); // Cortar exceso
                }
                // Si tiene menos de 4 (raro), rellenamos
                while (q.options.length < 4) {
                    q.options.push("Opción extra");
                }
                return q;
            });

            return questions;
        } catch (error) {
            console.error("❌ Error IA General:", error);
            return [];
        }
    }

    /**
     * Generador de Cuestionarios Dinámicos desde Recursos
     * Toma el texto de un recurso (libro, documento) y genera preguntas de alto impacto.
     */
    async generateQuizFromResource(title, content, count = 5, difficulty = 'intermediate', resourceUrl = null, domain = 'medicine') {
        try {
            console.log(`🤖 [Arena IA] Generando quiz dinámico para recurso: ${title} | Dificultad: ${difficulty}`);

            // 1. Determinar el contexto de uso (Directo vs RAG) - Limpiar HTML para contar caracteres reales de texto plano
            let contextForAI = "";
            const plainText = content ? content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
            const isContentShort = plainText && plainText.length > 0 && plainText.length < 15000;

            // 2. Generar Subtemas Dinámicos para Aleatoriedad
            const subtopicsPrompt = `Actúa como un experto docente. Extrae 5 subtemas o conceptos muy específicos a evaluar del siguiente recurso: "${title}". Devuelve SOLO una lista separada por comas, sin numeración ni introducciones.`;
            let subtopicsStr = "Conceptos generales";
            try {
                const subResp = await modelCreativeLite.generateContent(subtopicsPrompt);
                subtopicsStr = subResp.response.candidates[0].content.parts[0].text.trim();
            } catch (e) { console.warn("No se pudieron generar subtemas dinámicos."); }

            // Seleccionar 2 subtemas al azar con parsing ultra-robusto (comas, guiones, números, saltos de línea)
            let subtopicsArr = subtopicsStr
                .split(/[\n,;]+/)
                .map(s => s.replace(/^[-*•\d\.\s]+/g, '').trim())
                .filter(s => s.length > 3);

            if (subtopicsArr.length === 0) {
                subtopicsArr = ["Conceptos clave", "Definiciones principales", "Aplicaciones prácticas", "Análisis crítico", "Casos de estudio"];
            }

            const selectedSubtopics = subtopicsArr.sort(() => 0.5 - Math.random()).slice(0, 2).join(', ');
            console.log(`🎯 [Arena IA] Subtemas dinámicos seleccionados: ${selectedSubtopics}`);

            if (isContentShort) {
                console.log(`📚 [Arena IA] Usando content_html directo (Largo texto plano: ${plainText.length} < 15k)`);
                contextForAI = plainText;
            } else {
                console.log(`🔍 [Arena IA] Usando RAG Semántico basado en el Título para recurso extenso o sin content_html`);
                const questionRagService = require('./questionRagService');

                // Buscar semánticamente en Pinecone usando el título del recurso y los subtemas seleccionados
                contextForAI = await questionRagService.getStyleContextByKeywords(
                    domain,
                    [`${title} ${selectedSubtopics}`],
                    8,
                    null,
                    title
                );

                if (!contextForAI || contextForAI.trim() === '') {
                    if (plainText && plainText.length > 0) {
                        console.log(`⚠️ [Arena IA] RAG de título no disponible pero se usará plainText del recurso como fallback de contingencia.`);
                        contextForAI = plainText.substring(0, 20000);
                    } else {
                        console.warn(`⚠️ [Arena IA] Fallback semántico falló, usando fallback AI pura.`);
                        contextForAI = `Resumen básico del recurso: ${title}. Temas a evaluar: ${selectedSubtopics}`;
                    }
                }
            }

            const prompt = `
            Actúa como un experto docente y Quiz Master.
            Tu tarea es generar EXACTAMENTE ${count} preguntas de evaluación de opción múltiple (Active Recall) basadas EXCLUSIVAMENTE en el siguiente material de estudio:
            
            TÍTULO DEL RECURSO: "${title}"
            ENFOQUE DINÁMICO (Priorizar estos temas si están en el material): ${selectedSubtopics}
            NIVEL DE DIFICULTAD: ${difficulty.toUpperCase()} (Si es 'basic' o 'easy': conceptos directos y definiciones clave. Si es 'advanced' o 'hard': análisis crítico, diagnóstico avanzado y toma de decisiones).
            
            --- INICIO DEL MATERIAL ---
            ${contextForAI}
            --- FIN DEL MATERIAL ---
            
            🚨 REGLAS DE ORO:
            1. VERACIDAD: Todas las respuestas deben deducirse o estar alineadas al material provisto.
            2. FORMATO: Genera EXACTAMENTE 4 opciones. Sin letras (A, B) al inicio.
            3. SIMETRÍA VISUAL: Todas las opciones deben tener una longitud similar. No hacer la correcta obvia por su longitud.
            4. IDIOMA: Español.
            5. EXPLICACIONES: Añade una breve explicación educativa (1-2 líneas) de por qué la respuesta es correcta.
            
            JSON ESTRICTO (No incluyas explicaciones fuera del JSON):
            [{"question_text":"¿Cuál es el principal concepto...?","options":["Opción 1", "Opción 2", "Opción 3", "Opción 4"],"correct_option_index":0,"explanation":"Explicación corta.","topic":"${title}","visual_support_recommendation":""}]
            `;

            const result = await modelCreativeLite.generateContent(prompt);
            const text = result.response.candidates[0].content.parts[0].text;

            let questions;
            try {
                const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                let jsonString = codeBlockMatch ? codeBlockMatch[1] : text;
                const startIndex = jsonString.search(/\[/);
                const endIndex = jsonString.lastIndexOf(']');
                if (startIndex !== -1 && endIndex !== -1) {
                    jsonString = jsonString.substring(startIndex, endIndex + 1);
                }
                questions = JSON.parse(jsonString);
            } catch (parseError) {
                console.error("❌ Error parseando JSON de Recurso:", parseError.message);
                return [];
            }

            // Sanitización
            questions = questions.map(q => {
                if (q.options.length > 4) {
                    if (q.correct_option_index >= 4) {
                        q.options[3] = q.options[q.correct_option_index];
                        q.correct_option_index = 3;
                    }
                    q.options = q.options.slice(0, 4);
                }
                while (q.options.length < 4) {
                    q.options.push("Opción extra");
                }
                return q;
            });

            return questions;
        } catch (error) {
            console.error("❌ Error IA Generación Recurso:", error);
            return [];
        }
    }

    /**
     * Genera Flashcards a partir de un tema o texto (Para Custom Decks).
     * @param {string} topic - Tema o texto corto.
     * @param {number} count - Número sugerido (Default 20, adaptable).
     * @param {Array} existingFronts - Lista de frentes existentes para evitar repeticiones.
     */
    async generateFlashcardsFromTopic(topic, count = 20, existingFronts = []) {
        try {
            // Limpiar HTML de los frentes existentes para un prompt más limpio
            const cleanFronts = existingFronts.map(f => String(f).replace(/<[^>]*>/g, '').trim()).filter(f => f.length > 0);

            // Limitar la lista de existentes para no saturar el prompt (últimas 40 para contexto suficiente)
            const exclusionList = cleanFronts.length > 0
                ? `\n🚨 REGLA DE EXCLUSIÓN (NO REPETIR ESTO):\n${cleanFronts.slice(-40).join('\n')}`
                : "";

            const prompt = `
            Actúa como un experto en diseño instruccional y pedagogía de vanguardia (especialista en Active Recall y Spaced Repetition).
            Crea EXACTAMENTE ${count} Flashcards de nivel profesional sobre el tema: "${topic}".
            ${exclusionList}

            🚨 ESTRATEGIAS DE GENERACIÓN POR DOMINIO (CRÍTICO):

            1. IDIOMAS (Listening/Speaking):
               - ANVERSO ("front"): 100% en el idioma extranjero. ABSOLUTAMENTE PROHIBIDO el español aquí (Sin instrucciones como "¿Cómo se dice...?").
               - REVERSO ("back"): Línea 1: Frase limpia en el idioma extranjero (para referencia auditiva). Línea 2+: Traducción y notas gramaticales.
               - Propósito: El "front" debe ser puro para que el TTS lo pronuncie perfectamente.

            2. MEDICINA Y SALUD:
               - ANVERSO ("front"): Presenta hallazgos clínicos, signos, síntomas o un caso breve (Ej: "Paciente con dolor en FID y signo de Blumberg +").
               - REVERSO ("back"): Diagnóstico, fármaco de elección o fisiopatología. Usa terminología técnica precisa.
               - Propósito: Fomentar el diagnóstico diferencial y el juicio clínico.

            3. EDUCACIÓN (DOCENTES):
               - ANVERSO ("front"): Teorías del aprendizaje, desafíos de aula o conceptos de diseño curricular (Ej: "¿Cómo aplicaría el constructivismo en...?").
               - REVERSO ("back"): Estrategia pedagógica, autor clave o solución basada en evidencia educativa.
               - Propósito: Herramientas prácticas para la gestión docente.

            4. OTROS TEMAS:
               - Aplica el método de "Pregunta de Disparo" -> "Respuesta Atómica".

            🚨 REGLAS DE CALIDAD Y ADAPTACIÓN:
            - Cantidad: Exactamente ${count} tarjetas.
            - Active Recall: El "front" debe ser un reto mental, no una lectura pasiva.
            - Concisión: El "back" debe ser directo (< 50 palabras).
            - ⚠️ NO REPITAS conceptos de la LISTA DE EXCLUSIÓN superior.

            FORMATO JSON ESTRICTO (No incluyas texto fuera del JSON):
            [{ "front": "Contenido del anverso", "back": "Contenido del reverso" }]
            `;

            console.log(`🧠 AI Adaptive Flashcards: Procesando '${topic}' (Margen 5-20)...`);
            // Flashcards siempre usan Lite para ahorro
            const result = await modelCreativeLite.generateContent(prompt);
            const text = result.response.candidates[0].content.parts[0].text;

            const cards = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
            return cards;

        } catch (error) {
            console.error("❌ Error Generando Flashcards IA:", error);
            throw new Error("No se pudo generar contenido con IA.");
        }
    }

    // --- MÉTODOS LEGACY (Wrappers para compatibilidad) ---

    // Usado por QuizController (ENAM/SERUMS/RESIDENTADO)
    async generateQuiz(categoryOptions, userId, limit = 5, subscriptionTier = 'free', seenIds = []) {
        const result = await this.getQuestions(categoryOptions, limit, userId, subscriptionTier, seenIds);
        return { questions: result.questions, topic: result.topic };
    }

    // Usado por QuizGameController (Arena)
    async generateGeneralQuiz(topic, userId, tier = 'free') {
        const result = await this.getQuestions({ target: 'GENERAL_TRIVIA', areas: [topic] }, 5, userId, tier);
        return result.questions;
    }

    /**
     * Guarda el resultado y opcionalmente crea flashcards.
     * @param {string} userId
     * @param {object} quizData
     * @param {object} options - { createFlashcards: boolean }
     */
    async submitQuizResult(userId, quizData, options = { createFlashcards: false }) {
        // --- CALCULAR ESTADÍSTICAS POR ÁREA (JSONB) ---
        const areaStats = {};

        // Allowed areas chosen by user strictly (fallback for sanitization)
        const allowedAreas = (quizData.areas && Array.isArray(quizData.areas) && quizData.areas.length > 0)
            ? quizData.areas
            : [quizData.topic];

        if (quizData.questions && Array.isArray(quizData.questions)) {
            quizData.questions.forEach(q => {
                let topic = q.topic || quizData.topic || 'General';
                const isCorrect = q.userAnswer === q.correct_option_index;

                // 🧹 SANITIZACIÓN MEJORADA: 
                // Si el topic de la pregunta es genérico (ej: "MEDICINA") o está vacío, 
                // intentamos mapiar a la lista de áreas permitidas por el usuario.
                const isGeneric = !topic || topic === 'MEDICINA' || topic === 'General' || topic === 'Medicina General';

                if (isGeneric && allowedAreas.length > 0) {
                    topic = allowedAreas[0];
                } else if (allowedAreas.length > 0) {
                    // Si el topic NO es genérico (ej: "Neurología"), solo verificamos si coincide con algo de allowedAreas
                    // para normalizarlo, pero si no coincide, PRESERVAMOS el topic original en vez de forzar el primero.
                    const matched = allowedAreas.find(a => topic.toLowerCase().includes(a.toLowerCase()));
                    if (matched) topic = matched;
                } else if (topic.includes(',')) {
                    topic = topic.split(',')[0].trim();
                }

                if (!areaStats[topic]) {
                    areaStats[topic] = { correct: 0, total: 0 };
                }

                areaStats[topic].total += 1;
                if (isCorrect) {
                    areaStats[topic].correct += 1;
                }

                // Actualizar el topic en el objeto pregunta para que el Repo lo use fielmente
                q.topic = topic;
            });
        }

        quizData.areaStats = areaStats; // Adjuntar para el repositorio

        const attemptId = await repository.saveQuizHistory(userId, quizData);

        console.log(`💾 [TrainingService] Historial de examen guardado exitosamente. Intento ID: ${attemptId} | Usuario: ${userId} | Target: ${quizData.target || 'N/A'} | Especialidad: ${quizData.career || 'N/A'} | Score: ${quizData.score}/${quizData.totalQuestions}`);

        // 🟢 MODULARIDAD: Crear flashcards con topics individuales
        if (options.createFlashcards) {
            const errors = quizData.questions.filter(q => q.userAnswer !== q.correct_option_index);

            if (errors.length > 0) {
                // Pasamos quizData.topic como fallback, pero el repo ahora usará q.topic
                await repository.createFlashcardsBatch(userId, errors, quizData.topic, attemptId);
                return { attemptId, flashcardsCreated: errors.length };
            }
        }

        return { attemptId, flashcardsCreated: 0 };
    }

    // --- NUEVO: MÉTODOS DE ANALÍTICA DEL QUIZ (MIGRADOS DESDE EL CONTROLADOR) ---
    async incrementUserSimulatorUsage(userId) {
        await repository.incrementSimulatorUsage(userId);
    }

    async getUserQuizStats(userId, context, target, limit, days = null, areas = null) {
        let topicFilter = '';
        let timeFilter = '';
        const params = [userId];

        if (days) {
            timeFilter = ` AND created_at >= NOW() - INTERVAL '${parseInt(days)} days'`;
        }

        // Filter by target (works for both MEDICINA and EDUCACION contexts)
        if (target) {
            params.push(target);
            topicFilter += ` AND target = $${params.length}`;
        }

        if (limit) {
            params.push(parseInt(limit, 10));
            topicFilter += ` AND total_questions = $${params.length}`;
        }

        const qStats = await repository.getBasicQuizStats(userId, topicFilter, params, timeFilter, areas);

        let accuracy = 0;
        let avgScore20 = 0;
        const totalQ = parseInt(qStats.total_questions) || 0;
        const totalCorrect = parseInt(qStats.total_correct) || 0;
        const totalGames = parseInt(qStats.total_games) || 0;
        const totalIncorrect = totalQ - totalCorrect;

        if (totalQ > 0) {
            accuracy = (totalCorrect / totalQ) * 100;
            avgScore20 = (totalCorrect / totalQ) * 20;
        }

        const mastered = await repository.getMasteredFlashcardsCount(userId);

        let strongest = 'N/A';
        let weakest = 'N/A';
        let radarData = [];

        try {
            const topicRes = await repository.getTopicAnalysis(userId, topicFilter, params, timeFilter, areas);
            if (topicRes.length > 0) {
                strongest = topicRes[0].subtema;
                weakest = topicRes[topicRes.length - 1].subtema;

                radarData = topicRes.map(row => {
                    const correctAnswers = parseInt(row.correct_answers || 0, 10);
                    const totalAnswers = parseInt(row.total_answers || 0, 10);
                    return {
                        subject: row.subtema,
                        accuracy: totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0,
                        correct: correctAnswers,
                        total: totalAnswers
                    };
                });
            }
        } catch (e) {
            console.warn("⚠️ No se pudo procesar area_stats JSONB.", e.message);
            const topicRes = await repository.getTopicAnalysisFallback(userId, topicFilter, params);
            if (topicRes.length > 0) {
                strongest = topicRes[0].topic;
                weakest = topicRes[topicRes.length - 1].topic;
            }
        }

        let deckId = null;
        if (context) {
            deckId = await repository.ensureSystemDeck(userId, context);
        }

        return {
            avg_score: avgScore20.toFixed(1),
            accuracy: Math.round(accuracy),
            total_correct: totalCorrect,
            total_incorrect: totalIncorrect,
            mastered_cards: mastered,
            strongest_topic: strongest,
            weakest_topic: weakest,
            radar_data: radarData,
            system_deck_id: deckId
        };
    }

    async getLeaderboard() {
        return await repository.getLeaderboard();
    }
}

module.exports = new TrainingService();
