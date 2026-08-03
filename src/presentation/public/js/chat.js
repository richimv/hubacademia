class ChatComponent {
    constructor(options = {}) {
        this.isOpen = false;
        this.isSending = false;
        this.activeConversationId = null;
        this.messages = [];
        this.conversations = [];
        this.messageIdCounter = 0;
        this.specialization = localStorage.getItem('chatbot_specialization') || 'neutral'; // ✅ Por defecto Neutro

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
                    toggleBtn.style.display = 'block';
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
        return 'Asistente Guía';
    }

    createChatInterface() {
        const user = window.sessionManager ? window.sessionManager.getUser() : null;

        const chatHTML = `
            <div id="chatbot-container" class="chatbot-container" role="dialog" aria-modal="true" aria-hidden="true">
                <div class="chatbot-main-panel" style="width: 100%;">
                    <div class="chatbot-header">
                        <div class="chatbot-title-selector" style="cursor: default;" title="Asistente Guía Hub Academia">
                            <img id="chatbot-icon" src="/assets/hubifrente.png" alt="Hubi" class="chatbot-header-avatar">
                            <h3 id="chatbot-title-heading" class="chatbot-title-heading">Asistente Guía Hub Academia</h3>
                        </div>
                        <div class="chatbot-header-actions" style="display:flex; gap:0.5rem; align-items:center;">
                            <button id="chatbot-expand" class="chatbot-expand" aria-label="Pantalla completa" title="Pantalla completa">
                                <i class="fas fa-expand"></i>
                            </button>
                            <button id="chatbot-close" class="chatbot-close" aria-label="Cerrar chat" title="Cerrar">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <div id="chatbot-messages" class="chatbot-messages">
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
                            <textarea id="chatbot-input" placeholder="Ingrese su consulta..." maxlength="5000" rows="1"></textarea>
                            <button id="chatbot-send" class="chatbot-send">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <button id="chatbot-toggle" class="chatbot-toggle" aria-haspopup="true" aria-expanded="false" aria-controls="chatbot-container" aria-label="Abrir chat del Asistente">
                <img src="/assets/hubi.png" alt="Hubi" class="chatbot-toggle-avatar">
                <span class="chatbot-notification" id="chatbot-notification" style="display: none;"></span>
            </button>
            
            <!-- Burbuja de Invitación animada (Fuera del botón para fluidez extrema) -->
            <div id="chat-invitation-bubble" class="chat-invitation-bubble">
                <img src="/assets/hubifrente.png" alt="Hubi" class="chat-invitation-avatar">
                <span class="chat-invitation-text">¿Tienes alguna duda? ¡Pregúntame!</span>
                <button type="button" class="chat-invitation-close" aria-label="Cerrar invitación" onclick="event.stopPropagation(); document.getElementById('chat-invitation-bubble').classList.remove('active'); sessionStorage.setItem('chat_invitation_dismissed', 'true');">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        const targetEl = document.querySelector(this.targetSelector);
        if (targetEl) {
            targetEl.insertAdjacentHTML('beforeend', chatHTML);
        } else {
            console.error(`Target selector ${this.targetSelector} no encontrado para inyectar el Chat.`);
        }

        this.loadChatStyles();

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

    loadChatStyles() {
        // Esta función ya no es necesaria, los estilos están en styles.css
        // Se mantiene la función vacía para no romper la llamada en init()
        console.log('🎨 Estilos del chat cargados desde CSS centralizado.');
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
        const placeholders = {
            neutral: "Escribe tu pregunta aquí...",
            medicine: "Escribe tu pregunta aquí...",
            education: "Escribe tu pregunta aquí..."
        };
        textarea.placeholder = placeholders[this.specialization] || "Escribe tu pregunta aquí...";
    }

    getVisitorDailyData() {
        const today = new Date().toISOString().split('T')[0];
        try {
            const stored = localStorage.getItem('visitor_general_chat_daily_v1');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.date === today) {
                    return parsed;
                }
            }
        } catch (e) {}
        const newData = { date: today, count: 0 };
        localStorage.setItem('visitor_general_chat_daily_v1', JSON.stringify(newData));
        return newData;
    }

    incrementVisitorDailyCount() {
        const data = this.getVisitorDailyData();
        data.count += 1;
        localStorage.setItem('visitor_general_chat_daily_v1', JSON.stringify(data));
        return data.count;
    }

    setVisitorLockState(isLocked = false) {
        const input = document.getElementById('chatbot-input');
        const sendBtn = document.getElementById('chatbot-send');
        if (input) {
            input.disabled = false;
            input.placeholder = 'Ingrese su consulta...';
        }
        if (sendBtn) {
            sendBtn.disabled = false;
        }
    }

    resetVisitorChatState() {
        this.messages = [];
        const messagesContainer = document.getElementById('chatbot-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        this.setVisitorLockState(false);
        this.addWelcomeMessage();
    }

    handleChatToggleClick() {
        this.toggleChat();
    }

    addWelcomeMessage() {
        if (this.messages.length === 0) {
            const user = window.sessionManager ? window.sessionManager.getUser() : null;
            const isRegistered = !!(user && (user.id || user.email));

            let optionsMarkdown = `1. **🚀 Servicios y Simuladores**\n2. **💳 Planes y Precios**\n3. **💡 Sustento Oficial y Ventajas**`;
            let defaultSuggestions = [
                "1. 🚀 Servicios y Simuladores",
                "2. 💳 Planes y Precios",
                "3. 💡 Sustento Oficial y Ventajas"
            ];

            // Si el usuario NO está registrado (es visitante), se añade la 4ta opción al final
            if (!isRegistered) {
                optionsMarkdown += `\n4. **🔑 ¿Cómo registrarme?**`;
                defaultSuggestions.push("4. 🔑 ¿Cómo registrarme?");
            }

            const welcomeText = `**¡Hola! Soy tu guía de Hub Academia.**
Te doy la bienvenida. Estoy aquí para orientarte sobre la plataforma.

**Ingrese el número de su consulta en la caja de texto inferior:**

${optionsMarkdown}`;

            this.addMessage(welcomeText, 'bot', { isWelcome: true });
            this.showFollowUpSuggestions(defaultSuggestions);
            this.setVisitorLockState(false);
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

        // BURBUJA DE INVITACIÓN - Clic abre el chat
        const bubbleEl = document.getElementById('chat-invitation-bubble');
        if (bubbleEl) {
            bubbleEl.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleChatToggleClick();
            });
        }

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
                        const limit = user.maxFreeLimit !== undefined ? user.maxFreeLimit : (user.max_free_limit || 20);

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
                bubble.classList.add('active');
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

    toggleChat() {
        this.isOpen = !this.isOpen;
        const container = document.getElementById('chatbot-container');
        const toggleBtn = document.getElementById('chatbot-toggle');

        container.classList.toggle('open', this.isOpen);
        // Actualizar atributos ARIA para accesibilidad
        container.setAttribute('aria-hidden', !this.isOpen);
        toggleBtn.setAttribute('aria-expanded', this.isOpen);

        if (this.isOpen) {
            // Ocultar burbuja al abrir
            const bubble = document.getElementById('chat-invitation-bubble');
            if (bubble) bubble.classList.remove('active');

            // ✅ Fix OVERSCROLL: Si el usuario usa móvil, bloquear scroll de body siempre por precaución
            if (window.innerWidth <= 750 || this.isFullScreen) {
                document.body.style.overflow = 'hidden';
            }

            // ✅ UX MÓVIL: Guardamos el estado de navegación actual ANTES de pushear
            // el checkpoint del chat. Así al cerrar con la X podemos restaurarlo
            // con replaceState (silencioso) en vez de history.back() (ruidoso).
            if (window.history && window.history.pushState) {
                this._stateBeforeChat = window.history.state;
                this._hrefBeforeChat = window.location.href;
                window.history.pushState({ chatbotOpen: true }, '', '');
            }

            // ✅ CORRECCIÓN: Ocultar el botón flotante solo en vista móvil.
            if (window.innerWidth <= 750) {
                toggleBtn.style.display = 'none';
            }
            document.getElementById('chatbot-input').focus();
            this.hideNotification();
            toggleBtn.setAttribute('aria-label', 'Cerrar chat del Asistente');
        } else {
            // ✅ CORRECCIÓN: Devolver el foco al botón principal ANTES de hacer otros cambios.
            // Esto evita el error de accesibilidad al cerrar el chat.
            toggleBtn.focus();
            toggleBtn.style.display = 'block';
            toggleBtn.setAttribute('aria-label', 'Abrir chat del Asistente');
        }
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

        // 1. Mostrar el botón de nuevo (si estamos en móvil se ocultó)
        // ✅ DEBE hacerse ANTES de enfocar para que el focus funcione
        const toggleBtn = document.getElementById('chatbot-toggle');
        if (toggleBtn) {
            toggleBtn.style.display = 'block';
            toggleBtn.focus();
            toggleBtn.setAttribute('aria-expanded', 'false');
            toggleBtn.setAttribute('aria-label', 'Abrir chat del Asistente');
        }

        // 2. Ocultar el contenedor del chat.
        this.isOpen = false;
        const container = document.getElementById('chatbot-container');
        container.classList.remove('open');
        container.setAttribute('aria-hidden', 'true');

        // Liberar el scroll del body
        document.body.style.overflow = '';
    }

    toggleFullScreen() {
        this.isFullScreen = !this.isFullScreen;
        const container = document.getElementById('chatbot-container');
        const expandBtn = document.getElementById('chatbot-expand');
        const icon = expandBtn.querySelector('i');

        if (this.isFullScreen) {
            container.classList.add('chat-fullscreen');
            icon.classList.remove('fa-expand');
            icon.classList.add('fa-compress');
            // Bloquear scroll trasero agresivamente en PC y móvil
            document.body.style.overflow = 'hidden';
            expandBtn.setAttribute('aria-label', 'Salir de pantalla completa');
            expandBtn.setAttribute('title', 'Restaurar ventana');
        } else {
            container.classList.remove('chat-fullscreen');
            icon.classList.remove('fa-compress');
            icon.classList.add('fa-expand');
            // Restaurar scroll si es PC y no está en modo normal
            if (window.innerWidth > 750) {
                document.body.style.overflow = '';
            }
            expandBtn.setAttribute('aria-label', 'Pantalla completa');
            expandBtn.setAttribute('title', 'Pantalla completa');

            // Reparar UI si hay overflow en base a resize
            const input = document.getElementById('chatbot-input');
            if (input) input.style.height = 'auto';
        }
    }

    async sendMessage() {
        const input = document.getElementById('chatbot-input');
        const message = input.value.trim();

        if (!message) return;

        const user = window.sessionManager ? window.sessionManager.getUser() : null;
        const isLogged = !!user;

        console.log('💬 Enviando mensaje:', message);

        if (this.isSending) {
            console.log('⚠️ Mensaje ya en proceso, ignorando...');
            return;
        }

        this.isSending = true;
        input.disabled = true;
        document.getElementById('chatbot-send').disabled = true;

        // ✅ TIMEOUT de seguridad (60 segundos)
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout: El servidor tardó demasiado en responder')), 60000);
        });

        try {
            // Agregar mensaje del usuario
            this.addMessage(message, 'user');
            input.value = '';

            // Mostrar indicador de typing
            this.showTypingIndicator();

            console.log('📡 Enviando solicitud al servidor...');

            // Extraer los últimos 10 turnos de conversación previa en memoria para mantener la hilación de sesión
            const historyToSend = this.messages.slice(0, -1).slice(-10).map(msg => ({
                sender: msg.sender,
                content: msg.content
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

            console.log('✅ Respuesta recibida del servidor:', data);

            this.addMessage(data.respuesta, 'bot', { ...data, messageId: data.messageId });

            if (data.sugerencias && data.sugerencias.length > 0) {
                this.showFollowUpSuggestions(data.sugerencias);
            }

            // Incrementar contador diario de visitante si no está autenticado
            if (!isLogged) {
                const newCount = this.incrementVisitorDailyCount();

                // Si se alcanzaron las 2 consultas gratuitas, bloquear suavemente el input para la siguiente interacción
                if (newCount >= 2) {
                    this.setVisitorLockState(true);
                }
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
        this.setVisitorLockState(false);
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
                <div class="redirect-container" style="margin-top: 10px;">
                    <a href="${metadata.redirectUrl}" target="_blank" class="redirect-btn">Ver más detalles</a>
                </div>
            `;
        }

        // Botón CTA de Registro si es mensaje de Despedida/Cierre
        if (sender === 'bot' && (metadata.isFarewell || metadata.intencion === 'despedida_visitante')) {
            messageHTML += `
                <div class="cta-register-container" style="margin-top: 12px; margin-bottom: 6px; text-align: center;">
                    <button class="btn-cta-register" style="background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%); color: #000; font-weight: 700; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease; font-size: 0.9rem;" onclick="if(window.uiManager && typeof window.uiManager.showAuthPromptModal === 'function'){ window.uiManager.showAuthPromptModal(); } else { window.location.href='/register'; }">
                        ✨ Crear Cuenta Gratis (20 Vidas de Prueba)
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
        // ✅ SAFETY NET: Si el texto es un JSON crudo de la IA (ej: {"intencion":..., "respuesta":...}),
        // extraer solo el campo "respuesta" para mostrar al usuario.
        if (typeof text === 'string' && text.trimStart().startsWith('{')) {
            try {
                const parsed = JSON.parse(text);
                if (parsed && parsed.respuesta) {
                    text = parsed.respuesta;
                    console.log('🛡️ JSON Safety Net: Extraído campo "respuesta" de JSON crudo.');
                }
            } catch (e) {
                // No es JSON válido, continuar con el texto original
            }
        }

        // Expresión regular para detectar URLs (absolutas y relativas que empiezan con /)
        const urlRegex = /(https?:\/\/[^\s]+)|(\B\/[^\s]+)/g;
        // ✅ SOLUCIÓN: La regex ahora captura el formato `* [type:ID] Texto` y `[type:ID] Texto`.
        // Soporta: [career:1], [course:2], [topic:3]
        const navRegex = /\*?\s*\[(career|course|topic):(\d+)\]\s*([^\n<]+)/g;

        const formatted = window.MarkdownRenderer ? window.MarkdownRenderer.render(text) : text.replace(/\n/g, '<br>');

        return formatted
            // ✅ MEJORA: Convertir URLs en enlaces clickeables (Soporta absolutas y relativas).
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>`)
            // ✅ NUEVO: Convertir enlaces de navegación internos en botones.
            .replace(navRegex, (match, type, id, text) => {
                const numericId = parseInt(id, 10);
                const trimmedText = text.trim();
                let functionCall = '';

                if (type === 'career') {
                    // ✅ FIX: Redirigir a la página real de carrera (MPA) para asegurar el diseño correcto.
                    functionCall = `window.location.href = 'career?id=${numericId}'`;
                } else if (type === 'course') {
                    // ✅ FIX: Redirigir a la página real de curso (MPA).
                    functionCall = `window.location.href = 'course?id=${numericId}'`;
                } else if (type === 'topic') {
                    functionCall = `window.location.href = '/?q=tema:${numericId}'`;
                }

                return `<button class="chat-nav-button" onclick="${functionCall}">${trimmedText}</button>`;
            });
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