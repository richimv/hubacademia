const mockGetUser = jest.fn();

jest.mock('../../src/infrastructure/config/supabaseClient', () => ({
    auth: {
        getUser: (...args) => mockGetUser(...args)
    }
}));

jest.mock('../../src/domain/repositories/userRepository', () => jest.fn().mockImplementation(() => ({
    findById: jest.fn()
})));

const { authIdentity } = require('../../src/infrastructure/middleware/authMiddleware');

function createToken(subject) {
    return [
        Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
        Buffer.from(JSON.stringify({ sub: subject, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'),
        'signature'
    ].join('.');
}

function createHttpMocks(token) {
    const req = {
        header: jest.fn(name => name === 'Authorization' ? `Bearer ${token}` : null)
    };
    const res = {
        status: jest.fn(),
        json: jest.fn()
    };
    res.status.mockReturnValue(res);
    return { req, res, next: jest.fn() };
}

describe('authIdentity middleware', () => {
    beforeEach(() => {
        mockGetUser.mockReset();
    });

    test('reintenta AuthRetryableFetchError y continúa cuando Supabase se recupera', async () => {
        const transientError = Object.assign(new Error('fetch failed'), {
            name: 'AuthRetryableFetchError',
            status: 0
        });
        const verifiedUser = { id: 'supabase-user', email: 'persona@example.com' };
        mockGetUser
            .mockResolvedValueOnce({ data: { user: null }, error: transientError })
            .mockResolvedValueOnce({ data: { user: verifiedUser }, error: null });
        const { req, res, next } = createHttpMocks(createToken('retry-success'));

        await authIdentity(req, res, next);

        expect(mockGetUser).toHaveBeenCalledTimes(2);
        expect(req.authIdentity).toEqual(verifiedUser);
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    test('clasifica un JWT rechazado por Supabase como 401 y no lo reintenta', async () => {
        const invalidJwt = Object.assign(new Error('invalid JWT'), {
            name: 'AuthApiError',
            status: 403,
            code: 'bad_jwt'
        });
        mockGetUser.mockResolvedValue({ data: { user: null }, error: invalidJwt });
        const { req, res, next } = createHttpMocks(createToken('invalid-token'));

        await authIdentity(req, res, next);

        expect(mockGetUser).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('devuelve 503 solo después de agotar los reintentos temporales', async () => {
        const transientError = Object.assign(new Error('fetch failed'), {
            name: 'AuthRetryableFetchError',
            status: 0
        });
        mockGetUser.mockResolvedValue({ data: { user: null }, error: transientError });
        const { req, res, next } = createHttpMocks(createToken('retry-exhausted'));

        await authIdentity(req, res, next);

        expect(mockGetUser).toHaveBeenCalledTimes(3);
        expect(res.status).toHaveBeenCalledWith(503);
        expect(next).not.toHaveBeenCalled();
    });
});
