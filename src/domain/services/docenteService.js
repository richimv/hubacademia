const docenteRepository = require('../repositories/docenteRepository');
const adminAiService = require('./adminAiService');

const CANONICAL_SUBAREAS_MAP = {
    // ASCENSO - Enfoques y Principios del CNEB
    'enfoque por competencias': 'Enfoque por competencias',
    'enfoques por competencias': 'Enfoque por competencias',
    'competencias': 'Enfoque por competencias',
    'enfoques transversales': 'Enfoques transversales',
    'enfoque transversal': 'Enfoques transversales',
    'principios de la educacion peruana': 'Principios de la educación peruana',
    'principios de la educacion': 'Principios de la educación peruana',

    // ASCENSO - Teorías y Procesos del Aprendizaje
    'constructivismo y socioconstructivismo': 'Constructivismo y socioconstructivismo',
    'constructivismo': 'Constructivismo y socioconstructivismo',
    'socioconstructivismo': 'Constructivismo y socioconstructivismo',
    'aprendizajes significativos': 'Aprendizajes significativos',
    'aprendizaje significativo': 'Aprendizajes significativos',
    'activacion y recojo de saberes previos': 'Activación y recojo de saberes previos',
    'saberes previos': 'Activación y recojo de saberes previos',
    'recojo de saberes previos': 'Activación y recojo de saberes previos',
    'conflicto o disonancia cognitiva y demanda cognitiva': 'Conflicto o disonancia cognitiva y demanda cognitiva',
    'conflicto cognitivo': 'Conflicto o disonancia cognitiva y demanda cognitiva',
    'disonancia cognitiva': 'Conflicto o disonancia cognitiva y demanda cognitiva',
    'demanda cognitiva': 'Conflicto o disonancia cognitiva y demanda cognitiva',
    'procesos auxiliares': 'Procesos auxiliares',
    'procesos auxiliares del aprendizaje': 'Procesos auxiliares',

    // ASCENSO - Planificación y Evaluación
    'planificacion pedagogica': 'Planificación pedagógica',
    'evaluacion formativa y retroalimentacion': 'Evaluación formativa y retroalimentación',
    'evaluacion formativa': 'Evaluación formativa y retroalimentación',
    'retroalimentacion': 'Evaluación formativa y retroalimentación',

    // ASCENSO - Clima Escolar e Inclusión
    'convivencia democratica y clima de aula': 'Convivencia democrática y clima de aula',
    'convivencia democratica': 'Convivencia democrática y clima de aula',
    'clima de aula': 'Convivencia democrática y clima de aula',
    'educacion inclusiva y dua': 'Educación inclusiva y DUA',
    'educacion inclusiva': 'Educación inclusiva y DUA',
    'dua': 'Educación inclusiva y DUA',
    'caracteristicas y desarrollo del estudiante': 'Características y desarrollo del estudiante',
    'desarrollo del estudiante': 'Características y desarrollo del estudiante',

    // NOMBRAMIENTO
    'comprension lectora': 'Comprensión Lectora',
    'razonamiento logico': 'Razonamiento Lógico',
    'teorias del aprendizaje y desarrollo': 'Teorías del Aprendizaje y Desarrollo',
    'principios del curriculo nacional (cneb)': 'Principios del Currículo Nacional (CNEB)',
    'planificacion curricular (pci, pca, unidades)': 'Planificación Curricular (PCI, PCA, Unidades)',
    'convivencia escolar y clima de aula': 'Convivencia Escolar y Clima de Aula',

    // ACCESO CARGOS
    'liderazgo pedagogico': 'Liderazgo Pedagógico',
    'planificacion estrategica (pei, pat)': 'Planificación Estratégica (PEI, PAT)',
    'gestion del riesgo de desastres': 'Gestión del Riesgo de Desastres',
    'monitoreo y acompanamiento': 'Monitoreo y Acompañamiento'
};

