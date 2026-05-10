const { VertexAI } = require('@google-cloud/vertexai');
const QuestionRagService = require('./questionRagService');
const genPrompts = require('../prompts/generationPrompts');

/**
 * 👑 ADMIN AI SERVICE (V6.2): Generación de Alta Fidelidad para Banco Oficial.
 * - Solo soporta ASCENSO (Educación) y SERUMS (Medicina).
 * - Utiliza Triple-RAG para mimetismo y sustento legal.
 */
class AdminAiService {
    constructor() {
        const project = process.env.GOOGLE_CLOUD_PROJECT;
        const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
        this.vertex_ai = new VertexAI({ project, location });
        this.model = this.vertex_ai.getGenerativeModel({
            model: 'gemini-2.5-flash-lite',
            generationConfig: {
                maxOutputTokens: 16384,
                temperature: 0.2, // Máxima fidelidad al molde RAG
                responseMimeType: "application/json"
            }
        });
    }

    /**
     * Generación masiva con validación de target.
     */
    async generateRAGQuestions(target, studyAreas, career, amount = 10) {
        // 🛡️ BARRERA ELIMINADA: Anteriormente solo se permitía ASCENSO y SERUMS.
        // Ahora el sistema es Universal RAG, por lo que permitimos todos los targets.
        const normalizedTarget = target.toUpperCase();

        try {
            const db = require('../../infrastructure/database/db');
            let areasArray = Array.isArray(studyAreas) ? studyAreas : studyAreas.split(',').map(a => a.trim());
            let allQuestions = [];

            console.log(`🚀 Iniciando Generación Premium V7.0 para ${normalizedTarget} (${amount} items)...`);
            console.log(`🧠 Memoria de Repetición: Cargando últimas 15 preguntas de la BD.`);

            // 🧠 MEMORIA DE LARGO PLAZO
            const lastQuestionsRes = await db.query(
                "SELECT question_text FROM question_bank WHERE target = $1 AND career = $2 ORDER BY created_at DESC LIMIT 15",
                [normalizedTarget, career]
            );
            const globalHistory = lastQuestionsRes.rows.map(r => r.question_text);

            let totalAttempts = 0;
            const maxAttempts = amount * 2; // Límite de seguridad para evitar bucles infinitos

            // Bucle de Garantía de Cuota: No paramos hasta tener el 'amount' deseado
            while (allQuestions.length < amount && totalAttempts < maxAttempts) {
                totalAttempts++;

                // Rotación de áreas temática basada en lo que ya tenemos generado con éxito
                const area = areasArray[allQuestions.length % areasArray.length];

                // Combinamos el historial global con lo generado en esta tanda
                const currentBatchHistory = allQuestions.map(q => q.question_text);
                const fullHistory = [...globalHistory, ...currentBatchHistory];

                console.log(`📝 [Generando ${allQuestions.length + 1}/${amount}] Área: ${area} (Intento: ${totalAttempts})`);

                const q = await this._generateSingleQuestion(normalizedTarget, area, career, fullHistory);

                if (q) {
                    allQuestions.push(q);
                    console.log(`✅ [Éxito] Pregunta añadida. Progreso: ${allQuestions.length}/${amount}`);
                } else {
                    console.warn(`⚠️ [Fallo] Intento fallido para la pregunta ${allQuestions.length + 1}. Reintentando con nuevas keywords...`);
                }

                // Pequeño delay para estabilidad de cuotas de API
                if (allQuestions.length < amount) {
                    await new Promise(r => setTimeout(r, 1200));
                }
            }

            if (allQuestions.length < amount) {
                console.warn(`🚨 [Atención] No se pudo completar la cuota total (${allQuestions.length}/${amount}) tras ${totalAttempts} intentos.`);
            }

            return allQuestions;
        } catch (error) {
            console.error('❌ Error en AdminAiService:', error.message);
            throw error;
        }
    }

    /**
     * Genera una sola pregunta usando Triple-RAG Context y memoria a corto plazo.
     */
    async _generateSingleQuestion(target, area, career, history = []) {
        try {
            const namespace = target === 'ASCENSO' || target === 'NOMBRAMIENTO' || target === 'ACCESO_CARGOS' ? 'education' : 'medicine';

            // 🧠 PASO 0: Generar términos de búsqueda (Sniper)
            const searchTerms = await this._generateSearchKeywords(target, area, career);
            const styleTerm = searchTerms[0];
            const sourceFile = searchTerms[2];
            console.log(`🔎 [Sniper-RAG] Apuntando a: ${styleTerm}`);

            // 🧠 PASO 1: Obtener Temas del Temario y Molde de Estilo (Paralelo Inicial)
            const [styleContext, syllabusContext] = await Promise.all([
                QuestionRagService.getStyleContextByKeywords(namespace, [styleTerm], 15, sourceFile),
                QuestionRagService.getSyllabusContext(namespace, career, area)
            ]);

            // 🧠 PASO 2: INVESTIGACIÓN ESPECÍFICA (RAG EN CADENA)
            // Extraemos términos clave del temario para buscar la base técnica exacta
            const syllabusKeywords = this._extractKeywordsFromSyllabus(syllabusContext, area);
            console.log(`📚 [Investigación] Buscando base técnica para: ${syllabusKeywords}`);
            
            const [supportContext, techBasis] = await Promise.all([
                QuestionRagService.getStyleContextByKeywords(namespace, [searchTerms[1]], 3),
                QuestionRagService.getTechnicalBasis(namespace, area, `${syllabusKeywords} ${target}`, 5)
            ]);

            const fullContext = {
                style: styleContext,
                support: supportContext,
                basis: techBasis,
                syllabus: syllabusContext
            };

            // Extraemos el número de pregunta para que la IA sepa qué buscar en los fragmentos RAG
            const targetQuestionMatch = styleTerm.match(/Pregunta (\d+)/);
            const targetQuestionNum = targetQuestionMatch ? targetQuestionMatch[1] : null;

            // Inyectamos el prompt desde el catálogo central
            const prompt = genPrompts.getAdminPrompt(target, area, career, fullContext, history, targetQuestionNum);
            const result = await this.model.generateContent(prompt);
            const responseText = result.response.candidates[0].content.parts[0].text;
            const initialQuestion = JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '').trim());

