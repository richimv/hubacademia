const UserRepository = require('../repositories/userRepository');

class UsageService {
    constructor(userRepository = new UserRepository()) {
        this.userRepository = userRepository;
    }

    /**
     * 🔄 FUENTE ÚNICA DE VERDAD: Renovación semanal de vidas para usuarios Free/Pending.
     * Resetea usage_count a 0, estandariza max_free_limit a 10 y actualiza last_free_renewal
     * si han pasado 7 o más días desde la última renovación (zona horaria America/Lima).
     *
     * @param {string} userId - UUID del usuario
     * @returns {Promise<boolean>} true si se renovó, false si no era necesario
     */
    async renewWeeklyLivesIfNeeded(userId) {
        try {
            return await this.userRepository.renewWeeklyLivesIfNeeded(userId);
        } catch (error) {
            console.error('⚠️ [UsageService] Error al renovar vidas semanales:', error.message);
            return false;
        }
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
}

module.exports = UsageService;