function normalizeDocenteAreaName(topic) {
    if (!topic || typeof topic !== 'string') return 'Conocimientos Pedagógicos';
    const norm = topic.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // 1. Coincidencia directa con mapa canónico
    if (CANONICAL_SUBAREAS_MAP[norm]) {
        return CANONICAL_SUBAREAS_MAP[norm];
    }

    // 2. Coincidencia inteligente por subcadenas específicas de subáreas
    if (norm.includes('competencia')) return 'Enfoque por competencias';
    if (norm.includes('transversal')) return 'Enfoques transversales';
    if (norm.includes('principios de la educacion') || norm.includes('educacion peruana')) return 'Principios de la educación peruana';

    if (norm.includes('constructivismo') || norm.includes('socioconstructivismo')) return 'Constructivismo y socioconstructivismo';
    if (norm.includes('significativo')) return 'Aprendizajes significativos';
    if (norm.includes('saberes previos')) return 'Activación y recojo de saberes previos';
    if (norm.includes('disonancia') || norm.includes('conflicto cognitivo') || norm.includes('demanda cognitiva')) return 'Conflicto o disonancia cognitiva y demanda cognitiva';
    if (norm.includes('auxiliar')) return 'Procesos auxiliares';

    if (norm.includes('planificacion')) return 'Planificación pedagógica';
    if (norm.includes('evaluacion') || norm.includes('retroalimentacion')) return 'Evaluación formativa y retroalimentación';

    if (norm.includes('convivencia') || norm.includes('clima')) return 'Convivencia democrática y clima de aula';
    if (norm.includes('inclusi') || norm.includes('dua')) return 'Educación inclusiva y DUA';
    if (norm.includes('desarrollo del estudiante') || norm.includes('caracteristicas')) return 'Características y desarrollo del estudiante';

    if (norm.includes('comprension lectora') || norm.includes('lectura')) return 'Comprensión Lectora';
    if (norm.includes('razonamiento') || norm.includes('logico')) return 'Razonamiento Lógico';
    if (norm.includes('liderazgo')) return 'Liderazgo Pedagógico';
    if (norm.includes('desastre')) return 'Gestión del Riesgo de Desastres';
    if (norm.includes('monitoreo')) return 'Monitoreo y Acompañamiento';

    return topic.trim();
}

class DocenteService {

    normalizeTopic(input) {
        if (!input) return "GENERAL";
        return input
            .toUpperCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .trim()
            .replace(/\s+/g, " ");
    }

    shuffleOptions(question) {
        if (!question.options || !question.options.length) return question;

        const originalOptions = question.options;
        const mappedOptions = originalOptions.map((opt, index) => ({
            text: opt,
            isCorrect: index === question.correct_option_index
        }));

        for (let i = mappedOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [mappedOptions[i], mappedOptions[j]] = [mappedOptions[j], mappedOptions[i]];
        }

        question.options = mappedOptions.map(o => o.text);
        question.correct_option_index = mappedOptions.findIndex(o => o.isCorrect);

        return question;
    }

