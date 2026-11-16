const medicoRepository = require('../repositories/medicoRepository');
const { shuffleQuestionOptions, packExamQuestions } = require('../utils/quizPackingUtils');

function normalizeHealthAreaName(topic) {
    if (!topic || typeof topic !== 'string') return 'Salud Pública';
    const norm = topic.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (norm.includes('cuidado integral') || norm.includes('atencion integral') || norm.includes('mais-bfc')) {
        return 'Cuidado Integral de Salud';
    }
    if (norm.includes('gestion de servicios') || norm.includes('gestion en establecimientos') || (norm.includes('gestion') && norm.includes('salud'))) {
        return 'Gestión de Servicios de Salud';
    }
    if (norm.includes('etica') || norm.includes('interculturalidad') || norm.includes('bioetica')) {
        return 'Ética e Interculturalidad';
    }
    if (norm.includes('investigacion') || norm.includes('paper') || norm.includes('metodologia')) {
        return 'Investigación';
    }
    if (norm.includes('salud publica') || norm.includes('epidemiologia')) {
        return 'Salud Pública';
    }

    if (norm.includes('ginecologia') || norm.includes('obstetricia')) return 'Ginecología y Obstetricia';
    if (norm.includes('medicina interna') || norm.includes('emergencias')) return 'Medicina Interna';
    if (norm.includes('pediatria') || norm.includes('neonatologia')) return 'Pediatría';
    if (norm.includes('cirugia') || norm.includes('trauma')) return 'Cirugía General';
    if (norm.includes('anatomia')) return 'Anatomía';
    if (norm.includes('fisiologia')) return 'Fisiología';
    if (norm.includes('farmacologia')) return 'Farmacología';
    if (norm.includes('microbiologia') || norm.includes('parasitologia')) return 'Microbiología y Parasitología';
    if (norm.includes('cardiologia')) return 'Cardiología';
    if (norm.includes('gastroenterologia')) return 'Gastroenterología';
    if (norm.includes('neurologia')) return 'Neurología';
    if (norm.includes('nefrologia')) return 'Nefrología';
    if (norm.includes('neumologia')) return 'Neumología';
    if (norm.includes('endocrinologia')) return 'Endocrinología';
    if (norm.includes('infectologia')) return 'Infectología';
    if (norm.includes('reumatologia')) return 'Reumatología';
    if (norm.includes('traumatologia')) return 'Traumatología';

    return topic.trim();
}

class MedicoService {

    normalizeTopic(input) {
        if (!input) return "GENERAL";
        return input
            .toUpperCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .trim()
            .replace(/\s+/g, " ");
    }

    shuffleOptions(question) {
        return shuffleQuestionOptions(question);
    }

    async generateQuiz(categoryOptions, userId, limit = 10, _subscriptionTier = 'free', seenIds = []) {
        const target = categoryOptions.target || 'SERUMS';
        const career = categoryOptions.career || 'Medicina Humana';
        const difficulty = categoryOptions.difficulty || null;
        let areas = categoryOptions.areas && categoryOptions.areas.length > 0 ? categoryOptions.areas : [];

        if (categoryOptions.mode === 'real') {
            areas = [
                'Anatomía', 'Fisiología', 'Farmacología', 'Microbiología y Parasitología',
                'Medicina Interna', 'Pediatría', 'Ginecología y Obstetricia', 'Cirugía General',
                'Cardiología', 'Gastroenterología', 'Neurología', 'Nefrología', 'Neumología', 'Endocrinología', 'Infectología', 'Reumatología', 'Traumatología',
                'Salud Pública', 'Cuidado Integral de Salud', 'Ética e Interculturalidad', 'Investigación', 'Gestión de Servicios de Salud'
            ];
        }

        const isGeneric = !areas || areas.length === 0 ||
            (areas.length === 1 && ['GENERAL', 'MEDICINA GENERAL', 'TODAS'].includes(areas[0].toUpperCase()));

        if (isGeneric) {
            areas = [
                'Ciencias Básicas',
                'Salud Pública',
                'Ginecología y Obstetricia',
                'Pediatría',
                'Cirugía General',
                'Medicina Interna'
            ];
        }

        const normalizedAllAreas = areas.map(a => a.trim().toUpperCase());
        const areaMap = new Map();
        areas.forEach(a => areaMap.set(a.trim().toUpperCase(), a.trim()));

        const isRealMock = categoryOptions.mode === 'real' || limit >= 50;
        const isDefault = isRealMock || categoryOptions.configType === 'default' || !categoryOptions.configType;
        const queryAreas = isDefault ? ['*'] : normalizedAllAreas;
        const modeToPass = isRealMock ? 'real' : (categoryOptions.mode || 'standard');

        console.log(`📡 [MedicoService] Target: ${target} | Career: ${career} | Config: ${categoryOptions.configType || 'default'} | Mode: ${modeToPass} | QueryAreas: ${queryAreas.join(', ')} | Limit: ${limit}`);

        const rawBankQuestions = await medicoRepository.findQuestionsInBankBatch(target, queryAreas, Math.max(50, limit * 3), userId, career, difficulty, seenIds, modeToPass);

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

        const balancedBatch = this.packExamQuestions(rawBankQuestions, limit, bankSampledAreas, isDefault);
        const sampledAreas = bankSampledAreas.length > 0
            ? bankSampledAreas.map(a => areaMap.get(a) || a)
            : normalizedAllAreas.map(a => areaMap.get(a) || a);

        return {
            questions: balancedBatch.slice(0, limit),
            source: 'BANK',
            topic: sampledAreas[0] || 'Salud Pública',
            areas: areas
        };
    }

