/**
 * Flashcard Manager (Senior Version)
 * Handles State, API Communication, and UI Transitions responsibly.
 */

const FlashcardManager = (() => {
    // --- Config & State ---
    const API_URL = `${window.AppConfig.API_URL}/api/flashcard`;
    let queue = [];
    let currentCard = null;
    let isFlipped = false;
    let syncQueue = []; 
    let currentDeckId = null; // ✅ Persist deckId at module level
    let currentAudio = null; // ✅ Manejo de audio global para detener si se cambia de tarjeta
    let isGuest = false; // ✅ Track guest status for feature gating

    // --- DOM Elements ---
    const views = {
        loading: document.getElementById('view-loading'),
        empty: document.getElementById('view-empty'),
        card: document.getElementById('view-card')
    };

    const ui = {
        card: document.getElementById('flashcard'),
        frontText: document.getElementById('front-text'),
        backText: document.getElementById('back-text'),
        topic: document.getElementById('card-topic'),
        controls: document.getElementById('controls'),
        pendingCount: document.getElementById('pending-count'),
        frontImage: document.getElementById('front-image-container'),
        backImage: document.getElementById('back-image-container')
    };

    // --- State Machine ---
    function setView(viewName) {
        // Ocultar todo
        Object.values(views).forEach(el => el.classList.remove('active'));
        // Mostrar target
        if (views[viewName]) {
            views[viewName].classList.add('active');
            console.log(`State changed to: ${viewName}`); // Debug
        }
    }

    // --- Initialization ---
    async function init() {
        if (typeof window.uiManager === 'undefined') {
            console.warn("uiManager not found, features might be limited.");
        }
        setView('loading');

        const urlParams = new URLSearchParams(window.location.search);
        currentDeckId = urlParams.get('deckId');
        setupNavigationButtons();

        const isDemo = urlParams.get('demo') === 'true';
        isGuest = isDemo || !localStorage.getItem('authToken');

        if (!isDemo) {
            const token = localStorage.getItem('authToken');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            try {
                await loadCards(token);
            } catch (error) {
                console.error("Critical Error:", error);
                setView('empty');
            }
        } else {
            // --- GUEST DEMO MODE ---
            const hasCompletedDemo = localStorage.getItem('hasCompletedDemo') === 'true';
            if (hasCompletedDemo) {
                console.log("🔒 Demo ya completada anteriormente. Mostrando bloqueo.");
                setView('empty');
                if (window.uiManager) window.uiManager.showAuthPromptModal();
                return;
            }

            console.log("🌟 MODO DEMO: Cargando tarjetas de ejemplo...");
            loadDemoCards();
        }
    }

    function loadDemoCards() {
        queue = [
            {
                id: 'demo-fc-1',
                front_content: "¿Cuál es la tríada de Charcot para la Colangitis Aguda?",
                back_content: "1. Fiebre\n2. Ictericia\n3. Dolor en hipocondrio derecho",
                topic: "Gastroenterología"
            },
            {
                id: 'demo-fc-2',
                front_content: "Mujer de 30 años con exoftalmos, bocio y taquicardia. TSH disminuida y T4 libre elevada. Diagnóstico más probable.",
                back_content: "Enfermedad de Graves-Basedow",
                topic: "Endocrinología"
            },
            {
                id: 'demo-fc-3',
                front_content: "¿Cuál es el signo clínico clásico de la apendicitis aguda caracterizado por dolor en fosa ilíaca derecha al presionar la fosa ilíaca izquierda?",
                back_content: "Signo de Rovsing",
                topic: "Cirugía General"
            },
            {
                id: 'demo-fc-4',
                front_content: "¿Cuál es el tratamiento de elección para la fibrilación auricular en un paciente inestable hemodinámicamente?",
                back_content: "Cardioversión eléctrica sincronizada",
                topic: "Cardiología"
            },
            {
                id: 'demo-fc-5',
                front_content: "¿Cuál es la causa más común de hipertiroidismo a nivel mundial?",
                back_content: "Enfermedad de Graves",
                topic: "Endocrinología"
            },
            {
                id: 'demo-fc-6',
                front_content: "Signo característico de la colecistitis aguda que consiste en el cese de la inspiración profunda al palpar el hipocondrio derecho.",
                back_content: "Signo de Murphy",
                topic: "Cirugía General"
            },
            {
                id: 'demo-fc-7',
                front_content: "¿Cuál es el agente etiológico más frecuente de la neumonía adquirida en la comunidad?",
                back_content: "Streptococcus pneumoniae (Neumococo)",
                topic: "Neumología"
            }
        ];
        updatePendingCount();
        renderCard(queue[0]);
        setView('card');
    }

    function setupNavigationButtons() {
        // Modificar el botón de "Progreso/Salir" según el contexto
        const progressBtn = document.getElementById('btn-progress');
        if (progressBtn && !progressBtn.dataset.bound) {
            progressBtn.dataset.bound = "true";
            progressBtn.addEventListener('click', () => handleExit());
            
            if (currentDeckId) {
                progressBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Volver al Mazo';
            } else {
                progressBtn.innerHTML = '<i class="fas fa-home"></i> Ir al Hub';
            }
        }

        // Also update the 'Todo al día' modal button
        const backDeckBtn = document.getElementById('btn-back-deck');
        if (backDeckBtn && !backDeckBtn.dataset.bound) {
            backDeckBtn.dataset.bound = "true";
            backDeckBtn.addEventListener('click', () => handleExit());
        }
    }

    // --- Logic ---
    async function loadCards(token) {
        const urlParams = new URLSearchParams(window.location.search);
        // 2. Build URL based on context (Deck vs Global vs Single Card)
        const cardId = urlParams.get('cardId');
        let endpoint = `${API_URL}/due`; // Default Legacy Global
        if (currentDeckId) {
            endpoint = `${window.AppConfig.API_URL}/api/decks/${currentDeckId}/cards/due`;
        }
        if (cardId) {
            // Si hay cardId, usamos el nuevo endpoint de estudio individual
            endpoint = `${window.AppConfig.API_URL}/api/decks/${currentDeckId || 'all'}/cards/${cardId}/study`;
        }


        // ✅ NUEVO: Carga resiliente con NetworkService
        const res = await window.NetworkService.fetch(endpoint);

        // ✅ SEGUNDA LÍNEA DE DEFENSA: Manejo de 403 (Forbidden)
        if (res.status === 403) {
            console.error('[FlashcardManager] Error 403: Acceso denegado por límites de vida.');
            
            if (window.uiManager) {
                if (window.uiManager.showLimitModal) window.uiManager.showLimitModal('flashcards');
                else if (window.uiManager.showPaywallModal) window.uiManager.showPaywallModal(null, 'flashcards');
            }

            // Redirigir al hub tras un breve delay para que vea el mensaje
            setTimeout(() => window.location.href = '/repaso', 2500);
            return;
        }

        if (!res.ok) throw new Error(`API Failed with status: ${res.status}`);

        const data = await res.json();

        // Sincronización de sesión y vidas gestionada centralizadamente por NetworkService.fetch

        if (data.cards && data.cards.length > 0) {
            queue = data.cards;
            updatePendingCount();
            renderCard(queue[0]);
            setView('card');
        } else {
            setView('empty');
        }
    }

    function renderCard(card) {
        currentCard = card;
        isFlipped = false;

        // Reset UI
        ui.card.classList.remove('is-flipped');
        ui.controls.classList.remove('visible');

        // ✅ Limpiar botón de tutor anterior y ocultar chat si está abierto
        const oldTutorBtn = document.getElementById('flashcard-tutor-trigger');
        if (oldTutorBtn) oldTutorBtn.remove();
        if (window.flashcardTutor) {
            window.flashcardTutor.toggle(false);
            window.flashcardTutor.clearChat();
        }

        // ✅ Ocultar chat global para evitar estorbos
        const globalChat = document.querySelector('.chatbot-toggle');
        if (globalChat) globalChat.style.display = 'none';

        // Content (Prevent XSS safely via textContent)
        // Logic: Use card topic if available (system decks), otherwise use Deck Name from URL, otherwise 'GENERAL'
        const urlParams = new URLSearchParams(window.location.search);
        const deckName = urlParams.get('deckName');

        let displayTopic = card.topic || deckName || 'GENERAL';
        if (displayTopic === 'Manual Import') {
            displayTopic = deckName || 'GENERAL';
        }
        ui.topic.textContent = displayTopic;
        ui.frontText.innerHTML = window.MarkdownRenderer.render(card.front_content || '');
        ui.backText.innerHTML = window.MarkdownRenderer.render(card.back_content || '');

        // ✅ NUEVO: Lógica de Ocultación (Modo Listening/Speaking)
        // Usamos visibility:hidden para mantener el layout intacto pero forzar el oído
        ui.frontText.style.visibility = card.hide_text_frente ? 'hidden' : 'visible';
        ui.backText.style.visibility = card.hide_text_dorso ? 'hidden' : 'visible';

        if (ui.frontImage) ui.frontImage.style.visibility = card.hide_text_frente ? 'hidden' : 'visible';
        if (ui.backImage) ui.backImage.style.visibility = card.hide_text_dorso ? 'hidden' : 'visible';

        // --- Render Images if they exist ---
        const hasFrontImage = !!card.image_url;
        const hasBackImage = !!card.explanation_image_url;
        const hasFrontText = !!card.front_content.trim();
        const hasBackText = !!card.back_content.trim();

        renderMedia(ui.frontImage, card.image_url);
        renderMedia(ui.backImage, card.explanation_image_url);

        // --- Intelligent Layout Classes ---
        const frontFace = ui.card.querySelector('.fc-card-face--front');
        const backFace = ui.card.querySelector('.fc-card-face--back');

        if (frontFace) {
            frontFace.classList.toggle('fc-has-image', hasFrontImage);
            frontFace.classList.toggle('fc-only-image', hasFrontImage && !hasFrontText);
            frontFace.classList.toggle('fc-only-text', !hasFrontImage && hasFrontText);
        }

        if (backFace) {
            backFace.classList.toggle('fc-has-image', hasBackImage);
            backFace.classList.toggle('fc-only-image', hasBackImage && !hasBackText);
            backFace.classList.toggle('fc-only-text', !hasBackImage && hasBackText);
        }

        // 🟢 FIX: Adjust Font Size to fit container (Prevent Overflow)
        const adjustFontSize = (element, text, hasImage) => {
            const isMobile = window.innerWidth < 600;
            let baseSize = isMobile ? 1.7 : 2.0; // Base más pequeña en móvil para evitar desbordamiento extremo
            const length = text.length;

            if (length > 450) baseSize = isMobile ? 0.95 : 1.1;
            else if (length > 350) baseSize = isMobile ? 1.1 : 1.25;
            else if (length > 250) baseSize = isMobile ? 1.25 : 1.4;
            else if (length > 150) baseSize = isMobile ? 1.4 : 1.6;
            else if (length > 80) baseSize = isMobile ? 1.6 : 1.8;
            else if (length > 0 && length <= 30) baseSize = isMobile ? 2.2 : 2.8;
            else if (length > 30 && length <= 80) baseSize = isMobile ? 1.8 : 2.2;
            
            if (hasImage) {
                if (length > 200) baseSize *= 0.8; 
                else if (length <= 40) baseSize = isMobile ? 1.5 : 1.8;
                else baseSize *= 0.85; 
            }

            element.style.fontSize = `${baseSize}rem`;
            element.style.lineHeight = isMobile ? "1.3" : "1.4"; 
        };

        adjustFontSize(ui.frontText, card.front_content || '', hasFrontImage);
        adjustFontSize(ui.backText, card.back_content || '', hasBackImage);

        // ✅ NUEVO: Renderizar Botones de Audio Premium
        renderAudioButton(frontFace, card.audio_url_frente, 'front', !!card.hide_text_frente);
        renderAudioButton(backFace, card.audio_url_dorso, 'back', !!card.hide_text_dorso);
    }

    /**
     * ✅ NUEVO: Renderiza un botón de audio minimalista con glassmorphism
     */
    function renderAudioButton(parent, audioUrl, side, isCentered = false) {
        // Eliminar botones previos si existen en TODA la cara de la tarjeta
        const rootFace = parent.closest('.fc-card-face') || parent;
        rootFace.querySelectorAll('.fc-audio-btn').forEach(b => b.remove());

        if (!audioUrl) return;

        const btn = document.createElement('button');
        btn.className = `fc-audio-btn fc-audio-btn--${side}`;
        if (isCentered) btn.classList.add('fc-audio-btn--centered');

        btn.innerHTML = '<i class="fas fa-volume-up"></i>';
        btn.title = isCentered ? "Reproducir audio (Modo Escucha)" : "Reproducir pronunciación premium";
        
        // Importante: stopPropagation para que la tarjeta no se de vuelta al clickear el audio
        btn.onclick = (e) => {
            e.stopPropagation();
            playAudio(audioUrl);
        };

        parent.appendChild(btn);
    }

    /**
     * ✅ NUEVO: Lógica de reproducción de audio
     */
    let _audioDebounce = false;
    function playAudio(url) {
        if (_audioDebounce) return;
        _audioDebounce = true;
        setTimeout(() => { _audioDebounce = false; }, 800); // 800ms de bloqueo

        try {
            if (currentAudio) {
                currentAudio.pause();
                currentAudio = null;
            }

            const fullUrl = window.resolveImageUrl(url);
            currentAudio = new Audio(fullUrl);
            currentAudio.play().catch(e => {
                console.error("Audio playback failed:", e);
                _audioDebounce = false;
            });
        } catch (e) {
            console.error("Error playing audio:", e);
            _audioDebounce = false;
        }
    }

    function toggleFlip() {
        isFlipped = !isFlipped;
        if (isFlipped) {
            ui.card.classList.add('is-flipped');
            ui.controls.classList.add('visible'); // Show controls when answer is revealed
            
            // ✅ INYECTAR BOTÓN HERMOSO DEL TUTOR
            if (!document.getElementById('flashcard-tutor-trigger')) {
                const tutorBtn = document.createElement('button');
                tutorBtn.id = 'flashcard-tutor-trigger';
                tutorBtn.className = 'flashcard-tutor-btn';
                tutorBtn.innerHTML = `
                    <i class="fas fa-robot tutor-robot-icon"></i>
                    <span>¿Dudas con esta respuesta?</span>
                `;
                tutorBtn.onclick = (e) => {
                    e.stopPropagation();

                    // 🛡️ Senior Protection: Guests cannot access AI Tutor
                    if (isGuest) {
                        if (window.uiManager && window.uiManager.showAuthPromptModal) {
                            window.uiManager.showAuthPromptModal();
                        }
                        return;
                    }

                    if (window.flashcardTutor) {
                        window.flashcardTutor.toggle(true, {
                            front: currentCard.front_content,
                            back: currentCard.back_content,
                            topic: currentCard.topic || ui.topic.textContent,
                            deck: currentDeckId
                        });
                    }
                };
                // Inyectar DENTRO de ui.controls al final
                ui.controls.appendChild(tutorBtn);
            }

            // ✅ NUEVO: Lanzar efecto de descubrimiento del Tutor (Aura + Partículas)
            // IMPORTANTE: Llamar DESPUÉS de que el botón existe en el DOM
            triggerDiscoveryEffect();
        } else {
            ui.card.classList.remove('is-flipped');
            ui.controls.classList.remove('visible');
            const tutorBtn = document.getElementById('flashcard-tutor-trigger');
            if (tutorBtn) tutorBtn.remove();
        }
    }

    let _isRating = false; // Bloqueo de concurrencia

    async function rate(quality) {
        if (_isRating || !currentCard) return;
        _isRating = true;

        // Visual feedback: Bloquear temporalmente controles para evitar doble-click
        if (ui.controls) {
            ui.controls.style.pointerEvents = 'none';
            ui.controls.style.opacity = '0.5';
        }


        const urlParams = new URLSearchParams(window.location.search);
        const isDemo = urlParams.get('demo') === 'true';

        // 1. Remove card from local queue
        const processedCard = queue.shift();
        if (!processedCard) {
            _isRating = false;
            if (ui.controls) {
                ui.controls.style.pointerEvents = '';
                ui.controls.style.opacity = '';
            }
            return;
        }
        updatePendingCount();

        if (isDemo) {
            console.log(`Demo card ${processedCard.id} rated with ${quality}`);
            // Reset block and UI for next card
            _isRating = false;
            if (ui.controls) {
                ui.controls.style.pointerEvents = '';
                ui.controls.style.opacity = '';
            }

            if (queue.length > 0) {
                // UX: Evitar ver el dorso de la siguiente tarjeta
                ui.card.style.transition = 'none';
                renderCard(queue[0]);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        ui.card.style.transition = '';
                    });
                });
            } else {
                currentCard = null;
                setView('empty');
                
                // ✅ PERSISTIR ESTADO: El usuario ya completó su demo
                localStorage.setItem('hasCompletedDemo', 'true');

                // ✅ USAR MODAL DE AUTENTICACIÓN NATIVO (EL DE SIEMPRE)
                if (window.uiManager && typeof window.uiManager.showAuthPromptModal === 'function') {
                    window.uiManager.showAuthPromptModal();
                } else {
                    handleExit();
                }
            }
            return;
        }

        const token = localStorage.getItem('authToken');
        if (!token) return;

        // 2. ✅ NUEVO: Encolar revisión para sincronización asíncrona (Resiliencia)
        const reviewData = {
            cardId: processedCard.id,
            quality: quality,
            currentInterval: processedCard.interval_days,
            currentEf: processedCard.easiness_factor,
            currentReps: processedCard.repetition_number
        };

        const syncPromise = syncReview(reviewData, token); // Asíncrono, pero guardamos la promesa

        // Liberar bloqueo inmediatamente después del proceso local (antes de que responda red)
        _isRating = false;
        if (ui.controls) {
            // FIX: Limpiar estilos en lugar de forzarlos a "1", para que CSS controle la visibilidad (.visible)
            ui.controls.style.pointerEvents = '';
            ui.controls.style.opacity = '';
        }

        // 3. Si estudiábamos una sola tarjeta (cardId), volvemos al mazo inmediatamente
        if (urlParams.has('cardId')) {
            await syncPromise;
            handleExit();
            return;
        }

        // 4. Show next card IMMEDIATELY (UX fluida)
        // FIX: Desactivar transición CSS para evitar ver el dorso de la siguiente tarjeta mientras gira de regreso
        ui.card.style.transition = 'none';

        if (queue.length > 0) {
            renderCard(queue[0]);
        } else {
            await syncPromise; // Esperar a que la última tarjeta se guarde antes de pedir más
            await loadCards(token);
        }

        // Restaurar la transición CSS en el siguiente frame, para que la nueva tarjeta sí pueda girar
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                ui.card.style.transition = '';
            });
        });
    }

    /**
     * Sincroniza una revisión individual con reintentos
     */
    async function syncReview(reviewData, token) {
        try {
            await window.NetworkService.fetch(`${API_URL}/review`, {
                method: 'POST',
                body: JSON.stringify(reviewData)
            });
            console.log(`✅ Flashcard ${reviewData.cardId} sincronizada.`);
        } catch (e) {
            console.error("Sync Failed definitely for card", reviewData.cardId, e);
            if (window.uiManager && window.uiManager.showToast) {
                window.uiManager.showToast('Error de sincronización de tarjeta.', 'warning');
            }
        }
    }

    function updatePendingCount() {
        ui.pendingCount.textContent = queue.length;
    }

    /**
     * Helper to render media in flashcard containers
     */
    function renderMedia(container, imageUrl) {
        if (!container) return;
        container.innerHTML = '';
        container.classList.remove('visible');

        if (imageUrl) {
            const img = document.createElement('img');
            img.src = window.resolveImageUrl(imageUrl);
            img.className = 'card-image';
            img.onerror = () => container.classList.remove('visible');
            container.appendChild(img);
            container.classList.add('visible');
        }
    }

    function handleExit() {
        console.log("Exiting study session...", { currentDeckId });
        
        // Si venimos de nuestra propia web, usamos el botón atrás nativo para no ensuciar el historial
        if (document.referrer.includes(window.location.host)) {
            window.history.back();
        } else {
            // Fallback si entraron a las flashcards directo desde un marcador/URL
            const targetUrl = currentDeckId ? `/repaso?deckId=${currentDeckId}` : '/repaso';
            window.location.replace(targetUrl);
        }
    }

    // --- Event Listeners ---
    ui.card.addEventListener('click', toggleFlip);

    /**
     * ✅ EFECTO DE DESCUBRIMIENTO DEL TUTOR
     * Lanza un aura y partículas que suben desde el fondo para avisar que hay algo nuevo (el chat).
     */
    function triggerDiscoveryEffect() {
        console.log("🚀 Lanza efecto Neon Discovery...");
        const btn = document.getElementById('flashcard-tutor-trigger');
        if (!btn) return;

        const rect = btn.getBoundingClientRect();
        
        // 1. Crear el Aura base sutil (centrada en el botón)
        const aura = document.createElement('div');
        aura.className = 'tutor-discovery-aura';
        const auraSize = Math.max(rect.width, rect.height) * 2;
        aura.style.left = `${rect.left + rect.width / 2 - auraSize / 2}px`;
        aura.style.top = `${rect.top + rect.height / 2 - auraSize / 2}px`;
        aura.style.width = `${auraSize}px`;
        aura.style.height = `${auraSize}px`;
        document.body.appendChild(aura);

        // 2. Activar efecto NEÓN en el botón mismo
        btn.classList.add('neon-glow-pulse');
        
        // Cleanup Aura y remover pulso después de un tiempo
        setTimeout(() => {
            aura.remove();
            // No quitamos el neón inmediatamente para que el usuario lo vea
            setTimeout(() => btn.classList.remove('neon-glow-pulse'), 3000);
        }, 2000);
    }

    // --- Public API ---
    return {
        init,
        playAudio,
        rate,
        handleExit,
        triggerDiscoveryEffect
    };

})();

// Start
document.addEventListener('DOMContentLoaded', FlashcardManager.init);
