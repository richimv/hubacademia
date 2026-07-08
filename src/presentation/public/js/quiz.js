
/**
 * Motor del Simulacro Médico (Frontend)
 * Maneja la lógica de preguntas, temporizador y envío de resultados.
 */

// Estado del Juego
const state = {
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    answers: [], // { questionId, userAnswer, isCorrect }
    startTime: null,
    topic: '',
    maxQuestions: 20, // 🎯 Study Mode Limit
    isLoadingBatch: false,
    quizId: null // ✅ NUEVO: ID único de sesión para evitar colisiones en localStorage
};

// Exponer estado para diagnóstico
window.__quizState = state;

// Control del Scroll Automático
let currentScrollAnimationId = null;
let activeScrollCleanup = null;

function cancelCurrentScroll() {
    if (currentScrollAnimationId && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(currentScrollAnimationId);
        currentScrollAnimationId = null;
    }
    if (activeScrollCleanup) {
        activeScrollCleanup();
        activeScrollCleanup = null;
    }
}

const STORAGE_KEY = 'simulator_active_session';

// 💡 TIPS DINÁMICOS PARA LA ESPERA (Evitar aburrimiento)
const LOADING_RESOURCES = {
    'MEDICINA': {
        title: 'Preparando tu Entrenamiento Médico',
        subtitle: 'Sincronizando con Biblioteca Médica...',
        tips: [
            "El lavado de manos es la medida más costo-efectiva en salud pública.",
            "En el SERUMS, la gestión de la cadena de frío es crítica para el éxito del PAI.",
            "TIP: La norma técnica de salud establece que los EESS I-1 no cuentan con laboratorio.",
            "Dato: El Perú tiene 12 Determinantes Sociales de la Salud según el modelo de la OMS.",
            "Recuerda: El consentimiento informado es un derecho fundamental del paciente.",
            "Tip Rápido: Los indicadores de impacto evalúan el cambio en el estado de salud a largo plazo."
        ]
    },
    'EDUCACION': {
        title: 'Preparando tu Entrenamiento Magisterial',
        subtitle: 'Analizando Casuística Pedagógica...',
        tips: [
            "La retroalimentación descriptiva es la más efectiva para el aprendizaje autónomo.",
            "El andamiaje pedagógico ayuda al estudiante a transitar a su Zona de Desarrollo Próximo.",
            "Dato: El CNEB se basa en un enfoque por competencias y un perfil de egreso nacional.",
            "Tip: En casos de conflicto en el aula, prioriza siempre la mediación y el diálogo.",
            "Sabías que: El error constructivo es una oportunidad valiosa de aprendizaje según el MINEDU.",
            "Clave: La evaluación formativa busca regular el aprendizaje, no solo calificarlo."
        ]
    },
    'IDIOMAS': {
        title: 'Preparando tu Entrenamiento de Idiomas',
        subtitle: 'Cargando Módulo de Idiomas...',
        tips: [
            "La repetición espaciada es clave para memorizar vocabulario a largo plazo.",
            "Aprender frases completas es más efectivo que memorizar palabras aisladas.",
            "Escuchar audios con transcripciones ayuda a conectar fonética y ortografía.",
            "Practica hablar contigo mismo en el idioma objetivo para mejorar tu fluidez.",
            "El contexto es tu mejor amigo para deducir el significado de palabras nuevas.",
            "Intenta pensar directamente en el idioma objetivo sin traducir mentalmente."
        ]
    }
};

// Elementos DOM
const elements = {
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingTitle: document.getElementById('loadingTitle'),
    loadingSubtitle: document.getElementById('loadingSubtitle'),
    questionText: document.getElementById('questionText'),
    optionsGrid: document.getElementById('optionsGrid'),
    // Header Progress
    currentQ: document.getElementById('currentQ'),
    maxQ: document.getElementById('maxQ'),
    progressBar: document.getElementById('progressBar'),
    timer: document.getElementById('timer'),
    feedbackBox: document.getElementById('feedbackBox'),
    explanationText: document.getElementById('explanationText'),
    nextBtn: document.getElementById('nextBtn'),
    nextBtnContainer: document.getElementById('nextBtnContainer'),
    resultsOverlay: document.getElementById('resultsOverlay'),
    scoreCircle: document.getElementById('scoreCircle'),
    svgScoreProgress: document.getElementById('svgScoreProgress'),
    finalScore: document.getElementById('finalScore'),
    explanationImageContainer: document.getElementById('explanationImageContainer'),
    explanationImage: document.getElementById('explanationImage')
};

// ==========================================
// 🚀 ASIGNACIÓN TEMPRANA (Para evitar Race Conditions)
// ==========================================
window.showExamReview = async function () {
    console.log("🚀 Iniciando renderizado de revisión...");
    cancelCurrentScroll();
    try {
        const resOverlay = document.getElementById('resultsOverlay');
        if (resOverlay) resOverlay.classList.remove('active');

        const qHeader = document.querySelector('.question-header');
        if (qHeader) qHeader.style.display = 'none';

        const qLayout = document.getElementById('questionLayout');
        if (qLayout) qLayout.style.display = 'none';

        const qText = document.getElementById('questionText');
        if (qText) qText.style.display = 'none';

        const oGrid = document.getElementById('optionsGrid');
        if (oGrid) oGrid.style.display = 'none';

        const fBox = document.getElementById('feedbackBox');
        if (fBox) fBox.style.display = 'none';

        const nextContainer = elements.nextBtnContainer || document.getElementById('nextBtnContainer');
        if (nextContainer) {
            nextContainer.classList.add('hidden');
        }

        const reviewContainer = document.getElementById('reviewContainer');
        if (reviewContainer) {
            reviewContainer.classList.remove('hidden');
            const reviewTitleEl = reviewContainer.querySelector('.review-header h2');
            if (reviewTitleEl) {
                const ctxUpper = state.context.toUpperCase();
                const ctxTitleSuffix = ctxUpper === 'IDIOMAS' ? 'de Idiomas' : (ctxUpper === 'EDUCACION' ? 'Magisterial' : 'Médico');
                reviewTitleEl.innerHTML = `<i class="fas fa-clipboard-check"></i> Corrección de Simulacro ${ctxTitleSuffix}`;
            }
        }

        const quizContainer = document.querySelector('.quiz-container');
        if (quizContainer) quizContainer.classList.add('review-mode');

        const feed = document.getElementById('reviewFeed');
        if (!feed) {
            console.error("❌ Error: Elemento reviewFeed no encontrado.");
            return;
        }

        feed.innerHTML = '<div style="text-align:center; padding: 2rem;"><i class="fas fa-spinner fa-spin fa-2x" style="color:#3b82f6;"></i><br><p style="color:#cbd5e1; margin-top:1rem;">Cargando revisión...</p></div>';

        const totalProcessed = Math.min(state.currentQuestionIndex, state.questions.length);
        const answeredQuestions = state.questions.slice(0, totalProcessed);

        feed.innerHTML = '';

        if (totalProcessed === 0) {
            feed.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-muted);">No hay preguntas respondidas.</div>';
        }

        const saveButtonsMap = new Map();

        for (let i = 0; i < totalProcessed; i++) {
            try {
                const q = state.questions[i];
                if (!q) continue;
                const ans = state.answers[i];
                const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true';
                const config = { question: q, answer: ans, index: i, isDemo: isDemo, isSavedFront: false, career: state.career };
                const cardHTML = window.UIComponents.createReviewCardHTML(config);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = cardHTML.trim();
                const card = tempDiv.firstElementChild;

                if (!card) continue;
                feed.appendChild(card);
            } catch (e) { console.error(e); }
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
        console.log("✅ showExamReview finalizado.");
    } catch (e) { console.error("💥 ERROR CRÍTICO en showExamReview:", e); }
};

// Configuración
let API_URL = `${window.AppConfig.API_URL}/api/medico`; // Default fallback

