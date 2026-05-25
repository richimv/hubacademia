// ✅ COMBINACIÓN DE SERVICIOS: Gestor CRUD original + Funciones de Admin Dashboard
const adminRepository = require('../repositories/adminRepository');
const crypto = require('crypto');

// Importar todos los repositorios necesarios para el CRUD original
const CareerRepository = require('../../domain/repositories/careerRepository');
const CourseRepository = require('../../domain/repositories/courseRepository');
const TopicRepository = require('../../domain/repositories/topicRepository');
const BookRepository = require('../../domain/repositories/bookRepository');
const UserRepository = require('../../domain/repositories/userRepository');

class AdminService {
    constructor() {
        // Instanciar todos los repositorios para la gestión de contenido
        this.repositories = {
            career: new CareerRepository(),
            course: new CourseRepository(),
            topic: new TopicRepository(),
            book: new BookRepository(),
            user: new UserRepository(),
        };
        // Simple in-memory locking mechanism to serialize calls for the same URL
        this.locks = new Map();
    }

    async _acquireLock(key) {
        while (this.locks.has(key)) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        this.locks.set(key, true);
    }

    _releaseLock(key) {
        this.locks.delete(key);
    }

    // ==========================================
    // 1. MÉTODOS CRUD GENÉRICOS (Requeridos por coursesController)
    // ==========================================

    _getRepository(entityType) {
        // ✅ MEJORA: Si es un rol de usuario, retornamos el repositorio de usuarios.
        if (['student', 'admin'].includes(entityType)) {
            return this.repositories.user;
        }

        const repo = this.repositories[entityType];
        if (!repo) {
            throw new Error(`Tipo de entidad desconocido: ${entityType}`);
        }
        return repo;
    }

    async getAll(entityType, options = {}) {
        if (['student', 'admin'].includes(entityType)) {
            return this.repositories.user.findByRole(entityType);
        }
        const repo = this._getRepository(entityType);
        const items = await repo.findAll(options);
        return items;
    }

    async getById(entityType, id) {
        if (['student', 'admin'].includes(entityType)) {
            return this.repositories.user.findById(id);
        }
        const repo = this._getRepository(entityType);
        const item = await repo.findById(id);
        return item;
    }

    async create(entityType, newData) {
        if (['student', 'admin'].includes(entityType)) {
            const { name, email } = newData;
            const tempPassword = Math.random().toString(36).slice(-8);
            console.log(`🔑 Contraseña temporal generada para ${email}: ${tempPassword}`);
            const newUser = await this.repositories.user.create(email, tempPassword, name, entityType);
            return { ...newUser, tempPassword };
        }
        const repo = this._getRepository(entityType);
        const createdItem = await repo.create(newData);
        return createdItem;
    }

    async update(entityType, id, updatedData) {
        if (['student', 'admin'].includes(entityType)) {
            const { name, email } = updatedData;
            return this.repositories.user.update(id, { name, email, role: entityType });
        }
        const repo = this._getRepository(entityType);
        const updatedItem = await repo.update(id, updatedData);
        return updatedItem;
    }

    async delete(entityType, id) {
        if (['student', 'admin'].includes(entityType)) {
            return this.repositories.user.delete(id);
        }
        const repo = this._getRepository(entityType);
        await repo.delete(id);
        return { success: true };
    }

    // ==========================================
    // 2. MÉTODOS DEL PANEL DE ADMINISTRACIÓN (Requeridos por adminController)
    // ==========================================

    async getDashboardStats() {
        return await adminRepository.getOverallStats();
    }

    async generateExportData() {
        const searchHistory = await adminRepository.exportTableToCSVBuffer('search_history', 'query, created_at');
        const courses = await adminRepository.exportTableToCSVBuffer('courses', 'id, name');
        const resources = await adminRepository.exportTableToCSVBuffer('resources', 'id, title');

        return {
            search_history: searchHistory,
            courses: courses,
            resources: resources
        };
    }

    async getAllQuestions(domain, search) {
        return await adminRepository.getAllQuestions(domain, search);
    }

    async addSingleQuestion(data) {
        const expectedOptions = (data.target === 'RESIDENTADO') ? 5 : 4;
        if (!Array.isArray(data.options) || data.options.length !== expectedOptions) {
            throw new Error(`El target ${data.target} requiere exactamente ${expectedOptions} opciones.`);
        }

        const rawString = `${data.topic}-${data.question_text}-${JSON.stringify(data.options)}`;
        const hash = crypto.createHash('md5').update(rawString).digest('hex');
        
        data.hash = hash;
        return await adminRepository.addQuestion(data);
    }

    async getQuestionImages(id) {
        return await adminRepository.getQuestionImages(id);
    }

    async updateSingleQuestion(id, data) {
        const expectedOptions = (data.target === 'RESIDENTADO') ? 5 : 4;
        if (!Array.isArray(data.options) || data.options.length !== expectedOptions) {
            console.warn(`⚠️ Mismatch de opciones en update: Expected ${expectedOptions}, got ${data.options.length}`);
        }

        const rawString = `${data.topic}-${data.question_text}-${JSON.stringify(data.options)}`;
        const hash = crypto.createHash('md5').update(rawString).digest('hex');
        
        data.hash = hash;
        return await adminRepository.updateQuestion(id, data);
    }

    async deleteSingleQuestion(id) {
        return await adminRepository.deleteQuestion(id);
    }

    async syncResource(url, cleanTitle, resourceType, persistentThumbnailUrl, author, domain = 'medicine', isPremium = false, visible = true, openDirectly = false) {
        await this._acquireLock(url);
        try {
            const existing = await adminRepository.getResourceByUrl(url);

            if (existing) {
                const finalThumb = persistentThumbnailUrl || existing.image_url;
                await adminRepository.updateResource(existing.id, cleanTitle, resourceType, finalThumb, domain, isPremium, visible, openDirectly);
                return { action: 'updated' };
            } else {
                const resourceId = `RES_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                const resultAuthor = author || 'Admin Hub';
                try {
                    await adminRepository.addResource(resourceId, cleanTitle, resultAuthor, url, resourceType, persistentThumbnailUrl, domain, isPremium, visible, openDirectly);
                    return { action: 'inserted' };
                } catch (dbError) {
                    // Si ocurre un error de llave duplicada (ej. código 23505 de PostgreSQL para unique_violation)
                    if (dbError.code === '23505') {
                        console.warn(`⚠️ Conflicto de inserción única para la URL: ${url}. Intentando actualizar en su lugar.`);
                        // Volver a consultar el recurso existente para obtener su ID
                        const retryExisting = await adminRepository.getResourceByUrl(url);
                        if (retryExisting) {
                            const finalThumb = persistentThumbnailUrl || retryExisting.image_url;
                            await adminRepository.updateResource(retryExisting.id, cleanTitle, resourceType, finalThumb, domain, isPremium, visible, openDirectly);
                            return { action: 'updated' };
                        }
                    }
                    throw dbError; // Si no es 23505 o no se encuentra el recurso, propagamos el error
                }
            }
        } finally {
            this._releaseLock(url);
        }
    }

    async saveBulkQuestionBankAdmin(questionsArray) {
        return await adminRepository.saveBulkQuestionBankAdmin(questionsArray);
    }
}

// ✅ IMPORTANTE: Se exporta LA INSTANCIA (Singleton) porque adminController e index.js esperan una instancia
module.exports = new AdminService();
