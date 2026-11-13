/**
 * Unit tests for Admin Panel Student Card Rendering & Email/Name Search Filtering
 * Executes real createAdminItemCardHTML (components.js) and AdminManager (admin.js)
 */

const { AdminManager } = require('../../src/presentation/public/js/admin');
const { createAdminItemCardHTML } = require('../../src/presentation/public/js/ui/components');

function createClassList() {
    const set = new Set();
    return {
        add: jest.fn((...c) => c.forEach(x => set.add(x))),
        remove: jest.fn((...c) => c.forEach(x => set.delete(x))),
        contains: jest.fn((c) => set.has(c))
    };
}

describe('Admin Panel - Búsqueda de Usuarios por Correo y Nombre (Real Modules)', () => {
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

    test('createAdminItemCardHTML incluye data-email y data-name en las tarjetas de alumnos', () => {
        const student = {
            id: 'usr_123',
            name: 'Carlos Mendoza',
            email: 'carlos.mendoza@universidad.edu.pe',
            subscriptionTier: 'advanced',
            subscriptionStatus: 'active',
            subscriptionExpiresAt: '2026-12-31T00:00:00.000Z'
        };

        const cardHtml = createAdminItemCardHTML(student, 'student', `(${student.email})`);

        expect(cardHtml).toContain('data-email="carlos.mendoza@universidad.edu.pe"');
        expect(cardHtml).toContain('data-name="Carlos Mendoza"');
        expect(cardHtml).toContain('carlos.mendoza@universidad.edu.pe');
        expect(cardHtml).toContain('ADVANCED');
        expect(cardHtml).toContain('ACTIVE');
    });

    test('_createTabHeaderHTML asigna placeholder de búsqueda por nombre o correo únicamente a tab-students', () => {
        const manager = Object.create(AdminManager.prototype);
        manager.tabSortState = { 'tab-students': 'date-desc', 'tab-topics': 'date-desc' };

        const studentsHeader = manager._createTabHeaderHTML('student', 'Añadir Alumno', 'tab-students');
        const topicsHeader = manager._createTabHeaderHTML('topic', 'Añadir Tema', 'tab-topics');

        expect(studentsHeader).toContain('placeholder="Buscar por nombre o correo..."');
        expect(topicsHeader).toContain('placeholder="Buscar..."');
    });

    test('applySearchFilterForTab filtra tarjetas reales por prefijo, apellido, dominio de correo y estado vacío', () => {
        const makeStudentCard = (name, email, extraText = 'basic active') => ({
            dataset: { email, name },
            textContent: `${name} (${email}) ${extraText}`,
            style: { display: '' }
        });

        const anaCard = makeStudentCard('Ana García', 'ana.garcia@medicina.pe');
        const carlosCard = makeStudentCard('Carlos Mendoza', 'carlos.mendoza@universidad.edu.pe', 'advanced active');
        const cards = [anaCard, carlosCard];

        const searchInput = { value: '' };
        let emptyStateEl = null;

        const tabContent = {
            querySelector: jest.fn((sel) => {
                if (sel === '.admin-search-input') return searchInput;
                if (sel === '.search-empty-state') return emptyStateEl;
                return null;
            }),
            querySelectorAll: jest.fn((sel) => (sel === '.admin-item-card, .item-card' ? cards : [])),
            appendChild: jest.fn((node) => { emptyStateEl = node; })
        };

        global.document = {
            getElementById: jest.fn((id) => (id === 'tab-students' ? tabContent : null)),
            createElement: jest.fn(() => ({
                className: '',
                textContent: '',
                style: { display: '' },
                classList: createClassList()
            }))
        };

        const manager = Object.create(AdminManager.prototype);
        manager.tabSortState = { 'tab-students': 'date-desc' };
        manager.searchState = { 'tab-students': { search: 'ana', filter: 'all' } };

        // Prefijo de correo / nombre
        manager.applySearchFilterForTab('tab-students');
        expect(anaCard.style.display).toBe('');
        expect(carlosCard.style.display).toBe('none');

        // Dominio del correo
        manager.searchState['tab-students'].search = 'medicina.pe';
        manager.applySearchFilterForTab('tab-students');
        expect(anaCard.style.display).toBe('');
        expect(carlosCard.style.display).toBe('none');

        // Nombre completo del segundo alumno
        manager.searchState['tab-students'].search = 'mendoza';
        manager.applySearchFilterForTab('tab-students');
        expect(anaCard.style.display).toBe('none');
        expect(carlosCard.style.display).toBe('');

        // Sin resultados -> genera emptyState con mensaje
        manager.searchState['tab-students'].search = 'inexistente@nope.com';
        manager.applySearchFilterForTab('tab-students');
        expect(anaCard.style.display).toBe('none');
        expect(carlosCard.style.display).toBe('none');
        expect(emptyStateEl).not.toBeNull();
        expect(emptyStateEl.textContent).toContain('inexistente@nope.com');
    });
});