            // 🧠 PASO 3: REFINAMIENTO (FILTRO DE CALIDAD FINAL)
            console.log(`⚖️ [Auditoría] Refinando pregunta p/ simetría y limpieza...`);
            const refinementPrompt = genPrompts.buildRefinementPrompt(initialQuestion);
            const refinedResult = await this.model.generateContent(refinementPrompt);
            const refinedText = refinedResult.response.candidates[0].content.parts[0].text;

            return JSON.parse(refinedText.replace(/```json/g, '').replace(/```/g, '').trim());
        } catch (error) {
            console.error(`⚠️ Error en generación admin p/ ${area}:`, error.message);
            return null;
        }
    }

    /**
     * Extrae palabras clave del texto del temario para la búsqueda en cascada.
     */
    _extractKeywordsFromSyllabus(text, defaultArea) {
        if (!text) return defaultArea;
        // Limpiamos el texto y tomamos algunas palabras clave representativas (no todas)
        // Eliminamos palabras comunes y conectores
        const words = text.split(/\s+/)
            .filter(w => w.length > 4)
            .filter(w => !['FRAGMENTO', 'TEMARIO', 'OFICIAL', 'FUENTE'].includes(w.toUpperCase()))
            .slice(0, 10); // Tomamos las primeras 10 palabras relevantes
        
        return words.length > 0 ? words.join(' ') : defaultArea;
    }

    /**
     * 🔎 SNIPER RAG: Genera términos de búsqueda directos y aleatorios.
     * En lugar de pedirle a la IA, el código elige una "Pregunta Objetivo" (1-60).
     */
    async _generateSearchKeywords(target, area, career) {
        try {
            const isEducation = ['ASCENSO', 'NOMBRAMIENTO', 'ACCESO_CARGOS'].includes(target);
            const maxQuestions = isEducation ? 60 : 100;
            const randomQuestionNum = Math.floor(Math.random() * maxQuestions) + 1;
            const years = ["2025", "2024"];
            const year = years[Math.floor(Math.random() * years.length)];

            if (isEducation) {
                const parts = career.split(' - ');
                const nivel = (parts[1] || "").trim();
                const rawSpecialty = (parts[parts.length - 1] || "").trim();

                // Normalización robusta para nombres de archivos PDF
                const especialidad = rawSpecialty
                    .replace(/Profesor de /gi, '')
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
                    .replace(/ /g, '_');

                // Si la especialidad es igual al nivel (ej. Inicial - Inicial), no la repetimos
                const especialidadSuffix = (especialidad.toLowerCase() === nivel.toLowerCase()) ? "" : `_${especialidad}`;

                const normalizedTarget = target.charAt(0).toUpperCase() + target.slice(1).toLowerCase();
                const sourceFile = `Prueba_${normalizedTarget}_EBR_${nivel}${especialidadSuffix}_${year}.pdf`;

                // 1. Sniper Term (Style) | 2. Knowledge Term | 3. Hard Filter (Filename)
                return [
                    `Prueba ${normalizedTarget} EBR ${nivel} ${especialidad} Año ${year} Pregunta ${randomQuestionNum}`,
                    `${area} ${nivel} ${especialidad} casuística enfoque pedagógico`,
                    sourceFile
                ];
            } else {
                // Medicina (ENAM/SERUMS/RESIDENTADO) - Sniper RAG de Alta Precisión
                const isNursing = career.toLowerCase().includes('enfermeria');
                const careerTag = isNursing ? 'enfermeria' : 'medicina';
                
                // Mapeo de archivos reales para SERUMS
                let sourceFile = null;
                if (target === 'SERUMS') {
                    const pool = isNursing 
                        ? ["SERUMS-enfermeria.pdf", "SERUMS-enfermeria-tipo-a.pdf", "SERUMS-enfermeria-tipo-b.pdf"]
                        : ["SERUMS-medicina.pdf", "SERUMS-medicina-tipo-a.pdf", "SERUMS-medicina-tipo-b.pdf", "SERUMS_SIMULACRO1_MEDICINA_MEDIPLUS.pdf", "SERUMS_BANCO_PREGUNTAS_EXAMEN_2025-I_TheoMed.pdf"];
                    
                    sourceFile = pool[Math.floor(Math.random() * pool.length)];
                }

                const styleTerm = `${target} ${careerTag} Pregunta ${randomQuestionNum}`;
                
                return [
                    styleTerm,
                    `${area} ${careerTag} casuística manejo clínico oficial`,
                    sourceFile // Filtro duro si existe
                ];
            }
        } catch (error) {
            console.error("❌ Error en Sniper Keywords:", error.message);
            return [`${target} ${career} ${area}`];
        }
    }
}

module.exports = new AdminAiService();
