/** Gemini Developer API is authorized only for public company support, never academic tutors. */
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const REQUEST_TIMEOUT_MS = 10000;

function providerError(code) {
    return Object.assign(new Error('El servicio de atención no está disponible.'), { code });
}

async function generatePlatformSupportText({ systemInstruction, contents }) {
    const apiKey = process.env.HUBI_AI_STUDIO_API_KEY?.trim();
    if (!apiKey) throw providerError('NOT_CONFIGURED');
    const model = (process.env.HUBI_AI_STUDIO_MODEL || DEFAULT_MODEL).trim();
    if (!/^gemini-[a-z0-9.-]+$/.test(model)) throw providerError('INVALID_MODEL');

    const generationConfig = { maxOutputTokens: 512 };
    if (/^gemini-3[.-]/.test(model)) generationConfig.thinkingConfig = { thinkingLevel: 'MINIMAL' };
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), REQUEST_TIMEOUT_MS);
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify({ systemInstruction: { parts: [{ text: systemInstruction }] }, contents, generationConfig }),
            signal: abort.signal
        });
        if (!response.ok) throw providerError(response.status === 429 ? 'QUOTA_EXCEEDED' : 'PROVIDER_REJECTED');
        const data = await response.json();
        const candidate = data.candidates?.[0];
        if (candidate?.finishReason && !['STOP', 'MAX_TOKENS'].includes(candidate.finishReason)) throw providerError('CONTENT_BLOCKED');
        const text = candidate?.content?.parts?.filter(part => !part.thought && typeof part.text === 'string').map(part => part.text).join('').trim();
        if (!text) throw providerError('EMPTY_RESPONSE');
        return text;
    } catch (error) {
        // Never propagate a request object, provider body, key, or user input to application logs.
        throw providerError(['NOT_CONFIGURED', 'INVALID_MODEL', 'QUOTA_EXCEEDED', 'PROVIDER_REJECTED', 'CONTENT_BLOCKED', 'EMPTY_RESPONSE'].includes(error.code) ? error.code : 'PROVIDER_UNAVAILABLE');
    } finally {
        clearTimeout(timer);
    }
}

module.exports = { generatePlatformSupportText };
