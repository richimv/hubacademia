# Plan de Centralización de Diseño y Sistema de Temas (Dark/Light)

Este documento presenta el estudio de la arquitectura visual de **Hub Academia** y propone una hoja de ruta técnica para centralizar las reglas de diseño CSS, unificar variables visuales (tokens) y permitir al usuario alternar entre modos **Oscuro (Dark)** y **Claro (Light)** desde la sección de Preferencias de su Perfil.

---

## 1. Auditoría de la Arquitectura CSS Actual

Actualmente, el sistema web utiliza hojas de estilo CSS fragmentadas por módulo o página. Si bien esto ayuda a encapsular diseños complejos (ej. simulador de flashcards o chat del tutor), genera duplicidad de variables globales y dificulta mantener la consistencia del diseño.

### Dependencias de Estilos por Página
1. **Inicio (`index.html`)**: Carga `base.css`, `header.css`, `hero.css`, `sidebar.css`, `modal.css`, `components.css`, `modules.css`, `footer.css`.
2. **Biblioteca (`library.html`)**: Carga `base.css`, `header.css`, `footer.css`, `dashboard.css`, `components.css`, `modal.css`, `markdown-content.css`, `chat.css`, `sidebar.css`, `search.css`, `browse.css`, `results.css`, `course.css`.
3. **Repaso de Tarjetas (`flashcards.html`)**: Carga `flashcards.css`, `modal.css`, `sidebar.css`, `components.css`, `tutor.css`, `markdown-content.css`.
4. **Exámenes y Simulacros (`quiz.html`)**: Carga `quiz.css`, `modal.css`, `components.css`.
5. **Dashboard del Simulador (`simulator-dashboard.html`)**: Carga `base.css`, `header.css`, `footer.css`, `dashboard.css`, `modal.css`, `sidebar.css`, `simulator-dashboard.css`, `components.css`, `markdown-content.css`, `quiz.css`.

### Hallazgos de Fragmentación de `:root`
Varios archivos css clave redefinen su propio selector `:root` con paletas e identificadores de color locales. Esto genera las siguientes inconsistencias:
* **Incoherencia en Variables de Fondo**: `base.css` usa `--bg-main: #050505` y `--bg-secondary: #0a0a0a`. En cambio, `flashcards.css` usa `--bg-pure: #050505` y `--card-bg: #111111`, y `audio-assistant.css` usa `--audio-bg: rgba(8, 8, 12, 0.97)`.
* **Reglas de Interacción Táctil Duplicadas**: La regla `-webkit-tap-highlight-color: transparent` que evita el destello azul en dispositivos móviles estaba definida de forma general en `base.css`, pero al no cargarse este archivo en `flashcards.html` (para no colisionar con su grilla customizada), fue necesario replicarla localmente en `flashcards.css`.
* **Z-Index y Superposiciones**: Los índices de posición vertical (`z-index`) de modales, headers y el FAB del asistente de voz están dispersos, provocando ocasionalmente que elementos como la barra de vidas cubra o altere el layout superior de páginas interactivas.

---

## 2. Propuesta de Centralización (Tokens del Sistema de Diseño)

Para unificar la estética y habilitar el cambio de temas, se propone centralizar las variables del sistema en un único archivo de tokens visuales: `css/theme.css` (o integrarlo firmemente dentro de `base.css`), el cual será la primera hoja de estilo importada en **todas** las páginas.

### Definición de Tokens Dinámicos (Dark / Light Mode)

Definiremos los esquemas de color para ambos temas utilizando Custom Properties de CSS, controlando el tema activo mediante el atributo HTML `data-theme` en la etiqueta principal `<html>`.

```css
/* ============================================================
   TEMA OSCURO (Por Defecto)
   ============================================================ */
:root, :root[data-theme="dark"] {
    /* Fondos */
    --bg-main: #050505;          /* Fondo base ultra oscuro */
    --bg-secondary: #0a0a0a;     /* Superficies y tarjetas */
    --bg-tertiary: #121212;      /* Paneles y elementos flotantes */
    --surface-hover: #1c1c1e;    /* Hover en elementos mate */
    --card-bg: rgba(10, 10, 10, 0.7);
    --modal-bg: #0c0c0e;

    /* Textos */
    --text-main: #f8fafc;        /* Slate 50 */
    --text-secondary: #cbd5e1;   /* Slate 300 */
    --text-muted: #64748b;       /* Slate 500 */
    --text-inverse: #000000;

    /* Bordes y Sombras */
    --border-color: rgba(255, 255, 255, 0.08);
    --border-hover: rgba(59, 130, 246, 0.3);
    --border-glow: rgba(59, 130, 246, 0.15);
    --shadow-main: 0 10px 30px rgba(0, 0, 0, 0.8);
    --glass-opacity: 0.7;
}

/* ============================================================
   TEMA CLARO
   ============================================================ */
:root[data-theme="light"] {
    /* Fondos */
    --bg-main: #f8fafc;          /* Slate 50 - Fondo brillante y limpio */
    --bg-secondary: #ffffff;     /* Tarjetas y contenedores con fondo blanco */
    --bg-tertiary: #f1f5f9;      /* Slate 100 - Paneles de contraste */
    --surface-hover: #e2e8f0;    /* Slate 200 - Hover de listas/botones */
    --card-bg: rgba(255, 255, 255, 0.85);
    --modal-bg: #ffffff;

    /* Textos */
    --text-main: #0f172a;        /* Slate 900 - Excelente legibilidad */
    --text-secondary: #334155;   /* Slate 700 - Contenido secundario */
    --text-muted: #64748b;       /* Slate 500 - Subtítulos o datos desvanecidos */
    --text-inverse: #ffffff;

    /* Bordes y Sombras */
    --border-color: rgba(15, 23, 42, 0.08);
    --border-hover: rgba(59, 130, 246, 0.4);
    --border-glow: rgba(59, 130, 246, 0.2);
    --shadow-main: 0 10px 30px rgba(15, 23, 42, 0.06);
    --glass-opacity: 0.85;
}
```

