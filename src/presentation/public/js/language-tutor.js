/**
 * Standalone Tutor Conversacional IA (CCI) JS Controller
 * Completely isolated from simulator exam configurations.
 */

(function () {
    let cciChatHistory = [];
    let cciInitialized = false;
    let recognition = null;
    let isRecording = false;

    // Configuración por defecto si no existe en localStorage
    const DEFAULT_CONFIG = {
        languageCode: 'en-US',
        cefrLevel: 'A1',
        autoSend: true
    };

    // Mensajes de bienvenida del tutor
    const welcomeMessages = {
        'en-US': {
            A1: "Hello! I am your AI language tutor. Let's practice basic English (USA) together. How are you?",
            A2: "Hello! I am your AI language tutor. Let's practice English (USA) together. What is your name and where are you from?",
            B1: "Hello! I'm your AI language tutor. Let's practice English (USA) at a B1 intermediate level. What topics would you like to discuss today?",
            B2: "Hello! I'm your AI language tutor. Let's practice English (USA) at a B2 upper-intermediate level. Tell me about your professional or academic goals.",
            C1: "Hello! I'm your AI language tutor. Let's practice English (USA) at a C1 advanced level. Let's discuss a complex topic, like the impact of AI on technology.",
            C2: "Hello! I'm your AI language tutor. Let's practice English (USA) at a C2 mastery level. Let's discuss any highly complex topic or specialized area of your choice."
        },
        'en-GB': {
            A1: "Hello! I am your AI language tutor. Let's practice basic English (UK) together. How are you?",
            A2: "Hello! I am your AI language tutor. Let's practice English (UK) together. What is your name and where are you from?",
            B1: "Hello! I'm your AI language tutor. Let's practice English (UK) at a B1 intermediate level. What topics would you like to discuss today?",
            B2: "Hello! I'm your AI language tutor. Let's practice English (UK) at a B2 upper-intermediate level. Tell me about your professional or academic goals.",
            C1: "Hello! I'm your AI language tutor. Let's practice English (UK) at a C1 advanced level. Let's discuss a complex topic, like the impact of AI on technology.",
            C2: "Hello! I'm your AI language tutor. Let's practice English (UK) at a C2 mastery level. Let's discuss any highly complex topic or specialized area of your choice."
        },
        'it-IT': {
            A1: "Ciao! Sono il tuo tutor di italiano AI. Pratichiamo l'italiano di base insieme. Come stai?",
            A2: "Ciao! Sono il tuo tutor di italiano AI. Pratichiamo l'italiano insieme. Come ti chiami e di dove sei?",
            B1: "Ciao! Sono il tuo tutor di italiano AI. Pratichiamo l'italiano a livello intermedio B1. Di cosa ti piacerebbe parlare oggi?",
            B2: "Ciao! Sono il tuo tutor di italiano AI. Pratichiamo l'italiano a livello intermedio-alto B2. Raccontami dei tuoi obiettivi professionali o accademici.",
            C1: "Ciao! Sono il tuo tutor di italiano AI. Pratichiamo l'italiano a livello avanzato C1. Discutiamo di un argomento complesso, come l'impatto dell'intelligenza artificiale.",
            C2: "Ciao! Sono il tuo tutor di italiano AI. Pratichiamo l'italiano a livello di padronanza C2. Scegli pure un argomento altamente specializzato o complesso da approfondire."
        }
    };

    function getTutorConfig() {
        try {
            const saved = localStorage.getItem('langTutorConfig');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error("Error reading langTutorConfig:", e);
        }
        return DEFAULT_CONFIG;
    }

    function saveTutorConfig(config) {
        try {
            localStorage.setItem('langTutorConfig', JSON.stringify(config));
        } catch (e) {
            console.error("Error saving langTutorConfig:", e);
        }
    }

    function initPage() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = '/simulators?domain=idiomas&authPrompt=true';
            return;
        }

        // Mostrar el contenido y ocultar el loader
        const loadingEl = document.getElementById('loading');
        const contentEl = document.getElementById('tutor-content');
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.style.display = 'block';

        initCCI();
    }

    function initCCI() {
        const langSelect = document.getElementById('cci-lang-select');
        const levelSelect = document.getElementById('cci-level-select');
        const sendBtn = document.getElementById('cci-send-btn');
        const userInput = document.getElementById('cci-user-input');
        const autoSendCheck = document.getElementById('cci-auto-send-check');

        if (!langSelect || !levelSelect || !sendBtn || !userInput) return;

        // Cargar configuración guardada
        const config = getTutorConfig();
        langSelect.value = config.languageCode || 'en-US';
        levelSelect.value = config.cefrLevel || 'A1';
        if (autoSendCheck) {
            autoSendCheck.checked = config.autoSend !== undefined ? config.autoSend : true;
        }

        // Evitar doble binding
        if (!cciInitialized) {
            cciInitialized = true;

            const handleSelectChange = () => {
                const newConfig = {
                    languageCode: langSelect.value,
                    cefrLevel: levelSelect.value,
                    autoSend: autoSendCheck ? autoSendCheck.checked : true
                };
                saveTutorConfig(newConfig);

                // Cancelar cualquier audio en reproducción
                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                }

                // Limpiar historial y reiniciar mensaje de bienvenida
                cciChatHistory = [];
                renderWelcomeMessage();
            };

            langSelect.addEventListener('change', handleSelectChange);
            levelSelect.addEventListener('change', handleSelectChange);
            if (autoSendCheck) {
                autoSendCheck.addEventListener('change', handleSelectChange);
            }

            sendBtn.addEventListener('click', () => sendCCIMessage(false));
            
            const micBtn = document.getElementById('cci-mic-btn');
            if (micBtn) {
                micBtn.addEventListener('click', toggleCCIRecognition);
            }

            userInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    sendCCIMessage(false);
                }
            });
        }

        // Renderizar bienvenida inicial
        if (cciChatHistory.length === 0) {
            renderWelcomeMessage();
        }
    }

    function renderWelcomeMessage() {
        const langSelect = document.getElementById('cci-lang-select');
        const levelSelect = document.getElementById('cci-level-select');
        const msgContainer = document.getElementById('cci-messages');
        if (!langSelect || !levelSelect || !msgContainer) return;

        const lang = langSelect.value;
        const level = levelSelect.value;
        const welcomeText = (welcomeMessages[lang] && welcomeMessages[lang][level])
            ? welcomeMessages[lang][level]
            : `Hello! Let's practice English.`;

        msgContainer.innerHTML = '';
        appendCCIMessage('assistant', welcomeText, null, lang);
    }

    function appendCCIMessage(role, content, corrections = null, lang = 'en-US') {
        const msgContainer = document.getElementById('cci-messages');
        if (!msgContainer) return;

        const msgDiv = document.createElement('div');
        msgDiv.className = `cci-message ${role === 'user' ? 'user-msg' : 'bot-msg'}`;

        let html = '';

        if (role === 'assistant' && corrections && corrections.length > 0) {
            html += `
                <div class="cci-correction-card">
                    <h5><i class="fas fa-lightbulb"></i> Corrección de Idioma</h5>
                    ${corrections.map(c => `
                        <div class="correction-item" style="margin-bottom:0.5rem;">
                            <div><span class="tag-wrong">Original:</span> <code class="txt-wrong">"${c.original}"</code></div>
                            <div style="margin-top:0.25rem;"><span class="tag-right">Corregido:</span> <code class="txt-right">"${c.corrected}"</code></div>
                            <p class="correction-explanation"><strong>Explicación:</strong> ${c.explanation}</p>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        if (role === 'user') {
            html += `<div class="cci-message-text">${content}</div>`;
        } else {
            const escapedText = content.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            html += `
                <div class="cci-message-text">${content}</div>
                <button class="btn-message-tts" onclick="window.playLanguageTTS(this, '${escapedText}', '${lang}')">
                    <i class="fas fa-volume-up"></i> Escuchar
                </button>
            `;
        }

        msgDiv.innerHTML = html;
        msgContainer.appendChild(msgDiv);
        
        // Auto scroll
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }

    function toggleCCIRecognition() {
        const micBtn = document.getElementById('cci-mic-btn');
        const userInput = document.getElementById('cci-user-input');
        const langSelect = document.getElementById('cci-lang-select');
        
        if (!micBtn || !userInput || !langSelect) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Tu navegador no soporta reconocimiento de voz nativo (Prueba con Google Chrome o Microsoft Edge).");
            return;
        }

        if (isRecording) {
            if (recognition) recognition.stop();
            return;
        }

        recognition = new SpeechRecognition();
        recognition.lang = langSelect.value || 'en-US';
        recognition.continuous = false;
        recognition.interimResults = true;

        let finalTranscript = '';
        const originalPlaceholder = userInput.placeholder;

        recognition.onstart = () => {
            isRecording = true;
            micBtn.classList.add('recording');
            const micIcon = micBtn.querySelector('i');
            if (micIcon) {
                micIcon.className = 'fas fa-microphone-slash';
            }
            userInput.placeholder = "Escuchando... habla ahora...";
            userInput.value = '';
            
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            userInput.value = finalTranscript || interimTranscript;
        };

        recognition.onend = () => {
            isRecording = false;
            micBtn.classList.remove('recording');
            const micIcon = micBtn.querySelector('i');
            if (micIcon) {
                micIcon.className = 'fas fa-microphone';
            }
            userInput.placeholder = originalPlaceholder;

            const text = userInput.value.trim();
            if (text) {
                const autoSendCheck = document.getElementById('cci-auto-send-check');
                const autoSend = autoSendCheck ? autoSendCheck.checked : true;
                if (autoSend) {
                    sendCCIMessage(true);
                }
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            isRecording = false;
            micBtn.classList.remove('recording');
            const micIcon = micBtn.querySelector('i');
            if (micIcon) {
                micIcon.className = 'fas fa-microphone';
            }
            userInput.placeholder = originalPlaceholder;
        };

        recognition.start();
    }

    async function sendCCIMessage(isVoice = false) {
        const userInput = document.getElementById('cci-user-input');
        const sendBtn = document.getElementById('cci-send-btn');
        const langSelect = document.getElementById('cci-lang-select');
        const levelSelect = document.getElementById('cci-level-select');

        if (!userInput || !sendBtn || !langSelect || !levelSelect) return;

        const message = userInput.value.trim();
        if (!message) return;

        const lang = langSelect.value;
        const level = levelSelect.value;

        // Agregar mensaje a la UI
        appendCCIMessage('user', message);
        userInput.value = '';

        // Deshabilitar controles
        userInput.disabled = true;
        sendBtn.disabled = true;
        const originalBtnHtml = sendBtn.innerHTML;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        // Indicador de escritura
        const msgContainer = document.getElementById('cci-messages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'cci-message bot-msg cci-typing-indicator';
        typingDiv.innerHTML = `<div class="cci-message-text"><i class="fas fa-ellipsis-h fa-pulse"></i> Tutor está respondiendo...</div>`;
        msgContainer.appendChild(typingDiv);
        msgContainer.scrollTop = msgContainer.scrollHeight;

        try {
            const response = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/languages/chat`, {
                method: 'POST',
                body: JSON.stringify({
                    message,
                    languageCode: lang,
                    cefrLevel: level,
                    history: cciChatHistory
                })
            });

            typingDiv.remove();

            if (!response.ok) {
                if (response.status === 403) {
                    if (window.uiManager && typeof window.uiManager.showPaywallModal === 'function') {
                        window.uiManager.showPaywallModal(null, 'languages');
                    } else {
                        alert('Has alcanzado tus límites del chat de tutoría en la versión gratuita.');
                    }
                    userInput.disabled = false;
                    sendBtn.disabled = false;
                    sendBtn.innerHTML = originalBtnHtml;
                    return;
                }
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            appendCCIMessage('assistant', data.response, data.corrections, lang);

            cciChatHistory.push({ role: 'user', content: message });
            cciChatHistory.push({ role: 'assistant', content: data.response });

            if (isVoice) {
                const msgContainer = document.getElementById('cci-messages');
                if (msgContainer && msgContainer.lastElementChild) {
                    const playBtn = msgContainer.lastElementChild.querySelector('.btn-message-tts');
                    if (playBtn) {
                        window.playLanguageTTS(playBtn, data.response, lang);
                    }
                }
            }

            if (window.sessionManager && typeof window.sessionManager.refreshUser === 'function') {
                window.sessionManager.refreshUser().catch(() => {});
            }

        } catch (err) {
            console.error("Error sending message to CCI:", err);
            typingDiv.remove();
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'cci-message bot-msg';
            errorDiv.innerHTML = `<div class="cci-message-text" style="color: #ef4444;"><i class="fas fa-exclamation-circle"></i> No se pudo enviar el mensaje. Verifica tu conexión e intenta de nuevo.</div>`;
            msgContainer.appendChild(errorDiv);
            msgContainer.scrollTop = msgContainer.scrollHeight;
        } finally {
            userInput.disabled = false;
            sendBtn.disabled = false;
            sendBtn.innerHTML = originalBtnHtml;
            userInput.focus();
        }
    }

    // Registrar función global TTS
    window.playLanguageTTS = function (btn, text, lang) {
        const icon = btn.querySelector('i');
        if (!icon) return;

        if (!('speechSynthesis' in window)) {
            console.warn("Speech Synthesis not supported in this browser.");
            alert("Tu navegador no soporta síntesis de voz local.");
            return;
        }

        if (window.speechSynthesis.speaking && btn.dataset.playing === 'true') {
            window.speechSynthesis.cancel();
            btn.dataset.playing = 'false';
            icon.className = 'fas fa-volume-up';
            return;
        }

        window.speechSynthesis.cancel();
        
        document.querySelectorAll('.btn-message-tts').forEach(b => {
            b.dataset.playing = 'false';
            const i = b.querySelector('i');
            if (i) i.className = 'fas fa-volume-up';
        });

        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        
        let voice = voices.find(v => v.lang === lang || v.lang.replace('_', '-') === lang);
        if (!voice) {
            const langPrefix = lang.split('-')[0];
            voice = voices.find(v => v.lang.startsWith(langPrefix));
        }
        
        if (voice) {
            utterance.voice = voice;
        }
        
        utterance.lang = lang;
        utterance.rate = 0.95;
        
        utterance.onstart = () => {
            btn.dataset.playing = 'true';
            icon.className = 'fas fa-pause';
        };

        utterance.onend = () => {
            btn.dataset.playing = 'false';
            icon.className = 'fas fa-volume-up';
        };

        utterance.onerror = (e) => {
            // No loguear como error si fue interrumpido o cancelado manualmente (por ejemplo, al pausar o reproducir otro)
            if (e.error !== 'interrupted' && e.error !== 'canceled') {
                console.error("SpeechSynthesis error:", e);
            }
            btn.dataset.playing = 'false';
            icon.className = 'fas fa-volume-up';
        };

        window.speechSynthesis.speak(utterance);
    };

    // Inicializar al cargar el DOM o si la sesión cambia
    document.addEventListener('DOMContentLoaded', initPage);

    // Si sessionManager notifica cambio de estado, forzar init por seguridad
    if (window.sessionManager && typeof window.sessionManager.onStateChange === 'function') {
        window.sessionManager.onStateChange(() => {
            if (!cciInitialized && localStorage.getItem('authToken')) {
                initPage();
            }
        });
    }
})();
