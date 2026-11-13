/**
 * Unit tests for Admin Panel Bulk Selection (visible-only + Shift+Click),
 * Confirmation Message Generation, Composite Filters & Resource Card Generation.
 * Executes real logic from components.js and AdminManager (admin.js).
 */

const { AdminManager } = require('../../src/presentation/public/js/admin');
const { createAdminItemCardHTML } = require('../../src/presentation/public/js/ui/components');

function createClassList(initial = []) {
    const set = new Set(initial);
    return {
        add: jest.fn((...cls) => cls.forEach(c => set.add(c))),
        remove: jest.fn((...cls) => cls.forEach(c => set.delete(c))),
        contains: jest.fn((c) => set.has(c))
    };
}

function createCardAndCheckbox({ id, name, type = 'book', resourceType = 'paper', domain = 'medicine', publication = 'materials', visible = true }) {
    const card = {
        style: { display: visible ? '' : 'none' },
        dataset: { email: '', name, resourceType, domain, publication },
        textContent: name,
        querySelector: jest.fn((sel) => (sel === 'h3' ? { textContent: name } : null))
    };
    const checkbox = {
        checked: false,
        dataset: { id: String(id), type },
        classList: createClassList(['admin-item-checkbox']),
        closest: jest.fn((sel) => (sel === '.admin-item-card, .item-card' ? card : null))
    };
    return { card, checkbox };
}

