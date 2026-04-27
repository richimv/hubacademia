const { VertexAI } = require('@google-cloud/vertexai');
const db = require('../../infrastructure/database/db');
const RagService = require('./ragService');
const genPrompts = require('../prompts/generationPrompts');

/**
 * 👑 ADMIN AI SERVICE (Limpio): Generación Masiva para Admin.
 */
class AdminAiService {
    constructor() {
        const project = process.env.GOOGLE_CLOUD_PROJECT;
        const location = process.env.GOOGLE_CLOUD_LOCATION;
        this.vertex_ai = new VertexAI({ project, location });
        this.model = this.vertex_ai.getGenerativeModel({
            model: 'gemini-2.5-flash-lite',
            generationConfig: { 
                maxOutputTokens: 16384, 
                temperature: 0.7, 
                responseMimeType: "application/json" 
            }
        });
    }

    async generateRAGQuestions(target, studyAreas, career, amount = 10, reqDomain = 'medicine') {
        try {
            let areasArray = Array.isArray(studyAreas) ? studyAreas : studyAreas.split(',').map(a => a.trim());
            let sampledAreas = areasArray.length >= 5 ? areasArray.sort(() => 0.5 - Math.random()).slice(0, 5) : areasArray;
            let allQuestions = [];
            
            for (let i = 0; i < amount; i++) {
                const area = sampledAreas[i % sampledAreas.length];
                const q = await this._generateSingleQuestion(target, area, career);
                if (q) allQuestions.push(q);
                if (i < amount - 1) await new Promise(r => setTimeout(r, 2000));
            }
            return allQuestions;
        } catch (error) {
            console.error('❌ Error en AdminAiService:', error.message);
            throw error;
        }
    }

    async _generateSingleQuestion(target, area, career) {
        try {
            const ragContext = await RagService.searchContextSmart(area, 8, { mode: 'FTS', target });
            const styleExamples = await RagService.getStyleExamples(career, 4);

            // Inyectamos el prompt desde el catálogo central
            const prompt = genPrompts.getAdminPrompt(target, area, career, ragContext, styleExamples);

            const result = await this.model.generateContent(prompt);
            return JSON.parse(result.response.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim());
        } catch (error) {
            console.error(`⚠️ Error en generación admin p/ ${area}:`, error.message);
            return null;
        }
    }
}

module.exports = new AdminAiService();
