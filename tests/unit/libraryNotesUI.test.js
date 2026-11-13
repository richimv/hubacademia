describe('RepasoNotesUI Unit Tests', () => {
    test('El método openNoteEditor debe inicializar el estado en modo edición cuando se llama sin noteId', () => {
        const { RepasoNotesUI } = require('../../src/presentation/public/js/ui/repasoNotesUI');

        const dummyDocument = {
            getElementById: jest.fn((id) => ({
                id,
                value: 'test',
                style: {},
                classList: { add: jest.fn(), remove: jest.fn(), contains: jest.fn().mockReturnValue(true) },
                innerHTML: '',
                addEventListener: jest.fn(),
                focus: jest.fn()
            })),
            body: {
                classList: { add: jest.fn(), remove: jest.fn() },
                appendChild: jest.fn()
            },
            querySelector: jest.fn().mockReturnValue(null),
            querySelectorAll: jest.fn().mockReturnValue([]),
            addEventListener: jest.fn(),
            createElement: jest.fn(() => ({ innerHTML: '', firstElementChild: {} }))
        };

        global.document = dummyDocument;
        global.window = {
            libraryService: { getLibraryData: () => ({ notes: [] }) },
            escapeHtml: (s) => s,
            AppConfig: { API_URL: '' },
            NetworkService: { fetch: jest.fn() }
        };

        const instance = new RepasoNotesUI();
        expect(typeof instance.openNoteModal).toBe('function');
        expect(typeof instance.openNoteEditor).toBe('function');

        const editorSpy = jest.spyOn(instance, 'openNoteEditor').mockImplementation(() => {});
        instance.openNoteModal();
        expect(editorSpy).toHaveBeenCalledWith(null);

        instance.openNoteModal('note-123');
        expect(editorSpy).toHaveBeenCalledWith('note-123');
    });

    test('saveNote deshabilita botones, muestra spinner y restaura el estado original al finalizar', async () => {
        const { RepasoNotesUI } = require('../../src/presentation/public/js/ui/repasoNotesUI');

        const saveBtn = { id: 'note-modal-save', disabled: false, innerHTML: 'Guardar' };
        const cancelBtn = { id: 'note-modal-cancel', disabled: false, innerHTML: 'Cancelar' };
        const titleInput = { id: 'note-editor-title', value: 'Título de prueba' };
        const textareaInput = { id: 'note-editor-textarea', value: 'Contenido de prueba' };

        const elements = {
            'note-modal-save': saveBtn,
            'note-modal-cancel': cancelBtn,
            'note-editor-title': titleInput,
            'note-editor-textarea': textareaInput,
            'note-modal-overlay': { classList: { remove: jest.fn() } }
        };

        global.document = {
            getElementById: jest.fn(id => elements[id] || null),
            querySelector: jest.fn().mockReturnValue(null),
            querySelectorAll: jest.fn().mockReturnValue([]),
            body: { classList: { remove: jest.fn(), add: jest.fn() }, appendChild: jest.fn() }
        };

        let capturedDisabledDuringFetch = null;
        let capturedHtmlDuringFetch = null;

        global.window = {
            AppConfig: { API_URL: 'http://test' },
            NetworkService: {
                fetch: jest.fn().mockImplementation(async () => {
                    capturedDisabledDuringFetch = saveBtn.disabled;
                    capturedHtmlDuringFetch = saveBtn.innerHTML;
                    return { ok: true };
                })
            },
            uiManager: {
                showToast: jest.fn(),
                popModalState: jest.fn()
            },
            escapeHtml: s => s
        };

        const instance = new RepasoNotesUI();
        instance.service = { loadFullLibrary: jest.fn().mockResolvedValue({ notes: [] }), getLibraryData: () => ({ notes: [] }) };

        await instance.saveNote();

        expect(capturedDisabledDuringFetch).toBe(true);
        expect(capturedHtmlDuringFetch).toContain('fa-spinner');
        expect(capturedHtmlDuringFetch).toContain('Guardando...');

        expect(saveBtn.disabled).toBe(false);
        expect(saveBtn.innerHTML).toBe('Guardar');
        expect(cancelBtn.disabled).toBe(false);
    });

    test('deleteNote deshabilita el botón, muestra spinner y restaura el estado original al finalizar', async () => {
        const { RepasoNotesUI } = require('../../src/presentation/public/js/ui/repasoNotesUI');

        const deleteBtn = { id: 'note-modal-delete', disabled: false, innerHTML: 'Eliminar' };
        const elements = {
            'note-modal-delete': deleteBtn,
            'note-modal-overlay': { classList: { remove: jest.fn() } }
        };

        global.document = {
            getElementById: jest.fn(id => elements[id] || null),
            querySelector: jest.fn().mockReturnValue(null),
            querySelectorAll: jest.fn().mockReturnValue([]),
            body: { classList: { remove: jest.fn(), add: jest.fn() }, appendChild: jest.fn() }
        };

        let capturedDisabledDuringFetch = null;
        let capturedHtmlDuringFetch = null;

        global.window = {
            AppConfig: { API_URL: 'http://test' },
            confirmationModal: {
                show: jest.fn().mockResolvedValue(true)
            },
            NetworkService: {
                fetch: jest.fn().mockImplementation(async () => {
                    capturedDisabledDuringFetch = deleteBtn.disabled;
                    capturedHtmlDuringFetch = deleteBtn.innerHTML;
                    return { ok: true };
                })
            },
            uiManager: {
                showToast: jest.fn(),
                popModalState: jest.fn()
            },
            escapeHtml: s => s
        };

        const instance = new RepasoNotesUI();
        instance.service = { loadFullLibrary: jest.fn().mockResolvedValue({ notes: [] }), getLibraryData: () => ({ notes: [] }) };

        await instance.deleteNote('note-123');

        expect(capturedDisabledDuringFetch).toBe(true);
        expect(capturedHtmlDuringFetch).toContain('fa-spinner');
        expect(capturedHtmlDuringFetch).toContain('Eliminando...');

        expect(deleteBtn.disabled).toBe(false);
        expect(deleteBtn.innerHTML).toBe('Eliminar');
    });
});
