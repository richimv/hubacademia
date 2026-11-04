// config.js
// Este archivo debe cargarse ANTES que cualquier otro script
// Configuración global de la aplicación S

(function () {
    // 1. Detectar si estamos en local o producción
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // 🛡️ SECURITY: Deshabilitar logs en Producción (ANTES DE CUALQUIER LOG)
    if (!isLocal) {
        // Guardamos reference al error original por si acaso
        const consoleError = console.error;
        const consoleWarn = console.warn;

        // Silenciamos logs verbose
        console.log = function () { };
        console.info = function () { };
        console.debug = function () { };
    }

    console.log('🔄 Cargando Configuración...');

    // 2. Definir URL del Backend (API) — 100% unificado en el mismo origen (Vercel Serverless)
    const API_URL = isLocal
        ? 'http://localhost:3000'
        : window.location.origin;

    // 3. Exponer configuración globalmente
    // Usamos var o window para asegurar que sea global
    window.AppConfig = {
        API_URL: API_URL,

        // ✅ GOOGLE AUTH CLIENT ID
        GOOGLE_CLIENT_ID: '244839077130-pmqphk8eu7j78qq9icc6folabo5437ga.apps.googleusercontent.com',

        // ✅ SUPABASE CONFIG (Credenciales Públicas)
        // Estas claves son seguras para estar en el frontend (Anon Key).
        SUPABASE_URL: 'https://rayjtupppcbhzjizhamn.supabase.co',
        SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJheWp0dXBwcGNiaHpqaXpoYW1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMDEyMDAsImV4cCI6MjA3Nzg3NzIwMH0.BXZOjsUfCbi2_bBw9wglTMBX7WkwcGxlZjfaNwteDD8'
    };

    /**
     * Resolutor Universal de URLs de Imagen (GCS / Externo)
     * Detecta si una URL es una ruta relativa de GCS o assets y la redirige al proxy del backend.
     */
    window.resolveImageUrl = function (url, resourceType = 'other') {
        const raw = typeof url === 'string' ? url.trim().replace(/&amp;/gi, '&') : '';
        if (!raw) {
            return window.getDefaultResourceImage(resourceType);
        }

        const apiUrl = (window.AppConfig && window.AppConfig.API_URL) ? window.AppConfig.API_URL.replace(/\/+$/, '') : '';
        // The stable app URL stays in HTML. Only the server generates the
        // short-lived GCS URL; image bytes can then bypass the Function.
        const mediaUrl = (file, download = false) => {
            const direct = !download && /\.(png|jpe?g|webp|gif|avif)$/i.test(file);
            return `${apiUrl}/api/media/gcs?file=${encodeURIComponent(file)}` +
                (download ? '&download=true' : direct ? '&delivery=direct' : '');
        };

        // Historical TinyMCE content contains absolute Render proxy URLs. Keep the
        // saved content intact and resolve only our own media routes on this origin.
        if (/^(https?:\/\/|\/\/|\/api\/)/i.test(raw)) {
            try {
                const parsed = new URL(raw, window.location.origin);
                const internalHost = parsed.origin === window.location.origin ||
                    parsed.origin === apiUrl || parsed.hostname === 'tutor-ia-backend.onrender.com' ||
                    parsed.hostname === 'www.hubacademia.com' || parsed.hostname === 'hubacademia.com';
                if (internalHost && /^\/api\/media\/(gcs|explanation|preview)\/?$/.test(parsed.pathname)) {
                    const file = parsed.searchParams.get('file') || parsed.searchParams.get('path');
                    if (file) {
                        const download = ['true', '1'].includes(parsed.searchParams.get('download'));
                        return mediaUrl(file, download);
                    }
                }
                if (internalHost && parsed.hostname === 'tutor-ia-backend.onrender.com' && parsed.pathname.startsWith('/assets/')) {
                    return apiUrl + parsed.pathname;
                }
            } catch { /* Invalid external references keep their original fallback. */ }
        }

        if (/^(data:|blob:|https?:\/\/|\/\/)/i.test(raw)) return raw;

        if (raw.startsWith('/assets/') || raw.startsWith('assets/')) {
            const cleanPath = raw.startsWith('/') ? raw : `/${raw}`;
            return apiUrl ? `${apiUrl}${cleanPath}` : cleanPath;
        }

        if (raw.startsWith('/api/')) {
            return apiUrl ? `${apiUrl}${raw}` : raw;
        }

        return mediaUrl(raw);
    };

    /**
     * Normalize media in TinyMCE HTML without changing the stored record.
     * This is URL handling, not HTML sanitization; renderers keep their own
     * sanitization. TinyMCE's data-mce-src and responsive srcset must agree
     * with src, or the browser/editor can restore the old Render host.
     */
    window.resolveHtmlMediaUrls = function (html) {
        if (typeof html !== 'string' || !html) return html || '';
        const template = document.createElement('template');
        template.innerHTML = html;
        template.content.querySelectorAll('img, picture source').forEach(img => {
            for (const attr of ['src', 'data-mce-src']) {
                const value = img.getAttribute(attr);
                if (value) img.setAttribute(attr, window.resolveImageUrl(value));
            }
            for (const attr of ['srcset', 'data-mce-srcset']) {
                const value = img.getAttribute(attr);
                if (!value || /data:/i.test(value)) continue;
                img.setAttribute(attr, value.split(',').map(candidate => {
                    const [url, ...descriptor] = candidate.trim().split(/\s+/);
                    return [window.resolveImageUrl(url), ...descriptor].join(' ');
                }).join(', '));
            }
        });
        // Links to attachments and embedded media use the same stable route.
        template.content.querySelectorAll('a[href], video[src], video[poster], audio[src], source[src]').forEach(node => {
            for (const attr of ['href', 'data-mce-href', 'src', 'data-mce-src', 'poster', 'data-mce-poster']) {
                const value = node.getAttribute(attr);
                if (value && /(?:\/api\/media\/|tutor-ia-backend\.onrender\.com\/assets\/|^(?:cases|questions|explanations|editor-content|recursos|flashcards)\/)/i.test(value)) {
                    node.setAttribute(attr, window.resolveImageUrl(value));
                }
            }
        });
        return template.innerHTML;
    };

    /**
     * ✅ NUEVO: Retorna la ruta de la portada artística por defecto según el tipo de recurso.
     * Estos archivos deben existir en /assets (formato WebP optimizado).
     */
    window.getDefaultResourceImage = function (type) {
        const base = 'assets/';
        const map = {
            'book': 'book.webp',
            'paper': 'paper.webp',
            'guia': 'guia.webp',
            'norma': 'norma.webp',
            'noticia': 'noticia.webp',
            'other': 'other.webp',
            'article': 'paper.webp'
        };
        const fileName = map[type] || map['other'];
        return base + fileName;
    };

    console.log('✅ Configuración Cargada Exitosamente.');
    console.log('📍 API:', window.AppConfig.API_URL);

    // ✅ SUPABASE SINGLETON INITIALIZATION & FACTORY
    // Permite recuperar o inicializar el cliente en cualquier momento del ciclo de vida del DOM
    window.getSupabaseClient = function () {
        if (!window.supabaseClient && typeof supabase !== 'undefined' && window.AppConfig) {
            window.supabaseClient = supabase.createClient(window.AppConfig.SUPABASE_URL, window.AppConfig.SUPABASE_ANON_KEY);
            console.log('✅ Supabase Singleton Initialized.');
        }
        return window.supabaseClient || null;
    };

    window.getSupabaseClient();

    /**
     * ✅ GLOBAL UTILITY: escapeHtml
     * Escapes HTML special characters to prevent HTML injection / XSS.
     */
    window.escapeHtml = function (text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    };

})();
