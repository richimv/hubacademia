const quizSessionRepository = require('../repositories/quizSessionRepository');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SUPPORTED_DOMAINS = new Set(['medicine', 'education']);

class QuizSessionService {
    async createSession({ userId = null, domain, questions }) {
        this._assertDomain(domain);
        const preparedQuestions = this._prepareQuestions(questions);
        const session = await quizSessionRepository.createSession({ userId, domain, questions: preparedQuestions });
        return {
            quizSessionId: session.id,
            expiresAt: session.expires_at,
            questions: session.questions.map(row => this._toClientQuestion(row))
        };
    }

    async appendQuestions({ sessionId, userId, domain, questions }) {
        this._assertSessionId(sessionId);
        this._assertDomain(domain);
        const preparedQuestions = this._prepareQuestions(questions);
        const storedQuestions = await quizSessionRepository.appendQuestions({
            sessionId,
            userId,
            domain,
            questions: preparedQuestions
        });
        return storedQuestions.map(row => this._toClientQuestion(row));
    }

    async recordAnswer({ sessionId, sessionQuestionId, userId = null, domain, selectedOptionIndex }) {
        this._assertSessionId(sessionId);
        this._assertSessionId(sessionQuestionId);
        this._assertDomain(domain);
        const row = await quizSessionRepository.recordAnswer({
            sessionId,
            sessionQuestionId,
            userId,
            domain,
            selectedOptionIndex
        });
        return {
            sessionQuestionId: row.session_question_id,
            selectedOptionIndex: row.selected_option_index,
            isCorrect: row.is_correct,
            correctOptionIndex: Number(row.answer_payload.correct_option_index),
            explanation: row.answer_payload.explanation || '',
            explanationImageUrl: row.answer_payload.explanation_image_url || null,
            answeredAt: row.answered_at
        };
    }

    async gradeForSubmission({ sessionId, userId, domain, clientAnswers = [] }) {
        this._assertSessionId(sessionId);
        this._assertDomain(domain);
        const session = await quizSessionRepository.getGradedSession({ sessionId, userId, domain, clientAnswers });
        const questions = session.questions.map((row, idx) => {
            const publicPayload = row.public_payload || {};
            const answerPayload = row.answer_payload || {};
            const clientAns = Array.isArray(clientAnswers) ? clientAnswers[idx] : null;

            let selectedOptionIndex = row.selected_option_index;
            if (selectedOptionIndex === null && clientAns && clientAns.userAnswer !== undefined) {
                selectedOptionIndex = Number(clientAns.userAnswer);
            }

            const correctOptionIndex = Number(
                answerPayload.correct_option_index !== undefined
                    ? answerPayload.correct_option_index
                    : (publicPayload.correct_option_index !== undefined ? publicPayload.correct_option_index : clientAns?.correct_option_index)
            );

            const isCorrect = (selectedOptionIndex !== null && !isNaN(selectedOptionIndex) && !isNaN(correctOptionIndex))
                ? Number(selectedOptionIndex) === correctOptionIndex
                : (row.is_correct === true || clientAns?.isCorrect === true);

            return {
                id: row.bank_question_id || publicPayload.id || clientAns?.id || null,
                sessionQuestionId: row.id,
                userAnswer: selectedOptionIndex,
                correct_option_index: correctOptionIndex,
                isCorrect: isCorrect,
                topic: publicPayload.topic || publicPayload.area || clientAns?.topic || 'General'
            };
        });
        return {
            sessionId: session.id,
            score: questions.filter(question => question.isCorrect).length,
            totalQuestions: questions.length,
            questions
        };
    }

    async markSubmitted(sessionId, attemptId) {
        await quizSessionRepository.markSubmitted(sessionId, attemptId);
    }

    _prepareQuestions(questions) {
        if (!Array.isArray(questions) || questions.length === 0) {
            throw this._domainError('QUIZ_QUESTIONS_REQUIRED');
        }

        return questions.map(question => {
            const options = Array.isArray(question.options) ? question.options : [];
            const correctOptionIndex = Number(
                question.correct_option_index !== undefined
                    ? question.correct_option_index
                    : question.correct_index
            );
            if (options.length < 2 || !Number.isInteger(correctOptionIndex) || correctOptionIndex < 0 || correctOptionIndex >= options.length) {
                throw this._domainError('INVALID_QUIZ_QUESTION');
            }

            const {
                correctAnswer,
                correct_answer,
                answer_index,
                isCorrect,
                solution,
                ...publicPayload
            } = question;

            const explanation = question.explanation || '';
            const explanationImageUrl = question.explanation_image_url || null;
            const bankQuestionId = UUID_PATTERN.test(String(question.id || '')) ? question.id : null;
            return {
                bankQuestionId,
                publicPayload: {
                    ...publicPayload,
                    id: bankQuestionId,
                    options: [...options],
                    correct_option_index: correctOptionIndex,
                    explanation: explanation,
                    explanation_image_url: explanationImageUrl
                },
                answerPayload: {
                    correct_option_index: correctOptionIndex,
                    explanation: explanation,
                    explanation_image_url: explanationImageUrl
                }
            };
        });
    }

    _toClientQuestion(row) {
        const publicPayload = row.public_payload || {};
        const answerPayload = row.answer_payload || {};
        return {
            ...publicPayload,
            id: row.bank_question_id || publicPayload.id || null,
            sessionQuestionId: row.id,
            correct_option_index: publicPayload.correct_option_index !== undefined 
                ? publicPayload.correct_option_index 
                : (answerPayload.correct_option_index !== undefined ? Number(answerPayload.correct_option_index) : undefined),
            explanation: publicPayload.explanation !== undefined 
                ? publicPayload.explanation 
                : (answerPayload.explanation || ''),
            explanation_image_url: publicPayload.explanation_image_url !== undefined 
                ? publicPayload.explanation_image_url 
                : (answerPayload.explanation_image_url || null)
        };
    }

    _assertSessionId(value) {
        if (!UUID_PATTERN.test(String(value || ''))) {
            throw this._domainError('INVALID_QUIZ_SESSION_ID');
        }
    }

    _assertDomain(domain) {
        if (!SUPPORTED_DOMAINS.has(domain)) {
            throw this._domainError('INVALID_QUIZ_DOMAIN');
        }
    }

    _domainError(code) {
        const error = new Error(code);
        error.code = code;
        return error;
    }
}

module.exports = new QuizSessionService();
