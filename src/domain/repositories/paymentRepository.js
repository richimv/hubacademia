const db = require('../../infrastructure/database/db');

const PLAN_MONTHS = Object.freeze({
    basic: 2,
    advanced: 4
});

const ALLOWED_EVENT_STATUSES = new Set(['processing', 'processed', 'failed']);

class PaymentRepository {
    /**
     * Registra de forma idempotente un evento de pago si es nuevo o si el intento previo falló.
     * Mantiene el contrato exacto de la tabla `payment_events`.
     *
     * @param {Object} params
     * @param {string} [params.eventId] - Identificador único del pago en pasarela (payment_id)
     * @param {string} [params.paymentId] - Alias retrocompatible de eventId
     * @param {string} [params.eventType] - Tipo de evento (metadato del webhook)
     * @param {string} [params.email] - Email del pagador (opcional)
     * @param {string} params.userId - UUID del usuario
     * @param {string} [params.planType] - 'basic' | 'advanced'
     * @param {string} [params.planId] - Alias retrocompatible de planType
     * @param {number} params.amount - Monto pagado
     * @param {string} [params.status='processing'] - Estado inicial en el ledger
     * @param {Object} [params.rawPayload] - Payload crudo del webhook (no persistido en tabla actual)
     * @param {Object} [params.client] - Cliente transaccional pg opcional
     * @returns {Promise<boolean>} true si se reclamó el evento para procesarlo; false si es replay duplicado
     */
    async recordEventIfNew({
        eventId,
        paymentId,
        eventType: _eventType,
        email: _email,
        userId,
        planType,
        planId,
        amount,
        status = 'processing',
        rawPayload: _rawPayload,
        client = null
    } = {}) {
        const resolvedPaymentId = eventId || paymentId;
        const resolvedPlanId = planType || planId;

        if (!resolvedPaymentId || !userId || !resolvedPlanId) {
            throw new Error('eventId, userId y planType son requeridos para registrar el evento de pago.');
        }

        const resolvedStatus = ALLOWED_EVENT_STATUSES.has(status) ? status : 'processing';
        const executor = client || db;

        try {
            const claim = await executor.query(`
                INSERT INTO payment_events (payment_id, user_id, plan_id, amount, status)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (payment_id) DO UPDATE
                    SET status = $5, error_message = NULL
                    WHERE payment_events.status = 'failed'
                RETURNING payment_id
            `, [String(resolvedPaymentId), userId, resolvedPlanId, amount, resolvedStatus]);

            return Boolean(claim.rows && claim.rows.length > 0);
        } catch (error) {
            console.error('❌ [PaymentRepository] Error en recordEventIfNew:', error.message);
            throw error;
        }
    }

    /**
     * Marca un evento de pago como procesado exitosamente.
     * @param {string} eventId
     * @param {Object} [client]
     */
    async markEventProcessed(eventId, client = null) {
        if (!eventId) throw new Error('eventId es requerido para markEventProcessed.');
        const executor = client || db;
        try {
            await executor.query(`
                UPDATE payment_events
                SET status = 'processed', processed_at = NOW()
                WHERE payment_id = $1
            `, [String(eventId)]);
        } catch (error) {
            console.error('❌ [PaymentRepository] Error en markEventProcessed:', error.message);
            throw error;
        }
    }

    /**
     * Registra un fallo de procesamiento en el ledger para auditoría y reintento posterior.
     */
    async markEventFailed({ eventId, paymentId, userId, planType, planId, amount, errorMessage } = {}) {
        const resolvedPaymentId = eventId || paymentId;
        const resolvedPlanId = planType || planId;
        if (!resolvedPaymentId || !userId || !resolvedPlanId) return;

        try {
            await db.query(`
                INSERT INTO payment_events (payment_id, user_id, plan_id, amount, status, error_message)
                VALUES ($1, $2, $3, $4, 'failed', LEFT($5, 1000))
                ON CONFLICT (payment_id) DO UPDATE
                SET status = 'failed', error_message = EXCLUDED.error_message
            `, [String(resolvedPaymentId), userId, resolvedPlanId, amount, String(errorMessage || 'Error desconocido')]);
        } catch (auditError) {
            console.error('⚠️ No se pudo registrar el fallo del webhook:', auditError.message);
        }
    }

