const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');

/**
 * 🎯 QUESTION RAG SERVICE (V1.2 - MINEDU/MINSA Precision)
 * Especializado en proveer contexto para la generación de preguntas.
 * CAZADOR DE ESTILOS: Mapeo exacto de nombres de archivos oficiales.
 */
class QuestionRagService {
    constructor() {
        this._auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
        this.PINECONE_HOST = process.env.PINECONE_HOST;
        this.PINECONE_KEY = process.env.PINECONE_API_KEY;
        this.PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
        this.LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
    }

    async _getEmbedding(text) {
        try {
            const client = await this._auth.getClient();
            const tokenRes = await client.getAccessToken();
            const url = `https://${this.LOCATION}-aiplatform.googleapis.com/v1/projects/${this.PROJECT_ID}/locations/${this.LOCATION}/publishers/google/models/text-multilingual-embedding-002:predict`;
            const response = await axios.post(url, {
                instances: [{ content: text.trim(), task_type: "RETRIEVAL_QUERY" }]
            }, {
                headers: { 'Authorization': `Bearer ${tokenRes.token}`, 'Content-Type': 'application/json' }
            });
            return response.data.predictions[0].embeddings.values;
        } catch (error) {
            console.error("❌ QuestionRagService: Error en Vectorización:", error.message);
            return null;
        }
    }

    /**
     * Obtiene contexto de estilo basado en keywords específicas.
     */
    async getStyleContextByKeywords(namespace, keywords, topK = 5, sourceFilter = null) {
        console.log(`🎭 [Agentic-RAG] Iniciando búsqueda con ${keywords.length} términos. Filtro: ${sourceFilter || 'Ninguno'}`);
        
        try {
            const searches = keywords.map(async (kw) => {
                const vector = await this._getEmbedding(kw);
                if (!vector) return [];

                const filter = { source: { "$exists": true } };
                if (sourceFilter) {
                    filter.source = { "$eq": sourceFilter };
                }

                const response = await axios.post(`https://${this.PINECONE_HOST}/query`, {
                    vector: vector,
                    topK: 50, // Aumentamos la muestra para encontrar el número específico
                    includeMetadata: true,
                    namespace: namespace,
                    filter: filter
                }, {
                    headers: { 'Api-Key': this.PINECONE_KEY, 'Content-Type': 'application/json' }
                });
                return response.data.matches || [];
            });

            const resultsArray = await Promise.all(searches);
            const allMatches = resultsArray.flat();

            // 🎯 DETECCIÓN DE NÚMERO OBJETIVO
            const targetKw = keywords.join(' ');
            const numMatch = targetKw.match(/Pregunta (\d+)/);
            const targetNum = numMatch ? numMatch[1] : null;

            // 🔍 FILTRADO DE CALIDAD, DESDUPLICACIÓN Y PRIORIZACIÓN
            const seenTexts = new Set();
            const prioritized = [];
            const others = [];

            for (const m of allMatches) {
                const text = m.metadata.text || "";
                const cleanText = text.toUpperCase();
                
                // Bloqueo de ruido administrativo
                if (['INSTRUCCIONES', 'FICHA DE RESPUESTAS', 'PUNTAJE', 'DURACIÓN'].some(w => cleanText.includes(w))) continue;

                // Desduplicación por texto
                const snippet = cleanText.substring(0, 100);
                if (seenTexts.has(snippet)) continue;
                seenTexts.add(snippet);

                // PRIORIZACIÓN POR NÚMERO (Si existe el número objetivo)
                if (targetNum && (text.includes(`Pregunta ${targetNum}`) || text.includes(`Pág. ${targetNum}`) || text.match(new RegExp(`^\\s*${targetNum}\\s*`, 'm')))) {
                    prioritized.push(m);
                } else {
                    others.push(m);
                }
            }

            // Tomamos los resultados finales
            let selected = [];
            if (targetNum && prioritized.length > 0) {
                console.log(`🎯 [Sniper-RAG] ¡ÉXITO! Encontrada coincidencia exacta para la Pregunta ${targetNum}.`);
                selected = prioritized.slice(0, topK);
            } else {
                if (targetNum) console.warn(`⚠️ [Sniper-RAG] No se encontró el número ${targetNum} en los fragmentos, usando relevancia semántica.`);
                selected = others
                    .sort(() => 0.5 - Math.random()) 
                    .slice(0, topK);
            }

            console.log(`✅ [Agentic-RAG] Éxito: ${selected.length} moldes únicos capturados.`);

            return selected.map(m => {
                const source = m.metadata.source || 'Examen Oficial';
                return `--- EVIDENCIA REAL (${source}) ---\n${m.metadata.text || ''}\n`;
            }).join('\n\n');

        } catch (error) {
            console.error("❌ Error en getStyleContextByKeywords:", error.message);
            return "";
        }
    }

