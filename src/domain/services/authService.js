const UserRepository = require('../../domain/repositories/userRepository');
const UserPreferencesService = require('../../domain/services/userPreferencesService');
const userPreferencesService = new UserPreferencesService();
const supabase = require('../../infrastructure/config/supabaseClient'); // ✅ SUPABASE CLIENT

const JWT_SECRET = process.env.JWT_SECRET || 'este-es-un-secreto-muy-largo-y-seguro-para-desarrollo';

class AuthService {
    constructor() {
        this.userRepository = new UserRepository();
    }

    /**
     * Obtiene el usuario local enriquecido con su estado de verificación.
     */
    async getUserWithStatus(userId) {
        // ✅ RENOVACIÓN SEMANAL DE VIDAS (USUARIOS FREE)
        try {
            const db = require('../../infrastructure/database/db');
            await db.query(`
                UPDATE public.users 
                SET usage_count = 0, last_free_renewal = CURRENT_TIMESTAMP 
                WHERE id = $1 
                  AND (subscription_tier = 'free' OR subscription_status IN ('pending', 'expired'))
                  AND (last_free_renewal IS NULL OR last_free_renewal < NOW() - INTERVAL '7 days')
            `, [userId]);
        } catch (e) {
            console.error('⚠️ Error al renovar vidas semanales en getUserWithStatus:', e.message);
        }

        const user = await this.userRepository.findById(userId);
        if (!user) return null;

        try {
            const { createClient } = require('@supabase/supabase-js');
            const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
            const { data: { user: sbUser }, error } = await supabaseAdmin.auth.admin.getUserById(userId);

            if (!error && sbUser) {
                user.emailVerified = !!sbUser.email_confirmed_at;
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
    async syncGoogleUser({ email, name, id }) {
        try {
            // Log nivel INFO - No es error, es éxito de vinculación si ya existe
            // console.log(`📡 [AuthSync] Procesando sesión Google para: ${email.toLowerCase()}`);

            // 🎯 CONFIGURACIÓN: Lista de correos con privilegios automáticos (Admin)
            const adminEmails = [
                'hubacademia01@gmail.com'
            ];

            const isAutoAdmin = adminEmails.includes(email.toLowerCase());

            // 1. Delegamos el registro/sincronización al repositorio (vía stored procedure)
            // El repositorio usa sp_register_user que hace un UPSERT atómico.
            const userData = {
                id: id,
                email: email.toLowerCase(),
                name: name || email.split('@')[0],
                role: isAutoAdmin ? 'admin' : 'student'
            };

            let user = await this.userRepository.create(userData);

            if (!user) {
                throw new Error('No se pudo crear o recuperar el usuario de la base de datos.');
            }

            // 2. Eliminada la provisión automática de preferencias.
            // Ahora el frontend obligará al usuario a configurar el simulador manualmente
            // para evitar mezclar dominios (Medicina vs Educación) y evitar exámenes por defecto erróneos.

            return user;
        } catch (error) {
            console.error('❌ Error crítico en syncGoogleUser:', error);
            throw new Error(`Error de sincronización: ${error.message}`);
        }
    }

    // --- Método deleteAccount simplificado para Google OAuth ---

    /**
     * Eliminar cuenta de usuario
     * @param {string} userId
     */
    async deleteAccount(userId) {
        // En un flujo Google-Only, no pedimos password para borrar.
        // El usuario ya está autenticado por OAuth.

        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            throw new Error('Error de configuración del servidor.');
        }
        const { createClient } = require('@supabase/supabase-js');
        const supabaseAdmin = createClient(process.env.SUPABASE_URL, serviceRoleKey);

        // 1. Eliminar de Supabase (Admin API)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
            console.error('Error eliminando usuario de Supabase:', deleteError);
            throw new Error('Error al eliminar la cuenta en el proveedor.');
        }

        // 2. Eliminar de Base de Datos Local
        await this.userRepository.delete(userId);

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
            return updatedUser;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = AuthService;