    async generateQuiz(categoryOptions, userId, limit = 10, subscriptionTier = 'free', seenIds = []) {
        const target = categoryOptions.target || 'ASCENSO';
        const career = categoryOptions.career || 'EBR - Primaria';
        const difficulty = categoryOptions.difficulty || null;
        let areas = categoryOptions.areas && categoryOptions.areas.length > 0 ? categoryOptions.areas : [];

        if (categoryOptions.mode === 'real') {
            const EDUCATION_AREAS_BY_TARGET = {
                'ASCENSO': [
                    'Enfoque por competencias', 'Enfoques transversales', 'Principios de la educación peruana',
                    'Constructivismo y socioconstructivismo', 'Aprendizajes significativos', 'Activación y recojo de saberes previos', 'Conflicto o disonancia cognitiva y demanda cognitiva', 'Procesos auxiliares',
                    'Planificación pedagógica', 'Evaluación formativa y retroalimentación',
                    'Convivencia democrática y clima de aula', 'Educación inclusiva y DUA', 'Características y desarrollo del estudiante'
                ],
                'NOMBRAMIENTO': [
                    'Comprensión Lectora', 'Razonamiento Lógico',
                    'Teorías del Aprendizaje y Desarrollo', 'Principios del Currículo Nacional (CNEB)', 'Planificación Curricular (PCI, PCA, Unidades)', 'Evaluación Formativa y Retroalimentación', 'Convivencia Escolar y Clima de Aula', 'Principios de la Educación Peruana'
                ],
                'ACCESO_CARGOS': [
                    'Liderazgo Pedagógico', 'Planificación Estratégica (PEI, PAT)', 'Gestión del Riesgo de Desastres', 'Monitoreo y Acompañamiento'
                ]
            };
            areas = EDUCATION_AREAS_BY_TARGET[target] || EDUCATION_AREAS_BY_TARGET['ASCENSO'];
        }

        const isGeneric = !areas || areas.length === 0 ||
            (areas.length === 1 && ['GENERAL', 'EDUCACION GENERAL', 'TODAS'].includes(areas[0].toUpperCase()));

        if (isGeneric) {
            areas = [
                'Comprensión Lectora',
                'Razonamiento Lógico',
                'Teorías del Aprendizaje y Desarrollo',
                'Principios del Currículo Nacional (CNEB)',
                'Evaluación Formativa y Retroalimentación'
            ];
        }

        const normalizedAllAreas = areas.map(a => a.trim().toUpperCase());
        const areaMap = new Map();
        areas.forEach(a => areaMap.set(a.trim().toUpperCase(), a.trim()));

        const isRealMock = categoryOptions.mode === 'real' || limit >= 50;
        const isDefault = isRealMock || categoryOptions.configType === 'default' || !categoryOptions.configType;
        const queryAreas = isDefault ? ['*'] : normalizedAllAreas;

        console.log(`📡 [DocenteService] Target: ${target} | Career: ${career} | Config: ${categoryOptions.configType || 'default'} | Mode: ${categoryOptions.mode || 'standard'} | QueryAreas: ${queryAreas.join(', ')} | Limit: ${limit}`);

        const rawBankQuestions = await docenteRepository.findQuestionsInBankBatch(target, queryAreas, Math.max(50, limit * 3), userId, career, difficulty, seenIds, categoryOptions.mode);

        const questionsByArea = {};
        const returnedTopics = new Set();
        rawBankQuestions.forEach(q => {
            const shuffledQ = this.shuffleOptions(q);
            const topicKey = shuffledQ.topic ? shuffledQ.topic.toUpperCase() : 'GENERAL';
            if (!questionsByArea[topicKey]) questionsByArea[topicKey] = [];
            questionsByArea[topicKey].push(shuffledQ);
            returnedTopics.add(topicKey);
        });

        const activeAreas = (isDefault && returnedTopics.size > 0)
            ? Array.from(returnedTopics)
            : normalizedAllAreas;

        const areasWithStock = activeAreas.filter(area => questionsByArea[area] && questionsByArea[area].length > 0);

        let bankSampledAreas;
        if (limit > 10 || areasWithStock.length <= 5) {
            bankSampledAreas = [...areasWithStock];
        } else {
            bankSampledAreas = areasWithStock.sort(() => 0.5 - Math.random()).slice(0, 5);
        }

        let balancedBatch = this.packExamQuestions(rawBankQuestions, limit, bankSampledAreas, isDefault);

        const bankCount = balancedBatch.length;
        let batchIsHealthy = bankCount >= limit;

        if (!isDefault && normalizedAllAreas.length >= 5 && areasWithStock.length < 5) {
            batchIsHealthy = false;
        }
        let source = 'BANK';
        let sampledAreas = bankSampledAreas.map(a => areaMap.get(a) || a);

        if (!batchIsHealthy) {
            const neededCount = Math.max(1, limit - bankCount);
            const rawSampled = normalizedAllAreas.length >= 5
                ? normalizedAllAreas.sort(() => 0.5 - Math.random()).slice(0, 5)
                : normalizedAllAreas;

            sampledAreas = rawSampled.map(a => areaMap.get(a) || a);
            const areaPrompt = sampledAreas.join(', ');

            console.log(`🤖 [Docente-IA] Lote insuficiente (${bankCount}/${limit}). Activando RAG para ${sampledAreas.length} áreas (generando ${neededCount} items faltantes)...`);
            source = bankCount > 0 ? 'HYBRID' : 'AI_REPOSITION';

            if (limit >= 50 || categoryOptions.mode === 'real') {
                return { questions: balancedBatch, source: 'BANK', topic: sampledAreas[0], areas: areas };
            }

            try {
                let aiQuestions = await adminAiService.generateRAGQuestions(target, areaPrompt, career, neededCount, true, difficulty);

                if (aiQuestions && aiQuestions.length > 0) {
                    aiQuestions = aiQuestions.map(q => this.shuffleOptions(q));
                    const newIds = await docenteRepository.saveQuestionBankBatch(aiQuestions, sampledAreas[0], target, career);
                    if (newIds && newIds.length > 0) {
                        aiQuestions.forEach((q, idx) => { if (newIds[idx]) q.id = newIds[idx]; });
                    }
                    balancedBatch = [...balancedBatch, ...aiQuestions].slice(0, limit);
                } else if (bankCount === 0) {
                    throw new Error("AI_GENERATION_EMPTY");
                }
            } catch (aiErr) {
                console.error("❌ Error Crítico en Reposición IA (Docente):", aiErr);
                if (balancedBatch && balancedBatch.length > 0) {
                    console.log(`⚠️ [DocenteService] Retornando ${balancedBatch.length} preguntas disponibles del banco como fallback seguro.`);
                    return {
                        questions: balancedBatch.slice(0, limit),
                        source: 'BANK',
                        topic: sampledAreas[0],
                        areas: areas
                    };
                }
                throw new Error("AI_REPLENISHMENT_FAILED", { cause: aiErr });
            }
        }

        return {
            questions: balancedBatch.slice(0, limit),
            source: source,
            topic: sampledAreas[0],
            areas: areas
        };
    }

