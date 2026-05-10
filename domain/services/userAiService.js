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
            const result = await db.query("SELECT question_text, topic FROM question_bank ORDER BY created_at DESC LIMIT 30");
            const historyText = result.rows.map(r => `- [${r.topic}]: ${r.question_text.substring(0, 50)}...`).join('\n');

            const prompt = genPrompts.getUserPrompt(target, area, career, historyText);
            const res = await modelLite.generateContent(prompt);
            
            let data = JSON.parse(res.response.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim());
            
            // 🧹 LIMPIEZA DE POST-PROCESAMIENTO (Blindaje)
            if (Array.isArray(data)) {
                data = data.map(q => this._cleanQuestionObject(q, target, career));
            } else {
                data = this._cleanQuestionObject(data, target, career);
            }

            return data;
        } catch (error) {
            console.error("⚠️ Error en batch user ai:", error.message);
            return [];
        }
    }

    static _cleanQuestionObject(q, requestedTarget, requestedCareer) {
        if (!q) return q;
        // 1. Limpiar letras en opciones (A), B), A., etc)
        if (q.options) {
            q.options = q.options.map(opt => opt.replace(/^[A-E][.\s)-]\s*/i, '').trim());
        }
        // 2. Limpiar referencias a letras en la explicación
        if (q.explanation) {
            q.explanation = q.explanation.replace(/La opción [A-E] es (la )?más pertinente/gi, 'Esta acción es la más pertinente');
            q.explanation = q.explanation.replace(/La opción [A-E] es (la )?correcta/gi, 'Esta respuesta es la correcta');
            q.explanation = q.explanation.replace(/La opción [A-E] /gi, 'Esta opción ');
        }
        
        // 🎯 3. INTEGRIDAD DE METADATOS (Inquebrantable)
        // Sobrescribimos lo que la IA crea con lo que el usuario pidió realmente
        q.difficulty = 'Senior';
        q.target = requestedTarget;
        q.career = requestedCareer; 
        
        return q;
    }
}

module.exports = UserAiService;