// 1. Inicialización
async function init() {
    // Re-bind elements to guarantee they are correctly resolved after DOM is fully parsed
    Object.keys(elements).forEach(key => {
        const el = document.getElementById(key);
        if (el) elements[key] = el;
    });

    // Obtener parámetros de URL
    const urlParams = new URLSearchParams(window.location.search);
    state.topic = urlParams.get('topic') || '';
    state.context = urlParams.get('context') || 'MEDICINA'; // Default

    // Set dynamic tab title based on context
    const ctxUpper = state.context.toUpperCase();
    const ctxTitle = ctxUpper === 'IDIOMAS' ? 'Simulador de Idiomas' : (ctxUpper === 'EDUCACION' ? 'Simulador Magisterial' : 'Simulador Médico');
    document.title = `${ctxTitle} | Hub Academia`;

    // Configurar API_URL dinámicamente según contexto
    if (ctxUpper === 'EDUCACION') {
        API_URL = `${window.AppConfig.API_URL}/api/docente`;
    } else if (ctxUpper === 'IDIOMAS') {
        API_URL = `${window.AppConfig.API_URL}/api/idiomas-simulator`;
    } else {
        API_URL = `${window.AppConfig.API_URL}/api/medico`;
    }

    // Custom Exam Builder params
    let savedConfig = null;
    try {
        const stored = localStorage.getItem(`simActiveConfig_${state.context}`);
        if (stored) savedConfig = JSON.parse(stored);
    } catch (error) { console.warn("No active config found"); }

    state.difficulty = urlParams.get('difficulty') || urlParams.get('level') || (savedConfig && savedConfig.difficulty ? savedConfig.difficulty : (state.context === 'IDIOMAS' ? 'B2' : 'Senior'));

    state.targetExam = urlParams.get('target') || (savedConfig ? savedConfig.target : (state.context === 'IDIOMAS' ? 'MCER' : (state.context === 'EDUCACION' ? 'ASCENSO' : 'SERUMS')));
    state.career = urlParams.get('career') || (savedConfig ? savedConfig.career : null);
    state.mode = urlParams.get('mode') || '';
    state.configType = urlParams.get('configType') || (savedConfig && savedConfig.configType ? savedConfig.configType : 'default');

    const areasParam = urlParams.get('areas');
    if (areasParam) {
        state.areas = String(areasParam).split(',');
    } else if (savedConfig && savedConfig.areas && savedConfig.areas.length > 0) {
        state.areas = savedConfig.areas;
    } else {
        state.topic = urlParams.get('topic') || '';
        state.areas = state.topic ? [state.topic] : [];
    }

    // 🎯 Mode Selection: 
    // ?limit=5  -> Quick Mode
    // ?limit=20 -> Study Mode (Default)
    // ?limit=100 -> Real Mock
    const limitParam = parseInt(urlParams.get('limit'));
    if (!isNaN(limitParam) && limitParam > 0) {
        state.maxQuestions = limitParam;
    }
    if (elements.maxQ) elements.maxQ.textContent = state.maxQuestions;

    // Timer Logic: Only show for Real Mock (100 questions) - Users request
    const timerBadge = document.querySelector('.timer-badge');
    if (state.maxQuestions === 100 && timerBadge) {
        timerBadge.style.display = 'flex';
    } else if (timerBadge) {
        timerBadge.style.display = 'none';
    }

    // Setup Exit Buttons
    const handleExit = () => {
        const ctx = state.context || 'MEDICINA';
        window.location.href = `simulator-dashboard?context=${ctx}`;
    };

    const btnExit = document.getElementById('btn-exit-quiz');
    const btnTopExit = document.getElementById('btn-top-exit');

    if (btnExit) btnExit.onclick = handleExit;
    if (btnTopExit) btnTopExit.onclick = handleExit;

    try {
        // ✅ NUEVO: Intentar recuperar sesión previa
        const recovered = loadSession();
        if (recovered && recovered.questions && recovered.questions.length > 0) {
            console.log("♻️ Sesión recuperada de localStorage.");
            
            let resume = true;
            // Solo preguntamos si el examen no ha expirado
            if (recovered.timeLeft !== undefined && recovered.timeLeft <= 0) {
                resume = true; // Forzar reanudación para calificar automáticamente
            } else if (window.confirmationModal && typeof window.confirmationModal.show === 'function') {
                const configText = recovered.targetExam || 'examen';
                resume = await window.confirmationModal.show(
                    `Tienes un simulacro de ${configText} iniciado previamente. ¿Deseas continuar respondiéndolo o prefieres comenzar uno nuevo?`,
                    'Simulacro en progreso',
                    'Continuar anterior',
                    'Iniciar nuevo'
                );
            }
            
            if (resume === true) {
                Object.assign(state, recovered);
                renderQuestion();
                if (state.maxQuestions === 100) startMockTimer();
            } else if (resume === false) {
                console.log("🆕 Descartando sesión anterior por elección del usuario.");
                clearSession();
                state.quizId = Date.now().toString(36); // Generar ID único
                await startQuiz();
            } else {
                console.log("🚪 El usuario cerró el modal sin seleccionar. Retornando al dashboard...");
                handleExit();
                return;
            }
        } else {
            console.log("🆕 Iniciando sesión nueva (sin estado previo).");
            // Inicialización limpia
            state.quizId = Date.now().toString(36); // Generar ID único
            await startQuiz();
        }
    } catch (error) {
        console.error('Error iniciando quiz:', error);
        localStorage.removeItem(STORAGE_KEY); // Auto-Recuperación con la clave correcta
        alert('Se detectó un examen dañado en memoria. Hemos limpiado el caché de seguridad de tu navegador. Por favor, intenta iniciar el simulacro nuevamente y ya debería funcionar.');
        window.location.href = '/';
    }
    initLightbox();
}

/**
 * Persistencia Local (Resiliencia ante recargas)
 */
function saveSession() {
    if (new URLSearchParams(window.location.search).get('demo') === 'true') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...state,
        savedAt: Date.now(), // ✅ Expiración tracker
        quizId: state.quizId,
        timeLeft: state.timeLeft // ✅ Persistencia del cronómetro
    }));
}

