/**
 * ============================================================
 * AUDIO ASSISTANT V2 - Hub Academia
 * Asistente de Voz Inteligente y Context-Aware (Premium Feature)
 * ============================================================
 * - Usa Web Speech API (gratis, nativo del navegador).
 * - Llama a /api/chat con ephemeral:true (sin guardar historial).
 * - Lee el contexto de la página actual para respuestas precisas.
 * - Reservado para usuarios Basic y Advanced.
 * - Minimizable: el audio sigue mientras lees el contenido.
 * ============================================================
 */
class AudioAssistant {
    constructor() {
        this.isOpen = false;
        this.isMinimized = false;
        this.isListening = false;
        this.isSpeaking = false;
        this.isThinking = false;
        this.sessionHistory = [];
        this.pageContext = null;
        this.currentUtterance = null;
        this.lastResponseText = ''; // Para guardar como nota

        // Web Speech APIs (Gratis e Ilimitado para el chat)
        this.synth = window.speechSynthesis || null;
        this.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
        this.recognition = null;
        this.currentUtterance = null;

        this.init();
    }

    init() {
        this._injectHTML();
        this._bindEvents();
        this._capturePageContext();
        console.log('🎙️ AudioAssistant V2 inicializado.');
    }

    // ─────────────────────────────────────────────────────────
    // 1. INYECCIÓN DEL HTML DEL PANEL
    // ─────────────────────────────────────────────────────────
    _injectHTML() {
        const html = `
            <!-- ✅ Botón Flotante del Audio Asistente -->
            <button id="audio-assistant-btn" class="audio-assistant-fab" title="Asistente de Voz IA (Premium)">
                <div class="audio-fab-waves">
                    <span></span><span></span><span></span>
                </div>
                <i class="fas fa-microphone-alt audio-fab-icon"></i>
                <div class="audio-fab-lock" id="audio-fab-lock-badge">
                    <i class="fas fa-crown"></i>
                </div>
            </button>

            <!-- ✅ Panel Principal del Asistente de Voz -->
            <div id="audio-assistant-panel" class="audio-assistant-panel" aria-label="Asistente de Voz">
                <div class="audio-panel-header">
                    <div class="audio-panel-title">
                        <div class="audio-title-icon"><i class="fas fa-headphones"></i></div>
                        <div>
                            <h3>Asistente de Voz</h3>
                            <span class="audio-context-label" id="audio-context-label">Contexto general</span>
                        </div>
                    </div>
                    <div class="audio-panel-controls">
                        <button id="audio-panel-minimize" class="audio-panel-ctrl-btn" title="Minimizar"><i class="fas fa-minus"></i></button>
                        <button id="audio-panel-close" class="audio-panel-ctrl-btn" title="Cerrar"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                <div class="audio-waveform-container">
                    <div class="audio-waveform" id="audio-waveform">
                        ${Array.from({length: 20}, (_, i) => `<div class="audio-bar" style="animation-delay: ${i * 0.05}s"></div>`).join('')}
                    </div>
                    <p class="audio-status-text" id="audio-status-text">Listo para escucharte</p>
                    <p class="audio-transcript-text" id="audio-transcript-text"></p>
                </div>
                <div class="audio-response-area" id="audio-response-area">
                    <div class="audio-response-bubble" id="audio-response-bubble">
                        <div class="audio-response-header"><i class="fas fa-robot"></i><span>Asistente IA</span></div>
                        <div class="audio-response-content" id="audio-response-text">Hola, soy tu asistente de voz. ¿En qué puedo ayudarte?</div>
                        <div class="audio-response-actions" id="audio-response-actions" style="display:none;">
                            <button class="audio-save-note-btn" id="audio-save-note-btn" title="Guardar como nota"><i class="far fa-bookmark"></i> Guardar nota</button>
                        </div>
                    </div>
                </div>
                <div class="audio-quick-actions" id="audio-quick-actions">
                    <button class="audio-quick-btn" id="audio-btn-summarize"><i class="fas fa-compress-alt"></i> Resumir página</button>
                </div>
                <div class="audio-mic-control">
                    <button id="audio-mic-btn" class="audio-mic-btn" title="Hablar con el asistente"><i class="fas fa-microphone" id="audio-mic-icon"></i></button>
                    <button id="audio-stop-btn" class="audio-stop-btn" title="Detener" style="display:none;"><i class="fas fa-stop"></i></button>
                    <p class="audio-mic-hint" id="audio-mic-hint">Toca para hablar</p>
                </div>
            </div>

            <!-- ✅ MINI PLAYER BAR (visible al minimizar, tipo Spotify) -->
            <div id="audio-mini-player" class="audio-mini-player">
                <div class="mini-player-left">
                    <div class="mini-player-icon"><i class="fas fa-headphones"></i></div>
                    <div class="mini-player-info">
                        <span class="mini-player-title" id="mini-player-title">Asistente de Voz</span>
                        <span class="mini-player-status" id="mini-player-status">En pausa</span>
                    </div>
                </div>
                <div class="mini-player-controls">
                    <button id="mini-player-mic" class="mini-ctrl-btn" title="Hablar"><i class="fas fa-microphone"></i></button>
                    <button id="mini-player-stop" class="mini-ctrl-btn mini-stop" title="Detener audio" style="display:none;"><i class="fas fa-stop"></i></button>
                    <button id="mini-player-expand" class="mini-ctrl-btn" title="Expandir"><i class="fas fa-expand-alt"></i></button>
                    <button id="mini-player-close" class="mini-ctrl-btn mini-close" title="Cerrar"><i class="fas fa-times"></i></button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
    }

    // ─────────────────────────────────────────────────────────
    // 2. CAPTURA DE CONTEXTO DE LA PÁGINA
    // ─────────────────────────────────────────────────────────
    _capturePageContext() {
        const path = window.location.pathname.toLowerCase();
        let context = { type: 'general', text: '', label: 'Contexto general', lang: 'es' };

        // 🟢 Detección de Idioma Basada en Contexto
        if (path.includes('ingles') || path.includes('english')) context.lang = 'en';
        else if (path.includes('italiano') || path.includes('italian')) context.lang = 'it';

        const resourceContentEl = document.getElementById('resource-content-body');
        if (resourceContentEl) {
            const rawText = resourceContentEl.innerText?.trim() || '';
            context.text = rawText.substring(0, 10000); 
            context.type = 'resource';
            const titleEl = document.querySelector('.resource-info h1');
            context.label = titleEl ? `Recurso: ${titleEl.innerText}` : 'Recurso académico';
            
            // Refinar idioma por título si es necesario
            const lowerTitle = context.label.toLowerCase();
            if (lowerTitle.includes('inglés') || lowerTitle.includes('english')) context.lang = 'en';
            if (lowerTitle.includes('italiano') || lowerTitle.includes('italian')) context.lang = 'it';
            
        } else if (path.includes('course')) {
            const titleEl = document.querySelector('.course-title, h1');
            context.type = 'course';
            context.label = titleEl ? `Curso: ${titleEl.innerText}` : 'Curso académico';
            
            const lowerTitle = context.label.toLowerCase();
            if (lowerTitle.includes('inglés') || lowerTitle.includes('english')) context.lang = 'en';
            if (lowerTitle.includes('italiano') || lowerTitle.includes('italian')) context.lang = 'it';

        } else if (path.includes('flashcards') || path.includes('repaso')) {
            context.type = 'study';
            context.label = 'Sesión de estudio';
        } else {
            context.label = 'Hub Academia - General';
        }

        this.pageContext = context;
        const labelEl = document.getElementById('audio-context-label');
        if (labelEl) labelEl.textContent = context.label;
        console.log(`🎙️ Contexto de audio actualizado: ${context.label} [Idioma: ${context.lang}]`);
    }

    // ─────────────────────────────────────────────────────────
    // 3. BINDING DE EVENTOS
    // ─────────────────────────────────────────────────────────
    _bindEvents() {
        const fab = document.getElementById('audio-assistant-btn');
        const closeBtn = document.getElementById('audio-panel-close');
        const minimizeBtn = document.getElementById('audio-panel-minimize');
        const micBtn = document.getElementById('audio-mic-btn');
        const stopBtn = document.getElementById('audio-stop-btn');
        const saveNoteBtn = document.getElementById('audio-save-note-btn');

        fab.addEventListener('click', () => this._handleFabClick());
        closeBtn?.addEventListener('click', () => this.close());
        minimizeBtn?.addEventListener('click', () => this.minimize());

        micBtn?.addEventListener('click', () => {
            if (this.isSpeaking) this._stopSpeaking();
            else this._startListening();
        });

        stopBtn?.addEventListener('click', () => {
            this._stopSpeaking();
            this._stopListening();
        });

        // Acción Rápida: Resumir
        document.getElementById('audio-btn-summarize')?.addEventListener('click', () => {
            this._sendToAI('Resume el contenido de esta página de manera clara, estructurada y concisa.', true);
        });

        // Guardar como nota
        saveNoteBtn?.addEventListener('click', () => this._saveAsNote());

        // ✅ MINI PLAYER BUTTONS
        document.getElementById('mini-player-mic')?.addEventListener('click', () => this._startListening());
        document.getElementById('mini-player-stop')?.addEventListener('click', () => { this._stopSpeaking(); this._stopListening(); });
        document.getElementById('mini-player-expand')?.addEventListener('click', () => this.restore());
        document.getElementById('mini-player-close')?.addEventListener('click', () => this.close());
    }

    // ─────────────────────────────────────────────────────────
    // 4. CONTROL DE ACCESO (PAYWALL)
    // ─────────────────────────────────────────────────────────
    _handleFabClick() {
        // Si está minimizado, restaurar el panel completo
        if (this.isMinimized) {
            this.restore();
            return;
        }

        const user = window.sessionManager?.getUser();

        if (!user) {
            if (window.uiManager?.checkAuthAndExecute) {
                window.uiManager.checkAuthAndExecute(() => {});
            } else {
                document.getElementById('open-login-modal')?.click();
            }
            return;
        }

        const tier = user.subscriptionTier || 'free';
        const isActive = user.subscriptionStatus === 'active';
        
        // Si es free, dejamos entrar si tiene vidas (el backend controlará el cobro)
        const usage = user.usageCount !== undefined ? user.usageCount : (user.usage_count || 0);
        const limit = user.maxFreeLimit !== undefined ? user.maxFreeLimit : (user.max_free_limit || 50);

        if (!isActive && usage >= limit) {
            this._showPaywall();
            return;
        }

        // ✅ Solo abre/cierra el panel, NO activa el micrófono automáticamente
        this.toggle();
    }

    _showPaywall() {
        if (window.uiManager?.showPaywallModal) {
            window.uiManager.showPaywallModal();
        } else if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: '<span style="color:#fbbf24;">⭐ Función Premium</span>',
                html: `
                    <p style="color:#cbd5e1;">El <strong>Asistente de Voz IA</strong> está disponible para usuarios <strong>Basic</strong> y <strong>Advanced</strong>.</p>
                    <p style="color:#94a3b8; font-size:0.9rem; margin-top:10px;">Conversa por voz con la IA mientras estudias cualquier recurso.</p>
                `,
                icon: 'info',
                background: 'rgba(15,15,15,0.97)',
                confirmButtonText: '🚀 Ver Planes',
                confirmButtonColor: '#6366f1',
                showCancelButton: true,
                cancelButtonText: 'Ahora no',
                cancelButtonColor: '#374151'
            }).then((r) => {
                if (r.isConfirmed) window.location.href = '/pricing';
            });
        }
    }

    // ─────────────────────────────────────────────────────────
    // 5. OPEN / CLOSE / MINIMIZE / RESTORE
    // ─────────────────────────────────────────────────────────
    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    open() {
        this.isOpen = true;
        this.isMinimized = false;
        const panel = document.getElementById('audio-assistant-panel');
        const fab = document.getElementById('audio-assistant-btn');
        panel?.classList.add('active');
        panel?.classList.remove('minimized');
        fab?.classList.add('panel-open');

        this._capturePageContext();

        this._setResponseHTML(`Hola, he analizado esta página. ${this.pageContext.label !== 'Contexto general' ? '¿Quieres que te la resuma o tienes alguna pregunta sobre el contenido?' : '¿En qué puedo ayudarte hoy?'}`);
    }

    close() {
        this.isOpen = false;
        this.isMinimized = false;
        this._stopSpeaking();
        this._stopListening();
        const panel = document.getElementById('audio-assistant-panel');
        const fab = document.getElementById('audio-assistant-btn');
        const miniPlayer = document.getElementById('audio-mini-player');
        panel?.classList.remove('active');
        fab?.classList.remove('panel-open', 'minimized-mode');
        miniPlayer?.classList.remove('active');
    }

    minimize() {
        this.isMinimized = true;
        const panel = document.getElementById('audio-assistant-panel');
        const fab = document.getElementById('audio-assistant-btn');
        const miniPlayer = document.getElementById('audio-mini-player');
        panel?.classList.remove('active');
        fab?.classList.remove('panel-open');
        // ✅ Mostrar mini player bar
        miniPlayer?.classList.add('active');
        this._updateMiniPlayerStatus();
    }

    restore() {
        this.isMinimized = false;
        const panel = document.getElementById('audio-assistant-panel');
        const fab = document.getElementById('audio-assistant-btn');
        const miniPlayer = document.getElementById('audio-mini-player');
        panel?.classList.add('active');
        fab?.classList.add('panel-open');
        miniPlayer?.classList.remove('active');
    }

    // ─────────────────────────────────────────────────────────
    // 6. RECONOCIMIENTO DE VOZ (INPUT)
    // ─────────────────────────────────────────────────────────
    _startListening() {
        if (!this.SpeechRecognition) {
            this._setStatus('Tu navegador no soporta reconocimiento de voz.');
            return;
        }
        if (this.isListening) return;

        this.recognition = new this.SpeechRecognition();
        this.recognition.lang = 'es-PE';
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isListening = true;
            this._setStatus('Escuchando...');
            this._setWaveformState('listening');
            document.getElementById('audio-mic-btn')?.classList.add('listening');
            // ✅ Sync mini player feedback
            if (this.isMinimized) this._updateMiniPlayerStatus();
        };

        this.recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(r => r[0].transcript)
                .join('');
            const el = document.getElementById('audio-transcript-text');
            if (el) el.textContent = transcript;

            if (event.results[0].isFinal) {
                this._stopListening();
                this._sendToAI(transcript);
            }
        };

        this.recognition.onerror = (event) => {
            console.warn('Speech Recognition Error:', event.error);
            this._setStatus(event.error === 'no-speech' ? 'No te escuché. Inténtalo de nuevo.' : 'Error de micrófono.');
            this._stopListening();
        };

        this.recognition.onend = () => {
            this.isListening = false;
            document.getElementById('audio-mic-btn')?.classList.remove('listening');
            // ✅ Sync mini player feedback
            if (this.isMinimized) this._updateMiniPlayerStatus();
        };

        this.recognition.start();
    }

    _stopListening() {
        if (this.recognition) {
            this.recognition.stop();
            this.recognition = null;
        }
        this.isListening = false;
        document.getElementById('audio-mic-btn')?.classList.remove('listening');
        if (this.isMinimized) this._updateMiniPlayerStatus();
    }

    // ─────────────────────────────────────────────────────────
    // 7. COMUNICACIÓN CON LA IA (EFÍMERO)
    // ─────────────────────────────────────────────────────────
    async _sendToAI(userMessage, autoSpeak = false) {
        if (this.isThinking) return;

        this.isThinking = true;
        this._setStatus('Pensando...');
        this._setWaveformState('thinking');
        const transcriptEl = document.getElementById('audio-transcript-text');
        if (transcriptEl) transcriptEl.textContent = userMessage;

        let contextInjection = '';
        if (this.pageContext?.text) {
            contextInjection = `\n\n[CONTEXTO COMPLETO DEL RECURSO - "${this.pageContext.label}"]\n---\n${this.pageContext.text}\n---\nINSTRUCCIONES DE ANÁLISIS PROFUNDO:\n1. ANALIZA TODO: Lee y comprende la totalidad del contexto proporcionado arriba (incluso si es extenso).\n2. SALIDA CONCISA: Aunque hayas analizado todo, tu respuesta hablada/escrita debe ser un resumen EJECUTIVO, BRILLANTE y CONCISO. No menciones todo de golpe.\n3. MEMORIA ACTIVA: Mantén todos los detalles técnicos en tu "memoria" para responder preguntas específicas, rebuscadas o complejas del usuario más adelante.\n4. REFUERZO EXTERNO: Si el usuario hace una pregunta muy técnica que no está en el resumen, utiliza tu conocimiento experto de fuentes oficiales (según la especialidad: medicina, ingeniería, idiomas, educación, etc.) para dar una respuesta completa y veraz.\n5. INTERACCIÓN: Termina siempre invitando al usuario a profundizar en temas específicos del recurso.`;
        } else {
            contextInjection = `\n\n[CONTEXTO] El usuario se encuentra en ${this.pageContext?.label || 'Hub Academia'}. Responde de forma clara, directa y estructurada. Invita a seguir conversando.`;
        }

        this.sessionHistory.push({ role: 'user', content: userMessage });

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${window.AppConfig.API_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: userMessage + contextInjection,
                    specialization: 'neutral',
                    ephemeral: true,
                    isAudio: true, // ✅ Identificador para el middleware de límites
                    history: this.sessionHistory.slice(-10)
                })
            });

            if (!response.ok) {
                if (response.status === 403) {
                    this._showPaywall();
                    return;
                }
                throw new Error(`Error ${response.status}`);
            }

            const data = await response.json();
            const aiText = data.respuesta || 'No pude generar una respuesta.';

            this.lastResponseText = aiText;
            this.sessionHistory.push({ role: 'bot', content: aiText });
            if (this.sessionHistory.length > 20) this.sessionHistory.splice(0, 2);

            this._setResponseHTML(aiText);
            this._setStatus('');
            this._setWaveformState('idle');

            // Mostrar botón de guardar nota
            const actionsEl = document.getElementById('audio-response-actions');
            if (actionsEl) actionsEl.style.display = 'flex';

            this._speak(aiText);

        } catch (error) {
            console.error('AudioAssistant API Error:', error);
            this._setStatus('Error al conectar. Intenta de nuevo.');
            this._setWaveformState('idle');
        } finally {
            this.isThinking = false;
            if (transcriptEl) transcriptEl.textContent = '';
        }
    }

    // ─────────────────────────────────────────────────────────
    // 8. SÍNTESIS DE VOZ (OUTPUT)
    // ─────────────────────────────────────────────────────────
    _speak(text) {
        if (!this.synth) return;
        this.synth.cancel();

        if (!text) return;

        // Limpieza de Markdown
        const cleanText = text
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/#{1,3} /g, '')
            .replace(/^[\*\-] /gm, '')
            .replace(/\n/g, '. ')
            .replace(/\.\.\./g, '.')
            .substring(0, 3000);

        this.currentUtterance = new SpeechSynthesisUtterance(cleanText);
        
        // Mapeo de idiomas para voces nativas
        const langMap = { 'es': 'es-PE', 'en': 'en-US', 'it': 'it-IT' };
        this.currentUtterance.lang = langMap[this.pageContext?.lang] || 'es-PE';
        
        this.currentUtterance.rate = 1.0;
        this.currentUtterance.pitch = 1.0;

        // Intentar seleccionar una voz de calidad en el navegador
        const voices = this.synth.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith(this.currentUtterance.lang.split('-')[0]) && (v.name.includes('Natural') || v.name.includes('Google')))
            || voices.find(v => v.lang.startsWith(this.currentUtterance.lang.split('-')[0]))
            || null;
        
        if (preferredVoice) this.currentUtterance.voice = preferredVoice;

        this.currentUtterance.onstart = () => {
            this.isSpeaking = true;
            this._setWaveformState('speaking');
            this._setStatus('Hablando (Voz local)...');
            document.getElementById('audio-stop-btn').style.display = 'flex';
            document.getElementById('audio-mic-btn').style.display = 'none';
            document.getElementById('audio-assistant-btn')?.classList.add('speaking');
            if (this.isMinimized) this._updateMiniPlayerStatus();
        };

        this.currentUtterance.onend = () => {
            this.isSpeaking = false;
            this._setWaveformState('idle');
            this._setStatus('');
            document.getElementById('audio-stop-btn').style.display = 'none';
            document.getElementById('audio-mic-btn').style.display = 'flex';
            document.getElementById('audio-assistant-btn')?.classList.remove('speaking');
            if (this.isMinimized) this._updateMiniPlayerStatus();
        };

        this.currentUtterance.onerror = (e) => {
            console.error('❌ Error en SpeechSynthesis:', e);
            this._stopSpeaking();
        };

        this.synth.speak(this.currentUtterance);
    }

    _stopSpeaking() {
        if (this.synth) this.synth.cancel();
        this.isSpeaking = false;
        this._setWaveformState('idle');
        this._setStatus('');
        document.getElementById('audio-assistant-btn')?.classList.remove('speaking');
        const stopBtn = document.getElementById('audio-stop-btn');
        const micBtn = document.getElementById('audio-mic-btn');
        if (stopBtn) stopBtn.style.display = 'none';
        if (micBtn) micBtn.style.display = 'flex';
    }

    // ─────────────────────────────────────────────────────────
    // 9. GUARDAR COMO NOTA
    // ─────────────────────────────────────────────────────────
    async _saveAsNote() {
        if (!this.lastResponseText) return;

        const btn = document.getElementById('audio-save-note-btn');
        const icon = btn?.querySelector('i');
        if (!btn || !icon) return;

        try {
            icon.className = 'fas fa-spinner fa-spin';

            const title = `Nota de Voz: ${this.pageContext?.label || 'Asistente IA'}`;

            const response = await fetch(`${window.AppConfig.API_URL}/api/library/notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    title: title,
                    content: this.lastResponseText,
                    sourceType: 'audio_assistant'
                })
            });

            if (!response.ok) throw new Error('Error al guardar');

            icon.className = 'fas fa-bookmark';
            btn.style.color = '#f59e0b';
            btn.classList.add('saved');
            btn.innerHTML = '<i class="fas fa-bookmark"></i> ¡Guardada!';

            if (window.libraryService) window.libraryService.loadFullLibrary();

        } catch (error) {
            console.error('Error saving audio note:', error);
            icon.className = 'fas fa-exclamation-triangle';
            setTimeout(() => {
                icon.className = 'far fa-bookmark';
                btn.innerHTML = '<i class="far fa-bookmark"></i> Guardar nota';
            }, 2000);
        }
    }

    // ─────────────────────────────────────────────────────────
    // 10. UI HELPERS
    // ─────────────────────────────────────────────────────────
    _setStatus(text) {
        const el = document.getElementById('audio-status-text');
        if (el) el.textContent = text;
    }

    _setResponseHTML(text) {
        const el = document.getElementById('audio-response-text');
        if (!el) return;

        // ✅ USAR RENDERIZADOR UNIFICADO
        let formatted = window.MarkdownRenderer ? window.MarkdownRenderer.render(text) : text.replace(/\n/g, '<br>');

        el.innerHTML = formatted;

        // Reset del botón de nota
        const btn = document.getElementById('audio-save-note-btn');
        if (btn) {
            btn.classList.remove('saved');
            btn.style.color = '';
            btn.innerHTML = '<i class="far fa-bookmark"></i> Guardar nota';
        }
    }

    _setWaveformState(state) {
        const waveform = document.getElementById('audio-waveform');
        if (!waveform) return;
        waveform.className = 'audio-waveform';
        if (state !== 'idle') waveform.classList.add(`waveform-${state}`);
    }

    refreshContext() {
        this._capturePageContext();
    }

    // ✅ Sincronizar estado del mini player
    _updateMiniPlayerStatus() {
        const statusEl = document.getElementById('mini-player-status');
        const stopBtn = document.getElementById('mini-player-stop');
        const micBtn = document.getElementById('mini-player-mic');
        if (this.isSpeaking) {
            if (statusEl) statusEl.textContent = 'Hablando...';
            if (stopBtn) stopBtn.style.display = 'flex';
            if (micBtn) micBtn.style.display = 'none';
        } else if (this.isListening) {
            if (statusEl) statusEl.textContent = 'Escuchando...';
            if (stopBtn) stopBtn.style.display = 'none';
            if (micBtn) { micBtn.style.display = 'flex'; micBtn.classList.add('listening'); }
        } else if (this.isThinking) {
            if (statusEl) statusEl.textContent = 'Pensando...';
        } else {
            if (statusEl) statusEl.textContent = 'En pausa';
            if (stopBtn) stopBtn.style.display = 'none';
            if (micBtn) { micBtn.style.display = 'flex'; micBtn.classList.remove('listening'); }
        }
    }
}

// ─────────────────────────────────────────────────────────────
// INICIALIZACIÓN GLOBAL
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    window.audioAssistant = new AudioAssistant();

    const updateLockBadge = (user) => {
        const badge = document.getElementById('audio-fab-lock-badge');
        if (!badge) return;
        const tier = user?.subscriptionTier || 'free';
        const isActive = user?.subscriptionStatus === 'active';
        badge.style.display = (!user || !isActive || tier === 'free') ? 'flex' : 'none';
    };

    if (window.sessionManager) {
        window.sessionManager.onStateChange(updateLockBadge);
        updateLockBadge(window.sessionManager.getUser());
    }
});
