const UserRepository = require('../../domain/repositories/userRepository');
const UsageService = require('./usageService');
const UserPreferencesService = require('../../domain/services/userPreferencesService');
const userPreferencesService = new UserPreferencesService();
const supabase = require('../../infrastructure/config/supabaseClient'); // ✅ SUPABASE CLIENT

class AuthService {
    constructor(userRepository = new UserRepository(), usageService = new UsageService(userRepository)) {
        this.userRepository = userRepository;
        this.usageService = usageService;
    }

    /**
     * Obtiene el usuario local enriquecido con su estado de verificación.
     */
    async getUserWithStatus(userId) {
        // ✅ RENOVACIÓN MENSUAL DE VIDAS (30 DÍAS) - Delegada a UsageService (Fuente Única de Verdad)
        if (typeof this.usageService.renewFreeLivesIfNeeded === 'function') {
            await this.usageService.renewFreeLivesIfNeeded(userId);
        } else {
            await this.usageService.renewWeeklyLivesIfNeeded(userId);
        }

        let user = await this.userRepository.findById(userId);
        if (!user) return null;

        // 🛡️ Auto-admin check defensivo en getUserWithStatus (/api/auth/me):
        const adminEmails = ['hubacademia01@gmail.com'];
        if (user.email && adminEmails.includes(user.email.toLowerCase()) && user.role !== 'admin') {
            user = await this.userRepository.update(user.id, { role: 'admin' });
        }

        try {
            const supabaseAdmin = supabase.supabaseAdmin || (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
                ? require('@supabase/supabase-js').createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
                : null);

            if (supabaseAdmin) {
                const { data: { user: sbUser }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
                if (!error && sbUser) {
                    user.emailVerified = !!sbUser.email_confirmed_at;
                    user.avatar_url = user.avatar_url || sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || null;
                    user.avatarUrl = user.avatar_url;
                } else {
                    user.emailVerified = false;
                }
            } else {
                user.emailVerified = false;
            }
        } catch (err) {
            console.warn(`⚠️ Error de sincronización Supabase para ${userId}:`, err.message);
            user.emailVerified = false;
        }

        return user;
    }

    // ✅ MEJORA: Lógica de sincronización atómica para Google OAuth
    async syncGoogleUser({ identity, email, name, id }) {
        try {
            const verifiedIdentity = identity || { id, email };
            if (!verifiedIdentity?.id || !verifiedIdentity?.email) {
                throw new Error('Identidad de proveedor incompleta.');
            }

            const normalizedEmail = String(verifiedIdentity.email).trim().toLowerCase();
            const safeName = (typeof name === 'string' && name.trim())
                ? name.trim().slice(0, 120)
                : (verifiedIdentity.user_metadata?.full_name || verifiedIdentity.user_metadata?.name || normalizedEmail.split('@')[0]);

            const avatarUrl = verifiedIdentity.user_metadata?.avatar_url || verifiedIdentity.user_metadata?.picture || null;

            // 🎯 CONFIGURACIÓN: Lista de correos con privilegios automáticos (Admin)
            const adminEmails = [
                'hubacademia01@gmail.com'
            ];

            const isAutoAdmin = adminEmails.includes(normalizedEmail);

            // 🛡️ PRESERVACIÓN DE IDENTIDAD: Si el usuario ya existe en base de datos y tiene un nombre
            // personalizado (por ejemplo, editado desde su perfil), lo conservamos intacto
            // para evitar que la sincronización con Google OAuth sobrescriba su nombre elegido.
            const existingUser = (typeof this.userRepository?.findByEmail === 'function' ? await this.userRepository.findByEmail(normalizedEmail) : null) || 
                                 (typeof this.userRepository?.findById === 'function' ? await this.userRepository.findById(verifiedIdentity.id) : null);

            const finalName = (existingUser && typeof existingUser.name === 'string' && existingUser.name.trim().length > 0)
                ? existingUser.name.trim()
                : safeName;

            // 1. Delegamos el registro/sincronización al repositorio (vía stored procedure)
            // El repositorio usa sp_register_user que hace un UPSERT atómico.
            const userData = {
                id: verifiedIdentity.id,
                email: normalizedEmail,
                name: finalName,
                role: isAutoAdmin ? 'admin' : 'student',
                avatar_url: avatarUrl
            };

            let user = await this.userRepository.create(userData);

            if (!user) {
                throw new Error('No se pudo crear o recuperar el usuario de la base de datos.');
            }

            // 🛡️ Blindaje para asegurar rol de administrador en DB si es auto-admin
            if (isAutoAdmin && user.role !== 'admin') {
                user = await this.userRepository.update(user.id, { role: 'admin' });
            }

            user.emailVerified = !!(verifiedIdentity.email_confirmed_at || isAutoAdmin);

            return user;
        } catch (error) {
            console.error('❌ Error crítico en syncGoogleUser:', error);
            throw new Error(`Error de sincronización: ${error.message}`);
        }
    }

    // --- Método deleteAccount simplificado para Google OAuth ---

    /**
     * Eliminar cuenta de usuario en cascada completa
     * @param {string} userId
     */
    async deleteAccount(userId) {
        // 1. Eliminar de Base de Datos Local en cascada completa (mazos, respuestas, notas, bibliotecas, usuario)
        await this.userRepository.delete(userId);

        // 2. Eliminar de Supabase (Admin API) si la clave de servicio está configurada
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (serviceRoleKey && process.env.SUPABASE_URL) {
            try {
                const { createClient } = require('@supabase/supabase-js');
                const supabaseAdmin = createClient(process.env.SUPABASE_URL, serviceRoleKey);
                const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

                if (deleteError) {
                    const msg = (deleteError.message || '').toLowerCase();
                    if (!msg.includes('not found') && deleteError.status !== 404) {
                        console.error('Error eliminando usuario de Supabase Auth:', deleteError);
                    }
                }
            } catch (supaErr) {
                console.warn('⚠️ Supabase Admin deleteUser warning:', supaErr.message);
            }
        }

        return { success: true };
    }

    async updateProfile(userId, { name }) {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) throw new Error('Usuario no encontrado');

            // 🛡️ RESTRICCIÓN: Cambio de nombre solo 1 vez por semana
            if (user.lastNameChangeAt) {
                const lastChange = new Date(user.lastNameChangeAt);
                const now = new Date();
                const diffTime = Math.abs(now - lastChange);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays <= 7 && user.role !== 'admin') {
                    const remainingDays = 7 - Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    throw new Error(`Solo puedes cambiar tu nombre una vez por semana. Faltan ${remainingDays} días.`);
                }
            }

            const updatedUser = await this.userRepository.update(userId, {
                name,
                last_name_change_at: new Date()
            });

            // 🔄 Sincronizar metadatos en Supabase Auth si la clave administrativa está disponible
            try {
                const supabaseAdmin = supabase.supabaseAdmin || (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
                    ? require('@supabase/supabase-js').createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
                    : null);
                if (supabaseAdmin) {
                    await supabaseAdmin.auth.admin.updateUserById(userId, {
                        user_metadata: { full_name: name, name: name }
                    });
                }
            } catch (sbErr) {
                console.warn('⚠️ No se pudo sincronizar nombre en Supabase Auth metadata:', sbErr.message);
            }

            return updatedUser;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = AuthService;
