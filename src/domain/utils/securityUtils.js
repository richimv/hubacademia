/**
 * Hub Academia - Utilidades de Seguridad y Sanitización
 * Protege contra SQL Injection en consultas manuales y Prompt Injections en la IA.
 */

// Límite de longitud por tipo de input para prevenir DoS y payloads masivos
const LIMITS = {
    WORD: 80,
    TOPIC: 150,
    SHORT_TEXT: 500,
    LONG_TEXT: 2000,
    CONTEXT_TEXT: 12000
};

/**
 * Sanitiza una cadena de texto para enviarla de forma segura a los modelos de IA.
 * Remueve caracteres de control, limita longitud y mitiga directivas de jailbreak/inyección.
 */
function sanitizeInputForAI(text, maxLength = LIMITS.CONTEXT_TEXT) {
    if (!text || typeof text !== 'string') return '';
    
    // Limitar longitud
    let sanitized = text.substring(0, maxLength).trim();
    
    // Eliminar posibles etiquetas HTML/Script
    sanitized = sanitized.replace(/<[^>]*>/gi, '');
    
    // Neutralizar intentos de Prompt Injection comunes
    const jailbreakPatterns = [
        /ignore\s+(all\s+)?(previous\s+)?instructions/gi,
        /olvida\s+las\s+instrucciones\s+(anteriores)?/gi,
        /system\s+instruction/gi,
        /you\s+are\s+now\s+a/gi,
        /act\s+as\s+a/gi,
        /eres\s+ahora\s+un/gi,
        /nueva\s+instrucción/gi,
        /ignora\s+las\s+reglas/gi
    ];
    
    jailbreakPatterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '[REMOVED_SUSPICIOUS_DIRECTIVE]');
    });
    
    return sanitized;
}

/**
 * Valida si un objeto de estadísticas para diagnóstico de IA es legítimo y seguro.
 */
function validateDiagnosticStats(stats) {
    if (!stats || typeof stats !== 'object') {
        throw new Error('INVALID_STATS_OBJECT');
    }
    
    const avg_score = parseFloat(stats.avg_score);
    const accuracy = parseFloat(stats.accuracy);
    const mastered_cards = parseInt(stats.mastered_cards, 10);
    
    if (isNaN(avg_score) || isNaN(accuracy) || isNaN(mastered_cards)) {
        throw new Error('INVALID_STATS_NUMBERS');
    }
    
    // Validar y sanitizar radar_data (Soporta Array de objetos o Mapa de pares clave-valor)
    let cleanRadarData;
    if (Array.isArray(stats.radar_data)) {
        cleanRadarData = stats.radar_data
            .map(item => {
                if (!item || typeof item !== 'object') return null;
                const subject = typeof item.subject === 'string'
                    ? item.subject.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/<[^>]*>/gi, '').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_,]/g, '').replace(/\s+/g, ' ').substring(0, 70).trim()
                    : '';
                const itemAcc = parseFloat(item.accuracy || 0);
                const itemTotal = parseInt(item.total || 0, 10);
                const itemCorrect = parseInt(item.correct || 0, 10);
                if (!subject) return null;
                return {
                    subject,
                    accuracy: isNaN(itemAcc) ? 0 : Math.min(Math.max(itemAcc, 0), 100),
                    correct: isNaN(itemCorrect) ? 0 : Math.max(itemCorrect, 0),
                    total: isNaN(itemTotal) ? 0 : Math.max(itemTotal, 0)
                };
            })
            .filter(Boolean);
    } else if (stats.radar_data && typeof stats.radar_data === 'object') {
        cleanRadarData = {};
        for (const [key, val] of Object.entries(stats.radar_data)) {
            // Clave: solo letras, números, acentos y espacios, máx 60 carac
            const cleanKey = key.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/<[^>]*>/gi, '').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_,]/g, '').replace(/\s+/g, ' ').substring(0, 60).trim();
            const cleanVal = parseFloat(val);
            if (cleanKey && !isNaN(cleanVal)) {
                cleanRadarData[cleanKey] = Math.min(Math.max(cleanVal, 0), 100);
            }
        }
    } else {
        cleanRadarData = [];
    }
    
    return {
        avg_score: Math.min(Math.max(avg_score, 0), 20), // 0 a 20
        accuracy: Math.min(Math.max(accuracy, 0), 100), // 0 to 100
        mastered_cards: Math.max(mastered_cards, 0),
        radar_data: cleanRadarData
    };
}

/**
 * Valida nombres de tabla y columnas en la exportación a CSV contra una lista blanca (White-list).
 */
const ALLOWED_EXPORT_TABLES = ['search_history', 'courses', 'resources'];
const ALLOWED_EXPORT_COLUMNS = ['query, created_at', 'id, name', 'id, title', '*'];

function validateCSVExportParams(tableName, columns = '*') {
    if (!ALLOWED_EXPORT_TABLES.includes(tableName)) {
        throw new Error(`Unauthorized export table: ${tableName}`);
    }
    if (!ALLOWED_EXPORT_COLUMNS.includes(columns.trim())) {
        throw new Error(`Unauthorized export columns: ${columns}`);
    }
    return true;
}

module.exports = {
    LIMITS,
    sanitizeInputForAI,
    validateDiagnosticStats,
    validateCSVExportParams
};
