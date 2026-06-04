const docenteRepository = require('../repositories/docenteRepository');
const adminAiService = require('./adminAiService');

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

    async generateQuiz(categoryOptions, userId, limit = 5, subscriptionTier = 'free', seenIds = []) {
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

        const isDefault = categoryOptions.configType === 'default' || !categoryOptions.configType;
        const queryAreas = isDefault ? ['*'] : normalizedAllAreas;

        console.log(`📡 [DocenteService] Target: ${target} | Career: ${career} | Config: ${categoryOptions.configType || 'default'} | QueryAreas: ${queryAreas.join(', ')}`);

        const rawBankQuestions = await docenteRepository.findQuestionsInBankBatch(target, queryAreas, 50, userId, career, difficulty, seenIds);

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
        if (areasWithStock.length >= 5) {
            bankSampledAreas = areasWithStock.sort(() => 0.5 - Math.random()).slice(0, 5);
        } else if (areasWithStock.length > 0) {
            bankSampledAreas = [...areasWithStock];
        } else {
            bankSampledAreas = activeAreas.length > 5 ? activeAreas.sort(() => 0.5 - Math.random()).slice(0, 5) : activeAreas;
        }

        let balancedBatch = [];
        for (const area of bankSampledAreas) {
            if (balancedBatch.length < limit && questionsByArea[area] && questionsByArea[area].length > 0) {
                balancedBatch.push(questionsByArea[area].shift());
            }
        }

        if (balancedBatch.length < limit) {
            const searchOrder = [...areasWithStock, ...activeAreas];
            for (const area of searchOrder) {
                while (balancedBatch.length < limit && questionsByArea[area] && questionsByArea[area].length > 0) {
                    balancedBatch.push(questionsByArea[area].shift());
                }
            }
        }

        const bankCount = balancedBatch.length;
        let batchIsHealthy = bankCount === limit;

        if (!isDefault && normalizedAllAreas.length >= 5 && areasWithStock.length < 5) {
            batchIsHealthy = false;
        }
        let source = 'BANK';
        let sampledAreas = bankSampledAreas.map(a => areaMap.get(a) || a);

        if (!batchIsHealthy) {
            const rawSampled = normalizedAllAreas.length >= 5
                ? normalizedAllAreas.sort(() => 0.5 - Math.random()).slice(0, 5)
                : normalizedAllAreas;

            sampledAreas = rawSampled.map(a => areaMap.get(a) || a);
            const areaPrompt = sampledAreas.join(', ');

            console.log(`🤖 [Docente-IA] Lote insuficiente (${bankCount}/${limit}). Activando RAG para ${sampledAreas.length} áreas...`);
            source = 'AI_REPOSITION';

            if (limit >= 100) {
                if (bankCount < 10) {
                    throw new Error(`No hay suficientes preguntas en el banco para este simulacro. Solo hay ${bankCount} disponibles.`);
                }
                return { questions: balancedBatch, source: 'BANK', topic: sampledAreas[0] };
            }

            try {
                let aiQuestions = await adminAiService.generateRAGQuestions(target, areaPrompt, career, limit, true, difficulty);

                if (aiQuestions && aiQuestions.length > 0) {
                    source = 'HYBRID';
                    aiQuestions = aiQuestions.map(q => this.shuffleOptions(q));
                    const newIds = await docenteRepository.saveQuestionBankBatch(aiQuestions, sampledAreas[0], target, career);
                    if (newIds && newIds.length > 0) {
                        aiQuestions.forEach((q, idx) => { if (newIds[idx]) q.id = newIds[idx]; });
                    }
                    balancedBatch = aiQuestions.slice(0, limit);
                } else {
                    throw new Error("AI_GENERATION_EMPTY");
                }
            } catch (aiErr) {
                console.error("❌ Error Crítico en Reposición IA (Docente):", aiErr.message);
                throw new Error("AI_REPLENISHMENT_FAILED");
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
            : [quizData.topic];

        if (quizData.questions && Array.isArray(quizData.questions)) {
            quizData.questions.forEach(q => {
                let topic = q.topic || quizData.topic || 'General';
                const isCorrect = q.userAnswer === q.correct_option_index;

                const isGeneric = !topic || topic === 'General' || topic === 'EDUCACION';

                if (isGeneric && allowedAreas.length > 0) {
                    topic = allowedAreas[0];
                } else if (allowedAreas.length > 0) {
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
                q.topic = topic;
            });
        }

        quizData.areaStats = areaStats;

        const attemptId = await docenteRepository.saveQuizHistory(userId, quizData);
        console.log(`💾 [DocenteService] Historial de examen guardado. Intento ID: ${attemptId}`);

        return { attemptId, flashcardsCreated: 0 };
    }

    async incrementUserSimulatorUsage(userId) {
        await docenteRepository.incrementSimulatorUsage(userId);
    }

    async getUserQuizStats(userId, context, target, limit, days = null, areas = null) {
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

        if (limit) {
            if (limit === 'real') {
                topicFilter += ` AND total_questions >= 50`;
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
            console.warn("⚠️ No se pudo procesar area_stats JSONB en Docente.", e.message);
            const topicRes = await docenteRepository.getTopicAnalysisFallback(userId, topicFilter, params);
            if (topicRes.length > 0) {
                strongest = topicRes[0].topic;
                weakest = topicRes[topicRes.length - 1].topic;
            }
        }

        let deckId = null;
        if (context) {
            deckId = await flashcardRepository.ensureSystemDeck(userId, context);
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
        return await docenteRepository.getLeaderboard();
    }
}

module.exports = new DocenteService();
