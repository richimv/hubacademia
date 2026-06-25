/**
 * my-vocabulary.js
 * standalone vocabulary module dashboard controller
 */

const MyVocabulary = (function () {
    let activeLang = sessionStorage.getItem('vocab_active_lang') || 'en-US';
    let currentVocabAudio = null;
    let recognition = null;
    let isRecording = false;
    let currentPracticeWord = null;
    let currentChallengeText = '';
    let vocabularyList = [];

    async function init() {
        console.log("📖 Inicializando Módulo 'Mi Vocabulario'...");

        // Verificar autenticación
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = '/';
            return;
        }

        // Configurar selector de idioma inicial
        const langSelect = document.getElementById('vocab-lang-select');
        if (langSelect) {
            langSelect.value = activeLang;
            langSelect.addEventListener('change', (e) => {
                activeLang = e.target.value;
                sessionStorage.setItem('vocab_active_lang', activeLang);
                loadVocabulary();
            });
        }

        // Bindeos de Modales y Formularios
        setupVocabularyActions();
        setupPracticeActions();

        // Ocultar Loader y Mostrar Contenido
        const loader = document.getElementById('loading');
        const content = document.getElementById('dashboard-content');
        if (loader) loader.style.display = 'none';
        if (content) content.style.display = 'block';

        // Cargar primera lista
        loadVocabulary();
    }

    // --- Cargar Vocabulario de base de datos ---
    async function loadVocabulary() {
        const table = document.getElementById('vocab-table');
        const tbody = document.getElementById('vocab-table-body');
        const emptyState = document.getElementById('vocab-empty-state');
        const metaInfo = document.getElementById('vocab-meta-info');

        if (!tbody || !emptyState || !table) return;

        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem;"><i class="fas fa-circle-notch fa-spin"></i> Cargando vocabulario...</td></tr>';
        emptyState.style.display = 'none';
        table.style.display = 'table';

        try {
            const langDisplay = activeLang === 'it-IT' ? 'Italiano' : (activeLang === 'en-GB' ? 'Inglés Británico' : 'Inglés Americano');
            if (metaInfo) metaInfo.innerText = `${langDisplay} • Palabras y expresiones guardadas en tu colección.`;

            const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/languages/vocabulary?languageCode=${activeLang}`);
            const data = await res.json();

            if (!data.success || !data.vocabulary || data.vocabulary.length === 0) {
                vocabularyList = [];
                table.style.display = 'none';
                emptyState.style.display = 'flex';
                return;
            }

            vocabularyList = data.vocabulary;
            tbody.innerHTML = '';

            data.vocabulary.forEach(w => {
                const tr = document.createElement('tr');
                tr.dataset.id = w.id;
                tr.style.cursor = 'pointer';

                const playBtn = w.audio_url
                    ? `<button class="btn-vocab-play" title="Escuchar pronunciación" onclick="event.stopPropagation(); MyVocabulary.playVocabAudio(this, '${w.audio_url}')"><i class="fas fa-volume-up"></i></button>`
                    : '';

                // Traducciones de POS
                const posLabels = {
                    verb: 'Verbo',
                    noun: 'Sustantivo',
                    adjective: 'Adjetivo',
                    pronoun: 'Pronombre',
                    determiner: 'Determinante',
                    adverb: 'Adverbio',
                    preposition: 'Preposición',
                    conjunction: 'Conjunción',
                    interjection: 'Interjección'
                };
                const posClass = `pos-${w.part_of_speech || 'noun'}`;
                const posText = posLabels[w.part_of_speech] || 'Sustantivo';

                // Badges de SRS
                const srsLabels = {
                    new: 'Nuevo',
                    learning: 'Aprendiendo',
                    review: 'En Repaso',
                    mastered: 'Dominado'
                };
                const srsClass = `srs-${w.srs_state || 'new'}`;
                const srsText = srsLabels[w.srs_state] || 'Nuevo';

                tr.innerHTML = `
                    <td>
                        <div class="vocab-word-cell">
                            <strong>${w.word}</strong>
                            ${playBtn}
                        </div>
                    </td>
                    <td>${w.translation}</td>
                    <td class="desktop-only"><span class="pos-badge ${posClass}">${posText}</span></td>
                    <td style="text-align: center;">
                        <span class="srs-badge ${srsClass}">${srsText}</span>
                    </td>
                    <td style="text-align: center;" onclick="event.stopPropagation();">
                        <div style="display:flex; justify-content:center; gap:0.5rem;">
                            <button class="btn-vocab-practice" onclick="MyVocabulary.openPractice('${w.id}')">
                                <i class="fas fa-play"></i> Practicar
                            </button>
                            <button class="btn-vocab-delete" title="Eliminar palabra" onclick="MyVocabulary.deleteVocabWord('${w.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;

                tr.addEventListener('click', () => toggleVocabRowDetails(tr, w));
                tbody.appendChild(tr);
            });

        } catch (err) {
            console.error("Error cargando vocabulario:", err);
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:#ef4444;"><i class="fas fa-exclamation-circle"></i> Error al cargar vocabulario.</td></tr>';
        }
    }

    // --- Detalle de Fila (Definiciones, Ejemplos, Conjugaciones/Flexiones) ---
    async function toggleVocabRowDetails(tr, w) {
        const next = tr.nextElementSibling;
        if (next && next.classList.contains('vocab-details-row')) {
            next.remove();
            return;
        }

        // Remover otros abiertos
        document.querySelectorAll('.vocab-details-row').forEach(row => row.remove());

        const detailTr = document.createElement('tr');
        detailTr.className = 'vocab-details-row';
        
        // Comprobar si tiene propiedades de conjugación/flexión
        const isVariable = ['verb', 'noun', 'adjective', 'pronoun', 'determiner'].includes(w.part_of_speech);
        let flexionsHtml = '';
        if (isVariable) {
            flexionsHtml = `
                <div class="conjugations-wrapper" id="conj-wrapper-${w.id}">
                    <div class="conjugations-title"><i class="fas fa-spinner fa-spin"></i> Cargando flexiones gramaticales...</div>
                </div>
            `;
        }

        detailTr.innerHTML = `
            <td colspan="5" style="padding: 0;">
                <div class="vocab-details-container" style="animation: slideDown 0.25s ease; padding: 1.25rem; background: rgba(10,10,10,0.2);">
                    <div><strong>Definición:</strong> ${w.definition || 'Sin definición guardada.'}</div>
                    <div style="margin-top:0.35rem;"><strong>Ejemplo en contexto:</strong> <span style="font-style:italic; color:#a78bfa;">"${w.example_sentence || 'Sin ejemplo guardado.'}"</span></div>
                    ${flexionsHtml}
                </div>
            </td>
        `;
        tr.parentNode.insertBefore(detailTr, tr.nextSibling);

        // Fetch conjugaciones si es palabra variable
        if (isVariable) {
            try {
                const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/languages/vocabulary/${w.id}/conjugations`);
                const data = await res.json();
                const conjWrapper = document.getElementById(`conj-wrapper-${w.id}`);
                if (!conjWrapper) return;

                if (data.success && data.conjugations && data.conjugations.length > 0) {
                    const pos = w.part_of_speech || 'noun';
                    let htmlContent = '';

                    const renderPlayIcon = (audioUrl) => audioUrl 
                        ? `<button class="btn-conj-play" onclick="event.stopPropagation(); MyVocabulary.playVocabAudio(this, '${audioUrl}')"><i class="fas fa-volume-up"></i></button>`
                        : '';

                    const renderItem = (c) => `
                        <div class="conjugation-item">
                            <div>
                                <span class="conjugation-label">${c.person && c.person !== 'N/A' && c.person !== 'All' ? c.person + ': ' : ''}${c.tense || 'inflexión'}</span>
                                <span class="conjugation-form">${c.form}</span>
                            </div>
                            ${renderPlayIcon(c.audio_url)}
                        </div>
                    `;

                    if (pos === 'verb') {
                        const simples = data.conjugations.filter(c => 
                            /present simple|past simple|future simple|conditional|presente indicativo|futuro semplice|condizionale/i.test(c.tense)
                        );
                        const compuestos = data.conjugations.filter(c => 
                            /present perfect|passato prossimo|imperfetto/i.test(c.tense)
                        );
                        const infinitas = data.conjugations.filter(c => 
                            /infinitive|past participle|present participle|infinito|gerundio|participio passato/i.test(c.tense)
                        );
                        const otros = data.conjugations.filter(c => 
                            !simples.includes(c) && !compuestos.includes(c) && !infinitas.includes(c)
                        );

                        let sections = '';
                        if (simples.length > 0) {
                            sections += `
                                <div class="conjugations-group group-verb">
                                    <div class="conjugations-group-title"><i class="far fa-clock"></i> Tiempos Simples</div>
                                    <div class="conjugations-group-grid">${simples.map(renderItem).join('')}</div>
                                </div>
                            `;
                        }
                        if (compuestos.length > 0) {
                            sections += `
                                <div class="conjugations-group group-verb">
                                    <div class="conjugations-group-title"><i class="fas fa-history"></i> Tiempos Compuestos y Pasados</div>
                                    <div class="conjugations-group-grid">${compuestos.map(renderItem).join('')}</div>
                                </div>
                            `;
                        }
                        if (infinitas.length > 0) {
                            sections += `
                                <div class="conjugations-group group-verb">
                                    <div class="conjugations-group-title"><i class="fas fa-infinity"></i> Formas Infinitas y Participios</div>
                                    <div class="conjugations-group-grid">${infinitas.map(renderItem).join('')}</div>
                                </div>
                            `;
                        }
                        if (otros.length > 0) {
                            sections += `
                                <div class="conjugations-group group-verb">
                                    <div class="conjugations-group-title"><i class="fas fa-asterisk"></i> Otras Flexiones</div>
                                    <div class="conjugations-group-grid">${otros.map(renderItem).join('')}</div>
                                </div>
                            `;
                        }
                        htmlContent = `<div class="conjugations-groups-container">${sections}</div>`;

                    } else if (pos === 'noun') {
                        const singular = data.conjugations.filter(c => /singular/i.test(c.tense));
                        const plural = data.conjugations.filter(c => /plural/i.test(c.tense));
                        const otros = data.conjugations.filter(c => !singular.includes(c) && !plural.includes(c));

                        let sections = '';
                        if (singular.length > 0) {
                            sections += `
                                <div class="conjugations-group group-noun">
                                    <div class="conjugations-group-title"><i class="fas fa-cube"></i> Formas de Singular</div>
                                    <div class="conjugations-group-grid">${singular.map(renderItem).join('')}</div>
                                </div>
                            `;
                        }
                        if (plural.length > 0) {
                            sections += `
                                <div class="conjugations-group group-noun">
                                    <div class="conjugations-group-title"><i class="fas fa-cubes"></i> Formas de Plural</div>
                                    <div class="conjugations-group-grid">${plural.map(renderItem).join('')}</div>
                                </div>
                            `;
                        }
                        if (otros.length > 0) {
                            sections += `
                                <div class="conjugations-group group-noun">
                                    <div class="conjugations-group-title"><i class="fas fa-genderless"></i> Otras Flexiones</div>
                                    <div class="conjugations-group-grid">${otros.map(renderItem).join('')}</div>
                                </div>
                            `;
                        }
                        htmlContent = `<div class="conjugations-groups-container">${sections}</div>`;

                    } else if (pos === 'adjective') {
                        const comparatives = data.conjugations.filter(c => /comparative|superlative/i.test(c.tense));
                        const concordancias = data.conjugations.filter(c => !comparatives.includes(c));

                        let sections = '';
                        if (comparatives.length > 0) {
                            sections += `
                                <div class="conjugations-group group-adj">
                                    <div class="conjugations-group-title"><i class="fas fa-compress-alt"></i> Grados de Comparación</div>
                                    <div class="conjugations-group-grid">${comparatives.map(renderItem).join('')}</div>
                                </div>
                            `;
                        }
                        if (concordancias.length > 0) {
                            sections += `
                                <div class="conjugations-group group-adj">
                                    <div class="conjugations-group-title"><i class="fas fa-adjust"></i> Concordancia de Género y Número</div>
                                    <div class="conjugations-group-grid">${concordancias.map(renderItem).join('')}</div>
                                </div>
                            `;
                        }
                        htmlContent = `<div class="conjugations-groups-container">${sections}</div>`;

                    } else {
                        htmlContent = `
                            <div class="conjugations-group group-other">
                                <div class="conjugations-group-title"><i class="fas fa-bookmark"></i> Casos y Declinaciones</div>
                                <div class="conjugations-group-grid">${data.conjugations.map(renderItem).join('')}</div>
                            </div>
                        `;
                    }

                    conjWrapper.innerHTML = `
                        <div class="conjugations-title"><i class="fas fa-book-open"></i> Estructura y Flexiones Organizadas:</div>
                        ${htmlContent}
                    `;
                } else {
                    conjWrapper.innerHTML = `<div class="conjugations-title" style="color: var(--text-muted);"><i class="fas fa-info-circle"></i> No se encontraron flexiones estructuradas para esta palabra.</div>`;
                }
            } catch (err) {
                console.error("Error cargando conjugaciones:", err);
                const conjWrapper = document.getElementById(`conj-wrapper-${w.id}`);
                if (conjWrapper) {
                    conjWrapper.innerHTML = `<div class="conjugations-title" style="color: #ef4444;"><i class="fas fa-exclamation-triangle"></i> Falló la carga de flexiones.</div>`;
                }
            }
        }
    }



    // --- Borrar Palabra ---
    async function deleteVocabWord(id) {
        if (!confirm("¿Estás seguro de eliminar esta palabra de tu vocabulario?")) return;

        try {
            const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/languages/vocabulary/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                window.uiManager?.showToast("Palabra eliminada", "success");
                loadVocabulary();
            } else {
                alert(data.error || "Error al eliminar la palabra.");
            }
        } catch (e) {
            console.error("Delete vocab error:", e);
        }
    }

    // --- Bindeos del Modal para Agregar Palabra ---
    function setupVocabularyActions() {
        const btnOpenAdd = document.getElementById('btn-open-vocab-add');
        const btnCloseAdd = document.getElementById('btn-close-vocab-modal');
        const btnCancelAdd = document.getElementById('btn-cancel-vocab-save');
        const vocabModal = document.getElementById('vocab-modal-overlay');
        const btnAiFill = document.getElementById('btn-vocab-ai-fill');
        const btnSave = document.getElementById('btn-save-vocab');

        const wordInput = document.getElementById('vocab-word');
        const suggestionsDropdown = document.getElementById('vocab-suggestions-dropdown');

        let debounceTimeout = null;
        const suggestionsCache = new Map();

        if (wordInput && suggestionsDropdown) {
            const renderSuggestions = (suggestions) => {
                suggestionsDropdown.innerHTML = suggestions.map(s => {
                    const posLabels = {
                        verb: 'Verbo', noun: 'Sustantivo', adjective: 'Adjetivo',
                        pronoun: 'Pronombre', determiner: 'Determinante', adverb: 'Adverbio',
                        preposition: 'Preposición', conjunction: 'Conjunción', interjection: 'Interjección'
                    };
                    const posText = posLabels[s.part_of_speech] || s.part_of_speech || '';
                    return `
                        <div class="vocab-suggestion-item" data-word="${s.word}" data-translation="${s.translation}" data-definition="${s.definition || ''}" data-example="${s.example_sentence || ''}" data-pos="${s.part_of_speech || ''}">
                            <div>
                                <span class="vocab-suggestion-word">${s.word}</span>
                                <span class="vocab-suggestion-translation">• ${s.translation}</span>
                            </div>
                            <span class="vocab-suggestion-pos">${posText}</span>
                        </div>
                    `;
                }).join('');
                suggestionsDropdown.style.display = 'block';

                // Registrar eventos click en los items de sugerencias
                document.querySelectorAll('.vocab-suggestion-item').forEach(item => {
                    item.onclick = () => {
                        wordInput.value = item.dataset.word;
                        document.getElementById('vocab-translation').value = item.dataset.translation;
                        document.getElementById('vocab-definition').value = item.dataset.definition;
                        document.getElementById('vocab-example').value = item.dataset.example;
                        if (item.dataset.pos) {
                            document.getElementById('vocab-pos').value = item.dataset.pos;
                        }
                        suggestionsDropdown.style.display = 'none';
                        suggestionsDropdown.innerHTML = '';
                        window.uiManager?.showToast("Detalles completados desde catálogo global", "success");
                    };
                });
            };

            wordInput.addEventListener('input', () => {
                const query = wordInput.value.trim();
                clearTimeout(debounceTimeout);

                if (query.length < 1) {
                    suggestionsDropdown.style.display = 'none';
                    suggestionsDropdown.innerHTML = '';
                    return;
                }

                const cacheKey = `${activeLang}_${query.toLowerCase()}`;
                if (suggestionsCache.has(cacheKey)) {
                    renderSuggestions(suggestionsCache.get(cacheKey));
                    return;
                }

                debounceTimeout = setTimeout(async () => {
                    try {
                        const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/languages/vocabulary/search-suggestions?q=${encodeURIComponent(query)}&languageCode=${activeLang}`);
                        const data = await res.json();
                        if (data.success && data.suggestions && data.suggestions.length > 0) {
                            suggestionsCache.set(cacheKey, data.suggestions);
                            renderSuggestions(data.suggestions);
                        } else {
                            suggestionsDropdown.style.display = 'none';
                            suggestionsDropdown.innerHTML = '';
                        }
                    } catch (err) {
                        console.error("Suggestions fetch failed:", err);
                    }
                }, 100);
            });

            // Cerrar dropdown al hacer click afuera
            document.addEventListener('click', (e) => {
                if (e.target !== wordInput && e.target !== suggestionsDropdown && !suggestionsDropdown.contains(e.target)) {
                    suggestionsDropdown.style.display = 'none';
                }
            });
        }

        const closeModal = () => {
            if (vocabModal) vocabModal.classList.remove('active');
            document.getElementById('vocab-word').value = '';
            document.getElementById('vocab-translation').value = '';
            document.getElementById('vocab-definition').value = '';
            document.getElementById('vocab-example').value = '';
            if (suggestionsDropdown) {
                suggestionsDropdown.style.display = 'none';
                suggestionsDropdown.innerHTML = '';
            }
            if (window.uiManager && typeof window.uiManager.popModalState === 'function') {
                window.uiManager.popModalState('vocab-modal-overlay');
            }
        };

        if (btnOpenAdd) {
            btnOpenAdd.onclick = () => {
                if (vocabModal) {
                    vocabModal.classList.add('active');
                    document.getElementById('vocab-word').focus();
                    if (window.uiManager?.pushModalState) {
                        window.uiManager.pushModalState('vocab-modal-overlay');
                    }
                }
            };
        }

        if (btnCloseAdd) btnCloseAdd.onclick = closeModal;
        if (btnCancelAdd) btnCancelAdd.onclick = closeModal;
        if (vocabModal) {
            vocabModal.onclick = (e) => { if (e.target === vocabModal) closeModal(); };
        }

        if (btnAiFill) {
            btnAiFill.onclick = async () => {
                const word = document.getElementById('vocab-word').value.trim();
                const pos = document.getElementById('vocab-pos').value;
                if (!word) {
                    alert("Por favor escribe una palabra primero.");
                    return;
                }

                btnAiFill.disabled = true;
                const originalHtml = btnAiFill.innerHTML;
                btnAiFill.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Completando...';

                try {
                    const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/languages/vocabulary/generate`, {
                        method: 'POST',
                        body: JSON.stringify({
                            word,
                            languageCode: activeLang,
                            part_of_speech: pos
                        })
                    });

                    if (res.status === 403) {
                        if (window.uiManager && typeof window.uiManager.showPaywallModal === 'function') {
                            window.uiManager.showPaywallModal(null, 'languages');
                        } else {
                            alert('Has alcanzado tus límites de consultas de IA.');
                        }
                        return;
                    }

                    const data = await res.json();
                    if (data.success && data.data) {
                        if (data.data.word && data.data.word !== 'Inválido') {
                            document.getElementById('vocab-word').value = data.data.word;
                        }
                        document.getElementById('vocab-translation').value = data.data.translation || '';
                        document.getElementById('vocab-definition').value = data.data.definition || '';
                        document.getElementById('vocab-example').value = data.data.example_sentence || '';
                        if (data.data.part_of_speech) {
                            document.getElementById('vocab-pos').value = data.data.part_of_speech;
                        }
                    } else {
                        alert(data.error || "No se pudo autocompletar.");
                    }
                } catch (e) {
                    console.error("AI completion error:", e);
                } finally {
                    btnAiFill.disabled = false;
                    btnAiFill.innerHTML = originalHtml;
                }
            };
        }

        if (btnSave) {
            btnSave.onclick = async () => {
                const word = document.getElementById('vocab-word').value.trim();
                const part_of_speech = document.getElementById('vocab-pos').value;
                const translation = document.getElementById('vocab-translation').value.trim();
                const definition = document.getElementById('vocab-definition').value.trim();
                const example = document.getElementById('vocab-example').value.trim();

                if (!word || !translation) {
                    alert("La palabra y su traducción son obligatorias.");
                    return;
                }

                btnSave.disabled = true;
                btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

                try {
                    const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/languages/vocabulary`, {
                        method: 'POST',
                        body: JSON.stringify({
                            word, translation, definition,
                            example_sentence: example,
                            languageCode: activeLang,
                            part_of_speech
                        })
                    });

                    const data = await res.json();
                    if (data.success) {
                        window.uiManager?.showToast("Palabra guardada en tu vocabulario", "success");
                        closeModal();
                        loadVocabulary();
                    } else {
                        alert(data.error || "Error al guardar la palabra.");
                    }
                } catch (e) {
                    console.error("Save vocabulary error:", e);
                } finally {
                    btnSave.disabled = false;
                    btnSave.innerText = 'Guardar Palabra';
                }
            };
        }


    }

    // --- Reproducción de Audio TTS (Caché GCS) ---
    function playVocabAudio(btn, url) {
        if (!url) return;
        const icon = btn.querySelector('i');
        if (!icon || icon.classList.contains('fa-spinner')) return;

        icon.className = 'fas fa-spinner fa-spin';

        // Detener audio previo
        if (currentVocabAudio) {
            try {
                currentVocabAudio.pause();
                document.querySelectorAll('.btn-vocab-play i.fa-spinner, .btn-vocab-play i.fa-stop, .btn-conj-play i.fa-spinner').forEach(i => {
                    i.className = 'fas fa-volume-up';
                });
            } catch (e) { }
        }

        const audio = new Audio(`${window.AppConfig.API_URL}/api/media/gcs?path=${encodeURIComponent(url)}`);
        currentVocabAudio = audio;

        audio.onplay = () => {
            icon.className = 'fas fa-volume-up';
            btn.classList.add('playing');
        };

        audio.onended = () => {
            icon.className = 'fas fa-volume-up';
            btn.classList.remove('playing');
            currentVocabAudio = null;
        };

        audio.onerror = () => {
            icon.className = 'fas fa-exclamation-triangle';
            btn.classList.remove('playing');
            currentVocabAudio = null;
            setTimeout(() => { icon.className = 'fas fa-volume-up'; }, 2000);
        };

        audio.play().catch(err => {
            console.error("TTS play failed:", err);
            icon.className = 'fas fa-volume-mute';
            btn.classList.remove('playing');
            currentVocabAudio = null;
            setTimeout(() => { icon.className = 'fas fa-volume-up'; }, 2000);
        });
    }

    // --- Modal de Práctica Inteligente y Algoritmo de Speaking (Web Speech API) ---
    async function openPractice(id) {
        currentVocabAudio = null;
        const modal = document.getElementById('practice-modal-overlay');
        if (!modal) return;

        // Reset UI de práctica
        document.getElementById('practice-word-title').innerText = '...';
        document.getElementById('practice-pos-badge').innerText = '';
        document.getElementById('practice-translation-sub').innerText = '';
        document.getElementById('practice-challenge-desc').innerText = 'Cargando reto sintáctico...';
        
        document.getElementById('practice-text-answer').value = '';
        document.getElementById('practice-voice-transcript').value = '';
        
        document.getElementById('practice-feedback-card').style.display = 'none';
        
        // Mostrar botones de flujo correctos
        document.getElementById('btn-practice-submit').style.display = 'inline-block';
        document.getElementById('btn-practice-retry').style.display = 'none';
        document.getElementById('btn-practice-finish').style.display = 'none';
        
        // Cambiar por defecto al modo texto
        switchPracticeMode('text');

        modal.classList.add('active');
        if (window.uiManager?.pushModalState) {
            window.uiManager.pushModalState('practice-modal-overlay');
        }

        try {
            // Cargar datos de la palabra desde caché local o fetch de respaldo
            let word = vocabularyList.find(w => String(w.id) === String(id));
            if (!word) {
                const wordRes = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/languages/vocabulary?languageCode=${activeLang}`);
                const wordData = await wordRes.json();
                if (!wordData.success) throw new Error();
                word = wordData.vocabulary.find(w => String(w.id) === String(id));
            }
            if (!word) throw new Error();

            currentPracticeWord = word;
            document.getElementById('practice-word-title').innerText = word.word;
            document.getElementById('practice-pos-badge').innerText = (word.part_of_speech || 'noun').toUpperCase();
            document.getElementById('practice-translation-sub').innerText = `Traducción: ${word.translation}`;

            // Cargar reto sintáctico
            const challengeRes = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/languages/vocabulary/${id}/challenge`);
            const challengeData = await challengeRes.json();
            if (challengeData.success && challengeData.challenge) {
                currentChallengeText = challengeData.challenge;
                document.getElementById('practice-challenge-desc').innerText = challengeData.challenge;
            } else {
                currentChallengeText = `Escribe o pronuncia una frase utilizando el término: "${word.word}"`;
                document.getElementById('practice-challenge-desc').innerText = currentChallengeText;
            }

        } catch (e) {
            console.error(e);
            document.getElementById('practice-challenge-desc').innerText = 'No se pudo cargar el reto del tutor. Intenta cerrar y abrir de nuevo.';
        }
    }

    function switchPracticeMode(mode) {
        const btnText = document.getElementById('btn-mode-text');
        const btnVoice = document.getElementById('btn-mode-voice');
        const containerText = document.getElementById('practice-text-input-container');
        const containerVoice = document.getElementById('practice-voice-input-container');

        if (mode === 'voice') {
            btnText.classList.remove('active');
            btnVoice.classList.add('active');
            containerText.style.display = 'none';
            containerVoice.style.display = 'flex';
            initVoiceRecognition();
        } else {
            btnText.classList.add('active');
            btnVoice.classList.remove('active');
            containerText.style.display = 'flex';
            containerVoice.style.display = 'none';
            stopVoiceRecording();
        }
    }

    // --- Web Speech API (Grabación de Voz) ---
    function initVoiceRecognition() {
        if (recognition) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            document.getElementById('practice-mic-status').innerText = '⚠️ Tu navegador no soporta Speech Recognition (usa Chrome/Safari).';
            document.getElementById('btn-practice-mic').disabled = true;
            return;
        }

        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = activeLang;

        let silenceTimer = null;

        recognition.onstart = () => {
            isRecording = true;
            document.getElementById('btn-practice-mic').classList.add('recording');
            document.getElementById('practice-wave-indicator').classList.add('active');
            document.getElementById('practice-mic-status').innerText = '🎙️ Escuchando...';
        };

        recognition.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                const textarea = document.getElementById('practice-voice-transcript');
                textarea.value = finalTranscript.trim();
            }

            // Silence timeout: auto-stop after 3 seconds of silence
            clearTimeout(silenceTimer);
            silenceTimer = setTimeout(() => {
                stopVoiceRecording();
            }, 3000);
        };

        recognition.onerror = (e) => {
            console.error("Speech recognition error:", e.error);
            stopVoiceRecording();
        };

        recognition.onend = () => {
            isRecording = false;
            document.getElementById('btn-practice-mic').classList.remove('recording');
            document.getElementById('practice-wave-indicator').classList.remove('active');
            document.getElementById('practice-mic-status').innerText = 'Grabación finalizada.';
        };
    }

    function toggleVoiceRecording() {
        if (!recognition) return;

        if (isRecording) {
            stopVoiceRecording();
        } else {
            document.getElementById('practice-voice-transcript').value = '';
            try {
                recognition.start();
            } catch (err) {
                console.error(err);
            }
        }
    }

    function stopVoiceRecording() {
        if (recognition && isRecording) {
            try {
                recognition.stop();
            } catch (err) { }
        }
    }

    // --- Bindeos del Modal de Práctica ---
    function setupPracticeActions() {
        const modal = document.getElementById('practice-modal-overlay');
        const btnClose = document.getElementById('btn-close-practice-modal');
        const btnCancel = document.getElementById('btn-practice-cancel');
        
        const btnModeText = document.getElementById('btn-mode-text');
        const btnModeVoice = document.getElementById('btn-mode-voice');
        const btnMic = document.getElementById('btn-practice-mic');
        
        const btnSubmit = document.getElementById('btn-practice-submit');
        const btnRetry = document.getElementById('btn-practice-retry');
        const btnFinish = document.getElementById('btn-practice-finish');

        const closeModal = () => {
            stopVoiceRecording();
            if (modal) modal.classList.remove('active');
            currentPracticeWord = null;
            if (window.uiManager && typeof window.uiManager.popModalState === 'function') {
                window.uiManager.popModalState('practice-modal-overlay');
            }
        };

        if (btnClose) btnClose.onclick = closeModal;
        if (btnCancel) btnCancel.onclick = closeModal;
        if (modal) {
            modal.onclick = (e) => { if (e.target === modal) closeModal(); };
        }

        if (btnModeText) btnModeText.onclick = () => switchPracticeMode('text');
        if (btnModeVoice) btnModeVoice.onclick = () => switchPracticeMode('voice');
        
        if (btnMic) btnMic.onclick = toggleVoiceRecording;

        if (btnSubmit) btnSubmit.onclick = handlePracticeSubmission;
        if (btnRetry) btnRetry.onclick = handleRetry;
        if (btnFinish) btnFinish.onclick = closeModal;
    }

    // --- Procesamiento de Evaluación (HTTP + AI + Algoritmo SRS local) ---
    async function handlePracticeSubmission() {
        const btnSubmit = document.getElementById('btn-practice-submit');
        const isVoice = document.getElementById('btn-mode-voice').classList.contains('active');
        let answer = '';

        if (isVoice) {
            answer = document.getElementById('practice-voice-transcript').value.trim();
        } else {
            answer = document.getElementById('practice-text-answer').value.trim();
        }

        if (!answer) {
            alert("Por favor escribe o pronuncia una oración antes de evaluar.");
            return;
        }

        stopVoiceRecording();

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Evaluando...';

        try {
            const res = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/languages/vocabulary/${currentPracticeWord.id}/practice`, {
                method: 'POST',
                body: JSON.stringify({
                    userInput: answer,
                    inputMode: isVoice ? 'voice' : 'text',
                    challengeType: currentChallengeText
                })
            });

            if (res.status === 403) {
                alert("Has alcanzado tu límite diario de prácticas. Actualiza a Premium para continuar.");
                return;
            }

            const data = await res.json();
            if (data.success && data.evaluation) {
                renderPracticeResult(data.evaluation);
            } else {
                alert(data.error || "No se pudo procesar la evaluación.");
            }

        } catch (err) {
            console.error(err);
            alert("Ocurrió un error al contactar al tutor de IA.");
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = 'Evaluar Oración';
        }
    }

    function renderPracticeResult(evaluation) {
        const feedbackCard = document.getElementById('practice-feedback-card');
        const statusText = document.getElementById('feedback-status-text');
        const precisionScore = document.getElementById('feedback-precision-score');
        const diffBox = document.getElementById('feedback-diff-box');
        const diffText = document.getElementById('feedback-diff-text');
        const pedagogicalText = document.getElementById('feedback-pedagogical');

        const btnSubmit = document.getElementById('btn-practice-submit');
        const btnRetry = document.getElementById('btn-practice-retry');
        const btnFinish = document.getElementById('btn-practice-finish');

        if (!feedbackCard) return;

        // Renderizar porcentajes y glow
        precisionScore.innerText = `${evaluation.precision_score}%`;
        feedbackCard.style.display = 'block';

        // Estilos e íconos en base a validez sintáctica
        if (evaluation.precision_score >= 85) {
            feedbackCard.className = 'practice-feedback-card correct-glow';
            statusText.innerHTML = '<i class="fas fa-check-circle" style="color:#10b981;"></i> Aceptable';
            
            // Flujo exitoso -> Mostrar botón de completar y recargar lista
            btnSubmit.style.display = 'none';
            btnRetry.style.display = 'none';
            btnFinish.style.display = 'inline-block';

            // Actualizar la lista en segundo plano
            loadVocabulary();
        } else {
            feedbackCard.className = 'practice-feedback-card incorrect-glow';
            statusText.innerHTML = '<i class="fas fa-times-circle" style="color:#ef4444;"></i> Corregir';

            // Bucle de autocorrección: Obligar a reintentar
            btnSubmit.style.display = 'none';
            btnRetry.style.display = 'inline-block';
            btnFinish.style.display = 'none';
        }

        // Renderizar diferencias si aplica (Modo texto con correcciones ortográficas)
        if (evaluation.corrections && evaluation.corrections.length > 0) {
            diffBox.style.display = 'block';
            let diffHtml = '';
            
            // Construir representación visual de la corrección
            evaluation.corrections.forEach(c => {
                diffHtml += `<p>• Se sugirió cambiar <span class="diff-wrong">${c.original}</span> por <span class="diff-right">${c.corrected}</span>: <em>${c.explanation}</em></p>`;
            });
            diffText.innerHTML = diffHtml;
        } else {
            diffBox.style.display = 'none';
        }

        // Explicación Didáctica (Markdown)
        if (window.MarkdownRenderer) {
            pedagogicalText.innerHTML = window.MarkdownRenderer.render(evaluation.pedagogical_feedback);
        } else {
            pedagogicalText.innerText = evaluation.pedagogical_feedback;
        }
    }

    function handleRetry() {
        document.getElementById('practice-feedback-card').style.display = 'none';
        document.getElementById('btn-practice-submit').style.display = 'inline-block';
        document.getElementById('btn-practice-retry').style.display = 'none';
        document.getElementById('btn-practice-finish').style.display = 'none';

        const isVoice = document.getElementById('btn-mode-voice').classList.contains('active');
        if (isVoice) {
            document.getElementById('practice-voice-transcript').value = '';
        } else {
            document.getElementById('practice-text-answer').focus();
        }
    }

    return {
        init,
        playVocabAudio,
        openPractice,
        deleteVocabWord
    };
})();

document.addEventListener('DOMContentLoaded', MyVocabulary.init);
