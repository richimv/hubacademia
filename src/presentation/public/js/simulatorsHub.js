/**
 * simulatorsHub.js — Controlador Unificado de Simuladores Oficiales
 * Muestra el catálogo de simuladores activos de Hub Academia (Educación MINEDU en primer plano
 * y Salud SERUMS como vertical disponible), respetando ?domain= cuando se filtra explícitamente.
 */
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const SIMULATORS = {
        educacion: {
            key: 'educacion',
            badge: 'Educación · MINEDU',
            title: 'Simulacro de Ascenso y Evaluación Docente',
            desc: 'Entrenamiento cronometrado sobre bancos oficiales del MINEDU con casuística pedagógica y retroalimentación asistida por IA.',
            summary: 'Practica bajo la estructura real de la Prueba Nacional del MINEDU (Base 90 puntos, 60 casuísticas en 180 minutos). Calibra tu meta según la escala magisterial a la que postulas y analiza tu dominio por área pedagógica.',
            href: '/simulator-dashboard?context=EDUCACION',
            actionText: 'Abrir simulador docente',
            accent: '#2563eb',
            specTitle: 'Estructura de la Prueba Nacional MINEDU',
            specs: [
                { label: 'Duración', val: '180 min' },
                { label: 'Reactivos', val: '60 casos' },
                { label: 'Escala', val: 'Base 90 pts' }
            ],
            syllabus: [
                { name: 'Teorías y Procesos Pedagógicos', pct: '40%' },
                { name: 'Especialidad Curricular (CNEB)', pct: '35%' },
                { name: 'Clima Escolar, DUA y Evaluación', pct: '25%' }
            ]
        },
        salud: {
            key: 'salud',
            badge: 'Salud · MINSA',
            title: 'Simulacro Nacional SERUMS (ENCAPS)',
            desc: 'Preparación rigurosa para profesionales de Medicina Humana y Enfermería con bancos oficiales auditados.',
            summary: 'Simulacros estructurados sobre los cinco bloques temáticos oficiales de la evaluación para el Servicio Rural y Urbano Marginal de Salud, con seguimiento estadístico de precisión y diagnóstico de brechas.',
            href: '/simulator-dashboard?context=MEDICINA',
            actionText: 'Abrir simulador SERUMS',
            accent: '#0d9488',
            specTitle: 'Estructura Evaluación Nacional SERUMS',
            specs: [
                { label: 'Duración', val: '120 min' },
                { label: 'Reactivos', val: '100 preguntas' },
                { label: 'Calificación', val: 'Vigesimal (0–20)' }
            ],
            syllabus: [
                { name: 'Salud Pública y Cuidado Integral', pct: '55%' },
                { name: 'Gestión de Servicios de Salud', pct: '20%' },
                { name: 'Ética, Interculturalidad e Investigación', pct: '25%' }
            ]
        }
    };

    const urlParams = new URLSearchParams(window.location.search);
    const domainParam = (urlParams.get('domain') || '').toLowerCase();

    let headerTitle = 'Simuladores de Evaluación Oficial';
    let headerSubtitle = 'Entrenamiento cronometrado con bancos oficiales auditados y análisis de desempeño.';
    let cardsToRender = [SIMULATORS.educacion, SIMULATORS.salud];

    if (domainParam === 'educacion') {
        headerTitle = 'Preparación Magisterial (MINEDU)';
        headerSubtitle = 'Simulación oficial de casuística pedagógica alineada al CNEB.';
        cardsToRender = [SIMULATORS.educacion];
    } else if (domainParam === 'salud') {
        headerTitle = 'Entrenamiento SERUMS (MINSA)';
        headerSubtitle = 'Simulación oficial por bloques temáticos para Medicina Humana y Enfermería.';
        cardsToRender = [SIMULATORS.salud];
    }

    const titleEl = document.getElementById('sim-hub-title');
    const subtitleEl = document.getElementById('sim-hub-subtitle');
    if (titleEl) titleEl.textContent = headerTitle;
    if (subtitleEl) subtitleEl.textContent = headerSubtitle;
    document.title = `${headerTitle} | Hub Academia`;

    const container = document.getElementById('simulators-container');
    if (!container) return;

    function buildSpecPanelHtml(card) {
        const syllabusHtml = card.syllabus.map(item => `
            <div class="sim-spec-row">
                <div class="sim-spec-row-head">
                    <span class="sim-spec-name">${item.name}</span>
                    <span class="sim-spec-pct">${item.pct}</span>
                </div>
                <div class="sim-spec-track">
                    <div class="sim-spec-fill" style="width: ${item.pct};"></div>
                </div>
            </div>
        `).join('');

        const specsHtml = card.specs.map(spec => `
            <div class="sim-spec-metric">
                <div class="sim-spec-metric-label">${spec.label}</div>
                <div class="sim-spec-metric-val">${spec.val}</div>
            </div>
        `).join('');

        return `
            <div class="simulator-spec-panel">
                <div class="sim-spec-header">
                    <span class="sim-spec-title">${card.specTitle}</span>
                    <span class="sim-spec-status">Banco Oficial</span>
                </div>
                <div class="sim-spec-bars">
                    ${syllabusHtml}
                </div>
                <div class="sim-spec-metrics-grid">
                    ${specsHtml}
                </div>
            </div>
        `;
    }

    cardsToRender.forEach((card, index) => {
        const section = document.createElement('section');
        section.className = 'sim-hub-panel';
        section.id = `sim-section-${index}`;
        section.style.setProperty('--accent', card.accent);

        section.innerHTML = `
            <div class="sim-hub-grid">
                <div class="sim-hub-main">
                    <span class="sim-hub-domain-label">${card.badge}</span>
                    <h2 class="sim-hub-card-title">${card.title}</h2>
                    <p class="sim-hub-card-desc">${card.desc}</p>
                    ${buildSpecPanelHtml(card)}
                </div>

                <div class="sim-hub-aside">
                    <div class="simulator-summary-card">
                        <h3 class="summary-card-title">Alcance del entrenamiento</h3>
                        <p class="summary-card-text">${card.summary}</p>
                    </div>
                    <div class="sim-hub-cta-wrap">
                        <a href="${card.href}" class="btn-sim-theme" id="btn-action-${index}">
                            <span>${card.actionText}</span>
                            <i class="fas fa-arrow-right" aria-hidden="true"></i>
                        </a>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(section);
    });

    if (urlParams.get('authPrompt') === 'true' && !localStorage.getItem('authToken')) {
        setTimeout(() => {
            if (window.uiManager && typeof window.uiManager.showAuthPromptModal === 'function') {
                window.uiManager.showAuthPromptModal();
            }
        }, 300);
    }
});