    async submitQuizResult(userId, quizData) {
        const areaStats = {};
        const allowedAreas = (quizData.areas && Array.isArray(quizData.areas) && quizData.areas.length > 0)
            ? quizData.areas
            : (quizData.topic ? [quizData.topic] : []);

        if (allowedAreas.length > 1 || !quizData.topic || quizData.topic.startsWith('Simulacro') || quizData.topic === 'General' || quizData.topic === 'MEDICINA') {
            quizData.topic = allowedAreas.length === 1 ? normalizeHealthAreaName(allowedAreas[0]) : 'Multi-Área';
        } else {
            quizData.topic = normalizeHealthAreaName(quizData.topic);
        }

        quizData.difficulty = (quizData.difficulty && quizData.difficulty !== 'MIXTO') ? quizData.difficulty : 'Senior';

        if (quizData.questions && Array.isArray(quizData.questions)) {
            quizData.questions.forEach(q => {
                const rawTopic = q.topic || q.area || quizData.topic || 'Salud Pública';
                const isCorrect = q.isCorrect === true || (q.userAnswer !== undefined && q.correct_option_index !== undefined && Number(q.userAnswer) === Number(q.correct_option_index));

                const isGeneric = !rawTopic || rawTopic === 'MEDICINA' || rawTopic === 'General' || rawTopic === 'Medicina General' || rawTopic.startsWith('Simulacro');

                let topic = rawTopic;
                if (isGeneric && allowedAreas.length > 0) {
                    topic = allowedAreas[0];
                } else if (allowedAreas.length > 0) {
                    const matched = allowedAreas.find(a => rawTopic.toLowerCase().includes(a.toLowerCase()));
                    if (matched) topic = matched;
                } else if (topic.includes(',')) {
                    topic = topic.split(',')[0].trim();
                }

                topic = normalizeHealthAreaName(topic);

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

        const savedAttempt = await medicoRepository.saveQuizHistory(userId, quizData);
        const attemptId = typeof savedAttempt === 'object' ? savedAttempt.attemptId : savedAttempt;
        const wasCreated = typeof savedAttempt === 'object' ? savedAttempt.wasCreated : true;
        console.log(`💾 [MedicoService] Historial de examen guardado. Intento ID: ${attemptId}`);

        return { attemptId, flashcardsCreated: 0, wasCreated };
    }

    async incrementUserSimulatorUsage(userId) {
        await medicoRepository.incrementSimulatorUsage(userId);
    }

    async getUserQuizStats(userId, _context, target, limit, days = null, areas = null, career = null) {
        let topicFilter = ` AND difficulty IN ('ENAM', 'SERUMS', 'ENARM', 'Básico', 'Intermedio', 'Avanzado', 'Senior', 'Junior', 'Facil', 'Medio', 'Dificil')`;
        let timeFilter = '';
        const params = [userId];

        if (days) {
            const safeDays = Math.min(Math.max(parseInt(days, 10) || 30, 1), 3650);
            timeFilter = ` AND created_at >= NOW() - INTERVAL '${safeDays} days'`;
        }

        if (target) {
            params.push(target);
            topicFilter = ` AND (target = $${params.length} OR (target IS NULL AND difficulty = $${params.length}))`;
        }

        if (career) {
            params.push(career);
            if (career === 'Medicina Humana') {
                topicFilter += ` AND (career = $${params.length} OR career IS NULL)`;
            } else {
                topicFilter += ` AND career = $${params.length}`;
            }
        }

        if (limit) {
            if (limit === 'real' || limit === '100') {
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

        const qStats = await medicoRepository.getBasicQuizStats(userId, topicFilter, params, timeFilter, areas);

        let accuracy = 0;
        let avgScore20 = 0;
        const totalQ = parseInt(qStats.total_questions, 10) || 0;
        const totalCorrect = parseInt(qStats.total_correct, 10) || 0;
        const totalIncorrect = totalQ - totalCorrect;

        if (totalQ > 0) {
            accuracy = (totalCorrect / totalQ) * 100;
            avgScore20 = (totalCorrect / totalQ) * 20;
        }

        let strongest = 'N/A';
        let weakest = 'N/A';
        let radarData = [];

        try {
            const topicRes = await medicoRepository.getTopicAnalysis(userId, topicFilter, params, timeFilter, areas);
            if (topicRes.length > 0) {
                const consolidatedMap = new Map();
                topicRes.forEach(row => {
                    const normSubject = normalizeHealthAreaName(row.subtema);
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
            console.warn("⚠️ No se pudo procesar area_stats JSONB en Medico.", e.message);
            const topicRes = await medicoRepository.getTopicAnalysisFallback(userId, topicFilter, params);
            if (topicRes.length > 0) {
                strongest = topicRes[0].topic;
                weakest = topicRes[topicRes.length - 1].topic;
            }
        }

        return {
            avg_score: avgScore20.toFixed(1),
            accuracy: Math.round(accuracy),
            total_correct: totalCorrect,
            total_incorrect: totalIncorrect,
            mastered_cards: 0,
            strongest_topic: strongest,
            weakest_topic: weakest,
            radar_data: radarData,
            system_deck_id: null
        };
    }

    /**
     * Empaqueta de forma atómica e indivisible casuísticas (preguntas hermanas) y reactivos individuales
     * garantizando que ninguna casuística sea cortada a la mitad y alcanzando con exactitud el límite solicitado.
     */
    packExamQuestions(rawBankQuestions, limit, activeAreas = [], _isDefault = true) {
        return packExamQuestions(rawBankQuestions, limit, activeAreas);
    }

    async getLeaderboard() {
        return await medicoRepository.getLeaderboard();
    }
}

module.exports = new MedicoService();
