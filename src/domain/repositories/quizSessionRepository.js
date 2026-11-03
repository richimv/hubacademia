const db = require('../../infrastructure/database/db');

class QuizSessionRepository {
    async createSession({ userId = null, domain, questions }) {
        const client = await db.pool().connect();
        try {
            await client.query('BEGIN');
            const sessionResult = await client.query(
                `INSERT INTO quiz_sessions (user_id, domain)
                 VALUES ($1, $2)
                 RETURNING id, expires_at`,
                [userId, domain]
            );
            const session = sessionResult.rows[0];
            const storedQuestions = await this._insertQuestions(client, session.id, questions, 0);
            await client.query('COMMIT');
            return { ...session, questions: storedQuestions };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async appendQuestions({ sessionId, userId, domain, questions }) {
        const client = await db.pool().connect();
        try {
            await client.query('BEGIN');
            const session = await this._lockOwnedSession(client, sessionId, userId, domain);
            this._assertActive(session);

            const positionResult = await client.query(
                `SELECT COALESCE(MAX(position), -1) + 1 AS next_position
                 FROM quiz_session_questions
                 WHERE session_id = $1`,
                [sessionId]
            );
            const nextPosition = Number(positionResult.rows[0].next_position);
            const storedQuestions = await this._insertQuestions(client, sessionId, questions, nextPosition);
            await client.query('COMMIT');
            return storedQuestions;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async recordAnswer({ sessionId, sessionQuestionId, userId, domain, selectedOptionIndex }) {
        const client = await db.pool().connect();
        try {
            await client.query('BEGIN');
            const result = await client.query(
                `SELECT
                    s.id AS session_id,
                    s.user_id,
                    s.domain,
                    s.status,
                    s.expires_at,
                    q.id AS session_question_id,
                    q.public_payload,
                    q.answer_payload,
                    q.selected_option_index,
                    q.is_correct,
                    q.answered_at
                 FROM quiz_sessions s
                 JOIN quiz_session_questions q ON q.session_id = s.id
                 WHERE s.id = $1 AND q.id = $2
                 FOR UPDATE OF s, q`,
                [sessionId, sessionQuestionId]
            );

            if (result.rows.length === 0) {
                throw this._domainError('QUIZ_QUESTION_NOT_FOUND');
            }

            const row = result.rows[0];
            this._assertOwnership(row, userId, domain);
            this._assertActive(row, row.selected_option_index !== null);

            if (row.selected_option_index === null) {
                const options = Array.isArray(row.public_payload.options) ? row.public_payload.options : [];
                if (!Number.isInteger(selectedOptionIndex) || selectedOptionIndex < 0 || selectedOptionIndex >= options.length) {
                    throw this._domainError('INVALID_OPTION_INDEX');
                }

                const correctOptionIndex = Number(row.answer_payload.correct_option_index);
                const isCorrect = selectedOptionIndex === correctOptionIndex;
                const updateResult = await client.query(
                    `UPDATE quiz_session_questions
                     SET selected_option_index = $1,
                         is_correct = $2,
                         answered_at = NOW()
                     WHERE id = $3
                     RETURNING selected_option_index, is_correct, answered_at`,
                    [selectedOptionIndex, isCorrect, sessionQuestionId]
                );
                Object.assign(row, updateResult.rows[0]);
            }

            await client.query('COMMIT');
            return row;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getGradedSession({ sessionId, userId, domain, clientAnswers = [] }) {
        const client = await db.pool().connect();
        try {
            await client.query('BEGIN');
            const session = await this._lockOwnedSession(client, sessionId, userId, domain);
            this._assertActive(session, true);

            const questionsResult = await client.query(
                `SELECT id, bank_question_id, position, public_payload, answer_payload,
                        selected_option_index, is_correct, answered_at
                 FROM quiz_session_questions
                 WHERE session_id = $1
                 ORDER BY position ASC`,
                [sessionId]
            );

            // Si hay respuestas enviadas en lote por el cliente, sincronizarlas de forma segura
            if (Array.isArray(clientAnswers) && clientAnswers.length > 0) {
                const clientMap = new Map();
                clientAnswers.forEach((ans, idx) => {
                    if (ans.sessionQuestionId) clientMap.set(ans.sessionQuestionId, ans);
                    if (ans.id) clientMap.set(ans.id, ans);
                });

                for (let i = 0; i < questionsResult.rows.length; i++) {
                    const row = questionsResult.rows[i];
                    if (row.selected_option_index === null) {
                        const publicPayload = row.public_payload || {};
                        const clientAns = clientMap.get(row.id)
                            || clientMap.get(row.bank_question_id)
                            || clientMap.get(publicPayload.id)
                            || clientAnswers[i];

                        if (clientAns && clientAns.userAnswer !== undefined && clientAns.userAnswer !== null) {
                            const selectedOptionIndex = Number(clientAns.userAnswer);
                            const options = Array.isArray(publicPayload.options) ? publicPayload.options : [];
                            
                            if (Number.isInteger(selectedOptionIndex) && selectedOptionIndex >= 0 && (options.length === 0 || selectedOptionIndex < options.length)) {
                                const correctOptionIndex = Number(row.answer_payload?.correct_option_index);
                                const isCorrect = selectedOptionIndex === correctOptionIndex;

                                await client.query(
                                    `UPDATE quiz_session_questions
                                     SET selected_option_index = $1,
                                         is_correct = $2,
                                         answered_at = NOW()
                                     WHERE id = $3`,
                                    [selectedOptionIndex, isCorrect, row.id]
                                );

                                row.selected_option_index = selectedOptionIndex;
                                row.is_correct = isCorrect;
                                row.answered_at = new Date();
                            }
                        }
                    }
                }
            }

            if (session.status === 'active') {
                await client.query(
                    `UPDATE quiz_sessions
                     SET status = 'completed', completed_at = NOW()
                     WHERE id = $1`,
                    [sessionId]
                );
            }

            await client.query('COMMIT');
            return { ...session, questions: questionsResult.rows };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async markSubmitted(sessionId, attemptId) {
        await db.query(
            `UPDATE quiz_sessions
             SET status = 'submitted', submitted_at = COALESCE(submitted_at, NOW()),
                 quiz_history_id = COALESCE(quiz_history_id, $2)
             WHERE id = $1`,
            [sessionId, attemptId]
        );
    }

    async _insertQuestions(client, sessionId, questions, startPosition) {
        if (!Array.isArray(questions) || questions.length === 0) return [];

        const payload = questions.map((question, index) => ({
            bank_question_id: question.bankQuestionId,
            position: startPosition + index,
            public_payload: question.publicPayload,
            answer_payload: question.answerPayload
        }));

        const result = await client.query(
            `WITH input AS (
                SELECT *
                FROM jsonb_to_recordset($2::jsonb) AS x(
                    bank_question_id uuid,
                    position integer,
                    public_payload jsonb,
                    answer_payload jsonb
                )
             ), inserted AS (
                INSERT INTO quiz_session_questions (
                    session_id, bank_question_id, position, public_payload, answer_payload
                )
                SELECT $1, bank_question_id, position, public_payload, answer_payload
                FROM input
                RETURNING id, bank_question_id, position, public_payload
             )
             SELECT * FROM inserted ORDER BY position ASC`,
            [sessionId, JSON.stringify(payload)]
        );
        return result.rows;
    }

    async _lockOwnedSession(client, sessionId, userId, domain) {
        const result = await client.query(
            `SELECT id, user_id, domain, status, expires_at, quiz_history_id
             FROM quiz_sessions
             WHERE id = $1
             FOR UPDATE`,
            [sessionId]
        );
        if (result.rows.length === 0) {
            throw this._domainError('QUIZ_SESSION_NOT_FOUND');
        }
        const session = result.rows[0];
        this._assertOwnership(session, userId, domain);
        return session;
    }

    _assertOwnership(session, userId, domain) {
        const expectedUserId = userId || null;
        const actualUserId = session.user_id || null;
        if (actualUserId !== expectedUserId || session.domain !== domain) {
            throw this._domainError('QUIZ_SESSION_FORBIDDEN');
        }
    }

    _assertActive(session, allowCompleted = false) {
        if (new Date(session.expires_at).getTime() <= Date.now()) {
            throw this._domainError('QUIZ_SESSION_EXPIRED');
        }
        const allowedStatuses = allowCompleted ? ['active', 'completed', 'submitted'] : ['active'];
        if (!allowedStatuses.includes(session.status)) {
            throw this._domainError('QUIZ_SESSION_CLOSED');
        }
    }

    _domainError(code) {
        const error = new Error(code);
        error.code = code;
        return error;
    }
}

module.exports = new QuizSessionRepository();
