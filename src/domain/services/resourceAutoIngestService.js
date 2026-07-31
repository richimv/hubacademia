const BookRepository = require('../repositories/bookRepository');
const bookRepository = new BookRepository();
const axios = require('axios');

class ResourceAutoIngestService {
    /**
     * Ingiere un lote de recursos (papers, guías, normas, etc.)
     * Verifica programáticamente que las URLs existan, respondan HTTP 200 y NO sean Soft-404s.
     * @param {Array<Object>} resourceList - Lista de recursos a procesar.
     * @param {Object} options - Opciones de configuración.
     * @returns {Promise<Object>} - Resultado con items creados y omitidos.
     */
    async ingestBatch(resourceList = [], options = {}) {
        if (!Array.isArray(resourceList) || resourceList.length === 0) {
            return { success: true, createdCount: 0, skippedCount: 0, items: [] };
        }

        const created = [];
        const skipped = [];
        const skipVerification = options.skipUrlVerification === true;

        for (const item of resourceList) {
            try {
                if (!item.title || !item.url) {
                    skipped.push({ item, reason: 'Falta título o URL' });
                    continue;
                }

                const cleanUrl = item.url.trim();

                // 1. Verificar deduplicación por URL
                const existing = await bookRepository.findByUrl(cleanUrl);
                if (existing) {
                    skipped.push({ item, reason: 'URL ya registrada anteriormente', existingId: existing.id });
                    continue;
                }

                // 2. ✅ VERIFICACIÓN DE RED HTTP Y DETECCIÓN DE SOFT 404 (Cero Contenido Fantasma)
                if (!skipVerification) {
                    const urlCheck = await this._verifyUrl(cleanUrl);
                    if (!urlCheck.valid) {
                        console.warn(`⚠️ [URL Rechazada / Soft 404 o Rota]: "${item.title}" -> ${cleanUrl} (${urlCheck.reason})`);
                        skipped.push({ item, reason: `Enlace roto, inaccesible o Soft-404: ${urlCheck.reason}` });
                        continue;
                    }
                }

                // Limpiar y formatear content_html si viene en texto plano
                const formattedHtml = this._ensureCleanHtml(item.content_html || item.description || '');

                const resourceData = {
                    title: item.title.trim(),
                    author: (item.author || item.source || 'Publicación Académica / Oficial').trim(),
                    url: cleanUrl,
                    image_url: item.image_url || item.imageUrl || null,
                    resource_type: this._normalizeResourceType(item.resource_type || item.type),
                    domain: this._normalizeDomain(item.domain),
                    is_premium: Boolean(item.is_premium),
                    content_html: formattedHtml,
                    visible: item.visible !== undefined ? Boolean(item.visible) : true,
                    open_directly: item.open_directly !== undefined ? Boolean(item.open_directly) : true,
                    topicIds: item.topicIds || [],
                    courseIds: item.courseIds || []
                };

                const newResource = await bookRepository.create(resourceData);
                created.push(newResource);
                console.log(`✅ [Recurso Verificado e Inyectado]: [${newResource.resource_type.toUpperCase()}] "${newResource.title}"`);
            } catch (error) {
                console.error(`❌ Error ingiriendo recurso "${item.title}":`, error.message);
                skipped.push({ item, reason: error.message });
            }
        }

        return {
            success: true,
            createdCount: created.length,
            skippedCount: skipped.length,
            created,
            skipped
        };
    }

    /**
     * Valida mediante petición HTTP y análisis de contenido HTML que la URL sea válida y NO sea un Soft 404.
     */
    async _verifyUrl(urlStr) {
        try {
            const parsed = new URL(urlStr);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return { valid: false, reason: 'Protocolo inválido (debe ser http/https)' };
            }

            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            };

            // Realizar una petición GET para descargar el HTML inicial y verificar Soft 404s
            const getRes = await axios.get(urlStr, {
                timeout: 8000,
                maxRedirects: 5,
                headers,
                responseType: 'text'
            });

            if (!getRes || getRes.status < 200 || getRes.status >= 400) {
                return { valid: false, reason: `HTTP Status ${getRes ? getRes.status : 'invalido'}` };
            }

            // 🚨 DETECCIÓN DE REDIRECCIÓN CRUZADA GOB.PE (ej. MINEDU/MINSA redirigido a Cultura/Vivienda)
            const finalUrl = (getRes.request?.res?.responseUrl || getRes.request?.responseURL || urlStr).toLowerCase();
            const originalUrlLower = urlStr.toLowerCase();

