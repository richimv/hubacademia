const { VertexAI } = require('@google-cloud/vertexai');
const RagService = require('./ragService');
const chatPrompts = require('../prompts/chatPrompts');
const BookRepository = require('../repositories/bookRepository');
const db = require('../../infrastructure/database/db'); // Mover al inicio
const securityUtils = require('../utils/securityUtils');

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
     * Extrae imágenes en base64 de un texto y retorna el texto limpio
     * con placeholders e inlineData para la API de Gemini.
     */
    _extractMultimodalParts(text) {
        const parts = [];
        if (!text) return { cleanedText: '', parts };

        // Expresión regular lineal y robusta para evitar backtracking con base64 gigantescos
        const base64Regex = /data:(image\/[a-z0-9-+.]+);base64,([^"'\s)>]+)/gi;
        
        let match;
        
        // Buscar todas las ocurrencias de base64
        while ((match = base64Regex.exec(text)) !== null) {
            const mimeType = match[1];
            const base64Data = match[2].replace(/\s/g, ''); // Remover saltos de línea/espacios del base64
            parts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                }
            });
        }
        
        // Reemplazar la data URI base64 en el texto por un placeholder indexado
        let index = 1;
        const cleanedText = text.replace(/data:(image\/[a-z0-9-+.]+);base64,([^"'\s)>]+)/gi, () => {
            return `[Imagen ${index++}]`;
        });
        
        return { cleanedText, parts };
    }

    /**
     * 🧠 LLAMADOR DE MODELO DUAL Y RESILIENTE (AI CHANNELER)
     * Llama a Gemini utilizando la API REST de Google AI Studio (si hay GEMINI_API_KEY)
     * o mediante Vertex AI. Cuenta con reintentos y backoff exponencial en caso de 429 u otros fallos.
     */
    async _callModelResilient(contents, systemPrompt) {
        const apiKey = process.env.GEMINI_API_KEY;
        const maxRetries = 3;
        let delayMs = 1000;
        let lastError = null;

        // 1. Intentar primero con la API REST de Google AI Studio si está configurada (canal primario independiente)
        if (apiKey) {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const axios = require('axios');
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
                    
                    const payload = {
                        contents: contents,
                        systemInstruction: {
                            parts: [{ text: systemPrompt }]
                        },
                        generationConfig: {
                            responseMimeType: "application/json",
                            temperature: 0.8,
                            maxOutputTokens: 8192,
                            topP: 0.9
                        }
                    };

                    console.log(`📡 [REST Tutor] Llamando a gemini-2.5-flash-lite vía Google AI Studio (Intento ${attempt}/${maxRetries})...`);
                    const res = await axios.post(url, payload, { timeout: 25000 });
                    
                    if (res.data && res.data.candidates && res.data.candidates[0] && res.data.candidates[0].content) {
                        const text = res.data.candidates[0].content.parts[0].text;
                        return text;
                    }
                    throw new Error("Respuesta inválida del servidor REST");
                } catch (err) {
                    lastError = err;
                    const status = err.response ? err.response.status : null;
                    console.warn(`⚠️ [REST Tutor Fallo] Intento ${attempt} falló:`, err.message);
                    
                    if (status === 400 || status === 403) {
                        break; // Error de autenticación/configuración, no reintentar
                    }

                    if (attempt < maxRetries) {
                        console.log(`⏳ Esperando ${delayMs}ms antes de reintentar REST...`);
                        await new Promise(resolve => setTimeout(resolve, delayMs));
                        delayMs *= 2;
                    }
                }
            }
        }

        // 2. Fallback / Canal Secundario: Vertex AI con reintentos y backoff exponencial
        console.log("📡 [VertexAI Tutor] Iniciando canal Vertex AI con reintentos...");
        delayMs = 1000;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await this.model.generateContent({
                    contents,
                    systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] }
                });
                
                if (result && result.response && result.response.candidates && result.response.candidates[0] && result.response.candidates[0].content) {
                    return result.response.candidates[0].content.parts[0].text;
                }
                throw new Error("Respuesta de Vertex AI vacía o inválida");
            } catch (err) {
                lastError = err;
                console.warn(`⚠️ [VertexAI Tutor Fallo] Intento ${attempt} falló:`, err.message);
                
                if (attempt < maxRetries) {
                    console.log(`⏳ Esperando ${delayMs}ms antes de reintentar Vertex AI...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    delayMs *= 2;
                }
            }
        }

        console.error("❌ [TutorAiService] Todos los canales e intentos de IA fallaron.");
        throw lastError;
    }

    /**
     * Maneja la conversación del usuario con el Tutor.
     * @param {string} message - El mensaje del usuario.
     * @param {Array} history - Historial de la conversación.
     * @param {Object} filters - { target, specialization, namespace, userTier }
     */
    async handleChat(userMessage, history = [], filters = {}) {
        // 1. Extraer imágenes base64 del mensaje original (antes de sanitizar/recortar para no truncar la data)
        const { cleanedText: preCleanedMessage, parts: imageParts } = this._extractMultimodalParts(userMessage);

        // 2. Sanitizar el mensaje limpio (que ahora es muy corto y no será truncado)
        const message = securityUtils.sanitizeInputForAI(preCleanedMessage, securityUtils.LIMITS.LONG_TEXT);
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
                } else if (filters.useRag !== false) {
                    console.log(`🔍 [TutorAiService] Usando RAG Semántico basado en el Título del Recurso: "${resourceContext.title}"`);
                    const questionRagService = require('./questionRagService');
                    
                    // Buscamos semánticamente en Pinecone usando el título del recurso y la consulta
                    context = await questionRagService.getStyleContextByKeywords(
                        specialization,
                        [`${resourceContext.title} ${mainSearchQuery}`],
                        8,
                        null,
                        resourceContext.title
                    );

                    // Fallback Generativo Experto basado en el título (Si RAG falló por completo)
                    if (!context || context.trim() === '') {
                        if (plainText && plainText.length > 0) {
                            console.log(`⚠️ [TutorAiService] RAG de título no disponible pero se usará plainText del recurso como fallback de contingencia.`);
                            context = `--- CONTEXTO OFICIAL DEL RECURSO (Fragmento Contingencia): "${resourceContext.title}" ---\n${plainText.substring(0, 20000)}\n\n[INSTRUCCIONES DE RESPUESTA]:\nResponde a la pregunta utilizando este fragmento del material como tu base primaria de verdad.`;
                        } else {
                            console.warn(`⚠️ [TutorAiService] RAG de título no disponible, usando fallback básico centrado en el título: "${resourceContext.title}"`);
                            context = `[MODO ASISTENTE DE RECURSO - FALLBACK GENERATIVO EXPERTO]
Tema principal de estudio: "${resourceContext.title}".
INSTRUCCIÓN CRÍTICA: El usuario te ha pedido resumir o responder una duda sobre el recurso titulado "${resourceContext.title}". Como el material completo no está indexado en la base vectorial ni en la base de datos, debes actuar como un especialista de élite en ${specialization} y generar una respuesta rica, detallada y perfectamente estructurada basándote estrictamente en tus conocimientos expertos sobre el tema exacto del título ("${resourceContext.title}").
🚨 REGLA DE ORO: TIENES ABSOLUTAMENTE PROHIBIDO decir "no tengo acceso al contenido", "proporcióname el enlace", "no puedo acceder a páginas web externas" o excusas similares. El usuario sabe que eres el tutor integrado. Responde directamente con el resumen o explicación experta del tema indicado en el título de forma proactiva para deslumbrarlo, usando viñetas o tablas Markdown.`;
                        }
                    }
                } else {
                    console.log(`⚠️ [TutorAiService] RAG desactivado por límite. Usando fallback generativo experto para recurso.`);
                    context = `[MODO ASISTENTE DE RECURSO - FALLBACK GENERATIVO EXPERTO]
Tema principal de estudio: "${resourceContext.title}".
INSTRUCCIÓN CRÍTICA: El usuario te ha pedido resumir o responder una duda sobre el recurso titulado "${resourceContext.title}". Como RAG está deshabilitado por límites, debes actuar como un especialista de élite en ${specialization} y generar una respuesta rica, detallada y perfectamente estructurada basándote en tus conocimientos expertos sobre el tema exacto del título ("${resourceContext.title}").`;
                }
            } else {
                // Modo Chat General (Normal RAG)
                const activeRAG = ['medicine', 'education'].includes(specialization) && filters.useRag !== false;
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

            // 4. Formatear historial para Gemini (limpiando cualquier base64 remanente para evitar inflar el contexto)
            const contents = history.map(h => {
                const text = h.content || '';
                const cleanedText = text.replace(/data:(image\/[a-z0-9-+.]+);base64,([a-zA-Z0-9+/=\s\r\n]+?)(?=["'\s\)])/gi, '[Imagen]');
                return {
                    role: h.role === 'user' ? 'user' : 'model',
                    parts: [{ text: cleanedText }]
                };
            });
            
            // Añadir mensaje actual limpio y adjuntar las imágenes extraídas como partes multimodales
            const userParts = [{ text: message }];
            if (imageParts && imageParts.length > 0) {
                userParts.push(...imageParts);
                console.log(`📸 [TutorAiService] Inyectadas ${imageParts.length} imágenes como partes multimodales.`);
            }
            contents.push({ role: 'user', parts: userParts });

            // 5. Generación de respuesta resiliente con reintentos y multicanal
            const rawText = await this._callModelResilient(contents, systemPrompt);

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
                'education': 'Biblioteca Magisterial (CNEB, Normas MINEDU, Pruebas de Ascenso)'
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

            const contents = [{ role: 'user', parts: [{ text: prompt }] }];
            const systemInstruction = "Eres un experto en síntesis de contenido. Generas títulos para chats de medicina y educación.";
            const rawText = await this._callModelResilient(contents, systemInstruction);

            let parsed;
            try {
                parsed = JSON.parse(rawText);
            } catch (e) {
                const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
                try {
                    parsed = JSON.parse(cleaned);
                } catch (e2) {
                    parsed = { titulo: userMessage.substring(0, 30) };
                }
            }

            return parsed.titulo || userMessage.substring(0, 30);
        } catch (error) {
            console.error("⚠️ Error generando título:", error.message);
            return userMessage.substring(0, 30) + "...";
        }
    }
}

module.exports = new TutorAiService();