    async submitQuizResult(userId, quizData) {
        const areaStats = {};
        const allowedAreas = (quizData.areas && Array.isArray(quizData.areas) && quizData.areas.length > 0)
            ? quizData.areas
            : (quizData.topic ? [quizData.topic] : []);

        // Normalizar topic principal a 'Multi-Área' si hay más de 1 área o es un simulacro
        if (allowedAreas.length > 1 || !quizData.topic || quizData.topic.startsWith('Simulacro') || quizData.topic === 'General' || quizData.topic === 'EDUCACION') {
            quizData.topic = allowedAreas.length === 1 ? normalizeDocenteAreaName(allowedAreas[0]) : 'Multi-Área';
        } else {
            quizData.topic = normalizeDocenteAreaName(quizData.topic);
        }

        // Forzar dificultad válida (nunca MIXTO)
        quizData.difficulty = (quizData.difficulty && quizData.difficulty !== 'MIXTO') ? quizData.difficulty : 'Senior';

        if (quizData.questions && Array.isArray(quizData.questions)) {
            quizData.questions.forEach(q => {
                let rawTopic = q.topic || q.area || quizData.topic || 'Conocimientos Pedagógicos';
                const isCorrect = q.isCorrect === true || (q.userAnswer !== undefined && q.correct_option_index !== undefined && Number(q.userAnswer) === Number(q.correct_option_index));

                const isGeneric = !rawTopic || rawTopic === 'General' || rawTopic === 'EDUCACION' || rawTopic.startsWith('Simulacro');

                let topic = rawTopic;
                if (isGeneric && allowedAreas.length > 0) {
                    topic = allowedAreas[0];
                } else if (allowedAreas.length > 0) {
                    const matched = allowedAreas.find(a => rawTopic.toLowerCase().includes(a.toLowerCase()));
                    if (matched) topic = matched;
                } else if (topic.includes(',')) {
                    topic = topic.split(',')[0].trim();
                }

                // Normalización canónica de mayúsculas/acentos
                topic = normalizeDocenteAreaName(topic);

                if (!areaStats[topic]) {
                    areaStats[topic] = { correct: 0, total: 0 };
                }

                areaStats[topic].total += 1;
                if (isCorrect) {
                    areaStats[topic].correct += 1;
                }
                q.topic = topic;
                q.isCorrect = isCorrect;
            });
        }

        const calculatedScore = quizData.questions && quizData.questions.length > 0
            ? quizData.questions.filter(q => q.isCorrect === true).length
            : (Number(quizData.score) || 0);

        quizData.score = calculatedScore;
        quizData.areaStats = areaStats;

        const savedAttempt = await docenteRepository.saveQuizHistory(userId, quizData);
        const attemptId = typeof savedAttempt === 'object' ? savedAttempt.attemptId : savedAttempt;
        const wasCreated = typeof savedAttempt === 'object' ? savedAttempt.wasCreated : true;
        console.log(`💾 [DocenteService] Historial de examen guardado. Intento ID: ${attemptId}`);

        return { attemptId, flashcardsCreated: 0, wasCreated };
    }

