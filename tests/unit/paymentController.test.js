const paymentController = require('../../src/application/controllers/paymentController');
const pool = require('../../src/infrastructure/database/db');
const { Payment } = require('mercadopago');
const crypto = require('crypto');

// Mock dependencies
jest.mock('../../src/infrastructure/database/db');
jest.mock('mercadopago');

describe('PaymentController - handleWebhook', () => {
    let mockReq;
    let mockRes;
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        process.env.MP_WEBHOOK_SECRET = 'test_webhook_secret_key';

        mockReq = {
            headers: {},
            query: {},
            body: {}
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            sendStatus: jest.fn().mockReturnThis()
        };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should return 401 Unauthorized if x-signature is missing', async () => {
        mockReq.headers['x-request-id'] = '12345';
        mockReq.query['data.id'] = '987654321';

        await paymentController.handleWebhook(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized: Faltan cabeceras o datos de firma.' });
    });

    it('should return 401 Unauthorized if x-request-id is missing', async () => {
        mockReq.headers['x-signature'] = 'ts=1700000000,v1=abc';
        mockReq.query['data.id'] = '987654321';

        await paymentController.handleWebhook(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized: Faltan cabeceras o datos de firma.' });
    });

    it('should return 401 Unauthorized if data.id/id is missing in query params', async () => {
        mockReq.headers['x-signature'] = 'ts=1700000000,v1=abc';
        mockReq.headers['x-request-id'] = '12345';

        await paymentController.handleWebhook(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized: Faltan cabeceras o datos de firma.' });
    });

    it('should return 401 Unauthorized if signature format is invalid', async () => {
        mockReq.headers['x-signature'] = 'invalid_format';
        mockReq.headers['x-request-id'] = '12345';
        mockReq.query['data.id'] = '987654321';

        await paymentController.handleWebhook(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized: Formato de firma inválido.' });
    });

    it('should return 500 if MP_WEBHOOK_SECRET is not configured', async () => {
        delete process.env.MP_WEBHOOK_SECRET;
        mockReq.headers['x-signature'] = 'ts=1700000000,v1=abc';
        mockReq.headers['x-request-id'] = '12345';
        mockReq.query['data.id'] = '987654321';

        await paymentController.handleWebhook(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Internal Server Error: Configuración de firma incompleta.' });
    });

    it('should return 401 if computed HMAC signature does not match v1', async () => {
        mockReq.headers['x-signature'] = 'ts=1700000000,v1=wrong_hash';
        mockReq.headers['x-request-id'] = '12345';
        mockReq.query['data.id'] = '987654321';

        await paymentController.handleWebhook(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized: Firma inválida.' });
    });

    it('should return 200 and process payment if signature is valid', async () => {
        const ts = '1700000000';
        const requestId = '12345';
        const dataId = '987654321';
        const secret = 'test_webhook_secret_key';

        const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
        const calculatedHash = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

        mockReq.headers['x-signature'] = `ts=${ts},v1=${calculatedHash}`;
        mockReq.headers['x-request-id'] = requestId;
        mockReq.query['data.id'] = dataId;
        mockReq.query.type = 'payment';

        // Mock Payment.get behavior
        const mockGet = jest.fn().mockResolvedValue({
            status: 'approved',
            external_reference: 'user_123|advanced',
            transaction_amount: 25.0
        });
        Payment.mockImplementation(() => {
            return { get: mockGet };
        });

        // Mock database query behavior
        pool.query.mockResolvedValue({ rows: [] });

        await paymentController.handleWebhook(mockReq, mockRes);

        expect(mockRes.sendStatus).toHaveBeenCalledWith(200);

        // Allow microtasks to run (since Payment.get is called asynchronously in a try block)
        await new Promise(resolve => setImmediate(resolve));

        expect(mockGet).toHaveBeenCalledWith({ id: dataId });
        expect(pool.query).toHaveBeenCalled();
    });
});