    /**
     * getTechnicalBasis: Busca en Normas, Currículos y Leyes.
     * Prioriza fragmentos con alto valor normativo (Leyes, NTS, CNEB).
     */
    async getTechnicalBasis(namespace, area, topic = '', limit = 4) {
        console.log(`📚 [TechBasis] Sustento para: ${area} - ${topic}`);
        const queryText = `Documentación oficial, leyes, normativa técnica y fundamentos de ${area} ${topic}`;
        const vector = await this._getEmbedding(queryText);
        if (!vector) return "";

        try {
            const response = await axios.post(`https://${this.PINECONE_HOST}/query`, {
                vector: vector,
                topK: 25,
                includeMetadata: true,
                namespace: namespace
            }, {
                headers: { 'Api-Key': this.PINECONE_KEY, 'Content-Type': 'application/json' }
            });

            const matches = response.data.matches || [];

            // 1. Excluimos exámenes
            // 2. Priorizamos Leyes/NTS/CNEB/Reglamentos
            const isLaw = (name) => ['LEY', 'NORMA', 'NTS', 'REGLAMENTO', 'CNEB', 'PROGRAMA_CURRICULAR', 'GPC', 'MARCO', 'RVM', 'DECRETO', 'TEMARIO'].some(p => name.includes(p));

            const prioritizedMatches = matches
                .filter(m => {
                    const src = (m.metadata.source || "").toUpperCase();
                    return !['PRUEBA_', 'SERUMS_', 'ENAM_', 'SIMULACRO_', 'BANCO_'].some(p => src.includes(p));
                })
                .sort((a, b) => {
                    const aIsLaw = isLaw((a.metadata.source || "").toUpperCase());
                    const bIsLaw = isLaw((b.metadata.source || "").toUpperCase());
                    if (aIsLaw && !bIsLaw) return -1;
                    if (!aIsLaw && bIsLaw) return 1;
                    return 0;
                })
                .slice(0, limit);

            return prioritizedMatches.map((m, i) => {
                const type = isLaw((m.metadata.source || "").toUpperCase()) ? "MARCO LEGAL" : "TEORÍA";
                return `--- ${type} ${i + 1} [Fuente: ${m.metadata.source}] ---\n${m.metadata.text || m.metadata.content}\n`;
            }).join('\n');
        } catch (error) {
            return "";
        }
    }

    /**
     * getSyllabusContext: Búsqueda exacta en los archivos Temario_EBR_...
     */
    async getSyllabusContext(namespace, career = '', subtopic = '') {
        const cleanCareer = career.toUpperCase().replace('EBR - ', '').trim();
        const queryText = `Temario oficial MINEDU ${cleanCareer} ${subtopic}`;
        const vector = await this._getEmbedding(queryText);
        if (!vector) return "";

        try {
            const response = await axios.post(`https://${this.PINECONE_HOST}/query`, {
                vector: vector,
                topK: 20, // Buscamos más para filtrar
                includeMetadata: true,
                namespace: namespace
            }, {
                headers: { 'Api-Key': this.PINECONE_KEY, 'Content-Type': 'application/json' }
            });

            // Filtramos y priorizamos archivos de TEMARIO del nivel correcto
            const syllabusMatches = (response.data.matches || [])
                .filter(m => {
                    const src = (m.metadata.source || "").toUpperCase();
                    return src.includes('TEMARIO_') && (cleanCareer ? src.includes(cleanCareer) : true);
                })
                .slice(0, 5); // Enviamos hasta 5 fragmentos del temario

            if (syllabusMatches.length === 0) return "";

            return syllabusMatches.map((m, i) => {
                return `--- TEMARIO OFICIAL FRAGMENTO ${i + 1} [${m.metadata.source}] ---\n${m.metadata.text || m.metadata.content}\n`;
            }).join('\n');
        } catch (error) {
            console.error("❌ Error en getSyllabusContext:", error.message);
            return "";
        }
    }
}

module.exports = new QuestionRagService();
