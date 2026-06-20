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
            studyDesc: '20 preguntas con explicación.',
            realDesc: '100 preguntas integradas.',
            sectionIcon: 'fa-stethoscope',
            barChartTitle: 'Dominio por Áreas Clínicas',
            barChartEmptyDesc: 'Completa simulacros variados para ver tu dominio clínico por especialidad.',
            images: {
                study: '/assets/Modo Estudio.webp',
                flashcards: '/assets/Flashcards.webp',
                real: '/assets/Simulacro Real.webp'
            },
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
            studyDesc: '20 preguntas con explicación.',
            realDesc: '60 preguntas integradas.',
            sectionIcon: 'fa-chalkboard-teacher',
            barChartTitle: 'Dominio por Áreas Pedagógicas',
            barChartEmptyDesc: 'Completa simulacros variados para ver tu dominio pedagógico por especialidad.',
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
                { label: 'Enfoques y Principios del CNEB', areas: ['Enfoque por competencias', 'Enfoques transversales', 'Principios de la educación peruana'], bg: 'rgba(234, 179, 8, 0.7)', border: '#eab308', conditionalTarget: 'ASCENSO' },
                { label: 'Teorías y Procesos del Aprendizaje', areas: ['Constructivismo y socioconstructivismo', 'Aprendizajes significativos', 'Activación y recojo de saberes previos', 'Conflicto o disonancia cognitiva y demanda cognitiva', 'Procesos auxiliares'], bg: 'rgba(59, 130, 246, 0.7)', border: '#3b82f6', conditionalTarget: 'ASCENSO' },
                { label: 'Planificación y Evaluación', areas: ['Planificación pedagógica', 'Evaluación formativa y retroalimentación'], bg: 'rgba(99, 102, 241, 0.7)', border: '#6366f1', conditionalTarget: 'ASCENSO' },
                { label: 'Clima Escolar e Inclusión', areas: ['Convivencia democrática y clima de aula', 'Educación inclusiva y DUA', 'Características y desarrollo del estudiante'], bg: 'rgba(16, 185, 129, 0.7)', border: '#10b981', conditionalTarget: 'ASCENSO' },
                { label: 'Conocimientos Pedagógicos y Curriculares', areas: ['Teorías del Aprendizaje y Desarrollo', 'Principios del Currículo Nacional (CNEB)', 'Planificación Curricular (PCI, PCA, Unidades)', 'Evaluación Formativa y Retroalimentación', 'Convivencia Escolar y Clima de Aula', 'Principios de la Educación Peruana'], bg: 'rgba(59, 130, 246, 0.7)', border: '#3b82f6', conditionalTarget: 'NOMBRAMIENTO' },
                { label: 'Gestión Institucional', areas: ['Liderazgo Pedagógico', 'Planificación Estratégica (PEI, PAT)', 'Gestión del Riesgo de Desastres', 'Monitoreo y Acompañamiento'], bg: 'rgba(249, 115, 22, 0.7)', border: '#f97316', conditionalTarget: 'ACCESO_CARGOS' }
            ]
        },
        'IDIOMAS': {
            title: 'Language Hub',
            heroTitle: 'Mastery & Fluency',
            quizParams: '',
            studyDesc: '20 preguntas con explicación.',
            realDesc: '80 preguntas integradas.',
            sectionIcon: 'fa-language',
            barChartTitle: 'Dominio por Ejes Temáticos',
            barChartEmptyDesc: 'Completa simulacros variados para ver tu dominio por ejes temáticos.',
            images: {
                study: '/assets/Modo Estudio-v3.webp',
                flashcards: '/assets/Flashcards-v3.webp',
                real: '/assets/Simulacro Real-v3.webp'
            },
            getTargetsForLang: function (lang) {
                if (lang === 'it-IT') {
                    return [
                        { value: 'MCER', label: 'MCER', checked: true },
                        { value: 'CELI', label: 'CELI' },
                        { value: 'CILS', label: 'CILS' }
                    ];
                } else {
                    return [
                        { value: 'MCER', label: 'MCER', checked: true },
                        { value: 'TOEFL', label: 'TOEFL' },
                        { value: 'IELTS', label: 'IELTS' },
                        { value: 'TECH_ENGLISH', label: 'Inglés Técnico' }
                    ];
                }
            },
            careerOptions: [
                { value: 'en-US', label: 'Inglés USA' },
                { value: 'en-GB', label: 'Inglés UK' },
                { value: 'it-IT', label: 'Italiano' }
            ],
            areas: [
                { label: 'Habilidades lingüísticas', areas: ['Grammar & Use of English', 'Vocabulary & Context', 'Reading Comprehension', 'Listening Comprehension'], bg: 'rgba(139, 92, 246, 0.7)', border: '#8b5cf6' }
            ]
        }
    };

    let currentContext = 'MEDICINA';
    let activeConfig = null;
    let activeMode = null;
    let activeDays = null;
    let lineChartInst = null;
    let radarChartInst = null;
    let doughnutChartInst = null;


    // Se inicializará dinámicamente según el contexto
    let examAreasGrouped = [];
    let areaToGroupMap = {};
    let selectedVocabIds = [];

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

    function renderDoughnutChart(doughnutData) {
        if (doughnutChartInst) {
            doughnutChartInst.destroy();
            doughnutChartInst = null;
        }

        const emptyState = document.getElementById('doughnut-empty-state');
        const wrapper = document.getElementById('doughnut-wrapper');
        const legend = document.getElementById('doughnut-legend');
        const canvas = document.getElementById('topicDoughnutChart');

        if (!canvas) return;

        const labels = Object.keys(doughnutData);
        const values = Object.values(doughnutData);
        const totalSum = values.reduce((a, b) => a + b, 0);

        if (totalSum === 0) {
            if (emptyState) emptyState.style.display = 'flex';
            if (wrapper) wrapper.style.display = 'none';
            if (legend) legend.style.display = 'none';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (wrapper) wrapper.style.display = 'block';
        if (legend) legend.style.display = 'flex';

        let colors = [];
        if (currentContext === 'MEDICINA') {
            colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];
        } else if (currentContext === 'IDIOMAS') {
            colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];
        } else {
            colors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];
        }

        legend.innerHTML = '';
        labels.forEach((label, idx) => {
            const val = values[idx];
            const pct = Math.round((val / totalSum) * 100);
            const color = colors[idx % colors.length];

            const item = document.createElement('div');
            item.className = 'doughnut-legend-item';
            Object.assign(item.style, {
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: 'pointer'
            });
            item.title = label;
            item.innerHTML = `
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; display: inline-block;"></span>
                <span style="font-weight: 600; color: #f8fafc;">${val} q <span style="font-weight: 400; opacity: 0.6; font-size: 0.7rem;">(${pct}%)</span></span>
            `;
            legend.appendChild(item);
        });

        const ctx = canvas.getContext('2d');
        doughnutChartInst = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 1,
                    borderColor: 'rgba(0, 0, 0, 0.6)',
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.label}: ${ctx.parsed} q`
                        }
                    }
                }
            }
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
                activeMode = val === 'all' ? null : (isNaN(val) ? val : parseInt(val, 10));

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

    function renderConfigSummary(summaryBox, config) {
        if (!summaryBox || !config) return;
        summaryBox.style.display = 'flex';

        let targetText = config.target || '';
        let infoText = '';
        if (config.career) {
            infoText = config.career;
        } else if (config.difficulty) {
            infoText = config.difficulty;
        }

        const isDefault = config.configType === 'default' || !config.configType;
        const areasCount = config.areas ? config.areas.length : 0;

        let pillsHtml = `<span class="config-summary-pill config-summary-pill--accent">${targetText}</span>`;
        if (infoText) {
            pillsHtml += ` <span class="config-summary-pill">${infoText}</span>`;
        }
        if (isDefault) {
            pillsHtml += ` <span class="config-summary-pill config-summary-pill--count">Examen Oficial (Todas las áreas)</span>`;
        } else {
            pillsHtml += ` <span class="config-summary-pill config-summary-pill--count">${areasCount} ${areasCount === 1 ? 'área' : 'áreas'}</span>`;
        }

        summaryBox.innerHTML = `
            <i class="fas fa-filter config-summary-icon"></i>
            <span class="config-summary-title">Filtro Activo:</span>
            ${pillsHtml}
        `;
    }

    async function init() {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
        }
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

        // Dynamic Bar Chart Labels based on Context
        const barChartTitleEl = document.getElementById('bar-chart-title');
        const barChartEmptyDescEl = document.getElementById('bar-chart-empty-desc');
        if (barChartTitleEl && ctxConfig.barChartTitle) {
            barChartTitleEl.textContent = ctxConfig.barChartTitle;
        }
        if (barChartEmptyDescEl && ctxConfig.barChartEmptyDesc) {
            barChartEmptyDescEl.textContent = ctxConfig.barChartEmptyDesc;
        }

        // Dynamic KPI Tooltips based on Context
        const evoTooltipDesc = document.getElementById('evolution-tooltip-desc');
        if (evoTooltipDesc) {
            evoTooltipDesc.textContent = 'Muestra la evolución de tus puntuaciones a lo largo del tiempo. Te permite medir tu curva de aprendizaje, identificar si tu rendimiento está mejorando y comparar resultados según el número de preguntas (10, 20 o simulacro real).';
        }

        const doughnutTooltipDesc = document.getElementById('doughnut-tooltip-desc');
        if (doughnutTooltipDesc) {
            if (ctxConfig.title === 'Language Hub' || window.location.search.includes('idiomas')) {
                doughnutTooltipDesc.textContent = 'Muestra la proporción de preguntas practicadas por cada competencia o meta del idioma. Te ayuda a asegurar un entrenamiento balanceado en todas las habilidades lingüísticas.';
            } else {
                doughnutTooltipDesc.textContent = 'Muestra la proporción de preguntas respondidas por cada tema o área. Ayuda a identificar en qué temas has concentrado más práctica y a asegurar que cubras todo el temario de forma equilibrada.';
            }
        }

        const barTooltipTitle = document.getElementById('bar-tooltip-title');
        const barTooltipDesc = document.getElementById('bar-tooltip-desc');
        if (barTooltipTitle && ctxConfig.barChartTitle) {
            barTooltipTitle.textContent = ctxConfig.barChartTitle;
        }
        if (barTooltipDesc) {
            if (ctxConfig.title === 'Docente Pro' || window.location.search.includes('educacion')) {
                barTooltipDesc.textContent = 'Muestra tu porcentaje de acierto en cada área pedagógica. Sirve para detectar de manera precisa tus fortalezas y debilidades de cara a la evaluación docente.';
            } else if (ctxConfig.title === 'Language Hub' || window.location.search.includes('idiomas')) {
                barTooltipDesc.textContent = 'Muestra tu porcentaje de acierto en cada eje temático del idioma (lectura, vocabulario, gramática, audición). Te ayuda a conocer en qué competencia lingüística debes enfocarte.';
            } else {
                barTooltipDesc.textContent = 'Muestra tu porcentaje de acierto en cada especialidad o área clínica. Sirve para detectar de manera precisa tus fortalezas y tus puntos débiles específicos para priorizar tus repasos.';
            }
        }

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
        const currentTargets = ctxConfig.targets || (ctxConfig.getTargetsForLang ? ctxConfig.getTargetsForLang('en-US') : null);
        if (currentTargets) {
            const targetContainer = document.querySelector('#config-modal-overlay .modal-section-title + div');
            if (window.innerWidth > 520) {
                targetContainer.style.gridTemplateColumns = `repeat(${currentTargets.length}, 1fr)`;
            } else {
                targetContainer.style.gridTemplateColumns = '1fr';
            }
            targetContainer.innerHTML = '';
            currentTargets.forEach(t => {
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
                            if (currentContext !== 'EDUCACION') {
                                const specialtyContainer = document.getElementById('edu-specialty-container');
                                if (specialtyContainer) specialtyContainer.style.display = 'none';
                                return;
                            }
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
                const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/users/preferences?domain=${currentContext.toLowerCase()}`);
                const prefData = await res.json();

                if (prefData && prefData.data) {
                    activeConfig = prefData.data;
                    if (activeConfig) activeConfig.configType = activeConfig.configType || 'default';
                    // Keep localStorage in sync for legacy code
                    localStorage.setItem(`simActiveConfig_${currentContext}`, JSON.stringify(activeConfig));
                } else {
                    // Fallback to localStorage if API has nothing
                    const savedConfig = localStorage.getItem(`simActiveConfig_${currentContext}`);
                    if (savedConfig) {
                        activeConfig = JSON.parse(savedConfig);
                        if (activeConfig) activeConfig.configType = activeConfig.configType || 'default';
                    }
                }
            } catch (e) {
                console.error("Error loading saved config from API", e);
                // Fallback to localStorage
                const savedConfig = localStorage.getItem(`simActiveConfig_${currentContext}`);
                if (savedConfig) {
                    activeConfig = JSON.parse(savedConfig);
                    if (activeConfig) activeConfig.configType = activeConfig.configType || 'default';
                }
            }
        } else {
            const savedConfig = localStorage.getItem(`simActiveConfig_${currentContext}`);
            if (savedConfig) {
                activeConfig = JSON.parse(savedConfig);
                if (activeConfig) activeConfig.configType = activeConfig.configType || 'default';
            }
        }

        // Set default configuration in init() if currentContext === 'IDIOMAS' and !activeConfig
        if (!activeConfig && currentContext === 'IDIOMAS') {
            activeConfig = {
                target: 'MCER',
                areas: ['Grammar & Use of English', 'Vocabulary & Context', 'Reading Comprehension', 'Listening Comprehension'],
                career: 'en-US',
                difficulty: 'B2'
            };
            localStorage.setItem(`simActiveConfig_${currentContext}`, JSON.stringify(activeConfig));
        }

        const summaryBox = document.getElementById('active-config-summary');
        if (summaryBox && activeConfig) {
            renderConfigSummary(summaryBox, activeConfig);
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
        if (token && !activeConfig) showFirstVisitTip();

        // 6. Setup Language Navigation Tabs (Idiomas-only)
        setupLanguageTabs();
        if (currentContext === 'IDIOMAS') {
            initVocabEvents();
        }
        setupLessonEditor();
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
            if (activeConfig.configType) {
                baseParams += `&configType=${encodeURIComponent(activeConfig.configType)}`;
            }
            if (activeConfig.career) {
                baseParams += `&career=${encodeURIComponent(activeConfig.career)}`;
            }
            if (activeConfig.difficulty) {
                baseParams += `&difficulty=${encodeURIComponent(activeConfig.difficulty)}`;
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
            btnReal.href = `quiz${baseParams}${separator}limit=100&mode=real`;
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
        const areasGrid = document.getElementById('config-areas-grid');
        const summaryBox = document.getElementById('active-config-summary');

        if (!modal || !btnOpen || !areasGrid) return; // Guard for non-dashboard pages

        const updateConfigModeUI = () => {
            const selectedMode = document.querySelector('input[name="configMode"]:checked')?.value || 'default';
            
            // Toggle active class on option labels
            const options = document.querySelectorAll('.mode-toggle-option');
            options.forEach(opt => {
                const radio = opt.querySelector('input');
                if (radio && radio.checked) {
                    opt.classList.add('active');
                } else {
                    opt.classList.remove('active');
                }
            });

            const checkboxes = areasGrid.querySelectorAll('input[type="checkbox"]');
            if (selectedMode === 'default') {
                checkboxes.forEach(cb => {
                    cb.checked = true;
                    cb.disabled = true;
                });
            } else {
                checkboxes.forEach(cb => {
                    cb.disabled = false;
                });
                // Restore checked state based on activeConfig.areas
                if (activeConfig && activeConfig.areas && activeConfig.configType === 'custom') {
                    checkboxes.forEach(cb => {
                        if (cb.classList.contains('group-header-checkbox')) return;
                        cb.checked = activeConfig.areas.includes(cb.value);
                    });
                }
                // Update header checkboxes
                const headers = areasGrid.querySelectorAll('.group-header-checkbox');
                headers.forEach(hCb => {
                    const nextGrid = hCb.closest('label').closest('div').nextElementSibling;
                    if (nextGrid && nextGrid.style.display === 'grid') {
                        const childCbs = Array.from(nextGrid.querySelectorAll('input[type="checkbox"]'));
                        hCb.checked = childCbs.every(cb => cb.checked);
                    }
                });
            }
        };

        const modeRadioButtons = document.getElementsByName('configMode');
        if (modeRadioButtons.length > 0) {
            modeRadioButtons.forEach(radio => {
                radio.addEventListener('change', () => {
                    updateConfigModeUI();
                });
            });
        }

        // Render grouped checkboxes with sub-headers
        const renderAreas = (target) => {
            areasGrid.innerHTML = '';

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
                // Group header with a styled check/uncheck checkbox
                const header = document.createElement('div');
                const accentColor = currentContext === 'EDUCACION' ? '#f97316' : '#60a5fa';
                header.style.cssText = `display:flex; align-items:center; justify-content:space-between; font-size:0.75rem; color:${accentColor}; text-transform:uppercase; letter-spacing:0.05em; font-weight:600; margin-top:0.25rem; padding-bottom:0.3rem; border-bottom:1px solid ${accentColor}26;`;

                const headerLabel = document.createElement('label');
                headerLabel.style.cssText = 'display:flex; align-items:center; gap:0.4rem; cursor:pointer; user-select:none;';

                const headerCheckbox = document.createElement('input');
                headerCheckbox.type = 'checkbox';
                headerCheckbox.className = 'group-header-checkbox';
                headerCheckbox.style.cssText = `accent-color:${accentColor}; cursor:pointer; margin: 0; width:12px; height:12px;`;

                const headerTitle = document.createElement('span');
                headerTitle.textContent = group.label;

                headerLabel.appendChild(headerCheckbox);
                headerLabel.appendChild(headerTitle);
                header.appendChild(headerLabel);
                areasGrid.appendChild(header);

                // Checkbox grid for this group
                const grid = document.createElement('div');
                grid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;';

                const childCheckboxes = [];

                group.areas.forEach(area => {
                    const label = document.createElement('label');
                    label.className = 'area-checkbox-label';

                    let isChecked = true;
                    if (activeConfig && activeConfig.target === target && activeConfig.areas) {
                        isChecked = activeConfig.areas.includes(area);
                    }

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = area;
                    checkbox.checked = isChecked;

                    label.appendChild(checkbox);
                    label.appendChild(document.createTextNode(` ${area}`));
                    grid.appendChild(label);
                    childCheckboxes.push(checkbox);
                });

                // Update group header checkbox state initially
                const updateHeaderState = () => {
                    const selectedMode = document.querySelector('input[name="configMode"]:checked')?.value || 'default';
                    if (selectedMode === 'default') {
                        headerCheckbox.checked = true;
                        headerCheckbox.disabled = true;
                        return;
                    }
                    headerCheckbox.disabled = false;
                    const allChecked = childCheckboxes.every(cb => cb.checked);
                    headerCheckbox.checked = allChecked;
                };
                updateHeaderState();

                // Group toggle event
                headerCheckbox.addEventListener('change', (e) => {
                    const selectedMode = document.querySelector('input[name="configMode"]:checked')?.value || 'default';
                    if (selectedMode === 'default') return;
                    const checked = e.target.checked;
                    childCheckboxes.forEach(cb => {
                        cb.checked = checked;
                    });
                });

                // Child checkbox event to update header state
                childCheckboxes.forEach(cb => {
                    cb.addEventListener('change', () => {
                        updateHeaderState();
                    });
                });

                areasGrid.appendChild(grid);
            });

            // Re-apply toggle state after rendering
            updateConfigModeUI();
        };

        // Render exam target radio buttons dynamically
        const renderTargets = (targetsList) => {
            const targetContainer = document.querySelector('#config-modal-overlay .exam-target-grid');
            if (window.innerWidth > 520) {
                targetContainer.style.gridTemplateColumns = `repeat(${targetsList.length}, 1fr)`;
            } else {
                targetContainer.style.gridTemplateColumns = '1fr';
            }
            targetContainer.innerHTML = '';

            // Determine preselected target
            const defaultTargetObj = targetsList.find(t => t.checked) || targetsList[0];
            let activeTarget = (activeConfig && activeConfig.target) ? activeConfig.target : defaultTargetObj.value;

            const hasActive = targetsList.some(t => t.value === activeTarget);
            if (!hasActive) activeTarget = defaultTargetObj.value;

            targetsList.forEach(t => {
                const label = document.createElement('label');
                label.className = `exam-target-option ${t.disabled ? 'target-option--disabled' : ''}`;
                const subtitleHtml = t.subtitle
                    ? `<span style="display:block;font-size:0.6rem;opacity:0.7;font-weight:400;">${t.subtitle}</span>`
                    : '';
                const isChecked = t.value === activeTarget;
                label.innerHTML = `
                        <input type="radio" name="examTarget" value="${t.value}" ${isChecked ? 'checked' : ''} ${t.disabled ? 'disabled' : ''}>
                        <div class="target-card" style="${t.disabled ? 'opacity: 0.4; cursor: not-allowed; border-color: rgba(255,255,255,0.05);' : ''}">${t.label}${subtitleHtml}</div>
                    `;
                targetContainer.appendChild(label);
            });

            // Bind click events on the dynamic inputs
            const radioInputs = targetContainer.querySelectorAll('input');
            radioInputs.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        handleTargetChange(e.target.value);
                    }
                });
            });
        };

        const handleTargetChange = (t) => {
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

                // Show/hide SERUMS-specific UI (only for medicine)
                const careerBox = document.getElementById('serums-career-container');
                const careerTitle = careerBox ? careerBox.querySelector('.modal-section-title') : null;

                if (currentContext === 'MEDICINA') {
                    if (careerBox) {
                        const activeRadio = document.querySelector('.exam-target-option input:checked');
                        careerBox.style.display = (activeRadio && activeRadio.value === 'SERUMS') ? 'block' : 'none';
                    }
                } else if (currentContext === 'EDUCACION') {
                    if (careerBox) {
                        careerBox.style.display = 'block';
                        if (careerTitle) careerTitle.textContent = 'Modalidad / Nivel';
                    }
                } else if (currentContext === 'IDIOMAS') {
                    if (careerBox) {
                        careerBox.style.display = 'block';
                        if (careerTitle) careerTitle.textContent = 'Idioma / Dialecto';
                    }
                    const difficultyBox = document.getElementById('languages-difficulty-container');
                    if (difficultyBox) {
                        difficultyBox.style.display = 'block';
                        // Preselect difficulty
                        const diffSelect = document.getElementById('config-difficulty');
                        if (diffSelect && activeConfig && activeConfig.difficulty) {
                            diffSelect.value = activeConfig.difficulty;
                        } else if (diffSelect) {
                            diffSelect.value = 'B2';
                        }
                    }
                } else {
                    const difficultyBox = document.getElementById('languages-difficulty-container');
                    if (difficultyBox) difficultyBox.style.display = 'none';
                }

                const careerSelect = document.getElementById('config-career');
                if (activeConfig && activeConfig.career && careerSelect) {
                    let level = 'EBR - Primaria';
                    let specialty = 'General';
                    
                    const cVal = activeConfig.career;
                    if (cVal === 'EBR - Inicial') {
                        level = 'EBR - Inicial';
                    } else if (cVal === 'EBR - Primaria') {
                        level = 'EBR - Primaria';
                    } else if (cVal === 'EBR Primaria Profesor de Innovación Pedagógica') {
                        level = 'EBR - Primaria';
                        specialty = 'Profesor de Innovación Pedagógica';
                    } else if (cVal === 'EBR Primaria Educación Física') {
                        level = 'EBR - Primaria';
                        specialty = 'Educación Física';
                    } else if (cVal.startsWith('EBR - Secundaria')) {
                        level = 'EBR - Secundaria';
                        specialty = cVal.replace('EBR - Secundaria - ', '');
                    } else {
                        // Fallback parsing
                        const careerParts = cVal.split(' - ');
                        level = (careerParts[0] && careerParts[1]) ? `${careerParts[0]} - ${careerParts[1]}` : careerParts[0];
                        specialty = careerParts[2] || 'General';
                    }

                    careerSelect.value = level;
                    if (window._updateEduSpecialties) {
                        window._updateEduSpecialties(specialty);
                    }
                } else if (window._updateEduSpecialties) {
                    // Default for first time or no config
                    if (careerSelect && currentContext === 'EDUCACION') careerSelect.value = 'EBR - Primaria';
                    window._updateEduSpecialties();
                }

                // Render dynamic targets based on selected language/career
                const activeLang = careerSelect ? careerSelect.value : 'en-US';
                const initialTargets = ctxConfig.targets || (ctxConfig.getTargetsForLang ? ctxConfig.getTargetsForLang(activeLang) : null);
                renderTargets(initialTargets);

                // Bind unified change event for career/language select
                if (careerSelect) {
                    careerSelect.onchange = () => {
                        if (currentContext === 'IDIOMAS' && ctxConfig.getTargetsForLang) {
                            const newLang = careerSelect.value;
                            const newTargets = ctxConfig.getTargetsForLang(newLang);
                            renderTargets(newTargets);

                            const activeRadio = document.querySelector('.exam-target-option input:checked');
                            if (activeRadio) handleTargetChange(activeRadio.value);
                        } else if (currentContext === 'MEDICINA') {
                            const activeRadio = document.querySelector('.exam-target-option input:checked');
                            if (activeRadio) renderAreas(activeRadio.value);
                        } else if (currentContext === 'EDUCACION') {
                            if (window._updateEduSpecialties) window._updateEduSpecialties();
                        }
                    };
                }

                const finalRadio = document.querySelector('.exam-target-option input:checked');
                const finalTarget = finalRadio ? finalRadio.value : 'MCER';

                if (currentContext === 'MEDICINA') {
                    const serumsInfo = document.getElementById('serums-info-alert');
                    if (serumsInfo) serumsInfo.style.display = finalTarget === 'SERUMS' ? 'block' : 'none';
                }

                // Preselect configMode based on activeConfig.configType
                const modeVal = (activeConfig && activeConfig.configType) ? activeConfig.configType : 'default';
                const radioDefault = document.querySelector('input[name="configMode"][value="default"]');
                const radioCustom = document.querySelector('input[name="configMode"][value="custom"]');
                if (modeVal === 'default') {
                    if (radioDefault) radioDefault.checked = true;
                } else {
                    if (radioCustom) radioCustom.checked = true;
                }

                renderAreas(finalTarget);
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

        // Save Config
        if (btnSave) {
            btnSave.onclick = async () => {
                const target = document.querySelector('.exam-target-option input:checked').value;
                const configType = document.querySelector('input[name="configMode"]:checked')?.value || 'default';
                
                let selectedAreas;
                if (configType === 'default') {
                    selectedAreas = Array.from(areasGrid.querySelectorAll('.area-checkbox-label input')).map(cb => cb.value);
                } else {
                    selectedAreas = Array.from(areasGrid.querySelectorAll('.area-checkbox-label input:checked')).map(cb => cb.value);
                }

                const careerSelectEl = document.getElementById('config-career');
                const ctxCfg = contexts[currentContext] || contexts['MEDICINA'];
                let career = null;

                if (currentContext === 'MEDICINA' && target === 'SERUMS' && careerSelectEl) {
                    career = careerSelectEl.value;
                } else if (ctxCfg.careerOptions && careerSelectEl) {
                    career = careerSelectEl.value;
                    if (currentContext === 'EDUCACION') {
                        // Append specialty for Primaria (if not General) or Secundaria
                        const specSelect = document.getElementById('config-specialty');
                        if (specSelect && specSelect.value && specSelect.value !== 'General') {
                            if (career === 'EBR - Primaria') {
                                if (specSelect.value === 'Profesor de Innovación Pedagógica') {
                                    career = 'EBR Primaria Profesor de Innovación Pedagógica';
                                } else if (specSelect.value === 'Educación Física') {
                                    career = 'EBR Primaria Educación Física';
                                } else {
                                    career = `EBR Primaria ${specSelect.value}`;
                                }
                            } else {
                                career = `${career} - ${specSelect.value}`;
                            }
                        }
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

                let difficulty = null;
                if (currentContext === 'IDIOMAS') {
                    const diffSelect = document.getElementById('config-difficulty');
                    if (diffSelect) difficulty = diffSelect.value;
                }

                activeConfig = { configType, target, areas: selectedAreas, career, difficulty };
                localStorage.setItem(`simActiveConfig_${currentContext}`, JSON.stringify(activeConfig)); // Persist locally
                localStorage.removeItem('simulator_active_session'); // Clear any pending quiz session on config change

                const token = localStorage.getItem('authToken');
                if (token) {
                    try {
                        // Persist to Database for Cross-Device Sync
                        await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/users/preferences`, {
                            method: 'POST',
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
                renderConfigSummary(summaryBox, {
                    target: target,
                    career: career,
                    difficulty: difficulty,
                    areas: selectedAreas
                });

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
            let careerVal = (activeConfig && activeConfig.career) ? activeConfig.career : null;
            if (!careerVal) {
                if (currentContext === 'MEDICINA') careerVal = 'Medicina Humana';
                else if (currentContext === 'EDUCACION') careerVal = 'EBR - Primaria';
                else if (currentContext === 'IDIOMAS') careerVal = 'en-US';
            }
            if (careerVal) qs += `&career=${encodeURIComponent(careerVal)}`;
            if (activeMode) qs += `&limit=${activeMode}`;   // Filtro por modo
            if (activeDays) qs += `&days=${activeDays}`;     // Filtro por tiempo

            let apiBase = '/api/medico';
            if (currentContext === 'EDUCACION') apiBase = '/api/docente';
            else if (currentContext === 'IDIOMAS') apiBase = '/api/idiomas-simulator';

            const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}${apiBase}/evolution${qs}`);
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
                        datasets: [
                            {
                                label: 'Modo Rápido (10 qs)',
                                data: data.chart.scores10 || [],
                                borderColor: '#10b981',
                                backgroundColor: 'rgba(16, 185, 129, 0.03)',
                                borderWidth: 3,
                                pointBackgroundColor: '#1e293b',
                                pointBorderColor: '#34d399',
                                pointBorderWidth: 2,
                                pointRadius: 4,
                                pointHoverRadius: 6,
                                tension: 0.4,
                                fill: true,
                                spanGaps: true
                            },
                            {
                                label: 'Modo Estudio (20 qs)',
                                data: data.chart.scores20 || [],
                                borderColor: '#3b82f6',
                                backgroundColor: 'rgba(59, 130, 246, 0.03)',
                                borderWidth: 3,
                                pointBackgroundColor: '#1e293b',
                                pointBorderColor: '#60a5fa',
                                pointBorderWidth: 2,
                                pointRadius: 4,
                                pointHoverRadius: 6,
                                tension: 0.4,
                                fill: true,
                                spanGaps: true
                            },
                            {
                                label: 'Simulacros Reales',
                                data: data.chart.scoresReal || [],
                                borderColor: '#f59e0b',
                                backgroundColor: 'rgba(245, 158, 11, 0.03)',
                                borderWidth: 3,
                                pointBackgroundColor: '#1e293b',
                                pointBorderColor: '#fbbf24',
                                pointBorderWidth: 2,
                                pointRadius: 4,
                                pointHoverRadius: 6,
                                tension: 0.4,
                                fill: true,
                                spanGaps: true
                            }
                        ]
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
                                    label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} / 20`
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

                // Apply dataset visibility filters based on activeMode tab
                if (activeMode === 10) {
                    lineChartInst.setDatasetVisibility(0, true);
                    lineChartInst.setDatasetVisibility(1, false);
                    lineChartInst.setDatasetVisibility(2, false);
                } else if (activeMode === 20) {
                    lineChartInst.setDatasetVisibility(0, false);
                    lineChartInst.setDatasetVisibility(1, true);
                    lineChartInst.setDatasetVisibility(2, false);
                } else if (activeMode === 'real') {
                    lineChartInst.setDatasetVisibility(0, false);
                    lineChartInst.setDatasetVisibility(1, false);
                    lineChartInst.setDatasetVisibility(2, true);
                } else {
                    lineChartInst.setDatasetVisibility(0, true);
                    lineChartInst.setDatasetVisibility(1, true);
                    lineChartInst.setDatasetVisibility(2, true);
                }
                lineChartInst.update();
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
            let careerVal = (activeConfig && activeConfig.career) ? activeConfig.career : null;
            if (!careerVal) {
                if (currentContext === 'MEDICINA') careerVal = 'Medicina Humana';
                else if (currentContext === 'EDUCACION') careerVal = 'EBR - Primaria';
                else if (currentContext === 'IDIOMAS') careerVal = 'en-US';
            }
            if (careerVal) qs += `&career=${encodeURIComponent(careerVal)}`;
            if (activeMode) qs += `&limit=${activeMode}`;   // Filtro por modo (10 = Rápido, 20 = Estudio)
            if (activeDays) qs += `&days=${activeDays}`;     // Filtro por tiempo (7, 30)

            let apiBase = '/api/medico';
            if (currentContext === 'EDUCACION') apiBase = '/api/docente';
            else if (currentContext === 'IDIOMAS') apiBase = '/api/idiomas-simulator';

            const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}${apiBase}/stats${qs}`);
            const data = await res.json();
            cachedStats = data.kpis; // Store for AI Analysis

            // Render Stats
            const kpis = data.kpis;
            const scoreEl = document.getElementById('stat-score');
            const accuracyEl = document.getElementById('stat-accuracy');
            const countsEl = document.getElementById('stat-counts-text');
            const masteryEl = document.getElementById('stat-mastery');

            if (scoreEl) scoreEl.textContent = kpis.avg_score || '0.0';

            // ✅ NUEVO: Equivalencia de Exámenes Internacionales en Módulo de Idiomas (4.3)
            const scoreSubEl = document.getElementById('stat-score-sub');
            if (scoreSubEl) {
                if (currentContext === 'IDIOMAS') {
                    const avg = parseFloat(kpis.avg_score) || 0.0;
                    let cefr = 'A1';
                    let eq = '';

                    if (avg >= 18) { cefr = 'C2'; eq = 'IELTS: 8.5-9.0 | TOEFL: 110-120'; }
                    else if (avg >= 16) { cefr = 'C1'; eq = 'IELTS: 7.0-8.0 | TOEFL: 94-109'; }
                    else if (avg >= 14) { cefr = 'B2'; eq = 'IELTS: 5.5-6.5 | TOEFL: 46-93'; }
                    else if (avg >= 12) { cefr = 'B1'; eq = 'IELTS: 4.0-5.0 | TOEFL: 32-45'; }
                    else if (avg >= 10) { cefr = 'A2'; eq = 'IELTS: <4.0 | TOEFL: <32'; }
                    else { cefr = 'A1'; eq = 'IELTS: N/A | TOEFL: N/A'; }

                    const lang = activeConfig?.career || 'en-US';
                    if (lang === 'it-IT') {
                        let celi = 'CELI impatto';
                        if (cefr === 'C2') celi = 'CELI 5 / CILS Tre';
                        else if (cefr === 'C1') celi = 'CELI 4 / CILS Due';
                        else if (cefr === 'B2') celi = 'CELI 3 / CILS Uno';
                        else if (cefr === 'B1') celi = 'CELI 2 / CILS Uno';
                        else if (cefr === 'A2') celi = 'CELI 1 / CILS A2';
                        eq = `CELI/CILS: ${celi}`;
                    }

                    scoreSubEl.innerHTML = `<span style="color:#a78bfa; font-weight:600;">Est. MCER: ${cefr}</span> • <span style="font-size:0.7rem;">${eq}</span>`;
                } else {
                    scoreSubEl.textContent = 'Basado en tus últimos simulacros';
                }
            }

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

            // --- Render Doughnut Chart (Topics/Groups KPI) ---
            const doughnutData = {};
            if (currentContext === 'MEDICINA') {
                const groupDTopics = ['Salud Pública', 'Cuidado Integral de Salud', 'Ética e Interculturalidad', 'Investigación', 'Gestión de Servicios de Salud'];
                groupDTopics.forEach(t => doughnutData[t] = 0);
                kpis.radar_data?.forEach(d => {
                    let cleanSubject = d.subject || 'General';
                    if (cleanSubject.includes(',')) cleanSubject = cleanSubject.split(',')[0].trim();
                    if (groupDTopics.includes(cleanSubject)) {
                        doughnutData[cleanSubject] += parseInt(d.total || 0, 10);
                    }
                });
            } else if (currentContext === 'IDIOMAS') {
                const langTopics = ['Grammar & Use of English', 'Vocabulary & Context', 'Reading Comprehension', 'Listening Comprehension'];
                langTopics.forEach(t => doughnutData[t] = 0);
                kpis.radar_data?.forEach(d => {
                    let cleanSubject = d.subject || 'General';
                    if (cleanSubject.includes(',')) cleanSubject = cleanSubject.split(',')[0].trim();
                    if (langTopics.includes(cleanSubject)) {
                        doughnutData[cleanSubject] += parseInt(d.total || 0, 10);
                    }
                });
            } else if (currentContext === 'EDUCACION') {
                const eduGroups = {
                    'Enfoques y Principios del CNEB': ['Enfoque por competencias', 'Enfoques transversales', 'Principios de la educación peruana'],
                    'Teorías y Procesos del Aprendizaje': ['Constructivismo y socioconstructivismo', 'Aprendizajes significativos', 'Activación y recojo de saberes previos', 'Conflicto o disonancia cognitiva y demanda cognitiva', 'Procesos auxiliares'],
                    'Planificación y Evaluación': ['Planificación pedagógica', 'Evaluación formativa y retroalimentación'],
                    'Clima Escolar e Inclusión': ['Convivencia democrática y clima de aula', 'Educación inclusiva y DUA', 'Características y desarrollo del estudiante']
                };
                const eduGroupLabels = Object.keys(eduGroups);
                eduGroupLabels.forEach(g => doughnutData[g] = 0);
                kpis.radar_data?.forEach(d => {
                    let cleanSubject = d.subject || 'General';
                    if (cleanSubject.includes(',')) cleanSubject = cleanSubject.split(',')[0].trim();
                    for (const gLabel of eduGroupLabels) {
                        if (eduGroups[gLabel].includes(cleanSubject)) {
                            doughnutData[gLabel] += parseInt(d.total || 0, 10);
                            break;
                        }
                    }
                });
            }
            renderDoughnutChart(doughnutData);

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

                    let activeCfg = JSON.parse(localStorage.getItem(`simActiveConfig_${currentContext}`)) || {};
                    let targetExamName = activeCfg.target || 'General';

                    let mockStrengths = "";
                    let mockWeaknesses = "";

                    if (currentContext === 'EDUCACION') {
                        mockStrengths = `
                            <p style='color:#94a3b8; font-size:0.85rem; line-height:1.6; margin-bottom:1rem;'>Las métricas de tu sesión de prueba revelan aptitud pedagógica sólida en fundamentos teóricos:</p>
                            <ul style="margin:0; padding:0; list-style-type: none;">
                                <li style="display:flex; align-items:start; gap:0.75rem; margin-bottom: 0.75rem; color: #cbd5e1; font-size: 0.85rem; line-height: 1.4;"><i class="fas fa-check-circle" style="color: #34d399; margin-top:2px;"></i> <span><strong style='color:#f8fafc;'>Planificación Curricular (${targetExamName}):</strong> Reacción óptima para identificar propósitos de aprendizaje y criterios de evaluación formativa.</span></li>
                                <li style="display:flex; align-items:start; gap:0.75rem; margin-bottom: 0.75rem; color: #cbd5e1; font-size: 0.85rem; line-height: 1.4;"><i class="fas fa-check-circle" style="color: #34d399; margin-top:2px;"></i> <span><strong style='color:#f8fafc;'>Comprensión Lectora:</strong> Excelentes destrezas de análisis crítico, identificación de ideas principales y subtextos.</span></li>
                            </ul>
                        `;

                        mockWeaknesses = `
                            <p style='color:#94a3b8; font-size:0.85rem; line-height:1.6; margin-bottom:1rem;'>Se advierten lagunas de casuística que podrían poner en riesgo tu nombramiento o ascenso.</p>
                            <ul style="margin:0; padding:0; list-style-type: none;">
                                <li style="display:flex; align-items:start; gap:0.75rem; margin-bottom: 0.75rem; color: #cbd5e1; font-size: 0.85rem; line-height: 1.4;"><i class="fas fa-exclamation-triangle" style="color: #fbbf24; margin-top:2px;"></i> <span><strong style='color:#f8fafc;'>Evaluación y Convivencia (${targetExamName}):</strong> Dificultad para resolver dilemas morales complejos y aplicar retroalimentación descriptiva.</span></li>
                            </ul>
                            <div style="margin-top: 1.25rem; padding: 1rem; background: rgba(245, 158, 11, 0.06); border: 1px dashed rgba(245, 158, 11, 0.3); border-radius: 10px;">
                                <span style="font-weight: 700; color: #fbbf24; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.06em; display:block; margin-bottom:0.4rem;">Estrategia Pedagógica Recomendada</span>
                                <span style="font-size: 0.85rem; color: #cbd5e1; line-height: 1.5;">De acuerdo a esta muestra, concentrar tus esfuerzos en simulacros de 'Evaluación Formativa' y revisar rúbricas docentes mejorará considerablemente tu nota en la PUN.</span>
                            </div>
                            <div style="margin-top: 1.5rem; text-align: center; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 1.5rem;">
                                <button onclick="window.uiManager.showAuthPromptModal();" style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 0.6rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 10px rgba(16,185,129,0.3);">
                                    Obtener Diagnóstico Completamente Personalizado IA
                                </button>
                                <p style="font-size: 0.75rem; color: #64748b; margin-top: 0.75rem; line-height: 1.4;">Atención: Esta estadística es generada en un entorno efímero. Crear una cuenta permite a nuestro Motor Deep Learning correlacionar tu historial completo sobre miles de casos pedagógicos de ${targetExamName}.</p>
                            </div>
                        `;
                    } else if (currentContext === 'IDIOMAS') {
                        mockStrengths = `
                            <p style='color:#94a3b8; font-size:0.85rem; line-height:1.6; margin-bottom:1rem;'>Tus destrezas comunicativas pasivas muestran un nivel de comprensión sólido:</p>
                            <ul style="margin:0; padding:0; list-style-type: none;">
                                <li style="display:flex; align-items:start; gap:0.75rem; margin-bottom: 0.75rem; color: #cbd5e1; font-size: 0.85rem; line-height: 1.4;"><i class="fas fa-check-circle" style="color: #34d399; margin-top:2px;"></i> <span><strong style='color:#f8fafc;'>Reading & Listening (${targetExamName}):</strong> Capacidad de aislar el significado central y deducir detalles contextuales de diálogos nativos.</span></li>
                                <li style="display:flex; align-items:start; gap:0.75rem; margin-bottom: 0.75rem; color: #cbd5e1; font-size: 0.85rem; line-height: 1.4;"><i class="fas fa-check-circle" style="color: #34d399; margin-top:2px;"></i> <span><strong style='color:#f8fafc;'>Vocabulary Range:</strong> Buena correspondencia inicial de definiciones con sus sinónimos contextuales.</span></li>
                            </ul>
                        `;

                        mockWeaknesses = `
                            <p style='color:#94a3b8; font-size:0.85rem; line-height:1.6; margin-bottom:1rem;'>Se detectan brechas gramaticales y de precisión lingüística que restan fluidez:</p>
                            <ul style="margin:0; padding:0; list-style-type: none;">
                                <li style="display:flex; align-items:start; gap:0.75rem; margin-bottom: 0.75rem; color: #cbd5e1; font-size: 0.85rem; line-height: 1.4;"><i class="fas fa-exclamation-triangle" style="color: #fbbf24; margin-top:2px;"></i> <span><strong style='color:#f8fafc;'>Grammar & Use of English (${targetExamName}):</strong> Imprecisión en tiempos perfectos, modales de especulación y colocaciones gramaticales.</span></li>
                            </ul>
                            <div style="margin-top: 1.25rem; padding: 1rem; background: rgba(245, 158, 11, 0.06); border: 1px dashed rgba(245, 158, 11, 0.3); border-radius: 10px;">
                                <span style="font-weight: 700; color: #fbbf24; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.06em; display:block; margin-bottom:0.4rem;">Estrategia Lingüística Recomendada</span>
                                <span style="font-size: 0.85rem; color: #cbd5e1; line-height: 1.5;">Práctica de forma aislada mediante el módulo 'Aprender (Teoría)' y guarda los verbos y contracciones falladas en 'Mi Vocabulario' para repasar.</span>
                            </div>
                            <div style="margin-top: 1.5rem; text-align: center; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 1.5rem;">
                                <button onclick="window.uiManager.showAuthPromptModal();" style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 0.6rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 10px rgba(16,185,129,0.3);">
                                    Obtener Diagnóstico Completamente Personalizado IA
                                </button>
                                <p style="font-size: 0.75rem; color: #64748b; margin-top: 0.75rem; line-height: 1.4;">Atención: Esta estadística es generada en un entorno efímero. Crear una cuenta permite a nuestro Motor Deep Learning correlacionar tu historial completo sobre tus habilidades del nivel ${targetExamName}.</p>
                            </div>
                        `;
                    } else {
                        mockStrengths = `
                            <p style='color:#94a3b8; font-size:0.85rem; line-height:1.6; margin-bottom:1rem;'>Las métricas de tu sesión de prueba revelan patrones de decisión fundamentales muy bien afianzados:</p>
                            <ul style="margin:0; padding:0; list-style-type: none;">
                                <li style="display:flex; align-items:start; gap:0.75rem; margin-bottom: 0.75rem; color: #cbd5e1; font-size: 0.85rem; line-height: 1.4;"><i class="fas fa-check-circle" style="color: #34d399; margin-top:2px;"></i> <span><strong style='color:#f8fafc;'>Diagnóstico Diferencial (${targetExamName}):</strong> Reacción óptima frente a escenarios clínicos de presión temporal, con alta asimilación de guías clínicas primarias.</span></li>
                                <li style="display:flex; align-items:start; gap:0.75rem; margin-bottom: 0.75rem; color: #cbd5e1; font-size: 0.85rem; line-height: 1.4;"><i class="fas fa-check-circle" style="color: #34d399; margin-top:2px;"></i> <span><strong style='color:#f8fafc;'>Bloque Estratégico:</strong> Rendimiento transversal en áreas materno-infantiles que sugiere bases sólidas de razonamiento médico aplicado.</span></li>
                            </ul>
                        `;

                        mockWeaknesses = `
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
                    }

                    document.getElementById('ai-strengths').innerHTML = mockStrengths;
                    document.getElementById('ai-weaknesses').innerHTML = mockWeaknesses;
                }, 1500);
                return;
            }

            try {
                // LLAMADA REAL A LA IA DE DIAGNÓSTICO PROFUNDO
                const response = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/analytics/diagnostic`, {
                    method: 'POST',
                    body: JSON.stringify({ stats: cachedStats, context: currentContext })
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

                        let activeCfgLogs = JSON.parse(localStorage.getItem(`simActiveConfig_${currentContext}`)) || {};
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

        // 1. Helper to update score subelement for guests
        function updateScoreSub(avgScore) {
            const scoreSubEl = document.getElementById('stat-score-sub');
            if (!scoreSubEl) return;
            if (currentContext === 'IDIOMAS') {
                const avg = parseFloat(avgScore) || 0.0;
                let cefr = 'A1';
                let eq = '';

                if (avg >= 18) { cefr = 'C2'; eq = 'IELTS: 8.5-9.0 | TOEFL: 110-120'; }
                else if (avg >= 16) { cefr = 'C1'; eq = 'IELTS: 7.0-8.0 | TOEFL: 94-109'; }
                else if (avg >= 14) { cefr = 'B2'; eq = 'IELTS: 5.5-6.5 | TOEFL: 46-93'; }
                else if (avg >= 12) { cefr = 'B1'; eq = 'IELTS: 4.0-5.0 | TOEFL: 32-45'; }
                else if (avg >= 10) { cefr = 'A2'; eq = 'IELTS: <4.0 | TOEFL: <32'; }
                else { cefr = 'A1'; eq = 'IELTS: N/A | TOEFL: N/A'; }

                const lang = activeConfig?.career || 'en-US';
                if (lang === 'it-IT') {
                    let celi = 'CELI impatto';
                    if (cefr === 'C2') celi = 'CELI 5 / CILS Tre';
                    else if (cefr === 'C1') celi = 'CELI 4 / CILS Due';
                    else if (cefr === 'B2') celi = 'CELI 3 / CILS Uno';
                    else if (cefr === 'B1') celi = 'CELI 2 / CILS Uno';
                    else if (cefr === 'A2') celi = 'CELI 1 / CILS A2';
                    eq = `CELI/CILS: ${celi}`;
                }
                scoreSubEl.innerHTML = `<span style="color:#a78bfa; font-weight:600;">Est. MCER: ${cefr}</span> • <span style="font-size:0.7rem;">${eq}</span>`;
            } else {
                scoreSubEl.textContent = 'Basado en tus últimos simulacros';
            }
        }

        // 2. KPI Demo values
        const scoreEl = document.getElementById('stat-score');
        const accuracyEl = document.getElementById('stat-accuracy');
        const countsEl = document.getElementById('stat-counts-text');
        const masteryEl = document.getElementById('stat-mastery');

        let currentAvgScore = '14.5';
        if (scoreEl) scoreEl.textContent = currentAvgScore;
        if (accuracyEl) accuracyEl.textContent = '72%';
        if (countsEl) countsEl.textContent = '50 / 20';
        if (masteryEl) masteryEl.textContent = '12';

        // 3. Evolution Chart Demo (Context-Aware)
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

            let demoLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May'];
            let demoScores10 = [11.0, 13.0, 12.0, 15.0, 14.5];
            let demoScores20 = [12.0, 11.5, 13.8, 14.2, 16.0];
            let demoScoresReal = [10.0, 11.8, 12.5, 13.0, 14.2];

            if (currentContext === 'EDUCACION') {
                demoLabels = ['Sesión 1', 'Sesión 2', 'Sesión 3', 'Sesión 4', 'Sesión 5'];
                demoScores10 = [12.5, 13.8, 14.2, 15.0, 15.8];
                demoScores20 = [11.0, 12.5, 13.0, 14.5, 15.0];
                demoScoresReal = [10.0, 11.5, 12.2, 13.8, 14.5];
            } else if (currentContext === 'IDIOMAS') {
                demoLabels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5'];
                demoScores10 = [10.5, 12.0, 11.8, 13.5, 14.5];
                demoScores20 = [11.5, 11.0, 12.5, 14.0, 15.0];
                demoScoresReal = [9.5, 10.8, 11.5, 12.2, 13.5];
            }

            lineChartInst = new Chart(evolutionCtx, {
                type: 'line',
                data: {
                    labels: demoLabels,
                    datasets: [
                        {
                            label: 'Modo Rápido (10 qs) [Demo]',
                            data: demoScores10,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.03)',
                            borderWidth: 3,
                            pointBackgroundColor: '#1e293b',
                            pointBorderColor: '#34d399',
                            pointBorderWidth: 2,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            tension: 0.4,
                            fill: true,
                            spanGaps: true
                        },
                        {
                            label: 'Modo Estudio (20 qs) [Demo]',
                            data: demoScores20,
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.03)',
                            borderWidth: 3,
                            pointBackgroundColor: '#1e293b',
                            pointBorderColor: '#60a5fa',
                            pointBorderWidth: 2,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            tension: 0.4,
                            fill: true,
                            spanGaps: true
                        },
                        {
                            label: 'Simulacros Reales [Demo]',
                            data: demoScoresReal,
                            borderColor: '#f59e0b',
                            backgroundColor: 'rgba(245, 158, 11, 0.03)',
                            borderWidth: 3,
                            pointBackgroundColor: '#1e293b',
                            pointBorderColor: '#fbbf24',
                            pointBorderWidth: 2,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            tension: 0.4,
                            fill: true,
                            spanGaps: true
                        }
                    ]
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
                        legend: {
                            display: true,
                            position: 'top',
                            labels: { color: '#64748b', boxWidth: 12, font: { size: 11 } }
                        },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} / 20`
                            }
                        }
                    }
                }
            });

            // Apply dataset visibility filters based on activeMode tab for Demo
            if (activeMode === 10) {
                lineChartInst.setDatasetVisibility(0, true);
                lineChartInst.setDatasetVisibility(1, false);
                lineChartInst.setDatasetVisibility(2, false);
            } else if (activeMode === 20) {
                lineChartInst.setDatasetVisibility(0, false);
                lineChartInst.setDatasetVisibility(1, true);
                lineChartInst.setDatasetVisibility(2, false);
            } else if (activeMode === 'real') {
                lineChartInst.setDatasetVisibility(0, false);
                lineChartInst.setDatasetVisibility(1, false);
                lineChartInst.setDatasetVisibility(2, true);
            } else {
                lineChartInst.setDatasetVisibility(0, true);
                lineChartInst.setDatasetVisibility(1, true);
                lineChartInst.setDatasetVisibility(2, true);
            }
            lineChartInst.update();
        }

        // 4. Bar Chart Demo (Context-Aware Mock Data)
        const demoAreasMap = currentContext === 'IDIOMAS' ? {
            'Grammar & Use of English': { correct: 85, total: 100 },
            'Vocabulary & Context': { correct: 80, total: 100 },
            'Reading Comprehension': { correct: 70, total: 100 },
            'Listening Comprehension': { correct: 65, total: 100 }
        } : (currentContext === 'EDUCACION' ? {
            'Enfoque por competencias': { correct: 88, total: 100 },
            'Constructivismo y socioconstructivismo': { correct: 75, total: 100 },
            'Planificación pedagógica': { correct: 68, total: 100 },
            'Evaluación formativa y retroalimentación': { correct: 62, total: 100 },
            'Convivencia democrática y clima de aula': { correct: 55, total: 100 },
            'Características y desarrollo del estudiante': { correct: 50, total: 100 }
        } : {
            'Ginecología y Obstetricia': { correct: 90, total: 100 },
            'Medicina Interna': { correct: 85, total: 100 },
            'Pediatría': { correct: 75, total: 100 },
            'Salud Pública': { correct: 65, total: 100 },
            'Fisiología': { correct: 60, total: 100 },
            'Cardiología': { correct: 50, total: 100 }
        });
        renderBarChart(demoAreasMap);

        // 4b. Doughnut Chart Demo
        const demoDoughnutData = currentContext === 'MEDICINA' ? {
            'Salud Pública': 15,
            'Cuidado Integral de Salud': 12,
            'Ética e Interculturalidad': 8,
            'Investigación': 6,
            'Gestión de Servicios de Salud': 9
        } : (currentContext === 'IDIOMAS' ? {
            'Grammar & Use of English': 35,
            'Vocabulary & Context': 25,
            'Reading Comprehension': 20,
            'Listening Comprehension': 15
        } : {
            'Enfoques y Principios del CNEB': 14,
            'Teorías y Procesos del Aprendizaje': 22,
            'Planificación y Evaluación': 18,
            'Clima Escolar e Inclusión': 11
        });
        renderDoughnutChart(demoDoughnutData);

        // 5. Persistence: Check for local demo stats (Domain-Specific)
        const domainKey = currentContext.toLowerCase();
        const localStatsStr = localStorage.getItem(`guest_demo_stats_${domainKey}`);

        if (localStatsStr) {
            try {
                const stats = JSON.parse(localStatsStr);
                currentAvgScore = stats.avgScore || '0';
                if (scoreEl) scoreEl.textContent = currentAvgScore;
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

                    // Update Doughnut Chart based on areaStats
                    const guestDoughnut = {};
                    if (currentContext === 'MEDICINA') {
                        const groupDTopics = ['Salud Pública', 'Cuidado Integral de Salud', 'Ética e Interculturalidad', 'Investigación', 'Gestión de Servicios de Salud'];
                        groupDTopics.forEach(t => guestDoughnut[t] = 0);
                        Object.keys(stats.areaStats).forEach(topic => {
                            if (groupDTopics.includes(topic)) {
                                guestDoughnut[topic] += parseInt(stats.areaStats[topic].total || 0, 10);
                            }
                        });
                    } else if (currentContext === 'IDIOMAS') {
                        const langTopics = ['Grammar & Use of English', 'Vocabulary & Context', 'Reading Comprehension', 'Listening Comprehension'];
                        langTopics.forEach(t => guestDoughnut[t] = 0);
                        Object.keys(stats.areaStats).forEach(topic => {
                            if (langTopics.includes(topic)) {
                                guestDoughnut[topic] += parseInt(stats.areaStats[topic].total || 0, 10);
                            }
                        });
                    } else if (currentContext === 'EDUCACION') {
                        const eduGroups = {
                            'Enfoques y Principios del CNEB': ['Enfoque por competencias', 'Enfoques transversales', 'Principios de la educación peruana'],
                            'Teorías y Procesos del Aprendizaje': ['Constructivismo y socioconstructivismo', 'Aprendizajes significativos', 'Activación y recojo de saberes previos', 'Conflicto o disonancia cognitiva y demanda cognitiva', 'Procesos auxiliares'],
                            'Planificación y Evaluación': ['Planificación pedagógica', 'Evaluación formativa y retroalimentación'],
                            'Clima Escolar e Inclusión': ['Convivencia democrática y clima de aula', 'Educación inclusiva y DUA', 'Características y desarrollo del estudiante']
                        };
                        const eduGroupLabels = Object.keys(eduGroups);
                        eduGroupLabels.forEach(g => guestDoughnut[g] = 0);
                        Object.keys(stats.areaStats).forEach(topic => {
                            for (const gLabel of eduGroupLabels) {
                                if (eduGroups[gLabel].includes(topic)) {
                                    guestDoughnut[gLabel] += parseInt(stats.areaStats[topic].total || 0, 10);
                                    break;
                                }
                            }
                        });
                    }
                    renderDoughnutChart(guestDoughnut);
                }
            } catch (e) { console.error("Error parsing local stats", e); }
        }

        updateScoreSub(currentAvgScore);

        // 6. Ocultar Loading
        const loading = document.getElementById('loading');
        const content = document.getElementById('dashboard-content');
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'block';
    }

    // ==========================================
    // 🌎 CCI (Chat Conversacional de Idiomas) & Audio
    // ==========================================

    function stopAllAudio() {
        if (window.currentQuizAudio) {
            try { window.currentQuizAudio.pause(); } catch (e) { }
        }
        if (window.currentChatAudio) {
            try { window.currentChatAudio.pause(); } catch (e) { }
        }
    }

    function setupLanguageTabs() {
        const navTabs = document.getElementById('languages-nav-tabs');
        const tabSim = document.getElementById('tab-simulador');
        const tabTeoria = document.getElementById('tab-teoria');
        const tabVocab = document.getElementById('tab-vocabulario');

        const simSections = document.getElementById('sim-dashboard-sections');
        const teoriaSection = document.getElementById('cci-teoria-section');
        const vocabSection = document.getElementById('cci-vocabulario-section');

        if (!navTabs || !tabSim || !simSections) return;

        if (currentContext !== 'IDIOMAS') {
            navTabs.style.display = 'none';
            if (teoriaSection) teoriaSection.style.display = 'none';
            if (vocabSection) vocabSection.style.display = 'none';
            simSections.style.display = 'block';
            return;
        }

        navTabs.style.display = 'flex';

        const switchTab = (mode) => {
            stopAllAudio();

            // RUTA SEGURA: Bloquear accesos a visitantes (no registrados)
            if (mode !== 'simulator' && !localStorage.getItem('authToken')) {
                if (window.uiManager && typeof window.uiManager.showAuthPromptModal === 'function') {
                    window.uiManager.showAuthPromptModal();
                } else {
                    alert('Debes registrarte o iniciar sesión para acceder a esta sección.');
                }
                return;
            }

            // Remove active from all buttons
            [tabSim, tabTeoria, tabVocab].forEach(btn => {
                if (btn) btn.classList.remove('active');
            });

            // Hide all sections
            [simSections, teoriaSection, vocabSection].forEach(sec => {
                if (sec) sec.style.display = 'none';
            });

            if (mode === 'teoria') {
                if (tabTeoria) tabTeoria.classList.add('active');
                if (teoriaSection) teoriaSection.style.display = 'block';

                const url = new URL(window.location.href);
                url.searchParams.set('mode', 'teoria');
                window.history.replaceState({}, '', url.toString());

                loadSyllabus();
            } else if (mode === 'vocabulario') {
                if (tabVocab) tabVocab.classList.add('active');
                if (vocabSection) vocabSection.style.display = 'block';

                const url = new URL(window.location.href);
                url.searchParams.set('mode', 'vocabulario');
                window.history.replaceState({}, '', url.toString());

                loadVocabulary();
            } else {
                if (tabSim) tabSim.classList.add('active');
                if (simSections) simSections.style.display = 'block';

                const url = new URL(window.location.href);
                url.searchParams.delete('mode');
                window.history.replaceState({}, '', url.toString());
            }
        };

        if (tabSim) tabSim.addEventListener('click', () => switchTab('simulator'));
        if (tabTeoria) tabTeoria.addEventListener('click', () => switchTab('teoria'));
        if (tabVocab) tabVocab.addEventListener('click', () => switchTab('vocabulario'));

        // Check initial mode on load
        const urlParams = new URLSearchParams(window.location.search);
        const modeParam = urlParams.get('mode');
        const token = localStorage.getItem('authToken');

        if (modeParam && modeParam !== 'simulator' && !token) {
            // Visitor trying to access protected tab directly via URL param -> fallback to simulator and show prompt
            switchTab('simulator');
            setTimeout(() => {
                if (window.uiManager && typeof window.uiManager.showAuthPromptModal === 'function') {
                    window.uiManager.showAuthPromptModal();
                }
            }, 600);
        } else if (modeParam === 'teoria') {
            switchTab('teoria');
        } else if (modeParam === 'vocabulario') {
            switchTab('vocabulario');
        } else {
            switchTab('simulator');
        }
    }

    async function syncActiveConfig() {
        if (!activeConfig) return;
        localStorage.setItem(`simActiveConfig_${currentContext}`, JSON.stringify(activeConfig));

        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/users/preferences`, {
                    method: 'POST',
                    body: JSON.stringify({
                        domain: currentContext.toLowerCase(),
                        config_json: activeConfig
                    })
                });
            } catch (err) {
                console.error("Error syncing active config", err);
            }
        }

        // Update active config summary on the page
        const summaryBox = document.getElementById('active-config-summary');
        if (summaryBox) {
            renderConfigSummary(summaryBox, activeConfig);
        }

        // Also update mode links
        const ctxConfig = contexts[currentContext] || contexts['MEDICINA'];
        updateModeLinks(ctxConfig);
    }

    // ==========================================
    // 📖 LÓGICA DE TEMARIO Y LECCIONES INTERACTIVAS
    // ==========================================
    let activeLesson = null;
    let activeLessonQuizAnswers = [];
    let lessonChatHistory = [];

    async function loadSyllabus() {
        const listContainer = document.getElementById('cci-syllabus-list');
        const metaInfo = document.getElementById('syllabus-meta-info');
        if (!listContainer || !metaInfo) return;

        listContainer.innerHTML = '<div style="text-align:center; padding:2rem;"><i class="fas fa-circle-notch fa-spin"></i> Cargando...</div>';
        metaInfo.innerText = "Cargando temas...";

        try {
            const lang = activeConfig?.career || 'en-US';
            const level = activeConfig?.difficulty || 'A1';

            const langDisplay = lang === 'it-IT' ? 'Italiano' : 'Inglés';
            metaInfo.innerText = `${langDisplay} • Nivel ${level}`;

            const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/languages/syllabus?languageCode=${lang}&level=${level}`);
            const data = await res.json();

            if (!data.success || !data.syllabus || data.syllabus.length === 0) {
                listContainer.innerHTML = '<div style="color:var(--text-muted); padding:1rem; text-align:center; font-size:0.85rem;">No hay temas disponibles para este nivel e idioma aún.</div>';
                return;
            }

            listContainer.innerHTML = '';

            // Agrupar por unidades
            const units = {};
            data.syllabus.forEach(item => {
                if (!units[item.unit_number]) {
                    units[item.unit_number] = [];
                }
                units[item.unit_number].push(item);
            });

            Object.keys(units).sort().forEach(unitNum => {
                const unitDiv = document.createElement('div');
                unitDiv.className = 'syllabus-unit';
                unitDiv.innerHTML = `<div class="syllabus-unit-title">Unidad ${unitNum}</div>`;

                units[unitNum].forEach(topic => {
                    const topicCard = document.createElement('div');
                    topicCard.className = `syllabus-topic-card ${activeLesson && activeLesson.id === topic.id ? 'active' : ''}`;
                    topicCard.dataset.id = topic.id;

                    const statusClass = topic.completed ? 'completed' : 'pending';
                    const statusIcon = topic.completed ? 'fas fa-check-circle' : 'far fa-circle';

                    topicCard.innerHTML = `
                        <div class="topic-card-info">
                            <div class="topic-card-title">${topic.topic_name}</div>
                            <div class="topic-card-desc">${topic.description}</div>
                        </div>
                        <div class="topic-card-status ${statusClass}">
                            <i class="${statusIcon}"></i>
                        </div>
                    `;

                    topicCard.addEventListener('click', () => learnTopic(topic));
                    unitDiv.appendChild(topicCard);
                });

                listContainer.appendChild(unitDiv);
            });

        } catch (err) {
            console.error("Error cargando temario:", err);
            listContainer.innerHTML = '<div style="color:#ef4444; padding:1rem; text-align:center; font-size:0.85rem;"><i class="fas fa-exclamation-circle"></i> Error al cargar el temario.</div>';
        }
    }

    async function learnTopic(topic) {
        document.querySelectorAll('.syllabus-topic-card').forEach(card => card.classList.remove('active'));
        const card = document.querySelector(`.syllabus-topic-card[data-id="${topic.id}"]`);
        if (card) card.classList.add('active');

        // Smooth scroll to lesson content on mobile
        if (window.innerWidth < 900) {
            const lessonPanel = document.getElementById('cci-syllabus-lesson-panel');
            if (lessonPanel) {
                lessonPanel.scrollIntoView({ behavior: 'smooth' });
            }
        }

        const emptyState = document.getElementById('lesson-empty-state');
        const contentArea = document.getElementById('lesson-content-area');
        if (emptyState) emptyState.style.display = 'none';
        if (contentArea) contentArea.style.display = 'block';

        document.getElementById('lesson-badge-level').innerText = topic.level;
        document.getElementById('lesson-title').innerText = topic.topic_name;

        const explanationEl = document.getElementById('lesson-explanation');
        const exercisesWrapper = document.getElementById('lesson-exercises-wrapper');
        const completeBtn = document.getElementById('btn-lesson-complete');

        explanationEl.innerHTML = '<div style="text-align:center; padding:3rem;"><i class="fas fa-circle-notch fa-spin fa-2x"></i><p style="margin-top:1rem; font-size:0.85rem; color:var(--text-muted);">Gemini está preparando tu clase interactiva...</p></div>';
        if (exercisesWrapper) {
            exercisesWrapper.innerHTML = '';
        }

        const token = localStorage.getItem('authToken');
        if (completeBtn) {
            if (!token) {
                completeBtn.style.display = 'none';
            } else {
                completeBtn.style.display = 'flex';
                if (topic.completed) {
                    completeBtn.classList.add('completed');
                    completeBtn.querySelector('i').className = 'fas fa-check-circle';
                    completeBtn.querySelector('span').innerText = 'Completado';
                } else {
                    completeBtn.classList.remove('completed');
                    completeBtn.querySelector('i').className = 'far fa-circle';
                    completeBtn.querySelector('span').innerText = 'Completar';
                }

                completeBtn.onclick = async () => {
                    const isCompletedNow = !completeBtn.classList.contains('completed');
                    try {
                        completeBtn.disabled = true;
                        const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/languages/syllabus/progress`, {
                            method: 'POST',
                            body: JSON.stringify({ syllabusId: topic.id, completed: isCompletedNow })
                        });
                        const data = await res.json();

                        if (data.success) {
                            topic.completed = isCompletedNow;
                            loadSyllabus();
                            if (isCompletedNow) {
                                completeBtn.classList.add('completed');
                                completeBtn.querySelector('i').className = 'fas fa-check-circle';
                                completeBtn.querySelector('span').innerText = 'Completado';
                            } else {
                                completeBtn.classList.remove('completed');
                                completeBtn.querySelector('i').className = 'far fa-circle';
                                completeBtn.querySelector('span').innerText = 'Completar';
                            }
                        }
                    } catch (e) {
                        console.error("Error toggle progress", e);
                    } finally {
                        completeBtn.disabled = false;
                    }
                };
            }
        }

        try {
            const lang = activeConfig?.career || 'en-US';
            const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/languages/syllabus/lesson/learn`, {
                method: 'POST',
                body: JSON.stringify({
                    topicId: topic.id,
                    topicName: topic.topic_name,
                    languageCode: lang,
                    cefrLevel: topic.level
                })
            });

            let resJson = null;
            try {
                resJson = await res.json();
            } catch (e) { }

            if (res.status === 403) {
                const user = window.sessionManager ? window.sessionManager.getUser() : null;
                const isAdmin = user && user.role === 'admin';

                if (resJson && resJson.error && resJson.error.includes('generado')) {
                    if (isAdmin) {
                        explanationEl.innerHTML = `
                            <div style="color:var(--text-muted); text-align:center; padding:3rem;">
                                <i class="fas fa-magic fa-2x" style="margin-bottom:1rem; color:#8b5cf6;"></i>
                                <h4>Contenido Vacío (Modo Admin)</h4>
                                <p style="font-size:0.85rem; margin-bottom:1.5rem;">Esta lección no tiene contenido en la base de datos todavía. Como eres administrador, puedes generarlo con IA para guardarlo permanentemente.</p>
                                <button id="btn-admin-generate-lesson" class="btn-premium btn-premium-ia">
                                    <i class="fas fa-magic"></i> Generar con IA ✨
                                </button>
                            </div>
                        `;
                        const btnGen = document.getElementById('btn-admin-generate-lesson');
                        if (btnGen) {
                            btnGen.onclick = () => triggerAdminLessonGeneration(topic);
                        }
                    } else {
                        explanationEl.innerHTML = `
                            <div style="color:var(--text-muted); text-align:center; padding:3rem;">
                                <i class="fas fa-clock fa-2x" style="margin-bottom:1rem; color:#a78bfa;"></i>
                                <h4>Clase en Redacción</h4>
                                <p style="font-size:0.85rem; max-width:320px; margin:0 auto;">El contenido de esta lección aún no ha sido redactado por los administradores. Por favor, avisa a tu tutor o vuelve más tarde.</p>
                            </div>
                        `;
                    }
                } else {
                    if (window.uiManager && typeof window.uiManager.showPaywallModal === 'function') {
                        window.uiManager.showPaywallModal();
                    } else {
                        alert('Acceso premium requerido para cargar lecciones teóricas.');
                    }
                    explanationEl.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:2rem;"><i class="fas fa-lock fa-2x" style="margin-bottom:0.5rem; color:#f59e0b;"></i><br>Lección bloqueada. Actualiza a Premium para aprender con IA.</div>';
                }
                return;
            }

            if (!res.ok) throw new Error("HTTP " + res.status);
            const data = resJson || await res.json();
            if (!data.success || !data.lesson) throw new Error("Generación fallida");

            activeLesson = { ...topic, ...data.lesson };

            // Inyectar botón de regenerar y editar para administradores en el encabezado si la lección cargó con éxito
            const headerActions = document.getElementById('lesson-header-actions');
            if (headerActions) {
                const oldAdminBtn = document.getElementById('btn-lesson-admin-regenerate');
                if (oldAdminBtn) oldAdminBtn.remove();
                const oldEditBtn = document.getElementById('btn-lesson-admin-edit');
                if (oldEditBtn) oldEditBtn.remove();

                const user = window.sessionManager ? window.sessionManager.getUser() : null;
                if (user && user.role === 'admin') {
                    // Botón Regenerar con IA
                    const adminBtn = document.createElement('button');
                    adminBtn.id = 'btn-lesson-admin-regenerate';
                    adminBtn.className = 'btn-premium btn-premium-secondary';
                    adminBtn.style.cssText = 'background:rgba(139, 92, 246, 0.1) !important; border:1px solid rgba(139, 92, 246, 0.3) !important; color:#a78bfa !important; padding:0.5rem 0.8rem; border-radius:8px; font-size:0.8rem; cursor:pointer; display:flex; align-items:center; gap:0.4rem;';
                    adminBtn.innerHTML = '<i class="fas fa-sync"></i> Regenerar con IA';
                    adminBtn.onclick = () => triggerAdminLessonGeneration(topic, true);
                    headerActions.appendChild(adminBtn);

                    // Botón Editar Contenido
                    const editBtn = document.createElement('button');
                    editBtn.id = 'btn-lesson-admin-edit';
                    editBtn.className = 'btn-premium btn-premium-secondary';
                    editBtn.style.cssText = 'background:rgba(59, 130, 246, 0.1) !important; border:1px solid rgba(59, 130, 246, 0.3) !important; color:#60a5fa !important; padding:0.5rem 0.8rem; border-radius:8px; font-size:0.8rem; cursor:pointer; display:flex; align-items:center; gap:0.4rem; margin-left:0.5rem;';
                    editBtn.innerHTML = '<i class="fas fa-edit"></i> Editar Contenido';
                    editBtn.onclick = () => openLessonEditorModal(topic);
                    headerActions.appendChild(editBtn);
                }
            }

            explanationEl.innerHTML = window.MarkdownRenderer.render(activeLesson.explanation);
            renderLessonInteractiveExercises();

        } catch (err) {
            console.error("Error al aprender tema:", err);
            explanationEl.innerHTML = '<div style="color:#ef4444; text-align:center; padding:2rem;"><i class="fas fa-exclamation-circle"></i> No se pudo cargar la lección. Verifica tu conexión e intenta de nuevo.</div>';
        }
    }

    async function triggerAdminLessonGeneration(topic, regenerate = false) {
        const explanationEl = document.getElementById('lesson-explanation');
        if (!explanationEl) return;
        explanationEl.innerHTML = '<div style="text-align:center; padding:3rem;"><i class="fas fa-circle-notch fa-spin fa-2x"></i><p style="margin-top:1rem; font-size:0.85rem; color:var(--text-muted);">Generando y persistiendo lección en base de datos con Gemini...</p></div>';

        try {
            const lang = activeConfig?.career || 'en-US';
            const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/languages/syllabus/lesson/learn`, {
                method: 'POST',
                body: JSON.stringify({
                    topicId: topic.id,
                    topicName: topic.topic_name,
                    languageCode: lang,
                    cefrLevel: topic.level,
                    regenerate: regenerate
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "HTTP " + res.status);
            }
            const data = await res.json();
            if (!data.success || !data.lesson) throw new Error("Generación fallida");

            window.uiManager?.showToast("Lección generada y guardada en BD", "success");
            // Volver a cargar el tema para visualizarlo
            learnTopic(topic);
        } catch (err) {
            console.error("Error al generar lección por admin:", err);
            explanationEl.innerHTML = `<div style="color:#ef4444; text-align:center; padding:2rem;"><i class="fas fa-exclamation-circle"></i> Error al generar lección: ${err.message}. Intenta de nuevo.</div>`;
        }
    }

    function renderLessonInteractiveExercises() {
        const wrapper = document.getElementById('lesson-exercises-wrapper');
        if (!wrapper || !activeLesson || !Array.isArray(activeLesson.exercises)) return;

        let html = '';
        activeLesson.exercises.forEach((ex, blockIndex) => {
            const instructions = ex.instructions || 'Completa los espacios en blanco:';
            const type = ex.type || 'sentences';

            html += `
                <div class="syllabus-exercise-block" data-block-index="${blockIndex}">
                    <div class="syllabus-exercise-instructions">
                        <i class="fas fa-edit" style="color:#a78bfa;"></i> ${instructions}
                    </div>
            `;

            if (type === 'table') {
                const headers = ex.headers || ['Ejercicio', 'Tu respuesta'];
                html += `
                    <div class="syllabus-table-wrapper">
                        <table class="syllabus-interactive-table">
                            <thead>
                                <tr>
                                    ${headers.map(h => `<th>${h}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                `;

                ex.items.forEach(item => {
                    const template = item.sentence_template || '';
                    const cells = template.split('|').map(c => c.trim());
                    
                    let rowCellsHtml = '';
                    let inputCounter = 0;
                    const correctAnswersList = (item.correct_answer || '').split('|').map(a => a.trim());

                    cells.forEach(cellText => {
                        let cellContent = cellText;
                        if (cellText.includes('[_____]') || cellText === '[_____]') {
                            const parts = cellText.split('[_____]');
                            let cellHtml = '';
                            if (parts.length > 1) {
                                cellHtml = parts.reduce((acc, part, i) => {
                                    if (i === 0) return part;
                                    const correctAns = correctAnswersList[inputCounter] || item.correct_answer || '';
                                    const inputId = `${item.id}_${inputCounter}`;
                                    const inputHtml = `<input type="text" class="syllabus-fill-blank-input" data-item-id="${inputId}" data-correct="${correctAns}" data-hint="${escapeHtml(item.hint || '')}" data-context="${escapeHtml(item.context || '')}" placeholder="..." autocomplete="off" style="width: 100%; max-width: 180px; margin: 0 4px; display: inline-block;">`;
                                    inputCounter++;
                                    return acc + inputHtml + part;
                                }, '');
                            } else {
                                const correctAns = correctAnswersList[inputCounter] || item.correct_answer || '';
                                const inputId = `${item.id}_${inputCounter}`;
                                const inputHtml = `<input type="text" class="syllabus-fill-blank-input" data-item-id="${inputId}" data-correct="${correctAns}" data-hint="${escapeHtml(item.hint || '')}" data-context="${escapeHtml(item.context || '')}" placeholder="..." autocomplete="off" style="width: 100%; max-width: 180px; margin: 0; display: inline-block;">`;
                                inputCounter++;
                                cellHtml = inputHtml;
                            }
                            
                            const primaryInputId = `${item.id}_0`;
                            
                            cellContent = `
                                <div style="display: flex; flex-direction: column; gap: 0.3rem; align-items: flex-start; min-width: 150px; width: 100%;">
                                    <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; width: 100%; line-height: 1.6;">
                                        ${cellHtml}
                                        ${item.hint ? `<span style="font-size:1.1rem; cursor:help; color:#a78bfa;" title="${escapeHtml(item.hint)}"><i class="far fa-lightbulb"></i></span>` : ''}
                                    </div>
                                    <div class="syllabus-item-feedback" id="feedback-${primaryInputId}" style="margin-top: 0.2rem; padding: 0.3rem 0.5rem; display: none; width: 100%; box-sizing: border-box;"></div>
                                </div>
                            `;
                        }
                        rowCellsHtml += `<td>${cellContent}</td>`;
                    });

                    // Pad cells if they are fewer than headers
                    const diff = headers.length - cells.length;
                    for (let i = 0; i < diff; i++) {
                        rowCellsHtml += `<td></td>`;
                    }

                    html += `
                        <tr data-item-id="${item.id}">
                            ${rowCellsHtml}
                        </tr>
                    `;
                });

                html += `
                            </tbody>
                        </table>
                    </div>
                `;
            } else {
                // Sentences (lista de oraciones a completar)
                html += `<div class="syllabus-interactive-sentences-list">`;

                ex.items.forEach(item => {
                    const template = item.sentence_template || '';
                    const parts = template.split('[_____]');
                    let sentenceContent = template;

                    if (parts.length > 1) {
                        sentenceContent = parts.reduce((acc, part, i) => {
                            if (i === 0) return part;
                            return acc + `<input type="text" class="syllabus-fill-blank-input" data-item-id="${item.id}_0" data-correct="${item.correct_answer}" data-hint="${escapeHtml(item.hint || '')}" data-context="${escapeHtml(item.context || '')}" placeholder="..." autocomplete="off">` + part;
                        }, '');
                    } else {
                        sentenceContent = template + ` <input type="text" class="syllabus-fill-blank-input" data-item-id="${item.id}_0" data-correct="${item.correct_answer}" data-hint="${escapeHtml(item.hint || '')}" data-context="${escapeHtml(item.context || '')}" placeholder="..." autocomplete="off">`;
                    }

                    html += `
                        <div class="syllabus-interactive-sentence-item" data-item-id="${item.id}">
                            <div class="syllabus-interactive-sentence-text">${sentenceContent}</div>
                            <div class="syllabus-interactive-sentence-meta">
                                <span><i class="far fa-lightbulb" style="color: #a78bfa;"></i> Pista: ${item.hint}</span>
                                ${item.context ? `<span style="opacity: 0.8;"><i class="fas fa-language"></i> ${item.context}</span>` : ''}
                            </div>
                            <div class="syllabus-item-feedback" id="feedback-${item.id}_0"></div>
                        </div>
                    `;
                });

                html += `</div>`;
            }

            html += `</div>`;
        });

        // Botón de verificar al final (Local)
        html += `
            <div style="display:flex; flex-direction:column; gap:1rem; margin-top:1.5rem;">
                <button id="btn-lesson-verify-exercises" class="btn-premium btn-premium-primary" style="width:100%; justify-content:center; padding:0.8rem 1.5rem; font-size:0.9rem; background: linear-gradient(135deg, #8b5cf6, #6d28d9) !important; color:#fff !important; cursor:pointer; border:none; border-radius:8px;">
                    <i class="fas fa-spell-check"></i> Verificar Respuestas
                </button>
                <div id="lesson-evaluation-summary-box" style="display:none;"></div>
            </div>
        `;

        wrapper.innerHTML = html;

        // Asignar click
        const btnVerify = document.getElementById('btn-lesson-verify-exercises');
        if (btnVerify) {
            btnVerify.onclick = () => evaluateExercisesLocally();
        }
    }

    function evaluateExercisesLocally() {
        const btnVerify = document.getElementById('btn-lesson-verify-exercises');
        const summaryBox = document.getElementById('lesson-evaluation-summary-box');
        if (!btnVerify || !activeLesson) return;

        const inputs = document.querySelectorAll('.syllabus-fill-blank-input');
        if (inputs.length === 0) return;

        let correctCount = 0;
        const total = inputs.length;

        // Normalización local robusta (insensible a mayúsculas, minúsculas, acentos, puntuación y espacios)
        const normalize = (str) => {
            if (!str) return '';
            return str.toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
                .trim();
        };

        inputs.forEach(inp => {
            const itemId = inp.dataset.itemId;
            const userAnswer = (inp.value || '').trim();
            const correctAnswer = (inp.dataset.correct || '').trim();
            const itemContext = (inp.dataset.context || '').trim();
            const feedbackDiv = document.getElementById(`feedback-${itemId}`);

            inp.classList.remove('correct', 'wrong');

            const userNorm = normalize(userAnswer);
            const correctNormOptions = correctAnswer.split(/[\/,]/).map(o => normalize(o));
            const isCorrect = userNorm !== '' && correctNormOptions.includes(userNorm);

            if (isCorrect) {
                correctCount++;
                inp.classList.add('correct');
                if (feedbackDiv) {
                    feedbackDiv.className = 'syllabus-item-feedback correct';
                    feedbackDiv.innerHTML = `<i class="fas fa-check-circle"></i> ¡Correcto! ${itemContext ? `<br><span style="font-size:0.75rem; opacity:0.85; font-weight: 500;">Explicación: ${itemContext}</span>` : ''}`;
                    feedbackDiv.style.display = 'block';
                }
            } else {
                inp.classList.add('wrong');
                if (feedbackDiv) {
                    feedbackDiv.className = 'syllabus-item-feedback wrong';
                    feedbackDiv.innerHTML = `<i class="fas fa-times-circle"></i> Incorrecto (Es: <strong>${correctAnswer}</strong>) ${itemContext ? `<br><span style="font-size:0.75rem; opacity:0.85; font-weight: 500;">Explicación: ${itemContext}</span>` : ''}`;
                    feedbackDiv.style.display = 'block';
                }
            }
        });

        // Mostrar resumen
        if (summaryBox) {
            summaryBox.style.display = 'flex';
            const pct = Math.round((correctCount / total) * 100);

            if (pct === 100) {
                summaryBox.className = 'syllabus-evaluation-summary';
                summaryBox.style.background = 'rgba(16, 185, 129, 0.06)';
                summaryBox.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                summaryBox.style.color = '#a7f3d0';
                summaryBox.innerHTML = `
                    <div style="font-size:1.5rem; color:#34d399;"><i class="fas fa-trophy"></i></div>
                    <div>
                        <strong>¡Puntaje perfecto! ${correctCount}/${total} correctas (${pct}%)</strong><br>
                        Excelente comprensión del tema. Has completado con éxito la práctica interactiva.
                    </div>
                `;
                // Auto-marcar como completado
                const completeBtn = document.getElementById('btn-lesson-complete');
                if (completeBtn && !completeBtn.classList.contains('completed')) {
                    completeBtn.click();
                }
            } else {
                summaryBox.className = 'syllabus-evaluation-summary';
                summaryBox.style.background = 'rgba(239, 68, 68, 0.06)';
                summaryBox.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                summaryBox.style.color = '#fecaca';
                summaryBox.innerHTML = `
                    <div style="font-size:1.5rem; color:#f87171;"><i class="fas fa-redo"></i></div>
                    <div>
                        <strong>Has acertado ${correctCount} de ${total} (${pct}%)</strong><br>
                        Revisa los campos marcados en rojo y vuelve a intentarlo.
                    </div>
                `;
            }
        }

        window.uiManager?.showToast("Respuestas verificadas", "success");
    }

    function switchLessonFooterTab(tab) {
        const btnQuiz = document.getElementById('btn-lesson-tab-quiz');
        const btnChat = document.getElementById('btn-lesson-tab-chat');
        const tabQuiz = document.getElementById('lesson-quiz-tab');
        const tabChat = document.getElementById('lesson-chat-tab');

        if (!btnQuiz || !btnChat || !tabQuiz || !tabChat) return;

        if (tab === 'quiz') {
            btnQuiz.classList.add('active');
            btnChat.classList.remove('active');
            tabQuiz.style.display = 'block';
            tabChat.style.display = 'none';
        } else {
            btnChat.classList.add('active');
            btnQuiz.classList.remove('active');
            tabQuiz.style.display = 'none';
            tabChat.style.display = 'block';

            const input = document.getElementById('lesson-chat-input');
            if (input) setTimeout(() => input.focus(), 100);
        }
    }

    // 📖 LÓGICA DE CONSTRUCTOR DE VOCABULARIO
    async function loadVocabulary() {
        const tbody = document.getElementById('vocab-table-body');
        const emptyState = document.getElementById('vocab-empty-state');
        const table = document.getElementById('vocab-table');
        const metaInfo = document.getElementById('vocab-meta-info');

        if (!tbody || !emptyState || !table) return;

        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem;"><i class="fas fa-circle-notch fa-spin"></i> Cargando vocabulario...</td></tr>';
        emptyState.style.display = 'none';
        table.style.display = 'table';

        try {
            const lang = activeConfig?.career || 'en-US';
            const langDisplay = lang === 'it-IT' ? 'Italiano' : 'Inglés';
            if (metaInfo) metaInfo.innerText = `${langDisplay} • Palabras de práctica guardadas.`;

            const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/languages/vocabulary?languageCode=${lang}`);
            const data = await res.json();

            if (!data.success || !data.vocabulary || data.vocabulary.length === 0) {
                table.style.display = 'none';
                emptyState.style.display = 'flex';
                selectedVocabIds = [];
                updateVocabSelection();
                return;
            }

            tbody.innerHTML = '';
            const existingIds = data.vocabulary.map(w => String(w.id));
            selectedVocabIds = selectedVocabIds.filter(id => existingIds.includes(String(id)));
            updateVocabSelection();

            data.vocabulary.forEach(w => {
                const tr = document.createElement('tr');
                tr.dataset.id = w.id;

                const levelBadge = `<span class="vocab-badge-level">${w.level}</span>`;
                const playBtn = w.audio_url
                    ? `<button class="btn-vocab-play" title="Escuchar pronunciación" onclick="event.stopPropagation(); window.playVocabAudio(this, '${w.audio_url}')"><i class="fas fa-volume-up"></i></button>`
                    : '';

                const isChecked = selectedVocabIds.includes(w.id) ? 'checked' : '';
                tr.innerHTML = `
                    <td style="text-align: center;" onclick="event.stopPropagation();">
                        <input type="checkbox" class="vocab-row-check" value="${w.id}" ${isChecked}>
                    </td>
                    <td>
                        <div class="vocab-word-cell">
                            <span>${w.word}</span>
                            ${playBtn}
                        </div>
                    </td>
                    <td>${w.translation}</td>
                    <td>${levelBadge}</td>
                    <td class="desktop-only"><div class="vocab-example-text">${w.example_sentence || '--'}</div></td>
                    <td style="text-align: center;" onclick="event.stopPropagation();">
                        <button class="btn-vocab-delete" title="Eliminar palabra" onclick="window.deleteVocabWord('${w.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;

                tr.addEventListener('click', () => toggleVocabRowDetails(tr, w));
                tbody.appendChild(tr);
            });

            document.querySelectorAll('.vocab-row-check').forEach(chk => {
                chk.addEventListener('change', () => {
                    const id = chk.value;
                    if (chk.checked) {
                        if (!selectedVocabIds.includes(id)) selectedVocabIds.push(id);
                    } else {
                        selectedVocabIds = selectedVocabIds.filter(x => x !== id);
                    }
                    updateVocabSelection();
                });
            });

            const selectAllChk = document.getElementById('vocab-select-all');
            if (selectAllChk) {
                selectAllChk.checked = false;
                selectAllChk.onclick = () => {
                    const checked = selectAllChk.checked;
                    document.querySelectorAll('.vocab-row-check').forEach(chk => {
                        chk.checked = checked;
                        const id = chk.value;
                        if (checked) {
                            if (!selectedVocabIds.includes(id)) selectedVocabIds.push(id);
                        } else {
                            selectedVocabIds = selectedVocabIds.filter(x => x !== id);
                        }
                    });
                    updateVocabSelection();
                };
            }

        } catch (err) {
            console.error("Error cargando vocabulario:", err);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:#ef4444;"><i class="fas fa-exclamation-circle"></i> Error al cargar vocabulario.</td></tr>';
        }
    }

    function toggleVocabRowDetails(tr, w) {
        const next = tr.nextElementSibling;
        if (next && next.classList.contains('vocab-details-row')) {
            next.remove();
            return;
        }

        document.querySelectorAll('.vocab-details-row').forEach(row => row.remove());

        const detailTr = document.createElement('tr');
        detailTr.className = 'vocab-details-row';
        detailTr.innerHTML = `
            <td colspan="6" style="padding: 0;">
                <div class="vocab-details-container" style="animation: slideDown 0.2s ease;">
                    <div><strong>Definición:</strong> ${w.definition || 'Sin definición guardada.'}</div>
                    <div style="margin-top:0.25rem;"><strong>Ejemplo completo:</strong> <span style="font-style:italic; color:#a78bfa;">"${w.example_sentence || 'Sin ejemplo guardado.'}"</span></div>
                </div>
            </td>
        `;
        tr.parentNode.insertBefore(detailTr, tr.nextSibling);
    }

    function updateVocabSelection() {
        const btnExport = document.getElementById('btn-export-vocab-flashcards');
        const countSpan = document.getElementById('selected-vocab-count');
        if (!btnExport || !countSpan) return;

        countSpan.innerText = selectedVocabIds.length;
        if (selectedVocabIds.length > 0) {
            btnExport.disabled = false;
        } else {
            btnExport.disabled = true;
        }
    }

    window.playVocabAudio = function (btn, audioUrl) {
        const icon = btn.querySelector('i');
        if (!icon) return;

        if (window.currentVocabAudio) {
            window.currentVocabAudio.pause();
            window.currentVocabAudio = null;
        }

        document.querySelectorAll('.btn-vocab-play i').forEach(i => {
            i.className = 'fas fa-volume-up';
        });

        icon.className = 'fas fa-spinner fa-spin';

        try {
            const fullUrl = window.NetworkService ? `${window.AppConfig.API_URL}/api/media/proxy?file=${encodeURIComponent(audioUrl)}` : audioUrl;
            const audio = new Audio(fullUrl);
            window.currentVocabAudio = audio;

            audio.oncanplaythrough = () => {
                icon.className = 'fas fa-volume-mute';
                audio.play();
            };

            audio.onended = () => {
                icon.className = 'fas fa-volume-up';
                window.currentVocabAudio = null;
            };

            audio.onerror = () => {
                icon.className = 'fas fa-volume-up';
                console.error("Vocab audio load error");
            };
        } catch (e) {
            icon.className = 'fas fa-volume-up';
            console.error(e);
        }
    };

    window.deleteVocabWord = async function (id) {
        if (!confirm("¿Estás seguro de eliminar esta palabra de tu vocabulario?")) return;

        try {
            const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/languages/vocabulary/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                window.uiManager?.showToast("Palabra eliminada", "success");
                loadVocabulary();
            } else {
                window.uiManager?.showToast(data.error || "No se pudo eliminar", "error");
            }
        } catch (e) {
            console.error("Error deleting vocab word:", e);
        }
    };

    function initVocabEvents() {
        const btnAdd = document.getElementById('btn-open-vocab-add');
        const overlay = document.getElementById('vocab-modal-overlay');
        const btnClose = document.getElementById('btn-close-vocab-modal');
        const btnCancel = document.getElementById('btn-cancel-vocab-save');
        const btnSave = document.getElementById('btn-save-vocab');
        const btnAiFill = document.getElementById('btn-vocab-ai-fill');
        const btnExport = document.getElementById('btn-export-vocab-flashcards');

        if (!overlay) return;

        const openModal = () => {
            document.getElementById('vocab-word').value = '';
            document.getElementById('vocab-translation').value = '';
            document.getElementById('vocab-definition').value = '';
            document.getElementById('vocab-example').value = '';
            overlay.classList.add('active');

            if (window.uiManager?.pushModalState) {
                window.uiManager.pushModalState('vocab-modal-overlay');
            }
        };

        const closeModal = () => {
            overlay.classList.remove('active');
            if (window.uiManager && typeof window.uiManager.popModalState === 'function') {
                window.uiManager.popModalState('vocab-modal-overlay');
            }
        };

        if (btnAdd) btnAdd.onclick = openModal;
        if (btnClose) btnClose.onclick = closeModal;
        if (btnCancel) btnCancel.onclick = closeModal;
        overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

        if (btnAiFill) {
            btnAiFill.onclick = async () => {
                const word = document.getElementById('vocab-word').value.trim();
                if (!word) {
                    alert("Por favor escribe la palabra a autocompletar.");
                    return;
                }

                btnAiFill.disabled = true;
                const originalHtml = btnAiFill.innerHTML;
                btnAiFill.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Completando...';

                try {
                    const lang = activeConfig?.career || 'en-US';
                    const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/languages/vocabulary/generate`, {
                        method: 'POST',
                        body: JSON.stringify({
                            word,
                            languageCode: lang,
                            cefrLevel: activeConfig?.difficulty || 'A1'
                        })
                    });

                    if (res.status === 403) {
                        if (window.uiManager && typeof window.uiManager.showPaywallModal === 'function') {
                            window.uiManager.showPaywallModal(null, 'languages');
                        } else {
                            alert('Has alcanzado tus límites en la versión gratuita.');
                        }
                        // Sincronización gestionada por NetworkService
                        return;
                    }

                    const data = await res.json();
                    if (data.success && data.data) {
                        document.getElementById('vocab-translation').value = data.data.translation || '';
                        document.getElementById('vocab-definition').value = data.data.definition || '';
                        document.getElementById('vocab-example').value = data.data.example_sentence || '';
                        // Sincronización gestionada por NetworkService
                    } else {
                        alert(data.error || "No se pudo autocompletar.");
                    }
                } catch (e) {
                    console.error("AI completion error:", e);
                } finally {
                    btnAiFill.disabled = false;
                    btnAiFill.innerHTML = originalHtml;
                }
            };
        }

        if (btnSave) {
            btnSave.onclick = async () => {
                const word = document.getElementById('vocab-word').value.trim();
                const translation = document.getElementById('vocab-translation').value.trim();
                const definition = document.getElementById('vocab-definition').value.trim();
                const example = document.getElementById('vocab-example').value.trim();

                if (!word || !translation) {
                    alert("La palabra y su traducción son obligatorias.");
                    return;
                }

                btnSave.disabled = true;
                btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

                try {
                    const lang = activeConfig?.career || 'en-US';
                    const level = activeConfig?.difficulty || 'A1';

                    const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/languages/vocabulary`, {
                        method: 'POST',
                        body: JSON.stringify({
                            word, translation, definition,
                            example_sentence: example,
                            languageCode: lang,
                            cefrLevel: level
                        })
                    });

                    const data = await res.json();
                    if (data.success) {
                        window.uiManager?.showToast("Palabra guardada en tu vocabulario", "success");
                        closeModal();
                        loadVocabulary();
                    } else {
                        alert(data.error || "Error al guardar la palabra.");
                    }
                } catch (e) {
                    console.error("Save vocabulary error:", e);
                } finally {
                    btnSave.disabled = false;
                    btnSave.innerText = 'Guardar Palabra';
                }
            };
        }

        if (btnExport) {
            btnExport.onclick = async () => {
                if (selectedVocabIds.length === 0) return;

                btnExport.disabled = true;
                const originalHtml = btnExport.innerHTML;
                btnExport.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exportando...';

                try {
                    const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/languages/vocabulary/export-flashcards`, {
                        method: 'POST',
                        body: JSON.stringify({ ids: selectedVocabIds })
                    });

                    if (res.status === 403) {
                        if (window.uiManager && typeof window.uiManager.showPaywallModal === 'function') {
                            window.uiManager.showPaywallModal();
                        } else {
                            alert('Límite de Flashcards alcanzado. Pásate a Premium.');
                        }
                        return;
                    }

                    const data = await res.json();
                    if (data.success) {
                        window.uiManager?.showToast(`¡${data.count} palabras exportadas a tus Flashcards!`, "success");
                        selectedVocabIds = [];
                        updateVocabSelection();

                        const selectAllChk = document.getElementById('vocab-select-all');
                        if (selectAllChk) selectAllChk.checked = false;

                        loadVocabulary();
                    } else {
                        alert(data.error || "No se pudieron exportar las palabras.");
                    }
                } catch (e) {
                    console.error("Export flashcards error:", e);
                } finally {
                    btnExport.disabled = false;
                    btnExport.innerHTML = originalHtml;
                }
            };
        }
    }

    // ============================================================
    // 🛠️ EDITOR DE LECCIONES Y EJERCICIOS INTERACTIVOS DE TEORÍA (ADMIN)
    // ============================================================
    let editingLesson = null;

    function escapeHtml(str) {
        if (!str) return '';
        return str.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function openLessonEditorModal(topic) {
        const modal = document.getElementById('lesson-editor-modal-overlay');
        if (!modal) return;

        // Clonar el contenido actual de la lección para evitar edición accidental
        editingLesson = JSON.parse(JSON.stringify(activeLesson || {}));
        if (!editingLesson.id) {
            editingLesson.id = topic.id;
            editingLesson.title = topic.topic_name;
            editingLesson.explanation = '';
            editingLesson.exercises = [];
        }

        // Popular campos básicos
        const titleInput = document.getElementById('editor-lesson-title');
        const explanationInput = document.getElementById('editor-lesson-explanation');
        if (titleInput) titleInput.value = editingLesson.title || editingLesson.topic_name || '';
        if (explanationInput) explanationInput.value = editingLesson.explanation || '';

        // Resetear a pestaña inicial "theory"
        document.querySelectorAll('#lesson-editor-modal-overlay .editor-tab-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.style.borderBottomColor = 'transparent';
            btn.style.color = '#94a3b8';
        });
        const firstTab = document.querySelector('#lesson-editor-modal-overlay .editor-tab-btn[data-tab="theory"]');
        if (firstTab) {
            firstTab.classList.add('active');
            firstTab.style.borderBottomColor = '#a78bfa';
            firstTab.style.color = '#a78bfa';
        }

        document.querySelectorAll('#lesson-editor-modal-overlay .editor-panel').forEach(p => {
            p.classList.remove('active');
            p.style.display = 'none';
        });
        const firstPanel = document.getElementById('editor-panel-theory');
        if (firstPanel) {
            firstPanel.classList.add('active');
            firstPanel.style.display = 'flex';
        }

        // Mostrar overlay
        modal.style.display = 'flex';
        modal.classList.add('active');
        modal.style.visibility = 'visible';
        modal.style.zIndex = '99999';
        modal.style.opacity = '1';

        // Inicializar TinyMCE 6
        if (window.tinymce) {
            if (tinymce.get('editor-lesson-explanation')) {
                tinymce.get('editor-lesson-explanation').remove();
            }
            tinymce.init({
                selector: '#editor-lesson-explanation',
                toolbar: 'undo redo | blocks | bold italic | alignleft aligncenter alignright | indent outdent | bullist numlist | table image media | removeformat | help',
                height: 350,
                menubar: 'edit insert view format table tools help',
                plugins: [
                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                    'insertdatetime', 'media', 'table', 'help', 'wordcount'
                ],
                skin: 'oxide-dark',
                content_css: 'dark',
                branding: false,
                promotion: false,
                images_upload_handler: (blobInfo, progress) => new Promise((resolve, reject) => {
                    const blob = blobInfo.blob();
                    const fileName = blobInfo.filename();
                    const formData = new FormData();
                    formData.append('file', blob, fileName);

                    window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/admin/upload-editor`, {
                        method: 'POST',
                        body: formData
                    })
                    .then(async response => {
                        if (!response.ok) {
                            const errText = await response.text();
                            throw new Error(`Servidor retorno ${response.status}: ${errText}`);
                        }
                        return response.json();
                    })
                    .then(json => {
                        if (json && json.location) {
                            resolve(json.location);
                        } else {
                            reject('Respuesta de servidor inválida');
                        }
                    })
                    .catch(err => {
                        reject(`Fallo en la subida: ${err.message}`);
                    });
                }),
                automatic_uploads: true,
                images_reuse_filename: true,
                paste_data_images: true,
                relative_urls: false,
                remove_script_host: false,
                convert_urls: false,
                placeholder: 'Escribe la explicación teórica aquí...',
                content_style: 'body { font-family:Inter,Helvetica,Arial,sans-serif; font-size:14px; color: #f8fafc; padding: 10px; } ' +
                    'table { border-collapse: collapse; width: 100%; margin-bottom: 10px; } ' +
                    'table th, table td { border: 1px solid #475569; padding: 8px; } ' +
                    'table th { background-color: #334155; }',
                setup: (editor) => {
                    editor.on('init', () => {
                        const htmlContent = window.MarkdownRenderer.render(editingLesson.explanation || '');
                        editor.setContent(htmlContent);
                    });
                    editor.on('change KeyUp', () => {
                        if (editingLesson) {
                            editingLesson.explanation = editor.getContent();
                        }
                    });
                }
            });
        }

        if (window.uiManager && typeof window.uiManager.pushModalState === 'function') {
            window.uiManager.pushModalState('lesson-editor-modal-overlay');
        }
    }

    function closeLessonEditorModal() {
        const modal = document.getElementById('lesson-editor-modal-overlay');
        if (!modal) return;

        // Destruir TinyMCE para evitar fugas de memoria
        if (window.tinymce && tinymce.get('editor-lesson-explanation')) {
            tinymce.get('editor-lesson-explanation').remove();
        }

        if (window.uiManager && typeof window.uiManager.popModalState === 'function') {
            window.uiManager.popModalState('lesson-editor-modal-overlay');
        }
        modal.classList.remove('active');
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    }

    function renderExercisesEditor() {
        const container = document.getElementById('editor-blocks-container');
        if (!container) return;
        container.innerHTML = '';

        if (!editingLesson.exercises) {
            editingLesson.exercises = [];
        }

        if (editingLesson.exercises.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px; color: var(--text-muted);">
                    <i class="fas fa-cubes fa-2x" style="margin-bottom: 0.5rem; opacity: 0.5;"></i>
                    <p style="font-size: 0.85rem;">No hay bloques de ejercicios definidos para esta lección.</p>
                </div>
            `;
            return;
        }

        editingLesson.exercises.forEach((block, blockIndex) => {
            const blockDiv = document.createElement('div');
            blockDiv.className = 'editor-block-card';
            blockDiv.style.cssText = 'background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 1.25rem; position: relative; display: flex; flex-direction: column; gap: 1rem;';
            
            const type = block.type || 'sentences';
            const instructions = block.instructions || '';
            const headers = Array.isArray(block.headers) ? block.headers.join(', ') : '';

            // Header del bloque
            let blockHtml = `
                <div style="display:flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                    <h4 style="margin: 0; color: #a78bfa; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem; font-weight:700;">
                        <i class="fas fa-cubes"></i> Bloque #${blockIndex + 1}
                    </h4>
                    <button type="button" class="btn-editor-delete-block" data-block-index="${blockIndex}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 0.25rem; outline: none;">
                        <i class="fas fa-trash-alt"></i> Eliminar Bloque
                    </button>
                </div>
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
                    <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                        <label style="font-size: 0.8rem; color: #94a3b8; font-weight: 500;">Instrucciones / Título del Ejercicio</label>
                        <input type="text" class="block-instructions" value="${escapeHtml(instructions)}" style="background: rgba(10, 10, 10, 0.8); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 0.5rem 0.75rem; color: #fff; font-size: 0.9rem; outline: none; width: 100%;">
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                        <label style="font-size: 0.8rem; color: #94a3b8; font-weight: 500;">Tipo de Bloque</label>
                        <select class="block-type" style="background: rgba(10, 10, 10, 0.8); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 0.5rem 0.75rem; color: #fff; font-size: 0.9rem; outline: none; cursor: pointer;">
                            <option value="sentences" ${type === 'sentences' ? 'selected' : ''}>Oraciones Incompletas</option>
                            <option value="table" ${type === 'table' ? 'selected' : ''}>Tabla Interactiva</option>
                        </select>
                    </div>
                </div>
                <div class="block-headers-group" style="display: ${type === 'table' ? 'flex' : 'none'}; flex-direction: column; gap: 0.4rem;">
                    <label style="font-size: 0.8rem; color: #94a3b8; font-weight: 500;">Cabeceras de Tabla (Separadas por comas)</label>
                    <input type="text" class="block-headers" value="${escapeHtml(headers)}" placeholder="UPPERCASE, LOWERCASE, NAME (IPA)" style="background: rgba(10, 10, 10, 0.8); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 0.5rem 0.75rem; color: #fff; font-size: 0.9rem; outline: none; width: 100%;">
                </div>
            `;

            blockDiv.innerHTML = blockHtml;

            // Contenedor de ítems
            const itemsWrapper = document.createElement('div');
            itemsWrapper.style.cssText = 'margin-top: 0.5rem; border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 1rem; display: flex; flex-direction: column; gap: 0.75rem;';
            
            const itemsHeader = document.createElement('div');
            itemsHeader.style.cssText = 'display:flex; justify-content: space-between; align-items:center;';
            itemsHeader.innerHTML = `
                <span style="font-size: 0.85rem; color: #cbd5e1; font-weight: 600;"><i class="fas fa-list-ol"></i> Ítems de Práctica</span>
                <button type="button" class="btn-editor-add-item btn-premium btn-premium-secondary" data-block-index="${blockIndex}" style="padding: 0.3rem 0.6rem; font-size: 0.75rem; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 0.25rem;">
                    <i class="fas fa-plus"></i> Añadir Ítem
                </button>
            `;
            itemsWrapper.appendChild(itemsHeader);

            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'block-items-container';
            itemsContainer.style.cssText = 'display: flex; flex-direction: column; gap: 1rem;';

            const items = block.items || [];
            items.forEach((item, itemIndex) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'editor-item-card';
                itemDiv.style.cssText = 'background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 1.25rem 1rem 1rem 1rem; position: relative; display: flex; flex-direction: column; gap: 0.75rem;';
                
                const isTable = type === 'table';
                const labelText = isTable 
                    ? "Celdas de la Fila (Separadas por '|'. Debe contener [_____] para la celda interactiva)" 
                    : "Oración / Celda (Debe contener [_____] para interactivo)";
                const exampleText = isTable
                    ? `<span style="font-size: 0.75rem; color: #a78bfa; margin-top: 0.1rem; display: block;"><i class="fas fa-info-circle"></i> Ejemplo: go | ir | [_____]</span>`
                    : `<span style="font-size: 0.75rem; color: #a78bfa; margin-top: 0.1rem; display: block;"><i class="fas fa-info-circle"></i> Ejemplo: This is [_____] book.</span>`;

                itemDiv.innerHTML = `
                    <button type="button" class="btn-editor-delete-item" data-block-index="${blockIndex}" data-item-index="${itemIndex}" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: rgba(239, 68, 68, 0.7); cursor: pointer; font-size: 0.95rem; outline: none; transition: color 0.2s;" title="Eliminar Ítem">
                        <i class="fas fa-times-circle"></i>
                    </button>
                    <div style="display: grid; grid-template-columns: 1fr; gap: 0.75rem;">
                        <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                            <label style="font-size: 0.75rem; color: #94a3b8; font-weight: 500;">${labelText}</label>
                            <textarea class="item-template" rows="2" style="background: rgba(10,10,10,0.6); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 0.5rem; color: #fff; font-size: 0.85rem; font-family: inherit; width: 100%; outline: none; resize: vertical; min-height: 40px;">${escapeHtml(item.sentence_template || '')}</textarea>
                            ${exampleText}
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                        <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                            <label style="font-size: 0.75rem; color: #94a3b8; font-weight: 500;">Respuesta Correcta</label>
                            <input type="text" class="item-answer" value="${escapeHtml(item.correct_answer || '')}" style="background: rgba(10,10,10,0.6); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 0.4rem 0.5rem; color: #fff; font-size: 0.85rem; outline: none;">
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                            <label style="font-size: 0.75rem; color: #94a3b8; font-weight: 500;">Pista</label>
                            <input type="text" class="item-hint" value="${escapeHtml(item.hint || '')}" style="background: rgba(10,10,10,0.6); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 0.4rem 0.5rem; color: #fff; font-size: 0.85rem; outline: none;">
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr; gap: 0.75rem;">
                        <div style="display: flex; flex-direction: column; gap: 0.3rem;">
                            <label style="font-size: 0.75rem; color: #94a3b8; font-weight: 500;">Contexto / Explicación Didáctica</label>
                            <input type="text" class="item-context" value="${escapeHtml(item.context || '')}" style="background: rgba(10,10,10,0.6); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 0.4rem 0.5rem; color: #fff; font-size: 0.85rem; outline: none;">
                        </div>
                    </div>
                `;
                itemsContainer.appendChild(itemDiv);
            });

            itemsWrapper.appendChild(itemsContainer);
            blockDiv.appendChild(itemsWrapper);
            container.appendChild(blockDiv);
        });

        attachBlockInputListeners();
    }

    function attachBlockInputListeners() {
        const container = document.getElementById('editor-blocks-container');
        if (!container) return;

        // Escuchar botones de eliminar bloque
        container.querySelectorAll('.btn-editor-delete-block').forEach(btn => {
            btn.onclick = () => {
                const blockIndex = parseInt(btn.getAttribute('data-block-index'));
                editingLesson.exercises.splice(blockIndex, 1);
                renderExercisesEditor();
            };
        });

        // Escuchar botones de añadir ítem
        container.querySelectorAll('.btn-editor-add-item').forEach(btn => {
            btn.onclick = () => {
                const blockIndex = parseInt(btn.getAttribute('data-block-index'));
                if (!editingLesson.exercises[blockIndex].items) {
                    editingLesson.exercises[blockIndex].items = [];
                }
                editingLesson.exercises[blockIndex].items.push({
                    id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
                    sentence_template: '',
                    correct_answer: '',
                    hint: '',
                    context: ''
                });
                renderExercisesEditor();
            };
        });

        // Escuchar botones de eliminar ítem
        container.querySelectorAll('.btn-editor-delete-item').forEach(btn => {
            btn.onclick = () => {
                const blockIndex = parseInt(btn.getAttribute('data-block-index'));
                const itemIndex = parseInt(btn.getAttribute('data-item-index'));
                editingLesson.exercises[blockIndex].items.splice(itemIndex, 1);
                renderExercisesEditor();
            };
        });

        // Escuchar cambio en select de tipo de bloque
        container.querySelectorAll('.block-type').forEach((select, selectIndex) => {
            select.onchange = () => {
                editingLesson.exercises[selectIndex].type = select.value;
                if (select.value === 'table') {
                    if (!editingLesson.exercises[selectIndex].headers) {
                        editingLesson.exercises[selectIndex].headers = [];
                    }
                }
                renderExercisesEditor();
            };
        });

        // Escuchar inputs de texto de bloques y sus ítems en tiempo real para actualizar editingLesson
        container.querySelectorAll('.editor-block-card').forEach((card, blockIndex) => {
            const instInput = card.querySelector('.block-instructions');
            if (instInput) {
                instInput.oninput = () => {
                    editingLesson.exercises[blockIndex].instructions = instInput.value;
                };
            }

            const headersInput = card.querySelector('.block-headers');
            if (headersInput) {
                headersInput.oninput = () => {
                    editingLesson.exercises[blockIndex].headers = headersInput.value
                        .split(',')
                        .map(h => h.trim())
                        .filter(h => h.length > 0);
                };
            }

            card.querySelectorAll('.editor-item-card').forEach((itemCard, itemIndex) => {
                const templateText = itemCard.querySelector('.item-template');
                const answerInput = itemCard.querySelector('.item-answer');
                const hintInput = itemCard.querySelector('.item-hint');
                const contextInput = itemCard.querySelector('.item-context');

                if (templateText) {
                    templateText.oninput = () => {
                        editingLesson.exercises[blockIndex].items[itemIndex].sentence_template = templateText.value;
                    };
                }
                if (answerInput) {
                    answerInput.oninput = () => {
                        editingLesson.exercises[blockIndex].items[itemIndex].correct_answer = answerInput.value;
                    };
                }
                if (hintInput) {
                    hintInput.oninput = () => {
                        editingLesson.exercises[blockIndex].items[itemIndex].hint = hintInput.value;
                    };
                }
                if (contextInput) {
                    contextInput.oninput = () => {
                        editingLesson.exercises[blockIndex].items[itemIndex].context = contextInput.value;
                    };
                }
            });
        });
    }

    function syncFormToJSON() {
        const errorEl = document.getElementById('editor-json-error-msg');
        if (errorEl) errorEl.style.display = 'none';

        const jsonStr = JSON.stringify({
            title: editingLesson.title || '',
            explanation: editingLesson.explanation || '',
            exercises: editingLesson.exercises || []
        }, null, 4);

        const textarea = document.getElementById('editor-raw-json-textarea');
        if (textarea) textarea.value = jsonStr;
    }

    function syncJSONToForm() {
        const textarea = document.getElementById('editor-raw-json-textarea');
        const errorEl = document.getElementById('editor-json-error-msg');
        if (!textarea) return true;

        try {
            const parsed = JSON.parse(textarea.value);
            if (!parsed || typeof parsed !== 'object') throw new Error('El JSON debe ser un objeto');
            if (!parsed.title || !parsed.explanation || !Array.isArray(parsed.exercises)) {
                throw new Error('Estructura inválida. Debe contener "title", "explanation" y "exercises" (array).');
            }
            
            editingLesson.title = parsed.title;
            editingLesson.explanation = parsed.explanation;
            editingLesson.exercises = parsed.exercises;

            // Actualizar campos
            const titleInput = document.getElementById('editor-lesson-title');
            const explanationInput = document.getElementById('editor-lesson-explanation');
            if (titleInput) titleInput.value = editingLesson.title;
            if (explanationInput) explanationInput.value = editingLesson.explanation;
            if (window.tinymce && tinymce.get('editor-lesson-explanation')) {
                tinymce.get('editor-lesson-explanation').setContent(editingLesson.explanation || '');
            }

            if (errorEl) errorEl.style.display = 'none';
            return true;
        } catch (e) {
            console.error("Invalid JSON syntax:", e);
            if (errorEl) {
                errorEl.innerText = `❌ JSON inválido: ${e.message}`;
                errorEl.style.display = 'block';
            }
            return false;
        }
    }

    async function saveLessonContent() {
        if (window.tinymce && tinymce.get('editor-lesson-explanation')) {
            editingLesson.explanation = tinymce.get('editor-lesson-explanation').getContent();
        }

        const activeTabBtn = document.querySelector('#lesson-editor-modal-overlay .editor-tab-btn.active');
        const activeTab = activeTabBtn ? activeTabBtn.getAttribute('data-tab') : 'theory';
        
        if (activeTab === 'raw-json') {
            const isValid = syncJSONToForm();
            if (!isValid) {
                window.uiManager?.showToast("Por favor, corrige los errores de sintaxis en el JSON antes de guardar.", "error");
                return;
            }
        }

        if (!editingLesson.title || !editingLesson.title.trim()) {
            window.uiManager?.showToast("El título de la lección es obligatorio.", "error");
            return;
        }

        if (!editingLesson.explanation || !editingLesson.explanation.trim()) {
            window.uiManager?.showToast("La explicación teórica es obligatoria.", "error");
            return;
        }

        const btnSave = document.getElementById('btn-editor-save');
        if (btnSave) {
            btnSave.disabled = true;
            btnSave.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Guardando...';
        }

        try {
            const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/admin/languages/syllabus/${editingLesson.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    content: {
                        title: editingLesson.title,
                        explanation: editingLesson.explanation,
                        exercises: editingLesson.exercises
                    }
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "HTTP " + res.status);
            }

            const data = await res.json();
            if (!data.success) throw new Error("Guardado fallido");

            window.uiManager?.showToast("Lección actualizada correctamente", "success");
            
            closeLessonEditorModal();
            
            // Recargar la lección para reflejar los cambios en el dashboard
            learnTopic({
                id: editingLesson.id,
                topic_name: editingLesson.title,
                level: editingLesson.level || activeLesson.level,
                completed: activeLesson.completed
            });

        } catch (err) {
            console.error("Error saving edited lesson:", err);
            window.uiManager?.showToast(`Error al guardar cambios: ${err.message}`, "error");
        } finally {
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
            }
        }
    }

    function setupLessonEditor() {
        const modal = document.getElementById('lesson-editor-modal-overlay');
        const btnClose = document.getElementById('btn-close-lesson-editor');
        const btnCancel = document.getElementById('btn-editor-cancel');
        const btnSave = document.getElementById('btn-editor-save');
        const btnAddBlock = document.getElementById('btn-editor-add-block');

        if (!modal) return;

        if (btnClose) btnClose.onclick = closeLessonEditorModal;
        if (btnCancel) btnCancel.onclick = closeLessonEditorModal;
        modal.onclick = (e) => { if (e.target === modal) closeLessonEditorModal(); };

        if (btnSave) btnSave.onclick = saveLessonContent;

        if (btnAddBlock) {
            btnAddBlock.onclick = () => {
                if (!editingLesson.exercises) editingLesson.exercises = [];
                editingLesson.exercises.push({
                    id: Date.now().toString(),
                    instructions: 'Completa los espacios en blanco:',
                    type: 'sentences',
                    items: []
                });
                renderExercisesEditor();
            };
        }

        // Alternancia de pestañas
        document.querySelectorAll('#lesson-editor-modal-overlay .editor-tab-btn').forEach(btn => {
            btn.onclick = () => {
                const currentActiveTab = document.querySelector('#lesson-editor-modal-overlay .editor-tab-btn.active');
                if (currentActiveTab) {
                    const currentTabName = currentActiveTab.getAttribute('data-tab');
                    if (currentTabName === 'raw-json') {
                        const isValid = syncJSONToForm();
                        if (!isValid) return; // Detener navegación si JSON es inválido
                    }
                }

                // Sincronizar explicación desde TinyMCE
                if (window.tinymce && tinymce.get('editor-lesson-explanation')) {
                    editingLesson.explanation = tinymce.get('editor-lesson-explanation').getContent();
                }

                const targetTab = btn.getAttribute('data-tab');

                document.querySelectorAll('#lesson-editor-modal-overlay .editor-tab-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.borderBottomColor = 'transparent';
                    b.style.color = '#94a3b8';
                });
                btn.classList.add('active');
                btn.style.borderBottomColor = '#a78bfa';
                btn.style.color = '#a78bfa';

                document.querySelectorAll('#lesson-editor-modal-overlay .editor-panel').forEach(p => {
                    p.classList.remove('active');
                    p.style.display = 'none';
                });
                
                const targetPanel = document.getElementById(`editor-panel-${targetTab}`);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                    if (targetTab === 'theory') {
                        targetPanel.style.display = 'flex';
                        // Sincronizar contenido en TinyMCE
                        if (window.tinymce && tinymce.get('editor-lesson-explanation')) {
                            const htmlContent = window.MarkdownRenderer.render(editingLesson.explanation || '');
                            tinymce.get('editor-lesson-explanation').setContent(htmlContent);
                        }
                    } else if (targetTab === 'exercises') {
                        targetPanel.style.display = 'flex';
                        renderExercisesEditor();
                    } else if (targetTab === 'raw-json') {
                        targetPanel.style.display = 'flex';
                        syncFormToJSON();
                    }
                }
            };
        });

        // Escucha en tiempo real de inputs de teoría
        const titleInput = document.getElementById('editor-lesson-title');
        const explanationInput = document.getElementById('editor-lesson-explanation');
        if (titleInput) {
            titleInput.oninput = () => {
                if (editingLesson) editingLesson.title = titleInput.value;
            };
        }
        if (explanationInput) {
            explanationInput.oninput = () => {
                if (editingLesson) editingLesson.explanation = explanationInput.value;
            };
        }
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
