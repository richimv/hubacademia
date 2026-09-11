const fs = require('fs');
const path = require('path');

describe('Drive Sync Topics, Topic Modal Sorting, and Library Filters', () => {
    let adminJs, searchJs, componentsJs, componentsCss, bookRepoCode;

    beforeAll(() => {
        adminJs = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/js/admin.js'), 'utf8');
        searchJs = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/js/search.js'), 'utf8');
        componentsJs = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/js/ui/components.js'), 'utf8');
        componentsCss = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/css/components.css'), 'utf8');
        bookRepoCode = fs.readFileSync(path.join(__dirname, '../../src/domain/repositories/bookRepository.js'), 'utf8');
    });

    describe('1. Google Drive Sync Modal & Topics Association', () => {
        test('admin.js includes Temas multiselect in drive-sync modal', () => {
            expect(adminJs).toMatch(/case 'drive-sync':/);
            expect(adminJs).toContain('generic-topics');
            expect(adminJs).toContain('Temas / Categor');
        });

        test('admin.js captures selected topicIds in drive-sync submission', () => {
            const driveSyncBlock = adminJs.substring(adminJs.indexOf("case 'drive-sync':"));
            expect(driveSyncBlock).toContain("this.getSelectedIds('generic-topics')");
            expect(driveSyncBlock).toMatch(/topicIds/);
        });

        test('adminController.js handles topicIds parsing and forwards to syncResource', () => {
            const adminControllerCode = fs.readFileSync(path.join(__dirname, '../../src/application/controllers/adminController.js'), 'utf8');
            expect(adminControllerCode).toMatch(/topicIds/);
            expect(adminControllerCode).toContain('parsedTopicIds');
            expect(adminControllerCode).toMatch(/adminService\.syncResource/);
        });
    });

    describe('2. Topics Modal Sorting and Naming', () => {
        test('admin.js renames Libros de Referencia to Recursos de Referencia', () => {
            const topicCase = adminJs.substring(adminJs.indexOf("case 'topic':"), adminJs.indexOf("case 'student':"));
            expect(topicCase).toContain('Recursos de Referencia');
            expect(topicCase).not.toContain('Libros de Referencia');
        });

        test('admin.js sorts reference resources by recent modification/creation', () => {
            const topicCase = adminJs.substring(adminJs.indexOf("case 'topic':"), adminJs.indexOf("case 'student':"));
            expect(topicCase).toMatch(/sort\(/);
            expect(topicCase).toContain('updated_at');
            expect(topicCase).toContain('created_at');
        });
    });

    describe('3. Mi Biblioteca - Novedades Filter (Strictly Noticia and Norma)', () => {
        test('bookRepository.js filters news strictly to norma and noticia', () => {
            expect(bookRepoCode).toContain("r.resource_type IN ('norma', 'noticia')");
            expect(bookRepoCode).not.toContain("r.resource_type IN ('paper', 'norma', 'guia', 'noticia')");
        });

        test('components.js filters newsItems to exclusively include noticia and norma', () => {
            expect(componentsJs).toMatch(/validNews\s*=\s*\(newsItems\s*\|\|\s*\[\]\)\.filter/);
            expect(componentsJs).toMatch(/type\s*===\s*'noticia'\s*\|\|\s*type\s*===\s*'norma'/);
        });
    });

    describe('4. Resource Cards Gradient & Education Tab Filters', () => {
        test('components.css has softened dark gradient overlay for resource cards', () => {
            expect(componentsCss).toMatch(/\.unified-resource-card\.has-bg-image\s+\.urc-visual-overlay\s*\{[^}]*background:\s*linear-gradient\(to top,\s*rgba\(0,\s*0,\s*0,\s*0\.8\)\s*0%,\s*rgba\(0,\s*0,\s*0,\s*0\.35\)\s*35%,\s*transparent\s*65%\)/);
        });

        test('search.js includes Guías Técnicas and Otros Recursos in Education tab', () => {
            const biblioSection = searchJs.substring(searchJs.indexOf('biblioFilters = ['), searchJs.indexOf('filtersContainer.innerHTML = biblioFilters.map'));
            expect(biblioSection).toContain("id: 'Guías Técnicas', val: 'guia'");
            expect(biblioSection).toContain("id: 'Otros Recursos', val: 'other'");
        });
    });
});
