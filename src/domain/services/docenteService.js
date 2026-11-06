const docenteRepository = require('../repositories/docenteRepository');

class DocenteService {

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
        // Education classifications are not reliable; legacy area preferences are ignored.
        const target = categoryOptions.target || 'ASCENSO';
        const career = categoryOptions.career || 'EBR - Primaria';
        const difficulty = categoryOptions.difficulty || null;
        const mode = categoryOptions.mode === 'real' || limit >= 50 ? 'real' : (categoryOptions.mode || 'standard');
        const candidates = await docenteRepository.findQuestionsInBankBatch(
            target, ['*'], Math.max(50, limit * 3), userId, career, difficulty, seenIds, mode
        );
        const questions = candidates.map(question => this.shuffleOptions({ ...question, topic: '' }));
        return {
            questions: this.packExamQuestions(questions, limit, [], true),
            source: 'BANK',
            topic: 'General',
            areas: []
        };
    }

    async submitQuizResult(userId, quizData) {
        // Scores depend on answers, not on the optional classification of the question.
        quizData.topic = 'General';
        quizData.areas = [];
        quizData.areaStats = {};
        quizData.difficulty = quizData.difficulty && quizData.difficulty !== 'MIXTO' ? quizData.difficulty : 'Senior';
        if (Array.isArray(quizData.questions)) {
            quizData.questions.forEach(question => {
                question.topic = '';
                question.isCorrect = question.isCorrect === true || (
                    question.isCorrect === undefined && question.userAnswer != null &&
                    question.correct_option_index != null &&
                    Number(question.userAnswer) === Number(question.correct_option_index)
                );
            });
        }
        quizData.score = quizData.questions?.length
            ? quizData.questions.filter(question => question.isCorrect).length
            : Number(quizData.score) || 0;
        const savedAttempt = await docenteRepository.saveQuizHistory(userId, quizData);
        return {
            attemptId: typeof savedAttempt === 'object' ? savedAttempt.attemptId : savedAttempt,
            flashcardsCreated: 0,
            wasCreated: typeof savedAttempt === 'object' ? savedAttempt.wasCreated : true
        };
    }

    async incrementUserSimulatorUsage(userId) {
        await docenteRepository.incrementSimulatorUsage(userId);
    }

    async getUserQuizStats(userId, context, target, limit, days = null, _areas = null, career = null) {
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

        const qStats = await docenteRepository.getBasicQuizStats(userId, topicFilter, params, timeFilter);

        let accuracy = 0;
        let avgScore20 = 0;
        const totalQ = parseInt(qStats.total_questions) || 0;
        const totalCorrect = parseInt(qStats.total_correct) || 0;
        const totalIncorrect = totalQ - totalCorrect;

        if (totalQ > 0) {
            accuracy = (totalCorrect / totalQ) * 100;
            avgScore20 = (totalCorrect / totalQ) * 20;
        }

        const flashcardRepository = require('../repositories/flashcardRepository');
        const mastered = await flashcardRepository.getMasteredFlashcardsCount ? await flashcardRepository.getMasteredFlashcardsCount(userId) : 0;

        const strongest = 'N/A';
        const weakest = 'N/A';
        const radarData = [];
        const deckId = null;

        return {
            avg_score: avgScore20.toFixed(1),
            accuracy: Math.round(accuracy),
            total_correct: totalCorrect,
            total_incorrect: totalIncorrect,
            total_questions: totalQ,
            total_games: parseInt(qStats.total_games, 10) || 0,
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
            if (q.case_id) {
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

        const packedUnits = [];
        let currentCount = 0;
        const areasList = activeAreas.length > 0
            ? activeAreas
            : Array.from(new Set([...soloQuestionsByArea.keys(), ...caseUnitsByArea.keys()]));

        // 3. Selección balanceada de casos completos (solo si caben enteros en el cupo restante)
        let hasCasesToProcess = true;
        while (hasCasesToProcess && currentCount < limit) {
            let addedAnyCaseInRound = false;
            for (const area of areasList) {
                const spaceLeft = limit - currentCount;
                if (spaceLeft <= 0) break;

                const areaCases = caseUnitsByArea.get(area);
                if (areaCases && areaCases.length > 0) {
                    const fittingCaseIdx = areaCases.findIndex(c => c.length <= spaceLeft);
                    if (fittingCaseIdx !== -1) {
                        const [fittingCase] = areaCases.splice(fittingCaseIdx, 1);
                        packedUnits.push(fittingCase);
                        currentCount += fittingCase.length;
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
        while (hasSoloToProcess && currentCount < limit) {
            let addedAnySoloInRound = false;
            for (const area of areasList) {
                const spaceLeft = limit - currentCount;
                if (spaceLeft <= 0) break;

                const soloList = soloQuestionsByArea.get(area);
                if (soloList && soloList.length > 0) {
                    packedUnits.push([soloList.shift()]);
                    currentCount += 1;
                    addedAnySoloInRound = true;
                }
            }
            if (!addedAnySoloInRound) {
                hasSoloToProcess = false;
            }
        }

        // 5. Salvaguarda: Si aún faltara completar cupo y quedan solos en cualquier área
        if (currentCount < limit) {
            for (const soloList of soloQuestionsByArea.values()) {
                while (soloList.length > 0 && currentCount < limit) {
                    packedUnits.push([soloList.shift()]);
                    currentCount += 1;
                }
            }
        }

        // 6. Mezclar de forma balanceada los bloques para que los casos no queden siempre agrupados al principio,
        // garantizando que las preguntas de cada casuística se mantengan siempre contiguas y en su orden oficial
        const shuffledUnits = packedUnits.sort(() => 0.5 - Math.random());
        return shuffledUnits.flat();
    }

    async getLeaderboard() {
        return await docenteRepository.getLeaderboard();
    }
}

module.exports = new DocenteService();
