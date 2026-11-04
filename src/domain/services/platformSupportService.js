const { PLATFORM_SUPPORT_CONTEXT } = require('../prompts/platformSupportContext');

const MAX_MESSAGE_CHARS = 1200;
const MAX_HISTORY_CHARS = 2400;
const MAX_HISTORY_MESSAGES = 4;

/** Public company support; no account lookups, academic quotas or conversation writes. */
class PlatformSupportService {
    constructor({ generateText, knowledge }) {
        this.generateText = generateText;
        this.knowledge = knowledge;
    }

    buildHistory(history) {
        if (!Array.isArray(history)) return [];
        let remaining = MAX_HISTORY_CHARS;
        const messages = [];
        for (const entry of history.slice(-MAX_HISTORY_MESSAGES).reverse()) {
            if (!entry || !['user', 'bot'].includes(entry.sender) || typeof entry.content !== 'string') continue;
            const text = entry.content.trim().slice(0, Math.min(800, remaining));
            if (!text) continue;
            remaining -= text.length;
            messages.unshift({ role: entry.sender === 'user' ? 'user' : 'model', parts: [{ text }] });
        }
        // Gemini conversations start with a user turn; ignore orphaned model replies.
        while (messages[0]?.role === 'model') messages.shift();
        return messages;
    }

    async reply({ message, history, registered }) {
        const fallback = this.knowledge.matchIntent(message);
        const suggestions = registered ? this.knowledge.getRegisteredPills() : this.knowledge.getVisitorPills();
        // Menu choices need no inference; natural-language questions use the support model.
        if (/^[1-4](?:[.)]|\s|$)/.test(message.trim())) {
            return { ...fallback, sugerencias: suggestions, isStatic: true };
        }
        try {
            const answer = await this.generateText({
                systemInstruction: PLATFORM_SUPPORT_CONTEXT,
                contents: [...this.buildHistory(history), { role: 'user', parts: [{ text: message.trim() }] }]
            });
            return { intencion: 'atencion_plataforma', respuesta: answer, sugerencias: suggestions, isStatic: false };
        } catch (error) {
            // Log a bounded category only: provider errors must never expose credentials or queries.
            console.warn('[Hubi] Respaldo de atención:', error.code || 'PROVIDER_UNAVAILABLE');
            return {
                ...fallback,
                respuesta: 'La atención con IA no está disponible en este momento. Te comparto la orientación disponible:\n\n' + fallback.respuesta,
                sugerencias: suggestions,
                isStatic: true,
                isFallback: true
            };
        }
    }
}

module.exports = { PlatformSupportService, MAX_MESSAGE_CHARS };
