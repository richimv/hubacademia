const fs = require('fs');
const path = require('path');

describe('Drive Sync Topics, Topic Modal Sorting, and Library Filters', () => {
    let adminJs;

    beforeAll(() => {
        adminJs = fs.readFileSync(path.join(__dirname, '../../src/presentation/public/js/admin.js'), 'utf8');
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

});