function loadSession() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        const data = JSON.parse(stored);
        // Regla 1: Expiración por tiempo de examen extendido (24 horas = 86400000 ms para soportar Simulacros Reales y pausas)
        const ageInMs = Date.now() - (data.savedAt || 0);
        if (ageInMs > 86400000) {
            console.log("♻️ Sesión expirada por antigüedad (> 24hr).");
            clearSession();
            return null;
        }

        // Si es un Simulacro Real (100qs) y tiene tiempo restante guardado, descontar tiempo real transcurrido
        if (data.maxQuestions === 100 && data.timeLeft !== undefined && data.timeLeft !== null) {
            const elapsedSeconds = Math.floor(ageInMs / 1000);
            data.timeLeft = Math.max(0, data.timeLeft - elapsedSeconds);
            console.log(`⏱️ Persistencia del cronómetro: se descontaron ${elapsedSeconds}s de inactividad. Tiempo restante: ${data.timeLeft}s.`);
        }

        const urlParams = new URLSearchParams(window.location.search);

        // ✅ NUEVO: Si estamos en modo DEMO, nunca cargamos sesión previa (evita conflictos con sesiones de usuarios registrados)
        if (urlParams.get('demo') === 'true') {
            console.log("🆕 Modo Demo activo: Ignorando sesión guardada para inicio limpio.");
            return null;
        }

        // Regla 2: Límite de preguntas debe coincidir (Evita cargar 10qs cuando se pide 20qs)
        const limitParam = parseInt(urlParams.get('limit'));
        const expectedLimit = (!isNaN(limitParam) && limitParam > 0) ? limitParam : 20;
        if (data.maxQuestions && data.maxQuestions !== expectedLimit) {
            console.log("♻️ Sesión descartada por desajuste de modalidad (límite distinto).");
            clearSession();
            return null;
        }

        // Regla 3: Validar contexto (MEDICINA vs EDUCACION vs IDIOMAS)
        const currentContext = (state.context || 'MEDICINA').toUpperCase();
        const storedContext = (data.context || 'MEDICINA').toUpperCase();
        if (currentContext !== storedContext) {
            console.log("♻️ Sesión descartada por desajuste de contexto.");
            clearSession();
            return null;
        }

        // Regla 4: Validar target del examen (SERUMS, ENAM, NOMBRAMIENTO, etc.)
        const currentTarget = (state.targetExam || '').trim().toUpperCase();
        const storedTarget = (data.targetExam || '').trim().toUpperCase();
        if (currentTarget !== storedTarget) {
            console.log("♻️ Sesión descartada por desajuste de target del examen.");
            clearSession();
            return null;
        }

        // Regla 5: Validar carrera / modalidad (EBR - Inicial vs EBR - Primaria vs etc.)
        const currentCareer = (state.career || '').trim().toUpperCase();
        const storedCareer = (data.career || '').trim().toUpperCase();
        if (currentCareer !== storedCareer) {
            console.log("♻️ Sesión descartada por desajuste de carrera/modalidad.");
            clearSession();
            return null;
        }

        // Regla 6: Validar dificultad
        const currentDifficulty = (state.difficulty || '').trim().toUpperCase();
        const storedDifficulty = (data.difficulty || '').trim().toUpperCase();
        if (currentDifficulty !== storedDifficulty) {
            console.log("♻️ Sesión descartada por desajuste de dificultad.");
            clearSession();
            return null;
        }

        // Regla 7: Validar que el mazo/tema/áreas sea el mismo
        const currentAreas = (state.areas || []).sort().join(',').toUpperCase();
        const storedAreas = (data.areas || []).sort().join(',').toUpperCase();

        if (currentAreas === storedAreas && data.questions.length > 0) {
            return data;
        } else {
            console.log("♻️ Sesión descartada por desajuste de áreas de estudio.");
            clearSession();
            return null;
        }
    } catch (error) { console.warn("Fallo cargando sesión previa", error); }
    return null;
}

function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
}

// Exponer función para iniciar nuevo examen limpiando caché sin race conditions
window.startNewExam = function () {
    console.log("🆕 Iniciando nuevo examen (limpiando sesión activa).");
    clearSession();
    location.reload();
};



// 2. Iniciar Quiz (Llamada al Backend)
async function startQuiz() {
    // Mostrar Loading Dinámico y Tips
    const ctxKey = state.context === 'IDIOMAS' ? 'IDIOMAS' : ((['ASCENSO', 'NOMBRAMIENTO', 'ACCESO_CARGOS'].includes(state.targetExam) || state.context === 'EDUCACION') ? 'EDUCACION' : 'MEDICINA');
    const resources = LOADING_RESOURCES[ctxKey];

    if (elements.loadingTitle) elements.loadingTitle.innerText = resources.title;
    if (elements.loadingSubtitle) elements.loadingSubtitle.innerText = resources.subtitle;
    
    // Iniciar rotador de tips
    const tipElement = document.getElementById('loadingTip');
    if (tipElement) {
        let tipIdx = 0;
        tipElement.innerText = resources.tips[0];
        tipElement.style.opacity = '1';
        
        const tipInterval = setInterval(() => {
            if (elements.loadingOverlay.classList.contains('hidden')) {
                clearInterval(tipInterval);
                return;
            }
            tipElement.style.opacity = '0';
            setTimeout(() => {
                tipIdx = (tipIdx + 1) % resources.tips.length;
                tipElement.innerText = resources.tips[tipIdx];
                tipElement.style.opacity = '1';
            }, 500);
        }, 3500);
    }

    elements.loadingOverlay.classList.remove('hidden');

    let data;
    let response; // ✅ Declare here for function-wide scope
    const urlParams = new URLSearchParams(window.location.search);
    const isDemo = urlParams.get('demo') === 'true';

    let fetchUrl = `${API_URL}/start`;
    let fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            topic: state.topic,
            target: state.targetExam,
            areas: state.areas,
            career: state.career,
            difficulty: state.difficulty,
            limit: Math.min(5, state.maxQuestions),
            mode: state.mode,
            configType: state.configType
        })
    };

    if (isDemo) {
        // --- 📊 DEMO ANTI-REPETITION & LIMITS ---
        // 🔄 REINICIO DIARIO: Si es un nuevo día, reseteamos el contador de sesiones demo
        const today = new Date().toDateString();
        const lastDemoDate = localStorage.getItem('demo_sessions_date');
        let sessionsSent = parseInt(localStorage.getItem('demo_sessions_count') || '0');

        if (lastDemoDate !== today) {
            sessionsSent = 0;
            localStorage.setItem('demo_sessions_count', '0');
            localStorage.setItem('demo_sessions_date', today);
        }

        // Mantener el límite de 3 sesiones diarias para no registrados
        if (sessionsSent >= 3) {
            elements.loadingOverlay.classList.add('hidden');
            if (window.uiManager && typeof window.uiManager.showAuthPromptModal === 'function') {
                window.uiManager.showAuthPromptModal();
            } else {
                window.location.href = '/register';
            }
            return;
        }

        // FETCH REAL QUESTIONS FROM DB DEMO ENDPOINT
        // Mapear el contexto del frontend al dominio del backend
        const contextMap = {
            'MEDICINA': 'medicine',
            'EDUCACION': 'education',
            'IDIOMAS': 'languages'
        };
        const domainParam = contextMap[state.context || 'MEDICINA'] || 'medicine';
        const seenIds = JSON.parse(localStorage.getItem(`guest_seen_ids_${domainParam}`) || '[]');
        fetchUrl = `${API_URL}/demo?domain=${domainParam}&limit=${state.maxQuestions}&excludeIds=${seenIds.join(',')}`;
        if (state.targetExam) fetchUrl += `&target=${encodeURIComponent(state.targetExam)}`;
        if (state.career) fetchUrl += `&career=${encodeURIComponent(state.career)}`;
        if (state.difficulty) fetchUrl += `&difficulty=${encodeURIComponent(state.difficulty)}`;
        if (state.areas && state.areas.length > 0) fetchUrl += `&areas=${encodeURIComponent(state.areas.join(','))}`;

        try {
            console.log(`📡 Iniciando Demo Engine para dominio: ${domainParam}`);
            response = await window.NetworkService.fetch(fetchUrl);
            data = await response.json();

            if (!data.success || !data.questions || data.questions.length === 0) {
                // Si el banco se agota para el invitado, limpiamos su historial local para que pueda repetir
                localStorage.removeItem(`guest_seen_ids_${domainParam}`);
                throw new Error("No hay preguntas disponibles para la demo.");
            }

            // Increment session count
            localStorage.setItem('demo_sessions_count', (sessionsSent + 1).toString());

            // Guardar IDs vistos para evitar repetición en la siguiente sesión
            const newSeenIds = [...new Set([...seenIds, ...data.questions.map(q => q.id)])];
            localStorage.setItem(`guest_seen_ids_${domainParam}`, JSON.stringify(newSeenIds));

            // 🎲 Shuffle Options (Frontend Fisher-Yates) for better UX
            data.questions = data.questions.map(q => {
                if (!q.options || !Array.isArray(q.options)) return q;
                
                const correctAnswerText = q.options[q.correct_option_index];
                const shuffledOptions = [...q.options];
                for (let i = shuffledOptions.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
                }
                return {
                    ...q,
                    options: shuffledOptions,
                    correct_option_index: shuffledOptions.indexOf(correctAnswerText)
                };
            });

            // Ajustar el tema para la UI
            const target = domainParam === 'education' ? 'ASCENSO' : (domainParam === 'languages' ? 'MCER' : 'SERUMS');
            data.topic = `DEMO: ${target}`;

        } catch (demoErr) {
            console.error("💥 Error en Demo Engine:", demoErr);
            elements.loadingOverlay.classList.add('hidden');

            // Error amigable para el usuario
            const msg = demoErr.message === "No hay preguntas disponibles para la demo."
                ? "Lo sentimos, no hay preguntas disponibles para esta demo en este momento."
                : "No se pudieron cargar las preguntas de demostración. Por favor, intenta de nuevo más tarde.";

            alert(msg);

            // 🛑 CRITICAL: Lanzamos un error controlado para que initQuiz lo maneje si es necesario, 
            // pero el alert ya dio feedback.
            return;
        }
    } else {
        response = await window.NetworkService.fetch(fetchUrl, {
            method: 'POST',
            body: fetchOptions.body
        });
        data = await response.json();

        // 🚦 Manejo del Error 403 (Banco Agotado o Paywall)
        if (response.status === 403) {
            elements.loadingOverlay.classList.add('hidden');
            if (window.uiManager && typeof window.uiManager.showPaywallModal === 'function') {
                window.uiManager.showPaywallModal(data.error, 'simulator');
            } else {
                alert(data.error || "Límite alcanzado.");
                window.location.href = '/pricing';
            }
            return;
        }

        // 🛠 Error de Servidor (500) u Otros
        if (!response.ok && response.status !== 404) {
            elements.loadingOverlay.classList.add('hidden');
            console.error("Server Error:", data.error);
            alert("Hubo un error interno en el servidor. Por favor, intenta de nuevo o contacta a soporte técnico.");
            return;
        }

        // Sincronización de sesión y vidas gestionada centralizadamente por NetworkService.fetch
    }

    if (!data.success) {
        elements.loadingOverlay.classList.add('hidden');

        // 🚦 Error 404: Banco Agotado Real (Ya se intentó IA y falló)
        if (response && response.status === 404 && data.noQuestions) {
            if (window.uiManager && typeof window.uiManager.showPaywallModal === 'function') {
                window.uiManager.showPaywallModal('Has abarcado todas las preguntas oficiales y de IA disponibles para este tema.', 'simulator');
            } else {
                alert('¡Banco Agotado!\n\nHas completado todas las preguntas de este tema. Intenta cambiar de área o dificultad.');
                window.location.href = `simulator-dashboard?context=${state.context || 'MEDICINA'}`;
            }
            return;
        }

        // 🛠 Error Técnico de IA (500 con flag)
        if (data.technicalError) {
            alert(data.error || "Hubo un problema técnico al generar preguntas. Por favor, intenta de nuevo.");
            return;
        }

        // 🛡️ Error 403: Límite de Suscripción (Vidas / Cuota Diaria)
        if (response && response.status === 403) {
            if (window.uiManager && typeof window.uiManager.showPaywallModal === 'function') {
                window.uiManager.showPaywallModal(data.error, 'simulator');
            } else {
                alert(data.error || "Límite alcanzado.");
                window.location.href = '/pricing';
            }
            return;
        }

        // Fallback genérico para otros errores
        alert(data.error || 'Hubo un error cargando el simulacro.');
        return;
    }

    state.questions = data.questions;
    // 💡 ACTUALIZACIÓN DE TEMA: Si el backend rotó el tema (ej: Medicina -> Cardiología), actualizamos el estado.
    if (data.topic) {
        state.topic = data.topic;
        console.log(`Topic actualizado por Backend: ${state.topic}`);
    }
    // 🔄 SINCRONIZACIÓN DE ÁREAS: Asegurar que el frontend mantenga el filtro multi-área (ej: Fallback SERUMS)
    if (data.areas && data.areas.length > 0) {
        state.areas = data.areas;
        console.log(`Áreas sincronizadas por Backend: ${state.areas.join(', ')}`);
    }
    state.startTime = Date.now();

    // Ocultar Loading y mostrar primera pregunta
    elements.loadingOverlay.classList.add('hidden');
    saveSession(); // Guardar estado inicial
    renderQuestion();

    // Iniciar temporizador maestro si es Simulacro Real
    if (state.maxQuestions === 100) {
        startMockTimer();
    }
}

