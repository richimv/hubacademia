class User {
    // Constructor estandarizado
    // ✅ ESCALABILIDAD: Si cambias el límite gratuito global en el futuro, actualiza este default (50).
    constructor(id, email, passwordHash, role, name, subscriptionStatus = 'pending', paymentId = null, usageCount = 0, maxFreeLimit = 10, subscriptionTier = 'free', subscriptionExpiresAt = null, dailySimulatorUsage = 0, dailyAiUsage = 0, dailyArenaUsage = 0, lastUsageReset = null, lastNameChangeAt = null, monthlyFlashcardsUsage = 0, dailyImportUsage = 0, lastFreeRenewal = null, dailyRagUsage = 0, avatarUrl = null) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        this.name = name;
        this.subscriptionStatus = subscriptionStatus;
        this.subscriptionTier = subscriptionTier;
        this.paymentId = paymentId;
        this.subscriptionExpiresAt = subscriptionExpiresAt;

        // ✅ CORRECCIÓN: Usamos camelCase para que coincida con el resto de la App
        this.usageCount = usageCount;
        this.maxFreeLimit = maxFreeLimit;
        this.dailySimulatorUsage = dailySimulatorUsage;
        this.dailyAiUsage = dailyAiUsage;
        this.dailyArenaUsage = dailyArenaUsage;
        this.lastUsageReset = lastUsageReset;
        this.lastNameChangeAt = lastNameChangeAt;
        this.monthlyFlashcardsUsage = monthlyFlashcardsUsage;
        this.dailyImportUsage = dailyImportUsage;
        this.lastFreeRenewal = lastFreeRenewal;
        this.dailyRagUsage = dailyRagUsage;
        this.avatar_url = avatarUrl;
        this.avatarUrl = avatarUrl;
    }
}

module.exports = User;