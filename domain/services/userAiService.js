const { VertexAI } = require('@google-cloud/vertexai');
const db = require('../../infrastructure/database/db');
const genPrompts = require('../prompts/generationPrompts');

// Inicializar Vertex AI
const project = process.env.GOOGLE_CLOUD_PROJECT;
const location = process.env.GOOGLE_CLOUD_LOCATION;
const vertex_ai = new VertexAI({ project: project, location: location });

const liteConfig = {
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
        maxOutputTokens: 16384,
        temperature: 0.7,
        topP: 0.8,
        responseMimeType: "application/json"
    }
};
const modelLite = vertex_ai.getGenerativeModel(liteConfig);

/**
 * ⚡ USER AI SERVICE (Limpio): Generación Profesional p/ el Alumno.
 */
class UserAiService {
    static async generateQuestions(target, studyAreas, career, amount = 5, tier = 'basic', reqDomain = 'medicine') {
        try {
            let areasArray = Array.isArray(studyAreas) ? studyAreas : studyAreas.split(',').map(a => a.trim());
            let sampledAreas = areasArray.length >= 5 ? areasArray.sort(() => 0.5 - Math.random()).slice(0, 5) : areasArray;

            let allQuestions = [];
            for (let i = 0; i < amount; i++) {
                const area = sampledAreas[i % sampledAreas.length];
                const q = await this._generateBatchInternal(target, area, career, allQuestions);
                if (q && q.length > 0) allQuestions.push(q[0]);
            }
            return allQuestions;
        } catch (error) {
            console.error('❌ Error en UserAiService:', error);
            throw error;
        }
    }

    static async _generateBatchInternal(target, area, career, previousBatch = []) {
        try {
            // 🎯 MEMORIA PROFUNDA
            const result = await db.query("SELECT question_text, topic FROM question_bank ORDER BY created_at DESC LIMIT 30");
            const historyText = result.rows.map(r => `- [${r.topic}]: ${r.question_text.substring(0, 50)}...`).join('\n');

            // Inyectamos el prompt desde el catálogo central
            const prompt = genPrompts.getUserPrompt(target, area, career, historyText);

            const res = await modelLite.generateContent(prompt);
            return JSON.parse(res.response.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim());
        } catch (error) {
            console.error("⚠️ Error en batch user ai:", error.message);
            return [];
        }
    }
}

module.exports = UserAiService;