    /**
     * Activa o actualiza la suscripción del usuario desde el webhook de pago,
     * reiniciando contadores de consumo y acumulando meses en upgrade basic -> advanced.
     *
     * @param {Object} params
     * @param {string} [params.userId] - UUID del usuario
     * @param {string} [params.email] - Email alternativo si no se provee userId
     * @param {string} [params.planType] - 'basic' | 'advanced'
     * @param {string} [params.planId] - Alias retrocompatible de planType
     * @param {string} [params.paymentId] - ID del pago para trazabilidad en users.payment_id
     * @param {Date|string} [params.expiresAt] - Fecha explícita de expiración opcional
     * @param {number} [params.months] - Duración en meses opcional (default según plan)
     * @param {Object} [params.client] - Cliente transaccional pg opcional
     * @returns {Promise<{id: string}>} Fila actualizada
     */
    async upgradeUserPlanByWebhook({
        userId = null,
        email = null,
        planType,
        planId,
        paymentId = null,
        expiresAt = null,
        months = null,
        client = null
    } = {}) {
        const resolvedPlan = planType || planId;
        if (!resolvedPlan || (!userId && !email)) {
            throw new Error('planType y userId o email son requeridos para actualizar la suscripción.');
        }

        const executor = client || db;
        const todayDate = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Lima' });
        const whereClause = userId ? 'WHERE id = $3' : 'WHERE lower(email) = lower($3)';
        const targetIdentifier = userId || String(email).trim();

        try {
            let updateQuery;
            let params;

            if (expiresAt !== null && expiresAt !== undefined) {
                updateQuery = `
                    UPDATE users SET
                        subscription_status = 'active',
                        subscription_tier = $1,
                        subscription_expires_at = $5,
                        usage_count = 0,
                        daily_ai_usage = 0,
                        monthly_flashcards_usage = 0,
                        daily_simulator_usage = 0,
                        last_usage_reset = $4,
                        payment_id = COALESCE($2, payment_id)
                    ${whereClause}
                    RETURNING id
                `;
                params = [resolvedPlan, paymentId ? String(paymentId) : null, targetIdentifier, todayDate, expiresAt];
            } else {
                const planMonths = Number.isInteger(months) && months > 0
                    ? months
                    : (PLAN_MONTHS[resolvedPlan] || 2);

                updateQuery = `
                    UPDATE users SET
                        subscription_status = 'active',
                        subscription_tier = $1,
                        subscription_expires_at = CASE
                            WHEN subscription_tier = 'basic' AND $1 = 'advanced' THEN GREATEST(subscription_expires_at, NOW()) + ($5 || ' months')::interval
                            ELSE NOW() + ($5 || ' months')::interval
                        END,
                        usage_count = 0,
                        daily_ai_usage = 0,
                        monthly_flashcards_usage = 0,
                        daily_simulator_usage = 0,
                        last_usage_reset = $4,
                        payment_id = COALESCE($2, payment_id)
                    ${whereClause}
                    RETURNING id
                `;
                params = [resolvedPlan, paymentId ? String(paymentId) : null, targetIdentifier, todayDate, planMonths];
            }

            const updated = await executor.query(updateQuery, params);
            if (!updated.rows || updated.rows.length === 0) {
                throw new Error('Usuario asociado al pago no encontrado.');
            }
            return updated.rows[0];
        } catch (error) {
            console.error('❌ [PaymentRepository] Error en upgradeUserPlanByWebhook:', error.message);
            throw error;
        }
    }

    /**
     * Ejecuta el flujo transaccional completo de webhook aprobado:
     * reclamo idempotente -> actualización de plan -> cierre de ledger (o rollback + auditoría failed).
     */
    async processApprovedWebhook({
        eventId,
        paymentId,
        eventType = 'payment',
        email = null,
        userId,
        planType,
        planId,
        amount,
        expiresAt = null,
        months = null,
        rawPayload = null
    } = {}) {
        const resolvedPaymentId = String(eventId || paymentId);
        const resolvedPlan = planType || planId;

        if (typeof db.pool !== 'function') {
            const claimed = await this.recordEventIfNew({
                eventId: resolvedPaymentId,
                eventType,
                email,
                userId,
                planType: resolvedPlan,
                amount,
                status: 'processing',
                rawPayload
            });
            if (!claimed) return { duplicate: true, processed: false };

            try {
                const user = await this.upgradeUserPlanByWebhook({
                    userId,
                    email,
                    planType: resolvedPlan,
                    paymentId: resolvedPaymentId,
                    expiresAt,
                    months
                });
                await this.markEventProcessed(resolvedPaymentId);
                return { duplicate: false, processed: true, user };
            } catch (processingError) {
                await this.markEventFailed({
                    eventId: resolvedPaymentId,
                    userId,
                    planType: resolvedPlan,
                    amount,
                    errorMessage: processingError.message
                });
                throw processingError;
            }
        }

        const client = await db.pool().connect();
        try {
            await client.query('BEGIN');
            const claimed = await this.recordEventIfNew({
                eventId: resolvedPaymentId,
                eventType,
                email,
                userId,
                planType: resolvedPlan,
                amount,
                status: 'processing',
                rawPayload,
                client
            });

            if (!claimed) {
                await client.query('COMMIT');
                return { duplicate: true, processed: false };
            }

            const user = await this.upgradeUserPlanByWebhook({
                userId,
                email,
                planType: resolvedPlan,
                paymentId: resolvedPaymentId,
                expiresAt,
                months,
                client
            });

            await this.markEventProcessed(resolvedPaymentId, client);
            await client.query('COMMIT');
            return { duplicate: false, processed: true, user };
        } catch (processingError) {
            await client.query('ROLLBACK').catch(rollbackError => {
                console.error('⚠️ No se pudo revertir el webhook:', rollbackError.message);
            });
            await this.markEventFailed({
                eventId: resolvedPaymentId,
                userId,
                planType: resolvedPlan,
                amount,
                errorMessage: processingError.message
            });
            throw processingError;
        } finally {
            client.release();
        }
    }
}

module.exports = PaymentRepository;