// 2.5 Fetch Next Batch (Background)
async function fetchNextBatch() {
    if (state.isLoadingBatch) return;

    // NO BATCHING IN DEMO MODE (Static Content)
    const urlParamsNext = new URLSearchParams(window.location.search);
    if (urlParamsNext.get('demo') === 'true') return;

    state.isLoadingBatch = true;
    state.batchLoadFailed = false; // Reset status
    console.log("🔄 Fetching next batch...");

    try {
        const seenIds = state.questions
            .map(q => q.id)
            .filter(id => id && typeof id === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id));

        const response = await window.NetworkService.fetch(`${API_URL}/next-batch`, {
            method: 'POST',
            body: JSON.stringify({
                topic: state.topic, // Legacy compatibility
                target: state.targetExam,
                areas: state.areas,
                career: state.career,
                difficulty: state.difficulty,
                seenIds: seenIds,
                mode: state.mode,
                configType: state.configType
            })
        });

        const data = await response.json();

        // 🚦 Manejo del Error 500/404 Controlado (Límite Básico u otros)
        if (!response.ok || !data.success) {
            elements.loadingOverlay.classList.add('hidden');

            if (response.status === 404 && data.noQuestions) {
                alert('¡Excelente Trabajo! Has terminado con todas las preguntas disponibles para esta configuración. Puntuando lo que respondiste...');
                return finishQuiz();
            }

            if (window.uiManager && window.uiManager.showToast) {
                window.uiManager.showToast(data.error || "No hay más preguntas disponibles en este momento.", "info");
            }
            state.maxQuestions = state.questions.length; // Ajustar total al mazo real disponible
            updateProgressUI();
            return;
        }

        // 🚦 Manejo del Error 403 (Banco Agotado o Paywall)
        if (response.status === 403) {
            elements.loadingOverlay.classList.add('hidden');
            if (window.uiManager && typeof window.uiManager.showPaywallModal === 'function') {
                window.uiManager.showPaywallModal(data.error, 'simulator');
            } else {
                alert(data.error || "Límite alcanzado.");
                finishQuiz();
            }
            return;
        }

        // 🛠 Error de Servidor (500) u Otros (No 404)
        if (!response.ok && response.status !== 404) {
            elements.loadingOverlay.classList.add('hidden');
            console.error("Server Error:", data.error);
            alert("Error cargando más preguntas. Reintentando...");
            return;
        }

        if (data.success && data.questions.length > 0) {
            state.questions.push(...data.questions);
            console.log(`✅ Batch loaded. Total questions: ${state.questions.length}`);

            // 🔄 Refrescar áreas por si el backend rotó algo (opcional pero robusto)
            if (data.areas && data.areas.length > 0) {
                state.areas = data.areas;
            }

            updateProgressUI(); // Update progress bar with new total? Or keep relative to 20?
        }
    } catch (error) {
        console.error("Error fetching batch:", error);
        state.batchLoadFailed = true; // Marcar fallo de carga
        if (window.uiManager && window.uiManager.showToast) {
            window.uiManager.showToast("Error de conexión al cargar más preguntas.", "error");
        }
    } finally {
        state.isLoadingBatch = false;
        // 🛠️ FIX SENIOR: Eliminar cargador y disparar renderizado de la pregunta que estaba esperando
        const manualOverlay = document.getElementById('loading-overlay');
        if (manualOverlay) manualOverlay.remove();
        if (elements.loadingOverlay) elements.loadingOverlay.classList.add('hidden');

        // Si estábamos esperando el lote para mostrar la siguiente pregunta, renderizarla ahora
        if (state.questions[state.currentQuestionIndex]) {
            renderQuestion();
        } else if (state.batchLoadFailed) {
            // Si falló y no hay más preguntas cargadas, mostrar interfaz de reintento
            showNetworkRetryOverlay();
        }
    }
}

