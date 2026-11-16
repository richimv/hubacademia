const UserRepository = require('../repositories/userRepository');

class UsageService {
    constructor(userRepository = new UserRepository()) {
        this.userRepository = userRepository;
    }

    /**
     * 🔄 FUENTE ÚNICA DE VERDAD: Renovación mensual de vidas para usuarios Free/Pending.
     * Resetea usage_count a 0, estandariza max_free_limit a 10 y actualiza last_free_renewal
     * si han pasado 30 o más días desde la última renovación (zona horaria America/Lima).
     *
     * @param {string} userId - UUID del usuario
     * @returns {Promise<boolean>} true si se renovó, false si no era necesario
     */
    async renewFreeLivesIfNeeded(userId) {
        try {
            if (typeof this.userRepository.renewFreeLivesIfNeeded === 'function') {
                return await this.userRepository.renewFreeLivesIfNeeded(userId);
            }
            return await this.userRepository.renewWeeklyLivesIfNeeded(userId);
        } catch (error) {
            console.error('⚠️ [UsageService] Error al renovar vidas gratuitas:', error.message);
            return false;
        }
    }

    /**
     * Alias de retrocompatibilidad para renewFreeLivesIfNeeded
     */
    async renewWeeklyLivesIfNeeded(userId) {
        return this.renewFreeLivesIfNeeded(userId);
    }

    /**
     * Verifica si el usuario tiene vidas disponibles e incrementa el consumo.
     * @param {string} userId - UUID del usuario
     * @param {number} amount - Cantidad a incrementar (default: 1)
     * @returns {Promise<{allowed: boolean, plan: string, usage?: number, limit?: number, reason?: string}>}
     */
    async checkAndIncrementUsage(userId, amount = 1) {
        if (!Number.isInteger(amount) || amount <= 0) {
            throw new Error('La cantidad de uso debe ser un entero positivo');
        }

        const user = await this.userRepository.findById(userId);

        if (!user) throw new Error('Usuario no encontrado');

        // 1. Roles privilegiados
        if (['admin', 'teacher'].includes(user.role)) return { allowed: true, plan: 'unlimited' };

        // 2. Premium Tiers (basic, advanced) - Validar Status Activo
        const tier = String(user.subscriptionTier || 'free').toLowerCase();
        const status = (user.subscriptionStatus || 'pending').toLowerCase();
        if (['basic', 'advanced'].includes(tier) && status === 'active') return { allowed: true, plan: 'premium' };

        // 3. Freemium - Lógica estandarizada (Vidas/Créditos)
        const result = await this.userRepository.consumeFreeUsage(userId, amount);
        return result.allowed
            ? { allowed: true, plan: 'free', usage: result.usage, limit: result.limit }
            : { allowed: false, plan: 'free', usage: result.usage, limit: result.limit, reason: 'LIMIT_REACHED' };
    }

    /**
     * Incrementa una columna de uso validada contra la lista blanca en el repositorio de usuarios.
     */
    async incrementUsageColumn(userId, columnName, amount = 1) {
        try {
            if (typeof this.userRepository.incrementUsageColumn === 'function') {
                return await this.userRepository.incrementUsageColumn(userId, columnName, amount);
            }
        } catch (error) {
            console.error('❌ [UsageService] Error en incrementUsageColumn:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene el perfil de límites y cuotas del usuario para el middleware de control.
     */
    async findLimitsProfileById(userId) {
        if (!userId) return null;
        try {
            return await this.userRepository.findLimitsProfileById(userId);
        } catch (error) {
            console.error('❌ [UsageService] Error en findLimitsProfileById:', error.message);
            throw error;
        }
    }

    /**
     * Rebaja una suscripción expirada a plan gratuito con 10 vidas de fidelización.
     */
    async expireSubscription(userId) {
        try {
            return await this.userRepository.expireSubscription(userId);
        } catch (error) {
            console.error('❌ [UsageService] Error en expireSubscription:', error.message);
            throw error;
        }
    }

    /**
     * Reinicia contadores diarios de uso en el repositorio de usuarios.
     */
    async resetDailyUsage(userId, fields = {}) {
        try {
            return await this.userRepository.resetDailyUsage(userId, fields);
        } catch (error) {
            console.error('❌ [UsageService] Error en resetDailyUsage:', error.message);
            throw error;
        }
    }

    /**
     * Reinicia el contador mensual de flashcards en el repositorio de usuarios.
     */
    async resetMonthlyFlashcards(userId, currentMonth = null) {
        try {
            return await this.userRepository.resetMonthlyFlashcards(userId, currentMonth);
        } catch (error) {
            console.error('❌ [UsageService] Error en resetMonthlyFlashcards:', error.message);
            throw error;
        }
    }
}

module.exports = UsageService;
