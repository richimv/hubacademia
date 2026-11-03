/**
 * home-animations.js
 * Capa de Presentación — Interacciones en vivo y coreografía de entrada para la portada corporativa.
 * Incluye:
 *  - Evaluador interactivo de casuística oficial (MINEDU / SERUMS) + Tutor IA + Repaso SM-2.
 *  - Mesa de trabajo interactiva de herramientas (Simuladores, Inicial, Repaso SM-2, Biblioteca).
 *  - Demo interactiva de diálogo Tutor IA normativo (CNEB vs MINSA).
 *  - Navegación móvil ejecutiva y observador de entrada ([data-reveal]).
 *  - Integración con el Asistente Guía (#homepage-open-chat-btn y ?openChat=true).
 */

const LIVE_CASES = {
    EDUCACION: {
        source: 'Banco Oficial Curado · Ascenso MINEDU',
        stem: 'Durante una actividad de indagación, un estudiante concluye que las plantas solo respiran de noche. Según el CNEB, ¿qué intervención promueve retroalimentación reflexiva?',
        correctIndex: 1,
        options: [
            {
                letter: 'A',
                text: 'Indicarle que su conclusión es incorrecta y explicarle que las plantas respiran día y noche.',
                feedback: 'Corresponde a retroalimentación descriptiva: corrige directamente el dato sin que el estudiante contraste su hipótesis.'
            },
            {
                letter: 'B',
                text: 'Preguntarle qué ocurriría con las células de la planta durante el día si dejaran de recibir energía mediante la respiración.',
                feedback: 'Correcto (Sustento CNEB / MBDD): formula una repregunta socrática que genera conflicto cognitivo y guía al estudiante a descubrir el proceso por sí mismo.'
            },
            {
                letter: 'C',
                text: 'Solicitarle que vuelva a leer la ficha informativa sobre intercambio gaseoso vegetal antes de exponer.',
                feedback: 'Delega la revisión sin mediación pedagógica sobre el razonamiento que originó la concepción alternativa.'
            }
        ],
        sm2Label: 'Nota vinculada: Retroalimentación por descubrimiento · Intervalo SM-2: 4 días (EF 2.50)'
    },
    SALUD: {
        source: 'Banco Oficial Curado · Examen SERUMS MINSA',
        stem: 'Gestante de 34 semanas acude a puesto de salud I-2 con PA 160/110 mmHg y cefalea intensa persistente. Según guía del MINSA, ¿cuál es la conducta inicial prioritaria antes de referir?',
        correctIndex: 0,
        options: [
            {
                letter: 'A',
                text: 'Iniciar sulfato de magnesio (esquema Zuspan), administrar nifedipino oral y coordinar referencia inmediata.',
                feedback: 'Correcto (Clave NTS MINSA — Clave Azul Obstétrica): ante preeclampsia con criterios de severidad se previene eclampsia con sulfato de magnesio y se estabiliza PA previo al traslado.'
            },
            {
                letter: 'B',
                text: 'Indicar reposo en decúbito lateral izquierdo y reevaluar presión arterial en cuatro horas.',
                feedback: 'Conducta riesgosa: la presencia de PA >= 160/110 mmHg con síntomas neurológicos exige manejo activo inmediato.'
            },
            {
                letter: 'C',
                text: 'Administrar inhibidores de la enzima convertidora de angiotensina (IECA) por vía oral.',
                feedback: 'Contraindicado en el embarazo por toxicidad fetal renal y oligohidramnios.'
            }
        ],
        sm2Label: 'Nota vinculada: Clave Azul Obstétrica MINSA · Intervalo SM-2: 4 días (EF 2.50)'
    }
};

const TUTOR_DEMO_CASES = {
    CNEB: {
        userQuery: '¿Cuál es la diferencia entre retroalimentación descriptiva y por descubrimiento según RVM 094-2020-MINEDU?',
        botAnswer: 'La retroalimentación descriptiva detalla al estudiante sus aciertos y errores específicos, ofreciendo sugerencias directas de mejora. En contraste, la retroalimentación reflexiva o por descubrimiento (máximo nivel) formula preguntas y retos que guían al estudiante a identificar por sí mismo la brecha y autorregular su proceso de aprendizaje.',
        citation: 'RVM N.° 094-2020-MINEDU · CNEB Pág. 34'
    },
    MINSA: {
        userQuery: '¿Cuáles son los signos de alarma para activación de Clave Roja obstétrica en el primer nivel de atención?',
        botAnswer: 'En shock hipovolémico obstétrico (sangrado vaginal > 500 ml posparto, PA sistólica < 90 mmHg, frecuencia cardíaca > 100 lpm, alteración de conciencia), la conducta inmediata es colocación de 2 vías endovenosas de grueso calibre (catéter 18G), infusión rápida de cristaloides y referencia en ambulancia.',
        citation: 'NTS N.° 105-MINSA/DGSP · Manejo de Emergencias Obstétricas'
    }
};

