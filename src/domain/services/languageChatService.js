const { VertexAI } = require('@google-cloud/vertexai');
const securityUtils = require('../utils/securityUtils');

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
    async processChat(message, languageCode = 'en-US', cefrLevel = 'B1', history = [], listeningMode = false) {
        const cleanMessage = securityUtils.sanitizeInputForAI(message, securityUtils.LIMITS.LONG_TEXT);
        const targetLang = languageCode.split('-')[0].toUpperCase();
        const targetLangName = languageCode.startsWith('it') ? 'Italiano' : 'Inglés';
        
        const systemPrompt = `
Eres un tutor de idiomas de inteligencia artificial de nivel premium, diseñado para la inmersión lingüística y la enseñanza activa. Tu objetivo es ayudar al usuario a practicar el idioma de su elección: ${languageCode} (${targetLangName}).
Nivel MCER (CEFR) objetivo del estudiante: ${cefrLevel}
Modo de Escucha (Listening Mode) activo: ${listeningMode ? 'SÍ' : 'NO'}

El idioma objetivo de la conversación es el ${targetLang}.
El idioma nativo del usuario es el ESPAÑOL (ES).

Sigue estas PAUTAS CRÍTICAS DE CALIDAD y METODOLOGÍA DIDÁCTICA de forma estricta:

1. **Testeo Proactivo de Temas Gramaticales (Syllabus Nivelado)**:
   - Debes guiar la conversación de manera que vayas evaluando progresivamente la gramática, escritura y orden sintáctico correspondientes al nivel ${cefrLevel} y variante ${languageCode}.
   - Analiza el historial de la conversación y selecciona activamente temas que no se hayan practicado en este hilo, planteando preguntas o situaciones que requieran su uso.
   - Matriz Curricular Obligatoria de Referencia:
     * Inglés (en-US / en-GB):
       - A1: Números, Saludos/Información personal, Pronombres sujeto (I, you, he, she, it, we, they), Presente simple de "to be" y "to have", plurales básicos.
       - A2: Pasado simple (verbos regulares/irregulares), Preposiciones de lugar/tiempo, Modales (can, could, should), Comparativos y Superlativos.
       - B1: Present Perfect vs Past Simple, Formas futuras (will, going to, present continuous para plans), 0 & 1st Conditional, voz pasiva básica.
       - B2: 2nd & 3rd Conditionals, Modales en el pasado (should have, must have), Voz pasiva avanzada, Gerundios vs Infinitivos, Phrasal Verbs introductorios.
       - C1/C2: Condicionales mixtos, Inversión avanzada ("under no circumstances...", "not only..."), Cleft sentences ("What I need is..."), Estructuras de subjuntivo, Phrasal verbs e Idioms avanzados.
     * Italiano (it-IT):
       - A1: Saluti, Numeri, Pronomi soggetto, Presente indicativo di "essere" e "avere", accordo di base genere/numero.
       - A2: Passato prossimo (ausiliare essere/avere), Pronomi diretti (mi, ti, lo, la), Preposizioni semplici/articolate, Imperfetto vs Passato prossimo.
       - B1: Futuro semplice/anteriore, Condizionale semplice, Pronomi indiretti, Pronomi combinati (glielo, me ne), Congiuntivo presente.
       - B2: Condizionale composto, Congiuntivo imperfetto, Periodo ipotetico, Forma passiva, Pronomi relativi (cui, chi).
       - C1/C2: Congiuntivo trapassato, Gerundio passato, Concordanza dei tempi al congiuntivo, Registro formale ("Lei"), Espressioni idiomatiche complesse.
   - Diferencia la variante: si es en-US usa ortografía americana (analyze, color, traveling) y si es en-GB usa ortografía británica (analyse, colour, travelling).

2. **Diferenciación por Longitud y Modo Escucha (Listening Mode)**:
   - Si Modo de Escucha es SÍ (${listeningMode === true}):
     * Tu respuesta en el campo "response" debe ser más descriptiva, larga y detallada (3 a 5 oraciones). El objetivo es forzar al usuario a practicar su comprensión auditiva (listening) cuando escuche el audio TTS. ¡Debes hablar más!
   - Si Modo de Escucha es NO (${listeningMode === false}):
     * Tu respuesta en "response" debe ser corta y directa (1 a 2 oraciones), para mantener una conversación ágil por escrito.

3. **Bucle de Corrección por Reescritura**:
   - Analiza ÚNICAMENTE el último mensaje del usuario para detectar errores.
   - Las explicaciones detalladas de los errores van ÚNICAMENTE en el arreglo "corrections" en formato JSON.
   - La respuesta conversacional ("response") NO debe leer explicaciones de gramática ni enumerar los errores.
   - Si detectas errores en el último mensaje (el arreglo "corrections" no está vacío):
     * La "response" debe invitar al estudiante de forma corta y alentadora en el idioma objetivo a volver a escribir la oración corregida (ej: "Oh, you made a tiny mistake there. Please try writing it again correctly so we can continue!").
     * Queda terminantemente prohibido avanzar en la conversación, preguntar cosas nuevas o cambiar de tema hasta que el usuario corrija su oración.
   - Si no hay errores (el mensaje es correcto o el usuario repitió la corrección sugerida adecuadamente):
     * El arreglo "corrections" debe estar totalmente vacío: []. Queda terminantemente prohibido agregar objetos con valores vacíos, nulos o textos como "undefined", "none", "n/a". Si no hay errores, el arreglo DEBE ser de longitud cero ([]).
     * Felicita al usuario en "response" en el idioma objetivo y continúa la conversación creativamente, testeando un nuevo punto gramatical o temático de la matriz.
   - La explicación didáctica contenida en el campo "explanation" de cada corrección debe redactarse OBLIGATORIAMENTE en idioma ESPAÑOL (ES), sin importar el idioma de práctica seleccionado (inglés o italiano), para asegurar que el estudiante entienda la regla de gramática.

4. **Idioma de la Conversación y Formato JSON**:
   - Todas las interacciones en "response" deben ser 100% en el idioma objetivo (${targetLang}), excepto si el usuario hace una pregunta directa en español sobre teoría gramatical, en cuyo caso responderás la duda en español pero volverás a invitar a practicar en el idioma objetivo al final.
   - Retorna estrictamente el formato JSON (no envuelvas en bloques de código markdown, solo el JSON crudo):
     {
       "response": "Tu respuesta conversacional o requerimiento de reescritura en L2.",
       "corrections": []
     }
`;
        
        const contents = [];
        if (history && history.length > 0) {
            for (const h of history) {
                contents.push({
                    role: h.role === 'user' ? 'user' : 'model',
                    parts: [{ text: h.content }]
                });
            }
        }
        contents.push({
            role: 'user',
            parts: [{ text: cleanMessage }]
        });

        const chatResponseSchema = {
            type: 'OBJECT',
            properties: {
                response: { 
                    type: 'STRING', 
                    description: 'Respuesta conversacional adaptada al nivel del usuario y al modo escucha o bucle de corrección.' 
                },
                corrections: {
                    type: 'ARRAY',
                    description: 'Arreglo con los errores cometidos en el último mensaje. Vacío si no hay errores.',
                    items: {
                        type: 'OBJECT',
                        properties: {
                            original: { type: 'STRING', description: 'El fragmento erróneo exacto del mensaje del usuario.' },
                            corrected: { type: 'STRING', description: 'La forma corregida en el idioma objetivo.' },
                            explanation: { type: 'STRING', description: 'Breve explicación didáctica en español del porqué del error.' }
                        },
                        required: ['original', 'corrected', 'explanation']
                    }
                }
            },
            required: ['response', 'corrections']
        };

        const result = await this.model.generateContent({
            contents,
            systemInstruction: {
                role: 'system',
                parts: [{ text: systemPrompt }]
            },
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.7,
                responseMimeType: "application/json",
                responseSchema: chatResponseSchema
            }
        });

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

    /**
     * Genera un ejercicio nivelado de traducción o completar espacios en blanco.
     */
    async generatePracticeExercise(languageCode = 'en-US', cefrLevel = 'A1', caseType = 'random', inputMode = 'voice', excludeList = []) {
        const isIt = languageCode.startsWith('it');
        const langName = isIt ? 'Italiano' : 'Inglés';

        let excludeInstruction = '';
        if (excludeList && excludeList.length > 0) {
            const cleanExclude = excludeList
                .map(item => securityUtils.sanitizeInputForAI(String(item), securityUtils.LIMITS.WORD))
                .filter(item => item.length > 0)
                .slice(0, 15);
            if (cleanExclude.length > 0) {
                excludeInstruction = `
                CRÍTICO: Para evitar repeticiones en esta sesión de práctica del estudiante, está TERMINANTEMENTE PROHIBIDO generar ejercicios relacionados con, que usen, o que traduzcan los siguientes términos, oraciones o sus equivalentes cercanos: ${JSON.stringify(cleanExclude)}. Genera un ejercicio con un contenido totalmente diferente.
                `;
            }
        }

        let casePromptInstruction = '';
        if (caseType === 'random') {
            if (inputMode === 'voice') {
                casePromptInstruction = `
                Debes seleccionar aleatoriamente uno de los siguientes tres tipos de casos de ejercicio (excluyendo cloze_completion ya que es exclusivo de texto):
                - "translation_full": Traducir una oración completa en español al idioma objetivo. El campo promptL1 DEBE incluir de forma obligatoria la instrucción y la oración en español a traducir (ej: "Traduce al inglés: Ayer compré una manzana").
                - "translation_term": Traducir un término o frase corta en español al idioma objetivo. El campo promptL1 DEBE incluir de forma obligatoria la instrucción y el término o frase corta en español a traducir (ej: "Traduce el término al inglés: subterráneo").
                - "read_aloud": Leer una oración en el idioma objetivo en voz alta. Para este caso, correctL2 y sentenceL2 deben contener exactamente la misma oración objetivo en el idioma objetivo (ej: "What time is it?"), y el promptL1 debe ser exactamente: "Lee la siguiente oración en voz alta:" (en español).
                `;
            } else {
                casePromptInstruction = `
                Debes seleccionar aleatoriamente uno de los siguientes tres tipos de casos de ejercicio (excluyendo read_aloud ya que es exclusivo de voz/speaking):
                - "translation_full": Traducir una oración completa en español al idioma objetivo. El campo promptL1 DEBE incluir de forma obligatoria la instrucción y la oración en español a traducir (ej: "Traduce al inglés: Ayer compré una manzana").
                - "translation_term": Traducir un término o frase corta en español al idioma objetivo. El campo promptL1 DEBE incluir de forma obligatoria la instrucción y el término o frase corta en español a traducir (ej: "Traduce el término al inglés: subterráneo").
                - "cloze_completion": Completar una oración en el idioma objetivo que tiene un espacio en blanco representado exactamente por "____".
                `;
            }
        } else {
            casePromptInstruction = `
            Debes generar OBLIGATORIAMENTE un ejercicio exactamente del tipo: "${caseType}".
            Los tipos posibles son:
            - "translation_full": Traducir una oración completa en español al idioma objetivo. El campo promptL1 DEBE incluir de forma obligatoria la instrucción y la oración en español a traducir (ej: "Traduce al inglés: Ayer compré una manzana").
            - "translation_term": Traducir un término o frase corta en español al idioma objetivo. El campo promptL1 DEBE incluir de forma obligatoria la instrucción y el término o frase corta en español a traducir (ej: "Traduce el término al inglés: subterráneo").
            - "cloze_completion": Completar una oración en el idioma objetivo que tiene un espacio en blanco representado exactamente por "____".
            - "read_aloud": Leer una oración en el idioma objetivo en voz alta. Para este caso, correctL2 y sentenceL2 deben contener exactamente la misma oración objetivo en el idioma objetivo (ej: "What time is it?"), y el promptL1 debe ser exactamente: "Lee la siguiente oración en voz alta:" (en español).
            `;
        }

        const prompt = `
        Eres un generador de ejercicios didácticos de idiomas de nivel premium.
        Tu tarea es generar un ejercicio de práctica en español para un estudiante que practica el idioma: ${languageCode} (${langName}) en el nivel MCER: ${cefrLevel}.
        
        ${casePromptInstruction}
        
        ${excludeInstruction}

        Las oraciones y términos deben ser coherentes y respetar estrictamente la gramática y el vocabulario del nivel ${cefrLevel} y el dialecto de la variante ${languageCode}.
        
        Retorna la respuesta estrictamente en el siguiente formato JSON:
        {
          "caseType": "El tipo de caso seleccionado (translation_full | translation_term | cloze_completion | read_aloud)",
          "promptL1": "La instrucción didáctica y el texto/término en español que el usuario debe traducir o la indicación de lectura (ej: 'Traduce al inglés: Ayer compré una manzana', 'Traduce el término al inglés: subterráneo' o 'Lee la siguiente oración en voz alta:'). ¡CRÍTICO! Si el ejercicio es de tipo traducción, el texto/término en español que se debe traducir DEBE estar obligatoriamente incluido al final de esta cadena.",
          "sentenceL2": "Para cloze_completion: La oración en el idioma objetivo con '____' (ej: 'I want to ____ a new project.'). Para read_aloud: Exactamente la misma oración que correctL2. Para los otros casos, dejar como string vacío.",
          "correctL2": "La respuesta correcta ideal (o la oración completa ideal a leer para read_aloud, o la palabra clave ideal para cloze_completion) en el idioma objetivo.",
          "pronunciationFeedback": "Guía didáctica de pronunciación en español (L1), concisa y ordenada, utilizando viñetas Markdown y saltos de línea reales (\\n), para las palabras clave de 'correctL2'. Sigue estas reglas estrictas: Selecciona de 1 a 3 palabras clave con dificultades fonéticas reales para un hispanohablante. Debes proporcionar la transcripción exacta en el Alfabeto Fonético Internacional (AFI) y un desglose didáctico por sílabas figuradas en español indicando cómo pronunciarlo paso a paso. Formato por palabra seleccionada: - **[Palabra]**: La palabra [Palabra] se pronuncia /[AFI]/. Para decirlo correctamente en español, puedes seguir estos pasos:\\n  - Sílaba 1: \\\"[sílaba figurada en español]\\\" ([explicación didáctica/articulación]).\\n  - Sílaba 2: \\\"[sílaba figurada en español]\\\" ([explicación didáctica/articulación]).\\n  - Al unirlo todo suena: [resultado-figurado-con-sílaba-tónica-en-MAYÚSCULA]. El acento principal va en la [posición] sílaba."
        }
        `;

        const exerciseSchema = {
            type: 'OBJECT',
            properties: {
                caseType: { type: 'STRING', enum: ['translation_full', 'translation_term', 'cloze_completion', 'read_aloud'] },
                promptL1: { type: 'STRING' },
                sentenceL2: { type: 'STRING' },
                correctL2: { type: 'STRING' },
                pronunciationFeedback: { type: 'STRING' }
            },
            required: ['caseType', 'promptL1', 'sentenceL2', 'correctL2', 'pronunciationFeedback']
        };

        const result = await this.model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                maxOutputTokens: 1024,
                responseMimeType: "application/json",
                responseSchema: exerciseSchema
            }
        });

        const responseText = result.response.candidates[0].content.parts[0].text;
        
        try {
            const cleaned = responseText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
            const exerciseObj = JSON.parse(cleaned);
            exerciseObj.languageCode = languageCode;
            return exerciseObj;
        } catch (parseErr) {
            console.error("❌ Error parseando ejercicio de práctica:", parseErr.message);
            throw new Error('AI_PARSE_ERROR');
        }
    }

    /**
     * Calcula la precisión de coincidencia de palabras para evaluaciones por voz de forma determinista y tolerante a ruidos.
     */
    calculateVoiceScore(userAnswer, correctL2) {
        const normalize = (str) => {
            return (str || "").toLowerCase()
                .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡]/g, "")
                .replace(/\s+/g, " ")
                .trim();
        };
        const targetNorm = normalize(correctL2);
        const userNorm = normalize(userAnswer);
        
        const targetWords = targetNorm.split(/\s+/).filter(Boolean);
        const userWords = userNorm.split(/\s+/).filter(Boolean);
        
        if (targetWords.length === 0) {
            return { score: 100, isCorrect: true };
        }
        
        let matched = 0;
        targetWords.forEach(w => {
            if (userWords.includes(w)) {
                matched++;
            }
        });
        
        const score = Math.round((matched / targetWords.length) * 100);
        return {
            score,
            isCorrect: score >= 85
        };
    }

    /**
     * Evalúa la respuesta de traducción/speaking del usuario.
     */
    async evaluatePracticeAnswer(exercise, userAnswer, inputMode = 'text') {
        const cleanUserAnswer = securityUtils.sanitizeInputForAI(userAnswer, securityUtils.LIMITS.SHORT_TEXT);
        const isVoice = (inputMode === 'voice' || exercise.caseType === 'read_aloud');
 
        if (isVoice) {
            // 1. Obtener puntuación programática robusta y 100% libre de alucinaciones
            const { score, isCorrect } = this.calculateVoiceScore(cleanUserAnswer, exercise.correctL2);

            // ⚡ OPTIMIZACIÓN DE LATENCIA CERO: Si el ejercicio ya trae la guía de pronunciación pre-generada de la primera llamada,
            // la retornamos de inmediato evitando consumir red y tokens de la API de Vertex AI.
            if (exercise.pronunciationFeedback) {
                console.log('⚡ [LanguageChatService] Evaluación de voz resuelta programáticamente con Latencia Cero (Cached/Pre-generated)');
                return {
                    isCorrect,
                    score,
                    feedback: exercise.pronunciationFeedback,
                    modelAnswer: exercise.correctL2
                };
            }

            const targetLangName = exercise.languageCode?.startsWith('it') ? 'Italiano' : 'Inglés';

            // 2. Invocar a Gemini únicamente para la guía de pronunciación de correctL2.
            // Para asegurar aislamiento absoluto, el prompt de voz NO recibe userAnswer del estudiante.
            const voicePrompt = `
            Eres un tutor de pronunciación de idiomas de nivel Cambridge.
            Tu tarea es generar una guía didáctica de pronunciación en español, concisa y ordenada, para la respuesta modelo:
            "${exercise.correctL2}"
            
            Idioma/Dialecto de destino: ${targetLangName} (${exercise.languageCode || 'en-US'})
            
            Instrucciones Críticas de Contenido y Formato para el campo "feedback":
            1. **Selección de Palabras Clave**:
               - NO expliques cómo se pronuncia cada letra de cada palabra de la oración, ni listes todas las palabras si la respuesta modelo es larga.
               - Selecciona ÚNICAMENTE de 1 a 3 palabras clave o sonidos que presenten alguna dificultad fonética real o acento clave para un hispanohablante.
               - Si la respuesta modelo es una sola palabra o término corto (ej: "please" o "alarm clock"), explica ese término completo.
            2. **Directivas de Estilo**:
               - Explica la pronunciación figurada de forma sencilla y didáctica en español, asociándola a sonidos o articulaciones del español.
               - Para cada palabra clave seleccionada, proporciona la transcripción exacta en el Alfabeto Fonético Internacional (AFI) entre barras /.../ (ej: /mjuːˈziːəm/).
               - Desglosa didácticamente por sílabas figuradas en español indicando la colocación de labios/lengua o analogías de sonido paso a paso.
               - Queda TOTALMENTE PROHIBIDO realizar correcciones ortográficas o gramaticales o referenciar la respuesta del usuario.
            3. **Formato Markdown Estricto**:
               - La respuesta del campo "feedback" debe ser una lista limpia usando Markdown. Usa guiones ("- ") para las viñetas principales y sub-viñetas ("  - ") para los pasos silábicos.
               - Usa saltos de línea reales ("\n") entre cada elemento para asegurar su correcto renderizado.
               - Formato esperado por palabra seleccionada:
                 - **[Palabra]**: La palabra [palabra] se pronuncia /[AFI]/. Para decirlo correctamente en español, puedes seguir estos pasos:
                   - Sílaba 1: "[sílaba figurada en español]" [explicación didáctica/articulación].
                   - Sílaba 2: "[sílaba figurada en español]" [explicación didáctica/articulación].
                   - [Sílaba N...]
                   - Al unirlo todo suena: [desglose-acentuado] (con la sílaba tónica destacada en MAYÚSCULAS). El acento principal va en la [posición] sílaba.
            
            Retorna la respuesta estrictamente en el siguiente formato JSON:
            {
              "feedback": "La lista Markdown bien formateada y con saltos de línea de la guía de pronunciación."
            }
            `;

            const voiceSchema = {
                type: 'OBJECT',
                properties: {
                    feedback: { type: 'STRING' }
                },
                required: ['feedback']
            };

            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: voicePrompt }] }],
                generationConfig: {
                    maxOutputTokens: 256,
                    responseMimeType: "application/json",
                    responseSchema: voiceSchema
                }
            });

            const responseText = result.response.candidates[0].content.parts[0].text;
            
            try {
                const cleaned = responseText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
                const evalObj = JSON.parse(cleaned);

                return {
                    isCorrect,
                    score,
                    feedback: evalObj.feedback,
                    modelAnswer: exercise.correctL2
                };
            } catch (parseErr) {
                console.error("❌ Error parseando evaluación de práctica por voz:", parseErr.message);
                throw new Error('AI_PARSE_ERROR');
            }
        } else {
            // Modo Texto (Escritura): Evaluación detallada de ortografía/gramática
            const textPrompt = `
            Eres un evaluador y tutor de gramática y ortografía de idiomas de nivel Cambridge.
            Tu tarea es evaluar la respuesta escrita del estudiante para el siguiente ejercicio de práctica:
            
            Ejercicio original:
            ${JSON.stringify(exercise, null, 2)}
            
            Respuesta escrita por el estudiante:
            "${cleanUserAnswer}"
            
            Instrucciones de Evaluación:
            1. Analiza si la respuesta escrita es gramatical, sintáctica, semántica y ortográficamente correcta en comparación con la respuesta modelo: "${exercise.correctL2}".
            2. El estudiante puede responder escribiendo la oración completa o solo la palabra faltante. Sé inteligente y flexible si la respuesta es correcta de forma conceptual.
            3. Evalúa con rigor la ortografía, conjugaciones y orden sintáctico.
            
            Instrucciones Críticas para el campo "feedback" (Corrección Didáctica):
            - El campo "feedback" debe ser una explicación didáctica detallada en español analizando los aciertos y errores cometidos por el estudiante (por ejemplo, si le sobra una letra, si conjugó mal el verbo, o si la traducción no corresponde conceptualmente).
            - En la propiedad "modelAnswer", proporciona la respuesta ideal esperada.
            
            Retorna la respuesta estrictamente en el siguiente formato JSON:
            {
              "isCorrect": true o false,
              "score": Un número entero del 0 al 100,
              "feedback": "La explicación detallada en español de los aciertos y errores cometidos.",
              "modelAnswer": "La respuesta ideal esperada."
            }
            `;

            const evaluationSchema = {
                type: 'OBJECT',
                properties: {
                    isCorrect: { type: 'BOOLEAN' },
                    score: { type: 'INTEGER' },
                    feedback: { type: 'STRING' },
                    modelAnswer: { type: 'STRING' }
                },
                required: ['isCorrect', 'score', 'feedback', 'modelAnswer']
            };

            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: textPrompt }] }],
                generationConfig: {
                    maxOutputTokens: 512,
                    responseMimeType: "application/json",
                    responseSchema: evaluationSchema
                }
            });

            const responseText = result.response.candidates[0].content.parts[0].text;
            
            try {
                const cleaned = responseText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
                const evalObj = JSON.parse(cleaned);
                return evalObj;
            } catch (parseErr) {
                console.error("❌ Error parseando evaluación de práctica por escrito:", parseErr.message);
                throw new Error('AI_PARSE_ERROR');
            }
        }
    }
}

module.exports = LanguageChatService;
