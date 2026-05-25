const SelfEvaluation = (function () {
    const state = {
        questions: [],
        currIdx: 0,
        score: 0,
        lives: 3,
        timer: null,
        timeLeft: 35,
        correctAnswers: 0,
        resourceId: null,
        count: 5,
        difficulty: 'intermediate'
    };

    const ui = {
        screens: {
            loading: document.getElementById('loading'),
            error: document.getElementById('errorState'),
            gameplay: document.getElementById('gameplay'),
            modalFeedback: document.getElementById('modalFeedback'),
            modalFinish: document.getElementById('modalFinish')
        },
        hud: {
            lives: document.getElementById('livesBox'),
            bar: document.getElementById('timerBar'),
            score: document.getElementById('gameScore')
        },
        question: {
            meta: document.getElementById('q-meta'),
            text: document.getElementById('q-text'),
            grid: document.getElementById('opt-grid')
        },
        feedback: {
            container: document.getElementById('fb-icon-container'),
            icon: document.getElementById('fb-icon'),
            title: document.getElementById('fb-title'),
            msg: document.getElementById('fb-msg'),
            btn: document.getElementById('fb-btn-next')
        },
        finish: {
            score: document.getElementById('finishScore'),
            correct: document.getElementById('finishCorrect')
        }
    };

    function init() {
        console.log("⚡ Inicializando Autoevaluación de Recursos...");
        const urlParams = new URLSearchParams(window.location.search);
        state.resourceId = urlParams.get('resourceId');
        state.count = urlParams.get('count') || 5;
        state.difficulty = urlParams.get('difficulty') || 'intermediate';
        
        if (!state.resourceId) {
            showError("No se especificó un recurso para la autoevaluación.");
            return;
        }

        startMatch();
    }

    async function startMatch() {
        ui.screens.loading.classList.remove('hidden');

        try {
            const bodyData = { 
                resourceId: state.resourceId,
                count: parseInt(state.count, 10),
                difficulty: state.difficulty
            };

            const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/self-evaluation/start`, {
                method: 'POST',
                body: JSON.stringify(bodyData)
            });

            const data = await res.json();

            if (res.status === 401) {
                showError("Debes iniciar sesión para acceder a esta función premium.");
                return;
            }

            if (res.status === 403) {
                showError(data.error || "Has agotado tus vidas de hoy (créditos). Activa tu cuenta Premium para obtener autoevaluaciones ilimitadas.");
                return;
            }

            if (!data.success) throw new Error(data.error || 'La IA no pudo procesar este recurso. Intenta con otro.');

            state.questions = data.questions;
            
            if (!state.questions || state.questions.length === 0) {
                throw new Error("No se generaron preguntas válidas.");
            }

            resetGame();
            ui.screens.loading.classList.add('hidden');
            ui.screens.gameplay.classList.remove('hidden');
            
            renderQuestion();

        } catch (e) {
            console.error(e);
            showError(e.message || "Error al comunicarse con el servidor.");
        }
    }

    function showError(message) {
        ui.screens.loading.classList.add('hidden');
        ui.screens.gameplay.classList.add('hidden');
        document.getElementById('errorMsg').textContent = message;
        ui.screens.error.classList.remove('hidden');
    }

    function resetGame() {
        state.currIdx = 0;
        state.score = 0;
        state.lives = 3;
        state.correctAnswers = 0;
        updateHUD();
    }

    function renderQuestion() {
        if (state.currIdx >= state.questions.length) {
            return finishGame();
        }

        const q = state.questions[state.currIdx];
        state.timeLeft = 35;
        startTimer();

        ui.question.meta.textContent = `PREGUNTA ${state.currIdx + 1} DE ${state.questions.length}`;
        
        if (window.MarkdownRenderer) {
            ui.question.text.innerHTML = window.MarkdownRenderer.render(q.question || q.question_text || '');
        } else {
            ui.question.text.textContent = q.question || q.question_text || '';
        }
        
        ui.question.grid.innerHTML = '';

        q.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = opt;
            btn.onclick = () => submitAnswer(idx);
            ui.question.grid.appendChild(btn);
        });
    }

    function startTimer() {
        clearInterval(state.timer);
        ui.hud.bar.style.width = '100%';
        ui.hud.bar.style.background = 'linear-gradient(90deg, #10b981, #3b82f6)';
        
        state.timer = setInterval(() => {
            state.timeLeft -= 0.1;
            const pct = (state.timeLeft / 35) * 100;
            
            ui.hud.bar.style.width = `${pct}%`;
            if (pct < 25) ui.hud.bar.style.background = '#ef4444';
            
            if (state.timeLeft <= 0) {
                clearInterval(state.timer);
                state.lives--;
                updateHUD();
                showFeedback(false, "¡Se acabó el tiempo!");
            }
        }, 100);
    }

    function submitAnswer(idx) {
        clearInterval(state.timer);
        const q = state.questions[state.currIdx];
        
        const correctAnswerIdx = q.correctAnswer !== undefined ? q.correctAnswer : q.correct_option_index;
        const isCorrect = idx === correctAnswerIdx;
        
        const btns = ui.question.grid.querySelectorAll('.option-btn');
        btns.forEach(b => b.style.pointerEvents = 'none'); 
        
        if (isCorrect) {
            btns[idx].classList.add('correct');
            const timeBonus = Math.floor(state.timeLeft * 10);
            state.score += (100 + timeBonus);
            state.correctAnswers++;
        } else {
            btns[idx].classList.add('wrong');
            if(btns[correctAnswerIdx]) btns[correctAnswerIdx].classList.add('correct');
            state.lives--;
        }

        updateHUD();
        setTimeout(() => showFeedback(isCorrect, q.explanation), 800);
    }

    function showFeedback(isCorrect, msg) {
        ui.screens.modalFeedback.classList.remove('hidden');
        
        ui.feedback.title.textContent = isCorrect ? '¡Excelente!' : 'Respuesta Incorrecta';
        ui.feedback.title.style.color = isCorrect ? '#10b981' : '#ef4444';
        
        ui.feedback.container.style.background = isCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
        ui.feedback.icon.className = isCorrect ? 'fas fa-check' : 'fas fa-times';
        ui.feedback.icon.style.color = isCorrect ? '#10b981' : '#ef4444';
        
        if (window.MarkdownRenderer && msg) {
            ui.feedback.msg.innerHTML = window.MarkdownRenderer.render(msg);
        } else {
            ui.feedback.msg.textContent = msg || (isCorrect ? 'Correcto.' : 'Intenta nuevamente.');
        }

        setTimeout(() => { ui.feedback.btn.focus(); }, 100);
    }

    function updateHUD() {
        ui.hud.score.textContent = `${state.score} pts`;
        
        const hearts = ui.hud.lives.querySelectorAll('i');
        hearts.forEach((h, i) => {
            if (i < state.lives) {
                h.classList.add('active');
            } else {
                h.classList.remove('active');
            }
        });

        if (state.lives <= 0) {
            setTimeout(finishGame, 1000);
        }
    }

    function nextQ() {
        ui.screens.modalFeedback.classList.add('hidden');
        state.currIdx++;
        renderQuestion();
    }

    async function finishGame() {
        clearInterval(state.timer);
        ui.screens.gameplay.classList.add('hidden');
        ui.screens.modalFeedback.classList.add('hidden');
        
        ui.finish.score.textContent = state.score;
        ui.finish.correct.textContent = `${state.correctAnswers} / ${state.questions.length}`;

        ui.screens.modalFinish.classList.remove('hidden');
    }

    function goBack() {
        if (state.resourceId) {
            window.location.href = `/resource?id=${state.resourceId}`; 
        } else {
            window.location.href = '/';
        }
    }

    return {
        init,
        nextQ,
        goBack
    };

})();

document.addEventListener('DOMContentLoaded', () => SelfEvaluation.init());
