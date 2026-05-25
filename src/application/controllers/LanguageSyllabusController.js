class LanguageSyllabusController {
    constructor(languageService) {
        console.log('🔄 Inicializando LanguageSyllabusController con Service...');
        this.languageService = languageService;

        this.getSyllabus = this.getSyllabus.bind(this);
        this.generateLesson = this.generateLesson.bind(this);
        this.evaluateLesson = this.evaluateLesson.bind(this);
        this.toggleProgress = this.toggleProgress.bind(this);
        console.log('✅ LanguageSyllabusController con Service inicializado');
    }

    /**
     * Obtiene el temario estructurado delegando al servicio.
     */
    async getSyllabus(req, res) {
        try {
            const { languageCode = 'en-US', level = 'A1' } = req.query;
            const userId = req.user ? req.user.id : null;

            const syllabus = await this.languageService.getSyllabus(userId, languageCode, level);
            return res.json({ success: true, syllabus });
        } catch (error) {
            console.error("❌ Error en LanguageSyllabusController.getSyllabus:", error);
            return res.status(500).json({ error: 'Ocurrió un error al cargar el temario.' });
        }
    }

    /**
     * Genera o sirve el contenido de una lección de forma persistente delegando al servicio.
     */
    async generateLesson(req, res) {
        try {
            const { topicId, topicName, languageCode = 'en-US', cefrLevel = 'A1', regenerate = false } = req.body;
            const userRole = req.user ? req.user.role : 'user';

            const result = await this.languageService.generateLesson(topicId, topicName, languageCode, cefrLevel, userRole, regenerate);
            return res.json({ success: true, lesson: result.lesson, isCached: result.isCached });
        } catch (error) {
            console.error("❌ Error en LanguageSyllabusController.generateLesson:", error);
            if (error.message === 'NOT_FOUND') {
                return res.status(404).json({ error: 'No se encontró el tema especificado en el temario.' });
            }
            if (error.message === 'FORBIDDEN') {
                return res.status(403).json({ 
                    error: 'El contenido interactivo de esta lección no ha sido generado por un administrador todavía. Por favor, solicita a un administrador que genere esta lección.' 
                });
            }
            return res.status(500).json({ error: 'Ocurrió un error al procesar la lección.' });
        }
    }

    /**
     * Evalúa las respuestas del alumno delegando al servicio.
     */
    async evaluateLesson(req, res) {
        try {
            const { topicId, answers } = req.body;
            if (!topicId || !Array.isArray(answers)) {
                return res.status(400).json({ error: 'Faltan parámetros requeridos (topicId y answers).' });
            }

            const result = await this.languageService.evaluateLesson(topicId, answers);
            return res.json({ 
                success: true, 
                evaluation: {
                    score: result.score,
                    items: result.items
                }
            });
        } catch (error) {
            console.error("❌ Error en LanguageSyllabusController.evaluateLesson:", error);
            if (error.message === 'NOT_FOUND_OR_NO_CONTENT') {
                return res.status(404).json({ error: 'No se encontró la lección o aún no tiene contenido de ejercicios.' });
            }
            if (error.message === 'INVALID_EXERCISES') {
                return res.status(400).json({ error: 'La lección no contiene bloques de ejercicios válidos.' });
            }
            return res.status(500).json({ error: 'Ocurrió un error al evaluar los ejercicios.' });
        }
    }

    /**
     * Marca o desmarca un tema del temario como completado delegando al servicio.
     */
    async toggleProgress(req, res) {
        try {
            const { syllabusId, completed = true } = req.body;
            const userId = req.user.id;

            if (!syllabusId) {
                return res.status(400).json({ error: 'El ID de temario es requerido' });
            }

            const updatedCompleted = await this.languageService.toggleProgress(userId, syllabusId, completed);
            return res.json({ success: true, completed: updatedCompleted });
        } catch (error) {
            console.error("❌ Error en LanguageSyllabusController.toggleProgress:", error);
            return res.status(500).json({ error: 'Ocurrió un error al actualizar el progreso.' });
        }
    }
}

module.exports = LanguageSyllabusController;