// 3. Renderizar Pregunta
function renderQuestion() {
    cancelCurrentScroll();
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (window.currentQuizAudio) {
        try {
            window.currentQuizAudio.pause();
        } catch (e) {}
        window.currentQuizAudio = null;
    }

    // Check if we are done
    if (state.currentQuestionIndex >= state.maxQuestions) {
        return finishQuiz();
    }

    // 🛠️ Función Helper para eliminar overlays de carga (Global y Manual)
    function hideLoadingOverlay() {
        const manualOverlay = document.getElementById('loading-overlay');
        if (manualOverlay) manualOverlay.remove();
        if (elements.loadingOverlay) {
            elements.loadingOverlay.classList.add('hidden');
            elements.loadingOverlay.classList.remove('flex');
        }
    }

    const q = state.questions[state.currentQuestionIndex];

    // If we ran out of questions but haven't hit maxQuestions yet (wait for batch?)
    if (!q) {
        if (state.isLoadingBatch) {
            hideLoadingOverlay();

            // Crear overlay glassmorphism premium siguiendo el DESIGN_SYSTEM (Negro Puro)
            const overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            Object.assign(overlay.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.85)', // NEGRO PURO
                backdropFilter: 'blur(20px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: '10000',
                color: 'white',
                textAlign: 'center',
                transition: 'opacity 0.4s ease'
            });

            const ctxKey = state.context === 'IDIOMAS' ? 'IDIOMAS' : ((['ASCENSO', 'NOMBRAMIENTO', 'ACCESO_CARGOS'].includes(state.targetExam) || state.context === 'EDUCACION') ? 'EDUCACION' : 'MEDICINA');
            const resources = LOADING_RESOURCES[ctxKey];
            const randomTip = resources.tips[Math.floor(Math.random() * resources.tips.length)];

            overlay.innerHTML = `
                <div class="loader-content" style="padding: 3.5rem; border-radius: 2.5rem; background: rgba(0, 0, 0, 0.6); border: 1px solid rgba(255, 255, 255, 0.05); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 1);">
                    <div class="spinner-box" style="position: relative; width: 70px; height: 70px; margin: 0 auto 2.5rem;">
                        <div style="position: absolute; width: 100%; height: 100%; border: 3px solid rgba(255,255,255,0.05); border-radius: 50%;"></div>
                        <div style="position: absolute; width: 100%; height: 100%; border: 3px solid transparent; border-top: 3px solid #fff; border-radius: 50%; animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;"></div>
                    </div>
                    <h3 style="margin-bottom: 0.5rem; font-size: 1.75rem; font-weight: 800; color: #fff; letter-spacing: -0.03em;">${resources.title}</h3>
                    <p style="color: #64748b; font-size: 1rem; margin-bottom: 2rem;">${resources.subtitle}</p>
                    
                    <div style="background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 1.25rem; border: 1px dashed rgba(255,255,255,0.1); max-width: 320px;">
                        <p style="color: #3b82f6; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem; letter-spacing: 0.05em;">¿Sabías que?</p>
                        <p id="dynamic-tip" style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.5;">${randomTip}</p>
                    </div>
                </div>
                <style>
                    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                </style>
            `;
            document.body.appendChild(overlay);
            return; // Detenemos el renderizado de la pregunta hasta que cargue
        } else if (state.batchLoadFailed) {
            hideLoadingOverlay();
            showNetworkRetryOverlay();
            return;
        } else {
            // No more questions available, but we haven't hit maxQuestions.
            // Adjust maxQuestions to current length to show accurate results
            console.warn("⚠️ Banco agotado prematuramente. Finalizando con", state.questions.length, "preguntas.");
            state.maxQuestions = state.questions.length;
            return finishQuiz();
        }
    }
    elements.loadingOverlay.classList.add('hidden');

    // Trigger Batch Load if we are close to end of current array using local threshold
    // E.g., if we have 5 qs, and we are at index 3, load more.
    if (state.questions.length < state.maxQuestions &&
        state.questions.length - state.currentQuestionIndex <= 2) {
        fetchNextBatch();
    }

    // Actualizar UI Header
    if (elements.currentQ) elements.currentQ.textContent = state.currentQuestionIndex + 1;
    updateProgressUI();

    // Imagen (si existe)
    const imgContainer = document.getElementById('questionImageContainer');
    const imgElement = document.getElementById('questionImage');
    const layout = document.getElementById('questionLayout');

    if (q.image_url) {
        imgElement.src = window.resolveImageUrl(q.image_url);
        imgContainer.classList.remove('hidden');
        if (layout) layout.classList.add('has-image');
    } else {
        imgContainer.classList.add('hidden');
        imgElement.src = '';
        if (layout) layout.classList.remove('has-image');
    }

    // Texto Pregunta
    elements.questionText.innerHTML = window.MarkdownRenderer ? window.MarkdownRenderer.render(q.question_text || '') : (q.question_text || '');

    // Inject premium audio player if audio_text is present (for Listening Comprehension)
    if (q.audio_text) {
        const audioWrapper = document.createElement('div');
        audioWrapper.className = 'quiz-audio-player-wrapper';
        audioWrapper.style.cssText = 'margin-bottom: 1.5rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); padding: 1rem; border-radius: 1rem; display: flex; align-items: center; gap: 1rem;';
        
        const playBtn = document.createElement('button');
        playBtn.className = 'quiz-audio-btn btn-message-tts';
        playBtn.style.cssText = 'width: 45px; height: 45px; border-radius: 50%; border: none; background: #6366f1; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;';
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        
        playBtn.onclick = () => {
            window.playQuestionAudio(playBtn, q.audio_text, state.career || 'en-US');
        };

        const infoDiv = document.createElement('div');
        infoDiv.style.flex = '1';
        infoDiv.innerHTML = `
            <div style="font-size: 0.85rem; font-weight: 700; color: #cbd5e1; margin-bottom: 0.25rem;">Comprensión Auditiva</div>
            <div style="font-size: 0.75rem; color: #64748b;">Escucha el audio para responder la pregunta</div>
        `;
        
        audioWrapper.appendChild(playBtn);
        audioWrapper.appendChild(infoDiv);
        elements.questionText.prepend(audioWrapper);
    }

    // Reset UI
    elements.optionsGrid.innerHTML = '';
    elements.feedbackBox.style.display = 'none';
    elements.feedbackBox.classList.remove('error');
    if (elements.nextBtnContainer) {
        elements.nextBtnContainer.classList.add('hidden');
    }
    const tutorBtn = document.getElementById('btn-open-quiz-tutor');
    if (tutorBtn) {
        tutorBtn.style.display = 'none';
    }

    // Render Opciones
    if (!q.options || !Array.isArray(q.options)) {
        throw new Error("Pregunta recibida sin opciones válidas (Corrupción de datos). Abortando renderizado.");
    }

    const letters = ['A', 'B', 'C', 'D', 'E'];
    q.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';

        const letterSpan = document.createElement('span');
        letterSpan.className = 'option-letter';
        letterSpan.textContent = letters[index] || '';

        const textSpan = document.createElement('span');
        textSpan.className = 'option-text';
        // También procesar Markdown en opciones por si acaso (aunque menos común)
        if (window.MarkdownRenderer) {
            textSpan.innerHTML = window.MarkdownRenderer.render(String(opt || '')).replace(/^<p>|<\/p>$/g, '');
        } else if (window.marked && window.marked.parse) {
            textSpan.innerHTML = window.marked.parse(String(opt || '')).replace(/^<p>|<\/p>$/g, '');
        } else {
            textSpan.textContent = opt;
        }

        btn.appendChild(letterSpan);
        btn.appendChild(textSpan);

        btn.onclick = () => handleAnswer(index, btn);
        elements.optionsGrid.appendChild(btn);
    });
}

