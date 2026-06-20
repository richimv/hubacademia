const pool = require('../../infrastructure/database/db');
const { LIMITS } = require('../../infrastructure/config/limits');

/**
 * Middleware para controlar los límites de uso de IA (Diarios normales vs Mensuales complejos)
 * 
 * @param {string} type - Tipo de operación ('chat_standard', 'chat_thinking', 'quiz_arena', 'simulator')
 */
const checkAILimits = (type) => {
    return async (req, res, next) => {
        try {
            const userId = req.user.id;

            // Obtener estado completo del usuario actual
            const result = await pool.query(`
                SELECT 
                    subscription_tier, 
                    subscription_status,
                    usage_count,
                    max_free_limit,
                    subscription_expires_at, 
                    daily_ai_usage, 
                    monthly_flashcards_usage,
                    daily_arena_usage, 
                    daily_simulator_usage,
                    daily_import_usage,
                    last_usage_reset,
                    last_free_renewal
                FROM users 
                WHERE id = $1
            `, [userId]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            let user = result.rows[0];
            let tier = user.subscription_tier || 'free';

            // 0. RENOVACIÓN SEMANAL DE VIDAS (USUARIOS FREE)
            if (tier === 'free') {
                try {
                    await pool.query(`
                        UPDATE users 
                        SET usage_count = 0, last_free_renewal = CURRENT_TIMESTAMP 
                        WHERE id = $1 
                          AND (last_free_renewal IS NULL OR (last_free_renewal AT TIME ZONE 'America/Lima')::date <= ((NOW() AT TIME ZONE 'America/Lima') - INTERVAL '7 days')::date)
                    `, [userId]);
                    
                    // Recargar los valores actualizados de user
                    const reloadRes = await pool.query("SELECT usage_count, last_free_renewal FROM users WHERE id = $1", [userId]);
                    if (reloadRes.rows.length > 0) {
                        user.usage_count = reloadRes.rows[0].usage_count;
                        user.last_free_renewal = reloadRes.rows[0].last_free_renewal;
                    }
                } catch (e) {
                    console.error('⚠️ Error al renovar vidas semanales en middleware:', e.message);
                }
            }

            // --- LOGICA DE RESETEO ROBUSTA ---
            const now = new Date();
            const todayDate = now.toLocaleDateString('sv-SE', { timeZone: 'America/Lima' }); // Hoy en Perú: "YYYY-MM-DD"

            let lastResetDateStr = "";
            if (user.last_usage_reset) {
                // Si pg devuelve objeto Date, toISOString() es seguro. 
                // Si devuelve string (depende de config), tomamos solo la parte de la fecha.
                lastResetDateStr = (user.last_usage_reset instanceof Date)
                    ? user.last_usage_reset.toISOString().split('T')[0]
                    : String(user.last_usage_reset).split('T')[0];
            }

            // 1. REVISIÓN DE EXPIRACIÓN DE PLAN
            if (tier !== 'free') {
                if (user.subscription_expires_at) {
                    const expiresAt = new Date(user.subscription_expires_at);
                    if (Date.now() > expiresAt.getTime()) {
                        // ✅ CORRECCIÓN CRÍTICA: Rebajar Tier Y Status, y resetear vidas como beneficio de fidelización
                        await pool.query("UPDATE users SET subscription_tier = 'free', subscription_status = 'expired', usage_count = 0, last_free_renewal = CURRENT_TIMESTAMP WHERE id = $1", [userId]);
                        user.subscription_tier = 'free';
                        user.subscription_status = 'expired';
                        user.usage_count = 0;
                        user.last_free_renewal = new Date();
                    }
                }
            }

            req.userTier = user.subscription_tier;

            // 🛡️ OMITIR VERIFICACIONES DE LÍMITES PARA CONSULTAS EFÍMERAS / TUTOR DE FLASHCARDS
            const isEphemeral = req.body && (req.body.ephemeral === true || (req.body.context && req.body.context.type === 'flashcard_tutor'));
            if (isEphemeral) {
                req.usageType = null;
                return next();
            }

            // 2. REINICIO DE CONTADORES (DIARIOS Y MENSUALES)
            if (!user.last_usage_reset || lastResetDateStr !== todayDate) {
                console.log(`♻️ [Quota Reset] Iniciando reset para ${user.subscription_tier} (${userId}). De ${lastResetDateStr} a ${todayDate}`);

                const lastResetDateObj = user.last_usage_reset ? new Date(user.last_usage_reset) : new Date(0);
                const currentMonth = now.getUTCMonth();
                const lastResetMonth = lastResetDateObj.getUTCMonth();

                let resetMonthlyFlashcards = false;
                if (!user.last_usage_reset || lastResetMonth !== currentMonth) {
                    resetMonthlyFlashcards = true;
                }

                if (resetMonthlyFlashcards) {
                    await pool.query(`
                        UPDATE users SET 
                            daily_ai_usage = 0, 
                            daily_arena_usage = 0, 
                            daily_simulator_usage = 0,
                            daily_import_usage = 0,
                            monthly_flashcards_usage = 0,
                            last_usage_reset = $1 
                        WHERE id = $2
                    `, [todayDate, userId]);
                    user.monthly_flashcards_usage = 0;
                    user.daily_import_usage = 0;
                } else {
                    await pool.query(`
                        UPDATE users SET 
                            daily_ai_usage = 0, 
                            daily_arena_usage = 0, 
                            daily_simulator_usage = 0,
                            daily_import_usage = 0,
                            last_usage_reset = $1 
                        WHERE id = $2
                    `, [todayDate, userId]);
                    user.daily_import_usage = 0;
                }

                user.daily_ai_usage = 0;
                user.daily_arena_usage = 0;
                user.daily_simulator_usage = 0;
                user.last_usage_reset = todayDate;
            }

            // 3. MATRIZ DE LÍMITES POR TIER (Calculado en base a matemática del doc MD)
            // 🧠 FLASHCARDS (Mensual): Se mide por INTENTOS de generación (Adaptativos 1-15 tjs/int).
            // - Básico: 10 intentos/mes.
            // - Avanzado: 30 intentos/mes.

            const userLimits = LIMITS[user.subscription_tier] || LIMITS.free;

            // 4. BIFURCACIÓN MAESTRA DE SUBSCRIPCIÓN
            // ✅ MEJORA: Un usuario solo es "Active" si tiene plan premium y status activo.
            const isActiveAccount = user.subscription_status === 'active' && user.subscription_tier !== 'free';
            const hasGlobalLives = (user.usage_count || 0) < (user.max_free_limit || 50);

            // 5. CHEQUEO DE LA OPERACIÓN SOLICITADA
            // ✅ DETECCIÓN DINÁMICA: Si el chat viene con flag de audio, cambiar el tipo internamente
            let effectiveType = type;
            if (type === 'chat_standard' && req.body && req.body.isAudio) {
                effectiveType = 'audio_assistant';
            }

            if (effectiveType === 'chat_standard') {
                const isDiagnostic = req.path.includes('/diagnostic') || req.originalUrl.includes('/diagnostic');
                if (isDiagnostic) {
                    if (!isActiveAccount) {
                        req.usageType = null;
                        req.fallbackToStatic = true;
                    } else {
                        if ((user.daily_ai_usage || 0) >= userLimits.chat_standard) {
                            req.usageType = null;
                            req.fallbackToStatic = true;
                        } else {
                            req.usageType = 'daily_ai_usage';
                        }
                    }
                } else {
                    if (!isActiveAccount) {
                        if (hasGlobalLives) {
                            req.usageType = 'usage_count'; // Gasta la vida dorada
                        } else {
                            return res.status(403).json({ error: 'Límite de consultas de Prueba agotado. Mejora tu plan para continuar aprendiendo con IA.', reason: 'FREE_LIVES_EXHAUSTED' });
                        }
                    } else {
                        if (user.daily_ai_usage >= userLimits.chat_standard) {
                            return res.status(403).json({ error: 'Límite de mensajes diarios estándar alcanzado. Vuelve mañana o mejora tu plan.', reason: 'DAILY_LIMIT_EXHAUSTED' });
                        }
                        req.usageType = 'daily_ai_usage';
                    }
                }
            }
            else if (effectiveType === 'monthly_flashcards') {
                if (!isActiveAccount) {
                    // 🛡️ REGLA DE BLOQUEO: Carga masiva es SOLO para Premium
                    const isBatchImport = req.path.includes('/batch');
                    if (isBatchImport) {
                        return res.status(403).json({ error: 'La Carga Masiva (Excel) es una función exclusiva para usuarios Premium. ¡Mejora tu plan para ahorrar tiempo!', reason: 'PREMIUM_ONLY_FEATURE' });
                    }

                    // 🛡️ REGLA DE BLOQUEO: Generación con IA (Gemini) es SOLO para Premium
                    const isAiGeneration = req.path.includes('/generate') || req.path.includes('check-ai-limits');
                    if (isAiGeneration) {
                        return res.status(403).json({
                            error: 'La Generación de Flashcards con IA es una función exclusiva para usuarios Premium. ¡Mejora tu plan para crear cientos de tarjetas al instante!',
                            reason: 'PREMIUM_ONLY_FEATURE',
                            paywall: true
                        });
                    }

                    // 🛡️ REGLA DE JUSTICIA: Edición (PUT) y Eliminación (DELETE) son GRATUITOS
                    // Nota: El controlador decidirá si el PUT es una "Guía" (Paga) o un "Renombrar" (Gratis)
                    const isMaintenance = req.method === 'DELETE' || (req.method === 'PUT' && !req.path.includes('/study')) || req.path.includes('/reorder');

                    if (isMaintenance) {
                        req.usageType = null;
                    } else if (hasGlobalLives) {
                        req.usageType = 'usage_count';
                    } else {
                        return res.status(403).json({ error: 'Se han agotado tus vidas de Prueba. Mejora tu plan para continuar creando y estudiando.', reason: 'FREE_LIVES_EXHAUSTED' });
                    }
                } else {
                    // ✅ LÓGICA REFINADA PARA PREMIUM: 
                    // El CRUD manual (crear, editar, subir imagen) es ILIMITADO.
                    const isAiGeneration = req.path.includes('/generate') || req.path.includes('check-ai-limits');
                    const isBatchImport = req.path.includes('/batch');

                    if (isAiGeneration) {
                        if ((user.monthly_flashcards_usage || 0) >= userLimits.monthly_flashcards) {
                            return res.status(403).json({ error: `Límite mensual de generación de flashcards alcanzado (${userLimits.monthly_flashcards} intentos). Mejora tu plan.`, reason: 'MONTHLY_LIMIT_EXHAUSTED' });
                        }
                        req.usageType = 'monthly_flashcards_usage';
                    } else if (isBatchImport) {
                        if ((user.daily_import_usage || 0) >= userLimits.batch_import) {
                            return res.status(403).json({ error: `Límite diario de importación masiva alcanzado (${userLimits.batch_import}). Vuelve mañana o mejora tu plan.`, reason: 'DAILY_LIMIT_EXHAUSTED' });
                        }
                        req.usageType = 'daily_import_usage';
                    } else {
                        req.usageType = null;
                    }
                }
            }
            else if (effectiveType === 'simulator') {
                if (!isActiveAccount) {
                    if (hasGlobalLives) {
                        req.usageType = 'usage_count';
                    } else {
                        return res.status(403).json({ error: 'Límite de simulacros de Prueba agotado. Mejora tu plan para continuar.', reason: 'FREE_LIVES_EXHAUSTED' });
                    }
                } else {
                    if ((user.daily_simulator_usage || 0) >= userLimits.simulator) {
                        return res.status(403).json({ error: 'Límite diario de simulacros alcanzado. Vuelve mañana.', reason: 'DAILY_LIMIT_EXHAUSTED' });
                    }
                    req.usageType = 'daily_simulator_usage';
                }
            }
            else if (effectiveType === 'self_evaluation') {
                const limit = userLimits.self_evaluation || 15;
                if ((user.daily_arena_usage || 0) >= limit) {
                    return res.status(403).json({
                        error: `Límite diario de autoevaluaciones alcanzado (${limit}/día). Vuelve mañana.`,
                        reason: 'DAILY_LIMIT_EXHAUSTED'
                    });
                }

                if (!isActiveAccount) {
                    if (hasGlobalLives) {
                        req.usageType = 'usage_count';
                    } else {
                        return res.status(403).json({
                            error: 'Has agotado tus vidas de hoy (créditos). Activa tu cuenta Premium para obtener autoevaluaciones ilimitadas.',
                            reason: 'FREE_LIVES_EXHAUSTED'
                        });
                    }
                } else {
                    req.usageType = 'daily_arena_usage';
                }
            }
            // ✅ AUDIO ASSISTANT: Acceso para todos, pero Free consume vidas globales
            else if (effectiveType === 'audio_assistant') {
                if (!isActiveAccount) {
                    if (hasGlobalLives) {
                        req.usageType = 'usage_count';
                    } else {
                        return res.status(403).json({
                            error: 'Límite de mensajes de voz agotado. Mejora tu plan para continuar.',
                            reason: 'FREE_LIVES_EXHAUSTED',
                            paywall: true
                        });
                    }
                } else {
                    // Validar límite diario para usuarios premium (Basic/Advanced) usando el contador daily_ai_usage
                    const limit = userLimits.audio_assistant || 50;
                    if ((user.daily_ai_usage || 0) >= limit) {
                        return res.status(403).json({
                            error: 'Límite de mensajes de voz diarios alcanzado. Regresa mañana o mejora tu plan para continuar conversando con la IA.',
                            reason: 'DAILY_LIMIT_EXHAUSTED',
                            paywall: true
                        });
                    }
                    req.usageType = 'daily_ai_usage';
                }
            }
            // Todo Ok. Se le pasa el control a la ruta. Luego el controlador DEBE sumar +1 al req.usageType
            next();

        } catch (error) {
            console.error("Middleware Limits Error:", error);
            res.status(500).json({ error: 'Error del servidor al validar suscripción.' });
        }
    };
};

module.exports = checkAILimits;
