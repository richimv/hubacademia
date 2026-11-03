/**
 * Gobernanza Centralizada de Modelos y Parámetros en Google Cloud Vertex AI
 * - Plataforma exclusiva: Google Enterprise AI (@google-cloud/vertexai).
 * - Estándar de modelos (ACT-02): gemini-3.6-flash-lite (primario) y gemini-3.6-flash (respaldo).
 * - Higiene de parámetros (ACT-01): adopción exclusiva de thinking_level ("minimal" | "low" | "medium" | "high")
 *   y omisión estricta de parámetros de muestreo depreciados.
 * - Preservación obligatoria de Thought Signatures en conversaciones multi-turno.
 * - Durable Caching implícito de 24h en GCP (ACT-03).
 */

const ALLOWED_THINKING_LEVELS = new Set(['minimal', 'low', 'medium', 'high']);

const VERTEX_DURABLE_CACHE_POLICY = Object.freeze({
    retentionType: 'DURABLE',
    defaultTtlHours: 24,
    region: 'us-central1',
    projects: ['gen-lang-client-0179928353', 'meducat'],
    buildEphemeralPatchConfig(projectId, location = 'us-central1') {
        return {
            method: 'PATCH',
            url: `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/cacheConfig`,
            body: {
                retentionType: 'EPHEMERAL'
            }
        };
    }
});

const VERTEX_INTERACTIONS_API_ROADMAP = Object.freeze({
    currentTransport: 'vertexai.generateContent',
    targetTransport: 'vertexai.interactions',
    requiresThoughtSignatureCirculation: true
});

function getVertexCandidateModels() {
    const primary = String(process.env.VERTEX_MODEL_PRIMARY || 'gemini-3.6-flash-lite').trim();
    const fallback = String(process.env.VERTEX_MODEL_FALLBACK || 'gemini-3.6-flash').trim();
    return Array.from(new Set([primary, fallback].filter(Boolean)));
}

function normalizeThinkingLevel(rawLevel) {
    if (!rawLevel || typeof rawLevel !== 'string') return null;
    const normalized = rawLevel.trim().toLowerCase();
    return ALLOWED_THINKING_LEVELS.has(normalized) ? normalized : null;
}

/**
 * Construye generationConfig limpio para Gemini 3.6+ sin parámetros de muestreo depreciados.
 */
function buildVertexGenerationConfig({ maxOutputTokens = 8192, responseMimeType = 'application/json', thinkingLevel = undefined } = {}) {
    const config = {
        maxOutputTokens
    };

    if (responseMimeType) {
        config.responseMimeType = responseMimeType;
    }

    const effectiveThinkingLevel = thinkingLevel !== undefined
        ? thinkingLevel
        : (process.env.VERTEX_THINKING_LEVEL || null);

    const validThinkingLevel = normalizeThinkingLevel(effectiveThinkingLevel);
    if (validThinkingLevel) {
        config.thinkingConfig = {
            thinkingLevel: validThinkingLevel
        };
    }

    return config;
}

/**
 * Extrae el texto final de respuesta y la firma de pensamiento (thoughtSignature)
 * de un resultado de Vertex AI para circularla intacta en turnos posteriores.
 */
function extractModelResponsePayload(result) {
    const parts = result?.response?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts) || parts.length === 0) {
        return null;
    }

    let thoughtSignature = null;
    const textChunks = [];

    for (const part of parts) {
        if (!part || typeof part !== 'object') continue;
        if (typeof part.thoughtSignature === 'string' && part.thoughtSignature.trim()) {
            thoughtSignature = part.thoughtSignature;
        }
        if (part.thought === true) {
            continue;
        }
        if (typeof part.text === 'string') {
            textChunks.push(part.text);
        }
    }

    const text = textChunks.length > 0
        ? textChunks.join('')
        : (typeof parts[0]?.text === 'string' ? parts[0].text : '');

    return {
        text,
        thoughtSignature
    };
}

module.exports = {
    ALLOWED_THINKING_LEVELS,
    VERTEX_DURABLE_CACHE_POLICY,
    VERTEX_INTERACTIONS_API_ROADMAP,
    getVertexCandidateModels,
    normalizeThinkingLevel,
    buildVertexGenerationConfig,
    extractModelResponsePayload
};
