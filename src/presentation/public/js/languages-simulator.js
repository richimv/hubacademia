/**
 * languages-simulator.js
 * Componente de reproducción de exámenes in-page para el Módulo de Idiomas.
 * Recrea las mecánicas de quiz.js de forma totalmente integrada y desacoplada.
 */

const LanguagesSimulator = (function() {
    // Estado del Simulador
    const state = {
        quizId: '',
        context: 'IDIOMAS',
        topic: 'Multi-Área',
        targetExam: 'MCER',
        career: 'en-US',
        difficulty: 'B2',
        areas: [],
        questions: [],
        answers: [],
        currentQuestionIndex: 0,
        score: 0,
        maxQuestions: 10,
        startTime: null,
        timeSpentSeconds: 0,
        timeLeft: 0,
        timerInterval: null,
        isLoadingBatch: false,
        isDemo: false
    };

    // Referencias a Elementos DOM (inicializadas al iniciar el simulador)
    const elements = {};
    let currentAudio = null;

    // Tips de carga para Idiomas
    const LOADING_TIPS = [
        "Escuchar podcasts en el idioma objetivo ayuda a familiarizarse con la pronunciación real.",
        "Anotar expresiones idiomáticas completas es más útil que memorizar palabras sueltas.",
        "Intenta responder sin traducir literalmente en tu mente; piensa directamente en el idioma objetivo.",
        "La consistencia diaria de 10 minutos supera a las sesiones largas de estudio de fin de semana.",
        "¡No temas cometer errores! Son el único camino real hacia la fluidez conversacional."
    ];

    /**
     * Inicializa los selectores del DOM
     */
    function initSelectors() {
        elements.playerWrapper = document.getElementById('languages-quiz-player-wrapper');
        elements.dashboardSections = document.getElementById('sim-dashboard-sections');
        elements.navTabs = document.getElementById('languages-nav-tabs');
        
        elements.currentQ = document.getElementById('lang-currentQ');
        elements.maxQ = document.getElementById('lang-maxQ');
        elements.progressBar = document.getElementById('lang-progressBar');
        elements.timerBadge = document.getElementById('lang-timer-badge');
        elements.timer = document.getElementById('lang-timer');
        elements.questionLayout = document.getElementById('lang-questionLayout');
        elements.questionImageContainer = document.getElementById('lang-questionImageContainer');
        elements.questionImage = document.getElementById('lang-questionImage');
        elements.questionText = document.getElementById('lang-questionText');
        elements.optionsGrid = document.getElementById('lang-optionsGrid');
        
        elements.feedbackBox = document.getElementById('lang-feedbackBox');
        elements.explanationText = document.getElementById('lang-explanationText');
        elements.explanationImageContainer = document.getElementById('lang-explanationImageContainer');
        elements.explanationImage = document.getElementById('lang-explanationImage');
        elements.nextBtn = document.getElementById('lang-nextBtn');
        
        elements.reviewContainer = document.getElementById('lang-reviewContainer');
        elements.reviewFeed = document.getElementById('lang-reviewFeed');
        elements.btnTopExit = document.getElementById('lang-btn-top-exit');
        
        elements.resultsOverlay = document.getElementById('lang-resultsOverlay');
        elements.svgScoreProgress = document.getElementById('lang-svgScoreProgress');
        elements.finalScore = document.getElementById('lang-finalScore');
        elements.btnReviewExam = document.getElementById('lang-btn-review-exam');
        elements.btnExitQuiz = document.getElementById('lang-btn-exit-quiz');
        elements.btnRetryQuiz = document.getElementById('lang-btn-retry-quiz');
    }

    /**
     * Inicia un simulacro
     */
    async function startQuiz(limit, difficulty, target, career, areas, isDemo = false) {
        initSelectors();
        
        // Configurar estado
        state.quizId = Date.now().toString(36);
        state.maxQuestions = limit;
        state.difficulty = difficulty || 'B2';
        state.targetExam = target || 'MCER';
        state.career = career || 'en-US';
        state.areas = areas || ['Grammar & Use of English', 'Vocabulary & Context', 'Reading Comprehension', 'Listening Comprehension'];
        state.questions = [];
        state.answers = [];
        state.currentQuestionIndex = 0;
        state.score = 0;
        state.isDemo = isDemo;
        state.startTime = Date.now();
        state.timeSpentSeconds = 0;
        
        // Detener cualquier audio previo
        stopAudio();

        // Limpiar vistas previas
        elements.feedbackBox.style.display = 'none';
        elements.reviewContainer.classList.add('hidden');
        elements.resultsOverlay.classList.remove('active');

        // Mostrar pantalla de carga general usando Swal o un loader personalizado
        showLoader();

        try {
            let data;
            const API_URL = `${window.AppConfig.API_URL}/api/idiomas-simulator`;

            if (state.isDemo) {
                // Modo Demo
                const domainParam = 'languages';
                const seenIds = JSON.parse(localStorage.getItem(`guest_seen_ids_${domainParam}`) || '[]');
                const fetchUrl = `${API_URL}/demo?domain=${domainParam}&limit=${state.maxQuestions}&excludeIds=${seenIds.join(',')}`;
                
                const response = await window.NetworkService.fetch(fetchUrl);
                data = await response.json();

                if (!data.success || !data.questions || data.questions.length === 0) {
                    localStorage.removeItem(`guest_seen_ids_${domainParam}`);
                    throw new Error("No hay preguntas disponibles para la demo.");
                }

                // Guardar IDs vistos para evitar repetición
                const newSeenIds = [...new Set([...seenIds, ...data.questions.map(q => q.id)])];
                localStorage.setItem(`guest_seen_ids_${domainParam}`, JSON.stringify(newSeenIds));

                // Mezclar opciones para UX
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
            } else {
                // Modo Registrado
                const response = await window.NetworkService.fetch(`${API_URL}/start`, {
                    method: 'POST',
                    body: JSON.stringify({
                        topic: state.topic,
                        target: state.targetExam,
                        areas: state.areas,
                        career: state.career,
                        difficulty: state.difficulty,
                        limit: state.maxQuestions
                    })
                });

                if (response.status === 403) {
                    hideLoader();
                    data = await response.json();
                    if (window.uiManager && typeof window.uiManager.showPaywallModal === 'function') {
                        window.uiManager.showPaywallModal(data.error, 'simulator');
                    } else {
                        alert(data.error || "Límite alcanzado.");
                    }
                    return;
                }

                data = await response.json();
                if (!data.success) {
                    throw new Error(data.error || "Error al cargar las preguntas.");
                }
            }

            state.questions = data.questions;
            if (data.topic) state.topic = data.topic;

            // Configurar UI
            elements.maxQ.textContent = state.maxQuestions;
            elements.currentQ.textContent = 1;
            elements.progressBar.style.width = `${(1 / state.maxQuestions) * 100}%`;

            // Configurar Temporizador (solo para Simulacro Real = 100 preguntas)
            if (state.maxQuestions === 100) {
                state.timeLeft = 120 * 60; // 2 horas en segundos
                elements.timerBadge.style.display = 'flex';
                startMockTimer();
            } else {
                elements.timerBadge.style.display = 'none';
                if (state.timerInterval) clearInterval(state.timerInterval);
            }

            // Ocultar cargador y mostrar reproductor
            hideLoader();
            elements.dashboardSections.style.display = 'none';
            if (elements.navTabs) elements.navTabs.style.display = 'none'; // Desactivar tabs durante el examen
            elements.playerWrapper.style.display = 'block';

            // Render primera pregunta
            renderQuestion();

        } catch (error) {
            console.error("Error al iniciar el simulador de idiomas:", error);
            hideLoader();
            alert(error.message || "No se pudo iniciar el simulador. Por favor, intenta de nuevo.");
        }
    }

    /**
     * Renders la pregunta actual
     */
    function renderQuestion() {
        stopAudio();
        const q = state.questions[state.currentQuestionIndex];
        if (!q) return;

        // Actualizar header
        elements.currentQ.textContent = state.currentQuestionIndex + 1;
        elements.progressBar.style.width = `${((state.currentQuestionIndex + 1) / state.maxQuestions) * 100}%`;

        // Render imagen de pregunta si existe
        if (q.image_url) {
            elements.questionImage.src = window.resolveImageUrl ? window.resolveImageUrl(q.image_url) : q.image_url;
            elements.questionImageContainer.classList.remove('hidden');
            elements.questionLayout.classList.add('has-image');
        } else {
            elements.questionImageContainer.classList.add('hidden');
            elements.questionImage.src = '';
            elements.questionLayout.classList.remove('has-image');
        }

        // Render texto
        const rawText = q.question_text || '';
        elements.questionText.innerHTML = window.MarkdownRenderer ? window.MarkdownRenderer.render(rawText) : rawText;

        // Agregar reproductor de audio si tiene listening
        if (q.audio_text) {
            const audioWrapper = document.createElement('div');
            audioWrapper.className = 'quiz-audio-player-wrapper';
            audioWrapper.style.cssText = 'margin-bottom: 1.5rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); padding: 1rem; border-radius: 1rem; display: flex; align-items: center; gap: 1rem;';
            
            const playBtn = document.createElement('button');
            playBtn.className = 'quiz-audio-btn btn-message-tts';
            playBtn.style.cssText = 'width: 45px; height: 45px; border-radius: 50%; border: none; background: #8b5cf6; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;';
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            
            playBtn.onclick = () => {
                window.playQuestionAudio(playBtn, q.audio_text, state.career);
            };

            const infoDiv = document.createElement('div');
            infoDiv.style.flex = '1';
            infoDiv.innerHTML = `
                <div style="font-size: 0.85rem; font-weight: 700; color: #cbd5e1; margin-bottom: 0.25rem;">Comprensión Auditiva (Listening)</div>
                <div style="font-size: 0.75rem; color: #64748b;">Escucha el audio para responder la pregunta</div>
            `;
            
            audioWrapper.appendChild(playBtn);
            audioWrapper.appendChild(infoDiv);
            elements.questionText.prepend(audioWrapper);
        }

        // Render opciones
        elements.optionsGrid.innerHTML = '';
        elements.feedbackBox.style.display = 'none';

        const letters = ['A', 'B', 'C', 'D', 'E'];
        const optionsList = q.options || [];
        
        optionsList.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';

            const letterSpan = document.createElement('span');
            letterSpan.className = 'option-letter';
            letterSpan.textContent = letters[idx] || '';

            const textSpan = document.createElement('span');
            textSpan.className = 'option-text';

            let formattedOpt = opt;
            if (window.MarkdownRenderer) {
                formattedOpt = window.MarkdownRenderer.render(String(opt || '')).replace(/^<p>|<\/p>$/g, '');
            }
            textSpan.innerHTML = formattedOpt;

            btn.appendChild(letterSpan);
            btn.appendChild(textSpan);

            btn.onclick = () => handleAnswer(idx, btn);
            elements.optionsGrid.appendChild(btn);
        });
    }

    /**
     * Procesa la opción seleccionada
     */
    function handleAnswer(selectedIndex, btnElement) {
        const q = state.questions[state.currentQuestionIndex];
        const isCorrect = selectedIndex === q.correct_option_index;

        // Deshabilitar opciones
        const allBtns = elements.optionsGrid.querySelectorAll('button');
        allBtns.forEach(btn => btn.disabled = true);

        // Guardar respuesta
        state.answers.push({
            questionId: state.currentQuestionIndex,
            userAnswer: selectedIndex,
            isCorrect: isCorrect
        });

        // Marcar visualmente
        if (isCorrect) {
            btnElement.classList.add('correct');
            state.score++;
        } else {
            btnElement.classList.add('wrong');
            if (allBtns[q.correct_option_index]) {
                allBtns[q.correct_option_index].classList.add('correct');
            }
        }

        // Comportamiento según modo
        if (state.maxQuestions === 10) {
            // Modo Rápido: 1s y avanza directo
            setTimeout(() => {
                advanceQuestion();
            }, 1000);
        } else {
            // Modo Estudio (20) y Real (100): Mostrar sustento
            elements.explanationText.innerHTML = window.MarkdownRenderer 
                ? window.MarkdownRenderer.render(q.explanation || "Respuesta evaluada correctamente.")
                : (q.explanation || "Respuesta evaluada correctamente.");

            if (q.explanation_image_url) {
                elements.explanationImage.src = window.resolveImageUrl ? window.resolveImageUrl(q.explanation_image_url) : q.explanation_image_url;
                elements.explanationImageContainer.classList.remove('hidden');
            } else {
                elements.explanationImageContainer.classList.add('hidden');
            }

            elements.feedbackBox.style.display = 'flex';
            elements.nextBtn.onclick = () => {
                advanceQuestion();
            };
        }
    }

    /**
     * Avanza a la siguiente pregunta
     */
    function advanceQuestion() {
        state.currentQuestionIndex++;
        if (state.currentQuestionIndex >= state.questions.length) {
            finishQuiz();
        } else {
            renderQuestion();
        }
    }

    /**
     * Finaliza el examen y envía resultados
     */
    async function finishQuiz() {
        if (state.timerInterval) clearInterval(state.timerInterval);
        stopAudio();

        state.timeSpentSeconds = Math.round((Date.now() - state.startTime) / 1000);

        // Pantalla de carga mientras se envían los datos
        showLoader("Sincronizando resultados...");

        if (state.isDemo) {
            // Guardar en local para demo
            const stats = {
                score: state.score,
                total: state.questions.length,
                accuracy: Math.round((state.score / state.questions.length) * 100),
                timeSpentSeconds: state.timeSpentSeconds,
                date: new Date().toISOString()
            };
            localStorage.setItem('guest_demo_stats_languages', JSON.stringify(stats));
            hideLoader();
            showResults();
        } else {
            // Subir al backend
            try {
                const response = await window.NetworkService.fetch(`${API_URL}/submit`, {
                    method: 'POST',
                    body: JSON.stringify({
                        topic: state.topic,
                        areas: state.areas,
                        target: state.targetExam,
                        career: state.career,
                        difficulty: state.difficulty,
                        score: state.score,
                        total_questions: state.questions.length,
                        questions: state.questions.map((q, idx) => ({
                            ...q,
                            userAnswer: state.answers[idx]?.userAnswer || 0,
                            topic: q.topic || state.topic
                        }))
                    })
                });

                const resData = await response.json();
                if (!resData.success) throw new Error(resData.error || "Fallo del servidor");

                hideLoader();
                showResults();
            } catch (err) {
                console.error("Error al registrar el puntaje en idiomas:", err);
                hideLoader();
                alert("Tuvimos problemas al registrar tu progreso en línea, pero mostraremos tus resultados locales.");
                showResults();
            }
        }
    }

    /**
     * Muestra la pantalla de resultados final
     */
    function showResults() {
        const accuracy = Math.round((state.score / state.questions.length) * 100);
        elements.finalScore.textContent = `${state.score}/${state.questions.length}`;

        // Configurar arco de progreso
        const circle = elements.svgScoreProgress;
        if (circle) {
            const radius = circle.r.baseVal.value;
            const circumference = 2 * Math.PI * radius;
            circle.style.strokeDasharray = `${circumference}`;
            
            // Animación suave de llenado
            circle.style.strokeDashoffset = `${circumference}`;
            elements.resultsOverlay.classList.add('active');
            
            setTimeout(() => {
                const offset = circumference - (accuracy / 100) * circumference;
                circle.style.strokeDashoffset = offset;
            }, 100);
        } else {
            elements.resultsOverlay.classList.add('active');
        }

        // Configurar botones de acción de resultados
        elements.btnReviewExam.onclick = () => {
            elements.resultsOverlay.classList.remove('active');
            showReview();
        };

        elements.btnExitQuiz.onclick = () => {
            elements.resultsOverlay.classList.remove('active');
            exitQuiz();
        };

        elements.btnRetryQuiz.onclick = () => {
            elements.resultsOverlay.classList.remove('active');
            startQuiz(state.maxQuestions, state.difficulty, state.targetExam, state.career, state.areas, state.isDemo);
        };
    }

    /**
     * Muestra la corrección detallada del examen
     */
    function showReview() {
        elements.reviewFeed.innerHTML = '';
        elements.reviewContainer.classList.remove('hidden');

        state.questions.forEach((q, idx) => {
            const studentAns = state.answers[idx];
            const isCorrect = studentAns ? studentAns.isCorrect : false;
            const userIdx = studentAns ? studentAns.userAnswer : -1;

            const card = document.createElement('div');
            card.className = `review-card ${q.image_url ? 'has-image' : ''}`;

            let html = `
                <div class="review-card-header">
                    <span style="font-size:0.75rem; background:${isCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color:${isCorrect ? '#34d399' : '#f87171'}; padding:3px 8px; border-radius:6px; font-weight:700;">
                        ${isCorrect ? '<i class="fas fa-check"></i> Correcta' : '<i class="fas fa-times"></i> Incorrecta'}
                    </span>
                </div>
            `;

            if (q.image_url) {
                html += `
                    <div class="review-q-image-container">
                        <img src="${window.resolveImageUrl ? window.resolveImageUrl(q.image_url) : q.image_url}" alt="Imagen de pregunta" loading="lazy">
                    </div>
                `;
            }

            const rawText = q.question_text || '';
            const renderedQText = window.MarkdownRenderer ? window.MarkdownRenderer.render(rawText) : rawText;

            html += `
                <div class="review-q-text">${renderedQText}</div>
            `;

            if (q.audio_text) {
                html += `
                <div class="quiz-audio-player-wrapper" style="margin-top: 1rem; margin-bottom: 1.5rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); padding: 1rem; border-radius: 1rem; display: flex; align-items: center; gap: 1rem;">
                    <button class="quiz-audio-btn btn-message-tts review-audio-btn" style="width: 45px; height: 45px; border-radius: 50%; border: none; background: #6366f1; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;">
                        <i class="fas fa-play"></i>
                    </button>
                    <span style="color: #94a3b8; font-size: 0.875rem;">Comprensión Auditiva (Escuchar audio)</span>
                </div>
                `;
            }

            html += `
                <div class="review-options">
            `;

            const letters = ['A', 'B', 'C', 'D', 'E'];
            const optionsList = q.options || [];

            optionsList.forEach((opt, oIdx) => {
                let optClass = 'review-opt';
                if (oIdx === q.correct_option_index) {
                    optClass += ' r-correct';
                } else if (oIdx === userIdx) {
                    optClass += ' r-wrong';
                }

                let optText = opt;
                if (window.MarkdownRenderer) {
                    optText = window.MarkdownRenderer.render(String(opt || '')).replace(/^<p>|<\/p>$/g, '');
                }

                html += `
                    <div class="${optClass}">
                        <strong>${letters[oIdx]}</strong>
                        <span>${optText}</span>
                    </div>
                `;
            });

            html += `
                </div>
                <div class="review-explanation">
                    <div style="font-weight:700; color:#a78bfa; margin-bottom:0.5rem;"><i class="fas fa-info-circle"></i> Explicación / Sustento:</div>
                    <div>${window.MarkdownRenderer ? window.MarkdownRenderer.render(q.explanation || '') : (q.explanation || '')}</div>
                </div>
            `;

            card.innerHTML = html;

            const playBtn = card.querySelector('.review-audio-btn');
            if (playBtn) {
                playBtn.onclick = () => {
                    window.playQuestionAudio(playBtn, q.audio_text, state.career || 'en-US');
                };
            }

            elements.reviewFeed.appendChild(card);
        });

        elements.btnTopExit.onclick = () => {
            exitQuiz();
        };

        // Scroll suave al contenedor de revisión
        elements.reviewContainer.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Sale del reproductor y vuelve al dashboard
     */
    function exitQuiz() {
        if (state.timerInterval) clearInterval(state.timerInterval);
        stopAudio();

        elements.playerWrapper.style.display = 'none';
        elements.reviewContainer.classList.add('hidden');
        elements.resultsOverlay.classList.remove('active');

        // Mostrar secciones del panel principal
        elements.dashboardSections.style.display = 'block';
        if (elements.navTabs) elements.navTabs.style.display = 'flex';

        // Recargar analíticas en la vista principal si están disponibles globalmente
        if (window.loadAnalyticsData) {
            window.loadAnalyticsData();
        }
    }

    /**
     * Cronómetro para el modo Simulacro Real
     */
    function startMockTimer() {
        if (state.timerInterval) clearInterval(state.timerInterval);
        
        state.timerInterval = setInterval(() => {
            state.timeLeft--;
            if (state.timeLeft <= 0) {
                clearInterval(state.timerInterval);
                alert("¡El tiempo límite del simulacro ha expirado!");
                finishQuiz();
                return;
            }

            const hrs = Math.floor(state.timeLeft / 3600);
            const mins = Math.floor((state.timeLeft % 3600) / 60);
            const secs = state.timeLeft % 60;

            const format = (num) => String(num).padStart(2, '0');
            elements.timer.textContent = `${format(hrs)}:${format(mins)}:${format(secs)}`;
        }, 1000);
    }

    /**
    function stopAudio() {
        if (window.currentQuizAudio) {
            try { window.currentQuizAudio.pause(); } catch (e) {}
            window.currentQuizAudio = null;
        }
    }

    // Helpers de Pantalla de Carga
    let loaderTipInterval = null;

    function showLoader(customTitle) {
        // Generar tip dinámico
        let tipIdx = 0;
        const tipText = LOADING_TIPS[0];

        if (typeof Swal !== 'undefined') {
            const popup = Swal.fire({
                title: customTitle || 'Preparando simulacro de idiomas...',
                html: `
                    <div class="premium-spinner" style="width:50px; height:50px; border:3px solid rgba(139,92,246,0.1); border-top:3px solid #8b5cf6; border-radius:50%; margin: 1.5rem auto; animation: spin 1s linear infinite;"></div>
                    <div style="background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 12px; border: 1px dashed rgba(255,255,255,0.08); max-width:320px; margin:0 auto; font-size:0.9rem;">
                        <div style="color: #a78bfa; font-weight:700; font-size:0.75rem; text-transform:uppercase; margin-bottom:0.3rem;">Tip de Estudio</div>
                        <div id="loaderTipEl" style="color:#cbd5e1; line-height:1.4;">${tipText}</div>
                    </div>
                    <style>
                        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    </style>
                `,
                background: 'rgba(15, 23, 42, 0.95)',
                color: '#fff',
                showConfirmButton: false,
                allowOutsideClick: false,
                customClass: {
                    popup: 'swal-glass-popup'
                },
                didOpen: () => {
                    const tipEl = document.getElementById('loaderTipEl');
                    if (tipEl) {
                        loaderTipInterval = setInterval(() => {
                            tipIdx = (tipIdx + 1) % LOADING_TIPS.length;
                            tipEl.style.opacity = '0';
                            setTimeout(() => {
                                tipEl.innerText = LOADING_TIPS[tipIdx];
                                tipEl.style.opacity = '1';
                            }, 250);
                        }, 3000);
                    }
                },
                willClose: () => {
                    if (loaderTipInterval) clearInterval(loaderTipInterval);
                }
            });
        } else {
            console.warn("SweetAlert2 no está disponible, usando cargador de respaldo.");
            let overlay = document.getElementById('fallback-loader-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'fallback-loader-overlay';
                overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(10,10,10,0.9); z-index:999999; display:flex; flex-direction:column; justify-content:center; align-items:center; color:#fff; font-family:sans-serif;';
                overlay.innerHTML = `
                    <div style="width:50px; height:50px; border:3px solid rgba(255,255,255,0.1); border-top:3px solid #8b5cf6; border-radius:50%; animation: spin 1s linear infinite; margin-bottom:15px;"></div>
                    <div style="font-size: 1.1rem; font-weight: 600;">${customTitle || 'Preparando simulacro de idiomas...'}</div>
                    <style>
                        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    </style>
                `;
                document.body.appendChild(overlay);
            } else {
                overlay.style.display = 'flex';
            }
        }
    }

    function hideLoader() {
        if (typeof Swal !== 'undefined') {
            Swal.close();
            if (loaderTipInterval) clearInterval(loaderTipInterval);
        } else {
            const overlay = document.getElementById('fallback-loader-overlay');
            if (overlay) overlay.style.display = 'none';
        }
    }

    const instance = {
        startQuiz: startQuiz
    };

    window.LanguagesSimulator = instance;
    return instance;
})();
