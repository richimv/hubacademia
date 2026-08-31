const tutorAiService = require('../../src/domain/services/tutorAiService');
const mediaController = require('../../src/application/controllers/mediaController');

describe('TutorAiService - Multimodal Vision (Quiz & Flashcards)', () => {
    let mockDownload;
    let mockExists;

    beforeEach(() => {
        mockDownload = jest.fn().mockResolvedValue([Buffer.from('fake-image-bytes-webp')]);
        mockExists = jest.fn().mockResolvedValue([true]);

        jest.spyOn(mediaController.storage, 'bucket').mockReturnValue({
            file: jest.fn().mockReturnValue({
                exists: mockExists,
                download: mockDownload
            })
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('Extrae imágenes Base64 inline en el texto del mensaje', async () => {
        const fakeBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
        const rawText = `Mira este gráfico: data:image/png;base64,${fakeBase64} ¿Qué opinas?`;

        const result = await tutorAiService._extractMultimodalParts(rawText);

        expect(result.cleanedText).toContain('[Imagen Adjunta]');
        expect(result.parts).toHaveLength(1);
        expect(result.parts[0].inlineData.mimeType).toBe('image/png');
        expect(result.parts[0].inlineData.data).toBe(fakeBase64);
    });

    test('Resuelve imágenes de GCS desde el context en Quiz Tutor (imageUrl y caseImageUrl)', async () => {
        const rawText = 'Explícame esta pregunta de secundaria';
        const context = {
            type: 'quiz_tutor',
            questionText: '¿Cuál es el significado de la obra?',
            imageUrl: 'https://tutor-ia-backend.onrender.com/api/media/gcs?file=editor-content/pregunta1.webp',
            caseImageUrl: 'https://tutor-ia-backend.onrender.com/api/media/gcs?file=editor-content/caso1.webp'
        };

        const result = await tutorAiService._extractMultimodalParts(rawText, context);

        expect(result.parts).toHaveLength(2);
        expect(result.parts[0].inlineData.mimeType).toBe('image/webp');
        expect(result.parts[0].inlineData.data).toBe(Buffer.from('fake-image-bytes-webp').toString('base64'));
        expect(result.parts[1].inlineData.mimeType).toBe('image/webp');
    });

    test('Resuelve imágenes de GCS desde el context en Flashcard Tutor (imageUrl y explanationImageUrl)', async () => {
        const rawText = '¿Cómo se traduce esta tarjeta?';
        const context = {
            type: 'flashcard_tutor',
            deckCategory: 'Idiomas',
            front: '___ trousers are very nice.',
            back: 'These',
            imageUrl: 'flashcards/1777049044511-trousers.webp',
            explanationImageUrl: 'flashcards/1777049044511-explanation.webp'
        };

        const result = await tutorAiService._extractMultimodalParts(rawText, context);

        expect(result.parts).toHaveLength(2);
        expect(result.parts[0].inlineData.mimeType).toBe('image/webp');
        expect(result.parts[1].inlineData.mimeType).toBe('image/webp');
    });

    test('Extrae imágenes incrustadas dentro de etiquetas <img> en el HTML del enunciado o casuística', async () => {
        const rawText = 'Duda sobre la casuística';
        const context = {
            type: 'quiz_tutor',
            caseDescription: '<p>Observa la siguiente pintura:</p><img src="https://tutor-ia-backend.onrender.com/api/media/gcs?file=editor-content/arte08.webp" />',
            questionText: '<p>En la siguiente imagen:</p><img src="https://tutor-ia-backend.onrender.com/api/media/gcs?file=editor-content/arte08_detalle.png" />'
        };

        const result = await tutorAiService._extractMultimodalParts(rawText, context);

        expect(result.parts).toHaveLength(2);
        expect(result.parts[0].inlineData.mimeType).toBe('image/webp');
        expect(result.parts[1].inlineData.mimeType).toBe('image/png');
    });

    test('Deduplica imágenes para no enviar la misma referencia dos veces', async () => {
        const rawText = 'Duda sobre la imagen repetida';
        const context = {
            type: 'quiz_tutor',
            imageUrl: 'editor-content/misma_foto.webp',
            caseImageUrl: 'https://tutor-ia-backend.onrender.com/api/media/gcs?file=editor-content/misma_foto.webp'
        };

        const result = await tutorAiService._extractMultimodalParts(rawText, context);

        expect(result.parts).toHaveLength(1);
    });

    test('Respeta el límite de seguridad de máximo 4 imágenes por solicitud', async () => {
        const rawText = 'Muchas imágenes en el examen';
        const context = {
            type: 'quiz_tutor',
            imageUrl: 'editor-content/img1.webp',
            caseImageUrl: 'editor-content/img2.webp',
            explanationImageUrl: 'editor-content/img3.webp',
            caseDescription: '<img src="editor-content/img4.webp" /><img src="editor-content/img5.webp" /><img src="editor-content/img6.webp" />'
        };

        const result = await tutorAiService._extractMultimodalParts(rawText, context);

        expect(result.parts.length).toBeLessThanOrEqual(4);
    });

    test('Resiliencia ante fallos de descarga de GCS (continúa sin lanzar excepciones)', async () => {
        mockExists.mockResolvedValueOnce([false]); // La primera imagen no existe en GCS
        mockExists.mockResolvedValueOnce([true]);  // La segunda sí existe

        const rawText = 'Pregunta con imagen rota y válida';
        const context = {
            type: 'quiz_tutor',
            imageUrl: 'editor-content/inexistente.webp',
            caseImageUrl: 'editor-content/valida.webp'
        };

        const result = await tutorAiService._extractMultimodalParts(rawText, context);

        // Debe haber descargado únicamente la válida sin arrojar error fatal
        expect(result.parts).toHaveLength(1);
        expect(result.parts[0].inlineData.mimeType).toBe('image/webp');
    });
});
