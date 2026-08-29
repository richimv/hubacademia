const { VertexAI } = require('@google-cloud/vertexai');
const trainingRepository = require('../repositories/flashcardRepository');
const securityUtils = require('../utils/securityUtils');

// CONFIGURACIÓN VERTEX AI
const project = process.env.GOOGLE_CLOUD_PROJECT;
const location = process.env.GOOGLE_CLOUD_LOCATION;
const vertex_ai = new VertexAI({ project: project, location: location });

const modelCreativeLite = vertex_ai.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.9,
        topP: 0.95,
        responseMimeType: 'application/json'
    },
});

class FlashcardService {

    /**
     * Obtiene las tarjetas pendientes de repaso para un usuario.
     */
    async getDueFlashcards(userId) {
        return await trainingRepository.getDueFlashcards(userId);
    }

    /**
     * Procesa el repaso de una tarjeta usando el algoritmo SM-2.
     * @param {string} cardId 
     * @param {number} quality - 0 a 5 (0=Blackout, 5=Perfect)
     * @param {object} currentCardState - { interval, easiness, repetitions }
     */
    async processReview(cardId, quality, currentCardState) {
        // Algoritmo SuperMemo-2 (SM-2)
        // https://super-memory.com/english/ol/sm2.htm

        let { interval_days, easiness_factor, repetition_number } = currentCardState;

        // Convertir a números por seguridad
        let interval = parseInt(interval_days || 0);
        let ef = parseFloat(easiness_factor || 2.5);
        let reps = parseInt(repetition_number || 0);

        let nextReviewDate = new Date();

        if (quality >= 3) {
            // Respuesta Correcta
            if (reps === 0) {
                // Adaptación Anki/UI: Respetar el intervalo inicial prometido en los botones
                if (quality === 3) interval = 1;      // Difícil -> 1 día ("Mañana")
                else if (quality === 4) interval = 3; // Bien -> 3 días
                else if (quality === 5) interval = 7; // Fácil -> 7 días
                else interval = 1;
            } else {
                // Repasos subsecuentes: Multiplicador estándar SM-2
                interval = Math.round(interval * ef);
            }
            reps++;

            // Sumar días
            nextReviewDate.setDate(nextReviewDate.getDate() + interval);

        } else {
            // "Olvidé" / Respuesta Incorrecta
            // RESET: Intervalo 0 (para indicar intraday) o 1? 
            // La UI dice "< 1 min". 
            // Lo agendamos para dentro de 1 minuto.
            reps = 0;
            interval = 0; // Marcar como 0 días (intraday)

            // Sumar 1 minuto
            nextReviewDate.setMinutes(nextReviewDate.getMinutes() + 1);
        }

        // Actualizar Factor de Facilidad (EF) solo si no fue un fallo total (opcional, estándar SM-2 no baja EF si q<3, pero otros sí. Mantenemos tu lógica original de ajuste)
        // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        if (ef < 1.3) ef = 1.3;

        // Mapear Quality algorítmico (0,3,4,5) a Índice Visual Estricto (1,2,3,4) para la UI y la BD
        let visualQuality = 1;
        if (quality === 0) visualQuality = 1; // Rojo: Olvidé
        else if (quality === 3) visualQuality = 2; // Naranja: Difícil
        else if (quality === 4) visualQuality = 3; // Azul: Bien
        else if (quality === 5) visualQuality = 4; // Verde: Fácil

        // Guardar en BD
        await trainingRepository.updateFlashcard(cardId, interval, ef, reps, nextReviewDate, visualQuality);

        return {
            success: true,
            nextReview: nextReviewDate,
            intervalDays: interval
        };
    }

    /**
     * Genera Flashcards a partir de un tema o texto (Para Custom Decks).
     * @param {string} topic - Tema o texto corto.
     * @param {number} count - Número sugerido (Default 10, adaptable).
     */
    async generateFlashcardsFromTopic(topic, count = 10) {
        try {
            const cleanTopic = securityUtils.sanitizeInputForAI(topic, securityUtils.LIMITS.SHORT_TEXT);
            const prompt = `
            Actúa como un experto pedagogogía y diseño instruccional.
            Crea entre 1 y 15 Flashcards educativas sobre el tema: "${cleanTopic}".
            
            🚨 REGLA DE INTELIGENCIA ADAPTATIVA:
            - Si el usuario solicita EXPLÍCITAMENTE una cantidad en el tema (ej: "3 tarjetas"), cumple con esa cantidad exacta SIEMPRE QUE esté entre 1 y 15.
            - Si no hay una cantidad explícita, sé proporcional a la densidad del tema. Si el tema es simple o muy específico, genera lo necesario (aunque sea 1 o 2 tarjetas).
            - Si el tema es complejo o extenso, genera el máximo de 15 tarjetas críticas.
            - No intentes meter todo un libro en 15 tarjetas; prioriza lo que un estudiante NECESITA memorizar primero.

            FORMATO JSON ESTRICTO:
            [{ "front": "Pregunta o Concepto", "back": "Respuesta o Definición Breve" }]

            REGLAS DE CALIDAD:
            1. Idioma: Español.
            2. "front": Debe ser claro y provocar recuerdo activo (Active Recall).
            3. "back": Debe ser conciso (< 50 palabras). Evita respuestas de una sola palabra si el concepto requiere matiz.
            4. Evita preguntas de verdadero/falso o sí/no.
            `;

            console.log(`🧠 AI Adaptive Flashcards: Procesando '${topic}' (Margen 5-15)...`);
            const result = await modelCreativeLite.generateContent(prompt);
            const text = result.response.candidates[0].content.parts[0].text;

            const cards = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
            return cards;

        } catch (error) {
            console.error("❌ Error Generando Flashcards IA:", error);
            throw new Error("No se pudo generar contenido con IA.");
        }
    }
}

module.exports = new FlashcardService();
