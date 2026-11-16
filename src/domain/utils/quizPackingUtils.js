/**
 * Utilidades puras de dominio para empaquetado atómico de casuísticas,
 * barajado de alternativas y sanitización de identificadores de examen.
 * Compartido entre MedicoService, DocenteService, MedicoRepository y DocenteRepository.
 */

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Filtra y deduplica un arreglo conservando únicamente UUIDs válidos.
 * @param {Array<string>} ids
 * @returns {Array<string>}
 */
function sanitizeUuidList(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const unique = new Set();
    for (const id of ids) {
        if (id && typeof id === 'string' && UUID_REGEX.test(id)) {
            unique.add(id);
        }
    }
    return Array.from(unique);
}

/**
 * Baraja las opciones de una pregunta preservando el índice de la respuesta correcta.
 * @param {Object} question
 * @returns {Object}
 */
function shuffleQuestionOptions(question) {
    if (!question || !Array.isArray(question.options) || question.options.length === 0) {
        return question;
    }

    const mappedOptions = question.options.map((opt, index) => ({
        text: opt,
        isCorrect: index === question.correct_option_index
    }));

    for (let i = mappedOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mappedOptions[i], mappedOptions[j]] = [mappedOptions[j], mappedOptions[i]];
    }

    question.options = mappedOptions.map(o => o.text);
    question.correct_option_index = mappedOptions.findIndex(o => o.isCorrect);

    return question;
}

/**
 * Empaqueta de forma atómica e indivisible casuísticas (preguntas hermanas) y reactivos individuales
 * garantizando que ninguna casuística sea cortada a la mitad y alcanzando con exactitud el límite solicitado.
 * @param {Array<Object>} rawBankQuestions
 * @param {number} limit
 * @param {Array<string>} activeAreas
 * @returns {Array<Object>}
 */
function packExamQuestions(rawBankQuestions, limit, activeAreas = []) {
    if (!Array.isArray(rawBankQuestions) || rawBankQuestions.length === 0) return [];
    if (rawBankQuestions.length <= limit) {
        return rawBankQuestions;
    }

    // 1. Mapeo de casos completos
    const casesMap = new Map();
    rawBankQuestions.forEach(q => {
        if (q.case_id) {
            if (!casesMap.has(q.case_id)) casesMap.set(q.case_id, []);
            casesMap.get(q.case_id).push(q);
        }
    });

    // Ordenar las preguntas dentro de cada casuística por case_order ASC
    casesMap.forEach(siblings => {
        siblings.sort((a, b) => (a.case_order || 1) - (b.case_order || 1));
    });

    // 2. Clasificar en bloques de casos y preguntas sueltas agrupadas por área
    const caseUnitsByArea = new Map();
    const soloQuestionsByArea = new Map();
    const registeredCaseIds = new Set();

    rawBankQuestions.forEach(q => {
        const topicKey = q.topic ? q.topic.toUpperCase() : 'GENERAL';
        if (q.case_id) {
            if (!registeredCaseIds.has(q.case_id)) {
                registeredCaseIds.add(q.case_id);
                const fullCase = casesMap.get(q.case_id);
                if (!caseUnitsByArea.has(topicKey)) caseUnitsByArea.set(topicKey, []);
                caseUnitsByArea.get(topicKey).push(fullCase);
            }
        } else {
            if (!soloQuestionsByArea.has(topicKey)) soloQuestionsByArea.set(topicKey, []);
            soloQuestionsByArea.get(topicKey).push(q);
        }
    });

    const packedUnits = [];
    let currentCount = 0;
    const areasList = activeAreas && activeAreas.length > 0
        ? activeAreas
        : Array.from(new Set([...soloQuestionsByArea.keys(), ...caseUnitsByArea.keys()]));

    // 3. Selección balanceada de casos completos (solo si caben enteros en el cupo restante)
    let hasCasesToProcess = true;
    while (hasCasesToProcess && currentCount < limit) {
        let addedAnyCaseInRound = false;
        for (const area of areasList) {
            const spaceLeft = limit - currentCount;
            if (spaceLeft <= 0) break;

            const areaCases = caseUnitsByArea.get(area);
            if (areaCases && areaCases.length > 0) {
                const fittingCaseIdx = areaCases.findIndex(c => c.length <= spaceLeft);
                if (fittingCaseIdx !== -1) {
                    const [fittingCase] = areaCases.splice(fittingCaseIdx, 1);
                    packedUnits.push(fittingCase);
                    currentCount += fittingCase.length;
                    addedAnyCaseInRound = true;
                }
            }
        }
        if (!addedAnyCaseInRound) {
            hasCasesToProcess = false;
        }
    }

    // 4. Completar el espacio restante con Preguntas Sueltas (size 1) de forma balanceada
    let hasSoloToProcess = true;
    while (hasSoloToProcess && currentCount < limit) {
        let addedAnySoloInRound = false;
        for (const area of areasList) {
            const spaceLeft = limit - currentCount;
            if (spaceLeft <= 0) break;

            const soloList = soloQuestionsByArea.get(area);
            if (soloList && soloList.length > 0) {
                packedUnits.push([soloList.shift()]);
                currentCount += 1;
                addedAnySoloInRound = true;
            }
        }
        if (!addedAnySoloInRound) {
            hasSoloToProcess = false;
        }
    }

    // 5. Salvaguarda: Si aún faltara completar cupo y quedan solos en cualquier área
    if (currentCount < limit) {
        for (const soloList of soloQuestionsByArea.values()) {
            while (soloList.length > 0 && currentCount < limit) {
                packedUnits.push([soloList.shift()]);
                currentCount += 1;
            }
        }
    }

    // 6. Mezclar de forma balanceada los bloques para que los casos no queden siempre agrupados al principio,
    // garantizando que las preguntas de cada casuística se mantengan siempre contiguas y en su orden oficial
    const shuffledUnits = packedUnits.sort(() => 0.5 - Math.random());
    return shuffledUnits.flat();
}

