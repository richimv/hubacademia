const docenteRepository = require('../repositories/docenteRepository');
const { shuffleQuestionOptions, packExamQuestions } = require('../utils/quizPackingUtils');

class DocenteService {

    shuffleOptions(question) {
        return shuffleQuestionOptions(question);
    }

    async generateQuiz(categoryOptions, userId, limit = 10, _subscriptionTier = 'free', seenIds = []) {
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

    async getUserQuizStats(userId, _context, target, limit, days = null, _areas = null, career = null) {
        let topicFilter = ` AND target IN ('NOMBRAMIENTO', 'ASCENSO', 'ACCESO_CARGOS')`;
        let timeFilter = '';
        const params = [userId];

        if (days) {
            const safeDays = Math.min(Math.max(parseInt(days, 10) || 30, 1), 3650);
            timeFilter = ` AND created_at >= NOW() - INTERVAL '${safeDays} days'`;
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
        const totalQ = parseInt(qStats.total_questions, 10) || 0;
        const totalCorrect = parseInt(qStats.total_correct, 10) || 0;
        const totalIncorrect = totalQ - totalCorrect;

        if (totalQ > 0) {
            accuracy = (totalCorrect / totalQ) * 100;
            avgScore20 = (totalCorrect / totalQ) * 20;
        }

        return {
            avg_score: avgScore20.toFixed(1),
            accuracy: Math.round(accuracy),
            total_correct: totalCorrect,
            total_incorrect: totalIncorrect,
            total_questions: totalQ,
            total_games: parseInt(qStats.total_games, 10) || 0,
            mastered_cards: 0,
            strongest_topic: 'N/A',
            weakest_topic: 'N/A',
            radar_data: [],
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
        return await docenteRepository.getLeaderboard();
    }
}

module.exports = new DocenteService();
