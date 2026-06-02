const { VertexAI } = require('@google-cloud/vertexai');
const securityUtils = require('../utils/securityUtils');

// CONFIGURACIÓN VERTEX AI
const project = process.env.GOOGLE_CLOUD_PROJECT;
const location = process.env.GOOGLE_CLOUD_LOCATION;
const vertex_ai = new VertexAI({ project: project, location: location });

const modelCreativeLite = vertex_ai.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
        maxOutputTokens: 65535,
        temperature: 0.9,
        topP: 0.95,
        responseMimeType: 'application/json'
    },
});

class SelfEvaluationService {

    async generateQuizFromResource(title, content, count = 5, difficulty = 'intermediate', resourceUrl = null, domain = 'medicine') {
        try {
            const cleanTitle = securityUtils.sanitizeInputForAI(title, securityUtils.LIMITS.TOPIC);
            console.log(`🤖 [Autoevaluacion IA] Generando quiz dinámico para recurso: ${cleanTitle} | Dificultad: ${difficulty}`);

            let contextForAI = "";
            const plainText = content ? content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
            const isContentShort = plainText && plainText.length > 0 && plainText.length < 15000;

            const subtopicsPrompt = `Actúa como un experto docente. Extrae 5 subtemas o conceptos muy específicos a evaluar del siguiente recurso: "${cleanTitle}". Devuelve SOLO una lista separada por comas, sin numeración ni introducciones.`;
            let subtopicsStr = "Conceptos generales";
            try {
                const subResp = await modelCreativeLite.generateContent(subtopicsPrompt);
                subtopicsStr = subResp.response.candidates[0].content.parts[0].text.trim();
            } catch (e) { console.warn("No se pudieron generar subtemas dinámicos."); }

            let subtopicsArr = subtopicsStr
                .split(/[\n,;]+/)
                .map(s => s.replace(/^[-*•\d\.\s]+/g, '').trim())
                .filter(s => s.length > 3);

            if (subtopicsArr.length === 0) {
                subtopicsArr = ["Conceptos clave", "Definiciones principales", "Aplicaciones prácticas", "Análisis crítico", "Casos de estudio"];
            }

            const selectedSubtopics = subtopicsArr.sort(() => 0.5 - Math.random()).slice(0, 2).join(', ');
            console.log(`🎯 [Autoevaluacion IA] Subtemas dinámicos seleccionados: ${selectedSubtopics}`);

            if (isContentShort) {
                console.log(`📚 [Autoevaluacion IA] Usando content_html directo (Largo texto plano: ${plainText.length} < 15k)`);
                contextForAI = plainText;
            } else {
                console.log(`🔍 [Autoevaluacion IA] Usando RAG Semántico basado en el Título para recurso extenso`);
                const questionRagService = require('./questionRagService');

                contextForAI = await questionRagService.getStyleContextByKeywords(
                    domain,
                    [`${cleanTitle} ${selectedSubtopics}`],
                    8,
                    null,
                    cleanTitle
                );

                if (!contextForAI || contextForAI.trim() === '') {
                    if (plainText && plainText.length > 0) {
                        console.log(`⚠️ [Autoevaluacion IA] RAG no disponible, usando plainText fallback.`);
                        contextForAI = plainText.substring(0, 20000);
                    } else {
                        console.warn(`⚠️ [Autoevaluacion IA] Fallback semántico falló, usando fallback AI pura.`);
                        contextForAI = `Resumen básico del recurso: ${cleanTitle}. Temas a evaluar: ${selectedSubtopics}`;
                    }
                }
            }

            const prompt = `
            Actúa como un experto docente y Quiz Master.
            Tu tarea es generar EXACTAMENTE ${count} preguntas de evaluación de opción múltiple (Active Recall) basadas EXCLUSIVAMENTE en el siguiente material de estudio:
            
            TÍTULO DEL RECURSO: "${cleanTitle}"
            ENFOQUE DINÁMICO (Priorizar estos temas si están en el material): ${selectedSubtopics}
            NIVEL DE DIFICULTAD: ${difficulty.toUpperCase()} (Si es 'basic' o 'easy': conceptos directos y definiciones clave. Si es 'advanced' o 'hard': análisis crítico, casos prácticos de aplicación, diagnóstico y toma de decisiones).
            
            --- INICIO DEL MATERIAL ---
            ${contextForAI}
            --- FIN DEL MATERIAL ---
            
            🚨 REGLAS DE ORO:
            1. VERACIDAD: Todas las respuestas deben deducirse o estar alinedas al material provisto.
            2. FORMATO: Genera EXACTAMENTE 4 opciones. Sin letras (A, B) al inicio.
            3. SIMETRÍA VISUAL: Todas las opciones deben tener una longitud similar. No hacer la correcta obvia por su longitud.
            4. IDIOMA: Español.
            5. EXPLICACIONES: Añade una breve explicación educativa (1-2 líneas) de por qué la respuesta es correcta.
            
            JSON ESTRICTO (No incluyas explicaciones fuera del JSON):
            [{"question_text":"¿Cuál es el principal concepto...?","options":["Opción 1", "Opción 2", "Opción 3", "Opción 4"],"correct_option_index":0,"explanation":"Explicación corta.","topic":"${cleanTitle}","visual_support_recommendation":""}]
            `;

            const result = await modelCreativeLite.generateContent(prompt);
            const text = result.response.candidates[0].content.parts[0].text;

            let questions;
            try {
                const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                let jsonString = codeBlockMatch ? codeBlockMatch[1] : text;
                const startIndex = jsonString.search(/\[/);
                const endIndex = jsonString.lastIndexOf(']');
                if (startIndex !== -1 && endIndex !== -1) {
                    jsonString = jsonString.substring(startIndex, endIndex + 1);
                }
                questions = JSON.parse(jsonString);
            } catch (parseError) {
                console.error("❌ Error parseando JSON de Recurso:", parseError.message);
                return [];
            }

            questions = questions.map(q => {
                if (q.options.length > 4) {
                    if (q.correct_option_index >= 4) {
                        q.options[3] = q.options[q.correct_option_index];
                        q.correct_option_index = 3;
                    }
                    q.options = q.options.slice(0, 4);
                }
                while (q.options.length < 4) {
                    q.options.push("Opción extra");
                }
                return q;
            });

            return questions;
        } catch (error) {
            console.error("❌ Error IA Generación Recurso:", error);
            return [];
        }
    }

    async generateGeneralQuestionsAI(topics, count = 5, subscriptionTier = 'free') {
        try {
            const cleanTopics = (topics || []).map(t => securityUtils.sanitizeInputForAI(t, securityUtils.LIMITS.TOPIC));
            console.log(`🤖 [Autoevaluacion IA] Generando preguntas AI puras para temas: ${cleanTopics.join(', ')}`);
            const prompt = `
            Actúa como un experto docente y Quiz Master.
            Tu tarea es generar EXACTAMENTE ${count} preguntas de evaluación de opción múltiple (Active Recall) sobre los siguientes temas:
            TEMAS: ${cleanTopics.join(', ')}
            
            🚨 REGLAS DE ORO:
            1. VERACIDAD: Todas las preguntas deben ser correctas y precisas técnicamente.
            2. FORMATO: Genera EXACTAMENTE 4 opciones. Sin letras (A, B) al inicio.
            3. SIMETRÍA VISUAL: Todas las opciones deben tener una longitud similar. No hacer la correcta obvia por su longitud.
            4. IDIOMA: Español.
            5. EXPLICACIONES: Añade una breve explicación educativa (1-2 líneas) de por qué la respuesta es correcta.
            
            JSON ESTRICTO (No incluyas explicaciones fuera del JSON):
            [{"question_text":"¿Cuál es el principal concepto...?","options":["Opción 1", "Opción 2", "Opción 3", "Opción 4"],"correct_option_index":0,"explanation":"Explicación corta.","topic":"${cleanTopics[0] || 'General'}","visual_support_recommendation":""}]
            `;

            const result = await modelCreativeLite.generateContent(prompt);
            const text = result.response.candidates[0].content.parts[0].text;

            let questions;
            try {
                const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                let jsonString = codeBlockMatch ? codeBlockMatch[1] : text;
                const startIndex = jsonString.search(/\[/);
                const endIndex = jsonString.lastIndexOf(']');
                if (startIndex !== -1 && endIndex !== -1) {
                    jsonString = jsonString.substring(startIndex, endIndex + 1);
                }
                questions = JSON.parse(jsonString);
            } catch (parseError) {
                console.error("❌ Error parseando JSON de Preguntas AI Puras:", parseError.message);
                return [];
            }

            questions = questions.map(q => {
                if (q.options.length > 4) {
                    if (q.correct_option_index >= 4) {
                        q.options[3] = q.options[q.correct_option_index];
                        q.correct_option_index = 3;
                    }
                    q.options = q.options.slice(0, 4);
                }
                while (q.options.length < 4) {
                    q.options.push("Opción extra");
                }
                return q;
            });

            return questions;
        } catch (error) {
            console.error("❌ Error IA Generación Pura:", error);
            return [];
        }
    }
}

module.exports = new SelfEvaluationService();

