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
            title: 'Preparación Magisterial',
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
        },
        idiomas: {
            title: 'Centro de Idiomas',
            subtitle: 'Domina un nuevo idioma con simulacros de certificación y tutores de IA',
            cards: [
                {
                    title: 'Simulacro de Certificaciones',
                    desc: 'Prepárate para TOEFL, IELTS, y exámenes de nivelación MCER en inglés e italiano.',
                    summary: 'Mide tus habilidades lingüísticas mediante simulacros de exámenes cronometrados que replican estándares internacionales (TOEFL, IELTS, MCER). Evalúa tu desempeño en tiempo real y realiza un seguimiento de tu progreso con KPIs clave y análisis detallado de tus estadísticas.',
                    href: '/simulator-dashboard?context=IDIOMAS',
                    actionText: 'Ingresar',
                    actionIcon: 'fa-arrow-right',
                    enabled: true,
                    accent: '#ec4899',
                    accentRgb: '236, 72, 153',
                    accentLight: '#f472b6',
                    image: '/assets/bg-sim-lang-exams.webp'
                },
                {
                    title: 'Tutor Conversacional IA',
                    desc: 'Chatea en tiempo real y recibe correcciones de gramática, vocabulario y pronunciación instantáneas.',
                    summary: 'Desarrolla fluidez oral y escrita conversando con un tutor interactivo por voz de baja latencia que te proporcionará correcciones gramaticales y sugerencias de léxico en tiempo real.',
                    href: '/language-tutor',
                    actionText: 'Ingresar al Chat',
                    actionIcon: 'fa-comments',
                    enabled: true,
                    accent: '#7c3aed',
                    accentRgb: '124, 58, 237',
                    accentLight: '#a78bfa',
                    image: '/assets/bg-sim-lang-tutor.webp'
                },
                {
                    title: 'Mi Vocabulario',
                    desc: 'Colecciona y practica palabras. Domina tiempos verbales, conjugaciones y flexiones con feedback en tiempo real de la IA.',
                    summary: 'Almacena y organiza tu vocabulario personalizado, repasa conjugaciones verbales y realiza ejercicios de memorización interactivos con retroalimentación automática.',
                    href: '/my-vocabulary',
                    actionText: 'Ingresar',
                    actionIcon: 'fa-arrow-right',
                    enabled: true,
                    accent: '#d946ef',
                    accentRgb: '217, 70, 239',
                    accentLight: '#f472b6',
                    image: '/assets/bg-sim-lang-vocab.webp'
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

    config.cards.forEach((card, index) => {
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
                <a href="#" class="btn-premium-cta btn-sim-theme" style="opacity: 0.6; cursor: not-allowed;">
                    <i class="fas fa-lock"></i> Próximamente
                </a>
            `;
        } else {
            buttonHtml = `
                <a href="${card.href}" class="btn-premium-cta btn-sim-theme" id="btn-action-${index}">
                    ${card.actionText} <i class="fas ${card.actionIcon}"></i>
                </a>
            `;
        }

        section.innerHTML = `
            <div class="section-grid ${isInverted ? 'grid-inverted' : ''}">
                <div class="section-info-zone">
                    <h2 class="section-main-title">
                        <span class="accent-sim-text">${card.title}</span>
                    </h2>
                    <p class="section-description">${card.desc}</p>
                    <p class="section-summary-text">${card.summary}</p>
                    ${buttonHtml}
                </div>

                <div class="section-preview-zone">
                    <div class="preview-card-glass">
                        <img src="${card.image}" alt="${card.title}" class="mockup-banner-bg" style="object-fit: cover;">
                        <div class="mockup-overlay-sim">
                            <span class="sim-tag">${config.title}</span>
                            <h3 class="sim-title">${card.title}</h3>
                            <div class="sim-progress-bar">
                                <div class="sim-progress-fill" style="background: var(--accent); width: ${card.enabled ? '85%' : '0%'};"></div>
                            </div>
                        </div>
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
        } else if (card.title === 'Tutor Conversacional IA' || card.title === 'Mi Vocabulario') {
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
