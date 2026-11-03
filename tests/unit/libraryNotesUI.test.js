const fs = require('fs');
const path = require('path');

describe('Repaso y Notas Unificados + Simplificación de Biblioteca', () => {
    let repasoNotesJs;
    let repasoHtml;
    let libraryJs;
    let libraryHtml;

    beforeAll(() => {
        repasoNotesJs = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/js/ui/repasoNotesUI.js'), 'utf8');
        repasoHtml = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/repaso.html'), 'utf8');
        libraryJs = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/js/ui/libraryUI.js'), 'utf8');
        libraryHtml = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/library.html'), 'utf8');
    });

    test('repaso.html integra la vista unificada de Mis Notas y carga repasoNotesUI.js', () => {
        expect(repasoHtml).toContain('id="notes-view"');
        expect(repasoHtml).toContain('data-repaso-view="notes"');
        expect(repasoHtml).toContain('/js/ui/repasoNotesUI.js');
    });

    test('library.html elimina Guardados, Favoritos y Notas, y redirige ?tab=notes a /repaso?view=notes', () => {
        expect(libraryHtml).not.toContain('id="panel-saved"');
        expect(libraryHtml).not.toContain('id="panel-favorites"');
        expect(libraryHtml).not.toContain('id="panel-notes"');
        expect(libraryHtml).not.toContain('class="library-tabs');
        expect(libraryHtml).toContain('/repaso?view=notes');
        expect(libraryJs).toContain('/repaso?view=notes');
    });

    test('El archivo repasoNotesUI.js debe definir explícitamente el método openNoteModal en la clase RepasoNotesUI', () => {
        expect(repasoNotesJs).toContain('openNoteModal(noteId = null)');
    });

    test('openNoteModal debe delegar la ejecución directamente a openNoteEditor', () => {
        expect(repasoNotesJs).toMatch(/openNoteModal\s*\(\s*noteId\s*=\s*null\s*\)\s*\{\s*this\.openNoteEditor\(noteId\);\s*\}/);
    });

    test('Los botones de creación de nota en repasoNotesUI.js deben invocar window.repasoNotesUI.openNoteModal() sin errores', () => {
        expect(repasoNotesJs).toContain('onclick="window.repasoNotesUI.openNoteModal()"');
    });

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

    test('La modal de notas debe cumplir con el Estándar Universal (4 capas)', () => {
        expect(repasoNotesJs).toContain('modal-overlay note-modal-overlay');
        expect(repasoNotesJs).toContain('modal-content note-modal');
        expect(repasoNotesJs).toContain('modal-header note-modal-header');
        expect(repasoNotesJs).toContain('modal-body note-modal-body');
        expect(repasoNotesJs).toContain('modal-footer note-modal-footer');
        expect(repasoNotesJs).toContain('modal-close-btn note-modal-close');
    });

    test('El footer de la modal de notas NO debe contener botones sueltos fuera de los grupos de acción', () => {
        const footerMatch = repasoNotesJs.match(/<div class="modal-footer note-modal-footer">([\s\S]*?)<\/div>\s*<\/div>\s*`;/);
        expect(footerMatch).not.toBeNull();
        const footerContent = footerMatch[1];

        const withoutGroups = footerContent
            .replace(/<div id="note-view-actions"[\s\S]*?<\/div>/, '')
            .replace(/<div id="note-edit-actions"[\s\S]*?<\/div>/, '')
            .trim();

        expect(withoutGroups).not.toContain('<button');
    });

    test('El grupo de edición debe contener exactamente Cancelar y Guardar con clases estándar', () => {
        const editActionsMatch = repasoNotesJs.match(/<div id="note-edit-actions"[\s\S]*?>([\s\S]*?)<\/div>/);
        expect(editActionsMatch).not.toBeNull();
        const editActionsHtml = editActionsMatch[1];

        expect(editActionsHtml).toContain('btn-action btn-secondary-action');
        expect(editActionsHtml).toContain('switchToViewer()');
        expect(editActionsHtml).toContain('Cancelar');

        expect(editActionsHtml).toContain('btn-action btn-primary');
        expect(editActionsHtml).toContain('saveNote()');
        expect(editActionsHtml).toContain('Guardar');

        expect(editActionsHtml).not.toContain('Cerrar');
    });

    test('El CSS de componentes debe consumir tokens semánticos dinámicos para el textarea y título de notas', () => {
        const componentsCss = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/css/components.css'), 'utf8');

        expect(componentsCss).not.toContain('rgba(15, 23, 42, 0.4)');
        expect(componentsCss).not.toContain('rgba(15, 23, 42, 0.6)');
        expect(componentsCss).toMatch(/\.note-editor-textarea\s*\{[\s\S]*?background:\s*var\(--input-bg\)/);
        expect(componentsCss).toMatch(/\.note-editor-textarea\s*\{[\s\S]*?border:\s*1\.5px\s*solid\s*var\(--border-color\)/);
        expect(componentsCss).not.toMatch(/\.note-modal-footer\s+button\s*\{/);
    });

    test('modal.css debe soportar .modal-overlay.open y el botón .btn-action.btn-primary', () => {
        const modalCss = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/css/modal.css'), 'utf8');
        expect(modalCss).toContain('.modal-overlay.open');
        expect(modalCss).toContain('.modal-footer .btn-action.btn-primary');
    });

    test('saveNote y deleteNote deben implementar la regla CRUD obligatoria de spinner y deshabilitación', () => {
        expect(repasoNotesJs).toContain('saveBtn.disabled = true;');
        expect(repasoNotesJs).toContain('cancelBtn.disabled = true;');
        expect(repasoNotesJs).toContain('saveBtn.innerHTML = \'<i class="fas fa-spinner fa-spin"></i> Guardando...\';');
        expect(repasoNotesJs).toContain('saveBtn.disabled = false;');
        expect(repasoNotesJs).toContain('cancelBtn.disabled = false;');

        expect(repasoNotesJs).toContain('targetBtn.disabled = true;');
        expect(repasoNotesJs).toContain('targetBtn.innerHTML = deleteBtn ? \'<i class="fas fa-spinner fa-spin"></i> Eliminando...\' : \'<i class="fas fa-spinner fa-spin"></i>\';');
        expect(repasoNotesJs).toContain('targetBtn.disabled = false;');
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
