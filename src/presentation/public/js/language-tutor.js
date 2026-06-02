/**
 * Standalone Tutor Conversacional IA (CCI) JS Controller
 * Completely isolated from simulator exam configurations.
 */

(function () {
    let cciChatHistory = [];
    let cciInitialized = false;
    let welcomeMessagePlayed = false;

    // Configuración por defecto si no existe en localStorage
    const DEFAULT_CONFIG = {
        languageCode: 'en-US',
        cefrLevel: 'A1',
        listeningMode: false
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
        const listeningModeCheck = document.getElementById('cci-listening-mode-check');

        if (!langSelect || !levelSelect || !sendBtn || !userInput) return;

        // Cargar configuración guardada
        const config = getTutorConfig();
        langSelect.value = config.languageCode || 'en-US';
        levelSelect.value = config.cefrLevel || 'A1';
        if (listeningModeCheck) {
            listeningModeCheck.checked = config.listeningMode !== undefined ? config.listeningMode : false;
        }

        // Evitar doble binding
        if (!cciInitialized) {
            cciInitialized = true;

            const handleSelectChange = () => {
                const newConfig = {
                    languageCode: langSelect.value,
                    cefrLevel: levelSelect.value,
                    listeningMode: listeningModeCheck ? listeningModeCheck.checked : false
                };
                saveTutorConfig(newConfig);

                // Cancelar cualquier audio en reproducción y detener micrófono
                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                }
                if (typeof trainerRecording !== 'undefined' && trainerRecording && trainerRecognition) {
                    trainerRecognition.stop();
                }

                // Limpiar historial y reiniciar mensaje de bienvenida
                cciChatHistory = [];
                renderWelcomeMessage();
                
                // Limpiar historial de exclusión del Speaking Trainer
                sessionStorage.removeItem('hubacademia_speaking_history');
                
                // Si la pestaña de speaking está activa, reiniciar/recargar el ejercicio
                const tabSpeaking = document.getElementById('cci-tab-speaking');
                if (tabSpeaking && tabSpeaking.classList.contains('active')) {
                    initSpeakingTrainer();
                    resetSpeakingTrainer();
                    const inputMode = document.getElementById('speaking-input-mode');
                    if (inputMode) {
                        updateCaseTypeOptions(inputMode.value);
                    }
                }
            };

            langSelect.addEventListener('change', handleSelectChange);
            levelSelect.addEventListener('change', handleSelectChange);
            if (listeningModeCheck) {
                listeningModeCheck.addEventListener('change', handleSelectChange);
            }

            sendBtn.addEventListener('click', () => sendCCIMessage());

            userInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    sendCCIMessage();
                }
            });

            // Bind de Pestañas (Tabs)
            const tabChat = document.getElementById('cci-tab-chat');
            const tabSpeaking = document.getElementById('cci-tab-speaking');
            const viewChat = document.getElementById('cci-chat-view');
            const viewSpeaking = document.getElementById('cci-speaking-view');

            if (tabChat && tabSpeaking && viewChat && viewSpeaking) {
                tabChat.addEventListener('click', () => {
                    tabChat.classList.add('active');
                    tabSpeaking.classList.remove('active');
                    viewChat.style.display = 'flex';
                    viewSpeaking.style.display = 'none';
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                    if (typeof trainerRecording !== 'undefined' && trainerRecording && trainerRecognition) {
                        trainerRecognition.stop();
                    }

                    // Auto-play welcome message if Modo Escucha is active and it hasn't played yet
                    const listeningModeCheck = document.getElementById('cci-listening-mode-check');
                    const isListening = listeningModeCheck ? listeningModeCheck.checked : false;
                    if (isListening && !welcomeMessagePlayed) {
                        const msgContainer = document.getElementById('cci-messages');
                        if (msgContainer) {
                            const firstMsg = msgContainer.querySelector('.cci-message.bot-msg');
                            if (firstMsg) {
                                const playBtn = firstMsg.querySelector('.btn-message-tts');
                                const textDiv = firstMsg.querySelector('.cci-message-text');
                                if (playBtn && textDiv) {
                                    const content = textDiv.textContent.trim();
                                    const langSelect = document.getElementById('cci-lang-select');
                                    const lang = langSelect ? langSelect.value : 'en-US';
                                    window.playLanguageTTS(playBtn, content, lang);
                                    welcomeMessagePlayed = true;
                                }
                            }
                        }
                    }
                });

                tabSpeaking.addEventListener('click', () => {
                    tabSpeaking.classList.add('active');
                    tabChat.classList.remove('active');
                    viewSpeaking.style.display = 'flex';
                    viewChat.style.display = 'none';
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                    if (typeof trainerRecording !== 'undefined' && trainerRecording && trainerRecognition) {
                        trainerRecognition.stop();
                    }
                    initSpeakingTrainer();
                });
            }
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
        welcomeMessagePlayed = false;
        appendCCIMessage('assistant', welcomeText, null, lang);
    }

    function appendCCIMessage(role, content, corrections = null, lang = 'en-US') {
        const msgContainer = document.getElementById('cci-messages');
        if (!msgContainer) return;

        const msgDiv = document.createElement('div');
        msgDiv.className = `cci-message ${role === 'user' ? 'user-msg' : 'bot-msg'}`;

        let html = '';

        if (role === 'assistant' && corrections && corrections.length > 0) {
            // Filtrar elementos inválidos, vacíos o que contengan strings de fallback/dummy del LLM
            const validCorrections = corrections.filter(c => {
                if (!c) return false;
                const orig = (c.original || c.original || '').trim();
                const corr = (c.corrected || c.corregido || '').trim();
                const exp = (c.explanation || c.explicacion || '').trim();

                const invalidValues = ['', 'undefined', 'null', 'none', 'n/a'];
                if (invalidValues.includes(orig.toLowerCase()) || 
                    invalidValues.includes(corr.toLowerCase()) || 
                    invalidValues.includes(exp.toLowerCase())) {
                    return false;
                }
                return orig.length > 0 && corr.length > 0;
            });
            
            if (validCorrections.length > 0) {
                html += `
                    <div class="cci-correction-card">
                        <h5><i class="fas fa-lightbulb"></i> Corrección de Idioma</h5>
                        ${validCorrections.map(c => {
                            const orig = c.original || c.original || '';
                            const corr = c.corrected || c.corregido || '';
                            const exp = c.explanation || c.explicacion || '';
                            return `
                                <div class="correction-item" style="margin-bottom:0.5rem;">
                                    <div><span class="tag-wrong">Original:</span> <code class="txt-wrong">"${orig}"</code></div>
                                    <div style="margin-top:0.25rem;"><span class="tag-right">Corregido:</span> <code class="txt-right">"${corr}"</code></div>
                                    <p class="correction-explanation"><strong>Explicación:</strong> ${exp}</p>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }
        }

        const listeningModeCheck = document.getElementById('cci-listening-mode-check');
        const isListening = listeningModeCheck ? listeningModeCheck.checked : false;

        if (role === 'user') {
            html += `<div class="cci-message-text">${content}</div>`;
        } else {
            const maskedClass = isListening ? 'cci-text-masked' : '';
            const revealBtn = isListening ? `
                <button class="btn-reveal-text" onclick="window.toggleRevealText(this)">
                    <i class="fas fa-eye"></i> Revelar texto
                </button>
            ` : '';

            const renderedContent = window.MarkdownRenderer ? window.MarkdownRenderer.render(content) : content;
            const escapedText = content.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            html += `
                <div class="cci-message-text markdown-content ${maskedClass}">${renderedContent}</div>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button class="btn-message-tts" onclick="window.playLanguageTTS(this, '${escapedText}', '${lang}')">
                        <i class="fas fa-volume-up"></i> Escuchar
                    </button>
                    ${revealBtn}
                </div>
            `;
        }

        msgDiv.innerHTML = html;
        msgContainer.appendChild(msgDiv);
        
        // Auto scroll
        msgContainer.scrollTop = msgContainer.scrollHeight;

        // Auto-play TTS if in listening mode, assistant role, and chat tab is active
        if (role === 'assistant' && isListening) {
            const tabChat = document.getElementById('cci-tab-chat');
            const isChatActive = tabChat && tabChat.classList.contains('active');
            if (isChatActive) {
                const playBtn = msgDiv.querySelector('.btn-message-tts');
                if (playBtn) {
                    window.playLanguageTTS(playBtn, content, lang);
                    welcomeMessagePlayed = true;
                }
            }
        }
    }

    window.toggleRevealText = function (btn) {
        const msgDiv = btn.closest('.cci-message');
        if (!msgDiv) return;
        const textDiv = msgDiv.querySelector('.cci-message-text');
        if (!textDiv) return;

        const isMasked = textDiv.classList.contains('cci-text-masked');
        if (isMasked) {
            textDiv.classList.remove('cci-text-masked');
            textDiv.classList.add('cci-text-revealed');
            btn.innerHTML = '<i class="fas fa-eye-slash"></i> Ocultar texto';
        } else {
            textDiv.classList.remove('cci-text-revealed');
            textDiv.classList.add('cci-text-masked');
            btn.innerHTML = '<i class="fas fa-eye"></i> Revelar texto';
        }
    };

    async function sendCCIMessage() {
        const userInput = document.getElementById('cci-user-input');
        const sendBtn = document.getElementById('cci-send-btn');
        const langSelect = document.getElementById('cci-lang-select');
        const levelSelect = document.getElementById('cci-level-select');
        const listeningModeCheck = document.getElementById('cci-listening-mode-check');

        if (!userInput || !sendBtn || !langSelect || !levelSelect) return;

        const message = userInput.value.trim();
        if (!message) return;

        const lang = langSelect.value;
        const level = levelSelect.value;
        const isListening = listeningModeCheck ? listeningModeCheck.checked : false;

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
                    history: cciChatHistory,
                    listeningMode: isListening
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

    // VARIABLES Y FUNCIONES DEL ENTRENADOR DE SPEAKING (V3.9)
    let currentExercise = null;
    let hasEvaluatedCurrentExercise = false;
    let firstAttemptEvaluation = null;
    let trainerRecording = false;
    let trainerRecognition = null;
    let trainerInitialized = false;
    let silenceTimer = null;
    let isAutosubmitting = false;

    function getLevenshteinDistance(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }

    function calculateLocalScore(userAnswer, exercise, inputMode) {
        const normalize = (str) => {
            return str.toLowerCase()
                .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡]/g, "")
                .replace(/\s+/g, " ")
                .trim();
        };
        const normUser = normalize(userAnswer);
        const normCorrect = normalize(exercise.correctL2);
        
        if (!normUser) return { score: 0, isCorrect: false };
        
        if (exercise.caseType === 'read_aloud' || inputMode === 'voice') {
            const targetWords = normCorrect.split(/\s+/).filter(Boolean);
            const userWords = normUser.split(/\s+/).filter(Boolean);
            if (targetWords.length === 0) return { score: 100, isCorrect: true };
            
            let matched = 0;
            targetWords.forEach(w => {
                if (userWords.includes(w)) {
                    matched++;
                }
            });
            const score = Math.round((matched / targetWords.length) * 100);
            return {
                score,
                isCorrect: score >= 85
            };
        }
        
        if (exercise.caseType === 'cloze_completion') {
            if (normUser === normCorrect || normUser.split(/\s+/).includes(normCorrect)) {
                return { score: 100, isCorrect: true };
            }
            const filledSentence = exercise.sentenceL2 ? normalize(exercise.sentenceL2.replace('____', exercise.correctL2)) : normCorrect;
            if (normUser === filledSentence) {
                return { score: 100, isCorrect: true };
            }
            
            const distWord = getLevenshteinDistance(normUser, normCorrect);
            const maxLenWord = Math.max(normUser.length, normCorrect.length);
            const scoreWord = maxLenWord > 0 ? Math.round((1 - distWord / maxLenWord) * 100) : 0;
            
            const distSent = getLevenshteinDistance(normUser, filledSentence);
            const maxLenSent = Math.max(normUser.length, filledSentence.length);
            const scoreSent = maxLenSent > 0 ? Math.round((1 - distSent / maxLenSent) * 100) : 0;
            
            const finalScore = Math.max(scoreWord, scoreSent);
            return {
                score: finalScore,
                isCorrect: finalScore >= 85
            };
        }
        
        if (normUser === normCorrect) {
            return { score: 100, isCorrect: true };
        }
        const dist = getLevenshteinDistance(normUser, normCorrect);
        const maxLen = Math.max(normUser.length, normCorrect.length);
        const score = maxLen > 0 ? Math.max(0, Math.round((1 - dist / maxLen) * 100)) : 0;
        return {
            score,
            isCorrect: score >= 85
        };
    }

    function normalizeWordForMatching(word) {
        if (!word) return '';
        let clean = word.toLowerCase().trim();
        clean = clean.replace(/^[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡"']+|[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡"']+$/g, '');
        clean = clean.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡"']/g, '');
        clean = clean.replace(/our/g, 'or');
        clean = clean.replace(/ise/g, 'ize');
        clean = clean.replace(/tre$/g, 'ter');
        clean = clean.replace(/ll/g, 'l');
        return clean;
    }
    function updateCaseTypeOptions(mode) {
        const caseTypeSelect = document.getElementById('speaking-case-type');
        if (!caseTypeSelect) return;

        // Guardar el valor actual si es que sigue siendo válido en la nueva lista
        const currentVal = caseTypeSelect.value;

        // Definir opciones según el modo
        let options = [
            { value: 'random', text: '🔄 Alternar todos' },
            { value: 'translation_full', text: '📝 Traducción Completa' },
            { value: 'translation_term', text: '🔤 Traducción de Término' }
        ];

        if (mode === 'voice') {
            options.push({ value: 'read_aloud', text: '🗣️ Pronunciar Oración (Read Aloud)' });
        } else {
            options.push({ value: 'cloze_completion', text: '✏️ Completar Frase' });
        }

        // Reconstruir el select
        caseTypeSelect.innerHTML = '';
        options.forEach(opt => {
            const optionEl = document.createElement('option');
            optionEl.value = opt.value;
            optionEl.textContent = opt.text;
            caseTypeSelect.appendChild(optionEl);
        });

        // Intentar mantener el valor previo si está en la lista, si no, poner 'random'
        const hasPrev = options.some(opt => opt.value === currentVal);
        if (hasPrev) {
            caseTypeSelect.value = currentVal;
        } else {
            caseTypeSelect.value = 'random';
        }
    }

    function updateInputModeUI() {
        const inputMode = document.getElementById('speaking-input-mode');
        const micBtn = document.getElementById('speaking-mic-btn');
        const submitBtn = document.getElementById('speaking-submit-btn');
        const userAnswerInput = document.getElementById('speaking-user-answer');
        const waveIndicator = document.getElementById('speaking-wave-indicator');

        if (!inputMode || !micBtn || !submitBtn || !userAnswerInput) return;

        if (inputMode.value === 'voice') {
            micBtn.style.display = 'flex';
            submitBtn.style.display = 'none';
            userAnswerInput.disabled = true;
            if (waveIndicator) waveIndicator.style.display = 'none';
            if (currentExercise) {
                userAnswerInput.placeholder = currentExercise.caseType === 'read_aloud' 
                    ? "Presiona el micrófono y lee la oración en voz alta..." 
                    : "Presiona el micrófono y habla...";
            } else {
                userAnswerInput.placeholder = "Haz clic en Iniciar Práctica...";
            }
        } else {
            micBtn.style.display = 'none';
            submitBtn.style.display = 'flex';
            userAnswerInput.disabled = (currentExercise === null);
            if (waveIndicator) waveIndicator.style.display = 'none';
            userAnswerInput.placeholder = currentExercise ? "Escribe tu respuesta aquí..." : "Haz clic en Iniciar Práctica...";
            submitBtn.disabled = (currentExercise === null || !userAnswerInput.value.trim());
        }
    }

    function resetSpeakingTrainer() {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        if (trainerRecognition) {
            try {
                isAutosubmitting = false;
                trainerRecognition.stop();
            } catch(e){}
            trainerRecording = false;
        }
        if (silenceTimer) {
            clearTimeout(silenceTimer);
            silenceTimer = null;
        }
        
        currentExercise = null;
        hasEvaluatedCurrentExercise = false;
        firstAttemptEvaluation = null;
        isAutosubmitting = false;

        const promptEl = document.getElementById('speaking-exercise-prompt');
        const badgeEl = document.getElementById('speaking-exercise-badge');
        const clozeHintContainer = document.getElementById('speaking-cloze-hint-container');
        const targetContainer = document.getElementById('speaking-target-sentence-container');
        const userAnswerInput = document.getElementById('speaking-user-answer');
        const feedbackCard = document.getElementById('speaking-feedback-card');
        const nextBtn = document.getElementById('speaking-next-btn');
        const waveIndicator = document.getElementById('speaking-wave-indicator');
        const submitBtn = document.getElementById('speaking-submit-btn');
        const caseTypeSelect = document.getElementById('speaking-case-type');

        if (promptEl) promptEl.textContent = 'Presiona "Iniciar Práctica" para comenzar.';
        if (badgeEl) badgeEl.textContent = 'Caso 1';
        if (clozeHintContainer) clozeHintContainer.style.display = 'none';
        if (targetContainer) {
            targetContainer.innerHTML = '';
            targetContainer.style.display = 'none';
        }
        if (userAnswerInput) {
            userAnswerInput.value = '';
        }
        if (feedbackCard) {
            feedbackCard.style.display = 'none';
            feedbackCard.className = 'speaking-feedback-card';
            feedbackCard.innerHTML = '';
        }
        if (nextBtn) {
            nextBtn.innerHTML = '<i class="fas fa-play"></i> Iniciar Práctica';
            nextBtn.disabled = false;
        }
        if (waveIndicator) {
            waveIndicator.style.display = 'none';
        }
        if (submitBtn) {
            submitBtn.disabled = true;
        }
        if (caseTypeSelect) {
            caseTypeSelect.value = 'random';
        }
    }

    function initSpeakingTrainer() {
        const inputMode = document.getElementById('speaking-input-mode');
        const micBtn = document.getElementById('speaking-mic-btn');
        const submitBtn = document.getElementById('speaking-submit-btn');
        const nextBtn = document.getElementById('speaking-next-btn');
        const userAnswerInput = document.getElementById('speaking-user-answer');

        if (!inputMode || !micBtn || !submitBtn || !nextBtn || !userAnswerInput) return;

        if (!trainerInitialized) {
            trainerInitialized = true;

            updateCaseTypeOptions(inputMode.value);

            inputMode.addEventListener('change', () => {
                resetSpeakingTrainer();
                updateCaseTypeOptions(inputMode.value);
                updateInputModeUI();
            });
            
            micBtn.addEventListener('click', toggleTrainerSpeechRecognition);
            
            submitBtn.addEventListener('click', submitTrainerAnswer);
            
            nextBtn.addEventListener('click', loadNextExercise);

            userAnswerInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !submitBtn.disabled) {
                    e.preventDefault();
                    submitTrainerAnswer();
                }
            });

            userAnswerInput.addEventListener('input', () => {
                if (inputMode.value === 'text') {
                    submitBtn.disabled = (currentExercise === null || !userAnswerInput.value.trim());
                }
            });
        }

        updateInputModeUI();
    }
    function toggleTrainerSpeechRecognition() {
        const micBtn = document.getElementById('speaking-mic-btn');
        const userAnswerInput = document.getElementById('speaking-user-answer');
        const langSelect = document.getElementById('cci-lang-select');
        const waveIndicator = document.getElementById('speaking-wave-indicator');

        if (!micBtn || !userAnswerInput || !langSelect) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Tu navegador no soporta reconocimiento de voz nativo.");
            return;
        }

        if (trainerRecording) {
            if (trainerRecognition) {
                isAutosubmitting = false;
                trainerRecognition.stop();
            }
            return;
        }

        isAutosubmitting = false;
        trainerRecognition = new SpeechRecognition();
        trainerRecognition.lang = langSelect.value || 'en-US';
        trainerRecognition.continuous = true;
        trainerRecognition.interimResults = true;

        let finalTranscript = '';
        const originalPlaceholder = userAnswerInput.placeholder;

        const resetSilenceTimer = () => {
            if (silenceTimer) clearTimeout(silenceTimer);
            silenceTimer = setTimeout(() => {
                console.log("⏱️ Silencio detectado por 3 segundos. Deteniendo grabación...");
                if (trainerRecording && trainerRecognition) {
                    isAutosubmitting = true;
                    trainerRecognition.stop();
                }
            }, 3000);
        };

        trainerRecognition.onstart = () => {
            trainerRecording = true;
            micBtn.classList.add('recording');
            const icon = micBtn.querySelector('i');
            if (icon) icon.className = 'fas fa-stop';
            userAnswerInput.placeholder = "Escuchando... habla ahora...";
            userAnswerInput.value = '';
            
            if (waveIndicator) waveIndicator.style.display = 'flex';

            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }

            // Si es ejercicio de pronunciación, resetear spans de palabras
            const targetContainer = document.getElementById('speaking-target-sentence-container');
            if (currentExercise && currentExercise.caseType === 'read_aloud' && targetContainer) {
                targetContainer.querySelectorAll('.word-chip').forEach(span => {
                    span.className = 'word-chip state-muted';
                });
            }

            resetSilenceTimer();
        };

        trainerRecognition.onresult = (event) => {
            resetSilenceTimer();
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            
            const transcript = finalTranscript || interimTranscript;
            userAnswerInput.value = transcript;

            // Lógica estilo Duolingo para Read Aloud
            const targetContainer = document.getElementById('speaking-target-sentence-container');
            if (currentExercise && currentExercise.caseType === 'read_aloud' && targetContainer) {
                const spokenWords = transcript.split(/\s+/)
                    .map(w => normalizeWordForMatching(w))
                    .filter(Boolean);

                const spans = targetContainer.querySelectorAll('.word-chip');
                let matchedCount = 0;

                spans.forEach(span => {
                    const cleanWord = span.dataset.cleanWord;
                    if (spokenWords.includes(cleanWord)) {
                        span.className = 'word-chip state-success';
                        matchedCount++;
                    } else {
                        span.className = 'word-chip state-muted';
                    }
                });

                if (matchedCount === spans.length && spans.length > 0) {
                    console.log("🎉 ¡Coincidencia del 100% en Read Aloud! Auto-enviando...");
                    if (silenceTimer) clearTimeout(silenceTimer);
                    isAutosubmitting = true;
                    setTimeout(() => {
                        if (trainerRecording && trainerRecognition) {
                            trainerRecognition.stop();
                        }
                    }, 400);
                }
            }
        };

        trainerRecognition.onend = () => {
            trainerRecording = false;
            if (silenceTimer) clearTimeout(silenceTimer);
            micBtn.classList.remove('recording');
            const icon = micBtn.querySelector('i');
            if (icon) icon.className = 'fas fa-microphone';
            userAnswerInput.placeholder = originalPlaceholder;
            if (waveIndicator) waveIndicator.style.display = 'none';

            // Auto-submit en modo voz si hay texto y fue finalizado por silencio o completado
            const textVal = userAnswerInput.value.trim();
            const inputMode = document.getElementById('speaking-input-mode');
            if (textVal && (isAutosubmitting || (inputMode && inputMode.value === 'voice'))) {
                submitTrainerAnswer();
            }
        };

        trainerRecognition.onerror = (event) => {
            console.error("Trainer speech recognition error:", event.error);
            trainerRecording = false;
            if (silenceTimer) clearTimeout(silenceTimer);
            micBtn.classList.remove('recording');
            const icon = micBtn.querySelector('i');
            if (icon) icon.className = 'fas fa-microphone';
            userAnswerInput.placeholder = originalPlaceholder;
            if (waveIndicator) waveIndicator.style.display = 'none';
        };

        trainerRecognition.start();
    }

    async function loadNextExercise() {
        const nextBtn = document.getElementById('speaking-next-btn');
        const promptEl = document.getElementById('speaking-exercise-prompt');
        const badgeEl = document.getElementById('speaking-exercise-badge');
        const clozeHintContainer = document.getElementById('speaking-cloze-hint-container');
        const clozeTemplateEl = document.getElementById('speaking-cloze-sentence-template');
        const targetContainer = document.getElementById('speaking-target-sentence-container');
        const userAnswerInput = document.getElementById('speaking-user-answer');
        const submitBtn = document.getElementById('speaking-submit-btn');
        const feedbackCard = document.getElementById('speaking-feedback-card');
        const langSelect = document.getElementById('cci-lang-select');
        const levelSelect = document.getElementById('cci-level-select');
        const inputMode = document.getElementById('speaking-input-mode');

        if (!nextBtn || !promptEl || !badgeEl || !userAnswerInput || !submitBtn || !feedbackCard) return;

        // Ocultar feedback y habilitar/bloquear inputs según la configuración
        feedbackCard.style.display = 'none';
        userAnswerInput.value = '';
        
        nextBtn.disabled = true;
        nextBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
        promptEl.textContent = "Generando nuevo ejercicio...";

        try {
            const caseTypeSelect = document.getElementById('speaking-case-type');
            const caseTypeVal = caseTypeSelect ? caseTypeSelect.value : 'random';
            const inputModeEl = document.getElementById('speaking-input-mode');
            const inputModeVal = inputModeEl ? inputModeEl.value : 'voice';

            // Recuperar historial de exclusión de la sesión actual
            let excludeList = [];
            try {
                const storedHistory = sessionStorage.getItem('hubacademia_speaking_history');
                if (storedHistory) {
                    excludeList = JSON.parse(storedHistory);
                }
            } catch (historyErr) {
                console.error("Error reading speaking history from sessionStorage:", historyErr);
            }

            const response = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/languages/practice/exercise`, {
                method: 'POST',
                body: JSON.stringify({
                    languageCode: langSelect.value,
                    cefrLevel: levelSelect.value,
                    caseType: caseTypeVal,
                    inputMode: inputModeVal,
                    excludeList: excludeList
                })
            });

            if (!response.ok) {
                if (response.status === 403) {
                    if (window.uiManager && typeof window.uiManager.showPaywallModal === 'function') {
                        window.uiManager.showPaywallModal(null, 'languages');
                    } else {
                        alert('Has alcanzado tus límites del entrenador de práctica en la versión gratuita.');
                    }
                    promptEl.textContent = "Límite de uso de IA alcanzado. Por favor, mejora tu plan.";
                    const limitErr = new Error('LIMIT_EXHAUSTED');
                    limitErr.isLimit = true;
                    throw limitErr;
                }
                throw new Error(`HTTP ${response.status}`);
            }
            currentExercise = await response.json();
            hasEvaluatedCurrentExercise = false;
            firstAttemptEvaluation = null;

            // Guardar en el historial de exclusión de sesión
            if (currentExercise && currentExercise.correctL2) {
                try {
                    const storedHistory = sessionStorage.getItem('hubacademia_speaking_history');
                    let list = storedHistory ? JSON.parse(storedHistory) : [];
                    if (!list.includes(currentExercise.correctL2)) {
                        list.push(currentExercise.correctL2);
                    }
                    if (list.length > 15) {
                        list.shift(); // FIFO: remover el más antiguo si supera los 15 elementos
                    }
                    sessionStorage.setItem('hubacademia_speaking_history', JSON.stringify(list));
                } catch (saveErr) {
                    console.error("Error saving speaking history to sessionStorage:", saveErr);
                }
            }

            // Actualizar interfaz con el ejercicio
            promptEl.textContent = currentExercise.promptL1;
            
            // Map badge según el caso
            let badgeText = "Traducción";
            if (currentExercise.caseType === 'translation_full') badgeText = "Traducción Completa";
            else if (currentExercise.caseType === 'translation_term') badgeText = "Traducción de Término";
            else if (currentExercise.caseType === 'cloze_completion') badgeText = "Completar Frase (Cloze)";
            else if (currentExercise.caseType === 'read_aloud') badgeText = "Pronunciación (Read Aloud)";
            
            badgeEl.textContent = badgeText;

            // Lógica de Render para Cloze
            if (currentExercise.caseType === 'cloze_completion' && currentExercise.sentenceL2) {
                clozeHintContainer.style.display = 'flex';
                clozeTemplateEl.textContent = currentExercise.sentenceL2;
            } else {
                clozeHintContainer.style.display = 'none';
            }

            // Lógica de Render para Read Aloud
            if (currentExercise.caseType === 'read_aloud' && currentExercise.correctL2) {
                if (targetContainer) {
                    targetContainer.innerHTML = '';
                    const words = currentExercise.correctL2.split(/\s+/);
                    words.forEach((word, idx) => {
                        const span = document.createElement('span');
                        span.className = 'word-chip state-muted';
                        const cleanWord = normalizeWordForMatching(word);
                        span.dataset.cleanWord = cleanWord;
                        span.dataset.index = idx;
                        span.textContent = word;
                        targetContainer.appendChild(span);
                    });
                    targetContainer.style.display = 'flex';
                }
            } else {
                if (targetContainer) targetContainer.style.display = 'none';
            }

            // Aplicar modality locking
            updateInputModeUI();

            if (inputMode && inputMode.value === 'text') {
                userAnswerInput.focus();
            }

        } catch (err) {
            console.error("Error loading practice exercise:", err);
            if (!err.isLimit) {
                promptEl.textContent = "Error al conectar con la IA. Por favor, intenta de nuevo.";
            }
        } finally {
            nextBtn.disabled = false;
            nextBtn.innerHTML = '<i class="fas fa-arrows-rotate"></i> Cambiar Ejercicio';
        }
    }

    async function submitTrainerAnswer() {
        const userAnswerInput = document.getElementById('speaking-user-answer');
        const submitBtn = document.getElementById('speaking-submit-btn');
        const feedbackCard = document.getElementById('speaking-feedback-card');
        const nextBtn = document.getElementById('speaking-next-btn');

        if (!userAnswerInput || !submitBtn || !feedbackCard || !currentExercise) return;

        const answer = userAnswerInput.value.trim();
        if (!answer) return;

        // Deshabilitar controles durante la carga
        userAnswerInput.disabled = true;
        submitBtn.disabled = true;
        const originalBtnHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Evaluando...';

        try {
            const inputModeEl = document.getElementById('speaking-input-mode');
            const inputModeVal = inputModeEl ? inputModeEl.value : 'text';

            let evaluation;
            if (hasEvaluatedCurrentExercise && firstAttemptEvaluation) {
                // Modo reintento: evaluar de manera local para actualizar solo score/glow y mantener la explicación didáctica inicial
                const localResult = calculateLocalScore(answer, currentExercise, inputModeVal);
                evaluation = {
                    ...firstAttemptEvaluation,
                    score: localResult.score,
                    isCorrect: localResult.isCorrect
                };
            } else {
                // Primer intento: realizar llamado a la API
                const response = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/languages/practice/evaluate`, {
                    method: 'POST',
                    body: JSON.stringify({
                        exercise: currentExercise,
                        userAnswer: answer,
                        inputMode: inputModeVal
                    })
                });

                if (!response.ok) {
                    if (response.status === 403) {
                        if (window.uiManager && typeof window.uiManager.showPaywallModal === 'function') {
                            window.uiManager.showPaywallModal(null, 'languages');
                        } else {
                            alert('Has alcanzado tus límites de evaluación en la versión gratuita.');
                        }
                        const limitErr = new Error('LIMIT_EXHAUSTED');
                        limitErr.isLimit = true;
                        throw limitErr;
                    }
                    throw new Error(`HTTP ${response.status}`);
                }
                
                evaluation = await response.json();
                hasEvaluatedCurrentExercise = true;
                firstAttemptEvaluation = evaluation;
            }

            // Renderizar feedback
            const isCorrectClass = evaluation.isCorrect ? 'status-correct' : 'status-incorrect';
            const statusText = evaluation.isCorrect 
                ? '<i class="fas fa-circle-check"></i> Correcto' 
                : '<i class="fas fa-circle-xmark"></i> Incorrecto';
            
            const escapedModelAnswer = evaluation.modelAnswer.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const langSelect = document.getElementById('cci-lang-select');
            const lang = langSelect ? langSelect.value : 'en-US';

            const renderedFeedback = window.MarkdownRenderer ? window.MarkdownRenderer.render(evaluation.feedback) : evaluation.feedback;

            feedbackCard.className = `speaking-feedback-card ${evaluation.isCorrect ? 'correct-glow' : 'incorrect-glow'}`;
            feedbackCard.innerHTML = `
                <div class="feedback-header">
                    <span class="feedback-status ${isCorrectClass}">${statusText}</span>
                    <span class="feedback-score">Precisión: ${evaluation.score}%</span>
                </div>
                <div class="feedback-model-answer" style="display: flex; justify-content: space-between; align-items: center; gap: 15px;">
                    <div style="flex: 1;">
                        <p>Respuesta Modelo:</p>
                        <code style="word-break: break-word; white-space: pre-wrap;">${evaluation.modelAnswer}</code>
                    </div>
                    <button class="btn-message-tts" style="margin-top: 10px; flex-shrink: 0;" onclick="window.playLanguageTTS(this, '${escapedModelAnswer}', '${lang}')">
                        <i class="fas fa-volume-up"></i> Escuchar
                    </button>
                </div>
                <div class="feedback-explanation" style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                    <strong style="display: block; margin-bottom: 8px; color: var(--text-main);">Evaluación didáctica:</strong>
                    <div class="markdown-content">${renderedFeedback}</div>
                </div>
            `;
            
            feedbackCard.style.display = 'flex';

            // Auto-reproducir audio si Modo Escucha está activado
            const listeningModeCheck = document.getElementById('cci-listening-mode-check');
            const isListening = listeningModeCheck ? listeningModeCheck.checked : false;
            if (isListening) {
                const playBtn = feedbackCard.querySelector('.btn-message-tts');
                if (playBtn) {
                    window.playLanguageTTS(playBtn, evaluation.modelAnswer, lang);
                }
            }
            
            // Habilitar el flujo siguiente
            nextBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Siguiente Ejercicio';

            if (window.sessionManager && typeof window.sessionManager.refreshUser === 'function') {
                window.sessionManager.refreshUser().catch(() => {});
            }

            // RE-HABILITAR CONTROLES PARA PERMITIR CORRECCIONES/REINTENTOS
            if (inputModeVal === 'text') {
                userAnswerInput.disabled = false;
                submitBtn.disabled = false;
                userAnswerInput.focus();
            } else {
                userAnswerInput.disabled = true; // Mantener bloqueado para modo voz (modality lock)
            }

        } catch (err) {
            console.error("Error evaluating answer:", err);
            if (!err.isLimit) {
                alert("Ocurrió un error al evaluar tu respuesta. Por favor intenta de nuevo.");
            }
            // Restaurar estado si falla
            const inputMode = document.getElementById('speaking-input-mode');
            if (inputMode && inputMode.value === 'text') {
                userAnswerInput.disabled = false;
                submitBtn.disabled = false;
            }
        } finally {
            submitBtn.innerHTML = originalBtnHtml;
        }
    }

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
