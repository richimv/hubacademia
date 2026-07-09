/**
 * QuizTutor Component (Simulador Edition)
 * Interactive AI tutor for quiz questions using Gemini 2.5 Flash Lite + RAG.
 */
class QuizTutor {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.questionContext = null;
        this.isTyping = false;
        this.dom = {};
        this.history = [];
    }

    init() {
        if (this.initialized) return;
        this._renderPanel();
        this._bindEvents();
        this.initialized = true;
        console.log("🧠 QuizTutor IA Initialized (Gemini 2.5 Flash Lite + RAG Mode)");
    }

    _renderPanel() {
        // Prevent duplicate panels
        let panel = document.getElementById('quiz-tutor-panel');
        if (panel) {
            panel.remove();
        }

        panel = document.createElement('div');
        panel.id = 'quiz-tutor-panel';
        panel.className = 'tutor-chat-panel'; // Reutiliza la clase del panel lateral
        panel.innerHTML = `
            <div class="tutor-chat-header">
                <div class="tutor-header-title">
                    <i class="fas fa-robot tutor-robot-icon"></i>
                    <span>Tutor de Apoyo IA</span>
                </div>
                <button id="quiz-tutor-close" class="tutor-close-btn">&times;</button>
            </div>
            <div id="quiz-tutor-messages" class="tutor-messages-area">
                <!-- Mensajes inyectados dinámicamente -->
            </div>
            <div class="tutor-input-area">
                <textarea id="quiz-tutor-input" class="tutor-input-field" placeholder="Escribe tu duda aquí..." rows="1"></textarea>
                <button id="quiz-tutor-send" class="tutor-send-btn">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        `;
        document.body.appendChild(panel);

        this.dom = {
            panel: panel,
            messages: document.getElementById('quiz-tutor-messages'),
            input: document.getElementById('quiz-tutor-input'),
            send: document.getElementById('quiz-tutor-send'),
            close: document.getElementById('quiz-tutor-close')
        };
    }

    _bindEvents() {
        this.dom.close.onclick = () => this.toggle(false);
        this.dom.send.onclick = () => this.sendMessage();

        // Soporte para enviar con Enter (Shift + Enter para nueva línea)
        this.dom.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
                this.dom.input.style.height = 'auto';
            }
        });

        // Auto-resize del input de texto
        this.dom.input.addEventListener('input', () => {
            this.dom.input.style.height = 'auto';
            this.dom.input.style.height = (this.dom.input.scrollHeight) + 'px';
        });
    }

    getSpecialization() {
        const context = window.__quizState?.context || 'MEDICINA';
        const ctxUpper = context.toUpperCase();
        if (ctxUpper === 'MEDICINA') return 'medicine';
        if (ctxUpper === 'EDUCACION') return 'education';
        if (ctxUpper === 'IDIOMAS') return 'languages';
        return 'medicine';
    }

    toggle(forceState, questionContext = null) {
        if (!this.dom.panel) {
            this.init();
        }

        if (!this.dom.panel) return;

        const previousOpen = this.isOpen;
        this.isOpen = forceState !== undefined ? forceState : !this.isOpen;
        this.dom.panel.classList.toggle('active', this.isOpen);

        if (this.isOpen) {
            // Si el contexto de la pregunta es nuevo o diferente, reiniciar el chat
            if (questionContext && (!this.questionContext || this.questionContext.id !== questionContext.id)) {
                this.clearChat();
                this.questionContext = questionContext;
                this._addWelcomeMessage();
            }
            setTimeout(() => this.dom.input.focus(), 300);
        }
    }

    clearChat() {
        if (!this.dom.messages) return;
        this.messages = [];
        this.history = [];
        this.dom.messages.innerHTML = '';
    }

    _addWelcomeMessage() {
        let welcomeText = "Hola, soy tu tutor de apoyo IA. ¿Tienes alguna duda sobre esta pregunta o sobre el sustento técnico? Con gusto te lo explico en detalle.";
        const spec = this.getSpecialization();
        if (spec === 'medicine') {
            welcomeText = "Hola, soy tu tutor clínico. ¿Hay algún concepto de esta pregunta, norma técnica o guía oficial que desees profundizar?";
        } else if (spec === 'education') {
            welcomeText = "Hola, soy tu tutor pedagógico. ¿Tienes alguna duda sobre la casuística de esta pregunta o sobre el Currículo Nacional (CNEB)?";
        } else if (spec === 'languages') {
            welcomeText = "Hi! I am your language tutor. Do you have any questions about the vocabulary, grammar, or text used in this question?";
        }

        this._addMessage(welcomeText, 'bot');
    }

    async sendMessage(overrideText = null) {
        const text = (overrideText || this.dom.input.value).trim();
        if (!text || this.isTyping) return;

        if (!overrideText) {
            this.dom.input.value = '';
            this.dom.input.style.height = 'auto';
        }

        // Quitar sugerencias previas antes de enviar
        const oldSuggestions = this.dom.messages.querySelector('.tutor-suggestions-container');
        if (oldSuggestions) oldSuggestions.remove();

        this._addMessage(text, 'user');
        this._setTyping(true);

        try {
            const spec = this.getSpecialization();
            const payload = {
                message: text,
                specialization: spec,
                history: this.history,
                ephemeral: true,
                context: {
                    type: 'quiz_tutor',
                    questionText: this.questionContext?.questionText || '',
                    options: this.questionContext?.options || [],
                    correctOptionIndex: this.questionContext?.correctOptionIndex !== undefined ? this.questionContext.correctOptionIndex : null,
                    correctOptionText: this.questionContext?.correctOptionText || '',
                    userOptionIndex: this.questionContext?.userOptionIndex !== undefined ? this.questionContext.userOptionIndex : null,
                    userOptionText: this.questionContext?.userOptionText || '',
                    isUserCorrect: this.questionContext?.isUserCorrect || false,
                    explanation: this.questionContext?.explanation || '',
                    topic: this.questionContext?.topic || 'General',
                    target: this.questionContext?.target || ''
                }
            };

            const response = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/chat`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 403) {
                    if (window.uiManager) {
                        window.uiManager.showPaywallModal(data.error || null, 'chat_standard');
                    }
                    this._addMessage(`⚠️ ${data.error || 'Límite de consultas diarias alcanzado.'}`, 'bot');
                    return;
                }
                throw new Error(data.error || "Error en la red");
            }

            if (data.respuesta) {
                this._addMessage(data.respuesta, 'bot', data.sugerencias);
                
                // Agregar al historial de la sesión
                this.history.push({ sender: 'user', content: text });
                this.history.push({ sender: 'bot', content: data.respuesta });

                // Mantener límite de historial de la sesión para evitar payloads gigantes
                if (this.history.length > 10) {
                    this.history.splice(0, 2);
                }
            } else {
                throw new Error("Sin respuesta del tutor");
            }
        } catch (error) {
            console.error("QuizTutor Error:", error);
            this._addMessage("Lo siento, tuve un problema de conexión al procesar tu consulta. Inténtalo de nuevo.", 'bot');
        } finally {
            this._setTyping(false);
        }
    }

    _addMessage(text, role, suggestions = null) {
        const msgWrapper = document.createElement('div');
        msgWrapper.className = `tutor-message-wrapper ${role}`;

        const msg = document.createElement('div');
        msg.className = `tutor-message tutor-message-${role} markdown-content markdown-compact`;

        // JSON Safety Net
        if (typeof text === 'string' && text.trimStart().startsWith('{')) {
            try {
                const p = JSON.parse(text);
                if (p && p.respuesta) text = p.respuesta;
            } catch (e) {}
        }

        // Formatear Markdown
        let formattedText = window.MarkdownRenderer ? window.MarkdownRenderer.render(text) : text.replace(/\n/g, '<br>');
        msg.innerHTML = formattedText;
        msgWrapper.appendChild(msg);

        // Agregar acciones
        if (role === 'bot') {
            const actions = document.createElement('div');
            actions.className = 'tutor-message-actions';

            const saveBtn = document.createElement('button');
            saveBtn.className = 'tutor-save-note-btn';
            saveBtn.innerHTML = '<i class="far fa-bookmark"></i> Guardar nota';
            saveBtn.title = 'Guardar nota de estudio';
            saveBtn.onclick = () => this.saveAsNote(text, saveBtn);

            const copyBtn = document.createElement('button');
            copyBtn.className = 'tutor-save-note-btn';
            copyBtn.innerHTML = '<i class="far fa-copy"></i> Copiar';
            copyBtn.title = 'Copiar al portapapeles';
            copyBtn.onclick = () => this.copyToClipboard(text, copyBtn);

            actions.appendChild(saveBtn);
            actions.appendChild(copyBtn);
            msgWrapper.appendChild(actions);

            // Inyectar sugerencias si existen
            if (suggestions && Array.isArray(suggestions) && suggestions.length > 0) {
                const sugContainer = document.createElement('div');
                sugContainer.className = 'tutor-suggestions-container';
                suggestions.forEach(sug => {
                    const pill = document.createElement('button');
                    pill.className = 'tutor-suggestion-btn';
                    pill.textContent = sug;
                    pill.onclick = () => this.sendMessage(sug);
                    sugContainer.appendChild(pill);
                });
                msgWrapper.appendChild(sugContainer);
            }
        } else if (role === 'user') {
            const actions = document.createElement('div');
            actions.className = 'tutor-message-actions user-actions';

            const copyBtn = document.createElement('button');
            copyBtn.className = 'tutor-save-note-btn';
            copyBtn.innerHTML = '<i class="far fa-copy"></i> Copiar';
            copyBtn.onclick = () => this.copyToClipboard(text, copyBtn);

            actions.appendChild(copyBtn);
            msgWrapper.appendChild(actions);
        }

        this.dom.messages.appendChild(msgWrapper);
        this.dom.messages.scrollTop = this.dom.messages.scrollHeight;
    }

    async copyToClipboard(text, btn) {
        try {
            await navigator.clipboard.writeText(text);
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';
            setTimeout(() => { btn.innerHTML = originalHTML; }, 2000);
        } catch (err) {
            console.error('Error al copiar:', err);
        }
    }

    async saveAsNote(content, btn) {
        const icon = btn.querySelector('i');
        const originalClass = icon.className;

        try {
            icon.className = 'fas fa-spinner fa-spin';

            const title = `Nota del Simulador: ${this.questionContext?.topic || 'General'}`;

            const response = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/library/notes`, {
                method: 'POST',
                body: JSON.stringify({
                    title: title,
                    content: content,
                    sourceType: 'quiz'
                })
            });

            if (!response.ok) throw new Error("Error al guardar nota");

            icon.className = 'fas fa-bookmark';
            btn.style.color = '#f59e0b';
            btn.classList.add('saved');

            if (window.libraryService && typeof window.libraryService.loadFullLibrary === 'function') {
                window.libraryService.loadFullLibrary();
            }
        } catch (error) {
            console.error("Error saving note:", error);
            icon.className = 'fas fa-exclamation-triangle';
            setTimeout(() => { icon.className = originalClass; }, 2000);
        }
    }

    _setTyping(state) {
        this.isTyping = state;
        this.dom.send.disabled = state;
        if (state) {
            const loader = document.createElement('div');
            loader.id = 'quiz-tutor-loader';
            loader.className = 'tutor-message tutor-message-bot';
            loader.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Pensando...';
            this.dom.messages.appendChild(loader);
            this.dom.messages.scrollTop = this.dom.messages.scrollHeight;
        } else {
            const loader = document.getElementById('quiz-tutor-loader');
            if (loader) loader.remove();
        }
    }
}

// Export single global instance
window.quizTutor = new QuizTutor();