### Reglas Generales Inyectadas Globalmente
En este archivo central de temas, incluiremos las reglas de blindaje de interacción táctil y scrolls genéricos:
```css
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-tap-highlight-color: transparent !important; /* Neutraliza el highlight azul móvil */
}
```

---

## 3. Lógica JavaScript para la Carga de Temas (ThemeManager)

Para evitar el molesto efecto de **FOUC** (Flash of Unstyled Content), donde la página carga inicialmente en modo oscuro y parpadea abruptamente al modo claro, la lectura y aplicación del tema debe realizarse de manera **síncrona en el `<head>`**, antes de que el navegador empiece a pintar el DOM.

Se propone crear un script ultraligero inyectado en el `<head>` de todas las plantillas HTML:

```html
<head>
    ...
    <!-- Script de Inicialización de Tema (Anti-Flicker) -->
    <script>
        (function() {
            const savedTheme = localStorage.getItem('user-theme') || 'dark';
            document.documentElement.setAttribute('data-theme', savedTheme);
        })();
    </script>
    <link rel="stylesheet" href="css/base.css?v=theme_v1">
    ...
</head>
```

Posteriormente, en la capa de utilidades de cliente (`js/utils/themeManager.js`), expondremos una API de control reactiva:

```javascript
/**
 * ThemeManager - Control unificado de visualización de temas.
 */
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('user-theme') || 'dark';
    }

    setTheme(theme) {
        if (theme !== 'light' && theme !== 'dark') return;
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('user-theme', theme);
        
        // Disparar evento para componentes que requieran re-dibujarse (ej: Charts)
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
        
        // Sincronizar en segundo plano con el servidor (Supabase) si hay sesión activa
        this.syncThemeWithServer(theme);
    }

    async syncThemeWithServer(theme) {
        if (window.sessionManager && typeof window.sessionManager.getCurrentUser === 'function') {
            const user = window.sessionManager.getCurrentUser();
            if (user) {
                try {
                    // LLamada PATCH a la API de actualización de perfil
                    await fetch('/api/user/profile', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ preferences: { theme } })
                    });
                } catch (err) {
                    console.warn('No se pudo sincronizar el tema con el servidor:', err.message);
                }
            }
        }
    }
}
window.themeManager = new ThemeManager();
```

---

## 4. Plan de Implementación (Roadmap) en la Interfaz de Usuario

### Paso 1: Reemplazo del Contenedor de Preferencias en `profile.html`
Sustituir el bloque actual estático "Preferencias (Pronto)" en [profile.html](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/profile.html#L405-L417) por un componente interactivo con estilo Glassmorphism premium:

```html
<div class="settings-card preferences-card">
    <div class="card-header">
        <i class="fas fa-palette" style="color: #60a5fa;"></i> Apariencia del Sitio
    </div>
    <p class="card-desc">
        Cambia el estilo visual del Hub Academia según tu comodidad.
    </p>
    <div class="theme-selector-group" style="display: flex; gap: 10px; margin-top: 1rem;">
        <button class="btn-theme-opt" id="btn-theme-dark" onclick="window.themeManager.setTheme('dark')" style="flex: 1; padding: 10px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <i class="fas fa-moon"></i> Oscuro
        </button>
        <button class="btn-theme-opt" id="btn-theme-light" onclick="window.themeManager.setTheme('light')" style="flex: 1; padding: 10px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <i class="fas fa-sun"></i> Claro
        </button>
    </div>
</div>
```

### Paso 2: Lógica de UI en `profile.js`
* Leer el tema actual al cargar la página de perfil para añadir la clase `.active` al botón correspondiente (ej. bordear con color azul `--primary`).
* Actualizar dinámicamente las clases activas cuando el usuario cambie el tema a través de los clics.

### Paso 3: Saneamiento y Migración de Archivos CSS Específicos
1. **Chat de Tutor (`chat.css` y `tutor.css`)**: Cambiar los colores de burbuja (actualmente hardcoded como `#0f172a` o `#1e293b`) por variables del tema como `var(--bg-tertiary)` y `var(--border-color)`.
2. **Flashcards (`flashcards.css`)**: Reemplazar `--bg-pure`, `--card-bg`, y `--text-primary` por `--bg-main`, `--bg-secondary`, y `--text-main` respectivamente.
3. **Asistente de Audio (`audio-assistant.css`)**: Adaptar los fondos flotantes y la burbuja a variables de opacidad traslúcida que se vean estéticas tanto sobre fondos blancos como negros.

### Paso 4: Ajuste de Componentes Gráficos (Charts y Canvas)
* Los KPIs que renderizan gráficos mediante Chart.js o SVG dinámicos (ej: en el dashboard y biblioteca) deben reaccionar al evento global `themeChanged` para actualizar el color de sus ejes, rejillas y textos dinámicamente (de gris oscuro a gris claro, o viceversa) y disparar un `.update()` en la instancia de los gráficos.
