const fs = require('fs');
const path = require('path');

describe('Library UI - Gestión de Notas Manuales y openNoteModal', () => {
    let libraryJs;
    let libraryHtml;

    beforeAll(() => {
        libraryJs = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/js/ui/libraryUI.js'), 'utf8');
        libraryHtml = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/library.html'), 'utf8');
    });

    test('El archivo libraryUI.js debe definir explícitamente el método openNoteModal en la clase LibraryUI', () => {
        expect(libraryJs).toContain('openNoteModal(noteId = null)');
    });

    test('openNoteModal debe delegar la ejecución directamente a openNoteEditor', () => {
        expect(libraryJs).toMatch(/openNoteModal\s*\(\s*noteId\s*=\s*null\s*\)\s*\{\s*this\.openNoteEditor\(noteId\);\s*\}/);
    });

    test('Los botones de creación de nota en libraryUI.js deben invocar window.libraryUI.openNoteModal() sin errores', () => {
        expect(libraryJs).toContain('onclick="window.libraryUI.openNoteModal()"');
    });

    test('El método openNoteEditor debe inicializar el estado en modo edición cuando se llama sin noteId', () => {
        // Mocking class execution in pure Node context
        const dummyDocument = {
            getElementById: jest.fn((id) => {
                return {
                    id,
                    value: 'test',
                    style: {},
                    classList: { add: jest.fn(), remove: jest.fn(), contains: jest.fn().mockReturnValue(true) },
                    innerHTML: ''
                };
            }),
            body: {
                classList: { add: jest.fn(), remove: jest.fn() },
                appendChild: jest.fn()
            },
            querySelector: jest.fn().mockReturnValue(null),
            querySelectorAll: jest.fn().mockReturnValue([]),
            addEventListener: jest.fn()
        };

        global.document = dummyDocument;
        global.window = {
            libraryService: { getLibraryData: () => ({ notes: [] }) },
            escapeHtml: (s) => s,
            AppConfig: { API_URL: '' },
            NetworkService: { fetch: jest.fn() }
        };

        // Extract class from libraryJs
        const scriptWithoutAutoInit = libraryJs.replace(/document\.addEventListener\('DOMContentLoaded'[\s\S]*?\);?\s*$/, '');
        const fn = new Function('window', 'document', `${scriptWithoutAutoInit}; return LibraryUI;`);
        const LibraryUIClass = fn(global.window, global.document);

        const instance = new LibraryUIClass();
        expect(typeof instance.openNoteModal).toBe('function');
        expect(typeof instance.openNoteEditor).toBe('function');

        // Spy on openNoteEditor
        const editorSpy = jest.spyOn(instance, 'openNoteEditor').mockImplementation(() => {});
        instance.openNoteModal();
        expect(editorSpy).toHaveBeenCalledWith(null);

        instance.openNoteModal('note-123');
        expect(editorSpy).toHaveBeenCalledWith('note-123');
    });

    test('La modal de notas debe cumplir con el Estándar Universal (Sección 3.17 DESIGN_SYSTEM)', () => {
        expect(libraryJs).toContain('modal-overlay note-modal-overlay');
        expect(libraryJs).toContain('modal-content note-modal');
        expect(libraryJs).toContain('modal-header note-modal-header');
        expect(libraryJs).toContain('modal-body note-modal-body');
        expect(libraryJs).toContain('modal-footer note-modal-footer');
        expect(libraryJs).toContain('modal-close-btn note-modal-close');
    });

    test('El footer de la modal de notas NO debe contener botones sueltos fuera de los grupos de acción', () => {
        // Extraer el footer de _renderNoteModal
        const footerMatch = libraryJs.match(/<div class="modal-footer note-modal-footer">([\s\S]*?)<\/div>\s*<\/div>\s*`;/);
        expect(footerMatch).not.toBeNull();
        const footerContent = footerMatch[1];

        // Remover los grupos controlados #note-view-actions y #note-edit-actions
        const withoutGroups = footerContent
            .replace(/<div id="note-view-actions"[\s\S]*?<\/div>/, '')
            .replace(/<div id="note-edit-actions"[\s\S]*?<\/div>/, '')
            .trim();

        // No debe quedar ningún elemento <button> huérfano fuera de los grupos
        expect(withoutGroups).not.toContain('<button');
    });

    test('El grupo de edición debe contener exactamente Cancelar y Guardar con clases estándar', () => {
        const editActionsMatch = libraryJs.match(/<div id="note-edit-actions"[\s\S]*?>([\s\S]*?)<\/div>/);
        expect(editActionsMatch).not.toBeNull();
        const editActionsHtml = editActionsMatch[1];

        expect(editActionsHtml).toContain('btn-action btn-secondary-action');
        expect(editActionsHtml).toContain('switchToViewer()');
        expect(editActionsHtml).toContain('Cancelar');

        expect(editActionsHtml).toContain('btn-action btn-primary');
        expect(editActionsHtml).toContain('saveNote()');
        expect(editActionsHtml).toContain('Guardar');

        // No debe contener "Cerrar" en el grupo de edición
        expect(editActionsHtml).not.toContain('Cerrar');
    });

    test('El CSS de componentes debe consumir tokens semánticos dinámicos para el textarea y título de notas', () => {
        const componentsCss = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/css/components.css'), 'utf8');
        
        // No debe tener hardcoded slate oscuro en el textarea
        expect(componentsCss).not.toContain('rgba(15, 23, 42, 0.4)');
        expect(componentsCss).not.toContain('rgba(15, 23, 42, 0.6)');

        // Debe usar var(--input-bg)
        expect(componentsCss).toMatch(/\.note-editor-textarea\s*\{[\s\S]*?background:\s*var\(--input-bg\)/);
        expect(componentsCss).toMatch(/\.note-editor-textarea\s*\{[\s\S]*?border:\s*1\.5px\s*solid\s*var\(--border-color\)/);

        // No debe tener reglas destructivas que anulen el fondo de botones en el footer
        expect(componentsCss).not.toMatch(/\.note-modal-footer\s+button\s*\{/);
    });

    test('modal.css debe soportar .modal-overlay.open y el botón .btn-action.btn-primary', () => {
        const modalCss = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/css/modal.css'), 'utf8');
        expect(modalCss).toContain('.modal-overlay.open');
        expect(modalCss).toContain('.modal-footer .btn-action.btn-primary');
    });

    test('saveNote y deleteNote deben implementar la regla CRUD obligatoria de spinner y deshabilitación', () => {
        // Validación estática del código fuente
        expect(libraryJs).toContain("saveBtn.disabled = true;");
        expect(libraryJs).toContain("cancelBtn.disabled = true;");
        expect(libraryJs).toContain("saveBtn.innerHTML = '<i class=\"fas fa-spinner fa-spin\"></i> Guardando...';");
        expect(libraryJs).toContain("saveBtn.disabled = false;");
        expect(libraryJs).toContain("cancelBtn.disabled = false;");

        expect(libraryJs).toContain("targetBtn.disabled = true;");
        expect(libraryJs).toContain("targetBtn.innerHTML = deleteBtn ? '<i class=\"fas fa-spinner fa-spin\"></i> Eliminando...' : '<i class=\"fas fa-spinner fa-spin\"></i>';");
        expect(libraryJs).toContain("targetBtn.disabled = false;");
    });

    test('saveNote deshabilita botones, muestra spinner y restaura el estado original al finalizar', async () => {
        const scriptWithoutAutoInit = libraryJs.replace(/document\.addEventListener\('DOMContentLoaded'[\s\S]*?\);?\s*$/, '');
        const fn = new Function('window', 'document', `${scriptWithoutAutoInit}; return LibraryUI;`);

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

        const mockDocument = {
            getElementById: jest.fn(id => elements[id] || null),
            querySelector: jest.fn().mockReturnValue(null),
            querySelectorAll: jest.fn().mockReturnValue([]),
            body: { classList: { remove: jest.fn(), add: jest.fn() } }
        };

        let capturedDisabledDuringFetch = null;
        let capturedHtmlDuringFetch = null;

        const mockWindow = {
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

        const LibraryUIClass = fn(mockWindow, mockDocument);
        const instance = new LibraryUIClass();
        instance.service = { loadFullLibrary: jest.fn().mockResolvedValue({}) };

        await instance.saveNote();

        // Comprobamos que durante el fetch estuvo deshabilitado y con spinner
        expect(capturedDisabledDuringFetch).toBe(true);
        expect(capturedHtmlDuringFetch).toContain('fa-spinner');
        expect(capturedHtmlDuringFetch).toContain('Guardando...');

        // Comprobamos que al terminar (bloque finally) se restauró
        expect(saveBtn.disabled).toBe(false);
        expect(saveBtn.innerHTML).toBe('Guardar');
        expect(cancelBtn.disabled).toBe(false);
    });

    test('deleteNote deshabilita el botón, muestra spinner y restaura el estado original al finalizar', async () => {
        const scriptWithoutAutoInit = libraryJs.replace(/document\.addEventListener\('DOMContentLoaded'[\s\S]*?\);?\s*$/, '');
        const fn = new Function('window', 'document', `${scriptWithoutAutoInit}; return LibraryUI;`);

        const deleteBtn = { id: 'note-modal-delete', disabled: false, innerHTML: 'Eliminar' };
        const elements = {
            'note-modal-delete': deleteBtn,
            'note-modal-overlay': { classList: { remove: jest.fn() } }
        };

        const mockDocument = {
            getElementById: jest.fn(id => elements[id] || null),
            querySelector: jest.fn().mockReturnValue(null),
            querySelectorAll: jest.fn().mockReturnValue([]),
            body: { classList: { remove: jest.fn(), add: jest.fn() } }
        };

        let capturedDisabledDuringFetch = null;
        let capturedHtmlDuringFetch = null;

        const mockWindow = {
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

        const LibraryUIClass = fn(mockWindow, mockDocument);
        const instance = new LibraryUIClass();
        instance.service = { loadFullLibrary: jest.fn().mockResolvedValue({}) };

        await instance.deleteNote('note-123');

        // Comprobamos que durante el fetch estuvo deshabilitado y con spinner
        expect(capturedDisabledDuringFetch).toBe(true);
        expect(capturedHtmlDuringFetch).toContain('fa-spinner');
        expect(capturedHtmlDuringFetch).toContain('Eliminando...');

        // Comprobamos que al terminar (bloque finally) se restauró
        expect(deleteBtn.disabled).toBe(false);
        expect(deleteBtn.innerHTML).toBe('Eliminar');
    });
});

