// infrastructure/controllers/paymentController.js
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const pool = require('../../infrastructure/database/db');
const crypto = require('crypto');

// Configuración del cliente
// IMPORTANTE: Asegúrate de que MP_ACCESS_TOKEN en Render sea el de PRODUCCIÓN (empieza con APP_USR-...)
const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN
});

const PLANS = {
    basic: { price: 9.90, months: 2, title: 'Plan Básico - Entrenamiento Médico' },
    advanced: { price: 24.90, months: 6, title: 'Plan Avanzado - Tutor IA Médica' }
};

exports.createOrder = async (req, res) => {
    try {
        if (!req.user || !req.user.email) {
            console.error('❌ Error: Usuario sin email intentando pagar.');
            return res.status(400).json({ error: 'Usuario no válido. Se requiere email.' });
        }

        const userId = req.user.id;
        const planId = req.body.planId;

        if (!planId || !PLANS[planId]) {
            return res.status(400).json({ error: 'Plan seleccionado inválido.' });
        }

        const plan = PLANS[planId];
        const backendUrl = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL || 'https://tutor-ia-backend.onrender.com';
        const frontendUrl = process.env.FRONTEND_URL || 'https://www.hubacademia.com';

        const preference = new Preference(client);

        const result = await preference.create({
            body: {
                items: [
                    {
                        id: `suscripcion-${planId}`,
                        title: plan.title,
                        description: `Acceso por ${plan.months} meses`,
                        picture_url: 'https://www.hubacademia.com/assets/logo.png',
                        unit_price: plan.price,
                        currency_id: 'PEN',
                        quantity: 1,
                    }
                ],
                payer: {
                    email: req.user.email,
                    name: req.user.name || 'Estudiante',
                },
                external_reference: `${userId}|${planId}`, // Pasamos ID y el Plan elegido
                back_urls: {
                    success: `${frontendUrl}/?payment=success`,
                    failure: `${frontendUrl}/pricing?payment=failure`,
                    pending: `${frontendUrl}/pricing?payment=pending`
                },
                auto_return: 'approved',
                payment_methods: {
                    excluded_payment_types: [{ id: "ticket" }],
                    installments: 1
                },
                notification_url: `${backendUrl}/api/payment/webhook`
            }
        });

        console.log(`✅ Preferencia creada para ${req.user.email} (Plan: ${planId})`);
        res.json({ init_point: result.init_point });

    } catch (error) {
        console.error('❌ Error creando preferencia MP:', error);
        res.status(500).json({ error: 'Error al iniciar el pago' });
    }
};

exports.handleWebhook = async (req, res) => {
    const xSignature = req.headers['x-signature'];
    const xRequestId = req.headers['x-request-id'];
    const dataId = req.query.id || req.query['data.id'];

    // Validar cabeceras obligatorias y parámetro data.id
    if (!xSignature || !xRequestId || !dataId) {
        console.error('❌ Error Webhook: Cabeceras de firma (x-signature, x-request-id) o ID en query params ausentes.');
        return res.status(401).json({ error: 'Unauthorized: Faltan cabeceras o datos de firma.' });
    }

    // Extraer ts y v1 de la cabecera x-signature
    const parts = xSignature.split(',');
    let ts, hash;
    parts.forEach(part => {
        const [key, value] = part.split('=');
        if (key && value) {
            if (key.trim() === 'ts') ts = value.trim();
            if (key.trim() === 'v1') hash = value.trim();
        }
    });

    if (!ts || !hash) {
        console.error('❌ Error Webhook: Formato de x-signature inválido.');
        return res.status(401).json({ error: 'Unauthorized: Formato de firma inválido.' });
    }

    // Validar token secreto
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) {
        console.error('❌ Error Webhook: MP_WEBHOOK_SECRET no está configurado en las variables de entorno.');
        return res.status(500).json({ error: 'Internal Server Error: Configuración de firma incompleta.' });
    }

    // Construir el manifest para validar
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

    // Calcular firma HMAC-SHA256
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(manifest);
    const calculatedHash = hmac.digest('hex');

    // Comparación segura para prevenir ataques de temporización (timing attacks)
    let isSignatureValid = false;
    try {
        isSignatureValid = crypto.timingSafeEqual(
            Buffer.from(calculatedHash, 'hex'),
            Buffer.from(hash, 'hex')
        );
    } catch (e) {
        isSignatureValid = (calculatedHash === hash);
    }

    if (!isSignatureValid) {
        console.error('❌ Error Webhook: La firma del webhook de Mercado Pago no coincide.');
        return res.status(401).json({ error: 'Unauthorized: Firma inválida.' });
    }

    // Firma válida, responder 200 OK inmediatamente
    const paymentId = req.query.id || req.query['data.id'];
    const type = req.query.type || req.query.topic;

    res.sendStatus(200);

    try {
        if (type === 'payment' && paymentId) {
            const payment = new Payment(client);
            const data = await payment.get({ id: paymentId });

            if (data.status === 'approved') {
                const parts = data.external_reference.split('|');
                const userId = parts[0];
                const planId = parts[1] || 'basic'; // Fallback a basic si falta
                const paidAmount = data.transaction_amount;

                const plan = PLANS[planId] || PLANS.basic;

                if (paidAmount >= plan.price - 0.1) { // Tolerancia decimal
                    const todayDate = new Date().toISOString().split('T')[0];
                    
                    // 🔄 LÓGICA DE ACTIVACIÓN / UPGRADE:
                    // 1. Si el usuario ya es Basic y compra Advanced -> SUMAR tiempo (Upgrade con regalo).
                    // 2. Si es una compra inicial o tras expiración -> NOW() + Intervalo.
                    // Nota: La UI ya bloquea comprar el mismo tier o uno inferior.
                    const updateQuery = `
                        UPDATE users SET 
                            subscription_status = 'active',
                            subscription_tier = $1,
                            subscription_expires_at = CASE 
                                WHEN subscription_tier = 'basic' AND $1 = 'advanced' THEN GREATEST(subscription_expires_at, NOW()) + INTERVAL '${plan.months} months'
                                ELSE NOW() + INTERVAL '${plan.months} months'
                            END,
                            usage_count = 0, -- Resetear vidas globales al pagar (Fidelización)
                            daily_ai_usage = 0,
                            monthly_flashcards_usage = 0,
                            daily_arena_usage = 0,
                            daily_simulator_usage = 0,
                            last_usage_reset = $4,
                            payment_id = $2,
                            last_free_renewal = CURRENT_TIMESTAMP
                        WHERE id = $3
                    `;

                    await pool.query(updateQuery, [planId, paymentId, userId, todayDate]);
                    console.log(`🎉 PAGO EXITOSO: Usuario ${userId} activado en Plan ${planId.toUpperCase()}`);
                }
 else {
                    console.warn(`⚠️ Alerta: Pago aprobado pero monto sospechoso (${paidAmount}) para usuario ${userId}, Plan esperado: ${plan.price}`);
                }
            }
        }
    } catch (error) {
        console.error('⚠️ Error procesando Webhook:', error.message);
    }
};