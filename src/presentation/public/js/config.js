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
     * Detecta si una URL es una ruta relativa de GCS y la redirige al proxy del backend.
     */
    window.resolveImageUrl = function (url, resourceType = 'other') {
        if (!url || url.trim() === '') {
            // ✅ MEJORA SENIOR: Si no hay imagen, usar el Sistema de Portadas por Defecto
            return window.getDefaultResourceImage(resourceType);
        }

        // Si ya es una URL absoluta o relativa local conocida, no tocar
        if (url.startsWith('http') || url.startsWith('/') || url.startsWith('data:') || url.startsWith('assets/')) {
            return url;
        }

        // Caso GCS: Es una ruta como "test.png" o "folders/image.jpg"
        const token = localStorage.getItem('authToken');
        const tokenParam = token ? `&token=${token}` : '';
        return `${window.AppConfig.API_URL}/api/media/gcs?file=${encodeURIComponent(url)}${tokenParam}`;
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
            'other': 'other.webp',
            'article': 'paper.webp'
        };
        const fileName = map[type] || map['other'];
        return base + fileName;
    };

    console.log('✅ Configuración Cargada Exitosamente.');
    console.log('📍 API:', window.AppConfig.API_URL);

    // ✅ SUPABASE SINGLETON INITIALIZATION
    // Inicializamos el cliente una sola vez para evitar advertencias de "Multiple GoTrueClient instances".
    if (typeof supabase !== 'undefined') {
        window.supabaseClient = supabase.createClient(window.AppConfig.SUPABASE_URL, window.AppConfig.SUPABASE_ANON_KEY);
        console.log('✅ Supabase Singleton Initialized.');
    } else {
        // console.warn('⚠️ Librería Supabase no detectada al cargar config.js'); // SIlenced to prevent unnecessary console noise on pages that don't need Supabase Auth
    }

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

    /**
     * ✅ GLOBAL UTILITY: playQuestionAudio
     * Centralized backend-based Text-To-Speech (TTS) audio player.
     * Prevents overlapping audio playback across the application.
     */
    window.playQuestionAudio = async function (btn, text, lang) {
        const icon = btn.querySelector('i');
        if (!icon) return;

        if (window.currentQuizAudio && window.currentQuizAudio.src && btn.dataset.playing === 'true') {
            window.currentQuizAudio.pause();
            return;
        }

        if (window.currentQuizAudio) {
            try {
                window.currentQuizAudio.pause();
            } catch (e) {}
            document.querySelectorAll('.quiz-audio-btn').forEach(b => {
                b.dataset.playing = 'false';
                const i = b.querySelector('i');
                if (i) i.className = 'fas fa-play';
            });
        }

        icon.className = 'fas fa-spinner fa-spin';
        btn.disabled = true;

        try {
            const response = await window.NetworkService.fetch(`${window.AppConfig.API_URL}/api/tts`, {
                method: 'POST',
                body: JSON.stringify({ text, lang })
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}`);
            }

            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            window.currentQuizAudio = audio;
            btn.dataset.playing = 'true';
            btn.disabled = false;
            icon.className = 'fas fa-pause';

            audio.onended = () => {
                btn.dataset.playing = 'false';
                icon.className = 'fas fa-play';
                URL.revokeObjectURL(audioUrl);
                window.currentQuizAudio = null;
            };

            audio.onpause = () => {
                btn.dataset.playing = 'false';
                icon.className = 'fas fa-play';
            };

            audio.onplay = () => {
                btn.dataset.playing = 'true';
                icon.className = 'fas fa-pause';
            };

            await audio.play();
        } catch (err) {
            console.error("Error al reproducir audio de listening:", err);
            icon.className = 'fas fa-exclamation-triangle';
            btn.disabled = false;
            setTimeout(() => {
                icon.className = 'fas fa-play';
            }, 2000);
        }
    };

})();