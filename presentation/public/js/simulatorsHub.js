/**
 * simulatorsHub.js — Dynamic Simulator Landing Controller
 * Reads ?domain= from URL and renders the appropriate service cards.
 * Supports: salud (default), educacion, idiomas (future).
 */
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const DOMAINS = {
        salud: {
            title: 'Centro de Simuladores',
            subtitle: 'Selecciona tu área de entrenamiento especializado',
            cards: [
                {
                    title: 'Simulacro de Exámenes',
                    desc: 'Preparación intensiva para ENAM, SERUMS y Residentado Médico con bancos oficiales.',
                    href: '/simulator-dashboard?context=MEDICINA',
                    cssClass: 'card-med',
                    actionText: 'Ingresar',
                    actionColor: '#3b82f6',
                    actionIcon: 'fa-arrow-right',
                    enabled: true
                },
                {
                    title: 'Diagnóstico por Imágenes',
                    desc: 'Entrenamiento visual avanzado con casos reales de Radiografía, TC y Resonancia.',
                    href: '#',
                    cssClass: 'card-img-sim',
                    actionText: 'Próximamente',
                    actionColor: '#eab308',
                    actionIcon: 'fa-lock',
                    enabled: false,
                    toast: 'Próximamente: Entrenamiento con Radiografías, TC y RM'
                },
                {
                    title: 'Diagnóstico Médico',
                    desc: 'Casos clínicos interactivos guiados por IA para perfeccionar el razonamiento diagnóstico.',
                    href: '#',
                    cssClass: 'card-dx-sim',
                    actionText: 'Próximamente',
                    actionColor: '#10b981',
                    actionIcon: 'fa-lock',
                    enabled: false,
                    toast: 'Próximamente: Casos Clínicos Interactivos con IA'
                }
            ]
        },
        educacion: {
            title: 'Preparación Magisterial',
            subtitle: 'Herramientas especializadas para el docente peruano',
            cards: [
                {
                    title: 'Simulador de Nombramiento',
                    desc: 'Simulacros adaptados a la estructura del examen de Nombramiento Docente con rúbricas oficiales.',
                    href: '/simulator-dashboard?context=EDUCACION',
                    cssClass: 'card-edu-nom',
                    actionText: 'Ingresar',
                    actionColor: '#f97316',
                    actionIcon: 'fa-arrow-right',
                    enabled: true
                },
                {
                    title: 'Creador de Sesiones de Clase',
                    desc: 'Genera planes de clase alineados a competencias del Currículo Nacional con apoyo de IA.',
                    href: '#',
                    cssClass: 'card-edu-sesion',
                    actionText: 'Próximamente',
                    actionColor: '#eab308',
                    actionIcon: 'fa-lock',
                    enabled: false,
                    toast: 'Próximamente: Generador de Sesiones de Clase con IA'
                },
                {
                    title: 'Generador de Rúbricas',
                    desc: 'Crea instrumentos de evaluación personalizados para cualquier nivel y competencia.',
                    href: '#',
                    cssClass: 'card-edu-rubrica',
                    actionText: 'Próximamente',
                    actionColor: '#10b981',
                    actionIcon: 'fa-lock',
                    enabled: false,
                    toast: 'Próximamente: Generador de Rúbricas de Evaluación'
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

    // Render cards
    const grid = document.getElementById('simulators-grid');
    if (!grid) return;

    config.cards.forEach(card => {
        const a = document.createElement('a');
        a.href = card.href;
        a.className = `sim-card ${card.cssClass}`;

        if (!card.enabled) {
            a.style.opacity = '0.8';
            a.style.cursor = 'not-allowed';
            a.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.uiManager && card.toast) {
                    window.uiManager.showToast(card.toast);
                }
            });
        }

        a.innerHTML = `
            <div>
                <h3 class="sim-title">${card.title}</h3>
                <p class="sim-desc">${card.desc}</p>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem; color: ${card.actionColor}; font-size: 0.9rem; font-weight: 600; margin-top: auto;">
                ${card.actionText} <i class="fas ${card.actionIcon}"></i>
            </div>
        `;

        grid.appendChild(a);
    });
});
