// Importar solo el stemmer evita cargar analizadores de sentimiento ESM que no
// se usan y mantiene este módulo CommonJS compatible con Node/Jest.
const stemmer = require('natural/lib/natural/stemmers/porter_stemmer_es');

function normalizeText(text) {
    if (!text) return '';
    return text.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
        .replace(/[^\w\s]/g, ''); // Quitar puntuación
}

module.exports = { normalizeText, stemmer };
