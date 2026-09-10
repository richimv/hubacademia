const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');
const { resolveGoogleAuthOptions } = require('../../infrastructure/config/googleCredentials');

/**
 * 🚀 RAG SERVICE V6.2: Motor Vectorial Puro (Pinecone + Vertex AI)
 * - Eliminado FTS local y dependencias huérfanas de PostgreSQL.
 * - Agentic Rewriter Multi-Dominio (Medicina / Educación).
 * - Sincronizado con text-multilingual-embedding-002 (768 dim).
 * - Resiliencia ante variables de entorno dinámicas y credenciales cloud/locales.
 */
class RagService {
    constructor() {
        this._rewriterModel = null;
        resolveGoogleAuthOptions('RagService');
        this._auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });

        this._pineconeHost = process.env.PINECONE_HOST;
        this._pineconeKey = process.env.PINECONE_API_KEY;

        console.log("✅ RagService V6.2: Motor Híbrido (Pinecone) inicializado.");
    }

    get pineconeHost() {
        return process.env.PINECONE_HOST || this._pineconeHost;
    }

    get pineconeKey() {
        return process.env.PINECONE_API_KEY || this._pineconeKey;
    }

    /**
     * 🧠 AGENTIC REWRITER MULTI-DOMINIO: Optimiza la búsqueda según la especialidad.
     * Ahora público para ser usado por TutorAiService.
     */
    async extractSmartTerms(message, specialization, target = '') {
        try {
            if (!this._rewriterModel) {
                const { VertexAI } = require('@google-cloud/vertexai');
                const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
                const vertexAI = new VertexAI({
                    project: process.env.GOOGLE_CLOUD_PROJECT,
                    location: location
                });
                this._rewriterModel = vertexAI.getGenerativeModel({
                    model: 'gemini-2.5-flash-lite',
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 512,
                        responseMimeType: "application/json"
                    }
                });
            }

            const role = specialization === 'medicine'
                ? 'indexador médico experto. Extrae términos clínicos (diagnósticos, síntomas, fármacos, normas NTS/GPC).'
                : 'indexador pedagógico experto. Extrae términos del CNEB, RVM, RM, casuística docente y competencias.';

            const prompt = `Eres un ${role} 
            PREGUNTA DEL USUARIO: "${message}" 
            CONTEXTO/TARGET: ${target}
            Responde SOLO JSON: {"terms": ["término1", "término2", ...]}`;

            const result = await this._rewriterModel.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }]
            });

            const rawText = result.response.candidates[0].content.parts[0].text;
            // Limpieza robusta de JSON
            const cleanJson = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
            const parsed = JSON.parse(cleanJson);

            return parsed.terms || [];
        } catch (error) {
            console.warn("⚠️ Rewriter IA falló (RagService). Usando fallback heurístico.");
            // Fallback: extraer palabras clave significativas sin stop words ni caracteres de formato
            const cleaned = String(message || '').replace(/[^\w\sáéíóúÁÉÍÓÚñÑ]/g, ' ');
            const stopWords = new Set([
                'modo', 'tutor', 'simulador', 'examen', 'para', 'como', 'sobre', 'este', 
                'esta', 'estos', 'estas', 'cual', 'quien', 'donde', 'cuando', 'porque', 
                'pregunta', 'respuesta', 'estudiante', 'opcion', 'clave', 'eres'
            ]);
            return cleaned.split(/\s+/)
                .map(w => w.trim())
                .filter(w => w.length > 3 && !stopWords.has(w.toLowerCase()))
                .slice(0, 5);
        }
    }

    /**
     * Normaliza los namespaces hacia los identificadores canónicos de Pinecone.
     * Soporta nombres en español e inglés sin fallos silenciosos.
     */
    normalizeNamespace(rawNamespace) {
        if (!rawNamespace) return 'general';
        const ns = String(rawNamespace).toLowerCase().trim();
        if (['educacion', 'educación', 'docente', 'education', 'cneb', 'minedu'].includes(ns)) {
            return 'education';
        }
        if (['medicina', 'salud', 'clinica', 'clínica', 'medicine', 'minsa', 'essalud'].includes(ns)) {
            return 'medicine';
        }
        return ns || 'general';
    }

    /**
     * Limpia nombres de archivo para generar títulos legibles de recursos.
     */
    _cleanResourceTitle(rawTitle, rawSource, defaultLabel = 'Biblioteca Especializada') {
        const candidate = rawTitle || rawSource || defaultLabel;
        return candidate
            .replace(/\.pdf$/i, '')
            .replace(/[-_]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Genera un embedding para la búsqueda semántica.
     * Sincronizado con: text-multilingual-embedding-002
     */
    async _getEmbedding(text) {
        try {
            resolveGoogleAuthOptions('RagService');
            const client = await this._auth.getClient();
            const tokenRes = await client.getAccessToken();
            const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
            const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/${location}/publishers/google/models/text-multilingual-embedding-002:predict`;

            const response = await axios.post(url, {
                instances: [{ content: text.trim(), task_type: "RETRIEVAL_QUERY" }]
            }, {
                headers: { 'Authorization': `Bearer ${tokenRes.token}`, 'Content-Type': 'application/json' }
            });

            return response.data.predictions[0].embeddings.values;
        } catch (error) {
            console.error("❌ Error en Vectorización (Vertex AI):", error.message);
            return null;
        }
    }

    /**
     * searchContextSmart: Ruta principal de búsqueda vectorial.
     */
    async searchContextSmart(queryText, limit = 10, filters = {}) {
        const specialization = filters.specialization || 'general';
        const namespace = this.normalizeNamespace(filters.namespace || specialization);
        const target = (filters.target || "").toUpperCase();

        console.log(`🔍 RAG V6.5 [SEMANTIC | NS: ${namespace}]: "${queryText.substring(0, 40)}..."`);

        // 1. Optimizar términos de búsqueda (Usar predefinidos si existen para evitar doble llamada a IA)
        const smartTerms = filters.predefinedTerms || await this.extractSmartTerms(queryText, specialization, target);
        const enhancedQuery = (smartTerms && smartTerms.length > 0) ? smartTerms.join(' ') : queryText;

        // 2. Ejecutar Búsqueda en Pinecone
        return this._executeSemanticSearch(enhancedQuery, limit, target, namespace);
    }

    /**
     * Ejecuta la consulta a Pinecone.
     */
    async _executeSemanticSearch(query, limit, target, namespace) {
        const host = this.pineconeHost;
        const key = this.pineconeKey;
        const activeNamespace = this.normalizeNamespace(namespace);

        if (!host || !key) {
            console.warn(`⚠️ [RagService] PINECONE_HOST o PINECONE_API_KEY no configurados. Omitiendo búsqueda vectorial.`);
            return this._formatResults([], activeNamespace);
        }

        try {
            const vector = await this._getEmbedding(query);
            if (!vector) return this._formatResults([], activeNamespace);

            const response = await axios.post(`https://${host}/query`, {
                vector: vector,
                topK: limit,
                includeMetadata: true,
                namespace: activeNamespace
            }, {
                headers: { 'Api-Key': key, 'Content-Type': 'application/json' }
            });

            const matches = response.data.matches || [];
            // Filtrar fragmentos con score irrelevante si el score existe
            const validMatches = matches.filter(m => (m.score === undefined || m.score === null || m.score >= 0.35));

            const results = validMatches.map(m => ({
                content: m.metadata.text || m.metadata.content || '',
                metadata: m.metadata || {},
                score: m.score
            }));

            console.log(`✨ Pinecone [${activeNamespace}]: ${results.length} fragmentos recuperados (filtrados de ${matches.length}).`);
            return this._formatResults(results, activeNamespace);
        } catch (error) {
            console.error(`❌ Error crítico en Pinecone [${activeNamespace}]:`, error.message);
            return this._formatResults([], activeNamespace);
        }
    }

    /**
     * Formatea los resultados según el dominio extrayendo fuentes y páginas estructuradas.
     */
    _formatResults(results, namespace) {
        const labels = {
            'medicine': 'Fuente Médica Oficial (MINSA / GPC)',
            'education': 'Biblioteca Magisterial Oficial (MINEDU / CNEB)'
        };
        const domainLabel = labels[namespace] || 'Biblioteca Especializada';

        if (!results || results.length === 0) {
            const emptyResult = {
                text: "",
                contextText: "",
                sources: [],
                matchesCount: 0,
                toString() { return ""; }
            };
            return emptyResult;
        }

        const seenSources = new Map();
        const seenContents = new Set();
        const formattedChunks = [];

        results.forEach((res) => {
            const rawContent = (res.content || '').trim();
            if (!rawContent) return;

            // Deduplicar fragmentos con contenido sustancialmente idéntico
            const contentHash = rawContent.substring(0, 120);
            if (seenContents.has(contentHash)) return;
            seenContents.add(contentHash);

            const title = this._cleanResourceTitle(res.metadata?.title, res.metadata?.source, domainLabel);
            const rawPage = res.metadata?.page;
            const pageNum = (rawPage !== undefined && rawPage !== null && !isNaN(Number(rawPage)))
                ? Number(rawPage)
                : null;
            const pageStr = pageNum ? ` (Pág. ${pageNum})` : '';

            // Agrupar fuentes únicas estructuradas
            const sourceKey = `${title}|${pageNum || '0'}`;
            if (!seenSources.has(sourceKey)) {
                seenSources.set(sourceKey, {
                    fuente: title,
                    title: title,
                    pagina: pageNum || 'No especificada',
                    page: pageNum,
                    source: res.metadata?.source || null,
                    score: res.score || 0
                });
            }

            const chunkIndex = formattedChunks.length + 1;
            formattedChunks.push(`--- FUENTE ${chunkIndex}: [${title}${pageStr}] ---\n${rawContent}\n`);
        });

        const formattedText = formattedChunks.join('\n');
        const uniqueSources = Array.from(seenSources.values());

        const resultObj = {
            text: formattedText,
            contextText: formattedText,
            sources: uniqueSources,
            matchesCount: formattedChunks.length,
            toString() { return formattedText; }
        };

        return resultObj;
    }
}

module.exports = new RagService();