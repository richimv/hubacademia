/**
 * simulatorsHub.js — Dynamic Simulator Landing Controller
 * Reads ?domain= from URL and renders the appropriate service cards.
 * Supports: salud (default), educacion, idiomas.
 */
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const DOMAINS = {
        salud: {
            title: 'Centro de Entrenamiento Médico',
            subtitle: 'Selecciona tu área de entrenamiento especializado',
            cards: [
                {
                    title: 'Simulacro Médico (SERUMS)',
                    desc: 'Preparación intensiva para el Examen Nacional del SERUMS con bancos oficiales.',
                    summary: 'Práctica intensiva con simulacros de examen reales bajo la estructura oficial del Examen Nacional del SERUMS. Realiza un seguimiento de tu preparación en tiempo real y monitorea tu progreso a través de KPIs de rendimiento y el análisis detallado de tus estadísticas.',
                    href: '/simulator-dashboard?context=MEDICINA',
                    actionText: 'Ingresar',
                    actionIcon: 'fa-arrow-right',
                    enabled: true,
                    accent: '#3b82f6',
                    accentRgb: '59, 130, 246',
                    accentLight: '#60a5fa',
                    image: '/assets/bg-sim-health.webp'
                },
                {
                    title: 'Diagnóstico por Imágenes',
                    desc: 'Entrenamiento visual avanzado con casos reales de Radiografía, TC y Resonancia.',
                    summary: 'Perfecciona tu capacidad de lectura e identificación de hallazgos patológicos interactuando directamente con imágenes de casos clínicos reales y recibiendo retroalimentación clínica inmediata para guiar tu aprendizaje.',
                    href: '#',
                    actionText: 'Próximamente',
                    actionIcon: 'fa-lock',
                    enabled: false,
                    toast: 'Próximamente: Entrenamiento con Radiografías, TC y RM',
                    accent: '#0ea5e9',
                    accentRgb: '14, 165, 233',
                    accentLight: '#38bdf8',
                    image: '/assets/bg-sim-med-images.webp'
                },
                {
                    title: 'Diagnóstico Médico IA',
                    desc: 'Casos clínicos interactivos guiados por IA para perfeccionar el razonamiento diagnóstico.',
                    summary: 'Entrena tu razonamiento clínico resolviendo casos interactivos y simulados que evolucionan en tiempo real según tus decisiones. Recibe retroalimentación inmediata basada en guías internacionales.',
                    href: '#',
                    actionText: 'Próximamente',
                    actionIcon: 'fa-lock',
                    enabled: false,
                    toast: 'Próximamente: Casos Clínicos Interactivos con IA',
                    accent: '#06b6d4',
                    accentRgb: '6, 182, 212',
                    accentLight: '#22d3ee',
                    image: '/assets/bg-sim-med-dx.webp'
                }
            ]
        },
        educacion: {
            title: 'Centro de Preparación Magisterial',
            subtitle: 'Herramientas especializadas para el docente peruano',
            cards: [
                {
                    title: 'Simulacro de Ascenso Docente',
                    desc: 'Simulacros adaptados a la estructura del Examen de Ascenso Docente con rúbricas oficiales.',
                    summary: 'Entrénate con simulacros de examen reales basados en la casuística y rúbricas oficiales del Minedu para el ascenso magisterial y nombramiento docente. Mide tu nivel de preparación y visualiza tu progreso con KPIs de logro y análisis detallados de tus estadísticas.',
                    href: '/simulator-dashboard?context=EDUCACION',
                    actionText: 'Ingresar',
                    actionIcon: 'fa-arrow-right',
                    enabled: true,
                    accent: '#8b5cf6',
                    accentRgb: '139, 92, 246',
                    accentLight: '#a78bfa',
                    image: '/assets/bg-sim-edu-ascenso.webp'
                },
                {
                    title: 'Creador de Sesiones de Clase',
                    desc: 'Genera planes de clase alineados a competencias del Currículo Nacional con apoyo de IA.',
                    summary: 'Diseña sesiones de aprendizaje completas en segundos con una estructura metodológica clara (inicio, desarrollo y cierre) totalmente vinculada a las competencias curriculares del CNEB.',
                    href: '#',
                    actionText: 'Próximamente',
                    actionIcon: 'fa-lock',
                    enabled: false,
                    toast: 'Próximamente: Generador de Sesiones de Clase con IA',
                    accent: '#6366f1',
                    accentRgb: '99, 102, 241',
                    accentLight: '#818cf8',
                    image: '/assets/bg-sim-edu-sessions.webp'
                },
                {
                    title: 'Generador de Rúbricas',
                    desc: 'Crea instrumentos de evaluación personalizados para cualquier nivel y competencia.',
                    summary: 'Diseña instrumentos de evaluación formativa analíticos u holísticos adaptados a tus objetivos pedagógicos específicos y descárgalos listos para aplicar en tu aula.',
                    href: '#',
                    actionText: 'Próximamente',
                    actionIcon: 'fa-lock',
                    enabled: false,
                    toast: 'Próximamente: Generador de Rúbricas de Evaluación',
                    accent: '#a855f7',
                    accentRgb: '168, 85, 247',
                    accentLight: '#c084fc',
                    image: '/assets/bg-sim-edu-rubrics.webp'
                }
            ]
        }
    };

    // --- Init ---
    const urlParams = new URLSearchParams(window.location.search);
    const domainKey = (urlParams.get('domain') || 'salud').toLowerCase();
    const config = DOMAINS[domainKey] || DOMAINS['salud'];

    // Update page title and subtitle
    const titleEl = document.getElementById('sim-hub-title');
    const subtitleEl = document.getElementById('sim-hub-subtitle');
    if (titleEl) titleEl.textContent = config.title;
    if (subtitleEl) subtitleEl.textContent = config.subtitle;

    // Update browser tab title
    document.title = `${config.title} | Hub Academia`;

    // Render cards as sections
    const container = document.getElementById('simulators-container');
    if (!container) return;

    // Helper to generate dynamic preview widgets for each simulator
    function getPreviewWidgetHtml(domainKey, cardIndex, card) {
        if (card.enabled) {
            let title = '';
            let specs = [];
            let syllabus = [];
            
            if (domainKey === 'salud') {
                title = 'Estructura Examen Nacional SERUMS';
                specs = [
                    { label: 'Duración', val: '120 min', icon: 'fa-clock' },
                    { label: 'Preguntas', val: '100 Qs', icon: 'fa-list-ol' },
                    { label: 'Calificación', val: 'Oficial ENAM', icon: 'fa-graduation-cap' }
                ];
                syllabus = [
                    { name: 'Medicina Interna', pct: '35%', color: '#3b82f6' },
                    { name: 'Pediatría', pct: '20%', color: '#10b981' },
                    { name: 'Gineco-Obstetricia', pct: '20%', color: '#eab308' },
                    { name: 'Cirugía & Salud Pública', pct: '25%', color: '#ef4444' }
                ];
            } else {
                title = 'Estructura del Instrumento de Evaluación';
                specs = [
                    { label: 'Duración', val: '150 min', icon: 'fa-clock' },
                    { label: 'Preguntas', val: '60 Qs', icon: 'fa-list-ol' },
                    { label: 'Metodología', val: 'Casos Minedu', icon: 'fa-graduation-cap' }
                ];
                syllabus = [
                    { name: 'Conocimientos Pedagógicos', pct: '40%', color: '#8b5cf6' },
                    { name: 'Especialidad Curricular', pct: '35%', color: '#ec4899' },
                    { name: 'Comprensión Lectora', pct: '25%', color: '#14b8a6' }
                ];
            }
            
            let syllabusHtml = syllabus.map(item => `
                <div style="margin-bottom: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 0.3rem;">
                        <span style="color: #cbd5e1; font-weight: 500;">${item.name}</span>
                        <span style="color: ${item.color}; font-weight: 600;">${item.pct}</span>
                    </div>
                    <div style="width: 100%; height: 6px; background: rgba(255, 255, 255, 0.04); border-radius: 3px; overflow: hidden;">
                        <div style="width: ${item.pct}; height: 100%; background: ${item.color}; border-radius: 3px;"></div>
                    </div>
                </div>
            `).join('');

            let specsHtml = specs.map(spec => `
                <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.03); padding: 0.6rem 0.4rem; border-radius: 12px; text-align: center;">
                    <i class="fas ${spec.icon}" style="color: var(--accent-light); font-size: 0.9rem; margin-bottom: 0.25rem;"></i>
                    <div style="font-size: 0.65rem; color: #94a3b8; text-transform: uppercase; margin-bottom: 0.1rem;">${spec.label}</div>
                    <div style="font-size: 0.8rem; font-weight: 700; color: #fff;">${spec.val}</div>
                </div>
            `).join('');

            return `
                <div class="simulator-spec-panel">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 0.6rem;">
                        <span style="font-size: 0.85rem; font-weight: 700; color: #fff; letter-spacing: 0.02em;">${title}</span>
                        <span class="panel-badge-live"><span class="pulse-dot"></span> Examen Activo</span>
                    </div>
                    <div style="margin-bottom: 1.2rem;">
                        ${syllabusHtml}
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem;">
                        ${specsHtml}
                    </div>
                </div>
            `;
        } else {
            let features = [];
            if (domainKey === 'salud') {
                if (cardIndex === 1) {
                    features = [
                        { title: 'Visor DICOM Interactivo', desc: 'Visualización interactiva 2D/3D con ventana para tejidos blandos y óseos.', icon: 'fa-images' },
                        { title: 'Casos Clínicos de Diagnóstico', desc: 'Entrenamiento con casos radiológicos de Tórax, Abdomen y Cerebro.', icon: 'fa-stethoscope' },
                        { title: 'Explicaciones y Signos Guía', desc: 'Feedback detallado de los principales signos radiológicos.', icon: 'fa-comment-alt' }
                    ];
                } else {
                    features = [
                        { title: 'Interrogatorio a Paciente Virtual', desc: 'Conversación interactiva por chat para obtener antecedentes y síntomas.', icon: 'fa-comments' },
                        { title: 'Examen Físico e Historial', desc: 'Simulación dinámica de toma de signos vitales y exámenes de laboratorio.', icon: 'fa-procedures' },
                        { title: 'Criterio Clínico IA', desc: 'Evaluación y puntaje de tu diagnóstico basado en guías internacionales.', icon: 'fa-brain' }
                    ];
                }
            } else {
                if (cardIndex === 1) {
                    features = [
                        { title: 'Alineación Curricular CNEB', desc: 'Generación directa vinculada a competencias, capacidades y desempeños.', icon: 'fa-graduation-cap' },
                        { title: 'Metodología Didáctica Completa', desc: 'Secuencia didáctica detallada de Inicio, Desarrollo y Cierre.', icon: 'fa-project-diagram' },
                        { title: 'Sugerencia de Instrumentos', desc: 'Propuesta automática del instrumento idóneo para evaluar la sesión.', icon: 'fa-check-double' }
                    ];
                } else {
                    features = [
                        { title: 'Diseño Personalizado y Rápido', desc: 'Rúbricas analíticas u holísticas adaptadas a tu propósito pedagógico.', icon: 'fa-table' },
                        { title: 'Criterios de Logro Graduados', desc: 'Descriptores claros para niveles (Inicio, Proceso, Logrado, Destacado).', icon: 'fa-sort-amount-up' },
                        { title: 'Descarga Multiformato', desc: 'Exportación rápida a Word, PDF y Excel lista para aplicar en clase.', icon: 'fa-download' }
                    ];
                }
            }

            let featuresHtml = features.map(feat => `
                <div style="display: flex; gap: 12px; align-items: flex-start; margin-bottom: 0.85rem;">
                    <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.03); width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <i class="fas ${feat.icon}" style="color: var(--accent-light); font-size: 0.85rem;"></i>
                    </div>
                    <div style="text-align: left;">
                        <h5 style="font-size: 0.78rem; font-weight: 700; color: #fff; margin: 0 0 0.15rem 0;">${feat.title}</h5>
                        <p style="font-size: 0.7rem; color: #94a3b8; margin: 0; line-height: 1.4;">${feat.desc}</p>
                    </div>
                </div>
            `).join('');

            return `
                <div class="simulator-spec-panel status-upcoming">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 0.6rem;">
                        <span style="font-size: 0.85rem; font-weight: 700; color: #fff; letter-spacing: 0.02em;">Roadmap de Desarrollo</span>
                        <span class="panel-badge-lock"><i class="fas fa-lock" style="font-size: 0.7rem;"></i> En Desarrollo</span>
                    </div>
                    <div>
                        ${featuresHtml}
                    </div>
                </div>
            `;
        }
    }

    // Setup IntersectionObserver for sections fade-in animation
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -100px 0px',
        threshold: 0.12
    };
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const activeCards = config.cards.filter(c => c.enabled);
    activeCards.forEach((card, index) => {
        const section = document.createElement('section');
        section.className = 'scroll-animate-section';
        section.id = `sim-section-${index}`;
        section.style.background = `radial-gradient(circle at ${index % 2 === 0 ? '75% 30%' : '20% 70%'}, rgba(${card.accentRgb}, 0.12) 0%, transparent 50%), #05060f`;
        section.style.setProperty('--accent', card.accent);
        section.style.setProperty('--accent-rgb', card.accentRgb);
        section.style.setProperty('--accent-light', card.accentLight);

        const isInverted = index % 2 !== 0;

        let buttonHtml = '';
        if (!card.enabled) {
            buttonHtml = `
                <a href="#" class="btn-premium-cta btn-sim-theme" style="opacity: 0.6; cursor: not-allowed; display: inline-flex; align-items: center; justify-content: center; width: auto; min-width: 160px;">
                    <i class="fas fa-lock"></i> Próximamente
                </a>
            `;
        } else {
            buttonHtml = `
                <a href="${card.href}" class="btn-premium-cta btn-sim-theme" id="btn-action-${index}" style="display: inline-flex; align-items: center; justify-content: center; width: auto; min-width: 160px;">
                    ${card.actionText} <i class="fas ${card.actionIcon}"></i>
                </a>
            `;
        }

        const previewWidgetHtml = getPreviewWidgetHtml(domainKey, index, card);

        section.innerHTML = `
            <div class="section-grid-new ${isInverted ? 'grid-inverted' : ''}">
                <div class="section-main-column">
                    <h2 class="section-main-title">
                        <span class="accent-sim-text">${card.title}</span>
                    </h2>
                    <p class="section-description" style="margin-bottom: 1.5rem;">${card.desc}</p>
                    <div class="section-preview-zone" style="margin-bottom: 0; width: 100%;">
                        ${previewWidgetHtml}
                    </div>
                </div>

                <div class="section-features-column" style="display: flex; flex-direction: column; justify-content: center;">
                    <div class="simulator-summary-card" style="margin-bottom: 1.5rem;">
                        <h4 class="summary-card-title" style="margin-bottom: 0.5rem;">
                            <i class="fas fa-info-circle" style="color: var(--accent);"></i> Enfoque Pedagógico
                        </h4>
                        <p class="summary-card-text">${card.summary}</p>
                    </div>
                    <div>
                        ${buttonHtml}
                    </div>
                </div>
            </div>
        `;

        if (!card.enabled) {
            section.addEventListener('click', (e) => {
                const btn = e.target.closest('.btn-premium-cta');
                if (btn) {
                    e.preventDefault();
                    if (window.uiManager && card.toast) {
                        window.uiManager.showToast(card.toast);
                    }
                }
            });
        } else if (card.href.includes('dashboard')) {
            section.addEventListener('click', (e) => {
                const btn = e.target.closest('.btn-premium-cta');
                if (btn) {
                    const token = localStorage.getItem('authToken');
                    if (!token) {
                        e.preventDefault();
                        if (window.uiManager) {
                            window.uiManager.showAuthPromptModal();
                        }
                    }
                }
            });
        }

        container.appendChild(section);
        observer.observe(section);
    });

    // Auto-trigger registration modal if URL parameter authPrompt is present and not logged in
    if (urlParams.get('authPrompt') === 'true' && !localStorage.getItem('authToken')) {
        setTimeout(() => {
            if (window.uiManager && typeof window.uiManager.showAuthPromptModal === 'function') {
                window.uiManager.showAuthPromptModal();
            }
        }, 300);
    }
});