            if (originalUrlLower.includes('gob.pe/institucion/minedu') && !finalUrl.includes('minedu')) {
                return { valid: false, reason: `Redirección fallida de MINEDU a otro sector (${finalUrl})` };
            }
            if (originalUrlLower.includes('gob.pe/institucion/minsa') && !finalUrl.includes('minsa')) {
                return { valid: false, reason: `Redirección fallida de MINSA a otro sector (${finalUrl})` };
            }

            const htmlBody = (getRes.data || '').toString().toLowerCase();

            // Si es un archivo binario o PDF directo, es válido inmediatamente si dio 200
            const contentType = (getRes.headers['content-type'] || '').toLowerCase();
            if (contentType.includes('pdf') || contentType.includes('octet-stream') || urlStr.toLowerCase().endsWith('.pdf')) {
                return { valid: true };
            }

            // 🚨 DETECCIÓN DE SOFT 404s (Páginas que responden 200 OK pero dicen "Página no encontrada" o "404")
            const soft404Keywords = [
                'página no encontrada',
                'pagina no encontrada',
                '404 not found',
                'no se encontró la página',
                'no se encontro la pagina',
                'recurso no encontrado',
                'no existe la publicación',
                'no existe la publicacion',
                'error 404',
                'page not found',
                'la página solicitada no se encuentra disponible',
                'búsqueda sin resultados'
            ];

            const titleMatch = htmlBody.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            const titleText = titleMatch ? titleMatch[1].trim() : '';

            // Si el título del HTML dice 404 o No Encontrado
            if (soft404Keywords.some(kw => titleText.includes(kw))) {
                return { valid: false, reason: `Soft 404 detectado en el título de la página ("${titleText}")` };
            }

            // Si el cuerpo del HTML contiene frases explícitas de 404 en el contenido principal
            for (const kw of soft404Keywords) {
                if (htmlBody.includes(kw) && htmlBody.length < 50000) { // En páginas breves/medianas de error
                    return { valid: false, reason: `Soft 404 detectado en el cuerpo del HTML ("${kw}")` };
                }
            }

            // Si el cuerpo HTML es demasiado vacío o corto (menos de 200 caracteres de texto)
            const cleanText = htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            if (cleanText.length < 150 && !urlStr.includes('pdf')) {
                return { valid: false, reason: 'La página web está casi vacía o sin contenido (menos de 150 caracteres)' };
            }

            return { valid: true };
        } catch (error) {
            if (error.code === 'ENOTFOUND') return { valid: false, reason: 'Dominio o servidor no existe (DNS ENOTFOUND)' };
            if (error.code === 'ECONNREFUSED') return { valid: false, reason: 'Conexión rechazada por el servidor' };
            if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) return { valid: false, reason: 'Tiempo de espera agotado (Timeout)' };
            if (error.response) {
                if (error.response.status === 404) return { valid: false, reason: 'Página no existe (HTTP Status 404)' };
                return { valid: false, reason: `HTTP Status ${error.response.status}` };
            }
            return { valid: false, reason: error.message };
        }
    }

    _normalizeResourceType(typeStr = '') {
        const type = (typeStr || '').toLowerCase().trim();
        const validTypes = ['paper', 'guia', 'norma', 'noticia', 'book', 'video', 'other'];
        if (validTypes.includes(type)) return type;
        if (type.includes('noticia') || type.includes('news') || type.includes('boletin')) return 'noticia';
        if (type.includes('articulo') || type.includes('paper') || type.includes('investigacion')) return 'paper';
        if (type.includes('guia') || type.includes('clinica')) return 'guia';
        if (type.includes('norma') || type.includes('ley') || type.includes('tecnica')) return 'norma';
        if (type.includes('libro') || type.includes('book')) return 'book';
        if (type.includes('video')) return 'video';
        return 'other';
    }

    _normalizeDomain(domainStr = '') {
        const dom = (domainStr || '').toLowerCase().trim();
        if (dom.includes('med') || dom.includes('salud')) return 'medicine';
        if (dom.includes('edu')) return 'education';
        if (dom.includes('idiom') || dom.includes('lang')) return 'idiomas';
        return 'medicine';
    }

    _ensureCleanHtml(textOrHtml) {
        if (!textOrHtml) return null;
        if (/<[a-z][\s\S]*>/i.test(textOrHtml)) {
            return textOrHtml;
        }
        const paragraphs = textOrHtml
            .split(/\r?\n\r?\n/)
            .map(p => p.trim())
            .filter(Boolean)
            .map(p => `<p>${p.replace(/\r?\n/g, '<br>')}</p>`);
        return paragraphs.join('');
    }
}

module.exports = ResourceAutoIngestService;
