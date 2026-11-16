const PaymentRepository = require('../../src/domain/repositories/paymentRepository');
const db = require('../../src/infrastructure/database/db');

jest.mock('../../src/infrastructure/database/db');

describe('PaymentRepository (Webhook Ledger & Subscription Upgrade)', () => {
    let paymentRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        paymentRepository = new PaymentRepository();
    });

    it('recordEventIfNew claims new or failed payment events and ignores duplicates', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ payment_id: 'pay-001' }] });
        const claimed = await paymentRepository.recordEventIfNew({
            eventId: 'pay-001',
            eventType: 'payment',
            email: 'user@hubacademia.com',
            userId: 'user-123',
            planType: 'advanced',
            amount: 24.90,
            status: 'processing',
            rawPayload: { id: 'pay-001' }
        });

        expect(claimed).toBe(true);
        expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO payment_events'),
            ['pay-001', 'user-123', 'advanced', 24.90, 'processing']
        );

        db.query.mockResolvedValueOnce({ rows: [] });
        const duplicate = await paymentRepository.recordEventIfNew({
            eventId: 'pay-001',
            userId: 'user-123',
            planType: 'advanced',
            amount: 24.90
        });
        expect(duplicate).toBe(false);
    });

    it('upgradeUserPlanByWebhook updates user subscription and resets quotas', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ id: 'user-123' }] });

        const updated = await paymentRepository.upgradeUserPlanByWebhook({
            userId: 'user-123',
            email: 'user@hubacademia.com',
            planType: 'advanced',
            paymentId: 'pay-001'
        });

        expect(updated).toEqual({ id: 'user-123' });
        expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining("subscription_status = 'active'"),
            ['advanced', 'pay-001', 'user-123', expect.any(String), 4]
        );
    });

    it('upgradeUserPlanByWebhook supports explicit expiresAt and throws when user does not exist', async () => {
        const expiresAt = '2027-03-16T00:00:00.000Z';
        db.query.mockResolvedValueOnce({ rows: [{ id: 'user-email' }] });

        await paymentRepository.upgradeUserPlanByWebhook({
            email: 'docente@hubacademia.com',
            planType: 'basic',
            expiresAt
        });

        expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining('WHERE lower(email) = lower($3)'),
            ['basic', null, 'docente@hubacademia.com', expect.any(String), expiresAt]
        );

        db.query.mockResolvedValueOnce({ rows: [] });
        await expect(paymentRepository.upgradeUserPlanByWebhook({
            userId: 'missing-user',
            planType: 'basic'
        })).rejects.toThrow('Usuario asociado al pago no encontrado.');
    });

    it('processApprovedWebhook runs atomic transaction and marks failed on error', async () => {
        const mockClient = {
            query: jest.fn()
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({ rows: [{ payment_id: 'pay-tx-1' }] }) // recordEventIfNew
                .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] }) // upgradeUserPlanByWebhook
                .mockResolvedValueOnce({}) // markEventProcessed
                .mockResolvedValueOnce({}), // COMMIT
            release: jest.fn()
        };
        db.pool = jest.fn().mockReturnValue({ connect: jest.fn().mockResolvedValue(mockClient) });

        const res = await paymentRepository.processApprovedWebhook({
            eventId: 'pay-tx-1',
            userId: 'user-123',
            planType: 'advanced',
            amount: 24.90
        });

        expect(res).toEqual({ duplicate: false, processed: true, user: { id: 'user-123' } });
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        expect(mockClient.release).toHaveBeenCalled();

        // Rollback + failed audit when user update fails
        const failClient = {
            query: jest.fn()
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({ rows: [{ payment_id: 'pay-tx-2' }] }) // recordEventIfNew
                .mockResolvedValueOnce({ rows: [] }) // upgradeUserPlanByWebhook -> user not found
                .mockResolvedValueOnce({}), // ROLLBACK
            release: jest.fn()
        };
        db.pool = jest.fn().mockReturnValue({ connect: jest.fn().mockResolvedValue(failClient) });
        db.query.mockResolvedValueOnce({});

        await expect(paymentRepository.processApprovedWebhook({
            eventId: 'pay-tx-2',
            userId: 'missing',
            planType: 'basic',
            amount: 9.90
        })).rejects.toThrow('Usuario asociado al pago no encontrado.');

        expect(failClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining("'failed'"),
            ['pay-tx-2', 'missing', 'basic', 9.90, 'Usuario asociado al pago no encontrado.']
        );
        expect(failClient.release).toHaveBeenCalled();
    });
});
