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

    // 2. Definir URL del Backend (API)
    const API_URL = isLocal
        ? 'http://localhost:3000'
        : 'https://tutor-ia-backend.onrender.com';

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
        if (!url || url.trim() === '') {
            return window.getDefaultResourceImage(resourceType);
        }

        if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }

        const apiUrl = (window.AppConfig && window.AppConfig.API_URL) ? window.AppConfig.API_URL.replace(/\/+$/, '') : '';

        if (url.startsWith('/assets/') || url.startsWith('assets/')) {
            const cleanPath = url.startsWith('/') ? url : `/${url}`;
            return apiUrl ? `${apiUrl}${cleanPath}` : cleanPath;
        }

        if (url.startsWith('/api/')) {
            return apiUrl ? `${apiUrl}${url}` : url;
        }

        return apiUrl ? `${apiUrl}/api/media/gcs?file=${encodeURIComponent(url)}` : `/api/media/gcs?file=${encodeURIComponent(url)}`;
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