function initLiveEvaluator(root = document) {
    const container = root.getElementById ? root.getElementById('live-casuistica') : root.querySelector('#live-casuistica');
    if (!container) return null;

    let activeDomain = 'EDUCACION';
    let selectedIndex = 1;
    let savedToSm2 = false;

    const sourceEl = container.querySelector('#live-eval-source');
    const stemEl = container.querySelector('#live-eval-stem');
    const optionsWrap = container.querySelector('#live-eval-options');
    const tutorTextEl = container.querySelector('#live-tutor-text');
    const sm2Btn = container.querySelector('#live-sm2-btn');
    const sm2StatusEl = container.querySelector('#live-sm2-status');
    const domainBtns = container.querySelectorAll('[data-live-domain]');

    const renderState = () => {
        const current = LIVE_CASES[activeDomain] || LIVE_CASES.EDUCACION;
        if (sourceEl) sourceEl.textContent = current.source;
        if (stemEl) stemEl.textContent = current.stem;

        domainBtns.forEach((btn) => {
            const isMatch = btn.getAttribute('data-live-domain') === activeDomain;
            btn.classList.toggle('is-active', isMatch);
            btn.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
        });

        if (optionsWrap) {
            optionsWrap.innerHTML = '';
            current.options.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'live-opt-btn';
                if (selectedIndex === idx) {
                    btn.classList.add(idx === current.correctIndex ? 'is-correct' : 'is-wrong');
                }
                btn.setAttribute('aria-pressed', selectedIndex === idx ? 'true' : 'false');

                const letterSpan = document.createElement('span');
                letterSpan.className = 'live-opt-letter';
                letterSpan.textContent = `${opt.letter}.`;

                const textSpan = document.createElement('span');
                textSpan.textContent = opt.text;

                btn.appendChild(letterSpan);
                btn.appendChild(textSpan);

                btn.addEventListener('click', () => {
                    selectedIndex = idx;
                    savedToSm2 = false;
                    renderState();
                });

                optionsWrap.appendChild(btn);
            });
        }

        if (tutorTextEl) {
            const chosen = current.options[selectedIndex] || current.options[current.correctIndex];
            tutorTextEl.textContent = chosen.feedback;
        }

        if (sm2Btn && sm2StatusEl) {
            sm2Btn.textContent = savedToSm2 ? 'Guardado en Repaso y Notas' : 'Agendar en SM-2 (+4 días)';
            sm2StatusEl.textContent = savedToSm2
                ? current.sm2Label
                : 'Convierte cualquier sustento del Tutor IA en tarjeta o nota de estudio.';
        }
    };

    domainBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const nextDomain = btn.getAttribute('data-live-domain');
            if (LIVE_CASES[nextDomain]) {
                activeDomain = nextDomain;
                selectedIndex = LIVE_CASES[nextDomain].correctIndex;
                savedToSm2 = false;
                renderState();
            }
        });
    });

    if (sm2Btn) {
        sm2Btn.addEventListener('click', () => {
            savedToSm2 = !savedToSm2;
            renderState();
        });
    }

    renderState();
    return { getDomain: () => activeDomain };
}

function initToolsWorkbench(root = document) {
    const selectorBtns = Array.from(root.querySelectorAll('.tool-selector-btn'));
    const stagePanels = Array.from(root.querySelectorAll('.tool-stage-panel'));
    if (!selectorBtns.length || !stagePanels.length) return null;

    const selectTool = (toolId) => {
        selectorBtns.forEach((btn) => {
            const isMatch = btn.getAttribute('data-tool-target') === toolId;
            btn.classList.toggle('is-active', isMatch);
            btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
        });

        stagePanels.forEach((panel) => {
            const isMatch = panel.getAttribute('data-tool-panel') === toolId;
            panel.classList.toggle('is-active', isMatch);
        });
    };

    selectorBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const toolId = btn.getAttribute('data-tool-target');
            if (toolId) selectTool(toolId);
        });
    });

    return { selectTool };
}

