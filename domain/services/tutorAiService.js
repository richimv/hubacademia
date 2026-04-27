const { VertexAI } = require('@google-cloud/vertexai');
const RagService = require('./ragService');
const chatPrompts = require('../prompts/chatPrompts');

/**
 * 🎓 TUTOR AI SERVICE V6: El Cerebro del Chat y Tutoría.
 * - Routing inteligente por especialización (medicine, education, neutral, flashcard_tutor).
 * - RAG Semántico (Pinecone) solo para medicina.
 * - JSON estructurado nativo (responseMimeType).
 */
class TutorAiService {
    constructor() {
        const project = process.env.GOOGLE_CLOUD_PROJECT;
        const location = process.env.GOOGLE_CLOUD_LOCATION;
        this.vertex_ai = new VertexAI({ project, location });
        
        this.model = this.vertex_ai.getGenerativeModel({
            model: 'gemini-2.5-flash-lite',
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.8,
                topP: 0.9,
                responseMimeType: "application/json"
            }
        });
        console.log("✅ TutorAiService: Motor de Tutoría (Chat) inicializado con RAG Semántico.");
    }

    /**
     * Maneja la conversación del usuario con el Tutor.
     * @param {string} message - El mensaje del usuario (o processedMessage con contexto de flashcard).
     * @param {Array} history - Historial de la conversación.
     * @param {Object} filters - { target, specialization, namespace, userTier }
     */
    async handleChat(message, history = [], filters = {}) {
        const target = (filters.target || "ENAM").toUpperCase();
        const specialization = filters.specialization || 'medicine';
        const namespace = filters.namespace || specialization;
        
        console.log(`🎓 [TutorAiService] Consulta (${specialization} | NS: ${namespace}): "${message.substring(0, 40)}..."`);

        try {
            // 1. Solo buscar en Pinecone si la especialización lo requiere
            let context = "";
            if (specialization === 'medicine') {
                context = await RagService.searchContextSmart(message, 8, { 
                    mode: 'SEMANTIC', 
                    target,
                    namespace
                });
            }

            // 2. Construir prompt según la especialización (medicina inyecta RAG, otros no)
            const systemPrompt = chatPrompts.buildPrompt(specialization, target, context);
            
            // 3. Formatear historial para Gemini
            const contents = history.map(h => ({
                role: h.role === 'user' ? 'user' : 'model',
                parts: [{ text: h.content }]
            }));
            contents.push({ role: 'user', parts: [{ text: message }] });

            // 4. Generación de respuesta
            const result = await this.model.generateContent({
                contents,
                systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] }
            });

            const rawText = result.response.candidates[0].content.parts[0].text;

            // 5. Parsear la respuesta JSON (el modelo devuelve JSON nativo gracias a responseMimeType)
            let parsed;
            try {
                parsed = JSON.parse(rawText);
            } catch (e) {
                // Fallback: limpiar backticks si el modelo los añadió de todas formas
                const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
                try {
                    parsed = JSON.parse(cleaned);
                } catch (e2) {
                    // Último recurso: devolver como texto plano
                    parsed = { intencion: 'respuesta_general', respuesta: rawText, sugerencias: [] };
                }
            }

            return {
                intencion: parsed.intencion || 'consulta_medica',
                respuesta: parsed.respuesta || rawText,
                sugerencias: parsed.sugerencias || [],
                confianza: 0.9,
                contextUsed: !!context,
                sources: context ? "Biblioteca Médica Digital (Pinecone)" : "Conocimiento General"
            };

        } catch (error) {
            console.error('❌ Error en TutorAiService:', error.message);
            throw error;
        }
    }

    /**
     * Genera un título corto para una conversación basada en el primer intercambio.
     */
    async generateConversationTitle(userMessage, botResponse) {
        try {
            console.log("📝 [TutorAiService] Generando título automático...");
            
            const prompt = `Analiza el primer intercambio de un chat y genera un título corto, elegante y descriptivo de máximo 5 palabras.
            Usuario: ${userMessage}
            IA: ${botResponse.substring(0, 150)}...
            
            Devuelve un JSON con el campo "titulo".`;

            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                systemInstruction: { role: 'system', parts: [{ text: "Eres un experto en síntesis de contenido. Generas títulos para chats de medicina y educación." }] }
            });

            const rawText = result.response.candidates[0].content.parts[0].text;
            const parsed = JSON.parse(rawText);
            
            return parsed.titulo || userMessage.substring(0, 30);
        } catch (error) {
            console.error("⚠️ Error generando título:", error.message);
            return userMessage.substring(0, 30) + "...";
        }
    }
}

module.exports = new TutorAiService();
