/**
 * FlashcardTutor Component (Senior Edition)
 * Exclusive chat for study sessions using Gemini 2.5 Flash Lite.
 */
class FlashcardTutor {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.cardContext = null;
        this.isTyping = false;
        this.dom = {};
    }

    init() {
        if (this.initialized) return;
        this._renderPanel();
        this._bindEvents();
        this.initialized = true;
        console.log("🧠 Tutor IA Initialized (Gemini 2.5 Flash Lite Mode)");
    }

    _renderPanel() {
        const panel = document.createElement('div');
        panel.id = 'tutor-chat-panel';
        panel.className = 'tutor-chat-panel';
        panel.innerHTML = `
            <div class="tutor-chat-header">
                <div class="tutor-header-title">
                    <i class="fas fa-robot tutor-robot-icon"></i>
                    <span>Tutor de Apoyo</span>
                </div>
                <button id="tutor-close" class="tutor-close-btn">&times;</button>
            </div>
            <div id="tutor-messages" class="tutor-messages-area">
                <div class="tutor-message tutor-message-bot">Hola, soy tu tutor de apoyo. ¿Hay algo en esta tarjeta que no te haya quedado claro?</div>
            </div>
            <div class="tutor-input-area">
                <textarea id="tutor-input" class="tutor-input-field" placeholder="Escribe tu duda aquí..." rows="1"></textarea>
                <button id="tutor-send" class="tutor-send-btn">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        `;
        document.body.appendChild(panel);

        this.dom = {
            panel: panel,
            messages: document.getElementById('tutor-messages'),
            input: document.getElementById('tutor-input'),
            send: document.getElementById('tutor-send'),
            close: document.getElementById('tutor-close')
        };
    }

    _bindEvents() {
        this.dom.close.onclick = () => this.toggle(false);
        this.dom.send.onclick = () => this.sendMessage();
        
        // ✅ MEJORA: Soporte para multi-línea (Solo Shift + Enter)
        this.dom.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
                this.dom.input.style.height = 'auto';
            }
        });

        // ✅ MEJORA: Auto-resize del textarea
        this.dom.input.addEventListener('input', () => {
            this.dom.input.style.height = 'auto';
            this.dom.input.style.height = (this.dom.input.scrollHeight) + 'px';
        });
    }

    toggle(forceState, context = null) {
        // ✅ GUARD: Si el panel aún no se ha renderizado, intentamos inicializar
        if (!this.dom.panel) {
            this.init();
        }
        
        // Si después de init sigue sin haber panel (ej. error en DOM), abortamos suavemente
        if (!this.dom.panel) return;

        this.isOpen = forceState !== undefined ? forceState : !this.isOpen;
        this.dom.panel.classList.toggle('active', this.isOpen);

        // Actualizar contexto si se provee, pero NO limpiar chat aquí
        if (context) {
            this.cardContext = context;
        }

        if (this.isOpen) {
            setTimeout(() => this.dom.input.focus(), 300);
        }
    }

    clearChat() {
        if (!this.dom.messages) {
            this.init();
        }
        if (!this.dom.messages) return;

        this.messages = [];
        this.history = []; // Limpiar historial interno para el backend
        this.dom.messages.innerHTML = `
            <div class="tutor-message tutor-message-bot">Hola, soy tu tutor de apoyo. ¿Hay algo en esta tarjeta que no te haya quedado claro?</div>
        `;
    }

    async sendMessage() {
        const text = this.dom.input.value.trim();
        if (!text || this.isTyping) return;

        this.dom.input.value = '';
        this._addMessage(text, 'user');
        this._setTyping(true);

        try {
            // ✅ Mantenemos historial local para que la IA tenga memoria de la conversación actual
            if (!this.history) this.history = [];
            
            const payload = {
                message: text,
                specialization: 'flashcard_tutor', // 🚀 NUEVA: Personalidad exclusiva de Tutor Académico
                history: this.history, // 🧠 Enviamos la memoria de la sesión
                context: {
                    type: 'flashcard_tutor',
                    front: this.cardContext?.front || 'Imagen o sin texto',
                    back: this.cardContext?.back || 'Imagen o sin texto',
                    topic: this.cardContext?.topic || 'General'
                }
            };

            const response = await fetch(`${window.AppConfig.API_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Error en la red");

            const data = await response.json();
            if (data.respuesta) {
                this._addMessage(data.respuesta, 'bot');
                
                // ✅ Guardamos en el historial para la próxima pregunta (usando 'sender' para match con backend)
                this.history.push({ sender: 'user', content: text });
                this.history.push({ sender: 'bot', content: data.respuesta });
                
                // Limitar historial para no saturar el contexto (ej. últimos 10 mensajes)
                if (this.history.length > 10) this.history.shift(); 
            } else {
                throw new Error("Sin respuesta del tutor");
            }

        } catch (error) {
            console.error("Tutor Error:", error);
            this._addMessage("Lo siento, tuve un problema de conexión. Inténtalo de nuevo.", 'bot');
        } finally {
            this._setTyping(false);
        }
    }

    _addMessage(text, role) {
        const msgContainer = document.createElement('div');
        msgContainer.className = `tutor-message-wrapper ${role}`;

        const msg = document.createElement('div');
        msg.className = `tutor-message tutor-message-${role}`;
        
        // ✅ MEJORA: Formateador Markdown Unificado
        let formattedText = window.MarkdownRenderer ? window.MarkdownRenderer.render(text) : text.replace(/\n/g, '<br>');
            
        msg.innerHTML = formattedText;
        msgContainer.appendChild(msg);

        // ✅ AGREGAR BOTÓN DE GUARDADO SOLO PARA EL BOT
        if (role === 'bot') {
            const actions = document.createElement('div');
            actions.className = 'tutor-message-actions';
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'tutor-save-note-btn';
            saveBtn.innerHTML = '<i class="far fa-bookmark"></i> Guardar nota';
            saveBtn.title = 'Guardar como nota';
            saveBtn.onclick = () => this.saveAsNote(text, saveBtn);

            const copyBtn = document.createElement('button');
            copyBtn.className = 'tutor-save-note-btn'; // Reutilizamos clase para consistencia
            copyBtn.innerHTML = '<i class="far fa-copy"></i> Copiar';
            copyBtn.title = 'Copiar respuesta';
            copyBtn.onclick = () => this.copyToClipboard(text, copyBtn);
            
            actions.appendChild(saveBtn);
            actions.appendChild(copyBtn);
            msgContainer.appendChild(actions);
        } else if (role === 'user') {
            // ✅ Botón de copiado para el usuario (útil en móvil)
            const actions = document.createElement('div');
            actions.className = 'tutor-message-actions user-actions';
            
            const copyBtn = document.createElement('button');
            copyBtn.className = 'tutor-save-note-btn';
            copyBtn.innerHTML = '<i class="far fa-copy"></i> Copiar';
            copyBtn.onclick = () => this.copyToClipboard(text, copyBtn);
            
            actions.appendChild(copyBtn);
            msgContainer.appendChild(actions);
        }

        this.dom.messages.appendChild(msgContainer);
        this.dom.messages.scrollTop = this.dom.messages.scrollHeight;
    }

    async copyToClipboard(text, btn) {
        try {
            await navigator.clipboard.writeText(text);
            const icon = btn.querySelector('i');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
            }, 2000);
        } catch (err) {
            console.error('Error al copiar:', err);
        }
    }

    async saveAsNote(content, btn) {
        const icon = btn.querySelector('i');
        const originalClass = icon.className;
        
        try {
            icon.className = 'fas fa-spinner fa-spin';
            
            const title = `Nota de Repaso: ${this.cardContext?.topic || 'Flashcard'}`;
            
            const response = await fetch(`${window.AppConfig.API_URL}/api/library/notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    title: title,
                    content: content,
                    sourceType: 'flashcard'
                })
            });

            if (!response.ok) throw new Error("Error al guardar");

            // Feedback visual exitoso
            icon.className = 'fas fa-bookmark';
            btn.style.color = '#f59e0b'; // Dorado
            btn.classList.add('saved');
            
            if (window.libraryService) window.libraryService.loadFullLibrary();
            
        } catch (error) {
            console.error("Error saving tutor note:", error);
            icon.className = 'fas fa-exclamation-triangle';
            setTimeout(() => icon.className = originalClass, 2000);
        }
    }

    _setTyping(state) {
        this.isTyping = state;
        this.dom.send.disabled = state;
        if (state) {
            const loader = document.createElement('div');
            loader.id = 'tutor-loader';
            loader.className = 'tutor-message tutor-message-bot';
            loader.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Pensando...';
            this.dom.messages.appendChild(loader);
            this.dom.messages.scrollTop = this.dom.messages.scrollHeight;
        } else {
            const loader = document.getElementById('tutor-loader');
            if (loader) loader.remove();
        }
    }
}

// Global instance
window.flashcardTutor = new FlashcardTutor();
document.addEventListener('DOMContentLoaded', () => window.flashcardTutor.init());