function updateProgressUI() {
    // Update Progress
    const current = state.currentQuestionIndex + 1;
    const total = state.maxQuestions; // 🎯 Denominador Fijo: Refleja el objetivo del simulacro

    if (elements.currentQ) elements.currentQ.textContent = current;
    if (elements.maxQ) elements.maxQ.textContent = total;
    if (elements.progressBar) {
        elements.progressBar.style.width = `${(current / total) * 100}%`;
    }
}

// 4. Manejar Respuesta
function handleAnswer(selectedIndex, btnElement) {
    const q = state.questions[state.currentQuestionIndex];

    // Deshabilitar todos los botones
    const allBtns = elements.optionsGrid.querySelectorAll('button');
    allBtns.forEach(b => b.disabled = true);

    const isCorrect = selectedIndex === q.correct_option_index;

    // Guardar respuesta silenciosamente
    state.answers.push({
        questionId: state.currentQuestionIndex,
        userAnswer: selectedIndex,
        isCorrect: isCorrect
    });

    saveSession(); // ✅ PERSISTENCIA INMEDIATA

    // --- Retroalimentación Visual ---
    if (state.maxQuestions === 100) {
        // MODO SIMULACRO REAL (100q): Selección neutra blanca, sin feedback de acierto/error inmediato.
        btnElement.classList.add('neutral-selected');
        if (isCorrect) {
            state.score++;
        }
    } else {
        // MODO ESTUDIO (20q) o RÁPIDO (10q): Feedback inmediato rojo/azul
        if (isCorrect) {
            btnElement.classList.add('correct');
            state.score++;
        } else {
            btnElement.classList.add('wrong');
            const correctIdx = q.correct_option_index !== undefined ? q.correct_option_index : q.correct_index;
            if (correctIdx !== undefined && allBtns[correctIdx]) {
                allBtns[correctIdx].classList.add('correct');
            }
        }
    }

    // Configurar acción del botón Siguiente
    elements.nextBtn.onclick = () => {
        cancelCurrentScroll();
        if (window.quizTutor) window.quizTutor.toggle(false);
        state.currentQuestionIndex++;
        if (state.currentQuestionIndex >= state.maxQuestions) {
            finishQuiz();
        } else {
            renderQuestion();
        }
    };

    // 🚀 BIFURCACIÓN DE COMPORTAMIENTO PARA FEEDBACK / SIGUIENTE
    if (state.maxQuestions === 20) {
        // MODO ESTUDIO (20q): Mostrar explicación y el botón siguiente
        elements.explanationText.innerHTML = window.MarkdownRenderer ? window.MarkdownRenderer.render(q.explanation || "Respuesta correcta según normas técnicas y guías oficiales.") : (q.explanation || "Respuesta correcta según normas técnicas y guías oficiales.");

        if (q.explanation_image_url) {
            elements.explanationImage.src = window.resolveImageUrl(q.explanation_image_url);
            elements.explanationImageContainer.classList.remove('hidden');
        } else {
            elements.explanationImageContainer.classList.add('hidden');
            elements.explanationImage.src = '';
        }

        elements.feedbackBox.style.display = 'block';
        if (!isCorrect) {
            elements.feedbackBox.classList.add('error');
        } else {
            elements.feedbackBox.classList.remove('error');
        }

        if (elements.nextBtnContainer) {
            elements.nextBtnContainer.classList.remove('hidden');
        }
    } else {
        // MODO RÁPIDO (10q) o SIMULACRO REAL (100q): Ocultamos explicación/feedback box, mostramos solo botón siguiente
        elements.feedbackBox.style.display = 'none';
        if (elements.nextBtnContainer) {
            elements.nextBtnContainer.classList.remove('hidden');
        }
    }

    // Configurar y mostrar botón de Tutor IA (No permitido en vivo durante examen real de 100q)
    const tutorBtn = document.getElementById('btn-open-quiz-tutor');
    if (tutorBtn) {
        if (state.maxQuestions === 100) {
            tutorBtn.style.display = 'none';
        } else {
            tutorBtn.style.display = 'flex';
            tutorBtn.onclick = () => {
                const isGuest = new URLSearchParams(window.location.search).get('demo') === 'true' || !localStorage.getItem('token');
                if (isGuest) {
                    if (window.uiManager && typeof window.uiManager.showAuthPromptModal === 'function') {
                        window.uiManager.showAuthPromptModal();
                        return;
                    }
                }

                const currentQ = state.questions[state.currentQuestionIndex];
                const currentAns = state.answers[state.currentQuestionIndex];
                const qContext = {
                    id: currentQ.id || `q-${state.currentQuestionIndex}`,
                    questionText: currentQ.question_text,
                    options: currentQ.options,
                    correctOptionIndex: currentQ.correct_option_index,
                    correctOptionText: currentQ.options[currentQ.correct_option_index] || '',
                    userOptionIndex: currentAns ? currentAns.userAnswer : null,
                    userOptionText: currentAns ? currentQ.options[currentAns.userAnswer] : '',
                    isUserCorrect: currentAns ? currentAns.isCorrect : false,
                    explanation: currentQ.explanation || '',
                    topic: currentQ.topic || state.topic || 'General',
                    target: currentQ.target || state.targetExam || ''
                };
                window.quizTutor.toggle(true, qContext);
            };
        }
    }

    // 📜 Desplazamiento suave y ligero de pantalla hacia el botón Siguiente
    setTimeout(() => {
        const nextContainer = elements.nextBtnContainer || document.getElementById('nextBtnContainer');
        if (nextContainer) {
            smoothScrollTo(nextContainer, 2200); // 2200ms de scroll muy suave, gradual e imperceptible (easeInOutQuad)
        }
    }, 500); // 500ms de espera para permitir digerir el feedback visual (colores de las opciones)
}

// 5. Temporizador Real Mock (Maestro)
let timerInterval;
function startMockTimer() {
    // 🔄 RECURSO DE PERSISTENCIA: Si hay tiempo guardado en el estado, lo usamos.
    // De lo contrario, iniciamos en 2 horas (7200s).
    let timeLeft = (state.timeLeft !== undefined && state.timeLeft !== null) ? state.timeLeft : 7200;

    // Función para formatear MM:SS
    const updateDisplay = () => {
        const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const s = (timeLeft % 60).toString().padStart(2, '0');
        if (elements.timer) elements.timer.textContent = `${m}:${s}`;
    };

    updateDisplay(); // Mostrar inicial

    // Si el tiempo ya expiró al iniciar o recuperar, entregamos automáticamente de inmediato
    if (timeLeft <= 0) {
        clearInterval(timerInterval);
        alert("⏰ ¡El tiempo límite de este simulacro ha expirado! Procederemos a calificar tus respuestas guardadas.");
        finishQuiz();
        return;
    }

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        state.timeLeft = timeLeft; // Sincronizar con el estado global

        // Auto-save periódico (cada 10 segundos para no saturar storage, o en cada cambio si prefieres)
        if (timeLeft % 10 === 0) saveSession();

        updateDisplay();

        // Alerta visual de los últimos 5 minutos
        if (timeLeft === 300) {
            elements.timer.parentElement.style.background = 'rgba(239, 68, 68, 0.4)'; // Rojo más intenso
            elements.timer.parentElement.style.animation = 'pulse-ring 2s infinite';
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("⏰ ¡Se acabó el tiempo! Entregando tu simulacro automáticamente...");
            finishQuiz();
        }
    }, 1000);
}

// 6. Finalizar Quiz
// ✅ Helper para encolar envíos fallidos de resultados de simulacros
function savePendingSubmission(quizId, payload) {
    try {
        const pending = JSON.parse(localStorage.getItem('simulator_pending_submissions') || '[]');
        if (!pending.some(p => p.quizId === quizId)) {
            pending.push({ quizId, payload, savedAt: Date.now(), context: state.context });
            localStorage.setItem('simulator_pending_submissions', JSON.stringify(pending));
            console.log(`💾 [Queue] Simulacro ${quizId} guardado localmente en pendientes.`);
        }
    } catch (e) {
        console.warn("Fallo guardando envío pendiente:", e);
    }
}

