/**
 * tooltipManager.js
 * 
 * Gestor universal y centralizado de Tooltips y Onboarding Tour para Hub Academia.
 * - Soporta tooltips declarativos con [data-tooltip] y [data-tooltip-pos].
 * - Soporte de interacción dual: Hover para PC y Tap/Touch para móviles/tablets.
 * - Sistema de Tour Guiado interactivo (Step-by-step) para visitantes y nuevos usuarios.
 * - Integración completa con tokens de diseño Dual-Theme (Dark / Light).
 */

class TooltipManager {
    constructor() {
        this.activeTooltip = null;
        this.activeHint = null;
        this.activeBackdrop = null;
        this.currentTourSteps = [];
        this.currentTourIndex = 0;
        this.hoverTimeout = null;
        this.currentTargetElement = null;

        this.init();
    }

    init() {
        // 1. Delegación de eventos para Tooltips Declarativos [data-tooltip]
        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (!target) return;
            // No mostrar tooltip simple si el elemento es parte del tour activo
            if (this.activeHint && target.classList.contains('hub-guided-target-pulse')) return;

            const text = target.getAttribute('data-tooltip');
            if (!text) return;
            const pos = target.getAttribute('data-tooltip-pos') || 'top';

            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = setTimeout(() => {
                this.showTooltip(target, text, pos);
            }, 120);
        });

        document.addEventListener('mouseout', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                clearTimeout(this.hoverTimeout);
                this.hideTooltip();
            }
        });

        // 2. Listener global de clics para cierre seguro y soporte Touch
        document.addEventListener('click', (e) => {
            // A. Soporte para pantallas táctiles (Tap en [data-tooltip])
            const target = e.target.closest('[data-tooltip]');
            if (target && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
                // Si el elemento es un botón de acción principal o disparador del tour, no bloquear su acción
                if (!target.closest('.btn-guide-help') && !target.closest('.btn-guide-hero') && !target.closest('.hub-guided-tip')) {
                    const text = target.getAttribute('data-tooltip');
                    if (text) {
                        const pos = target.getAttribute('data-tooltip-pos') || 'top';
                        this.showTooltip(target, text, pos);
                    }
                }
            }

            // B. Cerrar tooltip pasivo al hacer clic fuera
            if (this.activeTooltip && !e.target.closest('.hub-tooltip') && !e.target.closest('[data-tooltip]')) {
                this.hideTooltip();
            }

            // C. Manejo de clics fuera de la Guía de Tour
            // Si el clic ocurrió dentro de la guía interactiva o en el botón de ayuda que abre la guía, NO cerrar
            if (e.target.closest('.hub-guided-tip') || e.target.closest('.btn-guide-help') || e.target.closest('.btn-guide-hero') || e.target.closest('.btn-guide-deck') || e.target.closest('#btn-show-guide') || e.target.closest('#btn-repaso-guide') || e.target.closest('#btn-deck-tour')) {
                return;
            }

            // Si hay un tour activo y se hace clic en cualquier otra parte fuera, cerrar suavemente
            if (this.activeHint) {
                this.endTour();
            }
        });

        // 3. Soporte para tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideTooltip();
                this.endTour();
            }
        });

        // 4. Reposicionar en redimensionamiento o scroll
        window.addEventListener('resize', () => {
            if (this.activeTooltip) this.hideTooltip();
            if (this.activeHint && this.currentTargetElement) {
                this.positionHint(this.activeHint, this.currentTargetElement, this.activeHint.dataset.pos || 'bottom');
            }
        });
    }

    /**
     * Muestra un tooltip pasivo sobre un elemento.
     */
    showTooltip(target, text, position = 'top') {
        this.hideTooltip();

        const tooltip = document.createElement('div');
        tooltip.className = `hub-tooltip hub-tooltip-${position}`;
        tooltip.textContent = text;
        document.body.appendChild(tooltip);
        this.activeTooltip = tooltip;

        const rect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const scrollX = window.scrollX || document.documentElement.scrollLeft;
        const scrollY = window.scrollY || document.documentElement.scrollTop;

        let top = 0;
        let left = 0;

        switch (position) {
            case 'bottom':
                top = rect.bottom + scrollY + 8;
                left = rect.left + scrollX + (rect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'left':
                top = rect.top + scrollY + (rect.height / 2) - (tooltipRect.height / 2);
                left = rect.left + scrollX - tooltipRect.width - 8;
                break;
            case 'right':
                top = rect.top + scrollY + (rect.height / 2) - (tooltipRect.height / 2);
                left = rect.right + scrollX + 8;
                break;
            case 'top':
            default:
                top = rect.top + scrollY - tooltipRect.height - 8;
                left = rect.left + scrollX + (rect.width / 2) - (tooltipRect.width / 2);
                break;
        }

        // Ajuste contra desbordes de pantalla
        const maxLeft = window.innerWidth - tooltipRect.width - 12;
        left = Math.max(12, Math.min(left, maxLeft));

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;

        requestAnimationFrame(() => {
            tooltip.classList.add('visible');
        });
    }

    /**
     * Oculta el tooltip pasivo.
     */
    hideTooltip() {
        if (!this.activeTooltip) return;
        const tip = this.activeTooltip;
        this.activeTooltip = null;
        tip.classList.remove('visible');
        setTimeout(() => {
            if (tip.parentElement) tip.parentElement.removeChild(tip);
        }, 150);
    }

    /**
     * Inicia un tour interactivo paso a paso.
     * @param {Array<Object>} steps - Lista de pasos [{ target, title, description, badge, icon, position }]
     * @param {Object} options - Opciones del tour
     */
    startTour(steps = [], options = {}) {
        if (!steps || steps.length === 0) return;
        this.endTour();

        this.currentTourSteps = steps;
        this.currentTourIndex = 0;
        this.tourOptions = options;
        this.activeTourKey = options.storageKey || 'hasSeenSimulatorTour_v2';

        this.renderTourStep(this.currentTourIndex);
    }

    /**
     * Renderiza el paso indicado del tour.
     */
    renderTourStep(index) {
        if (index < 0 || index >= this.currentTourSteps.length) {
            this.endTour();
            return;
        }

        const step = this.currentTourSteps[index];
        const targetElement = typeof step.target === 'string' ? document.querySelector(step.target) : step.target;

        if (!targetElement) {
            console.warn(`[TooltipManager] Elemento no encontrado para el paso ${index + 1}:`, step.target);
            // Si falta el objetivo, saltar al siguiente
            if (index + 1 < this.currentTourSteps.length) {
                this.renderTourStep(index + 1);
            } else {
                this.endTour();
            }
            return;
        }

        // Limpiar target previo
        if (this.currentTargetElement) {
            this.currentTargetElement.classList.remove('hub-guided-target-pulse');
        }
        this.currentTargetElement = targetElement;

        // Verificar si el elemento ya está visible en el viewport
        const rect = targetElement.getBoundingClientRect();
        const isInViewport = rect.top >= 60 && rect.bottom <= (window.innerHeight - 60);

        if (!isInViewport) {
            // Solo hacer scroll suave si está fuera del área visible
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            setTimeout(() => {
                this.displayHintCard(targetElement, step, index, this.currentTourSteps.length);
            }, 300);
        } else {
            // Si ya está visible, renderizar inmediatamente sin desplazar la pantalla
            this.displayHintCard(targetElement, step, index, this.currentTourSteps.length);
        }
    }

    /**
     * Crea y posiciona la tarjeta visual del tour.
     */
    displayHintCard(target, step, currentIndex, totalSteps) {
        if (this.activeHint && this.activeHint.parentElement) {
            this.activeHint.parentElement.removeChild(this.activeHint);
            this.activeHint = null;
        }

        const isFirst = currentIndex === 0;
        const isLast = currentIndex === totalSteps - 1;
        const position = step.position || 'bottom';

        const hint = document.createElement('div');
        hint.className = `hub-guided-tip hub-guided-tip-${position}`;
        hint.dataset.pos = position;

        // Generar puntos indicadores (dots)
        let dotsHtml = '<div class="hub-guided-dots">';
        for (let i = 0; i < totalSteps; i++) {
            dotsHtml += `<span class="hub-guided-dot ${i === currentIndex ? 'active' : ''}"></span>`;
        }
        dotsHtml += '</div>';

        hint.innerHTML = `
            <div class="hub-guided-header">
                <span class="hub-guided-badge"><i class="fas ${step.icon || 'fa-lightbulb'}"></i> ${step.badge || `Paso ${currentIndex + 1} de ${totalSteps}`}</span>
                ${dotsHtml}
                <button class="hub-guided-close" title="Cerrar guía" aria-label="Cerrar guía">&times;</button>
            </div>
            <div class="hub-guided-body">
                <h4 class="hub-guided-title">${step.title}</h4>
                <p class="hub-guided-desc">${step.description}</p>
            </div>
            <div class="hub-guided-footer">
                <button class="hub-guided-btn-skip">Saltar</button>
                <div class="hub-guided-nav-btns">
                    ${!isFirst ? `<button class="hub-guided-btn-prev">← Anterior</button>` : ''}
                    <button class="hub-guided-btn-primary">${isLast ? '¡Comenzar! 🚀' : 'Siguiente →'}</button>
                </div>
            </div>
        `;

        // Prevenir que clics dentro de la tarjeta se propaguen al listener global de cierre
        hint.addEventListener('click', (e) => e.stopPropagation());

        document.body.appendChild(hint);
        this.activeHint = hint;

        // Resaltar elemento objetivo
        target.classList.add('hub-guided-target-pulse');

        // Posicionar con protección anti-desborde
        this.positionHint(hint, target, position);

        // Handlers de botones
        const closeBtn = hint.querySelector('.hub-guided-close');
        const skipBtn = hint.querySelector('.hub-guided-btn-skip');
        const prevBtn = hint.querySelector('.hub-guided-btn-prev');
        const nextBtn = hint.querySelector('.hub-guided-btn-primary');

        if (closeBtn) closeBtn.onclick = (e) => { e.stopPropagation(); this.endTour(); };
        if (skipBtn) skipBtn.onclick = (e) => { e.stopPropagation(); this.endTour(); };
        if (prevBtn) prevBtn.onclick = (e) => {
            e.stopPropagation();
            this.currentTourIndex--;
            this.renderTourStep(this.currentTourIndex);
        };
        if (nextBtn) nextBtn.onclick = (e) => {
            e.stopPropagation();
            if (isLast) {
                this.endTour(true);
            } else {
                this.currentTourIndex++;
                this.renderTourStep(this.currentTourIndex);
            }
        };

        requestAnimationFrame(() => {
            hint.classList.add('visible');
        });
    }

    /**
     * Calcula la posición absoluta de la tarjeta de guía evitando salir del viewport.
     */
    positionHint(hint, target, position) {
        const rect = target.getBoundingClientRect();
        const hintRect = hint.getBoundingClientRect();
        const scrollX = window.scrollX || document.documentElement.scrollLeft;
        const scrollY = window.scrollY || document.documentElement.scrollTop;

        let top = 0;
        let left = 0;

        // Decidir posición vertical inteligente si no cabe
        let finalPos = position;
        if (position === 'bottom' && (rect.bottom + hintRect.height + 20 > window.innerHeight)) {
            finalPos = 'top';
        } else if (position === 'top' && (rect.top - hintRect.height - 20 < 0)) {
            finalPos = 'bottom';
        }

        if (finalPos === 'bottom') {
            top = rect.bottom + scrollY + 12;
            left = rect.left + scrollX + (rect.width / 2) - (hintRect.width / 2);
        } else if (finalPos === 'top') {
            top = rect.top + scrollY - hintRect.height - 12;
            left = rect.left + scrollX + (rect.width / 2) - (hintRect.width / 2);
        } else if (finalPos === 'right') {
            top = rect.top + scrollY + (rect.height / 2) - (hintRect.height / 2);
            left = rect.right + scrollX + 12;
        } else if (finalPos === 'left') {
            top = rect.top + scrollY + (rect.height / 2) - (hintRect.height / 2);
            left = rect.left + scrollX - hintRect.width - 12;
        }

        // Evitar desborde horizontal
        const maxLeft = window.innerWidth - hintRect.width - 16;
        left = Math.max(16, Math.min(left, maxLeft));

        hint.style.top = `${top}px`;
        hint.style.left = `${left}px`;
    }

    /**
     * Finaliza el tour activo y limpia el DOM.
     */
    endTour(completed = false) {
        if (this.currentTargetElement) {
            this.currentTargetElement.classList.remove('hub-guided-target-pulse');
            this.currentTargetElement = null;
        }

        if (this.activeHint) {
            const hint = this.activeHint;
            this.activeHint = null;
            hint.classList.remove('visible');
            setTimeout(() => {
                if (hint.parentElement) hint.parentElement.removeChild(hint);
            }, 200);
        }

        const key = this.activeTourKey || 'hasSeenSimulatorTour_v2';
        localStorage.setItem(key, 'true');

        if (completed && window.uiManager) {
            window.uiManager.showToast('¡Excelente! Ya conoces las funciones clave para tu aprendizaje.', 'success');
        }
    }

    /**
     * Tour estándar para el Simulador de Exámenes (Educación, Salud, Idiomas).
     * @param {boolean} force - Si es true, inicia el tour aunque ya haya sido visto antes.
     */
    startSimulatorTour(force = false) {
        const storageKey = 'hasSeenSimulatorTour_v2';
        if (!force && localStorage.getItem(storageKey)) return;

        const steps = [
            {
                target: '#btn-start-config',
                badge: 'Paso 1 de 3',
                icon: 'fa-sliders-h',
                title: '1. Configura tu Examen',
                description: 'Personaliza tu simulador seleccionando tu <strong>área profesional o especialidad</strong> para enfocar las preguntas en tu temario oficial.',
                position: 'bottom'
            },
            {
                target: '#btn-mode-study',
                badge: 'Paso 2 de 3',
                icon: 'fa-book-open-reader',
                title: '2. Elige tu Modo de Estudio',
                description: 'Practica en <strong>Modo Estudio</strong> para obtener retroalimentación y lecciones con IA inmediata, o usa <strong>Simulacro Rápido</strong> para agilidad diaria.',
                position: 'top'
            },
            {
                target: '#analytics-section-icon',
                badge: 'Paso 3 de 3',
                icon: 'fa-chart-line',
                title: '3. Panel de Analítica y Rendimiento',
                description: 'Monitorea tu porcentaje de dominio, evolución de notas históricas y áreas temáticas que requieren refuerzo.',
                position: 'top'
            }
        ];

        this.startTour(steps, { storageKey });
    }

    /**
     * Tour estándar para el Centro de Repaso / Flashcards.
     * @param {boolean} force - Si es true, inicia el tour aunque ya haya sido visto antes.
     */
    startRepasoTour(force = false) {
        // Si el usuario está viendo la vista interior de un mazo, derivar al tour específico de mazo
        const folderView = document.getElementById('folder-view');
        if (folderView && folderView.style.display !== 'none') {
            return this.startDeckViewTour(force);
        }

        const storageKey = 'hasSeenRepasoTour_v1';
        if (!force && localStorage.getItem(storageKey)) return;

        const createTarget = document.querySelector('.create-deck-card') || document.querySelector('#btn-explorer-create') || '#btn-explorer-create';
        const explorerTarget = document.querySelector('#explorer-sidebar') || document.querySelector('#deck-tree') || '#deck-tree';
        const deckGridTarget = document.querySelector('#root-decks-grid') || document.querySelector('.decks-grid') || '#root-decks-grid';

        const steps = [
            {
                target: createTarget,
                badge: 'Paso 1 de 3',
                icon: 'fa-folder-plus',
                title: '1. Crea y Estructura tus Mazos',
                description: 'Organiza tus materias en <strong>carpetas y submazos jerárquicos</strong>. Puedes crear mazos desde cero o importar preguntas en lote.',
                position: 'bottom'
            },
            {
                target: explorerTarget,
                badge: 'Paso 2 de 3',
                icon: 'fa-sitemap',
                title: '2. Explorador y Comunidad',
                description: 'Navega en el árbol de carpetas o visita la <strong>Comunidad</strong> para descubrir y clonar mazos públicos creados por otros estudiantes.',
                position: 'right'
            },
            {
                target: deckGridTarget,
                badge: 'Paso 3 de 3',
                icon: 'fa-brain',
                title: '3. Repaso Inteligente (SM-2)',
                description: 'Haz clic en cualquier mazo para iniciar tu <strong>sesión de estudio diario</strong>, gestionar tus preguntas o consultar a tu <strong>Tutor IA de Flashcards</strong>.',
                position: 'top'
            }
        ];

        this.startTour(steps, { storageKey });
    }

    /**
     * Tour contextual dentro de la vista interior de un Mazo de Flashcards.
     * @param {boolean} force - Si es true, inicia el tour aunque ya haya sido visto antes.
     */
    startDeckViewTour(force = false) {
        const storageKey = 'hasSeenDeckViewTour_v1';
        if (!force && localStorage.getItem(storageKey)) return;

        const studyTarget = document.querySelector('.btn-fh-study') || document.querySelector('.btn-fh-demo') || '.action-bar';
        const addTarget = document.querySelector('.btn-fh-add') || '.action-bar';
        const guideTarget = document.querySelector('.btn-fh-guide') || '.action-bar';
        const statsTarget = document.querySelector('.btn-fh-stats') || document.querySelector('.btn-fh-visibility') || '.action-bar';
        const subdecksTarget = document.querySelector('#subdecks-container') || document.querySelector('#cards-container') || '#folder-view';

        const steps = [
            {
                target: studyTarget,
                badge: 'Paso 1 de 5',
                icon: 'fa-play',
                title: '1. Iniciar Repaso Espaciado',
                description: 'Inicia tu práctica diaria. El algoritmo <strong>SM-2</strong> programará las preguntas según tu memoria para consolidar tu aprendizaje a largo plazo.',
                position: 'bottom'
            },
            {
                target: addTarget,
                badge: 'Paso 2 de 5',
                icon: 'fa-plus-circle',
                title: '2. Crear y Añadir Tarjetas',
                description: 'Agrega preguntas con anverso, reverso explicativo e imágenes, o genera tarjetas instantáneas con <strong>Inteligencia Artificial</strong>.',
                position: 'bottom'
            },
            {
                target: guideTarget,
                badge: 'Paso 3 de 5',
                icon: 'fa-book-open',
                title: '3. Cuaderno de Estudio del Mazo',
                description: 'Accede a un cuaderno enriquecido con <strong>tablas, resúmenes y notas teóricas</strong> para repasar antes de practicar.',
                position: 'bottom'
            },
            {
                target: statsTarget,
                badge: 'Paso 4 de 5',
                icon: 'fa-chart-pie',
                title: '4. Métricas y Visibilidad',
                description: 'Consulta tus métricas de retención y dominio. Además, puedes <strong>hacer público</strong> tu mazo para compartirlo en la comunidad.',
                position: 'bottom'
            },
            {
                target: subdecksTarget,
                badge: 'Paso 5 de 5',
                icon: 'fa-list-check',
                title: '5. Sub-Mazos y Tarjetas',
                description: 'Organiza ramas temáticas en <strong>Sub-Mazos</strong> y utiliza el buscador para filtrar, editar o revisar todas tus flashcards individuales.',
                position: 'top'
            }
        ];

        this.startTour(steps, { storageKey });
    }
}

// Exportación Singleton
window.TooltipManager = TooltipManager;
window.tooltipManager = new TooltipManager();
