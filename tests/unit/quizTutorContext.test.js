/**
 * Tests unitarios para el Tutor IA de Simulador de Examen (Quiz Tutor)
 * Valida la normalización de opciones, formateo de contexto y construcción de prompts.
 */

describe('Quiz Tutor Context Normalization & Prompt Construction', () => {

    function buildQuizTutorInstruction(context, message, finalSpecialization = 'education') {
        const examDomain = String(context.examDomain || context.examContext || (finalSpecialization === 'education' ? 'EDUCACION' : 'MEDICINA')).toUpperCase();
        const target = context.target || (examDomain === 'EDUCACION' ? 'ASCENSO' : 'SERUMS');
        const career = context.career || 'No especificada';
        const difficulty = context.difficulty || 'Senior';
        const topic = context.topic || context.area || 'General';
        const areas = (context.areas && Array.isArray(context.areas) && context.areas.length > 0) 
            ? context.areas.join(', ') 
            : topic;

        // 1. Normalización segura de opciones de respuesta
        let rawOptions = context.options || [];
        if (typeof rawOptions === 'string') {
            try {
                const parsed = JSON.parse(rawOptions);
                if (Array.isArray(parsed)) rawOptions = parsed;
            } catch (e) {
                rawOptions = [rawOptions];
            }
        }
        let safeOptions = [];
        if (Array.isArray(rawOptions)) {
            safeOptions = rawOptions.map(opt => typeof opt === 'string' ? opt : (opt?.text || opt?.option || JSON.stringify(opt)));
        } else if (typeof rawOptions === 'object' && rawOptions !== null) {
            safeOptions = Object.values(rawOptions).map(opt => typeof opt === 'string' ? opt : (opt?.text || opt?.option || JSON.stringify(opt)));
        }

        // 2. Normalización de pregunta
        const questionText = (context.questionText || context.question_text || context.question || '').trim();

        // 3. Normalización de clave oficial e intento del estudiante
        const correctIdx = (context.correctOptionIndex !== null && context.correctOptionIndex !== undefined && !isNaN(Number(context.correctOptionIndex)))
            ? Number(context.correctOptionIndex)
            : null;
        
        const userIdx = (context.userOptionIndex !== null && context.userOptionIndex !== undefined && !isNaN(Number(context.userOptionIndex)))
            ? Number(context.userOptionIndex)
            : (context.userAnswer !== null && context.userAnswer !== undefined && !isNaN(Number(context.userAnswer)))
                ? Number(context.userAnswer)
                : null;

        const correctLetter = correctIdx !== null ? String.fromCharCode(65 + correctIdx) : 'N/A';
        const correctText = (correctIdx !== null && safeOptions[correctIdx]) ? safeOptions[correctIdx] : (context.correctOptionText || 'No especificada');

        const userLetter = userIdx !== null ? String.fromCharCode(65 + userIdx) : null;
        const userText = (userIdx !== null && safeOptions[userIdx]) ? safeOptions[userIdx] : (context.userOptionText || null);
        const isUserCorrect = Boolean(context.isUserCorrect || (userIdx !== null && correctIdx !== null && userIdx === correctIdx));

        // 4. Formatear opciones para el prompt
        let optionsFormatted = '';
        if (safeOptions.length > 0) {
            optionsFormatted = safeOptions.map((opt, i) => `  [${String.fromCharCode(65 + i)}] ${opt}`).join('\n');
        } else {
            optionsFormatted = '  (No se proporcionaron opciones cerradas para este reactivo)';
        }

        // 5. Casuística / Situación compartida / Apoyo visual
        let caseSection = '';
        if (context.caseDescription || context.caseTitle || context.caseTableHtml || context.caseImageUrl) {
            caseSection = `\nCASUÍSTICA / SITUACIÓN COMPARTIDA:\n${context.caseTitle ? `Título: ${context.caseTitle}\n` : ''}${context.caseDescription || ''}${context.caseTableHtml ? `\nTabla / Datos de Apoyo:\n${context.caseTableHtml}\n` : ''}${context.caseImageUrl ? `\nImagen de Casuística: ${context.caseImageUrl}\n` : ''}`;
        }

        let visualSupportSection = '';
        if (context.imageUrl) {
            visualSupportSection = `\nIMAGEN DE APOYO EN LA PREGUNTA: ${context.imageUrl}`;
        }

        // 6. Información de respuesta del estudiante
        let studentSelectionInfo = '- RESPUESTA SELECCIONADA POR EL ESTUDIANTE: El estudiante aún no ha marcado una alternativa (o está consultando antes de responder).';
        if (userLetter !== null) {
            studentSelectionInfo = `- RESPUESTA SELECCIONADA POR EL ESTUDIANTE: Opción [${userLetter}] (${userText || ''}) -> ${isUserCorrect ? '✅ Correcta' : '❌ Incorrecta'}`;
        }

        return `[MODO: TUTOR DE SIMULADOR DE EXAMEN]
Eres un tutor de élite de Hub Academia especializado en ${examDomain === 'EDUCACION' ? 'Currículo Nacional, Didáctica y Casuística Pedagógica (MINEDU / CNEB)' : 'Medicina Peruana, Normas Técnicas MINSA, GPC y Diagnóstico Clínico'}.
El estudiante está interactuando con este reactivo en un simulacro interactivo y tiene una duda sobre su resolución, la clave o el sustento.

CONFIGURACIÓN DE EXAMEN Y CONTEXTO DEL ALUMNO:
- DOMINIO ACADÉMICO: ${examDomain}
- EXAMEN OBJETIVO (TARGET): ${target}
- NIVEL / ESPECIALIDAD (CAREER): ${career}
- DIFICULTAD CONFIGURADA: ${difficulty}
- ÁREA O TEMA: ${topic}
- ÁREAS SELECCIONADAS EN LA PRUEBA: ${areas}${caseSection}

DETALLES COMPLETOS DEL REACTIVO DEL SIMULADOR:
- ENUNCIADO DE LA PREGUNTA:\n${questionText || 'Pregunta del simulacro'}${visualSupportSection}

- OPCIONES DE RESPUESTA:\n${optionsFormatted}

- CLAVE CORRECTA OFICIAL: Opción [${correctLetter}] (${correctText})
${studentSelectionInfo}
- EXPLICACIÓN / SUSTENTO OFICIAL DE LA CLAVE:\n${context.explanation || 'No especificada en el banco'}

DIRECTRICES CLAVE PARA EL TUTOR:
1. Explica con claridad, rigor pedagógico y didáctica por qué la clave correcta [${correctLetter}] es la opción acertada.
2. Analiza las alternativas cuando sea pertinente para despejar dudas y reforzar el aprendizaje del alumno.
3. 🚨 TIENES ACCESO COMPLETO AL REACTIVO Y A SUS OPCIONES. NUNCA digas que no te proporcionaron las opciones ni la pregunta.

---
PREGUNTA O DUDA DEL ESTUDIANTE:
${message}`;
    }

    test('should include all options formatted as [A], [B], [C] in the prompt', () => {
        const mockContext = {
            type: 'quiz_tutor',
            questionText: '¿Cuál es la acción pertinente?',
            options: ['Opción 1', 'Opción 2', 'Opción 3'],
            correctOptionIndex: 1,
            correctOptionText: 'Opción 2',
            userOptionIndex: 0,
            userOptionText: 'Opción 1',
            isUserCorrect: false,
            explanation: 'Sustento oficial',
            topic: 'Evaluación'
        };
        const res = buildQuizTutorInstruction(mockContext, 'Detalles');
        expect(res).toContain('[A] Opción 1');
        expect(res).toContain('[B] Opción 2');
        expect(res).toContain('[C] Opción 3');
        expect(res).toContain('RESPUESTA SELECCIONADA POR EL ESTUDIANTE: Opción [A]');
        expect(res).toContain('❌ Incorrecta');
        expect(res).toContain('TIENES ACCESO COMPLETO AL REACTIVO Y A SUS OPCIONES');
    });

    test('should handle stringified JSON options', () => {
        const mockContext = {
            type: 'quiz_tutor',
            questionText: 'Paciente con dolor...',
            options: JSON.stringify(['Nitroglicerina', 'Aspirina']),
            correctOptionIndex: 1,
            examContext: 'MEDICINA'
        };
        const res = buildQuizTutorInstruction(mockContext, 'Medicina', 'medicine');
        expect(res).toContain('[A] Nitroglicerina');
        expect(res).toContain('CLAVE CORRECTA OFICIAL: Opción [B] (Aspirina)');
    });

    test('should handle userOptionIndex = 0 and correctOptionIndex = 0 properly', () => {
        const mockContext = {
            type: 'quiz_tutor',
            questionText: 'Pregunta 1',
            options: ['Opción A', 'Opción B'],
            correctOptionIndex: 0,
            userOptionIndex: 0,
            isUserCorrect: true
        };
        const res = buildQuizTutorInstruction(mockContext, 'Consulta');
        expect(res).toContain('CLAVE CORRECTA OFICIAL: Opción [A] (Opción A)');
        expect(res).toContain('RESPUESTA SELECCIONADA POR EL ESTUDIANTE: Opción [A] (Opción A) -> ✅ Correcta');
    });

    test('should include case scenario, data table and image when provided', () => {
        const mockContext = {
            type: 'quiz_tutor',
            questionText: 'A partir de la tabla...',
            options: ['30 estudiantes', '24 estudiantes'],
            correctOptionIndex: 0,
            caseTitle: 'Encuesta de Dinosaurios',
            caseDescription: 'La docente organizó los datos en una tabla.',
            caseTableHtml: '<table><tr><th>Dinosaurio</th></tr></table>',
            imageUrl: 'https://storage.googleapis.com/hubacademia/dinos.png'
        };
        const res = buildQuizTutorInstruction(mockContext, 'Explica');
        expect(res).toContain('Título: Encuesta de Dinosaurios');
        expect(res).toContain('La docente organizó los datos en una tabla.');
        expect(res).toContain('Tabla / Datos de Apoyo:');
        expect(res).toContain('IMAGEN DE APOYO EN LA PREGUNTA: https://storage.googleapis.com/hubacademia/dinos.png');
    });
});
