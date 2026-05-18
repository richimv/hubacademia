const { VertexAI } = require('@google-cloud/vertexai');
const RagService = require('./ragService');
const chatPrompts = require('../prompts/chatPrompts');
const BookRepository = require('../repositories/bookRepository');
const db = require('../../infrastructure/database/db'); // Mover al inicio

/**
 * 🎓 TUTOR AI SERVICE V6.2: El Cerebro del Chat y Tutoría.
 * - Routing inteligente por especialización (medicine, education, neutral, flashcard_tutor).
 * - RAG Semántico (Pinecone) para medicina y educación.
 * - Catálogo Visual (Postgres/GCS) para imágenes de recursos.
 * - Detección de idioma para TTS dinámico.
 * - JSON estructurado nativo (responseMimeType).
 */
class TutorAiService {
    constructor() {
        const project = process.env.GOOGLE_CLOUD_PROJECT;
        const location = process.env.GOOGLE_CLOUD_LOCATION;
        this.vertex_ai = new VertexAI({ project, location });
        this.bookRepository = new BookRepository();

        this.model = this.vertex_ai.getGenerativeModel({
            model: 'gemini-2.5-flash-lite',
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.8,
                topP: 0.9,
                responseMimeType: "application/json"
            }
        });
        console.log("✅ TutorAiService: Motor de Tutoría (Chat) inicializado.");
    }

    /**
     * Busca recursos visuales (imágenes) relevantes en Postgres.
     * Solo busca en specializations que tienen recursos visuales (medicine, education).
     * Usa búsqueda por título + temas relacionados para mayor relevancia.
     * @param {string} query - El mensaje del usuario.
     * @param {string} specialization - 'medicine', 'education', etc.
     * @returns {string} Texto del catálogo visual para inyectar en el prompt, o '' si no hay.
     */
    async _searchVisualResources(topics, specialization) {
        try {
            const visualDomains = ['medicine', 'education'];
            if (!visualDomains.includes(specialization)) return '';

            // Usar temas expandidos o fallback a palabras clave
            const keywords = (topics && topics.length > 0)
                ? topics.map(t => t.toLowerCase()).slice(0, 5)
                : [];

            if (keywords.length === 0) return '';

            // Buscar por título del recurso Y por nombre del tema relacionado
            const conditions = keywords.map((_, i) => `(
                unaccent(LOWER(r.title)) LIKE unaccent(LOWER($${i + 1}))
                OR unaccent(LOWER(COALESCE(t.name, ''))) LIKE unaccent(LOWER($${i + 1}))
            )`).join(' OR ');

            const domainIndex = keywords.length + 1;
            const params = [...keywords.map(k => `%${k}%`), specialization];

            const sqlQuery = `
                SELECT DISTINCT r.title, r.image_url,
                       MAX(CASE 
                         WHEN unaccent(LOWER(r.title)) LIKE unaccent(LOWER($1)) THEN 100
                         WHEN unaccent(LOWER(COALESCE(t.name, ''))) LIKE unaccent(LOWER($1)) THEN 80
                         ELSE 50
                       END) as relevance
                FROM resources r
                LEFT JOIN topic_resources tr ON r.id = tr.resource_id
                LEFT JOIN topics t ON t.id = tr.topic_id
                WHERE r.resource_type = 'other' 
                  AND r.image_url IS NOT NULL
                  AND r.domain = $${domainIndex}
                  AND (${conditions})
                GROUP BY r.title, r.image_url
                ORDER BY relevance DESC
                LIMIT 5
            `;

            const { rows } = await db.query(sqlQuery, params);
            if (rows.length === 0) return '';

            const catalog = rows.map(r => `- RECURSO: "${r.title}" | URL: ${r.image_url}`).join('\n');
            console.log(`🖼️ [TutorAiService] ${rows.length} imagen(es) encontrada(s) para temas: ${keywords.join(', ')}`);

            return `\n\n[CATÁLOGO VISUAL DISPONIBLE - PRIORIDAD ALTA]\nInstrucción: Si alguno de estos títulos coincide con el tema principal, DEBES insertarlo. Recursos:\n${catalog}`;
        } catch (error) {
            console.warn('⚠️ [TutorAiService] Error buscando recursos visuales:', error.message);
            return '';
        }
    }

    /**
     * Maneja la conversación del usuario con el Tutor.
     * @param {string} message - El mensaje del usuario.
     * @param {Array} history - Historial de la conversación.
     * @param {Object} filters - { target, specialization, namespace, userTier }
     */
    async handleChat(userMessage, history = [], filters = {}) {
        // Sanitizar mensaje
        const message = userMessage.replace(/^["']|["']$/g, '').trim();
        const conversationId = filters.conversationId || 'default';

        const target = (filters.target || "ENAM").toUpperCase();
        const specialization = filters.specialization || 'medicine';
        const namespace = filters.namespace || specialization;

        console.log(`🎓 [TutorAiService] Consulta (${specialization} | NS: ${namespace}): "${message.substring(0, 40)}..."`);

        try {
            // Inicializar caché si no existe (Persistencia de temas por conversación)
            if (!this._topicCache) this._topicCache = new Map();

            // 1. EXTRAER TEMAS INTELIGENTES
            let smartTopics = await RagService.extractSmartTerms(message, specialization, target);
            
            // LÓGICA DE PERSISTENCIA: Si no hay temas nuevos pero hay historial, recuperar últimos temas
            if ((!smartTopics || smartTopics.length === 0 || smartTopics[0].toLowerCase() === 'ninguno') && this._topicCache.has(conversationId)) {
                smartTopics = this._topicCache.get(conversationId);
                console.log(`♻️ [TutorAiService] Reutilizando temas del cache para ${conversationId}: ${smartTopics.join(', ')}`);
            } else if (smartTopics && smartTopics.length > 0 && smartTopics[0].toLowerCase() !== 'ninguno') {
                // Guardar nuevos temas técnicos en el caché
                this._topicCache.set(conversationId, smartTopics);
            }

            const mainSearchQuery = (smartTopics && smartTopics.length > 0) ? smartTopics.join(' ') : message;
            console.log(`🧠 [TutorAiService] Temas finales: ${smartTopics?.join(', ') || 'ninguno'}`);

            // 2. Determinar Contexto de Estudio (Ruta Express vs RAG Híbrido Multiuso)
            let context = "";
            const resourceContext = filters.resourceContext || null;

            if (resourceContext) {
                // Modo Contexto de Recurso (Asistente de Voz / Chat del Recurso)
                const content = resourceContext.content_html || "";
                const plainText = content ? content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
                const isContentShort = plainText && plainText.length > 0 && plainText.length < 15000;

                if (isContentShort) {
                    console.log(`📚 [TutorAiService] Usando content_html de recurso directo (< 15k texto plano)`);
                    context = `--- CONTEXTO OFICIAL DEL RECURSO: "${resourceContext.title}" ---\n${plainText}\n\n[INSTRUCCIONES DE RESPUESTA]:\nResponde a la pregunta del usuario utilizando este material como tu base de verdad técnica primaria. Si la pregunta requiere profundizar o no está explícita aquí, usa tu experiencia clínica/pedagógica para dar una respuesta rica y veraz.`;
                } else {
                    console.log(`🔍 [TutorAiService] Usando RAG Resiliente de 3 niveles para recurso extenso/sin sinopsis`);
                    let filename = null;
                    if (resourceContext.file_url) {
                        const parts = resourceContext.file_url.split('/');
                        filename = decodeURIComponent(parts[parts.length - 1]);
                    }

                    const questionRagService = require('./questionRagService');
                    
                    // Nivel 1: RAG Dinámico por metadato de archivo
                    context = await questionRagService.getStyleContextByKeywords(
                        specialization,
                        [mainSearchQuery],
                        8,
                        filename
                    );

                    // Nivel 2: RAG Semántico Global
                    if (!context || context.trim() === '') {
                        console.warn(`⚠️ [TutorAiService] No se encontraron fragmentos en Pinecone para ${filename}, intentando RAG semántico global.`);
                        context = await questionRagService.getStyleContextByKeywords(
                            specialization,
                            [`${resourceContext.title} ${mainSearchQuery}`],
                            8,
                            null
                        );
                    }

                    // Nivel 3: Fallback Generativo Experto
                    if (!context || context.trim() === '') {
                        console.warn(`⚠️ [TutorAiService] RAG falló en chat de voz, usando fallback básico del título.`);
                        context = `Tema de estudio principal: "${resourceContext.title}".`;
                    }
                }
            } else {
                // Modo Chat General (Normal RAG)
                const activeRAG = ['medicine', 'education'].includes(specialization);
                if (activeRAG) {
                    // Pasamos predefinedTerms para evitar la doble llamada a la IA reescritora
                    context = await RagService.searchContextSmart(mainSearchQuery, 20, { 
                        mode: 'SEMANTIC', 
                        target,
                        namespace,
                        predefinedTerms: smartTopics
                    });
                }
            }

            // 3. Buscar imágenes (Usando temas persistentes)
            const visualCatalog = await this._searchVisualResources(smartTopics || [], specialization);

            // 4. Construir prompt según la especialización
            const contextConImagenes = visualCatalog ? `${visualCatalog}\n\n${context}` : context;

            let systemPrompt = chatPrompts.buildPrompt(specialization, target, contextConImagenes);

            // 4. Formatear historial para Gemini
            const contents = history.map(h => ({
                role: h.role === 'user' ? 'user' : 'model',
                parts: [{ text: h.content }]
            }));
            contents.push({ role: 'user', parts: [{ text: message }] });

            // 5. Generación de respuesta
            const result = await this.model.generateContent({
                contents,
                systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] }
            });

            const rawText = result.response.candidates[0].content.parts[0].text;

            // 6. Parsear la respuesta JSON
            let parsed;
            try {
                parsed = JSON.parse(rawText);
            } catch (e) {
                const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
                try {
                    parsed = JSON.parse(cleaned);
                } catch (e2) {
                    parsed = { intencion: 'respuesta_general', respuesta: rawText, sugerencias: [], idioma_detectado: 'es' };
                }
            }

            // 6. Log de la respuesta (Debug Visual)
            if (parsed.respuesta && parsed.respuesta.includes('![')) {
                console.log('✅ [TutorAiService] IA insertó imagen en la respuesta.');
            } else {
                console.warn('⚠️ [TutorAiService] IA NO insertó ninguna imagen del catálogo.');
            }

            // Mapeo de fuentes según el dominio
            const sourcesMap = {
                'medicine': 'Biblioteca Médica Digital (NTS, GPC, Harrison)',
                'education': 'Biblioteca Magisterial (CNEB, Normas MINEDU, Pruebas de Ascenso)',
                'languages': 'Language Hub (Gramática y Modismos)'
            };

            return {
                intencion: parsed.intencion || `consulta_${specialization}`,
                respuesta: parsed.respuesta || rawText,
                sugerencias: parsed.sugerencias || [],
                idioma_detectado: parsed.idioma_detectado || 'es',
                confianza: 0.9,
                contextUsed: !!context,
                sources: context ? (sourcesMap[specialization] || "Biblioteca Especializada") : "Conocimiento General"
            };

        } catch (error) {
            console.error('❌ Error en TutorAiService:', error.message);
            throw error;
        }
    }


    /**
     * Genera un título corto para una conversación.
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
