const { VertexAI } = require('@google-cloud/vertexai');

class LanguageChatService {
    constructor() {
        console.log('🔄 Inicializando LanguageChatService...');
        const project = process.env.GOOGLE_CLOUD_PROJECT;
        const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
        this.vertex_ai = new VertexAI({ project, location });
        this.model = this.vertex_ai.getGenerativeModel({
            model: 'gemini-2.5-flash-lite',
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.7,
                responseMimeType: "application/json"
            }
        });
        console.log('✅ LanguageChatService inicializado correctamente');
    }

    /**
     * Procesa un mensaje de conversación de idiomas.
     * Retorna la respuesta en L2 y una lista de correcciones.
     */
    async processChat(message, languageCode = 'en-US', cefrLevel = 'B1', history = []) {
        // Construir el historial para el prompt
        let historyText = "";
        if (history && history.length > 0) {
            historyText = history.map(h => `${h.role === 'user' ? 'Usuario' : 'Tutor'}: ${h.content}`).join('\n');
        } else {
            historyText = "No hay historial previo.";
        }
        
        const prompt = `
        Eres un tutor de idiomas de inteligencia artificial de nivel premium. Tu objetivo es ayudar al usuario a practicar el idioma de su elección: ${languageCode} (${languageCode.startsWith('it') ? 'Italiano' : languageCode.startsWith('en') ? 'Inglés' : 'Idioma seleccionado'}).
        Nivel MCER (CEFR) objetivo: ${cefrLevel}
        
        El idioma objetivo de la conversación es el ${languageCode.split('-')[0].toUpperCase()}.
        El idioma nativo del usuario es el ESPAÑOL (ES).
        
        Aquí tienes el historial de la conversación actual:
        ${historyText}
        
        El usuario dice: "${message}"
        
        Sigue estas PAUTAS CRÍTICAS DE CALIDAD:
        1. **Detección de Idioma de Entrada**:
           - Si el usuario te escribe en español (ej. "Quiero practicar...", "Hola, ayúdame con...", "¿cómo se dice...?", "explicame la gramática de..."), esto NO es un intento de escribir en el idioma objetivo. El usuario se está comunicando en su idioma nativo para configurar la sesión, saludar, pedir un tema o hacer una pregunta teórica.
           - En este caso, NO debes rellenar el campo "corrections" (debe ser una lista vacía: []). Queda estrictamente prohibido traducir el mensaje en español del usuario al idioma objetivo y ponerlo como si fuera una "corrección" gramatical.
           - Responde al mensaje del usuario en español de forma amigable (dentro del campo "response") para atender su solicitud o aclarar su duda, e inmediatamente después invítalo a practicar en el idioma objetivo haciendo una pregunta de nivel ${cefrLevel}.
        2. **Correcciones gramaticales y de vocabulario (Solo para intentos en el idioma objetivo)**:
           - ÚNICAMENTE si el usuario intentó escribir/hablar en el idioma objetivo (${languageCode.split('-')[0]}) y cometió algún error gramatical, ortográfico, de conjugación o léxico, debes agregar una corrección al arreglo "corrections".
           - Si el mensaje en el idioma objetivo está perfectamente escrito, "corrections" debe ser una lista vacía: [].
           - Cada objeto de corrección en el arreglo debe tener:
             - "original": El fragmento de texto exacto del error en el idioma objetivo.
             - "corrected": El fragmento corregido en el idioma objetivo.
             - "explanation": Breve explicación didáctica en ESPAÑOL sobre por qué está mal y cómo se corrige.
        3. **Respuesta conversacional ("response")**:
           - Escribe una respuesta adecuada para el nivel ${cefrLevel}. Si el usuario te habla en el idioma objetivo, mantén el diálogo y hazle una pregunta interesante o pídele opinión para que la conversación fluya.
        
        DEBES responder ÚNICAMENTE en formato JSON plano con la siguiente estructura (no envuelvas en bloques de código markdown, solo el JSON crudo):
        {
          "response": "Tu respuesta conversacional y didáctica.",
          "corrections": []
        }
        `;
        
        const result = await this.model.generateContent(prompt);
        const responseText = result.response.candidates[0].content.parts[0].text;
        
        try {
            const cleaned = responseText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
            return JSON.parse(cleaned);
        } catch (parseErr) {
            console.error("❌ Error parseando respuesta de CCI:", parseErr.message);
            console.error("Texto crudo:", responseText);
            throw new Error('AI_PARSE_ERROR');
        }
    }
}

module.exports = LanguageChatService;
