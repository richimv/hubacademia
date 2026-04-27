const db = require('../../infrastructure/database/db');
const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');

/**
 * 🚀 RAG SERVICE V6 (HÍBRIDO MAESTRO):
 * Soporta dos rutas de búsqueda según la necesidad del servicio:
 * 1. SEMANTIC (Pinecone): Alta precisión para Chat del Usuario (Usa Embeddings).
 * 2. FTS (PostgreSQL): Costo $0 para Generación Masiva / Admin (Usa Lexicografía).
 * + Agentic Rewriter Médico integrado para ambas rutas.
 */
class RagService {
    constructor() {
        this._rewriterModel = null;
        this._auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
        
        this.PINECONE_HOST = process.env.PINECONE_HOST;
        this.PINECONE_KEY = process.env.PINECONE_API_KEY;
        
        console.log("✅ RagService V6: Motor Híbrido (Semantic/FTS) inicializado.");
    }

    /**
     * 🧠 AGENTIC REWRITER MÉDICO: Traduce lenguaje de usuario a términos clínicos.
     * Esencial para que el RAG encuentre fragmentos técnicos exactos.
     */
    async _extractSmartTerms(message, target = '') {
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

            const prompt = `Eres un indexador médico experto. Extrae términos clínicos (diagnósticos, síntomas, fármacos, normas) para buscar en libros de Harrison/GPC/NTS. 
            PREGUNTA: "${message}" 
            ENFOQUE: ${target}
            Responde SOLO JSON: {"terms": ["término1", "término2", ...]}`;

            const result = await this._rewriterModel.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }]
            });

            const parsed = JSON.parse(result.response.candidates[0].content.parts[0].text);
            return parsed.terms || [];
        } catch (error) {
            console.warn("⚠️ Rewriter IA falló. Fallback a extracción mecánica.");
            return null;
        }
    }

    /**
     * Genera un embedding para la búsqueda semántica.
     */
    async _getEmbedding(text) {
        try {
            const client = await this._auth.getClient();
            const tokenRes = await client.getAccessToken();
            const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/us-central1/publishers/google/models/text-embedding-004:predict`;

            const response = await axios.post(url, {
                instances: [{ content: text.trim() }]
            }, {
                headers: { 'Authorization': `Bearer ${tokenRes.token}`, 'Content-Type': 'application/json' }
            });

            return response.data.predictions[0].embeddings.values;
        } catch (error) {
            console.error("❌ Error en Vectorización:", error.message);
            return null;
        }
    }

    /**
     * 🚀 MÉTODO PRINCIPAL: searchContextSmart
     * Detecta automáticamente si usar Semantic o FTS según la disponibilidad y configuración.
     */
    async searchContextSmart(queryText, limit = 10, filters = {}) {
        const mode = filters.mode || 'SEMANTIC';
        const target = (filters.target || "").toUpperCase();
        
        // 🎯 ESTRATEGIA DE NAMESPACES: medicine, languages, education, general
        const namespace = filters.namespace || 'medicine';

        console.log(`🔍 RAG V6 [${mode} | NS: ${namespace}]: Procesando "${queryText.substring(0, 40)}..."`);

        // 1. Extraer términos inteligentes (Rewriter) para mejorar la búsqueda
        const smartTerms = await this._extractSmartTerms(queryText, target);
        const enhancedQuery = smartTerms ? smartTerms.join(' ') : queryText;

        // 2. Ejecutar según el modo solicitado
        if (mode === 'SEMANTIC' && this.PINECONE_HOST) {
            return this._executeSemanticSearch(enhancedQuery, limit, target, namespace);
        } else {
            return this._executeFtsSearch(enhancedQuery, limit, target);
        }
    }

    /**
     * RUTA A: Búsqueda Semántica (Pinecone)
     * @private
     */
    async _executeSemanticSearch(query, limit, target, namespace) {
        try {
            const vector = await this._getEmbedding(query);
            if (!vector) return this._executeFtsSearch(query, limit, target);

            const response = await axios.post(`https://${this.PINECONE_HOST}/query`, {
                vector: vector,
                topK: limit,
                includeMetadata: true,
                namespace: namespace // Inyección dinámica del namespace
            }, {
                headers: { 'Api-Key': this.PINECONE_KEY, 'Content-Type': 'application/json' }
            });

            const matches = response.data.matches || [];
            const results = matches.map(m => ({
                content: m.metadata.content,
                metadata: m.metadata,
                score: m.score
            }));

            console.log(`✨ Pinecone [${namespace}]: ${results.length} fragmentos recuperados.`);
            return this._formatResults(results, target);
        } catch (error) {
            console.error(`❌ Error en Pinecone [${namespace}]. Cayendo a FTS...`);
            return this._executeFtsSearch(query, limit, target);
        }
    }

    /**
     * RUTA B: Búsqueda FTS (Postgres - Gratis)
     * @private
     */
    async _executeFtsSearch(query, limit, target) {
        try {
            // Verificación preventiva: Si no hay tabla documents, devolvemos vacío para no romper el flujo
            const tableCheck = await db.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'documents')");
            if (!tableCheck.rows[0].exists) {
                console.warn("⚠️ Tabla 'documents' no encontrada. Fallback FTS omitido.");
                return "";
            }

            // Limpieza y preparación para tsquery
            const words = query.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3).slice(0, 10);
            const tsQuery = words.join(' | ');

            if (!tsQuery) return "";

            const sql = `
                SELECT content, metadata,
                       ts_rank(fts, (to_tsquery('spanish', $1) || to_tsquery('english', $1))) as rank
                FROM documents
                WHERE fts @@ (to_tsquery('spanish', $1) || to_tsquery('english', $1))
                ORDER BY 
                    CASE 
                        WHEN $2 = 'SERUMS' AND (metadata::text ILIKE '%NTS%' OR metadata::text ILIKE '%RM%') THEN 1
                        WHEN $2 = 'ENAM' AND (metadata::text ILIKE '%GPC%') THEN 1
                        ELSE 2
                    END ASC,
                    rank DESC
                LIMIT $3;
            `;
            const res = await db.query(sql, [tsQuery, target, limit]);
            console.log(`📁 FTS Local: ${res.rows.length} fragmentos recuperados ($0 cost).`);
            return this._formatResults(res.rows, target);
        } catch (error) {
            console.error("❌ Error en FTS Local (Tabla eliminada o error):", error.message);
            return "";
        }
    }

    /**
     * Formatea los resultados respetando la jerarquía y el target.
     */
    _formatResults(results, target) {
        if (!results || results.length === 0) return "";
        return results.map((res, index) => {
            const source = res.metadata?.title || res.metadata?.folder || 'Fuente Médica';
            return `--- FUENTE ${index + 1}: [${source}] ---\n${res.content}\n`;
        }).join('\n');
    }

    /**
     * Ejemplos de estilo Few-Shot (Mantiene la mimetización del examen real).
     */
    async getStyleExamples(career = 'medicina', limit = 2) {
        try {
            // Verificación: Si la tabla documents fue eliminada, retornar vacío
            const tableCheck = await db.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'documents')");
            if (!tableCheck.rows[0].exists) return "";

            const pattern = `%SERUMS-${career.toLowerCase()}%`;
            const query = `SELECT content FROM documents WHERE metadata::text ILIKE $1 ORDER BY RANDOM() LIMIT $2`;
            const res = await db.query(query, [pattern, limit]);
            return res.rows.map(r => r.content).join('\n\n---\n\n');
        } catch (error) {
            return "";
        }
    }
}

module.exports = new RagService();