const AnalyticsService = require('../../domain/services/analyticsService');
const KnowledgeBaseRepository = require('../../domain/repositories/knowledgeBaseRepository');
const CourseRepository = require('../../domain/repositories/courseRepository');
const CareerRepository = require('../../domain/repositories/careerRepository');
const BookRepository = require('../../domain/repositories/bookRepository');
// ✅ FASE II: Importar el nuevo servicio de chat para manejar el historial.
const ChatService = require('../../domain/services/chatService');
const TutorAiService = require('../../domain/services/tutorAiService');

class ChatController {
    constructor(chatService, analyticsService, usageService) {
        console.log('🔄 Inicializando ChatController...');
        this.analyticsService = analyticsService;
        this.usageService = usageService;
        this.knowledgeBaseRepo = new KnowledgeBaseRepository();
        this.chatService = chatService;
        console.log('✅ ChatController inicializado correctamente');

        // Bindeo explícito para mantener el contexto
        this.processMessage = this.processMessage.bind(this);
        this.trainModel = this.trainModel.bind(this);
        // ✅ FASE II: Bindeo de los nuevos métodos para el historial.
        this.getUserConversations = this.getUserConversations.bind(this);
        this.getConversationMessages = this.getConversationMessages.bind(this);
        this.updateConversationTitle = this.updateConversationTitle.bind(this); // ✅ MEJORA
        this.deleteConversation = this.deleteConversation.bind(this); // ✅ MEJORA
    }

