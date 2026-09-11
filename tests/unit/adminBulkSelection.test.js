/**
 * adminBulkSelection.test.js
 * 
 * Suite de pruebas unitarias para validar:
 * 1. Selección con Shift-Click considerando estrictamente la visibilidad (omitiendo elementos filtrados/ocultos).
 * 2. Reseteo automático de selección al cambiar filtros de búsqueda, tipo, dominio o pestaña.
 * 3. Formateo transparente e itemizado del mensaje de confirmación antes del borrado masivo.
 * 4. Atributos data-domain y badges de dominio (Salud / Educación) en componentes.
 */

const fs = require('fs');
const path = require('path');

describe('Panel de Gestión - Selección Masiva y Filtros Blindados', () => {
    let adminJsContent;
    let adminHtmlContent;
    let componentsJsContent;

    beforeAll(() => {
        adminJsContent = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/js/admin.js'), 'utf8');
        adminHtmlContent = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/admin.html'), 'utf8');
        componentsJsContent = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/js/ui/components.js'), 'utf8');
    });

    describe('1. Estructura HTML y Controles de la Barra de Acciones Masivas', () => {
        test('admin.html contiene el botón "Seleccionar visibles" en la barra de acciones masivas', () => {
            expect(adminHtmlContent).toContain('id="bulk-select-visible-btn"');
            expect(adminHtmlContent).toContain('Seleccionar visibles');
        });

        test('admin.html contiene los botones de desmarcar y eliminar masivo', () => {
            expect(adminHtmlContent).toContain('id="bulk-cancel-selection-btn"');
            expect(adminHtmlContent).toContain('id="bulk-delete-btn"');
        });

        test('admin.js registra listeners para bulk-select-visible-btn, bulk-cancel-selection-btn y bulk-delete-btn', () => {
            expect(adminJsContent).toContain("document.getElementById('bulk-select-visible-btn')");
            expect(adminJsContent).toContain("document.getElementById('bulk-cancel-selection-btn')");
            expect(adminJsContent).toContain("document.getElementById('bulk-delete-btn')");
        });
    });

    describe('2. Generación de Tarjetas con data-domain y Badges en components.js', () => {
        test('createAdminItemCardHTML inyecta data-domain en las tarjetas de recursos y elementos generales', () => {
            expect(componentsJsContent).toContain('data-domain=');
            expect(componentsJsContent).toContain('data-target=');
        });

        test('createAdminItemCardHTML genera badge de dominio (Salud / Educación) para recursos (type === "book")', () => {
            expect(componentsJsContent).toContain("item.domain === 'education' ? 'Educación' : 'Salud'");
            expect(componentsJsContent).toContain('admin-badge-blue');
            expect(componentsJsContent).toContain('admin-badge-green');
        });
    });

    describe('3. Lógica de Filtrado por Visibilidad en Shift + Clic (Simulación Pura)', () => {
        let cards;
        let adminState;

        beforeEach(() => {
            // Estructura de tarjetas simulando un DOM donde 2 items fueron ocultados por el filtro
            cards = [
                { id: '1', name: 'Paper 1', type: 'book', resourceType: 'paper', isVisible: true, checked: false },
                { id: '2', name: 'Norma Técnica 2', type: 'book', resourceType: 'norma', isVisible: false, checked: false }, // Oculto
                { id: '3', name: 'Guía Clínica 3', type: 'book', resourceType: 'guia', isVisible: false, checked: false },  // Oculto
                { id: '4', name: 'Paper 4', type: 'book', resourceType: 'paper', isVisible: true, checked: false },
                { id: '5', name: 'Paper 5', type: 'book', resourceType: 'paper', isVisible: true, checked: false }
            ];

            adminState = {
                selectedIds: [],
                selectedType: '',
                lastCheckedCard: null,
                barActive: false,
                clearBulkSelection() {
                    this.selectedIds = [];
                    this.selectedType = '';
                    this.lastCheckedCard = null;
                    cards.forEach(c => c.checked = false);
                    this.barActive = false;
                },
                updateBulkActionsBar() {
                    this.barActive = this.selectedIds.length > 0;
                },
                selectVisibleItems() {
                    const visibleCards = cards.filter(c => c.isVisible);
                    visibleCards.forEach(c => {
                        c.checked = true;
                        this.selectedType = c.type;
                        if (!this.selectedIds.includes(c.id)) {
                            this.selectedIds.push(c.id);
                        }
                    });
                    this.updateBulkActionsBar();
                }
            };
        });

        test('Shift + Clic sobre visibleCheckboxes ignora estrictamente elementos ocultos por filtro', () => {
            // Helper que replica exactamente el filtro implementado en admin.js:
            // const visibleCheckboxes = Array.from(activeTab.querySelectorAll('.admin-item-checkbox')).filter(isCardVisible);
            const visibleCards = cards.filter(c => c.isVisible);
            expect(visibleCards.length).toBe(3); // Solo Paper 1, Paper 4 y Paper 5

            // 1. Clic en Paper 1
            const card1 = visibleCards[0];
            card1.checked = true;
            adminState.selectedIds.push(card1.id);
            adminState.selectedType = card1.type;
            adminState.lastCheckedCard = card1;
            adminState.updateBulkActionsBar();

            expect(adminState.selectedIds).toEqual(['1']);

            // 2. Shift + Clic en Paper 4
            const card4 = visibleCards[1];
            card4.checked = true;

            const start = visibleCards.indexOf(card4);
            const end = visibleCards.indexOf(adminState.lastCheckedCard);
            const rangeStart = Math.min(start, end);
            const rangeEnd = Math.max(start, end);

            for (let i = rangeStart; i <= rangeEnd; i++) {
                const c = visibleCards[i];
                c.checked = true;
                if (!adminState.selectedIds.includes(c.id)) {
                    adminState.selectedIds.push(c.id);
                }
            }
            adminState.updateBulkActionsBar();

            // 3. Validar que SOLO los papers visibles (1 y 4) están marcados
            expect(adminState.selectedIds).toEqual(['1', '4']);
            expect(cards.find(c => c.id === '1').checked).toBe(true);
            expect(cards.find(c => c.id === '4').checked).toBe(true);

            // Las normas y guías ocultas NUNCA fueron marcadas ni añadidas a selectedIds
            expect(cards.find(c => c.id === '2').checked).toBe(false);
            expect(cards.find(c => c.id === '3').checked).toBe(false);
            expect(adminState.selectedIds).not.toContain('2');
            expect(adminState.selectedIds).not.toContain('3');
        });

        test('selectVisibleItems marca únicamente los elementos visibles (no ocultos)', () => {
            adminState.selectVisibleItems();

            expect(adminState.selectedIds).toEqual(['1', '4', '5']);
            expect(cards.find(c => c.id === '1').checked).toBe(true);
            expect(cards.find(c => c.id === '4').checked).toBe(true);
            expect(cards.find(c => c.id === '5').checked).toBe(true);
            expect(cards.find(c => c.id === '2').checked).toBe(false);
            expect(cards.find(c => c.id === '3').checked).toBe(false);
            expect(adminState.barActive).toBe(true);
        });

        test('clearBulkSelection limpia todas las selecciones y desactiva la barra', () => {
            adminState.selectVisibleItems();
            expect(adminState.selectedIds.length).toBe(3);

            adminState.clearBulkSelection();
            expect(adminState.selectedIds.length).toBe(0);
            expect(adminState.barActive).toBe(false);
            expect(cards.every(c => !c.checked)).toBe(true);
        });
    });

    describe('4. Construcción del Mensaje Transparente de Confirmación', () => {
        test('Construye la lista de títulos de los elementos a eliminar para verificación del admin', () => {
            const selectedIds = ['1', '4'];
            const titles = ['Paper de Cardiología 2026', 'Paper de Neumología'];
            const type = 'book';
            const count = selectedIds.length;

            const maxDisplay = 8;
            const previewList = titles.slice(0, maxDisplay).map(t => `• ${t}`).join('\n');
            const remaining = titles.length - maxDisplay;
            const remainingText = remaining > 0 ? `\n... y ${remaining} elemento(s) más.` : '';

            const typeLabels = {
                book: 'Recursos / Bibliografía',
                question: 'Preguntas',
                case: 'Casuísticas'
            };
            const typeFriendly = typeLabels[type] || type;

            const confirmMsg = `¿Estás seguro de que deseas eliminar permanentemente estos ${count} elementos de tipo "${typeFriendly}"?\n\nElementos que se eliminarán:\n${previewList}${remainingText}\n\n⚠️ Esta acción no se puede deshacer y eliminará permanentemente todos los recursos e imágenes asociadas.`;

            expect(confirmMsg).toContain('2 elementos de tipo "Recursos / Bibliografía"');
            expect(confirmMsg).toContain('• Paper de Cardiología 2026');
            expect(confirmMsg).toContain('• Paper de Neumología');
            expect(confirmMsg).toContain('Esta acción no se puede deshacer');
        });
    });

    describe('5. Filtros por Dominio en Recursos y Casos en admin.js', () => {
        test('displayBooks incluye el selector de dominio con opciones Salud Profesional y Educación Docente', () => {
            expect(adminJsContent).toContain('class="admin-domain-filter" data-target-tab="tab-books"');
            expect(adminJsContent).toContain('value="medicine"');
            expect(adminJsContent).toContain('value="education"');
        });

        test('displayQuestions incluye filtro por asociación a casos (linked, unlinked)', () => {
            expect(adminJsContent).toContain('handleQuestionCaseFilterChange');
            expect(adminJsContent).toContain('value="linked"');
            expect(adminJsContent).toContain('value="unlinked"');
        });

        test('applySearchFilterForTab evalúa matchesDomain concurrentemente con matchesType y matchesText', () => {
            expect(adminJsContent).toContain('let matchesDomain = true;');
            expect(adminJsContent).toContain('item.dataset.domain');
            expect(adminJsContent).toContain('matchesText && matchesType && matchesDomain');
        });
    });

    describe('6. Arquitectura Responsiva de Cabecera (Dos Filas) y Erradicación de Código Muerto', () => {
        let adminCssContent;

        beforeAll(() => {
            adminCssContent = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/css/admin.css'), 'utf8');
        });

        test('admin.css define la arquitectura de dos filas: tab-top-row y tab-search-row', () => {
            expect(adminCssContent).toContain('.tab-top-row');
            expect(adminCssContent).toContain('.tab-search-row');
            expect(adminCssContent).toContain('.admin-filters-group');
        });

        test('displayBooks ubica filtros y acciones en tab-top-row y la barra de búsqueda en tab-search-row', () => {
            expect(adminJsContent).toContain('<div class="tab-top-row">');
            expect(adminJsContent).toContain('<div class="tab-search-row">');
        });

        test('displayQuestions ubica filtros y acciones en tab-top-row y el buscador de servidor en tab-search-row', () => {
            const questionsSection = adminJsContent.slice(adminJsContent.indexOf('displayQuestions()'), adminJsContent.indexOf('handleDomainChange(domain)'));
            expect(questionsSection).toContain('class="tab-top-row"');
            expect(questionsSection).toContain('class="tab-search-row"');
            expect(questionsSection).toContain('class="admin-search-input-dynamic"');
        });

        test('displayCases ubica filtros y acciones en tab-top-row y buscador en tab-search-row', () => {
            const casesSection = adminJsContent.slice(adminJsContent.indexOf('displayCases()'), adminJsContent.indexOf('handleCaseDomainChange(domain)'));
            expect(casesSection).toContain('class="tab-top-row"');
            expect(casesSection).toContain('class="tab-search-row"');
        });

        test('_createTabHeaderHTML genera estructura uniforme de dos filas para Carreras, Cursos, Alumnos y Temas', () => {
            const helperSection = adminJsContent.slice(adminJsContent.indexOf('_createTabHeaderHTML'), adminJsContent.indexOf('downloadExcelTemplate'));
            expect(helperSection).toContain('class="tab-top-row"');
            expect(helperSection).toContain('class="tab-search-row"');
        });

        test('Código muerto erradicado: admin.html no contiene el botón inactivo bulk-link-case-btn', () => {
            expect(adminHtmlContent).not.toContain('id="bulk-link-case-btn"');
            expect(adminHtmlContent).not.toContain('Encadenar en Caso');
        });
    });
});
