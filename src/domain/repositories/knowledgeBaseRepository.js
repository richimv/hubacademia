const { normalizeText } = require('../utils/textUtils');
const CourseRepository = require('./courseRepository');
const TopicRepository = require('./topicRepository');
const CareerRepository = require('./careerRepository');
const BookRepository = require('./bookRepository');
const UserRepository = require('./userRepository');

const KB_TTL_MS = 10 * 60 * 1000; // 10 minutos

/**
 * Repositorio para cargar y acceder a una base de conocimiento local
 * con todas las entidades nombradas del sistema.
 */
class KnowledgeBaseRepository {
    constructor() {
        this.knowledgeBase = null;
        this.loadedAt = 0;
        this._loadingPromise = null;
        this.courseNames = new Set();
        this.topicNames = new Set();
        this.careerNames = new Set();
        this.instructorNames = new Set();

        this.courseRepo = new CourseRepository();
        this.topicRepo = new TopicRepository();
        this.careerRepo = new CareerRepository();
        this.bookRepo = new BookRepository();
        this.userRepo = new UserRepository();
    }

    async load() {
        if (this.knowledgeBase && (Date.now() - this.loadedAt < KB_TTL_MS)) {
            return this.knowledgeBase;
        }

        if (this._loadingPromise) {
            return this._loadingPromise;
        }

        this._loadingPromise = (async () => {
            try {
                const [instructors, courses, topics, careers, books] = await Promise.all([
                    this.userRepo.findByRole('instructor').catch(err => {
                        console.warn('⚠️ No se pudieron cargar instructores (posiblemente roles cambiados):', err.message);
                        return [];
                    }),
                    this.courseRepo.findAll(),
                    this.topicRepo.findAll(),
                    this.careerRepo.findAll(),
                    this.bookRepo.findAll()
                ]);

                this.courseNames.clear();
                this.topicNames.clear();
                this.careerNames.clear();
                this.instructorNames.clear();

                (courses || []).forEach(c => this.courseNames.add(normalizeText(c.name)));
                (topics || []).forEach(t => this.topicNames.add(normalizeText(t.name)));
                (careers || []).forEach(c => this.careerNames.add(normalizeText(c.name)));

                if (instructors && Array.isArray(instructors)) {
                    instructors.forEach(i => this.instructorNames.add(normalizeText(i.name)));
                }

                const bookTitles = (books || []).map(b => normalizeText(b.title));

                this.knowledgeBase = new Set([
                    ...this.courseNames,
                    ...this.topicNames,
                    ...this.careerNames,
                    ...this.instructorNames,
                    ...bookTitles
                ].filter(Boolean));
                this.loadedAt = Date.now();

                console.log(`✅ Base de conocimiento local cargada con ${this.knowledgeBase.size} entidades.`);
                return this.knowledgeBase;
            } finally {
                this._loadingPromise = null;
            }
        })();

        return this._loadingPromise;
    }

    /**
     * Busca entidades conocidas dentro de un texto.
     */
    findEntitiesInText(text) {
        const normalizedText = normalizeText(text);
        const matches = {
            courses: [],
            topics: [],
            careers: [],
            instructors: []
        };

        const stopWords = ['de', 'la', 'el', 'en', 'y', 'que', 'los', 'las', 'un', 'una', 'sobre', 'para', 'con', 'por', 'hablame', 'dime', 'cuentame', 'explica', 'saber', 'temas', 'curso', 'carrera', 'docente', 'profesor'];
        const tokens = normalizedText.split(/\s+/).filter(word => word.length > 3 && !stopWords.includes(word));

        const findInSet = (set, targetArray) => {
            set.forEach(entityName => {
                if (normalizedText.includes(entityName)) {
                    targetArray.push(entityName);
                    return;
                }

                const entityNameParts = entityName.split(/\s+/).filter(part => part.length > 3 && !stopWords.includes(part));
                const hasMatch = tokens.some(token =>
                    entityNameParts.some(part => part.includes(token) || token.includes(part))
                );

                if (hasMatch) {
                    targetArray.push(entityName);
                }
            });
        };

        findInSet(this.courseNames, matches.courses);
        findInSet(this.topicNames, matches.topics);
        findInSet(this.careerNames, matches.careers);
        findInSet(this.instructorNames, matches.instructors);

        matches.courses = [...new Set(matches.courses)];
        matches.topics = [...new Set(matches.topics)];
        matches.careers = [...new Set(matches.careers)];
        matches.instructors = [...new Set(matches.instructors)];

        return matches;
    }
}

module.exports = KnowledgeBaseRepository;