    async incrementUserSimulatorUsage(userId) {
        await docenteRepository.incrementSimulatorUsage(userId);
    }

    async getUserQuizStats(userId, context, target, limit, days = null, areas = null, career = null) {
        let topicFilter = ` AND target IN ('NOMBRAMIENTO', 'ASCENSO', 'ACCESO_CARGOS')`;
        let timeFilter = '';
        const params = [userId];

        if (days) {
            timeFilter = ` AND created_at >= NOW() - INTERVAL '${parseInt(days)} days'`;
        }

        if (target) {
            params.push(target);
            topicFilter = ` AND target = $${params.length}`;
        }

        if (career) {
            params.push(career);
            if (career === 'EBR - Primaria') {
                topicFilter += ` AND (career = $${params.length} OR career IS NULL)`;
            } else {
                topicFilter += ` AND career = $${params.length}`;
            }
        }

        if (limit) {
            if (limit === 'real' || limit === '100' || limit === '60') {
                topicFilter += ` AND total_questions >= 50`;
            } else if (parseInt(limit, 10) === 10 || limit === 'arcade') {
                topicFilter += ` AND total_questions <= 15`;
            } else if (parseInt(limit, 10) === 20 || limit === 'study') {
                topicFilter += ` AND total_questions > 15 AND total_questions < 50`;
            } else {
                params.push(parseInt(limit, 10));
                topicFilter += ` AND total_questions = $${params.length}`;
            }
        }

        const qStats = await docenteRepository.getBasicQuizStats(userId, topicFilter, params, timeFilter, areas);

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

        const flashcardRepository = require('../repositories/flashcardRepository');
        const mastered = await flashcardRepository.getMasteredFlashcardsCount ? await flashcardRepository.getMasteredFlashcardsCount(userId) : 0;

        let strongest = 'N/A';
        let weakest = 'N/A';
        let radarData = [];

        try {
            const topicRes = await docenteRepository.getTopicAnalysis(userId, topicFilter, params, timeFilter, areas);
            if (topicRes.length > 0) {
                // Normalizar y consolidar subtemas para evitar duplicados por casing
                const consolidatedMap = new Map();
                topicRes.forEach(row => {
                    const normSubject = normalizeDocenteAreaName(row.subtema);
                    const correctAnswers = parseInt(row.correct_answers || 0, 10);
                    const totalAnswers = parseInt(row.total_answers || 0, 10);

                    if (!consolidatedMap.has(normSubject)) {
                        consolidatedMap.set(normSubject, { subject: normSubject, correct: 0, total: 0 });
                    }
                    const entry = consolidatedMap.get(normSubject);
                    entry.correct += correctAnswers;
                    entry.total += totalAnswers;
                });

                const consolidatedList = Array.from(consolidatedMap.values()).map(entry => ({
                    subject: entry.subject,
                    accuracy: entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : 0,
                    correct: entry.correct,
                    total: entry.total
                }));

                consolidatedList.sort((a, b) => b.accuracy - a.accuracy);

                if (consolidatedList.length > 0) {
                    strongest = consolidatedList[0].subject;
                    weakest = consolidatedList[consolidatedList.length - 1].subject;
                    radarData = consolidatedList;
                }
            }
        } catch (e) {
            console.warn("⚠️ No se pudo procesar area_stats JSONB en Docente.", e.message);
            const topicRes = await docenteRepository.getTopicAnalysisFallback(userId, topicFilter, params);
            if (topicRes.length > 0) {
                strongest = topicRes[0].topic;
                weakest = topicRes[topicRes.length - 1].topic;
            }
        }

        let deckId = null;

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

    /**
     * Empaqueta de forma atómica e indivisible casuísticas (preguntas hermanas) y reactivos individuales
     * garantizando que ninguna casuística sea cortada a la mitad y alcanzando con exactitud el límite solicitado.
     */
    packExamQuestions(rawBankQuestions, limit, activeAreas = [], isDefault = true) {
        if (!rawBankQuestions || rawBankQuestions.length === 0) return [];
        if (rawBankQuestions.length <= limit) {
            return rawBankQuestions;
        }

        // 1. Mapeo de casos completos
        const casesMap = new Map();
        rawBankQuestions.forEach(q => {
            if (q.case_id) {
                if (!casesMap.has(q.case_id)) casesMap.set(q.case_id, []);
                casesMap.get(q.case_id).push(q);
            }
        });

        // Ordenar las preguntas dentro de cada casuística por case_order ASC
        casesMap.forEach(siblings => {
            siblings.sort((a, b) => (a.case_order || 1) - (b.case_order || 1));
        });

        // 2. Clasificar en bloques de casos y preguntas sueltas agrupadas por área
        const caseUnitsByArea = new Map();
        const soloQuestionsByArea = new Map();
        const registeredCaseIds = new Set();

        rawBankQuestions.forEach(q => {
            const topicKey = q.topic ? q.topic.toUpperCase() : 'GENERAL';
            if (q.case_id && isDefault) {
                if (!registeredCaseIds.has(q.case_id)) {
                    registeredCaseIds.add(q.case_id);
                    const fullCase = casesMap.get(q.case_id);
                    if (!caseUnitsByArea.has(topicKey)) caseUnitsByArea.set(topicKey, []);
                    caseUnitsByArea.get(topicKey).push(fullCase);
                }
            } else {
                if (!soloQuestionsByArea.has(topicKey)) soloQuestionsByArea.set(topicKey, []);
                soloQuestionsByArea.get(topicKey).push(q);
            }
        });

        const packedQuestions = [];
        const areasList = activeAreas.length > 0
            ? activeAreas
            : Array.from(new Set([...soloQuestionsByArea.keys(), ...caseUnitsByArea.keys()]));

        // 3. Selección balanceada de casos completos (solo si caben enteros en el cupo restante)
        let hasCasesToProcess = true;
        while (hasCasesToProcess && packedQuestions.length < limit) {
            let addedAnyCaseInRound = false;
            for (const area of areasList) {
                const spaceLeft = limit - packedQuestions.length;
                if (spaceLeft <= 0) break;

                const areaCases = caseUnitsByArea.get(area);
                if (areaCases && areaCases.length > 0) {
                    const fittingCaseIdx = areaCases.findIndex(c => c.length <= spaceLeft);
                    if (fittingCaseIdx !== -1) {
                        const [fittingCase] = areaCases.splice(fittingCaseIdx, 1);
                        packedQuestions.push(...fittingCase);
                        addedAnyCaseInRound = true;
                    }
                }
            }
            if (!addedAnyCaseInRound) {
                hasCasesToProcess = false;
            }
        }

        // 4. Completar el espacio restante con Preguntas Sueltas (size 1) de forma balanceada
        let hasSoloToProcess = true;
        while (hasSoloToProcess && packedQuestions.length < limit) {
            let addedAnySoloInRound = false;
            for (const area of areasList) {
                const spaceLeft = limit - packedQuestions.length;
                if (spaceLeft <= 0) break;

                const soloList = soloQuestionsByArea.get(area);
                if (soloList && soloList.length > 0) {
                    packedQuestions.push(soloList.shift());
                    addedAnySoloInRound = true;
                }
            }
            if (!addedAnySoloInRound) {
                hasSoloToProcess = false;
            }
        }

        // 5. Salvaguarda: Si aún faltara completar cupo y quedan solos en cualquier área
        if (packedQuestions.length < limit) {
            for (const soloList of soloQuestionsByArea.values()) {
                while (soloList.length > 0 && packedQuestions.length < limit) {
                    packedQuestions.push(soloList.shift());
                }
            }
        }

        return packedQuestions;
    }

    async getLeaderboard() {
        return await docenteRepository.getLeaderboard();
    }
}

module.exports = new DocenteService();