describe('Panel de Gestión - Selección Masiva y Filtros Blindados (Real Modules)', () => {
    beforeAll(() => {
        global.safeHtmlValue = (val) => String(val || '');
        global.createAdminItemCardHTML = createAdminItemCardHTML;
        global.document = {
            addEventListener: jest.fn(),
            querySelector: jest.fn(),
            querySelectorAll: jest.fn(() => [])
        };
        global.window = {
            resolveImageUrl: (url) => url,
            uiManager: {
                registerMaterial: jest.fn(),
                isResourceLocked: jest.fn()
            }
        };
    });

    function setupBulkDom(items) {
        const containerListeners = {};
        const mainContainer = {
            addEventListener: jest.fn((event, handler) => {
                if (!containerListeners[event]) containerListeners[event] = [];
                containerListeners[event].push(handler);
            })
        };
        const bar = { classList: createClassList() };
        const barText = { textContent: '' };
        const modalStub = { addEventListener: jest.fn() };
        const activeTab = {
            contains: jest.fn((node) => items.some(it => it.checkbox === node)),
            querySelector: jest.fn((sel) => {
                const match = sel.match(/data-id="([^"]+)"/);
                if (match) {
                    const found = items.find(it => it.checkbox.dataset.id === match[1]);
                    return found ? found.checkbox : null;
                }
                return null;
            }),
            querySelectorAll: jest.fn((sel) => {
                if (sel === '.admin-item-checkbox') return items.map(it => it.checkbox);
                if (sel === '.admin-item-card, .item-card') return items.map(it => it.card);
                return [];
            })
        };

        global.document = {
            getElementById: jest.fn((id) => {
                if (id === 'admin-main-container') return mainContainer;
                if (id === 'admin-bulk-actions-bar') return bar;
                if (id === 'bulk-actions-text') return barText;
                return null;
            }),
            querySelector: jest.fn((sel) => {
                if (sel === '.tab-content.active') return activeTab;
                if (sel === '.admin-tabs') return { addEventListener: jest.fn() };
                return null;
            }),
            querySelectorAll: jest.fn((sel) => {
                if (sel === '.admin-item-checkbox') return items.map(it => it.checkbox);
                return [];
            }),
            createElement: jest.fn(() => ({ className: '', textContent: '', style: { display: '' } })),
            addEventListener: jest.fn()
        };

        const manager = Object.create(AdminManager.prototype);
        manager.selectedIds = [];
        manager.selectedType = '';
        manager.lastCheckedCheckbox = null;
        manager.genericForm = modalStub;
        manager.genericModal = modalStub;
        manager.searchState = { 'tab-books': { search: '', filter: 'all', domain: 'all', publication: 'all' } };
        manager.tabSortState = { 'tab-books': 'date-desc' };
        manager.setupMainContainerDelegation = jest.fn();
        manager.setupEventListeners();

        return { manager, containerListeners, bar, barText, activeTab };
    }

    describe('1. Tarjetas de Recursos (createAdminItemCardHTML real)', () => {
        test('inyecta data-target, data-publication, data-domain (en cursos) y etiqueta editorial correcta', () => {
            const bulletinCard = createAdminItemCardHTML({
                id: 'res-1',
                title: 'Guía Boletín',
                author: 'MINSA',
                resource_type: 'guia',
                target: 'SERUMS',
                publish_in_bulletin: true
            }, 'book');

            const materialCard = createAdminItemCardHTML({
                id: 'res-2',
                title: 'Manual Curso',
                author: 'MINEDU',
                resource_type: 'book',
                target: 'ASCENSO',
                publish_in_bulletin: false
            }, 'book');

            const courseCard = createAdminItemCardHTML({
                id: 'crs-1',
                title: 'Curso Ascenso',
                domain: 'education',
                target: 'ASCENSO'
            }, 'course');

            expect(bulletinCard).toContain('data-target="SERUMS"');
            expect(bulletinCard).toContain('data-publication="bulletin"');
            expect(bulletinCard).toContain('Boletín IA');

            expect(materialCard).toContain('data-target="ASCENSO"');
            expect(materialCard).toContain('data-publication="materials"');
            expect(materialCard).toContain('Material para cursos');

            expect(courseCard).toContain('data-domain="education"');
            expect(courseCard).toContain('data-target="ASCENSO"');
        });
    });

    describe('2. Selección Masiva Real (Shift + Clic, selectVisibleItems y clearBulkSelection)', () => {
        test('Shift + Clic delegado sobre admin-main-container selecciona rango visible omitiendo elementos ocultos', () => {
            const items = [
                createCardAndCheckbox({ id: '1', name: 'Paper 1', resourceType: 'paper', visible: true }),
                createCardAndCheckbox({ id: '2', name: 'Norma Técnica 2', resourceType: 'norma', visible: false }),
                createCardAndCheckbox({ id: '3', name: 'Guía Clínica 3', resourceType: 'guia', visible: false }),
                createCardAndCheckbox({ id: '4', name: 'Paper 4', resourceType: 'paper', visible: true }),
                createCardAndCheckbox({ id: '5', name: 'Paper 5', resourceType: 'paper', visible: true })
            ];

            const { manager, containerListeners, bar, barText } = setupBulkDom(items);
            const clickHandler = containerListeners.click.find(Boolean);
            expect(typeof clickHandler).toBe('function');

            // 1. Clic normal en Paper 1
            items[0].checkbox.checked = true;
            clickHandler({ target: items[0].checkbox, shiftKey: false });
            expect(manager.selectedIds).toEqual(['1']);

            // 2. Shift + Clic en Paper 4 (items[3]) -> solo 1 y 4 seleccionados; 2 y 3 ocultos permanecen desmarcados
            items[3].checkbox.checked = true;
            clickHandler({ target: items[3].checkbox, shiftKey: true });

            expect(manager.selectedIds).toEqual(['1', '4']);
            expect(items[1].checkbox.checked).toBe(false);
            expect(items[2].checkbox.checked).toBe(false);
            expect(bar.classList.add).toHaveBeenCalledWith('active');
            expect(barText.textContent).toBe('2 elementos seleccionados');
        });

        test('selectVisibleItems marca únicamente elementos visibles y clearBulkSelection limpia todo', () => {
            const items = [
                createCardAndCheckbox({ id: '1', name: 'Paper 1', visible: true }),
                createCardAndCheckbox({ id: '2', name: 'Norma Oculta', visible: false }),
                createCardAndCheckbox({ id: '4', name: 'Paper 4', visible: true }),
                createCardAndCheckbox({ id: '5', name: 'Paper 5', visible: true })
            ];
            const { manager, bar } = setupBulkDom(items);

            manager.selectVisibleItems();

            expect(manager.selectedIds).toEqual(['1', '4', '5']);
            expect(items[1].checkbox.checked).toBe(false);
            expect(bar.classList.add).toHaveBeenCalledWith('active');

            manager.clearBulkSelection();

            expect(manager.selectedIds).toEqual([]);
            expect(items.every(i => !i.checkbox.checked)).toBe(true);
            expect(bar.classList.remove).toHaveBeenCalledWith('active');
        });
    });

    describe('3. Construcción Real del Mensaje Transparente en handleBulkDelete()', () => {
        test('handleBulkDelete construye la lista de títulos y etiqueta amigable antes de confirmar eliminación', async () => {
            const items = [
                createCardAndCheckbox({ id: '1', name: 'Paper de Cardiología 2026', type: 'book', visible: true }),
                createCardAndCheckbox({ id: '4', name: 'Paper de Neumología', type: 'book', visible: true })
            ];
            const { manager } = setupBulkDom(items);
            manager.selectedIds = ['1', '4'];
            manager.selectedType = 'book';

            global.window.confirmationModal = {
                show: jest.fn().mockResolvedValue(false)
            };

            await manager.handleBulkDelete();

            expect(global.window.confirmationModal.show).toHaveBeenCalledTimes(1);
            const [confirmMsg, title] = global.window.confirmationModal.show.mock.calls[0];
            expect(title).toBe('Eliminación Masiva');
            expect(confirmMsg).toContain('2 elementos de tipo "Recursos / Bibliografía"');
            expect(confirmMsg).toContain('• Paper de Cardiología 2026');
            expect(confirmMsg).toContain('• Paper de Neumología');
            expect(confirmMsg).toContain('Esta acción no se puede deshacer');
        });
    });

    describe('4. Filtros Compuestos Reales en displayBooks y applySearchFilterForTab', () => {
        test('displayBooks renderiza filtro editorial sin filtro de dominio y applySearchFilterForTab aplica tipo + publicación', () => {
            const items = [
                createCardAndCheckbox({ id: '1', name: 'Cardiología Boletín', resourceType: 'paper', domain: 'medicine', publication: 'bulletin', visible: true }),
                createCardAndCheckbox({ id: '2', name: 'Norma Curso', resourceType: 'norma', domain: 'education', publication: 'materials', visible: true })
            ];

            let booksHtml = '';
            const tabBooks = {
                set innerHTML(val) { booksHtml = val; },
                get innerHTML() { return booksHtml; },
                querySelector: jest.fn(() => null),
                querySelectorAll: jest.fn((sel) => (sel === '.admin-item-card, .item-card' ? items.map(i => i.card) : [])),
                appendChild: jest.fn()
            };

            global.document = {
                getElementById: jest.fn((id) => (id === 'tab-books' ? tabBooks : null)),
                createElement: jest.fn(() => ({ className: '', textContent: '', style: { display: '' } }))
            };

            const manager = Object.create(AdminManager.prototype);
            manager.tabSortState = { 'tab-books': 'date-desc' };
            manager.searchState = { 'tab-books': { search: '', filter: 'paper', domain: 'all', publication: 'bulletin' } };
            manager.allBooks = [{ id: '1', title: 'Cardiología Boletín', author: 'Autor', created_at: '2026-01-01' }];

            manager.displayBooks();

            expect(booksHtml).toContain('admin-editorial-filter');
            expect(booksHtml).toContain('value="bulletin"');
            expect(booksHtml).toContain('value="materials"');
            expect(booksHtml).not.toContain('admin-domain-filter');
            expect(items[0].card.style.display).toBe('');
            expect(items[1].card.style.display).toBe('none');
        });
    });
});
