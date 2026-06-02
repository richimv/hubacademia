# Plan de Centralización y Optimización del Sistema de Estilos

Este documento técnico consolida el análisis de la arquitectura visual de **Hub Academia** y detalla la estrategia de centralización de estilos, consistente en unificar variables visuales (tokens), eliminar redundancias de código (CSS muerto), y optimizar la interacción táctil en dispositivos móviles.

---

## 1. Auditoría del Estado Anterior del CSS y Fragmentación

Previamente, la plataforma contaba con hojas de estilo fragmentadas por módulos y páginas (`base.css`, `flashcards.css`, `chat.css`, `audio-assistant.css`, `self-evaluation.css`). Esto introducía los siguientes problemas de consistencia y rendimiento:

* **Duplicación de Variables Visuales**: Múltiples archivos CSS redefinían la pseudo-clase `:root` con colores de fondo y texto locales (como `#050505` para fondos oscuros o `#f8fafc` para textos). Cualquier cambio de diseño requería modificar múltiples archivos simultáneamente.
* **Resets Táctiles Móviles Fragmentados**: Reglas esenciales de experiencia móvil, como la desactivación del parpadeo azul nativo (`-webkit-tap-highlight-color: transparent`), estaban duplicadas o ausentes en páginas como `flashcards.html` porque no cargaban el archivo general `base.css`.
* **Bloqueos de Scroll en el Cuerpo del Sitio**: La clase `.scroll-animate-section` (usada en las secciones del index, como *Examen de Ascenso Docente*) tenía un valor de `overflow: hidden` que causaba bloqueos de scroll y retención del desplazamiento táctil/rueda del ratón en múltiples navegadores de PC y móviles.

---

## 2. Solución Implementada: Centralización mediante Tokens (`theme.css`)

Hemos creado una hoja de estilos de tokens de diseño centralizada en [theme.css](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/css/theme.css) que sirve como la **única fuente de verdad** para los colores, tipografía, bordes y espaciados de la plataforma:

```css
/* theme.css: Paleta de Colores, Tipografías y Reset Universal */
:root {
    /* Paleta Manta Black / Slate */
    --bg-main: #050505;
    --bg-secondary: #0a0a0a;
    --bg-tertiary: #121212;
    --surface-hover: #121212;
    
    /* Textos */
    --text-main: #f8fafc;
    --text-secondary: #cbd5e1;
    --text-muted: #94a3b8;
    
    /* Acciones e Indicadores */
    --primary: #3b82f6;
    --primary-hover: #2563eb;
    --accent-purple: #8b5cf6;
    --success: #10b981;
    --danger: #ef4444;
    
    /* Espaciados, Bordes y Radios */
    --border-color: rgba(255, 255, 255, 0.08);
    --radius-md: 0.5rem;
    --radius-xl: 1rem;
    --font-main: 'Inter', system-ui, -apple-system, sans-serif;
}

/* Reset universal táctil */
* {
    -webkit-tap-highlight-color: transparent !important;
}
```

---

## 3. Arquitectura de Integración e Importación de Estilos

Para garantizar que todas las páginas adopten de forma coherente estos estilos centralizados sin duplicar código ni cargar excesivos bytes, se diseñó el siguiente flujo de importación:

### Flujo de Hojas de Estilo en Cascada

```mermaid
graph TD
    theme[theme.css <br> Tokens de color, texto, bordes y reset táctil]
    
    subgraph "Páginas con Estructura General"
        base[base.css]
        page_general[index.html, library.html, profile.html, dashboard.html...]
        theme -->|@import| base
        base --> page_general
    end
    
    subgraph "Páginas de Modos Interactivos y Estudio"
        page_study[flashcards.html, quiz.html]
        theme -->|Link directo| page_study
        style_study[flashcards.css, quiz.css]
        page_study --> style_study
    end
```

### Acoplamiento por Alias en Hojas de Estilo Específicas
Para no tener que reescribir cientos de selectores específicos en los archivos modulares, redefinimos sus variables locales para que funcionen como **alias** de los tokens globales en `theme.css`. Esto asegura la consistencia de color instantánea:

* **[flashcards.css](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/css/flashcards.css)**:
  ```css
  --bg-pure: var(--bg-main);
  --card-bg: var(--bg-secondary);
  --border-dim: var(--border-color);
  --text-primary: var(--text-main);
  --text-secondary: var(--text-muted);
  --accent-color: var(--primary);
  --success-color: var(--success);
  ```
* **[chat.css](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/css/chat.css)**:
  ```css
  --chat-bg: var(--bg-secondary);
  --chat-surface: var(--bg-tertiary);
  --chat-surface-hover: var(--surface-hover);
  --chat-text: var(--text-main);
  --chat-text-muted: var(--text-muted);
  --chat-border: var(--border-color);
  ```
* **[audio-assistant.css](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/css/audio-assistant.css)**:
  ```css
  --audio-primary: var(--accent-purple);
  --audio-secondary: var(--info);
  --audio-bg: var(--bg-tertiary);
  --audio-surface: var(--surface-hover);
  --audio-border: var(--border-color);
  ```
* **[self-evaluation.css](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/css/self-evaluation.css)**:
  ```css
  --self-eval-bg: var(--bg-main);
  --self-eval-card: var(--bg-secondary);
  --self-eval-border: var(--border-color);
  --self-eval-text: var(--text-main);
  --self-eval-text-dim: var(--text-muted);
  ```
