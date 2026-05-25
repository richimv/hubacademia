const { VertexAI } = require('@google-cloud/vertexai');
const crypto = require('crypto');
const ttsService = require('./ttsService');

class LanguageService {
    constructor(languageRepository) {
        this.languageRepository = languageRepository;

        console.log('🔄 Inicializando LanguageService...');
        const project = process.env.GOOGLE_CLOUD_PROJECT;
        const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
        this.vertex_ai = new VertexAI({ project, location });
        
        this.model = this.vertex_ai.getGenerativeModel({
            model: 'gemini-2.5-flash-lite',
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.6,
                responseMimeType: "application/json"
            }
        });
        console.log('✅ LanguageService inicializado correctamente');
    }

    /**
     * Obtiene el temario estructurado de un idioma y nivel.
     */
    async getSyllabus(userId, languageCode, level) {
        return await this.languageRepository.getSyllabus(userId, languageCode, level);
    }

    /**
     * Genera dinámicamente el contenido de una lección utilizando Gemini.
     */
    async generateLesson(topicId, topicName, languageCode, cefrLevel, userRole, regenerate = false) {
        let syllabusRow;
        if (topicId) {
            syllabusRow = await this.languageRepository.getSyllabusById(topicId);
        } else if (topicName) {
            syllabusRow = await this.languageRepository.getSyllabusByTopic(topicName, languageCode, cefrLevel);
        }

        if (!syllabusRow) {
            throw new Error('NOT_FOUND');
        }

        const content = syllabusRow.content;
        const hasNewFormat = content && Array.isArray(content.exercises) && content.exercises.length > 0 && content.exercises[0].items && (content.exercises[0].type === 'sentences' || content.exercises[0].type === 'table');
        
        if (content && hasNewFormat && !regenerate) {
            return { lesson: content, isCached: true };
        }

        if (userRole !== 'admin') {
            throw new Error('FORBIDDEN');
        }

        console.log(`🤖 Generando lección con IA para el tema ID ${syllabusRow.id}: "${syllabusRow.topic_name}" (${syllabusRow.language_code} - ${syllabusRow.level})`);

        const isIt = syllabusRow.language_code.startsWith('it');
        const langName = isIt ? 'Italiano' : 'Inglés';

        const prompt = `
        Eres un tutor de idiomas de inteligencia artificial de nivel premium, experto en metodologías didácticas modernas e interactivas (como las plataformas de Cambridge y Oxford).
        Tu objetivo es explicar de forma muy didáctica, completa y lúdica el tema: "${syllabusRow.topic_name}" en el idioma de práctica: ${syllabusRow.language_code} (${langName}), adaptado para un nivel de estudiante MCER: ${syllabusRow.level}.
        
        Tu respuesta debe estar redactada en ESPAÑOL (L1) para que el estudiante comprenda bien si el nivel es A1, A2, B1 o B2. Si el nivel es C1 o C2, redacta las explicaciones en el propio idioma de práctica (${syllabusRow.language_code.split('-')[0].toUpperCase()}).
        
        Requisitos del contenido:
        1. Explicación Teórica Amplia ("explanation"): Escribe una explicación muy rica, completa, didáctica y lúdica sobre el tema. Usa tablas markdown si es útil para profundizar la teoría, conjugar verbos, listar frases de ejemplo, etc.
        2. Zona Práctica y Lúdica ("exercises"): Define múltiples bloques de ejercicios interactivos de tipo completar espacios en blanco ("fill-in-the-blanks"). Cada ejercicio debe invitar al alumno a rellenar el espacio representado exactamente por un único marcador "[_____]".
        3. Los ejercicios pueden ser de tipo 'sentences' (lista de oraciones a completar) o 'table' (una tabla estructurada con celdas de entrada y pistas, ej: para conjugar en tiempos pasado o futuro). Genera una cantidad abundante de ítems para un aprendizaje profundo.
        
        Escribe la lección en formato JSON crudo (sin envolver en bloques de código markdown, solo el JSON crudo).
        `;

        const lessonSchema = {
            type: 'OBJECT',
            properties: {
                title: { type: 'STRING' },
                explanation: { type: 'STRING', description: 'Explicación teórica amplia, didáctica y lúdica en formato Markdown (puedes usar tablas markdown para verbos o frases si es relevante).' },
                exercises: {
                    type: 'ARRAY',
                    description: 'Bloques de ejercicios para rellenar espacios en blanco. Genera múltiples bloques y oraciones/tablas según el tema para proveer abundante contenido.',
                    items: {
                        type: 'OBJECT',
                        properties: {
                            instructions: { type: 'STRING', description: 'Instrucciones en español para el estudiante.' },
                            type: { type: 'STRING', enum: ['sentences', 'table'] },
                            headers: { 
                                type: 'ARRAY', 
                                items: { type: 'STRING' },
                                description: 'Cabeceras de la tabla (solo si type es table, ej: ["Frase en infinitivo", "Pasado [_____]", "Contexto/Traducción"]). Dejar vacío si type es sentences.'
                            },
                            items: {
                                type: 'ARRAY',
                                items: {
                                    type: 'OBJECT',
                                    properties: {
                                        id: { type: 'STRING' },
                                        sentence_template: { type: 'STRING', description: 'Texto que contiene exactamente un marcador [_____] para rellenar.' },
                                        correct_answer: { type: 'STRING', description: 'La palabra o frase corta correcta que rellena el espacio.' },
                                        hint: { type: 'STRING', description: 'Pista gramatical o consejo didáctico.' },
                                        context: { type: 'STRING', description: 'Traducción o contexto complementario.' }
                                    },
                                    required: ['id', 'sentence_template', 'correct_answer', 'hint']
                                }
                            }
                        },
                        required: ['instructions', 'type', 'items']
                    }
                }
            },
            required: ['title', 'explanation', 'exercises']
        };

        const result = await this.model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: lessonSchema
            }
        });
        const responseText = result.response.candidates[0].content.parts[0].text;

        let jsonLesson;
        try {
            const cleaned = responseText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
            jsonLesson = JSON.parse(cleaned);
        } catch (parseErr) {
            console.error("❌ Error parseando lección generada por IA:", parseErr.message);
            console.error("Texto crudo:", responseText);
            throw new Error('AI_PARSE_ERROR');
        }

        // Persistir de forma permanente en la base de datos
        await this.languageRepository.updateSyllabusContent(syllabusRow.id, jsonLesson);

        return { lesson: jsonLesson, isCached: false };
    }

    /**
     * Evalúa las respuestas del alumno usando evaluación local con fallback didáctico de Gemini.
     */
    async evaluateLesson(topicId, answers) {
        const syllabusRow = await this.languageRepository.getSyllabusById(topicId);
        if (!syllabusRow || !syllabusRow.content) {
            throw new Error('NOT_FOUND_OR_NO_CONTENT');
        }

        const lessonContent = typeof syllabusRow.content === 'string' ? JSON.parse(syllabusRow.content) : syllabusRow.content;
        const exercises = lessonContent.exercises;
        if (!Array.isArray(exercises)) {
            throw new Error('INVALID_EXERCISES');
        }

        // Aplanar todos los ítems de todos los bloques para evaluar
        const allItems = [];
        exercises.forEach(ex => {
            if (Array.isArray(ex.items)) {
                ex.items.forEach(item => {
                    allItems.push({
                        ...item,
                        instructions: ex.instructions,
                        type: ex.type
                    });
                });
            }
        });

        // Evaluar localmente
        const evaluatedItems = allItems.map(item => {
            const studentAnswerObj = answers.find(a => a.id === item.id);
            const userAnswer = studentAnswerObj ? (studentAnswerObj.user_answer || '').trim() : '';
            const correctAnswer = (item.correct_answer || '').trim();

            // Comparación local robusta (insensible a mayúsculas, minúsculas, espacios y acentos)
            const normalize = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").trim();
            const isCorrect = normalize(userAnswer) === normalize(correctAnswer);

            return {
                id: item.id,
                sentence_template: item.sentence_template,
                correct_answer: item.correct_answer,
                user_answer: userAnswer,
                is_correct: isCorrect,
                hint: item.hint,
                context: item.context || ''
            };
        });

        const score = evaluatedItems.filter(item => item.is_correct).length;

        const isIt = syllabusRow.language_code.startsWith('it');
        const langName = isIt ? 'Italiano' : 'Inglés';

        const prompt = `
        Eres un tutor de idiomas de inteligencia artificial de nivel premium (estilo plataforma Cambridge). Tu tarea es dar retroalimentación didáctica y muy alentadora a un estudiante que acaba de responder unos ejercicios de completar espacios en blanco.
        
        Idioma de práctica: ${syllabusRow.language_code} (${langName}).
        Nivel MCER: ${syllabusRow.level}.
        Tema de la lección: "${syllabusRow.topic_name}".
        
        Los ejercicios con sus respuestas y evaluación local son:
        ${JSON.stringify(evaluatedItems, null, 2)}
        
        Analiza cada respuesta del estudiante. Genera una explicación breve y didáctica en español (o en inglés/italiano si el nivel es C1/C2) para cada uno de los ítems, explicando por qué está correcto o señalando qué error cometió el estudiante y cómo corregirlo de manera clara.
        
        Tu respuesta debe ser un JSON crudo exactamente con la siguiente estructura, sin bloques de código markdown:
        {
          "score": ${score},
          "items": [
            {
              "id": "ID_DEL_ITEM",
              "is_correct": true/false,
              "explanation": "Explicación didáctica y alentadora personalizada sobre la respuesta del estudiante."
            }
          ]
        }
        `;

        const evaluationSchema = {
            type: 'OBJECT',
            properties: {
                score: { type: 'INTEGER' },
                items: {
                    type: 'ARRAY',
                    items: {
                        type: 'OBJECT',
                        properties: {
                            id: { type: 'STRING' },
                            is_correct: { type: 'BOOLEAN' },
                            explanation: { type: 'STRING' }
                        },
                        required: ['id', 'is_correct', 'explanation']
                    }
                }
            },
            required: ['score', 'items']
        };

        let jsonResponse;
        try {
            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: evaluationSchema
                }
            });
            const responseText = result.response.candidates[0].content.parts[0].text;
            const cleaned = responseText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
            jsonResponse = JSON.parse(cleaned);
        } catch (err) {
            console.error("❌ Error generando feedback de evaluación con IA:", err);
            jsonResponse = {
                score,
                items: evaluatedItems.map(item => ({
                    id: item.id,
                    is_correct: item.is_correct,
                    explanation: item.is_correct 
                        ? `¡Excelente trabajo! Has completado el espacio correctamente con '${item.correct_answer}'.` 
                        : `Respuesta incorrecta. Colocaste '${item.user_answer}', pero la respuesta correcta es '${item.correct_answer}'. Pista: ${item.hint}`
                }))
            };
        }

        // Sobrescribir score e is_correct determinísticamente para evitar alucinaciones del LLM
        const finalItems = evaluatedItems.map(item => {
            const aiItem = jsonResponse && Array.isArray(jsonResponse.items) 
                ? jsonResponse.items.find(i => i.id === item.id) 
                : null;
            return {
                id: item.id,
                is_correct: item.is_correct,
                explanation: aiItem ? aiItem.explanation : (item.is_correct 
                    ? `¡Excelente! Has completado el espacio con '${item.correct_answer}'.` 
                    : `Incorrecto. Escribiste '${item.user_answer}', pero la respuesta correcta es '${item.correct_answer}'. Pista: ${item.hint}`)
            };
        });

        return { score, items: finalItems };
    }

    /**
     * Marca o desmarca un tema del temario como completado.
     */
    async toggleProgress(userId, syllabusId, completed) {
        return await this.languageRepository.toggleProgress(userId, syllabusId, completed);
    }

    /**
     * Obtiene el vocabulario privado del usuario filtrado por idioma.
     */
    async getVocabulary(userId, languageCode) {
        return await this.languageRepository.getVocabulary(userId, languageCode);
    }

    /**
     * Agrega una palabra de vocabulario con soporte de síntesis TTS.
     */
    async addWord(userId, word, translation, definition, exampleSentence, languageCode = 'en-US', cefrLevel = 'A1') {
        let audioUrl = null;
        try {
            await ttsService.synthesize(word, languageCode);
            const cleanText = word.replace(/[*_#`]/g, '').trim();
            const textHash = crypto.createHash('md5').update(`${cleanText}_${languageCode}`).digest('hex');
            audioUrl = `tts_cache/${languageCode}_${textHash}.mp3`;
        } catch (ttsErr) {
            console.error('⚠️ [LanguageService] Error al pre-sintetizar audio de vocabulario:', ttsErr.message);
        }

        return await this.languageRepository.addWord(
            userId, languageCode, cefrLevel, word.trim(), translation.trim(), 
            definition ? definition.trim() : null, 
            exampleSentence ? exampleSentence.trim() : null, 
            audioUrl
        );
    }

    /**
     * Completa los detalles de traducción, definición y ejemplo de una palabra usando Gemini.
     */
    async generateWordDetails(word, languageCode = 'en-US', cefrLevel = 'A1') {
        const isIt = languageCode.startsWith('it');
        const langName = isIt ? 'Italiano' : 'Inglés';

        const prompt = `
        Eres un asistente de vocabulario de idiomas de nivel premium.
        Para la palabra o expresión idiomática: "${word}" en el idioma: ${languageCode} (${langName}) y adaptada para el nivel del estudiante: ${cefrLevel}, debes generar:
        1. Su traducción al español (L1).
        2. Una definición corta e instructiva redactada en español.
        3. Una oración de ejemplo en el idioma original (${languageCode}) utilizando la palabra, que tenga coherencia y nivel sintáctico adecuado para el nivel ${cefrLevel}.
        
        DEBES responder ÚNICAMENTE con el siguiente formato JSON plano (no envuelvas en bloques de código markdown, solo el JSON crudo):
        {
          "translation": "Traducción en español",
          "definition": "Definición en español",
          "example_sentence": "Ejemplo en el idioma original utilizando la palabra"
        }
        `;

        const result = await this.model.generateContent(prompt);
        const responseText = result.response.candidates[0].content.parts[0].text;

        try {
            const cleaned = responseText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
            return JSON.parse(cleaned);
        } catch (parseErr) {
            console.error("❌ Error parseando detalles de palabra generada por IA:", parseErr.message);
            console.error("Texto crudo:", responseText);
            throw new Error('AI_PARSE_ERROR');
        }
    }

    /**
     * Elimina una palabra de vocabulario de la colección del usuario.
     */
    async deleteWord(id, userId) {
        return await this.languageRepository.deleteWord(id, userId);
    }

    /**
     * Exporta palabras de vocabulario seleccionadas al mazo de flashcards SRS de idiomas.
     */
    async exportToFlashcards(userId, ids, deckId) {
        const words = await this.languageRepository.getVocabularyWordsByIds(userId, ids);
        if (words.length === 0) {
            throw new Error('NO_WORDS_FOUND');
        }

        let targetDeckId = deckId;
        if (!targetDeckId) {
            const TrainingRepository = require('../repositories/flashcardRepository');
            targetDeckId = await TrainingRepository.ensureSystemDeck(userId, 'IDIOMAS');
        }

        const insertPromises = words.map(w => {
            const backContent = `**Traducción:** ${w.translation}\n\n**Definición:** ${w.definition || 'Sin definición'}\n\n**Ejemplo:** *${w.example_sentence || 'Sin ejemplo'}*`;
            return this.languageRepository.insertFlashcard(
                userId, targetDeckId, w.word, backContent, 'Vocabulario', 
                w.audio_url, w.language_code
            );
        });

        await Promise.all(insertPromises);
        return words.length;
    }
}

module.exports = LanguageService;
