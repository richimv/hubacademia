const CourseRepository = require('../../domain/repositories/courseRepository');
const AnalyticsService = require('../../domain/services/analyticsService');
const TopicRepository = require('../../domain/repositories/topicRepository');
const CareerRepository = require('../../domain/repositories/careerRepository');
const BookRepository = require('../../domain/repositories/bookRepository');

class SearchService {
    constructor() {
        this.courseRepository = new CourseRepository();
        this.analyticsService = new AnalyticsService();
        this.topicRepository = new TopicRepository();
        this.careerRepository = new CareerRepository();
        this.bookRepository = new BookRepository();
    }

    async getAllCourses() {
        return await this.courseRepository.findAll();
    }

    async getAllTopics() {
        return await this.topicRepository.findAll();
    }

    async getAllCareers() {
        return await this.careerRepository.findAll();
    }

    async searchCourses(query, user = null) {
        console.log(`🚀 SearchService: Iniciando búsqueda UNIFICADA para "${query}"`);

        const [bookResults, courseResults] = await Promise.all([
            this.bookRepository.search(query).catch(err => { console.error('Error searching books:', err); return []; }),
            this.courseRepository.search(query).catch(err => { console.error('Error searching courses:', err); return []; })
        ]);

        const books = bookResults.map(b => ({ ...b, type: b.resource_type || 'book' }));
        const courses = courseResults.map(c => ({ ...c, type: 'course' }));

        let finalCourses = courses;

        if (finalCourses.length < 3 && query.length > 3) {
            const careerCourses = await this.courseRepository.findByCareerCategory(query);

            if (careerCourses.length > 0) {
                const currentIds = new Set(finalCourses.map(c => c.id));
                const newCourses = careerCourses
                    .filter(c => !currentIds.has(c.id))
                    .map(c => ({ ...c, type: 'course', _matchType: 'career_context' }));

                finalCourses = [...finalCourses, ...newCourses];
            }
        }

        const finalResults = [...books, ...finalCourses];

        if (this.analyticsService && this.analyticsService.ensureReady) {
            await this.analyticsService.ensureReady();
        }
        const isEducationalQuery = this.analyticsService.isQueryEducational(query);
        const userId = user ? user.id : null;

        if (finalResults.length > 0 || isEducationalQuery) {
            await this.analyticsService.recordSearchWithIntent(query, finalCourses.slice(0, 5), isEducationalQuery, userId);
        }

        return {
            searchQuery: query,
            results: finalResults,
            totalResults: finalResults.length,
            recommendations: null,
            isEducationalQuery: isEducationalQuery,
            queryClassification: this.analyticsService?.classifySearchTerm ? this.analyticsService.classifySearchTerm(query) : 'General'
        };
    }
}

module.exports = SearchService;
