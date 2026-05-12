/**
 * Simulator Dashboard Logic
 * Handles Context-Aware Stats Fetching
 */

const SimulatorDash = (() => {

    // Configuración Extendida de Dominios (v3.0)
    const contexts = {
        'MEDICINA': {
            title: 'Ciencias de la Salud',
            heroTitle: 'Ciencias de la Salud',
            quizParams: '', // Eliminado el fallback automático. Ahora se fuerza la configuración.
            studyDesc: '20 preguntas. Para un aprendizaje profundo con explicación médica.',
            realDesc: '100 preguntas con límite de tiempo. Simulación completa del SERUMS.',
            sectionIcon: 'fa-stethoscope',
            targets: [
                { value: 'ENAM', label: 'ENAM', disabled: true, subtitle: '(Próximamente)' },
                { value: 'SERUMS', label: 'SERUMS', checked: true },
                { value: 'RESIDENTADO', label: 'RESIDENTADO', disabled: true, subtitle: '(Beta / Trabajando)' }
            ],
            areas: [
                { label: 'Ciencias Básicas', areas: ['Anatomía', 'Fisiología', 'Farmacología', 'Microbiología y Parasitología'], bg: 'rgba(234, 179, 8, 0.7)', border: '#eab308' },
                { label: 'Las 4 Grandes', areas: ['Medicina Interna', 'Pediatría', 'Ginecología y Obstetricia', 'Cirugía General'], bg: 'rgba(59, 130, 246, 0.7)', border: '#3b82f6' },
                { label: 'Especialidades Clínicas', areas: ['Cardiología', 'Gastroenterología', 'Neurología', 'Nefrología', 'Neumología', 'Endocrinología', 'Infectología', 'Reumatología', 'Traumatología'], bg: 'rgba(99, 102, 241, 0.7)', border: '#6366f1' },
                { label: 'Salud Pública y Gestión', areas: ['Salud Pública', 'Cuidado Integral de Salud', 'Ética e Interculturalidad', 'Investigación', 'Gestión de Servicios de Salud'], bg: 'rgba(16, 185, 129, 0.7)', border: '#10b981' }
            ]
        },
        'EDUCACION': {
            title: 'Docente Pro',
            heroTitle: 'Preparación Magisterial',
            quizParams: '', // Eliminado el fallback automático.
            studyDesc: '20 preguntas. Enfoque en rúbricas y casos pedagógicos reales.',
            realDesc: '60 preguntas integradas. Simulación exacta del examen de Ascenso Docente.',
            sectionIcon: 'fa-chalkboard-teacher',
            images: {
                study: '/assets/Modo Estudio-v2.webp',
                flashcards: '/assets/Flashcards-v2.webp',
                real: '/assets/Simulacro Real-v2.webp'
            },
            targets: [
                { value: 'NOMBRAMIENTO', label: 'NOMBRAMIENTO', disabled: true, subtitle: '(Próximamente)' },
                { value: 'ASCENSO', label: 'ASCENSO', checked: true, subtitle: 'Escala Magisterial' },
                { value: 'ACCESO_CARGOS', label: 'ACCESO A CARGOS', disabled: true, subtitle: 'Directivos (Beta)' }
            ],
            careerOptions: [
                { value: 'EBR - Inicial', label: 'EBR - Nivel Inicial' },
                { value: 'EBR - Primaria', label: 'EBR - Nivel Primaria' },
                { value: 'EBR - Secundaria', label: 'EBR - Nivel Secundaria' }
            ],
            primarySpecialties: [
                'General', 'Profesor de Innovación Pedagógica', 'Educación Física'
            ],
            secondarySpecialties: [
                'Arte y Cultura', 'Ciencias Sociales', 'Ciencia y Tecnología', 'Comunicación',
                'Desarrollo Personal, Ciudadanía y Cívica', 'Educación Física',
                'Educación Religiosa', 'Educación para el Trabajo',
                'Inglés como Lengua Extranjera', 'Matemática', 'Profesor de Innovación Pedagógica'
            ],
            areas: [
                { label: 'Habilidades Generales', areas: ['Comprensión Lectora', 'Razonamiento Lógico'], bg: 'rgba(234, 179, 8, 0.7)', border: '#eab308', conditionalTarget: 'NOMBRAMIENTO' },
                { label: 'Prueba Nacional Integrada', areas: ['Conocimientos Pedagógicos y de la Especialidad'], bg: 'rgba(59, 130, 246, 0.7)', border: '#3b82f6', conditionalTarget: 'ASCENSO' },
                { label: 'Conocimientos Pedagógicos y Curriculares', areas: ['Teorías del Aprendizaje y Desarrollo', 'Principios del Currículo Nacional (CNEB)', 'Planificación Curricular (PCI, PCA, Unidades)', 'Evaluación Formativa y Retroalimentación', 'Convivencia Escolar y Clima de Aula', 'Principios de la Educación Peruana'], bg: 'rgba(59, 130, 246, 0.7)', border: '#3b82f6', conditionalTarget: 'NOMBRAMIENTO' },
                { label: 'Gestión Institucional', areas: ['Liderazgo Pedagógico', 'Planificación Estratégica (PEI, PAT)', 'Gestión del Riesgo de Desastres', 'Monitoreo y Acompañamiento'], bg: 'rgba(249, 115, 22, 0.7)', border: '#f97316', conditionalTarget: 'ACCESO_CARGOS' }
            ]
        },
        'IDIOMAS': {
            title: 'Language Hub',
            heroTitle: 'Mastery & Fluency',
            quizParams: '?target=MCER&level=B2',
            studyDesc: '20 topics. Deep grammar analysis and vocabulary immersion.',
            realDesc: '80 questions. Mock exam following international certification standards (B1, B2, C1).',
            sectionIcon: 'fa-language',
            targets: [
                { value: 'MCER', label: 'MCER (B1-C1)', checked: true }
            ],
            areas: [
                { label: 'Core Skills', areas: ['Grammar', 'Vocabulary', 'Use of English'], bg: 'rgba(59, 130, 246, 0.7)', border: '#3b82f6' },
                { label: 'Communication', areas: ['Listening Comprehension', 'Reading Analysis', 'Writing Structures'], bg: 'rgba(16, 185, 129, 0.7)', border: '#10b981' },
                { label: 'Soft Skills', areas: ['Idioms & Phrasal Verbs', 'Business Communication'], bg: 'rgba(234, 179, 8, 0.7)', border: '#eab308' }
            ]
        }
    };

    let currentContext = 'MEDICINA'; 
    let activeConfig = null; 
    let activeMode = null;   
    let activeDays = null;   
    let lineChartInst = null;
    let radarChartInst = null;

    // Se inicializará dinámicamente según el contexto
    let examAreasGrouped = [];
    let areaToGroupMap = {};

    function renderBarChart(cleanRadarMap) {
        // Obsolete Chart.js fallback support (just in case)
        if (radarChartInst) { radarChartInst.destroy(); radarChartInst = null; }

        const emptyState = document.getElementById('radar-empty-state');
        const container = document.getElementById('native-bars-container');
        if (!container) return;

        // Flatten mapping to list of active items
        const activeSubjects = Object.keys(cleanRadarMap)
            .filter(subject => cleanRadarMap[subject].total > 0)
            .map(subject => {
                const acc = Math.round((cleanRadarMap[subject].correct / cleanRadarMap[subject].total) * 100) || 0;
                // Find group info (fallback to 'Otros' if subject not found)
                const gInfo = areaToGroupMap[subject] || {
                    groupLabel: 'Otros',
                    bg: 'rgba(148, 163, 184, 0.7)', // Slate
                    border: '#94a3b8',
                    order: 99
                };
                return {
                    name: subject, acc,
                    correct: cleanRadarMap[subject].correct,
                    total: cleanRadarMap[subject].total,
                    ...gInfo
                };
            });

        if (activeSubjects.length === 0) {
            if (emptyState) emptyState.style.display = 'flex';
            container.style.display = 'none';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        container.style.display = 'flex';
        container.innerHTML = ''; // Limpiar barras anteriores

        // Agrupar los resultados por su Categoría Principal (Las 4 Grandes, Ciencias Básicas, etc.)
        const groups = {};
        activeSubjects.forEach(s => {
            if (!groups[s.groupLabel]) {
                groups[s.groupLabel] = {
                    label: s.groupLabel,
                    order: s.order,
                    items: []
                };
            }
            groups[s.groupLabel].items.push(s);
        });

        // Ordenar los grupos según el orden base establecido
        const sortedGroups = Object.values(groups).sort((a, b) => a.order - b.order);

        // Render HTML Blocks
        sortedGroups.forEach((group, index) => {
            // Ordenar ítems dentro de su grupo por precisión (descendente)
            group.items.sort((a, b) => b.acc - a.acc);

            // Inyectar Título / Línea Divisoria del Grupo
            const groupHeader = document.createElement('div');
            groupHeader.className = 'html-chart-group-header';
            groupHeader.innerHTML = `<span>${group.label}</span>`;
            // Pequeña distancia top extra salvo que sea el primer render
            if (index > 0) groupHeader.style.marginTop = '1rem';
            container.appendChild(groupHeader);

            // Inyectar Barras Individuales
            group.items.forEach((item, itemIdx) => {
                const barRow = document.createElement('div');
                barRow.className = 'html-bar-row';
                barRow.innerHTML = `
                    <div class="html-bar-info">
                        <span class="html-bar-label">${item.name}</span>
                        <span class="html-bar-value">${item.acc}% <span style="font-size:0.72rem;opacity:0.45;font-weight:400;">(${item.correct}/${item.total} q)</span></span>
                    </div>
                    <div class="html-bar-track">
                        <div class="html-bar-fill" data-width="${item.acc}%" style="width: 0%; background: ${item.bg}; border: 1px solid ${item.border};"></div>
                    </div>
                `;
                container.appendChild(barRow);
            });
        });

        // Lanzar animación fluida con un requestAnimationFrame para asegurar que el DOM inicializó con width 0%
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const fills = container.querySelectorAll('.html-bar-fill');
                fills.forEach(fill => {
                    const targetWidth = fill.getAttribute('data-width');
                    fill.style.width = targetWidth;
                });
            });
        });
    }

    // ── Tabs de Modo (Todos / Rápido / Estudio) ────────────
    function setupModeTabs() {
        const tabs = document.querySelectorAll('.kpi-mode-tab');
        if (!tabs.length) return;

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Actualizar estado activo
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Estilos visuales
                tabs.forEach(t => {
                    t.style.background = 'transparent';
                    t.style.color = '#475569';
                });
                tab.style.background = 'rgba(59,130,246,0.2)';
                tab.style.color = '#93c5fd';

                const val = tab.dataset.mode;
                activeMode = val === 'all' ? null : parseInt(val);

                // Re-cargar stats con el nuevo filtro
                const token = localStorage.getItem('authToken');
                if (token) {
                    loadStats();
                    loadEvolution();
                }
            });
        });
    }

    // ── Tabs de Tiempo (Histórico / 30d / 7d) ────────────
    function setupTimeTabs() {
        const tabs = document.querySelectorAll('.kpi-time-tab');
        if (!tabs.length) return;

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Actualizar estado activo
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Estilos visuales
                tabs.forEach(t => {
                    t.style.background = 'transparent';
                    t.style.color = '#475569';
                });
                tab.style.background = 'rgba(139,92,246,0.2)';
                tab.style.color = '#c4b5fd';

                const val = tab.dataset.days;
                activeDays = val === 'all' ? null : parseInt(val);

                // Re-cargar stats con el nuevo filtro
                const token = localStorage.getItem('authToken');
                if (token) {
                    loadStats();
                    loadEvolution();
                }
            });
        });
    }

    async function init() {
        const urlParams = new URLSearchParams(window.location.search);
        currentContext = (urlParams.get('context') || 'MEDICINA').toUpperCase();

        // 0. Initialize Context-Aware Data Structures
        const ctxConfig = contexts[currentContext] || contexts['MEDICINA'];
        examAreasGrouped = ctxConfig.areas || [];
        areaToGroupMap = {};
        examAreasGrouped.forEach((g, gIndex) => {
            g.areas.forEach(a => {
                areaToGroupMap[a] = {
                    groupLabel: g.label,
                    bg: g.bg,
                    border: g.border,
                    order: gIndex
                };
            });
        });

        // 1. Setup UI Context
        const titleEl = document.getElementById('ctx-title');
        const iconEl = document.getElementById('ctx-icon');

        if (titleEl) titleEl.textContent = ctxConfig.title;

        // Update analytics section icon based on domain
        const sectionHeading = document.querySelector('.section-heading');
        if (sectionHeading && ctxConfig.sectionIcon) {
            const icon = sectionHeading.querySelector('i');
            if (icon) {
                icon.className = `fas ${ctxConfig.sectionIcon}`;
            }
        }

        // ✅ UPDATE MODE IMAGES IF DEFINED IN CONTEXT
        if (ctxConfig.images) {
            const studyImg = document.querySelector('#btn-mode-study img');
            const flashImg = document.querySelector('#btn-mode-flash img');
            const realImg = document.querySelector('#btn-mode-real img');

            if (studyImg && ctxConfig.images.study) studyImg.src = ctxConfig.images.study;
            if (flashImg && ctxConfig.images.flashcards) flashImg.src = ctxConfig.images.flashcards;
            if (realImg && ctxConfig.images.real) realImg.src = ctxConfig.images.real;
        }

        // Dynamically render exam target radio buttons
        if (ctxConfig.targets) {
            const targetContainer = document.querySelector('#config-modal-overlay .modal-section-title + div');
            if (targetContainer) {
                targetContainer.style.gridTemplateColumns = `repeat(${ctxConfig.targets.length}, 1fr)`;
                targetContainer.innerHTML = '';
                ctxConfig.targets.forEach(t => {
                    const label = document.createElement('label');
                    label.className = `exam-target-option ${t.disabled ? 'target-option--disabled' : ''}`;
                    const subtitleHtml = t.subtitle
                        ? `<span style="display:block;font-size:0.6rem;opacity:0.7;font-weight:400;">${t.subtitle}</span>`
                        : '';
                    label.innerHTML = `
                        <input type="radio" name="examTarget" value="${t.value}" ${t.checked ? 'checked' : ''} ${t.disabled ? 'disabled' : ''}>
                        <div class="target-card" style="${t.disabled ? 'opacity: 0.4; cursor: not-allowed; border-color: rgba(255,255,255,0.05);' : ''}">${t.label}${subtitleHtml}</div>
                    `;
                    targetContainer.appendChild(label);
                });
            }

            // Hide SERUMS-specific UI if not a medical context
            if (currentContext !== 'MEDICINA') {
                const serumsInfo = document.getElementById('serums-info-alert');
                const careerBox = document.getElementById('serums-career-container');
                if (serumsInfo) serumsInfo.style.display = 'none';
                if (careerBox) careerBox.style.display = 'none';
            }

            // Render Modalidad/Nivel selector for Education context
            if (ctxConfig.careerOptions) {
                const careerBox = document.getElementById('serums-career-container');
                if (careerBox) {
                    careerBox.style.display = 'block';
                    const careerTitle = careerBox.querySelector('.modal-section-title');
                    if (careerTitle) careerTitle.textContent = 'Modalidad / Nivel';

                    const selectEl = document.getElementById('config-career');
                    if (selectEl) {
                        selectEl.innerHTML = '';
                        ctxConfig.careerOptions.forEach(opt => {
                            const option = document.createElement('option');
                            option.value = opt.value;
                            option.textContent = opt.label;
                            selectEl.appendChild(option);
                        });

                        // Dynamic Specialty Selector - Defined globally within setupConfigModal or init to be accessible
                        window._updateEduSpecialties = (preselectedSpecialty = null) => {
                            const level = selectEl.value;
                            let specialtyContainer = document.getElementById('edu-specialty-container');
                            
                            if (!specialtyContainer) {
                                specialtyContainer = document.createElement('div');
                                specialtyContainer.id = 'edu-specialty-container';
                                specialtyContainer.style.marginTop = '0.75rem';
                                careerBox.appendChild(specialtyContainer);
                            }

                            if (level === 'EBR - Inicial') {
                                specialtyContainer.style.display = 'none';
                                specialtyContainer.innerHTML = '';
                            } else {
                                specialtyContainer.style.display = 'block';
                                const specs = (level === 'EBR - Primaria') ? ctxConfig.primarySpecialties : ctxConfig.secondarySpecialties;
                                specialtyContainer.innerHTML = `
                                    <h4 class="modal-section-title" style="font-size:0.75rem; color:#94a3b8; margin-bottom:0.5rem;">Especialidad (${level.replace('EBR - ', '')})</h4>
                                    <select id="config-specialty">
                                        ${specs.map(s => `<option value="${s}" ${s === preselectedSpecialty ? 'selected' : ''}>${s}</option>`).join('')}
                                    </select>
                                `;
                            }
                        };

                        selectEl.addEventListener('change', () => window._updateEduSpecialties());
                        // Initial call will be handled by setupConfigModal to ensure consistency with loaded config
                    }
                }
            }
        }

        // Update card descriptions
        const studyDescEl = document.querySelector('#btn-mode-study .mode-desc');
        const realDescEl = document.querySelector('#btn-mode-real .mode-desc');
        if (studyDescEl) studyDescEl.textContent = ctxConfig.studyDesc;
        if (realDescEl) realDescEl.textContent = ctxConfig.realDesc;

        // 2. Setup Config Modal Logic & Load Persistent Config
        setupConfigModal();
        // bindModeClicks(); REMOVED TO PREVENT DOUBLE BINDING

        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                // Fetch preferences from API instead of localStorage
                const res = await fetch(`${window.AppConfig.API_URL}/api/users/preferences?domain=${currentContext.toLowerCase()}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const prefData = await res.json();

                if (prefData && prefData.data) {
                    activeConfig = prefData.data;
                    // Keep localStorage in sync for legacy code
                    localStorage.setItem('simActiveConfig', JSON.stringify(activeConfig));
                } else {
                    // Fallback to localStorage if API has nothing
                    const savedConfig = localStorage.getItem('simActiveConfig');
                    if (savedConfig) activeConfig = JSON.parse(savedConfig);
                }

                const summaryBox = document.getElementById('active-config-summary');
                if (summaryBox && activeConfig) {
                    summaryBox.style.display = 'flex';
                    const targetDisplay = activeConfig.career
                        ? `${activeConfig.target} (${activeConfig.career})`
                        : activeConfig.target;

                    summaryBox.innerHTML = `
                        <i class="fas fa-filter"></i> 
                        <span><strong>Filtro Recuperado:</strong> ${targetDisplay} | ${activeConfig.areas ? activeConfig.areas.length : 0} áreas</span>
                    `;
                }
            } catch (e) {
                console.error("Error loading saved config from API", e);
            }
        }

        // 3. Setup Links (Modes) with initial default
        updateModeLinks(ctxConfig);
        bindModeClicks();

        // 4. Fetch Stats or Demo Data
        if (token) {
            // ✅ Sincronizar usuario para tener contadores de límites actualizados
            if (window.sessionManager) {
                await window.sessionManager.refreshUser();
            }
            setupModeTabs();
            setupTimeTabs();
            await loadStats();
            await loadEvolution();
        } else {
            console.log("👤 Modo Invitado: Usando datos de demostración estáticos.");
            renderGuestDemoData();
        }

        // 5. Tooltip para usuarios nuevos sin configuración
        if (!activeConfig) showFirstVisitTip();
    }

    function showFirstVisitTip() {
        const btn = document.getElementById('btn-start-config');
        if (!btn) return;

        // --- NEON PULSE: Persiste hasta que el usuario guarde una configuración ---
        const pulseStyle = document.createElement('style');
        pulseStyle.id = 'neon-pulse-style';
        pulseStyle.textContent = `
            @keyframes neonPulse {
                0%, 100% { box-shadow: 0 0 5px rgba(96,165,250,0.4), 0 0 15px rgba(96,165,250,0.15); }
                50%      { box-shadow: 0 0 12px rgba(96,165,250,0.7), 0 0 30px rgba(96,165,250,0.25), 0 0 4px rgba(96,165,250,0.5) inset; }
            }
            #btn-start-config.neon-active {
                animation: neonPulse 2s ease-in-out infinite;
                border-color: rgba(96,165,250,0.5) !important;
            }
        `;
        document.head.appendChild(pulseStyle);
        btn.classList.add('neon-active');

        // --- TOOLTIP: Solo se muestra una vez, 15 segundos ---
        if (localStorage.getItem('hasSeenConfigTip')) return;

        const tip = document.createElement('div');
        tip.id = 'config-tip';
        tip.innerHTML = `
            <style>
                #config-tip {
                    position: absolute;
                    top: calc(100% + 12px);
                    right: 0;
                    background: rgba(15, 23, 42, 0.95);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(96, 165, 250, 0.3);
                    border-radius: 14px;
                    padding: 0.9rem 1.1rem;
                    color: #e2e8f0;
                    font-size: 0.82rem;
                    line-height: 1.5;
                    width: 240px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(96,165,250,0.1);
                    z-index: 100;
                    animation: tipFadeIn 0.5s ease-out;
                }
                #config-tip::before {
                    content: '';
                    position: absolute;
                    top: -7px;
                    right: 24px;
                    width: 12px;
                    height: 12px;
                    background: rgba(15, 23, 42, 0.95);
                    border-top: 1px solid rgba(96, 165, 250, 0.3);
                    border-left: 1px solid rgba(96, 165, 250, 0.3);
                    transform: rotate(45deg);
                }
                #config-tip .tip-icon { color: #60a5fa; margin-right: 4px; }
                @keyframes tipFadeIn {
                    from { opacity: 0; transform: translateY(-6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            </style>
            <i class="fas fa-lightbulb tip-icon"></i>
            <strong>Tip:</strong> Tu simulador está configurado por defecto. Personaliza tu meta y áreas de estudio aquí.
        `;

        btn.parentElement.style.position = 'relative';
        btn.parentElement.appendChild(tip);

        const dismissTip = () => {
            if (!document.getElementById('config-tip')) return;
            tip.style.animation = 'tipFadeIn 0.3s ease-out reverse forwards';
            setTimeout(() => tip.remove(), 300);
            localStorage.setItem('hasSeenConfigTip', 'true');
        };

        // Auto-dismiss after 15 seconds
        setTimeout(dismissTip, 15000);
        // Also dismiss when clicking the config button
        btn.addEventListener('click', dismissTip, { once: true });
    }

    function updateModeLinks(ctxConfig) {
        const token = localStorage.getItem('authToken');
        let baseParams = `${ctxConfig.quizParams}&context=${currentContext}`;
        
        // Corrección: Si no hay params por defecto (ahora están vacíos), quitamos el '&'
        if (baseParams.startsWith('&')) baseParams = `?context=${currentContext}`;

        // Append Custom Config if active
        if (activeConfig) {
            baseParams = `?target=${encodeURIComponent(activeConfig.target)}&areas=${encodeURIComponent(activeConfig.areas.join(','))}&context=${currentContext}`;
            if (activeConfig.target === 'SERUMS' && activeConfig.career) {
                baseParams += `&career=${encodeURIComponent(activeConfig.career)}`;
            }
        }

        // 1. Arcade/Quick (10 questions)
        const btnArcade = document.getElementById('btn-mode-arcade');
        if (btnArcade) {
            const separator = baseParams.includes('?') ? '&' : '?';
            const demoFlag = !token ? '&demo=true' : '';
            btnArcade.href = `quiz${baseParams}${separator}limit=10${demoFlag}`;
        }

        // 2. Study Mode (20 questions)
        const btnStudy = document.getElementById('btn-mode-study');
        if (btnStudy) {
            const separator = baseParams.includes('?') ? '&' : '?';
            const demoFlag = !token ? '&demo=true' : '';
            btnStudy.href = `quiz${baseParams}${separator}limit=20${demoFlag}`;
        }

        // 3. Real Mock (100 questions - STRICTLY DB ONLY)
        const btnReal = document.getElementById('btn-mode-real');
        if (btnReal) {
            const separator = baseParams.includes('?') ? '&' : '?';
            btnReal.href = `quiz${baseParams}${separator}limit=100`;
        }
    }

    /**
     * Intercept clicks on mode buttons to validate freemium limits
     */
    function bindModeClicks() {
        const ids = ['btn-mode-arcade', 'btn-mode-study', 'btn-mode-real'];
        ids.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', (e) => {
                    const token = localStorage.getItem('authToken');

                    // 1. Visitante check (Redirección Únete)
                    if (!token && window.uiManager) {
                        // EXCEPCIÓN: Permitir Modo Rápido (Arcade) para Invitados con LÍMITE
                        const isArcade = id === 'btn-mode-arcade';

                        if (isArcade) {
                            // 🔄 REINICIO DIARIO: Reseteamos contador si es un nuevo día
                            const today = new Date().toDateString();
                            const lastDemoDate = localStorage.getItem('demo_sessions_date');
                            let sessionsSent = parseInt(localStorage.getItem('demo_sessions_count') || '0');

                            if (lastDemoDate !== today) {
                                sessionsSent = 0;
                                localStorage.setItem('demo_sessions_count', '0');
                                localStorage.setItem('demo_sessions_date', today);
                            }

                            if (sessionsSent >= 3) {
                                e.preventDefault();
                                e.stopPropagation();
                                window.uiManager.showAuthPromptModal();
                                return;
                            }
                        } else {
                            // Para cualquier otro modo (Estudio, Real, Flashcards) - Bloquear directo
                            e.preventDefault();
                            e.stopPropagation();
                            window.uiManager.showAuthPromptModal();
                            return;
                        }
                    }

                    // 🛡️ GATEKEEPER DE CONFIGURACIÓN (Solo para Registrados)
                    // Evita que inicien un examen en blanco o que se mezclen áreas por defecto
                    if (token && !activeConfig) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const btnOpen = document.getElementById('btn-start-config');
                        if (btnOpen) {
                            btnOpen.click(); // Abrimos el modal
                            
                            // Efecto visual para hacer énfasis en que deben configurar
                            const modalContent = document.querySelector('.config-modal-content');
                            if (modalContent) {
                                modalContent.style.animation = 'shake 0.4s ease-in-out';
                                setTimeout(() => modalContent.style.animation = '', 400);
                            }
                            
                            // Si no existe la animación global, la añadimos dinámicamente
                            if (!document.getElementById('shake-anim')) {
                                const style = document.createElement('style');
                                style.id = 'shake-anim';
                                style.textContent = `@keyframes shake { 0%, 100% {transform: translateX(0);} 25% {transform: translateX(-10px);} 75% {transform: translateX(10px);} }`;
                                document.head.appendChild(style);
                            }
                        }
                        return;
                    }

                    // 2. Block disabled modes
                    if (btn.classList.contains('mode-card--disabled')) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }

                    if (window.uiManager && typeof window.uiManager.validateFreemiumAction === 'function') {
                        // Returns false and calls showPaywallModal() if limit reached
                        // Pasamos 'simulator' para que valide contra los límites de 15/40
                        if (!window.uiManager.validateFreemiumAction(e, 'simulator')) return;
                    }
                });
            }
        });
    }

    function setupConfigModal() {
        const modal = document.getElementById('config-modal-overlay');
        const btnOpen = document.getElementById('btn-start-config');
        const btnClose = document.getElementById('btn-close-config');
        const btnSave = document.getElementById('btn-save-config');
        const radioTargets = document.querySelectorAll('.exam-target-option input');
        const areasGrid = document.getElementById('config-areas-grid');
        const summaryBox = document.getElementById('active-config-summary');

        if (!modal || !btnOpen || !areasGrid) return; // Guard for non-dashboard pages

        // Render grouped checkboxes with sub-headers
        const renderAreas = (target) => {
            areasGrid.innerHTML = '';
            
            // For ASCENSO: It's an integrated exam, so we hide the grid and select the integrated area
            if (target === 'ASCENSO') {
                areasGrid.style.display = 'none';
                return;
            }

            areasGrid.style.display = 'flex';
            areasGrid.style.flexDirection = 'column';
            areasGrid.style.gap = '1rem';

            // Filter groups: SERUMS shows only its group for non-MD careers, conditional groups depend on target
            let groupsToRender = examAreasGrouped.filter(g => {
                if (g.conditionalTarget && g.conditionalTarget !== target) return false;
                
                // 🛡️ REGLA SERUMS: Solo Medicina Humana ve las áreas clínicas.
                // 🛡️ REGLA SERUMS: Solo se muestra el Grupo D (Salud Pública y Gestión) para TODOS.
                if (currentContext === 'MEDICINA' && target === 'SERUMS') {
                    if (!g.label.includes('Salud Pública')) return false;
                }
                
                return true;
            });

            groupsToRender.forEach(group => {
                // Group header
                const header = document.createElement('div');
                const accentColor = currentContext === 'EDUCACION' ? '#f97316' : '#60a5fa';
                header.style.cssText = `font-size:0.75rem; color:${accentColor}; text-transform:uppercase; letter-spacing:0.05em; font-weight:600; margin-top:0.25rem; padding-bottom:0.3rem; border-bottom:1px solid ${accentColor}26;`;
                header.textContent = group.label;
                areasGrid.appendChild(header);

                // Checkbox grid for this group
                const grid = document.createElement('div');
                grid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;';

                group.areas.forEach(area => {
                    const label = document.createElement('label');
                    label.className = 'area-checkbox-label';

                    let isChecked = true;
                    if (activeConfig && activeConfig.target === target && activeConfig.areas) {
                        isChecked = activeConfig.areas.includes(area);
                    }

                    label.innerHTML = `<input type="checkbox" value="${area}" ${isChecked ? 'checked' : ''}> ${area}`;
                    grid.appendChild(label);
                });

                areasGrid.appendChild(grid);
            });
        };

        // Open Modal
        if (btnOpen) {
            btnOpen.onclick = (e) => {
                const token = localStorage.getItem('authToken');
                if (!token && window.uiManager) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.uiManager.showAuthPromptModal();
                    return;
                }

                e.preventDefault();
                console.log("Abriendo modal de configuración...");
                modal.classList.add('active'); // Mantiene consistencia con el dashboard.css si aplica
                modal.style.display = 'flex';
                modal.style.visibility = 'visible';
                modal.style.zIndex = '99999';
                modal.style.opacity = '1';

                if (window.uiManager && typeof window.uiManager.pushModalState === 'function') {
                    window.uiManager.pushModalState('config-modal-overlay');
                }

                // Trigger initial render safely
                const ctxConfig = contexts[currentContext] || contexts['MEDICINA'];
                const defaultTarget = (ctxConfig.targets && ctxConfig.targets.find(t => t.checked)) ? ctxConfig.targets.find(t => t.checked).value : 'ENAM';
                let activeTarget = defaultTarget;
                if (activeConfig) {
                    activeTarget = activeConfig.target || defaultTarget;

                    const targetRadio = document.querySelector(`.exam-target-option input[value="${activeTarget}"]`);
                    if (targetRadio) targetRadio.checked = true;
                } else {
                    const checkedEl = document.querySelector('.exam-target-option input:checked');
                    if (checkedEl) activeTarget = checkedEl.value;
                }

                // Show/hide SERUMS-specific UI (only for medicine)
                if (currentContext === 'MEDICINA') {
                    const serumsInfo = document.getElementById('serums-info-alert');
                    if (serumsInfo) serumsInfo.style.display = activeTarget === 'SERUMS' ? 'block' : 'none';
                    const careerBox = document.getElementById('serums-career-container');
                    if (careerBox) careerBox.style.display = activeTarget === 'SERUMS' ? 'block' : 'none';
                }

                // For education: career selector is always visible, managed by init()
                if (currentContext === 'EDUCACION') {
                    const careerBox = document.getElementById('serums-career-container');
                    if (careerBox) careerBox.style.display = 'block';
                }

                const careerSelect = document.getElementById('config-career');
                if (activeConfig && activeConfig.career && careerSelect) {
                    const careerParts = activeConfig.career.split(' - ');
                    const level = (careerParts[0] && careerParts[1]) ? `${careerParts[0]} - ${careerParts[1]}` : careerParts[0];
                    const specialty = careerParts[2] || null;

                    careerSelect.value = level;
                    if (window._updateEduSpecialties) {
                        window._updateEduSpecialties(specialty);
                    }
                } else if (window._updateEduSpecialties) {
                    // Default for first time or no config
                    if (careerSelect) careerSelect.value = 'EBR - Primaria';
                    window._updateEduSpecialties();
                }

                // 🔄 Medicina: Listener para cambio de carrera (Afecta áreas SERUMS)
                if (currentContext === 'MEDICINA') {
                    const careerSelect = document.getElementById('config-career');
                    if (careerSelect) {
                        careerSelect.addEventListener('change', () => {
                            const activeTargetEl = document.querySelector('.exam-target-option input:checked');
                            if (activeTargetEl) renderAreas(activeTargetEl.value);
                        });
                    }
                }

                renderAreas(activeTarget);
            };
        }

        // Close Modal
        const closeModal = () => {
            if (window.uiManager && typeof window.uiManager.popModalState === 'function') {
                window.uiManager.popModalState('config-modal-overlay');
            }
            modal.classList.remove('active');
            modal.style.opacity = '0';
            modal.style.visibility = 'hidden';
            setTimeout(() => { modal.style.display = 'none'; }, 300); // Transition buffer
        };
        if (btnClose) btnClose.onclick = closeModal;
        modal.onclick = (e) => { if (e.target === modal) closeModal(); }

        // Change Target Event
        radioTargets.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    const t = e.target.value;

                    // Toggle SERUMS-specific UI (medicine only)
                    if (currentContext === 'MEDICINA') {
                        const serumsInfo = document.getElementById('serums-info-alert');
                        if (serumsInfo) serumsInfo.style.display = t === 'SERUMS' ? 'block' : 'none';
                        const careerBox = document.getElementById('serums-career-container');
                        if (careerBox) careerBox.style.display = t === 'SERUMS' ? 'block' : 'none';
                    }

                    // Default area selection logic
                    let defaultAreas = [];
                    if (t === 'ENAM') {
                        defaultAreas = examAreasGrouped.filter(g => g.label !== 'Ciencias Básicas' && !g.conditionalTarget).flatMap(g => g.areas);
                    } else if (t === 'SERUMS') {
                        const healthGroup = examAreasGrouped.find(g => g.label.includes('Salud Pública'));
                        defaultAreas = healthGroup ? healthGroup.areas : examAreasGrouped[0].areas;
                    } else {
                        // For education and other targets: select all non-conditional + matching conditional
                        defaultAreas = examAreasGrouped
                            .filter(g => !g.conditionalTarget || g.conditionalTarget === t)
                            .flatMap(g => g.areas);
                    }

                    if (activeConfig) {
                        activeConfig.target = t;
                        activeConfig.areas = defaultAreas;
                    } else {
                        activeConfig = { target: t, areas: defaultAreas };
                    }
                    renderAreas(t);
                }
            });
        });

        // Save Config
        if (btnSave) {
            btnSave.onclick = async () => {
                const target = document.querySelector('.exam-target-option input:checked').value;
                let selectedAreas = Array.from(areasGrid.querySelectorAll('input:checked')).map(cb => cb.value);
                
                // For ASCENSO: Force the integrated area
                if (target === 'ASCENSO') {
                    selectedAreas = ['Conocimientos Pedagógicos y de la Especialidad'];
                }

                const careerSelectEl = document.getElementById('config-career');
                const ctxCfg = contexts[currentContext] || contexts['MEDICINA'];
                let career = null;

                if (currentContext === 'MEDICINA' && target === 'SERUMS' && careerSelectEl) {
                    career = careerSelectEl.value;
                } else if (ctxCfg.careerOptions && careerSelectEl) {
                    career = careerSelectEl.value;
                    // Append specialty for Primaria (if not General) or Secundaria
                    const specSelect = document.getElementById('config-specialty');
                    if (specSelect && specSelect.value && specSelect.value !== 'General') {
                        career = `${career} - ${specSelect.value}`;
                    }
                }

                if (selectedAreas.length === 0) {
                    alert('Debes seleccionar al menos un área de estudio.');
                    return;
                }

                // Show basic loading state on button
                const originalText = btnSave.innerHTML;
                btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
                btnSave.disabled = true;

                activeConfig = { target, areas: selectedAreas, career };
                localStorage.setItem('simActiveConfig', JSON.stringify(activeConfig)); // Persist locally

                const token = localStorage.getItem('authToken');
                if (token) {
                    try {
                        // Persist to Database for Cross-Device Sync
                        await fetch(`${window.AppConfig.API_URL}/api/users/preferences`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                domain: currentContext.toLowerCase(),
                                config_json: activeConfig
                            })
                        });
                    } catch (err) {
                        console.error("Error saving preferences to backend", err);
                    }
                }

                btnSave.innerHTML = originalText;
                btnSave.disabled = false;

                // Update UI Summary
                summaryBox.style.display = 'flex';
                const targetDisplay = career
                    ? `${target} (${career})`
                    : target;

                summaryBox.innerHTML = `
                    <i class="fas fa-filter"></i> 
                    <span><strong>Filtro Activo:</strong> ${targetDisplay} | ${selectedAreas.length} áreas seleccionadas</span>
                `;

                // Update Links
                updateModeLinks(contexts[currentContext] || contexts['MEDICINA']);

                // Quitar efecto neón — ya configuró
                const cfgBtn = document.getElementById('btn-start-config');
                if (cfgBtn) cfgBtn.classList.remove('neon-active');

                // Relanzar fetch a base de datos de inmediato con nuevo target
                loadStats();
                loadEvolution();

                closeModal();
            };
        }
    }


    async function loadEvolution() {
        const token = localStorage.getItem('authToken');
        try {
            let qs = `?context=${currentContext}`;
            if (activeConfig && activeConfig.target) qs += `&target=${encodeURIComponent(activeConfig.target)}`;
            if (activeConfig && activeConfig.areas && activeConfig.areas.length > 0) {
                qs += `&areas=${encodeURIComponent(activeConfig.areas.join(','))}`;
            }
            if (activeMode) qs += `&limit=${activeMode}`;   // Filtro por modo
            if (activeDays) qs += `&days=${activeDays}`;     // Filtro por tiempo

            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${window.AppConfig.API_URL}/api/quiz/evolution${qs}`, {
                headers
            });
            const data = await res.json();

            if (lineChartInst) lineChartInst.destroy();

            const evoCanvas = document.getElementById('evolutionChart');
            const evoEmpty = document.getElementById('evolution-empty-state');

            if (data.success && data.chart && data.chart.labels && data.chart.labels.length > 0) {
                if (evoCanvas) evoCanvas.style.display = 'block';
                if (evoEmpty) evoEmpty.style.display = 'none';

                if (!evoCanvas) return; // Guard for non-dashboard pages

                const evolutionCtx = evoCanvas.getContext('2d');
                // Helpers para la línea de aprobatoria
                const approvalLine = {
                    id: 'approvalLine',
                    afterDatasetsDraw(chart) {
                        const { ctx, chartArea: { left, right }, scales: { y } } = chart;
                        const yPos = y.getPixelForValue(14);
                        ctx.save();
                        ctx.beginPath();
                        ctx.setLineDash([6, 4]);
                        ctx.moveTo(left, yPos);
                        ctx.lineTo(right, yPos);
                        ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                        ctx.setLineDash([]);
                        ctx.fillStyle = 'rgba(245, 158, 11, 0.75)';
                        ctx.font = '600 10px Inter, sans-serif';
                        ctx.textAlign = 'right';
                        ctx.fillText('Aprobatorio ≥ 14', right - 4, yPos - 5);
                        ctx.restore();
                    }
                };

                lineChartInst = new Chart(evolutionCtx, {
                    type: 'line',
                    data: {
                        labels: data.chart.labels,
                        datasets: [{
                            label: 'Puntaje (Base 20)',
                            data: data.chart.scores,
                            borderColor: '#8b5cf6',
                            backgroundColor: (context) => {
                                const chart = context.chart;
                                const { ctx, chartArea } = chart;
                                if (!chartArea) return null;
                                let gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                                gradient.addColorStop(0, 'rgba(139,92,246,0.01)');
                                gradient.addColorStop(1, 'rgba(139,92,246,0.25)');
                                return gradient;
                            },
                            borderWidth: 3,
                            pointBackgroundColor: '#1e293b',
                            pointBorderColor: '#a78bfa',
                            pointBorderWidth: 2,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            pointHoverBackgroundColor: '#c4b5fd',
                            pointHoverBorderColor: '#ffffff',
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    plugins: [approvalLine],
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top',
                                labels: { color: '#64748b', boxWidth: 12, font: { size: 11 } }
                            },
                            tooltip: {
                                callbacks: {
                                    label: (ctx) => ` Nota: ${ctx.parsed.y.toFixed(1)} / 20`
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: false,
                                min: 0,
                                max: 20,
                                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                                ticks: {
                                    color: '#475569',
                                    stepSize: 2,
                                    callback: (v) => v
                                },
                                title: {
                                    display: true,
                                    text: 'Nota (0–20)',
                                    color: '#334155',
                                    font: { size: 11 }
                                }
                            },
                            x: {
                                grid: { display: false },
                                ticks: { color: '#475569', font: { size: 11 } },
                                title: {
                                    display: true,
                                    text: 'Intentos Recientes',
                                    color: '#334155',
                                    font: { size: 11 }
                                }
                            }
                        }
                    }
                });
            } else {
                if (evoCanvas) evoCanvas.style.display = 'none';
                if (evoEmpty) evoEmpty.style.display = 'flex';
            }
        } catch (error) {
            console.error('Error rendering chart:', error);
        }
    }

    // Store KPI data for AI analysis
    let cachedStats = null;

    async function loadStats() {
        const token = localStorage.getItem('authToken');

        try {
            // Fetch Optimized Summary
            let qs = `?context=${currentContext}`;
            if (activeConfig && activeConfig.target) qs += `&target=${encodeURIComponent(activeConfig.target)}`;
            if (activeConfig && activeConfig.areas && activeConfig.areas.length > 0) {
                qs += `&areas=${encodeURIComponent(activeConfig.areas.join(','))}`;
            }
            if (activeMode) qs += `&limit=${activeMode}`;   // Filtro por modo (10 = Rápido, 20 = Estudio)
            if (activeDays) qs += `&days=${activeDays}`;     // Filtro por tiempo (7, 30)

            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${window.AppConfig.API_URL}/api/quiz/stats${qs}`, {
                headers
            });
            const data = await res.json();
            cachedStats = data.kpis; // Store for AI Analysis

            // Render Stats
            const kpis = data.kpis;
            const scoreEl = document.getElementById('stat-score');
            const accuracyEl = document.getElementById('stat-accuracy');
            const countsEl = document.getElementById('stat-counts-text');
            const masteryEl = document.getElementById('stat-mastery');

            if (scoreEl) scoreEl.textContent = kpis.avg_score || '0.0';
            if (accuracyEl) accuracyEl.textContent = `${Math.round(kpis.accuracy || 0)}%`;
            if (countsEl) countsEl.textContent = `${kpis.total_correct || 0} / ${kpis.total_incorrect || 0}`;
            if (masteryEl) masteryEl.textContent = kpis.mastered_cards || 0;

            // Setup Flashcard Link — también links el KPI de Tarjetas Dominadas
            if (kpis.system_deck_id) {
                const btnFlash = document.getElementById('btn-mode-flash');
                if (btnFlash) btnFlash.href = `repaso?deckId=${kpis.system_deck_id}`;

                // KPI de tarjetas dominadas ahora es un enlace directo al deck
                const masteryBox = masteryEl ? masteryEl.closest('.stat-box') : null;
                if (masteryBox && !masteryBox.dataset.linked) {
                    masteryBox.dataset.linked = '1';
                    masteryBox.style.cursor = 'pointer';
                    masteryBox.title = 'Ver mis Flashcards';
                    masteryBox.addEventListener('click', () => {
                        window.location.href = `repaso?deckId=${kpis.system_deck_id}`;
                    });
                }
            }

            // --- Render Bar Chart (Áreas) ---
            // --- Render Bar Chart (Áreas) ---
            if (kpis.radar_data && kpis.radar_data.length > 0) {
                // 🧹 Sanitizar y agrupar historial viejo corrupto
                const cleanRadarMap = {};
                kpis.radar_data.forEach(d => {
                    let cleanSubject = d.subject || 'General';
                    if (cleanSubject.includes(',')) cleanSubject = cleanSubject.split(',')[0].trim();

                    if (!cleanRadarMap[cleanSubject]) {
                        cleanRadarMap[cleanSubject] = { correct: 0, total: 0 };
                    }

                    const safeTotal = parseInt(d.total || 0, 10);
                    const rawCorrect = (d.correct !== undefined) ? parseInt(d.correct, 10) : Math.round((d.accuracy / 100) * safeTotal);
                    cleanRadarMap[cleanSubject].correct += rawCorrect;
                    cleanRadarMap[cleanSubject].total += safeTotal;
                });

                renderBarChart(cleanRadarMap);
            } else {
                renderBarChart({}); // Empty state handler
            }

            // Ocultar Loading
            const loadingEl = document.getElementById('loading');
            const contentEl = document.getElementById('dashboard-content');
            if (loadingEl) loadingEl.style.display = 'none';
            if (contentEl) contentEl.style.display = 'block';

            // ✅ GUEST BANNER: If logged as guest, show a call to action
            if (kpis.isGuest) {
                renderGuestBanner();
            }

        } catch (error) {
            console.error(error);
            // Even on error, reveal dashboard to not block user interactions
            const loadingEl = document.getElementById('loading');
            const contentEl = document.getElementById('dashboard-content');
            if (loadingEl) loadingEl.style.display = 'none';
            if (contentEl) contentEl.style.display = 'block';
        }
    }

    // AI Analysis Handler
    function setupAIAnalysis() {
        const btnAnalyze = document.getElementById('btn-analyze-ai');
        const btnAgain = document.getElementById('btn-analyze-again');
        const stateInitial = document.getElementById('ai-initial-state');
        const stateLoading = document.getElementById('ai-loading-state');
        const stateResults = document.getElementById('ai-results-state');

        if (!btnAnalyze || !stateInitial) return; // Guard for non-dashboard pages

        const runAnalysis = async (e) => {
            // ✅ Interceptar con Paywall si no tiene vidas
            if (window.uiManager && typeof window.uiManager.validateFreemiumAction === 'function') {
                if (!window.uiManager.validateFreemiumAction(e)) return;
            }

            // UI Transitions
            stateInitial.style.display = 'none';
            stateResults.style.display = 'none';
            stateLoading.style.display = 'flex';

            const token = localStorage.getItem('authToken');

            // ✅ MOCK ANALYSIS FOR GUESTS: No call to API
            if (!token) {
                setTimeout(() => {
                    const localStats = JSON.parse(localStorage.getItem('guest_demo_stats') || '{}');
                    stateLoading.style.display = 'none';
                    stateResults.style.display = 'block';

                    let activeCfg = JSON.parse(localStorage.getItem('simActiveConfig')) || {};
                    let targetExamName = activeCfg.target || 'General';

                    let mockStrengths = `
                        <p style='color:#94a3b8; font-size:0.85rem; line-height:1.6; margin-bottom:1rem;'>Las métricas de tu sesión de prueba revelan patrones de decisión fundamentales muy bien afianzados:</p>
                        <ul style="margin:0; padding:0; list-style-type: none;">
                            <li style="display:flex; align-items:start; gap:0.75rem; margin-bottom: 0.75rem; color: #cbd5e1; font-size: 0.85rem; line-height: 1.4;"><i class="fas fa-check-circle" style="color: #34d399; margin-top:2px;"></i> <span><strong style='color:#f8fafc;'>Diagnóstico Diferencial (${targetExamName}):</strong> Reacción óptima frente a escenarios clínicos de presión temporal, con alta asimilación de guías clínicas primarias.</span></li>
                            <li style="display:flex; align-items:start; gap:0.75rem; margin-bottom: 0.75rem; color: #cbd5e1; font-size: 0.85rem; line-height: 1.4;"><i class="fas fa-check-circle" style="color: #34d399; margin-top:2px;"></i> <span><strong style='color:#f8fafc;'>Bloque Estratégico:</strong> Rendimiento transversal en áreas materno-infantiles que sugiere bases sólidas de razonamiento médico aplicado.</span></li>
                        </ul>
                    `;

                    let mockWeaknesses = `
                        <p style='color:#94a3b8; font-size:0.85rem; line-height:1.6; margin-bottom:1rem;'>Se advierten zonas oscuras que podrían generar fugas críticas de puntaje en tu evaluación principal.</p>
                        <ul style="margin:0; padding:0; list-style-type: none;">
                            <li style="display:flex; align-items:start; gap:0.75rem; margin-bottom: 0.75rem; color: #cbd5e1; font-size: 0.85rem; line-height: 1.4;"><i class="fas fa-exclamation-triangle" style="color: #fbbf24; margin-top:2px;"></i> <span><strong style='color:#f8fafc;'>Salud Pública y Gestión (${targetExamName}):</strong> Fallos de deducción en normativas NTS y epidemiología básica, mermando tu índice global.</span></li>
                        </ul>
                        <div style="margin-top: 1.25rem; padding: 1rem; background: rgba(245, 158, 11, 0.06); border: 1px dashed rgba(245, 158, 11, 0.3); border-radius: 10px;">
                            <span style="font-weight: 700; color: #fbbf24; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.06em; display:block; margin-bottom:0.4rem;">Estrategia de Intervención Recomendada</span>
                            <span style="font-size: 0.85rem; color: #cbd5e1; line-height: 1.5;">De acuerdo a esta muestra, aislar la disciplina general de "Salud Pública" en tu panel de configuración y realizar bloques exclusivos fortalecerá dramáticamente tus ratios de aprobación.</span>
                        </div>
                        <div style="margin-top: 1.5rem; text-align: center; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 1.5rem;">
                            <button onclick="window.uiManager.showAuthPromptModal();" style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 0.6rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 10px rgba(16,185,129,0.3);">
                                Obtener Diagnóstico Completamente Personalizado IA
                            </button>
                            <p style="font-size: 0.75rem; color: #64748b; margin-top: 0.75rem; line-height: 1.4;">Atención: Esta estadística es generada en un entorno efímero. Crear una cuenta permite a nuestro Motor Deep Learning correlacionar tu historial completo sobre miles de casos clínicos exclusivos de ${targetExamName}.</p>
                        </div>
                    `;

                    // For guests, we ignore localStats map as the text is pre-rendered heavily to entice registration.

                    document.getElementById('ai-strengths').innerHTML = mockStrengths;
                    document.getElementById('ai-weaknesses').innerHTML = mockWeaknesses;
                }, 1500);
                return;
            }

            try {
                // LLAMADA REAL A LA IA DE DIAGNÓSTICO PROFUNDO
                const response = await fetch(`${window.AppConfig.API_URL}/api/analytics/diagnostic`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ stats: cachedStats }) // data que llega desde loadStats() previamente
                });

                const data = await response.json();

                if (!response.ok) {
                    if (response.status === 403) {
                        // Límite sobrepasado o usuario Básico/Free sin acceso a IA.
                        // EN LUGAR DE PAYWALL INTRUSIVO, HACEMOS FALLBACK AL DIAGNÓSTICO ESTÁTICO (Clásico)
                        console.log("⚠️ Fallback a Diagnóstico Clínico Estático (Límites o Tier Básico)");
                        stateLoading.style.display = 'none';
                        stateResults.style.display = 'block';

                        const radar = cachedStats.radar_data || [];
                        const sortedRadar = [...radar].sort((a, b) => b.accuracy - a.accuracy);

                        let activeCfgLogs = JSON.parse(localStorage.getItem('simActiveConfig')) || {};
                        let restrictedTarget = activeCfgLogs.target || 'General';
                        let availableAreas = activeCfgLogs.areas || ['Medicina General', 'Salud Pública', 'Epidemiología'];

                        // If radar is empty (e.g., brand new config), fallback to the first two areas of the applied config
                        let topSub1 = sortedRadar.length > 0 ? sortedRadar[0].subject : (availableAreas[0] || 'Medicina General');
                        let topSub2 = sortedRadar.length > 1 ? sortedRadar[1].subject : (availableAreas[1] || 'Terapéutica');
                        let weakSub = sortedRadar.length > 0 ? sortedRadar[sortedRadar.length - 1].subject : (availableAreas[availableAreas.length - 1] || 'Salud Pública');

                        // We use the real topics here, making it completely pertinent to whatever config is active
                        const fStrong = `
                            <p style='color:#94a3b8; font-size:0.85rem; line-height:1.6; margin-bottom:1rem;'>Existen claras virtudes formadas en tu base de conocimiento que servirán de ancla resolutiva táctica:</p>
                            <ul style="margin:0; padding:0; list-style-type: none;">
                                <li style="display:flex; align-items:start; gap:0.75rem; margin-bottom: 0.75rem; color: #cbd5e1; font-size: 0.85rem; line-height: 1.4;"><i class="fas fa-check-circle" style="color: #34d399; margin-top:2px;"></i> <span><strong style='color:#f8fafc;'>Estructura Algorítmica (${restrictedTarget}):</strong> Tus decisiones evidencian una asimilación muy rápida de los protocolos de primera línea requeridos.</span></li>
                                <li style="display:flex; align-items:start; gap:0.75rem; margin-bottom: 0.75rem; color: #cbd5e1; font-size: 0.85rem; line-height: 1.4;"><i class="fas fa-check-circle" style="color: #34d399; margin-top:2px;"></i> <span><strong style='color:#f8fafc;'>Retención Sólida en ${topSub1}:</strong> Tu correlación clínica principal se encuentra estable y efectiva en esta disciplina fundamental.</span></li>
                                <li style="display:flex; align-items:start; gap:0.75rem; margin-bottom: 0.75rem; color: #cbd5e1; font-size: 0.85rem; line-height: 1.4;"><i class="fas fa-check-circle" style="color: #34d399; margin-top:2px;"></i> <span><strong style='color:#f8fafc;'>Bases en ${topSub2}:</strong> Fuerte articulación fisiopatológica al enfrentar distractores diagnósticos simples.</span></li>
                            </ul>
                        `;

                        const fWeak = `
                            <p style='color:#94a3b8; font-size:0.85rem; line-height:1.6; margin-bottom:1rem;'>Es imperativo atacar de inmediato los siguientes flancos expuestos para prevenir pérdida de efectividad durante la evaluación real:</p>
                            <ul style="margin:0; padding:0; list-style-type: none;">
                                <li style="display:flex; align-items:start; gap:0.75rem; margin-bottom: 0.75rem; color: #cbd5e1; font-size: 0.85rem; line-height: 1.4;"><i class="fas fa-exclamation-triangle" style="color: #fbbf24; margin-top:2px;"></i> <span><strong style='color:#f8fafc;'>Deficiencia en ${weakSub}:</strong> Se detectan debilidades transversales o patrones de duda al responder preguntas relacionadas, marcando un claro foco de intervención.</span></li>
                            </ul>
                            <div style="margin-top: 1.25rem; padding: 1rem; background: rgba(245, 158, 11, 0.06); border: 1px dashed rgba(245, 158, 11, 0.3); border-radius: 10px;">
                                <span style="font-weight: 700; color: #fbbf24; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.06em; display:block; margin-bottom:0.4rem;">Estrategia de Intervención Recomendada</span>
                                <span style="font-size: 0.85rem; color: #cbd5e1; line-height: 1.5;">Genera ahora mismo simulacros de 30 minutos priorizando de modo exclusivo preguntas de "${weakSub}". Este bloqueo frenará inmediatamente el efecto de arrastre estadístico negativo que debilita tu nota global final.</span>
                            </div>
                        `;

                        document.getElementById('ai-strengths').innerHTML = fStrong;
                        document.getElementById('ai-weaknesses').innerHTML = fWeak;
                        return;
                    }
                    throw new Error(data.error || 'Error en servidor de IA');
                }

                // Mostrar Respuesta Real
                stateLoading.style.display = 'none';
                stateResults.style.display = 'block';

                document.getElementById('ai-strengths').innerHTML = data.strengths || "Análisis no disponible.";
                document.getElementById('ai-weaknesses').innerHTML = data.weaknesses || "Análisis no disponible.";

                // Si existe UiManager usamos decrement vidas (Opcional visual)
                if (window.uiManager && typeof window.uiManager.updateLifeCounters === 'function') {
                    // Update visual local si es posible (solo para no recargar front)
                    window.uiManager.updateLifeCounters();
                }

            } catch (err) {
                console.error("AI Analysis Failed", err);
                stateLoading.style.display = 'none';
                stateInitial.style.display = 'flex';
                alert("Hubo un problema de conexión al tutor de inteligencia artificial. Intenta nuevamente.");
            }
        }

        if (btnAnalyze) btnAnalyze.addEventListener('click', (e) => runAnalysis(e));
        if (btnAgain) btnAgain.addEventListener('click', (e) => runAnalysis(e));
    }

    // Modify init to call setupAIAnalysis
    const originalInit = init;
    init = async function () {
        await originalInit.apply(this, arguments); // Call original items (loadStats, loadEvolution)
        setupAIAnalysis(); // Setup handlers
    }

    function renderGuestBanner() {
        if (window.uiManager) {
            window.uiManager.renderGuestBanner('dashboard-content');
        }
    }

    function renderGuestDemoData() {
        renderGuestBanner();

        // --- 🌈 Arcade Mode Glow for Guests ---
        const sessionsSent = parseInt(localStorage.getItem('demo_sessions_count') || '0');
        const arcadeBtn = document.getElementById('btn-mode-arcade');

        if (sessionsSent < 3 && arcadeBtn) {
            const arcadeCard = arcadeBtn.closest('.mode-card');
            if (arcadeCard) {
                // Inject styles for the glow
                if (!document.getElementById('arcade-glow-style')) {
                    const style = document.createElement('style');
                    style.id = 'arcade-glow-style';
                    style.textContent = `
                        @keyframes arcade-glow {
                            0% { box-shadow: 0 0 0px rgba(236, 72, 153, 0); border-color: rgba(255, 255, 255, 0.1); }
                            50% { box-shadow: 0 0 25px rgba(236, 72, 153, 0.6), 0 0 10px rgba(236, 72, 153, 0.3); border-color: rgba(236, 72, 153, 0.8); }
                            100% { box-shadow: 0 0 0px rgba(236, 72, 153, 0); border-color: rgba(255, 255, 255, 0.1); }
                        }
                        .arcade-highlight {
                            animation: arcade-glow 2.5s infinite ease-in-out;
                            position: relative;
                            z-index: 10;
                            border-width: 1px !important;
                        }

                    `;
                    document.head.appendChild(style);
                }
                arcadeCard.classList.add('arcade-highlight');
            }
        }

        // 1. KPI Demo values
        const scoreEl = document.getElementById('stat-score');
        const accuracyEl = document.getElementById('stat-accuracy');
        const countsEl = document.getElementById('stat-counts-text');
        const masteryEl = document.getElementById('stat-mastery');

        if (scoreEl) scoreEl.textContent = '14.5';
        if (accuracyEl) accuracyEl.textContent = '72%';
        if (countsEl) countsEl.textContent = '50 / 20';
        if (masteryEl) masteryEl.textContent = '12';

        // 2. Evolution Chart Demo
        const evoCanvas = document.getElementById('evolutionChart');
        if (evoCanvas) {
            // --- 🧹 LIMPIEZA DE CANVAS ---
            if (lineChartInst) {
                lineChartInst.destroy();
                lineChartInst = null;
            }

            const evolutionCtx = evoCanvas.getContext('2d');
            // Plugin línea de aprobatoria (también en demo)
            const approvalLineDemo = {
                id: 'approvalLineDemo',
                afterDatasetsDraw(chart) {
                    const { ctx, chartArea: { left, right }, scales: { y } } = chart;
                    const yPos = y.getPixelForValue(14);
                    ctx.save();
                    ctx.beginPath();
                    ctx.setLineDash([6, 4]);
                    ctx.moveTo(left, yPos);
                    ctx.lineTo(right, yPos);
                    ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.fillStyle = 'rgba(245, 158, 11, 0.75)';
                    ctx.font = '600 10px Inter, sans-serif';
                    ctx.textAlign = 'right';
                    ctx.fillText('Aprobatorio ≥ 14', right - 4, yPos - 5);
                    ctx.restore();
                }
            };

            lineChartInst = new Chart(evolutionCtx, {
                type: 'line',
                data: {
                    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May'],
                    datasets: [{
                        label: 'Puntaje (Demo)',
                        data: [11, 13, 12, 15, 14.5],
                        borderColor: '#8b5cf6',
                        backgroundColor: (context) => {
                            const chart = context.chart;
                            const { ctx, chartArea } = chart;
                            if (!chartArea) return null;
                            let gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                            gradient.addColorStop(0, 'rgba(139,92,246,0.01)');
                            gradient.addColorStop(1, 'rgba(139,92,246,0.25)');
                            return gradient;
                        },
                        borderWidth: 3,
                        pointBackgroundColor: '#1e293b',
                        pointBorderColor: '#a78bfa',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: '#c4b5fd',
                        pointHoverBorderColor: '#ffffff',
                        tension: 0.4,
                        fill: true
                    }]
                },
                plugins: [approvalLineDemo],
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            min: 0, max: 20,
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: '#475569', stepSize: 2 }
                        },
                        x: { grid: { display: false }, ticks: { color: '#475569' } }
                    },
                    plugins: {
                        legend: { labels: { color: '#64748b', font: { size: 11 } } },
                        tooltip: { callbacks: { label: (ctx) => ` Nota: ${ctx.parsed.y.toFixed(1)} / 20` } }
                    }
                }
            });
        }

        // 3. Bar Chart Demo (Context-Aware Mock Data)
        const demoAreasMap = currentContext === 'EDUCACION' ? {
            'Comprensión Lectora': { correct: 88, total: 100 },
            'Razonamiento Lógico': { correct: 75, total: 100 },
            'Evaluación Formativa': { correct: 68, total: 100 },
            'Principios del CNEB': { correct: 62, total: 100 },
            'Convivencia Escolar': { correct: 55, total: 100 },
            'Estrategias de Enseñanza': { correct: 50, total: 100 }
        } : {
            'Ginecología y Obstetricia': { correct: 90, total: 100 },
            'Medicina Interna': { correct: 85, total: 100 },
            'Pediatría': { correct: 75, total: 100 },
            'Salud Pública': { correct: 65, total: 100 },
            'Fisiología': { correct: 60, total: 100 },
            'Cardiología': { correct: 50, total: 100 }
        };
        renderBarChart(demoAreasMap);

        // 4. Persistence: Check for local demo stats (Domain-Specific)
        const domainKey = currentContext.toLowerCase();
        const localStatsStr = localStorage.getItem(`guest_demo_stats_${domainKey}`);
        
        if (localStatsStr) {
            try {
                const stats = JSON.parse(localStatsStr);
                if (scoreEl) scoreEl.textContent = stats.avgScore || '0';
                if (accuracyEl) accuracyEl.textContent = `${stats.accuracy || 0}%`;
                if (countsEl) countsEl.textContent = `${stats.correct || 0} / ${stats.incorrect || 0}`;

                // Update Bar Chart if areaStats exists (Real performance)
                if (stats.areaStats && Object.keys(stats.areaStats).length > 0) {
                    renderBarChart(stats.areaStats);
                    let masteryCount = 0;
                    Object.keys(stats.areaStats).forEach(topic => {
                        const area = stats.areaStats[topic];
                        if (area.total > 0 && (area.correct / area.total) >= 0.70) {
                            masteryCount++;
                        }
                    });
                    if (masteryEl) masteryEl.textContent = masteryCount;
                }
            } catch (e) { console.error("Error parsing local stats", e); }
        }

        // 5. Ocultar Loading
        const loading = document.getElementById('loading');
        const content = document.getElementById('dashboard-content');
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'block';
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', SimulatorDash.init);

// 🔄 AUTO-REFRESH: Recargar estadísticas al volver al tablero (Botón Atrás o Salir del Quiz)
window.addEventListener('pageshow', (event) => {
    // Si la página se está mostrando desde el cache del navegador (persisted)
    if (event.persisted) {
        console.log("🔄 Navegación detectada: Refrescando Estadísticas...");
        SimulatorDash.init();
    }
});
