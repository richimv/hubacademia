/**
 * Flashcard Manager (Senior Version)
 * Handles State, API Communication, and UI Transitions responsibly.
 */

const FlashcardManager = (() => {
    // --- Config & State ---
    const API_URL = `${window.AppConfig.API_URL}/api/training/flashcards`;
    let queue = [];
    let currentCard = null;
    let isFlipped = false;
    let syncQueue = []; // ✅ NUEVO: Cola de sincronización local

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
        const isDemo = urlParams.get('demo') === 'true';

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
            }
        ];
        updatePendingCount();
        renderCard(queue[0]);
        setView('card');
    }

    // --- Logic ---
    // --- Logic ---
    async function loadCards(token) {
        const urlParams = new URLSearchParams(window.location.search);
        const deckId = urlParams.get('deckId');

        // Modificar el botón de "Progreso/Salir" según el contexto
        const progressBtn = document.getElementById('btn-progress');
        if (progressBtn) {
            if (deckId) {
                progressBtn.href = `/repaso?deckId=${deckId}`;
                progressBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Volver al Mazo';
            } else {
                progressBtn.href = '/simulators';
                progressBtn.innerHTML = '<i class="fas fa-home"></i> Ir al Hub';
            }
        }

        // Also update the 'Todo al día' modal button
        const backDeckBtn = document.getElementById('btn-back-deck');
        if (backDeckBtn && deckId) {
            backDeckBtn.href = `/repaso?deckId=${deckId}`;
        }

        // 2. Build URL based on context (Deck vs Global vs Single Card)
        const cardId = urlParams.get('cardId');
        let endpoint = `${API_URL}/due`; // Default Legacy Global
        if (deckId) {
            endpoint = `${window.AppConfig.API_URL}/api/decks/${deckId}/cards/due`;
        }
        if (cardId) {
            // Si hay cardId, usamos el nuevo endpoint de estudio individual
            endpoint = `${window.AppConfig.API_URL}/api/decks/${deckId || 'all'}/cards/${cardId}/study`;
        }


        // ✅ NUEVO: Carga resiliente
        const res = await window.uiManager.safeFetch(endpoint, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('API Failed');

        const data = await res.json();

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

        // Content (Prevent XSS safely via textContent)
        // Logic: Use card topic if available (system decks), otherwise use Deck Name from URL, otherwise 'GENERAL'
        const urlParams = new URLSearchParams(window.location.search);
        const deckName = urlParams.get('deckName');

        ui.topic.textContent = card.topic || deckName || 'GENERAL';
        ui.frontText.innerHTML = card.front_content.replace(/\n/g, '<br>');
        ui.backText.innerHTML = card.back_content.replace(/\n/g, '<br>');

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
            // ✅ Algoritmo Dinámico: Escalar según longitud y presencia de imagen
            let baseSize = 1.6; // Valor base
            const length = text.length;

            if (length > 250) baseSize = 0.95;
            else if (length > 150) baseSize = 1.1;
            else if (length > 100) baseSize = 1.25;
            else if (length > 50) baseSize = 1.45;
            else if (length > 0 && length <= 20) baseSize = 2.8; // ✅ ULTRA BIG para textos cortos (test, términos únicos)
            else if (length > 20 && length <= 50) baseSize = 2.0;

            // ✅ Si hay imagen, reducimos proporcionalmente para que no colisionen
            if (hasImage) {
                if (length <= 20) baseSize = 1.8; // Ajuste moderado si hay imagen
                else baseSize *= 0.8; 
            }

            element.style.fontSize = `${baseSize}rem`;
        };

        adjustFontSize(ui.frontText, card.front_content || '', hasFrontImage);
        adjustFontSize(ui.backText, card.back_content || '', hasBackImage);
    }

    function toggleFlip() {
        isFlipped = !isFlipped;
        if (isFlipped) {
            ui.card.classList.add('is-flipped');
            ui.controls.classList.add('visible'); // Show controls when answer is revealed
        } else {
            ui.card.classList.remove('is-flipped');
            ui.controls.classList.remove('visible');
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
        updatePendingCount();

        if (isDemo) {
            console.log(`Demo card ${processedCard.id} rated with ${quality}`);
            // Show toast if possible
            if (window.uiManager && window.uiManager.showToast) {
                window.uiManager.showToast('¡Buen progreso! Los usuarios registrados guardan esto en su curva de aprendizaje.', 'info');
            }

            if (queue.length > 0) {
                renderCard(queue[0]);
            } else {
                // End of demo — prompt to join
                if (window.uiManager && typeof window.uiManager.showAuthPromptModal === 'function') {
                    window.uiManager.showAuthPromptModal("¡Demo Finalizada! Únete gratis para crear tus propios mazos y dominar miles de tarjetas.");
                } else {
                    alert("¡Has completado la demo! Regístrate para continuar.");
                    window.location.href = '/register';
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

        syncReview(reviewData, token); // Fire and forget (Asíncrono)

        // Liberar bloqueo inmediatamente después del proceso local (antes de que responda red)
        _isRating = false;
        if (ui.controls) {
            ui.controls.style.pointerEvents = 'auto';
            ui.controls.style.opacity = '1';
        }

        // 3. Si estudiábamos una sola tarjeta (cardId), volvemos al mazo inmediatamente
        if (urlParams.has('cardId')) {
            const currentDeckId = urlParams.get('deckId') || '';
            window.location.href = `/repaso?deckId=${currentDeckId}`;
            return;
        }

        // 4. Show next card IMMEDIATELY (UX fluida)
        if (queue.length > 0) {
            renderCard(queue[0]);
        } else {
            await loadCards(token);
        }
    }

    /**
     * Sincroniza una revisión individual con reintentos
     */
    async function syncReview(reviewData, token) {
        try {
            await window.uiManager.safeFetch(`${API_URL}/review`, {
                method: 'POST',
                isRetryable: true,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
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

    // --- Event Listeners ---
    ui.card.addEventListener('click', toggleFlip);

    // --- Public API ---
    return {
        init,
        rate
    };

})();

// Start
document.addEventListener('DOMContentLoaded', FlashcardManager.init);
