const adminService = require('../../src/domain/services/adminService');
const { AdminManager } = require('../../src/presentation/public/js/admin');
const { createAdminItemCardHTML } = require('../../src/presentation/public/js/ui/components');

jest.mock('../../src/domain/repositories/adminRepository');
jest.mock('../../src/infrastructure/database/db');

describe('Admin Panel - Arquitectura de Gestión de Alumnos y Suscripciones', () => {
    let mockUserRepo;

    beforeAll(() => {
        global.createAdminItemCardHTML = createAdminItemCardHTML;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockUserRepo = {
            create: jest.fn(),
            findById: jest.fn(),
            findByRole: jest.fn(),
            update: jest.fn().mockImplementation((id, data) => Promise.resolve({ id, ...data })),
            delete: jest.fn()
        };
        adminService.repositories.user = mockUserRepo;
    });

    describe('1. Capa de Dominio (adminService.js): Creación y Consistencia de Alumnos', () => {
        test('adminService.create crea usuario y no inyecta contraseñas temporales (Google OAuth exclusivo)', async () => {
            const fakeUser = {
                id: 'usr-google-uuid',
                name: 'Mariana Ríos',
                email: 'mariana.rios@gmail.com',
                role: 'student',
                subscriptionTier: 'free',
                subscriptionStatus: 'pending'
            };

            mockUserRepo.create.mockResolvedValue(fakeUser);
            mockUserRepo.findById.mockResolvedValue(fakeUser);
            mockUserRepo.update.mockResolvedValue(fakeUser);

            const result = await adminService.create('student', {
                name: 'Mariana Ríos',
                email: 'mariana.rios@gmail.com',
                subscriptionTier: 'free',
                subscriptionStatus: 'pending'
            });

            expect(mockUserRepo.create).toHaveBeenCalledWith({
                id: null,
                email: 'mariana.rios@gmail.com',
                name: 'Mariana Ríos',
                role: 'student'
            });
            expect(result.tempPassword).toBeUndefined();
            expect(result.id).toBe('usr-google-uuid');
        });

        test('adminService.create con plan avanzado inicializa consistencia y resetea consumos', async () => {
            const initialUser = {
                id: 'usr-adv-123',
                name: 'Carlos Ruiz',
                email: 'carlos.ruiz@medicina.pe',
                role: 'student'
            };

            const updatedUser = {
                ...initialUser,
                subscriptionTier: 'advanced',
                subscriptionStatus: 'active'
            };

            mockUserRepo.create.mockResolvedValue(initialUser);
            mockUserRepo.findById.mockResolvedValue(initialUser);
            mockUserRepo.update.mockResolvedValue(updatedUser);

            const result = await adminService.create('student', {
                name: 'Carlos Ruiz',
                email: 'carlos.ruiz@medicina.pe',
                subscriptionTier: 'advanced',
                subscriptionStatus: 'active'
            });

            expect(mockUserRepo.update).toHaveBeenCalledWith('usr-adv-123', expect.objectContaining({
                subscriptionTier: 'advanced',
                subscriptionStatus: 'active',
                usageCount: 0,
                dailyAiUsage: 0,
                dailyRagUsage: 0,
                dailySimulatorUsage: 0,
                monthlyFlashcardsUsage: 0
            }));
            expect(result.tempPassword).toBeUndefined();
        });

        test('adminService.update calcula +4 meses para plan avanzado cuando no se envía fecha', async () => {
            mockUserRepo.findById.mockResolvedValue({
                id: 'u-target',
                subscriptionTier: 'free',
                subscriptionStatus: 'pending'
            });
            mockUserRepo.update.mockResolvedValue({
                id: 'u-target',
                subscriptionTier: 'advanced',
                subscriptionStatus: 'active'
            });

            await adminService.update('student', 'u-target', {
                subscriptionTier: 'advanced'
            });

            const updateArg = mockUserRepo.update.mock.calls[0][1];
            expect(updateArg.subscriptionTier).toBe('advanced');
            expect(updateArg.subscriptionStatus).toBe('active');
            expect(updateArg.subscriptionExpiresAt).toBeInstanceOf(Date);

            const diffMonths = (updateArg.subscriptionExpiresAt - new Date()) / (1000 * 60 * 60 * 24 * 30);
            expect(diffMonths).toBeCloseTo(4, 0);
        });

        test('adminService.update degrada a free y limpia fecha al pasar a expired o pending', async () => {
            mockUserRepo.findById.mockResolvedValue({
                id: 'u-target',
                subscriptionTier: 'basic',
                subscriptionStatus: 'active',
                subscriptionExpiresAt: new Date()
            });
            mockUserRepo.update.mockResolvedValue({
                id: 'u-target',
                subscriptionTier: 'free',
                subscriptionStatus: 'expired',
                subscriptionExpiresAt: null
            });

            await adminService.update('student', 'u-target', {
                subscriptionStatus: 'expired'
            });

            expect(mockUserRepo.update).toHaveBeenCalledWith('u-target', expect.objectContaining({
                subscriptionTier: 'free',
                subscriptionStatus: 'expired',
                subscriptionExpiresAt: null
            }));
        });
    });

    describe('2. Capa de Presentación (admin.js): Controladores de Alumnos y Mensajería (Ejecución Real)', () => {
        beforeEach(() => {
            global.safeHtmlValue = (val) => String(val || '');
            global.window = {
                resolveImageUrl: (url) => url,
                uiManager: {
                    registerMaterial: jest.fn(),
                    isResourceLocked: jest.fn()
                },
                confirmationModal: {
                    showAlert: jest.fn().mockResolvedValue(true)
                }
            };
        });

        test('displayStudents() renderiza tarjetas de alumnos sin botones de contraseña local (Google OAuth exclusivo)', () => {
            global.document = {
                addEventListener: jest.fn(),
                querySelector: jest.fn(),
                querySelectorAll: jest.fn(() => [])
            };

            let renderedHtml = '';
            const tabContainer = {
                set innerHTML(val) { renderedHtml = val; },
                get innerHTML() { return renderedHtml; }
            };
            global.document.getElementById = jest.fn((id) => (id === 'tab-students' ? tabContainer : null));

            const manager = Object.create(AdminManager.prototype);
            manager.tabSortState = { 'tab-students': 'date-desc' };
            manager.applySearchFilterForTab = jest.fn();
            manager.allStudents = [{
                id: 'std-oauth-1',
                name: 'Mariana Ríos',
                email: 'mariana.rios@gmail.com',
                subscriptionTier: 'basic',
                subscriptionStatus: 'active',
                created_at: '2026-01-01T00:00:00.000Z'
            }];

            manager.displayStudents();

            expect(renderedHtml).toContain('Mariana Ríos');
            expect(renderedHtml).toContain('mariana.rios@gmail.com');
            expect(renderedHtml).not.toContain('reset-pass-btn-small');
            expect(manager.applySearchFilterForTab).toHaveBeenCalledWith('tab-students');
        });

        test('handleResetPassword muestra alerta informativa de autenticación exclusiva Google OAuth', async () => {
            const manager = Object.create(AdminManager.prototype);
            manager.allStudents = [{ id: 'std-oauth-1', name: 'Carlos Ruiz' }];

            await manager.handleResetPassword('std-oauth-1');

            expect(global.window.confirmationModal.showAlert).toHaveBeenCalledWith(
                expect.stringContaining('Hub Academia utiliza autenticación exclusiva mediante Google OAuth'),
                'Autenticación Google OAuth'
            );
            expect(global.window.confirmationModal.showAlert.mock.calls[0][0]).toContain('Carlos Ruiz');
        });

        test('openGenericModal("student") sincroniza reactividad bidireccional entre tier, status y fecha de expiración', async () => {
            const makeSelect = (initial) => {
                const listeners = {};
                return {
                    value: initial,
                    addEventListener: jest.fn((ev, cb) => { listeners[ev] = cb; }),
                    trigger(ev) { if (listeners[ev]) listeners[ev](); }
                };
            };

            const tierSelect = makeSelect('free');
            const statusSelect = makeSelect('pending');
            const expiresInput = { value: '' };
            const titleEl = { textContent: '' };
            const modalEl = {
                style: { display: '' },
                querySelector: jest.fn((sel) => (sel === '.modal-header h2' ? titleEl : null)),
                querySelectorAll: jest.fn(() => [])
            };
            const formEl = { reset: jest.fn(), dataset: {} };
            const fieldsContainer = { innerHTML: '' };
            const saveBtn = { innerHTML: '', style: {} };

            global.document = {
                getElementById: jest.fn((id) => {
                    if (id === 'generic-modal') return modalEl;
                    if (id === 'generic-form-fields') return fieldsContainer;
                    if (id === 'generic-save-btn') return saveBtn;
                    if (id === 'generic-subscription-tier') return tierSelect;
                    if (id === 'generic-subscription-status') return statusSelect;
                    if (id === 'generic-subscription-expires-at') return expiresInput;
                    return null;
                })
            };

            const manager = Object.create(AdminManager.prototype);
            manager.genericModal = modalEl;
            manager.genericForm = formEl;
            manager.allStudents = [];
            manager.hydrateImagePreviews = jest.fn();

            await manager.openGenericModal('student');

            // Cambio a basic -> status active + expiración +2 meses
            tierSelect.value = 'basic';
            tierSelect.trigger('change');
            expect(statusSelect.value).toBe('active');
            expect(expiresInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);

            // Cambio a advanced -> status active + expiración +4 meses
            tierSelect.value = 'advanced';
            tierSelect.trigger('change');
            expect(statusSelect.value).toBe('active');
            expect(expiresInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);

            // Cambio a free -> degrade active a pending y limpia expiración
            tierSelect.value = 'free';
            tierSelect.trigger('change');
            expect(statusSelect.value).toBe('pending');
            expect(expiresInput.value).toBe('');
        });
    });

    describe('3. Componentes Visuales (components.js): Tarjeta de Alumno y Badges', () => {
        test('createAdminItemCardHTML omite botón reset-pass cuando no se solicita', () => {
            const student = {
                id: 'std_456',
                name: 'Luis Alarcón',
                email: 'luis.alarcon@gmail.com',
                subscriptionTier: 'basic',
                subscriptionStatus: 'active',
                subscriptionExpiresAt: '2026-11-05T00:00:00.000Z'
            };

            const html = createAdminItemCardHTML(student, 'student', `(${student.email})`);

            expect(html).toContain('Luis Alarcón');
            expect(html).toContain('luis.alarcon@gmail.com');
            expect(html).toContain('data-email="luis.alarcon@gmail.com"');
            expect(html).toContain('data-name="Luis Alarcón"');
            expect(html).toContain('admin-badge-blue');
            expect(html).toContain('BASIC');
            expect(html).toContain('admin-badge-green');
            expect(html).toContain('ACTIVE');
            expect(html).toContain('📅 Expira:');
            expect(html).not.toContain('reset-pass-btn-small');
            expect(html).toContain('edit-btn-small');
            expect(html).toContain('delete-btn-small');
        });
    });
});