    /**
     * Procesa un mensaje del usuario, lo clasifica, obtiene una respuesta de la IA
     * y guarda toda la interacción en la base de datos.
     */
    async processMessage(req, res) {
        try {
            console.log('💬 ChatController.processMessage iniciado');

            // ✅ FASE II: Extraer datos del request (incluyendo resourceId si lo envía el asistente de voz/chat)
            const { message, specialization = 'medicine', context, ephemeral = false, resourceId = null } = req.body;
            let { conversationId } = req.body; // 'let' porque puede ser creado.
            const userId = req.user.id; // Obtenido del token JWT.

            if (!message || message.trim() === '') {
                return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
            }

            // ✅ CARGA DE CONTEXTO DINÁMICO DE RECURSO (Si viene de la página de un recurso)
            let finalSpecialization = specialization;
            let resourceContext = null;

            if (resourceId) {
                try {
                    const resRow = await new (require('../../domain/repositories/bookRepository'))().findById(resourceId);
                    if (resRow) {
                        finalSpecialization = resRow.domain || 'medicine';
                        resourceContext = {
                            id: resourceId,
                            title: resRow.title || '',
                            content_html: resRow.content_html || '',
                            file_url: resRow.url || null
                        };
                        console.log(`📚 [ChatController] Contexto de recurso cargado. Especialidad dinamizada: ${finalSpecialization} | Recurso: "${resRow.title}"`);
                    }
                } catch (err) {
                    console.error("⚠️ Error cargando contexto de recurso en ChatController:", err.message);
                }
            }

            console.log(`💬 Procesando mensaje (${finalSpecialization}):`, message.substring(0, 60));

            if (!this.analyticsService) {
                console.error('❌ ERROR CRÍTICO: analyticsService no está disponible');
            }

            // ✅ SOPORTE PARA CHAT VOLÁTIL (EFÍMERO)
            const isEphemeral = ephemeral || (context && context.type === 'flashcard_tutor');
            let conversationHistory = [];

            if (!isEphemeral) {
                // --- ✅ FASE II: LÓGICA DE PERSISTENCIA DEL CHAT ---
                // 1. Si es un mensaje nuevo, crear la conversación en la BD.
                if (!conversationId) {
                    const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
                    const newConversation = await this.chatService.chatRepository.createConversation(userId, title);
                    conversationId = newConversation.id;
                }

                // 2. Guardar el mensaje del usuario en la BD.
                await this.chatService.chatRepository.addMessage(conversationId, 'user', message);

                // 3. Obtener el historial COMPLETO desde la BD para dar contexto a la IA.
                conversationHistory = await this.chatService.chatRepository.getMessagesByConversationId(conversationId, userId);
            } else {
                console.log('⚡ MODO EFÍMERO: Usando historial de sesión enviado por el cliente.');
                conversationId = 'ephemeral';
                conversationHistory = req.body.history || [];
            }

            // ✅ INYECCIÓN DE CONTEXTO PARA TUTOR DE FLASHCARDS (General & Versátil)
            let processedMessage = message;
            if (context && context.type === 'flashcard_tutor') {
                const tutorInstruction = `[MODO: TUTOR ACADÉMICO]
Eres un experto en el tema de esta tarjeta. Ayuda al estudiante a entender no solo qué dice la tarjeta, sino el porqué.
REGLAS:
1. Sé pedagógico y expande la explicación si el usuario lo solicita o si el concepto es complejo.
2. Usa ejemplos, reglas mnemotécnicas o datos adicionales relevantes (dosis, gramática, leyes, etc).
3. Adapta tu tono a la disciplina (Medicina, Educación, etc).

CONTEXTO DE LA TARJETA:
- FRENTE: ${context.front}
- DORSO: ${context.back}
- TEMA: ${context.topic}
---
PREGUNTA DEL ESTUDIANTE: ${message}`;

                processedMessage = tutorInstruction;
                console.log('🧠 Tutor Context (Expansive Mode) Injected');
            }

            const hasRAGAccess = (req.userTier === 'advanced' || req.userTier === 'basic' || req.userTier === 'admin');

            // --- ✅ FASE III: PROCESAMIENTO IA (V6 - TutorAiService) ---
            let aiResult;
            try {
                console.log(`🤖 Generando respuesta V6. RAG: ${hasRAGAccess}. Tier: ${req.userTier}. Spec: ${finalSpecialization}`);

                // Llamada al servicio especializado con el mensaje procesado
                aiResult = await TutorAiService.handleChat(processedMessage, conversationHistory, {
                    target: req.userTarget || 'ENAM',
                    specialization: finalSpecialization,
                    userTier: req.userTier,
                    namespace: (finalSpecialization === 'medicine' || finalSpecialization === 'education') ? finalSpecialization : 'general',
                    resourceContext: resourceContext // ✅ Pasar el contexto del recurso cargado al servicio IA
                });

                // TutorAiService ya devuelve { intencion, respuesta, sugerencias } parseados

            } catch (aiError) {
                console.error('❌ ERROR CRÍTICO llamando a TutorAiService:', aiError);
                return res.status(500).json({ error: 'El servicio de IA no está disponible' });
            }

            const response = await this.enrichResponse(message, aiResult);

            // 4. Guardar la respuesta del bot en la BD (Solo si no es efímero).
            let botMessage = { id: 'temp' };
            if (!isEphemeral) {
                botMessage = await this.chatService.chatRepository.addMessage(conversationId, 'bot', response.respuesta);
            }

            // 5. REGISTRAR EN ANALYTICS (Lógica original)
            if (this.analyticsService) {
                // ✅ REFACTOR: Usar clasificación centralizada basada en CONTENIDO
                const isEducational = this.analyticsService.isQueryEducational(message);

                await this.analyticsService.recordSearchWithIntent(
                    message,
                    [], // No hay "resultados" directos en una conversación de chat
                    isEducational,
                    userId, 'chatbot' // ✅ MEJORA: Especificar que la fuente es el chatbot.
                );
            }

            // 6. ACTUALIZAR LÍMITES DE USO IA (Cobro de 2 Vidas por RAG)
            try {
                if (!isEphemeral && req.usageType === 'usage_count') {
                    // ✅ NUEVA REGLA: El Chat con RAG cuesta 2 vidas
                    await this.usageService.checkAndIncrementUsage(userId, 2);
                    console.log(`📉 Límite de usage_count incrementado (+2) para usuario ${userId}.`);
                } else if (!isEphemeral && req.usageType) {
                    // Para otros límites (daily_ai_usage), cobro normal de 1
                    const pool = require('../../infrastructure/database/db');
                    await pool.query(`UPDATE users SET ${req.usageType} = ${req.usageType} + 1 WHERE id = $1`, [userId]);
                }
            } catch (limitErr) {
                console.error("⚠️ No se pudo actualizar el límite del usuario:", limitErr.message);
            }

            console.log('✅ Respuesta generada exitosamente');

            // ✅ NUEVO: Generación de título inteligente para conversaciones nuevas
            if (!conversationId && !isEphemeral) {
                // (Ya se creó arriba con un placeholder)
            } else if (!req.body.conversationId && !isEphemeral) {
                // Detectamos que era una conversación nueva por la ausencia de ID en el request original
                TutorAiService.generateConversationTitle(message, response.respuesta)
                    .then(newTitle => {
                        console.log(`✨ Nuevo título generado: ${newTitle}`);
                        this.chatService.chatRepository.updateTitle(conversationId, newTitle, userId);
                    })
                    .catch(err => console.warn("⚠️ Fallo al generar título inteligente:", err));
            }

            res.json({
                ...response,
                // Devolver siempre el ID de la conversación para que el frontend pueda continuarla.
                conversationId: conversationId,
                // ✅ NUEVO: Devolver el ID del mensaje del bot para el feedback.
                messageId: botMessage.id,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Error en ChatController.processMessage:', error);
            res.status(500).json({
                error: 'Error al procesar el mensaje',
                respuesta: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta nuevamente.'
            });
        }
    }

    /**
     * Obtiene la lista de todas las conversaciones de un usuario.
     */
    async getUserConversations(req, res) {
        try {
            const userId = req.user.id;
            const conversations = await this.chatService.getConversations(userId);
            res.json(conversations);
        } catch (error) {
            console.error('❌ Error obteniendo conversaciones:', error);
            res.status(500).json({ error: 'Error al obtener las conversaciones.' });
        }
    }

    /**
     * Obtiene todos los mensajes de una conversación específica.
     */
    async getConversationMessages(req, res) {
        try {
            const userId = req.user.id;
            const conversationId = parseInt(req.params.id, 10);
            const messages = await this.chatService.getMessages(conversationId, userId);
            res.json(messages);
        } catch (error) {
            console.error('❌ Error obteniendo mensajes:', error);
            res.status(500).json({ error: 'Error al obtener los mensajes de la conversación.' });
        }
    }

    /**
     * Actualiza el título de una conversación.
     */
    async updateConversationTitle(req, res) {
        try {
            const userId = req.user.id;
            const conversationId = parseInt(req.params.id, 10);
            const { title } = req.body;

            if (!title || title.trim() === '') {
                return res.status(400).json({ error: 'El título no puede estar vacío.' });
            }

            const updatedConversation = await this.chatService.updateConversationTitle(conversationId, title, userId);
            res.json(updatedConversation);
        } catch (error) {
            console.error('❌ Error actualizando título de conversación:', error);
            res.status(500).json({ error: 'Error al actualizar el título.' });
        }
    }

    /**
     * Elimina una conversación.
     */
    async deleteConversation(req, res) {
        try {
            const userId = req.user.id;
            const conversationId = parseInt(req.params.id, 10);

            const wasDeleted = await this.chatService.deleteConversation(conversationId, userId);

            if (wasDeleted) {
                res.status(204).send(); // No Content
            } else {
                // Esto puede pasar si el usuario intenta borrar un chat que no es suyo o no existe.
                res.status(404).json({ error: 'Conversación no encontrada o no tienes permiso para eliminarla.' });
            }
        } catch (error) {
            console.error('❌ Error eliminando conversación:', error);
            res.status(500).json({ error: 'Error al eliminar la conversación.' });
        }
    }

    async enrichResponse(userMessage, llmResult) {
        // La respuesta principal ya viene del LLM.
        // Esta función ahora solo añade información extra o sugerencias.
        const { intencion, confianza, respuesta, idioma_detectado } = llmResult;
        console.log('🎯 Generando respuesta contextual para:', intencion);

        let enrichedResponse = respuesta;
        // La lógica de enriquecimiento de cursos ahora la maneja Gemini con Function Calling.

        return {
            intencion,
            confianza: confianza || 0.85,
            respuesta: enrichedResponse,
            idioma_detectado: idioma_detectado || 'es',
            sugerencias: await this.generateChatSuggestions(intencion, llmResult)
        };
    }

    // findRelevantCourses ya no es necesario aquí, la lógica de búsqueda de cursos
    // se maneja directamente en mlService a través de la herramienta getCourseDetails
    // que llama a CourseRepository.

    async generateChatSuggestions(intencion, llmResult) {
        // Si el LLM ya proveyó sugerencias, podríamos usarlas.
        if (llmResult.sugerencias && llmResult.sugerencias.length > 0) {
            return llmResult.sugerencias;
        }

        // Si no, usamos las sugerencias predefinidas como fallback.
        // Si no, usamos las sugerencias predefinidas como fallback.
        // ✅ MEJORA: Sugerencias centradas en el usuario ("Yo quiero...") en lugar de preguntas del bot.
        // ✅ MEJORA: Sugerencias centradas en el usuario ("Yo quiero...") 
        const predefinedSuggestions = {
            'solicitar_material': [
                "Ver libros del curso",
                "Buscar papers clave"
            ],
            'duda_teorica': [
                "Dame ejemplos",
                "¿Qué libros hablan de esto?"
            ],
            'consulta_evaluacion': [
                "¿Qué temas entran?",
                "Ver fechas importantes"
            ],
            'consulta_administrativa': [
                "Ver fechas de matrícula",
                "Contactar soporte"
            ]
        };
        // Fallback general más útil y seguro
        return predefinedSuggestions[intencion] || [
            "Quiero saber más",
            "Dame un ejemplo",
            "¿Cómo puedo aplicar esto?"
        ];
    }

    async trainModel(req, res) {
        try {
            console.log('🎯 Solicitado re-entrenamiento del modelo...');
            const MLService = require('../../domain/services/mlService');
            const result = await MLService.trainModel();
            res.json(result);
        } catch (error) {
            console.error('❌ Error entrenando modelo:', error);
            res.status(500).json({
                error: 'Error entrenando el modelo',
                detalles: error.message
            });
        }
    }
}

module.exports = ChatController; // ✅ CORRECCIÓN: Exportar la clase, no la instancia.