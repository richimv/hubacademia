/** Resource format and editorial placement are independent from course/exam domains. */
const RESOURCE_TYPES = Object.freeze(['book', 'paper', 'noticia', 'norma', 'guia', 'video', 'other']);
const BULLETIN_TYPES = Object.freeze(['noticia', 'paper']);
const asBoolean = value => value === true || value === 'true' || value === 1;

function normalizeResourceData(input, { partial = false } = {}) {
    const result = { ...input };
    delete result.domain;
    result.resource_type = result.resource_type === 'article' ? 'paper' : (result.resource_type || 'book');
    const invalid = message => Object.assign(new Error(message), { statusCode: 400 });
    if (!RESOURCE_TYPES.includes(result.resource_type)) throw invalid('Tipo de recurso no válido.');
    if (result.url !== undefined || !partial) {
        try {
            const value = String(result.url || '').trim();
            const storedImage = result.resource_type === 'other' && value === result.image_url && /^\/(?:api\/media\/|assets\/)/.test(value);
            const url = storedImage ? null : new URL(value);
            if (storedImage) result.url = value;
            else {
                if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error();
                result.url = url.href;
            }
        } catch { throw invalid('Indica un enlace HTTP o HTTPS válido al recurso o a su archivo en Drive.'); }
    }
    if (result.publish_in_bulletin !== undefined || !partial) {
        result.publish_in_bulletin = asBoolean(result.publish_in_bulletin);
    }
    if (!BULLETIN_TYPES.includes(result.resource_type)) result.publish_in_bulletin = false;
    if (result.publish_in_bulletin) {
        result.is_premium = false;
        result.open_directly = true;
    }
    return result;
}

module.exports = { RESOURCE_TYPES, BULLETIN_TYPES, normalizeResourceData, asBoolean };