* **[simulator-dashboard.css](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/css/simulator-dashboard.css)**:
  ```css
  --bg-base: var(--bg-main);
  --bg-surface: var(--bg-secondary);
  --bg-elevated: var(--bg-tertiary);
  --border: var(--border-color);
  --border-hover: var(--border-hover);
  --text-primary: var(--text-main);
  --text-secondary: var(--text-secondary);
  --text-muted: var(--text-muted);
  --blue: var(--primary);
  --amber: var(--warning);
  --emerald: var(--success);
  --violet: var(--accent-purple);
  ```
* **[quiz.css](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/css/quiz.css)**:
  ```css
  --quiz-bg: var(--bg-main);
  --quiz-container-bg: rgba(10, 10, 10, 0.85);
  --quiz-border: var(--border-color);
  --quiz-text: var(--text-main);
  --quiz-text-secondary: var(--text-secondary);
  --quiz-text-muted: var(--text-muted);
  --quiz-accent: var(--primary);
  --quiz-accent-purple: var(--accent-purple);
  --quiz-success: var(--success);
  --quiz-danger: var(--danger);
  ```
* **[simulators.css](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/css/simulators.css)**:
  ```css
  --sim-card-bg: var(--bg-secondary);
  --sim-border: var(--border-color);
  --sim-text-title: var(--text-main);
  --sim-text-desc: var(--text-secondary);
  --sim-badge-bg: rgba(10, 10, 10, 0.6);
  ```

---

## 4. Correcciones Críticas de UX y Rendimiento Realizadas

### A. Corrección en la Sección "Examen de Ascenso Docente"
* **Problema**: Al hacer scroll por la página principal en PC o móviles, el usuario se quedaba atascado en el primer bloque del simulador de educación (`docente-section`), viéndose obligado a llegar al final de su altura interna para continuar bajando.
* **Solución**: Modificamos el archivo [modules.css](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/css/modules.css) para cambiar la regla de `.scroll-animate-section` de `overflow: hidden` a `overflow: visible !important;`. Al ser completamente visible en el documento, se elimina cualquier barra interna oculta o intercepción de gestos y el scroll general fluye perfectamente.

### B. Remoción de Elementos no Deseados (Sección Preferencias)
* **Acción**: Eliminamos el contenedor completo de `<div class="settings-grid">` con la tarjeta estática "Preferencias (Pronto)" en [profile.html](file:///c:/Users/ricar/Downloads/PROYECTOS/hubacademia/src/presentation/public/profile.html) de acuerdo con las instrucciones de simplificación, manteniendo el perfil centrado únicamente en datos de suscripción, información del usuario y seguridad.

### C. Unificación Tipográfica y Grosor del Menú (Inconsistencias de Letras)
* **Problema**: El menú lateral (sidebar) sufría variaciones en el grosor de letras (font-weights) y renderizado al cambiar entre el Dashboard, Perfil, Notas y los Simuladores. En algunas páginas se renderizaba como una fuente Serif por defecto del navegador debido al uso de rutas limpias en el backend (ej: `/profile` o `/library`) que rompían la resolución de recursos relativos.
* **Solución**:
  - Normalizamos todos los enlaces de activos en los HTML a rutas absolutas (`/css/...`, `/js/...`, `/assets/...`).
  - Unificamos el enlace de Google Fonts a la familia completa `Inter:wght@300;400;500;600;700;800` en las 20 plantillas de la aplicación para evitar que el navegador simule grosores.
  - Añadimos la regla explícita `font-family: var(--font-main);` a las clases `.global-sidebar` y `.sidebar-item` para blindarlas contra herencias de páginas individuales.

### D. Eliminación de Variables CSS Autoreferenciadas (Bucle Circular)
* **Problema**: Hojas de estilo específicas como `dashboard.css` y `simulator-dashboard.css` redefinían en su pseudo-clase `:root` variables que apuntaban a sí mismas (como `--border-hover: var(--border-hover);` o `--accent-purple: var(--accent-purple);`), causando que los navegadores marcaran estas variables como inválidas en tiempo de cómputo y restablecieran el texto a color negro o sin estilos.
* **Solución**: Eliminamos estas autoreferencias redundantes para permitir que el motor CSS herede correctamente los tokens correctos de `theme.css`.

---

## 5. Directrices de Mantenimiento para Desarrolladores

Para mantener el código limpio, optimizado y libre de variables hardcoded:
1. **Uso Obligatorio de Tokens**: Está estrictamente prohibido usar colores hexadecimales (`#050505`) o RGBA planos en hojas de estilo específicas para elementos de fondo, texto o bordes. Use siempre las variables centralizadas `var(--bg-main)`, `var(--text-main)`, etc.
2. **Importaciones**: Cualquier hoja de estilo global que se cree debe registrar sus variables principales en `theme.css`.
3. **Resets Universales**: El selector universal `*` no debe ser redefinido con resets pesados en hojas locales. El reset táctil de móviles ya reside de forma exclusiva e indisputable en `theme.css`.
4. **Evitar Referencias Circulares**: No defina variables en `:root` que se asignen a sí mismas (ej: `--text-main: var(--text-main);` o `--border-color: var(--border-color);`). Esto genera ciclos recursivos inválidos en el motor CSS del navegador, haciendo que los valores se restablezcan a `initial` (comúnmente color negro) y perdiendo la visibilidad. Para heredar, simplemente use el token global sin declararlo localmente.
