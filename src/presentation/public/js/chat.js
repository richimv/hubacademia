class ChatComponent {
    constructor(options = {}) {
        this.isOpen = false;
        this.isSending = false;
        this.activeConversationId = null;
        this.messages = [];
        this.conversations = [];
        this.messageIdCounter = 0;
        this.specialization = 'neutral'; // Hubi is company support; academic tutors live in study tools.

        // Fase IV: Opciones de Modularidad
        this.targetSelector = options.targetSelector || 'body'; // Dónde se inyecta
        this.isFullScreen = false;

        // Callback binding
        this.handlePopState = this.handlePopState.bind(this);
        this.toggleFullScreen = this.toggleFullScreen.bind(this);

        this.init();
    }

    async init() {
        this.createChatInterface();
        this.setupEventListeners();
        this.updatePersonaUI();
        // Mostrar mensaje de bienvenida y preguntas iniciales
        this.addWelcomeMessage();

        let lastUserId = window.sessionManager && window.sessionManager.getUser() ? window.sessionManager.getUser().id : null;

        // Escuchar cambios de sesión para resetear el chat solo cuando cambie el estado de autenticación (ej. de visitante a logueado)
        if (window.sessionManager) {
            window.sessionManager.onStateChange((user) => {
                const toggleBtn = document.getElementById('chatbot-toggle');
                if (toggleBtn) {
                    toggleBtn.style.display = this.isOpen ? 'none' : 'block';
                }
                const newUserId = user ? user.id : null;
                if (lastUserId !== newUserId) {
                    lastUserId = newUserId;
                    if (user) {
                        this.resetVisitorChatState();
                    }
                }
            });
        }
    }

    getPersonaLabel() {
        return 'Hubi';
    }

    createChatInterface() {
        const user = window.sessionManager ? window.sessionManager.getUser() : null;

        const chatHTML = `
            <div id="chatbot-container" class="chatbot-container" role="dialog" aria-labelledby="chatbot-title-heading" aria-modal="false" aria-hidden="true" inert>
                <div class="chatbot-main-panel">
                    <div class="chatbot-header">
                        <div class="chatbot-title-selector" title="Asistente Guía Hub Academia">
                            <img id="chatbot-icon" src="/assets/hubifrente.png" alt="Hubi" class="chatbot-header-avatar">
                            <div><h3 id="chatbot-title-heading" class="chatbot-title-heading">Hubi</h3><p class="chatbot-subtitle">Atención de Hub Academia</p></div>
                        </div>
                        <div class="chatbot-header-actions">
                            <button type="button" aria-pressed="false" id="chatbot-expand" class="chatbot-expand" aria-label="Pantalla completa" title="Pantalla completa">
                                <i class="fas fa-expand"></i>
                            </button>
                            <button type="button" id="chatbot-close" class="chatbot-close" aria-label="Cerrar chat" title="Cerrar">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <div id="chatbot-messages" class="chatbot-messages" role="log" aria-live="polite" aria-relevant="additions">
                        <!-- Mensajes se cargarán aquí -->
                    </div>

                    <div class="chatbot-typing" id="chatbot-typing" style="display: none;">
                        <div class="typing-indicator"><span></span><span></span><span></span></div>
                        <span>El Asistente Guía está escribiendo...</span>
                    </div>

                    <div class="chatbot-input-container">
                        <div class="chatbot-suggestions" id="chatbot-suggestions">
                            <!-- Sugerencias se cargarán dinámicamente -->
                        </div>
                        <div class="chatbot-input">
                            <textarea aria-label="Tu consulta para Hubi" id="chatbot-input" placeholder="¿Qué necesitas saber de Hub Academia?" maxlength="1200" rows="1"></textarea>
                            <button type="button" id="chatbot-send" class="chatbot-send" aria-label="Enviar consulta">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                        <div class="chatbot-disclaimer-text">Atención de plataforma. Evita compartir datos sensibles. <a href="/privacy#hubi-atencion">Privacidad</a></div>
                    </div>
                </div>
            </div>

            <button id="chatbot-toggle" class="chatbot-toggle" aria-haspopup="dialog" aria-expanded="false" aria-controls="chatbot-container" aria-label="Abrir chat del Asistente">
                <img src="/assets/hubi.png" alt="Hubi" class="chatbot-toggle-avatar">
                <span class="chatbot-notification" id="chatbot-notification" style="display: none;"></span>
            </button>
            
            <div id="chat-invitation-bubble" class="chat-invitation-bubble" aria-hidden="true" inert>
                <button type="button" class="chat-invitation-open"><span>¿En qué puedo ayudarte?</span><span>Hablar con Hubi ↗</span></button>
                <button type="button" class="chat-invitation-close" aria-label="Cerrar invitación"><i class="fas fa-times" aria-hidden="true"></i></button>
            </div>
        `;

        const targetEl = document.querySelector(this.targetSelector);
        if (targetEl) {
            targetEl.insertAdjacentHTML('beforeend', chatHTML);
        } else {
            console.error(`Target selector ${this.targetSelector} no encontrado para inyectar el Chat.`);
        }

        // Inicializar el dropdown con el estado del usuario actual
        this.updatePersonaDropdown(user);
    }

    updatePersonaDropdown(user) {
        const userTier = (user?.subscriptionTier || user?.subscription_tier || 'free').toLowerCase();
        const status = (user?.subscriptionStatus || user?.subscription_status || 'pending').toLowerCase();
        const isFree = userTier === 'free' || status !== 'active';

        const dropdown = document.getElementById('chatbot-persona-dropdown');
        if (!dropdown) return;

        // Modo Médico
        const medicineItem = dropdown.querySelector('[data-value="medicine"]');
        if (medicineItem) {
            if (isFree) {
                medicineItem.classList.add('disabled-premium');
                const titleSpan = medicineItem.querySelector('.dropdown-item-title');
                if (titleSpan) {
                    titleSpan.innerHTML = 'Modo Médico <i class="fas fa-crown premium-crown-icon" style="color:#fbbf24; font-size:0.75rem; margin-left: 6px;"></i>';
                }
            } else {
                medicineItem.classList.remove('disabled-premium');
                const titleSpan = medicineItem.querySelector('.dropdown-item-title');
                if (titleSpan) {
                    titleSpan.innerHTML = 'Modo Médico';
                }
            }
        }

        // Modo Educación
        const educationItem = dropdown.querySelector('[data-value="education"]');
        if (educationItem) {
            if (isFree) {
                educationItem.classList.add('disabled-premium');
                const titleSpan = educationItem.querySelector('.dropdown-item-title');
                if (titleSpan) {
                    titleSpan.innerHTML = 'Modo Educación <i class="fas fa-crown premium-crown-icon" style="color:#fbbf24; font-size:0.75rem; margin-left: 6px;"></i>';
                }
            } else {
                educationItem.classList.remove('disabled-premium');
                const titleSpan = educationItem.querySelector('.dropdown-item-title');
                if (titleSpan) {
                    titleSpan.innerHTML = 'Modo Educación';
                }
            }
        }
    }

    updatePersonaUI() {
        const icon = document.getElementById('chatbot-icon');
        if (icon) {
            icon.dataset.persona = this.specialization;
            if (icon.tagName === 'IMG') {
                icon.src = '/assets/hubifrente.png';
                icon.className = 'chatbot-header-avatar';
            } else {
                const classes = {
                    neutral: 'fas fa-robot',
                    medicine: 'fas fa-stethoscope',
                    education: 'fas fa-graduation-cap'
                };
                icon.className = `${classes[this.specialization] || 'fas fa-robot'} chatbot-icon-svg`;
            }
        }

        const heading = document.getElementById('chatbot-title-heading');
        if (heading) {
            heading.textContent = this.getPersonaLabel();
        }

        const trigger = document.getElementById('chatbot-persona-trigger');
        if (trigger) {
            trigger.dataset.persona = this.specialization;
        }

        // Actualizar el estado activo en el dropdown de especialidad
        const items = document.querySelectorAll('.chatbot-persona-dropdown .dropdown-item');
        items.forEach(item => {
            if (item.dataset.value === this.specialization) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Actualizar placeholder del input según modo
        this.updateInputPlaceholder();
    }

    /**
     * Actualiza el placeholder del textarea según la especialidad activa.
     */
    updateInputPlaceholder() {
        const textarea = document.getElementById('chatbot-input');
        if (!textarea) return;
        textarea.placeholder = "¿Qué necesitas saber de Hub Academia?";
    }

    

    resetVisitorChatState() {
        this.messages = [];
        const messagesContainer = document.getElementById('chatbot-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        this.addWelcomeMessage();
    }

    handleChatToggleClick() {
        this.toggleChat();
    }

    addWelcomeMessage() {
        if (this.messages.length === 0) {
            const user = window.sessionManager ? window.sessionManager.getUser() : null;
            const isRegistered = !!(user && (user.id || user.email));

            let defaultSuggestions = [
                "1. Herramientas y Ecosistema",
                "2. Planes y Mercado Pago",
                "3. Sustento Oficial y Ventajas"
            ];

            // Si el usuario NO está registrado (es visitante), se añade la 4ta opción al final
            if (!isRegistered) {
                defaultSuggestions.push("4. ¿Cómo registrarme?");
            }

            const welcomeText = `**Hola, soy Hubi.** Te ayudo a conocer Hub Academia, sus soluciones y cómo utilizar la plataforma. Escribe tu duda o elige una opción para empezar.`;

            this.addMessage(welcomeText, 'bot', { isWelcome: true });
            this.showFollowUpSuggestions(defaultSuggestions);
        }
    }

    setupEventListeners() {
        const toggleBtn = document.getElementById('chatbot-toggle');
        const closeBtn = document.getElementById('chatbot-close');

        console.log('🔄 Configurando event listeners...');

        // BOTÓN FLOTANTE - Permitir a visitantes abrir el chat
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleChatToggleClick();
            });
        }

        const bubble = document.getElementById('chat-invitation-bubble');
        bubble?.querySelector('.chat-invitation-open')?.addEventListener('click', () => this.toggleChat());
        bubble?.querySelector('.chat-invitation-close')?.addEventListener('click', () => {
            this.setInvitationVisible(false);
            sessionStorage.setItem('chat_invitation_dismissed', 'true');
        });
        const dialog = document.getElementById('chatbot-container');
        window.addEventListener('resize', () => {
            if (!this.isOpen) return;
            const modal = this.isFullScreen || innerWidth <= 750;
            dialog.setAttribute('aria-modal', String(modal));
            document.body.style.overflow = modal ? 'hidden' : this._bodyOverflow || '';
        }, { passive: true });
        dialog?.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') { event.stopPropagation(); this.closeChat(); return; }
            if (event.key !== 'Tab' || !(this.isFullScreen || innerWidth <= 750)) return;
            const controls = [...dialog.querySelectorAll('button:not(:disabled),a[href],textarea:not(:disabled)')].filter((element) => element.offsetParent !== null);
            const first = controls[0], last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        });

        // ✅ MEJORA UI/UX MÓVIL: Listener para el botón hardware 'Atrás'
        window.addEventListener('popstate', this.handlePopState);

        // BOTÓN CERRAR
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🎯 Botón cerrar clickeado');
                this.closeChat();
            });
        }

        // ✅ FASE IV: Botón Expandir
        const expandBtn = document.getElementById('chatbot-expand');
        if (expandBtn) {
            expandBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleFullScreen();
            });
        }

        // ✅ Selector de especialidad (Dropdown de Persona)
        const personaTrigger = document.getElementById('chatbot-persona-trigger');
        const personaDropdown = document.getElementById('chatbot-persona-dropdown');

        if (personaTrigger && personaDropdown) {
            personaTrigger.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                personaDropdown.classList.toggle('open');
                personaTrigger.classList.toggle('dropdown-active');
            });

            // Cerrar dropdown al hacer clic fuera
            document.addEventListener('click', (e) => {
                if (!personaTrigger.contains(e.target) && !personaDropdown.contains(e.target)) {
                    personaDropdown.classList.remove('open');
                    personaTrigger.classList.remove('dropdown-active');
                }
            });
        }

        const dropdownItems = document.querySelectorAll('.chatbot-persona-dropdown .dropdown-item');
        dropdownItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (item.classList.contains('disabled-premium')) {
                    if (personaDropdown) {
                        personaDropdown.classList.remove('open');
                    }
                    if (personaTrigger) {
                        personaTrigger.classList.remove('dropdown-active');
                    }
                    if (window.uiManager) {
                        window.uiManager.showPaywallModal('El Modo Médico y Modo Educación son exclusivos para suscriptores Premium.', 'chat');
                    }
                    return;
                }
                const newValue = item.dataset.value;
                if (personaDropdown) {
                    personaDropdown.classList.remove('open');
                }
                if (personaTrigger) {
                    personaTrigger.classList.remove('dropdown-active');
                }

                if (this.specialization === newValue) return;

                this.specialization = newValue;
                localStorage.setItem('chatbot_specialization', this.specialization);

                // Actualizar UI visualmente
                this.updatePersonaUI();

                console.log(`🎯 Especialidad cambiada a: ${this.specialization}`);

                if (window.uiManager && window.uiManager.showToast) {
                    const names = { neutral: 'Neutro', medicine: 'Médico', education: 'Educación' };
                    window.uiManager.showToast(`Modo: Experto ${names[this.specialization]}`, 'info');
                }
            });
        });

        // ✅ FASE III: Botón de "Nuevo Chat"
        const newChatBtn = document.getElementById('new-chat-btn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => this.startNewConversation());
        }

        // ✅ MEJORA RESPONSIVE: Botón para abrir el historial en móvil
        const historyToggleBtn = document.getElementById('chatbot-history-toggle');
        if (historyToggleBtn) {
            historyToggleBtn.addEventListener('click', () => {
                document.getElementById('chatbot-container').classList.toggle('history-open');
            });
        }

        // ✅ MEJORA RESPONSIVE: Listener para el overlay que cierra el historial.
        const historyOverlay = document.getElementById('chatbot-history-overlay');
        if (historyOverlay) {
            historyOverlay.addEventListener('click', () => {
                document.getElementById('chatbot-container').classList.remove('history-open');
            });
        }
        // ENVÍO DE MENSAJES Y AUTORESIZE TEXTAREA
        const sendBtn = document.getElementById('chatbot-send');
        const input = document.getElementById('chatbot-input');

        if (sendBtn && input) {
            sendBtn.addEventListener('click', () => {
                this.sendMessage();
                // Resetear textarea size
                input.style.height = 'auto';
            });

            // Auto-resize textarea
            input.addEventListener('input', function () {
                this.style.height = 'auto';
                // Calculamos max-height basado en aprox 5 líneas (120px)
                const newHeight = Math.min(this.scrollHeight, 120);
                this.style.height = newHeight + 'px';
                if (this.value === '') this.style.height = 'auto';
            });

            // Shift+Enter soporte
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                    input.style.height = 'auto'; // Resetear
                }
            });
        }

        // SUGERENCIAS RÁPIDAS - Usando delegación de eventos para mayor eficiencia
        const suggestionsContainer = document.getElementById('chatbot-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.addEventListener('click', (e) => {
                e.preventDefault();
                // Asegurarse de que el click fue en un botón de sugerencia
                if (e.target && e.target.classList.contains('suggestion-btn')) {
                    const question = e.target.dataset.question || e.target.textContent;
                    console.log('🎯 Sugerencia seleccionada:', question);
                    if (input) {
                        input.value = question;
                        this.sendMessage();
                    }
                }
            });

            // ✅ MEJORA UI/UX: Permitir scroll horizontal con la rueda del mouse (Shift opcional)
            suggestionsContainer.addEventListener('wheel', (e) => {
                if (e.deltaY !== 0) {
                    // Si el usuario mueve la rueda verticalmente, lo traducimos a horizontal
                    e.preventDefault();
                    suggestionsContainer.scrollLeft += e.deltaY;
                }
            }, { passive: false });
        }

        // ✅ FASE III: Delegación de eventos para la lista de conversaciones
        const conversationList = document.getElementById('conversation-list');
        if (conversationList) {
            conversationList.addEventListener('click', (e) => {
                const conversationItem = e.target.closest('.conversation-item');
                if (conversationItem) {
                    // ✅ MEJORA: Manejar clic en el botón de editar.
                    if (e.target.closest('.edit-conversation-btn')) {
                        e.stopPropagation(); // Evitar que se cambie de conversación.
                        this.enableTitleEditing(conversationItem);
                        return;
                    }

                    // ✅ MEJORA: Manejar clic en el botón de eliminar.
                    if (e.target.closest('.delete-conversation-btn')) {
                        e.stopPropagation();
                        this.handleDeleteConversation(conversationItem.dataset.id);
                        return;
                    }

                    // En móvil, cerrar el panel de historial después de seleccionar un chat.
                    if (window.innerWidth <= 750) {
                        document.getElementById('chatbot-container').classList.remove('history-open');
                    }
                    this.switchConversation(conversationItem.dataset.id);
                }
            });

            // ✅ NUEVO: Listener para los botones de feedback.
            const messagesContainer = document.getElementById('chatbot-messages');
            messagesContainer.addEventListener('click', (e) => {
                // 1. Manejo de Clic en Imágenes (Visor Inmersivo Retroactivo)
                const img = e.target.closest('img');
                if (img && messagesContainer.contains(img)) {
                    const ui = window.uiManager || (window.parent && window.parent.uiManager);
                    if (ui && typeof ui.showMediaViewer === 'function') {
                        // Usar la URL ya resuelta de la imagen
                        const src = img.src;
                        const title = img.alt || 'Visualizando recurso del chat';
                        console.log('🖼️ [ChatDelegation] Abriendo visor para:', src);
                        ui.showMediaViewer(src, title);
                        return; // Detener flujo para no disparar otros clics
                    }
                }

                // 2. Manejo de Feedback (Ya existente)
                const feedbackBtn = e.target.closest('.feedback-btn');
                if (feedbackBtn && !feedbackBtn.disabled) {
                    const isHelpful = feedbackBtn.dataset.helpful === 'true';
                    const parentMessage = feedbackBtn.closest('.message');
                    const query = parentMessage.dataset.query;
                    const response = parentMessage.dataset.response;
                    const messageId = parentMessage.dataset.messageId;

                    AnalyticsApiService.recordFeedback(query, response, isHelpful, messageId);

                    const feedbackContainer = feedbackBtn.closest('.feedback-container');
                    const feedbackBtns = feedbackContainer.querySelectorAll('.feedback-btn');
                    feedbackBtns.forEach(btn => btn.remove());

                    const thanksSpan = document.createElement('span');
                    thanksSpan.className = 'feedback-thanks';
                    thanksSpan.textContent = '¡Gracias!';
                    thanksSpan.style.marginRight = 'auto';
                    thanksSpan.style.fontSize = '0.85rem';
                    thanksSpan.style.color = 'var(--chat-primary)';
                    thanksSpan.style.alignSelf = 'center';
                    thanksSpan.style.opacity = '1';
                    feedbackContainer.prepend(thanksSpan);

                    setTimeout(() => {
                        thanksSpan.style.transition = 'opacity 0.5s ease';
                        thanksSpan.style.opacity = '0';
                        setTimeout(() => thanksSpan.remove(), 500);
                    }, 3000);

                    return;
                }

                // 1.5 ✅ NUEVO: Manejo de Guardar como Nota
                const saveNoteBtn = e.target.closest('.save-note-btn');
                if (saveNoteBtn && !saveNoteBtn.disabled) {
                    e.preventDefault();
                    const parentMessage = saveNoteBtn.closest('.message');
                    const responseText = parentMessage.dataset.response || parentMessage.textContent;

                    // Obtener título del chat activo o generar uno
                    const activeConv = this.conversations?.find(c => c.id == this.activeConversationId);
                    const noteTitle = activeConv?.title || 'Nota del Chat';

                    // Feedback visual inmediato
                    const icon = saveNoteBtn.querySelector('i');
                    saveNoteBtn.disabled = true;
                    icon.className = 'fas fa-bookmark';
                    icon.style.color = '#f59e0b';

                    // Llamar al API
                    window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/library/notes`, {
                        method: 'POST',
                        body: JSON.stringify({
                            title: noteTitle,
                            content: responseText,
                            sourceType: 'chat',
                            sourceConversationId: this.activeConversationId
                        })
                    }).then(res => {
                        if (res.ok) {
                            saveNoteBtn.title = '¡Guardado!';
                            // Actualizar biblioteca si está abierta
                            if (window.libraryService) window.libraryService.loadFullLibrary();
                        } else {
                            icon.className = 'far fa-bookmark';
                            icon.style.color = '';
                            saveNoteBtn.disabled = false;
                            saveNoteBtn.title = 'Error al guardar';
                        }
                    }).catch(() => {
                        icon.className = 'far fa-bookmark';
                        icon.style.color = '';
                        saveNoteBtn.disabled = false;
                    });
                    return;
                }

                // 2. ✅ INTERCEPTOR DE CLICS EN ENLACES (Navegación & Control Freemium)
                const targetEl = e.target.closest('a');
                if (targetEl && messagesContainer.contains(targetEl)) {
                    if (window.sessionManager && window.sessionManager.getUser()) {
                        const user = window.sessionManager.getUser();
                        const status = user.subscriptionStatus || user.subscription_status;
                        const usage = user.usageCount !== undefined ? user.usageCount : (user.usage_count || 0);
                        const limit = user.maxFreeLimit !== undefined ? user.maxFreeLimit : (user.max_free_limit || 10);

                        if (status === 'pending' && usage >= limit) {
                            e.preventDefault();
                            e.stopPropagation();
                            console.warn('⛔ Acceso a recurso bloqueado por límite Freemium en Chat.');
                            window.uiManager.showPaywallModal();
                            return;
                        }
                    }
                }
            });
        }

        // Mostrar burbuja de invitación de forma diferida (2.5 segundos)
        setTimeout(() => {
            const bubble = document.getElementById('chat-invitation-bubble');
            const dismissed = sessionStorage.getItem('chat_invitation_dismissed');
            if (bubble && !dismissed && !this.isOpen) {
                this.setInvitationVisible(true);
                setTimeout(() => {
                    if (!bubble.matches(':hover') && !bubble.contains(document.activeElement)) this.setInvitationVisible(false);
                }, 9000);
            }
        }, 2500);
    }

    // ✅ NUEVO: Lógica para manejar el botón físico "Atrás" en móviles
    handlePopState(e) {
        if (this.isOpen && e.state && e.state.chatbotOpen) return;
        const currentHash = window.location.hash || '';
        if (this.isOpen && (currentHash.startsWith('#op-') || currentHash === '#acceder' || currentHash === '#login')) {
            return;
        }
        if (this.isOpen && (!e.state || !e.state.chatbotOpen)) {
            console.log('🔙 Botón hardware "Atrás" detectado. Cerrando chat para prevenir salida...');
            this.forceCloseChatFromBack();
        }
    }

    setInvitationVisible(visible) {
        const bubble = document.getElementById('chat-invitation-bubble');
        if (!bubble) return;
        if (!visible && bubble.contains(document.activeElement)) {
            document.getElementById(this.isOpen ? 'chatbot-input' : 'chatbot-toggle')?.focus();
        }
        bubble.classList.toggle('active', visible);
        bubble.setAttribute('aria-hidden', String(!visible));
        bubble.inert = !visible;
    }

    toggleChat() {
        if (this.isOpen) { this.closeChat(); return; }
        const container = document.getElementById('chatbot-container');
        const toggleBtn = document.getElementById('chatbot-toggle');
        if (!container || !toggleBtn) return;
        this._returnFocus = document.activeElement;
        this._bodyOverflow = document.body.style.overflow;
        this.isOpen = true;
        container.inert = false;
        container.classList.add('open');
        container.setAttribute('aria-hidden', 'false');
        container.setAttribute('aria-modal', String(innerWidth <= 750 || this.isFullScreen));
        toggleBtn.setAttribute('aria-expanded', 'true');
        toggleBtn.style.display = 'none';
        this.setInvitationVisible(false);
        if (innerWidth <= 750 || this.isFullScreen) document.body.style.overflow = 'hidden';
        // Preserve the existing silent-close checkpoint; never re-render the library.
        this._stateBeforeChat = window.history.state;
        this._hrefBeforeChat = window.location.href;
        window.history.pushState({ chatbotOpen: true }, '', '');
        document.getElementById('chatbot-input')?.focus();
        this.hideNotification();
    }

    closeChat() {
        if (!this.isOpen) return;

        // ✅ REFACTORIZACIÓN: Cierre silencioso del chat (NO re-renderiza BIBLIOTECA).
        // Problema anterior: history.back() disparaba 'popstate', y search.js al
        // recibir el popstate con el estado PREVIO (ej. { view: 'home' }) lo
        // interpretaba como navegación legítima y re-renderizaba toda la vista.
        //
        // Solución: replaceState() sobreescribe la entrada actual del historial
        // SIN disparar 'popstate'. El chat se cierra visualmente y el historial
        // queda limpio como si el pushState del chat nunca existió.
        const currentState = window.history.state;
        if (currentState && currentState.chatbotOpen) {
            // Restaurar el estado de navegación previo silenciosamente
            window.history.replaceState(
                this._stateBeforeChat || null,
                '',
                this._hrefBeforeChat || window.location.href
            );
        }

        // Cerrar visualmente
        this.forceCloseChatFromBack();
    }

    // Función helper para cerrar visualmente sin alterar history (usado cuando history ya disparó popstate)
    forceCloseChatFromBack() {
        if (!this.isOpen) return;
        const container = document.getElementById('chatbot-container');
        const toggle = document.getElementById('chatbot-toggle');
        this.isOpen = false;
        this.isFullScreen = false;
        toggle.style.display = 'block';
        toggle.setAttribute('aria-expanded', 'false');
        const previous = this._returnFocus;
        if (previous?.isConnected && previous.getClientRects().length && !previous.closest('.chat-invitation-bubble')) previous.focus();
        else toggle.focus();
        container.classList.remove('open', 'chat-fullscreen');
        container.setAttribute('aria-hidden', 'true');
        container.setAttribute('aria-modal', 'false');
        container.inert = true;
        const expand = document.getElementById('chatbot-expand');
        expand.setAttribute('aria-pressed', 'false');
        expand.setAttribute('aria-label', 'Pantalla completa');
        expand.title = 'Pantalla completa';
        expand.querySelector('i').className = 'fas fa-expand';
        document.body.style.overflow = this._bodyOverflow || '';
    }

    toggleFullScreen() {
        const container = document.getElementById('chatbot-container');
        const expand = document.getElementById('chatbot-expand');
        if (!container || !expand) return;
        this.isFullScreen = !this.isFullScreen;
        container.classList.toggle('chat-fullscreen', this.isFullScreen);
        const modal = this.isFullScreen || innerWidth <= 750;
        container.setAttribute('aria-modal', String(modal));
        expand.setAttribute('aria-pressed', String(this.isFullScreen));
        const label = this.isFullScreen ? 'Restaurar ventana' : 'Pantalla completa';
        expand.setAttribute('aria-label', label);
        expand.title = label;
        expand.querySelector('i').className = this.isFullScreen ? 'fas fa-compress' : 'fas fa-expand';
        document.body.style.overflow = modal ? 'hidden' : this._bodyOverflow || '';
    }

    async sendMessage() {
        const input = document.getElementById('chatbot-input');
        const message = input.value.trim();

        if (!message) return;


        if (this.isSending) {
            console.log('⚠️ Mensaje ya en proceso, ignorando...');
            return;
        }

        this.isSending = true;
        input.disabled = true;
        document.getElementById('chatbot-send').disabled = true;

        // Provider fallback completes first; clear the UI safety timer after every request.
        let requestTimer;
        const timeoutPromise = new Promise((_, reject) => {
            requestTimer = setTimeout(() => reject(new Error('Timeout: El servidor tardó demasiado en responder')), 20000);
        });

        try {
            // Agregar mensaje del usuario
            this.addMessage(message, 'user');
            input.value = '';

            // Mostrar indicador de typing
            this.showTypingIndicator();

            console.log('📡 Enviando solicitud al servidor...');

            // Extraer los últimos dos intercambios de conversación previa en memoria para mantener la hilación de sesión
            const historyToSend = this.messages.slice(0, -1).slice(-4).map(msg => ({
                sender: msg.sender,
                content: String(msg.content || '').slice(0, 800)
            }));

            const requestData = {
                message: message,
                conversationId: 'ephemeral',
                specialization: 'neutral',
                history: historyToSend
            };

            const fetchPromise = window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-General-Chat': 'true'
                },
                body: JSON.stringify(requestData)
            });

            const response = await Promise.race([fetchPromise, timeoutPromise]);

            let data;
            const responseClone = response.clone();
            try {
                data = await response.json();
            } catch (e) {
                data = null;
            }

            if (!response.ok) {
                if (response.status === 429 || response.status === 400) {
                    this.addMessage(data?.error || 'Espera un momento antes de enviar otra consulta.', 'bot');
                    return;
                }
                if (response.status === 403) {
                    if (data && data.paywall) {
                        this.hideTypingIndicator();
                        window.uiManager.showPaywallModal();
                        this.addMessage('🔒 Límite de prueba alcanzado. Actualiza tu plan para continuar.', 'bot');
                        return;
                    }

                    if (data && data.error) {
                        const limitError = new Error(data.error);
                        limitError.isLimitReached = true;
                        throw limitError;
                    }
                }

                let errorDetails = `Error HTTP: ${response.status} ${response.statusText}`;
                if (data && data.error) {
                    errorDetails += ` - ${data.error}`;
                } else {
                    const textError = await responseClone.text();
                    errorDetails += ` - ${textError}`;
                }
                throw new Error(errorDetails);
            }

            this.hideTypingIndicator();


            this.addMessage(data.respuesta, 'bot', { ...data, messageId: data.messageId });

            if (data.sugerencias && data.sugerencias.length > 0) {
                this.showFollowUpSuggestions(data.sugerencias);
            }

        } catch (error) {
            console.error('❌ Error en sendMessage:', error);
            this.hideTypingIndicator();

            // ✅ MENSAJE DE ERROR ESPECÍFICO
            if (error.isLimitReached) {
                // Mensaje limpio y elegante del Tutor
                this.addMessage(`⚠️ ${error.message}`, 'bot');
                if (window.uiManager) {
                    window.uiManager.showPaywallModal(error.message, 'chat_standard');
                }
            } else {
                let errorMessage = '❌ ';

                if (error.message.includes('Timeout')) {
                    errorMessage += 'El servidor tardó demasiado en responder. ';
                } else if (error.message.includes('400')) {
                    errorMessage += 'Error en la solicitud al servidor. ';
                } else if (error.message.includes('HTTP')) {
                    errorMessage += `Error del servidor: ${error.message}. `;
                } else {
                    errorMessage += 'Error de conexión. ';
                }

                errorMessage += 'Por favor, intenta nuevamente.';
                this.addMessage(errorMessage, 'bot');
            }
        } finally {
            clearTimeout(requestTimer);
            // ✅ RESTABLECER ESTADO
            this.isSending = false;
            input.disabled = false;
            document.getElementById('chatbot-send').disabled = false;
            input.focus();

            console.log('🔄 Estado restablecido, listo para nueva consulta');
        }
    }

    // MÉTODO AÑADIDO: Para abrir el chat y hacer una pregunta desde otros componentes
    openAndAsk(question) {
        if (!this.isOpen) {
            this.toggleChat();
        }
        const input = document.getElementById('chatbot-input');
        const sendBtn = document.getElementById('chatbot-send');
        if (input) {
            input.disabled = false;
            input.value = question;
        }
        if (sendBtn) {
            sendBtn.disabled = false;
        }
        setTimeout(() => this.sendMessage(), 100);
    }

    addMessage(text, sender, metadata = {}) {
        const messagesContainer = document.getElementById('chatbot-messages');

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender} ${metadata.isWelcome ? 'welcome-message' : ''}`;

        let currentMessageId = null;

        // ✅ SOLUCIÓN: unificar la asignación del ID.
        // Los mensajes del historial vienen con `id`, los nuevos con `messageId`.
        if (sender === 'bot' && !metadata.isWelcome) {
            currentMessageId = metadata.id || metadata.messageId;
            if (currentMessageId) {
                messageDiv.dataset.messageId = currentMessageId;
            } else {
                // Fallback para mensajes de error locales que no tienen ID de la BD.
                const conversationIdentifier = this.activeConversationId || 'temp';
                this.messageIdCounter++;
                currentMessageId = `${conversationIdentifier}_${this.messageIdCounter}`;
                messageDiv.dataset.messageId = currentMessageId;
            }
        }

        // ✅ NUEVO: Guardar la consulta y la respuesta en el elemento para el portapapeles.
        messageDiv.dataset.response = text;
        if (sender === 'bot' && !metadata.isWelcome) {
            messageDiv.dataset.query = this.messages.find(m => m.sender === 'user')?.content || 'N/A';
        }

        const formattedText = this.formatMessage(text);
        let messageHTML = `<div class="message-body markdown-content">${formattedText}</div>`;

        // Agregar información de metadata para mensajes del bot
        // Intención/Confianza removed from UI as per user request.
        /*
        if (sender === 'bot' && metadata.intencion) {
            const confidencePercent = (metadata.confianza * 100).toFixed(1);
            messageHTML += `<div class="message-info">Intención: ${metadata.intencion} • Confianza: ${confidencePercent}%</div>`;
        }
        */

        // ✅ AÑADIR BOTÓN DE COPIADO PARA EL USUARIO
        if (sender === 'user') {
            messageHTML += `
                <div class="user-message-actions">
                    <button class="copy-msg-btn user-copy" title="Copiar mi mensaje" onclick="window.chatbot.copyToClipboard(this)"><i class="far fa-copy"></i></button>
                </div>`;
        }

        // ✅ AÑADIR BOTÓN DE REDIRECCIÓN SI EXISTE LA URL
        if (sender === 'bot' && metadata.redirectUrl) {
            messageHTML += `
                <div class="redirect-container">
                    <a href="${metadata.redirectUrl}" target="_blank" class="redirect-btn">Ver más detalles</a>
                </div>
            `;
        }

        // Botón CTA de Registro si es mensaje de Despedida/Cierre
        if (sender === 'bot' && (metadata.isFarewell || metadata.intencion === 'despedida_visitante')) {
            messageHTML += `
                <div class="cta-register-container">
                    <button class="btn-cta-register" type="button" onclick="if(window.uiManager && typeof window.uiManager.showAuthPromptModal === 'function'){ window.uiManager.showAuthPromptModal(); } else { window.location.href='/login?mode=register'; }">
                        Crear mi cuenta
                    </button>
                </div>`;
        }

        messageDiv.innerHTML = messageHTML;
        messagesContainer.appendChild(messageDiv);

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // ✅ FASE III: Añadir al historial local de mensajes.
        if (!metadata.isWelcome) {
            const messageObject = { sender, content: text, ...metadata };
            if (currentMessageId) {
                messageObject.messageId = currentMessageId;
            }
            this.messages.push(messageObject);
        }
    }

    formatMessage(text) {
        const content = String(text || '');
        if (window.MarkdownRenderer) return window.MarkdownRenderer.render(content);
        // Safe readable fallback on pages that do not load the study Markdown renderer.
        const escaped = document.createElement('div');
        escaped.textContent = content;
        return escaped.innerHTML
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
                const internal = /^\/(?!\/)/.test(url);
                const corporate = /^https:\/\/(?:www\.)?hubacademia\.com(?:\/|$)|^https:\/\/docentes\.hubacademia\.com(?:\/|$)/i.test(url);
                const contact = url === 'mailto:soporte@hubacademia.com';
                if (!internal && !corporate && !contact) return label;
                return `<a href="${url}" rel="noopener noreferrer">${label}</a>`;
            })
            .replace(/\n/g, '<br>');
    }
    showTypingIndicator() {
        const typingIndicator = document.getElementById('chatbot-typing');
        typingIndicator.style.display = 'flex';

        const messagesContainer = document.getElementById('chatbot-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('chatbot-typing');
        typingIndicator.style.display = 'none';
    }

    showFollowUpSuggestions(suggestions) {
        const suggestionsContainer = document.getElementById('chatbot-suggestions');
        suggestionsContainer.innerHTML = '';

        if (!suggestions || !Array.isArray(suggestions)) return;

        const user = window.sessionManager ? window.sessionManager.getUser() : null;
        const isRegistered = !!(user && (user.id || user.email));

        const filtered = suggestions.filter(s => {
            if (isRegistered && (s.includes('registrarme') || s.includes('acceder'))) {
                return false;
            }
            return true;
        });

        filtered.forEach(suggestion => {
            const button = document.createElement('button');
            button.className = 'suggestion-btn';
            button.textContent = suggestion;
            suggestionsContainer.appendChild(button);
        });
    }

    showNotification() {
        const notification = document.getElementById('chatbot-notification');
        notification.style.display = 'flex';
    }

    hideNotification() {
        const notification = document.getElementById('chatbot-notification');
        notification.style.display = 'none';
    }

    async copyToClipboard(btn) {
        try {
            const container = btn.closest('.message');
            const textToCopy = container.dataset.response || '';
            await navigator.clipboard.writeText(textToCopy);

            const icon = btn.querySelector('i');
            icon.className = 'fas fa-check';
            btn.style.color = '#10b981'; // Success Green

            setTimeout(() => {
                icon.className = 'far fa-copy';
                btn.style.color = '';
            }, 2000);
        } catch (err) {
            console.error('Error al copiar:', err);
        }
    }
}

// ✅ ELIMINADO: La inicialización ahora se centraliza en app.js para evitar duplicados y conflictos.
