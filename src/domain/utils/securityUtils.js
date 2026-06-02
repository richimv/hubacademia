/**
 * Hub Academia - Utilidades de Seguridad y Sanitización
 * Protege contra SQL Injection en consultas manuales y Prompt Injections en la IA.
 */

// Límite de longitud por tipo de input para prevenir DoS y payloads masivos
const LIMITS = {
    WORD: 80,
    TOPIC: 150,
    SHORT_TEXT: 500,
    LONG_TEXT: 2000
};

/**
 * Sanitiza una cadena de texto para enviarla de forma segura a los modelos de IA.
 * Remueve caracteres de control, limita longitud y mitiga directivas de jailbreak/inyección.
 */
function sanitizeInputForAI(text, maxLength = LIMITS.LONG_TEXT) {
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
    
    // Validar y sanitizar radar_data
    const cleanRadarData = {};
    if (stats.radar_data && typeof stats.radar_data === 'object') {
        for (const [key, val] of Object.entries(stats.radar_data)) {
            // Clave: solo letras y espacios, máx 50 carac
            const cleanKey = key.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').replace(/\s+/g, ' ').substring(0, 50).trim();
            const cleanVal = parseFloat(val);
            if (cleanKey && !isNaN(cleanVal)) {
                cleanRadarData[cleanKey] = cleanVal;
            }
        }
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