/**
 * Empaqueta un lote de preguntas para Modo Demo respetando la integridad de casuísticas y el límite estricto.
 * @param {Array<Object>} candidateRows
 * @param {Array<Object>} siblingRows
 * @param {number} limit
 * @returns {Array<Object>}
 */
function packDemoBatch(candidateRows, siblingRows, limit) {
    if (!candidateRows || candidateRows.length === 0) return [];

    const siblingMap = new Map();
    (siblingRows || []).forEach(sq => {
        if (!siblingMap.has(sq.case_id)) siblingMap.set(sq.case_id, []);
        siblingMap.get(sq.case_id).push(sq);
    });

    siblingMap.forEach(siblings => {
        siblings.sort((a, b) => (a.case_order || 1) - (b.case_order || 1));
    });

    const processedCaseIds = new Set();
    const reassembled = [];

    // 1. Empacar respetando la integridad del caso y el límite estricto
    for (const q of candidateRows) {
        if (reassembled.length >= limit) break;

        if (!q.case_id) {
            if (limit - reassembled.length >= 1) {
                reassembled.push(q);
            }
        } else if (!processedCaseIds.has(q.case_id)) {
            processedCaseIds.add(q.case_id);
            const siblings = siblingMap.get(q.case_id) || [q];
            const spaceLeft = limit - reassembled.length;
            if (siblings.length <= spaceLeft) {
                reassembled.push(...siblings);
            }
        }
    }

    // 2. Si quedan cupos libres (porque hubo casos que excedían el espacio restante), rellenar con preguntas sueltas
    if (reassembled.length < limit) {
        const addedIds = new Set(reassembled.map(r => r.id));
        for (const q of candidateRows) {
            if (reassembled.length >= limit) break;
            if (!q.case_id && !addedIds.has(q.id)) {
                addedIds.add(q.id);
                reassembled.push(q);
            }
        }
    }

    // 3. Salvaguarda final: si aún no se alcanza el límite y quedan candidatas no añadidas
    if (reassembled.length < limit) {
        const addedIds = new Set(reassembled.map(r => r.id));
        for (const q of candidateRows) {
            if (reassembled.length >= limit) break;
            if (!addedIds.has(q.id)) {
                addedIds.add(q.id);
                reassembled.push(q);
            }
        }
    }

    return reassembled.slice(0, limit);
}

/**
 * Normaliza una fila de pregunta de base de datos al contrato de salida del repositorio.
 * @param {Object} row
 * @param {boolean} includeTarget
 * @returns {Object}
 */
function mapQuestionRow(row, includeTarget = false) {
    const mapped = {
        id: row.id,
        question_text: row.question_text,
        options: row.options,
        correct_option_index: row.correct_option_index,
        explanation: row.explanation,
        explanation_image_url: row.explanation_image_url,
        image_url: row.image_url,
        topic: row.topic,
        case_id: row.case_id || null,
        case_order: row.case_id ? (parseInt(row.case_order, 10) || 1) : null,
        case_code: row.case_code || null,
        case_title: row.case_title || null,
        case_description: row.case_description || null,
        case_image_url: row.case_image_url || null
    };
    if (includeTarget) {
        mapped.target = row.target;
    }
    return mapped;
}

module.exports = {
    sanitizeUuidList,
    shuffleQuestionOptions,
    packExamQuestions,
    packDemoBatch,
    mapQuestionRow
};