function removePendingSubmission(quizId) {
    try {
        const pending = JSON.parse(localStorage.getItem('simulator_pending_submissions') || '[]');
        const filtered = pending.filter(p => p.quizId !== quizId);
        localStorage.setItem('simulator_pending_submissions', JSON.stringify(filtered));
    } catch (e) {}
}

// ✅ Interfaz de Reintento ante caídas de conexión durante la carga de lotes
function showNetworkRetryOverlay() {
    const existing = document.getElementById('loading-overlay') || document.getElementById('network-retry-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'network-retry-overlay';
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '10000',
        color: 'white',
        textAlign: 'center'
    });

    overlay.innerHTML = `
        <div class="loader-content" style="padding: 3.5rem; border-radius: 2.5rem; background: rgba(0, 0, 0, 0.6); border: 1px solid rgba(255, 255, 255, 0.05); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 1); max-width: 400px; width: 90%;">
            <div style="font-size: 3rem; margin-bottom: 1.5rem; color: #f59e0b;">
                <i class="fas fa-wifi"></i>
            </div>
            <h3 style="margin-bottom: 0.5rem; font-size: 1.5rem; font-weight: 800; color: #fff;">Error de Conexión</h3>
            <p style="color: #94a3b8; font-size: 0.95rem; margin-bottom: 2rem; line-height: 1.5;">No pudimos cargar la siguiente ronda de preguntas. Revisa tu señal de internet.</p>
            <button id="btn-retry-batch" style="background: #3b82f6; border: none; padding: 0.75rem 2rem; border-radius: 12px; color: white; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-sync"></i> Reintentar Carga
            </button>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('btn-retry-batch').onclick = () => {
        overlay.remove();
        fetchNextBatch();
    };
}

async function finishQuiz() {
    clearInterval(timerInterval);

    // Calcular Score Visual
    const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true';
    const denominator = state.maxQuestions; // 🎯 Siempre sobre el total configurado (10, 20, 100)
    elements.finalScore.textContent = `${state.score}/${denominator}`;

    // Calcular porcentaje para el círculo (SVG dashoffset)
    const actualTotal = denominator || 1;
    const pct = (state.score / actualTotal) * 100;

    // Circunferencia = 2 * PI * r(45) = 282.74
    const circumference = 283;
    const dashoffset = circumference - (pct / 100) * circumference;

    if (elements.svgScoreProgress) {
        // Trigger fluid animation slightly after modal opens
        setTimeout(() => {
            elements.svgScoreProgress.style.strokeDashoffset = dashoffset;
        }, 200);
    }

    elements.resultsOverlay.classList.add('active');

    // 📊 LOCAL STATS SAVING (Guest Demo Persistence)
    const urlParamsFinish = new URLSearchParams(window.location.search);
    if (urlParamsFinish.get('demo') === 'true') {
        const correct = state.answers.filter(a => a.isCorrect).length;
        const total = state.answers.length; // Use answered questions
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

        // Calculate Area Stats for Radar Chart
        const areaStats = {};
        state.answers.forEach((ans, idx) => {
            const q = state.questions[idx];
            const topic = q.topic || 'Otros';
            if (!areaStats[topic]) areaStats[topic] = { correct: 0, total: 0 };
            areaStats[topic].total++;
            if (ans.isCorrect) areaStats[topic].correct++;
        });

        const currentStats = {
            lastRun: new Date().toISOString(),
            correct: correct,
            incorrect: total - correct,
            accuracy: accuracy,
            avgScore: total > 0 ? (correct * 20 / total).toFixed(1) : '0',
            areaStats: areaStats // { Topic: {correct, total} }
        };

        const domainKey = (state.context || 'MEDICINA').toLowerCase();
        localStorage.setItem(`guest_demo_stats_${domainKey}`, JSON.stringify(currentStats));
        console.log(`💾 Estadísticas demo (${domainKey}) guardadas localmente.`);

        // No return early here, let it show the results overlay
    }

    // Enviar Resultados al Backend (SALTAR EN DEMO)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('demo') === 'true') {
        console.log("🏁 Demo finalizada. Resultados no guardados en base de datos.");
        return;
    }

    const payload = {
        topic: state.areas && state.areas.length > 1 ? 'Multi-Área' : state.topic,
        areas: state.areas,
        target: state.targetExam,
        career: state.career,
        difficulty: state.difficulty,
        score: state.score,
        total_questions: state.currentQuestionIndex,
        questions: state.questions.slice(0, state.currentQuestionIndex).map((q, idx) => ({
            ...q,
            userAnswer: state.answers[idx]?.userAnswer || 0,
            topic: q.topic || state.topic
        }))
    };

    try {
        await window.NetworkService.fetch(`${API_URL}/submit`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        console.log("✅ Resultados guardados y Flashcards generadas.");

        // Sincronización de sesión y vidas gestionada centralizadamente por NetworkService.fetch

        clearSession(); // ✅ LIMPIAR SOLO SI TUVO ÉXITO
        removePendingSubmission(state.quizId);
    } catch (error) {
        console.error("Error guardando resultados", error);
        
        savePendingSubmission(state.quizId, payload);
        clearSession(); // Limpiar la sesión activa para permitir iniciar nuevos simulacros

        // Si falla definitivamente después de los reintentos de safeFetch
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Error de Conexión',
                text: 'No pudimos sincronizar tus resultados con el servidor debido a un fallo de red. No te preocupes, han sido guardados localmente y se subirán automáticamente en cuanto recuperes conexión.',
                icon: 'warning',
                background: 'rgba(20,20,20,0.95)'
            });
        }
    }
}


// Auto-init
document.addEventListener('DOMContentLoaded', init);

// --- 🖼️ Visor Lightbox Premium (Zoom, Drag, Gestos) ---
function initLightbox() {
    const modal = document.getElementById('lightboxModal');
    const closeBtn = document.getElementById('lightboxClose');
    const zoomInBtn = document.getElementById('lightboxZoomIn');
    const zoomOutBtn = document.getElementById('lightboxZoomOut');
    const zoomResetBtn = document.getElementById('lightboxZoomReset');
    const viewport = document.getElementById('lightboxViewport');
    const image = document.getElementById('lightboxImage');

    if (!modal || !image) {
        console.warn("⚠️ Elementos del Lightbox no encontrados en el DOM. Reintentando en 500ms...");
        setTimeout(initLightbox, 500);
        return;
    }

    let zoomLevel = 1;
    let isDragging = false;
    let startX = 0, startY = 0;
    let translateX = 0, translateY = 0;
    
    // Para pinch to zoom
    let initialTouchDist = 0;
    let lastZoomLevel = 1;

    // Función de actualización de transformación
    function updateTransform() {
        // Limitar zoom entre 0.5 y 6
        zoomLevel = Math.min(6, Math.max(0.5, zoomLevel));
        
        // Limitar arrastre para que la imagen no desaparezca de la pantalla
        const maxTranslateX = window.innerWidth * zoomLevel;
        const maxTranslateY = window.innerHeight * zoomLevel;
        translateX = Math.min(maxTranslateX, Math.max(-maxTranslateX, translateX));
        translateY = Math.min(maxTranslateY, Math.max(-maxTranslateY, translateY));

        image.style.transform = `translate(${translateX}px, ${translateY}px) scale(${zoomLevel})`;
    }

    // Resetear posición y escala
    function resetZoom() {
        zoomLevel = 1;
        translateX = 0;
        translateY = 0;
        updateTransform();
    }

    // Abrir Lightbox con imagen específica
    window.openLightbox = function(src) {
        if (!src) return;
        image.src = src;
        modal.classList.add('active');
        resetZoom();
        document.body.style.overflow = 'hidden'; // Bloquear scroll de fondo
        if (window.uiManager && typeof window.uiManager.pushModalState === 'function') {
            window.uiManager.pushModalState('lightboxModal');
        }
    };

    // Cerrar Lightbox
    function closeLightbox(isFromPopState = false) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => {
            image.src = '';
        }, 300); // Esperar transición CSS
        
        if (!isFromPopState && window.uiManager && typeof window.uiManager.popModalState === 'function') {
            window.uiManager.popModalState('lightboxModal');
        }
    }

    // Exponer globalmente para la integración con UIManager
    window.closeLightbox = closeLightbox;

    // Eventos de botones
    closeBtn.onclick = () => closeLightbox(false);
    
    zoomInBtn.onclick = () => {
        zoomLevel += 0.25;
        updateTransform();
    };

    zoomOutBtn.onclick = () => {
        zoomLevel -= 0.25;
        updateTransform();
    };

    zoomResetBtn.onclick = resetZoom;

    // Cerrar al hacer click en el fondo vacío del viewport
    viewport.onclick = (e) => {
        if (e.target === viewport || e.target === modal) {
            closeLightbox(false);
        }
    };

    // --- Arrastre (Drag) con Ratón ---
    viewport.addEventListener('mousedown', (e) => {
        if (e.target !== image && e.target !== viewport) return;
        e.preventDefault();
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        viewport.classList.add('dragging');
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateTransform();
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            viewport.classList.remove('dragging');
        }
    });

    // --- Soporte Móvil (Touch Events) ---
    viewport.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            // Un dedo: Arrastre
            isDragging = true;
            startX = e.touches[0].clientX - translateX;
            startY = e.touches[0].clientY - translateY;
            viewport.classList.add('dragging');
        } else if (e.touches.length === 2) {
            // Dos dedos: Pellizcar para Zoom
            isDragging = false;
            initialTouchDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            lastZoomLevel = zoomLevel;
        }
    }, { passive: true });

    viewport.addEventListener('touchmove', (e) => {
        if (isDragging && e.touches.length === 1) {
            translateX = e.touches[0].clientX - startX;
            translateY = e.touches[0].clientY - startY;
            updateTransform();
        } else if (e.touches.length === 2 && initialTouchDist > 0) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const factor = dist / initialTouchDist;
            zoomLevel = lastZoomLevel * factor;
            updateTransform();
        }
    }, { passive: true });

    viewport.addEventListener('touchend', () => {
        isDragging = false;
        viewport.classList.remove('dragging');
        initialTouchDist = 0;
    });

    // Zoom con la rueda del ratón (Mouse Wheel)
    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 0.1 : -0.1;
        zoomLevel += factor;
        updateTransform();
    }, { passive: false });

    // Doble click para zoom inteligente toggle (1x <-> 2.5x)
    viewport.addEventListener('dblclick', (e) => {
        e.preventDefault();
        if (zoomLevel > 1) {
            resetZoom();
        } else {
            zoomLevel = 2.5;
            const rect = viewport.getBoundingClientRect();
            const clickX = e.clientX - rect.left - rect.width/2;
            const clickY = e.clientY - rect.top - rect.height/2;
            translateX = -clickX * 1.5;
            translateY = -clickY * 1.5;
            updateTransform();
        }
    });

    // Soporte Teclado: Escape para cerrar
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeLightbox(false);
        }
    });

    // Vincular clicks a los elementos de imagen interactivos existentes (metadata image_url)
    const bindImageClick = (elementId) => {
        const el = document.getElementById(elementId);
        if (el) {
            el.addEventListener('click', () => {
                if (el.src) window.openLightbox(el.src);
            });
        }
    };

    bindImageClick('questionImage');
    bindImageClick('explanationImage');

    // Delegación para imágenes inline en enunciados y explicaciones
    const qText = document.getElementById('questionText');
    if (qText) {
        qText.addEventListener('click', (e) => {
            if (e.target.tagName === 'IMG' && e.target.src) {
                window.openLightbox(e.target.src);
            }
        });
    }

    const expText = document.getElementById('explanationText');
    if (expText) {
        expText.addEventListener('click', (e) => {
            if (e.target.tagName === 'IMG' && e.target.src) {
                window.openLightbox(e.target.src);
            }
        });
    }

    // Delegación global en el feed de revisión
    const reviewFeed = document.getElementById('reviewFeed');
    if (reviewFeed) {
        reviewFeed.addEventListener('click', (e) => {
            // Si hacen click directo en cualquier elemento de imagen
            if (e.target.tagName === 'IMG' && e.target.src) {
                window.openLightbox(e.target.src);
                return;
            }
            
            // Fallback para clicks en el contenedor
            const container = e.target.closest('.review-q-image-container, .review-explanation-image-container');
            if (container) {
                const img = container.querySelector('img');
                if (img && img.src) {
                    window.openLightbox(img.src);
                }
            }
        });
    }
}

// Helper for custom smooth and gentle scrolling (easeInOutQuad)
function smoothScrollTo(element, duration = 2200) {
    if (!element) return;
    
    // Cancel any ongoing scroll animation first
    cancelCurrentScroll();

    const targetY = element.getBoundingClientRect().top + window.scrollY;
    const startY = window.scrollY;
    const distance = targetY - startY - 40; // offset by 40px for safety spacing
    let startTime = null;
    let userInterrupted = false;

    // Detect user interruption
    const interruptHandler = () => {
        userInterrupted = true;
        cancelCurrentScroll();
    };

    const cleanup = () => {
        window.removeEventListener('wheel', interruptHandler);
        window.removeEventListener('touchmove', interruptHandler);
        window.removeEventListener('touchstart', interruptHandler);
        window.removeEventListener('mousedown', interruptHandler);
        window.removeEventListener('pointerdown', interruptHandler);
        window.removeEventListener('keydown', interruptHandler);
        activeScrollCleanup = null;
    };

    window.addEventListener('wheel', interruptHandler, { passive: true });
    window.addEventListener('touchmove', interruptHandler, { passive: true });
    window.addEventListener('touchstart', interruptHandler, { passive: true });
    window.addEventListener('mousedown', interruptHandler, { passive: true });
    window.addEventListener('pointerdown', interruptHandler, { passive: true });
    window.addEventListener('keydown', interruptHandler, { passive: true });

    activeScrollCleanup = cleanup;

    function animation(currentTime) {
        if (userInterrupted) return; // Stop if user interrupted
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const run = easeInOutQuad(Math.min(timeElapsed, duration), startY, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) {
            if (typeof requestAnimationFrame === 'function') {
                currentScrollAnimationId = requestAnimationFrame(animation);
            }
        } else {
            cleanup();
            currentScrollAnimationId = null;
        }
    }

    function easeInOutQuad(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }

    if (typeof requestAnimationFrame === 'function') {
        currentScrollAnimationId = requestAnimationFrame(animation);
    } else {
        window.scrollTo(0, targetY - 40);
    }
}

console.log("💎 Module quiz.js loaded successfully. showExamReview is ready with Zoom Lightbox.");

window.openQuizTutorForReview = function (index) {
    const isGuest = new URLSearchParams(window.location.search).get('demo') === 'true' || !localStorage.getItem('token');
    if (isGuest) {
        if (window.uiManager && typeof window.uiManager.showAuthPromptModal === 'function') {
            window.uiManager.showAuthPromptModal();
            return;
        }
    }

    const q = state.questions[index];
    if (!q) return;
    const ans = state.answers[index];
    
    const questionContext = {
        id: q.id || `q-${index}`,
        questionText: q.question_text,
        options: q.options,
        correctOptionIndex: q.correct_option_index,
        correctOptionText: q.options[q.correct_option_index] || '',
        userOptionIndex: ans ? ans.userAnswer : null,
        userOptionText: ans ? q.options[ans.userAnswer] : '',
        isUserCorrect: ans ? ans.isCorrect : false,
        explanation: q.explanation || '',
        topic: q.topic || state.topic || 'General',
        target: q.target || state.targetExam || ''
    };
    
    if (window.quizTutor) {
        window.quizTutor.toggle(true, questionContext);
    }
};
