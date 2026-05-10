const db = require('../../infrastructure/database/db');
const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');

/**
 * 🚀 RAG SERVICE V6.1: Motor Vectorial Puro (Pinecone + Vertex AI)
 * - Eliminado FTS local (PostgreSQL) para centralizar en búsqueda semántica.
 * - Agentic Rewriter Multi-Dominio (Medicina / Educación).
 * - Sincronizado con text-multilingual-embedding-002 (768 dim).
 */
class RagService {
    constructor() {
        this._rewriterModel = null;
        this._auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
        
        this.PINECONE_HOST = process.env.PINECONE_HOST;
        this.PINECONE_KEY = process.env.PINECONE_API_KEY;
        
        console.log("✅ RagService V6.1: Motor Híbrido (Pinecone) inicializado.");
    }

    /**
     * 🧠 AGENTIC REWRITER MULTI-DOMINIO: Optimiza la búsqueda según la especialidad.
     */
    async _extractSmartTerms(message, specialization, target = '') {
        try {
            if (!this._rewriterModel) {
                const { VertexAI } = require('@google-cloud/vertexai');
                const vertexAI = new VertexAI({ 
                    project: process.env.GOOGLE_CLOUD_PROJECT, 
                    location: process.env.GOOGLE_CLOUD_LOCATION 
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

            const parsed = JSON.parse(result.response.candidates[0].content.parts[0].text);
            return parsed.terms || [];
        } catch (error) {
            console.warn("⚠️ Rewriter IA falló. Usando mensaje original.");
            return null;
        }
    }

    /**
     * Genera un embedding para la búsqueda semántica.
     * Sincronizado con: text-multilingual-embedding-002
     */
    async _getEmbedding(text) {
        try {
            const client = await this._auth.getClient();
            const tokenRes = await client.getAccessToken();
            const url = `https://${process.env.GOOGLE_CLOUD_LOCATION}-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/${process.env.GOOGLE_CLOUD_LOCATION}/publishers/google/models/text-multilingual-embedding-002:predict`;

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
        const namespace = filters.namespace || specialization;
        const target = (filters.target || "").toUpperCase();

        console.log(`🔍 RAG V6.1 [SEMANTIC | NS: ${namespace}]: "${queryText.substring(0, 40)}..."`);

        // 1. Optimizar términos de búsqueda según el dominio
        const smartTerms = await this._extractSmartTerms(queryText, specialization, target);
        const enhancedQuery = smartTerms ? smartTerms.join(' ') : queryText;

        // 2. Ejecutar Búsqueda en Pinecone
        return this._executeSemanticSearch(enhancedQuery, limit, target, namespace);
    }

    /**
     * Ejecuta la consulta a Pinecone.
     */
    async _executeSemanticSearch(query, limit, target, namespace) {
        try {
            const vector = await this._getEmbedding(query);
            if (!vector) return "";

            const response = await axios.post(`https://${this.PINECONE_HOST}/query`, {
                vector: vector,
                topK: limit,
                includeMetadata: true,
                namespace: namespace
            }, {
                headers: { 'Api-Key': this.PINECONE_KEY, 'Content-Type': 'application/json' }
            });

            const matches = response.data.matches || [];
            const results = matches.map(m => ({
                content: m.metadata.text || m.metadata.content,
                metadata: m.metadata,
                score: m.score
            }));

            console.log(`✨ Pinecone [${namespace}]: ${results.length} fragmentos recuperados.`);
            return this._formatResults(results, namespace);
        } catch (error) {
            console.error(`❌ Error crítico en Pinecone [${namespace}]:`, error.message);
            return "";
        }
    }

    /**
     * Formatea los resultados según el dominio.
     */
    _formatResults(results, namespace) {
        if (!results || results.length === 0) return "";
        const labels = {
            'medicine': 'Fuente Médica',
            'education': 'Biblioteca Magisterial',
            'languages': 'Language Hub'
        };
        const domainLabel = labels[namespace] || 'Biblioteca Especializada';

        return results.map((res, index) => {
            const title = res.metadata?.title || res.metadata?.source || domainLabel;
            const page = res.metadata?.page ? ` (Pág. ${res.metadata.page})` : '';
            return `--- FUENTE ${index + 1}: [${title}${page}] ---\n${res.content}\n`;
        }).join('\n');
    }
}

module.exports = new RagService();