// Backwards compatibility alias for existing callers
function initToolsAccordion(root = document) {
    return initToolsWorkbench(root);
}

function initTutorDemo(root = document) {
    const demoCard = root.getElementById ? root.getElementById('tutor-live-demo') : root.querySelector('#tutor-live-demo');
    if (!demoCard) return null;

    const switchBtns = demoCard.querySelectorAll('[data-tutor-case]');
    const userBubble = demoCard.querySelector('#tutor-demo-user');
    const botBubble = demoCard.querySelector('#tutor-demo-bot');
    const citeBadge = demoCard.querySelector('#tutor-demo-cite');

    const renderCase = (caseId) => {
        const item = TUTOR_DEMO_CASES[caseId] || TUTOR_DEMO_CASES.CNEB;
        if (userBubble) userBubble.textContent = item.userQuery;
        if (botBubble) botBubble.textContent = item.botAnswer;
        if (citeBadge) citeBadge.textContent = item.citation;

        switchBtns.forEach((btn) => {
            const isMatch = btn.getAttribute('data-tutor-case') === caseId;
            btn.classList.toggle('is-active', isMatch);
            btn.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
        });
    };

    switchBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const caseId = btn.getAttribute('data-tutor-case');
            if (caseId) renderCase(caseId);
        });
    });

    renderCase('CNEB');
    return { renderCase };
}

function initExecutiveMobileMenu(root = document) {
    const toggleBtn = root.getElementById ? root.getElementById('exec-mobile-menu-btn') : root.querySelector('#exec-mobile-menu-btn');
    const drawer = root.getElementById ? root.getElementById('exec-mobile-drawer') : root.querySelector('#exec-mobile-drawer');
    if (!toggleBtn || !drawer) return;

    toggleBtn.addEventListener('click', () => {
        const isOpen = drawer.classList.toggle('is-open');
        toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        toggleBtn.textContent = isOpen ? 'Cerrar' : 'Menú';
    });

    drawer.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            drawer.classList.remove('is-open');
            toggleBtn.setAttribute('aria-expanded', 'false');
            toggleBtn.textContent = 'Menú';
        });
    });

    const mobileLoginLink = root.getElementById ? root.getElementById('mobile-menu-login-link') : root.querySelector('#mobile-menu-login-link');
    if (mobileLoginLink) {
        mobileLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            const openModalBtn = document.getElementById('open-login-modal');
            if (openModalBtn) openModalBtn.click();
        });
    }
}

function initScrollReveals(root = document) {
    const revealEls = Array.from(root.querySelectorAll('[data-reveal]'));
    if (!revealEls.length) return;

    if (typeof IntersectionObserver === 'undefined') {
        revealEls.forEach((el) => el.classList.add('is-in'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-in');
                observer.unobserve(entry.target);
            }
        });
    }, {
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.08
    });

    revealEls.forEach((el) => observer.observe(el));
}

function initGuideAssistantHooks() {
    const openChatBtn = document.getElementById('homepage-open-chat-btn');
    if (openChatBtn) {
        openChatBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.chatbot && typeof window.chatbot.toggleChat === 'function') {
                if (!window.chatbot.isOpen) {
                    window.chatbot.toggleChat();
                }
                return;
            }
            const chatbotToggle = document.getElementById('chatbot-toggle');
            if (chatbotToggle) {
                chatbotToggle.click();
            }
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openChat') === 'true') {
        const openNow = () => {
            if (window.chatbot && !window.chatbot.isOpen) {
                window.chatbot.toggleChat();
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        };
        if (window.sessionManager) {
            window.sessionManager.onStateChange(openNow);
        }
        setTimeout(openNow, 250);
    }
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        try {
            initLiveEvaluator(document);
            initToolsWorkbench(document);
            initTutorDemo(document);
            initExecutiveMobileMenu(document);
            initScrollReveals(document);
            initGuideAssistantHooks();
        } catch (err) {
            console.error('[Landing] Error al inicializar interacciones de portada:', err);
        }
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        LIVE_CASES,
        TUTOR_DEMO_CASES,
        initLiveEvaluator,
        initToolsWorkbench,
        initToolsAccordion,
        initTutorDemo,
        initExecutiveMobileMenu,
        initScrollReveals
    };
}
